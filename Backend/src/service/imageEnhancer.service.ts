
import { randomUUID } from "node:crypto";
import path from "node:path";
import sharp from "sharp";
import mongoose from "mongoose";
import type { Express } from "express";

import {
    ImageEnhancerJobModel,
    ImageEnhancerDailyUsageModel,
    ImageEnhancerJobStatus,
    ImageEnhancerActorType,
    IMAGE_ENHANCER_DAILY_LIMIT,
} from "../models/imageEnhancer.model";

import {
    imageEnhancementOptionsSchema,
    IMAGE_ENHANCER_LIMITS,
    type ImageEnhancementOptions,
} from "../validators/imageEnhancer.validation";

import { imageEnhancerQueue } from "../queues/imageEnhancer.queue";

import {
    uploadToImageKit,
    deleteFromImageKit,
} from "../config/imagekit";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export interface ImageEnhancerActor {
    actorType: ImageEnhancerActorType;
    actorId: string;
}

interface CreateEnhancementJobInput {
    actor: ImageEnhancerActor;
    file: Express.Multer.File;
    options: unknown;
}

interface DownloadUrlInput {
    url: string;
    expiresAt: Date;
}

interface InspectedImage {
    originalName: string;
    mimeType: string;
    format: string;
    size: number;
    width: number;
    height: number;
}

interface ImageKitImage {
    fileId: string;
    url: string;
}

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const ALLOWED_FORMATS = new Set([
    "jpeg",
    "png",
    "webp",
    "tiff",
]);

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const QUEUE_JOB_NAME = "enhance-image";
const IMAGEKIT_INPUT_FOLDER = "/meettools/image-enhancer/originals";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function getUtcDateKey(date = new Date()): string {
    return date.toISOString().slice(0, 10);
}

function isDuplicateKeyError(error: unknown): boolean {
    return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === 11000
    );
}

function getSafeOriginalName(name: string | undefined): string {
    const normalized = (name || "image").replace(/\\/g, "/");
    const baseName = path.posix.basename(normalized);

    return (
        baseName
            .replace(/[\r\n\0]/g, "_")
            .slice(0, 255) || "image"
    );
}

function validateActor(actor: ImageEnhancerActor): void {
    if (
        !actor ||
        !Object.values(ImageEnhancerActorType).includes(actor.actorType)
    ) {
        throw new ImageEnhancerValidationError(
            "Invalid image enhancer actor.",
        );
    }

    if (
        typeof actor.actorId !== "string" ||
        actor.actorId.length === 0 ||
        actor.actorId !== actor.actorId.trim() ||
        actor.actorId.length > 128
    ) {
        throw new ImageEnhancerValidationError(
            "Invalid actor identity.",
        );
    }

    if (
        actor.actorType === ImageEnhancerActorType.USER &&
        !mongoose.isValidObjectId(actor.actorId)
    ) {
        throw new ImageEnhancerValidationError(
            "Invalid authenticated user identity.",
        );
    }
}

function validateImageKitImage(image: ImageKitImage): void {
    if (
        !image ||
        typeof image.fileId !== "string" ||
        !image.fileId.trim() ||
        typeof image.url !== "string" ||
        !image.url.trim()
    ) {
        throw new Error(
            "ImageKit did not return a valid file reference.",
        );
    }

    let parsedUrl: URL;

    try {
        parsedUrl = new URL(image.url);
    } catch {
        throw new Error("ImageKit returned an invalid image URL.");
    }

    if (parsedUrl.protocol !== "https:") {
        throw new Error("ImageKit returned an insecure image URL.");
    }
}

/* -------------------------------------------------------------------------- */
/* Daily usage record                                                         */
/* -------------------------------------------------------------------------- */

async function ensureDailyUsageRecord(
    actor: ImageEnhancerActor,
    date: string,
): Promise<void> {
    try {
        await ImageEnhancerDailyUsageModel.updateOne(
            {
                actorType: actor.actorType,
                actorId: actor.actorId,
                date,
            },
            {
                $setOnInsert: {
                    actorType: actor.actorType,
                    actorId: actor.actorId,
                    date,
                    used: 0,
                    limit: IMAGE_ENHANCER_DAILY_LIMIT,
                },
            },
            {
                upsert: true,
            },
        );
    } catch (error) {
        if (!isDuplicateKeyError(error)) {
            throw error;
        }
    }
}

/* -------------------------------------------------------------------------- */
/* Atomic quota reservation + job creation                                   */
/* -------------------------------------------------------------------------- */

async function reserveQuotaAndCreateJob(input: {
    jobId: string;
    actor: ImageEnhancerActor;
    quotaDate: string;
    expiresAt: Date;
    metadata: InspectedImage & ImageKitImage;
}): Promise<void> {
    const {
        jobId,
        actor,
        quotaDate,
        expiresAt,
        metadata,
    } = input;

    await ensureDailyUsageRecord(actor, quotaDate);

    const session = await mongoose.startSession();

    try {
        await session.withTransaction(async () => {
            const usage =
                await ImageEnhancerDailyUsageModel.findOneAndUpdate(
                    {
                        actorType: actor.actorType,
                        actorId: actor.actorId,
                        date: quotaDate,
                        $expr: {
                            $lt: ["$used", "$limit"],
                        },
                    },
                    {
                        $inc: {
                            used: 1,
                        },
                    },
                    {
                        returnDocument: "after",
                        session,
                    },
                );

            if (!usage) {
                throw new ImageEnhancerQuotaError(
                    "Daily image enhancement limit reached.",
                );
            }

            await ImageEnhancerJobModel.create(
                [
                    {
                        jobId,
                        actorType: actor.actorType,
                        actorId: actor.actorId,
                        status: ImageEnhancerJobStatus.QUEUED,
                        input: metadata,
                        quotaDate,
                        expiresAt,
                    },
                ],
                {
                    session,
                },
            );
        });
    } finally {
        await session.endSession();
    }
}

/* -------------------------------------------------------------------------- */
/* Exactly-once quota refund                                                  */
/* -------------------------------------------------------------------------- */

async function refundDailyQuota(jobId: string): Promise<void> {
    const session = await mongoose.startSession();

    try {
        await session.withTransaction(async () => {
            const job = await ImageEnhancerJobModel.findOneAndUpdate(
                {
                    jobId,
                    status: ImageEnhancerJobStatus.FAILED,
                    $or: [
                        { quotaRefundedAt: { $exists: false } },
                        { quotaRefundedAt: null },
                    ],
                },
                {
                    $set: {
                        quotaRefundedAt: new Date(),
                    },
                },
                {
                    returnDocument: "after",
                    session,
                },
            );

            if (!job) {
                return;
            }

            const usageUpdate =
                await ImageEnhancerDailyUsageModel.updateOne(
                    {
                        actorType: job.actorType,
                        actorId: job.actorId,
                        date: job.quotaDate,
                        used: { $gt: 0 },
                    },
                    {
                        $inc: { used: -1 },
                    },
                    { session },
                );

            if (usageUpdate.modifiedCount !== 1) {
                throw new Error(
                    "Quota refund failed. Manual reconciliation may be required.",
                );
            }
        });
    } finally {
        await session.endSession();
    }
}

/* -------------------------------------------------------------------------- */
/* Image inspection                                                           */
/* -------------------------------------------------------------------------- */

async function inspectUploadedImage(
    file: Express.Multer.File,
): Promise<InspectedImage> {
    if (
        !file ||
        !Buffer.isBuffer(file.buffer) ||
        file.buffer.length === 0
    ) {
        throw new ImageEnhancerValidationError(
            "Image upload is missing or invalid.",
        );
    }

    const fileSize = file.buffer.length;

    if (
        !Number.isSafeInteger(fileSize) ||
        fileSize < 1 ||
        fileSize > IMAGE_ENHANCER_LIMITS.MAX_FILE_SIZE
    ) {
        throw new ImageEnhancerValidationError(
            "Image file size is not allowed.",
        );
    }

    let metadata: sharp.Metadata;

    try {
        metadata = await sharp(file.buffer, {
            failOn: "error",
            limitInputPixels: IMAGE_ENHANCER_LIMITS.MAX_PIXELS,
            sequentialRead: true,
        }).metadata();
    } catch {
        throw new ImageEnhancerValidationError(
            "The uploaded file is not a valid supported image.",
        );
    }

    if (
        !metadata.format ||
        !ALLOWED_FORMATS.has(metadata.format) ||
        !metadata.width ||
        !metadata.height
    ) {
        throw new ImageEnhancerValidationError(
            "Unsupported or invalid image.",
        );
    }

    if ((metadata.pages ?? 1) > 1) {
        throw new ImageEnhancerValidationError(
            "Animated or multi-page images are not supported.",
        );
    }

    const { width, height } = metadata;
    const pixelCount = width * height;

    if (
        width > IMAGE_ENHANCER_LIMITS.MAX_WIDTH ||
        height > IMAGE_ENHANCER_LIMITS.MAX_HEIGHT ||
        !Number.isSafeInteger(pixelCount) ||
        pixelCount > IMAGE_ENHANCER_LIMITS.MAX_PIXELS
    ) {
        throw new ImageEnhancerValidationError(
            "Image dimensions exceed the allowed limits.",
        );
    }

    const format = metadata.format;

    const mimeType =
        format === "jpeg"
            ? "image/jpeg"
            : format === "tiff"
                ? "image/tiff"
                : `image/${format}`;

    return {
        originalName: getSafeOriginalName(file.originalname),
        mimeType,
        format,
        size: fileSize,
        width,
        height,
    };
}

/* -------------------------------------------------------------------------- */
/* ImageKit cleanup                                                           */
/* -------------------------------------------------------------------------- */

async function safelyDeleteInput(
    fileId: string | undefined,
): Promise<void> {
    if (!fileId) {
        return;
    }

    try {
        await deleteFromImageKit(fileId);
    } catch {
        // Log cleanup failure with your application logger.
        // Never mask the original error.
    }
}

/* -------------------------------------------------------------------------- */
/* Queue failure handling                                                     */
/* -------------------------------------------------------------------------- */

async function markQueueSubmissionFailed(
    jobId: string,
): Promise<boolean> {
    const result = await ImageEnhancerJobModel.updateOne(
        {
            jobId,
            status: ImageEnhancerJobStatus.QUEUED,
        },
        {
            $set: {
                status: ImageEnhancerJobStatus.FAILED,
                error: {
                    code: "QUEUE_SUBMISSION_FAILED",
                    message: "Unable to submit image for processing.",
                },
                completedAt: new Date(),
            },
        },
    );

    return result.modifiedCount === 1;
}

/* -------------------------------------------------------------------------- */
/* Create enhancement job                                                    */
/* -------------------------------------------------------------------------- */

export async function createEnhancementJob({
    actor,
    file,
    options: rawOptions,
}: CreateEnhancementJobInput) {
    const jobId = randomUUID();
    const quotaDate = getUtcDateKey();
    const expiresAt = new Date(Date.now() + ONE_DAY_MS);

    let inputFileId: string | undefined;
    let jobCreated = false;
    let preserveImageKitInput = false;

    try {
        validateActor(actor);

        if (
            !file ||
            !Buffer.isBuffer(file.buffer) ||
            file.buffer.length === 0
        ) {
            throw new ImageEnhancerValidationError(
                "Image upload is missing or invalid.",
            );
        }

        const parsedOptions =
            imageEnhancementOptionsSchema.safeParse(rawOptions);

        if (!parsedOptions.success) {
            throw new ImageEnhancerValidationError(
                "Invalid enhancement options.",
                parsedOptions.error.flatten(),
            );
        }

        const options: ImageEnhancementOptions = parsedOptions.data;

        const metadata = await inspectUploadedImage(file);

        const originalName = metadata.originalName;
        const parsedName = path.parse(originalName);

        const fileName =
            `${parsedName.name || "image"}.${metadata.format}`;

        const uploadedInput = await uploadToImageKit(
            file.buffer,
            fileName,
            IMAGEKIT_INPUT_FOLDER,
        );

        const imageKitInput: ImageKitImage = {
            fileId: uploadedInput.fileId,
            url: uploadedInput.url,
        };

        validateImageKitImage(imageKitInput);

        inputFileId = imageKitInput.fileId;

        await reserveQuotaAndCreateJob({
            jobId,
            actor,
            quotaDate,
            expiresAt,
            metadata: {
                ...metadata,
                ...imageKitInput,
            },
        });

        jobCreated = true;
        preserveImageKitInput = true;

        try {
            await imageEnhancerQueue.add(
                QUEUE_JOB_NAME,
                {
                    jobId,
                    options,
                },
                {
                    jobId,
                },
            );
        } catch {
            let existingQueueJob;

            try {
                existingQueueJob =
                    await imageEnhancerQueue.getJob(jobId);
            } catch {
                throw new ImageEnhancerQueueStateUnknownError(
                    "Queue submission status is unknown. Job reconciliation is required.",
                );
            }

            if (existingQueueJob) {
                return {
                    jobId,
                    status: ImageEnhancerJobStatus.QUEUED,
                    dailyLimit: IMAGE_ENHANCER_DAILY_LIMIT,
                    message: "Image enhancement job queued successfully.",
                };
            }

            const markedFailed =
                await markQueueSubmissionFailed(jobId);

            if (!markedFailed) {
                throw new ImageEnhancerQueueStateUnknownError(
                    "Job state changed while handling queue submission. Reconciliation is required.",
                );
            }

            await refundDailyQuota(jobId);

            preserveImageKitInput = false;

            await safelyDeleteInput(inputFileId);
            inputFileId = undefined;

            throw new ImageEnhancerQueueSubmissionError(
                "Unable to queue image enhancement job.",
            );
        }

        return {
            jobId,
            status: ImageEnhancerJobStatus.QUEUED,
            dailyLimit: IMAGE_ENHANCER_DAILY_LIMIT,
            message: "Image enhancement job queued successfully.",
        };
    } catch (error) {
        if (!jobCreated || !preserveImageKitInput) {
            await safelyDeleteInput(inputFileId);
        }

        throw error;
    }
}

/* -------------------------------------------------------------------------- */
/* Download URL                                                               */
/* -------------------------------------------------------------------------- */

export async function getEnhancementDownloadUrl({
    url,
    expiresAt,
}: DownloadUrlInput): Promise<{ downloadUrl: string }> {
    if (
        typeof url !== "string" ||
        !url.trim() ||
        !(expiresAt instanceof Date) ||
        Number.isNaN(expiresAt.getTime()) ||
        expiresAt.getTime() <= Date.now()
    ) {
        throw new ImageEnhancerNotFoundError(
            "Enhanced image is no longer available.",
        );
    }

    let parsedUrl: URL;

    try {
        parsedUrl = new URL(url);
    } catch {
        throw new ImageEnhancerNotFoundError(
            "Enhanced image URL is invalid.",
        );
    }

    if (parsedUrl.protocol !== "https:") {
        throw new ImageEnhancerNotFoundError(
            "Enhanced image URL is invalid.",
        );
    }

    return {
        downloadUrl: parsedUrl.toString(),
    };
}

/* -------------------------------------------------------------------------- */
/* Download enhanced image as an actual file                                 */
/* -------------------------------------------------------------------------- */

export async function downloadEnhancedImage(input: {
    url: string;
    expiresAt: Date;
    originalName?: string;
    format?: string;
}): Promise<{
    buffer: Buffer;
    contentType: string;
    fileName: string;
}> {
    const { url, expiresAt, originalName } = input;

    if (
        typeof url !== "string" ||
        !url.trim() ||
        !(expiresAt instanceof Date) ||
        Number.isNaN(expiresAt.getTime()) ||
        expiresAt.getTime() <= Date.now()
    ) {
        throw new ImageEnhancerNotFoundError(
            "Enhanced image is no longer available.",
        );
    }

    let imageUrl: URL;
    let imageKitEndpoint: URL;

    try {
        imageUrl = new URL(url);

        const endpoint = process.env.IMAGEKIT_URL_ENDPOINT;

        if (!endpoint) {
            throw new Error("ImageKit endpoint is not configured.");
        }

        imageKitEndpoint = new URL(endpoint);
    } catch {
        throw new ImageEnhancerNotFoundError(
            "Invalid ImageKit image configuration.",
        );
    }

    if (
        imageUrl.protocol !== "https:" ||
        imageUrl.hostname !== imageKitEndpoint.hostname ||
        imageUrl.port !== ""
    ) {
        throw new ImageEnhancerNotFoundError(
            "Image URL is not an authorized ImageKit URL.",
        );
    }

    const controller = new AbortController();

    const timeout = setTimeout(() => {
        controller.abort();
    }, 30_000);

    try {
        const response = await fetch(imageUrl.toString(), {
            method: "GET",
            redirect: "error",
            signal: controller.signal,
        });

        if (!response.ok) {
            throw new Error(
                `ImageKit download failed with status ${response.status}.`,
            );
        }

        const maxDownloadSize = 50 * 1024 * 1024;

        const contentLength = Number(
            response.headers.get("content-length") || 0,
        );

        if (
            Number.isFinite(contentLength) &&
            contentLength > maxDownloadSize
        ) {
            throw new Error(
                "Enhanced image exceeds the download size limit.",
            );
        }

        const arrayBuffer = await response.arrayBuffer();

        if (arrayBuffer.byteLength === 0) {
            throw new Error("Downloaded image is empty.");
        }

        if (arrayBuffer.byteLength > maxDownloadSize) {
            throw new Error(
                "Enhanced image exceeds the download size limit.",
            );
        }

        const buffer = Buffer.from(arrayBuffer);

        let metadata: sharp.Metadata;

        try {
            metadata = await sharp(buffer, {
                failOn: "error",
                limitInputPixels: IMAGE_ENHANCER_LIMITS.MAX_PIXELS,
            }).metadata();
        } catch {
            throw new Error(
                "ImageKit returned invalid image data.",
            );
        }

        const formatMap: Record<
            string,
            { contentType: string; extension: string }
        > = {
            jpeg: {
                contentType: "image/jpeg",
                extension: "jpg",
            },
            png: {
                contentType: "image/png",
                extension: "png",
            },
            webp: {
                contentType: "image/webp",
                extension: "webp",
            },
            tiff: {
                contentType: "image/tiff",
                extension: "tiff",
            },
        };

        const detectedFormat = metadata.format;

        if (!detectedFormat || !formatMap[detectedFormat]) {
            throw new Error(
                "ImageKit returned an unsupported image type.",
            );
        }

        const detectedImage = formatMap[detectedFormat];

        const parsedName = path.parse(
            getSafeOriginalName(originalName),
        );

        const safeBaseName =
            parsedName.name
                .replace(/[^a-zA-Z0-9_-]/g, "-")
                .slice(0, 100) || "enhanced-image";

        return {
            buffer,
            contentType: detectedImage.contentType,
            fileName: `${safeBaseName}-enhanced.${detectedImage.extension}`,
        };
    } finally {
        clearTimeout(timeout);
    }
}

/* -------------------------------------------------------------------------- */
/* Service errors                                                             */
/* -------------------------------------------------------------------------- */

export class ImageEnhancerQuotaError extends Error {
    readonly statusCode = 429;
    readonly code = "IMAGE_ENHANCER_DAILY_LIMIT";

    constructor(message: string) {
        super(message);
        this.name = "ImageEnhancerQuotaError";
    }
}

export class ImageEnhancerValidationError extends Error {
    readonly statusCode = 400;
    readonly code = "IMAGE_ENHANCER_VALIDATION_ERROR";

    constructor(
        message: string,
        public readonly details?: unknown,
    ) {
        super(message);
        this.name = "ImageEnhancerValidationError";
    }
}

export class ImageEnhancerNotFoundError extends Error {
    readonly statusCode = 404;
    readonly code = "IMAGE_ENHANCER_NOT_FOUND";

    constructor(message: string) {
        super(message);
        this.name = "ImageEnhancerNotFoundError";
    }
}

export class ImageEnhancerQueueStateUnknownError extends Error {
    readonly statusCode = 503;
    readonly code = "IMAGE_ENHANCER_QUEUE_STATE_UNKNOWN";

    constructor(message: string) {
        super(message);
        this.name = "ImageEnhancerQueueStateUnknownError";
    }
}

export class ImageEnhancerQueueSubmissionError extends Error {
    readonly statusCode = 503;
    readonly code = "IMAGE_ENHANCER_QUEUE_SUBMISSION_FAILED";

    constructor(message: string) {
        super(message);
        this.name = "ImageEnhancerQueueSubmissionError";
    }
}
