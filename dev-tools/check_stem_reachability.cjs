#!/usr/bin/env node
'use strict';

// Worker-free production wiring gate for plugin-only STEM tools.
// A reachable tool needs a registration, a catalog tile, a plugin fallback
// entry, and a lazy-loader file. This check also keeps the active desktop/web
// mirrors deterministic and pins the recoverable loader/error UI contract.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const QUIET = process.argv.includes('--quiet');
const MODULE_COPIES = [
  'stem_lab/stem_lab_module.js',
  'desktop/web-app/public/stem_lab/stem_lab_module.js',
  'desktop/web-app/public/stem_lab_module.js',
];
const SHELL_COPIES = [
  'AlloFlowANTI.txt',
  'desktop/web-app/src/AlloFlowANTI.txt',
  'desktop/web-app/src/App.jsx',
];

const failures = [];
function fail(message) { failures.push(message); }
function read(rel) {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) {
    fail(rel + ' is missing');
    return '';
  }
  return fs.readFileSync(abs, 'utf8');
}
function block(src, re, label) {
  const match = src.match(re);
  if (!match) {
    fail('Could not locate ' + label);
    return '';
  }
  return match[1];
}
function arrayLiteral(src, varName, label) {
  const decl = new RegExp('^[ \\t]*(?:var|let|const)\\s+' + varName + '\\s*=\\s*\\[', 'm').exec(src);
  if (!decl) {
    fail('Could not locate ' + label);
    return '';
  }
  const start = decl.index + decl[0].length - 1;
  let depth = 0;
  let quote = null;
  for (let i = start; i < src.length; i++) {
    const char = src[i];
    if (quote) {
      if (char === '\\') i++;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '/' && src[i + 1] === '/') {
      const newline = src.indexOf('\n', i + 2);
      if (newline === -1) break;
      i = newline;
      continue;
    }
    if (char === '/' && src[i + 1] === '*') {
      const close = src.indexOf('*/', i + 2);
      if (close === -1) break;
      i = close + 1;
      continue;
    }
    if (char === "'" || char === '"' || char === '`') {
      quote = char;
      continue;
    }
    if (char === '[') depth++;
    else if (char === ']' && --depth === 0) return src.slice(start + 1, i);
  }
  fail('Could not bracket-match ' + label);
  return '';
}
function setDifference(required, present) {
  return [...required].filter((value) => !present.has(value)).sort();
}
function normalizedToolKey(value) {
  return String(value || '')
    .replace(/^.*\//, '')
    .replace(/^stem_tool_/, '')
    .replace(/\.js(?:[?#].*)?$/, '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();
}

function registeredTools() {
  const out = new Map();
  const dir = path.join(ROOT, 'stem_lab');
  for (const file of fs.readdirSync(dir)) {
    if (!/^stem_tool_.*\.js$/.test(file) || file.endsWith('.bak') || file.endsWith('.codex.tmp.js')) continue;
    const src = fs.readFileSync(path.join(dir, file), 'utf8');
    const re = /window\.StemLab\.registerTool\s*\(\s*['\x22]([A-Za-z_$][A-Za-z0-9_$]*)['\x22]/g;
    for (const match of src.matchAll(re)) out.set(match[1], file);
  }
  return out;
}

function hiddenIds() {
  const src = read('dev-tools/check_stem_tile_catalog.cjs');
  const segment = block(src, /const intentionallyHiddenRegisteredIds = new Set\(\[([\s\S]*?)\]\);/, 'intentionallyHiddenRegisteredIds');
  const out = new Set([...segment.matchAll(/'([A-Za-z_$][A-Za-z0-9_$]*)'/g)].map((match) => match[1]));
  out.add('myTool');
  return out;
}

function catalogIds(src) {
  const segment = arrayLiteral(src, '_allStemTools', '_allStemTools');
  const out = new Set([...segment.matchAll(/\bid:\s*['\x22]([A-Za-z_$][A-Za-z0-9_$]*)['\x22]/g)].map((match) => match[1]));
  for (const match of segment.matchAll(/\baliases:\s*\[\s*([^\]]+)\]/g)) {
    for (const quoted of match[1].match(/['\x22]([A-Za-z_$][A-Za-z0-9_$]*)['\x22]/g) || []) {
      out.add(quoted.slice(1, -1));
    }
  }
  return out;
}

function fallbackIds(src) {
  const segment = block(src, /var _pluginOnlyTools\s*=\s*\{([\s\S]*?)\n\s*\};/, '_pluginOnlyTools');
  return new Set([...segment.matchAll(/\b([A-Za-z_$][A-Za-z0-9_$]*)\s*:\s*true/g)].map((match) => match[1]));
}

function loaderBlock(src, rel) {
  return block(src, /var stemToolModules = \[([\s\S]*?)\];/, 'stemToolModules in ' + rel);
}
function registrationAliasBlock(src, rel) {
  return block(
    src,
    /var stemRegistrationModuleAliases\s*=\s*\{([\s\S]*?)\n\s*\};/,
    'stemRegistrationModuleAliases in ' + rel
  );
}
function registrationAliases(segment) {
  const out = new Map();
  for (const match of segment.matchAll(/\b([A-Za-z_$][A-Za-z0-9_$]*)\s*:\s*['\x22]([^'\x22]+\.js)['\x22]/g)) {
    out.set(match[1], match[2]);
  }
  return out;
}
function manifestModules(segment) {
  return new Set([...segment.matchAll(/['\x22]([^'\x22]+\.js)['\x22]/g)].map((match) => match[1]));
}
function resolveRegisteredModule(id, modules, aliases) {
  if (modules.has(id)) return id;
  const aliased = aliases.get(id);
  if (aliased && modules.has(aliased)) return aliased;
  const wanted = normalizedToolKey(id);
  for (const mod of modules) {
    if (normalizedToolKey(mod) === wanted) return mod;
  }
  return null;
}

const registered = registeredTools();
const hidden = hiddenIds();
const requiredIds = new Set([...registered.keys()].filter((id) => !hidden.has(id)));
const canonicalModule = read(MODULE_COPIES[0]);
const tiles = catalogIds(canonicalModule);
const fallbacks = fallbackIds(canonicalModule);

const missingTiles = setDifference(requiredIds, tiles);
const missingFallbacks = setDifference(requiredIds, fallbacks);
if (missingTiles.length) fail('Registered tools missing catalog tiles: ' + missingTiles.join(', '));
if (missingFallbacks.length) fail('Registered tools missing plugin fallbacks: ' + missingFallbacks.join(', '));

for (const rel of MODULE_COPIES.slice(1)) {
  if (read(rel) !== canonicalModule) fail(rel + ' does not byte-match ' + MODULE_COPIES[0]);
}

const shellSources = SHELL_COPIES.map((rel) => read(rel));
const loaderBlocks = shellSources.map((src, index) => loaderBlock(src, SHELL_COPIES[index]));
const aliasBlocks = shellSources.map((src, index) => registrationAliasBlock(src, SHELL_COPIES[index]));
for (let i = 1; i < loaderBlocks.length; i++) {
  if (loaderBlocks[i] !== loaderBlocks[0]) fail(SHELL_COPIES[i] + ' has a different stemToolModules manifest');
  if (aliasBlocks[i] !== aliasBlocks[0]) fail(SHELL_COPIES[i] + ' has a different stemRegistrationModuleAliases map');
}
const requiredFiles = new Set([...requiredIds].map((id) => registered.get(id)));
for (let i = 0; i < loaderBlocks.length; i++) {
  const missing = [...requiredFiles].filter((file) => loaderBlocks[i].indexOf(file) === -1).sort();
  if (missing.length) fail(SHELL_COPIES[i] + ' never loads: ' + missing.join(', '));

  const modules = manifestModules(loaderBlocks[i]);
  const aliases = registrationAliases(aliasBlocks[i]);
  const mismatches = [];
  for (const id of requiredIds) {
    const expected = 'stem_lab/' + registered.get(id);
    const resolved = resolveRegisteredModule(id, modules, aliases);
    if (resolved !== expected) {
      mismatches.push(id + ' -> ' + (resolved || '<unresolved>') + ' (expected ' + expected + ')');
    }
  }
  if (mismatches.length) fail(SHELL_COPIES[i] + ' retry resolver mismatches: ' + mismatches.join(', '));
}

const retryAliasPins = new Map([
  ['alphaFoldExplorer', 'stem_lab/stem_tool_alphafold.js'],
  ['cellAtlasLab', 'stem_lab/stem_tool_cellatlas.js'],
  ['renewablesLab', 'stem_lab/stem_tool_renewables.js'],
]);
const canonicalAliases = registrationAliases(aliasBlocks[0]);
for (const [id, mod] of retryAliasPins) {
  if (canonicalAliases.get(id) !== mod) fail(id + ' retry alias must resolve to ' + mod);
}

const explicit = new Map([
  ['heatLab', 'stem_tool_heatlab.js'],
  ['nuclearLab', 'stem_tool_nuclearlab.js'],
]);
for (const [id, file] of explicit) {
  if (registered.get(id) !== file) fail(id + ' must register from ' + file);
  if (!tiles.has(id)) fail(id + ' must have a catalog tile');
  if (!fallbacks.has(id)) fail(id + ' must be in _pluginOnlyTools');
  for (let i = 0; i < loaderBlocks.length; i++) {
    if (loaderBlocks[i].indexOf(file) === -1) fail(SHELL_COPIES[i] + ' must load ' + file);
  }
}

const shellRecoveryMarkers = [
  'PluginStates',
  '__alloEnsureStemPluginLoaded',
  'loadStemModuleWithDependencies',
  'stemModuleDependencies',
  'stem_data_cellatlas_muraro.js',
  'data_kernel_loader.js',
  'stem_tool_dataplot.js',
  'stem_tool_statslab.js',
  'stem_lumen_study.js',
  's.async = true',
  '__alloGetStemPluginState',
  '__alloRetryStemPlugin',
  'data-allo-plugin-attempt',
  'The plugin took longer than 20 seconds to load',
];
for (let i = 0; i < SHELL_COPIES.length; i++) {
  const rel = SHELL_COPIES[i];
  const src = shellSources[i];
  for (const marker of shellRecoveryMarkers) {
    if (src.indexOf(marker) === -1) fail(rel + ' is missing loader recovery marker: ' + marker);
  }
}
for (const marker of ['could not load', 'Retry loading ', "'aria-busy': 'true'"]) {
  if (canonicalModule.indexOf(marker) === -1) fail(MODULE_COPIES[0] + ' is missing fallback UI marker: ' + marker);
}

for (const marker of ['__alloEnsureStemPluginLoaded', 'onMouseEnter', 'onFocus', '_stemOpenerRef', '_stemFocusableElements', 'document.activeElement === root', 'data-stem-scroll-region', 'data-stem-tool-id']) {
  if (canonicalModule.indexOf(marker) === -1) fail(MODULE_COPIES[0] + ' is missing demand-load/accessibility marker: ' + marker);
}
const altOneHelp = canonicalModule.indexOf('"Alt+1"');
const exploreHelp = canonicalModule.indexOf('"Explore tab"', altOneHelp);
const altTwoHelp = canonicalModule.indexOf('"Alt+2"', exploreHelp);
const createHelp = canonicalModule.indexOf('"Create tab"', altTwoHelp);
if (altOneHelp === -1 || exploreHelp - altOneHelp > 600 || altTwoHelp - exploreHelp > 600 || createHelp - altTwoHelp > 600) {
  fail(MODULE_COPIES[0] + ' has shortcut help that does not match the Alt+1 Explore / Alt+2 Create handlers');
}
const scrollRegionCount = (canonicalModule.match(/\x22data-stem-scroll-region\x22:\s*\x22true\x22/g) || []).length;
if (scrollRegionCount !== 1) {
  fail(MODULE_COPIES[0] + ' must define exactly one named STEM scroll region (found ' + scrollRegionCount + ')');
}

if (failures.length) {
  console.error('\nSTEM reachability gate failed (' + failures.length + ')');
  for (const message of failures) console.error('  - ' + message);
  process.exit(1);
}

if (!QUIET) {
  console.log('STEM reachability gate passed: ' + requiredIds.size + ' visible registrations, ' + requiredFiles.size + ' plugin files, ' + MODULE_COPIES.length + ' host mirrors, ' + SHELL_COPIES.length + ' loader mirrors.');
}
