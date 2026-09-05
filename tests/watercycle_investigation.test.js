import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
const files = ['stem_lab/stem_tool_watercycle.js', 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js'];
function kernel(file) {
  const source = readFileSync(file, 'utf8');
  const start = source.indexOf('  function wcLandResponse(');
  const end = source.indexOf('  if(!window.StemLab', start);
  const host = {};
  new Function('window', source.slice(start, end))(host);
  return host.WaterCycleInvestigationKernel;
}
describe.each(files)('Storm-to-stream evidence (%s)', file => {
  const k = kernel(file);
  it('compares cover while holding all other inputs constant', () => {
    const a = k.snapshot(k.inputs({ landCover: 'urban' }));
    const b = k.snapshot({ ...a.inputs, landCover: 'forest' });
    expect(k.fair(a.inputs, b.inputs)).toBe(true);
    expect(b.result.runoff).toBeLessThan(a.result.runoff);
    expect(b.result.infiltration).toBeGreaterThan(a.result.infiltration);
    for (const key of Object.keys(a.inputs).filter(x => x !== 'landCover')) {
      expect(k.fair(a.inputs, { ...b.inputs, [key]: typeof b.inputs[key] === 'number' ? b.inputs[key] + 1 : 'different' })).toBe(false);
    }
    expect(k.fair(a.inputs, a.inputs)).toBe(false);
  });
  it('keeps saved evidence independent of later control changes', () => {
    const input = k.inputs({ landCover: 'urban', landRainIntensity: 22 });
    const sample = k.snapshot(input);
    const recorded = JSON.stringify(sample);
    input.landRainIntensity = 100;
    input.landCover = 'forest';
    expect(JSON.stringify(sample)).toBe(recorded);
    expect(sample.result).toEqual(k.land(sample.inputs));
  });
  it('bounds independent indices and handles invalid numerical input', () => {
    for (const rain of [-10, 0, 55, 100, 200, NaN, Infinity]) {
      const result = k.land({ landRainIntensity: rain });
      for (const n of Object.values(result)) {
        expect(Number.isFinite(n)).toBe(true);
        expect(n).toBeGreaterThanOrEqual(0);
        expect(n).toBeLessThanOrEqual(100);
      }
    }
  });
});
