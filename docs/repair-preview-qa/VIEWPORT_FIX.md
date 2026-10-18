# Repair viewport correction · 2026-10-18

## Actual browser finding before this patch

The deployed preview at commit `1c2c2b308e7cd315601473f468191098ceae973e` was inspected in the dot cloud Chrome browser:

- At a 500×757 CSS viewport: document client width 485 and scroll width 550; workshop column 461px, but ready-state canvas wrapper 538.1875×390px, right edge 550.1875px.
- At a 400×606 CSS viewport (125% browser zoom): client width 388 and scroll width 550; workshop column 364px, but wrapper 538.2×390px. The primary action's right edge was 403.8px, outside the 388px visible document width.
- At 1181×757: client and scroll widths were both 1166px.
- After activating Start on the wide view, scrollY was 348 and the HUD top/bottom were -71/35.5px while the canvas top/bottom were 35.5/537.5px. Scrolling upward restored the HUD; its off-screen position was a start-flow problem.

`initial-narrow-geometry.txt` preserves the actual narrow read-only DOM measurements. Screenshots were inspected independently. These are observations of the earlier deployed version, not verification of the proposed fix.

## Minimal changes

1. Give `.canvas-wrap` definite `width:100%`, `min-width:0` and `max-width:100%`. The 390px non-playing minimum may no longer transfer through the mobile 1.38 aspect ratio into a wider automatic width.
2. Apply `object-fit:contain` to the canvas at every width. This agrees with the controller's existing letterbox-aware coordinate mapping when the briefing minimum changes proportions.
3. Keep the 390px non-playing minimum, scrollable briefing card, authored playing aspect ratio, art and gameplay.
4. Only an explicit Start/Continue action scrolls the workshop overview into view once, with a 12px top margin. RAF, pause, restored saves and dialog closure do not recenter.
5. The HTML requests both CSS and controller with `?v=20261018-width1`, reducing stale-entry artifact mixing.

The new static width contract fails against the unchanged deployed CSS and passes with the patch. It checks source invariants only, not browser-computed geometry. A new actual-controller model regression verifies one scroll call per explicit start/resume and no scroll calls from RAF/pause/dialog close.

## Verification

After the final edits, all six shipped suites passed: 40 engine tests, 10 progress groups, 27 controller groups, 2 storage-isolation groups, 5 existing layout contracts and 5 new width contracts. All eight controller-driven days still naturally unlock and win with unchanged results. Full logs and current runtime hashes are in `checks.json`.

The patched version still requires public-browser testing after deployment: 400/500px ready and paused surfaces; wide Start/Continue HUD positioning; playing, win/loss and dialogs; pointer hit mapping; no horizontal page scroll; reachable primary/secondary controls; real-origin saves; and no repeated recentering while playing or using controls. Passing model/source tests is not browser acceptance.
