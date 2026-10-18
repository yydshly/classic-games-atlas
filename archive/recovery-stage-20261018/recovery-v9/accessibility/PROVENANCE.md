# Recorded accessibility source recovery

These files are literal transcriptions of source text still visible in this worker's conversation tool outputs. They are recovery evidence in a separate directory, not edits to restored source. No inaccessible repository, restricted session directory, browser, network, or installation was used. No code was redesigned or recreated from a summary.

IMPORTANT: No historical SHA-256, Git blob hash, commit ID, or successful apply_patch input is visible in this worker's history. Hashes in RECOVERY_SHA256.json are computed now for these transcribed evidence files only. They do not establish identity with a lost historical repository.

Times below are UTC on 2026-10-18, taken from adjacent current_time_reminder messages; the tool result itself contains a chunk ID rather than an absolute timestamp. Literal text was copied with nl display line numbers removed; terminal display metadata is not source content. Combined records are explicitly composites from different reads and must not be mistaken for a single atomic historical snapshot.

## court.css.final-full-read.txt
- Original path: games/court/court.css.
- Coverage: entire final stylesheet, four source lines.
- Evidence: exec_command result chunk 2d5290, adjacent reminder 02:28:22; command included `tail -12 classic-games-atlas-nextgame-readonly/games/court/court.css`.
- That output contains all four lines, including the final <=560px intrinsic grid layout, static panel in row 2, 3:2 canvas in row 1, and static court-label in row 1.
- No additional patch was inferred.

## court.game.mjs.combined-record.txt
- Original path: games/court/game.mjs.
- Coverage: 42 lines, assembled from two literal source reads.
- Lines 1-6: result chunk 4684fa, adjacent reminder 02:24:25, original `nl -ba` complete Court controller output before this accessibility repair.
- Lines 7-42: result chunk 2d5290, adjacent reminder 02:28:22, command `nl -ba .../games/court/game.mjs | sed -n '7,50p'` after the accessibility repair.
- Lines 1-6 were NOT reread after the accessibility repair in this worker's visible history. There is no direct final-read proof of those six lines; they are explicitly retained earlier-source evidence.
- There IS evidence of intervening controller changes at lines 7 onward: new buttonKeys map, input clearing/control aggregation, replacement match focus restoration, and keyboard hold handlers. The earlier controller had 32 lines; the later read has 42 lines.
- No visible evidence indicates an edit to lines 1-6, but absence of evidence is not a historical hash match. Root must decide whether the composite may be merged.
- Separate span files preserve the temporal distinction.

## court.index.html.final-fragments.txt
- Original path: games/court/index.html.
- Coverage: ONLY two grep-returned fragments, not an HTML document. The heading fragment deliberately has no closing tag because grep did not return it.
- Evidence: result chunk 2d5290, adjacent reminder 02:28:22. Command used `grep -o '<dialog[^>]*>\|<h2[^>]*>先说好[^<]*' .../games/court/index.html`.
- Fragments verify `aria-labelledby="help-title"` and the matching heading ID. They must not overwrite the full HTML file.

## repair.css.combined-record.txt
- Original path: games/repair/repair.css.
- Coverage: 140 lines, assembled from literal earlier full read and later final tail.
- Lines 1-136: result chunk f08fdd, adjacent reminder 02:24:30. Command printed `nl -ba` for both game stylesheets; the visible Repair segment includes every one of these lines. (The surrounding tool output truncates part of Court's earlier stylesheet, not these Repair lines.)
- Lines 137-140: final result chunk 677104, adjacent reminder 02:29:10, command `nl -ba .../games/repair/repair.css | tail -7`. These lines also appear in result e8b0e4, adjacent reminder 02:28:12, from `tail -12`.
- The later outputs additionally repeat lines 133-136 verbatim; no discrepancy is visible there. Lines 1-132 were NOT reread in the final state in this worker's visible history.
- Intervening change evidence: parent stated it would move the existing non-playing min-height:390px and overlay-card max-height/overflow rules outside the <=540px media query. The final tail confirms that exact change, with a new two-line explanatory comment.
- Early source lines 137-142 are saved separately in repair.css.early-phone-footer.lines137-142.txt; do not append both old and new footers.
- No visible evidence indicates other intervening Repair CSS changes, but this is still a time-separated composite and lacks a historical hash.

## test_repair_layout.py.record.txt
- Original path: scripts/test_repair_layout.py.
- Coverage: complete 26-line file.
- Evidence: result chunk e8b0e4, adjacent reminder 02:28:12, command `nl -ba .../scripts/test_repair_layout.py`.
- Later execution in result 2d5290 reported all five static layout contracts passed. This is a historical tool result, not a new test run of recovered source.
- The recovered filename is evidence text; it is not installed as an executable test.

## Known omissions
- This worker has no original successful write/patch tool input for these edits.
- Final full Court index.html is not available from a single final read here.
- The final Court event test has visible partial reads but no single complete captured file, so it is not reconstructed in this set.
- No historical content hash is available for any item.
- No recovered source has been merged, overwritten, or run by this recovery operation.

## Additional earlier Court HTML evidence
- court.index.html.earlier-full-read.txt preserves the complete one-line pre-accessibility-fix HTML from chunk 4684fa, adjacent reminder 02:24:25.
- It is explicitly an EARLIER full read, not the final HTML. The final named-dialog fragments remain separate. No reconstructed final HTML was generated or merged.
