import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const sourcePath = path.join(root, 'stem_lab', 'stem_tool_molecule.js');
const deployPath = path.join(root, 'prismflow-deploy', 'public', 'stem_lab', 'stem_tool_molecule.js');
const source = fs.readFileSync(sourcePath, 'utf8');

describe('Molecule Lab SVG alternatives', () => {
  it('names the builder as an interactive group with keyboard instructions', () => {
    expect(source).toContain('role: "group"');
    expect(source).toContain('"Molecule builder workspace with "');
    expect(source).toContain('" atoms and "');
    expect(source).toContain('Tab to atoms and use arrow keys to move them.');
    expect(source).toContain('Bond and remove controls follow the workspace.');
  });

  it('describes the solvent polarity diagram with live scientific values', () => {
    expect(source).toContain(
      "role: 'img', 'aria-label': opt.label + ' polarity diagram: ' + opt.polarity + ', dipole ' + opt.dipole + ' debye.'",
    );
  });

  it('keeps the source and deploy copies identical', () => {
    expect(fs.readFileSync(deployPath, 'utf8')).toBe(source);
  });
});
