/**
 * UI binder for existing controls.
 * Keeps all existing buttons/IDs working:
 * - dest-select
 * - use-location-btn
 * - clear-route-btn
 * - traffic-toggle
 * - alt-routes-toggle
 */
(function () {
  "use strict";

  const MRN = window.MRN;
  if (!MRN || !MRN.core) return;

  const { $, emit, on, setStatus, toast } = MRN.core;

  function wireControls() {
    const destSearch = $("dest-search");
    const destSuggestions = $("dest-suggestions");
    const useLocBtn = $("use-location-btn");
    const clearBtn = $("clear-route-btn");
    const trafficToggle = $("traffic-toggle");
    const altToggle = $("alt-routes-toggle");

    if (destSearch && destSuggestions) {
      let debounceTimeout;
      destSearch.addEventListener("input", (e) => {
        clearTimeout(debounceTimeout);
        const query = e.target.value.trim();
        if (query.length < 3) {
          destSuggestions.style.display = "none";
          return;
        }
        
        debounceTimeout = setTimeout(async () => {
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ", Uttarakhand, India")}&format=json&limit=5`);
            const data = await res.json();
            
            destSuggestions.innerHTML = "";
            if (data.length === 0) {
              destSuggestions.style.display = "none";
              return;
            }
            
            data.forEach((item) => {
              const li = document.createElement("li");
              li.style.padding = "0.75rem 1rem";
              li.style.cursor = "pointer";
              li.style.borderBottom = "1px solid #3d424e";
              li.style.color = "#f3f4f6";
              
              const name = item.display_name.split(",")[0];
              const context = item.display_name.split(",").slice(1, 3).join(", ");
              li.innerHTML = `<strong>${name}</strong><br><small style="color: #9ca3af">${context}</small>`;
              
              li.addEventListener("mouseenter", () => li.style.background = "#3d424e");
              li.addEventListener("mouseleave", () => li.style.background = "transparent");
              
              li.addEventListener("click", () => {
                destSearch.value = name;
                destSuggestions.style.display = "none";
                emit("ui:destination", {
                  dest: {
                    id: "custom",
                    name: name,
                    lat: parseFloat(item.lat),
                    lng: parseFloat(item.lon),
                    zoom: 13
                  }
                });
              });
              destSuggestions.appendChild(li);
            });
            destSuggestions.style.display = "block";
          } catch (err) {
            console.error("Geocoding failed", err);
          }
        }, 500);
      });
      
      document.addEventListener("click", (e) => {
        if (!destSearch.contains(e.target) && !destSuggestions.contains(e.target)) {
          destSuggestions.style.display = "none";
        }
      });
    }

    if (useLocBtn) {
      useLocBtn.addEventListener("click", () => emit("ui:useLocation", {}));
    }

    if (clearBtn) {
      clearBtn.addEventListener("click", () => emit("ui:clearRoute", {}));
    }

    if (trafficToggle) {
      trafficToggle.addEventListener("change", () => emit("ui:traffic", { on: !!trafficToggle.checked }));
    }

    if (altToggle) {
      altToggle.addEventListener("change", () => emit("ui:altRoutes", { on: !!altToggle.checked }));
    }
  }

  // Soft guidance if geolocation is blocked
  on("geo:error", (err) => {
    setStatus("Location blocked");
    toast({
      level: "warn",
      title: "Location permission denied",
      desc: (err && err.message) || "Allow location access to draw routes from your current position.",
    });
  });

  // Fail-safe: if a route is chosen/cleared, loading must be off.
  on("route:chosen", () => MRN.core.setLoading(false));
  on("route:cleared", () => MRN.core.setLoading(false));
  on("map:ready", () => MRN.core.setLoading(false));

  MRN.ui = { wireControls };
})();

