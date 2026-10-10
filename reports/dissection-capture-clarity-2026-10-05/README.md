# Dissection Lab — clearer evidence captures

Capture now refreshes the current anatomy on demand, including when the specimen canvas is offscreen. **Frame contents** offers **Specimen and marks** (the default) and **Full canvas with guides**. The default keeps anatomy, observation marks, completed ruler measurements, and committed tissue effects while removing guide panels, lens windows, and temporary interaction previews. It settles camera, anatomy navigation, and tissue outcome animations for the photo. Full canvas records the rendered framing, guides, and animation.

Each new frame records its contents mode, actual capture camera, mark count, and completed approximate model measurement. The notebook and reference pane show the same frozen context. Older frames show “Frame contents not recorded.” The choice and frame context survive saved progress reloads.

Capture restores the visible bitmap, camera transition, render bookkeeping, datasets, and living model clock. Render/copy/encoding failures add no frame and preserve focus and learner work. Captures remain compressed 220×264 JPEGs with the existing six-frame limit.

The browser checks also exposed and fixed an existing animation stall: initial/manual draws stored an epoch timestamp while animation callbacks used the performance clock. Both now use the same clock, so scheduled frames and physiology playback continue after initial, manual, and capture draws. Reduced motion and offscreen/hidden/unmounted stopping remain in place.

## Visual review

Both sides use native Capture with the same seeded specimen, marks, camera, and lens settings. The before run serves the exact renderer snapshot present at the start of this pass. Phone, embedded widths, larger text, high contrast, and forced colors are included.

| Layout | Tools | Native JPEG | Captured context |
| --- | --- | --- | --- |
| phone | [Before](baseline-1/captures/before-phone-tools.png) · [After](browser-2/captures/after-phone-tools.png) | [Before](baseline-1/captures/before-phone-native-frame.jpg) · [After](browser-2/captures/after-phone-native-frame.jpg) | [After](browser-2/captures/after-phone-reference.png) |
| tablet | [Before](baseline-1/captures/before-tablet-tools.png) · [After](browser-2/captures/after-tablet-tools.png) | [Before](baseline-1/captures/before-tablet-native-frame.jpg) · [After](browser-2/captures/after-tablet-native-frame.jpg) | [After](browser-2/captures/after-tablet-reference.png) |
| desktop | [Before](baseline-1/captures/before-desktop-tools.png) · [After](browser-2/captures/after-desktop-tools.png) | [Before](baseline-1/captures/before-desktop-native-frame.jpg) · [After](browser-2/captures/after-desktop-native-frame.jpg) | [After](browser-2/captures/after-desktop-reference.png) |
| embedded medium | [Before](baseline-1/captures/before-embedded-medium-tools.png) · [After](browser-2/captures/after-embedded-medium-tools.png) | [Before](baseline-1/captures/before-embedded-medium-native-frame.jpg) · [After](browser-2/captures/after-embedded-medium-native-frame.jpg) | [After](browser-2/captures/after-embedded-medium-reference.png) |
| embedded large | [Before](baseline-1/captures/before-embedded-large-tools.png) · [After](browser-2/captures/after-embedded-large-tools.png) | [Before](baseline-1/captures/before-embedded-large-native-frame.jpg) · [After](browser-2/captures/after-embedded-large-native-frame.jpg) | [After](browser-2/captures/after-embedded-large-reference.png) |
| forced colors | [Before](baseline-1/captures/before-forced-colors-tools.png) · [After](browser-2/captures/after-forced-colors-tools.png) | [Before](baseline-1/captures/before-forced-colors-native-frame.jpg) · [After](browser-2/captures/after-forced-colors-native-frame.jpg) | [After](browser-2/captures/after-forced-colors-reference.png) |

[Clean specimen](browser-2/captures/keyboard-specimen.jpg) · [Full canvas](browser-2/captures/keyboard-full-canvas.jpg) · [Settled layer](browser-2/captures/transition-specimen.jpg) · [Layer transition in full canvas](browser-2/captures/transition-full-canvas.jpg).

## Verification

- **11 new browser checks and 11 existing gallery checks passed**, with one worker and no retries. Native keyboard capture, actual thumbnail copy stages, offscreen view/camera freshness, failed copy and retry during animated framing, transition sheet exclusion, saved context reload, comparison focus, capacity management, and native PNG/JPEG downloads are covered.
- **225 distinct unit checks passed** across the three scoped suites. The existing full-lab axe assertion ran separately in a fresh worker; every unit assertion passed exactly once across those two final runs. The new cases exercise both capture modes and missing/false/throw/encoding failures.
- Six scoped browser accessibility audits report **0 violations**; incomplete result counts are recorded in [validation-summary.json](validation-summary.json). Layout measurements cover overflow, readable labels/context, and 48px controls. Five normal-color audits leave select contrast incomplete because the app stylesheet adds an SVG dropdown arrow. Manual review confirms legible text at 11.47:1 contrast and the select border at 3.83:1 against white; forced colors has no incomplete result. The whole-lab jsdom axe test retains its existing color-contrast exclusion.
- Native observers wrap the actual Capture entry points without invoking a renderer. They verify byte-identical live bitmap restoration, retained private references/values and datasets, unchanged clock/tween state, and JPEG equality with the product's own thumbnail copy. The transition regression observes native gradient stops from the previous-layer sheet.
- Both renderer copies parse and match. Exact reversal of this pass's 29 renderer edits recovers the starting uncommitted renderer. Unit and canvas-test edits also reverse to their starting bytes; previous gallery, point workflow, and workspace fixtures are unchanged. The existing hover assertion was corrected to require the annotation/ruler safeguards already present before this pass. The frame-clock contract now checks the normalized timestamp; native browser checks require playback to advance before and after capture.

Successful raw results: [Capture browser](browser-2/results.json) · [Existing gallery](gallery-latest/results.json) · [Units](unit-main-latest/results.json) · [Whole-lab accessibility](unit-axe-latest/results.json) · [Before screenshots](baseline-1/results.json).

Earlier runs and traces are retained with their original status. Two initial native downloads were canceled in the restricted test environment; the final local run passed their unchanged assertions. One browser run was interrupted without final results. The first unit run exposed the stale hover assertion, reproduced against the starting renderer. The first new browser run exposed the larger-text selector and animation clock defects; fixture corrections also enforce the suppressed clean HUD and use measured offscreen bounds. React act and color-environment warnings are retained in the raw stderr logs.

[Independent audit](independent-audit.json) confirms exact reversals, preserved inputs, report hashes, and local links. [Final workspace checks](final-workspace-verification.json) record the empty staging area and scoped whitespace check.

[Preservation after cleanup](post-cleanup-verification.json) verifies the archive, tested application inputs, empty staging area, and unchanged completion row. The shared handoff has subsequent changes outside this row, which were preserved.

No files were staged, committed, pushed, or deployed. Earlier dissection work and unrelated workspace changes were preserved.
