# Micro Lab: deeper inquiry — September 27, 2026

## Added learning workflows

- **Mystery specimens:** six fictional investigations with staged observations, evidence selection, a classification claim, a written explanation, and a conclusion about limits. One case deliberately lacks enough evidence to distinguish bacteria from archaea. Recorded reports remain intact while students revise drafts. Downloads include both versions and the observations the student has opened.
- **Growth sweeps:** compare nine or ten sampled settings while holding the other conditions constant. Charts and tables preserve the settings used for the saved sweep. A sample can prepare the next trial without replacing the control or recorded trials. Sweep-only work can be downloaded.
- **Microscope measurements:** estimate the specified feature in micrometers or nanometers, compare with the scale bar, and retain the latest checked estimate for each slide. Records preserve the original viewing settings. Changing the view requires a fresh estimate. Students can reveal reference sizes in a separate disclosure.
- **Resistance continuity:** cultures, history, predictions, and submitted explanations survive section changes and JSON restoration. Restored simulations wait for the student to resume playback.
- **Outbreak evidence:** the Snow map identifies its generated locations and marker sequence as illustrations. Pump closure preserves past markers. Native keyboard controls, location selection, and text summaries provide access to the same evidence. The case card and quiz now explain that the decline began before pump closure.
- **Recovery and accuracy:** older growth records without a control retain editable notes. The bacterial/human cell-count quiz uses the 2016 reference-adult estimate with its limits. Microscope select controls have explicit accessible names.

Both runtime copies are synchronized. New interface strings are registered in both default UI registries; this does not add translations to every language pack.

## Validation

**91 focused tests passed across seven files. All eight browser scenarios passed across the two Micro Lab suites.** The two affected specimen-download and microscope scenarios passed again after the final export and field-sizing fixes. No page errors were recorded. Runtime mirror parity and the scoped whitespace check passed.

Validation covers the growth model, mounted learning workflows, measurement calibration, malformed saved state, JSON restoration, exports, quiz answer rotation, and runtime mirror parity. Browser scenarios exercise desktop and 390-pixel phone layouts, keyboard controls, real downloads, navigation, and all 19 sections.

Commands:

```text
node node_modules/vitest/vitest.mjs run tests/microbiology_growth_model.test.js tests/microbiology_growth_workflow.test.js tests/microbiology_microscope.test.js tests/microbiology_resistance_sim.test.js tests/microbiology_mystery_workflow.test.js tests/microbiology_snow_map.test.js tests/stem_microbiology_quiz.test.js --maxWorkers=1 --testTimeout=20000
node node_modules/@playwright/test/cli.js test tests/e2e/microbiology-deeper-inquiry.spec.ts tests/e2e/microbiology-investigation.spec.ts --workers=1 --reporter=line
```

The repository-wide suite was not run. The shared test harness emits a React act deprecation warning; focused tests still pass.

## Evidence and boundaries

Mystery cases are fictional. Their feedback checks the selected observations and conclusion; it does not automatically grade the quality of the written explanation or identify real specimens. Sources: [OpenStax microorganism types](https://openstax.org/books/microbiology/pages/1-3-types-of-microorganisms), [prokaryotic cells](https://openstax.org/books/microbiology/pages/3-3-unique-characteristics-of-prokaryotic-cells), [archaea](https://openstax.org/books/microbiology/pages/4-6-archaea), [fungi](https://openstax.org/books/microbiology/pages/5-3-fungi), and [viral hosts](https://openstax.org/books/biology-2e/pages/21-2-virus-infections-and-hosts).

Growth sweeps reuse the illustrative deterministic growth model. They identify the highest sampled value, not a measured biological optimum. Only the latest sweep is retained, with a visible reminder to download it before replacement. The existing trial notebook still holds up to 12 trials.

Microscope reference sizes are representative drawing dimensions. The ±20% practice band provides estimation feedback; it is not uncertainty for a laboratory measurement. Display enlargement adds no optical detail.

Snow's map is a teaching reconstruction, not his original map or a historical death-count dataset. Historical framing follows [Snow's 1855 account](https://epi-snow.ph.ucla.edu/Stream2_BSPoutbreak_d.html) and the [CDC historical overview](https://www.cdc.gov/mmwr/preview/mmwrhtml/mm5334a1.htm). The cell-count quiz cites [Sender, Fuchs, and Milo, 2016](https://journals.plos.org/plosbiology/article?id=10.1371/journal.pbio.1002533).

## Reviewed screenshots and sample exports

- [Mystery specimens, desktop](mystery-desktop.png) and [phone](mystery-phone.png)
- [Growth sweep chart](growth-sweep-desktop.png) and [phone workspace](growth-sweep-phone.png)
- [Measurement feedback, phone](measurement-phone.png)
- [Outbreak map, desktop](outbreak-desktop.png) and [phone](outbreak-phone.png)
- [Specimen report download](specimen-report.txt) and [sweep notebook download](sweep-notebook.txt)

All changes are local. No deployment was performed.
