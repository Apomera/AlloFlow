import fs from 'node:fs';
import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';

const sourcePath = 'stem_lab/stem_tool_dna.js';
const publicPath = 'desktop/web-app/public/stem_lab/stem_tool_dna.js';

describe('DNA Lab chart and table semantics', () => {
  it('keeps source and public mirrors identical', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const mirror = fs.readFileSync(publicPath, 'utf8');
    expect(crypto.createHash('sha256').update(source).digest('hex'))
      .toBe(crypto.createHash('sha256').update(mirror).digest('hex'));
  });

  it('names the WebGL canvas and population-regime chart', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("'aria-label': dnaGlAlt");
    expect(source).toContain('stem.dna.population_mutation_chart');
    expect(source).toContain("role: 'img'");
  });

  it('marks DNA comparison table headers as column headers', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    const matches = source.match(/scope: 'col'/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(14);
  });
});
