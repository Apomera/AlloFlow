import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(process.env.SCALE_EXPLORER_SLICE_SOURCE || 'stem_lab/stem_tool_scaleexplorer.js', 'utf8');
const start = source.indexOf('    function nebulaSlice(');
const end = source.indexOf('    function nebulaDustAt(', start);
if (start < 0 || end <= start) throw new Error('Orion horizontal slice helper was not found');
const sandbox = { Math, Uint8ClampedArray, NEBULA_SPAN: 24, clamp: (v, a, b) => Math.max(a, Math.min(b, v)) };
vm.runInNewContext(source.slice(start, end) + '\nthis.sliceCheck = nebulaSlice;', sandbox);
const slice = sandbox.sliceCheck;
const side = 96, atlasWidth = 1152, atlasHeight = 768;
const heightAt = y => (y / 95 - .5) * 24;
const atlasIndex = (x, y, z) => ((y + Math.floor(z / 12) * side) * atlasWidth + x + z % 12 * side) * 4;
const imageIndex = (x, z) => (z * side + x) * 4;
const atlas = () => new Uint8Array(atlasWidth * atlasHeight * 4);
const pixel = (image, x, z) => Array.from(image.subarray(imageIndex(x, z), imageIndex(x, z) + 4));
const cell = (data, x, y, z, rgba) => data.set(rgba, atlasIndex(x, y, z));
const same = (a, b) => Buffer.from(a).equals(Buffer.from(b));

describe('Orion horizontal cloud slices', () => {
  it('returns a compact RGBA image and reuses its supplied buffer', () => {
    const data = atlas(), target = new Uint8ClampedArray(side * side * 4);
    cell(data, 48, 47, 48, [180, 120, 80, 0]);
    const result = slice(data, heightAt(47), target);
    expect(result).toBe(target);
    expect(result).toBeInstanceOf(Uint8ClampedArray);
    expect(result.length).toBe(side * side * 4);
    expect(pixel(result, 48, 48)[3]).toBeGreaterThan(0);
    const fresh = slice(data, heightAt(47));
    expect(fresh).toBeInstanceOf(Uint8ClampedArray);
    expect(fresh.length).toBe(side * side * 4);
    expect(same(result, fresh)).toBe(true);
  });

  it('keeps x rightward and positive z downward across the atlas row seam', () => {
    const data = atlas(), occupied = [[0, 0], [95, 95], [12, 11], [30, 12], [95, 11], [0, 12]];
    for (const [x, z] of occupied) cell(data, x, 47, z, [170, 120, 60, 0]);
    const image = slice(data, heightAt(47));
    for (const [x, z] of occupied) expect(pixel(image, x, z)[3]).toBeGreaterThan(0);
    for (const [x, z] of [[0, 95], [95, 0], [12, 12], [30, 11], [94, 11], [1, 12]]) {
      expect(pixel(image, x, z)).toEqual([0, 0, 0, 0]);
    }
    const count = Array.from(image).filter((v, i) => i % 4 === 3 && v > 0).length;
    expect(count).toBe(occupied.length);
  });

  it('linearly interpolates density, color and dust between height layers', () => {
    const data = atlas(), expected = atlas(), x = 38, z = 12;
    cell(data, x, 30, z, [80, 20, 40, 255]);
    cell(data, x, 31, z, [220, 180, 180, 0]);
    cell(expected, x, 30, z, [150, 100, 110, 7]);
    const result = pixel(slice(data, heightAt(30.5)), x, z);
    expect(result).toEqual(pixel(slice(expected, heightAt(30)), x, z));
    expect(result[3]).toBeGreaterThan(0);
    expect(result).not.toEqual(pixel(slice(data, heightAt(30)), x, z));
    expect(result).not.toEqual(pixel(slice(data, heightAt(31)), x, z));
  });

  it('includes exact lower and upper cloud boundaries', () => {
    const data = atlas();
    cell(data, 5, 0, 11, [190, 80, 100, 0]);
    cell(data, 70, 95, 12, [170, 200, 80, 0]);
    const low = slice(data, -12), high = slice(data, 12);
    expect(pixel(low, 5, 11)[3]).toBeGreaterThan(0);
    expect(pixel(low, 70, 12)).toEqual([0, 0, 0, 0]);
    expect(pixel(high, 70, 12)[3]).toBeGreaterThan(0);
    expect(pixel(high, 5, 11)).toEqual([0, 0, 0, 0]);
  });

  it('clears all output channels outside the volume or at invalid heights', () => {
    const data = atlas(), target = new Uint8ClampedArray(side * side * 4);
    for (const height of [-12.00001, 12.00001, -16.8, 16.8, NaN, Infinity, -Infinity, undefined, null, '0']) {
      target.fill(255);
      expect(slice(data, height, target)).toBe(target);
      expect(target.some(v => v !== 0)).toBe(false);
    }
  });

  it('keeps empty voxels transparent regardless of color and illumination', () => {
    const data = atlas();
    for (const [x, z, color, light] of [[0, 0, 255, 255], [15, 11, 120, 255], [15, 12, 255, 0], [95, 95, 0, 255]]) {
      cell(data, x, 47, z, [0, color, 0, light]);
      cell(data, x, 48, z, [0, 255 - color, 0, 255 - light]);
    }
    expect(slice(data, 0).some(v => v !== 0)).toBe(false);
  });

  it('derives opacity from gas and dust density', () => {
    const data = atlas();
    for (const [x, gas] of [[10, 0], [11, 32], [12, 128], [13, 255]]) cell(data, x, 47, 20, [gas, 120, 0, 255]);
    cell(data, 14, 47, 20, [0, 120, 200, 0]);
    const image = slice(data, heightAt(47));
    expect(pixel(image, 10, 20)[3]).toBe(0);
    expect(pixel(image, 11, 20)[3]).toBeGreaterThan(0);
    expect(pixel(image, 12, 20)[3]).toBeGreaterThanOrEqual(pixel(image, 11, 20)[3]);
    expect(pixel(image, 13, 20)[3]).toBeGreaterThanOrEqual(pixel(image, 12, 20)[3]);
    expect(pixel(image, 14, 20)[3]).toBeGreaterThan(0);
  });

  it('ignores baked illumination and preserves the entire source atlas', () => {
    const data = atlas();
    for (let n = 0; n < 64; n++) for (const y of [47, 48]) {
      cell(data, n * 17 % 96, y, n * 29 % 96, [n * 13 % 256, n * 31 % 256, n * 7 % 256, n * 11 % 256]);
    }
    const before = data.slice(), otherLight = data.slice();
    for (let i = 3; i < otherLight.length; i += 4) otherLight[i] = 255 - otherLight[i];
    expect(same(slice(data, 0), slice(otherLight, 0))).toBe(true);
    expect(same(data, before)).toBe(true);
  });

  it('clears occupied pixels when reusing the buffer for an empty slice', () => {
    const data = atlas(), target = new Uint8ClampedArray(side * side * 4);
    cell(data, 12, 47, 11, [255, 140, 180, 255]);
    slice(data, heightAt(47), target);
    expect(pixel(target, 12, 11)[3]).toBeGreaterThan(0);
    expect(slice(data, heightAt(20), target)).toBe(target);
    expect(target.some(v => v !== 0)).toBe(false);
  });
});
