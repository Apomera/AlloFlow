#!/usr/bin/env node
/*
 * check_sel_tool_manifest.cjs — every SEL card must have its module in the
 * runtime manifest the app actually loads.
 *
 * WHY: a SEL tool becomes reachable through THREE independent registrations:
 *
 *   1. sel_hub/sel_tool_<x>.js calls window.SelHub.registerTool('id', {...})
 *   2. sel_hub_module.js carries a card  { id: 'id', label, desc, ... }
 *   3. desktop/web-app/src/App.jsx lists 'sel_hub/sel_tool_<x>.js' in
 *      var selToolModules — the manifest __alloEnsureSelPluginsLoaded fetches
 *
 * (1) and (2) are already guarded (sel_registry_batch_c). (3) was not, and it
 * is the one the browser depends on: a card whose module is missing from the
 * manifest renders in the grid, but the file is never requested, so
 * SelHub.isRegistered(id) stays false forever. openSelToolById() then takes
 * its else branch and toasts "<Tool> is loading..." — on every click, with no
 * error, no timeout and no way through. The tool is not slow; it is never
 * coming.
 *
 * Measured 2026-09-20: 34 modules in the manifest against 71 registered tools
 * and 73 cards — 38 cards whose file sat on disk, fully built and tested, and
 * could not be opened from the shipped app. Among them howlTracker, the tool
 * the whole Crew/King pilot path was built around.
 *
 * WHY NO EXISTING GATE CAUGHT IT: every SEL harness loads tools straight from
 * disk — check_sel_render does readdirSync over sel_hub/, and the Playwright
 * walk (scratch/crew_tools_shots.cjs) addScriptTag's every sel_tool_*.js by
 * hand. Both bypass the manifest entirely, so all 190+ SEL tests can be green
 * while the manifest is missing half the hub. A harness that loads what the
 * app does not is measuring a different program.
 *
 * Usage:  node dev-tools/check_sel_tool_manifest.cjs [--quiet] [--json]
 *         node dev-tools/check_sel_tool_manifest.cjs --selftest
 * Exit:   0 every card's module is in the manifest
 *         1 at least one card can never open
 *         2 usage / the gate could not read what it needs (never a silent pass)
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const QUIET = process.argv.includes('--quiet');
const AS_JSON = process.argv.includes('--json');
const SELFTEST = process.argv.includes('--selftest');

const APP = path.join(ROOT, 'desktop/web-app/src/App.jsx');
const HUB = path.join(ROOT, 'sel_hub/sel_hub_module.js');
const SEL_DIR = path.join(ROOT, 'sel_hub');

function die(msg) {
  console.error('[check_sel_tool_manifest] ' + msg);
  process.exit(2);
}

/*
 * Pull the manifest out of App.jsx by BRACKET MATCHING, not indexOf(']').
 * The array contains nested brackets and comment prose; a naive scan for the
 * first ']' stops inside the list and silently reports a short manifest — the
 * exact failure that would make this gate under-report.
 */
function readManifest(src) {
  const at = src.indexOf('var selToolModules');
  if (at < 0) return null;
  const start = src.indexOf('[', at);
  if (start < 0) return null;
  let depth = 0;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (c === '[') depth++;
    else if (c === ']') {
      depth--;
      if (depth === 0) {
        const block = src.slice(start, i + 1);
        return [...new Set((block.match(/'sel_hub\/[^']+'/g) || []).map((s) => s.slice(1, -1)))];
      }
    }
  }
  return null;
}

/*
 * Card entries look like
 *   { id: 'tipp', icon: '...', label: 'TIPP', desc: '...', recommendedRange: '6-12', _cat: '...' }
 * Category headers (_cat_*) and config objects that merely carry an id+label
 * are not tools; require a tool-ish field so this does not invent cards.
 */
function readCards(src) {
  const out = new Set();
  const re = /\{\s*id:\s*'([A-Za-z0-9_]+)'[^\n]*label:\s*'[^']*'[^\n]*(?:recommendedRange|_cat|desc)\s*:/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    if (!m[1].startsWith('_cat_')) out.add(m[1]);
  }
  return [...out];
}

function readRegistrations(dir) {
  const map = new Map(); // toolId -> relative module path
  for (const f of fs.readdirSync(dir)) {
    if (!/^sel_tool_.*\.js$/.test(f)) continue;
    const txt = fs.readFileSync(path.join(dir, f), 'utf8');
    const m = txt.match(/SelHub\.registerTool\(\s*'([^']+)'/);
    if (m) map.set(m[1], 'sel_hub/' + f);
  }
  return map;
}

function analyse(appSrc, hubSrc) {
  const manifest = readManifest(appSrc);
  if (!manifest) die('could not locate var selToolModules in ' + APP);
  if (!manifest.length) die('selToolModules parsed as EMPTY — the parser is wrong, not the app');

  const cards = readCards(hubSrc);
  if (!cards.length) die('no cards parsed from sel_hub_module.js — the parser is wrong, not the app');

  const regs = readRegistrations(SEL_DIR);
  const inManifest = new Set(manifest);

  const unreachable = [];
  for (const id of cards) {
    const mod = regs.get(id);
    if (!mod) continue;              // carded but unregistered: sel_registry_batch_c's job
    if (inManifest.has(mod)) continue;
    let bytes = 0;
    try { bytes = fs.statSync(path.join(ROOT, mod)).size; } catch (_) {}
    unreachable.push({ id, module: mod, bytes });
  }
  unreachable.sort((a, b) => a.id.localeCompare(b.id));

  // A manifest entry with no file on disk 404s on every hub open.
  const missingFiles = manifest.filter((m) => !fs.existsSync(path.join(ROOT, m)));

  return { manifest, cards, regs, unreachable, missingFiles };
}

/*
 * SELFTEST — a gate that cannot fail is worse than no gate. Remove a module
 * known to be in the manifest and assert the analysis reports its card as
 * unreachable. Runs against in-memory copies; nothing on disk is touched.
 */
if (SELFTEST) {
  const appSrc = fs.readFileSync(APP, 'utf8');
  const hubSrc = fs.readFileSync(HUB, 'utf8');
  const base = analyse(appSrc, hubSrc);

  const victim = base.manifest.find((m) => /sel_tool_zones\.js$/.test(m)) || base.manifest[1];
  const mutated = appSrc.replace("'" + victim + "',", '').replace("'" + victim + "'", '');
  if (mutated === appSrc) die('selftest could not remove ' + victim + ' from the manifest copy');

  const after = analyse(mutated, hubSrc);
  const victimId = [...base.regs.entries()].find(([, mod]) => mod === victim);
  const caught = victimId && after.unreachable.some((u) => u.id === victimId[0]);

  if (!caught) {
    console.error('SELFTEST FAILED: removing ' + victim + ' from the manifest was NOT detected.');
    console.error('The gate is blind; fix it before trusting a pass.');
    process.exit(2);
  }
  console.log('✓ selftest: removing ' + victim + ' is detected (' + victimId[0] + ' reported unreachable).');
  process.exit(0);
}

const appSrc = fs.existsSync(APP) ? fs.readFileSync(APP, 'utf8') : die('missing ' + APP);
const hubSrc = fs.existsSync(HUB) ? fs.readFileSync(HUB, 'utf8') : die('missing ' + HUB);
const { manifest, cards, regs, unreachable, missingFiles } = analyse(appSrc, hubSrc);

if (AS_JSON) {
  console.log(JSON.stringify({
    manifestCount: manifest.length,
    cardCount: cards.length,
    registeredCount: regs.size,
    unreachable,
    missingFiles
  }, null, 2));
}

const failed = unreachable.length > 0 || missingFiles.length > 0;

if (!AS_JSON && (!QUIET || failed)) {
  console.log('[check_sel_tool_manifest] manifest ' + manifest.length +
    ' module(s); ' + regs.size + ' registered tool(s); ' + cards.length + ' card(s).');
}

if (missingFiles.length && !AS_JSON) {
  console.error('\n' + missingFiles.length + ' manifest entr(ies) have NO file on disk (404 on every hub open):');
  missingFiles.forEach((m) => console.error('   ' + m));
}

if (unreachable.length && !AS_JSON) {
  const mb = unreachable.reduce((n, u) => n + u.bytes, 0) / 1048576;
  console.error('\n' + unreachable.length + ' SEL card(s) can NEVER open — the module is not in selToolModules.');
  console.error('A student clicking these gets "<Tool> is loading..." forever:\n');
  unreachable.forEach((u) => {
    console.error('   ' + u.id.padEnd(26) + (u.bytes / 1024).toFixed(0).padStart(5) + ' KB  ' + u.module);
  });
  console.error('\nTHE FIX: add each module to `var selToolModules` in');
  console.error('  desktop/web-app/src/App.jsx');
  console.error('and keep PLUGIN_FILES in build.js in step so the CDN hash is bumped.');
  console.error('\nTotal weight if all are added eagerly: ' + mb.toFixed(2) + ' MB on top of the current batch.');
  console.error('The manifest is loaded in ONE batch on first hub open, so adding');
  console.error('them eagerly grows first-open cost for every student. Prefer wiring');
  console.error('SEL to the per-tool path STEM already uses (__alloEnsureStemPluginLoaded).');
}

if (failed) process.exit(1);

if (!QUIET && !AS_JSON) {
  console.log('✓ check_sel_tool_manifest: every carded SEL tool is in the runtime manifest.');
}
