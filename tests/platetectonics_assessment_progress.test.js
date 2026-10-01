import fs from 'node:fs';
import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

let React, ReactDOM, config;
const mounted = [];
const read = (file) => fs.readFileSync(file, 'utf8');

beforeAll(() => {
  const context = new Proxy({}, { get: (_, key) => key === 'measureText'
    ? () => ({ width: 10 }) : () => ({ addColorStop() {} }) });
  window.HTMLCanvasElement.prototype.getContext = () => context;
  for (const [key, value] of [['offsetWidth', 540], ['offsetHeight', 400]]) {
    Object.defineProperty(window.HTMLElement.prototype, key, { configurable: true, get: () => value });
  }
  window.requestAnimationFrame = globalThis.requestAnimationFrame = () => 0;
  window.cancelAnimationFrame = globalThis.cancelAnimationFrame = () => {};
  window.ResizeObserver = globalThis.ResizeObserver = class { observe() {} disconnect() {} unobserve() {} };
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  window.StemLab = {
    registerTool(id, value) { if (id === 'plateTectonics') config = value; },
    ensureThree: () => Promise.reject(new Error('No GPU required for assessment tests')),
    makeBayViewer: () => ({})
  };
  (0, eval)(read('desktop/web-app/node_modules/react/umd/react.development.js'));
  (0, eval)(read('desktop/web-app/node_modules/react-dom/umd/react-dom.development.js'));
  React = window.React;
  ReactDOM = window.ReactDOM;
  (0, eval)(read('stem_lab/stem_tool_platetectonics.js'));
});

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  while (mounted.length) {
    const el = mounted.pop();
    ReactDOM.unmountComponentAtNode(el);
    el.remove();
  }
  vi.clearAllTimers();
  vi.useRealTimers();
});

function mount(initial, extra = {}) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  mounted.push(host);
  let state = { plateTectonics: { simTab: 'explain', _ptPicked: true, ...initial } };
  const ctx = {
    React, toolData: state,
    setToolData(update) {
      state = typeof update === 'function' ? update(state) : { ...state, ...update };
      ctx.toolData = state;
    },
    setStemLabTool() {}, setStemLabTab() {}, setToolSnapshots() {}, addToast() {}, announceToSR() {},
    awardXP() {}, getXP: () => 0, beep() {}, celebrate() {}, canvasNarrate() {}, canvasA11yDesc() {},
    gradeLevel: '5th', stemLabTab: 'explore', stemLabTool: 'plateTectonics', toolSnapshots: [],
    props: {}, srOnly: {}, isDark: true, isContrast: false, pal: null,
    icons: new Proxy({}, { get: () => () => React.createElement('span') }),
    a11yClick: (fn) => ({ onClick: fn }), t: (_key, fallback) => fallback,
    ...extra
  };
  const Tool = () => config.render(ctx);
  const render = () => ReactDOM.render(React.createElement(Tool), host);
  const update = (patch) => {
    ctx.setToolData((prev) => ({ ...prev, plateTectonics: { ...prev.plateTectonics, ...patch } }));
    render();
  };
  render();
  return { host, render, update, grade: (grade) => { ctx.gradeLevel = grade; render(); }, state: () => state.plateTectonics };
}

function type(host, part, text) {
  const input = host.querySelector(`[data-pt-cer="${part}"]`);
  Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(input, text);
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
}

function inputValue(host, selector, value) {
  const input = host.querySelector(selector);
  Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, value);
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
}

const writing = {
  claim: 'Deep earthquakes occur within a cold sinking plate.',
  evidence: 'The earthquake dots deepen along the sloping slab beneath Japan.',
  reasoning: 'The cold plate carries rock capable of sudden failure below the shallow ridge.'
};
const trial = (bt) => ({ bt, f: 60, fr: 30, st: bt === 'convergent' ? 'thrust' : bt === 'divergent' ? 'normal' : 'strikeSlip' });
const explanation = 'Friction resists slip, so greater friction needs greater driving stress before failure.';
const quest = (id) => config.questHooks.find((q) => q.id === id);

describe('Boundary Stress inquiry and exact controls', () => {
  const stress = (extra = {}) => mount({ simTab: 'boundaryHunt' }, extra);
  const enter = (app, selector, value) => {
    const input = app.host.querySelector(selector);
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, String(value));
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
    app.render();
  };
  const record = (app) => { app.host.querySelector('[data-pt-stress-record]').click(); app.render(); };

  it('orders predict, observe and explain without requiring a prediction or confidence checkbox', () => {
    const app = stress();
    expect([...app.host.querySelectorAll('[data-pt-stress-stage]')].map((node) => node.dataset.ptStressStage)).toEqual(['predict', 'observe', 'explain']);
    expect(app.host.querySelector('#bh-prediction')).toBeTruthy();
    expect(app.host.querySelector('#bh-explanation')).toBeTruthy();
    expect(app.host.querySelector('[data-pt-stress-record]').disabled).toBe(false);
    record(app);
    expect(app.state().boundaryHunt.log).toHaveLength(1);
    expect(app.host.querySelector('[data-pt-stress-reveal]').dataset.ptStressReveal).toBe('earning');
  });

  it('keeps exact input and slider values synchronized, clamped and accessible', () => {
    const app = stress();
    enter(app, '[data-pt-stress-value="force"]', 63);
    expect(app.state().boundaryHunt.force).toBe(63);
    expect(app.host.querySelector('#bh-force').value).toBe('63');
    expect(app.host.querySelector('#bh-force').getAttribute('aria-valuetext')).toBe('63 percent');
    enter(app, '#bh-friction', 72);
    expect(app.host.querySelector('[data-pt-stress-value="friction"]').value).toBe('72');
    enter(app, '[data-pt-stress-value="force"]', 120);
    expect(app.state().boundaryHunt.force).toBe(100);
    enter(app, '[data-pt-stress-value="friction"]', -5);
    expect(app.state().boundaryHunt.friction).toBe(0);
    expect(app.host.querySelector('[data-pt-stress-diagram]').dataset.ptStressDiagram).toBe('thrust');
  });

  it('compares actual recorded settings and outcomes while identifying held inputs', () => {
    const app = stress();
    record(app);
    enter(app, '[data-pt-stress-value="force"]', 80);
    record(app);
    const comparison = app.host.querySelector('[data-pt-stress-compare]');
    expect(comparison.dataset.ptStressCompare).toBe('1');
    expect(comparison.textContent).toContain('Changed: Stress 50% → 80%');
    expect(comparison.textContent).toContain('Held constant: Boundary Convergent; Friction 50%');
    expect(comparison.textContent).toContain('Observed: Held — no slip → Thrust faulting');
    enter(app, '[data-pt-stress-value="force"]', 10);
    expect(app.host.querySelector('[data-pt-stress-compare]').textContent).toContain('Stress 50% → 80%');
    const rows = [...app.host.querySelectorAll('[data-pt-stress-log] tbody tr')];
    expect(rows[0].querySelector('th[scope="row"]').textContent).toBe('Convergent');
    expect(app.host.querySelector('[data-pt-stress-log]').tabIndex).toBe(0);
  });

  it('does not attribute an outcome to one input when several changed', () => {
    const app = stress();
    record(app);
    enter(app, '#bh-force', 80);
    enter(app, '#bh-friction', 10);
    record(app);
    const comparison = app.host.querySelector('[data-pt-stress-compare]');
    expect(comparison.dataset.ptStressCompare).toBe('2');
    expect(comparison.textContent).toContain('cannot isolate which change caused the outcome');
    expect(comparison.textContent).toContain('Held constant: Boundary Convergent');
    record(app);
    expect(app.host.querySelector('[data-pt-stress-compare]').textContent).toContain('repeated trials at the same settings');
  });
});

describe('Tectonics assessment records', () => {
  it('checks a one-volcano calculation without revealing the all-point fit or committing an estimate', () => {
    const app = mount({ simTab: 'hotspots' });
    const scaffold = app.host.querySelector('[data-pt-hotspot-calculation]');
    expect(scaffold.open).toBe(false);
    expect(app.host.querySelector('[data-pt-hotspot-calc-working]')).toBeNull();
    expect(app.host.querySelector('[data-pt-hotspot-best-fit]')).toBeNull();
    inputValue(app.host, '#pt-hl-calc-rate', '10.2');
    app.host.querySelector('[data-pt-hotspot-calc-check]').click();
    expect(app.host.querySelector('[data-pt-hotspot-calc-result]').dataset.ptHotspotCalcResult).toBe('correct');
    expect(app.host.querySelector('[data-pt-hotspot-calc-working]').textContent).toContain('519 ÷ 5.1 = 101.8');
    expect(app.host.querySelector('[data-pt-hotspot-calc-working]').textContent).toContain('101.8 ÷ 10 = 10.2 cm per year');
    expect(app.host.querySelector('[data-pt-hotspot-best-fit]')).toBeNull();
    expect(app.state().ptHotspot.est).toBeUndefined();
    app.host.querySelector('[data-pt-hotspot-calc-use]').click();
    expect(app.host.querySelector('#pt-hl-rate').value).toBe('102');
    expect(app.state().ptHotspot.draftRate).toBe(102);
    expect(app.host.querySelector('#pt-hl-rate').getAttribute('aria-valuetext')).toContain('10.2 centimetres per year');
  });

  it.each(['', '0', '-1', 'not a number'])('rejects the invalid calculation %j without treating it as zero-rate success', (value) => {
    const app = mount({ simTab: 'hotspots' });
    inputValue(app.host, '#pt-hl-calc-rate', value);
    app.host.querySelector('[data-pt-hotspot-calc-check]').click();
    expect(app.host.querySelector('[data-pt-hotspot-calc-result]').dataset.ptHotspotCalcResult).toBe('invalid');
    expect(app.host.querySelector('#pt-hl-calc-rate').getAttribute('aria-invalid')).toBe('true');
    expect(app.host.querySelector('[data-pt-hotspot-calc-use]')).toBeNull();
    expect(app.host.querySelector('[data-pt-hotspot-calc-working]')).toBeNull();
  });

  it('identifies a missing cm-per-year conversion and hides working again when the student edits', () => {
    const app = mount({ simTab: 'hotspots' });
    inputValue(app.host, '#pt-hl-calc-rate', '102');
    app.host.querySelector('[data-pt-hotspot-calc-check]').click();
    expect(app.host.querySelector('[data-pt-hotspot-calc-result]').dataset.ptHotspotCalcResult).toBe('rethink');
    expect(app.host.querySelector('[data-pt-hotspot-calc-working]').textContent).toContain('÷ 10 = 10.2 cm per year');
    expect(app.host.querySelector('[data-pt-hotspot-calc-use]')).toBeNull();
    inputValue(app.host, '#pt-hl-calc-rate', '10.2');
    expect(app.host.querySelector('[data-pt-hotspot-calc-working]')).toBeNull();
    expect(app.host.querySelector('[data-pt-hotspot-calc-result]').dataset.ptHotspotCalcResult).toBe('waiting');
  });

  it('keeps the uncommitted slider and calculation when the learner visits another activity', () => {
    const app = mount({ simTab: 'hotspots' });
    inputValue(app.host, '#pt-hl-rate', '77');
    inputValue(app.host, '#pt-hl-calc-rate', '10.2');
    app.update({ simTab: 'explain' });
    app.update({ simTab: 'hotspots' });
    expect(app.host.querySelector('#pt-hl-rate').value).toBe('77');
    expect(app.host.querySelector('#pt-hl-calc-rate').value).toBe('10.2');
    expect(app.host.querySelector('[data-pt-hotspot-best-fit]')).toBeNull();
    expect(app.state().ptHotspot.est).toBeUndefined();
  });

  it.each([[40, 'too flat', 'Increase', '1,108'], [150, 'too steep', 'Decrease', '4,155']])('explains the %i km/Myr line against Midway and preserves it on retry', (est, verdict, action, distance) => {
    const app = mount({ simTab: 'hotspots', ptHotspot: { est } });
    const feedback = app.host.querySelector('[data-pt-hotspot-result]');
    expect(feedback.getAttribute('role')).toBe('status');
    expect(feedback.textContent).toContain(verdict);
    expect(feedback.textContent).toContain(action);
    expect(feedback.textContent).toContain(distance);
    expect(feedback.textContent).toContain('2,432');
    app.host.querySelector('[data-pt-hotspot-retry]').click();
    app.render();
    expect(app.host.querySelector('#pt-hl-rate').value).toBe(String(est));
    expect(app.host.querySelector('#pt-hl-rate').disabled).toBe(false);
    expect(app.state().ptHotspot.est).toBeNull();
    expect(app.host.querySelector('[data-pt-hotspot-best-fit]')).toBeNull();
  });

  it('provides geographic and age evidence before asking for Hawaiian plate direction', () => {
    const app = mount({ simTab: 'hotspots' });
    const map = app.host.querySelector('[data-pt-hotspot-chain]');
    expect(map).toBeTruthy();
    expect(map.getAttribute('aria-label')).toMatch(/north at the top and east at the right/);
    expect(map.querySelector('[data-pt-chain-compass]').textContent).toContain('North');
    const islands = Array.from(map.querySelectorAll('[data-pt-chain-island]'));
    expect(islands.map((island) => island.dataset.ptChainIsland)).toEqual(['nihoa', 'kauai', 'oahu', 'molokai', 'maui', 'kilauea']);
    const positions = islands.map((island) => {
      const data = window.__alloPtHawaii.data.find((row) => row.id === island.dataset.ptChainIsland);
      expect(Number(island.dataset.ptChainAge)).toBe(data.a);
      expect(island.textContent).toContain(`${data.a} Ma`);
      const mark = island.querySelector('ellipse');
      return { x: Number(mark.getAttribute('cx')), y: Number(mark.getAttribute('cy')) };
    });
    for (let i = 1; i < positions.length; i++) {
      expect(positions[i].x).toBeGreaterThan(positions[i - 1].x);
      expect(positions[i].y).toBeGreaterThan(positions[i - 1].y);
    }
    const choice = app.host.querySelector('input[name="pt-hl-dir"]');
    expect(map.compareDocumentPosition(choice) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(app.host.querySelector('input[name="pt-hl-dir"]:checked')).toBeNull();
    expect(app.host.querySelector('[data-pt-hotspot-dir]')).toBeNull();
    expect(map.closest('figure').textContent).toContain('not to geographic scale');
  });

  it('keeps an incomplete explanation when its evidence link leaves the activity', () => {
    const app = mount();
    type(app.host, 'claim', 'A cold slab');
    type(app.host, 'reasoning', 'My first idea');
    expect(app.host.querySelector('[data-pt-cer-save]').disabled).toBe(true);
    app.host.querySelector('[data-pt-evidence="cut"] button').click();
    expect(app.state().simTab).toBe('forces');
    app.render();
    expect(app.host.querySelector('[data-pt-cer="claim"]')).toBeNull();
    app.update({ simTab: 'explain' });
    expect(app.host.querySelector('[data-pt-cer="claim"]').value).toBe('A cold slab');
    expect(app.host.querySelector('[data-pt-cer="reasoning"]').value).toBe('My first idea');
    expect(app.state().ptCER).toBeUndefined();
    expect(quest('cer_saved').check(app.state())).toBe(false);
  });

  it('keeps later draft changes separate from the submitted explanation and snapshot', () => {
    const snapshots = [];
    const result = { score: 6, total: 6, band: '3-5', missed: [] };
    const app = mount({ ptQuizResult: result, quizScore: 0 }, { saveSnapshot: (...args) => snapshots.push(args) });
    Object.entries(writing).forEach(([part, text]) => type(app.host, part, text));
    app.host.querySelector('[data-pt-cer-save]').click();
    expect(app.state().ptCER).toMatchObject(writing);
    expect(snapshots[0][2].quiz).toEqual(result);
    type(app.host, 'claim', 'An unfinished revision');
    app.update({ simTab: 'quiz' });
    app.update({ simTab: 'explain' });
    expect(app.host.querySelector('[data-pt-cer="claim"]').value).toBe('An unfinished revision');
    expect(app.state().ptCER.claim).toBe(writing.claim);
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0][2].cer.claim).toBe(writing.claim);
  });

  it.each([['5th', '3-5', 6], ['8th', '6-8', 8]])('stores the actual denominator for %s grade and preserves it on retry', (gradeLevel, band, total) => {
    const app = mount({ simTab: 'quiz', quizIdx: total - 1, quizScore: total, quizAnswer: 'correct', quizMissed: [] }, { gradeLevel });
    expect(quest('quiz_6').check(app.state())).toBe(false);
    app.host.querySelector('[data-pt-quiz-next]').click();
    app.render();
    expect(app.state().ptQuizResult).toEqual({ score: total, total, band, missed: [] });
    expect(quest('quiz_6').check(app.state())).toBe(true);
    app.host.querySelector('[data-pt-quiz-restart]').click();
    app.render();
    expect(app.state().quizScore).toBe(0);
    expect(app.state().quizIdx).toBe(0);
    expect(app.state().ptQuizResult.score).toBe(total);
    expect(app.host.querySelector('[data-pt-quiz-previous]').textContent).toContain(`${total} / ${total}`);
    expect(quest('quiz_6').check(app.state())).toBe(true);

    const guide = document.createElement('div');
    document.body.appendChild(guide); mounted.push(guide);
    ReactDOM.render(React.createElement(window.AlloTectonicsTeacherGuide, { data: app.state() }), guide);
    expect(guide.querySelector('[data-pt-teacher-quiz]').textContent).toContain(`${total} of ${total}`);
    expect(guide.querySelector('[data-pt-teacher-quiz]').textContent).toContain(`grades ${band}`);
  });

  it('retains the best completed score when a later attempt scores lower', () => {
    const best = { score: 7, total: 8, band: '6-8', missed: ['Convection'] };
    const app = mount({ simTab: 'quiz', quizIdx: 7, quizScore: 3, quizAnswer: 'wrong_0', quizMissed: ['P-wave'], ptQuizResult: best, ptQuizBest: best }, { gradeLevel: '8th' });
    app.host.querySelector('[data-pt-quiz-next]').click();
    expect(app.state().ptQuizResult).toEqual({ score: 3, total: 8, band: '6-8', missed: ['P-wave'] });
    expect(app.state().ptQuizBest).toEqual(best);
    expect(quest('quiz_6').check(app.state())).toBe(true);
  });

  it('uses the current grade before starting, pins on the first answer, and adopts a new grade on retry', () => {
    const app = mount({ simTab: 'quiz' });
    const header = () => app.host.querySelector('[data-pt-quiz-header]').textContent;
    expect(header()).toContain('Question 1 / 6');
    app.grade('8th');
    expect(header()).toContain('Question 1 / 8');
    app.host.querySelector('[data-pt-quiz-opt]').click();
    expect(app.state().quizBand).toBe('6-8');
    app.grade('5th');
    expect(header()).toContain('Question 1 / 8');
    app.update({ quizIdx: 7, quizScore: 8, quizAnswer: 'correct' });
    app.host.querySelector('[data-pt-quiz-next]').click();
    app.render();
    expect(app.state().ptQuizResult).toEqual({ score: 8, total: 8, band: '6-8', missed: [] });
    expect(header()).toContain('8 / 8');
    app.host.querySelector('[data-pt-quiz-restart]').click();
    app.render();
    expect(header()).toContain('Question 1 / 6');
    expect(app.state().quizBand).toBeNull();
    expect(app.state().ptQuizResult.total).toBe(8);
  });

  it.each([['3-5', 6, '8th'], ['6-8', 8, '5th']])('restores a completed %s attempt independently of the current profile grade', (band, total, gradeLevel) => {
    const result = { score: total, total, band, missed: [] };
    const app = mount({ simTab: 'quiz', quizIdx: total, quizScore: total, ptQuizResult: result }, { gradeLevel });
    expect(app.host.querySelector('[data-pt-quiz-results]').textContent).toContain(`${total} / ${total}`);
    expect(app.host.querySelector('[data-pt-quiz-header]').textContent).toContain(`${total} / ${total}`);
    expect(app.host.querySelector('[data-pt-quiz-opt]')).toBeNull();
    app.render();
    expect(app.state().quizBand).toBe(band);
    expect(app.state().ptQuizResult).toEqual(result);
  });

  it('resets an incompatible unlabelled legacy attempt without clearing its best completed record', () => {
    const best = { score: 7, total: 8, band: '6-8', missed: ['Convection'] };
    const app = mount({ simTab: 'quiz', quizIdx: 8, quizScore: 8, ptQuizBest: best });
    expect(app.host.querySelector('[data-pt-quiz-header]').textContent).toContain('Score: 0 | Question 1 / 6');
    app.render();
    expect(app.state().quizScore).toBe(0);
    expect(app.state().quizIdx).toBe(0);
    expect(app.state().ptQuizBest).toEqual(best);
    expect(app.state().ptQuizResult).toBeUndefined();
  });

  it('does not treat three trials of one boundary as a completed stress investigation', () => {
    const boundaryHunt = { btype: 'convergent', force: 60, friction: 30, log: [trial('convergent'), trial('convergent'), trial('convergent')], explanation };
    const app = mount({ simTab: 'boundaryHunt', boundaryHunt });
    expect(app.host.querySelector('[data-pt-stress-reveal]').getAttribute('data-pt-stress-reveal')).toBe('earning');
    expect(quest('stress_explained').check(app.state())).toBe(false);
    expect(quest('stress_explained').progress(app.state())).toContain('1/3');
  });

  it('retains boundary evidence after the eight-row log rolls over, until an explicit reset', () => {
    const boundaryHunt = { btype: 'convergent', force: 60, friction: 30, log: ['convergent', 'divergent', 'transform'].map(trial), explanation };
    const app = mount({ simTab: 'boundaryHunt', boundaryHunt });
    for (let i = 0; i < 9; i++) {
      app.host.querySelector('[data-pt-stress-record]').click();
      app.render();
    }
    expect(app.state().boundaryHunt.log).toHaveLength(8);
    expect(app.state().boundaryHunt.log.every((row) => row.bt === 'convergent')).toBe(true);
    expect(Object.keys(app.state().boundaryHunt.trialsByType).sort()).toEqual(['convergent', 'divergent', 'transform']);
    expect(app.host.querySelector('[data-pt-stress-reveal]').getAttribute('data-pt-stress-reveal')).toBe('open');
    expect(quest('stress_explained').check(app.state())).toBe(true);
    app.host.querySelector('[data-pt-stress-reset]').click();
    app.render();
    expect(quest('stress_explained').check(app.state())).toBe(false);
    expect(app.state().boundaryHunt.trialsByType).toEqual({});
  });
});
