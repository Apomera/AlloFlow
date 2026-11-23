'use strict';

module.exports = {
  ap_statistics_foundation_pilot: {
    'ap-statistics-foundation-pilot-item-008':
      'The interquartile range measures the spread of the middle 50% of a distribution using IQR = Q3 - Q1. Ignoring the minimum, median, and maximum, subtracting Q1 = 9 from Q3 = 18 gives 18 - 9 = 9.',
    'ap-statistics-foundation-pilot-item-028':
      'By the general addition rule, P(A or B) = P(A) + P(B) - P(A and B). Adding 0.40 + 0.50 = 0.90 counts the overlap twice, so subtracting P(A and B) = 0.20 yields 0.90 - 0.20 = 0.70.',
    'ap-statistics-foundation-pilot-item-030':
      'For a discrete random variable, expected value is the probability-weighted sum E(X) = sum of x*P(X = x). Computing 0(0.2) + 1(0.5) + 2(0.3) = 0 + 0.5 + 0.6 gives a long-run mean of 1.1.',
    'ap-statistics-foundation-pilot-item-036':
      'A z-score standardizes an observation via z = (x - mu) / sigma. Substituting x = 86, mu = 70, and sigma = 8 yields (86 - 70) / 8 = 16 / 8 = 2, placing the score two standard deviations above the mean.',
    'ap-statistics-foundation-pilot-item-085':
      'To predict the response from a least-squares regression equation, substitute the explanatory value into y-hat = 12 + 4x. Setting x = 5 gives y-hat = 12 + 4(5) = 12 + 20 = 32.',
    'ap-statistics-foundation-pilot-item-107':
      'The IQR equals the distance between the upper and lower quartiles, Q3 - Q1, and does not directly use the median. With Q3 = 25 and Q1 = 12, the central half of the data spans 25 - 12 = 13.',
    'ap-statistics-foundation-pilot-item-124':
      'A score located z standard deviations from the mean satisfies x = mu + z*sigma. For one standard deviation above the mean (z = 1) with mu = 100 and sigma = 15, x = 100 + 1(15) = 115.',
    'ap-statistics-foundation-pilot-item-152':
      'Because Pearson correlation averages products of standardized z-scores, the Cauchy-Schwarz inequality bounds r between -1 and 1 inclusive, with -1 and 1 representing exact linear relationships.',
    'ap-statistics-foundation-pilot-item-153':
      'Evaluating the linear model y-hat = 12 + 3x at x = 4 multiplies the slope 3 by 4 to get a 12-unit increase above the intercept 12, producing a predicted response of 12 + 12 = 24.',
    'ap-statistics-foundation-pilot-item-155':
      'A residual measures vertical prediction error as e = observed - predicted (y - y-hat). Substituting y = 18 and y-hat = 21 gives 18 - 21 = -3, showing the observation lies 3 units below the line.',
    'ap-statistics-foundation-pilot-item-167':
      'For two non-disjoint events, the union probability equals P(A) + P(B) - P(A and B) so shared outcomes are counted once. Substituting the given values produces 0.55 + 0.40 - 0.20 = 0.75.',
    'ap-statistics-foundation-pilot-item-174':
      'The standard deviation of the sampling distribution of x-bar is sigma / sqrt(n). With sigma = 18 and sample size n = 81, sqrt(81) = 9, so the standard error is 18 / 9 = 2.',
    'ap-statistics-foundation-pilot-item-183':
      'Sample-mean variability shrinks by sqrt(n) according to SE(x-bar) = sigma / sqrt(n). Dividing sigma = 20 by sqrt(100) = 10 gives 20 / 10 = 2 for the standard error.',
    'ap-statistics-foundation-pilot-item-198':
      'In simple linear regression, the coefficient of determination is r^2, which is always non-negative. Squaring r = -0.60 gives (-0.60)^2 = 0.36, meaning 36% of y-variability is explained.',
    'ap-statistics-foundation-pilot-item-203':
      'The mean is non-resistant and gets pulled toward extreme tail values, whereas the median resists outliers. Having mean 38 substantially above median 31 indicates a long upper tail, so the distribution is skewed right.',
    'ap-statistics-foundation-pilot-item-204':
      'Tukey\'s upper outlier fence is Q3 + 1.5*IQR. First find IQR = Q3 - Q1 = 32 - 20 = 12, multiply by 1.5 to get 18, and add to Q3 = 32 to obtain 32 + 18 = 50.',
    'ap-statistics-foundation-pilot-item-211':
      'Because an event and its complement are mutually exclusive and cover all outcomes, P(not A) = 1 - P(A). Subtracting P(A) = 0.72 from 1 gives 1 - 0.72 = 0.28.',
    'ap-statistics-foundation-pilot-item-213':
      'Multiply each outcome by its assigned probability and sum the terms: E(X) = 1(0.10) + 2(0.25) + 4(0.65). Adding 0.10 + 0.50 + 2.60 yields an expected value of 3.20.',
    'ap-statistics-foundation-pilot-item-227':
      'A null hypothesis states a benchmark equality about a population parameter, not a sample statistic like x-bar or s. Testing whether population mean battery life is 10 hours sets H0: mu = 10.',
  },
  ap_physics_1_foundation_pilot: {
    'ap-physics-1-u1-266':
      'Apply the constant-acceleration kinematics equation v = v0 + a*t. Substituting v = 3 m/s, v0 = 12 m/s, and a = -3 m/s^2 gives 3 = 12 - 3t, so -9 = -3t and t = 3.0 s.',
    'ap-physics-1-u5-331':
      'Angular momentum magnitude for a rigid body about its rotation axis is L = I*omega. Multiplying I = 2 kg*m^2 by omega = 5 rad/s gives L = 10 kg*m^2/s (10 kg m2/s), since radians are dimensionless.',
    'ap-physics-1-u1-365':
      'Taking upward as positive, gravity provides a = -g = -10 m/s^2 in v = v0 - g*t. Setting v = 0 m/s at the peak with v0 = 20 m/s gives 0 = 20 - 10t, so t = 20 / 10 = 2.0 s.',
    'ap-physics-1-u2-378':
      'By Newton\'s second law, F_net = m*a, with net force pointing in the same direction as acceleration. Substituting m = 7 kg and a = 2.0 m/s^2 east yields F_net = 7(2.0) = 14 N east.',
    'ap-physics-1-u2-383':
      'Net force equals mass times acceleration (F_net = m*a) regardless of individual tension or gravity forces. With m = 4 kg and a = 1.5 m/s^2 upward, F_net = 4(1.5) = 6 N upward.',
    'ap-physics-1-u3-401':
      'Near a uniform gravitational field, the change in gravitational potential energy is delta U_g = m*g*delta y. Substituting m = 0.50 kg, g = 10 N/kg, and delta y = 6 m gives 0.50(10)(6) = 30 J.',
    'ap-physics-1-u4-420':
      'In a perfectly inelastic collision with no external horizontal impulse, momentum is conserved: m1*v1 + m2*v2 = (m1 + m2)*v_f. Solving 2(6) + 1(0) = (2 + 1)*v_f gives 12 = 3*v_f, so v_f = 4 m/s east.',
    'ap-physics-1-u5-430':
      'Torque magnitude is tau = r*F*sin(theta). Because the 12 N force acts at a right angle (theta = 90 deg, sin 90 = 1) at lever arm r = 0.25 m, tau = 0.25(12)(1) = 3.0 N m.',
  },
  ap_chemistry_foundation_pilot: {
    'ap-chem-u7-124':
      'For the 1:1 reversible reaction A <=> B, the mass-action equilibrium expression is Kc = [B] / [A]. Substituting [B] = 0.80 M and [A] = 0.20 M yields Kc = 0.80 / 0.20 = 4.0, favoring products.',
    'ap-chem-u7-138':
      'Stoichiometric coefficients become exponents in the equilibrium expression, so for 2A <=> B, Kc = [B] / [A]^2. Substituting [B] = 0.20 M and [A] = 0.50 M gives 0.20 / (0.50)^2 = 0.20 / 0.25 = 0.80.',
    'ap-chem-u9-330':
      'Standard Gibbs free energy obeys delta G deg = -R*T*ln(K). When K = 1.0, ln(1.0) = 0, so delta G deg = -R*T(0) = 0 (Zero), meaning the reaction is at equilibrium under standard conditions.',
    'ap-chem-u6-446':
      'At constant pressure during a phase change, heat absorbed is q = n * delta H_vap. Multiplying n = 0.250 mol by delta H_vap = 40.0 kJ/mol cancels moles and requires 0.250(40.0) = 10.0 kJ of heat.',
  },
};
