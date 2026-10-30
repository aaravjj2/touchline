# Full Touchline Site

The existing public Site now hosts the complete Touchline browser game at `/`, with synchronized two-player Draft Duel at `/duel`.

- `touchline/`: committed, unminified full-game source and assets, originally copied from the parent Touchline project's `dist/` at 3.20.0-preview.1. The only hosting changes are the Home multiplayer link and invite compatibility bridges.
- `client/`, `lib/`, `app/duel/`: the live Draft Duel experience and server-owned rules.
- `app/api/multiplayer/`: Workers/D1 room API. Database bindings, schema and existing room state are retained across publication.
- `scripts/build-touchline.mjs`: copies the full game into `public/` and hashes every offline asset. `npm run build` invokes both this and the duel client bundler through `prebuild`.
- `public/`: generated assets; edit the source above rather than generated copies.

Old root invitations (`/?room=CODE`) and `/multiplayer.html?room=CODE` open `/duel` while preserving the code. Multiplayer's Home entry and the Draft & Europe shortcut open the same shared feature. Draft Duel's brand link returns to the full game.

Solo saves and device preferences retain their original keys and formats. The multiplayer seat key remains separate; room state remains in D1. Saves from a different origin, including the previous Vercel URL, must be exported through Settings & saves and imported on this Site. Opening a new domain does not automatically transfer browser-local data.

The root service worker caches only verified static files and always bypasses `/api/`. Offline solo play remains supported. Online multiplayer requires a connection; room APIs and event streams are not cached. Existing installed builds wait for the user to apply updates through Settings.

Sites may add per-request HTML at the edge. Offline preparation therefore downloads generated HTML snapshots as binary resources, verifies their source hashes, and caches them under their original URLs with HTML content type. Ordinary online page responses retain normal host behavior. The snapshot paths are constrained by the service worker and generated from the committed source at build time; transformed HTML is never silently accepted as matching a source hash.

`node --test --test-concurrency=1 tests/*.test.mjs` runs the backend, asset manifest, launcher, draft/campaign and offline-update/recovery checks. The browser fixtures serve the packaged `public/` copy. The full Sites runtime additionally requires a manual or browser check of `/`, `/duel`, invite routing and the anonymous database health endpoint.

Source code and content retain the included license and third-party notices. Publication does not submit a Handshake contest entry.
