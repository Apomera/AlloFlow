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
//   4. its file in the build.js desktop bundle    — missing ⇒ works online, breaks
//                                                   OFFLINE, which is the only case
//                                                   that build exists for
//                                                   (scaleExplorer, Sep 2026)
//   5. a row in tool_index.json, which feeds the  — missing ⇒ /scale-explorer and
//      shell deep-link map and /_redirects            ?tool=scaleExplorer open the
//      (both GENERATED, never hand-edited)             plain app with no error, and
//                                                   the lesson-plan agent cannot
//                                                   recommend the tool
//                                                   (scaleExplorer AND fieldJourneys,
//                                                    found 2026-09-10 by opening the
//                                                    deep link in the live app)
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

describe('STEM tool reachability — all five wiring points agree', () => {
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

  it('every tool file is in the desktop bundle list, so an offline classroom gets it', () => {
    // build.js names what the desktop build packages locally, so live classroom
    // activities do not depend on the public CDN. A tool missing here is the
    // quiet kind of broken: fine online, absent exactly where it was needed.
    const files = [...new Set(ids.map((id) => registered.get(id)))].sort();
    const src = read('build.js');
    const listed = (f) => src.includes("'stem_lab/" + f + "'") || src.includes('"stem_lab/' + f + '"');
    expect(files.filter((f) => !listed(f)), 'build.js — the desktop build would not package these').toEqual([]);
  });

  it('every registered tool resolves as a shell deep link, in all three ANTI copies and both _redirects', () => {
    // _alloReadShellDeepLinkTool validates ?tool= / ?stem_tool= / the last path
    // segment against _ALLO_STEM_DEEP_LINK_MAP and returns null for anything not
    // in it, so the app opens normally with nothing to say. The map and the
    // /_redirects slugs are both generated from tool_index.json by
    // dev-tools/build_stem_deep_links.cjs; the fix for a failure here is
    //   node dev-tools/build_tool_index.cjs && node dev-tools/build_stem_deep_links.cjs
    // and then copying the regenerated ANTI block into the two desktop mirrors,
    // which the generator does not write.
    const norm = (id) => id.toLowerCase().replace(/[\s_-]+/g, '');
    const indexed = new Set(JSON.parse(read('tool_index.json')).tools.map((t) => t.id));
    // The index builder deliberately keeps a few registrations out (a tool
    // rehomed outside STEM keeps a hidden registration so old links resolve).
    const nonIndex = block(read('dev-tools/build_tool_index.cjs'), /const NON_STEM_INDEX_IDS = new Set\(\[([\s\S]*?)\]\);/, 'NON_STEM_INDEX_IDS');
    const skip = new Set([...nonIndex.matchAll(/'([A-Za-z_$][A-Za-z0-9_$]*)'/g)].map((m) => m[1]));
    // A legacy id registered as a tile alias ('fractions' on the fractionViz
    // tile) is the same tool; its primary id carries the index row and the link.
    for (const m of read('stem_lab/stem_lab_module.js').matchAll(/\baliases:\s*\[\s*([^\]]+)\]/g)) {
      for (const q of m[1].match(/['"]([a-zA-Z_][a-zA-Z0-9_$]*)['"]/g) || []) skip.add(q.slice(1, -1));
    }
    const want = ids.filter((id) => !skip.has(id));
    expect(want.filter((id) => !indexed.has(id)), 'tool_index.json — registered but not indexed (rebuild it)').toEqual([]);
    for (const rel of ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx']) {
      const seg = block(read(rel), /const _ALLO_STEM_DEEP_LINK_MAP = \{([\s\S]*?)\n\};/, '_ALLO_STEM_DEEP_LINK_MAP in ' + rel);
      const keys = new Set([...seg.matchAll(/'([a-z0-9]+)':\s*'([A-Za-z0-9_$]+)'/g)].map((m) => m[1]));
      expect(want.filter((id) => !keys.has(norm(id))), rel + ' — ?tool= deep link resolves to null').toEqual([]);
    }
    for (const rel of ['_redirects', 'desktop/web-app/public/_redirects']) {
      const src = read(rel);
      const missing = want.filter((id) => !new RegExp('^/[a-z0-9-]+ /app/\\?tool=' + id + ' 302$', 'm').test(src));
      expect(missing, rel + ' — no shareable /slug for these').toEqual([]);
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
