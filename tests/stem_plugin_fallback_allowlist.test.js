import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

function read(rel) {
  return readFileSync(resolve(root, rel), 'utf8');
}

function collectRegisteredStemPluginIds() {
  const ids = new Map();
  for (const file of readdirSync(resolve(root, 'stem_lab'))) {
    if (!/^stem_tool_.*\.js$/.test(file) || file.endsWith('.bak')) continue;
    const src = read(`stem_lab/${file}`);
    const re = /window\.StemLab\.registerTool\s*\(\s*['"]([A-Za-z_$][A-Za-z0-9_$]*)['"]/g;
    let match;
    while ((match = re.exec(src))) ids.set(match[1], file);
  }
  return ids;
}

function collectFallbackIds(moduleRel) {
  const src = read(moduleRel);
  const match = src.match(/var _pluginOnlyTools\s*=\s*\{([\s\S]*?)\n\s*\};/);
  if (!match) throw new Error(`Could not find _pluginOnlyTools in ${moduleRel}`);
  return new Set([...match[1].matchAll(/\b([A-Za-z_$][A-Za-z0-9_$]*)\s*:\s*true/g)].map((m) => m[1]));
}

describe('STEM plugin fallback allowlist', () => {
  it('includes every real plugin-only registration so tiles do not render blank', () => {
    const registered = collectRegisteredStemPluginIds();
    const intentionalNonFallback = new Set([
      // 'arccity' was wrongly exempted here as "inline-rendered legacy tool" —
      // it never had an inline handler, so its tile rendered a blank content
      // area (fixed Jul 5 2026 by adding it to _pluginOnlyTools). Now enforced.
      'forge', // Tool Forge lives behind teacher-gated custom handling
      'myTool', // Tool Forge example/template registration
    ]);
    const required = [...registered.keys()]
      .filter((id) => !intentionalNonFallback.has(id))
      .sort();

    for (const moduleRel of [
      'stem_lab/stem_lab_module.js',
      'desktop/web-app/public/stem_lab/stem_lab_module.js',
    ]) {
      const fallbackIds = collectFallbackIds(moduleRel);
      const missing = required.filter((id) => !fallbackIds.has(id));
      expect(missing, `${moduleRel} is missing plugin fallback ids`).toEqual([]);
      expect(fallbackIds.has('dinoLab'), `${moduleRel} must route Dino Lab through plugin fallback`).toBe(true);
    }
  });
});
