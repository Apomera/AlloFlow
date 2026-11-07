import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

// Round 7, lane guide: guide pictures fill frames of their own shape (no dark bars and no crop),
// the landing panel and group headers carry real pictures and identity, and the Red List line is a
// chip whose colour follows the category. Facts, text and saved data stay as they were.
vi.setConfig({ testTimeout: 120000 });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const act = React.act;
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
const SOURCE = readFileSync(TOOL, 'utf8');
const mounted = [];
let X, TX, renderers;

beforeEach(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  renderers = [];
  class FakeRenderer { constructor() { renderers.push(this); } setPixelRatio() {} setSize() {} render() {} dispose() {} forceContextLoss() {} }
  window.THREE = { WebGLRenderer: FakeRenderer, stub: true };
  window.Reef3DSpecies = { version: '1.0.0', create: () => ({}) };
  window.Reef3DExplore = { version: '1.0.0', mount: vi.fn(() => ({ dispose() {}, setInput() {}, resize() {}, getState: () => ({}) })) };
  loadTool(TOOL, 'coralReef');
  X = window.__RR_TEST_EXPORTS__.coralReef;
  TX = X.speciesText((k, f) => f);
});
afterEach(async () => {
  while (mounted.length) { const item = mounted.pop(); await act(async () => item.root.unmount()); item.host.remove(); }
  delete window.Reef3DExplore; delete window.Reef3DSpecies; delete window.THREE;
  vi.restoreAllMocks();
});
async function mountTool(seed = {}) {
  let data = { coralReef: { section: 'guide', ...seed } };
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const cfg = window.StemLab._registry.coralReef;
  function Shell() {
    const [toolData, setToolData] = React.useState(data);
    data = toolData;
    return cfg.render({ React, toolData, setToolData, t: (key, fallback) => fallback || key, announceToSR() {} });
  }
  const item = { host, root, get data() { return data; } };
  mounted.push(item);
  await act(async () => root.render(React.createElement(Shell)));
  return item;
}
const click = async (el) => { expect(el, 'control exists').toBeTruthy(); await act(async () => { el.click(); await Promise.resolve(); }); };

// One CSS rule body from the tool source, for an exact selector.
function rule(selector) {
  const needle = '[data-coralreef-root] ' + selector + '{';
  const at = SOURCE.indexOf(needle);
  expect(at, 'rule exists: ' + selector).toBeGreaterThanOrEqual(0);
  return SOURCE.slice(at + needle.length, SOURCE.indexOf('}', at));
}
const OWN_SHAPE = 'aspect-ratio:960/630';
const lum = (hex) => {
  const v = hex.replace('#', ''), f = v.length === 3 ? v.split('').map((c) => c + c).join('') : v;
  const c = [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

describe('every species picture fills a frame of its own shape', () => {
  // [img selector, frame selector or null when the img sets its own shape]
  const FRAMES = [
    ['.crds-guide .cr-species-art img', '.crds-guide .cr-species-art'],
    ['.crrc-art img', '.crrc-art'],
    ['.cr-dxp-picture-stage img', '.cr-dxp-picture-stage'],
    ['.crst-stage img', '.crst-stage'],
    ['.cr-dxp-portrait img', null],
    ['.cr-dxp-pair-cards img', null],
    ['.cr-dxp-review>li>img', null],
    ['.cr-dxp-candidates figure img', null],
    ['.crdx-art img', null],
    ['.crdx-related img', null],
    ['.crob-portrait img', null],
    ['.crcmp-art img', null],
  ];
  for (const [img, frame] of FRAMES) {
    it(img, () => {
      const pic = rule(img);
      expect(pic, 'no letterboxing').not.toContain('object-fit:contain');
      expect(pic, 'no fixed picture height').not.toMatch(/(^|;)height:(clamp|\d+px)/);
      expect(pic, 'no height cap that would letterbox').not.toContain('max-height:3');
      expect(frame ? rule(frame) : pic, 'takes the shape of the 960x630 picture').toContain(OWN_SHAPE);
      if (frame) expect(pic, 'fills the frame').toMatch(/height:100%/);
    });
  }
  it('the small frames do not keep their old squarer shapes', () => {
    expect(rule('.cr-dxp-recap-portrait')).toContain(OWN_SHAPE);
    expect(SOURCE, 'profile connection picture: 88 wide needs 58 tall').toMatch(/crdx-connection-art', 'aria-hidden': 'true', style: \{ flex: '0 0 88px', height: 58,/);
  });
  it('no phone rule brings a fixed picture height back', () => {
    for (const old of ['.crcmp-art img{height:', '.crrc-art img{height:', '.crst-stage img{height:', '.crob-portrait img{height:', '.cr-dxp-candidates figure img{height:', '.cr-dxp-guess-pair figure img{height:', 'cr-species-art img{height:']) {
      expect(SOURCE.includes(old), old).toBe(false);
    }
  });
  it('a loading guide card holds the final size: the frame has the shape, the picture does not add height', async () => {
    expect(rule('.crds-guide .cr-species-art')).toContain('min-height:0');
    expect(rule('.crds-guide .cr-species-art img')).toContain('position:absolute');
    const t = await mountTool({ guidePictures: true });
    const art = t.host.querySelector('[data-species="clownfish"] .cr-species-art');
    expect(art.querySelector('small'), 'Drawing the picture... lives in the same frame').toBeTruthy();
    expect(art.querySelector('img')).toBeNull();
  });
  it('a portrait states its real size, so the browser reserves the right space before it loads', async () => {
    const t = await mountTool({ guideSpeciesId: 'clownfish' });
    const img = t.host.querySelector('.crdx-art img');
    expect([img.getAttribute('width'), img.getAttribute('height')]).toEqual(['960', '630']);
  });
});

describe('the landing panel', () => {
  it('shows real species pictures, decorative and lazy, inside the hero', async () => {
    const t = await mountTool();
    const strip = t.host.querySelector('.crdx-hero [data-guide-strip]');
    expect(strip).toBeTruthy();
    expect(strip.getAttribute('aria-hidden')).toBe('true');
    const imgs = [...strip.querySelectorAll('img')];
    expect(imgs.length).toBeGreaterThanOrEqual(3);
    for (const img of imgs) {
      expect(img.getAttribute('alt')).toBe('');
      expect(img.getAttribute('loading')).toBe('lazy');
      expect(img.getAttribute('src')).toMatch(/assets\/coralreef\/species\/[a-z_]+\.webp/);
    }
    for (const id of imgs.map((i) => i.getAttribute('src').match(/species\/([a-z_]+)\.webp/)[1])) expect(X.SPECIES_META.some((m) => m.id === id), id).toBe(true);
  });
  it('a missing picture never starts a renderer', async () => {
    const t = await mountTool();
    const img = t.host.querySelector('[data-guide-strip] img');
    await act(async () => { img.dispatchEvent(new Event('error')); await new Promise((r) => setTimeout(r, 30)); });
    expect(renderers).toHaveLength(0);
  });
  it('the species log numbers are still computed', async () => {
    const t = await mountTool({ speciesLog: { clownfish: { firstSeen: 1 }, blue_tang: { firstSeen: 2 } }, speciesBookmarks: { clownfish: true } });
    const box = t.host.querySelector('.crds-summary');
    const living = X.SPECIES_META.filter((m) => m.group !== 'structure').length;
    expect(box.textContent).toContain('Species log: 2 of ' + living + ' found.');
    const dd = [...box.querySelectorAll('dd')].map((d) => d.textContent);
    expect(dd).toEqual([String(X.SPECIES_META.length), '1']);
  });
});

describe('group headers', () => {
  it('each group has an icon, its name as the heading, and a computed found count', async () => {
    const log = { clownfish: { firstSeen: 1 }, green_turtle: { firstSeen: 1 } };
    const t = await mountTool({ speciesLog: log });
    const names = { fish: 'Fish', reptile: 'Sea turtles and sea snakes', invertebrate: 'Invertebrates and sponges', coral: 'Corals', structure: 'Restoration structures' };
    for (const g of Object.keys(names)) {
      const head = t.host.querySelector('[data-group="' + g + '"]');
      expect(head.querySelector('.crds-group-icon'), g).toBeTruthy();
      expect(head.querySelector(':scope > h3').textContent).toBe(names[g]);
      expect(head.querySelector('.crds-group-icon svg')).toBeTruthy();
      expect(head.querySelector('.crds-group-icon').getAttribute('aria-hidden')).toBe('true');
      const all = X.SPECIES_META.filter((m) => m.group === g), found = all.filter((m) => log[m.id]).length;
      expect(head.querySelector('.crds-group-count').textContent).toBe(found + ' of ' + all.length + ' found');
    }
  });
  it('Jump to a group still moves focus to the group heading', async () => {
    const t = await mountTool();
    await click(t.host.querySelector('[data-jump="coral"]'));
    expect(document.activeElement.tagName).toBe('H3');
    expect(document.activeElement.textContent).toBe('Corals');
  });
  it('white text is readable over every group colour', () => {
    const css = rule('.cr-guide-group[data-group=fish]');
    expect(css).toMatch(/--crds-group:#/);
    for (const g of ['fish', 'reptile', 'invertebrate', 'coral', 'structure']) {
      const c = rule('.cr-guide-group[data-group=' + g + ']').match(/--crds-group:(#[0-9a-f]+)/)[1];
      expect(ratio('#ffffff', c), g + ' ' + c).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('the Red List chip', () => {
  it('shows the same words, category and year as the data, for every entry, with no second copy', async () => {
    const IU = { LC: 'Least Concern', NT: 'Near Threatened', VU: 'Vulnerable', EN: 'Endangered', CR: 'Critically Endangered', DD: 'Data Deficient', NE: 'Not Evaluated' };
    const t = await mountTool();
    for (const m of X.SPECIES_META) {
      const card = t.host.querySelector('[data-species="' + m.id + '"]');
      const chips = card.querySelectorAll('.cr-iucn');
      if (!m.iucn) { expect(chips.length, m.id).toBe(0); continue; }
      expect(chips.length, m.id).toBe(1);
      const chip = chips[0];
      expect(chip.getAttribute('data-iucn')).toBe(m.iucn);
      const words = 'IUCN Red List: ' + IU[m.iucn] + (m.iucnYear ? ' (' + m.iucnYear + ')' : '');
      expect(chip.textContent, m.id).toContain(words);
      expect(card.textContent.split('IUCN Red List:').length - 1, m.id + ' one line only').toBe(1);
      expect(chip.querySelector('.cr-iucn-code').getAttribute('aria-hidden')).toBe('true');
    }
  });
  it('every category colour keeps its code readable', () => {
    const fg = { CR: '#fff' };
    for (const code of ['LC', 'NT', 'VU', 'EN', 'CR', 'NE']) {
      const body = rule('.cr-iucn[data-iucn=' + code + '] .cr-iucn-code');
      const bg = body.match(/background:(#[0-9a-f]+)/)[1];
      expect(ratio(fg[code] || '#141414', bg), code).toBeGreaterThanOrEqual(4.5);
    }
    expect(ratio('#141414', rule('.cr-iucn-code').match(/background:(#[0-9a-f]+)/)[1]), 'default (DD)').toBeGreaterThanOrEqual(4.5);
  });
  it('the profile uses the same chip', async () => {
    const t = await mountTool({ guideSpeciesId: 'green_turtle' });
    const chip = t.host.querySelector('.crdx-badges .cr-iucn');
    expect(chip).toBeTruthy();
    expect(chip.getAttribute('data-iucn')).toBe(X.SPECIES_META.find((m) => m.id === 'green_turtle').iucn);
  });
});

describe('no words were lost from the cards', () => {
  it('full cards keep marks, role and fact; compact cards keep the marks', async () => {
    const t = await mountTool();
    for (const m of X.SPECIES_META) {
      const card = t.host.querySelector('[data-species="' + m.id + '"]').textContent, tx = TX[m.id];
      for (const k of tx.marks) expect(card, m.id).toContain(k);
      expect(card, m.id).toContain(tx.role);
      expect(card, m.id).toContain(tx.fact);
      expect(card, m.id).toContain('Field marks');
      expect(card, m.id).toContain('Did you know?');
    }
    const c = await mountTool({ guideCompact: true });
    for (const m of X.SPECIES_META.slice(0, 12)) {
      const card = c.host.querySelector('[data-species="' + m.id + '"]').textContent;
      for (const k of TX[m.id].marks) expect(card, m.id).toContain(k);
      expect(card, m.id).not.toContain(TX[m.id].fact);
    }
  });
  it('a found species is still marked with the words, not only a colour', async () => {
    const t = await mountTool({ speciesLog: { clownfish: { firstSeen: 1 } } });
    expect(t.host.querySelector('[data-species="clownfish"] .cr-sp-name').textContent).toMatch(/✓ Found$/);
    expect(t.host.querySelector('[data-species="blue_tang"] .cr-sp-name').textContent).not.toContain('Found');
  });
});

describe('practice setup', () => {
  it('shows pictures from the chosen collection, and none for a pair', async () => {
    const t = await mountTool();
    await click(t.host.querySelector('[data-start-practice]'));
    const strip = t.host.querySelector('[data-marine-practice="setup"] [data-guide-strip]');
    expect(strip, 'mixed collection').toBeTruthy();
    expect(strip.getAttribute('aria-hidden')).toBe('true');
    expect(strip.querySelectorAll('img').length).toBe(6);
    expect(renderers).toHaveLength(0);
  });
});

describe('opening a profile or the guide starts no renderer', () => {
  it('stays at zero through landing, profile and back', async () => {
    const t = await mountTool();
    await act(async () => { await new Promise((r) => setTimeout(r, 30)); });
    await click(t.host.querySelector('[data-open-profile="brain_coral"]'));
    await act(async () => { await new Promise((r) => setTimeout(r, 30)); });
    expect(renderers).toHaveLength(0);
  });
});

