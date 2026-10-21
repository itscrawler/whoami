// WHOAMI — Mail app
// Shows the client's message and any email evidence attached to it.

function renderMail(container) {
  const app = createEl("div", "mail-app");
  const inbox = createEl("div", "mail-inbox");
  inbox.setAttribute("aria-label", "Inbox");
  const reader = createEl("section", "mail-reader");

  if (!caseData) {
    reader.appendChild(createEl("p", "mail-empty", "Mail offline. Try again in a moment."));
    app.append(inbox, reader);
    container.appendChild(app);
    return;
  }

  const intro = caseData.caseInfo.intro;
  const messages = [
    {
      id: "client-message",
      from: intro.from,
      subject: intro.subject,
      body: intro.body,
      timestamp: intro.timestamp,
      attachmentIds: intro.attachments || [],
    },
    ...(caseData.evidence || [])
      .filter(
        (evidence) =>
          evidence.app === "mail" &&
          evidence.access?.type === "client" &&
          evidence.content?.type === "email"
      )
      .map((evidence) => ({
        id: evidence.id,
        from: evidence.content.from,
        subject: evidence.content.subject,
        body: evidence.content.body,
        timestamp: evidence.timestamp,
        attachmentIds: [],
        source: evidence.source,
      })),
  ];

  let selectedId = messages[0]?.id;
  const rows = new Map();
  for (const message of messages) {
    const row = createEl("button", "mail-message");
    row.type = "button";
    row.dataset.message = message.id;
    row.setAttribute("aria-pressed", "false");
    const topline = createEl("span", "mail-message-topline");
    topline.append(
      createEl("span", "mail-message-from", message.from),
      createEl("span", "mail-message-date", message.timestamp?.slice(11, 16) || "")
    );
    row.append(
      topline,
      createEl("span", "mail-message-subject", message.subject),
      createEl("span", "mail-message-preview", message.body.replace(/\s+/g, " ").trim())
    );
    inbox.appendChild(row);
    rows.set(message.id, row);
  }

  function showMessage(message) {
    selectedId = message.id;
    for (const [id, row] of rows) {
      const selected = id === selectedId;
      row.classList.toggle("is-selected", selected);
      row.setAttribute("aria-pressed", String(selected));
    }

    reader.replaceChildren();
    const header = createEl("header", "mail-message-header");
    const sender = createEl("p", "mail-sender");
    sender.append(createEl("span", "", "FROM"), document.createTextNode(` ${message.from}`));
    const subject = createEl("p", "mail-subject");
    subject.append(createEl("span", "", "SUBJ"), document.createTextNode(` ${message.subject}`));
    header.append(sender, subject);

    const body = createEl("div", "mail-body");
    for (const paragraph of message.body.split(/\n{2,}/)) {
      body.appendChild(createEl("p", "", paragraph));
    }
    reader.append(header, body);

    const attachments = (message.attachmentIds || [])
      .map((id) => caseData.evidence.find((evidence) => evidence.id === id))
      .filter(
        (evidence) => evidence?.access?.type === "client" && evidence.content?.type === "email"
      );
    if (attachments.length) {
      const attachmentList = createEl("div", "mail-attachments");
      for (const attachment of attachments) {
        const button = createEl("button", "mail-attachment");
        button.type = "button";
        button.dataset.message = attachment.id;
        button.append(
          createEl("span", "mail-attachment-icon", "□"),
          createEl("span", "", attachment.title)
        );
        attachmentList.appendChild(button);
        rows.set(attachment.id, button);
      }
      reader.appendChild(attachmentList);
    }
  }

  inbox.addEventListener("click", (event) => {
    const row = event.target.closest("[data-message]");
    if (!row) return;

    const message = messages.find((entry) => entry.id === row.dataset.message);
    if (message) {
      showMessage(message);
      return;
    }

    const attachment = caseData.evidence.find((entry) => entry.id === row.dataset.message);
    if (!attachment || attachment.access?.type !== "client") return;
    showMessage({
      id: attachment.id,
      from: attachment.content.from,
      subject: attachment.content.subject,
      body: attachment.content.body,
      timestamp: attachment.timestamp,
      attachmentIds: [],
      source: attachment.source,
    });
  });

  reader.addEventListener("click", (event) => {
    const button = event.target.closest("[data-message]");
    if (!button) return;
    const attachment = caseData.evidence.find((entry) => entry.id === button.dataset.message);
    if (!attachment || attachment.access?.type !== "client") return;
    showMessage({
      id: attachment.id,
      from: attachment.content.from,
      subject: attachment.content.subject,
      body: attachment.content.body,
      timestamp: attachment.timestamp,
      attachmentIds: [],
      source: attachment.source,
    });
  });

  app.append(inbox, reader);
  container.appendChild(app);
  if (messages.length) showMessage(messages[0]);
}
