import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// Round 8, Heat and bleaching: every number the new pictures draw comes from sciLabBleachRun,
// and nothing about the outcome shows before the prediction.
vi.setConfig({ testTimeout: 60000 });
const H = await import(/* @vite-ignore */ path.resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js'));
const { loadTool, resetStemLab, renderTool, React, ReactDOMClient, ReactDOMServer } = H;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const act = React.act;
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
const SRC = fs.readFileSync(TOOL, 'utf8');
let S, X, T;
const mounted = [];
beforeEach(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool(TOOL, 'coralReef'); S = window.__RR_TEST_EXPORTS__.coralReefSci; X = window.__RR_TEST_EXPORTS__.coralReef; T = window.__RR_TEST_EXPORTS__.coralReefHt8; });
afterEach(async () => {
  while (mounted.length) { const m = mounted.pop(); await act(async () => m.root.unmount()); m.host.remove(); }
  delete window.matchMedia;
});
function dom(html) { const host = document.createElement('div'); host.innerHTML = html; return host; }
async function mount(seed = {}, theme = 'light') {
  let data = { coralReef: { section: 'science', ...seed } };
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const cfg = window.StemLab._registry.coralReef;
  function Shell() {
    const [toolData, setToolData] = React.useState(data);
    data = toolData;
    return cfg.render({ React, toolData, setToolData, theme, t: (k, f) => f || k, announceToSR: () => {} });
  }
  const item = { host, root, get d() { return data.coralReef; } };
  mounted.push(item);
  await act(async () => root.render(React.createElement(Shell)));
  return item;
}
async function slide(input, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  await act(async () => { setter.call(input, String(value)); input.dispatchEvent(new Event('input', { bubbles: true })); });
}
const P = () => X.palette('light');
const t = (k, f) => f;
const fill = (s, o) => String(s).replace(/\{(\w+)\}/g, (m, n) => (o[n] == null ? m : o[n]));
function figWeek(run, week, palette) {
  const fig = T.figWeek(React.createElement, palette || P(), t, fill, run, week, 'u', true);
  return { fig, svg: dom(ReactDOMServer.renderToStaticMarkup(React.createElement('svg', null, fig.kids))) };
}
const RUNS = () => {
  const out = [];
  for (const sensitivity of ['tolerant', 'typical', 'sensitive']) for (const [anomaly, weeks] of [[1, 3], [3, 3], [1.5, 6], [2, 4], [3, 8], [4, 12], [0.5, 6], [2, 0]]) out.push(S.bleachRun({ anomaly, weeks, sensitivity }));
  return out;
};

describe('the polyp draws what the run says', () => {
  it('draws the same number of algae cells as the run has algae, in every week', () => {
    const N = T.cells.length;
    expect(N).toBeGreaterThanOrEqual(40);
    for (const run of RUNS()) for (const r of run.rows.filter((q) => q.week % 4 === 0 || q.week === run.heatEnd)) {
      const { svg } = figWeek(run, r.week);
      const drawn = svg.querySelectorAll('[data-ht8-alga]').length;
      const want = r.living === 0 ? 0 : Math.max(1, Math.round(N * r.algae));
      expect(drawn, r.week + ' algae ' + r.algae).toBe(want);
    }
  });
  it('keeps the algae in the tissue: never in the skeleton or the gut', () => {
    for (const c of T.cells) {
      expect(c.y, 'above the cup floor').toBeLessThanOrEqual(166);
      // Below the rim only the tissue in the cup holds algae, or the thin sheet on the rim.
      if (c.y > 110) expect(c.x > 57 && c.x < 143 || c.y < 116, c.x + ',' + c.y).toBe(true);
      // Gut cavity box, well inside its outline.
      const inGut = c.x > 76 && c.x < 124 && c.y > 92 && c.y < 154;
      expect(inGut, 'gut ' + c.x + ',' + c.y).toBe(false);
    }
  });
  it('tissue goes clear as the algae go, with the tentacles still drawn, and is not painted opaque white', () => {
    const op = (a) => {
      const el = dom(ReactDOMServer.renderToStaticMarkup(T.polyp(React.createElement, 'p', 0, 0, 1, a, false, { uid: 'u' })));
      return { o: Number(el.querySelector('[data-ht8-body]').getAttribute('fill-opacity')), tent: el.querySelectorAll('[data-ht8-tentacle]').length, mouth: el.querySelectorAll('[data-ht8-mouth]').length };
    };
    const full = op(1), low = op(0.05);
    expect(full.o).toBeGreaterThan(0.9);
    expect(low.o).toBeLessThan(0.35);
    expect(low.tent).toBe(full.tent);
    expect(low.tent).toBeGreaterThanOrEqual(8);
    expect(low.mouth).toBe(1);
  });
  it('the dead state is bare skeleton with turf: no tissue, algae, tentacles or mouth', () => {
    const el = dom(ReactDOMServer.renderToStaticMarkup(T.polyp(React.createElement, 'p', 0, 0, 1, 0.5, true, { uid: 'u' })));
    expect(el.querySelector('[data-ht8-body]')).toBe(null);
    expect(el.querySelectorAll('[data-ht8-alga],[data-ht8-tentacle],[data-ht8-mouth]').length).toBe(0);
    expect(el.querySelector('[data-ht8-turf]')).not.toBe(null);
    expect(el.querySelector('[data-ht8-septa]')).not.toBe(null);
  });
  it('shows the clear tissue note only on a living coral with few algae', () => {
    const run = S.bleachRun({ anomaly: 3, weeks: 8, sensitivity: 'typical' });
    for (const r of run.rows) {
      const text = figWeek(run, r.week).svg.textContent;
      expect(text.includes('Clear tissue'), 'week ' + r.week).toBe(r.living > 0 && r.algae < 0.5);
    }
  });
});

describe('ten corals on a shared seabed', () => {
  it('draws exactly the run counts in every week, with four different kinds of marks', () => {
    const seen = {};
    // One render per distinct count state: every week is about 5 minutes of DOM on a busy machine.
    for (const run of RUNS()) for (const r of run.rows.filter((x, i, a) => a.findIndex((y) => y.dead === x.dead && y.white === x.white && y.living === x.living && (y.algae < 0.9) === (x.algae < 0.9)) === i)) {
      const { svg } = figWeek(run, r.week);
      const all = [...svg.querySelectorAll('[data-ht8-reef] [data-ht8-colony]')].map((n) => n.getAttribute('data-ht8-colony'));
      expect(all.length).toBe(10);
      const n = (st) => all.filter((x) => x === st).length;
      expect(n('dead'), 'dead').toBe(r.dead);
      expect(n('bleached'), 'bleached').toBe(r.white);
      expect(n('healthy') + n('pale'), 'not bleached').toBe(r.living - r.white);
      expect(n('healthy') + n('pale') + n('bleached'), 'alive').toBe(r.living);
      if (r.algae < 0.9) expect(n('healthy')).toBe(0); else expect(n('pale')).toBe(0);
      all.forEach((st) => { seen[st] = true; });
    }
    expect(Object.keys(seen).sort()).toEqual(['bleached', 'dead', 'healthy', 'pale']);
  });
  it('never brings a dead colony back, and each colony keeps its shape through the year', () => {
    for (const run of RUNS()) {
      const deadAt = {}; let forms = null;
      for (const r of run.rows) {
        const list = [...figWeek(run, r.week).svg.querySelectorAll('[data-ht8-reef] [data-ht8-colony]')];
        const f = list.map((n) => n.getAttribute('data-ht8-form')).join();
        if (forms) expect(f).toBe(forms); forms = f;
        list.forEach((n, i) => {
          if (deadAt[i]) expect(n.getAttribute('data-ht8-colony'), 'colony ' + i + ' week ' + r.week).toBe('dead');
          if (n.getAttribute('data-ht8-colony') === 'dead') deadAt[i] = true;
        });
      }
    }
  });
  it('the four states have different marks, not only different colors', () => {
    for (const form of T.forms) {
      const marks = ['healthy', 'pale', 'bleached', 'dead'].map((st) => {
        const g = dom(ReactDOMServer.renderToStaticMarkup(T.colony(React.createElement, 'c', form, st, 0, 0, 1, '#b5742c')));
        return [...g.querySelectorAll('[data-ht8-mark]')].map((n) => n.getAttribute('d')).join('|');
      });
      marks.forEach((m) => expect(m.length, form).toBeGreaterThan(0));
      expect(new Set(marks).size, form).toBe(4);
      // The dead colony is a broken outline, so it reads without color too.
      const outline = (st) => dom(ReactDOMServer.renderToStaticMarkup(T.colony(React.createElement, 'c', form, st, 0, 0, 1, '#b5742c'))).querySelector('[data-ht8-shape]').getAttribute('d');
      expect(outline('dead'), form).not.toBe(outline('healthy'));
    }
  });
});

describe('instrument panel and chart', () => {
  it('warms the water only in heatwave weeks, with the old strength', () => {
    const run = S.bleachRun({ anomaly: 2, weeks: 4, sensitivity: 'typical' });
    for (const r of run.rows) {
      const warm = [...figWeek(run, r.week).svg.querySelectorAll('[data-ht8-warm]')];
      if (r.heat) { expect(warm.length).toBeGreaterThan(0); warm.forEach((w) => expect(Number(w.getAttribute('fill-opacity'))).toBeCloseTo(0.12 + 0.08 * r.anomaly, 5)); } else expect(warm.length, 'week ' + r.week).toBe(0);
    }
  });
  it('the chart line reads back the run, and its bands follow alertLevel', () => {
    for (const run of RUNS()) {
      const { svg } = figWeek(run, 10);
      const plot = svg.querySelector('[data-ht8-plot]');
      const y0 = Number(plot.getAttribute('data-y0')), y1 = Number(plot.getAttribute('data-y1')), top = Number(plot.getAttribute('data-top'));
      expect(top).toBe(Math.max(12, Math.ceil(run.peak / 4) * 4));
      const pts = svg.querySelector('[data-ht8-dhw-line]').getAttribute('points').split(' ').map((p) => p.split(',').map(Number));
      expect(pts.length).toBe(53);
      pts.forEach((p, i) => expect((y0 - p[1]) / (y0 - y1) * top).toBeCloseTo(run.rows[i].dhw, 0));
      for (const b of svg.querySelectorAll('[data-ht8-band]')) {
        const from = Number(b.getAttribute('data-from'));
        expect(S.alertLevel(from)).toBe(Number(b.getAttribute('data-ht8-band')) + 1);
        expect(S.alertLevel(from - 0.01)).toBe(Number(b.getAttribute('data-ht8-band')));
        expect(from).toBeLessThan(top);
      }
    }
  });
  it('shows the week reading at the marker, and tick labels that do not collide', () => {
    for (const run of RUNS()) {
      const r = run.rows[run.heatEnd];
      const { svg } = figWeek(run, r.week);
      expect(svg.querySelector('[data-ht8-now]').textContent).toBe(String(r.dhw));
      const ys = [...svg.querySelectorAll('[data-ht8-tick]')].map((n) => Number(n.getAttribute('y'))).sort((a, b) => a - b);
      for (let i = 1; i < ys.length; i++) expect(ys[i] - ys[i - 1], 'peak ' + run.peak).toBeGreaterThanOrEqual(13);
    }
  });
  it('fits the old aria label and a figure no taller than 450 units', () => {
    const run = S.bleachRun({ anomaly: 1.5, weeks: 6, sensitivity: 'typical' });
    const { fig } = figWeek(run, 20);
    const r = run.rows[20];
    expect(fig.label).toContain('Week 20.');
    expect(fig.label).toContain(r.living + ' are alive');
    expect(fig.height).toBeLessThanOrEqual(450);
  });
});

describe('before the prediction', () => {
  it('draws the same polyp, reef and panel for every heatwave, with nothing about the outcome', async () => {
    const seen = [];
    for (const pr of S.PRESETS) {
      const m = await mount({ sciBleach: { anomaly: pr.anomaly, weeks: pr.weeks, sensitivity: pr.sensitivity } });
      const svg = m.host.querySelector('[data-scilab-figure="bleach-week"]');
      const part = (sel) => [...svg.querySelectorAll(sel)].map((n) => n.outerHTML).join('');
      const norm = (s) => s.replace(/ht8w[A-Za-z0-9]*/g, 'ID');
      expect(svg.querySelectorAll('[data-ht8-alga]').length).toBe(T.cells.length);
      const states = [...svg.querySelectorAll('[data-ht8-colony]')].filter((n) => n.closest('[data-ht8-reef]')).map((n) => n.getAttribute('data-ht8-colony'));
      expect(states).toEqual(Array(10).fill('healthy'));
      expect(svg.querySelectorAll('[data-ht8-warm]').length).toBe(0);
      expect(svg.getAttribute('aria-label')).toMatch(/^Week 0\. Healthy, full of algae\..* 10 are alive \(0 bleached\) and 0 have died/);
      expect(svg.textContent).not.toMatch(/Clear tissue/);
      seen.push(norm(part('[data-ht8-hero]') + part('[data-ht8-reef]') + part('[data-ht8-panel]')));
      // No attribute anywhere carries the run's outcome.
      const run = S.bleachRun(pr);
      expect(svg.outerHTML).not.toContain('data-dead');
      expect(svg.outerHTML).not.toContain('data-survivors');
      expect(run.rows[0].dead).toBe(0);
      await act(async () => m.root.unmount()); m.host.remove(); mounted.pop();
    }
    expect(new Set(seen).size).toBe(1);
  });
  it('a reveal then follows the slider', async () => {
    window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
    const m = await mount({ sciBleach: { anomaly: 3, weeks: 8, sensitivity: 'typical', pred: 'some', revealed: true } });
    const run = S.bleachRun(m.d.sciBleach);
    const svg = () => m.host.querySelector('[data-scilab-figure="bleach-week"]');
    const slider = [...m.host.querySelectorAll('#cr-scilab-panel-heat input[type="range"]')].find((i) => i.max === '52');
    for (const w of [0, 6, 10, 14, 30, 52]) {
      await slide(slider, w);
      const r = run.rows[w];
      expect(svg().getAttribute('aria-label')).toMatch(new RegExp('^Week ' + w + '\\.'));
      expect(svg().querySelectorAll('[data-ht8-reef] [data-ht8-colony="dead"]').length).toBe(r.dead);
      expect(svg().querySelectorAll('[data-ht8-reef] [data-ht8-colony="bleached"]').length).toBe(r.white);
      expect(svg().querySelectorAll('[data-ht8-alga]').length).toBe(r.living === 0 ? 0 : Math.max(1, Math.round(T.cells.length * r.algae)));
    }
  });
});

describe('science card scenes', () => {
  const IDS = ['symbiosis', 'bleaching', 'return'];
  it('adds one hidden, wordless, modest scene to each heat card', async () => {
    const m = await mount({ sciTopic: 'heat' });
    for (const id of IDS) {
      const el = m.host.querySelector('[data-pg-art="card-' + id + '"]');
      expect(el, id).not.toBe(null);
      expect(el.getAttribute('aria-hidden')).toBe('true');
      expect(el.textContent).toBe('');
      expect(el.querySelector('[role="img"],[aria-label],a,button,[tabindex]')).toBe(null);
      expect(el.querySelectorAll('svg *').length, id + ' nodes').toBeLessThan(60);
      expect(el.closest('section.cr-sci-card').querySelector('.cr-sci-text [data-pg-art]')).toBe(el);
    }
  });
  it('no two look like copies: they share almost no drawing', async () => {
    const m = await mount({ sciTopic: 'heat' });
    const paths = IDS.map((id) => new Set([...m.host.querySelector('[data-pg-art="card-' + id + '"] svg').querySelectorAll('path')].filter((n) => !/^url/.test(n.getAttribute('fill') || '') && n.getAttribute('opacity') !== '0.08').map((n) => n.getAttribute('d'))));
    expect([...paths[0]].filter((d) => paths[1].has(d)).length).toBe(0);
    expect([...paths[0]].filter((d) => paths[2].has(d)).length).toBe(0);
    expect([...paths[1]].filter((d) => paths[2].has(d)).length).toBe(0);
  });
  it('the bleaching scene shows the same colonies healthy, bleached and with color back, in that order, none dead', async () => {
    const m = await mount({ sciTopic: 'heat' });
    const list = [...m.host.querySelectorAll('[data-pg-art="card-bleaching"] [data-ht8-colony]')];
    const by = (st) => list.filter((n) => n.getAttribute('data-ht8-colony') === st);
    expect(by('dead').length).toBe(0);
    expect(by('bleached').length).toBeGreaterThan(0);
    const forms = (arr) => arr.map((n) => n.getAttribute('data-ht8-form')).join();
    const healthy = by('healthy'), n = by('bleached').length;
    expect(healthy.length).toBe(2 * n);
    expect(forms(healthy.slice(0, n))).toBe(forms(by('bleached')));
    expect(forms(healthy.slice(n))).toBe(forms(by('bleached')));
  });
});

describe('symbiosis figure', () => {
  it('uses the new polyp, and keeps its labels on the card', async () => {
    const m = await mount({ sciTopic: 'heat' });
    const svg = m.host.querySelector('svg[data-figure="symbiosis"]');
    expect(svg.querySelectorAll('[data-ht8-alga]').length).toBe(T.cells.length);
    expect(svg.querySelectorAll('[data-ht8-tentacle]').length).toBeGreaterThanOrEqual(8);
    for (const w of ['Sunlight', 'Tentacles', 'Mouth', 'Tiny algae', 'Food passed', 'Limestone']) expect(svg.textContent).toContain(w);
  });
});

describe('page rules', () => {
  it('has unique svg ids on the page, and gradients that paint', async () => {
    window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
    const m = await mount({ sciTopic: 'heat', sciBleach: { anomaly: 3, weeks: 8, sensitivity: 'typical', pred: 'some', revealed: true } });
    const ids = [...m.host.querySelectorAll('svg [id]')].map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const n of m.host.querySelectorAll('[data-scilab-figure="bleach-week"] [fill^="url(#"]')) {
      const id = n.getAttribute('fill').slice(5, -1);
      expect(m.host.querySelector('[id="' + id + '"]'), id).not.toBe(null);
    }
  });
  it('stops the tentacle motion for reduced motion, in both ways', () => {
    expect(SRC.includes('@media(prefers-reduced-motion:reduce){[data-coralreef-root] .cr-scilab-fig *{transition:none!important;animation:none!important}}')).toBe(true);
    const run = S.bleachRun({ anomaly: 1, weeks: 3, sensitivity: 'typical' });
    const still = T.figWeek(React.createElement, P(), t, fill, run, 0, 'u', true);
    const moving = T.figWeek(React.createElement, P(), t, fill, run, 0, 'u', false);
    const html = (f) => ReactDOMServer.renderToStaticMarkup(React.createElement('svg', null, f.kids));
    expect(html(still)).not.toContain('ht8-sway');
    expect(html(moving)).toContain('ht8-sway');
    // A dead polyp has nothing left to move.
    const dead = T.polyp(React.createElement, 'p', 0, 0, 1, 0.5, true, { uid: 'u', sway: true });
    expect(ReactDOMServer.renderToStaticMarkup(dead)).not.toContain('ht8-sway');
  });
  it('holds new lane code to ES5 and bans dashes in its strings', () => {
    const ours = SRC.split('\n').filter((l) => /ht8|HT8/.test(l));
    expect(ours.length).toBeGreaterThan(5);
    for (const l of ours) {
      expect(/=>|`|\blet\b|\bconst\b/.test(l), l.slice(0, 120)).toBe(false);
      expect(/[–—]/.test(l), l.slice(0, 120)).toBe(false);
    }
  });
});
