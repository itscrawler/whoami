// WHOAMI — entry point (game.html)
// Loads the case, builds the dock and connects the dock to the window manager.

// Case id comes from the URL: game.html?case=535
const CASE_ID = new URLSearchParams(location.search).get("case") || "535";

// The loaded case ({ caseInfo, people, evidence }). Apps read from it; null until it loads.
let caseData = null;

// Loads the three JSON files of a case at the same time.
async function loadCase(id) {
  const base = `data/cases/${id}`;
  const [caseInfo, people, evidence] = await Promise.all([
    fetch(`${base}/case.json`).then((r) => r.json()),
    fetch(`${base}/people.json`).then((r) => r.json()),
    fetch(`${base}/evidence.json`).then((r) => r.json()),
  ]);
  return { caseInfo, people, evidence };
}

// Builds the dock from the APPS list in apps.js:
// the "apps" group, a divider, the "tools" group, and the exit button at the bottom.
function buildDock() {
  const dock = document.getElementById("dock");
  let lastSection = null;

  for (const app of DOCK_APPS) {
    // A divider line wherever the section changes (apps -> tools)
    if (lastSection && app.section !== lastSection) {
      const divider = document.createElement("div");
      divider.className = "dock-divider";
      dock.appendChild(divider);
    }
    lastSection = app.section;

    const button = createDockButton(app.id, app.name, app.icon);
    button.addEventListener("click", () => launchApp(app.id));
    dock.appendChild(button);
  }

  const exitButton = createDockButton("exit", "Exit case", EXIT_ICON);
  exitButton.classList.add("dock-exit");
  exitButton.addEventListener("click", () => {
    location.href = "index.html#cases";
  });
  dock.appendChild(exitButton);
}

// Makes one dock button: the icon plus a tooltip with the name (shown on hover).
function createDockButton(id, label, icon) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "dock-btn";
  button.dataset.app = id;
  button.setAttribute("aria-label", label);

  const tooltip = document.createElement("span");
  tooltip.className = "dock-tooltip";
  tooltip.textContent = label;
  tooltip.setAttribute("aria-hidden", "true"); // screen readers already get aria-label

  button.append(createIcon(icon), tooltip);
  return button;
}

// Updates the dock icons to show which apps are open or minimized.
// The window manager calls this after every open, close, minimize and restore.
function updateDock() {
  for (const app of DOCK_APPS) {
    const button = document.querySelector(`.dock-btn[data-app="${app.id}"]`);
    const state = getWindowState(app.id);
    button.classList.toggle("is-open", state !== "closed");
    button.classList.toggle("is-minimized", state === "minimized");
  }
}

// ---------- Start ----------

buildDock();
initWindowManager(document.getElementById("windows"), updateDock);

loadCase(CASE_ID)
  .then((data) => {
    caseData = data;
    document.title = `WHOAMI — #${data.caseInfo.id} ${data.caseInfo.title}`;
    initTopbar(data.caseInfo);

    console.log("Case loaded:", data.caseInfo.title);
    console.log(`${data.people.length} people, ${data.evidence.length} pieces of evidence`);
  })
  .catch((error) => {
    console.error(error);
    showCaseNotFound(CASE_ID);
  });
