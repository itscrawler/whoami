# WHO AM I?

A browser-based hacker detective game.

You play as **WHOAMI** — an anonymous hacker who takes jobs on closed forums. People come to you with cold cases the police gave up on years ago. You get a computer screen and nothing else: databases, email, phone records, maps, street cameras, social media. No hints, no "find" buttons. You type the commands, you search the records, you connect the dots — and you name the person who did it.

## Features

- **A fake desktop OS** — apps open as movable, overlapping windows (database, mail, browser, phone, map, cameras, terminal, and more). Map locations, tower signals, routes, and cameras unlock as evidence is found.
- **A simulated phone** — browse messages, calls, apps, steps, photos, social posts, email and device records; unlock private records through in-game terminal access.
- **A local file explorer** — browse the hacker's folders, view downloaded case evidence, and inspect recovered archive files.
- **An evidence board** — automatically collect discovered evidence, connect cards with player-made threads, and choose evidence for the final report.
- **A shared handbook** — six help topics and a command reference loaded from case-independent JSON.
- **A case-limited web** — search fictional public pages in Dorne without access to the wider internet.
- **Fully manual investigation** — every search, every login, every password is on you. How-tos live in an in-game handbook, not in tooltips.
- **A living database** — not just suspects: every resident of the city can be looked up, and some of them know more than they think.
- **Saved case progress** — discovered evidence, resident dossiers, unlocked access, downloads, and open apps persist in browser storage.
- **Fictional cases in real places** — real US cities, fictional service brands, fictional people and companies.
- **Twisty cases** — several suspects with motives, red herrings that make sense in the end, evidence spread across many apps.
- **Graded reports** — at the end you file a report: who, where, when, how, and up to five pieces of evidence. You get a score (0–100%) and a grade from A+ to F, plus one of several endings.

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
├── css/
│   └── style.css
├── js/
│   ├── main.js        # game entry point
│   ├── browser.js     # case-limited public web search
│   └── cursor.js      # custom mouse cursor
└── data/
    └── cases/
        └── 535/
            ├── case.json      # case info, intro, places, answer key, endings
            ├── people.json    # everyone in the in-game database
            ├── evidence.json  # investigation evidence and access requirements
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
- [ ] Database app (people search)
- [ ] Mail, map, cameras, terminal
- [ ] Case 535 fully playable
- [ ] Report form and grading
- [ ] Website with case selection, difficulty and best scores
- [ ] Later: Unity version and desktop release

## Disclaimer

All people, companies, addresses, usernames and events in this game are fictional. Any resemblance to real persons is coincidental. Phone numbers use the reserved 555-01XX range.

---

Made by **Crawler**.
