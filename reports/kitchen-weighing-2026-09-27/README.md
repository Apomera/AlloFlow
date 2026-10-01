# Hands-on pasta weighing

Refresh the recipe kitchen, then open **Prep board → Pasta scale**.

Lift the packet into the dotted outline above the tray, then pull down to tilt it. A steeper tilt pours faster; moving back up or releasing stops the flow. Drag a 10 g handful from the tray back to the packet to correct an overshoot. The illustrated tray and the existing 3D scale update together.

The weighing workspace represents an 800 g supply and measures in 10 g steps. It keeps temporary adjustments separate from the recorded cooking portion. Record at least 40 g before cooking; reloading restores the recorded amount. Once the pasta enters the cook, the illustrated tray is empty and its recorded weight remains visible.

Keyboard users can hold Space on the packet, press Enter for one 10 g addition, or press Enter on the tray to return 10 g. The slider and native buttons provide alternatives without holding or dragging. Escape, release, cancellation, focus loss, leaving the workspace, and backgrounding stop continuous pouring.

Fine measurements use a new `weigh` action, leaving historical `measure` validation unchanged. The recorded mass affects the existing pot temperature model and portion criterion. Replay describes exact weight changes, and evidence retains the recorded weight and interaction method.

## Validation

- **239 tests passed across 21 kitchen test files**, including 15 new weighing tests: [unit results](unit-results.json).
- Mouse lift/tilt/return, keyboard holds and single additions, finite supply, minimum portion, cancellation, recording, reload, locked cooking measurements, and read-only replay passed: [browser results](browser-results.json).
- Actual touch input poured and returned pasta with WebGL unavailable. Touch cancellation stopped flow while retaining completed pours.
- Desktop, 320 px, and forced-color accessibility scans reported **zero violations**; no browser errors were recorded.
- All **22 kitchen runtime assets** match their desktop copies. Runtime and QA scripts parse, and scoped `git diff --check` passed: [asset checks](asset-check.json).

Commands:

```text
npx vitest run tests/kitchen_recipe --pool=threads --maxWorkers=1 --testTimeout=30000
node dev-tools/kitchen_recipe_weighing_qa.cjs
```

## Screenshots

- [Pouring pasta](pouring-pasta.png)
- [Recorded desktop portion](weighing-desktop.png)
- [320 px layout](weighing-mobile.png)

The local kitchen preview was restored at `http://127.0.0.1:53061` using the project's existing preview server.
