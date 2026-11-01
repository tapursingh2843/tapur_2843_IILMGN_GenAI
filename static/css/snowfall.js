/**
 * Snowfall alert system
 * - Detect snow from Open-Meteo weather update
 * - Toggle snowfall particles + warning toast
 */
(function () {
  "use strict";

  const MRN = window.MRN;
  if (!MRN || !MRN.core) return;

  const { $, on, toast } = MRN.core;

  let activeLevel = "";

  function setSnowParticles(on) {
    const el = $("live-map");
    if (!el) return;
    el.classList.toggle("mrn-snowing", !!on);
  }

  function snowLevel(current) {
    const code = current && Number.isFinite(current.weather_code) ? current.weather_code : 0;
    const snow = current && Number.isFinite(current.snowfall) ? current.snowfall : 0;

    const isSnowCode = [71, 73, 75, 77, 85, 86].includes(code);
    const mm = snow || 0;

    if (isSnowCode && mm >= 2.5) return "danger";
    if (isSnowCode || mm >= 0.5) return "warn";
    return "";
  }

  on("weather:updated", ({ dest, current }) => {
    const lvl = snowLevel(current);
    setSnowParticles(!!lvl);

    if (lvl && lvl !== activeLevel) {
      activeLevel = lvl;
      toast({
        level: lvl === "danger" ? "danger" : "warn",
        title: "Heavy snowfall expected",
        desc:
          lvl === "danger"
            ? `Dangerous snow conditions likely near ${dest.name}. Avoid steep roads and check closures.`
            : `Moderate snowfall possible near ${dest.name}. Drive carefully and keep extra buffer.`,
      });
    }

    if (!lvl) activeLevel = "";
  });
})();

