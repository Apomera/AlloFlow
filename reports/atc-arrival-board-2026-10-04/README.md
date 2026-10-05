# ATC interactive arrival board — October 4–5, 2026

The runway board now shows the full estimated arrival sequence. Each aircraft has an ordered, selectable row with its runway, arrival time, and a marker on a shared time scale. Learners can compare the gaps, select an aircraft, and reach its existing instruction controls with keyboard focus placed on the selected aircraft's heading.

## Changes

- Crossing runways use one shared sequence. Independent runway areas retain separate sequences with the same time scale.
- Every adjacent arrival pair shows its estimated gap and the model's spacing target. Amber text and borders identify gaps that need review.
- Current runway occupancy appears as a striped interval using the same flight-minute units as the arrival estimates. An estimate inside that interval also receives a written warning.
- Priority traffic has a visible label and distinctive marker. Its position still reflects the actual estimated arrival order; priority does not silently change that order.
- Held, recovering, unassigned, and otherwise unavailable estimates remain visible under “Waiting for an estimate,” with a specific explanation and an inspection button.
- Arrival and pending buttons lock during instruction drafts and math challenges. Inspection changes selection and focus without issuing an instruction.
- Gap and occupancy descriptions are associated with their inspection buttons for assistive technology. The layouts retain visible keyboard focus, minimum 44 px controls, high contrast, forced colors, and reduced-motion support.

The new board uses the existing planning estimates. The original spacing formula was extracted into a shared helper so the board and runway warnings use identical targets. Estimates respond to current aircraft speed, including progressive speed changes after an instruction. The existing model assumptions remain visible beneath the board.

## Visual evidence

- [Desktop arrival board](after-board-1440.png)
- [Complete desktop console](after-playing-1440.png)
- [320 px arrival board](after-board-320.png)
- [Held arrival](after-held-arrival-390.png)
- [Unassigned arrival](after-unassigned-320.png)
- [Go-around explanation](after-go-around-320.png)
- [Independent parallel runways](after-parallel-1440.png)
- [Keyboard focus](after-keyboard-focus-320.png)
- [Order after a real speed instruction](after-actual-speed-reorder-1440.png)
- [Occupied runway diagnostic fixture](after-occupancy-diagnostic-390.png)
- [Custom high contrast](after-high-contrast-board.png)
- [Forced colors at 200%](after-forced-colors-200percent.png)

The desktop crossing console is 2287 px tall at a 1440 px viewport. It adds the complete sequence while retaining the established radar/controls layout. No horizontal overflow occurs at the checked 1440, 390, or 320 px widths. The phone radar remains above 950 px from the top of the document. The checked arrival-button boundaries exceed 3:1 contrast against their surfaces.

## Verification

The focused browser suite passes 14 checks using installed Chrome and the actual React tool. It covers crossing and parallel runway grouping, actual hold/release and runway assignment, go-around presentation, keyboard inspection, command-recipient locking, a real speed change that reverses the arrival order, twelve guided aircraft, mobile layouts, axe serious/critical findings, custom high contrast, and forced colors at 200% zoom. Occupancy-window and math-challenge edge states use explicitly labeled presentation fixtures; they do not claim an actual landing or automatically generated challenge.

The first focused browser run passed 13 checks and used programmatic focus in its keyboard-focus assertion. The check now uses actual Tab/Shift+Tab navigation. The final full focused run passes all 14 checks. Gap and occupancy descriptions were also connected to the appropriate controls before final verification.

The unit suite passes 242 tests across 21 files, including 14 new arrival-board cases. They cover ordering, ties, heavy-aircraft spacing, crossing occupancy, unavailable estimates, terminal states, shared scaling, foreign runway references, and preservation of aircraft instructions.

All 169 existing browser checks also pass. Together with the 14 new checks, the final run passes **183 browser checks** against the unchanged source, with no recorded browser runtime errors. The completed status and per-suite counts are retained in [validation results](validation-results.json). [Focused browser results](browser-qa-results.json), [unit output](unit-tests.txt), and [mirror verification](verification.json) retain the detailed evidence. The scoped Git whitespace check passes.

The canonical and desktop tool files match. The root, desktop, and development English catalogs match with 512 ATC keys. The verified source SHA-256 is `54b1bf74a4c825904eed6c251dfd9929d5bbf291016d6e6a7f684cbcb5ebd355`.

Run all checks sequentially from the repository root:

```text
node reports/atc-arrival-board-2026-10-04/run-validation.cjs
```

Production changes are confined to the ATC tool, its desktop mirror, and the ATC English catalogs. No deployment or commit was performed. The source and desktop screenshot from the beginning of this pass are retained as `baseline-source.js.txt` and `before-playing-1440.png`.
