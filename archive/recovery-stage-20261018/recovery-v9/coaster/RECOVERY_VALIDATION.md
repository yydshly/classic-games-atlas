# Post-recovery validation: coaster

New checks performed 2026-10-18 UTC. This report is not a recovered historical QA artifact.

- All 7 runtime files exactly match recorded historical frozen SHA-256 values, before and after testing.
- Restored engine suite: 27 passed, exit 0.
- Restored progress suite: 9 passed, exit 0.
- Restored controller/event suite: 28 passed, 0 failed, exit 0.
- All 8 campaign chapters passed via real controller handlers on Node browser substitutes. This is not real-browser/device verification.
- Reproducible commands: node scripts/test_coaster.mjs; node scripts/test_coaster_progress.mjs; node scripts/test_coaster_events.mjs.
- New raw outputs: RECOVERY_RERUN_test_coaster.log, RECOVERY_RERUN_test_coaster_progress.log, RECOVERY_RERUN_test_coaster_events.log.
- Per-file current hashes and missing-artifact list: RECOVERY_FINAL_INVENTORY.json.

## Still missing
Original random/layout/isolation test sources, original SPEC/RUN/VERIFICATION docs, old QA logs and renderer reports, original images/videos, and old manifest are unavailable. They have not been regenerated or represented as recovered. The original base repository is absent from this recovery tree; old-34 git isolation is not newly verified here.

Runtime recovery is complete for this candidate, but historical artifact recovery is incomplete. No browser test, publication, deployment, or gameplay modification occurred.
