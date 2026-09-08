# Road Ready: live parking coach

Parking practice now shows live speed, alignment, curb gap, and the smaller of the front/rear bumper clearances. The readings use the same vehicle geometry and completion checks as the trainer. Alongside or angled positioning shows “Align first” instead of a misleading bumper measurement. The stopped label follows the same threshold used when securing the car.

The readiness message distinguishes a position that is ready to secure from a car already secured in Park with the parking brake. These readings update in a separate component, so their refreshes do not restart the physics loop. Standard parallel parking uses a scene-and-coach layout on desktop, with the controls directly below the scene on phones. The other curb drills also receive the measurement panel.

The standard drill no longer treats an opposite-facing car as parallel in its progress cues. Curb contact and parked-car contact now have distinct feedback.

Validation: 191 tests passed across parking measurements, spawn/parking rules, view smoke checks, and rule content. Two browser checks passed for live measurement updates, ready/secured states, reset, pointer reverse, keyboard steering and focus loss, illegal-position rejection, and successful parking. Layouts checked at desktop, 390 px, and 320 px. Evidence screenshots use a returning learner fixture to keep the achievement celebration out of the layout capture. Source syntax, scoped whitespace checks, and active-mirror parity verified.

- [Desktop coach](parking-coach-desktop.png)
- [390 px coach](parking-coach-390.png)
- [320 px coach](parking-coach-320.png)

Changes remain local and uncommitted.
