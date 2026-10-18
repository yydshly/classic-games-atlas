# Repair v2 refresh destination fix (r4)

## Change

The previous controller initialized `createGame(0)` on every load. A completed or failed shift has no active checkpoint, so refreshing always selected day 1 even though campaign records and unlocked days remained saved.

Initialize with the already-validated `progress.unlocked` instead. Existing valid unfinished-shift restoration still runs afterward and takes priority, even for an older day or a purchased ready setup. It remains paused until explicit resume. Invalid checkpoints are discarded without rewriting campaign records. After all eight days are completed, the validated maximum is day 8 (index 7).

Storage notices now distinguish completed-day records from an unfinished shift. They show the saved completed-day count, explain paused restoration, and identify the default day when no unfinished shift exists. The game module cache token is `20261018-resume-r4`.

## Scope

Runtime changes are only `versions/v2/games/repair/game.mjs` and `index.html`. The 8-day engine, levels, economy, persistence schemas/keys, controls, renderer, facing logic, CSS, and both r2/r3 sprite atlases are byte-identical to r3. No binary files, new days, new mechanics, or v1 paths are in this payload. `preservation.json` records before/after scope and hashes. v1 save-key isolation is exercised by the controller tests.

## Regression evidence

- Extended controller suite: 35 passed, 0 failed after the fix.
- The exact same extended suite against untouched r3: 29 passed, 6 failed. Five failures expose the old day-1 default; the older-active-shift test fails on old wording only. Valid older-shift restoration itself was not broken and is retained.
- Engine: 40 passed. Progress/input: 10 passed. Renderer: 5 passed. Facing: 5 passed.
- All runtime modules passed `node --check`.
- New cases: actual day 1 and day 2 wins followed by fresh controller initialization; eight completed days; malformed JSON and engine-invalid checkpoints; older active and purchased ready checkpoints; failure, refresh, and retry without a false win. Campaign serialized records are checked unchanged during initialization.

Run from repository root:

```sh
node validation/repair-v2/test_repair_controller.mjs
node validation/repair-v2/test_repair.mjs
node validation/repair-v2/test_repair_progress.mjs
node validation/repair-v2/test_renderer.mjs
node validation/repair-v2/test_facing.mjs
```

These are Node checks using the actual controller/engine with fake DOM/no-op canvas, not browser footage or browser acceptance. Full logs are under `logs/`. The change still requires published-page refresh validation: finish days 1 and 2, reload into day 3 ready, confirm records remain, and confirm an unfinished older day restores paused. The previously accepted r3 movement renderer is not changed here.

Base commit: `496fc328990477a3cbdab1743116db3e330b2c06`.
Base tree: `9395df6d2924aedea6caf0349b3541f8231ed489`.
