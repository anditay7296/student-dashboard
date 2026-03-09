"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";

interface DailyEntry {
  date: string;
  count: number;
  total: number;
}

interface Stats {
  totalStudents: number;
  onboardingSubmitted: number;
  onboardingPending: number;
  communityJoined: number;
  dailySeries: DailyEntry[];
}

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: number | string;
  sub?: string;
  color: string;
}) {
  return (
    <div className={`rounded-2xl p-6 shadow-sm border ${color}`}>
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-4xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-1 text-sm text-gray-400">{sub}</p>}
    </div>
  );
}

function formatXAxis(dateStr: string) {
  try {
    return format(parseISO(dateStr), "MMM d");
  } catch {
    return dateStr;
  }
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  async function fetchData() {
    try {
      setLoading(true);
      const res = await fetch("/api/students");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setStats(data);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch {
      setError("Could not load student data. Check your API credentials.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Loading student data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md text-center">
          <p className="text-red-600 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  const onboardingRate = stats && stats.totalStudents > 0
    ? Math.round((stats.onboardingSubmitted / stats.totalStudents) * 100)
    : 0;

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-10">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Student Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">Live data from Google Sheets</p>
        </div>
        <div className="text-right">
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition"
          >
            Refresh
          </button>
          {lastUpdated && (
            <p className="text-xs text-gray-400 mt-1">Updated {lastUpdated}</p>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Students"
          value={stats?.totalStudents ?? 0}
          color="bg-white border-gray-100"
        />
        <StatCard
          label="Onboarding Submitted"
          value={stats?.onboardingSubmitted ?? 0}
          sub={`${onboardingRate}% completion rate`}
          color="bg-green-50 border-green-100"
        />
        <StatCard
          label="Onboarding Pending"
          value={stats?.onboardingPending ?? 0}
          color="bg-yellow-50 border-yellow-100"
        />
        <StatCard
          label="Joined Community"
          value={stats?.communityJoined ?? 0}
          sub="via onboarding form (col AA)"
          color="bg-blue-50 border-blue-100"
        />
      </div>

      {/* Cumulative Growth Chart */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Cumulative Student Growth
        </h2>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={stats?.dailySeries}>
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tickFormatter={formatXAxis}
              tick={{ fontSize: 12 }}
              tickLine={false}
            />
            <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
            <Tooltip
              labelFormatter={(v) => formatXAxis(v as string)}
              formatter={(v) => [v, "Total Students"]}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#colorTotal)"
              name="Total Students"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Daily New Students Chart */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          New Students Per Day
        </h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={stats?.dailySeries}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tickFormatter={formatXAxis}
              tick={{ fontSize: 12 }}
              tickLine={false}
            />
            <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
            <Tooltip
              labelFormatter={(v) => formatXAxis(v as string)}
              formatter={(v) => [v, "New Students"]}
            />
            <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="New Students" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </main>
  );
}
