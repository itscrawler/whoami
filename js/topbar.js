// WHOAMI — top bar
// Shows the case number and title, VPN state, sound switch, the city, and the in-game clock.

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

// The clock state, shared with gameTimestamp() (e.g. for the time new mail arrives).
const gameClock = { start: 0, realStart: 0, offsetMinutes: 0 };

// Fills the top bar with info from case.json and starts the clock.
// resumeAt = saved in-game time (ms), so a reload doesn't turn the clock back.
function initTopbar(caseInfo, resumeAt) {
  // "CASE #535 · NORTH BRIDGE" with the number in orange
  const label = document.getElementById("case-label");
  const number = document.createElement("span");
  number.className = "accent";
  number.textContent = "#" + caseInfo.id;
  label.textContent = ""; // clear "LOADING CASE..."
  label.append("CASE ", number, " · " + caseInfo.title.toUpperCase());

  document.getElementById("case-city").textContent = caseInfo.city.toUpperCase();
  startClock(caseInfo.intro.timestamp, resumeAt);
  updateVpnIndicator();
  window.addEventListener("case-access-change", updateVpnIndicator);
}

// "VPN · NODE NYC-07" with an orange square when the terminal tunnel is up, "VPN · OFF" otherwise.
function updateVpnIndicator() {
  const indicator = document.getElementById("topbar-vpn");
  const node = window.CASE_ACCESS.vpnNode;
  indicator.classList.toggle("is-off", !node);
  indicator.lastChild.textContent = node ? `VPN · NODE ${node}` : "VPN · OFF";
}

function initSoundToggle() {
  const button = document.getElementById("sound-toggle");
  function update() {
    button.textContent = sound.enabled ? "SND · ON" : "SND · OFF";
    button.setAttribute("aria-pressed", String(sound.enabled));
  }
  button.addEventListener("click", () => setSoundEnabled(!sound.enabled));
  window.addEventListener("sound-change", update);
  update();
}

// Shown in the top bar when the case files can't be loaded (e.g. wrong ?case= id).
function showCaseNotFound(caseId) {
  document.getElementById("case-label").textContent = "CASE #" + caseId + " NOT FOUND";
}

// Starts the in-game clock at the case's start time (e.g. Oct 13 2026, 01:24),
// or at the saved time if the case is resumed, and moves it forward in real time, one second per second.
// It shows the time in the case city's time zone, not the player's.
function startClock(timestamp, resumeAt) {
  const clock = document.getElementById("game-clock");
  // the case start time (or the saved time, never earlier), in milliseconds
  gameClock.start = Math.max(Date.parse(timestamp), Number(resumeAt) || 0);
  gameClock.realStart = Date.now(); // when the player opened the page
  gameClock.offsetMinutes = getUtcOffsetMinutes(timestamp);

  function update() {
    clock.textContent = formatClock(cityTime());
  }

  update();
  setInterval(update, 1000);
}

// Trick: shift the time by the city's UTC offset and then read it with the
// getUTC... methods. That gives the city's local time in any time zone.
function cityTime() {
  return new Date(gameTimeMs() + gameClock.offsetMinutes * 60 * 1000);
}

// The current in-game moment in milliseconds (saved with case progress).
function gameTimeMs() {
  return gameClock.start + (Date.now() - gameClock.realStart);
}

// The current in-game time as an ISO string with the city's offset, e.g. "2026-10-13T01:31:00-04:00".
function gameTimestamp() {
  const date = cityTime();
  const twoDigits = (n) => String(Math.abs(n)).padStart(2, "0");
  const offset = gameClock.offsetMinutes;
  const sign = offset < 0 ? "-" : "+";
  return `${date.getUTCFullYear()}-${twoDigits(date.getUTCMonth() + 1)}-${twoDigits(date.getUTCDate())}` +
    `T${twoDigits(date.getUTCHours())}:${twoDigits(date.getUTCMinutes())}:00` +
    `${sign}${twoDigits(Math.trunc(offset / 60))}:${twoDigits(offset % 60)}`;
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

initSoundToggle();
