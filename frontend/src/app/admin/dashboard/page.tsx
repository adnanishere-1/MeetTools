"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import { 
  UsersIcon, 
  ShieldCheckIcon, 
  SpinnerIcon, 
  CrownIcon, 
  ActivityIcon,
  FlameIcon,
  CheckCircleIcon,
  ChartBarIcon 
} from "@phosphor-icons/react/dist/ssr";
import { useRouter } from "next/navigation";
import axios from "axios";

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [actionStats, setActionStats] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        // Session storage se token lena jo login par mila tha
        const token = sessionStorage.getItem("meettools_jwt");

        if (!token) {
          router.push("/login");
          return;
        }

        // Bearer Token ke sath request bhejna
        const response = await axios.get("/api/v1/admin/dashboard", {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        setStats(response.data.stats);
        setActionStats(response.data.actionStats || []);
        setRecentActivities(response.data.recentActivities || []);
      } catch (error: any) {
        console.error("Access denied or unauthorized:", error);
        alert("Access Denied: Admin privileges required.");
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, [router]);

  const mostUsedTool = actionStats.length > 0 ? actionStats[0] : null;
  const totalActionsCount = actionStats.reduce((acc, curr) => acc + curr.count, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#fff3ec] text-[#121212]">
        <Navbar />
        <div className="flex-1 flex items-center justify-center gap-3 text-[#fb8500] font-bold text-lg">
          <SpinnerIcon size={32} className="animate-spin" />
          Loading Admin Control Center...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#fff3ec] text-[#121212] font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-6 py-12 w-full">
        
        <div className="mb-8 pb-4 border-b border-[#fb8500]/20 flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#fb8500]/10 border border-[#fb8500]/30 text-[#fb8500] text-xs font-bold mb-2">
              <CrownIcon size={16} weight="fill" />
              <span>Administrator Portal</span>
            </div>
            <h1 className="text-3xl font-black text-[#121212]">System Control Center</h1>
            <p className="text-xs text-[#555555]">Real-time platform analytics and tool usage metrics</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <div className="bg-white p-6 rounded-3xl border border-[#fb8500]/25 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-[#555555] uppercase">Total Users</p>
              <UsersIcon size={24} className="text-[#fb8500]" weight="duotone" />
            </div>
            <h2 className="text-3xl font-black text-[#121212]">{stats?.totalUsers || 0}</h2>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-[#fb8500]/25 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-[#555555] uppercase">Total Admins</p>
              <CrownIcon size={24} className="text-[#fb8500]" weight="duotone" />
            </div>
            <h2 className="text-3xl font-black text-[#fb8500]">{stats?.totalAdmins || 0}</h2>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-[#fb8500]/25 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-[#555555] uppercase">Verified Emails</p>
              <CheckCircleIcon size={24} className="text-emerald-600" weight="duotone" />
            </div>
            <h2 className="text-3xl font-black text-emerald-600">{stats?.verifiedUsers || 0}</h2>
          </div>

          <div className="bg-gradient-to-br from-[#fb8500] to-[#e07600] p-6 rounded-3xl shadow-xl text-white">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold uppercase opacity-90">Top Used Tool / Action</p>
              <FlameIcon size={24} weight="fill" />
            </div>
            <h2 className="text-xl font-black truncate mt-1">
              {mostUsedTool ? mostUsedTool._id : "No Activity Yet"}
            </h2>
            <p className="text-[11px] opacity-80 mt-1">
              {mostUsedTool ? `${mostUsedTool.count} executions recorded` : "Awaiting user usage"}
            </p>
          </div>
        </div>

        {/* Tool Usage Graph & Logs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-3xl border border-[#fb8500]/20 shadow-xl">
            <h3 className="text-lg font-bold text-[#121212] mb-4 flex items-center gap-2">
              <ChartBarIcon size={20} className="text-[#fb8500]" /> Tool Usage Analytics (Graph)
            </h3>
            
            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
              {actionStats.length > 0 ? (
                actionStats.map((item: any, index: number) => {
                  const percentage = totalActionsCount > 0 ? Math.round((item.count / totalActionsCount) * 100) : 0;
                  return (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-[#333333]">
                        <span className="truncate max-w-[160px]">{item._id}</span>
                        <span className="text-[#fb8500]">{item.count} times ({percentage}%)</span>
                      </div>
                      <div className="w-full bg-[#fff3ec] h-3 rounded-full overflow-hidden border border-[#fb8500]/20">
                        <div 
                          className="bg-gradient-to-r from-[#fb8500] to-[#ffb703] h-full rounded-full transition-all duration-500" 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-[#777777] text-center py-6">No tool usage stats recorded yet.</p>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-[#fb8500]/20 shadow-xl">
            <h3 className="text-lg font-bold text-[#121212] mb-4 flex items-center gap-2">
              <ShieldCheckIcon size={20} className="text-[#fb8500]" /> Recent Activity Logs
            </h3>
            <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#fb8500]/20 text-[#555555] sticky top-0 bg-white">
                    <th className="pb-3 font-bold">User</th>
                    <th className="pb-3 font-bold">Action / Tool</th>
                    <th className="pb-3 font-bold">IP Address</th>
                    <th className="pb-3 font-bold">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#fb8500]/10">
                  {recentActivities.length > 0 ? (
                    recentActivities.map((log: any) => (
                      <tr key={log._id} className="hover:bg-[#fff3ec]/30 transition-colors">
                        <td className="py-3 font-bold text-[#121212]">
                          {log.userId?.name || "Unknown"} <br />
                          <span className="text-[10px] text-[#777777] font-normal">{log.userId?.email}</span>
                        </td>
                        <td className="py-3">
                          <span className="px-2 py-1 bg-[#fb8500]/10 text-[#fb8500] rounded-lg font-bold text-[10px]">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 text-[#555555]">{log.ipAddress || "N/A"}</td>
                        <td className="py-3 text-[#555555]">{new Date(log.createdAt).toLocaleString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="text-center py-6 text-xs text-[#777777]">No recent logs found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}