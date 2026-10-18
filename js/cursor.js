// WHOAMI — custom mouse cursor
// A surveillance-style target frame with live coordinates.
// Over links and buttons the frame locks onto the element and shows its data-cursor label.

(() => {
  // Mouse/trackpad only: touch screens keep their default behavior
  if (!matchMedia("(pointer: fine)").matches) return;

  const SIZE = 28; // frame size when following the mouse
  const PAD = 6; // gap between a locked element and the frame
  const EASE = matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : 0.22;

  const root = document.documentElement;
  const frame = createPart("mouse-frame");
  const label = createPart("mouse-label");
  frame.innerHTML = "<i></i><i></i><i></i><i></i>";

  const mouse = { x: 0, y: 0 };
  const box = { x: 0, y: 0, w: SIZE, h: SIZE };
  let target = null;
  let started = false;

  root.classList.add("has-mouse", "mouse-hidden");

  function createPart(className) {
    const node = document.createElement("div");
    node.className = className;
    node.setAttribute("aria-hidden", "true");
    document.body.appendChild(node);
    return node;
  }

  const pad = (n) => String(Math.round(n)).padStart(4, "0");

  addEventListener("mousemove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    root.classList.remove("mouse-hidden");

    // Start the frame right at the mouse instead of flying in from the corner
    if (!started) {
      started = true;
      box.x = mouse.x - SIZE / 2;
      box.y = mouse.y - SIZE / 2;
      requestAnimationFrame(tick);
    }
  });

  document.addEventListener("mouseleave", () => root.classList.add("mouse-hidden"));
  addEventListener("mousedown", () => frame.classList.add("is-down"));
  addEventListener("mouseup", () => frame.classList.remove("is-down"));

  document.addEventListener("mouseover", (e) => {
    target = e.target.closest("a, button, [data-cursor]");
    const denied = !!target && target.matches(".btn-disabled");
    frame.classList.toggle("is-locked", !!target);
    frame.classList.toggle("is-denied", denied);
    label.classList.toggle("is-locked", !!target && !denied);
  });

  function tick() {
    let x, y, w, h;
    if (target && target.isConnected) {
      const r = target.getBoundingClientRect();
      x = r.left - PAD;
      y = r.top - PAD;
      w = r.width + PAD * 2;
      h = r.height + PAD * 2;
    } else {
      x = mouse.x - SIZE / 2;
      y = mouse.y - SIZE / 2;
      w = h = SIZE;
    }

    box.x += (x - box.x) * EASE;
    box.y += (y - box.y) * EASE;
    box.w += (w - box.w) * EASE;
    box.h += (h - box.h) * EASE;

    frame.style.transform = `translate(${box.x}px, ${box.y}px)`;
    frame.style.width = `${box.w}px`;
    frame.style.height = `${box.h}px`;
    label.style.transform = `translate(${box.x}px, ${box.y + box.h + 6}px)`;

    const text = target
      ? target.dataset.cursor || "LOCKED"
      : `x:${pad(mouse.x)} y:${pad(mouse.y)}`;
    if (label.textContent !== text) label.textContent = text;

    requestAnimationFrame(tick);
  }
})();
