// WHOAMI — window manager
// Opens app windows on the desktop and makes them behave like on a normal computer:
// drag, focus, overlap, minimize, maximize, resize and close.

const TITLE_BAR_HEIGHT = 32;
const MIN_WIDTH = 360;
const MIN_HEIGHT = 220;
const CASCADE_START = 24; // the first window opens 24px from the desktop's top-left corner
const CASCADE_STEP = 32; // each next window opens 32px further right and down

// All window manager state lives in this one object.
const wm = {
  desktop: null, // the #windows element that holds every window
  onChange: null, // function called after open/close/minimize/restore, so the dock can update
  windows: new Map(), // app id -> window record (one window per app, see openWindow)
  topZ: 0, // highest z-index given out so far; a focused window gets the next one
  activeId: null, // id of the focused window, or null if none
  cascadeStep: 0, // how many steps the next new window is moved right/down
};

// Sets up the window manager. Called once from main.js.
// desktop  = the element windows live in
// onChange = function to call whenever a window opens, closes, minimizes or restores
function initWindowManager(desktop, onChange) {
  wm.desktop = desktop;
  wm.onChange = onChange;

  // If the browser window gets smaller, pull windows back so none get lost off-screen
  window.addEventListener("resize", keepAllWindowsInside);
}

// What happens when you click an app in the dock (same as a taskbar on a PC):
// not open -> open it; minimized -> bring it back; behind others -> bring to front;
// already in front -> minimize it.
function launchApp(appId) {
  const win = wm.windows.get(appId);

  if (!win) {
    openWindow(appId);
  } else if (win.minimized) {
    restoreWindow(appId);
  } else if (wm.activeId !== appId) {
    focusWindow(appId);
  } else {
    minimizeWindow(appId);
  }
}

// Tells the dock how an app is doing: "closed", "open" or "minimized".
function getWindowState(appId) {
  const win = wm.windows.get(appId);
  if (!win) return "closed";
  return win.minimized ? "minimized" : "open";
}

// Creates a new window for an app, puts it on the desktop and focuses it.
// Only one window per app: if it is already open, it is just brought back.
function openWindow(appId) {
  openWindowForApp(getApp(appId));
}

// Opens a standalone window that is not part of the dock app registry.
function openAuxiliaryWindow(app) {
  openWindowForApp(app);
}

function openWindowForApp(app) {
  if (!app) return;
  const appId = app.id;

  if (wm.windows.has(appId)) {
    restoreWindow(appId);
    return;
  }

  const parts = createWindowElement(app);

  // This record is everything we need to remember about one open window
  const win = {
    app: app,
    el: parts.el,
    maxButton: parts.maxButton,
    minimized: false,
    maximized: false,
    savedRect: null, // position and size from before maximizing, to restore later
  };

  // Default size from apps.js, but never bigger than the desktop
  const width = Math.min(app.width, wm.desktop.clientWidth);
  const height = Math.min(app.height, wm.desktop.clientHeight);
  const position = nextCascadePosition(width, height);
  setRect(win.el, { left: position.left, top: position.top, width: width, height: height });

  // Clicking anywhere on the window brings it to the front
  win.el.addEventListener("pointerdown", () => focusWindow(appId));

  // Title bar: drag to move, double-click to maximize/restore
  parts.titleBar.addEventListener("pointerdown", (event) => startDrag(win, event));
  parts.titleBar.addEventListener("dblclick", (event) => {
    if (!event.target.closest("button")) toggleMaximize(appId);
  });

  // Title bar buttons
  parts.minButton.addEventListener("click", () => minimizeWindow(appId));
  parts.maxButton.addEventListener("click", () => toggleMaximize(appId));
  parts.closeButton.addEventListener("click", () => closeWindow(appId));

  // Bottom-right corner: drag to resize
  parts.resizeHandle.addEventListener("pointerdown", (event) => startResize(win, event));

  wm.desktop.appendChild(win.el);
  wm.windows.set(appId, win);
  focusWindow(appId);
  wm.onChange();
}

// Brings a window to the front and makes it the active one.
// Only one window is active at a time: it gets orange corners and a lighter title bar.
function focusWindow(appId) {
  const win = wm.windows.get(appId);
  if (!win || win.minimized) return;
  if (wm.activeId === appId) return; // already active, nothing to do

  const previous = wm.windows.get(wm.activeId);
  if (previous) previous.el.classList.remove("is-active");

  // A higher z-index draws the window on top of the others
  wm.topZ += 1;
  win.el.style.zIndex = wm.topZ;
  win.el.classList.add("is-active");
  wm.activeId = appId;
}

// Hides a window. Its dock icon gets a small orange square to show it is still open.
function minimizeWindow(appId) {
  const win = wm.windows.get(appId);
  if (!win) return;

  win.minimized = true;
  win.el.classList.add("is-minimized");

  if (wm.activeId === appId) {
    win.el.classList.remove("is-active");
    wm.activeId = null;
    focusTopWindow(); // like a PC: the next window down becomes active
  }

  wm.onChange();
}

// Shows a minimized window again and focuses it.
function restoreWindow(appId) {
  const win = wm.windows.get(appId);
  if (!win) return;

  win.minimized = false;
  win.el.classList.remove("is-minimized");
  keepWindowInside(win); // the browser may have been resized while it was hidden
  focusWindow(appId);
  wm.onChange();
}

// Maximize: the window fills the whole desktop. Run again to put it back
// where it was, at the size it had before.
function toggleMaximize(appId) {
  const win = wm.windows.get(appId);
  if (!win) return;

  if (win.maximized) {
    win.maximized = false;
    setRect(win.el, win.savedRect);
    keepWindowInside(win);
  } else {
    win.maximized = true;
    win.savedRect = getRect(win.el);
    // Percentages so it still fills the desktop if the browser is resized
    win.el.style.left = "0";
    win.el.style.top = "0";
    win.el.style.width = "100%";
    win.el.style.height = "100%";
  }

  win.el.classList.toggle("is-maximized", win.maximized);
  win.maxButton.textContent = win.maximized ? "❐" : "□";
  win.maxButton.setAttribute("aria-label", win.maximized ? "Restore" : "Maximize");
  focusWindow(appId);
}

// Removes a window completely. Its dock icon goes back to normal.
function closeWindow(appId) {
  const win = wm.windows.get(appId);
  if (!win) return;

  win.el.remove();
  wm.windows.delete(appId);

  if (wm.activeId === appId) {
    wm.activeId = null;
    focusTopWindow();
  }

  wm.onChange();
}

// Focuses the visible window that is on top (highest z-index), if there is one.
// Used after the active window is minimized or closed.
function focusTopWindow() {
  let topWin = null;

  for (const win of wm.windows.values()) {
    if (win.minimized) continue;
    if (!topWin || Number(win.el.style.zIndex) > Number(topWin.el.style.zIndex)) {
      topWin = win;
    }
  }

  if (topWin) focusWindow(topWin.app.id);
}

// ---------- Dragging and resizing ----------

// Moves a window while the mouse is held down on its title bar.
// setPointerCapture keeps sending us mouse moves even if the mouse moves
// faster than the window and leaves the title bar.
function startDrag(win, event) {
  if (event.button !== 0) return; // left mouse button only
  if (event.target.closest("button")) return; // pressing _ □ × is a click, not a drag
  if (win.maximized) return; // a maximized window stays where it is

  const titleBar = event.currentTarget;
  const startMouseX = event.clientX;
  const startMouseY = event.clientY;
  const startLeft = win.el.offsetLeft;
  const startTop = win.el.offsetTop;

  titleBar.setPointerCapture(event.pointerId);
  document.body.classList.add("is-dragging"); // turns off text selection while dragging

  // New position = where the window started + how far the mouse has moved
  function onMove(moveEvent) {
    const left = startLeft + (moveEvent.clientX - startMouseX);
    const top = startTop + (moveEvent.clientY - startMouseY);
    const position = clampToDesktop(win.el, left, top);
    win.el.style.left = position.left + "px";
    win.el.style.top = position.top + "px";
  }

  // Mouse released (or the browser cancelled it): stop listening
  function onEnd() {
    titleBar.removeEventListener("pointermove", onMove);
    titleBar.removeEventListener("pointerup", onEnd);
    titleBar.removeEventListener("pointercancel", onEnd);
    document.body.classList.remove("is-dragging");
  }

  titleBar.addEventListener("pointermove", onMove);
  titleBar.addEventListener("pointerup", onEnd);
  titleBar.addEventListener("pointercancel", onEnd);
}

// Changes a window's size while the mouse is held down on the bottom-right corner.
// Works like startDrag, but changes width/height instead of left/top.
function startResize(win, event) {
  if (event.button !== 0) return;
  if (win.maximized) return;

  const handle = event.currentTarget;
  const startMouseX = event.clientX;
  const startMouseY = event.clientY;
  const startWidth = win.el.offsetWidth;
  const startHeight = win.el.offsetHeight;

  handle.setPointerCapture(event.pointerId);
  document.body.classList.add("is-resizing");

  function onMove(moveEvent) {
    // Not smaller than the minimum, not past the desktop's right/bottom edge
    const maxWidth = Math.max(MIN_WIDTH, wm.desktop.clientWidth - win.el.offsetLeft);
    const maxHeight = Math.max(MIN_HEIGHT, wm.desktop.clientHeight - win.el.offsetTop);
    const width = clamp(startWidth + (moveEvent.clientX - startMouseX), MIN_WIDTH, maxWidth);
    const height = clamp(startHeight + (moveEvent.clientY - startMouseY), MIN_HEIGHT, maxHeight);
    win.el.style.width = width + "px";
    win.el.style.height = height + "px";
  }

  function onEnd() {
    handle.removeEventListener("pointermove", onMove);
    handle.removeEventListener("pointerup", onEnd);
    handle.removeEventListener("pointercancel", onEnd);
    document.body.classList.remove("is-resizing");
  }

  handle.addEventListener("pointermove", onMove);
  handle.addEventListener("pointerup", onEnd);
  handle.addEventListener("pointercancel", onEnd);
}

// Adjusts a left/top position so the window's title bar stays fully inside
// the desktop. That way a window can never be dragged somewhere you can't grab it.
function clampToDesktop(el, left, top) {
  const maxLeft = Math.max(0, wm.desktop.clientWidth - el.offsetWidth);
  const maxTop = Math.max(0, wm.desktop.clientHeight - TITLE_BAR_HEIGHT);
  return {
    left: clamp(left, 0, maxLeft),
    top: clamp(top, 0, maxTop),
  };
}

// Moves one window back inside the desktop if it ended up outside.
function keepWindowInside(win) {
  if (win.maximized) return; // a maximized window always fits
  const position = clampToDesktop(win.el, win.el.offsetLeft, win.el.offsetTop);
  win.el.style.left = position.left + "px";
  win.el.style.top = position.top + "px";
}

// Moves every window back inside the desktop (runs when the browser is resized).
function keepAllWindowsInside() {
  for (const win of wm.windows.values()) {
    keepWindowInside(win);
  }
}

// Picks where a new window opens: each one 32px right and down from the last.
// If that would push the window off the desktop, start again from the corner.
function nextCascadePosition(width, height) {
  let offset = CASCADE_START + wm.cascadeStep * CASCADE_STEP;

  const fits =
    offset + width <= wm.desktop.clientWidth && offset + height <= wm.desktop.clientHeight;
  if (!fits) {
    wm.cascadeStep = 0;
    offset = CASCADE_START;
  }
  wm.cascadeStep += 1;

  // If the desktop is small, move the window so it still fits
  return {
    left: clamp(offset, 0, Math.max(0, wm.desktop.clientWidth - width)),
    top: clamp(offset, 0, Math.max(0, wm.desktop.clientHeight - height)),
  };
}

// ---------- Building the window ----------

// Builds the HTML for one window:
//   corner brackets, title bar (name, subtitle, _ □ × buttons), content area, resize handle.
// Returns the window and the parts openWindow needs to attach events to.
function createWindowElement(app) {
  const el = createEl("div", "window");
  el.dataset.app = app.id;
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-label", app.name);

  // Four small L-shaped corners (top-left, top-right, bottom-left, bottom-right)
  for (const corner of ["tl", "tr", "bl", "br"]) {
    el.appendChild(createEl("span", "win-corner win-corner-" + corner));
  }

  // Title bar
  const titleBar = createEl("div", "win-titlebar");
  const title = createEl("div", "win-title");
  title.append(
    createEl("span", "win-square"),
    createEl("span", "win-name", app.name),
    createEl("span", "win-subtitle", app.subtitle)
  );

  const controls = createEl("div", "win-controls");
  const minButton = createTitleButton("win-min", "_", "Minimize");
  const maxButton = createTitleButton("win-max", "□", "Maximize");
  const closeButton = createTitleButton("win-close", "×", "Close");
  controls.append(minButton, maxButton, closeButton);
  titleBar.append(title, controls);

  // Content: the app itself (a placeholder for now, see renderApp in apps.js)
  const content = createEl("div", "win-content");
  renderApp(app, content);

  const resizeHandle = createEl("div", "win-resize");

  el.append(titleBar, content, resizeHandle);
  return { el, titleBar, minButton, maxButton, closeButton, resizeHandle };
}

// One of the small square buttons in the title bar.
function createTitleButton(className, symbol, label) {
  const button = createEl("button", "win-btn " + className, symbol);
  button.type = "button";
  button.setAttribute("aria-label", label);
  return button;
}

// ---------- Small helpers ----------

// Shortcut for making an element with a class and (optionally) text.
function createEl(tag, className, text) {
  const el = document.createElement(tag);
  el.className = className;
  if (text) el.textContent = text;
  return el;
}

// Keeps a number between a min and a max.
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// Reads a window's current position and size.
function getRect(el) {
  return { left: el.offsetLeft, top: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight };
}

// Sets a window's position and size (all in pixels).
function setRect(el, rect) {
  el.style.left = rect.left + "px";
  el.style.top = rect.top + "px";
  el.style.width = rect.width + "px";
  el.style.height = rect.height + "px";
}
