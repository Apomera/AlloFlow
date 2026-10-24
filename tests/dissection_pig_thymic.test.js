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
      composite: this.globalCompositeOperation, cap: this.lineCap, join: this.lineJoin });
  }
  fill() { this.paint('fill'); }
  stroke() { this.paint('stroke'); }
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

const geometry = production('pigThymicGeometry'), trace = production('tracePigThymicRegion');
function tracePath(region, W, H, closed = true, matrix) {
  const ctx = new Context(matrix); trace(ctx, region, W, H, closed); return ctx.path;
}
const paints = ctx => ctx.events.filter(e => e.operation === 'fill' || e.operation === 'stroke');
function mutatePath(ctx) { ctx.beginPath(); ctx.moveTo(-9000, -9000); ctx.lineTo(-9001, -9001); }
function fixture(overrides = {}, matrix) {
  const ctx = new Context(matrix);
  const contact = vi.fn((...args) => {
    ctx.events.push({ operation: 'contact', args, path: structuredClone(ctx.path), clips: [...ctx.clips] }); mutatePath(ctx);
  });
  const finish = vi.fn((...args) => {
    ctx.events.push({ operation: 'finish', args, path: structuredClone(ctx.path), clips: [...ctx.clips] });
    ctx.save(); try { ctx.clip(); mutatePath(ctx); } finally { ctx.restore(); }
  });
  const options = { width: 500, height: 600, detailed: true, lightDirection: 'left', contact, finish, ...overrides };
  const draw = production('drawPigThymicSurface', { pigThymicGeometry: geometry, tracePigThymicRegion: trace });
  return { ctx, options, contact, finish, draw: () => draw(ctx, options), rawDraw: draw };
}
function sharedTarget(id) {
  return production('paintedSmallStructurePoint', { spec: { bodyShape: 'pig' }, pigThymicGeometry: geometry,
    pigCardiacGeometry: production('pigCardiacGeometry') })({ id });
}
function actualContact(ctx, detailed) {
  return production('paintCurrentOrganContact', { ctx, sceneDetail: detailed, highContrastEnabled: false,
    d: { visualRealism: 'realistic' }, visualRealism: 'realistic', lightDirection: 'left' });
}
function paintedSurfaces(ctx, name) {
  // Contact shells and borders use the actual same path as their solid surface.
  // Diffuse shadows are not solid anatomical occluders.
  const events = paints(ctx);
  return events.filter(e => e.operation === 'fill').map((fill, index) => ({
    name: name + '-' + index, paths: samplePath(fill.path), path: fill.path,
    halfBorder: Math.max(0, ...events.filter(e => e.operation === 'stroke' && JSON.stringify(e.path) === JSON.stringify(fill.path)).map(e => e.width)) / 2
  }));
}
function actualLungs(W, H, detailed) {
  const begin = source.indexOf('drawPigLungLobe(cx'), end = source.indexOf('// A shared external ventricular mass', begin);
  if (begin < 0 || end < begin) throw Error('Missing actual pig lung placement');
  const result = [];
  new Function('drawPigLungLobe', 'W', 'H', 'cx', 'cy', source.slice(begin, end))((...args) => {
    const ctx = new Context();
    production('drawPigLungLobe', { ctx, sceneDetail: detailed, pigAccessible: false, highContrastEnabled: false,
      lightDirection: 'left', paintCurrentOrganContact: actualContact(ctx, detailed), finishCurrentTissuePath: () => {} })(...args);
    result.push(...paintedSurfaces(ctx, 'lung-' + result.length + (detailed ? '-detailed' : '-ellipse')));
    expect(ctx.stack).toEqual([]);
  }, W, H, W * .5, H * .45);
  return result;
}
function actualThoracicOccluders(W, H, detailed) {
  const ctx = new Context(), cardiacGeometry = production('pigCardiacGeometry'), cardiacTrace = production('tracePigCardiacRegion');
  production('drawPigCardiacComplex', { pigCardiacGeometry: cardiacGeometry, tracePigCardiacRegion: cardiacTrace })(ctx,
    { width: W, height: H, detailed, lightDirection: 'left', contact: actualContact(ctx, detailed), finish: () => {} });
  const result = [...actualLungs(W, H, detailed), ...paintedSurfaces(ctx, 'cardiac')];
  const diaphragm = new Context(), start = source.indexOf('// The diaphragm forms a curved muscular boundary between thorax and abdomen.'),
    end = source.indexOf('var diaphragmSurface', start);
  if (start < 0 || end < start) throw Error('Missing actual diaphragm');
  new Function('ctx', 'W', 'H', 'cx', 'cy', source.slice(start, end))(diaphragm, W, H, W * .5, H * .45);
  result.push({ name: 'diaphragm', paths: samplePath(diaphragm.path), halfBorder: .3 });
  const match = /var pigLiverLobes = (\[[\s\S]*?\]);/.exec(source);
  if (!match) throw Error('Missing actual pig liver layout');
  const lobes = new Function('return (' + match[1] + ');')();
  lobes.forEach((lobe, i) => {
    const ctx = new Context(), visceral = production('traceVisceralLobe', { ctx });
    production('traceHepaticLobe', { ctx, sceneDetail: detailed, highContrastEnabled: false, d: { visualRealism: 'realistic' },
      visualRealism: 'realistic', traceVisceralLobe: visceral })(W * (.5 + lobe[0]), H * (.45 + lobe[1]),
      W * lobe[2], H * lobe[3], lobe[4], i === 0 ? 'broad' : (i === 4 ? 'swept' : 'tongue'), i % 2 ? -1 : 1);
    actualContact(ctx, detailed)(W * lobe[2], H * lobe[3]);
    const contact = paints(ctx).filter(e => e.operation === 'stroke');
    result.push({ name: 'liver-' + i, paths: samplePath(ctx.path), halfBorder: Math.max(.7, ...contact.map(e => e.width)) / 2 });
  });
  return result;
}

describe('registered external fetal pig thymus', () => {
  it.each(dimensions)('keeps one closed softly lobulated gland and all short creases inside the actual coelom at %s by %s', (W, H) => {
    const g = geometry(W, H), path = tracePath(g.region, W, H), points = samplePath(path)[0], cavity = new Context();
    production('tracePigCoelom', { ctx: cavity, W, H, cx: W * .5, cy: H * .45 })(cavity);
    const boundary = samplePath(cavity.path)[0];
    expect(g.region.curves).toHaveLength(12); expect(g.region.curves.at(-1)[2]).toEqual(g.region.start);
    expect(path.filter(op => op[0] === 'moveTo')).toHaveLength(1);
    expect(path.filter(op => op[0] === 'bezierCurveTo')).toHaveLength(12); expect(path.at(-1)).toEqual(['closePath']);
    expect(g.bounds.minX).toBeGreaterThanOrEqual(.345); expect(g.bounds.maxX).toBeLessThanOrEqual(.422);
    expect(g.bounds.minY).toBeGreaterThanOrEqual(.35); expect(g.bounds.maxY).toBeLessThanOrEqual(.455);
    for (const p of points) {
      expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true); expect(contains(p, boundary)).toBe(true);
      expect(p.x / W).toBeGreaterThanOrEqual(g.bounds.minX - 1e-12); expect(p.x / W).toBeLessThanOrEqual(g.bounds.maxX + 1e-12);
      expect(p.y / H).toBeGreaterThanOrEqual(g.bounds.minY - 1e-12); expect(p.y / H).toBeLessThanOrEqual(g.bounds.maxY + 1e-12);
    }
    expect(g.center.x).toBeCloseTo((g.bounds.minX + g.bounds.maxX) / 2, 12);
    expect(g.center.y).toBeCloseTo((g.bounds.minY + g.bounds.maxY) / 2, 12);
    expect(g.extent.x).toBeCloseTo((g.bounds.maxX - g.bounds.minX) / 2, 12);
    expect(g.extent.y).toBeCloseTo((g.bounds.maxY - g.bounds.minY) / 2, 12);
    expect(g.surfaceCreases).toHaveLength(4);
    for (const crease of g.surfaceCreases) {
      const path = tracePath(crease, W, H, false); expect(path.some(op => op[0] === 'closePath')).toBe(false);
      expect(path.filter(op => op[0] === 'bezierCurveTo')).toHaveLength(1);
      for (const p of samplePath(path)[0]) expect(contains(p, points)).toBe(true);
    }
    const target = { x: g.target.x * W, y: g.target.y * H };
    expect(contains(target, points)).toBe(true); expect(distance(target, [points])).toBeGreaterThan(2.5);
  });

  it.each(dimensions)('keeps the target exposed after actual detailed lungs, fallback ellipses, contact shells and cardiac paint at %s by %s', (W, H) => {
    const target = geometry(W, H).target, p = { x: target.x * W, y: target.y * H };
    for (const detailed of [false, true]) {
      const occluders = actualThoracicOccluders(W, H, detailed);
      expect(occluders.filter(e => e.name.startsWith('lung'))).toHaveLength(3);
      expect(occluders.filter(e => e.name.startsWith('cardiac'))).toHaveLength(3);
      expect(occluders.filter(e => e.name.startsWith('liver'))).toHaveLength(5);
      for (const e of occluders) {
        expect(e.paths.some(points => contains(p, points)), e.name).toBe(false);
        expect(distance(p, e.paths) - e.halfBorder, e.name).toBeGreaterThan(2.5);
      }
    }
    expect(sharedTarget('thymus_p')).toEqual(target);
  });

  it.each(dimensions)('preserves the overlying lung at its own target rather than cutting a hole in the underlying thymus at %s by %s', (W, H) => {
    const target = sharedTarget('lungs_p'), p = { x: target.x * W, y: target.y * H };
    expect(contains(p, samplePath(tracePath(geometry(W, H).region, W, H))[0])).toBe(true);
    for (const detailed of [false, true]) {
      expect(actualLungs(W, H, detailed).some(e => e.paths.some(points => contains(p, points)))).toBe(true);
      const cardiac = actualThoracicOccluders(W, H, detailed).filter(e => !e.name.startsWith('lung'));
      for (const e of cardiac) expect(e.paths.some(points => contains(p, points)), e.name).toBe(false);
    }
  });

  it('returns the shared painted target before generic jitter or view offsets in every presentation', () => {
    for (const mode of ['guided', 'realistic', 'accessible']) for (const view of ['dorsal', 'ventral', 'lateral', 'internal']) {
      const bindings = { spec: { bodyShape: 'pig' }, pigThymicGeometry: geometry };
      const varied = production('variedOrganPoint', { paintedSmallStructurePoint: production('paintedSmallStructurePoint', bindings),
        d: { visualRealism: mode, anatomicalView: view }, visualRealism: mode,
        specimenVariationValue: () => { throw Error('A painted thymic target must not jitter'); },
        viewSpecificOrganPoint: () => { throw Error('A painted thymic target must not get generic offsets'); } });
      expect(varied({ id: 'thymus_p', x: .36, y: .39 })).toEqual(geometry().target);
    }
  });

  it('builds fresh geometry and rejects nonfinite or invisible dimensions without touching the context', () => {
    const first = geometry(), saved = structuredClone(first); expect(geometry(500, 600)).toEqual(first);
    first.target.x = 9; first.region.curves[0][0].x = 9; first.surfaceCreases[0].start.y = 9; first.bounds.minY = 9;
    expect(geometry()).toEqual(saved);
    for (const [W, H] of [[0, 600], [.99, 600], [500, .5], [500, -1], [NaN, 600], [500, Infinity], ['bad', 600]]) expect(geometry(W, H)).toBeNull();
    const ctx = new Context(); for (const region of [null, {}, { start: {} }]) expect(trace(ctx, region, 500, 600)).toBe(false);
    expect(trace(null, saved.region, 500, 600)).toBe(false); expect(ctx.path).toEqual([]); expect(ctx.events).toEqual([]);
  });
});


describe('restrained whole-surface thymic rendering', () => {
  it.each(dimensions)('re-traces the complete gland after contact and clips every crease and material finish at %s by %s', (width, height) => {
    const f = fixture({ width, height }), before = f.ctx.state(), g = geometry(width, height), expected = tracePath(g.region, width, height);
    expect(f.draw()).toBe(true); expect(f.contact).toHaveBeenCalledTimes(1); expect(f.finish).toHaveBeenCalledTimes(1);
    const painting = paints(f.ctx); expect(painting.map(e => e.operation)).toEqual(['fill', ...Array(9).fill('stroke')]);
    expect(painting[0].path).toEqual(expected); expect(painting[1].path).toEqual(expected);
    expect(painting[0].fill.kind).toBe('linear'); expect(painting[0].fill.stops).toHaveLength(4);
    const contact = f.ctx.events.find(e => e.operation === 'contact'), finish = f.ctx.events.find(e => e.operation === 'finish');
    expect(contact.path).toEqual(expected); expect(contact.args).toEqual([g.extent.x * width, g.extent.y * height]);
    expect(contact.clips).toEqual(['specimen']);
    expect(finish.path).toEqual(expected); expect(finish.clips).toEqual(['specimen', expected]);
    expect(finish.args).toEqual([g.center.x * width, g.center.y * height, g.extent.x * width, g.extent.y * height, 'lobular', 'pig-thymus']);
    const clips = f.ctx.events.filter(e => e.operation === 'clip'); expect(clips).toHaveLength(2);
    expect(clips.every(e => JSON.stringify(e.path) === JSON.stringify(expected))).toBe(true);
    for (const e of painting.slice(2)) {
      expect(e.clips).toEqual(['specimen', expected]); expect(e.path.at(-1)[0]).not.toBe('closePath');
      expect(e.path.filter(op => op[0] === 'bezierCurveTo')).toHaveLength(1);
      expect(e.path.filter(op => op[0] === 'moveTo')).toHaveLength(1);
      expect(e.width).toBeLessThanOrEqual(.42); expect(e.cap).toBe('round'); expect(e.join).toBe('round');
      expect(Number(/,([\d.]+)\)$/.exec(e.stroke)[1])).toBeLessThanOrEqual(.2);
    }
    expect(painting.every(e => e.alpha === before.globalAlpha && e.composite === before.globalCompositeOperation)).toBe(true);
    expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
  });

  it.each(dimensions)('retains the complete gland with two flat paints and no effects in clarity modes at %s by %s', (width, height) => {
    const f = fixture({ width, height, detailed: false }), before = f.ctx.state(); expect(f.draw()).toBe(true);
    const painting = paints(f.ctx), expected = tracePath(geometry(width, height).region, width, height);
    expect(painting.map(e => e.operation)).toEqual(['fill', 'stroke']); expect(typeof painting[0].fill).toBe('string');
    expect(painting.every(e => JSON.stringify(e.path) === JSON.stringify(expected))).toBe(true);
    expect(f.contact).not.toHaveBeenCalled(); expect(f.finish).not.toHaveBeenCalled();
    expect(f.ctx.events.some(e => e.operation === 'gradient' || e.operation === 'clip')).toBe(false);
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
    expect(geometry().target).toEqual(sharedTarget('thymus_p'));
    const dark = painting[2].path[0], light = painting[3].path[0];
    expect(Math.hypot(light[1] - dark[1], light[2] - dark[2])).toBeCloseTo(.28, 10);
  });

  it.each([.84, .95])('preserves parent transforms, clipping and inherited tissue opacity %s', alpha => {
    const f = fixture({}, [-2.7, .2, .3, 3, 800, -175]); f.ctx.globalAlpha = alpha; const before = f.ctx.state(); f.draw();
    const expected = tracePath(geometry().region, 500, 600, true, before.matrix);
    expect(paints(f.ctx).slice(0, 2).every(e => JSON.stringify(e.path) === JSON.stringify(expected))).toBe(true);
    expect(paints(f.ctx).every(e => e.alpha === alpha)).toBe(true);
    expect(f.ctx.events.find(e => e.operation === 'finish').clips).toEqual(['specimen', expected]);
    expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
  });

  it.each(['contact', 'gradient', 'fill', 'border', 'clip', 'crease', 'translate', 'finish'])('restores every parent state after an injected %s failure', location => {
    const f = fixture(), before = f.ctx.state(), fail = () => { throw Error('Injected thymic error'); };
    if (location === 'contact') f.options.contact = fail;
    else if (location === 'finish') f.options.finish = fail;
    else if (location === 'gradient') f.ctx.createLinearGradient = fail;
    else if (location === 'fill') f.ctx.fill = fail;
    else if (location === 'clip') f.ctx.clip = fail;
    else if (location === 'translate') f.ctx.translate = fail;
    else if (location === 'border') f.ctx.stroke = fail;
    else { const stroke = f.ctx.stroke.bind(f.ctx); let calls = 0; f.ctx.stroke = () => { if (++calls === 2) fail(); stroke(); }; }
    expect(f.draw).toThrow('Injected thymic error'); expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
  });

  it('safely omits optional effects and does no work for invalid rendering arguments', () => {
    const f = fixture({ contact: null, finish: null }); expect(f.draw()).toBe(true); expect(paints(f.ctx)).toHaveLength(10); expect(f.ctx.stack).toEqual([]);
    for (const input of [{ width: NaN }, { height: Infinity }, { width: 0 }, { height: .5 }, { width: undefined }]) {
      const invalid = fixture(input), before = invalid.ctx.state(); expect(invalid.draw()).toBe(false);
      expect(invalid.ctx.events).toEqual([]); expect(invalid.ctx.state()).toEqual(before); expect(invalid.ctx.stack).toEqual([]);
    }
    expect(f.rawDraw(null, f.options)).toBe(false); expect(f.rawDraw(new Context())).toBe(false);
    expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_dissection.js', 'utf8')).toBe(source);
  });

  it('keeps the same detailed-mode gate and paints the dorsal gland before every actual lung and the heart', () => {
    const start = source.lastIndexOf('drawPigThymicSurface(ctx,'), end = source.indexOf('});', start) + 3;
    expect(start).toBeGreaterThan(0); expect(end).toBeLessThan(source.indexOf('function drawPigLungLobe(', start));
    expect(end).toBeLessThan(source.indexOf('drawPigCardiacComplex(ctx,', start));
    const contact = () => {}, finish = () => {}, ctx = new Context(), calls = [];
    for (const sceneDetail of [true, false]) for (const pigAccessible of [true, false]) for (const highContrastEnabled of [true, false]) {
      new Function('drawPigThymicSurface', 'ctx', 'W', 'H', 'sceneDetail', 'pigAccessible', 'highContrastEnabled',
        'lightDirection', 'paintCurrentOrganContact', 'finishCurrentTissuePath', source.slice(start, end))(
        (context, options) => calls.push({ context, options }), ctx, 500, 600, sceneDetail, pigAccessible, highContrastEnabled, 'raking', contact, finish);
      expect(calls.at(-1)).toEqual({ context: ctx, options: { width: 500, height: 600,
        detailed: sceneDetail && !pigAccessible && !highContrastEnabled, lightDirection: 'raking', contact, finish } });
    }
  });
});
