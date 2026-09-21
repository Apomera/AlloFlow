#!/usr/bin/env node
/*
 * check_stem_tool_manifest.cjs — a STEM tool a student can reach must be in the
 * manifest the app actually fetches.
 *
 * WHY: a STEM tool becomes reachable through THREE independent registrations:
 *
 *   1. stem_lab/stem_tool_<x>.js calls window.StemLab.registerTool('id', {...})
 *   2. stem_lab_module.js carries a tile in `var _allStemTools`
 *   3. AlloFlowANTI.txt lists 'stem_lab/stem_tool_<x>.js' in
 *      `var stemToolModules` — the manifest the per-tool loader resolves against
 *
 * check_stem_tile_catalog.cjs guards (1) <-> (2). Nothing guarded (3), and it is
 * the one the browser depends on: __alloEnsureStemPluginLoaded resolves a tool
 * id to a module by searching that manifest, so a tool absent from it can never
 * be fetched no matter how it is launched.
 *
 * The same third-leg gap in SEL left 39 carded tools unopenable (see
 * check_sel_tool_manifest.cjs and commit 1d424a800). STEM's TILED tools are all
 * present — this gate keeps it that way — but the sweep that added it found one
 * real hole on a different route:
 *
 *   timelineStudio (stem_lab/stem_tool_timeline.js, 17 KB, actively maintained)
 *   is in _ALLO_STEM_DEEP_LINK_MAP, so ?tool=timelinestudio resolves the NAME,
 *   but the module is in no manifest, is not in build.js for CDN hashing, and
 *   no module references it. The link resolves and nothing can load.
 *
 * So this checks both routes into the lab: the tile grid and the deep-link map.
 * A deep link that resolves a name the loader cannot fetch is a dead end that
 * looks like a working URL.
 *
 * Usage:  node dev-tools/check_stem_tool_manifest.cjs [--quiet] [--json]
 *         node dev-tools/check_stem_tool_manifest.cjs --selftest
 * Exit:   0 every reachable tool is in the manifest
 *         1 a tile or deep link points at a module the app cannot fetch
 *         2 usage / could not read what it needs (never a silent pass)
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const QUIET = process.argv.includes('--quiet');
const AS_JSON = process.argv.includes('--json');
const SELFTEST = process.argv.includes('--selftest');

const ANTI = path.join(ROOT, 'AlloFlowANTI.txt');
const CATALOG = path.join(ROOT, 'stem_lab/stem_lab_module.js');
const STEM_DIR = path.join(ROOT, 'stem_lab');

function die(msg) {
  console.error('[check_stem_tool_manifest] ' + msg);
  process.exit(2);
}

/* Bracket-match an array literal. A naive indexOf(']') stops at the first
 * nested bracket and silently returns a short list — which would make this
 * gate under-report, the one failure mode it must not have. */
function arrayAfter(src, marker) {
  const at = src.indexOf(marker);
  if (at < 0) return null;
  const start = src.indexOf('[', at);
  if (start < 0) return null;
  let depth = 0;
  for (let i = start; i < src.length; i++) {
    if (src[i] === '[') depth++;
    else if (src[i] === ']') {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  return null;
}

function readManifest(src) {
  const block = arrayAfter(src, 'var stemToolModules');
  if (!block) return null;
  return [...new Set([...block.matchAll(/'([^']+\.js)'/g)].map((m) => m[1]))];
}

function readTiles(src) {
  // Anchor on the DECLARATION. `_allStemTools` appears earlier in the file as a
  // plain reference, and starting there lands on an unrelated bracket and
  // yields zero tiles.
  const decl = /^[ \t]*(?:var|let|const)\s+_allStemTools\s*=\s*\[/m.exec(src);
  if (!decl) return null;
  const start = src.indexOf('[', decl.index);
  let depth = 0;
  for (let i = start; i < src.length; i++) {
    if (src[i] === '[') depth++;
    else if (src[i] === ']') {
      depth--;
      if (depth === 0) {
        const block = src.slice(start, i + 1);
        return [...new Set([...block.matchAll(/\{\s*id:\s*'([A-Za-z0-9_]+)'/g)].map((m) => m[1]))];
      }
    }
  }
  return null;
}

/* The deep-link map is an OBJECT literal, so it is brace-matched, not
 * bracket-matched. Anchoring on the declaration for the same reason as the
 * tiles: an earlier mention of the name lands on the wrong delimiter. */
function readDeepLinks(src) {
  const decl = /(?:var|let|const)\s+_ALLO_STEM_DEEP_LINK_MAP\s*=\s*\{/.exec(src);
  if (!decl) return null;
  const start = src.indexOf('{', decl.index);
  let depth = 0;
  for (let i = start; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) {
        const block = src.slice(start, i + 1);
        return [...new Set([...block.matchAll(/'[a-z0-9]+'\s*:\s*'([A-Za-z0-9_]+)'/g)].map((m) => m[1]))];
      }
    }
  }
  return null;
}

/* Tool ids per file. The catalog gate parses with acorn for precision; a
 * regex over registerTool('<id>' is enough here and keeps this gate fast and
 * dependency-free. It can only MISS an id (a dynamic registration), never
 * invent one, and a missed id simply is not checked — it cannot manufacture a
 * false failure. */
function readRegistrations(dir) {
  const map = new Map();
  for (const f of fs.readdirSync(dir)) {
    if (!/^stem_tool_.*\.js$/.test(f) || f.endsWith('.codex.tmp.js')) continue;
    const txt = fs.readFileSync(path.join(dir, f), 'utf8');
    for (const m of txt.matchAll(/StemLab\.registerTool\(\s*'([^']+)'/g)) {
      if (!map.has(m[1])) map.set(m[1], 'stem_lab/' + f);
    }
  }
  return map;
}

/* Tools that are deep-linkable but deliberately NOT loadable yet.
 *
 * A name in _ALLO_STEM_DEEP_LINK_MAP with no module in the manifest is a URL
 * that resolves and then loads nothing. For these two that is a known state
 * awaiting a decision, not a regression, so they are listed here rather than
 * failing the gate every run — but they are REPORTED, because a silent
 * allowlist is how a dead end becomes permanent.
 *
 *   (forge was here until 2026-09-21, when it got a manifest entry and a tile.
 *   It is now reachable and guarded by this gate like any other tool. Its
 *   Submit button still needs the PLUGIN_SUBMISSIONS KV binding on the catalog
 *   worker — that is a server-side gap, not a reachability one.)
 *
 *   timelineStudio — 17 KB, actively maintained (last touched by the 90-tool
 *                    label pass 61fb91781), "rehomed to Learning Hub" per
 *                    check_stem_tile_catalog's own allowlist. But it is in NO
 *                    manifest, NOT in build.js, and referenced by no module, so
 *                    no Learning Hub route can reach it either. Never appeared
 *                    in the manifest in the last 12 commits to AlloFlowANTI.txt.
 *
 * Removing an entry here should mean the tool went live (add it to the manifest
 * AND build.js) or was retired (drop its deep link and tile too).
 */
const knownUnreachable = new Map([
  ['timelineStudio', 'in no manifest and not in build.js; deep link resolves but cannot load']
]);

function analyse(antiSrc, catalogSrc) {
  const manifest = readManifest(antiSrc);
  if (!manifest) die('could not locate var stemToolModules in AlloFlowANTI.txt');
  if (manifest.length < 100) die('stemToolModules parsed as only ' + manifest.length + ' entries — the parser is wrong, not the app');

  const tiles = readTiles(catalogSrc);
  if (!tiles || tiles.length < 100) die('_allStemTools parsed as ' + (tiles ? tiles.length : 0) + ' tiles — the parser is wrong, not the app');

  const deepLinks = readDeepLinks(antiSrc);
  // A silent zero here would have hidden the very finding this gate was written
  // for (timelineStudio is reachable ONLY by deep link), so refuse instead.
  if (!deepLinks || deepLinks.length < 100) {
    die('deep-link map parsed as ' + (deepLinks ? deepLinks.length : 0) +
      ' entries — the parser is wrong, not the app');
  }
  const regs = readRegistrations(STEM_DIR);
  if (regs.size < 100) die('only ' + regs.size + ' registerTool ids found — the scanner is wrong, not the app');

  const inManifest = new Set(manifest);
  const findings = [];
  const known = [];

  function note(kind, id) {
    const mod = regs.get(id);
    if (!mod) return;                    // no handler: check_stem_tile_catalog's job
    if (inManifest.has(mod)) return;
    let bytes = 0;
    try { bytes = fs.statSync(path.join(ROOT, mod)).size; } catch (_) {}
    const row = { id, module: mod, bytes, route: kind };
    // A TILE that cannot load is always a failure: the student can see and click
    // it. The allowlist only covers tools reachable by deep link alone.
    if (kind !== 'tile' && knownUnreachable.has(id)) {
      if (!known.some((f) => f.id === id)) known.push(Object.assign(row, { why: knownUnreachable.get(id) }));
      return;
    }
    if (!findings.some((f) => f.id === id)) findings.push(row);
  }

  tiles.forEach((id) => note('tile', id));
  deepLinks.forEach((id) => note('deep link', id));

  const missingFiles = manifest.filter((m) => !fs.existsSync(path.join(ROOT, m)));
  return { manifest, tiles, deepLinks, regs, findings, known, missingFiles };
}

if (SELFTEST) {
  const anti = fs.readFileSync(ANTI, 'utf8');
  const cat = fs.readFileSync(CATALOG, 'utf8');
  const base = analyse(anti, cat);
  const victim = base.manifest.find((m) => /stem_tool_zoomgallery\.js$/.test(m))
    || base.manifest.find((m) => /stem_tool_/.test(m));
  const mutated = anti.replace("'" + victim + "',", '').replace("'" + victim + "'", '');
  if (mutated === anti) die('selftest could not remove ' + victim + ' from the manifest copy');
  const after = analyse(mutated, cat);
  const victimId = [...base.regs.entries()].find(([, mod]) => mod === victim);
  const caught = victimId && after.findings.some((f) => f.id === victimId[0]);
  if (!caught) {
    console.error('SELFTEST FAILED: removing ' + victim + ' was NOT detected. The gate is blind.');
    process.exit(2);
  }
  console.log('✓ selftest: removing ' + victim + ' is detected (' + victimId[0] + ' reported unreachable).');
  process.exit(0);
}

if (!fs.existsSync(ANTI)) die('missing ' + ANTI);
if (!fs.existsSync(CATALOG)) die('missing ' + CATALOG);
const { manifest, tiles, deepLinks, regs, findings, known, missingFiles } =
  analyse(fs.readFileSync(ANTI, 'utf8'), fs.readFileSync(CATALOG, 'utf8'));

if (AS_JSON) {
  console.log(JSON.stringify({
    manifestCount: manifest.length,
    tileCount: tiles.length,
    deepLinkCount: deepLinks.length,
    registeredCount: regs.size,
    findings,
    known,
    missingFiles
  }, null, 2));
}

const failed = findings.length > 0 || missingFiles.length > 0;

if (!AS_JSON && (!QUIET || failed)) {
  console.log('[check_stem_tool_manifest] manifest ' + manifest.length + ' module(s); ' +
    regs.size + ' registered tool(s); ' + tiles.length + ' tile(s); ' +
    deepLinks.length + ' deep link(s).');
}

if (missingFiles.length && !AS_JSON) {
  console.error('\n' + missingFiles.length + ' manifest entr(ies) have NO file on disk (404 on every request):');
  missingFiles.forEach((m) => console.error('   ' + m));
}

if (findings.length && !AS_JSON) {
  console.error('\n' + findings.length + ' reachable STEM tool(s) are NOT in stemToolModules.');
  console.error('The loader resolves a tool id against that manifest, so these can never be fetched:\n');
  findings.forEach((f) => {
    console.error('   ' + f.id.padEnd(24) + (f.bytes / 1024).toFixed(0).padStart(5) + ' KB  ' +
      f.module + '   (reachable via: ' + f.route + ')');
  });
  console.error('\nTHE FIX: add each module to `var stemToolModules` in AlloFlowANTI.txt');
  console.error('(build.js regenerates desktop/web-app/src/App.jsx from it), and add it to');
  console.error('PLUGIN_FILES in build.js so its CDN hash is bumped.');
  console.error('\nIf a tool is deliberately unreachable, remove its tile and its entry in');
  console.error('_ALLO_STEM_DEEP_LINK_MAP too — a link that resolves a name the loader');
  console.error('cannot fetch is a dead end that looks like a working URL.');
}

// Always surface the allowlist. A dead end nobody is reminded of becomes
// permanent, and these two are each one decision away from being fixed.
if (known.length && !AS_JSON) {
  console.log('\nKnown-unreachable (allowlisted, not failing this gate):');
  known.forEach((f) => {
    console.log('   ' + f.id.padEnd(16) + (f.bytes / 1024).toFixed(0).padStart(5) + ' KB  ' + f.module);
    console.log('       ' + f.why);
  });
  console.log('   Each is deep-linkable: the URL resolves the name and then loads nothing.');
  console.log('   Resolve by making it live (manifest + build.js) or retiring its deep link.');
}

if (failed) process.exit(1);
if (!QUIET && !AS_JSON) {
  console.log('\n✓ check_stem_tool_manifest: every tiled and deep-linked STEM tool is in the manifest.');
}
