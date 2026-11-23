'use strict';

module.exports = {
  ap_physics_1_foundation_pilot: {
    'ap-physics-1-u1-004':
      'Using the constant-velocity position equation x(t) = x0 + v*t with x0 = 2.0 m and v = 3.0 m/s, substituting t = 4.0 s gives x = 2.0 + 3.0(4.0) = 2.0 + 12.0 = 14.0 m.',
    'ap-physics-1-u1-006':
      'Because east and north components are perpendicular, apply the Pythagorean theorem: |d| = sqrt(dx^2 + dy^2). Substituting 6 m and 8 m gives sqrt(36 + 64) = sqrt(100) = 10 m.',
    'ap-physics-1-u1-018':
      'Acceleration is the time rate of change of velocity (a = dv/dt). When a(t) = 0 throughout the interval, delta v = 0, so the object maintains its initial nonzero constant velocity.',
    'ap-physics-1-u2-025':
      'Newton\'s second law relates acceleration to net force and mass via a = F_net / m. Dividing the 10 N horizontal net force by the 2 kg cart mass yields a = 10 / 2 = 5 m/s2.',
    'ap-physics-1-u2-038':
      'First combine opposing horizontal forces to find F_net = 15 N east - 5 N west = 10 N east. Applying Newton\'s second law a = F_net / m gives 10 N / 5 kg = 2 m/s2 east.',
    'ap-physics-1-u3-054':
      'Mechanical work done by a constant force at angle theta to displacement is W = F*d*cos(theta). Substituting F = 10 N, d = 5 m, and cos(60 deg) = 0.5 gives W = 10(5)(0.5) = 25 J.',
    'ap-physics-1-u3-056':
      'On an energy-versus-time graph, the slope equals delta E / delta t, the rate at which energy is transferred. By definition, P = delta E / delta t, so the slope represents power delivered.',
    'ap-physics-1-u3-057':
      'Elastic potential energy stored in an ideal Hookean spring is U_s = (1/2)k*x^2. With k = 200 N/m and compression x = 0.10 m, U_s = 0.5(200)(0.10)^2 = 100(0.01) = 1.0 J.',
    'ap-physics-1-u4-064':
      'Linear momentum is the vector product of mass and velocity, p = m*v, pointing in the direction of motion. Multiplying m = 0.50 kg by v = 6 m/s east yields p = 3.0 kg m/s east.',
    'ap-physics-1-u4-069':
      'Impulse delivered by an average force over a contact interval is J = F_avg * delta t, independent of the ball\'s mass. Multiplying 30 N by 0.10 s produces J = 3.0 N s.',
    'ap-physics-1-u5-089':
      'Torque magnitude is tau = r*F for perpendicular forces: the first gives 0.40(30) = 12 N m and the opposing second gives 0.60(20) = 12 N m. Because they oppose, net torque is 12 - 12 = 0 N m.',
    'ap-physics-1-u5-092':
      'For a force applied at angle theta to the lever arm, torque magnitude obeys tau = r*F*sin(theta). Substituting r = 0.50 m, F = 10 N, and sin(30 deg) = 0.50 yields tau = 0.50(10)(0.50) = 2.5 N m.',
    'ap-physics-1-u6-103':
      'Rotational kinetic energy of a rigid body is K_rot = (1/2)I*omega^2. Substituting rotational inertia I = 4 kg m2 and omega = 5 rad/s gives K_rot = 0.5(4)(5^2) = 2(25) = 50 J.',
    'ap-physics-1-u6-105':
      'Angular impulse equals constant net torque multiplied by duration, delta L = tau * delta t. Applying tau = 8 N m over delta t = 0.50 s delivers 8(0.50) = 4 N m s of angular impulse.',
    'ap-physics-1-u6-110':
      'By rotational Newton\'s second law, net external torque equals the rate of change of angular momentum (tau_net = dL/dt). A constant positive slope on L vs t means constant positive external torque.',
    'ap-physics-1-u7-119':
      'Frequency and period of a periodic oscillator are reciprocals, f = 1 / T. Substituting the pendulum\'s period T = 2.0 s gives f = 1 / 2.0 s = 0.50 Hz (half a cycle per second).',
    'ap-physics-1-u7-126':
      'By Hooke\'s law, the restoring force magnitude of an ideal spring is |F_s| = k*|x|. Multiplying stiffness k = 100 N/m by displacement x = 0.20 m gives a 20 N restoring force.',
    'ap-physics-1-u8-133':
      'Hydrostatic gauge pressure at depth h in an incompressible fluid is P_gauge = rho*g*h. Substituting rho = 1000 kg/m3, g = 10 m/s2, and h = 2.0 m gives 1000(10)(2.0) = 20,000 Pa.',
    'ap-physics-1-u6-154':
      'Rotational kinetic energy depends directly on I and omega via K_rot = (1/2)I*omega^2 (mass is already encoded in I). Computing 0.5(0.25 kg m2)(8 rad/s)^2 = 0.125(64) gives 8 J.',
    'ap-physics-1-u1-166':
      'Displacement equals the area under a velocity-time graph. Using three 1 s trapezoids, areas are (2+4)/2 = 3 m, (4+5)/2 = 4.5 m, and (5+7)/2 = 6 m, summing to 3 + 4.5 + 6 = 13.5 m.',
    'ap-physics-1-u2-174':
      'Subtract opposite forces to get net force F_net = 18 N east - 8 N west = 10 N east. By Newton\'s second law a = F_net / m, dividing 10 N east by 5 kg produces 2.0 m/s2 east.',
    'ap-physics-1-u2-180':
      'With negligible acceleration, vertical equilibrium sets sensor tension equal to weight: F_sensor = m*g. Solving m = F_g / g near Earth\'s surface gives 9.8 N / 9.8 m/s2 = 1.0 kg.',
    'ap-physics-1-u3-196':
      'Only the force component parallel to displacement does work: W = F*d*cos(theta). With F = 12 N, d = 5 m, and cos(60 deg) = 0.5, the work done is 12(5)(0.5) = 30 J.',
    'ap-physics-1-u3-199':
      'Potential energy stored in a stretched linear spring obeys U_s = (1/2)k*x^2. Substituting k = 150 N/m and stretch x = 0.20 m gives U_s = 0.5(150)(0.04) = 75(0.04) = 3.0 J.',
    'ap-physics-1-u4-220':
      'With no external horizontal impulse, momentum is conserved in a perfectly inelastic collision: m1*v1 + m2*v2 = (m1 + m2)*v_f. Solving 2(3) + 1(0) = 3*v_f gives v_f = 6 / 3 = 2.0 m/s east.',
    'ap-physics-1-u5-229':
      'When a force acts perpendicular to the lever arm (theta = 90 deg, sin 90 = 1), torque simplifies to tau = r*F. Multiplying r = 0.40 m by F = 15 N gives tau = 6.0 N m.',
    'ap-physics-1-u5-230':
      'Torque uses the perpendicular force component via tau = r*F*sin(theta). Substituting r = 0.50 m, F = 20 N, and sin(30 deg) = 0.50 gives tau = 0.50(20)(0.50) = 5.0 N m.',
    'ap-physics-1-u5-231':
      'A single point mass at distance r from the rotation axis has rotational inertia I = m*r^2. Substituting m = 2 kg and r = 0.50 m gives I = 2(0.50)^2 = 2(0.25) = 0.50 kg m2.',
    'ap-physics-1-u5-233':
      'A constant torque acting over time interval delta t imparts angular impulse J_ang = tau * delta t. Multiplying tau = 4 N m by delta t = 3 s yields 12 N m s.',
    'ap-physics-1-u6-241':
      'Rolling without slipping links linear center-of-mass speed and angular speed via v = r*omega. Solving omega = v / r for v = 3.0 m/s and r = 0.30 m gives 3.0 / 0.30 = 10 rad/s.',
    'ap-physics-1-u8-252':
      'Fluid gauge pressure increases linearly with depth as P_gauge = rho*g*h. Substituting rho = 1000 kg/m3, g = 9.8 m/s2, and h = 2.0 m gives 1000(9.8)(2.0) = 19,600 Pa.',
    'ap-physics-1-u8-254':
      'Volume flow rate through a pipe cross-section is Q = A*v. Multiplying cross-sectional area A = 0.030 m2 by fluid speed v = 2.0 m/s gives Q = 0.060 m3/s.',
    'ap-physics-1-u8-258':
      'By the continuity equation A1*v1 = A2*v2 for steady incompressible flow, reducing area by 20% leaves A2 = 0.80*A1. Therefore v2 = v1 / 0.80 = 1.25*v1, rising by a factor of 1.25.',
    'ap-physics-1-u2-279':
      'Kinetic friction opposes the applied pull, giving horizontal net force F_net = 50 N - 14 N = 36 N. By Newton\'s second law a = F_net / m, the crate accelerates at 36 / 12 = 3.0 m/s2.',
    'ap-physics-1-u3-300':
      'Because the 25 N force points in the same direction as the 3 m displacement (theta = 0 deg, cos 0 = 1), work is simply W = F*d = 25(3) = 75 J.',
    'ap-physics-1-u3-301':
      'Rearranging spring potential energy U_s = (1/2)k*x^2 for the spring constant gives k = 2*U_s / x^2. Substituting U_s = 8 J and x = 0.20 m yields k = 16 / 0.04 = 400 N/m.',
    'ap-physics-1-u3-302':
      'Average useful power is the ratio of useful work done to elapsed time, P_avg = W / delta t. Dividing 12,000 J by 20 s yields P_avg = 600 W.',
    'ap-physics-1-u4-313':
      'By the impulse-momentum theorem, J = integral of F dt = delta p. Because positive and negative force-time areas carry opposite signs, the net signed area equals net impulse and momentum change.',
    'ap-physics-1-u4-320':
      'Solving the momentum definition p = m*v for velocity gives v = p / m in the same direction as momentum. Dividing 20 kg m/s west by 4 kg yields v = 5 m/s west.',
    'ap-physics-1-u5-329':
      'Applying a force at 90 degrees to a wrench maximizes the lever arm so tau = r*F. Multiplying r = 0.25 m by F = 30 N yields a torque magnitude of 7.5 N m.',
    'ap-physics-1-u5-330':
      'For a point particle orbiting at radius r, rotational inertia is I = m*r^2. Substituting m = 1.5 kg and r = 0.40 m gives I = 1.5(0.16) = 0.24 kg m2.',
    'ap-physics-1-u6-340':
      'Under the no-slip rolling constraint v = r*omega, angular speed equals linear speed divided by radius. Substituting v = 4.0 m/s and r = 0.20 m yields omega = 4.0 / 0.20 = 20 rad/s.',
    'ap-physics-1-u6-341':
      'Rigid-body angular momentum satisfies L = I*omega, so rotational inertia is I = L / omega. Dividing L = 18 kg m2/s by omega = 6 rad/s gives I = 3 kg m2.',
    'ap-physics-1-u7-349':
      'At maximum displacement x = A, all mechanical energy of an ideal spring oscillator is elastic potential energy: E = (1/2)k*A^2. Computing 0.5(80)(0.25)^2 = 40(0.0625) gives 2.5 J.',
    'ap-physics-1-u8-356':
      'Hydrostatic pressure change across a vertical depth difference delta h is delta P = rho*g*delta h. Substituting rho = 800 kg/m3, g = 10 m/s2, and delta h = 5 m yields 40,000 Pa.',
    'ap-physics-1-u8-357':
      'By Archimedes\' principle, upward buoyant force equals the weight of displaced fluid: F_b = rho_fluid*g*V_sub. Computing 1200(10)(0.010) gives 120 N upward.',
    'ap-physics-1-u1-367':
      'Average velocity is displacement divided by elapsed time, v_avg = (x_f - x_i) / delta t. Computing (2.18 m - 2.00 m) / 0.060 s = 0.18 / 0.060 gives 3.0 m/s.',
    'ap-physics-1-u3-402':
      'Useful power measures energy transferred per unit time via P = delta E / delta t. Dividing the 900 J energy transfer by the 15 s interval yields P = 60 W.',
    'ap-physics-1-u3-410':
      'Compressing an ideal spring stores elastic potential energy according to U_s = (1/2)k*x^2. Plugging in k = 200 N/m and x = 0.10 m gives 0.5(200)(0.01) = 1.0 J.',
    'ap-physics-1-u4-418':
      'Vector linear momentum is defined as p = m*v and shares the velocity vector\'s direction. Multiplying m = 0.40 kg by v = 5 m/s east gives p = 2.0 kg m/s east.',
    'ap-physics-1-u4-419':
      'Impulse from a constant force equals J = F * delta t in the direction of the force. Multiplying 6 N east by 0.50 s produces an impulse of 3 N s east.',
    'ap-physics-1-u5-431':
      'Covering 8 m each second gives linear speed v = 8 m/s. Because the 0.40 m wheel rolls without slipping, omega = v / r = 8 / 0.40 = 20 rad/s.',
    'ap-physics-1-u6-441':
      'The no-slip kinematic constraint omega = v / r depends only on speed and radius, not on the hoop\'s inertia factor. Dividing v = 6 m/s by r = 0.30 m gives 20 rad/s.',
    'ap-physics-1-u8-456':
      'From the definition of density rho = m / V, fluid mass is m = rho*V. Multiplying 1000 kg/m3 by 0.003 m3 cancels cubic meters and gives m = 3 kg.',
    'ap-physics-1-u8-457':
      'Archimedes\' principle gives buoyant force F_b = rho_water*g*V_sub upward. Using water density 1000 kg/m3, g = 10 N/kg, and V = 0.020 m3 yields 1000(10)(0.020) = 200 N upward.',
    'ap-physics-1-u3-472':
      'Work by an angled pull equals W = F*delta x*cos(theta), using only the horizontal component. With F = 40 N, delta x = 5 m, and cos(60 deg) = 0.5, W = 40(5)(0.5) = 100 J.',
    'ap-physics-1-u5-485':
      'Lever-arm torque equals tau = r*F*sin(theta), where sin(30 deg) = 0.50 selects the perpendicular component. Multiplying 0.50 m by 10 N and 0.50 gives tau = 2.5 N m.',
    'ap-physics-1-u6-489':
      'Angular impulse equals the change in angular momentum, delta L = tau * delta t. Sustaining a 4 N m torque on the platform for 3 s delivers 4(3) = 12 N m s.',
    'ap-physics-1-u7-492':
      'Oscillation frequency is the inverse of the period, f = 1 / T. With each complete cycle taking T = 0.25 s, the spring completes f = 1 / 0.25 = 4 Hz (4 cycles per second).',
    'ap-physics-1-u8-497':
      'At depth h beneath an open water surface, hydrostatic gauge pressure is P_gauge = rho*g*h. Substituting 1000 kg/m3, 10 N/kg, and 3 m produces 30,000 Pa.',
    'ap-physics-1-u8-499':
      'Incompressible continuity requires constant volume flow rate A1*v1 = A2*v2. Solving v2 = (A1 / A2)*v1 gives (0.06 / 0.02)(2 m/s) = 3(2) = 6 m/s at the narrower exit.',
  },
  ap_statistics_foundation_pilot: {
    'ap-statistics-foundation-pilot-item-024':
      'By the complement rule, an event and its complement partition the sample space so P(not A) = 1 - P(A). Substituting P(A) = 0.62 gives 1 - 0.62 = 0.38.',
    'ap-statistics-foundation-pilot-item-026':
      'Conditioning on borrowing a book restricts the sample space from 80 visitors to the 32 borrowers. Since 20 of those 32 also use a study room, P(study room | book) = 20 / 32 = 0.625.',
    'ap-statistics-foundation-pilot-item-027':
      'When two events A and B are independent, their joint probability obeys the multiplication rule P(A and B) = P(A)*P(B). Multiplying 0.4 by 0.5 yields 0.20.',
    'ap-statistics-foundation-pilot-item-033':
      'The expected value (mean) of a binomial random variable X ~ Bin(n, p) is mu_X = n*p. Substituting n = 40 trials and success probability p = 0.25 gives 40(0.25) = 10.',
    'ap-statistics-foundation-pilot-item-042':
      'When the 10% condition holds, the standard deviation of p-hat is sqrt(p*(1 - p) / n). Substituting p = 0.40 and n = 100 gives sqrt(0.40(0.60) / 100) = sqrt(0.0024) approx 0.049.',
    'ap-statistics-foundation-pilot-item-052':
      'Because sample proportions are unbiased estimators, the mean of the sampling distribution of p-hat1 - p-hat2 is p1 - p2 regardless of sample sizes: 0.50 - 0.40 = 0.10.',
    'ap-statistics-foundation-pilot-item-061':
      'For random samples of size n, the standard deviation of the sample mean is sigma_x-bar = sigma / sqrt(n). Substituting sigma = 12 and n = 36 gives 12 / sqrt(36) = 12 / 6 = 2.',
    'ap-statistics-foundation-pilot-item-088':
      'A regression residual equals observed minus predicted response, e = y - y-hat. Subtracting the predicted value 35 from the actual value 41 yields 41 - 35 = 6.',
    'ap-statistics-foundation-pilot-item-091':
      'In simple linear regression, the coefficient of determination r^2 equals the square of the correlation r. Squaring r = 0.70 gives (0.70)^2 = 0.49, or 49% variance explained.',
    'ap-statistics-foundation-pilot-item-103':
      'Relative frequency equals category count divided by total observations. Summing 45 + 75 + 30 gives 150 students total, so the bus-rider relative frequency is 75 / 150 = 0.50.',
    'ap-statistics-foundation-pilot-item-111':
      'Choosing a random starting point on an ordered roster and then selecting every kth (10th) individual thereafter is the defining procedure of a systematic random sample.',
    'ap-statistics-foundation-pilot-item-116':
      'An empirical probability from a simulation equals the proportion of repetitions meeting the criterion. Dividing 31 successes by 500 repetitions yields 31 / 500 = 0.062.',
    'ap-statistics-foundation-pilot-item-119':
      'By the conditional probability formula, P(A | B) = P(A and B) / P(B). Dividing the joint probability 0.18 by the conditioning event probability 0.30 gives 0.18 / 0.30 = 0.60.',
    'ap-statistics-foundation-pilot-item-126':
      'A statistic calculated from sample data (such as p-hat) to approximate an unknown population parameter (such as p) is formally called an estimator (or point estimator).',
    'ap-statistics-foundation-pilot-item-127':
      'The standard deviation of a sample proportion is sigma_p-hat = sqrt(p*(1 - p) / n). With p = 0.25 and n = 400, sqrt(0.25(0.75) / 400) = sqrt(0.00046875) approx 0.0217.',
    'ap-statistics-foundation-pilot-item-130':
      'A null hypothesis always specifies an equality statement about a population parameter rather than a sample statistic. Testing a claim of fewer than 18% sets H0: p = 0.18.',
    'ap-statistics-foundation-pilot-item-137':
      'The alternative hypothesis encodes the directional research claim using population parameters, not sample statistics. Claiming p1 is smaller than p2 corresponds to Ha: p1 - p2 < 0.',
    'ap-statistics-foundation-pilot-item-140':
      'In a two-way chi-square test of independence or homogeneity, degrees of freedom equal (r - 1)(c - 1). For 4 rows and 3 columns, df = (4 - 1)(3 - 1) = 3(2) = 6.',
    'ap-statistics-foundation-pilot-item-165':
      'Evaluate the fitted linear regression equation y-hat = a + b*x with intercept a = 18 and slope b = 2.4. Substituting x = 5 gives y-hat = 18 + 2.4(5) = 18 + 12 = 30.',
    'ap-statistics-foundation-pilot-item-169':
      'By the general multiplication rule, P(A and B) = P(A)*P(B | A), which holds whether or not events are independent. Multiplying 0.30 by 0.40 gives 0.12.',
    'ap-statistics-foundation-pilot-item-170':
      'Two events are statistically independent if and only if P(A and B) = P(A)*P(B). With P(A) = 0.60 and P(B) = 0.50, independence requires P(A and B) = 0.60(0.50) = 0.30.',
    'ap-statistics-foundation-pilot-item-176':
      'Because r^2 = 0.72 represents the proportion of y-variation explained by the linear model, the unexplained fraction is 1 - r^2 = 1 - 0.72 = 0.28, or about 28%.',
    'ap-statistics-foundation-pilot-item-199':
      'With r^2 = 0.81, 81% of variation in the response is accounted for by the linear relationship with x, leaving 1 - 0.81 = 0.19 (about 19% of response variation) unexplained.',
    'ap-statistics-foundation-pilot-item-202':
      'Because both grade level and transportation method are categorical variables, a segmented bar chart by grade level best displays and compares conditional category percentages.',
    'ap-statistics-foundation-pilot-item-206':
      'Surveying every single member of the defined target population (the entire club) rather than a subset constitutes a census of the club, eliminating sampling variability.',
    'ap-statistics-foundation-pilot-item-207':
      'Partitioning schools into homogeneous size strata first and then drawing random samples within every stratum ensures full subgroup representation, defining a stratified random sample.',
    'ap-statistics-foundation-pilot-item-212':
      'Applying the general multiplication rule conditioned on B gives P(A and B) = P(B)*P(A | B). Substituting P(B) = 0.50 and P(A | B) = 0.30 yields 0.50(0.30) = 0.15.',
    'ap-statistics-foundation-pilot-item-218':
      'Confidence interval width equals 2*z*SE, where standard error decreases inversely with sqrt(n). At a fixed confidence level, increasing sample size shrinks SE and narrows the interval.',
    'ap-statistics-foundation-pilot-item-221':
      'A Type I error (false positive, with probability alpha) occurs when sample evidence leads a hypothesis test to reject H0 even though the null hypothesis is actually true.',
    'ap-statistics-foundation-pilot-item-226':
      'Estimating one unknown population standard deviation from a sample of size n uses one degree of freedom, so a one-sample t interval has df = n - 1 = 18 - 1 = 17.',
    'ap-statistics-foundation-pilot-item-233':
      'Points clustered tightly along a straight line indicate a strong linear relationship, and a downward slope from left to right indicates a negative association between x and y.',
    'ap-statistics-foundation-pilot-item-234':
      'Correlation r averages products of standardized z-scores, which are dimensionless and invariant under positive linear rescaling. Multiplying all response values by 3 leaves r unchanged.',
    'ap-statistics-foundation-pilot-item-235':
      'A regression slope b gives the predicted change in y per one-unit increase in x via delta y-hat = b * delta x. For b = 1.8 and delta x = 5, delta y-hat = 1.8(5) = 9 response units.',
    'ap-statistics-foundation-pilot-item-237':
      'A fanning or funnel-shaped residual plot shows residual spread widening as x grows (heteroscedasticity), violating the linear-regression condition of constant error variance across x.',
  },
};
