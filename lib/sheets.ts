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

  const sessions: string[] = [];
  const attendeeSessionMap: Record<string, string[]> = {};

  for (const sheetName of sheetNames) {
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: zoomId,
        range: `'${sheetName}'!A:H`,
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

      const header = rows[headerIdx];
      const emailCol = header.findIndex((h) =>
        h?.toLowerCase?.().includes("email")
      );
      if (emailCol < 0) continue;

      sessions.push(sheetName);

      for (let i = headerIdx + 1; i < rows.length; i++) {
        const email = (rows[i][emailCol] || "").trim().toLowerCase();
        if (email && email.includes("@")) {
          if (!attendeeSessionMap[email]) attendeeSessionMap[email] = [];
          if (!attendeeSessionMap[email].includes(sheetName)) {
            attendeeSessionMap[email].push(sheetName);
          }
        }
      }
    } catch {
      // skip sheets that error
    }
  }

  return { totalSessions: sessions.length, sessions, attendeeSessionMap };
}
