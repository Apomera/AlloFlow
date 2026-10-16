/** Transonic visibility, retained-stage registration and layered Canvas vapour. */
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

const sample = (extra = {}) => ({ mach: 1.06, dynamicPressure: 24000, density: 0.8, stage: 1, lesOn: true, ...extra });
const geometry = (row = sample(), cx = 300, top = 40, height = 330, seconds = 60) =>
  P.launchVapourGeometry(row, cx, top, height, seconds);
const copy = value => JSON.parse(JSON.stringify(value));
function finite(value) {
  if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true);
  else if (value && typeof value === 'object') Object.values(value).forEach(finite);
}
function freeze(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
}

function recorder(alpha = 0.37, gradients = true) {
  let state = { globalAlpha: alpha, fillStyle: '#123456', strokeStyle: '#654321', lineWidth: 2.3,
    lineCap: 'round', lineJoin: 'bevel', globalCompositeOperation: 'source-over',
    transform: [1, 0, 0, 1, 13, 7], clips: ['caller-clip'] };
  let path = [], stack = [];
  const paints = [], calls = [], gradientRecords = [];
  const snapshot = () => ({ ...state, transform: [...state.transform], clips: [...state.clips] });
  const initial = snapshot();
  const gradient = (...args) => {
    const result = { args, stops: [], addColorStop: (offset, color) => result.stops.push({ offset, color }) };
    gradientRecords.push(result); return result;
  };
  const methods = {
    save() { stack.push(snapshot()); calls.push('save'); },
    restore() { state = stack.pop(); calls.push('restore'); },
    beginPath() { path = []; }, moveTo: (x, y) => path.push(['move', x, y]),
    lineTo: (x, y) => path.push(['line', x, y]),
    bezierCurveTo: (...args) => path.push(['bezier', ...args]), quadraticCurveTo: (...args) => path.push(['quadratic', ...args]),
    closePath: () => path.push(['close']),
    clip() { state.clips.push(copy(path)); calls.push('clip'); },
    fill() { paints.push({ kind: 'fill', path: copy(path), state: snapshot() }); },
    stroke() { paints.push({ kind: 'stroke', path: copy(path), state: snapshot() }); },
    fillRect(x, y, width, height) { paints.push({ kind: 'rect', path: [['rect', x, y, width, height]], state: snapshot() }); },
    fillText() {}, measureText: text => ({ width: String(text).length * 5 }),
    translate(x, y) { state.transform[4] += x; state.transform[5] += y; },
    createLinearGradient: gradients ? gradient : undefined,
    createConicGradient: gradients ? gradient : undefined,
  };
  const ctx = new Proxy({}, {
    get: (_, key) => key in methods ? methods[key] : state[key],
    set: (_, key, value) => { state[key] = value; return true; },
  });
  return { ctx, paints, calls, gradients: gradientRecords, initial, state: snapshot, depth: () => stack.length };
}
const rgba = value => /^rgba\((\d+),(\d+),(\d+),([\d.e+-]+)\)$/.exec(value).slice(1).map(Number);
const serialPaints = rec => rec.paints.map(paint => ({ kind: paint.kind, path: paint.path,
  alpha: paint.state.globalAlpha, style: typeof paint.state.fillStyle === 'string' ? paint.state.fillStyle :
    { args: paint.state.fillStyle.args, stops: paint.state.fillStyle.stops } }));

describe('Launch vapour visibility', () => {
  it('rejects invalid sample fields, stages, scale and local coordinates', () => {
    for (const field of ['mach', 'dynamicPressure', 'density']) for (const bad of [undefined, null, NaN, Infinity, -Infinity, '1', -0.01]) {
      expect(geometry(sample({ [field]: bad }))).toBeNull();
    }
    for (const bad of [null, {}, sample({ mach: 100.1 }), sample({ dynamicPressure: 1e9 + 1 }), sample({ density: 100.1 }),
      ...[0, 4, 1.5, '1', NaN].map(stage => sample({ stage })), ...[undefined, 0, 1, 'true', null].map(lesOn => sample({ lesOn }))]) {
      expect(geometry(bad)).toBeNull();
    }
    const valid = [sample(), 300, 40, 330, 60];
    for (let i = 1; i < valid.length; i++) for (const bad of [undefined, null, NaN, Infinity, -Infinity, '1']) {
      const args = [...valid]; args[i] = bad; expect(P.launchVapourGeometry(...args)).toBeNull();
    }
    for (const [i, values] of [[1, [-1000001, 1000001]], [2, [-1000001, 1000001]],
      [3, [0, 0.999, Number.MIN_VALUE, 16385]], [4, [-5.001, 10000.001]]]) {
      for (const value of values) { const args = [...valid]; args[i] = value; expect(P.launchVapourGeometry(...args)).toBeNull(); }
    }
  });

  it('forms a bounded envelope around transonic flight and is absent outside it', () => {
    for (const mach of [0, 0.5, 0.82, 1.5, 2, 100]) {
      const field = geometry(sample({ mach }));
      expect(field.active).toBe(false); expect(field.machEnvelope).toBe(0); expect(field.strength).toBe(0); expect(field.bands).toEqual([]);
    }
    for (const mach of [1.05, 1.06, 1.08]) expect(geometry(sample({ mach })).machEnvelope).toBe(1);
    for (const mach of [0.85, 0.95, 1.2, 1.4]) {
      const field = geometry(sample({ mach }));
      expect(field.active).toBe(true); expect(field.machEnvelope).toBeGreaterThan(0); expect(field.machEnvelope).toBeLessThan(1);
      expect(field.strength).toBeGreaterThan(0); expect(field.strength).toBeLessThan(1);
    }
  });

  it('joins both Mach boundaries continuously with zero first-order edge slope', () => {
    const step = 0.000001;
    expect(geometry(sample({ mach: 0.82 + step })).machEnvelope).toBeGreaterThan(0);
    expect(geometry(sample({ mach: 0.82 + step })).machEnvelope / step).toBeLessThan(0.0001);
    expect(geometry(sample({ mach: 1.5 - step })).machEnvelope).toBeGreaterThan(0);
    expect(geometry(sample({ mach: 1.5 - step })).machEnvelope / step).toBeLessThan(0.0001);
    expect(geometry(sample({ mach: (0.82 + 1.05) / 2 })).machEnvelope).toBeCloseTo(0.5, 13);
    expect(geometry(sample({ mach: (1.08 + 1.5) / 2 })).machEnvelope).toBeCloseTo(0.5, 13);
  });

  it('requires air and dynamic pressure, including suppression near vacuum', () => {
    for (const row of [sample({ density: 0 }), sample({ dynamicPressure: 0 })]) {
      const field = geometry(row); expect(field.active).toBe(false); expect(field.bands).toEqual([]);
    }
    const thin = geometry(sample({ density: 1e-12, dynamicPressure: 1e9 }));
    expect(thin.strength).toBeLessThan(2e-11);
    thin.bands.forEach(band => expect(band.opacity).toBeLessThan(2e-11));
    const weak = geometry(sample({ density: 100, dynamicPressure: 1e-12 }));
    expect(weak.strength).toBeLessThan(2e-16);
    expect(geometry(sample({ dynamicPressure: 6000, density: 0.08 })).strength).toBeCloseTo(0.25, 14);
    expect(geometry(sample({ dynamicPressure: 1e9, density: 100 })).strength).toBeLessThan(1);
  });

  it('increases smoothly with pressure and density without an arbitrary visibility jump', () => {
    let pressurePrevious = -1, densityPrevious = -1;
    for (const value of [0, 0.001, 0.01, 0.1, 1, 10, 100]) {
      const pressure = geometry(sample({ dynamicPressure: value * 6000 })).strength;
      const density = geometry(sample({ density: value * 0.08 })).strength;
      expect(pressure).toBeGreaterThan(pressurePrevious); expect(density).toBeGreaterThan(densityPrevious);
      pressurePrevious = pressure; densityPrevious = density;
    }
  });

  it('uses the real profile Mach relative to the rotating atmosphere, not inertial speed', () => {
    const flight = P.launchProfile(), pad = flight.samples[0], atmosphere = P.entryAtmosphere(pad.altitude);
    expect(pad.speed).toBeGreaterThan(atmosphere.soundSpeed); expect(pad.mach).toBeCloseTo(0, 14);
    expect(geometry(pad, 300, 40, 330, 0).active).toBe(false);
    const row = flight.samples.find(value => value.mach >= 1.05 && value.mach <= 1.08);
    expect(row).toBeTruthy();
    const airTangent = row.tangentialSpeed - P.launch.rotationSpeed * (1 + row.altitude / P.launch.radius);
    const relativeSpeed = Math.hypot(row.radialSpeed, airTangent), air = P.entryAtmosphere(row.altitude);
    expect(row.airSpeed).toBeCloseTo(relativeSpeed, 10);
    expect(row.mach).toBeCloseTo(relativeSpeed / air.soundSpeed, 12);
    expect(row.dynamicPressure).toBeCloseTo(0.5 * air.density * relativeSpeed ** 2, 7);
    expect(geometry(row, 300, 40, 330, row.time).active).toBe(true);
    const cutoff = flight.events.cutoff;
    expect(geometry(cutoff, 300, 40, 330, cutoff.time).active).toBe(false);
  });

  it('suppresses the countdown without depending on engine state', () => {
    for (const seconds of [-5, -1, -0.000001]) {
      const field = geometry(sample(), 300, 40, 330, seconds);
      expect(field.machEnvelope).toBe(1); expect(field.strength).toBe(0); expect(field.bands).toEqual([]);
    }
    expect(geometry(sample(), 300, 40, 330, 0).active).toBe(true);
    const firing = geometry(sample({ engineOn: true, thrust: 35000000 }));
    const coasting = geometry(sample({ engineOn: false, thrust: 0 }));
    expect(coasting).toEqual(firing);
  });
});

describe('Launch vapour placement and replay', () => {
  it('registers each band with the retained section and the correct shoulder', () => {
    for (const stage of [1, 2, 3]) for (const lesOn of [true, false]) {
      const field = geometry(sample({ stage, lesOn }));
      const rocket = P.saturnV(recorder().ctx, field.cx, field.topY, field.fullHeight, stage, { les: lesOn });
      expect(field.bands.map(band => band.id)).toEqual(stage === 1 ? ['sla', 's1is'] : ['sla']);
      field.bands.forEach(band => {
        const section = rocket.sections.find(part => part.id === band.id);
        expect(band.cx).toBe(field.cx);
        expect(band.width).toBeCloseTo(Math.max(section.w0, section.w1), 12);
        expect(band.y).toBeCloseTo(band.id === 's1is' ? section.y0 : section.y1, 12);
      });
    }
    expect(geometry(sample({ lesOn: false })).bands).toEqual(geometry(sample({ lesOn: true })).bands);
  });

  it('keeps the narrower adapter veil weaker than the lower interstage shroud', () => {
    const field = geometry(), upper = field.bands.find(band => band.id === 'sla'), lower = field.bands.find(band => band.id === 's1is');
    expect(upper.opacity).toBeGreaterThan(0); expect(upper.opacity).toBeLessThan(lower.opacity);
    expect(lower.opacity).toBe(field.strength);
    for (const band of field.bands) {
      expect(band.length).toBeGreaterThan(band.width); expect(band.length).toBeLessThan(band.width * 2);
      expect(band.spread).toBeGreaterThan(band.width); expect(band.spread).toBeLessThan(band.width * 1.31);
    }
  });

  it('scales and translates geometry without changing visibility or ripple', () => {
    const a = geometry(), factor = 2.2, dx = -50, dy = 73;
    const b = geometry(sample(), a.cx * factor + dx, a.topY * factor + dy, a.fullHeight * factor, a.seconds);
    expect(b.strength).toBe(a.strength); expect(b.machEnvelope).toBe(a.machEnvelope);
    a.bands.forEach((band, i) => {
      expect(b.bands[i].cx).toBeCloseTo(band.cx * factor + dx, 11);
      expect(b.bands[i].y).toBeCloseTo(band.y * factor + dy, 10);
      for (const key of ['width', 'length', 'spread']) expect(b.bands[i][key]).toBeCloseTo(band[key] * factor, 10);
      expect(b.bands[i].ripple).toBe(band.ripple); expect(b.bands[i].opacity).toBe(band.opacity);
    });
  });

  it('derives bounded continuous ripple from time and replays a reverse seek exactly', () => {
    const original = geometry(sample(), 300, 40, 330, 60);
    for (const time of [1, 5, 80, 10000, 0, 30]) {
      const field = geometry(sample(), 300, 40, 330, time);
      field.bands.forEach(band => expect(Math.abs(band.ripple)).toBeLessThanOrEqual(0.040000000001));
    }
    expect(geometry(sample(), 300, 40, 330, 60)).toEqual(original);
    const nearby = geometry(sample(), 300, 40, 330, 60.00001);
    original.bands.forEach((band, i) => expect(Math.abs(nearby.bands[i].ripple - band.ripple)).toBeLessThan(0.0000032));
    expect(geometry(sample(), 300, 40, 330, 61).bands.map(band => band.ripple)).not.toEqual(original.bands.map(band => band.ripple));
  });

  it('copies only relevant sample scalars and leaves frozen input data unchanged', () => {
    const row = freeze(sample({ engineOn: true, nested: { note: 'caller data' } })), before = JSON.stringify(row);
    const field = geometry(row);
    expect(field.sample).not.toBe(row); expect(field.sample).toEqual(sample());
    field.sample.mach = 8;
    expect(row.mach).toBe(1.06); expect(JSON.stringify(row)).toBe(before);
    for (const height of [1, 16384]) for (const center of [-1000000, 1000000]) finite(geometry(sample(), center, -1000000, height, 10000));
  });
});

describe('Launch vapour Canvas layers', () => {
  it('paints the far outline and seven front ribbons per band with smooth axial fades', () => {
    const field = geometry();
    for (const layer of ['back', 'front']) {
      const rec = recorder(); expect(P.drawLaunchVapour(rec.ctx, field, layer)).toEqual(field);
      expect(rec.paints).toHaveLength(field.bands.length * (layer === 'back' ? 1 : 7));
      expect(rec.gradients).toHaveLength(rec.paints.length);
      for (const paint of rec.paints) {
        expect(paint.kind).toBe('fill');
        expect(paint.path.some(command => command[0] === 'bezier')).toBe(true);
        expect(paint.path.some(command => command[0] === 'quadratic')).toBe(true);
        expect(paint.path.at(-1)).toEqual(['close']); finite(paint.path);
        const stops = paint.state.fillStyle.stops;
        expect(stops).toHaveLength(6); expect(stops[0].offset).toBe(0); expect(stops.at(-1).offset).toBe(1);
        expect(rgba(stops[0].color)[3]).toBe(0); expect(rgba(stops.at(-1).color)[3]).toBe(0);
        expect(Math.max(...stops.map(stop => rgba(stop.color)[3]))).toBeGreaterThan(0);
        stops.slice(1).forEach((stop, i) => expect(stop.offset).toBeGreaterThan(stops[i].offset));
      }
    }
  });

  it('preserves inherited alpha, clip, transform, composition and paint state', () => {
    for (const layer of ['front', 'back']) {
      const rec = recorder(), initial = rec.initial;
      P.drawLaunchVapour(rec.ctx, geometry(), layer, P.launchSunlight(0.5));
      expect(rec.calls).toEqual(['save', 'restore']); expect(rec.depth()).toBe(0);
      expect(rec.state()).toEqual(initial);
      rec.paints.forEach(paint => {
        expect(paint.state.globalAlpha).toBe(0.37); expect(paint.state.clips).toEqual(initial.clips);
        expect(paint.state.transform).toEqual(initial.transform); expect(paint.state.globalCompositeOperation).toBe('source-over');
      });
    }
  });

  it('ignores forged bands and rebuilds immutable scalar geometry before painting', () => {
    const field = freeze(geometry()), tampered = copy(field);
    tampered.active = false; tampered.strength = Infinity; tampered.bands = [{ cx: Infinity, y: NaN, opacity: 1e99 }];
    const original = recorder(), edited = recorder();
    P.drawLaunchVapour(original.ctx, field, 'front');
    expect(P.drawLaunchVapour(edited.ctx, tampered, 'front')).toEqual(field);
    expect(serialPaints(edited)).toEqual(serialPaints(original));
  });

  it('rejects invalid fields or layers and skips painting inactive or transparent frames', () => {
    const field = geometry(), rec = recorder();
    for (const bad of [null, {}, { ...field, fullHeight: 0 }, { ...field, sample: { ...field.sample, stage: 4 } }]) {
      expect(P.drawLaunchVapour(rec.ctx, bad, 'back')).toBeNull();
    }
    for (const layer of [undefined, null, '', 'middle', 'FRONT']) expect(P.drawLaunchVapour(rec.ctx, field, layer)).toBeNull();
    expect(P.drawLaunchVapour(null, field, 'back')).toBeNull();
    const inactive = geometry(sample({ mach: 0 })); expect(P.drawLaunchVapour(rec.ctx, inactive, 'front')).toEqual(inactive);
    expect(rec.calls).toEqual([]); expect(rec.paints).toEqual([]);
    const hidden = recorder(0); expect(P.drawLaunchVapour(hidden.ctx, field, 'front')).toEqual(field);
    expect(hidden.calls).toEqual([]); expect(hidden.paints).toEqual([]);
  });

  it('moves the brighter limb with the Sun without moving the cloud', () => {
    const field = geometry(), right = recorder(), left = recorder();
    P.drawLaunchVapour(right.ctx, field, 'front', { x: 1, y: 0, fraction: 1 });
    P.drawLaunchVapour(left.ctx, field, 'front', { x: -1, y: 0, fraction: 1 });
    expect(right.paints.map(paint => paint.path)).toEqual(left.paints.map(paint => paint.path));
    const peak = paint => Math.max(...paint.state.fillStyle.stops.map(stop => rgba(stop.color)[3]));
    for (let band = 0; band < field.bands.length; band++) {
      const start = band * 7;
      expect(peak(right.paints[start + 4])).toBeGreaterThan(peak(right.paints[start + 1]));
      expect(peak(left.paints[start + 1])).toBeGreaterThan(peak(left.paints[start + 4]));
      expect(peak(right.paints[start + 1])).toBeCloseTo(peak(left.paints[start + 4]), 14);
      expect(peak(right.paints[start])).toBe(peak(left.paints[start]));
    }
  });

  it('uses bounded fallback opacity when gradients or valid sunlight are unavailable', () => {
    const field = geometry(), noGradient = recorder(0.37, false);
    P.drawLaunchVapour(noGradient.ctx, field, 'front');
    expect(noGradient.paints).toHaveLength(field.bands.length * 7);
    for (const paint of noGradient.paints) {
      const components = rgba(paint.state.fillStyle);
      expect(components[3]).toBeGreaterThan(0); expect(components[3]).toBeLessThan(1);
    }
    const neutral = recorder(); P.drawLaunchVapour(neutral.ctx, field, 'front');
    for (const light of [{ x: NaN, y: 1, fraction: 1 }, { x: 0, y: 0, fraction: 1 }, { x: Number.MAX_VALUE, y: Number.MAX_VALUE, fraction: 1 }]) {
      const invalid = recorder(); P.drawLaunchVapour(invalid.ctx, field, 'front', light);
      expect(serialPaints(invalid)).toEqual(serialPaints(neutral));
    }
  });
});
