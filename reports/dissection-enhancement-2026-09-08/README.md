# Dissection reference and evidence workbench

Date: 2026-09-08

## Result

The dissection tool now provides explicit comparative-anatomy groups, readable reference cards, specimen-specific context, and a direct path from comparison or a related structure back to learner evidence. The canonical module and desktop public copy are synchronized.

## Changes

- Replaced exact/last-word name matching with 13 explicit comparison groups. Every specimen/structure mapping must resolve uniquely. Missing or ambiguous entries never fall back to fuzzy matching.
- Labeled function-based comparisons separately from anatomical equivalence. Small and large intestine, spinal and ventral nerve cords, and pancreas/hepatopancreas no longer become accidental matches.
- Replaced the short, clipped comparison list with responsive cards containing the complete function description, specimen, layer, and a visible current-specimen marker. Phone layouts use a single column.
- Added evidence prompts and a keyboard-accessible action that focuses the selected structure's existing note without replacing its contents.
- Removed name-inferred embryological labels, whole-organ tissue labels, generic human mass/volume estimates, disease lists, and generic related-organ lists.
- Added context for each of the seven specimen types, linked references, and an explicit explanation that schematic colors, sizes, motion, and layer boundaries are not measured specimen data or histology.
- Reused the tool's specimen-specific relationship graph in the inspector. Visible or previously inspected structures in the current layer can be selected directly. Hidden or other-layer structures show a recovery cue and cannot award exploration credit.
- Added per-structure note/confidence status to the directory, including screen-reader descriptions. A note handoff offers another previously inspected structure that needs documentation, while retaining the current note.
- Preserved the original observation → optional reference → evidence reading order. The new handoff follows the evidence form.
- Corrected the frog heart's unsupported separation percentage, the perch circulation explanation and reverse relationship, crayfish open circulation's inclusion of arteries, the earthworm's five **pairs** of contractile arches, and the perch swim bladder's buoyancy role.
- Distinguished fetal-pig shunts from postnatal circulation; explicitly labeled its ventilation animation and pulmonary relationship as postnatal comparisons.
- Removed the evolutionary-ladder framing from the corrected kidney and fish-heart descriptions.

## Scientific references and scope

The linked context is explanatory background, not a citation for every structure description in the existing module.

- [OpenStax Biology 2e: circulatory systems](https://openstax.org/books/biology-2e/pages/40-1-overview-of-the-circulatory-system) — single versus double circulation; open versus closed circulation.
- [OpenStax Biology 2e: annelids](https://openstax.org/books/biology-2e/pages/28-4-superphylum-lophotrochozoa-mollusks-and-annelids) — earthworm organization and digestive specialization.
- [OpenStax Biology 2e: fishes](https://openstax.org/books/biology-2e/pages/29-2-fishes) — bony-fish buoyancy and gill function.
- [Merck Veterinary Manual: cardiac shunts in animals](https://www.merckvetmanual.com/circulatory-system/congenital-and-inherited-anomalies-of-the-cardiovascular-system/cardiac-shunts-in-animals) — fetal shunts and transition at birth.
- [Exploratorium: cow eye dissection](https://annex.exploratorium.edu/learning_studio/cow_eye/index.html) — explicitly labeled bovine comparison for light and neural pathways.
- [OpenStax Anatomy and Physiology: heart anatomy](https://openstax.org/books/anatomy-and-physiology/pages/19-1-heart-anatomy) — explicitly labeled human comparison for valve support.

This pass is a targeted engineering and content correction, not an educator sign-off on every existing anatomical landmark, numerical value, physiological animation, or clinical statement. New UI keys include English fallbacks; full translation of the added reference content remains follow-up work. Automated accessibility checks do not replace testing with screen-reader users.

## Verification

- 301 focused Vitest tests passed across five suites:
  - dissection_lab_improvements
  - dissection_workspace_bands
  - dissection_canvas_loop
  - microdissection_anatomy3d
  - dissection_reference_workbench (31 new tests)
- Five Chromium scenarios passed:
  - mouse incision along the teaching corridor;
  - touch incision after readiness checks;
  - actionable probe feedback;
  - comparison → evidence → next note → related structure, with keyboard focus and note preservation;
  - comparison reflow and keyboard note access at 390 px.
- Axe WCAG 2 A/AA and 2.1 AA checks reported no violations in the new comparison, specimen-context, relationship, and note-handoff panels.
- Source JavaScript syntax checked.
- Canonical and desktop files are byte-identical.
- Scoped git diff whitespace check passed.
- Desktop and mobile screenshots visually reviewed.

The shared browser harness fixes its host width for GL tests. The phone test explicitly gives that host a responsive width before checking the component's overflow and card stacking.

## Review artifacts

- [Desktop comparison](comparison-desktop.png)
- [Mobile comparison](comparison-mobile.png)
- [Expanded structure inspector](inspector-desktop.png)
- [Focused test output](regression.log)
- [Browser test output](browser.log)


## Discovery follow-up

See [the second-pass review](DISCOVERY_FOLLOWUP.md) for structure search, progress filters, workspace shortcuts, and current verification results.


## Recall practice follow-up

See [RECALL_FOLLOWUP.md](RECALL_FOLLOWUP.md) for the recall workflow, review rounds, screenshots, and verification results.

## Spatial orientation and 3D direction

See [SPATIAL_GUIDE_AND_3D.md](SPATIAL_GUIDE_AND_3D.md) for the implemented view guide, screenshots, verification, and optional 3D pilot recommendation.

## Optional 3D eye pilot

The next pass implements the optional schematic eye viewer. See [EYE_3D_PILOT.md](EYE_3D_PILOT.md) for the entry point, scope, screenshots, and verification.
