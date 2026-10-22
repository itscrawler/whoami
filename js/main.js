// WHOAMI — entry point (game.html)
// Loads the case, builds the dock and connects the dock to the window manager.

// Case id comes from the URL: game.html?case=535
const CASE_ID = new URLSearchParams(location.search).get("case") || "535";

// The loaded case ({ caseInfo, people, evidence, web }). Apps read from it; null until it loads.
let caseData = null;

const CASE_PROGRESS_VERSION = 1;
const CASE_PROGRESS_KEY = `whoami:case:${CASE_ID}:progress`;

// Progress shared by apps and persisted independently for each case.
window.CASE_PROGRESS = {
  foundEvidence: new Set(),
  foundPeople: new Set(),
  openedApps: new Set(),
  downloaded: new Set(),
  wordlist: new Map(),
  crackedArchives: new Set(),
  extractedArchives: new Set(),
};

// Access granted through the simulated terminal is shared with device apps.
window.CASE_ACCESS = {
  vpnNode: null,
  scannedTargets: new Set(),
  connectedTargets: new Set(),
  sessions: new Map(),
};

window.notifyAccessChange = function notifyAccessChange() {
  saveCaseProgress();
  window.dispatchEvent(new Event("case-access-change"));
};

function saveCaseProgress() {
  if (!caseData) return;
  try {
    localStorage.setItem(CASE_PROGRESS_KEY, JSON.stringify({
      version: CASE_PROGRESS_VERSION,
      foundEvidence: [...window.CASE_PROGRESS.foundEvidence],
      foundPeople: [...window.CASE_PROGRESS.foundPeople],
      openedApps: [...window.CASE_PROGRESS.openedApps],
      downloaded: [...window.CASE_PROGRESS.downloaded],
      wordlist: [...window.CASE_PROGRESS.wordlist],
      crackedArchives: [...window.CASE_PROGRESS.crackedArchives],
      extractedArchives: [...window.CASE_PROGRESS.extractedArchives],
      vpnNode: window.CASE_ACCESS.vpnNode,
      scannedTargets: [...window.CASE_ACCESS.scannedTargets],
      connectedTargets: [...window.CASE_ACCESS.connectedTargets],
      sessions: [...window.CASE_ACCESS.sessions],
    }));
  } catch (error) {
    console.warn("Could not save case progress to localStorage.", error);
  }
}

function restoreCaseProgress(data) {
  let saved;
  try {
    const raw = localStorage.getItem(CASE_PROGRESS_KEY);
    if (!raw) return false;
    saved = JSON.parse(raw);
  } catch (error) {
    console.warn("Could not read saved case progress from localStorage.", error);
    return false;
  }
  if (!saved || saved.version !== CASE_PROGRESS_VERSION) return false;

  const evidenceIds = new Set(data.evidence.map((entry) => entry.id));
  const personIds = new Set(data.people.map((entry) => entry.id));
  const appIds = new Set(DOCK_APPS.map((app) => app.id));
  const targetIds = new Set(data.evidence
    .filter((entry) => entry.access?.type === "hack")
    .map((entry) => entry.access.target));
  const setKnown = (values, known) => new Set(
    Array.isArray(values) ? values.filter((value) => known.has(value)) : []
  );

  window.CASE_PROGRESS.foundEvidence = setKnown(saved.foundEvidence, evidenceIds);
  window.CASE_PROGRESS.foundPeople = setKnown(saved.foundPeople, personIds);
  window.CASE_PROGRESS.openedApps = setKnown(saved.openedApps, appIds);
  window.CASE_PROGRESS.downloaded = setKnown(saved.downloaded, evidenceIds);
  window.CASE_PROGRESS.wordlist = new Map(
    Array.isArray(saved.wordlist)
      ? saved.wordlist.filter((entry) =>
        Array.isArray(entry) && entry.length === 2 &&
        typeof entry[0] === "string" && typeof entry[1] === "string"
      )
      : []
  );
  window.CASE_PROGRESS.crackedArchives = new Set(
    Array.isArray(saved.crackedArchives) ? saved.crackedArchives.filter((value) => typeof value === "string") : []
  );
  window.CASE_PROGRESS.extractedArchives = setKnown(saved.extractedArchives, evidenceIds);
  window.CASE_ACCESS.vpnNode = saved.vpnNode === "NYC-07" ? saved.vpnNode : null;
  window.CASE_ACCESS.scannedTargets = setKnown(saved.scannedTargets, targetIds);
  window.CASE_ACCESS.connectedTargets = setKnown(saved.connectedTargets, targetIds);
  window.CASE_ACCESS.sessions = new Map(
    Array.isArray(saved.sessions)
      ? saved.sessions.filter((entry) =>
        Array.isArray(entry) && entry.length === 2 &&
        typeof entry[1]?.service === "string" && typeof entry[1]?.account === "string"
      )
      : []
  );
  return true;
}

window.markEvidenceFound = function markEvidenceFound(id) {
  if (!caseData?.evidence.some((entry) => entry.id === id) || window.CASE_PROGRESS.foundEvidence.has(id)) return;
  window.CASE_PROGRESS.foundEvidence.add(id);
  saveCaseProgress();
};

window.markPersonFound = function markPersonFound(id) {
  if (!caseData?.people.some((entry) => entry.id === id) || window.CASE_PROGRESS.foundPeople.has(id)) return;
  window.CASE_PROGRESS.foundPeople.add(id);
  saveCaseProgress();
};

// Loads the case data files at the same time.
async function loadCase(id) {
  const base = `data/cases/${id}`;
  const [caseInfo, people, evidence, web] = await Promise.all([
    fetch(`${base}/case.json`).then((r) => r.json()),
    fetch(`${base}/people.json`).then((r) => r.json()),
    fetch(`${base}/evidence.json`).then((r) => r.json()),
    fetch(`${base}/web.json`).then((r) => r.json()),
  ]);
  return { caseInfo, people, evidence, web };
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
  window.CASE_PROGRESS.openedApps = new Set(
    DOCK_APPS.filter((app) => getWindowState(app.id) !== "closed").map((app) => app.id)
  );
  saveCaseProgress();
}

// ---------- Start ----------

buildDock();
initWindowManager(document.getElementById("windows"), updateDock);

loadCase(CASE_ID)
  .then((data) => {
    caseData = data;
    const hasSavedProgress = restoreCaseProgress(data);
    document.title = `WHOAMI — #${data.caseInfo.id} ${data.caseInfo.title}`;
    initTopbar(data.caseInfo);

    console.log("Case loaded:", data.caseInfo.title);
    console.log(`${data.people.length} people, ${data.evidence.length} pieces of evidence`);
    console.log(`${data.web.length} public web pages`);
    if (hasSavedProgress) {
      for (const appId of window.CASE_PROGRESS.openedApps) launchApp(appId);
    }
  })
  .catch((error) => {
    console.error(error);
    showCaseNotFound(CASE_ID);
  });
