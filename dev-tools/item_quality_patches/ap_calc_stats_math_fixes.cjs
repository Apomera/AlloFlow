'use strict';

module.exports = {
  ap_calculus_ab_foundation_pilot: {
    'ap-calculus-ab-foundation-pilot-item-079': {
      choiceRationales: [
        'Evaluating the disk cross-sectional area pi*r(x)^2 = pi*x at x = 4 gives 4 pi, rather than integrating pi*x over [0, 4] to get pi[x^2/2]_0^4 = 8 pi.',
        'Omitting the factor 1/2 when integrating r(x)^2=x into x^2/2 over [0,4] doubles the true solid-of-revolution volume from 8 pi to 16 pi.',
        'Best answer. Using the disk method with radius R(x)=sqrt(x), the volume is pi integral_0^4 (sqrt(x))^2 dx = pi integral_0^4 x dx = pi[x^2/2]_0^4 = 8 pi.',
        'Integrating x^2 instead of (sqrt(x))^2=x squares the radius twice and yields 32 pi/3 instead of 8 pi.',
      ],
    },
    'ap-calculus-ab-foundation-pilot-item-099': {
      rationale:
        "By the product rule for h = f*g, h'(1) = f'(1)g(1) + f(1)g'(1). Substituting f(1) = 2, f'(1) = -1, g(1) = 4, and g'(1) = 3 yields (-1)(4) + (2)(3) = -4 + 6 = 2.",
      choiceRationales: [
        'This evaluates only the first product-rule term f prime(1)g(1)=(-1)(4)=-4 and leaves out the second term f(1)g prime(1)=(2)(3)=6.',
        "Evaluating f(1)g(1) + f'(1)g'(1) = (2)(4) + (-1)(3) = 5 pairs functions and derivatives incorrectly instead of applying the product rule f'(1)g(1) + f(1)g'(1) = 2.",
        "Best answer. By the product rule for h = f*g, h'(1) = f'(1)g(1) + f(1)g'(1). Substituting f(1) = 2, f'(1) = -1, g(1) = 4, and g'(1) = 3 yields (-1)(4) + (2)(3) = -4 + 6 = 2.",
        'This evaluates only the second product-rule term f(1)g prime(1)=(2)(3)=6 while completely omitting the first product-rule term f prime(1)g(1)=(-1)(4)=-4.',
      ],
    },
    'ap-calculus-ab-foundation-pilot-item-100': {
      choiceRationales: [
        "Computing f'(1)/g(1) = -1/4 keeps only the first numerator term f'(1)g(1)/[g(1)]^2 and omits subtracting f(1)g'(1) in the quotient rule [f'g - fg']/g^2 = -5/8.",
        'Adding instead of subtracting in the quotient-rule numerator produces 2/16=1/8 rather than evaluating [(-1)(4)-(2)(3)] divided by 4^2 to get -5/8.',
        'Reversing the subtraction order in the quotient-rule numerator to f g prime - f prime g flips the final sign from -5/8 to +5/8.',
        "Best answer. By the quotient rule, h'(1)=[f'(1)g(1)-f(1)g'(1)]/[g(1)]^2. Plugging in the values at x=1 yields [(-1)(4)-(2)(3)]/4^2=-10/16=-5/8.",
      ],
    },
    'ap-calculus-ab-foundation-pilot-item-115': {
      choiceRationales: [
        'Using 4 pi r(dr/dt) instead of dV/dt=4 pi r^2(dr/dt) forgets to square the radius r=2 when differentiating V=(4/3)pi r^3.',
        'Differentiating V=(4/3)pi r^3 gives dV/dt=4 pi r^2(dr/dt)=4 pi(2^2)(3)=48 pi, so 24 pi drops a factor of 2 in the arithmetic.',
        'Best answer. Differentiate sphere volume V=(4/3)pi r^3 with respect to time to get dV/dt=4 pi r^2 (dr/dt). Plugging in r=2 and dr/dt=3 gives 4 pi(4)(3)=48 pi cubic centimeters per second.',
        'Using 3 instead of 4 in dV/dt = 4 pi r^2(dr/dt), or evaluating 4 pi r^2 at r = 3 without dr/dt, yields 36 pi instead of 4 pi(2^2)(3) = 48 pi cm^3/s.',
      ],
    },
    'ap-calculus-ab-foundation-pilot-item-160': {
      choiceRationales: [
        'Using 2^2 = 4 instead of 2^3 = 8 when evaluating pi[-(2-x)^3/3] across [0, 2] forgets to cube the radius endpoint and halves the volume from 8pi/3 to 4pi/3.',
        'Integrating pi(2-x) without squaring the radius computes a linear integral rather than summing circular areas pi r^2.',
        'Omitting the denominator 3 from the reverse power rule when integrating (2-x)^2 triples the true solid volume from 8pi/3 to 8pi.',
        'Best answer. Each circular cross section of radius 2-x has area pi(2-x)^2. Integrating from 0 to 2 gives pi[-(2-x)^3/3]_0^2 = pi(0 - (-8/3)) = 8pi/3.',
      ],
    },
  },
  ap_statistics_foundation_pilot: {
    'ap-statistics-foundation-pilot-item-022': {
      choices: ['0.18', '0.30', '0.43', '3.33'],
      rationale:
        'A conditional proportion restricts the denominator to the conditioned subgroup: dividing the 18 late bikers by all 60 biking commuters gives 18/60 = 0.30.',
      choiceRationales: [
        '0.18 divides the 18 late bikers by 100 as though the count were already a percentage, whereas the conditional proportion must divide by the 60 biking commuters to get 0.30.',
        'Best answer. A conditional proportion restricts the denominator to the conditioned subgroup: dividing the 18 late bikers by all 60 biking commuters gives 18/60 = 0.30.',
        '0.43 divides the 18 late bikers by the 42 on-time bikers (18/42 ≈ 0.43), computing late-to-on-time odds instead of the conditional proportion out of all 60 bikers.',
        '3.33 inverts the ratio by dividing 60 bikers by 18 late arrivals; a valid conditional proportion puts the subset count in the numerator and can never exceed 1.',
      ],
    },
    'ap-statistics-foundation-pilot-item-034': {
      choices: [
        'C(5,2)(0.2)^2(0.8)^5',
        'C(5,2)(0.2)^2(0.8)^3',
        'C(5,2)(0.2)^3(0.8)^2',
        '(0.2)^2(0.8)^3',
      ],
      rationale:
        'For X ~ Binomial(n, p), P(X = k) = C(n, k) p^k (1 - p)^(n - k). With n = 5, p = 0.2, and k = 2, choosing 2 success positions among 5 trials yields C(5,2)(0.2)^2(0.8)^3.',
      choiceRationales: [
        'This uses five failures, but two successes in five trials leave only three, so the exponent on 0.8 must be 3.',
        'Best answer. For X ~ Binomial(n, p), P(X = k) = C(n, k) p^k (1 - p)^(n - k). With n = 5, p = 0.2, and k = 2, choosing 2 success positions among 5 trials yields C(5,2)(0.2)^2(0.8)^3.',
        'This swaps the exponents and gives the probability of three successes and two failures rather than two successes.',
        'Omitting the binomial coefficient C(5,2) = 10 gives the probability of one fixed ordering of two successes and three failures (0.02048) instead of all 10 arrangements.',
      ],
    },
    'ap-statistics-foundation-pilot-item-194': {
      choiceRationales: [
        'This swaps the coefficients, putting the slope as the constant term and the intercept as the multiplier of x.',
        'Best answer. The intercept is the constant term and the slope multiplies the explanatory variable.',
        'This equation swaps the slope and intercept by attaching 10 to x as a positive slope and also turns the constant y-intercept negative (-4), rather than writing y-hat = 10 + 4x.',
        'Although the slope multiplying x is correctly 4, subtracting 10 gives an intercept of -10 instead of +10, shifting every predicted response down by 20 units.',
      ],
    },
  },
};
