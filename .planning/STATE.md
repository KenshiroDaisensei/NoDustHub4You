# Project State

## Settings
language: Thai

## Current Task
task: Refactor UI out of Map.tsx into page.tsx (airvisual pattern)
status: completed

## Decisions
- ใช้ OpenStreetMap + Leaflet.js (ฟรี ไม่มีค่าใช้จ่าย)
- ใช้ Next.js เป็น framework
- MVP: ดูและค้นหาอย่างเดียว ไม่มี login
- ขอบเขต Phase 1: ภาคเหนือ 8 จังหวัด
- ภาษาไทยอย่างเดียวก่อน
- ข้อมูลจาก API กรมอนามัย + ห้องสมมติ
- แผนที่เต็มจอแบบ AirVisual
- กดหมุด → popup รายละเอียด → ปุ่มนำทาง Google Maps
- ค้นหาจังหวัด → บินไป + ชื่อจังหวัด fade in/out
- กรองตามประเภท

## Plan
1. [completed] Setup Next.js + Leaflet + แผนที่เต็มจอ
2. [completed] GPS + แสดงตำแหน่งปัจจุบัน
3. [completed] ดึงข้อมูล API กรมอนามัย 8 จังหวัดภาคเหนือ + แสดงหมุด icon ตามประเภท + clustering
4. [pending] Popup Card + ปุ่มนำทาง Google Maps
5. [pending] ค้นหาจังหวัด + fade animation
6. [pending] กรองตามประเภท

## Completed Tasks
- Task 1: Setup Next.js 14 (App Router) + Leaflet.js + react-leaflet + full-screen map centered on Chiang Mai
- Task 2: GPS geolocation — pulsing blue dot at user location, flyTo on permission grant, silent fallback to Chiang Mai, recenter button (bottom-right)
- Task 3: ดึงข้อมูล API กรมอนามัย 8 จังหวัดภาคเหนือ (5,566 records), แสดงหมุด emoji ตามประเภทบนแผนที่ + MarkerClusterGroup, API route with 1-hour in-memory cache
- Near Me: ปุ่ม "ใกล้ฉัน" — GPS → expanding radius search (2/5/10/20km) → fitBounds → pulse highlight nearest room → banner "พบ X ห้องในรัศมี Y กม." → distance on tooltips + detail panel
- Refactor: Moved all UI components (ProvinceSearch, TypeFilter, DetailPanel, zoom controls, near-me button, banners, loading, data source toggle) and all state/handlers from Map.tsx to page.tsx. Map.tsx now only contains Leaflet-specific code (MapContainer, TileLayer, GeoJSON, markers, clusters, FlyTo, ZoomHandler, FitBoundsHandler). Follows airvisual pattern — UI renders immediately from HTML while Leaflet loads dynamically.
- Fix spiderfy collapse: Removed setFlyTarget from handleRoomSelect in page.tsx to prevent Map re-render on marker click. Moved pan behavior into Map.tsx using map.panTo() via Leaflet API directly, which avoids triggering cluster unspiderfy.
- Admin Page: Created /admin page with 2 tabs (แก้ไขข้อมูลสถานที่ + พิจารณาห้องปลอดฝุ่นห้องใหม่), province dropdown filter, editable table with inline editing, save with backup API route (/api/admin/save). Styles added to globals.css.
