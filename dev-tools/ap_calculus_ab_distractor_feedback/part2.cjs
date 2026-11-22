'use strict';
// Authored per-distractor math-error feedback for AP Calculus AB items 081-160.
module.exports = {
  'item-081': {
    '1': 'This reports the x-value x=1 being approached rather than the y-value 4 that the curve approaches.',
    '7': 'The filled point (1,7) gives the function value f(1), which does not control the limit as x approaches 1.',
    'The limit does not exist': 'An open circle at (1,4) with a displaced point at (1,7) breaks continuity, yet both sides still approach 4.',
  },
  'item-082': {
    '0': 'Outputs -1.1, -1.01, -0.99, and -0.9 cluster tightly around -1 rather than approaching 0.',
    '2': 'This reports the target input x=2 rather than the limiting output value -1 shown in the table.',
    'The limit does not exist': 'Being undefined at x=2 never prevents a limit from existing when nearby outputs converge to -1 from both sides.',
  },
  'item-083': {
    'The limit does not exist': 'Although direct substitution gives 0/0, canceling (x-2) removes the hole and leaves a finite limit of 12.',
    '4': 'Evaluating only x^2=4 at x=2 drops the 2x+4 terms from the factored quadratic x^2+2x+4.',
    '8': 'Evaluating x^2+2x=8 at x=2 or evaluating 2^3=8 drops the +4 term in the difference-of-cubes quotient.',
  },
  'item-084': {
    '0': 'Evaluating the numerator sin(0)=0 alone ignores the 0/0 indeterminate form of sin(5x)/x.',
    '1/5': 'Dividing by 5 instead of multiplying by 5 inverts the scaling factor needed to match sin(5x)/(5x).',
    '1': 'Applying lim sin(u)/u=1 directly without matching the denominator to 5x drops the inner coefficient 5.',
  },
  'item-085': {
    '-3': 'Setting 3+k=0 instead of matching the left-hand limit 3 gives k=-3 and creates a jump of 3 units.',
    '1': 'Using k=1 makes the right-hand limit 3(1)+1=4 instead of matching the left-hand limit 1+2=3.',
    '3': 'Setting k equal to the left-hand limit 3 forgets that 3x already contributes 3 at x=1, giving 6 instead of 3.',
  },
  'item-086': {
    'Jump discontinuity': 'A jump discontinuity has two finite one-sided limits, whereas 1/(x+2) diverges to minus and plus infinity.',
    'Removable discontinuity': 'No factor cancels (x+2) in 1/(x+2), so redefining a single point cannot remove the vertical asymptote.',
    'No discontinuity': 'Because x=-2 makes the denominator zero, f(-2) is undefined and the function is discontinuous there.',
  },
  'item-087': {
    '0': 'Equal cubic degrees in numerator and denominator approach their leading-coefficient ratio 2/5, not 0.',
    '-2/5': 'Both leading terms 2x^3 and 5x^3 are odd powers, so their negative signs cancel as x approaches negative infinity.',
    'Positive infinity': 'A rational function with equal top and bottom degrees approaches a finite horizontal asymptote rather than diverging.',
  },
  'item-088': {
    'Positive infinity': 'Approaching 3 from the left means x<3, so x-3 is negative and 1/(x-3) goes to negative, not positive, infinity.',
    '0': 'Dividing 1 by a tiny negative number produces a huge negative magnitude rather than shrinking toward 0.',
    '1/3': 'Substituting x=0 gives -1/3, and ignoring the x-3 denominator near x=3 misses the vertical asymptote completely.',
  },
  'item-089': {
    'Exactly one such c exists': 'IVT guarantees at least one input c with f(c)=4, but the graph could cross y=4 multiple times.',
    'That c must be 3.5': 'Because f need not be linear between x=2 and x=5, the output 4 need not occur at the midpoint x=3.5.',
    'The function is decreasing everywhere': 'Going from f(2)=8 to f(5)=1 allows the curve to rise and fall repeatedly along [2,5].',
  },
  'item-090': {
    'The function f is differentiable only at the point a.': 'Pointwise differentiability at one endpoint does not ensure continuity across the entire closed interval [a,b].',
    'The values f(a) and f(b) are equal for every such k.': 'If f(a)=f(b), there are no distinct values strictly between them for IVT to target.',
    'The function f has some critical point in (a,b).': 'IVT requires continuity on [a,b] and an intermediate value k; critical points are neither required nor sufficient.',
  },
  'item-091': {
    '-0.3': 'Shifting the decimal place turns the limiting secant slope -3 into -0.3, which disagrees with the table values.',
    '0': 'Secant slopes near -2.98 and -3.02 bracket -3 rather than converging toward 0.',
    '3': 'Dropping the minus sign reverses the direction of the secant slopes from decreasing (-3) to increasing (+3).',
  },
  'item-092': {
    'f(2)=5': 'This records a point height y=5 at x=2 rather than a tangent-line slope at x=2.',
    "f''(5)=2": 'This swaps input and output and uses the second derivative (concavity) instead of the first derivative (slope).',
    "f'(5)=2": 'This reverses the input x=2 and the tangent slope 5 in derivative notation.',
  },
  'item-093': {
    'The function is discontinuous at c': 'The prompt states that f is continuous at c; unequal one-sided slopes create a corner, not a break.',
    "f'(c)=1/2": 'Averaging the left slope 2 and right slope -1 does not produce a valid two-sided derivative at a corner.',
    "f'(c)=1": 'Adding the left and right slopes 2+(-1)=1 fails because one-sided derivatives must match exactly for f prime(c) to exist.',
  },
  'item-094': {
    'f has a local maximum at c': 'Differentiability only ensures local smoothness; the slope at c could be nonzero, positive, or negative.',
    "f''(c) exists": 'A function can be once differentiable at c without having a second derivative there, such as x|x| at 0.',
    'f(c)=0': 'A differentiable function can take any real output value at x=c, not necessarily zero.',
  },
  'item-095': {
    '1/3': 'Forgetting the factor 1/2 from the exponent 1/2 gives 1/sqrt(9)=1/3 instead of 1/(2 sqrt(9))=1/6.',
    '3/2': 'Multiplying (1/2) by sqrt(9)=3 instead of dividing by sqrt(9) treats the exponent as +1/2 rather than -1/2.',
    '6': 'This computes the denominator 2 sqrt(9)=6 instead of taking its reciprocal 1/6.',
  },
  'item-096': {
    '12/x^2 - 2': 'Differentiating 4x^(-3) lowers the exponent to -4 and introduces a minus sign, rather than raising it to -2.',
    '-12/x^4 - 2x': 'The linear term -2x differentiates to the constant -2 rather than keeping the variable x.',
    '4/x^2 - 2': 'This forgets both the negative exponent sign and the factor -3 when differentiating 4x^(-3).',
  },
  'item-097': {
    '1/(2x)': 'This writes 1/u=1/(2x) but omits the chain-rule factor u prime=2, which cancels the 2 in the denominator.',
    '2/x': 'This multiplies 1/x by 2 as if the constant 2 were outside the logarithm rather than inside ln(2x)=ln 2+ln x.',
    'ln 2': 'Because ln(2x)=ln 2 + ln x, the constant ln 2 differentiates to 0 rather than surviving in the derivative.',
  },
  'item-098': {
    'e^(-3x)': 'This keeps the exponential unchanged without multiplying by the chain-rule derivative -3 of the exponent.',
    '3e^(-3x)': 'This drops the negative sign when taking the derivative of the inner exponent -3x.',
    '-3xe^(-3x)': 'This multiplies by the entire inner exponent -3x instead of its derivative -3.',
  },
  'item-099': {
    '-4': 'This evaluates only the first product-rule term f prime(1)g(1)=(-1)(4) and omits f(1)g prime(1)=6.',
    '5': 'Adding f prime(1)+g prime(1) or miscombining table entries misses the product-rule sum (-1)(4)+(2)(3)=2.',
    '6': 'This evaluates only the second product-rule term f(1)g prime(1)=(2)(3)=6 and omits (-1)(4)=-4.',
  },
  'item-100': {
    '-1/4': 'Dividing f prime(1)/g prime(1) or dropping the denominator square produces the wrong quotient derivative.',
    '1/8': 'Adding instead of subtracting in the numerator gives [(-1)(4)+(2)(3)]/16=2/16=1/8 instead of -10/16=-5/8.',
    '5/8': 'Reversing the quotient-rule numerator to f g prime - f prime g flips the sign from -5/8 to +5/8.',
  },
  'item-101': {
    'e^(cos x)': 'This differentiates the inner exponent in place instead of keeping e^(sin x) intact and multiplying by cos x.',
    'e^(sin x) sin x': 'The chain rule multiplies by d/dx(sin x)=cos x, not by the undifferentiated exponent sin x.',
    'cos(e^x)': 'This reverses the composition order of exponential and trigonometric functions when differentiating.',
  },
  'item-102': {
    '-1/(1+x^2)^2': 'This applies the outer power rule to (1+x^2)^(-1) but omits the inner derivative 2x from the chain rule.',
    '2x/(1+x^2)': 'This drops both the negative sign and the squared denominator from differentiating u^(-1) into -u^(-2) u prime.',
    '-2x/(1+x^2)': 'The power rule lowers the exponent from -1 to -2, so the denominator must be (1+x^2)^2 rather than (1+x^2).',
  },
  'item-103': {
    '-5/4': 'This inverts -(2x+y)/(x+2y) into -(x+2y)/(2x+y)=-5/4 at (1,2).',
    '4/5': 'Dropping the minus sign when moving 2x+y across the equals sign flips the slope from -4/5 to +4/5.',
    '5/4': 'This both drops the minus sign and inverts the numerator and denominator of -(2x+y)/(x+2y).',
  },
  'item-104': {
    '1/3': 'Differentiating y^3+y gives (3y^2+1)(dy/dx), so dropping the +1 term from d/dx(y) yields 1/3 instead of 1/4.',
    '1/2': 'Using 2y instead of 3y^2+1 misapplies the power rule to y^3+y at y=1.',
    '4': 'This computes dx/dy=3y^2+1=4 at y=1 without taking the reciprocal to find dy/dx=1/4.',
  },
  'item-105': {
    '-2.0': 'This reports f prime(4)=-2 directly instead of taking its reciprocal -1/2=-0.5.',
    '0.5': 'Taking the reciprocal of 2 while dropping the negative sign of f prime(4)=-2 flips the inverse slope to positive.',
    '2.0': 'This negates f prime(4)=-2 without taking the reciprocal required by the inverse-derivative rule.',
  },
  'item-106': {
    '1/sqrt(1-4x^2)': 'This substitutes u=2x into 1/sqrt(1-u^2) but forgets the chain-rule factor u prime=2 in the numerator.',
    '2/sqrt(1-2x^2)': 'Squaring u=2x inside sqrt(1-u^2) gives 4x^2 rather than 2x^2.',
    '-2/sqrt(1-4x^2)': 'The minus sign belongs to the derivative of arccos(2x), whereas arcsin(2x) has a positive derivative.',
  },
  'item-107': {
    '3/(x^2+1)': 'This brings the exponent 3 down in front of ln(x^2+1) but forgets to multiply by the inner derivative 2x.',
    '6x ln(x^2+1)': 'Differentiating ln(u) replaces the logarithm with u prime/u rather than keeping ln(x^2+1) in the result.',
    '3x^2/(x^2+1)': 'This multiplies by x^2 instead of d/dx(x^2+1)=2x when differentiating 3 ln(x^2+1).',
  },
  'item-108': {
    'The power rule alone suffices for it': 'The power rule differentiates x^2, but cannot handle the product or the composite factor sin(e^x).',
    'The quotient rule alone suffices here': 'There is no quotient in x^2 sin(e^x); it is a product containing a nested composition.',
    'Implicit differentiation alone suffices': 'The expression is an explicit function of x, so implicit differentiation does not replace product and chain rules.',
  },
  'item-109': {
    '1/x^2': 'Differentiating x^(-1) brings down -1 as a coefficient, so omitting the negative sign flips the concavity.',
    '-2/x^3': 'This differentiates once too many times (with a sign slip) rather than stopping at the second derivative -x^(-2).',
    'ln x': 'The logarithm does not repeat under differentiation the way e^x does; its second derivative is -1/x^2.',
  },
  'item-110': {
    '16': 'Evaluating s(2)=2^4=16 gives the original position at t=2 instead of the third derivative 24t.',
    '24': 'This reports the coefficient 24 of the third derivative 24t without substituting t=2 to get 48.',
    '96': 'Multiplying 24 by t^2=4 instead of t=2 evaluates the wrong power of t in the third derivative 24t.',
  },
  'item-111': {
    'During the first 10 hours, 12 people arrived in total.': 'A derivative at t=10 gives an instantaneous rate, not total accumulated change over the interval [0,10].',
    'At hour 12, the population equals 10 people.': 'This swaps the input time 10 with the rate 12 and treats the rate as a population count.',
    'The population is increasing by 120 people every hour.': 'Multiplying 10 hours by 12 people/hour misuses the input t=10 as a factor on the instantaneous rate.',
  },
  'item-112': {
    'Meters per degree Celsius': 'This inverts output units over input units (dT/dh), giving dh/dT instead of T prime(h).',
    'Degrees Celsius times meters': 'Multiplying output and input units corresponds to integrating T(h) dh rather than differentiating T with respect to h.',
    'Meters per second': 'Neither temperature nor altitude here is measured in seconds, so time units do not belong in T prime(h).',
  },
  'item-113': {
    '(1,4) and (4,infinity)': 'On (1,4), (t-1)(t-4) is negative (moving left), whereas velocity is positive on [0,1) and (4,infinity).',
    '[0,1) and (1,4)': 'Because v(t) changes sign from positive to negative at t=1, the particle moves left rather than right on (1,4).',
    '(1,infinity)': 'Velocity is negative throughout (1,4) and zero at t=4, so the particle does not move right across all of (1,infinity).',
  },
  'item-114': {
    't=0 and t=2': 'At t=0 velocity is 9, and t=2 is where acceleration 6t-12=0 rather than where velocity is zero.',
    't=2 alone': 'Solving a(t)=6t-12=0 finds zero acceleration, not the times when the particle is momentarily at rest (v=0).',
    't=3 alone': 'This catches one root of 3(t-1)(t-3)=0 while missing the earlier positive rest time t=1.',
  },
  'item-115': {
    '12 pi cubic centimeters per second': 'Using 4 pi r dr/dt instead of 4 pi r^2 dr/dt forgets to square the radius r=2.',
    '24 pi cubic centimeters per second': 'This drops a factor of 2 in 4 pi r^2 dr/dt=4 pi(4)(3)=48 pi.',
    '36 pi cubic centimeters per second': 'Swapping r=2 and dr/dt=3 computes 4 pi(3)^2(1) or miscalculates 4(4)(3) as 36 instead of 48.',
  },
  'item-116': {
    '2 pi cubic centimeters per second': 'Forgetting the power-rule factor 2 when differentiating 2 pi r^2 gives 2 pi r dr/dt=2 pi instead of 4 pi.',
    '6 pi cubic centimeters per second': 'Substituting h=6 without the cone 1/3 factor or miscomputing 4 pi(2)(0.5) overestimates the rate.',
    '12 pi cubic centimeters per second': 'Omitting the factor 1/3 in V=(1/3)pi r^2 h triples the cone volume rate from 4 pi to 12 pi.',
  },
  'item-117': {
    '0.98': 'Subtracting 0.02 from 1 computes 1-0.02 instead of L(1.02)=0+1(1.02-1)=0.02.',
    '1.02': 'Because ln(1)=0 rather than 1, adding delta x=0.02 to 1 confuses x=1 with f(1)=0.',
    '2.00': 'Using x=1.02 incorrectly as 1+1 ignores both f(1)=0 and the small displacement delta x=0.02.',
  },
  'item-118': {
    'It underestimates them.': 'Tangent lines underestimate curve values when a graph is concave up, whereas sqrt(x) is concave down.',
    'It always equals them.': 'A tangent line matches a curved function exactly at the point of tangency, not at nearby inputs.',
    'No comparison is possible from concavity.': 'Consistent concavity on an interval directly determines whether the tangent line lies above or below the curve.',
  },
  'item-119': {
    '1': 'Treating sin(3x)/sin(5x) like sin(x)/x ignores the distinct inner scaling constants 3 and 5.',
    '5/3': 'This inverts the ratio of inner derivatives (3 cos 3x)/(5 cos 5x) to 5/3 instead of 3/5.',
    '15': 'Multiplying the inner coefficients 3 and 5 combines them instead of forming their quotient 3/5.',
  },
  'item-120': {
    '1': 'Treating infinity/infinity as 1 ignores that exponential growth e^x dominates linear growth x.',
    'Infinity': 'After L Hospital Rule, 1/e^x approaches 0 rather than growing without bound.',
    'The limit does not exist': 'Because 1/e^x converges cleanly to 0 as x approaches infinity, the limit exists and equals 0.',
  },
  'item-121': {
    'c=-1': 'The Mean Value Theorem guarantees c strictly inside the open interval (-1,2), so endpoint c=-1 does not qualify.',
    'c=0': 'At c=0, f prime(0)=0 does not equal the average secant slope [8-(-1)]/[2-(-1)]=3.',
    'c=2': 'At endpoint c=2, f prime(2)=12 does not match the secant slope 3 and is outside the open interval (-1,2).',
  },
  'item-122': {
    'The endpoint values are equal to each other.': 'For f(x)=1/x, f(-1)=-1 and f(1)=1 are not equal, and equal endpoints would never disqualify MVT anyway.',
    'The derivative is equal to zero at the point x=0.': 'At x=0, both f(x)=1/x and f prime(x)=-1/x^2 are undefined rather than equal to zero.',
    'The given interval contains negative inputs.': 'Intervals spanning negative and positive x-values work fine for MVT whenever continuity and differentiability hold.',
  },
  'item-123': {
    'Endpoints and x=0 alone': 'This checks endpoints and x=0 but omits the other two interior critical numbers x=-sqrt(2) and x=sqrt(2).',
    'x=-sqrt(2) and sqrt(2) alone': 'Checking only the two local minima misses both the interior critical point x=0 and the endpoints x=-3 and x=3.',
    'x=-2, 0, and 2 alone': 'Solving x^2-4=0 instead of f prime(x)=4x(x^2-2)=0 finds roots of f rather than critical numbers, and omits endpoints.',
  },
  'item-124': {
    'It has exactly one critical point on the interval [a,b].': 'A continuous function on [a,b] can have zero, one, or infinitely many critical points and still satisfy EVT.',
    'It is differentiable at every point of the interval (a,b).': 'EVT requires only continuity on [a,b] and guarantees nothing about differentiability.',
    'Its endpoint values are always the extreme values on [a,b].': 'Absolute extrema can occur at interior peaks or valleys rather than at the interval endpoints.',
  },
  'item-125': {
    'A local maximum at x=0 only': 'Because x^2 is nonnegative on both sides of 0, f prime(x)=x^2(x-2) stays negative across x=0 with no extremum there.',
    'Local minima at x=0 and x=2': 'At x=0, f prime does not change sign, so x=0 is a flat inflection-like point rather than a local minimum.',
    'No local extrema': 'At x=2, f prime changes cleanly from negative to positive, guaranteeing a local minimum there.',
  },
  'item-126': {
    'f has local minima at both -1 and 3.': 'At x=-1, f prime changes from positive to negative, which creates a local maximum rather than a local minimum.',
    'f has a local minimum at -1 and maximum at 3.': 'This reverses the First Derivative Test sign rules for both critical numbers -1 and 3.',
    'f has no local extrema.': 'Because f prime changes sign at both -1 and 3, both points produce local extrema.',
  },
  'item-127': {
    'The graph of the function has a local minimum at the point x equals c.': 'A sign change in f double prime signals an inflection point, not a local minimum (which requires f prime flipping - to +).',
    'The graph of the function is increasing on both sides of x equals c.': 'Second-derivative signs describe concavity alone and do not determine whether f is increasing or decreasing.',
    "The value of f'(c) must therefore be exactly equal to zero at that point.": 'An inflection point can occur where the tangent slope f prime(c) is nonzero (for example, sin x at x=0).',
  },
  'item-128': {
    'f has a local maximum at c.': 'A local maximum occurs when f double prime(c)<0 (concave down), whereas f double prime(c)>0 is concave up.',
    'f has an inflection point at c.': 'Having f double prime(c)>0 means the curve is strictly concave up at c rather than changing concavity.',
    'No conclusion can be drawn.': 'The second-derivative test fails only when f double prime(c)=0; a strictly positive value proves a local minimum.',
  },
  'item-129': {
    'A local maximum at x=2': 'Crossing the x-axis from below to above means f prime switches from negative to positive, creating a minimum, not a maximum.',
    'An inflection point must occur at x=2': 'An inflection point on f corresponds to a local extremum on f prime, not merely a zero crossing of f prime.',
    'A vertical tangent at x=2': 'Crossing the x-axis at y=0 means f prime(2)=0 (a horizontal tangent), not an infinite vertical slope.',
  },
  'item-130': {
    'Two 25-meter sides and one 150-meter side': 'This uses 200 m of fence but encloses only 25 times 150=3,750 m^2, below the 5,000 m^2 maximum.',
    'Three sides of 200/3 meters each': 'Making all three sides equal ignores the river boundary and encloses only about 4,444 m^2 instead of 5,000 m^2.',
    'Two 75-meter sides and one 50-meter side': 'With x=75 and y=50, area is 3,750 m^2, below the vertex x=50, y=100 giving 5,000 m^2.',
  },
  'item-131': {
    'Displacement 14; total distance 6': 'This swaps the definitions: displacement uses signed net area (6), while total distance sums absolute areas (14).',
    'Displacement 6; total distance 6': 'Total distance must make the negative velocity area positive (10+4=14) instead of letting it cancel.',
    'Displacement 14; total distance 14': 'Displacement keeps the sign of backward motion (10-4=6) rather than adding both areas as positive.',
  },
  'item-132': {
    'The average cost of producing a single item of the output': 'Average rate or average cost requires dividing by the number of items, which this definite integral does not do.',
    'The total cost of production at exactly 100 items produced': 'Without adding fixed startup cost C(0), the integral of C prime from 0 to 100 gives only C(100)-C(0), the change in cost.',
    'The number of items that are produced for every one dollar': 'Integrating (dollars/item) with respect to items yields dollars, not items per dollar.',
  },
  'item-133': {
    '12': 'Using left endpoints f(0)=1 and f(2)=5 gives the left Riemann sum 2(1+5)=12 instead of the right sum 28.',
    '20': 'Averaging left and right sums produces the trapezoidal approximation 20 rather than the right Riemann sum 28.',
    '36': 'Using width 2 on all three table entries 2(1+5+9)=30 or misusing width 4 overcounts the two subintervals.',
  },
  'item-134': {
    '14': 'Adding the two right-endpoint heights 5+9=14 omits the width factor and does not apply the trapezoid formula.',
    '28': 'Computing 2(5+9)=28 gives the right Riemann sum on [0,4] rather than the trapezoidal approximation 20.',
    '40': 'Forgetting the 1/2 in the trapezoid area formula (h/2)(b1+b2) doubles the approximation from 20 to 40.',
  },
  'item-135': {
    'x^2': 'Because the variable x is the lower limit rather than the upper limit, reversing the bounds introduces a minus sign.',
    '3x^2': 'The constant upper limit 3 contributes 0 when differentiated and does not multiply x^2.',
    '-2x': 'This differentiates t^2 instead of using FTC Part 1 to evaluate the integrand t^2 at the moving lower bound.',
  },
  'item-136': {
    'x^2-x': 'This substitutes both limits into t but omits the chain-rule factor 2x for the upper bound x^2.',
    '2x^2-1': 'This differentiates the bounds 2x and 1 without evaluating the integrand t at x^2 and x correctly.',
    'x^3-x': 'This drops the factor of 2 in the chain-rule derivative of the upper bound x^2.',
  },
  'item-137': {
    '0': 'Reversing endpoints a and b flips the sign of the integral; an integral is guaranteed 0 only when both limits are equal.',
    '7': 'Keeping +7 ignores that swapping upper and lower limits reverses the orientation of integration.',
    '14': 'Doubling 7 does not follow from swapping limits; reversing limits negates the integral to -7.',
  },
  'item-138': {
    '0, because symmetric limits cancel each other out': 'Symmetric cancellation to 0 applies to odd functions, whereas even functions mirror identically across the y-axis.',
    'The integral from 0 to 3 of f(x)dx alone': 'Keeping only the [0,3] piece drops the equal contribution from [-3,0], halving the total integral.',
    '-2 times the integral from 0 to 3 of f(x)dx': 'Because f(-x)=f(x) for an even function, both halves carry the same sign rather than negating.',
  },
  'item-139': {
    '12x^2+2/x^2+C': 'This differentiates 4x^3 to 12x^2 instead of integrating it to x^4, and uses a wrong sign/power on 2/x.',
    'x^4+2 ln x': 'This omits both the absolute value bars needed when x<0 and the arbitrary constant +C.',
    'x^4+ln|2x|+C': 'The constant multiple 2 stays outside the logarithm as 2 ln|x| rather than moving inside as ln|2x|.',
  },
  'item-140': {
    '3 ln|3x+1|+C': 'Because du=3 dx already absorbs the numerator 3, keeping an extra factor of 3 outside ln|3x+1| triples the answer.',
    '1/(3x+1)^2+C': 'This differentiates (3x+1)^(-1) (up to sign/constant) instead of integrating 1/u to ln|u|.',
    'ln|x+1|+C': 'Canceling 3 from 3/(3x+1) to get 1/(x+1) is algebraically invalid because 3 does not divide the +1 term.',
  },
  'item-141': {
    'The quantity Q decreases by exactly 0.1 unit during each period of time.': 'That describes a constant linear rate dQ/dt=-0.1, ignoring the factor Q that scales decay with current size.',
    'The quantity Q grows toward a carrying capacity that is equal to 0.1 units.': 'A carrying capacity requires a logistic factor (1-Q/K), whereas dQ/dt=-0.1Q models pure exponential decay.',
    'The quantity Q remains constant, because the equation has no explicit t in it.': 'Autonomous equations without an explicit t still change whenever dQ/dt is nonzero.',
  },
  'item-142': {
    'dP/dt=k+P': 'Direct proportionality multiplies P by k rather than adding k to P.',
    'dP/dt=P/k': 'Dividing by k makes the rate inversely proportional to k rather than using k as the proportionality constant.',
    'dP/dt=k/P': 'This models inverse proportionality to population size P instead of direct proportionality kP.',
  },
  'item-143': {
    'No, because the function y is not constant.': 'A function with constant slope y prime=1 must be linear with slope 1, not a constant function (whose slope is 0).',
    'No, because y prime is instead equal to x.': 'The derivative of x+1 is 1, not x (which is the derivative of x^2/2).',
    'Yes, but only at the single point x=0.': 'Because d/dx(x+1)=1 identically for every real x, the equation holds everywhere rather than only at x=0.',
  },
  'item-144': {
    'No, because the derivative is e^x+2.': 'The constant +2 differentiates to 0, leaving y prime=e^x rather than e^x+2.',
    'No, because y-2 equals 2.': 'Substituting y=e^x+2 into y-2 cancels the 2 and gives e^x, not 2.',
    'Yes, but only when x=0.': 'Both y prime and y-2 equal e^x for every real number x, not solely at x=0.',
  },
  'item-145': {
    '-3': 'This computes -1-2=-3 instead of adding x+y=-1+2=1.',
    '-1': 'This uses only the x-coordinate -1 (or flips the sign of 1) rather than evaluating -1+2.',
    '3': 'This adds the magnitudes |-1|+|2|=3, dropping the negative sign on x=-1.',
  },
  'item-146': {
    'y=-x': 'Along y=-x, x-y=2x is nonzero whenever x is nonzero, so slope segments are not horizontal there.',
    'y=0': 'Along the x-axis y=0, the slope is x-0=x, which is horizontal only at the origin.',
    'x=0': 'Along the y-axis x=0, the slope is 0-y=-y, which varies with y instead of staying 0.',
  },
  'item-147': {
    'y=x^2/2+2': 'Integrating x dx to x^2/2 without separating y on the left treats dy/dx=x/y as if it were dy/dx=x.',
    'y=sqrt(x^2+2)': 'Substituting y(0)=2 into y^2=x^2+C gives C=2^2=4 rather than C=2.',
    'y=-sqrt(x^2+4)': 'The negative square-root branch gives y(0)=-2, violating the initial condition y(0)=+2.',
  },
  'item-148': {
    'y=5e^(-x)': 'Integrating -x dx gives -x^2/2 in the exponent rather than -x.',
    'y=e^(-5x^2/2)': 'The initial condition y(0)=5 multiplies the exponential outside (C=5) rather than multiplying inside the exponent.',
    'y=5-x^2/2': 'Integrating -x dx without dividing by y skips separating the variable y into ln|y|.',
  },
  'item-149': {
    'ln(2)/h': 'For decay to half the initial amount, ln(1/2)=-ln(2) is negative, so a positive k models doubling rather than half-life.',
    '-h ln(2)': 'Solving kh=-ln(2) divides by h rather than multiplying by h.',
    '1/(2h)': 'Solving e^(kh)=1/2 requires taking the natural logarithm of 1/2 before dividing by h.',
  },
  'item-150': {
    'P=K/2 only': 'At P=K/2 the logistic growth rate is at its maximum, not zero, so P=K/2 is not an equilibrium.',
    'P=k and P=K': 'The growth-rate constant k does not make kP(1-P/K)=0; the lower equilibrium is P=0.',
    'There are no equilibria': 'Setting kP(1-P/K)=0 yields two constant equilibrium solutions: P=0 and P=K.',
  },
  'item-151': {
    '4': 'Evaluating 2x+1 at the midpoint incorrectly or dividing 8 by 2 misses that the integral on [1,3] is 10.',
    '8': 'Computing F(3)=12 minus 4 or misapplying the bounds gives 8 instead of (12-2)/2=5.',
    '10': 'This reports the definite integral 10 over [1,3] without dividing by the interval length 3-1=2.',
  },
  'item-152': {
    'The average value must always occur at the interval midpoint.': 'Only linear functions are guaranteed to hit their average value at the midpoint; nonlinear curves can hit it elsewhere.',
    'The integral of f must be equal to zero over the whole interval.': 'The Mean Value Theorem for Integrals applies to any continuous function regardless of whether its integral is zero.',
    'The function must also be differentiable on the interval [a,b].': 'Unlike the derivative Mean Value Theorem, the integral version requires only continuity on [a,b].',
  },
  'item-153': {
    '-7': 'Subtracting 5 from -2 computes -2-5=-7 instead of adding initial position 5 plus displacement -2.',
    '-2': 'This reports the net displacement alone without adding the starting position s(0)=5.',
    '7': 'Adding 5+2=7 ignores the negative sign on the displacement integral -2.',
  },
  'item-154': {
    'Integrate the velocity just once without splitting the interval.': 'Integrating velocity directly gives signed displacement, allowing positive and negative motion to cancel.',
    'Differentiate the velocity and then add up the endpoint values.': 'Differentiating velocity produces acceleration rather than distance traveled.',
    'Use only the largest velocity value that is found on the interval.': 'Peak velocity at one instant does not account for how fast or how long the particle moved over the interval.',
  },
  'item-155': {
    '8sqrt(2)/3': 'Integrating only from 0 to sqrt(2) computes just the right half of the symmetric enclosed region.',
    '16/3': 'Dropping the sqrt(2) factor when evaluating [4x-(2/3)x^3] at x=sqrt(2) understates the area.',
    '8sqrt(2)': 'This evaluates only the linear term 4x across [-sqrt(2),sqrt(2)] while forgetting to subtract the cubic term (2/3)x^3.',
  },
  'item-156': {
    'Integral from 0 to 4 of (4-2x^2)dx': 'The boundary curves are given as functions of y, so integrating in x from 0 to 4 mismatches variable and bounds.',
    'Integral from -2 to 2 of 2y^2dy': 'Both the intersection bounds (plus/minus sqrt(2)) and the right-minus-left width (4-2y^2) are wrong here.',
    'Integral from -sqrt(2) to sqrt(2) of (2y^2-4)dy': 'Because x=4-y^2 lies to the right of x=y^2 between intersections, 2y^2-4 reverses right minus left and is negative.',
  },
  'item-157': {
    '(1/2)[s(x)]^2': 'This gives the area of an isosceles right triangle with legs s(x), not an equilateral triangle whose height is (sqrt(3)/2)s.',
    '(sqrt(3)/2)[s(x)]^2': 'Multiplying base s by height (sqrt(3)/2)s omits the triangle factor 1/2, doubling the cross-sectional area.',
    '(pi/4)[s(x)]^2': 'This is the area of a circle with diameter s(x), not an equilateral triangle.',
  },
  'item-158': {
    'Integral from 0 to 1 of (sqrt(x)-x)dx': 'Integrating the side length without squaring computes the 2D base area instead of summing square cross sections.',
    'pi times the integral from 0 to 1 of (sqrt(x)-x)^2dx': 'The factor pi belongs to circular disks, whereas square cross sections have area s^2 with no pi.',
    'Integral from 0 to 1 of (x-x^2)dx': 'Squaring a difference (sqrt(x)-x)^2 includes the cross term -2x^(3/2) and does not equal x-x^2.',
  },
  'item-159': {
    'pi integral from 0 to 2 of x^2dx': 'This uses radius x measured from y=0, ignoring both the shifted axis y=-1 and the inner hollow cylinder.',
    '2pi integral from 0 to 2 of (x+1)dx': 'A washer integral uses pi(R^2-r^2) with squared radii, not 2 pi times a single linear radius.',
    'pi integral from 0 to 2 of [(x-1)^2-1]dx': 'Distance from y=x down to y=-1 is x-(-1)=x+1, so using x-1 subtracts instead of adding the axis shift.',
  },
  'item-160': {
    '4pi/3': 'Forgetting to cube 2 cleanly (using 2^2=4 instead of 2^3=8 in (2-x)^3/3) halves the volume.',
    '2pi': 'Integrating pi(2-x) without squaring the radius computes a linear integral rather than summing circular areas pi r^2.',
    '8pi': 'Omitting the power-rule denominator 3 when integrating (2-x)^2 triples the true volume 8pi/3.',
  },
};
