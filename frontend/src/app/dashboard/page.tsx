"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import { 
  FileTextIcon, 
  TrashIcon, 
  FolderSimpleIcon, 
  LockKeyIcon, 
  ArrowRightIcon,
  CheckCircleIcon,
  WrenchIcon
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

interface UploadedDocument {
  id: string;
  name: string;
  url: string;
  size: string;
  uploadedAt: string;
}

export default function DashboardPage() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);

  useEffect(() => {
    // Check if user is logged in
    const user = localStorage.getItem("meettools_user");
    if (user) {
      setIsLoggedIn(true);
      // Load saved user assets/documents from localStorage
      const savedDocs = localStorage.getItem("meettools_user_documents");
      if (savedDocs) {
        setDocuments(JSON.parse(savedDocs));
      }
    }
    setLoading(false);
  }, []);

  const handleDelete = (id: string) => {
    const updated = documents.filter((doc) => doc.id !== id);
    setDocuments(updated);
    localStorage.setItem("meettools_user_documents", JSON.stringify(updated));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fff3ec] flex items-center justify-center font-bold text-[#fb8500]">
        Loading Dashboard...
      </div>
    );
  }

  // Guest Protection Screen
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

  // Logged-in User Dashboard (Asset Library View)
  return (
    <div className="min-h-screen flex flex-col bg-[#fff3ec] text-[#121212] font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-6 py-12 w-full">
        
        {/* Header Banner (Upload button removed, replaced with status/info) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-3xl border border-[#fb8500]/20 shadow-lg shadow-[#fb8500]/5 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#fb8500]/10 text-[#fb8500] text-xs font-bold mb-3 border border-[#fb8500]/20">
              <CheckCircleIcon size={16} weight="fill" />
              <span>Verified Creator Workspace</span>
            </div>
            <h1 className="text-3xl font-black text-[#121212]">Asset Library & Dashboard</h1>
            <p className="text-sm text-[#555555] mt-1">
              Your processed images and tools outputs are automatically saved here. Use them directly in any tool!
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

        {/* Saved Assets Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#121212] flex items-center gap-2">
              <FolderSimpleIcon size={24} className="text-[#fb8500]" weight="duotone" />
              Your Saved Assets ({documents.length})
            </h2>
          </div>

          {documents.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-[#fb8500]/20">
              <div className="w-16 h-16 bg-[#fff3ec] text-[#fb8500] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#fb8500]/20">
                <FileTextIcon size={32} weight="duotone" />
              </div>
              <h3 className="text-lg font-bold text-[#121212] mb-1">No Assets Saved Yet</h3>
              <p className="text-xs text-[#777777] max-w-sm mx-auto mb-6">
                When you use any tool (like Image Resizer or Editor) and process an image, it will automatically appear here.
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
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-white p-6 rounded-3xl border border-[#fb8500]/20 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="p-3 bg-[#fff3ec] text-[#fb8500] rounded-xl border border-[#fb8500]/20 shrink-0">
                      <FileTextIcon size={24} weight="duotone" />
                    </div>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      title="Delete asset"
                    >
                      <TrashIcon size={18} />
                    </button>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold text-[#121212] truncate mb-1" title={doc.name}>
                      {doc.name}
                    </h4>
                    <div className="flex items-center justify-between text-xs text-[#777777] pt-3 border-t border-[#fb8500]/10">
                      <span>{doc.size}</span>
                      <span>{doc.uploadedAt}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}