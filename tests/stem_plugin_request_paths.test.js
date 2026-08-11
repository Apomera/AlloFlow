// Every path that activates a STEM tool must also REQUEST its plugin.
//
// The bug this guards (found 2026-08-11 from a Canvas Platform Diagnostics
// report: loader hooks present, no uncaught error, "no plugin has been
// requested this session"):
//
//   Activating a tool and loading it are separate steps. The plugin lives on the
//   CDN and is only fetched by __alloEnsureStemPluginLoaded. _openStemTool called
//   it; the palette/hub/handoff entry points set stemLabTool directly and did not.
//   The host then rendered its skeleton loader forever — the 20-second timeout is
//   armed *inside* the loader, so with no request there is no timeout and no error
//   card, just an infinite skeleton with nothing on screen to explain it.
//
// Source-content assertions: these entry points live in AlloFlowANTI.txt, which
// no test can execute, so the pin is that each setter is preceded by a request.

import fs from 'node:fs';
import { describe, it, expect, beforeAll } from 'vitest';

const ANTI = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt'];
const MODULE = 'stem_lab/stem_lab_module.js';
let sources;

beforeAll(() => {
  sources = ANTI.map((p) => ({ path: p, text: fs.readFileSync(p, 'utf8') }));
});

describe('STEM tool entry points request their plugin', () => {
  it('defines the shared request helper in both ANTI copies', () => {
    for (const { path, text } of sources) {
      expect(text, path).toContain('const _alloRequestStemPlugin = (id) =>');
      expect(text, path).toContain("typeof window.__alloEnsureStemPluginLoaded === 'function'");
    }
  });

  it('routes every external entry point through it', () => {
    for (const { path, text } of sources) {
      // the palette / AlloBot intent action — the most likely way a teacher opens
      // a tool without touching the Explore grid
      expect(text, path + ' openStemTool').toMatch(
        /openStemTool: \(id\) => \{ if \(!id\) return false; _alloRequestStemPlugin\(id\);/
      );
      expect(text, path + ' openLumen').toMatch(/openLumen: \(\) => \{ _alloRequestStemPlugin\('lumen'\);/);
      expect(text, path + ' openFreeForms').toMatch(/openFreeForms: \(\) => \{ _alloRequestStemPlugin\('freeForms'\);/);
      // generated-content handoff into a manipulative
      expect(text, path + ' item handoff').toMatch(/_alloRequestStemPlugin\(item\.toolId\);\s*[\r\n]+\s*setStemLabTool\(item\.toolId\);/);
      // free-forms import handoff
      expect(text, path + ' freeForms import').toMatch(/_alloRequestStemPlugin\('freeForms'\);\s*[\r\n]+\s*setStemLabTool\('freeForms'\);/);
    }
  });

  it('leaves no setStemLabTool(<id>) call without a preceding request', () => {
    for (const { path, text } of sources) {
      const lines = text.split(/\r?\n/);
      const offenders = [];
      lines.forEach((line, i) => {
        const m = line.match(/setStemLabTool\((?!null\))([^)]*)\)/);
        if (!m) return;
        // destructuring/prop-passing mentions are not calls that activate a tool
        if (/setStemLabTool[,}]/.test(line) || /setStemLabTool=\{/.test(line)) return;
        const window5 = lines.slice(Math.max(0, i - 5), i + 1).join('\n');
        if (!/_alloRequestStemPlugin\(/.test(window5)) offenders.push((i + 1) + ': ' + line.trim().slice(0, 90));
      });
      expect(offenders, path + ' — activates a tool without requesting its plugin:\n' + offenders.join('\n')).toEqual([]);
    }
  });
});

describe('host self-heals if a future entry point forgets', () => {
  it('requests the plugin when the skeleton renders with no load state', () => {
    const mod = fs.readFileSync(MODULE, 'utf8');
    // an empty status is the only state that never resolves on its own
    expect(mod).toMatch(/if \(!_pluginStatus\) \{[\s\S]{0,220}__alloEnsureStemPluginLoaded/);
  });

  it('keeps the error card for statuses that did resolve', () => {
    const mod = fs.readFileSync(MODULE, 'utf8');
    expect(mod).toContain("if (['error', 'loaded'].indexOf(_pluginStatus) !== -1) {");
  });
});
