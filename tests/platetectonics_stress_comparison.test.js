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


describe('Retained stress comparisons and exact epicenter progress', () => {
  const rows = () => ({ convergent: trial('convergent'), divergent: trial('divergent'), transform: trial('transform') });
  const stress = (boundaryHunt, extra = {}) => mount({ simTab: 'boundaryHunt', boundaryHunt }, extra);
  it('shows all latest boundary records after the visible log rolls over', () => {
    const kept = rows(); const app = stress({ btype: 'convergent', force: 90, friction: 10, trialsByType: kept, log: Array.from({ length: 8 }, () => ({ bt: 'convergent', f: 90, fr: 10, st: 'thrust' })) });
    expect(app.host.querySelector('[data-pt-stress-retained]').dataset.ptStressRetained).toBe('3');
    expect([...app.host.querySelectorAll('[data-pt-stress-log] tbody th')].every(node => node.textContent === 'Convergent')).toBe(true);
    for (const type of ['divergent', 'transform']) {
      const card = app.host.querySelector('[data-pt-stress-retained-type="' + type + '"]');
      expect(card.textContent).toContain('60%'); expect(card.textContent).toContain('30%');
    }
    expect(app.host.querySelector('[data-pt-stress-retained]').dataset.ptStressMatched).toBe('false');
    expect(app.host.querySelector('#bh-retained-status').textContent).toContain('do not isolate boundary type');
  });
  it('identifies a controlled comparison only from actual recorded settings', () => {
    const app = stress({ btype: 'convergent', force: 99, friction: 99, trialsByType: rows(), log: [] });
    expect(app.host.querySelector('[data-pt-stress-retained]').dataset.ptStressMatched).toBe('true');
    expect(app.host.querySelector('#bh-retained-status').textContent).toContain('stress 60% and friction 30%');
    const kept = rows(); kept.transform.fr = 31;
    app.update({ boundaryHunt: { btype: 'convergent', force: 99, friction: 99, trialsByType: kept, log: [] } });
    expect(app.host.querySelector('[data-pt-stress-retained]').dataset.ptStressMatched).toBe('false');
  });
  it('restores inputs without recording, rescoring or changing the saved evidence', () => {
    const kept = rows(), xp = vi.fn(), beep = vi.fn();
    const app = stress({ btype: 'convergent', force: 5, friction: 95, trialsByType: kept, log: [], explanation: 'unfinished' }, { awardXP: xp, beep });
    app.host.querySelector('[data-pt-stress-use-settings="transform"]').click(); app.render();
    expect(app.state().boundaryHunt).toMatchObject({ btype: 'transform', force: 60, friction: 30, log: [], trialsByType: kept, explanation: 'unfinished' });
    expect(xp).not.toHaveBeenCalled(); expect(beep).not.toHaveBeenCalled();
    app.host.querySelector('[data-pt-stress-record]').click(); app.render();
    expect(app.state().boundaryHunt.log).toHaveLength(1); expect(app.state().boundaryHunt.log[0]).toEqual(kept.transform);
  });
  it('distinguishes missing records and clears them only on explicit reset', () => {
    const app = stress({ btype: 'convergent', force: 60, friction: 30, trialsByType: { convergent: trial('convergent') }, log: [], hypothesis: 'prediction', explanation: 'reasoning' });
    expect(app.host.querySelector('[data-pt-stress-retained]').dataset.ptStressRetained).toBe('1');
    expect(app.host.querySelector('[data-pt-stress-retained-type="divergent"]').textContent).toContain('No trial recorded yet');
    expect(app.host.querySelector('#bh-retained-status').textContent).toContain('keep driving stress and friction the same');
    app.render(); expect(app.state().boundaryHunt.trialsByType.convergent).toEqual(trial('convergent'));
    app.host.querySelector('[data-pt-stress-reset]').click(); app.render();
    expect(app.host.querySelector('[data-pt-stress-retained]').dataset.ptStressRetained).toBe('0');
    expect(app.state().boundaryHunt).toMatchObject({ hypothesis: '', explanation: '', log: [], trialsByType: {} });
  });
  it('does not load invalid stored settings into the live model', () => {
    const kept = rows(); kept.transform.f = NaN;
    const app = stress({ btype: 'convergent', force: 60, friction: 30, trialsByType: kept, log: [] });
    const use = app.host.querySelector('[data-pt-stress-use-settings="transform"]');
    expect(use.disabled).toBe(true); use.click(); app.render();
    expect(app.state().boundaryHunt.btype).toBe('convergent'); expect(app.state().boundaryHunt.force).toBe(60);
    expect(app.host.querySelector('[data-pt-stress-retained]').dataset.ptStressMatched).toBe('false');
  });
  it('uses exact measured error for the 50 km target and formats progress separately', () => {
    const locate = quest('mystery_quake');
    expect(locate.check({ ptEpi: { mysteryBestKm: 50.4 } })).toBe(false);
    expect(locate.check({ ptEpi: { mysteryBestKm: 50 } })).toBe(true);
    for (const invalid of [-1, NaN, Infinity]) expect(locate.check({ ptEpi: { mysteryBestKm: invalid } })).toBe(false);
    expect(locate.progress({ ptEpi: { mysteryBestKm: 50.4 } })).toBe('best 50.4 km');
    expect(locate.progress({ ptEpi: { mysteryBestKm: 1.234567 } })).toBe('best 1.2 km');
  });
  it('preserves a draft through the actual host shelf without recording an attempt', () => {
    const app = mount({ simTab: 'earthquake' });
    app.host.querySelector('[data-pt-mystery-start]').click(); app.render();
    inputValue(app.host, '[data-pt-mystery-dist="BRK"]', '420'); app.render();
    const saved = JSON.parse(JSON.stringify(app.state().ptEpi.caseDraft));
    expect(saved.mystery.dists.BRK).toBe('420'); expect(app.state().ptEpi.mysteryTries).toBeUndefined();
    app.host.querySelector('[data-pt-shelf-close]').click(); app.render();
    expect(app.host.querySelector('[data-pt-mystery-dist="BRK"]')).toBeNull();
    app.host.querySelector('[data-pt-shelf-open]').click(); app.render();
    expect(app.host.querySelector('[data-pt-mystery-dist="BRK"]').value).toBe('420');
    expect(app.state().ptEpi.caseDraft).toEqual(saved); expect(app.state().ptEpi.mysteryTries).toBeUndefined();
  });
});
