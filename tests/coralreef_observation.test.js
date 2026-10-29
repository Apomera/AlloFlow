import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

// The observation companion is optional guided looking, never a quiz answer or
// an automatic sighting. Engine descriptors are resolved again on each action.
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounted = [];
let engines, config;
beforeEach(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  window.THREE = { stub: true };
  window.Reef3DSpecies = { version: '1.0.0', create: () => ({}) };
  engines = [];
  config = { ready: true, paused: false, supported: true, target: { uid: 'observation-original', speciesId: 'clownfish', distanceM: 14, inView: false, bearingDeg: 45, riseM: 0 } };
  window.Reef3DExplore = { version: '1.0.0', mount: vi.fn((canvas, options) => {
    const initial = { ...config };
    let state = { ready: initial.ready, paused: initial.paused, view: 'third', diver: { depthM: 8, headingDeg: 90 }, nearby: [], focused: null,
      moments: [{ kind: 'grazing', speciesId: 'parrotfish', uids: ['grazer-1'], speciesIds: ['parrotfish'], distanceM: 2, inView: true, bearingDeg: 0, riseM: 0 }] };
    const controller = { target: initial.target, dispose: vi.fn(), setInput: vi.fn(), resize: vi.fn(), setLight: vi.fn(),
      getState: () => state,
      emit(patch) { state = { ...state, ...patch }; options.onState(state); },
      fail() { options.onError(new Error('Test graphics unavailable')); },
      focus: vi.fn(() => true), swimTo: vi.fn(() => true), focusNext: vi.fn(), focusPrevious: vi.fn(), clearFocus: vi.fn(),
      setView: vi.fn(view => { state = { ...state, view }; }),
      setPaused: vi.fn(paused => controller.emit({ paused })) };
    if (initial.supported) controller.findSpecies = vi.fn(id => controller.target && controller.target.speciesId === id ? { ...controller.target } : null);
    engines.push(controller); options.onState(state); return controller;
  }) };
  loadTool(TOOL, 'coralReef');
});
afterEach(async () => {
  while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); }
  delete window.THREE; delete window.Reef3DSpecies; delete window.Reef3DExplore;
  vi.restoreAllMocks();
});
async function mount(seed = {}) {
  let data = { coralReef: { section: 'guide', ...seed } }, update;
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), tool = window.StemLab._registry.coralReef;
  function Shell() {
    const [state, setState] = React.useState(data); data = state; update = setState;
    return tool.render({ React, toolData: state, setToolData: setState, t: (key, fallback) => fallback || key });
  }
  const item = { host, root, get data() { return data.coralReef; }, async patch(values) { await React.act(async () => update(prev => ({ ...prev, coralReef: { ...prev.coralReef, ...values } }))); } };
  mounted.push(item); await React.act(async () => root.render(React.createElement(Shell))); return item;
}
async function click(element) { expect(element, 'control is available').toBeTruthy(); await React.act(async () => { element.click(); await Promise.resolve(); }); }
async function settleFocus() { await React.act(async () => { await new Promise(resolve => setTimeout(resolve, 35)); }); }
const textButton = (host, text) => [...host.querySelectorAll('button')].find(b => b.textContent.trim() === text);
const status = (t) => t.host.querySelector('[data-observation-status]').textContent;
async function start(t) { await click(textButton(t.host, 'Start the dive')); expect(engines).toHaveLength(1); return engines[0]; }

describe('optional reef observation companion', () => {
  it('offers living profiles a field-mark companion without starting WebGL or awarding discovery credit', async () => {
    const speciesLog = { green_turtle: { site: 'healthy', firstSeen: 1 } }, speciesPractice = { rounds: 2, answered: 7, correct: 4 };
    const t = await mount({ guideSpeciesId: 'clownfish', speciesLog, speciesPractice });
    await click(t.host.querySelector('[data-observe-species="clownfish"]'));
    const dock = t.host.querySelector('[data-marine-observation="clownfish"]');
    expect(dock).toBeTruthy();
    expect(dock.querySelectorAll('.crob-prompt li')).toHaveLength(2);
    expect(dock.textContent).toContain('Count the three white bands');
    expect(status(t)).toContain('Start the dive below');
    expect(t.host.querySelector('canvas')).toBeNull();
    expect(engines).toHaveLength(0);
    expect(t.data.diveStudySpeciesId).toBe('clownfish');
    expect(t.data.speciesLog).toEqual(speciesLog);
    expect(t.data.speciesPractice).toEqual(speciesPractice);
    await click(t.host.querySelector('[data-observation-return]'));
    expect(t.data.diveStudySpeciesId).toBeFalsy();
    expect(t.data.guideSpeciesId).toBe('clownfish');
    expect(t.host.querySelector('[data-marine-profile="clownfish"]')).toBeTruthy();
    await click(t.host.querySelector('[data-observe-species="clownfish"]'));
    await click(t.host.querySelector('[data-observation-close]')); await settleFocus();
    expect(document.activeElement).toBe(t.host.querySelector('#cr-dive-title'));
    expect(engines).toHaveLength(0);
  });

  it('resolves a fresh UID for each locate/swim action and closes without restarting the current dive', async () => {
    const log = { green_turtle: { site: 'healthy', firstSeen: 1 } };
    const t = await mount({ section: 'explore', diveStudySpeciesId: 'clownfish', speciesLog: log });
    const engine = await start(t), canvas = t.host.querySelector('canvas');
    engine.target = { ...engine.target, uid: 'observation-latest' };
    await click(t.host.querySelector('[data-observation-locate]'));
    expect(engine.focus).toHaveBeenLastCalledWith('observation-latest');
    expect(document.activeElement).toBe(canvas);
    expect(status(t)).toContain('Located');
    engine.target = { ...engine.target, uid: 'observation-newer' };
    await click(t.host.querySelector('[data-observation-swim]'));
    expect(engine.swimTo).toHaveBeenLastCalledWith('observation-newer');
    expect(engine.setPaused).not.toHaveBeenCalled();
    expect(t.data.speciesLog).toEqual(log);
    expect(t.data.speciesPractice).toBeUndefined();
    expect(t.data.momentLog).toBeUndefined();
    expect(t.data.diveMoments).toBeUndefined();
    await click(t.host.querySelector('[data-observation-close]')); await settleFocus();
    expect(t.host.querySelector('[data-marine-observation]')).toBeNull();
    expect(engines).toHaveLength(1);
    expect(engine.dispose).not.toHaveBeenCalled();
    expect(t.host.querySelector('canvas')).toBe(canvas);
    expect(document.activeElement).toBe(canvas);
  });

  it('requires an explicit resume confirmation before swimming in a paused reef', async () => {
    config.paused = true;
    const t = await mount({ section: 'explore', diveStudySpeciesId: 'clownfish' }), engine = await start(t);
    await click(t.host.querySelector('[data-observation-swim]'));
    expect(engine.swimTo).not.toHaveBeenCalled();
    expect(engine.setPaused).not.toHaveBeenCalled();
    expect(engine.getState().paused).toBe(true);
    expect(status(t)).toContain('Choose Resume and swim closer');
    engine.target = { ...engine.target, uid: 'after-confirmation' };
    await click(t.host.querySelector('[data-observation-resume]'));
    expect(engine.setPaused).toHaveBeenCalledWith(false);
    expect(engine.swimTo).toHaveBeenCalledWith('after-confirmation');
    expect(t.data.speciesLog).toBeUndefined();
    expect(t.data.speciesPractice).toBeUndefined();
  });

  it.each(['Locate', 'another control'])('does not reclaim focus when a delayed opening frame runs after %s', async action => {
    const t = await mount({ section: 'explore', diveStudySpeciesId: 'clownfish' }), engine = await start(t);
    await settleFocus();
    const frames = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frames.push(callback); return frames.length; });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    engine.target = { ...engine.target, uid: 'phyllidia-1', speciesId: 'varicose_phyllidia' };
    await t.patch({ diveStudySpeciesId: 'varicose_phyllidia' });
    const card = t.host.querySelector('[data-marine-observation="varicose_phyllidia"]');
    expect(document.activeElement).toBe(card.querySelector('h3'));
    const target = action === 'Locate' ? t.host.querySelector('canvas') : textButton(t.host, 'Open the species guide');
    if (action === 'Locate') await click(card.querySelector('[data-observation-locate]'));
    else await React.act(async () => target.focus());
    expect(document.activeElement).toBe(target);
    expect(frames.length).toBeGreaterThan(0);
    await React.act(async () => frames.splice(0).forEach(callback => callback(1000)));
    expect(document.activeElement).toBe(target);
    if (action === 'Locate') expect(engine.focus).toHaveBeenLastCalledWith('phyllidia-1');
    else expect(engine.focus).not.toHaveBeenCalled();
    expect(engines).toHaveLength(1); expect(engine.dispose).not.toHaveBeenCalled();
  });

  it('explains loading, absent and graphics-error states, changing sites only after an explicit action', async () => {
    config.ready = false;
    const t = await mount({ section: 'explore', diveSiteId: 'damaged', diveStudySpeciesId: 'clownfish' }), engine = await start(t);
    expect(status(t)).toContain('still loading');
    expect(t.host.querySelector('[data-observation-locate]')).toBeNull();
    engine.target = null;
    await React.act(async () => engine.emit({ ready: true }));
    expect(status(t)).toContain('not available in the current reef');
    expect(t.data.diveSiteId).toBe('damaged');
    expect(engines).toHaveLength(1);
    await click(t.host.querySelector('[data-observation-healthy]'));
    expect(t.data.diveSiteId).toBe('healthy');
    expect(engines).toHaveLength(2);
    await React.act(async () => engines[1].fail());
    expect(status(t)).toContain('3D reef could not start');
    expect(t.host.querySelector('[data-observation-swim]')).toBeNull();
    expect(t.data.speciesLog).toBeUndefined();
  });

  it('clears old action feedback and resume prompts when the site/status changes', async () => {
    const t = await mount({ section: 'explore', diveSiteId: 'damaged', diveStudySpeciesId: 'clownfish' }), engine = await start(t);
    await click(t.host.querySelector('[data-observation-swim]'));
    expect(status(t)).toContain('Swimming closer');
    config.ready = false;
    await t.patch({ diveSiteId: 'heatwave' });
    expect(status(t)).toContain('still loading');
    expect(status(t)).not.toContain('Swimming closer');
    const next = engines[1];
    await React.act(async () => next.emit({ ready: true, paused: true }));
    await click(t.host.querySelector('[data-observation-swim]'));
    expect(t.host.querySelector('[data-observation-resume]')).toBeTruthy();
    await click(textButton(t.host, 'End the dive'));
    expect(status(t)).toContain('Start the dive below');
    expect(t.host.querySelector('[data-observation-resume]')).toBeNull();
    expect(engine.dispose).toHaveBeenCalled();
  });

  it('degrades safely without the lookup API and rejects structures or malformed observation requests', async () => {
    config.supported = false;
    const t = await mount({ section: 'explore', diveStudySpeciesId: 'clownfish' });
    await start(t);
    expect(status(t)).toContain('Guided locating is unavailable');
    expect(t.host.querySelector('[data-observation-locate]')).toBeNull();
    expect(t.host.querySelector('[data-observation-healthy]')).toBeNull();
    for (const id of ['reef_star', 'not_a_species', {}, null]) {
      await t.patch({ diveStudySpeciesId: id });
      expect(t.host.querySelector('[data-marine-observation]')).toBeNull();
    }
    await t.patch({ section: 'guide', guideSpeciesId: 'reef_star' });
    expect(t.host.querySelector('[data-observe-species]')).toBeNull();
  });
});
