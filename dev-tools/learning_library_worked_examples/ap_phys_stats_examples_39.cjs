'use strict';

/**
 * Original AP-exam-authentic worked examples and misconception guidance
 * covering all 24 AP Physics 1 sections and all 15 AP Statistics sections (39 total).
 */

const ap_physics_1_foundation_pilot = {
  'ap-physics-1-ch-01-section-01': {
    workedExample: {
      prompt: 'A cart starts at x0 = +4.0 m with velocity v0 = +12 m/s and constant acceleration a = -3.0 m/s^2. Find its velocity and position at t = 6.0 s, and state whether it is speeding up or slowing down.',
      steps: [
        'Step 1: Define +x to the right with x0 = +4.0 m, v0 = +12 m/s, and constant a = -3.0 m/s^2, so v(t) = v0 + a*t and x(t) = x0 + v0*t + 0.5*a*t^2 apply.',
        'Step 2: Evaluate at t = 6.0 s: v(6.0) = 12 + (-3.0)(6.0) = -6.0 m/s, and x(6.0) = 4.0 + 12(6.0) + 0.5(-3.0)(6.0)^2 = 4.0 + 72.0 - 54.0 = +22.0 m.',
        'Step 3: At t = 6.0 s, the cart is at x = +22.0 m moving in the -x direction at 6.0 m/s; because velocity (-6.0 m/s) and acceleration (-3.0 m/s^2) share the same sign, it is speeding up after reversing at t = 4.0 s.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students assume negative acceleration always means an object is slowing down, regardless of the direction of its velocity.',
        repair: 'Compare the signs of velocity and acceleration: an object speeds up whenever both vectors have the same sign and slows down only when their signs are opposite.',
      },
      {
        misconception: 'Students conclude that an object whose velocity momentarily equals zero at a turning point must also have zero acceleration.',
        repair: 'Distinguish velocity from its rate of change: at a turning point velocity crosses zero while acceleration remains nonzero so the velocity can reverse direction.',
      },
    ],
  },

  'ap-physics-1-ch-01-section-02': {
    workedExample: {
      prompt: 'On a velocity-time graph, a runner starts at +6.0 m/s at t = 0 s, decreases linearly to -2.0 m/s at t = 4.0 s, then stays at -2.0 m/s until t = 7.0 s. Find the acceleration over 0-4 s and net displacement over 0-7 s.',
      steps: [
        'Step 1: Use the v-t slope for constant acceleration on 0-4 s and split the signed area into triangles and a rectangle by finding where v crosses zero.',
        'Step 2: Slope a = (-2.0 - 6.0) / (4.0 - 0) = -2.0 m/s^2, so v = 0 at t = 3.0 s. Signed areas are +0.5(3.0)(6.0) = +9.0 m, 0.5(1.0)(-2.0) = -1.0 m, and (3.0)(-2.0) = -6.0 m.',
        'Step 3: Summing signed areas gives net displacement Delta x = +9.0 - 1.0 - 6.0 = +2.0 m in the +x direction (whereas total distance traveled is 9.0 + 1.0 + 6.0 = 16.0 m).',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students add every geometric area between a velocity-time curve and the time axis as positive when asked for net displacement.',
        repair: 'Keep area below the time axis negative for displacement so reverse motion subtracts from forward motion; sum absolute magnitudes only when asked for total distance.',
      },
      {
        misconception: 'Students read the vertical value on a position-time graph as velocity instead of measuring the slope of the curve.',
        repair: 'Map each graph operation cleanly: height on x-t gives position, slope of x-t gives velocity, slope of v-t gives acceleration, and signed area under v-t gives displacement.',
      },
    ],
  },

  'ap-physics-1-ch-01-section-03': {
    workedExample: {
      prompt: 'A ball launches horizontally at v0 = 8.0 m/s from a 5.0 m cliff (g = 10 m/s^2). Five trials average 7.4 +/- 0.1 m. Compute the ideal range R, the residual, and the limiting case as v0 approaches zero.',
      steps: [
        'Step 1: Model ideal projectile motion with zero air drag and decoupled axes: y = 0.5*g*t^2 sets fall time and R = v0*t sets horizontal range.',
        'Step 2: Solve 5.0 = 0.5(10)t^2 to get t = 1.0 s and ideal R = (8.0 m/s)(1.0 s) = 8.0 m. The residual (measured minus predicted) is 7.4 - 8.0 = -0.6 m.',
        'Step 3: Because the -0.6 m shortfall is six times the 0.1 m uncertainty, it signals systematic air drag rather than random noise; as v0 -> 0, R = v0*sqrt(2h/g) -> 0 m, matching a vertical drop.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students dismiss a consistent one-sided residual well outside measurement uncertainty as ordinary random experimental error.',
        repair: 'Compare residual size and sign against uncertainty: a persistent bias several uncertainties away from zero indicates a violated model assumption such as neglected drag.',
      },
      {
        misconception: 'Students apply constant-acceleration kinematic equations as exact predictors even when speed-dependent air resistance acts on the projectile.',
        repair: 'Verify whether net acceleration is constant before using constant-a formulas; when drag grows with speed, acceleration varies and constant-a results are only ideal upper bounds.',
      },
    ],
  },

  'ap-physics-1-ch-02-section-01': {
    workedExample: {
      prompt: 'A 5.0 kg box rests on the floor of an elevator accelerating upward at 2.0 m/s^2 (use g = 10 m/s^2). Calculate the normal force exerted by the floor on the box and identify its Newton third-law pair.',
      steps: [
        'Step 1: Choose the 5.0 kg box as the system with +y upward. Its free-body diagram has upward normal force F_N from the floor and downward weight m*g from Earth.',
        'Step 2: Apply Newton second law: F_N - m*g = m*a, so F_N = m*(g + a) = (5.0 kg)(10 + 2.0 m/s^2) = 60 N upward.',
        'Step 3: The floor pushes upward on the box with 60 N (exceeding its 50 N weight); its third-law pair is the 60 N downward contact force exerted by the box on the floor, not gravity.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students assume the normal force always equals m*g and acts as the Newton third-law reaction force to Earth gravity on the object.',
        repair: 'Third-law pairs always act on two different objects via the same interaction; normal force adjusts to prevent surface penetration and pairs with the box pushing down on the floor.',
      },
      {
        misconception: 'Students think an object moving upward must experience a net upward force even while moving at constant speed or slowing down.',
        repair: 'Link net force to acceleration rather than velocity: an upward-moving elevator has zero net force at constant speed and a downward net force when slowing down.',
      },
    ],
  },

  'ap-physics-1-ch-02-section-02': {
    workedExample: {
      prompt: 'A 4.0 kg block on a frictionless 30-degree incline connects via an ideal string over a massless pulley to a hanging 6.0 kg block (g = 10 m/s^2). Find the system acceleration and string tension.',
      steps: [
        'Step 1: Define the two-block system along the path of motion (6.0 kg downward, 4.0 kg up the ramp) so internal tension cancels and only external gravity components remain.',
        'Step 2: Net external force F_net = m2*g - m1*g*sin(30 deg) = 60 - 40(0.5) = 40 N over total mass 10.0 kg, giving a = 40 / 10.0 = 4.0 m/s^2.',
        'Step 3: Isolate the hanging 6.0 kg block: m2*g - T = m2*a gives 60 - T = 6.0(4.0) = 24 N, so T = 36 N (verified on the ramp block: 36 - 20 = 16 N = 4.0*4.0).',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students set string tension equal to the hanging block weight m2*g even while the hanging block accelerates downward.',
        repair: 'Draw an isolated free-body diagram for the accelerating hanging block: downward acceleration requires m2*g > T, so T = m2*(g - a) is strictly smaller than weight.',
      },
      {
        misconception: 'Students draw an extra force arrow labeled ma on a free-body diagram in addition to the actual contact and gravitational forces.',
        repair: 'Include only physical interactions exerted by external agents on the free-body diagram; m*a is the result of summing those forces, never a separate force arrow.',
      },
    ],
  },

  'ap-physics-1-ch-02-section-03': {
    workedExample: {
      prompt: 'A 1200 kg car rounds a flat circular turn of radius 50 m at constant speed 15 m/s without skidding (g = 10 m/s^2, mu_s = 0.60). Find the actual static friction force and verify the car stays in the static regime.',
      steps: [
        'Step 1: Choose the car as the system with inward radial axis +r; vertical equilibrium gives F_N = m*g = 12,000 N, and inward static friction supplies the centripetal force.',
        'Step 2: Required static friction f_s = m*v^2 / r = (1200)(15)^2 / 50 = 1200(4.5) = 5400 N inward, while maximum static friction is f_s,max = mu_s*F_N = 0.60(12,000) = 7200 N.',
        'Step 3: Since 5400 N <= 7200 N, the tires do not slip and remain in the static regime; the actual static friction force is 5400 N inward toward the center, not 7200 N.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students plug mu_s*F_N directly as the static friction force in every problem rather than treating it as only the maximum possible limit.',
        repair: 'Remember f_s <= mu_s*F_N: solve for the static friction required by Newton second law first, then compare that value against mu_s*F_N to test whether slipping begins.',
      },
      {
        misconception: 'Students label centripetal force as an extra outward or inward mystery force on a free-body diagram for circular motion.',
        repair: 'Never draw centripetal force as a standalone interaction; instead identify which real forces (friction, tension, normal, or gravity) sum radially inward to equal m*v^2/r.',
      },
    ],
  },

  'ap-physics-1-ch-03-section-01': {
    workedExample: {
      prompt: 'A 2.0 kg block starts from rest and is pushed 2.0 m along a frictionless horizontal track by a constant 16 N force angled 60 degrees above horizontal. Find the work done on the block and its final speed.',
      steps: [
        'Step 1: Take the block alone as the system so the applied force does external work W = F*d*cos(theta), while vertical gravity and normal force are perpendicular to horizontal motion.',
        'Step 2: Compute W = (16 N)(2.0 m)*cos(60 deg) = (32)(0.5) = +16 J. By the work-energy theorem from rest, K_f = 0.5*m*v_f^2 = 16 J, so 0.5(2.0)v_f^2 = 16.',
        'Step 3: Solving gives v_f = 4.0 m/s along the track; positive work transferred 16 J into the block kinetic energy store because a force component acted parallel to displacement.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students multiply the entire force magnitude by displacement without including cos(theta) for forces angled away from the motion.',
        repair: 'Project the force onto the displacement direction using W = F*d*cos(theta); only the component parallel (or antiparallel) to displacement transfers mechanical energy.',
      },
      {
        misconception: 'Students think the normal force or weight still performs work on a block sliding horizontally because the block is moving while those forces act.',
        repair: 'Check the angle between each force and displacement: when theta = 90 degrees, cos(90) = 0, so perpendicular forces do zero work regardless of how far the object moves.',
      },
    ],
  },

  'ap-physics-1-ch-03-section-02': {
    workedExample: {
      prompt: 'A 0.50 kg cart compresses a horizontal spring (k = 200 N/m) by 0.30 m and launches across a 2.0 m rough patch with kinetic friction 2.5 N. Using the cart-spring-track system, find its speed leaving the rough patch.',
      steps: [
        'Step 1: Define the closed cart-spring-track system so initial elastic energy U_s,i converts into final kinetic energy K_f plus internal thermal energy Delta E_th = f_k*d.',
        'Step 2: Calculate U_s,i = 0.5*k*x^2 = 0.5(200)(0.30)^2 = 9.0 J and Delta E_th = (2.5 N)(2.0 m) = 5.0 J, leaving K_f = 9.0 - 5.0 = 4.0 J.',
        'Step 3: Set 0.5(0.50 kg)v_f^2 = 4.0 J to get v_f^2 = 16 and v_f = 4.0 m/s; total system energy remains 9.0 J while mechanical energy drops by 5.0 J due to friction.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students count a spring or gravitational interaction twice by including both potential energy U and external work W in the same energy equation.',
        repair: 'Fix the system boundary first: if the spring or Earth is inside the system, use internal potential energy; if outside, include its external work instead, never both.',
      },
      {
        misconception: 'Students treat potential energy as stored inside a single isolated block rather than in the configuration of interacting objects.',
        repair: 'Explicitly name the interacting partner (Earth for U_g, spring for U_s); a single-object system can hold only kinetic energy, so external work must represent field or spring forces.',
      },
    ],
  },

  'ap-physics-1-ch-03-section-03': {
    workedExample: {
      prompt: 'An electric winch lifts a 40 kg crate vertically 6.0 m at constant speed in 8.0 s while drawing 400 W of electrical input power (g = 10 m/s^2). Calculate the useful mechanical output power and winch efficiency.',
      steps: [
        'Step 1: At constant speed, kinetic energy does not change, so useful output work equals the increase in crate-Earth gravitational potential energy: W_out = m*g*h and P_out = W_out / Delta t.',
        'Step 2: Compute W_out = (40 kg)(10 m/s^2)(6.0 m) = 2400 J, giving P_out = 2400 J / 8.0 s = 300 W. Efficiency is eta = P_out / P_in = 300 W / 400 W = 0.75 (75%).',
        'Step 3: The winch delivers 300 W of useful lifting power at 75% efficiency; the remaining 100 W (800 J over 8.0 s) dissipates as thermal energy in motor resistance and gear friction.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students equate doing a large amount of work with generating high power while ignoring how long the energy transfer takes.',
        repair: 'Separate total energy transferred (joules) from transfer rate (watts = J/s): lifting the same crate twice as fast does the same work but requires twice the average power.',
      },
      {
        misconception: 'Students interpret an efficiency under 100% as evidence that total energy was destroyed or not conserved in the real device.',
        repair: 'Recognize that efficiency measures only the useful fraction of input energy; energy conservation still holds exactly once thermal and acoustic losses are included.',
      },
    ],
  },

  'ap-physics-1-ch-04-section-01': {
    workedExample: {
      prompt: 'On a frictionless track, a 2.0 kg cart moving at +5.0 m/s collides and sticks to a 3.0 kg cart moving at -1.0 m/s. Find the final velocity of the coupled carts and the system center-of-mass velocity before and after impact.',
      steps: [
        'Step 1: Choose the two-cart system with +x to the right. Because net external horizontal force is zero, total momentum p and center-of-mass velocity v_cm are conserved.',
        'Step 2: Total initial momentum p_i = (2.0)(+5.0) + (3.0)(-1.0) = +10.0 - 3.0 = +7.0 kg*m/s over total mass M = 5.0 kg, so v_f = +7.0 / 5.0 = +1.4 m/s.',
        'Step 3: The stuck carts move together at +1.4 m/s to the right; v_cm = p_i / M = +1.4 m/s both before and after impact because internal collision forces cancel in pairs.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students add cart speeds as positive scalars in head-on collisions instead of assigning opposite signs to opposite velocity vectors.',
        repair: 'Establish a coordinate axis before writing momentum terms so opposing velocities carry opposite signs; momentum is a vector sum, never a sum of speeds.',
      },
      {
        misconception: 'Students believe the center-of-mass velocity of an isolated two-cart system drops when the carts collide and stick together.',
        repair: 'Remember that internal collision forces cannot accelerate the system center of mass: v_cm = p_total / M_total stays constant whenever net external force is zero.',
      },
    ],
  },

  'ap-physics-1-ch-04-section-02': {
    workedExample: {
      prompt: 'A 0.20 kg rubber ball hits a rigid wall horizontally at +10 m/s and rebounds at -8.0 m/s over a 0.040 s contact interval with a triangular force-time pulse. Find the impulse on the ball and the peak wall force.',
      steps: [
        'Step 1: Define +x toward the wall and apply the impulse-momentum theorem J = Delta p = m*(v_f - v_i), equating J to the triangular area 0.5*F_peak*Delta t under the F-t graph.',
        'Step 2: Compute J = (0.20 kg)(-8.0 - 10.0 m/s) = (0.20)(-18.0) = -3.6 N*s. From -3.6 = 0.5*F_peak*(0.040 s) = 0.020*F_peak, obtain F_peak = -180 N.',
        'Step 3: The wall delivers an impulse of -3.6 N*s (3.6 N*s away from the wall) with an average force of -90 N and a peak force magnitude of 180 N.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students subtract speed magnitudes (10 - 8 = 2 m/s) during a rebound instead of computing the signed vector change (-8 - 10 = -18 m/s).',
        repair: 'Always keep directional signs in Delta v = v_f - v_i: reversing direction requires stopping the ball first and then accelerating it backward, producing a much larger impulse.',
      },
      {
        misconception: 'Students set the peak force of a triangular impact pulse equal to J / Delta t instead of twice the average force.',
        repair: 'Match impulse to the exact geometric area under the F-t curve: for a triangle, area is 0.5*F_peak*Delta t, making F_peak equal to 2*F_avg.',
      },
    ],
  },

  'ap-physics-1-ch-04-section-03': {
    workedExample: {
      prompt: 'On a level air track, glider 1 (1.0 kg at +6.0 m/s) hits stationary glider 2 (2.0 kg). Sensors measure v1_f = -1.0 m/s and v2_f = +3.5 m/s. Check momentum conservation and determine whether the collision is elastic.',
      steps: [
        'Step 1: Compare total horizontal momentum p = m1*v1 + m2*v2 before and after impact to test isolation, then compare total kinetic energy K = 0.5*m1*v1^2 + 0.5*m2*v2^2 to test elasticity.',
        'Step 2: Momentum: p_i = 1.0(6.0) + 0 = +6.0 kg*m/s and p_f = 1.0(-1.0) + 2.0(+3.5) = +6.0 kg*m/s. Kinetic energy: K_i = 0.5(1.0)(36) = 18.0 J, while K_f = 0.5(1.0)(1.0) + 0.5(2.0)(12.25) = 12.75 J.',
        'Step 3: Equal initial and final momentum (+6.0 kg*m/s) confirms an isolated horizontal system, but Delta K = -5.25 J proves the collision is inelastic despite the gliders bouncing apart.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students classify any collision where objects bounce apart without sticking together as an elastic collision.',
        repair: 'Test elasticity quantitatively by comparing total K_i and K_f: bouncing objects still form an inelastic collision whenever deformation, heat, or sound reduces total kinetic energy.',
      },
      {
        misconception: 'Students conclude linear momentum is not conserved whenever a collision loses kinetic energy to sound or permanent deformation.',
        repair: 'Separate momentum conservation from kinetic energy conservation: momentum depends only on zero net external impulse, so it remains conserved even in strongly inelastic impacts.',
      },
    ],
  },

  'ap-physics-1-ch-05-section-01': {
    workedExample: {
      prompt: 'A uniform solid disk of mass 4.0 kg and radius 0.50 m (I = 0.5*M*R^2) starts from rest on a frictionless axle. A tangential 12 N rim force pulls for 3.0 s. Find the net torque, angular acceleration, and final angular velocity.',
      steps: [
        'Step 1: Use the axle as the rotation axis with tangential angle 90 degrees so tau = R*F*sin(90 deg), alpha = tau / I, and omega = omega0 + alpha*t for constant torque.',
        'Step 2: Calculate I = 0.5(4.0)(0.50)^2 = 0.50 kg*m^2 and tau = (0.50 m)(12 N) = 6.0 N*m, giving alpha = 6.0 / 0.50 = 12 rad/s^2 and omega = 0 + (12)(3.0) = 36 rad/s.',
        'Step 3: After 3.0 s, the disk rotates at 36 rad/s in the direction of the 6.0 N*m torque; the axle supplies an opposing force so the center of mass stays fixed while the disk accelerates angularly.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students multiply total force by distance from the pivot without accounting for the angle between the force and position vectors.',
        repair: 'Apply tau = r*F*sin(theta) or use the perpendicular lever arm r_perp: a force pointing directly through the pivot has sin(theta) = 0 and produces zero torque.',
      },
      {
        misconception: 'Students assume that zero net torque automatically implies zero net force, or that zero net force implies zero net torque.',
        repair: 'Check translational and rotational conditions independently: two equal, opposite, offset forces yield zero net force yet create a nonzero couple torque that causes angular acceleration.',
      },
    ],
  },

  'ap-physics-1-ch-05-section-02': {
    workedExample: {
      prompt: 'A uniform 2.0 m beam of mass 6.0 kg is hinged at its left end and held horizontal by a vertical cable attached 1.5 m from the hinge (g = 10 m/s^2). Calculate the cable tension and the vertical hinge force.',
      steps: [
        'Step 1: Choose the beam as the system and place the pivot at the hinge (x = 0) so the unknown hinge force has zero lever arm. Uniform beam weight W = 60 N acts downward at midpoint x = 1.0 m.',
        'Step 2: Rotational equilibrium (CCW positive): T(1.5 m) - (60 N)(1.0 m) = 0 yields T = 40 N upward. Vertical force equilibrium: F_hinge,y + 40 N - 60 N = 0 gives F_hinge,y = +20 N upward.',
        'Step 3: The cable supplies 40 N upward and the hinge supplies 20 N upward; checking torque about the cable attachment (-20*1.5 + 60*0.5 = 0) confirms static equilibrium.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students conclude that a hinge exerts zero force simply because placing the pivot at the hinge removes it from the torque equation.',
        repair: 'Remember that choosing a pivot only eliminates an unknown force from the torque sum; you must still apply Sum F_x = 0 and Sum F_y = 0 to find the actual hinge reaction force.',
      },
      {
        misconception: 'Students apply the weight of a uniform beam at its end or support point instead of at its geometric center of mass.',
        repair: 'For any uniform rigid rod or beam, draw the entire gravitational weight vector acting downward at the midpoint (L/2) to obtain the correct lever arm.',
      },
    ],
  },

  'ap-physics-1-ch-05-section-03': {
    workedExample: {
      prompt: 'A solid disk (I = 0.5*M*R^2) and a thin hoop (I = M*R^2) each have mass 2.0 kg and radius 0.40 m and spin at omega = 5.0 rad/s. Compare their rim tangential speeds, rotational inertias, and angular momenta.',
      steps: [
        'Step 1: Relate rim tangential speed to angular speed with v = R*omega, and evaluate rotational inertia I and angular momentum L = I*omega about each central axis.',
        'Step 2: Both rims have v = (0.40 m)(5.0 rad/s) = 2.0 m/s. However, I_disk = 0.5(2.0)(0.40)^2 = 0.16 kg*m^2 and I_hoop = (2.0)(0.40)^2 = 0.32 kg*m^2.',
        'Step 3: Consequently L_disk = (0.16)(5.0) = 0.80 kg*m^2/s while L_hoop = (0.32)(5.0) = 1.60 kg*m^2/s; concentrating mass at the outer rim doubles both rotational inertia and angular momentum.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students expect two rigid bodies with identical mass and outer radius to have the same rotational inertia regardless of shape.',
        repair: 'Inspect how mass is distributed relative to the axis: because each mass element contributes m*r^2, shifting mass farther from the axis increases rotational inertia sharply.',
      },
      {
        misconception: 'Students claim points near the hub of a rigid spinning disk have a smaller angular speed omega than points on the outer rim.',
        repair: 'Distinguish angular speed from tangential speed: every point on a rigid body shares the same omega, whereas tangential speed v = r*omega grows linearly with radial distance r.',
      },
    ],
  },

  'ap-physics-1-ch-06-section-01': {
    workedExample: {
      prompt: 'A 3.0 kg solid sphere (I = 2/5*M*R^2) of radius 0.20 m rolls without slipping along a level floor at center-of-mass speed 5.0 m/s. Find its angular speed, translational K, rotational K, and total kinetic energy.',
      steps: [
        'Step 1: Apply the no-slip constraint omega = v / R and split total kinetic energy into translational K_trans = 0.5*M*v^2 and rotational K_rot = 0.5*I*omega^2.',
        'Step 2: Compute omega = 5.0 / 0.20 = 25 rad/s and I = (2/5)(3.0)(0.20)^2 = 0.048 kg*m^2. Then K_trans = 0.5(3.0)(5.0)^2 = 37.5 J and K_rot = 0.5(0.048)(25)^2 = 15.0 J.',
        'Step 3: Total kinetic energy is 37.5 + 15.0 = 52.5 J, with 5/7 (71.4%) in translation and 2/7 (28.6%) in rotation about the center of mass.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students compute total kinetic energy of a rolling object using only 0.5*M*v^2 and omit the rotational kinetic energy term.',
        repair: 'Include both energy stores whenever a rigid body translates and rotates: K_total = 0.5*M*v_cm^2 + 0.5*I_cm*omega^2.',
      },
      {
        misconception: 'Students substitute v = R*omega even when a bowling ball or wheel is skidding across a surface.',
        repair: 'Verify the no-slip condition before linking v and omega: v = R*omega holds only when the contact point is instantaneously at rest relative to the surface.',
      },
    ],
  },

  'ap-physics-1-ch-06-section-02': {
    workedExample: {
      prompt: 'A uniform solid cylinder (I = 0.5*M*R^2) rolls without slipping from rest down an incline of vertical height 1.2 m (g = 10 m/s^2). Compute its bottom speed and compare it to a frictionless sliding block.',
      steps: [
        'Step 1: Choose the cylinder-Earth system; static friction provides torque at the instantaneously stationary contact point without dissipating energy, so M*g*h = 0.5*M*v^2 + 0.5*I*(v/R)^2.',
        'Step 2: Substitute I = 0.5*M*R^2 to obtain M*g*h = 0.5*M*v^2 + 0.25*M*v^2 = 0.75*M*v^2, so v = sqrt((4/3)*g*h) = sqrt((4/3)(10)(1.2)) = sqrt(16) = 4.0 m/s.',
        'Step 3: The rolling cylinder reaches 4.0 m/s, slower than a frictionless sliding block at sqrt(2*10*1.2) = 4.9 m/s, because one-third of M*g*h goes into rotational kinetic energy.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students subtract negative friction work from mechanical energy for a body rolling without slipping down a ramp.',
        repair: 'Static friction during pure rolling acts on a contact point with zero instantaneous displacement, so it redirects energy into rotation without converting mechanical energy to heat.',
      },
      {
        misconception: 'Students predict that a heavier solid cylinder reaches the bottom of an incline faster than a lighter solid cylinder of the same shape.',
        repair: 'Check the algebraic energy equation: both mass M and radius R cancel out of v = sqrt((4/3)*g*h), so only the geometric shape factor c in I = c*M*R^2 controls the rolling speed.',
      },
    ],
  },

  'ap-physics-1-ch-06-section-03': {
    workedExample: {
      prompt: 'A turntable (I = 20 kg*m^2) spins freely at 4.0 rad/s about a frictionless vertical axle. A 20 kg child drops vertically onto the rim at r = 1.0 m with zero horizontal speed. Find the final angular speed and Delta K.',
      steps: [
        'Step 1: Choose the turntable-child system about the vertical axle. Gravity and axle forces exert zero torque about this axis, so angular momentum L = I*omega is conserved.',
        'Step 2: Initial L_i = (20 kg*m^2)(4.0 rad/s) = 80 kg*m^2/s. Final rotational inertia I_f = 20 + (20)(1.0)^2 = 40 kg*m^2, yielding omega_f = 80 / 40 = 2.0 rad/s.',
        'Step 3: Rotational kinetic energy drops from K_i = 0.5(20)(4.0)^2 = 160 J to K_f = 0.5(40)(2.0)^2 = 80 J (Delta K = -80 J) as internal friction accelerates the child tangentially.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students assume rotational kinetic energy stays constant whenever angular momentum is conserved in a rotating collision or mass drop.',
        repair: 'Write K_rot = L^2 / (2*I): when L is fixed and I increases (as when a mass lands on a disk), rotational kinetic energy must decrease through internal dissipative work.',
      },
      {
        misconception: 'Students invoke angular momentum conservation without specifying the axis or verifying that net external torque about that axis is zero.',
        repair: 'Always state the chosen axis first and check every external force lever arm about it; if a nonzero external torque acts over Delta t, use angular impulse Delta L = tau_ext*Delta t.',
      },
    ],
  },

  'ap-physics-1-ch-07-section-01': {
    workedExample: {
      prompt: 'A 0.40 kg block on a frictionless horizontal surface attaches to a spring (k = 160 N/m), is pulled 0.15 m from equilibrium, and released from rest. Find its period, frequency, and maximum acceleration magnitude.',
      steps: [
        'Step 1: For horizontal simple harmonic motion, net restoring force F = -k*x gives angular frequency omega = sqrt(k/m), period T = 2*pi*sqrt(m/k), and a_max = (k/m)*A at x = +/-A.',
        'Step 2: Compute omega = sqrt(160 / 0.40) = sqrt(400) = 20 rad/s, so T = 2*pi / 20 = 0.314 s, f = 1 / T = 3.18 Hz, and a_max = (400 s^-2)(0.15 m) = 60 m/s^2.',
        'Step 3: The block completes 3.18 cycles per second with a 0.314 s period independent of amplitude, reaching its peak acceleration of 60 m/s^2 toward equilibrium at the turning points.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students think pulling a spring-mass oscillator twice as far from equilibrium doubles its oscillation period.',
        repair: 'Check T = 2*pi*sqrt(m/k): larger amplitude increases both the travel distance and the restoring force proportionally, keeping the ideal SHM period unchanged.',
      },
      {
        misconception: 'Students claim acceleration is zero at the turning points of SHM because the oscillating block stops momentarily there.',
        repair: 'Use a = -(k/m)*x: acceleration is zero at equilibrium (x = 0) where speed peaks, and acceleration reaches its maximum magnitude at the turning points (x = +/-A) where spring stretch peaks.',
      },
    ],
  },

  'ap-physics-1-ch-07-section-02': {
    workedExample: {
      prompt: 'A horizontal oscillator follows x(t) = 0.20*cos(pi*t) in meters. Determine its amplitude, period, the first time it crosses equilibrium moving in the -x direction, and its speed at that instant.',
      steps: [
        'Step 1: Match x(t) = A*cos(omega*t) to read amplitude A = 0.20 m and angular frequency omega = pi rad/s; equilibrium crossings occur where cos(omega*t) = 0 and peak speed is v_max = omega*A.',
        'Step 2: Period T = 2*pi / pi = 2.0 s (f = 0.50 Hz). Starting at x(0) = +0.20 m, the first zero crossing is at t = T/4 = 0.50 s, where the x-t slope is steepest negative.',
        'Step 3: At t = 0.50 s, the oscillator passes x = 0 moving in the -x direction at speed v_max = (pi rad/s)(0.20 m) = 0.628 m/s (velocity -0.628 m/s).',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students read the time interval between two consecutive zero crossings on a position-time graph as one full period T.',
        repair: 'Confirm that one full cycle returns to the same position moving in the same direction; consecutive equilibrium crossings are separated by only half a period (T/2).',
      },
      {
        misconception: 'Students identify the peaks and troughs of a displacement-time curve as the points of maximum speed.',
        repair: 'Remember velocity is the slope of x(t): peaks and troughs have horizontal tangents (zero speed), while maximum speed occurs where the curve crosses equilibrium with steepest slope.',
      },
    ],
  },

  'ap-physics-1-ch-07-section-03': {
    workedExample: {
      prompt: 'A damped 0.50 kg spring oscillator (k = 50 N/m) starts at amplitude 0.20 m. After 10 cycles timed at 6.3 +/- 0.2 s, amplitude drops to 0.10 m. Find the mechanical energy lost and the experimental period with uncertainty.',
      steps: [
        'Step 1: Evaluate total mechanical energy at turning points using E = 0.5*k*A^2, and divide both total elapsed time and timing uncertainty by N = 10 cycles to obtain T.',
        'Step 2: Initial E_i = 0.5(50)(0.20)^2 = 1.00 J and final E_f = 0.5(50)(0.10)^2 = 0.25 J, so energy lost is 1.00 - 0.25 = 0.75 J. Period T = (6.3 +/- 0.2 s) / 10 = 0.63 +/- 0.02 s.',
        'Step 3: Halving amplitude removes 75% (0.75 J) of mechanical energy to the surroundings, while the measured period 0.63 +/- 0.02 s agrees with the ideal prediction 2*pi*sqrt(0.50/50) = 0.628 s.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students expect halving the amplitude of a damped oscillator to reduce its mechanical energy by only half.',
        repair: 'Use E = 0.5*k*A^2: because mechanical energy scales with amplitude squared, reducing amplitude to 1/2 leaves only (1/2)^2 = 1/4 of the original mechanical energy.',
      },
      {
        misconception: 'Students measure a single swing with a stopwatch and treat that raw reading as having minimal reaction-time uncertainty.',
        repair: 'Time many consecutive cycles (such as 10 or 20) and divide both elapsed time and stopwatch uncertainty by the cycle count to shrink the per-period uncertainty.',
      },
    ],
  },

  'ap-physics-1-ch-08-section-01': {
    workedExample: {
      prompt: 'Water (1000 kg/m^3) flows steadily through a horizontal pipe narrowing from area 0.040 m^2 to 0.010 m^2. If speed is 2.0 m/s and pressure is 150 kPa in the wide section, find speed and pressure in the narrow section.',
      steps: [
        'Step 1: For steady incompressible ideal flow in a horizontal pipe (y1 = y2), apply continuity A1*v1 = A2*v2 and Bernoulli equation P1 + 0.5*rho*v1^2 = P2 + 0.5*rho*v2^2.',
        'Step 2: Continuity gives v2 = (0.040 / 0.010)(2.0 m/s) = 8.0 m/s. Bernoulli gives P2 = 150,000 + 0.5(1000)(2.0^2 - 8.0^2) = 150,000 + 500(-60) = 120,000 Pa.',
        'Step 3: In the narrow section, water speeds up fourfold to 8.0 m/s while static pressure drops by 30 kPa to 120 kPa as pressure energy converts into kinetic energy per unit volume.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students predict that fluid pressure must rise inside a narrowed pipe constriction because the water is squeezed into less space.',
        repair: 'Link acceleration to a pressure gradient: fluid accelerates into a constriction only because higher pressure upstream pushes it toward lower pressure inside the faster narrow section.',
      },
      {
        misconception: 'Students substitute pipe radius or diameter directly for cross-sectional area A in the continuity equation A1*v1 = A2*v2.',
        repair: 'Compute circular pipe area using A = pi*r^2: cutting a pipe diameter in half reduces cross-sectional area by a factor of four and quadruples flow speed.',
      },
    ],
  },

  'ap-physics-1-ch-08-section-02': {
    workedExample: {
      prompt: 'A wooden block (V = 0.020 m^3, density 750 kg/m^3) floats at rest in freshwater (1000 kg/m^3; g = 10 m/s^2). Find the buoyant force, submerged volume, and water gauge pressure at depth 0.30 m.',
      steps: [
        'Step 1: For a floating object in equilibrium, upward buoyant force equals total weight (F_B = m*g = rho_fluid*V_sub*g), and gauge pressure at depth h is P_gauge = rho_fluid*g*h.',
        'Step 2: Block mass m = (750)(0.020) = 15 kg, so F_B = W = 15(10) = 150 N. Thus V_sub = 150 / (1000*10) = 0.015 m^3 (75% submerged), and P_gauge = (1000)(10)(0.30) = 3000 Pa.',
        'Step 3: The water exerts a 150 N upward buoyant force with 0.015 m^3 of the block submerged (matching rho_block / rho_water = 0.75), and gauge pressure at 0.30 m depth is 3.0 kPa.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students plug the entire volume of a floating block into F_B = rho_fluid*V*g instead of only the submerged portion.',
        repair: 'Use only the displaced fluid volume V_sub in Archimedes principle; for a floating object, set F_B equal to object weight first so the submerged fraction equals rho_object / rho_fluid.',
      },
      {
        misconception: 'Students assume pushing an already fully submerged incompressible block deeper increases the buoyant force acting on it.',
        repair: 'Remember buoyancy comes from the pressure difference between bottom and top faces: deeper water raises top and bottom pressures equally, leaving their difference and F_B unchanged.',
      },
    ],
  },

  'ap-physics-1-ch-08-section-03': {
    workedExample: {
      prompt: 'Water exits a small nozzle (area 2.0 x 10^-4 m^2) located 0.80 m below the open surface of a wide tank (g = 10 m/s^2). Find the ideal exit speed and flow rate, then explain why measured exit speed is 3.6 m/s.',
      steps: [
        'Step 1: Apply Bernoulli between the open top surface (P1 = P_atm, v1 approx 0, y1 = 0.80 m) and open exit jet (P2 = P_atm, y2 = 0) to get v2 = sqrt(2*g*h) and flow rate Q = A*v2.',
        'Step 2: Ideal exit speed v2 = sqrt(2*10*0.80) = sqrt(16) = 4.0 m/s, giving ideal volume flow rate Q = (2.0 x 10^-4 m^2)(4.0 m/s) = 8.0 x 10^-4 m^3/s (0.80 L/s).',
        'Step 3: The measured 3.6 m/s speed retains only (3.6/4.0)^2 = 81% of ideal kinetic energy per volume because viscous friction and turbulence at the nozzle dissipate energy into heat.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students expect ideal Bernoulli predictions to match real pipe or nozzle flow exactly even when viscosity and sharp bends are present.',
        repair: 'Treat Bernoulli as an ideal inviscid model: viscosity, wall friction, and turbulence convert mechanical energy into heat, lowering measured speed or downstream pressure.',
      },
      {
        misconception: 'Students assume the ideal Torricelli exit speed from an open tank depends on fluid density or the nozzle cross-sectional area.',
        repair: 'Cancel density from rho*g*h = 0.5*rho*v^2: ideal exit speed depends only on g and depth h for a small hole in a wide tank, though flow rate Q = A*v scales with area.',
      },
    ],
  },
};

const ap_statistics_foundation_pilot = {
  'ap-stats-ch-01-section-01': {
    workedExample: {
      prompt: 'Nine student commute times (minutes) are 8, 10, 11, 12, 13, 14, 15, 16, and 45. Find the median, IQR, and mean, test 45 using the 1.5*IQR rule, and select the best center and spread measures.',
      steps: [
        'Step 1: Inspect the ordered sample (n = 9) for shape and unusual values before summarizing; compute Q1 and Q3 from the lower four and upper four values excluding the median.',
        'Step 2: Median = 13 min, Q1 = (10+11)/2 = 10.5 min, Q3 = (15+16)/2 = 15.5 min, and IQR = 15.5 - 10.5 = 5.0 min. Upper fence = 15.5 + 1.5(5.0) = 23.0 min, while mean = 144 / 9 = 16.0 min.',
        'Step 3: Because 45 > 23.0 min, 45 min is a high outlier creating strong right skew and pulling the mean (16.0 min) above the median; report median (13 min) and IQR (5.0 min) as resistant summaries.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students automatically report the mean and standard deviation for strongly skewed distributions containing extreme outliers.',
        repair: 'Match summary measures to shape: use the resistant median and IQR whenever a distribution is skewed or has outliers, reserving mean and standard deviation for roughly symmetric data.',
      },
      {
        misconception: 'Students describe a quantitative distribution by stating only its center and spread while omitting shape, outliers, and context.',
        repair: 'Follow SOCV in every AP free-response description: address Shape, Outliers or unusual gaps, Center, and Variability explicitly in the context and units of the variable.',
      },
    ],
  },

  'ap-stats-ch-01-section-02': {
    workedExample: {
      prompt: 'A school of 600 ninth-graders and 400 tenth-graders plans a proportional stratified random sample of 50 students for a study-hours survey, while a separate trial tests two apps on 40 volunteers. Specify both designs.',
      steps: [
        'Step 1: Separate sampling design (for estimating a population quantity) from experimental design (for comparing treatments): stratify by grade in the survey and randomly assign treatments in the trial.',
        'Step 2: Compute proportional strata sizes from N = 1000: ninth-graders are 600/1000 = 60%, giving 0.60(50) = 30 students, and tenth-graders are 40%, giving 0.40(50) = 20 students, each chosen by separate SRS.',
        'Step 3: For the 40 volunteers, use a random number generator to assign 20 to App A and 20 to App B (blocking by prior GPA if GPA predicts outcomes) so confounding variables balance across groups.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students believe increasing the size of a voluntary-response or convenience sample removes selection bias.',
        repair: 'Separate bias from variability: a larger biased sample only reduces sampling variability around the wrong center; unbiased estimation requires probability sampling.',
      },
      {
        misconception: 'Students confuse random sampling with random assignment and claim either one justifies both generalization and causation.',
        repair: 'Tie each random mechanism to its specific role: random sampling from a population enables generalization, whereas random assignment of treatments enables cause-and-effect inference.',
      },
    ],
  },

  'ap-stats-ch-01-section-03': {
    workedExample: {
      prompt: 'In an observational survey of a random sample of 320 U.S. teens, 72% sleeping under 7 hours report daytime fatigue versus 38% sleeping 7+ hours. Identify the statistics, parameters, and exact scope of inference.',
      steps: [
        'Step 1: Distinguish sample statistics (computed from the 320 sampled teens) from population parameters (unknown true values for all U.S. teens), then inspect random selection and random assignment.',
        'Step 2: Sample statistics are p-hat_1 = 0.72 and p-hat_2 = 0.38 (a 0.34 sample difference); corresponding parameters p_1 and p_2 are the true fatigue proportions among all U.S. teens in each sleep group.',
        'Step 3: Random sampling supports generalizing this association to all U.S. teens, but because sleep duration was observed rather than randomly assigned, confounders like stress prevent causal claims.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students claim a large, statistically significant difference in an observational study proves one variable causes the outcome.',
        repair: 'Check for random assignment before claiming causation: without imposed treatments, lurking or confounding variables can explain why two groups differ even in a large random sample.',
      },
      {
        misconception: 'Students use sample notation like p-hat or x-bar to describe population parameters or generalize convenience-sample experiments to everyone.',
        repair: 'Keep notation and scope strict: parameters (p, mu) describe populations, statistics (p-hat, x-bar) describe samples, and volunteer experiments generalize only to similar volunteers.',
      },
    ],
  },

  'ap-stats-ch-02-section-01': {
    workedExample: {
      prompt: 'In a survey of 200 students, 90 take AP Biology (54 prefer lab work) and 110 do not (44 prefer lab work). Calculate the conditional proportions who prefer lab work in each group and assess whether an association exists.',
      steps: [
        'Step 1: Identify taking AP Biology as the explanatory grouping variable and preferring lab work as the response, so condition on each group total rather than the grand total of 200.',
        'Step 2: Compute P(Lab | AP Bio) = 54 / 90 = 0.60 (60%) and P(Lab | Not AP Bio) = 44 / 110 = 0.40 (40%), compared with the overall marginal proportion 98 / 200 = 0.49 (49%).',
        'Step 3: Because the conditional proportions differ substantially (60% vs. 40%), there is a clear association between taking AP Biology and preferring lab work in this sample.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students compare raw cell counts (54 vs. 44) across groups of unequal size instead of comparing conditional proportions.',
        repair: 'Always convert raw two-way table counts into conditional proportions within each explanatory group so unequal group totals do not distort the comparison.',
      },
      {
        misconception: 'Students divide a cell count by the grand table total (54/200) when asked for a conditional proportion given a specific row or column.',
        repair: 'Match the denominator to the "given" condition: a joint proportion divides by the grand total, whereas a conditional proportion divides by the conditioning row or column total.',
      },
    ],
  },

  'ap-stats-ch-02-section-02': {
    workedExample: {
      prompt: 'At a clinic, 40% of patients receive Test A, 30% receive Test B, and 12% receive both. Compute P(A or B), P(neither A nor B), and P(A | B), then determine whether receiving Test A and Test B are independent.',
      steps: [
        'Step 1: Apply the general addition rule P(A or B) = P(A) + P(B) - P(A and B), the complement rule for neither event, and P(A | B) = P(A and B) / P(B).',
        'Step 2: Calculate P(A or B) = 0.40 + 0.30 - 0.12 = 0.58, P(neither) = 1 - 0.58 = 0.42, and P(A | B) = 0.12 / 0.30 = 0.40.',
        'Step 3: Because P(A | B) = 0.40 equals P(A) = 0.40 (equivalently 0.40*0.30 = 0.12 = P(A and B)), receiving Test A and receiving Test B are independent events.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students equate mutually exclusive events with independent events, assuming non-overlapping outcomes do not influence each other.',
        repair: 'Contrast the definitions directly: two events with nonzero probabilities that are mutually exclusive have P(A | B) = 0 != P(A), making them strongly dependent rather than independent.',
      },
      {
        misconception: 'Students reverse the conditioning denominator by computing P(A and B) / P(A) when asked for P(A | B).',
        repair: 'Read the vertical bar as "given": whatever event appears after the bar in P(A | B) defines the reduced sample space and must go in the denominator.',
      },
    ],
  },

  'ap-stats-ch-02-section-03': {
    workedExample: {
      prompt: 'A player makes 80% of free throws independently. In 25 attempts, let X be the number made. Verify binomial conditions, find the mean and standard deviation of X, and compute the exact probability P(X >= 24).',
      steps: [
        'Step 1: Check BINS: Binary outcome (make/miss), Independent shots, fixed Number n = 25, Same probability p = 0.80, so X ~ Binomial(25, 0.80).',
        'Step 2: Mean mu_X = n*p = 25(0.80) = 20 makes and sigma_X = sqrt(n*p*(1-p)) = sqrt(25*0.80*0.20) = sqrt(4.0) = 2.0 makes. Exact P(X >= 24) = C(25,24)(0.80)^24(0.20) + (0.80)^25 = 0.0236 + 0.0038 = 0.0274.',
        'Step 3: The player averages 20 makes with SD 2.0 makes and has a 2.74% chance of making at least 24 shots; because n*(1-p) = 5 < 10, a Normal approximation is inappropriate here.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students use a Normal approximation for a binomial count whenever n looks moderately large without checking n*p >= 10 and n*(1-p) >= 10.',
        repair: 'Verify both expected successes and expected failures are at least 10 before using a Normal model; when either is below 10, use exact binomial probabilities instead.',
      },
      {
        misconception: 'Students apply the binomial formula to sampling without replacement from a small finite population without checking the 10% condition.',
        repair: 'Confirm that sample size n is at most 10% of population size N when sampling without replacement so trial probabilities remain close enough to independent.',
      },
    ],
  },

  'ap-stats-ch-03-section-01': {
    workedExample: {
      prompt: 'In a random sample of 400 voters from a city of 50,000, 256 support a transit bond. Verify inference conditions and construct a 95% confidence interval for the true proportion of city voters supporting the bond.',
      steps: [
        'Step 1: Define p as the true support proportion among all 50,000 voters and verify conditions: random sample stated, 400 <= 0.10(50,000) = 5,000, and large counts 256 >= 10 and 144 >= 10.',
        'Step 2: Sample proportion p-hat = 256 / 400 = 0.64 and SE = sqrt(0.64*0.36 / 400) = 0.48 / 20 = 0.024. With z* = 1.96, margin of error ME = 1.96(0.024) = 0.0470, giving 0.64 +/- 0.0470 = (0.593, 0.687).',
        'Step 3: We are 95% confident that the interval from 0.593 to 0.687 captures the true proportion of all city voters who support the transit bond.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students interpret a 95% confidence interval as a 95% probability that the fixed population proportion lies inside this single interval.',
        repair: 'Remember the parameter is fixed while the interval is random: 95% describes the long-run capture rate of the interval method across repeated random samples.',
      },
      {
        misconception: 'Students check n >= 30 for a proportion confidence interval instead of verifying the Large Counts condition.',
        repair: 'Keep proportion and mean conditions distinct: one-sample proportion intervals require at least 10 observed successes (n*p-hat >= 10) and 10 observed failures (n*(1-p-hat) >= 10).',
      },
    ],
  },

  'ap-stats-ch-03-section-02': {
    workedExample: {
      prompt: 'A shipper claims 80% of packages arrive on time. In a random sample of 100 packages from 5,000 shipped, 72 arrive on time. Run a one-sample z-test at alpha = 0.05 to test if the true on-time rate is below 0.80.',
      steps: [
        'Step 1: State H0: p = 0.80 vs. Ha: p < 0.80 (p = true on-time proportion). Conditions hold: random sample, 100 <= 0.10(5,000), and null large counts n*p0 = 80 >= 10 and n*(1-p0) = 20 >= 10.',
        'Step 2: With p-hat = 72/100 = 0.72, null SD = sqrt(0.80*0.20 / 100) = 0.040, giving z = (0.72 - 0.80) / 0.040 = -2.00 and one-sided p-value = P(Z <= -2.00) = 0.0228.',
        'Step 3: Since p-value = 0.0228 < alpha = 0.05, reject H0; there is convincing statistical evidence that the true proportion of on-time packages is less than 0.80.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students substitute the sample proportion p-hat into the denominator of a one-sample z-test statistic instead of the null value p0.',
        repair: 'Always compute the one-sample z-test standard deviation from p0 because the entire test evaluates how unusual p-hat is under the assumption that H0 is true.',
      },
      {
        misconception: 'Students define the p-value as the probability that the null hypothesis is true given the observed sample.',
        repair: 'State p-value as a conditional probability assuming H0: it is the chance of observing a test statistic at least as extreme as ours if the null parameter value were actually true.',
      },
    ],
  },

  'ap-stats-ch-03-section-03': {
    workedExample: {
      prompt: 'A bookstore surveys two random samples of 100 shoppers each: Weekday (52 fiction, 32 nonfiction, 16 sci-fi) and Weekend (28 fiction, 48 nonfiction, 24 sci-fi). Run a chi-square test of homogeneity at alpha = 0.05.',
      steps: [
        'Step 1: Test H0: genre distributions are identical for weekday and weekend shoppers vs. Ha: they differ, using two independent random samples. Column totals (80, 80, 40) give expected counts 40, 40, and 20 in each row (all >= 5).',
        'Step 2: Each row contributes (12)^2/40 + (-8)^2/40 + (-4)^2/20 = 3.60 + 1.60 + 0.80 = 6.00, so chi^2 = 12.00 with df = (2-1)(3-1) = 2 and p-value = P(chi^2 >= 12.00) = 0.0025.',
        'Step 3: Because p-value = 0.0025 < 0.05, reject H0; there is convincing statistical evidence that the distribution of book genre choices differs between weekday and weekend shoppers.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students pick a chi-square test of independence when data come from two separate random samples rather than one combined random sample.',
        repair: 'Match the chi-square test to the design: use homogeneity for separate populations or treatment groups, and independence for one sample classified on two variables.',
      },
      {
        misconception: 'Students check that all observed cell counts are at least 5 instead of checking the expected cell counts for a chi-square test.',
        repair: 'Compute Expected = (row total * column total) / grand total for every cell and check that all expected counts are at least 5; small observed counts are acceptable.',
      },
    ],
  },

  'ap-stats-ch-04-section-01': {
    workedExample: {
      prompt: 'Individual delivery times are right-skewed with mean 32 min and standard deviation 12 min. For an SRS of 36 deliveries from a large population, describe the sampling distribution of x-bar and find P(x-bar > 35 min).',
      steps: [
        'Step 1: Identify mu_xbar = mu = 32 min, check 10% independence for a large population to use sigma_xbar = sigma / sqrt(n), and invoke the Central Limit Theorem since n = 36 >= 30.',
        'Step 2: Calculate sigma_xbar = 12 / sqrt(36) = 12 / 6 = 2.0 min. Standardize x-bar = 35: z = (35 - 32) / 2.0 = +1.50, giving P(x-bar > 35) = P(Z > 1.50) = 0.0668.',
        'Step 3: The sampling distribution of x-bar is approximately Normal with mean 32 min and SD 2.0 min, so there is about a 6.68% probability that a random sample of 36 deliveries averages over 35 min.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students divide by the population standard deviation sigma instead of sigma / sqrt(n) when finding probabilities about a sample mean.',
        repair: 'Distinguish an individual observation X from a sample mean x-bar: averages vary less than single values, so always scale standard deviation by 1 / sqrt(n) for x-bar.',
      },
      {
        misconception: 'Students think the Central Limit Theorem makes the underlying population or raw sample data become Normal when n >= 30.',
        repair: 'Remember the CLT applies only to the sampling distribution of the sample mean x-bar; a large sample drawn from a right-skewed population will still look right-skewed itself.',
      },
    ],
  },

  'ap-stats-ch-04-section-02': {
    workedExample: {
      prompt: 'A random sample of 16 athletes ran a sprint before and after a warm-up. Differences (Before - After) are roughly symmetric with mean 0.45 s and SD 0.60 s. Construct a 95% matched-pairs t-interval for mean time reduction.',
      steps: [
        'Step 1: Recognize paired measurements on the same 16 athletes, so apply a one-sample t-interval for mu_diff (Before - After) with df = 16 - 1 = 15; random sample and symmetric differences satisfy conditions.',
        'Step 2: Compute SE = 0.60 / sqrt(16) = 0.15 s. Using t* = 2.131 for df = 15 at 95% confidence, ME = 2.131(0.15) = 0.320 s, giving 0.45 +/- 0.320 = (0.130 s, 0.770 s).',
        'Step 3: We are 95% confident that the true mean sprint-time reduction after warm-up lies between 0.13 s and 0.77 s; because the entire interval exceeds 0, it supports faster times after warm-up.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students apply a two-sample t-procedure to before-and-after measurements taken on the exact same individuals.',
        repair: 'Check whether measurements are linked on the same subjects: paired data violate two-sample independence and require a single list of differences in a matched-pairs t-procedure.',
      },
      {
        misconception: 'Students use a Normal z* critical value when constructing a confidence interval for a mean using sample standard deviation s.',
        repair: 'Use the t-distribution with df = n - 1 whenever population sigma is unknown and estimated by s, because heavier t-tails account for the extra uncertainty in estimating spread.',
      },
    ],
  },

  'ap-stats-ch-04-section-03': {
    workedExample: {
      prompt: 'A one-sample t-test of H0: mu = 500 mL vs. Ha: mu != 500 mL on 25 randomly sampled juice bottles gives x-bar = 496.4 mL, s = 7.5 mL, t = -2.40 (df = 24), and p-value = 0.0245. Interpret the result and connect it to a 95% CI.',
      steps: [
        'Step 1: Verify the test statistic from SE = 7.5 / sqrt(25) = 1.50 mL and t = (496.4 - 500) / 1.50 = -2.40, then compare the two-sided p-value to alpha = 0.05.',
        'Step 2: Because 0.0245 < 0.05, reject H0. The corresponding 95% t-interval with t*(df = 24) = 2.064 is 496.4 +/- 2.064(1.50) = 496.4 +/- 3.10 = (493.3 mL, 499.5 mL).',
        'Step 3: There is convincing evidence that the true mean fill volume differs from 500 mL, matching the 95% CI (493.3, 499.5 mL) which excludes 500 mL, though a 3.6 mL shortfall may still be evaluated for practical importance.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students write that rejecting H0 proves the alternative hypothesis with certainty or that failing to reject H0 proves H0 is true.',
        repair: 'Frame conclusions in terms of convincing statistical evidence rather than absolute proof; failing to reject H0 only means the data did not provide sufficient evidence against it.',
      },
      {
        misconception: 'Students equate a small statistically significant p-value with a large, practically meaningful effect size in the real world.',
        repair: 'Inspect the confidence interval magnitude alongside the p-value: with enough data, even a tiny difference can be statistically significant without being practically important.',
      },
    ],
  },

  'ap-stats-ch-05-section-01': {
    workedExample: {
      prompt: 'A scatterplot of study hours (1 to 10 h) vs. quiz score shows a strong positive linear trend (r = 0.88), except one high-leverage point at (10 h, 52 pts) sits far below the line. Predict how removing it changes r and slope.',
      steps: [
        'Step 1: Diagnose the unusual observation by checking both its x-location (x = 10 h is at the far right edge, giving high leverage) and its large negative vertical residual below the upward trend.',
        'Step 2: Because a high-leverage point below the right end of an upward trend acts like a downward weight on the lever, it flattens the least-squares slope b1 and pulls r down toward zero.',
        'Step 3: Removing (10 h, 52 pts) will increase the positive slope (making the predicted score gain per study hour steeper) and strengthen correlation r above 0.88 closer to +1.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students describe a scatterplot by stating only whether the trend is positive or negative while leaving out form, strength, and outliers.',
        repair: 'Cover all four AP scatterplot elements in context: Direction (positive/negative), Unusual features (outliers/clusters), Form (linear/curved), and Strength (weak/moderate/strong).',
      },
      {
        misconception: 'Students assume any point with a large vertical residual strongly changes the regression slope even if its x-value sits near x-bar.',
        repair: 'Distinguish vertical outliers from high-leverage points: a point near x-bar mainly shifts the intercept and weakens r, whereas an extreme x-value strongly pulls the slope.',
      },
    ],
  },

  'ap-stats-ch-05-section-02': {
    workedExample: {
      prompt: 'For used cars (10 to 120 thousand miles), y-hat = 28,500 - 180x predicts price ($) from mileage x (thousands of miles). Interpret the slope, predict price at x = 50, and find the residual if actual price is $20,400.',
      steps: [
        'Step 1: Read slope b1 = -180 dollars per thousand miles as an average predicted rate of change, then substitute x = 50 (not 50,000) into y-hat and compute residual = y - y-hat.',
        'Step 2: Predicted price at x = 50 is y-hat = 28,500 - 180(50) = 28,500 - 9,000 = $19,500. The residual is y - y-hat = 20,400 - 19,500 = +$900.',
        'Step 3: For each additional 1,000 miles driven, predicted used-car price decreases by $180 on average; the car with 50,000 miles sold for $900 more than the linear model predicts.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students calculate residuals as predicted minus actual (y-hat - y), which flips the sign of every residual.',
        repair: 'Memorize "Actual minus Predicted" (AP = y - y-hat): a positive residual means the actual observation lies above the regression line and a negative residual lies below it.',
      },
      {
        misconception: 'Students interpret a regression slope deterministically as an exact guaranteed change for every individual observation.',
        repair: 'Always include qualifying language such as "predicted" or "on average" in slope interpretations because least-squares lines model average trends, not exact outcomes for single cases.',
      },
    ],
  },

  'ap-stats-ch-05-section-03': {
    workedExample: {
      prompt: 'A linear regression of plant height on fertilizer dose (0 to 20 g) yields r = 0.80, r^2 = 0.64, and a distinct U-shaped residual plot. Interpret r^2 in context, assess linear fit, and critique predicting height at 50 g.',
      steps: [
        'Step 1: Interpret r^2 as the proportion of variability in y accounted for by the linear model, inspect the residual plot for systematic patterns, and check whether 50 g lies inside the 0-20 g data domain.',
        'Step 2: Here r^2 = 0.64 means 64% of the variation in plant height is explained by the linear relationship with fertilizer dose, yet the U-shaped residual plot violates the linearity condition.',
        'Step 3: A linear model is not appropriate despite r = 0.80; moreover, predicting at 50 g is risky extrapolation far beyond 20 g where excess fertilizer could stunt or harm plant growth.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students conclude a linear model fits well based solely on a high correlation r or r^2 without checking the residual plot.',
        repair: 'Always inspect the residual plot for curved patterns: strongly curved relationships can still produce high r values while systematically over- and under-predicting across x.',
      },
      {
        misconception: 'Students interpret r^2 = 0.64 as meaning 64% of the observed data points fall directly on the least-squares regression line.',
        repair: 'State r^2 as the percent of variation in the response variable y accounted for by the least-squares regression on x, never as a percentage of points lying on the line.',
      },
    ],
  },
};

module.exports = {
  ap_physics_1_foundation_pilot,
  ap_statistics_foundation_pilot,
};
