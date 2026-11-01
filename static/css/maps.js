/**
 * Google Maps: user location, directions to destination, markers for hotels,
 * trek start, and checkpoints with info windows.
 */
(function () {
  "use strict";

  function getPageData() {
    const el = document.getElementById("page-data");
    if (!el) return null;
    try {
      return JSON.parse(el.textContent);
    } catch {
      return null;
    }
  }

  function waitForMaps(cb) {
    if (window.google && window.google.maps) {
      cb();
      return;
    }
    const iv = setInterval(() => {
      if (window.google && window.google.maps) {
        clearInterval(iv);
        cb();
      }
    }, 50);
    setTimeout(() => clearInterval(iv), 15000);
  }

  function main() {
    const data = getPageData();
    const key = window.MTP_CONFIG && window.MTP_CONFIG.mapsApiKey;
    if (!data || !key) return;

    const dest = data.destination;
    if (!dest || !Number.isFinite(Number(dest.lat)) || !Number.isFinite(Number(dest.lng))) return;

    const hotels = data.hotels || [];
    const checkpoints = data.checkpoints || [];
    const trekStart = dest.trek_start;

    const mapEl = document.getElementById("destination-map");
    if (!mapEl) return;

    const center = { lat: Number(dest.lat), lng: Number(dest.lng) };
    const g = window.google.maps;
    const map = new g.Map(mapEl, {
      center,
      zoom: 11,
      mapTypeId: "terrain",
      fullscreenControl: true,
    });

    const info = new g.InfoWindow();
    const bounds = new g.LatLngBounds();
    bounds.extend(center);

    function attachMarker(position, title, html, iconColor) {
      const marker = new g.Marker({
        position,
        map,
        title,
        icon: iconColor
          ? {
              path: g.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: iconColor,
              fillOpacity: 0.95,
              strokeColor: "#0f172a",
              strokeWeight: 1,
            }
          : undefined,
      });
      marker.addListener("click", () => {
        info.setContent(html);
        info.open({ map, anchor: marker });
      });
      bounds.extend(position);
      return marker;
    }

    // Destination
    attachMarker(
      center,
      dest.name,
      `<div style="max-width:220px"><strong>${dest.name}</strong><br><span style="color:#64748b">${dest.altitude_m} m · ${dest.difficulty}</span></div>`,
      "#0d9488"
    );

    // Trek start
    if (trekStart && trekStart.lat) {
      attachMarker(
        { lat: Number(trekStart.lat), lng: Number(trekStart.lng) },
        trekStart.name,
        `<div><strong>Trek start</strong><br>${trekStart.name}</div>`,
        "#f59e0b"
      );
    }

    // Hotels
    hotels.forEach((h) => {
      attachMarker(
        { lat: Number(h.lat), lng: Number(h.lng) },
        h.name,
        `<div><strong>${h.name}</strong><br>₹${Number(h.price_per_night).toLocaleString("en-IN")}/night · ★${h.rating}</div>`,
        "#38bdf8"
      );
    });

    // Checkpoints
    checkpoints.forEach((c) => {
      attachMarker(
        { lat: Number(c.lat), lng: Number(c.lng) },
        c.name,
        `<div><strong>${c.name}</strong><br>Stage ${c.order}</div>`,
        "#a78bfa"
      );
    });

    map.fitBounds(bounds);

    // User location + directions
    const directionsService = new g.DirectionsService();
    const directionsRenderer = new g.DirectionsRenderer({
      map,
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: "#f43f5e",
        strokeOpacity: 0.9,
        strokeWeight: 4,
      },
    });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const user = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          attachMarker(
            user,
            "You are here",
            `<div><strong>Your location</strong><br>Approximate position from browser geolocation.</div>`,
            "#22c55e"
          );

          directionsService.route(
            {
              origin: user,
              destination: center,
              travelMode: g.TravelMode.DRIVING,
            },
            (result, status) => {
              if (status === "OK" && result) {
                directionsRenderer.setDirections(result);
              }
              // If driving route fails (e.g., impassable roads), try straight-line guidance message only
              else {
                console.warn("Directions request:", status);
              }
            }
          );
        },
        () => {
          /* Geolocation denied — map still shows destination markers */
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }
  }

  waitForMaps(main);
})();
