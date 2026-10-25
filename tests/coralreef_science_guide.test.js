import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab, renderTool, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

// Rendering every science and help figure in three themes takes several seconds on a busy machine.
vi.setConfig({ testTimeout: 60000 });

// Lane C: the reef science figures, the teacher sequence, and the species
// guide's search, group jump bar, compact cards and look-alike chips.

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const act = React.act;
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
const SOURCE = readFileSync(TOOL, 'utf8');
const mounted = [];
let X;

beforeEach(() => { resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool(TOOL, 'coralReef'); X = window.__RR_TEST_EXPORTS__.coralReef; });
afterEach(async () => {
  while (mounted.length) { const m = mounted.pop(); await act(async () => m.root.unmount()); m.host.remove(); }
});

function dom(html) { const host = document.createElement('div'); host.innerHTML = html; return host; }

async function mountTool(seed = {}) {
  let data = { coralReef: { section: 'guide', ...seed } };
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const cfg = window.StemLab._registry.coralReef;
  const announcements = [];
  function Shell() {
    const [toolData, setToolData] = React.useState(data);
    data = toolData;
    return cfg.render({ React, toolData, setToolData, t: (key, fallback) => fallback || key, announceToSR: (m) => announcements.push(m) });
  }
  const item = { host, root, announcements, get data() { return data; } };
  mounted.push(item);
  await act(async () => root.render(React.createElement(Shell)));
  return item;
}
async function type(input, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  await act(async () => { setter.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); });
}
async function click(node) { await act(async () => { node.click(); await Promise.resolve(); }); }
const shownCards = (host) => [...host.querySelectorAll('li[data-species]')].map((li) => li.getAttribute('data-species'));
const searchBox = (host) => host.querySelector('input[type="search"]');

// What each figure must say, and the card's own text must say it too, so a
// figure never shows a number its card does not.
const FIGURE_FACTS = {
  symbiosis: [/sunlight/i, /food/i, /algae/i],
  bleaching: [/\b3\b/, /\b8\b/, /two thirds/, /eight months/, /2016/, /alive/],
  return: [/25 to 30/, /about 6 years/, /10 to 15 years/],
  grazers: [/Bahamas/, /quarter/, /parrotfish/, /nutrients/i],
  acid: [/4\.2/, /3\.5/, /2010/, /15%/, /\b1\b/],
  forms: [/Okinawa/, /1998/, /boulder/i, /encrusting/i, /branch/i, /can die too/],
  warming: [/70 to 90%/, /1\.5 degrees C/, /99%/, /2 degrees C/, /\(?high confidence/, /very high confidence/],
  restore: [/100 square meters/, /60 to 70%/]
};
// Numbers the reader must be able to see in the drawing itself.
const FIGURE_VISIBLE = { bleaching: ['3 DHW', '8 DHW', 'two thirds'], return: ['25 to 30', 'about 6 years', '10 to 15'], grazers: ['twice', '1/4'], acid: ['4.2', '3.5', '100%'], warming: ['70 to 90%', '99%'], restore: ['100 square meters', '60 to 70%', '6 to 7'] };

describe('reef science figures', () => {
  it('gives every science card one figure whose label states the card\'s numbers', () => {
    const host = dom(renderTool('coralReef', { coralReef: { section: 'science' } }));
    const cards = [...host.querySelectorAll('section.cr-sci-card')];
    expect(cards.map((c) => c.querySelector('svg[data-figure]')?.getAttribute('data-figure'))).toEqual(Object.keys(FIGURE_FACTS));
    for (const card of cards) {
      const svgs = card.querySelectorAll('svg[role="img"]');
      expect(svgs.length, card.textContent.slice(0, 40)).toBe(1);
      const svg = svgs[0], id = svg.getAttribute('data-figure'), label = svg.getAttribute('aria-label') || '';
      const text = card.querySelector('.cr-sci-text').textContent;
      expect(label.length, id + ' label').toBeGreaterThan(80);
      expect(svg.getAttribute('focusable')).toBe('false');
      for (const fact of FIGURE_FACTS[id]) {
        expect(fact.test(label), id + ' figure label says ' + fact).toBe(true);
        expect(fact.test(text), id + ' card text says ' + fact).toBe(true);
      }
      const visible = [...svg.querySelectorAll('tspan')].map((t) => t.textContent).join(' ');
      for (const shown of FIGURE_VISIBLE[id] || []) expect(visible.includes(shown), id + ' shows ' + shown).toBe(true);
    }
  });

  it('keeps figure text readable on a phone and inked from the theme palette', () => {
    for (const theme of ['light', 'dark', 'contrast']) {
      const P = X.palette(theme);
      const host = dom(renderTool('coralReef', { coralReef: { section: 'science' } }, { theme }));
      const texts = [...host.querySelectorAll('svg[data-figure] text')];
      expect(texts.length).toBeGreaterThan(60);
      for (const t of texts) {
        const where = theme + ' ' + t.closest('svg').getAttribute('data-figure') + ' "' + t.textContent + '"';
        // 320 unit viewBox shown at 290 px or more: 13.5 units is 12 px or more.
        expect(Number(t.getAttribute('font-size')), where).toBeGreaterThanOrEqual(13.5);
        expect(t.closest('svg').getAttribute('viewBox')).toMatch(/^0 0 320 \d+$/);
        // Every label sits on the card, so its ink must be a palette text ink.
        expect([P.text, P.muted, P.good, P.bad], where).toContain(t.getAttribute('fill'));
      }
    }
  });
});

describe('teacher sequence', () => {
  const names = {};
  for (const m of SOURCE.matchAll(/__alloT\('stem\.coralreef\.scn_([a-z]+)', '((?:[^'\\]|\\.)*)'\)/g)) names[m[1]] = m[2];

  it('starts with the dive and the guide, and names every model scenario', () => {
    const host = dom(renderTool('coralReef', { coralReef: { section: 'teacher' } }));
    const steps = [...host.querySelectorAll('ol.cr-teacher-flow > li')];
    expect(steps.length).toBe(5);
    expect(steps[0].textContent).toMatch(/^Dive and identify/);
    expect(steps[0].textContent).toMatch(/species guide/);
    for (const site of ['healthy', 'heatwave', 'damaged', 'restoration']) expect(steps[0].textContent, site).toContain(site);
    const last = steps[steps.length - 1];
    expect(X.SCENARIOS.length).toBe(5);
    expect(last.textContent).toContain('run all ' + X.SCENARIOS.length + ' scenarios');
    const listed = [...last.querySelectorAll('ul > li')].map((li) => li.textContent);
    expect(listed).toEqual(X.SCENARIOS.map((s) => names[s.id]));
    expect(host.textContent).not.toMatch(/four scenarios/);
    expect(host.textContent).toMatch(/studies have not found that Reef Balls help young corals/);
  });
});

describe('species guide navigation', () => {
  it('has a jump target and found count for every group', () => {
    const log = { clownfish: {}, blue_tang: {}, brain_coral: {} };
    const host = dom(renderTool('coralReef', { coralReef: { section: 'guide', speciesLog: log } }));
    const jump = host.querySelector('nav.cr-guide-jump');
    expect(jump).toBeTruthy();
    for (const g of ['fish', 'reptile', 'invertebrate', 'coral', 'structure']) {
      const n = X.SPECIES_META.filter((m) => m.group === g).length, found = X.SPECIES_META.filter((m) => m.group === g && log[m.id]).length;
      const chip = jump.querySelector('button[data-jump="' + g + '"]');
      expect(chip, g).toBeTruthy();
      expect(chip.textContent, g).toContain(found + ' of ' + n + ' found');
      const section = host.querySelector('section[data-group="' + g + '"]');
      expect(section, g + ' section').toBeTruthy();
      expect(section.querySelector('h3').getAttribute('tabindex')).toBe('-1');
      expect(section.querySelectorAll('li[data-species]').length).toBe(n);
    }
  });

  it('jumps to a group heading and moves focus there', async () => {
    const t = await mountTool();
    await click(t.host.querySelector('button[data-jump="coral"]'));
    expect(document.activeElement.tagName).toBe('H3');
    expect(document.activeElement.textContent).toBe('Corals');
    expect(document.activeElement.closest('section').getAttribute('data-group')).toBe('coral');
  });

  it('filters cards by common or scientific name and announces the count', async () => {
    const t = await mountTool();
    expect(shownCards(t.host)).toHaveLength(X.SPECIES_META.length);
    const label = t.host.querySelector('label[for="' + searchBox(t.host).id + '"]');
    expect(label.textContent).toBe('Find a species by name');
    await type(searchBox(t.host), 'parrot');
    expect(shownCards(t.host)).toEqual(['parrotfish', 'bumphead_parrotfish']);
    expect(t.host.textContent).toContain(`Showing 2 of ${X.SPECIES_META.length}.`);
    await act(async () => { await new Promise((r) => setTimeout(r, 750)); });
    expect(t.announcements).toContain(`Showing 2 of ${X.SPECIES_META.length}.`);
    await type(searchBox(t.host), 'chelonia');
    expect(shownCards(t.host)).toEqual(['green_turtle']);
    await type(searchBox(t.host), '  BLUE   Tang ');
    expect(shownCards(t.host)).toEqual(['blue_tang']);
    await type(searchBox(t.host), 'bleekers');
    expect(shownCards(t.host)).toEqual(['parrotfish']);
    await type(searchBox(t.host), 'acropora');
    expect(shownCards(t.host)).toEqual(['staghorn_coral', 'table_coral']);
    // Groups with nothing to show cannot be jumped to.
    expect(t.host.querySelector('button[data-jump="fish"]').disabled).toBe(true);
    expect(t.host.querySelector('button[data-jump="coral"]').disabled).toBe(false);
    await type(searchBox(t.host), 'zzzz');
    expect(shownCards(t.host)).toEqual([]);
    expect(t.host.textContent).toContain('No species match that name.');
    await click([...t.host.querySelectorAll('button')].find((b) => b.textContent === 'Clear search'));
    expect(shownCards(t.host)).toHaveLength(X.SPECIES_META.length);
    expect(document.activeElement).toBe(searchBox(t.host));
  });

  it('look-alike chips point at real cards and take you to them', async () => {
    const t = await mountTool();
    const chips = [...t.host.querySelectorAll('[data-lookalike]')];
    const expected = X.SPECIES_META.reduce((n, m) => n + m.lookalikes.length, 0);
    expect(expected).toBeGreaterThan(20);
    expect(chips).toHaveLength(expected);
    for (const chip of chips) {
      const id = chip.getAttribute('data-lookalike'), from = chip.closest('li[data-species]').getAttribute('data-species');
      expect(X.SPECIES_META.find((m) => m.id === from).lookalikes).toContain(id);
      expect(t.host.querySelector('li[data-species="' + id + '"]'), from + ' -> ' + id).toBeTruthy();
      expect(chip.getAttribute('aria-label')).toContain(chip.textContent);
    }
    await click(t.host.querySelector('li[data-species="bumphead_parrotfish"] [data-lookalike="humphead_wrasse"]'));
    expect(document.activeElement.closest('li[data-species]').getAttribute('data-species')).toBe('humphead_wrasse');
    expect(document.activeElement.textContent).toMatch(/^Humphead wrasse/);
    // A look-alike hidden by the search or the filter is still reachable.
    await type(searchBox(t.host), 'sea fan');
    expect(shownCards(t.host)).toEqual(['sea_fan']);
    await click(t.host.querySelector('li[data-species="sea_fan"] [data-lookalike="soft_coral"]'));
    expect(searchBox(t.host).value).toBe('');
    expect(document.activeElement.closest('li[data-species]').getAttribute('data-species')).toBe('soft_coral');
  });

  it('reaches a look-alike that the found filter hides', async () => {
    const t = await mountTool({ guideFilter: 'found', speciesLog: { moorish_idol: {} } });
    expect(shownCards(t.host)).toEqual(['moorish_idol']);
    await click(t.host.querySelector('[data-lookalike="threadfin_butterflyfish"]'));
    expect(t.data.coralReef.guideFilter).toBe('all');
    expect(document.activeElement.closest('li[data-species]').getAttribute('data-species')).toBe('threadfin_butterflyfish');
  });

  it('compact cards keep portraits and field marks but drop the longer text', async () => {
    const t = await mountTool();
    const total = X.SPECIES_META.length;
    expect(t.host.textContent.match(/Did you know\?/g)).toHaveLength(total);
    const toggle = [...t.host.querySelectorAll('button')].find((b) => b.textContent === 'Compact cards');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    await click(toggle);
    expect(t.data.coralReef.guideCompact).toBe(true);
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(t.host.textContent).not.toContain('Did you know?');
    expect(t.host.textContent).not.toContain('Lives among the stinging tentacles');
    expect(t.host.querySelectorAll('img')).toHaveLength(total);
    expect(t.host.textContent.match(/Field marks/g).length).toBeGreaterThan(40);
    expect(t.host.textContent).toContain('Bright orange body with three white bands');
    expect(t.host.querySelectorAll('[data-lookalike]').length).toBeGreaterThan(20);
  });
});

// "What helps reefs": each help card gets a figure built from its own text.
const HELP_FACTS = {
  stars: [/3%/, /17 years/, /17%/, /56%/, /four years/i, /branching/, /sand-coated steel Reef Stars/],
  garden: [/two out of three/, /classroom or two/, /nurser/],
  reserves: [/five times/, /large fish/, /seaweed/, /cannot stop bleaching/, /bounce back/],
  water: [/cleaner water/, /recovered faster/, /crown-of-thorns/, /early and thoroughly/, /rose instead of falling/],
  larvae: [/millions/, /net tents/, /about 220/, /two to three years/, /spawn/, /Most died/],
  structures: [/Reef Balls?/, /shipwreck/i, /new fish/, /nearby/, /young corals survive or grow better/],
  biorock: [/electric current/, /grow faster/, /survive heat better/, /Australia, Kenya and the Philippines/, /no lasting benefit/, /harm/, /fair tests/],
  fragile: [/2022/, /36 years/, /branching and table corals/, /2024/, /largest one-year drops on record/, /heatwaves ease/]
};
const HELP_VISIBLE = { stars: ['3%', '17%', '56%', '17 years'], garden: ['2 of 3', 'classroom or two'], reserves: ['about 5 times', 'cannot stop bleaching'], water: ['recovered faster', 'coral rose', 'coral falls'],
  larvae: ['about 220', 'Two to three', 'most died'], structures: ['Reef Ball', 'Shipwreck', 'Still being studied', 'no better survival'], biorock: ['no lasting benefit', 'harm', 'fair tests', 'without it'], fragile: ['2022', '2024', '36 years', 'largest one-year drops'] };
const visibleText = (svg) => [...svg.querySelectorAll('tspan')].map((t) => t.textContent).join(' ');

describe('what helps reefs figures', () => {
  it('gives every help card one figure that shows and states its own facts', () => {
    const host = dom(renderTool('coralReef', { coralReef: { section: 'science' } }));
    const cards = [...host.querySelectorAll('section.cr-help-card')];
    expect(cards.map((c) => c.getAttribute('data-help'))).toEqual(Object.keys(HELP_FACTS));
    for (const card of cards) {
      const id = card.getAttribute('data-help'), svgs = card.querySelectorAll('svg[role="img"]');
      expect(svgs.length, id).toBe(1);
      const svg = svgs[0], label = svg.getAttribute('aria-label') || '', text = card.querySelector('.cr-sci-text').textContent;
      expect(svg.getAttribute('data-figure')).toBe('help-' + id);
      expect(label.length, id).toBeGreaterThan(120);
      for (const fact of HELP_FACTS[id]) {
        expect(fact.test(label), id + ' figure label says ' + fact).toBe(true);
        expect(fact.test(text), id + ' card text says ' + fact).toBe(true);
      }
      for (const shown of HELP_VISIBLE[id]) expect(visibleText(svg).includes(shown), id + ' shows ' + shown).toBe(true);
    }
  });

  it('grows a figure to fit a longer translation instead of overlapping its labels', () => {
    const height = (html, id) => Number(dom(html).querySelector('svg[data-figure="help-' + id + '"]').getAttribute('viewBox').split(' ')[3]);
    const long = (k, f) => (/^stem\.coralreef\.fig_h[a-z]_/.test(k) ? f + ' ' + f + ' ' + f : f);
    const base = renderTool('coralReef', { coralReef: { section: 'science' } });
    const wide = renderTool('coralReef', { coralReef: { section: 'science' } }, { t: long });
    for (const id of Object.keys(HELP_FACTS)) {
      expect(height(wide, id), id).toBeGreaterThan(height(base, id) + 30);
      // Nothing is pushed above the top edge either.
      const ys = [...dom(wide).querySelectorAll('svg[data-figure="help-' + id + '"] text')].map((t) => Number(t.getAttribute('y')));
      expect(Math.min(...ys), id + ' top label').toBeGreaterThanOrEqual(12);
    }
    // Each caption line in the larvae figure starts below the one before it.
    const svg = dom(wide).querySelector('svg[data-figure="help-larvae"]');
    const column = [...svg.querySelectorAll('text[x="48"]')].map((t) => Number(t.getAttribute('y')));
    const lines = [...svg.querySelectorAll('text[x="48"]')].map((t) => t.querySelectorAll('tspan').length);
    for (let i = 1; i < column.length; i++) expect(column[i], 'caption ' + i).toBeGreaterThanOrEqual(column[i - 1] + lines[i - 1] * 16);
  });
});
