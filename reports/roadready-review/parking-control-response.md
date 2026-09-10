# Parking control response

The standard and scenario parking trainers now stop before engaging the opposite direction while a direction button remains held. Brake input takes priority, simultaneous forward/reverse inputs stop the car, and the shared movement helper prevents a secured car from moving.

The live measurement panel shows actual travel direction, braking, a direction-change stopping message, and front-wheel angle with a centered visual indicator. Red brake lights now reflect assisted braking. Parameterized parking drills use the same independently turning front wheels and brake lamps as the standard trainer.

The control instructions explain the assisted behavior: hold to drive at walking pace, release to slow, and stop automatically before changing direction.

Validation:

- 195 regression tests passed, including direction changes in both directions at 30/60/120 FPS, brake priority, simultaneous inputs, and parking-brake lock.
- Both parking browser tests passed, including keyboard/pointer controls, live steering/reverse/brake feedback, reset, legal completion, camera tracking, and narrow layouts.
- Updated `parking-coach-desktop.png`, `parking-coach-390.png`, and `parking-coach-320.png`; the 320px screenshot was visually reviewed.

Changes remain local; no commit or deployment was performed.
