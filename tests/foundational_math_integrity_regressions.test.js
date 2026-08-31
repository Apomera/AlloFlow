import fs from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  React,
  ReactDOMClient,
  loadTool,
  makeCtx,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const MULT_FILE = 'stem_lab/stem_tool_multtable.js';
const AREA_FILE = 'stem_lab/stem_tool_areamodel.js';
const COORD_FILE = 'stem_lab/stem_tool_coordgrid.js';
const ANGLE_FILE = 'stem_lab/stem_tool_angles.js';

function multiplicationHelpers() {
  const src = fs.readFileSync(MULT_FILE, 'utf8');
  const start = src.indexOf('function tkey(a, b)');
  const end = src.indexOf('var MEMORY_TRICKS =', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  // eslint-disable-next-line no-new-func
  return new Function(src.slice(start, end) + '\nreturn { parseWholeAnswer, missedFactMode, missedFactDivisor, missedFactIdentity, formatMissedFact };')();
}

beforeEach(() => {
  resetStemLab();
  document.body.innerHTML = '<div id="root"></div>';
});

describe('Multiplication Table answer and missed-fact integrity', () => {
  it('rejects truncated decimals and preserves division equations and identities', () => {
    const helpers = multiplicationHelpers();
    expect(helpers.parseWholeAnswer('56')).toBe(56);
    expect(helpers.parseWholeAnswer('56.0')).toBe(56);
    expect(helpers.parseWholeAnswer('56.9')).toBeNull();
    expect(helpers.parseWholeAnswer('')).toBeNull();

    const bySeven = { a: 7, b: 8, answer: 8, mode: 'div', divisor: 7 };
    const byEight = { a: 7, b: 8, answer: 7, mode: 'div', divisor: 8 };
    const multiply = { a: 7, b: 8, answer: 56, mode: 'mult' };
    expect(helpers.formatMissedFact(bySeven)).toBe('56 ÷ 7 = 8');
    expect(helpers.formatMissedFact(byEight)).toBe('56 ÷ 8 = 7');
    expect(helpers.formatMissedFact(multiply)).toBe('7 × 8 = 56');
    expect(new Set([bySeven, byEight, multiply].map(helpers.missedFactIdentity)).size).toBe(3);

    // Legacy in-session misses did not carry mode/divisor. They must still
    // render a true fact instead of the old false "7 × 8 = 8" equation.
    expect(helpers.formatMissedFact({ a: 7, b: 8, answer: 8 })).toBe('56 ÷ 7 = 8');
  });
});

describe('Area Model active representation and progress integrity', () => {
  it('uses the active Partial Products and Word Problem factors in the hero', () => {
    loadTool(AREA_FILE, 'areamodel');
    document.body.innerHTML = renderTool('areamodel', {
      _areamodel: { viewMode: 'multidigit', dims: { rows: 4, cols: 6 }, multiDims: { a: 23, b: 14 } },
    });
    let hero = document.querySelector('[data-areamodel-focus]');
    expect(hero.querySelector('h3').textContent).toBe('23 × 14 = 322');
    expect(hero.textContent).toContain('23 rows by 14 columns');
    expect(hero.textContent).not.toContain('4 × 6 = 24');

    document.body.innerHTML = renderTool('areamodel', {
      _areamodel: { viewMode: 'word', dims: { rows: 4, cols: 6 }, wordDims: { a: 7, b: 8 } },
    });
    hero = document.querySelector('[data-areamodel-focus]');
    expect(hero.querySelector('h3').textContent).toBe('7 × 8 = 56');
    expect(hero.textContent).toContain('7 rows by 8 columns');
  });

  it('compares area with the full perimeter in Area Discovery', () => {
    loadTool(AREA_FILE, 'areamodel');
    document.body.innerHTML = renderTool('areamodel', {
      _areamodel: { showAreaPatterns: true, _areaHunt: { rows: 3, cols: 6 } },
    });
    expect(document.body.textContent).toContain('Special case (area = perimeter)');
    expect(document.body.textContent).toContain('3 × 6 = 18 sq units; perimeter = 18 units');

    document.body.innerHTML = renderTool('areamodel', {
      _areamodel: { showAreaPatterns: true, _areaHunt: { rows: 2, cols: 2 } },
    });
    expect(document.body.textContent).not.toContain('Special case (area = perimeter)');
    expect(document.body.textContent).toContain('2 × 2 = 4 sq units; perimeter = 8 units');
  });

  it('credits one correct challenge only once, including rapid activation', async () => {
    const tool = loadTool(AREA_FILE, 'areamodel');
    const awardXP = vi.fn();
    let latest;

    function App() {
      const [state, setState] = React.useState({
        _areamodel: {
          viewMode: 'basic', challenge: { a: 2, b: 3, answer: 6, mode: 'basic', question: 'What is 2 × 3?' },
          answer: '6', score: { correct: 0, total: 0 },
        },
      });
      latest = state;
      return tool.render(makeCtx({ toolData: state, setToolData: setState, awardXP }));
    }

    const root = ReactDOMClient.createRoot(document.getElementById('root'));
    await React.act(async () => { root.render(React.createElement(App)); });
    const check = [...document.querySelectorAll('button')].find((button) => button.textContent === 'Check');
    await React.act(async () => { check.click(); check.click(); });
    expect(latest._areamodel.score).toEqual({ correct: 1, total: 1 });
    expect(latest._areamodel.basicSolved).toBe(1);
    expect(latest._areamodel.streak).toBe(1);
    expect(awardXP.mock.calls.filter(([event]) => event === 'areamodel')).toHaveLength(1);
    expect([...document.querySelectorAll('button')].find((button) => button.textContent === 'Solved').disabled).toBe(true);
    await React.act(async () => { root.unmount(); });
  });
});

describe('foundational challenge duplicate-credit guards', () => {
  it('locks a solved Coordinate Grid challenge until a new challenge starts', async () => {
    const tool = loadTool(COORD_FILE, 'coordinate');
    const awardXP = vi.fn();
    let latestToolData;
    let latestScore;

    function App() {
      const [toolData, setToolData] = React.useState({
        _coordGrid: {
          gridChallenge: { type: 'plot', target: { x: 2, y: 3 } },
          gridPoints: [{ x: 2, y: 3 }],
        },
      });
      const [score, setScore] = React.useState({ correct: 0, total: 0 });
      latestToolData = toolData;
      latestScore = score;
      return tool.render(makeCtx({ toolData, setToolData, exploreScore: score, setExploreScore: setScore, awardXP }));
    }

    const root = ReactDOMClient.createRoot(document.getElementById('root'));
    await React.act(async () => { root.render(React.createElement(App)); });
    const check = document.querySelector('button[aria-label="Check"]');
    await React.act(async () => { check.click(); check.click(); });
    expect(latestScore).toEqual({ correct: 1, total: 1 });
    expect(latestToolData._coordGrid.plotsSolved).toBe(1);
    expect(awardXP.mock.calls.filter(([event]) => event === 'coordinate')).toHaveLength(1);
    expect(document.querySelector('button[aria-label="Check"]').disabled).toBe(true);
    await React.act(async () => { root.unmount(); });
  });

  it('locks a solved Angle Explorer construction until Next Challenge', async () => {
    const tool = loadTool(ANGLE_FILE, 'protractor');
    const awardXP = vi.fn();
    let latestToolData;
    let latestScore;

    function App() {
      const [toolData, setToolData] = React.useState({ protractor: { activeTab: 'challenges' } });
      const [angleValue, setAngleValue] = React.useState(90);
      const [angleChallenge, setAngleChallenge] = React.useState({ type: 'create', target: 90 });
      const [angleFeedback, setAngleFeedback] = React.useState(null);
      const [score, setScore] = React.useState({ correct: 0, total: 0 });
      latestToolData = toolData;
      latestScore = score;
      const update = (scope, key, value) => setToolData((prev) => ({
        ...prev, [scope]: { ...(prev[scope] || {}), [key]: value },
      }));
      const updateMulti = (scope, patch) => setToolData((prev) => ({
        ...prev, [scope]: { ...(prev[scope] || {}), ...(patch || {}) },
      }));
      return tool.render(makeCtx({
        toolData, setToolData, update, updateMulti,
        angleValue, setAngleValue, angleChallenge, setAngleChallenge, angleFeedback, setAngleFeedback,
        exploreScore: score, setExploreScore: setScore, awardXP,
      }));
    }

    const root = ReactDOMClient.createRoot(document.getElementById('root'));
    await React.act(async () => { root.render(React.createElement(App)); });
    const check = document.querySelector('button[aria-label="Check"]');
    await React.act(async () => { check.click(); check.click(); });
    expect(latestScore).toEqual({ correct: 1, total: 1 });
    expect(latestToolData.protractor.streak).toBe(1);
    expect(awardXP.mock.calls.filter(([event]) => event === 'protractor')).toHaveLength(1);
    expect(document.querySelector('button[aria-label="Check"]').disabled).toBe(true);
    await React.act(async () => { root.unmount(); });
  });
});
