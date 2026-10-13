/** Geographic city lights share Earth rotation, solar twilight and cloud geometry. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
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

function recordingCtx() {
  const commands = [], gradients = [], properties = {};
  const ctx = new Proxy(properties, {
    get(target, key) {
      if (/^create(?:Linear|Radial|Conic)Gradient$/.test(String(key))) return (...coords) => {
        const id = gradients.length;
        const gradient = {
          id, kind: key, coords, stops: [],
          addColorStop(offset, color) { this.stops.push([offset, color]); commands.push(['stop', id, offset, color]); },
        };
        gradients.push(gradient);
        commands.push(['gradient', key, id, ...coords]);
        return gradient;
      };
      if (key === 'measureText') return text => ({ width: String(text).length * 6 });
      return key in target ? target[key] : (...args) => commands.push(['call', key, ...args]);
    },
    set(target, key, value) {
      target[key] = value;
      commands.push(['set', key, value && typeof value === 'object' && 'id' in value ? { gradient: value.id } : value]);
      return true;
    },
  });
  return { ctx, commands, gradients };
}
const digest = commands => createHash('sha256').update(JSON.stringify(commands)).digest('hex');
const D = Math.PI / 180;
const dot = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0);
function globe(args, opts) {
  const rec = recordingCtx();
  rec.ctx.globalAlpha = 1;
  rec.commands.length = 0;
  P.drawEarthGlobe(rec.ctx, ...args, opts);
  return rec;
}

function cameraBasis(tick) {
  const lon = (20 - tick * 0.0458) * D, tilt = 12 * D;
  return [
    [-Math.sin(lon), Math.cos(lon), 0],
    [Math.sin(tilt) * Math.cos(lon), Math.sin(tilt) * Math.sin(lon), -Math.cos(tilt)],
    [Math.cos(tilt) * Math.cos(lon), Math.cos(tilt) * Math.sin(lon), Math.sin(tilt)],
  ];
}
function geographic(lon, lat) {
  return [Math.cos(lat * D) * Math.cos(lon * D), Math.cos(lat * D) * Math.sin(lon * D), Math.sin(lat * D)];
}
function geographicClouds() {
  // Recover the existing seeded cloud centers from their visible projected caps.
  // The transmission oracle then works entirely in geographic unit vectors.
  const found = new Map();
  for (const tick of [0, 2000, 4000, 6000]) {
    const basis = cameraBasis(tick);
    for (const cap of P.earthSphericalClouds(0, 0, 1, tick)) {
      const rho = Math.asin(cap.along), n = [cap.x / Math.cos(rho), cap.y / Math.cos(rho), cap.z];
      found.set(cap.i, { rho, n: [0, 1, 2].map(j => basis.reduce((sum, axis, i) => sum + axis[j] * n[i], 0)) });
    }
  }
  return [...found.values()];
}
function cloudTransmission(n, clouds) {
  let coverage = 0;
  for (const cloud of clouds) {
    const c = cloud.n;
    const cross = [n[1] * c[2] - n[2] * c[1], n[2] * c[0] - n[0] * c[2], n[0] * c[1] - n[1] * c[0]];
    const distance = Math.atan2(Math.hypot(...cross), dot(n, c));
    const t = Math.max(0, Math.min(1, (cloud.rho - distance) / (cloud.rho * 0.35)));
    coverage = Math.max(coverage, t * t * (3 - 2 * t));
  }
  return 1 - 0.72 * coverage;
}

describe('Geographic night light model', () => {
  it('returns the selected city coordinates without exposing mutable catalogue data', () => {
    const catalogue = P.earthCityCatalog();
    expect(catalogue).toHaveLength(99);
    expect(new Set(catalogue.map(c => c.name)).size).toBe(99);
    expect(catalogue.find(c => c.name === 'New York')).toEqual({ name: 'New York', lon: -73.9957, lat: 40.7216 });
    expect(catalogue.find(c => c.name === 'Tokyo')).toEqual({ name: 'Tokyo', lon: 139.7495, lat: 35.687 });
    for (const city of catalogue) {
      expect(Math.abs(city.lon)).toBeLessThanOrEqual(180);
      expect(Math.abs(city.lat)).toBeLessThanOrEqual(90);
    }
    const snapshot = JSON.parse(JSON.stringify(catalogue));
    catalogue[0].lon = 900; catalogue.pop();
    expect(P.earthCityCatalog()).toEqual(snapshot);
  });

  it('fades continuously from sunset to twelve degrees below the horizon', () => {
    const end = Math.sin(12 * D);
    const sample = u => P.earthNightLightResponse(u, 0, Math.sqrt(1 - u * u), 0);
    for (const u of [0, 0.001, 0.5, 1]) expect(sample(u).night).toBe(0);
    expect(sample(-end / 2).night).toBeCloseTo(0.5, 12);
    for (const u of [-end, -0.5, -1]) expect(sample(u).night).toBe(1);
    expect(sample(-1e-7).night).toBeLessThan(1e-11);
    expect(1 - sample(-end + 1e-7).night).toBeLessThan(1e-11);
    let previous = 0;
    for (let i = 0; i <= 64; i++) {
      const value = sample(-end * i / 64).night;
      expect(value).toBeGreaterThanOrEqual(previous);
      previous = value;
    }
    expect(P.earthNightLightResponse(-1, 0, 0, 0).view).toBe(0);
    expect(P.earthNightLightResponse(-0.6, 0, -0.8, 0).view).toBe(0);
  });

  it('uses the same Sun under camera rotation and rejects invalid normals', () => {
    const n = [-0.3, 0.4, Math.sqrt(0.75)], sun = 0.2;
    const a = P.earthNightLightResponse(...n, sun);
    for (const angle of [-2.3, -0.6, 1.7]) {
      const u = n[0] * Math.cos(angle) - n[1] * Math.sin(angle), v = n[0] * Math.sin(angle) + n[1] * Math.cos(angle);
      const b = P.earthNightLightResponse(u, v, n[2], sun + angle);
      for (const key of ['incidence', 'night', 'view']) expect(b[key]).toBeCloseTo(a[key], 12);
    }
    for (const args of [[NaN, 0, 1, 0], [0, Infinity, 1, 0], [0, 0, '1', 0], [0, 0, 0, 0], [0, 0, 2, 0], [0, 0, 1, Infinity]]) expect(P.earthNightLightResponse(...args)).toBeNull();
  });

  it('projects geographic vectors into the shared camera basis and omits hidden or sunlit cities', () => {
    const cities = P.earthCityCatalog();
    for (const tick of [0, 1800, 4000]) for (const sun of [0, 0.8, 2.9]) {
      const basis = cameraBasis(tick), expected = [];
      for (const city of cities) {
        const n = geographic(city.lon, city.lat), [u, v, z] = basis.map(axis => dot(n, axis));
        if (z > 0 && u * Math.cos(sun) + v * Math.sin(sun) < 0) expected.push({ ...city, u, v, z });
      }
      const lights = P.earthCityLights(31, -9, 86, tick, sun);
      expect(lights.map(c => c.name)).toEqual(expected.map(c => c.name));
      for (let i = 0; i < lights.length; i++) {
        const light = lights[i], reference = expected[i];
        for (const key of ['u', 'v', 'z']) expect(light[key]).toBeCloseTo(reference[key], 12);
        expect(light.x).toBeCloseTo(31 + 86 * reference.u, 10);
        expect(light.y).toBeCloseTo(-9 + 86 * reference.v, 10);
        expect(light.opacity).toBeCloseTo(0.9 * light.night * reference.z * light.transmission, 12);
        expect(light.radius).toBeCloseTo(1.35, 12);
        expect(light.opacity).toBeGreaterThan(0);
        expect(light.opacity).toBeLessThanOrEqual(0.9);
      }
    }
  });

  it('preserves rotation period, scale and cached transmission without exposing mutable results', () => {
    const a = P.earthCityLights(0, 0, 1, 1800, 0), b = P.earthCityLights(31, -9, 2000, 1800 + 360 / 0.0458, 0);
    expect(a.map(c => c.name)).toEqual(b.map(c => c.name));
    expect(a.length).toBeGreaterThan(5);
    for (let i = 0; i < a.length; i++) {
      expect(b[i].x).toBeCloseTo(31 + 2000 * a[i].x, 9);
      expect(b[i].y).toBeCloseTo(-9 + 2000 * a[i].y, 9);
      expect(b[i].opacity).toBeCloseTo(a[i].opacity, 10);
      expect(b[i].transmission).toBe(a[i].transmission);
      expect(b[i].radius).toBeCloseTo(14.4, 10);
    }
    const snapshot = JSON.parse(JSON.stringify(a));
    a[0].transmission = 0; a[0].name = 'mutated'; a.pop();
    expect(P.earthCityLights(0, 0, 1, 1800, 0)).toEqual(snapshot);
  });

  it('attenuates the geographic cloud union with a smooth edge and bounded transmission', () => {
    const clouds = geographicClouds();
    expect(clouds).toHaveLength(572);
    const samples = P.earthCityCatalog().map(c => ({ lon: c.lon, lat: c.lat, n: geographic(c.lon, c.lat) }));
    for (const cloud of clouds.slice(0, 12)) {
      const azimuth = Math.atan2(cloud.n[1], cloud.n[0]), tangent = [-Math.sin(azimuth), Math.cos(azimuth), 0];
      for (const factor of [0, 0.7, 0.85, 1.1]) {
        const d = factor * cloud.rho, n = cloud.n.map((v, i) => v * Math.cos(d) + tangent[i] * Math.sin(d));
        samples.push({ lon: Math.atan2(n[1], n[0]) / D, lat: Math.asin(n[2]) / D, n });
      }
    }
    let partial = 0, opaque = 0, clear = 0;
    for (const sample of samples) {
      const actual = P.earthCityCloudTransmission(sample.lon, sample.lat), expected = cloudTransmission(sample.n, clouds);
      expect(actual).toBeCloseTo(expected, 9);
      expect(actual).toBeGreaterThanOrEqual(0.28 - 1e-12);
      expect(actual).toBeLessThanOrEqual(1);
      if (actual > 0.29 && actual < 0.99) partial++;
      if (actual < 0.281) opaque++;
      if (actual === 1) clear++;
    }
    expect(partial).toBeGreaterThan(0);
    expect(opaque).toBeGreaterThan(0);
    expect(clear).toBeGreaterThan(0);
  });

  it('defaults only an omitted tick and rejects invalid projection or geographic input', () => {
    expect(P.earthCityLights(0, 0, 86, undefined, 0)).toEqual(P.earthCityLights(0, 0, 86, 0, 0));
    for (const args of [[NaN, 0, 1, 0, 0], [0, Infinity, 1, 0, 0], [0, 0, 0, 0, 0], [0, 0, -1, 0, 0], [0, 0, 1, null, 0], [0, 0, 1, '0', 0], [0, 0, 1, 0, Infinity]]) expect(P.earthCityLights(...args)).toEqual([]);
    for (const args of [[NaN, 0], [0, Infinity], [0, 90.1], [0, -90.1], ['0', 0]]) expect(P.earthCityCloudTransmission(...args)).toBeNull();
    expect(P.earthCityCloudTransmission(360, 20)).toBeCloseTo(P.earthCityCloudTransmission(0, 20), 12);
  });
});

describe('Geographic night light drawing', () => {
  it('clips soft city emission to Earth and multiplies the caller opacity', () => {
    const rec = recordingCtx(); rec.ctx.globalAlpha = 0.37; rec.commands.length = 0;
    const lights = P.earthCityLights(31, -9, 86, 1800, 0);
    expect(P.drawEarthCityLights(rec.ctx, 31, -9, 86, 1800, 0)).toEqual({ lights: lights.length });
    expect(rec.commands.slice(0, 4)).toEqual([['call', 'save'], ['call', 'beginPath'], ['call', 'arc', 31, -9, 86, 0, Math.PI * 2], ['call', 'clip']]);
    expect(rec.commands.at(-1)).toEqual(['call', 'restore']);
    expect(rec.gradients).toHaveLength(lights.length);
    const alpha = rec.commands.filter(c => c[0] === 'set' && c[1] === 'globalAlpha');
    for (let i = 0; i < lights.length; i++) {
      expect(alpha[i][2]).toBeCloseTo(0.37 * lights[i].opacity, 12);
      expect(rec.gradients[i].coords).toEqual([lights[i].x, lights[i].y, 0, lights[i].x, lights[i].y, lights[i].radius]);
      expect(rec.gradients[i].stops.map(s => s[0])).toEqual([0, 0.18, 0.45, 1]);
      expect(rec.gradients[i].stops.at(-1)[1]).toBe('rgba(255,177,60,0)');
    }
  });

  it('leaves Canvas untouched for invalid drawing arguments', () => {
    for (const args of [[NaN, 0, 1, 0, 0], [0, 0, -1, 0, 0], [0, 0, 0, 0, 0], [0, 0, 1, Infinity, 0], [0, 0, 1, 0, '0']]) {
      const rec = recordingCtx();
      expect(P.drawEarthCityLights(rec.ctx, ...args)).toBeNull();
      expect(rec.commands).toEqual([]);
    }
    expect(P.drawEarthCityLights(null, 0, 0, 1, 0, 0)).toBeNull();
  });

  it('requires explicit opt-in, surface lighting, a valid Sun, and radius at least sixteen', () => {
    const args = [12, 34, 86, 1800, 0.7, undefined], base = { surfaceLight: true, sphericalClouds: true };
    const old = globe(args, base).commands;
    expect(globe(args, { ...base, urbanLights: true }).commands).not.toEqual(old);
    for (const flag of [undefined, false, 0, 1, 'true', null]) expect(globe(args, { ...base, urbanLights: flag }).commands).toEqual(old);
    for (const light of [undefined, false, 1, 'true']) expect(globe(args, { surfaceLight: light, urbanLights: true }).commands).toEqual(globe(args, { surfaceLight: light }).commands);
    for (const sun of [undefined, NaN, Infinity, '0']) {
      const invalid = [12, 34, 86, 1800, sun, undefined];
      expect(globe(invalid, { ...base, urbanLights: true }).commands).toEqual(globe(invalid, base).commands);
    }
    for (const phase of [0, 0.25, 1]) {
      const phased = [12, 34, 86, 1800, 0.7, phase];
      expect(globe(phased, { ...base, urbanLights: true }).commands).toEqual(globe(phased, base).commands);
    }
    for (const radius of [2, 15.99]) {
      const tiny = [12, 34, radius, 1800, 0.7, undefined];
      expect(globe(tiny, { ...base, urbanLights: true }).commands).toEqual(globe(tiny, base).commands);
    }
    const boundary = [12, 34, 16, 1800, 0.7, undefined];
    expect(globe(boundary, { ...base, urbanLights: true }).commands).not.toEqual(globe(boundary, base).commands);
  });

  it('replaces coastline squares with emission after the shared surface exposure', () => {
    const rec = globe([12, 34, 86, 1800, 0.7, undefined], { surfaceLight: true, sphericalClouds: true, urbanLights: true });
    expect(rec.commands.some(c => c[0] === 'set' && c[1] === 'fillStyle' && c[2] === 'rgba(253,224,71,0.85)')).toBe(false);
    const exposure = rec.commands.findIndex(c => c[0] === 'call' && c[1] === 'fillRect');
    const glow = rec.commands.findIndex(c => c[0] === 'stop' && c[3] === 'rgba(255,243,194,0.95)');
    expect(exposure).toBeGreaterThan(0);
    expect(glow).toBeGreaterThan(exposure);
    expect(rec.commands.filter(c => c[1] === 'save').length).toBe(rec.commands.filter(c => c[1] === 'restore').length);
  });
});

// Captured from accepted pass62 before pass63 edits, source SHA-256
// 49fc890d9bd2e687420346c164135e141814207e480cd2c9355913d598981502.
const preserved = [
  ['tiny', [12, 34, 2, 0, 0, undefined], { surfaceLight: true, thinAtmosphere: true, oceanGlint: true, sphericalClouds: true }, '77b9267000c7050105202f080bd6488316519e6f665e224e943aae9c7ed448f4'],
  ['default', [12, 34, 86, 500, undefined, undefined], undefined, '44b82f2c0b77abf59769aff1c913a030a33c1c5fbcd765e359ce010962cb4313'],
  ['legacy Sun', [12, 34, 86, 2000, 0, undefined], undefined, '09db2e11936732831944947b29c89d422c0aa1d0f2cd34207d13daa1f734279e'],
  ['surface', [12, 34, 86, 500, 0, undefined], { surfaceLight: true }, '14ceac0fc1eb17dd0e5f3a0501e4e7a96c094b42072981e71fbbe61832166f96'],
  ['clouds', [12, 34, 86, 0, 0, undefined], { surfaceLight: true, sphericalClouds: true }, 'dd2b0b44f6e5258a36f24f37ca3ac45a51b39fb8d2765e7162309ad0831b2ccc'],
  ['clouds and glint', [12, 34, 86, 1800, 0.7, undefined], { surfaceLight: true, thinAtmosphere: true, oceanGlint: true, sphericalClouds: true }, '00d8ec422a03e77f9f9991893ca937c04655d8a7ee7af6ead72077b606198547'],
  ['rotated clouds', [12, 34, 86, 4000, 1.1, undefined], { surfaceLight: true, thinAtmosphere: true, oceanGlint: true, sphericalClouds: true }, '35335fb45c49039552f6d03316ac688bf64dc4b77baf1dbd212f579af89f54c9'],
  ['crescent', [12, 34, 86, 500, -2.3, 0.25], { surfaceLight: true, thinAtmosphere: true, oceanGlint: true, sphericalClouds: true }, '13d795667058438c500d9e7e232209f0816f67a7c35ff07c96ab325d04168b3c'],
  ['gibbous', [12, 34, 86, 500, 0.7, 0.75], { surfaceLight: true, thinAtmosphere: true, oceanGlint: true, sphericalClouds: true }, 'd2fc0d4a724b3434f7317ac0cf0e63b2c77340cfe5066febfa31ea43aa34fc4d'],
];

describe('Geographic night lights preserve previous callers', () => {
  for (const [name, args, opts, expected] of preserved) {
    it('preserves the accepted ' + name + ' Canvas command stream', () => {
      expect(digest(globe(args, opts).commands)).toBe(expected);
    });
  }
});
