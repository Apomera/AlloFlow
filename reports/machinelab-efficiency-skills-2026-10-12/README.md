# Machine Lab: efficiency skills and energy visuals — October 12, 2026

The Efficiency & calculation lab now offers seven skills per machine. Four additions work backward from known work or force values, while the original input-work, effort-force and energy-loss questions remain available.

| New skill | Given values | Calculation | Answer |
| --- | --- | --- | --- |
| Useful output work | Input work and efficiency | Input work × efficiency as a decimal | J |
| Efficiency | Useful output and input work | Useful output ÷ input work × 100 | % |
| Actual mechanical advantage | Load and modeled effort force | Load force ÷ effort force | ×, a dimensionless ratio |
| Total hand travel | Input work and modeled effort force | Input work ÷ effort force | m |

All six machine stations support these four additions: 24 new station/skill combinations and 42 total efficiency combinations. New questions have unit checking, two progressive hints, a deliberate worked solution, and specific retry guidance. Next skill cycles through the seven questions and clears the previous answer, hints and completion state. Saving remains explicit and retains one latest efficiency calculation per station; the interface explains that saving again replaces that station's prior calculation.

The comparison disclosure now contains an energy ledger: solid useful-work and striped loss segments share one input-work scale. Each has a numerical joule value and percentage. There is no artificial minimum segment width, so 100% efficiency has exactly zero loss width and small losses keep their correct proportion. Accessible captions and text carry the same information as the decorative bar. Dark and forced-color styling retains both segment identities.

Larger metric cards, compact skill menus, full question headings, highlighted givens and bordered feedback improve the practice layout. Comparison and main-lab disclosures still start closed. At small mechanical advantages, metric cards now use significant figures rather than rounding a value such as 0.0005 to 0.001.

Efficiency percentages and decimal fractions in problem statements, calculation setups and saved assumptions now retain their precision. For example, 99.9999% must not be displayed as 100% when calculating a small nonzero loss. New inverse questions display full derived operands. Their checks allow 1% with a 0.0000000001 absolute floor and recommend three significant figures. The three original skills keep their previous grading allowance of 1% or 0.0005, so existing checked work remains valid.

Original skills continue to save version-1 records; new skills save version-2 records. Validation binds each version to its supported skills and derives results from fixed stored settings, rather than trusting imported result fields. Viewed-solution provenance survives later answer edits. The expanded unit menu is also available as distractors in original questions: a viewed solution may honestly retain any offered entered unit, while checked records still require the correct unit. Existing version-1 records remain readable. No scores are awarded.

## Scope and verification

Frozen canonical/public SHA-256: `79a2cab5b82d57f53173ce472663167ee00a335642c28c52c0295e32e6e7c5b5`.

The source proof confirms that changes are confined to the efficiency session, question, answer and record helpers plus the efficiency panel. Physical math helpers, defaults, power and compound labs, other views and record-export callers are byte-identical to commit `04b899d3a`. The existing guarded change callback is identical; the save callback only changes its record-version selection.

Independent review identified and resolved near-100% hint precision and tiny actual-MA display issues before the source freeze. New tests cover independent station/skill fixtures, grading, hint and solution provenance, version validation, record export, Next-skill reset and delayed callbacks. Existing regression suites cover efficiency modeling/practice, saved work, read-aloud, localization, grade bands, accessibility and views. Native browser checks use the real React/THREE host and independent physics expectations.

All 473 cases passed across eight files and 21 observed successful native processes: 77 new cases in four processes and 396 existing regressions in 17 processes. Every assertion inventory position executed exactly once. No test or browser run failed or required retry. Syntax, source-scope, mirror parity and final evidence verification all passed. The native browser passed 648 checks across ten scenarios, with five screenshots inspected by both the browser author and primary agent. It verifies all seven skills on all six stations, narrow selectors, keyboard focus, light/dark/forced-color layouts, energy shares at 1%, fractional, near-100% and 100% assumptions, invalid inputs, fixed record provenance, legacy compatibility and a real text-record download. There were no failed or retried new-test or browser runs.

- [Desktop energy ledger](browser/run-01/desktop-efficiency-energy.png)
- [Dark phone calculation practice](browser/run-01/dark-phone-efficiency-practice.png)
- [Forced-colors phone practice](browser/run-01/forced-colors-efficiency-practice.png)

Final counts, native child exits, assertion inventories, screenshot checks and source hashes are bound in `validation-summary.json`. Generated browser HTML, temporary profiles and download duplicates are excluded from the commit. Verification is scoped: no full application build, physical assistive-technology session, performance benchmark or deployment is claimed.

Use fresh output directories when reproducing results:

```powershell
node reports/machinelab-efficiency-skills-2026-10-12/run-new-tests.cjs reports/machinelab-efficiency-skills-2026-10-12/new-tests/rerun
node reports/machinelab-efficiency-skills-2026-10-12/run-regressions.cjs reports/machinelab-efficiency-skills-2026-10-12/regression-rerun
node reports/machinelab-efficiency-skills-2026-10-12/browser/run-native.cjs reports/machinelab-efficiency-skills-2026-10-12/browser-rerun
```

The regression runner only resumes successful runs whose source, test, receipt and log hashes still match. Incomplete or unobserved exits are never counted as a pass.
