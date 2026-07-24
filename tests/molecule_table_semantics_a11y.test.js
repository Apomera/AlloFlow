import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const sourcePath = path.join(root, 'stem_lab', 'stem_tool_molecule.js');
const deployPath = path.join(root, 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_molecule.js');
const source = fs.readFileSync(sourcePath, 'utf8');

describe('Molecule Lab table semantics', () => {
  it('associates every thead cell with its data column', () => {
    const headerLines = source
      .split('\n')
      .filter((line) => line.includes("React.createElement('th'"));

    expect(headerLines).toHaveLength(23);
    for (const line of headerLines) {
      expect(line).toContain("scope: 'col'");
    }
  });

  it('keeps the source and deploy copies identical', () => {
    expect(fs.readFileSync(deployPath, 'utf8')).toBe(source);
  });
});
