/**
 * On a slow device the launch drops to half-resolution sky and ground images.
 * The loop watches real climbing frame intervals the whole way up: every 30th
 * frame, if more than a quarter of the last 60 came later than 20 ms, it switches
 * for the rest of that launch, and later launches start there. (A first version
 * judged only the first 30 frames, which end below 400 m, before the expensive
 * ground image appears, and never switched on a laptop that dropped to ~46 fps.)
 * These pin the decision, that full detail is untouched by the option, and that
 * half detail still samples the same physical sky and ground.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js';
let P;
beforeEach(() => {
  resetStemLab();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  loadTool(FILE, 'moonMission');   // a fresh load also resets the session memory
  P = window.MoonMissionPure;
});
afterEach(() => vi.restoreAllMocks());

const feed = (state, seconds, count) => { for (let i = 0; i < count; i++) P.launchQualityUpdate(state, seconds); return state; };

describe('launch image detail decision', () => {
  it('keeps full detail for a whole climb at 60 fps, for this launch and the next', () => {
    const state = feed(P.launchQualityStart(), 1 / 60, 600);
    expect(state.detail).toBe(1);
    expect(P.launchQualityStart().detail, 'next launch').toBe(1);
  });

  it('drops to half detail at the first check when frames run late, and later launches start there', () => {
    const state = feed(P.launchQualityStart(), 1 / 30, 29);
    expect(state.detail, 'no check before 30 frames').toBe(1);
    P.launchQualityUpdate(state, 1 / 30);
    expect(state.detail).toBe(0.5);
    feed(state, 1 / 120, 100);
    expect(state.detail, 'sticky for the rest of the launch').toBe(0.5);
    expect(P.launchQualityStart().detail, 'next launch').toBe(0.5);
  });

  it('keeps watching: a smooth start that slows down mid-climb still switches at the next check', () => {
    const state = feed(P.launchQualityStart(), 1 / 60, 90);
    expect(state.detail, 'smooth first 90 frames').toBe(1);
    feed(state, 1 / 30, 29);
    expect(state.detail, 'between checks').toBe(1);
    P.launchQualityUpdate(state, 1 / 30);   // frame 120: 30 of the last 60 were late
    expect(state.detail).toBe(0.5);
  });

  it('switches only when more than a quarter of the last 60 frames are later than 20 ms', () => {
    expect(P.launchLateFrame).toBe(0.02);
    // Every fourth frame late: 15 of 60 is a quarter, not more.
    const quarter = P.launchQualityStart();
    for (let i = 1; i <= 120; i++) P.launchQualityUpdate(quarter, i % 4 === 0 ? 0.03 : 1 / 60);
    expect(quarter.detail, 'a quarter late').toBe(1);
    // Exactly 20 ms is on time.
    expect(feed(P.launchQualityStart(), 0.02, 60).detail, 'exactly 20 ms').toBe(1);
    // One more late frame in the window tips it over at the frame-60 check
    // (the frame-30 check saw 7 of 30, which is not more than a quarter).
    const more = P.launchQualityStart(), late = (i) => i % 4 === 0 || i === 45 ? 0.03 : 1 / 60;
    for (let i = 1; i <= 59; i++) P.launchQualityUpdate(more, late(i));
    expect(more.detail, 'before the frame-60 check').toBe(1);
    P.launchQualityUpdate(more, late(60));
    expect(more.detail, '16 of 60 late').toBe(0.5);
  });

  it('ignores pauses and unusable intervals', () => {
    const state = P.launchQualityStart();
    for (const value of [0, -1, NaN, Infinity, 0.25, 3, undefined, null, '0.05']) P.launchQualityUpdate(state, value);
    expect([state.intervals, state.frames]).toEqual([[], 0]);
    expect(P.launchQualityUpdate(null, 0.05)).toBeNull();
  });
});

describe('half-detail launch images', () => {
  const sameBytes = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

  it('keeps the design resolution: 3 x 2 px sky texels (at most 256 x 200), ground cells 1/140 of the height', () => {
    // Full detail, then half detail (cells twice as large on each axis).
    for (const [width, full, half] of [[390, [130, 200], [65, 100]], [640, [214, 200], [107, 100]], [1100, [256, 200], [184, 100]]]) {
      const sky = P.launchAtmosphereGeometry(20000, width, 400), skyOne = P.launchAtmosphereGeometry(20000, width, 400, 1);
      const skyHalf = P.launchAtmosphereGeometry(20000, width, 400, 0.5);
      expect([sky.columns, sky.rows], width + 'px sky').toEqual(full);
      expect([skyOne.columns, skyOne.rows], width + 'px sky, detail 1').toEqual(full);
      expect([skyHalf.columns, skyHalf.rows], width + 'px half-detail sky').toEqual(half);
      const ground = P.launchSurfaceGeometry(20000, 40000, width, 400), groundHalf = P.launchSurfaceGeometry(20000, 40000, width, 400, 0.5);
      expect(ground.columns, width + 'px ground columns').toBe(Math.ceil(width / (400 / 140)));
      expect(ground.rows, width + 'px ground rows').toBe(Math.ceil((400 - ground.top) / (400 / 140)));
      expect(groundHalf.columns, width + 'px half-detail ground columns').toBe(Math.ceil(width / (400 / 70)));
      expect(groundHalf.rows, width + 'px half-detail ground rows').toBe(Math.ceil((400 - groundHalf.top) / (400 / 70)));
    }
  });

  it('leaves full detail byte-for-byte unchanged by the option', () => {
    for (const h of [0, 5000, 50000, 185000]) {
      const sky = P.launchAtmosphereGeometry(h, 1100, 400), skyOne = P.launchAtmosphereGeometry(h, 1100, 400, 1);
      expect([skyOne.columns, skyOne.rows]).toEqual([sky.columns, sky.rows]);
      expect(sameBytes(skyOne.pixels, sky.pixels), h + ' m sky').toBe(true);
      const ground = P.launchSurfaceGeometry(h, 40000, 1100, 400), groundOne = P.launchSurfaceGeometry(h, 40000, 1100, 400, 1);
      expect([groundOne.columns, groundOne.rows]).toEqual([ground.columns, ground.rows]);
      expect(sameBytes(groundOne.pixels, ground.pixels), h + ' m ground').toBe(true);
    }
  });

  it('builds about a quarter of the ground cells and well under half the sky cells', () => {
    for (const width of [390, 1100]) {
      const sky = P.launchAtmosphereGeometry(20000, width, 400), half = P.launchAtmosphereGeometry(20000, width, 400, 0.5);
      expect(half.columns * half.rows / (sky.columns * sky.rows), width + 'px sky').toBeLessThan(0.4);
      const ground = P.launchSurfaceGeometry(20000, 40000, width, 400), groundHalf = P.launchSurfaceGeometry(20000, 40000, width, 400, 0.5);
      expect(groundHalf.columns * groundHalf.rows / (ground.columns * ground.rows), width + 'px ground').toBeLessThan(0.3);
    }
  });

  it('still samples the physical sky: every half-detail texel stays within 6 levels of its direct ray', () => {
    let compared = 0;
    for (const h of [0, 20000, 80000, 185000]) {
      const field = P.launchAtmosphereGeometry(h, 640, 400, 0.5);
      for (let row = 0; row < field.rows; row += 3) {
        for (let col = 0; col < field.columns; col += 5) {
          const ray = P.launchAtmospherePoint(h, 640, 400, (col + 0.5) * 640 / field.columns, (row + 0.5) * 400 / field.rows);
          const i = (row * field.columns + col) * 4, texel = field.pixels;
          for (let c = 0; c < 3; c++) expect(Math.abs(texel[i + c] * texel[i + 3] / 255 - ray.rgba[c] * ray.rgba[3] / 255)).toBeLessThanOrEqual(6);
          expect(Math.abs(texel[i + 3] - ray.rgba[3])).toBeLessThanOrEqual(6);
          compared++;
        }
      }
    }
    expect(compared).toBeGreaterThan(300);
  });

  it('still samples the physical ground: each interior half-detail cell is the ray at its center', () => {
    let compared = 0;
    for (const [h, downrange] of [[3000, 2000], [20000, 40000], [120000, 900000]]) {
      const field = P.launchSurfaceGeometry(h, downrange, 1100, 400, 0.5);
      for (let row = 0; row < field.rows; row++) {
        for (let col = 0; col < field.columns; col++) {
          const index = row * field.columns + col;
          if (field.antialiasedPixels[index] || field.pixels[index * 4 + 3] !== 255) continue;
          const ray = P.launchSurfacePoint(h, downrange, 1100, 400, (col + 0.5) * 1100 / field.columns, field.top + (row + 0.5) * (400 - field.top) / field.rows);
          expect(Array.from(field.pixels.slice(index * 4, index * 4 + 4)), h + ' m cell ' + index).toEqual(ray.rgba);
          compared++;
        }
      }
    }
    expect(compared).toBeGreaterThan(2000);
  });
});
