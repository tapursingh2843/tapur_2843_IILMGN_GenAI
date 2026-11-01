/**
 * Trip planner: builds day-wise timeline and cost breakdown from JSON destination data.
 */
(function () {
  "use strict";

  const TRIPS_KEY = "mtp_trips_v1";

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeJSON(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  }

  function getDestinations() {
    const el = document.getElementById("planner-destinations");
    if (!el) return [];
    try {
      return JSON.parse(el.textContent);
    } catch {
      return [];
    }
  }



  function renderCostBreakdown(budget) {
    const bars = document.getElementById("cost-bars");
    const list = document.getElementById("cost-list");
    const panel = document.getElementById("cost-breakdown");
    if (!bars || !list || !panel) return;
    if (!Number.isFinite(budget) || budget <= 0) return;

    // Required split: Stay 40%, Food 30%, Travel 30%
    const stay = Math.round(budget * 0.4);
    const food = Math.round(budget * 0.3);
    const travel = Math.max(0, budget - stay - food);

    const tPct = (travel / budget) * 100;
    const sPct = (stay / budget) * 100;
    const fPct = (food / budget) * 100;
    bars.innerHTML = `
      <span class="cost-bar cost-bar--travel" style="width:${tPct}%"></span>
      <span class="cost-bar cost-bar--stay" style="width:${sPct}%"></span>
      <span class="cost-bar cost-bar--food" style="width:${fPct}%"></span>
    `;
    list.innerHTML = `
      <li><span>Travel &amp; local transport</span><strong>₹${travel.toLocaleString("en-IN")}</strong></li>
      <li><span>Stay (est.)</span><strong>₹${stay.toLocaleString("en-IN")}</strong></li>
      <li><span>Food &amp; trail snacks</span><strong>₹${food.toLocaleString("en-IN")}</strong></li>
    `;
    panel.hidden = false;
  }

  function simulateWeatherText(destName) {
    const d = (destName || "").toLowerCase();
    if (d.includes("uttarakhand") || d.includes("rishikesh") || d.includes("haridwar") || d.includes("kedarnath") || d.includes("badrinath")) {
      return "18°C, Light Rain";
    }
    if (d.includes("manali") || d.includes("himachal")) {
      return "12°C, Clear Skies";
    }
    if (d.includes("goa")) {
      return "29°C, Sunny";
    }
    if (d.includes("kashmir") || d.includes("gulmarg")) {
      return "8°C, Cold Breeze";
    }
    return "22°C, Pleasant";
  }

  function bestTimeToVisit(destName) {
    const d = (destName || "").toLowerCase();
    if (d.includes("uttarakhand")) return "March to June";
    if (d.includes("manali")) return "April to July";
    if (d.includes("goa")) return "November to February";
    if (d.includes("kedarnath") || d.includes("badrinath")) return "May to October";
    return "March to October";
  }

  function updateTripSummaryCard(dest, days, budget) {
    const card = document.getElementById("trip-summary-card");
    const badge = document.getElementById("trip-summary-badge");
    const loading = document.getElementById("trip-summary-loading");

    const destEl = document.getElementById("summary-destination");
    const budgetEl = document.getElementById("summary-budget");
    const daysEl = document.getElementById("summary-days");
    const weatherEl = document.getElementById("summary-weather");
    const bestTimeEl = document.getElementById("summary-best-time");

    const bars = document.getElementById("summary-bars");
    const list = document.getElementById("summary-list");

    if (!card) return;

    const setSummaryLoading = (on) => {
      if (!loading) return;
      // Fail-safe: some CSS/extension glitches can keep overlays visible.
      if (on) {
        loading.hidden = false;
        loading.removeAttribute("hidden");
        loading.style.display = "";
      } else {
        loading.hidden = true;
        loading.setAttribute("hidden", "");
        loading.style.display = "none";
      }
    };

    // Optional loading state for nicer UX
    setSummaryLoading(true);
    if (badge) badge.textContent = "Working…";

    window.setTimeout(() => {
      try {
        const safeINR = (n) => {
          const num = Number(n);
          return Number.isFinite(num) ? num.toLocaleString("en-IN") : "—";
        };

        const destLabel = dest && dest.name ? dest.name : "—";
        const stateLabel = dest && dest.state ? ` (${dest.state})` : "";

        if (destEl) destEl.textContent = `${destLabel}${stateLabel}`;
        if (budgetEl) budgetEl.textContent = Number.isFinite(Number(budget)) ? `₹${safeINR(budget)}` : "—";
        if (daysEl) daysEl.textContent = Number.isFinite(Number(days)) ? `${days} day${days === 1 ? "" : "s"}` : "—";

        if (weatherEl) weatherEl.textContent = simulateWeatherText(`${destLabel} ${dest && dest.state ? dest.state : ""}`);
        if (bestTimeEl) bestTimeEl.textContent = bestTimeToVisit(`${destLabel} ${dest && dest.state ? dest.state : ""}`);

        // Budget breakdown (Stay 40 / Food 30 / Travel 30)
        const b = Number(budget);
        if (Number.isFinite(b) && b > 0) {
          const stay = Math.round(b * 0.4);
          const food = Math.round(b * 0.3);
          const travel = Math.max(0, b - stay - food);

          const tPct = (travel / b) * 100;
          const sPct = (stay / b) * 100;
          const fPct = (food / b) * 100;

          if (bars) {
            bars.innerHTML = `
              <span class="cost-bar cost-bar--travel" style="width:${tPct}%"></span>
              <span class="cost-bar cost-bar--stay" style="width:${sPct}%"></span>
              <span class="cost-bar cost-bar--food" style="width:${fPct}%"></span>
            `;
          }

          if (list) {
            list.innerHTML = `
              <li><span>Stay (est.)</span><strong>₹${safeINR(stay)}</strong></li>
              <li><span>Food</span><strong>₹${safeINR(food)}</strong></li>
              <li><span>Travel</span><strong>₹${safeINR(travel)}</strong></li>
            `;
          }
        }

        if (badge) badge.textContent = "Updated";

        card.classList.remove("is-updating");
        // Force reflow so animation re-triggers even on repeated clicks
        void card.offsetWidth;
        card.classList.add("is-updating");

        window.setTimeout(() => {
          if (badge) badge.textContent = "Ready";
          card.classList.remove("is-updating");
        }, 900);
      } catch (err) {
        console.warn("Trip summary update failed", err);
        if (badge) badge.textContent = "Ready";
      } finally {
        setSummaryLoading(false);
      }
    }, 450);
  }



  function saveTripSummary(dest, days, budget) {
    const trips = readJSON(TRIPS_KEY, []);
    trips.unshift({
      title: `${dest.name} · ${days} days`,
      summary: `Budget ₹${budget.toLocaleString("en-IN")} · ${dest.difficulty} · ${dest.type}`,
      at: Date.now(),
    });
    writeJSON(TRIPS_KEY, trips.slice(0, 12));
  }

  function hidePlannerOutput() {
    const itin = document.getElementById("itinerary-panel");
    if (itin) itin.hidden = true;
  }

  document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("planner-form");
    if (!form) return;

    // Ensure spinner never persists across reloads.
    const loading = document.getElementById("trip-summary-loading");
    if (loading) {
      loading.hidden = true;
      loading.setAttribute("hidden", "");
      loading.style.display = "none";
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const slug = document.getElementById("planner-destination").value;
      const budget = Number(document.getElementById("planner-budget").value);
      const days = Number(document.getElementById("planner-days").value);
      const destinations = getDestinations();
      const dest = destinations.find((d) => d.slug === slug);
      const hint = document.getElementById("planner-hint");

      if (!dest) {
        if (hint) hint.textContent = "Pick a destination to generate your plan.";
        hidePlannerOutput();
        return;
      }

      if (!Number.isFinite(budget) || budget <= 0) {
        if (hint) hint.textContent = "Enter a valid total budget (₹).";
        hidePlannerOutput();
        return;
      }

      if (!Number.isFinite(days) || days < 1 || days > 21) {
        if (hint) hint.textContent = "Choose between 1 and 21 days.";
        hidePlannerOutput();
        return;
      }

      if (budget < dest.budget_min && hint) {
        hint.textContent = `Typical spend for ${dest.name} starts near ₹${dest.budget_min.toLocaleString("en-IN")}—numbers below are illustrative.`;
      } else if (hint) {
        hint.textContent = "Estimates use static splits—adjust on the ground with local guides.";
      }


      updateTripSummaryCard(dest, days, budget);
      saveTripSummary(dest, days, budget);
    });
  });
})();
