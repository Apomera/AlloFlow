# Controls implementation validation

- Shared runtime, controller parking, Road Ready rules/parking/logic/views: 420 passed in the broad run. Two source assertions describing the old touch-only rendering guard were updated for the new desktop override.
- Final targeted rerun (including those assertions, Road Ready views, input correctness and idle scheduling): 128 passed, zero failed. This overlaps the broad run.
- Browser checks: all three new controls tests passed, plus guided keyboard parking, parking coach/layout, and contact recovery. The new tests cover custom key persistence, hidden movement controls with essential actions retained, desktop override, 320px layout, analog parking, disconnect/reconnect neutral gating, and settings during paused driving.
- Source and active nested desktop mirrors match. The compatibility root host copy belongs to the separate build path and was not overwritten by this change.
- Screenshots: `controls-desktop.png`, `controls-320.png`, `driving-controls.png`.

Validation uses simulated browser gamepads and keyboard/pointer input. Physical device testing and end-to-end checks for all 149 STEM modules are still outstanding. No deployment was performed.
