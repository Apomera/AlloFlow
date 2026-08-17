You are **Lane X2** of wave 3 in `C:\Users\cabba\OneDrive\Desktop\UDL-Tool-Updated`, branch
`main`. Read `FLEET_2026-08-16/RULES.md` and `WAVE3_PLAN.md`; duplicate-lane check applies.
Lane ID **X2**. Test-only lane: new files under `tests/e2e/` (plus reading W2's harness
patterns in `_dev_scratch/w2/` — a goldmine of working extraction/print-emulation code).

## Mission: e2e-pin documents, printing, and export honesty

Wave 1-2 fixed export clipping, annotation anchoring, always-light printing, and built the
cloze worksheet — verified by unit harnesses and one-off probes. Pin the top document
journeys so a future change cannot un-fix them silently.

## The journeys

1. **Dark-mode print stays light (the class fix, W2's 7b).** Mount the crossword (the
   pattern in `_dev_scratch/w2/c7b_crossword_print.mjs` drives the real built module against
   the real theme CSS), set app theme dark, `emulateMedia({media:'print'})`, and assert a
   letter square's computed background is white and text black. Add one NON-crossword surface
   (any `.section` card from the docsuite scope) asserting the same, so the test covers the
   generator-level rule rather than one tool. Also assert the modal header is display:none in
   print.
2. **Cloze worksheet end to end.** Drive the real built `doc_pipeline_module.js` through the
   injected-state seam `tests/cloze_worksheet_print.test.js` already uses, but at the
   rendered-HTML level in a browser: generate a worksheet export with a Spanish fixture,
   load the HTML in the page, and assert blanks are visually present (fixed-width underlines
   render), the word bank lists the passage-language terms, the teacher copy carries the
   numbered key, and `data-ka-readable` is absent on the cloze passage.
3. **Handout reader tools.** Load a generated HTML export; press A+ to max text size and
   assert zero horizontally-clipped elements (W2's scrollWidth>clientWidth walk over
   overflow-hidden nodes) at 1280 and 390 widths; assert the % readout updates and A+
   disables at the ceiling; assert the offline font list has 9 options with
   `readerWebFonts:false` and that the file makes zero external requests (intercept and
   count network calls after load).
4. **Annotation anchoring smoke.** On that handout: create a highlight, press A+ twice, and
   assert drift between the mark and its text stays ≤ 8px (W2 measured 3-4px); reload and
   assert the mark persists.

## Rules of evidence

Same as X1: user-visible outcomes, condition-based waits, two consecutive green runs, real
failures filed as regressions rather than absorbed. These suites are heavy — mark them with
explicit generous timeouts from the start (the guide suite's OOM/timeout history is in
`tests/teacher_guide_build.test.js`'s header; learn from it, and keep each spec's document
count small).

Report → `FLEET_2026-08-16/reports/X2_report.md`, incrementally.
