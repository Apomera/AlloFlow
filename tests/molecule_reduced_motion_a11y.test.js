import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const sourcePath = path.join(root, 'stem_lab', 'stem_tool_molecule.js');
const deployPath = path.join(root, 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_molecule.js');
const source = fs.readFileSync(sourcePath, 'utf8');

describe('Molecule Lab reduced motion', () => {
  it('stops the selected-atom rotation when reduced motion is requested', () => {
    expect(source).toContain('className: "animate-spin motion-reduce:animate-none"');
    expect(source).not.toMatch(/className: "animate-spin"(?! motion-reduce:animate-none)/);
  });

  it('keeps the source and deploy copies identical', () => {
    expect(fs.readFileSync(deployPath, 'utf8')).toBe(source);
  });
});
