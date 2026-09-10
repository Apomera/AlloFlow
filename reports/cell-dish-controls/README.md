# Cell simulator dish controls and specimen following

The visibility panel now has larger controls, explicit Visible/Hidden labels, checkmarks, and a live count of enabled cell types. Show All and Clear All use 44px targets. An empty-state message explains how to repopulate the dish. The layout uses six columns at the reviewed desktop width and two on phones.

Observation mode has an optional Follow button beside Center. It tracks the selected specimen without changing zoom, using elapsed-time easing during normal animation. Reduced-motion and paused views center immediately. The preference is saved with cell state, and following uses the existing render loop.

Dragging at least five pixels, resetting the view, deselecting, or hiding the selected specimen releases follow mode. Hiding the selected specimen also closes its anatomy explanation. Follow is suspended in Play mode, preserving its own camera behavior. The phone toolbar uses two rows of 44px controls.

## Verification

- 15 unit tests passed for canvas lifecycle, tutorial contracts, and rendering warnings.
- 10 distinct browser checks passed: four new follow/visibility checks, three existing observation checks, and three explanation checks.
- New checks cover smooth and reduced-motion tracking, unchanged zoom, drag/reset release, hidden selection cleanup, saved preferences, Play isolation, keyboard toggles, empty-state recovery, visibility counts, target sizes, and horizontal overflow.
- Desktop and phone visibility panels and the phone Follow toolbar were visually inspected.
- JavaScript syntax and whitespace checks passed. Source and desktop mirror match byte for byte.

## Previews

- [Desktop visibility controls](visibility-1200.png)
- [Phone visibility controls](visibility-320.png)
- [Desktop Follow mode](follow-1200.png)
- [Phone Follow mode](follow-320.png)

Logs: browser.log, controls-final.log, and unit-final.log. The initial unit log records an outdated reset-function assertion, updated to include the intentional follow release.
