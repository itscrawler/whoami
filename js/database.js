// WHOAMI — Database app (resident search and dossiers)

// What the dropdown next to the search box can search by.
const DB_FIELDS = [
  { value: "name", label: "NAME", get: (person) => person.name },
  { value: "id", label: "ID", get: (person) => person.record.id },
  { value: "born", label: "BORN", get: (person) => person.born },
  { value: "address", label: "ADDRESS", get: (person) => person.record.address },
  { value: "status", label: "STATUS", get: (person) => person.record.status },
];

// Builds the app inside its window. Called by renderApp in apps.js.
function renderDatabase(container) {
  const app = createEl("div", "db");

  const layout = createEl("div", "db-layout");
  const sidebar = createEl("aside", "db-sidebar");

  const form = createEl("form", "db-search");
  const prompt = createEl("span", "db-prompt", ">");
  prompt.setAttribute("aria-hidden", "true");

  const input = createEl("input", "db-input");
  input.type = "text";
  input.placeholder = "search residents";
  input.autocomplete = "off";
  input.spellcheck = false;
  input.setAttribute("aria-label", "Search query");

  const select = createEl("select", "db-field");
  select.setAttribute("aria-label", "Search by");
  for (const field of DB_FIELDS) {
    const option = createEl("option", "", field.label);
    option.value = field.value;
    select.appendChild(option);
  }

  const button = createEl("button", "db-submit", "SEARCH");
  button.type = "submit";

  form.append(prompt, input, select, button);

  const results = createEl("div", "db-results");
  results.setAttribute("aria-label", "Residents");
  const message = createEl("p", "db-message", "Enter a query and press SEARCH.");
  results.appendChild(message);

  const footer = createEl("div", "db-footer");
  const summary = createEl("span", "", "READY");
  footer.appendChild(summary);

  sidebar.append(form, results, footer);
  const dossier = createEl("section", "db-dossier");
  dossier.setAttribute("aria-live", "polite");
  dossier.appendChild(createEl("p", "db-empty", "Select a resident to open their dossier."));
  let selectedPerson = null;

  layout.append(sidebar, dossier);
  app.appendChild(layout);
  container.appendChild(app);

  form.addEventListener("submit", (event) => {
    event.preventDefault(); // stay on the page instead of submitting the form
    runSearch(input.value, select.value);
  });

  function runSearch(query, fieldValue) {
    results.replaceChildren();
    query = query.trim().toLowerCase();
    selectedPerson = null;
    dossier.replaceChildren(createEl("p", "db-empty", "Select a resident to open their dossier."));

    if (!caseData) {
      showMessage("Database offline. Try again in a moment.");
      summary.textContent = "NO CONNECTION";
      return;
    }
    if (!query) {
      showMessage("Enter a query and press SEARCH.");
      summary.textContent = "READY";
      return;
    }

    const field = DB_FIELDS.find((f) => f.value === fieldValue);
    const matches = caseData.people.filter(
      (person) =>
        person.record &&
        String(field.get(person) || "")
          .toLowerCase()
          .includes(query)
    );

    for (const person of matches) {
      results.appendChild(createResidentButton(person));
    }

    if (matches.length === 0) showMessage("No records found.");

    const seconds = (0.05 + Math.random() * 0.35).toFixed(2);
    const label = matches.length === 1 ? "RECORD" : "RECORDS";
    summary.textContent = `${matches.length} ${label} · QUERY ${seconds}s`;
  }

  function showMessage(text) {
    results.appendChild(createEl("p", "db-message", text));
  }

  results.addEventListener("click", (event) => {
    const button = event.target.closest(".db-resident");
    if (button) selectPerson(button.dataset.person);
  });

  dossier.addEventListener("click", (event) => {
    const connection = event.target.closest("[data-connection]");
    if (connection) {
      selectPerson(connection.dataset.connection);
      return;
    }

    const tab = event.target.closest("[data-tab]");
    if (!tab) return;
    dossier.querySelector(".is-active")?.classList.remove("is-active");
    dossier.querySelectorAll("[data-tab]").forEach((button) => {
      button.setAttribute("aria-selected", String(button === tab));
    });
    tab.classList.add("is-active");
    renderDossierContent(dossier, selectedPerson, tab.dataset.tab);
  });

  function selectPerson(personId) {
    const person = caseData.people.find((entry) => entry.id === personId && entry.record);
    if (!person) return;

    results.querySelector(".is-selected")?.classList.remove("is-selected");
    results.querySelectorAll(".db-resident").forEach((button) => {
      const isSelected = button.dataset.person === person.id;
      button.classList.toggle("is-selected", isSelected);
      button.setAttribute("aria-pressed", String(isSelected));
    });
    selectedPerson = person;
    renderDossier(dossier, person);
  }
}

function createResidentButton(person) {
  const button = createEl("button", "db-resident");
  button.type = "button";
  button.dataset.person = person.id;
  button.append(
    createEl("span", "db-resident-name", person.name),
    createEl("span", "db-resident-meta", `${person.record.id} · ${person.record.status.toUpperCase()}`)
  );
  return button;
}

function renderDossier(dossier, person) {
  dossier.replaceChildren();
  const layout = createEl("div", "db-profile-layout");
  const main = createEl("div", "db-profile-main");
  const rail = createEl("aside", "db-profile-rail");

  const identity = createEl("header", "db-identity");
  const portrait = createEl("div", "db-portrait");
  portrait.setAttribute("aria-hidden", "true");
  portrait.append(createEl("span", "db-portrait-head"), createEl("span", "db-portrait-body"));
  const profile = createEl("div", "db-identity-info");
  const topLine = createEl("div", "db-identity-top");
  topLine.append(
    createEl("span", "db-id", person.record.id),
    createEl("span", "db-status db-status-" + person.record.status, person.record.status.toUpperCase())
  );
  profile.append(
    topLine,
    createEl("h1", "db-person-name", person.name),
    createEl("p", "db-person-role", person.role || person.type || "Resident")
  );
  identity.append(portrait, profile);

  const facts = createEl("dl", "db-facts");
  const factValues = [
    ["DOB", person.born],
    ["BORN", person.birthplace],
    ["PHONE", person.phone],
    ["EMAIL", person.email],
    ["ADDRESS", person.address || person.record.address],
    ["EMPLOYER", person.job],
    ["VEHICLE", person.car],
  ].filter(([, value]) => value);
  for (const [label, value] of factValues) {
    const item = createEl("div", "db-fact");
    item.append(createEl("dt", "", label), createEl("dd", "", value));
    facts.appendChild(item);
  }

  const tabs = createEl("div", "db-tabs");
  tabs.setAttribute("role", "tablist");
  for (const [id, label] of [
    ["findings", "FINDINGS"],
    ["social", "SOCIAL"],
    ["vehicles", "VEHICLES"],
    ["records", "RECORDS"],
  ]) {
    const tab = createEl("button", "db-tab", label);
    tab.type = "button";
    tab.dataset.tab = id;
    tab.setAttribute("role", "tab");
    tab.setAttribute("aria-selected", String(id === "findings"));
    if (id === "findings") tab.classList.add("is-active");
    tabs.appendChild(tab);
  }

  const content = createEl("div", "db-tab-content");
  main.append(identity, facts, tabs, content);

  const connections = createEl("section", "db-rail-section");
  connections.appendChild(createEl("h2", "db-rail-title", "CONNECTIONS"));
  const family = (person.family || [])
    .map((relative) => ({
      person: caseData.people.find((entry) => entry.id === relative.id && entry.record),
      relation: relative.relation,
    }))
    .filter((relative) => relative.person);
  if (family.length) {
    for (const relative of family) {
      const button = createEl("button", "db-connection");
      button.type = "button";
      button.dataset.connection = relative.person.id;
      button.append(
        createEl("span", "", relative.person.name),
        createEl("span", "db-connection-relation", relative.relation.toUpperCase())
      );
      connections.appendChild(button);
    }
  } else {
    connections.appendChild(createEl("p", "db-rail-empty", "No listed connections."));
  }

  const accounts = createEl("section", "db-rail-section");
  accounts.appendChild(createEl("h2", "db-rail-title", "ACCOUNTS"));
  const socials = person.social || [];
  if (socials.length) {
    for (const account of socials) {
      const row = createEl("div", "db-account");
      row.append(
        createEl("span", "", account.platform),
        createEl("span", "db-account-handle", account.handle || account.note || "PROFILE")
      );
      accounts.appendChild(row);
    }
  } else {
    accounts.appendChild(createEl("p", "db-rail-empty", "No linked accounts."));
  }

  const status = createEl("section", "db-case-status");
  status.append(
    createEl("h2", "db-rail-title", "CASE STATUS"),
    createEl("p", "", caseData.caseInfo.officialVersion.status)
  );
  rail.append(connections, accounts, status);
  layout.append(main, rail);
  dossier.appendChild(layout);
  renderDossierContent(dossier, person, "findings");
}

function renderDossierContent(dossier, person, tabName) {
  const content = dossier.querySelector(".db-tab-content");
  content.replaceChildren();

  if (tabName === "findings") {
    const findings = person.findings || [];
    if (!findings.length) {
      content.appendChild(createEl("p", "db-rail-empty", "No findings recorded."));
      return;
    }
    const list = createEl("ul", "db-findings");
    for (const finding of findings) {
      list.appendChild(createEl("li", "", finding));
    }
    content.appendChild(list);
    return;
  }

  if (tabName === "social") {
    const socials = person.social || [];
    if (!socials.length) {
      content.appendChild(createEl("p", "db-rail-empty", "No social profiles recorded."));
      return;
    }
    for (const account of socials) {
      const row = createEl("article", "db-detail-card");
      row.append(
        createEl("h3", "", account.platform),
        createEl("p", "", account.handle || "Handle not listed"),
        account.note ? createEl("p", "db-detail-note", account.note) : createEl("span", "")
      );
      content.appendChild(row);
    }
    return;
  }

  if (tabName === "vehicles") {
    content.appendChild(
      createEl("p", person.car ? "db-vehicle" : "db-rail-empty", person.car || "No vehicle records.")
    );
    return;
  }

  const entries = [
    ["ID", person.record.id],
    ["NAME", person.name],
    ["ROLE", person.role || person.type],
    ["DATE OF BIRTH", person.born],
    ["BIRTHPLACE", person.birthplace],
    ["STATUS", person.status],
    ["REGISTERED ADDRESS", person.address || person.record.address],
    ["PHONE", person.phone],
    ["EMAIL", person.email],
    ["EMPLOYMENT", person.job],
    ["VEHICLE", person.car],
  ].filter(([, value]) => value);
  const list = createEl("dl", "db-records");
  for (const [label, value] of entries) {
    const item = createEl("div", "db-record");
    item.append(createEl("dt", "", label), createEl("dd", "", value));
    list.appendChild(item);
  }
  content.appendChild(list);
}
