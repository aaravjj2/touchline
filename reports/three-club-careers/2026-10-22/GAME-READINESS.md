# What Touchline still needs to become a complete game

Assessment after three independent full-season runs on the current 3.8 code. These are priorities for a coherent first release, not a demand to add every feature from a major football franchise.

## What is already working

The current build has manager, draft and player-career modes; playable physical fixtures; keyboard/touch input; repeatable training; a shared calendar and ownership model; negotiations; league/cup progression; local saves, archives and replay. The existing verification baseline is 187 unit tests and 53 browser journeys. That establishes substantial working behavior, but does not establish complete football realism, balance or human enjoyment.

In this assessment, all three independent worlds completed **380 league + 19 cup fixtures**: 1,197 fixture results in total. Each controlled club played 38 league and three cup matches. All final XIs and substitute cover were legal, cash reconciled on each date, and a separate continuation from round 19 reproduced each entire final career exactly. This report run did not repeat the browser suite or change game code.

## 1. Repair the transfer market before expanding it

Observed opposition transactions: **Barcelona world 33, Real Madrid world 27, Arsenal world 36**. These involved only **12, 8 and 14 distinct players respectively**. There were **8, 7 and 9 player/date groups** with multiple same-day transfers.

Example from Barcelona's world: Jobe Bellingham moved **Dortmund → Arsenal → Aston Villa → Dortmund → Inter on 8 August**. This is an actual sequence in the game ledger, not a real transfer claim. Other players circulated through several clubs or returned immediately to their original club.

Needed:

- Stop the same player from being repeatedly purchased/resold during one market update; define an appropriate season/window cooldown.
- Make recruitment respond to the intended slot, planned squad roles, incoming deals and previous purchases, rather than sequential opportunistic upgrades.
- Include player willingness, selling-club acceptance, playing-time expectations, contract/wage affordability and long-term positional cover.
- Add explicit transfer delegation if unattended managed clubs should recruit. Manual negotiations already exist; delegated recruitment is the missing layer.

Acceptance: no same-day cycles; coherent squads after both windows; balanced ledger; legal cover; user sales still require approval unless delegation is explicitly enabled. Re-run these same three seeds and a wider multi-season matrix after the fix.

## 2. Finish trustworthy starting data

The verified opening-day career is still locked. These runs use the **unverified October snapshot**, with authored starting ownership and game financial terms, on a fictional August-to-May calendar. It is not a reconstructed 7 August registration dataset.

Needed: official membership proofs, complete senior/eligible youth coverage, correct person identity, registration, ownership and loan-return terms, natural positions, contracts and dated source provenance. Published facts, reported estimates and game assumptions must remain visibly separate. Fix the import/audit pipeline rather than manually masking discrepancies in the UI.

Acceptance: the existing source-evidence gate passes reproducibly, and a new verified save can start without rewriting any existing career. Full additional countries are not required to achieve the first coherent release.

## 3. Unify football results and player statistics

The season button uses fast statistical matches. It produces team scores and proxy appearance counters; it does not produce individual scorer/assist/minute/substitution/injury records. Consequently a truthful full-season player scoring report cannot currently be generated from these runs. Physical games have richer event data, but not a complete common reporting model.

Needed: a common result/statistics contract across played, managed and fast-simulated matches; consistent competition and season records; sensible tactical/condition effects in each mode; injuries, cards and suspensions with calendar consequences where supported. Offside and other match rules must be consistent rather than silently varying by simulation path.

Acceptance: goals sum to team totals, appearances/minutes/substitutions reconcile, cups do not pollute league stats, and exact old replays retain their original rules. Use versioned rules for any simulation change.

## 4. Make weekly management matter

Under this policy, the three clubs completed **123 controlled-club fixtures with zero inbox decisions**. They received 11 transfer offers in total. This is one particular balanced/rotation policy, not proof that the inbox system can never trigger; it shows that a full season can currently advance with little managerial friction.

Needed: supported opponent preparation, understandable fatigue/recovery choices, player promises and playing-time consequences, contract planning, recruitment tradeoffs and board objectives that affect the season. Keep the Office focused on a few decisions; do not solve this by adding more passive cards or compulsory acknowledgment dialogs.

Acceptance: a healthy week is quick; congestion, missing cover, an unhappy player, an expiring contract and a financial shortfall each create a clear, consequential choice with a direct route back to the fixture.

## 5. Balance the economy and long-term world

With no managed-club transfer spending, balances grew **£90m → £108.46m**, **£100m → £120.51m**, and **£90m → £108.32m**. Receipts are authored and date-based. This is internally consistent bookkeeping, not a complete club business model.

Needed: calibrated budgets/wages/fees, sustainable opposition spending, meaningful owner/board constraints, credible income and expenses, and tested renewal/loan behavior over several seasons. The first-season reports stop on 29 May; June contract expiries and rollover need their own tests. Fixed membership and the original Super Cup are sufficient for this fictional first release; domestic promotion/relegation and every European competition can remain later expansions.

Acceptance: several seasons remain playable without automatic runaway cash, impossible wage bills, orphaned players or financially arbitrary renewals. Compare clubs across many seeds; three outcomes cannot establish balance or prove why one club did better.

## 6. Validate that playing is enjoyable on real devices

The latest controls/training work is implemented and tested in desktop Chromium and phone emulation. Actual phone handling, landscape ergonomics, gamepad support, accessibility beyond automated checks, camera comfort, receiving/passing, ball contact, defensive control and audio feedback still need human evaluation.

Acceptance: people can understand the controls, complete exercises and enjoy full matches on the reference devices. Profile the actual active GPU and physical phones, not just the headless reference. Select physics/animation changes from observed problems; another model overhaul is not the immediate priority.

## 7. Finish the release experience

Add a clear first session, robust help, understandable data/sandbox labels and release/update recovery. Expand save migration/crash recovery and cross-browser/device tests. Installability and offline asset/update handling follow once the core season is dependable. Accounts, cloud saves, multiplayer and live AI are optional later products, not prerequisites for a good single-player game.

## Recommended order

1. Fix transfer churn and add coherent recruitment/delegation policies.
2. Complete the data import/evidence milestone while preserving the playable sandbox.
3. Unify simulated/physical statistics and calibrate match/economy behavior.
4. Strengthen the weekly manager decisions, supported by physical-device playtests.
5. Finish onboarding, offline installation and update recovery for the first release.

The immediate goal should be **one trustworthy, enjoyable league-and-cup career**, rather than more modes or countries. Full per-club evidence is linked from [the comparison report](INDEX.md).
