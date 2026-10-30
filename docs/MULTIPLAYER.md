# Draft Duel

**Public ChatGPT Sites edition:** [Play Touchline](https://touchline-draft-duel.aaravj117958.chatgpt.site) or [open Draft Duel directly](https://touchline-draft-duel.aaravj117958.chatgpt.site/duel). The full game has Multiplayer on Home. Its Workers API uses D1 compare-and-swap room updates and authenticated event streams. Existing rooms and root invitation links remain valid. The deployable source mirror is `hosting/sites/`; the separate live checkout at `sites/draft-duel/` is ignored by this Git repository. The instructions below describe the optional local Node/file-backed edition.

The Vercel edition's Multiplayer entry opens this same Sites room service, preserving invitation codes. It does not create a second room database. Localhost and LAN Node servers retain their original local multiplayer behavior.

Two human players share a private room, draft opposing XIs with alternating picks, choose hidden approaches, then receive the same server-resolved statistical match result. A rematch requires both players. The first pick and home advantage alternate each round. Score order always follows the two team cards. There is no live two-player pitch control or shared manager career in this edition.

Open **Multiplayer · Draft Duel** on the launcher or **Play multiplayer** in Draft & Europe. Create a room, send its invite link, and have both players ready up. Each turn offers six position-eligible players. A person cannot appear twice across the two XIs. Both players choose an approach before kick-off. The match uses the existing fast statistical engine, explicitly labelled without a physical replay.

## Run and host

Node 24 or later, from the repository root:

```powershell
$env:HOST='0.0.0.0'
$env:PORT='4173'
$env:MULTIPLAYER_STORE='C:\touchline-server-data\rooms.json'
node server.mjs
```

On a trusted LAN, visit `http://YOUR-LAN-IP:4173/multiplayer.html` on both devices. Create the invite using that address rather than localhost. For internet play, deploy the complete repository to one long-running Node process with a persistent disk, set `HOST=0.0.0.0`, and put it behind HTTPS. Route both static files and `/api/multiplayer` to that process. Keep the store outside `dist/` and retain it across releases. Do not expose an unencrypted server over the internet. No paid provider or account is required by the implementation.

The existing Vercel deployment serves only `dist/`; it has no room server. Deploying these static files alone does not enable public multiplayer. This file-backed backend must have exactly one owning process. Do not use multiple replicas or ephemeral/serverless disks; a hosted scaled version needs a shared database with transactional commands. No production deployment is performed by this change.

## Persistence and boundaries

Room state and hashed seat keys persist atomically before a mutation succeeds. Server-side commands authenticate each player, check turn ownership and revision, and resolve picks and results. Concurrent stale actions return a conflict and refresh the client. The polling interval is 1.5 seconds; a disconnected player retains their turn and can reconnect. Presence becomes stale after 15 seconds. Rooms expire 24 hours after creation; completed rooms allow a mutual rematch within that period. Up to 500 unexpired rooms and 240 requests per address per minute are supported; this is a bounded private-room feature, not a public matchmaking service.

Seat keys are stored separately from careers in browser localStorage. Refresh to resume. Invite codes grant the remaining seat only; seat keys control an existing seat and must remain private. A browser with blocked storage must retain its private key manually. Room closure closes the view while preserving the seat; forfeit ends the duel and awards the opponent the win. There are no accounts, chat, spectators or recovery service for lost keys.

Tests cover two browser contexts, desktop/390px layouts, disconnect/reconnect, complete drafts, hidden tactics, common results, rematches, save isolation, server restart, simultaneous joins/picks, authentication, invalid commands, expiration and failed persistence. These checks do not establish internet load capacity or physical-device certification.
