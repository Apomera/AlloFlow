/**
 * The lunar-orbit insertion view looks down on the orbital plane, so it must not
 * show the near-side atlas (the wrong face). It draws a generic cratered regolith
 * under the same physical lighting instead of a flat grey disc, and names the Moon
 * beside the disc rather than on it. These pin that the texture only modulates the
 * lighting (bounded, deterministic), that crater walls brighten on the side facing
 * the displayed Sun, that the neutral image used elsewhere is unchanged, and the label.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js';
let P, uploads;
beforeEach(() => {
  resetStemLab();
  // A minimal 2-D context so the lighting sprite path runs in jsdom; record each image.
  uploads = [];
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function () {
    return { createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }),
      putImageData: (image) => uploads.push(image.data.slice()) };
  });
  loadTool(FILE, 'moonMission');
  P = window.MoonMissionPure;
});
afterEach(() => vi.restoreAllMocks());

function recorder() {
  const text = [], state = {};
  const ctx = new Proxy(state, {
    get: (target, key) => key === 'fillText' ? (s, x, y) => text.push({ s: String(s), x, y })
      : key === 'measureText' ? (s) => ({ width: String(s).length * 6 })
      : /^create(Linear|Radial|Conic)Gradient$/.test(String(key)) ? () => ({ addColorStop() {} })
      : key in target ? target[key] : () => {},
    set: (target, key, value) => { target[key] = value; return true; },
  });
  return { ctx, text };
}

describe('lunar-orbit regolith', () => {
  it('stays within its bounds, is deterministic, and is neutral off the disc', () => {
    let inside = 0, sum = 0;
    for (let u = -1.1; u <= 1.1; u += 0.02) for (let v = -1.1; v <= 1.1; v += 0.02) {
      const tone = P.lunarRegolithTone(u, v, 45);
      expect(tone, 'deterministic').toBe(P.lunarRegolithTone(u, v, 45));
      if (u * u + v * v > 1) { expect(tone, 'off the disc').toBe(1); continue; }
      expect(tone).toBeGreaterThanOrEqual(0.6); expect(tone).toBeLessThanOrEqual(1.25);
      inside++; sum += tone;
    }
    expect(inside).toBeGreaterThan(7000);
    // A tone, not a new brightness: the Moon as a whole stays close to the lit model.
    expect(sum / inside).toBeGreaterThan(0.82); expect(sum / inside).toBeLessThan(1.02);
  });

  it('brightens the inner crater wall that faces the displayed Sun; turning the Sun around swaps the walls', () => {
    const craters = P.lunarRegolithCraters().filter((c) => c.z > 0.5 && c.size > 0.06);
    expect(craters.length, 'large craters facing the camera').toBeGreaterThan(3);
    let checked = 0, agree = 0;
    for (const c of craters) {
      for (const angle of [45, 225, 135]) {
        const th = angle * Math.PI / 180, s = [Math.cos(th), Math.sin(th), 0];
        // Points on the inner wall, 0.9 crater radii from the centre ON THE SPHERE, toward
        // and away from the Sun: move along the Sun direction in the tangent plane.
        const along = s[0] * c.x + s[1] * c.y + s[2] * c.z, t = [s[0] - along * c.x, s[1] - along * c.y, s[2] - along * c.z];
        const tl = Math.hypot(...t); if (tl < 1e-6) continue;
        const onWall = (sign) => { const a = sign * 0.9 * c.size; return [c.x * Math.cos(a) + t[0] / tl * Math.sin(a), c.y * Math.cos(a) + t[1] / tl * Math.sin(a)]; };
        const toward = onWall(1), away = onWall(-1);
        if (toward.concat(away).some((n) => Math.abs(n) > 0.95)) continue;
        checked++;
        if (P.lunarRegolithTone(away[0], away[1], angle) > P.lunarRegolithTone(toward[0], toward[1], angle)) agree++;
      }
    }
    expect(checked).toBeGreaterThan(8);
    expect(agree / checked, 'the wall away from the Sun faces it and is lit').toBeGreaterThan(0.8);
  });

  it('leaves the neutral image unchanged and multiplies the lighting by the tone in the regolith image', () => {
    const plain = recorder(); P.drawLunarOrbitLight(plain.ctx, 128, 128, 128, 45);
    const textured = recorder(); P.drawLunarOrbitLight(textured.ctx, 128, 128, 128, 45, { regolith: true });
    expect(uploads.length, 'one sprite each').toBe(2);
    const [neutral, regolith] = uploads;
    let compared = 0, differs = 0;
    for (let y = 6; y < 256; y += 10) for (let x = 6; x < 256; x += 10) {
      const u = (x + 0.5) * 2 / 256 - 1, v = 1 - (y + 0.5) * 2 / 256, light = P.lunarOrbitSurfaceLight(u, v, 45);
      if (!light) continue;
      const i = (y * 256 + x) * 4, tone = P.lunarRegolithTone(u, v, 45);
      expect(Array.from(neutral.slice(i, i + 4)), 'neutral ' + x + ',' + y).toEqual([Math.round(190 * light.brightness), Math.round(190 * light.brightness), Math.round(183 * light.brightness), 255]);
      const lit = light.brightness * tone;
      expect(Array.from(regolith.slice(i, i + 4)), 'regolith ' + x + ',' + y).toEqual([Math.round(190 * lit), Math.round(190 * lit), Math.round(183 * lit), 255]);
      if (light.brightness === 0.055) expect(regolith[i], 'night stays at earthshine').toBeLessThanOrEqual(Math.round(190 * 0.055 * 1.25));
      compared++; if (regolith[i] !== neutral[i]) differs++;
    }
    expect(compared).toBeGreaterThan(400);
    expect(differs / compared, 'the texture is visible').toBeGreaterThan(0.3);
  });

  it('the insertion scene names the Moon beside the disc, not on its surface', () => {
    const profile = P.loiProfile();
    for (const [width, time] of [[700, 0], [390, 600]]) {
      const rec = recorder(), scene = P.drawLOIScene(rec.ctx, width, 340, P.loiSample(profile, time), profile, { time });
      const label = rec.text.find((t) => t.s === 'MOON');
      expect(label, width + 'px label').toBeTruthy();
      expect(Math.hypot(label.x - scene.moonX, label.y - scene.moonY), width + 'px label clear of the disc').toBeGreaterThan(scene.moonRadius);
    }
  });
});
