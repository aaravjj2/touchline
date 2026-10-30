# Touchline Analytics

Real historical match analysis, separate from the game engine. Open `/analytics.html` from Home or in-game navigation. The dashboard defaults to held-out England 2017–18, with World Cup 2018 available separately. URL parameters `competition`, `team`, `route` and `tab` preserve filters. No game save is written.

## Reproduce

Use Python 3.12 in a dedicated environment:

```sh
python -m pip install -r scripts/analytics/requirements.txt
python scripts/analytics/build.py
python scripts/analytics/test_pipeline.py
```

Raw downloads and article metadata cache under ignored `work/analytics-source/`. `scripts/analytics/sources.lock.json` pins article versions and SHA-256 hashes; changed bytes fail explicitly. Output is `dist/analytics-data/`; `--output <directory>` supports independent reproduction. Regenerate the offline manifest after output changes. The browser needs no Python, account or prediction API. Match/event data and transformations retain CC BY 4.0 attribution; application code retains MIT.

## Model

Development: France, Germany, Italy, Spain 2017–18, 1,446 matches / 32,010 shots. Independent evaluation: England 380 matches / 8,451 shots and World Cup 2018 64 matches / 1,377 shots. Euro 2016 is unused.

Full-model features: distance, angle, left-foot indicator, head/body indicator and unknown-body indicator; right foot is the reference. Coordinates assume a 105 × 68 metre pitch and attack towards x=105. Missing/ambiguous body tags are unknown, not fabricated headers. Values are standardized within each training fold. L2 logistic regression uses liblinear, seed 42; C in 0.01/0.1/1/10 is selected by five-fold log loss. Folds keep matches intact and balance leagues. Final C is 1 for both full and distance-only models.

`model.json` serializes feature order, means/scales, intercept, coefficients and development audit. Browser inference uses the logistic transform. `parity.json` supplies 1,000 held-out vectors, tested to absolute difference below 1e-9. Outcomes, assist/key-pass tags, shot destinations, identities and route labels never enter the model.

## Analysis and uncertainty

Target: eventId 10, periods 1H/2H, finite start coordinates 0–100. Goal tag 101 supplies the outcome. Separate free-kick/penalty event types, extra time and shootouts are excluded and counted. Own goals outside Shot events are outside the target; totals differ from final match scores.

Route: nearest preceding accurate same-team Pass within ten seconds, same period, stopping at opponent events or Foul/Free Kick/Interruption/Offside. Cross subevent 80 takes priority over through tag 901, then other pass; otherwise no linked pass. Equal timestamps retain original event order. This conservative association is not a verified assist or complete possession reconstruction. Unsuccessful crosses that never generate shots are outside the shot denominator.

Summaries include every team-match, including zero-shot games. Whole matches are resampled 2,000 times with seed 42; all-team exposure is twice the match count. Intervals/comparative interpretation require 30 shots from five shot-containing matches. Fixed route-vs-other-route differences use paired match resampling. Intervals condition on the frozen model and omit training uncertainty; no causal or significance claim is made.

Independent reports compare log loss, Brier score and ROC AUC against constant development conversion and separately tuned distance-only regression. Five fixed probability bins show counts, predicted/observed conversion and intervals. Empty bins and single-class bootstrap AUCs are null. This is cross-competition historical evaluation, not future-season certification.

## Static interfaces

- `england.json` / `world-cup.json`: version, team/match metadata, shots and summaries by team/route; corresponding CSVs separate observed goal and model estimate.
- `model.json`, `validation.json`, `provenance.json`: frozen model, evaluation/findings, source hashes, attribution, exclusions, coverage and split IDs.
- `matches/<id>.json`: attributed source metadata for every held-out match, linked from the shot table.
- `LICENSE.txt`: source/data licensing and transformation boundary.

No API, save migration or database migration is introduced. CSVs join JSON in offline manifests. Synchronize the Sites source snapshot and root Vercel static files before publication. The AQX draft states the actual results and existing-project eligibility boundary.
