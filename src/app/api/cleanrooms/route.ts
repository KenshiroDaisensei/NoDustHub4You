import { NextResponse } from "next/server";
import type { CleanRoom } from "@/lib/types";
import { readFileSync } from "fs";
import { join } from "path";

const PROVINCE_IDS = [38, 39, 40, 41, 42, 43, 44, 45, 46];
const API_BASE = "https://podfoon.anamai.moph.go.th/api/cleanroom/province";
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

let cache: { data: CleanRoom[]; timestamp: number } | null = null;
let refreshing = false;

interface RawRecord {
  LocationName?: string;
  Province?: string;
  District?: string;
  Subdistrict?: string;
  Phone?: string;
  Latitude?: string;
  Longitude?: string;
  Type?: string;
  TypeAdd?: string;
  Service?: string;
  Capacity?: string | number;
  EvaluationResult?: string;
}

function isValidLatLng(lat: number, lng: number): boolean {
  return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0 &&
    lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

function loadLocalData(): CleanRoom[] {
  try {
    const filePath = join(process.cwd(), "public", "cleanrooms.json");
    return JSON.parse(readFileSync(filePath, "utf-8"));
  } catch {
    return [];
  }
}

async function fetchProvince(id: number): Promise<RawRecord[]> {
  try {
    const res = await fetch(`${API_BASE}/${id}`, {
      signal: AbortSignal.timeout(30000),
      cache: "no-store",
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

async function fetchAllProvinces(): Promise<CleanRoom[]> {
  const results = await Promise.all(PROVINCE_IDS.map(fetchProvince));
  const allRecords = results.flat();
  let id = 0;
  const cleanRooms: CleanRoom[] = [];
  for (const r of allRecords) {
    const lat = parseFloat(r.Latitude || "");
    const lng = parseFloat(r.Longitude || "");
    if (!isValidLatLng(lat, lng)) continue;
    id++;
    cleanRooms.push({
      id, name: r.LocationName || "", province: r.Province || "",
      district: r.District || "", subdistrict: r.Subdistrict || "",
      phone: r.Phone || "", lat, lng, type: r.Type || "",
      typeAdd: r.TypeAdd || "", service: r.Service || "",
      capacity: String(r.Capacity ?? ""), evaluationResult: r.EvaluationResult || "",
    });
  }
  return cleanRooms;
}

// Background refresh — update cache from API without blocking response
function backgroundRefresh() {
  if (refreshing) return;
  refreshing = true;
  fetchAllProvinces()
    .then((data) => {
      if (data.length > 0) {
        cache = { data, timestamp: Date.now() };
        console.log(`[cleanrooms] Background refresh: ${data.length} records from API`);
      }
    })
    .catch(() => {})
    .finally(() => { refreshing = false; });
}

export async function GET() {
  const now = Date.now();

  // 1. Memory cache still fresh → return immediately
  if (cache && now - cache.timestamp < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  // 2. No cache → load local file instantly, then refresh from API in background
  const localData = loadLocalData();
  if (localData.length > 0) {
    cache = { data: localData, timestamp: now };
    backgroundRefresh(); // update from API in background
    return NextResponse.json(localData);
  }

  // 3. No local file either → must wait for API (rare case)
  const data = await fetchAllProvinces();
  if (data.length > 0) {
    cache = { data, timestamp: now };
  }
  return NextResponse.json(data);
}
