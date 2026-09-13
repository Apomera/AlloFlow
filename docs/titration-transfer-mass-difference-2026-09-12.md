# Visual transfer mass difference - September 12, 2026

After pouring a sample, open **Show how the boat cancels** under **Weighing by difference**. The new optional diagram separates each dry reading into the same empty-boat mass and its current solid content. A third bar shows the delivered solid.

## Comparing the readings

For a 0.5000 g starting sample with 4% model residue, the dry readings are **2.8456 g before** and **2.3656 g after**. Their difference is **0.4800 g delivered**. Both bars contain a hatched **2.3456 g** empty-boat segment.

**Hide the boat contribution** removes that same segment from both rows. The comparison becomes **0.5000 g - 0.0200 g = 0.4800 g**. All bars use a fixed **0.0000-5.0000 g** scale in both views, so the solid segments keep exactly the same widths and the delivered bar does not move or grow. Exact numeric labels accompany the graphical lengths, including tiny values that occupy less than a pixel. There is no minimum segment width that exaggerates residue.

The visual distinguishes hatched boat mass, solid remaining in the boat, and solid in the receiver with labels as well as color. Its note explains that this is a diagram change, not an action that tares the balance or changes the transfer.

## Procedure and records

The comparison is available only for a loaded, poured, dry trial. It is absent before pouring and disappears after rinsing. A saved dry-transfer record never makes a wet boat suitable for a new dry after-reading. The existing wet-boat warning and stale-record guidance remain visible after rinsing.

The diagram follows the sample copied into the current transfer trial. Changes to the upstream weighing record do not silently replace that sample. Loading the new record starts a new transfer through the existing action.

Both presentation controls leave all masses, records, and downstream practice states unchanged. Restarting, loading a sample, or reopening the equipment resets the disclosure to closed and the diagram to gross readings. Closing and reopening just the disclosure retains the chosen view while that dry trial remains mounted.

## Interaction and visual checks

The native disclosure reports its expanded state and references its panel only while mounted. The boat toggle reports its pressed state and references its mounted figure and explanation. Enter and Space work, and Escape closes the disclosure and returns focus to its opener. All buttons are at least 44 px high.

The layout wraps labels, values, and the equation for narrow screens. The colored data segments and boat hatch remain visible in forced colors; text and controls use the browser's forced palette. No animation, network assets, or WebGL work is added.

## Verification

**77 tests passed across 7 suites**, including 8 new tests for exact cancellation, invariant scales, rounded residue, dry/wet eligibility, state preservation, and invalid sources. Geometry coverage includes 84 sample/residue/view combinations. Existing transfer, inspection, weighing/catalog, preparation progress, equipment tabs, and focus tests also passed.

Run [the browser harness](../reports/chemistry-refinement-2026-09-06/titration-transfer-difference-browser.cjs) with Node from the repository root. Reports and screenshots use the titration-transfer-difference prefix. It checks actual load, pour, record, rinse, restart, navigation, and residue controls, plus keyboard focus, ARIA targets, zero/tiny/maximum masses, malformed state, source-copy preservation, and unchanged live chemistry.

**54 scoped browser accessibility/layout scans passed**: 28 for the new diagram and 26 for the existing transfer-workflow regression. There were no page errors, horizontal overflow, or missing new ARIA references. Four scans used forced colors with the contrast-rule exception below. Gross desktop, solid-only phone, and forced-color phone screenshots were visually reviewed. See [the combined validation summary](../reports/chemistry-refinement-2026-09-06/titration-transfer-difference-validation.json).

Normal-mode automated scans include color contrast. Forced-color scans use the remaining accessibility rules plus visual color review because of the [documented axe forced-color contrast limitation](https://github.com/dequelabs/axe-core/issues/3978).

Source syntax, exact source/public-copy parity, and English fallback matching were checked. There are **10 new English strings**; other-language translations remain pending. Changes are local and have not been deployed.

See [sample-transfer practice](titration-transfer-practice-2026-09-09.md) for the existing teaching-model assumptions and references, and [transfer inspection](titration-transfer-inspection-2026-09-12.md) for vessel close-ups and current solid-mass accounting.
