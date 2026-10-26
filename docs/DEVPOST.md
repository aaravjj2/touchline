# Touchline — project story

**Tagline:** Build your club, play the match and revisit your decisions in a browser football sandbox with local saves and reproducible replays.

## Inspiration

Football games often separate managing a club from playing its matches. Touchline explores one connected loop: identify a squad problem, prepare the team, play or manage the match, then review what actually happened. It is built for football fans who want a local browser game without an account or paid inference service.

## What it does

Take over a sandbox club or found an original one. Review the next fixture, compare natural-position cover, negotiate recruitment and choose **Play yourself**, **Manage live** or **Simulate** from the same preparation screen. Direct play supports keyboard and on-screen touch controls; repeatable training isolates passing, shooting and defending.

A fictional Super League and original Super Cup share one calendar. Recorded match inputs support replay and Decision Lab branches. Local saves, archive exports and recovery copies keep progress on the player's device. Draft & Europe and player career offer separate ways to play.

## How it was built

Vanilla JavaScript and Three.js run the client. Simulation state and recorded commands are separate from rendering and presentation settings. Workers support longer simulations, while local storage/IndexedDB and portable archives preserve careers. The downloadable Node.js demo needs no package installation.

Codex assisted implementation, UI inspection, regression testing, release preparation and documentation. AI assistance is part of the development process; **live AI is disabled in the game**. Outcomes come from the simulation, not an LLM. The walkthrough uses actual automated browser capture with a deliberately prepared QA career and disclosed generic synthetic narration.

## Challenges and learning

Visual changes must not invalidate old saves or recorded matches. Keeping simulation and presentation separate made exact replay checks possible. Natural-position eligibility also matters: broad labels such as “forward” cannot imply that every winger is a striker.

Another lesson was to verify the actual rendered artifact. A loaded canvas or successful asset request does not prove that the intended scene is visible. The release checks include actual browser flows and directly decoded video samples.

## What works and what remains

Public build **3.18.0-preview.1** passed **274 unit tests and 101 browser journeys** on the documented Windows reference run. Coverage includes direct input, pending-match reload, legacy replays, offline recovery, renderer cleanup and two integrated seasons, each with 380 league and 19 cup fixtures. These are automated checks, not evidence of human enjoyment or physical-device compatibility.

Real-club data remains an unverified sandbox with authored financial terms. The verified opening-day career stays locked. Economy balance, independent art/game-feel feedback and physical phone/Safari/assistive-technology testing remain open; controller play is unsupported. Next priorities are first-session human testing, tuning squad decisions and resolving the data gate before expanding the world.

## Existing work, event contribution and credits

Touchline predates this entry preparation. The existing management, simulation and replay systems are earlier work. Release documents label October 25–26 work on the cinematic launcher, animated opening, model/fallback handling, responsive presentation and regression verification. This public import does not reconstruct earlier Git history or independently establish every contribution date. See [CONTRIBUTIONS.md](../CONTRIBUTIONS.md); the entrant must verify authorship and event-period attribution in the final entry.

The public edition uses original/code-generated presentation and generated player figures instead of the supplied cinematic photograph or photographic player portraits. The existing Kenney rig/clips are CC0, Three.js is MIT, and fonts retain their OFL notices. See [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md). Club/player names and research data do not imply an official licence or affiliation.

## Try it

- [Play the public browser build](https://touchline-beta-ten.vercel.app/)
- [Public source and setup](https://github.com/aaravjj2/touchline)
- [Playable ZIP, walkthrough and captions](https://github.com/aaravjj2/touchline/releases/tag/v3.17.0-preview.3)
- [Demo details](DEMO.md)
- [Verification scope](VERIFICATION.md)

This is prepared submission copy. Publishing source or a release does not submit a Devpost entry.
