"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import { 
  TrashIcon, 
  FolderSimpleIcon, 
  LockKeyIcon, 
  ArrowRightIcon,
  CheckCircleIcon,
  WrenchIcon,
  DownloadSimpleIcon,
  ImageSquareIcon,
  ArrowsClockwiseIcon
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";

interface JobFile {
  fileId: string;
  url: string;
  fileName: string;
  fileSize: number;
}

interface JobItem {
  _id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  inputFiles: JobFile[];
  outputFiles?: JobFile[];
  createdAt: string;
}

export default function DashboardPage() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const router = useRouter();

  useEffect(() => {
    const checkAuthAndFetchJobs = async () => {
      const user = localStorage.getItem("meettools_user");
      const token = 
        localStorage.getItem("token") || 
        localStorage.getItem("meettools_token") || 
        localStorage.getItem("accessToken");

      if (user || token) {
        setIsLoggedIn(true);
        try {
          const response = await axios.get("/api/v1/jobs", {
            headers: {
              Authorization: token ? `Bearer ${token}` : undefined,
            },
          });
          
          if (response.data && response.data.jobs) {
            setJobs(response.data.jobs);
          }
        } catch (error) {
          console.error("Failed to fetch jobs history from database:", error);
        }
      }
      setLoading(false);
    };

    checkAuthAndFetchJobs();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      const token = localStorage.getItem("token") || localStorage.getItem("meettools_token");
      await axios.delete(`/api/v1/jobs/${id}`, {
        headers: { Authorization: token ? `Bearer ${token}` : undefined },
      });
      setJobs(jobs.filter((job) => job._id !== id));
    } catch (error) {
      console.error("Failed to delete job:", error);
      alert("Job delete karne mein masla aaya hai.");
    }
  };

  // 🔄 Datastore Approach: URL Query mein Job ID pass kar rahe hain
  const handleReuseJob = (jobId: string) => {
    router.push(`/tools/image-resizer?jobId=${jobId}`);
  };

  const handleDirectDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename || 'downloaded-image.jpg';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      window.open(url, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fff3ec] flex items-center justify-center font-bold text-[#fb8500]">
        Loading Dashboard...
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex flex-col bg-[#fff3ec] text-[#121212] font-sans">
        <Navbar />
        <main className="flex-1 flex items-center justify-center px-6 py-16">
          <div className="bg-white rounded-3xl p-10 max-w-md w-full text-center border border-[#fb8500]/20 shadow-xl shadow-[#fb8500]/5">
            <div className="w-16 h-16 bg-[#fb8500]/10 text-[#fb8500] rounded-2xl flex items-center justify-center mx-auto mb-6 border border-[#fb8500]/20">
              <LockKeyIcon size={36} weight="duotone" />
            </div>
            <h2 className="text-2xl font-black text-[#121212] mb-3">Dashboard Access Restricted</h2>
            <p className="text-sm text-[#555555] leading-relaxed mb-8">
              Please sign in or create an account to view your saved assets and access your personal workspace.
            </p>
            <div className="flex flex-col gap-3">
              <Link
                href="/login"
                className="w-full py-3.5 bg-[#fb8500] hover:bg-[#e07600] text-white font-bold rounded-xl transition-all shadow-md shadow-[#fb8500]/30 flex items-center justify-center gap-2 text-sm"
              >
                Sign In to Dashboard <ArrowRightIcon size={18} weight="bold" />
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

  return (
    <div className="min-h-screen flex flex-col bg-[#fff3ec] text-[#121212] font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-6 py-12 w-full">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-3xl border border-[#fb8500]/20 shadow-lg shadow-[#fb8500]/5 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#fb8500]/10 text-[#fb8500] text-xs font-bold mb-3 border border-[#fb8500]/20">
              <CheckCircleIcon size={16} weight="fill" />
              <span>Verified Creator Workspace</span>
            </div>
            <h1 className="text-3xl font-black text-[#121212]">Asset Library & Dashboard</h1>
            <p className="text-sm text-[#555555] mt-1">
              Your processed images and tools outputs are automatically saved here from the database.
            </p>
          </div>

          <Link
            href="/tools"
            className="px-6 py-3.5 bg-[#fb8500] hover:bg-[#e07600] text-white font-bold rounded-2xl transition-all shadow-lg shadow-[#fb8500]/30 flex items-center justify-center gap-2 shrink-0 text-sm"
          >
            <WrenchIcon size={20} weight="bold" />
            <span>Explore Tools</span>
          </Link>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#121212] flex items-center gap-2">
              <FolderSimpleIcon size={24} className="text-[#fb8500]" weight="duotone" />
              Your Saved Assets ({jobs.length})
            </h2>
          </div>

          {jobs.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-[#fb8500]/20">
              <div className="w-16 h-16 bg-[#fff3ec] text-[#fb8500] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#fb8500]/20">
                <ImageSquareIcon size={32} weight="duotone" />
              </div>
              <h3 className="text-lg font-bold text-[#121212] mb-1">No Assets Saved Yet</h3>
              <p className="text-xs text-[#777777] max-w-sm mx-auto mb-6">
                When you use any tool (like Image Resizer) and process an image, it will automatically appear here.
              </p>
              <Link
                href="/tools"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#fb8500] text-white font-bold rounded-xl text-xs shadow-md"
              >
                Go to Tools <ArrowRightIcon size={16} />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {jobs.map((job) => {
                const fileName = job.outputFiles?.[0]?.fileName || job.inputFiles?.[0]?.fileName || "Processed Image";
                const fileSize = job.outputFiles?.[0]?.fileSize 
                  ? `${(job.outputFiles[0].fileSize / 1024).toFixed(1)} KB` 
                  : "Optimized";
                const downloadUrl = job.outputFiles?.[0]?.url || job.inputFiles?.[0]?.url;
                const formattedDate = new Date(job.createdAt).toLocaleDateString();

                return (
                  <div
                    key={job._id}
                    className="bg-white p-6 rounded-3xl border border-[#fb8500]/20 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Large Image Preview Card */}
                      <div className="relative w-full h-44 bg-[#fff3ec] rounded-2xl overflow-hidden mb-4 border border-[#fb8500]/15 flex items-center justify-center">
                        {downloadUrl ? (
                          <img 
                            src={downloadUrl} 
                            alt={fileName} 
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <ImageSquareIcon size={44} className="text-[#fb8500]" weight="duotone" />
                        )}
                      </div>

                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h4 className="text-sm font-bold text-[#121212] truncate" title={fileName}>
                          {fileName}
                        </h4>
                        
                        <div className="flex items-center gap-1 shrink-0">
                          {job.status === "completed" && downloadUrl && (
                            <>
                              <button
                                onClick={() => handleReuseJob(job._id)}
                                className="p-2 bg-[#fb8500]/10 text-[#fb8500] hover:bg-[#fb8500] hover:text-white rounded-xl transition-colors cursor-pointer"
                                title="Resize / Use Again in Tool"
                              >
                                <ArrowsClockwiseIcon size={18} weight="bold" />
                              </button>
                              <button
                                onClick={() => handleDirectDownload(downloadUrl, fileName)}
                                className="p-2 bg-[#fb8500]/10 text-[#fb8500] hover:bg-[#fb8500] hover:text-white rounded-xl transition-colors cursor-pointer"
                                title="Download Image Directly"
                              >
                                <DownloadSimpleIcon size={18} weight="bold" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDelete(job._id)}
                            className="p-2 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                            title="Remove from database"
                          >
                            <TrashIcon size={18} />
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-[#777777] pt-3 border-t border-[#fb8500]/10 mt-2">
                      <span className="capitalize font-medium text-blue-600">{job.status}</span>
                      <span>{fileSize} • {formattedDate}</span>
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