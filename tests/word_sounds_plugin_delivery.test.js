// The app's plugin loader serves only scripts in the reviewed delivery
// manifest (browser_delivery_policy.js: "script is not in the reviewed
// manifest"). A file that Word Sounds or the packet code asks for by name must
// therefore be one the manifest builder selects, or the feature falls back in
// the deployed app without a word. Found 2026-11-11: the sound dictionary and
// the pronunciation file were loaded by name and were on no list.
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { discoverAssets } = require('../dev-tools/build_browser_delivery_manifest.cjs');

const SOURCES = ['word_sounds_core.js', 'word_sounds_module.js', 'word_sounds_setup_source.jsx', 'student_analytics_module.js', 'math_fluency_module.js'];
const QUOTE = '[\'"]';

function namedPlugins(text) {
  const names = new Set();
  const direct = new RegExp('__alloLoadPlugin\\(\\s*' + QUOTE + '([A-Za-z0-9_./-]+\\.js)' + QUOTE, 'g');
  for (const match of text.matchAll(direct)) names.add(match[1]);
  // The core loads its dictionary through a variable: file = 'word_sounds_phonemes_en.js'.
  const viaVariable = new RegExp('file\\s*=\\s*' + QUOTE + '([A-Za-z0-9_./-]+\\.js)' + QUOTE, 'g');
  if (/__alloLoadPlugin\(file\)/.test(text)) for (const match of text.matchAll(viaVariable)) names.add(match[1]);
  return [...names];
}

describe('scripts loaded by name are in the delivery manifest', () => {
  const assets = new Set(discoverAssets());
  const wanted = new Map();
  for (const source of SOURCES) for (const name of namedPlugins(readFileSync(source, 'utf8'))) wanted.set(name, (wanted.get(name) || []).concat(source));

  it('finds the files the code asks for', () => {
    for (const name of ['word_sounds_phonemes_en.js', 'word_sounds_pronunciations.js', 'word_sounds_take_home_loader.js', 'word_sounds_di_loader.js', 'packet_check_builder.js']) {
      expect([...wanted.keys()], name).toContain(name);
    }
  });

  it('every one is selected by the manifest builder and exists', () => {
    const missing = [...wanted.entries()].filter(([name]) => !assets.has(name)).map(([name, from]) => name + ' (asked for by ' + from.join(', ') + ')');
    expect(missing).toEqual([]);
    for (const name of wanted.keys()) expect(existsSync(name), name).toBe(true);
  });

  it('the check would catch a file on no list', () => {
    expect(namedPlugins("root.__alloLoadPlugin('made_up_helper.js')")).toEqual(['made_up_helper.js']);
    expect(assets.has('made_up_helper.js')).toBe(false);
  });
});
