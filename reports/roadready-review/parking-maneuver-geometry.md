# Parking maneuver geometry and instruction

The full instructor sequence exposed a body-center physics bug: the simulator used rear-axle velocity at the center of the vehicle. Following the first reverse-right cue could therefore clip the front parked car. The parking bicycle model now includes the center slip angle and midpoint heading integration, allowing the front to swing away while the rear moves toward the curb.

The standard trainer's cues now match a collision-checked path for its vehicle and starting pose: turn approximately 30 degrees from parallel, straighten, countersteer at approximately 2.5 feet of curb clearance, then straighten and stop near parallel. Reverse speed is a slow creep (approximately 1.6 mph), with explicit advice to brake when more time is needed to check or change steering. These are training-car cues, not universal parking landmarks.

Validation includes a complete maneuver at 30, 60 and 120 FPS, both immediate responses and a 0.25-second response delay, with collision and curb checks throughout. Wrong-way steering does not advance the turn-in cue. A real keyboard browser test follows the instructor from the authored starting pose through legal parking, scoring 100/100 with zero contacts; see `parking-guided-complete.png`.

The relevant regression suite passed 197 tests. The desktop and narrow-phone coach checks passed. An existing browser assertion was scoped to the instructor because both the live measurements and instructor correctly show invalid-position feedback.

Changes remain local and are mirrored in the active desktop module; no commit or deployment was performed.
