import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const atoms = {
  water: [
    { el: 'O', x: 200, y: 120 },
    { el: 'H', x: 140, y: 190 },
    { el: 'H', x: 260, y: 190 },
  ],
  carbonDioxide: [
    { el: 'C', x: 200, y: 150 },
    { el: 'O', x: 120, y: 150 },
    { el: 'O', x: 280, y: 150 },
  ],
  salt: [
    { el: 'Na', x: 160, y: 150 },
    { el: 'Cl', x: 240, y: 150 },
  ],
};

function render(formula, moleculeAtoms) {
  return renderTool('molecule', {
    molecule: {
      moleculeMode: 'viewer',
      formula,
      atoms: moleculeAtoms,
      bonds: moleculeAtoms.length === 2 ? [[0, 1]] : [[0, 1], [0, 2]],
    },
  });
}

beforeAll(() => {
  resetStemLab();
  loadTool('stem_lab/stem_tool_molecule.js', 'molecule');
});

describe('Molecule Lab shape and polarity lens', () => {
  it('explains water geometry and polarity without relying on color', () => {
    const html = render('H₂O', atoms.water);

    expect(html).toContain('Shape &amp; Polarity Lens');
    expect(html).toContain('Bent');
    expect(html).toContain('104.5°');
    expect(html).toContain('2 lone pairs on O');
    expect(html).toContain('O-H bond dipoles reinforce');
  });

  it('distinguishes polar bonds from a nonpolar CO2 molecule', () => {
    const html = render('CO₂', atoms.carbonDioxide);

    expect(html).toContain('Linear');
    expect(html).toContain('180°');
    expect(html).toContain('Nonpolar molecule');
    expect(html).toContain('equal and opposite, so they cancel');
  });

  it('identifies ionic presets as formula-unit representations', () => {
    const html = render('NaCl', atoms.salt);

    expect(html).toContain('Ionic compound');
    expect(html).toContain('Formula-unit representation');
    expect(html).toContain('repeating 3D ionic lattice, not separate NaCl molecules');
  });

  it('uses explicit non-planar coordinates for tetrahedral methane', () => {
    render('H₂O', atoms.water);
    const model = window.__alloMoleculeGeometryPure.getTeachingModel('CH₄');
    const hydrogenDepths = model.coordinates.slice(1).map((point) => point[2]);

    expect(model.shape).toBe('Tetrahedral');
    expect(model.angle).toBe('109.5°');
    expect(new Set(hydrogenDepths).size).toBeGreaterThan(1);
    expect(window.__alloMoleculeGeometryPure.normalizeFormula('C₆H₁₂O₆')).toBe('C6H12O6');
  });
});
