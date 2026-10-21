// WHOAMI — top bar
// Shows the case number and title, the city, and the in-game clock.

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

// Fills the top bar with info from case.json and starts the clock.
function initTopbar(caseInfo) {
  // "CASE #535 · NORTH BRIDGE" with the number in orange
  const label = document.getElementById("case-label");
  const number = document.createElement("span");
  number.className = "accent";
  number.textContent = "#" + caseInfo.id;
  label.textContent = ""; // clear "LOADING CASE..."
  label.append("CASE ", number, " · " + caseInfo.title.toUpperCase());

  document.getElementById("case-city").textContent = caseInfo.city.toUpperCase();
  document.getElementById("help-button").addEventListener("click", () => {
    launchApp("handbook");
  });

  startClock(caseInfo.intro.timestamp);
}

// Shown in the top bar when the case files can't be loaded (e.g. wrong ?case= id).
function showCaseNotFound(caseId) {
  document.getElementById("case-label").textContent = "CASE #" + caseId + " NOT FOUND";
}

// Starts the in-game clock at the case's start time (e.g. Oct 13 2026, 01:24)
// and moves it forward in real time, one second per second.
// It shows the time in the case city's time zone, not the player's.
function startClock(timestamp) {
  const clock = document.getElementById("game-clock");
  const gameStart = Date.parse(timestamp); // the case start time, in milliseconds
  const realStart = Date.now(); // when the player opened the page
  const offset = getUtcOffsetMinutes(timestamp) * 60 * 1000;

  function update() {
    const passed = Date.now() - realStart;
    // Trick: shift the time by the city's UTC offset and then read it with the
    // getUTC... methods. That gives the city's local time in any time zone.
    const cityTime = new Date(gameStart + passed + offset);
    clock.textContent = formatClock(cityTime);
  }

  update();
  setInterval(update, 1000);
}

// Reads the time zone at the end of a timestamp, e.g. "-07:00" -> -420 minutes.
// A timestamp ending in "Z" (or without a time zone) counts as UTC, so 0.
function getUtcOffsetMinutes(timestamp) {
  const match = timestamp.match(/([+-])(\d{2}):(\d{2})$/);
  if (!match) return 0;

  const minutes = Number(match[2]) * 60 + Number(match[3]);
  return match[1] === "-" ? -minutes : minutes;
}

// Formats a date as "OCT 13 2026 · 01:24".
function formatClock(date) {
  const twoDigits = (n) => String(n).padStart(2, "0");
  const month = MONTHS[date.getUTCMonth()];
  const day = twoDigits(date.getUTCDate());
  const year = date.getUTCFullYear();
  const hours = twoDigits(date.getUTCHours());
  const minutes = twoDigits(date.getUTCMinutes());
  return `${month} ${day} ${year} · ${hours}:${minutes}`;
}
