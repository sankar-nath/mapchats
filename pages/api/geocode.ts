import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const q = (req.query.q as string)?.trim();
  if (!q) return res.status(400).json({ error: "Missing q" });

  try {
    const url =
      `https://nominatim.openstreetmap.org/search?` +
      `format=jsonv2&limit=1&addressdetails=1&namedetails=1&extratags=1&` +
      `q=${encodeURIComponent(q)}`;

    const r = await fetch(url, {
      headers: { "User-Agent": "MapChat Demo (you@example.com)" }
    });

    if (!r.ok) return res.status(r.status).json({ error: await r.text() });

    const results = await r.json();
    if (!results?.length) return res.status(404).json({ error: "No results" });

    const item = results[0];
    res.status(200).json({
      lat: parseFloat(item.lat),
      lon: parseFloat(item.lon),
      name: item.display_name,
      type: item.type,          // e.g., 'restaurant', 'neighbourhood'
      category: item.class,     // e.g., 'amenity', 'place'
      address: item.address,    // structured address object
      bbox: item.boundingbox    // [south, north, west, east]
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Geocode failed" });
  }
}
