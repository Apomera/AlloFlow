# Road Ready: starting positions and parking rules

## Changes

- Streamed driving starts use the rendered road’s tangent and lateral frame. A legacy finite-map fallback no longer moves the car away from the curved lane. Starts avoid intersections and work-zone approaches, remain stationary in Park, and retain the existing seatbelt/scan sequence and actor clearance checks.
- Highway practice begins inside the ramp entrance, with clearance behind the vehicle and more than 200 meters before the taper. The previous short ramp left too little room to build speed. Ramp meshes now carry the asphalt colors required by their shared material, plus a continuous outer edge; the broken merge line follows road banking.
- The Parallel Parking lesson opens the existing nine-drill parking hub. Legacy direct starts and saved briefings also reach the actual maneuver trainer, rather than an unrelated 3D drive with a distance quota.
- Curb parking courses now put the curb on the learner’s right. The car’s visible front, steering wheels, and reversing lamps agree with its movement. The tight space is wide enough longitudinally to leave two feet at each end of the training car.
- Parking completion requires a stationary, correctly oriented car, acceptable curb clearance, space ahead and behind, and no obstacle overlap. The hydrant course checks its ten-foot clearance target; the uphill course requires wheels away from the curb. Curb parking finishes only after the learner chooses **Park + parking brake**. Invalid poses remain adjustable instead of being marked complete with a score deduction.
- Parking motion uses elapsed time instead of per-frame friction. Pointer and keyboard controls include forward, reverse, steering, brake, reset, and securing the car. Loss of focus clears held input. Course canvases scale to phones without cutting off their fixed world geometry.
- Removed unsupported claims about a universal twelve-inch/three-attempt Maine road-test standard. Source guidance and both shared English catalogs now agree. The parking hub also clarifies that drills use a fixed training car.

## Rule sources

The [Maine BMV Motorist Handbook](https://www.maine.gov/sos/bmv/driver-licenses-and-ids/car-license/motorist-handbook), Parking and Parallel Parking/Offset Backing sections, describes parallel parking, a maximum curb gap of 18 inches, at least two feet between parked vehicles, and securing the car with the parking brake and appropriate gear. It also covers uphill wheel direction and warns that municipal ordinances can prohibit parking within ten feet of hydrants. Reviewed September 8, 2026.

[Maine Title 29-A §2068](https://www.mainelegislature.org/legis/statutes/29-A/title29-Asec2068.html) addresses setting brakes, safely moving a parked vehicle, and safely opening doors. The training course is a controlled practice setting; parking clearance checks do not constitute a complete legal-parking assessment for every real street.

## Verification

- 392 tests across six suites cover rules, signals, yielding/conflicts, road geometry, start positions, parking completion, frame-rate response, keyboard behavior, and view rendering.
- Browser checks exercise the route from lesson picker to parking hub and trainer; pointer reversing; keyboard steering and blur release; invalid parking rejection; successful securing; 320/390 px layouts; and actual Residential Street and Highway Merge starting poses.
- Highway browser checks also inspect nonzero asphalt color attributes and the outer edge mesh. The parking and highway screenshots were visually reviewed.
- Source syntax, scoped diff whitespace, and canonical/active-mirror equality checked. Work remains local and uncommitted.

## Evidence

- [Parking start on phone](parking-start-mobile.png)
- [Completed parking on phone](parking-complete-mobile.png)
- [Residential start](start-residential.png)
- [Highway ramp start](start-highway.png)
- Regression tests: `tests/roadready_spawn_parking_rules.test.js`, `tests/e2e/roadready-parking-rules.spec.ts`.
