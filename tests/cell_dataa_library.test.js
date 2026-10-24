import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

/**
 * Cell Simulator Reference Library: grade gate, browsing and accessibility.
 *
 * Before 2026-10-18 the Library dumped every row of a table (up to 213) as label/value text,
 * and the microbe catalogue showed syphilis, gonorrhoea and other STI rows to every grade while
 * the Diseases mode and the clinical shelf were hidden below grade 6. These tests pin:
 *  - rows flagged `clinical` are hidden below grade 6 (and searching cannot reveal them);
 *  - a 200-row table renders one page, not 200 cards, and "show more" grows it;
 *  - search, group chips, sorting and the table view filter what is actually rendered;
 *  - malformed saved state cannot crash the mode or print undefined/NaN;
 *  - the chip palette meets WCAG text contrast in both resting and pressed states.
 */
const SRC = readFileSync('stem_lab/stem_tool_cell.js', 'utf8');
let H; let L;

beforeAll(async () => {
  H = await import(pathToFileURL(resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js')).href);
  H.resetStemLab();
  H.loadTool('stem_lab/stem_tool_cell.js', 'cell');
  L = window.__alloCellLibrary;
}, 120000);

const lib = (cell, grade) => H.renderTool('cell', { cell: Object.assign({ mode: 'library', _cellPicked: true }, cell) }, grade ? { gradeLevel: grade } : undefined);
const libraryPart = (html) => { const i = html.indexOf('data-cell-library="true"'); expect(i, 'library rendered').toBeGreaterThan(-1); return html.slice(i); };
const text = (html) => html.replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ');
const entries = (html) => (html.match(/data-cell-lib-entry="/g) || []).length;
const microbes = (extra, grade) => libraryPart(lib(Object.assign({ _libGroup: 'Organisms', _libSection: 'MICROBE_SPECIES' }, extra), grade));

function lum(hex) {
  const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}
const ratio = (a, b) => { const x = lum(a); const y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

describe('cell library — clinical grade gate', () => {
  it('hides STI and disease rows from grade 5, with a note, and search cannot reveal them', () => {
    const g5 = text(microbes({ _libShown: 1000 }));
    for (const word of ['syphilis', 'gonorrh', 'sexually transmitted', 'Treponema pallidum', 'Chlamydia trachomatis', 'tuberculosis (TB)']) {
      expect(g5.toLowerCase().includes(word.toLowerCase()), 'grade 5 sees "' + word + '"').toBe(false);
    }
    expect(g5).toContain('listed from grade 6 up');
    expect(g5).toContain('Escherichia coli');
    const searched = text(microbes({ _libQuery: 'syphilis' }));
    expect(searched).toContain('No entries match');
    expect(searched.includes('Treponema')).toBe(false);
  });

  it('shows the same rows from grade 6, without the note', () => {
    const g9 = text(microbes({ _libShown: 1000 }, '9'));
    expect(g9).toContain('Treponema pallidum');
    expect(g9).toContain('causes syphilis');
    expect(g9.includes('listed from grade 6 up')).toBe(false);
    const g7 = text(microbes({ _libQuery: 'syphilis' }, '7'));
    expect(g7).toContain('Treponema pallidum');
  });

  it('gates health trivia the same way', () => {
    const facts = (grade) => text(libraryPart(lib({ _libGroup: 'Facts & culture', _libSection: 'CELL_TRIVIA', _libShown: 1000 }, grade)));
    expect(facts().includes('mRNA vaccines')).toBe(false);
    expect(facts('10')).toContain('mRNA vaccines');
  });

  it('pure helper: cellLibRows drops clinical rows unless allowed, and counts them', () => {
    const rows = [{ id: 1, name: 'a' }, { id: 2, name: 'b', clinical: true }, null, 7, 'plain text row'];
    expect(L.cellLibRows(rows, { allowClinical: false })).toMatchObject({ available: 2, hidden: 1 });
    expect(L.cellLibRows(rows, { allowClinical: true }).available).toBe(3);
    expect(L.cellLibRows('nope', {}).rows).toEqual([]);
  });
});

describe('cell library — browsing', () => {
  it('renders one page of a long table, with a working "show more" count', () => {
    const page = microbes({}, '9');
    expect(entries(page)).toBe(L.CELL_LIB_PAGE);
    expect(page).toContain('data-cell-lib-more="true"');
    expect(text(page)).toMatch(/Showing 24 of 198 entries/);
    const two = microbes({ _libShown: 48 }, '9');
    expect(entries(two)).toBe(48);
    const all = microbes({ _libShown: 100000 }, '9');
    expect(entries(all)).toBe(198);
    expect(all.includes('data-cell-lib-more')).toBe(false);
  });

  it('search filters the rendered rows (all terms, accent- and case-insensitive)', () => {
    const html = microbes({ _libQuery: 'TICK', _libShown: 1000 }, '9');
    const rows = html.split('data-cell-lib-entry="').slice(1);
    expect(rows.length).toBeGreaterThan(4);
    for (const r of rows) expect(text(r.slice(0, r.indexOf('</li>'))).toLowerCase()).toContain('tick');
    expect(entries(microbes({ _libQuery: 'tick blacklegged lyme', _libShown: 1000 }, '9'))).toBe(2);
    expect(text(libraryPart(lib({ _libGroup: 'Organisms', _libSection: 'MICROBE_SPECIES', _libQuery: 'hammerling' })))).toContain('Acetabularia');
  });

  it('group chips filter by group and report counts; pressed chips carry aria-pressed', () => {
    const html = microbes({ _libChip: 'Archaea', _libShown: 1000 }, '9');
    expect(html).toMatch(/aria-pressed="true"[^>]*data-cell-lib-chip="Archaea"/);
    const n = entries(html);
    const archaea = L.cellLibRows(extractMicrobes(), { allowClinical: true, chipKey: 'kingdom', chip: 'Archaea' }).rows.length;
    expect(n).toBe(archaea);
    expect(n).toBeGreaterThan(10);
    // Every rendered card carries the Archaea tag.
    const cards = html.split('data-cell-lib-entry="').slice(1);
    for (const c of cards) expect(c.slice(0, c.indexOf('</li>'))).toContain('Archaea');
  });

  it('sorts, and offers a sortable table view with aria-sort', () => {
    const za = text(microbes({ _libSort: { key: 'name', dir: 'desc' } }, '9'));
    const first = za.indexOf('Xenorhabdus');
    expect(first).toBeGreaterThan(-1);
    expect(za.indexOf('Escherichia coli') === -1 || za.indexOf('Escherichia coli') > first).toBe(true);
    const table = microbes({ _libView: 'table' }, '9');
    expect(table).toContain('<table');
    expect(table).toMatch(/<th[^>]*aria-sort="none"/);
    expect(table.match(/<tr[^>]*data-cell-lib-entry=/g)).toHaveLength(24);
    const sorted = microbes({ _libView: 'table', _libSort: { key: 'habitat', dir: 'asc' } }, '9');
    expect(sorted).toMatch(/aria-sort="ascending"[^>]*>\s*<button[^>]*data-cell-lib-sort="habitat"/);
  });

  it('every library table renders without throwing or leaking undefined/NaN, at both grade bands', () => {
    const ids = [...SRC.matchAll(/\{ id: '([A-Z0-9_]+)', title: '[^']+', group: '([^']+)', titleKey: '[^']+', data: [A-Z0-9_]+ \}/g)];
    expect(ids.length).toBeGreaterThanOrEqual(24);
    for (const [, id, group] of ids) {
      for (const grade of [undefined, '9']) {
        for (const view of ['cards', 'table']) {
          const html = libraryPart(lib({ _libGroup: group, _libSection: id, _libView: view }, grade));
          // The clinical shelf does not exist below grade 6: a stored selection falls back.
          if (group === 'Health & disease' && !grade) { expect(html.includes('data-cell-lib-active="' + id + '"'), id + ' leaked to grade 5').toBe(false); continue; }
          expect(html, id).toContain('data-cell-lib-active="' + id + '"');
          const t = text(html);
          expect(/\bundefined\b|\bNaN\b|\[object Object\]/.test(t), id + ' ' + view + ' leaks a raw value').toBe(false);
        }
      }
    }
  });

  it('survives malformed saved state', () => {
    const bad = [
      { _libShown: 'lots', _libQuery: 42, _libChip: { x: 1 }, _libSort: 'bad', _libView: 7 },
      { _libShown: -5, _libQuery: null, _libChip: 'constructor', _libSort: { key: 'toString', dir: 9 }, _libSection: 99, _libGroup: [] },
      { _libShown: NaN, _libChip: '__proto__', _libSort: { key: 'name', dir: 'desc' }, _libView: 'table', _libSection: 'NOPE' }
    ];
    for (const s of bad) {
      let html;
      expect(() => { html = lib(s); }).not.toThrow();
      const t = text(libraryPart(html));
      expect(/\bundefined\b|\bNaN\b/.test(t)).toBe(false);
      expect(entries(html)).toBeGreaterThan(0);
    }
  });
});

describe('cell library — accessibility', () => {
  it('chip palette meets 4.5:1 for resting and pressed text', () => {
    expect(L.CELL_LIB_PALETTE.length).toBeGreaterThan(6);
    for (const p of L.CELL_LIB_PALETTE) {
      expect(ratio(p.fg, p.bg), p.name + ' resting').toBeGreaterThanOrEqual(4.5);
      expect(ratio('#ffffff', p.solid), p.name + ' pressed').toBeGreaterThanOrEqual(4.5);
      // Accent bars and borders are decorative; the label always carries the meaning.
    }
  });

  it('controls are real buttons/inputs with names and states', () => {
    const html = microbes({}, '9');
    expect(html).toMatch(/<input[^>]*type="search"[^>]*data-cell-lib-search="true"/);
    expect(html).toMatch(/<label class="clib-search-wrap"><span class="clib-sr">Search Microbe species catalogue<\/span>/);
    expect(html).toMatch(/role="status"[^>]*aria-live="polite"/);
    const buttons = html.match(/<button[^>]*>/g) || [];
    expect(buttons.length).toBeGreaterThan(10);
    for (const b of buttons) expect(b, b).toContain('type="button"');
    for (const b of buttons.filter((x) => /data-cell-lib-(chip|view|shelf|table)=/.test(x))) expect(b).toMatch(/aria-pressed="(true|false)"/);
    // Focus ring and reduced-motion rules ship with the scoped stylesheet.
    expect(html).toMatch(/data-cell-dataa-style/);
    expect(SRC).toMatch(/\[data-cell-library\] button:focus-visible/);
    expect(SRC).toMatch(/prefers-reduced-motion:reduce\)\{\[data-cell-library\]/);
  });
});

describe('cell library — interaction (mounted)', () => {
  it('clicking a chip, typing a search and "show more" update what is shown', async () => {
    const { React, ReactDOMClient } = H;
    const { flushSync } = createRequire(resolve(process.cwd(), 'tests/_resolve.js'))('../desktop/web-app/node_modules/react-dom');
    const cfg = window.StemLab._registry.cell;
    // jsdom lacks the observers the petri canvas uses; inert stand-ins are enough here.
    const saved = { RO: window.ResizeObserver, IO: window.IntersectionObserver };
    class Inert { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } }
    window.ResizeObserver = window.ResizeObserver || Inert; window.IntersectionObserver = window.IntersectionObserver || Inert;
    const savedGetContext = window.HTMLCanvasElement.prototype.getContext;
    window.HTMLCanvasElement.prototype.getContext = function () { return null; };
    let state = { cell: { mode: 'library', _cellPicked: true, _libGroup: 'Organisms', _libSection: 'MICROBE_SPECIES' } };
    let rerender = null;
    function Host() {
      const [td, setTd] = React.useState(state);
      rerender = setTd;
      const ctx = H.makeCtx({ toolData: td, setToolData: (fn) => { setTd((p) => { const n = typeof fn === 'function' ? fn(p) : fn; state = n; return n; }); }, gradeLevel: '9' });
      return cfg.render(ctx);
    }
    const host = document.createElement('div'); document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    try {
      flushSync(() => root.render(React.createElement(Host)));
      const lib = () => host.querySelector('[data-cell-library]');
      const shown = () => lib().querySelectorAll('[data-cell-lib-entry]').length;
      expect(shown()).toBe(24);
      flushSync(() => lib().querySelector('[data-cell-lib-chip="Fungi"]').click());
      expect(state.cell._libChip).toBe('Fungi');
      expect(shown()).toBeGreaterThan(5);
      expect([...lib().querySelectorAll('[data-cell-lib-entry]')].every((el) => el.textContent.includes('Fungi'))).toBe(true);
      flushSync(() => lib().querySelector('[data-cell-lib-chip=""]').click());
      const input = lib().querySelector('[data-cell-lib-search]');
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      flushSync(() => { setter.call(input, 'salt'); input.dispatchEvent(new window.Event('input', { bubbles: true })); });
      expect(state.cell._libQuery).toBe('salt');
      expect(shown()).toBeGreaterThan(2);
      expect([...lib().querySelectorAll('[data-cell-lib-entry]')].every((el) => /salt/i.test(el.textContent))).toBe(true);
      flushSync(() => { setter.call(input, ''); input.dispatchEvent(new window.Event('input', { bubbles: true })); });
      flushSync(() => lib().querySelector('[data-cell-lib-more]').click());
      expect(shown()).toBe(48);
      flushSync(() => lib().querySelector('[data-cell-lib-table="HUMAN_CELLS"]').click());
      expect(state.cell._libSection).toBe('HUMAN_CELLS');
      expect(state.cell._libShown).toBe(24);
      expect(lib().querySelector('[data-cell-lib-active]').getAttribute('data-cell-lib-active')).toBe('HUMAN_CELLS');
    } finally {
      flushSync(() => root.unmount()); host.remove();
      window.ResizeObserver = saved.RO; window.IntersectionObserver = saved.IO;
      window.HTMLCanvasElement.prototype.getContext = savedGetContext;
      expect(typeof rerender).toBe('function');
    }
  });
});

function extractMicrobes() {
  const start = SRC.indexOf('var MICROBE_SPECIES = [');
  const end = SRC.indexOf('\n          ];', start);
  // eslint-disable-next-line no-new-func
  return (new Function('return ' + SRC.slice(start + 'var MICROBE_SPECIES = '.length, end + '\n          ]'.length)))();
}
