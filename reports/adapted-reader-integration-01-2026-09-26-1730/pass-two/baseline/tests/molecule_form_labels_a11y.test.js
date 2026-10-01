import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const sourcePath = path.join(root, 'stem_lab', 'stem_tool_molecule.js');
const deployPath = path.join(root, 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_molecule.js');
const source = fs.readFileSync(sourcePath, 'utf8');

describe('Molecule Lab form labels', () => {
  it('names the molecule-library search independently of its placeholder', () => {
    expect(source).toContain(
      "'aria-label': __alloT('stem.molecule.search_molecule_library', 'Search molecule library')",
    );
  });

  it('names each evidence checkbox from its visible evidence text', () => {
    expect(source).toContain("'aria-label': EVIDENCE_LABELS[ek]");
    expect(source).toContain('EVIDENCE_LABELS[ek]');
  });

  it('keeps the source and deploy copies identical', () => {
    expect(fs.readFileSync(deployPath, 'utf8')).toBe(source);
  });
});
