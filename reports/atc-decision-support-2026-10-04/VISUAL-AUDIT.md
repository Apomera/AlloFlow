# Decision support browser audit

Baseline uses installed Chrome with the canonical ATC source and the existing React fixture. Widths: 1440, 390 and 320 CSS pixels; reduced motion enabled. Screenshots and measurements are in this directory.

## Baseline findings

- Current altitude and speed are absent from the selected-aircraft command panel. The learner must refer back to the flight strip or radar when comparing actual and commanded values.
- Heading and speed forms identify the aircraft and valid range, but do not explain whether sending the instruction cancels approach guidance, releases a hold or remains active on final.
- First-exercise guidance is physically separated from the command choice: the Next action card follows the separation and runway boards. A local next-step hint would reduce reading and scrolling.
- At 390 px, the command panel begins at document y=1286; at 320 px, y=1348. The full initial exercise is 2269 and 2423 px tall respectively. The radar precedes command controls in DOM and visual order.
- Command buttons retain at least 44 px height. At 320 px, the longest labels wrap into 60 px buttons without clipping. The heading field receives keyboard focus and no horizontal document overflow occurs.
- The paused state and empty objective progress remain clear; radar labels are readable and fit the surface. No browser runtime errors were observed.

## Verification status

The final focused installed-Chrome suite passed **18 checks**, with no browser runtime errors. The three initial failures came from QA timing and subpixel assumptions: focus restoration and filter reset complete asynchronously, while scroll alignment can land 0.11 px above the viewport boundary. Waiting for the intended state and allowing a 1 px rounding tolerance resolved them without production changes.

- At 1440, 390 and 320 px, the selected panel includes current and target heading, altitude and speed. The Next action guidance appears inside the controls before the command choices. Heading and speed forms fit without horizontal scrolling, and presets plus Send/Cancel retain at least 44 px height.
- Manual instructions preserve current values while showing the new target. Paused automatic guidance says Guided, while a moving approach displays Auto with the computed target.
- Heading previews show the compass and shortest turn, describe approach cancellation or release from a hold, and leave aircraft state unchanged until Send. Invalid input and Escape preserve the model and restore the initiating command’s focus.
- Speed comparisons identify the direct constant-speed assumption and acceleration/turn/sequence limitations. Holding and go-around phases defer the comparison. A real final approach retained guidance after a speed instruction and ended guidance after a heading instruction, maintaining the observed altitude.
- Blocked clearance and repeated runway, approach and go-around instructions show local explanations without adding duplicate evidence. Drafts freeze moving traffic, retain the addressed aircraft and prevent selection/navigation changes until Send/Cancel.
- Mobile navigation focuses and scrolls to the aircraft controls or radar, with Tab continuing to the next control. The form remained usable at 200% zoom, in forced colors and with reduced motion. Axe found no serious or critical issues, including contrast, in the checked controls, forms and debrief.
- Evidence filters retain chronological order, include go-around under instructions and outcomes, provide an empty math view when appropriate and return to All events for a subsequent debrief.

Visual inspection covered `after-heading-320.png`, `after-speed-390.png`, `after-controls-1440.png`, and `after-heading-forced-colors-200percent.png`. The compass, values, consequences, ETA assumptions and action buttons are readable without clipping. The longer form intentionally provides the learner’s readback and preview together; mobile input/scroll checks use the desktop browser viewport and do not emulate a device’s on-screen keyboard.

Machine results: `browser-qa-results.json`. Reproduce with `node reports/atc-decision-support-2026-10-04/browser-qa.cjs`.
