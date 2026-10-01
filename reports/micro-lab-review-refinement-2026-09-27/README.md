# Micro Lab: reviewing and refining work

September 27, 2026

## What changed

### Quiz review and practice

The quiz now uses native radio groups with named questions, progress announcements, and a shortcut to the next unanswered question. Submitting or switching practice mode moves focus to the new heading.

Results can show all questions or only those needing review. Students can practice missed questions with immediate explanations while their original answers and score remain intact. Practice survives tab changes and JSON restoration. A new quiz explicitly clears the attempt and practice; XP is awarded only for improving the saved best quiz score.

Scores and Home progress are derived from valid answer indexes. Malformed stored answers cannot unlock submission, invalid cached scores cannot inflate results, and missing answers appear as “No answer recorded.”

### Growth notebook

An optional **Compare saved runs** table shows each run's original prediction, observed outcome, control population, trial population, and signed difference at 24 model hours. It identifies differing or missing controls so students can interpret comparisons correctly.

Trial IDs now remain stable after deletion and match the text and CSV exports. **Use saved trial settings** prepares the next run while preserving the current control, draft prediction, and saved evidence. An absent original prediction is identified explicitly.

### Microscope notebook

The notebook is discoverable before the first measurement and lists all five slides as saved or pending. Students can reopen a saved measurement's original viewing method, magnification, display zoom, and scale with explicit focus assistance. Reviewing preserves working estimates and checked results.

Text downloads include each checked estimate, its units, conversion to micrometers, reference size, difference, practice range, scale-bar comparison, and saved viewing settings. Pending slides remain visible in the report. Draft estimates stay in the lab. High/low feedback and conditional unit guidance help students revise their estimate without changing their entry automatically.

### Print reference and factual corrections

The print reference now explains biosafety as a framework requiring assessment of the organism and procedure. It removes fixed species-to-level assignments and the claim that maximum containment means no vaccine exists. Classroom handling follows approved procedures.

The microbe table includes a caption, row headers, complete habitat text, and a keyboard-accessible scroll region on narrow screens. T4 bacteriophage is described as infecting bacteria. The microbiome section distinguishes influences from proven health outcomes and retains hygiene guidance.

Three quiz items were corrected: fermentation does not establish safe room-temperature storage; cell size and optical resolution are distinct; and endosymbiosis concerns organelle ancestry. Correct-answer indexes and deterministic answer rotation are preserved.

## Validation

**120 focused tests passed across nine test files. All 12 browser scenarios passed across the three Micro Lab suites.** New review/notebook scenarios and existing investigations were run separately; the older growth scenario was updated to use the new next-run label and to scope its hourly data-table check. No browser page errors were recorded. The scoped whitespace check passed.

The focused checks cover scoring, stored-state repair, practice preservation, XP behavior, saved growth controls, trial identity, microscopy calibration, view restoration, exports, print content, and runtime mirror parity. Browser scenarios cover keyboard interaction, downloads, 320- and 390-pixel layouts, print media, and existing investigations.

```text
node node_modules/vitest/vitest.mjs run tests/microbiology_growth_model.test.js tests/microbiology_growth_workflow.test.js tests/microbiology_microscope.test.js tests/microbiology_resistance_sim.test.js tests/microbiology_mystery_workflow.test.js tests/microbiology_snow_map.test.js tests/stem_microbiology_quiz.test.js tests/microbiology_quiz_workflow.test.js tests/microbiology_print_reference.test.js --maxWorkers=1 --testTimeout=20000
node node_modules/@playwright/test/cli.js test tests/e2e/microbiology-review-notebooks.spec.ts tests/e2e/microbiology-deeper-inquiry.spec.ts tests/e2e/microbiology-investigation.spec.ts --workers=1 --reporter=line
```

Source and desktop runtime copies are synchronized. Both default string registries include the new interface text; this does not add translations to every language pack. The repository-wide suite was not run. The existing test harness emits a React act deprecation warning.

Runtime SHA-256 for both copies: `D8706EA7905D791039547DEC2E0B67D2A6FA9328FBB150702E81133B1E10A7F5`.

## Reviewed visuals and downloads

- [Quiz practice, desktop](quiz-practice-desktop.png) and [phone](quiz-practice-phone.png)
- [Saved growth comparisons, desktop](growth-review-desktop.png) and [320-pixel phone](growth-review-phone.png)
- [Microscope notebook, desktop](measurement-notebook-desktop.png) and [phone](measurement-notebook-phone.png)
- [Reference, phone](reference-phone.png) and [print media](reference-print.png)
- [Measurement notebook download](measurement-notebook.txt)
- [Growth notebook after removing a trial](growth-notebook.txt)

## Scientific sources and limits

- [CDC/NIH biosafety guidance](https://www.cdc.gov/labs/bmbl/index.html) and [ASM teaching-laboratory guidance](https://asm.org/getmedia/e0cc1a61-74bb-402e-a4f9-80c9de0186fd/asm-biosafety-guidelines.pdf): biosafety practices depend on the activity and assessed risks.
- [NIH/NIEHS microbiome overview](https://www.niehs.nih.gov/sites/default/files/health/materials/microbiome_508.pdf), [NCCIH probiotics](https://www.nccih.nih.gov/health/probiotics-usefulness-and-safety), and [CDC handwashing](https://www.cdc.gov/clean-hands/about/): microbiome evidence and hygiene guidance.
- [National Center for Home Food Preservation](https://nchfp.uga.edu/how/ferment/recipes/sauerkraut/): storage depends on the food and tested process.
- [OpenStax eukaryotic cells](https://openstax.org/books/biology-2e/pages/4-3-eukaryotic-cells): organelle ancestry and cell structure.

Growth remains a deterministic teaching model in arbitrary population units. Microscopy measurements describe calibrated drawings; the ±20% practice band is educational feedback, not uncertainty for a real sample. Print media was visually reviewed; pagination depends on browser and printer settings.

All changes are local. No deployment was performed.
