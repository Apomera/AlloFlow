import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const babel = require('@babel/core');

const ROOT = process.cwd();
const norm = (s) => s.replace(/\r\n/g, '\n');

function expectedCompiled(srcFile, modFile, guardKey) {
  const src = readFileSync(resolve(ROOT, srcFile), 'utf8');
  const compiled = babel.transformSync(src, {
    plugins: ['@babel/plugin-transform-react-jsx'],
    configFile: false,
    babelrc: false,
  }).code;
  const a11yLine = modFile === 'persona_ui_module.js'
    ? '  // WCAG 2.2 AA: Accessibility CSS\n  if (!document.getElementById("persona-ui-module-a11y")) { var _s = document.createElement("style"); _s.id = "persona-ui-module-a11y"; _s.textContent = "@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; } }"; document.head.appendChild(_s); }\n'
    : '';
  return (
    '(function() {\n'
    + "'use strict';\n"
    + a11yLine
    + `if (window.AlloModules && window.AlloModules.${guardKey}) { console.log('[CDN] ${guardKey} already loaded, skipping'); return; }\n`
    + compiled
    + '\n})();\n'
  );
}

describe('delegated COMPILE_PAIRS build determinism', () => {
  const PAIRS = [
    ['TTS', '_build_tts_module.js', 'tts_source.jsx', 'tts_module.js', 'desktop/web-app/public/tts_module.js', 'TTS'],
    ['Personas', '_build_personas_module.js', 'personas_source.jsx', 'personas_module.js', 'desktop/web-app/public/personas_module.js', 'Personas'],
    ['PersonaUI', '_build_persona_ui_module.js', 'persona_ui_source.jsx', 'persona_ui_module.js', 'desktop/web-app/public/persona_ui_module.js', 'PersonaUIModule'],
    ['BrandProfileEditor', '_build_brand_profile_editor_module.js', 'brand_profile_editor_source.jsx', 'brand_profile_editor_module.js', 'desktop/web-app/public/brand_profile_editor_module.js', 'BrandProfileEditor'],
  ];

  it('shipped root and public modules match build.js canonical Babel compile output', () => {
    for (const [, , srcFile, modFile, pubFile, guardKey] of PAIRS) {
      const expected = expectedCompiled(srcFile, modFile, guardKey);
      const rootMod = readFileSync(resolve(ROOT, modFile), 'utf8');
      const pubMod = readFileSync(resolve(ROOT, pubFile), 'utf8');
      expect(norm(rootMod), modFile).toBe(norm(expected));
      expect(norm(pubMod), pubFile).toBe(norm(expected));
    }
  });

  it('standalone _build_*_module.js scripts and build.js --compile-only stay deterministic with zero byte drift', () => {
    const before = Object.fromEntries(PAIRS.map(([, , , modFile]) => [modFile, readFileSync(resolve(ROOT, modFile), 'utf8')]));

    for (const [, buildScript] of PAIRS) {
      execFileSync(process.execPath, [resolve(ROOT, buildScript)], { cwd: ROOT, stdio: 'pipe' });
    }
    execFileSync(
      process.execPath,
      [resolve(ROOT, 'build.js'), `--compile-only=${PAIRS.map(([name]) => name).join(',')}`],
      { cwd: ROOT, stdio: 'pipe' },
    );

    for (const [, , , modFile] of PAIRS) {
      expect(readFileSync(resolve(ROOT, modFile), 'utf8'), modFile).toBe(before[modFile]);
    }
  }, 60000);
});
