# Parking contact and recovery

Standard and scenario parking drills now share contact handling that stops the car at its last clear pose instead of bouncing it backward or allowing held controls to push it into another vehicle. A continuous contact counts once. Moving at least two scene pixels clear releases the contact state, restores instructor guidance, and permits a later separate contact to be counted. Reset creates a clean state.

Contact messages distinguish curb from vehicle/obstacle contact and explain that the car stopped, ask the learner to check clearance, and offer a gentle recovery or reset. The instructor does not advance maneuver cues or accept completion during an impact.

Validation: 200 regression tests and four browser checks passed. Coverage includes held forward input against a parked car, no overlap or reverse bounce, one penalty per continuous contact, reversing clear, a later separate contact, curb contact at 30/60/120 FPS, reset, responsive UI, and the complete collision-free guided maneuver. The active desktop mirror matches and syntax/whitespace checks passed.

Evidence: `parking-contact-recovery.png` shows the stopped car and recovery instruction. Changes remain local, uncommitted and undeployed.
