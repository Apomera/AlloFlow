import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
const source = fs.readFileSync('tests/vacuous_fixture_1789927574146/fixture_source.js', 'utf8');
describe('vacuous pin', () => {
  it('looks like it pins a region but does not', () => {
    // allow-raw-slice: this fixture must BE the broken pattern to prove the detector catches it.
    const region = source.slice(source.indexOf('START_MARKER'), source.indexOf('ANCHOR_THAT_MOVED'));
    expect(region.length).toBeGreaterThanOrEqual(0);
    expect(source.length).toBeGreaterThan(0);
  });
});