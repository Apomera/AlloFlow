// Global test setup. Loads the pure_helpers IIFE module against a jsdom
// window and exposes window.AlloModules.PureHelpers for the test suite.
//
// We also place the `diff` package onto window.Diff (the jsdiff API
// `diffWordsWithSpace` is what _applyTextSurgery expects).

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as Diff from 'diff';

// Expose jsdiff under the name the IIFE expects.
// jsdiff exports diffWordsWithSpace; AlloFlow loads the same lib via jsdelivr
// and calls window.Diff.diffWordsWithSpace.
window.Diff = Diff;

// AlloModules is the registry the IIFE writes into.
window.AlloModules = window.AlloModules || {};

// Load the compiled module. It's an IIFE that registers
// window.AlloModules.PureHelpers when evaluated.
const modulePath = resolve(process.cwd(), 'pure_helpers_module.js');
const moduleSource = readFileSync(modulePath, 'utf-8');
// eslint-disable-next-line no-new-func
new Function(moduleSource)();

if (!window.AlloModules.PureHelpers) {
  throw new Error('Test setup failed: pure_helpers_module did not register');
}
