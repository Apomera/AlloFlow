import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

// Lane E: the tool's side of staged loading. Both 3D views ask for a staged mount,
// show a progress card over the canvas, and become ready only when the engine says
// its first frame is drawn (getState().ready / onState). A failure disposes the engine.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const act = React.act;
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
const mounted = [];
let engines;

function stagedEngine(extra) {
  return {
    version: '1.0.0',
    mount(canvas, options) {
      let state = { ready: false, paused: false, view: 'third', diver: { depthM: 8 }, focused: null, nearby: [], pointIndex: 0, ...extra };
      const ctl = {
        canvas, options, disposed: 0, calls: [],
        getState: () => state,
        dispose() { ctl.disposed++; },
        setInput() {}, resize() {}, focus() {}, swimTo() {}, focusNext() {}, focusPrevious() {}, clearFocus() {},
        setView(v) { ctl.calls.push(['setView', v]); }, setPaused() {},
        goToPoint(i) { ctl.calls.push(['goToPoint', i]); state = { ...state, pointIndex: i }; },
        emit(patch) { state = { ...state, ...patch }; options.onState(state); }
      };
      engines.push(ctl);
      return ctl;
    }
  };
}

beforeEach(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  window.THREE = { stub: true };
  window.Reef3DSpecies = { version: '1.0.0', create: () => ({}) };
  window.Reef3DHabitat = { version: '1.0.0', create: () => ({}) };
  engines = [];
  window.Reef3DExplore = stagedEngine();
  window.Reef3D = stagedEngine();
  loadTool(TOOL, 'coralReef');
});
afterEach(async () => {
  while (mounted.length) { const item = mounted.pop(); await act(async () => item.root.unmount()); item.host.remove(); }
  delete window.Reef3DExplore; delete window.Reef3D; delete window.Reef3DSpecies; delete window.Reef3DHabitat; delete window.THREE;
});

async function mountTool(seed, theme) {
  let data = { coralReef: seed };
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const cfg = window.StemLab._registry.coralReef;
  function Shell() {
    const [toolData, setToolData] = React.useState(data);
    data = toolData;
    return cfg.render({ React, toolData, setToolData, theme, t: (key, fallback) => fallback || key, announceToSR: () => {} });
  }
  mounted.push({ host, root });
  await act(async () => root.render(React.createElement(Shell)));
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  return { host, get data() { return data; } };
}
const button = (host, label) => [...host.querySelectorAll('button')].find((b) => b.textContent.trim() === label);
const bar = (host) => host.querySelector('[role="progressbar"]');

describe('staged loading in the tool', () => {
  it('dive: asks for a staged mount, shows real progress over the canvas, and is ready only with the first frame', async () => {
    const t = await mountTool({ section: 'explore' });
    await act(async () => { button(t.host, 'Start the dive').click(); await Promise.resolve(); await Promise.resolve(); });
    expect(engines).toHaveLength(1);
    const ctl = engines[0];
    expect(ctl.options.staged).toBe(true);
    expect(typeof ctl.options.onProgress).toBe('function');
    expect(t.host.querySelector('[role="status"]').textContent).toBe('Loading the reef...');
    expect(bar(t.host).getAttribute('aria-valuenow')).toBe('0');
    expect(bar(t.host).getAttribute('aria-valuetext')).toBe('0% loaded');
    expect(button(t.host, 'Swim forward'), 'controls wait for the reef').toBeUndefined();
    await act(async () => ctl.options.onProgress(0.42));
    expect(bar(t.host).getAttribute('aria-valuenow')).toBe('42');
    expect(bar(t.host).querySelector('span').style.width).toBe('42%');
    expect(t.host.textContent).toContain('42% loaded');
    // A state report before the first frame keeps the card up.
    await act(async () => ctl.emit({ ready: false }));
    expect(bar(t.host)).toBeTruthy();
    expect(button(t.host, 'Swim forward')).toBeUndefined();
    await act(async () => { ctl.options.onProgress(1); ctl.emit({ ready: true }); });
    expect(bar(t.host)).toBeNull();
    expect(button(t.host, 'Swim forward')).toBeTruthy();
    expect(ctl.calls).toContainEqual(['setView', 'third']);
  });

  it('dive: a failure while loading shows the recoverable message and disposes the engine', async () => {
    const t = await mountTool({ section: 'explore' });
    await act(async () => { button(t.host, 'Start the dive').click(); await Promise.resolve(); await Promise.resolve(); });
    const ctl = engines[0];
    await act(async () => ctl.options.onError(new Error('shader did not link')));
    expect(t.host.querySelector('[role="alert"]').textContent).toContain('could not start');
    expect(ctl.disposed).toBe(1);
    expect(bar(t.host)).toBeNull();
    await act(async () => { button(t.host, 'Try the 3D view again').click(); await Promise.resolve(); await Promise.resolve(); });
    expect(engines).toHaveLength(2);
    expect(ctl.disposed).toBe(1);
  });

  it('survey 3D view: staged too, keeps the survey point, and shows the hint only once drawn', async () => {
    const t = await mountTool({ section: 'survey', surveyView: '3d', pointIndex: 5 });
    expect(engines).toHaveLength(1);
    const ctl = engines[0];
    expect(ctl.options.staged).toBe(true);
    expect(ctl.calls).toContainEqual(['goToPoint', 5]);
    expect(t.host.querySelector('[role="status"]').textContent).toBe('Loading the 3D reef...');
    await act(async () => ctl.options.onProgress(0.6));
    expect(bar(t.host).getAttribute('aria-valuenow')).toBe('60');
    expect(t.host.textContent).not.toContain('The orange plumb line');
    await act(async () => ctl.emit({ ready: true, pointIndex: 5 }));
    expect(bar(t.host)).toBeNull();
    expect(t.host.textContent).toContain('The orange plumb line');
    expect(t.data.coralReef.pointIndex).toBe(5);
  });

  it('the loading card uses the palette in every theme', async () => {
    for (const theme of ['light', 'dark', 'contrast']) {
      const t = await mountTool({ section: 'explore' }, theme);
      await act(async () => { button(t.host, 'Start the dive').click(); await Promise.resolve(); await Promise.resolve(); });
      const P = window.__RR_TEST_EXPORTS__.coralReef.palette(theme);
      const card = t.host.querySelector('.cr-load'), fill = bar(t.host).querySelector('span');
      const rgb = (hex) => 'rgb(' + [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(', ') + ')';
      expect(card.style.background, theme).toBe(rgb(P.card));
      expect(card.style.color, theme).toBe(rgb(P.text));
      expect(fill.style.background, theme).toBe(rgb(P.accent));
    }
  });
});
