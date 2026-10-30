# Touchline 3.18 — human figures and complete 3D cards

The opening, detailed animations and standard match presentation now share original human anatomy: a shaped jaw and cheek profile, inset eyes, natural-sized facial features, athletic torso/leg proportions, hair and better hand detail. Continuous limbs blend into wrist and ankle bones. Existing idle, run, football actions and the draw interface remain in place.

All 2,310 known player entries resolve to bundled 3D studio images, representing 2,135 catalog identities. Another 48 deterministic original portraits cover created and future players. Person/profile aliases preserve cards after transfers; missing images fall back once to a bundled original. Manager squad/selection/recruitment, draft/pitch, player-career and original squad-picker cards share the image helper. Images are pre-rendered: card browsing opens no WebGL contexts.

These are original game figures, not photos, scans or accurate real-player likenesses. The Kenney CC0 skeleton/idle/run clips remain credited. Runtime portraits use neutral studio kits and are compressed WebP images; they are included in offline and portable assets. Source SVG studies remain available as earlier project artwork.

This release changes presentation and asset coverage only. Simulation rules, economies, save formats, seeded results and recorded commands are unchanged. New source files include human-anatomy.js, player-portraits.js, portrait-renderer.js and a reproducible build-player-portraits.mjs pipeline. Generated coverage is in dist/assets/player-portraits/coverage.json.

All **274 unit tests and 101 browser journeys passed**, zero failures/skips. The documented headless Direct3D11 reference run measured full-match p95 **16.70 ms** and incident-match p95 **16.70 ms**, each below 33.5 ms. Exact legacy replay, pending reload, two-season/archive, offline, mobile and WebGL cleanup checks remain in the suite. Physical-device and human enjoyment certification are outside these automated results.

## Reproduce the Windows hardware timing run

The standard test command and every existing gameplay/frame-budget assertion remain unchanged. On the documented Windows reference host, the two rendered-match timing suites can explicitly use the installed Direct3D11 adapter:

```powershell
$env:TOUCHLINE_TEST_ANGLE='d3d11'
node --test --test-concurrency=1 browser-tests/*.test.js
```

This selection was separately observed as `ANGLE (Intel, Intel(R) Graphics (0x00007D67) Direct3D11 vs_5_0 ps_5_0, D3D11)`. It does not select the laptop's NVIDIA adapter or certify a physical phone. Other browser journeys retain their normal launch settings. The default CI command does not set this option.

The default local headless browser was observed using SwiftShader (CPU Vulkan). Under the current local conditions, its full-match p95 was 50.1 ms on both the unchanged 3.17 release and the new build. That software-rendered result fails the 33.5 ms target and is retained separately; it is not presented as a passing hardware measurement.
