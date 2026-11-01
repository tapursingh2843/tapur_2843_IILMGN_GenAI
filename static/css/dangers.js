/**
 * Mountain danger alerts
 * - Generates simulated danger zones per destination (polygons)
 * - Glowing animated polygons + hover warning
 */
(function () {
  "use strict";

  const MRN = window.MRN;
  if (!MRN || !MRN.core) return;

  const { on, toast } = MRN.core;

  let layer = null;

  function ensureLayer(map) {
    if (layer) return layer;
    layer = L.layerGroup().addTo(map);
    return layer;
  }

  function clear() {
    if (layer) layer.clearLayers();
    MRN.state.dangerZones = [];
  }

  function genZones(dest) {
    // Simulated zones around destination (rough offsets, for demo)
    const base = [dest.lat, dest.lng];
    const s = (n) => n / 100; // ~1km scale

    const mkPoly = (name, type, pts, severity) => ({
      id: `${dest.id}-${type}-${name}`.replace(/\s+/g, "-").toLowerCase(),
      name,
      type,
      severity,
      polygon: pts,
    });

    return [
      mkPoly(
        "Steep hairpin stretch",
        "steep-roads",
        [
          [base[0] + s(3), base[1] - s(2)],
          [base[0] + s(5), base[1] - s(1)],
          [base[0] + s(4), base[1] + s(2)],
          [base[0] + s(2), base[1] + s(1)],
        ],
        "moderate"
      ),
      mkPoly(
        "Landslide prone corridor",
        "landslides",
        [
          [base[0] - s(4), base[1] - s(3)],
          [base[0] - s(2), base[1] - s(4)],
          [base[0] - s(1), base[1] - s(1)],
          [base[0] - s(3), base[1] + s(0)],
        ],
        "danger"
      ),
      mkPoly(
        "Avalanche risk slope",
        "avalanche",
        [
          [base[0] + s(1), base[1] + s(4)],
          [base[0] + s(3), base[1] + s(5)],
          [base[0] + s(2), base[1] + s(7)],
          [base[0] + s(0), base[1] + s(6)],
        ],
        "danger"
      ),
    ];
  }

  function addZones(map, zones) {
    clear();
    ensureLayer(map);
    MRN.state.dangerZones = zones;

    zones.forEach((z) => {
      const color = z.severity === "danger" ? "#fb7185" : "#fbbf24";
      const poly = L.polygon(z.polygon, {
        color,
        weight: 2,
        opacity: 0.9,
        fillColor: color,
        fillOpacity: z.severity === "danger" ? 0.18 : 0.12,
        className: "mrn-danger",
      }).addTo(layer);

      poly.on("mouseover", () => {
        toast({
          level: z.severity === "danger" ? "danger" : "warn",
          title: "Mountain danger alert",
          desc: `${z.name} • ${z.type.replace(/-/g, " ")} risk`,
        });
      });
    });
  }

  on("dest:changed", ({ dest }) => {
    if (!dest || !MRN.state || !MRN.state.map) return;
    addZones(MRN.state.map, genZones(dest));
  });
})();

