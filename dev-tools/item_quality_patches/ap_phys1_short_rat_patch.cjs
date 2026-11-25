'use strict';

module.exports = {
  ap_physics_1_foundation_pilot: {
    'ap-physics-1-u1-001': {
      rationale:
        'Displacement is the directed vector from start to finish rather than total path length; combining the perpendicular 3 m east and 4 m north legs via the Pythagorean theorem gives a 5 m vector directed northeast.',
    },
    'ap-physics-1-u1-003': {
      rationale:
        'Relative velocity follows vector addition across linked reference frames (v_PG = v_PT + v_TG), so adding the passenger\'s velocity relative to the train to the train\'s eastward velocity over the tracks yields the ground-frame motion.',
    },
    'ap-physics-1-u1-009': {
      rationale:
        'Average velocity equals displacement divided by elapsed time (v_avg = delta x / delta t); recording equal signed position changes across equal time intervals therefore supports an approximately constant one-dimensional velocity.',
    },
    'ap-physics-1-u1-010': {
      rationale:
        'With air resistance neglected, horizontal acceleration is zero and horizontal velocity stays constant at 12 m/s, so delta x = v_x * t = (12 m/s)(0.50 s) = 6.0 m during the fall.',
    },
    'ap-physics-1-u1-011': {
      rationale:
        'Because instantaneous velocity equals the slope of a position-versus-time graph (v = dx/dt), a horizontal velocity line at -4 m/s corresponds to a straight position-time line with a constant negative slope of -4 m/s.',
    },
    'ap-physics-1-u1-012': {
      rationale:
        'Starting from rest (v0 = 0) under constant acceleration, the kinematic position equation x = x0 + v0*t + (1/2)a*t^2 gives x = 1.0 m + 0.5(2.0 m/s^2)(3.0 s)^2 = 1.0 m + 9.0 m = 10.0 m.',
    },
    'ap-physics-1-u1-015': {
      rationale:
        'Repeating component measurements reduces random scatter, and stating uncertainty consistent with the millimeter ruler\'s resolution avoids reporting unsupported precision while preserving valid vector directions.',
    },
    'ap-physics-1-u1-016': {
      rationale:
        'On a velocity-versus-time graph, the sign of velocity indicates direction of motion; crossing the horizontal axis from positive to negative means the object reaches zero velocity instantaneously and reverses direction.',
    },
    'ap-physics-1-u1-017': {
      rationale:
        'Because projectile range depends on launch speed, initial height, and launch angle, testing the effect of angle requires holding launch speed and release height constant while varying only the launch angle.',
    },
    'ap-physics-1-u1-019': {
      rationale:
        'Average acceleration is defined as change in velocity divided by elapsed time, a_avg = (v_f - v_i) / delta t; substituting (17 m/s - 5 m/s) / 4 s = 12 m/s / 4 s yields 3 m/s^2.',
    },
    'ap-physics-1-u1-021': {
      rationale:
        'Vector addition combines components along each axis; two vectors of equal magnitude pointing in opposite directions have opposite signed components that sum to a zero vector with zero magnitude and no direction.',
    },
    'ap-physics-1-u2-024': {
      rationale:
        'When the upward normal force from the table matches the downward gravitational force on the book, the vertical net force is zero, and Newton\'s second law (a_y = F_net_y / m) implies zero vertical acceleration.',
    },
    'ap-physics-1-u2-030': {
      rationale:
        'Newton\'s second law relates acceleration to net force and mass via a = F_net / m, so isolating the effect of added mass requires holding the pulling force and track friction conditions constant across every trial.',
    },
    'ap-physics-1-u2-034': {
      rationale:
        'For an object sliding across a floor, kinetic friction magnitude obeys f_k = mu_k * F_N; multiplying the coefficient 0.30 by the 200 N normal force gives a 60 N friction force opposing motion.',
    },
    'ap-physics-1-u2-041': {
      rationale:
        'Uniform circular motion requires a radially inward centripetal force F_c = m*v^2 / r; substituting 0.50 kg, (4.0 m/s)^2 = 16 m^2/s^2, and radius 2.0 m gives (0.50)(16) / 2.0 = 4.0 N.',
    },
    'ap-physics-1-u2-042': {
      rationale:
        'Because drag opposes the velocity vector and scales with speed in this model, an object moving east experiences a westward drag force whose magnitude grows proportionally as eastward speed increases.',
    },
    'ap-physics-1-u3-044': {
      rationale:
        'Work done by a variable force equals the area under its force-versus-position graph; for an ideal spring obeying F = k*x, the triangular area from 0 to x equals (1/2)k*x^2, the work required to stretch it to x.',
    },
    'ap-physics-1-u3-046': {
      rationale:
        'Average power is the rate of work or energy transfer (P = W / delta t), so completing the same work W in half the elapsed time requires Machine A to deliver twice the power of Machine B.',
    },
    'ap-physics-1-u3-047': {
      rationale:
        'Elastic potential energy stored in an ideal spring is U_s = (1/2)k*x^2; because energy scales with the square of compression at fixed spring constant k, doubling the compression multiplies stored energy by four.',
    },
    'ap-physics-1-u3-048': {
      rationale:
        'Translational kinetic energy depends on mass and the square of speed via K = (1/2)m*v^2; substituting 4 kg and (5 m/s)^2 = 25 m^2/s^2 yields 0.5(4)(25) = 50 J.',
    },
    'ap-physics-1-u3-051': {
      rationale:
        'Average power measures energy transferred per unit time, P_avg = delta E / delta t; dividing the 1200 J transferred by the 4.0 s interval produces an average motor power of 300 W.',
    },
    'ap-physics-1-u3-059': {
      rationale:
        'Work equals the signed area under a force-versus-position curve; when the force lies below the horizontal axis over a positive displacement, the force opposes motion and does negative work across that span.',
    },
    'ap-physics-1-u3-060': {
      rationale:
        'With negligible air resistance, mechanical energy conservation sets m*g*h = (1/2)m*v^2 so mass cancels and v = sqrt(2*g*h); using g = 10 m/s^2 and h = 2 m gives sqrt(40) m/s, about 6.3 m/s.',
    },
    'ap-physics-1-u3-061': {
      rationale:
        'Efficiency is defined as useful energy output divided by total energy input; for a lifting motor, comparing lifts at different speeds requires measuring both the input energy and the gravitational potential-energy gain m*g*h.',
    },
    'ap-physics-1-u4-066': {
      rationale:
        'In a perfectly inelastic collision with no net external horizontal force, linear momentum is conserved: (2 kg)(4 m/s east) = (2 kg + 2 kg)v_f, so dividing 8 kg m/s by 4 kg gives 2 m/s east.',
    },
    'ap-physics-1-u4-073': {
      rationale:
        'Because momentum is p = m*v and net external force equals the slope delta p / delta t, a horizontal momentum-time line above zero for a constant-mass object shows constant positive velocity and zero net force.',
    },
    'ap-physics-1-u4-074': {
      rationale:
        'Conservation of linear momentum for the two-cart system equates initial momentum (0.10 kg)(5 m/s) = 0.50 kg m/s to the combined mass (0.50 kg) times v_f, giving a final speed of 1.0 m/s.',
    },
    'ap-physics-1-u4-078': {
      rationale:
        'Linear momentum is the product of mass and velocity (p = m*v) pointing in the same direction as velocity; dividing 12 kg m/s west by the 3 kg mass yields a velocity of 4 m/s west.',
    },
    'ap-physics-1-u5-082': {
      rationale:
        'Torque magnitude about a pivot is tau = r*F*sin(theta); because the 20 N force acts perpendicular to the 0.30 m wrench arm (sin 90 deg = 1), the resulting torque is (0.30 m)(20 N) = 6.0 N m.',
    },
    'ap-physics-1-u5-084': {
      rationale:
        'Rotational equilibrium requires zero angular acceleration (alpha = tau_net / I = 0), which holds only when the net torque about any chosen axis is zero in addition to vertical and horizontal force balance.',
    },
    'ap-physics-1-u5-085': {
      rationale:
        'For a rigid object rotating about a fixed axis, angular momentum equals rotational inertia times angular speed (L = I*omega); multiplying 0.50 kg m^2 by 4 rad/s gives 2.0 kg m^2/s.',
    },
    'ap-physics-1-u5-086': {
      rationale:
        'Average angular acceleration equals the change in angular velocity divided by elapsed time, alpha_avg = (omega_f - omega_i) / delta t; dividing (10 rad/s - 2 rad/s) = 8 rad/s by 4 s gives 2 rad/s^2.',
    },
    'ap-physics-1-u5-091': {
      rationale:
        'Instantaneous angular speed is the slope of an angular-position-versus-time graph (omega = dtheta/dt), so a constant slope indicates steady angular speed whereas a changing slope reveals nonzero angular acceleration.',
    },
    'ap-physics-1-u5-095': {
      rationale:
        'From the fixed-axis angular momentum relation L = I*omega, solving for angular speed gives omega = L / I; dividing 12 kg m^2/s by the 3 kg m^2 rotational inertia yields 4 rad/s.',
    },
    'ap-physics-1-u6-099': {
      rationale:
        'Rotational kinetic energy mirrors translational kinetic energy (1/2)m*v^2 by replacing mass with rotational inertia I and linear speed with angular speed omega, yielding K_rot = (1/2)I*omega^2.',
    },
    'ap-physics-1-u6-100': {
      rationale:
        'Rolling without slipping links translational center-of-mass speed and angular speed through v = r*omega; solving omega = v / r for 3 m/s and radius 0.50 m gives 3 / 0.50 = 6 rad/s.',
    },
    'ap-physics-1-u6-111': {
      rationale:
        'Under the no-slip rolling constraint v = r*omega, the wheel\'s angular speed is omega = v / r; dividing the 2.0 m/s translational speed by the 0.25 m radius yields 8.0 rad/s.',
    },
    'ap-physics-1-u7-114': {
      rationale:
        'Hooke\'s law (F_s = -k*x) models an ideal spring\'s restoring force as directed back toward the equilibrium position (the negative sign) with magnitude linearly proportional to displacement x.',
    },
    'ap-physics-1-u7-115': {
      rationale:
        'Frequency is the number of complete oscillation cycles per unit time (f = N / t); dividing 20 complete cycles by the 10 s interval gives 2 cycles per second, or 2 Hz.',
    },
    'ap-physics-1-u7-116': {
      rationale:
        'Velocity is the slope of the displacement-versus-time graph; at maximum positive displacement, the sinusoidal curve has a horizontal tangent (zero slope), meaning the oscillator starts with zero velocity.',
    },
    'ap-physics-1-u7-121': {
      rationale:
        'In an ideal oscillator, total mechanical energy is the sum of kinetic and elastic potential energy (E = K + U_s), so subtracting 3 J of potential energy from 8 J total leaves 5 J of kinetic energy.',
    },
    'ap-physics-1-u7-124': {
      rationale:
        'Angular frequency relates to oscillation period through omega = 2*pi / T; dividing 2*pi (about 6.28 rad) by the 0.40 s period gives an angular frequency of approximately 15.7 rad/s.',
    },
    'ap-physics-1-u7-125': {
      rationale:
        'Damping forces do negative nonconservative work that transfers mechanical energy out of the oscillator into thermal energy, evidenced by decreasing amplitude A and falling total energy (1/2)k*A^2 over successive cycles.',
    },
    'ap-physics-1-u7-127': {
      rationale:
        'Shifting a sinusoidal graph horizontally by one-quarter cycle changes the phase constant while keeping both amplitude and period (hence frequency f = 1/T) identical, so matching motion states occur at different times.',
    },
    'ap-physics-1-u7-130': {
      rationale:
        'Hooke\'s law predicts a linear force-versus-extension graph with constant slope k; systematic curvature across larger extensions shows that force is no longer proportional to stretch and the linear model fails.',
    },
    'ap-physics-1-u7-131': {
      rationale:
        'Period is the elapsed time required to complete one full oscillation cycle (T = t / N); dividing 6.0 s by 15 cycles gives a period of 0.40 s per cycle.',
    },
    'ap-physics-1-u8-135': {
      rationale:
        'For steady incompressible fluid flow, the continuity equation A1*v1 = A2*v2 conserves volume flow rate, so narrowing the cross-sectional area from 4A to A forces fluid speed to become four times as large.',
    },
    'ap-physics-1-u8-136': {
      rationale:
        'Gauge pressure measures pressure relative to ambient atmospheric pressure (P_gauge = P_abs - P_atm), so a sensor reading zero at the open surface of a tank is reporting gauge pressure rather than absolute pressure.',
    },
    'ap-physics-1-u8-139': {
      rationale:
        'Average mass density is defined as total mass divided by volume (rho = m / V); dividing 1.6 kg by 0.002 m^3 yields an average density of 800 kg/m^3.',
    },
    'ap-physics-1-u8-142': {
      rationale:
        'Volume flow rate equals cross-sectional area multiplied by fluid speed (Q = A*v); multiplying the 0.10 m^2 pipe area by the 2.0 m/s water speed gives 0.20 m^3/s.',
    },
    'ap-physics-1-u8-145': {
      rationale:
        'In Bernoulli\'s energy-per-unit-volume equation (P + (1/2)rho*v^2 + rho*g*y = constant), raising the fluid to a higher outlet increases y and therefore increases the gravitational potential energy per unit volume term rho*g*y.',
    },
    'ap-physics-1-u8-147': {
      rationale:
        'By Pascal\'s principle, pressure transmitted through an enclosed fluid is equal at both pistons (F1 / A1 = F2 / A2), so F2 = (50 N)(0.20 m^2 / 0.01 m^2) = 1000 N.',
    },
    'ap-physics-1-u8-148': {
      rationale:
        'Testing whether Bernoulli\'s equation accounts for the pressure drop requires evaluating all terms of P + (1/2)rho*v^2 + rho*g*y at both sections, so speed, height, density, and pressure must each be measured.',
    },
    'ap-physics-1-u4-150': {
      rationale:
        'By the impulse-momentum theorem (J = delta p), the signed area under a force-versus-time graph preserves vector direction; area entirely below the time axis indicates negative impulse and momentum change in that direction.',
    },
    'ap-physics-1-u1-163': {
      rationale:
        'Displacement over an interval is delta x = x - x0 = v0*t + (1/2)a*t^2 (independent of initial position x0 = 1.2 m); substituting (2.0 m/s)(2.0 s) + 0.5(3.0 m/s^2)(2.0 s)^2 gives 4 m + 6 m = 10 m.',
    },
    'ap-physics-1-u1-164': {
      rationale:
        'One-dimensional vector addition assigns opposite signs to opposite directions; taking east as positive yields +12 m + (-5 m) = +7 m, giving a net signed displacement of 7 m east.',
    },
    'ap-physics-1-u1-168': {
      rationale:
        'Relative motion obeys vector addition rather than simple scalar speed addition, so testing the claim requires measuring velocities relative to both the walkway and the floor across forward and reverse walking directions.',
    },
    'ap-physics-1-u2-171': {
      rationale:
        'Moving at constant speed along a straight incline means zero acceleration; by Newton\'s second law (F_net = m*a = 0), the net force parallel to the incline is zero, with upslope pull balancing downslope gravity and friction.',
    },
    'ap-physics-1-u2-172': {
      rationale:
        'By Newton\'s third law, the contact forces between the two blocks form an equal-and-opposite internal pair; when both blocks are treated as one combined system, internal forces cancel in the net external force sum.',
    },
    'ap-physics-1-u2-175': {
      rationale:
        'Newton\'s second law gives horizontal acceleration as a = F_net / m; subtracting 15 N of opposing kinetic friction from the 35 N pull yields a 20 N net force, and 20 N / 10 kg equals 2.0 m/s^2.',
    },
    'ap-physics-1-u2-177': {
      rationale:
        'Maintaining a 50 m circular turn at 10 m/s requires a radially inward net centripetal force F_c = m*v^2 / r; substituting 1000 kg, (10 m/s)^2 = 100 m^2/s^2, and 50 m gives 100,000 / 50 = 2000 N.',
    },
    'ap-physics-1-u2-178': {
      rationale:
        'Terminal speed occurs when vertical acceleration drops to zero; by Newton\'s second law (F_net_y = 0), the downward gravitational weight must exactly balance the 12 N upward drag force, giving 12 N downward.',
    },
    'ap-physics-1-u2-179': {
      rationale:
        'Only the horizontal component of the pull, F_x = 20*cos(60 deg) = 10 N, accelerates the sled along level ground; subtracting 5 N of friction gives F_net_x = 5 N, so a_x = 5 N / 4 kg = 1.25 m/s^2.',
    },
    'ap-physics-1-u2-184': {
      rationale:
        'At steady terminal speed, vertical acceleration is zero and F_net_y = 0 requires upward drag to equal downward weight for each object; comparing air resistance to weight directly tests why different masses share one terminal speed.',
    },
    'ap-physics-1-u2-185': {
      rationale:
        'Writing Newton\'s second law as F_applied = m*a + f_k shows that varying applied force and plotting force versus acceleration separates constant friction (vertical intercept) from effective inertial mass (the slope).',
    },
    'ap-physics-1-u2-187': {
      rationale:
        'Newton\'s third law dictates that colliding carts exert equal-magnitude, opposite-direction forces on each other throughout contact, even when different masses produce unequal accelerations via a = F / m.',
    },
    'ap-physics-1-u2-188': {
      rationale:
        'Free-body diagrams in inertial frames include only real interaction forces exerted by external agents; inertia is a mass property resisting acceleration, not a physical force arrow opposing motion.',
    },
    'ap-physics-1-u2-190': {
      rationale:
        'Upward curvature at higher speeds shows the drag-speed relationship transitions out of the linear regime (such as toward quadratic drag), so a single straight-line model cannot validly describe both speed ranges.',
    },
    'ap-physics-1-u2-191': {
      rationale:
        'By Newton\'s second law, acceleration is a = F_net / m = (6 N west) / (2 kg) = 3 m/s^2 west; multiplying by the 0.50 s interval gives delta v = a * delta t = 1.5 m/s west (equivalently J/m = 3.0 N s / 2 kg).',
    },
    'ap-physics-1-u3-193': {
      rationale:
        'Conservation of total energy allows energy to transform among internal stores without disappearing, so a decrease in stored chemical energy can simultaneously account for increases in both kinetic and thermal energy.',
    },
    'ap-physics-1-u3-195': {
      rationale:
        'Elastic potential energy obeys U_s = (1/2)k*x^2; because both springs undergo the same extension x, stored energy is directly proportional to k, so the stiffer spring with twice the spring constant stores twice the energy.',
    },
    'ap-physics-1-u3-197': {
      rationale:
        'By the work-energy theorem, net work equals change in kinetic energy, W_net = (1/2)m(v_f^2 - v_i^2); substituting 3 kg, 6^2 = 36, and 2^2 = 4 yields 0.5(3)(36 - 4) = 48 J.',
    },
    'ap-physics-1-u3-198': {
      rationale:
        'Average power is the rate at which a machine transfers energy, P_avg = delta E / delta t; dividing 2400 J of transferred energy by the 30 s operating time yields 80 W.',
    },
    'ap-physics-1-u3-200': {
      rationale:
        'With negligible air resistance, conservation of mechanical energy sets m*g*h = (1/2)m*v^2 so v = sqrt(2*g*h); using g = 9.8 m/s^2 and h = 5 m yields sqrt(98) m/s, approximately 9.9 m/s.',
    },
    'ap-physics-1-u3-201': {
      rationale:
        'Work equals the total area under the force-position graph: the rectangle from 0 to 4 m contributes (4 m)(6 N) = 24 J and the triangle from 4 to 6 m adds (1/2)(2 m)(6 N) = 6 J, totaling 30 J.',
    },
    'ap-physics-1-u3-202': {
      rationale:
        'Lifting equal masses through equal heights produces the same gravitational potential-energy gain delta U_g = m*g*h, while P_avg = delta E / delta t means completing that identical energy transfer in half the time doubles Pump A\'s power.',
    },
    'ap-physics-1-u3-206': {
      rationale:
        'Because net work equals the signed area under a force-position graph and W_net = delta K, equal positive and negative areas cancel to near-zero net energy change even while nonzero forces transfer energy on individual segments.',
    },
    'ap-physics-1-u3-207': {
      rationale:
        'Rearranging kinetic energy K = (1/2)m*v^2 gives v = sqrt(2*K / m); substituting K = 18 J and m = 4 kg yields sqrt(36 / 4) = sqrt(9) = 3.0 m/s.',
    },
    'ap-physics-1-u3-211': {
      rationale:
        'Because mechanical work depends on force magnitude, direction relative to displacement, and path, testing whether path geometry alters work requires keeping force magnitude and direction fixed across paths with matching endpoints.',
    },
    'ap-physics-1-u3-214': {
      rationale:
        'Lifting at constant velocity gives zero acceleration, so the crane\'s upward force equals weight m*g; instantaneous useful power P = F*v = m*g*v = (500 kg)(9.8 m/s^2)(0.40 m/s) = 1960 W.',
    },
    'ap-physics-1-u4-215': {
      rationale:
        'Newton\'s second law in momentum form states F_net = delta p / delta t, so the slope of a momentum-versus-time graph equals net external force; a horizontal segment has zero slope, indicating near-zero net external force.',
    },
    'ap-physics-1-u4-218': {
      rationale:
        'Center-of-mass velocity equals total system momentum divided by total mass (v_cm = p_total / m_total); taking east positive gives [(3)(4) + (1)(-2)] / (3 + 1) = 10 / 4 = 2.5 m/s east.',
    },
    'ap-physics-1-u4-219': {
      rationale:
        'Impulse equals change in momentum, J = m(v_f - v_i); taking east as positive yields (0.50 kg)(-4 m/s - 8 m/s) = -6 N s, which corresponds to an impulse of 6 N s west.',
    },
    'ap-physics-1-u4-221': {
      rationale:
        'Momentum is a signed vector, so reversing direction adds the magnitudes of velocity change: taking east positive gives delta p = (0.20 kg)(-3 m/s - 5 m/s) = -1.6 kg m/s, whose magnitude is 1.6 kg m/s.',
    },
    'ap-physics-1-u5-232': {
      rationale:
        'Static vertical equilibrium (F_net_y = 0) requires total upward support equal to the 20 N beam weight plus 10 N central load, or 30 N, and torque symmetry about the center splits that load equally to 15 N per support.',
    },
    'ap-physics-1-u5-234': {
      rationale:
        'Because torque equals perpendicular lever arm times force (tau = r_perp * F), measuring the perpendicular distance from the pivot to the force\'s line of action in every run prevents systematic angle-projection errors.',
    },
    'ap-physics-1-u5-238': {
      rationale:
        'Rotational inertia I = sum(m_i * r_i^2) weights every mass element by the square of its distance from the rotation axis, so placing more of the same total mass near the rim produces a larger rotational inertia.',
    },
    'ap-physics-1-u7-247': {
      rationale:
        'Frequency is cycles per second, f = N / t = 15 / 6.0 s = 2.5 Hz, and period is its reciprocal time per cycle, T = 1 / f = 6.0 s / 15 = 0.40 s.',
    },
    'ap-physics-1-u7-248': {
      rationale:
        'At maximum displacement (v = 0), all mechanical energy of an ideal horizontal mass-spring oscillator is elastic potential energy: E = (1/2)k*A^2 = 0.5(200 N/m)(0.10 m)^2 = 1.0 J.',
    },
    'ap-physics-1-u8-251': {
      rationale:
        'In steady incompressible pipe flow, continuity (A1*v1 = A2*v2) keeps volume flow rate constant, so cutting the cross-sectional area to A/4 requires fluid speed to quadruple to 4*v1.',
    },
    'ap-physics-1-u8-253': {
      rationale:
        'Archimedes\' principle sets upward buoyant force equal to the weight of displaced fluid, F_b = rho_fluid * g * V_disp; substituting (1000 kg/m^3)(9.8 m/s^2)(0.020 m^3) yields 196 N upward.',
    },
    'ap-physics-1-u1-267': {
      rationale:
        'Resolving a vector into orthogonal components places the east component adjacent to the 37 deg angle above east, so F_east = F*cos(37 deg) = (20 N)(0.80) = 16 N east.',
    },
    'ap-physics-1-u1-268': {
      rationale:
        'Average acceleration requires signed velocities, a_avg = (v_f - v_i) / delta t; taking east positive gives (-4 m/s - 4 m/s) / 2.0 s = -4.0 m/s^2, which is 4.0 m/s^2 directed west.',
    },
    'ap-physics-1-u2-275': {
      rationale:
        'Although orbital speed stays constant, velocity is a vector whose direction turns continuously; gravity supplies the inward centripetal net force producing inward acceleration perpendicular to velocity.',
    },
    'ap-physics-1-u2-277': {
      rationale:
        'Newton\'s second law (F_net = m*a) is linear in acceleration with slope m, so when net force is plotted on the vertical axis against acceleration on the horizontal axis, the slope equals the system\'s inertial mass.',
    },
    'ap-physics-1-u2-278': {
      rationale:
        'Applying Newton\'s second law (a = F_net / m) to the 6 kg cart under a 15 N northward net force yields an acceleration magnitude of 15 N / 6 kg = 2.5 m/s^2.',
    },
    'ap-physics-1-u2-280': {
      rationale:
        'Near Earth\'s surface, gravitational potential-energy change is delta U_g = m*g*delta h; lowering the 2 kg object from 5 m to 2 m gives delta h = -3 m, so delta U_g = (2 kg)(9.8 m/s^2)(-3 m) = -58.8 J.',
    },
    'ap-physics-1-u2-282': {
      rationale:
        'At terminal speed the falling object has zero vertical acceleration, so Newton\'s second law (F_net_y = 0) requires the upward drag force to exactly balance the 4.9 N downward weight, giving 4.9 N upward.',
    },
    'ap-physics-1-u2-284': {
      rationale:
        'Rearranging Newton\'s second law as a = F*(1/m) shows that for a fixed applied force F, acceleration is directly proportional to inverse mass, making an acceleration-versus-1/mass graph linear with slope F.',
    },
    'ap-physics-1-u2-285': {
      rationale:
        'Because f_k = mu_k * F_N predicts a constant ratio across loads for a given surface pair, a single trial cannot test repeatability or confirm whether mu_k remains constant across different normal forces and surfaces.',
    },
    'ap-physics-1-u2-288': {
      rationale:
        'Whether a force is internal or external depends strictly on the chosen system boundary; enclosing both connected carts places the string inside the system, so equal-opposite tension forces cancel internally.',
    },
    'ap-physics-1-u2-290': {
      rationale:
        'Newton\'s third law predicts equal-magnitude opposite forces between interacting objects, so small measured differences between two real sensors point to calibration offset, finite uncertainty, or timing mismatch.',
    },
    'ap-physics-1-u3-298': {
      rationale:
        'Efficiency equals useful energy output divided by total energy input expressed as a percentage; dividing 350 J of useful mechanical output by 500 J of electrical input gives 0.70, or 70 percent.',
    },
    'ap-physics-1-u3-303': {
      rationale:
        'The work performed by a force equals the area under its force-versus-position graph; for a positive triangle with 6 m base and 10 N peak height, W = (1/2)(6 m)(10 N) = 30 J.',
    },
    'ap-physics-1-u3-306': {
      rationale:
        'By conservation of energy (P_in = P_useful + P_dissipated), rising heat or sound losses while input power and the useful task remain comparable directly explain why wear reduces useful output power and efficiency.',
    },
    'ap-physics-1-u3-310': {
      rationale:
        'Because the motors operate for different durations, normalizing useful work by elapsed time (useful power P = W / delta t) alongside input power provides a fair comparison of both transfer rate and efficiency.',
    },
    'ap-physics-1-u3-311': {
      rationale:
        'Work is a signed quantity (W = F*delta x*cos(theta)) that is negative when force opposes displacement and positive when aligned, so net work over a multi-segment path requires summing signed segment contributions.',
    },
    'ap-physics-1-u3-312': {
      rationale:
        'Total energy is conserved in an isolated system, but mechanical energy (K + U) is conserved only when nonconservative forces do zero net work; friction converts mechanical energy into thermal energy.',
    },
    'ap-physics-1-u4-315': {
      rationale:
        'Linear momentum p = m*v is a vector quantity whose direction matters during collisions; because one cart reverses after impact, the momentum conservation equation must use signed velocities along one fixed axis.',
    },
    'ap-physics-1-u4-317': {
      rationale:
        'The impulse-momentum theorem states J = delta p = m(v_f - v_i); starting from rest (v_i = 0) with a 3.0 N s eastward impulse on a 0.25 kg ball gives v_f = 3.0 / 0.25 = 12 m/s east.',
    },
    'ap-physics-1-u4-318': {
      rationale:
        'Conserving signed linear momentum with east positive gives initial momentum (2 kg)(5 m/s) + (3 kg)(-1 m/s) = 7 kg m/s east; dividing by the combined 5 kg mass gives 1.4 m/s east.',
    },
    'ap-physics-1-u4-319': {
      rationale:
        'By the impulse-momentum theorem (J = m*delta v), taking east as positive yields a signed velocity change of (-2 m/s - 6 m/s) = -8 m/s; multiplying by 0.10 kg gives -0.80 N s, or 0.80 N s west.',
    },
    'ap-physics-1-u4-321': {
      rationale:
        'Impulse equals the area under the collision force-versus-time curve (J = F_avg * delta t); beginning data collection after contact starts cuts off part of that area and directly underestimates total impulse.',
    },
    'ap-physics-1-u5-326': {
      rationale:
        'Rotational dynamics obeys alpha = tau_net / I, where net torque tau_net is the signed sum of clockwise and counterclockwise torques; opposite-sense torques at equal lever arms rotate the beam only if their signed sum is nonzero.',
    },
    'ap-physics-1-u5-332': {
      rationale:
        'Translational equilibrium in the vertical direction requires zero net vertical force (F_net_y = 0), so the combined upward support force must balance both the 12 N central load and 16 N beam weight, totaling 28 N.',
    },
    'ap-physics-1-u5-335': {
      rationale:
        'Angular momentum changes according to delta L = tau_ext_avg * delta t; measuring external floor or air friction torques during the pull and comparing their angular impulse against the observed momentum deficit tests that explanation.',
    },
    'ap-physics-1-u6-338': {
      rationale:
        'Rolling without slipping requires the contact point to remain instantaneously at rest relative to the surface, enforcing v = r*omega; once the wheel begins to slide, translational and angular speeds decouple and v = r*omega fails.',
    },
    'ap-physics-1-u7-348': {
      rationale:
        'Because period T is the time per complete cycle, the total cycle count over an elapsed interval is N = t / T; dividing the 5.0 s recording by the 0.25 s period gives 20 complete cycles.',
    },
    'ap-physics-1-u7-350': {
      rationale:
        'Adding a constant offset shifts every recorded displacement reading equally, altering equilibrium and absolute extrema, but leaves the elapsed time between repeating equivalent phase points (the period T) unaffected.',
    },
    'ap-physics-1-u8-353': {
      rationale:
        'Since mass relates to volume through m = rho*V for a homogeneous substance, a linear mass-versus-volume graph passing through the origin has slope delta m / delta V equal to the fluid\'s density rho.',
    },
    'ap-physics-1-u8-358': {
      rationale:
        'Constant volume flow rate obeys the continuity equation A1*v1 = A2*v2; solving v2 = (A1 / A2)v1 gives (0.040 m^2 / 0.010 m^2)(2 m/s) = 4(2 m/s) = 8 m/s.',
    },
    'ap-physics-1-u8-359': {
      rationale:
        'Hydrostatic pressure follows P = P0 + rho*g*h, where a nonzero intercept represents an atmospheric or sensor-zero offset while the slope rho*g still reflects fluid density; zeroing at the surface separates the two.',
    },
    'ap-physics-1-u8-360': {
      rationale:
        'For a floating object in vertical equilibrium (F_net_y = 0), upward buoyant force F_b = rho_fluid * V_sub * g must match total downward weight; adding a load makes it sink deeper until the larger displaced volume restores F_b = W.',
    },
    'ap-physics-1-u1-363': {
      rationale:
        'Points below the time axis represent negative velocity, while the constant negative slope of a velocity-time line equals constant negative acceleration, meaning velocity becomes increasingly negative over time.',
    },
    'ap-physics-1-u1-366': {
      rationale:
        'Because westward and southward displacements are mutually perpendicular, vector magnitude follows the Pythagorean theorem: sqrt((9 m)^2 + (12 m)^2) = sqrt(81 + 144) m = sqrt(225) m = 15 m.',
    },
    'ap-physics-1-u1-368': {
      rationale:
        'Starting from vertical rest (v0_y = 0) under uniform free-fall acceleration g = 10 m/s^2, the time-independent kinematic equation v_y^2 = 2*g*delta y gives v_y = sqrt(2 * 10 * 20) = sqrt(400) = 20 m/s downward.',
    },
    'ap-physics-1-u1-369': {
      rationale:
        'Because velocity evolves via v = v0 + a*t, agreement early followed by systematic overprediction after 5 s points to an overestimated or time-varying acceleration (such as growing friction or drag) in the late interval.',
    },
    'ap-physics-1-u1-371': {
      rationale:
        'A motion sensor angled relative to the track records only a projected distance component rather than true along-track position, so comparing against an independent trackside position-time record exposes systematic projection error.',
    },
    'ap-physics-1-u2-374': {
      rationale:
        'Moving up a straight incline at constant speed means constant velocity and zero acceleration; by Newton\'s second law (F_net = m*a = 0), the net force component parallel to the incline must be zero.',
    },
    'ap-physics-1-u2-375': {
      rationale:
        'Circular motion always requires centripetal acceleration a_c = v^2 / r directed radially toward the center of the circle; at the top of a vertical loop, toward the center points straight downward.',
    },
    'ap-physics-1-u2-379': {
      rationale:
        'Local gravitational field strength is defined as gravitational force per unit mass (g = F_g / m); dividing the 24 N gravitational force by the 3 kg mass gives 8 N/kg.',
    },
    'ap-physics-1-u2-380': {
      rationale:
        'By Newton\'s second law, net horizontal force is F_net = m*a = (6 kg)(3 m/s^2) = 18 N; because friction opposes the 24 N applied pull, the friction magnitude is 24 N - 18 N = 6 N.',
    },
    'ap-physics-1-u2-381': {
      rationale:
        'Rearranging the centripetal force relation F_c = m*v^2 / r gives v = sqrt(F_c * r / m); substituting 4500 N, 50 m, and 900 kg yields sqrt(225,000 / 900) = sqrt(250), about 15.8 m/s.',
    },
    'ap-physics-1-u2-382': {
      rationale:
        'Summing collinear vertical forces with downward positive gives F_net_y = 30 N - 18 N = 12 N; because downward weight exceeds upward drag, the net force is 12 N downward.',
    },
    'ap-physics-1-u2-388': {
      rationale:
        'In F_c = m*v^2 / r, isolating the speed-squared dependence requires holding mass and radius constant while sweeping speed, and repeating at a second fixed radius confirms the model across geometries.',
    },
    'ap-physics-1-u3-393': {
      rationale:
        'Gravity is a conservative force whose work W_g = -m*g*delta y depends solely on vertical displacement between endpoints, so any two paths sharing the same starting and ending heights produce identical gravitational potential-energy changes.',
    },
    'ap-physics-1-u3-398': {
      rationale:
        'Instantaneous power transferred by a force is the dot product P = F*v*cos(theta); when theta = 90 deg, cos(90 deg) = 0, so the perpendicular force delivers zero power and causes no immediate change in kinetic energy.',
    },
    'ap-physics-1-u3-400': {
      rationale:
        'By the work-energy theorem, net work equals change in kinetic energy: W_net = (1/2)m(v_f^2 - v_i^2) = 0.5(2 kg)(7^2 - 3^2) m^2/s^2 = 1(49 - 9) = 40 J.',
    },
    'ap-physics-1-u3-411': {
      rationale:
        'A constant force aligned with displacement performs work W = F*delta x = (50 N)(4 m) = 200 J, and dividing that energy transfer by the 2 s duration gives average power P_avg = W / delta t = 200 J / 2 s = 100 W.',
    },
    'ap-physics-1-u4-414': {
      rationale:
        'By the impulse-momentum theorem (J = delta p), the signed area under a force-versus-time graph equals impulse; a triangular pulse entirely above the time axis therefore represents positive net impulse.',
    },
    'ap-physics-1-u4-416': {
      rationale:
        'Because force, velocity, momentum, and impulse are directional vectors, establishing one fixed positive axis and keeping all velocity and force values signed throughout the collision prevents directional sign errors.',
    },
    'ap-physics-1-u4-421': {
      rationale:
        'Using east as the positive axis, momentum change is delta p = m(v_f - v_i) = (0.20 kg)(-4 m/s - 10 m/s) = (0.20)(-14) = -2.8 kg m/s, which equals 2.8 kg m/s directed west.',
    },
    'ap-physics-1-u4-422': {
      rationale:
        'The impulse-momentum theorem relates impulse magnitude to velocity change via |J| = m*|delta v|; dividing the 2400 N s net impulse by the 1200 kg car mass gives |delta v| = 2.0 m/s.',
    },
    'ap-physics-1-u5-432': {
      rationale:
        'Setting net torque to zero about the near end balances the clockwise torque of the central load, (10 N)(1 m) = 10 N m, with the far-end upward torque F(2 m), yielding F = 10 / 2 = 5 N upward.',
    },
    'ap-physics-1-u5-433': {
      rationale:
        'For rotation about a fixed axis, angular momentum satisfies L = I*omega; solving omega = L / I by dividing 6 kg m^2/s by the 2 kg m^2 rotational inertia yields an angular speed of 3 rad/s.',
    },
    'ap-physics-1-u5-434': {
      rationale:
        'Rotational kinetic energy is defined as K_rot = (1/2)I*omega^2; substituting rotational inertia 0.50 kg m^2 and angular speed 4 rad/s gives 0.5(0.50)(16) = 4 J.',
    },
    'ap-physics-1-u5-435': {
      rationale:
        'Because torque tau = r_perp * F depends on applied force, angle, and lever arm, cleanly testing proportionality to lever arm requires holding force magnitude and angle fixed while varying only the perpendicular lever arm.',
    },
    'ap-physics-1-u6-442': {
      rationale:
        'Applying the rotational kinetic energy formula K_rot = (1/2)I*omega^2 with rotational inertia 4 kg m^2 and angular speed 3 rad/s gives 0.5(4)(9) = 18 J.',
    },
    'ap-physics-1-u6-443': {
      rationale:
        'For a point mass moving perpendicular to the radius vector in a circle, angular momentum magnitude about the center is L = r_perp * p = m*r*v; multiplying (0.25 kg)(0.80 m)(5 m/s) yields 1.0 kg m^2/s.',
    },
    'ap-physics-1-u7-448': {
      rationale:
        'Frequency equals cycles divided by elapsed time, f = 12 / 6 s = 2 Hz, and period equals elapsed time per cycle (the reciprocal of frequency), T = 1 / f = 6 s / 12 = 0.50 s.',
    },
    'ap-physics-1-u7-449': {
      rationale:
        'An ideal mass-spring simple harmonic oscillator has angular frequency omega = sqrt(k / m); substituting k = 2.0 N/m and m = 0.50 kg gives sqrt(2.0 / 0.50) = sqrt(4) = 2 rad/s.',
    },
    'ap-physics-1-u1-461': {
      rationale:
        'Displacement adds individual legs as vectors from start to finish: the 18 m eastward and 18 m westward horizontal legs cancel (+18 m - 18 m = 0), leaving a net displacement of 24 m north.',
    },
    'ap-physics-1-u1-462': {
      rationale:
        'Under constant acceleration, final velocity obeys v = v0 + a*t; choosing east as positive gives v = 2 m/s + (-3 m/s^2)(4 s) = 2 - 12 = -10 m/s, which is 10 m/s west.',
    },
    'ap-physics-1-u2-467': {
      rationale:
        'Newton\'s second law sets acceleration equal to net force divided by mass: subtracting 10 N of opposing friction from the 30 N pull yields 20 N in the pull direction, and 20 N / 5 kg = 4 m/s^2 in the pull direction.',
    },
    'ap-physics-1-u3-475': {
      rationale:
        'Total input energy equals input power times time, E_in = (1000 W)(20 s) = 20 kJ; efficiency is useful output divided by input, 12 kJ / 20 kJ = 0.60, or 60 percent.',
    },
    'ap-physics-1-u5-482': {
      rationale:
        'Rolling without slipping satisfies v = r*omega at the tire-road interface, so angular speed is omega = v / r; dividing 12 m/s by the 0.60 m tire radius yields 20 rad/s.',
    },
    'ap-physics-1-u5-484': {
      rationale:
        'With negligible external torque, angular momentum L = I*omega stays conserved at 12 kg m^2/s; halving rotational inertia to 2 kg m^2 doubles angular speed to omega = L / I = 12 / 2 = 6 rad/s.',
    },
    'ap-physics-1-u6-487': {
      rationale:
        'For a rotating wheel, rotational kinetic energy obeys K_rot = (1/2)I*omega^2; substituting I = 2 kg m^2 and omega = 6 rad/s gives 0.5(2)(36) = 36 J.',
    },
    'ap-physics-1-u7-495': {
      rationale:
        'Discarding an anomalous measurement without investigation biases data analysis; replicating the heaviest-mass runs and checking support motion or timing error determines whether the outlier reflects experimental error or real physics.',
    },
    'ap-physics-1-u8-496': {
      rationale:
        'For a floating block in static equilibrium, upward buoyant force balances weight (rho_fluid * V_sub * g = rho_block * V_total * g), so the density ratio rho_block / rho_fluid equals the submerged volume fraction 0.30, or 30 percent.',
    },
  },
};
