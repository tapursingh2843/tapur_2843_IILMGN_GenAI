/**
 * Weather system (Open-Meteo, no key)
 * - Fetch current weather for destination
 * - Show glass weather card + icon marker
 */
(function () {
  "use strict";

  const MRN = window.MRN;
  if (!MRN || !MRN.core) return;

  const { $, on, emit, toast, createIcon, SVG } = MRN.core;

  let marker = null;
  let lastDestId = "";

  function weatherEmoji(code) {
    // Open-Meteo WMO codes (subset)
    if ([71, 73, 75, 77, 85, 86].includes(code)) return "❄";
    if ([95, 96, 99].includes(code)) return "⛈";
    if ([61, 63, 65, 80, 81, 82].includes(code)) return "🌧";
    if ([45, 48].includes(code)) return "🌫";
    if ([1, 2, 3].includes(code)) return "⛅";
    return "☀";
  }

  function renderCard(dest, current) {
    const el = $("mrn-weather-card");
    if (!el) return;
    if (!dest || !current) {
      el.hidden = true;
      return;
    }

    const temp = current.temperature_2m;
    const hum = current.relative_humidity_2m;
    const wind = current.wind_speed_10m;
    const visM = current.visibility;
    const code = current.weather_code;
    const snow = current.snowfall;

    const visKm = Number.isFinite(visM) ? (visM / 1000).toFixed(visM >= 10000 ? 0 : 1) : "—";
    const e = weatherEmoji(code);

    el.innerHTML = `
      <div class="mrn-weather-card__row">
        <div>
          <div class="mrn-weather-card__title">${e} ${dest.name}</div>
          <div class="mrn-weather-card__meta">Current mountain weather • updates live</div>
        </div>
        <div style="font-weight:900;font-size:1.2rem">${Number.isFinite(temp) ? Math.round(temp) + "°C" : "—"}</div>
      </div>
      <div class="mrn-weather-grid">
        <div class="mrn-pill"><b>Humidity</b><span>${Number.isFinite(hum) ? hum + "%" : "—"}</span></div>
        <div class="mrn-pill"><b>Wind</b><span>${Number.isFinite(wind) ? Math.round(wind) + " km/h" : "—"}</span></div>
        <div class="mrn-pill"><b>Visibility</b><span>${visKm} km</span></div>
        <div class="mrn-pill"><b>Snowfall</b><span>${Number.isFinite(snow) ? snow.toFixed(1) + " mm" : "—"}</span></div>
      </div>
    `;
    el.hidden = false;

    emit("weather:updated", { dest, current });
  }

  async function fetchWeather(dest) {
    const url =
      "https://api.open-meteo.com/v1/forecast" +
      `?latitude=${encodeURIComponent(dest.lat)}` +
      `&longitude=${encodeURIComponent(dest.lng)}` +
      "&current=temperature_2m,relative_humidity_2m,wind_speed_10m,visibility,weather_code,snowfall" +
      "&timezone=auto";

    const r = await fetch(url, { headers: { Accept: "application/json" } });
    if (!r.ok) throw new Error("Weather fetch failed");
    const j = await r.json();
    return j && j.current ? j.current : null;
  }

  function upsertMarker(dest, current) {
    if (!MRN.state || !MRN.state.map || !dest) return;
    const map = MRN.state.map;

    const code = current && Number.isFinite(current.weather_code) ? current.weather_code : 0;
    const isSnow = [71, 73, 75, 77, 85, 86].includes(code);
    const kind = isSnow ? "warn" : "hotel"; // teal glow default; warn glow on snow
    const icon = createIcon({
      kind,
      bounce: true,
      svg: `<span style="font-weight:900">${weatherEmoji(code)}</span>`,
      extraClass: "mrn-icon--weather",
    });

    if (marker) marker.remove();
    marker = L.marker([dest.lat, dest.lng], { icon }).addTo(map);
    marker.bindPopup(
      `<div style="min-width:220px">
        <div style="font-weight:900;margin-bottom:6px">${dest.name} weather</div>
        <div style="color:#64748b">Temp: <b>${current && Number.isFinite(current.temperature_2m) ? Math.round(current.temperature_2m) + "°C" : "—"}</b></div>
        <div style="color:#64748b">Wind: <b>${current && Number.isFinite(current.wind_speed_10m) ? Math.round(current.wind_speed_10m) + " km/h" : "—"}</b></div>
      </div>`,
      { closeButton: true }
    );
  }

  on("dest:changed", async ({ dest }) => {
    if (!dest || dest.id === lastDestId) return;
    lastDestId = dest.id;

    try {
      const current = await fetchWeather(dest);
      renderCard(dest, current);
      upsertMarker(dest, current);
    } catch (e) {
      renderCard(null, null);
      toast({ level: "warn", title: "Weather unavailable", desc: "Could not fetch live weather right now." });
    }
  });
})();

