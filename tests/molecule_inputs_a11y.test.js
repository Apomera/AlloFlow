import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const SOURCE = 'stem_lab/stem_tool_molecule.js';
const PUBLIC = 'desktop/web-app/public/stem_lab/stem_tool_molecule.js';

describe('Molecule molarity calculator controls', () => {
  it('keeps the source and public bundle in sync', () => {
    expect(readFileSync(PUBLIC, 'utf8')).toBe(readFileSync(SOURCE, 'utf8'));
  });

  it('gives each numeric input an accessible name matching its visible label', () => {
    const source = readFileSync(SOURCE, 'utf8');
    expect(source).toContain("'aria-label': __alloT('stem.molecule.molarity_m_mol_l', 'Molarity (M, mol/L)')");
    expect(source).toContain("'aria-label': __alloT('stem.molecule.volume_l', 'Volume (L)')");
    expect(source).toContain("'aria-label': __alloT('stem.molecule.molecular_weight_g_mol', 'Molecular weight (g/mol)')");
  });
});
