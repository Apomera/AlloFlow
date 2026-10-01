# Galaxy: H-R exploration and stellar comparisons

## Changes

Star Life now lets learners select modeled stages directly on the H-R diagram. The plot and animated star share the active stage. Tap near a point, or focus it and use arrow keys, Home, and End; Enter and Space activate it. The plot uses the nearest point within 22 CSS pixels, ignores pointer movement over 6 pixels, and clears canceled gestures. Keyboard navigation has one entry point and stays within the current mass branch.

A kept birth mass adds a cyan reference diamond and a comparison of mass, surface temperature, luminosity, radius, and estimated hydrogen-burning time. Keep current mass, Use Sun as reference, and Clear reference use 44-pixel controls. The reference stays fixed while changing mass, lifecycle stage, or mode. These values use the tool's existing shared stellar relations, so stage selection does not change the birth-mass comparison.

Saved reference values are accepted only as finite numbers from 0.08 to 50 solar masses. Brown dwarfs cannot be kept as main-sequence references and receive no main-sequence temperature, radius, luminosity, or lifetime comparison. The current brown-dwarf mass can still be explored with a stellar reference present.

## Diagram and scientific wording

- Larger phone labels, fewer temperature ticks, and repositioned region labels make the chart easier to read. The coordinate system stays left to right in RTL layouts.
- The dashed path joins schematic stage estimates. Its spacing does not represent elapsed time. Estimates outside the displayed range receive an explicit plot-edge message.
- Temperature runs from hot on the left to cool on the right, with luminosity increasing upward. This follows [ESA's explanation of the H-R diagram](https://www.esa.int/ESA_Multimedia/Images/2018/04/Gaia_s_Hertzsprung-Russell_diagram).
- The neutron-star caption now explains that neutron stars radiate as they cool, while this model lacks the inputs to plot one. Cooling and electromagnetic emission are discussed in [NASA's record of Tsuruta and Cameron's research](https://www.giss.nasa.gov/pubs/abs/ts07100z.html).
- The black-hole caption distinguishes the black hole from observable light produced by surrounding matter. [NASA's black-hole anatomy guide](https://science.nasa.gov/universe/black-holes/anatomy/) describes this distinction.
- A supernova receives a transient-model explanation instead of an arbitrary fixed luminosity claim.

These are teaching estimates. The retained main-sequence lifetime relation is approximately 10 / mass^2.5 Gyr, with an existing 2 Myr floor. Composition, rotation, mass loss, cooling age, and detailed stellar evolution are not added to these relations by this pass. The schematic evolved-stage coordinates are not a numerical stellar-evolution track.

## Verification

**474 unique passing checks across 17 Galaxy suites.** The initial full run passed 466 assertions and found eight expectations tied to the former H-R wording or source formatting. Those contracts were updated; the review, mode smoke, and new H-R suites then passed all 137 assertions. The later report replaces those suites in the combined summary. See [validation-summary.json](validation-summary.json), [initial full run](galaxy-tests.json), and [updated suites](updated-tests.json).

The real React/canvas browser checks passed:

- Native mouse and touch stage selection, including taps 15 pixels from a point.
- Bounded keyboard navigation, focus retention, and matching star animation state.
- Drags, canceled pointers, and empty plot space leave the stage unchanged.
- Reference actions, mass slider endpoints, mode changes, and preserved investigation notes.
- Six mass cases: 0.03, 0.3, 1, 12, 30, and 50 solar masses.
- 1440, 390, and 320-pixel layouts, RTL, no horizontal overflow, chart labels of at least 10 rendered CSS pixels, and 44-pixel comparison controls.
- Region labels with 40% longer text on the smallest layout.

[Browser results](browser-results.json) contain no console or page errors. [Connected workflow regression](connected-regression/browser-results.json) passed the star/chemistry links, all stage branches, saved notes, keyboard cosmic timeline, mode cleanup, and quiz recovery/cancellation cases.

Source and desktop mirror are byte-identical. All 30 checked H-R and revised caption keys match both English registries and the Galaxy catalog. Both source files pass Node syntax checks. [Source validation](source-validation.json) records SHA-256 `54ac6e1aa8d50320f9964a72daa3e5959263c1b0e9159c0942d9c57b431a380b`.

## Preview and screenshots

[Open the local preview](http://127.0.0.1:53693/) and select **Star Life**. The preview serves the current source without caching. Source changes and reports remain uncommitted.

- [Desktop diagram and comparison](hr-comparison-1440.png)
- [390-pixel comparison](hr-comparison-390.png)
- [320-pixel comparison](hr-comparison-320.png)
- [RTL comparison](hr-comparison-320-rtl.png)
- [Brown dwarf and saved solar reference](hr-brown-dwarf-320.png)

The browser harness increases capture height for complete screenshots after checking the 1100-pixel test viewport, and temporarily removes sticky positioning in that harness. Those capture settings do not change the product.

## Files

- `stem_lab/stem_tool_galaxy.js` and its desktop public mirror
- Galaxy entries only in both `ui_strings.js` registries, plus `dev-tools/i18n/stem_galaxy_en.json`
- `tests/galaxy_hr_exploration.test.js`
- Relevant expectations in `tests/galaxy_review_fixes.test.js` and `tests/galaxy_modes_smoke.test.js`
- `dev-tools/galaxy_hr_exploration_qa.cjs`
