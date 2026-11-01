/**
 * Road blockage alerts (simulated)
 * - Creates closure points with reasons + ETA
 * - Used by smart routing to avoid closures
 */
(function () {
  "use strict";

  const MRN = window.MRN;
  if (!MRN || !MRN.core) return;

  const { on, toast, createIcon, SVG } = MRN.core;

  let layer = null;

  function ensureLayer(map) {
    if (layer) return layer;
    layer = L.layerGroup().addTo(map);
    return layer;
  }

  function clear() {
    if (layer) layer.clearLayers();
    MRN.state.blockers = [];
  }

  function seededRand(seed) {
    let x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  function genBlockers(dest) {
    // Deterministic “simulated” blockers per destination id
    const base = { lat: dest.lat, lng: dest.lng };
    const seed = dest.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const n = 2 + Math.floor(seededRand(seed) * 2); // 2-3
    const reasons = ["Rockfall clearing", "Bridge repair", "Avalanche debris", "Police checkpoint congestion"];

    const out = [];
    for (let i = 0; i < n; i++) {
      const r1 = seededRand(seed + i * 11);
      const r2 = seededRand(seed + i * 17);
      const lat = base.lat + (r1 - 0.5) * 0.18;
      const lng = base.lng + (r2 - 0.5) * 0.18;
      const reason = reasons[Math.floor(seededRand(seed + i * 23) * reasons.length)];
      const hrs = 1 + Math.floor(seededRand(seed + i * 31) * 6);
      const delayMin = 12 + Math.floor(seededRand(seed + i * 37) * 70);
      out.push({
        id: `${dest.id}-block-${i}`,
        lat,
        lng,
        reason,
        opensAt: `${hrs} hr`,
        delayMin,
      });
    }
    return out;
  }

  function addBlockers(map, blockers) {
    clear();
    ensureLayer(map);
    MRN.state.blockers = blockers;
    const icon = createIcon({ kind: "danger", svg: SVG.block, bounce: true });

    blockers.forEach((b) => {
      const m = L.marker([b.lat, b.lng], { icon }).addTo(layer);
      m.bindPopup(
        `<div style="min-width:250px">
          <div style="font-weight:900">Road blockage</div>
          <div style="color:#64748b;margin-top:2px">Reason: <b>${b.reason}</b></div>
          <div style="color:#64748b">Expected opening: <b>${b.opensAt}</b></div>
          <div style="color:#64748b">Delay: <b>${b.delayMin} min</b></div>
        </div>`
      );
    });

    if (blockers.length) {
      toast({
        level: "warn",
        title: "Road blockage alerts",
        desc: `${blockers.length} closures detected. Smart route will avoid them.`,
      });
    }
  }

  on("dest:changed", ({ dest }) => {
    if (!dest || !MRN.state || !MRN.state.map) return;
    addBlockers(MRN.state.map, genBlockers(dest));
  });
})();

