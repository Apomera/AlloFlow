'use strict';
// Authored per-distractor math-error feedback for AP Calculus AB items 001-080.
module.exports = {
  'item-001': {
    '9': 'This reports the defined point value f(2)=9 rather than the nearby behavior of f(x) as x approaches 2.',
    '14': 'Adding the nearby trend 5 and the point value f(2)=9 combines two unrelated quantities instead of finding a limit.',
    'The limit does not exist': 'A mismatch between the nearby trend and f(2) breaks continuity, but the two-sided limit still exists because both sides approach 5.',
  },
  'item-002': {
    'The limit is 3, the left-hand value.': 'A one-sided limit from the left alone cannot define a two-sided limit when the right-hand side approaches 7.',
    'The limit is 5, the average of 3 and 7.': 'Two-sided limits never average disagreeing one-sided limits; the left and right trends must match.',
    'The limit is 7, the right-hand value.': 'Approaching 7 from the right establishes only the right-hand limit, not a two-sided limit at x=4.',
  },
  'item-003': {
    '0': 'Evaluating the numerator alone at x=3 gives 0, ignoring the 0/0 indeterminate form that requires factoring first.',
    '3': 'This substitutes x=3 without adding the remaining constant in the simplified factor x+3, which approaches 6.',
    'The limit does not exist': 'Division by zero at x=3 creates a hole in the graph, not a missing limit, because (x-3) cancels for x near 3.',
  },
  'item-004': {
    '0': 'Direct substitution produces 0/0, so treating a zero numerator as a zero limit skips rationalizing the radical.',
    '1/2': 'This drops one of the two 2s in the rationalized denominator sqrt(x+4)+2, which approaches 2+2=4 instead of 2.',
    '4': 'This evaluates the denominator limit sqrt(0+4)+2=4 instead of taking its reciprocal 1/4.',
  },
  'item-005': {
    'A jump discontinuity': 'Both one-sided limits equal 2 here; a jump discontinuity requires two different finite one-sided limits.',
    'An infinite discontinuity': 'Because the factor (x-1) cancels cleanly for x not equal to 1, the outputs stay near 2 rather than growing unbounded.',
    'No discontinuity': 'Continuity at x=1 requires the limit 2 to equal f(1), which fails because f(1) is defined as 4.',
  },
  'item-006': {
    'Removable discontinuity': 'A removable discontinuity requires the left-hand and right-hand limits to agree, whereas 2 and 5 differ.',
    'Infinite discontinuity': 'Both one-sided limits are finite numbers (2 and 5), so the graph has no vertical asymptote at x=0.',
    'Continuous': 'A function cannot be continuous at x=0 when its left-hand and right-hand limits disagree.',
  },
  'item-007': {
    'Negative infinity': 'Squaring (x-4) keeps the denominator strictly positive on both sides of x=4, so the quotient cannot turn negative.',
    '0': 'Dividing a fixed positive constant by a tiny positive number grows arbitrarily large instead of shrinking to zero.',
    '2': 'The numerator alone is 2, ignoring that dividing by (x-4)^2 amplifies the quotient without bound near x=4.',
  },
  'item-008': {
    '0': 'A horizontal asymptote at 0 occurs when the denominator has higher degree, not when both degrees are 2.',
    '1': 'This uses the denominator leading coefficient alone instead of dividing the leading coefficients 3 and 1.',
    'Positive infinity': 'The limit diverges only when the numerator degree exceeds the denominator degree; here both are quadratic.',
  },
  'item-009': {
    'Exactly one such c in (1,4) exists.': 'The Intermediate Value Theorem guarantees at least one root, but the curve could cross zero multiple times.',
    'f is increasing on the interval [1,4].': 'Having f(1)<f(4) does not prevent the function from rising and falling along the interval.',
    "Some c in (1,4) has f'(c)=0 instead.": 'IVT gives an output value of f itself and says nothing about derivatives or horizontal tangents.',
  },
  'item-010': {
    'The function takes the value 3 exactly once.': 'Continuity ensures the graph reaches height 3 at least once, not that it crosses y=3 only a single time.',
    'The slope of the function is constant on [a,b].': 'A continuous function need not be linear or even differentiable between endpoints a and b.',
    'The function has no local extrema on [a,b].': 'Nothing in the Intermediate Value Theorem prevents a continuous curve from having peaks or valleys inside [a,b].',
  },
  'item-011': {
    'f(3)': 'This expression is a limit of slopes of secant lines at x=3, not the function output f(3) itself.',
    "f''(3)": 'The first-order difference quotient of f defines the first derivative f prime(3), not the second derivative.',
    'The average value of f': 'Average value divides a definite integral by interval length rather than taking the limit of a difference quotient.',
  },
  'item-012': {
    '4': 'This reports the input x=4 rather than the derivative 2x evaluated at x=4.',
    '16': 'Evaluating f(4)=4^2 gives the function height 16 instead of the instantaneous slope f prime(4)=8.',
    '32': 'Multiplying f(4)=16 by 2 confuses the derivative 2x with 2 times x^2.',
  },
  'item-013': {
    'The function is not continuous at x=2.': 'Absolute value f(x)=|x-2| is continuous everywhere, including at x=2; continuity alone does not ensure differentiability.',
    'The function value at x=2 is zero.': 'Many differentiable functions cross zero smoothly, such as f(x)=x-2, so f(2)=0 does not block a derivative.',
    'The graph has a minimum point at x=2.': 'Smooth curves like (x-2)^2 have a minimum at x=2 and are still differentiable with slope 0 there.',
  },
  'item-014': {
    'Continuity at c implies differentiability': 'Corners such as |x| at x=0 are continuous yet not differentiable, so this converse is false.',
    'Every discontinuity has a vertical tangent': 'Jump and removable discontinuities have breaks or holes rather than vertical tangent lines.',
    'f(c)=0 implies differentiability': 'Having a zero output says nothing about smoothness, as shown by |x| having f(0)=0 without a derivative.',
  },
  'item-015': {
    '20x^4-6x^2': 'This multiplies each coefficient by the exponent without reducing the power of x by 1.',
    '5x^3-3x': 'This reduces each exponent by 1 but forgets to multiply each term by its original exponent.',
    '20x^3-6x+7': 'The constant term 7 has derivative 0 and must disappear rather than remain unchanged.',
  },
  'item-016': {
    '-1/2': 'This substitutes x=2 into -2x^(-2) instead of reducing the exponent from -2 to -3 to get -2x^(-3).',
    '1/4': 'Dropping the negative sign from the exponent -2 flips the slope from negative to positive.',
    '4': 'This evaluates 2^2 instead of differentiating x^(-2) into -2/x^3 at x=2.',
  },
  'item-017': {
    '3 cos x - 2e^x + ln x': 'The final term ln x was left undifferentiated instead of being replaced by its derivative 1/x.',
    '-3 sin x - 2e^x + 1/x': 'The derivative of 3 sin x is +3 cos x, whereas -3 sin x is the second derivative of 3 sin x.',
    '3 cos x - 2xe^(x-1) + 1': 'This misapplies the power rule to e^x and uses 1 instead of 1/x for the derivative of ln x.',
  },
  'item-018': {
    '0': 'Evaluating cos(pi/2)=0 gives the original function value rather than its derivative -sin(pi/2).',
    '1': 'Forgetting the negative sign in d/dx(cos x)=-sin x yields +sin(pi/2)=1 instead of -1.',
    'pi/2': 'This echoes the input angle x=pi/2 instead of evaluating the derivative -sin(pi/2).',
  },
  'item-019': {
    '2xe^x': 'Differentiating x^2 and e^x separately and multiplying ignores the product rule sum f prime g + f g prime.',
    'x^2e^x': 'This differentiates only the exponential factor e^x while forgetting the term from differentiating x^2.',
    '2xe^x+x^2': 'In the second product-rule term, the exponential factor e^x was dropped from x^2 times d/dx(e^x).',
  },
  'item-020': {
    '2': 'Differentiating numerator and denominator separately gives 2x/1, not a valid quotient rule, and still fails to match 1-1/x^2.',
    '1+1/x^2': 'The derivative of x^(-1) is -x^(-2), so adding 1/x^2 drops the negative sign from the exponent.',
    '2x/(x-1)': 'This misapplies the quotient rule by placing x-1 in the denominator instead of x^2 and dropping numerator terms.',
  },
  'item-021': {
    '5(3x^2+1)^4': 'This differentiates only the outer fifth power and omits the chain-rule factor 6x from the inner expression.',
    '30x(3x^2+1)^5': 'Multiplying by the inner derivative 6x is right, but the outer exponent must decrease from 5 to 4.',
    '15x^2(3x^2+1)^4': 'This multiplies by 3x^2 itself instead of the derivative of 3x^2+1, which is 6x.',
  },
  'item-022': {
    'cos(2x^3)': 'This differentiates the outer sine function but omits the required chain-rule factor d/dx(2x^3)=6x^2.',
    '2x^3 cos(2x^3)': 'This multiplies by the undifferentiated inner argument 2x^3 instead of its derivative 6x^2.',
    '6x^2 sin(2x^3)': 'The chain-rule factor 6x^2 is right, but the outer sine function must change to cosine.',
  },
  'item-023': {
    '-y/x': 'Solving 2x+2y(dy/dx)=0 divides -2x by 2y to get -x/y, so -y/x inverts the fraction.',
    'x/y': 'Moving 2x across the equals sign changes its sign to -2x, so dropping the minus sign flips the slope.',
    '-2x/y^2': 'The derivative of y^2 with respect to x is 2y(dy/dx), not y^2(dy/dx), so dividing by y^2 is invalid.',
  },
  'item-024': {
    '-2/3': 'Counting y twice in the numerator produces -4/6=-2/3 instead of -y/(x+2y)=-2/6=-1/3.',
    '1/3': 'Dropping the negative sign when moving y to the right side of y+xy prime+2yy prime=0 reverses the slope.',
    '-1/2': 'Dropping the coefficient 2 when differentiating y^2 gives y+(x+y)y prime=0 and yields -2/4=-1/2 instead of -1/3.',
  },
  'item-025': {
    '1/2': 'This takes the reciprocal of the input x=2 instead of the reciprocal of the slope f prime(2)=3.',
    '3': 'This reports f prime(2)=3 directly without taking the reciprocal required by the inverse-derivative formula.',
    '1/5': 'This takes the reciprocal of the output value f(2)=5 rather than the slope f prime(2)=3.',
  },
  'item-026': {
    '1/(1+9x^2)': 'This substitutes u=3x into 1/(1+u^2) but forgets to multiply by the inner derivative u prime=3.',
    '3/(1+3x^2)': 'Squaring u=3x gives 9x^2, not 3x^2; the coefficient 3 must also be squared in the denominator.',
    '1/(1-9x^2)': 'The arctan derivative has a plus sign in 1+u^2 and requires the chain-rule factor 3 in the numerator.',
  },
  'item-027': {
    'x x^(x-1)': 'This applies the power rule as if the exponent x were a constant, which fails when both base and exponent vary.',
    'x^x ln x': 'This applies the exponential rule as if the base x were constant, missing the second product-rule term from d/dx(x ln x).',
    'x^(x-1)': 'This lowers the exponent by 1 without even the factor x or logarithmic differentiation for the variable exponent.',
  },
  'item-028': {
    'The power rule alone suffices for this': 'Neither e^(x^2) nor the rational quotient structure can be differentiated using the power rule alone.',
    'Implicit differentiation alone suffices': 'The function is already solved explicitly in terms of x, so implicit differentiation is unnecessary.',
    'The Fundamental Theorem of Calculus alone': 'The Fundamental Theorem differentiates integrals with variable limits, not an explicit exponential quotient.',
  },
  'item-029': {
    '12x^2-12x': 'This stops after the second derivative f double prime(x) instead of differentiating one more time.',
    '24x': 'This drops the constant -12 obtained from differentiating -12x in the second derivative 12x^2-12x.',
    '4x^3-6x^2': 'This stops at the first derivative f prime(x) rather than computing the third derivative.',
  },
  'item-030': {
    '0': 'Evaluating velocity v(3)=3(3)^2-12(3)+9=0 gives velocity at t=3 instead of acceleration a(3)=6.',
    '9': 'This evaluates v(0)=9 or s(3)=0+9 rather than the second derivative a(t)=6t-12 at t=3.',
    '18': 'This evaluates 6t=18 at t=3 while forgetting to subtract the constant term 12 from a(t)=6t-12.',
  },
  'item-031': {
    'The tank contains -2 liters': 'This confuses the rate of change V prime(5) with the volume V(5) itself, which also cannot be negative.',
    'Volume fell exactly 2 liters in 5 minutes': 'An instantaneous rate of -2 L/min at t=5 does not mean total change over all 5 minutes was 2 liters.',
    'At 2 minutes, volume falls at 5 liters per minute': 'This swaps the input time t=5 minutes with the output rate magnitude 2 liters per minute.',
  },
  'item-032': {
    'Items per dollar': 'Derivative units divide output units by input units (dC/dq), so items per dollar inverts the ratio.',
    'Dollars': 'Dollars are the units of total cost C(q), whereas C prime(q) measures change in dollars per item.',
    'Items squared per dollar': 'Differentiating divides by the input unit once; it never squares the input unit or places it in the numerator.',
  },
  'item-033': {
    '0': 'Evaluating position s(3)=27-27=0 gives the particle location at t=3 rather than its velocity s prime(3)=9.',
    '18': 'This evaluates only 6t=18 or misses the -6t term in v(t)=3t^2-6t at t=3.',
    '27': 'This evaluates only the first term 3t^2=27 of v(t)=3t^2-6t without subtracting 6(3)=18.',
  },
  'item-034': {
    'Decreasing, because the acceleration is positive here.': 'Positive acceleration increases speed when velocity is also positive; speed decreases only when velocity and acceleration have opposite signs.',
    'Decreasing, because the velocity itself is positive.': 'Positive velocity alone tells direction of motion, not whether speed decreases; matching positive acceleration speeds the particle up.',
    'Neither increasing nor decreasing, because the speed stays constant.': 'Constant speed requires zero acceleration (or orthogonal motion), whereas a(3)=6 is nonzero and positive.',
  },
  'item-035': {
    '4 pi cm^2/s': 'Using r=2 instead of r=3 in dA/dt=2 pi r (dr/dt) swaps the radius and its rate of change.',
    '6 pi cm^2/s': 'This computes 2 pi r=6 pi while forgetting to multiply by the chain-rule rate dr/dt=2 cm/s.',
    '18 pi cm^2/s': 'Substituting r=3 into pi r^2 times dr/dt computes 2 pi r^2=18 pi without differentiating r^2 into 2r.',
  },
  'item-036': {
    '3/4 ft/s': 'As the base x increases, the top of the ladder slides downward, so dy/dt must be negative rather than positive.',
    '-4/3 ft/s': 'This inverts the ratio -x/y into -y/x=-8/6=-4/3 when solving 2x(dx/dt)+2y(dy/dt)=0.',
    '1 ft/s': 'Setting dy/dt equal to dx/dt ignores that x=6 and y=8 have different lengths and opposite directions of change.',
  },
  'item-037': {
    '2.01': 'Multiplying delta x=0.1 by 0.1 instead of the derivative f prime(4)=1/4 underestimates the tangent-line rise.',
    '2.05': 'Using f prime(4)=1/2 instead of 1/(2 sqrt(4))=1/4 doubles the linear increment from 0.025 to 0.05.',
    '4.025': 'This starts from x=4 instead of f(4)=sqrt(4)=2 before adding the linear increment (1/4)(0.1)=0.025.',
  },
  'item-038': {
    '0.03': 'This keeps only the linear change f prime(0)(0.03) and drops the base value f(0)=e^0=1.',
    '1.003': 'This misplaces the decimal in delta x=0.03 by adding 0.003 instead of 0.03 to 1.',
    '1.30': 'This shifts the decimal the wrong way by adding 0.30 instead of 0.03 to the base value 1.',
  },
  'item-039': {
    '0': 'This substitutes x=0 into only the numerator e^x-1 or misreads e^0 as 0 instead of 1 after L Hospital Rule.',
    'e': 'Evaluating e^1 instead of e^0 at x=0 yields e rather than 1.',
    'The limit does not exist': 'The 0/0 form is indeterminate rather than undefined; differentiating numerator and denominator gives a finite limit of 1.',
  },
  'item-040': {
    '1': 'Treating infinity/infinity as equal to 1 fails because x grows much faster than ln x as x approaches infinity.',
    'Positive infinity': 'After L Hospital Rule, (1/x)/1 shrinks to 0 rather than diverging to positive infinity.',
    'The limit does not exist': 'Because 1/x approaches 0 cleanly as x grows without bound, the original limit exists and equals 0.',
  },
  'item-041': {
    '1': 'At x=1 the derivative is f prime(1)=2, which does not match the average secant slope (9-1)/(3-1)=4.',
    '3': 'At the right endpoint x=3, f prime(3)=6 exceeds the secant slope 4, and MVT guarantees an interior point.',
    '4': 'This reports the secant slope 4 itself rather than solving f prime(c)=2c=4 for the input c=2.',
  },
  'item-042': {
    'The function is not continuous at x=0.': 'The absolute value function |x| is continuous on all of [-1,1]; its failure is the sharp corner where f prime(0) fails to exist.',
    'The endpoint values are equal to each other.': 'Equal endpoint values do not prevent MVT; in fact they satisfy Rolle Theorem whenever differentiability holds.',
    'The interval contains negative inputs.': 'The Mean Value Theorem applies to intervals containing negative, zero, or positive inputs alike.',
  },
  'item-043': {
    'Just the function values at the two interval endpoints': 'An absolute extremum can occur at an interior peak or valley, so checking endpoints alone can miss it.',
    'Just the interior points where the derivative equals zero': 'Monotonic or clipped curves often attain their absolute maximum or minimum at the interval endpoints.',
    'Just the values taken by the second derivative there': 'Second-derivative values describe concavity, not the heights of f(x) needed to compare absolute extrema.',
  },
  'item-044': {
    'Every critical number is a maximum': 'At x=0, f(x)=x^3 has neither a maximum nor a minimum because f prime(x)=3x^2 never changes sign.',
    'A zero derivative makes a function constant': 'A function must have f prime(x)=0 on an entire interval to be constant, not just at one isolated point.',
    'The function is not differentiable at zero': 'Having f prime(0)=0 explicitly means the derivative exists and equals 0 at x=0.',
  },
  'item-045': {
    'Local minima at both values': 'A smooth polynomial cannot have two consecutive local minima without a local maximum between them; f prime flips + to - at -2.',
    'A local minimum at -2 and maximum at 1': 'This reverses the sign chart of (x+2)(x-1), which is positive outside (-2,1) and negative inside (-2,1).',
    'Increasing on (-2,1)': 'Testing x=0 gives f prime(0)=-2<0, so f is decreasing rather than increasing on (-2,1).',
  },
  'item-046': {
    'f\'(c)=0 alone': 'A zero derivative identifies only a stationary candidate; as x^3 shows, f prime can be 0 without a local minimum.',
    "f' changes from positive to negative": 'Changing from increasing to decreasing produces a local maximum, not a local minimum.',
    'f\'\'(c)=0 alone': 'A zero second derivative signals a possible inflection point and does not establish a local minimum.',
  },
  'item-047': {
    'x<2': 'For x<2, 6x-12 is negative, which makes f concave down rather than concave up.',
    'x>-2': 'Solving 6x-12>0 adds 12 and divides by 6 to get x>2, so x>-2 carries a sign error.',
    'All real x': 'Because 6x-12 changes sign at x=2, the function is not concave up across all real numbers.',
  },
  'item-048': {
    'A local minimum at x=3': 'A local minimum occurs when f double prime(3)>0 (concave up), whereas f double prime(3)<0 is concave down.',
    'An inflection point at x=3': 'An inflection point requires f double prime to change sign, not stay strictly negative at a stationary point.',
    'No conclusion': 'The second derivative test is inconclusive only when f double prime(3)=0; a negative value proves a local maximum.',
  },
  'item-049': {
    'Increasing and concave up': 'Concave up requires f prime to be increasing, whereas here the graph of f prime is decreasing.',
    'Decreasing and concave down': 'Because f prime lies above the x-axis (f prime>0), f must be increasing rather than decreasing.',
    'Decreasing and concave up': 'Both behaviors are reversed: positive f prime means f increases, and decreasing f prime means f is concave down.',
  },
  'item-050': {
    '2 by 8': 'A 2 by 8 rectangle has perimeter 20 but area 16, smaller than the maximum area of 25.',
    '4 by 6': 'A 4 by 6 rectangle has perimeter 20 and area 24, still less than the 5 by 5 square area of 25.',
    '1 by 9': 'A 1 by 9 rectangle has perimeter 20 and area only 9, far below the vertex value at x=5.',
  },
  'item-051': {
    '4 liters': 'This evaluates t^2=4 at t=2 without using the antiderivative t^3 of 3t^2.',
    '12 liters': 'Evaluating the rate r(2)=3(2)^2=12 gives the final flow rate in L/hr instead of total liters accumulated.',
    '24 liters': 'Multiplying the final rate 12 L/hr by 2 hours treats a growing rate as if it were constant over [0,2].',
  },
  'item-052': {
    '8': 'Adding the absolute values 6+2=8 computes total variation rather than signed net change.',
    '-4': 'This reverses the subtraction to 2-6=-4 instead of adding the signed areas 6+(-2)=4.',
    '12': 'Multiplying 6 by 2 combines the two regions as a product instead of summing their signed areas.',
  },
  'item-053': {
    '6': 'Using the midpoint or trapezoidal average gives 6, whereas the left sum uses heights f(0)=1 and f(1)=3.',
    '8': 'Using the right endpoints f(1)=3 and f(2)=5 gives the right Riemann sum 8 rather than the left sum 4.',
    '9': 'Adding all three table values 1+3+5=9 uses three heights for only two subintervals.',
  },
  'item-054': {
    '2[f(0)+f(2)]': 'Sampling at x=0 and x=2 builds the left Riemann sum on [0,4], not the midpoint sum.',
    '2[f(2)+f(4)]': 'Sampling at x=2 and x=4 builds the right Riemann sum on [0,4], not the midpoint sum.',
    '4[f(1)+f(3)]': 'This uses the total interval length 4 instead of the subinterval width delta x=(4-0)/2=2.',
  },
  'item-055': {
    '2x': 'This differentiates the integrand t^2+1 a second time instead of stopping at the integrand evaluated at x.',
    'x^3/3+x': 'This integrates t^2+1 rather than differentiating the accumulation function G(x).',
    '1': 'Evaluating only the constant term or lower bound ignores the variable upper bound x in FTC Part 1.',
  },
  'item-056': {
    'cos(x^2)': 'This substitutes the upper bound x^2 into cos(t) but forgets to multiply by the chain-rule derivative 2x.',
    '-2x sin(x^2)': 'This differentiates cos(x^2) instead of recognizing that FTC returns the integrand cos(x^2) times 2x.',
    'sin(x^2)': 'This integrates cos(t) to sin(t) instead of differentiating the integral with FTC and the chain rule.',
  },
  'item-057': {
    '4': 'Evaluating 2x at the interval length 2 gives 4 instead of applying the antiderivative x^2 from 1 to 3.',
    '6': 'Evaluating the integrand 2x at the upper limit x=3 gives 6 rather than the definite integral 3^2-1^2=8.',
    '10': 'Adding 3^2+1^2=10 adds the endpoint antiderivative values instead of subtracting F(3)-F(1).',
  },
  'item-058': {
    '-10': 'Multiplying 5 by -2 combines the two interval integrals as a product instead of adding them.',
    '7': 'Subtracting 5-(-2)=7 treats the negative integral as positive instead of summing 5+(-2)=3.',
    '10': 'This doubles the first integral or multiplies magnitudes instead of using additivity 5+(-2)=3.',
  },
  'item-059': {
    '6x-4+C': 'Differentiating 3x^2 to 6x goes in the wrong direction; integration increases the exponent to x^3.',
    'x^3-4+C': 'The constant -4 must integrate to -4x rather than staying -4.',
    'x^2-4x+C': 'This divides by 3 without raising the exponent of x^2 from 2 to 3.',
  },
  'item-060': {
    '2(x^2+1)^5+C': 'This multiplies by 2 instead of dividing by the new exponent 5 after substituting u=x^2+1.',
    '(x^2+1)^4/4+C': 'This divides by the original exponent 4 without increasing the power of u from 4 to 5.',
    'x^2(x^2+1)^5+C': 'Because 2x dx is absorbed into du, leaving an extra x^2 factor outside the u-power overcounts it.',
  },
  'item-061': {
    'Growth is exactly 0.04 individuals in each time unit.': 'That describes a constant rate dP/dt=0.04, ignoring the factor P that makes growth proportional to current size.',
    'The population always stays equal to just 4 individuals.': 'The constant 0.04 is a relative growth rate per time unit, not a fixed population size.',
    'The population decreases by 4 percent each time unit.': 'Because +0.04 is positive (with P>0), the population grows rather than decays.',
  },
  'item-062': {
    'The temperature increases away from 20.': 'With k>0 and T>20, dT/dt=-k(T-20) is negative, so temperature falls rather than rises.',
    'The temperature stays constant forever.': 'Temperature is constant only at equilibrium T=20 where dT/dt=0, not when T>20.',
    'The temperature immediately becomes 20.': 'The derivative drives T asymptotically toward 20 over time rather than causing an instant jump.',
  },
  'item-063': {
    "Differentiating gives y'=Ce^(2x)": 'This omits the chain-rule factor 2 from differentiating the exponent 2x.',
    'Checking x=0 proves it for all x': 'Matching a differential equation at one input does not verify that it holds across an entire interval.',
    'Every exponential satisfies every differential equation': 'Only functions whose derivative equals 2y satisfy y prime=2y; e^x or e^(3x) do not.',
  },
  'item-064': {
    'Yes, because both expressions contain x.': 'Sharing the variable x does not make 2x identical to x^2 across real numbers.',
    'Yes, because the equality holds when x=0.': 'Agreement at x=0 (or x=2) fails verification because a solution must satisfy y prime=y on an entire interval.',
    'No, because x^2 is not differentiable.': 'The polynomial x^2 is differentiable everywhere; it fails because its derivative 2x does not equal x^2.',
  },
  'item-065': {
    '-2': 'Computing -1-1=-2 uses -x-y instead of substituting (1,1) into x-y.',
    '1': 'This reports the x-coordinate or y-coordinate alone instead of computing their difference 1-1=0.',
    '2': 'Adding x+y=1+1=2 uses the wrong sign instead of subtracting y from x.',
  },
  'item-066': {
    'y=1 only': 'At y=1, y prime=1(3-1)=2 is nonzero, so y=1 is not a constant equilibrium solution.',
    'y=-3 and y=3': 'Substituting y=-3 gives (-3)(6)=-18 instead of 0; the roots of y(3-y)=0 are 0 and 3.',
    'None': 'Constant solutions exist whenever the right-hand side vanishes, which happens at y=0 and y=3.',
  },
  'item-067': {
    'ln|y|=x+C': 'This integrates the left side to ln|y| but leaves x undifferentiated on the right instead of integrating to x^2/2.',
    'y^2/2=x^2/2+C': 'Multiplying by y instead of dividing by y treats dy/dx=xy as if it were dy/dx=x/y.',
    'y=x^2/2+C': 'Integrating x to x^2/2 while forgetting to divide by y skips separating the y variable.',
  },
  'item-068': {
    'y=2e^(3x)': 'This swaps the initial value C=3 with the exponential rate constant k=2.',
    'y=3e^x': 'This drops the coefficient 2 in the exponent, giving y prime=y instead of y prime=2y.',
    'y=3+2x': 'This treats dy/dx=2y as a constant-slope linear equation dy/dx=2 rather than exponential growth.',
  },
  'item-069': {
    '2/d': 'Solving e^(kd)=2 requires taking the natural logarithm ln(2) before dividing by d.',
    'd/ln(2)': 'This inverts the fraction when solving kd=ln(2) for k instead of dividing ln(2) by d.',
    'ln(d)/2': 'This applies the logarithm to the doubling time d instead of the growth factor 2.',
  },
  'item-070': {
    '0': 'At P=0 the growth rate P prime is 0, an equilibrium with no growth at all.',
    '100': 'This computes 0.2 times 500=100 instead of taking half of the carrying capacity K=500.',
    '500': 'At carrying capacity P=500, the factor (1-P/500) is zero, so population growth has stopped.',
  },
  'item-071': {
    '9': 'This reports the definite integral 9 itself without dividing by the interval length 3-0=3.',
    '1': 'Dividing the integral 9 by 3^2=9 divides by the endpoint squared instead of the interval length 3.',
    '27': 'Multiplying the integral 9 by the interval length 3 multiplies instead of dividing by b-a.',
  },
  'item-072': {
    '2.5': 'Dividing 20 by 8 or miscomputing the interval length gives 2.5 instead of 20/(7-2)=4.',
    '5': 'This reports the interval length 7-2=5 rather than the quotient 20/5=4.',
    '20': 'This returns the definite integral 20 without dividing by the interval width b-a=5.',
  },
  'item-073': {
    '6 meters': 'Evaluating the derivative a(t)=6t at t=1 or using 3t at t=2 does not integrate v(t)=3t^2.',
    '12 meters': 'Evaluating velocity v(2)=3(2)^2=12 gives the final speed at t=2 instead of integrated displacement.',
    '24 meters': 'Multiplying the final velocity 12 m/s by 2 seconds assumes constant velocity rather than integrating 3t^2.',
  },
  'item-074': {
    'V0+I(T)-O(T)': 'I(T)-O(T) is an instantaneous rate at time T, not the total accumulated volume over [0,T].',
    'Integral 0 to T of [I(t)+O(t)]dt': 'This drops the initial volume V0 and adds outflow instead of subtracting it from inflow.',
    'V0 times integral of I(t)': 'Initial volume adds to accumulated net change rather than multiplying an inflow integral, and outflow is omitted.',
  },
  'item-075': {
    '-1/6': 'Integrating x^2-x subtracts upper from lower on [0,1], producing a negative area.',
    '1/3': 'This computes only the integral of x^2 on [0,1] instead of the area between y=x and y=x^2.',
    '1/2': 'This computes only the integral of x on [0,1] without subtracting the integral of x^2.',
  },
  'item-076': {
    'Integral 0 to 2 of (y^2-2y)dy': 'On [0,2], x=2y lies to the right of x=y^2, so y^2-2y reverses right minus left and turns negative.',
    'Integral of (2y+y^2)': 'Adding the two boundary curves sums their distances instead of measuring the horizontal width between them.',
    'Integral of (2-y)': 'This integrates the derivative or drops a power of y instead of subtracting the actual boundary curves.',
  },
  'item-077': {
    'Integral of x dx': 'Integrating side length x without squaring computes 2D area rather than summing square cross-sectional areas.',
    'pi times integral of x^2': 'Multiplying by pi applies a circular-disk formula instead of a square cross section of area s^2.',
    'Integral of 4x': 'Integrating 4x sums square perimeters rather than square areas x^2.',
  },
  'item-078': {
    'pi[d(x)]^2/2': 'This substitutes the diameter d(x) directly for the radius r in (1/2)pi r^2, making the area four times too large.',
    'pi[d(x)]^2': 'This uses full-circle area with diameter in place of radius, omitting both halving the diameter and halving the circle.',
    'pi d(x)/2': 'This computes the semicircular arc length (half circumference) rather than the semicircular cross-sectional area.',
  },
  'item-079': {
    '4 pi': 'Forgetting to integrate x to x^2/2 properly or using upper limit 2 halves the true disk volume 8 pi.',
    '16 pi': 'Omitting the factor 1/2 when integrating x from 0 to 4 doubles the true volume from 8 pi to 16 pi.',
    '32 pi/3': 'Integrating x^2 instead of (sqrt(x))^2=x squares the radius twice and yields 32 pi/3 instead of 8 pi.',
  },
  'item-080': {
    'pi integral 0 to 1 of (x-x^2)dx': 'The washer formula squares each radius separately (R^2-r^2), so failing to square x and x^2 is invalid.',
    'pi integral 0 to 1 of (x^4-x^2)dx': 'On [0,1], x is greater than x^2, so subtracting R^2 from r^2 reverses outer and inner radii.',
    '2 pi integral 0 to 1 of x(x-x^2)dx': 'This is the shell integral for rotation about the y-axis, not the washer integral about the x-axis.',
  },
};
