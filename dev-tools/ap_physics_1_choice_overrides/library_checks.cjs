'use strict';

// 24 section-specific AP Physics 1 learning-library retrieval checks (3 per
// unit across Units 1-8), replacing the three repeated generic study-move
// templates. Answer indices are balanced 6/6/6/6 and every keyed choice is
// kept strictly shorter than the longest distractor.

module.exports = {
  // Unit 1: Kinematics
  'ap-physics-1-ch-01-check-01': {
    prompt: 'A cart moves forward 6 m, stops, and returns 2 m backward along a straight track. How do its total distance traveled and net displacement compare?',
    choices: [
      'Distance is 8 m while displacement has magnitude 4 m.',
      'Distance and displacement both equal 4 m because motion reversed.',
      'Displacement is 8 m while total distance traveled is 4 m forward.',
      'Both distance and displacement equal zero whenever the cart slows down.',
    ],
    answerIndex: 0,
    rationale: 'Distance adds the full path length (6 m + 2 m = 8 m), whereas displacement measures the directed change from start to finish (6 m - 2 m = 4 m forward).',
  },
  'ap-physics-1-ch-01-check-02': {
    prompt: 'On a velocity-versus-time graph for straight-line motion, what physical quantities are represented by the slope and the signed area under the curve?',
    choices: [
      'Slope gives total distance, while signed area gives average acceleration.',
      'Slope gives acceleration, while signed area gives displacement.',
      'Slope gives net force directly, while area gives instantaneous speed.',
      'Slope gives initial position, while signed area gives elapsed time.',
    ],
    answerIndex: 1,
    rationale: 'The rate of change of velocity (dv/dt) is acceleration, and integrating velocity over time yields the object’s net displacement.',
  },
  'ap-physics-1-ch-01-check-03': {
    prompt: 'A ball is launched horizontally from a table with negligible air resistance. What stays constant throughout its flight before impact?',
    choices: [
      'Its vertical velocity component and total kinetic energy both remain fixed.',
      'Its speed stays constant because gravity acts perpendicular to all motion.',
      'Its horizontal velocity component and downward acceleration stay constant.',
      'Its vertical position decreases linearly with each equal time interval.',
    ],
    answerIndex: 2,
    rationale: 'With negligible drag, zero horizontal force keeps v_x constant while gravity provides a constant downward acceleration g.',
  },

  // Unit 2: Force and Translational Dynamics
  'ap-physics-1-ch-02-check-01': {
    prompt: 'A crate slides across a rough floor at constant velocity under a horizontal push. How does the magnitude of the push compare with kinetic friction?',
    choices: [
      'The push must exceed kinetic friction to keep the crate moving forward.',
      'Kinetic friction exceeds the push whenever the crate moves steadily.',
      'The normal force must exceed the weight to maintain constant speed.',
      'The push equals kinetic friction because net horizontal force is zero.',
    ],
    answerIndex: 3,
    rationale: 'Constant velocity means zero acceleration, so by Newton’s second law the horizontal forces balance and F_push = f_k.',
  },
  'ap-physics-1-ch-02-check-02': {
    prompt: 'Two blocks connected by a taut light string are pulled across a frictionless table. Why is defining the two-block system helpful for finding acceleration?',
    choices: [
      'Internal string tension cancels, leaving only external net force.',
      'The two-block system removes gravity and normal forces from all equations.',
      'Choosing a combined system forces both blocks to experience zero tension.',
      'Internal tension doubles the external pulling force acting on the pair.',
    ],
    answerIndex: 0,
    rationale: 'Tension forces between the two blocks form an internal Newton’s third-law pair that sums to zero for the combined system, yielding a = F_ext / (m1 + m2).',
  },
  'ap-physics-1-ch-02-check-03': {
    prompt: 'A car rounds a flat circular curve at constant speed without slipping. Which force provides the centripetal acceleration toward the curve’s center?',
    choices: [
      'A separate outward centrifugal force balancing the engine’s thrust',
      'Static friction directed radially inward between tires and road',
      'The upward normal force tilted horizontally by the car’s speed',
      'Kinetic friction pointing forward tangent to the circular path',
    ],
    answerIndex: 1,
    rationale: 'Because the tires roll without sliding sideways, inward static friction supplies the net radial force mv^2/r required for circular motion.',
  },

  // Unit 3: Work, Energy, and Power
  'ap-physics-1-ch-03-check-01': {
    prompt: 'A student carries a heavy backpack horizontally at constant speed across a level hallway. How much net work does the upward support force do on the backpack?',
    choices: [
      'Positive work equal to weight multiplied by the hallway length traveled',
      'Negative work because gravity pulls downward against the student’s stride',
      'Zero work because the upward force is perpendicular to displacement',
      'Work equal to the backpack’s kinetic energy divided by travel time',
    ],
    answerIndex: 2,
    rationale: 'Work equals F d cos(theta); since the support force is vertical and displacement is horizontal (theta = 90 degrees), cos(90) = 0 and W = 0.',
  },
  'ap-physics-1-ch-03-check-02': {
    prompt: 'A block slides down a frictionless curved ramp from height h. If Earth and the block form the system, how does mechanical energy behave during the descent?',
    choices: [
      'Both kinetic and potential energy increase together throughout the slide.',
      'Total mechanical energy drops because gravity performs external negative work.',
      'Potential energy converts entirely into thermal energy inside the ramp.',
      'Gravitational potential energy transforms into kinetic energy with constant total.',
    ],
    answerIndex: 3,
    rationale: 'With no friction and gravity internal to the block-Earth system, mechanical energy is conserved as U_g converts into K.',
  },
  'ap-physics-1-ch-03-check-03': {
    prompt: 'Two motors lift identical crates through the same vertical height, but Motor A finishes in half the time of Motor B. How do their work and average power compare?',
    choices: [
      'Both do equal work; Motor A delivers twice the average power.',
      'Motor A does twice the total work and delivers equal average power.',
      'Motor B does twice the work because it runs for twice as many seconds.',
      'Both motors deliver equal power because the final heights are identical.',
    ],
    answerIndex: 0,
    rationale: 'Work depends on mgh, which is identical for both crates, while average power P = W / t doubles when time is cut in half.',
  },

  // Unit 4: Linear Momentum
  'ap-physics-1-ch-04-check-01': {
    prompt: 'Why do car airbags reduce the average force on a passenger during a crash compared with hitting a rigid dashboard over the same velocity change?',
    choices: [
      'Airbags reduce the total momentum change required to stop the passenger.',
      'Airbags extend stopping time, lowering average force for the same impulse.',
      'Airbags transfer the passenger’s mass out of the system before impact.',
      'Airbags eliminate kinetic energy without exerting any force on the rider.',
    ],
    answerIndex: 1,
    rationale: 'For a fixed change in momentum J = F_avg * delta_t, increasing the collision duration delta_t proportionally lowers the average impact force.',
  },
  'ap-physics-1-ch-04-check-02': {
    prompt: 'On a force-versus-time graph of a brief bat-ball impact, how can you determine the magnitude of the impulse delivered to the ball?',
    choices: [
      'Measure the steepest slope of the rising edge of the force curve.',
      'Divide the peak impact force by the mass of the baseball directly.',
      'Compute the area bounded by the force-versus-time curve.',
      'Read the horizontal width of the graph at half the maximum force.',
    ],
    answerIndex: 2,
    rationale: 'Impulse J = integral F dt equals the signed area under the force-versus-time graph over the duration of contact.',
  },
  'ap-physics-1-ch-04-check-03': {
    prompt: 'Two carts collide on a level frictionless track and stick together. Which conservation statement accurately describes the two-cart system?',
    choices: [
      'Both total linear momentum and total kinetic energy remain strictly conserved.',
      'Neither momentum nor kinetic energy is conserved because the carts deform.',
      'Kinetic energy is conserved while total linear momentum drops to zero.',
      'Total linear momentum is conserved, while some kinetic energy dissipates.',
    ],
    answerIndex: 3,
    rationale: 'With negligible external horizontal impulse, momentum is conserved in every collision, whereas a perfectly inelastic collision converts part of K into thermal and sound energy.',
  },

  // Unit 5: Torque and Rotational Dynamics
  'ap-physics-1-ch-05-check-01': {
    prompt: 'A wrench is used to loosen a stuck bolt. Which change increases the applied torque without increasing the magnitude of the pushing force?',
    choices: [
      'Pushing farther from the bolt perpendicular to the handle',
      'Pushing closer to the bolt along the line of the wrench handle',
      'Decreasing the lever arm while keeping the angle at thirty degrees',
      'Applying the force directly through the bolt’s rotational axis',
    ],
    answerIndex: 0,
    rationale: 'Torque tau = r F sin(theta) increases when the lever arm r_perp = r sin(theta) is maximized by pushing perpendicularly farther from the pivot.',
  },
  'ap-physics-1-ch-05-check-02': {
    prompt: 'A uniform plank rests horizontally in static equilibrium on two supports. What two net conditions must hold simultaneously?',
    choices: [
      'Net force equals weight while net torque depends on pivot choice.',
      'Both net external force and net external torque about any axis are zero.',
      'Net torque is zero only at the center while upward forces exceed weight.',
      'Horizontal forces vanish while vertical forces accelerate the plank upward.',
    ],
    answerIndex: 1,
    rationale: 'Static equilibrium requires zero linear acceleration (sum F = 0) and zero angular acceleration (sum tau = 0 about any chosen pivot).',
  },
  'ap-physics-1-ch-05-check-03': {
    prompt: 'A solid disk and a hollow hoop have identical mass M and radius R. Why does the hoop have a larger rotational inertia about its central axis?',
    choices: [
      'The hoop experiences greater gravitational pull at the same elevation.',
      'The disk loses mass near its rim whenever angular speed increases.',
      'More of the hoop’s mass sits farther from the rotation axis.',
      'Rotational inertia depends solely on total mass and never on shape.',
    ],
    answerIndex: 2,
    rationale: 'Because I = sum(m r^2), placing all mass at radius R gives the hoop I = MR^2, twice the solid disk’s I = (1/2)MR^2.',
  },

  // Unit 6: Energy and Momentum of Rotating Systems
  'ap-physics-1-ch-06-check-01': {
    prompt: 'A solid sphere and a frictionless sliding block start from rest at the top of identical ramps. Why does the sliding block reach the bottom first?',
    choices: [
      'Static friction removes mechanical energy from the rolling sphere continuously.',
      'Gravity exerts a larger downward component on the sliding block alone.',
      'The sphere has greater gravitational potential energy at the bottom.',
      'Part of the sphere’s potential energy goes into rotational kinetic energy.',
    ],
    answerIndex: 3,
    rationale: 'All of the block’s lost U_g becomes translational kinetic energy, whereas the rolling sphere splits U_g between translational and rotational kinetic energy.',
  },
  'ap-physics-1-ch-06-check-02': {
    prompt: 'A solid cylinder rolls without slipping down an incline. How does its center-of-mass speed v relate to its angular speed omega and radius R?',
    choices: [
      'v equals R times omega with no slipping at contact.',
      'v equals omega divided by R regardless of cylinder size.',
      'v stays independent of omega because rotation and translation decouple.',
      'v equals R squared times omega whenever friction is present.',
    ],
    answerIndex: 0,
    rationale: 'Rolling without slipping means the contact point is instantaneously at rest relative to the surface, enforcing the kinematic constraint v = R*omega.',
  },
  'ap-physics-1-ch-06-check-03': {
    prompt: 'A spinning ice skater pulls her outstretched arms inward on nearly frictionless ice. What happens to her angular momentum L and angular speed omega?',
    choices: [
      'Both angular momentum and angular speed decrease as arms move inward.',
      'Angular momentum stays constant while angular speed increases.',
      'Angular speed stays constant while rotational inertia doubles.',
      'Angular momentum increases because pulling arms exerts external torque.',
    ],
    answerIndex: 1,
    rationale: 'With negligible external torque, L = I*omega is conserved; pulling mass inward lowers I, so omega must increase proportionally.',
  },

  // Unit 7: Oscillations
  'ap-physics-1-ch-07-check-01': {
    prompt: 'What defining force condition produces simple harmonic motion for a mass oscillating on an ideal horizontal spring?',
    choices: [
      'A constant force pointing away from equilibrium at every position',
      'A net force proportional to velocity squared directed opposite motion',
      'A restoring force proportional to displacement from equilibrium',
      'Zero net force at the turning points and maximum force at equilibrium',
    ],
    answerIndex: 2,
    rationale: 'Hooke’s law F = -kx supplies a linear restoring force directed back toward equilibrium, producing sinusoidal simple harmonic motion.',
  },
  'ap-physics-1-ch-07-check-02': {
    prompt: 'A mass-spring oscillator undergoes ideal simple harmonic motion. If the amplitude is doubled without changing mass or spring constant, how does the period change?',
    choices: [
      'The period doubles because the mass travels twice the total distance.',
      'The period increases by a factor of the square root of two.',
      'The period is cut in half because the maximum restoring force doubles.',
      'The period stays unchanged because T depends on m and k, not A.',
    ],
    answerIndex: 3,
    rationale: 'For an ideal mass-spring system, T = 2*pi*sqrt(m/k), which is independent of amplitude because greater speed offsets the longer path.',
  },
  'ap-physics-1-ch-07-check-03': {
    prompt: 'During ideal simple harmonic motion of a horizontal mass-spring system, where are kinetic energy and elastic potential energy each at their maximum?',
    choices: [
      'Kinetic energy peaks at equilibrium; potential energy peaks at endpoints.',
      'Both kinetic and potential energy peak together at the turning points.',
      'Potential energy peaks at equilibrium while kinetic energy stays fixed.',
      'Kinetic energy peaks at endpoints where spring stretch is largest.',
    ],
    answerIndex: 0,
    rationale: 'At equilibrium x = 0 so U_s = 0 and speed is maximum; at the turning points v = 0 so K = 0 and spring stretch is maximum.',
  },

  // Unit 8: Fluids
  'ap-physics-1-ch-08-check-01': {
    prompt: 'Two open tanks of different widths hold stationary water to the same depth h. How does the gauge pressure at the bottom of the wider tank compare?',
    choices: [
      'It is greater because the wider tank holds a larger total weight of water.',
      'It is the same because hydrostatic pressure depends on density and depth.',
      'It is smaller because the force spreads across a wider bottom surface.',
      'It is zero whenever the water remains stationary inside an open vessel.',
    ],
    answerIndex: 1,
    rationale: 'Hydrostatic gauge pressure P_gauge = rho*g*h depends only on fluid density, gravitational field strength, and vertical depth below the surface.',
  },
  'ap-physics-1-ch-08-check-02': {
    prompt: 'A sealed block is held fully submerged at two different depths in a uniform incompressible fluid. How does the buoyant force on the block compare?',
    choices: [
      'Buoyant force grows linearly with depth because fluid pressure increases.',
      'Buoyant force drops to zero once the block sinks below the free surface.',
      'Buoyant force stays constant because displaced fluid weight is unchanged.',
      'Buoyant force equals the block’s own weight regardless of its density.',
    ],
    answerIndex: 2,
    rationale: 'By Archimedes’ principle, F_b = rho_fluid * V_displaced * g; once fully submerged in an incompressible fluid, displaced volume and buoyant force stay constant.',
  },
  'ap-physics-1-ch-08-check-03': {
    prompt: 'An ideal incompressible fluid flows steadily through a horizontal pipe that narrows to half its cross-sectional area. How do fluid speed and internal pressure change?',
    choices: [
      'Both speed and pressure drop by half inside the narrower section.',
      'Speed decreases by half while internal pressure rises above ambient.',
      'Speed stays constant while internal pressure increases to keep flow equal.',
      'Speed doubles by continuity while internal pressure drops by Bernoulli.',
    ],
    answerIndex: 3,
    rationale: 'Continuity (A1 v1 = A2 v2) doubles speed when area halves, and Bernoulli’s equation on a level pipe requires lower pressure where kinetic energy density is higher.',
  },
};
