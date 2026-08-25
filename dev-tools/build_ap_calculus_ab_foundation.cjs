#!/usr/bin/env node
'use strict';

// Original AP Calculus AB internal foundation pilot. This is not an official
// College Board product, calibrated exam, score predictor, or FRQ scorer.

const path = require('node:path');
const { writeGeneratedFile } = require('./write_generated_file.cjs');

const root = path.resolve(__dirname, '..');
const packPath = path.join(root, 'test_prep', 'ap_calculus_ab_foundation_pilot.json');
const libraryPath = path.join(root, 'test_prep', 'ap_calculus_ab_foundation_pilot_learning_library.json');
const PACK_ID = 'ap-calculus-ab-foundation-pilot';
const VERSION = '0.1.0-internal-preview';
const VERIFIED_AT = '2026-08-25';
const CED_URL = 'https://apcentral.collegeboard.org/media/pdf/ap-calculus-ab-and-bc-course-and-exam-description.pdf';
const COURSE_URL = 'https://apcentral.collegeboard.org/courses/ap-calculus-ab';
const EXAM_URL = 'https://apcentral.collegeboard.org/courses/ap-calculus-ab/exam';
const OPENSTAX_URL = 'https://openstax.org/details/books/calculus-volume-1';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function writeJson(filePath, value) {
  writeGeneratedFile(filePath, JSON.stringify(value, null, 2) + '\n');
}

const practices = [
  { id: 'MP1', label: 'Implementing Mathematical Processes', description: 'Select and apply mathematical rules and procedures with and without technology.' },
  { id: 'MP2', label: 'Connecting Representations', description: 'Connect analytical, graphical, numerical, tabular, and verbal information.' },
  { id: 'MP3', label: 'Justification', description: 'Apply definitions and theorems with their conditions and provide valid reasons.' },
  { id: 'MP4', label: 'Communication and Notation', description: 'Use precise notation, language, units, and conventions.' },
];

function topic(id, label, frameworkTopicIds, studyMove, boundary) {
  return { id, label, frameworkTopicIds, studyMove, boundary };
}

const units = [
  {
    id: 'limits-and-continuity', number: 1, label: 'Unit 1: Limits and Continuity', shortLabel: 'Limits and Continuity',
    weight: 0.125, officialWeightMin: 0.10, officialWeightMax: 0.15,
    overview: 'Limits describe local behavior and make continuity, instantaneous change, and asymptotic reasoning precise.',
    topics: [
      topic('1.2', 'Defining Limits and Using Limit Notation', ['1.2'], 'Separate nearby behavior from the defined function value.', 'A limit may exist when the function value differs or is undefined.'),
      topic('1.6', 'Limits Using Algebraic Manipulation', ['1.6'], 'Identify the indeterminate form before factoring or rationalizing.', 'Cancellation preserves nearby behavior while respecting the excluded input.'),
      topic('1.10', 'Types of Discontinuities', ['1.10', '1.11'], 'Compare both one-sided limits and the function value.', 'Holes, jumps, and infinite discontinuities require different evidence.'),
      topic('1.14', 'Infinite Limits and Asymptotic Behavior', ['1.14', '1.15'], 'Track sign and dominant terms.', 'Vertical and horizontal asymptotes answer different questions.'),
      topic('1.16', 'Intermediate Value Theorem', ['1.16'], 'State continuity, interval, and target value.', 'IVT guarantees existence, not uniqueness.'),
    ],
    formulas: ['Continuity at c requires lim f(x) = f(c)', 'IVT applies to continuous functions on closed intervals', 'Dominant terms determine many limits at infinity'],
    cautions: ['Check both one-sided limits.', 'Do not treat infinity as a real input.', 'Name theorem conditions before conclusions.'],
    example: ['Evaluate lim (x^2-9)/(x-3) as x approaches 3.', 'Factor and cancel for nearby x not equal to 3.', 'The reduced expression x+3 approaches 6.'],
  },
  {
    id: 'differentiation-definition-and-fundamental-properties', number: 2, label: 'Unit 2: Differentiation: Definition and Fundamental Properties', shortLabel: 'Derivative Foundations',
    weight: 0.125, officialWeightMin: 0.10, officialWeightMax: 0.15,
    overview: 'The derivative is a limit of average rates and a local measure represented in several forms.',
    topics: [
      topic('2.2', 'Derivative Definition and Notation', ['2.1', '2.2'], 'Connect difference quotient, tangent slope, and instantaneous rate.', 'A derivative value is a rate, not the function value.'),
      topic('2.4', 'Differentiability and Continuity', ['2.4'], 'Inspect corners, cusps, vertical tangents, and discontinuities.', 'Differentiability implies continuity, but not conversely.'),
      topic('2.5', 'Power and Linearity Rules', ['2.5', '2.6'], 'Differentiate term by term and preserve constants.', 'The derivative of a constant is zero.'),
      topic('2.7', 'Basic Transcendental Derivatives', ['2.7'], 'Recall the derivative family before evaluating.', 'Trigonometric signs and ln x require care.'),
      topic('2.8', 'Product and Quotient Rules', ['2.8', '2.9'], 'Label factors or numerator and denominator first.', 'Products and quotients do not differentiate componentwise.'),
    ],
    formulas: ["f'(a) = lim [f(a+h)-f(a)]/h", 'd/dx x^n = n x^(n-1)', "(fg)' = f'g + fg'", "(f/g)' = (f'g-fg')/g^2"],
    cautions: ['Preserve quotient-rule order.', 'A corner can be continuous.', 'Use output units per input unit.'],
    example: ['Differentiate x^2 e^x.', 'Apply the product rule.', 'The result is e^x(x^2+2x).'],
  },
  {
    id: 'differentiation-composite-implicit-inverse-functions', number: 3, label: 'Unit 3: Differentiation: Composite, Implicit, and Inverse Functions', shortLabel: 'Advanced Differentiation',
    weight: 0.075, officialWeightMin: 0.05, officialWeightMax: 0.10,
    overview: 'Derivative rules extend to compositions, implicit relations, inverses, and higher-order change.',
    topics: [
      topic('3.1', 'The Chain Rule', ['3.1'], 'Differentiate outer, preserve inner, and multiply by the inner derivative.', 'The inner derivative is required.'),
      topic('3.2', 'Implicit Differentiation', ['3.2'], 'Attach dy/dx when differentiating y terms.', 'Treat y as a function of x.'),
      topic('3.3', 'Inverse and Inverse Trigonometric Derivatives', ['3.3', '3.4'], 'Use reciprocal slope at corresponding points.', 'An inverse derivative is not an inverse formula operation.'),
      topic('3.5', 'Selecting Derivative Procedures', ['3.5'], 'Read expression structure from outside inward.', 'Simplification or logarithmic differentiation may help.'),
      topic('3.6', 'Higher-Order Derivatives', ['3.6'], 'Track meaning and units of successive derivatives.', 'Second derivative is change in the first derivative.'),
    ],
    formulas: ["d/dx f(g(x)) = f'(g(x))g'(x)", "(f inverse)'(a) = 1/f'(f inverse(a))", 'Implicit differentiation uses the chain rule on y'],
    cautions: ['Write the inner derivative.', 'Check inverse slopes are nonzero.', 'Distinguish velocity, speed, and acceleration.'],
    example: ['Differentiate x^2+y^2=25 implicitly.', "Obtain 2x+2y(dy/dx)=0.", 'Solve to get dy/dx=-x/y.'],
  },
  {
    id: 'contextual-applications-of-differentiation', number: 4, label: 'Unit 4: Contextual Applications of Differentiation', shortLabel: 'Contextual Derivatives',
    weight: 0.125, officialWeightMin: 0.10, officialWeightMax: 0.15,
    overview: 'Derivatives model motion and changing quantities, related rates, and local approximation.',
    topics: [
      topic('4.1', 'Interpreting Derivatives in Context', ['4.1', '4.3'], 'Name quantity, input, sign, and compound units.', 'A derivative is a local rate, not accumulation.'),
      topic('4.2', 'Straight-Line Motion', ['4.2'], 'Keep position, velocity, acceleration, and speed distinct.', 'Speed increases when velocity and acceleration share a sign.'),
      topic('4.5', 'Related Rates', ['4.4', '4.5'], 'Write one relationship before differentiating in time.', 'Substitute instant values after differentiating.'),
      topic('4.6', 'Local Linearity', ['4.6'], "Use L(x)=f(a)+f'(a)(x-a) near a.", 'A linearization is local, not exact.'),
      topic('4.7', "L'Hospital's Rule", ['4.7'], 'Verify 0/0 or infinity/infinity first.', 'The rule does not apply to every quotient.'),
    ],
    formulas: ["v=s'", "a=v'=s''", "L(x)=f(a)+f'(a)(x-a)", 'Related rates differentiate a relationship in time'],
    cautions: ['Attach contextual units.', 'Speed is magnitude of velocity.', 'Verify an eligible indeterminate form.'],
    example: ['A circle radius grows at 2 cm/s when r=3 cm.', 'Differentiate A=pi r^2 in time.', 'dA/dt=12 pi cm^2/s.'],
  },
  {
    id: 'analytical-applications-of-differentiation', number: 5, label: 'Unit 5: Analytical Applications of Differentiation', shortLabel: 'Derivative Analysis',
    weight: 0.175, officialWeightMin: 0.15, officialWeightMax: 0.20,
    overview: 'Derivative signs and existence theorems justify extrema, shape, and optimization conclusions.',
    topics: [
      topic('5.1', 'Mean Value Theorem', ['5.1'], 'Verify continuity and differentiability before matching slopes.', 'MVT guarantees at least one point.'),
      topic('5.2', 'Extreme Values and Critical Points', ['5.2'], 'Compare endpoints and interior critical numbers.', 'A critical number is only a candidate.'),
      topic('5.3', 'First-Derivative Analysis', ['5.3', '5.4', '5.5'], 'Build a sign chart around critical numbers.', 'A zero derivative without sign change need not be an extremum.'),
      topic('5.6', 'Concavity and Second-Derivative Analysis', ['5.6', '5.7'], 'Use second-derivative sign and verify changes.', 'f double prime equal to zero gives only a candidate.'),
      topic('5.9', 'Graph Relationships and Optimization', ['5.8', '5.9', '5.11'], 'Translate derivative signs, then state a feasible domain.', 'Optimization needs a contextual conclusion.'),
    ],
    formulas: ["MVT: f'(c)=[f(b)-f(a)]/(b-a)", "f' sign controls monotonicity", "f'' sign controls concavity"],
    cautions: ['State theorem hypotheses.', 'Test closed-interval endpoints.', 'Use sign charts as evidence.'],
    example: ['Maximize rectangle area with perimeter 20.', 'Use A=x(10-x) on 0<=x<=10.', 'The maximum occurs for a 5 by 5 square.'],
  },
  {
    id: 'integration-and-accumulation-of-change', number: 6, label: 'Unit 6: Integration and Accumulation of Change', shortLabel: 'Integration and Accumulation',
    weight: 0.175, officialWeightMin: 0.15, officialWeightMax: 0.20,
    overview: 'Integrals accumulate signed change, and the Fundamental Theorem links integration and differentiation.',
    topics: [
      topic('6.1', 'Accumulations of Change', ['6.1'], 'Interpret signed area with contextual units.', 'Net change differs from total magnitude.'),
      topic('6.2', 'Riemann Sums and Integral Notation', ['6.2', '6.3'], 'Identify width and sample point for each rectangle.', 'Left, right, and midpoint sums differ.'),
      topic('6.4', 'Fundamental Theorem of Calculus', ['6.4', '6.5', '6.7'], 'Evaluate the integrand at a moving bound and use the chain rule.', 'A composite upper bound adds a derivative factor.'),
      topic('6.6', 'Properties of Definite Integrals', ['6.6'], 'Use orientation and additivity.', 'Reversing limits changes sign.'),
      topic('6.8', 'Antiderivatives and Substitution', ['6.8', '6.9'], 'Match an inner expression and derivative.', 'Indefinite integrals require +C.'),
    ],
    formulas: ['Integral of a rate gives net change', "If G(x)=integral a to x of f, then G'=f", 'Adjacent definite integrals add'],
    cautions: ['Include delta x.', 'Separate signed accumulation from area.', 'Use absolute value for integral of 1/x.'],
    example: ['Evaluate integral 1 to 3 of 2x dx.', 'Use antiderivative x^2.', 'The value is 9-1=8.'],
  },
  {
    id: 'differential-equations', number: 7, label: 'Unit 7: Differential Equations', shortLabel: 'Differential Equations',
    weight: 0.075, officialWeightMin: 0.05, officialWeightMax: 0.10,
    overview: 'Differential equations model rates through fields, separable solutions, and growth behavior.',
    topics: [
      topic('7.1', 'Modeling with Differential Equations', ['7.1'], 'Translate sign, proportionality, and units.', 'An initial condition selects a particular solution.'),
      topic('7.2', 'Verifying Solutions', ['7.2'], 'Differentiate and substitute into both sides.', 'One matching point does not verify a solution.'),
      topic('7.4', 'Reasoning with Slope Fields', ['7.4'], 'Evaluate the derivative at a point.', 'A field shows local direction, not exact values.'),
      topic('7.6', 'Separation and Initial Conditions', ['7.6', '7.7'], 'Separate variables, integrate, then apply the condition.', 'Check equilibria that division may discard.'),
      topic('7.8', 'Exponential and Logistic Models', ['7.8', '7.9'], 'Distinguish proportional growth from capacity-limited growth.', 'Logistic growth is fastest at half capacity.'),
    ],
    formulas: ["dy/dx=ky gives y=Ce^(kx)", 'Separate y factors with dy and x factors with dx', 'Logistic growth contains 1-P/K'],
    cautions: ['Check equilibrium solutions.', 'Apply initial conditions after integration.', 'Interpret parameters with units.'],
    example: ['Solve dy/dx=2y with y(0)=3.', 'Integrate dy/y=2dx.', 'The solution is y=3e^(2x).'],
  },
  {
    id: 'applications-of-integration', number: 8, label: 'Unit 8: Applications of Integration', shortLabel: 'Applications of Integration',
    weight: 0.125, officialWeightMin: 0.10, officialWeightMax: 0.15,
    overview: 'Integrals produce averages, net change, area, and volume from changing quantities.',
    topics: [
      topic('8.1', 'Average Value', ['8.1'], 'Divide a definite integral by interval length.', 'Average value is not total accumulation.'),
      topic('8.2', 'Motion and Accumulation in Context', ['8.2', '8.3'], 'Use initial amount plus integral of net rate.', 'Displacement is signed; distance integrates speed.'),
      topic('8.4', 'Area Between Curves', ['8.4', '8.5', '8.6'], 'Use top minus bottom or right minus left and split if needed.', 'Unsplit signed integrals may cancel regions.'),
      topic('8.7', 'Known Cross Sections', ['8.7', '8.8'], 'Write cross-sectional area before integrating.', 'Base distance is length, not area.'),
      topic('8.9', 'Discs and Washers', ['8.9', '8.10', '8.11', '8.12'], 'Measure radii from the axis.', 'A shifted axis changes both radii.'),
    ],
    formulas: ['Average value=(1/(b-a)) integral f', 'Area=integral of upper-lower or right-left', 'Washer volume=pi integral (R^2-r^2)'],
    cautions: ['Determine curve order.', 'Use cubic volume units.', 'Distinguish radius from diameter.'],
    example: ['Find area between y=x and y=x^2 on [0,1].', 'Integrate x-x^2.', 'The area is 1/6.'],
  },
];

const unitByNumber = new Map(units.map((unit) => [unit.number, unit]));
const topicByKey = new Map(units.flatMap((unit) => unit.topics.map((entry) => [unit.number + '.' + entry.id, { ...entry, unit }])));

function q(unit, topicId, practiceId, representation, prompt, answer, distractors, rationale, cognitiveProcess = 'apply') {
  assert(topicByKey.has(unit + '.' + topicId), 'Missing topic route ' + unit + '.' + topicId);
  assert(Array.isArray(distractors) && distractors.length === 3, 'Each item needs three distractors.');
  return { unit, topicId, practiceId, representation, prompt, answer, distractors, rationale, cognitiveProcess };
}

const itemSpecs = [];

itemSpecs.push(
  q(1, '1.2', 'MP2', 'tabular', 'A table shows f(x) approaching 5 from both sides as x approaches 2, while f(2)=9. What is the limit?', '5', ['9', '14', 'The limit does not exist'], 'A limit uses nearby behavior; both one-sided values approach 5.', 'interpret'),
  q(1, '1.2', 'MP3', 'verbal', 'As x approaches 4, g(x) approaches 3 from the left and 7 from the right. Which conclusion is valid?', 'The two-sided limit does not exist.', ['The limit is 3', 'The limit is 5', 'The limit is 7'], 'A two-sided limit requires equal left-hand and right-hand limits.', 'justify'),
  q(1, '1.6', 'MP1', 'analytical', 'Evaluate lim as x approaches 3 of (x^2-9)/(x-3).', '6', ['0', '3', 'The limit does not exist'], 'Factoring reduces the nearby expression to x+3, which approaches 6.'),
  q(1, '1.6', 'MP1', 'analytical', 'Evaluate lim as x approaches 0 of [sqrt(x+4)-2]/x.', '1/4', ['0', '1/2', '4'], 'Rationalizing gives 1/[sqrt(x+4)+2], whose limit is 1/4.'),
  q(1, '1.10', 'MP2', 'analytical', 'For x not equal to 1, f(x)=(x^2-1)/(x-1), and f(1)=4. What occurs at x=1?', 'A removable discontinuity', ['A jump discontinuity', 'An infinite discontinuity', 'No discontinuity'], 'Nearby values approach 2, but the defined value is 4; one redefinition repairs continuity.', 'classify'),
  q(1, '1.10', 'MP3', 'graphical-text', 'A graph approaches 2 from the left of x=0 and 5 from the right. How is the discontinuity classified?', 'Jump discontinuity', ['Removable discontinuity', 'Infinite discontinuity', 'Continuous'], 'Different finite one-sided limits create a jump.', 'classify'),
  q(1, '1.14', 'MP2', 'analytical', 'What is lim as x approaches 4 of 2/(x-4)^2?', 'Positive infinity', ['Negative infinity', '0', '2'], 'The squared denominator approaches zero through positive values on both sides.', 'analyze'),
  q(1, '1.14', 'MP1', 'analytical', 'What is lim as x approaches positive infinity of (3x^2-1)/(x^2+4)?', '3', ['0', '1', 'Positive infinity'], 'Equal polynomial degrees give the ratio of leading coefficients.', 'calculate'),
  q(1, '1.16', 'MP3', 'verbal', 'A function is continuous on [1,4], with f(1)=-2 and f(4)=5. What does IVT guarantee?', 'At least one c in (1,4) has f(c)=0.', ['Exactly one such c exists', 'f is increasing', "Some c has f'(c)=0"], 'Zero lies between the endpoint outputs, and continuity guarantees an interior preimage.', 'justify'),
  q(1, '1.16', 'MP3', 'verbal', 'A continuous function has f(a)=1 and f(b)=6 for a<b. Which claim is justified?', 'The function takes value 3 somewhere between a and b.', ['It takes value 3 exactly once', 'Its slope is constant', 'It has no local extrema'], 'IVT guarantees existence for every target between the endpoint values.', 'justify'),

  q(2, '2.2', 'MP2', 'analytical', "What does lim as h approaches 0 of [f(3+h)-f(3)]/h represent?", "f'(3)", ['f(3)', "f''(3)", 'The average value of f'], 'This is the limit definition of the derivative at x=3.', 'identify'),
  q(2, '2.2', 'MP1', 'analytical', "Using the derivative definition for f(x)=x^2, what is f'(4)?", '8', ['4', '16', '32'], 'The difference quotient simplifies to 8+h and approaches 8.', 'calculate'),
  q(2, '2.4', 'MP3', 'graphical-text', 'The graph of f(x)=|x-2| has a corner at x=2. Why is f not differentiable there?', 'The one-sided slopes are -1 and 1.', ['f is not continuous there', 'The function value is zero', 'The graph has a minimum'], 'A derivative requires matching one-sided slopes; this continuous corner has unequal slopes.', 'justify'),
  q(2, '2.4', 'MP3', 'verbal', 'Which statement is always true at x=c?', 'Differentiability at c implies continuity at c.', ['Continuity at c implies differentiability', 'Every discontinuity has a vertical tangent', 'f(c)=0 implies differentiability'], 'Differentiability implies continuity, while corners show the converse can fail.', 'justify'),
  q(2, '2.5', 'MP1', 'analytical', 'Differentiate f(x)=5x^4-3x^2+7.', '20x^3-6x', ['20x^4-6x^2', '5x^3-3x', '20x^3-6x+7'], 'Apply the power rule term by term; the constant derivative is zero.', 'calculate'),
  q(2, '2.5', 'MP1', 'analytical', 'For f(x)=x^(-2), what is the tangent slope at x=2?', '-1/4', ['-1/2', '1/4', '4'], "f'(x)=-2x^(-3), so f'(2)=-2/8.", 'calculate'),
  q(2, '2.7', 'MP1', 'analytical', 'Differentiate 3 sin x - 2e^x + ln x for x>0.', '3 cos x - 2e^x + 1/x', ['3 cos x - 2e^x + ln x', '-3 sin x - 2e^x + 1/x', '3 cos x - 2xe^(x-1) + 1'], 'Use the standard transcendental derivatives with their constant multiples.', 'calculate'),
  q(2, '2.7', 'MP2', 'analytical', 'What is the derivative of cos x evaluated at x=pi/2?', '-1', ['0', '1', 'pi/2'], 'The derivative is -sin x, and -sin(pi/2)=-1.', 'calculate'),
  q(2, '2.8', 'MP1', 'analytical', 'Differentiate f(x)=x^2 e^x.', 'e^x(x^2+2x)', ['2xe^x', 'x^2e^x', '2xe^x+x^2'], 'The product rule gives 2xe^x+x^2e^x.', 'calculate'),
  q(2, '2.8', 'MP1', 'analytical', 'Differentiate g(x)=(x^2+1)/x for x not equal to 0.', '1-1/x^2', ['2', '1+1/x^2', '2x/(x-1)'], 'Rewrite as x+1/x or apply the quotient rule.', 'calculate'),

  q(3, '3.1', 'MP1', 'analytical', 'Differentiate (3x^2+1)^5.', '30x(3x^2+1)^4', ['5(3x^2+1)^4', '30x(3x^2+1)^5', '15x^2(3x^2+1)^4'], 'The chain rule multiplies the outer derivative by 6x.', 'calculate'),
  q(3, '3.1', 'MP1', 'analytical', 'Differentiate sin(2x^3).', '6x^2 cos(2x^3)', ['cos(2x^3)', '2x^3 cos(2x^3)', '6x^2 sin(2x^3)'], 'Differentiate sine and multiply by the derivative of 2x^3.', 'calculate'),
  q(3, '3.2', 'MP1', 'analytical', 'If x^2+y^2=25, what is dy/dx where y is nonzero?', '-x/y', ['-y/x', 'x/y', '-2x/y^2'], 'Implicit differentiation gives 2x+2y(dy/dx)=0.', 'calculate'),
  q(3, '3.2', 'MP1', 'analytical', 'For xy+y^2=8, what is dy/dx at (2,2)?', '-1/3', ['-1', '1/3', '3'], "Differentiation gives y+xy'+2yy'=0, so y'=-2/6.", 'calculate'),
  q(3, '3.3', 'MP2', 'tabular', "A one-to-one function has f(2)=5 and f'(2)=3. What is the derivative of its inverse at 5?", '1/3', ['2', '3', '5'], 'The inverse derivative is the reciprocal slope at the corresponding input.', 'translate'),
  q(3, '3.3', 'MP1', 'analytical', 'Differentiate arctan(3x).', '3/(1+9x^2)', ['1/(1+9x^2)', '3/(1+3x^2)', '1/(1-9x^2)'], 'Use u prime over 1+u squared with u=3x.', 'calculate'),
  q(3, '3.5', 'MP1', 'analytical', 'Which derivative follows from logarithmic differentiation of y=x^x for x>0?', "x^x(ln x+1)", ['x x^(x-1)', 'x^x ln x', 'x^(x-1)'], 'ln y=x ln x gives y prime over y equal to ln x+1.', 'derive'),
  q(3, '3.5', 'MP1', 'verbal', 'Which rules are most direct for differentiating e^(x^2)/(1+x)?', 'The quotient rule together with the chain rule', ['Only the power rule', 'Only implicit differentiation', 'The Fundamental Theorem'], 'The expression is a quotient whose exponential numerator is composite.', 'select'),
  q(3, '3.6', 'MP1', 'analytical', 'If f(x)=x^4-2x^3, what is the third derivative?', '24x-12', ['12x^2-12x', '24x', '4x^3-6x^2'], 'Differentiate successively three times.', 'calculate'),
  q(3, '3.6', 'MP2', 'analytical', 'A particle has s(t)=t^3-6t^2+9t. What is acceleration at t=3?', '6', ['0', '9', '18'], 'Acceleration is s double prime =6t-12, which is 6 at t=3.', 'calculate'),

  q(4, '4.1', 'MP4', 'verbal', "A tank volume V is in liters and t in minutes. What does V'(5)=-2 mean?", 'At 5 minutes, volume is decreasing at 2 liters per minute.', ['The tank contains -2 liters', 'Volume fell exactly 2 liters in 5 minutes', 'At 2 minutes, volume falls at 5 liters per minute'], 'The derivative is an instantaneous signed rate with compound units.', 'interpret'),
  q(4, '4.1', 'MP4', 'verbal', "Cost C(q) is in dollars for q items. What are the units of C'(100)?", 'Dollars per item', ['Items per dollar', 'Dollars', 'Items squared per dollar'], 'Derivative units are output units divided by input units.', 'interpret'),
  q(4, '4.2', 'MP1', 'analytical', 'A particle has position s(t)=t^3-3t^2. What is velocity at t=3?', '9', ['0', '18', '27'], "Differentiate position to obtain velocity s'(t)=3t^2-6t, then evaluate at t=3 to get 9.", 'calculate'),
  q(4, '4.2', 'MP3', 'analytical', 'At t=3, v(t)=t^2-4 and a(t)=2t. Is speed increasing or decreasing?', 'Increasing, because velocity and acceleration are both positive.', ['Decreasing because acceleration is positive', 'Decreasing because velocity is positive', 'Neither'], 'Speed increases when nonzero velocity and acceleration have the same sign.', 'justify'),
  q(4, '4.5', 'MP1', 'analytical', 'A circle radius grows at 2 cm/s. How fast is area growing when r=3 cm?', '12 pi cm^2/s', ['4 pi cm^2/s', '6 pi cm^2/s', '18 pi cm^2/s'], 'Differentiate A=pi r^2 in time and substitute after differentiating.', 'calculate'),
  q(4, '4.5', 'MP1', 'analytical', 'A 10-foot ladder has x^2+y^2=100. If dx/dt=1 when x=6 and y=8, what is dy/dt?', '-3/4 ft/s', ['3/4 ft/s', '-4/3 ft/s', '1 ft/s'], 'x dx/dt+y dy/dt=0 gives dy/dt=-6/8.', 'calculate'),
  q(4, '4.6', 'MP1', 'analytical', 'Use linearization at x=4 to approximate sqrt(4.1).', '2.025', ['2.01', '2.05', '4.025'], 'At 4 the value is 2 and derivative is 1/4, so add (1/4)(0.1).', 'approximate'),
  q(4, '4.6', 'MP2', 'analytical', 'Using the tangent line to e^x at x=0, approximate e^0.03.', '1.03', ['0.03', '1.003', '1.30'], 'The local linearization is 1+x.', 'approximate'),
  q(4, '4.7', 'MP3', 'analytical', "After verifying the form, use L'Hospital's Rule for lim as x approaches 0 of (e^x-1)/x.", '1', ['0', 'e', 'The limit does not exist'], 'The 0/0 form becomes e^x/1 after differentiation.', 'justify'),
  q(4, '4.7', 'MP3', 'analytical', "Find lim as x approaches positive infinity of (ln x)/x using L'Hospital's Rule.", '0', ['1', 'Positive infinity', 'The limit does not exist'], 'The infinity/infinity form becomes (1/x)/1, which approaches zero.', 'justify'),
);

itemSpecs.push(
  q(5, '5.1', 'MP3', 'analytical', 'For f(x)=x^2 on [1,3], what value c is guaranteed by the Mean Value Theorem?', '2', ['1', '3', '4'], 'The secant slope is 4 and f prime(c)=2c=4.', 'justify'),
  q(5, '5.1', 'MP3', 'verbal', 'Why does the Mean Value Theorem not apply to f(x)=|x| on [-1,1]?', 'The function is not differentiable at x=0.', ['It is not continuous at 0', 'The endpoint values are equal', 'The interval has negative inputs'], 'The function is continuous but has a corner inside the interval.', 'justify'),
  q(5, '5.2', 'MP1', 'verbal', 'To find absolute extrema of a differentiable function on a closed interval, which values must be compared?', 'Function values at endpoints and all interior critical numbers', ['Only endpoint values', 'Only points where the derivative is zero', 'Only second-derivative values'], 'The candidates test includes endpoints and every interior point where the derivative is zero or undefined.', 'select'),
  q(5, '5.2', 'MP3', 'analytical', 'The function f(x)=x^3 has f prime(0)=0. What does this show?', 'A critical number need not be a local extremum.', ['Every critical number is a maximum', 'A zero derivative makes a function constant', 'The function is not differentiable at zero'], 'The function increases through zero despite its horizontal tangent.', 'justify'),
  q(5, '5.3', 'MP2', 'analytical', "Suppose f'(x)=(x+2)(x-1). Which conclusion follows from a sign chart?", 'A local maximum at -2 and a local minimum at 1', ['Local minima at both values', 'A local minimum at -2 and maximum at 1', 'Increasing on (-2,1)'], 'The derivative changes positive-to-negative at -2 and negative-to-positive at 1.', 'analyze'),
  q(5, '5.3', 'MP3', 'verbal', 'Which evidence identifies a local minimum at x=c by the first derivative test?', "f' changes from negative to positive at c.", ["f'(c)=0 only", "f' changes from positive to negative", "f''(c)=0 only"], 'Negative-to-positive means the function changes from decreasing to increasing.', 'justify'),
  q(5, '5.6', 'MP2', 'analytical', "If f''(x)=6x-12, where is f concave up?", 'x>2', ['x<2', 'x>-2', 'All real x'], 'Concavity is upward where 6x-12 is positive.', 'analyze'),
  q(5, '5.6', 'MP3', 'verbal', "If f'(3)=0 and f''(3)<0, what does the second derivative test establish?", 'A local maximum at x=3', ['A local minimum at x=3', 'An inflection point at x=3', 'No conclusion'], 'A critical point with negative second derivative is locally concave down.', 'justify'),
  q(5, '5.9', 'MP2', 'graphical-text', "On an interval, the graph of f' is above the x-axis and decreasing. How does f behave?", 'Increasing and concave down', ['Increasing and concave up', 'Decreasing and concave down', 'Decreasing and concave up'], "Positive f' gives increase, while decreasing f' gives negative f double prime.", 'translate'),
  q(5, '5.9', 'MP1', 'analytical', 'A rectangle has perimeter 20. Which dimensions maximize area?', '5 by 5', ['2 by 8', '4 by 6', '1 by 9'], 'A=x(10-x) is a concave-down quadratic with vertex at x=5.', 'optimize'),

  q(6, '6.1', 'MP4', 'analytical', 'Water enters at r(t)=3t^2 liters per hour. How much enters from t=0 to t=2?', '8 liters', ['4 liters', '12 liters', '24 liters'], 'The integral of 3t^2 from 0 to 2 is 8.', 'calculate'),
  q(6, '6.1', 'MP2', 'graphical-text', 'A rate graph has signed area 6 above the time axis and -2 below it. What is net change?', '4', ['8', '-4', '12'], 'Net change is the signed sum 6+(-2).', 'interpret'),
  q(6, '6.2', 'MP1', 'tabular', 'For x=0,1,2, a table gives f(x)=1,3,5. What is the left sum on [0,2] with two equal subintervals?', '4', ['6', '8', '9'], 'Width is 1 and the left endpoint heights are 1 and 3.', 'calculate'),
  q(6, '6.2', 'MP2', 'analytical', 'Which is the midpoint sum for f on [0,4] with two equal subintervals?', '2[f(1)+f(3)]', ['2[f(0)+f(2)]', '2[f(2)+f(4)]', '4[f(1)+f(3)]'], 'Each width is 2 and the midpoints are 1 and 3.', 'translate'),
  q(6, '6.4', 'MP1', 'analytical', 'If G(x)=integral from 1 to x of (t^2+1)dt, what is G prime?', 'x^2+1', ['2x', 'x^3/3+x', '1'], 'The Fundamental Theorem returns the integrand at the moving upper bound.', 'calculate'),
  q(6, '6.4', 'MP1', 'analytical', 'If H(x)=integral from 0 to x^2 of cos(t)dt, what is H prime?', '2x cos(x^2)', ['cos(x^2)', '-2x sin(x^2)', 'sin(x^2)'], 'FTC gives cos(x^2), and the chain rule contributes 2x.', 'calculate'),
  q(6, '6.6', 'MP1', 'analytical', 'Evaluate integral from 1 to 3 of 2x dx.', '8', ['4', '6', '10'], 'Use antiderivative x^2 and compute 9-1.', 'calculate'),
  q(6, '6.6', 'MP3', 'analytical', 'If integral a to b of f is 5 and integral b to c is -2, what is integral a to c?', '3', ['-10', '7', '10'], 'Additivity over adjacent intervals gives 5+(-2).', 'justify'),
  q(6, '6.8', 'MP1', 'analytical', 'Find an indefinite integral of 3x^2-4.', 'x^3-4x+C', ['6x-4+C', 'x^3-4+C', 'x^2-4x+C'], 'Reverse the power rule term by term and include the arbitrary constant.', 'calculate'),
  q(6, '6.8', 'MP1', 'analytical', 'Evaluate the indefinite integral of 2x(x^2+1)^4 dx.', '(x^2+1)^5/5+C', ['2(x^2+1)^5+C', '(x^2+1)^4/4+C', 'x^2(x^2+1)^5+C'], 'Let u=x^2+1 so du=2x dx; integrating u^4 gives u^5/5 plus the constant of integration.', 'calculate'),

  q(7, '7.1', 'MP4', 'verbal', 'A population satisfies dP/dt=0.04P. What does the equation state?', 'Growth rate is 4 percent of the current population per time unit.', ['Growth is exactly 0.04 individuals', 'Population is always 4', 'Population decreases by 4 percent'], 'The rate is positively proportional to the current population.', 'interpret'),
  q(7, '7.1', 'MP2', 'verbal', 'For dT/dt=-k(T-20), k positive, what happens when T>20?', 'Temperature decreases toward 20.', ['It increases away from 20', 'It is always constant', 'It immediately becomes 20'], 'When T-20 is positive, the derivative is negative.', 'interpret'),
  q(7, '7.2', 'MP3', 'analytical', "Why does y=Ce^(2x) satisfy y'=2y?", "Differentiating gives y'=2Ce^(2x), equal to 2y.", ["Differentiating gives y'=Ce^(2x)", 'Checking x=0 proves it for all x', 'Every exponential satisfies every differential equation'], 'Direct differentiation verifies the equation for every input.', 'verify'),
  q(7, '7.2', 'MP3', 'analytical', "Does y=x^2 satisfy y'=y for every real x?", 'No, because 2x is not equal to x^2 for every x.', ['Yes, both contain x', 'Yes, equality holds at x=0', 'No, x^2 is not differentiable'], 'Verification requires equality throughout an interval, not at isolated points.', 'verify'),
  q(7, '7.4', 'MP2', 'graphical-text', "For y'=x-y, what slope should a slope field show at (1,1)?", '0', ['-2', '1', '2'], 'Substitution gives slope 1-1=0.', 'translate'),
  q(7, '7.4', 'MP3', 'analytical', "For y'=y(3-y), which constant functions are equilibrium solutions?", 'y=0 and y=3', ['y=1 only', 'y=-3 and y=3', 'None'], 'Equilibria make y prime zero, so solve y(3-y)=0.', 'justify'),
  q(7, '7.6', 'MP1', 'analytical', 'Separate and integrate dy/dx=xy for nonzero y. Which implicit family results?', 'ln|y|=x^2/2+C', ['ln|y|=x+C', 'y^2/2=x^2/2+C', 'y=x^2/2+C'], 'dy/y=x dx integrates to ln|y|=x^2/2+C.', 'calculate'),
  q(7, '7.6', 'MP1', 'analytical', 'Solve dy/dx=2y with y(0)=3.', 'y=3e^(2x)', ['y=2e^(3x)', 'y=3e^x', 'y=3+2x'], 'The family y=Ce^(2x) and the condition give C=3.', 'calculate'),
  q(7, '7.8', 'MP1', 'analytical', 'For P prime=kP with doubling time d, what is k?', 'ln(2)/d', ['2/d', 'd/ln(2)', 'ln(d)/2'], 'From 2=e^(kd), taking logs gives kd=ln 2.', 'derive'),
  q(7, '7.8', 'MP2', 'analytical', "For P'=0.2P(1-P/500), at what population is growth fastest?", '250', ['0', '100', '500'], 'A logistic rate is greatest at half the carrying capacity.', 'interpret'),

  q(8, '8.1', 'MP1', 'analytical', 'What is the average value of f(x)=x^2 on [0,3]?', '3', ['9', '1', '27'], 'The integral is 9 and interval length is 3.', 'calculate'),
  q(8, '8.1', 'MP1', 'analytical', 'If integral from 2 to 7 of f(x)dx=20, what is the average value?', '4', ['2.5', '5', '20'], 'Divide the integral by interval length 5.', 'calculate'),
  q(8, '8.2', 'MP4', 'analytical', 'Velocity is v(t)=3t^2 meters per second. What is displacement from t=0 to t=2?', '8 meters', ['6 meters', '12 meters', '24 meters'], 'Displacement is the integral of velocity, [t^3] from 0 to 2.', 'calculate'),
  q(8, '8.2', 'MP2', 'verbal', 'A reservoir has inflow I(t), outflow O(t), and initial volume V0. Which expression gives volume at T?', 'V0+integral 0 to T of [I(t)-O(t)]dt', ['V0+I(T)-O(T)', 'Integral 0 to T of [I(t)+O(t)]dt', 'V0 times integral of I(t)'], 'Final amount equals initial amount plus accumulated net rate.', 'translate'),
  q(8, '8.4', 'MP1', 'analytical', 'Find the area between y=x and y=x^2 on 0<=x<=1.', '1/6', ['-1/6', '1/3', '1/2'], 'Integrate upper minus lower: x-x^2.', 'calculate'),
  q(8, '8.4', 'MP2', 'analytical', 'The region is bounded by x=y^2 and x=2y for 0<=y<=2. Which integral gives area?', 'Integral 0 to 2 of (2y-y^2)dy', ['Integral 0 to 2 of (y^2-2y)dy', 'Integral of (2y+y^2)', 'Integral of (2-y)'], 'Horizontal slices use right minus left.', 'translate'),
  q(8, '8.7', 'MP2', 'analytical', 'On 0<=x<=2, each cross section is a square with side x. Which integral gives volume?', 'Integral 0 to 2 of x^2 dx', ['Integral of x dx', 'pi times integral of x^2', 'Integral of 4x'], 'Square cross-sectional area is x squared.', 'translate'),
  q(8, '8.7', 'MP3', 'verbal', 'If each semicircular cross section has diameter d(x), what is its area?', 'pi[d(x)]^2/8', ['pi[d(x)]^2/2', 'pi[d(x)]^2', 'pi d(x)/2'], 'Radius is d/2, and half of pi r squared is pi d squared over 8.', 'justify'),
  q(8, '8.9', 'MP1', 'analytical', 'The region under y=sqrt(x) from x=0 to x=4 rotates about the x-axis. What is volume?', '8 pi', ['4 pi', '16 pi', '32 pi/3'], 'Disk area is pi x, whose integral from 0 to 4 is 8 pi.', 'calculate'),
  q(8, '8.9', 'MP2', 'analytical', 'The region between y=x and y=x^2 on [0,1] rotates about the x-axis. Which washer integral applies?', 'pi integral 0 to 1 of (x^2-x^4)dx', ['pi integral of (x-x^2)', 'pi integral of (x^4-x^2)', '2 pi integral of x(x-x^2)'], 'Outer radius is x and inner radius is x squared.', 'translate'),
);

const sourceCatalog = [
  { id: 'ap-calculus-ab-bc-ced', title: 'AP Calculus AB and BC Course and Exam Description', organization: 'College Board', url: CED_URL, credibility: 'Current public framework and exam reference.', sourceType: 'official-blueprint', reviewedAt: VERIFIED_AT },
  { id: 'ap-calculus-ab-course', title: 'AP Calculus AB Course', organization: 'College Board', url: COURSE_URL, credibility: 'Current public unit and mathematical-practice overview.', sourceType: 'official-course-page', reviewedAt: VERIFIED_AT },
  { id: 'ap-calculus-ab-exam', title: 'AP Calculus AB Exam', organization: 'College Board', url: EXAM_URL, credibility: 'Current public 2027 format, timing, and calculator boundary.', sourceType: 'official-exam-page', reviewedAt: VERIFIED_AT },
  { id: 'openstax-calculus-volume-1', title: 'Calculus Volume 1', organization: 'OpenStax, Rice University', url: OPENSTAX_URL, credibility: 'Open calculus reference used for factual cross-checking only.', sourceType: 'open-textbook-reference', reviewedAt: VERIFIED_AT },
];

const frameworkTopicIds = Array.from(new Set(units.flatMap((unit) => unit.topics.flatMap((entry) => entry.frameworkTopicIds))));
const practiceById = new Map(practices.map((practice) => [practice.id, practice]));

function chapterId(unitNumber) {
  return 'ap-calc-ab-ch-' + String(unitNumber).padStart(2, '0');
}

function sectionNumberForTopic(unit, topicId) {
  const index = unit.topics.findIndex((entry) => entry.id === topicId);
  return index < 2 ? 1 : index < 3 ? 2 : 3;
}

function sectionId(unitNumber, sectionNumber) {
  return chapterId(unitNumber) + '-section-' + String(sectionNumber).padStart(2, '0');
}

function rotateChoices(answer, distractors, answerIndex) {
  const choices = distractors.slice();
  choices.splice(answerIndex, 0, answer);
  return choices;
}

function makeItem(spec, index) {
  const unit = unitByNumber.get(spec.unit);
  const topicRoute = topicByKey.get(spec.unit + '.' + spec.topicId);
  const answerIndex = index % 4;
  const choices = rotateChoices(spec.answer, spec.distractors, answerIndex);
  const localIndex = index % 10;
  const calculatorUse = [3, 7, 9].includes(localIndex) ? 'calculator-permitted-practice' : 'calculator-not-required';
  const learningSectionId = sectionId(spec.unit, sectionNumberForTopic(unit, spec.topicId));
  return {
    id: PACK_ID + '-item-' + String(index + 1).padStart(3, '0'),
    templateVersion: 1,
    itemSchemaVersion: 2,
    type: 'single-choice',
    taskForm: 'multiple-choice',
    domainId: unit.id,
    unitNumber: unit.number,
    topicIds: topicRoute.frameworkTopicIds,
    topicRouteId: topicRoute.id,
    practiceId: spec.practiceId,
    practiceIds: [spec.practiceId],
    skillId: spec.practiceId,
    skillIds: [spec.practiceId],
    representation: spec.representation,
    calculatorUse,
    difficulty: localIndex < 3 ? 'foundational' : localIndex > 7 ? 'advanced-foundation' : 'moderate',
    cognitiveDemand: localIndex < 3 ? 'low' : 'moderate',
    cognitiveProcess: spec.cognitiveProcess,
    prompt: spec.prompt,
    choices,
    answerIndex,
    rationale: spec.rationale,
    choiceRationales: choices.map((choice, choiceIndex) => choiceIndex === answerIndex
      ? 'Best answer. ' + spec.rationale
      : 'Not best. Recheck this topic move: ' + topicRoute.studyMove + ' Boundary: ' + topicRoute.boundary),
    misconceptionTags: [topicRoute.boundary],
    references: [CED_URL, COURSE_URL, EXAM_URL, OPENSTAX_URL],
    sourceDetails: sourceCatalog.map((source) => ({ title: source.title, organization: source.organization, url: source.url, credibility: source.credibility })),
    provenance: {
      authoringBasis: 'Original internal item authored from public AP Calculus AB framework metadata and independent factual cross-checks.',
      officialContentReproduced: false,
      sourceQuestionReproduced: false,
      stimulusOriginal: true,
    },
    officialItem: false,
    rights: {
      secureCollegeBoardContentUsed: false,
      copiedOrRephrasedCollegeBoardQuestion: false,
      sourceProseOrFiguresReproduced: false,
      status: 'pending-independent-rights-review',
    },
    accessibility: {
      essentialVisual: false,
      textEquivalentProvided: true,
      mathNotationPlainTextCompatible: true,
      linearReadingOrder: true,
      screenReaderReviewStatus: 'pending-independent-review',
    },
    expertReview: { status: 'pending', required: true },
    psychometricStatus: 'not-calibrated',
    reviewStatus: 'source-reviewed-editorial-draft',
    qaStatus: 'pending-build-qa',
    releaseEligible: false,
    editorialChecks: {
      singleBestAnswer: true,
      parallelPlausibleOptions: true,
      noKeywordGiveaway: true,
      completeOptionFeedback: true,
      originalWording: true,
    },
    learningObjectiveId: 'ap-calc-ab-lo-' + topicRoute.id.replace('.', '-'),
    learningObjectiveLabel: topicRoute.label,
    learningSectionId,
    chapterIds: [chapterId(unit.number)],
  };
}

const items = itemSpecs.map(makeItem);

function paragraph(text) {
  return { type: 'paragraph', text, runs: [{ text }] };
}

function list(itemsToRender, ordered = false) {
  return { type: 'list', ordered, items: itemsToRender.map((text) => ({ text, runs: [{ text }] })) };
}

function itemsForTopic(unitNumber, topicId) {
  return items.filter((item) => item.unitNumber === unitNumber && item.topicRouteId === topicId);
}

function itemsForSection(unitNumber, sectionNumber) {
  const unit = unitByNumber.get(unitNumber);
  const topicIds = unit.topics.filter((entry) => sectionNumberForTopic(unit, entry.id) === sectionNumber).map((entry) => entry.id);
  return items.filter((item) => item.unitNumber === unitNumber && topicIds.includes(item.topicRouteId));
}

const chapters = units.map((unit) => {
  const sections = [1, 2, 3].map((number) => {
    const sectionTopics = unit.topics.filter((entry) => sectionNumberForTopic(unit, entry.id) === number);
    const sectionItems = itemsForSection(unit.number, number);
    const id = sectionId(unit.number, number);
    return {
      id,
      title: unit.shortLabel + ': ' + (number === 1 ? 'foundations' : number === 2 ? 'representation and reasoning' : 'transfer and synthesis'),
      chapterId: chapterId(unit.number),
      topicRouteIds: sectionTopics.map((entry) => entry.id),
      topicIds: sectionTopics.flatMap((entry) => entry.frameworkTopicIds),
      learningObjectiveIds: sectionTopics.map((entry) => 'ap-calc-ab-lo-' + entry.id.replace('.', '-')),
      blocks: [
        paragraph(unit.overview),
        list(sectionTopics.map((entry) => entry.label + ': ' + entry.studyMove)),
        paragraph('Worked-example sequence: ' + unit.example.join(' ')),
        list(sectionTopics.map((entry) => 'Boundary check: ' + entry.boundary)),
        paragraph('Retrieval move: explain the selected procedure, carry out the mathematics, and state why the result matches the representation or context.'),
      ],
      workedExample: { prompt: unit.example[0], steps: unit.example.slice(1), original: true },
      misconceptionGuidance: sectionTopics.map((entry) => ({ topicRouteId: entry.id, misconception: entry.boundary, repair: entry.studyMove })),
      knowledgeCheck: {
        id: id + '-check',
        title: 'Unscored retrieval check',
        itemIds: sectionItems.slice(0, 2).map((item) => item.id),
        unscored: true,
        releaseEligible: false,
      },
      practiceRoute: {
        id: id + '-practice',
        title: 'Section-linked foundation practice',
        itemIds: sectionItems.map((item) => item.id),
        topicItemIds: Object.fromEntries(sectionTopics.map((entry) => [entry.id, itemsForTopic(unit.number, entry.id).map((item) => item.id)])),
        representationModes: Array.from(new Set(sectionItems.map((item) => item.representation))),
        calculatorModes: Array.from(new Set(sectionItems.map((item) => item.calculatorUse))),
        unscored: true,
        releaseEligible: false,
      },
      accessibility: { textFirst: true, linearReadingOrder: true, mathNotationPlainTextCompatible: true },
      status: 'source-reviewed-editorial-draft',
      releaseEligible: false,
    };
  });
  return {
    id: chapterId(unit.number),
    title: unit.label,
    unitId: unit.id,
    introduction: unit.overview,
    objectives: unit.topics.map((entry) => ({ id: 'ap-calc-ab-lo-' + entry.id.replace('.', '-'), label: entry.label, topicIds: entry.frameworkTopicIds })),
    sections,
    knowledgeChecks: sections.map((section) => section.knowledgeCheck),
    foundationPrototype: true,
    sourceReviewed: true,
    status: 'source-reviewed-editorial-draft',
    releaseEligible: false,
  };
});

const practiceRoutes = chapters.flatMap((chapter) => chapter.sections.map((section) => section.practiceRoute));
const flashcards = units.flatMap((unit) => unit.topics.map((entry, index) => ({
  id: 'ap-calc-ab-card-' + String(unit.number).padStart(2, '0') + '-' + String(index + 1).padStart(2, '0'),
  unitId: unit.id,
  topicRouteId: entry.id,
  front: 'What is the reliable move for ' + entry.label + '?',
  back: entry.studyMove + ' Boundary: ' + entry.boundary,
  original: true,
  officialItem: false,
  releaseEligible: false,
})));

const memoryAids = units.flatMap((unit) => [
  {
    id: 'ap-calc-ab-memory-' + String(unit.number).padStart(2, '0') + '-01',
    unitId: unit.id,
    title: unit.shortLabel + ' decision loop',
    content: ['Name the representation.', 'Select a definition, theorem, or procedure.', 'Check its conditions.', 'Execute with clear notation.', 'Interpret or justify the result.'],
    original: true,
    releaseEligible: false,
  },
  {
    id: 'ap-calc-ab-memory-' + String(unit.number).padStart(2, '0') + '-02',
    unitId: unit.id,
    title: unit.shortLabel + ' boundary scan',
    content: unit.cautions,
    original: true,
    releaseEligible: false,
  },
]);

const quickReference = units.map((unit) => ({
  id: 'ap-calc-ab-reference-' + String(unit.number).padStart(2, '0'),
  unitId: unit.id,
  title: unit.shortLabel + ' original quick reference',
  purpose: 'A compact learner-authored-style check before and after practice.',
  formulas: unit.formulas,
  decisionRules: unit.topics.map((entry) => entry.studyMove),
  cautions: unit.cautions,
  checklist: ['Can I name the representation?', 'Have I checked procedure or theorem conditions?', 'Does the result have the right sign, units, and meaning?'],
  originalStudyAid: true,
  officialExamReference: false,
  releaseEligible: false,
}));

const diagrams = units.map((unit) => ({
  id: 'ap-calc-ab-flow-' + String(unit.number).padStart(2, '0'),
  title: unit.shortLabel + ' reasoning flow',
  type: 'optional-concept-flow',
  spec: {
    nodes: [
      { id: 'representation', label: 'Identify representation and givens' },
      { id: 'procedure', label: 'Select procedure and verify conditions' },
      { id: 'execution', label: 'Execute with notation and units' },
      { id: 'interpretation', label: 'Interpret, justify, and check' },
    ],
    edges: [
      { from: 'representation', to: 'procedure' },
      { from: 'procedure', to: 'execution' },
      { from: 'execution', to: 'interpretation' },
    ],
  },
  accessibility: {
    textEquivalent: ['Identify the representation and givens.', 'Select a procedure and verify conditions.', 'Execute with notation and units.', 'Interpret, justify, and check the result.'],
    fallbackMode: 'ordered-text-equivalent',
  },
  unscored: true,
  officialItem: false,
  releaseEligible: false,
}));

const diagramPlacements = units.map((unit) => ({
  id: 'ap-calc-ab-placement-' + String(unit.number).padStart(2, '0'),
  diagramId: 'ap-calc-ab-flow-' + String(unit.number).padStart(2, '0'),
  sectionId: sectionId(unit.number, 1),
  fallbackMode: 'diagram-text-equivalent',
  requiredForComprehension: false,
  releaseEligible: false,
}));

const workshopSeeds = [
  {
    title: 'Limits, continuity, and theorem conditions',
    scenario: 'An original piecewise function is described by a formula on two intervals and a separately defined joining value.',
    parts: ['Determine a two-sided limit at the join.', 'Classify continuity and identify a repair if possible.', 'State whether IVT can justify a target value on a named interval.', 'Explain which theorem condition controls the conclusion.'],
  },
  {
    title: 'Derivative definition and rule selection',
    scenario: 'An original table and formula describe the same differentiable quantity near one input.',
    parts: ['Write a derivative as a difference-quotient limit.', 'Estimate the derivative from the table.', 'Differentiate the formula using appropriate rules.', 'Reconcile the numerical and analytical representations.'],
  },
  {
    title: 'Composite and implicit derivative reasoning',
    scenario: 'An original implicit relation defines a branch y as a function of x near a stated point.',
    parts: ['Find dy/dx implicitly.', 'Evaluate the slope at the point.', 'Find a second derivative or derivative of a related composition.', 'Explain where the procedure requires a nonzero denominator.'],
  },
  {
    title: 'Contextual rates and local approximation',
    scenario: 'A sensor records the changing radius and volume of an original container model.',
    parts: ['Interpret a derivative with units.', 'Relate two rates by differentiating a geometric equation.', 'Use a tangent-line approximation at a nearby input.', 'State why the approximation is local.'],
  },
  {
    title: 'Function analysis and optimization',
    scenario: 'An original derivative sign table describes a cost-efficiency function over a closed interval.',
    parts: ['Identify increasing and decreasing intervals.', 'Justify local extrema from sign changes.', 'Compare absolute-extremum candidates.', 'Formulate and justify one contextual optimization conclusion.'],
  },
  {
    title: 'Accumulation and the Fundamental Theorem',
    scenario: 'An original rate table describes material entering and leaving a process over time.',
    parts: ['Construct a Riemann-sum estimate.', 'Interpret the signed accumulation with units.', 'Differentiate a related accumulation function.', 'Use integral properties to combine intervals.'],
  },
  {
    title: 'Differential-equation model audit',
    scenario: 'An original population model is proposed with an initial value and a capacity limit.',
    parts: ['Interpret the differential equation.', 'Verify or reject a proposed solution.', 'Use local slopes to describe behavior.', 'Compare exponential and logistic assumptions.'],
  },
  {
    title: 'Area and volume model selection',
    scenario: 'An original planar region is described by two curves and used as the base of a solid.',
    parts: ['Write an area integral with correct curve order.', 'Write a cross-section volume integral.', 'Write a washer integral for a stated axis.', 'Explain the units and one common radius error.'],
  },
];

const constructedResponseWorkshops = workshopSeeds.map((seed, index) => ({
  id: 'ap-calc-ab-workshop-' + String(index + 1).padStart(2, '0'),
  title: seed.title,
  unitIds: [units[index].id],
  responseType: 'constructed-response-planning-workshop',
  scenario: seed.scenario,
  parts: seed.parts.map((prompt, partIndex) => ({ id: String.fromCharCode(65 + partIndex), prompt })),
  responsePlanning: ['Identify givens and representations.', 'Name a valid procedure or theorem and its conditions.', 'Show an expression before calculator evaluation.', 'Use notation, units, and a contextual or mathematical conclusion.'],
  selfCheck: ['Every requested quantity is addressed.', 'The selected procedure matches the representation.', 'Theorem conditions are stated when needed.', 'Signs and units are interpreted.', 'No score or official rubric claim is made.'],
  calculatorUse: index % 3 === 0 ? 'calculator-permitted-planning' : 'calculator-not-required',
  references: [CED_URL, COURSE_URL, EXAM_URL],
  original: true,
  officialItem: false,
  officialRubricUsed: false,
  unscored: true,
  automatedScoring: false,
  accessibility: { textFirst: true, linearReadingOrder: true, mathNotationPlainTextCompatible: true },
  reviewStatus: 'internal-editorial-draft',
  releaseEligible: false,
}));

const studyRouteDefinitions = [
  { id: 'limits-and-derivative-foundations', title: 'Limits and derivative foundations', unitNumbers: [1, 2] },
  { id: 'derivative-methods-and-applications', title: 'Derivative methods and applications', unitNumbers: [3, 4, 5] },
  { id: 'integration-models-and-applications', title: 'Integration, differential equations, and applications', unitNumbers: [6, 7, 8] },
  { id: 'mixed-representation-retrieval', title: 'Mixed representation retrieval', unitNumbers: [1, 2, 3, 4, 5, 6, 7, 8], onePerTopic: true },
];

const studyRoutes = studyRouteDefinitions.map((definition) => {
  const routeItems = definition.onePerTopic
    ? units.flatMap((unit) => unit.topics.map((entry) => itemsForTopic(unit.number, entry.id)[0]))
    : items.filter((item) => definition.unitNumbers.includes(item.unitNumber));
  return {
    id: 'ap-calc-ab-study-' + definition.id,
    title: definition.title,
    unitIds: definition.unitNumbers.map((number) => unitByNumber.get(number).id),
    itemIds: routeItems.map((item) => item.id),
    sequence: ['Review one quick reference.', 'Complete the selected items.', 'Explain one error or successful transfer.', 'Choose a section route for follow-up.'],
    unscored: true,
    releaseEligible: false,
  };
});

const learningObjectiveCatalog = units.flatMap((unit) => unit.topics.map((entry) => ({
  id: 'ap-calc-ab-lo-' + entry.id.replace('.', '-'),
  label: entry.label,
  unitId: unit.id,
  chapterId: chapterId(unit.number),
  sectionId: sectionId(unit.number, sectionNumberForTopic(unit, entry.id)),
  topicRouteId: entry.id,
  frameworkTopicIds: entry.frameworkTopicIds,
})));

const rightsPolicy = {
  secureCollegeBoardContentUsed: false,
  copiedOrRephrasedCollegeBoardQuestions: false,
  copiedCollegeBoardRubricText: false,
  sourceProseOrFiguresReproduced: false,
  diagramSpecificationsOriginal: true,
  authoringBasis: 'Independent original wording informed by public blueprint metadata and factual sources.',
  publicSourceUse: 'Blueprint alignment and factual verification only; no source prose, figures, or assessment content reproduced.',
  openStaxUse: 'Factual cross-checking and links only; no textbook prose, figures, or assessment content reproduced.',
  status: 'pending-independent-rights-review',
};

const releaseGates = {
  internalStructuralValidation: 'pending-build-qa',
  independentRightsReview: 'pending',
  independentAccessibilityReview: 'pending',
  apCalculusSubjectExpertReview: 'pending',
  productionValidation: 'pending',
  fieldTesting: 'not-started',
  psychometricCalibration: 'not-started',
  cedAndPolicyReverification: 'required-before-release',
  releaseEligible: false,
};

function buildLibrary() {
  return {
    schemaVersion: 1,
    librarySchemaVersion: 1,
    libraryId: PACK_ID + '-learning-library',
    packId: PACK_ID,
    version: VERSION,
    title: 'AP Calculus AB Foundation Pilot Learning Library',
    description: 'A text-first, independently authored AP Calculus AB foundation library with eight chapters, section-linked practice routes, quick references, retrieval checks, study cards, memory aids, optional text-equivalent reasoning flows, and eight explicitly unscored response-planning workshops.',
    status: 'preview',
    visibility: 'internal',
    released: false,
    releaseEligible: false,
    officialItem: false,
    blueprint: {
      academicYearReference: '2026-27',
      targetExamYear: 2027,
      cedEffectiveLabel: 'Fall 2026 clarifications; May 2027 exam format',
      officialBlueprintUrl: CED_URL,
      officialCourseUrl: COURSE_URL,
      officialExamUrl: EXAM_URL,
      pilotVersion: VERSION,
      pilotNote: 'An 80-item initial seed across eight units, forty topic routes, twenty-four section routes, four study routes, and eight unscored response-planning workshops.',
      practices,
      learningObjectiveCatalogVersion: VERSION,
      learningObjectiveCatalog,
      selectedFrameworkTopicIds: frameworkTopicIds,
      unitWeights: units.map((unit) => ({ id: unit.id, label: unit.label, officialWeightRange: [unit.officialWeightMin, unit.officialWeightMax] })),
    },
    reviewStandard: 'Independent source and editorial review against the public AP Calculus AB and BC Course and Exam Description, current public exam page, and openly available factual references. Independent subject-expert, accessibility, rights, production, field-testing, and psychometric review remain required.',
    disclaimer: 'Independent, unofficial AP Calculus AB preparation material for internal foundation-pilot development only. Not affiliated with, endorsed by, or authored by College Board. AP and Advanced Placement are trademarks of College Board. No secure AP Classroom, Question Bank, Progress Check, official question, official rubric, or official stimulus was used or reproduced. This pilot does not provide official scores, score predictions, college-credit predictions, or automated FRQ scores.',
    sourceCatalog,
    chapters,
    practiceRouting: { mode: 'section-linked-original-foundation', routes: practiceRoutes },
    studyRoutes,
    quickReference,
    diagrams,
    diagramPlacements,
    flashcards,
    memoryAids,
    constructedResponseWorkshops,
    summary: {
      chapters: chapters.length,
      sections: chapters.reduce((sum, chapter) => sum + chapter.sections.length, 0),
      knowledgeChecks: chapters.reduce((sum, chapter) => sum + chapter.knowledgeChecks.length, 0),
      flashcards: flashcards.length,
      memoryAids: memoryAids.length,
      practiceRoutes: practiceRoutes.length,
      studyRoutes: studyRoutes.length,
      quickReference: quickReference.length,
      diagrams: diagrams.length,
      diagramPlacements: diagramPlacements.length,
      constructedResponseWorkshops: constructedResponseWorkshops.length,
      topicRoutes: units.reduce((sum, unit) => sum + unit.topics.length, 0),
      richLessonPrototypes: chapters.length,
      sourceReviewedChapters: chapters.length,
      releaseEligibleRecords: 0,
    },
    accessibility: {
      contentForm: 'text-first, linear lessons, plain-text math notation, single-choice items, optional flows, and unscored planning workshops',
      essentialVisualItems: 0,
      diagramsRequiredForComprehension: false,
      diagramFallbackMode: 'ordered-text-equivalent',
      independentReviewStatus: 'pending',
      productionScreenReaderValidationStatus: 'pending',
      productionVoiceValidationStatus: 'pending',
    },
    rightsPolicy,
    releaseGates,
    expertReviewGate: {
      requiredRole: 'Independent educator or faculty reviewer with current AP Calculus AB course and assessment expertise',
      status: 'pending',
      releaseBlocked: true,
    },
    transitionNotice: 'Reverify the current CED clarifications, May 2027 timing, hybrid digital administration, calculator policy, and public-use boundaries before any release or later expansion.',
    contentMigration: {
      schemaVersion: 1,
      contentVersion: 'ap-calculus-ab-foundation-v1',
      sections: chapters.reduce((sum, chapter) => sum + chapter.sections.length, 0),
      completeSections: chapters.reduce((sum, chapter) => sum + chapter.sections.length, 0),
      richLessonPrototypes: chapters.length,
      status: 'foundation-prototype',
      note: 'All eight chapters and twenty-four structured sections are navigable; independent review remains pending.',
    },
  };
}

function countBy(values, selector) {
  const result = {};
  for (const value of values) {
    const key = selector(value);
    result[key] = (result[key] || 0) + 1;
  }
  return result;
}

function buildPack(library) {
  const domains = units.map((unit) => ({
    id: unit.id,
    label: unit.label,
    weight: unit.weight,
    officialWeightMin: unit.officialWeightMin,
    officialWeightMax: unit.officialWeightMax,
    itemCount: items.filter((item) => item.domainId === unit.id).length,
  }));
  const sections = Array.from({ length: 16 }, (_, index) => ({
    id: 'ap-calc-ab-foundation-bank-' + String(index + 1).padStart(2, '0'),
    label: 'Bank ' + String(index + 1).padStart(2, '0') + ': five-item internal foundation sampler',
    timeMinutes: null,
    released: false,
    itemIds: items.slice(index * 5, index * 5 + 5).map((item) => item.id),
  }));
  return {
    schemaVersion: 1,
    id: PACK_ID,
    title: 'AP Calculus AB Independent Foundation Pilot',
    shortTitle: 'AP Calculus AB Foundation Pilot',
    description: 'An independently authored 80-question AP Calculus AB initial foundation seed spanning all eight units. It tests calculus-specific blueprint metadata, representation and calculator routing, native learning chapters, and unscored response planning before expansion toward a complete bank.',
    disclaimer: 'Independent, unofficial AP Calculus AB preparation material for internal foundation-pilot development only. Not affiliated with, endorsed by, or authored by College Board. This pilot does not provide official scores, score predictions, college-credit predictions, or automated FRQ scores.',
    credentialOwner: 'College Board',
    version: VERSION,
    status: 'preview',
    visibility: 'internal',
    released: false,
    releaseEligible: false,
    officialItem: false,
    calibrated: false,
    previewBadge: 'Internal foundation pilot - 80 original draft items',
    accent: 'indigo',
    itemSchemaVersion: 2,
    responseTypes: ['single-choice'],
    examModes: ['hybrid-digital'],
    contentReview: 'Eighty original draft multiple-choice items distributed evenly across all eight units and forty selected topic routes. The learning library includes eight chapters, twenty-four sections, forty study cards, sixteen memory aids, eight quick references, four cumulative study routes, and eight explicitly unscored constructed-response planning workshops. Independent subject-expert, rights, accessibility, production, field-testing, and psychometric review remain pending.',
    blueprintLabel: 'AP Calculus AB and BC Course and Exam Description with Fall 2026 clarifications and May 2027 exam format',
    blueprintEffective: 'Fall 2026 course clarifications; May 2027 exam format; public references reviewed ' + VERIFIED_AT + '.',
    officialBlueprintUrl: CED_URL,
    officialExamUrl: EXAM_URL,
    domains,
    sections,
    items,
    learningLibraryUrl: './test_prep/ap_calculus_ab_foundation_pilot_learning_library.json',
    learningRouteMode: library.practiceRouting.mode,
    practiceRouting: library.practiceRouting,
    practiceRouteCount: library.summary.practiceRoutes,
    studyRouteCount: library.summary.studyRoutes,
    quickReferenceCount: library.summary.quickReference,
    nativeQaUrl: './test_prep/ap_calculus_ab_foundation_pilot_qa.json',
    sourceCatalog,
    capabilities: {
      currentEngineSchemaVersion: 1,
      itemSchemaVersion: 2,
      currentEngineCompatible: true,
      responseTypes: ['single-choice'],
      stimulusGroupsIncluded: false,
      constructedResponseIncluded: false,
      frqWorkshopsIncluded: true,
      calculatorRoutingIncluded: true,
      handsFreeContentCompatible: true,
      limitations: [
        'This initial seed is not a complete AP Calculus AB exam simulation and does not reproduce the official hybrid digital experience.',
        'Official free-response prompts, scoring rubrics, secure questions, and score conversions are not included or scored.',
        'No official score, readiness, college-credit, or psychometric inference is supported.',
      ],
    },
    blueprint: {
      academicYearReference: '2026-27',
      targetExamYear: 2027,
      examModeReference: 'hybrid-digital',
      officialSectionOne: '42 multiple-choice questions in 100 minutes: 29 without a calculator and 13 with a graphing calculator; 50% of the official exam score.',
      officialSectionTwo: '6 free-response questions in 90 minutes: 2 with a graphing calculator and 4 without; 50% of the official exam score.',
      officialUnitCount: units.length,
      selectedFrameworkTopicCount: frameworkTopicIds.length,
      selectedFrameworkTopicIds: frameworkTopicIds,
      foundationTopicRouteCount: learningObjectiveCatalog.length,
      unitWeights: units.map((unit) => ({ id: unit.id, label: unit.label, officialWeightRange: [unit.officialWeightMin, unit.officialWeightMax] })),
      pilotAlignment: '80-item text-first initial seed across all eight units, forty selected topic routes, sixteen five-item banks, twenty-four section routes, four cumulative routes, and eight unscored response workshops; no official items or FRQ scoring.',
      lastVerifiedAt: VERIFIED_AT,
      sourceDigest: 'pending-build-generation',
      practices,
      learningObjectiveCatalogVersion: VERSION,
      learningObjectiveCatalog,
    },
    practiceDistribution: { ...countBy(items, (item) => item.practiceId), note: 'Practice counts support routing only and are not a psychometric blueprint.' },
    representationDistribution: { ...countBy(items, (item) => item.representation), note: 'Text-described graphical tasks avoid essential visual dependence in this initial seed.' },
    calculatorDistribution: { ...countBy(items, (item) => item.calculatorUse), note: 'Calculator labels support learner routing; banks are not official timed forms.' },
    topicDistribution: { ...countBy(items.flatMap((item) => item.topicIds), (topicId) => topicId), note: 'Selected public framework topic IDs are represented for foundation routing; this seed is not complete topic-depth coverage.' },
    rightsPolicy,
    releaseGates,
    accessibilityGate: {
      contentForm: 'text-only, linear single-choice items, native lessons, optional text-equivalent flows, and unscored planning workshops',
      essentialVisualItems: 0,
      screenReaderReadingOrderDeclared: true,
      mathNotationPlainTextCompatible: true,
      handsFreeContentCompatible: true,
      independentReviewStatus: 'pending',
      productionVoiceValidationStatus: 'pending',
    },
    expertReviewGate: library.expertReviewGate,
    transitionNotice: library.transitionNotice,
    sourceQuestionItems: 0,
    independentPracticeItems: items.length,
    distinctSourceContentKernels: items.length,
    batchSize: 5,
    diagnosticBatchCount: sections.length,
    constructedResponseWorkshopCount: constructedResponseWorkshops.length,
  };
}

function main() {
  assert(itemSpecs.length === 80, 'AP Calculus AB initial seed must contain 80 item specifications.');
  assert(new Set(itemSpecs.map((spec) => spec.prompt)).size === 80, 'AP Calculus AB prompts must be unique.');
  const library = buildLibrary();
  const pack = buildPack(library);
  assert(pack.items.length === 80 && new Set(pack.items.map((item) => item.id)).size === 80, 'Generated item inventory is invalid.');
  assert(pack.domains.length === 8 && pack.domains.every((domain) => domain.itemCount === 10), 'Each unit must contain ten items.');
  assert(units.every((unit) => unit.topics.every((entry) => itemsForTopic(unit.number, entry.id).length === 2)), 'Each topic route must contain two items.');
  const answerCounts = countBy(pack.items, (item) => String(item.answerIndex));
  assert(['0', '1', '2', '3'].every((key) => answerCounts[key] === 20), 'Answer positions must be balanced.');
  assert(library.summary.chapters === 8 && library.summary.sections === 24 && library.summary.practiceRoutes === 24, 'Learning-library inventory is invalid.');
  writeJson(packPath, pack);
  writeJson(libraryPath, library);
  console.log('Built ' + pack.id + ' ' + pack.version + ' with ' + pack.items.length + ' items across ' + pack.domains.length + ' units, ' + library.summary.topicRoutes + ' topic routes, and ' + library.constructedResponseWorkshops.length + ' unscored workshops.');
}

main();
