"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { CleanRoom } from "@/lib/types";
import { ROOM_TYPES, DEFAULT_ROOM_TYPE } from "@/lib/roomTypes";

const PROVINCES = [
  "เชียงใหม่",
  "เชียงราย",
  "ลำพูน",
  "ลำปาง",
  "แพร่",
  "น่าน",
  "พะเยา",
  "แม่ฮ่องสอน",
];

type Tab = "edit" | "review";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>("edit");
  const [province, setProvince] = useState("เชียงใหม่");
  const [allRooms, setAllRooms] = useState<CleanRoom[]>([]);
  const [editedRooms, setEditedRooms] = useState<Map<number, CleanRoom>>(new Map());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [sheetMeta, setSheetMeta] = useState<{ name: string; modifiedTime: string } | null>(null);
  const PAGE_SIZE = 50;

  const fetchData = useCallback((fresh = false) => {
    setLoading(true);
    fetch(`/api/drive?meta=1${fresh ? "&fresh=1" : ""}`)
      .then((res) => res.json())
      .then((data: { rows: CleanRoom[]; meta: { name: string; modifiedTime: string } | null }) => {
        setAllRooms(data.rows);
        if (data.meta) setSheetMeta(data.meta);
        setLoading(false);
        if (fresh) setMessage({ type: "success", text: "รีเฟรชข้อมูลสำเร็จ" });
      })
      .catch(() => {
        setMessage({ type: "error", text: "ไม่สามารถโหลดข้อมูลได้" });
        setLoading(false);
      });
  }, []);

  // Load data on mount
  useEffect(() => { fetchData(); }, [fetchData]);

  // Filter by province + search
  const filteredRooms = useMemo(() => {
    let rooms = allRooms.filter((r) => r.province === province);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rooms = rooms.filter((r) =>
        r.name.toLowerCase().includes(q) ||
        r.service?.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q)
      );
    }
    return rooms;
  }, [allRooms, province, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRooms.length / PAGE_SIZE));
  const pagedRooms = filteredRooms.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Get the current value of a room (edited or original)
  const getRoomValue = useCallback(
    (room: CleanRoom): CleanRoom => {
      return editedRooms.get(room.id) ?? room;
    },
    [editedRooms]
  );

  // Handle field change for a room being edited
  const handleFieldChange = (roomId: number, field: keyof CleanRoom, value: string) => {
    const original = allRooms.find((r) => r.id === roomId);
    if (!original) return;

    const current = editedRooms.get(roomId) ?? { ...original };
    const updated = { ...current, [field]: value };

    // For lat/lng, parse as number
    if (field === "lat" || field === "lng") {
      (updated as Record<string, unknown>)[field] = value;
    }

    setEditedRooms((prev) => {
      const next = new Map(prev);
      next.set(roomId, updated as CleanRoom);
      return next;
    });
  };

  // Save all changes
  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    // Merge edits into allRooms
    const updatedRooms = allRooms.map((room) => {
      const edited = editedRooms.get(room.id);
      if (!edited) return room;
      return {
        ...edited,
        lat: typeof edited.lat === "string" ? parseFloat(edited.lat as unknown as string) || room.lat : edited.lat,
        lng: typeof edited.lng === "string" ? parseFloat(edited.lng as unknown as string) || room.lng : edited.lng,
      };
    });

    try {
      const res = await fetch("/api/admin/save-drive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rooms: updatedRooms }),
      });

      const result = await res.json();

      if (res.ok) {
        setAllRooms(updatedRooms);
        setEditedRooms(new Map());
        setEditingId(null);
        setMessage({ type: "success", text: result.message || "บันทึกสำเร็จ" });
      } else {
        setMessage({ type: "error", text: result.error || "เกิดข้อผิดพลาดในการบันทึก" });
      }
    } catch {
      setMessage({ type: "error", text: "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้" });
    }

    setSaving(false);
  };

  // Get type label
  const getTypeLabel = (type: string) => {
    const info = ROOM_TYPES[type] ?? DEFAULT_ROOM_TYPE;
    return `${info.icon} ${info.label}`;
  };

  // Get list of unique types for dropdown
  const allTypes = Object.keys(ROOM_TYPES);

  return (
    <div className="admin-page">
      <header className="admin-header">
        <h1>NoDustHub Admin</h1>
        <p>ระบบจัดการข้อมูลห้องปลอดฝุ่น</p>
        {sheetMeta && (
          <p className="admin-sheet-meta">
            📄 {sheetMeta.name} — แก้ไขล่าสุด: {new Date(sheetMeta.modifiedTime).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}
            <button className="admin-refresh-btn" onClick={() => fetchData(true)} disabled={loading}>
              {loading ? "กำลังโหลด..." : "🔄 รีเฟรช"}
            </button>
          </p>
        )}
      </header>

      {/* Tabs */}
      <div className="admin-tabs">
        <button
          className={`admin-tab ${activeTab === "edit" ? "admin-tab-active" : ""}`}
          onClick={() => setActiveTab("edit")}
        >
          แก้ไขข้อมูลสถานที่
        </button>
        <button
          className={`admin-tab ${activeTab === "review" ? "admin-tab-active" : ""}`}
          onClick={() => setActiveTab("review")}
        >
          พิจารณาห้องปลอดฝุ่นห้องใหม่
        </button>
      </div>

      {/* Tab Content */}
      <div className="admin-content">
        {activeTab === "review" && (
          <div className="admin-placeholder">
            <p>เร็วๆ นี้</p>
          </div>
        )}

        {activeTab === "edit" && (
          <>
            {/* Controls Bar */}
            <div className="admin-controls">
              <div className="admin-controls-left">
                <label htmlFor="province-select">จังหวัด:</label>
                <select
                  id="province-select"
                  className="admin-select"
                  value={province}
                  onChange={(e) => {
                    setProvince(e.target.value);
                    setEditingId(null);
                    setPage(1);
                  }}
                >
                  {PROVINCES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <span className="admin-count">
                  ({filteredRooms.length} รายการ)
                </span>
                <input
                  className="admin-input admin-search"
                  type="text"
                  placeholder="ค้นหาชื่อ, บริการ, ประเภท..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                />
              </div>
              <button
                className="admin-save-btn"
                onClick={handleSave}
                disabled={saving || editedRooms.size === 0}
              >
                {saving ? "กำลังบันทึก..." : "บันทึก"}
                {editedRooms.size > 0 && (
                  <span className="admin-badge">{editedRooms.size}</span>
                )}
              </button>
            </div>

            {/* Message */}
            {message && (
              <div className={`admin-message admin-message-${message.type}`}>
                {message.type === "success" ? "✓" : "✗"} {message.text}
              </div>
            )}

            {/* Loading */}
            {loading && <div className="admin-loading">กำลังโหลดข้อมูล...</div>}

            {/* Table */}
            {!loading && (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th style={{ width: "40px" }}>#</th>
                      <th>ชื่อสถานที่</th>
                      <th style={{ width: "160px" }}>ประเภท</th>
                      <th>บริการ</th>
                      <th style={{ width: "80px" }}>ความจุ</th>
                      <th style={{ width: "70px" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedRooms.map((room, idx) => {
                      const current = getRoomValue(room);
                      const isEditing = editingId === room.id;
                      const isModified = editedRooms.has(room.id);

                      return (
                        <tr
                          key={room.id}
                          className={`${isEditing ? "admin-row-editing" : ""} ${isModified ? "admin-row-modified" : ""}`}
                        >
                          <td className="admin-cell-num">{(page - 1) * PAGE_SIZE + idx + 1}</td>

                          {/* Name */}
                          <td>
                            {isEditing ? (
                              <input
                                className="admin-input"
                                value={current.name}
                                onChange={(e) => handleFieldChange(room.id, "name", e.target.value)}
                              />
                            ) : (
                              <span className="admin-cell-name">{current.name}</span>
                            )}
                          </td>

                          {/* Type */}
                          <td>
                            {isEditing ? (
                              <select
                                className="admin-input"
                                value={current.type}
                                onChange={(e) => handleFieldChange(room.id, "type", e.target.value)}
                              >
                                {allTypes.map((t) => (
                                  <option key={t} value={t}>
                                    {getTypeLabel(t)}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              getTypeLabel(current.type)
                            )}
                          </td>

                          {/* Service */}
                          <td>
                            {isEditing ? (
                              <input
                                className="admin-input"
                                value={current.service}
                                onChange={(e) => handleFieldChange(room.id, "service", e.target.value)}
                              />
                            ) : (
                              current.service || "-"
                            )}
                          </td>

                          {/* Capacity */}
                          <td>
                            {isEditing ? (
                              <input
                                className="admin-input admin-input-num"
                                type="text"
                                value={current.capacity}
                                onChange={(e) => handleFieldChange(room.id, "capacity", e.target.value)}
                              />
                            ) : (
                              current.capacity || "-"
                            )}
                          </td>

                          {/* Edit toggle */}
                          <td>
                            <button
                              className={`admin-edit-btn ${isEditing ? "admin-edit-btn-done" : ""}`}
                              onClick={() => setEditingId(isEditing ? null : room.id)}
                            >
                              {isEditing ? "เสร็จ" : "แก้ไข"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {!loading && totalPages > 1 && (
              <div className="admin-pagination">
                <button
                  className="admin-page-btn"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  ← ก่อนหน้า
                </button>
                <span className="admin-page-info">
                  หน้า {page} / {totalPages}
                </span>
                <button
                  className="admin-page-btn"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  ถัดไป →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
