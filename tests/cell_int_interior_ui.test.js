// Inside the Cell — phone-width study labels (lane INT).
//
// On a canvas a few hundred pixels wide, 8-px names drawn into a 760-px scene shrink
// to ~3.5 px. At phone width the label chips therefore carry NUMBERS and an HTML key
// under the diagram names each number (real text: readable, zoomable, and announced).
// The key must list exactly the structures the canvas numbers, in the same order.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

let H;
const realMatchMedia = window.matchMedia;
function phoneWidth(on) {
  window.matchMedia = (q) => ({ matches: on && /max-width:\s*560px/.test(q), media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
}
beforeEach(async () => {
  H = await import(pathToFileURL(resolve(process.cwd(), 'tests/helpers/stem_widgets_smoke_harness.js')).href);
  H.resetStemLab();
  H.loadTool('stem_lab/stem_tool_cell.js', 'cell');
});
afterEach(() => { window.matchMedia = realMatchMedia; });

const legendNames = (html) => {
  const block = html.match(/<ol data-cell-int-label-legend="true"[^>]*>([\s\S]*?)<\/ol>/);
  if (!block) return null;
  return [...block[1].matchAll(/<button[^>]*><span[^>]*>(\d+)<\/span>([^<]+)<\/button>/g)].map((m) => [Number(m[1]), m[2]]);
};

describe('numbered study labels at phone width', () => {
  for (const type of ['animal', 'plant', 'bacterium']) {
    it(`lists every ${type} structure, numbered in canvas order`, () => {
      phoneWidth(true);
      const html = H.renderTool('cell', { cell: { mode: 'interior', _cellPicked: true, interiorCellType: type, interiorShowLabels: true, interiorPaused: true } });
      const names = legendNames(html);
      expect(names, 'no label key rendered at phone width').not.toBeNull();
      const expected = window.__alloCellInteriorArt.labelLegend(type, 1, 'general').map((e) => [e.number, e.name]);
      expect(names).toEqual(expected);
      expect(names.length).toBe(window.__alloCellPure.interiorOrganelles(type).length);
    });
  }
  it('stays out of the way on wide screens and when labels are off', () => {
    phoneWidth(false);
    expect(H.renderTool('cell', { cell: { mode: 'interior', _cellPicked: true, interiorCellType: 'animal', interiorShowLabels: true } })).not.toMatch(/<ol data-cell-int-label-legend/);
    phoneWidth(true);
    expect(H.renderTool('cell', { cell: { mode: 'interior', _cellPicked: true, interiorCellType: 'animal', interiorShowLabels: false } })).not.toMatch(/<ol data-cell-int-label-legend/);
  });
  it('each key entry is a real button that can select its structure', () => {
    phoneWidth(true);
    const html = H.renderTool('cell', { cell: { mode: 'interior', _cellPicked: true, interiorCellType: 'plant', interiorShowLabels: true, interiorSel: 'vacuole' } });
    const block = html.match(/<ol data-cell-int-label-legend="true"[^>]*>([\s\S]*?)<\/ol>/)[1];
    const buttons = block.match(/<button[^>]*>/g);
    buttons.forEach((b) => expect(b).toContain('type="button"'));
    expect(buttons.filter((b) => b.includes('aria-pressed="true"')).length).toBe(1);
  });
});
