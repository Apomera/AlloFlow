# Bridge Lab: crossing analysis and evidence portfolio

This second enhancement pass connects the moving-load model, member inspector, optimizer, notebook, and printable report. It builds on the [first review](../bridgelab-enhancement-2026-09-27/README.md).

## What changed

### Follow each member through a crossing

- A shared crossing analysis records every member’s maximum tension, maximum compression, weakest safety factor, and the vehicle positions that produce them.
- The inspector identifies force reversal and lets the learner jump to either peak. The crossing table provides a keyboard-accessible action for every tested position.
- “Inspect worst position” now selects the actual governing member, opens the labelled 2D view, and focuses the member selector. It handles both strength-controlled and buckling-controlled cases.
- Zero-load crossings display “No demand” and omit a nonexistent worst-position action. Saved results carry a model version and input signature; changed designs and malformed or older results require a new crossing test.

### Optimize for the whole journey

- Vehicle-load optimization defaults to the whole crossing. A learner can explicitly choose the current position for comparison.
- Candidate sections must meet the selected strength and Euler buckling margin for every member across the chosen scope. This works even when the vehicle is currently directly above a support.
- Applying a whole-crossing recommendation also runs and saves its crossing test, ready for inspection and the notebook.
- Equilibrium demands are cached by geometry, bracing, and load. Moving the vehicle, editing notes, or changing candidate material and area does not repeatedly solve the demand envelope.

### Make bracing and its illustration agree

- Each compressed top-chord member uses its actual brace interval, including a shorter final interval. Analysis and drawing share the same brace-station helper.
- The 3D buckling illustration bows the complete governing interval. Connected web members move with the affected joints, while the brace stations stay fixed.
- Visible and accessible descriptions identify deformation as exaggerated illustration, not a displacement prediction.

### Keep the learning evidence together

- The notebook saves predictions and observations alongside design inputs, notes, and a compact matching crossing summary.
- The print view includes saved design comparisons, the crossing scope, and Inquiry predictions, observations, and explanation. Earlier records remain readable and retain their original evidence.
- Saved design verdicts are recalculated from their inputs. A crossing is reported as tested only when its saved evidence matches that design and the current model version.
- Print pages use a white background, including unused space after the report ends.

### Recover gracefully when 3D fails

- WebGL failure leaves a visible explanation and a usable 2D view. Focus moves out of hidden 3D controls when needed.
- Restoring WebGL preserves the learner’s 2D view until they choose 3D again.
- Status subscriptions and the announcement region are cleaned up on unmount.

## Validation

**121 distinct focused checks passed:**

- **98 unit checks** cover structure, crossing envelopes, GL geometry, optimization, persisted evidence, print, Inquiry, playback, quiz, accessibility, and source mirroring. The initial run had three mirror-parity failures while a source update was being copied. A **35-test follow-up passed**, covering those failures, affected workflows/reports, and two additional saved-data regressions. [Verification summary](source-verification.json), [initial run](initial-unit-results.json), [follow-up](final-followup-results.json).
- **1 render snapshot check** passed with the intended Bridge Lab changes. [Snapshot results](render-snapshot-results.json).
- **22 real Chromium/WebGL browser tests** passed. The final two-case refresh also passed after the print background fix, checking the PDF workflow and continuous bowed interval. [Browser results](browser/.last-run.json).

Source and desktop copies are byte-identical. All **742 literal English labels** match both registries. JavaScript parsing and scoped patch whitespace checks pass. Unrelated tests in shared files were deliberately skipped.

Visual review covered desktop and 390/320-pixel layouts, including complete notebook records, member force ranges, the optimizer, nested table scrolling, and the report. No horizontal page overflow or browser errors were observed in the tested workflows.

The [two-page sample portfolio](bridge-evidence-portfolio.pdf) was rendered and inspected page by page. Text and evidence are complete, with readable page breaks and white backgrounds. [Visual QA results](browser-visual-qa.json), [page 1](portfolio-page-1.png), [page 2](portfolio-page-2.png).

The structural tests compare crossing envelopes against dense sweeps at 137 intervals for odd/even Warren, Pratt, and Howe layouts. They verify attained force extrema, reversal, governing-member identity, shorter end brace intervals, independent material/area demand, zero load, and unsupported K-truss envelopes.

Workflow tests exercise the actual control handlers: selecting scope, applying an optimizer result, inspecting peak forces, validating persisted results, saving/restoring evidence, and printing current and earlier records. Browser checks exercise real Chromium/WebGL, keyboard focus, context loss/restoration, playback, responsive layouts, and the evidence portfolio.

Selected captures: [small-phone member ranges](bridge-320-member-extremes.png), [phone notebook](bridge-390-evidence-notebook.png), [desktop optimizer](bridge-1000-optimizer.png), [full buckling interval](bridge-buckled-interval.png).

## Model boundaries

The whole-crossing claim applies to this lab’s static, ideal pin-jointed model. The vehicle load transfers linearly between load-transfer points, so member forces are piecewise linear and their extrema occur at those points. The additional 2% samples make the chart easier to read; the transfer points establish the force envelope. This reasoning follows the influence-line treatment in [Temple University Press’s structural analysis text](https://temple.manifoldapp.org/read/structural-analysis/section/7b23d4d6-8e07-4054-b27c-6add7b1b467e).

Warren, Pratt, and Howe use equilibrium solutions. K-truss forces remain approximate and do not receive a full-crossing member envelope. Euler checks assume solid square sections, pinned ends, and the modeled brace restraints. Checking each member with its brace interval remains a simplified stability model; it does not solve a 3D buckling eigenmode or predict displacement.

Inputs and quantities describe one truss plane. Self-weight, deck, the second truss, connections, bracing quantities, labor, impact, vibration, fatigue, and multiple vehicles remain outside the strength and cost model. Material values and the classroom safety-factor target are educational assumptions.
