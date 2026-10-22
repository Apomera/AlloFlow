import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_dissection.js', 'utf8'), bodies = new Map();
function production(name, bindings = {}) {
  if (!bodies.has(name)) {
    const matches = [...source.matchAll(new RegExp('^([ \\t]*)function ' + name + '\\(', 'gm'))];
    if (matches.length !== 1) throw Error('Expected one production function: ' + name);
    const m = matches[0], start = m.index + m[1].length, ending = new RegExp('^' + m[1] + '}[ \\t]*\\r?$', 'gm');
    ending.lastIndex = start; const end = ending.exec(source);
    if (!end) throw Error('Missing standalone function ending: ' + name);
    bodies.set(name, source.slice(start, end.index + end[0].trimEnd().length));
  }
  return new Function(...Object.keys(bindings), '"use strict"; return (' + bodies.get(name) + ');')(...Object.values(bindings));
}
const make = production('dissectionHotspotMarkerGeometry');
const layout = { x: 38, y: 312, width: 24, height: 24, pointX: 212, pointY: 173, side: 'left', index: 4,
  showCallout: true, fullLabel: false, selected: false, hovered: false, related: false, visibility: 'visible', depth: 'deep', labelLines: [] };
const options = { quizMode: false, coarsePointer: false, labelUiScale: 1.4, specimenTextScaleX: 1.06,
  specimenTextScaleY: 1.03, canvasUiScale: 2.0554507185367976, zoom: 2, accessible: false, depthAtlasEnabled: false };
function markerBox(marker) { return { x: marker.cx - marker.rx, y: marker.cy - marker.ry, width: marker.rx * 2, height: marker.ry * 2 }; }
function contains(marker, p) { return p.x >= marker.cx - marker.rx - 1e-9 && p.x <= marker.cx + marker.rx + 1e-9 &&
  p.y >= marker.cy - marker.ry - 1e-9 && p.y <= marker.cy + marker.ry + 1e-9; }

class Context {
  constructor() {
    this.matrix = [1, 0, 0, 1, 0, 0]; this.stack = []; this.path = []; this.events = []; this.lineWidth = 1;
    this.strokeStyle = '#000'; this.fillStyle = '#fff'; this.globalAlpha = 1;
  }
  save() { this.stack.push({ matrix: [...this.matrix], lineWidth: this.lineWidth, strokeStyle: this.strokeStyle, fillStyle: this.fillStyle, globalAlpha: this.globalAlpha }); }
  restore() { if (!this.stack.length) throw Error('Unbalanced restore'); Object.assign(this, this.stack.pop()); }
  point(x, y, matrix = this.matrix) { const [a, b, c, d, e, f] = matrix; return { x: a * x + c * y + e, y: b * x + d * y + f }; }
  translate(x, y) { const p = this.point(x, y); this.matrix[4] = p.x; this.matrix[5] = p.y; }
  scale(x, y) { this.matrix[0] *= x; this.matrix[1] *= x; this.matrix[2] *= y; this.matrix[3] *= y; }
  rotate(t) {
    const [a, b, c, d, e, f] = this.matrix, co = Math.cos(t), si = Math.sin(t);
    this.matrix = [a * co + c * si, b * co + d * si, c * co - a * si, d * co - b * si, e, f];
  }
  beginPath() { this.path = []; }
  arc(x, y, radius, start, end) { this.path.push({ kind: 'arc', x, y, radius, start, end, matrix: [...this.matrix] }); }
  ellipse(x, y, rx, ry, rotation, start, end) { this.path.push({ kind: 'ellipse', x, y, rx, ry, rotation, start, end, matrix: [...this.matrix] }); }
  rect(x, y, width, height) { this.path.push({ kind: 'rect', x, y, width, height, matrix: [...this.matrix] }); }
  moveTo(x, y) { this.path.push({ kind: 'move', x, y, matrix: [...this.matrix] }); }
  lineTo(x, y) { this.path.push({ kind: 'line', x, y, matrix: [...this.matrix] }); }
  quadraticCurveTo() {} setLineDash() {} fillText() {} fillRect() {} strokeRect() {} roundRect() {}
  createRadialGradient() { return { addColorStop() {} }; }
  fill() { this.events.push({ operation: 'fill', path: structuredClone(this.path), width: 0 }); }
  stroke() { this.events.push({ operation: 'stroke', path: structuredClone(this.path), width: this.lineWidth }); }
}
function paintedPoints(ctx) {
  const points = [];
  for (const event of ctx.events) for (const p of event.path) {
    const half = event.width / 2;
    if (p.kind === 'arc') for (let i = 0; i <= 160; i++) {
      const angle = p.start + (p.end - p.start) * i / 160;
      points.push(ctx.point(p.x + Math.cos(angle) * (p.radius + half), p.y + Math.sin(angle) * (p.radius + half), p.matrix));
    } else if (p.kind === 'rect') {
      for (const x of [p.x - half, p.x + p.width + half]) for (const y of [p.y - half, p.y + p.height + half]) points.push(ctx.point(x, y, p.matrix));
    } else if (p.kind === 'line' || p.kind === 'move') {
      for (const dx of [-half, half]) for (const dy of [-half, half]) points.push(ctx.point(p.x + dx, p.y + dy, p.matrix));
    }
  }
  return points;
}
function symbolFixture(l, o) {
  const ctx = new Context(), d = { visualRealism: o.accessible ? 'accessible' : 'realistic' };
  const bindings = { ctx, d, visualRealism: d.visualRealism, highContrastEnabled: false, depthAtlasEnabled: o.depthAtlasEnabled,
    canvasUiScale: o.canvasUiScale, zoom: o.zoom, specimenScale: { x: o.specimenTextScaleX, y: o.specimenTextScaleY } };
  bindings.scaleHotspotMarker = production('scaleHotspotMarker', bindings);
  const atlas = production('drawDepthAtlasMarker', bindings), exposure = production('drawExposureStateMarker', bindings);
  if (!l.selected && (l.visibility === 'visible' || l.hovered)) atlas(l.pointX, l.pointY, l.depth, false, l.hovered, false);
  exposure(l.pointX, l.pointY, l.visibility, l.selected, l.hovered, false);
  return ctx;
}
function guidanceFixture(l, o, markerGeometry = make) {
  const ctx = new Context(), d = { quizMode: o.quizMode, visualRealism: 'guided', selectedOrgan: null };
  const bindings = { ctx, d, visualRealism: 'guided', organs: [{ id: 'sample' }], adaptiveHotspotById: { sample: l },
    focusMode: false, denseHotspotView: true, canvasDisplayWidth: 650, canvasCoarsePointer: o.coarsePointer,
    canvasUiScale: o.canvasUiScale, labelUiScale: o.labelUiScale, specimenTextScaleX: o.specimenTextScaleX,
    specimenTextScaleY: o.specimenTextScaleY, specimenScale: { x: o.specimenTextScaleX, y: o.specimenTextScaleY },
    zoom: o.zoom, highContrastEnabled: o.accessible, depthAtlasEnabled: o.depthAtlasEnabled,
    canvas: { _guidanceBoxes: [] }, layerStroke: '#987654', dissMotionReduced: true, focusEntryProgress: 1, dissTick: 0,
    drawStructureInspectionFootprint() {}, drawDepthAtlasMarker() {}, drawExposureStateMarker: () => false,
    dissectionCalloutLeader: () => null, dissectionHotspotMarkerGeometry: markerGeometry, fillReadableSpecimenText() {},
    rememberCanvasGuidanceBox() {}, canvasScreenBox: () => null };
  bindings.scaleHotspotMarker = production('scaleHotspotMarker', bindings);
  bindings.adaptiveHotspotMarkerGeometry = production('adaptiveHotspotMarkerGeometry', bindings);
  production('drawAdaptiveHotspotGuidance', bindings)(); return ctx;
}

describe('shared hotspot marker geometry', () => {
  it.each([false, true])('retains the exact existing compact badge center and coarse=%s radii', coarsePointer => {
    const o = { ...options, coarsePointer }, actual = make(layout, o).badge;
    expect(actual).toEqual({ cx: layout.x + layout.width / 2, cy: layout.y + layout.height / 2,
      rx: (coarsePointer ? 12 : 10) * o.labelUiScale / o.specimenTextScaleX,
      ry: (coarsePointer ? 12 : 10) * o.labelUiScale / o.specimenTextScaleY });
  });

  it.each([{ quizMode: true }, { showCallout: false }, { fullLabel: true }])('omits an unpainted number badge for %j', patch => {
    expect(make({ ...layout, ...patch }, { ...options, ...patch }).badge).toBeNull();
  });

  it.each(['visible', 'emerging', 'obscured', 'occluded'])('reserves the actual exposure marker for visibility=%s and every selection state', visibility => {
    for (const accessible of [false, true]) for (const selected of [false, true]) for (const hovered of [false, true]) {
      const l = { ...layout, visibility, selected, hovered }, o = { ...options, accessible }, marker = make(l, o).point;
      if (selected && visibility === 'visible' && !hovered) expect(marker).toBeNull();
      else {
        expect(marker).not.toBeNull(); expect(marker.cx).toBe(l.pointX); expect(marker.cy).toBe(l.pointY);
        const ctx = symbolFixture(l, o); expect(paintedPoints(ctx).every(p => contains(marker, p))).toBe(true); expect(ctx.stack).toEqual([]);
      }
    }
  });

  it.each(['surface', 'structure', 'deep'])('contains the actual shape-coded %s atlas paints, including rotated stroke corners', depth => {
    for (const accessible of [false, true]) for (const hovered of [false, true]) {
      const l = { ...layout, depth, hovered }, o = { ...options, accessible, depthAtlasEnabled: true }, marker = make(l, o).point;
      const ctx = symbolFixture(l, o), points = paintedPoints(ctx); expect(points.length).toBeGreaterThan(0);
      expect(points.every(p => contains(marker, p))).toBe(true); expect(ctx.stack).toEqual([]);
    }
  });

  it('reserves ordinary visible pins, selected exposure symbols and hover rims without depending on callout visibility', () => {
    const factor = options.canvasUiScale / options.zoom;
    const normal = make({ ...layout, showCallout: false }, options); expect(normal.badge).toBeNull();
    expect(normal.point.rx).toBeCloseTo(5.75 * factor / options.specimenTextScaleX, 12);
    const hover = make({ ...layout, selected: true, hovered: true }, options).point;
    expect(hover.rx).toBeCloseTo(10.85 * factor / options.specimenTextScaleX, 12);
    const covered = make({ ...layout, selected: true, visibility: 'obscured' }, { ...options, accessible: true }).point;
    expect(covered.rx).toBeCloseTo((7.5 + 1.05) * factor / options.specimenTextScaleX, 12);
  });

  it('suppresses an atlas for covered unhovered anatomy and selected targets while retaining permitted symbols', () => {
    const o = { ...options, depthAtlasEnabled: true };
    for (const visibility of ['emerging', 'obscured', 'occluded']) {
      const l = { ...layout, visibility }; expect(make(l, o).point).toEqual(make(l, options).point);
    }
    expect(make({ ...layout, selected: true }, o).point).toBeNull();
    expect(make({ ...layout, selected: true, hovered: true }, o).point).toEqual(make({ ...layout, selected: true, hovered: true }, options).point);
  });

  it('scales badge and point bounds in their distinct specimen coordinate systems', () => {
    const a = make(layout, options), b = make(layout, { ...options, zoom: 4, canvasUiScale: options.canvasUiScale * 2 });
    expect(b).toEqual(a);
    const c = make(layout, { ...options, specimenTextScaleX: options.specimenTextScaleX * 2, specimenTextScaleY: options.specimenTextScaleY * 3 });
    expect(c.badge.rx).toBeCloseTo(a.badge.rx / 2, 12); expect(c.badge.ry).toBeCloseTo(a.badge.ry / 3, 12);
    expect(c.point.rx).toBeCloseTo(a.point.rx / 2, 12); expect(c.point.ry).toBeCloseTo(a.point.ry / 3, 12);
    expect(c.badge.cx).toBe(a.badge.cx); expect(c.point.cx).toBe(a.point.cx);
  });

  it('is deterministic, does not mutate inputs, and performs no canvas or DOM query', () => {
    const query = vi.fn(() => { throw Error('Pure geometry must not query a canvas'); });
    const pure = production('dissectionHotspotMarkerGeometry', { queryDissectionNode: query, document: new Proxy({}, { get: query }) });
    const l = Object.freeze({ ...layout }), o = Object.freeze({ ...options }), before = { l: { ...l }, o: { ...o } };
    const first = pure(l, o); expect(pure(l, o)).toEqual(first); first.badge.rx = 1000;
    expect(pure(l, o)).toEqual(make(before.l, before.o)); expect({ l, o }).toEqual(before); expect(query).not.toHaveBeenCalled();
  });

  it('rejects invalid layout sizes, coordinates and scales without returning nonfinite bounds', () => {
    const empty = { badge: null, point: null };
    for (const l of [null, {}, { ...layout, width: 0 }, { ...layout, height: -1 }, { ...layout, pointX: NaN },
      { ...layout, x: Infinity }, { ...layout, pointY: '173' }]) expect(make(l, options)).toEqual(empty);
    for (const key of ['labelUiScale', 'specimenTextScaleX', 'specimenTextScaleY', 'canvasUiScale', 'zoom'])
      for (const value of [0, -1, NaN, Infinity, '1']) expect(make(layout, { ...options, [key]: value })).toEqual(empty);
    expect(make(layout)).toEqual(empty);
    const overflow = make({ ...layout, x: Number.MAX_VALUE, width: Number.MAX_VALUE }, { ...options,
      zoom: Number.MIN_VALUE, specimenTextScaleX: Number.MIN_VALUE, specimenTextScaleY: Number.MIN_VALUE });
    expect(overflow).toEqual(empty);
  });
});

describe('shared compact badge paint fidelity', () => {
  it.each([false, true])('keeps the real badge drawing at the prior phone coordinates and coarse=%s radii', coarsePointer => {
    const l = { ...layout, x: 252.837, y: 416.671, width: 25.204, height: 25.204 }, o = { ...options, coarsePointer,
      labelUiScale: 1.0277253592683988, specimenTextScaleX: 1.0530103766910133, specimenTextScaleY: 1.0297218875911291 };
    const ctx = guidanceFixture(l, o), ellipses = ctx.events.flatMap(e => e.path.filter(p => p.kind === 'ellipse'));
    expect(ellipses.length).toBeGreaterThan(0);
    const expected = make(l, o).badge, actual = ellipses[0];
    expect({ cx: actual.x, cy: actual.y, rx: actual.rx, ry: actual.ry }).toEqual(expected);
    expect(markerBox(expected)).toEqual({ x: l.x + l.width / 2 - (coarsePointer ? 12 : 10) * o.labelUiScale / o.specimenTextScaleX,
      y: l.y + l.height / 2 - (coarsePointer ? 12 : 10) * o.labelUiScale / o.specimenTextScaleY,
      width: 2 * (coarsePointer ? 12 : 10) * o.labelUiScale / o.specimenTextScaleX,
      height: 2 * (coarsePointer ? 12 : 10) * o.labelUiScale / o.specimenTextScaleY });
    expect(ctx.stack).toEqual([]);
  });

  it('does not paint a compact badge in quiz mode or for a hidden callout', () => {
    for (const [l, o] of [[layout, { ...options, quizMode: true }], [{ ...layout, showCallout: false }, options]]) {
      const ctx = guidanceFixture(l, o); expect(ctx.events.flatMap(e => e.path.filter(p => p.kind === 'ellipse'))).toEqual([]);
    }
  });

  it('paints from the returned shared badge rather than recomputing another radius or center', () => {
    const badge = { cx: 167.25, cy: 219.75, rx: 8.25, ry: 12.5 };
    const shared = vi.fn((l, o) => ({ ...make(l, o), badge })), ctx = guidanceFixture(layout, options, shared);
    expect(shared).toHaveBeenCalled(); expect(shared.mock.calls.some(([l]) => l === layout)).toBe(true);
    const actual = ctx.events.flatMap(e => e.path.filter(p => p.kind === 'ellipse'))[0]; expect(actual).toBeDefined();
    expect({ cx: actual.x, cy: actual.y, rx: actual.rx, ry: actual.ry }).toEqual(badge);
  });
});
