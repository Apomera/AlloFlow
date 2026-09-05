# Basic math UI and learning refinements

Implemented the first refinement pass across all 11 tools in the [basic math review](basic-math-ux-review-2026-09-04.md). The changes focus on accurate representations, a clearer starting point, and opportunities to reason before revealing an answer.

| Tool | Implemented changes |
|---|---|
| Number Line | Collapsible overview; larger tick labels with keyboard-accessible horizontal scrolling on narrow screens; visual rounding scaffold with neighboring multiples and midpoint; answer disclosure requires an explicit request; separate supported and independent success counters. |
| Area Model | Compact current-problem banner; exact number entry alongside sliders; larger slider targets; partial-product headings follow the current problem. |
| Arithmetic Strategy Studio | Place-value disks with previous/next exchanges; carries and borrowing across zero preserve quantity; separate grouping and sharing division models with visible remainders; proportional partial-product regions with readable equations outside the image role. |
| Fraction Lab | Exact terminating decimals and percentages, including 3/8 = 0.375 = 37.5%; approximation signs for rounded values; “Build a fraction” wording; optional build → compare → locate → operate pathway. |
| Math Manipulatives | All 26 choices organized by learning purpose; related tools remain one click away; compact header and collapsible learning steps; a concrete “Start with 14 ones” regrouping activity. |
| Multiplication Table | Choose one fact and open its array model; full table remains available in a disclosure; smaller mobile header; hypothetical mastery simulation clearly separated as a teacher activity; partial saved settings merge with defaults. |
| Ratios, Rates & Proportions | Each of the 15 practice problems has a matching table of known quantities and unknowns; the model changes with the question and leaves answers blank; separate free exploration workspace; simpler practice wording. |
| Money Math | Collapsible overview; cumulative counting trail for coins and bills; prompt to represent the same value with another set; existing full cash breakdown remains available for larger collections. |
| Unit Converter | Equal-length bars represent the same quantity in different units; zero leaves both bars empty; clear explanation of the bar subdivisions; smaller header and optional learning steps. |
| Time & Schedule | Correct ±1 hour labels for the existing one-hour actions; optional 0–55 minute labels; explanation that the hour hand moves gradually; clearer practice introduction. |
| Area & Perimeter | Optional prediction mode conceals measurement results until revealed; cumulative edge tracing; prediction state resets when dimensions change; accessible descriptions follow the reveal state. |

The theme audit also corrected contrast in several progress labels, toolbar controls, and the unit-converter tab. New translated text uses the existing English fallback registry; additional language translations were not authored in this pass.

## Validation

- 194 tests passed across the math regression suites, including 13 new learning-flow tests.
- 56 accessibility/control tests passed; 87 targeted checks passed after the first polish pass. The final theme/touch pass passed 50 checks, followed by 39 number-line regression/accessibility checks after the scrolling adjustment.
- Captured 69 primary/default states across all 11 tools, including desktop and 375px phone layouts.
- Exercised 10 expanded learning states and the default dark/contrast states of all 11 tools in Chromium. No runtime errors or page-level horizontal overflow were found in those 32 cases.
- Fixed the contrast/touch-target findings from that audit and reran all nine affected cases successfully. The final number-line check also verifies that the diagram is at least 600px wide inside its scrollable phone container; both checked states had no accessibility violations or page overflow.
- Root/public module parity, JavaScript parsing, translation registration, and scoped whitespace checks were verified.

Automated accessibility checks and local browser inspection do not replace classroom testing. The browser harness supplies local state and stubs external AI/audio services; those services were not exercised. No broad application build or deployment was performed.

## Reviewable examples

- [Arithmetic partial-product model, phone](../scratch/basic-math-review-2026-09-04/after/arithmetic-partial-products-mobile.jpg)
- [Number-line rounding scaffold, phone](../scratch/basic-math-review-2026-09-04/after/numberline-rounding-mobile.jpg)
- [Multiplication entry point, phone](../scratch/basic-math-review-2026-09-04/after/multtable-mobile.jpg)
- [Equivalent-quantity conversion bars, phone](../scratch/basic-math-review-2026-09-04/after/unitconvert-mobile.jpg)
- [Clock minute labels, phone](../scratch/basic-math-review-2026-09-04/after/timeschedule-minute-labels-mobile.jpg)
- [Final default/primary-state inventory](../scratch/basic-math-review-2026-09-04/after/inventory.json)
- [Expanded-state and theme audit](../scratch/basic-math-review-2026-09-04/after/interaction-browser.json), [resolved theme rechecks](../scratch/basic-math-review-2026-09-04/after/theme-recheck.json)

Source changes are in the 11 `stem_lab/stem_tool_*.js` modules and their matching `desktop/web-app/public/stem_lab/` copies. The new regression suite is `tests/basic_math_learning_refinements.test.js`. Existing unrelated workspace changes were preserved.
