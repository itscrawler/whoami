// WHOAMI — phone records and account backups

const PHONE_SECTIONS = [
  ["messages", "Messages"],
  ["calls", "Calls"],
  ["apps", "Apps"],
  ["steps", "Steps"],
  ["photos", "Photos"],
  ["social", "Social"],
  ["mail", "Mail"],
  ["device", "Device"],
];

// Whose device the Phone app shows. Only records that involve this person appear on it.
const PHONE_OWNER = "mia-holt";

const PHONE_APP_CATALOG = [
  ["messages", "Messages", "Private conversations and message backups."],
  ["calls", "Phone", "Call history stored on the device."],
  ["steps", "Nimbus Fit", "Steps, Wi-Fi and device activity."],
  ["photos", "Photos", "Images stored in the account backup."],
  ["mail", "Mail", "Messages in Mia's personal mailbox."],
  ["social", "Social", "Public posts linked to the device owner."],
];

function renderPhone(container) {
  const app = createEl("div", "phone-app");
  if (!caseData) {
    app.appendChild(createEl("p", "phone-empty", "Phone records unavailable."));
    container.appendChild(app);
    return;
  }

  let activeSection = "messages";
  container.appendChild(app);
  draw();
  onCaseEvent(app, "case-access-change", draw);

  function draw() {
    const connected = window.CASE_ACCESS.connectedTargets.has("carrier");
    const nimbus = hasSession("nimbus");
    app.replaceChildren();

    const status = createEl("div", "phone-status");
    status.append(
      createEl("span", `phone-status-light${connected ? " is-connected" : ""}`),
      createEl("span", "", connected ? "DEVICE LINK ACTIVE" : "DEVICE NOT CONNECTED"),
      createEl("span", "phone-status-account", `${personName(PHONE_OWNER).toUpperCase()} · DEVICE`),
      createEl("span", `phone-status-account${nimbus ? " is-signed-in" : ""}`, nimbus ? "NIMBUS · SIGNED IN" : "NIMBUS · SIGNED OUT"),
    );

    const nav = createEl("nav", "phone-nav");
    nav.setAttribute("aria-label", "Phone sections");
    for (const [id, label] of PHONE_SECTIONS) {
      const button = createEl("button", "phone-nav-button", label);
      button.type = "button";
      button.dataset.section = id;
      button.setAttribute("aria-pressed", String(activeSection === id));
      button.classList.toggle("is-active", activeSection === id);
      nav.appendChild(button);
    }

    const content = createEl("div", "phone-content");
    const entries = entriesForSection(activeSection);
    const heading = createEl("div", "phone-section-heading");
    heading.append(
      createEl("span", "phone-section-label", sectionLabel(activeSection)),
      createEl("span", "phone-section-count", String(entries.length).padStart(2, "0")),
    );
    content.appendChild(heading);
    if (activeSection === "messages" && !connected && !nimbus) {
      content.appendChild(createEl(
        "p",
        "phone-access-note",
        "Use Terminal: scan phone → vpn connect NYC-07 → connect phone. Sign in to Mia's Nimbus account to view message backups.",
      ));
    }

    if (activeSection === "apps") {
      content.appendChild(renderAppLauncher());
    } else if (!entries.length) {
      const emptyMessage = activeSection === "calls"
        ? "No call history in the recovered device records."
        : "No records in this section.";
      content.appendChild(createEl("p", "phone-empty", emptyMessage));
    } else {
      for (const entry of entries) {
        content.appendChild(activeSection === "steps" ? renderStepRecord(entry) : renderEntry(entry));
      }
    }

    nav.addEventListener("click", (event) => {
      const button = event.target.closest("[data-section]");
      if (!button) return;
      activeSection = button.dataset.section;
      draw();
    });
    app.append(status, nav, content);
  }

  function entriesForSection(section) {
    return caseData.evidence.filter((entry) => (entry.people || []).includes(PHONE_OWNER)).filter((entry) => {
      if (section === "messages") {
        return entry.app === "phone" && entry.content?.type === "chat";
      }
      if (section === "calls") {
        return entry.app === "phone" &&
          ["callLog", "calls"].includes(entry.content?.type);
      }
      if (section === "apps") return false;
      if (section === "steps") return entry.id === "ev-mia-pedometer";
      if (section === "photos") return entry.id === "ev-mia-dog-photo";
      if (section === "social") {
        return entry.app === "social" && entry.access?.type === "public";
      }
      if (section === "mail") {
        return entry.app === "mail" && entry.access?.type === "login" &&
          (entry.people || []).includes("mia-holt");
      }
      if (section === "device") {
        return (entry.app === "phone" && entry.content?.type !== "chat" && entry.id !== "ev-mia-pedometer") ||
          (entry.app === "carrier" && entry.access?.type === "hack");
      }
      return false;
    });
  }

  function recordHeading(entry, available) {
    const heading = createEl("div", "phone-record-heading");
    heading.append(
      createEl("h3", "phone-record-title", entry.title),
      createEl("span", "phone-record-state", available ? "AVAILABLE" : "LOCKED"),
    );
    return heading;
  }

  function renderEntry(entry) {
    const available = isEvidenceAvailable(entry);
    if (available) window.markEvidenceFound(entry.id);
    const card = createEl("article", `phone-record${available ? "" : " is-locked"}`);
    card.appendChild(recordHeading(entry, available));

    if (!available) {
      card.appendChild(createEl("p", "phone-record-lock", evidenceAccessHint(entry)));
      return card;
    }

    const content = entry.content || {};
    if (content.type === "chat") {
      for (const message of content.messages || []) {
        const row = createEl("div", "phone-message");
        row.append(
          createEl("span", "phone-message-meta", `${personName(message.from)} · ${formatTime(message.time)}`),
          createEl("p", "phone-message-text", message.text),
        );
        card.appendChild(row);
      }
    } else if (content.type === "email") {
      card.append(
        createEl("p", "phone-record-meta", `FROM ${content.from || "—"} · ${content.date || entry.timestamp || ""}`),
        createEl("p", "phone-record-subject", content.subject || entry.title),
        createEl("p", "phone-record-body", content.body || ""),
      );
    } else if (content.type === "post") {
      card.append(
        createEl("p", "phone-record-meta", `${personName(content.author)} · ${content.date || ""}`),
        createEl("p", "phone-record-body", content.text || ""),
      );
      if (content.location) card.appendChild(createEl("p", "phone-record-meta", `LOCATION · ${content.location}`));
      if (content.photo) card.appendChild(createEl("p", "phone-record-meta", content.photo));
    } else if (content.type === "posts") {
      for (const post of content.posts || []) {
        const row = createEl("div", "phone-message");
        row.append(
          createEl("span", "phone-message-meta", `${personName(post.author)} · ${post.date || ""}`),
          createEl("p", "phone-message-text", post.text || ""),
        );
        card.appendChild(row);
      }
    } else {
      for (const [label, value] of recordFields(content)) {
        const row = createEl("div", "phone-device-row");
        row.append(
          createEl("span", "phone-device-time", label),
          createEl("span", "phone-device-event", value),
        );
        card.appendChild(row);
      }
    }
    return card;
  }

  function renderAppLauncher() {
    const grid = createEl("div", "phone-app-grid");
    for (const [section, name, description] of PHONE_APP_CATALOG) {
      const entries = entriesForSection(section);
      const available = entries.some(isEvidenceAvailable);
      const button = createEl("button", `phone-app-tile${available ? "" : " is-locked"}`);
      button.type = "button";
      button.dataset.appSection = section;
      button.append(
        createEl("span", "phone-app-icon", appIcon(section)),
        createEl("span", "phone-app-name", name),
        createEl("span", "phone-app-description", description),
        createEl("span", "phone-app-state", entries.length
          ? `${entries.filter(isEvidenceAvailable).length}/${entries.length} RECORDS AVAILABLE`
          : "NO RECORDS"),
      );
      grid.appendChild(button);
    }
    grid.addEventListener("click", (event) => {
      const button = event.target.closest("[data-app-section]");
      if (!button) return;
      activeSection = button.dataset.appSection;
      draw();
    });
    return grid;
  }

  function renderStepRecord(entry) {
    const available = isEvidenceAvailable(entry);
    if (available) window.markEvidenceFound(entry.id);
    const card = createEl("article", `phone-record phone-step-record${available ? "" : " is-locked"}`);
    card.appendChild(recordHeading(entry, available));
    if (!available) {
      card.appendChild(createEl("p", "phone-record-lock", evidenceAccessHint(entry)));
      return card;
    }

    const records = entry.content?.entries || [];
    const stepRecords = records.map((record) => {
      const match = record.event?.match(/\bSteps\b.*:\s*([\d,]+)$/i);
      return match ? { ...record, count: Number(match[1].replace(/,/g, "")) } : null;
    }).filter(Boolean);
    if (stepRecords.length) {
      const summary = createEl("div", "phone-step-summary");
      summary.append(
        createEl("span", "phone-step-total", String(stepRecords.reduce((sum, record) => sum + record.count, 0))),
        createEl("span", "phone-step-label", "RECORDED STEPS"),
      );
      card.appendChild(summary);
    }

    for (const record of records) {
      const row = createEl("div", "phone-device-row");
      row.append(
        createEl("span", "phone-device-time", formatTime(record.time)),
        createEl("span", "phone-device-event", record.event || record.tower || ""),
      );
      const stepMatch = record.event?.match(/\bSteps\b.*:\s*([\d,]+)$/i);
      if (stepMatch) {
        const count = Number(stepMatch[1].replace(/,/g, ""));
        const bar = createEl("span", "phone-step-bar");
        bar.setAttribute("aria-label", `${count} recorded steps`);
        bar.style.setProperty("--step-fill", `${Math.min(100, count)}%`);
        row.appendChild(bar);
      }
      card.appendChild(row);
    }
    return card;
  }

  function appIcon(section) {
    return ({
      messages: "MSG",
      calls: "TEL",
      steps: "FIT",
      photos: "IMG",
      mail: "MAIL",
      social: "SOC",
    })[section] || "APP";
  }

  function recordFields(content) {
    if (content.type === "log") {
      return (content.entries || []).map((entry) => [
        formatTime(entry.time),
        entry.event || entry.tower || "",
      ]);
    }
    return Object.entries(content)
      .filter(([key, value]) => key !== "type" && typeof value !== "object" && value)
      .map(([key, value]) => [key.replace(/([A-Z])/g, " $1").toUpperCase(), String(value)]);
  }

  function sectionLabel(section) {
    return PHONE_SECTIONS.find(([id]) => id === section)?.[1] || "Phone";
  }

  function formatTime(timestamp) {
    return formatEvidenceTime(timestamp);
  }
}
