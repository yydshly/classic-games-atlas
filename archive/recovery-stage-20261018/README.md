# Recovery stage archive — 2026-10-18

This is a non-deployed preservation checkpoint. Read the [current stage overview](../../RECOVERY_OVERVIEW.md) before using any candidate.

## Immutable imports

| Directory | Library version | ZIP bytes | ZIP SHA-256 |
| --- | --- | ---: | --- |
| `recovery-v9/` | `libfile_e637179f9cdc8191a483cf46c85f2475`, v9 | 354549 | `e6ec9a4ee06bfdfe80fd57d5cd5a51bb040d428c69d48c0d87a8217ff6524622` |
| `court35-v1/` | `libfile_23d1659b5e248191b64dc4065d752235`, v1 | 1357006 | `a9cf533bb6be850b0f9caf45e2b31064cc4eaf6d6ba3f75b9a82985b0823d2cc` |

Original files are unchanged, including historical reports, paths and limitations. References to old workspace locations in original provenance are historical, not local launch instructions. The original recovery overview's `../court35-v1/` now resolves to the preserved early candidate; its `../court35-v1.zip` reference names a historical ZIP location. ZIP bytes are retained locally in the task's `backups/` directory and remain in Library; extracted contents and their hashes are tracked here.

Later court/repair accessibility records remain under `recovery-v9/accessibility/`; they have not been applied to either candidate. No original manifest, missing media or missing source has been fabricated. The archive's `.gitattributes` disables text transformations so imported bytes stay auditable.

## New verification, distinct from historical reports

From the repository root, with existing Python and Node:

```text
python archive/recovery-stage-20261018/verify_archive.py
```

The script verifies all 126 imported files before/after testing, checks 14 runtime files against recorded historical frozen hashes for coaster/kart, then runs 11 selected Node suites. New logs go only in `verification/`; original imports remain untouched. Tests exercise engines, storage, and simulated browser surfaces. Canvas calls in controller substitutes are no-ops. They do not establish rendering, mobile ergonomics, browser compatibility, performance, or human difficulty acceptance.

The civic run covers only its standalone progress suite. Its complete game cannot run. Meadow remains an unfinished snapshot and is not rerun by this preservation check.

## Isolation and rollback

Base: `c22235a38c3663866b4b949876b9743c7a0ee4fa`. Branch: `archive/recovery-stage-20261018`.

Only this archive tree and the new root `RECOVERY_OVERVIEW.md` are added. No existing file changes, playable catalogue additions, workflow changes, or Pages configuration changes are intended. The final `verification/ISOLATION.json` records the tree comparison. The original user checkout was clean on main and was left unchanged; work used an independent sparse clone in the current task workspace. Sparse checkout omits historical media locally but preserves every original entry in the committed Git tree.

Rollback is simply to continue using main. Any later integration should be a reviewed game-specific change with explicit browser acceptance, not copying this recovery tree over the live site.
