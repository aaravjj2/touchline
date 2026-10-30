# Draft & Europe photographs

Build 3.18.0-preview.2 changes presentation only. Draft pick rows, completed formation cards, competition squads and their shared views use locally bundled real player photographs. Manager, player career and the opening retain the original 3D artwork. No simulation, command, economy or save-format version changes.

## Coverage

904 distinct images, 1068 credited name records, plus 14 explicit current-card ID aliases. 460 of 566 unique Draft catalog names have photographs; 106 use a labelled placeholder. The broader catalog includes senior and youth registrations and historical aliases. This is not complete photo coverage. No generated replacement is disguised as a photograph.

Images may show another year or kit. Sources are Wikipedia player articles and their Wikimedia Commons file metadata. Only approved reusable license families with creator information are included. Article intros reject unrelated-name matches; shortened current cards use explicit aliases only when the same-club full-name match is unique. Ambiguous/missing identities are left unresolved. Credits record source, creator, individual license, verification date and thumbnail/framing notes. Credits are available from every Draft & Europe page.

## Reproduction

Run node scripts/fetch-player-photos.mjs to review/fetch sources and finalize the ledger, then node scripts/build-offline.mjs and node scripts/check.mjs. Review source changes before publishing: external pages can change. The stored credits and frozen local asset hashes describe this release. Photo licenses remain separate from the source-code MIT license.

## Verification

276 unit tests passed. All 15 focused Draft, Europe, portrait and offline browser journeys passed, including desktop/390px, exact recorded outcomes, unavailable-photo handling, installed-build upgrades, rollback, quota failure and save preservation. A separate browser audit decoded all 904 bundled images with zero failures. Syntax, imports, version consistency and all 5,391 offline asset hashes passed. The full 102-journey browser baseline and rendered-match performance benchmarks were not rerun for this photo-only change.
