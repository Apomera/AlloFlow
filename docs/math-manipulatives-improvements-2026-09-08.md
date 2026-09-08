# Manipulatives improvements — September 8, 2026

Implemented the priority reliability fixes from the September 7 review and connected three additional existing workspaces to generated assessments. No deployment was performed.

## What changed

- **One state connection for foundational manipulatives.** Math Studio prepares and grades the live Lab namespaces for base-ten blocks, fractions, number lines, volume and coordinate grids. Opening an activity selects the correct workspace mode, clears stale challenge state and resets its construction. Modern namespace state takes precedence over legacy host properties, including when it is empty or invalid. Legacy hosts retain their existing basic-tool path; newer hub activities fall back to typed work when the required shared store is unavailable.
- **Navigation is part of preparation.** Fractions return to Learn / Build a fraction, coordinates and number lines to Explore, volume to dimension sliders, and angles to Explore with snapping and timed/estimate activities disabled. A hidden model left behind on another tab is not graded as the visible construction.
- **Student visual supports.** Teacher-independent and student views use the same scaffold rendering and launch controls.
- **Enforced hands-on Builder sections.** A manipulative section needs a supported, valid response target, and an explicitly chosen tool/mode must match the output. Missing or invalid activities are marked for review, not ready. The existing retry workflow can regenerate incomplete sections. Cached section signatures were versioned so old ready text-only sections are not silently reused. Math Studio preparation also checks supplied response targets when the shared grader is available.
- **More generated activity coverage.** Builder provides a selector backed by a shared choice registry. Alongside blocks, fraction circles, number lines, coordinates, volume and angles, teachers can select ten-frames, two-color counters and fraction bars. These modes have bounded target schemas, neutral initialization, checks against the real live workspace and inline diagrams.
- **More accurate grading.** Base-ten grading includes thousands; decimal plot coordinates retain six decimal places instead of being rounded to integers. Volume targets reject nonpositive or unsupported slider dimensions; negative/out-of-range angles and unknown function families are rejected. Exact matching remains the default; optional rubrics support equal base-ten value, equivalent fractions and equal volume.
- **Equation identity.** Chemistry grading checks the equation as well as coefficients. The Chemistry Lab resolves its preset names and formula notation consistently, and reports the equation actually displayed.
- **Value-preserving diagrams.** Improper fractions span multiple wholes, reflex/full-turn angles retain their angle, and base-ten diagrams show thousands and counts above nine. Unsupported representations retain their value in an explicit preview fallback. Ones are larger and base-ten diagrams include the numeric total.
- **Geoboard clarity.** Open constructions report total segment length, not perimeter. The interactive SVG is named “Interactive geoboard” and uses group semantics instead of announcing a fraction-circle image.

## Activity contracts

New hub modes retain the existing `base10` Lab tool ID; `state.mode` selects the workspace. Builder selection IDs use the same tool plus mode, for example `base10:tenFrame`.

```json
{"tool":"base10","state":{"mode":"tenFrame","count":7}}
{"tool":"base10","state":{"mode":"counters","value":-3}}
{"tool":"base10","state":{"mode":"fracBars","numerator":2,"denominator":3}}
```

Ten-frame targets range from 0 to 20. Counter targets are integers from -20 to 20; yellow contributes +1 and red -1, so cancelling pairs are accepted. Fraction bars use denominators 1, 2, 3, 4, 6, 8 or 12 with a numerator between zero and the denominator. The requested denominator's bar is prepared for the activity.

Optional semantic rubrics are `state.match: "value"` for base-ten blocks, `"equivalent"` for fraction circles and `"volume"` for volume models. Omitting `match` preserves the exact representation rule. Authors should choose the rule to match the question's wording; these are not inferred from arbitrary natural-language instructions.

## Verification

The [verification summary](../reports/manipulatives-improvements-2026-09-08/verification-summary.json) combines the latest result for each test file, replacing overlapping reruns: **245 passed, zero failed, across 15 files**.

Coverage includes mounted React open/edit/check/reset flows for blocks and the three new hub modes, cross-namespace reading, hidden-model rejection, student support access, Builder validation/selection, legacy-host fallback, equation identity, mathematical diagrams and existing accessibility/regression suites. Fraction navigation is checked with the real component's static render; its canvas is not available in jsdom.

The [diagram browser check](../reports/manipulatives-improvements-2026-09-08/diagram-browser-check.json) covers eight cases in Chromium at desktop and mobile widths. It reports no automated WCAG-tagged axe violations and no horizontal overflow at 375 pixels. Both [desktop](../reports/manipulatives-improvements-2026-09-08/diagrams-desktop.png) and [mobile](../reports/manipulatives-improvements-2026-09-08/diagrams-mobile.png) screenshots were inspected. This is a diagram fixture, not certification of the complete application or assistive-technology behavior.

All seven changed runtime modules match their desktop public copies. The generated MathView, generation helpers and utility modules were rebuilt. A separate unchanged legacy Lab mirror was synchronized with the two matching canonical Lab copies after their concurrent viewer update; canonical work was preserved. The changed source and test files pass whitespace/diff checks.

## Remaining roadmap

The broader curriculum roadmap remains future work: generated number-bond, rod, geoboard area/perimeter and algebra-equivalence activities; richer saved construction evidence; and classroom testing across devices and assistive technologies. Geoboard area and closed-polygon assessment were not added. Interactive fraction circles still support their existing proper-fraction domain; improper values now display faithfully in inline diagrams rather than silently changing value.
