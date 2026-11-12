#!/usr/bin/env node
'use strict';
// check_roadready_pedestrian_corner.cjs (PROPOSED by round 38 lane_ped; goes in dev-tools/ next to roadready_model.cjs).
//
// Why: the main-road crosswalk sits 2.8 m from the junction middle, inside the cross street (half width 3.25 m). A
// walker waiting at its end stood 1.3 m from a cross-street lane centre, and every cross-street and turning driver
// stopped for them in the junction, for as long as they waited (round 38 trace: the Suburban Ride-Along stand-off).
// The walker now waits on the corner. The pinned number is the passing distance of Maine 29-A section 2056(2):
// "An operator of a motor vehicle who is passing a pedestrian ... shall exercise due care by leaving a distance
// between the motor vehicle and the pedestrian of not less than 3 feet". Saved: lane_ped/sources/maine_29A_2056.txt.
//
// The rule, from the tool's own functions (no re-derived copy):
//   A. rrPedestrianWaitStation puts the walker so the widest vehicle (vehicleFootprint('schoolbus')) in the cross
//      lane (1.5 m) passes the walker's 0.28 m body with at least 3 ft.
//   B. The corner is off the cross-street carriageway (more than 3.25 m from the middle).
//   C. A walker with no crosswalk side (scenario maps) is not moved.
const { loadRoadReady } = require('./roadready_model.cjs');
const RR = loadRoadReady(['rrPedestrianWaitStation', 'vehicleFootprint', 'FT_PER_M']);
const errors = [];
const THREE_FT = 3 / RR.FT_PER_M;
for (const side of [1, -1]) {
  const centre = 500, crosswalk = centre + side * 2.8;
  const at = RR.rrPedestrianWaitStation({ crosswalkY: crosswalk, _crosswalkSide: side });
  const fromCentre = Math.abs(at - centre);
  const gap = fromCentre - 1.5 - RR.vehicleFootprint('schoolbus').width / 2 - 0.28;
  if (gap < THREE_FT - 1e-9) errors.push('side ' + side + ': a school bus in the cross lane passes the waiting walker with ' + gap.toFixed(3) + ' m, under 3 ft (' + THREE_FT.toFixed(4) + ' m)');
  if (fromCentre <= 3.25) errors.push('side ' + side + ': the walker waits ' + fromCentre.toFixed(2) + ' m from the junction middle, on the cross street (half width 3.25 m)');
}
if (RR.rrPedestrianWaitStation({ crosswalkY: 40 }) !== 40) errors.push('a walker with no crosswalk side was moved');
if (errors.length) { console.error('✗ check_roadready_pedestrian_corner:\n  ' + errors.join('\n  ')); process.exit(1); }
console.log('✓ check_roadready_pedestrian_corner: walkers wait ' + Math.abs(RR.rrPedestrianWaitStation({ crosswalkY: 2.8, _crosswalkSide: 1 })).toFixed(3) +
  ' m from the junction middle; a school bus in the cross lane passes them with 3 ft (29-A section 2056(2)).');
