# Contributing to Touchline

Start with the [README](README.md), [documentation index](docs/README.md) and [development-history disclosure](CONTRIBUTIONS.md).

## Source layout

- `dist/` is the actual browser source, not disposable generated output. Edit the relevant module there.
- `api/` serves local multiplayer. The separate native Sites app supplies the public Workers/D1 room service; `hosting/sites/` is its deployable source mirror, not a dependency cache.
- `scripts/analytics/` reproduces the research artifacts. `scripts/media/` records and assembles actual-app media.
- Keep raw downloads, capture output, local databases, personal saves and credentials out of Git. Ignored `work/` is for local generated evidence and caches.

Avoid moving runtime paths or normalizing all asset line endings as incidental cleanup. Offline manifests verify exact source bytes. Hosting snapshots contain intentional differences, including shared-room routing and immutable HTML snapshots.

## Check a change

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm build
pnpm test
pnpm test:e2e
```

Run the tests relevant to your change. Browser checks run serially to avoid shared-port and GPU contention. Report the actual scope and any renderer/device limitations; a passing automated test is not a human playtest.

For analytics changes, use Python 3.12 and the pinned requirements, run the pipeline and `scripts/analytics/test_pipeline.py`, and verify browser/model parity. Keep evaluation competitions outside training and tuning. Source-lock changes, changed exclusions or model comparisons need explicit explanation. Regenerate outputs through the pipeline instead of hand-editing findings.

## Pull requests

Explain the user-visible problem, the resulting behavior, what was tested and any remaining limitations. Preserve saved-game and recorded-match compatibility, or document an explicit migration. Update feature documentation when behavior changes. Include source attribution and license information for new data or assets.

Do not add real API credentials, private player saves or unsupported claims about current football facts, prediction accuracy or event eligibility. Keep observed match data, estimated model probabilities and simulated gameplay clearly separated.

Publishing an app is separate from entering a hackathon. Devpost drafts must remain drafts until the owner explicitly requests final submission and any event-specific requirements are resolved.
