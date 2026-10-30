# Analytics release verification — October 30, 2026

- 290 root unit tests passed, including four new analytics checks.
- Nine Python pipeline/audit tests passed: geometry, exclusions, body tags, pass association, exposure, feature leakage, disjoint splits, fold-local preprocessing and independently recomputed metrics.
- Python/JavaScript predictions agree within 1e-9 on 1,000 held-out shots.
- An independent build into a separate output directory reproduced all 453 analysis files byte-for-byte on the reference Windows/Python 3.12 environment. Source versions and SHA-256 checksums are pinned. Byte identity across different scientific-library/platform builds is not asserted.
- 21 focused browser regressions passed: analytics navigation/filtering/CSV/retry/mobile/keyboard, cinematic Home, large-save recovery/concurrency, offline update integrity, multiplayer reconnect/results/rematch and Vercel shared-room routing.
- 23 Site tests passed, including D1 room commands/concurrency/authentication/events, hosted offline behavior and existing solo flows.
- The new captioned AQX recording is actual automated browser footage, including chance creation, source-linked shots, CSV export, independent model reports and calibration limitations. No human usability study or physical-device certification is claimed.

## Independent results

| Dataset | Shots | Goals | Constant log loss | Distance-only log loss | Full log loss | Full AUC |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| England 2017–18 | 8,451 | 914 | 0.342693 | 0.298730 | 0.291015 | 0.778423 |
| World Cup 2018 | 1,377 | 125 | 0.305435 | 0.262686 | 0.255767 | 0.783067 |

Full-model probability error improves both baseline point estimates in both datasets. It remains overconfident in the small highest-probability England bin. Cross-linked and through-ball-linked shot-quality differences repeat in direction with route-vs-other intervals on the same side of zero. No-linked-pass intervals span zero in both datasets and remain inconclusive. These are model-conditional observational comparisons, not causal effects or formal significance claims.

See `dist/analytics-data/validation.json` for complete metrics, Brier scores, calibration, sample sizes and intervals, and `docs/ANALYTICS.md` for reproduction and limitations. Test logs and raw capture reports are retained locally under ignored `work/`.
