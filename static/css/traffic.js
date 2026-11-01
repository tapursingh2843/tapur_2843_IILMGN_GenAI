/**
 * Traffic system (simulated)
 * - Assigns traffic levels to a chosen route and exposes UI numbers
 * - Drives route line coloring / ETA-with-traffic
 */
(function () {
  "use strict";

  const MRN = window.MRN;
  if (!MRN || !MRN.core) return;

  const { on, formatMinutes } = MRN.core;

  function trafficFactor(routeMeters) {
    // Simulate more congestion on longer mountain routes
    const km = routeMeters / 1000;
    if (km > 250) return 1.35;
    if (km > 140) return 1.25;
    if (km > 70) return 1.18;
    return 1.1;
  }

  function levelFromFactor(f) {
    if (f >= 1.3) return "heavy";
    if (f >= 1.2) return "moderate";
    return "smooth";
  }

  on("route:chosen", ({ route }) => {
    if (!route) return;
    const baseSec = route.duration;
    const meters = route.distance;
    const f = trafficFactor(meters);
    const trafficSec = baseSec * f;
    const delay = Math.max(0, trafficSec - baseSec);
    route.traffic = {
      factor: f,
      level: levelFromFactor(f),
      durationInTraffic: trafficSec,
      delaySec: delay,
    };

    // Update existing travel info fields
    const set = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.textContent = v;
    };
    set("duration-val", formatMinutes(baseSec));
    set("traffic-duration-val", formatMinutes(trafficSec));
    set("delay-val", formatMinutes(delay));
  });

  MRN.traffic = {
    levelFromFactor,
  };
})();

