# Parking pause and scoring refinement

Updated the shared parking input/physics path and standard parallel-parking completion.

- Pause and the Controls panel freeze pose and steering, stop motion, and suppress collision scoring, maneuver progression, and completion.
- Resume requires driving controls to return to neutral. Gear and Park presses made during pause cannot queue a later action.
- Live measurements explain the paused or waiting state; readiness guidance no longer asks for Park while practice is inactive.
- Keyboard/touch direction assistance keeps the original gear displayed until the car stops, then engages the requested direction.
- Successful parallel parking retains contact deductions and passes the actual score to completion rewards.

Validation: 36 focused unit tests passed across parking input, response, contact, geometry, metrics, spawn rules, and drill keys. Three Playwright checks passed: full guided keyboard maneuver, pause/resume plus completion after a contact, and contact recovery. Canonical and nested desktop assets match; JavaScript syntax and whitespace checks pass.

Changes remain local and undeployed.
