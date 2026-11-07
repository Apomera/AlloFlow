import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import path from 'node:path';

// Lane mt10: Survey methods visual pass. The tape plot draws what the survey
// code returns, the belt lists are card grids, the field guide gains an "ask in
// this order" aid, and the practice strip shows status by shape, never early.

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
let loadTool, resetStemLab, renderTool, React, ReactDOMClient, X, S, I;
beforeAll(async () => {
  const mod = await import(/* @vite-ignore */ 'file:///' + path.resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js').replace(/\\/g, '/'));
  ({ loadTool, resetStemLab, renderTool, React, ReactDOMClient } = mod);
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool(TOOL, 'coralReef');
  X = window.__RR_TEST_EXPORTS__.coralReef; S = window.__RR_TEST_EXPORTS__.coralReefSurvey; I = window.__RR_TEST_EXPORTS__.coralReefInverts;
});
const mounted = [];
afterEach(async () => { while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); } });
async function mount(seed) {
  let data = { coralReef: Object.assign({ section: 'methods' }, seed) };
  const host = document.createElement('div'); document.body.appendChild(host); const root = ReactDOMClient.createRoot(host);
  function Shell() { const [state, setState] = React.useState(data); data = state; return window.StemLab._registry.coralReef.render({ React, toolData: state, setToolData: setState, t: (k, f) => f || k }); }
  const t = { host, root, get data() { return data.coralReef; }, q: (s) => host.querySelector(s), all: (s) => [...host.querySelectorAll(s)] }; mounted.push(t);
  await React.act(async () => root.render(React.createElement(Shell))); return t;
}
const click = async (el) => { expect(el, 'control exists').toBeTruthy(); await React.act(async () => { el.focus(); el.click(); }); };
const dom = (data, opts) => { const d = document.createElement('div'); d.innerHTML = renderTool('coralReef', { coralReef: data }, opts); return d; };
const CODES = { hard_coral: 'HC', bleached_coral: 'BL', recently_dead_coral: 'RKC', macroalgae: 'NIA', rock: 'RC', rubble: 'RB', sand: 'SD' };
// PRACTICE_POINTS in the tool, in order.
const TRUTH = ['hard_coral', 'bleached_coral', 'recently_dead_coral', 'macroalgae', 'rubble', 'bleached_coral', 'recently_dead_coral', 'rock'];

describe('one tape is a sample: the plot', () => {
  const preview = () => {
    const site = X.siteById('reserve');
    return { values: [0, 1, 2, 3, 4].map((k) => X.indicators(X.trueCover(X.buildTransect(site, S.simSeed(site, k, 0)))).liveCoral), truth: S.siteTruth(site, 'live') };
  };
  it('places each numbered dot at the value the survey code returns, in the listed order', () => {
    const { values, truth } = preview();
    const box = dom({ section: 'methods' }).querySelector('[data-w2-repeat]');
    const svg = box.querySelector('svg[data-mt10-plot]');
    expect(svg, 'plot').toBeTruthy();
    const dots = [...svg.querySelectorAll('[data-mt10-tape]')];
    expect(dots.length).toBe(5);
    expect(dots.map((g) => +g.getAttribute('data-mt10-value'))).toEqual(values);
    dots.forEach((g, i) => {
      expect(g.getAttribute('data-mt10-tape')).toBe(String(i + 1));
      expect(g.querySelector('circle').getAttribute('cx'), 'dot ' + (i + 1)).toBe(values[i] + '%');
      const texts = [...g.querySelectorAll('text')].map((n) => n.textContent);
      expect(texts).toContain(String(i + 1));
      expect(texts).toContain(values[i] + '%');
    });
    // The text lists the same values in the same order the dots are numbered.
    expect(box.textContent).toContain(values.map((v) => v + '%').join(', '));
    const whole = svg.querySelector('[data-mt10-whole]');
    expect(whole.getAttribute('x1')).toBe(truth + '%');
    expect(whole.getAttribute('x2')).toBe(truth + '%');
    expect(svg.textContent).toContain('Whole reef ' + truth + '%');
    // A stem joins each dot to the whole-reef line, so the distance is the real one.
    dots.forEach((g, i) => {
      const stem = g.querySelector('line');
      expect(stem.getAttribute('x1')).toBe(truth + '%');
      expect(stem.getAttribute('x2')).toBe(values[i] + '%');
    });
  });
  it('uses the full width with text at real size, and names what it shows', () => {
    const { values, truth } = preview();
    const svg = dom({ section: 'methods' }).querySelector('[data-w2-repeat] svg[data-mt10-plot]');
    expect(svg.getAttribute('viewBox'), 'no viewBox: text must not scale with the card').toBe(null);
    expect(svg.getAttribute('width')).toBe('100%');
    expect(svg.getAttribute('role')).toBe('img');
    expect(svg.getAttribute('aria-label')).toContain(values.map((v) => v + '%').join(', '));
    expect(svg.getAttribute('aria-label')).toContain('whole reef at ' + truth + '%');
    const sizes = [...svg.querySelectorAll('text')].map((n) => parseFloat(n.getAttribute('font-size')));
    expect(sizes.length).toBeGreaterThan(5);
    sizes.forEach((s) => { expect(s).toBeGreaterThanOrEqual(12); expect(s).toBeLessThanOrEqual(14); });
  });
});

describe('fish and invertebrates as card grids', () => {
  it('keeps every fish name and role, drawn by fishShape, as cards', () => {
    const host = dom({ section: 'methods', w2MethodsPart: 'fish' });
    const panel = host.querySelector('[data-w2-mpanel="fish"]');
    const cards = [...panel.querySelectorAll('[data-mt10-fish]')];
    expect(cards.map((c) => c.getAttribute('data-mt10-fish'))).toEqual(X.FISH_FAMILIES);
    for (const c of cards) {
      expect(c.closest('.mt10-cards'), 'in a grid').toBeTruthy();
      const art = c.querySelector('svg');
      expect(art.getAttribute('aria-hidden')).toBe('true');
      expect(art.getAttribute('viewBox')).toBe('-16 -10 32 20');
      expect(art.getAttribute('width'), 'no fixed thumbnail size').toBe(null);
      expect(c.querySelector('strong').textContent.length).toBeGreaterThan(3);
      expect(c.querySelector('p').textContent.length).toBeGreaterThan(20);
    }
    expect(panel.textContent).toContain('Grazer. Scrapes algae off rock and dead coral with a beak of fused teeth, which keeps space open for young corals.');
    expect(panel.textContent).toContain('Predator and a popular catch. Another sign of fishing pressure.');
  });
  it('keeps the nine invertebrates, their words, guide buttons and notes', async () => {
    const t = await mount({ w2MethodsPart: 'fish' });
    const IN = I.invNames((k, f) => f), IR = I.invRoles((k, f) => f);
    const items = t.all('[data-inv-method]');
    expect(items.map((li) => li.dataset.invMethod)).toEqual(I.INV_IDS);
    for (const li of items) {
      const id = li.dataset.invMethod, link = li.querySelector('[data-inv-guide]');
      expect(li.closest('.mt10-cards'), 'in a grid').toBeTruthy();
      expect(li.textContent).toContain(IN[id]);
      expect(li.textContent).toContain(IR[id]);
      expect(li.querySelector('svg[data-inv-chip="' + id + '"]')).toBeTruthy();
      if (I.INV_GUIDE[id]) {
        expect(link.dataset.invGuide).toBe(I.INV_GUIDE[id]);
        expect(link.getAttribute('aria-label')).toBe('Open ' + IN[id] + ' in the species guide');
        expect(link.textContent).toBe('Species guide');
      } else { expect(link).toBeNull(); expect(li.textContent).toContain('Not in the species guide yet.'); }
    }
    expect(t.q('[data-inv-methods]').textContent).toContain('Drupella snails and other coral eaters are not on the count list.');
    await click(t.q('[data-inv-guide="giant_triton"]'));
    expect(t.data.section).toBe('guide'); expect(t.data.guideSpeciesId).toBe('giant_triton');
  });
});

describe('field guide: not sure? ask in this order', () => {
  const panel = () => dom({ section: 'methods', w2MethodsPart: 'guide' }).querySelector('[data-w2-mpanel="guide"]');
  it('sits in the eighth cell after the seven cards', () => {
    const items = [...panel().querySelectorAll('.w2-gcards > li')];
    expect(items.length).toBe(8);
    expect(items[7].hasAttribute('data-mt10-ask')).toBe(true);
    expect(items[7].textContent).toContain('Not sure? Ask in this order');
  });
  it('reaches each of the seven categories exactly once', () => {
    const out = [...panel().querySelectorAll('[data-mt10-ask] [data-mt10-outcome]')].map((o) => o.getAttribute('data-mt10-outcome'));
    expect([...out].sort()).toEqual([...X.CATEGORY_IDS].sort());
    for (const el of panel().querySelectorAll('[data-mt10-outcome]')) {
      const id = el.getAttribute('data-mt10-outcome');
      expect(el.textContent, id).toContain(CODES[id]);
    }
  });
  it('asks loose, then tissue, then seaweed height, then skeleton, in that order', () => {
    const p = panel(), steps = [...p.querySelectorAll('[data-mt10-ask] [data-mt10-step]')];
    const outOf = (s) => [...s.querySelectorAll('[data-mt10-outcome]')].map((o) => o.getAttribute('data-mt10-outcome'));
    expect(steps.map(outOf)).toEqual([['sand', 'rubble'], ['hard_coral', 'bleached_coral'], ['macroalgae'], ['recently_dead_coral', 'rock']]);
    expect(steps[0].textContent).toMatch(/loose/i);
    expect(steps[1].textContent).toMatch(/tissue/i);
    expect(steps[2].textContent).toMatch(/fleshy seaweed taller than about 3 cm/i);
    expect(steps[3].textContent).toMatch(/skeleton still white/i);
  });
  it('says only what the category cards say', () => {
    const p = panel(), G = {};
    [...p.querySelectorAll('.w2-gcards > li')].slice(0, 7).forEach((li, i) => { G[X.CATEGORY_IDS[i]] = li.textContent; });
    const words = (id) => p.querySelector('[data-mt10-outcome="' + id + '"]').parentElement.textContent;
    // Each outcome's wording has to be backed by that category's own card.
    expect(G.sand).toContain('Grains smaller than 0.5 cm'); expect(words('sand')).toContain('Grains under 0.5 cm');
    expect(G.rubble).toContain('about 0.5 to 15 cm'); expect(words('rubble')).toContain('about 0.5 to 15 cm');
    expect(G.rubble).toContain('Loose');
    expect(G.hard_coral).toContain('color from the algae'); expect(words('hard_coral')).toMatch(/color/i);
    expect(G.bleached_coral).toContain('bright white'); expect(words('bleached_coral')).toMatch(/bright white/i);
    expect(G.bleached_coral).toContain('tissue and polyps are still there');
    expect(G.macroalgae).toContain('taller than about 3 cm');
    expect(G.recently_dead_coral).toMatch(/skeleton is still white or its small cup shapes are still clear/);
    expect(G.rock).toContain('no living coral');
    // Short turf and pink crusts stay with rock: seaweed height comes first, and they fail it.
    expect(G.macroalgae).toContain('Short turf, pink crusty algae');
    expect(G.rock).toContain('short turf or pink crusts');
  });
  it('has no text smaller than the guide cards and no dashes', () => {
    const li = panel().querySelector('[data-mt10-ask]');
    expect(li.textContent).not.toMatch(/[–—]/);
    expect(li.querySelector('h4')).toBeTruthy();
    expect(li.querySelectorAll('ol > li').length).toBe(4);
  });
});

describe('practice', () => {
  const norm = (s, n) => s.replace(new RegExp('Practice point ' + (n + 1) + '\\b', 'g'), 'Practice point N');
  it('answers are a grid of category chips in a fixed order', () => {
    const host = dom({ section: 'methods', w2MethodsPart: 'practice' });
    const groups = [...host.querySelectorAll('.w2-pchoices')];
    expect(groups.length).toBe(8);
    for (const g of groups) {
      expect(g.classList.contains('mt10-pchoices')).toBe(true);
      const btns = [...g.querySelectorAll('button')];
      expect(btns.map((b) => b.getAttribute('data-cat'))).toEqual(X.CATEGORY_IDS);
      btns.forEach((b) => { expect(b.querySelector('.mt10-code').textContent).toBe(CODES[b.getAttribute('data-cat')]); });
      expect(g.querySelector('img, svg'), 'no picture thumbnails on answers').toBe(null);
    }
    const css = [...host.querySelectorAll('style')].map((s) => s.textContent).join('\n');
    expect(css).toContain('.w2-pchoices button{min-height:44px!important}');
    expect(css).toContain('.w2-pnav button{min-width:44px;min-height:44px!important');
  });
  it('leaks nothing before a point is answered: same markup whatever the right answer is', () => {
    const host = dom({ section: 'methods', w2MethodsPart: 'practice' });
    const cards = [...host.querySelectorAll('[data-w2-pcard]')];
    const groupHtml = cards.map((c, n) => norm(c.querySelector('.w2-pchoices').outerHTML, n));
    groupHtml.forEach((g, n) => expect(g, 'point ' + (n + 1)).toBe(groupHtml[0]));
    // TRUTH differs across points, so identical markup cannot carry the answer.
    expect(new Set(TRUTH).size).toBeGreaterThan(3);
    cards.forEach((c, n) => {
      const copy = c.cloneNode(true); copy.querySelector('.w2-pchoices').remove();
      const rest = copy.innerHTML;
      expect(rest, 'point ' + (n + 1) + ' id').not.toContain(TRUTH[n]);
      expect(copy.querySelector('.mt10-code')).toBe(null);
      // The scene's part names go too; the parts every scene shares stay.
      expect([...copy.querySelectorAll('[data-part]')].map((e) => e.getAttribute('data-part')).sort()).toEqual(['plumb', 'plumb-tip', 'tape']);
      expect(copy.querySelector('svg').getAttribute('aria-label'), 'the picture still has its description').toMatch(/^Close-up under the point: /);
      expect(copy.textContent).not.toContain('Not quite');
      expect(copy.textContent).not.toContain('Correct.');
    });
    const strip = [...host.querySelectorAll('[data-w2-point]')];
    expect(strip.length).toBe(8);
    const other = strip.slice(1).map((b, i) => b.outerHTML.replace(new RegExp('Practice point ' + (i + 2) + ':', 'g'), 'Practice point N:').replace('data-w2-point="' + (i + 1) + '"', 'data-w2-point="N"').replace('>' + (i + 2) + '<', '>N<'));
    other.forEach((o) => expect(o).toBe(other[0]));
    strip.forEach((b) => {
      expect(b.getAttribute('data-mt10-state')).toBe('open');
      expect(b.querySelector('svg'), 'no mark yet').toBe(null);
      expect(b.getAttribute('aria-label')).toMatch(/not answered yet/);
    });
  });
  it('answering one point reveals nothing about the others', () => {
    const none = dom({ section: 'methods', w2MethodsPart: 'practice' });
    const one = dom({ section: 'methods', w2MethodsPart: 'practice', practice: { 0: 'rock' } });
    for (let n = 1; n < 8; n++) {
      const pick = (d) => d.querySelector('[data-w2-pcard="' + n + '"] .w2-pchoices').outerHTML;
      expect(pick(one), 'choices of point ' + (n + 1)).toBe(pick(none));
    }
    const strip = [...one.querySelectorAll('[data-w2-point]')];
    expect(strip.slice(2).every((b) => b.getAttribute('data-mt10-state') === 'open' && !b.querySelector('svg'))).toBe(true);
    expect(strip[1].getAttribute('data-mt10-state')).toBe('open');
  });
  it('the strip marks right and wrong by shape as well as colour, only once answered', () => {
    const host = dom({ section: 'methods', w2MethodsPart: 'practice', practice: { 0: 'hard_coral', 1: 'rock' } });
    const strip = [...host.querySelectorAll('[data-w2-point]')];
    expect(strip[0].getAttribute('data-mt10-state')).toBe('right');
    expect(strip[1].getAttribute('data-mt10-state')).toBe('wrong');
    expect(strip[2].getAttribute('data-mt10-state')).toBe('open');
    const a = strip[0].querySelector('svg'), b = strip[1].querySelector('svg');
    expect(a.getAttribute('aria-hidden')).toBe('true'); expect(b.getAttribute('aria-hidden')).toBe('true');
    expect(a.querySelector('circle'), 'right is round').toBeTruthy();
    expect(b.querySelector('rect'), 'wrong is square').toBeTruthy();
    expect(a.querySelector('path').getAttribute('d')).not.toBe(b.querySelector('path').getAttribute('d'));
    expect(strip[0].getAttribute('aria-label')).toBe('Practice point 1: correct');
    expect(strip[1].getAttribute('aria-label')).toBe('Practice point 2: not quite');
    // Unanswered, not current: a dashed outline; answered: solid.
    expect(strip[3].style.borderStyle).toBe('dashed');
    expect(strip[1].style.borderStyle).toBe('solid');
  });
  it('only the first answer counts, and the feedback stays as it was', async () => {
    const t = await mount({ w2MethodsPart: 'practice' });
    const card = () => t.all('[data-w2-pcard]').filter((c) => !c.hidden)[0];
    expect(card().dataset.w2Pcard).toBe('0');
    await click(card().querySelector('[data-cat="rock"]'));
    expect(t.data.practice).toEqual({ 0: 'rock' });
    expect(card().textContent).toContain('Not quite: this is Live hard coral.');
    await click(card().querySelector('[data-cat="hard_coral"]'));
    expect(t.data.practice).toEqual({ 0: 'rock' });
    expect(t.q('[data-w2-point="0"]').getAttribute('data-mt10-state')).toBe('wrong');
    expect(card().querySelector('[data-cat="rock"]').getAttribute('aria-pressed')).toBe('true');
    expect(card().querySelector('[data-cat="hard_coral"]').getAttribute('aria-pressed')).toBe('false');
    expect(card().querySelector('[data-cat="hard_coral"]').textContent).toContain('✓');
    expect(card().querySelector('[data-cat="rock"]').textContent).toContain('✗');
    expect(document.activeElement).toBe(card().querySelector('[data-cat="hard_coral"]'));
    await click(t.q('[data-w2-next-point]'));
    expect(card().dataset.w2Pcard).toBe('1');
    await click(card().querySelector('[data-cat="bleached_coral"]'));
    expect(t.q('[data-w2-point="1"]').getAttribute('data-mt10-state')).toBe('right');
    expect(card().textContent).toContain('Correct.');
  });
});
