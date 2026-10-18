# Game 38 interface recovery

Recovered on 2026-10-18 UTC into this directory, preserving original relative paths.

## Provenance

The five files below were recovered exclusively from the complete file-writing commands and all subsequent successful patches visible in this interface worker's current conversation. No unavailable source repository, restricted session directory, remote service, or guessed source text was read or used.

The original controller write was replayed with the recorded successful changes in order: measured-report honesty and actual demand/reputation text; experience-score explanation; modal-action guards, restore notices and stale-frame rejection; held-key guarding and mid-slope measurement wording; terminal-current-checkpoint rejection. The HTML includes the recorded simplified-simulation disclaimer. CSS reflects the recorded removal of the empty import.

## Historical SHA-256 verification

The expected hashes were recorded at the interface freeze on 2026-10-18 03:02 UTC. Every recovered file exactly matches its historical hash; there are no missing or reconstructed-from-memory sections.

| Relative file | Bytes | Recovered SHA-256 (also historical expected value) | Result |
|---|---:|---|---|
| `games/coaster/index.html` | 8966 | `8f1f28da91f5a16b025667da08251be1419e4c6c3c6aa7e3cb73607c4081e6ed` | MATCH |
| `games/coaster/coaster.css` | 14849 | `ea17aaf431d56cac834dbc58d170718a8441af62bb425d71616ca99eab851b64` | MATCH |
| `games/coaster/game.mjs` | 28661 | `b3ed3af8386c18fd91bb774af95d87e5a7cd8b71c48b76ffeab6d8ef4ee6d3cd` | MATCH |
| `games/coaster/progress.mjs` | 4933 | `f993cf2d16295b9c812485563cb81c0d0a1a9e70f1c3b35bfbe4c4c584cc971e` | MATCH |
| `scripts/test_coaster_progress.mjs` | 6166 | `591b850b3fbf789e9bcad6178804dcdf2662f04934294ad3e56acf51dc431e6f` | MATCH |

## Verification scope

- All five SHA-256 checks passed after recovery.
- Recovered game.mjs passed Node syntax checking.
- Recovered progress and input tests are rerun separately; see the accompanying verification log.
- The historical pre-recovery controller verification was 28 passing groups, including eight natural UI wins. That historical result does not itself establish that the whole recovered project currently runs.
- This recovery owns only these five interface/progress files. Engine, levels, renderer, and other verification files must be recovered and integrated by their respective owners before full controller tests can run.
- No browser, real-device, layout, or accessibility test was run during this recovery.
- No installation, authentication, publication, deployment, or remote operation occurred.
