import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync('stem_lab/stem_tool_universe.js', 'utf8');
const start = source.indexOf('  function universeFlightResource(file) {');
const end = source.indexOf('  function loadUniverseFlight() {', start);
if (start < 0 || end < start) throw new Error('Resource resolver unavailable');
const resolver = source.slice(start, end);

function resolve(file, script = null, scripts = [], baseURI = 'https://example.test/app/index.html') {
  return runInNewContext(resolver + '\nuniverseFlightResource(file);', {
    URL, file, universeFlightScript: script,
    document: { baseURI, querySelectorAll: () => scripts.map(src => ({ src })) },
  });
}

describe('Universe flight module and preview resource URLs', () => {
  it('resolves both assets beside a CDN module and retains its version query', () => {
    const script = 'https://cdn.example.test/release/stem_lab/stem_tool_universe.js?v=42#module';
    expect(resolve('universe_flight_scene.js', script)).toBe('https://cdn.example.test/release/stem_lab/universe_flight_scene.js?v=42');
    expect(resolve('assets/universe-flight/highlights/nebula-filaments.webp', script)).toBe('https://cdn.example.test/release/stem_lab/assets/universe-flight/highlights/nebula-filaments.webp?v=42');
  });

  it('finds the loaded module when an inline host leaves currentScript empty', () => {
    const scripts = ['https://bad.example.test/not_stem_tool_universe.js', 'https://cdn.example.test/nested/stem_lab/stem_tool_universe.js?build=7'];
    expect(resolve('assets/universe-flight/highlights/halo-cluster.webp', null, scripts)).toBe('https://cdn.example.test/nested/stem_lab/assets/universe-flight/highlights/halo-cluster.webp?build=7');
    expect(resolve('universe_flight_scene.js', null, scripts)).toBe('https://cdn.example.test/nested/stem_lab/universe_flight_scene.js?build=7');
  });

  it('preserves the existing relative fallback for nested and desktop file hosts', () => {
    expect(resolve('universe_flight_scene.js')).toBe('https://example.test/app/stem_lab/universe_flight_scene.js');
    expect(resolve('assets/universe-flight/highlights/stellar-blue.webp', null, [], 'file:///C:/Example/app/index.html')).toBe('file:///C:/Example/app/stem_lab/assets/universe-flight/highlights/stellar-blue.webp');
  });
});
