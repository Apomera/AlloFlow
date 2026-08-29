import { beforeAll, describe, expect, it } from 'vitest';
import { loadAlloModule } from './setup.js';

let grader;

beforeAll(() => {
  loadAlloModule('math_manipulative_grader_module.js');
  grader = window.AlloModules.MathManipulativeGrader;
  if (!grader) throw new Error('MathManipulativeGrader failed to register');
});

const grade = (tool, actual, target) => grader.gradeManipulativeResponse(tool, actual, target);
const evaluate = (tool, actual, target) => grader.evaluateManipulativeResponse(tool, actual, target);

const deepFreeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
};

describe('MathManipulativeGrader supported tools', () => {
  it('publishes every tool handled by MathView', () => {
    expect([...grader.supportedTools].sort()).toEqual([
      'base10', 'calculus', 'cell', 'chemBalance', 'circuit', 'coordinate',
      'dataPlot', 'fractions', 'funcGrapher', 'inequality', 'molecule',
      'numberline', 'physics', 'protractor', 'punnett', 'volume', 'wave'
    ]);
  });

  it('returns a diagnostic result for unsupported tools', () => {
    expect(grader.evaluateManipulativeResponse('unknown', {}, {})).toEqual({
      correct: false,
      supported: false,
      reason: 'unsupported-tool',
      tool: 'unknown'
    });
  });

  it('does not mistake Object prototype property names for supported tools', () => {
    for (const tool of ['constructor', 'toString', '__proto__']) {
      expect(evaluate(tool, {}, {}), tool).toEqual({
        correct: false,
        supported: false,
        reason: 'unsupported-tool',
        tool
      });
    }
  });

  it('adapts the current MathView state bundle without an inline grading switch', () => {
    const state = {
      gridPoints: [{ x: 0, y: 2 }],
      labToolData: {
        calculus: { mode: 'riemann', func: 'x^2', a: 1, b: 0, c: 0, xMin: 0, xMax: 4, n: 8 }
      }
    };
    expect(grader.gradeMathViewManipulativeResponse({
      tool: 'coordinate', state: { points: [{ x: 0, y: 2 }] }
    }, state)).toBe(true);
    expect(grader.gradeMathViewManipulativeResponse({
      tool: 'calculus', state: { mode: 'riemann', func: 'x^2', a: 1, b: 0, c: 0, xMin: 0, xMax: 4, n: 8 }
    }, state)).toBe(true);
    expect(grader.gradeMathViewManipulativeResponse(null, state)).toBe(false);
  });

  it('prefers the live circuit and cell state keys used by the current tools', () => {
    expect(grader.gradeMathViewManipulativeResponse({
      tool: 'circuit',
      state: { voltage: 9, mode: 'series', components: [{ type: 'resistor', value: 100 }] }
    }, {
      labToolData: {
        circuit: { voltage: 9, components: [] },
        _circuit: { components: [{ type: 'resistor', value: 100 }] }
      }
    })).toBe(true);

    expect(grade('cell', {
      selectedOrganelle: null,
      type: 'animal',
      interiorSel: 'chloroplast',
      interiorCellType: 'plant'
    }, { selectedOrganelle: 'chloroplast', type: 'plant' })).toBe(true);
  });
});

describe('MathManipulativeGrader core manipulatives', () => {
  it('grades coordinate points as an unordered set', () => {
    expect(grade('coordinate', [{ x: 2, y: 3 }, { x: -1, y: 0 }], {
      points: [{ x: -1, y: 0 }, { x: 2, y: 3 }]
    })).toBe(true);
  });

  it('preserves duplicate point multiplicity instead of treating collections as mathematical sets', () => {
    expect(grade('coordinate', [{ x: 1, y: 1 }, { x: 1, y: 1 }], {
      points: [{ x: 1, y: 1 }, { x: 2, y: 2 }]
    })).toBe(false);
    expect(grade('dataPlot', { points: [{ x: 1, y: 1 }, { x: 1, y: 1 }] }, {
      points: [{ x: 1, y: 1 }, { x: 2, y: 2 }]
    })).toBe(false);
  });

  it('preserves explicit zero values for base-ten blocks', () => {
    expect(grade('base10', { hundreds: 0, tens: 0, ones: 0 }, {
      hundreds: 0, tens: 0, ones: 0
    })).toBe(true);
  });

  it('grades number-line markers with tolerance and without relying on order', () => {
    expect(grade('numberline', [{ value: 4.005 }, { value: -2 }], {
      markers: [{ value: -2.004 }, { value: 4 }]
    })).toBe(true);
  });

  it('grades fraction numerator and denominator', () => {
    expect(grade('fractions', { numerator: 0, denominator: 8 }, {
      numerator: 0, denominator: 8
    })).toBe(true);
    expect(grade('fractions', { numerator: 1, denominator: 2 }, {
      numerator: 2, denominator: 4
    })).toBe(false);
  });

  it('preserves explicit zero dimensions instead of replacing them with defaults', () => {
    expect(grade('volume', { l: 0, w: 2, h: 3 }, { dims: { l: 0, w: 2, h: 3 } })).toBe(true);
  });

  it('preserves a zero-degree protractor target', () => {
    expect(grade('protractor', 0, { angle: 0 })).toBe(true);
    expect(grade('protractor', 3, { angle: 0 })).toBe(false);
  });
});

describe('MathManipulativeGrader lab-tool states', () => {
  it('grades function type and coefficients without requiring the tool\'s stale descriptive equation field', () => {
    expect(grade('funcGrapher', { type: 'QUADRATIC', a: 0, b: 0, c: 0 }, {
      type: 'quadratic', a: 0, b: 0, c: 0, eq: 'x^2'
    })).toBe(true);
  });

  it('preserves zero physics targets and checks optional gravity', () => {
    expect(grade('physics', { angle: 0, velocity: 0, gravity: 0 }, {
      angle: 0, velocity: 0, gravity: 0
    })).toBe(true);
  });

  it('requires a non-empty exact chemistry coefficient vector', () => {
    expect(grade('chemBalance', { coefficients: [2, 1, 2] }, { coefficients: [2, 1, 2] })).toBe(true);
    expect(grade('chemBalance', { coefficients: [] }, { coefficients: [] })).toBe(false);
  });

  it('grades each Punnett parent without mutating either allele array', () => {
    const actual = { parent1: ['a', 'A'], parent2: ['b', 'B'] };
    const target = { parent1: ['A', 'a'], parent2: ['B', 'b'] };
    const before = JSON.stringify({ actual, target });
    expect(grade('punnett', actual, target)).toBe(true);
    expect(JSON.stringify({ actual, target })).toBe(before);
  });

  it('grades circuit voltage, topology, and target-supplied component fields', () => {
    const actual = {
      voltage: 0,
      mode: 'series',
      components: [
        { id: 91, type: 'switch', value: 0, closed: false, runtimeOnly: true },
        { id: 90, type: 'resistor', value: 100 }
      ]
    };
    const target = {
      voltage: 0,
      mode: 'series',
      components: [
        { id: 1, type: 'resistor', value: 100 },
        { id: 2, type: 'switch', value: 0, closed: false }
      ]
    };
    expect(grade('circuit', actual, target)).toBe(true);
    expect(grade('circuit', { ...actual, components: [{ type: 'resistor', value: 220 }] }, target)).toBe(false);
  });

  it('matches mixed generic and specific circuit components independent of order', () => {
    expect(grade('circuit', {
      voltage: 9,
      components: [{ type: 'resistor', value: 200 }, { type: 'resistor', value: 100 }]
    }, {
      voltage: 9,
      components: [{ type: 'resistor' }, { type: 'resistor', value: 200 }]
    })).toBe(true);
  });

  it('finds a complete circuit-component matching when an early match must be reassigned', () => {
    expect(grade('circuit', {
      voltage: 9,
      components: [
        { type: 'resistor', value: 100, closed: false },
        { type: 'resistor', value: 100 }
      ]
    }, {
      voltage: 9,
      components: [
        { type: 'resistor', value: 100 },
        { type: 'resistor', closed: false }
      ]
    })).toBe(true);
  });

  it('grades plotted points using the existing nearest-integer contract', () => {
    expect(grade('dataPlot', { points: [{ x: 1.4, y: 2.4 }] }, {
      points: [{ x: 1.1, y: 2.1 }]
    })).toBe(true);
  });

  it('normalizes inequality whitespace', () => {
    expect(grade('inequality', { expr: 'x  >  3' }, { expr: 'x>3' })).toBe(true);
  });

  it('normalizes harmless molecule formatting while preserving element-symbol case', () => {
    expect(grade('molecule', { formula: 'H 2 O' }, { formula: 'H2O' })).toBe(true);
    expect(grade('molecule', { formula: 'H₂O' }, { formula: 'H2O' })).toBe(true);
    expect(grade('molecule', { formula: 'CO' }, { formula: 'Co' })).toBe(false);
    expect(grade('molecule', { formula: 'H2O' }, { formula: 'h2o' })).toBe(false);
  });

  it('grades calculus mode, bounds, subdivisions, function, and supplied coefficients', () => {
    const target = {
      mode: 'riemann', func: 'x ^ 2', a: 0, b: 0, c: 0,
      xMin: 0, xMax: 0, n: 2, showDerivative: false
    };
    const actual = {
      mode: 'riemann', a: 0, b: 0, c: 0,
      xMin: 0, xMax: 0, n: 2, showDerivative: false
    };
    expect(grade('calculus', actual, target)).toBe(true);
    expect(grade('calculus', { ...actual, a: 1 }, target)).toBe(false);
  });

  it('grades optional wave parameters when the target supplies them', () => {
    const target = {
      amplitude: 0, frequency: 0, wavelength: 0, phase: 0,
      wave2: false, amp2: 0, freq2: 0
    };
    expect(grade('wave', { ...target }, target)).toBe(true);
    expect(grade('wave', { ...target, phase: 1 }, target)).toBe(false);
  });

  it('uses the modern second-wave state aliases when present', () => {
    expect(grade('wave', {
      amplitude: 1, frequency: 1, wavelength: 2, phase: 0,
      wave2: false, amp2: 0.5, freq2: 1.5,
      showSecond: true, amplitude2: 2, frequency2: 3
    }, {
      amplitude: 1, frequency: 1, wavelength: 2, phase: 0,
      wave2: true, amp2: 2, freq2: 3
    })).toBe(true);
  });

  it('requires an explicit cell organelle target', () => {
    expect(grade('cell', { selectedOrganelle: 'nucleus' }, { selectedOrganelle: 'nucleus' })).toBe(true);
    expect(grade('cell', { selectedOrganelle: null }, {})).toBe(false);
  });
});

describe('MathManipulativeGrader defensive behavior', () => {
  it('publishes bounded validation limits for restored or generated state', () => {
    expect(grader.limits).toEqual({
      maxCollectionItems: 256,
      maxTextLength: 500,
      maxFractionDenominator: 20
    });
  });

  it('fails safely for missing student and target state across all supported tools', () => {
    for (const tool of grader.supportedTools) {
      expect(() => grade(tool, null, null)).not.toThrow();
      expect(grade(tool, null, null), tool).toBe(false);
    }
  });

  it('fails safely for malformed nested collections', () => {
    expect(grade('coordinate', [{ x: null, y: 1 }], { points: [{ x: 0, y: 1 }] })).toBe(false);
    expect(grade('numberline', [{ value: '4' }], { markers: [{ value: 4 }] })).toBe(false);
    expect(grade('dataPlot', { points: [null] }, { points: [{ x: 1, y: 2 }] })).toBe(false);
    expect(grade('circuit', { voltage: 9, components: null }, { voltage: 9, components: [] })).toBe(false);
  });

  it('distinguishes invalid targets, invalid student state, and valid mismatches', () => {
    expect(evaluate('base10', { hundreds: 0, tens: 0, ones: 0 }, {})).toMatchObject({
      correct: false, supported: true, reason: 'invalid-target'
    });
    expect(evaluate('base10', { hundreds: '1', tens: 0, ones: 0 }, { hundreds: 1 })).toMatchObject({
      correct: false, supported: true, reason: 'invalid-actual'
    });
    expect(evaluate('base10', { hundreds: 2, tens: 0, ones: 0 }, { hundreds: 1 })).toMatchObject({
      correct: false, supported: true, reason: 'mismatch'
    });
  });

  it('rejects empty or non-meaningful answer targets instead of matching defaults', () => {
    for (const tool of grader.supportedTools) {
      expect(evaluate(tool, {}, {}).reason, tool).toBe('invalid-target');
    }
    expect(evaluate('coordinate', [], { points: [] }).reason).toBe('invalid-target');
    expect(evaluate('numberline', [], { markers: [] }).reason).toBe('invalid-target');
    expect(evaluate('chemBalance', { coefficients: [] }, { coefficients: [] }).reason).toBe('invalid-target');
    expect(evaluate('dataPlot', { points: [] }, { points: [] }).reason).toBe('invalid-target');
    expect(evaluate('cell', { selectedOrganelle: null }, { selectedOrganelle: null }).reason).toBe('invalid-target');
  });

  it('keeps documented legacy defaults for meaningful partial numeric targets', () => {
    expect(grade('base10', { hundreds: 2, tens: 0, ones: 0 }, { hundreds: 2 })).toBe(true);
    expect(grade('physics', { angle: 0, velocity: 20 }, { angle: 0 })).toBe(true);
    expect(grade('circuit', {}, { components: [] })).toBe(true);
    expect(grade('calculus', {
      mode: 'riemann', xMin: 0, xMax: 4, n: 8, a: 0
    }, { a: 0 })).toBe(true);
  });

  it('rejects numeric strings, NaN, and infinities rather than coercing them', () => {
    const invalidActualCases = [
      ['coordinate', [{ x: '1', y: 2 }], { points: [{ x: 1, y: 2 }] }],
      ['base10', { hundreds: '1', tens: 0, ones: 0 }, { hundreds: 1 }],
      ['numberline', [{ value: '1' }], { markers: [{ value: 1 }] }],
      ['fractions', { numerator: 1, denominator: '2' }, { numerator: 1, denominator: 2 }],
      ['volume', { l: 1, w: 2, h: '3' }, { dims: { l: 1, w: 2, h: 3 } }],
      ['protractor', '0', { angle: 0 }],
      ['funcGrapher', { type: 'linear', a: '1', b: 0, c: 0 }, { type: 'linear', a: 1 }],
      ['physics', { angle: 45, velocity: Infinity }, { velocity: 20 }],
      ['chemBalance', { coefficients: [2, '1', 2] }, { coefficients: [2, 1, 2] }],
      ['circuit', { voltage: '9' }, { voltage: 9 }],
      ['dataPlot', { points: [{ x: NaN, y: 1 }] }, { points: [{ x: 0, y: 1 }] }],
      ['calculus', { mode: 'riemann', xMin: 0, xMax: 4, n: '8' }, { n: 8 }],
      ['wave', { amplitude: Infinity, frequency: 1 }, { amplitude: 1 }]
    ];
    for (const [tool, actual, target] of invalidActualCases) {
      expect(evaluate(tool, actual, target).reason, tool).toBe('invalid-actual');
    }

    const invalidTargetCases = [
      ['coordinate', [{ x: 1, y: 2 }], { points: [{ x: Infinity, y: 2 }] }],
      ['base10', { hundreds: 1, tens: 0, ones: 0 }, { hundreds: '1' }],
      ['numberline', [{ value: 1 }], { markers: [{ value: NaN }] }],
      ['fractions', { numerator: 1, denominator: 2 }, { denominator: Infinity }],
      ['volume', { l: 1, w: 2, h: 3 }, { dims: { h: '3' } }],
      ['protractor', 0, { angle: NaN }],
      ['funcGrapher', { type: 'linear', a: 1, b: 0, c: 0 }, { a: Infinity }],
      ['physics', { angle: 45, velocity: 20 }, { velocity: '20' }],
      ['chemBalance', { coefficients: [2, 1, 2] }, { coefficients: [2, Infinity, 2] }],
      ['circuit', { voltage: 9 }, { components: [{ type: 'resistor', value: Infinity }] }],
      ['dataPlot', { points: [{ x: 1, y: 1 }] }, { points: [{ x: 1, y: NaN }] }],
      ['calculus', { mode: 'riemann', xMin: 0, xMax: 4, n: 8 }, { n: Infinity }],
      ['wave', { amplitude: 1, frequency: 1 }, { frequency: '1' }]
    ];
    for (const [tool, actual, target] of invalidTargetCases) {
      expect(evaluate(tool, actual, target).reason, tool).toBe('invalid-target');
    }
  });

  it('rejects sparse arrays and tolerates irrelevant cyclic references', () => {
    const sparseActual = new Array(1);
    const sparseTarget = new Array(1);
    expect(evaluate('coordinate', sparseActual, { points: [{ x: 1, y: 1 }] }).reason).toBe('invalid-actual');
    expect(evaluate('coordinate', [{ x: 1, y: 1 }], { points: sparseTarget }).reason).toBe('invalid-target');

    const point = { x: 1, y: 1 };
    const actual = [point];
    const target = { points: [{ x: 1, y: 1 }] };
    point.owner = actual;
    actual.self = actual;
    target.self = target;
    expect(() => grade('coordinate', actual, target)).not.toThrow();
    expect(grade('coordinate', actual, target)).toBe(true);
  });

  it('rejects oversized collections before sorting or pairwise comparison', () => {
    const points = Array.from({ length: grader.limits.maxCollectionItems + 1 }, (_, index) => ({
      x: index,
      y: index
    }));
    expect(evaluate('coordinate', [], { points }).reason).toBe('invalid-target');
    expect(evaluate('coordinate', points, { points: [{ x: 0, y: 0 }] }).reason).toBe('invalid-actual');
    expect(evaluate('numberline', [], {
      markers: points.map(point => ({ value: point.x }))
    }).reason).toBe('invalid-target');
    expect(evaluate('dataPlot', { points }, {
      points: [{ x: 0, y: 0 }]
    }).reason).toBe('invalid-actual');
  });

  it('does not trust array-owned map methods while grading number-line markers', () => {
    const actual = [{ value: 999 }];
    const targetMarkers = [{ value: 999 }];
    Object.defineProperty(actual, 'map', { value: () => [1] });
    Object.defineProperty(targetMarkers, 'map', { value: () => [1] });

    expect(grade('numberline', actual, { markers: [{ value: 1 }] })).toBe(false);
    expect(grade('numberline', [{ value: 1 }], { markers: targetMarkers })).toBe(false);
  });

  it('rejects proxied arrays with impossible negative or NaN lengths', () => {
    const negativeLength = new Proxy([{ x: 1, y: 1 }], {
      get(target, key, receiver) {
        return key === 'length' ? -1 : Reflect.get(target, key, receiver);
      }
    });
    const nanLength = new Proxy([{ x: 1, y: 1 }], {
      get(target, key, receiver) {
        return key === 'length' ? NaN : Reflect.get(target, key, receiver);
      }
    });

    expect(evaluate('coordinate', negativeLength, { points: [{ x: 1, y: 1 }] }).reason).toBe('invalid-actual');
    expect(evaluate('coordinate', [{ x: 1, y: 1 }], { points: nanLength }).reason).toBe('invalid-target');
  });

  it('accepts only learner-reachable calculus subdivision counts', () => {
    const state = (n, mode = 'riemann') => ({ mode, xMin: 0, xMax: 4, n });

    expect(grade('calculus', state(2), { n: 2 })).toBe(true);
    expect(grade('calculus', state(50), { n: 50 })).toBe(true);
    expect(evaluate('calculus', state(1), { n: 2 }).reason).toBe('invalid-actual');
    expect(evaluate('calculus', state(51), { n: 51 }).reason).toBe('invalid-target');
    expect(evaluate('calculus', state(2.5), { n: 2 }).reason).toBe('invalid-actual');
    expect(evaluate('calculus', state(3, 'simpson'), state(3, 'simpson')).reason).toBe('invalid-target');
    expect(evaluate('calculus', state(3, 'simpson'), state(4, 'simpson')).reason).toBe('invalid-actual');
    expect(grade('calculus', state(4, 'simpson'), state(4, 'simpson'))).toBe(true);
  });

  it('rejects fraction targets learners cannot create with the lab controls', () => {
    expect(evaluate('fractions', { numerator: 1, denominator: 2 }, {
      numerator: 1
    }).reason).toBe('invalid-target');
    expect(evaluate('fractions', { numerator: 1, denominator: 2 }, {
      numerator: 1, denominator: 1
    }).reason).toBe('invalid-target');
    expect(evaluate('fractions', { numerator: 1, denominator: 2 }, {
      numerator: 1, denominator: 21
    }).reason).toBe('invalid-target');
    expect(evaluate('fractions', { numerator: 1, denominator: 2 }, {
      numerator: 3, denominator: 2
    }).reason).toBe('invalid-target');
    expect(evaluate('fractions', { numerator: 3, denominator: 2 }, {
      numerator: 1, denominator: 2
    }).reason).toBe('invalid-actual');
  });

  it('rejects overlong semantic strings instead of normalizing unbounded input', () => {
    const overlong = 'x'.repeat(grader.limits.maxTextLength + 1);
    expect(evaluate('inequality', { expr: 'x>1' }, { expr: overlong }).reason).toBe('invalid-target');
    expect(evaluate('molecule', { formula: overlong }, { formula: 'H2O' }).reason).toBe('invalid-actual');
    expect(evaluate('circuit', { voltage: 9 }, { mode: overlong }).reason).toBe('invalid-target');
  });

  it('contains throwing adapter state and reports an invalid-state diagnostic', () => {
    const responseWithThrowingTool = {};
    Object.defineProperty(responseWithThrowingTool, 'tool', { get() { throw new Error('bad tool getter'); } });
    expect(grader.evaluateMathViewManipulativeResponse(responseWithThrowingTool, {})).toEqual({
      correct: false, supported: false, reason: 'invalid-state', tool: null
    });

    const stateWithThrowingLabData = {};
    Object.defineProperty(stateWithThrowingLabData, 'labToolData', { get() { throw new Error('bad state getter'); } });
    expect(grader.evaluateMathViewManipulativeResponse({ tool: 'wave', state: { amplitude: 1 } }, stateWithThrowingLabData)).toEqual({
      correct: false, supported: true, reason: 'invalid-state', tool: 'wave'
    });
  });

  it('can grade deeply frozen states, proving comparisons do not sort or mutate inputs', () => {
    const cases = deepFreeze([
      ['coordinate', [{ x: 2, y: 1 }, { x: 0, y: 0 }], { points: [{ x: 0, y: 0 }, { x: 2, y: 1 }] }],
      ['numberline', [{ value: 2 }, { value: 1 }], { markers: [{ value: 1 }, { value: 2 }] }],
      ['punnett', { parent1: ['a', 'A'], parent2: ['B', 'b'] }, { parent1: ['A', 'a'], parent2: ['b', 'B'] }],
      ['circuit', { voltage: 9, components: [{ type: 'led', value: 40 }, { type: 'resistor', value: 100 }] }, { voltage: 9, components: [{ type: 'resistor', value: 100 }, { type: 'led', value: 40 }] }],
      ['dataPlot', { points: [{ x: 3, y: 4 }, { x: 1, y: 2 }] }, { points: [{ x: 1, y: 2 }, { x: 3, y: 4 }] }]
    ]);
    for (const [tool, actual, target] of cases) expect(grade(tool, actual, target), tool).toBe(true);
  });
});
