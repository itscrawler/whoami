// WHOAMI — phone records and account backups

const PHONE_SECTIONS = [
  ["messages", "Messages"],
  ["social", "Social"],
  ["mail", "Mail"],
  ["device", "Device"],
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
  window.addEventListener("case-access-change", onAccessChange);

  function onAccessChange() {
    if (!app.isConnected) {
      window.removeEventListener("case-access-change", onAccessChange);
      return;
    }
    draw();
  }

  function draw() {
    const connected = window.CASE_ACCESS.connectedTargets.has("carrier");
    const google = hasSession("google");
    app.replaceChildren();

    const status = createEl("div", "phone-status");
    status.append(
      createEl("span", `phone-status-light${connected ? " is-connected" : ""}`),
      createEl("span", "", connected ? "DEVICE LINK ACTIVE" : "DEVICE NOT CONNECTED"),
      createEl("span", "phone-status-account", google ? "GOOGLE · SIGNED IN" : "GOOGLE · SIGNED OUT"),
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
    if (activeSection === "messages" && !connected && !google) {
      content.appendChild(createEl(
        "p",
        "phone-access-note",
        "Use Terminal: scan phone → vpn connect TAC-07 → connect phone. Sign in to Mia's Google account to view message backups.",
      ));
    }

    if (!entries.length) {
      content.appendChild(createEl("p", "phone-empty", "No records in this section."));
    } else {
      for (const entry of entries) content.appendChild(renderEntry(entry));
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
    return caseData.evidence.filter((entry) => {
      if (section === "messages") {
        return entry.app === "phone" && entry.content?.type === "chat";
      }
      if (section === "social") {
        return entry.app === "social" && entry.access?.type === "public";
      }
      if (section === "mail") {
        return entry.app === "mail" && entry.access?.type === "login" &&
          (entry.people || []).includes("mia-holt");
      }
      if (section === "device") {
        return (entry.app === "phone" && entry.content?.type !== "chat") ||
          (entry.app === "carrier" && entry.access?.type === "hack");
      }
      return false;
    });
  }

  function renderEntry(entry) {
    const available = isAvailable(entry);
    const card = createEl("article", `phone-record${available ? "" : " is-locked"}`);
    const heading = createEl("div", "phone-record-heading");
    heading.append(
      createEl("h3", "phone-record-title", entry.title),
      createEl("span", "phone-record-state", available ? "AVAILABLE" : "LOCKED"),
    );
    card.appendChild(heading);

    if (!available) {
      card.appendChild(createEl("p", "phone-record-lock", accessHint(entry)));
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

  function isAvailable(entry) {
    const access = entry.access || {};
    if (access.type === "public" || access.type === "client") return true;
    if (access.type === "hack") return window.CASE_ACCESS.connectedTargets.has(access.target);
    if (access.type === "login") return hasSession(access.service, access.account);
    return false;
  }

  function hasSession(service, account) {
    for (const session of window.CASE_ACCESS.sessions.values()) {
      const sameService = serviceMatches(session.service, service);
      const sameAccount = !account || normalize(session.account) === normalize(account);
      if (sameService && sameAccount) return true;
    }
    return false;
  }

  function accessHint(entry) {
    const access = entry.access || {};
    if (access.type === "hack") {
      return "Connect through Terminal: scan phone → vpn connect TAC-07 → connect phone.";
    }
    if (access.type === "login") {
      const service = access.service || "account";
      const person = caseData.people.find((entry) => entry.id === "mia-holt");
      const account = access.account || (
        (entry.people || []).includes("mia-holt") ? person?.email : null
      );
      const accountArgument = account ? ` ${account}` : " <account>";
      return `Sign in through Terminal: login ${service}${accountArgument} <password>.`;
    }
    return "This record is not available yet.";
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

  function personName(id) {
    return caseData.people.find((person) => person.id === id)?.name || id || "Unknown";
  }

  function sectionLabel(section) {
    return PHONE_SECTIONS.find(([id]) => id === section)?.[1] || "Phone";
  }

  function formatTime(timestamp) {
    if (!timestamp) return "";
    return timestamp.replace("T", " ").replace(/([+-]\d{2}:\d{2}|Z)$/, "");
  }
}
