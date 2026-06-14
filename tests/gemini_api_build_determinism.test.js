// Regression guard for the recurring gemini_api drift (2026-06-13).
//
// gemini_api_source.jsx is PURE JS (no JSX) and ships RAW-WRAPPED in an IIFE —
// NOT Babel-compiled. build.js used to run it through compileJsx (Babel), which
// re-printed the source into a ~804-line form that fought the canonical 686-line
// output of _build_gemini_api_module.js (→ _build_simple_iife). Whichever builder
// ran last won, so gemini_api_module.js kept drifting to the bloated Babel form
// and had to be re-minified by hand on two consecutive deploys (@3271ffd0,
// @8bc35926). Fixed by making build.js raw-wrap gemini_api byte-for-byte like the
// per-module builder (commit: build.js GeminiAPI wrap).
//
// This test fails if anything drifts the module again — a reverted build.js, a
// wrong COMPILE_PAIRS entry, or a stray Babel pass — so the drift can never
// silently ship.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const src = readFileSync(resolve(ROOT, 'gemini_api_source.jsx'), 'utf8');
const mod = readFileSync(resolve(ROOT, 'gemini_api_module.js'), 'utf8');

// The canonical raw-wrap — IDENTICAL to _build_simple_iife.build({name:'gemini_api',
// guardKey:'GeminiAPI'}) and to build.js's GeminiAPI wrap(). Keep these three in sync.
const expected =
  '(function(){"use strict";\n'
  + 'if(window.AlloModules&&window.AlloModules.GeminiAPI){console.log("[CDN] GeminiAPI already loaded, skipping"); return;}\n'
  + src.trim() + '\n'
  + '})();\n';

describe('gemini_api_module.js build determinism', () => {
  it('is the raw-wrapped source (NOT Babel-compiled) — guards the recurring drift', () => {
    expect(mod).toBe(expected);
  });

  it('source contains no JSX (so raw-wrap, not compileJsx, is correct)', () => {
    expect(/<[A-Z][a-zA-Z]*[\s/>]|React\.createElement/.test(src)).toBe(false);
  });
});
