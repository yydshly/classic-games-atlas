# 雨街修理所 · Game 36 preview verification

Prepared 2026-10-18. This is an unaccepted preview based on a documented recovery boundary, not a formal release. Original published totals stay at 34 games / 398 levels. The runtime is under `preview/repair/`; this folder preserves the source evidence and the tests are under `validation/repair-preview/`.

## Passed checks

- Original engine: 40 tests, eight-day ordinary-command pilot passed.
- Original progress/input: 10 groups.
- New actual-controller regression: 26 groups, including eight natural wins/unlocks through the actual UI button handlers.
- Recovered static layout contract: 5 checks.
- New preview storage isolation: 2 groups.
- Module syntax, relative dependencies, source fingerprints, and unchanged existing-file inheritance.

The full test logs and their SHA-256 values are in `logs/` and `checks.json`. Tests use Node browser-surface substitutes; renderer drawing calls are no-ops. These are **not** real-browser, layout-pixel, real-device, accessibility, performance or human-difficulty acceptance.

The runtime byte hashes in `runtime-manifest.json` identify the exact tested candidate. The shipped test scripts are path-only relocations of the passing local suites, with syntax and import checks. They were not redundantly rerun after relocation; `test-relocation.json` records both versions. Run all tests from a repository checkout with:

```sh
bash validation/repair-preview/run_all.sh
```

The original engine/progress test assertions were preserved; only runtime import paths and the two intentional storage-key expectations changed. The missing historical controller test was not recovered: `test_repair_controller.mjs` is a new 2026-10-18 regression suite.

## Preview isolation

- Runtime storage keys: `atlas-preview-repair-20261018-progress-v1` and `atlas-preview-repair-20261018-shift-v1`.
- No production save migration, deletion or reads.
- Visible “独立预览 · 尚未验收” label and explicit preview metadata.
- `noindex,nofollow` requests search exclusion but provides no access control.
- Existing homepage/experiment anchor and favicon remain the shell dependencies.
- No changes to the catalogue, homepage, other games, existing previews, assets or workflows.

## Campaign proof

The actual-controller ordinary-button model reproduced the original engine pilot exactly:

| Day | Completed | Lost | Cash | Elapsed seconds |
| --- | ---: | ---: | ---: | ---: |
| 1 | 8 | 0 | 191 | 75.00 |
| 2 | 10 | 0 | 161 | 79.45 |
| 3 | 11 | 0 | 150 | 80.40 |
| 4 | 12 | 0 | 151 | 82.45 |
| 5 | 12 | 0 | 253 | 93.90 |
| 6 | 13 | 0 | 62 | 99.40 |
| 7 | 16 | 0 | 349 | 98.65 |
| 8 | 17 | 0 | 480 | 105.65 |

Coverage also includes loss without unlock, cash/maintenance/assignment controls, terminal-state controls, refresh to paused, ready-setup replay, corrupted and locked saves, denied storage, cancel/confirm restart and day switch, help→blur→close, visibility/pagehide, repeated keys, shortcut modifiers/editables, contact cancel/drag/mismatch and letterbox mapping. No private state setter or forced victory is present.

## Real-browser acceptance still pending

Use the public cloud browser after verifying the exact deployed commit and all seven runtime bytes. Do not infer acceptance from a Pages build or Node model.

1. Check desktop 1280×800, widths 1000/851/650/541, phones 390/320, landscape and 200% text/zoom. Ready/paused/results must leave both action buttons reachable without clipped cards or page-wide horizontal overflow.
2. Verify shell navigation/favicon and console/page/network errors.
3. Exercise native keyboard buttons and pointer/touch selection, including scroll, cancel, drag, repeat, focus changes and letterboxing.
4. Observe day-two electrical building/hiring/assignment, day-three repair fault, day-six wage reserve, day-eight faults, next-day unlocks and final ledger.
5. Verify help/blur/tab hide/pagehide/refresh always preserve a paused run; cancel/confirm restart and day switch preserve the proper state and records.
6. Verify real-origin persistence, storage failure and separation from other games/previews.
7. Inspect queue C, cashier, payment queue and elevated C sign during motion. Moving people may temporarily occlude each other.
8. Record reduced-motion, focus visibility, text enlargement, responsiveness/performance and human difficulty findings separately from model checks.

No new screenshots or videos are represented as recovered historical media. See `SOURCE_PROVENANCE.md` for exact boundaries and the one new CSS fix.
