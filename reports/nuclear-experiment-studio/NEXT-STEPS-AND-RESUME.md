# Next steps and resuming experiments — 2026-09-29

All six introductions now guide learners using their current observations. The prompts replace general experiment instructions once a prediction is chosen and disappear when the required comparison is ready.

## What changed

- Distance identifies the missing 1 m or 2 m reading. A shortcut prepares that distance and focuses the measurement button.
- Shielding uses an actual recorded trial to suggest a different material at the same positive thickness. It also helps learners move beyond zero-thickness tests.
- Chain reactions show progress through the current four-generation run, then suggest the missing steady or contrasting run. A partially completed new run can finish before switching factors.
- Half-life, counting, and radiation paths show how many required observations are recorded and what remains to try. Matching detector readings still count as separate observations.
- The chooser labels activities as Not started, In progress, or Discovery recorded. A Resume button prefers the most recently worked unfinished activity, with a fallback for older saved state. Simply browsing another activity does not replace that preference.
- On narrow screens, the expanded chooser uses one column so titles and progress labels remain readable.

Setup shortcuts change settings and keyboard focus. They do not take measurements, add observations, or award a discovery. Existing prediction, explanation, and evidence requirements remain in place.

## Verification

- **47 unit tests passed**, including all earlier studio checks and the new setup, resume, incomplete-run, repeated-reading, malformed-state, and zero-thickness cases.
- **12 Chromium tests passed**, covering keyboard focus, unchanged readings during setup, saved observations on resume, six introductions, 320px/390px layouts with larger text, light/dark themes, reduced motion, selected states in forced colors, and axe scans with the real app stylesheet.
- Visually reviewed the shielding guidance and expanded 320px experiment chooser.
- An isolated mutation made a distance-setup shortcut falsely record a measurement. The browser test rejected it at the intended assertion: the display changed to 100% instead of retaining the previous 6.25% reading. Production source was reread and confirmed unchanged by the mutation run.
- The integration verifier and its negative cases pass: all four source copies and 249 active studio keys match, the production loader mapping exists, and the earlier lesson implementation is preserved.
- Scoped `git diff --check` passes. The local preview serves the new code. Earlier broad legacy-audit limits remain documented in README.md.

All changes remain local and uncommitted.
