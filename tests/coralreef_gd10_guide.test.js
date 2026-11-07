import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import path from 'node:path';
import { readFileSync } from 'node:fs';

// Lane gd10: the species guide on a phone. A picture grid and a short search area are the
// default at narrow widths, a saved choice always wins, the default is never saved, and
// nothing a student could reach before has gone: field marks are one tap away.

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
const SOURCE = readFileSync(TOOL, 'utf8');
let loadTool, resetStemLab, React, ReactDOMClient, X, TX;
beforeAll(async () => {
  const mod = await import(/* @vite-ignore */ 'file:///' + path.resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js').replace(/\\/g, '/'));
  ({ loadTool, resetStemLab, React, ReactDOMClient } = mod);
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool(TOOL, 'coralReef');
  X = window.__RR_TEST_EXPORTS__.coralReef; TX = X.speciesText((k, f) => f);
});

// A screen of a chosen width. Only the guide's own query answers; reduced motion stays off.
let listeners, screenNarrow;
function setScreen(narrow) {
  screenNarrow = narrow; listeners = [];
  window.matchMedia = (query) => {
    const isWidth = /max-width/.test(query);
    return { media: query, get matches() { return isWidth ? screenNarrow : false; },
      addEventListener: (_, fn) => { if (isWidth) listeners.push(fn); }, removeEventListener: (_, fn) => { listeners = listeners.filter((f) => f !== fn); } };
  };
}
const mounted = [];
beforeEach(() => { Element.prototype.scrollIntoView = vi.fn(); });
afterEach(async () => {
  while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); }
  delete window.matchMedia; delete Element.prototype.scrollIntoView;
});
async function mount(seed = {}) {
  let data = { coralReef: { section: 'guide', ...seed } };
  const writes = [];
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const cfg = window.StemLab._registry.coralReef;
  function Shell() {
    const [toolData, setToolData] = React.useState(data);
    data = toolData;
    return cfg.render({ React, toolData, setToolData: (next) => { writes.push(next); setToolData(next); }, t: (k, f) => f || k, announceToSR() {} });
  }
  const t = { host, root, writes, get data() { return data.coralReef; } };
  mounted.push(t);
  await React.act(async () => root.render(React.createElement(Shell)));
  return t;
}
const q = (t, s) => t.host.querySelector(s);
const qa = (t, s) => [...t.host.querySelectorAll(s)];
const settle = () => React.act(async () => { await new Promise((r) => setTimeout(r, 5)); });
async function click(el) { expect(el, 'control exists').toBeTruthy(); await React.act(async () => { el.focus(); el.click(); await Promise.resolve(); }); await settle(); }
async function choose(el, value) {
  const set = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
  await React.act(async () => { set.call(el, value); el.dispatchEvent(new Event('change', { bubbles: true })); }); await settle();
}
async function type(el, value) {
  const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  await React.act(async () => { set.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); });
}
// Text a closed disclosure hides is in the DOM but not on the page.
const onPage = (el) => !el.closest('details:not([open]) > :not(summary)') && !el.closest('[hidden]');
const grid = (t) => q(t, '.crds-guide').getAttribute('data-gd10-grid') === 'true';
const fold = (t) => q(t, '[data-gd10-more]');
const fullCardsBtn = (t) => q(t, '[data-gd10-full-cards]');
const compactBtn = (t) => qa(t, 'button').find((b) => b.textContent === 'Compact cards');

describe('which cards a student sees', () => {
  it('a phone gets the picture grid by default, and the default is not saved', async () => {
    setScreen(true);
    const t = await mount();
    expect(grid(t)).toBe(true);
    expect(q(t, '.crds-guide').getAttribute('data-guide-compact')).toBe('true');
    expect('guideCompact' in t.data).toBe(false);
    await settle();
    expect(t.writes.filter((w) => JSON.stringify(typeof w === 'function' ? w({ coralReef: {} }) : w).includes('guideCompact'))).toEqual([]);
  });
  it('a saved choice wins, either way', async () => {
    setScreen(true);
    const full = await mount({ guideCompact: false });
    expect(grid(full)).toBe(false);
    expect(qa(full, '.gd10-marks')).toEqual([]);
    expect(q(full, '[data-species="clownfish"]').textContent).toContain('Did you know?');
    expect(compactBtn(full).getAttribute('aria-pressed')).toBe('false');
    const chosen = await mount({ guideCompact: true });
    expect(grid(chosen)).toBe(true);
  });
  it('a wide screen, and a host with no matchMedia, keep the old layout untouched', async () => {
    for (const set of [() => setScreen(false), () => { delete window.matchMedia; }]) {
      set();
      const t = await mount();
      expect(q(t, '.crds-guide').hasAttribute('data-gd10-narrow')).toBe(false);
      expect(grid(t)).toBe(false);
      expect(fold(t)).toBeNull();
      expect(compactBtn(t).getAttribute('aria-pressed')).toBe('false');
      expect(q(t, '[data-species="clownfish"]').textContent).toContain('Did you know?');
      expect(q(t, '.crds-search-grid').children.length).toBe(3);
      expect(q(t, '.crds-controls').lastElementChild.className).toBe('crds-result-row');
    }
  });
  it('explicit compact on a wide screen still shows field marks on the card', async () => {
    setScreen(false);
    const t = await mount({ guideCompact: true });
    expect(grid(t)).toBe(false);
    expect(qa(t, '.gd10-marks')).toEqual([]);
    expect(onPage(q(t, '[data-species="clownfish"] .crds-marks'))).toBe(true);
  });
  it('turning a phone follows the screen and still writes nothing', async () => {
    setScreen(true);
    const t = await mount();
    expect(grid(t)).toBe(true);
    await React.act(async () => { screenNarrow = false; listeners.forEach((fn) => fn()); });
    expect(grid(t)).toBe(false);
    expect('guideCompact' in t.data).toBe(false);
    await React.act(async () => { screenNarrow = true; listeners.forEach((fn) => fn()); });
    expect(grid(t)).toBe(true);
  });
  it('the way to full cards is on screen, saved as a choice, and comes back', async () => {
    setScreen(true);
    const t = await mount();
    expect(onPage(fullCardsBtn(t))).toBe(true);
    await click(fullCardsBtn(t));
    expect(t.data.guideCompact).toBe(false);
    expect(grid(t)).toBe(false);
    expect(onPage(compactBtn(t))).toBe(true);
    await click(compactBtn(t));
    expect(t.data.guideCompact).toBe(true);
    expect(grid(t)).toBe(true);
  });
});

describe('a card in the picture grid', () => {
  it('every entry shows its true file number, name, picture place, Save and Red List words', async () => {
    setScreen(true);
    const IU = { LC: 'Least Concern', NT: 'Near Threatened', VU: 'Vulnerable', EN: 'Endangered', CR: 'Critically Endangered', DD: 'Data Deficient', NE: 'Not Evaluated' };
    const t = await mount({ speciesLog: { clownfish: { firstSeen: 1 } }, speciesFieldNotes: { blue_tang: 'seen at the wall' } });
    expect(qa(t, '[data-species]')).toHaveLength(X.SPECIES_META.length);
    X.SPECIES_META.forEach((m, i) => {
      const card = q(t, '[data-species="' + m.id + '"]');
      expect(onPage(card.querySelector('.cr-species-art')), m.id).toBe(true);
      expect(card.querySelector('.crdx-card-code').textContent, m.id).toBe('Field file ' + String(i + 1).padStart(3, '0'));
      expect(onPage(card.querySelector('.cr-sp-name')), m.id).toBe(true);
      expect(card.querySelector('.cr-sp-name').textContent, m.id).toContain(TX[m.id].name);
      expect(onPage(card.querySelector('[data-save-guide]')), m.id).toBe(true);
      expect(onPage(card.querySelector('[data-open-profile]')), m.id).toBe(true);
      const chip = card.querySelector('.cr-iucn');
      if (!m.iucn) { expect(chip, m.id).toBeNull(); return; }
      expect(onPage(chip), m.id).toBe(true);
      expect(chip.getAttribute('data-iucn')).toBe(m.iucn);
      expect(chip.textContent, m.id).toContain('IUCN Red List: ' + IU[m.iucn] + (m.iucnYear ? ' (' + m.iucnYear + ')' : ''));
    });
    expect(q(t, '[data-species="clownfish"] .cr-sp-name').textContent).toMatch(/Found$/);
    expect(onPage(q(t, '[data-species="blue_tang"] [data-guide-note-indicator]'))).toBe(true);
  });
  it('every field mark and look-alike is one tap away, and the tap shows them', async () => {
    setScreen(true);
    const t = await mount();
    for (const m of X.SPECIES_META) {
      const card = q(t, '[data-species="' + m.id + '"]'), box = card.querySelector('[data-gd10-marks]');
      if (!(TX[m.id].marks || []).length && !m.lookalikes.length) continue;
      expect(box, m.id).toBeTruthy();
      expect(box.open, m.id).toBe(false);
      expect(box.querySelector('summary').textContent).toBe('Field marks');
      for (const k of TX[m.id].marks) expect(box.textContent, m.id).toContain(k);
      for (const x of m.lookalikes.filter((id) => id !== m.id)) expect(box.querySelector('[data-lookalike="' + x + '"]'), m.id + ' ' + x).toBeTruthy();
    }
    const box = q(t, '[data-gd10-marks="clownfish"]');
    expect(onPage(box.querySelector('.crds-marks li'))).toBe(false);
    await click(box.querySelector('summary'));
    expect(box.open).toBe(true);
    expect(onPage(box.querySelector('.crds-marks li'))).toBe(true);
    expect(q(t, '[data-species="clownfish"]').classList.contains('gd10-wide')).toBe(true);
    expect(q(t, '[data-species="blue_tang"]').classList.contains('gd10-wide')).toBe(false);
    await click(box.querySelector('summary'));
    expect(box.open).toBe(false);
    expect(q(t, '[data-species="clownfish"]').classList.contains('gd10-wide')).toBe(false);
  });
  it('Save works from a card, and opening marks saves nothing', async () => {
    setScreen(true);
    const t = await mount(), before = JSON.stringify(t.data);
    await click(q(t, '[data-gd10-marks="clownfish"] summary'));
    expect(JSON.stringify(t.data)).toBe(before);
    await click(q(t, '[data-save-guide="clownfish"]'));
    expect(t.data.speciesBookmarks.clownfish).toBe(true);
    expect(q(t, '[data-save-guide="clownfish"]').getAttribute('aria-pressed')).toBe('true');
  });
  it('Save and every other card control have a 44 px target in the grid; the profile too', () => {
    expect(SOURCE).toContain("GD10_G + '.gd10-marks>summary{min-height:44px;");
    expect(SOURCE).toContain("GD10_N + '.cr-look-chip{min-height:44px}'");
    expect(SOURCE, 'beats the inline 42 px button style').toContain('.crds-guide .crds-card-top button{min-width:44px;min-height:44px!important}');
    expect(SOURCE).toContain("GD10_G + '.crdx-card-open{margin-top:0!important;padding:5px 8px!important;font-size:13px;min-height:44px!important}'");
    expect(SOURCE).toContain('.crdx-profile button{min-height:44px!important}');
  });
  it('a look-alike chip lands on the other card with its field marks open and focus on its name', async () => {
    setScreen(true);
    const t = await mount({ guideFilter: 'found', speciesLog: { moorish_idol: { firstSeen: 1 } } });
    await click(q(t, '[data-gd10-marks="moorish_idol"] summary'));
    await click(q(t, '[data-species="moorish_idol"] [data-lookalike="threadfin_butterflyfish"]'));
    expect(t.data.guideFilter).toBe('all');
    const box = q(t, '[data-gd10-marks="threadfin_butterflyfish"]');
    expect(box.open).toBe(true);
    expect(onPage(box.querySelector('.crds-marks li'))).toBe(true);
    expect(document.activeElement).toBe(q(t, '[data-species="threadfin_butterflyfish"] .cr-sp-name'));
    expect(Element.prototype.scrollIntoView.mock.contexts).toContain(q(t, '[data-species="threadfin_butterflyfish"]'));
  });
});

describe('the search area on a phone', () => {
  it('search and the count come first, on the page, and every control is still there', async () => {
    setScreen(true);
    const t = await mount();
    const search = q(t, 'input[type="search"]'), count = q(t, '[data-guide-result-count]'), more = fold(t);
    expect(more.open).toBe(false);
    expect(onPage(search)).toBe(true);
    expect(onPage(count)).toBe(true);
    expect(count.textContent).toBe('Showing ' + X.SPECIES_META.length + ' of ' + X.SPECIES_META.length + '.');
    expect(search.compareDocumentPosition(more) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(count.compareDocumentPosition(more) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    for (const s of ['[data-guide-search-mode]', '[data-guide-group-filter]', '[data-search-ideas]', '[data-guide-role]', '[data-guide-collection="all"]', '[data-guide-collection="found"]', '[data-guide-collection="missing"]', '[data-guide-collection="saved"]', '[data-guide-collection="notes"]']) {
      const el = q(t, s);
      expect(el, s).toBeTruthy();
      expect(more.contains(el), s).toBe(true);
    }
    expect(q(t, '.crds-help')).toBeTruthy();
    expect(q(t, 'input[type="search"]').getAttribute('aria-describedby').split(' ').every((id) => document.getElementById(id))).toBe(true);
  });
  const ACTIVE = [
    ['a group', { guideGroupFilter: 'coral' }, 'Corals'],
    ['a collection', { guideFilter: 'missing' }, 'Not found yet'],
    ['the field marks search', { guideSearchMode: 'description' }, 'Field marks and ecology'],
  ];
  for (const [name, seed, words] of ACTIVE) {
    it('opens by itself and names it for ' + name, async () => {
      setScreen(true);
      const t = await mount(seed);
      expect(fold(t).open).toBe(true);
      expect(q(t, '[data-gd10-filters-on]').textContent).toBe('Filters on: ' + words);
    });
  }
  it('a student can close it and still sees what is on; Reset puts it back', async () => {
    setScreen(true);
    const t = await mount({ guideGroupFilter: 'coral', guideFilter: 'missing' });
    await settle();
    expect(fold(t).open).toBe(true);
    await click(fold(t).querySelector('summary'));
    expect(fold(t).open).toBe(false);
    const on = q(t, '[data-gd10-filters-on]');
    expect(onPage(on)).toBe(true);
    expect(on.textContent).toBe('Filters on: Corals, Not found yet');
    expect(onPage(q(t, '[data-guide-reset]'))).toBe(true);
    await click(q(t, '[data-guide-reset]'));
    expect(t.data.guideGroupFilter).toBe('all');
    expect(fold(t).open).toBe(false);
    expect(q(t, '[data-gd10-filters-on]')).toBeNull();
  });
  it('choosing a filter inside keeps it open and updates the count outside', async () => {
    setScreen(true);
    const t = await mount();
    await click(fold(t).querySelector('summary'));
    expect(fold(t).open).toBe(true);
    await choose(q(t, '[data-guide-group-filter]'), 'coral');
    expect(fold(t).open).toBe(true);
    const n = X.SPECIES_META.filter((m) => m.group === 'coral').length;
    expect(q(t, '[data-guide-result-count]').textContent).toBe('Showing ' + n + ' of ' + X.SPECIES_META.length + '.');
    await choose(q(t, '[data-guide-role]'), q(t, '[data-guide-role]').options[1].value);
    expect(fold(t).open).toBe(true);
    expect(q(t, '[data-gd10-filters-on]').textContent).toContain('Corals');
  });
  it('a reef role is named when the disclosure is closed, and Reset clears it', async () => {
    setScreen(true);
    const t = await mount();
    await click(fold(t).querySelector('summary'));
    await choose(q(t, '[data-guide-role]'), q(t, '[data-guide-role]').options[1].value);
    await click(fold(t).querySelector('summary'));
    expect(fold(t).open).toBe(false);
    expect(q(t, '[data-gd10-filters-on]').textContent).toContain(q(t, '[data-guide-role]').options[1].textContent);
    await click(q(t, '[data-guide-reset]'));
    expect(q(t, '[data-guide-role]').value).toBe('all');
    expect(q(t, '[data-gd10-filters-on]')).toBeNull();
  });
});

describe('searching and practice do not change', () => {
  it('both search modes find the same cards on a phone and on a wide screen', async () => {
    const queries = [['names', 'parrot'], ['names', 'chelonia'], ['description', 'blue spots'], ['description', 'sponges'], ['description', 'seagrass'], ['description', 'zzzz']];
    const seen = {};
    for (const narrow of [false, true]) {
      setScreen(narrow);
      for (const [mode, text] of queries) {
        const t = await mount({ guideSearchMode: mode });
        await type(q(t, 'input[type="search"]'), text);
        const key = mode + ':' + text;
        const ids = qa(t, 'li[data-species]').map((li) => li.getAttribute('data-species'));
        const evidence = qa(t, '[data-guide-match]').map((b) => b.textContent);
        const count = q(t, '[data-guide-result-count]').textContent;
        if (!narrow) seen[key] = { ids, evidence, count };
        else expect({ ids, evidence, count }, key).toEqual(seen[key]);
        const root = mounted.pop(); await React.act(async () => root.root.unmount()); root.host.remove();
      }
    }
    expect(seen['description:sponges'].ids.length).toBeGreaterThan(0);
    expect(seen['description:sponges'].evidence.length).toBeGreaterThan(0);
  }, 60000);
  it('a search match keeps its excerpt and link on the page, across the whole row', async () => {
    setScreen(true);
    const t = await mount({ guideSearchMode: 'description' });
    await type(q(t, 'input[type="search"]'), 'sponges');
    const match = q(t, '[data-guide-match]');
    expect(onPage(match)).toBe(true);
    expect(onPage(match.querySelector('[data-read-match]'))).toBe(true);
    expect(match.closest('[data-species]').classList.contains('gd10-wide')).toBe(true);
  });
  it('a role note stays on the page, across the whole row', async () => {
    setScreen(true);
    const t = await mount();
    await click(fold(t).querySelector('summary'));
    await choose(q(t, '[data-guide-role]'), q(t, '[data-guide-role]').options[1].value);
    const note = q(t, '[data-guide-role-note]');
    expect(onPage(note)).toBe(true);
    expect(note.closest('[data-species]').classList.contains('gd10-wide')).toBe(true);
  });
  it('Practice identification starts from the phone view with the same collection rule', async () => {
    setScreen(true);
    const t = await mount({ guideGroupFilter: 'coral' });
    await click(q(t, '[data-start-practice]'));
    expect(q(t, '[data-marine-practice]')).toBeTruthy();
    expect(qa(t, '.gd10-marks')).toEqual([]);
  });
});

describe('group jumps and coming back', () => {
  for (const [name, seed] of [['picture grid', {}], ['full cards', { guideCompact: false }]]) {
    it('jump buttons scroll to the group heading and focus it on a phone: ' + name, async () => {
      setScreen(true);
      const t = await mount(seed);
      await click(q(t, '[data-jump="coral"]'));
      const head = q(t, '[data-group="coral"] > h3');
      expect(document.activeElement).toBe(head);
      expect(Element.prototype.scrollIntoView.mock.contexts).toContain(head);
      expect(Element.prototype.scrollIntoView.mock.calls.at(-1)[0].block).toBe('start');
    });
    it('Back to the field guide returns to the same card, focus on its button: ' + name, async () => {
      setScreen(true);
      const t = await mount(seed);
      const open = q(t, '[data-open-profile="brain_coral"]');
      await click(open);
      expect(q(t, '[data-marine-profile="brain_coral"]')).toBeTruthy();
      Element.prototype.scrollIntoView.mockClear();
      await click(q(t, '[data-profile-footer-back]'));
      const card = q(t, '[data-species="brain_coral"]');
      expect(card).toBeTruthy();
      expect(document.activeElement).toBe(card.querySelector('[data-open-profile="brain_coral"]'));
      expect(Element.prototype.scrollIntoView.mock.contexts).toContain(card);
    });
  }
  it('a card taller than the phone screen scrolls to the focused button on the way back', async () => {
    setScreen(true);
    const t = await mount({ guideCompact: false });
    await click(q(t, '[data-open-profile="brain_coral"]'));
    const tall = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ top: 0, bottom: 5000, left: 0, right: 300, width: 300, height: 5000, x: 0, y: 0 });
    Element.prototype.scrollIntoView.mockClear();
    await click(q(t, '[data-profile-footer-back]'));
    tall.mockRestore();
    const button = q(t, '[data-open-profile="brain_coral"]');
    expect(document.activeElement).toBe(button);
    expect(Element.prototype.scrollIntoView.mock.contexts).toContain(button);
  });
  it('the view does not change on the way back: open marks stay open, no choice gets saved', async () => {
    setScreen(true);
    const t = await mount();
    await click(q(t, '[data-gd10-marks="brain_coral"] summary'));
    await click(q(t, '[data-open-profile="brain_coral"]'));
    await click(q(t, '[data-profile-footer-back]'));
    expect(grid(t)).toBe(true);
    expect(q(t, '[data-gd10-marks="brain_coral"]').open).toBe(true);
    expect(q(t, '[data-species="brain_coral"]').classList.contains('gd10-wide')).toBe(true);
    expect('guideCompact' in t.data).toBe(false);
  });
  it('found counts leave the phone jump row but stay on the group headings', async () => {
    setScreen(true);
    const t = await mount({ speciesLog: { brain_coral: { firstSeen: 1 } } });
    const n = X.SPECIES_META.filter((m) => m.group === 'coral').length;
    expect(q(t, '[data-group="coral"] .crds-group-count').textContent).toBe('1 of ' + n + ' found');
    expect(q(t, '[data-jump="coral"]').textContent).toContain('1 of ' + n + ' found');
  });
  it('the sticky bar is small enough for the space every focus target leaves it', () => {
    expect(SOURCE).toContain("'.cr-guide-jump{position:sticky;top:0;");
    const margin = +SOURCE.match(/:is\(a,button,summary,input,select,textarea,h3,h4\)\{scroll-margin-top:(\d+)px/)[1];
    const bar = 44 + 12 + 1; // 44 px buttons, 6 + 6 padding, 1 px border; measured 57 at 390 in the browser
    expect(margin).toBeGreaterThan(bar);
  });
  it('in a padded scroller the bar is pulled up by the padding; with none, and on a wide screen, it is left alone', async () => {
    setScreen(true);
    const wrap = document.createElement('div');
    wrap.style.overflowY = 'auto'; wrap.style.paddingTop = '24px';
    document.body.appendChild(wrap);
    const realAppend = document.body.appendChild.bind(document.body);
    document.body.appendChild = (n) => wrap.appendChild(n);
    const inHost = await mount();
    document.body.appendChild = realAppend;
    expect(q(inHost, '.cr-guide-jump').style.top).toBe('-24px');
    await click(q(inHost, '[data-open-profile="brain_coral"]'));
    await click(q(inHost, '[data-profile-footer-back]'));
    expect(q(inHost, '.cr-guide-jump').style.top, 'seated again after a profile visit').toBe('-24px');
    const plain = await mount();
    expect(q(plain, '.cr-guide-jump').style.top).toBe('');
    await React.act(async () => { screenNarrow = false; listeners.forEach((fn) => fn()); });
    expect(q(inHost, '.cr-guide-jump').style.top).toBe('');
    wrap.remove();
  });
  it('the old static rule is still there for wider screens', () => {
    expect(SOURCE).toContain(".cr-guide-jump{position:static;");
  });
});

describe('new strings', () => {
  it('always pass English, and use no dashes', () => {
    const uses = SOURCE.match(/stem\.coralreef\.gd10_[a-z_]+'[^)]*\)/g) || [];
    expect(uses.length).toBeGreaterThanOrEqual(3);
    for (const u of uses) { expect(u, u).toMatch(/', '|','/); expect(u, u).not.toMatch(/[–—]/); }
  });
});
