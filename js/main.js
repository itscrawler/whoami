// WHOAMI — entry point

const CASE_ID = "535";

async function loadCase(id) {
  const base = `data/cases/${id}`;
  const [caseInfo, people, evidence] = await Promise.all([
    fetch(`${base}/case.json`).then((r) => r.json()),
    fetch(`${base}/people.json`).then((r) => r.json()),
    fetch(`${base}/evidence.json`).then((r) => r.json()),
  ]);
  return { caseInfo, people, evidence };
}

loadCase(CASE_ID).then((data) => {
  console.log("Case loaded:", data.caseInfo.title);
  console.log(`${data.people.length} people, ${data.evidence.length} pieces of evidence`);

  // TODO: build the desktop, dock and windows
});
