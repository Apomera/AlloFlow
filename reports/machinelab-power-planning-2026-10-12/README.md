# Machine Lab: power-budget planning — October 12, 2026

The Power & motion lab now connects power, time, energy and task capacity. A new optional “Plan a task at this power” disclosure compares input work needed with input energy available, followed by five numerical planning cards. Solid and striped bars share a zero-based energy scale and have accompanying text values. Tiny bars retain their mathematical proportions without a minimum visual width. The panel supports narrow screens, dark mode and forced colors.

Four new calculation skills are available at every station:

| Skill | Calculation | Unit |
| --- | --- | --- |
| Input energy available | Input-power budget × time in seconds | J |
| Load at budget | Power × time × efficiency as a decimal ÷ held load movement | N |
| Movement at budget | Power × time × efficiency as a decimal ÷ held load force | m |
| Required efficiency | Load force × movement ÷ (power × time) × 100 | % |

For a 100 W budget, a 2 s task and 80% efficiency, 200 J enters the machine and 160 J is useful. With movement held at 0.5 m, the available useful work supports a 320 N load. With the load held at 400 N instead, it supports 0.4 m of movement. These are alternative calculations: their two limits must not be combined into a larger task. Lifting 400 N through 0.5 m would require 100% efficiency at this power and duration. A required efficiency above 100% remains visible and means the task needs more time or power, or a smaller load or movement.

The ramp explicitly asks for vertical rise, not travel along its slope. These are energy-based limits at sustained full mechanical input power and constant efficiency. They do not constrain peak force, available travel, strength or acceleration, and do not apply calculated capacities to station settings. Changing mechanical advantage alone trades effort for hand travel without changing task work.

The four additions create 24 new station/skill combinations. Four stations now offer ten power skills; windlass and screw offer twelve, including their existing torque and RPM skills. All 64 combinations use the existing practice workflow: unit selection, progressive hints, specific retry guidance, worked solutions, Next skill and explicit saving. Compact selector labels now have full question headings beneath them. Input-energy feedback reminds learners not to apply efficiency to input energy. Answers use the existing 1% tolerance with a 0.0000000001 absolute floor.

Original skills retain version-1 records, while the four new planning skills use version 2. Each station keeps its latest saved record per skill. Validation reconstructs values from stored assumptions and checks the supported skill/version pairing. Checked work requires the correct number and unit; viewed solutions preserve their provenance even when an entered unit is wrong. Legacy records remain readable, and the work-record export includes the new questions and assumptions. Required-efficiency results retain full precision in their card, worked solution and export so a result just above 100% is not displayed as 100%. This is a practice collection with no points or mastery claim.

## Scope and verification

Frozen canonical/public SHA-256: `19b5d0f85931b68081c2e64cee39d26cbfc63d0b721704cecb2f747f18c7131c`.

The source proof against commit `1745ec1e1` confines production edits to one added math helper and the existing power helpers/panel. Existing physical math, efficiency and compound labs, defaults, other views and export callers are byte-identical. The guarded change callback is identical and the save callback changes only the record-version selection. The prior power test changes one explicit selector expectation to include the new skills; its original assertions remain. Every other selected regression file retains its baseline hash.

The final new suite passes all 111 cases in five observed successful native processes. It covers independently calculated formulas, invalid inputs and overflow, all 24 new station/skill combinations, hints and units, Next skill, stale callbacks, legacy and new records, export and just-above-100% precision. The first attempt exposed an incorrect overflow fixture, which was corrected; a second attempt passed on the earlier candidate before the display-precision fix. Both earlier attempts remain documented with their original receipts and snapshots and are excluded from the final count. Independent implementation and evidence-wiring review found no remaining blockers after the precision fix.

The complete final validation passes **568 cases across eight files and 23 observed successful native processes**: 111 new planning cases and 457 existing regressions. Every assertion inventory position executed exactly once. Existing regression coverage includes saved work, read-aloud, localization, grade bands, accessibility, station views and original power skills. All final-candidate test and browser runs passed on their first attempt. Syntax, mirror parity, source scope and the final evidence verifier also pass.

Native Chromium passes 956 checks across ten scenarios with zero errors. All five screenshots were inspected by both the browser author and primary agent. Coverage includes all six stations, two real text-record downloads, dark and forced-color layouts, narrow selectors, keyboard focus, unit feedback, proportional energy bars, invalid assumptions, minutes, independent records and required-efficiency values above 100%.

- [Desktop planning view](browser/run-01/desktop-power-planning.png)
- [Dark phone planning view](browser/run-01/dark-phone-power-planning.png)
- [Dark phone calculation practice](browser/run-01/dark-phone-planning-practice.png)
- [Forced-color planning view](browser/run-01/forced-colors-power-planning.png)
- [Forced-color calculation practice](browser/run-01/forced-colors-planning-practice.png)

Validation results are recorded in `validation-summary.json`, with native child exit receipts, source/test hashes, stable assertion inventories and inspected screenshot hashes. Temporary browser HTML, profiles and duplicate downloads are excluded from the commit. Verification is scoped to the unit suites and the native local React/THREE host; no full application build, physical assistive-technology session, performance benchmark or deployment is claimed.

Use fresh output directories when reproducing results, and run these commands serially:

```powershell
node reports/machinelab-power-planning-2026-10-12/run-new-tests.cjs reports/machinelab-power-planning-2026-10-12/new-tests/rerun
node reports/machinelab-power-planning-2026-10-12/run-regressions.cjs reports/machinelab-power-planning-2026-10-12/regression-rerun
node reports/machinelab-power-planning-2026-10-12/browser/run-native.cjs reports/machinelab-power-planning-2026-10-12/browser-rerun
```

Runners only resume successful receipts whose frozen inputs and output hashes still match. Failed or unobserved native exits are never counted as passes.
