import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab, renderTool, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';
import { runIsolatedAxe } from './helpers/isolated_axe_harness.js';
import { readFileSync } from 'node:fs';

// Round 4 lane "print": the Printables area in For teachers. Every handout is
// built from the tool's own tables, prints black on white with page breaks,
// and its controls are labelled, native and keyboard reachable.
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
vi.setConfig({ testTimeout: 60000 });
let X, S, PR;
beforeAll(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool(TOOL, 'coralReef');
  X = window.__RR_TEST_EXPORTS__.coralReef; S = window.__RR_TEST_EXPORTS__.coralReefSurvey; PR = window.__RR_TEST_EXPORTS__.coralReefPrint;
});
const dom = (html) => { const d = document.createElement('div'); d.innerHTML = html; return d; };
const view = (extra) => dom(renderTool('coralReef', { coralReef: Object.assign({ section: 'teacher' }, extra) }));
const T = (k, f) => f;

const mounted = [];
afterEach(async () => {
  while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); }
  vi.restoreAllMocks(); vi.unstubAllGlobals();
});
async function mount(seed) {
  let data = { coralReef: Object.assign({ section: 'teacher' }, seed) };
  const host = document.createElement('div'); document.body.appendChild(host); const root = ReactDOMClient.createRoot(host);
  function Shell() { const [state, setState] = React.useState(data); data = state; return window.StemLab._registry.coralReef.render({ React, toolData: state, setToolData: setState, t: T }); }
  const t = { host, root, get data() { return data.coralReef; }, q: (s) => host.querySelector(s), all: (s) => [...host.querySelectorAll(s)] }; mounted.push(t);
  await React.act(async () => root.render(React.createElement(Shell))); return t;
}
const act = (fn) => React.act(async () => { fn(); });

describe('printables sit in For teachers', () => {
  it('adds one Printables section after the standards and keeps the teacher sequence intact', () => {
    const host = view();
    const box = host.querySelector('[data-pr4-printables]');
    expect(box).toBeTruthy();
    expect(box.querySelector('h3').textContent).toBe('Printables');
    expect(host.querySelectorAll('ol.cr-teacher-flow > li').length).toBe(6);
    expect(box.closest('ol.cr-teacher-flow')).toBeNull();
    const order = [...host.querySelectorAll('h3')].map((h) => h.textContent);
    expect(order.indexOf('Printables')).toBeGreaterThan(order.indexOf('Misconceptions each step is built to test'));
    expect(order.indexOf('Printables')).toBeLessThan(order.indexOf('Related tools'));
    expect(box.getAttribute('data-pr4-printables')).toBe('datasheet');
    expect(PR.HANDOUTS).toEqual(['datasheet', 'cards', 'notebook', 'key']);
  });
});

describe('survey data sheet comes from the survey tables', () => {
  it('lists every bottom code the tool uses, the 40 points and every fish family', () => {
    const doc = view().querySelector('[data-pr4-doc="datasheet"]');
    const codes = [...doc.querySelectorAll('[data-pr4-codes] [data-pr4-code]')].map((li) => li.dataset.pr4Code);
    expect(codes).toEqual(X.CATEGORY_IDS.map((id) => PR.STRIP_CODE[id] || X.CATEGORY_CODE[id]));
    // every strip code and every Reef Check code appears on the sheet
    for (const id of X.CATEGORY_IDS) {
      expect(doc.textContent, id).toContain(PR.STRIP_CODE[id]);
      expect(doc.textContent, id).toContain(X.CATEGORY_CODE[id]);
    }
    for (const c of ['HC', 'BL', 'RKC', 'NIA', 'RC', 'RB', 'SD']) expect(codes).toContain(c);
    expect(doc.textContent).toContain('Reef Check code: HC');
    const pointRows = [...doc.querySelectorAll('[data-pr4-points] tbody tr')];
    expect(pointRows.length).toBe(X.constants.POINT_COUNT);
    expect(pointRows.map((r) => r.querySelector('th').textContent)).toEqual(Array.from({ length: 40 }, (_, i) => String(i + 1)));
    expect(pointRows[39].children[1].textContent).toBe('19.5');
    expect([...doc.querySelectorAll('[data-pr4-fish]')].map((r) => r.dataset.pr4Fish)).toEqual(X.FISH_FAMILIES);
    expect(doc.querySelectorAll('[data-pr4-cover] tbody tr').length).toBe(X.CATEGORY_IDS.length);
    expect(doc.textContent).toContain('one belt covers ' + X.constants.BELT_AREA_M2 + ' square meters');
    for (const f of ['Site', 'Date', 'Depth (m)', 'Team', 'Transect number']) expect(doc.textContent, f).toContain(f);
    expect(doc.querySelectorAll('.pr4-page').length).toBe(2);
  });

  it('follows new entries in the category and fish tables', () => {
    X.CATEGORY_IDS.push('test_sponge'); X.CATEGORY_CODE.test_sponge = 'SP'; X.FISH_FAMILIES.push('test_wrasse');
    try {
      const doc = view().querySelector('[data-pr4-doc="datasheet"]');
      expect([...doc.querySelectorAll('[data-pr4-code]')].map((li) => li.dataset.pr4Code)).toContain('SP');
      expect(doc.querySelector('[data-pr4-fish="test_wrasse"]')).toBeTruthy();
    } finally { X.CATEGORY_IDS.pop(); delete X.CATEGORY_CODE.test_sponge; X.FISH_FAMILIES.pop(); }
  });
});

describe('species ID cards come from SPECIES_META', () => {
  it('prints one card per species in each group, six to a page, with marks and Red List status', () => {
    const TX = X.speciesText(T);
    for (const g of PR.cardGroups()) {
      const doc = view({ pr4Handout: 'cards', pr4Group: g }).querySelector('[data-pr4-doc="cards"]');
      const list = X.SPECIES_META.filter((m) => m.group === g);
      const cards = [...doc.querySelectorAll('[data-pr4-card]')];
      expect(cards.map((c) => c.dataset.pr4Card), g).toEqual(list.map((m) => m.id));
      const pages = [...doc.querySelectorAll('.pr4-page')];
      expect(pages.length, g).toBe(Math.ceil(list.length / PR.CARDS_PER_PAGE));
      for (const p of pages) expect(p.querySelectorAll('[data-pr4-card]').length).toBeLessThanOrEqual(PR.CARDS_PER_PAGE);
      for (const c of cards) {
        const m = list.find((x) => x.id === c.dataset.pr4Card), tx = TX[m.id];
        expect(c.querySelector('h5').textContent).toBe(tx.name);
        if (m.scientific) expect(c.querySelector('.pr4-sci').textContent).toBe(m.scientific);
        const marks = [...c.querySelectorAll('.pr4-marks li')].map((li) => li.textContent);
        expect(marks).toEqual(tx.marks.slice(0, 3));
        expect(marks.length).toBeGreaterThanOrEqual(2);
        expect(c.querySelector('img').getAttribute('src')).toMatch(new RegExp('assets/coralreef/species/' + m.id + '\\.webp$'));
        expect(c.querySelector('img').getAttribute('alt')).toBe('3D model of a ' + tx.name);
        if (m.iucn) expect(c.querySelector('.pr4-status').textContent).toContain(m.iucnYear ? '(' + m.iucnYear + ')' : 'IUCN Red List: ');
      }
    }
    expect(PR.cardGroups()).not.toContain('structure');
    expect(PR.cardGroups()).toEqual(expect.arrayContaining(['fish', 'coral', 'invertebrate']));
  });

  it('adds a card when a species joins the group', () => {
    const before = view({ pr4Handout: 'cards', pr4Group: 'coral' }).querySelectorAll('[data-pr4-card]').length;
    X.SPECIES_META.push({ id: 'test_pr4_coral', group: 'coral', scientific: 'Testia printabilis', iucn: 'VU', iucnYear: 2024, lookalikes: [] });
    try {
      const doc = view({ pr4Handout: 'cards', pr4Group: 'coral' }).querySelector('[data-pr4-doc="cards"]');
      expect(doc.querySelectorAll('[data-pr4-card]').length).toBe(before + 1);
      const card = doc.querySelector('[data-pr4-card="test_pr4_coral"]');
      expect(card.textContent).toContain('Testia printabilis');
      expect(card.textContent).toContain('Vulnerable (2024)');
    } finally { X.SPECIES_META.pop(); }
  });

  it('can leave out the pictures', () => {
    const doc = view({ pr4Handout: 'cards', pr4Group: 'fish', pr4NoPics: true }).querySelector('[data-pr4-doc="cards"]');
    expect(doc.querySelectorAll('[data-pr4-card]').length).toBeGreaterThan(0);
    expect(doc.querySelectorAll('img').length).toBe(0);
    // text-only cards are shorter, so eight fit a page
    const n = PR.cardSpecies('fish').length;
    expect(doc.querySelectorAll('.pr4-page').length).toBe(Math.ceil(n / PR.CARDS_PER_PAGE_TEXT));
    expect(PR.CARDS_PER_PAGE_TEXT).toBe(8);
  });
});

describe('claim notebook follows the claim builder', () => {
  it('lists every claim and every kind of evidence', () => {
    const doc = view({ pr4Handout: 'notebook' }).querySelector('[data-pr4-doc="notebook"]');
    expect([...doc.querySelectorAll('[data-pr4-claim]')].map((li) => li.dataset.pr4Claim)).toEqual(S.CLAIM_IDS);
    expect([...doc.querySelectorAll('[data-pr4-evidence]')].map((r) => r.dataset.pr4Evidence).sort()).toEqual([...S.EVIDENCE_IDS].sort());
    for (const s of ['1. Your claim', '2. Evidence from your saved surveys', '3. Your reasoning', '4. Check your claim', 'Supports / Goes against / No difference']) expect(doc.textContent, s).toContain(s);
    expect(doc.querySelectorAll('.pr4-page').length).toBe(1);
  });
});

describe('answer key is the Field survey transect 1', () => {
  it.each(['reserve', 'heatwave'])('%s: codes, cover and fish match the survey code', (siteId) => {
    const doc = view({ pr4Handout: 'key', pr4Site: siteId }).querySelector('[data-pr4-doc="key"]');
    const site = X.siteById(siteId), layout = X.buildTransect(site, S.transectSeed(site, 1));
    expect(S.transectSeed(site, 1)).toBe(site.seed);
    const cells = [...doc.querySelectorAll('[data-pr4-answers] li')].map((li) => li.lastChild.textContent);
    expect(cells).toEqual(layout.points.map((p) => PR.code(p.category)));
    const cover = X.trueCover(layout);
    for (const id of X.CATEGORY_IDS) expect(doc.querySelector('[data-pr4-key-cover="' + id + '"]').lastChild.textContent, id).toBe(cover[id] + '%');
    const fish = X.fishInBelt(layout);
    for (const f of X.FISH_FAMILIES) expect(doc.querySelector('[data-pr4-key-fish="' + f + '"]').lastChild.textContent, f).toBe(String(fish[f]));
    expect(doc.querySelector('[data-pr4-key-live]').dataset.pr4KeyLive).toBe(String(X.indicators(cover).liveCoral));
    expect(doc.textContent).toContain('This line shows ' + X.indicators(cover).liveCoral + '% live coral, and the whole reef has ' + S.siteTruth(site, 'live') + '%.');
  });
});

describe('print CSS', () => {
  it('prints black on white with one sheet per page and nothing clipped', () => {
    const css = PR.PRINT_CSS;
    expect(css).toContain('@page{margin:12mm}');
    expect(css).toMatch(/@media print\{/);
    expect(css).toContain('.pr4-page{margin:0!important;padding:0!important;border:0!important;border-radius:0!important;break-after:page;page-break-after:always}');
    expect(css).toContain('.pr4-page:last-child{break-after:auto;page-break-after:auto}');
    expect(css).toContain('color:#000!important');
    expect(css).toContain('background:#fff!important');
    expect(css).toContain('.pr4-bar{display:none!important}');
    expect(css).not.toMatch(/@page\{[^}]*size/); // no fixed paper size: letter and A4 both work
    expect(PR.PAPER_CSS).toMatch(/\.pr4-card\{[^}]*break-inside:avoid/);
    expect(PR.PAPER_CSS).not.toMatch(/overflow:hidden/);
    expect(PR.PAPER_CSS).not.toMatch(/height:\d+(px|mm)/);
    // ES5 in the tool: the new block has no arrow functions or template strings
    const src = readFileSync(TOOL, 'utf8');
    const block = src.slice(src.indexOf('// ── Printables (For teachers)'), src.indexOf('window.__RR_TEST_EXPORTS__.coralReefPrint'));
    expect(block.length).toBeGreaterThan(1000);
    expect(block).not.toMatch(/=>|`|\blet\s|\bconst\s/);
    expect(block.includes(String.fromCharCode(0x2013)) || block.includes(String.fromCharCode(0x2014)), 'no en or em dashes').toBe(false);
  });

  it('the print document carries only the handout, its paper CSS and a print bar', () => {
    const html = PR.documentHtml('Survey data sheet', '<div class="pr4-doc"><div class="pr4-page">x</div></div>', false, T);
    expect(html).toMatch(/^<!doctype html><html lang="[a-z-]+">/i);
    expect(html).toContain('<title>Survey data sheet</title>');
    expect(html).toContain(PR.PAPER_CSS);
    expect(html).toContain(PR.PRINT_CSS);
    expect(html).not.toContain('data-coralreef-root');
    expect(html).not.toContain('onclick');
    expect(PR.documentHtml('t', '', true, T)).toContain('onclick="window.print()"');
  });
});

describe('controls', () => {
  it.each(['datasheet', 'cards', 'notebook', 'key'])('%s view has no axe violations', async (id) => {
    const html = renderTool('coralReef', { coralReef: { section: 'teacher', pr4Handout: id } });
    const result = await runIsolatedAxe(html);
    expect(result.violations.map((v) => v.id + ': ' + v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(', '))).toEqual([]);
  });

  it('uses labelled native controls and a focusable preview', async () => {
    const t = await mount();
    const box = t.q('[data-pr4-printables]');
    expect(box.getAttribute('aria-labelledby')).toBe(box.querySelector('h3').id);
    const fs = box.querySelector('fieldset.pr4-pick');
    expect(fs.querySelector('legend').textContent).toBe('Choose a handout');
    const radios = [...fs.querySelectorAll('input[type=radio]')];
    expect(radios.length).toBe(4);
    expect(new Set(radios.map((r) => r.name)).size).toBe(1);
    for (const r of radios) expect(r.closest('label').textContent.length).toBeGreaterThan(10);
    expect(radios.filter((r) => r.checked).map((r) => r.value)).toEqual(['datasheet']);
    const preview = box.querySelector('[data-pr4-preview]');
    expect(preview.getAttribute('tabindex')).toBe('0');
    expect(preview.getAttribute('role')).toBe('region');
    expect(t.q('#' + preview.getAttribute('aria-labelledby')).textContent).toBe('Preview: Survey data sheet (2 printed pages)');
    for (const b of box.querySelectorAll('button')) {
      expect(b.getAttribute('type')).toBe('button');
      expect(t.q('#' + b.getAttribute('aria-describedby'))).toBeTruthy();
    }
    expect(box.querySelector('[role=status][aria-live=polite]')).toBeTruthy();

    // choosing the cards shows a labelled group picker and the picture option
    await act(() => radios[1].click());
    expect(t.data.pr4Handout).toBe('cards');
    const sel = t.q('[data-pr4-group]');
    expect(t.q('label[for="' + sel.id + '"]').textContent).toContain('Species group');
    expect([...sel.options].map((o) => o.value)).toEqual(PR.cardGroups());
    expect(sel.options[0].textContent).toBe('Fish (' + PR.cardSpecies('fish').length + ' cards)');
    await act(() => { sel.value = 'coral'; sel.dispatchEvent(new Event('change', { bubbles: true })); });
    expect(t.data.pr4Group).toBe('coral');
    expect(t.all('[data-pr4-card]').length).toBe(PR.cardSpecies('coral').length);
    const nopics = t.q('[data-pr4-nopics]');
    expect(nopics.closest('label').textContent).toBe('Leave out the pictures (saves ink)');
    await act(() => nopics.click());
    expect(t.data.pr4NoPics).toBe(true);
    expect(t.all('[data-pr4-doc] img').length).toBe(0);

    // the answer key gets a labelled reef picker
    await act(() => t.all('fieldset.pr4-pick input')[3].click());
    const site = t.q('[data-pr4-site-pick]');
    expect(t.q('label[for="' + site.id + '"]').textContent).toContain('Reef for the answer key');
    expect([...site.options].map((o) => o.value)).toEqual(X.SITES.map((s) => s.id));
  });

  it('prints from a window of its own with the pictures at absolute addresses', async () => {
    const t = await mount({ pr4Handout: 'cards', pr4Group: 'coral' });
    let written = ''; const fake = { document: { open() {}, write(s) { written += s; }, close() {}, getElementById: () => null, images: [] }, focus() {}, print: vi.fn(), close() {} };
    vi.spyOn(window, 'open').mockReturnValue(fake);
    await act(() => t.q('[data-pr4-print]').click());
    expect(window.open).toHaveBeenCalledWith('', '_blank');
    expect(fake.print).toHaveBeenCalled();
    expect(written).toContain('<title>Species ID cards: Corals</title>');
    expect(written).toContain('data-pr4-card="brain_coral"');
    expect(written).not.toContain('loading="lazy"');
    expect(written).toMatch(/src="(https?|file):[^"]*assets\/coralreef\/species\/brain_coral\.webp"/);
    expect(written).not.toContain('pr4-preview');
    expect(t.q('[data-pr4-status]').dataset.pr4Status).toBe('window');
    expect(t.q('[data-pr4-status]').textContent).toContain('opened in a new tab');
  });

  it('prints in place when no window opens, and says so when that is refused too', async () => {
    const t = await mount();
    vi.spyOn(window, 'open').mockReturnValue(null);
    let shown = null;
    vi.spyOn(window, 'print').mockImplementation(() => {
      shown = { cls: document.documentElement.classList.contains('cr-pr4-printing'), host: !!document.querySelector('body > .cr-pr4-host [data-pr4-doc="datasheet"]') };
      window.dispatchEvent(new Event('beforeprint')); window.dispatchEvent(new Event('afterprint'));
    });
    await act(() => t.q('[data-pr4-print]').click());
    expect(shown).toEqual({ cls: true, host: true });
    expect(document.querySelector('.cr-pr4-host')).toBeNull();
    expect(document.documentElement.classList.contains('cr-pr4-printing')).toBe(false);
    expect(t.q('[data-pr4-status]').dataset.pr4Status).toBe('inplace');

    window.print.mockImplementation(() => {}); // a sandbox that ignores print()
    await act(() => t.q('[data-pr4-print]').click());
    expect(t.q('[data-pr4-status]').dataset.pr4Status).toBe('blocked');
    expect(t.q('[data-pr4-status]').textContent).toContain('Download the handout file');
    expect(document.querySelector('.cr-pr4-host')).toBeNull();
  });

  it('downloads the handout as a printable file', async () => {
    const t = await mount({ pr4Handout: 'notebook' });
    const parts = []; const NativeURL = window.URL, NativeBlob = window.Blob;
    vi.stubGlobal('Blob', class extends NativeBlob { constructor(p, o) { super(p, o); parts.push(p.join('')); } });
    vi.stubGlobal('URL', class extends NativeURL { static createObjectURL = vi.fn(() => 'blob:pr4'); static revokeObjectURL = vi.fn(); });
    const names = []; vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { names.push(this.download); });
    await act(() => t.q('[data-pr4-download]').click());
    expect(names).toEqual(['coral-reef-notebook.html']);
    expect(parts[0]).toContain('data-pr4-doc="notebook"');
    expect(parts[0]).toContain('onclick="window.print()"');
    expect(t.q('[data-pr4-status]').dataset.pr4Status).toBe('saved');
  });
});
