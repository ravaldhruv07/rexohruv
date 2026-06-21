const data = window.PLANNER_DATA;
const unlockKey = "pregnancy-plan-unlocked";
const plainPasscode = "family-plan";

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

function slugLabel(value) {
  return text(value)
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

async function sha256(message) {
  if (!globalThis.crypto?.subtle) return "";
  const encoded = new TextEncoder().encode(message);
  const buffer = await crypto.subtle.digest("SHA-256", encoded);
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function isPasscodeValid(value) {
  const normalized = value.trim();
  if (normalized === plainPasscode) return true;
  return (await sha256(normalized)) === data.passcodeHash;
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
  passcodeInput.focus();
}

function allItems() {
  return data.timeline.flatMap((phase) => phase.items.map((item) => ({ ...item, phase: phase.phase, timing: phase.timing })));
}

function matchesFilters(item) {
  const haystack = [
    item.title,
    item.category,
    item.kind,
    item.status,
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

function unique(values) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function populateFilters() {
  const items = allItems();
  const categories = unique(items.map((item) => item.category));
  const kinds = unique(items.map((item) => item.kind));

  categoryFilter.innerHTML = [
    `<option value="all">All categories</option>`,
    ...categories.map((category) => `<option value="${category}">${slugLabel(category)}</option>`)
  ].join("");

  kindFilter.innerHTML = [
    `<option value="all">All types</option>`,
    ...kinds.map((kind) => `<option value="${kind}">${slugLabel(kind)}</option>`)
  ].join("");
}

function renderModuleNav() {
  moduleNav.innerHTML = data.modules
    .map(
      (module) => `
        <button class="module-button ${module.id === state.activeModule ? "is-active" : ""}" data-module="${module.id}" type="button">
          <strong>${module.title}</strong>
          <span>${module.summary}</span>
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
    { label: "visible timeline items", value: filteredItems.length },
    { label: "provider review flags", value: reviewCount },
    { label: "conditional items", value: conditionalCount },
    { label: "urgent rules", value: urgentCount }
  ]
    .map((stat) => `<div class="stat"><strong>${stat.value}</strong><span>${stat.label}</span></div>`)
    .join("");
}

function pill(label, className = "") {
  return `<span class="pill ${className}">${label}</span>`;
}

function renderItem(item) {
  return `
    <article class="item-card">
      <div class="item-top">
        <h4>${item.title}</h4>
        ${pill(slugLabel(item.status), item.status)}
      </div>
      <p>${item.why}</p>
      <p>${item.details}</p>
      <div class="meta-row">
        ${pill(slugLabel(item.category))}
        ${pill(slugLabel(item.kind), item.kind)}
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
                <h3>${phase.phase}</h3>
                <p>${phase.timing}</p>
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
      <article class="module-card">
        <div>
          <p class="eyebrow">Selected module</p>
          <h3>${selected.title}</h3>
          <p>${selected.summary}</p>
        </div>
        ${selected.sections
          .map(
            (section) => `
              <section class="module-section">
                <h4>${section.title}</h4>
                <ul>${section.items.map((item) => `<li>${item}</li>`).join("")}</ul>
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
                <h3>${module.title}</h3>
                <p>${module.summary}</p>
              </div>
              <button class="tab" data-open-module="${module.id}" type="button">Open</button>
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
              <h3>${card.title}</h3>
              <ul>${card.items.map((item) => `<li>${item}</li>`).join("")}</ul>
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
  viewTitle.textContent = state.view === "timeline" ? "Timeline" : state.view === "modules" ? "Modules" : "Reference";
  render();
}

function render() {
  updated.textContent = `Updated ${data.updatedAt}`;
  renderModuleNav();

  if (state.view === "timeline") renderTimeline();
  if (state.view === "modules") renderModules();
  if (state.view === "reference") renderReference();
}

gateForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  gateError.textContent = "";
  try {
    if (await isPasscodeValid(passcodeInput.value)) {
      unlock();
    } else {
      gateError.textContent = "Passcode did not match.";
    }
  } catch {
    gateError.textContent = "Could not unlock in this browser. Use the HTTPS GitHub Pages URL.";
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

if (localStorage.getItem(unlockKey) === "true") {
  unlock();
} else {
  passcodeInput.focus();
}
