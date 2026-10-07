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
let shareImageBusy = false;
let previewImageUrl = null;
let cachedShareImage = null;
let cachedShareSelection = "";
let pendingShareImage = null;
let pendingShareSelection = "";
const shareImageSize = { width: 1080, height: 2400 };
const shareImageColors = { background: "#F8F6F1", text: "#18201C", green: "#138A68", beige: "#E8E1D5", secondary: "#747A75" };

function drawRoundedRect(ctx, x, y, width, height, radius, fill) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fillStyle = fill;
  ctx.fill();
}

async function generateShareImage() {
  await document.fonts?.ready;
  const sourceSvg = document.querySelector("#campus-map");
  const svg = sourceSvg.cloneNode(true);
  svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  svg.setAttribute("width", "1000");
  svg.setAttribute("height", "2200");
  svg.style.background = shareImageColors.background;
  svg.querySelector(".map-ground")?.setAttribute("fill", shareImageColors.background);
  svg.querySelector(".map-ground")?.setAttribute("style", `fill:${shareImageColors.background}`);
  svg.querySelectorAll(".map-location").forEach(room => {
    const visited = selectedIds.has(room.dataset.locationId);
    room.querySelectorAll("rect, path, polygon").forEach(shape => {
      shape.setAttribute("fill", visited ? shareImageColors.green : shareImageColors.beige);
      shape.setAttribute("stroke", visited ? "#0F7357" : "#D6CDBE");
      shape.setAttribute("style", `fill:${visited ? shareImageColors.green : shareImageColors.beige};stroke:${visited ? "#0F7357" : "#D6CDBE"};stroke-width:2`);
    });
    room.querySelectorAll("text, tspan").forEach(label => {
      label.setAttribute("fill", visited ? "#FFFFFF" : "#4B514C");
      label.style.fontFamily = "Inter, Arial, sans-serif";
      label.style.fontWeight = "600";
    });
  });
  svg.querySelectorAll(".map-corridor rect").forEach(shape => shape.setAttribute("style", "fill:#F1EEE7;stroke:#D8D2C8;stroke-width:2"));
  svg.querySelectorAll(".map-corridor text, .map-structure text, .map-label text").forEach(label => {
    label.setAttribute("fill", shareImageColors.secondary);
    label.style.fontFamily = "Inter, Arial, sans-serif";
  });
  svg.querySelectorAll(".map-structure rect").forEach(shape => shape.setAttribute("style", "fill:#EEE9DF;stroke:#D8D2C8;stroke-width:2"));
  const svgBlob = new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);
  try {
    const mapImage = new Image();
    mapImage.decoding = "async";
    mapImage.src = svgUrl;
    await mapImage.decode();
    const canvas = document.createElement("canvas");
    canvas.width = shareImageSize.width;
    canvas.height = shareImageSize.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.fillStyle = shareImageColors.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = shareImageColors.green;
    ctx.beginPath(); ctx.roundRect(72, 65, 44, 44, 13); ctx.fill();
    ctx.fillStyle = "#FFFFFF"; ctx.font = "700 27px Arial, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("✳", 94, 87);
    ctx.fillStyle = shareImageColors.text; ctx.textAlign = "left"; ctx.font = "800 27px Arial, sans-serif"; ctx.fillText("OUR DIIT CAMPUS", 132, 87);
    ctx.fillStyle = shareImageColors.secondary; ctx.font = "700 19px Arial, sans-serif"; ctx.letterSpacing = "4px"; ctx.fillText("MY CAMPUS", 72, 160); ctx.letterSpacing = "0px";
    const total = selectedIds.size, places = allLocations.length;
    const percent = Math.round(total / places * 100);
    ctx.fillStyle = shareImageColors.text; ctx.font = "800 88px Arial, sans-serif"; ctx.fillText(`${total} / ${places}`, 72, 260);
    ctx.fillStyle = shareImageColors.green; ctx.font = "800 23px Arial, sans-serif"; ctx.letterSpacing = "4px"; ctx.fillText(`${percent}% EXPLORED`, 76, 310); ctx.letterSpacing = "0px";
    drawRoundedRect(ctx, 72, 345, 350, 58, 18, "#E4EFE8");
    ctx.fillStyle = "#0F7357"; ctx.font = "700 24px Arial, sans-serif"; ctx.fillText(levelFor(total), 95, 374);

    const mapBox = { x: 120, y: 415, width: 840, height: 1848 };
    const scale = Math.min(mapBox.width / 1000, mapBox.height / 2200);
    const mapWidth = 1000 * scale, mapHeight = 2200 * scale;
    ctx.save();
    ctx.shadowColor = "rgba(24,32,28,.08)"; ctx.shadowBlur = 22; ctx.shadowOffsetY = 6;
    drawRoundedRect(ctx, mapBox.x - 26, mapBox.y - 20, mapWidth + 52, mapHeight + 40, 18, "#FFFFFF");
    ctx.restore();
    ctx.drawImage(mapImage, mapBox.x, mapBox.y, mapWidth, mapHeight);

    const footerY = 2290;
    drawRoundedRect(ctx, 78, footerY, 23, 23, 5, shareImageColors.green);
    ctx.fillStyle = shareImageColors.text; ctx.font = "600 21px Arial, sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText("Visited", 112, footerY + 11);
    drawRoundedRect(ctx, 260, footerY, 23, 23, 5, shareImageColors.beige);
    ctx.strokeStyle = "#D6CDBE"; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = shareImageColors.text; ctx.fillText("Not Visited", 294, footerY + 11);
    ctx.fillStyle = shareImageColors.secondary; ctx.font = "500 20px Arial, sans-serif"; ctx.textAlign = "center"; ctx.fillText("How much of the campus have you explored?", 540, 2360);
    ctx.fillStyle = shareImageColors.secondary; ctx.font = "600 15px Arial, sans-serif"; ctx.fillText("OUR DIIT CAMPUS  ·  CAMPUS EXPLORER", 540, 2390);
    return await new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("PNG export failed")), "image/png"));
  } finally { URL.revokeObjectURL(svgUrl); }
}

function currentSelectionKey() { return [...selectedIds].sort().join("\n"); }
async function getShareImage() {
  const selection = currentSelectionKey();
  if (cachedShareImage && cachedShareSelection === selection) return cachedShareImage;
  if (!pendingShareImage || pendingShareSelection !== selection) {
    pendingShareSelection = selection;
    pendingShareImage = generateShareImage();
  }
  const pending = pendingShareImage;
  try {
    const blob = await pending;
    if (currentSelectionKey() === selection) {
      cachedShareImage = blob;
      cachedShareSelection = selection;
    }
    return blob;
  } finally {
    if (pendingShareImage === pending) { pendingShareImage = null; pendingShareSelection = ""; }
  }
}
function mobileBrowser() { return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && /Mac/i.test(navigator.platform)); }
function canShareImageFiles() {
  if (typeof File === "undefined" || !navigator.share || !navigator.canShare) return false;
  try { return navigator.canShare({ files: [new File(["x"], "campus-map.png", { type: "image/png" })] }); }
  catch { return false; }
}

function downloadShareImage(blob) {
  const total = selectedIds.size, places = allLocations.length;
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `campus-explorer-${total}-of-${places}.png`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function openMobileImage(blob, tab) {
  const url = URL.createObjectURL(blob);
  if (tab && !tab.closed) tab.location.href = url;
  else {
    const link = document.createElement("a");
    link.href = url; link.target = "_blank"; link.rel = "noopener";
    document.body.append(link); link.click(); link.remove();
  }
  // Keep the blob URL alive long enough for the browser's image viewer and save UI.
  setTimeout(() => URL.revokeObjectURL(url), 10 * 60 * 1000);
}

async function withShareImage(button, action, auxiliaryWindow = null) {
  const status = document.querySelector("#copyStatus");
  if (shareImageBusy) return;
  shareImageBusy = true;
  const buttons = ["#shareCampusMap", "#downloadCampusMap", "#copyMapImage"].map(selector => document.querySelector(selector));
  const oldLabel = button.textContent;
  buttons.forEach(item => { item.disabled = true; });
  button.textContent = "Generating map…";
  status.textContent = "";
  try {
    const blob = await getShareImage();
    await action(blob);
  } catch (error) {
    if (auxiliaryWindow && !auxiliaryWindow.closed) auxiliaryWindow.close();
    if (error?.name === "AbortError") status.textContent = "Sharing cancelled.";
    else status.textContent = "Could not create the map image. Please try again.";
  } finally {
    button.textContent = oldLabel;
    buttons.forEach(item => { item.disabled = false; });
    shareImageBusy = false;
  }
}

async function refreshSharePreview() {
  const image = document.querySelector("#resultMapPreview");
  const loading = document.querySelector("#resultPreviewLoading");
  const actions = ["#shareCampusMap", "#downloadCampusMap", "#copyMapImage"].map(selector => document.querySelector(selector));
  actions.forEach(button => { button.disabled = true; });
  loading.hidden = false; image.hidden = true;
  try {
    const blob = await getShareImage();
    if (previewImageUrl) URL.revokeObjectURL(previewImageUrl);
    previewImageUrl = URL.createObjectURL(blob);
    image.src = previewImageUrl;
    image.hidden = false; loading.hidden = true;
  } catch { loading.textContent = "Map preview unavailable. You can still try downloading the image."; }
  finally { actions.forEach(button => { button.disabled = false; }); }
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
document.querySelector("#viewResult").addEventListener("click", () => { openModal(ui.resultModal); refreshSharePreview(); });
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
document.querySelector("#downloadCampusMap").addEventListener("click", event => {
  const useMobileShare = mobileBrowser() && canShareImageFiles();
  const imageTab = mobileBrowser() && !useMobileShare ? window.open("about:blank", "_blank") : null;
  withShareImage(event.currentTarget, async blob => {
    if (useMobileShare) {
      const file = new File([blob], `campus-explorer-${selectedIds.size}-of-${allLocations.length}.png`, { type: "image/png" });
      await navigator.share({ title: "My Campus Explorer Map", files: [file] });
      document.querySelector("#copyStatus").textContent = "Choose Save to Files or another destination in the share sheet.";
    } else if (mobileBrowser()) {
      openMobileImage(blob, imageTab);
      document.querySelector("#copyStatus").textContent = "Map opened in a new tab. Use your browser’s Share or Save option to keep it.";
    } else {
      downloadShareImage(blob);
      document.querySelector("#copyStatus").textContent = "Map image downloaded.";
    }
  }, imageTab);
});
document.querySelector("#shareCampusMap").addEventListener("click", event => {
  const imageTab = mobileBrowser() && !canShareImageFiles() ? window.open("about:blank", "_blank") : null;
  withShareImage(event.currentTarget, async blob => {
  const total = selectedIds.size, places = allLocations.length, percent = Math.round(total / places * 100);
  const canShareFile = typeof File !== "undefined" && navigator.share && navigator.canShare;
  const file = canShareFile ? new File([blob], `campus-explorer-${total}-of-${places}.png`, { type: "image/png" }) : null;
  if (canShareFile && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ title: "My Campus Explorer Map", text: `I explored ${total}/${places} campus places (${percent}%)!\nMy level: ${levelFor(total)}`, files: [file] });
      document.querySelector("#copyStatus").textContent = "Campus map shared.";
    } catch (error) {
      if (error?.name === "AbortError") throw error;
      if (mobileBrowser()) openMobileImage(blob, imageTab); else downloadShareImage(blob);
      document.querySelector("#copyStatus").textContent = mobileBrowser() ? "Map opened in a new tab. Use your browser’s Share or Save option to keep it." : "Image saved! You can now share it anywhere.";
    }
  } else {
    if (mobileBrowser()) openMobileImage(blob, imageTab); else downloadShareImage(blob);
    document.querySelector("#copyStatus").textContent = mobileBrowser() ? "Map opened in a new tab. Use your browser’s Share or Save option to keep it." : "Image saved! You can now share it anywhere.";
  }
  }, imageTab);
});
const copyMapButton = document.querySelector("#copyMapImage");
if (navigator.clipboard?.write && window.ClipboardItem && window.isSecureContext) {
  copyMapButton.hidden = false;
  copyMapButton.addEventListener("click", event => withShareImage(event.currentTarget, async blob => {
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    document.querySelector("#copyStatus").textContent = "Map image copied.";
  }));
}
["#themeToggle", "#themeToggleMobile"].forEach(selector => document.querySelector(selector).addEventListener("click", () => {
  document.body.classList.toggle("dark"); updateThemeButtons(); saveProgress();
}));
