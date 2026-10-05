# Moon Mission: measured flight energy

Completed locally on October 4, 2026. Changes remain unstaged and uncommitted.

## What changed

The descent instruments now include an optional **Explore flight energy** disclosure. It shows height energy, vertical and sideways motion energy, their total, and the engine's instantaneous mechanical power. Current component bars and four measured history curves share one energy scale.

Readings follow the live lander or the inspected recording sample. Replay excludes later measurements from both curves and scale limits. A first sample shows current energy while history waits. Touchdown retains the measured impact speeds and omits airborne engine power; older landings without recordings show an explicit unavailable state.

The view stays closed by default, skips calculations while closed, and refreshes at most four times per second during active flight. Held states and replay update immediately. Native keyboard operation, 44 px disclosure targets, 12 px rulers, a 320 px layout and distinct high-contrast line patterns are included.

## Physics

The existing descent model uses local inverse-square lunar gravity. With height h, model radius R and surface gravity g, the new specific potential energy is `g R h / (R + h)`. Its height derivative is exactly the model's gravity. The two kinetic components are `vertical speed² / 2` and `sideways speed² / 2`.

Engine specific mechanical power is `actual thrust / current mass × (cos(tilt) × vertical velocity + sin(tilt) × sideways velocity)`. It uses actual engine output, fuel mass and attitude. Negative power describes braking; positive power describes an engine adding energy. Exhausted fuel gives zero engine power. Zero velocity can have force with zero instantaneous mechanical power.

All values are per kilogram of current vehicle mass. This is a view of the existing local flight model: it excludes propellant chemical energy, exhaust energy, electrical consumption, ground support and impact deformation. Recorded samples are linked by straight segments, so short transients can fall between samples. The recorder's existing sampling and capacity are unchanged.

## Verification

- **173 unit checks passed in 10 files**, including 26 new energy checks. [Unit results](unit-final.json)
- **16 Chromium workflows passed**, one worker and zero retries: energy, measured history, force diagrams and forecasts. [Browser results](browser-final.json)
- **14 scoped axe scans had zero violations.** These cover the instruments in the local browser harness with the app stylesheet; they are not a full application accessibility audit.
- **Nine native energy captures reviewed**, including desktop, 320 px phone, forced colors, replay, contact, initial and unavailable states. [Visual review](visual-review.json)
- Nine coast scenarios conserved energy through contact with maximum error **2.62e-07 J/kg**.
- Across 81 engine states, instantaneous engine power agreed with the integrator's numerical energy derivative within **2.29e-05 W/kg**. A 12-second changing-throttle/attitude run agreed with integrated engine work within **0.003825 J/kg**. [Numerical evidence](physics-probe.json)

The first browser attempt could not locate Chromium in the sandbox default cache. Pointing `PLAYWRIGHT_BROWSERS_PATH` to the existing installation resolved launch, and all new workflows passed before the final 16-workflow run. Those launch failures remain in [the initial report](browser-energy-initial.json). The initial unit run passed but exposed missing React list keys; they were fixed before final verification.

## Previews

[Coasting through touchdown](browser-final/energy/coast-contact-energy.png) · [Braking](browser-final/energy/recorded-braking-energy.png) · [Phone](browser-final/energy/phone-energy-320.png) · [High contrast](browser-final/energy/phone-energy-forced.png) · [Live flight](browser-final/energy/live-webgl-energy.png)

## Preserved behavior

The canonical module and public mirror are byte-identical: `711738efbb3fca5af72d26a4ae87862985ad5aa4b20690f58761eaf5fb3e393e` (1,384,887 bytes). Six guarded additions reverse exactly to the accepted pass 21 source `578816db8e00c92374667b19643c596eedd8af91fa83d52109c0c31e33637e45`. The integrator, flight clock, recorder, controls, landing grading and reward logic were not changed. Fourteen earlier test files and the scoped Git index are unchanged. [Preservation evidence](preservation.json) · [This pass's source diff](pass22.diff)

New tests: `tests/moonmission_descent_energy.test.js` and `tests/e2e/moon-mission-descent-energy.spec.ts`. The scoped [Playwright config](playwright.config.ts) keeps video off and uses 100 ms protocol pacing with the original assertions and 180-second workflow limits. The harness serves the working tree, local React/Three assets and the app stylesheet; it does not test a deployed build.

To repeat the independent numerical checks from the repository, run `node reports/moon-mission-enhancement-pass22-2026-10-04/physics-probe.cjs`. [Machine-readable summary](verification.json)

No staging, commit, push, deployment or full application build was performed.
