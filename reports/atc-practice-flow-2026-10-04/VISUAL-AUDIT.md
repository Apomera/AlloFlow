# ATC practice flow visual audit

The baseline review used installed Chrome with the canonical ATC source and actual React host at 1440, 390, and 320 pixels. The focused harness uses deterministic exercise traffic, reduced motion, and the actual menu, command, end-shift, and retry controls.

## Baseline findings

1. **Exercise setup lacked traffic context before starting.** Pathway cards exposed skill, title, goal, and a Begins paused label. Initial altitude, heading, speed, runway assignment, and the safety briefing appeared only after entering the exercise. A closed Preview exercise disclosure can expose that context while retaining the existing direct start controls. The first card begins at 659 px on the 390 px viewport and 762 px on the 320 px viewport; keeping previews closed by default supports scanning.
2. **The separation exercise initially suggested a runway assignment.** Actual SOUTH101 and EAST102 start at 5,000 ft on converging courses with no runway assignment. The local Next action nevertheless said Assign a runway to this aircraft. The exercise objective concerns altitude separation, so scenario-aware coaching should direct learners toward progressive altitude changes and preserve priority for current safety concerns.
3. **Vertical progress was expressed only as pass/fail checks.** The objective card displayed 0 / 2 actions and two Remaining rows, without showing the actual vertical difference or elapsed shift time. Visible measured values would explain why a requested altitude target is not yet achieved and why six shift seconds are distinct from accelerated flight time.

The existing welcome-to-practice, end-to-debrief, and debrief-to-retry focus behavior passed baseline observation at all three widths. Debrief headings receive focus, retry begins paused with the exercise heading focused, and no horizontal overflow occurred. The welcome start button precedes the training pace controls; this is a secondary setup finding and was not selected for this pass.

The extended baseline capture ran across the first production helper edit, so its source stability field is false. These captures document the prior visible behavior and are not final verification. Final validation must record one stable source hash.

## Final verification

All **17 focused browser checks pass** on the stable final source hash `1db40c565e3b779863031a7090bde31878365a0b587edec784f5d7e8547483ac`. The final run reports no runtime errors or native dialogs. Full normal and forced-color accessibility audits remain active and report no serious or critical violations.

- All four previews start closed, toggle with native keyboard controls and visible focus, have at least 44 px summary targets, and preserve tool data. Preview aircraft values match the actual fixed exercise rosters; priority and shared-runway context are explicit.
- Welcome descriptions correctly identify the selected airport and whether that tower shift starts live or paused. The separate guided-exercise description names the actual fixed exercise and paused start. Existing direct launch names and one-click starts remain available.
- The separation exercise initially directs learners to different altitude targets, without requiring a runway. A paused climb request leaves the measured gap at 0 ft and time at 0 s. Real progressive altitude motion reaches 1,000 ft; the exercise completes only after six shift seconds without a separation alert. The completed attempt is saved, its next exercise is described, and retry resets both measured values.
- An actual FAST102 landing changes subsequent NEAR101 coaching to checking the protected runway area before clearance. A real separation alert produces review-and-retry guidance.
- Preview, launch context, and progress layouts fit at 1440, 390, and 320 px without horizontal overflow. At 320 px the two measurement cards stack, preserving readable values. Expanded roster cards wrap cleanly. System colors and 200% zoom preserve readable content and visible controls.

The initial focused run exposed a 19.5 px preview disclosure target; production now gives it a 44 px target. The same run exposed an axe forced-colors discrepancy: Chrome rendered existing menu hints and counts black on white while axe evaluated their authored light colors against white. Explicit system-color declarations align the authored and actual forced-color behavior, and the final full contrast audit passes. `diagnostic-forced-colors.json` and `diagnostic-forced-preview.png` preserve that investigation; they are not final-state captures.

`browser-qa-results.json` contains case details and the source hash. `after-*` files contain final desktop, phone, measured-progress, coaching, completed-debrief, and forced-color captures. Screenshots were inspected for readable copy, layout, and focus; this pass did not measure classroom engagement outcomes or emulate a phone's on-screen keyboard.
