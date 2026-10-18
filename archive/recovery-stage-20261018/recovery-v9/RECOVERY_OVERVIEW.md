# Recovery overview

Written on 2026-10-18 UTC as a **new recovery inventory**. This document is not a recovered original specification, release record, or historical QA report. No source files were changed to produce it.

## Scope and source of recovery

The previous cloud workspace became inaccessible. The original repository and its full artifact tree are not present in this recovery directory. Existing files here were transcribed from complete original file-writing commands and successful patches still visible to their authors, or from explicitly documented original read outputs. Missing text was not filled in from memory. Per-author provenance documents distinguish exact historical SHA-256 matches, matches to intermediate versions followed by recorded patches, and files with no historical hash available.

The separate early Game 35 ZIP was recovered from Library and verified by the coordinator. Its location is `../court35-v1.zip`, with extracted contents in `../court35-v1/`. SHA-256: `a9cf533bb6be850b0f9caf45e2b31064cc4eaf6d6ba3f75b9a82985b0823d2cc`. It is an early candidate, not the latest pre-interruption revision.

## Per-game status

### 35 — 晴湾篮场 / court

- The verified early Library ZIP provides an early playable-source candidate and its original packaged artifacts.
- `accessibility/` separately contains original later CSS/controller read records, HTML fragments and their provenance. Some records combine separately dated portions. They have **not** been merged into the early candidate.
- These read records have newly calculated hashes, without historical full-file hash comparison. Final complete HTML and the full later controller-event suite are not recovered by this batch.
- Latest pre-interruption Game 35 is therefore not fully restored. No new claim of latest-version playability or browser acceptance is made.

### 36 — 雨街修理所 / repair

- Seven runtime files and four supporting scripts have been recovered. Engine/levels/pilot/tests include the recorded final C-station queue changes; renderer includes its recorded final sign-position patch.
- Interface files reflect their original author's approximately 2026-10-17 19:14 handoff. Later UI changes are not silently assumed present.
- Later Repair CSS and a layout-test read record are stored separately under `accessibility/`. These have **not** been merged. Consequently this is a mixed, documented recovery boundary rather than a verified final frozen candidate.
- Most files have complete write/patch provenance but no historical hash available. Renderer reconstruction matched a historical intermediate SHA exactly, then applied the fully recorded final patch. See individual provenance files.
- New recovery checks: 40 engine tests and all eight business days passed with historical result fields reproduced; 10 progress tests and syntax checks passed. Full restored controller/browser integration has not been validated.
- Missing: original event-test source, original complete documentation/QA reports, original images/video and final candidate manifest. Later UI reconciliation remains pending.

### 37 — 潮原纪事 / civic

- Reviewer recovery is complete for seven available source files, with `PROVENANCE` documentation in the civic recovery tree. Three runtime files (`engine.mjs`, `progress.mjs`, `game.mjs`) and the pilot exactly match recorded historical SHA-256 values.
- The recovered early progress test matches its historical SHA from before test-name wording was corrected. Engine tests and the isolation script were recovered from complete original cat output, with no historical SHA available. These boundaries are explicit, not inferred as the final artifact set.
- Fresh storage/progress verification passed 10 groups.
- Four required runtime files remain missing: `levels.mjs`, `renderer.mjs` (complete source), `index.html`, and `civic.css`. The complete controller/event suite is also missing.
- This is not a complete runnable game. No complete restored-game validation is claimed. Partial renderer excerpts, if present, cannot substitute for a complete runtime file.
- Original full QA/media/documentation/manifest remain unavailable. Missing runtime content has not been invented to label it restored.

### 38 — 云岬游乐园 / coaster

- All seven runtime files and five supporting scripts are recovered. All seven runtime SHA-256 values exactly match recorded historical frozen values, both before and after fresh tests.
- Fresh recovery validation passed: 27 engine tests, 9 progress/input groups, 28 controller/event groups with zero failures. All eight campaign chapters passed through actual controller handlers on Node browser substitutes.
- Source is sufficient for a local browser entry point. Real browser execution, visual/device usability and performance have not been accepted.
- See `coaster/RECOVERY_VALIDATION.md`, `RECOVERY_RUNTIME_HASH_CHECK.json`, `RECOVERY_FINAL_INVENTORY.json`, and fresh `RECOVERY_RERUN_*.log` files.
- Missing original artifacts: random/layout/isolation test sources, SPEC/RUN/VERIFICATION documents, original QA logs/renderer reports, images/video and original manifest. Fresh recovery reports are not replacements for those historical files.

### 39 — 林野杯赛 / kart

- All seven runtime files and five supporting scripts are recovered. All seven runtime SHA-256 values exactly match historical frozen values, before and after fresh testing. Supporting progress-test source has complete recorded-write provenance but no historical hash available; this distinction is documented.
- Fresh validation passed: 26 engine tests / 135,780 checks, 16 progress groups, 32 controller/event groups with zero failures. All eight tracks naturally unlocked and won through actual controller handlers with 100 ms digital input decisions on Node browser substitutes.
- Source is sufficient for a local browser entry point. Real-browser/device input, human difficulty and visual acceptance remain pending.
- See `kart/RECOVERY_VALIDATION.md`, `RECOVERY_RUNTIME_HASH_CHECK.json`, `RECOVERY_FINAL_INVENTORY.json`, and fresh `RECOVERY_RERUN_*.log` files.
- Missing original artifacts are the same categories as Game 38: random/layout/isolation sources, original documentation, QA logs/renderer reports, images/video and original manifest.

### 40 — 草甸联赛 / meadow

- Seven runtime files and five supporting scripts have been recovered from recorded writes and patches. This restores an unfinished development snapshot, not a completed candidate.
- Renderer and capture-script hashes exactly match their historical values. Event-test intermediate versions exactly matched recorded hashes before replaying final recorded patches. Engine/interface files have complete recorded-write provenance but no historical final hashes available.
- Fresh engine testing reproduced the last unfinished state: 37 core tests passed, campaign 7/8; the fourth match remained a 3–3 draw and therefore a loss. The last match remained 16–0. Goalkeeper/defensive balance and remaining restore-boundary work are still open; high scores are not evidence of human difficulty acceptance.
- Final controller suite has not been rerun against this recovered unfinished version. Its syntax check does not establish gameplay acceptance.
- Missing original random/layout/isolation sources, SPEC/RUN documents and draft image evidence have not been regenerated. No final manifest or completed independent technical review existed before interruption.

## Shared limitations

- Nothing in this recovery batch is published or deployed. Original published-game counts must not be increased on this basis.
- None of Games 35–40 has newly passed real-browser or real-device acceptance through this recovery work. Node controller substitutes and native rendering history must not be described as real browser validation.
- No new images or videos were generated to masquerade as lost originals.
- The original base repository is absent from this tree; original-34 tracked-file isolation cannot be freshly rerun here. Recovery work has been confined to separate shared recovery paths.
- Old source fragments, historical test outcomes and recorded hashes are useful evidence, but only actually restored complete files count as recovered source.
- Library persistence and downloaded-archive integrity verification are performed separately by the coordinator. This file does not assert a final uploaded version or archive hash that has not yet been verified.
