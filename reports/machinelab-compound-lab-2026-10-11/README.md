# Machine Lab: compound machines and skill practice — October 11, 2026

The optional **Compound machine lab** follows Power & motion lab at all six workshop stations for grades 6–8 and 9–12. Learners choose a different output machine, change its geometry independently, and set an assumed efficiency for each stage. The current station supplies the input-stage geometry; its load and load movement describe the final output task. Thirty ordered machine pairings are available.

Nine practice skills cover combined ideal mechanical advantage, combined efficiency, actual mechanical advantage, input force, input travel, transfer force, input work, input-stage loss and output-stage loss. Each has unit feedback, two progressive hints, a deliberate worked solution, and optional written reasoning. A force/travel/work table exposes the full energy path instead of hiding intermediate quantities.

## Model and calculations

For final load F, final movement d, stage ideal mechanical advantages M₁ and M₂, and efficiency fractions η₁ and η₂:

- Ideal mechanical advantage = M₁M₂; combined efficiency = η₁η₂; actual mechanical advantage = M₁M₂η₁η₂.
- Input force = F/(M₁M₂η₁η₂); input travel = dM₁M₂.
- Transfer force = F/(M₂η₂); transfer travel = dM₂.
- Work flows from Fd/(η₁η₂), through Fd/η₂, to useful output Fd.
- Each stage's loss is its incoming work minus outgoing work. The two losses sum to total input work minus useful work.

For example, F = 600 N, d = 0.5 m, M₁ = 2, M₂ = 3, η₁ = 80%, and η₂ = 50% give combined ideal advantage 6, efficiency 40%, input force 250 N and input travel 3 m. The energy path is 750 → 600 → 300 J, with losses of 150 J and 300 J.

The comparison explains when adding the input stage reduces, preserves or increases effort relative to using the output stage alone. An extra stage can require more effort when its actual mechanical advantage is below one. Its geometry changes input travel, while its efficiency changes required work.

These equations are algebraic consequences of the definitions of mechanical advantage, work and efficiency in [OpenStax Physics](https://openstax.org/books/physics/pages/9-3-simple-machines) and [OpenStax College Physics](https://openstax.org/books/college-physics/pages/9-5-simple-machines). The model assumes compatible motion, constant ratios and no extra coupling loss. It does not construct a connected 3D mechanism or validate stroke, direction, strength or starting friction. Ramp output movement means vertical rise.

## Practice and saved explanations

Answers use the existing 1% relative tolerance with a 0.0000000001 absolute floor. Three significant figures are sufficient. Decimal displays preserve small values, and efficiency givens preserve precision near 100%. Units are checked separately. Written explanations are optional, limited to 600 characters, and not automatically graded.

Changing either stage, its geometry, efficiency, final task or skill clears the visible attempt. Delayed callbacks cannot check or save a different task. Viewing a worked solution remains recorded after later edits. Saving is explicit; Next skill does not save automatically.

Each station keeps at most one valid fixed snapshot per skill. Saved geometry, final task, efficiencies, answer, unit, hints, explanation and completion method are included in the work-record copy and download. The saved count describes collected practice, not mastery. Imported records are validated and calculations are regenerated from the snapshot. Existing designs, efficiency, power and investigation evidence retain their meaning.

## Verification

Final counts, process exits, source hashes, native receipts, screenshots and retained diagnostics are recorded in `validation-summary.json`. The source and public mirror are byte-identical at SHA-256 `1e69434c9195deb4e6e85aab4d8f1f631c032a47c25bb3439670bccfa8ba5e72`.

Final coverage is **1,392 passing cases across 21 files in 39 successful fresh processes**: 1,169 existing cases and 223 new ones. All final child-process exits are zero. The 192 view cases run in eight disjoint groups of 24; earlier efficiency and power suites retain their established disjoint groups. Retained failed or incomplete attempts do not contribute to this count.

Focused checks use independent physics equations, all thirty ordered pairings and all 54 default station/skill combinations, boundary values, invalid inputs, units, precision, state changes and saved-record validation. Existing Machine Lab coverage is rerun in 34 fresh processes, with each assertion counted only where it executed. No single invocation is claimed to run all cases.

All **223 new cases** pass in five fresh processes: 38 physics, 51 comparison, 74 grading, 27 guided-practice and 33 saved-record cases. Every process exited zero on its first attempt. An independent review verified native receipt and log hashes, the identical inventories and exactly-once coverage. The review also found no blocking issues in the model, interaction guards, saved-record validation or ledger accessibility.

Native Chromium passed **649 checks across 14 fresh scenarios**, with zero errors and no reruns. Four screenshots were visually inspected: [desktop](browser/desktop-compound-checked.png), [phone hints](browser/phone-compound-hints.png), [forced colors](browser/forced-colors-compound-solution.png) and [dark saved work](browser/dark-phone-compound-record.png). The narrow stage ledgers retain readable numbers while labels wrap. The [native download](browser/downloaded-record.txt) contains two separate compound skill records and a literal written explanation alongside prior design, efficiency and power records.

The native browser harness uses real React/THREE rendering, keyboard events and a native text download. Temporary browser profiles, generated HTML and duplicate downloads are excluded from the report. No full application build, physical assistive-technology session, performance benchmark, push or deployment is claimed.

The first regression shell launch failed while creating its PowerShell pipeline; the command was relaunched with the login profile disabled. A subsequent native Node allocation failure occurred before the work-record suite collected any tests. Its zero-case receipt, log and process manifest are retained with `initial` filenames and excluded from coverage. The same command and memory settings passed that suite on retry. Resume verifies prior successful receipt hashes and inputs, then recounts the full inventory without rerunning those cases or changing assertions and timeouts.

One view group later exited 1 with a partial receipt (two passes, no failed assertions) while the tool session became unavailable. The cause was not established. Its receipt, log and manifest are retained with `interrupted` filenames and excluded; the complete unchanged 24-case group passed on retry.

Later unavailable command sessions were resumed from persisted, verified successful receipts. A detached launch produced no output and contributes no coverage. Only the 34 regression and five focused processes with observed zero child exits count. Generated metadata and console/diagnostic logs use Git LF form; trailing whitespace and extra terminal blank lines are removed from logs. Native assertion receipts, screenshots and the downloaded record remain unchanged.

For later reproduction, run serially from the repository root, using fresh output folders to preserve original receipts:

```powershell
node reports/machinelab-compound-lab-2026-10-11/run-regressions.cjs reports/machinelab-compound-lab-2026-10-11/regression-rerun
node dev-tools/ml_compound_lab_qa.cjs reports/machinelab-compound-lab-2026-10-11/browser-rerun
```

The focused-test manifest records exact group filters and execution settings. Heavy checks use 512 MiB old space, 8 MiB semispace and one worker. Do not run unit and browser verification concurrently on a memory-constrained host.
