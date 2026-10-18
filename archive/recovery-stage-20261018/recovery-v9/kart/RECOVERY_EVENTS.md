# Kart controller-event test recovery

Recovered file: `scripts/test_kart_events.mjs`

## Exact historical identity

- Historical SHA-256, recorded after the final frozen 32-test run:
  `281efbc7dd8fb48b6e0f53f96995677da537036827b863809d9cfd71ba54cd63`
- Recovered SHA-256, computed from the restored bytes:
  `281efbc7dd8fb48b6e0f53f96995677da537036827b863809d9cfd71ba54cd63`
- Result: exact match.
- Size: 46,026 bytes; 710 lines.
- Recovery verification: `node --check scripts/test_kart_events.mjs` exited 0.

## Recovery source and method

The complete original fixture prefix was visible in the earlier two source-read results. The initial generation command, both complete append writes, and every subsequent successful patch were also visible. Recovery copied that recorded fixture prefix, replayed the initial transformations and append contents, and replayed the recorded patches in their original order.

The recovered file was not recreated from a description or from memory. No missing source section was invented. The original repository and restricted session directories were not read, and no remote operation was performed. All recovery shell commands used `login:false` and `/workspace/shared` as the working directory.

## Historical verification, not a new full run

The earlier frozen run finished with 32 passed, 0 failed, exit code 0. It exercised the actual `game.mjs`, engine, progress module and renderer using Node-only DOM, RAF, canvas and storage doubles. Eight sequential campaign races were won through ordinary keydown/keyup controls, with digital steering held for six physics ticks (100 ms). All eight finishes were first place, with zero off-road time.

The historical tests covered independent pointer IDs and mixed input sources, focus and release handling, repeated keys with omitted repeat flags, modal/blur pause behavior, the first resumed frame, countdown/playing/paused saves and restores, single terminal settlement, failure without unlocking, corrupt-save salvage and storage denial.

This recovery performed syntax and byte-identity checks only. It did not rerun the full controller suite or validate reconstructed dependencies. Neither the historical event test nor this recovery constitutes browser, visual, mobile-device, accessibility, audio or deployment acceptance.

## Historical frozen dependency hashes

These are the hashes printed by the historical successful test run. They are reference values, not claims that those dependency files were recovered or checked in this task.

| File | SHA-256 |
| --- | --- |
| `games/kart/index.html` | `b0a18cc2b1459ba8ce11d2fb326e2ff3207f7abe2e5078c48fe792d1bd8e5afc` |
| `games/kart/kart.css` | `416b12487d095539b91067ccc087c1b80210804c79da4c08d5fd61213c1a6356` |
| `games/kart/game.mjs` | `6a72eea073f9a96d7c5ec2000163c9111d019e880f2d460a38150d49d23b8fc4` |
| `games/kart/engine.mjs` | `fbdeec6051ce98623ce30656d5d8c43f6bce65e857e640a245624779b655b5eb` |
| `games/kart/levels.mjs` | `0b33259d6ff98e0320e6cde75838d520569247bb48cf556e7a214111512c684c` |
| `games/kart/progress.mjs` | `1d7080686fb73f30022a693786eae0cfb380d9b27a8f5c9e0ae89be15c9371b2` |
| `games/kart/renderer.mjs` | `2452644a9a14b7e90a0e04b470b28221e611ba2740824b31f3c62946182333d5` |
| `scripts/kart_pilot.mjs` | `ce6e83f9a4213cdcf65da4d669e87f223e53c6e4f115d6c320c1f6f4da2ba6e9` |
