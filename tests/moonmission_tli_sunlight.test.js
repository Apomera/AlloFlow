/** TLI illumination follows one world Sun through both departure cameras. */
import { beforeAll, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const EARTH = 6371000;
const SUN = Math.asin(695700000 / 149597870700);
let P;
beforeAll(() => {
  resetStemLab();
  loadTool(process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js', 'moonMission');
  P = window.MoonMissionPure;
});

function recordingCtx() {
  const commands = [], gradients = [], properties = { globalAlpha: 1 };
  const ctx = new Proxy(properties, {
    get(target, key) {
      if (/^create(?:Linear|Radial|Conic)Gradient$/.test(String(key))) return (...coords) => {
        const id = gradients.length;
        const gradient = {
          id, kind: key, coords, stops: [],
          addColorStop(offset, color) {
            this.stops.push([offset, color]);
            commands.push(['stop', id, offset, color]);
          },
        };
        gradients.push(gradient);
        commands.push(['gradient', key, id, ...coords]);
        return gradient;
      };
      if (key === 'measureText') return text => ({ width: String(text).length * 6 });
      return key in target ? target[key] : (...args) => commands.push(['call', key, ...args]);
    },
    set(target, key, value) {
      target[key] = value;
      commands.push(['set', key, value && typeof value === 'object' && 'id' in value ? { gradient: value.id } : value]);
      return true;
    },
  });
  return { ctx, commands, gradients };
}
function canonical(world, orbitTime) {
  const angle = P.orbitSnapshot(orbitTime).orbAng, c = Math.cos(angle), s = Math.sin(angle);
  return Object.freeze({ x: world.x * c + world.y * s, y: -world.x * s + world.y * c });
}
function observer(earthAngle, separation) {
  const radius = EARTH / Math.sin(earthAngle);
  return Object.freeze({ x: -radius * Math.cos(separation), y: radius * Math.sin(separation) });
}
// Midpoint strip integration is independent of the analytic circular-lens area.
function stripFraction(earthAngle, separation) {
  const count = 20000, width = 2 * SUN / count;
  let obscured = 0;
  for (let i = 0; i < count; i++) {
    const x = -SUN + (i + 0.5) * width;
    const solarHeight = Math.sqrt(Math.max(0, SUN * SUN - x * x));
    const earthHeight = Math.sqrt(Math.max(0, earthAngle * earthAngle - (x - separation) ** 2));
    obscured += 2 * Math.min(solarHeight, earthHeight) * width;
  }
  return Math.max(0, Math.min(1, 1 - obscured / (Math.PI * SUN * SUN)));
}
function stack(sunlight, thrust = P.tliPhysics.thrust, heading = 0.71) {
  const record = recordingCtx();
  record.geometry = P.drawTliStack(record.ctx, 143, 97, heading, 78, thrust, { sunlight });
  return record;
}
const pathCommands = record => record.commands.filter(row => row[0] === 'call');
function plumeCommands(record) {
  const first = record.gradients.find(g => g.stops.some(([, color]) => color === 'rgba(224,242,254,0.82)'));
  if (!first) return [];
  const start = record.commands.findIndex(row => row[0] === 'gradient' && row[2] === first.id);
  return record.commands.slice(start).map(row => {
    if (row[0] === 'gradient') return [row[0], row[1], row[2] - first.id, ...row.slice(3)];
    if (row[0] === 'stop') return [row[0], row[1] - first.id, ...row.slice(2)];
    if (row[0] === 'set' && row[2] && typeof row[2] === 'object' && 'gradient' in row[2]) {
      return [row[0], row[1], { gradient: row[2].gradient - first.id }];
    }
    return row;
  });
}
function withoutSun(geometry) { const { sunlight, ...other } = geometry; return other; }
// One assertion per scene: an expect() per number made a 54-scene test exceed 5 s.
function finiteCalls(commands) {
  const bad = commands.filter(row => row.some(value => typeof value === 'number' && !Number.isFinite(value)));
  expect(bad, 'Canvas calls with non-finite numbers').toEqual([]);
}

// Recaptured after pass76 added Saturn hull detail and curved engine bells; the
// returned stack geometry is unchanged from the pass76 baseline (before/after compared).
const legacyCases = [
  ['burning', 0.71, 78, 1, '23ab28faefdb8b308f70500c197a9a35a1cdc15a22a0b44900f756844f03f3e2'],
  ['coasting', -1.4, 54, 0, 'f771db92b6d9f59b95ec361111d956832c54159f0a1ffa6926d44063e845b06f'],
  ['quarter thrust', Math.PI / 2, 64, 0.25, '2f4a12ca6912755aa6991e54e6cf34a645f2ea3ac89fd703d79e4ddcb358ee68'],
];
// Replay save/restore and count opaque hull material (a gradient fill) painted while
// globalAlpha is below 1. The faint detail strokes may fade; the hull may not.
function hullFillsUnderPartialAlpha(record) {
  let state = { alpha: 1, fill: null }; const stack = []; let count = 0;
  for (const [kind, key, value] of record.commands) {
    if (kind === 'set' && key === 'globalAlpha') state.alpha = value;
    if (kind === 'set' && key === 'fillStyle') state.fill = value;
    if (kind === 'call' && key === 'save') stack.push({ ...state });
    if (kind === 'call' && key === 'restore') state = stack.pop() || { alpha: 1, fill: null };
    if (kind === 'call' && (key === 'fill' || key === 'fillRect') && state.alpha < 1 && state.fill && typeof state.fill === 'object') count++;
  }
  return count;
}
const opacityWrites = record => record.commands.filter(row => row[0] === 'set' && ['globalAlpha', 'globalCompositeOperation'].includes(row[1]));

describe('TLI world illumination', () => {
  it('uses the fixed +X Sun at every saved parking-orbit orientation without mutating samples', () => {
    for (const orbitTime of [0, 1835, 9245.011304324662, 15000]) {
      for (const [world, phase, fraction] of [
        [{ x: EARTH * 2, y: 0 }, 'sunlit', 1],
        [{ x: -EARTH * 2, y: 0 }, 'total', 0],
        [{ x: 0, y: EARTH * 2 }, 'sunlit', 1],
        [{ x: 0, y: -EARTH * 2 }, 'sunlit', 1],
      ]) {
        const sample = canonical(world, orbitTime), before = JSON.stringify(sample);
        const actual = P.tliSunlight(sample, orbitTime);
        expect(actual.phase).toBe(phase); expect(actual.fraction).toBe(fraction);
        expect(actual.directionX).toBe(1); expect(actual.directionY).toBe(0);
        expect(actual.sunAngularRadius).toBeCloseTo(SUN, 14);
        expect(actual.earthAngularRadius).toBeCloseTo(Math.PI / 6, 13);
        expect(actual.partialMargin).toBeCloseTo(actual.separation - Math.PI / 6 - SUN, 13);
        expect(actual.totalMargin).toBeCloseTo(actual.separation - Math.PI / 6 + SUN, 13);
        expect(P.tliSunlight(sample, orbitTime)).toEqual(actual);
        expect(JSON.stringify(sample)).toBe(before);
      }
    }
  });

  it('matches independent angular-disc integration through penumbra and distant annular eclipses', () => {
    for (const orbitTime of [0, 9245.011304324662]) for (const earthAngle of [0.8, 0.05, SUN * 2, SUN * 0.4]) {
      for (const offset of [-0.8, -0.35, 0, 0.35, 0.8]) {
        const separation = Math.max(0, earthAngle + SUN * offset);
        const actual = P.tliSunlight(canonical(observer(earthAngle, separation), orbitTime), orbitTime);
        expect(actual.earthAngularRadius).toBeCloseTo(earthAngle, 12);
        expect(actual.separation).toBeCloseTo(separation, 12);
        expect(Math.abs(actual.fraction - stripFraction(earthAngle, separation))).toBeLessThan(0.00003);
        expect(actual.fraction).toBeGreaterThanOrEqual(0); expect(actual.fraction).toBeLessThanOrEqual(1);
      }
    }
  });

  it('crosses both eclipse contacts continuously and reveals the Sun monotonically', () => {
    const earthAngle = 0.02, time = 9245.011304324662, epsilon = 1e-7;
    const light = separation => P.tliSunlight(canonical(observer(earthAngle, separation), time), time);
    const outerIn = light(earthAngle + SUN - epsilon), outerOut = light(earthAngle + SUN + epsilon);
    expect(outerIn.phase).toBe('partial'); expect(outerOut.phase).toBe('sunlit');
    expect(outerIn.partialMargin).toBeLessThan(0); expect(outerOut.partialMargin).toBeGreaterThan(0);
    expect(Math.abs(outerOut.fraction - outerIn.fraction)).toBeLessThan(0.00001);
    const innerIn = light(earthAngle - SUN - epsilon), innerOut = light(earthAngle - SUN + epsilon);
    expect(innerIn.phase).toBe('total'); expect(innerOut.phase).toBe('partial');
    expect(innerIn.totalMargin).toBeLessThan(0); expect(innerOut.totalMargin).toBeGreaterThan(0);
    expect(Math.abs(innerOut.fraction - innerIn.fraction)).toBeLessThan(0.00001);
    let previous = -1;
    for (let i = 0; i <= 40; i++) {
      const world = observer(earthAngle, earthAngle - SUN * 1.1 + SUN * 2.2 * i / 40);
      const actual = P.tliSunlight(canonical(world, time), time);
      const reflected = P.tliSunlight(canonical({ x: world.x, y: -world.y }, time), time);
      expect(actual.fraction).toBeGreaterThanOrEqual(previous - 1e-12); previous = actual.fraction;
      expect(reflected.fraction).toBeCloseTo(actual.fraction, 9);
    }
  });

  it('rejects invalid craft positions and uses the established orbit-time normalization', () => {
    const invalid = [undefined, null, false, true, '', '1', {}, [], NaN, Infinity, -Infinity];
    for (const value of invalid) {
      expect(P.tliSunlight({ x: value, y: EARTH * 2 }, 0)).toBeNull();
      expect(P.tliSunlight({ x: EARTH * 2, y: value }, 0)).toBeNull();
    }
    for (const sample of [undefined, null, {}, [], { x: 0, y: 0 }, { x: EARTH, y: 0 },
      { x: EARTH * 0.4, y: EARTH * 0.4 }, { x: Number.MAX_VALUE, y: Number.MAX_VALUE }]) {
      expect(P.tliSunlight(sample, 0)).toBeNull();
    }
    const sample = Object.freeze({ x: EARTH * 2, y: EARTH });
    for (const orbitTime of [undefined, null, NaN, Infinity, -Infinity, -1, '100']) {
      const normalized = P.orbitSnapshot(orbitTime).time;
      expect(P.tliSunlight(sample, orbitTime)).toEqual(P.tliSunlight(sample, normalized));
    }
  });
});

describe('TLI opaque stack lighting', () => {
  it.each(legacyCases)('preserves all default %s drawing commands and returned geometry', (_name, heading, length, fraction, expected) => {
    const record = recordingCtx();
    const geometry = P.drawTliStack(record.ctx, 143, 97, heading, length, P.tliPhysics.thrust * fraction);
    const hash = createHash('sha256').update(JSON.stringify({ commands: record.commands, geometry })).digest('hex');
    expect(hash).toBe(expected);
  });

  it('falls back to the exact default drawing for absent or invalid optional Sun data', () => {
    const baseline = recordingCtx(), expected = P.drawTliStack(baseline.ctx, 143, 97, 0.71, 78, P.tliPhysics.thrust);
    for (const sunlight of [undefined, null, {}, { directionX: 0, directionY: 0, fraction: 1 },
      { directionX: NaN, directionY: 0, fraction: 1 }, { directionX: 1, directionY: Infinity, fraction: 1 },
      { directionX: 1, directionY: 0, fraction: NaN }]) {
      const actual = stack(sunlight);
      expect(actual.geometry).toEqual(expected); expect(actual.commands).toEqual(baseline.commands);
    }
  });

  it('reprojects the local hull light to the camera Sun for every velocity heading', () => {
    for (const heading of [-2.4, -0.3, 0, 0.71, Math.PI]) for (const [directionX, directionY] of [[1, 0], [0, 1], [-0.6, 0.8]]) {
      const sunlight = Object.freeze({ directionX, directionY, fraction: 0.37 });
      const record = stack(sunlight, P.tliPhysics.thrust, heading), local = record.geometry.sunlight;
      const angle = heading + Math.PI / 2;
      expect(local.x * Math.cos(angle) - local.y * Math.sin(angle)).toBeCloseTo(directionX, 12);
      expect(local.x * Math.sin(angle) + local.y * Math.cos(angle)).toBeCloseTo(-directionY, 12);
      expect(local.fraction).toBe(0.37);
      expect(record.commands).toContainEqual(['call', 'rotate', angle]);
      finiteCalls(record.commands);
    }
  });

  it('changes only opaque hull colors while preserving every path, plume command and physical endpoint', () => {
    for (const thrust of [0, P.tliPhysics.thrust / 4, P.tliPhysics.thrust]) {
      const sun = { directionX: 0.8, directionY: 0.6 };
      const baseline = stack(undefined, thrust);
      const full = stack({ ...sun, fraction: 1 }, thrust);
      expect(withoutSun(full.geometry)).toEqual(baseline.geometry);
      expect(pathCommands(full)).toEqual(pathCommands(baseline));
      expect(plumeCommands(full)).toEqual(plumeCommands(baseline));
      const dark = stack({ ...sun, fraction: 0 }, thrust);
      const partial = stack({ ...sun, fraction: 0.4 }, thrust);
      const hull = rec => rec.gradients.filter(g => g.stops.every(([, color]) => !color.startsWith('rgba')));
      for (const rec of [dark, partial]) {
        expect(withoutSun(rec.geometry)).toEqual(withoutSun(full.geometry));
        expect(pathCommands(rec)).toEqual(pathCommands(full));
        expect(plumeCommands(rec)).toEqual(plumeCommands(full));
      }
      const materialColors = [full, dark, partial].map(rec => hull(rec).flatMap(g => g.stops.map(([, color]) => color)));
      expect(materialColors[0]).not.toEqual(materialColors[1]);
      expect(materialColors[0].length).toBeGreaterThan(40);
      expect(materialColors[1]).toHaveLength(materialColors[0].length);
      for (const rec of [full, dark, partial]) {
        // Sunlight never changes opacity: every alpha the detail layer sets is the unlit one.
        expect(opacityWrites(rec)).toEqual(opacityWrites(baseline));
        expect(hullFillsUnderPartialAlpha(rec), 'opaque hull under partial alpha').toBe(0);
        for (const gradient of hull(rec)) for (const [, color] of gradient.stops) expect(color).toMatch(/^rgb\(\d+,\d+,\d+\)$/);
      }
      for (let i = 0; i < materialColors[0].length; i++) {
        const channels = materialColors.map(colors => colors[i].slice(4, -1).split(',').map(Number));
        for (let channel = 0; channel < 3; channel++) {
          expect(channels[2][channel]).toBeGreaterThanOrEqual(channels[1][channel]);
          expect(channels[2][channel]).toBeLessThanOrEqual(channels[0][channel]);
        }
      }
      expect(full.geometry.plume).toBe(thrust > 0);
    }
  });
});

describe('TLI camera illumination agreement', () => {
  it('projects the same world globe and landmarks through the reflected close-camera axes', () => {
    for (const duration of [300, 342, 350]) {
      const profile = P.tliProfile({ duration }), last = profile.samples.at(-1);
      const anchor = Math.atan2(last.y, last.x) / 2, ca = Math.cos(anchor), sa = Math.sin(anchor);
      const sample = Object.freeze(P.tliSample(profile, duration / 2));
      for (const orbitTime of [0, 1835, 9245.011304324662]) for (const width of [288, 984]) {
        const record = recordingCtx();
        const g = P.drawTliScene(record.ctx, width, 360, sample, profile, { view: 'burn', orbitTime });
        const index = record.commands.findIndex(row => row[0] === 'call' && row[1] === 'transform');
        expect(index).toBeGreaterThan(0);
        const [a, b, c, d, e, f] = record.commands[index].slice(2);
        expect([e, f]).toEqual([0, 0]);
        const translation = record.commands[index - 1];
        expect(translation.slice(0, 2)).toEqual(['call', 'translate']);
        // Recover the Earth center from the independently projected craft point.
        const earthX = g.craftX - (sample.y * ca - sample.x * sa) * g.scaleX;
        const earthY = g.craftY + (sample.x * ca + sample.y * sa) * g.scaleY;
        expect(translation[2]).toBeCloseTo(earthX, 9);
        expect(translation[3]).toBeCloseTo(earthY, 9);
        const globeClip = record.commands.slice(0, index).find(row => row[0] === 'call' && row[1] === 'arc');
        expect(globeClip).toBeDefined();
        expect(globeClip[2]).toBeCloseTo(earthX, 9); expect(globeClip[3]).toBeCloseTo(earthY, 9);
        expect(globeClip[4]).toBeCloseTo(EARTH * g.scaleX, 9);
        // Orthogonal reflection preserves the spherical limb and all distances.
        expect(a * a + b * b).toBeCloseTo(1, 12);
        expect(c * c + d * d).toBeCloseTo(1, 12);
        expect(a * c + b * d).toBeCloseTo(0, 12);
        expect(a * d - b * c).toBeCloseTo(-1, 12);
        const orbitAngle = P.orbitSnapshot(orbitTime).orbAng, co = Math.cos(orbitAngle), si = Math.sin(orbitAngle);
        const directions = [[1, 0], [0, 1], [0.6, 0.8], [-0.91, 0.27], [-0.34, -0.73]];
        for (let i = 0; i < 16; i++) directions.push([Math.cos(i * Math.PI / 8), Math.sin(i * Math.PI / 8)]);
        for (const [worldX, worldY] of directions) {
          // First undo the saved orbit rotation, then use the trajectory camera
          // basis. This oracle does not use the renderer's combined-angle matrix.
          const canonicalX = worldX * co + worldY * si;
          const canonicalY = -worldX * si + worldY * co;
          const expectedX = canonicalY * ca - canonicalX * sa;
          const expectedY = -canonicalX * ca - canonicalY * sa;
          // Globe artwork uses Canvas +Y down, while world landmarks use +Y up.
          const actualX = a * worldX - c * worldY, actualY = b * worldX - d * worldY;
          expect(actualX).toBeCloseTo(expectedX, 12);
          expect(actualY).toBeCloseTo(expectedY, 12);
          expect(Math.hypot(actualX, actualY)).toBeCloseTo(Math.hypot(worldX, worldY), 12);
        }
        // The globe's world +X sunlight becomes the same screen vector as the hull.
        expect(a).toBeCloseTo(g.viewSunlight.directionX, 12);
        expect(b).toBeCloseTo(-g.viewSunlight.directionY, 12);
      }
    }
  });

  it('shares world eclipse fraction and correctly transforms the Sun in both equal-scale cameras', () => {
    for (const duration of [300, 342, 350]) {
      const profile = P.tliProfile({ duration }), profileBefore = JSON.stringify(profile);
      const last = profile.samples.at(-1), anchor = Math.atan2(last.y, last.x) / 2;
      for (const orbitTime of [0, 2641.4318012356175, 9245.011304324662]) {
        const angle = P.orbitSnapshot(orbitTime).orbAng;
        for (const time of [0, duration / 2, duration]) {
          const sample = Object.freeze(P.tliSample(profile, time)), before = JSON.stringify(sample);
          let reference;
          for (const view of ['burn', 'orbit']) {
            const rec = recordingCtx();
            const g = P.drawTliScene(rec.ctx, 390, 360, sample, profile, { view, orbitTime });
            expect(g.sunlight).toEqual(P.tliSunlight(sample, orbitTime));
            if (reference) expect(g.sunlight).toEqual(reference); reference = g.sunlight;
            expect(g.viewSunlight.fraction).toBe(g.sunlight.fraction);
            const expectedX = view === 'orbit' ? 1 : -Math.sin(anchor + angle);
            const expectedY = view === 'orbit' ? 0 : Math.cos(anchor + angle);
            expect(g.viewSunlight.directionX).toBeCloseTo(expectedX, 12);
            expect(g.viewSunlight.directionY).toBeCloseTo(expectedY, 12);
            expect(Math.cos(g.earthSunAngle)).toBeCloseTo(expectedX, 12);
            expect(Math.sin(g.earthSunAngle)).toBeCloseTo(-expectedY, 12);
            const local = g.stack.sunlight, bodyAngle = g.heading + Math.PI / 2;
            expect(local.fraction).toBe(g.sunlight.fraction);
            expect(local.x * Math.cos(bodyAngle) - local.y * Math.sin(bodyAngle)).toBeCloseTo(expectedX, 12);
            expect(local.x * Math.sin(bodyAngle) + local.y * Math.cos(bodyAngle)).toBeCloseTo(-expectedY, 12);
            expect(g.scaleX).toBe(g.scaleY);
            expect(g.plume).toBe(time < duration); expect(g.stack.plume).toBe(g.plume);
            expect((g.stack.nose.x + g.stack.nozzle.x) / 2).toBeCloseTo(g.craftX, 10);
            expect((g.stack.nose.y + g.stack.nozzle.y) / 2).toBeCloseTo(g.craftY, 10);
            finiteCalls(rec.commands);
          }
          expect(JSON.stringify(sample)).toBe(before);
        }
      }
      expect(JSON.stringify(profile)).toBe(profileBefore);
    }
  });
});
