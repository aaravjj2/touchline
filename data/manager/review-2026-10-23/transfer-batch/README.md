# Opening-day source review: transfer and biography batch

Reviewed 23 October 2026 against the **7 August 2026, 23:59 UTC** cutoff. This extends the earlier three-club candidate. The runtime catalog and existing careers are unchanged; the verified option remains locked.

**Latest:** the focused position follow-up adds seven more accepted claims, bringing the final ledger to **257**. Use `position-result/candidate.json` and `position-result/reviews.json` for continued work. [Final queue](position-queue.json.md) · [Final audit](position-audit.json) · [Follow-up summary](position-result/summary.json).

UEFA's [2025 technical-observer selection](https://www.uefa.com/under17/news/029a-1dedaf7617c0-1ad2367240dd-1000--2025-u17-euro-team-of-the-tournament/) explicitly names Bisiwu at **LW**. Lens's [26 June signing biography](https://www.rclens.fr/fr/rclens-michael-cuisance-arrivee-mercato-20262027) documents Cuisance's **CM / AM / RW** roles and ownership; his official profile supports his birth date. Inter's [16 June permanent-signing announcement](https://www.inter.it/en/news/inter-complete-the-permanent-signing-of-mattia-marello) establishes Marello's ownership. Villarreal's [12 May renewal](https://villarrealcf.es/es/el-villarreal-cf-renueva-a-nizar-el-jmili/) establishes Nizar's ownership and birth date, retaining the published **June 2027** precision rather than applying his October 2030 renewal at cutoff. Broad winger/defender labels still leave Lynch, Nizar and Marello's precise positions unresolved.

Final totals: **197 additional reviewed birth dates** (195 remain in the revised candidate, two retained externally), **12 ownership claims, six exact contract expiries and three position claims** added during this turn. The ledger rises from 41 to 257. Dataset issues fall to **3,872**, unaccepted claims to **3,381**, with zero ledger errors. Six final follow-up artifacts also reproduce byte-for-byte. Run `node data/manager/review-2026-10-23/transfer-batch/position-follow-up.mjs NEW_DIRECTORY` after reproducing the base batch below.

**Verification:** all **255 unit tests pass**, including integrated seasons/reloads and two new source-capture tests. Syntax/import/version/offline asset hash checks pass. Both independent audits and freeze checks remain blocked as intended. Browser/performance suites were not rerun for this data/tooling-only work. The full unit log is `work/source-review-unit-tests.log`.

The final source archive totals **80 requests, 77 successful HTTP captures and three rate-limit failures**. The additional seven position-source captures are in `work/source-captures-2026-10-23-positions/`, indexed by [capture-positions.json](capture-positions.json). Identical client-shell responses on the two Villa URLs do not establish position facts; their differing indexed lineup labels remain unresolved. The following sections retain the initial batch's 250-claim checkpoint and source counts for reproducibility.

## What changed

- Reviewed **195 additional birth dates**: 180 from named rows in FIFA's official World Cup squad lists and 15 from official Madrid/Barcelona profiles. Of these, 193 belong to the revised candidate; two are retained with excluded registrations. Five proposed name matches were rejected, including Jurriën/Quinten Timber, Jack/Tyler Fletcher and a substring match between Enes Ünal and Senesi. These reviews do not authenticate Transfermarkt identity mappings.
- Added **nine ownership claims**, **six exact published contract expiries**, and one precise natural-position claim. Adeyemi's official biography explicitly supports LW, RW and ST. Other wingers retain their own eligibility requirements.
- Corrected three provisional club assignments: **Rodri → Manchester City**, **Gabriel Jesus → Arsenal**, **Konsa → Aston Villa**. Their transfers to the October clubs postdate cutoff. These corrections do not assert formal cutoff league registration, which still needs evidence.
- Excluded the October **Livaković/Barcelona** and **Guimarães/Arsenal** registrations from the opening candidate. Their full records and newly reviewed biographies remain in [excluded registrations](result/excluded-registrations.json). The earlier Martínez exclusion remains in the preceding batch.
- Recorded unresolved Cancelo loan continuity, Espart's youth eligibility and Gerard Martín's precise position. Also flagged current roster names missing from the candidate: Mendy, Pitarch, Fariñas and Bardghji. Current-roster presence alone does not establish cutoff eligibility.

## Published contracts

| Player | Published expiry | Official announcement |
| --- | --- | --- |
| Ibrahima Konaté | 30 June 2030 | [18 June](https://www.realmadrid.com/es-ES/noticias/club/comunicados/comunicado-oficial-konate-18-06-2026) |
| Marc Cucurella | 30 June 2032 | [15 June](https://www.realmadrid.com/es-ES/noticias/club/comunicados/comunicado-oficial-cucurella-15-06-2026) |
| Denzel Dumfries | 30 June 2030 | [5 July](https://www.realmadrid.com/es-ES/noticias/club/comunicados/comunicado-oficial-dumfries-05-07-2026) |
| Bernardo Silva | 30 June 2028 | [17 June](https://www.realmadrid.com/es-ES/noticias/club/comunicados/comunicado-oficial-bernardo-silva-17-06-2026) |
| Yan Diomande | 30 June 2033 | [6 August](https://www.realmadrid.com/es-ES/noticias/club/comunicados/comunicado-oficial-diomande-06-08-2026) |
| Carlos Espí | 30 June 2031 | [30 July](https://www.realmadrid.com/es-ES/noticias/club/comunicados/comunicado-oficial-carlos-espi-30-07-2026) |

Gordon's source gives **2031**; Adeyemi's presentation gives **June 2031**. Those precision levels are retained in `contractPublication`; neither is converted into a supposedly published 30 June game contract. No undisclosed fee, wage, loan split or release clause is invented. Published contract expiry is separate from market value and authored potential.

## Why the transfer dates matter

[Rodri's 18 August signing](https://www.fcbarcelona.com/en/football/first-team/news/4561501/fc-barcelona-sign-rodrigo-hernndez), [Jesus's 1 September signing](https://www.fcbarcelona.com/en/football/first-team/news/4570072/gabriel-jesus-signs-for-fc-barcelona), and [Livaković's 27 August signing](https://www.fcbarcelona.com/en/football/first-team/news/4566933/dominik-livakovi-is-a-new-blaugrana-player) cannot establish opening-day Barcelona registrations. The league's [21 August Konsa report](https://www.premierleague.com/en/news/4536241/what-happens-when-you-have-four-players-from-one-club-in-your-fpl-squad) also explicitly describes unfinished regulatory processes. Its [Guimarães report](https://www.premierleague.com/en/news/4687385/the-briefing-rices-message-to-guimaraes-mourinho-latest-bellingham-watches-arsenal) dates the Arsenal switch to the weekend of 8 August.

Cancelo needs a different review: the [January announcement](https://www.fcbarcelona.com/en/news/4433680/joao-cancelo-becomes-an-fc-barcelona-player) describes a loan until season end, followed by an [August permanent signing](https://www.fcbarcelona.com/en/football/first-team/news/4562497/joao-cancelo-a-culer-until-2029). Neither alone establishes the exact cutoff loan/registration state. Likewise, an August senior promotion does not rule out an earlier eligible youth registration.

## Source archive and reproduction

The manifests contain 73 source requests: **70 successful captures and three HTTP 429 failures**. Archives are under `work/source-captures-2026-10-23-{transfers,rosters,profiles,fifa}/`. Their URL, HTTP status, final URL, byte length, timestamp and SHA-256 indexes are retained here in `capture-*.json`. Raw HTML/PDF lives in the local work directories, separate from runtime assets. A 200 response or hash is not fact verification. The downloader now stops requesting a host after a 429; no bypass or retries were used for the failed profiles.

FIFA's July document contains stale club labels, including players with earlier announced transfers. Only named birth-date rows are used. Its page numbers and original source SHA-256 are recorded in [fifa-biographies.json](fifa-biographies.json). Official-profile facts and hashes are in [profile-biographies.json](profile-biographies.json). The exact transfer/position decisions are in [decisions.json](decisions.json).

Run from the repository root with a new output directory:

```powershell
node data/manager/review-2026-10-23/transfer-batch/reproduce.mjs work/new-transfer-review
node scripts/review-super-opening.mjs --input data/manager/review-2026-10-23/transfer-batch/result/candidate.json --reviews data/manager/review-2026-10-23/transfer-batch/result/reviews.json --output work/new-transfer-queue.json
node scripts/audit-super-opening.mjs --input data/manager/review-2026-10-23/transfer-batch/result/candidate.json --output work/new-transfer-audit.json --require-ready
```

The last command deliberately exits 1 while blocked. The reproduction script pins the prior candidate hash, preserves all accepted prior claims, keeps one record per person, binds new reviews after provisional club corrections, preserves excluded identities, and refuses an existing output directory. It asserts that no wage, formal registration or exact day from a partial expiry was invented, and that freeze remains blocked.

## Remaining gate

| Measure | Before | After |
| --- | ---: | ---: |
| Candidate people | 516 | 514 |
| Accepted claims | 41 | **250** |
| Dataset issues | 4,118 | **3,884** |
| Unaccepted claims | 3,611 | **3,388** |
| Review-ledger errors | 0 | **0** |

There are **209 new accepted claims**. An issue count is not a count of false football facts, and exclusions also reduce issue totals. All seven generated artifacts reproduce byte-for-byte. The queue and independent audit agree; verified-candidate freeze still fails. See [summary](result/summary.json), [complete claim diff](result/diff.json), [club review queue](queue.json.md) and [follow-ups](result/follow-ups.json).

The largest remaining work is complete cutoff senior/youth coverage, provider identity matching, actual registrations, ownership/loans, precise positions and playable financial terms. Next, resolve the explicit follow-ups and reconstruct the three clubs' remaining arrivals/departures, including players currently assigned to other selected clubs. Broader biography sources are still needed for non-World-Cup players. Then repeat the dated transfer reconstruction for the other seventeen clubs. None of this changes a saved world's embedded dataset.
