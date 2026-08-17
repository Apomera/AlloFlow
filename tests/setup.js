// Global test setup. Provides:
// - jsdom window (configured by vitest.config.js with environment: 'jsdom')
// - window.Diff (jsdiff) — required by _applyTextSurgery in pure_helpers
// - window.AlloModules registry (each test file loads its own target module)
// - loadAlloModule(filename) helper — each test file calls this in beforeAll
//   to load its target IIFE module against the shared jsdom window.

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import * as Diff from 'diff';

window.Diff = Diff;
window.AlloModules = window.AlloModules || {};

// Many modules reference warnLog/debugLog as free variables (looked up in
// global scope at production runtime via the script-tag injection pattern).
// Stub them on globalThis so module loads don't throw ReferenceError.
if (typeof globalThis.warnLog !== 'function') globalThis.warnLog = () => {};
if (typeof globalThis.debugLog !== 'function') globalThis.debugLog = () => {};

// Loaded module cache so re-importing in multiple test files is a no-op.
const _loadedModules = new Set();

/**
 * Load an AlloFlow CDN module's IIFE against the jsdom window. After loading,
 * its exports are available at window.AlloModules.X (the registration name
 * baked into the IIFE).
 *
 * @param {string} filename - e.g. 'pure_helpers_module.js' (path is repo root)
 */
export function loadAlloModule(filename) {
  if (_loadedModules.has(filename)) return;
  const modulePath = resolve(process.cwd(), filename);
  const moduleSource = readFileSync(modulePath, 'utf-8');
  // Append a //# sourceURL so V8 attributes this eval'd script to the real file
  // path — this makes stack traces in module errors point at the file instead of
  // "<anonymous>". (Note: it does NOT make @vitest/coverage-v8 report the module —
  // that provider doesn't instrument new Function() eval'd scripts; see
  // vitest.config.js coverage note.) Appended at the END so existing line numbers
  // are unchanged.
  const sourceUrl = modulePath.replace(/\\/g, '/');
  // eslint-disable-next-line no-new-func
  new Function(moduleSource + '\n//# sourceURL=' + sourceUrl)();
  _loadedModules.add(filename);
}

/**
 * Register the production EPPP Part 1 lazy pack as an explicit test fixture.
 * The release module intentionally does not embed this 1,500-item payload.
 */
export function registerEpppPartOne(hub = window.AlloModules.TestPrepHub) {
  if (!hub || typeof hub.registerPack !== 'function') {
    throw new Error('TestPrepHub must be loaded before registering the EPPP Part 1 fixture');
  }
  const packPath = resolve(process.cwd(), 'test_prep/eppp_part_one_pack.json');
  const pack = JSON.parse(readFileSync(packPath, 'utf8'));
  return hub.registerPack(pack);
}

/**
 * Register the credential practice packs as explicit test fixtures.
 *
 * These are LAZY in the shipped module by design: embedding all 22 pushed the
 * bundle past Cloudflare's 25 MB per-file limit, which is what froze the CDN in
 * July, so the release build ships a manifest (26 entries, 24 lazy) and the hub
 * fetches each pack on demand. `hub.listPacks()` therefore returns only the two
 * eagerly embedded packs, and any suite that reaches for a credential pack
 * through it gets `undefined` — which reads exactly like a broken hub and is
 * not one.
 *
 * Pass the stems a suite actually needs; omit for all of them.
 */
export function registerCredentialPacks(stems, hub = window.AlloModules.TestPrepHub) {
  if (!hub || typeof hub.registerPack !== 'function') {
    throw new Error('TestPrepHub must be loaded before registering credential pack fixtures');
  }
  const dir = resolve(process.cwd(), 'test_prep');
  const wanted = Array.isArray(stems) && stems.length
    ? stems
    : readdirSync(dir).filter((n) => n.endsWith('_pack.json') && !n.startsWith('eppp_')).map((n) => n.slice(0, -'_pack.json'.length));
  const registered = [];
  for (const stem of wanted) {
    const packPath = resolve(dir, stem + '_pack.json');
    if (!existsSync(packPath)) continue;
    registered.push(hub.registerPack(JSON.parse(readFileSync(packPath, 'utf8'))));
  }
  return registered;
}
// For backwards compat with the original pure_helpers.test.js that expected
// pure_helpers to be auto-loaded by setup. New test files should NOT rely on
// this — they should call loadAlloModule explicitly in beforeAll.
loadAlloModule('pure_helpers_module.js');

if (!window.AlloModules.PureHelpers) {
  throw new Error('Test setup failed: pure_helpers_module did not register');
}
