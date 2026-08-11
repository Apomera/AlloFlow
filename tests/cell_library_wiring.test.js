import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'acorn';

/**
 * Cell Simulator reference library.
 *
 * This file carried 27 tables that were declared and then referenced nowhere —
 * a 213-entry microbe catalogue, 200 trivia items, 200 study questions, organelle
 * and human-cell atlases, pathways, lab references, careers, lesson plans. None
 * of it could be reached from the UI. The quiz bank's 200 went into the quiz;
 * the remaining 26 are indexed by the Library mode.
 *
 * The failure mode being guarded is silent: authored content sits in the file,
 * every gate passes, and learners simply never see it.
 */

const SRC = 'stem_lab/stem_tool_cell.js';
const source = fs.readFileSync(SRC, 'utf8');
const ast = parse(source, { ecmaVersion: 2022, sourceType: 'script', locations: true });

function walk(node, visit) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) return node.forEach(n => walk(n, visit));
  if (typeof node.type !== 'string') return;
  visit(node);
  for (const k of Object.keys(node)) {
    if (k === 'type' || k === 'loc' || k === 'start' || k === 'end') continue;
    walk(node[k], visit);
  }
}

describe('cell — reference library wiring', () => {
  it('registers the library mode in the nav', () => {
    // Advertised in the mode list, given a label, and placed in a category —
    // a mode missing any of these is unreachable or unlabelled in the hub.
    expect(source).toContain("'glossary','library','finale'");
    expect(source).toContain("library: '📚 Library'");
    expect(source).toContain("modes: ['glossary', 'library', 'finale'] }");
    expect(source).toContain("d.mode === 'library'");
  });

  it('leaves no authored content table unreferenced', () => {
    // Every UPPER_CASE array literal of real size must be used somewhere. The
    // declaration itself contributes one identifier occurrence, so a count of
    // one means nothing reads it.
    const declared = new Map();
    const used = new Map();
    walk(ast, n => {
      if (n.type === 'VariableDeclarator' && n.id && n.id.type === 'Identifier'
          && n.init && n.init.type === 'ArrayExpression'
          && /^[A-Z][A-Z0-9_]{3,}$/.test(n.id.name)
          && n.init.elements.length >= 3) {
        declared.set(n.id.name, n.init.elements.length);
      }
      if (n.type === 'Identifier') used.set(n.name, (used.get(n.name) || 0) + 1);
    });

    expect(declared.size, 'expected to find the content tables').toBeGreaterThan(20);
    const orphans = [...declared.entries()]
      .filter(([name]) => (used.get(name) || 0) <= 1)
      .map(([name, n]) => `${name} (${n} entries)`);
    expect(orphans, 'authored tables that no code reads').toEqual([]);
  });

  it('indexes every library table with a non-empty data source', () => {
    // Each registry row names a real array; a typo would render an empty shelf.
    const rowRe = /\{ id: '([A-Z0-9_]+)', title: '[^']+', group: '[^']+', titleKey: '[^']+', data: ([A-Z0-9_]+) \}/g;
    const rows = [...source.matchAll(rowRe)];
    expect(rows.length, 'library registry rows').toBeGreaterThanOrEqual(24);
    for (const [, id, dataName] of rows) {
      expect(dataName, `row ${id} should point at its own table`).toBe(id);
      expect(source).toContain(`var ${dataName} = [`);
    }
  });

  it('keeps the clinical tables behind the same grade gate as the Diseases mode', () => {
    // Outbreak case studies and antibiotics must not reach K-5.
    const gateIdx = source.indexOf('if (cellBandAllowsClinical) {');
    expect(gateIdx, 'clinical shelf should be grade gated').toBeGreaterThan(-1);
    const gated = source.slice(gateIdx, gateIdx + 600);
    expect(gated).toContain('CASE_STUDIES');
    expect(gated).toContain('ANTIBIOTICS');
  });
});
