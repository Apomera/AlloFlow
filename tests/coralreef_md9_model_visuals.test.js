import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'node:path';

// Reef future visual pass (lane md9). Every drawn number is compared with the
// model's own functions, and the prediction gate is checked on the real section.
vi.setConfig({ testTimeout: 60000 });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
let loadTool, resetStemLab, renderTool, React, ReactDOMClient, runIsolatedAxe, X, M;
const mounted = [];

beforeEach(async () => {
  const smoke = await import(path.resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js'));
  ({ loadTool, resetStemLab, renderTool, React, ReactDOMClient } = smoke);
  ({ runIsolatedAxe } = await import(path.resolve(process.cwd(), 'tests/helpers/isolated_axe_harness.js')));
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  loadTool(TOOL, 'coralReef');
  X = window.__RR_TEST_EXPORTS__.coralReef;
  M = window.__RR_TEST_EXPORTS__.coralReefModel;
});
afterEach(async () => {
  while (mounted.length) { const m = mounted.pop(); await React.act(async () => m.root.unmount()); m.host.remove(); }
});

function parse(html) { return new DOMParser().parseFromString(html, 'text/html'); }
function page(state, theme) { return parse(renderTool('coralReef', { coralReef: Object.assign({ section: 'model' }, state) }, { theme })); }
const pc = (v) => Math.round(v * 100);
const run = (id) => X.runScenario(X.scenarioSettings(id), 11);
const shown = (id, year, extra) => Object.assign({ model: X.scenarioSettings(id), modelRevealedFor: { [id]: true }, modelSurveyYear: year }, extra);

async function mount(seed) {
  let data = { coralReef: Object.assign({ section: 'model' }, seed) };
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const cfg = window.StemLab._registry.coralReef;
  function Shell() {
    const st = React.useState(data);
    data = st[0];
    return cfg.render({ React, toolData: st[0], setToolData: st[1], t: (k, f) => f || k, announceToSR() {} });
  }
  await React.act(async () => { root.render(React.createElement(Shell)); });
  mounted.push({ root, host });
  return { host, get data() { return data.coralReef; } };
}

describe('cover bars beside the year picture', () => {
  it('draw each share from the cover the picture itself uses, for several years', () => {
    for (const [id, year] of [['recent', 0], ['recent', 12], ['warmer', 30], ['rubble', 20]]) {
      const st = X.scenarioSettings(id), rows = run(id), site = X.siteFromModelYear(rows[year], st, 0);
      const doc = page(shown(id, year));
      expect(+doc.querySelector('svg[data-year-art]').getAttribute('data-year-art'), 'on the year screen').toBe(year);
      const bars = [...doc.querySelectorAll('[data-md9-bar]')];
      expect(bars.map((b) => b.getAttribute('data-md9-bar')).sort()).toEqual(Object.keys(site.cover).sort());
      expect(bars.length).toBe(7);
      for (const b of bars) {
        const cat = b.getAttribute('data-md9-bar');
        expect(parseFloat(b.style.width), id + ' ' + year + ' ' + cat).toBeCloseTo(Math.round(site.cover[cat] * 1000) / 10, 5);
        const li = b.closest('li');
        expect(li.getAttribute('data-year-cat')).toBe(cat);
        expect(li.querySelector('strong').textContent).toBe(pc(site.cover[cat]) + '%');
      }
    }
  });
  it('keeps the slider and year buttons inside the figure, on the same side as the bars', () => {
    const doc = page(shown('recent', 12));
    const right = doc.querySelector('.md9-yf .md9-yf-right');
    expect(right.querySelector('input[type=range]').value).toBe('12');
    expect(right.querySelector('[data-md9-bar]')).toBeTruthy();
    expect(right.textContent).toContain('Survey this reef in year 12');
    expect(right.textContent).toContain('Dive this reef in year 12');
  });
});

describe('the prediction gate', () => {
  const card = (doc) => doc.querySelector('[data-md9-predict]');
  it('the predict card is identical for two scenarios with the same start and different futures', () => {
    const a = run('recent'), b = run('warmer');
    expect(pc(a[0].coral)).toBe(pc(b[0].coral));
    expect(pc(a[30].coral), 'the futures really differ').not.toBe(pc(b[30].coral));
    const clean = (d) => card(d).innerHTML;
    expect(clean(page({ model: X.scenarioSettings('recent') }))).toBe(clean(page({ model: X.scenarioSettings('warmer') })));
  });
  it('nothing on the whole page carries a result before the run', () => {
    for (const id of ['recent', 'warmer', 'cooler', 'rubble']) {
      const rows = run(id), doc = page({ model: X.scenarioSettings(id) }), html = doc.body.innerHTML;
      expect(card(doc), id).toBeTruthy();
      for (const sel of ['svg[data-model-chart]', '[data-md9-heat-strip]', '[data-mdl-diagram]', '[data-md9-cond]', '[data-md9-cmp]', '[data-md9-counts]']) expect(doc.querySelector(sel), id + ' ' + sel).toBe(null);
      expect([...doc.querySelectorAll('svg[data-year-art]')].map((s) => s.getAttribute('data-year-art'))).toEqual(['0']);
      expect(html.includes('data-md9-dhw'), id).toBe(false);
      // The tile says only today's number and a question mark.
      const art = doc.querySelector('[data-md9-predict-art]');
      expect(art.getAttribute('aria-hidden')).toBe('true');
      expect([...art.querySelectorAll('text')].map((t) => t.textContent)).toEqual([pc(rows[0].coral) + '%', 'Today', '30 years', '?', 'Year 30']);
    }
  });
});

describe('main chart and heat strip', () => {
  for (const id of ['recent', 'warmer']) {
    it(id + ': every bar is the year\'s DHW, in the same x span as the severe bands above', () => {
      const rows = run(id), doc = page(shown(id, 12));
      const chart = doc.querySelector('svg[data-model-chart]'), strip = doc.querySelector('[data-md9-heat-strip]');
      expect(strip.getAttribute('viewBox').split(' ')[2], 'same width as the chart').toBe(chart.getAttribute('viewBox').split(' ')[2]);
      const bars = [...strip.querySelectorAll('[data-md9-dhw]')];
      expect(bars.map((b) => +b.getAttribute('data-md9-dhw-year'))).toEqual(rows.slice(1).map((r) => r.year));
      for (const b of bars) expect(+b.getAttribute('data-md9-dhw')).toBe(rows[+b.getAttribute('data-md9-dhw-year')].dhw);
      // Taller means more: bar heights follow the values.
      const hOf = (b) => +b.getAttribute('height');
      for (let i = 1; i < bars.length; i++) {
        const dv = +bars[i].getAttribute('data-md9-dhw') - +bars[i - 1].getAttribute('data-md9-dhw');
        if (Math.abs(dv) > 1e-9) expect(Math.sign(hOf(bars[i]) - hOf(bars[i - 1]))).toBe(Math.sign(dv));
      }
      const severe = [...chart.querySelectorAll('[data-severe-year]')];
      expect(severe.map((s) => +s.getAttribute('data-severe-year'))).toEqual(rows.filter((r) => r.year > 0 && r.dhw >= 8).map((r) => r.year));
      const stripBands = [...strip.querySelectorAll('[data-md9-strip-band]')];
      expect(stripBands.length).toBe(severe.length);
      severe.forEach((s, i) => {
        const y = +s.getAttribute('data-severe-year'), bar = bars.find((b) => +b.getAttribute('data-md9-dhw-year') === y);
        expect(stripBands[i].getAttribute('x')).toBe(s.getAttribute('x'));
        const mid = +s.getAttribute('x') + +s.getAttribute('width') / 2, barMid = +bar.getAttribute('x') + +bar.getAttribute('width') / 2;
        expect(Math.abs(mid - barMid), 'bar centred in its band').toBeLessThan(0.2);
      });
      // Each year label sits at the x where the coral line has that year's point.
      const coralD = chart.querySelectorAll('path')[0] && [...chart.querySelectorAll('path')].find((p) => p.getAttribute('stroke') && /^M/.test(p.getAttribute('d')) && p.getAttribute('stroke-width') === '3').getAttribute('d');
      const xs = coralD.split(/[ML]\s*/).filter(Boolean).map((p) => +p.trim().split(' ')[0]);
      for (const t of chart.querySelectorAll('[data-md9-year-label]')) expect(Math.abs(+t.getAttribute('x') - xs[+t.getAttribute('data-md9-year-label')])).toBeLessThan(0.11);
    });
  }
  it('the coral line is not smoothed: it has one straight point per year at the true value', () => {
    const rows = run('recent'), chart = page(shown('recent', 12)).querySelector('svg[data-model-chart]');
    const d = [...chart.querySelectorAll('path')].find((p) => p.getAttribute('stroke-width') === '3').getAttribute('d');
    expect(/[CSQTA]/.test(d)).toBe(false);
    expect(d.split(/[ML]/).filter(Boolean).length).toBe(rows.length);
  });
  it('labels the picked year in the strip and the wide text is real size', () => {
    const rows = run('recent'), strip = page(shown('recent', 12)).querySelector('[data-md9-heat-strip]');
    expect([...strip.querySelectorAll('text')].map((t) => t.textContent)).toContain(String(rows[12].dhw));
    for (const tx of strip.querySelectorAll('text')) expect(+tx.getAttribute('font-size')).toBeGreaterThanOrEqual(12);
  });
});

describe('driver diagram', () => {
  it('every arrow and box keeps the number from mdlYearCauses, and thicker still means more', () => {
    const st = X.scenarioSettings('warmer'), traced = X.runScenario(st, 11, true), drop = M.mdlBiggestDrop(traced).year;
    const c = M.mdlYearCauses(traced, drop, st), doc = page(shown('warmer', drop));
    const svg = doc.querySelector('[data-mdl-diagram]');
    expect(+svg.getAttribute('data-mdl-diagram')).toBe(drop);
    const part = (list, id) => list.find((x) => x.id === id).amount;
    const want = { heat: part(c.coral, 'heat'), regrowth: part(c.coral, 'regrowth'), background: part(c.coral, 'background'), overgrowth: part(c.coral, 'overgrowth'), planted: part(c.coral, 'planted'), grazed: part(c.algae, 'grazed'), spread: part(c.algae, 'spread'), runoff: c.nutrientSpread };
    const widths = [];
    for (const k of Object.keys(want)) {
      const g = svg.querySelector('[data-mdl-arrow="' + k + '"]'), pts = Math.abs(want[k]) * 100;
      expect(+g.getAttribute('data-amount'), k).toBe(Math.round(pts * 10) / 10);
      const sign = pts < 0.05 ? '' : g.getAttribute('data-kind') === 'add' ? '+' : '-', word = pts < 0.05 ? '0' : sign + Math.round(pts * 10) / 10;
      expect(g.querySelector('text').textContent, k).toBe(word);
      if (pts >= 0.05) widths.push([pts, +g.querySelector('line').getAttribute('stroke-width')]);
    }
    widths.sort((a, b) => a[0] - b[0]);
    for (let i = 1; i < widths.length; i++) expect(widths[i][1]).toBeGreaterThanOrEqual(widths[i - 1][1]);
    expect(svg.querySelector('[data-mdl-node="coral"]').textContent).toContain(pc(c.coralTo) + '%');
    expect(svg.querySelector('[data-mdl-node="heat"]').textContent).toContain(String(c.dhw));
    expect(svg.querySelectorAll('[data-md9-icon]').length).toBe(8);
    expect(doc.querySelector('[data-mdl-headline]').textContent.length).toBeGreaterThan(20);
    expect(doc.querySelectorAll('[data-mdl-cause]').length).toBeGreaterThan(2);
  });
});

describe('condition groups', () => {
  it('holds every control in its group and draws a picture per action', async () => {
    const doc = page(shown('recent', 12));
    const g = (id) => doc.querySelector('[data-md9-group="' + id + '"]');
    expect(g('climate').querySelectorAll('input[type=range]').length).toBe(4);
    expect(g('climate').querySelectorAll('input[type=checkbox]').length).toBe(1);
    expect(g('care').querySelectorAll('[role=group]').length).toBe(2);
    expect(g('sensitive').querySelectorAll('button').length).toBe(3);
    expect(g('people').tagName).toBe('FIELDSET');
    expect(g('people').querySelector('legend').textContent).toBe('What people can do on the reef');
    const cards = [...g('people').querySelectorAll('label[data-md9-act]')];
    expect(cards.map((c) => c.getAttribute('data-md9-act'))).toEqual(['rubbleStabilization', 'reefStructures', 'restoration']);
    for (const c of cards) {
      expect(c.querySelectorAll('input[type=checkbox]').length).toBe(1);
      expect(c.querySelector('svg').getAttribute('aria-hidden')).toBe('true');
    }
  });
  it('keeps the Reef Stars reason visible at full strength and the checkbox semantics', async () => {
    const t = await mount({ modelRevealedFor: { recent: true } });
    const card = t.host.querySelector('[data-md9-act="rubbleStabilization"]'), box = card.querySelector('input');
    const note = card.querySelector('[data-stars-low-rubble]');
    expect(box.disabled).toBe(true);
    expect(card.getAttribute('data-md9-act-state')).toBe('unavailable');
    expect(box.getAttribute('aria-describedby')).toBe(note.id);
    expect(note.textContent).toContain('Not for this reef');
    expect(note.closest('.md9-act-pic'), 'only the picture is faded').toBe(null);
    expect(note.style.opacity).toBe('');
    const garden = t.host.querySelector('[data-md9-act="restoration"] input');
    await React.act(async () => { garden.click(); });
    expect(t.data.model.restoration).toBe(true);
    expect(t.host.querySelector('[data-md9-act="restoration"]').getAttribute('data-md9-act-state')).toBe('on');
  });
});

describe('compare and luck', () => {
  it('compare bars are the year 30 values of both runs, and a run with actions shows the gain', () => {
    const rows = run('rubble'), st = X.scenarioSettings('rubble');
    const without = X.runScenario(Object.assign({}, st, { rubbleStabilization: false, reefStructures: false, restoration: false }), 11);
    const doc = page(shown('rubble', 30));
    const bars = [...doc.querySelectorAll('[data-md9-cmp-bar]')].map((b) => +b.getAttribute('data-md9-cmp-bar'));
    expect(bars).toEqual([pc(rows[30].coral), pc(without[30].coral)]);
    expect(bars[0]).toBeGreaterThan(bars[1]);
    expect(doc.body.textContent).toContain('With the restoration actions, live coral in year 30 is ' + bars[0] + '%');
    const widths = [...doc.querySelectorAll('[data-md9-cmp-bar]')].map((b) => parseFloat(b.style.width));
    expect(widths[0] / widths[1]).toBeCloseTo(bars[0] / bars[1], 1);
  });
  it('compare bars for another scenario say what the run says, however low', () => {
    const a = run('recent'), b = run('warmer');
    const doc = page(shown('recent', 30, { modelRevealedFor: { recent: true, warmer: true }, mdlCompare: 'warmer' }));
    expect([...doc.querySelectorAll('[data-md9-cmp-bar]')].map((x) => +x.getAttribute('data-md9-cmp-bar'))).toEqual([pc(a[30].coral), pc(b[30].coral)]);
    expect(doc.querySelector('[data-md9-cmp]').textContent).toContain('Today ' + pc(a[0].coral) + '%');
  });
  it('run pips are the true counts and add up to the runs', () => {
    const doc = page(shown('recent', 30, { mdlSpread: true })), counts = doc.querySelector('[data-md9-counts]');
    const dots = [...doc.querySelectorAll('[data-mdl-strip] [data-mdl-dot]')].map((d) => +d.getAttribute('data-mdl-dot'));
    expect(dots.length).toBe(20);
    let total = 0;
    for (const id of ['higher', 'same', 'lower']) {
      const li = counts.querySelector('[data-md9-count="' + id + '"]'), n = +li.querySelector('strong').textContent;
      expect(li.querySelectorAll('[data-md9-pip]').length, id).toBe(n);
      total += n;
    }
    expect(total).toBe(20);
    expect(doc.body.textContent).toContain('higher in ' + counts.querySelector('[data-md9-count="higher"] strong').textContent + ' runs');
  });
});

describe('quality', () => {
  it('no duplicate ids, no NaN, axe clean in all themes', async () => {
    for (const theme of ['light', 'dark', 'contrast']) {
      for (const state of [{ model: X.scenarioSettings('rubble') }, shown('rubble', 12, { mdlSpread: true })]) {
        const html = renderTool('coralReef', { coralReef: Object.assign({ section: 'model' }, state) }, { theme });
        expect(html.includes('NaN')).toBe(false);
        const ids = [...parse(html).querySelectorAll('[id]')].map((e) => e.id);
        expect(ids.filter((v, i) => ids.indexOf(v) !== i)).toEqual([]);
        const result = await runIsolatedAxe(html);
        expect(result.violations.map((v) => v.id + ': ' + v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', '))).toEqual([]);
      }
    }
  }, 180000);
});
