import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  loadTool,
  renderTool,
  resetStemLab,
} from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = 'stem_lab/stem_tool_chembalance.js';
const DEPLOY =
  'desktop/web-app/public/stem_lab/stem_tool_chembalance.js';

function renderSubtool(subtool, data = {}) {
  const container = document.createElement('div');
  container.innerHTML = renderTool('chemBalance', {
    chemBalance: { subtool, _everPicked: true, ...data },
  });
  return container;
}

beforeEach(() => {
  window.localStorage.clear();
  resetStemLab();
  loadTool(SOURCE, 'chemBalance');
});

describe('ChemBalance SVG alternatives', () => {
  it('describes the live balance state and both atom totals', () => {
    const diagram = renderSubtool('balance').querySelector('svg[role="img"]');
    const label = diagram.getAttribute('aria-label');

    expect(label).toContain('Balance scale comparing reactant and product atom counts');
    expect(label).toMatch(/(?:Balanced|Not balanced)\./);
    expect(label).toContain('Reactant atoms:');
    expect(label).toContain('Product atoms:');
  });

  it('describes the selected molecular structure', () => {
    const diagram = renderSubtool('molecular').querySelector('svg[role="img"]');
    const label = diagram.getAttribute('aria-label');

    expect(label).toContain('Molecular structure diagram for');
    expect(label).toContain('formula');
    expect(label).toContain('shape');
    expect(label).toMatch(/with \d+ atoms and \d+ bonds\./);
  });

  it('describes the particle view as molecules, not loose atoms', () => {
    const view = renderSubtool('balance').querySelector('[data-testid="chem-particle-view"] svg[role="img"]');
    const label = view.getAttribute('aria-label');

    // The point of this diagram is that a coefficient multiplies WHOLE molecules,
    // so the alternative text has to carry the per-molecule breakdown as well.
    // "2 x H2O" on its own would leave a screen-reader user with exactly the
    // subscript-versus-coefficient confusion the picture exists to clear up.
    expect(label).toContain('Particle view of the equation as written');
    expect(label).toMatch(/Reactants: .*per molecule\)/);
    expect(label).toMatch(/Products: .*per molecule\)/);
    expect(label).toContain('Coefficients count whole molecules');
  });

  it('weighs the equation and says plainly whether mass is conserved', () => {
    // Water Formation solves at 2,1,2 - so 1,1,1 is unbalanced by construction.
    const unbalanced = renderSubtool('balance', { equation: 'Water Formation', coefficients: [1, 1, 1] })
      .querySelector('[data-testid="chem-mass-ledger"]');
    expect(unbalanced.textContent).toContain('Reactant mass');
    expect(unbalanced.textContent).toContain('Product mass');
    expect(unbalanced.textContent).toMatch(/create or destroy/);
    expect(unbalanced.getAttribute('aria-live')).toBe('polite');

    const balanced = renderSubtool('balance', { equation: 'Water Formation', coefficients: [2, 1, 2] })
      .querySelector('[data-testid="chem-mass-ledger"]');
    expect(balanced.textContent).toContain('Mass is conserved');
    // 2 H2 + O2 -> 2 H2O : 4.032 + 31.998 = 36.030 g, identical on both sides.
    expect(balanced.textContent).toContain('36.03');
  });

  it('draws each reaction type as particles with a described equation', () => {
    const card = renderSubtool('reactions', { _rxnOpen: 'combustion' })
      .querySelector('[data-testid="chem-rxn-pattern-combustion"] svg[role="img"]');
    const label = card.getAttribute('aria-label');

    expect(label).toContain('Particle diagram of the pattern');
    // Combustion is drawn with the real methane equation, so the picture is
    // itself balanced rather than a bare A + B placeholder pattern.
    expect(label).toContain('CH₄ + 2 O₂ → CO₂ + 2 H₂O');
    expect(label).toContain('Each circle is an atom');
  });

  it('every SVG declaration in source is described', () => {
    const lines = readFileSync(SOURCE, 'utf8').split(/\r?\n/);
    const declarations = lines.filter((line) => /h\(\s*['"]svg['"]/.test(line));

    // The count is pinned so a new diagram cannot be added inattentively. The
    // real invariant is the loop: every one of them must carry a description.
    expect(declarations).toHaveLength(4);
    for (const declaration of declarations) {
      expect(declaration).toMatch(/role:\s*['"]img['"]/);
      expect(declaration).toContain('aria-label');
    }
  });

  it('preserves byte-for-byte deploy parity', () => {
    expect(readFileSync(DEPLOY, 'utf8')).toBe(readFileSync(SOURCE, 'utf8'));
  });
});
