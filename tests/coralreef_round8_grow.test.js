import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadTool, resetStemLab, renderTool } from './helpers/stem_widgets_smoke_harness.js';
import { runIsolatedAxe } from './helpers/isolated_axe_harness.js';

// Round 8 pictures for "Seaweed and grazers" and "Building a reef". Every number
// a picture draws is checked against the lab's own functions, and the pictures
// shown before a prediction are checked for leaks in every form.
vi.setConfig({ testTimeout: 60000 });
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
let S;
beforeEach(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool(TOOL, 'coralReef'); S = window.__RR_TEST_EXPORTS__.coralReefSci; });
function dom(html) { const host = document.createElement('div'); host.innerHTML = html; return host; }
const view = (seed, theme) => dom(renderTool('coralReef', { coralReef: { section: 'science', ...seed } }, { theme }));
const fig = (host, id) => host.querySelector('svg[data-scilab-figure="' + id + '"]');
const seaweedLab = (extra) => ({ sciTopic: 'seaweed', sciSeaweed: { pred: 'more', started: true, ...extra } });
const slots = (root) => {
  const out = { coral: 0, dead: 0, weed: 0, open: 0, sand: 0 };
  root.querySelectorAll('[data-gr8-kind]').forEach((g) => { out[g.getAttribute('data-gr8-kind')] += Number(g.getAttribute('data-gr8-w')); });
  return out;
};
const fishes = (root) => root.querySelectorAll('[data-gr8-fish]').length;
const points = (el) => el.getAttribute('points').trim().split(/\s+/).map((p) => p.split(',').map(Number));

describe('the seaweed setup picture, before the prediction', () => {
  const story = (seed) => view({ sciTopic: 'seaweed', ...seed }).querySelector('[data-gr8-setup="seaweed"]');

  it('tells the intro in four steps, and only asks at the end', () => {
    const items = [...story().querySelectorAll('li')];
    expect(items.map((li) => { const c = li.cloneNode(true); c.querySelectorAll('svg').forEach((n) => n.remove()); return c.textContent; })).toEqual([
      'A healthy reef with few grazing fish', 'A heatwave kills most of its coral', 'Seaweed spreads over the reef', 'With the same fish, what comes next?']);
    expect(items[3].querySelectorAll('[data-gr8-kind]').length).toBe(0);
    expect(items[3].querySelector('svg').textContent).toContain('?');
  });
  it('draws the same few fish in every step, from the lab\'s Low grazing', () => {
    const items = [...story().querySelectorAll('li')];
    items.forEach((li) => expect(fishes(li)).toBe(3));
  });
  it('draws the healthy start and the heatwave from the lab\'s own numbers', () => {
    const items = [...story().querySelectorAll('li')];
    const a = slots(items[0]), b = slots(items[1]), c = slots(items[2]);
    expect(a.coral).toBe(Math.round(S.HEALTHY.coral * 10));
    expect(a.weed).toBe(Math.max(1, Math.round(S.HEALTHY.algae * 10)));
    const hit = S.shock(S.HEALTHY);
    expect(b.coral).toBe(Math.max(1, Math.round(hit.coral * 10)));
    expect(b.coral + b.dead).toBe(a.coral);
    expect(b.dead).toBeGreaterThan(b.coral); // "kills most of its coral"
    expect(c.weed).toBe(Math.round(S.WEEDY.algae * 10));
    [a, b, c].forEach((p) => expect(p.coral + p.dead + p.weed + p.open + p.sand).toBe(10));
  });
  it('leaks nothing: hidden art, no labels, no state, and no change with anything the student has done', () => {
    const el = story();
    el.querySelectorAll('svg').forEach((svg) => { expect(svg.getAttribute('aria-hidden')).toBe('true'); expect(svg.getAttribute('focusable')).toBe('false'); });
    expect(el.querySelector('[aria-label],[title],title,desc')).toBe(null);
    const base = el.outerHTML;
    for (const pred of ['same', 'more', 'never']) {
      for (const extra of [{ graze: 1 }, { graze: 0.1, nutrients: 'high' }, { path: [{ kind: 'run', graze: 0.9, coral: 0.5, algae: 0 }] }]) {
        expect(story({ sciSeaweed: { pred, ...extra } }).outerHTML).toBe(base);
      }
    }
    const words = el.textContent;
    expect(words).not.toMatch(/\d+%|more (grazing|fish)|come back|comes back|recover|never|tipping/i);
  });
  it('is not there once the experiment has started', () => {
    expect(view(seaweedLab()).querySelector('[data-gr8-setup="seaweed"]')).toBe(null);
  });
});

describe('the limestone setup picture, before the prediction', () => {
  const setup = (seed) => view({ sciTopic: 'build', ...seed });

  it('shows the pile with a question, and says nothing of either side\'s size', () => {
    const svg = fig(setup(), 'build-setup');
    expect(svg.getAttribute('role')).toBe('img');
    const label = svg.getAttribute('aria-label');
    expect(label).toMatch(/pile of limestone/);
    expect(label).toMatch(/parrotfish/i);
    expect(label).toMatch(/sponge/i);
    expect(label).not.toMatch(/\d|kg|grow|shrink|even|more|less|bigger|faster|wins?\b/i);
    expect(svg.textContent).toBe('?');
    // Nothing numeric in the picture: no bars, no data values.
    expect(svg.outerHTML).not.toMatch(/data-gr8-(?!kind)/);
    const keyText = setup().querySelector('[data-gr8-setup="build-key"]').textContent;
    expect(keyText).not.toMatch(/\d|kg|growing|shrink|even\b/i);
    expect(keyText).toMatch(/not how much/);
  });
  it('does not change with the prediction or with saved slider values', () => {
    const svgOf = (seed) => fig(setup(seed), 'build-setup').outerHTML;
    const keyOf = (seed) => setup(seed).querySelector('[data-gr8-setup="build-key"]').outerHTML;
    const base = svgOf({}), key = keyOf({});
    for (const b of [{ pred: 'grow' }, { pred: 'even' }, { pred: 'shrink' }, { cover: 0.6, grazers: 'low' }, { cover: 0, urchins: 'many', grazers: 'high' }]) {
      expect(svgOf({ sciBudget: b })).toBe(base);
      expect(keyOf({ sciBudget: b })).toBe(key);
    }
  });
  it('hides the budget figures until the check, and the setup after it', () => {
    const before = setup();
    expect(fig(before, 'budget')).toBe(null);
    expect(fig(before, 'reef-cut')).toBe(null);
    const after = setup({ sciBudget: { pred: 'grow', revealed: true } });
    expect(fig(after, 'build-setup')).toBe(null);
    expect(after.querySelector('[data-gr8-setup]')).toBe(null);
    expect(fig(after, 'budget')).not.toBe(null);
    expect(fig(after, 'reef-cut')).not.toBe(null);
  });
});

describe('the reef now picture', () => {
  const CASES = [[0.4, 0.05], [0.06, 0.05], [0.05, 0.6], [0.02, 0.7], [0.5326, 0.0001], [0.525, 0.0023], [0, 0], [0.8, 0], [0, 0.8], [0.003, 0.77], [0.2, 0.2]];
  it.each(CASES)('covers the true share of the bottom for coral %s, seaweed %s', (coral, algae) => {
    const host = view(seaweedLab({ graze: 0.5, path: [{ kind: 'start', graze: 0.5, coral, algae }] }));
    const svg = fig(host, 'seaweed-now'), n = slots(svg);
    expect(n.coral + n.weed + n.open + n.sand).toBe(40);
    // Each slot is 2.5% of the bottom; very small amounts still show one slot.
    expect(Math.abs(n.coral / 40 - coral)).toBeLessThanOrEqual(0.0251);
    expect(Math.abs(n.weed / 40 - algae)).toBeLessThanOrEqual(0.0251);
    expect(n.sand / 40).toBeCloseTo(1 - 0.8, 5);
    expect(svg.textContent).toContain('Live coral ' + Math.round(coral * 100) + '%, seaweed ' + Math.round(algae * 100) + '%');
  });
  it('rounds to the nearest slot for ordinary numbers', () => {
    const run = S.seaweedRun(S.WEEDY, 0.7, 'medium', 400).pop();
    const svg = fig(view(seaweedLab({ graze: 0.7, path: [{ kind: 'start', graze: 0.7, coral: run.coral, algae: run.algae }] })), 'seaweed-now'), n = slots(svg);
    expect(n.coral).toBe(Math.round(run.coral * 40));
    expect(n.coral).toBeGreaterThanOrEqual(20); // a recovered reef: over half the bottom in coral
    expect(n.weed).toBe(0);
  });
  it('draws one grazing fish for each 10% of the grazing setting, in words too', () => {
    for (let g = 0; g <= 100; g += 5) {
      const svg = fig(view(seaweedLab({ graze: g / 100 })), 'seaweed-now'), want = Math.round(g / 10);
      expect(fishes(svg)).toBe(want);
      expect(svg.textContent).toContain('Grazing fish drawn: ' + want);
      expect(svg.getAttribute('aria-label')).toContain(want + ' grazing fish are drawn');
    }
  });
  it('says what the rest of the bottom is, adding to 100', () => {
    const svg = fig(view(seaweedLab({ path: [{ kind: 'start', graze: 0.6, coral: 0.4, algae: 0.05 }] })), 'seaweed-now');
    expect(svg.textContent).toContain('Open rock 35%, sand and rubble 20%');
    expect(svg.getAttribute('aria-label')).toContain('Open rock covers 35% and sand and rubble 20%');
  });
  it('keeps the 20 year chart exact', () => {
    const start = { kind: 'start', graze: 0.3, nutrients: 'medium', coral: 0.4, algae: 0.05 }, end = S.seaweedRun(start, 0.3, 'medium', 20).pop();
    const svg = fig(view(seaweedLab({ graze: 0.3, path: [start, { kind: 'run', graze: 0.3, nutrients: 'medium', coral: end.coral, algae: end.algae }] })), 'seaweed-now');
    const rows = S.seaweedRun(start, 0.3, 'medium', 20), lines = [...svg.querySelectorAll('polyline')];
    expect(lines.length).toBe(2);
    const [cp, ap] = lines.map(points);
    const span = 72, y0 = 292;
    rows.forEach((r, i) => {
      expect(cp[i][1]).toBeCloseTo(y0 - span * r.coral / 0.8, 0);
      expect(ap[i][1]).toBeCloseTo(y0 - span * r.algae / 0.8, 0);
    });
  });
  it('has unique React keys', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    view(seaweedLab({ graze: 1, path: [{ kind: 'start', graze: 1, coral: 0.3, algae: 0.3 }] }));
    view({ sciTopic: 'seaweed' }); view({ sciTopic: 'build' }); view({ sciTopic: 'build', sciBudget: { pred: 'grow', revealed: true } });
    const dup = err.mock.calls.filter((c) => /same key|unique "key"/.test(String(c[0])));
    err.mockRestore();
    expect(dup).toEqual([]);
  });
});

describe('the tipping chart', () => {
  const NUT = ['low', 'medium', 'high'];
  const chart = (nutrients) => fig(view(seaweedLab({ nutrients, revealed: true })), 'tipping');
  it.each(NUT)('plots the same data for %s runoff, on the same scale as before', (nutrients) => {
    const svg = chart(nutrients), bal = S.seaweedBalance(nutrients), thr = S.seaweedThresholds(nutrients);
    const lines = [...svg.querySelectorAll('polyline')].filter((l) => l.getAttribute('stroke-width') === '3');
    expect(lines.length).toBe(2);
    const [hp, wp] = lines.map(points);
    expect(hp.length).toBe(bal.length);
    const Y = (v) => 254 - 156 * Math.min(v, 0.6) / 0.6, X = (g) => 44 + 264 * g;
    bal.forEach((b, i) => {
      expect(hp[i][0]).toBeCloseTo(X(b.graze), 0);
      expect(hp[i][1]).toBeCloseTo(Y(b.healthy), 0);
      expect(wp[i][1]).toBeCloseTo(Y(b.weedy), 0);
    });
    const band = [...svg.querySelectorAll('rect')].find((r) => r.getAttribute('fill-opacity') === '0.16');
    expect(Number(band.getAttribute('x'))).toBeCloseTo(X(thr.keep), 0);
    expect(Number(band.getAttribute('x')) + Number(band.getAttribute('width'))).toBeCloseTo(X(thr.recover), 0);
  });
  it.each(NUT)('pictures each side from the model\'s settled reefs for %s runoff', (nutrients) => {
    const svg = chart(nutrients), thr = S.seaweedThresholds(nutrients), g = (thr.keep + thr.recover) / 2;
    const tile = (id) => [...svg.querySelectorAll('[data-gr8-tile="' + id + '"] [data-gr8-tile-coral]')];
    const num = (el, a) => Number(el.getAttribute('data-gr8-tile-' + a));
    const low = S.settled(S.HEALTHY, thr.keep / 2, nutrients), high = S.settled(S.WEEDY, (thr.recover + 1) / 2, nutrients);
    expect(num(tile('low')[0], 'coral')).toBe(Math.round(low.coral * 10));
    expect(num(tile('low')[0], 'coral')).toBeLessThanOrEqual(1);
    expect(num(tile('low')[0], 'weed')).toBeGreaterThanOrEqual(6);
    expect(num(tile('high')[0], 'coral')).toBe(Math.round(high.coral * 10));
    expect(num(tile('high')[0], 'weed')).toBe(0);
    const [weedy, healthy] = tile('both');
    expect(num(weedy, 'coral')).toBe(Math.round(S.settled(S.WEEDY, g, nutrients).coral * 5));
    expect(num(healthy, 'coral')).toBe(Math.round(S.settled(S.HEALTHY, g, nutrients).coral * 5));
    expect(num(healthy, 'coral')).toBeGreaterThan(num(weedy, 'coral'));
  });
  it('still names both thresholds', () => {
    const thr = S.seaweedThresholds('medium'), label = chart('medium').getAttribute('aria-label');
    expect(label).toContain('about ' + Math.round(thr.keep * 100) + '% grazing');
    expect(label).toContain('above about ' + Math.round(thr.recover * 100) + '% grazing');
  });
});

describe('the budget and the side cut', () => {
  const SETUPS = [{}, { cover: 0 }, { cover: 0.05 }, { cover: 0.1 }, { cover: 0.35 }, { cover: 0.6, omega: 4.2, grazers: 'low' }, { cover: 0, grazers: 'high', urchins: 'many' }, { cover: 0.2, omega: 1.5 }];
  const lab = (o) => view({ sciTopic: 'build', sciBudget: { pred: 'grow', revealed: true, ...o } });
  const signed = (v) => (v > 0 ? '+' + v : String(v));

  it.each(SETUPS.map((o) => [JSON.stringify(o), o]))('keeps the bars exact for %s', (_n, o) => {
    const svg = fig(lab(o), 'budget'), b = S.budget(o), s = 150 / Math.max(5, b.added, b.removed);
    expect(svg.textContent).toContain('Corals building: ' + b.added.toFixed(1) + ' kg');
    expect(svg.textContent).toContain('Parrotfish scraping: ' + b.parrotfish.toFixed(1) + ' kg');
    expect(svg.textContent).toContain('Sea urchins scraping: ' + b.urchins.toFixed(1) + ' kg');
    expect(svg.textContent).toContain('Boring sponges and tiny borers: ' + b.other.toFixed(1) + ' kg');
    const bars = [...svg.querySelectorAll('rect')].filter((r) => Number(r.getAttribute('width')) === 64);
    const heights = bars.map((r) => Number(r.getAttribute('height')));
    if (b.added * s > 0.5) expect(heights[0]).toBeCloseTo(b.added * s, 0);
    const worn = heights.slice(b.added * s > 0.5 ? 1 : 0).reduce((a, v) => a + v, 0);
    expect(worn).toBeGreaterThanOrEqual(b.removed * s - 1.5);
    expect(worn).toBeLessThanOrEqual(b.removed * s + 3);
  });
  it.each(SETUPS.map((o) => [JSON.stringify(o), o]))('draws the side cut from sciLabBudget and the 3 mm sea for %s', (_n, o) => {
    const svg = fig(lab(o), 'reef-cut'), b = S.budget(o), seaCm = S.BUDGET.seaMm * 10, reefCm = Math.round(b.cmPerCentury), k = 0.7;
    expect(S.BUDGET.seaMm).toBe(3);
    expect(svg.textContent).toContain('Sea +' + seaCm + ' cm');
    expect(svg.textContent).toContain('Reef ' + signed(reefCm) + ' cm');
    const label = svg.getAttribute('aria-label');
    expect(label).toContain('changes by ' + signed(reefCm) + ' cm');
    expect(label).toContain('sea rises ' + seaCm + ' cm');
    const gap = seaCm - reefCm;
    const squeeze = (t) => t.replace(/\s+/g, '');
    expect(squeeze(svg.textContent)).toContain(squeeze(gap > 0 ? 'gets ' + gap + ' cm deeper' : 'with ' + (-gap) + ' cm to spare'));
    const made = svg.querySelector('[data-gr8-new]'), gone = svg.querySelector('[data-gr8-gone]');
    if (b.cmPerCentury > 0) {
      expect(Number(made.getAttribute('data-gr8-new'))).toBeCloseTo(b.cmPerCentury * k, 1);
      expect(Number(made.getAttribute('height'))).toBeCloseTo(b.cmPerCentury * k, 0);
      expect(gone).toBe(null);
    } else if (b.cmPerCentury < 0) {
      expect(Number(gone.getAttribute('data-gr8-gone'))).toBeCloseTo(-b.cmPerCentury * k, 1);
      expect(made).toBe(null);
    }
    const coral = svg.querySelectorAll('[data-gr8-coral-w]');
    if (b.setup.cover === 0) expect(coral.length).toBe(0);
    else { expect(coral.length).toBe(2); coral.forEach((c) => expect(Number(c.getAttribute('data-gr8-coral-w'))).toBeCloseTo(b.setup.cover * 100, 1)); }
  });
  it('keeps the reef and the sea on one fixed scale across every setting, inside the panel', () => {
    for (const o of SETUPS) {
      const svg = fig(lab(o), 'reef-cut'), b = S.budget(o);
      expect(Number(svg.querySelector('[data-gr8-new],[data-gr8-gone]').getAttribute('height'))).toBeLessThan(200);
      const top = 101 - b.cmPerCentury * 0.7;
      expect(top).toBeGreaterThan(36); // never above the raised sea surface
      expect(top).toBeLessThan(170); // always some reef left in the panel
    }
  });
  it('says the sea rise only as the constant the budget uses', () => {
    const svg = fig(lab({}), 'reef-cut');
    expect(svg.textContent).toContain('Sea rise here is ' + S.BUDGET.seaMm + ' mm a year');
  });
});

describe('the science card scenes', () => {
  it('fills the grazers card with one hidden scene that shows no recovery and no numbers', () => {
    const host = view({ sciTopic: 'seaweed' });
    const art = host.querySelector('[data-pg-art="card-grazers"]');
    expect(art).not.toBe(null);
    expect(art.getAttribute('aria-hidden')).toBe('true');
    expect(art.textContent).toBe('');
    expect(art.querySelector('svg').querySelectorAll('*').length).toBeLessThan(70);
    // One moment in time: no count that could stand for a before and an after.
    expect(art.querySelector('[data-gr8-kind],[data-gr8-fish]')).toBe(null);
  });
  it('fills the acid card with carbonate marks in the paragraph\'s own ratio', () => {
    const host = view({ sciTopic: 'build' });
    const art = host.querySelector('[data-pg-art="card-acid"]');
    expect(art).not.toBe(null);
    expect(art.getAttribute('aria-hidden')).toBe('true');
    expect(art.textContent).toBe('');
    const solid = art.querySelector('[data-gr8-carbonate]'), gone = art.querySelector('[data-gr8-carbonate-gone]');
    expect(Number(solid.getAttribute('data-gr8-carbonate'))).toBe(10);
    expect(Number(gone.getAttribute('data-gr8-carbonate-gone'))).toBe(2);
    expect(10 / 12).toBeCloseTo(3.5 / 4.2, 5);
    expect((solid.getAttribute('d').match(/M/g) || []).length).toBe(10);
    expect((gone.getAttribute('d').match(/M/g) || []).length).toBe(2);
    expect(art.querySelector('svg').querySelectorAll('*').length).toBeLessThan(70);
  });
});

describe('all themes', () => {
  const STATES = [{ sciTopic: 'seaweed' }, { sciTopic: 'build' }, seaweedLab({ revealed: true, graze: 0.7 }), { sciTopic: 'build', sciBudget: { pred: 'grow', revealed: true } }, { sciTopic: 'build', sciBudget: { pred: 'grow', revealed: true, cover: 0.05, urchins: 'many' } }];
  it.each(STATES.map((st, i) => [i, st]))('state %i passes axe', async (_i, st) => {
    const result = await runIsolatedAxe(renderTool('coralReef', { coralReef: { section: 'science', ...st } }));
    expect(result.violations.map((v) => v.id + ': ' + v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', '))).toEqual([]);
  }, 60000);
  it('uses palette ink for all text in the figures and renders no bad values', () => {
    for (const theme of ['light', 'dark', 'contrast']) {
      for (const st of STATES) {
        const html = renderTool('coralReef', { coralReef: { section: 'science', ...st } }, { theme });
        expect(html.includes('NaN'), theme).toBe(false);
        expect(html.includes('undefined'), theme).toBe(false);
        expect(html.includes(String.fromCharCode(8211)) || html.includes(String.fromCharCode(8212)), theme + ' dash').toBe(false);
        const P = window.__RR_TEST_EXPORTS__.coralReef.palette(theme);
        dom(html).querySelectorAll('svg[data-scilab-figure]').forEach((svg) => {
          expect(svg.getAttribute('viewBox')).toMatch(/^0 0 320 \d+$/);
          svg.querySelectorAll('text').forEach((tx) => {
            expect(Number(tx.getAttribute('font-size'))).toBeGreaterThanOrEqual(13.5);
            expect([P.text, P.muted, P.good, P.bad]).toContain(tx.getAttribute('fill'));
          });
        });
      }
    }
  });
});
