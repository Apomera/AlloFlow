# Machine Lab task settings: visual refinement

Power & motion lab now groups its starting assumptions in a named Task settings fieldset. Efficiency and the power budget share a row on wider screens, followed by duration and its unit. The same reading and keyboard order stacks into a single column on narrow screens.

The panel uses larger tabular numbers, 52 px controls, aligned rows and a distinct seconds readout. Invalid numeric fields retain their existing validation and gain a dashed border. Range descriptions and the explanation distinguishing calculated task time from animation playback remain visible.

Only the new `taskSetup()` renderer and the existing power-lab render shell changed. The original field helpers, callbacks, numerical models, practice, saved records and other views are unchanged. The canonical source and desktop public mirror are identical.

Baseline commit: `b33626f52`. Reviewed source SHA-256: `de9f5c176c4683696dbec24bed49d55e425cf8739536ac77f77b67ed0828dd03`.

## Verification

52 selected existing tests passed: 16 setup and validation cases, 28 accessibility checks and eight translation-hygiene checks. All three native processes and their wrapper exited successfully. No new unit tests were added for this rendering change.

Browser evidence is under `browser/`. It exercises the actual React/THREE implementation with independent model expectations, six machines, keyboard order, labels, draft resets, preserved records, desktop and narrow layouts, dark and forced-color themes, and simulated 200% text enlargement. The baseline desktop screenshot is rendered from the committed source in the disposable browser page; production files are never replaced with the baseline.

The final browser run passed 385 checks in ten mounts, including 36 keyboard-focus checks. Root and the browser reviewer inspected all five final screenshots. Two earlier harness failures are preserved: an insufficient buffer when reading the baseline source, then a selector targeting a null-valued attribute that React omits. Both were corrected only in the harness; production stayed frozen throughout.

`verify-scope.cjs` proves the implementation scope, source/mirror parity and syntax. `verify-evidence.cjs` validates the recorded outcomes and artifact hashes. The final counts are in `validation-summary.json`.

This is a local workspace change; no push or deployment. Browser QA uses local Chromium and software WebGL. Text enlargement and forced colors are browser simulations, not a physical assistive technology session or a deployed host build.
