import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let P;
beforeAll(() => { vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null); resetStemLab(); loadTool(process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js', 'moonMission'); P = window.MoonMissionPure; });
afterAll(() => vi.restoreAllMocks());
function context() {
  const text = [], gradient = { addColorStop() {} };
  return { text, ctx: new Proxy({}, { get: (target, key) => key in target ? target[key] : key === 'fillText' ? value => text.push(value)
    : key === 'measureText' ? value => ({ width: String(value).length * 6 }) : key === 'createLinearGradient' || key === 'createRadialGradient' ? () => gradient : () => {},
    set: (target, key, value) => { target[key] = value; return true; } }) };
}
describe('measured return visuals', () => {
  it.each(['system', 'approach'])('%s view has one physical scale on both axes at phone and desktop sizes', view => {
    const p = P.returnProfile(), sample = P.returnSample(p, p.summary.duration - 500);
    for (const width of [300, 1000]) {
      const { ctx } = context(), picture = P.drawReturnScene(ctx, width, 400, sample, p, { view });
      expect(picture.scaleX).toBe(picture.scaleY); expect(picture.scaleX).toBeGreaterThan(0);
      expect(picture.craft.x - picture.earth.x).toBeCloseTo(sample.x * picture.scaleX, 10);
      expect(picture.craft.y - picture.earth.y).toBeCloseTo(-sample.y * picture.scaleY, 10);
      expect(picture.earthRadius).toBeCloseTo(P.entry.radius * picture.scaleX, 10);
    }
  });
  it('draws a velocity-aligned coasting spacecraft and switches to CM without an engine plume', () => {
    const p = P.returnProfile();
    for (const seconds of [0, p.summary.separationTime - 0.001, p.summary.separationTime, p.summary.duration]) {
      const sample = P.returnSample(p, seconds), { ctx, text } = context();
      const picture = P.drawReturnScene(ctx, 390, 400, sample, p, { view: 'approach' });
      expect(picture.velocityAngle).toBe(Math.atan2(-sample.vy, sample.vx));
      expect(picture.cmOnly).toBe(seconds >= p.summary.separationTime); expect(picture.plumeVisible).toBe(false);
      expect(text).toContain(picture.cmOnly ? 'CM ONLY / COAST' : 'CM + SM / COAST');
    }
  });
  it('holds the physical state across camera changes and renders Earth angular size from distance', () => {
    const p = P.returnProfile(), sample = P.returnSample(p, p.summary.duration - 900), before = JSON.stringify(sample);
    for (const view of ['system', 'approach']) {
      const { ctx, text } = context(), picture = P.drawReturnScene(ctx, 320, 400, sample, p, { view });
      expect(picture.angularRadius).toBeCloseTo(Math.asin(P.entry.radius / sample.radius) * 180 / Math.PI, 10);
      expect(text.join(' ')).toContain('Fixed Sun preset'); expect(JSON.stringify(sample)).toBe(before);
    }
  });
});
