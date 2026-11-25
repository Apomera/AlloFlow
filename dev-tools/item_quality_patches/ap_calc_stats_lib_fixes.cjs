'use strict';

// Confirmed mathematical, statistical, and formula-accuracy fixes for the
// AP Calculus AB and AP Statistics foundation pilot learning libraries.
// Every { find, replace } rule is verified to match uniquely (count === 1)
// in its target learning library JSON and at its exact pathHint.

module.exports = {
  ap_calculus_ab_foundation_pilot: [
    {
      pathHint: 'constructedResponseWorkshops[6].responsePlanning[3]',
      workshopId: 'ap-calc-ab-workshop-07',
      find: 'Contrast unbounded exponential growth (dy/dt = kP) with carrying-capacity-limited logistic behavior (inflection at half capacity).',
      replace:
        'Contrast unbounded exponential growth (dP/dt = kP) with carrying-capacity-limited logistic behavior (inflection at half capacity).',
      reason:
        'Variable mismatch in the exponential growth differential equation: dy/dt = kP mixes dependent variables y and P; for population P (used in selfCheck[2] as P and dP/dt), the equation must be dP/dt = kP.',
    },
    {
      pathHint: 'glossary[3].definition',
      glossaryId: 'ap-calc-ab-gloss-04',
      find: "The instantaneous rate of change f'(x) = lim(h->0) [f(x + h) - f(x)] / h, or equivalently lim(x->a) [f(x) - f(a)] / (x - a), giving the tangent-line slope whenever the finite limit exists.",
      replace:
        "The instantaneous rate of change f'(x) = lim(h->0) [f(x + h) - f(x)] / h, or at a point x = a, f'(a) = lim(x->a) [f(x) - f(a)] / (x - a), giving the tangent-line slope whenever the finite limit exists.",
      reason:
        "Variable/value mismatch: lim(x->a) [f(x) - f(a)] / (x - a) evaluates to f'(a) (a scalar at x = a with x as the bound limit variable), not the derivative function f'(x).",
    },
  ],
  ap_statistics_foundation_pilot: [
    {
      pathHint: 'misconceptionFamilies[2].remediationMove',
      misconceptionFamilyId: 'ap-stat-mf-correlation-linearity-outliers',
      find: 'Verify linearity from a scatter-free residual plot first, confine predictions to the observed x-range, and test how deleting an extreme x-value shifts both slope b₁ and correlation r.',
      replace:
        'Verify linearity from a pattern-free, randomly scattered residual plot first, confine predictions to the observed x-range, and test how deleting an extreme x-value shifts both slope b₁ and correlation r.',
      reason:
        'Inverted statistical criterion: a residual plot supports linearity when it shows random, pattern-free scatter around zero, not when it is "scatter-free" (which implies zero scatter / deterministic pattern).',
    },
    {
      pathHint: 'memoryAids[2].content',
      memoryAidId: 'ap-stats-ch-03-memory',
      find: 'np̂ ≥ 10 and n(1−p̂) ≥ 10 for intervals; np₀ ≥ 10 for 1-prop tests;',
      replace:
        'np̂ ≥ 10 and n(1−p̂) ≥ 10 for intervals; np₀ ≥ 10 and n(1−p₀) ≥ 10 for 1-prop tests;',
      reason:
        'Incomplete Large Counts condition: a one-proportion z-test requires both expected successes np₀ ≥ 10 and expected failures n(1−p₀) ≥ 10 (e.g., n = 20, p₀ = 0.90 satisfies np₀ = 18 ≥ 10 yet fails n(1−p₀) = 2 < 10).',
    },
    {
      pathHint: 'glossary[20].definition',
      glossaryId: 'ap-stats-gloss-21',
      find: 'it is sensitive to outliers and invariant under linear rescaling.',
      replace:
        'it is sensitive to outliers and invariant under positive linear rescaling (such as changing units).',
      reason:
        "False mathematical claim: Pearson's correlation r is invariant only under positive linear transformations (b > 0); negative linear rescaling (b < 0) negates r (r(-x, y) = -r(x, y)).",
    },
  ],
};
