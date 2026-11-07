import { readFileSync } from 'node:fs';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab, renderTool, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

// Round 7 lane data: charts and working pages. Labels never touch data, food web
// arrows never cross a name, the report has real pictures, and the survey tape
// shows only what was recorded. Numbers come from the tool's own functions.
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
const SOURCE = readFileSync(TOOL, 'utf8');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
vi.setConfig({ testTimeout: 60000 });
const t = (k, f) => f || k;
const fill = (s, v) => String(s).replace(/\{(\w+)\}/g, (_, k) => v[k]);
let X, W, RS, R, S, V;
beforeAll(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool(TOOL, 'coralReef');
  const E = window.__RR_TEST_EXPORTS__;
  X = E.coralReef; W = E.coralReefWeb; RS = E.coralReefRescue; R = E.coralReefReport; S = E.coralReefSurvey; V = E.coralReefDataVisuals;
});
const mounted = [];
afterEach(async () => {
  while (mounted.length) { const m = mounted.pop(); await React.act(async () => m.root.unmount()); m.host.remove(); }
  vi.unstubAllGlobals();
});
const dom = (html) => { const d = document.createElement('div'); d.innerHTML = html; return d; };
const view = (extra) => dom(renderTool('coralReef', { coralReef: extra }));
// Containers report this width, so a figure picks the layout it would pick on that screen.
function stubWidth(width) {
  vi.stubGlobal('ResizeObserver', class { constructor(cb) { this.cb = cb; } observe() { this.cb([{ contentRect: { width } }]); } disconnect() {} });
}
async function mountTool(seed, width) {
  if (width) stubWidth(width);
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  function Shell() { const [state, setState] = React.useState({ coralReef: seed }); return window.StemLab._registry.coralReef.render({ React, toolData: state, setToolData: setState, t, reduceMotion: true }); }
  mounted.push({ host, root });
  await React.act(async () => root.render(React.createElement(Shell)));
  return host;
}
async function mountEl(type, props, width) {
  if (width) stubWidth(width);
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  mounted.push({ host, root });
  await React.act(async () => root.render(React.createElement(type, props)));
  return host;
}
const num = (el, a) => Number(el.getAttribute(a));
// A low guess at text width: an overlap with this box is a real overlap.
function textBox(el) {
  const fs = num(el, 'font-size'), x = num(el, 'x'), y = num(el, 'y'), w = el.textContent.length * fs * 0.5, a = el.getAttribute('text-anchor') || 'start';
  const left = a === 'middle' ? x - w / 2 : a === 'end' ? x - w : x;
  return { left, right: left + w, top: y - fs * 0.78, bottom: y + fs * 0.22 };
}
function markBox(el) {
  if (el.tagName.toLowerCase() === 'circle') { const r = num(el, 'r'), cx = num(el, 'cx'), cy = num(el, 'cy'); return { left: cx - r, right: cx + r, top: cy - r, bottom: cy + r }; }
  if (el.tagName.toLowerCase() === 'line') { const w = (num(el, 'stroke-width') || 1) / 2; return { left: Math.min(num(el, 'x1'), num(el, 'x2')) - w, right: Math.max(num(el, 'x1'), num(el, 'x2')) + w, top: Math.min(num(el, 'y1'), num(el, 'y2')), bottom: Math.max(num(el, 'y1'), num(el, 'y2')) }; }
  const m = /M([\d.-]+) ([\d.-]+)/.exec(el.getAttribute('d'));
  return { left: +m[1] - 7, right: +m[1] + 7, top: +m[2], bottom: +m[2] + 15 };
}
const hit = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
function collisions(svg) {
  const out = [], texts = [...svg.querySelectorAll('text')], marks = [...svg.querySelectorAll('circle,line,path')];
  for (const tx of texts) {
    const a = textBox(tx);
    for (const m of marks) if (hit(a, markBox(m))) out.push(tx.textContent + ' x ' + m.tagName + ' ' + (m.getAttribute('stroke-dasharray') ? 'dashed' : ''));
    for (const o of texts) if (o !== tx && hit(a, textBox(o))) out.push(tx.textContent + ' x text ' + o.textContent);
  }
  return out;
}
const LOW = { section: 'model', mdlView: 'rescue', mdlRescue: { plans: [{ id: 'plan-1', n: 1, start: 'rubble', predict: 0, criterion: 'coral' }, { id: 'plan-2', n: 2, start: 'rubble', garden: true, predict: 2, criterion: 'coral' }], activeId: 'plan-2', nextN: 3 } };
const HIGH = { section: 'model', mdlView: 'rescue', mdlRescue: { plans: [{ id: 'plan-1', n: 1, start: 'fished', fish: 2, garden: true, predict: 100, criterion: 'coral' }], activeId: 'plan-1', nextN: 2 } };

describe('rescue strips: no label ever touches data', () => {
  for (const [name, seed] of [['low values', LOW], ['high values', HIGH]]) {
    for (const width of [520, 380, 240]) {
      it(name + ' at a ' + width + ' px chart', async () => {
        const host = await mountTool(seed, width);
        const charts = [...host.querySelectorAll('[data-rc-strip]')];
        expect(charts.length).toBe(2);
        for (const svg of charts) expect(collisions(svg), svg.getAttribute('data-rc-strip')).toEqual([]);
      });
    }
  }

  const longest = () => ({
    rows: [
      { id: 'a', label: "Today's pattern of heatwaves", valueLabel: 'middle run 100%', dots: [0, 0, 0, 0, 0, 0, 0, 0.01], median: 0, title: 'x', active: true, predict: 0 },
      { id: 'b', label: 'Fewer, weaker heatwaves', valueLabel: 'middle run 100%', dots: [1, 1, 1, 0.99, 0.98], median: 1, title: 'x', predict: 100 },
      { id: 'c', label: 'This plan (Plan 12)', valueLabel: 'middle run 50%', dots: [0, 0.5, 1], median: 0.5, title: 'x' },
    ],
    top: 100, label: 'x', kind: 'plans', startLabel: 'Today 100%',
  });
  for (const start of [0, 1]) {
    for (const width of [520, 380, 240]) {
      it('longest English text, today at ' + start * 100 + '%, chart ' + width + ' px', async () => {
        const env = { h: React.createElement, React, P: X.palette('light'), t, fill };
        const host = await mountEl(V.RescueStrip, Object.assign(longest(), { env, start }), width);
        const svg = host.querySelector('[data-rc-strip]');
        expect(collisions(svg)).toEqual([]);
        // Marks stay in the track; words stay in the word band.
        const G = V.stripLayout(longest().rows, { VW: Number(svg.getAttribute('viewBox').split(' ')[2]), fs: 13.5, dotR: 3.5, tiny: width < 300, startLabel: 'Today 100%' });
        for (const row of G.rows) { expect(row.wordsBottom).toBeLessThanOrEqual(row.trackTop); expect(row.lines.length).toBeLessThanOrEqual(3); }
        // Every label stays inside the picture, at the real scale of the chart.
        const vw = Number(svg.getAttribute('viewBox').split(' ')[2]);
        for (const tx of svg.querySelectorAll('text')) { const b = textBox(tx); expect(b.left).toBeGreaterThanOrEqual(0); expect(b.right).toBeLessThanOrEqual(vw); }
        // At least 12 px on the phone.
        for (const tx of svg.querySelectorAll('text')) expect(num(tx, 'font-size') * Math.min(1, width / vw), tx.textContent).toBeGreaterThanOrEqual(11.9);
      });
    }
  }

  it('keeps every dot, the middle run and the prediction of each plan', async () => {
    const host = await mountTool(LOW, 520);
    const ev = RS.rescueEvaluate(LOW.mdlRescue.plans[1]);
    const dots = [...host.querySelectorAll('[data-rc-strip="plans"] [data-rc-strip-row="plan-2"] [data-rc-dot]')];
    expect(dots.length).toBe(ev.stats.count);
    expect(host.querySelector('[data-rc-strip="plans"] [data-rc-strip-row="plan-2"] [data-rc-median]').getAttribute('data-rc-median')).toBe(String(Math.round(ev.stats.median * 100)));
    expect(host.querySelector('[data-rc-strip="plans"] [data-rc-strip-row="plan-2"] [data-rc-predict-mark]').getAttribute('data-rc-predict-mark')).toBe('2');
  });
});

describe('Reef future spread strip', () => {
  const seed = (id) => ({ section: 'model', model: X.scenarioSettings(id), modelRevealedFor: { [id]: true }, mdlSpread: true });
  for (const id of ['recent', 'warmer']) {
    it(id + ': text stays 12 px or more on a small phone, and off the marks', async () => {
      const width = 222;
      const host = await mountTool(seed(id), width);
      const svg = host.querySelector('[data-mdl-strip]');
      const vw = Number(svg.getAttribute('viewBox').split(' ')[2]);
      for (const tx of svg.querySelectorAll('text')) expect(num(tx, 'font-size') * width / vw, tx.textContent).toBeGreaterThanOrEqual(11.9);
      expect(collisions(svg).filter((c) => !/line $/.test(c) || /dashed/.test(c))).toEqual([]);
    });
  }
  it('Compare range charts keep labels in their own column', () => {
    const logEntry = (siteId, n) => {
      const site = X.siteById(siteId), seedN = S.transectSeed(site, n), L = X.buildTransect(site, seedN), records = {};
      L.points.forEach((p, i) => { records[i] = p.category; });
      const score = X.scoreSurvey(L, records, X.fishInBelt(L)), fish = {};
      score.fish.forEach((f) => { fish[f.family] = f.density; });
      return { id: X.surveyEntryId(site, seedN), siteId, seed: seedN, transect: n, modelYear: null, at: n, agreement: 40, recorded: 40, records, cover: score.cover, indicators: X.indicators(score.cover), fish, modelRun: null };
    };
    const host = view({ section: 'compare', surveyLog: [logEntry('reserve', 1), logEntry('reserve', 2), logEntry('rubble', 1)] });
    const rows = [...host.querySelectorAll('[data-srv-figure="spread"] [data-srv-row]')];
    expect(rows.length).toBe(2);
    for (const row of rows) {
      expect(row.querySelector('.srv-lab strong')).toBeTruthy();
      expect(row.querySelector('.srv-track').textContent.replace(/\d/g, '')).toBe('');
    }
  });
});

describe('food web arrows stay off the names', () => {
  // A page-like layout: bands of 86 px chips, centered, wrapping when they do not fit.
  function layout(webW, chipH) {
    const chips = {}, heads = {};
    let y = 0;
    W.ROWS.forEach((row, bi) => {
      heads[bi] = { left: 18, right: Math.min(webW - 20, 18 + 520), top: y + 10, bottom: y + 28 };
      y += 36;
      const perLine = Math.max(1, Math.floor((webW - 20 + 6) / 92));
      for (let i = 0; i < row.ids.length; i += perLine) {
        const line = row.ids.slice(i, i + perLine), lw = line.length * 92 - 6;
        line.forEach((id, k) => {
          const left = (webW - lw) / 2 + k * 92;
          chips[id] = { left, right: left + 86, top: y, bottom: y + chipH, band: bi };
        });
        y += chipH + 6;
      }
      y += 6;
    });
    return { W: webW, H: y, chips, heads };
  }
  function linksFor(sel) {
    const r = W.related(sel), out = [];
    const eats = (id) => r.eats.some((e) => e.id === id) || r.eatenBy.some((e) => e.id === id);
    r.eats.forEach((e) => out.push({ key: 'f' + e.id, from: e.id, to: sel }));
    r.eatenBy.forEach((e) => { if (!e.viaGroup) out.push({ key: 'e' + e.id, from: sel, to: e.id }); });
    r.ties.forEach((tie) => { if (!tie.viaGroup && !eats(tie.id)) out.push({ key: 't' + tie.id, from: tie.active ? sel : tie.id, to: tie.active ? tie.id : sel, dashed: true }); });
    r.groups.forEach((g) => out.push({ key: 'g' + g, from: sel, to: g, dashed: true }));
    r.members.forEach((m) => out.push({ key: 'm' + m, from: sel, to: m, dashed: true }));
    return out;
  }
  // A straight run against a box.
  function segHits(p, q, b) {
    const l = Math.min(p[0], q[0]), rr = Math.max(p[0], q[0]), tp = Math.min(p[1], q[1]), bt = Math.max(p[1], q[1]);
    return l < b.right && rr > b.left && tp < b.bottom && bt > b.top;
  }
  for (const [webW, chipH] of [[752, 108], [524, 118], [860, 96]]) {
    it('every selection, web ' + webW + ' px wide: no run crosses a species that is not its own end', () => {
      const geom = layout(webW, chipH), bad = [];
      let arrows = 0;
      for (const sel of W.allIds()) {
        const lines = V.fwRouteAll(linksFor(sel), geom);
        expect(lines.length, sel).toBe(linksFor(sel).length);
        for (const line of lines) {
          arrows += 1;
          for (let i = 1; i < line.points.length; i++) {
            const p = line.points[i - 1], q = line.points[i];
            expect(Math.abs(p[0] - q[0]) < 0.01 || Math.abs(p[1] - q[1]) < 0.01, 'straight runs only').toBe(true);
            for (const id of Object.keys(geom.chips)) if (segHits(p, q, geom.chips[id]) && id !== line.from && id !== line.to) bad.push(sel + ': ' + line.key + ' crosses ' + id);
          }
          const last = line.points[line.points.length - 1], end = geom.chips[line.to];
          expect(last[0]).toBeGreaterThan(end.left); expect(last[0]).toBeLessThan(end.right);
          expect(Math.min(Math.abs(last[1] - end.top), Math.abs(last[1] - end.bottom))).toBeLessThanOrEqual(6);
        }
      }
      expect(arrows).toBeGreaterThan(50);
      expect(bad).toEqual([]);
    });
  }
  it('titles and names have a plate in the band color, so a passing line cannot run through the letters', () => {
    const host = view({ section: 'science', sciTopic: 'web', sciWeb: { sel: 'sea_cucumber' } });
    const css = [...host.querySelectorAll('style')].map((n) => n.textContent).join('\n');
    expect(css).toMatch(/\.fw-band-head strong,[^{]*\.fw-name\{background:var\(--fw-band\)/);
    expect(host.querySelector('.fw-band').getAttribute('style')).toContain('--fw-band');
    expect(host.querySelectorAll('.fw-chip .fw-name').length).toBe(W.allIds().length);
  });
});

function entry(siteId, n, upTo = 40, wrong = 0) {
  const site = X.siteById(siteId), seed = S.transectSeed(site, n), L = X.buildTransect(site, seed), records = {};
  L.points.forEach((p, i) => { if (i < upTo) records[i] = wrong && i % wrong === 3 ? (p.category === 'rock' ? 'sand' : 'rock') : p.category; });
  const score = X.scoreSurvey(L, records, X.fishInBelt(L)), fish = {};
  score.fish.forEach((f) => { fish[f.family] = f.density; });
  return { id: X.surveyEntryId(site, seed), siteId, seed, transect: n, modelYear: null, at: n, agreement: score.agreement, recorded: Object.keys(records).length, records, cover: score.cover, indicators: X.indicators(score.cover), fish, modelRun: null };
}

describe('my reef report has real pictures', () => {
  const PLANS = [{ id: 'plan-1', n: 1, start: 'rubble', garden: true, predict: 20, criterion: 'coral' }, { id: 'plan-2', n: 2, start: 'rubble', stars: true, garden: true, predict: 30, criterion: 'coral' }];
  const base = () => ({ section: 'report', speciesLog: { clownfish: { firstSeen: 1 }, brain_coral: { firstSeen: 2 } }, surveyLog: [entry('reserve', 1), entry('reserve', 2, 40, 5), entry('rubble', 1, 30)], mdlRescue: { plans: PLANS, activeId: 'plan-2', nextN: 3 } });

  it('shows a real picture of each species found, and only those', () => {
    const host = view(base());
    const imgs = [...host.querySelectorAll('[data-rep-thumbs] img')];
    const names = X.speciesText(t);
    expect(imgs.map((i) => i.getAttribute('alt')).sort()).toEqual([names.clownfish.name, names.brain_coral.name].sort());
    for (const i of imgs) { expect(i.getAttribute('src')).toMatch(/assets\/coralreef\/species\/(clownfish|brain_coral)\.webp/); expect(Number(i.getAttribute('height'))).toBeGreaterThan(0); }
    expect(view({ section: 'report' }).querySelectorAll('[data-rep-thumbs] img').length).toBe(0);
  });

  it('draws percent cover from the same averages as Compare, with patterns and never from the reef key', () => {
    const s = base(), host = view(s), groups = X.summarizeLog(s.surveyLog);
    for (const g of groups) {
      const fig = host.querySelector('[data-rep-cover="' + g.key + '"]');
      expect(fig, g.key).toBeTruthy();
      const segs = [...fig.querySelectorAll('[data-rep-seg]')];
      for (const seg of segs) {
        const id = seg.getAttribute('data-rep-seg');
        expect(Number(seg.getAttribute('data-pct'))).toBe(id === 'missing' ? g.missing : g.cover[id]);
        const ref = /url\(#(.+)\)/.exec(seg.getAttribute('fill'))[1];
        expect(fig.querySelector('pattern[id="' + ref + '"]'), id).toBeTruthy();
      }
      const svg = fig.querySelector('svg[role="img"]');
      for (const seg of segs) expect(svg.getAttribute('aria-label')).toContain(seg.getAttribute('data-pct') + '%');
    }
    // A wrong record shows up as the student's value: the bar is not the key's cover.
    const wrong = [entry('reserve', 1, 40, 4)], g = X.summarizeLog(wrong)[0], key = X.trueCover(X.buildTransect(X.siteById('reserve'), wrong[0].seed));
    const figW = view({ section: 'report', surveyLog: wrong }).querySelector('[data-rep-cover]');
    const rock = figW.querySelector('[data-rep-seg="rock"]');
    expect(Number(rock.getAttribute('data-pct'))).toBe(g.cover.rock);
    expect(g.cover.rock).not.toBe(key.rock);
  });

  it('draws prediction against result for each plan from the same stats as its sentence', () => {
    const host = view(base());
    for (const p of PLANS) {
      const box = host.querySelector('[data-rep-extra="rescue-' + p.id + '"]'), st = RS.rescueStats(RS.rescueSettings(p)), none = RS.rescueStats(RS.rescueStartSettings(p.start)), pc = (v) => Math.round(v * 100);
      expect(box.querySelector('[data-rep-viz-predict]').getAttribute('data-rep-viz-predict')).toBe(String(p.predict));
      expect(box.querySelector('[data-rep-viz-range]').getAttribute('data-rep-viz-range')).toBe(pc(st.min) + ':' + pc(st.max));
      expect(box.querySelector('[data-rep-viz-mid]').getAttribute('data-rep-viz-mid')).toBe(String(pc(st.median)));
      expect(box.querySelector('[data-rep-viz-none]').getAttribute('data-rep-viz-none')).toBe(String(pc(none.median)));
      expect(box.querySelector('.rep-viz-key').textContent).toContain(pc(st.min) + '% to ' + pc(st.max) + '%');
    }
  });

  it('every id is unique, so each pattern reference finds its own pattern when printed', async () => {
    const host = await mountTool(base());
    const copy = R.printable(host.querySelector('[data-rep-doc]'));
    const ids = [...copy.querySelectorAll('[id]')].map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(copy.querySelectorAll('[data-rep-thumbs] img').length).toBe(2);
    expect(copy.querySelectorAll('[data-rep-viz]').length).toBe(2);
    expect(copy.querySelectorAll('[data-rep-cover] pattern').length).toBeGreaterThan(5);
    // The picture stays in print: thumbnails keep their colors and each block stays whole.
    expect(R.PAPER_CSS).toMatch(/\.rep-thumb\{[^}]*print-color-adjust:exact/);
    expect(R.PAPER_CSS).toMatch(/\.rep-viz\{break-inside:avoid/);
  });

  it('adds no saved field and no way out', async () => {
    const before = base();
    const host = await mountTool(before);
    expect(Object.keys(before).sort()).toEqual(Object.keys(base()).sort());
    const src = SOURCE.slice(SOURCE.indexOf('function repPattern('), SOURCE.indexOf('function ReportSection('));
    for (const bad of [/localStorage/, /env\.set/, /https?:/, /\.close\(\)/, /fetch\(/]) expect(bad.test(src), String(bad)).toBe(false);
    expect((SOURCE.match(/\.close\(\)/g) || []).length, 'only the two print-window closes').toBeGreaterThanOrEqual(2);
    expect(host.querySelectorAll('[data-rep-stat]').length).toBe(3);
    expect(host.querySelector('[data-rep-stat="species"] b').textContent).toBe('2');
    expect(host.querySelector('[data-rep-stat="transects"] b').textContent).toBe('3');
    expect(host.querySelector('[data-rep-stat="tests"] b').textContent).toBe('2');
  });
});

describe('survey tape shows what was recorded and nothing else', () => {
  const site = () => X.siteById('reserve');
  const records = (n) => { const L = X.buildTransect(site(), site().seed), r = {}; L.points.forEach((p, i) => { if (i < n) r[i] = p.category; }); return r; };
  const page = (extra) => view(Object.assign({ section: 'survey', surveySiteId: 'reserve', surveySeed: site().seed }, extra));

  it('starts as an intentional track: one pin per point, no ribbon', () => {
    const tape = page({}).querySelector('[data-part="tape-overview"]');
    expect(tape.querySelectorAll('[data-tape-run]').length).toBe(0);
    expect(tape.querySelectorAll('[data-tape-pin]').length).toBe(40);
  });

  it('builds a ribbon from the records, one run per stretch, in the patterns of Compare', () => {
    const r = records(17), tape = page({ records: r, pointIndex: 17 }).querySelector('[data-part="tape-overview"]');
    const runs = [...tape.querySelectorAll('[data-tape-run]')];
    expect(runs.reduce((s, n) => s + num(n, 'data-len'), 0)).toBe(17);
    for (const run of runs) {
      const cat = run.getAttribute('data-tape-run'), from = num(run, 'data-from');
      expect(run.className).toContain('crb-cat-' + cat);
      for (let i = from; i < from + num(run, 'data-len'); i++) expect(r[i]).toBe(cat);
    }
    expect(tape.querySelectorAll('[data-tape-pin]').length).toBe(23);
  });

  it('never depends on what lies under an unrecorded point', () => {
    const r = { 0: 'rock', 1: 'rock', 5: 'sand' };
    const tapes = X.SITES.slice(0, 3).map((s) => view({ section: 'survey', surveySiteId: s.id, surveySeed: s.seed, records: r, pointIndex: 2 }).querySelector('[data-part="tape-overview"]').innerHTML);
    expect(new Set(tapes).size).toBe(1);
    const grid = (s) => [...view({ section: 'survey', surveySiteId: s.id, surveySeed: s.seed, records: r, pointIndex: 2 }).querySelectorAll('.crb-pt')].filter((b) => b.getAttribute('data-pt') === 'todo').map((b) => b.outerHTML);
    expect(grid(X.SITES[0])).toEqual(grid(X.SITES[1]));
    expect(page({}).querySelectorAll('.crb-pt[data-code]').length).toBe(0);
  });

  it('gives done, to do and current their own look, each with more than color', () => {
    const host = page({ records: records(3), pointIndex: 5 });
    const pts = [...host.querySelectorAll('.crb-pt')];
    expect(pts.length).toBe(40);
    expect(pts[0].getAttribute('data-pt')).toBe('done');
    expect(pts[0].querySelector('.crb-pt-foot').className).toContain('crb-cat-');
    expect(pts[4].getAttribute('data-pt')).toBe('todo');
    expect(pts[4].querySelector('.crb-pt-foot')).toBe(null);
    expect(pts[4].getAttribute('style')).toContain('dashed');
    expect(pts[5].getAttribute('aria-current')).toBe('true');
    const css = [...host.querySelectorAll('style')].map((n) => n.textContent).join('\n');
    expect(css).toMatch(/forced-colors:active[^]*\.crb-pt\[aria-current=true\]/);
  });

  it('Results keep the reef key hidden until all 40 points are in', () => {
    for (const n of [0, 12, 39]) {
      const host = page({ records: records(n), surveyStage: 'results' });
      expect(host.querySelector('[data-srv-key-hidden]'), n).toBeTruthy();
      expect(host.querySelectorAll('[data-strip="key"]').length, n).toBe(0);
    }
    expect(page({ records: records(40), surveyStage: 'results' }).querySelectorAll('[data-strip="key"]').length).toBe(40);
  });
});

describe('contrast over the real backgrounds', () => {
  const lum = (hex) => { const n = parseInt(hex.slice(1), 16), c = [n >> 16 & 255, n >> 8 & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  for (const theme of ['light', 'dark', 'contrast']) {
    it(theme + ': labels on the card, marks on the track, pins and dashed boxes', () => {
      const P = X.palette(theme);
      for (const c of [P.text, P.muted]) expect(ratio(c, P.card)).toBeGreaterThanOrEqual(4.5);
      for (const c of [P.text, P.muted, P.coralLine]) expect(ratio(c, P.cardAlt)).toBeGreaterThanOrEqual(3);
      expect(ratio(P.ctlBorder, P.card)).toBeGreaterThanOrEqual(3);
      expect(ratio(P.accent, P.card)).toBeGreaterThanOrEqual(3);
    });
  }
  it('rows show the value the same way', () => {
    const rows = [{ id: 'a', label: 'Do nothing', valueLabel: 'middle run 4%', median: 0.04 }, { id: 'b', label: 'A very long label that has no room for the words', valueLabel: 'middle run 6%', median: 0.06 }];
    const G = V.stripLayout(rows, { VW: 320, fs: 13.5, dotR: 3.5, startLabel: 'Today 3%' });
    expect(G.rows.map((r) => r.value)).toEqual(['4%', '6%']);
  });
});

describe('source rules for this lane', () => {
  it('new code is ES5 and uses no special dashes', () => {
    for (const [a, b] of [['function chartTextW(', 'function RescueKey('], ['function fwLanes(', 'function FwExplore('], ['function tapeRuns(', 'function PointsStage('], ['function repPattern(', 'function ReportSection(']]) {
      const src = SOURCE.slice(SOURCE.indexOf(a), SOURCE.indexOf(b));
      expect(src.length, a).toBeGreaterThan(100);
      expect(src).not.toMatch(/=>|`|\b(let|const)\s+[A-Za-z_$]/);
      expect(src).not.toMatch(/[–—‑]/);
    }
  });
});
