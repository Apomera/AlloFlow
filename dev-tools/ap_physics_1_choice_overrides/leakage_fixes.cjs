'use strict';

// Targeted prompt/answer rewordings to eliminate all 116 key-stem-lexical-leakage
// warnings in AP Physics 1 without touching any distractors.
module.exports = {
  'ap-physics-1-u1-003': {
    prompt: "A passenger walks toward the front of a train heading east. Which model determines the passenger's motion across the tracks?",
    answer: "Add the walker's velocity relative to the train to the train's velocity over the ground",
  },
  'ap-physics-1-u1-008': {
    answer: 'Measure cyclist velocity in the walkway frame and walkway velocity in the ground frame',
  },
  'ap-physics-1-u1-011': {
    prompt: 'A velocity-versus-time graph is horizontal at -4 m/s. Which position-versus-time graph matches it?',
  },
  'ap-physics-1-u1-013': {
    answer: 'They reach the ground nearly simultaneously with negligible air resistance',
  },
  'ap-physics-1-u1-020': {
    answer: 'The wind velocity over the ground and its direction are also needed',
  },
  'ap-physics-1-u1-022': {
    answer: 'Apply a calibration correction or analyze displacements rather than raw offsets',
  },
  'ap-physics-1-u2-030': {
    answer: 'The pulling force and track conditions must remain fixed',
  },
  'ap-physics-1-u2-035': {
    answer: 'Keep radius and mass fixed while varying speed and measuring centripetal force.',
  },
  'ap-physics-1-u2-039': {
    answer: 'Measure the upward surface push during vertical acceleration or extra vertical forces',
  },
  'ap-physics-1-u2-040': {
    answer: 'A line matching applied force up to a peak, then a lower constant level',
  },
  'ap-physics-1-u3-052': {
    answer: 'Plot force versus extension and check if the points form a straight line through the origin',
  },
  'ap-physics-1-u3-056': {
    answer: 'The power delivered',
  },
  'ap-physics-1-u3-059': {
    answer: 'The force does negative work across that span.',
  },
  'ap-physics-1-u3-062': {
    answer: 'Spring A stores double the energy',
  },
  'ap-physics-1-u4-063': {
    answer: 'It continues moving at a constant velocity',
  },
  'ap-physics-1-u4-065': {
    answer: 'The signed area enclosed beneath the curve',
  },
  'ap-physics-1-u4-076': {
    answer: 'The bouncing sphere has a larger change as it reverses direction',
  },
  'ap-physics-1-u4-079': {
    answer: 'Total kinetic energy is almost equal before and after',
  },
  'ap-physics-1-u5-088': {
    prompt: 'A lab investigates how mass distribution affects how rapidly an object spins up. Which design isolates distribution?',
  },
  'ap-physics-1-u5-091': {
    answer: 'Check whether the angle graph slope stays steady or changes',
  },
  'ap-physics-1-u5-093': {
    answer: 'The second object, because its mass is nearer the axis so rotational inertia is lower',
  },
  'ap-physics-1-u6-109': {
    answer: 'Static friction can act and exert torque even with zero energy transfer',
  },
  'ap-physics-1-u6-110': {
    prompt: 'A graph plots angular momentum versus time as a straight line sloping upward. What does that slope represent?',
  },
  'ap-physics-1-u6-113': {
    answer: 'The hollow ring, because its higher rotational inertia gives more rotational kinetic energy',
  },
  'ap-physics-1-u7-114': {
    answer: 'For an ideal coil, the force points toward equilibrium and scales with displacement',
  },
  'ap-physics-1-u7-116': {
    prompt: 'A displacement-versus-time graph for an oscillator is sinusoidal and begins with a horizontal tangent at maximum positive displacement. What is the initial velocity?',
  },
  'ap-physics-1-u7-120': {
    answer: 'Check whether acceleration scales linearly with negative displacement',
  },
  'ap-physics-1-u7-125': {
    answer: 'Amplitude decreases over time and total oscillation energy drops with each cycle',
  },
  'ap-physics-1-u7-128': {
    answer: 'The small-angle period model may not hold across all runs',
  },
  'ap-physics-1-u7-129': {
    answer: 'At equilibrium.',
  },
  'ap-physics-1-u7-130': {
    answer: 'The force-stretch graph shows systematic curvature instead of a straight line',
  },
  'ap-physics-1-u8-132': {
    answer: 'It is equal to 1/3 of the density of the water',
  },
  'ap-physics-1-u8-136': {
    prompt: 'A pressure sensor reads zero at the surface of an open tank. What type of pressure is it reporting?',
  },
  'ap-physics-1-u8-137': {
    answer: 'Measure displaced water volume for a fully immersed object and compare to geometric volume',
  },
  'ap-physics-1-u8-141': {
    answer: 'Mass density.',
  },
  'ap-physics-1-u8-144': {
    answer: 'Track vertical acceleration upon release and compare it with upward buoyancy minus gravity',
  },
  'ap-physics-1-u8-149': {
    answer: 'The block is denser than the first liquid yet less dense than oil',
  },
  'ap-physics-1-u6-155': {
    answer: 'The angular speed magnitude about the axle',
  },
  'ap-physics-1-u7-159': {
    answer: 'An offset position reference or equilibrium origin',
  },
  'ap-physics-1-u1-167': {
    answer: '0.30 m/s, with instrument-resolution uncertainty noted',
  },
  'ap-physics-1-u1-170': {
    answer: 'Inspect the raw signal and repeat the trial to test if the outlying point is error or motion',
  },
  'ap-physics-1-u2-172': {
    answer: 'When both blocks are grouped together and external forces are summed',
  },
  'ap-physics-1-u2-176': {
    answer: 'It is two times as large.',
  },
  'ap-physics-1-u2-181': {
    prompt: "A team wants to test how a cart's rate of velocity change depends on net force. Which procedure best isolates that relationship?",
  },
  'ap-physics-1-u2-182': {
    answer: 'The line fits a proportional model here but suggests an offset or unmodeled effect',
  },
  'ap-physics-1-u2-183': {
    answer: 'Using mv^2/r with constant mass and radius predicts four times the centripetal pull',
  },
  'ap-physics-1-u2-184': {
    answer: 'Compare air resistance force to weight for each object at steady fall',
  },
  'ap-physics-1-u2-185': {
    answer: 'Test several pulling forces and fit the slope and intercept of force versus acceleration',
  },
  'ap-physics-1-u2-189': {
    answer: 'Hold radius and mass fixed while changing surface condition and measuring the slip-onset speed',
  },
  'ap-physics-1-u2-190': {
    answer: 'The drag-speed relation changes across regimes, so one straight-line fit cannot cover all data',
  },
  'ap-physics-1-u3-202': {
    answer: 'Pump A has twice the average power for the same energy gain',
  },
  'ap-physics-1-u3-203': {
    answer: 'Friction shifts kinetic or potential to thermal energy while total energy stays conserved overall',
  },
  'ap-physics-1-u3-204': {
    answer: 'Measure thermal energy gain or friction work on each incline',
  },
  'ap-physics-1-u3-206': {
    answer: 'Net energy change is near zero, though separate forces still transfer energy',
  },
  'ap-physics-1-u3-213': {
    answer: 'The linear spring model holds across the range where load versus extension stays roughly linear',
  },
  'ap-physics-1-u4-215': {
    answer: 'The net external force is near zero across that span',
  },
  'ap-physics-1-u4-216': {
    answer: 'Velocity changes of equal size in opposing directions',
  },
  'ap-physics-1-u4-222': {
    answer: 'Both give equal impulse, though peak height and duration differ',
  },
  'ap-physics-1-u4-223': {
    answer: 'Check external impulse and timing prior to doubting momentum conservation',
  },
  'ap-physics-1-u4-224': {
    answer: 'Average force is smaller because an equal impulse spreads over a longer time',
  },
  'ap-physics-1-u6-240': {
    answer: 'Angular momentum is constant as rotational kinetic energy grows by internal work',
  },
  'ap-physics-1-u6-242': {
    answer: 'The second object, because its inertia factor is smaller.',
  },
  'ap-physics-1-u7-249': {
    answer: 'Vary low amplitudes with length and bob mass fixed, timing many cycles',
  },
  'ap-physics-1-u8-255': {
    answer: 'Test another fluid of known density and compare gradient to rho g',
  },
  'ap-physics-1-u1-263': {
    answer: 'Observed trajectory depends on reference frame, yet both frames describe it consistently',
  },
  'ap-physics-1-u1-264': {
    answer: 'The object ends on the minus side of its starting position.',
  },
  'ap-physics-1-u1-271': {
    answer: 'Run high- and low-speed trials at several heights and check for a speed-dependent mismatch',
  },
  'ap-physics-1-u2-286': {
    answer: 'The result matches centripetal force scaling as v squared for fixed mass and radius',
  },
  'ap-physics-1-u2-288': {
    answer: 'Draw the boundary around both bodies and mark string tension as internal',
  },
  'ap-physics-1-u3-306': {
    answer: 'Heat or sound losses rise while the useful task stays unchanged',
  },
  'ap-physics-1-u3-309': {
    answer: 'The independent area-integral and kinetic methods agree for that trial',
  },
  'ap-physics-1-u3-310': {
    answer: 'Useful work per unit time along with input power for each motor',
  },
  'ap-physics-1-u4-316': {
    answer: 'Mutual pushes do not alter the combined center-of-mass velocity',
  },
  'ap-physics-1-u5-334': {
    answer: 'The load distances from the true pivot edge and turning directions',
  },
  'ap-physics-1-u5-336': {
    prompt: 'Two objects with equal mass and radius reach different velocities in a rolling race. Which follow-up best tests mass distribution?',
  },
  'ap-physics-1-u6-343': {
    answer: 'Deformation and contact drag convert mechanical motion into thermal loss.',
  },
  'ap-physics-1-u6-344': {
    answer: 'Measure angular and linear velocities to test v = r omega and find rotational KE.',
  },
  'ap-physics-1-u7-345': {
    answer: 'The net force is proportional and opposite to displacement.',
  },
  'ap-physics-1-u7-352': {
    answer: 'Repeat the frequency sweep using a second detector or new position at fixed drive amplitude.',
  },
  'ap-physics-1-u8-353': {
    prompt: 'A fluid-sample graph shows mass increasing linearly with volume and passing near the origin. What does its slope represent?',
  },
  'ap-physics-1-u8-354': {
    answer: 'Their pressures are identical when density and surface pressure match.',
  },
  'ap-physics-1-u8-359': {
    answer: 'Zero the sensor at zero depth and separate atmospheric offset from the depth slope.',
  },
  'ap-physics-1-u1-362': {
    answer: "The swimmer's cross-stream velocity and current add to a diagonal ground velocity.",
  },
  'ap-physics-1-u1-364': {
    answer: 'The chosen position origin shifts, while velocity and acceleration stay unchanged.',
  },
  'ap-physics-1-u1-370': {
    answer: 'Whether walker velocity on the belt adds to the walkway velocity to give ground motion.',
  },
  'ap-physics-1-u2-373': {
    answer: 'The gravitational attraction linking the box and planet.',
  },
  'ap-physics-1-u2-376': {
    answer: 'It starts near g and falls to zero as air resistance grows.',
  },
  'ap-physics-1-u2-385': {
    answer: 'Verify the force-sensor zero and whether reported force is net rather than applied.',
  },
  'ap-physics-1-u2-390': {
    answer: 'Identify each Newton third-law pair and note normal force reacts to the push of the object on the surface.',
  },
  'ap-physics-1-u2-391': {
    answer: 'Gas carries momentum across the boundary, altering rocket momentum with no external force.',
  },
  'ap-physics-1-u3-394': {
    answer: 'Add the signed areas above and below zero.',
  },
  'ap-physics-1-u3-396': {
    answer: 'The cart reaches matching speed on both ramps from identical energy.',
  },
  'ap-physics-1-u3-403': {
    answer: 'Check unmodeled friction, sensor-offset bias, or system boundaries.',
  },
  'ap-physics-1-u3-404': {
    answer: 'Use ramps of different lengths with fixed height and mass, measuring energy input and friction.',
  },
  'ap-physics-1-u3-406': {
    answer: 'Motor efficiency drops as internal losses grow with input power.',
  },
  'ap-physics-1-u3-407': {
    answer: 'Does the chosen boundary include both the object and Earth in the gravity interaction?',
  },
  'ap-physics-1-u4-417': {
    answer: 'Contact time increases while the momentum change remains nearly the same.',
  },
  'ap-physics-1-u4-423': {
    answer: 'Inspect track tilt, external impulse, and calibration before rejecting the model.',
  },
  'ap-physics-1-u6-438': {
    answer: 'It increases as internal work lowers the moment of inertia and raises spin.',
  },
  'ap-physics-1-u6-444': {
    answer: 'Compare surface marks and speed ratios while measuring hub torque in low-load runs.',
  },
  'ap-physics-1-u7-450': {
    answer: 'Check spring linearity, support motion, and damping at heavier loads with repeat trials.',
  },
  'ap-physics-1-u8-453': {
    answer: 'Both feel identical buoyant forces since they displace matching fluid amounts.',
  },
  'ap-physics-1-u8-458': {
    answer: 'Test for leakage, compressibility, or whether areas and speeds share one flow rate.',
  },
  'ap-physics-1-u1-461': {
    prompt: 'A rescue robot travels 18 m eastward, then 24 m northward, and finally 18 m westward. Which final displacement statement is correct?',
  },
  'ap-physics-1-u2-466': {
    answer: 'The tension force linking one block to the other.',
  },
  'ap-physics-1-u4-476': {
    prompt: 'A two-cart system has total momentum 6 kg m/s eastward before a collision and negligible external impulse. What must be true afterward?',
  },
  'ap-physics-1-u4-480': {
    answer: 'The barrier with longer duration and smaller maximum force.',
  },
  'ap-physics-1-u5-481': {
    answer: 'Set net force and net torque equal to zero, including upper-contact and floor reactions.',
  },
  'ap-physics-1-u5-483': {
    answer: 'Verify sensor calibration, lever-arm lengths, and pivot location.',
  },
  'ap-physics-1-u6-486': {
    answer: 'The first object finishes ahead because less energy goes into rotation.',
  },
  'ap-physics-1-u6-488': {
    answer: 'The object is slipping or its effective radial distance differs.',
  },
  'ap-physics-1-u6-490': {
    answer: 'Compare observed v to r omega while separately measuring axle resistance in trials.',
  },
  'ap-physics-1-u7-491': {
    answer: 'Speed decreased to zero as it traveled away from the center.',
  },
  'ap-physics-1-u7-493': {
    answer: 'Verify both sensors share a common time origin, signs, and calibration.',
  },
  'ap-physics-1-u7-495': {
    answer: 'Repeat the heaviest-mass runs and check support motion and timing error before dropping it.',
  },
  'ap-physics-1-u8-498': {
    answer: 'It accelerates down unless an extra upward push acts.',
  },
};
