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
        "This is a simulated case terminal. Commands only inspect the fictional case data and your in-game session; they do not run on your computer or contact real services.",
        "BASICS: help [command] lists commands or explains one; clear clears output; history shows saved commands and the up/down arrows recall them; date shows in-game time; whoami prints your handle; exit closes the terminal.",
        "FILES: ls lists the current folder; cd <folder> changes folder; cat <file> prints a downloaded text record; open <file> opens a downloaded record in a viewer; download <file|all> saves records available in your current session; unzip <archive> extracts an unlocked archive.",
        "VPN: vpn connect <node> starts the simulated tunnel; vpn status checks it; vpn disconnect closes it. A VPN is required before connecting to protected targets.",
        "SEARCH: lookup <name|number|email|vehicle> searches resident records; breach search <email|username> checks the available fictional leak; geoip <ip> searches IP locations in case records.",
        "ACCESS: scan <target> reports access requirements; connect <target> opens a simulated target after scanning and connecting the VPN; login <service> <account> <password> checks discovered credentials; logout ends account sessions; disconnect closes the target connection.",
        "WORDLIST: wordlist add <word> adds a clue you found; wordlist show lists your collected clues; crack <archive> --wordlist mine checks only those clues, never an automatic or external password list.",
        "PHONE: Open Phone in the dock to browse case messages, social posts, email, and device records. Locked records require the matching terminal connection or account session.",
        "PHONE ACCESS: scan phone → vpn connect NYC-07 → connect phone unlocks carrier records. Find Mia's Nimbus credentials in case evidence, then use login nimbus <account> <password> for her message backup and email.",
        "PHONE RECORDS: towers <number> [--date YYYY-MM-DD] shows an available tower log, optionally filtered by date; calls shows downloaded call logs when present; sms shows downloaded text conversations. hack [target] gives a hint for the simulated access flow.",
        "sudo and rm -rf / are harmless jokes; they do not execute system commands.",
      ],
    },
    {
      id: "other-apps",
      label: "Other apps",
      title: "Apps not available yet",
      paragraphs: [
        "Browser, Phone, and Map are active. Map locations, tower signals, routes, and cameras appear as you uncover their evidence. Files, Evidence board, and Report are planned; the case data is preserved for future use.",
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
