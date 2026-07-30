// A plugin-only STEM tool is reachable only if THREE separate places agree, and the
// repo has now been bitten once per place:
//
//   1. a catalog tile in _allStemTools           — missing ⇒ no way to open it at all
//                                                  (BirdLab May 2026; gisStudio, found
//                                                   2026-07-26 — a finished, tested,
//                                                   mirrored tool nobody could launch)
//   2. an entry in _pluginOnlyTools              — missing ⇒ the tile opens BLANK
//                                                  (stewardshipHub, cellularLab, arccity)
//   3. its file in the ANTI stemToolModules list — missing ⇒ nothing ever registers
//
// check_stem_tile_catalog covers (1) and stem_plugin_fallback_allowlist covers (2).
// Nothing tied them together, and (3) was uncovered. This closes that, so the next
// tool cannot ship half-wired.
//
// The intentional exemptions are READ OUT of check_stem_tile_catalog.cjs rather than
// copied here: two hand-maintained allowlists would drift, and the one that drifts
// silently is the one that stops protecting anything.

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const read = (rel) => readFileSync(resolve(root, rel), 'utf8');

function block(src, re, what) {
  const m = src.match(re);
  if (!m) throw new Error('could not locate ' + what);
  return m[1];
}

// Tools the catalog gate documents as deliberately un-tiled (shelf viewers launched
// from a parent lab, the teacher-only authoring surface, tools rehomed elsewhere).
function exemptIds() {
  const seg = block(
    read('dev-tools/check_stem_tile_catalog.cjs'),
    /const intentionallyHiddenRegisteredIds = new Set\(\[([\s\S]*?)\]\);/,
    'intentionallyHiddenRegisteredIds'
  );
  const ids = new Set([...seg.matchAll(/'([A-Za-z_$][A-Za-z0-9_$]*)'/g)].map((m) => m[1]));
  ids.add('myTool'); // Tool Forge template registration, exempted by the allowlist gate
  return ids;
}

function registeredTools() {
  const out = new Map();
  for (const file of readdirSync(resolve(root, 'stem_lab'))) {
    if (!/^stem_tool_.*\.js$/.test(file) || file.endsWith('.bak') || file.endsWith('.codex.tmp.js')) continue;
    const src = read(`stem_lab/${file}`);
    for (const m of src.matchAll(/window\.StemLab\.registerTool\s*\(\s*['"]([A-Za-z_$][A-Za-z0-9_$]*)['"]/g)) {
      out.set(m[1], file);
    }
  }
  return out;
}

// A tile may cover extra registerTool ids via `aliases: [...]` (stem_tool_fractions.js
// registers both fractionViz and fractions against one tile).
function tiledIds(src) {
  const ids = new Set([...src.matchAll(/id:\s*'([A-Za-z_$][A-Za-z0-9_$]*)'/g)].map((m) => m[1]));
  for (const m of src.matchAll(/\baliases:\s*\[\s*([^\]]+)\]/g)) {
    for (const q of m[1].match(/['"]([a-zA-Z_][a-zA-Z0-9_$]*)['"]/g) || []) ids.add(q.slice(1, -1));
  }
  return ids;
}

const MODULE_COPIES = ['stem_lab/stem_lab_module.js', 'desktop/web-app/public/stem_lab/stem_lab_module.js'];
// The loader list exists twice as well — the canonical ANTI and the desktop app's
// copy. Checking only the canonical one would let the desktop build silently stop
// registering a tool while this gate stayed green.
const ANTI_COPIES = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt'];

describe('STEM tool reachability — all three wiring points agree', () => {
  const exempt = exemptIds();
  const registered = registeredTools();
  const ids = [...registered.keys()].filter((id) => !exempt.has(id)).sort();

  it('the scan itself is not silently empty', () => {
    expect(ids.length).toBeGreaterThan(100);
    expect(exempt.size, 'exemptions were parsed out of the catalog gate').toBeGreaterThan(2);
  });

  it('every registered tool has a catalog tile, in both module copies', () => {
    for (const rel of MODULE_COPIES) {
      const tiles = tiledIds(read(rel));
      expect(ids.filter((id) => !tiles.has(id)), rel + ' — registered but no tile').toEqual([]);
    }
  });

  it('every registered tool is in _pluginOnlyTools, so its tile is never a blank pane', () => {
    for (const rel of MODULE_COPIES) {
      const seg = block(read(rel), /var _pluginOnlyTools\s*=\s*\{([\s\S]*?)\n\s*\};/, '_pluginOnlyTools in ' + rel);
      const present = new Set([...seg.matchAll(/\b([A-Za-z_$][A-Za-z0-9_$]*)\s*:\s*true/g)].map((m) => m[1]));
      expect(ids.filter((id) => !present.has(id)), rel + ' — tile would open blank').toEqual([]);
    }
  });

  it('every tool file is in the ANTI loader list, so registration actually happens', () => {
    const files = [...new Set(ids.map((id) => registered.get(id)))].sort();
    for (const rel of ANTI_COPIES) {
      const seg = block(read(rel), /var stemToolModules = \[([\s\S]*?)\];/, 'stemToolModules in ' + rel);
      expect(files.filter((f) => seg.indexOf(f) === -1), rel + ' — tool files that never load').toEqual([]);
    }
  });

  it('the two ANTI copies carry the same loader list', () => {
    const [a, b] = ANTI_COPIES.map((rel) => block(read(rel), /var stemToolModules = \[([\s\S]*?)\];/, rel));
    expect(a).toBe(b);
  });

  it('the two module copies stay in step on both registries', () => {
    const [a, b] = MODULE_COPIES.map(read);
    expect([...tiledIds(a)].sort()).toEqual([...tiledIds(b)].sort());
    const only = (s) => block(s, /var _pluginOnlyTools\s*=\s*\{([\s\S]*?)\n\s*\};/, 'x')
      .match(/\b[A-Za-z_$][A-Za-z0-9_$]*\s*:\s*true/g).sort();
    expect(only(a)).toEqual(only(b));
  });

  it('GIS Studio specifically is wired at all three points (the case that prompted this)', () => {
    const src = read('stem_lab/stem_lab_module.js');
    expect(tiledIds(src).has('gisStudio'), 'catalog tile').toBe(true);
    expect(block(src, /var _pluginOnlyTools\s*=\s*\{([\s\S]*?)\n\s*\};/, 'x')).toMatch(/gisStudio:\s*true/);
    expect(block(read('AlloFlowANTI.txt'), /var stemToolModules = \[([\s\S]*?)\];/, 'x')).toContain('stem_tool_gisstudio.js');
  });
});
