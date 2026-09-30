import { beforeAll, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let P;
beforeAll(() => { resetStemLab(); loadTool(process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js', 'moonMission'); P = window.MoonMissionPure; });
function context() {
  const labels = [], points = [], gradient = () => ({ addColorStop() {} });
  const ctx = new Proxy({}, { get(t, k) { if (k === 'fillText') return text => labels.push(text); if (k === 'moveTo' || k === 'lineTo') return (x, y) => points.push([x, y]); if (k === 'measureText') return text => ({ width: text.length * 6 }); if (/^create.*Gradient$/.test(k)) return gradient; return t[k] || (() => {}); }, set(t, k, v) { t[k] = v; return true; } });
  return { ctx, labels, points };
}
describe('computed injection views', () => {
  it.each(['burn', 'orbit'])('uses equal axes and finite projected geometry in %s view', view => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const p = P.tliProfile();
    for (const time of [0, 130.5, 342]) {
      const c = context(), s = P.tliSample(p, time), g = P.drawTliScene(c.ctx, 288, 360, s, p, { view, orbitTime: P.orbitSnapshot(0).nextWindowTime });
      expect(g.scaleX).toBe(g.scaleY); expect(g.plume).toBe(time < 342);
      expect(Number.isFinite(g.craftX + g.craftY + g.heading)).toBe(true);
      expect(c.points.every(p => p.every(Number.isFinite))).toBe(true);
      expect(c.labels).toContain('Equal axes · spacecraft enlarged');
    }
    vi.restoreAllMocks();
  });
  it('rotation of the ignition checkpoint changes the forecast orientation but preserves physical values', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const p = P.tliProfile(), s = P.tliSample(p, 342), a = P.drawTliScene(context().ctx, 600, 360, s, p, { view: 'orbit', orbitTime: 0 });
    const b = P.drawTliScene(context().ctx, 600, 360, s, p, { view: 'orbit', orbitTime: P.orbitSnapshot(0).period / 4 });
    expect(b.heading - a.heading).toBeCloseTo(-Math.PI / 2, 10);
    expect(a.scaleX).toBe(b.scaleX); expect(P.tliSample(p, 342)).toEqual(s); vi.restoreAllMocks();
  });
});
