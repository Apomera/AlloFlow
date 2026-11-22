'use strict';

// Enriched distractor rationales for AP Calculus AB foundation pilot items.
// Each rationale is a standalone explanation (>= 105 chars and >= 17 words)
// detailing why the distractor fails and what the relevant calculus rule requires.

module.exports = {
  'ap-calculus-ab-foundation-pilot-item-002': {
    'The limit is 5, the average of 3 and 7.':
      'Two-sided limits never average disagreeing one-sided values; existence at x=4 requires both the left-hand and right-hand trends to match the exact same number.',
    'The limit is 7, the right-hand value.':
      'Approaching 7 from the right establishes only the right-hand limit at x=4, not a two-sided limit, because the left-hand approach heads to 3 instead.',
  },
  'ap-calculus-ab-foundation-pilot-item-004': {
    '4':
      'Multiplying by the conjugate yields 1/[sqrt(x+4)+2]; reporting 4 evaluates only the denominator limit sqrt(0+4)+2 instead of taking its reciprocal 1/4.',
  },
  'ap-calculus-ab-foundation-pilot-item-005': {
    'A jump discontinuity':
      'Factoring (x^2-1)/(x-1) into x+1 shows both one-sided limits equal 2 here, whereas a jump discontinuity requires two distinct finite one-sided limits.',
    'No discontinuity':
      'Continuity at x=1 requires the two-sided limit 2 to match the function value f(1), which fails here because f(1) is defined as 4 instead.',
  },
  'ap-calculus-ab-foundation-pilot-item-006': {
    'Infinite discontinuity':
      'Both one-sided limits at x=0 are finite numbers, 2 from the left and 5 from the right, so the graph has no vertical asymptote there.',
    'Continuous':
      'A function cannot be continuous at x=0 when its left-hand limit 2 and right-hand limit 5 disagree, creating a finite break in the graph.',
  },
  'ap-calculus-ab-foundation-pilot-item-009': {
    'f is increasing on the interval [1,4].':
      'Having f(1)=-2 below f(4)=5 guarantees an intermediate crossing by IVT, yet it does not prevent the function from rising and falling repeatedly along [1,4].',
    "Some c in (1,4) has f'(c)=0 instead.":
      'The Intermediate Value Theorem guarantees an intermediate output value of f itself on [1,4] and says nothing about derivatives or horizontal tangent lines.',
  },
  'ap-calculus-ab-foundation-pilot-item-010': {
    'The slope of the function is constant on [a,b].':
      'Continuity on [a,b] guarantees intermediate outputs between f(a)=1 and f(b)=6, but a continuous curve need not be linear or even differentiable between those endpoints.',
  },
  'ap-calculus-ab-foundation-pilot-item-011': {
    'f(3)':
      'The difference quotient [f(3+h)-f(3)]/h measures secant slopes near x=3, so its limit as h approaches 0 gives the instantaneous rate of change rather than the height f(3).',
  },
  'ap-calculus-ab-foundation-pilot-item-012': {
    '4':
      'This reports the input value x=4 itself rather than computing the derivative formula f prime(x)=2x from the limit definition and substituting x=4.',
    '16':
      'Evaluating f(4)=4^2=16 finds the vertical height on the parabola at x=4 rather than the instantaneous tangent slope f prime(4)=2(4)=8.',
    '32':
      'Multiplying f(4)=16 by 2 confuses the derivative formula 2x with 2x^2; the limit definition gives f prime(x)=2x, which equals 8 at x=4.',
  },
  'ap-calculus-ab-foundation-pilot-item-013': {
    'The function is not continuous at x=2.':
      'The absolute value function f(x)=|x-2| is continuous everywhere, including at x=2; continuity alone does not ensure differentiability when left and right slopes fail to agree.',
    'The graph has a minimum point at x=2.':
      'Smooth curves such as (x-2)^2 also attain a minimum at x=2 while remaining differentiable with slope 0, so a minimum alone never prevents differentiability.',
  },
  'ap-calculus-ab-foundation-pilot-item-014': {
    'Continuity at c implies differentiability':
      'Sharp corners such as f(x)=|x| at x=0 are continuous yet lack a single tangent slope, proving that continuity does not force differentiability.',
    'Every discontinuity has a vertical tangent':
      'Jump and removable discontinuities produce breaks or open holes in the graph rather than vertical tangent lines, which require continuity at the point.',
  },
  'ap-calculus-ab-foundation-pilot-item-015': {
    '20x^4-6x^2':
      'This multiplies each coefficient by its original exponent without decreasing each power of x by 1, omitting the second half of the power rule.',
    '5x^3-3x':
      'This decreases every variable exponent by 1 but forgets to multiply each term by its original exponent as required by the power rule.',
    '20x^3-6x+7':
      'The constant term 7 has a rate of change of 0, so differentiating removes it completely rather than carrying +7 into the derivative.',
  },
  'ap-calculus-ab-foundation-pilot-item-016': {
    '-1/2':
      'This substitutes x=2 into -2x^(-2) instead of reducing the negative exponent from -2 to -3 to form the derivative f prime(x)=-2x^(-3).',
    '1/4':
      'Dropping the negative sign when bringing down the exponent -2 flips the tangent slope from negative to positive instead of giving -2/2^3=-1/4.',
    '4':
      'This evaluates 2^2=4 instead of applying the power rule to x^(-2) to obtain f prime(x)=-2/x^3 and then substituting x=2.',
  },
  'ap-calculus-ab-foundation-pilot-item-017': {
    '3 cos x - 2e^x + ln x':
      'The first two terms are differentiated properly, but the final term ln x was left unchanged instead of being replaced by its derivative 1/x.',
    '-3 sin x - 2e^x + 1/x':
      'The first derivative of 3 sin x is +3 cos x, whereas -3 sin x is the second derivative obtained by differentiating sine twice.',
    '3 cos x - 2xe^(x-1) + 1':
      'This mistakenly applies the power rule to the exponential term e^x and uses 1 instead of 1/x for the derivative of ln x.',
  },
  'ap-calculus-ab-foundation-pilot-item-018': {
    '0':
      'Evaluating cos(pi/2)=0 computes the original function height at x=pi/2 rather than differentiating cosine first to evaluate -sin(pi/2)=-1.',
    '1':
      'Forgetting the negative sign in d/dx(cos x)=-sin x yields +sin(pi/2)=1 instead of the true slope -sin(pi/2)=-1 at x=pi/2.',
    'pi/2':
      'This echoes the input angle x=pi/2 itself instead of differentiating cos x to get -sin x and evaluating that derivative at pi/2.',
  },
  'ap-calculus-ab-foundation-pilot-item-019': {
    'x^2e^x':
      'This keeps only the term from differentiating the exponential factor e^x while omitting the second product-rule term 2xe^x from differentiating x^2.',
    '2xe^x+x^2':
      'In the second product-rule term x^2 times d/dx(e^x), the exponential factor e^x was mistakenly dropped instead of yielding 2xe^x+x^2e^x.',
  },
  'ap-calculus-ab-foundation-pilot-item-020': {
    '1+1/x^2':
      'Rewriting g(x) as x+x^(-1) shows d/dx(x^(-1))=-x^(-2), so writing +1/x^2 drops the negative sign brought down from the exponent -1.',
  },
  'ap-calculus-ab-foundation-pilot-item-021': {
    '30x(3x^2+1)^5':
      'Multiplying 5 by the inner derivative 6x gives the right coefficient 30x, but the outer power rule still requires reducing the exponent from 5 to 4.',
    '15x^2(3x^2+1)^4':
      'This multiplies by the undifferentiated term 3x^2 instead of the inner derivative d/dx(3x^2+1)=6x required by the chain rule.',
  },
  'ap-calculus-ab-foundation-pilot-item-022': {
    'cos(2x^3)':
      'This differentiates the outer sine function into cosine but omits the mandatory chain-rule factor d/dx(2x^3)=6x^2 from the inner polynomial.',
    '2x^3 cos(2x^3)':
      'This multiplies by the undifferentiated inner expression 2x^3 instead of multiplying by its derivative 6x^2 as required by the chain rule.',
    '6x^2 sin(2x^3)':
      'The chain-rule factor 6x^2 is correct, but differentiating the outer sine function must change sin(2x^3) into cos(2x^3) rather than leaving sine unchanged.',
  },
  'ap-calculus-ab-foundation-pilot-item-023': {
    '-y/x':
      'Differentiating x^2+y^2=25 gives 2x+2y(dy/dx)=0, so solving for dy/dx divides -2x by 2y to get -x/y; writing -y/x inverts that ratio.',
  },
  'ap-calculus-ab-foundation-pilot-item-024': {
    '-2/3':
      'Implicit differentiation of xy+y^2=8 gives y+x(dy/dx)+2y(dy/dx)=0, so solving yields -y/(x+2y)=-1/3 at (2,2); doubling y in the numerator wrongly produces -4/6=-2/3.',
  },
  'ap-calculus-ab-foundation-pilot-item-025': {
    '1/2':
      'This takes the reciprocal of the input coordinate x=2 instead of taking the reciprocal of the derivative slope f prime(2)=3 in the inverse-derivative rule.',
    '3':
      'This reports the forward slope f prime(2)=3 directly without taking the reciprocal 1/f prime(2) required to find the derivative of the inverse at 5.',
    '1/5':
      'This takes the reciprocal of the function output f(2)=5 rather than using the reciprocal of the derivative slope f prime(2)=3.',
  },
  'ap-calculus-ab-foundation-pilot-item-026': {
    '1/(1+9x^2)':
      'This substitutes u=3x properly into 1/(1+u^2) to get 1/(1+9x^2), but it omits multiplying by the chain-rule derivative u prime=3.',
    '3/(1+3x^2)':
      'Squaring the inner expression u=3x produces (3x)^2=9x^2 rather than 3x^2, because the coefficient 3 must be squared along with x.',
  },
  'ap-calculus-ab-foundation-pilot-item-028': {
    'The power rule alone suffices for this':
      'Neither the composite exponential numerator e^(x^2) nor the overall rational quotient structure can be differentiated using the power rule by itself.',
    'Implicit differentiation alone suffices':
      'Because this expression is already written explicitly as a single function of x, implicit differentiation is unnecessary and does not replace quotient and chain rules.',
    'The Fundamental Theorem of Calculus alone':
      'The Fundamental Theorem of Calculus differentiates accumulation integrals with variable bounds rather than an explicit quotient containing a composite exponential function.',
  },
  'ap-calculus-ab-foundation-pilot-item-029': {
    '12x^2-12x':
      'This stops after computing the second derivative f double prime(x)=12x^2-12x instead of differentiating one additional time to reach the third derivative.',
    '24x':
      'Differentiating the second derivative 12x^2-12x gives 24x-12, so reporting 24x drops the constant term -12 produced by differentiating -12x.',
    '4x^3-6x^2':
      'This stops after the first derivative f prime(x)=4x^3-6x^2 rather than differentiating twice more to obtain the third derivative 24x-12.',
  },
  'ap-calculus-ab-foundation-pilot-item-030': {
    '0':
      'Evaluating v(3)=3(3)^2-12(3)+9=0 computes the velocity at t=3 instead of differentiating once more to find the acceleration a(3)=6(3)-12=6.',
    '9':
      'This evaluates the initial velocity v(0)=9 or misreads s(3) rather than evaluating the second derivative a(t)=6t-12 at t=3.',
    '18':
      'This evaluates only the linear term 6t=18 at t=3 while forgetting to subtract the constant 12 in the acceleration formula a(t)=6t-12.',
  },
  'ap-calculus-ab-foundation-pilot-item-031': {
    'At 2 minutes, volume falls at 5 liters per minute':
      'In V prime(5)=-2, the input inside parentheses is t=5 minutes and the output magnitude is 2 liters per minute, so this reverses the two quantities.',
  },
  'ap-calculus-ab-foundation-pilot-item-032': {
    'Items per dollar':
      'Derivative units always divide output units by input units, dC/dq, so items per dollar inverts the required ratio of dollars per item.',
    'Dollars':
      'Dollars are the units of total cost C(q) itself, whereas the marginal derivative C prime(q) measures a rate of change in dollars per item.',
  },
  'ap-calculus-ab-foundation-pilot-item-033': {
    '0':
      'Evaluating position s(3)=3^3-3(3)^2=0 gives the location of the particle at t=3 rather than differentiating first to find the velocity v(3)=3(3)^2-6(3)=9.',
    '18':
      'This computes 6(3)=18 from the acceleration term or drops part of v(t)=3t^2-6t instead of evaluating 27-18=9 at t=3.',
    '27':
      'This evaluates only the leading term 3(3)^2=27 of velocity v(t)=3t^2-6t while forgetting to subtract the second term 6(3)=18.',
  },
  'ap-calculus-ab-foundation-pilot-item-034': {
    'Neither increasing nor decreasing, because the speed stays constant.':
      'Constant speed along a line requires zero acceleration, whereas here v(3)=5 and a(3)=6 are both nonzero and share the same positive sign.',
  },
  'ap-calculus-ab-foundation-pilot-item-035': {
    '4 pi cm^2/s':
      'Using r=2 instead of r=3 in dA/dt=2 pi r(dr/dt) swaps the current radius with its rate of change dr/dt=2 cm/s.',
    '6 pi cm^2/s':
      'This evaluates only the circumference 2 pi r=6 pi at r=3 while omitting the related-rates chain-rule factor dr/dt=2 cm/s.',
  },
  'ap-calculus-ab-foundation-pilot-item-036': {
    '-4/3 ft/s':
      'Differentiating x^2+y^2=100 with respect to time gives 2x(dx/dt)+2y(dy/dt)=0, so dy/dt equals -(x/y)(dx/dt)=-3/4; writing -4/3 inverts the ratio x/y into y/x.',
  },
  'ap-calculus-ab-foundation-pilot-item-037': {
    '2.01':
      'Multiplying delta x=0.1 by 0.1 instead of the tangent slope f prime(4)=1/(2 sqrt(4))=1/4 underestimates the linear rise from 0.025 to 0.01.',
    '2.05':
      'Using 1/2 instead of f prime(4)=1/(2 sqrt(4))=1/4 doubles the linear increment from 0.025 to 0.05 and overshoots the tangent-line estimate.',
    '4.025':
      'This starts from the input x=4 instead of the function height f(4)=sqrt(4)=2 before adding the tangent-line increment (1/4)(0.1)=0.025.',
  },
  'ap-calculus-ab-foundation-pilot-item-038': {
    '0.03':
      'This keeps only the differential increment f prime(0)(0.03)=0.03 and omits adding it to the base point value f(0)=e^0=1.',
    '1.003':
      'This misplaces the decimal point in delta x=0.03 by adding 0.003 instead of 0.03 to the starting value f(0)=1.',
    '1.30':
      'This shifts the decimal one place to the left in reverse, adding 0.30 instead of 0.03 to the base height f(0)=1.',
  },
  'ap-calculus-ab-foundation-pilot-item-039': {
    'e':
      'After applying L Hospital Rule to get e^x/1, substituting x=0 evaluates e^0=1; reporting e mistakenly substitutes x=1 instead of x=0.',
  },
  'ap-calculus-ab-foundation-pilot-item-040': {
    'Positive infinity':
      'Applying L Hospital Rule to the infinity/infinity form replaces (ln x)/x with (1/x)/1, which shrinks to 0 rather than diverging to positive infinity.',
    'The limit does not exist':
      'Because the L Hospital quotient (1/x)/1 approaches 0 cleanly as x grows without bound, the original limit exists and equals the finite value 0.',
  },
  'ap-calculus-ab-foundation-pilot-item-041': {
    '1':
      'At x=1 the instantaneous slope is f prime(1)=2, which fails to match the average secant slope (9-1)/(3-1)=4 required by the Mean Value Theorem.',
    '4':
      'This reports the average secant slope (9-1)/(3-1)=4 itself rather than solving f prime(c)=2c=4 to find the guaranteed interior input c=2.',
  },
  'ap-calculus-ab-foundation-pilot-item-042': {
    'The interval contains negative inputs.':
      'The Mean Value Theorem imposes no restriction against negative x-values; it fails on [-1,1] solely because f(x)=|x| has a corner and lacks a derivative at x=0.',
  },
  'ap-calculus-ab-foundation-pilot-item-043': {
    'Just the interior points where the derivative equals zero':
      'Checking only interior critical points misses extreme values when a monotonic or clipped curve reaches its absolute highest or lowest height at an interval endpoint.',
    'Just the values taken by the second derivative there':
      'Second-derivative values classify concavity rather than measuring function heights f(x), so they cannot directly rank absolute maxima and minima.',
  },
  'ap-calculus-ab-foundation-pilot-item-044': {
    'Every critical number is a maximum':
      'At x=0, f(x)=x^3 has f prime(0)=0 yet has neither a maximum nor a minimum because f prime(x)=3x^2 remains nonnegative on both sides.',
    'The function is not differentiable at zero':
      'Knowing that f prime(0)=0 explicitly confirms that the derivative exists and equals zero at x=0, producing a horizontal tangent line.',
  },
  'ap-calculus-ab-foundation-pilot-item-045': {
    'Increasing on (-2,1)':
      'Evaluating the sign chart at the test point x=0 gives f prime(0)=(2)(-1)=-2<0, showing that f is decreasing rather than increasing across (-2,1).',
  },
  'ap-calculus-ab-foundation-pilot-item-046': {
    "f' changes from positive to negative":
      'When f prime changes from positive to negative at x=c, the graph shifts from rising to falling, which identifies a local maximum rather than a minimum.',
  },
  'ap-calculus-ab-foundation-pilot-item-047': {
    'x<2':
      'For every x<2, the second derivative f double prime(x)=6x-12 is negative, which makes the graph concave down rather than concave up.',
    'x>-2':
      'Solving 6x-12>0 adds 12 to both sides and divides by 6 to yield x>2, so writing x>-2 introduces a sign error.',
    'All real x':
      'Because f double prime(x)=6x-12 changes sign at x=2, the curve switches from concave down to concave up instead of staying concave up everywhere.',
  },
  'ap-calculus-ab-foundation-pilot-item-049': {
    'Increasing and concave up':
      'A concave-up graph requires f prime to be increasing, whereas the prompt states that f prime is decreasing across the interval.',
    'Decreasing and concave down':
      'Because the graph of f prime lies above the x-axis (f prime>0), the original function f must be increasing rather than decreasing.',
  },
  'ap-calculus-ab-foundation-pilot-item-050': {
    '2 by 8':
      'A 2 by 8 rectangle satisfies the perimeter constraint 2(2+8)=20, but its area is 16, well below the maximum area of 25 at x=5.',
    '4 by 6':
      'A 4 by 6 rectangle uses perimeter 20 and yields area 24, yet optimizing A(x)=x(10-x) shows the 5 by 5 square achieves a larger area of 25.',
    '1 by 9':
      'A 1 by 9 rectangle meets the perimeter condition of 20 but encloses an area of only 9, far below the maximum attained at x=5.',
  },
  'ap-calculus-ab-foundation-pilot-item-051': {
    '4 liters':
      'This evaluates t^2=4 at t=2 instead of integrating r(t)=3t^2 to get the antiderivative t^3 and evaluating 2^3-0^3=8 liters.',
  },
  'ap-calculus-ab-foundation-pilot-item-052': {
    '8':
      'Adding the magnitudes 6+2=8 computes total variation (or total distance) rather than signed net change, which combines positive and negative areas.',
    '-4':
      'This reverses the subtraction order to 2-6=-4 instead of adding the positive area above the axis and negative area below: 6+(-2)=4.',
    '12':
      'Multiplying 6 by 2 treats the two separate rate regions as a product instead of summing their signed areas 6 and -2.',
  },
  'ap-calculus-ab-foundation-pilot-item-053': {
    '9':
      'Summing all three table outputs 1+3+5=9 uses three rectangle heights for only two subintervals; a left sum on [0,2] uses only f(0) and f(1).',
  },
  'ap-calculus-ab-foundation-pilot-item-054': {
    '2[f(0)+f(2)]':
      'Evaluating f at x=0 and x=2 uses the left endpoints of [0,2] and [2,4], forming the left Riemann sum instead of the midpoint sum.',
    '2[f(2)+f(4)]':
      'Evaluating f at x=2 and x=4 uses the right endpoints of [0,2] and [2,4], forming the right Riemann sum rather than the midpoint sum.',
    '4[f(1)+f(3)]':
      'This multiplies by the entire interval length 4 instead of using the individual subinterval width delta x=(4-0)/2=2 for each rectangle.',
  },
  'ap-calculus-ab-foundation-pilot-item-055': {
    'x^3/3+x':
      'This computes an antiderivative of t^2+1 instead of applying FTC Part 1, which differentiates the accumulation integral and recovers the integrand at x.',
    '1':
      'Reporting only the constant term 1 or the lower limit ignores the variable upper bound x, which FTC Part 1 substitutes directly into t^2+1.',
  },
  'ap-calculus-ab-foundation-pilot-item-056': {
    '-2x sin(x^2)':
      'This differentiates cos(x^2) into -sin(x^2) instead of applying FTC Part 1 with the chain rule, which keeps the integrand cos(x^2) and multiplies by 2x.',
  },
  'ap-calculus-ab-foundation-pilot-item-057': {
    '10':
      'Computing 3^2+1^2=10 adds the endpoint antiderivative values together instead of subtracting F(3)-F(1)=9-1=8 as required by the Evaluation Theorem.',
  },
  'ap-calculus-ab-foundation-pilot-item-058': {
    '-10':
      'Multiplying 5 by -2 treats adjacent definite integrals as factors in a product rather than combining them additively across [a,b] and [b,c].',
    '7':
      'Subtracting 5-(-2)=7 reverses the sign of the second integral instead of applying integral additivity to sum 5+(-2)=3.',
    '10':
      'This multiplies the magnitudes 5 and 2 (or doubles 5) instead of adding the signed integrals over [a,b] and [b,c] to obtain 5+(-2)=3.',
  },
  'ap-calculus-ab-foundation-pilot-item-059': {
    '6x-4+C':
      'Turning 3x^2 into 6x differentiates the leading term instead of antidifferentiating it; integration raises the power of x^2 to produce x^3.',
    'x^3-4+C':
      'The first term integrates properly to x^3, but the constant term -4 must also be integrated to -4x rather than remaining -4.',
    'x^2-4x+C':
      'This divides the coefficient 3 by 3 without increasing the exponent on x^2 from 2 to 3 as required by the reverse power rule.',
  },
  'ap-calculus-ab-foundation-pilot-item-060': {
    '2(x^2+1)^5+C':
      'After substituting u=x^2+1 and du=2x dx, integrating u^4 du divides by the new exponent 5 rather than multiplying the expression by 2.',
    '(x^2+1)^4/4+C':
      'This divides by the original exponent 4 without increasing the power on u=x^2+1 from 4 to 5 during antidifferentiation.',
    'x^2(x^2+1)^5+C':
      'Because the entire factor 2x dx is absorbed into du, keeping an extra x^2 outside the power of u double-counts the substitution factor.',
  },
  'ap-calculus-ab-foundation-pilot-item-061': {
    'The population always stays equal to just 4 individuals.':
      'In dP/dt=0.04P, the constant 0.04 represents a proportional rate of change per time unit, not a fixed headcount of 4 individuals.',
    'The population decreases by 4 percent each time unit.':
      'Because the proportionality constant +0.04 is positive for P>0, the derivative dP/dt is positive, indicating exponential growth rather than decay.',
  },
  'ap-calculus-ab-foundation-pilot-item-062': {
    'The temperature increases away from 20.':
      'When both k>0 and T>20 hold, the product dT/dt=-k(T-20) is negative, which drives the temperature downward toward 20 rather than upward.',
    'The temperature stays constant forever.':
      'Temperature remains constant only at the equilibrium T=20 where dT/dt=0; for T>20 the nonzero negative derivative forces T to decrease.',
    'The temperature immediately becomes 20.':
      'A continuous differential equation pulls T asymptotically toward equilibrium 20 over time rather than producing an instantaneous discontinuous jump.',
  },
  'ap-calculus-ab-foundation-pilot-item-063': {
    "Differentiating gives y'=Ce^(2x)":
      'This forgets the chain-rule factor 2 from differentiating the inner exponent 2x; properly differentiating y=Ce^(2x) gives y prime=2Ce^(2x)=2y.',
    'Every exponential satisfies every differential equation':
      'Only functions whose derivative equals 2y satisfy y prime=2y; other exponentials such as e^x or e^(3x) fail when substituted into the equation.',
  },
  'ap-calculus-ab-foundation-pilot-item-064': {
    'Yes, because both expressions contain x.':
      'Merely sharing the variable x does not make the derivative 2x identical to the function x^2 across all real numbers, since 2x equals x^2 only at 0 and 2.',
  },
  'ap-calculus-ab-foundation-pilot-item-065': {
    '-2':
      'Computing -1-1=-2 incorrectly negates the x-coordinate instead of substituting (1,1) directly into the slope equation y prime=x-y=1-1=0.',
    '1':
      'This reports the x-coordinate or y-coordinate by itself instead of subtracting y from x in y prime=x-y to obtain 1-1=0 at (1,1).',
    '2':
      'Adding 1+1=2 evaluates x+y instead of x-y, using the wrong sign when finding the slope-field segment at the point (1,1).',
  },
  'ap-calculus-ab-foundation-pilot-item-066': {
    'y=1 only':
      'Substituting y=1 into y prime=y(3-y) produces 1(3-1)=2, which is nonzero, so y=1 is not a constant equilibrium solution.',
    'y=-3 and y=3':
      'Substituting y=-3 yields (-3)(6)=-18 instead of 0; setting y(3-y)=0 shows that the constant equilibrium solutions occur at y=0 and y=3.',
    'None':
      'Constant equilibrium solutions exist wherever the autonomous right-hand side equals zero, which occurs here at the two values y=0 and y=3.',
  },
  'ap-calculus-ab-foundation-pilot-item-067': {
    'y^2/2=x^2/2+C':
      'Multiplying both sides by y instead of dividing by y treats the separable equation dy/dx=xy as though it were dy/dx=x/y.',
    'y=x^2/2+C':
      'Integrating x dx to x^2/2 without first dividing both sides by y skips separating the dependent variable y into (1/y)dy.',
  },
  'ap-calculus-ab-foundation-pilot-item-068': {
    'y=2e^(3x)':
      'This swaps the initial value C=3 from y(0)=3 with the exponential rate constant k=2 from the differential equation dy/dx=2y.',
    'y=3e^x':
      'Dropping the factor 2 from the exponent produces a function satisfying y prime=y rather than matching the given rate equation dy/dx=2y.',
    'y=3+2x':
      'This treats dy/dx=2y as a constant-slope linear equation dy/dx=2 instead of separating variables to obtain exponential growth y=3e^(2x).',
  },
  'ap-calculus-ab-foundation-pilot-item-069': {
    '2/d':
      'Setting e^(kd)=2 requires taking the natural logarithm of both sides to get kd=ln(2) before dividing by d, rather than dividing 2 directly by d.',
    'd/ln(2)':
      'This inverts the quotient when solving kd=ln(2) for k; isolating k divides ln(2) by the doubling time d, not d by ln(2).',
    'ln(d)/2':
      'This mistakenly applies the natural logarithm to the doubling time d and divides by 2 instead of taking ln(2) and dividing by d.',
  },
  'ap-calculus-ab-foundation-pilot-item-070': {
    '0':
      'At P=0 the logistic rate P prime=0.2(0)(1-0/500) equals 0, which is a stationary equilibrium rather than the point of fastest growth.',
    '100':
      'Multiplying the rate constant 0.2 by the carrying capacity 500 gives 100, whereas maximum logistic growth always occurs at half the carrying capacity, K/2=250.',
    '500':
      'At carrying capacity P=500, the factor (1-P/500) vanishes so P prime=0, meaning population growth has slowed to zero rather than peaked.',
  },
  'ap-calculus-ab-foundation-pilot-item-071': {
    '9':
      'This reports the definite integral of x^2 over [0,3] itself without dividing by the interval length b-a=3-0=3 to compute the average value.',
    '1':
      'Dividing the definite integral 9 by 3^2=9 divides by the square of the upper endpoint instead of dividing by the interval width b-a=3.',
    '27':
      'Multiplying the definite integral 9 by the interval width 3 performs multiplication instead of applying the average-value factor 1/(b-a)=1/3.',
  },
  'ap-calculus-ab-foundation-pilot-item-072': {
    '2.5':
      'Dividing the integral 20 by 8 miscomputes the interval width; on [2,7] the length is b-a=7-2=5, so the average value is 20/5=4.',
    '5':
      'This reports only the interval length b-a=7-2=5 rather than dividing the given definite integral 20 by 5 to find the average value 4.',
    '20':
      'This returns the total definite integral 20 directly without dividing by the interval width 7-2=5 as required by the average-value formula.',
  },
  'ap-calculus-ab-foundation-pilot-item-073': {
    '6 meters':
      'Evaluating the acceleration a(t)=6t at t=1 or integrating 3t instead of 3t^2 fails to compute the definite integral of v(t)=3t^2 on [0,2].',
    '12 meters':
      'Evaluating v(2)=3(2)^2=12 reports the instantaneous velocity at t=2 instead of integrating v(t) from t=0 to t=2 to find net displacement.',
  },
  'ap-calculus-ab-foundation-pilot-item-074': {
    'V0+I(T)-O(T)':
      'The difference I(T)-O(T) gives an instantaneous net rate at time T rather than the total accumulated volume change integrated across [0,T].',
    'Integral 0 to T of [I(t)+O(t)]dt':
      'This omits the starting volume V0 and mistakenly adds the outflow rate O(t) to the inflow rate I(t) instead of subtracting outflow.',
  },
  'ap-calculus-ab-foundation-pilot-item-075': {
    '-1/6':
      'On [0,1], y=x lies above y=x^2, so integrating x^2-x subtracts the upper curve from the lower curve and produces a negative area.',
    '1/3':
      'This evaluates only the definite integral of x^2 on [0,1] instead of finding the enclosed area between the upper line y=x and lower parabola y=x^2.',
    '1/2':
      'This evaluates only the definite integral of y=x on [0,1] without subtracting the area 1/3 underneath the lower boundary curve y=x^2.',
  },
  'ap-calculus-ab-foundation-pilot-item-076': {
    'Integral 0 to 2 of (y^2-2y)dy':
      'For 0<=y<=2, the line x=2y lies to the right of x=y^2, so integrating y^2-2y reverses right minus left and produces a negative value.',
  },
  'ap-calculus-ab-foundation-pilot-item-077': {
    'Integral of x dx':
      'Integrating the side length x without squaring it computes a two-dimensional area rather than summing the square cross-sectional areas A(x)=x^2.',
    'pi times integral of x^2':
      'Multiplying by pi applies a circular-disk volume formula rather than integrating square cross sections whose area is simply side squared, x^2.',
    'Integral of 4x':
      'Integrating 4x sums the perimeters of the square slices across [0,2] rather than integrating their cross-sectional areas A(x)=x^2.',
  },
  'ap-calculus-ab-foundation-pilot-item-078': {
    'pi d(x)/2':
      'Multiplying diameter d(x) by pi/2 computes the semicircular arc length (half the circumference) rather than the semicircular cross-sectional area (1/2)pi r^2.',
  },
  'ap-calculus-ab-foundation-pilot-item-079': {
    '16 pi':
      'Omitting the factor 1/2 when integrating r(x)^2=x into x^2/2 over [0,4] doubles the true solid-of-revolution volume from 8 pi to 16 pi.',
  },
  'ap-calculus-ab-foundation-pilot-item-080': {
    'pi integral 0 to 1 of (x^4-x^2)dx':
      'On [0,1], the line y=x lies farther from the x-axis than y=x^2, so writing x^4-x^2 reverses outer and inner squared radii and yields a negative value.',
    '2 pi integral 0 to 1 of x(x-x^2)dx':
      'This sets up the cylindrical-shell integral for revolving around the y-axis rather than the washer integral pi(R^2-r^2) for rotation about the x-axis.',
  },
  'ap-calculus-ab-foundation-pilot-item-081': {
    '1':
      'This reports the input coordinate x=1 that x is approaching rather than the y-value 4 that the curve approaches from both sides.',
  },
  'ap-calculus-ab-foundation-pilot-item-082': {
    '0':
      'The table outputs -1.1, -1.01, -0.99, and -0.9 converge tightly around -1 from both sides rather than approaching 0.',
    '2':
      'This reports the target x-value x=2 from the table header rather than the limiting y-value -1 that the outputs approach.',
  },
  'ap-calculus-ab-foundation-pilot-item-083': {
    '4':
      'Factoring (x^3-8)/(x-2) produces x^2+2x+4; substituting x=2 into only x^2=4 drops both the linear 2x term and the constant 4.',
    '8':
      'Evaluating x^2+2x=8 at x=2 (or computing 2^3=8) omits the constant +4 in the simplified difference-of-cubes quotient x^2+2x+4.',
  },
  'ap-calculus-ab-foundation-pilot-item-084': {
    '0':
      'Evaluating only the numerator sin(0)=0 overlooks that the denominator also approaches 0, creating a 0/0 indeterminate form rather than a limit of 0.',
    '1/5':
      'Dividing by 5 instead of multiplying by 5 inverts the scaling factor needed to rewrite sin(5x)/x as 5 times sin(5x)/(5x).',
    '1':
      'Applying lim sin(u)/u=1 directly without matching the denominator to 5x drops the inner coefficient 5 from the limit of sin(5x)/x.',
  },
  'ap-calculus-ab-foundation-pilot-item-085': {
    '-3':
      'Setting 3+k=0 instead of matching the left-hand limit 1+2=3 produces k=-3 and creates a 3-unit jump discontinuity at x=1.',
    '1':
      'Choosing k=1 sets the right-hand value to 3(1)+1=4, which fails to match the left-hand limit 1+2=3 needed for continuity at x=1.',
  },
  'ap-calculus-ab-foundation-pilot-item-086': {
    'No discontinuity':
      'Because substituting x=-2 makes the denominator x+2 equal to zero, f(-2) is undefined and the function has a vertical asymptote there.',
  },
  'ap-calculus-ab-foundation-pilot-item-087': {
    '0':
      'When numerator and denominator share the same leading degree (x^3), the end-behavior limit approaches the ratio of leading coefficients 2/5, not 0.',
  },
  'ap-calculus-ab-foundation-pilot-item-089': {
    'Exactly one such c exists':
      'The Intermediate Value Theorem guarantees at least one input c with f(c)=4 on (2,5), but a continuous graph may cross y=4 multiple times.',
    'The function is decreasing everywhere':
      'Having f(2)=8 above f(5)=1 only compares endpoint heights and still allows the curve to rise and fall repeatedly across [2,5].',
  },
  'ap-calculus-ab-foundation-pilot-item-090': {
    'The function f is differentiable only at the point a.':
      'Knowing that a function is differentiable at a single endpoint does not guarantee continuity across the entire closed interval [a,b] as IVT requires.',
    'The values f(a) and f(b) are equal for every such k.':
      'When f(a)=f(b), there are no distinct output values strictly between the two endpoint heights for the Intermediate Value Theorem to target.',
  },
  'ap-calculus-ab-foundation-pilot-item-091': {
    '0':
      'The observed secant slopes -2.8, -2.98, -3.02, and -3.2 bracket and converge toward -3 rather than approaching a horizontal slope of 0.',
  },
  'ap-calculus-ab-foundation-pilot-item-092': {
    'f(2)=5':
      'Writing f(2)=5 records the vertical point height y=5 on the graph at x=2 rather than stating that the tangent-line slope is 5.',
    "f'(5)=2":
      'This reverses the input coordinate x=2 and the tangent-line slope 5 inside derivative notation; the slope at x=2 is written f prime(2)=5.',
  },
  'ap-calculus-ab-foundation-pilot-item-093': {
    'The function is discontinuous at c':
      'The problem explicitly gives that f is continuous at x=c; mismatching one-sided slopes 2 and -1 create a sharp corner rather than a break.',
  },
  'ap-calculus-ab-foundation-pilot-item-094': {
    'f has a local maximum at c':
      'A finite derivative guarantees local continuity and a non-vertical tangent line, but the slope at c can be positive, negative, or zero without any peak.',
    'f(c)=0':
      'Having a finite derivative at x=c places no restriction on the output height f(c), which may equal any real number.',
  },
  'ap-calculus-ab-foundation-pilot-item-095': {
    '1/3':
      'Omitting the power-rule coefficient 1/2 when differentiating x^(1/2) gives 1/sqrt(9)=1/3 at x=9 instead of the true derivative value 1/(2 sqrt(9))=1/6.',
    '6':
      'This evaluates only the denominator 2 sqrt(9)=6 of f prime(9)=1/(2 sqrt(9)) instead of taking its reciprocal to get 1/6.',
  },
  'ap-calculus-ab-foundation-pilot-item-096': {
    '-12/x^4 - 2x':
      'Differentiating the linear term -2x yields the constant -2, so retaining -2x leaves the second term completely undifferentiated.',
    '4/x^2 - 2':
      'Rewriting 4/x^3 as 4x^(-3) gives -12x^(-4), so writing 4/x^2 forgets both multiplying by -3 and decreasing the exponent to -4.',
  },
  'ap-calculus-ab-foundation-pilot-item-098': {
    'e^(-3x)':
      'This leaves the exponential unchanged without multiplying by the chain-rule derivative d/dx(-3x)=-3 required for a composite exponent.',
    '3e^(-3x)':
      'This drops the negative sign when differentiating the inner linear exponent -3x, producing +3 instead of the required factor -3.',
    '-3xe^(-3x)':
      'This multiplies by the entire inner exponent -3x instead of multiplying by its derivative d/dx(-3x)=-3 under the chain rule.',
  },
  'ap-calculus-ab-foundation-pilot-item-099': {
    '-4':
      'This evaluates only the first product-rule term f prime(1)g(1)=(-1)(4)=-4 and leaves out the second term f(1)g prime(1)=(2)(3)=6.',
    '5':
      'Miscombining table values or summing derivatives directly misses the product-rule formula, which combines f prime(1)g(1)=(-1)(4) and f(1)g prime(1)=(2)(3) to give 2.',
    '6':
      'This evaluates only the second product-rule term f(1)g prime(1)=(2)(3)=6 while completely omitting the first product-rule term f prime(1)g(1)=(-1)(4)=-4.',
  },
  'ap-calculus-ab-foundation-pilot-item-100': {
    '-1/4':
      'Dividing f prime(1)/g prime(1) or forgetting to square g(1)=4 in the denominator misses the quotient-rule formula [f prime g - f g prime]/g^2.',
    '1/8':
      'Adding instead of subtracting in the quotient-rule numerator produces 2/16=1/8 rather than evaluating [(-1)(4)-(2)(3)] divided by 4^2 to get -5/8.',
    '5/8':
      'Reversing the subtraction order in the quotient-rule numerator to f g prime - f prime g flips the final sign from -5/8 to +5/8.',
  },
  'ap-calculus-ab-foundation-pilot-item-101': {
    'e^(sin x) sin x':
      'By the chain rule, differentiating e^(sin x) multiplies by d/dx(sin x)=cos x rather than multiplying by the undifferentiated exponent sin x.',
    'cos(e^x)':
      'This reverses the function composition by placing e^x inside cosine instead of differentiating the outer exponential with inner function sin x.',
  },
  'ap-calculus-ab-foundation-pilot-item-103': {
    '-5/4':
      'Implicit differentiation of x^2+xy+y^2=7 gives 2x+y+(x+2y)(dy/dx)=0, so the slope at (1,2) is -(2x+y)/(x+2y)=-4/5; writing -5/4 inverts that ratio.',
    '4/5':
      'Dropping the negative sign when moving 2x+y to the right side of the equation flips the slope at (1,2) from -4/5 to +4/5.',
    '5/4':
      'This commits two errors at once by dropping the negative sign and inverting the numerator and denominator of -(2x+y)/(x+2y).',
  },
  'ap-calculus-ab-foundation-pilot-item-104': {
    '1/2':
      'Using 2y instead of 3y^2+1 misapplies the power rule to x=y^3+y; differentiating with respect to y gives dx/dy=3(1)^2+1=4.',
    '4':
      'This computes the derivative dx/dy=3y^2+1=4 at y=1 without taking the reciprocal 1/(dx/dy) required to obtain the slope dy/dx=1/4.',
  },
  'ap-calculus-ab-foundation-pilot-item-105': {
    '-2.0':
      'This reports the original slope f prime(4)=-2 directly instead of taking its reciprocal 1/(-2)=-0.5 via the inverse-derivative theorem.',
    '2.0':
      'This negates the given slope f prime(4)=-2 without taking the reciprocal 1/f prime(4) required for the derivative of the inverse at 1.',
  },
  'ap-calculus-ab-foundation-pilot-item-106': {
    '1/sqrt(1-4x^2)':
      'This substitutes u=2x into 1/sqrt(1-u^2) properly but forgets to multiply the numerator by the chain-rule factor u prime=2.',
    '2/sqrt(1-2x^2)':
      'Squaring the inner argument u=2x inside sqrt(1-u^2) produces (2x)^2=4x^2 rather than 2x^2, because the coefficient 2 must be squared.',
    '-2/sqrt(1-4x^2)':
      'The negative sign belongs to the derivative of arccos(2x), whereas the derivative of arcsin(2x) is positive on its domain.',
  },
  'ap-calculus-ab-foundation-pilot-item-107': {
    '6x ln(x^2+1)':
      'Differentiating ln(u) replaces the logarithm entirely with u prime/u, so keeping ln(x^2+1) in the expression misapplies the logarithmic derivative rule.',
    '3x^2/(x^2+1)':
      'Rewriting as 3 ln(x^2+1) requires multiplying by d/dx(x^2+1)=2x in the numerator to get 6x/(x^2+1), rather than multiplying by x^2.',
  },
  'ap-calculus-ab-foundation-pilot-item-108': {
    'The power rule alone suffices for it':
      'The power rule handles x^2 by itself, but it cannot differentiate a product of two functions or the nested composition sin(e^x).',
    'The quotient rule alone suffices here':
      'There is no fraction or division in x^2 sin(e^x); differentiating it requires the product rule paired with a nested chain rule.',
  },
  'ap-calculus-ab-foundation-pilot-item-110': {
    '16':
      'Evaluating s(2)=2^4=16 computes the particle position at t=2 instead of differentiating three times to evaluate the jerk s triple prime(t)=24t.',
    '24':
      'This reports only the constant coefficient 24 of the third derivative s triple prime(t)=24t without substituting t=2 to obtain 48.',
    '96':
      'Multiplying 24 by t^2=4 evaluates the wrong power of t; after three derivatives of t^4, the formula is 24t, which equals 48 at t=2.',
  },
  'ap-calculus-ab-foundation-pilot-item-111': {
    'At hour 12, the population equals 10 people.':
      'In R prime(10)=12, the input 10 is the time in hours and 12 is the instantaneous rate in people per hour, so this swaps both values and units.',
  },
  'ap-calculus-ab-foundation-pilot-item-112': {
    'Meters per degree Celsius':
      'Derivative units divide output units by input units (dT/dh), so meters per degree Celsius inverts the ratio into dh/dT instead of T prime(h).',
  },
  'ap-calculus-ab-foundation-pilot-item-113': {
    '(1,4) and (4,infinity)':
      'On (1,4), the factors (t-1) and (t-4) have opposite signs so velocity is negative (moving left), whereas velocity is positive on [0,1) and (4,infinity).',
  },
  'ap-calculus-ab-foundation-pilot-item-114': {
    't=0 and t=2':
      'At t=0 velocity is v(0)=9, and t=2 makes acceleration a(t)=6t-12 equal zero rather than solving v(t)=3(t-1)(t-3)=0 for rest times.',
    't=3 alone':
      'Setting v(t)=3(t-1)(t-3)=0 identifies two positive rest times; reporting only t=3 catches one root while overlooking the earlier rest time t=1.',
  },
  'ap-calculus-ab-foundation-pilot-item-115': {
    '12 pi cubic centimeters per second':
      'Using 4 pi r(dr/dt) instead of dV/dt=4 pi r^2(dr/dt) forgets to square the radius r=2 when differentiating V=(4/3)pi r^3.',
    '24 pi cubic centimeters per second':
      'Differentiating V=(4/3)pi r^3 gives dV/dt=4 pi r^2(dr/dt)=4 pi(2^2)(3)=48 pi, so 24 pi drops a factor of 2 in the arithmetic.',
    '36 pi cubic centimeters per second':
      'Swapping r=2 and dr/dt=3 or miscomputing 4(4)(3) as 36 fails to evaluate dV/dt=4 pi(2^2)(3), which equals 48 pi cm^3/s.',
  },
  'ap-calculus-ab-foundation-pilot-item-116': {
    '6 pi cubic centimeters per second':
      'With fixed h=6, V=2 pi r^2 gives dV/dt=4 pi r(dr/dt)=4 pi(2)(0.5)=4 pi; arriving at 6 pi misapplies the cone factor 1/3 or arithmetic.',
    '12 pi cubic centimeters per second':
      'Omitting the factor 1/3 from the cone volume formula V=(1/3)pi r^2 h triples the true volume rate from 4 pi to 12 pi.',
  },
  'ap-calculus-ab-foundation-pilot-item-117': {
    '0.98':
      'Subtracting 0.02 from 1 computes 1 minus 0.02 instead of using the tangent-line linearization L(x)=ln(1)+(1/1)(x-1), which evaluates to 0+0.02=0.02 at x=1.02.',
    '1.02':
      'Because ln(1)=0 rather than 1, adding delta x=0.02 to 1 mistakenly uses the x-coordinate 1 in place of the function height f(1)=0.',
    '2.00':
      'Using 1+1=2 ignores both the base height ln(1)=0 and the small displacement delta x=0.02 in the tangent-line formula.',
  },
  'ap-calculus-ab-foundation-pilot-item-118': {
    'It always equals them.':
      'A tangent line matches a curved function exactly only at the point of tangency; on a concave-down curve it lies above nearby points.',
  },
  'ap-calculus-ab-foundation-pilot-item-119': {
    '1':
      'Treating sin(3x)/sin(5x) as if it behaved like sin(x)/x ignores the distinct inner scaling constants 3 and 5 in numerator and denominator.',
    '5/3':
      'Applying L Hospital Rule gives (3 cos 3x)/(5 cos 5x), which approaches 3/5 at x=0, so 5/3 inverts the ratio of inner derivatives.',
    '15':
      'Multiplying the inner coefficients 3 and 5 combines them as a product instead of taking their ratio 3/5 as x approaches 0.',
  },
  'ap-calculus-ab-foundation-pilot-item-120': {
    '1':
      'Treating the infinity/infinity indeterminate form as 1 overlooks that exponential growth e^x outpaces linear growth x without bound.',
    'Infinity':
      'After applying L Hospital Rule once, x/e^x becomes 1/e^x, which shrinks toward 0 as x increases rather than growing toward infinity.',
    'The limit does not exist':
      'Because 1/e^x converges smoothly to 0 as x approaches positive infinity, the original limit exists and equals the finite value 0.',
  },
  'ap-calculus-ab-foundation-pilot-item-121': {
    'c=0':
      'At c=0, the instantaneous slope f prime(0)=3(0)^2=0 fails to equal the average secant slope [8-(-1)]/[2-(-1)]=3 required by MVT.',
  },
  'ap-calculus-ab-foundation-pilot-item-122': {
    'The derivative is equal to zero at the point x=0.':
      'At x=0, both the function f(x)=1/x and its derivative f prime(x)=-1/x^2 are undefined due to division by zero rather than equal to zero.',
    'The given interval contains negative inputs.':
      'Intervals spanning negative and positive x-values satisfy the Mean Value Theorem whenever continuity on [a,b] and differentiability on (a,b) hold.',
  },
  'ap-calculus-ab-foundation-pilot-item-124': {
    'It is differentiable at every point of the interval (a,b).':
      'The Extreme Value Theorem requires only continuity on the closed interval [a,b] and guarantees nothing about differentiability on (a,b).',
    'Its endpoint values are always the extreme values on [a,b].':
      'A continuous function on [a,b] can attain its highest or lowest value at interior peaks or valleys rather than solely at the endpoints.',
  },
  'ap-calculus-ab-foundation-pilot-item-125': {
    'No local extrema':
      'Although f prime does not change sign at x=0, it changes cleanly from negative to positive at x=2, guaranteeing a local minimum there.',
  },
  'ap-calculus-ab-foundation-pilot-item-126': {
    'f has a local minimum at -1 and maximum at 3.':
      'This reverses the First Derivative Test sign rules at both critical numbers: positive to negative yields a maximum, and negative to positive yields a minimum.',
    'f has no local extrema.':
      'Because f prime changes sign at both x=-1 and x=3, each of those critical points produces a local extremum on the graph of f.',
  },
  'ap-calculus-ab-foundation-pilot-item-127': {
    'The graph of the function is increasing on both sides of x equals c.':
      'The sign of f double prime governs concavity alone and provides no information about whether f prime is positive or negative near x=c.',
  },
  'ap-calculus-ab-foundation-pilot-item-130': {
    'Two 25-meter sides and one 150-meter side':
      'These dimensions satisfy 2(25)+150=200 meters of fence, yet the enclosed area is 25(150)=3,750 square meters, well below the 5,000 square meter maximum.',
    'Two 75-meter sides and one 50-meter side':
      'Setting x=75 and y=50 uses all 200 meters of fence but yields only 3,750 square meters, below the vertex optimum x=50, y=100 giving 5,000.',
  },
  'ap-calculus-ab-foundation-pilot-item-131': {
    'Displacement 6; total distance 6':
      'Total distance integrates |v(t)|, so the negative velocity area -4 must be added positively (10+4=14) rather than canceling part of the motion.',
    'Displacement 14; total distance 14':
      'Displacement integrates signed velocity v(t), keeping backward motion negative to give 10-4=6 rather than adding both areas as positive.',
  },
  'ap-calculus-ab-foundation-pilot-item-132': {
    'The number of items that are produced for every one dollar':
      'Integrating marginal cost (dollars per item) with respect to quantity (items) cancels items and yields net dollars, not items per dollar.',
  },
  'ap-calculus-ab-foundation-pilot-item-134': {
    '28':
      'Computing 2(5+9)=28 evaluates the right Riemann sum on [0,4] rather than averaging adjacent heights in the trapezoidal sum 2[(1+5)/2+(5+9)/2]=20.',
  },
  'ap-calculus-ab-foundation-pilot-item-135': {
    '3x^2':
      'The constant upper bound 3 has derivative 0 and never multiplies x^2; reversing bounds to put x on top introduces a negative sign, giving -x^2.',
  },
  'ap-calculus-ab-foundation-pilot-item-136': {
    'x^2-x':
      'This substitutes both bounds into the integrand t but omits multiplying the upper-bound term by the chain-rule derivative d/dx(x^2)=2x.',
    '2x^2-1':
      'This differentiates the limits into 2x and 1 without substituting the upper limit x^2 and lower limit x properly into the integrand t.',
    'x^3-x':
      'This multiplies x^2 by x instead of 2x, dropping the coefficient 2 from the chain-rule derivative of the upper limit x^2.',
  },
  'ap-calculus-ab-foundation-pilot-item-137': {
    '7':
      'Keeping +7 ignores the definite-integral reversal property: swapping upper and lower bounds reverses the orientation and negates the value.',
    '14':
      'Doubling 7 does not follow from interchanging integration limits; swapping the bounds from [a,b] to [b,a] negates the integral to -7.',
  },
  'ap-calculus-ab-foundation-pilot-item-138': {
    'The integral from 0 to 3 of f(x)dx alone':
      'Keeping only the half-interval [0,3] drops the equal signed area over [-3,0], cutting the total symmetric integral in half.',
    '-2 times the integral from 0 to 3 of f(x)dx':
      'Because an even function satisfies f(-x)=f(x), the left and right halves contribute identical signs rather than negating the integral.',
  },
  'ap-calculus-ab-foundation-pilot-item-139': {
    'x^4+2 ln x':
      'This omits both the absolute value bars required in ln|x| for negative x-values and the arbitrary constant of integration +C.',
    'x^4+ln|2x|+C':
      'By constant-multiple integration, the factor 2 remains outside as 2 ln|x| rather than moving inside the logarithm as ln|2x|.',
  },
  'ap-calculus-ab-foundation-pilot-item-140': {
    '1/(3x+1)^2+C':
      'This differentiates (3x+1)^(-1) up to a sign and constant rather than substituting u=3x+1 and integrating (1/u)du to ln|3x+1|+C.',
  },
  'ap-calculus-ab-foundation-pilot-item-141': {
    'The quantity Q grows toward a carrying capacity that is equal to 0.1 units.':
      'A carrying capacity requires a logistic factor (1-Q/K), whereas dQ/dt=-0.1Q has a negative proportionality constant modeling pure exponential decay.',
    'The quantity Q remains constant, because the equation has no explicit t in it.':
      'Autonomous differential equations lack an explicit t variable yet still change continuously over time whenever the derivative dQ/dt is nonzero.',
  },
  'ap-calculus-ab-foundation-pilot-item-142': {
    'dP/dt=k+P':
      'Direct proportionality means the rate of change is a constant multiple of P (multiplication, kP) rather than adding a constant k to P.',
    'dP/dt=k/P':
      'Dividing k by P models inverse proportionality to population size instead of direct proportionality where larger populations change proportionally faster.',
  },
  'ap-calculus-ab-foundation-pilot-item-143': {
    'No, because y prime is instead equal to x.':
      'Differentiating y=x+1 gives y prime=1, not x (which is the derivative of x^2/2), so the function satisfies y prime=1.',
  },
  'ap-calculus-ab-foundation-pilot-item-144': {
    'No, because the derivative is e^x+2.':
      'The constant term +2 has derivative 0 rather than surviving differentiation, leaving y prime=e^x, which exactly matches y-2=(e^x+2)-2=e^x.',
    'No, because y-2 equals 2.':
      'Substituting y=e^x+2 into the right-hand side y-2 cancels the constant 2 and simplifies to e^x rather than 2.',
    'Yes, but only when x=0.':
      'Both y prime and y-2 simplify identically to e^x for every real number x, so the equation holds across the entire real line.',
  },
  'ap-calculus-ab-foundation-pilot-item-145': {
    '-3':
      'Computing -1-2=-3 subtracts the y-coordinate instead of adding it; substituting (-1,2) directly into y prime=x+y gives -1+2=1.',
    '-1':
      'This reports only the x-coordinate -1 (or flips the sign of 1) instead of summing both coordinates x+y=-1+2=1.',
    '3':
      'Adding the absolute values |-1|+|2|=3 drops the negative sign on x=-1 when evaluating the slope-field formula x+y.',
  },
  'ap-calculus-ab-foundation-pilot-item-146': {
    'y=-x':
      'Along the line y=-x, the slope formula gives y prime=x-(-x)=2x, which is nonzero wherever x is nonzero rather than horizontal.',
    'y=0':
      'Along the x-axis y=0, the slope equals x-0=x, so the segments are horizontal only at the origin rather than along the whole line.',
    'x=0':
      'Along the y-axis x=0, the slope equals 0-y=-y, which varies with y instead of remaining zero along the vertical axis.',
  },
  'ap-calculus-ab-foundation-pilot-item-147': {
    'y=x^2/2+2':
      'Integrating x dx into x^2/2 without separating y onto the left side treats dy/dx=x/y as though it were dy/dx=x.',
    'y=sqrt(x^2+2)':
      'Substituting the initial condition y(0)=2 into the integrated equation y^2=x^2+C gives C=2^2=4 rather than C=2, yielding y=sqrt(x^2+4).',
    'y=-sqrt(x^2+4)':
      'Selecting the negative square-root branch gives y(0)=-2, which contradicts the positive initial condition y(0)=2 required by the problem.',
  },
  'ap-calculus-ab-foundation-pilot-item-148': {
    'y=5e^(-x)':
      'After separating into (1/y)dy=-x dx, integrating -x dx produces -x^2/2 in the exponent rather than the linear exponent -x.',
    'y=e^(-5x^2/2)':
      'Using y(0)=5 determines the multiplicative coefficient C=5 outside the exponential function rather than multiplying inside the exponent.',
    'y=5-x^2/2':
      'Integrating -x dx directly without dividing by y skips separating the dependent variable y into (1/y)dy and ln|y|.',
  },
  'ap-calculus-ab-foundation-pilot-item-149': {
    '-h ln(2)':
      'Setting e^(kh)=1/2 gives kh=-ln(2), so solving for k divides by the half-life h rather than multiplying by h.',
    '1/(2h)':
      'Solving e^(kh)=1/2 for k requires taking the natural logarithm of 1/2 to get -ln(2) before dividing by h, not dividing 1/2 by h.',
  },
  'ap-calculus-ab-foundation-pilot-item-150': {
    'P=K/2 only':
      'At P=K/2 the logistic growth rate P prime reaches its positive maximum rather than zero, so P=K/2 is an inflection level, not an equilibrium.',
    'P=k and P=K':
      'The growth-rate parameter k is not a root of kP(1-P/K)=0; setting the first factor to zero gives the lower equilibrium P=0.',
    'There are no equilibria':
      'Setting the autonomous logistic right-hand side kP(1-P/K) equal to zero yields two constant equilibrium solutions, namely P=0 and P=K.',
  },
  'ap-calculus-ab-foundation-pilot-item-151': {
    '8':
      'Misapplying the antiderivative F(x)=x^2+x at the endpoints gives 8 instead of computing [F(3)-F(1)] divided by (3-1), which equals (12-2)/2=5.',
    '10':
      'This reports the definite integral of 2x+1 over [1,3] itself without dividing by the interval length b-a=3-1=2 for the average value.',
  },
  'ap-calculus-ab-foundation-pilot-item-152': {
    'The function must also be differentiable on the interval [a,b].':
      'Unlike the derivative Mean Value Theorem, the Mean Value Theorem for Integrals requires only continuity on the closed interval [a,b], not differentiability.',
  },
  'ap-calculus-ab-foundation-pilot-item-153': {
    '-7':
      'Computing -2-5=-7 subtracts the starting position instead of adding initial position s(0)=5 plus net displacement -2 to get s(4)=3.',
    '-2':
      'This reports only the net displacement integral over [0,4] without adding it to the starting position s(0)=5.',
    '7':
      'Adding 5+2=7 ignores the negative sign on the velocity integral -2, treating backward displacement as forward motion.',
  },
  'ap-calculus-ab-foundation-pilot-item-154': {
    'Integrate the velocity just once without splitting the interval.':
      'Integrating signed velocity directly over the full interval computes net displacement, allowing forward and backward motion to cancel out.',
    'Differentiate the velocity and then add up the endpoint values.':
      'Differentiating velocity produces acceleration rather than distance, and summing the endpoint values of acceleration never measures total distance traveled.',
  },
  'ap-calculus-ab-foundation-pilot-item-155': {
    '8sqrt(2)/3':
      'Integrating (4-2x^2) only from 0 to sqrt(2) computes just the right half of the symmetric region enclosed between -sqrt(2) and sqrt(2).',
    '16/3':
      'Dropping the irrational factor sqrt(2) when substituting x=sqrt(2) into the antiderivative 4x-(2/3)x^3 leaves out a radical factor and understates the area.',
  },
  'ap-calculus-ab-foundation-pilot-item-156': {
    'Integral from -2 to 2 of 2y^2dy':
      'Solving 4-y^2=y^2 gives y=plus/minus sqrt(2) rather than plus/minus 2, and the right-minus-left width is (4-y^2)-y^2=4-2y^2, not 2y^2.',
  },
  'ap-calculus-ab-foundation-pilot-item-157': {
    '(sqrt(3)/2)[s(x)]^2':
      'Multiplying base s by height (sqrt(3)/2)s omits the triangle area factor 1/2, doubling the true equilateral-triangle cross-sectional area.',
    '(pi/4)[s(x)]^2':
      'Using pi/4 times s(x)^2 computes the area of a full circular disk with diameter s(x) rather than an equilateral triangle.',
  },
  'ap-calculus-ab-foundation-pilot-item-158': {
    'pi times the integral from 0 to 1 of (sqrt(x)-x)^2dx':
      'Multiplying by pi applies a circular-disk formula, whereas square cross sections perpendicular to the x-axis have area s^2 without pi.',
    'Integral from 0 to 1 of (x-x^2)dx':
      'Squaring the binomial side length (sqrt(x)-x)^2 must include the middle term -2x^(3/2) and cannot be simplified to x-x^2.',
  },
  'ap-calculus-ab-foundation-pilot-item-159': {
    '2pi integral from 0 to 2 of (x+1)dx':
      'A washer integral about y=-1 uses pi(R^2-r^2) with squared radii (x+1)^2-1^2 rather than 2 pi times a single linear radius.',
  },
  'ap-calculus-ab-foundation-pilot-item-160': {
    '4pi/3':
      'Using 2^2=4 instead of 2^3=8 when evaluating pi[(2-x)^3/3] across [0,2] forgets to cube the radius endpoint and halves the volume.',
    '8pi':
      'Omitting the denominator 3 from the reverse power rule when integrating (2-x)^2 triples the true solid volume from 8pi/3 to 8pi.',
  },
};
