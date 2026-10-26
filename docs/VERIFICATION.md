# Verification scope

The prior private development build passed 271 unit tests and 99 Chromium browser journeys. This public edition changes presentation asset references, omits photographs and fixes source/portable static-server path resolution; it does not change simulation rules or save formats.

Public edition **3.17.0-preview.3** passed all **271 unit tests** and **99 serial Chromium browser journeys**, with zero failures or skipped journeys, on 26 October 2026. Unit execution took 38.6 seconds and the browser suite took 648.7 seconds. These results are from the public edition itself.

The suite covers exact legacy replays, saved pending fixtures, direct keyboard/touch input, transfers/position cover, two consecutive integrated seasons, archive recovery, offline updates, damaged/full storage and WebGL lifecycle cleanup. Each integrated season completes 380 league and 19 cup fixtures. Rendered Standard matches use the existing p95 ≤33.5ms local gate.

Reference host: Windows, Intel Core Ultra 9 275HX, Intel Graphics and NVIDIA GeForce RTX 5090 Laptop GPU; Node.js 24 and Playwright 1.64.1 headless Chromium. GPU inventory does not prove which adapter the browser selected. The complete rendered-match sample measured p95 **33.40 ms**, 1,832 frame intervals over 60.5 seconds, at 4× playback. This is a headless local result, not a physical-device benchmark. CI runs separately on its documented runner and may have different timing.

Physical device, actual Safari/assistive-technology, independent art, economy balance and human enjoyment assessments are not established by these automated checks. No professional release certification is claimed. Reproduction commands are in the root README.
