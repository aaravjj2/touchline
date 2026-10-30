## Inspiration

Football invites the same question whether you are watching a match or playing one: what would happen if I made the decisions? I wanted one browser link where a player could manage a club, build an XI, take the pitch, revisit a choice and challenge a friend without an installation or account.

A team can take more shots without creating better chances. I wanted to make that distinction visible: where do opportunities come from, how good are they, and can a small model estimate their goal probability on matches it has never seen?

Touchline Analytics is a new research feature inside my existing football browser sandbox. It uses real historical match events, separately from the game's simulated careers and results.

## What it does

**Touchline combines a playable football sandbox, private multiplayer drafting and real-match analytics.** The same Home screen connects these experiences:

- **Club management:** prepare for opponents, choose an XI, adjust tactics and explore recruitment, finances and season progress.
- **Draft & Europe:** reveal clubs and eras, build a natural-position XI and enter a European campaign.
- **Direct play and practice:** move, pass, shoot, switch and tackle with keyboard or touch controls, or learn through repeatable passing, shooting and defending exercises.
- **Player careers and recorded decisions:** develop a created player, replay recorded match commands and compare alternative simulated timelines.
- **Draft Duel:** invite a friend with a room code, alternate unique player picks, choose hidden approaches, see one server-owned result, reconnect and request a mutual rematch. This is turn-based drafting, not shared real-time control of the 3D match.
- **Real-match analytics:** inspect historical chances and independently evaluated model estimates, separately from simulated gameplay.

Solo progress stays on the device, with export/recovery tools and offline preparation. Shared rooms require a connection.

### The analytical feature

Four views connect the question to the evidence: Overview, Chance creation, Model check, and Data & method. Users filter England 2017–18 or the 2018 World Cup by team and preceding-pass route, inspect an interactive shot map, open individual source-match records and download filtered CSVs.

Observed goals remain separate from **Touchline model xG**, our estimate of a shot's probability of becoming a goal. Summaries show shot counts, quality per attempt and expected goals per team-match, including zero-shot games.

## How I built it

JavaScript, HTML, CSS and Three.js run the game client. Recorded commands support reproducible match replay. The hosted room service uses Cloudflare Workers and D1 through Vinext on ChatGPT Sites. The server validates turns and revisions before accepting commands; server-sent events keep the clients current, with a polling fallback. Vercel opens the same shared room service, so friends do not split between two public room systems. Local Node.js development supports independent local rooms.

The offline Python pipeline uses NumPy, SciPy and scikit-learn. JavaScript, HTML, CSS and SVG render the dashboard. Versioned data, model coefficients, evaluation reports and CSVs are static files: no prediction server, account or paid AI service is needed. Analytics is linked from Home and the in-game navigation on both public editions.

The source is the CC BY 4.0 dataset published by Pappalardo et al. in *Scientific Data*, with events collected by Wyscout. Source versions and SHA-256 checksums are pinned, transformations documented, exclusions counted and attribution retained.

Development uses **32,010 shots from 1,446 matches** in France, Germany, Italy and Spain, 2017–18. England's **8,451 shots from 380 matches** and the World Cup's **1,377 shots from 64 matches** are held out from training and tuning. Euro 2016 is unused.

Only regular-time Shot events with valid coordinates enter the model. Penalties, direct free kicks, extra time and shootouts are excluded; own goals outside Shot events are outside the target. These counts therefore differ from final scores.

Our interpretable logistic model uses distance, shooting angle and body part. Wyscout combines head and body, which we preserve. Outcome tags, destination, assist tags, player identity and pass-route labels are excluded from prediction inputs. Five development folds keep matches intact and fit preprocessing on training rows only. They select L2 regularization by log loss before the model is frozen.

ChatGPT and Codex assisted implementation, debugging and verification under my product direction. The released prediction model is logistic regression, not an LLM football forecast.

## What the independent evaluation found

| Evaluation dataset | Constant-rate log loss | Distance-only log loss | Full-model log loss | Full-model ROC AUC |
| --- | ---: | ---: | ---: | ---: |
| England 2017–18 | 0.3427 | 0.2987 | **0.2910** | 0.7784 |
| World Cup 2018 | 0.3054 | 0.2627 | **0.2558** | 0.7831 |

Lower log loss is better: it penalizes confident probability errors. The full model improves both baseline point estimates on both independent datasets. ROC AUC measures ranking; it does **not** mean 78% prediction accuracy. The dashboard also publishes Brier scores, five-bin calibration, sample counts and 95% whole-match bootstrap intervals.

The calibration report reveals a weakness: in England's highest-probability bin, the mean estimate is about 87%, but observed conversion is about 67% over only 30 shots. Rare high-quality chances can be overestimated. The interface shows this result, its sample size and uncertainty.

## Analytical insight and practical use

A conservative rule associates a shot with the nearest accurate same-team pass within ten seconds, with no intervening opponent event or stoppage. Crosses take precedence over through balls. This is a **preceding-pass association**, not a verified assist or full possession reconstruction.

Compared with other routes, cross-linked shots show **+0.100 model xG per shot in England** (95% interval 0.089–0.112) and **+0.094 in the World Cup** (0.066–0.126). Through-ball-linked differences are **+0.027** (0.018–0.037) and **+0.037** (0.018–0.058). These intervals condition on the frozen model and do not include model-training uncertainty.

For shots with no linked pass, both tiny positive point estimates repeat in direction, but both intervals span zero. The dashboard treats that comparison as inconclusive. Samples below 30 shots or five shot-containing matches remain descriptive.

The practical next action is to review those shot locations and source matches, then ask whether a team's chance profile reflects its intended attack. This is **not a recommendation to cross more**. Failed crosses that never produce shots are absent from this denominator, and opposition, game state and defensive context are not controlled. The analysis supports review and hypothesis generation; it does not establish a causal tactical effect or a demonstrated professional coaching benefit.

## Challenges and what I learned

For multiplayer, the difficult part was consistency: preventing simultaneous commands from taking the same turn, keeping picks unique, recovering seats after reload and retaining hidden tactics until the result. I also had to fit active choices and squads onto phone layouts while preserving existing careers and device saves. Automated checks covered reconnects, shared results, rematches, offline updates and save recovery. They do not replace human playtests or physical-device certification.

The difficult work was moving from attractive statistics to a defensible claim: avoiding outcome leakage, keeping evaluation independent, preserving zero-shot exposure, distinguishing head/body tags from verified headers and refusing to call an uncertain pattern a finding.

I learned that calibration and baseline comparisons can be more useful than one headline score. A dashboard should expose weak results as clearly as favorable ones. Browser inference is checked against 1,000 Python test vectors, alongside source/split, preprocessing, geometry, route and save-preservation checks.

## What's next

For the game, I want to improve onboarding through observed playtests and explore multiplayer beyond Draft Duel. Shared manager careers and real-time two-player match control are future possibilities, not current features.

Future work includes contextual features, out-of-fold calibration, sensitivity to the pass-linking window, possession reconstruction and more independent seasons. Observed playtests would help establish whether coaches and students interpret the visualizations correctly. Those are future steps, not completed validation.

## Development and eligibility disclosure

Touchline predates the current public repository. The chance-creation pipeline, held-out model and dashboard are a new contribution built on that disclosed game foundation. I am not claiming the entire application was created for AQX.

Next Byte restricts previously completed/submitted projects and requires the main work during its event; AQX states “No pre-made projects” and excludes earlier Data Bowl projects. The new feature does not establish eligibility: the organizer must resolve the existing-foundation boundary, and the entrant must confirm prior-event history. The existing foundation and contribution boundary still require organizer review; edits to this shared project do not establish eligibility for either event.

## Try it

- [Play the full game](https://touchline-draft-duel.aaravj117958.chatgpt.site/)
- [Challenge a friend in Draft Duel](https://touchline-draft-duel.aaravj117958.chatgpt.site/duel)
- [Open Analytics](https://touchline-draft-duel.aaravj117958.chatgpt.site/analytics.html)
- [Vercel Analytics](https://touchline-beta-ten.vercel.app/analytics.html)
- [Source and reproduction](https://github.com/aaravjj2/touchline/tree/main/scripts/analytics)
- [Original dataset](https://figshare.com/collections/Soccer_match_event_dataset/4415000)
- [Dataset paper](https://doi.org/10.1038/s41597-019-0247-7)