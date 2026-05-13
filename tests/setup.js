// Global test setup. Provides:
// - jsdom window (configured by vitest.config.js with environment: 'jsdom')
// - window.Diff (jsdiff) — required by _applyTextSurgery in pure_helpers
// - window.AlloModules registry (each test file loads its own target module)
// - loadAlloModule(filename) helper — each test file calls this in beforeAll
//   to load its target IIFE module against the shared jsdom window.

import { readFileSync } from 'node:fs';
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
  // eslint-disable-next-line no-new-func
  new Function(moduleSource)();
  _loadedModules.add(filename);
}

// For backwards compat with the original pure_helpers.test.js that expected
// pure_helpers to be auto-loaded by setup. New test files should NOT rely on
// this — they should call loadAlloModule explicitly in beforeAll.
loadAlloModule('pure_helpers_module.js');

if (!window.AlloModules.PureHelpers) {
  throw new Error('Test setup failed: pure_helpers_module did not register');
}
