document.addEventListener("DOMContentLoaded", async () => {
  const grid = document.getElementById("rest-grid");
  const tpl = document.getElementById("rest-card-template").content;
  const countEl = document.getElementById("results-count");

  const searchInput = document.getElementById("rest-search");
  const priceFilter = document.getElementById("price-filter");
  const priceDisplay = document.getElementById("price-display");
  const ratingFilter = document.getElementById("rating-filter");
  const ratingDisplay = document.getElementById("rating-display");
  const cuisineFilters = Array.from(document.querySelectorAll(".cuisine-filter"));
  const sortSelect = document.getElementById("rest-sort");

  let allRests = [];

  // Fetch restaurants
  try {
    const res = await fetch("/api/restaurants");
    allRests = await res.json();
    renderRests();
  } catch (err) {
    grid.innerHTML = `<p style="color:var(--muted)">Failed to load restaurants. Please try again.</p>`;
  }

  function renderRests() {
    const q = searchInput.value.toLowerCase().trim();
    const maxP = Number(priceFilter.value);
    const minR = Number(ratingFilter.value);
    const selectedCuisines = cuisineFilters.filter(c => c.checked).map(c => c.value);

    let filtered = allRests.filter(r => {
      const matchSearch = r.name.toLowerCase().includes(q) || (r.location_name && r.location_name.toLowerCase().includes(q));
      const matchPrice = r.average_price <= maxP;
      const matchRating = r.rating >= minR;
      
      // Match if selected cuisines is empty OR if the restaurant's cuisine exactly matches one of the selected ones
      // Or matches partial (like Tibetan matching Chinese / Tibetan conceptually, but we can stick to exact string match for simplicity)
      const matchCuisine = selectedCuisines.length === 0 || (r.cuisine_type && selectedCuisines.some(c => r.cuisine_type.includes(c)));
      
      return matchSearch && matchPrice && matchRating && matchCuisine;
    });

    // Sorting
    const sort = sortSelect.value;
    if (sort === "price-low") filtered.sort((a, b) => a.average_price - b.average_price);
    else if (sort === "price-high") filtered.sort((a, b) => b.average_price - a.average_price);
    else if (sort === "rating") filtered.sort((a, b) => b.rating - a.rating);

    grid.innerHTML = "";
    if (filtered.length === 0) {
      grid.innerHTML = `<p class="muted" style="padding: 2rem;">No restaurants found matching your criteria.</p>`;
      countEl.textContent = "0 restaurants found";
      return;
    }

    countEl.textContent = `Showing ${filtered.length} restaurants`;

    filtered.forEach(r => {
      const card = document.importNode(tpl, true);
      card.querySelector("img").src = r.image || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80";
      card.querySelector(".rest-card__badge").textContent = r.cuisine_type || "Cafe";
      card.querySelector(".rest-card__title").textContent = r.name;
      card.querySelector(".loc-text").textContent = r.location_name || r.destination_id;
      card.querySelector(".rest-card__price").textContent = "₹" + r.average_price + " avg";
      card.querySelector(".rating").textContent = `★ ${r.rating}`;
      card.querySelector(".hours-text").textContent = r.opening_hours || "08:00 AM - 10:00 PM";
      card.querySelector(".contact-text").textContent = `📞 ${r.contact_number || '+91 8000000000'}`;
      
      const tagsContainer = card.querySelector(".rest-card__tags");
      if (r.tags && r.tags.length > 0) {
        r.tags.forEach(t => {
          const span = document.createElement("span");
          span.className = "rest-tag";
          span.textContent = t;
          tagsContainer.appendChild(span);
        });
      }

      // Map button integration
      card.querySelector(".map-btn").addEventListener("click", () => {
        window.open(`https://www.openstreetmap.org/?mlat=${r.lat}&mlon=${r.lng}#map=17/${r.lat}/${r.lng}`, "_blank");
      });

      card.querySelector(".reserve-btn").addEventListener("click", () => {
        alert(`Table reservation for ${r.name} would open here.`);
      });

      grid.appendChild(card);
    });
  }

  // Bind events
  searchInput.addEventListener("input", renderRests);
  priceFilter.addEventListener("input", (e) => {
    priceDisplay.textContent = "₹" + Number(e.target.value).toLocaleString("en-IN");
    renderRests();
  });
  ratingFilter.addEventListener("input", (e) => {
    ratingDisplay.textContent = Number(e.target.value).toFixed(1);
    renderRests();
  });
  cuisineFilters.forEach(c => c.addEventListener("change", renderRests));
  sortSelect.addEventListener("change", renderRests);
});
