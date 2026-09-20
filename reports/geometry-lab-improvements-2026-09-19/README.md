# Geometry Lab improvements — 2026-09-19

Implemented in Geometry Sandbox and the Stretch Lab companion, with matching desktop public assets.

## Changes

1. **Lesson correctness:** square–cube completion now requires matching angles and expected area/volume ratios, including rotated or reflected similar copies. The reproduced 1-to-4 volume false positive is rejected.
2. **Loading recovery:** engine failures leave an accessible error and Retry control. Retry preserves the workspace.
3. **Lesson guidance:** visible, live-announced current/target measures and next steps replace the hidden incomplete-lesson status.
4. **Challenge learning:** decimal, fraction, and mixed-number entry; hints and retry without prematurely revealing the answer; an explicit worked-solution action. Malformed numeric input does not count as a mathematical attempt.
5. **Companion continuity:** in Stretch Lab, Settings → Teaching & sharing → Apply to Sandbox previews the current figure. Applying adds a new, undoable object and preserves the original. Transfers validate the launched window, origin, token, dimensions, and units. Download model plus Sandbox import is available when the original window cannot respond. Figures transfer aligned to the Sandbox axes; companion lesson progress and display settings stay in the companion.
6. **Stretch learning notebook:** in Stretch mode → Learn, start an investigation, predict a change, edit the model, then save an explanation or mark a model-based explanation. Entries retain independent before/after constructions and measurements. Reopen either stage with matching units, export an editable JSON project or readable text notebook, and preview a project/model import before applying it. Imports validate geometry and recompute measurements; failed or out-of-order reads cannot replace the workspace. Editable projects include unfinished investigations; readable notebooks include saved entries.

## First pass verification

- 389 distinct checks covered across 11 focused suites, including 26 new review regression checks and 2 additional companion interaction tests.
- The combined regression run passed 362 checks; one existing source-text assertion and 25 setup-skipped checks were resolved in targeted reruns. Two stale Sculpt assertions now tolerate current whitespace/signature details. Resource-related setup/teardown timeouts were resolved with longer test timeouts.
- First pass affected behavior run: **32/32 passed** (new behavior suite plus mode-isolation suite).
- First pass browser run: **4/4 passed**, covering notebook, live lesson feedback, challenge retry, and engine recovery.
- Browser checks include WCAG A/AA axe rules, 320px reflow, pointer-target sizing, text-spacing overrides, and forced colors. Normal desktop/mobile screenshots accompany this report.
- Syntax checks and byte equality of both desktop mirrors verified.

The first-pass browser layout fixtures render the real panels without a WebGL scene. Model mathematics and interaction handlers are exercised in the behavioral suites. Physical headset behavior and a full deployed-app journey were not tested. Changes are local and have not been deployed.

## Further refinements

- Editable projects preserve the unfinished investigation's original construction, notes, and explanation choice, plus the current lesson and earned progress. Older files still import. Invalid draft geometry and unknown units are rejected before applying.
- Project imports cannot overwrite an active investigation. Canceling an investigation retains a recoverable copy; restoring it preserves the original model snapshot and notes. A full notebook keeps pending work available for export.
- Cavalieri completion requires matching base areas and perpendicular heights, as well as volumes. Live feedback identifies the compared prisms and their measurements, and explains what to adjust. Equal volume alone no longer earns completion.
- Cube completion also requires a rectangular base. Lesson feedback separates previously earned progress from whether the current construction meets the target.

### Follow-up verification

- **253/253 behavior checks passed** across seven suites: review regressions, mode isolation, Stretch challenges, math audit, history, workflow, and panel rendering. The review suite now includes 39 checks, including 13 added in this pass.
- **5/5 Chromium browser checks passed**, including the longer Cavalieri comparison feedback at 320px and desktop widths. Axe WCAG checks and text-spacing/reflow checks reported no failures.
- Desktop and mobile comparison screenshots reviewed. Both shipped asset mirrors remain byte-identical; JavaScript syntax and scoped diff checks passed.
- Logs: `continuation-behavior.log` and `continuation-browser.log`. These checks use rendered UI panels and modeled interactions; this pass does not include a full WebGL or headset session.

## Notebook working tools

- **Before/after comparisons:** inspect live investigations and saved entries in compact tables, with changes in length, area, volume, surface area, and perimeter as applicable. Measurements are recomputed from the models. Added/removed objects, points, different dimensions, and unlike units do not receive misleading ratios. Very small real changes remain visible. Readable notebook exports include the change summaries.
- **Editable reflections:** revise a saved entry's title, change description, explanation, or model-based reasoning choice. Save and cancel are explicit. The original prediction, model snapshots, creation time, and current construction remain intact. Export and project import wait until pending reflection edits are resolved.
- **Notebook management:** remove saved entries to free space, undo the most recent removal, or export the removed entry with both models and its notes. Restoration preserves ordering and avoids ID collisions. A full notebook cannot overflow through restoration.
- **More efficient review:** detailed measurements render only for the opened saved entry; newly saved entries open automatically. Focus returns to a useful control after editing, removing, and restoring an entry.

### Notebook verification

- **266/266 checks passed** across seven relevant behavior suites. The review suite now contains 52 checks, including 13 added for these workflows.
- The final precision adjustment passed **58/58 affected checks**.
- **6/6 Chromium cases passed** for accessibility and reflow. The saved comparison/recovery case was checked again after button styling, with **1/1 targeted case passed** (five unrelated cases intentionally filtered out). The final mobile notebook screenshot was visually reviewed.
- Syntax, scoped whitespace checks, and byte equality of desktop mirrors passed.
- Logs: `notebook-behavior.log`, `notebook-final-behavior.log`, `notebook-browser.log`, and `notebook-final-browser.log`. Browser fixtures render UI panels without a WebGL scene. Changes remain local and undeployed.


## Guided investigations and visual measurements

- **Three guided experiments:** lean a prism, double its perpendicular height, or double every dimension. Each uses the selected prism or adds a 2-by-2-by-2 cube while preserving existing objects. Changes derive from the captured starting model, so repeated clicks do not compound. Restore the starting prism or use construction undo.
- **Prediction and evidence:** write a prediction or mark a spoken/model-based prediction before applying the guided change. The original prediction locks when applied. Save the result with an explanation and before/after measurements; editable projects preserve the guided activity, prediction, and model snapshots.
- **Linked 3D explanations:** select base area, perpendicular height, or side edge in the measurement card to highlight that feature in the actual model. Height includes a dashed normal and right-angle marker. Text states the volume relationship and distinguishes perpendicular height from slanted edge length. Geometry handles rotated and reversed prism bases.
- **Recovery and validation:** active investigations remain protected; guidance handles changed units, missing target models, and custom changes. Guided scaling cannot exceed the dimension limit accepted by project import. A restored starting model cannot be saved as the changed result.

### Guided investigation verification

- **279/279 behavior checks passed** across seven relevant suites. The review suite now contains 65 checks, including 13 added for these features. Log: [guided-regressions.log](guided-regressions.log).
- **7/7 Chromium accessibility and reflow cases passed**, including the guided investigation at 320px, desktop width, text-spacing overrides, forced colors, and axe WCAG A/AA checks. Log: [guided-browser.log](guided-browser.log). The [mobile controls screenshot](guided-experiment-mobile.png) was visually reviewed.
- **All five distinct real-WebGL journeys passed across the final full and targeted runs:** three desktop investigations, a touch journey verified at a true 390px viewport, and an actual Stretch Lab/A-Frame popup transfer. Journeys exercise prediction, real scene annotations, saved evidence, editable-project download/import, restored models, undo, and mode switching. The companion journey confirms the returned figure preserves the original model and active investigation.
- Evidence: [desktop journey run](guided-e2e-final.log), [corrected phone run](guided-phone.log), and [companion run](guided-companion.log). The desktop run also contains the earlier companion-test failure; that test had targeted a collapsed starter control and passed after using the visible height control. An initial prediction locator was corrected to use its accessible textbox role. Visual review also found and corrected a missing viewport meta tag in the local phone harness before the final phone run.
- Real-scene screenshots were reviewed: [lean desktop](guided-lean-desktop-scene.png), [height desktop](guided-height-desktop-scene.png), [scale desktop](guided-scale-desktop-scene.png), and [true phone viewport](guided-lean-mobile-scene.png).
- An initial test-worker startup timeout ran no checks; the successful final behavior run used the thread pool. JavaScript syntax, scoped whitespace checks, and byte equality of both desktop asset mirrors passed.

These real-WebGL checks run the actual tool and companion in a local harness with vendored assets. Physical headsets and the full deployed application were not tested. Changes remain local and undeployed.


## Measured explanations and portable evidence

- **More complete comparisons:** prism notebook tables now include base area, perpendicular height, and side-edge length, alongside volume and surface area. Values use their correct dimensions and preserve very small positive measurements.
- **Optional measurement guide:** after applying a guided change, open “Explain the measured result” to see the before/after volume equations and the base-area, height, and volume factors. The guide uses the captured models and recomputed measurements. It recognizes custom geometry, restored starting models, missing prisms, and mismatched units, instead of assuming the expected experiment result. Surface-area changes are measured, including when leaning an already slanted prism makes its surface area decrease.
- **Independent student reflections:** the guide leaves the student's explanation untouched and starts collapsed. It remains available with saved notebook entries and uses their saved geometry even when the current workspace has changed.
- **More useful readable exports:** exports retain written and spoken/model-based predictions, before/after measurement values, change summaries, and a separately labeled measurement guide. Editable projects retain their existing schema.
- **Stronger correctness guards:** guided entries cannot be saved with units that differ from the captured starting units. Very small prism vectors are compared using relative precision, so restoring their starting shape does not count as completing the guided change.

### Measured evidence verification

- **294/294 behavior checks passed** across seven relevant suites, including 15 additional cases (80 total in the review regression suite). Cases cover rotated bases, custom changes, decreasing surface area, tiny geometry, spoken predictions, unit changes, immutable model snapshots, and independent reflections. Log: [evidence-regressions.log](evidence-regressions.log).
- **8/8 Chromium accessibility/reflow cases passed** with the measurement guide expanded, including guided and custom saved results at 320px. The expanded [mobile guide](guided-experiment-mobile.png) was visually reviewed. Log: [evidence-browser.log](evidence-browser.log).
- JavaScript syntax, scoped whitespace checks, and byte equality of the canonical and desktop assets passed. Initial behavioral checks caught a unit-guard initialization issue, which was corrected before the successful final run.
- **4/4 real-WebGL journeys passed in one final run:** all three desktop investigations plus the true 390px touch workflow. Checks include opening the guide with the keyboard, reading the new comparison rows, saving, downloading/reimporting an editable project, reopening the saved explanation, undo, and switching modes. Log: [evidence-e2e.log](evidence-e2e.log).

This pass uses local component and real-WebGL harnesses. No deployment or physical-headset test was performed.
