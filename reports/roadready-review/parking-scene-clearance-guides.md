# Clearance guides in the parking scene

Added optional front, rear, and curb dimension guides to curb-parking drills. They use the same body geometry and physical units as the live measurements. The curb dimension follows the nearest body edge/corner as the car rotates. Guides stay hidden while the car is alongside the parked vehicles, angled across the gap, or overlapping an obstacle.

Labels identify each gap. Cyan indicates the existing practice clearance requirement is met; amber marks a gap needing attention. The guides do not indicate that the whole maneuver is complete: the full readiness check and explicit Park + parking brake action remain required. A checkbox hides the overlay without moving or resetting the car. Label sizes adapt for narrow screens.

Validation: seven geometry/readout unit tests and three browser scenarios passed, including the full guided maneuver. Both overlay tests passed again after mobile typography polish and added amber-state checks. Verified actual rendered line colors, toggling, unchanged car position, and 320-pixel horizontal fit. Syntax, whitespace, and canonical/nested desktop asset parity checks passed.

Images: `parking-clearance-guides-desktop.png` and `parking-clearance-guides-320.png`. Changes are local and undeployed.
