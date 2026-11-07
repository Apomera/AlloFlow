import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

// Round 6 page art: Start, Survey methods, For teachers, What helps reefs and
// Tough corals. Every picture is decoration or a drawing of a sum the text
// already states, so it stays hidden from screen readers, the words stay exactly
// as they were, nothing starts WebGL, and the numbers it draws match the text.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const act = React.act;
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
const SRC = fs.readFileSync(TOOL, 'utf8');
const mounted = [];
let renderer, getContext;

beforeEach(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  renderer = vi.fn(function () { throw new Error('WebGL is unavailable'); });
  window.THREE = { stub: true, WebGLRenderer: renderer };
  getContext = vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null);
  loadTool(TOOL, 'coralReef');
});

afterEach(async () => {
  while (mounted.length) {
    const item = mounted.pop();
    await act(async () => item.root.unmount());
    item.host.remove();
  }
  delete window.THREE;
  vi.restoreAllMocks();
});

async function mountTool(seed = {}, theme = 'light') {
  const data = { coralReef: seed };
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const cfg = window.StemLab._registry.coralReef;
  function Shell() {
    const [toolData, setToolData] = React.useState(data);
    return cfg.render({ React, toolData, setToolData, theme, t: (key, fallback) => fallback || key, announceToSR: () => {} });
  }
  await act(async () => { root.render(React.createElement(Shell)); });
  mounted.push({ host, root });
  return host;
}

// Text a person or a screen reader gets: everything outside aria-hidden art.
function readable(el) {
  const copy = el.cloneNode(true);
  copy.querySelectorAll('style,[aria-hidden="true"]').forEach((n) => n.remove());
  return copy.textContent.replace(/\s+/g, ' ');
}
function expectAllArtHidden(host, min) {
  const art = [...host.querySelectorAll('[data-pg-art]')];
  expect(art.length).toBeGreaterThanOrEqual(min);
  art.forEach((el) => {
    expect(el.getAttribute('aria-hidden'), el.getAttribute('data-pg-art')).toBe('true');
    // Decoration has no accessible name of its own and takes no focus.
    expect(el.querySelector('[role="img"],[aria-label],a,button,[tabindex]')).toBe(null);
    el.querySelectorAll('svg').forEach((svg) => expect(svg.getAttribute('focusable')).toBe('false'));
  });
}
function expectModest(host, ids) {
  ids.forEach((id) => {
    const el = host.querySelector('[data-pg-art="' + id + '"]');
    expect(el, id).not.toBe(null);
    const n = (el.tagName.toLowerCase() === 'svg' ? el : el.querySelector('svg')).querySelectorAll('*').length;
    expect(n, id + ' nodes').toBeLessThan(60);
  });
}
function expectNoGl() {
  expect(renderer).not.toHaveBeenCalled();
  const glCalls = getContext.mock.calls.filter((c) => /webgl/i.test(String(c[0])));
  expect(glCalls.length).toBe(0);
}

const HOPE = [
  'Reefs can bounce back. After a 1998 heatwave killed most of its corals, Scott Reef off northwest Australia grew back from 9% to 44% coral cover in 12 years.',
  'People are rebuilding reefs. In Spermonde, Indonesia, reefs blasted into rubble were fixed in place with Reef Stars and planted with corals. Coral cover on the frames rose from about 17% to 56% in four years.',
  'Protection brings fish back. At Apo Island in the Philippines, fish in a small no-take reserve tripled over 18 years, and fishers outside it caught more fish per hour.',
  'Green sea turtles recovered so much, thanks to protected nesting beaches, that in 2025 the IUCN moved them from Endangered to Least Concern.',
  'The biggest help is cutting the greenhouse gases that warm the ocean: fewer and weaker heatwaves give reefs time to recover.'
];

describe('Start page', () => {
  it('gives each reason for hope its own hidden picture and keeps the words', async () => {
    const host = await mountTool({ section: 'hub' });
    const items = [...host.querySelectorAll('.pg-hope > li')];
    expect(items.map((li) => li.querySelector('.pg-hope-text').textContent)).toEqual(HOPE);
    expect(items.map((li) => li.querySelector('[data-pg-art]').getAttribute('data-pg-art'))).toEqual(['regrow', 'stars', 'fish', 'turtle', 'calm']);
    expect(host.querySelector('[data-pg-art="why"]')).not.toBe(null);
    const text = readable(host);
    expect(text.includes('Those numbers show whether a reef is healthy, bleaching, or being taken over by seaweed.')).toBe(true);
    expect(text.includes('The survey reefs are fictional teaching sites.')).toBe(true);
    expectAllArtHidden(host, 6);
    expectModest(host, ['why', 'regrow', 'stars', 'fish', 'turtle', 'calm']);
    expectNoGl();
  });
  it('keeps every SVG id unique', async () => {
    const host = await mountTool({ section: 'hub' });
    const ids = [...host.querySelectorAll('svg [id]')].map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('Survey methods', () => {
  it('draws 18 of 40 points beside the sentence that states them', async () => {
    const host = await mountTool({ section: 'methods' });
    const art = host.querySelector('svg[data-pg-art="cover"]');
    expect(art.getAttribute('data-hit')).toBe('18');
    expect(art.getAttribute('data-total')).toBe('40');
    expect(art.textContent.replace(/\s+/g, '')).toContain('=45%');
    expect(18 / 40 * 100).toBe(45);
    const side = art.parentElement;
    expect(readable(side)).toContain('Eighteen points of live coral out of 40 is 45% live coral cover.');
    expectAllArtHidden(host, 2);
    expectModest(host, ['cover', 'belt']);
    expectNoGl();
  });
  it('draws the belt as 100 squares, 20 m by 5 m, beside the density text', async () => {
    const host = await mountTool({ section: 'methods', w2MethodsPart: 'fish' });
    const art = host.querySelector('svg[data-pg-art="belt"]');
    expect(art.getAttribute('data-squares')).toBe('100');
    const labels = [...art.querySelectorAll('text')].map((t) => t.textContent);
    expect(labels).toContain('20 m');
    expect(labels).toContain('5 m');
    expect(readable(art.parentElement)).toContain('Because one belt covers exactly 100 square meters, the count and the density are the same number here.');
    expect(readable(host)).toContain('The belt is 20 m long and 5 m wide, so it covers 100 square meters.');
  });
});

describe('For teachers', () => {
  it('draws a timeline whose widths are the minutes the text gives', async () => {
    const host = await mountTool({ section: 'teacher' });
    const line = host.querySelector('[data-pg-art="timeline"]');
    expect(line.getAttribute('aria-hidden')).toBe('true');
    const segs = [...line.querySelectorAll('.pg-tseg')];
    const steps = [...host.querySelectorAll('[data-w2-tstep]')];
    expect(segs.length).toBe(steps.length);
    expect(segs.length).toBe(6);
    steps.forEach((li, i) => {
      const said = /About (\d+) minutes/.exec(li.querySelector('.w2-ttime').textContent);
      expect(said, li.getAttribute('data-w2-tstep')).not.toBe(null);
      expect(segs[i].getAttribute('data-min')).toBe(said[1]);
      expect(String(segs[i].style.flexGrow)).toBe(said[1]);
    });
    expectAllArtHidden(host, 1);
    expectNoGl();
  });
  it('still lists every step, with its time, its goal and its button', async () => {
    const host = await mountTool({ section: 'teacher' });
    const flow = host.querySelector('ol.cr-teacher-flow');
    expect(flow.classList.contains('pg-trail')).toBe(true);
    const text = readable(flow);
    ['About 40 minutes', 'About 25 minutes', 'About 45 minutes (about 10 minutes per transect)', 'About 30 minutes', 'About 45 minutes', 'MS-ESS3-3', 'Open Reef future'].forEach((t) => expect(text.includes(t), t).toBe(true));
  });
});

describe('Reef science cards', () => {
  const CARDS = ['stars', 'garden', 'reserves', 'water', 'larvae', 'structures', 'biorock', 'fragile', 'restore', 'forms', 'warming', 'symbiosis', 'bleaching', 'return', 'grazers', 'acid'];
  it('puts one hidden picture beside each help and future card, and none on the others', async () => {
    const host = await mountTool({ section: 'science', sciTopic: 'help' });
    expectAllArtHidden(host, CARDS.length);
    expect([...host.querySelectorAll('[data-pg-art]')].map((n) => n.getAttribute('data-pg-art')).sort()).toEqual(CARDS.map((c) => 'card-' + c).sort());
    expectModest(host, CARDS.map((c) => 'card-' + c));
    host.querySelectorAll('.cr-help-card').forEach((card) => {
      expect(card.querySelector('.cr-sci-text [data-pg-art]'), card.getAttribute('data-help')).not.toBe(null);
      expect(card.querySelector('figure svg[data-figure]'), card.getAttribute('data-help')).not.toBe(null);
    });
    expectNoGl();
  });
  it('leaves the words of the cards alone', async () => {
    const host = await mountTool({ section: 'science', sciTopic: 'help' });
    const stars = host.querySelector('[data-help="stars"] .cr-sci-text');
    expect(readable(stars)).toContain('coral cover on the frames rose from about 17% to about 56% in four years');
    expect(stars.querySelector('[data-pg-art]').textContent).toBe('');
  });
  it('keeps the picture off phones, where it would only add length', () => {
    expect(SRC.includes("@media(max-width:820px){[data-coralreef-root] .pg-text>.pg-art{display:none}}")).toBe(true);
  });
});

describe('all themes', () => {
  it('renders every page in dark and contrast without WebGL', async () => {
    for (const theme of ['dark', 'contrast']) {
      for (const seed of [{ section: 'hub' }, { section: 'methods' }, { section: 'teacher' }, { section: 'science', sciTopic: 'future' }]) {
        const host = await mountTool(seed, theme);
        expect(host.querySelector('[data-pg-art]'), theme + ' ' + seed.section).not.toBe(null);
      }
    }
    expectNoGl();
  });
  it('hides the art under forced colors and pins nothing that moves', () => {
    expect(SRC.includes('@media(forced-colors:active){[data-coralreef-root] .pg-art{display:none!important}')).toBe(true);
    expect(SRC.includes('@media(forced-colors:active){[data-coralreef-root] .pg-mside>svg{display:none}}')).toBe(true);
    expect(SRC.includes('@media(forced-colors:active){[data-coralreef-root] .pg-tline{display:none}')).toBe(true);
    // No animation anywhere in the page art.
    const start = SRC.indexOf('// ── Page art (round 6)');
    const end = SRC.indexOf('var SV_HUB_CSS = [');
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
    const chunk = SRC.slice(start, end);
    expect(/animation|@keyframes|<animate|transition/.test(chunk)).toBe(false);
    expect(/WebGLRenderer|getContext/.test(chunk)).toBe(false);
  });
});
