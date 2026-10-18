// WHOAMI — entry point (game.html)

// Case id comes from the URL: game.html?case=535
const CASE_ID = new URLSearchParams(location.search).get("case") || "535";

async function loadCase(id) {
  const base = `data/cases/${id}`;
  const [caseInfo, people, evidence] = await Promise.all([
    fetch(`${base}/case.json`).then((r) => r.json()),
    fetch(`${base}/people.json`).then((r) => r.json()),
    fetch(`${base}/evidence.json`).then((r) => r.json()),
  ]);
  return { caseInfo, people, evidence };
}

loadCase(CASE_ID)
  .then((data) => {
    document.title = `WHOAMI — #${data.caseInfo.id} ${data.caseInfo.title}`;
    document.getElementById("case-title").textContent = `#${data.caseInfo.id} ${data.caseInfo.title}`;

    console.log("Case loaded:", data.caseInfo.title);
    console.log(`${data.people.length} people, ${data.evidence.length} pieces of evidence`);

    // TODO: build the desktop, dock and windows
  })
  .catch(() => {
    document.getElementById("case-title").textContent = `Case #${CASE_ID} not found`;
  });
