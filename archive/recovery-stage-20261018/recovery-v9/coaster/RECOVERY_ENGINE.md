# Coaster engine recovery record

Recovery completed on 2026-10-18 (UTC).

## Source and method

These four files were restored from the complete original file-write commands and every subsequent successful patch that remain visible in this task's conversation. Recovery did not use an abridged summary, inferred replacement code, a remote source, or a restricted session directory. Original relative paths are preserved.

The recorded final freeze check at 2026-10-18 03:01 UTC supplied the historical SHA256 values below. Every restored file matches its historical digest exactly. This establishes byte-for-byte equality with that recorded frozen version.

## Per-file historical hash verification

| Relative path | Historical SHA256 | Restored SHA256 | Result |
| --- | --- | --- | --- |
| games/coaster/engine.mjs | 54b15e62a5e3be6af4cf1f5426877ab6e6a5aea11383cc63c90d552851759ffd | 54b15e62a5e3be6af4cf1f5426877ab6e6a5aea11383cc63c90d552851759ffd | Exact match |
| games/coaster/levels.mjs | 5dbff9b3cd8a9653c6e57fd27725aa8b8cde52b4fb09504d6826854cd823601a | 5dbff9b3cd8a9653c6e57fd27725aa8b8cde52b4fb09504d6826854cd823601a | Exact match |
| scripts/coaster_pilot.mjs | a98c6a9f7705dda21558814e6382e6c7e14cb7660768fe9c9c852bcaa1916876 | a98c6a9f7705dda21558814e6382e6c7e14cb7660768fe9c9c852bcaa1916876 | Exact match |
| scripts/test_coaster.mjs | 06e5f2ec6035a1f646b6875eeacd123efbfabced46ad9272171db75db183f4e9 | 06e5f2ec6035a1f646b6875eeacd123efbfabced46ad9272171db75db183f4e9 | Exact match |

## Validation executed against the restored copy

- `node scripts/test_coaster.mjs`: 27 engine tests passed.
- `node scripts/coaster_pilot.mjs`: all eight levels won using ordinary public commands; two completed passenger runs and 180 reputation per level.
- The final level reproduced cost 805, thrill 34.92, comfort 89.92, revenue 810 and 5,043 simulation ticks.
- Validation was run on this recovered copy at approximately 03:46 UTC, after all four hash matches were established.

These results cover engine behavior and the public-command pilot. They do not independently establish browser rendering, device input, deployment, or recovery of any file beyond the four listed here. No installations, remote writes, pushes or deployments were performed during this recovery.
