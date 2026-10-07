// CAMPUS DATA
const campusData = {
  floor6: { name: "6th Floor", locations: [
    ["floor6-lobby", "Lobby"], ["floor6-principal", "Principal Room"], ["floor6-meeting", "Meeting Room"], ["floor6-accounts", "Accounts"], ["floor6-documents", "Documents"], ["floor6-waiting", "Waiting Room"], ["floor6-promotion", "Promotion Team Room"], ["floor6-bba-faculty-1", "BBA Faculty 1"], ["floor6-bba-faculty-2", "BBA Faculty 2"], ["floor6-601", "601"], ["floor6-602", "602"], ["floor6-603", "603"], ["floor6-604", "604"], ["floor6-605", "605"], ["floor6-606", "606"], ["floor6-607", "607"], ["floor6-608", "608"], ["floor6-609", "609"], ["floor6-boys-washroom", "Boys Washroom"], ["floor6-girls-washroom", "Girls Washroom"], ["floor6-faculty-washroom", "Faculty Washroom"], ["floor6-emergency-stairs", "Emergency Exit Stairs"], ["floor6-cafeteria", "Cafeteria"]
  ]},
  floor7: { name: "7th Floor", locations: [
    ["floor7-cse-faculty", "CSE Faculty Room 1"], ["floor7-cse-faculty-2", "CSE Faculty Room 2"], ["floor7-lobby", "Lobby"], ["floor7-lab-714", "Lab Room 714"], ["floor7-lab-715", "Lab Room 715"], ["floor7-digital-lab-713", "Digital Lab Room 713"], ["floor7-mba-career", "MBA Career Room"], ["floor7-library", "Library"], ["floor7-701", "701"], ["floor7-702", "702"], ["floor7-704", "704"], ["floor7-rnd", "R&D Room"], ["floor7-706", "706"], ["floor7-thm-lab", "THM Lab"], ["floor7-711", "711"], ["floor7-mba-faculty", "MBA Faculty Room"], ["floor7-thm-faculty", "THM Faculty Room"], ["floor7-carrom", "Carrom Place"], ["floor7-womens-prayer", "Women's Prayer Room"], ["floor7-stationery", "Stationery"], ["floor7-it-room", "IT Room"], ["floor7-female-washroom", "Female Washroom"], ["floor7-male-washroom", "Male Washroom"], ["floor7-faculty-washroom", "Faculty Washroom"], ["floor7-emergency-stairways", "Emergency Stairways"]
  ]},
  rooftop: { name: "Rooftop", locations: [["rooftop-main", "Rooftop"]] },
  auditorium: { name: "71 Milonayoton Auditorium", locations: [["auditorium-71-milonayoton", "71 Milonayoton Auditorium"]] }
};

const STORAGE_KEY = "campusExplorerVisited";
const THEME_KEY = "campusExplorerTheme";
const groupIds = Object.keys(campusData);
const allLocations = groupIds.flatMap(floor => campusData[floor].locations.map(([id, name]) => ({ id, name, floor })));
const locationById = new Map(allLocations.map(location => [location.id, location]));
const selectedIds = new Set();
let lastFocused = null;

const ui = {
  list: document.querySelector("#locationList"), search: document.querySelector("#searchInput"),
  overall: document.querySelector("#overallCount"), mobileCount: document.querySelector("#mobileCount"),
  progress: document.querySelector("#progressPercent"), level: document.querySelector("#levelLabel"),
  progressBar: document.querySelector("#progressBar"), progressFill: document.querySelector("#progressFill"),
  mapLocationCount: document.querySelector("#mapLocationCount"), tooltip: document.querySelector("#mapTooltip"),
  confirmModal: document.querySelector("#confirmModal"), resultModal: document.querySelector("#resultModal")
};

function escapeHTML(value) { return value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]); }

function buildLocationList() {
  ui.list.innerHTML = groupIds.map(floor => {
    const data = campusData[floor];
    const chips = data.locations.map(([id, name]) => `<button class="place-chip" type="button" data-location-id="${id}" aria-pressed="false"><span class="chip-check" aria-hidden="true">✓</span><span>${escapeHTML(name)}</span></button>`).join("");
    return `<section class="floor-group" data-list-floor="${floor}"><div class="floor-group-heading"><span>${escapeHTML(data.name)}</span><span class="group-count" data-group-count="${floor}">0/${data.locations.length}</span></div><div class="chip-grid">${chips}</div></section>`;
  }).join("");
}

// LOCAL STORAGE
function saveProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...selectedIds]));
    localStorage.setItem(THEME_KEY, document.body.classList.contains("dark") ? "dark" : "light");
  } catch (error) { console.warn("Campus Explorer could not save progress.", error); }
}

function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    // Accept the previous version's { selected, floor } shape as well as the current ID array.
    const savedIds = Array.isArray(saved) ? saved : saved && Array.isArray(saved.selected) ? saved.selected : [];
    savedIds.filter(id => locationById.has(id)).forEach(id => selectedIds.add(id));
    if (localStorage.getItem(THEME_KEY) === "dark") document.body.classList.add("dark");
  } catch (error) { console.warn("Campus Explorer could not restore saved progress.", error); }
}

function levelFor(count) {
  const total = allLocations.length;
  if (count === total) return "Campus Legend 👑";
  if (count >= 40) return "Campus Veteran 🎓";
  if (count >= 30) return "Campus Pro 😎";
  if (count >= 20) return "Campus Explorer 🧭";
  if (count >= 10) return "Campus Visitor 🚶";
  return "New Student 🌱";
}

// COUNTERS
function updateCounters() {
  const total = selectedIds.size;
  const placeTotal = allLocations.length;
  const percent = Math.round(total / placeTotal * 100);
  const countText = `${total} / ${placeTotal}`;
  ui.overall.textContent = countText;
  ui.mobileCount.textContent = countText;
  ui.progress.textContent = `Campus explored: ${percent}%`;
  ui.level.textContent = levelFor(total);
  ui.progressFill.style.width = `${percent}%`;
  ui.progressBar.setAttribute("aria-valuemax", String(placeTotal));
  ui.progressBar.setAttribute("aria-valuenow", String(total));
  ui.progressBar.setAttribute("aria-valuetext", `${percent}% explored`);
  ui.mapLocationCount.textContent = `${placeTotal} places`;
  groupIds.forEach(floor => {
    const groupTotal = campusData[floor].locations.length;
    const groupSelected = campusData[floor].locations.reduce((sum, [id]) => sum + Number(selectedIds.has(id)), 0);
    document.querySelector(`[data-group-count="${floor}"]`).textContent = `${groupSelected}/${groupTotal}`;
  });
  updateResultCard(total, percent);
}

function updateUI() {
  document.querySelectorAll(".place-chip").forEach(button => {
    const selected = selectedIds.has(button.dataset.locationId);
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  document.querySelectorAll(".map-location").forEach(area => {
    const selected = selectedIds.has(area.dataset.locationId);
    area.classList.toggle("selected", selected);
    area.setAttribute("aria-pressed", String(selected));
  });
  updateCounters();
}

// LOCATION SELECTION
function selectLocation(id) {
  if (!locationById.has(id)) return;
  selectedIds.add(id);
  updateUI();
  saveProgress();
}
function toggleLocation(id) {
  if (!locationById.has(id)) return;
  if (selectedIds.has(id)) selectedIds.delete(id); else selectedIds.add(id);
  updateUI();
  saveProgress();
}

// SEARCH
function filterLocations(query) {
  const normalized = query.trim().toLocaleLowerCase();
  let visibleCount = 0;
  document.querySelectorAll(".floor-group").forEach(group => {
    let groupVisible = 0;
    group.querySelectorAll(".place-chip").forEach(chip => {
      const visible = chip.textContent.toLocaleLowerCase().includes(normalized);
      chip.hidden = !visible;
      if (visible) groupVisible++;
    });
    group.hidden = groupVisible === 0;
    visibleCount += groupVisible;
  });
  ui.list.querySelector(".empty-search")?.remove();
  if (normalized && visibleCount === 0) ui.list.insertAdjacentHTML("beforeend", '<p class="empty-search">No places match that search.</p>');
}

// MAP INTERACTIONS
function showTooltip(target, event) {
  const location = locationById.get(target.dataset.locationId);
  if (!location) return;
  ui.tooltip.textContent = location.name;
  ui.tooltip.hidden = false;
  if (event && Number.isFinite(event.clientX)) {
    ui.tooltip.style.left = `${Math.min(event.clientX, window.innerWidth - 150)}px`;
    ui.tooltip.style.top = `${Math.min(event.clientY, window.innerHeight - 45)}px`;
  } else {
    const rect = target.getBoundingClientRect();
    ui.tooltip.style.left = `${Math.min(rect.left + rect.width / 2, window.innerWidth - 150)}px`;
    ui.tooltip.style.top = `${rect.top + rect.height / 2}px`;
  }
}
function hideTooltip() { ui.tooltip.hidden = true; }

// RESULT MODAL
function updateResultCard(total = selectedIds.size, percent = Math.round(selectedIds.size / allLocations.length * 100)) {
  document.querySelector("#resultCount").textContent = `${total} / ${allLocations.length}`;
  document.querySelector("#resultPercent").textContent = `${percent}% EXPLORED`;
  document.querySelector("#resultLevel").textContent = levelFor(total);
  document.querySelector("#resultFill").style.width = `${percent}%`;
}
function openModal(modal) {
  lastFocused = document.activeElement;
  modal.hidden = false;
  modal.querySelector("button")?.focus();
  document.body.style.overflow = "hidden";
}
function closeModal(modal) {
  modal.hidden = true;
  document.body.style.overflow = "";
  lastFocused?.focus();
}
function resultText() {
  const total = selectedIds.size;
  const percent = Math.round(total / allLocations.length * 100);
  return `I have explored ${total}/${allLocations.length} places on campus (${percent}%)!\nMy level: ${levelFor(total)}`;
}

// THEME
function updateThemeButtons() {
  const dark = document.body.classList.contains("dark");
  ["#themeToggle", "#themeToggleMobile"].forEach(selector => {
    const button = document.querySelector(selector);
    if (!button) return;
    button.querySelector("span").textContent = dark ? "☀" : "☾";
    button.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
    button.title = dark ? "Switch to light theme" : "Switch to dark theme";
  });
}

buildLocationList();
loadProgress();
updateThemeButtons();
updateUI();

ui.list.addEventListener("click", event => {
  const chip = event.target.closest(".place-chip");
  if (chip) toggleLocation(chip.dataset.locationId);
});
document.querySelectorAll(".map-location").forEach(area => {
  area.addEventListener("click", () => toggleLocation(area.dataset.locationId));
  area.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); toggleLocation(area.dataset.locationId); }
  });
  area.addEventListener("pointerenter", event => showTooltip(area, event));
  area.addEventListener("pointermove", event => showTooltip(area, event));
  area.addEventListener("pointerleave", hideTooltip);
  area.addEventListener("focus", () => showTooltip(area));
  area.addEventListener("blur", hideTooltip);
});
ui.search.addEventListener("input", event => filterLocations(event.target.value));
document.querySelector("#selectAll").addEventListener("click", () => {
  allLocations.forEach(({ id }) => selectedIds.add(id));
  updateUI(); saveProgress();
});
document.querySelector("#clearAll").addEventListener("click", () => {
  if (selectedIds.size) openModal(ui.confirmModal);
});
document.querySelector("#confirmClear").addEventListener("click", () => {
  selectedIds.clear(); updateUI(); saveProgress(); closeModal(ui.confirmModal);
});
document.querySelector("#viewResult").addEventListener("click", () => openModal(ui.resultModal));
document.querySelectorAll("[data-close-modal]").forEach(button => button.addEventListener("click", () => closeModal(button.closest(".modal-backdrop"))));
document.querySelectorAll(".modal-backdrop").forEach(backdrop => backdrop.addEventListener("click", event => { if (event.target === backdrop) closeModal(backdrop); }));
document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    const open = [ui.confirmModal, ui.resultModal].find(modal => !modal.hidden);
    if (open) closeModal(open);
  }
  if (event.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) { event.preventDefault(); ui.search.focus(); }
});
document.querySelector("#copyResult").addEventListener("click", async () => {
  const status = document.querySelector("#copyStatus");
  try { await navigator.clipboard.writeText(resultText()); status.textContent = "Copied to clipboard!"; }
  catch { status.textContent = "Clipboard unavailable in this browser."; }
});
["#themeToggle", "#themeToggleMobile"].forEach(selector => document.querySelector(selector).addEventListener("click", () => {
  document.body.classList.toggle("dark"); updateThemeButtons(); saveProgress();
}));
