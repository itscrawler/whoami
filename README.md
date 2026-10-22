# WHO AM I?

A browser-based hacker detective game.

You play as **WHOAMI** — an anonymous hacker who takes jobs on closed forums. People come to you with cold cases the police gave up on years ago. You get a computer screen and nothing else: databases, email, phone records, maps, street cameras, social media. No hints, no "find" buttons. You type the commands, you search the records, you connect the dots — and you name the person who did it.

## Features

- **A fake desktop OS** — apps open as movable, overlapping windows (database, mail, browser, phone, map, cameras, terminal, and more). Map locations, tower signals, routes, and cameras unlock as evidence is found.
- **A simulated phone** — browse messages, calls, apps, steps, photos, social posts, email and device records; unlock private records through in-game terminal access.
- **A local file explorer** — browse the hacker's folders, view downloaded case evidence, and inspect recovered archive files.
- **An evidence board** — every found record lands on it automatically with a "new evidence" notice; connect cards with player-made threads, and choose evidence for the final report.
- **Mail that moves with the case** — the client writes again as you uncover things, and replies after you file the report.
- **A live case map** — places, cell towers, the phone route and cameras appear as evidence is found; click a marker for details and related records.
- **A shared handbook** — six help topics (including "If stuck") and a command reference loaded from case-independent JSON.
- **Leads before access** — terminal targets only give up their records once you have a lead (an opened dossier, a found record).
- **Synthesized sound and hotkeys** — interface sounds and a background hum made with Web Audio (no audio files); 1–9/0 open apps, Esc closes a window.
- **A case-limited web** — search fictional public pages in Dorne without access to the wider internet.
- **Fully manual investigation** — every search, every login, every password is on you. How-tos live in an in-game handbook, not in tooltips.
- **A living database** — not just suspects: every resident of the city can be looked up, and some of them know more than they think.
- **Saved case progress** — discovered evidence, resident dossiers, unlocked access, downloads, and open apps persist in browser storage.
- **Fictional cases in real places** — real US cities, fictional service brands, fictional people and companies.
- **Twisty cases** — several suspects with motives, red herrings that make sense in the end, evidence spread across many apps.
- **Graded reports** — identify who, when, where, and reconstruct the chain of events with missing links; support it with 2–5 discovered clues. Each field is scored, a wrong culprit caps the grade at D, and your result selects an ending. Review the breakdown or replay the case.

## Cases

| # | Title | City | Year | Difficulty |
|---|---|---|---|---|
| 535 | Marine Parkway–Gil Hodges Memorial Bridge | New York City, NY | 2019 | Medium |

## Tech

Plain **HTML, CSS and JavaScript** — no frameworks, no build step.
Case content (places, people, evidence, browser pages and answers) lives in JSON under `data/cases/<id>/`.

```
whoami/
├── index.html         # welcome page
├── game.html          # game desktop (game.html?case=<id>)
├── map-demo.html      # MapLibre street map: embedded in the Map window, or a standalone demo
├── css/
│   ├── style.css      # shared reset, colors and fonts (site + game)
│   └── os.css         # the game OS and every app
├── js/
│   ├── main.js        # entry point: loading, saved progress, mail triggers, dock, hotkeys
│   ├── evidence.js    # shared record helpers: access checks, file names, record viewer
│   ├── sound.js       # synthesized interface sounds and toasts
│   ├── windows.js     # window manager
│   ├── apps.js        # app registry (dock + windows)
│   ├── topbar.js      # case label, VPN state, sound switch, in-game clock
│   ├── mail.js, database.js, browser.js, phone.js, map.js, terminal.js,
│   ├── files.js, board.js, handbook.js, report.js   # one file per app
│   └── cursor.js      # custom mouse cursor (welcome page)
└── data/
    ├── handbook.json  # help texts shared by all cases
    └── cases/
        └── 535/
            ├── case.json      # case info, intro, follow-up mail, places, answer key, endings
            ├── people.json    # everyone in the in-game database
            ├── evidence.json  # investigation evidence, access requirements and leads
            └── web.json       # fictional browser pages, URLs, search queries and content
```

## Run locally

The game loads JSON with `fetch`, so it needs a local server (opening `index.html` directly won't work):

```bash
npx serve .
# or use the "Live Server" extension in VS Code
```

## Roadmap

- [x] Desktop and window system
- [x] Browser app (case-limited public search)
- [x] Database app (people search)
- [x] Mail, map, terminal, phone, files, evidence board
- [ ] Cameras
- [ ] Case 535 fully playable (needs cameras and content assets)
- [x] Report form, grading, endings and replay
- [ ] Website with case selection, difficulty and best scores
- [ ] Later: Unity version and desktop release

## Disclaimer

All people, companies, addresses, usernames and events in this game are fictional. Any resemblance to real persons is coincidental. Phone numbers use the reserved 555-01XX range.

---

Made by **Crawler**.
