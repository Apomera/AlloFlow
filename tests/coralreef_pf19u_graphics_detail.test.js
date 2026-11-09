import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import path from 'node:path';
import { createRequire } from 'node:module';

// Lane pf19u: one saved 3D detail choice (diveQuality) for every 3D view, a short line
// saying what Automatic chose and why, and a slow-device step-down that never loops.
// The engines are stubs that report autoReason and slow the way the round 19 interface says.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
const REAL_THREE = createRequire(import.meta.url)(path.resolve(process.cwd(), 'vendor/three-r128/three.min.js'));
let loadTool, resetStemLab, React, ReactDOMClient, act;
beforeAll(async () => {
  const mod = await import(/* @vite-ignore */ 'file:///' + path.resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js').replace(/\\/g, '/'));
  ({ loadTool, resetStemLab, React, ReactDOMClient } = mod); act = React.act;
});

const mounted = [];
let dives, surveys, profile, withNewFields;
function exploreStub() {
  const api = { version: '1.0.0', mount(canvas, options) {
    let state = { ready: true, paused: false, view: 'third', quality: options.quality === 'low' ? 'low' : 'high', diver: { x: 0, y: -8, z: 0, depthM: 8, headingDeg: 0 }, focused: null, nearby: [] };
    if (withNewFields) { state.autoReason = options.quality === 'auto' ? 'default' : null; state.slow = false; }
    const ctl = { canvas, options, dispose: vi.fn(), resize: vi.fn(), setView: vi.fn(), setPaused: vi.fn(), setVision: vi.fn(), getState: () => state,
      emit(patch) { state = { ...state, ...patch }; options.onState(state); } };
    dives.push(ctl); options.onState(state); return ctl;
  } };
  if (withNewFields) api.profileDevice = () => profile;
  return api;
}
function surveyStub() {
  const api = { version: '1.0.0', mount(canvas, options) {
    let state = { ready: true, cameraMode: 'diver', paused: false, pointIndex: 0, quality: options.quality === 'low' ? 'low' : 'high' };
    if (withNewFields) { state.autoReason = options.quality === 'auto' ? 'cores' : null; state.slow = false; }
    const ctl = { canvas, options, dispose: vi.fn(), resize: vi.fn(), lookCamera: vi.fn(), zoomCamera: vi.fn(), resetCamera: vi.fn(), getState: () => state,
      emit(patch) { state = { ...state, ...patch }; options.onState(state); },
      goToPoint: vi.fn(pointIndex => ctl.emit({ pointIndex })), setCameraMode: vi.fn(cameraMode => ctl.emit({ cameraMode })), setPaused: vi.fn(paused => ctl.emit({ paused })) };
    surveys.push(ctl); options.onState(state); return ctl;
  } };
  if (withNewFields) api.profileDevice = () => profile;
  return api;
}
function install(newFields) {
  withNewFields = newFields;
  window.Reef3DExplore = exploreStub(); window.Reef3D = surveyStub();
}

beforeEach(() => {
  resetStemLab(); dives = []; surveys = [];
  profile = { tier: 'high', reason: 'cores', cores: 4, memory: 8, renderer: 'Some GPU' };
  window.__RR_TEST_EXPORTS__ = {}; window.THREE = { stub: true };
  window.Reef3DSpecies = { version: '1.0.0', create: () => ({}) };
  window.Reef3DHabitat = { version: '1.0.0', create: () => ({}), normalizeLayout: l => l };
  install(true);
  loadTool(TOOL, 'coralReef');
});
afterEach(async () => {
  while (mounted.length) { const t = mounted.pop(); await act(async () => t.root.unmount()); t.host.remove(); }
  for (const name of ['Reef3DExplore', 'Reef3DSpecies', 'Reef3DHabitat', 'Reef3D', 'THREE', '__RR_TEST_EXPORTS__']) delete window[name];
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});

async function mountTool(seed = {}) {
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host), cfg = window.StemLab._registry.coralReef;
  let data;
  const said = [];
  function Shell() {
    const [toolData, setToolData] = React.useState({ coralReef: { section: 'explore', ...seed } });
    data = toolData;
    return cfg.render({ React, toolData, setToolData, t: (key, fallback) => fallback || key, announceToSR: m => said.push(m) });
  }
  const t = { host, root, said, get data() { return data.coralReef; } }; mounted.push(t);
  await act(async () => root.render(React.createElement(Shell)));
  return t;
}
const button = (host, label) => [...host.querySelectorAll('button')].find(n => n.textContent.trim() === label);
async function click(node) { expect(node, 'control exists').toBeTruthy(); await act(async () => { node.focus(); node.click(); }); }
async function emit(ctl, patch) { await act(async () => ctl.emit(patch)); }
async function choose(select, value) { await act(async () => { select.focus(); select.value = value; select.dispatchEvent(new Event('change', { bubbles: true })); }); }
async function startDive(t) { await click(button(t.host, 'Start the dive')); return dives[dives.length - 1]; }
function detailSelect(scope) {
  return [...scope.querySelectorAll('select')].find(n => [...(n.labels || [])].some(l => l.textContent.includes('3D detail')));
}
const describedBy = el => (el.getAttribute('aria-describedby') || '').split(/\s+/).map(id => document.getElementById(id)?.textContent || '').join(' ');
const why = (t, view) => t.host.querySelector('[data-pf19u-why="' + view + '"]');
const notice = t => t.host.querySelector('[data-pf19u-notice]');

describe('one 3D detail choice for every view', () => {
  it('labels the choice for all 3D views at the dive', async () => {
    const t = await mountTool(), select = detailSelect(t.host);
    expect(select, 'a "3D detail" select at the dive').toBeTruthy();
    expect([...select.options].map(o => [o.value, o.textContent])).toEqual([['auto', 'Automatic'], ['low', 'Smoother'], ['high', 'Detailed']]);
    expect(describedBy(select)).toMatch(/every 3D view/);
    await choose(select, 'low');
    expect(t.data.diveQuality).toBe('low');
    expect((await startDive(t)).options.quality).toBe('low');
  });

  it('sends the saved choice to the Field survey 3D view, and the survey offers the same control', async () => {
    const t = await mountTool({ section: 'survey', surveyView: '3d', pointIndex: 5, diveQuality: 'low' });
    expect(surveys).toHaveLength(1);
    expect(surveys[0].options.quality).toBe('low');
    const select = detailSelect(t.host);
    expect(select, 'a "3D detail" select beside Dive view (3D)').toBeTruthy();
    expect(select.value).toBe('low');
    expect(describedBy(select)).toMatch(/every 3D view/);
  });

  it('remounts the survey view at the new level and keeps its point and camera view', async () => {
    const t = await mountTool({ section: 'survey', surveyView: '3d', pointIndex: 5 });
    const first = surveys[0];
    expect(first.options.quality).toBe('auto');
    await click(button(t.host, 'Whole transect'));
    await choose(detailSelect(t.host), 'high');
    expect(t.data.diveQuality).toBe('high');
    expect(surveys).toHaveLength(2); expect(first.dispose).toHaveBeenCalledTimes(1);
    const next = surveys[1];
    expect(next.options.quality).toBe('high');
    expect(next.goToPoint).toHaveBeenLastCalledWith(5);
    expect(next.setCameraMode).toHaveBeenLastCalledWith('overview');
    expect(button(t.host, 'Whole transect').getAttribute('aria-pressed')).toBe('true');
    expect(document.activeElement).toBe(detailSelect(t.host));
    expect(t.data.pointIndex).toBe(5);
  });
});

describe('what Automatic chose', () => {
  it('names the tier and the reason in one small line that is not a live region', async () => {
    const t = await mountTool(), ctl = await startDive(t);
    t.said.length = 0;
    await emit(ctl, { autoReason: 'software_gl', quality: 'low' });
    const line = why(t, 'dive');
    expect(line, 'reason line').toBeTruthy();
    expect(line.textContent).toBe('Automatic chose Smoother: no graphics chip was found.');
    expect(line.closest('[aria-live],[role="status"],[role="alert"]')).toBeNull();
    await emit(ctl, { diver: { x: 1, y: -8, z: 0, depthM: 8, headingDeg: 10 } });
    expect(t.said.join(' ')).not.toMatch(/Automatic chose/);
  });

  it('uses the device profile for counts, and the survey view says why too', async () => {
    const t = await mountTool({ section: 'survey', surveyView: '3d' });
    expect(why(t, 'survey').textContent).toBe('Automatic chose Detailed: this device has 4 processor cores.');
    await emit(surveys[0], { autoReason: 'memory', quality: 'low' });
    expect(why(t, 'survey').textContent).toBe('Automatic chose Smoother: this device has about 8 GB of memory.');
  });

  it('shows no reason when the student chose a level', async () => {
    const t = await mountTool({ diveQuality: 'high' }), ctl = await startDive(t);
    await emit(ctl, { autoReason: 'cores' });
    expect(why(t, 'dive')).toBeNull();
  });
});

describe('a slow device', () => {
  const RESTART = 'Switching starts the dive again. Your species log is kept.';
  it('never switches a running dive under Automatic: it offers Smoother once, saying the dive restarts', async () => {
    const t = await mountTool({ speciesLog: { clownfish: { site: 'healthy' } } }), first = await startDive(t);
    expect(first.options.quality).toBe('auto');
    t.said.length = 0;
    await emit(first, { slow: true, quality: 'high' });
    expect(dives).toHaveLength(1); expect(first.dispose).not.toHaveBeenCalled();
    expect(notice(t).getAttribute('data-pf19u-notice')).toBe('offer');
    expect(notice(t).textContent).toContain('3D is running slowly on this device. ' + RESTART);
    expect(button(t.host, 'Switch to Smoother')).toBeTruthy();
    expect(t.said).toEqual(['3D is running slowly on this device. ' + RESTART]);
    // Slow spells that come and go change nothing and are not said again.
    await emit(first, { slow: false }); await emit(first, { slow: true }); await emit(first, { slow: false }); await emit(first, { slow: true });
    expect(dives).toHaveLength(1); expect(t.said).toHaveLength(1);
    expect(notice(t).getAttribute('data-pf19u-notice')).toBe('offer');
    // One click: the dive starts again on Smoother; Automatic stays the saved choice and the log is kept.
    await click(button(t.host, 'Switch to Smoother'));
    expect(dives).toHaveLength(2); expect(dives[1].options.quality).toBe('low');
    expect(t.data.diveQuality ?? 'auto').toBe('auto');
    expect(t.data.speciesLog.clownfish).toEqual({ site: 'healthy' });
    expect(document.activeElement).toBe(t.host.querySelector('#cr-dive-title'));
    expect(notice(t).getAttribute('data-pf19u-notice')).toBe('auto');
    expect(notice(t).textContent).toContain('Automatic chose Smoother: 3D was running slowly.');
    // The low tier reporting slow changes nothing: no loop.
    await emit(dives[1], { slow: true }); await emit(dives[1], { slow: false }); await emit(dives[1], { slow: true });
    expect(dives).toHaveLength(2); expect(t.said).toHaveLength(1);
    // Use Detailed again is the student's choice: saved, restarted, and a slow spell only offers.
    await click(button(t.host, 'Use Detailed again'));
    expect(t.data.diveQuality).toBe('high');
    expect(dives).toHaveLength(3); expect(dives[2].options.quality).toBe('high');
    await emit(dives[2], { slow: true, quality: 'high' });
    expect(dives).toHaveLength(3);
    expect(notice(t).getAttribute('data-pf19u-notice')).toBe('offer');
    expect(t.said).toHaveLength(1);
  });

  it('after a slow dive under Automatic, the next dive start on this page visit begins on Smoother and says why', async () => {
    const t = await mountTool(), first = await startDive(t);
    await emit(first, { slow: true, quality: 'high' });
    expect(dives).toHaveLength(1);
    await click(t.host.querySelector('[data-end-dive]'));
    expect(dives).toHaveLength(1);
    const next = await startDive(t);
    expect(dives).toHaveLength(2); expect(next.options.quality).toBe('low');
    expect(notice(t).getAttribute('data-pf19u-notice')).toBe('auto');
    expect(notice(t).textContent).toContain('Automatic chose Smoother: 3D was running slowly.');
    expect(t.data.diveQuality ?? 'auto').toBe('auto');
  });

  it('with Detailed chosen only offers Smoother, and switching saves Smoother for every view', async () => {
    const t = await mountTool({ diveQuality: 'high' }), ctl = await startDive(t);
    t.said.length = 0;
    await emit(ctl, { slow: true, quality: 'high' });
    expect(dives).toHaveLength(1); expect(ctl.dispose).not.toHaveBeenCalled();
    expect(notice(t).textContent).toContain('3D is running slowly on this device. ' + RESTART);
    expect(t.said).toEqual(['3D is running slowly on this device. ' + RESTART]);
    await click(button(t.host, 'Switch to Smoother'));
    expect(t.data.diveQuality).toBe('low');
    expect(dives).toHaveLength(2); expect(dives[1].options.quality).toBe('low');
    expect(notice(t)).toBeNull();
  });

  it('a Detailed dive that ran slowly does not make the next dive Smoother', async () => {
    const t = await mountTool({ diveQuality: 'high' }), ctl = await startDive(t);
    await emit(ctl, { slow: true, quality: 'high' });
    await click(t.host.querySelector('[data-end-dive]'));
    expect((await startDive(t)).options.quality).toBe('high');
  });

  it('leaves focus on the dive canvas when a slow dive reports in', async () => {
    const t = await mountTool(), first = await startDive(t);
    const canvas = first.canvas; await act(async () => canvas.focus());
    await emit(first, { slow: true, quality: 'high' });
    expect(dives).toHaveLength(1);
    expect(document.activeElement).toBe(canvas);
  });

  it('steps the survey view down too, keeping its point, camera view and focus', async () => {
    const t = await mountTool({ section: 'survey', surveyView: '3d', pointIndex: 7 });
    await click(button(t.host, 'Whole transect'));
    const first = surveys[0]; await act(async () => first.canvas.focus());
    t.said.length = 0;
    await emit(first, { slow: true, quality: 'high' });
    expect(surveys).toHaveLength(2);
    const next = surveys[1];
    expect(next.options.quality).toBe('low');
    expect(next.goToPoint).toHaveBeenLastCalledWith(7);
    expect(next.setCameraMode).toHaveBeenLastCalledWith('overview');
    expect(document.activeElement).toBe(next.canvas);
    expect(t.said.filter(m => /running slowly/.test(m))).toHaveLength(1);
    expect(notice(t).getAttribute('data-pf19u-notice')).toBe('auto');
    await emit(next, { slow: true });
    expect(surveys).toHaveLength(2);
  });

  it('saves no device details, only the choice', async () => {
    const t = await mountTool(), ctl = await startDive(t);
    await emit(ctl, { autoReason: 'cores', quality: 'high' });
    await emit(ctl, { slow: true });
    const saved = JSON.stringify(t.data);
    expect(saved.includes('cores')).toBe(false); expect(saved.includes('Some GPU')).toBe(false);
    expect(saved.includes('slow')).toBe(false); expect(saved.includes('autoReason')).toBe(false);
  });
});

describe('today\'s engines, which report none of the new fields', () => {
  beforeEach(() => { install(false); });
  it('behave as before: no line, no notice, no step-down', async () => {
    const t = await mountTool(), ctl = await startDive(t);
    expect(ctl.options.quality).toBe('auto');
    await emit(ctl, { paused: true }); await emit(ctl, { paused: false });
    expect(t.host.querySelector('[data-pf19u-why]')).toBeNull(); expect(notice(t)).toBeNull();
    expect(dives).toHaveLength(1);
    const s = await mountTool({ section: 'survey', surveyView: '3d', pointIndex: 2 });
    expect(surveys).toHaveLength(1); expect(['auto', undefined]).toContain(surveys[0].options.quality);
    expect(s.host.querySelector('[data-pf19u-why]')).toBeNull();
  });
});

// ── The specimen viewer and the guide's picture renderers ────────────────────
describe('specimen viewer and guide pictures', () => {
  let renderers, created;
  beforeEach(() => {
    resetStemLab(); renderers = []; created = [];
    class Renderer {
      constructor(options) { this.canvas = options.canvas; this.capabilities = { isWebGL2: true }; this.ratio = 1; this.info = { programs: [] }; this.getContext = () => ({ isContextLost: () => false }); this.render = vi.fn(); this.dispose = vi.fn(); this.forceContextLoss = vi.fn(); renderers.push(this); }
      setPixelRatio(n) { this.ratio = n; } getPixelRatio() { return this.ratio; }
      setSize(w, h) { this.canvas.width = Math.round(w * this.ratio); this.canvas.height = Math.round(h * this.ratio); }
    }
    window.THREE = { ...REAL_THREE, WebGLRenderer: Renderer };
    window.Reef3DSpecies = { version: '1.0.0', info: () => ({ group: 'fish', healthStates: ['healthy', 'bleached'], portrait: { dir: [.3, .5, 3.2], lookY: 0 } }),
      create: vi.fn((T, id, o) => { created.push(o.quality); const root = new REAL_THREE.Group(), mesh = new REAL_THREE.Mesh(new REAL_THREE.BoxGeometry(.4, .2, .1), new REAL_THREE.MeshBasicMaterial()); root.add(mesh); return { root, radius: .25, dispose: vi.fn(), update: vi.fn() }; }) };
    delete window.Reef3DExplore; delete window.Reef3D;
    vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addListener() {}, removeListener() {} })));
    vi.stubGlobal('devicePixelRatio', 2);
    window.__RR_TEST_EXPORTS__ = {};
    loadTool(TOOL, 'coralReef');
  });
  async function openSpecimen(seed) {
    const t = await mountTool({ section: 'guide', guideSpeciesId: 'clownfish', ...seed });
    await click(t.host.querySelector('[data-open-study]'));
    await click(t.host.querySelector('[data-study-specimen-toggle]'));
    const view = t.host.querySelector('[data-specimen-view]');
    expect(view, 'specimen viewer').toBeTruthy();
    return t;
  }

  it.each([[undefined, 1.5, 'high'], ['high', 1.5, 'high'], ['low', 1, 'low']])('saved %s draws at pixel ratio %s with the %s model', async (pref, ratio, tier) => {
    await openSpecimen(pref ? { diveQuality: pref } : {});
    expect(renderers.at(-1).ratio).toBe(ratio);
    expect(created.at(-1)).toBe(tier);
  });

  it('offers the choice in the viewer and keeps the student\'s view when it changes', async () => {
    const t = await openSpecimen({});
    const select = detailSelect(t.host.querySelector('[data-specimen-view]'));
    expect(select, '3D detail in the specimen viewer').toBeTruthy();
    expect(describedBy(select)).toMatch(/every 3D view/);
    await click(t.host.querySelector('[data-specimen-light-button="studio"]'));
    await click(t.host.querySelector('[data-specimen-turn-button="left"]'));
    await click(t.host.querySelector('[data-specimen-zoom="in"]'));
    const before = { ...t.host.querySelector('[data-specimen-view]').dataset };
    const count = renderers.length;
    await choose(select, 'low');
    expect(t.data.diveQuality).toBe('low');
    expect(renderers.length).toBe(count + 1);
    expect(renderers.at(-1).ratio).toBe(1); expect(created.at(-1)).toBe('low');
    const after = { ...t.host.querySelector('[data-specimen-view]').dataset };
    for (const k of ['specimenScale', 'specimenTurn', 'specimenTilt', 'specimenAngle', 'specimenLighting']) expect(after[k], k).toBe(before[k]);
    expect(document.activeElement).toBe(detailSelect(t.host.querySelector('[data-specimen-view]')));
  });

  it('Automatic follows a loaded engine\'s device profile and says why', async () => {
    window.Reef3D = { version: '1.0.0', mount() {}, profileDevice: () => ({ tier: 'low', reason: 'small_touch', cores: 8, memory: 4, renderer: null }) };
    const t = await openSpecimen({});
    expect(created.at(-1)).toBe('low'); expect(renderers.at(-1).ratio).toBe(1);
    expect(why(t, 'specimen').textContent).toBe('Automatic chose Smoother: this is a small touch screen.');
  });

  it('the guide\'s health pictures use the shared choice', async () => {
    await mountTool({ section: 'guide', diveQuality: 'low' });
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(() => 'data:image/webp;base64,AA');
    await window.__RR_TEST_EXPORTS__.coralReefGuideVisuals.renderHealthPortraits('staghorn_coral', ['healthy']);
    expect(created.at(-1)).toBe('low');
  });
});
