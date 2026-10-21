// WHOAMI — help directory

function renderHandbook(container) {
  const handbook = createEl("div", "handbook");
  const navigation = createEl("nav", "handbook-nav");
  navigation.setAttribute("aria-label", "Help topics");
  const content = createEl("div", "handbook-content");

  const topics = [
    {
      id: "getting-started",
      label: "Getting started",
      title: "Start investigating",
      paragraphs: [
        "Read the client's message in Mail, then open any attached evidence for its full details.",
        "Collect facts from available apps, compare sources, and build a timeline. Look for details that confirm or contradict each other; a single clue is rarely the whole story.",
        "When you have enough evidence, the intended goal is to report who was responsible and explain how the evidence supports your conclusion. The report workflow is not available yet.",
      ],
    },
    {
      id: "windows",
      label: "Desktop & windows",
      title: "Using the desktop",
      paragraphs: [
        "Select an app in the dock to open it. Drag a window by its title bar, use the title-bar controls to minimize, maximize, or close it, and resize it from the lower-right corner.",
        "Select the ? button beside the clock any time to reopen this directory. The Handbook is also available from the dock.",
      ],
    },
    {
      id: "mail",
      label: "Mail",
      title: "Mail",
      paragraphs: [
        "The inbox contains messages from the client. Select a message to read it. Select an attachment below the message to open that email in its own window and inspect its sender, recipient, date, subject, and body.",
      ],
    },
    {
      id: "database",
      label: "Database",
      title: "Resident database",
      paragraphs: [
        "Enter a name, record ID, birth detail, address, or status. Choose the matching search field, then select SEARCH or press Enter.",
        "Select a result to open its dossier. Dossier tabs show different record sections; linked people can be selected to move between dossiers.",
      ],
    },
    {
      id: "terminal",
      label: "Terminal commands",
      title: "Terminal",
      paragraphs: [
        "The Terminal is not implemented yet, so it currently accepts no commands. There are no active shell commands to use in this case. Supported commands and examples will be added here when the Terminal is available.",
      ],
    },
    {
      id: "other-apps",
      label: "Other apps",
      title: "Apps not available yet",
      paragraphs: [
        "Browser, Phone, Map, Files, Evidence board, and Report are planned but are not active yet. Cameras are also unavailable. Their case data is preserved for future use; these apps do not currently provide player actions.",
      ],
    },
  ];

  for (const topic of topics) {
    const button = createEl("button", "handbook-link", topic.label);
    button.type = "button";
    button.dataset.topic = topic.id;
    button.setAttribute("aria-current", "false");
    navigation.appendChild(button);
  }

  function showTopic(topicId) {
    const topic = topics.find((entry) => entry.id === topicId);
    if (!topic) return;

    navigation.querySelectorAll(".handbook-link").forEach((button) => {
      const selected = button.dataset.topic === topic.id;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-current", String(selected));
    });

    const page = createEl("section", "handbook-section");
    page.appendChild(createEl("h2", "", topic.title));
    for (const text of topic.paragraphs) {
      page.appendChild(createEl("p", "", text));
    }
    content.replaceChildren(page);
  }

  navigation.addEventListener("click", (event) => {
    const button = event.target.closest("[data-topic]");
    if (button) showTopic(button.dataset.topic);
  });

  handbook.append(navigation, content);
  container.appendChild(handbook);
  showTopic(topics[0].id);
}
