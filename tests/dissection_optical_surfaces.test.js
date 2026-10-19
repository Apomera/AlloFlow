import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_dissection.js', 'utf8');
function productionFinish(bindings) {
  const matches = [...source.matchAll(/^([ \t]*)function finishCurrentOpticalSurface\(/gm)];
  if (matches.length !== 1) throw new Error('Expected one production optical finish');
  const match = matches[0], start = match.index + match[1].length, ending = '\n' + match[1] + '}';
  const end = source.indexOf(ending, start);
  if (end < start) throw new Error('Missing production optical finish ending');
  return new Function(...Object.keys(bindings), 'return (' + source.slice(start, end + ending.length) + ');')(...Object.values(bindings));
}
const stateKeys = ['globalAlpha', 'globalCompositeOperation', 'lineWidth', 'lineCap', 'lineJoin',
  'fillStyle', 'strokeStyle', 'shadowBlur', 'shadowOffsetX', 'shadowOffsetY', 'shadowColor'];
function styleRecord(value) {
  return value && typeof value === 'object'
    ? { kind: value.kind, args: value.args.slice(), stops: value.stops.map(stop => stop.slice()) } : value;
}
class OpticalContext {
  constructor(matrix = [1, 0, 0, 1, 0, 0]) {
    this.matrix = matrix.slice(); this.path = []; this.events = []; this.stack = []; this.clipped = false;
    Object.assign(this, { globalAlpha: 0.74, globalCompositeOperation: 'source-over', lineWidth: 3,
      fillStyle: '#123456', strokeStyle: '#654321', shadowBlur: 8,
      shadowOffsetX: 2, shadowOffsetY: -1, shadowColor: '#789abc' });
  }
  state() { return { matrix: this.matrix.slice(), clipped: this.clipped, ...Object.fromEntries(stateKeys.map(key => [key, this[key]])) }; }
  save() { this.stack.push(this.state()); }
  restore() { Object.assign(this, this.stack.pop()); }
  translate(x, y) { const m = this.matrix; m[4] += m[0] * x + m[2] * y; m[5] += m[1] * x + m[3] * y; }
  scale(x, y) { const m = this.matrix; this.matrix = [m[0] * x, m[1] * x, m[2] * y, m[3] * y, m[4], m[5]]; }
  beginPath() { this.path = []; }
  trace(operation, args) { this.path.push({ operation, args, matrix: this.matrix.slice() }); }
  moveTo(...args) { this.trace('moveTo', args); }
  lineTo(...args) { this.trace('lineTo', args); }
  bezierCurveTo(...args) { this.trace('bezierCurveTo', args); }
  ellipse(...args) { this.trace('ellipse', args); }
  closePath() { this.trace('closePath', []); }
  clip() { this.events.push({ operation: 'clip', path: this.path.slice() }); this.clipped = true; }
  paint(operation, args = []) {
    this.events.push({ operation, args, path: this.path.slice(), matrix: this.matrix.slice(), clipped: this.clipped,
      alpha: this.globalAlpha, composite: this.globalCompositeOperation, width: this.lineWidth,
      fill: styleRecord(this.fillStyle), stroke: styleRecord(this.strokeStyle) });
  }
  fillRect(...args) { this.paint('fillRect', args); }
  stroke() { this.paint('stroke'); }
  gradient(kind, args) { return { kind, args, stops: [], addColorStop(position, color) { this.stops.push([position, color]); } }; }
  createLinearGradient(...args) { return this.gradient('linearGradient', args); }
  createRadialGradient(...args) { return this.gradient('radialGradient', args); }
}
function authoredPath(ctx, kind) {
  ctx.beginPath();
  if (kind === 'cornea') {
    ctx.moveTo(217, 216); ctx.bezierCurveTo(179, 220, 163, 241, 163, 260);
    ctx.bezierCurveTo(163, 279, 179, 300, 217, 304);
    ctx.bezierCurveTo(207, 282, 207, 238, 217, 216); ctx.closePath();
  } else ctx.ellipse(190, 260, 27, 44, kind === 'ciliary' ? -0.28 : 0, 0, Math.PI * 2);
  return ctx.path.slice();
}
function fixture(kind = 'lens', overrides = {}, matrix) {
  const ctx = new OpticalContext(matrix), footprint = authoredPath(ctx, kind);
  const bindings = { ctx, sceneDetail: true, eyeAccessible: false, highContrastEnabled: false,
    eyeRealistic: true, eyeCloudy: false, lightDirection: 'left',
    d: { lightIntensity: 68 }, liveTissueState: { moisture: 82 }, ...overrides };
  return { ctx, footprint, finish: productionFinish(bindings) };
}
function paints(fixture) { return fixture.ctx.events.filter(event => ['fillRect', 'stroke'].includes(event.operation)); }
function sheen(fixture) {
  return paints(fixture).filter(event => event.composite === 'screen')
    .flatMap(event => [event.fill, event.stroke].filter(value => value && typeof value === 'object').flatMap(value => value.stops))
    .reduce((sum, [, color]) => sum + Number(color.slice(color.lastIndexOf(',') + 1, -1)), 0);
}

describe('dissection optical surface materials', () => {
  it.each(['cornea', 'lens', 'ciliary'])('clips %s material to its existing path with bounded deterministic work and full context restoration', kind => {
    for (const matrix of [[1, 0, 0, 1, 0, 0], [-2, 0.1, 0.2, 2, 720, -130]]) {
      const first = fixture(kind, {}, matrix), same = fixture(kind, {}, matrix), before = first.ctx.state();
      first.finish(190, 260, 27, 44, kind, -1); same.finish(190, 260, 27, 44, kind, -1);
      const clips = first.ctx.events.filter(event => event.operation === 'clip');
      expect(clips).toHaveLength(1); expect(clips[0].path).toEqual(first.footprint);
      expect(paints(first)).toHaveLength(kind === 'ciliary' ? 5 : 4);
      expect(paints(first).every(event => event.clipped)).toBe(true);
      if (kind !== 'ciliary') {
        expect(first.ctx.path).toEqual(first.footprint);
        expect(paints(first).at(-1).operation).toBe('stroke');
        expect(paints(first).at(-1).path).toEqual(first.footprint);
        expect(paints(first).at(-1).matrix).toEqual(matrix);
      }
      expect(first.ctx.events).toEqual(same.ctx.events);
      expect(first.ctx.state()).toEqual(before); expect(first.ctx.stack).toEqual([]);
    }
  });

  it.each([
    ['Accessible', { eyeAccessible: true }], ['high contrast', { highContrastEnabled: true }],
    ['detail disabled', { sceneDetail: false }],
  ])('does no path or context work for %s rendering', (_name, overrides) => {
    for (const kind of ['cornea', 'lens', 'ciliary']) {
      const f = fixture(kind, overrides), before = f.ctx.state();
      f.finish(190, 260, 27, 44, kind, -1);
      expect(f.ctx.events).toEqual([]); expect(f.ctx.path).toEqual(f.footprint);
      expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
    }
  });

  it.each([
    [NaN, 260, 27, 44, 'lens'], [190, Infinity, 27, 44, 'lens'],
    [190, 260, NaN, 44, 'lens'], [190, 260, 27, Infinity, 'lens'],
    [190, 260, 0, 44, 'lens'], [190, 260, 27, -1, 'lens'],
    [190, 260, 27, 44, 'unsupported'],
  ])('leaves the authored path intact for invalid optical input (%s, %s, %s, %s, %s)', (x, y, rx, ry, kind) => {
    const f = fixture(), before = f.ctx.state();
    f.finish(x, y, rx, ry, kind);
    expect(f.ctx.events).toEqual([]); expect(f.ctx.path).toEqual(f.footprint);
    expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
  });

  it.each(['fillRect', 'stroke'])('restores transform, clip and caller styles after a %s failure', operation => {
    for (const kind of ['cornea', 'lens', 'ciliary']) {
      const f = fixture(kind, {}, [-2, 0.1, 0.2, 2, 720, -130]), before = f.ctx.state();
      f.ctx[operation] = vi.fn(() => { throw new Error('Injected optical paint failure'); });
      expect(() => f.finish(190, 260, 27, 44, kind, 1)).toThrow('Injected optical paint failure');
      expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
      if (kind !== 'ciliary') expect(f.ctx.path).toEqual(f.footprint);
    }
  });

  it('responds to live moisture, dehydration, cloudiness and lamp strength without moving the glass path', () => {
    for (const kind of ['cornea', 'lens']) {
      const wet = fixture(kind, { d: { lightIntensity: 100 }, liveTissueState: { moisture: 100 } });
      const dry = fixture(kind, { d: { lightIntensity: 100, specimenCondition: 'dehydrated' }, liveTissueState: { moisture: 0 } });
      const dim = fixture(kind, { d: { lightIntensity: 20 }, liveTissueState: { moisture: 100 } });
      const cloudy = fixture(kind, { d: { lightIntensity: 100 }, liveTissueState: { moisture: 100 }, eyeCloudy: true });
      for (const f of [wet, dry, dim, cloudy]) f.finish(190, 260, 27, 44, kind);
      expect(sheen(wet)).toBeGreaterThan(sheen(dry)); expect(sheen(wet)).toBeGreaterThan(sheen(dim));
      expect(sheen(wet)).toBeGreaterThan(sheen(cloudy));
      expect(dry.ctx.path).toEqual(wet.ctx.path); expect(dim.ctx.path).toEqual(wet.ctx.path);
      expect(cloudy.ctx.path).toEqual(wet.ctx.path);
    }
  });

  it('moves the light-facing rim with the lamp while retaining the exact authored contour', () => {
    const left = fixture('lens', { lightDirection: 'left' }), right = fixture('lens', { lightDirection: 'right' });
    for (const f of [left, right]) f.finish(190, 260, 27, 44, 'lens');
    const leftRim = paints(left).at(-1), rightRim = paints(right).at(-1);
    expect(leftRim.path).toEqual(rightRim.path);
    expect(leftRim.stroke.args[0]).toBeLessThan(leftRim.stroke.args[2]);
    expect(rightRim.stroke.args[0]).toBeGreaterThan(rightRim.stroke.args[2]);
    expect(leftRim.stroke.stops).toEqual(rightRim.stroke.stops);
  });

  it('keeps material gradient inputs finite when live controls are absent, nonfinite or out of range', () => {
    for (const overrides of [
      { liveTissueState: undefined }, { liveTissueState: null }, { liveTissueState: { moisture: NaN } },
      { liveTissueState: { moisture: Infinity } }, { liveTissueState: { moisture: -20 } },
      { liveTissueState: { moisture: 200 }, d: { lightIntensity: Infinity } },
    ]) {
      const f = fixture('lens', overrides); f.finish(190, 260, 27, 44, 'lens');
      for (const event of paints(f)) {
        for (const gradient of [event.fill, event.stroke].filter(value => value && typeof value === 'object')) {
          expect(gradient.args.every(Number.isFinite)).toBe(true);
          for (const [, color] of gradient.stops) {
            const opacity = Number(color.slice(color.lastIndexOf(',') + 1, -1));
            expect(Number.isFinite(opacity)).toBe(true); expect(opacity).toBeGreaterThanOrEqual(0); expect(opacity).toBeLessThanOrEqual(1);
          }
        }
      }
      expect(f.ctx.stack).toEqual([]);
    }
  });
});
