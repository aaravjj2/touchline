# Media production

These are maintainer tools for actual application capture and deterministic typesetting/editing. Run from the repository root after installing Playwright and Chromium. They do not submit anything to Devpost.

| Command | Output |
| --- | --- |
| `node scripts/media/capture-submission.mjs` | Game-mode and public Draft Duel recordings, screenshots and capture report |
| `node scripts/media/assemble-submission-media.mjs` | Typeset cover, captioned 2:40 demo, 3:57 walkthrough, edit manifest |
| `node scripts/media/capture-analytics-demo.mjs` | Analytics recording, six screenshots, captions and transcript |
| `node scripts/media/finalize-submission-packet.mjs` | Copy-ready stories/tags/links, local media gallery and file manifest |

Outputs stay under ignored `work/devpost-media/` and `work/analytics-media/`. The analytics capture uses `http://127.0.0.1:4173` by default; run the app first or supply `ANALYTICS_DEMO_URL`. Game capture starts its own disposable local server; multiplayer capture uses the public room service.

Video editing currently expects a locally installed `ffmpeg-static` tool at `work/media-tools/node_modules/ffmpeg-static/ffmpeg.exe`. This is the documented Windows reference workflow, not a cross-platform guarantee. No extra music or synthetic voice is added. Fast simulation and edited holds are disclosed. Captures are automated demonstrations, not human playtests or physical-phone certification.

The committed marketing cover uses an actual game-canvas screenshot and typeset HTML/CSS, with no generative image model. In-game artwork and photographs retain their own separate provenance.
