import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

/**
 * Two measured visual defects in the 3D flight view.
 *
 * 1. STARS IN DAYLIGHT. The star dome faded on its own curve, `1 - brightness *
 *    1.4`. A later brightness-band fade still exposed hundreds of stars after
 *    sunrise: at 7AM the sun was already 17 degrees above the horizon. Solar
 *    elevation now fades them through twilight and prevents altitude from
 *    restoring stars to a bright daytime sky.
 *
 * 2. FEATURELESS GROUND. The field/road detail map tiles once per 24,000 ft. A
 *    raycast at 400 ft AGL put the terrain 122-204 ft from the camera, so the
 *    whole visible ground spanned about two texels of it — measured as p5 = p50 =
 *    p95 = 40.7, standard deviation EXACTLY 0. A drone flies its entire mission in
 *    that band, with nothing moving underneath to give speed or height.
 *
 * Both verified by measurement and by screenshot, before and after.
 */
const PATHS = [
  'stem_lab/stem_tool_flightsim.js',
  'desktop/web-app/public/stem_lab/stem_tool_flightsim.js',
];
const eachSource = (fn) => PATHS.forEach((p) => fn(readFileSync(p, 'utf8'), p));
let api;
beforeAll(() => {
  resetStemLab(); window.__RR_TEST_EXPORTS__ = {};
  loadTool('stem_lab/stem_tool_flightsim.js', 'flightSim'); api = window.__RR_TEST_EXPORTS__.flightSim;
});

describe('flightsim sky', () => {
  it('fades stars continuously below the solar horizon', () => {
    const samples = [17.99, 18.001, 18.1, 18.2, 18.5, 22].map(hour =>
      api.getFlightCelestialFrame(hour, { type: 'clear', visibility: 1 }, 0).starOpacity);
    expect(samples[0]).toBe(0); expect(samples.at(-1)).toBe(1);
    expect(samples[1]).toBeLessThan(0.001);
    expect(samples.some(value => value > 0 && value < 1)).toBe(true);
    for (let index = 1; index < samples.length; index++) expect(samples[index]).toBeGreaterThanOrEqual(samples[index - 1]);
    for (const value of samples) { expect(Number.isFinite(value)).toBe(true); expect(value).toBeGreaterThanOrEqual(0); expect(value).toBeLessThanOrEqual(1); }
  });

  it('allows altitude to strengthen twilight stars without restoring daylight stars', () => {
    const weather = { type: 'clear', visibility: 1 };
    for (const altitude of [0, 20000, 40000, 65000]) {
      for (const hour of [6, 7, 12, 17, 18]) expect(api.getFlightCelestialFrame(hour, weather, altitude).starOpacity).toBe(0);
      expect(api.getFlightCelestialFrame(22, weather, altitude).starOpacity).toBeGreaterThan(0);
    }
    expect(api.getFlightCelestialFrame(18.1, weather, 40000).starOpacity)
      .toBeGreaterThanOrEqual(api.getFlightCelestialFrame(18.1, weather, 0).starOpacity);
  });
});

describe('flightsim close-in ground detail', () => {
  it('adds a second, finer detail pass over the terrain', () => {
    eachSource((source, path) => {
      // 100x tiling = one tile per 2,400 ft (~4.7 ft per texel), against the
      // coarse layer's 24,000 ft.
      expect(source, `${path}: the fine ground layer is gone`)
        .toContain('fineTex.repeat.set(100, 100)');
      // Multiply, so it modulates the LIT terrain. An unlit overlay would wash the
      // colour out, and it is also what lets the layer fade itself: mipmaps average
      // the noise to its own mean as it recedes.
      expect(source).toContain('blending: THREE.MultiplyBlending');
    });
  });

  it('shares the terrain geometry rather than copying it', () => {
    eachSource((source, path) => {
      // Sharing the instance means the per-frame height updates and
      // computeVertexNormals apply to both, with no second copy to fall out of
      // sync — and being a CHILD means it inherits the recentre transform.
      const block = source.slice(source.indexOf('var fineMesh = new THREE.Mesh('));
      expect(block.slice(0, 60), `${path}: fine layer no longer shares the terrain geometry`)
        .toContain('new THREE.Mesh(geometry,');
      expect(source, `${path}: fine layer is not parented to the terrain`)
        .toContain('mesh.add(fineMesh);');
    });
  });

  it('cannot z-fight with the surface it is coincident with', () => {
    eachSource((source, path) => {
      expect(source, `${path}: depth write re-enabled on a coincident layer`)
        .toContain('depthWrite: false,');
      expect(source).toContain('polygonOffset: true,');
    });
  });

  it('does not reach for `resources` from updateTerrainMesh scope', () => {
    eachSource((source, path) => {
      // `resources` is declared inside disposeThree, NOT updateTerrainMesh. Touching
      // it here throws a ReferenceError at runtime that node --check cannot see, and
      // it would take terrain creation down with it.
      const fn = source.slice(
        source.indexOf('var updateTerrainMesh = function'),
        source.indexOf('var renderWebGLFlight = function'),
      );
      expect(fn.length, `${path}: could not isolate updateTerrainMesh`).toBeGreaterThan(100);
      expect(fn, `${path}: updateTerrainMesh references out-of-scope \`resources\``)
        .not.toMatch(/\bresources\./);
    });
  });

  it('keeps the cruise darkening within budget', () => {
    // Multiply blending can only darken, and mipmaps converge to the texture's
    // MEAN — so that mean is exactly how much this layer dims the terrain at any
    // distance where the noise has averaged out. It is the one property that
    // cannot be checked by flying: the drone is ceilinged at 400 ft, the Cessna
    // cannot reach cruise inside a SwiftShader budget, and the helicopter climbs
    // ~120 ft/min at harness frame rates.
    //
    // So recompute it here from the SOURCE'S OWN constants — the noise helpers and
    // both expressions are lifted out of the file and run — rather than from a
    // copy that would keep passing after someone retunes the numbers.
    eachSource((source, path) => {
      const helpers = source.slice(source.indexOf('var fHash = function'), source.indexOf('var fImg ='));
      const fN = source.match(/var fN = fOct\([^;]+;/);
      const fS = source.match(/var fS = [^;]+;/);
      expect(helpers.length, `${path}: could not lift the noise helpers`).toBeGreaterThan(200);
      expect(fN && fS, `${path}: could not lift the noise expressions`).toBeTruthy();

      // eslint-disable-next-line no-new-func
      const mean = new Function(`
        ${helpers}
        var sum = 0;
        for (var fpy = 0; fpy < 256; fpy++) {
          for (var fpx = 0; fpx < 256; fpx++) {
            ${fN[0]}
            ${fS[0]}
            sum += fS;
          }
        }
        return sum / (256 * 256);
      `)();

      const darkening = 1 - mean / 255;
      // Measured in the browser on the live material: luma mean 236.85 => 7.1%.
      expect(mean, `${path}: noise mean ${mean.toFixed(2)} is not a plausible texture value`)
        .toBeGreaterThan(180);
      expect(darkening, `${path}: this layer now dims cruise terrain by ${(darkening * 100).toFixed(1)}% — too much`)
        .toBeLessThan(0.10);
      expect(darkening, `${path}: darkening ${(darkening * 100).toFixed(1)}% is so small the layer may be doing nothing`)
        .toBeGreaterThan(0.03);
    });
  });

  it('guards the anisotropy lookup', () => {
    eachSource((source, path) => {
      // capabilities is absent on some fallback contexts; this must never be the
      // thing that throws during terrain build.
      expect(source, `${path}: anisotropy lookup is unguarded`)
        .toContain('if (_fAniso > 1) fineTex.anisotropy = Math.min(8, _fAniso);');
    });
  });
});
