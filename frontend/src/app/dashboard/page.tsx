
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";

import Navbar from "@/components/layout/Navbar";
import API from "@/lib/api";

import {
  TrashIcon,
  FolderSimpleIcon,
  LockKeyIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  WrenchIcon,
  DownloadSimpleIcon,
  ImageSquareIcon,
  ArrowsClockwiseIcon,
  SpinnerGapIcon,
} from "@phosphor-icons/react/dist/ssr";

interface JobFile {
  fileId?: string;
  url: string;
  fileName: string;
  fileSize?: number;
}

interface JobItem {
  _id: string;
  status: "pending" | "processing" | "completed" | "failed";
  inputFiles: JobFile[];
  outputFiles?: JobFile[];
  createdAt: string;
}

interface JobsResponse {
  jobs?: JobItem[];
  data?: {
    jobs?: JobItem[];
  };
}

interface UserResponse {
  user?: {
    _id?: string;
    role?: string;
  };
  data?: {
    user?: {
      _id?: string;
      role?: string;
    };
  };
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.message ||
      error.response?.data?.error?.message ||
      error.message ||
      "Something went wrong."
    );
  }

  return "Something went wrong. Please try again.";
}

export default function DashboardPage() {
  const router = useRouter();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [jobsLoading, setJobsLoading] = useState(false);

  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [deletingJobId, setDeletingJobId] = useState<
    string | null
  >(null);

  const [error, setError] = useState<string | null>(null);

  // Check authentication using the backend HttpOnly cookie.
  useEffect(() => {
    let cancelled = false;

    const checkAuthAndFetchJobs = async () => {
      setLoading(true);
      setError(null);

      try {
        const authResponse = await API.get<UserResponse>(
          "/api/v1/users/me"
        );

        if (cancelled) return;

        const user =
          authResponse.data?.user ??
          authResponse.data?.data?.user;

        // A successful /me response confirms authentication.
        // If the API uses a different response envelope,
        // authentication still comes from its HTTP status.
        setIsLoggedIn(true);

        if (user?.role === "admin") {
          router.replace("/admin/dashboard");
          return;
        }

        setJobsLoading(true);

        try {
          const jobsResponse = await API.get<JobsResponse>(
            "/api/v1/jobs"
          );

          if (cancelled) return;

          const fetchedJobs =
            jobsResponse.data?.jobs ??
            jobsResponse.data?.data?.jobs ??
            [];

          setJobs(
            Array.isArray(fetchedJobs) ? fetchedJobs : []
          );
        } catch (jobsError: unknown) {
          if (cancelled) return;

          console.error(
            "Failed to fetch jobs history:",
            jobsError
          );

          if (
            axios.isAxiosError(jobsError) &&
            jobsError.response?.status === 401
          ) {
            setIsLoggedIn(false);
            setJobs([]);
          } else {
            setError(
              "Your assets could not be loaded. Please try again."
            );
          }
        } finally {
          if (!cancelled) {
            setJobsLoading(false);
          }
        }
      } catch (authError: unknown) {
        if (cancelled) return;

        console.error(
          "Failed to verify dashboard session:",
          authError
        );

        setIsLoggedIn(false);
        setJobs([]);

        if (
          !axios.isAxiosError(authError) ||
          authError.response?.status !== 401
        ) {
          setError(
            "Unable to verify your session. Please try again."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void checkAuthAndFetchJobs();

    return () => {
      cancelled = true;
    };
  }, [router]);

  // Delete a saved job from the database.
  const handleDelete = async (id: string) => {
    if (deletingJobId) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this asset?"
    );

    if (!confirmed) return;

    setDeletingJobId(id);
    setError(null);

    try {
      await API.delete(`/api/v1/jobs/${id}`);

      setJobs((previousJobs) =>
        previousJobs.filter((job) => job._id !== id)
      );
    } catch (deleteError: unknown) {
      console.error("Failed to delete job:", deleteError);

      window.alert(
        getErrorMessage(deleteError) ||
          "Job delete karne mein masla aaya hai."
      );
    } finally {
      setDeletingJobId(null);
    }
  };

  // Reuse a saved asset in the resize workspace.
  const handleReuseJob = (jobId: string) => {
    router.push(`/tools/resize/${jobId}`);
  };

  // Download an output file.
  const handleDirectDownload = async (
    url: string,
    filename: string
  ) => {
    try {
      const response = await fetch(url, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(
          `Download failed with status ${response.status}`
        );
      }

      const blob = await response.blob();

      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = blobUrl;
      link.download = filename || "downloaded-image.jpg";

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 1000);
    } catch (downloadError: unknown) {
      console.error(
        "Failed to download asset:",
        downloadError
      );

      window.alert(
        "Unable to download this file. Please try again."
      );
    }
  };

  // Loading screen.
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#fff3ec] text-[#121212] font-sans">
        <Navbar />

        <main className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-3 font-bold text-[#fb8500]">
            <SpinnerGapIcon
              size={28}
              className="animate-spin"
            />
            Loading Dashboard...
          </div>
        </main>
      </div>
    );
  }

  // Restricted dashboard for unauthenticated visitors.
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex flex-col bg-[#fff3ec] text-[#121212] font-sans">
        <Navbar />

        <main className="flex-1 flex items-center justify-center px-6 py-16">
          <div className="bg-white rounded-3xl p-10 max-w-md w-full text-center border border-[#fb8500]/20 shadow-xl shadow-[#fb8500]/5">
            <div className="w-16 h-16 bg-[#fb8500]/10 text-[#fb8500] rounded-2xl flex items-center justify-center mx-auto mb-6 border border-[#fb8500]/20">
              <LockKeyIcon
                size={36}
                weight="duotone"
              />
            </div>

            <h2 className="text-2xl font-black text-[#121212] mb-3">
              Dashboard Access Restricted
            </h2>

            <p className="text-sm text-[#555555] leading-relaxed mb-8">
              Please sign in or create an account to view
              your saved assets and access your personal
              workspace.
            </p>

            {error && (
              <p
                role="alert"
                className="text-xs text-red-600 mb-5"
              >
                {error}
              </p>
            )}

            <div className="flex flex-col gap-3">
              <Link
                href="/login"
                className="w-full py-3.5 bg-[#fb8500] hover:bg-[#e07600] text-white font-bold rounded-xl transition-all shadow-md shadow-[#fb8500]/30 flex items-center justify-center gap-2 text-sm"
              >
                Sign In to Dashboard
                <ArrowRightIcon
                  size={18}
                  weight="bold"
                />
              </Link>

              <Link
                href="/signup"
                className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-[#333333] font-bold rounded-xl transition-colors text-xs"
              >
                Create Free Account
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Authenticated dashboard.
  return (
    <div className="min-h-screen flex flex-col bg-[#fff3ec] text-[#121212] font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-6 py-12 w-full">
        {/* Dashboard Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-3xl border border-[#fb8500]/20 shadow-lg shadow-[#fb8500]/5 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#fb8500]/10 text-[#fb8500] text-xs font-bold mb-3 border border-[#fb8500]/20">
              <CheckCircleIcon
                size={16}
                weight="fill"
              />

              <span>Verified Creator Workspace</span>
            </div>

            <h1 className="text-3xl font-black text-[#121212]">
              Asset Library & Dashboard
            </h1>

            <p className="text-sm text-[#555555] mt-1">
              Your processed images and tools outputs are
              automatically saved here from the database.
            </p>
          </div>

          <Link
            href="/tools"
            className="px-6 py-3.5 bg-[#fb8500] hover:bg-[#e07600] text-white font-bold rounded-2xl transition-all shadow-lg shadow-[#fb8500]/30 flex items-center justify-center gap-2 shrink-0 text-sm"
          >
            <WrenchIcon
              size={20}
              weight="bold"
            />

            <span>Explore Tools</span>
          </Link>
        </div>

        {/* Saved Assets */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#121212] flex items-center gap-2">
              <FolderSimpleIcon
                size={24}
                className="text-[#fb8500]"
                weight="duotone"
              />

              Your Saved Assets ({jobs.length})
            </h2>
          </div>

          {/* Jobs Fetch Error */}
          {error && (
            <div
              role="alert"
              className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {/* Jobs Loading */}
          {jobsLoading ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-[#fb8500]/20">
              <SpinnerGapIcon
                size={30}
                className="animate-spin text-[#fb8500] mx-auto mb-3"
              />

              <p className="text-sm font-bold text-[#555555]">
                Loading your saved assets...
              </p>
            </div>
          ) : jobs.length === 0 && !error ? (
            /* Empty State */
            <div className="bg-white rounded-3xl p-12 text-center border border-[#fb8500]/20">
              <div className="w-16 h-16 bg-[#fff3ec] text-[#fb8500] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#fb8500]/20">
                <ImageSquareIcon
                  size={32}
                  weight="duotone"
                />
              </div>

              <h3 className="text-lg font-bold text-[#121212] mb-1">
                No Assets Saved Yet
              </h3>

              <p className="text-xs text-[#777777] max-w-sm mx-auto mb-6">
                When you use any tool (like Image Resizer)
                and process an image, it will automatically
                appear here.
              </p>

              <Link
                href="/tools"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#fb8500] text-white font-bold rounded-xl text-xs shadow-md"
              >
                Go to Tools

                <ArrowRightIcon size={16} />
              </Link>
            </div>
          ) : (
            /* Saved Jobs Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobs.map((job) => {
                const inputFile = job.inputFiles?.[0];
                const outputFile = job.outputFiles?.[0];

                const fileName =
                  outputFile?.fileName ||
                  inputFile?.fileName ||
                  "Processed Image";

                const fileSize =
                  typeof outputFile?.fileSize === "number"
                    ? `${(
                        outputFile.fileSize / 1024
                      ).toFixed(1)} KB`
                    : "Optimized";

                const previewUrl =
                  outputFile?.url ||
                  inputFile?.url;

                const downloadUrl = outputFile?.url;

                const formattedDate = job.createdAt
                  ? new Date(
                      job.createdAt
                    ).toLocaleDateString()
                  : "Unknown date";

                const isDeleting =
                  deletingJobId === job._id;

                return (
                  <div
                    key={job._id}
                    className="bg-white p-6 rounded-3xl border border-[#fb8500]/20 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Image Preview */}
                      <div className="relative w-full h-44 bg-[#fff3ec] rounded-2xl overflow-hidden mb-4 border border-[#fb8500]/15 flex items-center justify-center">
                        {previewUrl ? (
                          <img
                            src={previewUrl}
                            alt={fileName}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <ImageSquareIcon
                            size={44}
                            className="text-[#fb8500]"
                            weight="duotone"
                          />
                        )}
                      </div>

                      {/* File Name and Actions */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h4
                          className="text-sm font-bold text-[#121212] truncate"
                          title={fileName}
                        >
                          {fileName}
                        </h4>

                        <div className="flex items-center gap-1 shrink-0">
                          {/* Reuse Job */}
                          {job.status === "completed" && (
                            <button
                              type="button"
                              onClick={() =>
                                handleReuseJob(job._id)
                              }
                              className="p-2 bg-[#fb8500]/10 text-[#fb8500] hover:bg-[#fb8500] hover:text-white rounded-xl transition-colors cursor-pointer"
                              title="Resize / Use Again in Tool"
                              aria-label={`Reuse ${fileName}`}
                            >
                              <ArrowsClockwiseIcon
                                size={18}
                                weight="bold"
                              />
                            </button>
                          )}

                          {/* Download Output */}
                          {job.status === "completed" &&
                            downloadUrl && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleDirectDownload(
                                    downloadUrl,
                                    fileName
                                  )
                                }
                                className="p-2 bg-[#fb8500]/10 text-[#fb8500] hover:bg-[#fb8500] hover:text-white rounded-xl transition-colors cursor-pointer"
                                title="Download Image Directly"
                                aria-label={`Download ${fileName}`}
                              >
                                <DownloadSimpleIcon
                                  size={18}
                                  weight="bold"
                                />
                              </button>
                            )}

                          {/* Delete Job */}
                          <button
                            type="button"
                            onClick={() =>
                              handleDelete(job._id)
                            }
                            disabled={
                              deletingJobId !== null
                            }
                            className="p-2 text-gray-400 hover:text-red-500 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Remove from database"
                            aria-label={`Delete ${fileName}`}
                          >
                            {isDeleting ? (
                              <SpinnerGapIcon
                                size={18}
                                className="animate-spin"
                              />
                            ) : (
                              <TrashIcon size={18} />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Job Metadata */}
                    <div className="flex items-center justify-between gap-2 text-xs text-[#777777] pt-3 border-t border-[#fb8500]/10 mt-2">
                      <span
                        className={`capitalize font-medium ${
                          job.status === "completed"
                            ? "text-green-600"
                            : job.status === "failed"
                              ? "text-red-600"
                              : job.status === "processing"
                                ? "text-blue-600"
                                : "text-orange-600"
                        }`}
                      >
                        {job.status}
                      </span>

                      <span className="text-right">
                        {fileSize} • {formattedDate}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
