# Machine Lab: visual practice map

Open **Power & motion lab → Practice a power & motion skill → Explore skills and saved practice**.

The optional map groups the existing exercises into Power and energy, Movement rates, Plan a task, and Rotation. Rotation appears only for windlass and screw. Each tile shows the skill and answer unit; a visible Current skill label and pressed state identify the selection. Tiles select the existing exercise below the map. Selecting the current tile preserves its draft; switching skills clears the draft through the existing guarded callback.

Saved-work labels distinguish checked answers, viewed solutions, and unsaved skills. Hint counts stay explicit. Setup labels compare the original geometry, load, movement, efficiency, task time in seconds, and power budget with the current inputs. Equivalent minute/second inputs match. These labels describe the saved snapshot; changing inputs never rewrites it. Invalid imported records are omitted through the existing validation rules.

The map starts collapsed, has native keyboard controls and visible focus, and stacks into one column on narrow screens. Selected state remains visible as text in forced colors. Existing dropdown and Next skill navigation remain available. Skill counts remain ten per linear station and seventeen per rotary station, 74 combinations total.

Only `practice()` inside `stationPowerLab()` changed relative to `d5aa990f3`. Calculation, grading, state, record, export, and other-view helpers are byte-identical. Canonical/public SHA-256: `0b7b3109ec57ce4aa27407c041336bd66b99ca3ccb7d29bb91e6765f1ffa5441`. See [source-scope.json](source-scope.json).

## Review and validation

All **286 selected tests across nine files** passed against the final source: 29 new focused cases and 257 existing regression cases, in 16 serial native processes. Final test processes and wrappers exited successfully.

Native Chromium completed **238 checks across six scenarios**, with three screenshots independently inspected by root and the browser agent. Scenarios cover desktop, dark phone, forced colors, keyboard selection/focus, current-skill no-op, saved provenance, setup changes, malformed records, and linear/rotary inventories. Browser coverage includes five station types; unit inventory coverage includes all six.

Evidence: [validation summary](validation-summary.json), [focused tests](new-tests/run-02/final.json), [regressions](regressions/run-02/final.json), and [browser](browser/final.json).

Previews: [desktop map](browser/run-01/desktop-windlass-skill-map.png), [dark phone](browser/run-01/dark-phone-screw-skill-map.png), [forced colors](browser/run-01/forced-colors-windlass-skill-map.png).

Independent read-only implementation review found no blockers: validated record counts, hint/solution provenance, normalized time comparison, guarded navigation, and accessible controls are consistent with the existing model.

Focused tests cover skill inventories, navigation state boundaries, and saved provenance. Selected existing regressions cover work records, read-aloud, translations, grade bands, accessibility, guided power practice, power/planning state and records, and all rotary tests. Unchanged physics-only branches are excluded from this pass.

The first regression attempt found a reused translation key for the new heading. The new heading now uses `power_skill_map_title`; its visible text and behavior are unchanged. The initial failing regression receipts and successful focused tests for that superseded candidate remain in their `run-01` directories, with runner snapshots. Final counts use only the corrected candidate's fresh `run-02` test runs.

Browser checks use local React/THREE and native Chromium with software WebGL. Forced colors are emulated. A deployed host build and physical assistive technology are outside this local validation.

## Reproduce

From the repository root, use fresh output directories for native runs:

```powershell
node reports/machinelab-skill-map-2026-10-12/verify-scope.cjs
node reports/machinelab-skill-map-2026-10-12/run-new-tests.cjs <fresh-focused-test-directory>
node reports/machinelab-skill-map-2026-10-12/run-regressions.cjs <fresh-output-directory>
node reports/machinelab-skill-map-2026-10-12/browser/run-native.cjs <fresh-browser-directory>
node reports/machinelab-skill-map-2026-10-12/verify-evidence.cjs
```

Changes are local; no push or deployment is included.
