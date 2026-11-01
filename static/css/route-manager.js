/**
 * Smart route system (OSRM)
 * - Requests driving routes from OSRM (no key)
 * - Chooses safest route by avoiding danger zones + road blockages
 * - Animates route drawing + flyTo transitions
 */
(function () {
  "use strict";

  const MRN = window.MRN;
  if (!MRN || !MRN.core) return;

  const { on, emit, setLoading, setStatus, toast, formatKm, formatMinutes } = MRN.core;

  let routeLayer = null;
  let activeTrafficOn = true;
  let activeAltRoutesOn = false;
  let activeAbort = null;

  function ensureLayer(map) {
    if (routeLayer) return routeLayer;
    routeLayer = L.layerGroup().addTo(map);
    return routeLayer;
  }

  function clearRoute() {
    // Stop any in-flight routing so the UI doesn't get stuck loading.
    try {
      if (activeAbort) activeAbort.abort();
    } catch {}
    activeAbort = null;

    setLoading(false);
    if (routeLayer) routeLayer.clearLayers();
    if (MRN.state) MRN.state.route = null;
    emit("route:cleared", {});
    const set = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.textContent = v;
    };
    set("distance-val", "—");
    set("duration-val", "—");
    set("traffic-duration-val", "—");
    set("delay-val", "—");
    set("traffic-headline", "Traffic status will appear here.");
    set("traffic-detail", "");
    setStatus("Cleared");
  }

  function toLonLatStr(a) {
    return `${a.lng},${a.lat}`;
  }

  async function osrmRoutes(a, b, alternatives, signal) {
    const base = "https://router.project-osrm.org/route/v1/driving/";
    const url =
      base +
      `${toLonLatStr(a)};${toLonLatStr(b)}` +
      `?overview=full&geometries=geojson&alternatives=${alternatives ? "true" : "false"}&steps=false`;
    const r = await fetch(url, { headers: { Accept: "application/json" }, signal });
    if (!r.ok) throw new Error("Routing failed");
    const j = await r.json();
    if (!j || j.code !== "Ok" || !Array.isArray(j.routes)) throw new Error("Routing unavailable");
    return j.routes;
  }

  // Cheap “avoidance” heuristics: treat danger zones and blockers as points + buffers
  function distMeters(a, b) {
    const R = 6371e3;
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const s1 = Math.sin(dLat / 2);
    const s2 = Math.sin(dLng / 2);
    const q = s1 * s1 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * s2 * s2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(q)));
  }

  function polyCentroid(poly) {
    // Average points (good enough for demo)
    const pts = poly || [];
    if (!pts.length) return null;
    let lat = 0;
    let lng = 0;
    pts.forEach((p) => {
      lat += p[0];
      lng += p[1];
    });
    return { lat: lat / pts.length, lng: lng / pts.length };
  }

  function routePenalty(routeGeo) {
    const coords = routeGeo && routeGeo.coordinates ? routeGeo.coordinates : [];
    if (!coords.length) return 0;

    const danger = (MRN.state && MRN.state.dangerZones) || [];
    const blockers = (MRN.state && MRN.state.blockers) || [];

    let penalty = 0;

    const dangerCenters = danger
      .map((z) => ({ z, c: polyCentroid(z.polygon) }))
      .filter((x) => x.c);
    const blockerPts = blockers.map((b) => ({ lat: b.lat, lng: b.lng, b }));

    // Sample route points (every ~25th point)
    const step = Math.max(10, Math.floor(coords.length / 80));
    for (let i = 0; i < coords.length; i += step) {
      const p = { lat: coords[i][1], lng: coords[i][0] };

      dangerCenters.forEach(({ z, c }) => {
        const d = distMeters(p, c);
        const buf = z.severity === "danger" ? 7000 : 4500;
        if (d < buf) penalty += z.severity === "danger" ? 220 : 120;
      });

      blockerPts.forEach(({ b, lat, lng }) => {
        const d = distMeters(p, { lat, lng });
        if (d < 3500) penalty += 260 + (b.delayMin || 0);
      });
    }

    return penalty;
  }

  function pickSafest(routes) {
    // Lower score wins: duration + penalty
    let best = null;
    let bestScore = Infinity;
    routes.forEach((r) => {
      const p = routePenalty(r.geometry);
      const score = (r.duration || 0) + p;
      if (score < bestScore) {
        bestScore = score;
        best = r;
      }
    });
    return best || routes[0];
  }

  function animatePolyline(points, opts) {
    const layer = ensureLayer(MRN.state.map);
    layer.clearLayers();

    const poly = L.polyline([], opts).addTo(layer);
    poly._path && poly._path.classList && poly._path.classList.add("mrn-route");

    let i = 0;
    const chunk = Math.max(6, Math.floor(points.length / 120));

    function tick() {
      i = Math.min(points.length, i + chunk);
      poly.setLatLngs(points.slice(0, i));
      if (i < points.length) requestAnimationFrame(tick);
    }
    tick();
    return poly;
  }

  function trafficClass(level) {
    if (level === "heavy") return "mrn-traffic--heavy";
    if (level === "moderate") return "mrn-traffic--moderate";
    return "mrn-traffic--smooth";
  }

  function applyTrafficClass(poly, level) {
    if (!poly || !poly._path) return;
    poly._path.classList.remove("mrn-traffic--smooth", "mrn-traffic--moderate", "mrn-traffic--heavy");
    poly._path.classList.add(trafficClass(level));
  }

  function setTrafficPanel(route) {
    const headline = document.getElementById("traffic-headline");
    const detail = document.getElementById("traffic-detail");
    if (!headline || !detail || !route || !route.traffic) return;
    const lvl = route.traffic.level;
    if (lvl === "heavy") {
      headline.textContent = "Heavy traffic detected on your route";
      detail.textContent = "Smart routing picked the safest option. Consider delaying departure by 30–45 minutes.";
    } else if (lvl === "moderate") {
      headline.textContent = "Moderate traffic detected on your route";
      detail.textContent = "Keep buffer for mountain turns and check for temporary blockages.";
    } else {
      headline.textContent = "Traffic looks smooth on your route";
      detail.textContent = "Good visibility + smoother flow expected along the scenic corridors.";
    }
  }

  async function routeIfPossible() {
    const st = MRN.state;
    if (!st || !st.map) return;

    // If we don't have enough inputs yet, ensure loading is off.
    if (!st.user || !st.dest) {
      setLoading(false);
      if (!st.dest) setStatus("Select a destination");
      else setStatus("Select destination and location");
      return;
    }

    // Abort any previous request before starting a new one.
    try {
      if (activeAbort) activeAbort.abort();
    } catch {}
    activeAbort = new AbortController();

    // Hard timeout so we never get stuck in "Calculating…" forever.
    const timeoutMs = 12000;
    const t = setTimeout(() => {
      try {
        activeAbort && activeAbort.abort();
      } catch {}
    }, timeoutMs);

    setLoading(true, "Calculating safest route…");
    setStatus("Routing…");

    try {
      const routes = await osrmRoutes(
        st.user,
        { lat: st.dest.lat, lng: st.dest.lng },
        activeAltRoutesOn,
        activeAbort.signal
      );
      const chosen = pickSafest(routes);
      if (!chosen || !chosen.geometry || !chosen.geometry.coordinates) throw new Error("No route geometry");

      const pts = chosen.geometry.coordinates.map((c) => [c[1], c[0]]);
      st.map.flyTo(pts[Math.floor(pts.length / 3)], Math.max(9, st.map.getZoom()), { duration: 1.1 });

      // Choose traffic level and draw animated route
      const route = {
        distance: chosen.distance,
        duration: chosen.duration,
        points: pts,
      };
      MRN.state.route = route;
      emit("route:chosen", { route });

      const poly = animatePolyline(pts, {
        weight: 5,
        opacity: 0.95,
        color: "#38bdf8",
        className: activeTrafficOn ? `mrn-route ${trafficClass(route.traffic && route.traffic.level)}` : "mrn-route",
      });

      if (activeTrafficOn && route.traffic) {
        applyTrafficClass(poly, route.traffic.level);
      }

      // Fit bounds after a beat (keeps animation looking premium)
      setTimeout(() => {
        try {
          st.map.fitBounds(poly.getBounds().pad(0.18), { animate: true, duration: 1.0 });
        } catch {}
      }, 450);

      // Update distance + ETA
      const distEl = document.getElementById("distance-val");
      if (distEl) distEl.textContent = formatKm(route.distance);
      const durEl = document.getElementById("duration-val");
      if (durEl) durEl.textContent = formatMinutes(route.duration);

      setTrafficPanel(route);
      setStatus("Route ready");
    } catch (e) {
      const aborted = e && (e.name === "AbortError" || String(e).includes("AbortError"));
      toast({
        level: "danger",
        title: aborted ? "Routing timed out" : "Route unavailable",
        desc: aborted
          ? "Routing provider is slow or blocked. Try again (or change network)."
          : "Could not calculate a route right now. Try again.",
      });
      setStatus(aborted ? "Routing timeout" : "Route failed");
    } finally {
      clearTimeout(t);
      activeAbort = null;
      setLoading(false);
    }
  }

  on("ui:clearRoute", () => clearRoute());

  on("ui:traffic", ({ on }) => {
    activeTrafficOn = !!on;
    // redraw if we have an active route
    if (MRN.state && MRN.state.route) routeIfPossible();
  });

  on("ui:altRoutes", ({ on }) => {
    activeAltRoutesOn = !!on;
    if (MRN.state && MRN.state.route) routeIfPossible();
  });

  on("geo:updated", () => routeIfPossible());
  on("dest:changed", () => routeIfPossible());

  MRN.routeManager = { clearRoute, routeIfPossible };
})();

