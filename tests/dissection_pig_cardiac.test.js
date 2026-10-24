import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_dissection.js', 'utf8');
function production(name, bindings = {}) {
  const matches = [...source.matchAll(new RegExp('^([ \\t]*)function ' + name + '\\(', 'gm'))];
  if (matches.length !== 1) throw Error('Expected one production function: ' + name);
  const match = matches[0], start = match.index + match[1].length;
  const ending = new RegExp('^' + match[1] + '}[ \\t]*\\r?$', 'gm');
  ending.lastIndex = start;
  const end = ending.exec(source);
  if (!end) throw Error('Missing standalone function ending: ' + name);
  return new Function(...Object.keys(bindings), '"use strict"; return (' + source.slice(start, end.index + end[0].trimEnd().length) + ');')(...Object.values(bindings));
}

const dimensions = [[500, 600], [1000, 600], [320, 900]];
const stateKeys = ['globalAlpha', 'globalCompositeOperation', 'fillStyle', 'strokeStyle', 'lineWidth', 'lineCap',
  'lineJoin', 'shadowBlur', 'shadowColor', 'shadowOffsetX', 'shadowOffsetY'];
class Context {
  constructor(matrix = [1, 0, 0, 1, 0, 0]) {
    this.matrix = [...matrix]; this.path = []; this.clips = ['body']; this.stack = []; this.events = []; this.dash = [4, 2];
    Object.assign(this, { globalAlpha: .84, globalCompositeOperation: 'source-over', fillStyle: '#135724', strokeStyle: '#246813',
      lineWidth: 2.3, lineCap: 'butt', lineJoin: 'miter', shadowBlur: 2, shadowColor: '#151617', shadowOffsetX: -1, shadowOffsetY: 2 });
  }
  state() { return { matrix: [...this.matrix], clips: [...this.clips], dash: [...this.dash], ...Object.fromEntries(stateKeys.map(k => [k, this[k]])) }; }
  save() { this.stack.push(this.state()); }
  restore() { if (!this.stack.length) throw Error('Unbalanced restore'); Object.assign(this, this.stack.pop()); }
  point(x, y) { const [a, b, c, d, e, f] = this.matrix; return [a * x + c * y + e, b * x + d * y + f]; }
  translate(x, y) { const p = this.point(x, y); this.matrix[4] = p[0]; this.matrix[5] = p[1]; }
  scale(x, y) { this.matrix[0] *= x; this.matrix[1] *= x; this.matrix[2] *= y; this.matrix[3] *= y; }
  rotate(angle) {
    const [a, b, c, d, e, f] = this.matrix, co = Math.cos(angle), si = Math.sin(angle);
    this.matrix = [a * co + c * si, b * co + d * si, c * co - a * si, d * co - b * si, e, f];
  }
  beginPath() { this.path = []; }
  moveTo(x, y) { this.path.push(['moveTo', ...this.point(x, y)]); }
  lineTo(x, y) { this.path.push(['lineTo', ...this.point(x, y)]); }
  bezierCurveTo(...c) { this.path.push(['bezierCurveTo', ...this.point(c[0], c[1]), ...this.point(c[2], c[3]), ...this.point(c[4], c[5])]); }
  quadraticCurveTo(...c) { this.path.push(['quadraticCurveTo', ...this.point(c[0], c[1]), ...this.point(c[2], c[3])]); }
  ellipse(x, y, rx, ry, rotation, start, end) {
    for (let i = 0; i <= 160; i++) {
      const angle = start + (end - start) * i / 160, u = Math.cos(angle) * rx, v = Math.sin(angle) * ry;
      const px = x + u * Math.cos(rotation) - v * Math.sin(rotation), py = y + u * Math.sin(rotation) + v * Math.cos(rotation);
      if (i === 0) this.moveTo(px, py); else this.lineTo(px, py);
    }
  }
  closePath() { this.path.push(['closePath']); }
  clip() { const path = structuredClone(this.path); this.clips.push(path); this.events.push({ operation: 'clip', path }); }
  setLineDash(dash) { this.dash = [...dash]; }
  createLinearGradient(...args) {
    const gradient = { kind: 'linear', args, stops: [], addColorStop(position, color) { this.stops.push([position, color]); } };
    this.events.push({ operation: 'gradient', gradient }); return gradient;
  }
  paint(operation) {
    this.events.push({ operation, path: structuredClone(this.path), clips: [...this.clips], alpha: this.globalAlpha,
      fill: this.fillStyle, stroke: this.strokeStyle, width: this.lineWidth, cap: this.lineCap, join: this.lineJoin,
      matrix: [...this.matrix], composite: this.globalCompositeOperation });
  }
  fill() { this.paint('fill'); }
  stroke() { this.paint('stroke'); }
}

function polygon(path) {
  const points = []; let previous;
  for (const op of path) {
    if (op[0] === 'moveTo' || op[0] === 'lineTo') { previous = { x: op[1], y: op[2] }; points.push(previous); }
    else if (op[0] === 'bezierCurveTo') {
      if (!previous) throw Error('Curve without a starting point');
      const a = previous;
      for (let step = 1; step <= 80; step++) {
        const t = step / 80, u = 1 - t;
        points.push({ x: u ** 3 * a.x + 3 * u * u * t * op[1] + 3 * u * t * t * op[3] + t ** 3 * op[5],
          y: u ** 3 * a.y + 3 * u * u * t * op[2] + 3 * u * t * t * op[4] + t ** 3 * op[6] });
      }
      previous = { x: op[5], y: op[6] };
    } else if (op[0] === 'quadraticCurveTo') {
      if (!previous) throw Error('Curve without a starting point');
      const a = previous;
      for (let step = 1; step <= 80; step++) {
        const t = step / 80, u = 1 - t;
        points.push({ x: u * u * a.x + 2 * u * t * op[1] + t * t * op[3],
          y: u * u * a.y + 2 * u * t * op[2] + t * t * op[4] });
      }
      previous = { x: op[3], y: op[4] };
    }
  }
  return points;
}
function contains(p, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i], b = points[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
function clearance(p, boundary) {
  return Math.min(...boundary.map((a, i) => {
    const b = boundary[(i + 1) % boundary.length], dx = b.x - a.x, dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
  }));
}
const geometry = production('pigCardiacGeometry'), trace = production('tracePigCardiacRegion');
const surfaces = g => [g.ventricle, ...g.appendages];
function tracePath(region, W, H, closed = true, matrix) { const ctx = new Context(matrix); trace(ctx, region, W, H, closed); return ctx.path; }
const paints = ctx => ctx.events.filter(e => e.operation === 'fill' || e.operation === 'stroke');
function fixture(overrides = {}, matrix) {
  const ctx = new Context(matrix), contact = vi.fn((...args) => ctx.events.push({ operation: 'contact', args, path: structuredClone(ctx.path) }));
  const finish = vi.fn((...args) => {
    ctx.events.push({ operation: 'finish', args, path: structuredClone(ctx.path) });
    // The real shared material finish creates grain paths. A later clip must re-trace its own boundary.
    ctx.beginPath(); ctx.moveTo(-9000, -9000); ctx.lineTo(-9001, -9001);
  });
  const options = { width: 500, height: 600, detailed: true, lightDirection: 'left', contact, finish, ...overrides };
  const draw = production('drawPigCardiacComplex', { pigCardiacGeometry: geometry, tracePigCardiacRegion: trace });
  return { ctx, options, contact, finish, draw: () => draw(ctx, options), rawDraw: draw };
}

function actualLaterOccluders(W, H, detailed) {
  const cx = W * .5, cy = H * .45, diaphragm = new Context();
  const start = source.indexOf('// The diaphragm forms a curved muscular boundary between thorax and abdomen.');
  const end = source.indexOf('var diaphragmSurface', start);
  if (start < 0 || end < start) throw Error('Missing actual diaphragm path');
  new Function('ctx', 'W', 'H', 'cx', 'cy', source.slice(start, end))(diaphragm, W, H, cx, cy);
  const lobesMatch = /var pigLiverLobes = (\[[\s\S]*?\]);/.exec(source);
  if (!lobesMatch) throw Error('Missing actual pig liver layout');
  const lobes = new Function('return (' + lobesMatch[1] + ');')();
  const liver = lobes.map((lobe, i) => {
    const ctx = new Context();
    const visceral = production('traceVisceralLobe', { ctx });
    const hepatic = production('traceHepaticLobe', { ctx, sceneDetail: detailed, highContrastEnabled: false,
      d: { visualRealism: 'realistic' }, visualRealism: 'realistic', traceVisceralLobe: visceral });
    hepatic(cx + W * lobe[0], cy + H * lobe[1], W * lobe[2], H * lobe[3], lobe[4],
      i === 0 ? 'broad' : (i === 4 ? 'swept' : 'tongue'), i % 2 ? -1 : 1);
    return polygon(ctx.path);
  });
  return [polygon(diaphragm.path), ...liver];
}

describe('registered external fetal pig cardiac anatomy', () => {
  it.each(dimensions)('keeps three closed surfaces bounded and attached inside the actual coelom at %s by %s', (W, H) => {
    const g = geometry(), cavity = new Context();
    production('tracePigCoelom', { ctx: cavity, W, H, cx: W * .5, cy: H * .45 })(cavity);
    const boundary = polygon(cavity.path), ventricular = polygon(tracePath(g.ventricle, W, H));
    expect(surfaces(g)).toHaveLength(3);
    for (const region of surfaces(g)) {
      expect(region.curves.at(-1)[2]).toEqual(region.start);
      expect(region.curves.length).toBeGreaterThanOrEqual(3); expect(region.curves.length).toBeLessThanOrEqual(6);
      const path = tracePath(region, W, H), points = polygon(path);
      expect(path.at(-1)).toEqual(['closePath']);
      expect(contains({ x: region.center.x * W, y: region.center.y * H }, points)).toBe(true);
      for (const p of points) {
        expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
        expect(contains(p, boundary)).toBe(true);
        expect(p.x / W).toBeGreaterThanOrEqual(region.center.x - region.extent.x - 1e-10);
        expect(p.x / W).toBeLessThanOrEqual(region.center.x + region.extent.x + 1e-10);
        expect(p.y / H).toBeGreaterThanOrEqual(region.center.y - region.extent.y - 1e-10);
        expect(p.y / H).toBeLessThanOrEqual(region.center.y + region.extent.y + 1e-10);
      }
      if (region !== g.ventricle) expect(points.some(p => contains(p, ventricular))).toBe(true);
    }
  });

  it.each(dimensions)('keeps the inspection target on exposed ventricle after actual liver and diaphragm paint at %s by %s', (W, H) => {
    const g = geometry(), target = { x: g.target.x * W, y: g.target.y * H };
    expect(g.target).toEqual({ x: .432, y: .450 });
    const ventricle = polygon(tracePath(g.ventricle, W, H));
    expect(contains(target, ventricle)).toBe(true); expect(clearance(target, ventricle)).toBeGreaterThan(3);
    for (const appendage of g.appendages) expect(contains(target, polygon(tracePath(appendage, W, H)))).toBe(false);
    for (const detailed of [false, true]) for (const occluder of actualLaterOccluders(W, H, detailed)) {
      expect(occluder.length).toBeGreaterThan(100);
      expect(contains(target, occluder)).toBe(false); expect(clearance(target, occluder)).toBeGreaterThan(2);
    }
  });

  it('keeps the shallow coronary course on the closed ventricular surface', () => {
    const g = geometry(), ventricle = polygon(tracePath(g.ventricle, 500, 600));
    const course = tracePath(g.coronaryCourse, 500, 600, false);
    expect(course.some(op => op[0] === 'closePath')).toBe(false);
    for (const p of polygon(course)) expect(contains(p, ventricle)).toBe(true);
  });

  it('builds independent deterministic anatomy without retained frame mutations', () => {
    const first = geometry(), saved = structuredClone(first);
    expect(geometry()).toEqual(saved);
    first.target.x = 100; first.ventricle.curves[0][0].x = 100; first.appendages[0].center.y = -100;
    expect(geometry()).toEqual(saved);
  });

  it('does no path work for missing regions or context', () => {
    const ctx = new Context(); expect(trace(null, geometry().ventricle, 500, 600)).toBe(false);
    for (const region of [null, {}, { start: {} }]) expect(trace(ctx, region, 500, 600)).toBe(false);
    expect(ctx.path).toEqual([]); expect(ctx.events).toEqual([]);
  });
});

describe('bounded fetal pig epicardial rendering', () => {
  it.each(dimensions)('paints the exact three surfaces with inherited opacity and material callbacks at %s by %s', (width, height) => {
    const f = fixture({ width, height }), before = f.ctx.state(), regions = surfaces(geometry());
    expect(f.draw()).toBe(true); expect(f.contact).toHaveBeenCalledTimes(3); expect(f.finish).toHaveBeenCalledTimes(3);
    const painting = paints(f.ctx), fills = painting.filter(e => e.operation === 'fill');
    expect(fills).toHaveLength(3); expect(painting).toHaveLength(9);
    regions.forEach((region, i) => {
      const expected = tracePath(region, width, height);
      expect(fills[i].path).toEqual(expected); expect(fills[i].fill.kind).toBe('linear');
      expect(fills[i].fill.stops).toHaveLength(4);
      expect(f.ctx.events.filter(e => e.operation === 'contact')[i].path).toEqual(expected);
      expect(f.contact.mock.calls[i]).toEqual([region.extent.x * width, region.extent.y * height]);
      expect(f.finish.mock.calls[i]).toEqual([region.center.x * width, region.center.y * height,
        region.extent.x * width, region.extent.y * height, 'serosa', 'pig-heart-' + region.key]);
      expect(f.ctx.events.filter(e => e.operation === 'finish')[i].path).toEqual(expected);
    });
    expect(painting.every(e => e.alpha === before.globalAlpha && e.composite === before.globalCompositeOperation)).toBe(true);
    expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
  });

  it.each(dimensions)('retains three flat closed surfaces without effects in teaching fallbacks at %s by %s', (width, height) => {
    const f = fixture({ width, height, detailed: false }), before = f.ctx.state(); expect(f.draw()).toBe(true);
    const painting = paints(f.ctx); expect(painting).toHaveLength(6);
    expect(f.contact).not.toHaveBeenCalled(); expect(f.finish).not.toHaveBeenCalled();
    expect(f.ctx.events.some(e => e.operation === 'gradient' || e.operation === 'clip')).toBe(false);
    surfaces(geometry()).forEach((region, i) => {
      const expected = tracePath(region, width, height);
      expect(painting[i * 2].operation).toBe('fill'); expect(typeof painting[i * 2].fill).toBe('string');
      expect(painting[i * 2 + 1].operation).toBe('stroke');
      expect(painting[i * 2].path).toEqual(expected); expect(painting[i * 2 + 1].path).toEqual(expected);
    });
    expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
  });

  it('re-traces the ventricle for the coronary clip after a material finish replaces the current path', () => {
    const f = fixture(); f.draw();
    const clips = f.ctx.events.filter(e => e.operation === 'clip'); expect(clips).toHaveLength(1);
    expect(clips[0].path).toEqual(tracePath(geometry().ventricle, 500, 600));
    const grooves = paints(f.ctx).filter(e => e.clips.length === 2);
    expect(grooves).toHaveLength(3);
    expect(grooves.every(e => e.operation === 'stroke' && e.clips.at(-1) === clips[0].path && e.cap === 'round' && e.join === 'round')).toBe(true);
    expect(grooves[0].path).toEqual(tracePath(geometry().coronaryCourse, 500, 600, false));
    expect(grooves[1].path).toEqual(grooves[0].path);
    expect(grooves[2].path).not.toEqual(grooves[0].path);
    expect(grooves.every(e => e.path.every(op => op.slice(1).every(Number.isFinite)))).toBe(true);
  });

  it('moves the light-facing gradient while keeping gross anatomy and the target fixed', () => {
    const left = fixture({ lightDirection: 'left' }), right = fixture({ lightDirection: 'right' }); left.draw(); right.draw();
    const leftFills = paints(left.ctx).filter(e => e.operation === 'fill'), rightFills = paints(right.ctx).filter(e => e.operation === 'fill');
    expect(leftFills.map(e => e.path)).toEqual(rightFills.map(e => e.path));
    leftFills.forEach((e, i) => {
      expect(e.fill.args[0]).toBeLessThan(e.fill.args[2]); expect(rightFills[i].fill.args[0]).toBeGreaterThan(rightFills[i].fill.args[2]);
      expect(e.fill.stops).toEqual(rightFills[i].fill.stops);
    });
  });

  it('preserves parent affine transform, clips, dash, and opacity during mirrored rendering', () => {
    const f = fixture({}, [-3, .2, .3, 2.7, 800, -175]), before = f.ctx.state(); f.draw();
    const fills = paints(f.ctx).filter(e => e.operation === 'fill');
    surfaces(geometry()).forEach((region, i) => expect(fills[i].path).toEqual(tracePath(region, 500, 600, true, before.matrix)));
    expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
  });

  it.each(['contact', 'finish', 'gradient', 'fill', 'groove'])('restores all parent state after an injected %s failure', location => {
    const f = fixture(), before = f.ctx.state(), fail = () => { throw Error('Injected cardiac error'); };
    if (location === 'contact') f.options.contact = fail;
    else if (location === 'finish') f.options.finish = fail;
    else if (location === 'gradient') f.ctx.createLinearGradient = fail;
    else if (location === 'fill') f.ctx.fill = fail;
    else { const original = f.ctx.stroke.bind(f.ctx); f.ctx.stroke = () => { if (f.ctx.clips.length === 2) fail(); original(); }; }
    expect(f.draw).toThrow('Injected cardiac error'); expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
  });

  it('renders safely without optional material callbacks', () => {
    const f = fixture({ contact: null, finish: null }); expect(f.draw()).toBe(true);
    expect(paints(f.ctx).filter(e => e.operation === 'fill')).toHaveLength(3);
    expect(f.ctx.stack).toEqual([]);
  });

  it('rejects invalid canvas dimensions without touching context and keeps the desktop copy identical', () => {
    for (const input of [{ width: NaN }, { height: Infinity }, { width: 0 }, { height: -1 }, { width: undefined }]) {
      const f = fixture(input), before = f.ctx.state(); expect(f.draw()).toBe(false);
      expect(f.ctx.state()).toEqual(before); expect(f.ctx.events).toEqual([]); expect(f.ctx.stack).toEqual([]);
    }
    const f = fixture(); expect(f.rawDraw(null, f.options)).toBe(false);
    expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_dissection.js', 'utf8')).toBe(source);
  });
});
