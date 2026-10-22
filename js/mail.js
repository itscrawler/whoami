// WHOAMI — Mail app
// The client's first message, messages that arrive as the case moves (case.json "mail"),
// and replies after the report is filed. Email attachments open in their own window.

// Every message currently in the inbox, newest first.
function mailboxMessages() {
  const info = caseData.caseInfo;
  const intro = info.intro;
  const messages = [{
    id: "client-message",
    from: intro.from,
    subject: intro.subject,
    body: intro.body,
    timestamp: intro.timestamp,
    attachmentIds: intro.attachments || [],
  }];

  for (const message of info.mail || []) {
    const arrivedAt = window.CASE_PROGRESS.deliveredMail.get(message.id);
    if (!arrivedAt) continue;
    messages.push({ ...message, timestamp: arrivedAt, attachmentIds: message.attachments || [] });
  }

  // After a report is filed: the news and the client's reply (see endings in case.json).
  const submission = window.CASE_PROGRESS.reportSubmission;
  const ending = submission?.ending;
  if (ending && submission.submittedAt) {
    const news = ending.type === "bad" ? ending.followUp : ending.body;
    messages.push({
      id: `ending-news-${submission.submittedAt}`,
      from: "alerts@kingscountyledger.news",
      subject: ending.headline,
      body: news || ending.headline,
      timestamp: submission.submittedAt,
      attachmentIds: [],
    });
    const reply = ending.type === "bad" ? ending.body : ending.message;
    if (reply) {
      messages.push({
        id: `ending-reply-${submission.submittedAt}`,
        from: info.client,
        subject: `Re: ${intro.subject}`,
        body: reply,
        timestamp: submission.submittedAt,
        attachmentIds: [],
      });
    }
  }

  // Newest first; messages that arrived at the same minute keep their arrival order.
  return messages
    .map((message, index) => ({ message, index }))
    .sort((first, second) =>
      Date.parse(second.message.timestamp) - Date.parse(first.message.timestamp) || second.index - first.index
    )
    .map(({ message }) => message);
}

function renderMail(container) {
  const app = createEl("div", "mail-app");
  const inbox = createEl("div", "mail-inbox");
  inbox.setAttribute("aria-label", "Inbox");
  const reader = createEl("section", "mail-reader");
  app.append(inbox, reader);
  container.appendChild(app);

  if (!caseData) {
    reader.appendChild(createEl("p", "mail-empty", "Mail offline. Try again in a moment."));
    return;
  }

  let messages = [];
  // Start on the oldest unread message (the client's message on a new case).
  let selectedId = null;

  function drawInbox() {
    messages = mailboxMessages();
    inbox.replaceChildren();
    for (const message of messages) {
      const row = createEl("button", "mail-message");
      row.type = "button";
      row.dataset.message = message.id;
      const selected = message.id === selectedId;
      row.classList.toggle("is-selected", selected);
      row.classList.toggle("is-unread", !window.CASE_PROGRESS.readMail.has(message.id));
      row.setAttribute("aria-pressed", String(selected));
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
    }
  }

  function showMessage(message) {
    selectedId = message.id;
    if (!window.CASE_PROGRESS.readMail.has(message.id)) {
      window.CASE_PROGRESS.readMail.add(message.id);
      saveCaseProgress();
      window.dispatchEvent(new Event("case-mail-change"));
    }
    drawInbox();

    reader.replaceChildren();
    const header = createEl("header", "mail-message-header");
    const sender = createEl("p", "mail-sender");
    sender.append(createEl("span", "", "FROM"), document.createTextNode(` ${message.from}`));
    const subject = createEl("p", "mail-subject");
    subject.append(createEl("span", "", "SUBJ"), document.createTextNode(` ${message.subject}`));
    const date = createEl("p", "mail-subject");
    date.append(createEl("span", "", "DATE"), document.createTextNode(` ${formatEvidenceTime(message.timestamp)}`));
    header.append(sender, subject, date);

    const body = createEl("div", "mail-body");
    for (const paragraph of message.body.split(/\n{2,}/)) {
      body.appendChild(createEl("p", "", paragraph));
    }
    reader.append(header, body);

    const attachments = message.attachmentIds
      .map(evidenceById)
      .filter((evidence) => evidence?.access?.type === "client");
    if (attachments.length) {
      const attachmentList = createEl("div", "mail-attachments");
      for (const attachment of attachments) {
        const button = createEl("button", "mail-attachment");
        button.type = "button";
        button.dataset.attachment = attachment.id;
        button.append(
          createEl("span", "mail-attachment-icon", "□"),
          createEl("span", "", attachment.title)
        );
        attachmentList.appendChild(button);
      }
      reader.appendChild(attachmentList);
    }
  }

  inbox.addEventListener("click", (event) => {
    const row = event.target.closest("[data-message]");
    const message = row && messages.find((entry) => entry.id === row.dataset.message);
    if (message) showMessage(message);
  });

  reader.addEventListener("click", (event) => {
    const button = event.target.closest("[data-attachment]");
    const attachment = button && evidenceById(button.dataset.attachment);
    if (attachment) openAttachment(attachment);
  });

  onCaseEvent(app, "case-mail-change", drawInbox);

  drawInbox();
  const firstUnread = [...messages].reverse().find((message) => !window.CASE_PROGRESS.readMail.has(message.id));
  const first = firstUnread || messages[0];
  if (first) showMessage(first);
}

// Email attachments get a mail-style window; anything else opens in the shared record viewer.
function openAttachment(attachment) {
  if (attachment.content?.type !== "email") {
    openEvidenceViewer(attachment, "/ attachment");
    return;
  }
  window.markEvidenceFound(attachment.id);
  const email = attachment.content;
  openAuxiliaryWindow({
    id: `mail-message-${attachment.id}`,
    name: "Email",
    subtitle: "/ message details",
    width: 460,
    height: 360,
    render(container) {
      const detail = createEl("div", "mail-detail-window");
      const metadata = createEl("dl", "mail-detail-meta");
      for (const [label, value] of [
        ["FROM", email.from],
        ["TO", email.to],
        ["DATE", formatEvidenceTime(attachment.timestamp)],
        ["SUBJECT", email.subject],
      ]) {
        const row = createEl("div", "mail-detail-row");
        row.append(createEl("dt", "mail-detail-label", label));
        row.append(createEl("dd", "mail-detail-value", value || "—"));
        metadata.appendChild(row);
      }

      const body = createEl("div", "mail-body mail-detail-body");
      for (const paragraph of email.body.split(/\n{2,}/)) {
        body.appendChild(createEl("p", "", paragraph));
      }
      detail.append(metadata, body);
      container.appendChild(detail);
    },
  });
}
