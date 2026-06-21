// Chemistry correctness for titrationLab's pH engine + the per-preset
// equivalence-volume fix + the screen-reader exposure of the live sim.
//
// calcPH is an inner closure (not exported), so we exercise it through the
// rendered lab and pin the values it produces in the live UI. Every pH below
// was verified by hand in docs/titration_lab_review.md (Henderson–Hasselbalch
// in the buffer region, conjugate-ion hydrolysis at equivalence, amphiprotic
// midpoints for the polyprotic acid). If a future edit changes the chemistry,
// these fail loudly.

import { describe, it, expect, beforeEach } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Reach the lab (past the mandatory safety walkthrough) with a controlled state
// bucket. titrationLab reads state from ctx.toolData.titrationLab.
function renderLab(state) {
  return renderTool('titrationLab', {
    titrationLab: Object.assign({ safetyChecked: true, labTab: 'titrate' }, state),
  });
}
// The CURRENT pH stat renders the value as a standalone element text node
// (`>7.00<`); the "pH "-prefixed equivalence labels and attribute values won't
// match this, so it isolates the current-pH readout.
function showsCurrentPH(html, v) {
  return new RegExp('>' + v.replace('.', '\\.') + '<').test(html);
}

beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_titration.js', 'titrationLab'); });

describe('titrationLab — pH engine (rendered, values verified by hand)', () => {
  const PH_CASES = [
    { name: 'strong acid 0.1 M, initial', state: { presetId: 'sa_sb', volumeAdded: 0 }, pH: '1.00' },
    { name: 'strong/strong at equivalence', state: { presetId: 'sa_sb', volumeAdded: 25 }, pH: '7.00' },
    { name: 'weak acid 0.1 M, initial', state: { presetId: 'wa_sb', volumeAdded: 0 }, pH: '2.87' },
    { name: 'weak/strong at half-equivalence (pH = pKa)', state: { presetId: 'wa_sb', volumeAdded: 12.5 }, pH: '4.74' },
    { name: 'weak/strong at equivalence (basic salt)', state: { presetId: 'wa_sb', volumeAdded: 25 }, pH: '8.72' },
    { name: 'strong/weak at equivalence (acidic salt)', state: { presetId: 'sa_wb', volumeAdded: 25 }, pH: '5.28' },
    { name: 'weak/weak at equivalence (~neutral)', state: { presetId: 'wa_wb', volumeAdded: 25 }, pH: '7.00' },
    { name: 'H3PO4 first equivalence (½(pKa1+pKa2))', state: { presetId: 'poly_h3po4', volumeAdded: 25 }, pH: '4.67' },
  ];
  for (const c of PH_CASES) {
    it(c.name + ' -> pH ' + c.pH, () => {
      expect(showsCurrentPH(renderLab(c.state), c.pH)).toBe(true);
    });
  }
});

describe('titrationLab — equivalence volume is per-preset (Veq fix)', () => {
  it('redox (5:1 Fe2+:MnO4-) reaches equivalence at 5 mL, not the acid-base 25', () => {
    const html = renderLab({ presetId: 'redox_kmno4' });
    expect(html).toContain('ₑ = 5.0 mL');        // "V<sub>e</sub> = 5.0 mL" stat
    expect(html).not.toContain('ₑ = 25.0 mL');
  });
  it('back-titration reaches equivalence at 30 mL, not the acid-base 50', () => {
    const html = renderLab({ presetId: 'back_antacid' });
    expect(html).toContain('ₑ = 30.0 mL');
    expect(html).not.toContain('ₑ = 50.0 mL');
  });
});

describe('titrationLab — live sim is exposed to screen readers', () => {
  it('volume slider announces the current pH via aria-valuetext', () => {
    const html = renderLab({ presetId: 'wa_sb', volumeAdded: 25 });
    expect(/aria-valuetext="[^"]*pH 8\.72/.test(html)).toBe(true);
  });
  it('the titration-curve SVG is labeled (role=img + aria-label)', () => {
    const html = renderLab({ presetId: 'sa_sb', volumeAdded: 10 });
    expect(/role="img"/.test(html)).toBe(true);
    expect(/aria-label="Titration curve/.test(html)).toBe(true);
  });
});

describe('titrationLab — LOW scientific-accuracy fixes', () => {
  it('weak-acid curve rises monotonically from the start (no H-H dip)', () => {
    // After the first trace of base the pH must be >= the initial 2.87, not dip
    // below it. With max(H-H, weak-acid-alone) the v=0.2 mL point reads 2.88.
    const html = renderLab({ presetId: 'wa_sb', volumeAdded: 0.2 });
    expect(showsCurrentPH(html, '2.88')).toBe(true);
    expect(showsCurrentPH(html, '2.65')).toBe(false); // the old dipped value
  });
  it('H3PO4 third equivalence uses the real phosphate concentration', () => {
    // [OH-]=sqrt((Kw/Ka3)·C), C = molesAcid/totalV ≈ 0.025 M (not CaP/1000).
    const html = renderLab({ presetId: 'poly_h3po4', volumeAdded: 75 });
    expect(showsCurrentPH(html, '12.36')).toBe(true);
  });
});
