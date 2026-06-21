// chemBalance correctness — the molar-mass calculator (parseFormula), exercised
// through the rendered Stoichiometry tab. Locks the formula parser (nested
// parentheses + the newly-fixed hydrate dot) so the molar masses students rely on
// stay right. Element masses are the tool's own ELEMENTS table (H 1.008, O 15.999,
// Na 22.990, S 32.065, Ca 40.078, Cu 63.546). The 12 balance presets were verified
// correct by hand in docs/chem_balance_review.md.

import { describe, it, expect, beforeEach } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// chemBalance reads ctx.toolData.chemBalance with per-field defaults, so a partial
// state is fine. The stoich tab parses _stoichFormula and shows "Molar Mass: X g/mol".
function stoich(formula) {
  return renderTool('chemBalance', { chemBalance: { subtool: 'stoich', _stoichFormula: formula } });
}

beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_chembalance.js', 'chemBalance'); });

describe('chemBalance — molar mass (parseFormula)', () => {
  it('H2O = 18.015 g/mol', () => {
    expect(stoich('H2O')).toContain('Molar Mass: 18.015 g/mol');
  });
  it('NaCl = 58.443 g/mol', () => {
    expect(stoich('NaCl')).toContain('Molar Mass: 58.443 g/mol');
  });
  it('Ca(OH)2 = 74.092 g/mol (nested parentheses)', () => {
    expect(stoich('Ca(OH)2')).toContain('Molar Mass: 74.092 g/mol');
  });
  it('hydrate CuSO4·5H2O = 249.682 g/mol (all 5 waters, not 1)', () => {
    const html = stoich('CuSO4·5H2O');
    expect(html).toContain('Molar Mass: 249.682 g/mol');
    expect(html).not.toContain('177.622');        // the old one-water bug value
  });
  it('hydrate also parses with a period separator (CuSO4.5H2O)', () => {
    expect(stoich('CuSO4.5H2O')).toContain('Molar Mass: 249.682 g/mol');
  });
});
