import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(process.env.SCALE_EXPLORER_LIGHTING_SOURCE || 'stem_lab/stem_tool_scaleexplorer.js', 'utf8');
const start = source.indexOf('    function nebulaDustAt(');
const end = source.indexOf('    function nebulaModel(g) {', start);
if (start < 0 || end <= start) throw new Error('Orion dust lighting helpers were not found');
const sandbox = { Math };
vm.runInNewContext(source.slice(start, end) + '\nthis.nebulaDustChecks = { nebulaDustAt, nebulaDustLight };', sandbox);
const { nebulaDustAt: dustAt, nebulaDustLight: light } = sandbox.nebulaDustChecks;
const side = 96, atlasWidth = 1152, atlasHeight = 768;
const coordinate = value => value / 95 - .5;
const index = (x, y, z) => ((y + Math.floor(z / 12) * side) * atlasWidth + x + z % 12 * side) * 4;
const cluster = [-.006, .014, .135];

function atlas(dust = 0) {
  const data = new Uint8Array(atlasWidth * atlasHeight * 4);
  if (dust) for (let i = 2; i < data.length; i += 4) data[i] = dust;
  return data;
}

function cell(data, position, channels) {
  data.set(channels, index(...position));
}

function sample(data, x, y, z) {
  return dustAt(data, coordinate(x), coordinate(y), coordinate(z));
}

function dustSlab(data) {
  for (let z = 48; z <= 73; z++) for (let y = 44; y <= 55; y++) for (let x = 24; x <= 29; x++) {
    cell(data, [x, y, z], [0, 91, 220, 173]);
  }
}

describe('Orion dust atlas interpolation', () => {
  it('samples a constant dust field at interior points and every closed box corner', () => {
    const data = atlas(102);
    for (const point of [[0, 0, 0], [-.123, .217, -.304], [-.5, -.5, -.5], [.5, .5, .5], [-.5, .5, -.5], [.5, -.5, .5]]) {
      expect(dustAt(data, ...point)).toBeCloseTo(102 / 255, 12);
    }
    for (const point of [[-.50001, 0, 0], [.50001, 0, 0], [0, -.50001, 0], [0, .50001, 0], [0, 0, -.50001], [0, 0, .50001]]) {
      expect(dustAt(data, ...point)).toBe(0);
    }
  });

  it('interpolates all eight neighbors across the last column of a z atlas row', () => {
    const data = atlas();
    for (const z of [11, 12]) for (const y of [25, 26]) for (const x of [12, 13]) {
      cell(data, [x, y, z], [201, 77, 16 + (x - 12) * 64 + (y - 25) * 32 + (z - 11) * 16, 255]);
    }
    expect(sample(data, 12.25, 25.5, 11.75)).toBeCloseTo(60 / 255, 12);
    expect(sample(data, 12.25, 25.5, 11)).toBeCloseTo(48 / 255, 12);
    expect(sample(data, 12.25, 25.5, 12)).toBeCloseTo(64 / 255, 12);
    cell(data, [95, 95, 95], [199, 23, 241, 170]);
    expect(dustAt(data, .5, .5, .5)).toBeCloseTo(241 / 255, 12);
  });
});

describe('Orion baked dust lighting', () => {
  it('returns the original array and leaves a dust-free field byte for byte unchanged', () => {
    const data = atlas();
    for (const [position, channels] of [
      [[1, 2, 3], [255, 7, 0, 219]], [[47, 49, 60], [200, 91, 0, 173]],
      [[80, 70, 30], [2, 255, 0, 1]], [[95, 95, 95], [1, 127, 0, 240]]
    ]) cell(data, position, channels);
    const before = data.slice();
    expect(light(data)).toBe(data);
    expect(Buffer.from(data).equals(Buffer.from(before))).toBe(true);
  });

  it('uses model distance and the same dust extinction as the renderer in a constant field', () => {
    // B=1 stays below the occupancy threshold except at this gas receiver.
    const data = atlas(1), receiver = [5, 75, 10], brightness = 255;
    cell(data, receiver, [200, 71, 1, brightness]);
    cell(data, [80, 25, 40], [1, 71, 1, 211]);
    const position = receiver.map(coordinate);
    const distance = Math.hypot(...cluster.map((value, axis) => value - position[axis]));
    const depth = (distance - 1 / 95) / 255;
    const expected = Math.round(brightness * (.28 + .72 * Math.exp(-16 * depth)));
    light(data);
    expect(data[index(...receiver) + 3]).toBe(expected);
    expect(data[index(80, 25, 40) + 3]).toBe(211);
  });

  it('darkens a receiver only when a dust slab lies between it and the central stars', () => {
    const clear = atlas(), blocked = atlas(), behind = [8, 49, 61], front = [38, 49, 61];
    for (const data of [clear, blocked]) {
      cell(data, behind, [180, 123, 0, 240]);
      cell(data, front, [180, 123, 0, 240]);
    }
    dustSlab(blocked);
    light(clear);
    light(blocked);
    expect(clear[index(...behind) + 3]).toBe(240);
    expect(blocked[index(...behind) + 3]).toBeLessThan(190);
    expect(blocked[index(...front) + 3]).toBe(240);
  });

  it('preserves every density and color byte and never brightens the existing illumination', () => {
    const data = atlas();
    dustSlab(data);
    for (let n = 0; n < 128; n++) {
      cell(data, [(n * 17) % 96, (n * 29) % 96, (n * 43) % 96], [n % 3 ? 200 : 1, n * 11 % 256, n % 5 ? 0 : 3, n * 7 % 256]);
    }
    const before = data.slice();
    light(data);
    let changed = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] !== before[i] || data[i + 1] !== before[i + 1] || data[i + 2] !== before[i + 2]) {
        throw new Error(`Dust lighting changed an RGB byte at atlas pixel ${i / 4}`);
      }
      if (data[i + 3] > before[i + 3]) throw new Error(`Dust lighting increased illumination at atlas pixel ${i / 4}`);
      if (data[i + 3] !== before[i + 3]) changed++;
    }
    expect(changed).toBeGreaterThan(0);
  });

  it('keeps a receiver within one voxel of the star cluster at its original brightness', () => {
    const data = atlas(), receiver = [47, 49, 60];
    const distance = Math.hypot(...cluster.map((value, axis) => value - coordinate(receiver[axis])));
    expect(distance).toBeLessThan(1 / 95);
    for (let z = 59; z <= 62; z++) for (let y = 47; y <= 51; y++) for (let x = 45; x <= 49; x++) {
      cell(data, [x, y, z], [0, 33, 255, 200]);
    }
    cell(data, receiver, [255, 71, 255, 219]);
    light(data);
    expect(data[index(...receiver) + 3]).toBe(219);
  });

  it('produces identical bytes from independent copies of the same original field', () => {
    const original = atlas();
    dustSlab(original);
    cell(original, [8, 49, 61], [200, 71, 0, 240]);
    const before = original.slice(), first = original.slice(), second = original.slice();
    light(first);
    light(second);
    expect(Buffer.from(first).equals(Buffer.from(second))).toBe(true);
    expect(first[index(8, 49, 61) + 3]).toBeLessThan(original[index(8, 49, 61) + 3]);
    expect(Buffer.from(original).equals(Buffer.from(before))).toBe(true);
  });
});
