// Every file the app asks its on-demand loader for is one it is allowed to load.
//
// WHY (2026-11-16): window.__alloLoadPlugin(file) only loads a script that is
// on the approved delivery list embedded in the host file. That list is built
// from build.js (modules, loaders, PLUGIN_FILES, tool folders). The reader's
// English syllable table, syllable_table_en.js, was asked for by the syllable
// editor but was on none of those lists, so the loader refused it and the
// editor ran with no table. Nothing failed loudly: the loader answers false.
//
// This reads the real callers, the real embedded list and the real policy code.
import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const manifestTool = require(path.join(ROOT, 'dev-tools', 'build_browser_delivery_manifest.cjs'));
const CALL = /__alloLoadPlugin\(\s*(['"])([A-Za-z0-9_./-]+\.js)\1\s*\)/g;

// The files that ship: root scripts and sources, plus the two tool folders.
function shippedSources() {
  const files = ['AlloFlowANTI.txt'];
  for (const name of fs.readdirSync(ROOT)) {
    if (/\.(?:js|jsx)$/.test(name) && !name.startsWith('_build_') && fs.statSync(path.join(ROOT, name)).isFile()) files.push(name);
  }
  for (const dir of ['stem_lab', 'sel_hub']) {
    for (const name of fs.readdirSync(path.join(ROOT, dir))) {
      if (/\.js$/.test(name)) files.push(dir + '/' + name);
    }
  }
  return files;
}

function requestedFiles() {
  const callers = new Map();
  for (const file of shippedSources()) {
    const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
    if (text.indexOf('__alloLoadPlugin(') < 0) continue;
    for (const match of text.matchAll(CALL)) {
      if (!callers.has(match[2])) callers.set(match[2], new Set());
      callers.get(match[2]).add(file);
    }
  }
  return callers;
}

function approvalPolicy() {
  const manifest = manifestTool.readEmbeddedManifest(fs.readFileSync(path.join(ROOT, 'AlloFlowANTI.txt'), 'utf8'));
  const sandbox = { URL };
  vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'browser_delivery_policy.js'), 'utf8') + '\nthis.factory = _alloCreateBrowserDeliveryPolicy;', sandbox);
  return { manifest, policy: sandbox.factory(manifest, { baseUrl: 'https://alloflow-cdn.pages.dev/' }) };
}

describe('files requested through the on-demand loader', () => {
  const callers = requestedFiles();
  const { manifest, policy } = approvalPolicy();
  // The loader builds its URL this way (pluginCdnBase + file + '?v=' + pluginCdnVersion).
  const refusal = (file) => {
    try { policy.configureScript({}, 'https://alloflow-cdn.pages.dev/' + file + '?v=test'); return null; }
    catch (error) { return String(error && error.message); }
  };

  it('finds the callers it is meant to check', () => {
    expect(callers.size).toBeGreaterThanOrEqual(8);
    expect([...callers.keys()]).toContain('word_sounds_pronunciations.js');
    expect([...callers.keys()]).toContain('syllable_table_en.js');
  });

  it('are all on the approved delivery list', () => {
    const refused = [...callers.keys()].filter(file => refusal(file) !== null)
      .map(file => file + ' (asked for by ' + [...callers.get(file)].join(', ') + ')');
    expect(refused).toEqual([]);
  });

  it('the English syllable table is approved, pinned to its bytes, and present in every copy the app ships', () => {
    const file = 'syllable_table_en.js';
    expect(refusal(file)).toBeNull();
    const bytes = fs.readFileSync(path.join(ROOT, file));
    expect(manifest.assets[file].bytes).toBe(bytes.length);
    for (const dir of ['desktop/web-app/public', 'desktop/app-build', 'desktop/web-app/build']) {
      const copy = path.join(ROOT, dir, file);
      if (fs.existsSync(path.join(ROOT, dir))) expect(fs.readFileSync(copy).equals(bytes), dir + '/' + file).toBe(true);
    }
  });

  it('a file that is on no list is still refused', () => {
    expect(refusal('not_a_shipped_file.js')).toMatch(/not in the reviewed manifest/);
  });
});
