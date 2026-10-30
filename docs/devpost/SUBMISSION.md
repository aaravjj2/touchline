# Touchline

## One-line Summary

Manage a club, build an XI, play the match, revisit your decisions—and draft against a friend from any browser.

## Project Story

Paste [the full Markdown story](PROJECT-STORY.md) into About the project. For AQX, use [the analytics-focused draft](AQX-STORY.md) after resolving its existing-project eligibility requirements.

## Problem

Give football fans an accessible way to explore squad and tactical decisions and share a short competitive experience without installation.

## Solution / Why This Matters

A public browser game combines solo careers, practice, direct play, replay and private two-player drafting. The educational value is exploratory; no measured learning outcome is claimed.

## How We Used AI / How We Used Codex

ChatGPT and Codex assisted implementation, debugging, release verification and documentation under human product direction. Live AI inference is disabled in gameplay. The new cover uses typesetting and an actual game screenshot, not generated promotional artwork.

## Key Features

Club management; Draft & Europe; direct keyboard/touch play; player careers; repeatable practice; recorded replays and alternative decisions; Draft Duel with server-owned turns, hidden tactics, reconnect and rematch; local save export/recovery; offline solo play; real-data chance-creation analytics with held-out model evaluation.

## Architecture

Vanilla JavaScript/Three.js game; browser persistence; Vinext/Workers/D1 shared room service; SSE with polling fallback. Vercel links to the canonical shared rooms. Local Node development supports independent LAN rooms. Source mirror in hosting/sites.

## Built With

[23 copy-ready tags](BUILT-WITH.txt).

## Testing Instructions

1. Open the full Site and choose a solo mode from Home.
2. Start Draft & Europe, reveal a club/era, select natural-position players and enter a campaign.
3. Play an exhibition using WASD, J pass, L shoot, Q switch, C tackle; finish through the explicitly labeled simulation option or continue playing.
4. Open Draft Duel in two independent browser sessions. Create a room, copy the invite, join from the other session, ready both seats and take all 22 picks.
5. Choose approaches, ready both seats and compare the shared result. Reload, then request a rematch from both clients.
6. Export a solo save through Settings. Solo saves are device/origin-specific; room progress is shared.

Current analytics verification: 290 unit tests, nine Python pipeline/audit tests and 21 focused browser regressions. An independent run reproduced all 453 analysis files byte-for-byte. See the fresh media capture report for the exact flows demonstrated in this packet. No human-study or physical-phone certification is claimed.

## Public Demo Link

https://touchline-draft-duel.aaravj117958.chatgpt.site/

## Public Repository Link

https://github.com/aaravjj2/touchline

## Demo Video

Local deliverables: work/devpost-media. Public video URL: pending upload. Keep the short demo between two and three minutes to satisfy both conflicting Next Byte prose lengths. Longer footage is supplemental.

## Screenshot Shot List

Home; live/direct match; full-time result; draft reveal/XI; European campaign/table/recap; manager office/squad/transfers/season/club; preparation; player creation/progress; three practice skills; decision comparison; multiplayer lobby/pick/tactics/shared result/phone/rematch; save tools.

## Submission Readiness Notes

Nothing in this packet has been sent to Devpost. The account is registered for both named events. The connected project list identifies the existing Next Byte entry as Footwise (project 1518665); it was not changed. Touchline was not among the 24 returned projects, which is not an exhaustive proof of all prior entries.

Event data was read from connected Devpost tools on October 30, 2026. Next Byte's configured cutoff is October 31 at 5:00 p.m. Eastern; AQX's prose says October 31 at 11:59 p.m. Pacific, while its configured timestamp is November 1 at 07:00 UTC. Treat the earlier prose time as the practical AQX deadline.

## Known Limitations

Touchline predates this repository. Next Byte excludes previously completed/submitted projects; AQX says no pre-made projects. The reused foundation is disclosed in CONTRIBUTIONS.md. Event eligibility is not established by a fresh cover or feature update. AQX now has a real-data analytical feature with independent evaluation; existing-project eligibility still needs resolution. In-game ratings/results are modeled and not validated sports forecasts. Multiplayer is Draft Duel, not real-time two-player control of the 3D match or a shared manager career. Offline mode is solo only.

## TODO Official Form Fields

- Confirm build-history eligibility with each organizer and identify any prior AQX entry.
- Resolve whether the event permits another entry alongside the existing Footwise project; do not overwrite it implicitly.
- Review the official rules and complete the event workflow if an entry is pursued.
- Upload the new video and insert its public URL.
- Confirm team/authorship details and personal inspiration wording.
- AQX: use the new analysis story, evidence and video; preserve the existing-foundation disclosure.
