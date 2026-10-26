# Touchline

Manage a football club, play its matches and revisit your decisions in a browser sandbox.

Vanilla JavaScript and Three.js. Keyboard and touch play, club careers, natural-position drafting, recorded replays and local save recovery. No account or paid AI service is required. Live AI is disabled.

[Video walkthrough](https://github.com/aaravjj2/touchline/releases/download/v3.17.0-preview.3/touchline-demo.mp4) · [Download playable preview](https://github.com/aaravjj2/touchline/releases/download/v3.17.0-preview.3/touchline-playable.zip) · [Captions](https://github.com/aaravjj2/touchline/releases/download/v3.17.0-preview.3/touchline-demo.srt)

## Try it locally

Install **Node.js 24 or later**, clone this repository, then run:

```sh
node scripts/local-demo-server.mjs
```

Open **http://127.0.0.1:4280/?qa=1** in a fresh browser profile. This static demo route needs no package installation. Saves stay on your device; QA saves are separate from ordinary play. Choose **Learn to play** for repeatable exercises, or **Explore Super League → Test league + cup preview** for a career. The verified opening-day option intentionally remains locked.

Move with WASD/arrows; J passes, L shoots, Q switches, Shift sprints and C tackles. Touch controls appear on touch layouts. Preparation offers **Play yourself**, **Manage live** and **Simulate**. Settings contains presentation options and archive export/import/recovery.

## Develop and verify

```sh
npm install -g pnpm@11.25.0
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm build
pnpm test
node --test --test-concurrency=1 browser-tests/*.test.js
pnpm start
```

The development server uses port 4173. `dist/` contains the actual unminified application source; it is intentionally committed. `api/` contains the optional guarded inference adapter, disabled by default. `tests/` and `browser-tests/` contain simulation, compatibility, save-recovery and UI regressions. `data/manager` contains dated research candidates, not verified runtime truth. `reports/` contains generated regression worlds, not personal player saves. `assets/` contains original source artwork/prototypes; the live game serves `dist/`.

Use the serial browser command above: tests include complete rendered-match timing and must not compete with parallel GPU workloads. CI verifies the same source; a green local check is not a physical-device or enjoyment certification.

## Public edition and credits

Build **3.17.0-preview.3** replaces the supplied cinematic photograph with the existing original stadium SVG. Photographic player portraits are omitted; cards use original stylized figures. Simulation rules, economies, gameplay saves and recorded commands retain their existing versions. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and [CONTRIBUTIONS.md](CONTRIBUTIONS.md).

Original project code is available under the existing [MIT license](LICENSE). Kenney rig/clips are CC0; Three.js is MIT; bundled fonts retain their OFL notices. Real club/player names and source facts are included as an unverified game/research sandbox. This is an independent prototype, not an officially licensed football product or an authoritative contracts database. Authored ratings, budgets and financial estimates are not real valuations or promises.

## Demonstration and limits

See [the demonstration guide](docs/DEMO.md) for the video, captions and exact recorded flow. Footage uses a deliberately seeded disposable QA career and browser automation; it is not a human playtest. No live AI, online multiplayer, cloud accounts or controller support is claimed. Founder economics, verified real-world squad data, independent art/game-feel assessment and physical-phone/Safari/screen-reader checks remain unfinished.

The public edition passed **271 unit tests and 99 browser journeys**; see [verification scope and reference setup](docs/VERIFICATION.md). Future November work is not represented as completed event work.
