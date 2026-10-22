// WHOAMI — shared help directory

function renderHandbook(container) {
  const handbook = createEl("div", "handbook");
  const navigation = createEl("nav", "handbook-nav");
  navigation.setAttribute("aria-label", "Help topics");
  const content = createEl("div", "handbook-content");
  const topics = handbookData?.topics || [];

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

    for (const paragraph of topic.paragraphs || []) {
      page.appendChild(createEl("p", "", paragraph));
    }

    for (const group of topic.groups || []) {
      const section = createEl("section", "handbook-group");
      section.appendChild(createEl("h3", "", group.title));
      const list = createEl("ul", "handbook-list");
      for (const item of group.items || []) {
        const row = createEl("li", "handbook-list-item");
        if (item.command) {
          row.appendChild(createEl("code", "handbook-command", item.command));
        }
        row.appendChild(createEl("span", "handbook-description", item.description));
        list.appendChild(row);
      }
      section.appendChild(list);
      page.appendChild(section);
    }

    content.replaceChildren(page);
  }

  navigation.addEventListener("click", (event) => {
    const button = event.target.closest("[data-topic]");
    if (button) showTopic(button.dataset.topic);
  });

  handbook.append(navigation, content);
  container.appendChild(handbook);

  if (topics.length) {
    showTopic(topics[0].id);
  } else {
    content.appendChild(createEl("p", "handbook-error", "Handbook content is unavailable."));
  }
}
