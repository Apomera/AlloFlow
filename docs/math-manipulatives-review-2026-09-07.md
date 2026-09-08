# Manipulatives functionality and coverage review

Review started September 7, 2026; completed September 8, 2026. Scope: current local Math Studio, Assessment Builder, shared manipulative grading and diagrams, and relevant STEAM Lab tools. This is an analysis, not an implementation or deployment. Application files were not changed by this review.

## Assessment

The strongest next investment is reliable integration of the existing manipulatives with generated activities. The library already contains substantial number-sense, place-value, fraction, geometry and algebra functionality. However, an activity can launch a tool whose current work is invisible to the answer checker, and a section labeled “Manipulative Response” can be prepared without any interactive response target.

Treat a tool as fully covered only when a teacher can select the concept, generation produces a valid task, the correct workspace opens, students can operate it accessibly, and grading reads and preserves the work they actually built. A menu entry alone does not establish that coverage.

## Confirmed findings, in recommended order

### 1. Repair the state connection for five foundational tools — high priority

The modern plugins store their data in tool-specific namespaces within `labToolData`. Math Studio's preparation, reset and grading paths still use older top-level properties for five tools:

| Tool | Live Lab state | Property read by MathView grading |
| --- | --- | --- |
| Base-ten blocks | `_manipulatives.b10` | `base10Value` |
| Fractions | `_fractions.pieces` | `fractionPieces` |
| Number line | `_numberline.markers` and `.range` | `numberLineMarkers` and `numberLineRange` |
| Volume | `_volume.dims` | `cubeDims` |
| Coordinate grid | `_coordGrid.gridPoints` | `gridPoints` |

A mounted React reproduction clicks the real “Add one block to Ones” button. The live store becomes one, but the MathView grader continues reading zero and returns a mismatch. Separate canonical-grader reproductions confirm the four other state mismatches. Source inspection also shows that prefilling and resetting use the old setters, which can leave the displayed workspace inconsistent with the current question. The protractor's primary angle uses a different, still-aligned path; this finding does not apply indiscriminately to every tool.

Evidence: `math_manipulative_grader_module.js:391`, `view_math_source.jsx:733`, the preparation/reset/check paths around lines 740–950, and namespace setup in `stem_tool_manipulatives.js:573`, `stem_tool_fractions.js:1821`, `stem_tool_numberline.js:97`, `stem_tool_volume.js:852`, and `stem_tool_coordgrid.js:106`.

Recommended fix: one adapter per tool for preparing, reading, resetting and serializing workspace state. Include the submode in the activity contract. Verify the full sequence: open question A, edit it, check it, reset it, switch to question B, return to A. Support prefills and response targets need separate treatment so an assessed workspace does not begin with the answer already completed.

### 2. Make Builder's “Manipulative Response” an enforceable activity type — high priority

Assessment Builder offers a “Manipulative Response” option and a Hands-on badge. Its generation helper requests ordinary problem JSON without requiring a tool, target state or manipulative response schema. A reproduction supplies a text-only `2+2` answer to a hands-on block; preparation still reports `ready`, with no `manipulativeResponse`.

Evidence: `math_create_module.js:217` and `generation_helpers_source.jsx:1526`. The Freeform generation path has more detailed tool schemas, but that does not enforce Builder's selected section type.

Recommended fix: require an explicit tool and mode, initial workspace, target or rubric, and learner instructions. Validate those fields before marking a section ready. Retry or report a preparation problem when a requested hands-on task cannot be constructed. Share this contract between Builder and Studio, rather than maintaining divergent prompt instructions.

### 3. Correct grading and target validation — high priority

The following behaviors were reproduced against the canonical grader:

- Base-ten grading ignores thousands: an empty model is accepted against a target containing one thousand cube when the other places are zero.
- Data-plot grading rounds point coordinates to integers: `(1.4, 2.4)` is accepted for `(1.1, 2.1)`, even though the live tool supports decimal input.
- Chemistry balancing compares coefficients without equation identity. The same coefficient list on a different equation is accepted. This is an adjacent STEAM defect in the same grading infrastructure.
- Invalid target domains, including negative volume dimensions, a negative angle and an unknown function family, are not rejected as invalid targets. They proceed to the missing-actual-state stage instead.

Evidence: `math_manipulative_grader_module.js:96`, its base-ten, data-plot and chemistry evaluators, and the target validators. Decimal inputs appear in `stem_tool_dataplot.js:1236`.

Recommended fix: validate targets against each tool's actual domain and capabilities; include every supported place-value column; compare decimal points using a declared tolerance; normalize and check equation identity as well as coefficients.

A separate design refinement is to make mathematical equivalence intentional. Exact numerator/denominator matching is appropriate for “show three sixths,” but may reject a valid answer to “show a fraction equivalent to one half.” Similarly, “make volume 12” should not automatically require one fixed set or orientation of dimensions. The activity rubric should distinguish value, exact representation, equivalent fraction, total volume and orientation-sensitive construction. These are task-dependent choices, not unconditional grader bugs.

### 4. Preserve mathematical meaning in inline models — high priority

The actual inline renderer reproduces these transformations:

| Requested representation | Rendered result |
| --- | --- |
| 5/4 | 4/4 |
| 270-degree angle | 180 degrees |
| Twelve ones | Nine drawn blocks, while the description says twelve |

The renderer clamps values to drawing limits instead of retaining their meaning. Its base-ten model also has no thousands representation. These errors are especially concerning because the diagram is intended to support understanding of the problem.

Evidence: `utils_pure_source.jsx:1034`, base-ten rendering immediately afterward, and angle rendering at line 1075. Reproduction tests execute the source renderer itself.

Recommended fix: render multiple wholes, additional place values and appropriate angle models where supported. Otherwise show an explicit unsupported-representation fallback. Never silently substitute a different mathematical value. Define a clear contract for regrouped counts, signed quantities and the unit whole.

### 5. Make visual scaffolds available in student mode — high priority

For a support-only problem, mounted MathView exposes “Open Visual Support” in independent teacher mode but not in student mode. The support controls and inline diagram live inside the teacher branch; student rendering does not provide the equivalent support-only path.

Evidence: `view_math_source.jsx:1180` and its student branch around line 1340. The reproduction checks both modes using the same artifact.

Recommended fix: share the learner-facing scaffold component across presentation modes. Keep teacher-only controls separate. Verify support-only, response-only and combined artifacts in each mode, including keyboard access and returning from the Lab.

### 6. Refine geoboard measurement and accessibility — medium priority

The geoboard sums all segment lengths and labels the result “Perimeter,” even for an open construction. A mounted reproduction shows a single three-unit segment labeled as perimeter 3.00. The SVG also announces “Fraction circle model,” a copied accessible name.

Evidence: `stem_tool_manipulatives.js:2764–2779`.

Recommended fix: call the quantity “Total segment length” until a valid closed boundary is identified. Define duplicate and reversed-edge handling, self-intersections and multiple shapes before adding assessed perimeter or area tasks. Correct the accessible name and inspect the interactive SVG's semantics with assistive technology. Existing keyboard peg navigation is a useful foundation; this review does not establish that the entire tool is keyboard-inaccessible.

## Coverage opportunities

The Math Manipulatives hub exposes 26 modes. Thirteen are manipulative workspaces: blocks, abacus, slide rule, ten-frame, counters, place-value disks, hundreds chart, pattern blocks, geoboard, Cuisenaire rods, number bonds, fraction bars and algebra tiles. The other modes provide challenges, teaching content and related activities. The hub is registered under `base10`, but the MathView response adapter does not provide task-specific contracts for all these submodes.

The shared grader lists 17 supported tool IDs across math and science, while inline diagrams implement five tool families. These counts measure different things: registered tools, graded activities and printable/inline models should be tracked separately.

| Instructional area | Existing foundation | Most useful next improvement |
| --- | --- | --- |
| Counting and number sense | Ten-frames, counters, number bonds, hundreds chart | Generated counting, composition and decomposition tasks with quantity constraints and multiple valid arrangements |
| Place value and regrouping | Blocks, abacus, place-value disks | Repair state connection; include thousands; distinguish equal value from required representation; capture trades |
| Fractions, decimals and percent | Fraction Lab, fraction bars, rods | Route equivalent-fraction and comparison tasks; preserve the unit whole; support improper and mixed values; connect models to notation |
| Geometry and measurement | Geoboard, area/perimeter tools, volume, angles and coordinate grid | Closed-shape validity, correct units, meaningful tolerances and multiple valid constructions |
| Algebra | Algebra tiles and graphing tools | Add or connect balance/equivalence activities; distinguish building an expression from solving an equation through valid transformations |
| Applied mathematics | Existing money, time, unit and ratio tools | Add activity adapters and concept-based discovery before building duplicate workspaces |

For initial expansion, prioritize number sense, place value and fractions. This recommendation reflects reuse of existing functionality and the confirmed integration gaps, rather than a claim that every listed activity has been validated for every grade or curriculum.

## Further refinements worth designing

**Make the model explain its relationship to symbols.** Pair a construction with a readable quantity or equation and a short explanation of the last meaningful action: for example, trading ten ones for one ten preserves 23. This direction is consistent with the IES practice guide's recommendation to use well-chosen concrete and semi-concrete representations to support mathematical concepts and procedures. [IES practice guide](https://ies.ed.gov/ncee/wwc/practiceguide/26)

**Organize discovery by concept and purpose.** Let a teacher choose counting, regrouping, equivalence or measurement, followed by explore, scaffold or assess. Select compatible modes and rubrics from a shared capability registry. Include numeric ranges, permitted representations, input methods and diagram availability in that registry.

**Provide equivalent ways to act.** Review dragging, touch, keyboard, focus restoration, zoom and announcements across the complete activity flow. Dragging interactions should have a single-pointer alternative; keyboard accessibility is a separate requirement. Existing button and keyboard controls should be tested in context rather than replaced wholesale. [W3C guidance on dragging movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)

**Save evidence of the attempt.** Preserve the activity version, rubric, student configuration and result together. Provide understandable mismatch feedback, with hints governed by whether the activity is exploration, practice or assessment. Do not infer mastery solely from a final arrangement or repeated clicks.

## Suggested delivery sequence and acceptance criteria

1. **Restore dependable foundational activities.** Implement shared state adapters, correct grading and renderer meaning, and expose student supports. Acceptance: real mounted tools complete open/edit/check/reset/switch flows without stale state; adversarial examples in this review no longer receive the incorrect result.
2. **Unify generated activity contracts.** Share capability metadata and schemas between Builder, Studio and Lab. Acceptance: a hands-on section cannot be ready without a valid, reachable activity; invalid targets produce setup feedback instead of student failure.
3. **Connect existing high-value modes.** Start with ten-frame/counters, place-value trades, fraction bars/rods and geoboard tasks. Acceptance: each activity defines its allowed constructions, equivalence rule, accessible input path and saved response evidence.
4. **Broaden coverage and classroom validation.** Connect applied-math and algebra activities, add a coverage dashboard, and conduct browser, touch and assistive-technology testing with representative learners.

## Evidence and limits

Review artifacts are in [the evidence folder](../reports/manipulatives-review-2026-09-07/). The [reproduction suite](../reports/manipulatives-review-2026-09-07/reproduce.test.js) characterizes observed behavior; most passing assertions demonstrate current defects, not successful fixes. The final targeted run passed all 11 checks. It includes a positive control confirming that fraction-bars hides Check after scoring once. A suspected repeat-scoring issue was therefore excluded.

The baseline run covered four existing suites: 127 of 128 tests passed. A follow-up covering six accessibility/interaction suites and the manipulative engine returned 47 of 49 passing. The failures were language-pack trapezoid checks in the engine suite. These runs overlap and must not be added together as unique test coverage. Their JSON output supplied generic runner stack traces; no passing claim is made for those failed checks. A direct inspection of the same invariant passed in all 63 packs in each directory (126 files total), as recorded in language-check.json. The automated failures therefore remain a verification discrepancy, not a confirmed content defect.

Verification used source inspection, the canonical grader, the source inline renderer, and isolated mounted React components. It did not run the complete deployed application, browser end-to-end suite or assistive-technology certification. Existing source-oriented and direct-state unit tests do not substitute for the missing generated-activity-to-live-tool integration tests.
