import fs from 'node:fs';
import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

let React, ReactDOM, act, config, now = 0, nextFrame = 0;
const frames = new Map(), apps = [];
beforeAll(() => {
  const context = new Proxy({}, { get: (_, key) => key === 'measureText' ? () => ({ width: 10 }) : () => ({ addColorStop() {} }) });
  window.HTMLCanvasElement.prototype.getContext = () => context;
  for (const [key, value] of [['offsetWidth', 540], ['offsetHeight', 400]]) Object.defineProperty(window.HTMLElement.prototype, key, { configurable: true, get: () => value });
  window.requestAnimationFrame = globalThis.requestAnimationFrame = callback => { frames.set(++nextFrame, callback); return nextFrame; };
  window.cancelAnimationFrame = globalThis.cancelAnimationFrame = id => frames.delete(id);
  window.ResizeObserver = globalThis.ResizeObserver = class { observe() {} disconnect() {} unobserve() {} };
  window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  window.HTMLElement.prototype.scrollIntoView = () => {};
  window.StemLab = { registerTool(id, value) { if (id === 'plateTectonics') config = value; }, ensureThree: () => new Promise(() => {}), makeBayViewer: () => ({}) };
  for (const file of ['desktop/web-app/node_modules/react/umd/react.development.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js', process.env.PT_GUIDED_SOURCE || 'stem_lab/stem_tool_platetectonics.js']) (0, eval)(fs.readFileSync(file, 'utf8'));
  React = window.React; ReactDOM = window.ReactDOM; act = React.act || React.unstable_act;
});
beforeEach(() => {
  frames.clear(); now = 0;
  window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  for (const clock of new Set([globalThis.performance, window.performance])) vi.spyOn(clock, 'now').mockImplementation(() => now);
});
afterEach(() => { while (apps.length) { const app = apps.pop(); act(() => app.root.unmount()); app.host.remove(); if (app.restore) app.restore(); } frames.clear(); vi.restoreAllMocks(); });
function mount(initial = {}) {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOM.createRoot(host), inquiryWrites = vi.fn(), depthWrites = vi.fn(), announce = vi.fn(), xp = vi.fn(), beep = vi.fn();
  let current = initial;
  function Host({ seed }) {
    const [saved, setSaved] = React.useState(seed); current = saved;
    return React.createElement(window.AlloTectonicsInteractive, {
      savedBoundaryInquiry: saved.inquiry, depthRecords: saved.records, darkMode: true, awardXP: xp, beep, announceToSR: announce,
      onRecordBoundaryInquiry(record) { inquiryWrites(record); setSaved(prev => ({ ...prev, inquiry: record })); },
      onRecordDepths(record) { depthWrites(record); setSaved(prev => ({ ...prev, records: { ...prev.records, [record.mode]: record } })); },
      onClearDepths() { setSaved(prev => ({ ...prev, records: {} })); }
    });
  }
  const remount = () => { const seed = structuredClone(current); act(() => root.render(null)); act(() => root.render(React.createElement(React.StrictMode, null, React.createElement(Host, { seed })))); };
  remount();
  const click = selector => act(() => host.querySelector(selector).click());
  const frame = () => { now += 1000; act(() => { for (const [id, callback] of [...frames]) if (frames.delete(id)) callback(now); }); };
  const app = { host, root, inquiryWrites, depthWrites, announce, xp, beep, remount, click, frame, state: () => current };
  apps.push(app); return app;
}
function input(app, selector, value) {
  const node = app.host.querySelector(selector), prototype = node.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : node.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, String(value));
  act(() => node.dispatchEvent(new window.Event(node.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })));
}
function mountRegistered(initial = {}) {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOM.createRoot(host), xp = vi.fn(), beep = vi.fn(), announce = vi.fn(), notices = vi.fn();
  const Interactive = window.AlloTectonicsInteractive;
  let current, patchData, interactiveProps;
  window.AlloTectonicsInteractive = function RegisteredInteractive(props) { interactiveProps = props; return React.createElement(Interactive, props); };
  function Host() {
    const [toolData, setToolData] = React.useState({ plateTectonics: { simTab: 'sim', _ptPicked: true, _ptCategory: 'sim_quiz', ptShelfTopics: { sim: true }, ...initial } });
    current = toolData.plateTectonics;
    patchData = patch => setToolData(previous => ({ ...previous, plateTectonics: { ...previous.plateTectonics, ...patch } }));
    return config.render({
      React, toolData, setToolData, setStemLabTool: () => {}, setStemLabTab: () => {}, setToolSnapshots: () => {}, toolSnapshots: [], addToast: notices, announceToSR: announce,
      awardXP: xp, getXP: () => 0, beep, celebrate: notices, canvasNarrate: () => {}, canvasA11yDesc: () => {},
      gradeLevel: '7th', stemLabTab: 'explore', stemLabTool: 'plateTectonics', props: {}, srOnly: {}, isDark: true, isContrast: false, pal: null,
      icons: new Proxy({}, { get: () => () => React.createElement('span') }), a11yClick: fn => ({ onClick: fn }), t: (_key, fallback) => fallback
    });
  }
  act(() => root.render(React.createElement(React.StrictMode, null, React.createElement(Host))));
  const app = {
    host, root, xp, beep, announce, notices, state: () => current, props: () => interactiveProps,
    click: selector => act(() => host.querySelector(selector).click()),
    patch: patch => act(() => patchData(patch)),
    frame: () => { now += 1000; act(() => { for (const [id, callback] of [...frames]) if (frames.delete(id)) callback(now); }); },
    restore: () => { window.AlloTectonicsInteractive = Interactive; }
  };
  apps.push(app); return app;
}
const plan = { rate: 5, years: 1200000, prediction: 'The descending slab will have deeper earthquakes.' };
function sample(mode, z = mode === 'convergent' ? 500 : 20, extra = {}) {
  return window.__alloPtDepthTrials.capture({ mode, years: 1200000, rate: 5, depthRunRate: 5, depthRunRateConstant: true, qlog: [{ z }], ...extra });
}
function records() { return Object.fromEntries(['convergent', 'divergent', 'transform'].map(mode => [mode, sample(mode)])); }
function setPlan(app) { input(app, '[data-pt-boundary-prediction]', plan.prediction); app.click('[data-pt-boundary-plan-save]'); }
function complete(app) {
  vi.spyOn(Math, 'random').mockImplementation(() => 0);
  setPlan(app);
  for (const mode of ['convergent', 'divergent', 'transform']) {
    app.click(`[data-pt-boundary-start="${mode}"]`); app.click('[data-pt-boundary-advance]'); app.click('[data-pt-depth-record]');
  }
}

describe('Guided boundary comparison uses deliberate matched observations', () => {
  it('validates settings and constant-rate history without upgrading older summaries', () => {
    const helper = window.__alloPtBoundaryInquiry;
    expect(helper.read({ version: 1, plan })).toEqual({ version: 1, plan });
    for (const patch of [{ rate: '5' }, { rate: 16 }, { years: 1230000 }, { prediction: '' }, { prediction: 'x'.repeat(801) }]) expect(helper.read({ version: 1, plan: { ...plan, ...patch } })).toBeNull();
    expect(helper.matched(plan, records())).toBe(true);
    const old = records(); delete old.transform.rateFromReset;
    expect(helper.matched(plan, old)).toBe(false);
    expect(window.__alloPtDepthTrials.valid(old.transform, 'transform')).toBe(true);
    expect(sample('transform', 20, { depthRunRateConstant: false })).not.toHaveProperty('rateFromReset');
  });
  it('canonically clones submitted records and rejects malformed or mismatched evidence', () => {
    const original = { version: 1, plan, submission: { ...plan, explanation: '500 km versus 20 km follows the descending slab.', records: records() } };
    const copy = window.__alloPtBoundaryInquiry.read(original);
    copy.submission.records.convergent.maxKm = 12;
    expect(original.submission.records.convergent.maxKm).toBe(500);
    const bad = structuredClone(original); bad.submission.records.divergent.years = 600000;
    expect(window.__alloPtBoundaryInquiry.read(bad)).toEqual({ version: 1, plan });
    bad.submission.records = null;
    expect(() => window.__alloPtBoundaryInquiry.read(bad)).not.toThrow();
  });
  it('saves only an explicit prediction and starts trials paused without replacing retained observations', () => {
    const kept = records(), app = mount({ records: kept });
    input(app, '[data-pt-boundary-prediction]', plan.prediction);
    expect(app.inquiryWrites).not.toHaveBeenCalled();
    app.click('[data-pt-boundary-plan-save]');
    expect(app.inquiryWrites).toHaveBeenCalledTimes(1);
    app.click('[data-pt-boundary-start="divergent"]');
    expect(app.host.querySelector('[data-pt-model-play]').textContent).toContain('Play');
    expect(app.host.querySelector('[data-pt-boundary-live]').textContent).toContain('0 model years');
    expect(app.state().records).toEqual(kept); expect(app.depthWrites).not.toHaveBeenCalled();
  });
  it('advances exactly twenty existing paused intervals and records each actual sample only on request', () => {
    const app = mount(); complete(app);
    for (const mode of ['convergent', 'divergent', 'transform']) expect(app.state().records[mode]).toMatchObject({ mode, years: 1200000, rate: 5, rateFromReset: 5, events: 20 });
    expect(app.depthWrites).toHaveBeenCalledTimes(3);
    expect(app.inquiryWrites).toHaveBeenCalledTimes(1);
    expect(app.host.querySelector('[data-pt-boundary-comparison-ready]').dataset.ptBoundaryComparisonReady).toBe('true');
    expect(app.host.querySelector('[data-pt-model-play]').textContent).toContain('Play');
    expect(app.xp).not.toHaveBeenCalled(); expect(app.beep).not.toHaveBeenCalled();
  });
  it('uses remaining intervals after a manual step and prevents overshooting the shared time', () => {
    const app = mount(); setPlan(app); app.click('[data-pt-boundary-start="divergent"]');
    vi.spyOn(Math, 'random').mockImplementation(() => 0);
    app.click('[data-pt-model-step]'); app.click('[data-pt-boundary-advance]'); app.click('[data-pt-depth-record]');
    expect(app.state().records.divergent).toMatchObject({ years: 1200000, events: 20 });
    expect(app.host.querySelector('[data-pt-sim-movement]')?.textContent || app.host.textContent).toContain('60 km');
    expect(app.host.querySelector('[data-pt-boundary-advance]').disabled).toBe(true);
    app.click('[data-pt-model-step]');
    expect(app.host.querySelector('[data-pt-boundary-live]').dataset.ptBoundaryLive).toBe('restart');
  });
  it('invalidates a rate change during the run even when the slider is returned to the original rate', () => {
    const app = mount(); setPlan(app); app.click('[data-pt-boundary-start="convergent"]');
    vi.spyOn(Math, 'random').mockImplementation(() => 0);
    app.click('[data-pt-model-step]');
    input(app, 'input[aria-label="Plate movement rate in centimeters per year"]', 7);
    input(app, 'input[aria-label="Plate movement rate in centimeters per year"]', 5);
    expect(app.host.querySelector('[data-pt-boundary-advance]').disabled).toBe(true);
    app.click('[data-pt-depth-record]');
    expect(app.state().records.convergent).not.toHaveProperty('rateFromReset');
    app.click('[data-pt-model-reset]'); app.click('[data-pt-boundary-advance]'); app.click('[data-pt-depth-record]');
    expect(app.state().records.convergent).toMatchObject({ years: 1200000, rateFromReset: 5 });
  });
  it('keeps an empty random trial empty rather than fabricating evidence or extending time', () => {
    const app = mount(); setPlan(app); app.click('[data-pt-boundary-start="divergent"]');
    vi.spyOn(Math, 'random').mockImplementation(() => 0.999999);
    app.click('[data-pt-boundary-advance]');
    expect(app.host.querySelector('[data-pt-depth-record]').disabled).toBe(true);
    expect(app.host.querySelector('[data-pt-boundary-live]').dataset.ptBoundaryLive).toBe('ready');
    expect(app.host.querySelector('[data-pt-boundary-guide]').textContent).toContain('Repeat an empty trial');
    expect(app.depthWrites).not.toHaveBeenCalled(); expect(app.inquiryWrites).toHaveBeenCalledTimes(1);
  });
  it('shows older records as readable unmatched evidence and prevents saving a controlled explanation', () => {
    const kept = records(); for (const record of Object.values(kept)) delete record.rateFromReset;
    const app = mount({ records: kept, inquiry: { version: 1, plan } });
    expect([...app.host.querySelectorAll('[data-pt-boundary-matched]')].map(node => node.dataset.ptBoundaryMatched)).toEqual(['false', 'false', 'false']);
    expect(app.host.querySelector('[data-pt-boundary-guide]').textContent).toContain('rate history is unknown');
    input(app, '[data-pt-boundary-explanation]', 'I compare the saved observations.');
    expect(app.host.querySelector('[data-pt-boundary-explanation-save]').disabled).toBe(true);
    expect(app.host.querySelectorAll('[data-pt-depth-sample]').length).toBe(3);
  });
  it('guards duplicate plan and explanation saves synchronously', () => {
    const app = mount({ records: records() });
    input(app, '[data-pt-boundary-prediction]', plan.prediction);
    act(() => { const button = app.host.querySelector('[data-pt-boundary-plan-save]'); button.click(); button.click(); });
    expect(app.inquiryWrites).toHaveBeenCalledTimes(1);
    input(app, '[data-pt-boundary-explanation]', 'The 500 km convergent focus lies in the descending slab; both other samples reach 20 km. These single-event samples may miss depths.');
    act(() => { const button = app.host.querySelector('[data-pt-boundary-explanation-save]'); button.click(); button.click(); });
    expect(app.inquiryWrites).toHaveBeenCalledTimes(2);
    expect(app.state().inquiry.submission.records.convergent.maxKm).toBe(500);
    expect(app.xp).not.toHaveBeenCalled();
  });
  it('freezes comparison evidence across later sample replacements, plan revisions and run resets', () => {
    const app = mount({ records: records(), inquiry: { version: 1, plan } });
    input(app, '[data-pt-boundary-explanation]', 'The descending slab explains 500 km rather than 20 km in this sample.'); app.click('[data-pt-boundary-explanation-save]');
    const frozen = structuredClone(app.state().inquiry.submission);
    vi.spyOn(Math, 'random').mockImplementation(() => 0);
    app.click('[data-pt-boundary-start="convergent"]'); app.click('[data-pt-boundary-advance]'); app.click('[data-pt-depth-record]');
    expect(app.state().records.convergent.maxKm).toBe(5);
    expect(app.state().inquiry.submission).toEqual(frozen);
    input(app, '[data-pt-boundary-rate]', 8); app.click('[data-pt-boundary-plan-save]'); app.click('[data-pt-model-reset]');
    expect(app.state().inquiry.plan.rate).toBe(8); expect(app.state().inquiry.submission).toEqual(frozen);
    expect(app.host.querySelector('[data-pt-boundary-frozen="convergent"]').textContent).toContain('500 km');
  });
  it('restores a saved plan quietly and leaves idle clocks without saves, completion, rewards or sounds', () => {
    window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
    const app = mount({ records: records(), inquiry: { version: 1, plan } });
    app.remount(); for (let i = 0; i < 60; i++) app.frame();
    expect(app.host.querySelector('[data-pt-model-play]').textContent).toContain('Play');
    expect(app.host.querySelector('[data-pt-boundary-prediction]').value).toBe(plan.prediction);
    expect(app.state().inquiry).toEqual({ version: 1, plan });
    expect(app.inquiryWrites).not.toHaveBeenCalled(); expect(app.depthWrites).not.toHaveBeenCalled(); expect(app.announce).not.toHaveBeenCalled(); expect(app.xp).not.toHaveBeenCalled(); expect(app.beep).not.toHaveBeenCalled();
    window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  });
  it('requires written transfer evidence before feedback and never earns a reward for checking', () => {
    const app = mount();
    input(app, '[data-pt-boundary-transfer-choice]', 'transform');
    expect(app.host.querySelector('[data-pt-boundary-transfer-check]').disabled).toBe(true);
    input(app, '[data-pt-boundary-transfer-reason]', 'The deepest dot is 380 km below the surface.'); app.click('[data-pt-boundary-transfer-check]');
    expect(app.host.querySelector('[data-pt-boundary-transfer-feedback]').textContent).toContain('Reconsider the 380 km focus');
    input(app, '[data-pt-boundary-transfer-choice]', 'convergent');
    expect(app.host.querySelector('[data-pt-boundary-transfer-feedback]')).toBeNull();
    app.click('[data-pt-boundary-transfer-check]');
    expect(app.host.querySelector('[data-pt-boundary-transfer-feedback]').textContent).toContain('descending slab');
    expect(app.inquiryWrites).not.toHaveBeenCalled(); expect(app.xp).not.toHaveBeenCalled(); expect(app.beep).not.toHaveBeenCalled();
  });
  it('records directly from guided controls only at the paused shared time', () => {
    const app = mount(); setPlan(app); app.click('[data-pt-boundary-start="transform"]');
    expect(app.host.querySelector('[data-pt-boundary-record]').disabled).toBe(true);
    vi.spyOn(Math, 'random').mockImplementation(() => 0);
    app.click('[data-pt-boundary-advance]');
    expect(app.host.querySelector('[data-pt-boundary-current-sample]').textContent).toContain('20 events');
    expect(app.depthWrites).not.toHaveBeenCalled(); app.click('[data-pt-boundary-record]');
    expect(app.state().records.transform).toMatchObject({ years: 1200000, rateFromReset: 5, events: 20 });
    expect(app.host.querySelector('[data-pt-boundary-record]').textContent).toContain('Replace saved Transform sample');
    app.click('[data-pt-model-step]'); expect(app.host.querySelector('[data-pt-boundary-record]').disabled).toBe(true);
  });
  it('attaches a checked transfer response only when the student explicitly saves the comparison', () => {
    const app = mount({ records: records(), inquiry: { version: 1, plan } });
    input(app, '[data-pt-boundary-transfer-choice]', 'convergent'); input(app, '[data-pt-boundary-transfer-reason]', 'The 380 km focus fits a slab descending inland.'); app.click('[data-pt-boundary-transfer-check]');
    expect(app.inquiryWrites).not.toHaveBeenCalled();
    input(app, '[data-pt-boundary-explanation]', 'A 500 km convergent focus contrasts with 20 km in the other samples.'); app.click('[data-pt-boundary-explanation-save]');
    expect(app.state().inquiry.submission).toMatchObject({ transferChoice: 'convergent', transferReason: 'The 380 km focus fits a slab descending inland.' });
    expect(app.host.querySelector('[data-pt-boundary-submission]').textContent).toContain('Transfer response: Convergent. The 380 km focus');
  });
  it('persists a guided prediction through the real tool parent and restores a closed shelf paused and quiet', () => {
    window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
    const app = mountRegistered({ ptDepthTrials: records() });
    input(app, '[data-pt-boundary-prediction]', plan.prediction); app.click('[data-pt-boundary-plan-save]');
    expect(app.state().ptBoundaryInquiry).toEqual({ version: 1, plan });
    input(app, '[data-pt-boundary-transfer-choice]', 'convergent');
    input(app, '[data-pt-boundary-transfer-reason]', 'The 380 km focus fits a descending slab.'); app.click('[data-pt-boundary-transfer-check]');
    input(app, '[data-pt-boundary-explanation]', 'The sinking plate has the deeper recorded earthquakes.'); app.click('[data-pt-boundary-explanation-save]');
    app.click('[data-pt-shelf-close]'); expect(app.host.querySelector('[data-pt-boundary-guide]')).toBeNull();
    app.click('[data-pt-shelf-open]');
    expect(app.host.querySelector('[data-pt-boundary-prediction]').value).toBe(plan.prediction);
    expect(app.host.querySelector('[data-pt-model-play]').textContent).toContain('Play');
    expect(app.host.querySelector('[data-pt-boundary-transfer-choice]').value).toBe('convergent');
    expect(app.host.querySelector('[data-pt-boundary-transfer-reason]').value).toBe('The 380 km focus fits a descending slab.');
    expect(app.host.querySelector('[data-pt-boundary-transfer-feedback]')).toBeNull();
    input(app, '[data-pt-boundary-explanation]', 'Revised explanation: a descending slab accounts for 500 km compared with 20 km.'); app.click('[data-pt-boundary-explanation-save]');
    expect(app.state().ptBoundaryInquiry.submission).toMatchObject({ explanation: 'Revised explanation: a descending slab accounts for 500 km compared with 20 km.', transferChoice: 'convergent', transferReason: 'The 380 km focus fits a descending slab.' });
    const kept = structuredClone(app.state().ptBoundaryInquiry);
    const announcements = app.announce.mock.calls.length, notices = app.notices.mock.calls.length, state = structuredClone(app.state());
    for (let i = 0; i < 60; i++) app.frame();
    expect(app.state()).toEqual(state); expect(app.state().ptBoundaryInquiry).toEqual(kept); expect(app.state().ptDepthTrials).toEqual(records());
    expect(app.announce).toHaveBeenCalledTimes(announcements); expect(app.notices).toHaveBeenCalledTimes(notices); expect(app.xp).not.toHaveBeenCalled(); expect(app.beep).not.toHaveBeenCalled();
    window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  });
  it('validates real parent callbacks and merges a saved comparison with newer unrelated tool data', () => {
    const app = mountRegistered({ ptDepthTrials: records(), ptBoundaryInquiry: { version: 1, plan }, note: 'earlier' });
    const callback = app.props().onRecordBoundaryInquiry;
    expect(typeof callback).toBe('function');
    app.patch({ note: 'newer', ptForce: { observations: [{ a: 'cut', choice: 1, vBefore: 6, vAfter: 3, t: 3 }] } });
    const before = structuredClone(app.state());
    act(() => callback({ version: 1, plan: { ...plan, rate: '5' } }));
    expect(app.state()).toEqual(before);
    act(() => callback({ version: 1, plan, submission: { ...plan, explanation: 'The descending slab reaches 500 km; the other two recorded samples reach 20 km.', records: records() } }));
    expect(app.state()).toMatchObject({ note: 'newer', ptForce: before.ptForce, ptBoundaryInquiry: { submission: { records: { convergent: { maxKm: 500 } } } } });
    const completed = structuredClone(app.state().ptBoundaryInquiry.submission), afterSave = structuredClone(app.state());
    act(() => callback({ version: 1, plan, submission: { ...plan, explanation: 'Invalid evidence', records: {} } }));
    expect(app.state()).toEqual(afterSave);
    act(() => callback({ version: 1, plan: { ...plan, rate: 7 } }));
    expect(app.state().ptBoundaryInquiry.plan.rate).toBe(7);
    expect(app.state().ptBoundaryInquiry.submission).toEqual(completed);
    expect(app.state().ptDepthTrials).toEqual(before.ptDepthTrials);
    expect(app.xp).not.toHaveBeenCalled(); expect(app.beep).not.toHaveBeenCalled(); expect(app.notices).not.toHaveBeenCalled();
  });
  it('saves application evidence independently of an unmatched current plan and guards duplicate writes', () => {
    const frozen = { ...plan, explanation: 'The original comparison uses a descending slab and recorded depths.', records: records() };
    const app = mount({ records: records(), inquiry: { version: 1, plan: { ...plan, rate: 8 }, submission: frozen } });
    expect(app.host.querySelector('[data-pt-boundary-explanation-save]').disabled).toBe(true);
    expect(app.host.querySelector('[data-pt-boundary-application-context]').textContent).toContain('5 cm/year');
    expect(app.host.querySelector('[data-pt-boundary-application-status]').dataset.ptBoundaryApplicationStatus).toBe('draft');
    expect(app.host.querySelector('[data-pt-boundary-application-save]').disabled).toBe(true);
    input(app, '[data-pt-boundary-transfer-choice]', 'transform');
    input(app, '[data-pt-boundary-transfer-reason]', 'My initial choice emphasizes sliding, but the 380 km focus needs explanation.');
    app.click('[data-pt-boundary-transfer-check]');
    expect(app.host.querySelector('[data-pt-boundary-application-status]').dataset.ptBoundaryApplicationStatus).toBe('ready-to-save');
    expect(app.inquiryWrites).not.toHaveBeenCalled();
    act(() => { const button = app.host.querySelector('[data-pt-boundary-application-save]'); button.click(); button.click(); });
    expect(app.inquiryWrites).toHaveBeenCalledTimes(1);
    const submitted = app.state().inquiry.submission;
    expect(submitted).toEqual({ ...frozen, transferChoice: 'transform', transferReason: 'My initial choice emphasizes sliding, but the 380 km focus needs explanation.' });
    expect(app.state().inquiry.plan.rate).toBe(8);
    expect(app.host.querySelector('[data-pt-boundary-application-status]').dataset.ptBoundaryApplicationStatus).toBe('saved');
    expect(app.host.querySelector('[data-pt-boundary-application-save]').disabled).toBe(true);
    app.remount();
    expect(app.host.querySelector('[data-pt-boundary-transfer-reason]').value).toBe(submitted.transferReason);
    expect(app.host.querySelector('[data-pt-boundary-transfer-feedback]')).toBeNull();
    const before = structuredClone(app.state()), announced = app.announce.mock.calls.length;
    for (let i = 0; i < 60; i++) app.frame();
    expect(app.state()).toEqual(before); expect(app.inquiryWrites).toHaveBeenCalledTimes(1); expect(app.announce).toHaveBeenCalledTimes(announced);
    expect(app.xp).not.toHaveBeenCalled(); expect(app.beep).not.toHaveBeenCalled();
  });
  it('keeps a checked application answer as a draft until a comparison exists', () => {
    const app = mount({ inquiry: { version: 1, plan } });
    input(app, '[data-pt-boundary-transfer-choice]', 'convergent'); input(app, '[data-pt-boundary-transfer-reason]', 'The focus at 380 km lies inland from the trench.'); app.click('[data-pt-boundary-transfer-check]');
    expect(app.host.querySelector('[data-pt-boundary-transfer-feedback]').textContent).toContain('descending slab');
    expect(app.host.querySelector('[data-pt-boundary-application-status]').dataset.ptBoundaryApplicationStatus).toBe('needs-comparison');
    expect(app.host.querySelector('[data-pt-boundary-application-save]').disabled).toBe(true);
    expect(app.inquiryWrites).not.toHaveBeenCalled();
  });
  it('invalidates an immediate application edit before a stale Save handler can write it', () => {
    const frozen = { ...plan, explanation: 'Original explanation.', records: records() };
    const app = mount({ inquiry: { version: 1, plan, submission: frozen } });
    input(app, '[data-pt-boundary-transfer-choice]', 'convergent'); input(app, '[data-pt-boundary-transfer-reason]', 'A 380 km focus fits the descending slab.'); app.click('[data-pt-boundary-transfer-check]');
    const reason = app.host.querySelector('[data-pt-boundary-transfer-reason]'), save = app.host.querySelector('[data-pt-boundary-application-save]');
    act(() => {
      Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(reason, 'Changed evidence has not been checked.');
      reason.dispatchEvent(new window.Event('input', { bubbles: true })); save.click();
    });
    expect(app.inquiryWrites).not.toHaveBeenCalled(); expect(app.state().inquiry.submission).toEqual(frozen);
    expect(app.host.querySelector('[data-pt-boundary-application-status]').dataset.ptBoundaryApplicationStatus).toBe('draft');
    input(app, '[data-pt-boundary-transfer-reason]', 'x'.repeat(801)); app.click('[data-pt-boundary-transfer-check]');
    expect(app.host.querySelector('[data-pt-boundary-application-save]').disabled).toBe(true);
    expect(app.host.querySelector('[data-pt-boundary-transfer-feedback]')).toBeNull();
    expect(app.inquiryWrites).not.toHaveBeenCalled();
  });
  it('shows a truthful empty sample and restarts only the live boundary without replacing prior evidence', () => {
    const kept = records(), app = mount({ records: kept, inquiry: { version: 1, plan } });
    const random = vi.spyOn(Math, 'random').mockImplementation(() => 0.999999);
    app.click('[data-pt-boundary-start="divergent"]'); app.click('[data-pt-boundary-advance]');
    const empty = app.host.querySelector('[data-pt-boundary-empty-sample]');
    expect(empty.textContent).toContain('0 recorded events after 1.2 million model years');
    expect(empty.textContent).toContain('does not show that this boundary never has earthquakes');
    expect(app.host.querySelector('[data-pt-boundary-record]').disabled).toBe(true);
    const announced = app.announce.mock.calls.length;
    act(() => { const restart = app.host.querySelector('[data-pt-boundary-empty-restart]'); restart.click(); restart.click(); });
    expect(app.announce).toHaveBeenCalledTimes(announced + 1);
    expect(app.host.querySelector('[data-pt-boundary-empty-sample]')).toBeNull();
    expect(app.host.querySelector('[data-pt-boundary-live]').textContent).toContain('Divergent, 5 cm/year, 0 model years');
    expect(app.host.querySelector('[data-pt-boundary-advance]').disabled).toBe(false);
    expect(app.state()).toEqual({ records: kept, inquiry: { version: 1, plan } });
    expect(app.inquiryWrites).not.toHaveBeenCalled(); expect(app.depthWrites).not.toHaveBeenCalled();
    random.mockImplementation(() => 0); app.click('[data-pt-boundary-advance]'); app.click('[data-pt-boundary-record]');
    expect(app.state().records.divergent).toMatchObject({ events: 20, rateFromReset: 5, years: 1200000 });
    expect(app.state().records.convergent).toEqual(kept.convergent);
  });
  it('shows actual band counts alongside live and recorded samples while frozen comparison counts stay unchanged', () => {
    const kept = records(); kept.convergent = window.__alloPtDepthTrials.capture({ mode: 'convergent', qlog: [5, 20, 150, 350, 650].map(z => ({ z })), rate: 5, years: 1200000, depthRunRate: 5, depthRunRateConstant: true });
    const app = mount({ records: kept, inquiry: { version: 1, plan } });
    const counts = context => [...app.host.querySelector('[data-pt-boundary-band-counts="' + context + '"]').querySelectorAll('[data-pt-boundary-band]')].map(node => Number(node.textContent));
    expect(counts('record-convergent')).toEqual([2, 1, 2]);
    input(app, '[data-pt-boundary-explanation]', 'The five-event sample includes shallow, intermediate and deep earthquakes.'); app.click('[data-pt-boundary-explanation-save]');
    expect(counts('frozen-convergent')).toEqual([2, 1, 2]);
    vi.spyOn(Math, 'random').mockImplementation(() => 0); app.click('[data-pt-boundary-start="convergent"]'); app.click('[data-pt-boundary-advance]');
    expect(counts('live')).toEqual([20, 0, 0]); expect(counts('record-convergent')).toEqual([2, 1, 2]);
    app.click('[data-pt-boundary-record]');
    expect(counts('record-convergent')).toEqual([20, 0, 0]); expect(counts('frozen-convergent')).toEqual([2, 1, 2]);
    expect(app.host.querySelector('[data-pt-boundary-band-counts="frozen-convergent"]').textContent).toContain('70–<300 km');
  });
  it('persists an application through the registered parent while preserving the frozen CER snapshot and comparison core', () => {
    const frozen = { ...plan, explanation: 'Original saved comparison.', records: records() };
    const cer = { claim: 'A sinking plate carries deep earthquake sources.', evidence: 'Five hundred km compared with twenty km.', reasoning: 'A slab accounts for the deep sources.', evidenceContext: { version: 1, availableEvidence: ['depths'], boundaryComparison: { ...structuredClone(frozen), transferChoice: 'convergent', transferReason: 'Earlier application evidence.' } } };
    const app = mountRegistered({ ptBoundaryInquiry: { version: 1, plan: { ...plan, rate: 8 }, submission: frozen }, ptDepthTrials: records(), ptCER: cer });
    input(app, '[data-pt-boundary-transfer-choice]', 'convergent'); input(app, '[data-pt-boundary-transfer-reason]', 'New application evidence uses the 380 km focus.'); app.click('[data-pt-boundary-transfer-check]'); app.click('[data-pt-boundary-application-save]');
    expect(app.state().ptBoundaryInquiry.submission).toEqual({ ...frozen, transferChoice: 'convergent', transferReason: 'New application evidence uses the 380 km focus.' });
    expect(app.state().ptBoundaryInquiry.plan.rate).toBe(8); expect(app.state().ptCER).toEqual(cer);
    app.click('[data-pt-shelf-close]'); app.click('[data-pt-shelf-open]');
    expect(app.host.querySelector('[data-pt-boundary-transfer-reason]').value).toBe('New application evidence uses the 380 km focus.');
    expect(app.host.querySelector('[data-pt-boundary-application-status]').dataset.ptBoundaryApplicationStatus).toBe('saved');
    expect(app.host.querySelector('[data-pt-boundary-transfer-feedback]')).toBeNull();
    const before = structuredClone(app.state()), announcements = app.announce.mock.calls.length;
    for (let i = 0; i < 60; i++) app.frame();
    expect(app.state()).toEqual(before); expect(app.announce).toHaveBeenCalledTimes(announcements); expect(app.xp).not.toHaveBeenCalled(); expect(app.beep).not.toHaveBeenCalled(); expect(app.notices).not.toHaveBeenCalled();
  });

});
