import { NextResponse } from "next/server";
import { getStudentListData, getOnboardingFormData } from "@/lib/sheets";
import { parse, format, isValid } from "date-fns";

function parseDate(raw: string): Date | null {
  if (!raw) return null;
  const s = raw.trim();

  // Formats that include year
  const withYear = ["M/d/yyyy", "MM/dd/yyyy", "yyyy-MM-dd", "d/M/yyyy", "dd/MM/yyyy", "M-d-yyyy"];
  for (const fmt of withYear) {
    const d = parse(s, fmt, new Date());
    if (isValid(d)) return d;
  }

  // Formats WITHOUT year (e.g. "May 22 00:00") — try current year down to 3 years ago
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
    const [studentRows, onboardingRows] = await Promise.all([
      getStudentListData(),
      getOnboardingFormData(),
    ]);

    // --- Onboarding Form: count rows where col AA = "TRUE" (Joined Skool) ---
    let communityJoined = 0;
    for (let i = 1; i < onboardingRows.length; i++) {
      if ((onboardingRows[i][26] || "").trim() === "TRUE") communityJoined++;
    }

    // --- Student List processing ---
    // Col A (0) = paid date, Col N (13) = onboarding form submitted
    // Skip header row (index 0)
    const dailyCounts: Record<string, number> = {};
    let totalStudents = 0;
    let onboardingSubmitted = 0;

    for (let i = 1; i < studentRows.length; i++) {
      const row = studentRows[i];
      const rawDate = row[0] || "";
      const onboardingCol = row[13] || ""; // Column N

      if (!rawDate) continue;

      const date = parseDate(rawDate);
      if (!date) continue;

      const dateKey = format(date, "yyyy-MM-dd");
      dailyCounts[dateKey] = (dailyCounts[dateKey] || 0) + 1;
      totalStudents++;

      if (onboardingCol.trim() !== "") {
        onboardingSubmitted++;
      }
    }

    // Build sorted daily series
    const dailySeries = Object.entries(dailyCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    // Cumulative series
    let cumulative = 0;
    const cumulativeSeries = dailySeries.map(({ date, count }) => {
      cumulative += count;
      return { date, count, total: cumulative };
    });

    return NextResponse.json({
      totalStudents,
      onboardingSubmitted,
      onboardingPending: totalStudents - onboardingSubmitted,
      communityJoined,
      dailySeries: cumulativeSeries,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
