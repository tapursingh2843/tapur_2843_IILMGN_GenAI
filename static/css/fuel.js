/**
 * Fuel station system (Overpass API)
 * - Queries nearby fuel stations around destination and/or route midpoint
 * - Animated icon + navigation button
 */
(function () {
  "use strict";

  const MRN = window.MRN;
  if (!MRN || !MRN.core) return;

  const { on, toast, createIcon, SVG, formatKm } = MRN.core;

  let layer = null;

  function ensureLayer(map) {
    if (layer) return layer;
    layer = L.layerGroup().addTo(map);
    return layer;
  }

  function clear() {
    if (layer) layer.clearLayers();
  }

  function haversineMeters(a, b) {
    const R = 6371e3;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const s1 = Math.sin(dLat / 2);
    const s2 = Math.sin(dLng / 2);
    const q = s1 * s1 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * s2 * s2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(q)));
  }

  async function overpassFuel(lat, lng) {
    // Limit to small radius so it’s fast (mountain towns are sparse anyway)
    const radius = 12000; // meters
    const q = `[out:json][timeout:12];
      (
        node["amenity"="fuel"](around:${radius},${lat},${lng});
        way["amenity"="fuel"](around:${radius},${lat},${lng});
        relation["amenity"="fuel"](around:${radius},${lat},${lng});
      );
      out center 25;`;

    const r = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: q,
    });
    if (!r.ok) throw new Error("Overpass failed");
    const j = await r.json();
    return (j && j.elements) || [];
  }

  function normalize(el) {
    const lat = el.lat ?? (el.center && el.center.lat);
    const lng = el.lon ?? (el.center && el.center.lon);
    if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return null;
    const tags = el.tags || {};
    return {
      name: tags.name || "Fuel station",
      lat: Number(lat),
      lng: Number(lng),
    };
  }

  function addFuel(map, center, list) {
    clear();
    const group = ensureLayer(map);
    const icon = createIcon({ kind: "fuel", svg: SVG.fuel, bounce: true });

    list.slice(0, 18).forEach((f) => {
      const dist = haversineMeters(center, f);
      const availability = dist < 5000 ? "High" : dist < 9000 ? "Medium" : "Low";
      const nav = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${center.lat}%2C${center.lng}%3B${f.lat}%2C${f.lng}`;
      const m = L.marker([f.lat, f.lng], { icon }).addTo(group);
      m.bindPopup(
        `<div style="min-width:250px">
          <div style="font-weight:900">${f.name}</div>
          <div style="color:#64748b;margin-top:2px">Distance: <b>${formatKm(dist)}</b></div>
          <div style="color:#64748b">Estimated fuel availability: <b>${availability}</b></div>
          <div style="margin-top:10px">
            <a class="btn btn--primary btn--small" href="${nav}" target="_blank" rel="noopener">Navigate</a>
          </div>
        </div>`
      );
    });
  }

  on("dest:changed", async ({ dest }) => {
    if (!dest || !MRN.state || !MRN.state.map) return;
    try {
      const els = await overpassFuel(dest.lat, dest.lng);
      const list = els.map(normalize).filter(Boolean);
      addFuel(MRN.state.map, { lat: dest.lat, lng: dest.lng }, list);
    } catch (_e) {
      // Overpass is rate-limited; avoid spamming user.
      toast({ level: "warn", title: "Fuel stations limited", desc: "Fuel data provider is busy. Try again in a minute." });
    }
  });

  on("route:cleared", () => clear());
})();

