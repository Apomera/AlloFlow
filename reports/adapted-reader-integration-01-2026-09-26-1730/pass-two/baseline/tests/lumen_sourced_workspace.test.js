// Lumen §16 SOURCED — Phase 2A workspace tests.
//
// Pins the pure-function surface that backs the benchmark-document
// workspace: buildSpineCellScaffold, validateProposedSpineCell,
// signoffSpineCell, bindVerifiedCellsToSpine, spineCellsToJSON,
// normalizeBenchExtraction, benchDocTypeFromName, plus the lazy-loader +
// extractor wrappers' graceful-failure paths. The render-layer wiring is
// covered by lumen_render_golden.
//
// The §16.1 separation rule and the §16.4 always-unverified-by-
// construction invariant get explicit tests so a future refactor can't
// erode either by accident: a benchmark cell never lands in
// comp.observations, an unverified cell never reaches the spine, a
// stale-edited cell re-blocks at bind time, and the JSON output is
// stable across re-runs (sorted grade→season→percentile).

import { describe, it, expect } from 'vitest';
import * as LumenMod from '../stem_lab/stem_tool_lumen.js';

const L = LumenMod.default || LumenMod;

const HT_META = L.NORM_SPINE; // shipped meta; cells are empty until populated

describe('Lumen §16 Phase 2A — buildSpineCellScaffold', () => {
  it('builds a single G4 winter p50 cell with the expected key shape', () => {
    const cells = L.buildSpineCellScaffold(HT_META, { grades: [4], seasons: ['winter'], percentiles: [50] });
    expect(cells.length).toBe(1);
    expect(cells[0]).toMatchObject({
      id: 'cell_ORF-WCPM_g4_winter_p50',
      measure: 'ORF-WCPM', unit: 'words/min', grade: 4, season: 'winter', percentile: 50,
      value: null, verified: false, retrievedBy: 'human-assisted'
    });
    expect(cells[0].signoffHash).toBeNull();
  });

  it('respects the spine gradeRange when grades is omitted', () => {
    const cells = L.buildSpineCellScaffold(HT_META, { seasons: ['winter'], percentiles: [50] });
    // H&T NORM_SPINE.gradeRange is [1, 6] → 6 cells
    expect(cells.length).toBe(6);
    expect(cells.map(c => c.grade)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('cross-multiplies grades × seasons × percentiles', () => {
    const cells = L.buildSpineCellScaffold(HT_META, { grades: [1, 2], seasons: ['fall', 'winter', 'spring'], percentiles: [25, 50, 75] });
    expect(cells.length).toBe(2 * 3 * 3); // 18
  });

  it('returns [] for a null spineMeta (does not throw)', () => {
    expect(L.buildSpineCellScaffold(null, { grades: [4], seasons: ['winter'], percentiles: [50] })).toEqual([]);
    expect(L.buildSpineCellScaffold(undefined)).toEqual([]);
  });
});

describe('Lumen §16 Phase 2A — validateProposedSpineCell', () => {
  function freshCell() {
    return {
      id: 'x', measure: 'ORF-WCPM', unit: 'words/min',
      grade: 4, season: 'winter', percentile: 50, value: 120,
      source: 'H&T', year: 2017,
      locator: 'https://files.eric.ed.gov/fulltext/ED594994.pdf',
      citation: 'Hasbrouck & Tindal (2017).'
    };
  }

  it('passes a fully-populated cell', () => {
    expect(L.validateProposedSpineCell(freshCell())).toEqual({ ok: true, errors: [] });
  });

  it('rejects a non-positive value', () => {
    const c = freshCell(); c.value = 0;
    expect(L.validateProposedSpineCell(c).errors).toContain('value-not-positive-number');
  });

  it('rejects a locator that is not http(s)', () => {
    const c = freshCell(); c.locator = 'javascript:alert(1)';
    expect(L.validateProposedSpineCell(c).errors).toContain('locator-not-http-url');
  });

  it('rejects an out-of-range grade and percentile', () => {
    const c = freshCell(); c.grade = 99; c.percentile = -1;
    const v = L.validateProposedSpineCell(c);
    expect(v.errors).toContain('grade-out-of-range');
    expect(v.errors).toContain('percentile-out-of-range');
  });

  it('rejects null / non-object input without throwing', () => {
    expect(L.validateProposedSpineCell(null).ok).toBe(false);
    expect(L.validateProposedSpineCell('not an object').ok).toBe(false);
  });
});

describe('Lumen §16 Phase 2A — signoffSpineCell', () => {
  function readyCell() {
    return {
      id: 'x', measure: 'ORF-WCPM', unit: 'words/min',
      grade: 4, season: 'winter', percentile: 50, value: 120,
      source: 'H&T', year: 2017,
      locator: 'https://files.eric.ed.gov/fulltext/ED594994.pdf',
      citation: 'Hasbrouck & Tindal (2017).',
      verified: false, reviewedOn: null, signoffHash: null
    };
  }

  it('mutates the cell with verified:true + reviewedOn + signoffHash on a valid signoff', () => {
    const c = readyCell();
    const r = L.signoffSpineCell(c, '2026-06-05');
    expect(r.ok).toBe(true);
    expect(c.verified).toBe(true);
    expect(c.reviewedOn).toBe('2026-06-05');
    expect(typeof c.signoffHash).toBe('number');
    expect(c.signoffHash).toBeGreaterThan(0);
  });

  it('refuses to sign an invalid cell (returns errors, leaves cell untouched)', () => {
    const c = readyCell(); c.value = null;
    const r = L.signoffSpineCell(c, '2026-06-05');
    expect(r.ok).toBe(false);
    expect(r.errors).toContain('value-not-positive-number');
    expect(c.verified).toBe(false);
    expect(c.signoffHash).toBeNull();
  });

  it('requires a reviewedOn ISO string (forbids implicit Date in the pure layer)', () => {
    const c = readyCell();
    const r = L.signoffSpineCell(c, null);
    expect(r.ok).toBe(false);
    expect(r.errors).toContain('reviewedOn-required');
  });

  it('uses the same hash function as sourcedSignoffHash (so stale-detection is consistent)', () => {
    const c = readyCell();
    L.signoffSpineCell(c, '2026-06-05');
    expect(c.signoffHash).toBe(L.sourcedSignoffHash(c));
  });
});

describe('Lumen §16 Phase 2A — bindVerifiedCellsToSpine', () => {
  function signedCell(grade, season, percentile, value) {
    const c = {
      id: 'cell_' + grade + '_' + season + '_p' + percentile,
      measure: 'ORF-WCPM', unit: 'words/min',
      grade: grade, season: season, percentile: percentile, value: value,
      source: 'H&T', year: 2017,
      locator: 'https://files.eric.ed.gov/fulltext/ED594994.pdf',
      citation: 'Hasbrouck & Tindal (2017).',
      verified: false, reviewedOn: null, signoffHash: null
    };
    L.signoffSpineCell(c, '2026-06-05');
    return c;
  }

  it('adds verified cells to an empty existing spine; returns the merged structure', () => {
    const r = L.bindVerifiedCellsToSpine({}, [signedCell(4, 'winter', 50, 120), signedCell(4, 'fall', 50, 95)]);
    expect(r.added).toBe(2);
    expect(r.skipped).toBe(0);
    expect(r.collisions).toEqual([]);
    expect(r.cells).toEqual({ 4: { winter: { p50: 120 }, fall: { p50: 95 } } });
  });

  it('refuses an unverified cell (no signoffHash → not-verified collision)', () => {
    const c = signedCell(4, 'winter', 50, 120); c.verified = false; c.signoffHash = null;
    const r = L.bindVerifiedCellsToSpine({}, [c]);
    expect(r.added).toBe(0);
    expect(r.skipped).toBe(1);
    expect(r.collisions[0].reason).toBe('not-verified');
  });

  it('detects a stale signoff (cell edited after signing — hash no longer matches)', () => {
    const c = signedCell(4, 'winter', 50, 120);
    c.value = 121; // post-signoff edit; hash is now stale
    const r = L.bindVerifiedCellsToSpine({}, [c]);
    expect(r.added).toBe(0);
    expect(r.collisions[0].reason).toBe('stale-signoff');
  });

  it('refuses to overwrite an existing populated cell with a different value (stable-spine)', () => {
    const r = L.bindVerifiedCellsToSpine({ 4: { winter: { p50: 120 } } }, [signedCell(4, 'winter', 50, 999)]);
    expect(r.added).toBe(0);
    expect(r.collisions[0]).toMatchObject({ reason: 'value-collision', existing: 120, proposed: 999 });
  });

  it('tolerates an identical-value re-bind (idempotent at the cell level)', () => {
    const r = L.bindVerifiedCellsToSpine({ 4: { winter: { p50: 120 } } }, [signedCell(4, 'winter', 50, 120)]);
    expect(r.added).toBe(1);
    expect(r.collisions).toEqual([]);
  });

  it('handles a null / non-array input without throwing', () => {
    const r = L.bindVerifiedCellsToSpine({}, null);
    expect(r.collisions[0].reason).toBe('newCells-not-array');
  });
});

describe('Lumen §16 Phase 2A — spineCellsToJSON', () => {
  it('returns sorted grade → fall/winter/spring → p25/p50/p75 ordering', () => {
    const cells = { 4: { winter: { p50: 120 }, fall: { p50: 90 }, spring: { p50: 110 } }, 1: { winter: { p75: 50, p25: 10 } } };
    const json = L.spineCellsToJSON(cells, 0);
    expect(json.indexOf('"1"')).toBeLessThan(json.indexOf('"4"'));         // grade order
    const g4Section = json.slice(json.indexOf('"4"'));
    expect(g4Section.indexOf('fall')).toBeLessThan(g4Section.indexOf('winter'));    // fall before winter inside grade 4
    expect(g4Section.indexOf('winter')).toBeLessThan(g4Section.indexOf('spring'));  // winter before spring
    const g1Section = json.slice(json.indexOf('"1"'), json.indexOf('"4"'));
    expect(g1Section.indexOf('p25')).toBeLessThan(g1Section.indexOf('p75'));// percentile order
  });

  it('returns {} for null / empty input', () => {
    expect(L.spineCellsToJSON(null)).toBe('{}');
    expect(L.spineCellsToJSON({})).toBe('{}');
  });
});

describe('Lumen §16 Phase 2A — normalizeBenchExtraction + benchDocTypeFromName', () => {
  it('normalizes the §17 text-table shape into the pages array (cross-lane consistency)', () => {
    const t = L.parseTextTable('grade,winter50\n4,120\n5,135');
    const norm = L.normalizeBenchExtraction(t);
    expect(norm.kind).toBe('text-table');
    expect(norm.pages.length).toBe(1);
    expect(norm.pages[0].text).toMatch(/grade.*winter50/);
    expect(norm.table).toBe(t);
  });

  it('normalizes a pdf-pages-style input verbatim', () => {
    const norm = L.normalizeBenchExtraction({ pages: [{ pageNum: 3, text: 'page 3 content' }, { pageNum: 7, text: 'page 7' }] });
    expect(norm.kind).toBe('document-pages');
    expect(norm.pages.map(p => p.pageNum)).toEqual([3, 7]);
  });

  it('normalizes a single-string extraction into one page', () => {
    const norm = L.normalizeBenchExtraction({ text: 'one big blob' });
    expect(norm.pages).toEqual([{ pageNum: 1, text: 'one big blob' }]);
  });

  it('detects pdf / docx / csv / tsv / txt / xlsx; rejects everything else', () => {
    expect(L.benchDocTypeFromName('h_and_t_2017.pdf')).toBe('pdf');
    expect(L.benchDocTypeFromName('norms.docx')).toBe('docx');
    expect(L.benchDocTypeFromName('norms.csv')).toBe('csv');
    expect(L.benchDocTypeFromName('norms.tsv')).toBe('txt');
    expect(L.benchDocTypeFromName('norms.txt')).toBe('txt');
    expect(L.benchDocTypeFromName('norms.xlsx')).toBe('xlsx');
    expect(L.benchDocTypeFromName('norms.png')).toBeNull();
    expect(L.benchDocTypeFromName('norms.jpg')).toBeNull();
    expect(L.benchDocTypeFromName(null)).toBeNull();
  });
});

describe('Lumen §16 Phase 2A — extractor graceful-failure paths', () => {
  it('extractPdfText returns a structured error when pdf.js is missing', async () => {
    const r = await L.extractPdfText(null, new ArrayBuffer(0));
    expect(r.error).toMatch(/pdf\.js not loaded/);
    expect(r.pages).toEqual([]);
  });

  it('extractPdfText catches a getDocument throw', async () => {
    const fake = { getDocument: () => { throw new Error('bad bytes'); } };
    const r = await L.extractPdfText(fake, new ArrayBuffer(0));
    expect(r.error).toMatch(/PDF parse failed: bad bytes/);
  });

  it('extractDocxText returns a structured error when mammoth is missing', async () => {
    const r = await L.extractDocxText(null, new ArrayBuffer(0));
    expect(r.error).toMatch(/mammoth not loaded/);
  });

  it('extractDocxText catches an extractRawText rejection', async () => {
    const fake = { extractRawText: () => Promise.reject(new Error('docx corrupt')) };
    const r = await L.extractDocxText(fake, new ArrayBuffer(0));
    expect(r.error).toMatch(/DOCX parse failed: docx corrupt/);
  });
});

describe('Lumen §16 Phase 2A — §16.1 separation invariants', () => {
  it('a verified cell bound to the spine never lands in comp.observations', () => {
    const comp = L.makeCompendium('ORF-WCPM', 'words/min', { measure: 'ORF-WCPM' });
    L.REYNA_SAMPLE.forEach(o => L.addObservation(comp, o));
    const cell = {
      id: 'x', measure: 'ORF-WCPM', unit: 'words/min', grade: 4, season: 'winter', percentile: 50, value: 120,
      source: 'H&T', year: 2017, locator: 'https://files.eric.ed.gov/fulltext/ED594994.pdf', citation: 'Hasbrouck & Tindal (2017).'
    };
    L.signoffSpineCell(cell, '2026-06-05');
    const r = L.bindVerifiedCellsToSpine({}, [cell]);
    // The bind operates on a SEPARATE cells structure (the spine), never on comp.observations.
    expect(r.cells[4].winter.p50).toBe(120);
    expect(comp.observations.some(o => o.y === 120 && o.x === 4)).toBe(false);
    // The L1 trend over the student data is unchanged by the cell bind.
    const claim = L.deriveTrendClaim(comp, {});
    expect(claim.level).toBe('L1');
  });

  it('§16.4 always-unverified-by-construction: a cell never reaches the spine without an explicit signoff call', () => {
    const c = { id: 'x', measure: 'ORF-WCPM', unit: 'words/min', grade: 4, season: 'winter', percentile: 50, value: 120, source: 'H&T', year: 2017, locator: 'https://files.eric.ed.gov/fulltext/ED594994.pdf', citation: 'Hasbrouck & Tindal (2017).' };
    // Build a manually-faked "verified" cell with no signoffHash → bind refuses.
    c.verified = true; c.signoffHash = null;
    expect(L.bindVerifiedCellsToSpine({}, [c]).added).toBe(0);
    // Bolt on a hand-rolled hash (wrong value) → bind detects the stale.
    c.signoffHash = 12345;
    expect(L.bindVerifiedCellsToSpine({}, [c]).collisions[0].reason).toBe('stale-signoff');
    // The ONLY valid path is signoffSpineCell.
    L.signoffSpineCell(c, '2026-06-05');
    expect(L.bindVerifiedCellsToSpine({}, [c]).added).toBe(1);
  });

  it('a bound spine cell reads cleanly through selectNorm + sourcedRenderable (end-to-end)', () => {
    const comp = L.makeCompendium('ORF-WCPM', 'words/min', { measure: 'ORF-WCPM', grade: 4, seasonWindow: 'winter' });
    L.REYNA_SAMPLE.forEach(o => L.addObservation(comp, o));
    // Build a temporary spine with one cell, then look it up by key.
    const cell = { id: 'x', measure: 'ORF-WCPM', unit: 'words/min', grade: 4, season: 'winter', percentile: 50, value: 120, source: 'H&T', year: 2017, locator: 'https://files.eric.ed.gov/fulltext/ED594994.pdf', citation: 'Hasbrouck & Tindal (2017).' };
    L.signoffSpineCell(cell, '2026-06-05');
    const merged = L.bindVerifiedCellsToSpine({}, [cell]).cells;
    const spine = Object.assign({}, L.NORM_SPINE, { cells: merged, reviewedOn: '2026-06-05' });
    const sel = L.selectNorm(spine, comp, { grade: 4, season: 'winter', percentile: 50 });
    expect(sel.ok).toBe(true);
    expect(sel.value).toBe(120);
    // The renderable wrapper passes because the source ref is verified and has a real http locator.
    const ref = L.makeSourceRef({
      kind: 'percentile', measure: 'ORF-WCPM', unit: 'words/min',
      grade: 4, season: 'winter', percentile: 50, value: sel.value,
      source: 'H&T', year: 2017, locator: cell.locator, citation: cell.citation,
      verified: true, reviewedOn: '2026-06-05'
    }, comp);
    expect(L.sourcedRenderable(ref).ok).toBe(true);
  });
});
