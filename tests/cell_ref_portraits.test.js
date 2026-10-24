// REF lane: every ORGANISM_DB row names a morphology the portrait renderer really draws.
import { beforeAll, describe, expect, it } from 'vitest';
import { React, extractArray, harness } from './cell_ref_helpers.js';

let R, DB, ReactDOMServer;
beforeAll(async () => {
  const H = await harness();
  H.resetStemLab();
  H.loadTool('stem_lab/stem_tool_cell.js', 'cell');
  R = window.__alloCellRef;
  ReactDOMServer = H.ReactDOMServer;
  DB = extractArray('ORGANISM_DB');
});
const h = (...a) => React.createElement(...a);
function svgOf(morph, opts) { return ReactDOMServer.renderToStaticMarkup(R.renderCellRefPortrait(h, morph, Object.assign({ uid: 't-' + morph, size: 160 }, opts || {}))); }

describe('REF portraits', () => {
  it('exports the renderer and a non-trivial morph catalogue', () => {
    expect(R && typeof R.renderCellRefPortrait).toBe('function');
    expect(Object.keys(R.CELL_REF_MORPHS).length).toBeGreaterThanOrEqual(45);
  });

  it('gives every organism a known morph that is drawn (never the unknown fallback)', () => {
    expect(DB.length).toBeGreaterThanOrEqual(59);
    const bad = DB.filter(o => typeof o.morph !== 'string' || !R.CELL_REF_MORPHS[o.morph] || !R.CELL_REF_DRAW[o.morph] || o.morph === 'unknown').map(o => o.name + ':' + o.morph);
    expect(bad, 'rows without a drawable morph').toEqual([]);
    for (const o of DB) {
      const svg = svgOf(o.morph);
      expect(svg).toContain('data-cell-ref-morph="' + o.morph + '"');
      expect((svg.match(/<(path|circle|ellipse|rect|line|polygon)\b/g) || []).length, o.name).toBeGreaterThanOrEqual(3);
    }
  });

  it('draws every catalogued morph without NaN geometry and with an accessible name', () => {
    for (const id of Object.keys(R.CELL_REF_MORPHS)) {
      const svg = svgOf(id);
      expect(svg, id).not.toMatch(/NaN|undefined|Infinity/);
      expect(svg, id).toContain('role="img"');
      expect(svg, id).toContain('aria-label="' + R.CELL_REF_MORPHS[id].label.replace(/"/g, '&quot;') + '"');
      // gradients referenced by the drawing must be defined in the same svg
      const used = new Set((svg.match(/url\(#([^)]+)\)/g) || []).map(u => u.slice(5, -1)));
      for (const g of used) expect(svg, id + ' uses #' + g).toContain('id="' + g + '"');
    }
  });

  it('falls back to a generic cell for unknown or malformed morphs and supports decorative use', () => {
    for (const m of [undefined, null, 42, 'bogus', {}]) expect(svgOf(m)).toContain('data-cell-ref-morph="unknown"');
    const deco = svgOf('rod', { decorative: true });
    expect(deco).toContain('aria-hidden="true"');
    expect(deco).not.toContain('role="img"');
  });

  it('keeps distinct cells distinct: families with the same body plan still differ', () => {
    const a = svgOf('neutrophil'), b = svgOf('lymphocyte'), c = svgOf('rbc');
    expect(a).not.toBe(b);
    expect(b).not.toBe(c);
    // a mammalian red blood cell has no nucleus: the nucleus gradient is never painted
    expect(c).not.toMatch(/fill="url\(#[^)]*-n\)"/);
  });
});
