# Machine Lab: plan a compound task from a power budget — October 11, 2026

The existing grades 6–12 Compound machine lab now supports inverse planning. Learners choose a mechanical input-power budget and calculate the time needed, load supported at a held movement, movement supported at a held load, and minimum combined efficiency required by a deadline. Four new guided calculations bring compound practice to **18 skills per station**. The planner sits inside the existing comparison disclosure and never applies its results to the simulation.

## Model and learning purpose

Let final load be `F` newtons, final movement `d` metres, task duration `t` seconds, mechanical input-power budget `B` watts, and stage efficiency fractions `η₁` and `η₂`. With `η = η₁ × η₂`, the existing series model gives useful work `Fd` and input work `Fd/η`. The planner rearranges these relationships:

| New skill | Calculation | Held values |
| --- | --- | --- |
| Time at budget | `Fd / (ηB)` seconds | Task and efficiencies |
| Load at budget | `Btη / d` newtons | Movement, time, budget and efficiencies |
| Movement at budget | `Btη / F` metres | Load, time, budget and efficiencies |
| Required combined efficiency | `Fd / (Bt) × 100` percent | Task, time and budget |

These are our algebraic derivations from [average power and energy transfer](https://openstax.org/books/university-physics-volume-1/pages/7-4-power) and [machine efficiency](https://openstax.org/books/physics/pages/9-3-simple-machines). No source examples, figures or exercise text are reproduced.

For a 600 N load moving 0.5 m, efficiencies of 80% and 50%, a 50 W input budget and ten seconds, the current task requires 75 W. The alternatives are 15 seconds, 400 N at the held 0.5 m, or 0.333333 m at the held 600 N. The required combined efficiency is 60%, compared with the assumed 40%. Changing geometry alone cannot change these energy limits when task, efficiencies, budget and time stay fixed.

Load and movement capacities are **alternatives**, not simultaneous limits. A ramp output's movement is vertical rise. Results remain unclamped even outside input/slider ranges; they are mathematical energy limits under a sustained budget and constant efficiencies, not strength, peak-force, stroke, acceleration or electrical-consumption predictions. No calculated setting is automatically applied.

The planner distinguishes an over-budget task at the assumed efficiencies from a task impossible even with loss-free stages. Required efficiency may exceed 100%; that is a meaningful calculated requirement indicating an impossible target. Both fit statements compare their respective power demands against the same budget with a relative numerical tolerance of `1e-9`.

Each new skill provides unit feedback, two progressive hints, a deliberate worked solution, a specific retry prompt and an optional explanation. Required-efficiency feedback explicitly avoids the currently assumed stage efficiencies because this skill solves for their product. Reflections ask learners to change one condition, identify held values and explain why mechanical advantage alone cannot reduce required energy. Reflections are saved, not automatically graded.

## State and compatibility

The budget defaults to 100 W and accepts 0.01–100000 W. Duration retains the existing 0.01–3600-second range and seconds/minutes conversion. An invalid budget disables only the four planning skills; all fourteen earlier compound skills remain available with valid time. Invalid time still permits the nine original energy/force/travel skills. Stale and directly invoked callbacks are guarded, and changes to budget or task clear the current attempt.

Original energy records keep their exact version-1 shapes; earlier power records retain version 2. Only new planning records use version 3 with frozen numeric seconds and budget. Saved calculations, explanations, entered answers, hints and checked/solution provenance are recomputed from that fixed snapshot when displayed, copied or downloaded. Later live changes cannot reinterpret the saved task. Seconds are available as an answer unit only for planning; old solution-record validation has not been broadened. Records remain bounded to one per skill, with explicit saving and no mastery/score claim.

## Verification

Frozen canonical/public source SHA-256: `c8782233487e8f5148ae3e8d4cba03d14e9591d074154dadbd33ddc81c3892b0`.

**1,107 tests passed across 11 files in 37 observed successful serial processes.** Every assertion was executed exactly once across the filtered runs. No failures or retries occurred.

| Coverage | Passed cases | Native processes |
| --- | ---: | ---: |
| New compound planning | 159 | 5 |
| Existing compound power and original compound practice | 379 | 10 |
| Selected existing Machine Lab regressions | 569 | 22 |
| Total | 1,107 | 37 |

The native browser run passed **684 checks across 13 scenarios**, with exit 0, four inspected screenshots and a real text download. It checks all 24 new station/skill answer combinations, budget/time boundaries, impossible efficiency targets, keyboard practice, 320-pixel forced-color labels, geometry invariance, grade gating and mixed version-1/version-2/version-3 saved records. Separate physics tests cover all 30 ordered machine pairs.

Independent review checked equations, numerical fit consistency, required-efficiency feedback, invalid-input independence, stale callbacks, units and fixed record versions. The original compound work and power helpers remain unchanged. Two review findings were corrected before heavy validation: inconsistent sub-watt fit tolerances and an overly general efficiency retry prompt.

`source-scope.json` verifies that removing the new budget helper and restoring the previous compound UI region reproduces commit `64bf6c948f486e28c62ff34453d2598e9ffbe58f` byte for byte. Production source outside those two regions is unchanged. The primary agent and browser agent inspected all four screenshots.

Final observed exits, exact executed inventories, source/test/receipt hashes and browser artifacts are recorded in `validation-summary.json`. Selected regressions cover existing compound and compound-power practice, single-stage efficiency/power exercises, work records, read-aloud, localization, grade bands, accessibility and all 192 view cases. This is scoped Machine Lab coverage, not the full repository suite or a full application build.

Heavy checks run serially with one Vitest fork, no isolation, 512 MiB old space, 8 MiB semispace and unchanged 30-second test timeouts. Filtered cases count only in the process that executes them. Native Chromium uses real React/THREE, keyboard interaction and a real text download. Screenshots are inspected at desktop, phone, forced-color and dark record layouts. No physical assistive-device session, performance benchmark, push or deployment is claimed.

For reproduction, use fresh output directories so original receipts remain intact:

```powershell
node reports/machinelab-compound-planning-2026-10-11/run-focused-tests.cjs reports/machinelab-compound-planning-2026-10-11/focused-rerun
node reports/machinelab-compound-planning-2026-10-11/run-regressions.cjs reports/machinelab-compound-planning-2026-10-11/regression-rerun
node dev-tools/ml_compound_planning_qa.cjs reports/machinelab-compound-planning-2026-10-11/browser-rerun
```

Focused manifests identify the exact filters. Both runners can resume verified zero-exit receipts with `--resume`; they check source, test, receipt and log hashes and rebuild complete exactly-once coverage. Any failed or uncompleted attempt must be retained before retry and excluded from final coverage. Generated browser HTML, browser profiles, duplicate download directories and test temporary files are excluded from committed evidence.

`verify-source-scope.cjs` reproduces the source boundary proof. `verify-evidence.cjs` verifies the original committed receipts, observed exits, source/test hashes, complete assertion inventories, browser artifacts and syntax before rebuilding the two final summaries. Generated browser HTML is checked when present; its absence after checkout is expected. Run the source proof before the evidence verifier from the repository root.
