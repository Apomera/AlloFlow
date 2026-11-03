import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_spacestation.js', 'utf8');
const pose = new Function(source.slice(source.indexOf('  var ISS_GM ='), source.indexOf('  function issTransferPlan(')) + '\nreturn issMapCameraPose;')();
const pan = new Function(source.slice(source.indexOf('  var ISS_GM ='), source.indexOf('  function issTransferPlan(')) + '\nreturn issMapCameraPan;')();
const selectionBrackets = new Function(source.slice(source.indexOf('  function issMapSelectionBrackets('), source.indexOf('  function issMapLabelLayout(')) + '\nreturn issMapSelectionBrackets;')();
const labelLayout = new Function(source.slice(source.indexOf('  function issMapLabelLayout('), source.indexOf('  function issMapPlaybackRate(')) + '\nreturn issMapLabelLayout;')();
const axisProjection = new Function(source.slice(source.indexOf('  function issMapAxisProjection('), source.indexOf('  function issMapLabelLayout(')) + '\nreturn issMapAxisProjection;')();
const defaultPosition = [8.2, 4.8, 10.4], defaultTarget = [0, 0, 1];

function offset(position, target) { return position.map((value, axis) => value - target[axis]); }
function expectVectorClose(actual, expected, digits = 11) { actual.forEach((value, axis) => expect(value).toBeCloseTo(expected[axis], digits)); }
function expectConsistent(state) {
  const relative = offset(state.position, state.target);
  expect(Math.hypot(...relative)).toBeCloseTo(state.distance, 10);
  expectVectorClose(relative, [state.distance * Math.sin(state.polar) * Math.sin(state.azimuth), state.distance * Math.cos(state.polar), state.distance * Math.sin(state.polar) * Math.cos(state.azimuth)], 10);
  expect(state.position.every(Number.isFinite)).toBe(true);
  expect(state.target.every(Number.isFinite)).toBe(true);
  expect(Number.isFinite(state.azimuth)).toBe(true);
  expect(Number.isFinite(state.polar)).toBe(true);
}

describe('space station selected-hull corner brackets', () => {
  const points = (left, top, right, bottom, z = .5) => [
    { x: left, y: top, z }, { x: right, y: top, z }, { x: left, y: bottom, z }, { x: right, y: bottom, z }
  ];

  it('leaves a six-pixel gap and four short open corners around the projected hull', () => {
    const result = selectionBrackets(points(100, 80, 240, 170), { width: 390, height: 320 });
    expect(result).toMatchObject({ visible: true, left: 94, top: 74, right: 246, bottom: 176, leg: 14 });
    expect(result.path).toBe('M108.00 74.00 H94.00 V88.00 M232.00 74.00 H246.00 V88.00 M108.00 176.00 H94.00 V162.00 M232.00 176.00 H246.00 V162.00');
    expect(result.path.match(/M/g)).toHaveLength(4);
    expect(result.path).not.toContain('Z');
  });

  it('keeps the stroke inside phone and desktop canvases while the hull is partly clipped', () => {
    for (const width of [246, 390, 1348]) {
      const result = selectionBrackets(points(-50, -30, width + 80, 500), { width, height: 320 });
      expect(result).toMatchObject({ visible: true, left: 8, top: 8, right: width - 8, bottom: 312, leg: 14 });
    }
  });

  it('shortens corner legs for a small distant module without joining them into a box', () => {
    const result = selectionBrackets(points(60, 80, 64, 86), { width: 390, height: 320 });
    expect(result).toMatchObject({ visible: true, left: 54, top: 74, right: 70, bottom: 92, leg: 4 });
    expect(result.leg * 2).toBeLessThan(result.right - result.left);
  });

  it('hides degenerate, behind-camera and wholly off-screen bounds', () => {
    for (const input of [[], points(100, 80, 200, 160, 1), points(100, 80, 200, 160, -1), points(-100, 70, -50, 90),
      points(500, 80, 600, 120), points(20, 400, 60, 450), points(20, -80, 60, -40), [{ x: NaN, y: 10, z: .5 }]]) {
      expect(selectionBrackets(input, { width: 390, height: 320 })).toEqual({ visible: false, path: '' });
    }
    const crossingNearPlane = points(100, 80, 200, 160); crossingNearPlane[0].z = -1.1;
    expect(selectionBrackets(crossingNearPlane, { width: 390, height: 320 }).visible).toBe(false);
  });

  it('uses all bounds corners and preserves its inputs through resize', () => {
    const input = Object.freeze(points(100, 80, 240, 170).concat({ x: 270, y: 60, z: .4 }).map(Object.freeze));
    const wide = selectionBrackets(input, Object.freeze({ width: 390, height: 320 }));
    const narrow = selectionBrackets(input, { width: 246, height: 320 });
    expect(wide).toMatchObject({ right: 276, top: 54 });
    expect(narrow.right).toBe(238);
    expect(input[4]).toEqual({ x: 270, y: 60, z: .4 });
  });
});

describe('space station camera-plane panning', () => {
  it('moves the camera and pivot equally so content follows the pointer without rotating or zooming', () => {
    const position = Object.freeze([0, 0, 10]), target = Object.freeze([0, 0, 0]);
    const options = Object.freeze({ dx: 40, dy: 20, fov: 60, height: 400 });
    const result = pan(position, target, options), units = 20 * Math.tan(Math.PI / 6) / 400;
    expectVectorClose(result.shift, [-40 * units, 20 * units, 0]);
    expectVectorClose(offset(result.position, result.target), offset(position, target));
    expect(result.limited).toBe(false);
    expect(position).toEqual([0, 0, 10]); expect(target).toEqual([0, 0, 0]);
  });

  it('uses the tilted camera plane instead of world axes at an off-origin target', () => {
    const position = [7, 5, 13], target = [1, 2, 4], relative = offset(position, target);
    const result = pan(position, target, { dx: 17, dy: -12, fov: 46, height: 500 });
    expectVectorClose(offset(result.position, position), offset(result.target, target));
    expectVectorClose(offset(result.position, result.target), relative);
    expect(result.shift.reduce((sum, value, index) => sum + value * relative[index], 0)).toBeCloseTo(0, 11);
    expect(result.shift[1]).toBeLessThan(0);
  });

  it('scales translation with range, field of view and CSS height', () => {
    const options = { dx: 15, dy: 8, fov: 46, height: 400 };
    const normal = pan([0, 0, 10], [0, 0, 0], options);
    expectVectorClose(pan([0, 0, 20], [0, 0, 0], options).shift, normal.shift.map(n => n * 2));
    expectVectorClose(pan([0, 0, 10], [0, 0, 0], { ...options, height: 800 }).shift, normal.shift.map(n => n / 2));
    const wider = pan([0, 0, 10], [0, 0, 0], { ...options, fov: 60 });
    expect(Math.abs(wider.shift[0])).toBeGreaterThan(Math.abs(normal.shift[0]));
  });

  it('is reversible away from boundaries, including near the polar orbit limit', () => {
    for (const eye of [[8.2, 4.8, 10.4], [0, 9.98, .6], [0, -3.7, 9]]) {
      const target = [0, 0, 1], options = { dx: 9, dy: 6, height: 500 };
      const next = pan(eye, target, options), returned = pan(next.position, next.target, { ...options, dx: -9, dy: -6 });
      expect(next.limited).toBe(false);
      expectVectorClose(returned.position, eye); expectVectorClose(returned.target, target);
    }
  });

  it('shortens the entire pan at the Earth-side floor without changing the direction or camera angle', () => {
    const eye = [0, -3.6, 10], target = [0, 0, 0], relative = offset(eye, target);
    const result = pan(eye, target, { dx: 100, dy: -100, height: 320 });
    expect(result.limited).toBe(true); expect(result.position[1]).toBeCloseTo(-3.8, 12);
    expect(result.target[1]).toBeGreaterThanOrEqual(-3.8);
    expectVectorClose(offset(result.position, result.target), relative);
    expect(result.shift.reduce((sum, value, index) => sum + value * relative[index], 0)).toBeCloseTo(0, 10);
    const stopped = pan(result.position, result.target, { dx: 100, dy: -100, height: 320 });
    expectVectorClose(stopped.shift, [0, 0, 0]);
  });

  it('bounds the custom pivot and keeps all results finite after repeated long drags', () => {
    let position = [8.2, 4.8, 10.4], target = [0, 0, 1];
    const relative = offset(position, target);
    for (const [dx, dy] of [[-100000, 100000], [100000, 100000], [100000, -100000], [-100000, -100000]]) {
      const result = pan(position, target, { dx, dy, fov: 100, height: 1 });
      expect(result.limited).toBe(true);
      expect(result.target[0]).toBeGreaterThanOrEqual(-24.000000001); expect(result.target[0]).toBeLessThanOrEqual(24.000000001);
      expect(result.target[2]).toBeGreaterThanOrEqual(-24.000000001); expect(result.target[2]).toBeLessThanOrEqual(24.000000001);
      expect(result.target[1]).toBeGreaterThanOrEqual(-3.800000001); expect(result.target[1]).toBeLessThanOrEqual(24.000000001);
      expect(result.position[1]).toBeGreaterThanOrEqual(-3.800000001);
      expect(result.position.concat(result.target).every(Number.isFinite)).toBe(true);
      expectVectorClose(offset(result.position, result.target), relative, 9);
      position = result.position; target = result.target;
    }
  });

  it('treats missing or invalid pixel deltas as a stationary view', () => {
    for (const options of [{}, { dx: NaN, dy: Infinity }, { dx: 0, dy: 0 }]) {
      const result = pan(defaultPosition, defaultTarget, options);
      expectVectorClose(result.position, defaultPosition); expectVectorClose(result.target, defaultTarget);
      expect(result.limited).toBe(false);
    }
  });
});

describe('space station 3D compass projection', () => {
  it('keeps a broadside axis full length and shortens one that points toward the viewer', () => {
    const side = axisProjection([1, 0, 0]), tilted = axisProjection([.6, 0, .8]);
    expect(side).toMatchObject({ x: 87, y: 56, length: 31, depth: 0, mode: 'across' });
    expect(tilted.length).toBeCloseTo(18.6, 10);
    expect(tilted.x).toBeCloseTo(74.6, 10);
    expect(tilted.depth).toBeCloseTo(.8, 10);
    expect(axisProjection([0, 1, 0]).y).toBe(25);
    expect(axisProjection([0, -1, 0]).y).toBe(87);
  });

  it('distinguishes end-on directions with stable nearby labels at the near-zero crossing', () => {
    for (const x of [-.01, 0, .01]) {
      const toward = axisProjection([x, 0, 1]), away = axisProjection([x, 0, -1]);
      expect(toward.mode).toBe('toward');
      expect(away.mode).toBe('away');
      expect(toward.labelX).toBe(69);
      expect(toward.labelY).toBe(45);
      expect(away.labelX).toBe(69);
      expect(away.labelY).toBe(45);
      expect(toward.length).toBeLessThan(.32);
    }
    expect(axisProjection([.119, 0, Math.sqrt(1 - .119 ** 2)]).mode).toBe('toward');
    expect(axisProjection([.121, 0, Math.sqrt(1 - .121 ** 2)]).mode).toBe('across');
  });

  it('depends on direction alone and keeps tip and label positions inside the widget', () => {
    for (const direction of [[1, 2, 2], [-4, -3, -2], [0, 1, 0], [0, 0, -1]]) {
      const frozen = Object.freeze(direction);
      const projection = axisProjection(frozen), scaled = axisProjection(direction.map(value => value * 200));
      for (const key of ['x', 'y', 'length', 'depth', 'labelX', 'labelY']) {
        expect(scaled[key]).toBeCloseTo(projection[key], 10);
      }
      expect(scaled.mode).toBe(projection.mode);
      expect(projection.x).toBeGreaterThanOrEqual(25);
      expect(projection.x).toBeLessThanOrEqual(87);
      expect(projection.labelX).toBeGreaterThanOrEqual(16);
      expect(projection.labelX).toBeLessThanOrEqual(96);
      expect(projection.labelY).toBeGreaterThanOrEqual(16);
      expect(projection.labelY).toBeLessThanOrEqual(96);
    }
  });
});

describe('space station 3D label placement', () => {
  it('flips long labels near the right edge and keeps the leader attached to the actual anchor', () => {
    const anchor = Object.freeze({ x: 303.25, y: 160.75, z: .5 });
    const viewport = Object.freeze({ width: 320, height: 320, top: 52, bottom: 54 });
    const size = Object.freeze({ width: 152, height: 34 });
    const layout = labelLayout(anchor, viewport, size);
    expect(layout.visible).toBe(true);
    expect(layout.left).toBe(anchor.x - size.width - 16);
    expect(layout.endX).toBe(layout.left + size.width);
    expect(layout.endY).toBe(layout.top + size.height);
    expect(layout.left + size.width).toBeLessThanOrEqual(310);
  });

  it('reserves space for HUD and help while keeping labels inside phone and desktop canvases', () => {
    for (const width of [246, 320, 390, 1348]) {
      for (const x of [0, width / 2, width]) {
        for (const y of [0, 160, 320]) {
          const layout = labelLayout({ x, y, z: 0 }, { width, height: 320, top: 108, bottom: 54 }, { width: 190, height: 48 });
          expect(layout.visible).toBe(true);
          expect(layout.left).toBeGreaterThanOrEqual(10);
          expect(layout.left + 190).toBeLessThanOrEqual(width - 10);
          expect(layout.top).toBeGreaterThanOrEqual(108);
          expect(layout.top + 48).toBeLessThanOrEqual(266);
          expect(layout.endX).toBeGreaterThanOrEqual(layout.left);
          expect(layout.endX).toBeLessThanOrEqual(layout.left + 190);
        }
      }
    }
  });

  it('hides out-of-frame and behind-camera anchors instead of pretending the label points to an edge', () => {
    for (const anchor of [{ x: -1, y: 100, z: 0 }, { x: 321, y: 100, z: 0 }, { x: 100, y: -1, z: 0 },
      { x: 100, y: 321, z: 0 }, { x: 100, y: 100, z: 1.1 }, { x: 100, y: 100, z: -1.1 }, { x: NaN, y: 100, z: 0 }]) {
      expect(labelLayout(anchor, { width: 320, height: 320 }, { width: 100, height: 32 }).visible).toBe(false);
    }
  });
});

describe('space station target-centered camera model', () => {
  it('rotates around an off-origin target without changing range or mutating its inputs', () => {
    const position = Object.freeze([7.4, 3.5, 14.2]), target = Object.freeze([1.4, -.5, 2.2]), options = Object.freeze({ yaw: Math.PI / 2 });
    const state = pose(position, target, options), relative = offset(position, target);
    expectVectorClose(state.position, [target[0] + relative[2], position[1], target[2] - relative[0]]);
    expect(state.distance).toBeCloseTo(Math.hypot(...relative), 12);
    expect(state.target).toEqual(target);
    expect(state.target).not.toBe(target);
    expect(state.position).not.toBe(position);
    expect(position).toEqual([7.4, 3.5, 14.2]); expect(target).toEqual([1.4, -.5, 2.2]); expect(options).toEqual({ yaw: Math.PI / 2 });
    expectConsistent(state);
    state.position[0] = 999; state.target[1] = 999;
    expect(pose(position, target, options).target).toEqual(target);
    expectVectorClose(pose(position, target, options).position, [target[0] + relative[2], position[1], target[2] - relative[0]]);
  });

  it('zooms relative to the selected target and reverses yaw and zoom away from constraints', () => {
    const position = [7.2, 3.3, 11.1], target = [1.2, -.7, 3.1], relative = offset(position, target);
    for (const zoom of [.5, 1.5, 2]) {
      const state = pose(position, target, { zoom });
      expectVectorClose(offset(state.position, target), relative.map(value => value * zoom));
      expect(state.distance).toBeCloseTo(Math.hypot(...relative) * zoom, 11);
      expect(state.target).toEqual(target); expectConsistent(state);
    }
    const moved = pose(position, target, { yaw: .73, zoom: 1.4 });
    const restored = pose(moved.position, moved.target, { yaw: -.73, zoom: 1 / 1.4 });
    expectVectorClose(restored.position, position);
    expect(restored.distance).toBeCloseTo(Math.hypot(...relative), 11);
    expectVectorClose(pose(position, target, { yaw: .73 + 8 * Math.PI }).position, pose(position, target, { yaw: .73 }).position);
  });

  it('moves downward with positive pitch while keeping distance and azimuth unchanged', () => {
    const position = [6, 5, 10], target = [1, .2, 2], initial = pose(position, target);
    const down = pose(position, target, { pitch: .2 }), up = pose(position, target, { pitch: -.2 });
    expect(down.polar).toBeCloseTo(initial.polar + .2, 12); expect(up.polar).toBeCloseTo(initial.polar - .2, 12);
    expect(down.position[1]).toBeLessThan(initial.position[1]); expect(up.position[1]).toBeGreaterThan(initial.position[1]);
    for (const state of [down, up]) {
      expect(state.distance).toBeCloseTo(initial.distance, 12);
      expect(Math.sin(state.azimuth)).toBeCloseTo(Math.sin(initial.azimuth), 12);
      expect(Math.cos(state.azimuth)).toBeCloseTo(Math.cos(initial.azimuth), 12);
      expectConsistent(state);
    }
    expectVectorClose(pose(down.position, target, { pitch: -.2 }).position, position);
  });

  it('clamps target distance and configured bounds without overshooting the selected target', () => {
    const position = [0, 0, 11], target = [0, 0, 1];
    for (const [options, distance] of [
      [{ zoom: .001 }, 3.2], [{ zoom: 1e6 }, 30], [{ zoom: .7 }, 7],
      [{ minDistance: -5, maxDistance: .5 }, 1],
      [{ minDistance: 100, maxDistance: 100 }, 15],
      [{ minDistance: 100, maxDistance: 100, zoom: 10 }, 40],
      [{ minDistance: 5, maxDistance: 2 }, 5],
      [{ minDistance: 5, maxDistance: 12, zoom: .01 }, 5],
      [{ minDistance: 5, maxDistance: 12, zoom: 100 }, 12],
    ]) {
      const state = pose(position, target, options);
      expect(state.distance).toBeCloseTo(distance, 12);
      expectVectorClose(state.position, [0, 0, target[2] + distance]);
      expect(state.position[2]).toBeGreaterThan(target[2]);
      expectConsistent(state);
    }
  });

  it('keeps both pole angles and the station floor safe through repeated large camera moves', () => {
    const target = [.8, -.9, 2], low = pose([3.8, .3, 8], target, { pitch: 1e6 });
    expect(low.position[1]).toBeCloseTo(-3.8, 11);
    expect(low.polar).toBeCloseTo(Math.acos((-3.8 - target[1]) / low.distance), 12);
    const high = pose([3.8, .3, 8], target, { pitch: -1e6 });
    expect(high.polar).toBe(.06);
    let state = high;
    for (let i = 0; i < 48; i++) {
      state = pose(state.position, target, { yaw: 37 * Math.PI + .3, pitch: i % 2 ? 20 : -20, zoom: [.01, 100, 1][i % 3] });
      expect(state.distance).toBeGreaterThanOrEqual(3.2 - 1e-12); expect(state.distance).toBeLessThanOrEqual(30 + 1e-12);
      expect(state.polar).toBeGreaterThanOrEqual(.06); expect(state.polar).toBeLessThanOrEqual(Math.PI - .06);
      expect(state.position[1]).toBeGreaterThanOrEqual(-3.8 - 1e-11);
      expect(state.target).toEqual(target); expectConsistent(state);
    }
    for (const sign of [-1, 1]) {
      const pole = pose([target[0], target[1] + sign * 10, target[2]], target);
      expect(pole.polar).toBeGreaterThanOrEqual(.06); expect(pole.polar).toBeLessThanOrEqual(Math.PI - .06);
      expect(pole.position[1]).toBeGreaterThanOrEqual(-3.8 - 1e-11); expectConsistent(pole);
    }
  });

  it('uses finite defaults for invalid vectors and ignores invalid motion options', () => {
    const defaults = pose(defaultPosition, defaultTarget);
    expect(pose()).toEqual(defaults); expect(pose(undefined, undefined, null)).toEqual(defaults);
    for (const vector of [null, [], [1, 2], [0, NaN, 1], [Infinity, 0, 1], ['bad', 0, 1], {}]) {
      expect(pose(vector, defaultTarget)).toEqual(defaults);
      expect(pose(defaultPosition, vector)).toEqual(defaults);
    }
    for (const invalid of [NaN, Infinity, -Infinity, 'bad']) {
      expect(pose(defaultPosition, defaultTarget, { yaw: invalid, pitch: invalid, minDistance: invalid, maxDistance: invalid })).toEqual(defaults);
    }
    for (const zoom of [0, -1, -Infinity, Infinity, NaN, 'bad', null]) expect(pose(defaultPosition, defaultTarget, { zoom })).toEqual(defaults);
    expectVectorClose(defaults.position, defaultPosition); expectConsistent(defaults);
  });

  it('chooses a finite outward direction when camera and target coincide', () => {
    const target = [1.5, -.9, 3], state = pose(target, target), length = Math.hypot(.4, 1);
    expect(state.target).toEqual(target); expect(state.distance).toBeCloseTo(10, 12);
    expectVectorClose(offset(state.position, target), [0, 4 / length, 10 / length]);
    expectConsistent(state);
    const limited = pose(target, target, { minDistance: 12, maxDistance: 15 });
    expect(limited.distance).toBe(12); expect(limited.position[1]).toBeGreaterThan(target[1]); expectConsistent(limited);
  });
});
