# 3.19.0-preview.1 — guided playing practice

Practice now forms a three-skill journey: receive and pass, create a shot, then stop a counter. The exercise list highlights the next uncompleted skill, shows successful and finished attempts, and remembers progress on this device. Players can still practise in any order.

After a confirmed success, Retry restarts the identical recorded situation and Next opens the following exercise directly. Timeouts offer a retry. Leaving early earns no completion. Completion uses observed football actions, rather than counting a requested button press as a successful action.

Progress is a small device preference in `touchline.practice.v1`, with an independent QA key. It is not included in career exports. A blocked/full storage device does not prevent practice; the current practice visit retains its in-memory progress. Game saves, scenario seeds, simulation rules, command formats, match results and replay engines are unchanged. Live AI remains disabled.

Verification: all 278 unit tests and 15 focused Chromium browser journeys passed. Coverage includes keyboard/touch input at 390×568, direct retry/next, reload persistence, early exit, failed progress writes, career isolation, launcher navigation and offline update/recovery. Syntax/import/version checks and 5,392 offline asset hashes passed. This release did not rerun the complete browser suite or rendered-match performance benchmark. Previous timing results remain attached to their original builds.

The public 3.18 video and downloadable release are historical snapshots; they do not demonstrate the new practice journey.
