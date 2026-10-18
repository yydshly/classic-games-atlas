# Game 39 engine recovery provenance

Recovery location: `/workspace/shared/game-recovery/from-recorded-writes/kart`

All four owned files are fully recovered from the exact original file-writing tool inputs and every successful subsequent patch still visible in the implementing worker's current conversation. All four recovered SHA-256 hashes match the historical final frozen hashes byte for byte. No source sections were supplied from memory, summaries, inference, or newly invented code.

No restricted session directory was read. No remote action, install, push, deployment, or upload was performed by this worker. Recovery commands used `/bin/bash`, `login:false`, with `/workspace/shared` as the working directory.

## Historical final hash comparison

The historical hashes below were recorded by the successful final `sha256sum` command at the original freeze on 2026-10-18 at approximately 03:14 UTC. Actual hashes were recomputed after recovery and again after tests, with no source edits in between.

| Relative path | Bytes | Historical SHA-256 | Recovered SHA-256 | Result |
| --- | ---: | --- | --- | --- |
| `games/kart/engine.mjs` | 13999 | `fbdeec6051ce98623ce30656d5d8c43f6bce65e857e640a245624779b655b5eb` | `fbdeec6051ce98623ce30656d5d8c43f6bce65e857e640a245624779b655b5eb` | MATCH |
| `games/kart/levels.mjs` | 4696 | `0b33259d6ff98e0320e6cde75838d520569247bb48cf556e7a214111512c684c` | `0b33259d6ff98e0320e6cde75838d520569247bb48cf556e7a214111512c684c` | MATCH |
| `scripts/kart_pilot.mjs` | 2583 | `ce6e83f9a4213cdcf65da4d669e87f223e53c6e4f115d6c320c1f6f4da2ba6e9` | `ce6e83f9a4213cdcf65da4d669e87f223e53c6e4f115d6c320c1f6f4da2ba6e9` | MATCH |
| `scripts/test_kart.mjs` | 15336 | `067a5259fc4de4149cb55906ccdf7d53e2ee59c5b0bb17da305e3dd9cc6d3321` | `067a5259fc4de4149cb55906ccdf7d53e2ee59c5b0bb17da305e3dd9cc6d3321` | MATCH |

## Recorded patch coverage

- Levels: replayed the recorded Catmull-Rom-to-uniform-cubic-B-spline coordinate replacement.
- Pilot: replayed the recorded lookahead/lateral-controller replacement, drift/safe-speed strategy update, and 6-tick held-input cache update.
- Engine: replayed the recorded sustained-drift update, final-pose synchronization, driver name/color update, accumulator normalization, zero-displacement finish guard, and stricter checkpoint phase/progress checks.
- Tests: replayed the complete recorded original write and the recorded wording-only change from “active replay after reload is bit-for-bit physical including timers and cooldowns” to “continued physical evolution after reload is bit-for-bit including timers and cooldowns.”

## Fresh validation of recovered files

- `node --check`: passed for all four recovered `.mjs` files.
- `node scripts/test_kart.mjs`: passed, 26 tests and 135,780 checks.
- All eight ordinary-input campaign races again finished first with 100 ms digital-control holds and no direct state edits during the campaign.
- Verified race times in seconds: 37.88, 36.87, 40.45, 38.13, 43.93, 41.58, 47.37, 46.88.
- Full fresh output is saved beside this report as `RECOVERY_ENGINE_TEST_OUTPUT.txt`.

The separate original randomized suite historically reported 213,750 checks and 640 restore round-trips. Its source file is outside this worker's four owned files and is not supplied or claimed freshly rerun by this recovery. No browser, renderer, controller, deployment, or complete-application validation is claimed by this engine-only report.

## Completeness and limitations

This directory now contains the complete exact frozen engine, authored levels, digital pilot, and mechanical test file that this worker owned. It does not by itself claim recovery of other workers' controller, renderer, artwork, documentation, previews, or unrelated game files. Those artifacts need their own provenance and validation.
