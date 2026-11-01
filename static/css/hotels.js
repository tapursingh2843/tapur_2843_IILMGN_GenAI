/**
 * Hotel markers system
 * - Loads hotels via existing Flask API: /api/hotels?destination_id=...
 * - Animated custom icons + booking CTA
 */
(function () {
  "use strict";

  const MRN = window.MRN;
  if (!MRN || !MRN.core) return;

  const { on, toast, createIcon, SVG } = MRN.core;

  let layer = null;

  async function fetchHotels(destinationId) {
    const url = `/api/hotels?destination_id=${encodeURIComponent(destinationId)}`;
    const r = await fetch(url, { headers: { Accept: "application/json" } });
    if (!r.ok) throw new Error("Hotels fetch failed");
    const j = await r.json();
    return Array.isArray(j) ? j : [];
  }

  function clear() {
    if (layer) layer.clearLayers();
  }

  function ensureLayer(map) {
    if (layer) return layer;
    layer = L.layerGroup().addTo(map);
    return layer;
  }

  function bookingUrl(hotel) {
    // Demo deep-link. Replace with real booking integration later.
    const q = encodeURIComponent(`${hotel.name} ${hotel.destination_id}`);
    return `https://www.google.com/search?q=${q}`;
  }

  function addHotels(map, hotels) {
    clear();
    const group = ensureLayer(map);
    const icon = createIcon({ kind: "hotel", svg: SVG.hotel, bounce: true });

    hotels.slice(0, 30).forEach((h) => {
      if (!Number.isFinite(Number(h.lat)) || !Number.isFinite(Number(h.lng))) return;
      const m = L.marker([Number(h.lat), Number(h.lng)], { icon }).addTo(group);
      m.bindPopup(
        `<div style="min-width:240px">
          <div style="font-weight:900">${h.name}</div>
          <div style="color:#64748b;margin-top:2px">Rating: <b>★${Number(h.rating).toFixed(1)}</b></div>
          <div style="color:#64748b">Price: <b>₹${Number(h.price_per_night).toLocaleString("en-IN")}/night</b></div>
          <div style="margin-top:10px;display:flex;gap:8px">
            <a class="btn btn--primary btn--small" href="${bookingUrl(h)}" target="_blank" rel="noopener">Book</a>
            <button class="btn btn--secondary btn--small" type="button" onclick="navigator.clipboard && navigator.clipboard.writeText('${h.name.replace(/'/g, "\\'")}')">Copy name</button>
          </div>
        </div>`
      );
    });
  }

  on("dest:changed", async ({ dest }) => {
    if (!dest || !MRN.state || !MRN.state.map) return;
    try {
      const hotels = await fetchHotels(dest.id);
      addHotels(MRN.state.map, hotels);
    } catch (_e) {
      toast({ level: "warn", title: "Hotels unavailable", desc: "Could not load nearby hotels." });
    }
  });

  on("route:cleared", () => clear());
})();

