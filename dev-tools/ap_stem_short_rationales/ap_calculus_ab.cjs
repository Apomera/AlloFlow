'use strict';

module.exports = {
  'ap-calculus-ab-foundation-pilot-item-004':
    'Direct substitution yields 0/0, so rationalize the numerator by multiplying by sqrt(x+4)+2 to cancel x, leaving 1/[sqrt(x+4)+2]. Evaluating at x=0 gives 1/(2+2)=1/4.',
  'ap-calculus-ab-foundation-pilot-item-006':
    'Both one-sided limits at x=0 exist and are finite (2 from the left and 5 from the right), but they are unequal. Unequal finite one-sided limits define a jump discontinuity.',
  'ap-calculus-ab-foundation-pilot-item-011':
    "By the limit definition of the derivative, f'(a) is the limit as h approaches 0 of [f(a+h)-f(a)]/h. With a=3, this difference-quotient limit gives the derivative f'(3).",
  'ap-calculus-ab-foundation-pilot-item-012':
    "Form the difference quotient [(4+h)^2-4^2]/h = (8h+h^2)/h, then cancel h for h!=0 to get 8+h. Taking the limit as h approaches 0 yields the derivative f'(4)=8.",
  'ap-calculus-ab-foundation-pilot-item-016':
    "Apply the power rule to f(x)=x^(-2) to find f'(x)=-2x^(-3)=-2/x^3. Evaluating the derivative at x=2 gives the tangent slope f'(2)=-2/8=-1/4.",
  'ap-calculus-ab-foundation-pilot-item-018':
    'Using the trigonometric derivative rule d/dx(cos x)=-sin x, substitute x=pi/2 to obtain -sin(pi/2). Since sin(pi/2)=1, the evaluated derivative equals -1.',
  'ap-calculus-ab-foundation-pilot-item-019':
    "By the product rule (uv)'=u'v+uv' with u=x^2 and v=e^x, differentiate to get f'(x)=2xe^x+x^2e^x. Factoring out the common term e^x yields e^x(x^2+2x).",
  'ap-calculus-ab-foundation-pilot-item-020':
    "For x!=0, split the fraction as g(x)=x+x^(-1) and apply the power rule term by term to get g'(x)=1-x^(-2), which simplifies to 1-1/x^2 (matching the quotient rule).",
  'ap-calculus-ab-foundation-pilot-item-021':
    "Apply the chain rule with outer function u^5 and inner function u=3x^2+1: multiply 5(3x^2+1)^4 by the inner derivative du/dx=6x to get f'(x)=30x(3x^2+1)^4.",
  'ap-calculus-ab-foundation-pilot-item-022':
    'By the chain rule, differentiate the outer sine to cos(2x^3) while keeping the argument intact, then multiply by d/dx(2x^3)=6x^2 to obtain 6x^2 cos(2x^3).',
  'ap-calculus-ab-foundation-pilot-item-023':
    'Differentiate x^2+y^2=25 implicitly with respect to x using the chain rule on y^2 to get 2x+2y(dy/dx)=0. Solving for dy/dx with y!=0 yields dy/dx=-2x/(2y)=-x/y.',
  'ap-calculus-ab-foundation-pilot-item-024':
    'Differentiate implicitly using the product rule on xy to get y+x(dy/dx)+2y(dy/dx)=0. Substituting (2,2) gives 2+6(dy/dx)=0, so dy/dx=-2/6=-1/3.',
  'ap-calculus-ab-foundation-pilot-item-026':
    "Using the inverse tangent chain rule d/dx[arctan(u)]=u'/(1+u^2) with u=3x and u'=3, square the inner term to 9x^2 and obtain f'(x)=3/(1+9x^2).",
  'ap-calculus-ab-foundation-pilot-item-027':
    "Take natural logs to rewrite y=x^x as ln y=x ln x, then differentiate implicitly with the product rule: y'/y=ln x+x(1/x)=ln x+1. Multiplying by y=x^x gives x^x(ln x+1).",
  'ap-calculus-ab-foundation-pilot-item-029':
    "Apply the power rule three successive times to f(x)=x^4-2x^3: f'(x)=4x^3-6x^2, f''(x)=12x^2-12x, and differentiating once more gives the third derivative f'''(x)=24x-12.",
  'ap-calculus-ab-foundation-pilot-item-030':
    "Differentiate position twice to obtain velocity v(t)=3t^2-12t+9 and acceleration a(t)=s''(t)=6t-12. Evaluating at t=3 yields a(3)=6(3)-12=6.",
  'ap-calculus-ab-foundation-pilot-item-032':
    "Because C'(q)=dC/dq represents the instantaneous rate of change of cost with respect to quantity, its units are output units over input units: dollars per item.",
  'ap-calculus-ab-foundation-pilot-item-036':
    'Differentiate x^2+y^2=100 with respect to time t to get 2x(dx/dt)+2y(dy/dt)=0. Substituting x=6, y=8, and dx/dt=1 yields 12+16(dy/dt)=0, so dy/dt=-12/16=-3/4 ft/s.',
  'ap-calculus-ab-foundation-pilot-item-038':
    "At x=0, f(x)=e^x has value f(0)=1 and slope f'(0)=e^0=1, producing the tangent-line linearization L(x)=1+x. Substituting x=0.03 approximates e^0.03 as L(0.03)=1.03.",
  'ap-calculus-ab-foundation-pilot-item-039':
    "Both numerator e^x-1 and denominator x approach 0 as x approaches 0, confirming a 0/0 form. L'Hospital's Rule differentiates top and bottom to lim e^x/1=e^0=1.",
  'ap-calculus-ab-foundation-pilot-item-041':
    "Because f(x)=x^2 is continuous on [1,3] and differentiable on (1,3), the Mean Value Theorem sets f'(c)=[f(3)-f(1)]/(3-1)=(9-1)/2=4. Solving 2c=4 gives c=2 in (1,3).",
  'ap-calculus-ab-foundation-pilot-item-047':
    "By the second-derivative concavity test, a twice-differentiable function f is concave up wherever f''(x)>0. Solving 6x-12>0 gives 6x>12, so f is concave up for x>2.",
  'ap-calculus-ab-foundation-pilot-item-050':
    "From perimeter 2x+2y=20, substitute y=10-x into area to get Area(x)=10x-x^2. Setting Area'(x)=10-2x=0 gives x=5, and Area''(x)=-2<0 confirms a maximum at 5 by 5.",
  'ap-calculus-ab-foundation-pilot-item-051':
    'Total water accumulated equals the definite integral of the inflow rate from t=0 to t=2: integral_0^2 3t^2 dt = [t^3]_0^2 = 8-0 = 8 liters.',
  'ap-calculus-ab-foundation-pilot-item-052':
    'By the Net Change Theorem, net change equals the definite integral of the rate function, which combines signed areas above and below the axis: 6+(-2)=4.',
  'ap-calculus-ab-foundation-pilot-item-053':
    'With two equal subintervals on [0,2], each width is dx=(2-0)/2=1. Using left endpoints x=0 and x=1, the left Riemann sum is 1*f(0)+1*f(1)=1(1)+1(3)=4.',
  'ap-calculus-ab-foundation-pilot-item-054':
    'Dividing [0,4] into two equal subintervals [0,2] and [2,4] gives width dx=2 and midpoints x=1 and x=3. Summing width times midpoint heights yields 2[f(1)+f(3)].',
  'ap-calculus-ab-foundation-pilot-item-056':
    'By the Fundamental Theorem of Calculus (Part 1) combined with the chain rule, evaluate the integrand at the upper bound x^2 and multiply by d/dx(x^2)=2x to get 2x cos(x^2).',
  'ap-calculus-ab-foundation-pilot-item-057':
    'An antiderivative of 2x is x^2. Applying the Fundamental Theorem of Calculus on [1,3] gives [x^2]_1^3 = 3^2-1^2 = 9-1 = 8.',
  'ap-calculus-ab-foundation-pilot-item-058':
    'By the interval additivity property of definite integrals, integral_a^c f(x)dx = integral_a^b f(x)dx + integral_b^c f(x)dx = 5+(-2) = 3.',
  'ap-calculus-ab-foundation-pilot-item-062':
    'With k>0 and T>20, the factor T-20 is positive, making dT/dt=-k(T-20)<0. Thus temperature decreases toward the stable equilibrium T=20 where dT/dt=0.',
  'ap-calculus-ab-foundation-pilot-item-065':
    "Each segment in a slope field has slope equal to dy/dx at that point. Substituting (x,y)=(1,1) into the differential equation y'=x-y gives 1-1=0.",
  'ap-calculus-ab-foundation-pilot-item-066':
    "Equilibrium solutions are constant functions whose derivative is identically zero. Setting y'=y(3-y)=0 yields the two constant equilibrium solutions y=0 and y=3.",
  'ap-calculus-ab-foundation-pilot-item-067':
    'Divide by y!=0 and multiply by dx to separate variables into (1/y)dy=x dx. Integrating both sides yields the implicit solution family ln|y|=x^2/2+C.',
  'ap-calculus-ab-foundation-pilot-item-068':
    'Separating variables gives dy/y=2dx, which integrates to the exponential family y=Ce^(2x). Applying the initial condition y(0)=3 yields C=3, so y=3e^(2x).',
  'ap-calculus-ab-foundation-pilot-item-069':
    "Exponential growth P'=kP has solution P(t)=P(0)e^(kt). Setting P(d)=2P(0) cancels P(0) to give e^(kd)=2; taking natural logs yields kd=ln(2), so k=ln(2)/d.",
  'ap-calculus-ab-foundation-pilot-item-070':
    "In the logistic equation P'=0.2P(1-P/500), the carrying capacity is L=500. Because P' is a concave-down quadratic in P with zeros 0 and 500, growth is fastest at L/2=250.",
  'ap-calculus-ab-foundation-pilot-item-071':
    'By the average value formula (1/(b-a)) integral_a^b f(x)dx, compute (1/3) integral_0^3 x^2 dx = (1/3)[x^3/3]_0^3 = (1/3)(9) = 3.',
  'ap-calculus-ab-foundation-pilot-item-072':
    'The average value of f on [2,7] equals the definite integral divided by the interval width b-a=7-2=5. Computing 20/5 gives an average value of 4.',
  'ap-calculus-ab-foundation-pilot-item-075':
    'On [0,1], y=x lies above y=x^2, so integrate upper minus lower: integral_0^1 (x-x^2)dx = [x^2/2 - x^3/3]_0^1 = 1/2 - 1/3 = 1/6.',
  'ap-calculus-ab-foundation-pilot-item-076':
    'For 0<=y<=2, the line x=2y lies to the right of the parabola x=y^2. Integrating horizontal slices (right minus left) yields Integral 0 to 2 of (2y-y^2)dy.',
  'ap-calculus-ab-foundation-pilot-item-077':
    'Volume by known cross sections integrates cross-sectional area over the interval. Because each square slice of side x has area x^2, the volume is Integral_0^2 of x^2 dx.',
  'ap-calculus-ab-foundation-pilot-item-079':
    'Using the disk method with radius R(x)=sqrt(x), the volume is pi integral_0^4 (sqrt(x))^2 dx = pi integral_0^4 x dx = pi[x^2/2]_0^4 = 8 pi.',
  'ap-calculus-ab-foundation-pilot-item-080':
    'On [0,1], y=x is farther from the x-axis than y=x^2, so outer radius R=x and inner radius r=x^2. The washer formula pi integral (R^2-r^2)dx gives pi integral 0 to 1 of (x^2-x^4)dx.',
  'ap-calculus-ab-foundation-pilot-item-084':
    'Multiply and divide by 5 to rewrite sin(5x)/x as 5*[sin(5x)/(5x)]. Since 5x approaches 0 with x and lim_{u->0} sin(u)/u=1, the limit evaluates to 5*1=5.',
  'ap-calculus-ab-foundation-pilot-item-095':
    "Rewrite f(x)=sqrt(x) as x^(1/2) and apply the power rule to obtain f'(x)=(1/2)x^(-1/2)=1/(2sqrt(x)). Substituting x=9 gives 1/(2*3)=1/6.",
  'ap-calculus-ab-foundation-pilot-item-097':
    "Apply the logarithm chain rule d/dx[ln(u)]=u'/u with u=2x to get 2/(2x), which cancels to 1/x (also clear from rewriting ln(2x)=ln 2+ln x).",
  'ap-calculus-ab-foundation-pilot-item-099':
    "By the product rule, h'(1)=f'(1)g(1)+f(1)g'(1). Substituting the given values at x=1 gives (-1)(4)+(2)(3)=-4+6=2.",
  'ap-calculus-ab-foundation-pilot-item-100':
    "By the quotient rule, h'(1)=[f'(1)g(1)-f(1)g'(1)]/[g(1)]^2. Plugging in the values at x=1 yields [(-1)(4)-(2)(3)]/4^2=-10/16=-5/8.",
  'ap-calculus-ab-foundation-pilot-item-102':
    'Using the chain rule with outer u^(-1) and inner u=1+x^2, differentiate to -(1+x^2)^(-2)*(2x) and rewrite the negative exponent as -2x/(1+x^2)^2.',
  'ap-calculus-ab-foundation-pilot-item-109':
    "First differentiate f(x)=ln x to get f'(x)=1/x=x^(-1). Differentiating a second time with the power rule produces f''(x)=-x^(-2)=-1/x^2.",
  'ap-calculus-ab-foundation-pilot-item-112':
    "The derivative T'(h)=dT/dh measures how temperature changes per unit change in altitude, so its units are output units per input unit: degrees Celsius per meter.",
  'ap-calculus-ab-foundation-pilot-item-114':
    "A particle is at rest when velocity v(t)=s'(t) equals zero. Differentiating gives v(t)=3t^2-12t+9=3(t-1)(t-3), which equals 0 at positive times t=1 and t=3.",
  'ap-calculus-ab-foundation-pilot-item-115':
    'Differentiate sphere volume V=(4/3)pi r^3 with respect to time to get dV/dt=4 pi r^2 (dr/dt). Plugging in r=2 and dr/dt=3 gives 4 pi(4)(3)=48 pi cubic centimeters per second.',
  'ap-calculus-ab-foundation-pilot-item-116':
    'With fixed height h=6, cone volume V=(1/3)pi r^2 h reduces to V=2 pi r^2. Differentiating yields dV/dt=4 pi r (dr/dt), so r=2 and dr/dt=0.5 give 4 pi(2)(0.5)=4 pi cubic centimeters per second.',
  'ap-calculus-ab-foundation-pilot-item-117':
    "At x=1, f(x)=ln x has value f(1)=0 and slope f'(1)=1/1=1, giving the tangent-line approximation L(x)=0+1(x-1)=x-1. Evaluating at x=1.02 gives L(1.02)=0.02.",
  'ap-calculus-ab-foundation-pilot-item-134':
    'On [0,4] with two subintervals of width dx=2, the trapezoidal rule computes (dx/2)[f(0)+2f(2)+f(4)]=(2/2)[1+2(5)+9]=20.',
  'ap-calculus-ab-foundation-pilot-item-136':
    "Applying the Fundamental Theorem of Calculus with the chain rule to both moving limits gives F'(x)=(x^2)*d/dx(x^2) - x*d/dx(x) = (x^2)(2x)-x = 2x^3-x.",
  'ap-calculus-ab-foundation-pilot-item-137':
    'By the reversal property of definite integrals, swapping the upper and lower limits negates the integral: integral_b^a f(x)dx = -integral_a^b f(x)dx = -7.',
  'ap-calculus-ab-foundation-pilot-item-149':
    "Exponential decay Q'=kQ satisfies Q(t)=Q(0)e^(kt). Setting Q(h)=Q(0)/2 yields e^(kh)=1/2; taking natural logs gives kh=ln(1/2)=-ln(2), so k=-ln(2)/h.",
  'ap-calculus-ab-foundation-pilot-item-160':
    'Each circular cross section of radius 2-x has area pi(2-x)^2. Integrating from 0 to 2 gives pi[-(2-x)^3/3]_0^2 = pi(0 - (-8/3)) = 8pi/3.',
};
