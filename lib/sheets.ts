import { google } from "googleapis";

const SPREADSHEET_ID = process.env.SPREADSHEET_ID!;

function getAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!);
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
}

export async function getStudentListData() {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "Student List!A:N",
  });

  return response.data.values || [];
}

export async function getOnboardingFormData() {
  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "Onboarding Form!A:AZ",
  });

  return response.data.values || [];
}

/** Normalise a raw date/datetime string to "YYYY-MM-DD" for deduplication. */
function normaliseDate(raw: string): string | null {
  if (!raw) return null;
  const s = raw.trim();
  // ISO / yyyy-mm-dd (with or without time)
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso) return iso[1];
  // M/D/YYYY or MM/DD/YYYY or DD/MM/YYYY — treat first number as month if <= 12
  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slash) {
    const [, a, b, y] = slash;
    const m = a.padStart(2, "0");
    const d = b.padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  // D-M-YYYY or M-D-YYYY with dashes
  const dash = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})/);
  if (dash) {
    const [, a, b, y] = dash;
    return `${y}-${a.padStart(2, "0")}-${b.padStart(2, "0")}`;
  }
  return null;
}

export async function getZoomReportData(): Promise<{
  totalSessions: number;
  sessions: string[];
  attendeeSessionMap: Record<string, string[]>;
}> {
  const zoomId = process.env.ZOOM_SPREADSHEET_ID;
  if (!zoomId) return { totalSessions: 0, sessions: [], attendeeSessionMap: {} };

  const auth = getAuth();
  const sheets = google.sheets({ version: "v4", auth });

  let sheetNames: string[] = [];
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId: zoomId });
    sheetNames = (meta.data.sheets || [])
      .map((s) => s.properties?.title || "")
      .filter(Boolean);
  } catch {
    return { totalSessions: 0, sessions: [], attendeeSessionMap: {} };
  }

  // email -> Set of session identifiers (unique dates or sheet names)
  const attendeeMap: Record<string, Set<string>> = {};
  const uniqueSessions = new Set<string>();

  for (const sheetName of sheetNames) {
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: zoomId,
        range: `'${sheetName}'!A:Z`,
      });
      const rows = (response.data.values || []) as string[][];
      if (rows.length < 2) continue;

      // Find header row — scan first 10 rows for an "email" column
      let headerIdx = -1;
      for (let i = 0; i < Math.min(10, rows.length); i++) {
        if (rows[i].some((cell) => cell?.toLowerCase?.().includes("email"))) {
          headerIdx = i;
          break;
        }
      }
      if (headerIdx < 0) continue;

      const header = rows[headerIdx] as string[];

      const emailCol = header.findIndex((h) =>
        h?.toLowerCase?.().includes("email")
      );
      if (emailCol < 0) continue;

      // Look for a date column (header containing "date" or "time")
      const dateCol = header.findIndex((h) =>
        h?.toLowerCase?.().includes("date") ||
        h?.toLowerCase?.().includes("join time") ||
        h?.toLowerCase?.().includes("session")
      );

      for (let i = headerIdx + 1; i < rows.length; i++) {
        const email = (rows[i][emailCol] || "").trim().toLowerCase();
        if (!email || !email.includes("@")) continue;

        // Determine session identifier: prefer a normalised date, fall back to sheet name
        let sessionId = sheetName;
        if (dateCol >= 0) {
          const raw = (rows[i][dateCol] || "").trim();
          const nd = normaliseDate(raw);
          if (nd) sessionId = nd;
        }

        uniqueSessions.add(sessionId);
        if (!attendeeMap[email]) attendeeMap[email] = new Set();
        attendeeMap[email].add(sessionId);
      }
    } catch {
      // skip sheets that error
    }
  }

  const sessions = [...uniqueSessions].sort();
  const attendeeSessionMap: Record<string, string[]> = {};
  for (const [email, set] of Object.entries(attendeeMap)) {
    attendeeSessionMap[email] = [...set].sort();
  }

  return { totalSessions: sessions.length, sessions, attendeeSessionMap };
}
