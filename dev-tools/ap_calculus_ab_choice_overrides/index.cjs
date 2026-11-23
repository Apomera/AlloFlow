'use strict';

// AP Calculus AB foundation pilot: choice-length parity, prompt-length, and
// extreme-qualifier moderation overrides.
// Pinned items (009, 024, 025, 083, 105, 157) are intentionally untouched.

const AP_CALCULUS_AB_CHOICE_OVERRIDES = {
  'ap-calculus-ab-foundation-pilot-item-010': {
    answer: 'f takes value 3 somewhere between a and b.',
  },
  'ap-calculus-ab-foundation-pilot-item-014': {
    answer: 'Differentiability implies continuity at c',
  },
  'ap-calculus-ab-foundation-pilot-item-015': {
    prompt: 'Find the first derivative of the polynomial f(x) = 5x^4 - 3x^2 + 7.',
  },
  'ap-calculus-ab-foundation-pilot-item-019': {
    prompt: 'Use the product rule to differentiate f(x) = x^2 e^x.',
  },
  'ap-calculus-ab-foundation-pilot-item-021': {
    prompt: 'Use the chain rule to differentiate f(x) = (3x^2 + 1)^5.',
  },
  'ap-calculus-ab-foundation-pilot-item-022': {
    prompt: 'Use the chain rule to differentiate f(x) = sin(2x^3).',
  },
  'ap-calculus-ab-foundation-pilot-item-026': {
    prompt: 'Use the chain rule to differentiate f(x) = arctan(3x).',
  },
  'ap-calculus-ab-foundation-pilot-item-028': {
    answer: 'Quotient rule combined with chain rule',
    distractorReplacements: {
      'Only the power rule is needed for this':
        'The power rule alone suffices for this',
      'Only implicit differentiation is needed':
        'Implicit differentiation alone suffices',
      'The Fundamental Theorem of Calculus only':
        'The Fundamental Theorem of Calculus alone',
    },
  },
  'ap-calculus-ab-foundation-pilot-item-031': {
    answer: 'At 5 min, volume decreases at 2 liters/min.',
  },
  'ap-calculus-ab-foundation-pilot-item-043': {
    answer: 'Values at endpoints and interior critical numbers',
    distractorReplacements: {
      'Only the function values at the two endpoints of it':
        'Just the function values at the two interval endpoints',
      'Only the points where the derivative is equal to zero':
        'Just the interior points where the derivative equals zero',
      'Only the values taken by the second derivative there':
        'Just the values taken by the second derivative there',
    },
  },
  'ap-calculus-ab-foundation-pilot-item-044': {
    answer: 'A critical number need not be an extremum.',
  },
  'ap-calculus-ab-foundation-pilot-item-045': {
    answer: 'Local max at -2 and local min at 1',
  },
  'ap-calculus-ab-foundation-pilot-item-046': {
    answer: "f' shifts from negative to positive",
    distractorReplacements: {
      "f'(c)=0 only": "f'(c)=0 alone",
      "f''(c)=0 only": "f''(c)=0 alone",
    },
  },
  'ap-calculus-ab-foundation-pilot-item-061': {
    answer: 'Growth rate is 4% of current population per time unit.',
  },
  'ap-calculus-ab-foundation-pilot-item-063': {
    prompt: "Why does the family y = Ce^(2x) satisfy the differential equation y' = 2y?",
  },
  'ap-calculus-ab-foundation-pilot-item-064': {
    answer: 'No, because 2x != x^2 across the domain.',
  },
  'ap-calculus-ab-foundation-pilot-item-068': {
    prompt: 'Solve the initial-value problem dy/dx = 2y with y(0) = 3.',
  },
  'ap-calculus-ab-foundation-pilot-item-074': {
    answer: 'V0 + integral_0^T [I(t)-O(t)]dt',
  },
  'ap-calculus-ab-foundation-pilot-item-077': {
    answer: 'Integral_0^2 of x^2 dx',
  },
  'ap-calculus-ab-foundation-pilot-item-090': {
    answer: 'f continuous on [a,b] with k between f(a) and f(b).',
  },
  'ap-calculus-ab-foundation-pilot-item-093': {
    answer: 'f is not differentiable at x=c',
  },
  'ap-calculus-ab-foundation-pilot-item-096': {
    prompt: 'Find the first derivative of f(x) = 4/x^3 - 2x.',
  },
  'ap-calculus-ab-foundation-pilot-item-097': {
    prompt: 'Find the first derivative of f(x) = ln(2x) for x > 0.',
  },
  'ap-calculus-ab-foundation-pilot-item-101': {
    prompt: 'Use the chain rule to differentiate y = e^(sin x).',
  },
  'ap-calculus-ab-foundation-pilot-item-102': {
    prompt: 'Use the chain rule to differentiate f(x) = (1 + x^2)^(-1).',
  },
  'ap-calculus-ab-foundation-pilot-item-106': {
    prompt: 'Use the chain rule to differentiate f(x) = arcsin(2x).',
  },
  'ap-calculus-ab-foundation-pilot-item-107': {
    prompt: 'Find the first derivative of f(x) = ln((x^2 + 1)^3).',
  },
  'ap-calculus-ab-foundation-pilot-item-108': {
    answer: 'Product rule with a nested chain rule',
    distractorReplacements: {
      'Only the power rule is needed for it':
        'The power rule alone suffices for it',
      'Only the quotient rule is needed here':
        'The quotient rule alone suffices here',
      'Only implicit differentiation is needed':
        'Implicit differentiation alone suffices',
    },
  },
  'ap-calculus-ab-foundation-pilot-item-111': {
    answer: 'At hour 10, population rises at 12 people/hour.',
  },
  'ap-calculus-ab-foundation-pilot-item-114': {
    distractorReplacements: {
      't=2 only': 't=2 alone',
      't=3 only': 't=3 alone',
    },
  },
  'ap-calculus-ab-foundation-pilot-item-122': {
    answer: 'f is discontinuous on the closed interval.',
  },
  'ap-calculus-ab-foundation-pilot-item-123': {
    answer: 'x=-3, -sqrt(2), 0, sqrt(2), 3',
    distractorReplacements: {
      'x=-3, 0, and 3 only': 'Endpoints and x=0 alone',
      'x=-sqrt(2) and sqrt(2) only': 'x=-sqrt(2) and sqrt(2) alone',
      'x=-2, 0, and 2 only': 'x=-2, 0, and 2 alone',
    },
  },
  'ap-calculus-ab-foundation-pilot-item-124': {
    answer: 'It attains absolute max and min values on [a,b].',
  },
  'ap-calculus-ab-foundation-pilot-item-126': {
    answer: 'Local max at -1 and local min at 3.',
  },
  'ap-calculus-ab-foundation-pilot-item-127': {
    answer: 'Inflection point at c; shifts from concave up to concave down.',
  },
  'ap-calculus-ab-foundation-pilot-item-132': {
    answer: 'Net cost change moving from 0 to 100 items',
  },
  'ap-calculus-ab-foundation-pilot-item-138': {
    distractorReplacements: {
      '0, because symmetric limits always cancel each other':
        '0, because symmetric limits cancel each other out',
      'The integral from 0 to 3 of f(x)dx only':
        'The integral from 0 to 3 of f(x)dx alone',
    },
  },
  'ap-calculus-ab-foundation-pilot-item-141': {
    answer: 'Q decays instantaneously at 10% of its current amount per time unit.',
  },
  'ap-calculus-ab-foundation-pilot-item-144': {
    prompt: "Does the function y = e^x + 2 satisfy the differential equation y' = y - 2?",
  },
  'ap-calculus-ab-foundation-pilot-item-147': {
    prompt: 'Solve the separable initial-value problem dy/dx = x/y with y(0) = 2.',
  },
  'ap-calculus-ab-foundation-pilot-item-148': {
    prompt: 'Solve the separable initial-value problem dy/dx = -xy with y(0) = 5.',
  },
  'ap-calculus-ab-foundation-pilot-item-152': {
    answer: 'Some c in [a,b] has f(c) equal to f’s average value.',
  },
  'ap-calculus-ab-foundation-pilot-item-154': {
    answer: 'Split at velocity zeros and integrate |v(t)|.',
  },
};

function normalizeLookup(value) {
  return String(value || '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014\u2212]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

const shortRationales = {
  ...require('../ap_stem_short_rationales/ap_calculus_ab.cjs'),
  ...require('../ap_stem_short_rationales/wave2_bio_calc_chem.cjs').ap_calculus_ab_foundation_pilot,
};

function applyApCalcChoiceOverride(itemId, spec) {
  const override = AP_CALCULUS_AB_CHOICE_OVERRIDES[itemId];
  const enrichedRationale = shortRationales[itemId];
  if (!override && !enrichedRationale) return spec;
  const next = { ...spec };
  if (enrichedRationale) next.rationale = enrichedRationale;
  if (override && override.prompt) next.prompt = override.prompt;
  if (override && override.answer) next.answer = override.answer;
  if (override && override.distractorReplacements) {
    const normalizedMap = new Map(
      Object.entries(override.distractorReplacements).map(([k, v]) => [normalizeLookup(k), v])
    );
    const matched = new Set();
    next.distractors = spec.distractors.map((choice) => {
      const key = normalizeLookup(choice);
      if (normalizedMap.has(key)) {
        matched.add(key);
        return normalizedMap.get(key);
      }
      return choice;
    });
    if (matched.size !== normalizedMap.size) {
      const missing = [...normalizedMap.keys()].filter((k) => !matched.has(k));
      throw new Error('Unmatched AP Calculus AB distractor replacement(s) for ' + itemId + ': ' + missing.join(' | '));
    }
  }
  return next;
}

module.exports = {
  AP_CALCULUS_AB_CHOICE_OVERRIDES,
  applyApCalcChoiceOverride,
};
