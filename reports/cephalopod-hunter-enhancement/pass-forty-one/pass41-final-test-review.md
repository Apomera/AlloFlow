# Pass41 final shader and target-cycle test review

Read-only review of the current shell shader and root-authored `tests/cephalopodlab_paused_target_cycle.test.js` / `tests/e2e/cephalopod-paused-target-cycle.spec.ts`. No CPU tests, browser runs, servers, GPU jobs, or captures were executed by this reviewer. No repository edits were made.

The final analytic angular footprint remains sound. It estimates angular change from continuous q.xz derivatives rather than differentiating atan or the high-frequency periodic signal. The earlier meridian stripe and undersampled periodic-difference problems are resolved. Per-piece material uniforms, retained local transform reconstruction, and existing normal-matrix handling are appropriate. Root's actual GL and image checks remain necessary for appearance and shader linkage.

## Test behavior

No blocking fixture or assertion defect was found, with the planned controlled step after native KeyE applied before Escape.

- Runtime onKeyDown is registered on the canvas before the native test's KeyT snapshot listener. Listeners on that same element run in registration order. The snapshot therefore observes the completed cycleTarget event, before a later animation frame can refresh it; it is a meaningful test of synchronous presentation.
- The first native mount step makes the near prey selected automatically. The initial explicit KeyT then selects the nearest prey because explicitTarget was false. After pausing, the next KeyT cycles to the second actual crab. The fixture uses scene-owned prey and native keyboard/button input, although it deliberately controls positions, speed, cover and Clock.getDelta; this is a controlled event/strike scenario, not a natural encounter-quality measurement.
- KeyE only requests a strike; the frame loop commits it and refreshes STRIKING. A controlled step before Escape guarantees that commitment instead of depending on whether an incidental zero-delta RAF happened during keyboard.press. A .05 step is safely shorter than the .2 second contact delay, so it does not force an early capture.
- Paused KeyT changes the next selection while updateTrackedPrey still follows pendingStrike.target. The native contact-resume assertions meaningfully show that the first actual prey is captured while the second remains alive.
- The CPU fixture's `pendingStrike.at` is the real runtime contact field. Its extra `contactAt` field is unused and not harmful; remove it for clarity if modifying the test later. The CPU assertions preserve the exact gameNow value, pending object identity, at and cooldown during direct event invocation. They verify the event function's effects, not the entire native pause loop.
- CPU Observe coverage primarily verifies observationUntil clearing. It initializes the timeout directly and calls updateMission, rather than invoking the real Observe button. The native test does invoke Observe and checks the hidden/readout transition, supplying the actual DOM coverage.
- Empty selection is achieved by moving all actual candidates beyond the 28-metre selection radius. This correctly tests clearing a selection with no nearby candidates; it does not establish that dead prey are filtered, which is existing behavior covered elsewhere.
- Native identity checks retain the actual geometry, material and attribute objects. They do not assert that a captured prey's resources remain undisposed; disposal can leave those JavaScript objects intact. Unmount leak checks supply the separate cleanup assertion.

## Non-blocking validation caveat

The inspected native draft freezes only four/five controlled .05-second steps, while its HUD time is rounded down to whole seconds. Equality of a displayed `0s` can therefore hide subsecond gameNow drift. Prey identity/pose, commitment and unchanged score assertions remain useful, but that short HUD span alone must not be described as precise browser proof of the frozen clock.

Root reported that the serial GPU job had already launched with tests frozen when this caveat arrived. Preserve that raw result. Strengthening each paused freeze span to at least 25 controlled .05-second steps would cross a whole-second boundary if the clock erroneously advanced, giving the existing time comparison meaningful sensitivity. Re-run the affected native scenarios after that change; do not retroactively attribute the stronger coverage to the original run. Exact CPU event-clock assertions supplement the native evidence but do not replace pause-loop coverage.

Inspection behavior is source-reviewed and covered by other native suites, not these new event tests: the runtime onKeyDown returns while inspection is active, so native KeyT is intentionally ignored in inspection. Do not infer that the new tests permit target cycling through the inspection input guard.
