import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const SOURCE = 'stem_lab/universe_flight_scene.js';
const digest = values => createHash('sha256').update(new Uint8Array(values.buffer, values.byteOffset, values.byteLength)).digest('hex');
// Accepted enhancement71 atlas channels, before green gained fine emission.
// Red is the broad filament map, alpha is diffuse emission and blue is unused.
const BASELINE_CHANNELS = {
  red: '6215a1c82b91dc171db3681d006d696a2716d7ab7621bb69d442ad4e6ea1b2a4',
  blue: 'f58a6f19f340d3ec338c3f9ec74549df0aed5bd90a15d8fd6bf065f143f9e186',
  alpha: 'c73955c515605166e4740d9b7140356a73ef0a5f76575124d083169294137204',
};
const WORLD = {
  neighborhood: { count: 19203, hash: 'f0933322797366fbee8bbdc9ce8d2263700b1c07a71caa1bcfa1224d68edc2a3' },
  galaxy: { count: 36400, hash: 'f5dbc73e3ae0b2751dcf15f6fffce2753ae4994b089c62d020975e414889b2ab' },
  cosmic: { count: 41470, hash: '156c66d7c6805406f2d231fb18affab8e613952ec32b5fdf9e9e805104966b85' },
};
let internals, atlas;

beforeAll(() => {
  const source = readFileSync(SOURCE, 'utf8'), target = {};
  // Expose existing private pure generators in this test only. No shipped API,
  // WebGL call, navigation state, or scene fixture is altered.
  const anchor = 'global.UniverseFlight = {';
  expect(source.split(anchor)).toHaveLength(2);
  new Function('window', source.replace(anchor,
    'global.__nebulaTest = { cloud: cloudPixels, region: makeRegion };' + anchor))(target);
  internals = target.__nebulaTest;
  atlas = internals.cloud();
});

function channel(index) {
  return Uint8Array.from({ length: atlas.length / 4 }, (_, pixel) => atlas[pixel * 4 + index]);
}

function tileStats(tile) {
  let redLight = 0, greenLight = 0, peak = 0, changes = 0;
  let redSupport = 0, greenSupport = 0, outsideBroad = 0, gutter = 0;
  let redGradient = 0, greenGradient = 0, maximumGradient = 0;
  for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
    const offset = (y * 512 + tile * 128 + x) * 4;
    const red = atlas[offset], green = atlas[offset + 1];
    if (x < 8 || x >= 120 || y < 8 || y >= 120) {
      gutter += red + green + atlas[offset + 2] + atlas[offset + 3];
      continue;
    }
    const u = (x - 8) / 111 * 2 - 1, v = (y - 8) / 111 * 2 - 1;
    let feather = Math.max(0, Math.min(1, (1 - u * u - v * v) / 0.28));
    feather = feather * feather * (3 - 2 * feather);
    redLight += red * feather; greenLight += green * feather;
    peak = Math.max(peak, green);
    if (red > 0) redSupport++;
    if (green > 0) greenSupport++;
    if (green > 0 && red === 0) outsideBroad++;
    if (green !== red) changes++;
    if (x < 119 && y < 119) {
      const redStep = Math.abs(atlas[offset + 4] - red) + Math.abs(atlas[offset + 512 * 4] - red);
      const greenStep = Math.abs(atlas[offset + 5] - green) + Math.abs(atlas[offset + 512 * 4 + 1] - green);
      redGradient += redStep; greenGradient += greenStep;
      maximumGradient = Math.max(maximumGradient, greenStep);
    }
  }
  return { redLight, greenLight, peak, changes, redSupport, greenSupport, outsideBroad,
    gutter, redGradient, greenGradient, maximumGradient };
}

describe('Universe static fine nebula emission', () => {
  it('preserves accepted red, diffuse alpha and blue bytes and reuses the cached atlas', () => {
    expect(atlas).toHaveLength(512 * 128 * 4);
    expect(digest(channel(0))).toBe(BASELINE_CHANNELS.red);
    expect(digest(channel(2))).toBe(BASELINE_CHANNELS.blue);
    expect(digest(channel(3))).toBe(BASELINE_CHANNELS.alpha);
    expect(internals.cloud()).toBe(atlas);
    expect(digest(channel(1))).not.toBe(BASELINE_CHANNELS.blue);
    expect(readFileSync(SOURCE)).toEqual(readFileSync('desktop/web-app/public/' + SOURCE));
  });

  it('keeps each tile within its existing emission support and matches its weighted light within 0.1%', () => {
    for (let tile = 0; tile < 4; tile++) {
      const stats = tileStats(tile);
      expect(Math.abs(stats.greenLight / stats.redLight - 1)).toBeLessThan(0.001);
      expect(stats.peak).toBeLessThanOrEqual(240);
      expect(stats.peak).toBeGreaterThan(100);
      expect(stats.outsideBroad).toBe(0);
      expect(stats.gutter).toBe(0);
      expect(stats.greenSupport).toBeGreaterThan(stats.redSupport * 0.95);
      expect(stats.changes).toBeGreaterThan(6000);
    }
  });

  it('adds stronger resolved structure with bounded adjacent-texel gradients in every tile', () => {
    for (let tile = 0; tile < 4; tile++) {
      const stats = tileStats(tile);
      expect(stats.greenGradient).toBeGreaterThan(stats.redGradient * 1.05);
      expect(stats.greenGradient).toBeLessThan(stats.redGradient * 2.4);
      expect(stats.maximumGradient).toBeLessThan(90);
    }
  });

  it('preserves every generated source record and its scene RNG stream in all three regions', () => {
    for (const [region, baseline] of Object.entries(WORLD)) {
      const data = internals.region(region);
      expect(data.points).toHaveLength(baseline.count * 9);
      expect(digest(data.points)).toBe(baseline.hash);
      expect(Array.from(data.points).every(Number.isFinite)).toBe(true);
    }
  });
});
