// WHOAMI — case map
// The street map itself lives in map-demo.html (MapLibre, in an iframe). This file decides
// what is on it from case.json + found evidence, and draws the layer toggles and the detail panel.

const CASE_MAP_LAYERS = [
  ["places", "PLACES"],
  ["towers", "TOWERS"],
  ["route", "ROUTE"],
  ["cameras", "CAMERAS"],
];

// The open map window, so other apps can focus a place on it. Null while the map is closed.
let caseMapView = null;
// A focus request made before the map finished loading (e.g. "SHOW ON MAP" opened the window).
let caseMapPendingFocus = null;

// A place is on the map when it is public knowledge ("known") or any of its unlockedBy records was found.
function isPlaceDiscovered(place) {
  return place.known === true ||
    (place.unlockedBy || []).some((id) => window.CASE_PROGRESS.foundEvidence.has(id));
}

// Everything the map can currently show, built from case data and progress.
function caseMapData() {
  const places = (caseData?.caseInfo.places || []).filter(isPlaceDiscovered);

  // Towers: every found log with tower entries, plus the last signal from a found police file.
  const towers = new Map();
  let route = [];
  for (const evidence of caseData?.evidence || []) {
    if (!window.CASE_PROGRESS.foundEvidence.has(evidence.id)) continue;
    const entries = (evidence.content?.entries || []).filter((entry) => entry.tower && entry.coordinates);
    const lastSignal = evidence.content?.lastPhoneSignal;
    if (lastSignal?.tower && lastSignal.coordinates) entries.push(lastSignal);
    for (const entry of entries) {
      const tower = towers.get(entry.tower) || {
        id: entry.tower,
        name: entry.tower,
        coordinates: entry.coordinates,
        times: new Set(),
        evidenceIds: new Set(),
      };
      tower.times.add(entry.time);
      tower.evidenceIds.add(evidence.id);
      towers.set(entry.tower, tower);
    }
    // The route is the full tower log in time order (a single last signal is not a route).
    if (entries.length > 1) route = entries.map((entry) => entry.coordinates);
  }

  const cameras = (caseData?.caseInfo.places || [])
    .filter((place) => place.cameraEvidenceId && window.CASE_PROGRESS.foundEvidence.has(place.cameraEvidenceId))
    .map((place) => {
      const evidence = evidenceById(place.cameraEvidenceId);
      return {
        id: place.cameraEvidenceId,
        name: evidence?.content?.camera || place.name,
        coordinates: place.coordinates,
        place,
        evidence,
      };
    });

  return {
    places: places.map((place) => ({ id: place.id, name: place.name, type: place.type, coordinates: place.coordinates })),
    towers: [...towers.values()].map((tower) => ({
      ...tower,
      times: [...tower.times].sort(),
      evidenceIds: [...tower.evidenceIds],
    })),
    route,
    cameras: cameras.map(({ id, name, coordinates }) => ({ id, name, coordinates })),
    cameraDetails: cameras,
  };
}

function renderMap(container) {
  const app = createEl("div", "case-map");
  const layers = { places: true, towers: true, route: true, cameras: true };
  const toolbar = createEl("div", "case-map-toolbar");
  const layerControls = createEl("div", "case-map-layers");
  toolbar.appendChild(layerControls);
  const canvas = createEl("div", "case-map-canvas");
  const frame = createEl("iframe", "case-map-frame");
  frame.title = "Case map";
  frame.src = "map-demo.html?embed=1";
  canvas.appendChild(frame);
  const detail = createEl("aside", "case-map-detail");
  const body = createEl("div", "case-map-body");
  body.append(canvas, detail);
  app.append(toolbar, body);
  container.appendChild(app);

  let data = caseMapData();
  let selected = null; // { kind, id }

  const view = {
    focus(kind, id) {
      select(kind, id);
      frameMap()?.focus(kind, id);
    },
  };
  caseMapView = view;

  function frameMap() {
    return frame.contentWindow?.WhoamiMap || null;
  }

  function sync() {
    data = caseMapData();
    frameMap()?.setData({ ...data, cameraDetails: undefined, layers, selected });
    drawLayerControls();
    if (selected) showSelection();
    else showOverview();
  }

  frame.addEventListener("load", () => {
    sync();
    if (caseMapPendingFocus) {
      const { kind, id } = caseMapPendingFocus;
      caseMapPendingFocus = null;
      view.focus(kind, id);
    }
  });

  // Marker clicks inside the iframe.
  onCaseEvent(app, "whoami:map-select", (event) => select(event.detail.kind, event.detail.id));

  window.refreshCaseMap = () => {
    if (!app.isConnected) {
      if (caseMapView === view) caseMapView = null;
      return;
    }
    sync();
  };

  layerControls.addEventListener("click", (event) => {
    const button = event.target.closest("[data-map-layer]");
    if (!button) return;
    layers[button.dataset.mapLayer] = !layers[button.dataset.mapLayer];
    sync();
  });

  detail.addEventListener("click", (event) => {
    const evidenceButton = event.target.closest("[data-map-evidence]");
    if (evidenceButton) {
      const evidence = evidenceById(evidenceButton.dataset.mapEvidence);
      if (evidence) openEvidenceViewer(evidence, "/ map");
      return;
    }
    const itemButton = event.target.closest("[data-map-kind]");
    if (itemButton) view.focus(itemButton.dataset.mapKind, itemButton.dataset.mapId);
    if (event.target.closest("[data-map-back]")) {
      selected = null;
      sync();
    }
  });

  function drawLayerControls() {
    layerControls.replaceChildren();
    const counts = {
      places: data.places.length,
      towers: data.towers.length,
      route: data.route.length > 1 ? 1 : 0,
      cameras: data.cameras.length,
    };
    for (const [id, label] of CASE_MAP_LAYERS) {
      const button = createEl("button", `case-map-layer${layers[id] ? " is-active" : ""}`, `${label} · ${counts[id]}`);
      button.type = "button";
      button.dataset.mapLayer = id;
      button.setAttribute("aria-pressed", String(layers[id]));
      layerControls.appendChild(button);
    }
  }

  function select(kind, id) {
    selected = { kind, id };
    frameMap()?.setData({ ...data, cameraDetails: undefined, layers, selected });
    showSelection();
  }

  // Default panel: a clickable list of everything discovered, so the map is usable even without tiles.
  function showOverview() {
    detail.replaceChildren(
      createEl("p", "case-map-kicker", `CASE MAP · ${caseData.caseInfo.city.toUpperCase()}`),
      createEl("h2", "case-map-title", "Locations"),
      createEl("p", "case-map-copy", "Places, cell towers, the phone route and cameras appear as you uncover evidence.")
    );
    const groups = [
      ["place", "PLACES", data.places],
      ["tower", "TOWERS", data.towers],
      ["camera", "CAMERAS", data.cameras],
    ];
    for (const [kind, label, items] of groups) {
      if (!items.length) continue;
      detail.appendChild(createEl("p", "case-map-section-label", label));
      for (const item of items) {
        const button = createEl("button", "case-map-evidence", item.name);
        button.type = "button";
        button.dataset.mapKind = kind;
        button.dataset.mapId = item.id;
        detail.appendChild(button);
      }
    }
  }

  function showSelection() {
    const item = selectionDetails();
    if (!item) {
      selected = null;
      showOverview();
      return;
    }
    const back = createEl("button", "case-map-back", "← ALL LOCATIONS");
    back.type = "button";
    back.dataset.mapBack = "true";
    detail.replaceChildren(
      back,
      createEl("p", "case-map-kicker", item.kind),
      createEl("h2", "case-map-title", item.name)
    );
    if (item.description) detail.appendChild(createEl("p", "case-map-copy", item.description));
    if (item.meta) detail.appendChild(createEl("p", "case-map-meta", item.meta));

    const people = item.people || [];
    if (people.length) {
      detail.appendChild(createEl("p", "case-map-section-label", "PEOPLE HERE"));
      for (const person of people) detail.appendChild(createEl("p", "case-map-copy", person.name));
    }

    const sources = item.evidenceIds.filter((id) => window.CASE_PROGRESS.foundEvidence.has(id));
    if (sources.length) {
      detail.appendChild(createEl("p", "case-map-section-label", "RELATED EVIDENCE"));
      for (const id of sources) {
        const evidence = evidenceById(id);
        if (!evidence) continue;
        const button = createEl("button", "case-map-evidence", evidence.title);
        button.type = "button";
        button.dataset.mapEvidence = id;
        detail.appendChild(button);
      }
    }
  }

  function selectionDetails() {
    const { kind, id } = selected;
    if (kind === "place") {
      const place = caseData.caseInfo.places.find((entry) => entry.id === id);
      if (!place || !isPlaceDiscovered(place)) return null;
      return {
        kind: place.type || "place",
        name: place.name,
        description: caseData.caseInfo.city,
        meta: coordinatesLabel(place.coordinates),
        people: caseData.people.filter((person) =>
          person.place === place.id && window.CASE_PROGRESS.foundPeople.has(person.id)
        ),
        evidenceIds: [...new Set([...(place.unlockedBy || []), place.cameraEvidenceId].filter(Boolean))],
      };
    }
    if (kind === "tower") {
      const tower = data.towers.find((entry) => entry.id === id);
      if (!tower) return null;
      return {
        kind: "cell tower",
        name: tower.name,
        description: `Phone signal recorded: ${tower.times.map(formatEvidenceTime).join(", ")}`,
        meta: coordinatesLabel(tower.coordinates),
        evidenceIds: tower.evidenceIds,
      };
    }
    if (kind === "camera") {
      const camera = data.cameraDetails.find((entry) => entry.id === id);
      if (!camera) return null;
      return {
        kind: "camera",
        name: camera.name,
        description: `${camera.evidence?.content?.clips?.length || 0} archived clips · ${camera.place.name}`,
        meta: coordinatesLabel(camera.coordinates),
        evidenceIds: [camera.id],
      };
    }
    return null;
  }

  sync();
}

function coordinatesLabel(coordinates) {
  if (!Array.isArray(coordinates)) return "";
  return `${coordinates[1].toFixed(4)}° N · ${Math.abs(coordinates[0]).toFixed(4)}° W`;
}

// Opens a place, tower or camera on the map (used by the database's "SHOW ON MAP").
window.focusCaseMap = function focusCaseMap(kind, id) {
  const frameReady = caseMapView && document.querySelector(".case-map-frame")?.contentWindow?.WhoamiMap;
  if (frameReady) caseMapView.focus(kind, id);
  else caseMapPendingFocus = { kind, id };
};
