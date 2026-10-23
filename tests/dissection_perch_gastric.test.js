import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_dissection.js', 'utf8');
function production(name, bindings = {}) {
  const matches = [...source.matchAll(new RegExp('^([ \\t]*)(?:};[ \\t]*)?function ' + name + '\\(', 'gm'))];
  if (matches.length !== 1) throw Error('Expected one production function: ' + name);
  const match = matches[0], start = source.indexOf('function ' + name + '(', match.index);
  const ending = new RegExp('^' + match[1] + '}[ \\t]*\\r?$', 'gm'); ending.lastIndex = start;
  const end = ending.exec(source);
  if (!end) throw Error('Missing standalone function ending: ' + name);
  return new Function(...Object.keys(bindings), '"use strict"; return (' + source.slice(start, end.index + end[0].trimEnd().length) + ');')(...Object.values(bindings));
}

const dimensions = [[500, 600], [1000, 600], [320, 900]];
const stateKeys = ['globalAlpha', 'globalCompositeOperation', 'fillStyle', 'strokeStyle', 'lineWidth', 'lineCap',
  'lineJoin', 'shadowBlur', 'shadowColor', 'shadowOffsetX', 'shadowOffsetY'];
class Context {
  constructor(matrix = [1, 0, 0, 1, 0, 0]) {
    this.matrix = [...matrix]; this.path = []; this.clips = ['specimen']; this.stack = []; this.events = []; this.dash = [3, 2];
    Object.assign(this, { globalAlpha: .93, globalCompositeOperation: 'multiply', fillStyle: '#135724', strokeStyle: '#246813',
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
  rect(x, y, width, height) {
    this.moveTo(x, y); this.lineTo(x + width, y); this.lineTo(x + width, y + height); this.lineTo(x, y + height); this.closePath();
  }
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
  clip(rule = 'nonzero') {
    const path = structuredClone(this.path); this.clips.push(path); this.events.push({ operation: 'clip', path, rule });
  }
  setLineDash(dash) { this.dash = [...dash]; }
  getTransform() { const [a,b,c,d,e,f] = this.matrix; return { a,b,c,d,e,f }; }
  createRadialGradient(...args) {
    const gradient = { kind: 'radial', args, stops: [], addColorStop(position, color) { this.stops.push([position, color]); } };
    this.events.push({ operation: 'gradient', gradient }); return gradient;
  }
  createLinearGradient(...args) {
    const gradient = { kind: 'linear', args, stops: [], addColorStop(position, color) { this.stops.push([position, color]); } };
    this.events.push({ operation: 'gradient', gradient }); return gradient;
  }
  paint(operation) {
    this.events.push({ operation, path: structuredClone(this.path), clips: [...this.clips], alpha: this.globalAlpha,
      fill: this.fillStyle, stroke: this.strokeStyle, width: this.lineWidth, matrix: [...this.matrix],
      composite: this.globalCompositeOperation, cap: this.lineCap, join: this.lineJoin, dash: [...this.dash], shadow: [this.shadowBlur, this.shadowOffsetX, this.shadowOffsetY] });
  }
  fill() { this.paint('fill'); }
  stroke() { this.paint('stroke'); }
  fillRect() { this.paint('fillRect'); }
}

function samplePath(path, steps = 120) {
  const paths = []; let points, previous, start;
  for (const op of path) {
    if (op[0] === 'moveTo') {
      previous = { x: op[1], y: op[2] }; start = previous; points = [previous]; paths.push(points);
    } else if (op[0] === 'lineTo') { previous = { x: op[1], y: op[2] }; points.push(previous); }
    else if (op[0] === 'bezierCurveTo' || op[0] === 'quadraticCurveTo') {
      const a = previous;
      for (let step = 1; step <= steps; step++) {
        const t = step / steps, u = 1 - t;
        points.push(op[0] === 'bezierCurveTo'
          ? { x: u ** 3 * a.x + 3 * u * u * t * op[1] + 3 * u * t * t * op[3] + t ** 3 * op[5],
            y: u ** 3 * a.y + 3 * u * u * t * op[2] + 3 * u * t * t * op[4] + t ** 3 * op[6] }
          : { x: u * u * a.x + 2 * u * t * op[1] + t * t * op[3],
            y: u * u * a.y + 2 * u * t * op[2] + t * t * op[4] });
      }
      previous = points.at(-1);
    } else if (op[0] === 'closePath') { if (previous.x !== start.x || previous.y !== start.y) points.push(start); previous = start; }
  }
  return paths;
}
function contains(p, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i], b = points[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}
function evenOddContains(p, path) { return samplePath(path).reduce((inside, points) => inside !== contains(p, points), false); }
function distance(p, paths) {
  let result = Infinity;
  for (const points of paths) for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i], dx = b.x - a.x, dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
    result = Math.min(result, Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy));
  }
  return result;
}

const caecalGeometry = production('perchCaecalGeometry');
const geometry = production('perchGastricGeometry', { perchCaecalGeometry: caecalGeometry }), trace = production('tracePerchGastricRegion');
function tracePath(region, W, H, closed = true, matrix) { const ctx = new Context(matrix); trace(ctx, region, W, H, closed); return ctx.path; }
const paints = ctx => ctx.events.filter(e => e.operation === 'fill' || e.operation === 'stroke');
function mutatePath(ctx) { ctx.beginPath(); ctx.moveTo(-9000, -9000); ctx.lineTo(-9001, -9001); }
function fixture(overrides = {}, matrix) {
  const ctx = new Context(matrix);
  const contact = vi.fn((...args) => {
    ctx.events.push({ operation: 'contact', args, path: structuredClone(ctx.path), clips: [...ctx.clips] });
    // A callback may change its path and drawing state. Neither may contaminate the sac fill.
    ctx.translate(23, -17); ctx.scale(.3, -.5); ctx.globalAlpha = .1; ctx.globalCompositeOperation = 'destination-out';
    ctx.setLineDash([17, 11]); ctx.shadowBlur = 19; ctx.lineCap = 'square'; mutatePath(ctx);
  });
  const finish = vi.fn((...args) => {
    ctx.events.push({ operation: 'finish', args, path: structuredClone(ctx.path), clips: [...ctx.clips] });
    ctx.save(); try { ctx.clip(); mutatePath(ctx); } finally { ctx.restore(); }
  });
  const options = { width: 500, height: 600, detailed: true, lightDirection: 'left', contact, finish, ...overrides };
  const draw = production('drawPerchGastricSurface', { perchGastricGeometry: geometry, tracePerchGastricRegion: trace });
  return { ctx, options, contact, finish, draw: () => draw(ctx, options), rawDraw: draw };
}
function sharedTarget(id, W = 500, H = 600) {
  return production('paintedSmallStructurePoint', { spec: { bodyShape: 'fish' }, perchGastricGeometry: geometry,
    perchCaecalGeometry: caecalGeometry, queryDissectionNode: () => ({ _logicalW: W, _logicalH: H }) })({ id });
}
function actualTube(ctx, detailed) {
  return production('strokeAnatomicalTube', { ctx, sceneDetail: detailed, highContrastEnabled: false,
    d: { visualRealism: 'realistic' }, visualRealism: 'realistic', lightDirection: 'left' });
}
function solidPaints(ctx, name) {
  // Later surface finishes stay in their authored solid footprints. Diffuse shadows
  // are not treated as anatomical occlusion, while contact strokes are included.
  return paints(ctx).map((e, i) => ({ name: name + '-' + i, paths: samplePath(e.path), halfWidth: e.operation === 'stroke' ? e.width / 2 : 0,
    fill: e.operation === 'fill' }));
}
function actualLaterPaints(W, H, detailed) {
  const result = [], caecal = caecalGeometry(W, H), inlet = new Context(), sourceStart = source.indexOf('// The pyloric outlet joins'),
    sourceEnd = source.indexOf('drawPerchPyloricCaeca(ctx,', sourceStart);
  if (sourceStart < 0 || sourceEnd < sourceStart) throw Error('Missing actual caecal inlet paint');
  new Function('ctx', 'W', 'H', 'perchCaecalGeometry', 'tracePerchCaecalRegion', 'strokeAnatomicalTube', 'fishAccessible',
    source.slice(sourceStart, sourceEnd))(inlet, W, H, caecalGeometry, production('tracePerchCaecalRegion'), actualTube(inlet, detailed), false);
  result.push(...solidPaints(inlet, 'inlet'));
  const caeca = new Context();
  production('drawPerchPyloricCaeca', { perchCaecalGeometry: caecalGeometry, tracePerchCaecalRegion: production('tracePerchCaecalRegion') })(caeca,
    { width: W, height: H, detailed, lightDirection: 'left', moisture: 76, lightIntensity: 68, condition: 'standard', strokeTeachingTube: actualTube(caeca, detailed) });
  result.push(...solidPaints(caeca, 'caeca'));
  const intestine = new Context(), bowelStart = source.indexOf('// Intestine loops compactly'), bowelEnd = source.indexOf('// Four branchial arches carry', bowelStart);
  if (bowelStart < 0 || bowelEnd < bowelStart) throw Error('Missing actual perch intestine');
  new Function('ctx', 'W', 'H', 'cx', 'cy', 'fishAccessible', 'strokeAnatomicalTube', source.slice(bowelStart, bowelEnd))(
    intestine, W, H, W * .5, H * .45, false, actualTube(intestine, detailed));
  result.push(...solidPaints(intestine, 'intestine'));
  const gills = new Context(), gill = production('drawPerchGillArch', { ctx: gills, W, H, cx: W * .5, cy: H * .45,
    sceneDetail: detailed, fishAccessible: false, highContrastEnabled: false });
  for (let i = 0; i < 4; i++) gill(i);
  result.push(...solidPaints(gills, 'gills'));
  const cardiac = new Context();
  production('drawPerchCardiacComplex', { perchCardiacGeometry: production('perchCardiacGeometry'), tracePerchHeartRegion: production('tracePerchHeartRegion') })(cardiac,
    { width: W, height: H, detailed, accessible: false, lightDirection: 'left', moisture: 76, lightIntensity: 68, condition: 'standard' });
  result.push(...solidPaints(cardiac, 'cardiac'));
  const spleen = new Context(), spleenStart = source.indexOf('// Small spleen sits beside the stomach'), spleenEnd = source.indexOf('ctx.restore();', spleenStart);
  if (spleenStart < 0 || spleenEnd < spleenStart) throw Error('Missing actual perch spleen');
  new Function('ctx', 'W', 'H', 'cx', 'cy', 'fishAccessible', source.slice(spleenStart, spleenEnd))(spleen, W, H, W * .5, H * .45, false);
  result.push(...solidPaints(spleen, 'spleen'));
  for (const ctx of [inlet, caeca, intestine, gills, cardiac, spleen]) expect(ctx.stack).toEqual([]);
  expect(caecal.caeca).toHaveLength(3); return result;
}

describe('registered perch gastric sac and short pyloric branch', () => {
  it.each(dimensions)('keeps a broad closed sac, blunt caudal fullness and restrained relief inside the actual coelom at %s by %s', (W, H) => {
    const g = geometry(W, H), path = tracePath(g.region, W, H), points = samplePath(path)[0], ctx = new Context();
    production('tracePerchCoelom', { ctx, W, H, cx: W * .5, cy: H * .45 })(ctx);
    const cavity = samplePath(ctx.path);
    expect(g.region.curves).toHaveLength(9); expect(g.region.curves.at(-1)[2]).toEqual(g.region.start);
    expect(path.filter(op => op[0] === 'moveTo')).toHaveLength(1); expect(path.at(-1)).toEqual(['closePath']);
    expect(g.bounds.minX).toBeGreaterThanOrEqual(.43); expect(g.bounds.maxX).toBeLessThanOrEqual(.515);
    expect(g.bounds.minY).toBeGreaterThanOrEqual(.47); expect(g.bounds.maxY).toBeLessThanOrEqual(.54);
    expect(Math.max(...points.map(p => p.y / H)) - g.pyloricRoot.y).toBeGreaterThan(.015);
    for (const p of points) {
      expect(contains(p, cavity[0])).toBe(true); expect(distance(p, cavity)).toBeGreaterThan(10);
      expect(p.x / W).toBeGreaterThanOrEqual(g.bounds.minX - 1e-12); expect(p.x / W).toBeLessThanOrEqual(g.bounds.maxX + 1e-12);
      expect(p.y / H).toBeGreaterThanOrEqual(g.bounds.minY - 1e-12); expect(p.y / H).toBeLessThanOrEqual(g.bounds.maxY + 1e-12);
    }
    expect(g.center.x).toBeCloseTo((g.bounds.minX + g.bounds.maxX) / 2, 12); expect(g.center.y).toBeCloseTo((g.bounds.minY + g.bounds.maxY) / 2, 12);
    expect(g.extent.x).toBeCloseTo((g.bounds.maxX - g.bounds.minX) / 2, 12); expect(g.extent.y).toBeCloseTo((g.bounds.maxY - g.bounds.minY) / 2, 12);
    expect(g.surfaceCreases).toHaveLength(2);
    for (const crease of g.surfaceCreases) {
      const course = tracePath(crease, W, H, false); expect(course.some(op => op[0] === 'closePath')).toBe(false);
      for (const p of samplePath(course)[0]) expect(contains(p, points)).toBe(true);
    }
    const target = { x: g.target.x * W, y: g.target.y * H }; expect(contains(target, points)).toBe(true); expect(distance(target, [points])).toBeGreaterThan(6);
  });

  it.each(dimensions)('joins the actual caecal inlet with room for the full physical tube shell at %s by %s', (W, H) => {
    const g = geometry(W, H), caecal = caecalGeometry(W, H), own = samplePath(tracePath(g.region, W, H));
    expect(g.pyloricRoot).toEqual(caecal.inlet.start);
    const root = { x: g.pyloricRoot.x * W, y: g.pyloricRoot.y * H }, ctx = new Context();
    production('tracePerchCaecalRegion')(ctx, caecal.inlet, W, H, false); actualTube(ctx, true)(g.inletWidth, '#b98', '#edc', '#765');
    const radius = Math.max(...paints(ctx).map(e => e.width)) / 2;
    expect(contains(root, own[0])).toBe(true); expect(distance(root, own) - radius).toBeGreaterThan(.225);
    const inlet = samplePath(ctx.path)[0]; expect(contains(inlet.at(-1), own[0])).toBe(false);
    let exits = 0; for (let i = 1; i < inlet.length; i++) if (contains(inlet[i], own[0]) !== contains(inlet[i - 1], own[0])) exits++;
    expect(exits).toBe(1); expect(caecal.inlet.curves.at(-1)[2]).toEqual(caecal.caeca[0].centerline.start);
  });

  it.each(dimensions)('keeps its target exposed after actual inlet, caeca, intestine, gill, cardiac and splenic paint at %s by %s', (W, H) => {
    const p = { x: geometry(W, H).target.x * W, y: geometry(W, H).target.y * H };
    for (const detailed of [false, true]) {
      const later = actualLaterPaints(W, H, detailed);
      for (const prefix of ['inlet', 'caeca', 'intestine', 'gills', 'cardiac', 'spleen']) expect(later.some(e => e.name.startsWith(prefix))).toBe(true);
      for (const e of later) {
        if (e.fill) expect(e.paths.some(points => contains(p, points)), e.name).toBe(false);
        expect(distance(p, e.paths) - e.halfWidth, e.name).toBeGreaterThan(3);
      }
    }
    expect(sharedTarget('stomach_f', W, H)).toEqual(geometry(W, H).target);
  });

  it.each(dimensions)('leaves actual liver and caecal inspection targets clear at %s by %s', (W, H) => {
    const own = samplePath(tracePath(geometry(W, H).region, W, H));
    for (const id of ['liver_f', 'pyloric_ceca']) {
      const target = sharedTarget(id, W, H), p = { x: target.x * W, y: target.y * H };
      expect(contains(p, own[0]), id).toBe(false); expect(distance(p, own) - .225, id).toBeGreaterThan(10);
    }
  });

  it('registers its shared painted target before specimen jitter or independent view offsets', () => {
    for (const mode of ['guided', 'realistic', 'accessible']) for (const view of ['dorsal', 'ventral', 'lateral', 'internal']) {
      const bindings = { spec: { bodyShape: 'fish' }, perchGastricGeometry: geometry };
      const varied = production('variedOrganPoint', { paintedSmallStructurePoint: production('paintedSmallStructurePoint', bindings),
        d: { visualRealism: mode, anatomicalView: view }, visualRealism: mode,
        specimenVariationValue: () => { throw Error('A registered sac target must not jitter'); },
        viewSpecificOrganPoint: () => { throw Error('A registered sac target must not get generic offsets'); } });
      expect(varied({ id: 'stomach_f', x: .46, y: .5 })).toEqual(geometry().target);
    }
  });

  it('builds fresh finite anatomy and rejects nonfinite or collapsed inputs before touching the context', () => {
    const first = geometry(), saved = structuredClone(first); expect(geometry(500, 600)).toEqual(first);
    first.target.x = 9; first.pyloricRoot.y = 9; first.region.curves[0][0].x = 9; first.surfaceCreases[0].start.y = 9; expect(geometry()).toEqual(saved);
    for (const [W, H] of [[0, 600], [.99, 600], [500, .5], [500, -1], [NaN, 600], [500, Infinity], ['bad', 600]]) expect(geometry(W, H)).toBeNull();
    for (const [W, H] of [[1, 10000], [10000, 1]]) {
      const g = geometry(W, H); expect(g.pyloricHalfY).toBeGreaterThanOrEqual(.0045); expect(g.pyloricHalfY).toBeLessThanOrEqual(.0105);
      expect([g.region.start, ...g.region.curves.flat()].every(p => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true);
    }
    const ctx = new Context(); for (const region of [null, {}, { start: {} }]) expect(trace(ctx, region, 500, 600)).toBe(false);
    expect(trace(null, saved.region, 500, 600)).toBe(false); expect(ctx.path).toEqual([]); expect(ctx.events).toEqual([]);
  });
});


describe('restrained whole-surface gastric rendering', () => {
  it.each(dimensions)('re-traces the complete gland after contact and clips every crease and material finish at %s by %s', (width, height) => {
    const f = fixture({ width, height }), before = f.ctx.state(), g = geometry(width, height), expected = tracePath(g.region, width, height);
    expect(f.draw()).toBe(true); expect(f.contact).toHaveBeenCalledTimes(1); expect(f.finish).toHaveBeenCalledTimes(1);
    const painting = paints(f.ctx); expect(painting.map(e => e.operation)).toEqual(['fill', ...Array(5).fill('stroke')]);
    expect(painting[0].path).toEqual(expected); expect(painting[1].path).toEqual(expected);
    expect(painting[0].fill.kind).toBe('linear'); expect(painting[0].fill.stops).toHaveLength(4);
    const contact = f.ctx.events.find(e => e.operation === 'contact'), finish = f.ctx.events.find(e => e.operation === 'finish');
    expect(contact.path).toEqual(expected); expect(contact.args).toEqual([g.extent.x * width, g.extent.y * height]);
    expect(contact.clips).toEqual(['specimen']);
    expect(finish.path).toEqual(expected); expect(finish.clips).toEqual(['specimen', expected]);
    expect(finish.args).toEqual([g.center.x * width, g.center.y * height, g.extent.x * width, g.extent.y * height, 'serosa', 'perch-stomach']);
    const clips = f.ctx.events.filter(e => e.operation === 'clip'); expect(clips).toHaveLength(2);
    expect(clips.every(e => JSON.stringify(e.path) === JSON.stringify(expected))).toBe(true);
    for (const e of painting.slice(2)) {
      expect(e.clips).toEqual(['specimen', expected]); expect(e.path.at(-1)[0]).not.toBe('closePath');
      expect(e.path.filter(op => op[0] === 'bezierCurveTo')).toHaveLength(1);
      expect(e.path.filter(op => op[0] === 'moveTo')).toHaveLength(1);
      expect(e.width).toBeLessThanOrEqual(.32); expect(e.cap).toBe('round'); expect(e.join).toBe('round');
      expect(Number(/,([\d.]+)\)$/.exec(e.stroke)[1])).toBeLessThanOrEqual(.2);
    }
    expect(painting.every(e => e.alpha === before.globalAlpha && e.composite === 'source-over')).toBe(true);
    for (const e of painting) { expect(e.dash).toEqual([]); expect(e.shadow).toEqual([0, 0, 0]); expect(e.cap).toBe('round'); expect(e.join).toBe('round'); }
    expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
  });

  it.each(dimensions)('retains the complete gland with two flat paints and no effects in clarity modes at %s by %s', (width, height) => {
    const f = fixture({ width, height, detailed: false }), before = f.ctx.state(); expect(f.draw()).toBe(true);
    const painting = paints(f.ctx), expected = tracePath(geometry(width, height).region, width, height);
    expect(painting.map(e => e.operation)).toEqual(['fill', 'stroke']); expect(typeof painting[0].fill).toBe('string');
    expect(painting.every(e => JSON.stringify(e.path) === JSON.stringify(expected))).toBe(true);
    expect(f.contact).not.toHaveBeenCalled(); expect(f.finish).not.toHaveBeenCalled();
    expect(f.ctx.events.some(e => e.operation === 'gradient' || e.operation === 'clip')).toBe(false);
    for (const e of painting) { expect(e.composite).toBe('source-over'); expect(e.dash).toEqual([]); expect(e.shadow).toEqual([0, 0, 0]); }
    expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
  });

  it.each(['left', 'right', 'overhead', 'raking', 'unknown'])('changes light and crease relief without moving the anatomy under %s illumination', lightDirection => {
    const f = fixture({ lightDirection }); f.draw();
    const painting = paints(f.ctx), gradient = painting[0].fill, expected = tracePath(geometry().region, 500, 600);
    expect(painting.slice(0, 2).every(e => JSON.stringify(e.path) === JSON.stringify(expected))).toBe(true);
    expect(gradient.stops.map(s => s[0])).toEqual([0, .35, .75, 1]);
    const dx = gradient.args[0] - gradient.args[2], dy = gradient.args[1] - gradient.args[3];
    if (lightDirection === 'right') expect(dx).toBeGreaterThan(0); else expect(dx).toBeLessThan(0);
    if (lightDirection === 'raking') expect(dy).toBeGreaterThan(0); else expect(dy).toBeLessThan(0);
    expect(geometry().target).toEqual(sharedTarget('stomach_f'));
    const dark = painting[2].path[0], light = painting[3].path[0];
    expect(Math.hypot(light[1] - dark[1], light[2] - dark[2])).toBeCloseTo(.22, 10);
  });

  it.each([.93, 1])('preserves parent transforms, clipping and inherited tissue opacity %s', alpha => {
    const f = fixture({}, [-2.7, .2, .3, 3, 800, -175]); f.ctx.globalAlpha = alpha; const before = f.ctx.state(); f.draw();
    const expected = tracePath(geometry().region, 500, 600, true, before.matrix);
    expect(paints(f.ctx).slice(0, 2).every(e => JSON.stringify(e.path) === JSON.stringify(expected))).toBe(true);
    expect(paints(f.ctx).every(e => e.alpha === alpha)).toBe(true);
    expect(f.ctx.events.find(e => e.operation === 'finish').clips).toEqual(['specimen', expected]);
    expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
  });

  it.each(['contact', 'gradient', 'fill', 'border', 'clip', 'crease', 'translate', 'finish'])('restores every parent state after an injected %s failure', location => {
    const f = fixture(), before = f.ctx.state(), fail = () => { throw Error('Injected gastric error'); };
    if (location === 'contact') f.options.contact = fail;
    else if (location === 'finish') f.options.finish = fail;
    else if (location === 'gradient') f.ctx.createLinearGradient = fail;
    else if (location === 'fill') f.ctx.fill = fail;
    else if (location === 'clip') f.ctx.clip = fail;
    else if (location === 'translate') { f.options.contact = null; f.ctx.translate = fail; }
    else if (location === 'border') f.ctx.stroke = fail;
    else { const stroke = f.ctx.stroke.bind(f.ctx); let calls = 0; f.ctx.stroke = () => { if (++calls === 2) fail(); stroke(); }; }
    expect(f.draw).toThrow('Injected gastric error'); expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
  });

  it('safely omits optional effects and does no work for invalid rendering arguments', () => {
    const f = fixture({ contact: null, finish: null }); expect(f.draw()).toBe(true); expect(paints(f.ctx)).toHaveLength(6); expect(f.ctx.stack).toEqual([]);
    for (const input of [{ width: NaN }, { height: Infinity }, { width: 0 }, { height: .5 }, { width: undefined }]) {
      const invalid = fixture(input), before = invalid.ctx.state(); expect(invalid.draw()).toBe(false);
      expect(invalid.ctx.events).toEqual([]); expect(invalid.ctx.state()).toEqual(before); expect(invalid.ctx.stack).toEqual([]);
    }
    expect(f.rawDraw(null, f.options)).toBe(false); expect(f.rawDraw(new Context())).toBe(false);
    expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_dissection.js', 'utf8')).toBe(source);
  });

  it('retains the existing paint order and shared detail gate in the actual organ renderer', () => {
    const start = source.lastIndexOf('drawPerchGastricSurface(ctx,'), end = source.indexOf('});', start) + 3;
    expect(start).toBeGreaterThan(source.indexOf('// Three overlapping liver lobes occupy'));
    expect(end).toBeLessThan(source.indexOf('// The pyloric outlet joins', start));
    const contact = () => {}, finish = () => {}, ctx = new Context(), calls = [];
    for (const sceneDetail of [true, false]) for (const fishAccessible of [true, false]) for (const highContrastEnabled of [true, false]) {
      new Function('drawPerchGastricSurface', 'ctx', 'W', 'H', 'sceneDetail', 'fishAccessible', 'highContrastEnabled',
        'lightDirection', 'paintCurrentOrganContact', 'finishCurrentTissuePath', source.slice(start, end))(
        (context, options) => calls.push({ context, options }), ctx, 500, 600, sceneDetail, fishAccessible, highContrastEnabled, 'raking', contact, finish);
      expect(calls.at(-1)).toEqual({ context: ctx, options: { width: 500, height: 600,
        detailed: sceneDetail && !fishAccessible && !highContrastEnabled, lightDirection: 'raking', contact, finish } });
    }
  });
});
