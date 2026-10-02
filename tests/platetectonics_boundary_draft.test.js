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
  for (const file of ['desktop/web-app/node_modules/react/umd/react.development.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js', process.env.PT_BOUNDARY_DRAFT_SOURCE || 'stem_lab/stem_tool_platetectonics.js']) (0, eval)(fs.readFileSync(file, 'utf8'));
  React = window.React; ReactDOM = window.ReactDOM; act = React.act || React.unstable_act;
});
beforeEach(() => {
  frames.clear(); now = 0;
  window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  for (const clock of new Set([globalThis.performance, window.performance])) vi.spyOn(clock, 'now').mockImplementation(() => now);
});
afterEach(() => { while (apps.length) { const app = apps.pop(); act(() => app.root.unmount()); app.host.remove(); if (app.restore) app.restore(); } frames.clear(); vi.restoreAllMocks(); });
function mount(initial = {}, onDraft = null) {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOM.createRoot(host), inquiryWrites = vi.fn(), draftWrites = vi.fn(), depthWrites = vi.fn(), announce = vi.fn(), xp = vi.fn(), beep = vi.fn();
  let current = initial;
  function Host({ seed }) {
    const [saved, setSaved] = React.useState(seed); current = saved;
    return React.createElement(window.AlloTectonicsInteractive, {
      savedBoundaryInquiry: saved.inquiry, savedBoundaryDraft: saved.draft, depthRecords: saved.records, darkMode: true, awardXP: xp, beep, announceToSR: announce,
      onRecordBoundaryDraft(record) { draftWrites(record); setSaved(prev => ({ ...prev, draft: record })); if (onDraft) onDraft(record); },
      onRecordBoundaryInquiry(record) { inquiryWrites(record); setSaved(prev => ({ ...prev, inquiry: record })); },
      onRecordDepths(record) { depthWrites(record); setSaved(prev => ({ ...prev, records: { ...prev.records, [record.mode]: record } })); },
      onClearDepths() { setSaved(prev => ({ ...prev, records: {} })); }
    });
  }
  const remount = () => { const seed = structuredClone(current); act(() => root.render(null)); act(() => root.render(React.createElement(React.StrictMode, null, React.createElement(Host, { seed })))); };
  remount();
  const click = selector => act(() => host.querySelector(selector).click());
  const frame = () => { now += 1000; act(() => { for (const [id, callback] of [...frames]) if (frames.delete(id)) callback(now); }); };
  const app = { host, root, inquiryWrites, draftWrites, depthWrites, announce, xp, beep, remount, click, frame, state: () => current };
  apps.push(app); return app;
}
function input(app, selector, value) {
  const node = app.host.querySelector(selector), prototype = node.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : node.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, String(value));
  act(() => node.dispatchEvent(new window.Event(node.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })));
}
function mountRegistered(initial = {}) {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOM.createRoot(host), draftWrites = vi.fn(), xp = vi.fn(), beep = vi.fn(), announce = vi.fn(), notices = vi.fn();
  const Interactive = window.AlloTectonicsInteractive;
  let current, patchData, interactiveProps;
  window.AlloTectonicsInteractive = function RegisteredInteractive(props) { interactiveProps = props; return React.createElement(Interactive, { ...props, onRecordBoundaryDraft(value) { draftWrites(value); props.onRecordBoundaryDraft(value); } }); };
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
    host, root, draftWrites, xp, beep, announce, notices, state: () => current, props: () => interactiveProps,
    click: selector => act(() => host.querySelector(selector).click()),
    patch: patch => act(() => patchData(patch)),
    frame: () => { now += 1000; act(() => { for (const [id, callback] of [...frames]) if (frames.delete(id)) callback(now); }); },
    restore: () => { window.AlloTectonicsInteractive = Interactive; }
  };
  apps.push(app); return app;
}
const plan = { rate: 5, years: 1200000, prediction: 'The sinking slab should have deeper earthquakes.' };
const draft = { version: 1, prediction: ' Unfinished prediction  ', rate: 8, years: 600000, explanation: 'Working explanation\nwith exact spaces. ', transferChoice: 'transform', transferReason: 'I am comparing the 380 km observation. ' };
function records() { return Object.fromEntries(['convergent', 'divergent', 'transform'].map(mode => [mode, window.__alloPtDepthTrials.capture({ mode, years: plan.years, rate: plan.rate, depthRunRate: plan.rate, depthRunRateConstant: true, qlog: [{ z: mode === 'convergent' ? 500 : 20 }] })])); }
function inquiry() { return { version: 1, plan, submission: { ...plan, explanation: 'Original comparison explanation.', records: records(), transferChoice: 'convergent', transferReason: 'Original 380 km evidence.' } }; }
const selectors = { prediction: '[data-pt-boundary-prediction]', rate: '[data-pt-boundary-rate]', years: '[data-pt-boundary-time]', explanation: '[data-pt-boundary-explanation]', transferChoice: '[data-pt-boundary-transfer-choice]', transferReason: '[data-pt-boundary-transfer-reason]' };
function writeDraft(app) { for (const [key, selector] of Object.entries(selectors)) input(app, selector, draft[key]); }
function expectFields(app, value) { for (const [key, selector] of Object.entries(selectors)) expect(app.host.querySelector(selector).value).toBe(String(value[key])); }

describe('Guided writing drafts remain separate from saved evidence', () => {
  it('accepts empty writing and clones only bounded plain draft fields', () => {
    const original = { ...draft, checked: true, unrelated: { unsafe: true } }, clean = window.__alloPtBoundaryDraft(original);
    expect(clean).toEqual(draft); expect(clean).not.toBe(original);
    expect(window.__alloPtBoundaryDraft({ ...draft, prediction: '', explanation: '', transferChoice: '', transferReason: '' })).not.toBeNull();
    expect(window.__alloPtBoundaryDraft({ ...draft, prediction: 'p'.repeat(800), explanation: 'e'.repeat(4000), transferReason: 'r'.repeat(800) })).not.toBeNull();
  });
  it.each([{ version: 2 }, { rate: '8' }, { rate: 0 }, { rate: 16 }, { rate: 1.5 }, { years: 1200001 }, { prediction: null }, { prediction: 'p'.repeat(801) }, { explanation: 'e'.repeat(4001) }, { transferChoice: 'collision' }, { transferReason: 'r'.repeat(801) }].map((patch, index) => [index, patch]))('rejects malformed import case %i', (_index, patch) => {
    expect(window.__alloPtBoundaryDraft({ ...draft, ...patch })).toBeNull();
  });
  it('restores all raw entries paused with no saved check, callbacks or idle feedback', () => {
    window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
    const app = mount({ draft, inquiry: inquiry(), records: records() });
    expectFields(app, draft);
    expect(app.host.querySelector('[data-pt-model-play]').textContent).toContain('Play');
    expect(app.host.querySelector('[data-pt-boundary-transfer-feedback]')).toBeNull();
    expect(app.host.querySelector('[data-pt-boundary-application-save]').disabled).toBe(true);
    expect(app.host.querySelector('[data-pt-boundary-writing-status]').dataset.ptBoundaryWritingStatus).toBe('draft');
    for (let i = 0; i < 120; i++) app.frame();
    expect(app.draftWrites).not.toHaveBeenCalled(); expect(app.inquiryWrites).not.toHaveBeenCalled(); expect(app.depthWrites).not.toHaveBeenCalled();
    expect(app.announce).not.toHaveBeenCalled(); expect(app.xp).not.toHaveBeenCalled(); expect(app.beep).not.toHaveBeenCalled();
  });
  it('writes exactly one draft for each distinct field change and preserves saved comparisons', () => {
    const frozen = inquiry(), app = mount({ inquiry: frozen, records: records() });
    writeDraft(app); expect(app.draftWrites).toHaveBeenCalledTimes(6); expect(app.state().draft).toEqual(draft);
    input(app, selectors.prediction, draft.prediction);
    expect(app.draftWrites).toHaveBeenCalledTimes(6); expect(app.state().inquiry).toEqual(frozen); expect(app.inquiryWrites).not.toHaveBeenCalled();
    expect(app.announce).not.toHaveBeenCalled(); expect(app.xp).not.toHaveBeenCalled(); expect(app.beep).not.toHaveBeenCalled();
    app.remount(); expectFields(app, draft); expect(app.draftWrites).toHaveBeenCalledTimes(6);
  });
  it('keeps overlong edits local, clears checked status and retains a corrected bounded draft', () => {
    const frozen = inquiry(), app = mount({ inquiry: frozen, records: records() });
    app.click('[data-pt-boundary-transfer-check]');
    input(app, selectors.transferReason, 'r'.repeat(801));
    expect(app.host.querySelector(selectors.transferReason).value).toHaveLength(801);
    expect(app.draftWrites).not.toHaveBeenCalled();
    expect(app.host.querySelector('[data-pt-boundary-transfer-feedback]')).toBeNull();
    app.click('[data-pt-boundary-transfer-check]'); app.click('[data-pt-boundary-application-save]');
    expect(app.host.querySelector('[data-pt-boundary-application-save]').disabled).toBe(true);
    expect(app.inquiryWrites).not.toHaveBeenCalled(); expect(app.state().inquiry).toEqual(frozen);
    const corrected = 'The 380 km focus supports a descending slab.';
    input(app, selectors.transferReason, corrected);
    expect(app.draftWrites).toHaveBeenCalledTimes(1); expect(app.state().draft.transferReason).toBe(corrected);
    expect(app.host.querySelector('[data-pt-boundary-transfer-feedback]')).toBeNull();
    expect(app.inquiryWrites).not.toHaveBeenCalled(); expect(app.state().inquiry).toEqual(frozen);
  });
  it('consumes its signature before a reentrant draft callback', () => {
    let app;
    app = mount({}, () => input(app, selectors.prediction, 'Reentrant retained prediction.'));
    input(app, selectors.prediction, 'Reentrant retained prediction.');
    expect(app.draftWrites).toHaveBeenCalledTimes(1);
  });
  it('treats untouched default and canonical entries as no-ops, retaining an explicit check', () => {
    const app = mount({ inquiry: inquiry(), records: records() });
    input(app, selectors.prediction, plan.prediction); input(app, selectors.rate, 5); input(app, selectors.years, 1200000);
    app.click('[data-pt-boundary-transfer-check]');
    expect(app.host.querySelector('[data-pt-boundary-transfer-feedback]')).not.toBeNull();
    input(app, selectors.transferChoice, 'convergent'); input(app, selectors.transferReason, 'Original 380 km evidence.');
    expect(app.host.querySelector('[data-pt-boundary-transfer-feedback]')).not.toBeNull();
    expect(app.draftWrites).not.toHaveBeenCalled(); expect(app.host.querySelector('[data-pt-boundary-writing-status]')).toBeNull();
  });
  it('ignores invalid draft imports and keeps canonical content as the fallback', () => {
    const app = mount({ draft: { ...draft, rate: '8' }, inquiry: inquiry(), records: records() });
    expect(app.host.querySelector(selectors.prediction).value).toBe(plan.prediction);
    expect(app.host.querySelector(selectors.explanation).value).toBe('Original comparison explanation.');
    expect(app.host.querySelector('[data-pt-boundary-writing-status]')).toBeNull(); expect(app.draftWrites).not.toHaveBeenCalled();
  });
  it('retains unfinished fields through actual shelf close and reopen without creating a submission', () => {
    const frozen = inquiry(), cer = { claim: 'Frozen CER', evidenceContext: { original: true } };
    const app = mountRegistered({ ptBoundaryInquiry: frozen, ptDepthTrials: records(), ptCER: cer });
    writeDraft(app); app.click('[data-pt-boundary-transfer-check]');
    expect(app.host.querySelector('[data-pt-boundary-transfer-feedback]')).not.toBeNull();
    const writes = app.draftWrites.mock.calls.length;
    app.click('[data-pt-shelf-close]'); app.click('[data-pt-shelf-open]');
    expectFields(app, draft); expect(app.host.querySelector('[data-pt-boundary-transfer-feedback]')).toBeNull();
    expect(app.state().ptBoundaryInquiry).toEqual(frozen); expect(app.state().ptCER).toEqual(cer); expect(app.draftWrites).toHaveBeenCalledTimes(writes);
    expect(app.host.querySelector('[data-pt-model-play]').textContent).toContain('Play');
  });
  it('retains unfinished fields through the actual Explain journey and return to the simulator', () => {
    const frozen = inquiry(), app = mountRegistered({ ptBoundaryInquiry: frozen, ptDepthTrials: records() });
    writeDraft(app); const writes = app.draftWrites.mock.calls.length;
    app.click('[data-pt-journey-go="explain"]'); expect(app.host.querySelector(selectors.prediction)).toBeNull();
    app.click('[data-pt-journey-go="sim"]'); expectFields(app, draft);
    expect(app.state().ptBoundaryInquiry).toEqual(frozen); expect(app.draftWrites).toHaveBeenCalledTimes(writes);
  });
  it('merges draft writes with newer unrelated parent data and rejects invalid callback values', () => {
    const app = mountRegistered({ ptBoundaryInquiry: inquiry(), note: 'earlier' });
    const callback = app.props().onRecordBoundaryDraft;
    app.patch({ note: 'newer', ptForce: { kept: true } });
    act(() => callback(draft)); expect(app.state()).toMatchObject({ note: 'newer', ptForce: { kept: true }, ptBoundaryDraft: draft });
    const before = structuredClone(app.state()); act(() => callback({ ...draft, explanation: null })); expect(app.state()).toEqual(before);
  });
  it('keeps the existing parent state object for a direct duplicate draft callback', () => {
    const app = mountRegistered({ ptBoundaryInquiry: inquiry(), ptBoundaryDraft: draft, note: 'kept' });
    const before = app.state(), stored = before.ptBoundaryDraft;
    act(() => { app.props().onRecordBoundaryDraft({ ...draft }); app.props().onRecordBoundaryDraft({ ...draft }); });
    expect(app.state()).toBe(before); expect(app.state().ptBoundaryDraft).toBe(stored);
  });
  it('marks explicitly saved plan fields while keeping an unfinished explanation as a draft', () => {
    const app = mount(); input(app, selectors.prediction, plan.prediction);
    expect(app.host.querySelector('[data-pt-boundary-writing-status]').dataset.ptBoundaryWritingStatus).toBe('draft');
    app.click('[data-pt-boundary-plan-save]');
    expect(app.host.querySelector('[data-pt-boundary-writing-status]').dataset.ptBoundaryWritingStatus).toBe('saved');
    input(app, selectors.explanation, 'This explanation is unfinished.');
    expect(app.host.querySelector('[data-pt-boundary-writing-status]').dataset.ptBoundaryWritingStatus).toBe('draft');
    expect(app.state().inquiry).toEqual({ version: 1, plan }); expect(app.draftWrites).toHaveBeenCalledTimes(2);
  });
  it('keeps checked responses unsubmitted until explicit application Save and rechecks after reopening', () => {
    const original = inquiry(), app = mount({ inquiry: original, records: records() });
    input(app, selectors.transferChoice, 'divergent'); input(app, selectors.transferReason, 'A retained but incorrect depth interpretation.');
    app.click('[data-pt-boundary-transfer-check]'); expect(app.state().inquiry).toEqual(original);
    app.click('[data-pt-boundary-application-save]');
    expect(app.state().inquiry.submission).toMatchObject({ transferChoice: 'divergent', transferReason: 'A retained but incorrect depth interpretation.', records: original.submission.records, explanation: original.submission.explanation });
    expect(app.host.querySelector('[data-pt-boundary-writing-status]').dataset.ptBoundaryWritingStatus).toBe('saved');
    app.remount(); expect(app.host.querySelector('[data-pt-boundary-transfer-feedback]')).toBeNull();
    expect(app.host.querySelector('[data-pt-boundary-application-save]').disabled).toBe(true);
  });
});
