// WHOAMI — fictional public web browser

function renderBrowser(container) {
  const app = createEl("div", "browser-app");
  const pageById = new Map(
    caseData?.web.map((entry) => [entry.id, entry]) || []
  );
  const tabs = [{ id: 1, history: [{ type: "home" }], index: 0 }];
  let activeTabId = 1;
  let nextTabId = 2;

  if (!caseData) {
    app.appendChild(createEl("p", "browser-empty", "Public web index unavailable."));
    container.appendChild(app);
    return;
  }

  container.appendChild(app);
  draw();

  function activeTab() {
    return tabs.find((tab) => tab.id === activeTabId);
  }

  function currentLocation() {
    return activeTab().history[activeTab().index];
  }

  function navigate(location) {
    const tab = activeTab();
    tab.history = tab.history.slice(0, tab.index + 1);
    tab.history.push(location);
    tab.index += 1;
    draw();
  }

  function openSearch(query) {
    navigate({ type: "search", query });
  }

  function openPage(id) {
    if (pageById.has(id)) {
      window.markEvidenceFound(id);
      navigate({ type: "page", id });
    }
  }

  function draw() {
    const tab = activeTab();
    const location = currentLocation();
    const url = locationUrl(location);
    app.replaceChildren();

    const tabBar = createEl("div", "browser-tabs");
    for (const item of tabs) {
      const tabButton = createEl("button", "browser-tab");
      tabButton.type = "button";
      tabButton.dataset.action = "switch-tab";
      tabButton.dataset.tab = String(item.id);
      tabButton.classList.toggle("is-active", item.id === activeTabId);
      tabButton.append(
        createEl("span", "browser-tab-mark", "◉"),
        createEl("span", "browser-tab-name", tabTitle(item)),
      );
      if (tabs.length > 1) {
        const closeButton = createEl("span", "browser-tab-close", "×");
        closeButton.dataset.action = "close-tab";
        closeButton.dataset.tab = String(item.id);
        closeButton.setAttribute("aria-label", "Close tab");
        tabButton.appendChild(closeButton);
      }
      tabBar.appendChild(tabButton);
    }
    const newTab = createEl("button", "browser-new-tab", "+");
    newTab.type = "button";
    newTab.dataset.action = "new-tab";
    newTab.setAttribute("aria-label", "New tab");
    tabBar.appendChild(newTab);

    const toolbar = createEl("div", "browser-toolbar");
    toolbar.append(
      toolbarButton("back", "‹", "Back", tab.index > 0),
      toolbarButton("forward", "›", "Forward", tab.index < tab.history.length - 1),
      toolbarButton("refresh", "↻", "Refresh", true),
      toolbarButton("home", "⌂", "Home", true),
    );
    const addressForm = createEl("form", "browser-address-form");
    addressForm.dataset.form = "address";
    const address = createEl("input", "browser-address");
    address.type = "text";
    address.value = url;
    address.autocomplete = "off";
    address.spellcheck = false;
    address.setAttribute("aria-label", "Address or search");
    addressForm.appendChild(address);
    toolbar.appendChild(addressForm);

    const viewport = createEl("div", "browser-viewport");
    if (location.type === "home") {
      renderHome(viewport);
    } else if (location.type === "search") {
      renderResults(viewport, location.query);
    } else {
      renderPage(viewport, pageById.get(location.id));
    }
    app.append(tabBar, toolbar, viewport);

    tabBar.addEventListener("click", (event) => {
      const target = event.target.closest("[data-action]");
      if (!target) return;
      const id = Number(target.dataset.tab);
      if (target.dataset.action === "switch-tab") {
        activeTabId = id;
        draw();
      } else if (target.dataset.action === "close-tab") {
        closeTab(id);
      } else if (target.dataset.action === "new-tab") {
        newTabPage();
      }
    });

    toolbar.addEventListener("click", (event) => {
      const button = event.target.closest("[data-action]");
      if (!button || button.disabled) return;
      if (button.dataset.action === "back") moveHistory(-1);
      if (button.dataset.action === "forward") moveHistory(1);
      if (button.dataset.action === "refresh") draw();
      if (button.dataset.action === "home") navigate({ type: "home" });
    });

    addressForm.addEventListener("submit", (event) => {
      event.preventDefault();
      navigateAddress(address.value);
    });

    viewport.addEventListener("submit", (event) => {
      const form = event.target.closest("[data-form='search']");
      if (!form) return;
      event.preventDefault();
      const query = new FormData(form).get("q")?.toString().trim();
      if (query) openSearch(query);
    });

    viewport.addEventListener("click", (event) => {
      const link = event.target.closest("[data-page-id]");
      if (link) openPage(link.dataset.pageId);
      const searchLink = event.target.closest("[data-search-query]");
      if (searchLink) openSearch(searchLink.dataset.searchQuery);
    });
  }

  function renderHome(viewport) {
    const home = createEl("section", "browser-home");
    home.append(
      createEl("div", "browser-brand-mark", "D"),
      createEl("h2", "browser-brand", "Dorne"),
      createEl("p", "browser-tagline", "Search the public record."),
    );
    const form = createEl("form", "browser-search-form");
    form.dataset.form = "search";
    const input = createEl("input", "browser-search-input");
    input.name = "q";
    input.type = "search";
    input.placeholder = "Search this case's public pages";
    input.autocomplete = "off";
    input.setAttribute("aria-label", "Search public pages");
    const submit = createEl("button", "browser-search-submit", "SEARCH");
    submit.type = "submit";
    form.append(input, submit);
    home.appendChild(form);
    home.appendChild(createEl("p", "browser-home-note", "The web is small. The clues are not."));
    viewport.appendChild(home);
  }

  function renderResults(viewport, query) {
    const results = searchPages(query);
    const heading = createEl("div", "browser-results-heading");
    heading.append(
      createEl("p", "browser-result-count", `${results.length} PUBLIC PAGE${results.length === 1 ? "" : "S"}`),
      createEl("h2", "browser-query", query),
    );
    viewport.appendChild(heading);
    if (!results.length) {
      const message = searchTerms(query).length
        ? "No public pages matched that search."
        : "Search words need at least 3 letters.";
      viewport.appendChild(createEl("p", "browser-no-results", message));
      return;
    }

    const list = createEl("div", "browser-results-list");
    for (const entry of results) {
      const button = createEl("button", "browser-result");
      button.type = "button";
      button.dataset.pageId = entry.id;
      button.append(
        createEl("span", "browser-result-url", `dorne · ${platformFor(entry)}`),
        createEl("span", "browser-result-title", entry.title),
        createEl("span", "browser-result-summary", pageSummary(entry)),
      );
      list.appendChild(button);
    }
    viewport.appendChild(list);
  }

  function renderPage(viewport, entry) {
    if (!entry) {
      viewport.appendChild(createEl("p", "browser-no-results", "This public page is no longer available."));
      return;
    }
    const content = entry.content || {};
    const page = createEl("article", `browser-page browser-page-${content.type || "record"}`);
    const header = createEl("header", "browser-page-header");
    header.append(
      createEl("span", "browser-page-platform", platformFor(entry)),
      createEl("h2", "browser-page-title", entry.title),
    );
    const details = pageDetails(entry);
    if (details) header.appendChild(createEl("p", "browser-page-details", details));
    page.appendChild(header);

    if (content.type === "post") {
      appendPost(page, content, entry);
    } else if (content.type === "posts") {
      for (const post of content.posts || []) appendPost(page, post, entry);
    } else if (content.type === "activity") {
      appendFields(page, [
        ["ACTIVITY", content.name],
        ["START", content.start],
        ["END", content.end],
        ["DISTANCE", content.distance],
        ["LOCATION", content.location],
        ["ROUTE", content.map],
      ]);
    } else if (content.type === "ad") {
      appendFields(page, [
        ["POSTED", content.date],
        ["LISTING", content.title],
        ["DETAILS", content.body],
        ["CONTACT", content.contact],
      ]);
    } else if (content.type === "record") {
      appendFields(page, [
        ["COMPANY", content.company],
        ["OWNER", content.owner],
        ["REGISTERED", content.registered],
        ["ADDRESS", content.address],
        ["STATUS", content.status],
      ]);
    } else if (content.type === "article") {
      appendFields(page, [
        ["BY", personName(content.author)],
        ["PUBLISHED", content.date],
        ["", content.body],
      ]);
    } else if (content.type === "website") {
      page.appendChild(createEl("p", "browser-website-description", content.description));
      const archive = pageById.get(content.archiveEvidenceId);
      if (archive) {
        const link = createEl("button", "browser-archive-link", "OPEN CAMERA ARCHIVE →");
        link.type = "button";
        link.dataset.pageId = archive.id;
        page.appendChild(link);
      }
    } else if (content.type === "video") {
      page.appendChild(createEl("p", "browser-archive-note", "ARCHIVED CAMERA CLIPS"));
      for (const clip of content.clips || []) {
        const row = createEl("section", "browser-clip");
        row.append(
          createEl("time", "browser-clip-time", clip.time),
          createEl("p", "browser-clip-description", clip.description),
        );
        page.appendChild(row);
      }
    }
    viewport.appendChild(page);
  }

  function appendPost(parent, post, entry) {
    const card = createEl("section", "browser-post");
    const author = personName(post.author || entry.people?.[0]);
    const when = post.date || post.time || "";
    card.append(
      createEl("div", "browser-post-meta", [author, when].filter(Boolean).join(" · ")),
      createEl("p", "browser-post-text", post.text || ""),
    );
    if (post.location) card.appendChild(createEl("p", "browser-post-location", `LOCATION · ${post.location}`));
    if (post.photo) card.appendChild(createEl("p", "browser-post-photo", post.photo));
    parent.appendChild(card);
  }

  function appendFields(parent, fields) {
    const list = createEl("dl", "browser-page-fields");
    for (const [label, value] of fields) {
      if (!value) continue;
      const row = createEl("div", "browser-page-field");
      if (label) row.appendChild(createEl("dt", "", label));
      row.appendChild(createEl("dd", "", value));
      list.appendChild(row);
    }
    parent.appendChild(list);
  }

  // Only words a reader can see on the page (plus its search phrases) are indexed:
  // the hidden "people" tags and JSON keys would give away links the page doesn't show.
  function searchPages(query) {
    const terms = searchTerms(query);
    if (!terms.length) return [];
    return [...pageById.values()].filter((entry) => {
      const haystack = [
        entry.title,
        entry.platform,
        entry.handle,
        entry.url,
        entry.queries?.join(" "),
        visibleText(entry.content),
      ].join(" ").toLocaleLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  }

  function searchTerms(query) {
    return query.toLocaleLowerCase().split(/\s+/).filter((term) => term.length >= 3);
  }

  function visibleText(value) {
    if (typeof value === "string") return personById(value) ? personName(value) : value;
    if (Array.isArray(value)) return value.map(visibleText).join(" ");
    if (value && typeof value === "object") {
      return Object.entries(value)
        .filter(([key]) => key !== "type" && key !== "archiveEvidenceId")
        .map(([, inner]) => visibleText(inner))
        .join(" ");
    }
    return value == null ? "" : String(value);
  }

  function navigateAddress(value) {
    const address = value.trim();
    if (!address) return;
    if (/^https?:\/\//i.test(address)) {
      try {
        const url = new URL(address);
        const page = [...pageById.values()].find((entry) => entry.url === url.href);
        if (page) {
          openPage(page.id);
          return;
        }
        const id = url.pathname.split("/").filter(Boolean).pop();
        if (pageById.has(id)) {
          openPage(id);
          return;
        }
        const query = url.searchParams.get("q");
        if (query) {
          openSearch(query);
          return;
        }
        if (url.hostname === "dorne.local" && url.pathname === "/") {
          navigate({ type: "home" });
          return;
        }
      } catch {
        // Unrecognized addresses are treated as a search, not loaded from the internet.
      }
    }
    openSearch(address);
  }

  function locationUrl(location) {
    if (location.type === "home") return "https://dorne.local/";
    if (location.type === "search") return `https://dorne.local/search?q=${encodeURIComponent(location.query)}`;
    const entry = pageById.get(location.id);
    return entry?.url || "https://dorne.local/";
  }

  function pageTitle(tab) {
    const location = tab.history[tab.index];
    if (location.type === "home") return "Dorne";
    if (location.type === "search") return location.query || "Search";
    return pageById.get(location.id)?.title || "Public page";
  }

  function pageDetails(entry) {
    const content = entry.content || {};
    const values = [];
    if (content.author) values.push(personName(content.author));
    if (content.date) values.push(content.date);
    if (content.start) values.push(content.start);
    if (content.location) values.push(content.location);
    return values.join(" · ");
  }

  function platformFor(entry) {
    return entry.platform || entry.content?.platform || "Public record";
  }

  function pageSummary(entry) {
    const content = entry.content || {};
    const text = content.text || content.body || content.description ||
      content.map || content.company || content.posts?.map((post) => post.text).join(" ") ||
      content.clips?.map((clip) => clip.description).join(" ") || "";
    return String(text).replace(/\s+/g, " ").trim();
  }

  function tabTitle(tab) {
    const title = pageTitle(tab);
    return title.length > 22 ? `${title.slice(0, 21)}…` : title;
  }

  function closeTab(id) {
    if (tabs.length === 1) {
      const only = tabs[0];
      only.history = [{ type: "home" }];
      only.index = 0;
    } else {
      const index = tabs.findIndex((tab) => tab.id === id);
      tabs.splice(index, 1);
      if (activeTabId === id) activeTabId = tabs[Math.max(0, index - 1)].id;
    }
    draw();
  }

  function newTabPage() {
    const tab = { id: nextTabId++, history: [{ type: "home" }], index: 0 };
    tabs.push(tab);
    activeTabId = tab.id;
    draw();
  }

  function moveHistory(direction) {
    const tab = activeTab();
    tab.index += direction;
    draw();
  }

  function toolbarButton(action, text, label, enabled) {
    const button = createEl("button", "browser-control", text);
    button.type = "button";
    button.dataset.action = action;
    button.title = label;
    button.setAttribute("aria-label", label);
    button.disabled = !enabled;
    return button;
  }
}
