import { NextResponse } from "next/server";
import { google } from "googleapis";
import { getDriveCache, setDriveCache } from "@/lib/driveCache";
import fs from "fs";
import path from "path";

// เปลี่ยนเป็น Spreadsheet ID ของคุณ (จาก URL: https://docs.google.com/spreadsheets/d/{ID}/edit)
// Sheet ต้องมี tab ชื่อ "cleanrooms"
const SPREADSHEET_ID = "";

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly", "https://www.googleapis.com/auth/drive.metadata.readonly"],
  });
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(current);
        current = "";
      } else if (ch === "\n" || (ch === "\r" && text[i + 1] === "\n")) {
        row.push(current);
        current = "";
        if (row.length > 1 || row[0] !== "") rows.push(row);
        row = [];
        if (ch === "\r") i++;
      } else {
        current += ch;
      }
    }
  }
  if (current || row.length > 0) {
    row.push(current);
    if (row.length > 1 || row[0] !== "") rows.push(row);
  }
  return rows;
}

function rowsToData(rows: string[][]) {
  const headers = rows[0];
  return rows.slice(1).map((row, idx) => {
    const obj: Record<string, unknown> = {};
    headers.forEach((h: string, i: number) => {
      const val = row[i] ?? "";
      if (h === "id") obj[h] = parseInt(val) || idx + 1;
      else if (h === "lat" || h === "lng") obj[h] = parseFloat(val) || 0;
      else obj[h] = val;
    });
    return obj;
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const withMeta = searchParams.get("meta") === "1";
  const fresh = searchParams.get("fresh") === "1";
  const source = searchParams.get("source"); // "csv" or null (default: sheets)

  if (!fresh) {
    const cached = getDriveCache();
    if (cached) {
      if (withMeta) {
        return NextResponse.json({ rows: cached.data, meta: cached.meta });
      }
      return NextResponse.json(cached.data);
    }
  }

  // --- CSV source: read from local file ---
  if (source === "csv") {
    try {
      const csvPath = path.join(process.cwd(), "public", "cleanrooms_001.csv");
      const text = fs.readFileSync(csvPath, "utf-8");
      const stat = fs.statSync(csvPath);
      const rows = parseCSV(text);

      const meta = {
        name: "cleanrooms_001.csv",
        modifiedTime: stat.mtime.toISOString(),
      };

      if (rows.length < 2) {
        setDriveCache([], meta);
        return NextResponse.json(withMeta ? { rows: [], meta } : []);
      }

      const data = rowsToData(rows);
      setDriveCache(data, meta);

      if (withMeta) {
        return NextResponse.json({ rows: data, meta });
      }
      return NextResponse.json(data);
    } catch (err) {
      console.error("CSV read error:", err);
      return NextResponse.json({ error: "Failed to read CSV file" }, { status: 500 });
    }
  }

  // --- Default: Google Sheets source (unchanged) ---
  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: "v4", auth });
    const drive = google.drive({ version: "v3", auth });

    const [sheetsRes, fileMeta] = await Promise.all([
      sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: "cleanrooms",
      }),
      drive.files.get({
        fileId: SPREADSHEET_ID,
        fields: "name,modifiedTime",
      }),
    ]);

    const rows = sheetsRes.data.values;
    const meta = {
      name: fileMeta.data.name ?? "",
      modifiedTime: fileMeta.data.modifiedTime ?? "",
    };

    if (!rows || rows.length < 2) {
      setDriveCache([], meta);
      return NextResponse.json(withMeta ? { rows: [], meta } : []);
    }

    const data = rowsToData(rows);
    setDriveCache(data, meta);

    if (withMeta) {
      return NextResponse.json({ rows: data, meta });
    }
    return NextResponse.json(data);
  } catch (err) {
    console.error("Sheets API error:", err);
    return NextResponse.json({ error: "Failed to fetch from Google Sheets" }, { status: 502 });
  }
}
