# Coaster controller-test recovery

Recovered on 2026-10-18 UTC from the complete source text and successful edits already visible in this task's conversation. The original checkout and restricted session directories were not read. No network, authentication, push, deployment, installation, or browser operation was used.

## Recovered file

- Relative path: `scripts/test_coaster_events.mjs`
- Size: 46,346 bytes
- Lines: 752
- Historical final SHA-256: `596637029a2174e175e39376b0095932166e9cae335e90d72ed99492af2ba03e`
- Recovered SHA-256: `596637029a2174e175e39376b0095932166e9cae335e90d72ed99492af2ba03e`
- Result: exact byte-for-byte match to the recorded final version.

## Source completeness

The visible records contain the complete reused fixture prefix from the original read of `scripts/test_civic_events.mjs`, the initial transformation into the coaster fixture, every subsequent appended test block, and all successful fixture/test patches. Recovery applied those visible contents and changes only. No missing section was invented or recreated from a behavioral description.

The final recovered content includes the corrected keyboard event propagation and simulated performance clock, full-canvas coordinate mapping, and the added active-trial and terminal-replay restoration tests. These are the final changes present when the historical checksum was recorded.

## Verification

Current recovery verification:

- `sha256sum scripts/test_coaster_events.mjs`: matches the historical final checksum exactly.
- `node --check scripts/test_coaster_events.mjs`: passed, exit 0.
- The recovered suite was not executed against a reconstructed game runtime during this recovery step.

Historical verification, retained as historical evidence rather than a new run:

- `node scripts/test_coaster_events.mjs`: 28 passed, 0 failed, exit 0.
- Historical tested `games/coaster/game.mjs` SHA-256: `b3ed3af8386c18fd91bb774af95d87e5a7cd8b71c48b76ffeab6d8ef4ee6d3cd`.
- The eight sequential wins used actual controller button handlers and natural progression. Independent engine play was used only as a comparison oracle.
- Coverage used Node DOM, RAF, Canvas, and storage doubles. It did not constitute browser, visual, layout, accessibility, real-device pointer-capture, or audio verification.
