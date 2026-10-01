# Signal detective: optional comparison checks

Verified September 30, 2026. Changes remain uncommitted.

## Learner experience

- Each recorded reading has a collapsed “Quick check: what changed?” section beside the saved comparison bars.
- The learner compares the saved test with the mystery setup: 2 m and 2 cm lead. Choices are distance only, shield only, or both changes.
- A retry gives a short hint naming what moved and what stayed fixed. It keeps the choices open and preserves keyboard focus.
- A correct response folds the choices, focuses the summary, and gives a short explanation of why one change separates an effect. The two-change test explains why separate tests are still needed.
- Responses stay with their individual saved tests when reviewing readings, rerunning a test, or revisiting the investigation.
- Practice stays optional. It does not record tests, change the planned setup, award completion, or gate the main explanation. Restarting clears practice while preserving an earned takeaway.

## Verification

- Full unit run: **107 passed**, including ten new comparison-practice checks. A focused final rerun of the null, array, and invalid-object saved-state fixtures also passed all three cases.
- Chromium: **10 Signal detective checks passed**, including two new practice checks covering all three saved setups, retries, correction, per-test persistence, and revisit behavior.
- Mobile verification uses 320 × 844 px, larger text, reduced motion, the light palette, and forced colors. Buttons meet the 44 px minimum; focus remains visible after folding; the page has no horizontal overflow.
- Automated WCAG 2 A/AA and WCAG 2.1 AA checks found no violations in the tested workspace states.
- Desktop, mobile retry, and mobile forced-color screenshots were inspected: `signal-noticing-desktop.png`, `signal-noticing-mobile-retry-light.png`, and `signal-noticing-mobile-correct-forced.png`.
- Isolated mutation `signal-noticing-answer` accepted a wrong response. The browser check rejected `correct` in place of `retry`.
- Isolated mutation `signal-noticing-evidence` manufactured two recorded comparisons from a practice response. The browser check rejected “2 of 2 separate effects checked” in place of “0 of 2.”
- The first isolated evidence mutation run timed out without an assertion result. Its log is preserved as `mutation-signal-noticing-evidence-timeout.txt`; the standalone repeat passed the mutation verification.
- Both negative checks confirmed that the production source remained unchanged.
- All four module copies match and parse. All **438 active studio translation keys** match across the four registries.
- Static verification and negative self-tests passed for module drift, translation drift, missing production loader wiring, and altered original lesson code.
- Code outside the studio fragment matches `signal-noticing-before.js`. Nucleus Builder and the introductory starter experiment functions are unchanged in this pass. Scoped whitespace checks passed.

## Artifacts

Authoring changes are in `scratch/nuclear-engagement/investigation.js` and the scoped CSS in `scratch/nuclear-engagement/studio.js`. The installer synchronized the source, three mirrors, and eleven new translation keys.

Unit results: `signal-noticing-unit.json` and `signal-noticing-malformed-unit.json`. Browser artifacts: `signal-noticing-browser-results`. Negative-check logs: `mutation-signal-noticing-answer.txt` and `mutation-signal-noticing-evidence.txt`.

The running preview serves the current module:
[Open Signal detective](http://127.0.0.1:62739/__harness?experience=signal&intro=18).
