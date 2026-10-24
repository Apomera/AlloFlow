// REF lane: browse/reference modes render real content, gate clinical rows by grade,
// and keep the comparison lab's existing hooks.
import { beforeAll, describe, expect, it } from 'vitest';
import { harness, leaks } from './cell_ref_helpers.js';

let H;
beforeAll(async () => {
  H = await harness();
  H.resetStemLab();
  H.loadTool('stem_lab/stem_tool_cell.js', 'cell');
});
const MATURE = ['Trichomonas', 'Helicobacter pylori', 'Spirochete', 'Sperm cell', 'Egg cell'];
const render = (cell, grade) => H.renderTool('cell', { cell }, grade ? { gradeLevel: grade } : undefined);

describe('REF browse and reference modes', () => {
  it('renders every REF mode with real content and no raw values', () => {
    for (const mode of ['encyclopedia', 'filter', 'compare', 'glossary', 'finale']) {
      const html = render({ mode, _cellPicked: true });
      expect(leaks(html), mode).toEqual([]);
      expect(html, mode).toContain(mode === 'compare' ? 'data-cell-comparison-lab' : 'data-cell-ref="' + mode + '"');
      expect((html.match(/data-cell-ref-morph="(?!unknown)/g) || []).length, mode + ' portraits').toBeGreaterThan(mode === 'glossary' ? -1 : 1);
    }
  });

  it('hides clinical organisms below grade 6 in every browse mode, and shows them for older students', () => {
    for (const mode of ['encyclopedia', 'filter', 'compare']) {
      const young = render({ mode, _cellPicked: true }, '5th Grade');
      for (const name of MATURE) expect(young, mode + ' leaks ' + name).not.toContain('>' + name + '<');
      const old = render({ mode, _cellPicked: true }, '10');
      expect(MATURE.some(name => old.includes(name)), mode + ' should list clinical rows for grade 10').toBe(true);
    }
  });

  it('keeps death tolls and health notes behind the clinical gate', () => {
    const cell = { mode: 'encyclopedia', _encyclopediaId: 23, _cellPicked: true };
    expect(render(cell, '5th Grade')).not.toContain('600,000');
    expect(render(cell, '5th Grade')).toContain('Plasmodium');
    expect(render(cell, '9')).toContain('600,000');
  });

  it('selects by organism id, survives stale indices and malformed search', () => {
    const html = render({ mode: 'encyclopedia', _encyclopediaId: 52, _encyclopediaIdx: 9999, _cellPicked: true });
    expect(html).toContain('id="cell-ref-enc-name"');
    expect(html).toMatch(/id="cell-ref-enc-name"[^>]*>Erythrocyte \(RBC\)</);
    for (const bad of [{ _encyclopediaSearch: 42 }, { _encyclopediaFilter: { x: 1 } }, { _encyclopediaIdx: 'x', _encyclopediaId: 'y' }, { _encyclopediaSearch: 'zzzz-no-match' }]) {
      const out = render(Object.assign({ mode: 'encyclopedia', _cellPicked: true }, bad));
      expect(leaks(out), JSON.stringify(bad)).toEqual([]);
    }
    expect(render({ mode: 'encyclopedia', _encyclopediaSearch: 'zzzz-no-match' })).toContain('Clear search and filters');
    expect(render({ mode: 'filter', _refFilterOrg: 'Archaea', _refFilterSize: 'tiny' })).toContain('data-cell-ref-group="Archaea"');
    expect(render({ mode: 'filter', _refFilterOrg: 'Archaea', _refFilterSize: 'large' })).toContain('No organisms match both filters.');
  });

  it('keeps the size ladder pinned class and the comparison hooks other specs rely on', () => {
    const enc = render({ mode: 'encyclopedia' });
    expect(enc).toContain('bg-green-700 text-white shadow-sm');
    expect(enc).toContain('data-cell-ref-ladder-h');
    expect(enc).toContain('data-cell-ref-ladder-v');
    const cmp = render({ mode: 'compare', _cmpA: 4, _cmpB: 0 });
    for (const hook of ['data-cell-compare-pair', 'data-cell-comparison-counts', 'data-cell-compare-filter="all"', 'data-cell-comparison-property="movement"', 'data-cell-compare-kept', 'data-cell-compare-scale="boosted"', 'data-cell-compare-strip']) expect(cmp, hook).toContain(hook);
    expect(cmp).toMatch(/shown ×[0-9.,]+ larger/);
  });
});
