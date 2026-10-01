# Signal detective: evidence and explanation flow

Verified September 30, 2026. Changes remain uncommitted.

## Learner experience

- Recorded tests now have a focusable “Your saved evidence” heading.
- “Review saved evidence” brings the saved selector and comparison bars into view.
- “Continue testing” opens the comparison controls and focuses their summary. It keeps the learner’s planned test and requires an explicit prepare or run action.
- After both separate effects are checked, “Explain these results” moves to the explanation section. After completion it becomes “Review your explanation.”
- A retry offers “Review the shielding evidence.” It selects the already recorded test without lead, waits for that reading to render, and focuses the evidence heading. Distance remains fixed at 2 m in that comparison.
- Navigation preserves recorded tests, the prediction, notes, completion, and other lab work. Reviewing shielding only changes which saved reading is displayed.

## Verification

- Unit tests: **97 passed**, including five new navigation and state-preservation checks.
- Chromium: **8 Signal detective checks passed**, including two new desktop and mobile flow checks.
- Mobile checks use 320 × 844 px, larger text, reduced motion, the light palette, and forced colors. Evidence bars and explanation sections land fully in view, keyboard focus stays visible, and the page has no horizontal overflow.
- Automated WCAG 2 A/AA and WCAG 2.1 AA checks reported no violations in the tested workspace states.
- Screenshots inspected: `signal-flow-desktop.png`, `signal-flow-mobile-evidence-light.png`, and `signal-flow-mobile-explain-forced.png`. A fourth screenshot records the evidence view in forced colors.
- Isolated mutation `signal-flow-plan` deliberately prepared the missing test during navigation. The browser check rejected the changed planned test.
- Isolated mutation `signal-flow-shield` deliberately reviewed the distance test instead of shielding. The browser check rejected 21.4% in place of 25.0%.
- Both mutation runners confirmed that the production source stayed unchanged.
- All four module copies match and parse. All **427 active studio translation keys** match across the four registries.
- Static verification and negative self-tests passed for mirror drift, translation drift, missing production loader mapping, and altered original lesson code.
- Source outside the studio fragment matches `signal-flow-before.js`; scoped whitespace checks passed.

## Files and preview

Authoring changes are in `scratch/nuclear-engagement/investigation.js` and the scoped styles in `scratch/nuclear-engagement/studio.js`. The installer synchronized the source, three mirrors, and five new translation keys. Tests cover the actual production module through the existing harness.

Unit results: `signal-flow-unit.json`. Browser artifacts: `signal-flow-browser-results`. Negative-check logs: `mutation-signal-flow-plan.txt` and `mutation-signal-flow-shield.txt`.

The local preview was restarted and its served module was checked for the new flow:
[Open Signal detective](http://127.0.0.1:62739/__harness?experience=signal&intro=17).
