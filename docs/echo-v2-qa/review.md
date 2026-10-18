# Echo v2 independent rules and controller review

## Scope and method

Reviewed the three-level model, level geometry, fixed-tick replay persistence, weapons, moving enemies, and the actual controller. Executable tests use Node, the public engine API, and a deliberately minimal DOM/Canvas stub. No browser execution or visual acceptance is claimed.

Ordinary success runs use only `input` and `advanceTicks`; no health, ammo, enemy, key, door, or position edits. A deterministic route follower collects the key, opens the gate, and reaches the exit. Level 2 deliberately takes the upper ammo supply route. These are automated legal-input runs, not human playtime estimates. Each run also restores its checkpoint before exit and compares player/enemy state.

## Final result

All 12 model cases and all 3 controller cases pass on the final reviewed files. All three ordinary legal-input runs win and restore accurately; the ordinary combat failure also settles exactly once.

## Evidence

- `ordinary-report.json`: per-level ticks, health, ammo, shots, kills, acquired ammo, command count, and score.
- `model-report.json`: 12 independent cases, including all three ordinary victories, ordinary combat loss, wall collision, pause freeze/input clearing, weapon cost/range/cooldown, chasing and warning lock, invalid input, and damaged replay validation.
- `controller-report.json`: real controller imported against minimal DOM, covering damaged-save preservation, frozen pause and cleared held keyboard, correct paused recovery, and reset clearing a valid old save.
- Reproduce with `node scripts/test-echo-independent.mjs` and `node scripts/test-echo-controller.mjs`.

## Findings addressed

- Level 2 hunter started in a wall; moved to a passable tile.
- Level 2 and 3 second ammo pickups started in walls; moved to passable tiles.
- A reset could leave a valid old save to reappear after refresh; reset now clears it while preserving damaged saves.
- Wide burst targeting now additionally checks line of sight to avoid hitting through corner cover.
- Negative command ticks in damaged checkpoints are now explicitly rejected; the regression passes.

## Limitations

The minimum DOM validates controller behavior and calls the actual renderer, but cannot establish CSS layout, actual image decoding, pointer delivery, or browser compatibility. The test suite does not claim exhaustive state-space coverage. The level-2 baseline route ran out of ammo against a blocking guard; taking the intended upper supply branch successfully completed the level without resource changes.
