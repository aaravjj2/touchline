# Contract review — 24 October 2026

Latest local review: **281 accepted claims**, **3,838 dataset issues**, **3,357 unaccepted claims**, zero ledger errors. The current pointer is [review-current.json](../review-current.json). This is research data; the runtime catalog and existing saves are unchanged, and the verified career is still locked.

Ten official pre-cutoff announcements support exact published expiries and club contract affiliations:

| Player | Published contract expiry | Announcement date |
| --- | --- | --- |
| Pedri | 30 June 2030 | 30 January 2025 |
| Gavi | 30 June 2030 | 31 January 2025 |
| Lamine Yamal | 30 June 2031 | 27 May 2025 |
| Raphinha | 30 June 2028 | 22 May 2025 |
| Jules Koundé | 30 June 2030 | 15 August 2025 |
| Pau Cubarsí | 30 June 2029 | 13 February 2025 |
| Joan García | 30 June 2031 | 18 June 2025; signature confirmed 20 June |
| Alejandro Balde | 30 June 2028 | 20 September 2023 |
| Eric García | 30 June 2031 | 5 December 2025 |
| Gerard Martín | 30 June 2028 | 24 January 2025 |

The exact source URLs are in [contracts.json](contracts.json), including the separate Joan García signature report. These published agreement terms are not claims about salary, market value, actual league registration or future extensions. Nothing is charged to a saved career. No June 30 date is inferred from a source giving only a year or month.

Four additional position claims are explicit in those announcements: Raphinha LW, Koundé RB/CB, Joan García GK and Balde LB. Natural-position gaps for Lynch, Marello and Nizar remain unresolved. Provider listings are retained as reported leads in `pending`, without converting current profiles into verified cutoff evidence.

Eleven official source responses were captured successfully, with URL/status/hash metadata in [capture-index.json](capture-index.json); raw pages are under `work/source-captures-2026-10-24-contracts/`. Download success alone is not source verification.

## Reproduction

```powershell
node data/manager/review-2026-10-24/reproduce.mjs work/new-contract-review
node scripts/apply-reviewed-facts.mjs data/manager/review-2026-10-23/transfer-batch/position-result/candidate.json data/manager/review-2026-10-23/transfer-batch/position-result/reviews.json data/manager/review-2026-10-24/result/batch.json work/new-reviewed-batch
```

Both commands require a fresh output directory. The applier binds the base candidate, review ledger, named person and each old claim hash; it rejects stale inputs, duplicate/already-reviewed claims, unsupported fields, invalid evidence dates and invalid new values. All previous accepted hashes remain intact. It applies a manually reviewed manifest; it does not automatically verify websites.

The six outputs from the reproduction script match byte-for-byte in a second directory. The generic applier produces the same candidate/reviews and audit. Required review gaps still prevent freezing; no activation or migration path is invoked.

Source acquisition, local packaging and complete software verification are recorded in [the local review report](../../../docs/LOCAL-REVIEW-2026-10-24.md). Full review history: [previous batch](../review-2026-10-23/transfer-batch/README.md).
