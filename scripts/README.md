# Developer scripts

Run commands from the repository root. `dist/` is source; builds refresh its offline metadata rather than regenerate the game from another source directory.

| Area | Entry points |
| --- | --- |
| Local app | `node server.mjs` (repository root; includes local Draft Duel API) |
| Portable static preview | `node scripts/local-demo-server.mjs` (solo/analytics preview) |
| Build / integrity | `pnpm build`, `pnpm check`, `pnpm offline:build` |
| Unit / browser checks | `pnpm test`, `pnpm test:e2e` (serial browser execution) |
| Analytics research | [analytics/](analytics/): pinned Python dependencies, source lock, build pipeline and audit tests |
| Media and draft packet | [media/](media/README.md): actual-browser recording, video editing and packet assembly |
| Local demo packaging | `pnpm demo:package`, `pnpm verify:local` |
| Simulation benchmarks | `pnpm career:benchmark`, `pnpm career:audit-super` |

Other root-level scripts support catalog research, identity/photo audits and regression fixtures. Research outputs are not automatically verified runtime facts. Local downloads, generated recordings and caches belong in ignored `work/`, not in app source or committed personal saves.
