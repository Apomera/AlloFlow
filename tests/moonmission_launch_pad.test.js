/** Trajectory-triggered swing arms and the launch pad's Canvas state contract. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

const copy = value => JSON.parse(JSON.stringify(value));
const pad = (time = -5, width = 1014, height = 400, altitude = 0, release = 0.12) =>
  P.launchPadGeometry(time, width, height, altitude, release);
const profile = rows => ({ samples: rows.map(([time, altitude]) => ({ time, altitude })) });
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}
function finite(value) {
  if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true);
  else if (value && typeof value === 'object') Object.values(value).forEach(finite);
}
function nearPoint(actual, expected) {
  expect(actual.x).toBeCloseTo(expected.x, 10); expect(actual.y).toBeCloseTo(expected.y, 10);
}

// Record paint-time state and preserve the caller's clip and transform. The
// current path remains outside save/restore, as it does on a native canvas.
function recorder(alpha = 0.41) {
  let state = { globalAlpha: alpha, fillStyle: '#123456', strokeStyle: '#654321', lineWidth: 2.3,
    lineCap: 'round', lineJoin: 'bevel', transform: [1, 0, 0, 1, 13, 7], clips: ['caller-clip'] };
  let path = [], stack = [];
  const paints = [], clips = [], calls = [];
  const snapshot = () => ({ ...state, transform: [...state.transform], clips: [...state.clips] });
  const initial = snapshot();
  const grad = () => ({ addColorStop() {} });
  const methods = {
    save() { stack.push(snapshot()); calls.push('save'); },
    restore() { state = stack.pop(); calls.push('restore'); },
    beginPath() { path = []; }, moveTo(x, y) { path.push({ x, y }); }, lineTo(x, y) { path.push({ x, y }); },
    closePath() {}, rect(x, y, width, height) { path.push({ x, y, width, height }); },
    clip() { const points = copy(path); state.clips.push(points); clips.push(points); },
    fill() { paints.push({ kind: 'fill', path: copy(path), state: snapshot() }); },
    stroke() { paints.push({ kind: 'stroke', path: copy(path), state: snapshot() }); },
    fillRect(x, y, width, height) { paints.push({ kind: 'rect', path: [{ x, y, width, height }], state: snapshot() }); },
    fillText() {}, measureText: value => ({ width: String(value).length * 5 }),
    translate(x, y) { state.transform[4] += x; state.transform[5] += y; },
    createLinearGradient: grad, createConicGradient: grad,
  };
  const ctx = new Proxy({}, {
    get: (_, key) => key in methods ? methods[key] : state[key],
    set: (_, key, value) => { state[key] = value; return true; },
  });
  return { ctx, paints, clips, calls, initial, state: snapshot, depth: () => stack.length };
}

describe('Launch pad first-motion release', () => {
  it('interpolates the first three-quarter-inch crossing, including a flat interval', () => {
    const threshold = 0.75 * 0.0254;
    const p = profile([[0, 0], [0.2, 0], [0.5, 0.01], [0.9, 0.03], [1.2, 0.2]]);
    const expected = 0.5 + (threshold - 0.01) / (0.03 - 0.01) * (0.9 - 0.5);
    expect(P.launchPadReleaseTime(p)).toBeCloseTo(expected, 14);
    expect(P.launchPadReleaseTime(profile([[0, 0], [0.4, threshold], [0.8, 1]]))).toBe(0.4);
    expect(P.launchPadReleaseTime(profile([[0, 0], [1, 0.1905]]))).toBeCloseTo(0.1, 14);
  });

  it('releases at the rise reported by the actual flight sampler', () => {
    const flight = P.launchProfile(), release = P.launchPadReleaseTime(flight);
    expect(release).toBeGreaterThan(0); expect(release).toBeLessThan(1);
    expect(P.launchSample(flight, release).altitude).toBeCloseTo(0.75 * 0.0254, 10);
    expect(P.launchSample(flight, release - 0.00001).altitude).toBeLessThan(0.01905);
    expect(P.launchSample(flight, release + 0.00001).altitude).toBeGreaterThan(0.01905);
  });

  it('rejects malformed, reversed or nonfinite sample histories before the crossing', () => {
    for (const p of [null, {}, { samples: [] }, profile([[0, 0]]), profile([[1, 0], [2, 1]]),
      profile([[0, 0.001], [1, 1]]), profile([[0, 0], [0, 0.03]]), profile([[0, 0], [-1, 0.03]]),
      profile([[0, 0], [0.2, 0.01], [0.1, 0.03]]), profile([[0, 0], [0.2, 0.01], [0.3, 0.009]]),
      profile([[0, 0], [61, 0.03]]), profile([[0, 0], [NaN, 0.03]]), profile([[0, 0], [1, Infinity]]),
      { samples: [{ time: 0, altitude: 0 }, null] }, profile([[0, 0], [1, 0.01]])]) {
      expect(P.launchPadReleaseTime(p)).toBeNull();
    }
  });

  it('bounds the search and remains deterministic with frozen samples', () => {
    const p = freeze(profile([[0, 0], [0.2, 0.01], [0.4, 0.03]])), before = JSON.stringify(p);
    const release = P.launchPadReleaseTime(p);
    expect(P.launchPadReleaseTime(p)).toBe(release); expect(JSON.stringify(p)).toBe(before);
    const tooLate = profile(Array.from({ length: 129 }, (_, i) => [i / 10, i === 128 ? 0.03 : 0]));
    expect(P.launchPadReleaseTime(tooLate)).toBeNull();
    const lastAllowed = profile(Array.from({ length: 128 }, (_, i) => [i / 10, i === 127 ? 0.03 : 0]));
    expect(P.launchPadReleaseTime(lastAllowed)).toBeGreaterThan(12.6);
    // Samples after the first valid crossing are irrelevant to the release.
    expect(P.launchPadReleaseTime({ samples: [...p.samples, { time: NaN, altitude: NaN }] })).toBe(release);
  });
});

describe('Launch pad geometry', () => {
  it('rejects invalid time, viewport, altitude and release values', () => {
    const valid = [-5, 1014, 400, 0, 0.12];
    for (let i = 0; i < valid.length; i++) for (const bad of [undefined, null, NaN, Infinity, -Infinity, '2']) {
      const args = [...valid]; args[i] = bad; expect(P.launchPadGeometry(...args)).toBeNull();
    }
    for (const [i, values] of [[0, [-5.01, 10000.01]], [1, [0, -1, 0.999, Number.MIN_VALUE, 16385]], [2, [0, -1, 0.999, Number.MIN_VALUE, 16385]],
      [3, [-1, 100000001]], [4, [-0.01, 60.01]]]) {
      for (const bad of values) { const args = [...valid]; args[i] = bad; expect(P.launchPadGeometry(...args)).toBeNull(); }
    }
    for (const args of [[-5, 1, 1, 0, 0], [10000, 16384, 16384, 100000000, 60]]) finite(P.launchPadGeometry(...args));
  });

  it('keeps the established rocket scale and deck datum while the camera rises', () => {
    const field = pad(1, 900, 500, 120);
    expect(field.k * P.saturnVHeight()).toBeCloseTo(500 * 0.58, 12);
    expect(field.cx).toBe(450);
    expect(field.lift).toBeCloseTo(120 * 1.2 / 9.25, 12);
    expect(field.deck.x).toBe(900 * 0.4); expect(field.deck.width).toBe(900 * 0.22);
    expect(field.deck.y).toBeCloseTo(500 * 0.795 + field.lift, 12); expect(field.deck.height).toBe(500 * 0.03);
    expect(field.bays).toHaveLength(10);
    expect(field.bays[0].y0).toBe(field.tower.y);
    expect(field.bays.at(-1).y1).toBeCloseTo(field.tower.y + field.tower.height, 12);
    field.bays.slice(1).forEach((bay, i) => expect(bay.y0).toBe(field.bays[i].y1));
  });

  it('attaches all nine arms to the corresponding stage surface', () => {
    const field = pad(), rocket = P.saturnV(recorder().ctx, field.cx, 400 * 0.22, 400 * 0.58, 1);
    expect(field.arms.map(arm => arm.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(field.arms.map(arm => arm.section)).toEqual(['s1', 's1', 's2', 's2', 's2', 's4b', 'iu', 'sm', 'cm']);
    for (const arm of field.arms) {
      const section = rocket.sections.find(s => s.id === arm.section);
      expect(arm.contact.y).toBeGreaterThan(section.y0); expect(arm.contact.y).toBeLessThan(section.y1);
      const fraction = (arm.contact.y - section.y0) / (section.y1 - section.y0);
      const radius = (section.w0 + (section.w1 - section.w0) * fraction) / 2;
      expect(arm.contact.x).toBeCloseTo(field.cx + radius, 12);
      expect(arm.hinge.x).toBe(field.tower.x); expect(arm.hinge.y).toBe(arm.contact.y);
      expect(arm.length).toBeCloseTo(arm.hinge.x - arm.contact.x, 12); expect(arm.length).toBeGreaterThan(0);
    }
  });

  it('supports the tower rear, rocket body and fins at narrow and tall viewport ratios', () => {
    for (const width of [160, 312, 390, 1016]) for (const height of [200, 400, 700]) {
      const field = pad(-5, width, height, 25), p = field.platform;
      const rec = recorder();
      const rocket = P.saturnV(rec.ctx, field.cx, height * 0.22 + field.lift, height * 0.58, 1);
      const hullRadius = Math.max(...rocket.sections.flatMap(s => [s.w0, s.w1])) / 2;
      expect(p.x).toBeLessThanOrEqual(field.cx - hullRadius + 1e-10);
      expect(p.x + p.width).toBeGreaterThanOrEqual(field.cx + hullRadius - 1e-10);
      const fins = rec.paints.filter(paint => paint.kind === 'fill' && paint.path.length === 4 &&
        paint.path[0].y !== paint.path[1].y && paint.path[2].y > paint.path[3].y);
      expect(fins).toHaveLength(2);
      fins.flatMap(paint => paint.path).forEach(point => {
        expect(point.x).toBeGreaterThanOrEqual(p.x - 1e-10);
        expect(point.x).toBeLessThanOrEqual(p.x + p.width + 1e-10);
      });
      expect(p.x + p.width).toBeGreaterThanOrEqual(field.tower.x + field.tower.width + field.tower.depth - 1e-10);
      expect(p.y).toBeLessThanOrEqual(field.tower.y + field.tower.height);
      expect(p.y + p.height).toBeGreaterThanOrEqual(field.tower.y + field.tower.height);
      expect(rocket.nozzle).toBeGreaterThanOrEqual(p.y);
      expect(rocket.nozzle).toBeLessThanOrEqual(p.y + p.height);
      expect(p.x).toBeLessThanOrEqual(field.deck.x);
      expect(p.x + p.width).toBeGreaterThanOrEqual(field.deck.x + field.deck.width - 1e-10);
      expect(field.deck).toEqual({ x: width * 0.4, y: height * 0.795 + field.lift,
        width: width * 0.22, height: height * 0.03 });
    }
  });

  it('keeps preflight arms stowed throughout the final countdown', () => {
    for (const time of [-5, -2, 0, 0.12]) {
      const arms = pad(time).arms;
      expect(arms.filter(arm => arm.preflight).map(arm => arm.id)).toEqual([1, 2, 3, 9]);
      for (const arm of arms) {
        expect(arm.connected).toBe(!arm.preflight);
        expect(arm.retraction).toBe(arm.preflight ? 1 : 0);
        if (arm.preflight) { expect(arm.duration).toBe(0); expect(arm.angle).toBeCloseTo(100 * Math.PI / 180, 14); }
        else nearPoint(arm.tip, arm.contact);
      }
    }
  });

  it('disconnects at first motion and finishes each arm at its stated duration', () => {
    const release = 0.25, durations = [6.4, 7.4, 7.7, 8.4, 9];
    expect(pad(release, 1014, 400, 0, release).arms.filter(arm => arm.connected)).toHaveLength(5);
    expect(pad(release + 1e-6, 1014, 400, 0, release).arms.some(arm => arm.connected)).toBe(false);
    durations.forEach((duration, index) => {
      const id = index + 4;
      const midway = pad(release + duration / 2, 1014, 400, 0, release).arms.find(arm => arm.id === id);
      expect(midway.duration).toBe(duration); expect(midway.retraction).toBeCloseTo(0.5, 14);
      expect(midway.angle).toBeCloseTo(50 * Math.PI / 180, 14);
      const done = pad(release + duration, 1014, 400, 0, release).arms.find(arm => arm.id === id);
      expect(done.retraction).toBe(1); expect(done.connected).toBe(false);
    });
  });

  it('preserves rigid arm length in the oblique horizontal-plane projection', () => {
    for (const time of [0.12, 1, 3, 6, 10]) for (const arm of pad(time).arms) {
      const projectedX = (arm.hinge.x - arm.tip.x) / arm.length;
      const projectedY = (arm.tip.y - arm.hinge.y) / (arm.length * 0.22);
      expect(projectedX ** 2 + projectedY ** 2).toBeCloseTo(1, 11);
      expect(Math.atan2(projectedY, projectedX)).toBeCloseTo(arm.angle, 11);
      expect(arm.angle).toBeGreaterThanOrEqual(0); expect(arm.angle).toBeLessThanOrEqual(Math.PI * 5 / 9);
    }
  });

  it('eases continuously with slower arms remaining behind faster arms', () => {
    const firstMotion = pad(0.1201).arms.find(arm => arm.id === 4);
    expect(firstMotion.retraction).toBeGreaterThan(0); expect(firstMotion.retraction).toBeLessThan(1e-8);
    const nearEnd = pad(0.12 + 6.4 - 0.0001).arms.find(arm => arm.id === 4);
    expect(1 - nearEnd.retraction).toBeLessThan(1e-8);
    let previous = Array(5).fill(0);
    for (const time of [0.12, 0.5, 1, 2, 4, 6, 8, 10]) {
      const progress = pad(time).arms.filter(arm => !arm.preflight).map(arm => arm.retraction);
      progress.forEach((value, i) => { expect(value).toBeGreaterThanOrEqual(previous[i]); if (i) expect(value).toBeLessThanOrEqual(progress[i - 1]); });
      previous = progress;
    }
  });

  it('scales structural coordinates together and changes width by horizontal translation', () => {
    const a = pad(3, 600, 400, 100), scale = 1.8, b = pad(3, 600 * scale, 400 * scale, 100 * scale);
    for (const key of ['lift', 'k', 'cx']) expect(b[key]).toBeCloseTo(a[key] * scale, 11);
    for (const object of ['deck', 'tower', 'platform']) for (const key of Object.keys(a[object])) expect(b[object][key]).toBeCloseTo(a[object][key] * scale, 10);
    a.arms.forEach((arm, i) => {
      const other = b.arms[i];
      for (const key of ['hinge', 'contact', 'tip']) nearPoint(other[key], { x: arm[key].x * scale, y: arm[key].y * scale });
      expect(other.length).toBeCloseTo(arm.length * scale, 10); expect(other.angle).toBe(arm.angle);
    });
    const wider = pad(3, 1000, 400, 100);
    a.arms.forEach((arm, i) => {
      nearPoint(wider.arms[i].tip, { x: arm.tip.x + 200, y: arm.tip.y });
      expect(wider.arms[i].length).toBeCloseTo(arm.length, 12);
    });
  });

  it('stops generating pad detail after the ground passes below the viewport', () => {
    const threshold = 400 * 9.25 / 1.2;
    expect(pad(20, 1014, 400, threshold - 1e-6).visible).toBe(true);
    for (const altitude of [threshold + 1e-6, 100000000]) {
      const field = pad(20, 1014, 400, altitude);
      expect(field.visible).toBe(false); expect(field.arms).toEqual([]); expect(field.bays).toEqual([]);
      finite(field); expect(field.deck.y).toBeLessThan(15000000); expect(field.tower.y).toBeLessThan(15000000);
    }
  });

  it('seeks backward exactly and ties ground displacement to altitude, not elapsed time', () => {
    const original = pad(3.5, 390, 400, 25);
    for (const time of [10, 50, 2, -5, 8]) pad(time, 1014, 400, 2000);
    expect(pad(3.5, 390, 400, 25)).toEqual(original);
    const later = pad(100, 390, 400, 25);
    expect(later.deck).toEqual(original.deck); expect(later.tower).toEqual(original.tower);
    expect(later.bays).toEqual(original.bays);
    const higher = pad(3.5, 390, 400, 125), shift = 100 * 1.2 / 9.25;
    expect(higher.deck.y - original.deck.y).toBeCloseTo(shift, 12);
    higher.arms.forEach((arm, i) => nearPoint(arm.tip, { x: original.arms[i].tip.x, y: original.arms[i].tip.y + shift }));
  });
});

describe('Launch pad drawing', () => {
  it('clips the full scene and preserves caller alpha, transform and paint state', () => {
    const field = pad(2), rec = recorder(), result = P.drawLaunchPad(rec.ctx, field);
    expect(result).toEqual(field); expect(rec.clips).toEqual([[{ x: 0, y: 0, width: field.width, height: field.height }]]);
    expect(rec.paints.length).toBeGreaterThan(80);
    for (const paint of rec.paints) {
      expect(paint.state.globalAlpha).toBe(0.41); expect(paint.state.transform).toEqual(rec.initial.transform);
      expect(paint.state.clips).toEqual(['caller-clip', rec.clips[0]]); finite(paint.path);
    }
    expect(rec.paints[0].path).toEqual([{ x: field.deck.x, y: field.deck.y, width: field.deck.width, height: field.deck.height }]);
    expect(rec.state()).toEqual(rec.initial); expect(rec.depth()).toBe(0);
  });

  it('rebuilds geometry from scalars so edited diagnostic paths cannot reach Canvas', () => {
    const field = pad(2), tampered = copy(field), before = JSON.stringify(field);
    tampered.arms = [{ tip: { x: Infinity, y: NaN } }]; tampered.bays = Array(1000).fill({ y0: 1e99 });
    tampered.deck = { x: Infinity }; tampered.platform = { width: NaN }; tampered.tower = null; tampered.visible = false;
    const baseline = recorder(), altered = recorder();
    P.drawLaunchPad(baseline.ctx, freeze(field));
    expect(P.drawLaunchPad(altered.ctx, tampered)).toEqual(field);
    expect(altered.paints).toEqual(baseline.paints); expect(JSON.stringify(field)).toBe(before);
  });

  it('rejects invalid fields, transparent callers and offscreen ground before painting', () => {
    const valid = pad(), rec = recorder();
    for (const field of [null, {}, { ...valid, width: -1 }, { ...valid, releaseTime: NaN },
      { ...valid, altitude: Infinity }, pad(40, 1014, 400, 100000)]) expect(P.drawLaunchPad(rec.ctx, field)).toBeNull();
    expect(rec.calls).toHaveLength(0); expect(rec.paints).toHaveLength(0);
    const hidden = recorder(0); expect(P.drawLaunchPad(hidden.ctx, valid)).toBeNull(); expect(hidden.calls).toHaveLength(0);
    expect(P.drawLaunchPad(null, valid)).toBeNull();
  });

  it('changes light-facing materials while preserving pad and arm geometry', () => {
    const field = pad(2), right = recorder(), left = recorder(), neutral = recorder();
    P.drawLaunchPad(right.ctx, field, { x: 1, y: 0, fraction: 1 });
    P.drawLaunchPad(left.ctx, field, { x: -1, y: 0, fraction: 1 });
    P.drawLaunchPad(neutral.ctx, field);
    expect(right.paints.map(p => [p.kind, p.path])).toEqual(left.paints.map(p => [p.kind, p.path]));
    const paintColor = p => p.kind === 'stroke' ? p.state.strokeStyle : p.state.fillStyle;
    expect(right.paints.map(paintColor)).not.toEqual(left.paints.map(paintColor));
    expect(neutral.paints.every(p => /^#[0-9a-f]{6}$/i.test(paintColor(p)))).toBe(true);
    expect(right.paints.filter(p => /^rgb\(/.test(paintColor(p))).length).toBeGreaterThan(80);
  });
});
