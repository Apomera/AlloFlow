// The shell loads each STEAM Lab tile on demand: the tile's own script plus whatever `stemModuleDependencies`
// declares for it, and nothing else. A companion script that a tool consumes through a global therefore has to
// be either declared there or fetched by the tool itself, or it never reaches the live app while every harness,
// which loads files by hand, stays green.
//
// Two of those were live for months (both measured on the deployed build with Playwright):
//   - stem_tool_geometryworld_builder.js (the home chooser) was never fetched; every user landed on the legacy
//     lesson intro (fixed 2026-09-14).
//   - stem_lumen_documents.js was never fetched; Lumen's "Import files" stayed disabled with "The document
//     adapter is still loading" since 2026-07-17 (fixed 2026-09-15).
// The adapter was optional to its consumer, so nothing threw: the feature just never appeared.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const SHELLS = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt'];

function dependencyMap(source) {
  const start = source.indexOf('var stemModuleDependencies = {');
  expect(start).toBeGreaterThan(-1);
  const body = source.slice(start, source.indexOf('};', start));
  const map = {};
  for (const m of body.matchAll(/'(stem_lab\/[^']+)':\s*\[([^\]]*)\]/g)) map[m[1]] = Array.from(m[2].matchAll(/'([^']+)'/g)).map((x) => x[1]);
  return map;
}

describe('STEAM Lab companion scripts reach the live shell', () => {
  const files = readdirSync(resolve(ROOT, 'stem_lab')).filter((f) => f.endsWith('.js') && f !== 'stem_lab_module.js');
  const sources = Object.fromEntries(files.map((f) => [f, readFileSync(resolve(ROOT, 'stem_lab', f), 'utf8')]));
  const tools = files.filter((f) => /registerTool\(/.test(sources[f]));
  const companions = files.filter((f) => !tools.includes(f));
  // build.js is the deploy list: a companion it ships is one some tool is meant to use.
  const shipped = readFileSync(resolve(ROOT, 'build.js'), 'utf8');

  it('every shipped companion is either fetched by a tool itself or declared as a dependency, in both shell copies', () => {
    const orphans = [];
    for (const shell of SHELLS) {
      const source = readFileSync(resolve(ROOT, shell), 'utf8');
      const map = dependencyMap(source);
      const declared = new Set(Object.values(map).flat());
      for (const c of companions) {
        if (!shipped.includes("'stem_lab/" + c + "'")) continue; // not shipped: nothing to load
        const selfLoaded = tools.some((t) => sources[t].includes(c));
        if (!selfLoaded && !declared.has('stem_lab/' + c)) orphans.push(shell + ': ' + c);
      }
    }
    expect(orphans, 'declare the companion in stemModuleDependencies for the tool (or chain) that consumes it').toEqual([]);
  });

  it('the known chains are declared: Lumen (evidence + documents under study, study under the tool), Geometry World builder, Cell Atlas data', () => {
    for (const shell of SHELLS) {
      const map = dependencyMap(readFileSync(resolve(ROOT, shell), 'utf8'));
      expect(map['stem_lab/stem_lumen_study.js'], shell).toEqual(['stem_lab/stem_lumen_evidence.js', 'stem_lab/stem_lumen_documents.js']);
      expect(map['stem_lab/stem_tool_lumen.js'], shell).toEqual(['stem_lab/stem_lumen_study.js']);
      expect(map['stem_lab/stem_tool_geometryworld.js'], shell).toEqual(['stem_lab/stem_tool_geometryworld_builder.js']);
      expect(map['stem_lab/stem_tool_cellatlas.js'], shell).toEqual(['stem_lab/stem_data_cellatlas_muraro.js']);
    }
  });

  it('Lumen really consumes the adapter through a global the study file only reads', () => {
    expect(sources['stem_lumen_study.js']).toContain('return root && root.LumenDocuments;');
    expect(sources['stem_lumen_documents.js']).toContain('root.LumenDocuments = api;');
    expect(sources['stem_lumen_study.js']).toContain("'The document adapter is still loading.'");
  });
});
