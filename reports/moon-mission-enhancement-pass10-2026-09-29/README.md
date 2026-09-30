# Moon Mission enhancement, pass 10

Earth departure now includes a computed S-IVB burn. Commanding ignition records the live parking-orbit timing call and opens measured playback. A recorded burn that reaches lunar distance unlocks outbound navigation.

- Connected the existing launch model’s remaining third-stage propellant to a finite J-2 burn. Fourth-order integration updates position, velocity and mass under inverse-square Earth gravity, with a protected 1,000 kg reserve.
- Added 300, 342 and 350 second cutoffs. They produce an Earth-bound orbit falling short, a bound orbit reaching lunar distance, and Earth escape. The 342 s case uses 75,556.7 kg of propellant and ends at 10.835 km/s; ideal engine Δv is 3.167 km/s.
- Added equal-scale departure and orbit-forecast cameras, a curved Earth limb, a measured trail, thrust-aligned stack, engine plume, velocity arrow and a labelled lunar-distance ring. The current orbit forecast changes with energy and retains the recorded timing orientation.
- Added physical instruments, cutoff comparisons, saved playback, pause/play, three playback rates, seeking, keyboard Home/End and deliberate cutoff review. Hidden pages freeze the clock; resizing preserves measured values.
- Added strict completion validation. Changing cutoff clears recorded evidence; malformed records restart unverified. Timing grades come from the saved ignition checkpoint. Valid review survives rewind/reload. Ignition and review award no points; proceeding pays once.
- Added measured injection evidence to reports, archives and the debrief. Replay clears the new fields. Later-phase legacy saves remain reviewable without fabricated injection data.

The model is an educational Earth-only prograde burn. Reaching lunar distance does not establish an encounter with the moving Moon. The next navigation exercise retains its own targeting preset; the UI identifies that boundary. See [equations, measured results and primary NASA sources](PHYSICS.md).

## Verification

All **478 unit checks across 52 files**, **34 checks against the exact scoped commit candidate**, and **eight Chromium workflows** pass. Quantitative tests cover propellant flow, the rocket equation, thrust work, angular momentum, coast conservation, a tiny remaining fuel supply, physical position derivatives and an independent polar midpoint integration.

Browser workflows cover both views and all cutoffs, the timing-to-ignition-to-cutoff transition, double clicks and single rewards, corrupted saves, rewind/reload, plan invalidation, hidden-page clocks, 320 px keyboard controls and resize. The phone has no horizontal overflow and **zero scoped WCAG axe violations**. Six new captures were reviewed; Earth and lunar-distance labels were refined after visual inspection.

The initial broad run reported eight Vitest `STACK_TRACE_ERROR` failures in slow visual and saved-state checks. Its case durations ranged from 5.2 to 18.1 seconds. The initial candidate run reported the same runner error in an orbit frame-rate check. The final full run and exact candidate rerun pass with unchanged assertions and timeouts. Raw failed runs are retained; the final full report is a direct passing rerun.

See [verification](verification.json), [full unit results](unit-verified.json), [final raw unit run](unit-final-run.json), [browser results](browser-verified.json), [candidate checks](candidate-verified.json) and [source checks](source-verification.json).

Captures: [departure burn](browser/injection-burn-chromium.png), [mid-burn forecast](browser/injection-midburn-forecast-chromium.png), [lunar-distance cutoff](browser/injection-lunar-distance-chromium.png), [short burn](browser/injection-short-burn-chromium.png), [escape](browser/injection-escape-chromium.png), [320 px phone](browser/injection-phone-320-chromium.png), [timing exercise regression](orbit-regression/orbit-window-phone-chromium.png).

Canonical/public parity and JavaScript syntax pass. The scoped commit excludes the 34 recorded pre-existing Moonwalk hunks, which remain in both working files. Shared handoff, baseline copies, browser trace directories and commit scratch files remain outside the commit. Unrelated staged work is preserved. No push, deployment or package build.
