// WHOAMI — Database app (residents search)
// Lists people from people.json that have a "record" block. Every record looks like this:
//
//   "record": {
//     "id": "P-04419",          — unique, shown in the ID column
//     "address": "Tacoma, WA",  — city and state only, where they live now
//     "status": "alive"         — alive, missing, dead, duty (or any other word)
//   }
//
// NAME and BORN come from the person's "name" and "born", so they aren't repeated here.

// What the dropdown next to the search box can search by.
const DB_FIELDS = [
  { value: "name", label: "NAME", get: (person) => person.name },
  { value: "id", label: "ID", get: (person) => person.record.id },
  { value: "born", label: "BORN", get: (person) => person.born },
  { value: "address", label: "ADDRESS", get: (person) => person.record.address },
  { value: "status", label: "STATUS", get: (person) => person.record.status },
];

const DB_COLUMNS = ["ID", "NAME", "BORN", "ADDRESS", "STATUS"];

// Builds the app inside its window. Called by renderApp in apps.js.
function renderDatabase(container) {
  const app = createEl("div", "db");

  // Search bar: > [query] [NAME ▾] [SEARCH]
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

  // Results table
  const results = createEl("div", "db-results");
  const table = createEl("table", "db-table");
  const headRow = createEl("tr", "");
  for (const column of DB_COLUMNS) {
    headRow.appendChild(createEl("th", "", column));
  }
  const thead = createEl("thead", "");
  thead.appendChild(headRow);
  const tbody = createEl("tbody", "");
  table.append(thead, tbody);

  // Shown instead of rows before the first search and when nothing matches
  const message = createEl("p", "db-message", "Enter a query and press SEARCH.");
  results.append(table, message);

  // Footer: "4 RECORDS · QUERY 0.21s"
  const footer = createEl("div", "db-footer");
  const summary = createEl("span", "", "READY");
  footer.appendChild(summary);

  app.append(form, results, footer);
  container.appendChild(app);

  form.addEventListener("submit", (event) => {
    event.preventDefault(); // stay on the page instead of submitting the form
    runSearch(input.value, select.value);
  });

  function runSearch(query, fieldValue) {
    tbody.innerHTML = "";
    query = query.trim().toLowerCase();

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
      (person) => person.record && field.get(person).toLowerCase().includes(query)
    );

    for (const person of matches) {
      tbody.appendChild(createDatabaseRow(person));
    }

    if (matches.length === 0) showMessage("No records found.");
    else message.hidden = true;

    // A made-up query time, so the database feels like a real server
    const seconds = (0.05 + Math.random() * 0.35).toFixed(2);
    const label = matches.length === 1 ? "RECORD" : "RECORDS";
    summary.textContent = `${matches.length} ${label} · QUERY ${seconds}s`;
  }

  function showMessage(text) {
    message.textContent = text;
    message.hidden = false;
  }

  // Clicking a row selects it (orange bar on the left). Opening a profile comes later.
  tbody.addEventListener("click", (event) => {
    const row = event.target.closest("tr");
    if (!row) return;
    tbody.querySelector(".is-selected")?.classList.remove("is-selected");
    row.classList.add("is-selected");
  });
}

// One row of the results table.
function createDatabaseRow(person) {
  const record = person.record;
  const row = createEl("tr", "");
  row.dataset.person = person.id;

  // Each status has its own look in os.css: .db-status-alive, .db-status-missing, ...
  const status = createEl("td", "");
  status.appendChild(
    createEl("span", "db-status db-status-" + record.status, record.status.toUpperCase())
  );

  row.append(
    createEl("td", "db-id", record.id),
    createEl("td", "db-name", person.name),
    createEl("td", "db-born", person.born),
    createEl("td", "", record.address),
    status
  );
  return row;
}
