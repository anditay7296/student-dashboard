import { NextResponse } from "next/server";
import {
  getStudentListData,
  getOnboardingFormData,
  getZoomReportData,
} from "@/lib/sheets";
import { parse, format, isValid } from "date-fns";

function parseDate(raw: string): Date | null {
  if (!raw) return null;
  const s = raw.trim();

  const withYear = [
    "M/d/yyyy H:mm:ss", "M/d/yyyy HH:mm:ss", "M/d/yyyy H:mm", "M/d/yyyy HH:mm",
    "MM/dd/yyyy H:mm:ss", "MM/dd/yyyy HH:mm:ss",
    "d/M/yyyy H:mm:ss", "d/M/yyyy HH:mm:ss",
    "yyyy-MM-dd HH:mm:ss", "yyyy-MM-dd'T'HH:mm:ss",
    "M/d/yyyy", "MM/dd/yyyy", "yyyy-MM-dd", "d/M/yyyy", "dd/MM/yyyy", "M-d-yyyy",
    "d MMM yyyy", "dd MMM yyyy", "d MMM yyyy HH:mm:ss", "dd MMM yyyy HH:mm:ss",
    "d MMMM yyyy", "dd MMMM yyyy",
  ];
  for (const fmt of withYear) {
    const d = parse(s, fmt, new Date());
    if (isValid(d)) return d;
  }

  const withoutYear = ["MMM d HH:mm", "MMM dd HH:mm", "MMM d", "MMM dd"];
  const now = new Date();
  for (const fmt of withoutYear) {
    for (let y = now.getFullYear(); y >= now.getFullYear() - 3; y--) {
      const d = parse(s, fmt, new Date(y, 0, 1));
      if (isValid(d) && d <= now) return d;
    }
  }
  return null;
}

export async function GET() {
  try {
    const [studentRows, onboardingRows, zoomData] = await Promise.all([
      getStudentListData(),
      getOnboardingFormData(),
      getZoomReportData(),
    ]);

    // --- Onboarding Form: community not joined (col AA = "FALSE") ---
    const now = new Date();
    let communityNotJoined = 0;
    const communityNotJoinedList: {
      name: string;
      email: string;
      phone: string;
      date: string;
      leadDays: number | null;
    }[] = [];

    // Find country column from onboarding form header row
    const formHeaderRow = (onboardingRows[0] || []) as string[];
    const countryColIdx = formHeaderRow.findIndex(
      (h) => typeof h === "string" && h.toLowerCase().includes("country")
    );

    // Build email -> country map from onboarding form
    const emailToCountry: Record<string, string> = {};
    for (let i = 1; i < onboardingRows.length; i++) {
      const email = ((onboardingRows[i][6] || "") as string).trim().toLowerCase();
      const country =
        countryColIdx >= 0
          ? ((onboardingRows[i][countryColIdx] || "") as string).trim()
          : "";
      if (email && country) {
        emailToCountry[email] = country;
      }
    }

    for (let i = 1; i < onboardingRows.length; i++) {
      if ((onboardingRows[i][26] || "").trim().toUpperCase() === "FALSE") {
        communityNotJoined++;
        const formDate = parseDate(onboardingRows[i][0] || "");
        const leadDays = formDate
          ? Math.floor((now.getTime() - formDate.getTime()) / (1000 * 60 * 60 * 24))
          : null;
        communityNotJoinedList.push({
          name: (onboardingRows[i][1] || "").trim(),
          email: (onboardingRows[i][6] || "").trim(),
          phone: (onboardingRows[i][5] || "").trim(),
          date: (onboardingRows[i][0] || "").trim(),
          leadDays,
        });
      }
    }

    // --- Student List processing ---
    const dailyCounts: Record<string, number> = {};
    let totalStudents = 0;
    let onboardingSubmitted = 0;
    let latestDate: Date | null = null;

    const totalStudentsList: {
      name: string;
      email: string;
      phone: string;
      joinDate: string;
    }[] = [];
    const onboardingPendingList: {
      name: string;
      email: string;
      phone: string;
      joinDate: string;
    }[] = [];
    const onboardingSubmittedList: {
      name: string;
      email: string;
      phone: string;
      joinDate: string;
    }[] = [];

    for (let i = 1; i < studentRows.length; i++) {
      const row = studentRows[i];
      const rawDate = row[0] || "";
      const statusCol = (row[10] || "").trim();
      const onboardingCol = row[13] || "";

      if (!rawDate) continue;
      if (statusCol.toLowerCase() !== "active") continue;

      const date = parseDate(rawDate);
      if (!date) continue;

      const dateKey = format(date, "yyyy-MM-dd");
      dailyCounts[dateKey] = (dailyCounts[dateKey] || 0) + 1;
      totalStudents++;
      if (!latestDate || date > latestDate) latestDate = date;

      const entry = {
        name: (row[1] || "").trim(),
        email: (row[2] || "").trim(),
        phone: (row[3] || "").trim(),
        joinDate: dateKey,
      };
      totalStudentsList.push(entry);

      if (onboardingCol.trim() !== "" && onboardingCol.trim().toUpperCase() !== "NO") {
        onboardingSubmitted++;
        onboardingSubmittedList.push(entry);
      } else {
        onboardingPendingList.push(entry);
      }
    }

    // --- Zoom attendance cross-reference (onboarding submitted only) ---
    const { totalSessions: totalZoomSessions, attendeeSessionMap } = zoomData;

    let zoomAttended = 0;
    let zoomNotAttended = 0;
    const studentShowUpRates: {
      name: string;
      email: string;
      rate: number;
      sessionsAttended: number;
      totalSessions: number;
    }[] = [];

    for (const student of onboardingSubmittedList) {
      const emailLower = student.email.toLowerCase();
      const attended = (attendeeSessionMap[emailLower] || []).length;
      const rate =
        totalZoomSessions > 0
          ? Math.round((attended / totalZoomSessions) * 100)
          : 0;

      studentShowUpRates.push({
        name: student.name,
        email: student.email,
        rate,
        sessionsAttended: attended,
        totalSessions: totalZoomSessions,
      });

      if (attended > 0) {
        zoomAttended++;
      } else {
        zoomNotAttended++;
      }
    }

    // Sort by rate descending, then by name
    studentShowUpRates.sort(
      (a, b) => b.rate - a.rate || a.name.localeCompare(b.name)
    );

    // --- Country counts (from all onboarding form submissions) ---
    const countryCounts: Record<string, number> = {};
    for (let i = 1; i < onboardingRows.length; i++) {
      if (countryColIdx >= 0) {
        const country = ((onboardingRows[i][countryColIdx] || "") as string).trim();
        if (country) {
          countryCounts[country] = (countryCounts[country] || 0) + 1;
        }
      }
    }

    // Build sorted daily series
    const dailySeries = Object.entries(dailyCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    let cumulative = 0;
    const cumulativeSeries = dailySeries.map(({ date, count }) => {
      cumulative += count;
      return { date, count, total: cumulative };
    });

    const headlineStart = "May 22, 2024";
    const headlineDate =
      headlineStart && latestDate
        ? `${headlineStart} — ${format(latestDate, "MMM d, yyyy")}`
        : headlineStart;

    return NextResponse.json({
      totalStudents,
      onboardingSubmitted,
      onboardingPending: totalStudents - onboardingSubmitted,
      communityNotJoined,
      headlineDate,
      totalStudentsList,
      onboardingPendingList,
      onboardingSubmittedList,
      communityNotJoinedList,
      dailySeries: cumulativeSeries,
      // Zoom attendance
      zoomAttended,
      zoomNotAttended,
      totalZoomSessions,
      studentShowUpRates,
      // Country distribution
      countryCounts,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
