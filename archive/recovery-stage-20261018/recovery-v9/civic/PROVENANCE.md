# Game 37 partial exact recovery

Recovery agent: /root/review_civic_candidate. Recovery date: 2026-10-18 UTC.
Source: complete original `cat` tool outputs still visible in this agent's conversation, read from `/workspace/scratch/56bf13a306b9/classic-games-atlas-nextgame-readonly` during the 02:41–02:42 independent review. No restricted session directory, inaccessible source, memory reconstruction, or invented missing code was used.

Files with exact matches to SHA-256 values recorded during that review:
- games/civic/engine.mjs: 9f85e166767b657a35d2a27ba3a776536bbc7abe4f517294e659ca9230a7f506
- games/civic/progress.mjs: d74ef76d0a6c7b24d4f14d7ed0738130ca3af27b255af1d7c30348b08abd17b7
- games/civic/game.mjs: 0c066d20913f5985f3b9405f583463eeec620f5e2487a3dd472c7f2587e690c6
- scripts/civic_pilot.mjs: c974b4be985c4cfde187b2b306050e7e7060bd169103f8e1186d0d6875c25fdb

scripts/check_civic_isolation.py was restored from a complete visible original cat output. No historical file SHA was visible. Its current SHA is not independent historical proof.

This recovery is incomplete and NOT a runnable full game. This agent lacks complete source for levels.mjs, index.html, civic.css, renderer.mjs, test_civic_events.mjs and render_civic_preview.mjs. Only fragments or metadata of those files were visible; none have been filled in or fabricated. Original generated PNG/MP4 binaries cannot be recovered from screenshots or reports. Known historical hashes of missing runtime files:
- civic.css: d0ba60730e573a1ff84b27bb4d9946843aa55bbe0ff91e987419a1ff079e741f
- index.html: 4f77e1b515c98b9e9acd5648b797c2ff31d520389eb7c18e2f7d6b3f508b1020
- levels.mjs: 337dabfe9f5507df0a22016157dc9ccb218101be197787a3915a3a24bb694206
- renderer.mjs (later inspected version): 6fdca85077256f1b375ce1bfbec6e13f19716e27d98d0ac70e2f326dd13e6398
- renderer.mjs (earlier capture version): 3624e817530f58c03eb3d9937856b91f6ceff62f05e64ea4b1f4f97e3aea365d

The exact original author subtask identity is not present in this agent's visible conversation. The only known coordinator identity is /root/prepare_next_game_cloud; an art worker was mentioned without a task name.

Additional complete recorded outputs restored:
- scripts/test_civic.mjs: complete original 101-line test source; no historical SHA visible to this agent.
- scripts/test_civic_progress.mjs: historical early version, exact SHA match 3c31dce5ba3ab9f0e036e7cf36c1d2b6f0940b80e951b82e15f88f4008102fe6. IMPORTANT: the misleading test name "actual wins" was later changed by the implementer to describe synthetic fixtures. That later full text was not visible and is not reconstructed here. This restored earlier file contains synthetic won objects, not genuine engine victories; full controller natural unlock tests were separate and are not completely recoverable here.

reviewer-random-recorded.mjs reproduces the full script text sent in the reviewer's 02:42:58 collaboration message. It is not claimed to be the implementer's final persisted random-test artifact (that text and historical file SHA were not visible). It is placed at the recovery root so its original ./games/civic/engine.mjs import remains unchanged. Seed 37, 96 sequences, historical expected check counter 7481; validates legal commands, exact undo and replay consistency, not an independent production oracle. Not rerun during partial recovery because levels.mjs is missing.

Recovery-time check: restored early scripts/test_civic_progress.mjs ran successfully, 10 groups. No full-game/browser verification can be claimed from this incomplete bundle.
