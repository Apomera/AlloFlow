# Signal detective: compare both effects

Verified September 30, 2026. Changes remain uncommitted.

## Learner experience

- After recording both separate comparisons, learners can switch between **One saved test** and **Both effects** in the saved evidence area.
- The overview puts the mystery setup (5.3%), distance test (21.4%), and shielding test (25.0%) on the same 0–100% scale. Each row names what changed and what stayed fixed. The two-change test remains in the notebook.
- **Inspect distance test** and **Inspect shielding test** open the corresponding saved reading and focus its heading. Inspection preserves the planned setup, recorded evidence, practice responses, notes, and completion.
- The selected view persists on revisit. Recording another comparison returns to the single reading and keeps focus on Run. Restarting clears the view preference while preserving an earned takeaway.
- Partial evidence cannot enable the overview, including malformed saved state. Unknown view preferences recover to the single reading. Optional practice and the main explanation keep their existing behavior.

## Verification

- **120 unit checks passed**, including thirteen new overview checks for gating, shared scales, saved state, inspection, focus, and actual measurements.
- **13 Chromium Signal detective checks passed**. Three new browser checks cover the desktop overview, a 320 × 844 px layout, and partial saved evidence. A final focused mobile repeat also passed after adding assertions for a real measurement from the overview.
- Mobile checks cover larger text, reduced motion, the light palette, forced colors, visible keyboard focus, 44 px minimum buttons, and horizontal overflow. The overview, inspected reading, explanation, and Run remain visible after their respective actions.
- Automated WCAG 2 A/AA and WCAG 2.1 AA checks found no violations in the tested workspace states.
- Inspected screenshots: `signal-overview-desktop.png`, `signal-overview-mobile-light.png`, `signal-overview-mobile-forced.png`, and `signal-overview-mobile-inspect-forced.png`.
- Isolated mutation `signal-overview-scale` substituted the two-change setup for the shielding bar. The browser assertion rejected 100.0% in place of 25.0%.
- Isolated mutation `signal-overview-plan` changed the planned setup during inspection. The browser assertion rejected “Move closer” in place of the existing “Undo both changes” plan.
- Isolated mutation `signal-overview-evidence` enabled the overview with incomplete saved evidence. The browser assertion rejected one overview in place of zero. All three negative checks confirmed that production source remained unchanged.
- The initial scale mutation run timed out before an assertion result. Its log is preserved as `mutation-signal-overview-scale-timeout.txt`; the standalone repeat passed the mutation verification. Production source remained unchanged.
- All four module copies match and parse. All **449 active studio translation keys** match across the four registries. The production loader maps the module.
- Static verification and negative self-tests passed for module drift, translation drift, missing loader wiring, and altered original lesson code. Code outside the studio fragment matches `signal-overview-before.js`; the Nucleus Builder and starter experiment functions also match that baseline. Scoped whitespace checks passed.

## Artifacts

Authoring changes are in `scratch/nuclear-engagement/investigation.js` and the scoped CSS in `scratch/nuclear-engagement/studio.js`. The installer synchronized the source, three mirrors, and eleven new translation keys.

Unit results: `signal-overview-unit.json`. Browser artifacts: `signal-overview-browser-results` and `signal-overview-mobile-final-results`. Negative-check logs: `mutation-signal-overview-scale.txt`, `mutation-signal-overview-plan.txt`, and `mutation-signal-overview-evidence.txt`.

The local preview serves the current module:
[Open Signal detective](http://127.0.0.1:59730/__harness?experience=signal&intro=19).
