// WHOAMI — evidence board

function renderEvidenceBoard(container) {
  const board = createEl("div", "evidence-board");
  const toolbar = createEl("div", "board-toolbar");
  const instructions = createEl(
    "p",
    "board-instructions",
    "Drag a card title onto another card to connect them. Drag the rest of a card to move it."
  );
  toolbar.appendChild(instructions);

  const threadList = createEl("div", "board-threads");
  const canvas = createEl("div", "board-canvas");
  const cards = createEl("div", "board-cards");
  const threadsSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  threadsSvg.classList.add("board-thread-lines");
  threadsSvg.setAttribute("aria-hidden", "true");
  cards.appendChild(threadsSvg);
  const hintOverlay = createEl("div", "board-hint-overlay");
  const hintCard = createEl("section", "board-hint-card");
  hintCard.setAttribute("role", "dialog");
  hintCard.setAttribute("aria-modal", "true");
  hintCard.setAttribute("aria-labelledby", "board-hint-title");
  hintCard.appendChild(createEl("h2", "board-hint-title", "Evidence board"));
  hintCard.appendChild(createEl(
    "p",
    "board-hint-message",
    "Every record you find lands here automatically. Move cards anywhere on the board. Drag a card title onto another card to connect them with an orange line."
  ));
  const dismissHint = createEl("button", "board-hint-dismiss", "Got it");
  dismissHint.type = "button";
  hintCard.appendChild(dismissHint);
  hintOverlay.appendChild(hintCard);
  hintOverlay.hidden = window.CASE_PROGRESS.evidenceBoardHintSeen;
  let topCardZ = 1;
  canvas.appendChild(cards);
  board.append(toolbar, threadList, canvas, hintOverlay);
  container.appendChild(board);

  dismissHint.addEventListener("click", () => {
    window.CASE_PROGRESS.evidenceBoardHintSeen = true;
    saveCaseProgress();
    hintOverlay.hidden = true;
  });

  // Every found record, as a card item, in the order the player found them.
  // New finds are always added at the end, so cards already on the board never move.
  function evidenceList() {
    return [...window.CASE_PROGRESS.foundEvidence]
      .map(evidenceById)
      .filter(Boolean)
      .map((evidence) => ({
        id: evidence.id,
        tag: evidence.app || "evidence",
        title: evidence.title || evidence.id,
        description: cardSummary(evidence),
        footer: evidence.timestamp ? formatEvidenceTime(evidence.timestamp) : "",
      }));
  }

  function cardSummary(evidence) {
    const summary = evidence.source || evidence.content?.body || evidence.content?.text || evidence.content?.caption;
    return typeof summary === "string" ? summary : formatEvidenceText(evidence).split("\n").find(Boolean) || "";
  }

  function itemTitle(id) {
    return evidenceById(id)?.title || id;
  }

  function getThreads() {
    return window.CASE_PROGRESS.evidenceThreads;
  }

  function pairKey(first, second) {
    return [first, second].sort().join("|");
  }

  function getPosition(id, index) {
    const position = window.CASE_PROGRESS.evidencePositions.get(id);
    return position || {
      x: 36 + (index % 4) * 340,
      y: 36 + Math.floor(index / 4) * 270,
    };
  }

  function ensureCanvasSize(evidence) {
    const rows = Math.max(1, Math.ceil(evidence.length / 4));
    let width = Math.max(1400, 36 + 4 * 340);
    let height = Math.max(900, 36 + rows * 270);
    for (const [index, entry] of evidence.entries()) {
      const position = getPosition(entry.id, index);
      width = Math.max(width, position.x + 340);
      height = Math.max(height, position.y + 270);
    }
    cards.style.width = `${width}px`;
    cards.style.height = `${height}px`;
    threadsSvg.setAttribute("width", String(width));
    threadsSvg.setAttribute("height", String(height));
    threadsSvg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  }

  function renderThreads() {
    threadList.replaceChildren();
    const threads = getThreads().filter(([first, second]) =>
      window.CASE_PROGRESS.foundEvidence.has(first) &&
      window.CASE_PROGRESS.foundEvidence.has(second)
    );
    if (!threads.length) {
      threadList.appendChild(createEl("p", "board-no-threads", "No connections yet."));
      return;
    }

    for (const [first, second] of threads) {
      const row = createEl("div", "board-thread");
      row.appendChild(createEl(
        "span",
        "board-thread-label",
        `${itemTitle(first)} ↔ ${itemTitle(second)}`
      ));
      const remove = createEl("button", "board-thread-remove", "Remove");
      remove.type = "button";
      remove.dataset.thread = pairKey(first, second);
      remove.setAttribute(
        "aria-label",
        `Remove connection between ${itemTitle(first)} and ${itemTitle(second)}`
      );
      row.appendChild(remove);
      threadList.appendChild(row);
    }
  }

  function renderCards() {
    cards.querySelectorAll(".board-card, .board-empty").forEach((card) => card.remove());
    const evidence = evidenceList();
    ensureCanvasSize(evidence);

    if (!evidence.length) {
      cards.appendChild(createEl(
        "p",
        "board-empty",
        "No evidence collected yet. Found records will appear here automatically."
      ));
    }

    for (const [index, entry] of evidence.entries()) {
      const card = createEl("article", "board-card");
      card.dataset.evidenceId = entry.id;
      card.classList.toggle("is-new", unseenEvidence.has(entry.id));
      const position = getPosition(entry.id, index);
      card.style.left = `${position.x}px`;
      card.style.top = `${position.y}px`;

      const heading = createEl("div", "board-card-heading");
      heading.appendChild(createEl(
        "span",
        "board-card-tag",
        unseenEvidence.has(entry.id) ? `NEW · ${entry.tag}` : entry.tag
      ));
      const inReport = window.CASE_PROGRESS.reportEvidence.has(entry.id);
      const reportButton = createEl(
        "button",
        `board-report-toggle${inReport ? " is-selected" : ""}`,
        inReport ? "In report" : "Add to report"
      );
      reportButton.type = "button";
      reportButton.dataset.reportEvidence = entry.id;
      reportButton.setAttribute("aria-pressed", String(inReport));
      heading.appendChild(reportButton);

      const openButton = createEl("button", "board-card-title", entry.title);
      openButton.type = "button";
      openButton.dataset.openItem = entry.id;
      const description = createEl("p", "board-card-description", entry.description || "Collected case evidence.");
      const cardFooter = createEl("div", "board-card-footer");
      cardFooter.appendChild(createEl("span", "board-card-date", entry.footer));
      card.append(heading, openButton, description, cardFooter);
      cards.appendChild(card);
    }

    renderThreads();
    drawThreads();
  }

  function drawThreads(preview) {
    threadsSvg.querySelectorAll(".board-thread-line, .board-thread-preview").forEach((line) => line.remove());
    for (const [first, second] of getThreads()) {
      const firstCard = cards.querySelector(`[data-evidence-id="${CSS.escape(first)}"]`);
      const secondCard = cards.querySelector(`[data-evidence-id="${CSS.escape(second)}"]`);
      if (!firstCard || !secondCard) continue;
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", String(firstCard.offsetLeft + firstCard.offsetWidth / 2));
      line.setAttribute("y1", String(firstCard.offsetTop + firstCard.offsetHeight / 2));
      line.setAttribute("x2", String(secondCard.offsetLeft + secondCard.offsetWidth / 2));
      line.setAttribute("y2", String(secondCard.offsetTop + secondCard.offsetHeight / 2));
      line.classList.add("board-thread-line");
      threadsSvg.appendChild(line);
    }

    if (preview) {
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", String(preview.x1));
      line.setAttribute("y1", String(preview.y1));
      line.setAttribute("x2", String(preview.x2));
      line.setAttribute("y2", String(preview.y2));
      line.classList.add("board-thread-line", "board-thread-preview");
      threadsSvg.appendChild(line);
    }
  }

  function openItem(id) {
    const evidence = evidenceById(id);
    if (evidence) openEvidenceViewer(evidence, "/ collected evidence");
  }

  function addThread(first, second) {
    if (first === second) return;
    const key = pairKey(first, second);
    if (getThreads().some(([a, b]) => pairKey(a, b) === key)) return;
    getThreads().push([first, second].sort());
    saveCaseProgress();
    renderThreads();
    drawThreads();
  }

  function beginPointerGesture(event) {
    if (event.button !== 0) return;
    const card = event.target.closest(".board-card");
    if (!card) return;
    if (event.target.closest("button") && !event.target.closest("[data-open-item]")) return;

    card.style.zIndex = String(++topCardZ);
    const isConnection = Boolean(event.target.closest("[data-open-item]"));
    const evidenceId = card.dataset.evidenceId;
    const initialX = event.clientX;
    const initialY = event.clientY;
    const initialLeft = card.offsetLeft;
    const initialTop = card.offsetTop;
    const startX = initialLeft + card.offsetWidth / 2;
    const startY = initialTop + card.offsetHeight / 2;
    let moved = false;
    let preview = null;

    event.preventDefault();
    document.body.classList.add("is-dragging");

    function onMove(moveEvent) {
      const deltaX = moveEvent.clientX - initialX;
      const deltaY = moveEvent.clientY - initialY;
      if (!moved && Math.hypot(deltaX, deltaY) > 5) moved = true;
      if (!moved) return;

      if (isConnection) {
        const rect = cards.getBoundingClientRect();
        preview = {
          x1: startX,
          y1: startY,
          x2: moveEvent.clientX - rect.left + canvas.scrollLeft,
          y2: moveEvent.clientY - rect.top + canvas.scrollTop,
        };
        instructions.textContent = "Release over another evidence card to connect.";
        drawThreads(preview);
      } else {
        const left = Math.max(0, initialLeft + deltaX);
        const top = Math.max(0, initialTop + deltaY);
        card.style.left = `${left}px`;
        card.style.top = `${top}px`;
        window.CASE_PROGRESS.evidencePositions.set(evidenceId, { x: left, y: top });
        ensureCanvasSize(evidenceList());
        drawThreads();
      }
    }

    function onUp(upEvent) {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.body.classList.remove("is-dragging");

      if (isConnection && moved) {
        const target = document.elementFromPoint(upEvent.clientX, upEvent.clientY)
          ?.closest(".board-card");
        if (target && target.dataset.evidenceId !== evidenceId) {
          addThread(evidenceId, target.dataset.evidenceId);
        } else {
          drawThreads();
        }
        window.setTimeout(() => {
          instructions.textContent =
            "Drag a card title onto another card to connect them. Drag the rest of a card to move it.";
        }, 0);
      } else if (!isConnection && moved) {
        saveCaseProgress();
      }

      if (moved) {
        card.dataset.dragged = "true";
        window.setTimeout(() => delete card.dataset.dragged, 0);
      }
    }

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  }

  cards.addEventListener("pointerdown", beginPointerGesture);
  cards.addEventListener("click", (event) => {
    const reportButton = event.target.closest("[data-report-evidence]");
    if (reportButton) {
      const id = reportButton.dataset.reportEvidence;
      if (window.CASE_PROGRESS.reportEvidence.has(id)) {
        window.CASE_PROGRESS.reportEvidence.delete(id);
      } else {
        window.CASE_PROGRESS.reportEvidence.add(id);
      }
      saveCaseProgress();
      window.dispatchEvent(new Event("case-report-evidence-change"));
      return;
    }

    const openButton = event.target.closest("[data-open-item]");
    if (openButton) {
      if (openButton.closest(".board-card").dataset.dragged) return;
      openItem(openButton.dataset.openItem);
    }
  });

  threadList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-thread]");
    if (!button) return;
    const key = button.dataset.thread;
    window.CASE_PROGRESS.evidenceThreads = getThreads()
      .filter(([first, second]) => pairKey(first, second) !== key);
    saveCaseProgress();
    renderThreads();
    drawThreads();
  });

  onCaseEvent(board, "case-evidence-found", renderCards);
  // From the "NEW EVIDENCE" notice: scroll the board to the new card.
  onCaseEvent(board, "case-board-reveal", (event) => {
    const card = cards.querySelector(`[data-evidence-id="${CSS.escape(event.detail.id)}"]`);
    card?.scrollIntoView({ block: "center", inline: "center" });
  });

  // A NEW card counts as seen once the player points at it or opens it.
  cards.addEventListener("pointerover", (event) => {
    const card = event.target.closest(".board-card.is-new");
    if (!card) return;
    card.classList.remove("is-new");
    card.querySelector(".board-card-tag").textContent =
      card.querySelector(".board-card-tag").textContent.replace(/^NEW · /, "");
    markEvidenceSeen(card.dataset.evidenceId);
  });
  onCaseEvent(board, "case-report-evidence-change", renderCards);
  onCaseEvent(board, "resize", () => drawThreads());
  if ("ResizeObserver" in window) {
    new ResizeObserver(() => drawThreads()).observe(cards);
  }

  renderCards();
}
