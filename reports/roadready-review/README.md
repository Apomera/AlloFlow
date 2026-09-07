# Road Ready: visual, learning, and handling review

## Changes

- Added a three-step path from signs and signals to a first drive and recall practice. The first-drive action opens a briefing before starting the car.
- Added readable pre-drive rule cards, a direct Maine BMV handbook link, and an accurate minimum-duration label. Added scoped system typography and a decorative road illustration.
- Enlarged the live rule card and wrapped its explanation instead of cutting it off. Kept safety instruments bright against their dark canvas in either app theme.
- Removed decorative bicycle lanes that were not reserved in the driving geometry, and hid duplicate 3D gauges while the readable HUD is visible.
- Added a mouse-accessible seatbelt action to desktop startup, using the same safety scan as touch and keyboard.
- Replaced flat road-paint planes with geometry following grade, banking, and crown. Solid boundaries now use continuous ribbons, split at intersections. Removed conflicting duplicate centerline/edge paint and reduced asphalt color banding.
- Replaced the main car's arbitrary turning rule with a speed-sensitive bicycle model. The tire demand calculation and front-wheel animation use the same geometry. Grip saturation is progressive; reverse turning has the opposite yaw sign.
- Added gradual pedal response with brake priority, frame-rate-independent steering response, and gear-aware braking through zero speed. Interruptions clear stored pedal demand as well as keys.
- Fixed the two maneuver drills that advanced once per rendered frame. Their authored physics now run at 60 ticks per simulated second.
- Expanded signal preview using perception and braking distance, and following-vehicle preview using speed. The displayed following gap now measures bumper clearance.
- Corrected the flashing yellow arrow cue to yield to oncoming traffic and pedestrians, rather than treating it as a steady yellow signal.
- Preserved the pre-existing translation/accessibility changes in the source and synchronized the active desktop mirror at `desktop/web-app/public/stem_lab/stem_tool_roadready.js`.

## Validation

- 450 unit checks across 15 Road Ready suites are passing: the final broad run passed 448; two assertions referred to the removed duplicate paint layer. After updating those assertions, all 88 tests in the affected road-rule suite passed.
- Browser checks passed for keyboard startup, pause/resume, idle-test rejection, touch targets and dock spacing, formal-drive controls, disposal during a delayed Three.js load, the first-use tour and learning path, desktop briefing/startup, acceleration/braking, and Ride-Along lane control.
- The visual browser check inspects the generated paint geometry and asserts that duplicate dashboard instruments are hidden while the HUD is active.
- JavaScript syntax and diff whitespace checks passed. The canonical source and active desktop mirror match byte for byte.

The accessibility render sweep used a 30-second per-test allowance because this Windows host exceeded the default 5 seconds during a concurrent browser run; the completed sweep passed.

## Evidence

- [Desktop briefing](briefing.png)
- [Driving scene](cockpit.png)
- [Mobile learning path](menu-mobile.png)
- [Mobile briefing](briefing-mobile.png)


The accompanying screenshots show the lesson briefing, driving scene, and mobile learning flow. Browser tests exercise startup, keyboard/touch controls, mobile spacing, lesson navigation, road geometry, manual acceleration/braking, and Ride-Along. Unit tests cover handling at 30/60/144 Hz, road rules, progression, permit content, and accessibility.

## Sources and scope

- [Maine BMV Motorist Handbook](https://www.maine.gov/sos/bmv/driver-licenses-and-ids/car-license/motorist-handbook): stopping, scanning, signaling, and space management.
- [Maine §2071](https://legislature.maine.gov/statutes/29-a/title29-Asec2071.html): turn signaling distance.
- [MathWorks bicycle kinematics](https://www.mathworks.com/help/robotics/ug/mobile-robot-kinematics-equations.html): signed yaw rate from speed, wheelbase, and front steering angle.

The handling remains an educational approximation: vehicle dimensions, steering ratios, pedal response, and grip tuning are not manufacturer-calibrated. The scenery is procedural 3D. These changes improve consistency and readability; they do not establish a validated driving trainer or replace supervised driving practice. Changes are local; no deployment was performed.
