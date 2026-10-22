// WHOAMI — interface sounds
// Every sound is synthesized with the Web Audio API, so there are no audio files to load.
// Browsers only allow audio after the player interacts with the page, so the audio context
// is created on the first click or key press.

const SOUND_KEY = "whoami:sound";

const sound = {
  context: null,
  master: null,
  ambient: null,
  enabled: readSoundSetting(),
  lastKeyAt: 0,
};

function readSoundSetting() {
  try {
    return localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
}

function setSoundEnabled(enabled) {
  sound.enabled = enabled;
  try {
    localStorage.setItem(SOUND_KEY, enabled ? "on" : "off");
  } catch {
    // The setting just won't be remembered.
  }
  if (enabled) {
    ensureAudio();
    startAmbient();
  } else {
    stopAmbient();
  }
  window.dispatchEvent(new Event("sound-change"));
}

function ensureAudio() {
  if (sound.context) {
    if (sound.context.state === "suspended") sound.context.resume();
    return sound.context;
  }
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  sound.context = new AudioContext();
  sound.master = sound.context.createGain();
  sound.master.gain.value = 0.5;
  sound.master.connect(sound.context.destination);
  return sound.context;
}

// A short tone with a quick fade-out.
function tone(frequency, duration, { type = "square", volume = 0.05, delay = 0, slideTo = null } = {}) {
  const context = sound.context;
  const start = context.currentTime + delay;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(slideTo, start + duration);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(sound.master);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

// A burst of filtered noise: the mechanical part of a key press.
function noiseTick(duration, volume) {
  const context = sound.context;
  const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const source = context.createBufferSource();
  source.buffer = buffer;
  const filter = context.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 2400 + Math.random() * 1200;
  const gain = context.createGain();
  gain.gain.value = volume;
  source.connect(filter).connect(gain).connect(sound.master);
  source.start();
}

// name: "click" | "key" | "notify" | "error" | "success"
function playSound(name) {
  if (!sound.enabled || !sound.context) return;
  if (name === "click") {
    tone(1800, 0.03, { volume: 0.025 });
  } else if (name === "key") {
    const now = performance.now();
    if (now - sound.lastKeyAt < 25) return;
    sound.lastKeyAt = now;
    noiseTick(0.025, 0.12);
  } else if (name === "notify") {
    tone(880, 0.09, { type: "sine", volume: 0.08 });
    tone(1320, 0.14, { type: "sine", volume: 0.07, delay: 0.1 });
  } else if (name === "error") {
    tone(180, 0.16, { type: "sawtooth", volume: 0.04 });
  } else if (name === "success") {
    tone(660, 0.07, { volume: 0.035 });
    tone(990, 0.1, { volume: 0.035, delay: 0.07 });
  }
}

// Low computer-room hum: two detuned low tones and soft filtered noise.
function startAmbient() {
  if (!sound.enabled || !sound.context || sound.ambient) return;
  const context = sound.context;
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.035, context.currentTime + 2);
  gain.connect(sound.master);

  const sources = [55, 110.4].map((frequency) => {
    const oscillator = context.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    oscillator.connect(gain);
    oscillator.start();
    return oscillator;
  });

  const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  const noise = context.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;
  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 400;
  const noiseGain = context.createGain();
  noiseGain.gain.value = 0.25;
  noise.connect(filter).connect(noiseGain).connect(gain);
  noise.start();
  sources.push(noise);

  sound.ambient = { gain, sources };
}

function stopAmbient() {
  if (!sound.ambient) return;
  const { gain, sources } = sound.ambient;
  const now = sound.context.currentTime;
  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(gain.gain.value, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
  sources.forEach((source) => source.stop(now + 0.45));
  sound.ambient = null;
}

// The first interaction unlocks audio and starts the background hum.
function unlockAudio() {
  window.removeEventListener("pointerdown", unlockAudio);
  window.removeEventListener("keydown", unlockAudio);
  if (!sound.enabled) return;
  ensureAudio();
  startAmbient();
}

window.addEventListener("pointerdown", unlockAudio);
window.addEventListener("keydown", unlockAudio);

// ---------- Toasts ----------

// A small notice in the top-right corner of the desktop, e.g. "NEW MESSAGE · jake-holt".
function showToast(text, { onClick } = {}) {
  let stack = document.querySelector(".toast-stack");
  if (!stack) {
    stack = createEl("div", "toast-stack");
    stack.setAttribute("aria-live", "polite");
    document.body.appendChild(stack);
  }
  const toast = createEl("button", "toast", text);
  toast.type = "button";
  toast.addEventListener("click", () => {
    toast.remove();
    onClick?.();
  });
  stack.appendChild(toast);
  window.setTimeout(() => toast.remove(), 6000);
}
