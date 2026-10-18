# Game 36 renderer and capture-script recovery

Recovery date: 2026-10-18 UTC.
Recovery root: `/workspace/shared/game-recovery/from-recorded-writes/repair`.

## Scope and method

The original repository was reported unreadable. These two source files were restored solely from the complete, currently visible successful file-writing commands and successful replacement patches in the renderer worker's conversation. No restricted session directory, remote repository, remote operation, image generation, original-repository read, or reconstruction from a prose summary was used.

Relative paths are preserved. The restored sources have not been reformatted or redesigned. Only `node --check`, byte counts, and SHA-256 calculations were performed during recovery. The capture script was NOT executed, and no PNG, MP4, benchmark, gameplay result, or runtime verification was regenerated.

## 1. games/repair/renderer.mjs

Recovered size: 28,763 bytes.
Recovered final SHA-256:

`b75424f0b3f85f4a5a5e561604c71d40c3e7ec322f66a603569fc0aa1fb4369e`

### Visible source records

- Complete original successful `cat > games/repair/renderer.mjs <<'EOF'` write from 2026-10-17, including every helper, architectural illustration, workstation, character renderer, projection function, and exported render function.
- Successful font-family and blocked-robot replacements: add the existing Noto Sans CJK family; blocked clients get concerned expressions, an ellipsis, and patience bars.
- Successful compact-payment-counter and fixed-counter-sign replacements: preserve simulation positions while applying the recorded art-only transform and sign locations.
- Successful active/blocked station replacements: pass robot status, distinguish occupied/service/blocked activity, stop active equipment animation when blocked, and show the waiting-technician badge.
- The visible static-background-cache insertion was subsequently fully removed by a successful recorded command. Its net source change is zero; no cache is present in the recovered final file.
- Final successful C-plaque replacement: only C's identity plaque uses `labelY = y - 120`; every other workstation retains `y + 45`. This is the last visible runtime edit before the parent accepted the targeted readability fix and froze the renderer.

### Historical hash verification

The conversation contains an actual historical tool result printing this renderer SHA-256 before the final C-plaque edit:

`d8265e9c946d21690a7ff2ae0e9b068a68f771b45bc2050ff435d12a4e1b1959`

Recovery first reproduced the original write and all preceding successful patches. The reconstructed pre-C-plaque file matched that historical checksum exactly. Only then was the final, fully visible single-line C-plaque replacement applied. This provides a byte-for-byte historical checkpoint, rather than merely a visual or semantic resemblance.

The original-write-only transcription also has this recovery-computed SHA-256:

`a9b1dd55afb40690cfd4c8e718860d89d8cf0ee1804516e2c497fd6f940887c7`

That original-write-only hash was computed during recovery and is not represented as an independently recorded historical checksum.

### Version boundary

This is the final renderer visible in this worker's record after the accepted C readability change on 2026-10-17. It does not include hypothetical later edits. C queue coordinates themselves belong to the separately maintained engine, not this renderer. The visible approved engine targets at this boundary were `(736,320)`, `(796,320)`, `(856,320)`, but no engine file was synthesized by this recovery worker.

Exported API remains:

- `render(ctx, state, options)`
- `project(x, y, z = 0)` returning `{x, y}`
- `unproject(px, py)` returning `{x, y}`
- `hitSlot(px, py)` returning `A`–`F` or `null`

Logical renderer coordinates are 1200 by 800. The known historical limitation remains: moving people can momentarily occlude one another, and real browser/mobile readability was not verified by the offscreen evidence.

## 2. scripts/render_repair_preview.mjs

Recovered size: 8,495 bytes.
Recovered final SHA-256:

`4b4ac1f59c946509833eb5374254e65e50edd78f356f11010d4bb8028856d650`

### Visible source records

- Complete successful initial `cat > scripts/render_repair_preview.mjs <<'EOF'` write from 2026-10-17.
- Complete successful final Python replacement patch adding `readFileSync` and `createHash`, informational native rendering timing, optional ffprobe verification, current renderer/engine SHA-256 fields, the targeted C readability-change fields, and `renderer-checks.json` output.

The recovered file is the original full source plus that final visible successful patch. There is no independently printed historical checksum for the capture script in this worker's visible record. Its checksum above is a recovery-time fingerprint, not a claimed historical checksum match.

### Version boundary and dependencies

This is the final capture-script version used by the last successful recorded `node scripts/render_repair_preview.mjs --video` execution. Its still-image example legally builds all six bays using public engine commands and earned income. Its optional video deliberately depicts day eight's actual simulation interval 14–24 seconds; it is not a video of the six-built-bay screenshot at 70.8 seconds.

The script imports the separately owned `games/repair/engine.mjs` and `scripts/repair_pilot.mjs`, and expects the existing `@napi-rs/canvas`, Noto CJK fonts, ffmpeg, and ffprobe. Those dependencies were not installed, fetched, recreated, or executed during this recovery.

The prior successful run reported six bays built at 70.8 seconds and a final win at 110.15 seconds with 15 completed, 2 lost, and 456 cash. These values are historical observations only, not newly rerun recovery results.

## Excluded material

The historical PNGs, MP4, simulation log, renderer-checks JSON, engine, levels, pilot, UI files, and any later manifest are not recreated here from summaries. This recovery contains only the two complete text sources available in this worker's visible writing record and this provenance document.

## Recovery validation

- Both restored `.mjs` files passed `node --check`.
- The renderer's pre-final-patch bytes matched the independently visible historical checksum exactly.
- Final source sizes and hashes are listed above.
- No import execution, game simulation, browser test, image render, video encode, network operation, or remote publication occurred during recovery.
