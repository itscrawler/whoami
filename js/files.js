// WHOAMI — hacker's local file explorer

function renderFiles(container) {
  const explorer = createEl("div", "files-app");
  const sidebar = createEl("nav", "files-sidebar");
  sidebar.setAttribute("aria-label", "File locations");
  const main = createEl("section", "files-main");
  const toolbar = createEl("div", "files-toolbar");
  const backButton = createEl("button", "files-nav-button", "←");
  backButton.type = "button";
  backButton.setAttribute("aria-label", "Go to previous folder");
  const upButton = createEl("button", "files-nav-button", "↑");
  upButton.type = "button";
  upButton.setAttribute("aria-label", "Go to parent folder");
  const breadcrumbs = createEl("div", "files-breadcrumbs");
  toolbar.append(backButton, upButton, breadcrumbs);

  const list = createEl("div", "files-list");
  list.setAttribute("role", "list");
  main.append(toolbar, list);
  explorer.append(sidebar, main);
  container.appendChild(explorer);

  const homePath = "/home/whoami";
  const locations = [
    ["Home", homePath],
    ["Desktop", `${homePath}/Desktop`],
    ["Documents", `${homePath}/Documents`],
    ["Downloads", `${homePath}/downloads`],
  ];
  let currentPath = homePath;
  let history = [];

  function downloadedEvidence() {
    return [...window.CASE_PROGRESS.downloaded]
      .map(evidenceById)
      .filter(Boolean);
  }

  function recoveredFolderAvailable() {
    return window.CASE_PROGRESS.downloaded.has("ev-google-trash");
  }

  function folderEntries() {
    return [
      { name: "Desktop", path: `${homePath}/Desktop` },
      { name: "Documents", path: `${homePath}/Documents` },
      { name: "Downloads", path: `${homePath}/downloads` },
    ];
  }

  function downloadEntries() {
    const entries = downloadedEvidence()
      .filter((entry) => entry.id !== "ev-google-trash" &&
        entry.id !== "ev-mia-note-hint" &&
        entry.id !== "ev-archive-payments")
      .map((entry) => ({
        name: evidenceFileName(entry),
        evidence: entry,
      }));

    if (recoveredFolderAvailable()) {
      entries.push({ name: "backup_veridia", path: `${homePath}/downloads/backup_veridia` });
    }
    return entries.sort((first, second) => first.name.localeCompare(second.name));
  }

  function recoveredFolderEntries() {
    const entries = [];
    const trash = evidenceById("ev-google-trash");
    if (trash) {
      for (const contained of trash.content?.contains || []) {
        const name = contained.split("/").pop().replace(/\s+\(encrypted\)$/i, "");
        if (name === "backup_veridia.zip") {
          entries.push({
            name: window.CASE_PROGRESS.crackedArchives.has("backup_veridia.zip")
              ? "backup_veridia.zip (unlocked)"
              : "backup_veridia.zip (encrypted)",
            archive: true,
          });
        } else if (name) {
          // Restored files open straight from the recovered folder.
          const restored = (caseData?.evidence || []).find((entry) =>
            entry.access?.type === "restore" && entry.access.from === trash.id && entry.title === name
          );
          entries.push({ name, evidence: restored, available: Boolean(restored) });
        }
      }
    }
    const extracted = evidenceById("ev-archive-payments");
    if (extracted && window.CASE_PROGRESS.downloaded.has(extracted.id)) {
      entries.push({ name: evidenceFileName(extracted), evidence: extracted });
    }
    return entries;
  }

  function openArchive() {
    openAuxiliaryWindow({
      id: "files-viewer-backup-veridia-zip",
      name: "backup_veridia.zip",
      subtitle: "/ encrypted archive",
      width: 520,
      height: 300,
      render(viewer) {
        const note = createEl("div", "files-archive-note",
          window.CASE_PROGRESS.crackedArchives.has("backup_veridia.zip")
            ? "Archive unlocked. Use the Terminal to extract its contents."
            : "Encrypted archive. Find a password clue and use the Terminal to unlock it.");
        viewer.appendChild(note);
      },
    });
  }

  function renderLocations() {
    sidebar.replaceChildren();
    for (const [label, path] of locations) {
      const button = createEl("button", "files-location", label);
      button.type = "button";
      button.dataset.path = path;
      button.classList.toggle("is-selected", currentPath === path);
      sidebar.appendChild(button);
    }
  }

  function renderBreadcrumbs() {
    breadcrumbs.replaceChildren();
    const segments = currentPath.split("/").filter(Boolean).slice(2);
    const crumbs = [["Home", homePath]];
    let path = homePath;
    for (const segment of segments) {
      path += `/${segment}`;
      crumbs.push([segment, path]);
    }
    crumbs.forEach(([label, target], index) => {
      if (index > 0) breadcrumbs.appendChild(createEl("span", "files-breadcrumb-separator", "/"));
      const button = createEl("button", "files-breadcrumb", label);
      button.type = "button";
      button.dataset.path = target;
      breadcrumbs.appendChild(button);
    });
  }

  function renderList() {
    list.replaceChildren();
    const entries = currentPath === homePath
      ? folderEntries().map((entry) => ({ ...entry, folder: true }))
      : currentPath === `${homePath}/downloads`
        ? downloadEntries().map((entry) => ({ ...entry, folder: Boolean(entry.path) }))
        : currentPath === `${homePath}/downloads/backup_veridia`
          ? recoveredFolderEntries()
          : [];

    if (!entries.length) {
      const message = currentPath === `${homePath}/downloads`
        ? "No downloaded evidence yet. Use the Terminal to find and download case records."
        : "This folder is empty.";
      list.appendChild(createEl("p", "files-empty", message));
      return;
    }

    for (const entry of entries) {
      const button = createEl("button", "files-entry");
      button.type = "button";
      button.dataset.path = entry.path || "";
      button.dataset.evidenceId = entry.evidence?.id || "";
      button.dataset.archive = String(Boolean(entry.archive));
      button.dataset.available = String(entry.available !== false);
      button.classList.toggle("is-folder", Boolean(entry.folder));
      button.classList.toggle("is-locked", entry.available === false || Boolean(entry.archive));

      const icon = createEl("span", "files-entry-icon",
        entry.folder ? "DIR" : entry.archive ? "ZIP" : (entry.name.split(".").pop() || "FILE").slice(0, 4).toUpperCase());
      icon.setAttribute("aria-hidden", "true");
      const details = createEl("span", "files-entry-details");
      details.appendChild(createEl("span", "files-entry-name", entry.name));
      const description = entry.folder
        ? "Folder"
        : entry.archive
          ? "Encrypted archive · open for details"
          : entry.available === false
            ? "Unreadable file"
            : entry.evidence?.title || "Downloaded case record";
      details.appendChild(createEl("span", "files-entry-description", description));
      button.append(icon, details);
      list.appendChild(button);
    }
  }

  function render() {
    renderLocations();
    renderBreadcrumbs();
    renderList();
    backButton.disabled = history.length === 0;
    upButton.disabled = currentPath === homePath;
  }

  function navigate(path, remember = true) {
    const validPaths = new Set([
      homePath,
      `${homePath}/Desktop`,
      `${homePath}/Documents`,
      `${homePath}/downloads`,
      `${homePath}/downloads/backup_veridia`,
    ]);
    if (!validPaths.has(path) ||
      (path === `${homePath}/downloads/backup_veridia` && !recoveredFolderAvailable())) return;
    if (remember && currentPath !== path) history.push(currentPath);
    currentPath = path;
    render();
  }

  explorer.addEventListener("click", (event) => {
    const locationButton = event.target.closest("[data-path].files-location, [data-path].files-breadcrumb");
    if (locationButton) return navigate(locationButton.dataset.path);

    const entry = event.target.closest(".files-entry");
    if (!entry) return;
    if (entry.dataset.path) return navigate(entry.dataset.path);
    if (entry.dataset.available === "false") return;
    if (entry.dataset.archive === "true") return openArchive();
    const evidence = evidenceById(entry.dataset.evidenceId);
    if (evidence) openEvidenceViewer(evidence, "/ local file");
  });

  backButton.addEventListener("click", () => {
    const previous = history.pop();
    if (previous) navigate(previous, false);
  });
  upButton.addEventListener("click", () => {
    if (currentPath.endsWith("/backup_veridia")) return navigate(`${homePath}/downloads`);
    if (currentPath !== homePath) navigate(homePath);
  });
  onCaseEvent(explorer, "case-files-change", render);

  render();
}
