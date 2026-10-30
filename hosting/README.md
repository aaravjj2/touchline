# ChatGPT Sites deployment

`sites/` contains the deployable source of the full Touchline Site, mirrored from the separately managed Sites repository at commit `37cdaa0d480973c9f43ac70a270432da5107699a`. No credentials, local database contents, node_modules, build output or Git metadata are included. The Site's source of truth for publishing remains its native Sites repository; this mirror makes the full implementation reviewable alongside the Vercel edition.

From `hosting/sites`, install the pinned dependencies, run `npm run build`, and use the native Sites publication workflow for the existing project. The hosting manifest preserves the actual Site identity and D1 binding. A fork must create its own Site identity rather than publish over this project.

The committed `touchline/` snapshot is the full browser game. The build copies it to generated `public/`, adds the multiplayer client, and hashes the offline build. The root page is served as a static asset; `/duel` and `/api/multiplayer/*` run in the Worker. See `sites/TOUCHLINE.md` for paths and verification details.
