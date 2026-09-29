# CircuitTool: compare saved observations

Active electronics now lets students compare two recorded operating points before writing their explanation. Recording leads directly into a note, and notebook actions preserve the intended observation when rows move.

## Learning and presentation

- **Compare saved readings** shows both recorded inputs and operating regions, shared-scale lamp-current bars, and signed changes in base current, lamp current, transistor voltage, and lamp power. Selecting points keeps the readings independent of the live bench.
- Probe readings show their captured lead pairs. A probe-voltage delta appears only when both points use the same red and black nodes. Reversed or different connections remain visible individually.
- Feedback distinguishes matching settings, one changed setting, several changed settings, and different circuit types. Reference comparisons and HTML reports also show each operating input and avoid describing a changed circuit type as a controlled one-setting test.
- Recording opens the notebook and the corresponding card, then focuses **What I noticed**. Equivalent settings with the same probe pair reopen the saved note. Different probe pairs remain distinct observations.
- Measurement cards use full names alongside IB, IC, and VCE. Notebook summaries, readouts, recovery cards, and comparison controls wrap for phone widths and enlarged text.
- Notebook actions use one active status announcement. Recovery controls regain full opacity as soon as they are enabled; their transitions stop under reduced motion.

## Evidence continuity

Note edits, removal, replay, and reference selection target the displayed entry rather than its former array position. Older duplicate records retain their separate notes. Replaying a saved circuit preserves the notebook and adds electrical Undo only when relevant settings change.

The notebook holds eight active observations and up to eight removed observations for recovery. Recording and restoration check current capacity; neither silently evicts evidence. Recovery preserves the original design, probe polarity, and note. Restoring an older equivalent reading can retain its distinct historical note. Explicit Discard removes only the selected recovery copy.

Removal, restoration, and discard return focus to the notebook summary. A removed selected comparison point clears its selector rather than displaying a shifted row. Note edits retain comparison selection; loading replacement observation objects requires choosing points again.

## Files and validation

The investigation file format remains unchanged. JSON and HTML reports contain the active saved observations, authored notes, and explanation. The comparison selection and removed-observation queue are view/session metadata.

The regression receipt hashes both source copies and every test file. The browser audit records source and mirror hashes at the start and end, checks workflow behavior, and measures accessibility, visible focus, touch targets, card padding, text resizing, and page overflow. PNG captures accompany the measurements.

These checks render the local CircuitTool component with React and the app's generated styles. The electrical equations remain the existing illustrative DC models.

Final validation passed: **259 tests across 18 files**, **19 browser accessibility and layout scans**, **62 visible-focus checks**, and **11 focus transitions**. Three scenarios also passed with text enlarged to 200%. The source and desktop mirror matched throughout both runs. No browser errors or visual issues were recorded.

### Preview

- [Compare two saved readings](single-setting-comparison-390.png)
- [Record directly into a note](recorded-notebook-390.png)
- [Restore removed observations](pending-recoveries-390.png)
- [Recovery with 200% text](pending-recoveries-200pct-text-320.png)

### Reproduce

From the repository root:

```powershell
node reports/circuit-observation-comparison-2026-09-29/run-regression.cjs
node reports/circuit-observation-comparison-2026-09-29/browser-check.cjs
node reports/circuit-observation-comparison-2026-09-29/validate.cjs
```

The repository's installed Vitest, Playwright, Chromium, React, and axe-core dependencies are required. Final counts, file hashes, and the screenshot inventory are saved in `validation.json`, `regression-receipt.json`, and `browser-results.json`.
