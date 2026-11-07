import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import path from 'node:path';
import { createRequire } from 'node:module';

// Lane hb13: the Field survey's 3D view never tells the student what lies under
// a point before it is recorded. The engine's own state names the category; this
// drives the real Dive3D host with a ready engine and reads every word and every
// attribute inside the 3D view block.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
const REPO = process.cwd().split(String.fromCharCode(92)).join('/');
const THREE = createRequire(import.meta.url)(REPO + '/vendor/three-r128/three.min.js');
let loadTool, resetStemLab, React, ReactDOMClient;
beforeAll(async () => {
  const mod = await import(/* @vite-ignore */ 'file:///' + path.resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js').replace(/\\/g, '/'));
  ({ loadTool, resetStemLab, React, ReactDOMClient } = mod);
  window.__RR_TEST_EXPORTS__ = window.__RR_TEST_EXPORTS__ || {};
  resetStemLab(); loadTool(TOOL, 'coralReef');
});
const mounted = [];
afterEach(async () => {
  while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); }
  delete window.Reef3D; delete window.Reef3DHabitat; delete window.THREE;
});
const NAMES = ['Live hard coral', 'Bleached coral', 'Recently dead coral', 'Fleshy seaweed', 'macroalgae', 'Rock', 'Rubble', 'Sand', 'hard_coral', 'bleached_coral', 'recently_dead_coral', 'bleached', 'dead', 'seaweed', 'algae'];
const CODES = ['HC', 'BL', 'RKC', 'NIA', 'RC', 'RB', 'SD'];

describe('hb13 survey 3D view: no hint of the answer', () => {
  it('shows no category name, code or id in the 3D view block, in text or attributes, before the point is recorded', async () => {
    const X = window.__RR_TEST_EXPORTS__.coralReef, site = X.SITES.find((s) => s.id === 'heatwave'), layout = X.buildTransect(site, site.seed);
    const seen = [];
    window.THREE = THREE;
    window.Reef3DHabitat = { version: '1.0.0', create() {}, normalizeLayout: (l) => l };
    window.Reef3D = { version: '1.0.0', mount(canvas, options) {
      let index = 0;
      const state = () => ({ pointIndex: index, distanceM: layout.points[index].distanceM, category: layout.points[index].category, coralForm: layout.points[index].coralForm, cameraMode: 'diver', paused: true, reducedMotion: true, ready: true, fishVisible: [] });
      const ctl = { goToPoint(i) { index = i; options.onState(state()); }, highlightPoint() {}, setCameraMode() {}, setPaused() {}, setReducedMotion() {}, lookCamera() {}, zoomCamera() {}, resetCamera() {}, resize() {}, dispose() {}, getState: state };
      seen.push(ctl); return ctl;
    } };
    const host = document.createElement('div'); document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    const cfg = window.StemLab._registry.coralReef;
    function Shell() {
      const [toolData, setToolData] = React.useState({ coralReef: { section: 'survey', surveySiteId: 'heatwave', surveySeed: site.seed, surveyView: '3d', pointIndex: 24 } });
      return cfg.render({ React, toolData, setToolData, t: (k, f) => f || k, announceToSR() {} });
    }
    mounted.push({ host, root });
    await React.act(async () => root.render(React.createElement(Shell)));
    await React.act(async () => { await new Promise((r) => setTimeout(r, 30)); });
    const block = host.querySelector('[data-survey-dive]');
    expect(block, 'the 3D view block is on screen').toBeTruthy();
    expect(seen.length, 'the engine was mounted').toBe(1);
    expect(block.querySelector('[data-survey-dive-controls]'), 'the view reached ready').toBeTruthy();
    expect(layout.points[24].category).toBe('recently_dead_coral');
    const words = [block.textContent];
    block.querySelectorAll('*').forEach((el) => { for (const a of el.attributes) words.push(a.name + '=' + a.value); });
    const all = words.join(' | ');
    for (const n of NAMES) expect(new RegExp('\\b' + n + '\\b', 'i').test(all), n).toBe(false);
    for (const c of CODES) expect(new RegExp('\\b' + c + '\\b').test(all), c).toBe(false);
  });
});
