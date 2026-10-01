# Micro Lab Growth evidence citations

October 1, 2026

## Changes

Growth explanations can keep up to three learner-selected model hours from a saved trial. Cited values are derived from that trial's original control and settings. The lab stores the hours, and labels the values as simulated populations.

A missing original control stays unavailable. Citations survive JSON storage and removal recovery. Existing Growth notebook downloads keep their active-trial scope; the portfolio also includes explicitly labeled recoverable evidence.

The learner's explanation, original prediction, next-run setup, other notebook records, and XP remain independent of citation changes. Only the selected trial's optional `citedHours` field changes. Keeping or removing an hour preserves unknown imported metadata and other raw records.

The citation selector shares the Growth inspection hour. Cited hours appear chronologically, with duplicate and capacity guards. Removing a citation moves keyboard focus to an adjacent remove control, or the keep control when none remain. A later focus move, edit, selection, or tab change cancels that queued focus. Removed trials show citations as read-only evidence until restored.

Growth grids now respond to the available width, so controls and saved evidence reflow under enlargement as well as at phone widths.

## Validation

The final results are recorded in [validation-summary.json](validation-summary.json).

- **587 unit checks across 17 files passed**, including 47 new pure-model and mounted workflow checks.
- **36 Chromium scenarios passed**, including seven new citation scenarios and 29 retained portfolio, design, evidence review, recovery, and navigation scenarios. No scenarios were skipped or retried; no page errors were reported.
- **1,869 Micro Lab translation labels** are registered in both runtimes, including 32 added in this pass. No missing labels or fallback mismatches were found.
- Canonical and desktop source bytes match. The scoped whitespace check passes.

The initial unit run passed 46 of 47 new checks. Its one test expected an empty array after final removal; the documented optional field is omitted instead. The assertion now checks that omission. The initial browser run passed six of seven new scenarios and exposed fixed Growth grid columns overflowing at 4× CSS zoom. Adaptive grids fixed the layout; its focused confirmation passes. Initial reports and failure artifacts are retained.

## Evidence

- [Saved-trial citations](growth-citations-desktop.png).
- [Phone layout](growth-citations-phone.png) and [enlarged layout](growth-citations-zoom.png).
- [Missing original control](growth-citations-missing-control.png).
- [Notebook TXT](growth-citations-notebook.txt), [trial CSV](growth-citations-trials.csv), [inspection-hour CSV](growth-citations-hour-12.csv), and [portfolio TXT](growth-citations-portfolio.txt).

Both CSV formats append `cited_model_hours` and `cited_evidence_json` after their existing columns. Derived citation values use three decimal places of precision; missing comparisons remain null in JSON and blank in the established comparison fields. Formula-like learner text retains the existing CSV protection. The notebook and CSVs include active trials; the portfolio also labels the recoverable trial.

## Limits

These are optional citations from an illustrative deterministic model, not biological measurements. Citations support learner-written reasoning; they do not automatically establish causation or grade an explanation. Original prediction outcomes continue to use hour 24, regardless of cited hours.

This builds on the [evidence portfolio pass](../micro-lab-portfolio-2026-10-01/README.md), which passed 540 unit checks and 29 browser scenarios. Enlarged-layout checks use CSS zoom at 2× and 4×. Browser checks cover native keyboard activation, focus races, accessible names and status attributes, 44-pixel citation controls, literal learner text, exports, and internal overflow. The four citation screenshots were visually reviewed; this is not a complete screen-reader or WCAG audit.

These changes were left uncommitted at the end of this pass. The later [selected-portfolio pass](../micro-lab-selected-portfolio-2026-10-01/README.md) records their combined commit status.
