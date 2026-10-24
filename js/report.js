// WHOAMI — final case report

function renderReport(container) {
  const report = createEl("div", "report-app");
  container.appendChild(report);
  if (!caseData) {
    report.appendChild(createEl("p", "report-empty-evidence", "Case files are still loading. Reopen the report in a moment."));
    return;
  }

  const caseInfo = caseData.caseInfo;
  const answerKey = caseInfo.answerKey;
  const scoring = caseInfo.scoring;
  const people = (caseData.people || [])
    .filter((person) => person.id !== "mia-holt")
    .sort((first, second) => first.name.localeCompare(second.name));
  const places = caseInfo.places || [];
  let evidenceSyncListener = null;

  // Chain options in a fixed but scrambled order, so the answer is not always in the same spot.
  function scrambled(options, salt) {
    const hash = (text) => [...text].reduce((value, char) => (value * 31 + char.charCodeAt(0)) >>> 0, 7);
    return [...options].sort((first, second) => hash(salt + first.id) - hash(salt + second.id));
  }

  function minutes(time) {
    const [hours, mins] = String(time || "").split(":").map(Number);
    return hours * 60 + mins;
  }

  function closeTo(time, answer, tolerance) {
    return Math.abs(minutes(time) - minutes(answer)) <= tolerance;
  }

  // Everything on the evidence board (every found record) can support the report.
  function availableEvidence() {
    return [...window.CASE_PROGRESS.foundEvidence].map(evidenceById).filter(Boolean);
  }

  function saveDraft() {
    saveCaseProgress();
  }

  function createField(labelText, control, className = "") {
    const label = createEl("label", `report-field${className ? ` ${className}` : ""}`);
    label.append(createEl("span", "report-field-label", labelText), control);
    return label;
  }

  function createSelect(options, value, placeholder) {
    const select = createEl("select", "report-select");
    select.required = true;
    const blank = createEl("option", "", placeholder);
    blank.value = "";
    blank.disabled = true;
    blank.selected = !value;
    select.appendChild(blank);
    for (const option of options) {
      const item = createEl("option", "", option.label);
      item.value = option.value;
      item.selected = option.value === value;
      select.appendChild(item);
    }
    return select;
  }

  function getCurrentDraft() {
    const draft = window.CASE_PROGRESS.reportDraft;
    if (!Array.isArray(draft.chain)) draft.chain = [];
    return draft;
  }

  function showForm() {
    if (evidenceSyncListener) {
      window.removeEventListener("case-report-evidence-change", evidenceSyncListener);
      evidenceSyncListener = null;
    }
    report.replaceChildren();
    const draft = getCurrentDraft();
    const form = createEl("form", "report-form");
    form.noValidate = true;
    const intro = createEl("header", "report-header");
    intro.append(
      createEl("p", "report-eyebrow", `CASE #${caseInfo.id} · FINAL REPORT`),
      createEl("h2", "report-title", "What happened to Mia?")
    );
    form.appendChild(intro);

    const fields = createEl("section", "report-fields");
    fields.appendChild(createField(
      "Who is responsible?",
      createSelect(
        people.map((person) => ({ value: person.id, label: person.name })),
        draft.culprit,
        "Select a person"
      ),
      "report-field-wide"
    ));
    fields.lastElementChild.querySelector("select").dataset.reportField = "culprit";

    const date = createEl("input", "report-input");
    date.type = "date";
    date.required = true;
    date.value = draft.date || "";
    date.dataset.reportField = "date";
    fields.appendChild(createField("Incident date", date));

    const locationSelect = createSelect(
      places.map((place) => ({ value: place.id, label: place.name })),
      draft.location,
      "Select a location"
    );
    locationSelect.dataset.reportField = "location";
    fields.appendChild(createField("Where did it happen?", locationSelect));

    const from = createEl("input", "report-input");
    from.type = "time";
    from.required = true;
    from.value = draft.from || "";
    from.dataset.reportField = "from";
    fields.appendChild(createField("From", from, "report-field-time"));

    const to = createEl("input", "report-input");
    to.type = "time";
    to.required = true;
    to.value = draft.to || "";
    to.dataset.reportField = "to";
    fields.appendChild(createField("To", to, "report-field-time"));
    form.appendChild(fields);

    const chainHeading = createEl("div", "report-section-heading");
    chainHeading.append(
      createEl("h3", "", "Reconstruct the chain"),
      createEl("span", "", `${answerKey.chain.length} missing links`)
    );
    form.appendChild(chainHeading);

    const chainFields = createEl("section", "report-chain");
    for (const [index, step] of answerKey.chain.entries()) {
      const select = createSelect(
        scrambled(step.options, step.id).map((option) => ({ value: option.id, label: option.text })),
        draft.chain[index],
        "Choose what happened"
      );
      select.dataset.chainIndex = String(index);
      chainFields.appendChild(createField(step.text, select));
    }
    form.appendChild(chainFields);

    const evidenceHeading = createEl("div", "report-section-heading");
    const evidenceCount = createEl("span", "report-evidence-count");
    evidenceHeading.append(
      createEl("h3", "", "Supporting evidence"),
      evidenceCount
    );
    form.appendChild(evidenceHeading);

    const evidenceOptions = createEl("section", "report-evidence-options");
    const evidence = availableEvidence();
    if (!evidence.length) {
      evidenceOptions.appendChild(createEl(
        "p",
        "report-empty-evidence",
        "Find evidence during the investigation to support your report."
      ));
    }
    for (const entry of evidence) {
      const label = createEl(
        "label",
        `report-evidence-option${window.CASE_PROGRESS.reportEvidence.has(entry.id) ? " is-selected" : ""}`
      );
      const checkbox = createEl("input", "report-evidence-checkbox");
      checkbox.type = "checkbox";
      checkbox.value = entry.id;
      checkbox.checked = window.CASE_PROGRESS.reportEvidence.has(entry.id);
      checkbox.dataset.reportEvidence = entry.id;
      const copy = createEl("span", "report-evidence-copy");
      copy.append(
        createEl("strong", "", entry.title || entry.id),
        createEl("small", "", entry.app || "evidence")
      );
      label.append(checkbox, copy);
      evidenceOptions.appendChild(label);
    }
    form.appendChild(evidenceOptions);

    const validation = createEl("p", "report-validation");
    validation.hidden = true;
    validation.setAttribute("role", "alert");
    form.appendChild(validation);

    const actions = createEl("div", "report-actions");
    const submit = createEl("button", "report-submit", "Submit report");
    submit.type = "submit";
    actions.appendChild(submit);
    form.appendChild(actions);
    report.appendChild(form);

    function updateEvidenceCount() {
      const count = window.CASE_PROGRESS.reportEvidence.size;
      evidenceCount.textContent = `${count} selected · choose 2–5`;
      evidenceCount.classList.toggle("is-invalid", count < scoring.evidence.min || count > scoring.evidence.max);
    }

    function syncEvidenceSelection() {
      evidenceOptions.querySelectorAll("[data-report-evidence]").forEach((checkbox) => {
        checkbox.checked = window.CASE_PROGRESS.reportEvidence.has(checkbox.value);
        checkbox.closest(".report-evidence-option")
          .classList.toggle("is-selected", checkbox.checked);
      });
      updateEvidenceCount();
    }

    updateEvidenceCount();

    form.addEventListener("input", (event) => {
      const field = event.target.dataset.reportField;
      if (field) draft[field] = event.target.value;
      const chainIndex = event.target.dataset.chainIndex;
      if (chainIndex !== undefined) draft.chain[Number(chainIndex)] = event.target.value;
      saveDraft();
    });

    evidenceOptions.addEventListener("change", (event) => {
      const checkbox = event.target.closest("[data-report-evidence]");
      if (!checkbox) return;
      if (checkbox.checked) {
        window.CASE_PROGRESS.reportEvidence.add(checkbox.value);
      } else {
        window.CASE_PROGRESS.reportEvidence.delete(checkbox.value);
      }
      checkbox.closest(".report-evidence-option").classList.toggle("is-selected", checkbox.checked);
      updateEvidenceCount();
      saveDraft();
      window.dispatchEvent(new Event("case-report-evidence-change"));
    });

    evidenceSyncListener = syncEvidenceSelection;
    window.addEventListener("case-report-evidence-change", evidenceSyncListener);

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      validation.hidden = true;
      if (!form.reportValidity()) return;
      const count = window.CASE_PROGRESS.reportEvidence.size;
      if (count < scoring.evidence.min || count > scoring.evidence.max) {
        validation.textContent = `Select between ${scoring.evidence.min} and ${scoring.evidence.max} pieces of evidence.`;
        validation.hidden = false;
        return;
      }
      if (!window.confirm("File the final report? It can't be changed after it is sent.")) return;
      window.CASE_PROGRESS.reportSubmission = {
        ...evaluateReport(draft, [...window.CASE_PROGRESS.reportEvidence]),
        submittedAt: gameTimestamp(),
      };
      saveCaseProgress();
      showResult();
      // The news and the client's reply arrive in Mail.
      window.dispatchEvent(new Event("case-mail-change"));
      announceMail(caseInfo.client);
    });
  }

  function evaluateReport(draft, selectedEvidence) {
    const points = scoring.points;
    const dateIsCorrect = draft.date === answerKey.time.date;
    const tolerance = answerKey.time.toleranceMinutes || 0;
    const timeIsCorrect = closeTo(draft.from, answerKey.time.from, tolerance) &&
      closeTo(draft.to, answerKey.time.to, tolerance);
    const timePoints = dateIsCorrect
      ? (timeIsCorrect ? points.time : points.timeDateOnly)
      : 0;
    const chainResults = answerKey.chain.map((step, index) => ({
      prompt: step.text,
      correct: draft.chain[index] === step.answer,
      selected: step.options.find((option) => option.id === draft.chain[index])?.text || "No answer",
      answer: step.options.find((option) => option.id === step.answer)?.text || step.answer,
      points: draft.chain[index] === step.answer ? points.chain / answerKey.chain.length : 0,
    }));
    const evidenceResults = selectedEvidence.map((id) => {
      const entry = caseData.evidence.find((candidate) => candidate.id === id);
      const weight = scoring.evidence[entry?.weight] || 0;
      return {
        id,
        title: entry?.title || id,
        weight,
      };
    });
    const evidencePoints = Math.min(
      points.evidence,
      evidenceResults.reduce((total, entry) => total + entry.weight, 0)
    );
    const correctCulprit = draft.culprit === answerKey.culprit;
    const correctLocation = draft.location === answerKey.location;
    const score = Math.round(
      (correctCulprit ? points.culprit : 0) +
      (correctLocation ? points.location : 0) +
      timePoints +
      chainResults.reduce((total, entry) => total + entry.points, 0) +
      evidencePoints
    );
    let grade = scoring.grades.find((entry) => score >= entry.min)?.grade || "F";
    if (!correctCulprit) {
      const grades = scoring.grades.map((entry) => entry.grade);
      if (grades.indexOf(grade) < grades.indexOf(scoring.wrongCulpritMaxGrade)) {
        grade = scoring.wrongCulpritMaxGrade;
      }
    }

    const ending = selectEnding(draft.culprit, score, selectedEvidence);
    return {
      answers: {
        ...draft,
        chain: [...draft.chain],
        evidence: selectedEvidence,
      },
      score,
      grade,
      correctCulprit,
      correctLocation,
      dateIsCorrect,
      timeIsCorrect,
      timePoints,
      chainResults,
      evidenceResults,
      evidencePoints,
      ending,
    };
  }

  function selectEnding(culprit, score, selectedEvidence) {
    if (culprit !== answerKey.culprit) {
      const bad = caseInfo.endings.bad;
      const variant = bad.variants[culprit] || bad.variants.default;
      return {
        type: "bad",
        headline: variant.headline,
        followUp: variant.followUp || "",
        body: variant.message?.body || "",
      };
    }
    if (score < 70) {
      const mid = caseInfo.endings.mid;
      return { type: "mid", headline: mid.headline, body: mid.body, message: mid.message?.body || "" };
    }

    const good = caseInfo.endings.good;
    const article = good.steps.find((step) => step.type === "article");
    const messages = good.steps.filter((step) => step.type === "message");
    const bonus = selectedEvidence.includes(article?.bonusParagraph?.requires)
      ? article.bonusParagraph.text
      : "";
    return {
      type: "good",
      headline: article?.headline || "Case reopened",
      body: [article?.body, bonus].filter(Boolean).join("\n\n"),
      message: messages[messages.length - 1]?.body || "",
    };
  }

  function resultRow(label, detail, earned, total, correct) {
    const row = createEl("div", `report-result-row${correct ? " is-correct" : " is-missed"}`);
    const copy = createEl("div", "report-result-copy");
    copy.append(createEl("strong", "", label), createEl("span", "", detail));
    row.append(copy, createEl("span", "report-result-points", `${earned}/${total}`));
    return row;
  }

  function showResult() {
    if (evidenceSyncListener) {
      window.removeEventListener("case-report-evidence-change", evidenceSyncListener);
      evidenceSyncListener = null;
    }
    const savedSubmission = window.CASE_PROGRESS.reportSubmission;
    const answers = savedSubmission?.answers;
    const validAnswers = answers &&
      typeof answers === "object" &&
      typeof answers.culprit === "string" &&
      people.some((person) => person.id === answers.culprit) &&
      typeof answers.date === "string" &&
      typeof answers.from === "string" &&
      typeof answers.to === "string" &&
      places.some((place) => place.id === answers.location) &&
      Array.isArray(answers.chain) &&
      answers.chain.length === answerKey.chain.length &&
      answers.chain.every((answer) => typeof answer === "string") &&
      Array.isArray(answers.evidence) &&
      answers.evidence.length >= scoring.evidence.min &&
      answers.evidence.length <= scoring.evidence.max &&
      answers.evidence.every((id) =>
        availableEvidence().some((entry) => entry.id === id)
      );
    if (!validAnswers) {
      if (savedSubmission) console.warn("Ignoring invalid saved report submission.");
      window.CASE_PROGRESS.reportSubmission = null;
      return showForm();
    }
    const result = { ...evaluateReport(answers, answers.evidence), submittedAt: savedSubmission.submittedAt };
    window.CASE_PROGRESS.reportSubmission = result;
    report.replaceChildren();
    const outcome = createEl("section", `report-result report-ending-${result.ending.type}`);
    outcome.append(
      createEl("p", "report-eyebrow", "INVESTIGATION OUTCOME"),
      createEl("h2", "report-result-headline", result.ending.headline)
    );
    const scoreBlock = createEl("div", "report-score");
    scoreBlock.append(
      createEl("strong", "", `${result.score}%`),
      createEl("span", "report-grade", `GRADE ${result.grade}`)
    );
    outcome.appendChild(scoreBlock);
    if (result.ending.body) outcome.appendChild(createEl("p", "report-ending-body", result.ending.body));
    if (result.ending.followUp) outcome.appendChild(createEl("p", "report-ending-followup", result.ending.followUp));
    if (result.ending.message) {
      const message = createEl("blockquote", "report-ending-message");
      message.append(
        createEl("span", "report-message-from", "Jake Holt"),
        document.createTextNode(`“${result.ending.message}”`)
      );
      outcome.appendChild(message);
    }

    const review = createEl("section", "report-review");
    review.appendChild(createEl("h3", "", "Field-by-field review"));
    const correctPerson = people.find((person) => person.id === answerKey.culprit)?.name || answerKey.culprit;
    const submittedPerson = people.find((person) => person.id === result.answers.culprit)?.name || "No answer";
    review.appendChild(resultRow(
      "Who",
      result.correctCulprit ? submittedPerson : `${submittedPerson} — correct: ${correctPerson}`,
      result.correctCulprit ? scoring.points.culprit : 0,
      scoring.points.culprit,
      result.correctCulprit
    ));
    const correctPlace = places.find((place) => place.id === answerKey.location)?.name || answerKey.location;
    const submittedPlace = places.find((place) => place.id === result.answers.location)?.name || "No answer";
    review.appendChild(resultRow(
      "Where",
      result.correctLocation ? submittedPlace : `${submittedPlace} — correct: ${correctPlace}`,
      result.correctLocation ? scoring.points.location : 0,
      scoring.points.location,
      result.correctLocation
    ));
    const correctWhen = `${answerKey.time.date}, ${answerKey.time.from}–${answerKey.time.to}`;
    const submittedWhen = `${result.answers.date}, ${result.answers.from}–${result.answers.to}`;
    review.appendChild(resultRow(
      "When",
      result.dateIsCorrect
        ? (result.timeIsCorrect ? submittedWhen : `${submittedWhen} — date is right; time is ${answerKey.time.from}–${answerKey.time.to}`)
        : `${submittedWhen} — correct: ${correctWhen}`,
      result.timePoints,
      scoring.points.time,
      result.timePoints === scoring.points.time
    ));
    for (const step of result.chainResults) {
      review.appendChild(resultRow(
        step.prompt,
        step.correct ? step.selected : `${step.selected} — correct: ${step.answer}`,
        step.points,
        scoring.points.chain / answerKey.chain.length,
        step.correct
      ));
    }
    for (const evidence of result.evidenceResults) {
      review.appendChild(resultRow(
        evidence.title,
        evidence.weight ? `Evidence weight: ${evidence.weight} points` : "No score weight",
        evidence.weight,
        evidence.weight,
        evidence.weight > 0
      ));
    }
    review.appendChild(resultRow(
      "Evidence total",
      `${result.evidenceResults.length} pieces selected`,
      result.evidencePoints,
      scoring.points.evidence,
      result.evidencePoints === scoring.points.evidence
    ));

    // The report is final: the review shows the answers, so it can't be edited and resent.
    const actions = createEl("div", "report-actions");
    const replay = createEl("button", "report-submit", "Replay case");
    replay.type = "button";
    replay.addEventListener("click", () => {
      if (!window.confirm("Replay this case from the beginning? All investigation progress for this case will be erased.")) return;
      try {
        localStorage.removeItem(`whoami:case:${caseInfo.id}:progress`);
        window.location.reload();
      } catch (error) {
        console.error("Could not reset case progress.", error);
      }
    });
    actions.append(replay);
    report.append(outcome, review, actions);
  }

  // Evidence found while the form is open is added to its list.
  onCaseEvent(report, "case-evidence-found", () => {
    if (report.querySelector(".report-form")) showForm();
  });

  if (window.CASE_PROGRESS.reportSubmission) showResult();
  else showForm();
}
