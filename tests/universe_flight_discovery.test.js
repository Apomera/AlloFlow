import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const window = {};
vm.runInNewContext(readFileSync('stem_lab/universe_flight_scene.js', 'utf8'), { window, Math });
const api = window.UniverseFlight;
const source = readFileSync('stem_lab/stem_tool_universe.js', 'utf8');
const start = source.indexOf('  function universeFlightDiscoveries(');
const end = source.indexOf('  function UniverseFlightDiscovery(', start);
if (start < 0 || end < start) throw new Error('Discovery selector unavailable');
const discover = vm.runInNewContext(source.slice(start, end) + '\nuniverseFlightDiscoveries;', { Math, Number });
const landmark = (id, position) => ({ id, position });
const pose = { position: [0, 0, 0], yaw: 0, pitch: 0 };
const select = (targets, info = pose, fov = 65, aspect = 1, selected = '', retained = '') => discover(targets, info, api.math.targetView, fov, aspect, selected, retained);

describe('Free-flight discovery geometry', () => {
  it('offers catalog landmarks ahead in center-first order without changing the catalog or camera', () => {
    const catalog = api.landmarks('neighborhood'), original = JSON.stringify({ catalog, pose });
    const choices = select(catalog);
    expect(choices[0].target.id).toBe('pale-star');
    expect(choices.map(c => c.target.id)).toContain('blue-nebula');
    expect(choices[0].distance).toBeCloseTo(Math.hypot(.65, 2.4, 24), 10);
    expect(JSON.stringify({ catalog, pose })).toBe(original);
  });
  it('excludes selected, coincident, behind, off-screen and nonfinite positions', () => {
    const targets = [landmark('selected', [0, 0, 10]), landmark('here', [0, 0, 0]), landmark('back', [0, 0, -10]), landmark('side', [10, 0, 1]), landmark('bad', [NaN, 0, 5]), landmark('ahead', [0, 0, 20])];
    expect(select(targets, pose, 65, 1, 'selected').map(c => c.target.id)).toEqual(['ahead']);
    expect(select(targets, { position: [Infinity, 0, 0] })).toEqual([]);
    expect(select(targets, {})).toEqual([]);
  });
  it('follows the actual lens, aspect ratio, position and gaze', () => {
    const target = landmark('right', [8, 0, 10]);
    expect(select([target], pose)).toHaveLength(0);
    expect(select([target], pose, 65, 2)).toHaveLength(1);
    expect(select([target], pose, 100, 1)).toHaveLength(1);
    expect(select([target], { ...pose, yaw: Math.atan2(8, 10) })).toHaveLength(1);
    expect(select([target], { ...pose, position: [8, 0, 0] })[0].distance).toBe(10);
    expect(select([target], { ...pose, position: [8, 0, 11] })).toHaveLength(0);
  });
  it('retains an existing suggestion close to the edge, then releases it off-screen', () => {
    const edge = landmark('edge', [.9 * Math.tan(65 * Math.PI / 360) * 10, 0, 10]);
    expect(select([edge])).toHaveLength(0);
    expect(select([edge], pose, 65, 1, '', 'edge')).toHaveLength(1);
    expect(select([edge], { ...pose, yaw: -1 }, 65, 1, '', 'edge')).toHaveLength(0);
  });
  it('handles all three scale catalogs with matching projected directions', () => {
    for (const region of ['neighborhood', 'galaxy', 'cosmic']) {
      const info = { ...pose, position: region === 'galaxy' ? [0, 27000, -85000] : region === 'cosmic' ? [0, 0, -2200000] : [0, 0, 0] };
      const choices = select(api.landmarks(region), info, 65, 1.8);
      expect(choices.length).toBeGreaterThan(0);
      for (const { target, distance } of choices) expect(distance).toBeCloseTo(Math.hypot(...target.position.map((v, i) => v - info.position[i])), 8);
    }
  });
});
