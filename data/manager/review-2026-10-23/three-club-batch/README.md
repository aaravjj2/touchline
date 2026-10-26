# Barcelona, Real Madrid and Arsenal: source review batch

Reviewed 23 October 2026. Candidate-only work; the shipped catalog, gameplay, saves and replay rules are unchanged. This is a partial data milestone, not a verified-career release.

## Findings

- Fifteen additional birth dates are supported by official club, federation or league profiles. The exact URLs and values are in [facts.json](facts.json). Birth-date evidence does not verify a Transfermarkt identity mapping or August registration. Raya's legacy Premier League profile is available in the search index but returns 404 directly; that access limitation is recorded in the manifest.
- [Barcelona's 31 July transfer announcement](https://www.fcbarcelona.com/en/football/first-team/news/4550693/fc-barcelona-sign-jesse-bisiwu) identifies Bisiwu's birth date and agreement with Club Brugge. Its [4 August presentation report](https://penyes.fcbarcelona.com/en/news/4553723/jesse-bisiwu-presented-as-an-fc-barcelona-player/amp) reports the signed contract through 30 June 2031. Ownership and the published contract are reviewed; formal league registration, wage, fee and precise natural position remain unresolved. A winger description does not justify assigning striker or both winger sides.
- [Racing's official 31 August departure announcement](https://www.realracingclub.es/noticias/despedida-de-sergio-martinez-del-real-racing-club) describes Sergio Martínez leaving Racing for Madrid. The October Madrid registration is excluded from the 7 August candidate. The original full record and separately confirmed birth date are retained in [excluded-registration.json](result/excluded-registration.json). No Racing opening roster or replacement registration is inferred.

## Audit result

| Measure | Before | After |
| --- | ---: | ---: |
| Candidate players | 517 | 516 |
| Accepted claims | 24 | 41 |
| Required dataset issues | 4,145 | 4,118 |
| Unaccepted claims | 3,635 | 3,611 |
| Review-ledger errors | 0 | 0 |

The issue reduction includes removal of an ineligible candidate record; it is not 27 newly verified facts. Seventeen additional claims were accepted. The [fact diff](result/diff.json) records all 25 changed/removed claims, including Madrid coverage and the excluded player's seven claims. Previous accepted claim hashes remain identical.

Freeze fails as required: **4,118 dataset issues and 3,611 unaccepted facts** remain. Complete senior/youth coverage, unique identity mappings, cutoff registrations, ownership, loans, natural positions and financial game terms still require review. The existing sandbox remains the playable option.

## Reproduce and verify

From the repository root, choose a new directory that does not already exist:

```powershell
node data/manager/review-2026-10-23/three-club-batch/reproduce.mjs work/three-club-review-reproduction
node scripts/review-super-opening.mjs --input data/manager/review-2026-10-23/three-club-batch/result/candidate.json --reviews data/manager/review-2026-10-23/three-club-batch/result/reviews.json --output work/new-three-club-queue.json
node --test tests/super-review.test.js tests/super-integrated.test.js tests/super-career.test.js
```

The script pins the base candidate hash, refuses an existing output directory, retains every prior accepted review, binds new reviews to exact claims, checks that no precise winger position/registration/wage was invented, and asserts that freezing stays blocked. It applies a manually reviewed manifest; it does not automatically verify the truth of URLs.

Verification completed: all six generated JSON artifacts reproduce byte-for-byte in a second directory; all **33 targeted source-review/career/integrated-season tests pass**, including two seasons and exact reload continuation. Syntax, imports, release-version consistency and offline asset hashes pass. The independent audit exits 1 as expected under `--require-ready`; its [counts and issue CSV](audit.json) agree with the review queue. Browser/performance suites were not rerun for this candidate-only batch; the earlier 3.13 results remain separate evidence.

Next: reconstruct the three clubs' incoming/outgoing transfers through the cutoff, resolve exact natural positions for youth records, and document complete eligible-youth coverage. Then extend the same process to the other seventeen clubs. Financial estimates must remain explicitly authored unless published or reported evidence supports them.
