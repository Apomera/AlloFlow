'use strict';

const CALC_REFS = [
  'https://apcentral.collegeboard.org/media/pdf/ap-calculus-ab-and-bc-course-and-exam-description.pdf',
  'https://apcentral.collegeboard.org/courses/ap-calculus-ab',
];

const PHYS_REFS = [
  'https://apcentral.collegeboard.org/media/pdf/ap-physics-1-course-and-exam-description.pdf',
  'https://apstudents.collegeboard.org/courses/ap-physics-1-algebra-based',
];

function entry({
  id,
  term,
  definition,
  aliases,
  chapterId,
  chapterTitle,
  domainId,
  sectionId,
  sectionHeading,
  references,
}) {
  return {
    id,
    term,
    definition,
    aliases,
    chapterIds: [chapterId],
    domainIds: [domainId],
    linkage: {
      occurrences: [
        {
          chapterId,
          chapterTitle,
          domainId,
          domain: chapterTitle,
          sectionId,
          sectionHeading,
        },
      ],
    },
    reviewStatus: 'source-reviewed-editorial-pass',
    references: references.slice(),
  };
}

module.exports = {
  ap_calculus_ab_foundation_pilot: [
    // Unit 1: Limits and Continuity
    entry({
      id: 'ap-calc-ab-gloss-01',
      term: 'Two-sided limit',
      definition:
        'The value L that f(x) approaches as x approaches c from both sides, existing if and only if the left-hand and right-hand limits both exist and equal L, regardless of the value of f(c).',
      aliases: ['Limit'],
      chapterId: 'ap-calc-ab-ch-01',
      chapterTitle: 'Unit 1: Limits and Continuity',
      domainId: 'limits-and-continuity',
      sectionId: 'ap-calc-ab-ch-01-section-01',
      sectionHeading: 'Limits and Continuity: foundations',
      references: CALC_REFS,
    }),
    entry({
      id: 'ap-calc-ab-gloss-02',
      term: 'Continuity at a point',
      definition:
        'A function f is continuous at x = c when f(c) is defined, lim(x->c) f(x) exists, and lim(x->c) f(x) = f(c); failing any one condition creates a removable, jump, or infinite discontinuity.',
      aliases: ['Point continuity'],
      chapterId: 'ap-calc-ab-ch-01',
      chapterTitle: 'Unit 1: Limits and Continuity',
      domainId: 'limits-and-continuity',
      sectionId: 'ap-calc-ab-ch-01-section-02',
      sectionHeading: 'Limits and Continuity: representation and reasoning',
      references: CALC_REFS,
    }),
    entry({
      id: 'ap-calc-ab-gloss-03',
      term: 'Intermediate Value Theorem',
      definition:
        'If f is continuous on the closed interval [a, b] and k lies between f(a) and f(b), then at least one c in (a, b) satisfies f(c) = k; it guarantees existence of a value, not its uniqueness.',
      aliases: ['IVT'],
      chapterId: 'ap-calc-ab-ch-01',
      chapterTitle: 'Unit 1: Limits and Continuity',
      domainId: 'limits-and-continuity',
      sectionId: 'ap-calc-ab-ch-01-section-03',
      sectionHeading: 'Limits and Continuity: transfer and synthesis',
      references: CALC_REFS,
    }),

    // Unit 2: Differentiation: Definition and Fundamental Properties
    entry({
      id: 'ap-calc-ab-gloss-04',
      term: 'Limit definition of the derivative',
      definition:
        "The instantaneous rate of change f'(x) = lim(h->0) [f(x + h) - f(x)] / h, or equivalently lim(x->a) [f(x) - f(a)] / (x - a), giving the tangent-line slope whenever the finite limit exists.",
      aliases: ['Difference quotient limit'],
      chapterId: 'ap-calc-ab-ch-02',
      chapterTitle: 'Unit 2: Differentiation: Definition and Fundamental Properties',
      domainId: 'differentiation-definition-and-fundamental-properties',
      sectionId: 'ap-calc-ab-ch-02-section-01',
      sectionHeading: 'Derivative Foundations: foundations',
      references: CALC_REFS,
    }),
    entry({
      id: 'ap-calc-ab-gloss-05',
      term: 'Differentiability',
      definition:
        "A function is differentiable at x = c when f'(c) exists as a finite number; differentiability guarantees continuity, whereas corners, cusps, vertical tangents, or discontinuities prevent it.",
      aliases: ['Differentiable function'],
      chapterId: 'ap-calc-ab-ch-02',
      chapterTitle: 'Unit 2: Differentiation: Definition and Fundamental Properties',
      domainId: 'differentiation-definition-and-fundamental-properties',
      sectionId: 'ap-calc-ab-ch-02-section-02',
      sectionHeading: 'Derivative Foundations: representation and reasoning',
      references: CALC_REFS,
    }),
    entry({
      id: 'ap-calc-ab-gloss-06',
      term: 'Product and quotient rules',
      definition:
        "Differentiation rules giving (fg)' = f'g + fg' and (f/g)' = (f'g - fg') / g^2 for differentiable functions with g(x) != 0, preventing the error of differentiating factors or quotients separately.",
      aliases: ['Product rule', 'Quotient rule'],
      chapterId: 'ap-calc-ab-ch-02',
      chapterTitle: 'Unit 2: Differentiation: Definition and Fundamental Properties',
      domainId: 'differentiation-definition-and-fundamental-properties',
      sectionId: 'ap-calc-ab-ch-02-section-03',
      sectionHeading: 'Derivative Foundations: transfer and synthesis',
      references: CALC_REFS,
    }),

    // Unit 3: Differentiation: Composite, Implicit, and Inverse Functions
    entry({
      id: 'ap-calc-ab-gloss-07',
      term: 'Chain rule',
      definition:
        "The differentiation rule d/dx [f(g(x))] = f'(g(x)) * g'(x) for composite functions, multiplying the derivative of the outer function evaluated at the inner function by the inner derivative.",
      aliases: ['Composite derivative'],
      chapterId: 'ap-calc-ab-ch-03',
      chapterTitle: 'Unit 3: Differentiation: Composite, Implicit, and Inverse Functions',
      domainId: 'differentiation-composite-implicit-inverse-functions',
      sectionId: 'ap-calc-ab-ch-03-section-01',
      sectionHeading: 'Advanced Differentiation: foundations',
      references: CALC_REFS,
    }),
    entry({
      id: 'ap-calc-ab-gloss-08',
      term: 'Implicit differentiation',
      definition:
        'A method for finding dy/dx from an equation relating x and y without isolating y first, differentiating both sides with respect to x and multiplying every y-term derivative by dy/dx.',
      aliases: [],
      chapterId: 'ap-calc-ab-ch-03',
      chapterTitle: 'Unit 3: Differentiation: Composite, Implicit, and Inverse Functions',
      domainId: 'differentiation-composite-implicit-inverse-functions',
      sectionId: 'ap-calc-ab-ch-03-section-02',
      sectionHeading: 'Advanced Differentiation: representation and reasoning',
      references: CALC_REFS,
    }),
    entry({
      id: 'ap-calc-ab-gloss-09',
      term: 'Inverse function derivative',
      definition:
        "For a differentiable, one-to-one function f with f(a) = b and f'(a) != 0, the inverse satisfies (f^-1)'(b) = 1 / f'(a), evaluating the reciprocal slope at the input a that produces output b.",
      aliases: ['Derivative of an inverse'],
      chapterId: 'ap-calc-ab-ch-03',
      chapterTitle: 'Unit 3: Differentiation: Composite, Implicit, and Inverse Functions',
      domainId: 'differentiation-composite-implicit-inverse-functions',
      sectionId: 'ap-calc-ab-ch-03-section-03',
      sectionHeading: 'Advanced Differentiation: transfer and synthesis',
      references: CALC_REFS,
    }),

    // Unit 4: Contextual Applications of Differentiation
    entry({
      id: 'ap-calc-ab-gloss-10',
      term: 'Related rates',
      definition:
        'Problems linking two or more time-varying quantities through a geometric or physical equation, solved by differentiating implicitly with respect to time t before substituting instantaneous values.',
      aliases: [],
      chapterId: 'ap-calc-ab-ch-04',
      chapterTitle: 'Unit 4: Contextual Applications of Differentiation',
      domainId: 'contextual-applications-of-differentiation',
      sectionId: 'ap-calc-ab-ch-04-section-01',
      sectionHeading: 'Contextual Derivatives: foundations',
      references: CALC_REFS,
    }),
    entry({
      id: 'ap-calc-ab-gloss-11',
      term: 'Local linear approximation',
      definition:
        "Estimating f(x) near x = a with the tangent line L(x) = f(a) + f'(a)(x - a); the estimate overestimates f where f''(x) < 0 (concave down) and underestimates f where f''(x) > 0 (concave up).",
      aliases: ['Tangent line approximation', 'Linearization'],
      chapterId: 'ap-calc-ab-ch-04',
      chapterTitle: 'Unit 4: Contextual Applications of Differentiation',
      domainId: 'contextual-applications-of-differentiation',
      sectionId: 'ap-calc-ab-ch-04-section-02',
      sectionHeading: 'Contextual Derivatives: representation and reasoning',
      references: CALC_REFS,
    }),
    entry({
      id: 'ap-calc-ab-gloss-12',
      term: "L'Hospital's Rule",
      definition:
        "When lim f(x)/g(x) gives the indeterminate form 0/0 or infinity/infinity and g'(x) != 0 nearby, lim f(x)/g(x) = lim f'(x)/g'(x) if it exists; numerator and denominator limits must be shown separately.",
      aliases: ["L'Hôpital's rule"],
      chapterId: 'ap-calc-ab-ch-04',
      chapterTitle: 'Unit 4: Contextual Applications of Differentiation',
      domainId: 'contextual-applications-of-differentiation',
      sectionId: 'ap-calc-ab-ch-04-section-03',
      sectionHeading: 'Contextual Derivatives: transfer and synthesis',
      references: CALC_REFS,
    }),

    // Unit 5: Analytical Applications of Differentiation
    entry({
      id: 'ap-calc-ab-gloss-13',
      term: 'Mean Value Theorem',
      definition:
        "If f is continuous on [a, b] and differentiable on (a, b), then at least one c in (a, b) satisfies f'(c) = [f(b) - f(a)] / (b - a), equating instantaneous rate of change to average rate of change.",
      aliases: ['MVT'],
      chapterId: 'ap-calc-ab-ch-05',
      chapterTitle: 'Unit 5: Analytical Applications of Differentiation',
      domainId: 'analytical-applications-of-differentiation',
      sectionId: 'ap-calc-ab-ch-05-section-01',
      sectionHeading: 'Derivative Analysis: foundations',
      references: CALC_REFS,
    }),
    entry({
      id: 'ap-calc-ab-gloss-14',
      term: 'First Derivative Test',
      definition:
        "Classifies interior critical points where f'(c) = 0 or is undefined: f has a local maximum if f' changes from positive to negative, and a local minimum if f' changes from negative to positive.",
      aliases: ['Relative extrema test'],
      chapterId: 'ap-calc-ab-ch-05',
      chapterTitle: 'Unit 5: Analytical Applications of Differentiation',
      domainId: 'analytical-applications-of-differentiation',
      sectionId: 'ap-calc-ab-ch-05-section-02',
      sectionHeading: 'Derivative Analysis: representation and reasoning',
      references: CALC_REFS,
    }),
    entry({
      id: 'ap-calc-ab-gloss-15',
      term: 'Point of inflection',
      definition:
        "A point where a continuous function changes concavity, justified by a sign change in f''(x) (or a switch between increasing and decreasing in f'(x)), rather than by f''(x) = 0 alone.",
      aliases: ['Inflection point'],
      chapterId: 'ap-calc-ab-ch-05',
      chapterTitle: 'Unit 5: Analytical Applications of Differentiation',
      domainId: 'analytical-applications-of-differentiation',
      sectionId: 'ap-calc-ab-ch-05-section-03',
      sectionHeading: 'Derivative Analysis: transfer and synthesis',
      references: CALC_REFS,
    }),

    // Unit 6: Integration and Accumulation of Change
    entry({
      id: 'ap-calc-ab-gloss-16',
      term: 'Riemann sum',
      definition:
        'A finite sum Sigma f(x_i*) * delta-x approximating signed area on [a, b]; left, right, midpoint, and trapezoidal sums converge to the definite integral as the maximum subinterval width approaches zero.',
      aliases: ['Definite integral limit'],
      chapterId: 'ap-calc-ab-ch-06',
      chapterTitle: 'Unit 6: Integration and Accumulation of Change',
      domainId: 'integration-and-accumulation-of-change',
      sectionId: 'ap-calc-ab-ch-06-section-01',
      sectionHeading: 'Integration and Accumulation: foundations',
      references: CALC_REFS,
    }),
    entry({
      id: 'ap-calc-ab-gloss-17',
      term: 'Fundamental Theorem of Calculus',
      definition:
        "Links derivatives and integrals: if g(x) = integral from a to x of f(t) dt for continuous f, then g'(x) = f(x), and integral from a to b of f(x) dx = F(b) - F(a) for any antiderivative F of f.",
      aliases: ['FTC'],
      chapterId: 'ap-calc-ab-ch-06',
      chapterTitle: 'Unit 6: Integration and Accumulation of Change',
      domainId: 'integration-and-accumulation-of-change',
      sectionId: 'ap-calc-ab-ch-06-section-02',
      sectionHeading: 'Integration and Accumulation: representation and reasoning',
      references: CALC_REFS,
    }),
    entry({
      id: 'ap-calc-ab-gloss-18',
      term: 'Substitution method',
      definition:
        "An integration technique reversing the chain rule by setting u = g(x) and du = g'(x) dx to simplify an integrand; for definite integrals, the integration limits must also be transformed into u-values.",
      aliases: ['u-substitution'],
      chapterId: 'ap-calc-ab-ch-06',
      chapterTitle: 'Unit 6: Integration and Accumulation of Change',
      domainId: 'integration-and-accumulation-of-change',
      sectionId: 'ap-calc-ab-ch-06-section-03',
      sectionHeading: 'Integration and Accumulation: transfer and synthesis',
      references: CALC_REFS,
    }),

    // Unit 7: Differential Equations
    entry({
      id: 'ap-calc-ab-gloss-19',
      term: 'Slope field',
      definition:
        'A graphical lattice of short segments with slope dy/dx = F(x, y) at sampled points, used to visualize solution behavior and sketch the particular solution passing through an initial condition.',
      aliases: ['Direction field'],
      chapterId: 'ap-calc-ab-ch-07',
      chapterTitle: 'Unit 7: Differential Equations',
      domainId: 'differential-equations',
      sectionId: 'ap-calc-ab-ch-07-section-01',
      sectionHeading: 'Differential Equations: foundations',
      references: CALC_REFS,
    }),
    entry({
      id: 'ap-calc-ab-gloss-20',
      term: 'Separation of variables',
      definition:
        'A method for solving dy/dx = g(x)h(y) by rewriting (1/h(y)) dy = g(x) dx, integrating both sides with one constant C, applying the initial condition, and stating the domain containing that point.',
      aliases: ['Separable differential equation'],
      chapterId: 'ap-calc-ab-ch-07',
      chapterTitle: 'Unit 7: Differential Equations',
      domainId: 'differential-equations',
      sectionId: 'ap-calc-ab-ch-07-section-02',
      sectionHeading: 'Differential Equations: representation and reasoning',
      references: CALC_REFS,
    }),
    entry({
      id: 'ap-calc-ab-gloss-21',
      term: 'Exponential growth and decay',
      definition:
        'Solutions to the differential equation dy/dt = k*y have the form y(t) = y_0 * e^(kt), where rate of change is proportional to current amount, producing growth when k > 0 and decay when k < 0.',
      aliases: ['Proportional rate model'],
      chapterId: 'ap-calc-ab-ch-07',
      chapterTitle: 'Unit 7: Differential Equations',
      domainId: 'differential-equations',
      sectionId: 'ap-calc-ab-ch-07-section-03',
      sectionHeading: 'Differential Equations: transfer and synthesis',
      references: CALC_REFS,
    }),

    // Unit 8: Applications of Integration
    entry({
      id: 'ap-calc-ab-gloss-22',
      term: 'Average value of a function',
      definition:
        'The mean height of a continuous function f on [a, b], given by f_avg = [1 / (b - a)] * integral from a to b of f(x) dx, distinct from average rate of change [f(b) - f(a)] / (b - a).',
      aliases: ['Mean value for integrals'],
      chapterId: 'ap-calc-ab-ch-08',
      chapterTitle: 'Unit 8: Applications of Integration',
      domainId: 'applications-of-integration',
      sectionId: 'ap-calc-ab-ch-08-section-01',
      sectionHeading: 'Applications of Integration: foundations',
      references: CALC_REFS,
    }),
    entry({
      id: 'ap-calc-ab-gloss-23',
      term: 'Net change vs. total distance',
      definition:
        'Integrating velocity v(t) over [a, b] yields net displacement (final minus initial position), whereas integrating speed |v(t)| over [a, b] yields total distance traveled by counting all motion positively.',
      aliases: ['Displacement vs. total distance'],
      chapterId: 'ap-calc-ab-ch-08',
      chapterTitle: 'Unit 8: Applications of Integration',
      domainId: 'applications-of-integration',
      sectionId: 'ap-calc-ab-ch-08-section-02',
      sectionHeading: 'Applications of Integration: representation and reasoning',
      references: CALC_REFS,
    }),
    entry({
      id: 'ap-calc-ab-gloss-24',
      term: 'Washer method',
      definition:
        'Computes the volume of a solid of revolution with a hollow interior via integral of pi * (R(x)^2 - r(x)^2) dx perpendicular to the axis, subtracting squared radii rather than squaring (R - r).',
      aliases: ['Disk and washer volumes'],
      chapterId: 'ap-calc-ab-ch-08',
      chapterTitle: 'Unit 8: Applications of Integration',
      domainId: 'applications-of-integration',
      sectionId: 'ap-calc-ab-ch-08-section-03',
      sectionHeading: 'Applications of Integration: transfer and synthesis',
      references: CALC_REFS,
    }),
  ],

  ap_physics_1_foundation_pilot: [
    // Unit 1: Kinematics
    entry({
      id: 'ap-phys-1-gloss-01',
      term: 'Displacement vs. distance',
      definition:
        'Displacement delta-x = x_f - x_i is a vector from initial to final position, whereas distance is the nonnegative scalar path length; their magnitudes differ whenever an object reverses direction.',
      aliases: ['Position change'],
      chapterId: 'ap-physics-1-ch-01',
      chapterTitle: 'Unit 1: Kinematics',
      domainId: 'kinematics',
      sectionId: 'ap-physics-1-ch-01-section-01',
      sectionHeading: 'Motion as a model',
      references: PHYS_REFS,
    }),
    entry({
      id: 'ap-phys-1-gloss-02',
      term: 'Velocity-time graph area and slope',
      definition:
        'On a velocity-versus-time graph, the slope equals instantaneous acceleration a and the signed area between the curve and time axis equals displacement delta-x, even when acceleration is non-uniform.',
      aliases: ['v-t graph analysis'],
      chapterId: 'ap-physics-1-ch-01',
      chapterTitle: 'Unit 1: Kinematics',
      domainId: 'kinematics',
      sectionId: 'ap-physics-1-ch-01-section-02',
      sectionHeading: 'Graph and equation translation',
      references: PHYS_REFS,
    }),
    entry({
      id: 'ap-phys-1-gloss-03',
      term: 'Projectile motion independence',
      definition:
        'In ideal free fall with negligible air drag, horizontal velocity stays constant (a_x = 0) while vertical velocity accelerates at a_y = -g; the two perpendicular motions share only the time of flight t.',
      aliases: ['2D kinematics'],
      chapterId: 'ap-physics-1-ch-01',
      chapterTitle: 'Unit 1: Kinematics',
      domainId: 'kinematics',
      sectionId: 'ap-physics-1-ch-01-section-03',
      sectionHeading: 'Evidence and model limits',
      references: PHYS_REFS,
    }),

    // Unit 2: Force and Translational Dynamics
    entry({
      id: 'ap-phys-1-gloss-04',
      term: "Newton's Second Law",
      definition:
        "The acceleration of a system's center of mass equals the vector sum of external forces divided by total mass, a_sys = Sigma F_ext / m_sys, so zero net force implies constant velocity, not necessarily rest.",
      aliases: ['Translational dynamics'],
      chapterId: 'ap-physics-1-ch-02',
      chapterTitle: 'Unit 2: Force and Translational Dynamics',
      domainId: 'force-and-translational-dynamics',
      sectionId: 'ap-physics-1-ch-02-section-01',
      sectionHeading: 'Forces and interactions',
      references: PHYS_REFS,
    }),
    entry({
      id: 'ap-phys-1-gloss-05',
      term: 'Free-body diagram',
      definition:
        'A vector diagram representing every external force acting on a chosen system as arrows from its center of mass; internal forces, velocity, acceleration, and net force are omitted from the diagram.',
      aliases: ['FBD', 'Force diagram'],
      chapterId: 'ap-physics-1-ch-02',
      chapterTitle: 'Unit 2: Force and Translational Dynamics',
      domainId: 'force-and-translational-dynamics',
      sectionId: 'ap-physics-1-ch-02-section-02',
      sectionHeading: 'Systems and force diagrams',
      references: PHYS_REFS,
    }),
    entry({
      id: 'ap-phys-1-gloss-06',
      term: 'Centripetal acceleration',
      definition:
        "The center-directed acceleration a_c = v^2 / r required to turn an object's velocity along a circular path, provided by real forces such as tension, gravity, or friction rather than a separate force.",
      aliases: ['Radial acceleration'],
      chapterId: 'ap-physics-1-ch-02',
      chapterTitle: 'Unit 2: Force and Translational Dynamics',
      domainId: 'force-and-translational-dynamics',
      sectionId: 'ap-physics-1-ch-02-section-03',
      sectionHeading: 'Friction, drag, and circular evidence',
      references: PHYS_REFS,
    }),

    // Unit 3: Work, Energy, and Power
    entry({
      id: 'ap-phys-1-gloss-07',
      term: 'Work-energy theorem',
      definition:
        'External work W = F_parallel * d equals the change in total energy of a system (or change in kinetic energy delta-K for a single object); forces perpendicular to displacement do zero mechanical work.',
      aliases: ['Mechanical work'],
      chapterId: 'ap-physics-1-ch-03',
      chapterTitle: 'Unit 3: Work, Energy, and Power',
      domainId: 'work-energy-and-power',
      sectionId: 'ap-physics-1-ch-03-section-01',
      sectionHeading: 'Energy transfers',
      references: PHYS_REFS,
    }),
    entry({
      id: 'ap-phys-1-gloss-08',
      term: 'Conservation of mechanical energy',
      definition:
        'In a closed system with zero external work and no nonconservative dissipation such as friction, total mechanical energy K + U_g + U_s stays constant as energy transforms between kinetic and potential stores.',
      aliases: ['Mechanical energy'],
      chapterId: 'ap-physics-1-ch-03',
      chapterTitle: 'Unit 3: Work, Energy, and Power',
      domainId: 'work-energy-and-power',
      sectionId: 'ap-physics-1-ch-03-section-02',
      sectionHeading: 'Energy accounting routine',
      references: PHYS_REFS,
    }),
    entry({
      id: 'ap-phys-1-gloss-09',
      term: 'Power',
      definition:
        'The rate of doing work or transferring energy, P = delta-E / delta-t = F_parallel * v, measured in watts (J/s); two processes doing identical work deliver different power when their elapsed times differ.',
      aliases: ['Rate of energy transfer'],
      chapterId: 'ap-physics-1-ch-03',
      chapterTitle: 'Unit 3: Work, Energy, and Power',
      domainId: 'work-energy-and-power',
      sectionId: 'ap-physics-1-ch-03-section-03',
      sectionHeading: 'Power, efficiency, and model limits',
      references: PHYS_REFS,
    }),

    // Unit 4: Linear Momentum
    entry({
      id: 'ap-phys-1-gloss-10',
      term: 'Conservation of linear momentum',
      definition:
        'When net external impulse on a system is zero, total vector momentum Sigma p = Sigma m*v remains constant during any internal collision or explosion, even when mechanical energy is dissipated.',
      aliases: ['Isolated system momentum'],
      chapterId: 'ap-physics-1-ch-04',
      chapterTitle: 'Unit 4: Linear Momentum',
      domainId: 'linear-momentum',
      sectionId: 'ap-physics-1-ch-04-section-01',
      sectionHeading: 'Momentum and collisions',
      references: PHYS_REFS,
    }),
    entry({
      id: 'ap-phys-1-gloss-11',
      term: 'Impulse-momentum theorem',
      definition:
        'Impulse J = F_avg * delta-t, equal to the signed area under a force-versus-time graph, equals the change in linear momentum delta-p; increasing collision duration lowers average force for a given delta-p.',
      aliases: ['Impulse'],
      chapterId: 'ap-physics-1-ch-04',
      chapterTitle: 'Unit 4: Linear Momentum',
      domainId: 'linear-momentum',
      sectionId: 'ap-physics-1-ch-04-section-02',
      sectionHeading: 'Momentum and impulse representations',
      references: PHYS_REFS,
    }),
    entry({
      id: 'ap-phys-1-gloss-12',
      term: 'Elastic vs. inelastic collisions',
      definition:
        'Both isolated collision types conserve total momentum, but only elastic collisions conserve total kinetic energy; in a completely inelastic collision, objects stick together with maximal kinetic energy loss.',
      aliases: ['Collision classification'],
      chapterId: 'ap-physics-1-ch-04',
      chapterTitle: 'Unit 4: Linear Momentum',
      domainId: 'linear-momentum',
      sectionId: 'ap-physics-1-ch-04-section-03',
      sectionHeading: 'Collision evidence and system limits',
      references: PHYS_REFS,
    }),

    // Unit 5: Torque and Rotational Dynamics
    entry({
      id: 'ap-phys-1-gloss-13',
      term: 'Rotational inertia',
      definition:
        "The scalar quantity I = Sigma m_i * r_i^2 measuring an object's resistance to angular acceleration about an axis; placing mass farther from the axis increases I and reduces alpha for a fixed torque.",
      aliases: ['Moment of inertia'],
      chapterId: 'ap-physics-1-ch-05',
      chapterTitle: 'Unit 5: Torque and Rotational Dynamics',
      domainId: 'torque-and-rotational-dynamics',
      sectionId: 'ap-physics-1-ch-05-section-01',
      sectionHeading: 'Torque and rotation',
      references: PHYS_REFS,
    }),
    entry({
      id: 'ap-phys-1-gloss-14',
      term: 'Torque and lever arm',
      definition:
        "Torque tau = r * F * sin(theta) = r_perp * F quantifies a force's turning effect about a pivot, where r_perp is perpendicular distance to the line of action; equilibrium needs Sigma F = 0 and Sigma tau = 0.",
      aliases: ['Rotational equilibrium'],
      chapterId: 'ap-physics-1-ch-05',
      chapterTitle: 'Unit 5: Torque and Rotational Dynamics',
      domainId: 'torque-and-rotational-dynamics',
      sectionId: 'ap-physics-1-ch-05-section-02',
      sectionHeading: 'Torque and equilibrium diagrams',
      references: PHYS_REFS,
    }),
    entry({
      id: 'ap-phys-1-gloss-15',
      term: "Rotational Newton's Second Law",
      definition:
        'Angular acceleration about a fixed axis equals net external torque divided by rotational inertia, alpha = Sigma tau / I, connecting mass distribution directly to how rapidly angular velocity changes.',
      aliases: ['Angular acceleration law'],
      chapterId: 'ap-physics-1-ch-05',
      chapterTitle: 'Unit 5: Torque and Rotational Dynamics',
      domainId: 'torque-and-rotational-dynamics',
      sectionId: 'ap-physics-1-ch-05-section-03',
      sectionHeading: 'Rotational motion and mass distribution',
      references: PHYS_REFS,
    }),

    // Unit 6: Energy and Momentum of Rotating Systems
    entry({
      id: 'ap-phys-1-gloss-16',
      term: 'Rotational kinetic energy',
      definition:
        'The kinetic energy of a rigid body spinning about an axis, K_rot = (1/2) * I * omega^2; an object rolling down a ramp shares potential energy between translational (1/2)mv^2 and rotational kinetic energy.',
      aliases: ['Spin kinetic energy'],
      chapterId: 'ap-physics-1-ch-06',
      chapterTitle: 'Unit 6: Energy and Momentum of Rotating Systems',
      domainId: 'energy-and-momentum-of-rotating-systems',
      sectionId: 'ap-physics-1-ch-06-section-01',
      sectionHeading: 'Rotating systems',
      references: PHYS_REFS,
    }),
    entry({
      id: 'ap-phys-1-gloss-17',
      term: 'Rolling without slipping',
      definition:
        'Rolling motion where the contact point is momentarily at rest on the surface, linking center-of-mass and rotational kinematics via v_cm = R*omega and a_cm = R*alpha while static friction does zero work.',
      aliases: ['No-slip constraint'],
      chapterId: 'ap-physics-1-ch-06',
      chapterTitle: 'Unit 6: Energy and Momentum of Rotating Systems',
      domainId: 'energy-and-momentum-of-rotating-systems',
      sectionId: 'ap-physics-1-ch-06-section-02',
      sectionHeading: 'Rolling energy routine',
      references: PHYS_REFS,
    }),
    entry({
      id: 'ap-phys-1-gloss-18',
      term: 'Conservation of angular momentum',
      definition:
        'Angular impulse tau_avg * delta-t equals delta-L; when net external torque about an axis is zero, L = I*omega (or r_perp*m*v for a particle) stays constant, so pulling mass inward decreases I and raises omega.',
      aliases: ['Angular impulse'],
      chapterId: 'ap-physics-1-ch-06',
      chapterTitle: 'Unit 6: Energy and Momentum of Rotating Systems',
      domainId: 'energy-and-momentum-of-rotating-systems',
      sectionId: 'ap-physics-1-ch-06-section-03',
      sectionHeading: 'Angular impulse and conservation',
      references: PHYS_REFS,
    }),

    // Unit 7: Oscillations
    entry({
      id: 'ap-phys-1-gloss-19',
      term: 'Simple harmonic motion',
      definition:
        'Periodic oscillation driven by a linear restoring force proportional to and opposite displacement, F = -kx, giving acceleration a = -omega^2 * x that peaks at turning points and vanishes at equilibrium.',
      aliases: ['SHM'],
      chapterId: 'ap-physics-1-ch-07',
      chapterTitle: 'Unit 7: Oscillations',
      domainId: 'oscillations',
      sectionId: 'ap-physics-1-ch-07-section-01',
      sectionHeading: 'Oscillations',
      references: PHYS_REFS,
    }),
    entry({
      id: 'ap-phys-1-gloss-20',
      term: 'Period of mass-spring and pendulum',
      definition:
        'One cycle takes T_s = 2*pi*sqrt(m/k) for an ideal mass-spring and T_p = 2*pi*sqrt(L/g) for a small-angle simple pendulum; both are amplitude-independent, and pendulum period is independent of mass.',
      aliases: ['SHM period'],
      chapterId: 'ap-physics-1-ch-07',
      chapterTitle: 'Unit 7: Oscillations',
      domainId: 'oscillations',
      sectionId: 'ap-physics-1-ch-07-section-02',
      sectionHeading: 'Period, phase, and graph reading',
      references: PHYS_REFS,
    }),
    entry({
      id: 'ap-phys-1-gloss-21',
      term: 'SHM energy exchange',
      definition:
        'In undamped SHM, total mechanical energy E = (1/2)kA^2 stays constant, converting continuously between maximum potential energy at turning points (v = 0) and maximum kinetic energy at equilibrium (x = 0).',
      aliases: ['Oscillator mechanical energy'],
      chapterId: 'ap-physics-1-ch-07',
      chapterTitle: 'Unit 7: Oscillations',
      domainId: 'oscillations',
      sectionId: 'ap-physics-1-ch-07-section-03',
      sectionHeading: 'Energy, damping, and evidence',
      references: PHYS_REFS,
    }),

    // Unit 8: Fluids
    entry({
      id: 'ap-phys-1-gloss-22',
      term: 'Hydrostatic gauge pressure',
      definition:
        'In a static, incompressible fluid of uniform density rho, pressure increases with depth h as P = P_0 + rho*g*h, where rho*g*h is gauge pressure and depends only on depth, not container shape or fluid volume.',
      aliases: ['Fluid depth pressure'],
      chapterId: 'ap-physics-1-ch-08',
      chapterTitle: 'Unit 8: Fluids',
      domainId: 'fluids',
      sectionId: 'ap-physics-1-ch-08-section-01',
      sectionHeading: 'Fluids and conservation',
      references: PHYS_REFS,
    }),
    entry({
      id: 'ap-phys-1-gloss-23',
      term: 'Buoyant force',
      definition:
        "The upward force F_b = rho_fluid * V_sub * g exerted by a fluid on a submerged object, equal to the displaced fluid's weight; floating objects satisfy F_b = m*g, while sunk objects displace their own volume.",
      aliases: ["Archimedes' principle"],
      chapterId: 'ap-physics-1-ch-08',
      chapterTitle: 'Unit 8: Fluids',
      domainId: 'fluids',
      sectionId: 'ap-physics-1-ch-08-section-02',
      sectionHeading: 'Density, pressure, and buoyancy',
      references: PHYS_REFS,
    }),
    entry({
      id: 'ap-phys-1-gloss-24',
      term: "Continuity and Bernoulli's equation",
      definition:
        'For steady, incompressible, nonviscous flow, volume flow rate A_1*v_1 = A_2*v_2 and P + (1/2)rho*v^2 + rho*g*y stay constant along a streamline, so faster flow in a narrower pipe has lower pressure at equal height.',
      aliases: ["Bernoulli's principle", 'Volume flow rate'],
      chapterId: 'ap-physics-1-ch-08',
      chapterTitle: 'Unit 8: Fluids',
      domainId: 'fluids',
      sectionId: 'ap-physics-1-ch-08-section-03',
      sectionHeading: 'Flow, continuity, and assumptions',
      references: PHYS_REFS,
    }),
  ],
};
