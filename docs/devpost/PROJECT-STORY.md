## Inspiration

Football keeps inviting the same question: what would happen if I made the decisions? I wanted to put that question in a browser, where a player could build a club, take the field, revisit a tactical choice, or challenge a friend without asking them to install a game.

Touchline grew around that idea. The multiplayer addition brings the social part into the same home screen as the solo game: send a link, draft against a friend, and discover whether your squad and approach work together.

## What it does

Touchline is a playable football sandbox with several ways to take part:

- **Manage a club:** prepare for opponents, select a squad, adjust tactics, explore transfers and finances, and progress through a season.
- **Draft & Europe:** reveal a club and era, pick players in their natural positions, build an XI, and enter a European campaign.
- **Play matches:** move, pass, shoot, switch players and tackle using keyboard or touch controls. You can also manage live or explicitly simulate to full-time.
- **Build a player career:** create a prospect, make career decisions, and follow their development.
- **Practice:** complete repeatable passing, shooting and defending exercises with progress saved on the device.
- **Revisit decisions:** replay recorded matches and compare alternative decisions inside the simulation.
- **Play Draft Duel with a friend:** join a private room, alternate unique player picks, choose hidden tactics, and receive the same server-owned result. Reconnect and request a mutual rematch.

- **Explore real match analytics:** inspect historical Wyscout shot data, chance-creation routes, source matches and a logistic shot-quality model evaluated on independent competitions.

The public link opens the complete game. Multiplayer is one feature on Home, and the solo modes remain available alongside it.

## How I built it

The game client uses **JavaScript, HTML, CSS and Three.js**. Simulation commands and recorded match state support reproducible replays. Solo saves use browser storage, with export and recovery tools and an offline solo option.

The hosted multiplayer service uses **Cloudflare Workers and D1** through a **Vinext** application on ChatGPT Sites. The server owns the room state, player selections, hidden approaches and final result. Conditional database updates check a revision number before accepting a command, so two requests cannot both claim the same turn. Server-sent events keep the screens current, with polling as a fallback.

The Vercel edition opens that same shared room service from its Multiplayer entry. That keeps friends in one room system regardless of which Home link they started from. A separate Node.js server supports local development and independent local/LAN rooms.

I used ChatGPT and Codex to help implement features, inspect failures, write regression checks and prepare releases. Human direction supplied the product choices and iteration. The playable release does not require live AI inference or a paid AI account.

## Challenges I ran into

**Keeping two players consistent.** A room code alone was not enough: commands needed authentication, turn checks, unique picks and protection against simultaneous requests. Reconnects had to recover a seat without resetting the draft or exposing an opponent's hidden tactic.

**Preserving a growing game.** Multiplayer had to coexist with careers and their saves. I kept shared room state separate from device-only progress and checked reloads, rematches and save continuity.

**Making the same interface work on a phone.** Draft choices, squad views and match controls compete for space. I tested narrow layouts, moved active multiplayer choices ahead of long squad lists and kept the formations readable.

**Hosting and offline integrity.** The full app contains thousands of assets. The hosting layer modifies HTML responses, which initially broke exact-byte offline checks. Immutable HTML snapshots allow verified caching while normal online pages keep the host's usual behavior.

## Accomplishments I'm proud of

The result is a full browser game with a working two-device multiplayer loop, rather than a disconnected multiplayer proof of concept. Two independent clients can draft, finish with the same score, reload and request a rematch. Solo matches also connect preparation, direct control, recorded results and replay.

For the analytics update, 290 unit tests, nine Python audit tests and 21 focused browser regressions passed. Additional hosted checks verified shared rooms and the public asset set. These are automated checks, not a claim of a completed human usability study or physical-device certification.

## What I learned

I learned to describe failures in terms of state and behavior: which turn was accepted, which save changed, whether two clients agreed, and whether a recorded match could be reproduced. That made iteration more useful than repeatedly asking for visual polish.

I also learned to separate game data from real-world evidence. Touchline's ratings and outcomes are modeled gameplay. A simulation can help someone explore an idea, but it does not establish that the same tactic will succeed in professional football.

## What's next for Touchline

I want to improve onboarding through observed playtests, expand the multiplayer experience after Draft Duel, and strengthen the decision-analysis tools. The new Analytics feature now uses attributed real-match data, independent model evaluation and visible uncertainty. Further research will add context, calibration and more independent seasons.

## Development and asset disclosure

Touchline is an existing project that predates the current public repository. The repository preserves an honest snapshot and subsequent commits; I am not claiming the entire application was created within either event's build window. The October updates include guided practice, playing/preparation guidance, full-app hosting and the shared multiplayer service. Event eligibility and the exact contribution boundary need to be resolved against each organizer's rules before entry.

The cover in this packet uses actual game rendering and typeset text, with no generative image model. Gallery images and videos are actual application captures. Some in-game imagery is authored/generated game artwork; Draft & Europe also includes individually credited licensed photographs. The asset notices remain in the repository. Browser automation drives the demo, and fast simulation is identified in the edit.
