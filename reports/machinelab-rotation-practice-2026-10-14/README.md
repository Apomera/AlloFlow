# Machine Lab: distinguish rotational work and power

The windlass and screw rotation guides now have separate named calculation cards for input work from torque and angle, and input power from torque and angular speed. Each reuses the existing question definition, including radians, joules/watts and efficiency guidance. The existing equations remain available under their original markers.

Direct practice buttons select the matching skill and move keyboard focus to its answer. Continuing the active skill keeps the full draft. Opening a different skill clears only its ordinary answer/hints/feedback, with visible guidance to save first. Task assumptions, saved records and other work remain intact.

The guide has a larger one-turn heading, larger numerical readings and a responsive task grid that stacks at 600px. The one-turn reference drawing, fractional turns, proportional hand/load bars and all physical calculations are preserved. Force and rotation shortcuts share the same guarded navigation helper with a narrow skill allowlist; budget practice retains its existing gate.

All 103 selected tests passed: 17 new calculation/navigation/guard cases and 86 existing rotary geometry, saved-record, force-entry, accessibility and translation cases.

527 native browser checks passed across nine real React/THREE mounts. Both windlass and screw routes cover work/power entry, checked and viewed continuation, wrong-unit rejection, saved-record preservation, changed two-minute tasks at 37.5% efficiency and invalid-model gating. All four linear stations exclude unsupported torque cards while their existing force-entry shortcuts still select and solve correctly. The run verifies all eight rotary readings, unchanged per-turn scales and circle semantics, 14 calculation-card inspections and 26 visible keyboard-focus checks.

The browser agent and root independently inspected four screenshots: the complete desktop rotation guide plus torque-work cards in dark, forced-color and doubled-text 320px layouts. Both cards and all readings receive native layout and numeric assertions in every rotary scenario. No clipping or visual blockers were found; native and observed wrapper exits were zero and frozen source, mirror and harness hashes were unchanged during the successful run.

The first browser attempt stopped before Chromium launch because a local `units` declaration collided with the reused bootstrap binding. Only that harness identifier and its indexed references were renamed to `rotaryUnits`. Original failure receipts, logs and harness snapshot are retained in `browser/run-01`; the successful run is `browser/run-02`. Production source and assertions were unchanged, and the evidence verifier proves the exact identifier-only repair.

Run `node reports/machinelab-rotation-practice-2026-10-14/verify-evidence.cjs` to verify the saved evidence. Scope verification proves the change is restricted to the rotation guide and the narrow shared-navigation extension. Source and desktop mirror match.

This is a local change without push or deployment. Native browser checks use software WebGL. Forced colors are emulated; enlarged text doubles computed HTML guide fonts rather than browser zoom, while the static SVG text remains unchanged. Phone screenshots crop the torque-work card. These checks do not constitute screen-reader testing.
