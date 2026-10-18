# Source recovery boundary and new candidate edits

This is a new 2026-10-18 audit, not a historical release or QA report. The original complete latest repository was unavailable. Recovery used complete recorded successful file writes/patches and documented file-read evidence, never memory-based reconstruction or inaccessible session logs.

## Available complete source

Seven runtime files and four supporting scripts were available. `recovered-source-manifest.json` records their byte counts, new SHA-256 fingerprints and archive comparisons.

- Engine, levels, pilot and engine tests retain the documented final C-station queue changes, precise ready/start checkpoint boundary, queue reflow and service-blocking patience behavior. All complete recorded edits are included. No historical final hash was available for most of these files.
- Renderer recovery matched historical pre-C-sign SHA-256 `d8265e9c946d21690a7ff2ae0e9b068a68f771b45bc2050ff435d12a4e1b1959`, then applied the fully recorded final C-label-height patch. The resulting renderer hash is `b75424f0b3f85f4a5a5e561604c71d40c3e7ec322f66a603569fc0aa1fb4369e`.
- Interface HTML, CSS, progress and controller are the complete approximately 2026-10-17 19:14 handoff versions. They are not claimed to contain all missing later integration edits.
- The complete historical controller-event source and historical final QA/media/manifest were not recovered. A new controller suite supplies fresh, explicitly model-only evidence.

Two available archives, `games-recovery-checkpoint-01.zip` and `checkpoint-v9.zip`, match all available complete Repair source files exactly. The earlier `checkpoint-v5.zip` contains only six Repair files; its engine predates the final queue/replay fixes, while its other five available files match. The final candidate uses the complete later recovery, without silently mixing that earlier engine back in.

## Later CSS evidence and minimal new fix

The later CSS read evidence is a time-separated composite: lines 1–136 from an earlier full read; final lines 137–140 from a later tail. The complete earlier stylesheet's first 136 lines match that evidence exactly, and the last fragment shows the intended all-width briefing guard. There is no historical full-file hash proving that composite was the final source.

The candidate therefore starts from the complete earlier CSS and applies one clearly new minimal fix: move its existing non-playing `min-height:390px` and overlay-card `max-height:100%; overflow-y:auto` rules outside the phone-only media query. This covers short intermediate/two-column canvases while leaving playing height and all illustration styles intact. The recovered five-contract static test fails against the older guard and passes with this fix. Actual pixel/zoom/focus behavior still needs browser verification.

No uncertain fragment was used to replace a complete controller or HTML file.

## Candidate source differences

Four of seven runtime files now differ from the complete recovered source:

- `index.html`: preview title/description/label/footer and noindex metadata; later matched CSS/controller cache-version query strings.
- `progress.mjs`: the two preview-only localStorage keys.
- `repair.css`: the minimal all-width briefing protection above, plus the later explicit width constraints, global contain mapping and 12px overview scroll margin documented in `VIEWPORT_FIX.md`.
- `game.mjs`: a later minimal post-browser fix scrolls the overview into view only after explicit Start/Continue.

The other three files (`engine.mjs`, `levels.mjs`, `renderer.mjs`) are byte-identical. Full reversible unified diffs for the four changes are in `diffs/`; their original and candidate hashes are in `runtime-manifest.json`. Thus complete original runtime bytes can be verified from unchanged files plus reverse-applied diffs, without presenting the candidate as an exact restoration of a missing final release.

The original engine/progress suites and pilot are preserved with only necessary relative paths and intentional preview-key expectations. `original-test-adaptations.json` records fingerprints. Fake-DOM primitives for the new controller suite came from the available recovered Kart event-test harness; its Repair scenarios and assertions were newly authored. No automated test silently lowers goals, supplies cash, unlocks days, assigns private state or awards a victory.
