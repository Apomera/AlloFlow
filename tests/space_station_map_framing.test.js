import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_spacestation.js', 'utf8');
const { fit, pose, playbackRate } = new Function(source.slice(source.indexOf('  var ISS_GM ='), source.indexOf('  function issTransferPlan(')) + '\nreturn { fit: issMapCameraFit, pose: issMapCameraPose, playbackRate: issMapPlaybackRate };')();

function subtract(a, b) { return a.map((value, axis) => value - b[axis]); }
function dot(a, b) { return a.reduce((sum, value, axis) => sum + value * b[axis], 0); }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function normalize(vector) { const length = Math.hypot(...vector); return vector.map(value => value / length); }

// Project world-space points through an independently constructed perspective
// camera. Tangent points ensure a coarse sphere grid cannot hide clipped edges.
function projectSphere(position, target, radius, fov, aspect) {
  const forward = normalize(subtract(target, position));
  const right = normalize(cross(forward, [0, 1, 0])), up = cross(right, forward);
  const distance = Math.hypot(...subtract(position, target));
  const points = [];
  for (let latitude = 0; latitude <= 12; latitude++) {
    const polar = latitude * Math.PI / 12;
    for (let longitude = 0; longitude < 24; longitude++) {
      const azimuth = longitude * Math.PI / 12;
      points.push([target[0] + radius * Math.sin(polar) * Math.cos(azimuth), target[1] + radius * Math.cos(polar), target[2] + radius * Math.sin(polar) * Math.sin(azimuth)]);
    }
  }
  const tangentDepth = radius * radius / distance;
  const tangentRadius = Math.sqrt(radius * radius - tangentDepth * tangentDepth);
  for (let index = 0; index < 16; index++) {
    const angle = index * Math.PI / 8;
    points.push(target.map((value, axis) => value - forward[axis] * tangentDepth + tangentRadius * (right[axis] * Math.cos(angle) + up[axis] * Math.sin(angle))));
  }
  const lens = 1 / Math.tan(fov * Math.PI / 360);
  const projected = points.map(point => {
    const relative = subtract(point, position), depth = dot(relative, forward);
    return { x: dot(relative, right) * lens / (depth * aspect), y: dot(relative, up) * lens / depth, depth };
  });
  return { x: Math.max(...projected.map(point => Math.abs(point.x))), y: Math.max(...projected.map(point => Math.abs(point.y))), minDepth: Math.min(...projected.map(point => point.depth)) };
}

function expectContained(projected) {
  expect(projected.minDepth).toBeGreaterThan(0);
  expect(projected.x).toBeLessThanOrEqual(1 + 1e-10);
  expect(projected.y).toBeLessThanOrEqual(1 + 1e-10);
}

describe('space station perspective framing', () => {
  it('uses finite documented defaults when options are omitted', () => {
    const state = fit();
    expect(fit(null)).toEqual(state); expect(fit({})).toEqual(state);
    expect(state).toMatchObject({ radius: 4, padding: 1.16, verticalFov: 46, fits: true });
    expect(state.horizontalFov).toBeGreaterThan(state.verticalFov);
    expect(state.distance).toBe(state.requiredDistance);
    expect(Object.values(state).filter(value => typeof value === 'number').every(Number.isFinite)).toBe(true);
    const projected = projectSphere([0, 0, state.distance], [0, 0, 0], 4 * 1.16, 46, 1.3);
    expectContained(projected); expect(projected.y).toBeCloseTo(1, 11);
  });

  it.each([
    ['landscape', 16 / 9, 'y'],
    ['portrait', .5, 'x'],
    ['square', 1, 'y'],
    ['wide', 4, 'y'],
  ])('contains the complete padded sphere in a %s viewport', (_name, aspect, limitingAxis) => {
    const options = { radius: 4, fov: 46, aspect, padding: 1.16 }, state = fit(options);
    const projected = projectSphere([0, 0, state.distance], [0, 0, 0], options.radius * options.padding, options.fov, aspect);
    expect(state.fits).toBe(true); expectContained(projected);
    expect(projected[limitingAxis]).toBeCloseTo(1, 11);
    expect(Math.tan(state.horizontalFov * Math.PI / 360) / Math.tan(state.verticalFov * Math.PI / 360)).toBeCloseTo(aspect, 12);
    // A shorter distance must clip the limiting edge, even for a rotated sphere.
    const tooClose = projectSphere([0, 0, state.distance * .99], [0, 0, 0], options.radius * options.padding, options.fov, aspect);
    expect(tooClose[limitingAxis]).toBeGreaterThan(1);
  });

  it('reserves padding around the actual sphere and scales range with the envelope', () => {
    const bare = fit({ radius: 3, padding: 1 }), padded = fit({ radius: 3, padding: 1.5 }), doubled = fit({ radius: 6, padding: 1 });
    expect(padded.requiredDistance).toBeCloseTo(bare.requiredDistance * 1.5, 12);
    expect(doubled.requiredDistance).toBeCloseTo(bare.requiredDistance * 2, 12);
    const actualSphere = projectSphere([0, 0, padded.distance], [0, 0, 0], 3, 46, 1.3);
    expectContained(actualSphere); expect(actualSphere.y).toBeLessThan(.7);
    expect(projectSphere([0, 0, bare.distance], [0, 0, 0], 3, 46, 1.3).y).toBeCloseTo(1, 11);
  });

  it('falls back to finite defaults for missing and nonfinite numeric inputs', () => {
    const defaults = fit();
    for (const invalid of [undefined, null, '', NaN, Infinity, -Infinity, 'bad']) {
      expect(fit({ radius: invalid, padding: invalid, fov: invalid, aspect: invalid, minDistance: invalid, maxDistance: invalid })).toEqual(defaults);
    }
    expect(fit({ radius: '4', padding: '1.16', fov: '46', aspect: '1.3', minDistance: '3.2', maxDistance: '40' })).toEqual(defaults);
  });

  it('clamps the lens and envelope inputs without losing oversized radii', () => {
    for (const [field, supplied, clamped] of [
      ['radius', -10, .1], ['radius', 5000, 1000],
      ['padding', 0, 1], ['padding', 10, 1.5],
      ['fov', -1, 15], ['fov', 360, 100],
      ['aspect', 0, .4], ['aspect', 20, 4],
    ]) expect(fit({ [field]: supplied })).toEqual(fit({ [field]: clamped }));
    expect(fit({ radius: 1000 }).radius).toBe(1000);
    expect(fit({ radius: 1000 }).fits).toBe(false);
    expect(fit({ fov: 100 }).requiredDistance).toBeLessThan(fit({ fov: 15 }).requiredDistance);
    expect(fit({ aspect: .4 }).requiredDistance).toBeGreaterThan(fit({ aspect: 1 }).requiredDistance);
  });

  it('honors camera distance bounds and clamps inverted or excessive bounds', () => {
    for (const [options, distance] of [
      [{ radius: .1 }, 3.2],
      [{ radius: .1, minDistance: -5, maxDistance: .5 }, 1],
      [{ radius: .1, minDistance: 100, maxDistance: 100 }, 15],
      [{ radius: 20, minDistance: 100, maxDistance: 100 }, 40],
      [{ radius: 4, minDistance: 5, maxDistance: 2 }, 5],
      [{ radius: 4, minDistance: 1, maxDistance: 7 }, 7],
    ]) {
      const state = fit(options);
      expect(state.distance).toBe(distance);
      expect(state.fits).toBe(state.requiredDistance <= distance);
    }
  });

  it('reports failure when the distance cap cannot contain a large station', () => {
    const state = fit({ radius: 20 });
    expect(state.radius).toBe(20); expect(state.distance).toBe(40);
    expect(state.requiredDistance).toBeGreaterThan(40); expect(state.fits).toBe(false);
    const actualSphere = projectSphere([0, 0, state.distance], [0, 0, 0], 20, 46, 1.3);
    expect(actualSphere.y).toBeGreaterThan(1);
    expect(fit({ radius: 50 }).requiredDistance).toBeCloseTo(state.requiredDistance * 2.5, 10);
    expect(fit({ radius: 50 }).fits).toBe(false);
  });

  it('preserves the fit when camera motion reorients the view at the floor', () => {
    const options = { radius: 4, padding: 1.16, fov: 46, aspect: .5 }, state = fit(options);
    const target = [2, -1, 3], original = [target[0], target[1], target[2] + state.distance];
    const moved = pose(original, target, { pitch: 100, yaw: .93, maxDistance: 40 });
    expect(moved.position[1]).toBeCloseTo(-3.8, 11);
    expect(moved.distance).toBeCloseTo(state.distance, 11); expect(moved.target).toEqual(target);
    const before = projectSphere(original, target, options.radius * options.padding, options.fov, options.aspect);
    const after = projectSphere(moved.position, moved.target, options.radius * options.padding, options.fov, options.aspect);
    expectContained(after);
    expect(after.x).toBeCloseTo(before.x, 10); expect(after.y).toBeCloseTo(before.y, 10);
    expect(after.x).toBeCloseTo(1, 10);
  });

  it('does not mutate input options or share mutable result state', () => {
    const options = Object.freeze({ radius: 3, padding: 1.2, fov: 60, aspect: .8, minDistance: 4, maxDistance: 35 });
    const expected = fit(options), changed = fit(options);
    expect(changed).not.toBe(expected);
    changed.distance = 999; changed.radius = 999; changed.fits = false;
    expect(fit(options)).toEqual(expected);
    expect(options).toEqual({ radius: 3, padding: 1.2, fov: 60, aspect: .8, minDistance: 4, maxDistance: 35 });
  });
});

describe('space station playback rate validation', () => {
  it('accepts each supported rate as a number or nonempty numeric string', () => {
    for (const rate of [.1, 1, 10, 60, 180]) {
      expect(playbackRate(rate)).toBe(rate);
      expect(playbackRate(String(rate), 180)).toBe(rate);
      expect(playbackRate(` \t${rate}\n`, false)).toBe(rate);
    }
    expect(playbackRate('1e1')).toBe(10); expect(playbackRate('0.10')).toBe(.1);
  });

  it('rejects coercible nonnumeric types and unsupported rates in favor of a valid fallback', () => {
    for (const value of [undefined, null, true, false, '', ' \t\n ', NaN, Infinity, -Infinity, [], [1], {}, 0, -1, .5, 2, 100, 'fast', '180x']) {
      expect(playbackRate(value, .1)).toBe(.1);
      expect(playbackRate(value, ' 10 ')).toBe(10);
    }
  });

  it('uses 60 when the value and fallback are invalid and never overrides a valid value', () => {
    expect(playbackRate()).toBe(60);
    for (const fallback of [undefined, null, true, false, '', ' ', NaN, Infinity, -Infinity, [], [1], {}, 0, 2, 'fast']) {
      expect(playbackRate('invalid', fallback)).toBe(60);
      expect(playbackRate(180, fallback)).toBe(180);
    }
    for (const fallback of [.1, 1, 10, 60, 180]) expect(playbackRate(null, String(fallback))).toBe(fallback);
  });
});
