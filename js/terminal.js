// WHOAMI — simulated case terminal

// [group, syntax, description]; "help" prints the groups in this order.
const TERMINAL_COMMANDS = [
  ["BASICS", "help [command]", "List commands or show help for one command."],
  ["BASICS", "clear", "Clear terminal output."],
  ["BASICS", "history", "Show commands entered in this session."],
  ["BASICS", "date", "Show the in-game date and time."],
  ["BASICS", "whoami", "Print WHOAMI."],
  ["BASICS", "exit", "Close the terminal window."],
  ["FILES", "ls", "List files in the current virtual directory."],
  ["FILES", "cd <folder>", "Change the current virtual directory."],
  ["FILES", "cat <file>", "Print a downloaded text record."],
  ["FILES", "open <file>", "Open a downloaded record in a viewer window."],
  ["FILES", "download <file|all>", "Save records available in the current simulated session."],
  ["FILES", "unzip <archive>", "Extract an unlocked archive."],
  ["VPN & SEARCH", "vpn connect <node>", "Connect the simulated VPN tunnel."],
  ["VPN & SEARCH", "vpn status", "Show simulated VPN status."],
  ["VPN & SEARCH", "vpn disconnect", "Disconnect the simulated VPN tunnel."],
  ["VPN & SEARCH", "lookup <name|number|email|vehicle>", "Search resident records."],
  ["VPN & SEARCH", "breach search <email|username>", "Search the fictional public leak."],
  ["VPN & SEARCH", "geoip <ip>", "Search case records for an IP location."],
  ["SIMULATED ACCESS", "scan [target]", "List targets you have leads for, or inspect one and show what it needs."],
  ["SIMULATED ACCESS", "connect <target>", "Connect to a scanned target over the simulated VPN."],
  ["SIMULATED ACCESS", "login <service> <account> <password>", "Check credentials found in case evidence."],
  ["SIMULATED ACCESS", "logout", "End simulated account sessions."],
  ["SIMULATED ACCESS", "disconnect", "Close the current target connection."],
  ["SIMULATED ACCESS", "hack [target]", "Show a hint for the simulated access flow."],
  ["WORDLIST & PHONE", "crack <archive> --wordlist mine", "Check your collected words, alone and in pairs, against an archive."],
  ["WORDLIST & PHONE", "wordlist add <word>", "Add a clue to your local in-game wordlist."],
  ["WORDLIST & PHONE", "wordlist show", "List collected wordlist clues."],
  ["WORDLIST & PHONE", "towers <number> [--date YYYY-MM-DD]", "Show an available cell-tower log."],
  ["WORDLIST & PHONE", "sms", "Show downloaded text-message records."],
];

// Most residents a lookup prints at once; a broader query has to be narrowed down.
const LOOKUP_MAX_RESULTS = 5;

function renderTerminal(container) {
  const terminal = createEl("div", "terminal-app");
  const output = createEl("div", "terminal-output");
  output.setAttribute("role", "log");
  output.setAttribute("aria-label", "Terminal output");

  const form = createEl("form", "terminal-form");
  const prompt = createEl("label", "terminal-prompt");
  const input = createEl("input", "terminal-input");
  input.type = "text";
  input.autocomplete = "off";
  input.spellcheck = false;
  input.setAttribute("aria-label", "Terminal command");
  form.append(prompt, input);
  terminal.append(output, form);
  container.appendChild(terminal);

  const state = {
    cwd: "/home/whoami",
    history: window.CASE_PROGRESS.terminalHistory,
    historyIndex: null,
    get vpnNode() {
      return window.CASE_ACCESS.vpnNode;
    },
    set vpnNode(value) {
      window.CASE_ACCESS.vpnNode = value;
    },
    scannedTargets: window.CASE_ACCESS.scannedTargets,
    connectedTargets: window.CASE_ACCESS.connectedTargets,
    sessions: window.CASE_ACCESS.sessions,
    wordlist: window.CASE_PROGRESS.wordlist,
    downloaded: window.CASE_PROGRESS.downloaded,
    crackedArchives: window.CASE_PROGRESS.crackedArchives,
    extractedArchives: window.CASE_PROGRESS.extractedArchives,
  };
  updatePrompt();

  write("WHOAMI CASE TERMINAL · SIMULATION ONLY");
  write('Type "help" to list commands.');

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const line = input.value.trim();
    if (!line) return;
    state.history.push(line);
    saveCaseProgress();
    state.historyIndex = null;
    write(`${state.cwd} $ ${line}`, "terminal-command");
    input.value = "";
    execute(line);
  });

  input.addEventListener("keydown", (event) => {
    if (event.key.length === 1 || event.key === "Backspace" || event.key === "Enter") playSound("key");
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!state.history.length) return;
      state.historyIndex = state.historyIndex === null
        ? state.history.length - 1
        : Math.max(0, state.historyIndex - 1);
      input.value = state.history[state.historyIndex];
    } else if (event.key === "ArrowDown" && state.historyIndex !== null) {
      event.preventDefault();
      state.historyIndex += 1;
      if (state.historyIndex >= state.history.length) {
        state.historyIndex = null;
        input.value = "";
      } else {
        input.value = state.history[state.historyIndex];
      }
    }
  });

  function write(text, kind = "") {
    if (kind === "terminal-error") playSound("error");
    const line = createEl("div", `terminal-line ${kind}`.trim(), text);
    output.appendChild(line);
    output.scrollTop = output.scrollHeight;
  }

  function updatePrompt() {
    prompt.textContent = `WHOAMI@CASE:${state.cwd.replace("/home/whoami", "~")}$`;
  }

  function execute(line) {
    const args = tokenize(line);
    if (!args.length) return;
    const command = args[0].toLowerCase();
    const rest = args.slice(1);

    if (command === "help") return showHelp(rest);
    if (command === "clear") {
      output.replaceChildren();
      return;
    }
    if (command === "history") return writeHistory();
    if (command === "date") return write(document.getElementById("game-clock").textContent);
    if (command === "whoami") return write("WHOAMI");
    if (command === "exit") return closeWindow("terminal");
    if (command === "sudo") return write("nice try");
    if (command === "rm" && rest.some((arg) => /^-[a-z]*r[a-z]*f|^-[a-z]*f[a-z]*r/i.test(arg))) return write("you first");
    if (command === "hack") return hackHint(rest.join(" "));
    if (command === "ls") return listFiles();
    if (command === "cd") return changeDirectory(rest[0]);
    if (command === "cat") return catFile(rest.join(" "));
    if (command === "open") return openFile(rest.join(" "));
    if (command === "download") return download(rest.join(" "));
    if (command === "unzip") return unzip(rest.join(" "));
    if (command === "vpn") return vpn(rest);
    if (command === "lookup") return lookup(rest.join(" "));
    if (command === "breach" && rest[0]?.toLowerCase() === "search") {
      return breachSearch(rest.slice(1).join(" "));
    }
    if (command === "geoip") return geoip(rest[0]);
    if (command === "scan") return scan(rest.join(" "));
    if (command === "connect") return connect(rest.join(" "));
    if (command === "login") return login(rest);
    if (command === "logout") {
      state.sessions.clear();
      window.notifyAccessChange();
      return write("Account sessions closed.");
    }
    if (command === "disconnect") {
      const targets = [...state.connectedTargets];
      state.connectedTargets.clear();
      window.notifyAccessChange();
      return write(targets.length ? `Disconnected: ${targets.join(", ")}` : "No target connected.");
    }
    if (command === "crack") return crack(rest);
    if (command === "wordlist" && rest[0]?.toLowerCase() === "add") {
      return addWord(rest.slice(1).join(" "));
    }
    if (command === "wordlist" && rest[0]?.toLowerCase() === "show") {
      return write(state.wordlist.size ? [...state.wordlist.values()].join("\n") : "Wordlist is empty.");
    }
    if (command === "towers") return towers(rest);
    if (command === "calls" || command === "sms") return messages(command);

    write(`command not found: ${command}. Type "help" for available commands.`, "terminal-error");
  }

  function showHelp(args) {
    if (args.length) {
      const requested = args.join(" ").toLowerCase();
      const command = TERMINAL_COMMANDS.find(([, syntax]) => {
        const name = syntax.replace(/<[^>]+>|\[[^\]]+\]/g, "").trim().toLowerCase();
        return name === requested || name.split(" ")[0] === requested;
      });
      if (!command) return write(`No help available for "${requested}".`, "terminal-error");
      return write(`${command[1]}\n${command[2]}`);
    }

    for (const group of new Set(TERMINAL_COMMANDS.map(([name]) => name))) {
      write(group);
      for (const [name, syntax, description] of TERMINAL_COMMANDS) {
        if (name === group) write(`${syntax} — ${description}`);
      }
    }
    write('Special: sudo, rm -rf /, hack. Use "help <command>" for details.');
  }

  function writeHistory() {
    if (!state.history.length) return write("No commands in history.");
    state.history.forEach((command, index) => write(`${index + 1}  ${command}`));
  }

  function evidenceList() {
    return caseData?.evidence || [];
  }

  function listFiles() {
    const entries = state.cwd === "/"
      ? ["home/", "tmp/"]
      : state.cwd === "/home"
        ? ["whoami/"]
        : state.cwd === "/home/whoami"
          ? ["downloads/"]
          : state.cwd === "/home/whoami/downloads"
            ? downloadedNames()
            : [];
    write(entries.length ? entries.join("\n") : "(empty)");
  }

  function downloadedNames() {
    const names = [];
    for (const id of state.downloaded) {
      const evidence = evidenceById(id);
      if (evidence) names.push(evidenceFileName(evidence));
      if (evidence?.content?.type === "trash") {
        names.push(...(evidence.content.contains || []).map((entry) => {
          const name = entry.split("/").pop();
          return sameFileName(name, "backup_veridia.zip") &&
            state.crackedArchives.has("backup_veridia.zip")
            ? "backup_veridia.zip (unlocked)"
            : name;
        }));
      }
    }
    return [...new Set(names)].sort();
  }

  // Resolves "~", ".", ".." and relative or absolute paths against the current folder.
  function resolvePath(folder) {
    const expanded = folder.replace(/^~(?=\/|$)/, "/home/whoami");
    const parts = expanded.startsWith("/")
      ? expanded.split("/")
      : [...state.cwd.split("/"), ...expanded.split("/")];
    const resolved = [];
    for (const part of parts) {
      if (!part || part === ".") continue;
      if (part === "..") resolved.pop();
      else resolved.push(part);
    }
    return `/${resolved.join("/")}`;
  }

  function changeDirectory(folder) {
    const path = resolvePath(folder || "~");
    if (["/", "/home", "/home/whoami", "/home/whoami/downloads", "/tmp"].includes(path)) {
      state.cwd = path;
      updatePrompt();
      return write(state.cwd);
    }
    write(`directory not found: ${folder}`, "terminal-error");
  }

  function findDownloadedFile(name) {
    const requested = normalize(name);
    if (!requested) return null;
    for (const id of state.downloaded) {
      const evidence = evidenceById(id);
      if (!evidence) continue;
      if ([evidenceFileName(evidence), evidence.id, evidence.title].some((value) => normalize(value) === requested)) {
        return evidence;
      }
    }
    for (const id of state.downloaded) {
      const trash = evidenceById(id);
      if (trash?.content?.type !== "trash") continue;
      const contained = (trash.content.contains || []).find((entry) =>
        sameFileName(entry.split("/").pop(), name)
      );
      if (contained) {
        const derived = evidenceList().find((evidence) =>
          evidence.access?.type === "restore" && evidence.access.from === trash.id
        );
        if (derived && normalize(derived.title) === requested) return derived;
        if (sameFileName(contained, name)) {
          return { id: "backup_veridia.zip", title: "backup_veridia.zip", content: { type: "archive" } };
        }
      }
    }
    for (const archiveId of state.extractedArchives) {
      const evidence = evidenceById(archiveId);
      if (evidence && normalize(evidence.content?.name) === requested) return evidence;
    }
    return null;
  }

  function catFile(name) {
    if (state.cwd !== "/home/whoami/downloads") {
      return write("Use cd downloads to enter the downloads folder.");
    }
    const evidence = findDownloadedFile(name);
    if (!evidence) return write(`file not found: ${name || "(missing filename)"}`, "terminal-error");
    if (!evidence.content || evidence.content.type === "archive") return write("Binary archive. Use crack or unzip.");
    if (["photo", "video"].includes(evidence.content.type)) return write("Binary file. Use open <file> to view it.");
    window.markEvidenceFound(evidence.id);
    write(formatEvidenceText(evidence));
  }

  function openFile(name) {
    if (state.cwd !== "/home/whoami/downloads") {
      return write("Use cd downloads to enter the downloads folder.");
    }
    const evidence = findDownloadedFile(name);
    if (!evidence) return write(`file not found: ${name || "(missing filename)"}`, "terminal-error");
    if (!evidenceById(evidence.id)) return write("Encrypted archive. Use crack, then unzip.");
    openEvidenceViewer(evidence, "/ downloaded record");
    write(`Opened ${evidenceFileName(evidence)} in a viewer window.`);
  }

  function download(name) {
    if (!name) return write("Usage: download <file|all>", "terminal-error");
    const candidates = evidenceList().filter(isEvidenceAvailable);
    if (normalize(name) === "all") {
      const scoped = candidates.filter((evidence) => {
        const access = evidence.access || {};
        return (
          access.type === "hack" ||
          access.type === "login"
        );
      });
      if (!scoped.length) return write("No records available. Connect to a target or log in first.");
      const fresh = scoped.filter((evidence) => !state.downloaded.has(evidence.id));
      if (!fresh.length) return write("Every available record is already in ~/downloads.");
      fresh.forEach((evidence) => saveEvidence(evidence));
      return write(`Downloaded ${fresh.length} new record(s) to ~/downloads.`);
    }

    const evidence = candidates.find((entry) =>
      [entry.id, entry.title, evidenceFileName(entry)].some((value) => normalize(value) === normalize(name))
    );
    if (evidence) {
      saveEvidence(evidence);
      return write(`Downloaded ${evidenceFileName(evidence)} to ~/downloads.`);
    }
    if (sameFileName(name, "backup_veridia.zip") && archiveInDownloads()) {
      return write("Archive is encrypted. Use crack backup_veridia.zip --wordlist mine after collecting a clue.");
    }
    write(`No available record matches "${name}".`, "terminal-error");
  }

  function saveEvidence(evidence) {
    state.downloaded.add(evidence.id);
    window.markEvidenceFound(evidence.id);
    saveCaseProgress();
    window.dispatchEvent(new Event("case-files-change"));
  }

  function archiveInDownloads() {
    return downloadedNames().some((name) => sameFileName(name, "backup_veridia.zip"));
  }

  function unzip(name) {
    const archiveName = normalize(name);
    if (!sameFileName(archiveName, "backup_veridia.zip")) return write(`archive not found: ${name}`, "terminal-error");
    if (!archiveInDownloads()) {
      return write("Archive not found. Sign in to the account and download the deleted folder first.");
    }
    if (!state.crackedArchives.has(archiveName)) {
      return write("Archive is encrypted. Use crack backup_veridia.zip --wordlist mine.");
    }
    const evidence = evidenceList().find((entry) => entry.access?.type === "decrypt" && normalize(entry.access.file) === archiveName);
    if (!evidence) return write("No extraction record is attached to this archive.", "terminal-error");
    state.extractedArchives.add(evidence.id);
    state.downloaded.add(evidence.id);
    window.markEvidenceFound(evidence.id);
    saveCaseProgress();
    window.dispatchEvent(new Event("case-files-change"));
    write(`Extracted ${evidence.content?.name || evidence.title} to ~/downloads.`);
  }

  function vpn(args) {
    const action = args[0]?.toLowerCase();
    if (action === "status") {
      return write(state.vpnNode ? `VPN connected · NODE ${state.vpnNode}` : "VPN disconnected.");
    }
    if (action === "disconnect") {
      state.vpnNode = null;
      state.connectedTargets.clear();
      window.notifyAccessChange();
      return write("VPN disconnected. Target connections closed.");
    }
    if (action === "connect" && args[1]) {
      const node = args[1].toUpperCase();
      if (node !== "NYC-07") return write(`Unknown node: ${args[1]}. Available node: NYC-07.`, "terminal-error");
      state.vpnNode = node;
      window.notifyAccessChange();
      return write(`VPN connected · NODE ${node}`);
    }
    write("Usage: vpn connect <node> | vpn status | vpn disconnect", "terminal-error");
  }

  function targetName(value) {
    const aliases = { phone: "carrier", police: "nypd-archive" };
    const normalized = normalize(value);
    return aliases[normalized] || normalized;
  }

  function hackTargets() {
    return [...new Set(evidenceList()
      .filter((evidence) => evidence.access?.type === "hack")
      .map((evidence) => evidence.access.target)
      .filter(Boolean))];
  }

  function targetEvidence(target) {
    return evidenceList().filter((evidence) => evidence.access?.type === "hack" && evidence.access.target === target);
  }

  // A target shows up once the player has a lead for at least one of its records.
  function knownTargets() {
    return hackTargets().filter((target) => targetEvidence(target).some(evidenceLeadsFound));
  }

  function aliasFor(target) {
    return { carrier: "phone", "nypd-archive": "police" }[target];
  }

  function scan(value) {
    if (!normalize(value)) {
      const targets = knownTargets();
      if (!targets.length) return write("No known targets. Find a lead first: a profile, an account, a number.");
      write("KNOWN TARGETS");
      for (const target of targets) {
        const alias = aliasFor(target);
        write(`  ${target}${alias ? ` (alias: ${alias})` : ""}`);
      }
      return write("Use scan <target> for details.");
    }
    const target = targetName(value);
    if (!hackTargets().includes(target)) {
      return write(`No simulated target named "${value}" in this case.`, "terminal-error");
    }
    state.scannedTargets.add(target);
    saveCaseProgress();
    const records = targetEvidence(target);
    const reachable = records.filter(evidenceLeadsFound);
    const steps = [...new Set(records.flatMap((evidence) => evidence.needs || []))];
    write(`SCAN ${target.toUpperCase()} · case simulation`);
    for (const step of steps) write(`  [${stepDone(step, target) ? "x" : " "}] ${step}`);
    write(`records you have leads for: ${reachable.length}/${records.length}`);
    if (reachable.length < records.length) write("Some records need a lead you haven't found yet.");
  }

  // Checks one "needs" step from evidence.json against the current terminal state.
  function stepDone(step, target) {
    const [verb, , argument] = step.split(" ");
    if (verb === "vpn") return Boolean(state.vpnNode);
    if (verb === "scan") return state.scannedTargets.has(target);
    if (verb === "connect") return state.connectedTargets.has(target);
    return Boolean(argument);
  }

  // "hack <target>": the case's own hint for that target, only once the player has a lead for it.
  function hackHint(value) {
    if (!normalize(value)) {
      return write("This is a case simulation. Flow: scan → vpn connect <node> → connect <target> → download. Try: scan");
    }
    const target = targetName(value);
    const hints = targetEvidence(target).filter(evidenceLeadsFound).map((evidence) => evidence.hint).filter(Boolean);
    if (!hints.length) return write(`Nothing to go on for "${value}" yet. Start with: scan`);
    for (const hint of [...new Set(hints)]) write(`hint: ${hint}`);
  }

  function connect(value) {
    const target = targetName(value);
    if (!target) return write("Usage: connect <target>", "terminal-error");
    if (!hackTargets().includes(target)) return write(`Unknown simulated target: ${value}`, "terminal-error");
    if (!state.scannedTargets.has(target)) return write(`too risky. start with: scan ${target}`);
    if (!state.vpnNode) return write("too risky. need: VPN connection. Use vpn connect NYC-07.");
    state.connectedTargets.add(target);
    const reachable = targetEvidence(target).filter(evidenceLeadsFound);
    playSound("success");
    write(`Connected to ${target}.`);
    if (!reachable.length) write("Nothing here you know how to look for yet. Find a lead first.");
    for (const evidence of reachable) write(`  ${evidenceFileName(evidence)}`);
    if (reachable.length) write("Use download <file> or download all.");
    window.notifyAccessChange();
  }

  function login(args) {
    if (args.length < 3) return write("Usage: login <service> <account> <password>", "terminal-error");
    const [service, account, password] = args;
    const normalizedService = normalize(service);
    const matching = evidenceList().filter((evidence) => {
      const access = evidence.access || {};
      return (
        access.type === "login" &&
        serviceMatches(normalizedService, access.service) &&
        (!access.account || normalize(access.account) === normalize(account))
      );
    });
    if (!matching.length) return write(`No account for ${service} ${account} in this case.`, "terminal-error");
    const knownPasswords = evidenceList()
      .filter((evidence) => evidence.access?.type === "login" &&
        serviceMatches(normalizedService, evidence.access.service) &&
        (!evidence.access.account || normalize(evidence.access.account) === normalize(account)) &&
        evidence.access.password)
      .map((evidence) => evidence.access.password);
    if (!knownPasswords.length || !knownPasswords.includes(password)) {
      return write("Login failed. Find the account credentials in case evidence.", "terminal-error");
    }
    state.sessions.set(`${normalizedService}:${normalize(account)}`, {
      service: normalizedService,
      account,
    });
    playSound("success");
    write(`Signed in to ${service} as ${account}.`);
    window.notifyAccessChange();
  }

  function breachSearch(query) {
    if (!normalize(query)) return write("Usage: breach search <email|username>", "terminal-error");
    const leak = evidenceList().find((evidence) =>
      evidence.content?.type === "dataLeak" &&
      ["email", "username"].some((field) =>
        normalize(evidence.content.match?.[field]).includes(normalize(query))
      )
    );
    if (!leak) return write(`No leak record matches "${query}".`);
    saveEvidence(leak);
    write(`MATCH · ${leak.content.name}`);
    write(`username: ${leak.content.match.username}`);
    write(`email: ${leak.content.match.email}`);
    write(`password: ${leak.content.match.password}`);
    write("Saved the fictional leak record to ~/downloads.");
  }

  function lookup(query) {
    if (!normalize(query)) return write("Usage: lookup <name|number|email|vehicle>", "terminal-error");
    const normalized = normalize(query);
    const people = (caseData?.people || []).filter(isCityResident); // same registry as the Database app
    const matches = people.filter((person) => {
      const fields = [person.name, person.phone, person.email, person.car, person.record?.id, person.address];
      return phoneMatches(person.phone, query) ||
        fields.some((value) => value && normalize(value).includes(normalized));
    });
    if (!matches.length) return write("No resident records found.");
    if (matches.length > LOOKUP_MAX_RESULTS) {
      return write(`${matches.length} residents match "${query}". Narrow the search.`);
    }
    matches.forEach((person) => {
      window.markPersonFound(person.id);
      write(`${person.name} · ${person.record?.id || "—"} · ${person.record?.address || "address unknown"}`);
      if (person.phone) write(`  phone: ${person.phone}`);
      if (person.email) write(`  email: ${person.email}`);
      if (person.car) write(`  vehicle: ${person.car}`);
    });
  }

  function geoip(ip) {
    if (!ip) return write("Usage: geoip <ip>", "terminal-error");
    if (!/^(\d{1,3})(\.\d{1,3}){3}$/.test(ip) || ip.split(".").some((part) => Number(part) > 255)) {
      return write(`Not an IPv4 address: ${ip}`, "terminal-error");
    }
    const text = evidenceList().map((evidence) => JSON.stringify(evidence.content || {})).join(" ");
    const exists = new RegExp(`(^|[^\\d.])${ip.replace(/\./g, "\\.")}($|[^\\d.])`).test(text);
    if (!exists) return write(`No case location record found for ${ip}.`);
    write(`IP ${ip} appears in case records. No more precise location data is available.`);
  }

  function addWord(word) {
    if (!word) return write("Usage: wordlist add <word>", "terminal-error");
    state.wordlist.set(normalize(word), word);
    saveCaseProgress();
    write(`Added clue to mine wordlist: ${word}`);
  }

  function crack(args) {
    const archive = args[0];
    if (!archive || args[1] !== "--wordlist" || args[2] !== "mine") {
      return write("Usage: crack <archive> --wordlist mine", "terminal-error");
    }
    if (!sameFileName(archive, "backup_veridia.zip") || !archiveInDownloads()) {
      return write("Archive not found in ~/downloads.", "terminal-error");
    }
    const record = evidenceList().find((evidence) =>
      evidence.access?.type === "decrypt" && normalize(evidence.access.file) === normalize(archive)
    );
    if (!record) return write("No matching archive record in this case.", "terminal-error");
    if (!wordlistCandidates().has(normalize(record.access.password))) {
      return write("No match in your wordlist. Collect a clue, then use wordlist add <word>.");
    }
    state.crackedArchives.add(normalize(archive));
    saveCaseProgress();
    window.dispatchEvent(new Event("case-files-change"));
    write(`MATCH · archive unlocked with a word from your wordlist.`);
  }

  // Every word on its own and every pair of words joined together, spaces ignored:
  // "Biscuit" + "2011" also tries "biscuit2011" and "2011biscuit".
  function wordlistCandidates() {
    const words = [...state.wordlist.keys()].map((word) => word.replace(/\s+/g, ""));
    const candidates = new Set(words);
    for (const first of words) {
      for (const second of words) {
        if (first !== second) candidates.add(first + second);
      }
    }
    return candidates;
  }

  function towers(args) {
    if (!args.length) return write("Usage: towers <number> [--date YYYY-MM-DD]", "terminal-error");
    const dateFlag = args.indexOf("--date");
    const date = dateFlag < 0 ? null : args[dateFlag + 1];
    if (dateFlag >= 0 && (!date || !isValidDate(date))) {
      return write("Usage: towers <number> [--date YYYY-MM-DD]", "terminal-error");
    }
    const number = args.slice(0, dateFlag < 0 ? args.length : dateFlag).join(" ");
    if (!number) return write("Usage: towers <number> [--date YYYY-MM-DD]", "terminal-error");
    const evidence = evidenceList().find((entry) =>
      entry.content?.type === "log" &&
      digitsOnly(entry.content.number) === digitsOnly(number) &&
      (entry.content.entries || []).some((record) => record.tower)
    );
    if (!evidence || !state.downloaded.has(evidence.id)) {
      return write("No downloaded tower log for that number. Scan and connect to the carrier target first.");
    }
    const entries = (evidence.content.entries || []).filter((entry) =>
      entry.tower && (!date || entry.time?.startsWith(date))
    );
    if (!entries.length) return write(`No tower entries found${date ? ` for ${date}` : ""}.`);
    for (const entry of entries) {
      write(`${formatEvidenceTime(entry.time)} · ${entry.tower}`);
    }
  }

  function messages(kind) {
    const chats = [...state.downloaded]
      .map(evidenceById)
      .filter((evidence) => {
        if (kind === "sms") return evidence?.app === "phone" && evidence.content?.type === "chat";
        return evidence?.content?.type === "callLog" || evidence?.content?.type === "calls";
      });
    if (!chats.length && kind === "calls") return write("No call records found.");
    if (!chats.length) return write(`No downloaded ${kind} records. Download an available phone record first.`);
    for (const evidence of chats) {
      write(evidence.title);
      for (const record of evidence.content.messages || evidence.content.entries || []) {
        const details = record.text
          ? `${personName(record.from)}: ${record.text}`
          : record.event || JSON.stringify(record);
        write(`${formatEvidenceTime(record.time)} ${details}`.trim());
      }
    }
  }

}

function tokenize(line) {
  const tokens = line.match(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[^\s]+/g) || [];
  return tokens.map((token) => {
    if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
      return token.slice(1, -1);
    }
    return token;
  });
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function sameFileName(first, second) {
  const clean = (value) => normalize(value).replace(/\s+\((?:encrypted|unlocked)\)$/, "");
  return clean(first) === clean(second);
}

