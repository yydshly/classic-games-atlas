# 潮原纪事 V2 · bounded playable reconstruction

This independently versioned game is a single bounded 2026-10-18 iteration, not a claim of full Civilization recreation or complete v1 recovery.

## Run
Serve this repository over HTTP and open `versions/v2/games/civic/`. Browser module imports need an HTTP origin. No dependencies, build step, accounts, external assets, or network requests are needed for gameplay. Records use localStorage keys `atlas-civic-v2-progress-v1` and `atlas-civic-v2-current-v1`, separate from historical v1 keys.

## Recovery boundary
Historical source archive: `archive/recovery-stage-20261018`.

- `engine.mjs` is unchanged from exact recovered source, SHA-256 `9f85e166767b657a35d2a27ba3a776536bbc7abe4f517294e659ca9230a7f506`.
- `game.mjs` is unchanged from exact recovered controller, SHA-256 `0c066d20913f5985f3b9405f583463eeec620f5e2487a3dd472c7f2587e690c6`.
- `progress.mjs` derives from exact recovered storage/input logic; only the two persistent storage keys gain `v2` isolation.
- `levels.mjs`, `renderer.mjs`, `index.html`, `civic.css`, `about.html`, and this README are newly authored. They are not recovered v1 files.
- Public `civic_pilot.mjs` command plans and engine/progress acceptance tests derive from complete historical outputs. The progress test uses synthetic victory fixtures and is labeled accordingly. Actual sequential victory/unlock evidence is provided separately by the new controller suite.
- Missing original runtime files remain missing in the historical archive. It must not be described as a complete runnable v1.

## Scope and design value
7×6 maps, eight authored chapters, three actions per turn, four resources, workers, upkeep, farm/lumber/quarry/study, roads, trade, bridge research, two villages, finite turn goals, weather, three researches, lighthouse finale, retry, pause, undo, replay-validated save and best records.

Suggested design reference: Civilization series, using Civilization VI as a specific comparison. Historical catalog evidence does not prove a direct original comparator binding. See `about.html` for primary sources, design interpretation, implemented scope, tradeoffs, and differences. There is no combat, diplomacy, civilization competition, open-ended eras, or broad tech tree.

Two first-chapter real UI paths demonstrate a material choice: one farm wins in 3 turns with 16 food/7 wood; two farms spend 3 more wood and win in 2 turns with 19 food/4 wood. Alternative legal farm placement also works. Scholar/producer allocation and village upkeep create additional model-verified costs. This is not exhaustive strategy or balance validation.

## Verification
From `versions/v2/`:

```
node scripts/test_civic.mjs
node scripts/test_civic_progress.mjs
node scripts/test_civic_events.mjs
node scripts/test_civic_random.mjs
node scripts/test_civic_choices.mjs
node scripts/civic_pilot.mjs
```

The optional `render_civic_preview.mjs` uses preinstalled native canvas at the environment-specific path in that script; it is not a game dependency.

- Engine: 15 acceptance groups, all eight chapters solved with public legal commands.
- Progress/input helpers: 10 unit groups, including synthetic progress fixtures.
- Actual controller: 16 Node fake-DOM groups, all eight chapters won sequentially through buttons; exact forecast agreement, unlock/save/reload pause, retry cancel/accept, chapter replacement, undo, keyboard repeats, pointer cancellation, corrupt/denied storage, and two alternate opening plans.
- Seeded random legal-command/undo/replay test: 96 sequences across eight chapters, 4,778 checks. Check count differs from historical maps because v2 maps were newly authored.
- Choice costs: scholar withdrawal loses actual insight production while leaving upkeep, and incurs an action.
- Native offscreen rendering: four real-engine snapshots at 1200 and 390 pixels; all 42 tile centers hit-tested; renderer does not mutate snapshots.

No local browser was launched for this iteration. Node event simulation and native Canvas images are not actual browser layout, device, accessibility-tree or browser-default-event validation. Publication and public-site smoke testing remain separate from local candidate verification.
