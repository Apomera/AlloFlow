import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
const source = readFileSync('stem_lab/stem_tool_printingpress.js','utf8');
const start = source.indexOf('  function ppScrewModel(');
const end = source.indexOf('  function ppNormalizePressRun(', start);
const model = new Function(source.slice(start,end) + ';return ppScrewModel;')();
describe('Printing Press ideal screw experiment', () => {
  it('converts centimetres to millimetres before comparing distances', () => {
    const result=model(20,10);
    expect(result.advantage).toBeCloseTo(40*Math.PI);
    expect(result.forceN).toBeCloseTo(400*Math.PI);
    expect(result.platenTravelMm).toBe(10);
  });
  it('doubling the bar doubles force and hand travel without changing platen travel', () => {
    const a=model(20,10), b=model(40,10);
    expect(b.forceN/a.forceN).toBeCloseTo(2);
    expect(b.handTravelMm/a.handTravelMm).toBeCloseTo(2);
    expect(b.platenTravelMm).toBe(a.platenTravelMm);
  });
  it('doubling pitch halves force while doubling platen travel', () => {
    const a=model(20,10), b=model(20,20);
    expect(b.forceN/a.forceN).toBeCloseTo(0.5);
    expect(b.platenTravelMm/a.platenTravelMm).toBe(2);
    expect(b.handTravelMm).toBe(a.handTravelMm);
  });
  it('conserves ideal work across the control range', () => {
    for(const bar of [10,20,40,60]) for(const pitch of [5,10,20]) {
      const m=model(bar,pitch);
      expect(m.forceN*m.platenTravelMm).toBeCloseTo(10*m.handTravelMm,7);
    }
  });
});
