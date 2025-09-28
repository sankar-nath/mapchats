// components/MapPane.tsx
import React, { useMemo, useState } from "react";

type MapPaneProps = {
  onContextChange?: (text: string) => void; // callback to send context up
};

/* --- helpers for bbox + zoom forcing (you already had these) --- */
function bboxAround(lat: number, lon: number, radiusMeters: number) {
  const dLat = radiusMeters / 111_320; // meters per degree lat
  const dLon = radiusMeters / (111_320 * Math.cos((lat * Math.PI) / 180));
  return { left: lon - dLon, right: lon + dLon, bottom: lat - dLat, top: lat + dLat };
}
function zoomRadius(zoom: number) {
  if (zoom >= 19) return 120;
  if (zoom >= 18) return 200;
  if (zoom >= 17) return 400;
  if (zoom >= 16) return 800;
  return 1200;
}

type GeoInfo = {
  name: string;
  type?: string;
  category?: string;
  address?: Record<string, string>;
  bbox?: [string, string, string, string];
};

export default function MapPane({ onContextChange }: MapPaneProps) {
  const [lat, setLat] = useState(43.7615);
  const [lng, setLng] = useState(-79.4111);
  const [zoom, setZoom] = useState(12);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [info, setInfo] = useState<GeoInfo | null>(null);

  // NEW: lock state
  const [locked, setLocked] = useState(false);

  const src = useMemo(() => {
    const r = zoomRadius(zoom);
    const b = bboxAround(lat, lng, r);
    const v = `${lat.toFixed(5)}_${lng.toFixed(5)}_${zoom}`; // cache-buster so iframe reloads
    const qs = new URLSearchParams({
      layer: "mapnik",
      bbox: `${b.left},${b.bottom},${b.right},${b.top}`,
      marker: `${lat},${lng}`,
      v
    }).toString();
    const hash = `#map=${zoom}/${lat}/${lng}`;
    return `https://www.openstreetmap.org/export/embed.html?${qs}${hash}`;
  }, [lat, lng, zoom]);

  const onSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (locked) {
      setStatus("🔒 Map is locked");
      setTimeout(() => setStatus(null), 1400);
      return;
    }
    const query = q.trim();
    if (!query) return;

    setStatus("Searching...");
    try {
      const r = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || "Search failed");

      setLat(data.lat);
      setLng(data.lon);
      setZoom(19); // max
      setStatus(data.name);
      setInfo({
        name: data.name,
        type: data.type,
        category: data.category,
        address: data.address,
        bbox: data.bbox
      });
    } catch (err: any) {
      setStatus(err?.message || "Search failed");
    } finally {
      setTimeout(() => setStatus(null), 2200);
    }
  };

  const infoText = (() => {
    if (!info) return "";
    const parts: string[] = [];
    if (info.name) parts.push(info.name);
    if (info.type || info.category)
      parts.push(`(${info.category ?? ""}${info.category && info.type ? " • " : ""}${info.type ?? ""})`);
    if (info.address) {
      const a = info.address;
      const addrLine = [a.road, a.neighbourhood, a.city || a.town || a.village, a.state, a.postcode, a.country]
        .filter(Boolean)
        .join(", ");
      if (addrLine) parts.push(addrLine);
    }
    parts.push(`Lat ${lat.toFixed(6)}, Lng ${lng.toFixed(6)}`);
    return parts.filter(Boolean).join("\n");
  })();

  return (
    <div className="relative w-full rounded-xl border overflow-hidden bg-slate-50">
      {/* Map */}
      <div className="relative w-full h-[420px]">
        {/* When locked, intercept all pointer/wheel/keyboard events */}
        {locked && (
          <div
            className="absolute inset-0 z-20 cursor-not-allowed"
            style={{ background: "transparent", pointerEvents: "auto" }}
            aria-label="Map locked overlay"
            title="Map is locked"
          />
        )}

        <iframe
          key={src}
          title="Map"
          src={src}
          className="w-full h-full"
          style={{ border: 0 }}
          loading="eager"
          referrerPolicy="no-referrer-when-downgrade"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        />

        {/* Lock toggle button (top-right) */}
        <button
          type="button"
          onClick={() => setLocked(v => !v)}
          aria-pressed={locked}
          className={`absolute right-3 top-3 z-30 px-3 py-1.5 rounded-lg shadow border text-sm
            ${locked ? "bg-gray-900 text-white" : "bg-white/95"}`}
          title={locked ? "Unlock map" : "Lock map"}
        >
          {locked ? "🔒 Locked" : "🔓 Unlock"}
        </button>

        {/* Search box overlay (top-right, next to lock) */}
        <form
          onSubmit={onSearch}
          className="absolute right-[112px] top-3 z-30 flex items-center gap-2 bg-white/95 backdrop-blur px-3 py-2 rounded-lg shadow"
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search a place"
            className="outline-none text-sm w-48 sm:w-64"
            disabled={locked}
          />
          <button
            type="submit"
            disabled={locked}
            className={`text-sm px-3 py-1.5 rounded-md border ${locked ? "opacity-60 cursor-not-allowed" : "hover:bg-gray-50"}`}
          >
            Search
          </button>
        </form>
      </div>

      {/* Status toast */}
      {status && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-3 bg-white/95 px-3 py-1.5 rounded-md text-xs shadow z-30">
          {status}
        </div>
      )}

      {/* Info textbox */}
      <div className="p-3 border-t bg-white">
        <label className="block text-xs font-medium text-gray-500 mb-1">Search result</label>
        <textarea id="map-info-text" readOnly value={infoText} rows={3} className="w-full text-sm rounded-lg border p-2 resize-y" />
      </div>
    </div>
  );
}
