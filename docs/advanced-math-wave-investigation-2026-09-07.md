# Advanced Math follow-up: live wave investigation

Completed September 7, 2026. This pass builds on the five-tool advanced math review and focuses on Function Grapher's wave investigation.

## What changed

The previous activity offered wave sliders without a linked plot and saved observations without displaying them. Its descriptions could also treat a negative coefficient as a smaller amplitude.

The activity now plots `y = a sin(bx + φ)` as the controls change. A solid current curve can be compared with a dashed saved setting on fixed axes, with a labeled value at `x = 0`. Height, spacing, and shift prompts encourage changing one parameter at a time; comparison feedback identifies when multiple parameters have changed.

Up to eight distinct settings remain available as visible records. Learners can choose a reference, hide its overlay, restore its parameters, and collapse the records without losing them. Duplicate saves are disabled. Existing observations, string-valued phases, and written explanations still load. Reset clears this investigation while preserving the main function graph.

The measurements explain amplitude as a magnitude, period as `2π/b`, and one equivalent horizontal shift as `−φ/b`. Negative coefficients reflect the wave across the horizontal axis. Zero amplitude or a zero inside multiplier produces a constant function, with no fundamental period and no unique horizontal shift. Long periods receive a notice when a full cycle extends beyond the visible window.

The graph and controls sit beside each other on wide screens and stack on phones. Readable axis labels and measurement text supplement the SVG. Controls have accessible names, visible focus, and adequate checkbox targets. The optional reflection fields retain learner writing; the saved-record disclosure retains a valid controlled element when collapsed.

## Verification

- All 64 focused tests passed across four suites, including 12 new wave interaction regressions.
- All 30 distinct activity/theme browser cases passed runtime, automated WCAG checks, and 320 px reflow checks across default, dark, and high-contrast themes.
- Twelve layout cases also passed expanded text-spacing checks. Three final keyboard workflows covered saving, changing parameters, overlay visibility, inquiry focus, reflection, explanation, and reset.
- Desktop and phone screenshots were inspected, including saved-reference comparison and the constant-function state. This review prompted a more compact desktop arrangement and clearer measurement labels.
- Function Grapher parses successfully, its source/public copies match byte for byte, and all 41 new active English strings match both registries.

Evidence and reproducible checks are in `scratch/advanced-math-wave-2026-09-07/`; `verification.json` consolidates the completed runs. The new regression suite is `tests/advanced_math_wave_investigation.test.js`.

## Scope and limits

The graph intentionally uses fixed bounds of `−2π` to `2π` horizontally and `−3.5` to `3.5` vertically so comparisons keep the same scale. It samples the curve for display; reported measurements use the wave parameters directly. Browser checks exercised the actual tool with application styles in a local harness. They do not establish classroom learning outcomes or full deployed-app coverage.

Changes are local. No broad build, staging, commit, or deployment was performed, and unrelated shared-workspace edits were preserved.
