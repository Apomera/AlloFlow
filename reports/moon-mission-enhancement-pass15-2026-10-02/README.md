# Moon Mission: heat-shield material lab

This pass adds an independent thermal experiment to atmospheric entry and the completed-flight debrief. It shows how prescribed heating, conduction, heat storage and surface radiation interact. Changes remain **unstaged and uncommitted**.

## What changed

- The optional lab applies the existing entry heat load to a hypothetical homogeneous slab. It solves transient conduction through 33 depth nodes and nonlinear net radiation to fixed 293.15 K surroundings. Its insulated back face and fixed material properties are visible assumptions.
- Insulating, conductive and thin presets share one temperature scale with a fixed reference slab. Thickness, conductivity and emissivity can be changed independently. A colored cross-section, signed heat-flow readings, surface/back temperature histories and an energy budget update together.
- The lab can follow entry playback or use its own inspection clock. Peak buttons and the additional 300 seconds of zero-input cooling change only lab time. They cannot seek entry, create a flight result, unlock splashdown or award XP.
- Source heating follows the active run's own model version and lift plan. A changed selection for the next attempt cannot alter an existing flight. Authentic version 1 runs retain their original heating trajectory.
- Saved lab inputs are strictly normalized. Reports include a compact thermal snapshot only when selected. Imported or archived temperatures and energies are recomputed from their own source and material inputs. Replay archives the included experiment, then resets its controls.
- Controls have 44 px targets, readable HTML labels, keyboard access and a layout that fits 320 px screens. The lab is collapsed by default. It remains inspectable in the debrief before report export.

## Calculated comparison

These are simulator outputs for the same guided entry at −6.5°. They describe hypothetical fixed-property slabs, with density 500 kg/m³ and specific heat 1,500 J/(kg·K). They are not calibrated Apollo material predictions.

| Experiment | Thickness | Conductivity | Emissivity | Highest surface temperature | Highest back temperature |
|---|---:|---:|---:|---:|---:|
| Insulating | 50 mm | 0.12 W/(m·K) | 0.85 | 2,142.7 °C | 38.3 °C |
| Conductive | 50 mm | 1.20 W/(m·K) | 0.85 | 2,090.3 °C | 503.0 °C |
| Thin | 20 mm | 0.12 W/(m·K) | 0.85 | 2,141.9 °C | 360.7 °C |

The window ends at 1,111.46 s: 811.46 s of source entry plus 300 s of assumed cooling. The insulating slab's back face is still warming at the end. These maxima therefore describe this window; they do not bound later temperatures. Higher conductivity transfers more heat inward, while a thinner slab has less thermal capacity and a shorter conduction distance.

Setting emissivity to zero produces an abstract surface maximum of about 41,554 °C in this constant-property calculation. This demonstrates removal of the radiation sink. A real material would change or decompose long before reaching that temperature; those processes are outside the model.

The raw comparison includes energies, sampled profiles and refinement checks: [physics-comparison.json](physics-comparison.json). Reducing the default step from 0.5 s to 0.125 s changes the surface maximum by 0.0623 K and the back maximum by 0.0163 K. Refining from 32 to 96 intervals at 0.125 s changes those maxima by 0.7825 K and 0.0883 K. The largest relative energy residual across the listed comparisons/refinements is about 7.10 × 10⁻¹⁴.

## Numerical method and limits

Boundary nodes carry half-cell heat capacity. Each interval uses the exact change in the entry model's cumulative heat load as incident energy. A tridiagonal implicit conduction solve is coupled to a monotonic nonlinear surface-radiation solve. The resulting incident energy equals radiated energy plus stored heat to solver precision. Instantaneous flux readings come from the source trajectory and sampled thermal state; conducted flux need not equal input minus radiation because the exposed half-cell also stores heat.

The model omits ablation, pyrolysis, gas release, moving boundaries, temperature-dependent properties, hot-wall feedback, cabin temperature and ocean/recovery cooling. Solar and planetary irradiation and changing surroundings are also omitted. The post-entry zero-input interval is an independent experiment, including after skip-out; it does not continue the capsule's orbital flight.

NASA's [Ablative Thermal Protection Systems Fundamentals](https://ntrs.nasa.gov/citations/20170011453) describes energy storage, conduction, radiation and the additional material-decomposition and surface processes needed for ablative protection. It supports the physical distinctions taught here. The slab constants and presets were chosen for teaching and are not taken from a calibrated NASA material model.

## Validation

- **146 unique unit checks across 13 files pass.** Reports cover thermal physics, visuals and saved state, plus entry guidance/evidence, compatibility, progression, debrief, return handoff and completion announcements. See `unit-initial.json`, `unit-ui-final.json`, `unit-model-final.json` and `unit-compatibility-confirmed.json`.
- **7 unique Chromium workflows pass** across the complete thermal run and focused confirmation. They cover independent clocks/parameters, immutable v1/v2 sources, reload, reports/replay and existing nominal/skip-out behavior. Each run used one worker and zero automatic retries. See `browser-verified.json` and `browser-confirmed.json`; the retained host teardown timeout is explained below.
- The 320 px lab axe scan has zero findings. Keyboard controls,44 px targets,12 px labels and absence of horizontal overflow pass. Desktop/phone cross-sections, signed flow, histories, budgets and debrief captures were visually inspected. See `browser/thermal-verified/thermal-phone-axe.json`.
- Syntax and scoped whitespace checks pass. Runtime copies are byte-identical. Exact reversal recovers every prior source byte, and the scoped index is unchanged. See `verification.json`.

### Retained infrastructure history

The initial focused group passed 78 checks. A larger run stopped with a host process memory error before producing an assertion report, so validation was split into smaller groups. The diagnostic is retained in `unit-expanded-host-error.txt`.

The final model group passed all 41 thermal checks and the planner cases, but three unchanged compatibility cases exceeded the default five-second limit on the shared host. Their durations were 6.5, 7.5 and 23.8 seconds. The same physics/geometry files passed all 15 cases on confirmation with a 60-second limit and no assertion changes. Both reports remain available.

The shared drive subsequently filled during a source write. Validation was stopped, and the canonical file was restored from its intact public mirror. Only this pass's private temporary baseline was removed. An in-memory reversal of the pass15 additions recovers the exact prior SHA256, proving prior changes survived. Remaining source writes used temporary files and replacement. See `host-disk-recovery.txt`.

One browser run was interrupted when the tool host session changed. In the subsequent complete run, four workflows passed and the reload workflow completed its assertions and capture before timing out while closing the browser context. Its trace and error report remain in `browser-artifacts-verified/` and `browser-verified.json`. The unchanged reload workflow was run separately for confirmation.

## Workspace scope

Owned changes are narrow additions to the canonical/public Moon Mission files, three new unit files, one new browser spec and this report directory. All prior source bytes are preserved. The scoped Git index is unchanged. No staging, commit, push, deployment or full application build was performed.

Final source SHA256: `6c177a8eb2bb75edfdec90e5d8a4e0045cf25e4262ddb028dbf60d1964a7e03d`.

## Captures

- [Independent cooling and energy budget](browser/thermal-verified/thermal-independent-cooling-chromium.png)
- [Earlier-model source and follow clock](browser/thermal-verified/thermal-source-follow-v1-chromium.png)
- [Current-model source and follow clock](browser/thermal-verified/thermal-source-follow-v2-chromium.png)
- [320 px material lab](browser/thermal-verified/thermal-phone-320-chromium.png)
- [Reloaded independent clock](browser/thermal-verified/thermal-reopened-independent-time-chromium.png)
- [Included report and debrief](browser/thermal-verified/thermal-included-report-debrief-chromium.png)
