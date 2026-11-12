
import {
  constants as fsConstants,
} from "node:fs";

import {
  access,
  chmod,
  link,
  lstat,
  mkdir,
  open,
  realpath,
  rename,
  unlink,
} from "node:fs/promises";

import path from "node:path";
import { randomUUID } from "node:crypto";

// --------------------------------------------------
// Configuration
// --------------------------------------------------

const STORAGE_ROOT = path.resolve(
  process.env.IMAGE_ENHANCER_STORAGE_DIR ??
    path.join(process.cwd(), "storage", "image-enhancer"),
);

const MAX_INPUT_SIZE = 10 * 1024 * 1024;
const MAX_OUTPUT_SIZE = 50 * 1024 * 1024;

const FILE_MODE = 0o600;
const DIRECTORY_MODE = 0o700;

const ALLOWED_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
  "tif",
  "tiff",
]);

const CONTENT_TYPE_EXTENSIONS: Record<string, string[]> = {
  "image/jpeg": ["jpg", "jpeg"],
  "image/png": ["png"],
  "image/webp": ["webp"],
  "image/tiff": ["tif", "tiff"],
};

// --------------------------------------------------
// Types
// --------------------------------------------------

export interface SaveImageInput {
  storageKey: string;
  buffer: Buffer;
  contentType: string;
}

export interface ImageStorageResult {
  storageKey: string;
  size: number;
  contentType: string;
}

export class ImageStorageError extends Error {
  public readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "ImageStorageError";
    this.code = code;
  }
}

// --------------------------------------------------
// Internal helpers
// --------------------------------------------------

function validateStorageKey(storageKey: string): string {
  if (
    typeof storageKey !== "string" ||
    storageKey.length === 0 ||
    storageKey.length > 512
  ) {
    throw new ImageStorageError(
      "Invalid storage key.",
      "INVALID_STORAGE_KEY",
    );
  }

  // Only allow simple directory names and a supported extension.
  // Absolute paths, traversal, backslashes and hidden files are rejected.
  const validPattern =
    /^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*\.(jpg|jpeg|png|webp|tif|tiff)$/i;

  if (!validPattern.test(storageKey)) {
    throw new ImageStorageError(
      "Storage key contains invalid characters or path segments.",
      "INVALID_STORAGE_KEY",
    );
  }

  const segments = storageKey.split("/");

  if (
    segments.some(
      (segment) =>
        segment === "." ||
        segment === ".." ||
        segment.length === 0,
    )
  ) {
    throw new ImageStorageError(
      "Invalid storage path.",
      "INVALID_STORAGE_KEY",
    );
  }

  return storageKey;
}

function getContentType(storageKey: string): string {
  const extension = path.extname(storageKey)
    .slice(1)
    .toLowerCase();

  switch (extension) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";

    case "png":
      return "image/png";

    case "webp":
      return "image/webp";

    case "tif":
    case "tiff":
      return "image/tiff";

    default:
      throw new ImageStorageError(
        "Unsupported image extension.",
        "UNSUPPORTED_FORMAT",
      );
  }
}

function validateContentType(
  storageKey: string,
  contentType: string,
): void {
  const normalized = contentType
    .split(";")[0]
    .trim()
    .toLowerCase();

  const extension = path.extname(storageKey)
    .slice(1)
    .toLowerCase();

  const allowedExtensions =
    CONTENT_TYPE_EXTENSIONS[normalized];

  if (
    !allowedExtensions ||
    !allowedExtensions.includes(extension)
  ) {
    throw new ImageStorageError(
      "Content type does not match storage key extension.",
      "CONTENT_TYPE_MISMATCH",
    );
  }
}

function isPathInsideRoot(
  root: string,
  target: string,
): boolean {
  const relative = path.relative(root, target);

  return (
    relative !== "" &&
    !relative.startsWith(`..${path.sep}`) &&
    relative !== ".." &&
    !path.isAbsolute(relative)
  );
}

// --------------------------------------------------
// Storage initialization
// --------------------------------------------------

let initializedRoot: string | null = null;

async function initializeStorage(): Promise<string> {
  if (initializedRoot) {
    return initializedRoot;
  }

  try {
    await mkdir(STORAGE_ROOT, {
      recursive: true,
      mode: DIRECTORY_MODE,
    });

    await chmod(STORAGE_ROOT, DIRECTORY_MODE);

    const rootStat = await lstat(STORAGE_ROOT);

    if (
      rootStat.isSymbolicLink() ||
      !rootStat.isDirectory()
    ) {
      throw new ImageStorageError(
        "Storage root must be a real directory.",
        "INVALID_STORAGE_ROOT",
      );
    }

    initializedRoot = await realpath(STORAGE_ROOT);

    return initializedRoot;
  } catch (error) {
    if (error instanceof ImageStorageError) {
      throw error;
    }

    throw new ImageStorageError(
      "Could not initialize image storage.",
      "STORAGE_INITIALIZATION_FAILED",
    );
  }
}

// --------------------------------------------------
// Resolve safe storage path
// --------------------------------------------------

async function resolveStoragePath(
  storageKey: string,
  createDirectories = false,
): Promise<string> {
  const safeKey = validateStorageKey(storageKey);
  const root = await initializeStorage();

  const targetPath = path.resolve(root, safeKey);

  if (!isPathInsideRoot(root, targetPath)) {
    throw new ImageStorageError(
      "Storage path escapes the storage directory.",
      "PATH_TRAVERSAL_BLOCKED",
    );
  }

  const parentDirectory = path.dirname(targetPath);

  if (createDirectories) {
    await mkdir(parentDirectory, {
      recursive: true,
      mode: DIRECTORY_MODE,
    });

    await chmod(parentDirectory, DIRECTORY_MODE);
  }

  try {
    const actualParent = await realpath(parentDirectory);

    if (!isPathInsideRoot(root, actualParent)) {
      throw new ImageStorageError(
        "Storage directory resolves outside storage root.",
        "PATH_TRAVERSAL_BLOCKED",
      );
    }
  } catch (error) {
    if (error instanceof ImageStorageError) {
      throw error;
    }

    if (!createDirectories) {
      throw new ImageStorageError(
        "Storage file does not exist.",
        "FILE_NOT_FOUND",
      );
    }

    throw error;
  }

  return targetPath;
}

// --------------------------------------------------
// Save image
// --------------------------------------------------

async function saveBuffer(
  input: SaveImageInput,
): Promise<ImageStorageResult> {
  const { storageKey, buffer, contentType } = input;

  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new ImageStorageError(
      "A valid image buffer is required.",
      "INVALID_BUFFER",
    );
  }

  if (buffer.length > MAX_OUTPUT_SIZE) {
    throw new ImageStorageError(
      "Image exceeds maximum storage size.",
      "FILE_TOO_LARGE",
    );
  }

  validateContentType(storageKey, contentType);

  const targetPath = await resolveStoragePath(
    storageKey,
    true,
  );

  const tempPath = `${targetPath}.${randomUUID()}.tmp`;

  let tempHandle: Awaited<ReturnType<typeof open>> | null =
    null;

  try {
    // Create temporary file exclusively.
    tempHandle = await open(
      tempPath,
      fsConstants.O_CREAT |
        fsConstants.O_EXCL |
        fsConstants.O_WRONLY |
        (fsConstants.O_NOFOLLOW ?? 0),
      FILE_MODE,
    );

    await tempHandle.writeFile(buffer);

    // Flush file contents before publishing.
    await tempHandle.sync();

    await tempHandle.close();
    tempHandle = null;

    // Hard link creates the final file atomically and fails
    // if the storage key already exists.
    await link(tempPath, targetPath);

    await unlink(tempPath);

    return {
      storageKey,
      size: buffer.length,
      contentType: contentType
        .split(";")[0]
        .trim()
        .toLowerCase(),
    };
  } catch (error) {
    if (tempHandle) {
      await tempHandle.close().catch(() => undefined);
    }

    await unlink(tempPath).catch(() => undefined);

    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "EEXIST"
    ) {
      throw new ImageStorageError(
        "Storage key already exists. Use a new unique key.",
        "FILE_ALREADY_EXISTS",
      );
    }

    if (error instanceof ImageStorageError) {
      throw error;
    }

    throw new ImageStorageError(
      "Could not save image to storage.",
      "STORAGE_WRITE_FAILED",
    );
  }
}

// --------------------------------------------------
// Read image
// --------------------------------------------------

async function getBuffer(
  storageKey: string,
): Promise<Buffer> {
  const filePath = await resolveStoragePath(storageKey);

  let handle: Awaited<ReturnType<typeof open>> | null =
    null;

  try {
    handle = await open(
      filePath,
      fsConstants.O_RDONLY |
        (fsConstants.O_NOFOLLOW ?? 0),
    );

    const fileStat = await handle.stat();

    if (!fileStat.isFile()) {
      throw new ImageStorageError(
        "Storage target is not a regular file.",
        "INVALID_STORAGE_FILE",
      );
    }

    if (
      fileStat.size <= 0 ||
      fileStat.size > MAX_OUTPUT_SIZE
    ) {
      throw new ImageStorageError(
        "Stored image has an invalid size.",
        "INVALID_STORED_FILE_SIZE",
      );
    }

    const buffer = await handle.readFile();

    if (buffer.length !== fileStat.size) {
      throw new ImageStorageError(
        "Stored image could not be read completely.",
        "INCOMPLETE_FILE_READ",
      );
    }

    return buffer;
  } catch (error) {
    if (error instanceof ImageStorageError) {
      throw error;
    }

    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      throw new ImageStorageError(
        "Image does not exist in storage.",
        "FILE_NOT_FOUND",
      );
    }

    throw new ImageStorageError(
      "Could not read image from storage.",
      "STORAGE_READ_FAILED",
    );
  } finally {
    await handle?.close().catch(() => undefined);
  }
}

// --------------------------------------------------
// Delete image
// --------------------------------------------------

async function deleteFile(
  storageKey: string,
): Promise<boolean> {
  const filePath = await resolveStoragePath(storageKey);

  try {
    const fileStat = await lstat(filePath);

    if (
      fileStat.isSymbolicLink() ||
      !fileStat.isFile()
    ) {
      throw new ImageStorageError(
        "Refusing to delete a non-regular storage target.",
        "INVALID_STORAGE_FILE",
      );
    }

    await unlink(filePath);

    return true;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return false;
    }

    if (error instanceof ImageStorageError) {
      throw error;
    }

    throw new ImageStorageError(
      "Could not delete image from storage.",
      "STORAGE_DELETE_FAILED",
    );
  }
}

// --------------------------------------------------
// Check file existence
// --------------------------------------------------

async function exists(
  storageKey: string,
): Promise<boolean> {
  const filePath = await resolveStoragePath(storageKey);

  try {
    const fileStat = await lstat(filePath);

    return fileStat.isFile() && !fileStat.isSymbolicLink();
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return false;
    }

    throw new ImageStorageError(
      "Could not check storage file.",
      "STORAGE_CHECK_FAILED",
    );
  }
}

// --------------------------------------------------
// Generate unique storage keys
// --------------------------------------------------

function createStorageKey(
  jobId: string,
  type: "input" | "result",
  format: "jpeg" | "png" | "webp" | "tiff",
): string {
  if (
    typeof jobId !== "string" ||
    !/^[a-zA-Z0-9_-]{1,128}$/.test(jobId)
  ) {
    throw new ImageStorageError(
      "Invalid job ID.",
      "INVALID_JOB_ID",
    );
  }

  const extension = format === "jpeg"
    ? "jpg"
    : format === "tiff"
      ? "tiff"
      : format;

  return `image-enhancer/${jobId}/${type}-${randomUUID()}.${extension}`;
}

// --------------------------------------------------
// Export storage adapter
// --------------------------------------------------

export const imageStorage = {
  saveBuffer,
  getBuffer,
  deleteFile,
  exists,
  createStorageKey,
  getContentType,
};

export const imageEnhancerStorage = imageStorage;
