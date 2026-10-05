# Moon Mission enhancement pass 16

**Completed 2026-10-02. Changes are unstaged and uncommitted.**

Entry playback now includes an optional force and mechanical energy inspector. It makes the existing flight easier to understand by showing the forces acting at the inspected time and where its mechanical energy goes.

## What changed

- A force diagram resolves drag, signed lift, gravity and the resultant in the trajectory plane. All arrows use equal horizontal/up axes and one scale throughout the source flight. Readouts show acceleration and force in m/s² and kN.
- A bank inset separates full lift from its in-plane projection and lateral magnitude. It explains why a 90° bank can preserve aerodynamic load while contributing almost no lift to this planar trajectory.
- Energy histories and a numerical ledger show kinetic energy, potential above Earth’s surface, cumulative drag work, remaining energy, instantaneous drag power and the signed numerical residual.
- Both views follow the entry recorder’s clock. The thermal lab keeps its independent inspection clock. Opening or switching views changes only the two inspection preferences.
- Completed reports recompute the energy ledger from their verified original receipt. Earlier v1 flights retain their original signed lift law and have no reconstructed bank angle. Verified completed saves without a playback record open at their own endpoint.
- Phone layouts retain readable external labels, keyboard controls and 44 px button heights. Small force arrows draw above the enlarged vehicle marker so the marker cannot obscure them.

## Physics and limits

The inspector derives values from the existing immutable v1/v2 entry trajectory and its exact parachute deployment times. It re-evaluates canopy inflation and aerodynamic forces at the inspected state. It does not integrate a replacement flight.

Drag opposes velocity and lift is perpendicular to it, consistent with [NASA Glenn’s force definitions](https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/what-is-drag/). Signed lift projection follows the bank convention in [NASA’s entry trajectory equations, slide 16](https://ntrs.nasa.gov/api/citations/20150010981/downloads/20150010981.pdf?attachment=true). Gravity contributes to the resultant in the plane and is excluded from the aerodynamic load readout. The full lift magnitude contributes to aerodynamic load even when its plane projection is small.

The energy ledger uses:

```text
kinetic energy per kg = speed² / 2
potential per kg = μ × (1 / Earth radius − 1 / current radius)
initial energy = kinetic + potential + cumulative drag work + residual
drag power per kg = drag acceleration × speed
```

The surface-zero potential adds a constant to the usual spherical gravitational potential. Local component derivatives include the rotation of the horizontal/up basis; [NASA’s orbital mechanics material, slides 46–51](https://tfaws.nasa.gov/wp-content/uploads/Rickman-Presentation.pdf), gives the underlying polar-coordinate and specific-energy relationships.

Residuals include source integration and interpolation error. Mechanical drag work is distinct from stagnation heat flux, accumulated heat load per area and the thermal slab’s absorbed energy. Reports now state those dimensions explicitly.

The inherited model remains planar, with fixed capsule mass and its existing atmosphere and aerodynamic assumptions. The lateral lift inset displays a magnitude on an illustrative side; it does not calculate crossrange. A splash endpoint shows the airborne state immediately before water contact. Water impact, support forces and recovery dynamics are omitted. A skip endpoint stops at the outgoing interface. These diagnostics add no survival criterion or flight score.

## Numerical evidence

All six tested source profiles retained identical serialized values after inspection. Each began with 62.006009 MJ/kg of mechanical energy.

| Source at −6.5° | Outcome | Duration, s | Maximum recorded-point residual, J/kg | Largest residual at 201 inspection times, J/kg |
| --- | --- | ---: | ---: | ---: |
| v1 guided | Nominal | 811.463 | 0.0382 | 34.16 |
| v2 guided | Nominal | 811.463 | 0.0382 | 34.16 |
| v2 ballistic | Steep | 624.763 | 0.0404 | 153.66 |
| v2 bank 0° | Skip | 236.023 | 0.0005 | 28.51 |
| v2 bank 90° | Steep | 624.763 | 0.0404 | 153.66 |
| v2 bank 180° | Steep | 533.874 | 0.3095 | 1631.26 |

At 90.137 s, the 90° bank case has 39.154 m/s² of full/lateral lift and an effectively zero plane projection. Its aerodynamic load is 13.895 g; the ballistic case on the same planar path is 13.309 g.

Reducing ballistic source steps from 0.5 s to 0.25 s to 0.1 s reduced the largest residual at six selected fractional times from 545.77 to 81.09 to 18.45 J/kg. The default trajectory step remains unchanged. Full values are in [physics-comparison.json](physics-comparison.json).

## Verification

- **138 unique unit checks passed across 11 files**, including 44 new physics, visual and saved-state checks. Initial, remaining and final affected-scope results are retained in the three `unit-*.json` reports.
- **Five final Chromium workflows passed**, with one worker, no retries and no skipped cases. They cover bank projections, physical arrow scales, clock synchronization, independent thermal inspection, reload preferences, v1 sources, keyboard controls, 320 px layouts, completed reports, receipt-only saves, replay and once-only rewards.
- The inspector’s scoped WCAG 2/2.1 A/AA axe scan returned **zero violations**. Phone controls measured 44 px high; labels measured at least 12 px. The browser check found no horizontal page overflow.
- Desktop force/energy and both phone views were inspected visually. Final screenshots are in `browser/dynamics-final/`; the completed-flight capture is retained there too.
- Syntax and scoped diff checks passed. Canonical and public runtime copies match. Reversing all nine integration operations in memory recovered the exact pre-pass source hash, proving preservation of prior source outside this integration. The scoped Git index is unchanged and all new test files are unstaged.

The initial unit process exited after a worker-termination timeout despite 109 passing assertions; only its three missing files were run separately. The initial browser run passed four workflows, then Chromium crashed during a full-page phone screenshot. Its JSON and failure trace are retained. Phone captures were narrowed to the inspector panel; the complete final five-workflow run passed on the final source. These infrastructure failures are not counted as successful runs.

Final source SHA-256: `5c46e7f3fa84e76dcff2581de75f3230554df851f11afab5a22f99ccafaf7727`.

Baseline SHA-256: `6c177a8eb2bb75edfdec90e5d8a4e0045cf25e4262ddb028dbf60d1964a7e03d`.

See [verification.json](verification.json) for counts, hashes, capture inventory and preservation checks. No staging, commit, push, deployment or full application build was performed.
