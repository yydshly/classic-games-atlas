# Recovery of the Meadow controller event test

Recovered file: `scripts/test_meadow_events.mjs`

Recovery location: `/workspace/shared/game-recovery/from-recorded-writes/meadow/scripts/test_meadow_events.mjs`

This file was recovered from complete original source text and complete write/patch commands still visible in the same worker conversation. It was not reconstructed from a summary, from remembered behavior, or from newly invented implementation. No restricted session directory was read. No source outside this test file was changed by this recovery worker.

## Exact-source provenance

1. The original creation command copied the prefix of `scripts/test_kart_events.mjs`, ending immediately before its first `await test('actual controller...` call, and applied explicitly recorded string replacements. The complete prefix was visible in two earlier read results: `sed -n '1,230p' scripts/test_kart_events.mjs` and `sed -n '230,560p' scripts/test_kart_events.mjs`. Neither relevant prefix segment was truncated.
2. The complete original append command for the controller input/lifecycle cases was visible, beginning with `function player(f)` and ending with the unfinished-match retry confirmation test.
3. The complete recorded replacements for inertial coasting assertions, the singular `tick` field, the Meadow canvas/match-list IDs, and the natural kickoff helper were visible.
4. The complete renderer-state instrumentation patch and complete checkpoint/goal/expiry/storage fixture append command were visible.
5. The complete 100 ms digital keyboard/pointer campaign bridge, eight-match campaign test, and before/after hash-report append command were visible.
6. The complete replacements for next-match auto-kickoff, the storage notice expression, and the initial idle frame in the tackle fixture were visible.
7. The complete subsequent patch adding deterministic `Date.now`, explicit source release checks, stricter modal assertions, corrected pagehide-resume handling, charge cap/native command/pointer ID tests was visible.
8. The final complete patch was visible. It changed the modal gameplay-key target to the background canvas, added goal-phase checkpoint save/reload coverage, made the rejected terminal fixture otherwise complete, and added locked-current plus neighboring-record salvage tests.

The creation and changes above were replayed in their original order. Two intermediate complete-file hashes were checked before applying the remaining recorded changes. Both matched their historical full-file SHA-256 values exactly, providing byte-level verification of the recovered original prefix and all changes through the second checkpoint.

## Historical byte-level checks

- First replayed complete baseline: 797 lines.
  - Historical SHA-256: `03b827b9a6e7a6cac785b12ec9049f7e295ef9a2581088ab5c7c2ad4b4d67fe8`
  - Recovered SHA-256: `03b827b9a6e7a6cac785b12ec9049f7e295ef9a2581088ab5c7c2ad4b4d67fe8`
  - Result: exact match.
- Second replayed complete baseline: 854 lines.
  - Historical SHA-256: `758692268c6bd551737222b135f8996eb22a3c82d3a52952833d02ddd8d90ff1`
  - Recovered SHA-256: `758692268c6bd551737222b135f8996eb22a3c82d3a52952833d02ddd8d90ff1`
  - Result: exact match.
- Final recovered revision after the last fully recorded patch: 874 lines, 55,959 bytes.
  - Recovered SHA-256: `35ab16484d4b3fa9488c06955b1fc8061eeec4bf8b04db90a1a65c10e8fcba7c`
  - No pre-loss full-file hash was recorded for this last revision. Its provenance is the byte-verified second baseline plus the complete final patch, not a claim of a separately matching final historical hash.

## Test status and limitations

Recovery validation: `node --check scripts/test_meadow_events.mjs` passed. No recovered behavior suite was executed during this recovery task.

The last completed historical suite used the second baseline above and reported 68 passes and one fixture failure. All eight actual-controller campaign matches won through ordinary 100 ms digital keyboard/pointer input. That remaining failure came from the fixture sending Space while the native help-close button was focused, which legitimately closed the dialog. The final recorded patch changed that fixture target and added four tests. The resulting expected total is 73 tests, but that final revision had not been behavior-tested before the executor became unavailable.

The historical eight-match results were 8–0, 13–0, 13–0, 4–2, 6–2, 15–0, 11–0, and 16–0. Those results apply only to that historical runtime/pilot combination. They are not fresh verification of recovered or later runtime changes. The last historical run reported all seven actual engine states rendered: ready, kickoff, playing, goal, paused, won, lost.

The harness uses simulated Node DOM/RAF/Canvas/storage surfaces with the actual controller, engine, progress and renderer modules. Historical or future passes do not constitute browser, visual, layout, accessibility, real-device pointer-capture, or audio verification.

No source-completeness gap remains for this test file. Runtime source recovery, physics fixes, current pilot validity, and final end-to-end acceptance are separate from this exact-write recovery.
