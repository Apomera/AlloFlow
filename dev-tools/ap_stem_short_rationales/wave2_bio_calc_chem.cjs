'use strict';

module.exports = {
  ap_biology_foundation_pilot: {
    'ap-bio-u8-046':
      'In logistic growth (dN/dt = rN(1 - N/K)), abundant resources support rapid early expansion, then density-dependent limiting factors slow growth until population size stabilizes near carrying capacity K.',
  },
  ap_calculus_ab_foundation_pilot: {
    'ap-calculus-ab-foundation-pilot-item-001':
      'A limit depends only on behavior near x = 2, not the point value f(2) = 9. Because both left-hand and right-hand values approach 5 as x approaches 2, the two-sided limit equals 5.',
    'ap-calculus-ab-foundation-pilot-item-002':
      'A two-sided limit exists if and only if both one-sided limits are finite and equal. Here lim_{x->4-} g(x) = 3 does not equal lim_{x->4+} g(x) = 7, so the two-sided limit does not exist.',
    'ap-calculus-ab-foundation-pilot-item-003':
      'Direct substitution gives 0/0, so factor the difference of squares: (x^2 - 9)/(x - 3) = (x - 3)(x + 3)/(x - 3) = x + 3 for x != 3. Substituting x = 3 into x + 3 gives 3 + 3 = 6.',
    'ap-calculus-ab-foundation-pilot-item-007':
      'As x approaches 4 from either side, (x - 4)^2 stays strictly positive while approaching 0. Dividing the positive numerator 2 by arbitrarily small positive values drives 2/(x - 4)^2 to positive infinity.',
    'ap-calculus-ab-foundation-pilot-item-008':
      'Divide numerator and denominator by the highest power x^2 to get (3 - 1/x^2)/(1 + 4/x^2). As x -> infinity, 1/x^2 and 4/x^2 approach 0, leaving the leading-coefficient ratio 3/1 = 3.',
    'ap-calculus-ab-foundation-pilot-item-010':
      'Because f is continuous on [a, b] and 3 lies strictly between f(a) = 1 and f(b) = 6, the Intermediate Value Theorem guarantees at least one c in (a, b) with f(c) = 3, though not uniqueness.',
    'ap-calculus-ab-foundation-pilot-item-014':
      'If f\'(c) exists, then lim_{x->c} [f(x) - f(c)] = f\'(c)*0 = 0, so f is continuous at c. The converse can fail, as shown by f(x) = |x| at x = 0, which is continuous yet not differentiable.',
    'ap-calculus-ab-foundation-pilot-item-015':
      'Apply the power rule d/dx[x^n] = n*x^(n-1) term by term: d/dx(5x^4) = 20x^3, d/dx(-3x^2) = -6x, and d/dx(7) = 0 since constants have zero slope. Combining terms yields f\'(x) = 20x^3 - 6x.',
    'ap-calculus-ab-foundation-pilot-item-017':
      'Differentiate each term using linearity and standard rules: d/dx(sin x) = cos x, d/dx(e^x) = e^x, and d/dx(ln x) = 1/x for x > 0. Keeping the constant multiples gives 3 cos x - 2e^x + 1/x.',
    'ap-calculus-ab-foundation-pilot-item-025':
      'By the inverse-function derivative theorem, (f^-1)\'(y) = 1 / f\'(f^-1(y)). Since f(2) = 5 means f^-1(5) = 2, substituting f\'(2) = 3 yields (f^-1)\'(5) = 1 / f\'(2) = 1/3.',
    'ap-calculus-ab-foundation-pilot-item-028':
      'The function is a ratio u(x)/v(x) with u(x) = e^(x^2) and v(x) = 1 + x, requiring the quotient rule. Differentiating the composite numerator e^(x^2) also requires the chain rule, giving 2x*e^(x^2).',
    'ap-calculus-ab-foundation-pilot-item-031':
      'The derivative V\'(t) represents the instantaneous rate of change of volume in liters per minute. Because V\'(5) = -2 is negative at t = 5, tank volume is decreasing at 2 liters/min at 5 minutes.',
    'ap-calculus-ab-foundation-pilot-item-034':
      'Evaluate both rates at t = 3: v(3) = 3^2 - 4 = 5 > 0 and a(3) = 2(3) = 6 > 0. Because velocity and acceleration are both positive (same sign), the particle\'s speed is increasing at t = 3.',
    'ap-calculus-ab-foundation-pilot-item-035':
      'Differentiating A = pi*r^2 with respect to time t gives the related-rates equation dA/dt = 2*pi*r*(dr/dt). Substituting r = 3 cm and dr/dt = 2 cm/s yields dA/dt = 2*pi(3)(2) = 12 pi cm^2/s.',
    'ap-calculus-ab-foundation-pilot-item-037':
      'For f(x) = sqrt(x), f(4) = 2 and f\'(x) = 1/(2*sqrt(x)) gives f\'(4) = 1/4 = 0.25. The tangent-line approximation L(x) = 2 + 0.25(x - 4) evaluated at x = 4.1 gives 2 + 0.25(0.1) = 2.025.',
    'ap-calculus-ab-foundation-pilot-item-040':
      'As x -> infinity, both ln x and x grow without bound, forming an infinity/infinity indeterminate form. Applying L\'Hospital\'s Rule differentiates numerator and denominator to lim (1/x)/1 = 0.',
    'ap-calculus-ab-foundation-pilot-item-042':
      'The Mean Value Theorem requires continuity on [-1, 1] and differentiability on (-1, 1). Although f(x) = |x| is continuous everywhere, its sharp corner at x = 0 makes it non-differentiable inside (-1, 1).',
    'ap-calculus-ab-foundation-pilot-item-044':
      'For f(x) = x^3, f\'(x) = 3x^2 vanishes at x = 0 yet stays positive on both sides, so f increases through a horizontal tangent without a max or min; thus a critical number need not be an extremum.',
    'ap-calculus-ab-foundation-pilot-item-046':
      'By the first derivative test, a local minimum occurs at a critical point x = c when f\' changes sign from negative to positive, indicating f transitions from decreasing before c to increasing after c.',
    'ap-calculus-ab-foundation-pilot-item-048':
      'Because f\'(3) = 0 marks a horizontal tangent and f\'\'(3) < 0 means the curve is concave down at x = 3, the second derivative test guarantees a local maximum at x = 3.',
    'ap-calculus-ab-foundation-pilot-item-049':
      'Where f\' lies above the x-axis, f\'(x) > 0, so f is increasing. Where f\' is decreasing, its derivative satisfies f\'\'(x) < 0, which makes f concave down on that interval.',
    'ap-calculus-ab-foundation-pilot-item-055':
      'By Part 1 of the Fundamental Theorem of Calculus, differentiating an accumulation function with a constant lower limit 1 and upper limit x replaces t with x in the integrand, giving G\'(x) = x^2 + 1.',
    'ap-calculus-ab-foundation-pilot-item-059':
      'Antidifferentiate term by term using the reverse power rule: integral(3x^2 dx) = 3(x^3/3) = x^3 and integral(-4 dx) = -4x. Adding the constant of integration yields x^3 - 4x + C.',
    'ap-calculus-ab-foundation-pilot-item-061':
      'The differential equation dP/dt = 0.04P states that the instantaneous rate of population change equals 0.04 (4%) times the current population P per unit of time, representing exponential growth.',
    'ap-calculus-ab-foundation-pilot-item-063':
      'Applying the chain rule to y = Ce^(2x) multiplies by the inner derivative 2, giving y\' = 2Ce^(2x). Since y = Ce^(2x), substituting back shows y\' = 2y holds identically for all real x.',
    'ap-calculus-ab-foundation-pilot-item-064':
      'For y = x^2, y\' = 2x matches y = x^2 only at x = 0 and x = 2. Because a differential-equation solution must hold identically across an interval rather than isolated points, 2x != x^2 rules it out.',
    'ap-calculus-ab-foundation-pilot-item-073':
      'Displacement equals the definite integral of velocity over [0, 2]: integral_0^2 3t^2 dt = [t^3]_0^2. Evaluating at the bounds gives 2^3 - 0^3 = 8 - 0 = 8 meters.',
    'ap-calculus-ab-foundation-pilot-item-074':
      'The net rate of volume change is inflow minus outflow, V\'(t) = I(t) - O(t). By the Net Change Theorem, volume at time T equals initial volume plus accumulated net change: V0 + integral_0^T [I(t) - O(t)] dt.',
    'ap-calculus-ab-foundation-pilot-item-078':
      'A semicircle with diameter d(x) has radius r = d(x)/2 and area A = (1/2)*pi*r^2. Substituting r = d(x)/2 gives (1/2)*pi*[d(x)/2]^2 = (1/2)*pi*[d(x)]^2/4 = pi*[d(x)]^2/8.',
    'ap-calculus-ab-foundation-pilot-item-083':
      'Because x = 2 produces 0/0, factor the difference of cubes: x^3 - 8 = (x - 2)(x^2 + 2x + 4). Canceling (x - 2) for x != 2 leaves x^2 + 2x + 4, which evaluates at x = 2 to 4 + 4 + 4 = 12.',
    'ap-calculus-ab-foundation-pilot-item-085':
      'Continuity at x = 1 requires the left-hand limit, right-hand limit, and f(1) to match. From the left, lim_{x->1-} (x + 2) = 3, and from the right f(1) = 3(1) + k = 3 + k; setting 3 + k = 3 gives k = 0.',
    'ap-calculus-ab-foundation-pilot-item-086':
      'At x = -2, the denominator x + 2 equals 0 while the nonzero numerator remains 1, so |f(x)| grows without bound on both sides. This vertical asymptote defines an infinite discontinuity.',
    'ap-calculus-ab-foundation-pilot-item-087':
      'Divide numerator and denominator by x^3 to rewrite the expression as (2 + 1/x^2)/(5 - 4/x^3). As x -> -infinity, both 1/x^2 and 4/x^3 vanish, yielding the leading-coefficient ratio 2/5.',
    'ap-calculus-ab-foundation-pilot-item-091':
      'The derivative f\'(3) is the limit of secant slopes as the second point approaches x = 3. Since the slopes -2.8, -2.98 and -3.2, -3.02 bracket and converge toward -3 from both sides, f\'(3) = -3.',
    'ap-calculus-ab-foundation-pilot-item-092':
      'In calculus notation, f\'(a) denotes the slope of the tangent line to y = f(x) at input x = a, whereas f(a) is the y-coordinate. A tangent slope of 5 at x = 2 is therefore written f\'(2) = 5.',
    'ap-calculus-ab-foundation-pilot-item-096':
      'Rewrite f(x) = 4x^(-3) - 2x so the power rule applies cleanly. Differentiating each term gives 4(-3)x^(-4) - 2 = -12x^(-4) - 2, which rewrites as -12/x^4 - 2.',
    'ap-calculus-ab-foundation-pilot-item-098':
      'Using the chain rule for e^(u(x)), d/dx[e^u] = e^u * u\'. With outer function e^u and inner function u = -3x (so u\' = -3), differentiating produces f\'(x) = e^(-3x)*(-3) = -3e^(-3x).',
    'ap-calculus-ab-foundation-pilot-item-101':
      'Treat y = e^(sin x) as outer function e^u composed with inner function u = sin x. By the chain rule, dy/dx = e^u * du/dx = e^(sin x) * cos x.',
    'ap-calculus-ab-foundation-pilot-item-104':
      'Differentiate x = y^3 + y implicitly with respect to x: 1 = (3y^2 + 1)(dy/dx), so dy/dx = 1/(3y^2 + 1). Substituting y = 1 gives dy/dx = 1/(3(1)^2 + 1) = 1/4.',
    'ap-calculus-ab-foundation-pilot-item-105':
      'Because f(4) = 1 implies f^-1(1) = 4, the inverse derivative formula gives (f^-1)\'(1) = 1 / f\'(f^-1(1)) = 1 / f\'(4). Substituting f\'(4) = -2 yields 1/(-2) = -0.5.',
    'ap-calculus-ab-foundation-pilot-item-106':
      'By the inverse-sine derivative rule d/dx[arcsin(u)] = u\' / sqrt(1 - u^2), set u = 2x so u\' = 2 and u^2 = 4x^2. Substituting gives f\'(x) = 2 / sqrt(1 - 4x^2).',
    'ap-calculus-ab-foundation-pilot-item-110':
      'Apply the power rule three times to s(t) = t^4: s\'(t) = 4t^3, s\'\'(t) = 12t^2, and s\'\'\'(t) = 24t (the jerk). Evaluating the third derivative at t = 2 gives 24(2) = 48.',
    'ap-calculus-ab-foundation-pilot-item-113':
      'Motion to the right occurs when v(t) > 0. The zeros of v(t) = (t - 1)(t - 4) are t = 1 and t = 4; testing signs on t >= 0 shows v > 0 on [0, 1) and (4, infinity), while v < 0 on (1, 4).',
    'ap-calculus-ab-foundation-pilot-item-118':
      'When a differentiable function is concave down (f\'\'(x) < 0), its slope decreases so the graph bends below every tangent line. Consequently, the tangent-line linearization overestimates nearby values of sqrt(x).',
    'ap-calculus-ab-foundation-pilot-item-120':
      'As x -> infinity, both x and e^x approach infinity, giving an infinity/infinity indeterminate form. Applying L\'Hospital\'s Rule yields lim_{x->infinity} (1 / e^x) = 0 as the exponential grows unboundedly.',
    'ap-calculus-ab-foundation-pilot-item-122':
      'The Mean Value Theorem requires f to be continuous on the entire closed interval [-1, 1]. Because f(x) = 1/x is undefined with an infinite discontinuity at x = 0 inside [-1, 1], that hypothesis fails.',
    'ap-calculus-ab-foundation-pilot-item-130':
      'Let x be each perpendicular side and y = 200 - 2x be the river-parallel side, giving area A(x) = x(200 - 2x) = 200x - 2x^2. Setting A\'(x) = 200 - 4x = 0 gives x = 50 m and y = 100 m (with A\'\' = -4 < 0).',
    'ap-calculus-ab-foundation-pilot-item-131':
      'Displacement equals the net signed integral of velocity, 10 + (-4) = 6, whereas total distance traveled integrates speed |v(t)| by summing absolute areas: |10| + |-4| = 10 + 4 = 14.',
    'ap-calculus-ab-foundation-pilot-item-133':
      'The two subintervals [0, 2] and [2, 4] each have width delta x = 2 and right endpoints x = 2 and x = 4. Summing width times right-endpoint heights gives 2*f(2) + 2*f(4) = 2(5) + 2(9) = 10 + 18 = 28.',
    'ap-calculus-ab-foundation-pilot-item-138':
      'An even function satisfies f(-x) = f(x), making its graph symmetric across the y-axis. Therefore the integral over [-3, 0] equals the integral over [0, 3], so integral_-3^3 f(x) dx = 2*integral_0^3 f(x) dx.',
    'ap-calculus-ab-foundation-pilot-item-144':
      'Differentiating y = e^x + 2 gives y\' = e^x, since the constant 2 has derivative 0. Substituting y = e^x + 2 into the right side gives y - 2 = (e^x + 2) - 2 = e^x, so both sides equal e^x for all x.',
    'ap-calculus-ab-foundation-pilot-item-145':
      'Each slope-field segment at (x, y) has slope equal to the value of dy/dx there. Substituting x = -1 and y = 2 into y\' = x + y yields a slope of -1 + 2 = 1.',
    'ap-calculus-ab-foundation-pilot-item-146':
      'Slope-field segments are horizontal wherever the derivative equals zero. Setting y\' = x - y = 0 and solving for y gives the line y = x, along which every segment has slope 0.',
    'ap-calculus-ab-foundation-pilot-item-150':
      'Equilibrium (constant) solutions satisfy P\' = 0 for all t. Setting kP(1 - P/K) = 0 with k > 0 gives P = 0 or 1 - P/K = 0, yielding the two equilibrium populations P = 0 and P = K.',
    'ap-calculus-ab-foundation-pilot-item-153':
      'By the Fundamental Theorem of Calculus, final position equals initial position plus net displacement: x(4) = x(0) + integral_0^4 v(t) dt. Substituting x(0) = 5 and displacement -2 gives 5 + (-2) = 3.',
  },
  ap_chemistry_foundation_pilot: {
    'ap-chem-u4-063':
      'Both HCl and NaOH are strong electrolytes that dissociate completely into H+, Cl-, Na+, and OH-. Only H+ and OH- combine to form H2O(l), leaving Na+ and Cl- unchanged in solution as spectator ions.',
    'ap-chem-u4-075':
      'A Brønsted-Lowry conjugate acid-base pair differs by exactly one proton (H+). Ammonium (NH4+) donates a single H+ to become ammonia (NH3), and NH3 accepts H+ to reform NH4+, making them a conjugate pair.',
    'ap-chem-u5-084':
      'In rate = k[A]^m[B]^n, doubling [A] doubles rate so 2^m = 2 (m = 1, first order), while doubling [B] causes no rate change so 2^n = 1 (n = 0, zero order). Dropping [B]^0 = 1 yields rate = k[A].',
    'ap-chem-u6-108':
      'Apply calorimetry equation q = m*c*delta T to the solution. Substituting m = 50.0 g, c = 4.00 J/(g*deg C), and delta T = 4.00 deg C gives q = 50.0(4.00)(4.00) = 800 J gained by the solution.',
    'ap-chem-u3-237':
      'By the Planck-Einstein relation E = h*nu, photon energy is directly proportional to frequency nu (with Planck\'s constant h fixed). Doubling the frequency therefore doubles the photon\'s energy.',
    'ap-chem-u4-256':
      'Under the Brønsted-Lowry definition, a base is a proton (H+) acceptor. In the forward reaction NH3 + H2O <=> NH4+ + OH-, H2O donates H+ while NH3 accepts H+ to form NH4+, so NH3 is the base.',
    'ap-chem-u8-304':
      'Strong base NaOH dissociates completely, giving [OH-] = 0.010 M = 1.0 x 10^-2 M and pOH = -log(0.010) = 2.0. At 25 deg C, pH + pOH = 14.0, so pH = 14.0 - 2.0 = 12.0.',
    'ap-chem-u8-308':
      'A Brønsted-Lowry acid donates a proton while a base accepts one. In HCl + NH3 -> NH4+ + Cl-, HCl transfers H+ to ammonia, converting NH3 into NH4+, so NH3 acts as the base because it accepts a proton.',
    'ap-chem-u8-315':
      'Because pKa = -log(Ka), a smaller pKa corresponds to a larger acid-dissociation constant Ka and greater ionization. Comparing 3.2 versus 6.8, the acid with pKa = 3.2 has a much larger Ka and is stronger.',
    'ap-chem-u9-332':
      'Because Gibbs free energy is a state function, delta G values add when elementary or coupled reactions are summed. Coupling +12 kJ/mol with -20 kJ/mol yields delta G_net = +12 + (-20) = -8 kJ/mol.',
    'ap-chem-u6-358':
      'By Hess\'s Law, enthalpy is a state function, so summing A -> B and B -> C cancels intermediate B to yield A -> C. Adding the step enthalpies gives delta H = +25 kJ + (-40 kJ) = -15 kJ.',
    'ap-chem-u1-369':
      'An argon core [Ar] accounts for 18 electrons, and adding 3d5 4s2 brings the total to 18 + 5 + 2 = 25 electrons. In a neutral atom, 25 electrons means atomic number Z = 25, which is manganese (Mn).',
    'ap-chem-u3-398':
      'At constant pressure and moles, Charles\'s Law states V1/T1 = V2/T2 with Kelvin temperatures. Solving V2 = V1*(T2/T1) = 2.00 L * (450 K / 300 K) = 2.00 * 1.50 = 3.00 L.',
    'ap-chem-u3-403':
      'Dilution conserves solute moles according to M1*V1 = M2*V2. Solving for stock volume gives V1 = (M2*V2)/M1 = (0.400 M * 250.0 mL) / 2.00 M = 100 / 2.00 = 50.0 mL.',
    'ap-chem-u5-430':
      'The reaction order is 2 + 1 = 3 overall, so solving k = rate / ([A]^2[B]) gives units of (M s^-1) / M^3 = M^(1-3) s^-1 = M^-2 s^-1.',
    'ap-chem-u6-444':
      'Using q = m*c*delta T with m = 75.0 g, c = 4.00 J/(g*deg C), and delta T = 6.00 deg C gives q = 75.0(4.00)(6.00) = 1800 J. Dividing by 1000 J/kJ converts this to 1.80 kJ.',
  },
};
