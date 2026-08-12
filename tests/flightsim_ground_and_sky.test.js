import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * Two measured visual defects in the 3D flight view.
 *
 * 1. STARS IN DAYLIGHT. The star dome faded on its own curve, `1 - brightness *
 *    1.4`, while every other consumer in the tool keys off getDayNight's bands
 *    (isNight < 0.2, isDusk 0.2-0.4). Measured at 8AM: sky luminance 98 (fully
 *    blue) with 600 stars drawn over it at 0.46 opacity.
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

describe('flightsim sky', () => {
  it('fades stars on the tool\'s own daylight bands', () => {
    eachSource((source, path) => {
      expect(source, `${path}: stars are back on an independent fade curve`)
        .not.toMatch(/starNight = Math\.max\(0, 1 - dnBright \* 1\.4\)/);
      // 0.4 and 0.2 are getDayNight's isDusk boundaries — the same numbers city
      // lights and the bloom threshold switch on.
      expect(source).toContain('var starDusk = Math.max(0, Math.min(1, (0.4 - dnBright) / 0.2));');
      expect(source).toContain('var starNight = Math.pow(starDusk, 1.6);');
    });
  });

  it('keeps stars at high altitude regardless of daylight', () => {
    eachSource((source, path) => {
      // The altitude term is a separate, deliberate effect (thin air above
      // 20,000 ft) and must not be collateral damage of the daylight fix.
      expect(source, `${path}: the high-altitude star term was lost`)
        .toContain('var starAltF = Math.max(0, Math.min(1, ((state.altitude || 0) - 20000) / 20000)) * 0.7;');
      expect(source).toContain('Math.max(starNight, starAltF)');
    });
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

  it('guards the anisotropy lookup', () => {
    eachSource((source, path) => {
      // capabilities is absent on some fallback contexts; this must never be the
      // thing that throws during terrain build.
      expect(source, `${path}: anisotropy lookup is unguarded`)
        .toContain('if (_fAniso > 1) fineTex.anisotropy = Math.min(8, _fAniso);');
    });
  });
});
