import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

// The tool's side of the 3D dive contract, driven against a stub engine:
// mount gets the transect layout, engine point changes reach the survey,
// survey point changes reach the camera, and leaving the view disposes it.

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const act = React.act;
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
let calls;

beforeEach(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  calls = { mount: [], goTo: [], dispose: 0 };
  window.THREE = { stub: true };
  window.Reef3DHabitat = { version: '1.0.0', create: () => ({}) };
  window.Reef3D = {
    version: '1.0.0',
    mount(canvas, options) {
      let point = 0;
      calls.mount.push({ canvas, options });
      calls.ctl = {
        goToPoint(i) { point = i; calls.goTo.push(i); },
        getState() { return { pointIndex: point }; },
        dispose() { calls.dispose += 1; },
        _emit(i) { point = i; options.onState({ pointIndex: i }); }
      };
      // The real engine reports its own starting point as soon as it mounts.
      options.onState({ pointIndex: 0 });
      return calls.ctl;
    }
  };
  loadTool(TOOL, 'coralReef');
});
afterEach(() => { delete window.Reef3D; delete window.Reef3DHabitat; delete window.THREE; });

async function mountTool(initial) {
  let data = initial;
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const cfg = window.StemLab._registry.coralReef;
  function Shell() {
    const [toolData, setToolData] = React.useState(data);
    data = toolData;
    return cfg.render({ React, t: (k, f) => f || k, announceToSR: () => {}, toolData, setToolData });
  }
  await act(async () => { root.render(React.createElement(Shell)); });
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  return { host, root, get data() { return data; } };
}

describe('layouts speak the habitat companion\'s language', () => {
  it('the real reef_3d_habitat.js reads every site\'s background and every point and fish', async () => {
    const { readFileSync } = await import('node:fs');
    const fake = {};
    new Function('window', readFileSync('stem_lab/reef_3d_habitat.js', 'utf8'))(fake);
    const H = fake.Reef3DHabitat;
    expect(typeof H.normalizeLayout).toBe('function');
    const X = window.__RR_TEST_EXPORTS__.coralReef;
    for (const site of X.SITES) {
      const layout = X.buildTransect(site, site.seed);
      const n = H.normalizeLayout(layout);
      const live = site.cover.hard_coral + site.cover.bleached_coral;
      // The companion falls back to 0.35 / 0 / 0.2 when a field is missing or misnamed.
      expect(n.background.coralCover, site.id).toBeCloseTo(live, 6);
      expect(n.background.algae, site.id).toBeCloseTo(site.cover.macroalgae, 6);
      expect(n.background.bleaching, site.id).toBeCloseTo(live ? site.cover.bleached_coral / live : 0, 6);
      expect(n.points.map((p) => p.category)).toEqual(layout.points.map((p) => p.category));
      for (const c of n.points.map((p) => p.category)) expect(H.categories.includes(c), c).toBe(true);
      for (const p of n.points) if (p.coralForm) expect(H.coralForms.includes(p.coralForm), p.coralForm).toBe(true);
      expect(n.lengthM).toBe(layout.lengthM);
      expect(n.beltHalfWidthM).toBe(layout.beltHalfWidthM);
    }
  });
});

describe('3D dive view', () => {
  it('mounts the engine with the survey layout and stays in step with the survey', async () => {
    const X = window.__RR_TEST_EXPORTS__.coralReef;
    const t = await mountTool({ coralReef: { section: 'survey', surveyView: '3d', pointIndex: 3 } });
    expect(calls.mount.length).toBe(1);
    const { canvas, options } = calls.mount[0];
    expect(canvas.tagName).toBe('CANVAS');
    expect(canvas.getAttribute('tabindex')).toBe('0');
    expect(options.THREE).toBe(window.THREE);
    expect(options.layout.points.length).toBe(40);
    const site = X.SITES[0];
    expect(JSON.stringify(options.layout)).toBe(JSON.stringify(X.buildTransect(site, site.seed)));
    expect(calls.goTo[0]).toBe(3);
    // The engine's start-up report (point 0) must not move the student's survey.
    expect(t.data.coralReef.pointIndex).toBe(3);

    await act(async () => { calls.ctl._emit(7); });
    expect(t.data.coralReef.pointIndex).toBe(7);

    const next = [...t.host.querySelectorAll('button')].find((b) => b.textContent === 'Next point');
    await act(async () => { next.click(); });
    expect(t.data.coralReef.pointIndex).toBe(8);
    expect(calls.goTo[calls.goTo.length - 1]).toBe(8);

    const back = [...t.host.querySelectorAll('button')].find((b) => b.textContent === 'Back to close-up pictures');
    await act(async () => { back.click(); });
    expect(calls.dispose).toBe(1);
    await act(async () => { t.root.unmount(); });
    t.host.remove();
  });

  it('shows a recoverable message when the engine fails', async () => {
    window.Reef3D.mount = () => { throw new Error('no WebGL'); };
    const t = await mountTool({ coralReef: { section: 'survey', surveyView: '3d' } });
    const alert = t.host.querySelector('[role="alert"]');
    expect(alert && alert.textContent.includes('could not start'), 'error message').toBe(true);
    expect([...t.host.querySelectorAll('button')].some((b) => b.textContent === 'Try the 3D view again')).toBe(true);
    // The survey still works without 3D.
    expect(t.host.querySelector('[role="toolbar"]')).toBeTruthy();
    await act(async () => { t.root.unmount(); });
    t.host.remove();
  });
});
