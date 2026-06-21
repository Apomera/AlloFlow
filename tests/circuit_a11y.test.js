// circuit a11y: the Ohm's-law sliders now announce the COMPUTED RESULT via
// aria-valuetext (a blind student turning the knob hears "current 3.000 amps",
// not just "12"). Also confirms the announced value is physically correct
// (I = V/R, P = V·I) — so the a11y string can't drift from the real result.

import { describe, it, expect, beforeEach } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// The Ohm inquiry section (expSection='ohmInquiry') renders the V + R sliders.
function ohm(iq) {
  return renderTool('circuit', {
    circuit: {
      expSection: 'ohmInquiry',
      ohmInquiry: Object.assign({ voltage: 9, resistance: 100, hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] }, iq),
    },
  });
}

beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_circuit.js', 'circuit'); });

describe('circuit — Ohm-law sliders announce the computed result', () => {
  it('default 9 V / 100 Ω → current 0.090 A on the sliders', () => {
    expect(/aria-valuetext="[^"]*current 0\.090 amps/.test(ohm({}))).toBe(true);
  });
  it('12 V / 4 Ω → current 3.000 A, power 36.000 W (I = V/R, P = V·I)', () => {
    const html = ohm({ voltage: 12, resistance: 4 });
    expect(html).toContain('current 3.000 amps');
    expect(html).toContain('power 36.000 watts');
  });
  it('the V and R sliders are labeled (they previously had no aria-label)', () => {
    const html = ohm({});
    expect(html).toContain('aria-label="Voltage"');
    expect(html).toContain('aria-label="Resistance"');
  });
});
