import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_dissection.js', 'utf8');
function productionFunction(name, bindings = {}) {
  const matches = [...source.matchAll(new RegExp('^([ \\t]*)function ' + name + '\\(', 'gm'))];
  if (matches.length !== 1) throw new Error('Expected one production function: ' + name);
  const start = matches[0].index + matches[0][1].length;
  const ending = '\n' + matches[0][1] + '}';
  const end = source.indexOf(ending, start);
  if (end < start) throw new Error('Missing production function ending: ' + name);
  return new Function(...Object.keys(bindings), 'return (' + source.slice(start, end + ending.length) + ');')(...Object.values(bindings));
}

class RecordedPath {
  constructor() { this.operations = []; }
  rect(...args) { this.operations.push({ operation: 'rect', args }); }
  addPath(path) { this.operations.push({ operation: 'addPath', path }); }
}
class RegisteredContext {
  constructor(matrix) {
    this.matrix = { ...matrix }; this.stack = []; this.events = []; this.clipped = false;
    this.shadowBlur = 9; this.shadowOffsetX = 4; this.shadowOffsetY = -2;
    this.shadowColor = '#314159'; this.strokeStyle = '#654321'; this.lineWidth = 5;
  }
  getTransform() { return { ...this.matrix }; }
  setTransform(matrix) { this.matrix = { ...matrix }; this.events.push({ operation: 'setTransform', matrix: this.getTransform() }); }
  save() { this.stack.push({ matrix: this.getTransform(), clipped: this.clipped, shadowBlur: this.shadowBlur, shadowOffsetX: this.shadowOffsetX, shadowOffsetY: this.shadowOffsetY, shadowColor: this.shadowColor, strokeStyle: this.strokeStyle, lineWidth: this.lineWidth, lineCap: this.lineCap, lineJoin: this.lineJoin }); }
  restore() { Object.assign(this, this.stack.pop()); }
  clip(path, rule) { this.clipped = true; this.events.push({ operation: 'clip', path, rule, matrix: this.getTransform() }); }
  stroke(path) { this.events.push({ operation: 'stroke', path, matrix: this.getTransform(), width: this.lineWidth }); }
}
const authoredMatrix = Object.freeze({ a: -2, b: 0.1, c: 0.15, d: 2, e: 350, f: -20 });
const overlayMatrix = Object.freeze({ a: 1.5, b: 0, c: 0, d: 1.5, e: 12, f: 30 });
const remember = productionFunction('rememberAnatomyOpening');
const rim = productionFunction('drawRegisteredRetractionRim');
const outside = productionFunction('withFlapsOutsideAnatomy', { Path2D: RecordedPath });

describe('dissection retraction registered to the authored opening', () => {
  it('retains the exact authored path and its draw matrix independently of later context changes', () => {
    const path = new RecordedPath(), ctx = new RegisteredContext(authoredMatrix);
    const opening = remember(path, ctx);
    expect(opening.path).toBe(path);
    expect(opening.transform).toEqual(authoredMatrix);
    ctx.setTransform(overlayMatrix);
    expect(opening.transform).toEqual(authoredMatrix);
    expect(opening.path.operations).toEqual([]);
    expect(remember(null, ctx)).toBeNull();
    expect(remember(path, {})).toBeNull();
    expect(remember(path, new RegisteredContext({ ...authoredMatrix, a: Infinity }))).toBeNull();
  });

  it('strokes the same path at its original matrix and restores the overlay context for normal and accessible rims', () => {
    for (const accessible of [false, true]) {
      const path = new RecordedPath(), ctx = new RegisteredContext(overlayMatrix);
      const opening = { path, transform: { ...authoredMatrix } };
      expect(rim(ctx, opening, accessible)).toBe(true);
      const strokes = ctx.events.filter(event => event.operation === 'stroke');
      expect(strokes).toHaveLength(2);
      expect(strokes.every(event => event.path === path)).toBe(true);
      expect(strokes.map(event => event.matrix)).toEqual([authoredMatrix, authoredMatrix]);
      expect(ctx.getTransform()).toEqual(overlayMatrix);
      expect(ctx.shadowBlur).toBe(9); expect(ctx.shadowColor).toBe('#314159');
      expect(ctx.lineWidth).toBe(5); expect(ctx.stack).toEqual([]);
    }
    const ctx = new RegisteredContext(overlayMatrix);
    ctx.stroke = vi.fn(() => { throw new Error('Injected rim failure'); });
    expect(() => rim(ctx, { path: new RecordedPath(), transform: authoredMatrix }, false)).toThrow('Injected rim failure');
    expect(ctx.getTransform()).toEqual(overlayMatrix);
    expect(ctx.shadowBlur).toBe(9); expect(ctx.stack).toEqual([]);
  });

  it('excludes the exact opening with an even-odd clip while flaps retain the overlay transform', () => {
    const path = new RecordedPath(), ctx = new RegisteredContext(overlayMatrix);
    const opening = { path, transform: authoredMatrix };
    const paint = vi.fn(() => { expect(ctx.clipped).toBe(true); expect(ctx.getTransform()).toEqual(overlayMatrix); });
    expect(outside(ctx, opening, 500, 600, paint)).toBe(true);
    expect(paint).toHaveBeenCalledOnce();
    const clip = ctx.events.find(event => event.operation === 'clip');
    expect(clip.rule).toBe('evenodd');
    expect(clip.matrix).toEqual(authoredMatrix);
    expect(clip.path.operations).toContainEqual({ operation: 'addPath', path });
    expect(path.operations).toEqual([]);
    expect(ctx.getTransform()).toEqual(overlayMatrix);
    expect(ctx.clipped).toBe(false); expect(ctx.stack).toEqual([]);
  });

  it('restores the clipping and transform after a flap paint error and ignores unavailable openings', () => {
    const ctx = new RegisteredContext(overlayMatrix), path = new RecordedPath();
    expect(() => outside(ctx, { path, transform: authoredMatrix }, 500, 600, () => {
      throw new Error('Injected flap failure');
    })).toThrow('Injected flap failure');
    expect(ctx.getTransform()).toEqual(overlayMatrix);
    expect(ctx.clipped).toBe(false); expect(ctx.stack).toEqual([]);
    const paint = vi.fn(), events = ctx.events.length;
    expect(outside(ctx, null, 500, 600, paint)).toBe(false);
    expect(rim(ctx, null, false)).toBe(false);
    expect(paint).not.toHaveBeenCalled();
    expect(ctx.events).toHaveLength(events);
  });
});
