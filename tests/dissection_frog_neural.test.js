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
    Object.assign(this, { globalAlpha: .94, globalCompositeOperation: 'multiply', fillStyle: '#135724', strokeStyle: '#246813',
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

const geometry = production('frogNeuralGeometry'), trace = production('traceFrogNeuralRegion');
function tracePath(region, W, H, matrix) { const ctx = new Context(matrix); trace(ctx, region, W, H); return ctx.path; }
const paints = ctx => ctx.events.filter(e => e.operation === 'fill' || e.operation === 'stroke');
function contaminate(ctx) {
  ctx.translate(23, -17); ctx.scale(.3, -.5); ctx.globalAlpha = .1; ctx.globalCompositeOperation = 'destination-out';
  ctx.setLineDash([17, 11]); ctx.shadowBlur = 19; ctx.lineCap = 'square';
  ctx.beginPath(); ctx.moveTo(-9000, -9000); ctx.lineTo(-9001, -9001);
}
function fixture(overrides = {}, matrix) {
  const ctx = new Context(matrix); ctx.globalAlpha = .76;
  const contact = vi.fn((...args) => {
    ctx.events.push({ operation: 'contact', args, path: structuredClone(ctx.path), clips: [...ctx.clips] }); contaminate(ctx);
  });
  const finish = vi.fn((...args) => {
    ctx.events.push({ operation: 'finish', args, path: structuredClone(ctx.path), clips: [...ctx.clips] }); ctx.clip(); contaminate(ctx);
  });
  const options = { width: 500, height: 600, detailed: true, lightDirection: 'left', contact, finish, ...overrides };
  const draw = production('drawFrogNeuralComplex', { frogNeuralGeometry: geometry, traceFrogNeuralRegion: trace });
  return { ctx, options, contact, finish, draw: () => draw(ctx, options), rawDraw: draw };
}
function actualTorso(W, H) {
  const ctx = new Context(), start = source.indexOf('var traceFrogTorso = function traceFrogTorso()'),
    end = source.indexOf('function drawFrogLimbChain', start);
  if (start < 0 || end <= start) throw Error('Missing actual frog head/torso');
  new Function('ctx', 'W', 'H', 'cx', 'cy', 'frogBreath', source.slice(start, end) + ';traceFrogTorso();')(ctx, W, H, W * .5, H * .45, 1);
  return ctx.path;
}
function nativeNeuralBlock() {
  const start = source.indexOf("if (activeLayer === 'nervous') {", source.indexOf('var traceFrogTorso')),
    end = source.indexOf('\n                }', start);
  if (start < 0 || end <= start) throw Error('Missing actual native frog nervous layer');
  return source.slice(start, end + '\n                }'.length);
}
function actualLaterRoutes(W, H) {
  const ctx = new Context(), block = nativeNeuralBlock(), start = block.indexOf('ctx.beginPath();ctx.moveTo(cx+side*W*0.027'),
    opticEnd = block.indexOf('});', start) + 3, cord = block.indexOf('ctx.beginPath();ctx.moveTo(cx,cy-H*0.255)', opticEnd),
    end = block.lastIndexOf('ctx.restore();');
  if (start < 0 || opticEnd <= start || cord < opticEnd || end <= cord) throw Error('Actual neural route extraction changed');
  new Function('ctx', 'W', 'H', 'cx', 'cy', '[-1,1].forEach(function(side){' + block.slice(start, opticEnd) + block.slice(cord, end))(ctx, W, H, W * .5, H * .45);
  return paints(ctx).map(e => ({ ...e, paths: samplePath(e.path) }));
}
function painted(id) { return production('paintedSmallStructurePoint', { spec: { bodyShape: 'frog' }, frogNeuralGeometry: geometry })({ id }); }
function runNativeLayer(W, H, { detail = true, accessible = false, highContrast = false } = {}) {
  const ctx = new Context(), draw = vi.fn(), bindings = { ctx, W, H, cx: W * .5, cy: H * .45,
    activeLayer: 'nervous', frogAccessible: accessible, highContrastEnabled: highContrast, sceneDetail: detail,
    lightDirection: 'left', paintCurrentOrganContact: () => {}, finishCurrentTissuePath: () => {}, drawFrogNeuralComplex: draw };
  new Function(...Object.keys(bindings), nativeNeuralBlock())(...Object.values(bindings));
  return { ctx, draw };
}

describe('registered intact frog dorsal brain anatomy', () => {
  it.each(dimensions)('keeps the whole brain and all closed regional relief within the actual head at %s by %s', (W, H) => {
    const g = geometry(W, H), bodyPath = tracePath(g.body, W, H), body = samplePath(bodyPath)[0], torso = samplePath(actualTorso(W, H));
    expect(g.regions).toHaveLength(7); expect(g.body.curves).toHaveLength(15);
    expect(bodyPath.filter(op => op[0] === 'moveTo')).toHaveLength(1); expect(bodyPath.at(-1)).toEqual(['closePath']);
    expect(g.body.curves.at(-1)[2]).toEqual(g.body.start);
    for (const point of body) {
      expect(contains(point, torso[0])).toBe(true); expect(distance(point, torso) - .50 / 2).toBeGreaterThan(14);
      expect(point.x / W).toBeGreaterThan(.455); expect(point.x / W).toBeLessThan(.545);
      expect(point.y / H).toBeGreaterThan(.132); expect(point.y / H).toBeLessThan(.200);
    }
    for (const part of g.regions) {
      const path = tracePath(part.region, W, H), points = samplePath(path)[0];
      expect(part.region.curves).toHaveLength(4); expect(path.at(-1)).toEqual(['closePath']);
      expect(part.region.curves.at(-1)[2]).toEqual(part.region.start);
      expect(contains({ x: part.center.x * W, y: part.center.y * H }, points), part.id).toBe(true);
      for (const p of points) {
        expect(contains(p, body), part.id).toBe(true);
        expect(p.x / W).toBeGreaterThanOrEqual(part.bounds.minX - 1e-12); expect(p.x / W).toBeLessThanOrEqual(part.bounds.maxX + 1e-12);
        expect(p.y / H).toBeGreaterThanOrEqual(part.bounds.minY - 1e-12); expect(p.y / H).toBeLessThanOrEqual(part.bounds.maxY + 1e-12);
      }
      expect(part.extent.x).toBeCloseTo((part.bounds.maxX - part.bounds.minX) / 2, 12);
      expect(part.extent.y).toBeCloseTo((part.bounds.maxY - part.bounds.minY) / 2, 12);
    }
    expect(contains({ x: g.cordJunction.x * W, y: g.cordJunction.y * H }, body)).toBe(true);
    expect(g.bounds).toEqual(g.body.bounds); expect(g.extent).toEqual(g.body.extent);
  });

  it('keeps the paired optic bodies broadest and the cerebellum narrow in rostrocaudal order', () => {
    const g = geometry(), part = id => g.regions.find(r => r.id === id);
    for (const side of ['left', 'right']) {
      const olfactory = part('olfactory-' + side), cerebral = part('cerebral-' + side), optic = part('optic-' + side);
      expect(olfactory.center.y).toBeLessThan(cerebral.center.y); expect(cerebral.center.y).toBeLessThan(optic.center.y);
      expect(optic.extent.x).toBeGreaterThan(cerebral.extent.x * 1.5); expect(cerebral.extent.x).toBeGreaterThan(olfactory.extent.x);
      expect(optic.center.y).toBeLessThan(part('cerebellum').center.y);
    }
    expect(part('cerebellum').extent.y).toBeLessThan(part('cerebellum').extent.x / 4);
    expect(part('cerebellum').center.y).toBeLessThan(g.cordJunction.y);
    const atY = y => samplePath(tracePath(g.body, 500, 600))[0].filter(p => Math.abs(p.y / 600 - y) < .001).map(p => p.x / 500);
    const broad = atY(.170), medulla = atY(.197); expect(Math.max(...medulla) - Math.min(...medulla)).toBeLessThan((Math.max(...broad) - Math.min(...broad)) / 4);
  });

  it.each(dimensions)('keeps brain and optic sample patches visible after all actual later native nerves at %s by %s', (W, H) => {
    const g = geometry(W, H), body = samplePath(tracePath(g.body, W, H)), optic = samplePath(tracePath(g.regions.find(p => p.id === 'optic-right').region, W, H));
    const routes = actualLaterRoutes(W, H); expect(routes).toHaveLength(16); expect(routes.every(e => e.operation === 'stroke')).toBe(true);
    for (const [target, own, minimum] of [[g.target, body, 12], [g.opticTarget, optic, 5.3]]) {
      const point = { x: target.x * W, y: target.y * H };
      expect(contains(point, own[0])).toBe(true); expect(distance(point, own) - .55 / 2).toBeGreaterThan(minimum);
      // A complete 3x3 specimen-pixel patch, rather than only an exact mathematical point.
      for (const dx of [-.5, 0, .5]) for (const dy of [-.5, 0, .5]) {
        const p = { x: point.x + dx, y: point.y + dy }; expect(contains(p, own[0])).toBe(true);
        for (const route of routes) expect(distance(p, route.paths) - route.width / 2).toBeGreaterThan(5);
      }
    }
    const brain = { x: g.target.x * W, y: g.target.y * H };
    for (const region of g.regions) {
      const path = samplePath(tracePath(region.region, W, H)); expect(contains(brain, path[0])).toBe(false);
      expect(distance(brain, path) - .55 / 2).toBeGreaterThan(.65);
    }
    expect(painted('brain')).toEqual(g.target); expect(painted('optic_lobe')).toEqual(g.opticTarget);
  });

  it.each(dimensions)('preserves cranial/spinal neighbors and the actual medulla-to-cord connection at %s by %s', (W, H) => {
    const g = geometry(W, H), body = samplePath(tracePath(g.body, W, H)), routes = actualLaterRoutes(W, H),
      junction = { x: g.cordJunction.x * W, y: g.cordJunction.y * H };
    for (const [id, target] of Object.entries(g.nerveTargets)) {
      const point = { x: target.x * W, y: target.y * H };
      expect(contains(point, body[0]), id).toBe(false); expect(distance(point, body), id).toBeGreaterThan(7);
      expect(Math.max(...routes.map(e => e.width / 2 - distance(point, e.paths))), id).toBeGreaterThan(.49);
      expect(painted(id)).toEqual(target);
    }
    expect(contains(junction, body[0])).toBe(true); expect(distance(junction, routes[2].paths)).toBeLessThan(1e-9);
  });

  it('returns fresh deterministic anatomy and guards unusable dimensions before touching canvas state', () => {
    const first = geometry(), saved = structuredClone(first); expect(geometry(500, 600)).toEqual(saved);
    first.target.x = 9; first.regions[0].region.curves[0][0].x = 9; first.body.bounds.minX = 9; expect(geometry()).toEqual(saved);
    for (const [W, H] of [[0, 600], [.99, 600], [500, .5], [500, -1], [NaN, 600], [500, Infinity], ['bad', 600]]) expect(geometry(W, H)).toBeNull();
    for (const [W, H] of [[1, 10000], [10000, 1]]) expect([geometry(W, H).body, ...geometry(W, H).regions.map(p => p.region)].every(r =>
      [r.start, ...r.curves.flat()].every(p => Number.isFinite(p.x) && Number.isFinite(p.y)))).toBe(true);
    const ctx = new Context(); for (const r of [null, {}, { start: {} }]) expect(trace(ctx, r, 500, 600)).toBe(false);
    expect(trace(null, saved.body, 500, 600)).toBe(false); expect(ctx.path).toEqual([]); expect(ctx.events).toEqual([]);
  });

  it('derives cranial, brachial and sciatic anchors from the actual line, quadratic and cubic courses', () => {
    const W = 500, H = 600, routes = actualLaterRoutes(W, H), g = geometry(W, H);
    function evaluate(path, t) {
      const a = path[0].slice(1), command = path[1], c = command.slice(1), u = 1 - t;
      if (command[0] === 'lineTo') return [u * a[0] + t * c[0], u * a[1] + t * c[1]];
      if (command[0] === 'quadraticCurveTo') return [u * u * a[0] + 2 * u * t * c[0] + t * t * c[2], u * u * a[1] + 2 * u * t * c[1] + t * t * c[3]];
      return [u ** 3 * a[0] + 3 * u * u * t * c[0] + 3 * u * t * t * c[2] + t ** 3 * c[4],
        u ** 3 * a[1] + 3 * u * u * t * c[1] + 3 * u * t * t * c[3] + t ** 3 * c[5]];
    }
    for (const [id, index, t, command] of [['cranial_n', 1, .65, 'lineTo'], ['brachial_n', 13, .65, 'quadraticCurveTo'], ['sciatic_n', 12, .55, 'bezierCurveTo']]) {
      const path = routes[index].path; expect(path[1][0]).toBe(command); const expected = evaluate(path, t);
      expect(g.nerveTargets[id].x * W).toBeCloseTo(expected[0], 10); expect(g.nerveTargets[id].y * H).toBeCloseTo(expected[1], 10);
    }
  });

  it('binds both painted anchors before generic jitter/view offsets in every teaching mode', () => {
    for (const mode of ['guided', 'realistic', 'accessible']) for (const view of ['dorsal', 'ventral', 'lateral', 'internal']) {
      const varied = production('variedOrganPoint', { paintedSmallStructurePoint: production('paintedSmallStructurePoint', {
        spec: { bodyShape: 'frog' }, frogNeuralGeometry: geometry }), d: { visualRealism: mode, anatomicalView: view }, visualRealism: mode,
        specimenVariationValue: () => { throw Error('Painted brain target must not jitter'); },
        viewSpecificOrganPoint: () => { throw Error('Painted brain target must not get generic view offsets'); } });
      const g = geometry();
      for (const [id, expected] of Object.entries({ brain: g.target, optic_lobe: g.opticTarget, ...g.nerveTargets }))
        expect(varied({ id, x: .9, y: .9 })).toEqual(expected);
    }
  });
});

describe('smooth bounded neural surface rendering', () => {
  it.each(dimensions)('isolates contact mutations and paints eight registered contours with one whole-brain finish at %s by %s', (width, height) => {
    const f = fixture({ width, height }), before = f.ctx.state(), g = geometry(width, height); expect(f.draw()).toBe(true);
    const records = paints(f.ctx), shapes = [g.body, ...g.regions.map(p => p.region)], whole = tracePath(g.body, width, height);
    expect(records).toHaveLength(16); expect(f.contact).toHaveBeenCalledTimes(1); expect(f.finish).toHaveBeenCalledTimes(1);
    shapes.forEach((region, i) => {
      const expected = tracePath(region, width, height), fill = records[i * 2], border = records[i * 2 + 1];
      expect(fill.operation).toBe('fill'); expect(border.operation).toBe('stroke');
      expect(fill.path).toEqual(expected); expect(border.path).toEqual(expected);
      expect(fill.fill.kind).toBe('linear'); expect(fill.fill.stops.map(s => s[0])).toEqual([0, .36, .76, 1]);
      expect(fill.clips).toEqual(i ? ['specimen', whole] : ['specimen']);
      for (const record of [fill, border]) {
        expect(record.alpha).toBe(.76); expect(record.composite).toBe('source-over'); expect(record.dash).toEqual([]);
        expect(record.cap).toBe('round'); expect(record.join).toBe('round'); expect(record.shadow).toEqual([0, 0, 0]);
      }
    });
    const contact = f.ctx.events.find(e => e.operation === 'contact'), finish = f.ctx.events.find(e => e.operation === 'finish');
    expect(contact.path).toEqual(whole); expect(contact.clips).toEqual(['specimen']);
    expect(f.contact).toHaveBeenCalledWith(g.extent.x * width, g.extent.y * height);
    expect(finish.path).toEqual(whole); expect(finish.clips).toEqual(['specimen', whole]);
    expect(f.finish).toHaveBeenCalledWith(g.center.x * width, g.center.y * height, g.extent.x * width, g.extent.y * height, 'capsule', 'frog-brain');
    expect(f.ctx.events.filter(e => e.operation === 'clip').map(e => e.path)).toEqual([whole, whole]);
    expect(f.ctx.events.filter(e => e.operation === 'gradient')).toHaveLength(8);
    expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
  });

  it.each(dimensions)('retains identical semantic contours in flat mode without any material effects at %s by %s', (width, height) => {
    const f = fixture({ width, height, detailed: false }), before = f.ctx.state(); expect(f.draw()).toBe(true);
    const shapes = [geometry(width, height).body, ...geometry(width, height).regions.map(p => p.region)], records = paints(f.ctx);
    expect(records).toHaveLength(16); expect(f.contact).not.toHaveBeenCalled(); expect(f.finish).not.toHaveBeenCalled();
    expect(f.ctx.events.some(e => e.operation === 'gradient')).toBe(false);
    shapes.forEach((r, i) => {
      expect(records[i * 2].path).toEqual(tracePath(r, width, height)); expect(records[i * 2 + 1].path).toEqual(tracePath(r, width, height));
      expect(typeof records[i * 2].fill).toBe('string'); expect(records[i * 2 + 1].stroke).toBe('#7c3aed');
      expect(records[i * 2].shadow).toEqual([0, 0, 0]);
    });
    expect(records[0].fill).not.toBe(records[10].fill); expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
  });

  it.each([['left', [-1, -.14]], ['right', [1, -.14]], ['raking', [-.72, .70]], ['unknown', [-.12, -1]]])('uses physical directional volume for %s illumination', (lightDirection, light) => {
    const f = fixture({ lightDirection }); f.draw(); const g = geometry(), shapes = [g.body, ...g.regions.map(p => p.region)],
      gradients = f.ctx.events.filter(e => e.operation === 'gradient'), len = Math.hypot(...light);
    gradients.forEach((e, i) => {
      const r = shapes[i], [x1, y1, x2, y2] = e.gradient.args, rx = r.extent.x * 500, ry = r.extent.y * 600;
      expect((x1 + x2) / 2).toBeCloseTo(r.center.x * 500, 10); expect((y1 + y2) / 2).toBeCloseTo(r.center.y * 600, 10);
      expect((x1 - x2) / (2 * rx)).toBeCloseTo(light[0] / len, 10); expect((y1 - y2) / (2 * ry)).toBeCloseTo(light[1] / len, 10);
    });
  });

  it.each([.76, .92])('preserves inherited alpha %s and a mirrored/sheared specimen transform', alpha => {
    const matrix = [-1.7, .14, .25, .8, 820, -35], f = fixture({}, matrix); f.ctx.globalAlpha = alpha;
    const before = f.ctx.state(); f.draw(); const g = geometry(), shapes = [g.body, ...g.regions.map(p => p.region)];
    paints(f.ctx).forEach((e, i) => { expect(e.path).toEqual(tracePath(shapes[Math.floor(i / 2)], 500, 600, matrix)); expect(e.alpha).toBe(alpha); expect(e.matrix).toEqual(matrix); });
    expect(f.ctx.events.find(e => e.operation === 'finish').path).toEqual(tracePath(g.body, 500, 600, matrix));
    expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
  });

  it.each(['contact', 'gradient-first', 'gradient-region', 'fill-base', 'fill-region', 'border', 'clip', 'finish', 'normalize'])('restores all inherited canvas state when %s throws', location => {
    const f = fixture(), before = f.ctx.state(), fault = Error('injected ' + location); let calls = 0;
    if (location === 'contact') f.options.contact = () => { contaminate(f.ctx); throw fault; };
    else if (location === 'finish') f.options.finish = () => { contaminate(f.ctx); throw fault; };
    else {
      const operation = location.startsWith('gradient') ? 'createLinearGradient' : location.startsWith('fill') ? 'fill' :
        location === 'border' ? 'stroke' : location === 'normalize' ? 'setLineDash' : 'clip';
      const original = f.ctx[operation].bind(f.ctx), failureCall = location.endsWith('region') ? 4 : 1;
      f.ctx[operation] = (...args) => { if (++calls === failureCall) { contaminate(f.ctx); throw fault; } return original(...args); };
    }
    expect(f.draw).toThrow(fault); expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
  });

  it('supports omitted callbacks and rejects invalid context/dimensions without partial painting', () => {
    const f = fixture({ contact: null, finish: null }); expect(f.draw()).toBe(true); expect(paints(f.ctx)).toHaveLength(16);
    expect(f.ctx.events.filter(e => e.operation === 'clip')).toHaveLength(1);
    for (const options of [{}, { width: 0, height: 600 }, { width: 500, height: Infinity }]) {
      const ctx = new Context(), before = ctx.state(); expect(f.rawDraw(ctx, options)).toBe(false);
      expect(ctx.state()).toEqual(before); expect(ctx.events).toEqual([]); expect(ctx.path).toEqual([]);
    }
    expect(f.rawDraw(null, { width: 500, height: 600 })).toBe(false);
  });
});

describe('actual frog nervous layer integration', () => {
  it.each(dimensions)('uses the authored helper, correct alpha/detail gate, and unchanged later routes at %s by %s', (W, H) => {
    for (const [settings, expected] of [[{}, true], [{ detail: false }, false], [{ accessible: true }, false], [{ highContrast: true }, false]]) {
      const { ctx, draw } = runNativeLayer(W, H, settings); expect(draw).toHaveBeenCalledTimes(1);
      const [target, options] = draw.mock.calls[0]; expect(target).toBe(ctx);
      expect(options).toMatchObject({ width: W, height: H, detailed: expected, lightDirection: 'left' });
      expect(typeof options.contact).toBe('function'); expect(typeof options.finish).toBe('function');
      const expectedRoutes = actualLaterRoutes(W, H), actual = paints(ctx); expect(actual).toHaveLength(16);
      actual.forEach((e, i) => { expect(e.path).toEqual(expectedRoutes[i].path); expect(e.width).toBe(expectedRoutes[i].width); expect(e.alpha).toBe(settings.accessible ? .92 : .76); });
      expect(ctx.stack).toEqual([]);
    }
  });

  it('retains the continuous cord, paired radial branches and distinct limb-nerve courses behind their registered targets', () => {
    const W = 500, H = 600, routes = actualLaterRoutes(W, H), g = geometry();
    expect(routes.map(e => e.path.filter(op => op[0] !== 'moveTo').map(op => op[0]))).toEqual([
      ['lineTo'], ['lineTo'], ['lineTo'], ...Array.from({ length: 9 }, () => ['lineTo', 'lineTo']),
      ['bezierCurveTo'], ['quadraticCurveTo'], ['bezierCurveTo'], ['quadraticCurveTo']
    ]);
    expect(routes[2].path[0]).toEqual(['moveTo', g.cordJunction.x * W, g.cordJunction.y * H]);
    expect(routes[2].width).toBeGreaterThan(routes[0].width);
    const radial = routes.slice(3, 12);
    radial.forEach((e, i) => {
      const [leftStart, leftEnd, rightStart, rightEnd] = e.path;
      expect(leftStart).toEqual(rightStart); expect(leftStart[1]).toBe(g.cordJunction.x * W);
      expect(leftEnd[1] + rightEnd[1]).toBeCloseTo(W, 10); expect(leftEnd[2]).toBe(rightEnd[2]);
      if (i) expect(leftStart[2]).toBeGreaterThan(radial[i - 1].path[0][2]);
      expect(e.width).toBeLessThan(routes[0].width);
    });
    expect(nativeNeuralBlock().indexOf('drawFrogNeuralComplex')).toBeLessThan(nativeNeuralBlock().indexOf('ctx.moveTo(cx+side*W*0.027'));
  });

  it('keeps production and the desktop mirror identical', () => {
    expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_dissection.js', 'utf8')).toBe(source);
  });
});

describe('complete neural surface clearance for cards and depth captions', () => {
  function anchorsFixture(W, H, { bodyShape = 'frog', activeLayer = 'nervous', markers = [], ui = 1.4, scaleX = 2, scaleY = 2 } = {}) {
    const calls = vi.fn(geometry), bindings = { W, H, spec: { bodyShape }, activeLayer, adaptiveHotspotLayout: markers,
      frogNeuralGeometry: calls, frogRenalGeometry: production('frogRenalGeometry'),
      labelUiScale: ui, specimenTextScaleX: scaleX, specimenTextScaleY: scaleY };
    const start = source.indexOf('var labelAnchorPoints = adaptiveHotspotLayout.slice();'), end = source.indexOf('function clearLabelAnchors(', start);
    if (start < 0 || end <= start) throw Error('Missing actual scene anchor initializer');
    const anchors = new Function(...Object.keys(bindings), source.slice(start, end) + ';return labelAnchorPoints;')(...Object.values(bindings));
    const clear = production('clearLabelAnchors', { ...bindings, labelAnchorPoints: anchors });
    const resolve = production('resolveAdaptiveLabelColumn', { ...bindings, clearLabelAnchors: clear,
      currentGuided: null, canvasCoarsePointer: false, canvasDisplayWidth: W, labelLeftBound: 0, labelRightBound: W,
      prioritizeDissectionCalloutColumn: production('prioritizeDissectionCalloutColumn') });
    return { anchors, clear, resolve, calls, ui, scaleX, scaleY };
  }
  function captionFixture(W, H, { bodyShape = 'frog', activeLayer = 'nervous', mirror = false } = {}) {
    const entry = [mirror ? -4 : 4, .18, .24, 4, 950, -180], ctx = new Context(entry), canvas = { _dpr: 2,
      _guidanceBoxes: [{ x: 11, y: 13, width: 17, height: 19 }], _canvasHudBoxes: [{ x: 21, y: 23, width: 27, height: 29 }] };
    const observations = { placements: [], screens: [] }, ui = 1.4, geometryCalls = vi.fn(geometry);
    ctx.measureText = () => ({ width: 90 }); ctx.roundRect = () => {}; ctx.fillText = () => {};
    const bindings = { ctx, canvas, W, H, spec: { bodyShape }, activeLayer,
      d: { visualRealism: 'realistic', quizMode: true }, visualRealism: 'realistic', highContrastEnabled: false,
      focusEntryProgress: .35, specimenScale: { x: mirror ? -1 : 1, y: 1 }, zoom: 2,
      canvasUiScale: ui, labelUiScale: ui, specimenTextScaleX: 2, specimenTextScaleY: 2, labelScreenBottom: H - 30,
      hudCompassLayout: { compact: false }, hudCompassBox: null, organs: [], adaptiveHotspotById: {},
      frogNeuralGeometry: geometryCalls,
      structureInspectionFootprint: () => ({ rx: W * .04, ry: H * .02, rotation: .12, depth: 'deep', depthOffset: 8, morphologyLabel: 'COMPACT' }),
      fitTextToWidth: text => text, rememberCanvasGuidanceBox: () => {},
      placeCanvasHudPanel: (x, y, width, height, reservations) => { observations.placements.push({ x, y, width, height, reservations }); return { x, y }; } };
    const screen = production('canvasScreenBox', { ctx, canvas });
    bindings.canvasScreenBox = (...args) => { observations.screens.push({ args, matrix: [...ctx.matrix] }); return screen(...args); };
    const draw = production('drawStructureInspectionFootprint', bindings), target = geometry(W, H).target;
    return { ctx, canvas, entry, ui, observations, geometryCalls,
      draw: () => draw({ id: 'brain', name: 'Brain' }, target.x * W, target.y * H, true, false, 'visible', null) };
  }
  const overlaps = (a, b) => Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 1e-9 &&
    Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 1e-9;

  it.each(dimensions)('reserves the complete brain bounds and moves intersecting cards down/up at %s by %s', (W, H) => {
    const markers = [{ id: 'low', pointX: 20, pointY: H * .8 }, { id: 'high', pointX: 20, pointY: H * .1 }], saved = structuredClone(markers);
    const f = anchorsFixture(W, H, { markers }), g = geometry(W, H), anchor = f.anchors.find(a => a.clearanceX != null), paddingX = 3 * f.ui / f.scaleX, paddingY = 3 * f.ui / f.scaleY;
    expect(f.calls).toHaveBeenCalledTimes(1); expect(f.calls).toHaveBeenCalledWith(W, H); expect(markers).toEqual(saved);
    expect(f.anchors.map(a => a.pointY)).toEqual([...f.anchors.map(a => a.pointY)].sort((a, b) => a - b));
    expect(anchor).toEqual({ pointX: g.center.x * W, pointY: g.center.y * H,
      clearanceX: g.extent.x * W + paddingX, clearanceY: g.extent.y * H + paddingY });
    const hull = { x: anchor.pointX - anchor.clearanceX, y: anchor.pointY - anchor.clearanceY, width: anchor.clearanceX * 2, height: anchor.clearanceY * 2 };
    for (const p of samplePath(tracePath(g.body, W, H))[0]) {
      expect(p.x).toBeGreaterThanOrEqual(hull.x + paddingX - 1e-10); expect(p.x).toBeLessThanOrEqual(hull.x + hull.width - paddingX + 1e-10);
      expect(p.y).toBeGreaterThanOrEqual(hull.y + paddingY - 1e-10); expect(p.y).toBeLessThanOrEqual(hull.y + hull.height - paddingY + 1e-10);
    }
    const item = { x: g.bounds.maxX * W - 1, width: 24, height: 12 }, original = structuredClone(item), originalAnchors = structuredClone(f.anchors);
    for (const direction of [-1, 1]) {
      const y = f.clear(item, g.target.y * H - item.height / 2, direction), card = { ...item, y };
      expect(y).toBeCloseTo(direction > 0 ? hull.y + hull.height : hull.y - item.height, 10);
      expect(overlaps(card, hull)).toBe(false);
      for (const mirror of [false, true]) {
        const ctx = new Context([mirror ? -3 : 3, 0, 0, 3, 100, -25]), screen = production('canvasScreenBox', { ctx, canvas: { _dpr: 1.5 } });
        expect(overlaps(screen(card.x, card.y, card.width, card.height), screen(hull.x, hull.y, hull.width, hull.height))).toBe(false);
      }
    }
    expect(f.clear({ ...item, x: hull.x + hull.width + 1 }, g.target.y * H, 1)).toBe(g.target.y * H);
    expect(f.clear(item, hull.y + hull.height, 1)).toBe(hull.y + hull.height);
    expect(item).toEqual(original); expect(f.anchors).toEqual(originalAnchors);
  });

  it.each(dimensions)('keeps actual column reflow inside bounds and clear of the brain in both directions at %s by %s', (W, H) => {
    const f = anchorsFixture(W, H), a = f.anchors[0], hull = { x: a.pointX - a.clearanceX, y: a.pointY - a.clearanceY, width: a.clearanceX * 2, height: a.clearanceY * 2 },
      items = [0, 1].map(index => ({ id: 'card-' + index, index, x: geometry(W, H).bounds.maxX * W - 1, width: 24, height: 10, preferredY: a.pointY, y: a.pointY })), maxY = hull.y + hull.height + 12;
    f.resolve(items, 0, maxY);
    for (const item of items) { expect(item.y).toBeGreaterThanOrEqual(0); expect(item.y + item.height).toBeLessThanOrEqual(maxY); expect(overlaps(item, hull)).toBe(false); }
    expect(items[0].y + items[0].height).toBeLessThanOrEqual(hull.y); expect(items[1].y).toBeGreaterThanOrEqual(hull.y + hull.height);
  });

  it('preserves ordinary marker clearance and honors explicit zero/custom bounds without mutating anchors', () => {
    const base = { pointX: 50, pointY: 100 }, item = { x: 49, width: 2, height: 4 }, ui = 1.5, scaleX = 3, scaleY = 2;
    for (const extra of [{}, { clearanceX: null, clearanceY: null }]) {
      const f = anchorsFixture(500, 600, { bodyShape: 'fish', markers: [{ ...base, ...extra }], ui, scaleX, scaleY });
      expect(f.clear(item, 99, 1)).toBe(100 + 12 * ui / scaleY); expect(f.clear(item, 99, -1)).toBe(100 - 12 * ui / scaleY - item.height);
      expect(f.clear({ ...item, x: 50 + 12 * ui / scaleX + 1 }, 99, 1)).toBe(99);
    }
    const custom = anchorsFixture(500, 600, { bodyShape: 'fish', markers: [{ ...base, clearanceX: 0, clearanceY: 0 }] });
    expect(custom.clear({ ...item, x: 51 }, 99, 1)).toBe(99); expect(custom.clear(item, 99, 1)).toBe(100);
    const wide = anchorsFixture(500, 600, { bodyShape: 'fish', markers: [{ ...base, clearanceX: 30, clearanceY: 18 }] });
    expect(wide.clear({ ...item, x: 75 }, 99, 1)).toBe(118); expect(wide.clear(item, 99, -1)).toBe(78);
  });

  it('adds the brain hull only for the frog nervous scene, retaining ordinary and renal anchors elsewhere', () => {
    const markers = [{ id: 'ordinary', pointX: 12, pointY: 18 }];
    for (const [bodyShape, activeLayer] of [['frog', 'organs'], ['frog', 'skin'], ['frog', 'skeleton'], ['fish', 'nervous'], ['pig', 'nervous']]) {
      const f = anchorsFixture(500, 600, { bodyShape, activeLayer, markers });
      expect(f.calls).not.toHaveBeenCalled();
      const expected = markers.slice();
      if (bodyShape === 'frog' && activeLayer === 'organs') {
        production('frogRenalGeometry')(500, 600).kidneys.forEach(({ bounds: b }) => expected.push({
          pointX: (b.minX + b.maxX) * 500 / 2, pointY: (b.minY + b.maxY) * 600 / 2,
          clearanceX: (b.maxX - b.minX) * 500 / 2 + 3 * f.ui / f.scaleX,
          clearanceY: (b.maxY - b.minY) * 600 / 2 + 3 * f.ui / f.scaleY
        }));
      }
      expect(f.anchors).toEqual(expected.sort((a, b) => a.pointY - b.pointY));
    }
  });

  it.each(dimensions)('reserves projected whole-brain bounds for the depth caption before footprint transforms at %s by %s', (W, H) => {
    for (const mirror of [false, true]) {
      const f = captionFixture(W, H, { mirror }), before = f.ctx.state(), shared = structuredClone({ guidance: f.canvas._guidanceBoxes, hud: f.canvas._canvasHudBoxes }); f.draw();
      expect(f.geometryCalls).toHaveBeenCalledTimes(1); expect(f.geometryCalls).toHaveBeenCalledWith(W, H);
      const boxes = f.observations.placements[0].reservations.filter(box => box.priority === 10); expect(boxes).toHaveLength(1);
      expect(f.observations.screens[0].matrix).toEqual(f.entry);
      const b = geometry(W, H).bounds, reference = new Context(f.entry), screen = production('canvasScreenBox', { ctx: reference, canvas: { _dpr: 2 } }),
        projected = screen(b.minX * W, b.minY * H, (b.maxX - b.minX) * W, (b.maxY - b.minY) * H), padding = 3 * f.ui;
      expect(boxes[0]).toEqual({ x: projected.x - padding, y: projected.y - padding, width: projected.width + padding * 2, height: projected.height + padding * 2, priority: 10, keepClear: true });
      for (const p of samplePath(tracePath(geometry(W, H).body, W, H, f.entry))[0]) {
        expect(p.x / 2).toBeGreaterThanOrEqual(boxes[0].x + padding - 1e-10); expect(p.x / 2).toBeLessThanOrEqual(boxes[0].x + boxes[0].width - padding + 1e-10);
        expect(p.y / 2).toBeGreaterThanOrEqual(boxes[0].y + padding - 1e-10); expect(p.y / 2).toBeLessThanOrEqual(boxes[0].y + boxes[0].height - padding + 1e-10);
      }
      expect(f.canvas._guidanceBoxes).toEqual(shared.guidance); expect(f.canvas._canvasHudBoxes).toEqual(shared.hud); expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
    }
  });

  it('limits whole-brain depth-caption reservations to the frog nervous layer', () => {
    for (const [bodyShape, activeLayer] of [['frog', 'organs'], ['frog', 'skin'], ['fish', 'nervous'], ['pig', 'nervous']]) {
      const f = captionFixture(500, 600, { bodyShape, activeLayer }); f.draw(); expect(f.geometryCalls).not.toHaveBeenCalled();
      expect(f.observations.placements[0].reservations.some(box => box.priority === 10)).toBe(false);
    }
  });
});

