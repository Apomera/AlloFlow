# Basic math: skip counting as equal hops

This sixth refinement pass focuses on Number Line's Skip Count activity.

## Learning and interaction changes

- **The hop count matches the mathematics.** Previously, eight requested hops produced eight positions, including the start, and therefore only seven intervals. The activity now draws eight directed arcs and nine positions. “Number of hops” replaces the ambiguous “How Many” label, and the introduction explains that the starting position counts as zero hops.
- **Forward and backward counting are both available.** Learners choose addition to the right or subtraction to the left. The model supports negative starting values and crossing zero. Each arc spans the same numerical interval, and the equation connects the start, hop count, hop size, and current landing.
- **Optional step-by-step exploration.** Start at zero hops, predict the next landing, advance or go back one hop, or show the complete sequence. Changing the start, direction, hop size, or count restarts an active walkthrough at zero hops. This exploration does not change challenge scores.
- **Connected text and visual representations.** Every revealed landing has a numbered card and its own addition or subtraction equation. Hiding markers affects only markers on the line; the sequence and arcs remain available. The current equation and hop progress use a polite status region.
- **Preserved comparison context.** Hop-size presets keep the learner's starting value, direction, and number of hops. Inputs support incomplete signed drafts and enforce the displayed whole-number ranges: start −1000 to 1000, hop size 1 to 100, and 1 to 20 hops.
- **More readable controls.** On phones, hop size and hop count appear side by side below the starting value. Direction controls expose their selected state, unavailable step actions are dimmed, and controls use native keyboard interaction. The existing workspace disclosure heading now uses the shared theme text color after the audit found it too dark against the high-contrast background.

## Verification

All 39 interaction and regression tests passed. All 18 activity/theme combinations were verified across the full audit and targeted rechecks. Three final theme checks also confirmed active input and button boundaries meet 3:1 contrast. Runtime, automated accessibility, and narrow-screen reflow checks passed. Final syntax, source/public equality, and scoped whitespace checks passed. Evidence: `tests.json` and `verified-browser-results.json`.

The 11 new interaction cases in `tests/basic_math_skip_count.test.js` cover count/interval consistency, nonzero starts, backward movement across zero, marker visibility, bounded progression, score preservation, changed-input reset, context-preserving presets, signed drafts, and upper bounds. Existing Number Line grading and accessibility checks remain covered; the form-label source contract follows the new explicit hop-count label.

Browser fixtures use the actual application stylesheet, local React, the tool modules, and registered English strings. Six activities are exercised in default, dark, and high-contrast themes at desktop and phone sizes, with 320-pixel reflow and automated WCAG A/AA checks. Next-hop keyboard activation is verified in each theme. Phone screenshots were inspected directly, including the dense twenty-hop model in high contrast.

The first 18-case browser audit found the shared disclosure-heading contrast issue in all six high-contrast cases. The first heading correction exposed an inherited white background in dark mode; the final fix sets text and background together. Runtime and reflow checks were clean. Initial and intermediate results, layout rechecks, and targeted final audits are retained in `scratch/basic-math-pass6/`. The consolidated verification file identifies the audit supplying each activity/theme result. Reproducible scripts and a source snapshot from before this pass are retained there.

The Number Line source/public pair is synchronized and 23 new English strings are registered. No broad build, staging, commit, or deployment was performed; unrelated concurrent work was preserved. These are component checks, not a measured learner-outcome study or complete end-to-end app coverage.
