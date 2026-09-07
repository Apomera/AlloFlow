import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
const source = readFileSync('stem_lab/stem_tool_coasterlab.js', 'utf8');
const block = source.slice(source.indexOf('/* @clab-support-frame-start */'), source.indexOf('/* @clab-support-frame-end */'));
const frame = new Function(block + '; return coasterSupportFrame;')();
const up = { x: 0, y: 1, z: 0 }, side = { x: 1, y: 0, z: 0 };
describe('Coaster support visual geometry', () => {
  it('meets the underside cap at its actual banked position', () => {
    const bankUp = { x: -0.6, y: 0.8, z: 0 };
    const result = frame({ x: 10, y: 20, z: 30 }, bankUp, { x: 0.8, y: 0.6, z: 0 });
    expect(result.attach.x).toBeCloseTo(10.276); expect(result.attach.y).toBeCloseTo(19.632);
    expect(result.feet[0]).toEqual({ x: result.attach.x, y: 0.34, z: result.attach.z });
    expect(result.height + 0.34).toBeCloseTo(result.attach.y);
  });
  it('gives each tall brace a symmetric ground anchor', () => {
    const result = frame({ x: 0, y: 30, z: 0 }, up, side);
    expect(result.feet).toHaveLength(3);
    expect(result.feet[1].x).toBeCloseTo(-result.feet[2].x);
    expect(Math.abs(result.feet[1].x)).toBeGreaterThan(3);
    result.feet.forEach(base => expect(base.y).toBe(0.34));
  });
  it('keeps low supports compact', () => { expect(frame({ x: 0, y: 3, z: 0 }, up, side).feet).toHaveLength(1); });
  it('bounds the footprint of very tall visual supports', () => { expect(frame({ x: 0, y: 100, z: 0 }, up, side).feet[2].x).toBe(4.2); });
  it('does not build columns under inverted or near-ground rails', () => {
    expect(frame({ x: 0, y: 20, z: 0 }, { x: 0, y: -1, z: 0 }, side)).toBeNull();
    expect(frame({ x: 0, y: 1, z: 0 }, up, side)).toBeNull();
  });
  it.each([null, { x: NaN, y: 20, z: 0 }, { x: 0, y: Infinity, z: 0 }])('rejects invalid position %j', pos => { expect(frame(pos, up, side)).toBeNull(); });
  it('avoids an undefined horizontal brace direction', () => {
    expect(frame({ x: 0, y: 20, z: 0 }, up, { x: 0, y: 1, z: 0 }).feet).toHaveLength(1);
  });
});
