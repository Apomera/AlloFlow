import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
const roots = new Set();
let tool;
const clone = value => JSON.parse(JSON.stringify(value));
const choice = { label: 'Follow the sheltered valley', energy_cost: -10, distance_gain: 300, flock_change: 0, result: 'The flock crosses safely.' };
const decision = (scenario = 'A mountain crossing lies ahead.', changes = {}) => ({ scenario, choices: [{ ...choice, ...changes }] });
const active = (patch = {}) => ({ challengeActive: true, challengeStep: 0, challengeEnergy: 80,
  challengeDistance: 3000, challengeDistRemaining: 1000, challengeFlockSize: 50,
  challengeChoices: decision(), challengeLoading: false, challengeComplete: false, challengeLog: [], ...patch });
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function committedHandler(element) {
  const key = Object.keys(element).find(name => name.startsWith('__reactProps$'));
  expect(key).toBeTruthy();
  return element[key].onClick;
}
function fixture(seed = {}, backend = null) {
  let state = { tab: 'navigate', inquiry: { hypothesis: 'Keep my prediction.' },
    flightStudyObservations: { drafts: { 'goose:wing': 'Keep my evidence.' } }, ...seed }, refresh;
  let readRefs = [], readStates = [], readIds = [];
  const writes = [], award = vi.fn(), celebrate = vi.fn();
  const tracedReact = { ...React,
    useRef(value) { const ref = React.useRef(value); readRefs.push(ref); return ref; },
    useState(value) { const pair = React.useState(value); readStates.push(pair); return pair; },
    useId() { const id = React.useId(); readIds.push(id); return id; }
  };
  const ctx = makeCtx({ React: tracedReact, callGemini: backend, awardXP: award, celebrate,
    update: (_, key, value) => { writes.push({ [key]: value }); state = { ...state, [key]: value }; refresh(n => n + 1); },
    updateMulti: (_, patch) => { writes.push(patch); state = { ...state, ...patch }; refresh(n => n + 1); }
  });
  const host = document.createElement('div'); document.body.append(host);
  const root = ReactDOMClient.createRoot(host); roots.add(root);
  function Component() {
    refresh = React.useState(0)[1]; readRefs = []; readStates = []; readIds = [];
    ctx.toolData = { migration: state }; return tool.render(ctx);
  }
  act(() => root.render(React.createElement(Component)));
  const ui = {
    host, writes, award, celebrate,
    get state() { return state; },
    get summary() { return host.querySelector('[data-journey-summary]'); },
    get status() { return host.querySelector('[data-journey-status]'); },
    get context() { return host.querySelector('[data-journey-context]'); },
    get heading() { return host.querySelector('[data-journey-heading]'); },
    element(name) { return host.querySelector('[data-journey-' + name + ']'); },
    choice(index = 0) { return host.querySelector('[data-journey-choice="' + index + '"]'); },
    click(name) { const element = ui.element(name); expect(element).not.toBeNull(); element.focus(); act(() => element.click()); },
    choose(index = 0) { const element = ui.choice(index); expect(element).not.toBeNull(); element.focus(); act(() => element.click()); },
    set(patch) { act(() => { state = { ...state, ...patch }; refresh(n => n + 1); }); },
    async resolve(request, value) { await act(async () => { request.resolve(value); await Promise.resolve(); await Promise.resolve(); }); },
    async reject(request) { await act(async () => { request.reject(new Error('Offline')); await Promise.resolve(); await Promise.resolve(); }); },
    unmount() { act(() => root.unmount()); roots.delete(root); host.remove(); },
    abandon(patch) {
      const refs = readRefs.slice(), states = readStates.slice(), ids = readIds.slice(); let r = 0, s = 0, i = 0;
      const replay = { ...React, useRef: () => refs[r++], useState: () => states[s++], useId: () => ids[i++], useEffect() {}, useCallback: fn => fn };
      return tool.render({ ...ctx, React: replay, toolData: { migration: { ...state, ...patch } } });
    }
  };
  return ui;
}
function expectPreservedWork(ui) {
  expect(ui.state.inquiry).toEqual({ hypothesis: 'Keep my prediction.' });
  expect(ui.state.flightStudyObservations).toEqual({ drafts: { 'goose:wing': 'Keep my evidence.' } });
  expect(ui.writes.every(patch => Object.keys(patch).every(key => key.startsWith('challenge')))).toBe(true);
}
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
  vi.stubGlobal('matchMedia', query => ({ matches: true, media: query, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('requestAnimationFrame', () => 1); vi.stubGlobal('cancelAnimationFrame', () => {});
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(620);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function() {
    if (!this._journeyTestContext) this._journeyTestContext = new Proxy({ canvas: this,
      measureText: text => ({ width: String(text).length * 6 }),
      createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} })
    }, { get: (target, key) => key in target ? target[key] : () => {}, set: (target, key, value) => { target[key] = value; return true; } });
    return this._journeyTestContext;
  });
  resetStemLab(); tool = loadTool('stem_lab/stem_tool_migration.js', 'migration');
});
afterEach(async () => {
  await act(async () => { roots.forEach(root => root.unmount()); roots.clear(); });
  document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe('Navigate Your Flock accessible decision flow', () => {
  it('starts with a named focus target and empty persistent status, without changing learner work', () => {
    const first = fixture(), second = fixture();
    for (const ui of [first, second]) {
      expect(ui.summary.tabIndex).toBe(-1); expect(ui.summary.getAttribute('role')).toBe('group');
      expect(ui.summary.getAttribute('aria-labelledby')).toBe(ui.heading.id);
      expect(ui.summary.getAttribute('aria-describedby')).toBe(ui.context.id);
      expect(ui.status.getAttribute('role')).toBe('status'); expect(ui.status.getAttribute('aria-live')).toBe('polite');
      expect(ui.status.getAttribute('aria-atomic')).toBe('true'); expect(ui.status.textContent).toBe('');
      expect(ui.element('start').type).toBe('button'); expect(ui.writes).toEqual([]);
    }
    expect(first.heading.id).not.toBe(second.heading.id); expect(first.context.id).not.toBe(second.context.id);
  });

  it('keeps the same focused summary and live region when starting and advancing offline', () => {
    const ui = fixture(), summary = ui.summary, status = ui.status;
    ui.click('start');
    expect(document.activeElement).toBe(summary); expect(ui.summary).toBe(summary); expect(ui.status).toBe(status);
    expect(ui.heading.textContent).toBe('Decision 1'); expect(ui.context.textContent).toContain('mountain range');
    expect(status.textContent).toContain(ui.context.textContent); expect(ui.host.querySelectorAll('[data-journey-choice]')).toHaveLength(3);
    const firstScenario = ui.context.textContent;
    ui.choose();
    expect(document.activeElement).toBe(summary); expect(ui.summary).toBe(summary); expect(ui.status).toBe(status);
    expect(ui.heading.textContent).toBe('Decision 2'); expect(ui.context.textContent).not.toBe(firstScenario);
    expect(status.textContent).toContain(ui.state.challengeResult); expect(status.textContent).toContain(ui.context.textContent);
    expect(ui.state.challengeLog).toHaveLength(1); expect(ui.state.challengeStep).toBe(1); expectPreservedWork(ui);
  });

  it('describes each choice with its scenario and all normalized visible tradeoffs', () => {
    const ui = fixture(active({ challengeChoices: { scenario: 'Compare the three kinds of cost.', choices: [
      { ...choice, energy_cost: '-999', distance_gain: '70000', flock_change: '2.6' },
      { ...choice, label: 'Rest', energy_cost: '12', distance_gain: Infinity, flock_change: 'not a number' }
    ] } }));
    const expected = [['Energy: -100 percentage points.', 'Distance: 20000 miles forward.', 'Flock: +3 birds.'],
      ['Energy: +12 percentage points.', 'Distance: 0 miles forward.', 'Flock: 0 birds.']];
    for (let index = 0; index < expected.length; index++) {
      const button = ui.choice(index), ids = button.getAttribute('aria-describedby').split(/\s+/);
      expect(button.type).toBe('button'); expect(button.getAttribute('aria-label')).toContain(button.querySelector('.migration-journey-choice-label').textContent);
      expect(ids).toContain(ui.context.id);
      const descriptions = ids.map(id => ui.host.querySelector('[id="' + id + '"]'));
      expect(descriptions.every(Boolean)).toBe(true);
      const text = descriptions.map(node => node.textContent).join(' ');
      for (const effect of expected[index]) expect(text).toContain(effect);
      expect(text).toContain(ui.context.textContent);
    }
    ui.choose(0); expect(ui.state).toMatchObject({ challengeEnergy: 0, challengeDistRemaining: 0, challengeFlockSize: 53 });
  });

  it('focuses completion, awards once even on duplicate activation, and restarts in the same summary', () => {
    const ui = fixture(active({ challengeDistRemaining: 300 })), summary = ui.summary, status = ui.status;
    const button = ui.choice(), handler = committedHandler(button); button.focus();
    act(() => { handler(); handler(); });
    expect(ui.state.challengeComplete).toBe(true); expect(ui.state.challengeLog).toHaveLength(1);
    expect(ui.award).toHaveBeenCalledTimes(1); expect(ui.celebrate).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(summary); expect(ui.summary).toBe(summary); expect(ui.status).toBe(status);
    expect(ui.heading.textContent).toBe('Migration Complete!'); expect(status.textContent).toContain('50 of 50 birds arrived safely.');
    expect(ui.choice()).toBeNull(); expect(ui.element('restart').type).toBe('button');
    act(() => handler()); expect(ui.award).toHaveBeenCalledTimes(1);
    ui.click('restart'); expect(document.activeElement).toBe(summary); expect(ui.summary).toBe(summary);
    expect(ui.heading.textContent).toBe('Decision 1'); expect(ui.state.challengeLog).toEqual([]);
    expect(ui.state).toMatchObject({ challengeEnergy: 100, challengeDistRemaining: 3000, challengeFlockSize: 50, challengeComplete: false });
    expectPreservedWork(ui);
  });

  it('explains a failed journey at the retained focus target without an arrival award', () => {
    const ui = fixture(active({ challengeFlockSize: 1, challengeChoices: decision(undefined, { flock_change: -2 }) })), summary = ui.summary;
    ui.choose(); expect(document.activeElement).toBe(summary); expect(ui.heading.textContent).toBe('Migration Failed');
    expect(ui.context.textContent).toContain('Too many birds were lost.'); expect(ui.context.textContent).toContain('2300 of 3000 miles');
    expect(ui.status.textContent).toContain('Migration Failed'); expect(ui.choice()).toBeNull(); expect(ui.element('restart')).not.toBeNull();
    expect(ui.award).not.toHaveBeenCalled(); expectPreservedWork(ui);
  });

  it('submits one decision, removes old choices while loading, and rejects replayed handlers', () => {
    const request = deferred(), backend = vi.fn(() => request.promise), ui = fixture(active(), backend);
    const button = ui.choice(), handler = committedHandler(button); button.focus();
    act(() => { handler(); handler(); });
    expect(ui.state.challengeStep).toBe(1); expect(ui.state.challengeLog).toHaveLength(1); expect(backend).toHaveBeenCalledTimes(1);
    expect(ui.state.challengeLoading).toBe(true); expect(ui.choice()).toBeNull(); expect(ui.element('offline').type).toBe('button');
    expect(ui.status.textContent).toContain('Scouting ahead'); expect(document.activeElement).toBe(ui.summary);
    const writes = ui.writes.length; act(() => handler()); expect(ui.writes).toHaveLength(writes);
  });

  it('starts only once when the same action is replayed before the next commit', () => {
    const request = deferred(), backend = vi.fn(() => request.promise), ui = fixture({}, backend);
    const button = ui.element('start'), handler = committedHandler(button); button.focus();
    act(() => { handler(); handler(); });
    expect(backend).toHaveBeenCalledTimes(1);
    expect(ui.writes.filter(patch => patch.challengeActive === true)).toHaveLength(1);
    expect(ui.state).toMatchObject({ challengeActive: true, challengeStep: 0, challengeLoading: true });
    expect(ui.state.challengeLog).toEqual([]); expect(document.activeElement).toBe(ui.summary);
    expectPreservedWork(ui);
  });

  it('uses one local decision when recovery is replayed before the next commit', () => {
    const request = deferred(), ui = fixture({}, () => request.promise); ui.click('start');
    const button = ui.element('offline'), handler = committedHandler(button), writes = ui.writes.length;
    button.focus(); act(() => { handler(); handler(); });
    const recovery = ui.writes.slice(writes);
    expect(recovery).toHaveLength(1); expect(recovery[0].challengeChoices).toBe(ui.state.challengeChoices);
    // The pending request picked Thunderstorm; a duplicate fallback would use
    // the earlier render's Clear weather and silently replace this context.
    expect(ui.state.challengeWeather).toBe('Thunderstorm');
    expect(ui.context.textContent).toContain('thunderstorm'); expect(ui.context.textContent).not.toContain('clear');
    expect(ui.state.challengeLoading).toBe(false); expect(document.activeElement).toBe(ui.summary);
    expectPreservedWork(ui);
  });

  it('lets the learner use a local decision immediately and ignores the superseded reply', async () => {
    const request = deferred(), ui = fixture({}, () => request.promise), summary = ui.summary, status = ui.status;
    ui.click('start'); expect(ui.state.challengeLoading).toBe(true); expect(ui.choice()).toBeNull();
    ui.click('offline'); expect(ui.state.challengeLoading).toBe(false); expect(document.activeElement).toBe(summary);
    const saved = clone(ui.state), writes = ui.writes.length;
    await ui.resolve(request, JSON.stringify(decision('Superseded remote decision.')));
    expect(ui.state).toEqual(saved); expect(ui.writes).toHaveLength(writes); expect(ui.status).toBe(status);
    expect(ui.context.textContent).not.toContain('Superseded'); expect(ui.element('offline')).toBeNull(); expectPreservedWork(ui);
  });

  it('announces a ready reply without taking focus back from another control', async () => {
    const request = deferred(), ui = fixture({}, () => request.promise), status = ui.status;
    ui.click('start'); const other = ui.host.querySelector('[id="migration-navigation-method-stars"]') || ui.host.querySelector('.migration-disclosure-trigger');
    expect(other).not.toBeNull(); other.focus();
    await ui.resolve(request, JSON.stringify(decision('A clear valley opens ahead.')));
    expect(document.activeElement).toBe(other); expect(ui.status).toBe(status);
    expect(status.textContent).toContain('A clear valley opens ahead.'); expect(ui.choice()).not.toBeNull();
  });

  it('finishes an owned background reply after tab navigation without focus theft or old-handler actions', async () => {
    const request = deferred(), ui = fixture(active(), () => request.promise), oldHandler = committedHandler(ui.choice());
    ui.choose(); const tab = ui.host.querySelector('[data-migration-tab="world"]'); tab.focus();
    act(() => tab.click()); expect(ui.summary).toBeNull();
    const before = ui.writes.length; act(() => oldHandler()); expect(ui.writes).toHaveLength(before);
    await ui.resolve(request, JSON.stringify(decision('The next sheltered stop.')));
    expect(document.activeElement).toBe(tab); expect(ui.state.challengeLoading).toBe(false);
    expect(ui.state.challengeChoices.scenario).toBe('The next sheltered stop.');
    const navigate = ui.host.querySelector('[data-migration-tab="navigate"]'); navigate.focus(); act(() => navigate.click());
    expect(document.activeElement).toBe(navigate); expect(ui.context.textContent).toBe('The next sheltered stop.');
  });

  it('recovers a restored loading flag with no live backend request', () => {
    const backend = vi.fn(), ui = fixture(active({ challengeLoading: true, challengeChoices: null, challengeStep: 3 }), backend);
    expect(ui.choice()).toBeNull(); ui.click('offline');
    expect(ui.state.challengeLoading).toBe(false); expect(ui.heading.textContent).toBe('Decision 4');
    expect(ui.host.querySelectorAll('[data-journey-choice]')).toHaveLength(3); expect(document.activeElement).toBe(ui.summary);
    expect(backend).not.toHaveBeenCalled(); expectPreservedWork(ui);
  });

  it('falls back to local decisions when the backend throws synchronously', () => {
    const ui = fixture({}, () => { throw new Error('No connection'); }); ui.click('start');
    expect(ui.state.challengeLoading).toBe(false); expect(ui.choice()).not.toBeNull(); expect(document.activeElement).toBe(ui.summary);
  });

  it('falls back to local decisions when a request rejects', async () => {
    const request = deferred(), ui = fixture({}, () => request.promise); ui.click('start'); await ui.reject(request);
    expect(ui.state.challengeLoading).toBe(false); expect(ui.choice()).not.toBeNull(); expect(ui.context.textContent).toContain('mountain range');
  });

  it('falls back to local decisions for malformed remote choice data', async () => {
    const request = deferred(), ui = fixture({}, () => request.promise); ui.click('start');
    await ui.resolve(request, '{"scenario":"Incomplete reply","choices":"keep flying"}');
    expect(ui.state.challengeLoading).toBe(false); expect(ui.host.querySelectorAll('[data-journey-choice]')).toHaveLength(3);
    expect(ui.context.textContent).not.toContain('Incomplete reply');
  });

  it('ignores a reply after the tool is unmounted', async () => {
    const request = deferred(), ui = fixture({}, () => request.promise); ui.click('start'); ui.unmount();
    const writes = ui.writes.length, saved = clone(ui.state); await ui.resolve(request, JSON.stringify(decision('Too late.')));
    expect(ui.writes).toHaveLength(writes); expect(ui.state).toEqual(saved);
  });

  it('keeps committed choices actionable when a different render is abandoned', () => {
    const ui = fixture(active()), handler = committedHandler(ui.choice());
    ui.abandon({ challengeComplete: true, challengeChoices: null });
    act(() => handler()); expect(ui.state.challengeStep).toBe(1); expect(ui.state.challengeLog).toHaveLength(1);
    expect(ui.state.challengeComplete).not.toBe(true); expect(document.activeElement).toBe(ui.summary);
  });

  it('does not replay an earlier round after newer choices have been committed', () => {
    const ui = fixture(active()), oldHandler = committedHandler(ui.choice()); ui.choose();
    expect(ui.heading.textContent).toBe('Decision 2'); ui.choose(2);
    const saved = clone(ui.state), writes = ui.writes.length; act(() => oldHandler());
    expect(ui.state).toEqual(saved); expect(ui.writes).toHaveLength(writes); expect(ui.state.challengeLog).toHaveLength(2);
    expectPreservedWork(ui);
  });
});
