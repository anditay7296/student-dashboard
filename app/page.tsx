"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";

// ---------------------------------------------------------------------------
// Country name → ISO 3166-1 numeric code (for world-atlas TopoJSON)
// ---------------------------------------------------------------------------
const COUNTRY_ISO: Record<string, string> = {
  afghanistan: "4", albania: "8", algeria: "12", angola: "24",
  argentina: "32", australia: "36", austria: "40", azerbaijan: "31",
  bangladesh: "50", belarus: "112", belgium: "56", benin: "204",
  bolivia: "68", brazil: "76", brunei: "96", bulgaria: "100",
  cambodia: "116", cameroon: "120", canada: "124", chile: "152",
  china: "156", colombia: "170", congo: "180", "costa rica": "188",
  croatia: "191", cuba: "192", "czech republic": "203", denmark: "208",
  ecuador: "218", egypt: "818", ethiopia: "231", finland: "246",
  france: "250", gabon: "266", germany: "276", ghana: "288",
  greece: "300", guatemala: "320", guinea: "324", haiti: "332",
  honduras: "340", "hong kong": "344", hungary: "348", india: "356",
  indonesia: "360", iran: "364", iraq: "368", ireland: "372",
  israel: "376", italy: "380", "ivory coast": "384", jamaica: "388",
  japan: "392", jordan: "400", kazakhstan: "398", kenya: "404",
  "south korea": "410", korea: "410", kuwait: "414", laos: "418",
  latvia: "428", lebanon: "422", libya: "434", lithuania: "440",
  malaysia: "458", mali: "466", mauritania: "478", mexico: "484",
  moldova: "498", mongolia: "496", morocco: "504", mozambique: "508",
  myanmar: "104", namibia: "516", nepal: "524", netherlands: "528",
  "new zealand": "554", nicaragua: "558", niger: "562", nigeria: "566",
  norway: "578", oman: "512", pakistan: "586", panama: "591",
  paraguay: "600", peru: "604", philippines: "608", poland: "616",
  portugal: "620", qatar: "634", romania: "642", russia: "643",
  rwanda: "646", "saudi arabia": "682", senegal: "686", singapore: "702",
  slovakia: "703", somalia: "706", "south africa": "710",
  "south sudan": "728", spain: "724", "sri lanka": "144", sudan: "729",
  sweden: "752", switzerland: "756", syria: "760", taiwan: "158",
  tajikistan: "762", tanzania: "834", thailand: "764", togo: "768",
  "trinidad and tobago": "780", tunisia: "788", turkey: "792",
  turkmenistan: "795", uganda: "800", ukraine: "804",
  "united arab emirates": "784", uae: "784",
  "united kingdom": "826", uk: "826",
  "united states": "840", usa: "840", "united states of america": "840", us: "840",
  uruguay: "858", uzbekistan: "860", venezuela: "862", vietnam: "704",
  yemen: "887", zambia: "894", zimbabwe: "716",
};

const ISO_TO_NAME: Record<string, string> = {
  "4": "Afghanistan", "8": "Albania", "12": "Algeria", "24": "Angola",
  "32": "Argentina", "36": "Australia", "40": "Austria", "50": "Bangladesh",
  "56": "Belgium", "76": "Brazil", "96": "Brunei", "104": "Myanmar",
  "116": "Cambodia", "120": "Cameroon", "124": "Canada", "144": "Sri Lanka",
  "152": "Chile", "156": "China", "158": "Taiwan", "170": "Colombia",
  "180": "Congo", "208": "Denmark", "218": "Ecuador", "231": "Ethiopia",
  "246": "Finland", "250": "France", "266": "Gabon", "276": "Germany",
  "288": "Ghana", "300": "Greece", "344": "Hong Kong", "348": "Hungary",
  "356": "India", "360": "Indonesia", "364": "Iran", "368": "Iraq",
  "372": "Ireland", "376": "Israel", "380": "Italy", "392": "Japan",
  "398": "Kazakhstan", "400": "Jordan", "404": "Kenya", "410": "South Korea",
  "414": "Kuwait", "418": "Laos", "422": "Lebanon", "434": "Libya",
  "458": "Malaysia", "466": "Mali", "484": "Mexico", "496": "Mongolia",
  "504": "Morocco", "512": "Oman", "528": "Netherlands", "554": "New Zealand",
  "566": "Nigeria", "578": "Norway", "586": "Pakistan", "604": "Peru",
  "608": "Philippines", "616": "Poland", "620": "Portugal", "634": "Qatar",
  "642": "Romania", "643": "Russia", "682": "Saudi Arabia", "702": "Singapore",
  "710": "South Africa", "724": "Spain", "728": "South Sudan", "729": "Sudan",
  "752": "Sweden", "756": "Switzerland", "764": "Thailand", "784": "UAE",
  "804": "Ukraine", "818": "Egypt", "826": "United Kingdom",
  "834": "Tanzania", "840": "United States", "854": "Burkina Faso",
  "862": "Venezuela", "887": "Yemen", "894": "Zambia", "716": "Zimbabwe",
};

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

function getCountryColor(count: number, maxCount: number): string {
  if (count === 0) return "#E5E7EB";
  const t = count / Math.max(maxCount, 1);
  if (t >= 0.7) return "#1D4ED8";
  if (t >= 0.4) return "#2563EB";
  if (t >= 0.2) return "#3B82F6";
  if (t >= 0.08) return "#60A5FA";
  return "#BFDBFE";
}

function getBarColor(rate: number): string {
  if (rate >= 80) return "#22c55e";
  if (rate >= 60) return "#3b82f6";
  if (rate >= 40) return "#eab308";
  if (rate >= 20) return "#f97316";
  return "#ef4444";
}

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------
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

interface StudentShowUpRate {
  name: string;
  email: string;
  rate: number;
  sessionsAttended: number;
  totalSessions: number;
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
  communityNotJoinedList: {
    name: string;
    email: string;
    phone: string;
    date: string;
    leadDays: number | null;
  }[];
  dailySeries: DailyEntry[];
  zoomAttended: number;
  zoomNotAttended: number;
  totalZoomSessions: number;
  studentShowUpRates: StudentShowUpRate[];
  countryCounts: Record<string, number>;
}

type CardKey =
  | "total"
  | "submitted"
  | "pending"
  | "notJoined"
  | "zoomAttended"
  | "zoomNotAttended";

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
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

function ZoomAttendanceTable({ rows }: { rows: StudentShowUpRate[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="py-2 pr-6 font-semibold text-gray-600 w-6">#</th>
            <th className="py-2 pr-6 font-semibold text-gray-600">Name</th>
            <th className="py-2 pr-6 font-semibold text-gray-600">Email</th>
            <th className="py-2 pr-6 font-semibold text-gray-600">Sessions</th>
            <th className="py-2 font-semibold text-gray-600">Show-up Rate</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2 pr-6 text-gray-400">{i + 1}</td>
              <td className="py-2 pr-6 text-gray-800">{r.name || "—"}</td>
              <td className="py-2 pr-6 text-gray-500">{r.email || "—"}</td>
              <td className="py-2 pr-6 text-gray-500">
                {r.sessionsAttended}/{r.totalSessions}
              </td>
              <td className="py-2">
                <span
                  className={`font-semibold ${
                    r.rate >= 80
                      ? "text-green-600"
                      : r.rate >= 60
                      ? "text-blue-600"
                      : r.rate >= 40
                      ? "text-yellow-600"
                      : "text-red-600"
                  }`}
                >
                  {r.rate}%
                </span>
              </td>
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

// Custom tooltip for show-up rate chart
function ShowUpTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: StudentShowUpRate }[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow px-3 py-2 text-xs">
      <p className="font-semibold text-gray-800">{d.name}</p>
      <p className="text-gray-500">
        {d.sessionsAttended} / {d.totalSessions} sessions
      </p>
      <p className={`font-bold ${getBarColor(d.rate) === "#22c55e" ? "text-green-600" : "text-blue-600"}`}>
        {d.rate}% show-up rate
      </p>
    </div>
  );
}

// World map component — only renders on client to avoid hydration issues
function WorldMap({ countryCounts }: { countryCounts: Record<string, number> }) {
  const maxCount = Math.max(...Object.values(countryCounts), 1);

  // Build iso numeric string -> student count
  const isoCount: Record<string, number> = {};
  for (const [country, count] of Object.entries(countryCounts)) {
    const iso = COUNTRY_ISO[country.toLowerCase().trim()];
    if (iso) {
      isoCount[iso] = (isoCount[iso] || 0) + count;
    }
  }

  const [tooltip, setTooltip] = useState<{
    name: string;
    count: number;
    x: number;
    y: number;
  } | null>(null);

  return (
    <div className="relative">
      <ComposableMap
        projectionConfig={{ scale: 145, center: [0, 10] }}
        style={{ width: "100%", height: "auto" }}
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const id = String(geo.id);
              const count = isoCount[id] || 0;
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={getCountryColor(count, maxCount)}
                  stroke="#fff"
                  strokeWidth={0.4}
                  onMouseEnter={(evt: React.MouseEvent) => {
                    if (count > 0) {
                      setTooltip({
                        name: ISO_TO_NAME[id] || id,
                        count,
                        x: evt.clientX,
                        y: evt.clientY,
                      });
                    }
                  }}
                  onMouseMove={(evt: React.MouseEvent) => {
                    if (tooltip) {
                      setTooltip((prev) =>
                        prev ? { ...prev, x: evt.clientX, y: evt.clientY } : null
                      );
                    }
                  }}
                  onMouseLeave={() => setTooltip(null)}
                  style={{
                    default: { outline: "none" },
                    hover: {
                      fill: count > 0 ? "#1E40AF" : "#D1D5DB",
                      outline: "none",
                      cursor: count > 0 ? "pointer" : "default",
                    },
                    pressed: { outline: "none" },
                  }}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-gray-900 text-white text-xs rounded px-2 py-1 pointer-events-none shadow-lg"
          style={{ left: tooltip.x + 12, top: tooltip.y - 28 }}
        >
          {tooltip.name}: <span className="font-bold">{tooltip.count}</span>{" "}
          student{tooltip.count !== 1 ? "s" : ""}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-3 mt-3 flex-wrap text-xs text-gray-500">
        <span className="font-medium text-gray-700">Students:</span>
        {[
          { color: "#BFDBFE", label: "1-few" },
          { color: "#60A5FA", label: "some" },
          { color: "#3B82F6", label: "many" },
          { color: "#1D4ED8", label: "most" },
          { color: "#E5E7EB", label: "none" },
        ].map(({ color, label }) => (
          <span key={label} className="flex items-center gap-1">
            <span
              className="inline-block w-3 h-3 rounded-sm border border-gray-200"
              style={{ backgroundColor: color }}
            />
            {label}
          </span>
        ))}
      </div>

      {/* Country count table */}
      {Object.keys(countryCounts).length > 0 && (
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {Object.entries(countryCounts)
            .sort(([, a], [, b]) => b - a)
            .map(([country, count]) => (
              <div
                key={country}
                className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-1.5 text-sm"
              >
                <span className="text-gray-700 truncate mr-2">{country}</span>
                <span className="font-semibold text-blue-600 shrink-0">{count}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Dashboard
// ---------------------------------------------------------------------------
export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [selected, setSelected] = useState<CardKey | null>(null);
  const [mapMounted, setMapMounted] = useState(false);

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
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Delay map render to avoid SSR hydration mismatch
  useEffect(() => {
    setMapMounted(true);
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

  const zoomAttendedRate =
    stats && stats.onboardingSubmitted > 0
      ? Math.round((stats.zoomAttended / stats.onboardingSubmitted) * 100)
      : 0;

  const zoomNotAttendedRate =
    stats && stats.onboardingSubmitted > 0
      ? Math.round((stats.zoomNotAttended / stats.onboardingSubmitted) * 100)
      : 0;

  function toggleCard(key: CardKey) {
    setSelected((prev) => (prev === key ? null : key));
  }

  const zoomAttendedStudents = (stats?.studentShowUpRates ?? []).filter(
    (s) => s.sessionsAttended > 0
  );
  const zoomNotAttendedStudents = (stats?.studentShowUpRates ?? []).filter(
    (s) => s.sessionsAttended === 0
  );

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
    zoomAttended: {
      label: "Attended Zoom",
      count: zoomAttendedStudents.length,
      content: <ZoomAttendanceTable rows={zoomAttendedStudents} />,
    },
    zoomNotAttended: {
      label: "Not Attended Zoom",
      count: zoomNotAttendedStudents.length,
      content: <ZoomAttendanceTable rows={zoomNotAttendedStudents} />,
    },
  };

  const showUpRateData = stats?.studentShowUpRates ?? [];
  const chartHeight = Math.max(320, showUpRateData.length * 32);

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

      {/* Row 1 — Core Stat Cards */}
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

      {/* Row 2 — Zoom Attendance Cards (based on onboarding submitted) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <StatCard
          label="Attended Zoom"
          value={stats?.zoomAttended ?? 0}
          sub={
            stats?.totalZoomSessions
              ? `${zoomAttendedRate}% of submitted · ${stats.totalZoomSessions} session${stats.totalZoomSessions !== 1 ? "s" : ""} total`
              : "No zoom sessions recorded"
          }
          color="bg-blue-50 border-blue-100"
          active={selected === "zoomAttended"}
          onClick={() => toggleCard("zoomAttended")}
        />
        <StatCard
          label="Not Attended Zoom"
          value={stats?.zoomNotAttended ?? 0}
          sub={
            stats?.totalZoomSessions
              ? `${zoomNotAttendedRate}% never attended any session`
              : "No zoom sessions recorded"
          }
          color="bg-red-50 border-red-100"
          active={selected === "zoomNotAttended"}
          onClick={() => toggleCard("zoomNotAttended")}
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
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
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

      {/* ── Onboarding Submitted Section ── */}
      <div className="mb-2 mt-8">
        <h2 className="text-xl font-bold text-gray-800">
          Onboarding Submitted — Detailed Analytics
        </h2>
        <p className="text-sm text-gray-400 mt-0.5">
          The charts below are based on students who submitted onboarding
        </p>
      </div>

      {/* Show-up Rate Chart */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6 mt-4">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-semibold text-gray-800">
            Zoom Show-up Rate per Student
          </h3>
          {stats && stats.totalZoomSessions > 0 && (
            <span className="text-xs text-gray-400">
              {stats.totalZoomSessions} session{stats.totalZoomSessions !== 1 ? "s" : ""} total
            </span>
          )}
        </div>

        {stats?.totalZoomSessions === 0 ? (
          <p className="text-gray-400 text-sm py-8 text-center">
            No zoom sessions found. Add <code className="bg-gray-100 px-1 rounded">ZOOM_SPREADSHEET_ID</code> to your environment variables and share the sheet with your service account.
          </p>
        ) : showUpRateData.length === 0 ? (
          <p className="text-gray-400 text-sm py-8 text-center">No data available.</p>
        ) : (
          <>
            {/* Color legend */}
            <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-4">
              {[
                { color: "#22c55e", label: "≥ 80%" },
                { color: "#3b82f6", label: "60–79%" },
                { color: "#eab308", label: "40–59%" },
                { color: "#f97316", label: "20–39%" },
                { color: "#ef4444", label: "< 20%" },
              ].map(({ color, label }) => (
                <span key={label} className="flex items-center gap-1">
                  <span
                    className="inline-block w-3 h-3 rounded-sm"
                    style={{ backgroundColor: color }}
                  />
                  {label}
                </span>
              ))}
            </div>

            <div
              className="overflow-y-auto"
              style={{ maxHeight: Math.min(chartHeight, 480) }}
            >
              <ResponsiveContainer width="100%" height={chartHeight}>
                <BarChart
                  layout="vertical"
                  data={showUpRateData}
                  margin={{ left: 12, right: 48, top: 4, bottom: 4 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f0f0f0"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={160}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<ShowUpTooltip />} />
                  <Bar dataKey="rate" radius={[0, 4, 4, 0]} name="Show-up Rate">
                    {showUpRateData.map((entry, index) => (
                      <Cell key={index} fill={getBarColor(entry.rate)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>

      {/* World Map */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Student Locations
        </h3>

        {!mapMounted ? (
          <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
            Loading map…
          </div>
        ) : Object.keys(stats?.countryCounts ?? {}).length === 0 ? (
          <div className="text-gray-400 text-sm py-8 text-center">
            No country data found. Make sure the onboarding form has a column with
            &quot;country&quot; in its header.
          </div>
        ) : (
          <WorldMap countryCounts={stats?.countryCounts ?? {}} />
        )}
      </div>
    </main>
  );
}
