import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * Guards the beehive drone scene's visual-cue work.
 *
 * The bugs these cover were all invisible to every existing gate: nothing threw,
 * nothing changed shape, and the SSR digest cannot see a WebGL scene at all. The
 * tool simply failed to show the things it was telling students to follow.
 *
 * Asserts INVARIANTS where it can — the cue-brightness checks recompute
 * composited luminance from the source values rather than pinning the literals,
 * so a retune stays green and only a real regression fails.
 */
const PATHS = [
  'stem_lab/stem_tool_beehive.js',
  'desktop/web-app/public/stem_lab/stem_tool_beehive.js',
];
const eachSource = (fn) => PATHS.forEach((p) => fn(readFileSync(p, 'utf8'), p));

// Measured background luminance of the rendered meadow, and the bloom cut in use.
const BG = 0.79;
const BLOOM_CUT = 0.90;
const luma = (hex) => {
  const r = ((hex >> 16) & 255) / 255, g = ((hex >> 8) & 255) / 255, b = (hex & 255) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const composite = (hex, opacity) => opacity * luma(hex) + (1 - opacity) * BG;

/** Pull `basic(0xRRGGBB, { ... opacity: N ... })` for a named cue. */
function cue(source, varName) {
  const re = new RegExp(`var ${varName} = new THREE\\.Mesh\\([^;]*?basic\\(0x([0-9a-fA-F]{6}),\\s*\\{[^}]*?opacity:\\s*([0-9.]+)`);
  const m = source.match(re);
  return m ? { hex: parseInt(m[1], 16), opacity: parseFloat(m[2]) } : null;
}

describe('beehive drone visual cues', () => {
  it('renders bloom through a colour-matched render target', () => {
    eachSource((source, path) => {
      // This renderer sets outputEncoding = sRGBEncoding. r128's default composer
      // target is linear, so without a matching target the whole image lifts and
      // the meadow goes to milk — not just the highlights.
      expect(source, `${path}: composer lost its sRGB render target`)
        .toContain("if ('encoding' in rt.texture && T.sRGBEncoding) rt.texture.encoding = T.sRGBEncoding;");
      expect(source).toContain('renderer._alloComposer = null;');
      // Eco tier renders plain rather than tearing the composer down.
      expect(source).toContain("if (beeFx && t.qualityTier !== 'eco')");
    });
  });

  it('keeps the bloom threshold inside the sceneluminance range', () => {
    eachSource((source, path) => {
      // Parsed rather than regex-matched in one shot: the strength argument is a
      // low-power ternary, not a plain number, so a positional pattern misses it.
      const call = source.match(/new T\.UnrealBloomPass\(([\s\S]{0,400}?)\);/);
      expect(call, `${path}: could not find the bloom pass`).toBeTruthy();
      const afterResolution = call[1].slice(call[1].lastIndexOf('),') + 2);
      const nums = afterResolution.match(/[0-9]*\.?[0-9]+/g) || [];
      expect(nums.length, `${path}: could not read the bloom arguments`).toBeGreaterThan(0);
      const threshold = Number(nums[nums.length - 1]);
      // Measured frame stats: max ~0.926, p99 ~0.87. A cut above the brightest
      // pixel does nothing at all (and "nothing" looks like success at a glance);
      // a cut below the 90th percentile blooms the sky into milk.
      expect(threshold, `${path}: threshold ${threshold} is above the brightest pixel in the scene`).toBeLessThan(0.93);
      expect(threshold, `${path}: threshold ${threshold} would bloom the sky`).toBeGreaterThan(0.86);
    });
  });

  it('lifts the navigation beacons above the bloom cut', () => {
    eachSource((source, path) => {
      for (const name of ['dcaHalo', 'queenHalo']) {
        const c = cue(source, name);
        expect(c, `${path}: could not read ${name}`).toBeTruthy();
        const composited = composite(c.hex, c.opacity);
        // These two are the cues a student is told to follow. Measured before the
        // fix: hiding the whole DCA beacon RAISED the count of pixels over the cut,
        // i.e. the "golden signal" was tinting the sky DOWN.
        expect(composited, `${path}: ${name} composites to ${composited.toFixed(3)}, below the ${BLOOM_CUT} bloom cut`)
          .toBeGreaterThan(BLOOM_CUT);
      }
    });
  });

  it('keeps hazard cues DARKER than the sky, which is how they read', () => {
    eachSource((source, path) => {
      // The counterpart to the rule above, and the reason it must not be applied
      // blindly: red-on-pale reads by CONTRAST, not brightness. Brightening these
      // toward the sky would destroy their visibility.
      for (const name of ['obstacleWarnRing', 'alertRing']) {
        const c = cue(source, name);
        if (!c) continue;
        const composited = composite(c.hex, c.opacity);
        expect(composited, `${path}: ${name} drifted up toward sky luminance`).toBeLessThan(BG - 0.05);
      }
    });
  });

  it('fires nectar sparks additively so the reward beat reads as light', () => {
    eachSource((source, path) => {
      // At 0xfacc15/0.85 these composited to ~0.79 against a background of ~0.79:
      // the core reward feedback was exactly as bright as the field behind it.
      expect(source, `${path}: pickup sparks are no longer additive`)
        .toMatch(/objects\.particlePoints = new THREE\.Points\([\s\S]{0,220}?blending: THREE\.AdditiveBlending/);
    });
  });

  it('keeps the shadow frustum tight and flying with the bee', () => {
    eachSource((source, path) => {
      const m = source.match(/sun\.shadow\.camera\.left = (-?\d+); sun\.shadow\.camera\.right = (\d+);/);
      expect(m, `${path}: could not read the shadow frustum`).toBeTruthy();
      const width = Number(m[2]) - Number(m[1]);
      // 1024 map: at the original 1300-unit span this was ~1.3 units/texel and the
      // bee is ~2 units across, so its shadow was a texel of mush.
      expect(width / 1024, `${path}: ${(width / 1024).toFixed(2)} units per shadow texel is too coarse`)
        .toBeLessThan(0.5);
      expect(source, `${path}: the shadow frustum no longer follows the bee`)
        .toContain('o.sun.target.position.set(snapX, 0, snapZ);');
    });
  });

  it('starts fog far enough out that "Clear field" is clear', () => {
    eachSource((source, path) => {
      const m = source.match(/t\.scene\.fog\.near = \((\d+) \+ Math\.min/);
      expect(m, `${path}: could not read fog near`).toBeTruthy();
      // The hills sit at ~980 and the route runs past 1200; fog from 340 dissolved
      // the middle distance even on the scenario labelled "Clear visibility".
      expect(Number(m[1]), `${path}: fog starts at ${m[1]}, too near for a clear day`).toBeGreaterThanOrEqual(600);
    });
  });

  it('marks the queen intercept with a flash on the render clock', () => {
    eachSource((source, path) => {
      expect(source, `${path}: the mating flash is gone`).toContain('objects.matingFlash = matingFlash;');
      // Timestamped with the same `now` the render pass receives, so the pulse is
      // frame-rate independent rather than a fixed per-frame decay.
      expect(source).toContain('ds.matingFlashAt = now;');
      expect(source).toContain('var mfAge = ds.matingFlashAt ? (now - ds.matingFlashAt) / 1500 : 2;');
    });
  });
});
