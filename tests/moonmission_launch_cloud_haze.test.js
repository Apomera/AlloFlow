/**
 * Aerial perspective for the launch cloud layer. A farther (smaller) cloud is seen
 * through more air, so the loop blends its colours toward the sky's horizon haze,
 * softens its edge and deepens its base. The option is opt-in: without it the cloud
 * draws exactly as before. These pin the default colours, the blend, and the haze
 * curve the loop uses.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js';
let P;
beforeEach(() => {
  resetStemLab();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  loadTool(FILE, 'moonMission');
  P = window.MoonMissionPure;
});
afterEach(() => vi.restoreAllMocks());

function recorder() {
  const gradients = [], strokes = [], state = { globalAlpha: 1 };
  const gradient = () => { const g = { stops: [], addColorStop: (o, c) => g.stops.push(String(c)) }; gradients.push(g); return g; };
  const ctx = new Proxy(state, {
    get: (target, key) => key === 'createLinearGradient' || key === 'createRadialGradient' ? gradient
      : key === 'stroke' ? () => strokes.push({ style: target.strokeStyle, width: target.lineWidth })
      : key in target ? target[key] : () => {},
    set: (target, key, value) => { target[key] = value; return true; },
  });
  return { ctx, gradients, strokes };
}
const rgba = (s) => s.match(/[\d.]+/g).map(Number);

describe('launch cloud aerial perspective', () => {
  it('draws exactly the original colours when no atmosphere is given', () => {
    const rec = recorder();
    P.drawLaunchCloud(rec.ctx, 170, 130, 48, 2, { x: 0.6, y: -0.8 });
    expect(rec.gradients[0].stops).toEqual(['rgba(255,253,244,0.98)', 'rgba(242,247,250,0.98)', 'rgba(192,208,224,0.98)', 'rgba(137,160,185,0.98)']);
    expect(rec.gradients.slice(1, -1).every((g) => g.stops.join() === 'rgba(255,255,252,0.3),rgba(250,252,255,0.16),rgba(246,250,255,0)')).toBe(true);
    expect(rec.gradients.at(-1).stops).toEqual(['rgba(92,116,144,0)', 'rgba(92,116,144,0.18)']);
    expect(rec.strokes).toEqual([{ style: 'rgba(221,233,243,0.14)', width: 0.075 }]);
  });

  it('blends every body colour toward the haze by the amount, keeps opacity, fades highlights and softens the edge', () => {
    const haze = [150, 198, 236], amount = 0.4, plain = recorder(), hazy = recorder();
    P.drawLaunchCloud(plain.ctx, 170, 130, 48, 2, { x: 0.6, y: -0.8 });
    P.drawLaunchCloud(hazy.ctx, 170, 130, 48, 2, { x: 0.6, y: -0.8 }, { haze, amount });
    expect(hazy.gradients.length).toBe(plain.gradients.length);
    plain.gradients[0].stops.forEach((stop, i) => {
      const [r, g, b, a] = rgba(stop), got = rgba(hazy.gradients[0].stops[i]);
      expect(got).toEqual([Math.round(r + (haze[0] - r) * amount), Math.round(g + (haze[1] - g) * amount), Math.round(b + (haze[2] - b) * amount), a]);
    });
    const highlight = rgba(hazy.gradients[1].stops[0]);
    expect(highlight[3], 'highlights fade with distance').toBeCloseTo(0.3 * (1 - amount), 3);
    expect(hazy.strokes.length, 'a wide soft edge, then the fringe').toBe(2);
    expect(hazy.strokes[0].width).toBeGreaterThan(hazy.strokes[1].width);
    // A far cloud is paler against the sky than the same cloud near: closer to the haze colour.
    const lit = rgba(hazy.gradients[0].stops[0]), white = rgba(plain.gradients[0].stops[0]);
    expect(Math.abs(lit[0] - haze[0])).toBeLessThan(Math.abs(white[0] - haze[0]));
  });

  it('gives farther clouds more haze, within bounds, and none for unusable input', () => {
    let previous = Infinity;
    for (const nearness of [0.6, 0.8, 0.9, 1, 1.05, 1.2, 1.3, 1.6]) {
      const amount = P.launchCloudHaze(nearness);
      expect(amount).toBeGreaterThanOrEqual(0); expect(amount).toBeLessThanOrEqual(0.55);
      expect(amount, 'nearer is clearer').toBeLessThanOrEqual(previous);
      previous = amount;
    }
    expect(P.launchCloudHaze(0.8)).toBeGreaterThan(P.launchCloudHaze(1.2));
    expect(P.launchCloudHaze(1.3)).toBe(0);
    for (const bad of [NaN, Infinity, undefined, '1']) expect(P.launchCloudHaze(bad)).toBe(0);
    // Malformed atmosphere falls back to the original drawing.
    const rec = recorder();
    P.drawLaunchCloud(rec.ctx, 170, 130, 48, 2, { x: 0.6, y: -0.8 }, { haze: [1, 2], amount: 0.5 });
    expect(rec.gradients[0].stops[0]).toBe('rgba(255,253,244,0.98)');
  });
});
