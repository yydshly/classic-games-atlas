# 云隙巡航 v2 — 广域与集中

## Scope

Two directly selectable original short flight stages. This candidate only adds `versions/v2/games/cloud/`; it does not edit the catalogue, the original eight-stage game, or the v1 archive. The original eight-stage route is linked at `../../../../games/cloud/`. Storage uses `classic-atlas.cloud.v2.weapons`; the original `classic-atlas.cloud.v1` key is never read or written. Refresh returns to preparation on the selected stage, not mid-flight continuation.

## Play

Automatic fire; arrows/WASD, pointer following, or touch dragging move the aircraft at limited speed. The small illuminated centre is the hit core. Three life points, two wind shields (Space/K or button); shield clears enemy projectiles and protects briefly. P/Escape pauses, R prepares a fresh run. Blur and hidden document pause and clear input. Optional local oscillator audio can be disabled.

Actual descending weapon capsules arrive in three pairs per stage. Diamond/fan-marked **广域散射** emits five visibly diverging trajectories. Rounded capsule/twin-bar **集中双轨** emits two closely spaced, higher-damage tracks. Picking either removes its paired alternative; missing both keeps the current weapon. Repair is marked + and caps life at three. This is a fixed-strength choice, not an equipment tree or a three-tier upgrade ladder. It does not claim parity with the original game's full weapon system.

- Stage 1 晨光横阵: broad five-craft light formations, interrupted by two heavy targets. 42-second arrival of 织云者, a gently sweeping elite alternating fan spreads and straight volleys.
- Stage 2 暮色装甲线: staggered left/right armoured craft, occasional light escorts. 42-second arrival of 折风者, a faster lateral repositioning elite using repeated locked-aim bursts and straight volleys.
- Spread has better coverage; focus has better distant single-target damage. Moving extremely close can collect more spread pellets, with the corresponding contact and navigation risk. No homing, supplementary weapon, account, payment or network service.

## Reference and provenance

Read the existing `games/cloud/engine.mjs`, `levels.mjs`, `renderer.mjs`, `game.mjs`, `index.html`, `cloud.css` and `docs/CLOUD_SPEC.md`. This version adapts that site's original cloud/aircraft renderer and swept-collision engine. Background islands, differentiated weapon geometry, capsules, hit flashes and burst spokes are procedural. Aircraft use an original AI-generated transparent four-sprite atlas, `aircraft-atlas.webp` (640×640, about 81 KB). No third-party game bitmap or audio assets are copied.

Official Raiden IV: OverKill digital manual, page 5 (PDF index 4), consulted 2026-10-19:
https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/323460/manuals/raiden4overkill_manual_digital.pdf?t=1658841837

The manual describes main-weapon pickups changing weapon type and strength. This supports the series-level idea of choosing a weapon through battlefield pickups. It is a Raiden IV reference, not evidence that this implementation reproduces the first Raiden, and no complete-replica claim is made. The paired fixed-choice capsules and stage layouts here are original.

## Verification completed locally

- Syntax checks on all four ES modules.
- Production-engine simulations using only movement targets and shield input, with normal collision, damage, enemies and time. Stage 1 win **74.88 s**, stage 2 win **67.18 s**. These are automated pilot measurements, not promises of ordinary-human completion time or proof of fun. A separate 120-second active-time deadline now bounds every run; unfinished runs become `expired` (withdrawn / not completed), never a false victory.
- Intentional bullet-chasing legal-input failures: stage 1 **8.89 s**, stage 2 **11.13 s**. New run restores 3 life, 2 shields and initial focus weapon.
- Actual spawned capsules collected in order spread → focus; actual two-shield run cleared bullets, took damage and reached defeat. Model victory run on stage 2 also collected repair after damage.
- Controlled equal-strength test fixtures: broad five-target row, spread 5 kills versus focus 1; distant single armoured target over two seconds, focus 16.2 damage versus spread 3.2. Fixtures test the tradeoff, separate from natural-run evidence.
- Shield consumption and no double-use while active; pause freezes world and timers; swept hit intersection; missed capsules do not block progress; paired alternatives disappear only on collection.
- DOM-event harness with real renderer, not a browser: instruction/start/close, both-stage selection, pause/resume, blur and hidden-document input clearing, restart, shield repeated-click guard, denied storage, and v1-key isolation.
- Bounded lifetime and caps: player shots remove on both horizontal edges or top (180 cap), enemy shots remove beyond all boundaries (260 cap), effects expire (100 cap), events capped at 200 when no consumer. No unbounded particle accumulation.
- Offscreen production-renderer frames inspected at 600×720 for both weapon styles; these are labelled renderer samples, not gameplay screenshots or browser validation.

## Browser QA still required after publication

Live browser QA has not yet been completed. It should check 1366×768/1440×900 common wide viewports (battlefield and controls together), 390px and 320px narrow preparation/pause/result overlays (content-led height, not clipped by battlefield aspect ratio), natural input and capsules, shield and touch pointer cancellation, dialog dismissal, storage denial, FPS, both stages and the original route. A visual sample and deterministic tests do not prove aesthetic quality or human playability.

## Review corrections and art generation

Corrected the inherited wave HUD to ten formation waves, separately from the two-stage selector. Added 120-second active-time expiry, with per-update delta clipped to the exact remaining time. Resolution order within the final simulation step is fatal hit, then completed victory, then expiry. Pause excludes time. Both legal top-edge avoidance runs now finish as expired at exactly 120 seconds with intact elite HP. Dedicated boundary tests include a large dt, sub-nanosecond remainder, final-step kill, simultaneous fatal damage and immutable terminal state.

Original atlas was created with AI assistance on 2026-10-19. It contains four original aircraft sprites in a transparent 2×2 layout. Output was inspected, then downscaled and WebP-encoded for delivery without changing its content. Enemy sprites rotate 180 degrees in the renderer. Sprite loading does not change hit radii; the illuminated player core and high-contrast projectile geometry stay above the art. A primitive fallback remains only for a failed/pending asset load, and diagnostics exposes `artLoaded` so live QA can distinguish that state.

The art pass is a concrete asset improvement, not an automatic declaration that visual quality or human playability has passed. Updated offscreen production-renderer samples include the actual atlas. Browser acceptance remains pending.
