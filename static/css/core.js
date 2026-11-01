/**
 * Mountain Route Navigator — Core (Leaflet)
 * Responsibilities:
 * - map initialization + base layers
 * - lightweight event bus + shared state
 * - helpers (DOM, formatting, toast)
 */
(function () {
  "use strict";

  const NS = (window.MRN = window.MRN || {});

  function $(id) {
    return document.getElementById(id);
  }

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function formatKm(meters) {
    if (!Number.isFinite(meters)) return "—";
    const km = meters / 1000;
    return km >= 10 ? `${km.toFixed(0)} km` : `${km.toFixed(1)} km`;
  }

  function formatMinutes(sec) {
    if (!Number.isFinite(sec)) return "—";
    const m = Math.max(0, Math.round(sec / 60));
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return `${h} hr ${mm} min`;
  }

  // Simple in-page event bus
  const listeners = new Map();
  function on(evt, cb) {
    if (!listeners.has(evt)) listeners.set(evt, new Set());
    listeners.get(evt).add(cb);
    return () => listeners.get(evt).delete(cb);
  }
  function emit(evt, payload) {
    const set = listeners.get(evt);
    if (!set) return;
    set.forEach((cb) => {
      try {
        cb(payload);
      } catch (e) {
        console.warn("MRN listener error", evt, e);
      }
    });
  }

  function setStatus(text) {
    const el = $("maps-status");
    if (el) el.textContent = text;
  }

  function setLoading(on, text) {
    const el = $("mrn-loading");
    if (!el) return;
    // Fail-safe hide/show: some browsers/extensions can glitch the [hidden] behavior.
    if (on) {
      el.hidden = false;
      el.removeAttribute("hidden");
      el.style.display = "";
    } else {
      el.hidden = true;
      el.setAttribute("hidden", "");
      el.style.display = "none";
    }
    const t = el.querySelector(".mrn-loading__text");
    if (t && text) t.textContent = text;
  }

  function toast({ level = "warn", title, desc }) {
    const stack = $("mrn-alert-stack");
    if (!stack) return;
    const el = document.createElement("div");
    el.className = `mrn-toast mrn-toast--${level}`;
    el.innerHTML = `<p class="mrn-toast__title"></p><p class="mrn-toast__desc"></p>`;
    el.querySelector(".mrn-toast__title").textContent = title || "Alert";
    el.querySelector(".mrn-toast__desc").textContent = desc || "";
    stack.prepend(el);
    setTimeout(() => el.remove(), 6500);
  }

  function createIcon({ kind, svg, bounce = false, extraClass = "" }) {
    const cls = ["mrn-icon", kind ? `mrn-icon--${kind}` : "", bounce ? "mrn-bounce" : "", extraClass].filter(Boolean).join(" ");
    return L.divIcon({
      className: "",
      html: `<div class="${cls}">${svg}</div>`,
      iconSize: [34, 34],
      iconAnchor: [17, 17],
      popupAnchor: [0, -14],
    });
  }

  const SVG = {
    hotel:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V4h10a4 4 0 0 1 4 4v12h-2v-2H6v2H4Zm2-4h10V8a2 2 0 0 0-2-2H6v10Zm2-6h2v2H8V10Zm0 4h2v2H8v-2Zm4-4h2v2h-2V10Zm0 4h2v2h-2v-2Z"/></svg>',
    fuel:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 20V4h10v6h2l1 2v6a2 2 0 0 1-2 2h-1v-2h1v-6h-2V6H8v14H6Zm3-9h4v2H9v-2Z"/></svg>',
    warn:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 1 21h22L12 2Zm0 7 1 6h-2l1-6Zm-1 9h2v2h-2v-2Z"/></svg>',
    block:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm7.2 10a7.16 7.16 0 0 1-1 3.6L8.4 5.8A7.2 7.2 0 0 1 19.2 12ZM4.8 12a7.16 7.16 0 0 1 1-3.6l9.8 9.8A7.2 7.2 0 0 1 4.8 12Z"/></svg>',
  };

  function initMap() {
    const el = $("live-map");
    const fallback = $("map-fallback");
    if (!el || !window.L) {
      if (fallback) fallback.hidden = false;
      setStatus("Leaflet failed to load");
      return null;
    }

    const map = L.map(el, {
      zoomControl: true,
      attributionControl: true,
    });

    // OSM base layer
    const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    });
    osm.addTo(map);

    // Optional satellite layer via MapTiler (if key present)
    const mtKey = window.MTP_CONFIG && window.MTP_CONFIG.mapTilerKey;
    const layers = { osm };
    if (mtKey) {
      layers.satellite = L.tileLayer(
        `https://api.maptiler.com/tiles/satellite/{z}/{x}/{y}.jpg?key=${encodeURIComponent(mtKey)}`,
        { maxZoom: 20, attribution: '&copy; <a href="https://www.maptiler.com/">MapTiler</a>' }
      );
    }

    NS.state = {
      map,
      layers,
      baseLayer: "osm",
      user: null, // {lat,lng}
      dest: null, // destination object
      route: null, // route result
      blockers: [],
      dangerZones: [],
    };

    // Default view (Uttarakhand-ish)
    map.setView([30.3165, 78.0322], 7);
    setStatus("Ready");
    emit("map:ready", NS.state);
    return map;
  }

  NS.core = {
    $,
    clamp,
    formatKm,
    formatMinutes,
    on,
    emit,
    setStatus,
    setLoading,
    toast,
    initMap,
    createIcon,
    SVG,
  };
})();

