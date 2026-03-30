"use client";

import { MapContainer, TileLayer, Marker, Tooltip, GeoJSON, useMap, useMapEvents } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { useEffect, useRef, memo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { ROOM_TYPES, DEFAULT_ROOM_TYPE } from "@/lib/roomTypes";
import type { CleanRoom } from "@/lib/types";

/* ===== Props Interface ===== */
export interface MapProps {
  rooms: CleanRoom[];
  flyTarget: { pos: [number, number]; zoom: number; key: number } | null;
  zoomAction: { dir: "in" | "out"; key: number } | null;
  fitBounds: L.LatLngBoundsExpression | null;
  userPosition: [number, number] | null;
  highlightRooms: { pos: [number, number]; tier: "near" | "mid" | "far" }[];
  distanceMap: Map<number, number>;
  zoom: number;
  provincesGeo: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  center: [number, number];
  defaultZoom: number;
  onMapClick: (latlng: [number, number]) => void;
  onRoomSelect: (room: CleanRoom) => void;
  onClusterClick: () => void;
  onZoomChange: (z: number) => void;
}

/* ===== Icon Creators ===== */

function createUserLocationIcon() {
  return L.divIcon({
    className: "user-location-icon",
    html: `
      <div class="user-location-pulse"></div>
      <div class="user-location-dot"></div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function createRoomIcon(type: string, passed = true) {
  const config = ROOM_TYPES[type] || DEFAULT_ROOM_TYPE;
  const color = passed ? config.color : "#9ca3af";
  const iconContent = config.svg
    ? `<div class="room-pin-svg" style="color:${color}">${config.svg}</div>`
    : config.icon;
  return L.divIcon({
    className: "room-marker",
    html: `<div class="room-pin" style="background:${color}${passed ? "" : ";opacity:0.6"}">${iconContent}</div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 38],
  });
}

/* ===== Internal Map Sub-components ===== */

function MapEventHandler({ onSelect, onZoomChange }: { onSelect: (latlng: [number, number]) => void; onZoomChange: (z: number) => void }) {
  const map = useMap();
  useEffect(() => {
    map.options.scrollWheelZoom = "center";
    map.scrollWheelZoom.disable();
    map.scrollWheelZoom.enable();
  }, [map]);
  useMapEvents({
    click(e) {
      onSelect([e.latlng.lat, e.latlng.lng]);
    },
    zoomend() {
      onZoomChange(map.getZoom());
    },
  });
  return null;
}

function FlyTo({ target }: { target: { pos: [number, number]; zoom: number; key: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo(target.pos, target.zoom, { duration: 1.2 });
    }
  }, [target, map]);
  return null;
}

function ZoomHandler({ action }: { action: { dir: "in" | "out"; key: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (action) {
      if (action.dir === "in") map.zoomIn(); else map.zoomOut();
    }
  }, [action, map]);
  return null;
}

function FitBoundsHandler({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap();
  const prevRef = useRef<L.LatLngBoundsExpression | null>(null);
  useEffect(() => {
    if (bounds && bounds !== prevRef.current) {
      prevRef.current = bounds;
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15, duration: 1.2 });
    }
  }, [bounds, map]);
  return null;
}

function LocationMarker({ position }: { position: [number, number] | null }) {
  if (!position) return null;
  return (
    <Marker position={position} icon={createUserLocationIcon()}>
      <Tooltip direction="top" offset={[0, -18]} opacity={0.9}>
        ตำแหน่งของคุณ
      </Tooltip>
    </Marker>
  );
}

const PULSE_TIERS = {
  near: { size: 70, cls: "pulse-near" },
  mid:  { size: 40, cls: "pulse-mid" },
  far:  { size: 28, cls: "pulse-far" },
};

function NearbyHighlights({ rooms }: { rooms: { pos: [number, number]; tier: "near" | "mid" | "far" }[] }) {
  if (rooms.length === 0) return null;
  return (
    <>
      {rooms.map((r, i) => {
        const t = PULSE_TIERS[r.tier];
        return (
          <Marker
            key={`hl-${i}`}
            position={r.pos}
            icon={L.divIcon({
              className: "nearest-room-highlight",
              html: `<div class="nearest-pulse-ring ${t.cls}"></div>`,
              iconSize: [t.size, t.size],
              iconAnchor: [t.size / 2, t.size / 2],
            })}
            interactive={false}
          />
        );
      })}
    </>
  );
}

function getClusterScale(zoom: number): number {
  if (zoom <= 14) return 1;
  return 1 + (zoom - 14) * 0.2;
}

function CleanRoomMarkers({ rooms, onSelect, onClusterClick, zoom, distanceMap }: { rooms: CleanRoom[]; onSelect: (room: CleanRoom) => void; onClusterClick?: () => void; zoom: number; distanceMap: Map<number, number> }) {
  const map = useMap();
  const scale = getClusterScale(zoom);
  const clusterRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const callbackRef = useRef(onClusterClick);
  callbackRef.current = onClusterClick;

  useEffect(() => {
    const group = clusterRef.current;
    if (!group) return;
    const handler = () => { callbackRef.current?.(); };
    group.on("clusterclick", handler);
    return () => { group.off("clusterclick", handler); };
  }, []);

  return (
    <MarkerClusterGroup
      ref={clusterRef}
      chunkedLoading
      maxClusterRadius={60}
      spiderfyOnMaxZoom
      showCoverageOnHover={false}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      iconCreateFunction={(cluster: any) => {
        const count = cluster.getChildCount();
        let baseOuter: number;
        let baseInner: number;
        let baseFontSize: number;
        if (count >= 100) { baseOuter = 58; baseInner = 46; baseFontSize = 15; }
        else if (count >= 50) { baseOuter = 50; baseInner = 38; baseFontSize = 14; }
        else if (count >= 10) { baseOuter = 42; baseInner = 32; baseFontSize = 13; }
        else { baseOuter = 36; baseInner = 28; baseFontSize = 12; }
        const outer = Math.round(baseOuter * scale);
        const inner = Math.round(baseInner * scale);
        const fs = Math.round(baseFontSize * scale);
        return L.divIcon({
          html: `<div style="width:${inner}px;height:${inner}px;font-size:${fs}px;"><span>${count}</span></div>`,
          className: `marker-cluster`,
          iconSize: L.point(outer, outer),
        });
      }}
    >
      {rooms.map((room) => (
        <Marker
          key={room.id}
          position={[room.lat, room.lng]}
          icon={createRoomIcon(room.type, room.evaluationResult === "ผ่าน")}
          eventHandlers={{
            click: () => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const group = clusterRef.current as any;
              const spiderfied = group?._spiderfied;
              map.once("moveend", () => {
                if (spiderfied) {
                  spiderfied.spiderfy();
                }
                onSelect(room);
              });
              map.panTo([room.lat, room.lng]);
            },
          }}
        >
          <Tooltip direction="top" offset={[0, -32]} opacity={1} className="custom-tooltip">
            <span>{(ROOM_TYPES[room.type] || DEFAULT_ROOM_TYPE).icon} {room.name}
            {distanceMap.has(room.id) && <span className="tooltip-distance"> ({distanceMap.get(room.id)!.toFixed(1)} กม.)</span>}
            </span>
          </Tooltip>
        </Marker>
      ))}
    </MarkerClusterGroup>
  );
}

/* ===== Main Map Component ===== */

function MapInner({
  rooms,
  flyTarget,
  zoomAction,
  fitBounds,
  userPosition,
  highlightRooms,
  distanceMap,
  zoom,
  provincesGeo,
  center,
  defaultZoom,
  onMapClick,
  onRoomSelect,
  onClusterClick,
  onZoomChange,
}: MapProps) {
  return (
    <MapContainer
      center={center}
      zoom={defaultZoom}
      style={{ width: "100vw", height: "100vh" }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {provincesGeo && (
        <GeoJSON
          data={provincesGeo}
          style={{
            color: "#2563eb",
            weight: 2,
            opacity: 0.6,
            fillColor: "#2563eb",
            fillOpacity: 0.03,
          }}
        />
      )}
      <MapEventHandler onSelect={onMapClick} onZoomChange={onZoomChange} />
      <LocationMarker position={userPosition} />
      <FlyTo target={flyTarget} />
      <ZoomHandler action={zoomAction} />
      <FitBoundsHandler bounds={fitBounds} />
      <NearbyHighlights rooms={highlightRooms} />
      {rooms.length > 0 && <CleanRoomMarkers rooms={rooms} onSelect={onRoomSelect} onClusterClick={onClusterClick} zoom={zoom} distanceMap={distanceMap} />}
    </MapContainer>
  );
}

export default memo(MapInner);
