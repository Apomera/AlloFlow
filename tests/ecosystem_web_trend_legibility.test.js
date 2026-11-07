// @vitest-environment jsdom
// Ecosystem, Conservation tab, from the last review: the food web's "engineers habitat" ran over "American Beaver", its
// rings and dormant arrows were under 3:1, the trend legend clipped "White-taile..." and its brown lines looked alike,
// and two notebook buttons were hard-coded English. Real-browser readings are in the round 4 report.
// ECOSYSTEM_WEB_FILE=<path> runs against another copy, for the fail-first proof.
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.ECOSYSTEM_WEB_FILE || 'stem_lab/stem_tool_ecosystem.js';
const IDS = ['grayWolf', 'beaver', 'moose', 'deer', 'salmon', 'brookTrout'];
const species = (pop) => IDS.map((id) => ({ id, pop, habitat: 60, support: 50 }));
const firingAll = species(90);
const conserveState = (over) => Object.assign({
  phase: 'review', year: 3, maxYears: 10, difficulty: 'manager', hoursPerYear: 40, hoursLeft: 40,
  species: firingAll, yearActions: [], yearLog: [], lastEvent: null, cascadeFiredThisYear: [], finalOutcome: null,
  wolfReintroduced: false, damRemovals: 0, deepDiveSpecies: null, firstTipDismissed: true, seed: 'x',
}, over);
const logOf = (values) => values.map((v, i) => ({ year: i + 1, post: IDS.map((id, k) => ({ id, pop: v + k })) }));
const debrief = (values) => conserveState({ phase: 'debrief', yearLog: logOf(values), finalOutcome: { id: 'x', label: 'Done', desc: 'Done.', icon: 'x', color: '#16a34a' }, targetsMet: 0 });

function dom(conserve, ctx) {
  const host = document.createElement('div');
  host.innerHTML = renderTool('ecosystem', { ecosystem: { tutorialDismissed: true, tab: 'conserve', conserve } }, ctx);
  return host;
}
const web = (host) => host.querySelector('svg[aria-label="Food-web diagram of the 6 Maine species"]');
const trend = (host) => host.querySelector('svg[aria-label^="Population-index trend chart"]');

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const lum = (h) => { const [r, g, b] = hex(h); return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

beforeEach(() => { resetStemLab(); loadTool(FILE, 'ecosystem'); });

describe('food web labels', () => {
  // Boxes from the attributes: the font is bold at most, so 0.62em per letter errs wide.
  const box = (t) => {
    const fs = Number(t.getAttribute('font-size')), w = t.textContent.length * fs * 0.62, x = Number(t.getAttribute('x')), y = Number(t.getAttribute('y'));
    const a = t.getAttribute('text-anchor');
    const left = a === 'middle' ? x - w / 2 : a === 'end' ? x - w : x;
    return { t: t.textContent, left, right: left + w, top: y - fs * 0.85, bottom: y + fs * 0.2 };
  };
  const hit = (p, q) => p.left < q.right && q.left < p.right && p.top < q.bottom && q.top < p.bottom;
  const words = (svg) => [...svg.querySelectorAll('text')].filter((t) => /[A-Za-z]/.test(t.textContent)).map(box);

  it('all rules firing: no label touches another', () => {
    const b = words(web(dom(conserveState())));
    for (const label of ['engineers habitat', 'suppresses', 'overbrowsing', 'marine nutrients', 'American Beaver']) expect(b.map((x) => x.t)).toContain(label);
    for (let i = 0; i < b.length; i++) for (let j = i + 1; j < b.length; j++) expect(hit(b[i], b[j]), b[i].t + ' / ' + b[j].t).toBe(false);
  });

  it('no label sits on a species circle', () => {
    const svg = web(dom(conserveState()));
    const rings = [...svg.querySelectorAll('circle')].map((c) => ({ x: Number(c.getAttribute('cx')), y: Number(c.getAttribute('cy')), r: Number(c.getAttribute('r')) }));
    for (const b of words(svg)) for (const c of rings) {
      const nx = Math.max(b.left, Math.min(c.x, b.right)), ny = Math.max(b.top, Math.min(c.y, b.bottom));
      expect(Math.hypot(nx - c.x, ny - c.y) >= c.r, b.t).toBe(true);
    }
  });

  it('a line running behind a label cannot cut the letters', () => {
    for (const t of web(dom(conserveState())).querySelectorAll('text')) {
      if (!/[A-Za-z]/.test(t.textContent)) continue;
      expect(t.getAttribute('stroke'), t.textContent).toBe('#020617');
      expect(t.getAttribute('style') || '', t.textContent).toMatch(/paint-order:\s*stroke/);
    }
  });

  it('on a phone it keeps a readable size and scrolls inside its own box', () => {
    const svg = web(dom(conserveState()));
    expect(svg.getAttribute('style')).toMatch(/min-width:\s*480px/);
    expect(svg.parentElement.getAttribute('style')).toMatch(/overflow-x:\s*auto/);
  });
});

describe('food web rings and arrows reach 3:1 on the diagram ground', () => {
  const GROUND = '#020617';
  it.each([[{}], [{ isDark: true }], [{ isContrast: true }]])('rings, %j', (ctx) => {
    const svg = web(dom(conserveState(), ctx));
    expect(svg.querySelector('rect').getAttribute('fill')).toBe(GROUND);
    const rings = [...svg.querySelectorAll('circle[fill="none"]')];
    expect(rings.length).toBe(6);
    for (const c of rings) expect(ratio(c.getAttribute('stroke'), GROUND), c.getAttribute('stroke')).toBeGreaterThanOrEqual(3);
  });
  it.each([[{}], [{ isDark: true }], [{ isContrast: true }]])('dormant and firing arrows, %j', (ctx) => {
    for (const pop of [90, 5]) {
      const svg = web(dom(conserveState({ species: species(pop) }), ctx));
      const paths = [...svg.querySelectorAll('path[fill="none"]')];
      expect(paths.length).toBeGreaterThan(4);
      for (const p of paths) expect(ratio(p.getAttribute('stroke'), GROUND), pop + ' ' + p.getAttribute('stroke')).toBeGreaterThanOrEqual(3);
      for (const m of svg.querySelectorAll('marker path')) expect(ratio(m.getAttribute('fill'), GROUND), m.getAttribute('fill')).toBeGreaterThanOrEqual(3);
    }
  });
  it('dormant still looks different from firing: dashed and thin against solid and thick', () => {
    const off = web(dom(conserveState({ species: species(5) }))).querySelector('path[fill="none"]');
    const on = web(dom(conserveState())).querySelector('path[fill="none"]');
    expect(off.getAttribute('stroke-dasharray')).toBe('4 4');
    expect(on.getAttribute('stroke-dasharray') || '').toBe('');
    expect(Number(on.getAttribute('stroke-width'))).toBeGreaterThan(Number(off.getAttribute('stroke-width')));
  });
});

describe('trend chart', () => {
  it('the key is text that can wrap, with whole names, not SVG text clipped at the edge', () => {
    const host = dom(debrief([40, 50, 60]));
    const key = host.querySelector('[data-ecosystem-trend-key]');
    expect(!!key, 'no key').toBe(true);
    expect(key.tagName).toBe('UL');
    expect(key.getAttribute('style')).toMatch(/flex-wrap:\s*wrap/);
    const text = key.textContent;
    for (const name of ['Gray Wolf', 'American Beaver', 'Moose', 'White-tailed Deer', 'Atlantic Salmon', 'Brook Trout']) expect(text).toContain(name);
    expect([...trend(host).querySelectorAll('text')].map((t) => t.textContent).join(' ')).not.toMatch(/White-tail|Beaver|Moose/);
  });

  it('every line has its own dash pattern, and the key shows the same one', () => {
    const host = dom(debrief([40, 50, 60]));
    const dash = (id) => host.querySelector('[data-ecosystem-trend-line="' + id + '"]').getAttribute('stroke-dasharray') || '';
    const patterns = IDS.map(dash);
    expect(new Set(patterns).size).toBe(6);
    for (const id of IDS) expect(host.querySelector('[data-ecosystem-trend-sample="' + id + '"]').getAttribute('stroke-dasharray') || '', id).toBe(dash(id));
  });

  it('the text alternative lists what each line actually draws', () => {
    const host = dom(debrief([40, 50, 60]));
    const svg = trend(host);
    const desc = host.querySelector('#' + svg.getAttribute('aria-describedby'));
    expect(desc.textContent).toContain('Gray Wolf: Y1 40, Y2 50, Y3 60.');
    expect(desc.textContent).toContain('American Beaver: Y1 41, Y2 51, Y3 61.');
    expect(desc.textContent).toContain('Brook Trout: Y1 45, Y2 55, Y3 65.');
    expect(desc.className).toContain('sr-only');
  });

  it('the text alternative follows the data on a one-year log and a missing species', () => {
    const log = [{ year: 7, post: [{ id: 'deer', pop: 33.6 }] }];
    const host = dom(Object.assign(debrief([1]), { yearLog: log }));
    const desc = host.querySelector('#eco-trend-values').textContent;
    expect(desc).toContain('White-tailed Deer: Y7 34.');
    expect(desc).toContain('Moose: Y7 0.');
  });

  it('the contrast theme: every line reaches 3:1 on black', () => {
    const host = dom(debrief([40, 50, 60]), { isContrast: true });
    for (const id of IDS) expect(ratio(host.querySelector('[data-ecosystem-trend-line="' + id + '"]').getAttribute('stroke'), '#000000'), id).toBeGreaterThanOrEqual(3);
  });
});

describe('notebook buttons go through t()', () => {
  it('both labels are translatable, with their English intact', () => {
    const seen = [];
    const t = (k, fb) => { seen.push(k); return k === 'stem.ecosystem.complete_explanation_button' ? 'EXPLICACION' : k === 'stem.ecosystem.save_named_branch' ? 'RAMA' : fb; };
    const host = document.createElement('div');
    host.innerHTML = renderTool('ecosystem', { ecosystem: { tutorialDismissed: true } }, { t });
    const labels = [...host.querySelectorAll('button')].map((b) => b.textContent.trim());
    expect(labels).toContain('EXPLICACION');
    expect(labels).toContain('RAMA');
    const plain = document.createElement('div');
    plain.innerHTML = renderTool('ecosystem', { ecosystem: { tutorialDismissed: true } });
    const english = [...plain.querySelectorAll('button')].map((b) => b.textContent.trim());
    expect(english).toContain('Complete explanation');
    expect(english).toContain('Save named branch');
  });
});
