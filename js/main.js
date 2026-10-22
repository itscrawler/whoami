// WHOAMI — entry point (game.html)
// Loads the case, builds the dock and connects the dock to the window manager.

// Case id comes from the URL: game.html?case=535
const CASE_ID = new URLSearchParams(location.search).get("case") || "535";

// The loaded case ({ caseInfo, people, evidence, web }). Apps read from it; null until it loads.
let caseData = null;
let handbookData = null;

const CASE_PROGRESS_VERSION = 1;
const CASE_PROGRESS_KEY = `whoami:case:${CASE_ID}:progress`;

// Progress shared by apps and persisted independently for each case.
window.CASE_PROGRESS = {
  foundEvidence: new Set(), // records the player has found: on the evidence board, unlock map places and mail
  foundPeople: new Set(), // dossiers the player has opened (leads for terminal targets)
  openedApps: new Set(),
  downloaded: new Set(),
  reportEvidence: new Set(),
  evidenceThreads: [],
  evidencePositions: new Map(),
  evidenceBoardHintSeen: false,
  reportDraft: {},
  reportSubmission: null,
  terminalHistory: [],
  wordlist: new Map(),
  crackedArchives: new Set(),
  extractedArchives: new Set(),
  deliveredMail: new Map(), // mail id -> in-game time it arrived
  readMail: new Set(),
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
      reportEvidence: [...window.CASE_PROGRESS.reportEvidence],
      evidenceThreads: window.CASE_PROGRESS.evidenceThreads,
      evidencePositions: [...window.CASE_PROGRESS.evidencePositions],
      evidenceBoardHintSeen: window.CASE_PROGRESS.evidenceBoardHintSeen,
      reportDraft: window.CASE_PROGRESS.reportDraft,
      reportSubmission: window.CASE_PROGRESS.reportSubmission,
      terminalHistory: window.CASE_PROGRESS.terminalHistory,
      wordlist: [...window.CASE_PROGRESS.wordlist],
      crackedArchives: [...window.CASE_PROGRESS.crackedArchives],
      extractedArchives: [...window.CASE_PROGRESS.extractedArchives],
      deliveredMail: [...window.CASE_PROGRESS.deliveredMail],
      readMail: [...window.CASE_PROGRESS.readMail],
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
  const mailIds = new Set((data.caseInfo.mail || []).map((entry) => entry.id));
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
  window.CASE_PROGRESS.reportEvidence = setKnown(saved.reportEvidence, window.CASE_PROGRESS.foundEvidence);
  window.CASE_PROGRESS.evidenceThreads = Array.isArray(saved.evidenceThreads)
    ? saved.evidenceThreads.filter((thread) =>
      Array.isArray(thread) && thread.length === 2 &&
      thread[0] !== thread[1] &&
      window.CASE_PROGRESS.foundEvidence.has(thread[0]) &&
      window.CASE_PROGRESS.foundEvidence.has(thread[1])
    ).map((thread) => [...thread].sort())
    : [];
  window.CASE_PROGRESS.evidencePositions = new Map(
    Array.isArray(saved.evidencePositions)
      ? saved.evidencePositions.filter((entry) =>
        Array.isArray(entry) && entry.length === 2 &&
        evidenceIds.has(entry[0]) &&
        Number.isFinite(entry[1]?.x) && entry[1].x >= 0 && entry[1].x <= 10000 &&
        Number.isFinite(entry[1]?.y) && entry[1].y >= 0 && entry[1].y <= 10000
      ).map(([id, position]) => [id, { x: position.x, y: position.y }])
      : []
  );
  window.CASE_PROGRESS.evidenceBoardHintSeen = saved.evidenceBoardHintSeen === true;
  window.CASE_PROGRESS.reportDraft =
    saved.reportDraft && typeof saved.reportDraft === "object" && !Array.isArray(saved.reportDraft)
      ? saved.reportDraft
      : {};
  window.CASE_PROGRESS.reportSubmission =
    saved.reportSubmission && typeof saved.reportSubmission === "object" && !Array.isArray(saved.reportSubmission)
      ? saved.reportSubmission
      : null;
  window.CASE_PROGRESS.terminalHistory.length = 0;
  if (Array.isArray(saved.terminalHistory)) {
    saved.terminalHistory
      .filter((line) => typeof line === "string")
      .forEach((line) => window.CASE_PROGRESS.terminalHistory.push(line));
  }
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
  window.CASE_PROGRESS.deliveredMail = new Map(
    Array.isArray(saved.deliveredMail)
      ? saved.deliveredMail.filter((entry) =>
        Array.isArray(entry) && mailIds.has(entry[0]) && typeof entry[1] === "string"
      )
      : []
  );
  window.CASE_PROGRESS.readMail = new Set(
    Array.isArray(saved.readMail) ? saved.readMail.filter((value) => typeof value === "string") : []
  );
  window.CASE_ACCESS.vpnNode = saved.vpnNode === "NYC-07" ? saved.vpnNode : null;
  window.CASE_ACCESS.scannedTargets = setKnown(saved.scannedTargets, targetIds);
  window.CASE_ACCESS.connectedTargets = setKnown(saved.connectedTargets, targetIds);
  window.CASE_ACCESS.sessions = new Map(
    Array.isArray(saved.sessions)
      ? saved.sessions.filter((entry) =>
        Array.isArray(entry) && entry.length === 2 &&
        typeof entry[1]?.service === "string" && typeof entry[1]?.account === "string"
      ).map(([key, session]) => {
        const service = session.service.toLowerCase();
        return [key, {
          ...session,
          service: ["google", "gmail", "nimbus mail"].includes(service) ? "nimbus" : session.service,
          account: session.account.replace(/@gmail\.com$/i, "@nimbusmail.com"),
        }];
      })
      : []
  );
  return true;
}

window.markEvidenceFound = function markEvidenceFound(id) {
  if (!caseData?.evidence.some((entry) => entry.id === id) || window.CASE_PROGRESS.foundEvidence.has(id)) return;
  window.CASE_PROGRESS.foundEvidence.add(id);
  saveCaseProgress();
  announceEvidence(id); // before the event, so the board already shows the card as NEW
  window.refreshCaseMap?.(id);
  window.dispatchEvent(new Event("case-evidence-found"));
  deliverTriggeredMail();
};

// Found records go straight to the evidence board with a "NEW EVIDENCE" notice on top.
// Records found in one go (e.g. "download all") share a single notice.
const newEvidenceQueue = [];

// Board cards the player hasn't looked at yet (marked NEW on the board and on its dock icon).
// Kept for this session only: after a reload everything already found counts as seen.
const unseenEvidence = new Set();

function announceEvidence(id) {
  unseenEvidence.add(id);
  updateBoardBadge();
  newEvidenceQueue.push(id);
  if (newEvidenceQueue.length > 1) return;
  window.setTimeout(() => {
    const ids = newEvidenceQueue.splice(0);
    const text = ids.length === 1
      ? `NEW EVIDENCE · ${evidenceById(ids[0])?.title || ids[0]}`
      : `NEW EVIDENCE · ${ids.length} records`;
    playSound("success");
    showToast(text, {
      onClick: () => {
        openWindow("board");
        window.dispatchEvent(new CustomEvent("case-board-reveal", { detail: { id: ids[0] } }));
      },
    });
  }, 0);
}

function markEvidenceSeen(id) {
  if (!unseenEvidence.delete(id)) return;
  updateBoardBadge();
}

function updateBoardBadge() {
  const button = document.querySelector('.dock-btn[data-app="board"]');
  if (button) button.classList.toggle("has-unread", unseenEvidence.size > 0);
}

window.markPersonFound = function markPersonFound(id) {
  if (!caseData?.people.some((entry) => entry.id === id) || window.CASE_PROGRESS.foundPeople.has(id)) return;
  window.CASE_PROGRESS.foundPeople.add(id);
  saveCaseProgress();
  window.dispatchEvent(new Event("case-person-found"));
  deliverTriggeredMail();
};

// ---------- Mail triggers ----------

// A message in case.json "mail" arrives once any of its trigger leads has been found.
// Leads use the same format as needFoundIn: an evidence id or "people:<id>".
function deliverTriggeredMail() {
  const arrived = [];
  for (const message of caseData?.caseInfo.mail || []) {
    if (window.CASE_PROGRESS.deliveredMail.has(message.id)) continue;
    const leads = message.trigger?.any || [];
    if (!leads.some(isLeadFound)) continue;
    window.CASE_PROGRESS.deliveredMail.set(message.id, gameTimestamp());
    arrived.push(message);
  }
  if (!arrived.length) return;
  saveCaseProgress();
  window.dispatchEvent(new Event("case-mail-change"));
  for (const message of arrived) announceMail(message.from);
}

function announceMail(from) {
  playSound("notify");
  showToast(`NEW MESSAGE · ${from}`, { onClick: () => openWindow("mail") });
}

function unreadMailCount() {
  if (!caseData) return 0;
  return mailboxMessages().filter((message) => !window.CASE_PROGRESS.readMail.has(message.id)).length;
}

function updateMailBadge() {
  const button = document.querySelector('.dock-btn[data-app="mail"]');
  if (button) button.classList.toggle("has-unread", unreadMailCount() > 0);
}

// ---------- Dock ----------

// Loads the shared handbook and case data at the same time.
async function loadCase(id) {
  const base = `data/cases/${id}`;
  const [caseInfo, people, evidence, web, handbook] = await Promise.all([
    fetch(`${base}/case.json`).then((r) => r.json()),
    fetch(`${base}/people.json`).then((r) => r.json()),
    fetch(`${base}/evidence.json`).then((r) => r.json()),
    fetch(`${base}/web.json`).then((r) => r.json()),
    fetch("data/handbook.json").then((r) => r.json()),
  ]);
  return { caseInfo, people, evidence, web, handbook };
}

// Builds the dock from the APPS list in apps.js:
// the "apps" group, a divider, the "tools" group, and the exit button at the bottom.
function buildDock() {
  const dock = document.getElementById("dock");
  let lastSection = null;

  for (const [index, app] of DOCK_APPS.entries()) {
    // A divider line wherever the section changes (apps -> tools)
    if (lastSection && app.section !== lastSection) {
      const divider = document.createElement("div");
      divider.className = "dock-divider";
      dock.appendChild(divider);
    }
    lastSection = app.section;

    const button = createDockButton(app.id, app.name, app.icon, dockHotkey(index));
    button.addEventListener("click", () => {
      playSound("click");
      launchApp(app.id);
    });
    dock.appendChild(button);
  }

  const exitButton = createDockButton("exit", "Exit case", EXIT_ICON);
  exitButton.classList.add("dock-exit");
  exitButton.addEventListener("click", () => {
    location.href = "index.html#cases";
  });
  dock.appendChild(exitButton);
}

// Keys 1–9 and 0 open the first ten dock apps.
function dockHotkey(index) {
  return index < 9 ? String(index + 1) : index === 9 ? "0" : "";
}

// Makes one dock button: the icon plus a tooltip with the name (shown on hover).
function createDockButton(id, label, icon, hotkey = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "dock-btn";
  button.dataset.app = id;
  button.setAttribute("aria-label", label);
  if (hotkey) button.setAttribute("aria-keyshortcuts", hotkey);

  const tooltip = document.createElement("span");
  tooltip.className = "dock-tooltip";
  tooltip.textContent = hotkey ? `${label} · ${hotkey}` : label;
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

// ---------- Hotkeys ----------

function isTyping(target) {
  return target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
}

// Esc: leave a text field, or close the active window. 1–9, 0: open a dock app.
function handleHotkey(event) {
  if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;

  if (event.key === "Escape") {
    if (isTyping(event.target)) {
      event.target.blur();
      return;
    }
    if (wm.activeId) {
      event.preventDefault();
      closeWindow(wm.activeId);
    }
    return;
  }

  if (isTyping(event.target) || !/^[0-9]$/.test(event.key)) return;
  const index = event.key === "0" ? 9 : Number(event.key) - 1;
  const app = DOCK_APPS[index];
  if (!app) return;
  event.preventDefault();
  playSound("click");
  launchApp(app.id);
}

// ---------- Start ----------

buildDock();
initWindowManager(document.getElementById("windows"), updateDock);
document.addEventListener("keydown", handleHotkey);
window.addEventListener("case-mail-change", updateMailBadge);

loadCase(CASE_ID)
  .then((data) => {
    caseData = data;
    handbookData = data.handbook;
    const hasSavedProgress = restoreCaseProgress(data);
    document.title = `WHOAMI — #${data.caseInfo.id} ${data.caseInfo.title}`;
    initTopbar(data.caseInfo);

    console.log("Case loaded:", data.caseInfo.title);
    console.log(`${data.people.length} people, ${data.evidence.length} pieces of evidence`);
    console.log(`${data.web.length} public web pages`);
    if (hasSavedProgress && window.CASE_PROGRESS.openedApps.size) {
      for (const appId of window.CASE_PROGRESS.openedApps) launchApp(appId);
    } else {
      // Every case starts with the client's message.
      launchApp("mail");
    }
    deliverTriggeredMail();
    updateMailBadge();
  })
  .catch((error) => {
    console.error(error);
    showCaseNotFound(CASE_ID);
  });
