// WHOAMI — app registry
// Every app in the game OS is one entry in this list.
// To add a new app: add one object here. The dock button and the window are built from it.
//
//   id       — short name used in code and in data-app="..."
//   name     — shown in the dock tooltip and the window title bar
//   subtitle — small muted text after the name in the title bar
//   section  — "apps" (top group of the dock) or "tools" (group under the divider)
//   width / height — default window size in pixels
//   icon     — the inside of a 24×24 SVG (thin line shapes)

const APPS = [
  {
    id: "mail",
    name: "Mail",
    subtitle: "/ inbox",
    section: "apps",
    width: 640,
    height: 440,
    icon: '<rect x="3" y="5" width="18" height="14"/><path d="M3 7l9 6 9-6"/>',
  },
  {
    id: "database",
    name: "Database",
    subtitle: "/ residents",
    section: "apps",
    width: 1120,
    height: 650,
    render: renderDatabase, // js/database.js
    icon: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  },
  {
    id: "browser",
    name: "Browser",
    subtitle: "/ web",
    section: "apps",
    width: 560,
    height: 400,
    icon: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>',
  },
  {
    id: "phone",
    name: "Phone",
    subtitle: "/ call records",
    section: "apps",
    width: 560,
    height: 400,
    icon: '<rect x="7" y="3" width="10" height="18"/><path d="M11 18h2"/>',
  },
  {
    id: "map",
    name: "Map",
    subtitle: "/ city",
    section: "apps",
    width: 820,
    height: 540,
    icon: '<path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/>',
  },
  {
    id: "cameras",
    name: "Cameras",
    subtitle: "/ street feeds",
    section: "apps",
    width: 860,
    height: 540,
    icon: '<rect x="3" y="7" width="13" height="10"/><path d="M16 10l5-3v10l-5-3"/>',
  },
  {
    id: "terminal",
    name: "Terminal",
    subtitle: "/ shell",
    section: "apps",
    width: 520,
    height: 340,
    icon: '<rect x="3" y="4" width="18" height="16"/><path d="M7 9l3 3-3 3M12 15h5"/>',
  },
  {
    id: "files",
    name: "Files",
    subtitle: "/ downloads",
    section: "apps",
    width: 560,
    height: 400,
    icon: '<path d="M3 6h6l2 2h10v11H3z"/>',
  },
  {
    id: "board",
    name: "Evidence board",
    subtitle: "/ case notes",
    section: "tools",
    width: 560,
    height: 400,
    icon: '<rect x="3" y="4" width="18" height="16"/><path d="M7 9h4M7 13h6M15 9l2 6"/>',
  },
  {
    id: "handbook",
    name: "Handbook",
    subtitle: "/ how-to",
    section: "tools",
    width: 560,
    height: 400,
    icon: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>',
  },
  {
    id: "report",
    name: "Report",
    subtitle: "/ draft",
    section: "tools",
    width: 560,
    height: 400,
    icon: '<path d="M6 3h9l4 4v14H6z"/><path d="M9 13l2 2 4-4"/>',
  },
];

// The exit button sits at the bottom of the dock. It is not an app (it opens no window),
// so it lives here on its own, but it uses the same icon style.
const EXIT_ICON = '<path d="M14 4h6v16h-6M10 8l-4 4 4 4M6 12h10"/>';

// Finds an app in the list by its id, e.g. getApp("mail").
function getApp(appId) {
  return APPS.find((app) => app.id === appId);
}

// Builds a 20×20 line icon from the SVG shapes in an app entry.
// SVG elements need createElementNS (the SVG "namespace"), not plain createElement.
function createIcon(shapes) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "20");
  svg.setAttribute("height", "20");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor"); // takes the button's text color
  svg.setAttribute("stroke-width", "1.6");
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = shapes; // just the few <path>/<rect> tags from the list above
  return svg;
}

// Fills a window's content area with the app.
// For now every app shows a placeholder. Later, give an app a render function
// in its entry above (e.g. render: renderDatabase) and it will be used instead.
function renderApp(app, container) {
  if (app.render) {
    app.render(container);
    return;
  }
  container.appendChild(createPlaceholder(app));
}

// The "module offline" block shown inside apps that are not built yet.
function createPlaceholder(app) {
  const box = document.createElement("div");
  box.className = "app-placeholder";

  const title = document.createElement("p");
  title.append("> ");
  const name = document.createElement("span");
  name.className = "accent";
  name.textContent = app.name.toUpperCase();
  title.appendChild(name);

  const note = document.createElement("p");
  note.className = "app-placeholder-note";
  note.textContent = "module offline — coming soon";

  box.append(title, note);
  return box;
}
