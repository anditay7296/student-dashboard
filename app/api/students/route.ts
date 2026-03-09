import { NextResponse } from "next/server";
import { getStudentListData, getOnboardingFormData } from "@/lib/sheets";
import { parse, format, isValid } from "date-fns";

function parseDate(raw: string): Date | null {
  if (!raw) return null;
  const formats = [
    "M/d/yyyy", "MM/dd/yyyy", "yyyy-MM-dd",
    "d/M/yyyy", "dd/MM/yyyy", "M-d-yyyy",
  ];
  for (const fmt of formats) {
    const d = parse(raw.trim(), fmt, new Date());
    if (isValid(d)) return d;
  }
  return null;
}

export async function GET() {
  try {
    const [studentRows, onboardingRows] = await Promise.all([
      getStudentListData(),
      getOnboardingFormData(),
    ]);

    // --- Onboarding Form: build lookup set by email/phone ---
    // Column AA = index 26, Column U = index 20, Column V = index 21
    // Column B (index 1) is typically the primary email in form responses
    const communityJoinedEmails = new Set<string>();
    const communityJoinedPhones = new Set<string>();

    for (let i = 1; i < onboardingRows.length; i++) {
      const row = onboardingRows[i];
      const joinedCommunity = row[26]; // Column AA
      if (!joinedCommunity || joinedCommunity.trim() === "") continue;

      // Collect all emails and phones from this row
      const email1 = (row[1] || "").toLowerCase().trim(); // Column B (primary email from form)
      const email2 = (row[20] || "").toLowerCase().trim(); // Column U
      const phone1 = (row[4] || "").trim(); // Column E (example, adjust if needed)
      const phone2 = (row[21] || "").trim(); // Column V

      if (email1) communityJoinedEmails.add(email1);
      if (email2) communityJoinedEmails.add(email2);
      if (phone1) communityJoinedPhones.add(phone1);
      if (phone2) communityJoinedPhones.add(phone2);
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
      communityJoined: communityJoinedEmails.size + communityJoinedPhones.size, // rough count
      dailySeries: cumulativeSeries,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
