import { describe, expect, it } from 'vitest';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const files = [
  path.resolve(process.cwd(), 'stem_lab/stem_tool_bakingscience.js'),
  path.resolve(process.cwd(), 'desktop/web-app/public/stem_lab/stem_tool_bakingscience.js'),
];

describe('Baking Science oven control accessibility parity', () => {
  it('gives the oven-temperature range a localized accessible name', () => {
    for (const file of files) {
      const source = fs.readFileSync(file, 'utf8');
      const anchor = "id: 'oven-temp'";
      const index = source.indexOf(anchor);
      expect(index, `${file} should contain the oven control`).toBeGreaterThan(-1);
      const block = source.slice(index, index + 420);
      expect(block).toContain("'aria-label': __alloT('stem.bakingscience.oven_temperature', 'Oven temperature')");
    }
  });

  it('keeps source and public bundles byte-identical', () => {
    const hashes = files.map((file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'));
    expect(hashes[0]).toBe(hashes[1]);
  });
});
