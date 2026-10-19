import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_dissection.js', 'utf8');
function productionFunction(name, bindings = {}) {
  const matches = [...source.matchAll(new RegExp('^([ \\t]*)function ' + name + '\\(', 'gm'))];
  if (matches.length !== 1) throw Error('Expected one production function: ' + name);
  const match = matches[0], start = match.index + match[1].length, ending = '\n' + match[1] + '}';
  const end = source.indexOf(ending, start);
  if (end < start) throw Error('Missing function ending: ' + name);
  return new Function(...Object.keys(bindings), '"use strict"; return (' + source.slice(start, end + ending.length) + ');')(...Object.values(bindings));
}

class RecordedPath {
  constructor() { this.operations = []; }
  moveTo(...args) { this.operations.push({ operation: 'moveTo', args }); }
  lineTo(...args) { this.operations.push({ operation: 'lineTo', args }); }
  ellipse(...args) { this.operations.push({ operation: 'ellipse', args }); }
  closePath() { this.operations.push({ operation: 'closePath', args: [] }); }
  addPath(path) { this.operations.push(...path.operations); }
}
const styleKeys = ['globalAlpha', 'globalCompositeOperation', 'fillStyle', 'strokeStyle', 'lineWidth', 'lineCap', 'lineJoin',
  'shadowBlur', 'shadowColor', 'shadowOffsetX', 'shadowOffsetY'];
class RecordingContext {
  constructor(matrix = [1, 0, 0, 1, 0, 0]) {
    this.matrix = [...matrix]; this.path = []; this.clips = []; this.stack = []; this.events = [];
    Object.assign(this, { globalAlpha: .7, globalCompositeOperation: 'source-over', fillStyle: '#123456', strokeStyle: '#654321',
      lineWidth: 3, lineCap: 'butt', lineJoin: 'miter', shadowBlur: 7, shadowColor: '#443322', shadowOffsetX: 1, shadowOffsetY: -2 });
  }
  state() { return { matrix: [...this.matrix], clips: [...this.clips], ...Object.fromEntries(styleKeys.map(key => [key, this[key]])) }; }
  save() { this.stack.push(this.state()); }
  restore() { if (!this.stack.length) throw Error('Unbalanced canvas restore'); Object.assign(this, this.stack.pop()); }
  getTransform() { const [a, b, c, d, e, f] = this.matrix; return { a, b, c, d, e, f }; }
  translate(x, y) { const m = this.matrix; m[4] += m[0] * x + m[2] * y; m[5] += m[1] * x + m[3] * y; }
  scale(x, y) { const m = this.matrix; this.matrix = [m[0] * x, m[1] * x, m[2] * y, m[3] * y, m[4], m[5]]; }
  rotate(t) { const m = this.matrix, c = Math.cos(t), s = Math.sin(t); this.matrix = [m[0] * c + m[2] * s, m[1] * c + m[3] * s, -m[0] * s + m[2] * c, -m[1] * s + m[3] * c, m[4], m[5]]; }
  beginPath() { this.path = []; }
  moveTo(...args) { this.path.push({ operation: 'moveTo', args, matrix: [...this.matrix] }); }
  bezierCurveTo(...args) { this.path.push({ operation: 'bezierCurveTo', args, matrix: [...this.matrix] }); }
  clip(path) { this.clips = [...this.clips, path]; this.events.push({ operation: 'clip', explicitPath: path }); }
  snapshotStyle(style) {
    return style && typeof style === 'object' ? { kind: style.kind, args: [...style.args], stops: style.stops.map(stop => [...stop]) } : style;
  }
  paint(operation, args = [], explicitPath) {
    this.events.push({ operation, args, explicitPath, path: [...this.path], clips: [...this.clips], matrix: [...this.matrix],
      alpha: this.globalAlpha, composite: this.globalCompositeOperation, fill: this.snapshotStyle(this.fillStyle), stroke: this.snapshotStyle(this.strokeStyle),
      width: this.lineWidth, shadow: [this.shadowColor, this.shadowBlur, this.shadowOffsetX, this.shadowOffsetY] });
  }
  fill(path) { this.paint('fill', [], path); }
  stroke() { this.paint('stroke'); }
  fillRect(...args) { this.paint('fillRect', args); }
  createRadialGradient(...args) { return { kind: 'radialGradient', args, stops: [], addColorStop(position, color) { this.stops.push([position, color]); } }; }
}
const colors = ['#c18c69', '#edd0aa', '#704335'];
function geometry(W = 500, H = 600) {
  return { start: [W * .555, H * .55], curves: [
    [W * .59, H * .58, W * .43, H * .59, W * .475, H * .62],
    [W * .54, H * .65, W * .585, H * .595, W * .535, H * .585],
    [W * .475, H * .57, W * .43, H * .64, W * .515, H * .66],
  ], width: W * .012 };
}
function trace(ctx, input) {
  ctx.beginPath(); ctx.moveTo(...input.start);
  for (const curve of input.curves) ctx.bezierCurveTo(...curve);
}
function fixture(overrides = {}, matrix) {
  const ctx = new RecordingContext(matrix);
  const bindings = { ctx, d: { visualRealism: 'realistic', variationSeed: 7, lightIntensity: 68 }, visualRealism: 'guided',
    specimen: 'frog', variationSeed: 1, specimenCondition: 'standard', sceneDetail: true, highContrastEnabled: false,
    lightDirection: 'left', liveTissueState: { moisture: 76 }, Path2D: RecordedPath, ...overrides };
  bindings.dissHash = productionFunction('dissHash');
  bindings.strokeAnatomicalTube = productionFunction('strokeAnatomicalTube', bindings);
  const draw = productionFunction('drawEntericBowel', bindings);
  return { ctx, bindings, draw(input = geometry()) { return draw(input.start, input.curves, input.width, ...colors, 'frog-ileum'); } };
}
const paints = ctx => ctx.events.filter(event => ['fill', 'stroke', 'fillRect'].includes(event.operation));
function centerlineSamples(input) {
  const points = []; let p = input.start;
  for (const c of input.curves) {
    for (let i = 0; i <= 1000; i++) { const t = i / 1000, u = 1 - t;
      points.push([u ** 3 * p[0] + 3 * u * u * t * c[0] + 3 * u * t * t * c[2] + t ** 3 * c[4],
        u ** 3 * p[1] + 3 * u * u * t * c[1] + 3 * u * t * t * c[3] + t ** 3 * c[5]]);
    } p = c.slice(4);
  } return points;
}

describe('closed enteric surfaces', () => {
  it.each([[500, 600], [1000, 600], [320, 900]])('keeps the %s by %s authored centerline and its original tube envelope with bounded clipped material work', (W, H) => {
    const input = geometry(W, H), expected = fixture(); trace(expected.ctx, input);
    for (const variationSeed of [1, 19]) {
      const f = fixture({ d: { visualRealism: 'realistic', variationSeed } }), before = f.ctx.state();
      expect(f.draw(input)).toBe(true);
      expect(f.ctx.path).toEqual(expected.ctx.path); expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
      const painting = paints(f.ctx), footprint = painting[0].explicitPath;
      expect(footprint).toBeInstanceOf(RecordedPath);
      expect(painting.length).toBeLessThanOrEqual(20);
      expect(footprint.operations.length).toBeLessThan(320);
      expect(painting.slice(1).every(event => event.clips.includes(footprint))).toBe(true);
      const dense = centerlineSamples(input);
      const rimPoints = footprint.operations.flatMap(({ operation, args }) => {
        if (['moveTo', 'lineTo'].includes(operation)) return [args];
        if (operation === 'ellipse') return Array.from({ length: 16 }, (_, i) =>
          [args[0] + Math.cos(i / 8 * Math.PI) * args[2], args[1] + Math.sin(i / 8 * Math.PI) * args[3]]);
        return [];
      });
      for (const p of rimPoints) {
        const nearest = Math.sqrt(dense.reduce((best, q) => Math.min(best, (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2), Infinity));
        expect(nearest).toBeLessThanOrEqual(input.width / 2 + .08);
      }
    }
  });

  it('finishes each passage before the next covers it and contains every wet glint inside that passage', () => {
    const f = fixture(), input = geometry(); f.draw(input);
    const painting = paints(f.ctx), body = painting[0].explicitPath;
    for (let piece = 0; piece < input.curves.length; piece++) {
      const group = painting.slice(1 + piece * 6, 1 + (piece + 1) * 6);
      expect(group.map(event => event.operation)).toEqual(['stroke', 'stroke', 'stroke', 'stroke', 'stroke', 'fillRect']);
      expect(group.slice(0, 5).every(event => event.path[1].args.join(',') === input.curves[piece].join(','))).toBe(true);
      const glint = group.at(-1), localClip = glint.clips.at(-1);
      expect(glint.clips).toHaveLength(2); expect(localClip).not.toBe(body);
      expect(localClip.operations.length).toBeLessThan(body.operations.length);
      expect(localClip.operations.every(operation => body.operations.includes(operation))).toBe(true);
      expect(group.slice(0, 5).every(event => event.clips.length === 1)).toBe(true);
    }
  });

  it.each([
    ['Guided', { d: { visualRealism: 'guided' } }], ['Accessible', { d: { visualRealism: 'accessible' } }],
    ['high contrast', { highContrastEnabled: true }], ['detail off', { sceneDetail: false }], ['missing Path2D', { Path2D: undefined }],
  ])('preserves the exact former path and tube paints in %s', (_, overrides) => {
    const old = fixture(overrides), next = fixture(overrides), input = geometry();
    trace(old.ctx, input); old.bindings.strokeAnatomicalTube(input.width, ...colors); next.draw(input);
    expect(next.ctx.events).toEqual(old.ctx.events); expect(next.ctx.path).toEqual(old.ctx.path);
    expect(next.ctx.state()).toEqual(old.ctx.state()); expect(next.ctx.stack).toEqual([]);
  });

  it('keeps repainting deterministic and changes wet sheen with lamp strength and hydration without moving tissue', () => {
    const first = fixture(), same = fixture(), relit = fixture({ lightDirection: 'right', liveTissueState: { moisture: 2 } });
    const wet = fixture({ d: { visualRealism: 'realistic', lightIntensity: 100 }, liveTissueState: { moisture: 100 } });
    const dry = fixture({ d: { visualRealism: 'realistic', lightIntensity: 100, specimenCondition: 'dehydrated' }, liveTissueState: { moisture: 0 } });
    const dim = fixture({ d: { visualRealism: 'realistic', lightIntensity: 20 }, liveTissueState: { moisture: 100 } });
    for (const f of [first, same, relit, wet, dry, dim]) f.draw();
    expect(same.ctx.events).toEqual(first.ctx.events);
    expect(paints(relit.ctx)[0].explicitPath).toEqual(paints(first.ctx)[0].explicitPath);
    const strength = f => paints(f.ctx).filter(event => event.operation === 'fillRect')
      .reduce((sum, event) => sum + Number(event.fill.stops[0][1].split(',').at(-1).slice(0, -1)), 0);
    expect(strength(wet)).toBeGreaterThan(strength(dry)); expect(strength(wet)).toBeGreaterThan(strength(dim));
    expect(wet.ctx.path).toEqual(dry.ctx.path); expect(wet.ctx.path).toEqual(dim.ctx.path);
  });

  it.each(['fill', 'stroke', 'fillRect'])('restores full affine context and caller path when %s throws', operation => {
    const matrix = [-2, .1, .2, 2, 720, -130], f = fixture({}, matrix), expected = fixture({}, matrix), input = geometry();
    const before = f.ctx.state(); trace(expected.ctx, input);
    f.ctx[operation] = () => { throw Error('Injected enteric material failure'); };
    expect(() => f.draw(input)).toThrow('Injected enteric material failure');
    expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]); expect(f.ctx.path).toEqual(expected.ctx.path);
  });

  it('rejects malformed or unbounded input without touching the context and falls back safely for a stationary tangent', () => {
    const input = geometry();
    for (const invalid of [
      { ...input, start: null }, { ...input, width: 0 }, { ...input, width: Infinity },
      { ...input, curves: [[0, 1, 2, 3, 4, NaN]] }, { ...input, curves: Array(4).fill(input.curves[0]) },
    ]) {
      const f = fixture(), before = f.ctx.state(); f.ctx.moveTo(1, 2); const path = [...f.ctx.path];
      expect(f.draw(invalid)).toBe(false); expect(f.ctx.events).toEqual([]); expect(f.ctx.path).toEqual(path); expect(f.ctx.state()).toEqual(before);
    }
    const stationary = { start: [10, 10], curves: [[10, 10, 10, 10, 10, 10]], width: 5 };
    const old = fixture(), next = fixture(); trace(old.ctx, stationary); old.bindings.strokeAnatomicalTube(stationary.width, ...colors); next.draw(stationary);
    expect(next.ctx.events).toEqual(old.ctx.events); expect(next.ctx.path).toEqual(old.ctx.path); expect(next.ctx.stack).toEqual([]);
  });
});
