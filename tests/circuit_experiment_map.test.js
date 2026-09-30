import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const clone = value => JSON.parse(JSON.stringify(value));
const ids = ['gain', 'limit', 'sensor'];
const titles = { gain: 'Small input, larger current', limit: 'Find the limit', sensor: 'Make a night light' };
const plans = [
  { id: 'gain', project: 'manual', change: { key: 'input', before: 1, after: 1.5 } },
  { id: 'limit', project: 'manual', change: { key: 'input', before: 3.3, after: 5 } },
  { id: 'sensor', project: 'dark', change: { key: 'light', before: 80, after: 20 } }
];
const saved = (choice = null, tested = false, explanation = '') => ({ choice, tested, explanation });
const phaseLabels = { start: 'Not started', predict: 'Prediction needed', test: 'Prediction saved', explain: 'Result saved \u00b7 explanation needed', review: 'Explanation saved' };
const actionLabels = { start: 'Open experiment', predict: 'Resume prediction', test: 'Resume prediction', explain: 'Review result', review: 'Review result' };
let api, config;
beforeEach(() => { resetStemLab(); config = loadTool('stem_lab/stem_tool_circuit.js', 'circuit'); api = window.StemLab; });
const seed = () => ({ ...api.circuitActiveDesign({ project: 'dark', light: 37, input: 4.2, supply: 12, baseResistance: 33000, loadResistance: 680, beta: 240 }), view: 'schematic', probeRed: 'drive', probeBlack: 'base', observations: [api.circuitActiveObservation({ input: .8 }, 'Keep this observation.')], reference: { version: 1, design: api.circuitActiveDesign({ input: .9 }) }, reflection: 'My independent notebook.', investigationTitle: 'A tuned circuit', undo: [api.circuitActiveDesign({ input: 2 })], redo: [api.circuitActiveDesign({ input: 3 })] });
const protectedWork = state => clone({ design: api.circuitActiveDesign(state), undo: state.undo, redo: state.redo, view: state.view, observations: state.observations, reference: state.reference, reflection: state.reflection, investigationTitle: state.investigationTitle, probeRed: state.probeRed, probeBlack: state.probeBlack });

describe('A fixed experiment map derived from saved work', () => {
  it('returns exactly three setup-only rows in curriculum order, with no selected state or outcome data', () => {
    expect(api.circuitActiveLessonMap({})).toEqual(plans.map(plan => ({ ...plan, phase: 'start', explanationSaved: false })));
    expect(JSON.stringify(api.circuitActiveLessonMap({}))).not.toMatch(/Current|Voltage|region|answer|reason|brightness|selected|constants/);
  });
  it('uses each lesson record independently instead of the selected lesson or tuned live circuit', () => {
    const state = { ...seed(), lessonId: 'limit', lessonRecords: { gain: saved('less', false, 'A draft'), limit: saved('same', true, ' '), sensor: saved('more', true, 'Evidence from the sensor.') } };
    expect(api.circuitActiveLessonMap(state)).toEqual(plans.map((plan, i) => ({ ...plan, phase: ['test', 'explain', 'review'][i], explanationSaved: i === 2 })));
    expect(api.circuitActiveLessonMap({ ...state, ...api.circuitActiveDesign({ input: 0 }), lessonId: 'unknown' })).toEqual(api.circuitActiveLessonMap(state));
  });
  it('includes normalized legacy progress while respecting explicit records', () => {
    const state = { challenge: { id: 'sensor', choice: 'more', tested: true }, lessonRecords: { gain: saved(), limit: saved('same', true, 'My result.') } };
    expect(api.circuitActiveLessonMap(state).map(row => row.phase)).toEqual(['predict', 'review', 'explain']);
    expect(api.circuitActiveLessonMap({ ...state, lessonRecords: { ...state.lessonRecords, sensor: saved() } }).map(row => row.phase)).toEqual(['predict', 'review', 'predict']);
  });
  it('does not mutate state and returns fresh nested changes on every read', () => {
    const state = { ...seed(), lessonRecords: { gain: saved('less', true, 'Saved writing') } }, before = JSON.stringify(state), first = api.circuitActiveLessonMap(state);
    first[0].change.after = 999; first[1].phase = 'review'; first.push({ id: 'invented' });
    expect(JSON.stringify(state)).toBe(before); expect(api.circuitActiveLessonMap(state)[0].change).toEqual(plans[0].change); expect(api.circuitActiveLessonMap(state).map(row => row.id)).toEqual(ids);
  });
  it('updates only the affected saved phase after a real prediction, Test, and explanation', () => {
    let state = api.circuitActiveLessonUpdate(seed(), 'sensor', 'start');
    expect(api.circuitActiveLessonMap(state).map(row => row.phase)).toEqual(['start', 'start', 'predict']);
    state = api.circuitActiveLessonUpdate(state, 'sensor', 'predict', 'less'); expect(api.circuitActiveLessonMap(state)[2].phase).toBe('test');
    state = api.circuitActiveLessonUpdate(state, 'sensor', 'test'); expect(api.circuitActiveLessonMap(state)[2].phase).toBe('explain');
    state = api.circuitActiveLessonUpdate(state, 'sensor', 'explain', 'I revised my prediction using the saved readings.');
    expect(api.circuitActiveLessonMap(state).map(row => row.phase)).toEqual(['start', 'start', 'review']);
  });
});

describe('Optional map navigation preserves the live circuit and saved work', () => {
  let host, root, latest, update, setLocale, frames, scrollOriginal, writes, awards;
  const lab = () => host.querySelector('.circuit-active-lesson-lab');
  const map = () => lab().querySelector('details.circuit-active-lesson-map');
  const card = id => map().querySelector('[data-map-id="' + id + '"]');
  const openCard = id => card(id).querySelector('button.circuit-map-open');
  const field = () => lab().querySelector('textarea');
  const button = text => [...host.querySelectorAll('button')].find(el => el.textContent === text);
  const callback = element => element[Object.keys(element).find(key => key.startsWith('__reactProps$'))].onClick;
  async function flush() { for (let i = 0; i < 5 && frames.length; i++) await act(async () => frames.splice(0).forEach(fn => fn(0))); }
  async function click(element) { expect(element).toBeTruthy(); await act(async () => element.click()); await flush(); }
  async function mutate(fn) { await act(async () => update(fn)); await flush(); }
  async function toggle(open) { await act(async () => { map().open = open; map().dispatchEvent(new Event('toggle')); }); await flush(); }
  async function select(id) { const el = lab().querySelector('select'); await act(async () => { el.value = id; el.dispatchEvent(new Event('change', { bubbles: true })); }); await flush(); }
  async function mount(active = {}) {
    const initial = { _circuit: { activeWorkbench: true }, _circuitActive: { ...seed(), notebookOpen: true, ...active }, _circuitNetwork: { reflection: 'Keep connected work.' } };
    function Host() { const [state, setState] = React.useState(initial), [locale, changeLocale] = React.useState(''); latest = state; update = setState; setLocale = changeLocale; return config.render(makeCtx({ toolData: state, setToolData: value => { writes(value); setState(value); }, t: (_key, fallback) => locale + fallback, awardXP: awards })); }
    await act(async () => root.render(React.createElement(Host))); await flush();
  }
  beforeEach(() => { frames = []; vi.stubGlobal('requestAnimationFrame', fn => { frames.push(fn); return frames.length; }); scrollOriginal = Element.prototype.scrollIntoView; Element.prototype.scrollIntoView = vi.fn(); host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host); writes = vi.fn(); awards = vi.fn(); });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); if (scrollOriginal) Element.prototype.scrollIntoView = scrollOriginal; else delete Element.prototype.scrollIntoView; });

  it('starts closed, and native disclosure toggles do not select, load, reward, write, or navigate', async () => {
    await mount(); expect(map().open).toBe(false); expect(map().querySelector('summary').textContent).toContain('Experiment map');
    expect(host.contains(document.activeElement)).toBe(false); const before = latest, json = JSON.stringify(latest), summary = map().querySelector('summary'); summary.focus();
    await toggle(true); await toggle(false); await toggle(true);
    expect(latest).toBe(before); expect(JSON.stringify(latest)).toBe(json); expect(document.activeElement).toBe(summary); expect(writes).not.toHaveBeenCalled(); expect(awards).not.toHaveBeenCalled(); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
    expect(map().querySelector('[aria-live],[role="status"]')).toBeNull();
  });
  it('shows three selectable setup cards without revealing solved outcomes on a tuned sensor bench', async () => {
    await mount(); await toggle(true);
    expect([...map().querySelectorAll('article[data-map-id]')].map(el => el.dataset.mapId)).toEqual(ids);
    for (const plan of plans) {
      const el = card(plan.id); expect(el.textContent).toContain(titles[plan.id]); expect(el.querySelectorAll('button')).toHaveLength(1); expect(el.hasAttribute('tabindex')).toBe(false);
      expect([...el.querySelectorAll('.circuit-map-value-number')].map(node => Number(node.textContent))).toEqual([plan.change.before, plan.change.after]);
      expect(openCard(plan.id).textContent).toBe('Open experiment'); expect(openCard(plan.id).getAttribute('aria-label')).toBe('Open experiment: ' + titles[plan.id]);
      expect(openCard(plan.id).getAttribute('aria-pressed')).toBe(plan.id === 'gain' ? 'true' : 'false');
    }
    expect(map().textContent).not.toMatch(/mA|\u00b5A|cutoff|saturat|21\.82|0\.20|matches these readings/); expect(lab().querySelector('.circuit-active-lesson-evidence')).toBeNull();
    expect(latest._circuitActive.supply).toBe(12); expect(writes).not.toHaveBeenCalled();
  });
  it.each([
    [{ gain: saved(), limit: saved('same'), sensor: saved('more', true, ' ') }, ['predict', 'test', 'explain']],
    [{ gain: saved('less', true, 'Evidence'), limit: saved('same', true, ' '), sensor: saved('more', true, 'More evidence') }, ['review', 'explain', 'review']]
  ])('shows each saved stage independently of the selected-card marker (%j)', async (records, phases) => {
    await mount({ lessonId: 'limit', lessonRecords: records });
    for (const [i, id] of ids.entries()) { expect(card(id).dataset.mapPhase).toBe(phases[i]); expect(card(id).querySelector('.circuit-map-status').textContent).toBe(phaseLabels[phases[i]]); expect(openCard(id).textContent).toBe(actionLabels[phases[i]]); expect(card(id).dataset.mapSelected).toBe(id === 'limit' ? 'true' : 'false'); }
  });
  it.each([['sensor', false], ['limit', true]])('selecting %s focuses its saved destination without loading its circuit', async (id, tested) => {
    await mount({ lessonId: 'gain', lessonRecords: { gain: saved('less', true, 'Gain evidence'), [id]: saved('more', tested, 'Keep my own draft') } }); await toggle(true);
    const before = protectedWork(latest._circuitActive), records = clone(latest._circuitActive.lessonRecords), other = latest._circuitNetwork;
    await click(openCard(id)); expect(latest._circuitActive.lessonId).toBe(id); expect(protectedWork(latest._circuitActive)).toEqual(before); expect(latest._circuitActive.lessonRecords).toEqual(records); expect(latest._circuitNetwork).toBe(other);
    expect(document.activeElement).toBe(lab().querySelector(tested ? '[data-active-lesson-result]' : '[data-active-lesson-question]')); expect(lab().querySelector('select').value).toBe(id); expect(host.querySelector('.circuit-active-learning-entry').dataset.lessonId).toBe(id); expect(card(id).dataset.mapSelected).toBe('true'); expect(map().open).toBe(true); expect(field().value).toBe('Keep my own draft');
  });
  it.each([['start', undefined], ['test', saved('less')], ['review', saved('less', true, 'Saved explanation')]])('the current %s card focuses directly without a toolData write or new focus request', async (phase, record) => {
    await mount({ lessonId: 'gain', ...(record ? { lessonRecords: { gain: record } } : {}) }); await toggle(true); const before = latest, json = JSON.stringify(latest);
    await click(openCard('gain')); expect(document.activeElement).toBe(lab().querySelector(phase === 'review' ? '[data-active-lesson-result]' : '[data-active-lesson-question]')); expect(latest).toBe(before); expect(JSON.stringify(latest)).toBe(json); expect(writes).not.toHaveBeenCalled();
    const own = host.querySelector('.circuit-notebook-reflection'); own.focus(); await mutate(prev => ({ ...prev, _circuitActive: { ...prev._circuitActive, light: 24 } })); expect(document.activeElement).toBe(own);
  });
  it('repeatedly selecting the current saved result returns focus without resetting work', async () => {
    await mount({ lessonId: 'sensor', lessonRecords: { sensor: saved('less', true, 'Sensor reasoning') } }); await toggle(true); const before = JSON.stringify(latest);
    for (let i = 0; i < 2; i++) { openCard('sensor').focus(); await click(openCard('sensor')); expect(document.activeElement).toBe(lab().querySelector('[data-active-lesson-result]')); }
    expect(JSON.stringify(latest)).toBe(before); expect(writes).not.toHaveBeenCalled();
  });
  it('rapid different-card selections retain the final selection and do not later replay focus', async () => {
    await mount({ lessonId: 'gain', lessonRecords: { limit: saved('same', true, 'Limit explanation'), sensor: saved('more') } }); await toggle(true); const before = protectedWork(latest._circuitActive), toLimit = callback(openCard('limit')), toSensor = callback(openCard('sensor'));
    await act(async () => { toLimit(); toSensor(); }); await flush(); expect(latest._circuitActive.lessonId).toBe('sensor'); expect(document.activeElement).toBe(lab().querySelector('[data-active-lesson-question]')); expect(protectedWork(latest._circuitActive)).toEqual(before);
    const own = host.querySelector('.circuit-notebook-reflection'); own.focus(); await mutate(prev => ({ ...prev, _circuitActive: { ...prev._circuitActive, supply: 9 } })); expect(document.activeElement).toBe(own);
  });
  it('the existing native picker and map remain synchronized without closing the optional disclosure', async () => {
    await mount({ lessonRecords: { sensor: saved('less', true, 'Saved sensor explanation') } }); await toggle(true); const before = protectedWork(latest._circuitActive); await select('sensor');
    expect(card('sensor').dataset.mapSelected).toBe('true'); expect(card('gain').dataset.mapSelected).toBe('false'); expect(document.activeElement).toBe(lab().querySelector('[data-active-lesson-result]')); expect(map().open).toBe(true); expect(protectedWork(latest._circuitActive)).toEqual(before);
    await click(openCard('gain')); expect(lab().querySelector('select').value).toBe('gain'); expect(latest._circuitActive.lessonRecords.gain).toBeUndefined(); expect(lab().querySelector('.circuit-active-lesson-journey').dataset.journeyPhase).toBe('start');
  });
  it('typing and translating update saved badges without remounting the map or stealing text focus', async () => {
    await mount({ lessonId: 'gain', lessonRecords: { gain: saved('less', true, '') } }); await toggle(true); const details = map(), el = field(); el.focus();
    await act(async () => { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(el, 'Evidence I saved.'); el.dispatchEvent(new Event('input', { bubbles: true })); }); await flush(); expect(card('gain').dataset.mapPhase).toBe('review'); expect(field()).toBe(el); expect(document.activeElement).toBe(el);
    el.setSelectionRange(2, 8, 'backward'); const before = JSON.stringify(latest); Element.prototype.scrollIntoView.mockClear(); await act(async () => setLocale('Translated: ')); await flush();
    expect(map()).toBe(details); expect(map().open).toBe(true); expect(lab().querySelector('textarea')).toBe(el); expect(document.activeElement).toBe(el); expect([el.selectionStart, el.selectionEnd, el.selectionDirection]).toEqual([2, 8, 'backward']); expect(JSON.stringify(latest)).toBe(before); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled(); expect(openCard('gain').getAttribute('aria-label')).toContain('Translated: ');
  });
  it('import and restore refresh all map records without auto-selection, baseline load, or focus replay', async () => {
    await mount({ lessonId: 'gain', lessonRecords: { gain: saved('less', true, 'Original explanation') } }); await toggle(true); await click(openCard('gain'));
    const before = api.circuitActiveDesign(latest._circuitActive), doc = api.circuitActiveInvestigation({ input: 2.4, lessonId: 'sensor', lessonRecords: { sensor: saved('more', true, 'Imported explanation') } });
    const input = host.querySelector('input[aria-label="Open investigation file"]'); Object.defineProperty(input, 'files', { configurable: true, value: [{ name: 'map.json', size: 1024, text: () => Promise.resolve(JSON.stringify(doc)) }] }); await act(async () => input.dispatchEvent(new Event('change', { bubbles: true }))); await flush();
    const load = button('Load investigation'); load.focus(); Element.prototype.scrollIntoView.mockClear(); await click(load); expect(latest._circuitActive.lessonId).toBe('sensor'); expect(latest._circuitActive.input).toBe(2.4); expect(card('sensor').dataset.mapPhase).toBe('review'); expect(card('gain').dataset.mapPhase).toBe('start'); expect(document.activeElement).not.toBe(lab().querySelector('[data-active-lesson-result]')); expect(map().open).toBe(true); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
    await click(button('Restore previous investigation')); expect(api.circuitActiveDesign(latest._circuitActive)).toEqual(before); expect(card('gain').dataset.mapPhase).toBe('review'); expect(card('sensor').dataset.mapPhase).toBe('start'); expect(document.activeElement).not.toBe(lab().querySelector('[data-active-lesson-result]')); expect(Element.prototype.scrollIntoView).not.toHaveBeenCalled();
  });
  it('selects the legacy current lesson or invalid-ID fallback without changing old persisted data', async () => {
    await mount({ lessonId: 'invalid', challenge: { id: 'sensor', choice: 'more', tested: true } }); const before = latest;
    expect(card('gain').dataset.mapSelected).toBe('true'); expect(card('sensor').dataset.mapPhase).toBe('explain'); await toggle(true); await click(openCard('gain'));
    expect(latest).toBe(before); expect(latest._circuitActive.lessonId).toBe('invalid'); expect(writes).not.toHaveBeenCalled(); expect(document.activeElement).toBe(lab().querySelector('[data-active-lesson-question]'));
  });
});
