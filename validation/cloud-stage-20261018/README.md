# Cloud stage: Game 38 and Game 39 recovery verification

New verification performed on 2026-10-18 UTC. This is a development checkpoint, not a game release or a historical recovered QA report.

## What this commit adds

Six fresh Node test logs, a 14-file runtime hash manifest, machine-readable results, and a reusable verification runner. Existing archived runtime source is referenced by exact hashes rather than duplicated. No game implementation, website entry point, original game, workflow or deployment configuration is changed.

Base recovery archive: commit `d964a605f614099f93fcae317d00a2299b7438a3` on `archive/recovery-stage-20261018`.

Verified archived source roots: `archive/recovery-stage-20261018/recovery-v9/coaster/` and `archive/recovery-stage-20261018/recovery-v9/kart/`. Each contains its `games/<game>/` runtime and `scripts/` tests. The base Git tree is `8236e67cb3f8ed2b2874e874be5d21532e6d7f6a`.

Protected original-34 baseline: `main` at `c22235a38c3663866b4b949876b9743c7a0ee4fa`. This checkpoint must stay on an independent development branch; it does not authorize merging or deployment.

Checkpoint ZIP integrity was rechecked: SHA-256 `e6ec9a4ee06bfdfe80fd57d5cd5a51bb040d428c69d48c0d87a8217ff6524622`.

## Fresh results

| Candidate | Engine | Progress/input | Controller/events |
|---|---:|---:|---:|
| 38 / 云岬游乐园 / coaster | 27 passed | 9 passed | 28 passed, 0 failed |
| 39 / 林野杯赛 / kart | 26 passed; 135,780 checks | 16 passed | 32 passed, 0 failed |

Both event suites exercised all eight campaign stages through the actual controller handlers using Node browser substitutes. Runtime source was byte-for-byte identical to the recovery source before and after testing. `runtime-manifest.json` also includes Git blob SHA-1 identifiers, allowing an independent comparison against the archived Git tree.

These tests are **not** real-browser, visual, accessibility, real-device pointer/touch, audio, performance or human-difficulty acceptance. They do not establish that a complete integrated website works.

## Reproduce

Requires Python 3 and Node.js. The fresh tests used Node v24.19.0. From the repository root:

```sh
python3 validation/cloud-stage-20261018/verify_and_rerun.py
```

The runner finds the archived `games/coaster` and `games/kart` source roots by their exact runtime hashes. It refuses absent, changed or ambiguous source. It runs all six existing suites in their original source roots, writes fresh logs to `latest-run/`, and rechecks runtime hashes. Use `--repo PATH --output PATH` to select a checkout and output directory explicitly.

The committed `logs/` directory contains the results of the initial direct Node invocations. The new runner was also executed successfully against the independent cloud working copy on 2026-10-18; all six resulting logs were byte-identical to the committed logs and all 14 runtime hashes remained unchanged.

## Browser gap

A real-browser attempt did not reach either playable page. The cloud browser could not connect to the executor's HTTP preview (`ERR_CONNECTION_REFUSED`). An installed Chromium launch failed because socket creation was denied; the normal escalation retry failed during execution-environment initialization. Local-file navigation was rejected by the browser's HTTP(S)-only URL policy. No access restriction was bypassed, and no transformed page was substituted for actual browser acceptance.

Next acceptance work requires a supported HTTP preview route reachable by the cloud browser. Then test desktop and narrow layouts, real keyboard/pointer input, pause/resume, dialogs, repeated input, storage/reload, and campaign progression. Original website integration and shared assets must be checked against the full repository as well.

## Scope and safety

This directory contains only generated project QA artifacts and a source-verifying runner. It contains no credentials, user profile data, account identifiers or private conversation content. No original-34 full-tree comparison was performed in the isolated test workspace because it had no base checkout; the remote commit diff must independently confirm that only this validation directory was added.

No merge, site deployment, release or published-game count increase is part of this checkpoint.
