# Bridge Lab current draft reports

October 2, 2026. Changes remain uncommitted.

## Enhancement

Opening the earthquake evidence report now includes the current unsaved energy investigation beside the student's prediction and explanation. The draft shows current physical inputs, the exact inspected time, chronological interval endpoints, the derived investigation question and seven energy quantities. Students can print an investigation before saving a notebook trial, including an inspection with no written notes.

The section identifies current draft evidence and explains that saving retains it in the notebook. Saved trial tables continue to use their own inputs and endpoints. Printing creates no trial and leaves writing unchanged. Closed inspections retain the existing notes-only report; disabled earthquake models do not manufacture live evidence.

The underlying earthquake model is unchanged. Evidence uses relative modal energy in J/kg and does not estimate bridge damage or safety.

## Validation

- 13 focused unit checks passed; 121 unrelated checks in the interaction suite were skipped in this focused run.
- Five browser workflows passed: unsaved draft reports at desktop and 320 px, notebook save/restore/print at both sizes, and graphics loss/recovery.
- Parsed source; identical canonical/public mirrors; 1,163 English fallback values match both registries.
- Desktop and phone captures inspected; no horizontal overflow detected by browser checks.

The preceding enhancement's full 288-check unit run and 21 browser workflows are recorded separately in ../bridgelab-notebook-intervals-2026-10-02. This pass uses focused checks for the report change.

Run verification: node reports/bridgelab-draft-reports-2026-10-02/verify.cjs

## Captures

- [Desktop current draft report](bridge-1000-unsaved-draft-report.png)
- [Phone current draft report](bridge-320-unsaved-draft-report.png)
