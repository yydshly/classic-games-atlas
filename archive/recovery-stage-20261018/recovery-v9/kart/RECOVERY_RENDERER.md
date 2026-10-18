# Game 39 renderer source recovery

Recovery completed on 2026-10-18 UTC.

## Method and boundaries

The complete original renderer write, both successful renderer patch commands, the complete capture-script write, and its successful final threshold patch remained fully visible in the current conversation. The files below were restored from those recorded texts only, retaining their original relative paths.

No original repository read, restricted session-directory access, remote operation, package install, screenshot generation, video generation, or capture-script execution was performed. Commands used `/workspace/shared` as cwd and `login:false`.

The final recovered byte hashes match the exact historical frozen hashes recorded before the original formal capture and verified again after its last frame. This establishes exact recovery of these two source files, rather than a newly implemented approximation.

## Hash verification

- `games/kart/renderer.mjs`
  - Bytes: 26262
  - Historical SHA-256: `2452644a9a14b7e90a0e04b470b28221e611ba2740824b31f3c62946182333d5`
  - Recovered SHA-256: `2452644a9a14b7e90a0e04b470b28221e611ba2740824b31f3c62946182333d5`
  - Match: exact
- `scripts/render_kart_preview.mjs`
  - Bytes: 13506
  - Historical SHA-256: `ab008124d02571007469ce73d053d25f17708f9b765d5a5f46fe9e46ecef5db5`
  - Recovered SHA-256: `ab008124d02571007469ce73d053d25f17708f9b765d5a5f46fe9e46ecef5db5`
  - Match: exact

## Replayed recorded changes

Renderer patch 1: import RULES; fit overview to the correct outer road extent; bind drift-meter thresholds to RULES; align automatic acceleration, steering, brake, drift and item labels with actual controls; adjust footer color and baseline.

Renderer patch 2: use actual car names/colors; gate hit visuals on actual slow/collision/obstacle state; render actual pulse effects; reflect collision recovery in HUD.

Capture script patch: replace `r.game.time>=8)` with `r.game.time>=8-1e-8)`.

## Checks performed during recovery

- Both files passed `node --check` syntax checks.
- Both files matched their historical SHA-256 values exactly.
- The capture script was not executed. No runtime/visual tests were rerun.

## Evidence not recovered here

This recovery contains source text only. It does not restore the original PNGs, MP4, full `renderer-checks.json`, or capture logs, and does not claim new evidence for those outputs. The original capture's reported test outcomes remain historical reports, not newly reverified results.

Runtime dependencies (`games/kart/engine.mjs`, `games/kart/levels.mjs`, and `scripts/kart_pilot.mjs`) are outside this worker's recovery scope and must be restored separately before any authorized future execution.
