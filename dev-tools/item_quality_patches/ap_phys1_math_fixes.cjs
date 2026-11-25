'use strict';

module.exports = {
  "ap_physics_1_foundation_pilot": {
    "ap-physics-1-u1-001": {
      "rationale": "Displacement is the directed vector from start to finish rather than total path length; combining the perpendicular 3 m east and 4 m north legs via the Pythagorean theorem gives a 5 m vector directed northeast.",
      "choiceRationales": [
        "Displacement is the directed change in position; the perpendicular components give a 3-4-5 right triangle.",
        "This choice is not supported because it subtracts the perpendicular legs (4 m minus 3 m = 1 m) and assigns a direction to a scalar distance instead of finding the 5 m hypotenuse.",
        "This choice is not supported because it adds perpendicular components as though they were parallel distances under the stated conditions and measurement model.",
        "This choice is not supported because it uses a scalar rate quantity as though it had direction under the stated conditions and measurement model."
      ]
    },
    "ap-physics-1-u1-004": {
      "rationale": "Using the constant-velocity position equation x(t) = x0 + v*t with x0 = 2.0 m and v = 3.0 m/s, substituting t = 4.0 s gives x = 2.0 + 3.0(4.0) = 2.0 + 12.0 = 14.0 m.",
      "choiceRationales": [
        "This choice is not supported because it adds the initial position and speed (2.0 + 3.0 = 5.0 m) as if t = 1.0 s rather than multiplying 3.0 m/s by the full 4.0 s interval.",
        "This choice is not supported because it reports only the displacement instead of final position under the stated conditions and measurement model.",
        "This choice is not supported because it multiplies all three values together (2.0 times 3.0 times 4.0 = 24.0 m) instead of adding the constant 2.0 m initial position to the 12.0 m displacement.",
        "Using the constant-velocity position equation x(t) = x0 + v*t with x0 = 2.0 m and v = 3.0 m/s, substituting t = 4.0 s gives x = 2.0 + 3.0(4.0) = 2.0 + 12.0 = 14.0 m."
      ]
    },
    "ap-physics-1-u1-010": {
      "rationale": "With air resistance neglected, horizontal acceleration is zero and horizontal velocity stays constant at 12 m/s, so delta x = v_x * t = (12 m/s)(0.50 s) = 6.0 m during the fall.",
      "choiceRationales": [
        "This choice is not supported because it divides speed by time and shifts the decimal two places (12 / 50 = 0.24 m) instead of multiplying constant horizontal speed 12 m/s by 0.50 s.",
        "Horizontal velocity remains 12 m/s, so horizontal displacement equals 12 m/s times 0.50 s.",
        "This choice is not supported because it adds horizontal velocity and fall time (12 + 0.50 = 12.5) despite incompatible units instead of multiplying v_x by delta t.",
        "This choice is not supported because it divides horizontal velocity by time (12 / 0.50 = 24 m), quadrupling the correct displacement rather than computing v_x times t = 6.0 m."
      ]
    },
    "ap-physics-1-u1-012": {
      "rationale": "Starting from rest (v0 = 0) under constant acceleration, the kinematic position equation x = x0 + v0*t + (1/2)a*t^2 gives x = 1.0 m + 0.5(2.0 m/s^2)(3.0 s)^2 = 1.0 m + 9.0 m = 10.0 m.",
      "choiceRationales": [
        "This choice is not supported because it uses time rather than time squared in the constant-acceleration displacement term under the stated conditions and measurement model.",
        "This choice is not supported because it computes a*t = (2.0 m/s^2)(3.0 s) = 6.0 (the final speed magnitude) instead of evaluating x = x0 + (1/2)a*t^2 = 1.0 m + 9.0 m = 10.0 m.",
        "This choice is not supported because it uses the full acceleration-times-time-squared term instead of one-half under the stated conditions and measurement model.",
        "Using x = x0 + one-half at squared gives 1.0 m plus 0.5 times 2.0 times 9.0, or 10.0 m."
      ]
    },
    "ap-physics-1-u1-019": {
      "rationale": "Average acceleration is defined as change in velocity divided by elapsed time, a_avg = (v_f - v_i) / delta t; substituting (17 m/s - 5 m/s) / 4 s = 12 m/s / 4 s yields 3 m/s^2.",
      "choiceRationales": [
        "This choice is not supported because it inverts the time and velocity-change relationship under the stated conditions and measurement model.",
        "This choice is not supported because it overestimates average acceleration (even dividing final velocity 17 m/s by 4 s gives 4.25 m/s^2) instead of computing (17 - 5) / 4 = 3 m/s^2.",
        "Average acceleration is the velocity change of 12 m/s divided by 4 s, giving 3 m/s2.",
        "This choice is not supported because it adds velocities instead of finding their change under the stated conditions and measurement model."
      ]
    },
    "ap-physics-1-u2-038": {
      "rationale": "First combine opposing horizontal forces to find F_net = 15 N east - 5 N west = 10 N east. Applying Newton's second law a = F_net / m gives 10 N / 5 kg = 2 m/s2 east.",
      "choiceRationales": [
        "This choice is not supported because it adds the opposing forces (15 N + 5 N = 20 N) before dividing by 5 kg to get 4 m/s^2 east instead of subtracting them for F_net = 10 N east.",
        "First combine opposing horizontal forces to find F_net = 15 N east - 5 N west = 10 N east. Applying Newton's second law a = F_net / m gives 10 N / 5 kg = 2 m/s2 east.",
        "This choice is not supported because it assigns acceleration opposite the net-force direction under the stated conditions and measurement model.",
        "This choice is not supported because it adds force magnitudes instead of finding the net force under the stated conditions and measurement model."
      ]
    },
    "ap-physics-1-u2-041": {
      "rationale": "Uniform circular motion requires a radially inward centripetal force F_c = m*v^2 / r; substituting 0.50 kg, (4.0 m/s)^2 = 16 m^2/s^2, and radius 2.0 m gives (0.50)(16) / 2.0 = 4.0 N.",
      "choiceRationales": [
        "Centripetal force is mv squared divided by r, giving 0.50 times 16 divided by 2.0, or 4.0 N.",
        "This choice is not supported because it omits the square on speed and computes m*v / r = (0.50)(4.0) / 2.0 = 1.0 N instead of squaring speed in F_c = m*v^2 / r = 4.0 N.",
        "This choice is not supported because it computes only momentum magnitude m*v = (0.50)(4.0) = 2.0 without squaring speed or dividing by the 2.0 m radius.",
        "This choice is not supported because it multiplies by the radius rather than dividing (m*v^2*r = 0.50 times 16 times 2.0 = 16 N), quadrupling the required 4.0 N inward force."
      ]
    },
    "ap-physics-1-u3-045": {
      "rationale": "Net work equals the change in kinetic energy: one-half times 2 kg times the difference between 7 squared and 3 squared, giving 40 J.",
      "choiceRationales": [
        "Net work equals the change in kinetic energy: one-half times 2 kg times the difference between 7 squared and 3 squared, giving 40 J.",
        "This choice is not supported because it sums the initial and final speeds (3 + 7 = 10) instead of computing the change in kinetic energy (1/2)m(v_f^2 - v_i^2) = 40 J.",
        "This choice is not supported because it takes only half of the true kinetic-energy change instead of applying W_net = (1/2)(2 kg)(49 - 9) m^2/s^2 = 40 J.",
        "This choice is not supported because it computes m*v_f^2 = (2 kg)(7 m/s)^2 = 98 J, both omitting the one-half factor and failing to subtract the initial 9 J kinetic energy."
      ]
    },
    "ap-physics-1-u3-048": {
      "rationale": "Translational kinetic energy depends on mass and the square of speed via K = (1/2)m*v^2; substituting 4 kg and (5 m/s)^2 = 25 m^2/s^2 yields 0.5(4)(25) = 50 J.",
      "choiceRationales": [
        "This choice is not supported because it computes momentum magnitude m*v = (4 kg)(5 m/s) = 20 without squaring speed or applying the one-half factor in K = (1/2)m*v^2.",
        "This choice is not supported because it evaluates only speed squared (5^2 = 25) without multiplying by one-half the 4 kg mass to get K = 0.5(4)(25) = 50 J.",
        "This choice is not supported because it doubles the correct value without a change in mass or speed under the stated conditions and measurement model.",
        "Kinetic energy is one-half mv squared, so one-half times 4 times 25 equals 50 J."
      ]
    },
    "ap-physics-1-u3-051": {
      "rationale": "Average power measures energy transferred per unit time, P_avg = delta E / delta t; dividing the 1200 J transferred by the 4.0 s interval produces an average motor power of 300 W.",
      "choiceRationales": [
        "This choice is not supported because it moves the decimal by dividing energy by an extra factor of ten under the stated conditions and measurement model.",
        "This choice is not supported because it multiplies energy and time with a misplaced decimal (1200 times 4.0 = 4800, not 480) instead of dividing 1200 J by 4.0 s for 300 W.",
        "Average power equals energy transferred divided by time, or 1200 J divided by 4.0 s, giving 300 W.",
        "This choice is not supported because it adds the time to energy instead of using joules per second under the stated conditions and measurement model."
      ]
    },
    "ap-physics-1-u3-054": {
      "rationale": "Mechanical work done by a constant force at angle theta to displacement is W = F*d*cos(theta). Substituting F = 10 N, d = 5 m, and cos(60 deg) = 0.5 gives W = 10(5)(0.5) = 25 J.",
      "choiceRationales": [
        "This choice is not supported because it omits the angle factor and treats the force as parallel under the stated conditions and measurement model.",
        "Mechanical work done by a constant force at angle theta to displacement is W = F*d*cos(theta). Substituting F = 10 N, d = 5 m, and cos(60 deg) = 0.5 gives W = 10(5)(0.5) = 25 J.",
        "This choice is not supported because it finds only the parallel force component F*cos(60 deg) = 10(0.5) = 5 N without multiplying by the 5 m displacement.",
        "This choice is not supported because it uses a cosine factor larger than one and doubles the parallel result under the stated conditions and measurement model."
      ]
    },
    "ap-physics-1-u3-057": {
      "rationale": "Elastic potential energy stored in an ideal Hookean spring is U_s = (1/2)k*x^2. With k = 200 N/m and compression x = 0.10 m, U_s = 0.5(200)(0.10)^2 = 100(0.01) = 1.0 J.",
      "choiceRationales": [
        "Elastic potential energy stored in an ideal Hookean spring is U_s = (1/2)k*x^2. With k = 200 N/m and compression x = 0.10 m, U_s = 0.5(200)(0.10)^2 = 100(0.01) = 1.0 J.",
        "This choice is not supported because it reports the 0.10 m compression value directly as energy instead of evaluating U_s = (1/2)k*x^2 = 0.5(200)(0.01) = 1.0 J.",
        "This choice is not supported because it omits the one-half factor in the energy formula under the stated conditions and measurement model.",
        "This choice is not supported because it computes spring force magnitude k*x = (200 N/m)(0.10 m) = 20 N instead of elastic potential energy (1/2)k*x^2 = 1.0 J."
      ]
    },
    "ap-physics-1-u3-060": {
      "rationale": "With negligible air resistance, mechanical energy conservation sets m*g*h = (1/2)m*v^2 so mass cancels and v = sqrt(2*g*h); using g = 10 m/s^2 and h = 2 m gives sqrt(40) m/s, about 6.3 m/s.",
      "choiceRationales": [
        "This choice is not supported because it uses g as the final speed without applying the height relationship under the stated conditions and measurement model.",
        "This choice is not supported because it computes g*h = (10 m/s^2)(2 m) = 20 without the factor of two or the square root required by v = sqrt(2*g*h).",
        "This choice is not supported because it computes gravitational potential energy m*g*h = (3 kg)(10 m/s^2)(2 m) = 60 J instead of solving (1/2)m*v^2 = m*g*h for speed.",
        "Energy conservation gives mgh equal to one-half mv squared, so v equals square root of 40, about 6.3 m/s."
      ]
    },
    "ap-physics-1-u4-064": {
      "rationale": "Linear momentum is the vector product of mass and velocity, p = m*v, pointing in the direction of motion. Multiplying m = 0.50 kg by v = 6 m/s east yields p = 3.0 kg m/s east.",
      "choiceRationales": [
        "This choice is not supported because it divides mass by velocity instead of multiplying under the stated conditions and measurement model.",
        "This choice is not supported because it adds mass and velocity despite their different units under the stated conditions and measurement model.",
        "This choice is not supported because it divides velocity by mass (6 / 0.50 = 12) instead of multiplying mass by velocity to obtain p = (0.50 kg)(6 m/s east) = 3.0 kg m/s east.",
        "Linear momentum is the vector product of mass and velocity, p = m*v, pointing in the direction of motion. Multiplying m = 0.50 kg by v = 6 m/s east yields p = 3.0 kg m/s east."
      ]
    },
    "ap-physics-1-u4-066": {
      "rationale": "In a perfectly inelastic collision with no net external horizontal force, linear momentum is conserved: (2 kg)(4 m/s east) = (2 kg + 2 kg)v_f, so dividing 8 kg m/s by 4 kg gives 2 m/s east.",
      "choiceRationales": [
        "This choice is not supported because it divides the initial 4 m/s speed by the 4 kg combined mass without multiplying by the 2 kg moving cart mass to preserve 8 kg m/s momentum.",
        "Momentum conservation gives 2 times 4 equals 4 times final speed, so final speed is 2 m/s east.",
        "This choice is not supported because it ignores the increase in combined mass after sticking under the stated conditions and measurement model.",
        "This choice is not supported because it doubles the initial moving-cart speed without conserving momentum under the stated conditions and measurement model."
      ]
    },
    "ap-physics-1-u4-069": {
      "rationale": "Impulse delivered by an average force over a contact interval is J = F_avg * delta t, independent of the ball's mass. Multiplying 30 N by 0.10 s produces J = 3.0 N s.",
      "choiceRationales": [
        "Impulse delivered by an average force over a contact interval is J = F_avg * delta t, independent of the ball's mass. Multiplying 30 N by 0.10 s produces J = 3.0 N s.",
        "This choice is not supported because it divides the ball mass by average force (0.20 kg / 30 N = 0.0067) instead of multiplying force by contact duration (30 N)(0.10 s) = 3.0 N s.",
        "This choice is not supported because it uses force alone and omits the contact duration under the stated conditions and measurement model.",
        "This choice is not supported because it multiplies by ten rather than using the stated tenth-second interval under the stated conditions and measurement model."
      ]
    },
    "ap-physics-1-u4-074": {
      "rationale": "Conservation of linear momentum for the two-cart system equates initial momentum (0.10 kg)(5 m/s) = 0.50 kg m/s to the combined mass (0.50 kg) times v_f, giving a final speed of 1.0 m/s.",
      "choiceRationales": [
        "This choice is not supported because it computes only the mass fraction 0.10 / 0.50 = 0.20 without multiplying by the 5 m/s initial speed to conserve momentum.",
        "The initial momentum is 0.50 kg m/s and the combined mass is 0.50 kg, giving 1.0 m/s.",
        "This choice is not supported because it takes the ratio of stationary to moving mass (0.40 / 0.10 = 4.0) rather than dividing 0.50 kg m/s total momentum by 0.50 kg total mass.",
        "This choice is not supported because it assumes the moving carts speed remains after the masses stick under the stated conditions and measurement model."
      ]
    },
    "ap-physics-1-u5-082": {
      "rationale": "Torque magnitude about a pivot is tau = r*F*sin(theta); because the 20 N force acts perpendicular to the 0.30 m wrench arm (sin 90 deg = 1), the resulting torque is (0.30 m)(20 N) = 6.0 N m.",
      "choiceRationales": [
        "This choice is not supported because it divides force by lever arm with a shifted decimal (20 / 0.30 = 66.7, not 0.067) instead of multiplying (0.30 m)(20 N) = 6.0 N m.",
        "Torque magnitude is rF sine theta; with a right angle it is 0.30 m times 20 N, or 6.0 N m.",
        "This choice is not supported because it adds force and distance despite incompatible units under the stated conditions and measurement model.",
        "This choice is not supported because it multiplies by ten without using the stated lever arm under the stated conditions and measurement model."
      ]
    },
    "ap-physics-1-u5-085": {
      "rationale": "For a rigid object rotating about a fixed axis, angular momentum equals rotational inertia times angular speed (L = I*omega); multiplying 0.50 kg m^2 by 4 rad/s gives 2.0 kg m^2/s.",
      "choiceRationales": [
        "Angular momentum about the fixed axis is I omega, giving 0.50 times 4, or 2.0 kg m2/s.",
        "This choice is not supported because it divides inertia by angular speed instead of multiplying under the stated conditions and measurement model.",
        "This choice is not supported because it uses angular speed alone without the rotational inertia under the stated conditions and measurement model.",
        "This choice is not supported because it multiplies mass by angular speed (2 kg times 4 rad/s = 8.0) or divides omega by I instead of computing L = I*omega = (0.50)(4) = 2.0 kg m^2/s."
      ]
    },
    "ap-physics-1-u5-092": {
      "rationale": "For a force applied at angle theta to the lever arm, torque magnitude obeys tau = r*F*sin(theta). Substituting r = 0.50 m, F = 10 N, and sin(30 deg) = 0.50 yields tau = 0.50(10)(0.50) = 2.5 N m.",
      "choiceRationales": [
        "This choice is not supported because it uses the full force without the perpendicular component under the stated conditions and measurement model.",
        "This choice is not supported because it computes F*cos(30 deg) = 10(0.866) = 8.7 N, both using cosine instead of sine and omitting the 0.50 m lever arm.",
        "This choice is not supported because it multiplies force and distance by four without the angle relationship under the stated conditions and measurement model.",
        "For a force applied at angle theta to the lever arm, torque magnitude obeys tau = r*F*sin(theta). Substituting r = 0.50 m, F = 10 N, and sin(30 deg) = 0.50 yields tau = 0.50(10)(0.50) = 2.5 N m."
      ]
    },
    "ap-physics-1-u6-099": {
      "rationale": "Rotational kinetic energy mirrors translational kinetic energy (1/2)m*v^2 by replacing mass with rotational inertia I and linear speed with angular speed omega, yielding K_rot = (1/2)I*omega^2.",
      "choiceRationales": [
        "This choice is not supported because it dividing inertia by speed is not an energy relationship under the stated conditions and measurement model.",
        "This choice is not supported because it multiplies I*omega^2 by two instead of one-half, producing four times the true rotational kinetic energy K_rot = (1/2)I*omega^2.",
        "Rotational kinetic energy parallels translational kinetic energy and depends on angular speed squared.",
        "This choice is not supported because it the speed must be squared in the kinetic-energy expression under the stated conditions and measurement model."
      ]
    },
    "ap-physics-1-u6-103": {
      "rationale": "Rotational kinetic energy of a rigid body is K_rot = (1/2)I*omega^2. Substituting rotational inertia I = 4 kg m2 and omega = 5 rad/s gives K_rot = 0.5(4)(5^2) = 2(25) = 50 J.",
      "choiceRationales": [
        "This choice is not supported because it computes (1/2)I*omega = 0.5(4)(5) = 10 without squaring angular speed as required by K_rot = (1/2)I*omega^2 = 50 J.",
        "This choice is not supported because it computes angular momentum I*omega = (4)(5) = 20, omitting both the one-half factor and the square on angular speed.",
        "Rotational kinetic energy of a rigid body is K_rot = (1/2)I*omega^2. Substituting rotational inertia I = 4 kg m2 and omega = 5 rad/s gives K_rot = 0.5(4)(5^2) = 2(25) = 50 J.",
        "This choice is not supported because it doubles the correct value without changing inertia or speed under the stated conditions and measurement model."
      ]
    },
    "ap-physics-1-u6-105": {
      "rationale": "Angular impulse equals constant net torque multiplied by duration, delta L = tau * delta t. Applying tau = 8 N m over delta t = 0.50 s delivers 8(0.50) = 4 N m s of angular impulse.",
      "choiceRationales": [
        "Angular impulse equals constant net torque multiplied by duration, delta L = tau * delta t. Applying tau = 8 N m over delta t = 0.50 s delivers 8(0.50) = 4 N m s of angular impulse.",
        "This choice is not supported because it takes the reciprocal of the correct 4 N m s impulse (1 / 4 = 0.25) instead of multiplying torque 8 N m by duration 0.50 s.",
        "This choice is not supported because it adds torque and time despite different units under the stated conditions and measurement model.",
        "This choice is not supported because it divides torque by time (8 / 0.50 = 16 N m s), quadrupling the true angular impulse rather than multiplying tau by delta t."
      ]
    },
    "ap-physics-1-u7-119": {
      "rationale": "Frequency and period of a periodic oscillator are reciprocals, f = 1 / T. Substituting the pendulum's period T = 2.0 s gives f = 1 / 2.0 s = 0.50 Hz (half a cycle per second).",
      "choiceRationales": [
        "This choice is not supported because it uses period itself as frequency instead of taking the reciprocal under the stated conditions and measurement model.",
        "This choice is not supported because it doubles the 2.0 s period (2 times 2.0 = 4.0) instead of taking the reciprocal f = 1 / T = 1 / 2.0 s = 0.50 Hz.",
        "Frequency and period of a periodic oscillator are reciprocals, f = 1 / T. Substituting the pendulum's period T = 2.0 s gives f = 1 / 2.0 s = 0.50 Hz (half a cycle per second).",
        "This choice is not supported because it divides by four rather than using the stated period under the stated conditions and measurement model."
      ]
    },
    "ap-physics-1-u7-126": {
      "rationale": "By Hooke's law, the restoring force magnitude of an ideal spring is |F_s| = k*|x|. Multiplying stiffness k = 100 N/m by displacement x = 0.20 m gives a 20 N restoring force.",
      "choiceRationales": [
        "This choice is not supported because it divides displacement by spring constant (0.20 / 100 = 0.002) instead of multiplying stiffness by displacement in |F_s| = k*|x| = 20 N.",
        "By Hooke's law, the restoring force magnitude of an ideal spring is |F_s| = k*|x|. Multiplying stiffness k = 100 N/m by displacement x = 0.20 m gives a 20 N restoring force.",
        "This choice is not supported because it uses the reciprocal of the displacement under the stated conditions and measurement model.",
        "This choice is not supported because it divides the 100 N/m spring constant by two (100 / 2 = 50) instead of multiplying 100 N/m by the 0.20 m displacement."
      ]
    },
    "ap-physics-1-u7-131": {
      "rationale": "Period is the elapsed time required to complete one full oscillation cycle (T = t / N); dividing 6.0 s by 15 cycles gives a period of 0.40 s per cycle.",
      "choiceRationales": [
        "This choice is not supported because it understates the period by a factor of four instead of dividing total elapsed time by cycle count (6.0 s / 15 = 0.40 s).",
        "This choice is not supported because it divides cycles by time (15 / 6.0 s = 2.5 Hz), giving the oscillation frequency rather than the period T = t / N = 0.40 s.",
        "Period is total time divided by cycles, so 6.0 s divided by 15 is 0.40 s per cycle.",
        "This choice is not supported because it multiplies time and cycle count instead of finding time per cycle under the stated conditions and measurement model."
      ]
    },
    "ap-physics-1-u8-133": {
      "rationale": "Hydrostatic gauge pressure at depth h in an incompressible fluid is P_gauge = rho*g*h. Substituting rho = 1000 kg/m3, g = 10 m/s2, and h = 2.0 m gives 1000(10)(2.0) = 20,000 Pa.",
      "choiceRationales": [
        "Hydrostatic gauge pressure at depth h in an incompressible fluid is P_gauge = rho*g*h. Substituting rho = 1000 kg/m3, g = 10 m/s2, and h = 2.0 m gives 1000(10)(2.0) = 20,000 Pa.",
        "This choice is not supported because it drops two factors of ten from the hydrostatic product rho*g*h = (1000)(10)(2.0) = 20,000 Pa, understating pressure by 100-fold.",
        "This choice is not supported because it omits the 10 m/s^2 gravitational field and computes only rho*h = (1000)(2.0) = 2,000 instead of rho*g*h = 20,000 Pa.",
        "This choice is not supported because it multiplies by an extra factor of ten beyond the stated values under the stated conditions and measurement model."
      ]
    },
    "ap-physics-1-u8-139": {
      "rationale": "Average mass density is defined as total mass divided by volume (rho = m / V); dividing 1.6 kg by 0.002 m^3 yields an average density of 800 kg/m^3.",
      "choiceRationales": [
        "This choice is not supported because it moves the decimal in the wrong direction when dividing by volume under the stated conditions and measurement model.",
        "This choice is not supported because it multiplies mass by 2 instead of dividing by 0.002 m^3 (even m*V is 0.0032, not 3.2), whereas rho = 1.6 / 0.002 = 800 kg/m^3.",
        "Density is mass divided by volume, so 1.6 kg divided by 0.002 m3 gives 800 kg/m3.",
        "This choice is not supported because it uses a factor four too large for the stated mass and volume under the stated conditions and measurement model."
      ]
    },
    "ap-physics-1-u5-152": {
      "rationale": "Newton's second law for fixed-axis rotation states alpha = tau_net / I; dividing the 6 N m net torque by the 2 kg m^2 rotational inertia yields an angular acceleration of 3 rad/s^2.",
      "choiceRationales": [
        "This choice is not supported because it inverts torque and inertia in the rotational relationship under the stated conditions and measurement model.",
        "This choice is not supported because it subtracts rotational inertia from net torque (6 - 2 = 4) despite unlike units instead of dividing tau_net by I to get 3 rad/s^2.",
        "This choice is not supported because it multiplies rather than divides to obtain angular acceleration under the stated conditions and measurement model.",
        "Newton's second law for fixed-axis rotation states alpha = tau_net / I; dividing the 6 N m net torque by the 2 kg m^2 rotational inertia yields an angular acceleration of 3 rad/s^2."
      ]
    },
    "ap-physics-1-u6-154": {
      "rationale": "Rotational kinetic energy depends directly on I and omega via K_rot = (1/2)I*omega^2 (mass is already encoded in I). Computing 0.5(0.25 kg m2)(8 rad/s)^2 = 0.125(64) gives 8 J.",
      "choiceRationales": [
        "This choice is not supported because it computes angular momentum I*omega = (0.25)(8) = 2, omitting both the one-half factor and the square on angular speed in K_rot = (1/2)I*omega^2.",
        "Rotational kinetic energy depends directly on I and omega via K_rot = (1/2)I*omega^2 (mass is already encoded in I). Computing 0.5(0.25 kg m2)(8 rad/s)^2 = 0.125(64) gives 8 J.",
        "This choice is not supported because it computes I*omega^2 = (0.25)(64) = 16 J, omitting the one-half factor required by K_rot = (1/2)I*omega^2 = 8 J.",
        "This choice is not supported because it uses angular speed squared without the one-half inertia factor under the stated conditions and measurement model."
      ]
    },
    "ap-physics-1-u1-163": {
      "rationale": "Displacement over an interval is delta x = x - x0 = v0*t + (1/2)a*t^2 (independent of initial position x0 = 1.2 m); substituting (2.0 m/s)(2.0 s) + 0.5(3.0 m/s^2)(2.0 s)^2 gives 4 m + 6 m = 10 m.",
      "choiceRationales": [
        "This choice is not supported because it omits the acceleration contribution under the stated conditions and measurement model.",
        "This choice is not supported because it miscalculates the kinematic sum (since v0*t = 4 m and (1/2)a*t^2 = 6 m sum to 10 m rather than 8 m over the 2.0 s interval).",
        "Displacement is v0t plus one-half at squared, so 2.0 times 2.0 plus 0.5 times 3.0 times 4.0 equals 10 m.",
        "This choice is not supported because it uses a full at-squared term instead of one-half at-squared under the stated conditions and measurement model."
      ]
    },
    "ap-physics-1-u1-165": {
      "rationale": "Because the 240 km northward air displacement and 40 km eastward wind displacement over 3.0 h are perpendicular, the ground displacement magnitude is sqrt(240^2 + 40^2) = sqrt(59,200), about 243 km.",
      "choiceRationales": [
        "Because the 240 km northward air displacement and 40 km eastward wind displacement over 3.0 h are perpendicular, the ground displacement magnitude is sqrt(240^2 + 40^2) = sqrt(59,200), about 243 km.",
        "This choice is not supported because it subtracts perpendicular displacement components under the stated conditions and measurement model.",
        "This choice is not supported because it adds component magnitudes without preserving vector geometry under the stated conditions and measurement model.",
        "This choice is not supported because it multiplies the 240 km leg by four (960 km) instead of applying the Pythagorean theorem to the perpendicular 240 km and 40 km displacements."
      ]
    },
    "ap-physics-1-u1-166": {
      "rationale": "Displacement equals the area under a velocity-time graph. Using three 1 s trapezoids, areas are (2+4)/2 = 3 m, (4+5)/2 = 4.5 m, and (5+7)/2 = 6 m, summing to 3 + 4.5 + 6 = 13.5 m.",
      "choiceRationales": [
        "This choice is not supported because it counts only the final 1 s trapezoid (5 + 7)/2 = 6 m instead of summing all three intervals (3 + 4.5 + 6 = 13.5 m).",
        "Displacement equals the area under a velocity-time graph. Using three 1 s trapezoids, areas are (2+4)/2 = 3 m, (4+5)/2 = 4.5 m, and (5+7)/2 = 6 m, summing to 3 + 4.5 + 6 = 13.5 m.",
        "This choice is not supported because it rounds the endpoint-weighted sum to an unsupported value under the stated conditions and measurement model.",
        "This choice is not supported because it sums all four speed readings directly (2 + 4 + 5 + 7 = 18) without half-weighting the endpoints in the trapezoidal rule."
      ]
    },
    "ap-physics-1-u1-167": {
      "rationale": "Average velocity is change in position divided by time, giving 0.06 m divided by 0.20 s, or 0.30 m/s; the small change makes resolution relevant.",
      "choiceRationales": [
        "This choice is not supported because it shifts the decimal two places too low from 0.06 m / 0.20 s = 0.30 m/s and omits the instrument-resolution uncertainty.",
        "This choice is not supported because it introduces an extra division without a physical quantity under the stated conditions and measurement model.",
        "Average velocity is change in position divided by time, giving 0.06 m divided by 0.20 s, or 0.30 m/s; the small change makes resolution relevant.",
        "This choice is not supported because it misconverts the length unit by a factor of one hundred under the stated conditions and measurement model."
      ]
    },
    "ap-physics-1-u2-174": {
      "rationale": "Subtract opposite forces to get net force F_net = 18 N east - 8 N west = 10 N east. By Newton's second law a = F_net / m, dividing 10 N east by 5 kg produces 2.0 m/s2 east.",
      "choiceRationales": [
        "This choice is not supported because it adds the opposing horizontal forces (18 N + 8 N = 26 N) before dividing by 5 kg to get 5.2 m/s^2 instead of subtracting them for 10 N east.",
        "Subtract opposite forces to get net force F_net = 18 N east - 8 N west = 10 N east. By Newton's second law a = F_net / m, dividing 10 N east by 5 kg produces 2.0 m/s2 east.",
        "This choice is not supported because it reverses the sign of the net force under the stated conditions and measurement model.",
        "This choice is not supported because it adds force magnitudes without applying direction signs under the stated conditions and measurement model."
      ]
    },
    "ap-physics-1-u2-175": {
      "rationale": "Newton's second law gives horizontal acceleration as a = F_net / m; subtracting 15 N of opposing kinetic friction from the 35 N pull yields a 20 N net force, and 20 N / 10 kg equals 2.0 m/s^2.",
      "choiceRationales": [
        "This choice is not supported because it inverts the net-force-to-mass ratio (10 kg / 20 N = 0.50) instead of dividing the 20 N net horizontal force by the 10 kg mass.",
        "This choice is not supported because it divides the applied force by mass before subtracting friction under the stated conditions and measurement model.",
        "The net horizontal force is 35 N minus 15 N, or 20 N; dividing by 10 kg gives 2.0 m/s2.",
        "This choice is not supported because it uses the force sum rather than the net force under the stated conditions and measurement model."
      ]
    },
    "ap-physics-1-u2-177": {
      "rationale": "Maintaining a 50 m circular turn at 10 m/s requires a radially inward net centripetal force F_c = m*v^2 / r; substituting 1000 kg, (10 m/s)^2 = 100 m^2/s^2, and 50 m gives 100,000 / 50 = 2000 N.",
      "choiceRationales": [
        "The inward force is mv squared divided by r, so 1000 times 100 divided by 50 equals 2000 N.",
        "This choice is not supported because it drops the speed-squared factor under the stated conditions and measurement model.",
        "This choice is not supported because it omits squaring speed and computes m*v / r = (1000)(10) / 50 = 200 N instead of squaring 10 m/s in F_c = m*v^2 / r = 2000 N.",
        "This choice is not supported because it inflates the correct 2000 N inward force by an extra factor of ten instead of computing (1000 kg)(10 m/s)^2 / 50 m = 2000 N."
      ]
    },
    "ap-physics-1-u2-179": {
      "rationale": "Only the horizontal component of the pull, F_x = 20*cos(60 deg) = 10 N, accelerates the sled along level ground; subtracting 5 N of friction gives F_net_x = 5 N, so a_x = 5 N / 4 kg = 1.25 m/s^2.",
      "choiceRationales": [
        "This choice is not supported because it uses the full applied force as horizontal force under the stated conditions and measurement model.",
        "This choice is not supported because it divides the full 20 N pull by the 4 kg mass (20 / 4 = 5.0 m/s^2), ignoring both the 60 degree angle component and the 5 N friction force.",
        "The horizontal pull is 20 cos 60 degrees, or 10 N; net horizontal force is 5 N, giving 5 N divided by 4 kg.",
        "This choice is not supported because it uses 10 N as net force without subtracting friction under the stated conditions and measurement model."
      ]
    },
    "ap-physics-1-u2-180": {
      "rationale": "With negligible acceleration, vertical equilibrium sets sensor tension equal to weight: F_sensor = m*g. Solving m = F_g / g near Earth's surface gives 9.8 N / 9.8 m/s2 = 1.0 kg.",
      "choiceRationales": [
        "This choice is not supported because it divides by the wrong factor direction under the stated conditions and measurement model.",
        "This choice is not supported because it reports the 9.8 N weight reading directly as mass in kilograms without dividing by Earth's 9.8 m/s^2 gravitational field strength.",
        "This choice is not supported because it moves the decimal in the wrong direction under the stated conditions and measurement model.",
        "With negligible acceleration, vertical equilibrium sets sensor tension equal to weight: F_sensor = m*g. Solving m = F_g / g near Earth's surface gives 9.8 N / 9.8 m/s2 = 1.0 kg."
      ]
    },
    "ap-physics-1-u2-191": {
      "rationale": "By Newton's second law, acceleration is a = F_net / m = (6 N west) / (2 kg) = 3 m/s^2 west; multiplying by the 0.50 s interval gives delta v = a * delta t = 1.5 m/s west (equivalently J/m = 3.0 N s / 2 kg).",
      "choiceRationales": [
        "This choice is not supported because it stops at acceleration F/m = 3.0 m/s^2 (or impulse F*delta t = 3.0 N s) without completing delta v = (F_net / m) * delta t = 1.5 m/s west.",
        "This choice is not supported because it divides force by time (6 / 0.50 = 12) while omitting mass instead of computing a*delta t = (6 / 2)(0.50) = 1.5 m/s west.",
        "Acceleration is 6 N divided by 2 kg, or 3 m/s2 west; over 0.50 s the velocity change is 1.5 m/s west.",
        "This choice is not supported because it divides time by acceleration (0.50 / 3 = 0.17) instead of multiplying the 3 m/s^2 acceleration by the 0.50 s interval."
      ]
    },
    "ap-physics-1-u3-196": {
      "rationale": "Only the force component parallel to displacement does work: W = F*d*cos(theta). With F = 12 N, d = 5 m, and cos(60 deg) = 0.5, the work done is 12(5)(0.5) = 30 J.",
      "choiceRationales": [
        "This choice is not supported because it omits the angle factor under the stated conditions and measurement model.",
        "This choice is not supported because it understates the work done along the displacement (12(5)cos 60 deg = 30 J, whereas using sin 60 deg would give 52 J, not 10 J).",
        "This choice is not supported because it assumes a perpendicular force despite the stated 60 degree angle under the stated conditions and measurement model.",
        "Only the force component parallel to displacement does work: W = F*d*cos(theta). With F = 12 N, d = 5 m, and cos(60 deg) = 0.5, the work done is 12(5)(0.5) = 30 J."
      ]
    },
    "ap-physics-1-u3-197": {
      "rationale": "By the work-energy theorem, net work equals change in kinetic energy, W_net = (1/2)m(v_f^2 - v_i^2); substituting 3 kg, 6^2 = 36, and 2^2 = 4 yields 0.5(3)(36 - 4) = 48 J.",
      "choiceRationales": [
        "The net work equals the change in kinetic energy: 0.5 times 3 times (36 minus 4), or 48 J.",
        "This choice is not supported because it squares the speed difference (1/2)(3)(6 - 2)^2 = 24 J instead of taking the difference of squares (1/2)(3)(6^2 - 2^2) = 48 J.",
        "This choice is not supported because it reports only the squared final speed (6^2 = 36) without multiplying by (1/2)m or subtracting initial kinetic energy.",
        "This choice is not supported because it computes only the final kinetic energy (1/2)(3)(6^2) = 54 J without subtracting the initial kinetic energy of 6 J."
      ]
    },
    "ap-physics-1-u3-198": {
      "rationale": "Average power is the rate at which a machine transfers energy, P_avg = delta E / delta t; dividing 2400 J of transferred energy by the 30 s operating time yields 80 W.",
      "choiceRationales": [
        "This choice is not supported because it inverts the energy-time relationship under the stated conditions and measurement model.",
        "Average power is energy transferred divided by time, so 2400 J divided by 30 s equals 80 W.",
        "This choice is not supported because it multiplies energy and time with three dropped zeros (2400 times 30 = 72,000, not 72) instead of dividing 2400 J by 30 s for 80 W.",
        "This choice is not supported because it adds unlike quantities instead of forming joules per second under the stated conditions and measurement model."
      ]
    },
    "ap-physics-1-u3-199": {
      "rationale": "Potential energy stored in a stretched linear spring obeys U_s = (1/2)k*x^2. Substituting k = 150 N/m and stretch x = 0.20 m gives U_s = 0.5(150)(0.04) = 75(0.04) = 3.0 J.",
      "choiceRationales": [
        "This choice is not supported because it takes only half of the true 3.0 J energy instead of evaluating U_s = (1/2)k*x^2 = 0.5(150 N/m)(0.20 m)^2 = 3.0 J.",
        "This choice is not supported because it omits squaring the extension and computes (1/2)k*x = 0.5(150)(0.20) = 15 J instead of squaring 0.20 m to get 3.0 J.",
        "Potential energy stored in a stretched linear spring obeys U_s = (1/2)k*x^2. Substituting k = 150 N/m and stretch x = 0.20 m gives U_s = 0.5(150)(0.04) = 75(0.04) = 3.0 J.",
        "This choice is not supported because it moves the decimal one place when squaring 0.20 m under the stated conditions and measurement model."
      ]
    },
    "ap-physics-1-u3-200": {
      "rationale": "With negligible air resistance, conservation of mechanical energy sets m*g*h = (1/2)m*v^2 so v = sqrt(2*g*h); using g = 9.8 m/s^2 and h = 5 m yields sqrt(98) m/s, approximately 9.9 m/s.",
      "choiceRationales": [
        "This choice is not supported because it takes half of g (9.8 / 2 = 4.9) instead of applying energy conservation v = sqrt(2*g*h) = sqrt(98) = 9.9 m/s.",
        "This choice is not supported because it computes g*h = (9.8 m/s^2)(5 m) = 49 without multiplying by two or taking the square root in v = sqrt(2*g*h).",
        "This choice is not supported because it omits the square root when solving for speed under the stated conditions and measurement model.",
        "Gravitational energy gives mgh = one-half mv squared, so v equals square root of 2gh, about 9.9 m/s."
      ]
    },
    "ap-physics-1-u3-201": {
      "rationale": "Work equals the total area under the force-position graph: the rectangle from 0 to 4 m contributes (4 m)(6 N) = 24 J and the triangle from 4 to 6 m adds (1/2)(2 m)(6 N) = 6 J, totaling 30 J.",
      "choiceRationales": [
        "The rectangle contributes 24 J and the triangle contributes one-half times 2 times 6, or 6 J, for 30 J total.",
        "This choice is not supported because it computes base times height (2 m times 6 N = 12 J) for the second interval alone, omitting both the one-half triangle factor and the 24 J rectangle.",
        "This choice is not supported because it includes only the 4 m by 6 N rectangular region (24 J) and omits the additional 6 J triangular region from x = 4 to 6 m.",
        "This choice is not supported because it doubles the triangular area instead of using one-half base times height under the stated conditions and measurement model."
      ]
    },
    "ap-physics-1-u3-214": {
      "rationale": "Lifting at constant velocity gives zero acceleration, so the crane's upward force equals weight m*g; instantaneous useful power P = F*v = m*g*v = (500 kg)(9.8 m/s^2)(0.40 m/s) = 1960 W.",
      "choiceRationales": [
        "This choice is not supported because it uses speed without multiplying by weight under the stated conditions and measurement model.",
        "At constant speed the lifting force is about mg, so power is mgv = 500 times 9.8 times 0.40, or 1960 W.",
        "This choice is not supported because it divides weight by speed with a shifted decimal (4900 / 0.40 = 12,250 W, not 1225 W) instead of multiplying m*g*v = 1960 W.",
        "This choice is not supported because it computes the load weight m*g = (500 kg)(9.8 m/s^2) = 4900 N without multiplying by the 0.40 m/s upward speed."
      ]
    },
    "ap-physics-1-u4-218": {
      "rationale": "Center-of-mass velocity equals total system momentum divided by total mass (v_cm = p_total / m_total); taking east positive gives [(3)(4) + (1)(-2)] / (3 + 1) = 10 / 4 = 2.5 m/s east.",
      "choiceRationales": [
        "This choice is not supported because it underestimates the center-of-mass speed rather than dividing the net 10 kg m/s eastward momentum by the 4 kg total mass to get 2.5 m/s east.",
        "Total momentum is 12 minus 2, or 10 kg m/s east; dividing by total mass 4 kg gives 2.5 m/s east.",
        "This choice is not supported because it assigns both a westward direction and an incorrect magnitude even though net momentum is +10 kg m/s east and v_cm = 10 / 4 = 2.5 m/s east.",
        "This choice is not supported because it uses momentum sum without dividing by total mass under the stated conditions and measurement model."
      ]
    },
    "ap-physics-1-u4-220": {
      "rationale": "With no external horizontal impulse, momentum is conserved in a perfectly inelastic collision: m1*v1 + m2*v2 = (m1 + m2)*v_f. Solving 2(3) + 1(0) = 3*v_f gives v_f = 6 / 3 = 2.0 m/s east.",
      "choiceRationales": [
        "This choice is not supported because it divides initial speed by total mass without including cart momentum under the stated conditions and measurement model.",
        "This choice is not supported because it assumes speed remains unchanged despite added mass under the stated conditions and measurement model.",
        "This choice is not supported because it reports the initial 6 kg m/s momentum directly as final velocity without dividing by the 3 kg combined mass after the carts stick.",
        "With no external horizontal impulse, momentum is conserved in a perfectly inelastic collision: m1*v1 + m2*v2 = (m1 + m2)*v_f. Solving 2(3) + 1(0) = 3*v_f gives v_f = 6 / 3 = 2.0 m/s east."
      ]
    },
    "ap-physics-1-u4-221": {
      "rationale": "Momentum is a signed vector, so reversing direction adds the magnitudes of velocity change: taking east positive gives delta p = (0.20 kg)(-3 m/s - 5 m/s) = -1.6 kg m/s, whose magnitude is 1.6 kg m/s.",
      "choiceRationales": [
        "The signed change is 0.20 times (negative 3 minus 5), or negative 1.6 kg m/s, so the magnitude is 1.6 kg m/s.",
        "This choice is not supported because it subtracts speed magnitudes without accounting for rebound direction reversal, giving 0.20(5 - 3) = 0.4 kg m/s instead of 1.6 kg m/s.",
        "This choice is not supported because it uses only the initial 5 m/s speed (0.20 times 5 = 1.0 kg m/s) and omits the 3 m/s westward rebound velocity.",
        "This choice is not supported because it reports force units instead of momentum units under the stated conditions and measurement model."
      ]
    },
    "ap-physics-1-u5-229": {
      "rationale": "When a force acts perpendicular to the lever arm (theta = 90 deg, sin 90 = 1), torque simplifies to tau = r*F. Multiplying r = 0.40 m by F = 15 N gives tau = 6.0 N m.",
      "choiceRationales": [
        "When a force acts perpendicular to the lever arm (theta = 90 deg, sin 90 = 1), torque simplifies to tau = r*F. Multiplying r = 0.40 m by F = 15 N gives tau = 6.0 N m.",
        "This choice is not supported because it divides lever arm by force with a misplaced decimal (0.40 / 15 = 0.027, not 0.27) instead of multiplying (0.40 m)(15 N) = 6.0 N m.",
        "This choice is not supported because it adds force and distance despite unlike units under the stated conditions and measurement model.",
        "This choice is not supported because it uses the reciprocal lever arm relationship under the stated conditions and measurement model."
      ]
    },
    "ap-physics-1-u5-232": {
      "rationale": "Static vertical equilibrium (F_net_y = 0) requires total upward support equal to the 20 N beam weight plus 10 N central load, or 30 N, and torque symmetry about the center splits that load equally to 15 N per support.",
      "choiceRationales": [
        "This choice is not supported because it divides only the applied load and omits beam weight under the stated conditions and measurement model.",
        "This choice is not supported because it splits only the 20 N beam weight between the two supports (20 / 2 = 10 N) and omits the 10 N load placed at the center.",
        "This choice is not supported because it adds downward forces to one support without sharing by symmetry under the stated conditions and measurement model.",
        "The total downward force is 30 N and symmetry makes the two upward support forces equal, so each is 15 N."
      ]
    },
    "ap-physics-1-u5-233": {
      "rationale": "A constant torque acting over time interval delta t imparts angular impulse J_ang = tau * delta t. Multiplying tau = 4 N m by delta t = 3 s yields 12 N m s.",
      "choiceRationales": [
        "A constant torque acting over time interval delta t imparts angular impulse J_ang = tau * delta t. Multiplying tau = 4 N m by delta t = 3 s yields 12 N m s.",
        "This choice is not supported because it divides torque by time instead of multiplying under the stated conditions and measurement model.",
        "This choice is not supported because it adds torque and time despite unlike quantities under the stated conditions and measurement model.",
        "This choice is not supported because it quadruples the correct 12 N m s angular impulse (4 times 12 = 48) instead of applying J_ang = tau * delta t = (4 N m)(3 s) = 12 N m s."
      ]
    },
    "ap-physics-1-u6-241": {
      "rationale": "Rolling without slipping links linear center-of-mass speed and angular speed via v = r*omega. Solving omega = v / r for v = 3.0 m/s and r = 0.30 m gives 3.0 / 0.30 = 10 rad/s.",
      "choiceRationales": [
        "Rolling without slipping links linear center-of-mass speed and angular speed via v = r*omega. Solving omega = v / r for v = 3.0 m/s and r = 0.30 m gives 3.0 / 0.30 = 10 rad/s.",
        "This choice is not supported because it divides radius by linear speed (0.30 / 3.0 = 0.10) instead of applying the no-slip relation omega = v / r = 3.0 / 0.30 = 10 rad/s.",
        "This choice is not supported because it multiplies linear speed and radius (3.0 times 0.30 = 0.90) instead of dividing v by r to obtain 10 rad/s.",
        "This choice is not supported because it multiplies the correct 10 rad/s angular speed by three instead of evaluating omega = 3.0 m/s / 0.30 m = 10 rad/s."
      ]
    },
    "ap-physics-1-u7-248": {
      "rationale": "At maximum displacement (v = 0), all mechanical energy of an ideal horizontal mass-spring oscillator is elastic potential energy: E = (1/2)k*A^2 = 0.5(200 N/m)(0.10 m)^2 = 1.0 J.",
      "choiceRationales": [
        "This choice is not supported because it reports the 0.10 m amplitude value directly as energy instead of evaluating E = (1/2)k*A^2 = 0.5(200)(0.01) = 1.0 J.",
        "This choice is not supported because it uses the full kA squared term without one-half under the stated conditions and measurement model.",
        "This choice is not supported because it misplaces the decimal in the squared amplitude under the stated conditions and measurement model.",
        "Total spring energy at maximum displacement is one-half kA squared, or 0.5 times 200 times 0.01 = 1.0 J."
      ]
    },
    "ap-physics-1-u8-252": {
      "rationale": "Fluid gauge pressure increases linearly with depth as P_gauge = rho*g*h. Substituting rho = 1000 kg/m3, g = 9.8 m/s2, and h = 2.0 m gives 1000(9.8)(2.0) = 19,600 Pa.",
      "choiceRationales": [
        "This choice is not supported because it drops a factor of one hundred from the density conversion under the stated conditions and measurement model.",
        "This choice is not supported because it uses one-quarter of the stated 2.0 m depth (0.5 m) instead of computing rho*g*h = (1000)(9.8)(2.0) = 19,600 Pa.",
        "This choice is not supported because it uses a depth of ten meters instead of two under the stated conditions and measurement model.",
        "Fluid gauge pressure increases linearly with depth as P_gauge = rho*g*h. Substituting rho = 1000 kg/m3, g = 9.8 m/s2, and h = 2.0 m gives 1000(9.8)(2.0) = 19,600 Pa."
      ]
    },
    "ap-physics-1-u8-253": {
      "rationale": "Archimedes' principle sets upward buoyant force equal to the weight of displaced fluid, F_b = rho_fluid * g * V_disp; substituting (1000 kg/m^3)(9.8 m/s^2)(0.020 m^3) yields 196 N upward.",
      "choiceRationales": [
        "Buoyant force is rho fluid g V displaced, so 1000 times 9.8 times 0.020 equals 196 N upward.",
        "This choice is not supported because it computes only displaced water mass rho*V = (1000)(0.020) = 20 kg without multiplying by Earth's 9.8 m/s^2 gravitational field.",
        "This choice is not supported because it uses one-fourth the displaced volume under the stated conditions and measurement model.",
        "This choice is not supported because it uses a volume of 0.10 m3 instead of 0.020 m3 under the stated conditions and measurement model."
      ]
    },
    "ap-physics-1-u8-258": {
      "rationale": "By the continuity equation A1*v1 = A2*v2 for steady incompressible flow, reducing area by 20% leaves A2 = 0.80*A1. Therefore v2 = v1 / 0.80 = 1.25*v1, rising by a factor of 1.25.",
      "choiceRationales": [
        "This choice is not supported because it reverses the inverse relationship under the stated conditions and measurement model.",
        "By the continuity equation A1*v1 = A2*v2 for steady incompressible flow, reducing area by 20% leaves A2 = 0.80*A1. Therefore v2 = v1 / 0.80 = 1.25*v1, rising by a factor of 1.25.",
        "This choice is not supported because it uses the area fraction as the speed factor rather than its reciprocal under the stated conditions and measurement model.",
        "This choice is not supported because it squares 1.20 (1.20^2 = 1.44) rather than applying continuity v2 / v1 = A1 / A2 = 1 / 0.80 = 1.25."
      ]
    },
    "ap-physics-1-u1-267": {
      "rationale": "Resolving a vector into orthogonal components places the east component adjacent to the 37 deg angle above east, so F_east = F*cos(37 deg) = (20 N)(0.80) = 16 N east.",
      "choiceRationales": [
        "This choice is not supported because it uses the vertical sine component for the east direction under the stated conditions and measurement model.",
        "This choice is not supported because it uses the full magnitude without resolving it under the stated conditions and measurement model.",
        "The east component is the adjacent component, 20 times cosine 37 degrees, or 16 N.",
        "This choice is not supported because it divides vector magnitude by sine 37 degrees (20 / 0.60 = 33.3 N) instead of multiplying by cosine 37 degrees for the adjacent east component."
      ]
    },
    "ap-physics-1-u1-268": {
      "rationale": "Average acceleration requires signed velocities, a_avg = (v_f - v_i) / delta t; taking east positive gives (-4 m/s - 4 m/s) / 2.0 s = -4.0 m/s^2, which is 4.0 m/s^2 directed west.",
      "choiceRationales": [
        "This choice is not supported because it equal speed does not mean zero velocity change when direction reverses under the stated conditions and measurement model.",
        "This choice is not supported because it divides by time but omits half the signed velocity change under the stated conditions and measurement model.",
        "This choice is not supported because it uses the 8 m/s velocity-change magnitude without dividing by 2.0 s and assigns the wrong eastward direction instead of 4.0 m/s^2 west.",
        "Taking east as positive, the velocity change is -4 - 4 = -8 m/s; dividing by 2.0 s gives 4.0 m/s2 west."
      ]
    },
    "ap-physics-1-u2-279": {
      "rationale": "Kinetic friction opposes the applied pull, giving horizontal net force F_net = 50 N - 14 N = 36 N. By Newton's second law a = F_net / m, the crate accelerates at 36 / 12 = 3.0 m/s2.",
      "choiceRationales": [
        "This choice is not supported because it divides friction by mass without the applied force under the stated conditions and measurement model.",
        "This choice is not supported because it divides the 50 N applied force by 12 kg (50 / 12 = 4.2 m/s^2) without subtracting the 14 N opposing friction force first.",
        "Kinetic friction opposes the applied pull, giving horizontal net force F_net = 50 N - 14 N = 36 N. By Newton's second law a = F_net / m, the crate accelerates at 36 / 12 = 3.0 m/s2.",
        "This choice is not supported because it adds applied force and friction ((50 + 14) / 12 = 5.3 m/s^2) instead of subtracting opposing friction to get 36 N / 12 kg = 3.0 m/s^2."
      ]
    },
    "ap-physics-1-u2-280": {
      "rationale": "Near Earth's surface, gravitational potential-energy change is delta U_g = m*g*delta h; lowering the 2 kg object from 5 m to 2 m gives delta h = -3 m, so delta U_g = (2 kg)(9.8 m/s^2)(-3 m) = -58.8 J.",
      "choiceRationales": [
        "This choice is not supported because it uses a positive 4 m height change (2 times 9.8 times 4 = 78.4 J) rather than the actual downward shift delta h = 2 m - 5 m = -3 m.",
        "This choice is not supported because it uses only one meter of height difference under the stated conditions and measurement model.",
        "This choice is not supported because it reports the magnitude with the wrong sign and an incorrect distance under the stated conditions and measurement model.",
        "The height change is -3 m, so delta U = mg delta h = 2 times 9.8 times -3 = -58.8 J."
      ]
    },
    "ap-physics-1-u2-281": {
      "rationale": "From F = mv squared divided by r, v equals the square root of Fr divided by m, or the square root of 3600 times 75 divided by 1200 = 15 m/s.",
      "choiceRationales": [
        "From F = mv squared divided by r, v equals the square root of Fr divided by m, or the square root of 3600 times 75 divided by 1200 = 15 m/s.",
        "This choice is not supported because it understates the speed by a factor of three instead of solving v = sqrt(F_c * r / m) = sqrt(3600 * 75 / 1200) = 15 m/s.",
        "This choice is not supported because it uses a speed that would produce a smaller force under the stated conditions and measurement model.",
        "This choice is not supported because it doubles the speed without applying the square-root relation under the stated conditions and measurement model."
      ]
    },
    "ap-physics-1-u3-297": {
      "rationale": "By the work-energy theorem, K_f = K_i + W_net; initial kinetic energy is 0.5(4 kg)(5 m/s)^2 = 50 J, so adding 112 J gives K_f = 162 J and v_f = sqrt(2*162 / 4) = sqrt(81) = 9 m/s.",
      "choiceRationales": [
        "By the work-energy theorem, K_f = K_i + W_net; initial kinetic energy is 0.5(4 kg)(5 m/s)^2 = 50 J, so adding 112 J gives K_f = 162 J and v_f = sqrt(2*162 / 4) = sqrt(81) = 9 m/s.",
        "This choice is not supported because it underestimates the final speed; even omitting initial kinetic energy gives sqrt(2*112 / 4) = 7.5 m/s, whereas K_f = 162 J yields 9 m/s.",
        "This choice is not supported because it adds work to speed rather than kinetic energy under the stated conditions and measurement model.",
        "This choice is not supported because it doubles the speed without using the kinetic-energy relation under the stated conditions and measurement model."
      ]
    },
    "ap-physics-1-u3-299": {
      "rationale": "Conservation of energy with thermal transfer sets delta K = m*g*h - E_thermal; the 2 kg object loses (2 kg)(9.8 m/s^2)(4 m) = 78.4 J of gravitational potential energy, leaving 78.4 - 12 = 66.4 J.",
      "choiceRationales": [
        "This choice is not supported because it ignores the stated thermal transfer under the stated conditions and measurement model.",
        "This choice is not supported because it doubles the 12 J thermal transfer (24 J) rather than subtracting 12 J from the 78.4 J gravitational potential energy decrease.",
        "Conservation of energy with thermal transfer sets delta K = m*g*h - E_thermal; the 2 kg object loses (2 kg)(9.8 m/s^2)(4 m) = 78.4 J of gravitational potential energy, leaving 78.4 - 12 = 66.4 J.",
        "This choice is not supported because it adds thermal energy to rather than subtracting it from available kinetic energy under the stated conditions and measurement model."
      ]
    },
    "ap-physics-1-u3-301": {
      "rationale": "Rearranging spring potential energy U_s = (1/2)k*x^2 for the spring constant gives k = 2*U_s / x^2. Substituting U_s = 8 J and x = 0.20 m yields k = 16 / 0.04 = 400 N/m.",
      "choiceRationales": [
        "Rearranging spring potential energy U_s = (1/2)k*x^2 for the spring constant gives k = 2*U_s / x^2. Substituting U_s = 8 J and x = 0.20 m yields k = 16 / 0.04 = 400 N/m.",
        "This choice is not supported because it loses a factor of ten in the squared extension under the stated conditions and measurement model.",
        "This choice is not supported because it misapplies the spring-energy formula instead of solving k = 2*U_s / x^2 = 16 / (0.20)^2 = 16 / 0.04 = 400 N/m.",
        "This choice is not supported because it doubles the solved 400 N/m spring constant (applying the factor of two twice) instead of computing k = 2(8 J) / (0.20 m)^2 = 400 N/m."
      ]
    },
    "ap-physics-1-u3-302": {
      "rationale": "Average useful power is the ratio of useful work done to elapsed time, P_avg = W / delta t. Dividing 12,000 J by 20 s yields P_avg = 600 W.",
      "choiceRationales": [
        "This choice is not supported because it drops a factor of ten when dividing 12,000 J by 20 s instead of computing P_avg = 12,000 / 20 = 600 W.",
        "Average useful power is the ratio of useful work done to elapsed time, P_avg = W / delta t. Dividing 12,000 J by 20 s yields P_avg = 600 W.",
        "This choice is not supported because it multiplies work and time with three dropped zeros (12,000 times 20 = 240,000, not 240) instead of dividing 12,000 J by 20 s.",
        "This choice is not supported because it adds work and time despite different units under the stated conditions and measurement model."
      ]
    },
    "ap-physics-1-u3-303": {
      "rationale": "The work performed by a force equals the area under its force-versus-position graph; for a positive triangle with 6 m base and 10 N peak height, W = (1/2)(6 m)(10 N) = 30 J.",
      "choiceRationales": [
        "This choice is not supported because it adds the base and height (6 + 10 = 16) despite incompatible units instead of computing the triangular area (1/2)(6 m)(10 N) = 30 J.",
        "This choice is not supported because it doubles the correct triangle area under the stated conditions and measurement model.",
        "The triangular area is one-half times base times height, or 0.5 times 6 times 10 = 30 J.",
        "This choice is not supported because it multiplies base and height twice without the one-half factor under the stated conditions and measurement model."
      ]
    },
    "ap-physics-1-u4-318": {
      "rationale": "Conserving signed linear momentum with east positive gives initial momentum (2 kg)(5 m/s) + (3 kg)(-1 m/s) = 7 kg m/s east; dividing by the combined 5 kg mass gives 1.4 m/s east.",
      "choiceRationales": [
        "This choice is not supported because it underestimates the combined velocity instead of dividing net signed momentum (10 - 3 = 7 kg m/s east) by total mass 5 kg to get 1.4 m/s east.",
        "Total momentum is 10 - 3 = 7 kg m/s east; dividing by the combined 5 kg gives 1.4 m/s east.",
        "This choice is not supported because it reverses the direction after finding positive total momentum under the stated conditions and measurement model.",
        "This choice is not supported because it reports total momentum without dividing by total mass under the stated conditions and measurement model."
      ]
    },
    "ap-physics-1-u4-319": {
      "rationale": "By the impulse-momentum theorem (J = m*delta v), taking east as positive yields a signed velocity change of (-2 m/s - 6 m/s) = -8 m/s; multiplying by 0.10 kg gives -0.80 N s, or 0.80 N s west.",
      "choiceRationales": [
        "This choice is not supported because it subtracts speeds without accounting for direction reversal, computing 0.10(6 - 2) = 0.40 N s instead of 0.10(6 + 2) = 0.80 N s west.",
        "This choice is not supported because it reverses the sign of the rebound change under the stated conditions and measurement model.",
        "The signed velocity change is -2 - 6 = -8 m/s; multiplying by 0.10 kg gives 0.80 N s west.",
        "This choice is not supported because it uses only the 2 m/s final speed (0.10 times 2 = 0.20 N s) and omits the initial 6 m/s eastward velocity from delta v."
      ]
    },
    "ap-physics-1-u5-329": {
      "rationale": "Applying a force at 90 degrees to a wrench maximizes the lever arm so tau = r*F. Multiplying r = 0.25 m by F = 30 N yields a torque magnitude of 7.5 N m.",
      "choiceRationales": [
        "Applying a force at 90 degrees to a wrench maximizes the lever arm so tau = r*F. Multiplying r = 0.25 m by F = 30 N yields a torque magnitude of 7.5 N m.",
        "This choice is not supported because it divides lever arm by force (0.25 / 30 = 0.0083) instead of multiplying lever arm by perpendicular force for 7.5 N m.",
        "This choice is not supported because it subtracts the 0.25 m lever arm from the 7.5 N m product instead of stopping at tau = r*F = (0.25 m)(30 N) = 7.5 N m.",
        "This choice is not supported because it uses the reciprocal lever-arm relationship under the stated conditions and measurement model."
      ]
    },
    "ap-physics-1-u5-330": {
      "rationale": "For a point particle orbiting at radius r, rotational inertia is I = m*r^2. Substituting m = 1.5 kg and r = 0.40 m gives I = 1.5(0.16) = 0.24 kg m2.",
      "choiceRationales": [
        "This choice is not supported because it uses distance rather than distance squared under the stated conditions and measurement model.",
        "For a point particle orbiting at radius r, rotational inertia is I = m*r^2. Substituting m = 1.5 kg and r = 0.40 m gives I = 1.5(0.16) = 0.24 kg m2.",
        "This choice is not supported because it subtracts distance from mass (1.5 - 0.40 = 1.10) despite unlike units instead of computing I = m*r^2 = 1.5(0.16) = 0.24 kg m^2.",
        "This choice is not supported because it inverts the distance-squared relationship under the stated conditions and measurement model."
      ]
    },
    "ap-physics-1-u5-331": {
      "rationale": "Angular momentum magnitude for a rigid body about its rotation axis is L = I*omega. Multiplying I = 2 kg*m^2 by omega = 5 rad/s gives L = 10 kg*m^2/s (10 kg m2/s), since radians are dimensionless.",
      "choiceRationales": [
        "This choice is not supported because it divides angular speed by rotational inertia (5 / 2 = 2.5) instead of multiplying I by omega to obtain 10 kg m^2/s.",
        "This choice is not supported because it adds inertia and angular speed under the stated conditions and measurement model.",
        "Angular momentum magnitude for a rigid body about its rotation axis is L = I*omega. Multiplying I = 2 kg*m^2 by omega = 5 rad/s gives L = 10 kg*m^2/s (10 kg m2/s), since radians are dimensionless.",
        "This choice is not supported because it squares angular speed as in rotational energy under the stated conditions and measurement model."
      ]
    },
    "ap-physics-1-u5-332": {
      "rationale": "Translational equilibrium in the vertical direction requires zero net vertical force (F_net_y = 0), so the combined upward support force must balance both the 12 N central load and 16 N beam weight, totaling 28 N.",
      "choiceRationales": [
        "This choice is not supported because it subtracts the load from the beam weight under the stated conditions and measurement model.",
        "This choice is not supported because it omits the applied load under the stated conditions and measurement model.",
        "This choice is not supported because it multiplies the two downward force magnitudes together (12 times 16 = 192) instead of summing 12 N + 16 N = 28 N for vertical equilibrium.",
        "Vertical force balance requires upward support equal to the 12 N load plus 16 N beam weight, or 28 N."
      ]
    },
    "ap-physics-1-u6-340": {
      "rationale": "Under the no-slip rolling constraint v = r*omega, angular speed equals linear speed divided by radius. Substituting v = 4.0 m/s and r = 0.20 m yields omega = 4.0 / 0.20 = 20 rad/s.",
      "choiceRationales": [
        "This choice is not supported because it inverts the radius-speed relationship under the stated conditions and measurement model.",
        "This choice is not supported because it multiplies speed and radius instead of dividing under the stated conditions and measurement model.",
        "This choice is not supported because it quadruples the correct 20 rad/s angular speed (4 times 20 = 80) instead of dividing linear speed 4.0 m/s by radius 0.20 m.",
        "Under the no-slip rolling constraint v = r*omega, angular speed equals linear speed divided by radius. Substituting v = 4.0 m/s and r = 0.20 m yields omega = 4.0 / 0.20 = 20 rad/s."
      ]
    },
    "ap-physics-1-u7-349": {
      "rationale": "At maximum displacement x = A, all mechanical energy of an ideal spring oscillator is elastic potential energy: E = (1/2)k*A^2. Computing 0.5(80)(0.25)^2 = 40(0.0625) gives 2.5 J.",
      "choiceRationales": [
        "At maximum displacement x = A, all mechanical energy of an ideal spring oscillator is elastic potential energy: E = (1/2)k*A^2. Computing 0.5(80)(0.25)^2 = 40(0.0625) gives 2.5 J.",
        "This choice is not supported because it uses one-quarter the correct squared-amplitude result under the stated conditions and measurement model.",
        "This choice is not supported because it omits squaring the amplitude and computes (1/2)k*A = 0.5(80)(0.25) = 10 J instead of squaring 0.25 m to obtain 2.5 J.",
        "This choice is not supported because it uses amplitude without squaring and introduces an extra factor under the stated conditions and measurement model."
      ]
    },
    "ap-physics-1-u8-356": {
      "rationale": "Hydrostatic pressure change across a vertical depth difference delta h is delta P = rho*g*delta h. Substituting rho = 800 kg/m3, g = 10 m/s2, and delta h = 5 m yields 40,000 Pa.",
      "choiceRationales": [
        "This choice is not supported because it drops factors from density and depth under the stated conditions and measurement model.",
        "This choice is not supported because it omits gravitational field g = 10 m/s^2 and multiplies only density by depth (800 times 5 = 4000) instead of rho*g*delta h = 40,000 Pa.",
        "This choice is not supported because it multiplies by an extra factor of ten under the stated conditions and measurement model.",
        "Hydrostatic pressure change across a vertical depth difference delta h is delta P = rho*g*delta h. Substituting rho = 800 kg/m3, g = 10 m/s2, and delta h = 5 m yields 40,000 Pa."
      ]
    },
    "ap-physics-1-u8-358": {
      "rationale": "Constant volume flow rate obeys the continuity equation A1*v1 = A2*v2; solving v2 = (A1 / A2)v1 gives (0.040 m^2 / 0.010 m^2)(2 m/s) = 4(2 m/s) = 8 m/s.",
      "choiceRationales": [
        "This choice is not supported because it uses the area ratio in the wrong direction under the stated conditions and measurement model.",
        "Area times speed is conserved, so final speed is 0.040 divided by 0.010 times 2 = 8 m/s.",
        "This choice is not supported because it understates the speed increase instead of multiplying initial speed 2 m/s by the 4:1 area ratio (0.040 / 0.010) to obtain 8 m/s.",
        "This choice is not supported because it multiplies by an extra factor of ten under the stated conditions and measurement model."
      ]
    },
    "ap-physics-1-u1-365": {
      "rationale": "Taking upward as positive, gravity provides a = -g = -10 m/s^2 in v = v0 - g*t. Setting v = 0 m/s at the peak with v0 = 20 m/s gives 0 = 20 - 10t, so t = 20 / 10 = 2.0 s.",
      "choiceRationales": [
        "Taking upward as positive, gravity provides a = -g = -10 m/s^2 in v = v0 - g*t. Setting v = 0 m/s at the peak with v0 = 20 m/s gives 0 = 20 - 10t, so t = 20 / 10 = 2.0 s.",
        "This choice is not supported because it inverts the initial-speed and gravitational-field relationship under the stated conditions and measurement model.",
        "This choice is not supported because it subtracts gravitational acceleration from initial speed (20 - 10 = 10) instead of dividing v0 by g to find the 2.0 s peak time.",
        "This choice is not supported because it multiplies speed and gravitational field instead of dividing under the stated conditions and measurement model."
      ]
    },
    "ap-physics-1-u1-367": {
      "rationale": "Average velocity is displacement divided by elapsed time, v_avg = (x_f - x_i) / delta t. Computing (2.18 m - 2.00 m) / 0.060 s = 0.18 / 0.060 gives 3.0 m/s.",
      "choiceRationales": [
        "This choice is not supported because it moves the decimal in the change in position under the stated conditions and measurement model.",
        "This choice is not supported because it uses an overstated 0.20 m displacement (0.20 / 0.060 = 3.3 m/s) instead of the actual 0.18 m change over 0.060 s for 3.0 m/s.",
        "Average velocity is displacement divided by elapsed time, v_avg = (x_f - x_i) / delta t. Computing (2.18 m - 2.00 m) / 0.060 s = 0.18 / 0.060 gives 3.0 m/s.",
        "This choice is not supported because it converts the interval by an extra factor of ten under the stated conditions and measurement model."
      ]
    },
    "ap-physics-1-u1-368": {
      "rationale": "Starting from vertical rest (v0_y = 0) under uniform free-fall acceleration g = 10 m/s^2, the time-independent kinematic equation v_y^2 = 2*g*delta y gives v_y = sqrt(2 * 10 * 20) = sqrt(400) = 20 m/s downward.",
      "choiceRationales": [
        "This choice is not supported because it divides height by g (20 / 10 = 2) instead of solving v_y = sqrt(2*g*delta y) = sqrt(400) = 20 m/s downward.",
        "This choice is not supported because it uses one-half the correct gravitational change under the stated conditions and measurement model.",
        "This choice is not supported because it multiplies g and height without taking the square root under the stated conditions and measurement model.",
        "Using v squared = 2g delta y gives v = square root of 2 times 10 times 20 = 20 m/s downward."
      ]
    },
    "ap-physics-1-u2-378": {
      "rationale": "By Newton's second law, F_net = m*a, with net force pointing in the same direction as acceleration. Substituting m = 7 kg and a = 2.0 m/s^2 east yields F_net = 7(2.0) = 14 N east.",
      "choiceRationales": [
        "This choice is not supported because it divides mass by acceleration under the stated conditions and measurement model.",
        "By Newton's second law, F_net = m*a, with net force pointing in the same direction as acceleration. Substituting m = 7 kg and a = 2.0 m/s^2 east yields F_net = 7(2.0) = 14 N east.",
        "This choice is not supported because it adds mass and acceleration (7 + 2 = 9) despite incompatible units instead of multiplying F_net = m*a = 14 N east.",
        "This choice is not supported because it reverses the direction sign under the stated conditions and measurement model."
      ]
    },
    "ap-physics-1-u2-381": {
      "rationale": "Rearranging the centripetal force relation F_c = m*v^2 / r gives v = sqrt(F_c * r / m); substituting 4500 N, 50 m, and 900 kg yields sqrt(225,000 / 900) = sqrt(250), about 15.8 m/s.",
      "choiceRationales": [
        "From F = mv squared/r, v = square root of Fr/m = square root of 4500 times 50 divided by 900, about 15.8 m/s.",
        "This choice is not supported because it omits the radius factor and square root under the stated conditions and measurement model.",
        "This choice is not supported because it uses the wrong mass-force ratio under the stated conditions and measurement model.",
        "This choice is not supported because it takes half the 50 m radius (or divides v^2 = 250 by 10) instead of taking the square root of 250 to get 15.8 m/s."
      ]
    },
    "ap-physics-1-u2-383": {
      "rationale": "Net force equals mass times acceleration (F_net = m*a) regardless of individual tension or gravity forces. With m = 4 kg and a = 1.5 m/s^2 upward, F_net = 4(1.5) = 6 N upward.",
      "choiceRationales": [
        "This choice is not supported because it divides mass by acceleration under the stated conditions and measurement model.",
        "This choice is not supported because it uses mass alone as force under the stated conditions and measurement model.",
        "Net force equals mass times acceleration (F_net = m*a) regardless of individual tension or gravity forces. With m = 4 kg and a = 1.5 m/s^2 upward, F_net = 4(1.5) = 6 N upward.",
        "This choice is not supported because it adds mass and acceleration (4 + 1.5 = 5.5) despite incompatible units instead of multiplying m*a = 6 N upward."
      ]
    },
    "ap-physics-1-u3-400": {
      "rationale": "By the work-energy theorem, net work equals change in kinetic energy: W_net = (1/2)m(v_f^2 - v_i^2) = 0.5(2 kg)(7^2 - 3^2) m^2/s^2 = 1(49 - 9) = 40 J.",
      "choiceRationales": [
        "This choice is not supported because it uses speed difference instead of squared speeds under the stated conditions and measurement model.",
        "This choice is not supported because it omits the one-half factor or mass factor under the stated conditions and measurement model.",
        "This choice is not supported because it computes m*v_f^2 = (2 kg)(7 m/s)^2 = 98 J, omitting both the one-half factor and the initial kinetic energy of 9 J.",
        "Net work equals one-half m times the difference in squared speeds: 0.5 times 2 times (49 minus 9) = 40 J."
      ]
    },
    "ap-physics-1-u3-401": {
      "rationale": "Near a uniform gravitational field, the change in gravitational potential energy is delta U_g = m*g*delta y. Substituting m = 0.50 kg, g = 10 N/kg, and delta y = 6 m gives 0.50(10)(6) = 30 J.",
      "choiceRationales": [
        "Near a uniform gravitational field, the change in gravitational potential energy is delta U_g = m*g*delta y. Substituting m = 0.50 kg, g = 10 N/kg, and delta y = 6 m gives 0.50(10)(6) = 30 J.",
        "This choice is not supported because it multiplies mass by height (0.50 times 6 = 3) while omitting the 10 N/kg gravitational field from delta U_g = m*g*delta y = 30 J.",
        "This choice is not supported because it divides height by mass (6 / 0.50 = 12) instead of multiplying m*g*delta y = (0.50)(10)(6) = 30 J.",
        "This choice is not supported because it moves the decimal one place too far under the stated conditions and measurement model."
      ]
    },
    "ap-physics-1-u3-402": {
      "rationale": "Useful power measures energy transferred per unit time via P = delta E / delta t. Dividing the 900 J energy transfer by the 15 s interval yields P = 60 W.",
      "choiceRationales": [
        "This choice is not supported because it uses time as power without dividing energy under the stated conditions and measurement model.",
        "Useful power measures energy transferred per unit time via P = delta E / delta t. Dividing the 900 J energy transfer by the 15 s interval yields P = 60 W.",
        "This choice is not supported because it multiplies energy and time with two dropped zeros (900 times 15 = 13,500, not 135) instead of dividing 900 J by 15 s for 60 W.",
        "This choice is not supported because it moves the decimal by multiplying instead of dividing under the stated conditions and measurement model."
      ]
    },
    "ap-physics-1-u3-410": {
      "rationale": "Compressing an ideal spring stores elastic potential energy according to U_s = (1/2)k*x^2. Plugging in k = 200 N/m and x = 0.10 m gives 0.5(200)(0.01) = 1.0 J.",
      "choiceRationales": [
        "This choice is not supported because it reports the 0.10 m compression value directly as energy instead of computing U_s = (1/2)k*x^2 = 0.5(200)(0.01) = 1.0 J.",
        "Compressing an ideal spring stores elastic potential energy according to U_s = (1/2)k*x^2. Plugging in k = 200 N/m and x = 0.10 m gives 0.5(200)(0.01) = 1.0 J.",
        "This choice is not supported because it omits squaring compression and computes (1/2)k*x = 0.5(200)(0.10) = 10 J instead of squaring 0.10 m for 1.0 J.",
        "This choice is not supported because it multiplies by ten instead of using 0.10 squared under the stated conditions and measurement model."
      ]
    },
    "ap-physics-1-u4-418": {
      "rationale": "Vector linear momentum is defined as p = m*v and shares the velocity vector's direction. Multiplying m = 0.40 kg by v = 5 m/s east gives p = 2.0 kg m/s east.",
      "choiceRationales": [
        "This choice is not supported because it divides mass by speed under the stated conditions and measurement model.",
        "Vector linear momentum is defined as p = m*v and shares the velocity vector's direction. Multiplying m = 0.40 kg by v = 5 m/s east gives p = 2.0 kg m/s east.",
        "This choice is not supported because it computes only the reciprocal of mass (1 / 0.40 = 2.5) instead of multiplying 0.40 kg by 5 m/s east to get 2.0 kg m/s east.",
        "This choice is not supported because it multiplies by mass reciprocal and overstates the result under the stated conditions and measurement model."
      ]
    },
    "ap-physics-1-u4-419": {
      "rationale": "Impulse from a constant force equals J = F * delta t in the direction of the force. Multiplying 6 N east by 0.50 s produces an impulse of 3 N s east.",
      "choiceRationales": [
        "This choice is not supported because it uses time alone under the stated conditions and measurement model.",
        "This choice is not supported because it adds force and time under the stated conditions and measurement model.",
        "Impulse from a constant force equals J = F * delta t in the direction of the force. Multiplying 6 N east by 0.50 s produces an impulse of 3 N s east.",
        "This choice is not supported because it divides force by time (6 / 0.50 = 12 N s), quadrupling the correct 3 N s east impulse rather than multiplying F by delta t."
      ]
    },
    "ap-physics-1-u4-420": {
      "rationale": "In a perfectly inelastic collision with no external horizontal impulse, momentum is conserved: m1*v1 + m2*v2 = (m1 + m2)*v_f. Solving 2(6) + 1(0) = (2 + 1)*v_f gives 12 = 3*v_f, so v_f = 4 m/s east.",
      "choiceRationales": [
        "This choice is not supported because it divides initial speed by combined mass (6 / 3 = 2 m/s), omitting the 2 kg moving cart mass from initial momentum.",
        "This choice is not supported because it divides the 12 kg m/s initial momentum by 4 kg (as if both carts were 2 kg) instead of the actual 3 kg combined mass.",
        "This choice is not supported because it assumes the stationary cart adds no inertia under the stated conditions and measurement model.",
        "In a perfectly inelastic collision with no external horizontal impulse, momentum is conserved: m1*v1 + m2*v2 = (m1 + m2)*v_f. Solving 2(6) + 1(0) = (2 + 1)*v_f gives 12 = 3*v_f, so v_f = 4 m/s east."
      ]
    },
    "ap-physics-1-u4-422": {
      "rationale": "The impulse-momentum theorem relates impulse magnitude to velocity change via |J| = m*|delta v|; dividing the 2400 N s net impulse by the 1200 kg car mass gives |delta v| = 2.0 m/s.",
      "choiceRationales": [
        "This choice is not supported because it divides mass by impulse (1200 kg / 2400 N s = 0.50) instead of dividing net impulse by mass to find 2.0 m/s.",
        "Impulse equals mass times velocity change, so 2400 N s divided by 1200 kg is 2.0 m/s.",
        "This choice is not supported because it uses mass as the velocity change under the stated conditions and measurement model.",
        "This choice is not supported because it fails to divide by the large mass under the stated conditions and measurement model."
      ]
    },
    "ap-physics-1-u5-430": {
      "rationale": "Torque magnitude is tau = r*F*sin(theta). Because the 12 N force acts at a right angle (theta = 90 deg, sin 90 = 1) at lever arm r = 0.25 m, tau = 0.25(12)(1) = 3.0 N m.",
      "choiceRationales": [
        "This choice is not supported because it divides force by lever arm with a shifted decimal (12 / 0.25 = 48, not 0.48) instead of multiplying (0.25 m)(12 N) = 3.0 N m.",
        "Torque magnitude is tau = r*F*sin(theta). Because the 12 N force acts at a right angle (theta = 90 deg, sin 90 = 1) at lever arm r = 0.25 m, tau = 0.25(12)(1) = 3.0 N m.",
        "This choice is not supported because it adds the two quantities under the stated conditions and measurement model.",
        "This choice is not supported because it uses the reciprocal of the lever arm under the stated conditions and measurement model."
      ]
    },
    "ap-physics-1-u5-431": {
      "rationale": "Covering 8 m each second gives linear speed v = 8 m/s. Because the 0.40 m wheel rolls without slipping, omega = v / r = 8 / 0.40 = 20 rad/s.",
      "choiceRationales": [
        "This choice is not supported because it multiplies speed and radius under the stated conditions and measurement model.",
        "This choice is not supported because it subtracts speed and radius under the stated conditions and measurement model.",
        "Covering 8 m each second gives linear speed v = 8 m/s. Because the 0.40 m wheel rolls without slipping, omega = v / r = 8 / 0.40 = 20 rad/s.",
        "This choice is not supported because it multiplies speed by four (8 times 4 = 32) instead of dividing 8 m/s by the 0.40 m wheel radius to obtain 20 rad/s."
      ]
    },
    "ap-physics-1-u5-432": {
      "rationale": "Setting net torque to zero about the near end balances the clockwise torque of the central load, (10 N)(1 m) = 10 N m, with the far-end upward torque F(2 m), yielding F = 10 / 2 = 5 N upward.",
      "choiceRationales": [
        "This choice is not supported because it understates the required balancing force rather than solving F*(2 m) = (10 N)*(1 m) for F = 5 N upward.",
        "This choice is not supported because it matches force without matching torque under the stated conditions and measurement model.",
        "This choice is not supported because it doubles rather than halves the required end force under the stated conditions and measurement model.",
        "The center force gives 10 N times 1 m, so the far-end force must satisfy F times 2 m = 10 N m, giving 5 N."
      ]
    },
    "ap-physics-1-u5-433": {
      "rationale": "For rotation about a fixed axis, angular momentum satisfies L = I*omega; solving omega = L / I by dividing 6 kg m^2/s by the 2 kg m^2 rotational inertia yields an angular speed of 3 rad/s.",
      "choiceRationales": [
        "Angular momentum equals rotational inertia times angular speed, so 6 divided by 2 gives 3 rad/s.",
        "This choice is not supported because it inverts inertia and angular momentum under the stated conditions and measurement model.",
        "This choice is not supported because it subtracts rotational inertia from angular momentum (6 - 2 = 4) despite unlike units instead of dividing 6 by 2 for 3 rad/s.",
        "This choice is not supported because it multiplies them and produces the wrong dimensions under the stated conditions and measurement model."
      ]
    },
    "ap-physics-1-u6-441": {
      "rationale": "The no-slip kinematic constraint omega = v / r depends only on speed and radius, not on the hoop's inertia factor. Dividing v = 6 m/s by r = 0.30 m gives 20 rad/s.",
      "choiceRationales": [
        "The no-slip kinematic constraint omega = v / r depends only on speed and radius, not on the hoop's inertia factor. Dividing v = 6 m/s by r = 0.30 m gives 20 rad/s.",
        "This choice is not supported because it multiplies speed and radius under the stated conditions and measurement model.",
        "This choice is not supported because it adds the two values under the stated conditions and measurement model.",
        "This choice is not supported because it squares the linear speed (6^2 = 36) instead of applying the no-slip relation omega = v / r = 6 / 0.30 = 20 rad/s."
      ]
    },
    "ap-physics-1-u6-442": {
      "rationale": "Applying the rotational kinetic energy formula K_rot = (1/2)I*omega^2 with rotational inertia 4 kg m^2 and angular speed 3 rad/s gives 0.5(4)(9) = 18 J.",
      "choiceRationales": [
        "This choice is not supported because it omits squaring angular speed and computes (1/2)I*omega = 0.5(4)(3) = 6 J instead of 0.5(4)(9) = 18 J.",
        "Rotational kinetic energy is one-half I omega squared = 0.5 times 4 times 9 = 18 J.",
        "This choice is not supported because it computes angular momentum I*omega = (4)(3) = 12, omitting both the one-half factor and the square on angular speed.",
        "This choice is not supported because it multiplies by an extra factor of two under the stated conditions and measurement model."
      ]
    },
    "ap-physics-1-u6-443": {
      "rationale": "For a point mass moving perpendicular to the radius vector in a circle, angular momentum magnitude about the center is L = r_perp * p = m*r*v; multiplying (0.25 kg)(0.80 m)(5 m/s) yields 1.0 kg m^2/s.",
      "choiceRationales": [
        "This choice is not supported because it divides radius by speed (0.80 / 5 = 0.16) while omitting mass instead of multiplying m*r*v = (0.25)(0.80)(5) = 1.0 kg m^2/s.",
        "This choice is not supported because it doubles the radius-mass-speed product under the stated conditions and measurement model.",
        "For a point mass, angular momentum magnitude is mrv = 0.25 times 0.80 times 5 = 1.0 kg m2/s.",
        "This choice is not supported because it multiplies speed by radius (5 times 0.80 = 4.0) while omitting the 0.25 kg mass from L = m*r*v = 1.0 kg m^2/s."
      ]
    },
    "ap-physics-1-u8-457": {
      "rationale": "Archimedes' principle gives buoyant force F_b = rho_water*g*V_sub upward. Using water density 1000 kg/m3, g = 10 N/kg, and V = 0.020 m3 yields 1000(10)(0.020) = 200 N upward.",
      "choiceRationales": [
        "Archimedes' principle gives buoyant force F_b = rho_water*g*V_sub upward. Using water density 1000 kg/m3, g = 10 N/kg, and V = 0.020 m3 yields 1000(10)(0.020) = 200 N upward.",
        "This choice is not supported because it omits water density (1000 kg/m^3) and multiplies only g*V = (10 N/kg)(0.020 m^3) = 0.20 N instead of 200 N upward.",
        "This choice is not supported because it omits the 10 N/kg gravitational field and multiplies only rho*V = (1000)(0.020) = 20 kg instead of rho*g*V = 200 N upward.",
        "This choice is not supported because it multiplies by an extra factor of ten under the stated conditions and measurement model."
      ]
    },
    "ap-physics-1-u1-462": {
      "rationale": "Under constant acceleration, final velocity obeys v = v0 + a*t; choosing east as positive gives v = 2 m/s + (-3 m/s^2)(4 s) = 2 - 12 = -10 m/s, which is 10 m/s west.",
      "choiceRationales": [
        "This choice is not supported because it adds initial speed and acceleration magnitude (2 + 3 = 5) without multiplying by 4 s or applying the westward sign of acceleration.",
        "Taking east as positive gives final velocity 2 plus negative 3 times 4 = negative 10 m/s, or 10 m/s west.",
        "This choice is not supported because it reverses only the initial velocity sign under the stated conditions and measurement model.",
        "This choice is not supported because it adds magnitudes while ignoring the chosen axis under the stated conditions and measurement model."
      ]
    },
    "ap-physics-1-u1-464": {
      "rationale": "Relative velocity follows vector subtraction v_C/B = v_C/G - v_B/G; taking east as positive gives (+6 m/s) - (-2 m/s) = +8 m/s, so the cyclist moves at 8 m/s east relative to the conveyor.",
      "choiceRationales": [
        "This choice is not supported because it subtracts magnitudes without representing opposite directions under the stated conditions and measurement model.",
        "This choice is not supported because it assigns the conveyor the wrong sign under the stated conditions and measurement model.",
        "This choice is not supported because it finds the correct 8 m/s relative speed magnitude but reverses the direction to west instead of (+6 m/s) - (-2 m/s) = +8 m/s east.",
        "Relative velocity follows vector subtraction v_C/B = v_C/G - v_B/G; taking east as positive gives (+6 m/s) - (-2 m/s) = +8 m/s, so the cyclist moves at 8 m/s east relative to the conveyor."
      ]
    },
    "ap-physics-1-u2-467": {
      "rationale": "Newton's second law sets acceleration equal to net force divided by mass: subtracting 10 N of opposing friction from the 30 N pull yields 20 N in the pull direction, and 20 N / 5 kg = 4 m/s^2 in the pull direction.",
      "choiceRationales": [
        "This choice is not supported because it uses friction as the net force under the stated conditions and measurement model.",
        "This choice is not supported because it divides the 30 N applied pull by 5 kg (30 / 5 = 6 m/s^2) without subtracting the 10 N opposing kinetic friction first.",
        "The net force is 30 N minus 10 N = 20 N, so acceleration is 20 N divided by 5 kg = 4 m/s2.",
        "This choice is not supported because it adds applied pull and friction ((30 + 10) / 5 = 8 m/s^2) and reverses the direction instead of computing (30 - 10) / 5 = 4 m/s^2."
      ]
    },
    "ap-physics-1-u3-474": {
      "rationale": "By the work-energy theorem, K_f = K_i + W_net; initial kinetic energy is 0.5(2 kg)(3 m/s)^2 = 9 J, so adding 16 J gives K_f = 25 J and v_f = sqrt(2*25 / 2) = 5 m/s.",
      "choiceRationales": [
        "This choice is not supported because it leaves the initial 3 m/s speed unchanged even though 16 J of positive net work increases the cart's kinetic energy from 9 J to 25 J.",
        "By the work-energy theorem, K_f = K_i + W_net; initial kinetic energy is 0.5(2 kg)(3 m/s)^2 = 9 J, so adding 16 J gives K_f = 25 J and v_f = sqrt(2*25 / 2) = 5 m/s.",
        "This choice is not supported because it adds the speed equivalent of 16 J alone (4 m/s) directly to the initial 3 m/s instead of adding kinetic energies before taking the square root.",
        "This choice is not supported because it chooses the largest speed without solving the energy relation under the stated conditions and measurement model."
      ]
    },
    "ap-physics-1-u3-475": {
      "rationale": "Total input energy equals input power times time, E_in = (1000 W)(20 s) = 20 kJ; efficiency is useful output divided by input, 12 kJ / 20 kJ = 0.60, or 60 percent.",
      "choiceRationales": [
        "This choice is not supported because it divides time by useful energy (20 / 12 = 1.67) rather than dividing 12 kJ useful output by the 20 kJ total input energy.",
        "This choice is not supported because it divides by the numerical power without matching energy units under the stated conditions and measurement model.",
        "Input energy is 1000 W times 20 s = 20 kJ, so efficiency is 12 kJ divided by 20 kJ = 60 percent.",
        "This choice is not supported because it allows useful output to exceed input under the stated conditions and measurement model."
      ]
    },
    "ap-physics-1-u4-477": {
      "rationale": "Initial momentum is 1 kg m/s east; subtracting 5 kg m/s east equivalent impulse gives final momentum 4 kg m/s west, or 16 m/s west.",
      "choiceRationales": [
        "Initial momentum is 1 kg m/s east; subtracting 5 kg m/s east equivalent impulse gives final momentum 4 kg m/s west, or 16 m/s west.",
        "This choice is not supported because it reports the initial 1 kg m/s eastward momentum magnitude as final velocity without subtracting the 5 N s westward impulse.",
        "This choice is not supported because it subtracts magnitudes without tracking reversal under the stated conditions and measurement model.",
        "This choice is not supported because it overstates the final speed rather than dividing the net 4 kg m/s westward momentum by 0.25 kg to obtain 16 m/s west."
      ]
    },
    "ap-physics-1-u4-479": {
      "rationale": "By the impulse-momentum theorem (J = m(v_f - v_i)), choosing east as positive gives J = (1 kg)(-2 m/s - 3 m/s) = -5 kg m/s, which equals an impulse of 5 N s directed west.",
      "choiceRationales": [
        "This choice is not supported because it uses speed difference without including the reversal under the stated conditions and measurement model.",
        "This choice is not supported because it reverses the signed impulse under the stated conditions and measurement model.",
        "By the impulse-momentum theorem (J = m(v_f - v_i)), choosing east as positive gives J = (1 kg)(-2 m/s - 3 m/s) = -5 kg m/s, which equals an impulse of 5 N s directed west.",
        "This choice is not supported because it computes the correct 5 N s magnitude from direction reversal but assigns the wrong eastward sign instead of 5 N s west."
      ]
    },
    "ap-physics-1-u5-484": {
      "rationale": "With negligible external torque, angular momentum L = I*omega stays conserved at 12 kg m^2/s; halving rotational inertia to 2 kg m^2 doubles angular speed to omega = L / I = 12 / 2 = 6 rad/s.",
      "choiceRationales": [
        "This choice is not supported because it uses the original inertia after the change under the stated conditions and measurement model.",
        "This choice is not supported because it subtracts the original 4 kg m^2 inertia from angular momentum (12 - 4 = 8) instead of dividing conserved L = 12 by I_f = 2.",
        "This choice is not supported because it multiplies rather than divides conserved angular momentum by inertia under the stated conditions and measurement model.",
        "With angular momentum conserved, omega equals L divided by I, so 12 divided by 2 = 6 rad/s."
      ]
    },
    "ap-physics-1-u5-485": {
      "rationale": "Lever-arm torque equals tau = r*F*sin(theta), where sin(30 deg) = 0.50 selects the perpendicular component. Multiplying 0.50 m by 10 N and 0.50 gives tau = 2.5 N m.",
      "choiceRationales": [
        "Lever-arm torque equals tau = r*F*sin(theta), where sin(30 deg) = 0.50 selects the perpendicular component. Multiplying 0.50 m by 10 N and 0.50 gives tau = 2.5 N m.",
        "This choice is not supported because it uses the full force without the perpendicular component under the stated conditions and measurement model.",
        "This choice is not supported because it computes F*cos(30 deg) = 10(0.866) = 8.7 N, both using cosine instead of sine and omitting the 0.50 m lever arm.",
        "This choice is not supported because it divides by lever arm rather than multiplying under the stated conditions and measurement model."
      ]
    },
    "ap-physics-1-u6-487": {
      "rationale": "For a rotating wheel, rotational kinetic energy obeys K_rot = (1/2)I*omega^2; substituting I = 2 kg m^2 and omega = 6 rad/s gives 0.5(2)(36) = 36 J.",
      "choiceRationales": [
        "This choice is not supported because it omits the angular-speed square under the stated conditions and measurement model.",
        "This choice is not supported because it halves the true 36 J rotational kinetic energy instead of evaluating K_rot = (1/2)(2 kg m^2)(6 rad/s)^2 = 36 J.",
        "Rotational kinetic energy is one-half I omega squared = 0.5 times 2 times 36 = 36 J.",
        "This choice is not supported because it doubles the energy after applying the correct expression under the stated conditions and measurement model."
      ]
    },
    "ap-physics-1-u7-492": {
      "rationale": "Oscillation frequency is the inverse of the period, f = 1 / T. With each complete cycle taking T = 0.25 s, the spring completes f = 1 / 0.25 = 4 Hz (4 cycles per second).",
      "choiceRationales": [
        "This choice is not supported because it uses period itself as frequency under the stated conditions and measurement model.",
        "This choice is not supported because it divides by a factor of two without basis under the stated conditions and measurement model.",
        "This choice is not supported because it shifts the decimal of the 0.25 s period two places right instead of taking the reciprocal f = 1 / 0.25 s = 4 Hz.",
        "Oscillation frequency is the inverse of the period, f = 1 / T. With each complete cycle taking T = 0.25 s, the spring completes f = 1 / 0.25 = 4 Hz (4 cycles per second)."
      ]
    },
    "ap-physics-1-u8-497": {
      "rationale": "At depth h beneath an open water surface, hydrostatic gauge pressure is P_gauge = rho*g*h. Substituting 1000 kg/m3, 10 N/kg, and 3 m produces 30,000 Pa.",
      "choiceRationales": [
        "At depth h beneath an open water surface, hydrostatic gauge pressure is P_gauge = rho*g*h. Substituting 1000 kg/m3, 10 N/kg, and 3 m produces 30,000 Pa.",
        "This choice is not supported because it misplaces the depth factor under the stated conditions and measurement model.",
        "This choice is not supported because it uses density without gravitational field under the stated conditions and measurement model.",
        "This choice is not supported because it multiplies the 30,000 Pa gauge pressure by an extra factor of ten (adding ~101 kPa atmospheric pressure would give ~131 kPa, not 300 kPa)."
      ]
    },
    "ap-physics-1-u8-499": {
      "rationale": "Incompressible continuity requires constant volume flow rate A1*v1 = A2*v2. Solving v2 = (A1 / A2)*v1 gives (0.06 / 0.02)(2 m/s) = 3(2) = 6 m/s at the narrower exit.",
      "choiceRationales": [
        "This choice is not supported because it divides the areas in the wrong order under the stated conditions and measurement model.",
        "This choice is not supported because it assumes speed is fixed despite the area change under the stated conditions and measurement model.",
        "Incompressible continuity requires constant volume flow rate A1*v1 = A2*v2. Solving v2 = (A1 / A2)*v1 gives (0.06 / 0.02)(2 m/s) = 3(2) = 6 m/s at the narrower exit.",
        "This choice is not supported because it applies the 3:1 area ratio twice (2 times 3 times 3 = 18 m/s) instead of once in the continuity equation v2 = (A1 / A2)*v1 = 6 m/s."
      ]
    }
  }
};
