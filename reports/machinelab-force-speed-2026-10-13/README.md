# Machine Lab: force, speed and power

Open **Power & motion lab → Connect force, speed and power** at any of the six machine stations.

The guide connects **force × speed = power** at the hand and at the load. Six labeled metric cards, matching equations, and proportional solid/striped bars compare force, movement rate, and power. Each pair uses a common zero-based scale; different units have separate scales. Tiny quantities retain numeric labels without inflating their bars. The layout stacks on phones and keeps pattern distinctions in forced colors.

Two guided calculation skills are added at every station:

| Skill | Calculation | Unit |
| --- | --- | --- |
| Effort from power | Input power ÷ hand-path speed | N |
| Load from power | Useful power ÷ load movement rate | N |

For the ramp, useful power uses vertical rise rate; hand speed follows the ramp path. For rotating handles, hand speed follows the circular path. The model assumes constant force along the motion and steady average rates. Power values already account for the selected efficiency, so it must not be applied a second time.

The new exercises support unit feedback, misconception guidance, two hints, worked solutions, the practice map, Next skill, and fixed version-4 records. Earlier versions remain supported. There are now 12 power skills at each linear station and 19 at each rotary station: 86 station/skill combinations.

## Scope and validation

All **329 selected tests across ten files** passed in 20 serial native processes: 43 new cases and 286 existing regression cases. Every final child process and wrapper exited successfully. There were no failed test or browser attempts.

Native Chromium passed **1,024 checks across eight scenarios**, covering all six default stations, dark phone and forced-color layouts, the twelve new skill combinations, changes in duration and efficiency, proportional rendered bars, keyboard focus, fixed records, and an actual text-record download. Four screenshots were inspected independently by root and the browser reviewer.

Previews: [windlass](browser/run-01/desktop-windlass-force-speed.png), [ramp](browser/run-01/desktop-ramp-force-speed.png), [dark phone screw](browser/run-01/dark-phone-screw-force-speed.png), and [forced colors](browser/run-01/forced-colors-windlass-force-speed.png).

Only the power helper/panel region changed relative to `fb4f44cfb`. Physical helpers and other views remain byte-identical, as do original question branches, grading, record validation, change/save callbacks, and record text formatting. Four existing test files have nine narrow inventory/cycle/count/description changes; reversing their recorded replacements reproduces the baseline exactly.

Canonical/public SHA-256: `301b7f605d71623e58af46454d15bea56b4710ed643191523b69593815ff714f`.

Independent code and fixture review found no blockers in equations, units, ramp interpretation, precision, positive finite bounds, record versions, state protection, or accessible structure. Validation evidence: [source scope](source-scope.json), [new tests](new-tests/run-01/final.json), [regressions](regressions/run-01/final.json), [browser](browser/final.json), and [summary](validation-summary.json).

Native browser checks use local React/THREE with software WebGL. Forced colors are emulated. No deployed host build or physical assistive technology session is exercised. Changes are local; no push or deployment is included.

## Reproduce

From the repository root, supply fresh output directories:

```powershell
node reports/machinelab-force-speed-2026-10-13/verify-scope.cjs
node reports/machinelab-force-speed-2026-10-13/run-new-tests.cjs <fresh-focused-directory>
node reports/machinelab-force-speed-2026-10-13/run-regressions.cjs <fresh-regression-directory>
node reports/machinelab-force-speed-2026-10-13/browser/run-native.cjs <fresh-browser-directory>
node reports/machinelab-force-speed-2026-10-13/verify-evidence.cjs
```
