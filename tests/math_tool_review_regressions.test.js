import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

function renderMarkup(file, id, state) {
  resetStemLab();
  loadTool(file, id);
  const root = document.createElement('div');
  root.innerHTML = renderTool(id, state || {});
  return root;
}

function makeAreaGrader(answer) {
  const source = fs.readFileSync('stem_lab/stem_tool_areamodel.js', 'utf8');
  const start = source.indexOf('var diagnoseAreaError = function');
  const end = source.indexOf('var askAITutor = function', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  const patches = [];
  const noop = () => {};
  // eslint-disable-next-line no-new-func
  const checkChallenge = new Function(
    'challenge', 'answer', 'streak', 'bestStreak', 'score',
    'basicSolved', 'distSolved', 'multiSolved', 'wordSolved', 'challengeTypesUsed', '_a',
    'upd', 'sfxCorrect', 'sfxWrong', 'sfxStreak', 'announceToSR',
    'awardXP', 'checkBadges',
    source.slice(start, end) + '\nreturn checkChallenge;'
  )(
    { a: 4, b: 6, answer: 24, mode: 'word' }, answer, 0, 0, { correct: 0, total: 0 },
    0, 0, 0, 0, { word: true }, {},
    (patch) => patches.push(patch), noop, noop, noop, noop, noop, noop,
  );
  checkChallenge();
  return patches.find((patch) => patch.feedback);
}

function functionGrapherState(range) {
  return {
    funcGrapher: {
      type: 'linear', a: 1, b: 0, c: 0,
      showDeriv: false, showArea: false, traceX: 0, showTable: false, showLearn: false,
      compare: false, compareType: 'linear', compareA: 1, compareB: 0, compareC: 0,
      aiExplain: '', aiExplainLoading: false, range,
    },
  };
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('Area Model challenge integrity', () => {
  it('conceals a word-challenge product and locks the matching story controls until an attempt', () => {
    const root = renderMarkup('stem_lab/stem_tool_areamodel.js', 'areamodel', {
      _areamodel: {
        viewMode: 'word', wordCtxIdx: 0, wordDims: { a: 4, b: 6 },
        challenge: { a: 4, b: 6, answer: 24, question: 'Four groups of six. How many?', mode: 'word' },
        answer: '', feedback: null,
      },
    });
    expect(root.textContent).toContain('4 groups of 6 = ?');
    expect(root.querySelector('.text-2xl.font-bold.text-emerald-900')).toBeNull();
    expect(root.querySelector('select[disabled]')).not.toBeNull();
    expect(root.querySelectorAll('input[type="range"][disabled]')).toHaveLength(2);
  });

  it('reveals the product after an attempt and grades exact integer values only', () => {
    const root = renderMarkup('stem_lab/stem_tool_areamodel.js', 'areamodel', {
      _areamodel: {
        viewMode: 'word', wordCtxIdx: 0, wordDims: { a: 4, b: 6 },
        challenge: { a: 4, b: 6, answer: 24, question: 'Four groups of six. How many?', mode: 'word' },
        answer: '24', feedback: { correct: true, msg: 'Correct' },
      },
    });
    expect(root.querySelector('.text-2xl.font-bold.text-emerald-900')?.textContent).toBe('24');
    expect(makeAreaGrader('24').feedback.correct).toBe(true);
    expect(makeAreaGrader('24.0').feedback.correct).toBe(true);
    expect(makeAreaGrader('24.9').feedback.correct).toBe(false);
  });

  it('does not advertise unreachable fraction challenge state or badges', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_areamodel.js', 'utf8');
    expect(source).not.toContain('fracPro');
    expect(source).not.toContain('fracSolved');
    expect(source).not.toContain('fracNums');
  });
});

describe('Fraction Wall length semantics and access', () => {
  it('fills all unit pieces from the left and exposes every endpoint as a native button', () => {
    const root = renderMarkup('stem_lab/stem_tool_fractions.js', 'fractionViz', {
      _fractions: { tab: 'wall', wallHighlight: { n: 1, d: 2 } },
    });
    const quarterSegments = [...root.querySelectorAll('[data-unit-fraction="1/4"]')];
    expect(quarterSegments).toHaveLength(4);
    expect(quarterSegments.map((segment) => segment.textContent)).toEqual(['1/4', '1/4', '1/4', '1/4']);
    expect(quarterSegments.map((segment) => segment.dataset.highlightedLength)).toEqual(['true', 'true', 'false', 'false']);
    expect(root.querySelector('[data-fraction="2/4"]')?.getAttribute('aria-pressed')).toBe('true');
    expect(root.querySelector('[data-fraction="1/4"]')?.tagName).toBe('BUTTON');
  });

  it('announces a completed comparison and pauses new choices until its timed reset', () => {
    const root = renderMarkup('stem_lab/stem_tool_fractions.js', 'fractionViz', {
      _fractions: {
        tab: 'wall', wallHighlight: { n: 1, d: 2 },
        wallCompareA: { n: 1, d: 2 }, wallCompareB: { n: 2, d: 4 },
      },
    });
    expect(root.querySelector('[role="status"]')?.textContent).toContain('1/2 is equivalent to 2/4');
    expect(root.querySelectorAll('[data-fraction-wall-segment]:disabled')).toHaveLength(51);
    expect(root.querySelectorAll('[data-fraction-wall-preset]:disabled')).toHaveLength(8);
  });
});

describe('Viewport validation and trace parity', () => {
  it('preserves zero-valued Function Grapher bounds and repairs degenerate persisted ranges', () => {
    const zeroBound = renderMarkup('stem_lab/stem_tool_funcgrapher.js', 'funcGrapher', functionGrapherState({ xMin: 0, xMax: 10, yMin: -5, yMax: 5 }));
    expect(zeroBound.textContent).toContain('x:[0,10]');

    const invalid = renderMarkup('stem_lab/stem_tool_funcgrapher.js', 'funcGrapher', functionGrapherState({ xMin: 4, xMax: 4, yMin: 2, yMax: 2 }));
    expect(invalid.textContent).toContain('x:[-10,10] y:[-10,10]');
  });

  it('normalizes invalid Graphing Calculator windows and provides a keyboard-operable trace range', () => {
    const root = renderMarkup('stem_lab/stem_tool_graphcalc.js', 'graphCalc', {
      graphCalc: {
        showWindow: true, traceMode: true, traceX: 99,
        window: { xmin: 5, xmax: 5, ymin: 10, ymax: -10 },
      },
    });
    expect(root.querySelector('[aria-label="Graph window xmin"]')?.value).toBe('-10');
    expect(root.querySelector('[aria-label="Graph window xmax"]')?.value).toBe('10');
    const trace = root.querySelector('#graphcalc-trace-x');
    expect(trace).not.toBeNull();
    expect(trace?.value).toBe('10');
    expect(trace?.getAttribute('aria-valuetext')).toContain('Trace x = 10');

    const source = fs.readFileSync('stem_lab/stem_tool_graphcalc.js', 'utf8');
    expect(source).toContain('onPointerDown: function(e)');
    expect(source).toContain('onPointerMove: function(e)');
    expect(source).not.toContain('onMouseMove: function(e) { if (!d.traceMode)');
  });

  it('normalizes invalid Number Line state rather than drawing a contradictory one-unit range', () => {
    const root = renderMarkup('stem_lab/stem_tool_numberline.js', 'numberline', {
      _numberline: { tab: 'explore', range: { min: 7, max: 7 } },
    });
    expect(root.querySelector('[aria-label="Minimum value"]')?.value).toBe('0');
    expect(root.querySelector('[aria-label="Maximum value"]')?.value).toBe('20');
  });
});

describe('Calculus visualization input parity', () => {
  const views = [
    ['zoom', '#calc-viz-zoom'],
    ['tangent', '#calc-viz-tangent-x'],
    ['motion', '#calc-viz-motion-time'],
    ['ftc', '#calc-viz-ftc-x'],
    ['slope', '#calc-viz-slope-x'],
    ['optim', '#calc-viz-optim-x'],
  ];

  for (const [view, selector] of views) {
    it(view + ' exposes an explicit keyboard-operable control', () => {
      const root = renderMarkup('stem_lab/stem_tool_calculus.js', 'calculus', {
        calculus: { tab: 'visualize', vizView: view },
      });
      expect(root.querySelector(selector)?.getAttribute('type')).toBe('range');
    });
  }

  it('uses pointer events for direct manipulation and no longer promises nonexistent drag controls', () => {
    const source = fs.readFileSync('stem_lab/stem_tool_calculus.js', 'utf8');
    expect(source).toContain("cv.addEventListener('pointerdown', onPointerDown)");
    expect(source).toContain("cv.addEventListener('pointermove', onPointerMove)");
    expect(source).not.toContain('Drag the zoom slider');
    expect(source).not.toContain('Drag the position curve');
  });
});

describe('reviewed deployment mirrors', () => {
  for (const name of [
    'areamodel', 'fractions', 'funcgrapher', 'graphcalc', 'numberline', 'calculus',
    'manipulatives', 'multtable', 'unitconvert', 'inequality', 'algebracas',
  ]) {
    it(name + ' source and public copies are byte-identical', () => {
      expect(fs.readFileSync(`desktop/web-app/public/stem_lab/stem_tool_${name}.js`, 'utf8'))
        .toBe(fs.readFileSync(`stem_lab/stem_tool_${name}.js`, 'utf8'));
    });
  }
});
