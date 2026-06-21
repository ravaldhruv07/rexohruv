const data = window.PLANNER_DATA;
const unlockKey = "pregnancy-plan-unlocked";
const passcodeNormalized = "tdog";

const state = {
  view: "timeline",
  activeModule: data.modules[0].id,
  search: "",
  category: "all",
  kind: "all"
};

const gate = document.querySelector("#gate");
const app = document.querySelector("#app");
const gateForm = document.querySelector("#gate-form");
const passcodeInput = document.querySelector("#passcode");
const gateError = document.querySelector("#gate-error");
const moduleNav = document.querySelector("#module-nav");
const updated = document.querySelector("#updated");
const viewTitle = document.querySelector("#view-title");
const searchInput = document.querySelector("#search");
const categoryFilter = document.querySelector("#category-filter");
const kindFilter = document.querySelector("#kind-filter");
const statusStrip = document.querySelector("#status-strip");
const timelineView = document.querySelector("#timeline-view");
const modulesView = document.querySelector("#modules-view");
const referenceView = document.querySelector("#reference-view");

function text(value) {
  return String(value ?? "");
}

// Escape user-visible strings before they enter innerHTML so labels with
// characters like "&" render correctly and nothing can break the markup.
function esc(value) {
  return text(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function categoryLabel(id) {
  return data.categories[id]?.label ?? text(id);
}

function categoryAccent(id) {
  return data.categories[id]?.accent ?? "#6c7a86";
}

function kindLabel(id) {
  return data.kinds[id]?.label ?? text(id);
}

function statusLabel(id) {
  return data.statuses[id]?.label ?? text(id);
}

function normalizePasscode(value) {
  return text(value).trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isPasscodeValid(value) {
  return normalizePasscode(value) === passcodeNormalized;
}

function shouldStartUnlocked() {
  try {
    return localStorage.getItem(unlockKey) === "true";
  } catch {
    return false;
  }
}

function unlock() {
  try {
    localStorage.setItem(unlockKey, "true");
  } catch {
    // The app can still unlock for the current page view if storage is unavailable.
  }
  gate.hidden = true;
  app.hidden = false;
  render();
}

function lock() {
  try {
    localStorage.removeItem(unlockKey);
  } catch {
    // Ignore storage failures; the visible gate state is still reset below.
  }
  app.hidden = true;
  gate.hidden = false;
  passcodeInput.value = "";
  gateError.textContent = "";
  passcodeInput.focus();
}

function allItems() {
  return data.timeline.flatMap((phase) =>
    phase.items.map((item) => ({ ...item, phase: phase.phase, timing: phase.timing }))
  );
}

function matchesFilters(item) {
  const haystack = [
    item.title,
    categoryLabel(item.category),
    kindLabel(item.kind),
    statusLabel(item.status),
    item.why,
    item.details,
    item.phase,
    item.timing
  ]
    .map(text)
    .join(" ")
    .toLowerCase();

  const searchMatch = !state.search || haystack.includes(state.search.toLowerCase());
  const categoryMatch = state.category === "all" || item.category === state.category;
  const kindMatch = state.kind === "all" || item.kind === state.kind;

  return searchMatch && categoryMatch && kindMatch;
}

function countBy(items, key) {
  return items.reduce((acc, item) => {
    acc[item[key]] = (acc[item[key]] || 0) + 1;
    return acc;
  }, {});
}

function populateFilters() {
  const items = allItems();
  const categoryCounts = countBy(items, "category");
  const kindCounts = countBy(items, "kind");

  // Preserve the curated declaration order; only show facets that exist in data.
  const categoryOptions = Object.keys(data.categories).filter((id) => categoryCounts[id]);
  const kindOptions = Object.keys(data.kinds).filter((id) => kindCounts[id]);

  categoryFilter.innerHTML = [
    `<option value="all">All categories</option>`,
    ...categoryOptions.map(
      (id) => `<option value="${esc(id)}">${esc(categoryLabel(id))} (${categoryCounts[id]})</option>`
    )
  ].join("");

  kindFilter.innerHTML = [
    `<option value="all">All types</option>`,
    ...kindOptions.map(
      (id) => `<option value="${esc(id)}">${esc(kindLabel(id))} (${kindCounts[id]})</option>`
    )
  ].join("");
}

function renderModuleNav() {
  moduleNav.innerHTML = data.modules
    .map(
      (module) => `
        <button class="module-button ${module.id === state.activeModule ? "is-active" : ""}" data-module="${esc(module.id)}" type="button">
          <strong>${esc(module.title)}</strong>
          <span>${esc(module.summary)}</span>
        </button>
      `
    )
    .join("");
}

function renderStats(filteredItems) {
  const reviewCount = filteredItems.filter((item) => item.status === "review").length;
  const urgentCount = filteredItems.filter((item) => item.kind === "urgent").length;
  const conditionalCount = filteredItems.filter((item) => item.kind === "conditional").length;

  statusStrip.innerHTML = [
    { label: "Timeline items", value: filteredItems.length },
    { label: "Provider review", value: reviewCount },
    { label: "Conditional", value: conditionalCount },
    { label: "Urgent flags", value: urgentCount }
  ]
    .map((stat) => `<div class="stat"><strong>${stat.value}</strong><span>${esc(stat.label)}</span></div>`)
    .join("");
}

function renderItem(item) {
  return `
    <article class="item-card">
      <div class="item-top">
        <h4>${esc(item.title)}</h4>
        <span class="pill status-${esc(item.status)}">${esc(statusLabel(item.status))}</span>
      </div>
      <p class="item-why">${esc(item.why)}</p>
      <p class="item-details">${esc(item.details)}</p>
      <div class="meta-row">
        <span class="pill pill-category"><span class="dot" style="background:${esc(categoryAccent(item.category))}"></span>${esc(categoryLabel(item.category))}</span>
        <span class="pill kind-${esc(item.kind)}">${esc(kindLabel(item.kind))}</span>
      </div>
    </article>
  `;
}

function renderTimeline() {
  const filteredPhases = data.timeline
    .map((phase) => ({ ...phase, items: phase.items.filter(matchesFilters) }))
    .filter((phase) => phase.items.length > 0);

  const filteredItems = filteredPhases.flatMap((phase) => phase.items);
  renderStats(filteredItems);

  if (!filteredPhases.length) {
    timelineView.innerHTML = `<div class="empty">No timeline items match the current filters.</div>`;
    return;
  }

  timelineView.innerHTML = `
    <div class="timeline">
      ${filteredPhases
        .map(
          (phase) => `
            <section class="phase">
              <div class="phase-heading">
                <h3>${esc(phase.phase)}</h3>
                <p>${esc(phase.timing)}</p>
              </div>
              <div class="item-grid">
                ${phase.items.map(renderItem).join("")}
              </div>
            </section>
          `
        )
        .join("")}
    </div>
  `;
}

function renderModules() {
  const selected = data.modules.find((module) => module.id === state.activeModule) ?? data.modules[0];
  renderStats(allItems().filter(matchesFilters));

  modulesView.innerHTML = `
    <div class="module-grid">
      <article class="module-card is-selected">
        <div>
          <p class="eyebrow">Selected module</p>
          <h3>${esc(selected.title)}</h3>
          <p>${esc(selected.summary)}</p>
        </div>
        ${selected.sections
          .map(
            (section) => `
              <section class="module-section">
                <h4>${esc(section.title)}</h4>
                <ul>${section.items.map((line) => `<li>${esc(line)}</li>`).join("")}</ul>
              </section>
            `
          )
          .join("")}
      </article>
      ${data.modules
        .filter((module) => module.id !== selected.id)
        .map(
          (module) => `
            <article class="module-card">
              <div>
                <h3>${esc(module.title)}</h3>
                <p>${esc(module.summary)}</p>
              </div>
              <button class="open-button" data-open-module="${esc(module.id)}" type="button">Open module</button>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderReference() {
  renderStats(allItems().filter(matchesFilters));
  referenceView.innerHTML = `
    <div class="reference-grid">
      ${data.reference
        .map(
          (card) => `
            <article class="reference-card">
              <h3>${esc(card.title)}</h3>
              <ul>${card.items.map((line) => `<li>${esc(line)}</li>`).join("")}</ul>
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function setView(nextView) {
  state.view = nextView;
  document.querySelectorAll(".tab[data-view]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === state.view);
  });

  timelineView.hidden = state.view !== "timeline";
  modulesView.hidden = state.view !== "modules";
  referenceView.hidden = state.view !== "reference";
  viewTitle.textContent =
    state.view === "timeline" ? "Timeline" : state.view === "modules" ? "Modules" : "Reference";
  render();
}

function render() {
  updated.textContent = `Updated ${data.updatedAt}`;
  renderModuleNav();

  if (state.view === "timeline") renderTimeline();
  if (state.view === "modules") renderModules();
  if (state.view === "reference") renderReference();
}

gateForm.addEventListener("submit", (event) => {
  event.preventDefault();
  gateError.textContent = "";
  if (isPasscodeValid(passcodeInput.value)) {
    unlock();
  } else {
    gateError.textContent = "That passcode did not match. Please try again.";
    passcodeInput.select();
  }
});

document.querySelector("#lock-button").addEventListener("click", lock);
document.querySelector("#print-button").addEventListener("click", () => window.print());

searchInput.addEventListener("input", (event) => {
  state.search = event.target.value.trim();
  render();
});

categoryFilter.addEventListener("change", (event) => {
  state.category = event.target.value;
  render();
});

kindFilter.addEventListener("change", (event) => {
  state.kind = event.target.value;
  render();
});

document.querySelectorAll(".tab[data-view]").forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.view));
});

document.addEventListener("click", (event) => {
  const moduleButton = event.target.closest("[data-module], [data-open-module]");
  if (!moduleButton) return;

  state.activeModule = moduleButton.dataset.module || moduleButton.dataset.openModule;
  setView("modules");
});

populateFilters();

if (shouldStartUnlocked()) {
  unlock();
} else {
  passcodeInput.focus();
}
