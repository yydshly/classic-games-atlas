# Meadow renderer source recovery

Recovery date: 2026-10-18 (UTC).

## Scope and method

Two source files were restored by copying their complete original write-file tool contents still visible in the current conversation, then applying every subsequent recorded patch in order. This was verbatim source recovery, not reconstruction from a description, a screenshot, or memory.

No restricted session directories were read. No network, installation, authentication, upload, push, deployment, new screenshot, PNG generation, video generation, or formal capture was performed during recovery. Shell commands used bash with login disabled and /workspace/shared as the working directory.

## Source completeness

### games/meadow/renderer.mjs

The complete initial heredoc write was visible, from the original football renderer header through the final export. The complete subsequent recorded patches were also visible:

1. Move the clock-state label from x=762 to x=820 and derive AI charge-pose amount from actual aiCharge/aiCharging state.
2. Align the rain, dusk, night, and final match palettes; add night lamps and wet-grass paint details.
3. Correct the canvas keyboard legend to Space for shooting, J for pass/tackle, and K for switching.
4. Correct the footer state priority for goal, pause, final whistle, ready, and kickoff.

These were the only renderer mutations after the initial write in the visible source record. The final renderer SHA-256 was explicitly recorded before the environment loss, including the original shell hash output at approximately 03:30:41 UTC.

### scripts/render_meadow_preview.mjs

The complete initial heredoc write was visible, including all imports, public-input simulations, action captures, projection checks, frozen-state checks, phone-scale output, optional video generation, and source-hash guards. The complete subsequent recorded patches were also visible:

1. Select the highest actual observed shot-flight snapshot for visual clarity, and accurately label that selection.
2. Add the eight-match contact-sheet capture before the performance benchmark.

These were the only capture-script mutations after the initial write in the visible source record. Its final SHA-256 was explicitly recorded in the original shell hash output at approximately 03:30:41 UTC.

## Exact-byte verification

Both restored files match their pre-loss SHA-256 values exactly:

- games/meadow/renderer.mjs
  - Bytes: 23022
  - Prior SHA-256: 93e19fa5d782cbb3d7350a372d7169efdeac6914346faf6eddc1c757ee4b209c
  - Recovered SHA-256: 93e19fa5d782cbb3d7350a372d7169efdeac6914346faf6eddc1c757ee4b209c
  - Result: exact match
- scripts/render_meadow_preview.mjs
  - Bytes: 14583
  - Prior SHA-256: d57ea59ada55f3d11a99bbc4198b55487e780693120aa443668fdfd3cef1335c
  - Recovered SHA-256: d57ea59ada55f3d11a99bbc4198b55487e780693120aa443668fdfd3cef1335c
  - Result: exact match

Both files also pass node --check. This is syntax-only checking; the modules were not imported or executed during recovery.

## Evidence boundaries

The original draft PNGs and draft JSON reports are not part of this recovery. They were lost with the old execution environment and have not been regenerated or relabeled as restored artifacts.

Before the loss, a draft-only render run had completed. No formal frozen capture or simulation video had started. Restoring these source files does not establish that formal evidence, browser verification, phone touch interaction, or deployment has occurred.

The separate source and test files owned by other workers remain outside this recovery record. Successful restoration of these two files alone is not a claim that the complete game repository is recovered.
