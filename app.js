const MARTIN_URL  = "http://localhost:3000";          // Martin tile server
const TABLE       = "crimes";                         // PostGIS table name
const MAP_CENTER  = [-104.8214, 38.8339];             // Colorado Springs
const MAP_ZOOM    = 11;

// Base map
const BASEMAP_STYLE = "https://tiles.openfreemap.org/styles/dark";

// State
let map;
let allCases  = [];     // master list from Martin TileJSON
let popup     = null;
let activeId  = null;
let filters   = { season: "all", solved: "all", yearMax: 1996 };


// ─────────────────────────────────────────────────────────────────
// 1. Bootstrap — fetch case list from Martin, then init the map
// ─────────────────────────────────────────────────────────────────
async function bootstrap() {
  // Martin exposes a TileJSON endpoint for each table.
  // We also fetch a GeoJSON fallback to populate the sidebar.
  // (In production you'd use your own API; here we embed crimes.json)
  const resp = await fetch("crimes.json");
  const data = await resp.json();
  allCases   = data.cases;

  renderSidebar(allCases);
  updateStats(allCases);
  initMap();
}


// ─────────────────────────────────────────────────────────────────
// 2. Init MapLibre GL map
// ─────────────────────────────────────────────────────────────────
function initMap() {
  map = new maplibregl.Map({
    container: "map",
    style:     BASEMAP_STYLE,
    center:    MAP_CENTER,
    zoom:      MAP_ZOOM,
    maxZoom:   18,
    minZoom:   8,
  });

  map.addControl(new maplibregl.NavigationControl(), "top-right");
  map.addControl(new maplibregl.ScaleControl(), "bottom-right");

  map.on("load", addCrimeLayer);
}


// ─────────────────────────────────────────────────────────────────
// 3. Add Martin vector tile layer
// ─────────────────────────────────────────────────────────────────
function addCrimeLayer() {
  // ── Source: Martin vector tiles ──────────────────────────────
  //  Martin auto-generates a TileJSON at /TABLE
  //  Tiles are served at /TABLE/{z}/{x}/{y}
  map.addSource("crimes", {
    type: "vector",
    url:  `${MARTIN_URL}/${TABLE}`,
  });

  // ── Layer 1: Halo (larger faded circle) ──────────────────────
  map.addLayer({
    id:     "crime-halo",
    type:   "circle",
    source: "crimes",
    "source-layer": TABLE,
    paint: {
      "circle-radius": [
        "interpolate", ["linear"], ["zoom"],
        8, 8, 14, 20
      ],
      "circle-color": [
        "case",
        ["==", ["get", "solved"], true],  "#c0392b",
        "#7f8c8d"
      ],
      "circle-opacity": 0.18,
      "circle-blur": 1,
    },
  });

  // ── Layer 2: Crime points ─────────────────────────────────────
  map.addLayer({
    id:     "crime-points",
    type:   "circle",
    source: "crimes",
    "source-layer": TABLE,
    paint: {
      "circle-radius": [
        "interpolate", ["linear"], ["zoom"],
        8, 5, 14, 12
      ],
      // Red = solved, grey = unsolved, gold = mass homicide
      "circle-color": [
        "case",
        ["in", "Mass", ["get", "crime_type"]], "#f39c12",
        ["==", ["get", "solved"], true],       "#c0392b",
        "#7f8c8d"
      ],
      "circle-stroke-width": 1.5,
      "circle-stroke-color": "#fff",
      "circle-stroke-opacity": 0.6,
      "circle-opacity": 0.9,
    },
  });

  // ── Layer 3: Year label at high zoom ──────────────────────────
  map.addLayer({
    id:     "crime-labels",
    type:   "symbol",
    source: "crimes",
    "source-layer": TABLE,
    minzoom: 13,
    layout: {
      "text-field":  ["to-string", ["get", "year"]],
      "text-size":   11,
      "text-offset": [0, -1.5],
      "text-font":   ["Open Sans Bold", "Arial Unicode MS Bold"],
    },
    paint: {
      "text-color":        "#fff",
      "text-halo-color":   "#000",
      "text-halo-width":   1,
    },
  });

  // ── Interactions ──────────────────────────────────────────────
  map.on("click", "crime-points", onCrimeClick);
  map.on("mouseenter", "crime-points", () => {
    map.getCanvas().style.cursor = "pointer";
  });
  map.on("mouseleave", "crime-points", () => {
    map.getCanvas().style.cursor = "";
  });
}


// ─────────────────────────────────────────────────────────────────
// 4. Click handler — show popup
// ─────────────────────────────────────────────────────────────────
function onCrimeClick(e) {
  if (!e.features.length) return;

  const f    = e.features[0];
  const p    = f.properties;
  const lngLat = e.lngLat;

  // Highlight sidebar item
  highlightSidebarItem(p.id);

  // Close existing popup
  if (popup) popup.remove();

  const solvedLabel = p.solved
    ? '<span class="popup-solved yes">✓ Solved</span>'
    : '<span class="popup-solved no">◌ Unsolved</span>';

  popup = new maplibregl.Popup({ offset: 12, maxWidth: "320px" })
    .setLngLat(lngLat)
    .setHTML(`
      <div class="popup-inner">
        <div class="popup-episode">${p.episode || "Homicide Hunter"}</div>
        <div class="popup-title">${p.title}</div>
        <div class="popup-victim">Victim: ${p.victim || "Unknown"}</div>
        <div class="popup-grid">
          <span class="key">Year</span>       <span class="value">${p.year}</span>
          <span class="key">Type</span>       <span class="value">${p.crime_type}</span>
          <span class="key">Weapon</span>     <span class="value">${p.weapon || "—"}</span>
          <span class="key">Location</span>   <span class="value">${p.location_name}</span>
          <span class="key">Season</span>     <span class="value">S${p.season}</span>
        </div>
        <div class="popup-desc">${p.description}</div>
        ${solvedLabel}
      </div>
    `)
    .addTo(map);
}


// ─────────────────────────────────────────────────────────────────
// 5. Sidebar rendering
// ─────────────────────────────────────────────────────────────────
function renderSidebar(cases) {
  const list = document.getElementById("case-list");
  list.innerHTML = "";

  cases.forEach(c => {
    const div = document.createElement("div");
    div.className = "case-item";
    div.dataset.id = c.id;

    const tagClass = c.crime_type && c.crime_type.includes("Mass")
      ? "multi"
      : c.solved ? "solved" : "unsolved";

    const tagLabel = c.crime_type && c.crime_type.includes("Mass")
      ? "Mass"
      : c.solved ? "Solved" : "Unsolved";

    div.innerHTML = `
      <div class="case-title">${c.title}</div>
      <div class="case-meta">
        <span>${c.year}</span>
        <span class="tag ${tagClass}">${tagLabel}</span>
        <span class="tag">S${c.season}</span>
        <span>${c.neighborhood}</span>
      </div>
    `;

    div.addEventListener("click", () => flyToCase(c));
    list.appendChild(div);
  });
}


function flyToCase(c) {
  map.flyTo({ center: [c.lon, c.lat], zoom: 14, duration: 900 });
  highlightSidebarItem(c.id);

  // Simulate a click popup using case data
  if (popup) popup.remove();

  const solvedLabel = c.solved
    ? '<span class="popup-solved yes">✓ Solved</span>'
    : '<span class="popup-solved no">◌ Unsolved</span>';

  popup = new maplibregl.Popup({ offset: 12, maxWidth: "320px" })
    .setLngLat([c.lon, c.lat])
    .setHTML(`
      <div class="popup-inner">
        <div class="popup-episode">${c.episode || "Homicide Hunter"}</div>
        <div class="popup-title">${c.title}</div>
        <div class="popup-victim">Victim: ${c.victim || "Unknown"}</div>
        <div class="popup-grid">
          <span class="key">Year</span>     <span class="value">${c.year}</span>
          <span class="key">Type</span>     <span class="value">${c.crime_type}</span>
          <span class="key">Weapon</span>   <span class="value">${c.weapon || "—"}</span>
          <span class="key">Location</span> <span class="value">${c.location_name}</span>
          <span class="key">Season</span>   <span class="value">S${c.season}</span>
        </div>
        <div class="popup-desc">${c.description}</div>
        ${solvedLabel}
      </div>
    `)
    .addTo(map);
}


function highlightSidebarItem(id) {
  activeId = id;
  document.querySelectorAll(".case-item").forEach(el => {
    el.classList.toggle("active", parseInt(el.dataset.id) === parseInt(id));
  });
  // Scroll into view
  const el = document.querySelector(`.case-item[data-id="${id}"]`);
  if (el) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
}


// ─────────────────────────────────────────────────────────────────
// 6. Stats counter
// ─────────────────────────────────────────────────────────────────
function updateStats(cases) {
  document.getElementById("stat-total").textContent  = cases.length;
  document.getElementById("stat-solved").textContent =
    cases.filter(c => c.solved).length;
  document.getElementById("stat-unsolved").textContent =
    cases.filter(c => !c.solved).length;
}


// ─────────────────────────────────────────────────────────────────
// 7. Filters
// ─────────────────────────────────────────────────────────────────
function applyFilters() {
  const season = document.getElementById("filter-season").value;
  const solved = document.getElementById("filter-solved").value;
  const year   = parseInt(document.getElementById("filter-year").value);

  document.getElementById("year-label").textContent = `≤ ${year}`;

  const filtered = allCases.filter(c => {
    if (season !== "all" && String(c.season) !== season) return false;
    if (solved === "solved"   && !c.solved)  return false;
    if (solved === "unsolved" &&  c.solved)  return false;
    if (c.year > year) return false;
    return true;
  });

  // Update Martin tile filter via MapLibre expression
  if (map.getLayer("crime-points")) {
    const filterExpr = buildMapFilter(season, solved, year);
    map.setFilter("crime-points", filterExpr);
    map.setFilter("crime-halo",   filterExpr);
    map.setFilter("crime-labels", filterExpr);
  }

  renderSidebar(filtered);
  updateStats(filtered);
}

function buildMapFilter(season, solved, year) {
  const conditions = ["all", ["<=", ["get", "year"], year]];
  if (season !== "all") conditions.push(["==", ["get", "season"], parseInt(season)]);
  if (solved === "solved")   conditions.push(["==", ["get", "solved"], true]);
  if (solved === "unsolved") conditions.push(["==", ["get", "solved"], false]);
  return conditions;
}

// Wire up filter controls
document.getElementById("filter-season").addEventListener("change", applyFilters);
document.getElementById("filter-solved").addEventListener("change", applyFilters);
document.getElementById("filter-year").addEventListener("input",  applyFilters);


// ── Go! ───────────────────────────────────────────────────────────
bootstrap();
