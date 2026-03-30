"use client";

import dynamic from "next/dynamic";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { ROOM_TYPES, DEFAULT_ROOM_TYPE } from "@/lib/roomTypes";
import type { CleanRoom } from "@/lib/types";

const LeafletMap = dynamic(() => import("@/components/Map"), { ssr: false });

const CHIANG_MAI_CENTER: [number, number] = [18.787, 98.993];
const DEFAULT_ZOOM = 12;
const FLY_ZOOM = 14;
// const PROVINCE_ZOOM = 11; // kept for future use

/* ===== Haversine distance (km) ===== */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ===== Near-me search radii (km) ===== */
const NEAR_ME_RADII = [1, 2, 3, 5, 10, 20];
const MAX_PULSE_RINGS = 20;

/* Province data — kept for future use */
// const PROVINCES: { name: string; lat: number; lng: number }[] = [
//   { name: "เชียงใหม่", lat: 18.837, lng: 98.971 },
//   { name: "เชียงราย", lat: 19.921, lng: 99.814 },
//   { name: "ลำพูน", lat: 18.578, lng: 99.007 },
//   { name: "ลำปาง", lat: 18.258, lng: 99.544 },
//   { name: "แพร่", lat: 18.142, lng: 100.143 },
//   { name: "น่าน", lat: 18.776, lng: 100.774 },
//   { name: "พะเยา", lat: 19.402, lng: 99.775 },
//   { name: "แม่ฮ่องสอน", lat: 19.289, lng: 97.966 },
// ];

/* ===== UI Sub-components ===== */

function RoomSearch({ value, onChange, onClear, rooms, onRoomClick }: {
  value: string;
  onChange: (v: string) => void;
  onClear: () => void;
  rooms: CleanRoom[];
  onRoomClick: (room: CleanRoom) => void;
}) {
  const [focused, setFocused] = useState(false);
  const suggestions = useMemo(() => {
    if (!value.trim()) return [];
    const q = value.trim().toLowerCase();
    return rooms.filter((r) =>
      r.name.toLowerCase().includes(q) ||
      r.province.toLowerCase().includes(q) ||
      r.district?.toLowerCase().includes(q) ||
      r.subdistrict?.toLowerCase().includes(q) ||
      r.type.toLowerCase().includes(q) ||
      r.typeAdd?.toLowerCase().includes(q)
    );
  }, [value, rooms]);

  return (
    <div className="room-search">
      <input
        className="room-search-input"
        type="text"
        placeholder="ค้นหาชื่อ, จังหวัด, ประเภท..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 200)}
      />
      {value && (
        <button className="room-search-clear" onClick={onClear}>&times;</button>
      )}
      {focused && suggestions.length > 0 && (
        <div className="room-search-dropdown">
          {suggestions.map((r) => (
            <button
              key={r.id}
              className="room-search-item"
              onMouseDown={() => {
                onRoomClick(r);
                onChange(r.name);
                setFocused(false);
              }}
            >
              <span className="room-search-item-name">{r.name}</span>
              <span className="room-search-item-sub">{r.district} · {r.province}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TypeFilter({ activeTypes, onToggle }: { activeTypes: Set<string>; onToggle: (type: string) => void }) {
  const allTypes = Object.entries(ROOM_TYPES);
  const allActive = activeTypes.size === 0;

  return (
    <div className="type-filter">
      <button
        className={`filter-chip ${allActive ? "filter-active" : ""}`}
        onClick={() => onToggle("__all__")}
      >
        ทั้งหมด
      </button>
      {allTypes.map(([key, val]) => (
        <button
          key={key}
          className={`filter-chip ${activeTypes.has(key) ? "filter-active" : ""}`}
          onClick={() => onToggle(key)}
        >
          {val.icon} {val.label}
        </button>
      ))}
    </div>
  );
}

function DetailPanel({ room, onClose, distance }: { room: CleanRoom; onClose: () => void; distance?: number }) {
  const config = ROOM_TYPES[room.type] || DEFAULT_ROOM_TYPE;
  const navUrl = `https://maps.google.com/?daddr=${room.lat},${room.lng}`;

  const address = [
    room.subdistrict && `ต.${room.subdistrict}`,
    room.district && `อ.${room.district}`,
    `จ.${room.province}`,
  ].filter(Boolean).join("  ");

  return (
    <div className="detail-panel">
      <button className="detail-close" onClick={onClose}>&times;</button>

      {/* Hero */}
      <div className="detail-hero" style={{ background: `linear-gradient(135deg, ${config.color}, ${config.color}cc)` }}>
        {config.svgDetail
          ? <span className="detail-hero-icon detail-hero-svg" style={{ color: config.color }} dangerouslySetInnerHTML={{ __html: config.svgDetail }} />
          : <span className="detail-hero-icon">{config.icon}</span>
        }
        <span className="detail-hero-type">{room.typeAdd || config.label}</span>
      </div>

      {/* Title */}
      <div className="detail-title-section">
        <div className="detail-name-row">
          <span className="detail-id-circle">{room.id}</span>
          <h2 className="detail-name">{room.name}</h2>
        </div>
        {room.evaluationResult && (
          <span className={`detail-badge ${room.evaluationResult === "ผ่าน" ? "badge-pass" : "badge-fail"}`}>
            {room.evaluationResult === "ผ่าน" ? "ผ่านประเมิน" : room.evaluationResult}
          </span>
        )}
      </div>

      {/* Service Group */}
      {(room.service || room.capacity) && (
        <div className="detail-group">
          {room.service && (
            <div className="detail-card">
              <div className="detail-card-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              </div>
              <div className="detail-card-content">
                <span className="detail-card-label">บริการ</span>
                <span className="detail-card-value">{room.service}</span>
              </div>
            </div>
          )}
          {room.capacity && (
            <div className="detail-card">
              <div className="detail-card-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
              </div>
              <div className="detail-card-content">
                <span className="detail-card-label">ความจุ</span>
                <span className="detail-card-value">{room.capacity} คน</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Contact Group */}
      <div className="detail-group">
        <div className="detail-card">
          <div className="detail-card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
          <div className="detail-card-content">
            <span className="detail-card-label">ที่อยู่</span>
            <span className="detail-card-value">{address}</span>
          </div>
        </div>
        {room.phone && (
          <div className="detail-card">
            <div className="detail-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
            </div>
            <div className="detail-card-content">
              <span className="detail-card-label">โทรศัพท์</span>
              <a className="detail-card-value detail-card-link" href={`tel:${room.phone}`}>{room.phone}</a>
            </div>
          </div>
        )}
      </div>

      {/* Distance from user */}
      {distance !== undefined && (
        <div className="detail-group">
          <div className="detail-card">
            <div className="detail-card-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <div className="detail-card-content">
              <span className="detail-card-label">ระยะห่างจากคุณ</span>
              <span className="detail-card-value">{distance.toFixed(1)} กม.</span>
            </div>
          </div>
        </div>
      )}

      {/* Nav Button */}
      <a className="detail-nav-btn" href={navUrl} target="_blank" rel="noopener noreferrer">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="3 11 22 2 13 21 11 13 3 11" />
        </svg>
        นำทางด้วย Google Maps
      </a>
    </div>
  );
}

function ArrivalBanner({ name }: { name: string }) {
  if (!name) return null;
  return (
    <div className="arrival-overlay">
      <div className="arrival-text">{name}</div>
    </div>
  );
}

function NearMeBanner({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div className="nearme-banner">
      <div className="nearme-banner-text">{text}</div>
    </div>
  );
}

/* ===== Main Page ===== */

export default function Home() {
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);
  const [flyTarget, setFlyTarget] = useState<{ pos: [number, number]; zoom: number; key: number } | null>(null);
  const [zoomAction, setZoomAction] = useState<{ dir: "in" | "out"; key: number } | null>(null);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [rooms, setRooms] = useState<CleanRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<"sheets" | "csv">("csv");
  const [dataDate, setDataDate] = useState("");
  const [selectedRoom, setSelectedRoom] = useState<CleanRoom | null>(null);
  const [arrivalName, /* setArrivalName */] = useState("");
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set());
  const [showPassOnly, setShowPassOnly] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [provincesGeo, setProvincesGeo] = useState<any>(null);
  // const arrivalTimer = useRef<ReturnType<typeof setTimeout>>(undefined); // kept for future use
  // const arrivalDelay = useRef<ReturnType<typeof setTimeout>>(undefined); // kept for future use

  // Near-me state
  const [nearMeActive, setNearMeActive] = useState(false);
  const [nearMeBanner, setNearMeBanner] = useState("");
  const [nearMeBounds, setNearMeBounds] = useState<[[number, number], [number, number]] | null>(null);
  const [highlightRooms, setHighlightRooms] = useState<{ pos: [number, number]; tier: "near" | "mid" | "far" }[]>([]);
  const [distanceMap, setDistanceMap] = useState<Map<number, number>>(new Map());
  const nearMeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    fetch("/northern-provinces.json")
      .then((res) => res.json())
      .then((data) => setProvincesGeo(data))
      .catch((err) => console.error("Failed to load province boundaries:", err));
  }, []);

  const fetchRooms = useCallback((fresh = false) => {
    setLoading(true);
    const sourceParam = dataSource === "csv" ? "&source=csv" : "";
    const url = `/api/drive?meta=1${fresh ? "&fresh=1" : ""}${sourceParam}`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.rows)) setRooms(data.rows);
        if (data.meta) {
          setDataDate(new Date(data.meta.modifiedTime).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" }));
        }
      })
      .catch((err) => console.error("Failed to load cleanroom data:", err))
      .finally(() => setLoading(false));
  }, [dataSource]);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  const clearNearMe = useCallback(() => {
    setNearMeActive(false);
    setHighlightRooms([]);
    setDistanceMap(new Map());
    setNearMeBounds(null);
    setNearMeBanner("");
  }, []);

  const handleMapClick = useCallback((latlng: [number, number]) => {
    setUserPosition(latlng);
    setFlyTarget({ pos: latlng, zoom: FLY_ZOOM, key: Date.now() });
    setSelectedRoom(null);
    clearNearMe();
  }, [clearNearMe]);

  const handleRoomSelect = useCallback((room: CleanRoom) => {
    setSelectedRoom(room);
    if (distanceMap.size > 0 && !distanceMap.has(room.id)) {
      clearNearMe();
    }
  }, [distanceMap, clearNearMe]);

  /* Province select — kept for future use */
  // const handleProvinceSelect = useCallback((province: { name: string; lat: number; lng: number }) => {
  //   setFlyTarget({ pos: [province.lat, province.lng], zoom: PROVINCE_ZOOM, key: Date.now() });
  //   setSelectedRoom(null);
  //   clearNearMe();
  //   if (arrivalTimer.current) clearTimeout(arrivalTimer.current);
  //   if (arrivalDelay.current) clearTimeout(arrivalDelay.current);
  //   arrivalDelay.current = setTimeout(() => {
  //     setArrivalName(province.name);
  //     arrivalTimer.current = setTimeout(() => setArrivalName(""), 2500);
  //   }, 1000);
  // }, [clearNearMe]);

  const handleTypeToggle = useCallback((type: string) => {
    if (type === "__all__") {
      setActiveTypes(new Set());
    } else {
      setActiveTypes((prev) => {
        const next = new Set(prev);
        if (next.has(type)) next.delete(type);
        else next.add(type);
        return next;
      });
    }
  }, []);

  const filteredRooms = useMemo(() => {
    let result = rooms;
    if (showPassOnly) result = result.filter((r) => r.evaluationResult === "ผ่าน");
    if (activeTypes.size > 0) result = result.filter((r) => activeTypes.has(r.type));
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((r) =>
        r.name.toLowerCase().includes(q) ||
        r.province.toLowerCase().includes(q) ||
        r.district?.toLowerCase().includes(q) ||
        r.subdistrict?.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q) ||
        r.typeAdd?.toLowerCase().includes(q) ||
        r.service?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [rooms, activeTypes, showPassOnly, searchQuery]);

  const handleNearMe = useCallback(() => {
    setSelectedRoom(null);
    if (!navigator.geolocation) {
      setNearMeBanner("เบราว์เซอร์ไม่รองรับ GPS");
      if (nearMeTimer.current) clearTimeout(nearMeTimer.current);
      nearMeTimer.current = setTimeout(() => setNearMeBanner(""), 3000);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const uLat = pos.coords.latitude;
        const uLng = pos.coords.longitude;
        setUserPosition([uLat, uLng]);

        // Compute distances to all rooms
        const distances = filteredRooms.map((r) => ({
          room: r,
          dist: haversineKm(uLat, uLng, r.lat, r.lng),
        }));
        distances.sort((a, b) => a.dist - b.dist);

        // Expanding radius: stop at first hit, then expand 1 more step
        let firstRadius = 0;
        let finalRadius = 0;
        for (let i = 0; i < NEAR_ME_RADII.length; i++) {
          const inThisRadius = distances.filter((d) => d.dist <= NEAR_ME_RADII[i]);
          if (inThisRadius.length > 0 && firstRadius === 0) {
            firstRadius = NEAR_ME_RADII[i];
            // Expand 1 more step if possible
            finalRadius = NEAR_ME_RADII[Math.min(i + 1, NEAR_ME_RADII.length - 1)];
            break;
          }
        }

        const foundRooms = finalRadius > 0 ? distances.filter((d) => d.dist <= finalRadius) : [];

        if (foundRooms.length === 0) {
          setNearMeBanner("ไม่พบห้องหลบฝุ่นใกล้เคียง");
          setFlyTarget({ pos: [uLat, uLng], zoom: FLY_ZOOM, key: Date.now() });
          setHighlightRooms([]);
          setDistanceMap(new Map());
        } else {
          // Build distance map for tooltips
          const dMap = new Map<number, number>();
          foundRooms.forEach((d) => dMap.set(d.room.id, d.dist));
          setDistanceMap(dMap);

          // Assign tiers: near (≤1/3), mid (≤2/3), far (rest) — limit to nearest N
          const third = finalRadius / 3;
          const pulseRooms = foundRooms.slice(0, MAX_PULSE_RINGS);
          const highlights = pulseRooms.map((d) => ({
            pos: [d.room.lat, d.room.lng] as [number, number],
            tier: (d.dist <= third ? "near" : d.dist <= third * 2 ? "mid" : "far") as "near" | "mid" | "far",
          }));
          setHighlightRooms(highlights);

          // Build bounds: user + all found rooms
          const points: [number, number][] = [[uLat, uLng], ...foundRooms.map((d) => [d.room.lat, d.room.lng] as [number, number])];
          const lats = points.map((p) => p[0]);
          const lngs = points.map((p) => p[1]);
          setNearMeBounds([[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]]);

          setNearMeActive(true);
          setNearMeBanner(`พบ ${foundRooms.length} ห้องในรัศมี ${finalRadius} กม.`);
        }

        // Auto-hide banner after 3s
        if (nearMeTimer.current) clearTimeout(nearMeTimer.current);
        nearMeTimer.current = setTimeout(() => setNearMeBanner(""), 3000);
      },
      (err) => {
        const msgs: Record<number, string> = {
          1: "ผู้ใช้ปฏิเสธสิทธิ์ตำแหน่ง (Permission denied)",
          2: "ไม่สามารถระบุตำแหน่งได้ (Position unavailable)",
          3: "หมดเวลาระบุตำแหน่ง (Timeout)",
        };
        setNearMeBanner(msgs[err.code] || `ไม่สามารถระบุตำแหน่งได้ (${err.message})`);
        if (nearMeTimer.current) clearTimeout(nearMeTimer.current);
        nearMeTimer.current = setTimeout(() => setNearMeBanner(""), 5000);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [filteredRooms]);

  const handleClusterClick = useCallback(() => setSelectedRoom(null), []);

  return (
    <main className="relative w-screen h-screen overflow-hidden">
      {/* Map fills screen */}
      <div className="absolute inset-0">
        <LeafletMap
          rooms={filteredRooms}
          flyTarget={flyTarget}
          zoomAction={zoomAction}
          fitBounds={nearMeBounds}
          userPosition={userPosition}
          highlightRooms={highlightRooms}
          distanceMap={distanceMap}
          zoom={zoom}
          provincesGeo={provincesGeo}
          center={CHIANG_MAI_CENTER}
          defaultZoom={DEFAULT_ZOOM}
          onMapClick={handleMapClick}
          onRoomSelect={handleRoomSelect}
          onClusterClick={handleClusterClick}
          onZoomChange={setZoom}
        />
      </div>

      {/* UI overlays -- render immediately, no dynamic import needed */}
      <RoomSearch
        value={searchQuery}
        onChange={setSearchQuery}
        onClear={() => setSearchQuery("")}
        rooms={filteredRooms}
        onRoomClick={(room) => {
          setFlyTarget({ pos: [room.lat, room.lng], zoom: 16, key: Date.now() });
          setSelectedRoom(room);
        }}
      />
      <TypeFilter activeTypes={activeTypes} onToggle={handleTypeToggle} />

      <button
        className={`eval-toggle-btn ${showPassOnly ? "eval-pass-only" : "eval-show-all"}`}
        onClick={() => setShowPassOnly((v) => !v)}
      >
        {showPassOnly ? "✓ เฉพาะผ่านประเมิน" : "ทั้งหมด"}
      </button>

      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <span className="loading-text">กำลังโหลดข้อมูล...</span>
        </div>
      )}

      <div className="data-source-bar">
        {/* Toggle buttons — uncomment to enable data source switching
        <button
          className="source-toggle-btn source-csv"
          disabled
        >
          📁 CSV ในเครื่อง
        </button>
        <button
          className="source-toggle-btn source-disabled"
          disabled
          title="ยังไม่ได้ตั้งค่า Google Sheets — ดู .env.local.example"
        >
          📊 Google Sheets (ยังไม่ได้ตั้งค่า)
        </button>
        */}
        <button
          className="source-refresh-btn"
          onClick={() => fetchRooms(true)}
          disabled={loading}
        >
          {loading ? "..." : "🔄"}
        </button>
        <span className="source-date">
          CSV file
        </span>
      </div>

      <div className="zoom-control">
        <button className="zoom-btn" onClick={() => setZoomAction({ dir: "in", key: Date.now() })}>+</button>
        <span className="zoom-level">{zoom}</span>
        <button className="zoom-btn" onClick={() => setZoomAction({ dir: "out", key: Date.now() })}>-</button>
      </div>

      <button className={`nearme-btn ${nearMeActive ? "nearme-active" : ""}`} onClick={handleNearMe}>
        <span className="nearme-bg-icon">🏠</span>
        <span className="nearme-front-icon">📍</span>
        <span className="nearme-label">ใกล้ฉัน</span>
      </button>

      {selectedRoom && (
        <DetailPanel room={selectedRoom} onClose={() => setSelectedRoom(null)} distance={distanceMap.get(selectedRoom.id)} />
      )}

      <ArrivalBanner name={arrivalName} />
      <NearMeBanner text={nearMeBanner} />
    </main>
  );
}
