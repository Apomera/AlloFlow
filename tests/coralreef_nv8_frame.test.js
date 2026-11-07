import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// Round 8, Reef science frame: picture topic cards, the visual index on What helps reefs,
// the good-news picture on What helps here, and the numbers the Future figures draw.
vi.setConfig({ testTimeout: 60000 });
const H = await import(/* @vite-ignore */ path.resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js'));
const { loadTool, resetStemLab, renderTool, React, ReactDOMClient } = H;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const act = React.act;
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
const SRC = fs.readFileSync(TOOL, 'utf8');
const mounted = [];
beforeEach(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool(TOOL, 'coralReef'); });
afterEach(async () => {
  while (mounted.length) { const m = mounted.pop(); await act(async () => m.root.unmount()); m.host.remove(); }
  delete window.matchMedia;
});
function dom(html) { const host = document.createElement('div'); host.innerHTML = html; return host; }
async function mount(seed = {}, extraCtx = {}) {
  let data = { coralReef: { section: 'science', ...seed } };
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const cfg = window.StemLab._registry.coralReef;
  function Shell() {
    const [toolData, setToolData] = React.useState(data);
    data = toolData;
    return cfg.render({ React, toolData, setToolData, t: (k, f) => f || k, announceToSR: () => {}, ...extraCtx });
  }
  const item = { host, root, get d() { return data.coralReef; } };
  mounted.push(item);
  await act(async () => root.render(React.createElement(Shell)));
  return item;
}
async function click(node) { expect(node, 'button exists').toBeTruthy(); await act(async () => { node.click(); await Promise.resolve(); }); }
const panel = (host, id) => host.querySelector('[id="cr-scilab-panel-' + id + '"]');
const science = (topic, opts) => dom(renderTool('coralReef', { coralReef: { section: 'science', sciTopic: topic } }, opts));
const TOPICS = ['heat', 'seaweed', 'build', 'web', 'future', 'help'];
const HELP_ORDER = ['restore', 'stars', 'garden', 'reserves', 'water', 'larvae', 'structures', 'biorock', 'fragile'];

describe('topic picture cards', () => {
  it('gives each of the six tabs its own hidden picture, with no words in it', () => {
    const host = science('future');
    const tabs = [...host.querySelectorAll('[role="tab"]')];
    expect(tabs.map((t) => t.id)).toEqual(TOPICS.map((id) => 'cr-scilab-tab-' + id));
    const seen = new Set();
    tabs.forEach((t, i) => {
      const pic = t.querySelector('svg[data-nv8-pic]');
      expect(pic, t.id).not.toBe(null);
      expect(pic.getAttribute('data-nv8-pic')).toBe(TOPICS[i]);
      expect(pic.getAttribute('aria-hidden')).toBe('true');
      expect(pic.getAttribute('focusable')).toBe('false');
      expect(pic.querySelector('text,title,desc,[id]')).toBe(null);
      expect(pic.querySelectorAll('*').length, t.id + ' stays light').toBeLessThan(60);
      seen.add(pic.innerHTML);
    });
    expect(seen.size).toBe(6);
  });
  it('shows the pictures the same before and after a lab is revealed, so they cannot leak an answer', () => {
    const pics = (coralReef) => [...dom(renderTool('coralReef', { coralReef })).querySelectorAll('[role="tab"] svg[data-nv8-pic]')].map((s) => s.outerHTML);
    const before = pics({ section: 'science', sciTopic: 'seaweed' });
    const after = pics({ section: 'science', sciTopic: 'seaweed', sciSeaweed: { graze: 0.3, nutrients: 'medium', pred: 'more', started: true, revealed: true, path: [{ kind: 'start', graze: 0.6, nutrients: 'medium', coral: 0.5, algae: 0.05 }, { kind: 'run', graze: 0.2, nutrients: 'medium', coral: 0.05, algae: 0.6 }] }, sciBudget: { pred: 'shrink', revealed: true } });
    expect(after).toEqual(before);
  });
  it('marks the selected tab with a drawn tick as well as the colour, on that tab only, in every theme', () => {
    for (const theme of ['light', 'dark', 'contrast']) {
      const host = science('build', { theme });
      const ticks = [...host.querySelectorAll('[role="tab"] [data-nv8-tick]')];
      expect(ticks.length, theme).toBe(1);
      expect(ticks[0].closest('[role="tab"]').id).toBe('cr-scilab-tab-build');
      expect(ticks[0].getAttribute('aria-hidden')).toBe('true');
    }
  });
  it('keeps the tab pattern: names and hints in the accessible text, one tab in the tab order', () => {
    const host = science('web');
    const tabs = [...host.querySelectorAll('[role="tab"]')];
    expect(tabs.map((t) => t.getAttribute('tabindex'))).toEqual(['-1', '-1', '-1', '0', '-1', '-1']);
    expect(tabs[0].textContent).toBe('Heat and bleachingRun a heatwave, week by week');
    expect(tabs[3].textContent).toBe('Who eats whomFollow a reef food web');
  });
  it('lays the row out as a grid of equal rows, with a phone layout and a forced-colors mark', () => {
    expect(SRC.includes('.nv8-tabs{display:grid')).toBe(true);
    expect(SRC.includes('grid-auto-rows:1fr')).toBe(true);
    expect(/forced-colors:active\)\{[^']*nv8-tab\[aria-selected="true"\]/.test(SRC)).toBe(true);
  });
});

describe('What helps reefs index', () => {
  const index = (host) => panel(host, 'help').querySelector('nav[data-nv8-index]');
  it('lists all nine cards in page order, each with a hidden picture and a short name', () => {
    const host = science('help');
    const nav = index(host);
    expect(nav).not.toBe(null);
    expect(nav.getAttribute('aria-labelledby')).toBeTruthy();
    expect(nav.querySelector('[id="' + nav.getAttribute('aria-labelledby') + '"]').textContent).toBe('Jump to a card');
    const btns = [...nav.querySelectorAll('li > button')];
    expect(btns.map((b) => b.getAttribute('data-nv8-jump'))).toEqual(HELP_ORDER);
    const onPage = [...panel(host, 'help').querySelectorAll('[data-nv8-target]')].map((n) => n.getAttribute('data-nv8-target'));
    expect(onPage).toEqual(HELP_ORDER);
    const seen = new Set();
    btns.forEach((b) => {
      const pic = b.querySelector('svg');
      expect(pic.getAttribute('aria-hidden')).toBe('true');
      expect(pic.querySelector('text,title,desc,[id]')).toBe(null);
      expect(pic.querySelectorAll('*').length, b.textContent).toBeLessThan(50);
      seen.add(pic.innerHTML);
      expect(b.textContent.length).toBeGreaterThan(5);
    });
    expect(seen.size).toBe(9);
  });
  it('marks only what the cards say in words, and invents no ranking', () => {
    const host = science('help');
    const marked = [...index(host).querySelectorAll('[data-nv8-mark]')].map((m) => [m.closest('button').getAttribute('data-nv8-jump'), m.textContent]);
    expect(marked).toEqual([['structures', '? still being studied'], ['biorock', '? a claim to check']]);
    const struct = panel(host, 'help').querySelector('[data-help="structures"]').textContent;
    expect(struct).toMatch(/still working out/);
    expect(panel(host, 'help').querySelector('svg[data-figure="help-structures"]').getAttribute('aria-label')).toMatch(/still being studied/i);
    const bio = panel(host, 'help').querySelector('[data-help="biorock"]').textContent;
    expect(bio).toMatch(/A claim to check/);
    expect(index(host).textContent).not.toMatch(/strong|best|proven|top\b/i);
  });
  it('jumps to the card heading, moves focus there and scrolls smoothly', async () => {
    window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
    const scroll = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scroll;
    const t = await mount({ sciTopic: 'help' });
    for (const id of ['stars', 'restore', 'fragile']) {
      await click(t.host.querySelector('[data-nv8-jump="' + id + '"]'));
      const target = t.host.querySelector('[data-nv8-target="' + id + '"]');
      expect(document.activeElement).toBe(target);
      expect(target.getAttribute('tabindex')).toBe('-1');
      expect(/^H[34]$/.test(target.tagName)).toBe(true);
    }
    expect(scroll.mock.calls[0][0].behavior).toBe('smooth');
    delete window.HTMLElement.prototype.scrollIntoView;
  });
  it('does not animate the scroll under reduced motion, from the system or from the host', async () => {
    const scroll = vi.fn();
    window.HTMLElement.prototype.scrollIntoView = scroll;
    window.matchMedia = () => ({ matches: true, addListener() {}, removeListener() {} });
    const a = await mount({ sciTopic: 'help' });
    await click(a.host.querySelector('[data-nv8-jump="water"]'));
    expect(scroll.mock.calls[0][0].behavior).toBe('auto');
    window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
    scroll.mockClear();
    const b = await mount({ sciTopic: 'help' }, { reduceMotion: true });
    await click(b.host.querySelector('[data-nv8-jump="water"]'));
    expect(scroll.mock.calls[0][0].behavior).toBe('auto');
    delete window.HTMLElement.prototype.scrollIntoView;
  });
  it('still works where scrollIntoView is missing, and leaves the headings out of the tab order', async () => {
    const t = await mount({ sciTopic: 'help' });
    await click(t.host.querySelector('[data-nv8-jump="garden"]'));
    expect(document.activeElement).toBe(t.host.querySelector('[data-nv8-target="garden"]'));
    t.host.querySelectorAll('[data-nv8-target]').forEach((n) => expect(n.getAttribute('tabindex')).toBe('-1'));
  });
  it('does not change the headings of the same cards anywhere else', () => {
    const host = science('future');
    expect(panel(host, 'future').querySelector('[data-nv8-target]')).toBe(null);
  });
});

describe('What helps here', () => {
  it('has a hidden good-news picture on every topic that has the panel', () => {
    const heat = [...science('heat').querySelectorAll('.cr-scilab-helps')];
    const webHost = dom(renderTool('coralReef', { coralReef: { section: 'science', sciTopic: 'web', sciWeb: { caseId: 'grazers', cases: { grazers: { pred: { algae: 'more', polyps: 'fewer', clown_triggerfish: 'same' }, revealed: true } } } } }));
    const web = [...panel(webHost, 'web').querySelectorAll('.cr-scilab-helps')];
    expect(heat.length).toBe(4);
    expect(web.length).toBe(1);
    heat.concat(web).forEach((p) => {
      const pic = p.querySelector('svg[data-nv8-pic="good-news"]');
      expect(pic, p.textContent.slice(0, 30)).not.toBe(null);
      expect(pic.getAttribute('aria-hidden')).toBe('true');
      expect(pic.querySelector('text,title,desc,[id]')).toBe(null);
      expect(p.querySelector('h3').textContent).toBe('What helps here');
    });
  });
  it('still opens another topic from its link, focus on the new tab', async () => {
    const t = await mount({ sciTopic: 'heat' });
    const link = [...panel(t.host, 'heat').querySelectorAll('.cr-scilab-helps button')].find((b) => /See what helps reefs/.test(b.textContent));
    await click(link);
    expect(t.d.sciTopic).toBe('help');
    expect(document.activeElement.id).toBe('cr-scilab-tab-help');
    expect(panel(t.host, 'help').hasAttribute('hidden')).toBe(false);
  });
});

describe('Future page numbers', () => {
  const fig = (id, theme) => science('future', { theme }).querySelector('svg[data-figure="' + id + '"]');
  it('draws the warming bars in true proportion, across the full figure', () => {
    const P = window.__RR_TEST_EXPORTS__.coralReef.palette('light');
    const svg = fig('warming');
    const rects = [...svg.querySelectorAll('rect')];
    const tracks = rects.filter((r) => r.getAttribute('fill') === P.cardAlt);
    expect(tracks.length).toBe(2);
    const full = Number(tracks[0].getAttribute('width'));
    expect(full).toBeGreaterThanOrEqual(314);
    const solid = rects.filter((r) => r.getAttribute('fill') === P.bad && !r.getAttribute('fill-opacity'));
    expect(solid.length).toBe(2);
    expect(Number(solid[0].getAttribute('width')) / full).toBeCloseTo(0.7, 2);
    expect(Number(solid[1].getAttribute('width')) / full).toBeCloseTo(0.99, 2);
    const range = rects.filter((r) => r.getAttribute('fill-opacity'));
    expect(range.length).toBe(1);
    expect(Number(range[0].getAttribute('width')) / full).toBeCloseTo(0.2, 2);
    expect(Number(range[0].getAttribute('x'))).toBeCloseTo(Number(solid[0].getAttribute('x')) + Number(solid[0].getAttribute('width')), 1);
    const title = [...svg.querySelectorAll('text')][0];
    expect(title.querySelectorAll('tspan').length, 'title on one line').toBe(1);
  });
  it('draws what remains in the future panel from the same numbers as the sentence beside it', () => {
    const host = science('future');
    const p = panel(host, 'future').querySelector('.cr-scilab-helps');
    const sentence = p.querySelector('p').textContent;
    expect(sentence).toContain('10 to 30%');
    expect(sentence).toContain('less than 1%');
    expect(sentence).toContain('Every bit of warming avoided matters.');
    const rows = [...p.querySelectorAll('[data-nv8-keep]')];
    expect(rows.length).toBe(2);
    // The chart is what the warming figure leaves over: 100 minus the decline.
    expect([rows[0].getAttribute('data-lo'), rows[0].getAttribute('data-hi')]).toEqual([String(100 - 90), String(100 - 70)]);
    expect([rows[1].getAttribute('data-lo'), rows[1].getAttribute('data-hi')]).toEqual(['0', String(100 - 99)]);
    expect(rows[0].textContent).toContain('10 to 30%');
    expect(rows[1].textContent).toContain('less than 1%');
    expect(rows[0].querySelector('[data-nv8-solid]').style.width).toBe('10%');
    expect(rows[0].querySelector('[data-nv8-range]').style.width).toBe('20%');
    expect(rows[0].querySelector('[data-nv8-range]').style.left).toBe('10%');
    expect(rows[1].querySelector('[data-nv8-solid]')).toBe(null);
    expect(rows[1].querySelector('[data-nv8-range]').style.width).toBe('1%');
    // Only the future panel has it.
    expect(panel(host, 'heat').querySelector('[data-nv8-keep]')).toBe(null);
  });
  it('draws four corals before and three after, all at the same size, with matching captions', () => {
    const svg = fig('forms');
    const small = [...svg.querySelectorAll('g[transform]')].filter((g) => /scale\(0\.3\)/.test(g.getAttribute('transform')));
    expect(small.length).toBe(7);
    const shown = [...svg.querySelectorAll('tspan')].map((t) => t.textContent);
    ['Before', 'many kinds', 'After', 'some coral, fewer kinds', 'hit hardest', 'many survived', 'These are tendencies: boulder corals can die too.'].forEach((s) => expect(shown, s).toContain(s));
    const heads = [...svg.querySelectorAll('text')].filter((t) => /^(Before|After)$/.test(t.textContent));
    expect(heads[0].getAttribute('y')).toBe(heads[1].getAttribute('y'));
  });
  it('still draws 6 survivors, 1 maybe and 3 lost of 10 in the restoration figure, with all three in the key', () => {
    const svg = science('help').querySelector('svg[data-figure="restore"]');
    const domes = [...svg.querySelectorAll('path')];
    const lost = domes.filter((d) => d.getAttribute('fill') === 'none');
    const maybe = domes.filter((d) => d.getAttribute('fill-opacity'));
    const live = domes.filter((d) => d.getAttribute('fill') !== 'none' && !d.getAttribute('fill-opacity'));
    // Ten counted, plus one of each in the key.
    expect(live.length).toBe(6 + 1);
    expect(maybe.length).toBe(1 + 1);
    expect(lost.length).toBe(3 + 1);
    const shown = [...svg.querySelectorAll('tspan')].map((t) => t.textContent);
    ['survives', 'may survive', 'lost', '6 to 7 survive', '60 to 70%'].forEach((s) => expect(shown, s).toContain(s));
    const heads = [...svg.querySelectorAll('text')].slice(0, 12).filter((t) => /Typical project|Of 10 planted corals/.test(t.textContent));
    expect(heads.length).toBe(2);
    heads.forEach((t) => expect(t.querySelectorAll('tspan').length, t.textContent).toBe(1));
  });
});

describe('themes and React keys', () => {
  const lum = (hex) => { const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  // The panel tint is the good colour at alpha 0x14 over the card.
  const tint = (good, card) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(good.slice(i, i + 2), 16) * (0x14 / 255) + parseInt(card.slice(i, i + 2), 16) * (1 - 0x14 / 255)).toString(16).padStart(2, '0')).join('');
  it('keeps the words at 4.5:1 on the selected tab, the index and the tinted panel', () => {
    const X = window.__RR_TEST_EXPORTS__.coralReef;
    for (const theme of ['light', 'dark', 'contrast']) {
      const P = X.palette(theme);
      expect(ratio(P.accentInk, P.accent), theme + ' selected tab').toBeGreaterThanOrEqual(4.5);
      expect(ratio(P.text, P.cardAlt), theme + ' tab').toBeGreaterThanOrEqual(4.5);
      expect(ratio(P.text, P.card), theme + ' index').toBeGreaterThanOrEqual(4.5);
      expect(ratio(P.text, tint(P.good, P.card)), theme + ' panel').toBeGreaterThanOrEqual(4.5);
      expect(ratio(P.accent, P.card), theme + ' tick').toBeGreaterThanOrEqual(3);
    }
    const host = science('future', { theme: 'contrast' });
    expect(host.querySelector('.cr-scilab-helps').getAttribute('style')).toContain(X.palette('contrast').good + '14');
  });
  it('raises no React key warnings on the pages it touches', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    TOPICS.forEach((t) => science(t));
    const keyed = err.mock.calls.filter((c) => /unique "key"|same key/.test(String(c[0])));
    err.mockRestore();
    expect(keyed.length).toBe(0);
  });
});

describe('text rules', () => {
  it('has no one-argument strings and no long dashes in the new code', () => {
    const start = SRC.indexOf('// nv8: Reef science frame');
    const end = SRC.indexOf('// nv8 end');
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    const chunk = SRC.slice(start, end);
    expect(/__alloT\('[^']*'\)/.test(chunk)).toBe(false);
    expect(/[–—]/.test(chunk)).toBe(false);
    expect(/=>|`|\blet\b|\bconst\b/.test(chunk)).toBe(false);
  });
});
