// Genetics correctness for the Punnett Lab cross engine, exercised through the
// rendered cross sub-tool. The headline fix this pins: the monohybrid GENOTYPE
// ratio now normalizes heterozygotes (dominant-allele-first), so Tt × Tt reads
// the correct 1 TT : 2 Tt : 1 tt instead of splitting the heterozygote into
// "Tt" + "tT" (a wrong 1:1:1:1). Phenotype ratios were already correct and are
// unchanged. Verified by hand in docs/punnett_lab_review.md.

import { describe, it, expect, beforeEach } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// punnett reads state from ctx.toolData.punnett; default sub-tool is the cross.
function renderCross(state) {
  return renderTool('punnett', { punnett: Object.assign({ subtool: 'cross' }, state) });
}

beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_punnett.js', 'punnett'); });

describe('punnett — monohybrid genotype ratio (heterozygote normalized)', () => {
  it('Tt × Tt (complete) → TT 1 : Tt 2 : tt 1, no split het', () => {
    const html = renderCross({ inheritMode: 'complete', parent1: ['T', 't'], parent2: ['T', 't'] });
    expect(html).toContain('Tt: 2/4');     // the merged heterozygote
    expect(html).not.toContain('tT');       // never the reversed-order genotype
  });
  it('default Aa × Aa shows Aa: 2/4 (not aA)', () => {
    const html = renderCross({});
    expect(html).toContain('Aa: 2/4');
    expect(html).not.toContain('aA');
  });
  it('Rr × Rr (incomplete dominance) → Rr: 2/4', () => {
    const html = renderCross({ inheritMode: 'incomplete', parent1: ['R', 'r'], parent2: ['R', 'r'] });
    expect(html).toContain('Rr: 2/4');
    expect(html).not.toContain('rR');
  });
  it('AB × AB (codominant) → AB: 2/4 (not BA)', () => {
    const html = renderCross({ inheritMode: 'codominant', parent1: ['A', 'B'], parent2: ['A', 'B'] });
    expect(html).toContain('AB: 2/4');
    expect(html).not.toContain('BA');
  });
  it('test cross Bb × bb stays 1:1 (Bb: 2/4 | bb: 2/4)', () => {
    const html = renderCross({ inheritMode: 'complete', parent1: ['B', 'b'], parent2: ['b', 'b'] });
    expect(html).toContain('Bb: 2/4');
    expect(html).toContain('bb: 2/4');
  });
});

describe('punnett — Punnett square table a11y', () => {
  it('exposes both row and column header scopes', () => {
    const html = renderCross({ inheritMode: 'complete', parent1: ['T', 't'], parent2: ['T', 't'] });
    expect(/scope="col"/.test(html)).toBe(true);
    expect(/scope="row"/.test(html)).toBe(true);
  });

  it('states the equal-gamete and independent-assortment model limits', () => {
    const html = renderCross({});
    expect(html).toContain('The square is a model.');
    expect(html).toContain('Equal boxes assume equal gamete frequencies');
  });
});

describe('punnett — refined inheritance explanations', () => {
  it('does not claim all-intermediate offspring require heterozygous parents', () => {
    const html = renderCross({ inheritMode: 'incomplete', parent1: ['R', 'R'], parent2: ['r', 'r'] });
    expect(html).toContain('100% intermediate phenotype');
    expect(html).toContain('parents contribute different homozygous alleles');
    expect(html).not.toContain('100% blended phenotype');
  });

  it('identifies classic classroom human traits as complex rather than Mendelian', () => {
    const html = renderTool('punnett', { punnett: { subtool: 'traits', _traitSelected: 0 } });
    expect(html).toContain('Tongue Rolling');
    expect(html).toContain('Complex trait; do not infer a genotype');
    expect(html).toContain('Filter traits by inheritance model');
  });
});

describe('punnett — population readout', () => {
  it('uses the latest simulated p value for genotype frequencies', () => {
    const html = renderTool('punnett', { punnett: { subtool: 'population', popFreqA: 0.5, popHistory: [0.5, 0.8] } });
    expect(html).toContain('Current modeled genotype frequencies at p 0.80');
    expect(html).toContain('64.0%');
    expect(html).toContain('32.0%');
    expect(html).toContain('4.0%');
  });

  it('associates population sliders with labels and names the sample graphic', () => {
    const html = renderTool('punnett', { punnett: { subtool: 'population' } });
    expect(html).toContain('for="punnett-pop-frequency"');
    expect(html).toContain('id="punnett-pop-frequency"');
    expect(html).toContain('role="img"');
    expect(html).toContain('Illustrative sample of');
  });
});
