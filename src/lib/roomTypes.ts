export const ROOM_TYPES: Record<string, { icon: string; color: string; label: string; svg?: string; svgDetail?: string }> = {
  "สถานบริการสาธารณสุข": { icon: "\u{1F3E5}", color: "#ef4444", label: "สาธารณสุข", svg: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="8" width="12" height="13" rx="1" fill="white" opacity="0.9"/><rect x="9" y="3" width="6" height="7" rx="1" fill="white"/><path d="M12 5v3M10.5 6.5h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><rect x="8" y="12" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.3"/><rect x="13" y="12" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.3"/><rect x="10" y="17" width="4" height="4" rx="0.5" fill="currentColor" opacity="0.5"/></svg>`, svgDetail: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="8" width="12" height="13" rx="1" fill="currentColor" opacity="0.15" stroke="currentColor" stroke-width="1"/><rect x="9" y="3" width="6" height="7" rx="1" fill="currentColor" opacity="0.2" stroke="currentColor" stroke-width="1"/><path d="M12 5v3M10.5 6.5h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><rect x="8" y="12" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.25"/><rect x="13" y="12" width="3" height="3" rx="0.5" fill="currentColor" opacity="0.25"/><rect x="10" y="17" width="4" height="4" rx="0.5" fill="currentColor" opacity="0.35"/></svg>` },
  "อาคารสำนักงาน": { icon: "\u{1F3E2}", color: "#2563eb", label: "สำนักงาน" },
  "ศูนย์ประชุม หอประชุม ห้องประชุม ศูนย์แสดงสินค้า": { icon: "\u{1F3EA}", color: "#7c3aed", label: "ศูนย์ประชุม" },
  "อาคารสถานพัฒนาเด็กปฐมวัย": { icon: "\u{1F476}", color: "#ec4899", label: "เด็กปฐมวัย" },
  "อาคารสถานศึกษา": { icon: "\u{1F3EB}", color: "#16a34a", label: "สถานศึกษา" },
  "อาคารสถานที่จำหน่ายอาหารและเครื่องดื่ม": { icon: "\u2615", color: "#92400e", label: "ร้านอาหาร/เครื่องดื่ม" },
  "อาคารศาสนสถาน": { icon: "\u{1F6D5}", color: "#ca8a04", label: "ศาสนสถาน" },
  "อาคารสถานบริการ ตามกฎหมายว่าด้วยสถานบริการ": { icon: "\u{1F3EC}", color: "#0891b2", label: "สถานบริการ" },
  "ที่พักอาศัย": { icon: "\u{1F3E0}", color: "#65a30d", label: "ที่พักอาศัย" },
  "หอสมุด หอศิลป์ พิพิธภัณฑสถาน": { icon: "\u{1F4DA}", color: "#78350f", label: "หอสมุด/พิพิธภัณฑ์" },
  "อาคารที่พักพิง clean air sheter": { icon: "\u{1F32C}\uFE0F", color: "#38bdf8", label: "Clean Air Shelter" },
  "อาคารห้างสรรพสินค้า ศูนย์การค้า ซูเปอร์มาร์เก็ต": { icon: "\u{1F6D2}", color: "#f97316", label: "ห้างสรรพสินค้า" },
};

export const DEFAULT_ROOM_TYPE: { icon: string; color: string; label: string; svg?: string; svgDetail?: string } = { icon: "\u{1F4CD}", color: "#6b7280", label: "อื่นๆ" };
