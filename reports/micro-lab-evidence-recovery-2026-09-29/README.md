# Micro Lab: compare and recover saved evidence

Learners can compare Resistance snapshots, revisit the previous checked microscope estimate, and recover a removed Growth trial. Each action preserves current drafts and live investigation settings.

## What changed

- **Resistance comparison:** Choose two saved snapshot IDs. Counts and resistant shares are compared at the latest round observed in both histories. The table shows sensitive, resistant, and total living cells alongside the resistant share. Share differences use percentage points and the same whole-percentage rounding as the simulation. Extinct shares and their differences remain undefined. Original settings, predictions, and ending rounds remain visible. Saved comparison choices survive JSON reloads independently of notebook review selection.
- **Microscope estimate history:** Each specimen keeps one previous distinct checked estimate. The preview and TXT export show both versions using their own saved viewing setup, measured feature, reference, scale bar, and practice feedback. Restoring swaps the two results while keeping the current estimate draft, microscope view, and progress. An identical check preserves history; a changed check replaces the previous result. Display and export retain the entered numeric precision.
- **Growth removal recovery:** A removed trial retains its original ID, position, control, conditions, prediction, hypothesis, and explanation. Recovery survives section changes and JSON reloads. Restore selects the trial and preserves current experiment settings, notes for the next run, sweep evidence, and inspection hour. Another removal replaces the recovery slot; a successful new trial save or Keep removal ends recovery. Removed trials are excluded from counts and exports. Capacity checks never evict active evidence.
- **Restored-data fixes:** Resistance applies its eight-record limit after rejecting invalid evidence. ID repair reserves valid retained IDs first, so damaged or duplicate IDs cannot redirect a saved comparison to different evidence.
- **Keyboard and phone use:** Remove focuses the recovery action; restore focuses the restored evidence. Focus requests stay within the active mounted activity. The comparison table wraps all four columns at 320 px, with explicit snapshot names for screen readers.

## Evidence limits

Resistance snapshots may come from different rounds of one run; the comparison does not establish which setting caused a difference. The microscope practice band describes agreement with the drawing reference. Growth recovery retains only the most recently removed trial and ends under the actions listed above.

## Validation

**277 focused unit tests pass across 13 files**, including 32 new cases. Coverage includes calibrated result validation, identical checks, history swaps, JSON restoration, stable IDs, capacity, extinction, immutable projections, exports, drafts, and focus after navigation.

**16 Chromium scenarios pass without retries or skips:** six new evidence comparison and recovery scenarios plus ten saved-work regressions. They exercise real controls, keyboard focus, TXT and CSV downloads, JSON reloads, and 320–390 px layouts. The new scenarios reject page errors and check that the phone comparison table fits its container. Tests run against the local working-tree GlHarness.

The four new screenshots listed in [validation-summary.json](validation-summary.json) were visually inspected, including the complete microscope history and phone comparison table. Runtime source and desktop mirror match byte for byte. Both Micro Lab translation namespaces match, with **1,577 extracted keys**, no missing keys, and no stale changed defaults. Syntax and scoped whitespace checks pass. The synchronization script registers comparison strings and writes existing files through open handles to avoid recreation failures in synchronized Windows folders.

Exact counts, detailed results, export samples, and the validated source hash are alongside this report. Verification covers Micro Lab.

## Earlier verification runs

Initial passing results are retained: 276 unit tests and 15 browser scenarios. The restored-ID fix added one unit case and one browser scenario; both complete runs then passed. Full phone screenshots prompted the final table layout adjustment. A subsequent unit run passed 276 tests and caught an unsynchronized runtime mirror after file-write failures. Synchronization completed using existing file handles, and the final complete runs passed all 277 unit tests and 16 browser scenarios. Earlier result files remain available for traceability.
