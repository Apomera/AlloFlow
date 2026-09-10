# Parking input responsiveness and lamp feedback

- Brief Drive, Reverse, and Park key taps are retained until the next simulation update and consumed once. The last gear request wins when several arrive between frames.
- Moving gear changes remain rejected. Requests made during pause or settings are discarded, and held-input neutral gating remains in place.
- Reverse lamps follow the selected Reverse gear, including while stopped. Completing the parking trainer extinguishes reverse and service-brake lamps instead of lighting them solely because the parking brake is set.
- The response readout distinguishes “Brake held” at a stop from “Braking” in motion. The expanded guide explains the rear lamps.

Validation: 26 focused unit checks passed across discrete key taps, lamps, controller parking, braking response, and shared drill keys. Four browser scenarios passed across this work: the full guided maneuver, Standard Parallel and Tight Parallel lamp checks, and pause/scoring protection. Browser checks verify actual rendered lamp colors and quick keyboard gear selection. Syntax, whitespace, and canonical/nested desktop parity checks passed.

The lamp browser checks initially exposed missed short gear taps; those passed after the input fix. The slow test environment also produced fork-worker startup/teardown timeouts. The two affected older suites passed cleanly when rerun with threads and a longer setup timeout.

Changes remain local and undeployed.
