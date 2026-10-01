import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// The gas-giant probe view was one flat cream wash: the sky dome was amber from zenith
// to horizon and then fogged 30% pale blue, the cloud-deck textures were painted in
// sRGB but read as linear (so their golds came out cream), and Saturn's rings were five
// horizontal circles round the scene origin - a halo round the whole horizon, left
// behind when the probe flew off, cream on a cream sky. From the cloud tops the rings
// are an arch from horizon to horizon, and the air overhead is thin, so the sky darkens.
const PATHS = process.env.SOLAR_SOURCE ? [process.env.SOLAR_SOURCE] : [
  'stem_lab/stem_tool_solarsystem.js',
  'desktop/web-app/public/stem_lab/stem_tool_solarsystem.js',
];

function sliceFunction(source, name) {
  const start = source.indexOf('function ' + name + '(');
  expect(start, `${name} must exist`).toBeGreaterThan(-1);
  let depth = 0;
  for (let j = source.indexOf('{', start); j < source.length; j++) {
    if (source[j] === '{') depth++;
    else if (source[j] === '}' && --depth === 0) return source.slice(start, j + 1);
  }
  throw new Error('unbalanced ' + name);
}
const bandsIn = (text) => [...text.matchAll(/\{ inner: ([\d.]+), outer: ([\d.]+), opacity: ([\d.]+), color: (0x[0-9a-f]+) \}/g)]
  .map((m) => m.slice(1).join(' '));
const deg = (x) => x * 180 / Math.PI;

describe('gas giant sky and Saturn ring arch', () => {
  for (const path of PATHS) {
    const source = readFileSync(path, 'utf8');
    // eslint-disable-next-line no-new-func
    const dir = new Function(sliceFunction(source, 'solarRingSkyDir') + '\nreturn solarRingSkyDir;')();

    it(path + ': the rings stand as an arch, at the height the geometry gives', () => {
      // Due south of an observer at 30 N: elevation atan2(r cos lat - 1, r sin lat).
      const elev = (r) => deg(Math.asin(dir(r, 0, 30)[1]));
      expect(elev(1.527), 'inner B ring').toBeCloseTo(22.9, 1);
      expect(elev(2.265), 'outer A ring').toBeCloseTo(40.3, 1);
      expect(dir(2.265, 0, 30)[2], 'a northern observer sees it to the south').toBeGreaterThan(0);
      expect(dir(2.265, 0, -30)[2], 'a southern one, to the north').toBeLessThan(0);
      // Symmetric east-west, and it comes down to the horizon, not round behind you.
      const a = dir(2.0, 0.6, 30), b = dir(2.0, -0.6, 30);
      expect(a[0]).toBeCloseTo(-b[0], 12);
      expect(a[1]).toBeCloseTo(b[1], 12);
      const tMax = Math.acos(1 / (2.0 * Math.cos(Math.PI / 6)));
      expect(deg(Math.asin(dir(2.0, tMax * 0.999, 30)[1])), 'the arch meets the horizon').toBeLessThan(0.5);
      expect(dir(2.0, tMax * 1.01, 30), 'below the horizon: nothing drawn').toBeNull();
      expect(dir(1.2, Math.PI / 2, 30)).toBeNull();
      // Unit vectors.
      const v = dir(1.8, 0.3, -30);
      expect(Math.hypot(v[0], v[1], v[2])).toBeCloseTo(1, 12);
    });

    it(path + ': the drone sky uses the same ring bands as the 3D view, and draws them as that arch', () => {
      const drone = source.slice(source.indexOf('var SOLAR_DRONE_SATURN_RINGS = ['), source.indexOf('];', source.indexOf('var SOLAR_DRONE_SATURN_RINGS = [')));
      const three = source.slice(source.indexOf('Saturn: {', source.indexOf('const PLANET_RING_SYSTEMS = {')), source.indexOf('Uranus: {', source.indexOf('const PLANET_RING_SYSTEMS = {')));
      expect(bandsIn(drone).length).toBe(7);
      expect(bandsIn(drone), 'same radii, opacities and colours').toEqual(bandsIn(three));
      expect(source).toMatch(/SOLAR_DRONE_SATURN_RINGS\.forEach/);
      expect(source).toMatch(/solarRingSkyDir\(r, t, SATURN_SKY_LAT\)/);
      expect(source, 'south of the equator, so the arch is ahead of the starting heading (north)').toMatch(/SATURN_SKY_LAT = -\d+/);
      expect(source, 'the rings are at infinity: they ride with the camera').toMatch(/saturnRingSky\.position\.copy\(camera\.position\)/);
      expect(source, 'no local haze over the rings').toMatch(/opacity: Math\.pow\(band\.opacity, 1\.6\) \* 0\.9, side: THREE\.DoubleSide, depthWrite: false, fog: false/);
      expect(source, 'the old halo round the scene origin is gone').not.toMatch(/new THREE\.RingGeometry\(ringR - ringW/);
    });

    it(path + ': the sky darkens overhead and the painted colours reach the screen', () => {
      const gasSky = source.slice(source.indexOf('} else if (isGas) {', source.indexOf('var skyCv')), source.indexOf('var skyTex = new THREE.CanvasTexture(skyCv);'));
      expect(gasSky).toMatch(/gsGrad\.addColorStop\(0, '#0[0-9a-f]{5}'\)/);
      expect(source).toMatch(/if \(isGas && THREE\.sRGBEncoding !== undefined\) skyTex\.encoding = THREE\.sRGBEncoding;/);
      expect(source).toMatch(/if \(isGas\) skyMat\.fog = false;/);
      expect(source).toMatch(/clTex\.encoding = THREE\.sRGBEncoding/);
      expect(source).toMatch(/stormTex\.encoding = THREE\.sRGBEncoding/);
      // The look keys reach the sub and probe chase view, not only the pilot view.
      expect(source).toMatch(/camera\.lookAt\(playerPos\.x, playerPos\.y \+ \(isGas \? [\d.]+ : 0\) \+ Math\.tan\(pitch\) \* 6, playerPos\.z\);/);
    });
  }
});
