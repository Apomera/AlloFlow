# Geometry World: Learner-Controlled Clarity

## Changes

- An incomplete scan preserves the current Practice answer, feedback, and attempt count when the eligible question is unchanged. A new complete measurement, changed question, or lost eligibility still resets Practice work.
- Practice has an optional native Hint disclosure. Opening it does not submit an answer, count an attempt, or change scores. A new question starts with its hint closed.
- When newer scans are incomplete, Practice identifies the retained complete record behind the question. Answer feedback and invalid-state semantics apply only to the active checkpoint.
- Completed questions show a stable, disabled Correct control. Explanatory surface-area text spans the notebook width on narrow screens.
- Learners can show all retained scans instead of the latest five. This local display choice survives notebook views and reopening, resets on a new lesson, and does not mutate saved learning data. The existing ten-record retention limit is unchanged.
- Block counts consistently includes student-placed Grass and excludes lesson pieces and terrain. Piece count and occupied volume are separate, with explicit cubic units and an unavailable state for invalid volume data.
- Every material group is available in a bounded, keyboard-scrollable list with names and swatches. Larger text, solid panels, contrast, forced colors, a 44px close control, and compact inspection layouts are supported. List scrolling does not activate world movement or material shortcuts.
- Active Block counts is explicitly visible in Free Build. Measurements and coordinates temporarily hide during inventory inspection and return on close, preserving their data, preferences, and coordinate disclosure state.
- Selected notebook tabs have an additional underline in contrast and forced-color modes. This preserves a non-color selection cue when the contrast theme makes every tab border the same color. Normal styling is unchanged.

Source and desktop/public copies were updated together. Builder production code and unrelated worktree changes were left alone.

## Verification

285 distinct regression cases are verified across eight focused suites:

- The complete run passed 284 of 285 cases and exited 1. Its only failure was a synthetic inventory measurement missing the native numeric `fillPercent` field, so the inspector was absent before the close action. The seven unaffected suites contributed 270 passing cases.
- The fixture was corrected, a pre-close inspector assertion was added, and all 15 inventory cases passed with native exit 0. `final-tests.json` and `test-exit.json` retain the original result; `inventory-tests.json` and `inventory-test-exit.json` retain the focused recovery. No failure is silently discarded.
- Each run records source/test hashes before and after execution. The seven passing suites tested core hash `525cf1377422f89293f51361d78dd7f3fcfa52e2cb04b3a9f4cac7d51755f317`. The inventory rerun tested `b16ea0f6c84a03c72f8e41e733f2a64d9e1a855a1fe02323d1f65d5205d7ad9b`. The browser matrix tested `7f75483cd5807384b98db4eb994439cca3e0e30b90574b5775afb06bc206fe92`. Final core/public hash: `3162fc1314b4532205011b60141347bd017baa8033146612459c3f278f874933`.
- Their only source differences are four isolated CSS rules. Removing the final selected-tab rule restores full-matrix bytes; removing the two later inventory visibility rules then restores inventory-tested bytes; removing the landscape rule restores the seven other suites' tested bytes. The focused final-source probe verifies the selected-tab change. Builder source/public bytes remain unchanged.

The browser matrix passed all 78 workflow checks, with zero violations in 36 scoped accessibility audits and 42 screenshots. Six profiles cover 1280px and 1024px desktops, 320px touch portrait, 844px touch landscape, an actual contrast-theme phone, and forced-color desktop, each with Standard and Larger text. The matrix checks native Practice continuity, optional hint/retained scans, all material groups, keyboard scrolling, inspection restoration, and nonblank moving WebGL.

`browser-report.json` and `browser-native-exit.json` record actual exit 0, no signal, unchanged source, and closed private resources. Chromium's close promise exceeded a bounded 20 seconds; that warning is retained, the browser disconnected, the private server closed, and the child exited naturally. The independent user preview was left running.

The focused final-source probe passed six additional checks and saved three screenshots at 320px with Larger text, in normal, actual-contrast, and forced-color modes. It confirms roughly 35px gaps between tab labels, text inside every tab button, full feedback reachable above the footer after native End scrolling, and selected-only underlines in contrast/forced modes. Normal styling is unchanged. `tab-bounds-report.json` and `tab-bounds-native-exit.json` record native exit 0, no signal, unchanged source/public hashes, closed private resources, and no cleanup watchdog timeout. Report metadata distinguishes satisfying the mode's requirement from actually displaying a non-color indicator; raw computed styles are retained.

Earlier tab-probe diagnostics are preserved. An initial `scrollIntoViewIfNeeded` check did not account for the sticky footer; native keyboard scrolling established that the full feedback is reachable. The later selected-style observation exposed the genuine contrast-theme ambiguity, which the final isolated underline rule fixes.

`final-verification.json` passed with native exit 0 and ties both test runs and browser evidence to the source bytes. It checks the CSS-only hash mappings, syntax, source/public parity, screenshot existence, scoped whitespace, HTTP 200, and matching served core/builder hashes at the preview URL.

The first sandboxed unit run could not execute tests because Vitest's temporary-file rename was denied with EPERM. That diagnostic is retained separately. A successful retry must have a real zero exit and unchanged source/test hashes; an incomplete run is not counted as passing.

The first browser run found an older, unconditional Free Build rule that hid Block counts. Its failure, screenshot, report, and actual exit are preserved as dated diagnostics. The final two CSS overrides correct this visibility conflict and prevent inspection overlap across viewport sizes.

## Evidence Limits

- The browser harness uses local React, Three.js, and a real WebGL canvas. It is not the deployed host and does not validate remote persistence or physical touch/WebXR hardware.
- Incomplete measurement checks instrument one native measurement result as partial. They verify the handler and UI transition, not a physically enormous structure reaching the engine's scan limit.
- Inventory exclusion checks include an explicitly marked lesson fixture. Ordinary student material placement and complete measurements use the native engine.
- Contrast checks activate the actual ancestor theme and verify computed colors. Earlier preview query-only contrast evidence is not treated as proof of active contrast styling.
- This is a focused continuation, not a full-repository regression run. Scoped accessibility audits are automated checks, not a claim of complete accessibility conformance.

Local preview: http://127.0.0.1:61309/?mode=home

No deployment was performed. The independent preview server is intentionally left running.
