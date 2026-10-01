# Visual nucleus comparisons — 2026-09-29

The nucleus warm-up now shows saved particle counts as a visual comparison. Learners can see what stayed the same and what changed before opening the full numeric table.

## Learner experience

- Saving carbon-12 and carbon-14 unlocks the neutron comparison. Saving carbon-14 and nitrogen-15 unlocks the proton comparison.
- Each comparison places the two saved nuclei side by side. Numbers and filled dots show their proton and neutron counts. A short label identifies the unchanged count or the increase, and an outline marks the changed value.
- Once both comparisons are available, two buttons switch between them. Switching keeps the current builder draft, saved nuclei, prediction, takeaway, and discovery progress intact.
- The complete table moves into a closed review panel after a visual pair becomes available. Learners can open it with the keyboard, and it stays open when they switch comparisons.
- A comparison appears only when both of its nuclei have been saved. Preparing a nucleus or changing the current draft does not create a saved pair.
- Out-of-order saved work shows whichever comparison is available. The explanation still requires all three intended nuclei.
- Reopening the builder retains the selected comparison. Restarting clears the comparisons and restores the initial view while keeping the earned completion and takeaway.
- The prediction summary now explicitly refers to adding neutrons, so it remains clear when the current draft has a different proton count.

The particle identity model and the three target nuclei are unchanged from the [Nucleus builder](NUCLEUS-BUILDER.md). The comparison uses saved counts rather than the current draft.

## Verification

- **78 unit tests passed**, including pair eligibility, counts represented by the dots, switching without changing the draft, out-of-order and malformed saved state, retained selection, reset behavior, and the prediction context.
- **Five nucleus browser scenarios passed in the current run:** the three existing builder scenarios and two new comparison scenarios. They cover keyboard switching, focus retention, opening and closing the numeric table, preserved drafts and evidence, revisiting the activity, 320px with larger text, reduced motion, light and dark palettes, forced colors, and targeted axe accessibility scans.
- Desktop, mobile light, and mobile forced-color screenshots were visually reviewed.
- Three isolated mutations were rejected: showing a pair with only one saved nucleus, changing the current draft while switching comparisons, and drawing one extra particle in each count. Every mutation run confirmed that production source stayed untouched.
- The integration verifier and its negative cases passed. All four module copies and 408 active translation keys match; the production loader maps the updated source.
- A comparison with this turn's saved baseline confirmed that code outside the introductory studio was preserved. Scoped whitespace checks passed.

The existing local preview serves the enhancement at <http://127.0.0.1:52674/__harness?experience=nucleus>.

Changes are local and uncommitted. Other shared workspace and registry edits are preserved.
