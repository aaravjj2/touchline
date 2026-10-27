# 3.20.0-preview.1 — possession guidance and opponent preparation

Direct play now explains the current situation beside the controls: controlling the ball, a teammate or goalkeeper in possession, an opposition attack, a pass in flight, a loose ball, a restart or a pause. Switch guidance follows the existing carrier-selection behavior. Tackle guidance describes an attempt, without promising a recovery. Recorded action feedback remains separate from these read-only hints.

Match preparation brings the opponent's saved formation and attack/defence attributes into view. Three decisions link to the existing approach, rotation comparison and matchday bench screens. The snapshot identifies the highest attack attribute only among the opponent's saved XI, labels its limitations, counts tired starters and excludes unavailable or expired reserves. Reviewing a rotation does not apply it. Keyboard links focus and scroll to their destination.

No simulation, tactical-effect, financial, scenario, command, engine or career save rules change. Existing replay and pending-match compatibility remain covered by unit regressions. Live AI remains disabled. The current video and downloadable 3.18 package are older versioned snapshots.

Verification scope: all 281 unit tests; focused Chromium journeys for direct keyboard/touch play, guided practice, preparation actions at desktop and 390px, career isolation, squad planning, negotiations and offline update/recovery. The full browser suite and rendered-match performance benchmark are not rerun for this release. Exact counts and outputs are in VERIFICATION.md.
