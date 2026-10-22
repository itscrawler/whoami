// WHOAMI — embedded map demo

const CASE_MAP_LOCATION_IDS = {
  "mia-home": "mia-home",
  "marine-parkway-bridge": "north-bridge",
  "dead-horse-bay": "body-site",
  "gerritsen-beach": "owen-home",
  "owen-home": "owen-home",
  "veridia-office": "veridia",
  "salt-and-cedar": "restaurant",
  "red-hook-warehouse": "warehouse",
};

function renderMap(container) {
  const frame = createEl("iframe", "case-map-frame");
  frame.title = "WHOAMI case map demonstration";
  frame.src = "map-demo.html";
  frame.addEventListener("load", () => syncMapDemo(frame));
  container.appendChild(frame);

  window.refreshCaseMap = () => syncMapDemo(frame);
}

function syncMapDemo(frame) {
  const demoWindow = frame.contentWindow;
  if (!demoWindow) return;

  const unlockedPlaces = new Set(
    (caseData?.caseInfo?.places || [])
      .filter((place) =>
        (place.unlockedBy || []).some((evidenceId) =>
          window.CASE_PROGRESS.foundEvidence.has(evidenceId)
        )
      )
      .map((place) => CASE_MAP_LOCATION_IDS[place.id])
      .filter(Boolean)
  );

  for (const id of unlockedPlaces) {
    demoWindow.dispatchEvent(new demoWindow.CustomEvent("whoami:location-found", {
      detail: { id },
    }));
  }

  if (window.CASE_PROGRESS.foundEvidence.has("ev-tower-log")) {
    demoWindow.dispatchEvent(new demoWindow.CustomEvent("whoami:route-found"));
  }
}
