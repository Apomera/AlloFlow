# Micro Lab: resuming and comparing evidence

This pass improves how learners return to saved work, inspect differences, and continue an investigation.

## Changes

- **Microscope:** Pending estimates show their viewing settings. Resume restores the original method, magnification, and display zoom with disclosed focus assistance. It preserves the draft and earlier checked result, and keeps visibility, cropping, and measurement-readiness checks active.
- **Mystery specimens:** Compare revisions shows recorded and working values for changed classifications, citations, reasoning, and conclusions about limits. Full cited observations remain available even when their panels are collapsed.
- **Growth:** Compare saved runs can inspect any model hour from 0 to 24. Each run uses its own saved control. Original predictions and outcome labels retain their hour-24 meaning; exports retain the recorded evidence.
- **Gram staining:** Invalid restored stage values cannot create progress. A valid saved report survives a damaged or restarted draft. Home identifies pending revisions and the next action. Saving and restarting announce results and place keyboard focus at the relevant control.
- **Resistance:** Removing evidence announces its stable record ID and focuses the next record or the empty notebook heading. The current run and notes remain available.

These changes build on the [saved-work and evidence notebook improvements](../micro-lab-workspace-evidence-2026-09-28/README.md), which are included in the same scoped commit.

## Validation

**184 focused unit tests pass across 11 files in the final consolidated run.** Initial runs exposed a shared URL mock leak and a test-only descriptor comparison issue. Both are corrected; the earlier reports are retained alongside the passing final report.

**12 Chromium scenarios pass without retries:** six new scenarios plus six existing workspace and notebook review scenarios. Coverage includes keyboard interaction, JSON restoration, exports, print media, and layouts at 320–390 px. Tests serve the working-tree tool through the local GlHarness.

Screenshots were inspected for desktop revision comparisons and phone microscope, growth, and Gram views. Runtime source and desktop mirror match byte for byte. Both Micro Lab translation namespaces match, with **1,469 extracted keys** and no missing keys or stale changed defaults. Syntax and scoped whitespace checks pass.

Exact results and the validated source hash are in [validation-summary.json](validation-summary.json). Detailed test results and screenshots are in this folder. Validation covers Micro Lab; this report does not claim a full repository build or deployment.

## Saved-context limits

Version-1 microscope contexts do not store historical focus. Resume applies and discloses focus assistance while restoring the saved view settings. Measurement checks continue to require a resolvable, sufficiently large, uncropped feature. The selected growth inspection hour is a workspace preference; the saved prediction outcome remains hour 24.
