
"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/layout/Navbar";
import {
  UsersIcon,
  ShieldCheckIcon,
  SpinnerIcon,
  CrownIcon,
  FlameIcon,
  CheckCircleIcon,
  ChartBarIcon,
} from "@phosphor-icons/react/dist/ssr";
import { useRouter } from "next/navigation";
import axios from "axios";

interface DashboardStats {
  totalUsers: number;
  totalAdmins: number;
  verifiedUsers: number;
  totalToolUses: number;
  guestUses: number;
  loggedInUses: number;
}

interface ToolStat {
  _id: string;
  count: number;
  guestCount: number;
  userCount: number;
}

interface ActivityLog {
  _id: string;
  toolId: string;
  action: string;
  visitorType: "guest" | "user";
  userId?: {
    name: string;
    email: string;
  } | null;
  createdAt: string;
}

interface AdminResponse {
  success?: boolean;
  stats: DashboardStats;
  actionStats: ToolStat[];
  recentActivities: ActivityLog[];
}

export default function AdminDashboardPage() {
  const router = useRouter();

  const [stats, setStats] =
    useState<DashboardStats | null>(null);

  const [actionStats, setActionStats] =
    useState<ToolStat[]>([]);

  const [recentActivities, setRecentActivities] =
    useState<ActivityLog[]>([]);

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let active = true;

    const fetchAdminData = async () => {
      try {
        const response = await axios.get<AdminResponse>(
          "/api/v1/admin/dashboard",
          {
            withCredentials: true,
          }
        );

        if (!active) return;

        setStats(response.data.stats);

        setActionStats(
          response.data.actionStats || []
        );

        setRecentActivities(
          response.data.recentActivities || []
        );
      } catch (error: unknown) {
        if (!active) return;

        if (axios.isAxiosError(error)) {
          const status = error.response?.status;

          if (status === 401) {
            router.replace("/login");
            return;
          }

          if (status === 403) {
            router.replace("/dashboard");
            return;
          }
        }

        setErrorMsg(
          "Unable to load admin dashboard. Please try again."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchAdminData();

    return () => {
      active = false;
    };
  }, [router]);

  const mostUsedTool =
    actionStats.length > 0
      ? [...actionStats].sort(
          (a, b) => b.count - a.count
        )[0]
      : null;

  const totalActionsCount =
    actionStats.reduce(
      (acc, curr) => acc + curr.count,
      0
    );

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-[#fff3ec] text-[#121212]">
        <Navbar />

        <div className="flex-1 flex items-center justify-center gap-3 text-[#fb8500] font-bold text-lg">
          <SpinnerIcon
            size={32}
            className="animate-spin"
          />
          Loading Admin Control Center...
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen flex flex-col bg-[#fff3ec] text-[#121212]">
        <Navbar />

        <main className="flex-1 flex items-center justify-center px-6">
          <div className="text-center">
            <p className="text-red-600 font-bold mb-4">
              {errorMsg}
            </p>

            <button
              onClick={() => window.location.reload()}
              className="px-5 py-3 bg-[#fb8500] text-white font-bold rounded-xl cursor-pointer"
            >
              Try Again
            </button>
          </div>
        </main>
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
              <CrownIcon
                size={16}
                weight="fill"
              />
              <span>Administrator Portal</span>
            </div>

            <h1 className="text-3xl font-black text-[#121212]">
              System Control Center
            </h1>

            <p className="text-xs text-[#555555]">
              Real-time platform analytics and tool usage metrics
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">

          {/* Total Users */}
          <div className="bg-white p-6 rounded-3xl border border-[#fb8500]/25 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-[#555555] uppercase">
                Total Users
              </p>

              <UsersIcon
                size={24}
                className="text-[#fb8500]"
                weight="duotone"
              />
            </div>

            <h2 className="text-3xl font-black text-[#121212]">
              {stats?.totalUsers ?? 0}
            </h2>
          </div>

          {/* Total Tool Uses */}
          <div className="bg-white p-6 rounded-3xl border border-[#fb8500]/25 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-[#555555] uppercase">
                Total Tool Uses
              </p>

              <ChartBarIcon
                size={24}
                className="text-[#fb8500]"
                weight="duotone"
              />
            </div>

            <h2 className="text-3xl font-black text-[#fb8500]">
              {stats?.totalToolUses ?? 0}
            </h2>
          </div>

          {/* Guest Tool Uses */}
          <div className="bg-white p-6 rounded-3xl border border-[#fb8500]/25 shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-[#555555] uppercase">
                Guest Tool Uses
              </p>

              <CheckCircleIcon
                size={24}
                className="text-emerald-600"
                weight="duotone"
              />
            </div>

            <h2 className="text-3xl font-black text-emerald-600">
              {stats?.guestUses ?? 0}
            </h2>
          </div>

          {/* Top Used Tool */}
          <div className="bg-gradient-to-br from-[#fb8500] to-[#e07600] p-6 rounded-3xl shadow-xl text-white">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold uppercase opacity-90">
                Top Used Tool / Action
              </p>

              <FlameIcon
                size={24}
                weight="fill"
              />
            </div>

            <h2 className="text-xl font-black truncate mt-1">
              {mostUsedTool
                ? mostUsedTool._id
                : "No Activity Yet"}
            </h2>

            <p className="text-[11px] opacity-80 mt-1">
              {mostUsedTool
                ? `${mostUsedTool.count} executions recorded`
                : "Awaiting user usage"}
            </p>
          </div>
        </div>

        {/* Tool Usage Graph & Logs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Tool Analytics */}
          <div className="bg-white p-6 rounded-3xl border border-[#fb8500]/20 shadow-xl">
            <h3 className="text-lg font-bold text-[#121212] mb-4 flex items-center gap-2">
              <ChartBarIcon
                size={20}
                className="text-[#fb8500]"
              />
              Tool Usage Analytics (Graph)
            </h3>

            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2">
              {actionStats.length > 0 ? (
                actionStats.map((item) => {
                  const percentage =
                    totalActionsCount > 0
                      ? Math.round(
                          (item.count / totalActionsCount) * 100
                        )
                      : 0;

                  return (
                    <div
                      key={item._id}
                      className="space-y-1"
                    >
                      <div className="flex justify-between text-xs font-bold text-[#333333]">
                        <span className="truncate max-w-[160px]">
                          {item._id}
                        </span>

                        <span className="text-[#fb8500]">
                          {item.count} times ({percentage}%)
                        </span>
                      </div>

                      <div className="w-full bg-[#fff3ec] h-3 rounded-full overflow-hidden border border-[#fb8500]/20">
                        <div
                          className="bg-gradient-to-r from-[#fb8500] to-[#ffb703] h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${percentage}%`,
                          }}
                        />
                      </div>

                      <div className="flex justify-between text-[10px] text-[#777777]">
                        <span>
                          Guest: {item.guestCount}
                        </span>

                        <span>
                          Logged In: {item.userCount}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-[#777777] text-center py-6">
                  No tool usage stats recorded yet.
                </p>
              )}
            </div>

            {/* Logged In Usage */}
            <div className="mt-6 pt-4 border-t border-[#fb8500]/10">
              <p className="text-xs font-bold text-[#555555] uppercase">
                Logged-in Tool Uses
              </p>

              <h2 className="text-3xl font-black text-[#fb8500] mt-2">
                {stats?.loggedInUses ?? 0}
              </h2>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-[#fb8500]/20 shadow-xl">
            <h3 className="text-lg font-bold text-[#121212] mb-4 flex items-center gap-2">
              <ShieldCheckIcon
                size={20}
                className="text-[#fb8500]"
              />
              Recent Activity Logs
            </h3>

            <div className="overflow-x-auto max-h-[350px] overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#fb8500]/20 text-[#555555] sticky top-0 bg-white">
                    <th className="pb-3 font-bold">
                      User
                    </th>

                    <th className="pb-3 font-bold">
                      Action / Tool
                    </th>

                    <th className="pb-3 font-bold">
                      Visitor Type
                    </th>

                    <th className="pb-3 font-bold">
                      Time
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#fb8500]/10">
                  {recentActivities.length > 0 ? (
                    recentActivities.map((log) => (
                      <tr
                        key={log._id}
                        className="hover:bg-[#fff3ec]/30 transition-colors"
                      >
                        <td className="py-3 font-bold text-[#121212]">
                          {log.userId?.name || "Guest"}

                          <span className="block text-[10px] text-[#777777] font-normal">
                            {log.userId?.email ||
                              "Anonymous"}
                          </span>
                        </td>

                        <td className="py-3">
                          <span className="px-2 py-1 bg-[#fb8500]/10 text-[#fb8500] rounded-lg font-bold text-[10px]">
                            {log.toolId} / {log.action}
                          </span>
                        </td>

                        <td className="py-3 text-[#555555]">
                          {log.visitorType === "guest"
                            ? "Guest"
                            : "Logged In"}
                        </td>

                        <td className="py-3 text-[#555555]">
                          {new Date(
                            log.createdAt
                          ).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={4}
                        className="text-center py-6 text-xs text-[#777777]"
                      >
                        No recent logs found.
                      </td>
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
