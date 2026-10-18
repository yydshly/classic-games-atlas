# Repair interface: recovery from visible recorded writes

Recovered on 2026-10-18 UTC by the original interface worker, `/root/prepare_next_game_cloud/build_repair_interface`.

## Scope and source

This recovery contains only the five files originally assigned to this worker. Their complete initial `cat` write bodies and all successful patches made by this worker remain visible in the current conversation. The files below were reconstructed from those bodies and patches, with their original relative paths retained.

The old repository was not read. No restricted session directory was read. No remote, network, install, publishing, browser-launch, or source-repository operation was performed during this recovery. Recovery shell commands used `login: false` and `/workspace/shared` as the working directory.

These are this worker's delivered versions, bounded by its last recorded successful patch on 2026-10-17, immediately before the 19:14:09 UTC time reminder. They are NOT asserted to be the final integrated repository versions. Later root or other-worker changes, including any later small-screen CSS fixes, are outside the visible source record and are not reconstructed or invented here.

## Per-file recovered checksums and version boundaries

No SHA-256 checksums of these original files were recorded in this worker's visible historical tool output. Accordingly, every historical hash is explicitly unknown. The hashes below were calculated from the newly recovered files on 2026-10-18; they are not presented as comparisons against unavailable historical hashes.

| Relative path | Historical SHA-256 | Recovered bytes | Recovered SHA-256 | Included version boundary |
| --- | --- | ---: | --- | --- |
| `games/repair/progress.mjs` | Not recorded / unknown | 5028 | `2b485bba6663670d362350410ed3b5c62759da011628ad7472f59fb01e8de4c6` | Complete initial write, before the 2026-10-17 19:08:04 reminder. No later patch to this file is visible. |
| `scripts/test_repair_progress.mjs` | Not recorded / unknown | 6842 | `1088dfc3c4bc10bd3771fa028b6ab60a55f0233168d504db3163547679daa505` | Complete initial write, before the 2026-10-17 19:11:51 reminder. No later patch to this file is visible. |
| `games/repair/index.html` | Not recorded / unknown | 8561 | `fce3444c63ed1d07a73fb937758103dff1209f5f718bb492faf4e32b75311255` | Complete initial write plus the successful manual-content patch, before the 19:13:32 reminder. |
| `games/repair/repair.css` | Not recorded / unknown | 15005 | `351a8837161d5fbccb94fe22acb3485eabbcba5b420e126313701e34c6d628b5` | Complete initial write plus the successful summary whitespace patch and this worker's mobile overlay-height patch, before the 19:14:09 reminder. Any later root CSS patch is excluded. |
| `games/repair/game.mjs` | Not recorded / unknown | 24774 | `d2648b451b6796debe4f640961f4dd4d02ae74fadf79497b6020327aa9fcbeae` | Complete initial write plus the successful focus/key-repeat, matching-pointer, and canvas state attribute patches, before the 19:14:09 reminder. |

Total recovered source/test bytes: 60,210. This manifest is additional recovery documentation and is not an original game file.

## Successful patches included

The times below identify adjacent time reminders in the recorded conversation, not independently measured patch execution timestamps. All dates in this section are 2026-10-17 UTC.

1. After the 19:12:25 reminder, before 19:12:54:
   - `game.mjs`: after an executed action and UI update, focus the next enabled upgrade/worker control if the previously focused button was removed; prevent repeated held Enter/Space default activation while retaining the initial native button press.
   - `repair.css`: append `white-space: pre-line` to the existing `.overlay-summary` rule.
2. After 19:12:54, before 19:13:03:
   - `game.mjs`: ignore unrelated pointer IDs before clearing the active contact on pointerup; introduce matching-ID `cancelPointer` for pointercancel, lostpointercapture, and pointerleave.
3. After 19:13:12, before 19:13:32:
   - `index.html`: replace the two manual entries concerning time/patience and campaign unlocking. The recorded replacement explicitly describes the loss threshold, 25-coin/four-second maintenance, wages, and unlocking only after a successful close.
4. After 19:13:32, before 19:14:09:
   - `game.mjs`: set `canvas-wrap.dataset.state` in `updateOverlay()`.
   - `repair.css`: append the recorded mobile media block giving non-playing overlay frames a 390px minimum height and scroll-safe overlay cards.

No other edits were added as part of recovery. No missing source segment was filled from an inferred design or from memory.

## Verification performed after recovery

- `node scripts/test_repair_progress.mjs`: all 10 original progress/input unit groups passed against the recovered `progress.mjs`.
- `node --check games/repair/game.mjs`: passed.
- SHA-256 and byte counts were calculated for all five recovered files.

These checks do not prove equality to unavailable historical hashes. They do not constitute browser, visual, layout, accessibility, real-device pointer, or integrated game verification.

## Historical verification, not rerun here

The visible original 2026-10-17 record shows a successful run of the 10 progress groups and a separate controller worker's 13 tests against the then-present engine, progress, renderer, and actual controller. The controller test script is not authored or recovered by this worker and that integrated suite was not rerun as part of this five-file recovery.

## Files owned by other workers

- `renderer.mjs` was assigned to `/root/prepare_next_game_cloud/draw_repair_workshop`, which directly confirmed its render/project/unproject/hitSlot API in this conversation. Its full original write is not present in this worker's record and is not reconstructed here.
- The engine and level definitions were owned by `/root/prepare_next_game_cloud/build_repair_engine`; excerpts and API messages here are not a basis to reconstruct their complete files.
- `scripts/test_repair_events.mjs` was owned by `/root/prepare_next_game_cloud/test_repair_controller`; its full write body is not present here.

The recovered controller still refers to these original relative dependencies. Those references have been preserved exactly; missing dependencies must be supplied from their own verified source records before claiming an integrated runnable recovery.
