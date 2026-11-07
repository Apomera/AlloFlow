import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import path from 'node:path';

// Round 11 lane print: the handouts judged as real pages. Page layout itself can only be judged in a
// browser (see NOTES.md); these pin what the paper needs: real counts from the survey's own tables,
// a teacher copy that says so, student sheets with no answers, a print path that keeps its sizes.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
vi.setConfig({ testTimeout: 60000 });
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
let loadTool, resetStemLab, renderTool, React, ReactDOMClient, X, S, PR, R, IV;
beforeAll(async () => {
  const mod = await import(/* @vite-ignore */ 'file:///' + path.resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js').replace(/\\/g, '/'));
  ({ loadTool, resetStemLab, renderTool, React, ReactDOMClient } = mod);
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {}; loadTool(TOOL, 'coralReef');
  const E = window.__RR_TEST_EXPORTS__;
  X = E.coralReef; S = E.coralReefSurvey; PR = E.coralReefPrint; R = E.coralReefReport;
  IV = Object.values(E).find((v) => v && v.INV_IDS && v.buildInverts);
});
const T = (k, f) => f;
const mounted = [];
afterEach(async () => {
  while (mounted.length) { const t = mounted.pop(); await React.act(async () => t.root.unmount()); t.host.remove(); }
  vi.restoreAllMocks();
});
async function mount(seed) {
  const host = document.createElement('div'); document.body.appendChild(host); const root = ReactDOMClient.createRoot(host);
  function Shell() { const [state, setState] = React.useState({ coralReef: seed }); return window.StemLab._registry.coralReef.render({ React, toolData: state, setToolData: setState, t: T }); }
  mounted.push({ host, root });
  await React.act(async () => root.render(React.createElement(Shell)));
  return host;
}
function teacher(extra) {
  const d = document.createElement('div');
  d.innerHTML = renderTool('coralReef', { coralReef: Object.assign({ section: 'teacher' }, extra) });
  expect(d.querySelector('[data-pr4-printables]'), 'the teacher screen rendered').toBeTruthy();
  return d;
}
const docOf = (extra) => teacher(extra).querySelector('[data-pr4-doc]');
const isUnder = (a, b) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_PRECEDING);

describe('data sheet lines up with the survey', () => {
  it('has a row for every invertebrate the Field survey counts, on the sheet with the fish', () => {
    const doc = docOf({ pr4Handout: 'datasheet' });
    const rows = [...doc.querySelectorAll('[data-pr11-invrow]')];
    expect(IV.INV_IDS.length).toBe(9);
    expect(rows.map((r) => r.dataset.pr11Invrow)).toEqual(IV.INV_IDS);
    for (const r of rows) {
      expect(r.querySelector('th').getAttribute('scope')).toBe('row');
      expect(r.querySelector('th').textContent.length).toBeGreaterThan(3);
      // a blank tally and a blank total to write in
      expect([...r.querySelectorAll('td')].map((c) => c.textContent)).toEqual(['', '']);
    }
    expect(rows[0].closest('[data-pr4-page]').dataset.pr4Page).toBe('2');
    expect(doc.querySelectorAll('.pr4-page').length).toBe(2);
  });
  it('the picker no longer describes a sheet with only fish', () => {
    const t = teacher({}).querySelector('[data-pr4-opt="datasheet"]').textContent;
    expect(t.includes('invertebrate')).toBe(true);
    expect(t.includes('Two pages')).toBe(true);
  });
  it('credits the method the sheet is built on', () => {
    const doc = docOf({ pr4Handout: 'datasheet' });
    const credit = doc.querySelector('[data-pr11-credit]');
    expect(credit).toBeTruthy();
    expect(credit.textContent.includes('Reef Check')).toBe(true);
    expect(credit.closest('[data-pr4-page]').dataset.pr4Page).toBe('1');
  });
});

describe('answer key', () => {
  it('every reef: counts add up and the invertebrates are the Field survey transect 1 answers', () => {
    for (const site of X.SITES) {
      const doc = docOf({ pr4Handout: 'key', pr4Site: site.id });
      const layout = X.buildTransect(site, S.transectSeed(site, 1));
      expect(layout.points.length).toBe(X.constants.POINT_COUNT);
      // 40 boxes whose code counts add to the Points column
      const cells = [...doc.querySelectorAll('[data-pr4-answers] li')].map((li) => li.lastChild.textContent);
      expect(cells.length).toBe(40);
      let sum = 0;
      for (const id of X.CATEGORY_IDS) {
        const row = doc.querySelector('[data-pr4-key-cover="' + id + '"]'), n = Number(row.children[1].textContent);
        sum += n;
        expect(cells.filter((c) => c === PR.code(id)).length, site.id + ' ' + id).toBe(n);
        expect(row.children[2].textContent, site.id + ' ' + id).toBe((Math.round(n / 40 * 1000) / 10) + '%');
      }
      expect(sum).toBe(40);
      // the survey screen shows buildInverts(site, seed) for this same transect
      const truth = IV.invertsInBelt(IV.buildInverts(site, S.transectSeed(site, 1)));
      const shown = {};
      for (const id of IV.INV_IDS) {
        const row = doc.querySelector('[data-pr11-key-inv="' + id + '"]');
        expect(row, site.id + ' ' + id).toBeTruthy();
        shown[id] = Number(row.lastChild.textContent);
      }
      expect(shown, site.id).toEqual(truth);
    }
  });
  it('both pages say teacher copy, in words a photocopy keeps', () => {
    const doc = docOf({ pr4Handout: 'key' });
    const pages = [...doc.querySelectorAll('.pr4-page')];
    expect(pages.length).toBe(2);
    for (const p of pages) {
      const mark = p.querySelector('[data-pr11-teacher]');
      expect(mark).toBeTruthy();
      expect(mark.textContent.includes('Teacher copy')).toBe(true);
      // straight under the page title, before anything else on the page
      expect(p.children[1]).toBe(mark);
    }
  });
  it('student handouts carry no answer: no key markup, no filled-in point, no teacher mark', () => {
    const groups = PR.cardGroups();
    const student = [docOf({ pr4Handout: 'datasheet' }), docOf({ pr4Handout: 'notebook' }), docOf({ pr4Handout: 'cards', pr4Group: groups[0] })];
    for (const doc of student) {
      const html = doc.outerHTML;
      for (const hook of ['data-pr4-answers', 'data-pr4-key-cover', 'data-pr4-key-fish', 'data-pr4-key-live', 'data-pr11-key-inv', 'data-pr11-teacher', 'data-pr4-site=', 'Answer key']) {
        expect(html.includes(hook), hook).toBe(false);
      }
    }
    const sheet = student[0];
    for (const tr of sheet.querySelectorAll('[data-pr4-points] tbody tr')) {
      expect(tr.children[2].textContent).toBe('');
      expect(tr.children[3].textContent).toBe('');
    }
    for (const tr of sheet.querySelectorAll('[data-pr4-cover] tbody tr')) expect(tr.children[1].textContent + tr.children[2].textContent).toBe('');
    for (const tr of sheet.querySelectorAll('[data-pr4-fish]')) expect(tr.children[2].textContent + tr.children[3].textContent).toBe('');
  });
});

describe('a sheet stands alone once it is copied', () => {
  it('every card page carries the picture and Red List credit', () => {
    for (const g of PR.cardGroups()) {
      const pages = [...docOf({ pr4Handout: 'cards', pr4Group: g }).querySelectorAll('.pr4-page')];
      expect(pages.length, g).toBe(Math.ceil(PR.cardSpecies(g).length / PR.CARDS_PER_PAGE));
      for (const p of pages) expect(p.querySelector('.pr4-foot') && p.querySelector('.pr4-foot').textContent.includes('IUCN Red List'), g).toBe(true);
    }
  });
});

describe('print CSS, the sizes a page was judged at', () => {
  const rule = (css, sel) => { const i = css.lastIndexOf(sel + '{'); return i < 0 ? '' : css.slice(i, css.indexOf('}', i)); };
  it('reads at 11 pt and gives a code box a child can write three letters in', () => {
    const css = PR.PRINT_CSS;
    expect(css.includes('\n.pr4-doc{font-size:11pt}')).toBe(true);
    // longer translated strings get 10 pt, and English keeps 11
    expect(css.includes('html:not([lang|="en"]) .pr4-doc{font-size:10pt}')).toBe(true);
    const w = /width:(\d+(?:\.\d+)?)mm/.exec(rule(css, '.pr4-table[data-pr4-points] thead th:nth-child(3)'));
    expect(w && Number(w[1]) >= 15, 'code column at least 15 mm').toBe(true);
    const row = /height:(\d+(?:\.\d+)?)mm/.exec(rule(css, '.pr4-table[data-pr4-points] td.pr4-w'));
    expect(row && Number(row[1]) >= 7.5, 'point rows at least 7.5 mm').toBe(true);
    // the margin stays safe for a printer that cannot reach the edge
    expect(css.includes('@page{margin:12mm}')).toBe(true);
  });
  it('lightens the dark picture backdrops so a copier does not lay down solid toner', () => {
    expect(/filter:[^;}]*contrast\(\.[0-9]+\)/.test(rule(PR.PRINT_CSS, '.pr4-pic'))).toBe(true);
  });
});

describe('the print paths', () => {
  function fakeWindow() {
    const box = { written: '', win: null };
    box.win = { document: { open() {}, write(s) { box.written += s; }, close() {}, getElementById: () => null, images: [] }, focus() {}, print: vi.fn(), close() {} };
    return box;
  }
  it('a printed handout has one top level heading per page, and the preview keeps its own levels', async () => {
    const host = await mount({ section: 'teacher', pr4Handout: 'cards', pr4Group: 'reptile' });
    const box = fakeWindow();
    vi.spyOn(window, 'open').mockReturnValue(box.win);
    await React.act(async () => { host.querySelector('[data-pr4-print]').click(); });
    const d = new DOMParser().parseFromString(box.written, 'text/html');
    const doc = d.querySelector('[data-pr4-doc]');
    expect(doc.querySelectorAll('h1').length).toBe(doc.querySelectorAll('.pr4-page').length);
    expect(doc.querySelector('h3,h4,h5,h6')).toBeNull();
    expect(d.querySelector('.pr4-page').firstElementChild.tagName).toBe('H1');
    expect(doc.querySelectorAll('.pr4-card h2').length).toBe(PR.cardSpecies('reptile').length);
    expect(PR.PAPER_CSS.includes('.pr4-card h2{')).toBe(true);
    // on screen the cards still sit under the page's own headings
    expect(host.querySelector('[data-pr4-doc] .pr4-card h5')).toBeTruthy();
    expect(host.querySelector('[data-pr4-doc] h1')).toBeNull();
  });
  it('printing in place: the print sizes come last in the document, so the app cannot undo them', async () => {
    const host = await mount({ section: 'teacher', pr4Handout: 'datasheet' });
    vi.spyOn(window, 'open').mockReturnValue(null);
    let seen = null;
    vi.spyOn(window, 'print').mockImplementation(() => {
      const styles = [...document.querySelectorAll('style')];
      const printStyle = styles.filter((s) => s.textContent.includes(PR.PRINT_CSS)).pop();
      const appPaper = styles.filter((s) => s.textContent.includes(PR.PAPER_CSS) && !s.textContent.includes(PR.PRINT_CSS));
      seen = { hasPrint: !!printStyle, app: appPaper.length, after: appPaper.every((s) => isUnder(printStyle, s)) };
      window.dispatchEvent(new Event('beforeprint')); window.dispatchEvent(new Event('afterprint'));
    });
    await React.act(async () => { host.querySelector('[data-pr4-print]').click(); });
    expect(seen.hasPrint).toBe(true);
    expect(seen.app).toBeGreaterThan(0);
    expect(seen.after, 'print CSS after every copy of the paper CSS').toBe(true);
    // and it cleans up after itself
    expect(document.querySelector('.cr-pr4-host')).toBeNull();
    expect([...document.querySelectorAll('style')].some((s) => s.textContent.includes('cr-pr4-printing'))).toBe(false);
  });
  it('the saved file has the same top level heading', async () => {
    const host = await mount({ section: 'teacher', pr4Handout: 'notebook' });
    const parts = []; const NB = window.Blob;
    vi.stubGlobal('Blob', class extends NB { constructor(p, o) { super(p, o); parts.push(p.join('')); } });
    const url = window.URL; const co = url.createObjectURL, ro = url.revokeObjectURL;
    url.createObjectURL = () => 'blob:x'; url.revokeObjectURL = () => {};
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {});
    try {
      await React.act(async () => { host.querySelector('[data-pr4-download]').click(); });
    } finally { url.createObjectURL = co; url.revokeObjectURL = ro; vi.unstubAllGlobals(); }
    expect(parts.length).toBe(1);
    expect(/<h1[^>]*class="pr4-title"/.test(parts[0])).toBe(true);
  });
});

describe('My reef report on paper', () => {
  it('never says it fits one page: a full report ran to four sheets', async () => {
    const host = await mount({ section: 'hub' });
    const entry = host.querySelector('[data-rep-entry]');
    expect(entry).toBeTruthy();
    expect(entry.textContent.includes('one page')).toBe(false);
    expect(entry.textContent.includes('one report')).toBe(true);
  });
  it('numbers its sheets, with a label-free counter that needs no translation', () => {
    expect(/@page\{@bottom-right\{content:counter\(page\) " \/ " counter\(pages\)/.test(R.PAPER_CSS)).toBe(true);
  });
  it('prints the prediction diamond white, also from a dark theme where the card color is dark', () => {
    const print = R.PAPER_CSS.slice(R.PAPER_CSS.indexOf('@media print{'));
    expect(print.includes('.rep-v-dia{fill:#fff}')).toBe(true);
  });
  it('names the Not recorded share on the cover chips, not by its pattern alone', async () => {
    // A saved transect stopped at 34 of 40 points: 15% of the bar is not recorded.
    const records = {}; const cats = ['rubble', 'rock', 'sand', 'hard_coral'];
    for (let i = 0; i < 34; i++) records[i] = i === 33 ? 'hard_coral' : cats[i % 3];
    const entry = { id: 'rubble:6311:', siteId: 'rubble', seed: 6311, transect: 1, modelYear: null, at: 1, agreement: 34, recorded: 34, records,
      cover: { hard_coral: 2.5, bleached_coral: 0, recently_dead_coral: 0, macroalgae: 0, rock: 27.5, rubble: 27.5, sand: 27.5, _recorded: 34 },
      indicators: { liveCoral: 2.5, bleachedShare: 0, macroalgae: 0, coralToAlgae: null }, fish: { parrotfish: 2, surgeonfish: 3, butterflyfish: 0, grouper: 0, snapper: 0 }, modelRun: null };
    const host = await mount({ section: 'report', surveyLog: [entry] });
    expect(host.querySelector('[data-rep-doc]'), 'the report screen rendered').toBeTruthy();
    const chips = [...host.querySelectorAll('[data-rep-cover] .rep-chips li')].map((li) => li.textContent);
    expect(chips.length, 'the saved entry reached the cover bar').toBeGreaterThan(0);
    const unnamed = chips.filter((c) => !/^(HC|BL|RKC|NIA|RC|RB|SD) /.test(c));
    expect(unnamed.length, 'the bar has a missing share').toBe(1);
    expect(unnamed[0]).toBe('Not recorded 15%');
  });
});

describe('thumbnails picture the real handout', () => {
  const svg = (id) => teacher({}).querySelector('svg[data-tc10-thumb="' + id + '"]');
  it('notebook: tick boxes and a table, as on the page, not only ruled lines', () => {
    const doc = docOf({ pr4Handout: 'notebook' });
    expect(doc.querySelectorAll('.pr4-box').length).toBeGreaterThan(0);
    expect(doc.querySelectorAll('table').length).toBeGreaterThan(0);
    const rects = svg('notebook').querySelectorAll('rect');
    const small = [...rects].filter((r) => Number(r.getAttribute('width')) < 4);
    expect(small.length, 'drawn tick boxes').toBeGreaterThanOrEqual(2);
    expect(rects.length - small.length, 'drawn table').toBeGreaterThanOrEqual(1);
  });
  it('key: a grid and a table, not the tick list the real key does not have', () => {
    const doc = docOf({ pr4Handout: 'key' });
    expect(doc.querySelectorAll('[data-pr4-answers] li').length).toBe(40);
    const t = svg('key');
    expect(t.querySelectorAll('rect').length, 'grid and table boxes').toBeGreaterThanOrEqual(2);
    // tick marks were drawn as M..l paths; the key icon is the only path group left
    const ticks = [...t.querySelectorAll('path')].filter((p) => /l1\.6 1\.8 3-3\.6/.test(p.getAttribute('d') || ''));
    expect(ticks.length).toBe(0);
  });
});
