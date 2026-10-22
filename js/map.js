// WHOAMI — case map

const MAP_VIEW = { width: 1000, height: 700, minLng: -74.08, maxLng: -73.82, minLat: 40.54, maxLat: 40.76 };

function renderMap(container) {
  const app = createEl("div", "case-map");
  const layers = { places: true, towers: true, route: true, cameras: true };
  let selected = null;
  let zoom = 1;

  if (!caseData?.caseInfo?.places?.length) {
    app.appendChild(createEl("p", "case-map-empty", "Case location data is unavailable."));
    container.appendChild(app);
    return;
  }

  const evidenceById = new Map(caseData.evidence.map((entry) => [entry.id, entry]));
  const towerEvidence = caseData.evidence.find((entry) =>
    entry.content?.type === "log" && entry.content.entries?.some((record) => record.tower)
  );
  const canvas = createEl("div", "case-map-canvas");
  const scene = createEl("div", "case-map-scene");
  const backdrop = createMapBackdrop();
  const detail = createEl("aside", "case-map-detail");
  const toolbar = createEl("div", "case-map-toolbar");
  const layerControls = createEl("div", "case-map-layers");
  const zoomControls = createEl("div", "case-map-zoom");
  const zoomOut = createEl("button", "case-map-control", "−");
  const zoomLabel = createEl("span", "case-map-zoom-label", "100%");
  const zoomIn = createEl("button", "case-map-control", "+");

  toolbar.append(layerControls, zoomControls);
  zoomOut.type = "button";
  zoomIn.type = "button";
  zoomOut.setAttribute("aria-label", "Zoom out");
  zoomIn.setAttribute("aria-label", "Zoom in");
  zoomControls.append(zoomOut, zoomLabel, zoomIn);
  scene.appendChild(backdrop);
  canvas.appendChild(scene);
  const body = createEl("div", "case-map-body");
  body.append(canvas, detail);
  app.append(toolbar, body);
  container.appendChild(app);

  drawLayers();
  drawMarkers();
  showWelcome();

  window.refreshCaseMap = (evidenceId) => {
    if (!app.isConnected && !container.contains(app)) return;
    drawLayers();
    drawMarkers();
    if (selected?.evidenceIds?.includes(evidenceId)) showSelection(selected);
  };

  layerControls.addEventListener("click", (event) => {
    const button = event.target.closest("[data-map-layer]");
    if (!button) return;
    const layer = button.dataset.mapLayer;
    layers[layer] = !layers[layer];
    drawLayers();
    drawMarkers();
  });

  canvas.addEventListener("click", (event) => {
    const marker = event.target.closest("[data-map-marker]");
    if (!marker) return;
    const item = marker.dataset.mapMarker;
    if (item.startsWith("place:")) {
      const place = caseData.caseInfo.places.find((entry) => entry.id === item.slice(6));
      if (place) showSelection(placeSelection(place));
    } else if (item.startsWith("tower:")) {
      const index = Number(item.slice(6));
      const tower = towerEntries()[index];
      if (tower) showSelection(towerSelection(tower, index));
    } else if (item.startsWith("camera:")) {
      const place = caseData.caseInfo.places.find((entry) => entry.cameraEvidenceId === item.slice(7));
      if (place) showSelection(cameraSelection(place));
    }
  });

  zoomOut.addEventListener("click", () => setZoom(zoom - 0.2));
  zoomIn.addEventListener("click", () => setZoom(zoom + 0.2));

  function drawLayers() {
    layerControls.replaceChildren();
    const counts = {
      places: discoveredPlaces().length,
      towers: towerFound() ? towerEntries().length : 0,
      route: towerFound() ? 1 : 0,
      cameras: discoveredCameras().length,
    };
    for (const [id, label] of [
      ["places", "PLACES"],
      ["towers", "TOWERS"],
      ["route", "ROUTE"],
      ["cameras", "CAMERAS"],
    ]) {
      const button = createEl("button", `case-map-layer${layers[id] ? " is-active" : ""}`);
      button.type = "button";
      button.dataset.mapLayer = id;
      button.setAttribute("aria-pressed", String(layers[id]));
      button.textContent = `${label} · ${counts[id]}`;
      layerControls.appendChild(button);
    }
  }

  function drawMarkers() {
    scene.querySelectorAll(".case-map-marker, .case-map-route").forEach((element) => element.remove());
    const placeList = discoveredPlaces();
    if (layers.route && towerFound()) {
      const route = towerEntries().filter((entry) => validCoordinates(entry.coordinates));
      if (route.length > 1) {
        const line = createSvgElement("polyline");
        line.classList.add("case-map-route");
        line.setAttribute("points", route.map((entry) => project(entry.coordinates).join(",")).join(" "));
        backdrop.appendChild(line);
      }
    }

    if (layers.places) {
      placeList.forEach((place) => addMarker("place", place.id, place.name, place.coordinates, "PLACE"));
    }
    if (layers.towers && towerFound()) {
      towerEntries().forEach((entry, index) => {
        if (validCoordinates(entry.coordinates)) {
          addMarker("tower", String(index), entry.tower, entry.coordinates, "TOWER", (index % 3 - 1) * 1.1);
        }
      });
    }
    if (layers.cameras) {
      discoveredCameras().forEach(({ place, evidenceId }) => {
        addMarker("camera", evidenceId, "Camera · " + place.name, place.coordinates, "CAM", 1.4);
      });
    }
    scene.style.transform = `scale(${zoom})`;
  }

  function addMarker(kind, id, label, coordinates, icon, offsetX = 0) {
    if (!validCoordinates(coordinates)) return;
    const [x, y] = project(coordinates);
    const marker = createEl("button", `case-map-marker case-map-marker-${kind}`, icon);
    marker.type = "button";
    marker.dataset.mapMarker = `${kind}:${id}`;
    marker.title = label;
    marker.setAttribute("aria-label", `${kind}: ${label}`);
    marker.style.left = `${x / MAP_VIEW.width * 100 + offsetX}%`;
    marker.style.top = `${y / MAP_VIEW.height * 100}%`;
    scene.appendChild(marker);
  }

  function showWelcome() {
    detail.replaceChildren(
      createEl("p", "case-map-kicker", "CASE MAP · " + caseData.caseInfo.city.toUpperCase()),
      createEl("h2", "case-map-title", "Locations"),
      createEl("p", "case-map-copy", "Map locations appear as you uncover evidence. Select a marker to inspect its details."),
      createEl("p", "case-map-hint", "Toggle layers to show places, cell towers, the phone route, and camera locations."),
    );
  }

  function showSelection(item) {
    selected = item;
    detail.replaceChildren(
      createEl("p", "case-map-kicker", item.kind),
      createEl("h2", "case-map-title", item.name),
      createEl("p", "case-map-copy", item.description),
    );
    if (item.meta) detail.appendChild(createEl("p", "case-map-meta", item.meta));
    const sources = (item.evidenceIds || []).filter((id) => window.CASE_PROGRESS.foundEvidence.has(id));
    if (sources.length) {
      detail.appendChild(createEl("p", "case-map-section-label", "RELATED EVIDENCE"));
      for (const id of sources) {
        const evidence = evidenceById.get(id);
        if (!evidence) continue;
        const button = createEl("button", "case-map-evidence", evidence.title);
        button.type = "button";
        button.addEventListener("click", () => openEvidence(evidence));
        detail.appendChild(button);
      }
    }
  }

  function placeSelection(place) {
    const evidenceIds = place.unlockedBy || [];
    return {
      id: place.id,
      kind: place.type || "PLACE",
      name: place.name,
      description: `${caseData.caseInfo.city} · ${place.type || "case location"}`,
      evidenceIds,
    };
  }

  function towerSelection(entry, index) {
    return {
      id: `tower-${index}`,
      kind: "CELL TOWER",
      name: entry.tower,
      description: `Phone signal recorded at ${entry.time || "unknown time"}.`,
      meta: `COORDINATES · ${entry.coordinates[1].toFixed(4)}° N · ${Math.abs(entry.coordinates[0]).toFixed(4)}° W`,
      evidenceIds: [towerEvidence.id],
    };
  }

  function cameraSelection(place) {
    const evidence = evidenceById.get(place.cameraEvidenceId);
    return {
      id: `camera-${place.cameraEvidenceId}`,
      kind: "CAMERA",
      name: evidence?.content?.camera || place.name,
      description: evidence?.title || "Camera archive",
      meta: `${evidence?.content?.clips?.length || 0} archived clips · ${place.name}`,
      evidenceIds: [place.cameraEvidenceId],
    };
  }

  function openEvidence(evidence) {
    openAuxiliaryWindow({
      id: `map-evidence-${evidence.id}`,
      name: evidence.title,
      subtitle: "/ map evidence",
      width: 620,
      height: 440,
      render(viewer) {
        viewer.appendChild(createEl("pre", "case-map-evidence-viewer", JSON.stringify(evidence.content || {}, null, 2)));
      },
    });
  }

  function discoveredPlaces() {
    return caseData.caseInfo.places.filter((place) =>
      (place.unlockedBy || []).some((id) => window.CASE_PROGRESS.foundEvidence.has(id))
    );
  }

  function discoveredCameras() {
    return caseData.caseInfo.places
      .filter((place) => place.cameraEvidenceId && window.CASE_PROGRESS.foundEvidence.has(place.cameraEvidenceId))
      .map((place) => ({ place, evidenceId: place.cameraEvidenceId }));
  }

  function towerFound() {
    return Boolean(towerEvidence && window.CASE_PROGRESS.foundEvidence.has(towerEvidence.id));
  }

  function towerEntries() {
    return towerEvidence?.content?.entries || [];
  }

  function setZoom(value) {
    zoom = Math.min(1.8, Math.max(1, Math.round(value * 10) / 10));
    zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
    scene.style.transform = `scale(${zoom})`;
  }
}

function project(coordinates) {
  const [longitude, latitude] = coordinates;
  return [
    ((longitude - MAP_VIEW.minLng) / (MAP_VIEW.maxLng - MAP_VIEW.minLng)) * MAP_VIEW.width,
    ((MAP_VIEW.maxLat - latitude) / (MAP_VIEW.maxLat - MAP_VIEW.minLat)) * MAP_VIEW.height,
  ];
}

function validCoordinates(coordinates) {
  return Array.isArray(coordinates) && coordinates.length === 2 &&
    coordinates.every((value) => Number.isFinite(value)) &&
    coordinates[0] >= MAP_VIEW.minLng && coordinates[0] <= MAP_VIEW.maxLng &&
    coordinates[1] >= MAP_VIEW.minLat && coordinates[1] <= MAP_VIEW.maxLat;
}

function createMapBackdrop() {
  const svg = createSvgElement("svg");
  svg.setAttribute("class", "case-map-backdrop");
  svg.setAttribute("viewBox", `0 0 ${MAP_VIEW.width} ${MAP_VIEW.height}`);
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = `
    <path class="case-map-land" d="M0 0H1000V392L952 402 924 425 888 428 850 448 818 442 786 462 754 453 728 474 692 469 669 488 638 483 610 505 574 498 544 525 505 518 473 545 433 536 405 559 365 548 336 563 297 550 264 561 231 543 198 550 163 530 133 535 104 509 76 510 47 480 20 472 0 447Z"/>
    <path class="case-map-waterway" d="M0 470C115 448 163 500 255 489S396 516 500 505 671 475 761 495 913 463 1000 451"/>
    <path class="case-map-waterway" d="M636 487C662 531 699 552 733 568S793 605 835 700"/>
    <path class="case-map-road" d="M34 82C214 149 370 131 523 184S795 222 958 160"/>
    <path class="case-map-road" d="M-8 211C151 248 304 226 433 263S731 320 982 270"/>
    <path class="case-map-road" d="M40 357C188 316 323 337 461 364S747 411 955 354"/>
    <path class="case-map-road" d="M123 25C173 167 193 304 220 475"/>
    <path class="case-map-road" d="M337 -5C322 145 369 271 355 438"/>
    <path class="case-map-road" d="M527 12C486 150 525 293 504 511"/>
    <path class="case-map-road" d="M716 -3C676 152 702 306 673 484"/>
    <path class="case-map-road" d="M877 15C842 148 864 297 838 464"/>
    <path class="case-map-park" d="M627 484l42-9 34 24-18 27-44-8z"/>
    <path class="case-map-park" d="M770 423l35-5 22 22-19 28-39-9z"/>
    <text class="case-map-label" x="344" y="180">BROOKLYN</text>
    <text class="case-map-label case-map-label-small" x="125" y="224">RED HOOK</text>
    <text class="case-map-label case-map-label-small" x="408" y="117">BUSHWICK</text>
    <text class="case-map-label case-map-label-small" x="519" y="373">FLATBUSH</text>
    <text class="case-map-label case-map-label-small" x="708" y="624">JAMAICA BAY</text>
  `;
  return svg;
}

function createSvgElement(name) {
  return document.createElementNS("http://www.w3.org/2000/svg", name);
}
