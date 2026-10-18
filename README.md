# WHO AM I?

A browser-based hacker detective game.

You play as **WHOAMI** — an anonymous hacker who takes jobs on closed forums. People come to you with cold cases the police gave up on years ago. You get a computer screen and nothing else: databases, email, phone records, maps, street cameras, social media. No hints, no "find" buttons. You type the commands, you search the records, you connect the dots — and you name the person who did it.

## Features

- **A fake desktop OS** — apps open as movable, overlapping windows (database, mail, map, cameras, terminal, and more).
- **Fully manual investigation** — every search, every login, every password is on you. How-tos live in an in-game handbook, not in tooltips.
- **A living database** — not just suspects: every resident of the city can be looked up, and some of them know more than they think.
- **Fictional cases in real places** — real US cities, real platforms (Instagram, Google, Strava, Steam…), fictional people and companies.
- **Twisty cases** — several suspects with motives, red herrings that make sense in the end, evidence spread across many apps.
- **Graded reports** — at the end you file a report: who, where, when, how, and up to five pieces of evidence. You get a score (0–100%) and a grade from A+ to F, plus one of several endings.

## Cases

| # | Title | City | Year | Difficulty |
|---|---|---|---|---|
| 535 | North Bridge | Tacoma, WA | 2019 | Medium |

## Tech

Plain **HTML, CSS and JavaScript** — no frameworks, no build step.
Case content (people, evidence, answers) lives in JSON under `data/cases/<id>/`.

```
whoami/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── main.js
└── data/
    └── cases/
        └── 535/
            ├── case.json      # case info, intro, places, answer key, endings
            ├── people.json    # everyone in the in-game database
            └── evidence.json  # every piece of evidence and where it is found
```

## Run locally

The game loads JSON with `fetch`, so it needs a local server (opening `index.html` directly won't work):

```bash
npx serve .
# or use the "Live Server" extension in VS Code
```

## Roadmap

- [ ] Desktop and window system
- [ ] Database app (people search)
- [ ] Mail, map, cameras, terminal
- [ ] Case 535 fully playable
- [ ] Report form and grading
- [ ] Website with case selection, difficulty and best scores
- [ ] Later: Unity version and Steam release

## Disclaimer

All people, companies, addresses, usernames and events in this game are fictional. Any resemblance to real persons is coincidental. Phone numbers use the reserved 555-01XX range.

---

Made by **Crawler**.
