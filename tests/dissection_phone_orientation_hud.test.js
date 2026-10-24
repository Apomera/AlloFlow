import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_dissection.js', 'utf8');
function productionLayout() {
  const matches = [...source.matchAll(/^([ \t]*)function canvasOrientationHudLayout\(/gm)];
  if (matches.length !== 1) throw Error('Expected one production canvasOrientationHudLayout function');
  const match = matches[0], start = match.index + match[1].length, ending = '\n' + match[1] + '}';
  const end = source.indexOf(ending, start);
  if (end < start) throw Error('Missing production orientation layout ending');
  return new Function('return (' + source.slice(start, end + ending.length) + ');')();
}
class TextContext {
  constructor() { this.font = '18px custom-font'; this.matrix = [-2, .1, .2, 2, 720, -130]; this.stack = []; this.measurements = 0; }
  save() { this.stack.push({ font: this.font, matrix: [...this.matrix] }); }
  restore() { Object.assign(this, this.stack.pop()); }
  measureText(text) { this.measurements++; return { width: String(text).length * Number(this.font.match(/[\d.]+/)[0]) * .58 }; }
}
function input(cssWidth, large = false) {
  const W = 500, unit = W / cssWidth;
  return { W, unit, ui: Math.min(2.8, Math.max(1.2, Math.min(2.6, unit * 1.25)) * (large ? 1.18 : 1)),
    hud: Math.max(1, Math.min(2.15, unit * (large ? 1.18 : 1))) };
}
function measure(text, fontSize) { return String(text).length * fontSize * .58; }

describe('responsive canvas orientation HUD layout', () => {
  it.each([[252, false], [300, true], [390, false], [479, false], [320, true]])('retains readable orientation status and endpoints inside a 70 CSSpx card at %s CSSpx (large=%s)', (cssWidth, large) => {
    const settings = input(cssWidth, large), status = 'INTERNAL · TARGET VENTRAL';
    for (const axis of ['horizontal', 'vertical']) {
      const ctx = new TextContext();
      const layout = productionLayout()(ctx, settings.W, cssWidth, axis, settings.ui, settings.hud, status, 'ANTERIOR', 'POSTERIOR');
      const fontSize = 10 * layout.typeScale;
      expect(layout.compact).toBe(true); expect(layout.height / settings.unit).toBeCloseTo(70, 10);
      expect(layout.width).toBeLessThanOrEqual(settings.W - 28);
      expect(fontSize / settings.unit).toBeGreaterThanOrEqual(12 - 1e-8);
      if (large) expect(fontSize / settings.unit).toBeGreaterThanOrEqual(14 - 1e-8);
      expect(layout.width - layout.inset * 2).toBeGreaterThanOrEqual(measure(status, fontSize));
      expect(layout.axisTop).toBeGreaterThan(layout.statusY);
      expect(layout.axisBottom).toBeGreaterThan(layout.axisTop + fontSize);
      expect(layout.axisBottom + layout.labelBaselineOffset + fontSize * .22).toBeLessThan(layout.height);
      expect(layout.horizontalLabelY + fontSize * .22).toBeLessThan(layout.height);
      expect(layout.markerRadius).toBeGreaterThan(0); expect(layout.diamondRadius).toBeGreaterThan(layout.markerRadius);
      expect(ctx.stack).toEqual([]); expect(ctx.font).toBe('18px custom-font');
    }
  });

  it.each([480, 600])('retains the exact former desktop dimensions at %s CSSpx', cssWidth => {
    const settings = input(cssWidth);
    for (const axis of ['horizontal', 'vertical']) {
      const layout = productionLayout()(new TextContext(), settings.W, cssWidth, axis, settings.ui, settings.hud, 'DORSAL · TARGET VENTRAL', 'ANTERIOR', 'POSTERIOR');
      expect(layout.compact).toBe(false);
      expect(layout.width).toBe(Math.max(axis === 'horizontal' ? 188 : 126, measure('ANATOMICAL AXIS', 11 * settings.ui) + 30 * settings.ui));
      expect(layout.height).toBe((axis === 'horizontal' ? 80 : 116) * settings.ui);
      expect(layout.typeScale).toBe(settings.ui); expect(layout.inset).toBe(9 * settings.hud);
    }
  });

  it('bases compactness on the embedded canvas width rather than the outer viewport or logical buffer', () => {
    const fn = productionLayout(), ctx = new TextContext();
    const embedded = fn(ctx, 500, 320, 'vertical', 2, 1.6, 'VENTRAL · ALIGNED', 'ANTERIOR', 'POSTERIOR');
    const desktop = fn(ctx, 500, 1180, 'vertical', 1, 1, 'VENTRAL · ALIGNED', 'ANTERIOR', 'POSTERIOR');
    expect(embedded.compact).toBe(true); expect(desktop.compact).toBe(false);
    expect(embedded.height / (500 / 320)).toBe(70);
  });

  it('allocates unequal horizontal endpoint widths without clipping the longer anatomical name', () => {
    const s = input(300), status = 'VENTRAL · ALIGNED';
    const layout = productionLayout()(new TextContext(), s.W, 300, 'horizontal', s.ui, s.hud, status, 'CORNEA', 'OPTIC NERVE');
    expect(layout.startTextWidth).toBeGreaterThanOrEqual(measure('CORNEA', 10 * layout.typeScale));
    expect(layout.endTextWidth).toBeGreaterThanOrEqual(measure('OPTIC NERVE', 10 * layout.typeScale));
    expect(layout.endTextWidth).toBeGreaterThan(layout.startTextWidth);
    expect(layout.startTextWidth + layout.endTextWidth + layout.inset * 2).toBeLessThan(layout.width);
  });

  it('does not confuse DPR, mirrored geometry or pan state with the CSS layout measurement', () => {
    const fn = productionLayout(), first = new TextContext(), mirrored = new TextContext(), s = input(300);
    first.matrix = [1, 0, 0, 1, 0, 0];
    const a = fn(first, s.W, 300, 'vertical', s.ui, s.hud, 'DORSAL · TARGET VENTRAL', 'ANTERIOR', 'POSTERIOR');
    const before = [...mirrored.matrix];
    const b = fn(mirrored, s.W, 300, 'vertical', s.ui, s.hud, 'DORSAL · TARGET VENTRAL', 'ANTERIOR', 'POSTERIOR');
    expect(b).toEqual(a); expect(mirrored.matrix).toEqual(before); expect(mirrored.stack).toEqual([]);
  });

  it('restores font and transform after a measurement failure and keeps a finite conservative layout', () => {
    const ctx = new TextContext(), before = { font: ctx.font, matrix: [...ctx.matrix] };
    ctx.measureText = () => { throw Error('Injected font measurement failure'); };
    const layout = productionLayout()(ctx, 500, 300, 'vertical', 2, 1.67, 'DORSAL · TARGET VENTRAL', 'ANTERIOR', 'POSTERIOR');
    expect(Number.isFinite(layout.width)).toBe(true); expect(layout.width).toBeGreaterThan(0);
    expect(ctx.font).toBe(before.font); expect(ctx.matrix).toEqual(before.matrix); expect(ctx.stack).toEqual([]);
  });

  it('can size a compact readable card while the canvas context is unavailable during resize', () => {
    const layout = productionLayout()(null, 500, 300, 'vertical', 2, 1.67, 'DORSAL · TARGET VENTRAL', 'ANTERIOR', 'POSTERIOR');
    expect(layout.compact).toBe(true); expect(Number.isFinite(layout.width)).toBe(true); expect(layout.height).toBeCloseTo(70 * 500 / 300);
  });

  it.each([
    [0, 300, 2, 1], [500, 0, 2, 1], [Infinity, 300, 2, 1], [500, NaN, 2, 1], [500, 300, 0, 1], [500, 300, 2, Infinity],
  ])('rejects invalid dimensions/scales %s,%s,%s,%s without canvas work', (W, cssWidth, ui, hud) => {
    const ctx = new TextContext();
    expect(productionLayout()(ctx, W, cssWidth, 'vertical', ui, hud, 'DORSAL · ALIGNED', 'ANTERIOR', 'POSTERIOR')).toBeNull();
    expect(ctx.measurements).toBe(0); expect(ctx.stack).toEqual([]); expect(ctx.font).toBe('18px custom-font');
  });
});
