// WHOAMI — shared evidence helpers
// Used by every app that shows or unlocks case records:
// lookups, access checks, file names and the readable record viewer.

function evidenceById(id) {
  return caseData?.evidence.find((entry) => entry.id === id) || null;
}

function personById(id) {
  return caseData?.people.find((entry) => entry.id === id) || null;
}

function personName(id) {
  return personById(id)?.name || id || "";
}

// The city database only lists people registered in the case city (New York).
function isCityResident(person) {
  return /,\s*NY$/i.test(person?.record?.address || "");
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function digitsOnly(value) {
  return String(value || "").replace(/\D/g, "");
}

// True when a query matches a phone number written in any format: "(718) 555-0187", "7185550187".
function phoneMatches(phone, query) {
  const digits = digitsOnly(query);
  return digits.length >= 4 && digitsOnly(phone).includes(digits);
}

function serviceMatches(first, second) {
  return normalize(first) === normalize(second);
}

// Calls a window event handler while `node` is on the page, and removes it once `node` is gone.
// Lets app windows listen to case events without leaking listeners after they close.
// (An app is rendered before its window joins the desktop, so "not on the page yet" is not "gone".)
function onCaseEvent(node, name, handler) {
  let attached = false;
  function listener(event) {
    if (node.isConnected) {
      attached = true;
      handler(event);
    } else if (attached) {
      window.removeEventListener(name, listener);
    }
  }
  window.addEventListener(name, listener);
}

// ---------- Access ----------

function hasSession(service, account) {
  for (const session of window.CASE_ACCESS.sessions.values()) {
    const sameService = serviceMatches(session.service, service);
    const sameAccount = !account || normalize(session.account) === normalize(account);
    if (sameService && sameAccount) return true;
  }
  return false;
}

// A lead is "people:<id>" (the dossier was opened) or an evidence id (the record was found).
function isLeadFound(lead) {
  if (lead.startsWith("people:")) return window.CASE_PROGRESS.foundPeople.has(lead.slice(7));
  return window.CASE_PROGRESS.foundEvidence.has(lead);
}

// Hack records also need the player to know what to look for (needFoundIn in evidence.json).
function evidenceLeadsFound(evidence) {
  return (evidence.needFoundIn || []).every(isLeadFound);
}

function isEvidenceAvailable(evidence) {
  const access = evidence.access || {};
  if (access.type === "public" || access.type === "client") return true;
  if (access.type === "hack") {
    return window.CASE_ACCESS.connectedTargets.has(access.target) && evidenceLeadsFound(evidence);
  }
  if (access.type === "login") return hasSession(access.service, access.account);
  if (access.type === "restore") {
    return window.CASE_PROGRESS.downloaded.has(access.from) ||
      window.CASE_PROGRESS.extractedArchives.has(access.from);
  }
  if (access.type === "decrypt") return window.CASE_PROGRESS.crackedArchives.has(normalize(access.file));
  return false;
}

// Short "how to get this" line for a locked record, built from its access data.
function evidenceAccessHint(evidence) {
  const access = evidence.access || {};
  if (access.type === "hack") {
    if (window.CASE_ACCESS.connectedTargets.has(access.target) && !evidenceLeadsFound(evidence)) {
      return "Connected, but you don't know what to look for yet. Find a related lead first.";
    }
    return `Terminal: ${(evidence.needs || [`scan ${access.target}`, `connect ${access.target}`]).join(" → ")}.`;
  }
  if (access.type === "login") {
    return `Terminal: login ${access.service || "<service>"} ${access.account || "<account>"} <password>.`;
  }
  if (access.type === "restore") return "Restore the deleted folder it came from first.";
  if (access.type === "decrypt") return `Unlock ${access.file} first.`;
  return "This record is not available yet.";
}

// ---------- File names ----------

const EVIDENCE_FILE_EXTENSIONS = {
  email: "eml",
  log: "log",
  chat: "txt",
  photo: "jpg",
  video: "mp4",
  spreadsheet: "xlsx",
  document: "pdf",
  dataLeak: "csv",
};

// "Nimbus account activity" -> "nimbus_account_activity.log"; explicit names from the data win.
function evidenceFileName(evidence) {
  if (evidence.content?.name) return evidence.content.name;
  if (/\.[a-z0-9]{2,4}$/i.test(evidence.title || "")) return evidence.title;
  const slug = normalize(evidence.title || evidence.id)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40) || evidence.id;
  return `${slug}.${EVIDENCE_FILE_EXTENSIONS[evidence.content?.type] || "txt"}`;
}

// ---------- Readable records ----------

function formatEvidenceTime(timestamp) {
  if (!timestamp) return "";
  return String(timestamp).replace("T", " ").replace(/:\d{2}([+-]\d{2}:\d{2}|Z)$/, "").replace(/([+-]\d{2}:\d{2}|Z)$/, "");
}

function displayValue(value) {
  if (typeof value === "string" && personById(value)) return personName(value);
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) return formatEvidenceTime(value);
  return String(value);
}

function fieldLabel(key) {
  return key.replace(/([A-Z])/g, " $1").toUpperCase();
}

// Turns a record's content into plain text for the viewer and `cat`.
function formatEvidenceText(evidence) {
  const content = evidence.content || {};
  const lines = [];

  for (const [key, value] of Object.entries(content)) {
    if (key === "type" || key === "columns" || value === null || value === "") continue;

    if (key === "messages") {
      lines.push("");
      for (const message of value) {
        lines.push(`${formatEvidenceTime(message.time)}  ${personName(message.from)}: ${message.text}`);
        if (message.attachment) lines.push(`    [${message.attachment}]`);
        if (message.location) lines.push(`    [location: ${message.location}]`);
      }
      lines.push("");
    } else if (key === "entries") {
      lines.push("");
      for (const entry of value) {
        const detail = [entry.user, entry.event || entry.tower].filter(Boolean).join(" · ");
        lines.push(`${formatEvidenceTime(entry.time)}  ${detail}`);
      }
      lines.push("");
    } else if (key === "posts") {
      lines.push("");
      for (const post of value) lines.push(`${post.date || ""}  ${personName(post.author)}: ${post.text}`);
      lines.push("");
    } else if (key === "clips") {
      lines.push("");
      for (const clip of value) lines.push(`${formatEvidenceTime(clip.time)}  ${clip.description}`);
      lines.push("");
    } else if (key === "rows") {
      lines.push("");
      if (content.columns) lines.push(content.columns.join(" | ").toUpperCase());
      for (const row of value) lines.push(row.join(" | "));
      lines.push("");
    } else if (key === "body" || key === "text") {
      lines.push("", value, "");
    } else if (Array.isArray(value)) {
      lines.push(`${fieldLabel(key)}: ${value.map(displayValue).join(", ")}`);
    } else if (typeof value === "object") {
      for (const [innerKey, innerValue] of Object.entries(value)) {
        if (typeof innerValue === "object") continue;
        lines.push(`${fieldLabel(key)} · ${fieldLabel(innerKey)}: ${displayValue(innerValue)}`);
      }
    } else {
      lines.push(`${fieldLabel(key)}: ${displayValue(value)}`);
    }
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

// Opens any record in a read-only viewer window.
function openEvidenceViewer(evidence, subtitle = "/ record") {
  window.markEvidenceFound(evidence.id);
  openAuxiliaryWindow({
    id: `evidence-viewer-${evidence.id}`,
    name: evidenceFileName(evidence),
    subtitle,
    width: 620,
    height: 440,
    render(viewer) {
      const wrapper = createEl("div", "evidence-viewer");
      const header = createEl("div", "evidence-viewer-header");
      header.appendChild(createEl("span", "evidence-viewer-title", evidence.title || evidence.id));
      const body = createEl("pre", "terminal-file-viewer", formatEvidenceText(evidence));
      wrapper.append(header, body);
      viewer.appendChild(wrapper);
    },
  });
}
