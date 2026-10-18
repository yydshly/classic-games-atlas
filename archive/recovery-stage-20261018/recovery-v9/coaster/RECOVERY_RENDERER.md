# Coaster renderer source recovery

Recovery date: 2026-10-18 UTC.

## Recovered files

- `games/coaster/renderer.mjs`
  - Size: 26,783 bytes
  - Historical SHA-256: `7977174b5f390bc18b990942d802306ee4c15d5668a53a2edd9f02f5a97ef3f4`
  - Recovered SHA-256: `7977174b5f390bc18b990942d802306ee4c15d5668a53a2edd9f02f5a97ef3f4`
  - Result: exact byte-for-byte match to the historically recorded final version.

- `scripts/render_coaster_preview.mjs`
  - Size: 12,970 bytes
  - Historical SHA-256: `5760fbe8d510b71e88f3da8c1553ab7a6a3137dadda452650487a0d3e7eb168f`
  - Recovered SHA-256: `5760fbe8d510b71e88f3da8c1553ab7a6a3137dadda452650487a0d3e7eb168f`
  - Result: exact byte-for-byte match to the historically recorded final version.

## Provenance and method

The original complete file-writing text and every subsequently successful renderer edit were present in the current conversation. The renderer was restored from that complete original text, followed by the recorded successful edits in their original order: onboard/prior-state fields; diagnostic severity, separate segment labels, testing text and passenger drawing; plaque hit targets and pavilion; final station-area plaque offsets. The capture script required no subsequent source edits.

Both recovered file hashes were compared with the final SHA-256 values previously recorded after the original frozen-source capture. Both match exactly. This establishes source-file identity; it does not constitute a new runtime or browser test.

## Boundaries

- No source was read from the unavailable original repository.
- No restricted session directory, remote service or network source was accessed.
- No missing source was inferred or invented.
- The renderer and capture script were not executed during recovery.
- Images, the MP4, frame-state JSON and other earlier generated evidence were not regenerated or claimed recovered by this work.
- Existing historical verification results remain historical; this recovery only verifies the two recovered source files against their recorded final hashes.
