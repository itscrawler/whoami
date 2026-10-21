// WHOAMI — simulated case terminal

const TERMINAL_COMMANDS = [
  ["help [command]", "List commands or show help for one command."],
  ["clear", "Clear terminal output."],
  ["history", "Show commands entered in this session."],
  ["date", "Show the in-game date and time."],
  ["whoami", "Print WHOAMI."],
  ["exit", "Close the terminal window."],
  ["ls", "List files in the current virtual directory."],
  ["cd <folder>", "Change the current virtual directory."],
  ["cat <file>", "Print a downloaded text record."],
  ["open <file>", "Open a downloaded record in a viewer window."],
  ["download <file|all>", "Save records available in the current simulated session."],
  ["unzip <archive>", "Extract an unlocked archive."],
  ["vpn connect <node>", "Connect the simulated VPN tunnel."],
  ["vpn status", "Show simulated VPN status."],
  ["vpn disconnect", "Disconnect the simulated VPN tunnel."],
  ["lookup <name|number|email|vehicle>", "Search resident records."],
  ["breach search <email|username>", "Search the fictional public leak."],
  ["geoip <ip>", "Search case records for an IP location."],
  ["scan <target>", "Inspect a fictional target and show access requirements."],
  ["connect <target>", "Connect to a scanned target over the simulated VPN."],
  ["login <service> <account> <password>", "Check credentials found in case evidence."],
  ["logout", "End simulated account sessions."],
  ["disconnect", "Close the current target connection."],
  ["crack <archive> --wordlist mine", "Check your collected words against an archive clue."],
  ["wordlist add <word>", "Add a clue to your local in-game wordlist."],
  ["wordlist show", "List collected wordlist clues."],
  ["towers <number> [--date]", "Show an available cell-tower log."],
  ["calls", "Show downloaded call records."],
  ["sms", "Show downloaded text-message records."],
  ["hack phone", "Show the first step for simulated phone access."],
];

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
    history: [],
    historyIndex: null,
    vpnNode: null,
    scannedTargets: new Set(),
    connectedTargets: window.CASE_ACCESS.connectedTargets,
    sessions: window.CASE_ACCESS.sessions,
    wordlist: new Map(),
    downloaded: new Set(),
    crackedArchives: new Set(),
    extractedArchives: new Set(),
  };
  updatePrompt();

  write("WHOAMI CASE TERMINAL · SIMULATION ONLY");
  write('Type "help" to list commands.');

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const line = input.value.trim();
    if (!line) return;
    state.history.push(line);
    state.historyIndex = null;
    write(`${state.cwd} $ ${line}`, "terminal-command");
    input.value = "";
    execute(line);
  });

  input.addEventListener("keydown", (event) => {
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
    if (command === "rm" && rest.join(" ") === "-rf /") return write("you first");
    if (command === "hack" && rest[0]?.toLowerCase() === "phone") {
      return write("Phone access is simulated. Start with: scan phone");
    }
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
      const command = TERMINAL_COMMANDS.find(([syntax]) => {
        const name = syntax.replace(/<[^>]+>|\[[^\]]+\]/g, "").trim().toLowerCase();
        return name === requested || name.split(" ")[0] === requested;
      });
      if (!command) return write(`No help available for "${requested}".`, "terminal-error");
      return write(`${command[0]}\n${command[1]}`);
    }

    write("BASICS");
    for (const [syntax, description] of TERMINAL_COMMANDS.slice(0, 6)) write(`${syntax} — ${description}`);
    write("FILES");
    for (const [syntax, description] of TERMINAL_COMMANDS.slice(6, 12)) write(`${syntax} — ${description}`);
    write("VPN & SEARCH");
    for (const [syntax, description] of TERMINAL_COMMANDS.slice(12, 18)) write(`${syntax} — ${description}`);
    write("SIMULATED ACCESS");
    for (const [syntax, description] of TERMINAL_COMMANDS.slice(18, 24)) write(`${syntax} — ${description}`);
    write("WORDLIST & PHONE");
    for (const [syntax, description] of TERMINAL_COMMANDS.slice(24)) write(`${syntax} — ${description}`);
    write('Special: sudo, rm -rf /, hack phone. Use "help <command>" for details.');
  }

  function writeHistory() {
    if (!state.history.length) return write("No commands in history.");
    state.history.forEach((command, index) => write(`${index + 1}  ${command}`));
  }

  function evidenceList() {
    return caseData?.evidence || [];
  }

  function evidenceById(id) {
    return evidenceList().find((evidence) => evidence.id === id);
  }

  function evidenceFileName(evidence) {
    return evidence.content?.name || `${evidence.id}.txt`;
  }

  function isLoggedIn(access) {
    if (access.type !== "login") return false;
    for (const session of state.sessions.values()) {
      const sameService = serviceMatches(session.service, access.service);
      const sameAccount = !access.account || normalize(session.account) === normalize(access.account);
      if (sameService && sameAccount) return true;
    }
    return false;
  }

  function isAvailable(evidence) {
    const access = evidence.access || {};
    if (access.type === "public" || access.type === "client") return true;
    if (access.type === "hack") return state.connectedTargets.has(access.target);
    if (access.type === "login") return isLoggedIn(access);
    if (access.type === "restore") {
      return state.downloaded.has(access.from) || state.extractedArchives.has(access.from);
    }
    if (access.type === "decrypt") return state.crackedArchives.has(access.file);
    return false;
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

  function changeDirectory(folder) {
    if (!folder || folder === "~") {
      state.cwd = "/home/whoami";
      updatePrompt();
      return write(state.cwd);
    }
    if (folder === "..") {
      state.cwd = state.cwd.substring(0, state.cwd.lastIndexOf("/")) || "/";
      updatePrompt();
      return write(state.cwd);
    }
    const path = folder.startsWith("/")
      ? folder.replace(/\/+$/, "") || "/"
      : `${state.cwd}/${folder}`.replace(/\/+$/, "");
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
    if (!isTextEvidence(evidence)) return write("This record is structured. Use open <file> to view it.");
    write(formatEvidence(evidence));
  }

  function openFile(name) {
    if (state.cwd !== "/home/whoami/downloads") {
      return write("Use cd downloads to enter the downloads folder.");
    }
    const evidence = findDownloadedFile(name);
    if (!evidence) return write(`file not found: ${name || "(missing filename)"}`, "terminal-error");
    openAuxiliaryWindow({
      id: `terminal-file-${evidence.id}`,
      name: evidence.title || evidenceFileName(evidence),
      subtitle: "/ downloaded record",
      width: 620,
      height: 440,
      render(viewer) {
        const content = createEl("pre", "terminal-file-viewer", formatEvidence(evidence));
        viewer.appendChild(content);
      },
    });
    write(`Opened ${evidence.title || evidenceFileName(evidence)} in a viewer window.`);
  }

  function download(name) {
    if (!name) return write("Usage: download <file|all>", "terminal-error");
    const candidates = evidenceList().filter(isAvailable);
    if (normalize(name) === "all") {
      const scoped = candidates.filter((evidence) => {
        const access = evidence.access || {};
        return (
          (access.type === "hack" && state.connectedTargets.has(access.target)) ||
          (access.type === "login" && isLoggedIn(access))
        );
      });
      if (!scoped.length) return write("No records available. Connect to a target or log in first.");
      scoped.forEach((evidence) => saveEvidence(evidence));
      return write(`Downloaded ${scoped.length} record(s) to ~/downloads.`);
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
      if (node !== "TAC-07") return write(`Unknown node: ${args[1]}. Available node: TAC-07.`, "terminal-error");
      state.vpnNode = node;
      return write(`VPN connected · NODE ${node}`);
    }
    write("Usage: vpn connect <node> | vpn status | vpn disconnect", "terminal-error");
  }

  function targetName(value) {
    const aliases = { phone: "carrier", police: "tacoma-pd-archive" };
    const normalized = normalize(value);
    return aliases[normalized] || normalized;
  }

  function hackTargets() {
    return [...new Set(evidenceList()
      .filter((evidence) => evidence.access?.type === "hack")
      .map((evidence) => evidence.access.target)
      .filter(Boolean))];
  }

  function scan(value) {
    const target = targetName(value);
    if (!target) return write("Usage: scan <target>", "terminal-error");
    if (!hackTargets().includes(target)) {
      return write(`No simulated target named "${value}" in this case.`, "terminal-error");
    }
    state.scannedTargets.add(target);
    write(`SCAN ${target.toUpperCase()} · case simulation`);
    write("need: vpn connect TAC-07");
    write("need: connect target after the VPN tunnel is active");
  }

  function connect(value) {
    const target = targetName(value);
    if (!target) return write("Usage: connect <target>", "terminal-error");
    if (!hackTargets().includes(target)) return write(`Unknown simulated target: ${value}`, "terminal-error");
    if (!state.scannedTargets.has(target)) return write(`too risky. start with: scan ${target}`);
    if (!state.vpnNode) return write("too risky. need: VPN connection. Use vpn connect TAC-07.");
    state.connectedTargets.add(target);
    write(`Connected to ${target}. Available case records can now be downloaded.`);
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
    write(`Signed in to ${service} as ${account}.`);
    window.notifyAccessChange();
  }

  function breachSearch(query) {
    if (!query) return write("Usage: breach search <email|username>", "terminal-error");
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
    if (!query) return write("Usage: lookup <name|number|email|vehicle>", "terminal-error");
    const normalized = normalize(query);
    const people = caseData?.people || [];
    const matches = people.filter((person) => {
      const fields = [person.name, person.phone, person.email, person.car, person.record?.id, person.record?.address];
      return fields.some((value) => value && normalize(value).includes(normalized));
    });
    if (!matches.length) return write("No resident records found.");
    matches.forEach((person) => {
      write(`${person.name} · ${person.role || person.type || "Resident"}`);
      if (person.phone) write(`  phone: ${person.phone}`);
      if (person.email) write(`  email: ${person.email}`);
      if (person.car) write(`  vehicle: ${person.car}`);
    });
  }

  function geoip(ip) {
    if (!ip) return write("Usage: geoip <ip>", "terminal-error");
    const text = evidenceList().map((evidence) => JSON.stringify(evidence.content || {})).join(" ");
    const exists = text.includes(ip);
    if (!exists) return write(`No case location record found for ${ip}.`);
    write(`IP ${ip} appears in case records. No more precise location data is available.`);
  }

  function addWord(word) {
    if (!word) return write("Usage: wordlist add <word>", "terminal-error");
    state.wordlist.set(normalize(word), word);
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
    if (!state.wordlist.has(normalize(record.access.password))) {
      return write("No match in your wordlist. Collect a clue, then use wordlist add <word>.");
    }
    state.crackedArchives.add(normalize(archive));
    write(`MATCH · archive unlocked with a word from your wordlist.`);
  }

  function towers(args) {
    if (!args.length) return write("Usage: towers <number> [--date]", "terminal-error");
    const number = args.filter((argument) => argument !== "--date").join(" ");
    const evidence = evidenceList().find((entry) =>
      entry.content?.type === "log" &&
      entry.content.number === number &&
      (entry.content.entries || []).some((record) => record.tower)
    );
    if (!evidence || !state.downloaded.has(evidence.id)) {
      return write("No downloaded tower log for that number. Scan and connect to the carrier target first.");
    }
    for (const entry of evidence.content.entries || []) {
      if (entry.tower) write(`${entry.time} · ${entry.tower}`);
    }
  }

  function messages(kind) {
    const chats = [...state.downloaded]
      .map(evidenceById)
      .filter((evidence) => {
        if (kind === "sms") return evidence?.app === "phone" && evidence.content?.type === "chat";
        return evidence?.content?.type === "callLog" || evidence?.content?.type === "calls";
      });
    if (!chats.length) return write(`No downloaded ${kind} records. Download an available phone record first.`);
    for (const evidence of chats) {
      write(evidence.title);
      for (const record of evidence.content.messages || evidence.content.entries || []) {
        const details = record.text
          ? `${record.from}: ${record.text}`
          : JSON.stringify(record);
        write(`${record.time || ""} ${details}`.trim());
      }
    }
  }

  function isTextEvidence(evidence) {
    return ["text", "dataLeak", "email", "note", "statement", "chat"].includes(evidence.content?.type);
  }

  function formatEvidence(evidence) {
    return JSON.stringify(evidence.content || {}, null, 2);
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

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function sameFileName(first, second) {
  const clean = (value) => normalize(value).replace(/\s+\((?:encrypted|unlocked)\)$/, "");
  return clean(first) === clean(second);
}

function serviceMatches(first, second) {
  const aliases = new Set([normalize(first), normalize(second)]);
  return aliases.size === 1 || (aliases.has("google") && aliases.has("gmail"));
}
