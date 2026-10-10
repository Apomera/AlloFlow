import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync('stem_lab/stem_tool_universe.js', 'utf8');
const start = source.indexOf('  function UniverseFlightPairGuidance(');
const end = source.indexOf('  function UniverseFlightPairView(', start);
if (start < 0 || end < start) throw new Error('Pair guidance component unavailable');
const component = vm.runInNewContext(source.slice(start, end) + ';UniverseFlightPairGuidance;', { Math });
const window = {};
vm.runInNewContext(readFileSync('stem_lab/universe_flight_scene.js', 'utf8'), { window, Math });
const project = window.UniverseFlight.math.targetView;
const React = { createElement: (tag, props, ...children) => ({ tag, props: props || {}, children: children.flat(Infinity).filter(x => x !== false && x != null) }) };
const label = (key, fallback) => fallback;
const text = node => typeof node === 'string' ? node : node.children.map(text).join(' ');
const all = (node, tag) => typeof node === 'string' ? [] : (node.tag === tag ? [node] : []).concat(node.children.flatMap(child => all(child, tag)));
const render = (ray, yaw = 0, pitch = 0, fov = 65, aspect = 1) => component({ React, label, targets: [{ target: { id: 'first', name: 'First landmark' }, projection: project(ray, yaw, pitch, 0, fov, aspect) }] });

describe('Paired landmark direction guidance', () => {
  it('labels eight offscreen directions with the matching decorative arrow', () => {
    const cases = [
      [[2, 0, 1], 'Look right', 0], [[2, -2, 1], 'Look lower right', 45],
      [[0, -2, 1], 'Look down', 90], [[-2, -2, 1], 'Look lower left', 135],
      [[-2, 0, 1], 'Look left', -180], [[-2, 2, 1], 'Look upper left', -135],
      [[0, 2, 1], 'Look up', -90], [[2, 2, 1], 'Look upper right', -45],
    ];
    for (const [ray, direction, angle] of cases) {
      const tree = render(ray), arrow = all(tree, 'svg')[0];
      expect(text(tree)).toContain(direction);
      expect(text(tree)).toContain(`${Math.round(Math.atan2(Math.hypot(ray[0], ray[1]), ray[2]) * 180 / Math.PI)}° from view center`);
      expect(parseFloat(arrow.props.style.transform.slice(7))).toBeCloseTo(angle, 10);
      expect(arrow.props['aria-hidden']).toBe('true');
      expect(arrow.props.focusable).toBe('false');
    }
  });

  it('distinguishes rear quadrants and removes the arbitrary arrow at the exact antipode', () => {
    for (const ray of [[2, 2, -1], [-2, -2, -1]]) {
      const tree = render(ray);
      expect(text(tree)).toContain('Behind you');
      expect(all(tree, 'svg')).toHaveLength(1);
    }
    const antipode = render([0, 0, -1]);
    expect(text(antipode)).toContain('Behind you · Turn around');
    expect(text(antipode)).toContain('180° from view center');
    expect(all(antipode, 'svg')).toHaveLength(0);
  });

  it('describes center inclusion without claiming the whole object is visible', () => {
    const centered = render([0, 0, 1]);
    expect(text(centered)).toContain('Center in view');
    expect(all(centered, 'svg')).toHaveLength(0);
    expect(all(centered, 'li')[0].props['data-in-view']).toBe('true');
    expect(text(render([.4, 0, 1], 0, 0, 100))).toContain('Center in view');
    expect(text(render([.4, 0, 1], 0, 0, 10))).toContain('Look right');
    expect(text(render([.4, 0, 1], 0, 0, 65, .3))).toContain('Look right');
  });

  it('uses the camera orientation and preserves independent names for shared bearings', () => {
    expect(text(render([0, 0, 1], Math.PI / 2))).toContain('Look left');
    expect(text(render([0, 0, 1], 0, Math.PI / 3))).toContain('Look down');
    const targets = [{ id: 'first', name: 'Near group' }, { id: 'second', name: 'Far group' }].map((target, i) => ({ target, projection: project([2 * (i + 1), 0, i + 1], 0, 0, 0, 65, 1) }));
    const tree = component({ React, label, targets }), rows = all(tree, 'li');
    expect(rows.map(row => row.props['data-pair-guide'])).toEqual(['first', 'second']);
    expect(text(rows[0])).toContain('1 · Near group');
    expect(text(rows[1])).toContain('2 · Far group');
    expect(rows.map(row => text(row).includes('Look right'))).toEqual([true, true]);
    const walk = node => typeof node === 'string' ? [] : [node, ...node.children.flatMap(walk)];
    expect(walk(tree).some(node => node.props['aria-live'] || node.props.role === 'status')).toBe(false);
  });
});
