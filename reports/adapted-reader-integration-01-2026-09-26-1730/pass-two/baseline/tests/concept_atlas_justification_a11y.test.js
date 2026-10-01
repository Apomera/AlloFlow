import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourcePath = path.join(process.cwd(), 'arcade_mode_concept_atlas.js');

describe('Concept Atlas connection justification accessibility', () => {
  it('gives the connection justification textarea a programmatic accessible name', () => {
    const source = fs.readFileSync(sourcePath, 'utf8');
    expect(source).toContain("id: 'ca-just'");
    expect(source).toContain("'aria-label': 'Connection justification'");
  });
});
