# Micro Lab: portable evidence and report recovery

Learners can now download more of their evidence and recover an earlier Mystery report while keeping their current notes.

## What changed

- **Gram evidence report:** A text download separates the last saved prediction, interpretation, and explanation from current working notes. It includes only staining stages observed in the current investigation. Saved records do not contain a historical stage log, and the export states that limit. Note-only work, wrong or missing predictions, partial observations, and legacy records remain usable.
- **Gram comparison:** A native disclosure shows only written fields that differ between saved and working versions. Literal learner text remains text. Download feedback clears when its content changes and does not alter investigation data or keyboard focus.
- **Growth comparison CSV:** A download inside Compare saved runs captures the selected model hour, original paired conditions, stable trial IDs, notes, simulated counts, and differences. Original predictions and outcomes have explicit hour-24 labels. Missing controls produce unavailable comparisons, and text cells are protected against spreadsheet formulas. Existing notebook and trial exports retain their established contents.
- **Mystery report recovery:** An explicit update keeps one validated previous report per case. Learners preview its classification, complete cited observations, reasoning, and conclusion before restoring it. Restore swaps the two recorded snapshots and preserves working notes, revealed observations, current view, and progress counts. Downloads label current, previous, and working evidence separately.

## Validation

**204 unit tests passed across 11 focused files.** This adds 20 regressions to the prior 184-test baseline. Coverage includes partial and malformed data, JSON restoration, bounded report history, literal text, CSV escaping, unchanged grading, and download failure cleanup.

**12 Chromium scenarios passed without retries:** six new export/recovery scenarios and six saved-work regressions. They cover actual downloads, keyboard actions, reloads, and 320–390 px layouts through the local working-tree GlHarness. Each run writes its own artifacts so earlier validation reports remain intact.

The new Gram comparison, growth export, and Mystery history views were visually checked on phones; the Mystery preview was also checked on desktop. Runtime source and desktop mirror match byte for byte. Both Micro Lab translation namespaces match, with **1,505 extracted keys**, no missing keys, and no stale changed defaults. Syntax and scoped whitespace checks pass.

Exact counts and the validated source hash are in [validation-summary.json](validation-summary.json). Detailed test results, screenshots, and sample text/CSV downloads are alongside this report. Verification covers Micro Lab and does not claim a full repository build or deployment.

## Evidence limits

Gram reports preserve written saved fields; the current draft supplies its own observed-stage list. Growth counts are simulated arbitrary units, and changing the inspection hour does not change prediction grading at hour 24. Mystery history retains one previous snapshot; a later explicit report update replaces that history slot.
