/**
 * Mountain Route Navigator — entrypoint
 * Wires:
 * - map init
 * - destination select -> dest:changed
 * - geolocation -> geo:updated
 */
(function () {
  "use strict";

  const MRN = window.MRN;
  if (!MRN || !MRN.core) return;

  const { on, emit, setStatus, toast } = MRN.core;

  // Destination catalog for /map page (keeps existing dropdown values working)
  const DESTINATIONS = {
    manali: { id: "manali", name: "Manali", region: "Himachal Pradesh", lat: 32.2396, lng: 77.1887, zoom: 11 },
    kedarnath: { id: "kedarnath", name: "Kedarnath", region: "Uttarakhand", lat: 30.7353, lng: 79.0669, zoom: 12 },
    badrinath: { id: "badrinath", name: "Badrinath", region: "Uttarakhand", lat: 30.7433, lng: 79.4938, zoom: 12 },
  };

  function setDest(id, customDest) {
    const d = customDest || DESTINATIONS[id];
    MRN.state.dest = d || null;
    if (!d) {
      setStatus("Search and select a destination");
      return;
    }
    setStatus(`Selected: ${d.name}`);
    MRN.state.map.flyTo([d.lat, d.lng], d.zoom || 11, { duration: 1.0 });
    emit("dest:changed", { dest: d });
  }

  function setUser(lat, lng) {
    MRN.state.user = { lat, lng };
    emit("geo:updated", { user: MRN.state.user });
  }

  function addUserMarker() {
    const map = MRN.state.map;
    if (!map) return;
    if (MRN.state._userMarker) MRN.state._userMarker.remove();

    const icon = L.divIcon({
      className: "",
      html: '<div class="mrn-loc" title="Your location"></div>',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });
    MRN.state._userMarker = L.marker([MRN.state.user.lat, MRN.state.user.lng], { icon }).addTo(map);
  }

  function requestGeo() {
    if (!navigator.geolocation) {
      toast({ level: "warn", title: "Geolocation not supported", desc: "Your browser doesn’t support location services." });
      return;
    }
    setStatus("Getting your location…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUser(pos.coords.latitude, pos.coords.longitude);
        addUserMarker();
        MRN.state.map.flyTo([pos.coords.latitude, pos.coords.longitude], 12, { duration: 1.1 });
        setStatus("Location ready");
      },
      (err) => emit("geo:error", err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 15000 }
    );
  }

  function boot() {
    const map = MRN.core.initMap();
    if (!map) return;

    if (MRN.ui && MRN.ui.wireControls) MRN.ui.wireControls();

    // Control events
    on("ui:destination", ({ id, dest }) => setDest(id, dest));
    on("ui:useLocation", () => requestGeo());

    // Initial state
    setStatus("Ready");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();

