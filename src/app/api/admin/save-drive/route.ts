import { NextResponse } from "next/server";
import { google } from "googleapis";
import { Readable } from "stream";
import { join } from "path";
import { clearDriveCache } from "@/lib/driveCache";

const FILE_ID = "1LzljXu0eiI7Dtq_rYjC5vAL67Hop2xC9";

export async function POST(request: Request) {
  try {
    const { rooms } = await request.json();
    if (!Array.isArray(rooms) || rooms.length === 0) {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const keyPath = join(process.cwd(), "service-account-key.json");
    const auth = new google.auth.GoogleAuth({
      keyFile: keyPath,
      scopes: ["https://www.googleapis.com/auth/drive"],
    });

    const drive = google.drive({ version: "v3", auth });

    const jsonStr = JSON.stringify(rooms, null, 2);
    const stream = Readable.from([jsonStr]);

    await drive.files.update({
      fileId: FILE_ID,
      media: {
        mimeType: "application/json",
        body: stream,
      },
    });

    clearDriveCache();

    return NextResponse.json({
      success: true,
      message: `บันทึกสำเร็จ — อัพเดท ${rooms.length} records บน Google Drive`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[save-drive] Error:", message);
    return NextResponse.json({ error: `บันทึกล้มเหลว: ${message}` }, { status: 500 });
  }
}
