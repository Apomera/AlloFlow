# Bridge Lab: connect force, motion and energy

October 4, 2026. Changes remain uncommitted.

## What students see

The existing Force lens and mechanism diagram now connect the inspected relative velocity to the spring’s energy exchange and the damper’s energy loss. A fixed-size velocity arrow shows direction separately from the force arrows. Two responsive cards show kinetic-to-elastic or elastic-to-kinetic exchange and damping loss in W/kg of modal mass.

Captions distinguish movement toward and away from zero relative displacement, a nearly stationary displaced spring, a center crossing with continuing motion, and exact rest. The explanation describes each force’s contribution to relative motion. During shaking, the ground input also changes relative kinetic energy, so a spring force alone does not determine whether the deck speeds up.

The scene identifies A/reference or B/current and the inspected time to three decimal places. The mechanism and graphics fallback identify the current experiment. Each explanation uses the response and motion displayed in that view. Camera, notes, interval pin, selected reference and replay time are preserved.

Small nonzero forces and velocities use signed scientific notation. Energy rates retain small nonzero values too. Near-zero classification changes the explanatory caption and direction glyph; it does not overwrite the raw readings. A short notation explanation and dot legend distinguish small values from exact zero.

Force arrows use a fixed event range. Comparisons combine raw force maxima across A and B before applying a fallback only when the whole pair is zero. A motionless reference therefore cannot flatten a tiny nonzero current response. Swapping A/B or inspecting another time preserves the range. The mechanism uses the current experiment’s own event range.

Saved and printed force readings are recomputed from recorded inputs and time, including tiny values; imported cached answers remain untrusted. A keyboard-operable optional explanation describes why rates derived from displayed motion can differ from rates interpolated from the recorded energy history between sample times.

This reuses native disclosures and the existing model. There are no new stored fields, record formats or 3D resources. The earthquake experiment remains an elastic model with one lateral mode and synthetic ground input; its modal forces remain separate from the static member forces and safety factors.

## Physics

- Spring force per kg: −ω²u. Its contribution to relative kinetic energy is spring force per kg × relative velocity. Negative means storage in the spring; positive means release.
- Damping force per kg: −2ζωv. Loss rate is minus damping force per kg × relative velocity and is nonnegative.
- Spring plus damping force per kg equals absolute deck acceleration. Relative acceleration additionally includes the ground input.
- Near-zero comparisons use local ωu and v, both in m/s. They preserve classification when amplitudes scale and remain independent of the other trial.

## Verification

- The initial complete interaction and model run passed 226 checks. After the paired zero/tiny range fix, the final source passed ten focused force interactions and all 56 seismic model and inertia checks. Those final checks include four new force/motion cases and six existing Force lens regressions.
- Ten browser workflows passed in total: nine in the main run, followed by the corrected phone workflow. Coverage includes desktop and 320 px phone views, stacked power cards, an 80 × 24 px direction glyph, keyboard disclosures, drawer scrolling, camera turns, stable 3D resources, fullscreen, saved observation restoration, printed evidence, zero input, graphics loss and deliberate recovery. Checks found no JavaScript errors or horizontal overflow.
- Numerical verification covers 144 input combinations and 207,504 recorded frames: force balance, contribution signs, nonnegative damping loss, unchanged raw values and event bounds. It also checks 2,196 amplitude cases, 4,392 unequal pairs, 216 zero/tiny paired frames, 108 both-zero frames and 72 synthetic roundoff cases.
- Canonical and public source copies are identical and parse successfully. All 1,260 literal English fallbacks match both registries. The numerical report and final check snapshot identify the final source hash.
- Desktop, phone and fallback captures were visually inspected. Scoped whitespace checks passed. No staging or commits.

The first browser setup mounted 2D before a harness that expects a visible 3D canvas. The corrected cases enter 2D through the visible view control. The phone regression also needed its outer-summary selector narrowed after the nested rates disclosure was added. Original reports are retained; the strict verifier combines the nine successful workflows with the separately rerun phone case. An initial unit assertion was corrected to accept either sign of IEEE zero while still rejecting nonzero force values.

Run numerical checks: `node reports/bridgelab-force-motion-2026-10-04/verify-force-motion.cjs`

Run strict verification: `node reports/bridgelab-force-motion-2026-10-04/verify.cjs`

- [Desktop force, motion and energy](bridge-1000-force-small.png)
- [Phone turning point](bridge-320-force-turning.png)
- [Phone center crossing and mechanism](bridge-320-force-center.png)
- [Phone small nonzero forces](bridge-320-force-small.png)
- [Phone fullscreen direction controls](bridge-320-force-direction-tools.png)
- [Phone fullscreen rate explanation](bridge-320-force-exchange-tools.png)
- [Graphics fallback](bridge-844-force-fallback.png)
