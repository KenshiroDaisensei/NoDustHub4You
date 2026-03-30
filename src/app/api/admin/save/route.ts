import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { CleanRoom } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rooms: CleanRoom[] = body.rooms;

    if (!Array.isArray(rooms)) {
      return NextResponse.json(
        { error: "ข้อมูลไม่ถูกต้อง: rooms ต้องเป็น array" },
        { status: 400 }
      );
    }

    const publicDir = path.join(process.cwd(), "public");
    const filePath = path.join(publicDir, "cleanrooms.json");

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: "ไม่พบไฟล์ cleanrooms.json" },
        { status: 404 }
      );
    }

    // Create backup with current date
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const backupPath = path.join(publicDir, `cleanrooms-backup-${dateStr}.json`);

    // Read current file and save as backup
    const currentData = fs.readFileSync(filePath, "utf-8");
    fs.writeFileSync(backupPath, currentData, "utf-8");

    // Write new data
    fs.writeFileSync(filePath, JSON.stringify(rooms, null, 2), "utf-8");

    return NextResponse.json({
      message: `บันทึกสำเร็จ (สำรองข้อมูลเดิมไว้ที่ cleanrooms-backup-${dateStr}.json)`,
      backupFile: `cleanrooms-backup-${dateStr}.json`,
      totalRooms: rooms.length,
    });
  } catch (error) {
    console.error("Save error:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการบันทึกข้อมูล" },
      { status: 500 }
    );
  }
}
