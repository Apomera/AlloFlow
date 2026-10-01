# Counting and optional guidance — 2026-09-29

The studio now has five short activities: half-life, distance, shielding, detector counting, and chain reactions. Earlier progress remains valid; a learner with the previous four discoveries sees 4 / 5.

## What changed

- **One count, or a pattern?** asks learners to predict whether repeated counts will match. Each press samples the existing lab Poisson model for ten seconds at a constant background of 0.42 counts per second. Three readings unlock the explanation. Matching readings, including zero, remain valid observations. The chart and notebook retain the latest six measurements.
- **Need a nudge?** adds a closed hint to every activity. Hints respond to the prediction or experiment stage without changing progress.
- **Your discoveries** collects earned ideas in a closed recap. Revisit buttons return focus to the activity question and preserve observations.
- Distance and chain introductions now explain their terms more directly. Progress uses the activity count instead of a fixed denominator.

The counting model uses fresh random samples, with no artificial wait. Its notes distinguish detected events from dose. The [NRC introduction to Geiger counters](https://www.nrc.gov/education-regulatory-research/the-student-corner/science-101/what-is-a-geiger-counter) provides background on changing detector readings.

## Verification

- **29 unit tests passed**, covering calculation, prediction and evidence requirements, matching counts, invalid saved data, six-reading retention, reset behavior, recap navigation, and progress preservation.
- **Eight Chromium tests passed**, including all five introductions at 320px and 390px with larger text, keyboard focus, light/dark themes, reduced motion, selected states in forced colors, and axe checks using the real app stylesheet.
- Visually reviewed the counting activity on desktop, in light mode, and at 320px including three zero readings.
- An isolated mutation lowered the counting requirement from three readings to two. The browser test rejected it at the intended assertion: the explanation was visible after only two readings. Production source was reread and confirmed unchanged by the mutation test.
- The integration verifier and its negative cases passed: all four source copies match, 191 active studio keys match across four registries, production loader mapping exists, and the earlier lesson code matches its saved baseline after reversing the documented view wrapper in memory.
- Scoped `git diff --check` passed. The broad legacy-audit limitation in README.md remains; this pass checks the studio and its view transitions.

Changes remain local and uncommitted.
