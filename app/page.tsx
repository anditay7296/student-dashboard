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

interface StudentEntry {
  name: string;
  email: string;
  phone: string;
  joinDate: string;
}

interface Stats {
  totalStudents: number;
  onboardingSubmitted: number;
  onboardingPending: number;
  communityNotJoined: number;
  headlineDate: string;
  totalStudentsList: StudentEntry[];
  onboardingPendingList: StudentEntry[];
  onboardingSubmittedList: StudentEntry[];
  communityNotJoinedList: { name: string; email: string; phone: string; date: string; leadDays: number | null }[];
  dailySeries: DailyEntry[];
}

type CardKey = "total" | "submitted" | "pending" | "notJoined";

function StatCard({
  label,
  value,
  sub,
  color,
  active,
  onClick,
}: {
  label: string;
  value: number | string;
  sub?: string;
  color: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl p-6 shadow-sm border transition-all cursor-pointer select-none ${color} ${
        active ? "ring-2 ring-blue-400 ring-offset-2" : "hover:shadow-md"
      }`}
    >
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-4xl font-bold text-gray-900">{value}</p>
      {sub && <p className="mt-1 text-sm text-gray-400">{sub}</p>}
      <p className="mt-2 text-xs text-blue-500 font-medium">
        {active ? "▲ Hide list" : "▼ Show list"}
      </p>
    </div>
  );
}

function StudentTable({ rows }: { rows: StudentEntry[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="py-2 pr-6 font-semibold text-gray-600 w-6">#</th>
            <th className="py-2 pr-6 font-semibold text-gray-600">Name</th>
            <th className="py-2 pr-6 font-semibold text-gray-600">Email</th>
            <th className="py-2 pr-6 font-semibold text-gray-600">Phone</th>
            <th className="py-2 font-semibold text-gray-600">Join Date</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2 pr-6 text-gray-400">{i + 1}</td>
              <td className="py-2 pr-6 text-gray-800">{r.name || "—"}</td>
              <td className="py-2 pr-6 text-gray-500">{r.email || "—"}</td>
              <td className="py-2 pr-6 text-gray-500">{r.phone || "—"}</td>
              <td className="py-2 text-gray-500">{r.joinDate || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
  const [selected, setSelected] = useState<CardKey | null>(null);

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

  const onboardingRate =
    stats && stats.totalStudents > 0
      ? Math.round((stats.onboardingSubmitted / stats.totalStudents) * 100)
      : 0;

  function toggleCard(key: CardKey) {
    setSelected((prev) => (prev === key ? null : key));
  }

  const listConfig: Record<
    CardKey,
    { label: string; count: number; content: React.ReactNode }
  > = {
    total: {
      label: "Total Students",
      count: stats?.totalStudents ?? 0,
      content: <StudentTable rows={stats?.totalStudentsList ?? []} />,
    },
    submitted: {
      label: "Onboarding Submitted",
      count: stats?.onboardingSubmitted ?? 0,
      content: <StudentTable rows={stats?.onboardingSubmittedList ?? []} />,
    },
    pending: {
      label: "Onboarding Pending",
      count: stats?.onboardingPending ?? 0,
      content: <StudentTable rows={stats?.onboardingPendingList ?? []} />,
    },
    notJoined: {
      label: "Not Joined Community",
      count: stats?.communityNotJoined ?? 0,
      content: (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-2 pr-6 font-semibold text-gray-600 w-6">#</th>
                <th className="py-2 pr-6 font-semibold text-gray-600">Name</th>
                <th className="py-2 pr-6 font-semibold text-gray-600">Email</th>
                <th className="py-2 pr-6 font-semibold text-gray-600">Phone</th>
                <th className="py-2 pr-6 font-semibold text-gray-600">Date</th>
                <th className="py-2 pr-6 font-semibold text-gray-600">Leak Time</th>
                <th className="py-2 font-semibold text-gray-600">Remark</th>
              </tr>
            </thead>
            <tbody>
              {(stats?.communityNotJoinedList ?? []).map((r, i) => {
                const overdue = r.leadDays !== null && r.leadDays > 3;
                const remark =
                  r.leadDays === null
                    ? ""
                    : overdue
                    ? "Angellie to call immediately"
                    : "YonZeng please onboard now!";
                return (
                  <tr
                    key={i}
                    className={
                      overdue
                        ? "border-b border-red-100 bg-red-50"
                        : "border-b border-gray-100 hover:bg-gray-50"
                    }
                  >
                    <td className={`py-2 pr-6 ${overdue ? "text-red-400 font-bold" : "text-gray-400"}`}>{i + 1}</td>
                    <td className={`py-2 pr-6 ${overdue ? "text-red-700 font-bold" : "text-gray-800"}`}>{r.name || "—"}</td>
                    <td className={`py-2 pr-6 ${overdue ? "text-red-600 font-bold" : "text-gray-500"}`}>{r.email || "—"}</td>
                    <td className={`py-2 pr-6 ${overdue ? "text-red-600 font-bold" : "text-gray-500"}`}>{r.phone || "—"}</td>
                    <td className={`py-2 pr-6 ${overdue ? "text-red-600 font-bold" : "text-gray-500"}`}>{r.date || "—"}</td>
                    <td className={`py-2 pr-6 ${overdue ? "text-red-700 font-bold" : "text-gray-500"}`}>
                      {r.leadDays === null ? "—" : r.leadDays}
                    </td>
                    <td className={`py-2 ${overdue ? "text-red-700 font-bold" : "text-gray-500"}`}>{remark}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ),
    },
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-10">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Student Dashboard</h1>
          {stats?.headlineDate && (
            <p className="text-2xl font-semibold text-blue-600 mt-1">{stats.headlineDate}</p>
          )}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard
          label="Total Students"
          value={stats?.totalStudents ?? 0}
          color="bg-white border-gray-100"
          active={selected === "total"}
          onClick={() => toggleCard("total")}
        />
        <StatCard
          label="Onboarding Submitted"
          value={stats?.onboardingSubmitted ?? 0}
          sub={`${onboardingRate}% completion rate`}
          color="bg-green-50 border-green-100"
          active={selected === "submitted"}
          onClick={() => toggleCard("submitted")}
        />
        <StatCard
          label="Onboarding Pending"
          value={stats?.onboardingPending ?? 0}
          color="bg-yellow-50 border-yellow-100"
          active={selected === "pending"}
          onClick={() => toggleCard("pending")}
        />
        <StatCard
          label="Not Joined Community"
          value={stats?.communityNotJoined ?? 0}
          sub="via onboarding form (col AA = FALSE)"
          color="bg-orange-50 border-orange-100"
          active={selected === "notJoined"}
          onClick={() => toggleCard("notJoined")}
        />
      </div>

      {/* Expandable Student List */}
      {selected && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              {listConfig[selected].label}
              <span className="ml-2 text-sm font-normal text-gray-400">
                ({listConfig[selected].count} students)
              </span>
            </h2>
            <button
              onClick={() => setSelected(null)}
              className="text-gray-400 hover:text-gray-600 text-xl font-light leading-none"
            >
              ✕
            </button>
          </div>
          {listConfig[selected].content}
        </div>
      )}

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
