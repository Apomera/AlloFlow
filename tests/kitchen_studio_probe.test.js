import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const P = require('../stem_lab/kitchen_studio/kitchen_studio_probe.js');
const source = readFileSync(require.resolve('../stem_lab/kitchen_studio/kitchen_studio_probe.js'), 'utf8');
const rest = { shaft: { x: .46, y: 1.76, z: .24 }, display: { x: .46, y: 1.99, z: .24 }, tip: { x: .46, y: 1.54, z: .24 }, rotationZ: 0 };
const normalizedChicken = p => (p.x / (.27 * 1.15)) ** 2 + ((p.y - 1.56) / (.27 * .65)) ** 2 + (p.z / (.27 * .8)) ** 2;
const axis = angle => ({ x: -Math.sin(angle), y: Math.cos(angle), z: 0 });
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

describe('Kitchen Studio sensing-tip geometry', () => {
  it('places the thickest-part tip at the actual chicken centre', () => {
    const pose = P.pose('thick', false);
    expect(pose.tip).toEqual({ x: 0, y: 1.56, z: 0 });
    expect(pose.rotationZ).toBe(0);
    expect(normalizedChicken(pose.tip)).toBe(0);
    expect(pose.shaft).toEqual({ x: 0, y: 1.78, z: 0 });
    expect(pose.display.x).toBe(0);
    expect(pose.display.y).toBeCloseTo(2.03, 14);
    expect(pose.display.z).toBe(0);
  });

  it('places the surface tip on the exact ellipsoid skin, with the shaft extending away', () => {
    const pose = P.pose('surface', false);
    expect(pose.tip).toEqual({ x: .3105, y: 1.56, z: 0 });
    expect(pose.rotationZ).toBe(-.6);
    expect(normalizedChicken(pose.tip)).toBeCloseTo(1, 14);
    expect(normalizedChicken(pose.shaft)).toBeGreaterThan(1);
    expect(normalizedChicken(pose.display)).toBeGreaterThan(1);
  });

  it.each(['thick', 'surface', null])('keeps the lower endpoint of the true .44 shaft at the tip for %s', placement => {
    const pose = P.pose(placement, false), direction = axis(pose.rotationZ);
    for (const coordinate of ['x', 'y', 'z']) {
      expect(pose.shaft[coordinate] - direction[coordinate] * .22).toBeCloseTo(pose.tip[coordinate], 14);
    }
    const top = Object.fromEntries(['x', 'y', 'z'].map(coordinate => [coordinate, pose.shaft[coordinate] + direction[coordinate] * .22]));
    expect(distance(top, pose.tip)).toBeCloseTo(.44, 14);
    expect(distance(pose.shaft, pose.tip)).toBeCloseTo(.22, 14);
  });

  it.each(['thick', 'surface', null])('keeps the display collinear with the tip and shaft for %s', placement => {
    const pose = P.pose(placement, false), direction = axis(pose.rotationZ);
    const displayDistance = placement === null ? .45 : .47;
    for (const coordinate of ['x', 'y', 'z']) {
      expect(pose.display[coordinate] - pose.tip[coordinate]).toBeCloseTo(direction[coordinate] * displayDistance, 14);
    }
    expect(distance(pose.display, pose.tip)).toBeCloseTo(displayDistance, 14);
    expect(distance(pose.display, pose.shaft)).toBeGreaterThan(.22);
  });

  it.each([undefined, null, '', 'centre', 'surface ', 0, false, {}, [], { placement: 'thick' }])('rests safely for an unsupported placement %j', placement => {
    expect(P.pose(placement, false)).toEqual(rest);
  });

  it.each(['thick', 'surface', null])('rests after serving regardless of placement %s', placement => {
    expect(P.pose(placement, true)).toEqual(rest);
  });

  it.each(['thick', 'surface', null])('returns immutable independent poses for %s', placement => {
    const first = P.pose(placement, false), snapshot = JSON.stringify(first), second = P.pose(placement, false);
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(Object.isFrozen(first)).toBe(true);
    for (const field of ['shaft', 'display', 'tip']) {
      expect(Object.isFrozen(first[field])).toBe(true);
      expect(first[field]).not.toBe(second[field]);
      expect(Reflect.set(first[field], 'x', 999)).toBe(false);
    }
    expect(Reflect.set(first, 'rotationZ', 99)).toBe(false);
    expect(JSON.stringify(first)).toBe(snapshot);
  });
});

describe('Kitchen Studio probe view-only contract', () => {
  it('exports the same API to a browser script and CommonJS', () => {
    const context = { window: {} };
    vm.runInNewContext(source, context);
    expect(Object.keys(P)).toEqual(['pose']);
    expect(Object.keys(context.window.KitchenStudioProbe)).toEqual(['pose']);
    expect(context.window.KitchenStudioProbe.pose('surface', false)).toEqual(P.pose('surface', false));
  });

  it('does not read or interpolate temperature or historical evidence to position the probe', () => {
    const evidence = new Proxy({}, { get() { throw new Error('Probe geometry read cooking evidence'); } });
    for (const placement of ['thick', 'surface', null]) {
      expect(P.pose(placement, false, evidence, evidence)).toEqual(P.pose(placement, false));
      expect(P.pose(placement, true, evidence, evidence)).toEqual(rest);
    }
    expect(Object.isFrozen(P)).toBe(true);
  });
});
