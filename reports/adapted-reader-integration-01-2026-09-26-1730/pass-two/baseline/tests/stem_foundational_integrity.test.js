import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
const ANGLES_FILE = 'stem_lab/stem_tool_angles.js';

const multSource = fs.readFileSync(MULT_FILE, 'utf8');
const MultPure = (() => {
  const start = multSource.indexOf('function tkey(a, b)');
  const end = multSource.indexOf('var MEMORY_TRICKS = {', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  // eslint-disable-next-line no-new-func
  return new Function(
    multSource.slice(start, end) +
    '\nreturn { parseWholeAnswer, missedFactMode, missedFactDivisor, missedFactIdentity, formatMissedFact };'
  )();
})();

let mountedRoots = [];

async function mount(Component) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  mountedRoots.push(root);
  await React.act(async () => { root.render(React.createElement(Component)); });
  return host;
}

function buttonWithText(host, text) {
  return [...host.querySelectorAll('button')].find((button) => button.textContent.trim() === text);
}

beforeEach(() => {
  resetStemLab();
  vi.useFakeTimers();
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(async () => {
  for (const root of mountedRoots.splice(0)) {
    await React.act(async () => { root.unmount(); });
  }
  vi.clearAllTimers();
  vi.useRealTimers();
  delete globalThis.IS_REACT_ACT_ENVIRONMENT;
  document.body.innerHTML = '';
});

describe('Multiplication Table answer and missed-fact integrity', () => {
  it('grades the whole answer instead of a parseInt prefix', () => {
    expect(MultPure.parseWholeAnswer('56')).toBe(56);
    expect(MultPure.parseWholeAnswer(' 56 ')).toBe(56);
    expect(MultPure.parseWholeAnswer('56.0')).toBe(56);
    expect(MultPure.parseWholeAnswer('56.5')).toBeNull();
    expect(MultPure.parseWholeAnswer('56 pencils')).toBeNull();
    expect(MultPure.parseWholeAnswer('')).toBeNull();
  });

  it('preserves division direction while deduping equivalent misses', () => {
    const division = { a: 7, b: 8, answer: 8, mode: 'div', divisor: 7 };
    const sameDivision = { a: 8, b: 7, answer: 8, mode: 'div', divisor: 7 };
    const otherDirection = { a: 7, b: 8, answer: 7, mode: 'div', divisor: 8 };
    const multiplication = { a: 8, b: 7, answer: 56, mode: 'mult' };

    expect(MultPure.formatMissedFact(division)).toBe('56 ÷ 7 = 8');
    expect(MultPure.missedFactIdentity(sameDivision)).toBe(MultPure.missedFactIdentity(division));
    expect(MultPure.missedFactIdentity(otherDirection)).not.toBe(MultPure.missedFactIdentity(division));
    expect(MultPure.missedFactIdentity(multiplication)).not.toBe(MultPure.missedFactIdentity(division));

    // Legacy speed-run data did not record mode/divisor. Keep it readable.
    expect(MultPure.missedFactMode({ a: 7, b: 8, answer: 8 })).toBe('div');
    expect(MultPure.missedFactDivisor({ a: 7, b: 8, answer: 8 })).toBe(7);
  });

  it('replays a missed division fact as division regardless of the current quiz mode', async () => {
    const tool = loadTool(MULT_FILE, 'multtable');
    let latestChallenge = null;

    function App() {
      const [labData, setLabData] = React.useState({
        _multTimer: {
          active: false, paused: false, score: 0, total: 2, timeLeft: 0, streak: 0,
          missed: [
            { a: 7, b: 8, answer: 8, mode: 'div', divisor: 7 },
            { a: 8, b: 7, answer: 8, mode: 'div', divisor: 7 },
          ],
          adaptiveHistory: [],
        },
        _multExt: { badges: {}, quizMode: 'mult' },
      });
      const [challenge, setChallenge] = React.useState(null);
      const [answer, setAnswer] = React.useState('');
      const [feedback, setFeedback] = React.useState(null);
      const [hidden, setHidden] = React.useState(false);
      const [hover, setHover] = React.useState(null);
      const [revealed, setRevealed] = React.useState(new Set());
      const [score, setScore] = React.useState({ correct: 0, total: 0 });
      const [difficulty, setDifficulty] = React.useState('hard');
      latestChallenge = challenge;
      return tool.render(makeCtx({
        labToolData: labData,
        setLabToolData: setLabData,
        multTableChallenge: challenge,
        setMultTableChallenge: setChallenge,
        multTableAnswer: answer,
        setMultTableAnswer: setAnswer,
        multTableFeedback: feedback,
        setMultTableFeedback: setFeedback,
        multTableHidden: hidden,
        setMultTableHidden: setHidden,
        multTableHover: hover,
        setMultTableHover: setHover,
        multTableRevealed: revealed,
        setMultTableRevealed: setRevealed,
        exploreScore: score,
        setExploreScore: setScore,
        exploreDifficulty: difficulty,
        setExploreDifficulty: setDifficulty,
      }));
    }

    const host = await mount(App);
    expect(host.textContent).toContain('Review mistakes (1)');
    expect(host.textContent).toContain('56 ÷ 7 = 8');
    await React.act(async () => { buttonWithText(host, '🎯 Practice these').click(); });
    expect(latestChallenge).toMatchObject({ a: 7, b: 8, mode: 'div', divisor: 7 });
  });

  it('scores and awards only once under rapid Check activation', async () => {
    const tool = loadTool(MULT_FILE, 'multtable');
    const awardXP = vi.fn();
    let latestLabData;
    let latestScore;

    function App() {
      const [labData, setLabData] = React.useState({
        _multTimer: { active: false, paused: false, score: 0, total: 0, timeLeft: 120, streak: 0, missed: [], adaptiveHistory: [] },
        _multExt: { badges: { firstCorrect: true }, totalCorrect: 0, sessionCorrect: 0 },
      });
      const [challenge, setChallenge] = React.useState({ a: 7, b: 8, mode: 'mult', divisor: null });
      const [answer, setAnswer] = React.useState('56');
      const [feedback, setFeedback] = React.useState(null);
      const [score, setScore] = React.useState({ correct: 0, total: 0 });
      const [revealed, setRevealed] = React.useState(new Set());
      latestLabData = labData;
      latestScore = score;
      return tool.render(makeCtx({
        labToolData: labData,
        setLabToolData: setLabData,
        multTableChallenge: challenge,
        setMultTableChallenge: setChallenge,
        multTableAnswer: answer,
        setMultTableAnswer: setAnswer,
        multTableFeedback: feedback,
        setMultTableFeedback: setFeedback,
        multTableHidden: false,
        setMultTableHidden: vi.fn(),
        multTableHover: null,
        setMultTableHover: vi.fn(),
        multTableRevealed: revealed,
        setMultTableRevealed: setRevealed,
        exploreScore: score,
        setExploreScore: setScore,
        exploreDifficulty: 'hard',
        setExploreDifficulty: vi.fn(),
        awardXP,
      }));
    }

    const host = await mount(App);
    const check = host.querySelector('button[aria-label="Check"]');
    await React.act(async () => { check.click(); check.click(); });
    expect(awardXP).toHaveBeenCalledTimes(1);
    expect(latestScore).toEqual({ correct: 1, total: 1 });
    expect(latestLabData._multExt).toMatchObject({ totalCorrect: 1, sessionCorrect: 1 });
  });
});

describe('Area Model representation and submission integrity', () => {
  it('uses the active challenge factors in the hero and AI tutor prompt', async () => {
    loadTool(AREA_FILE, 'areamodel');
    const state = {
      _areamodel: {
        viewMode: 'multidigit',
        multiDims: { a: 23, b: 14 },
        challenge: { a: 31, b: 12, answer: 372, question: '31 × 12 = ?', mode: 'multidigit' },
        showAITutor: true,
        aiQuestion: 'Show the partial products',
        muted: true,
      },
    };
    const html = renderTool('areamodel', state);
    expect(html).toContain('31 × 12 = 372');
    expect(html).toContain('31 rows by 12 columns');
    expect(html).not.toContain('23 × 14 = 322');

    resetStemLab();
    const tool = loadTool(AREA_FILE, 'areamodel');
    const callGemini = vi.fn(() => new Promise(() => {}));
    function App() {
      const [toolData, setToolData] = React.useState(state);
      return tool.render(makeCtx({ toolData, setToolData, callGemini }));
    }
    const host = await mount(App);
    await React.act(async () => { buttonWithText(host, 'Ask').click(); });
    expect(callGemini).toHaveBeenCalledTimes(1);
    expect(callGemini.mock.calls[0][0]).toContain('factors 31 and 12 (product 372)');
  });

  it('classifies the actual area-equals-perimeter case', () => {
    loadTool(AREA_FILE, 'areamodel');
    const html = renderTool('areamodel', {
      _areamodel: { showAreaPatterns: true, _areaHunt: { rows: 4, cols: 4, hypothesis: '', log: [] } },
    });
    expect(html).toContain('Special case (area = perimeter)');
    expect(html).toContain('4 × 4 = 16 sq units; perimeter = 16 units');
    expect(html).toContain('Hypothesis: When does area equal perimeter?');
  });

  it('scores and awards a challenge only once under rapid activation', async () => {
    const tool = loadTool(AREA_FILE, 'areamodel');
    const awardXP = vi.fn();
    let latest;
    function App() {
      const [toolData, setToolData] = React.useState({
        _areamodel: {
          viewMode: 'multidigit',
          multiDims: { a: 31, b: 12 },
          challenge: { a: 31, b: 12, answer: 372, question: '31 × 12 = ?', mode: 'multidigit' },
          answer: '372', feedback: null, score: { correct: 0, total: 0 }, streak: 0,
          badges: { firstArea: true }, muted: true,
        },
      });
      latest = toolData;
      return tool.render(makeCtx({ toolData, setToolData, awardXP }));
    }
    const host = await mount(App);
    const check = host.querySelector('button[aria-label="Check"]');
    await React.act(async () => { check.click(); check.click(); });
    expect(awardXP).toHaveBeenCalledTimes(1);
    expect(latest._areamodel.score).toEqual({ correct: 1, total: 1 });
    expect(latest._areamodel.feedback.correct).toBe(true);
  });
});

describe('Coordinate Grid and Angle Explorer localized locks', () => {
  it('rejects fractional rise/run values and awards each solved slope only once', async () => {
    const tool = loadTool(COORD_FILE, 'coordinate');
    const awardXP = vi.fn();
    let latest;
    let setData;
    const challenge = {
      type: 'slope', p1: { x: 0, y: 0 }, p2: { x: 3, y: 4 },
      slopeData: { rise: 4, run: 3, value: 4 / 3, display: '4/3' },
    };
    function App() {
      const [toolData, setToolData] = React.useState({
        _coordGrid: {
          cgTab: 'explore', gridChallenge: challenge,
          gridFeedback: { riseAnswer: '4.5', runAnswer: '3', slopeAnswer: '4/3' },
          badges: { firstPlot: true }, muted: true,
        },
      });
      const [score, setScore] = React.useState({ correct: 0, total: 0 });
      latest = toolData;
      setData = setToolData;
      return tool.render(makeCtx({ toolData, setToolData, exploreScore: score, setExploreScore: setScore, awardXP }));
    }
    const host = await mount(App);
    let check = host.querySelector('button[aria-label="Check"]');
    await React.act(async () => { check.click(); });
    expect(latest._coordGrid.gridFeedback.correct).toBe(false);
    expect(awardXP).not.toHaveBeenCalled();

    await React.act(async () => {
      setData((prev) => ({
        ...prev,
        _coordGrid: {
          ...prev._coordGrid,
          gridFeedback: { riseAnswer: '4', runAnswer: '3', slopeAnswer: '4/3' },
        },
      }));
    });
    check = host.querySelector('button[aria-label="Check"]');
    await React.act(async () => { check.click(); check.click(); });
    expect(awardXP).toHaveBeenCalledTimes(1);
    expect(latest._coordGrid.slopesSolved).toBe(1);

    // A new challenge receives its own lock; the previous solve does not freeze the tool.
    await React.act(async () => {
      setData((prev) => ({
        ...prev,
        _coordGrid: {
          ...prev._coordGrid,
          gridChallenge: challenge,
          gridFeedback: { riseAnswer: '4', runAnswer: '3', slopeAnswer: '4/3' },
        },
      }));
    });
    check = host.querySelector('button[aria-label="Check"]');
    await React.act(async () => { check.click(); check.click(); });
    expect(awardXP).toHaveBeenCalledTimes(2);
    expect(latest._coordGrid.slopesSolved).toBe(2);
  });

  it('keeps estimate and classification awards idempotent without globally freezing later questions', async () => {
    const tool = loadTool(ANGLES_FILE, 'protractor');
    const awardXP = vi.fn();
    let latestData;
    let latestFeedback;
    let setData;
    let setChallenge;
    let setFeedback;
    let setAngle;

    function App() {
      const [toolData, setToolData] = React.useState({
        protractor: {
          activeTab: 'challenges', estimateActive: true, estimateTarget: 60,
          estimateGuess: '60.5', estimateResult: null, estimateCount: 0,
          earnedBadges: { first_angle: 1 }, soundEnabled: false,
        },
      });
      const [angleValue, setAngleValue] = React.useState(60);
      const [angleChallenge, setAngleChallenge] = React.useState(null);
      const [angleFeedback, setAngleFeedback] = React.useState(null);
      const [score, setScore] = React.useState({ correct: 0, total: 0 });
      latestData = toolData;
      latestFeedback = angleFeedback;
      setData = setToolData;
      setChallenge = setAngleChallenge;
      setFeedback = setAngleFeedback;
      setAngle = setAngleValue;
      const update = (toolId, key, value) => setToolData((prev) => ({
        ...prev, [toolId]: { ...(prev[toolId] || {}), [key]: value },
      }));
      const updateMulti = (toolId, patch) => setToolData((prev) => ({
        ...prev, [toolId]: { ...(prev[toolId] || {}), ...(patch || {}) },
      }));
      return tool.render(makeCtx({
        toolData, update, updateMulti, angleValue, setAngleValue,
        angleChallenge, setAngleChallenge, angleFeedback, setAngleFeedback,
        exploreScore: score, setExploreScore: setScore, awardXP,
      }));
    }

    const host = await mount(App);
    let check = host.querySelector('button[aria-label="Check"]');
    await React.act(async () => { check.click(); });
    expect(latestData.protractor.estimateResult).toBeNull();
    expect(awardXP).not.toHaveBeenCalled();

    await React.act(async () => {
      setData((prev) => ({ ...prev, protractor: { ...prev.protractor, estimateGuess: '60' } }));
    });
    check = host.querySelector('button[aria-label="Check"]');
    await React.act(async () => { check.click(); check.click(); });
    expect(awardXP).toHaveBeenCalledTimes(1);
    expect(latestData.protractor.estimateResult).toMatchObject({ guess: 60, target: 60, ok: true });

    await React.act(async () => {
      setData((prev) => ({
        ...prev,
        protractor: { ...prev.protractor, estimateActive: true, estimateTarget: 45, estimateGuess: '45', estimateResult: null },
      }));
      setAngle(45);
    });
    check = host.querySelector('button[aria-label="Check"]');
    await React.act(async () => { check.click(); check.click(); });
    expect(awardXP).toHaveBeenCalledTimes(2);

    await React.act(async () => {
      setData((prev) => ({ ...prev, protractor: { ...prev.protractor, estimateActive: false, estimateResult: null } }));
      setChallenge({ type: 'classify', target: 60 });
      setFeedback(null);
      setAngle(60);
    });
    const acute = buttonWithText(host, 'Acute');
    const obtuse = buttonWithText(host, 'Obtuse');
    await React.act(async () => { acute.click(); obtuse.click(); });
    expect(awardXP).toHaveBeenCalledTimes(3);
    expect(latestFeedback).toMatchObject({ correct: true });
    expect(latestFeedback.msg).toContain('60° is Acute');
  });
});
