'use strict';

// AP Physics 1 choice overrides — Slice 2 (items ap-physics-1-u1-168 through ap-physics-1-u5-334).
// Note: ap-physics-1-u5-231 ('0.50 kg m2' vs '1.0 kg m2', '2.5 kg m2', '4.0 kg m2') is intentionally
// omitted because it is a pure numeric/unit tie where shortening would break sig-fig/unit parallelism.

module.exports = {
  'ap-physics-1-u1-168': {
    answer: 'Measure velocities relative to the walkway and relative to the floor for several directions',
    distractorReplacements: {
      'Measure only the distance that the traveler covers during one full minute of walking on the belt':
        'Measure the total distance that the traveler covers during one full minute of walking on the belt',
      'Use a completely different traveler and a new walkway speed in each one of the recorded trials':
        'Select a different traveler and a new walkway speed during each one of the recorded test trials',
    },
  },
  'ap-physics-1-u1-169': {
    answer: 'The gap grows as launch speed increases while launch height and angle stay fixed',
  },
  'ap-physics-1-u1-170': {
    answer: 'Inspect the raw signal and repeat the trial to check if the outlier is error or real motion',
    distractorReplacements: {
      'Automatically delete the outlying point because it disagrees with the expected motion model here':
        'Discard the outlying data point because it disagrees with the expected motion model shown here',
      'Use the single outlying point as the only evidence for any change in the measured acceleration':
        'Use the single outlying point as the main evidence for any change in the measured acceleration',
    },
  },
  'ap-physics-1-u2-171': {
    answer: 'The net force parallel to the incline is zero, balancing upslope and downslope forces',
  },
  'ap-physics-1-u2-172': {
    answer: 'When both blocks are chosen as one system and external forces are summed',
  },
  'ap-physics-1-u2-173': {
    answer: 'Acceleration points toward the center and velocity is tangent to the path',
  },
  'ap-physics-1-u2-181': {
    answer: 'Hold cart mass and surface fixed while varying force and measuring acceleration',
  },
  'ap-physics-1-u2-182': {
    answer: 'The trend fits a proportional model here but suggests an offset or unmodeled effect',
    distractorReplacements: {
      'The data prove that friction is entirely independent of the normal force that is applied':
        'The data prove that friction is independent of the normal force applied in the experiment',
      'The nonzero intercept proves that the normal force was never measured correctly at all':
        'The nonzero intercept proves that the normal force was not measured correctly in the lab',
    },
  },
  'ap-physics-1-u2-183': {
    answer: 'An estimate from mass, speed, and radius predicts four times the original inward force',
  },
  'ap-physics-1-u2-184': {
    answer: 'Compare measured drag force to weight for each object at terminal speed',
  },
  'ap-physics-1-u2-185': {
    answer: 'Test several applied forces and fit the slope and intercept of force versus acceleration',
    distractorReplacements: {
      'Repeat only a single acceleration measurement while using no force sensor of any kind at all':
        'Repeat a single acceleration measurement while using no force sensor in any of the trials',
      'Use only the final speed that the block reaches after some unknown amount of elapsed time':
        'Use just the final speed that the block reaches after some unknown amount of elapsed time',
    },
  },
  'ap-physics-1-u2-186': {
    answer: 'Measure weight-to-mass ratio at several heights and compare with sensor uncertainty',
  },
  'ap-physics-1-u2-187': {
    answer: 'The carts exert equal-magnitude, opposite-direction forces on each other within measurement error',
  },
  'ap-physics-1-u2-188': {
    answer: 'Remove inertia as a force and identify the actual interaction causing each force',
  },
  'ap-physics-1-u2-189': {
    answer: 'Hold radius and mass fixed while changing surface condition and measuring speed at loss of contact',
  },
  'ap-physics-1-u2-190': {
    answer: 'The drag-speed relation changes across regimes, so one linear model should not cover all data',
  },
  'ap-physics-1-u2-192': {
    answer: 'The gravitational field strength',
  },
  'ap-physics-1-u3-193': {
    answer: 'Part of the chemical-energy loss becomes kinetic energy and part becomes thermal energy in the system',
  },
  'ap-physics-1-u3-194': {
    answer: 'Add signed areas between the curve and position axis over the displacement',
  },
  'ap-physics-1-u3-195': {
    answer: 'The stiffer spring stores twice as much elastic energy',
  },
  'ap-physics-1-u3-202': {
    answer: 'Pump A has twice the average power for equal energy transfer',
  },
  'ap-physics-1-u3-203': {
    answer: 'Friction transfers mechanical to thermal energy while total energy stays conserved in a full system',
  },
  'ap-physics-1-u3-204': {
    answer: 'Measure thermal energy gain or friction work on each ramp surface',
    distractorReplacements: {
      'Measure only the starting color and the surface shape of each cart':
        'Measure the starting paint color and the surface shape of each cart',
      'Ignore the surface because the gravitational energy is always enough':
        'Ignore the surface because gravitational energy determines the speed',
    },
  },
  'ap-physics-1-u3-205': {
    answer: 'Keep load and lift speed fixed while measuring electrical input, mechanical output, and local field',
  },
  'ap-physics-1-u3-206': {
    answer: 'Net work is near zero, although individual forces can still transfer energy',
  },
  'ap-physics-1-u3-208': {
    answer: 'Energy shifts between elastic and kinetic forms while ideal total mechanical energy stays constant',
  },
  'ap-physics-1-u3-209': {
    answer: 'Is the force conservative and is the same system boundary used on both?',
  },
  'ap-physics-1-u3-211': {
    answer: 'Keep the force magnitude and direction fixed while varying path geometry',
  },
  'ap-physics-1-u3-212': {
    answer: 'The motor reaches a peak useful power region, so the rising trend should not be extrapolated',
  },
  'ap-physics-1-u3-213': {
    answer: 'The linear spring model holds across the range where force versus extension stays roughly linear',
  },
  'ap-physics-1-u4-215': {
    answer: 'The net external force is near zero during that interval',
  },
  'ap-physics-1-u4-216': {
    answer: 'Velocity changes of equal size in opposite directions',
  },
  'ap-physics-1-u4-217': {
    answer: 'The collision is perfectly inelastic since the carts share a velocity',
  },
  'ap-physics-1-u4-222': {
    answer: 'Both pulses give equal impulse, though peak force and time differ',
  },
  'ap-physics-1-u4-223': {
    answer: 'Check external impulse and timing before rejecting momentum conservation',
  },
  'ap-physics-1-u4-224': {
    answer: 'Average force is smaller because the same impulse spreads over a longer time',
  },
  'ap-physics-1-u4-225': {
    answer: 'Measured total external impulse is near zero during the collision',
  },
  'ap-physics-1-u4-226': {
    answer: 'Include external impulse from track and gravity, or restrict the interval so it is negligible',
  },
  'ap-physics-1-u5-227': {
    answer: 'Net force is zero while clockwise net torque is nonzero',
  },
  'ap-physics-1-u5-228': {
    answer: 'Rotational inertia decreases, angular speed rises, and angular momentum stays constant',
  },
  'ap-physics-1-u5-234': {
    answer: 'Measure perpendicular distance from pivot to the force line of action each run',
  },
  'ap-physics-1-u5-235': {
    answer: 'Compare clockwise and counterclockwise torques before tipping',
    distractorReplacements: {
      'Measure only the total mass without recording any of the locations':
        'Measure just the total mass without recording any of the locations',
      'Record only the time of day at the start of each of the recorded trials':
        'Record just the time of day at the start of each of the recorded trials',
    },
  },
  'ap-physics-1-u5-236': {
    answer: 'Check if external torque from axle friction or air drag acts on it',
    distractorReplacements: {
      'Assume that the slowing proves angular momentum is never conserved at all':
        'Assume that the slowing proves angular momentum is not conserved anywhere',
      'Measure only the radius of the platform after it has completely stopped':
        'Measure the radius of the platform after the spinning motion has stopped',
    },
  },
  'ap-physics-1-u5-237': {
    answer: 'The force positions and signs of torque about the chosen pivot',
  },
  'ap-physics-1-u6-239': {
    answer: 'Total kinetic energy is one-half Mv^2 plus one-half I omega^2',
  },
  'ap-physics-1-u6-240': {
    answer: 'Angular momentum is constant as rotational kinetic energy rises by internal work',
  },
  'ap-physics-1-u6-243': {
    answer: 'Compare center-of-mass speed with radius times angular speed',
    distractorReplacements: {
      'Measure only the final color and the surface finish of each object':
        'Measure the final paint color and the surface finish of each object',
      'Record the mass of each object only after the race is completely over':
        'Record the mass of each object after the rolling race has already ended',
    },
  },
  'ap-physics-1-u6-244': {
    answer: 'Internal work by a person or motor raises rotational energy without external torque',
  },
  'ap-physics-1-u7-245': {
    answer: 'Instantaneous velocity',
    distractorReplacements: {
      'Acceleration only': 'Instantaneous acceleration',
      'Amplitude only': 'Amplitude of oscillation',
    },
  },
  'ap-physics-1-u7-246': {
    answer: 'The maximum speed doubles and total mechanical energy quadruples',
  },
  'ap-physics-1-u7-249': {
    answer: 'Vary small amplitudes with length and bob mass fixed, timing many cycles',
    distractorReplacements: {
      'Time only a single cycle at each amplitude while using a different bob every time':
        'Time a single swing cycle at each amplitude while using a different bob each time',
      'Use only large angles and ignore the release condition of the pendulum entirely':
        'Use large release angles and ignore the release condition of the pendulum setup',
    },
  },
  'ap-physics-1-u7-250': {
    answer: 'The velocity magnitude peaks when displacement crosses equilibrium',
  },
  'ap-physics-1-u8-251': {
    answer: 'Fluid speed becomes four times as large',
  },
  'ap-physics-1-u8-255': {
    answer: 'Test another fluid of known density and compare slope to rho g',
    distractorReplacements: {
      'Measure the pressure at only one single depth in the fluid column':
        'Measure the pressure at a single fixed depth in the fluid column',
      'Use a different ruler and never record the density of the fluid':
        'Use a different ruler and skip recording the density of the fluid',
    },
  },
  'ap-physics-1-u8-256': {
    answer: 'Compare apparent weight loss to rho fluid g V displaced across known volumes',
    distractorReplacements: {
      'Read the scale only once in air and never measure the volume of the object at all':
        'Read the scale once in air and skip measuring the volume of the submerged object',
      'Change the color of the object while leaving its exact volume completely unknown':
        'Change the color of the object while leaving its exact volume unmeasured in lab',
    },
  },
  'ap-physics-1-u8-257': {
    answer: 'Whether the flow is steady, nearly incompressible, and along one streamline with negligible loss',
  },
  'ap-physics-1-u8-258': {
    answer: 'It rises by a factor of 1.25',
  },
  'ap-physics-1-u8-259': {
    answer: 'Subtract atmospheric pressure from the absolute reading to match rho gh',
  },
  'ap-physics-1-u8-260': {
    answer: 'The object rises from the pushed depth and oscillates about its original float level',
  },
  'ap-physics-1-u1-261': {
    answer: 'The object moves in the positive direction while slowing',
  },
  'ap-physics-1-u1-262': {
    answer: 'Horizontal ranges are equal, while flight times and peak heights differ',
  },
  'ap-physics-1-u1-263': {
    answer: 'Observed path depends on reference frame, yet both frames describe the event consistently',
    distractorReplacements: {
      'The ball must have a completely different mass for each of the two observers who are watching':
        'The ball must have a different inertial mass for each of the two observers who are watching',
      'Only the observer on the platform is able to measure the real trajectory of the thrown ball':
        'The observer on the platform is the one able to measure the real trajectory of the thrown ball',
    },
  },
  'ap-physics-1-u1-269': {
    answer: 'The residuals show a systematic curve rather than random scatter',
  },
  'ap-physics-1-u1-270': {
    answer: 'Reverse wind direction while holding airspeed, flight time, and launch fixed',
    distractorReplacements: {
      'Measure the mass of the drone battery only after the flight has completely ended':
        'Measure the mass of the drone battery after the test flight has already finished',
      'Use a completely different coordinate system for each of the recorded trials':
        'Use a different coordinate system orientation for each of the recorded trials',
    },
  },
  'ap-physics-1-u1-271': {
    answer: 'Run high- and low-speed trials at several heights and check for speed-dependent error at each',
    distractorReplacements: {
      'Repeat only a single high-speed trial from the original launch height and change nothing else at all':
        'Repeat a single high-speed trial from the original launch height while changing nothing else at all',
      'Change the launch height and the launch speed together and compare only the longest range that is measured':
        'Change the launch height and launch speed together and compare the single longest range that is measured',
    },
  },
  'ap-physics-1-u1-272': {
    answer: 'Resolve displacement into signed components in a coordinate system',
  },
  'ap-physics-1-u2-274': {
    answer: 'Static friction opposes the applied force equally, leaving zero horizontal net force',
  },
  'ap-physics-1-u2-275': {
    answer: 'Gravity provides an inward net force, continuously changing velocity direction',
  },
  'ap-physics-1-u2-276': {
    answer: 'Gravitational energy shifts to kinetic and thermal forms as the kinetic-energy rate hits zero',
  },
  'ap-physics-1-u2-277': {
    answer: 'The inertial mass of the system',
  },
  'ap-physics-1-u2-285': {
    answer: 'One trial cannot show if the coefficient stays constant across surfaces or normal forces',
  },
  'ap-physics-1-u2-286': {
    answer: 'The result matches centripetal force scaling as speed squared for fixed mass and radius',
  },
  'ap-physics-1-u2-287': {
    answer: 'The data do not resolve a change in local gravitational field',
  },
  'ap-physics-1-u2-288': {
    answer: 'Draw the boundary around both carts and mark string tension as internal',
  },
  'ap-physics-1-u2-289': {
    answer: 'Upward drag force increases with speed while weight remains roughly constant',
  },
  'ap-physics-1-u2-290': {
    answer: 'The difference may stem from uncertainty, calibration, or timing mismatch, not a third-law failure',
  },
  'ap-physics-1-u2-291': {
    answer: 'Friction versus applied force rises to a maximum static peak and then drops down to kinetic friction',
  },
  'ap-physics-1-u2-292': {
    answer: 'The maximum friction force or coefficient at each tire-temperature condition',
  },
  'ap-physics-1-u3-293': {
    answer: 'Sum all three final energy stores and compare them with initial gravitational energy',
  },
  'ap-physics-1-u3-294': {
    answer: 'The force does negative work, lowering kinetic energy unless offset by other work',
  },
  'ap-physics-1-u3-295': {
    answer: 'Find elastic energy from the area under the force-extension curve instead of one-half kx^2',
  },
  'ap-physics-1-u3-304': {
    answer: 'Add a thermal-energy term while keeping total energy conserved in the larger system',
  },
  'ap-physics-1-u3-305': {
    answer: 'Keep displacement fixed while varying force magnitude and angle separately in trials',
  },
  'ap-physics-1-u3-306': {
    answer: 'Heat or sound losses rise while the useful task remains the same',
  },
  'ap-physics-1-u3-307': {
    answer: 'Track thermal energy or friction work per cycle alongside amplitude decay',
  },
  'ap-physics-1-u3-308': {
    answer: 'Whether the system boundary and nonconservative transfers match on both',
  },
  'ap-physics-1-u3-309': {
    answer: 'The independent work and kinetic-energy methods agree for that trial',
    distractorReplacements: {
      'The noise proves that the force sensor is completely unusable in this trial':
        'The noise proves that the force sensor is unusable for any lab calculation',
      'The speed data can be discarded because the graph area is always exact':
        'The speed data can be discarded because the graph area is exact enough',
    },
  },
  'ap-physics-1-u3-310': {
    answer: 'Useful work per unit time along with input energy or power for each',
  },
  'ap-physics-1-u3-312': {
    answer: 'Total energy includes thermal and other transfers; mechanical energy requires extra conditions',
    distractorReplacements: {
      'The mechanical energy is always greater than the total energy of the system in every possible case':
        'The mechanical energy must exceed the total energy of the system in every possible physical case',
      'Thermal energy is never part of any physical system, so it can never be counted in the accounting':
        'Thermal energy is not part of any physical system, so it cannot be counted in energy accounting',
      'The conservation laws can apply only in those cases where no object in the system moves during the process':
        'The conservation laws apply in those cases where no object in the system moves during the entire process',
    },
  },
  'ap-physics-1-u4-313': {
    answer: 'The net impulse, equal to the objects momentum change',
  },
  'ap-physics-1-u4-314': {
    answer: 'An isolated inelastic collision where energy shifts to deformation, sound, or thermal forms',
  },
  'ap-physics-1-u4-316': {
    answer: 'Internal forces do not change the combined center-of-mass velocity',
  },
  'ap-physics-1-u4-322': {
    answer: 'Treat the bumper as an external impulse or include the bumper in the system',
  },
  'ap-physics-1-u4-323': {
    answer: 'The padded trial has a lower peak force and wider pulse of equal area',
  },
  'ap-physics-1-u4-324': {
    answer: 'A constant positive net external force',
  },
  'ap-physics-1-u5-325': {
    answer: 'The object has constant negative angular velocity',
  },
  'ap-physics-1-u5-326': {
    answer: 'The net difference between their signed torques',
  },
  'ap-physics-1-u5-327': {
    answer: 'The lower-inertia object converts more gravitational energy into translational motion',
  },
  'ap-physics-1-u5-328': {
    answer: 'Its center of mass has zero linear acceleration with nonzero angular acceleration',
  },
  'ap-physics-1-u5-333': {
    answer: 'Compare torque with the perpendicular lever arm rather than raw distance',
  },
  'ap-physics-1-u5-334': {
    answer: 'The load positions relative to the actual pivot edge and torque signs',
  },
};
