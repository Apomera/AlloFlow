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

const geometry = production('crayfishAntennalGeometry'), trace = production('traceCrayfishAntennalRegion');
function tracePath(region, W, H, matrix) { const ctx = new Context(matrix); trace(ctx, region, W, H); return ctx.path; }
const paints = ctx => ctx.events.filter(e => e.operation === 'fill' || e.operation === 'stroke');
function mutatePath(ctx) { ctx.beginPath(); ctx.moveTo(-9000, -9000); ctx.lineTo(-9001, -9001); }
function contaminate(ctx) {
  ctx.translate(23, -17); ctx.scale(.3, -.5); ctx.globalAlpha = .1; ctx.globalCompositeOperation = 'destination-out';
  ctx.setLineDash([17, 11]); ctx.shadowBlur = 19; ctx.lineCap = 'square'; mutatePath(ctx);
}
function fixture(overrides = {}, matrix) {
  const ctx = new Context(matrix);
  const contact = vi.fn((...args) => {
    ctx.events.push({ operation: 'contact', args, path: structuredClone(ctx.path), clips: [...ctx.clips] }); contaminate(ctx);
  });
  const finish = vi.fn((...args) => {
    ctx.events.push({ operation: 'finish', args, path: structuredClone(ctx.path), clips: [...ctx.clips] });
    ctx.clip(); contaminate(ctx);
  });
  const options = { width: 500, height: 600, detailed: true, lightDirection: 'left', contact, finish, ...overrides };
  const draw = production('drawCrayfishAntennalGlands', { crayfishAntennalGeometry: geometry, traceCrayfishAntennalRegion: trace });
  return { ctx, options, contact, finish, draw: () => draw(ctx, options), rawDraw: draw };
}
function sharedTarget(id) {
  return production('paintedSmallStructurePoint', { spec: { bodyShape: 'crayfish' }, crayfishAntennalGeometry: geometry,
    crayfishHepatopancreaticGeometry: production('crayfishHepatopancreaticGeometry') })({ id });
}
function actualWindow(W, H) {
  const ctx = new Context(); production('traceCrayfishVisceralWindow', { ctx, W, H, cx: W * .5, cy: H * .45 })(ctx); return ctx.path;
}
function actualLaterPaints(W, H, detailed) {
  const ctx = new Context(), start = source.indexOf('// Hepatopancreas lobes, dorsal heart, gonad, and feathery gills.'),
    gillStart = source.indexOf('drawCrayfishGillPlumes(ctx,', start), end = source.indexOf('});', gillStart) + 3;
  if (start < 0 || gillStart < start || end <= gillStart) throw Error('Missing actual crayfish later viscera');
  const contact = production('paintCurrentOrganContact', { ctx, sceneDetail: detailed, highContrastEnabled: false,
    d: { visualRealism: 'realistic' }, visualRealism: 'realistic', lightDirection: 'left' });
  const gills = production('drawCrayfishGillPlumes', { crayfishGillGeometry: production('crayfishGillGeometry') });
  const digestive = production('drawCrayfishHepatopancreas', {
    crayfishHepatopancreaticGeometry: production('crayfishHepatopancreaticGeometry'),
    traceCrayfishHepatopancreaticRegion: production('traceCrayfishHepatopancreaticRegion')
  });
  const bindings = { ctx, W, H, cx: W * .5, cy: H * .45, sceneDetail: detailed, crayAccessible: false,
    highContrastEnabled: false, crayRealistic: true, traceVisceralLobe: production('traceVisceralLobe', { ctx }),
    paintCurrentOrganContact: contact, finishCurrentTissuePath: () => {}, drawCrayfishGillPlumes: gills,
    drawCrayfishHepatopancreas: digestive,
    traceCrayfishVisceralWindow: production('traceCrayfishVisceralWindow', { ctx, W, H, cx: W * .5, cy: H * .45 }),
    liveTissueState: { moisture: 76 }, d: { lightIntensity: 68 }, lightDirection: 'left', specimenCondition: 'standard' };
  new Function(...Object.keys(bindings), source.slice(start, end))(...Object.values(bindings));
  expect(ctx.stack).toEqual([]);
  const records = paints(ctx).map((e, i) => ({ name: e.operation + '-' + i, paths: samplePath(e.path),
    fill: e.operation === 'fill', halfWidth: e.operation === 'stroke' ? e.width / 2 : 0 }));
  expect(records.filter(e => e.fill)).toHaveLength(4); // Paired digestive glands, heart, gonad; gills are strokes.
  expect(records.filter(e => !e.fill).length).toBeGreaterThan(50); return records;
}

describe('registered paired crayfish antennal complexes', () => {
  it.each(dimensions)('keeps both intact contours inside their original circles and actual window at %s by %s', (W, H) => {
    const g = geometry(W, H), window = samplePath(actualWindow(W, H)); expect(g.glands).toHaveLength(2);
    expect(g.glands.map(v => v.side)).toEqual([-1, 1]);
    for (const gland of g.glands) {
      const path = tracePath(gland.region, W, H), points = samplePath(path)[0], center = { x: gland.center.x * W, y: gland.center.y * H };
      expect(gland.region.curves).toHaveLength(6); expect(gland.region.curves.at(-1)[2]).toEqual(gland.region.start);
      expect(path.filter(op => op[0] === 'moveTo')).toHaveLength(1); expect(path.at(-1)).toEqual(['closePath']);
      expect(gland.center).toEqual({ x: .295, y: gland.side < 0 ? .412 : .488 });
      expect(gland.frame.radiusX).toBe(W * .012); expect(gland.frame.radiusY).toBeLessThanOrEqual(gland.frame.radiusX);
      for (const p of points) {
        expect(contains(p, window[0])).toBe(true); expect(distance(p, window) - .4 / 2).toBeGreaterThan(.35);
        expect(Math.hypot(p.x - center.x, p.y - center.y)).toBeLessThanOrEqual(W * .012 + 1e-10);
        expect(p.x / W).toBeGreaterThanOrEqual(gland.bounds.minX - 1e-12); expect(p.x / W).toBeLessThanOrEqual(gland.bounds.maxX + 1e-12);
        expect(p.y / H).toBeGreaterThanOrEqual(gland.bounds.minY - 1e-12); expect(p.y / H).toBeLessThanOrEqual(gland.bounds.maxY + 1e-12);
      }
      expect(contains(center, points)).toBe(true); expect(distance(center, [points])).toBeGreaterThan(1.5);
      expect(gland.extent.x).toBeCloseTo(Math.max(gland.center.x - gland.bounds.minX, gland.bounds.maxX - gland.center.x), 12);
      expect(gland.extent.y).toBeCloseTo(Math.max(gland.center.y - gland.bounds.minY, gland.bounds.maxY - gland.center.y), 12);
    }
    const first = samplePath(tracePath(g.glands[0].region, W, H))[0], second = samplePath(tracePath(g.glands[1].region, W, H))[0];
    expect(first.some(p => contains(p, second))).toBe(false); expect(second.some(p => contains(p, first))).toBe(false);
  });

  it.each(dimensions)('keeps both gland centers exposed after actual digestive glands, heart, gonad and gills at %s by %s', (W, H) => {
    const g = geometry(W, H);
    for (const detailed of [false, true]) for (const p of g.glands.map(v => ({ x: v.center.x * W, y: v.center.y * H }))) {
      for (const paint of actualLaterPaints(W, H, detailed)) {
        if (paint.fill) expect(paint.paths.some(points => contains(p, points)), paint.name).toBe(false);
        expect(distance(p, paint.paths) - paint.halfWidth, paint.name).toBeGreaterThan(30);
      }
    }
    expect(sharedTarget('green_gland')).toEqual(g.target); expect(g.target).toEqual(g.glands[0].center);
  });

  it.each(dimensions)('leaves the actual gastric-mill and hepatopancreas inspection targets clear at %s by %s', (W, H) => {
    const g = geometry(W, H);
    for (const id of ['gastric_mill', 'hepato']) {
      const target = sharedTarget(id), p = { x: target.x * W, y: target.y * H };
      for (const gland of g.glands) {
        const own = samplePath(tracePath(gland.region, W, H)); expect(contains(p, own[0]), id).toBe(false);
        expect(distance(p, own) - .4 / 2, id).toBeGreaterThan(35);
      }
    }
  });

  it('returns the painted target before independent jitter or view offsets in every presentation', () => {
    for (const mode of ['guided', 'realistic', 'accessible']) for (const view of ['dorsal', 'ventral', 'lateral', 'internal']) {
      const bindings = { spec: { bodyShape: 'crayfish' }, crayfishAntennalGeometry: geometry };
      const varied = production('variedOrganPoint', { paintedSmallStructurePoint: production('paintedSmallStructurePoint', bindings),
        d: { visualRealism: mode, anatomicalView: view }, visualRealism: mode,
        specimenVariationValue: () => { throw Error('A painted antennal target must not jitter'); },
        viewSpecificOrganPoint: () => { throw Error('A painted antennal target must not get generic offsets'); } });
      expect(varied({ id: 'green_gland', x: .3, y: .39 })).toEqual(geometry().target);
    }
  });

  it('returns independent deterministic anatomy and rejects unusable dimensions without touching a context', () => {
    const first = geometry(), saved = structuredClone(first); expect(geometry(500, 600)).toEqual(first);
    first.target.x = 9; first.glands[0].region.curves[0][0].x = 9; first.glands[1].center.y = 9; expect(geometry()).toEqual(saved);
    for (const [W, H] of [[0, 600], [.99, 600], [500, .5], [500, -1], [NaN, 600], [500, Infinity], ['bad', 600]]) expect(geometry(W, H)).toBeNull();
    for (const [W, H] of [[1, 10000], [10000, 1]]) expect(geometry(W, H).glands.every(g =>
      [g.region.start, ...g.region.curves.flat()].every(p => Number.isFinite(p.x) && Number.isFinite(p.y)))).toBe(true);
    const ctx = new Context(); for (const region of [null, {}, { start: {} }]) expect(trace(ctx, region, 500, 600)).toBe(false);
    expect(trace(null, saved.glands[0].region, 500, 600)).toBe(false); expect(ctx.path).toEqual([]); expect(ctx.events).toEqual([]);
  });
});

describe('bounded closed antennal surface rendering', () => {
  it.each(dimensions)('paints both actual contours and isolates path/state-mutating callbacks at %s by %s', (width, height) => {
    const f = fixture({ width, height }), before = f.ctx.state(), g = geometry(width, height); expect(f.draw()).toBe(true);
    const painting = paints(f.ctx); expect(painting.map(e => e.operation)).toEqual(['fill', 'stroke', 'fill', 'stroke']);
    expect(f.contact).toHaveBeenCalledTimes(2); expect(f.finish).toHaveBeenCalledTimes(2);
    g.glands.forEach((gland, i) => {
      const expected = tracePath(gland.region, width, height), contact = f.ctx.events.filter(e => e.operation === 'contact')[i],
        finish = f.ctx.events.filter(e => e.operation === 'finish')[i];
      expect(painting[i * 2].path).toEqual(expected); expect(painting[i * 2 + 1].path).toEqual(expected);
      expect(painting[i * 2].fill.kind).toBe('linear'); expect(painting[i * 2].fill.stops).toHaveLength(4);
      expect(contact.path).toEqual(expected); expect(contact.clips).toEqual(['specimen']);
      expect(contact.args).toEqual([gland.extent.x * width, gland.extent.y * height]);
      expect(finish.path).toEqual(expected); expect(finish.clips).toEqual(['specimen', expected]);
      expect(finish.args).toEqual([gland.center.x * width, gland.center.y * height, gland.extent.x * width,
        gland.extent.y * height, 'capsule', 'cray-antennal-' + gland.side]);
      const clips = f.ctx.events.filter(e => e.operation === 'clip').slice(i * 2, i * 2 + 2);
      expect(clips).toHaveLength(2); expect(clips.every(e => JSON.stringify(e.path) === JSON.stringify(expected))).toBe(true);
    });
    for (const e of painting) {
      expect(e.alpha).toBe(before.globalAlpha); expect(e.matrix).toEqual(before.matrix); expect(e.composite).toBe('source-over');
      expect(e.clips).toEqual(['specimen']); expect(e.dash).toEqual([]); expect(e.shadow).toEqual([0, 0, 0]);
      expect(e.cap).toBe('round'); expect(e.join).toBe('round');
    }
    expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
  });

  it.each(dimensions)('keeps both complete silhouettes as flat shadow-free tissue in clarity mode at %s by %s', (width, height) => {
    const f = fixture({ width, height, detailed: false }), before = f.ctx.state(); expect(f.draw()).toBe(true);
    const painting = paints(f.ctx), glands = geometry(width, height).glands;
    expect(painting.map(e => e.operation)).toEqual(['fill', 'stroke', 'fill', 'stroke']);
    glands.forEach((g, i) => {
      const expected = tracePath(g.region, width, height); expect(painting[i * 2].path).toEqual(expected);
      expect(painting[i * 2 + 1].path).toEqual(expected); expect(typeof painting[i * 2].fill).toBe('string');
    });
    expect(f.contact).not.toHaveBeenCalled(); expect(f.finish).not.toHaveBeenCalled();
    expect(f.ctx.events.some(e => e.operation === 'clip' || e.operation === 'gradient')).toBe(false);
    for (const e of painting) {
      expect(e.alpha).toBe(before.globalAlpha); expect(e.composite).toBe('source-over'); expect(e.dash).toEqual([]);
      expect(e.shadow).toEqual([0, 0, 0]); expect(e.cap).toBe('round'); expect(e.join).toBe('round');
    }
    expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
  });

  it.each(['left', 'right', 'raking', 'unknown'])('relights both glands under %s without moving the contours or target', lightDirection => {
    const f = fixture({ lightDirection }); f.draw();
    const fills = paints(f.ctx).filter(e => e.operation === 'fill'), glands = geometry().glands;
    fills.forEach((e, i) => {
      expect(e.path).toEqual(tracePath(glands[i].region, 500, 600)); expect(e.fill.stops.map(s => s[0])).toEqual([0, .35, .75, 1]);
      const dx = e.fill.args[0] - e.fill.args[2], dy = e.fill.args[1] - e.fill.args[3];
      if (lightDirection === 'right') expect(dx).toBeGreaterThan(0); else expect(dx).toBeLessThan(0);
      if (lightDirection === 'raking') expect(dy).toBeGreaterThan(0); else expect(dy).toBeLessThan(0);
    });
    expect(sharedTarget('green_gland')).toEqual(geometry().target);
  });

  it.each([.94, .90])('preserves mirrored/sheared placement and inherited tissue opacity %s across both finishes', alpha => {
    const f = fixture({}, [-2.7, .2, .3, 3, 800, -175]); f.ctx.globalAlpha = alpha; const before = f.ctx.state(); f.draw();
    geometry().glands.forEach((g, i) => {
      const expected = tracePath(g.region, 500, 600, before.matrix);
      expect(paints(f.ctx)[i * 2].path).toEqual(expected); expect(f.ctx.events.filter(e => e.operation === 'finish')[i].clips).toEqual(['specimen', expected]);
    });
    expect(paints(f.ctx).every(e => e.alpha === alpha && JSON.stringify(e.matrix) === JSON.stringify(before.matrix))).toBe(true);
    expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
  });

  it.each(['contact-first', 'contact-second', 'gradient', 'fill', 'border', 'clip', 'finish-first', 'finish-second', 'normalize'])(
    'restores all parent state and clip depth after a %s exception', location => {
      const f = fixture(), before = f.ctx.state(), fail = () => {
        f.ctx.translate(7, -3); f.ctx.globalAlpha = .03; f.ctx.shadowBlur = 31; mutatePath(f.ctx); throw Error('Injected antennal error');
      };
      if (location.startsWith('contact')) {
        let calls = 0; f.options.contact = (...args) => { if (++calls === (location.endsWith('second') ? 2 : 1)) fail(); f.contact(...args); };
      } else if (location.startsWith('finish')) {
        let calls = 0; f.options.finish = (...args) => { if (++calls === (location.endsWith('second') ? 2 : 1)) fail(); f.finish(...args); };
      } else if (location === 'gradient') f.ctx.createLinearGradient = fail;
      else if (location === 'fill') f.ctx.fill = fail;
      else if (location === 'border') f.ctx.stroke = fail;
      else if (location === 'clip') f.ctx.clip = fail;
      else f.ctx.setLineDash = fail;
      expect(f.draw).toThrow('Injected antennal error'); expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
    });

  it('safely omits optional callbacks and performs no drawing for invalid renderer arguments', () => {
    const f = fixture({ contact: null, finish: null }); expect(f.draw()).toBe(true); expect(paints(f.ctx)).toHaveLength(4);
    expect(f.ctx.events.some(e => e.operation === 'clip')).toBe(false); expect(f.ctx.stack).toEqual([]);
    for (const input of [{ width: NaN }, { height: Infinity }, { width: 0 }, { height: .5 }, { width: undefined }]) {
      const invalid = fixture(input), before = invalid.ctx.state(); expect(invalid.draw()).toBe(false);
      expect(invalid.ctx.events).toEqual([]); expect(invalid.ctx.state()).toEqual(before); expect(invalid.ctx.stack).toEqual([]);
    }
    expect(f.rawDraw(null, f.options)).toBe(false); expect(f.rawDraw(new Context())).toBe(false);
    expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_dissection.js', 'utf8')).toBe(source);
  });
});

describe('actual antennal window and detail-gate integration', () => {
  function wrapper() {
    const marker = source.indexOf('// The paired antennal complexes sit within'), end = source.indexOf('// Hepatopancreas lobes, dorsal heart, gonad, and feathery gills.', marker);
    if (marker < 0 || end < marker) throw Error('Missing native gland window wrapper');
    return source.slice(marker, end);
  }
  function run(ctx, flags, draw) {
    const W = 500, H = 600, contact = () => {}, finish = () => {}, bindings = { ctx, W, H, ...flags, lightDirection: 'raking',
      traceCrayfishVisceralWindow: production('traceCrayfishVisceralWindow', { ctx, W, H, cx: W * .5, cy: H * .45 }),
      drawCrayfishAntennalGlands: draw, paintCurrentOrganContact: contact, finishCurrentTissuePath: finish };
    new Function(...Object.keys(bindings), wrapper())(...Object.values(bindings)); return { contact, finish };
  }
  it('uses the actual visceral-window clip before the shared guided/realistic detail gate and leaves other organs outside the wrapper', () => {
    const W = 500, H = 600, ctx = new Context(), before = ctx.state(), calls = [], expected = actualWindow(W, H);
    for (const sceneDetail of [true, false]) for (const crayAccessible of [true, false]) for (const highContrastEnabled of [true, false]) {
      const callbacks = run(ctx, { sceneDetail, crayAccessible, highContrastEnabled }, (context, options) => {
        calls.push({ context, options, clips: structuredClone(context.clips) });
      });
      expect(calls.at(-1)).toEqual({ context: ctx, clips: ['specimen', expected], options: { width: W, height: H,
        detailed: sceneDetail && !crayAccessible && !highContrastEnabled, lightDirection: 'raking', ...callbacks } });
      expect(ctx.state()).toEqual(before); expect(ctx.stack).toEqual([]);
    }
    expect(wrapper()).not.toContain('var craySoftDetail');
  });
  it('releases the actual parent window frame when clipping or the gland renderer fails', () => {
    for (const location of ['clip', 'renderer']) {
      const ctx = new Context(), before = ctx.state(), fail = () => { throw Error('Injected window error'); };
      if (location === 'clip') ctx.clip = fail;
      expect(() => run(ctx, { sceneDetail: true, crayAccessible: false, highContrastEnabled: false }, fail)).toThrow('Injected window error');
      expect(ctx.state()).toEqual(before); expect(ctx.stack).toEqual([]);
    }
  });
});

describe('compact antennal inspection and paired-caption clearance', () => {
  function inspectionProfile(W, H, spec = { bodyShape: 'crayfish' }) {
    return production('structureInspectionFootprint', { W, H, spec, specimen: spec.bodyShape,
      organs: Array.from({ length: 7 }, (_, i) => ({ id: 'organ-' + i })), structureOpticalDepth: () => 'deep' });
  }
  function captionFixture(W, H, org = { id: 'green_gland', name: 'Green Glands' }, spec = { bodyShape: 'crayfish' }) {
    const entry = [-4, .18, .24, 4, 950, -180], ctx = new Context(entry), canvas = { _dpr: 2,
      _guidanceBoxes: [{ x: 11, y: 13, width: 17, height: 19 }], _canvasHudBoxes: [{ x: 21, y: 23, width: 27, height: 29 }] };
    const observations = { placements: [], screenCalls: [], captions: [] }, ui = 1.4, geometryCalls = vi.fn(geometry);
    ctx.measureText = () => ({ width: 90 }); ctx.roundRect = () => {};
    ctx.fillText = text => observations.captions.push(text);
    const bindings = { ctx, canvas, W, H, spec, specimen: spec.bodyShape, d: { visualRealism: 'realistic', quizMode: true }, visualRealism: 'realistic',
      highContrastEnabled: false, focusEntryProgress: .35, specimenScale: { x: -1, y: 1 }, zoom: 2,
      canvasUiScale: ui, labelUiScale: ui, specimenTextScaleX: 2, specimenTextScaleY: 2, labelScreenBottom: H - 30,
      hudCompassLayout: { compact: false }, hudCompassBox: null, organs: [], adaptiveHotspotById: {},
      crayfishAntennalGeometry: geometryCalls, structureInspectionFootprint: inspectionProfile(W, H, spec),
      fitTextToWidth: text => text, rememberCanvasGuidanceBox: () => {},
      placeCanvasHudPanel: (x, y, width, height, reservations) => {
        observations.placements.push({ x, y, width, height, reservations }); return { x, y };
      } };
    const screen = production('canvasScreenBox', { ctx, canvas });
    bindings.canvasScreenBox = (...args) => {
      observations.screenCalls.push({ args, matrix: [...ctx.matrix] }); return screen(...args);
    };
    const draw = production('drawStructureInspectionFootprint', bindings), target = geometry(W, H).target;
    return { ctx, canvas, entry, ui, observations, geometryCalls, draw: () => draw(org, target.x * W, target.y * H, true, false, 'visible', null) };
  }

  it.each(dimensions)('classifies the intact green gland as COMPACT while retaining other gland and gill classes at %s by %s', (W, H) => {
    const profile = inspectionProfile(W, H), gland = profile({ id: 'green_gland', name: 'Green Glands' });
    expect(gland.morphology).toBe('compact'); expect(gland.morphologyLabel).toBe('COMPACT'); expect(gland.depth).toBe('deep');
    expect(gland).toEqual(profile({ id: 'reference', name: 'Compact structure' }));
    expect(profile({ id: 'hepato', name: 'Hepatopancreas' }).morphology).toBe('lobed');
    expect(profile({ id: 'other_gland', name: 'Other gland' }).morphology).toBe('lobed');
    const gills = profile({ id: 'gills_c', name: 'Gills' }); expect(gills.morphology).toBe('lobed'); expect(gills.morphologyLabel).toBe('FILAMENTS');
  });

  it.each(dimensions)('reserves both actual projected gland bounds before footprint transforms at %s by %s', (W, H) => {
    const f = captionFixture(W, H), before = f.ctx.state(), shared = structuredClone({ guidance: f.canvas._guidanceBoxes, hud: f.canvas._canvasHudBoxes });
    f.draw(); expect(f.geometryCalls).toHaveBeenCalledTimes(1); expect(f.geometryCalls).toHaveBeenCalledWith(W, H);
    const reservations = f.observations.placements[0].reservations.filter(box => box.priority === 10);
    expect(reservations).toHaveLength(2); expect(f.observations.captions).toEqual(['DEEP \u00B7 COMPACT']);
    expect(f.observations.screenCalls.slice(0, 2).every(call => JSON.stringify(call.matrix) === JSON.stringify(f.entry))).toBe(true);
    const reference = new Context(f.entry), screen = production('canvasScreenBox', { ctx: reference, canvas: { _dpr: 2 } }), padding = 3 * f.ui;
    geometry(W, H).glands.forEach((gland, i) => {
      const b = gland.bounds, projected = screen(b.minX * W, b.minY * H, (b.maxX - b.minX) * W, (b.maxY - b.minY) * H);
      expect(reservations[i]).toEqual({ x: projected.x - padding, y: projected.y - padding,
        width: projected.width + padding * 2, height: projected.height + padding * 2, priority: 10, keepClear: true });
      for (const p of samplePath(tracePath(gland.region, W, H, f.entry))[0]) {
        const x = p.x / 2, y = p.y / 2, box = reservations[i];
        expect(x).toBeGreaterThanOrEqual(box.x + padding - 1e-10); expect(x).toBeLessThanOrEqual(box.x + box.width - padding + 1e-10);
        expect(y).toBeGreaterThanOrEqual(box.y + padding - 1e-10); expect(y).toBeLessThanOrEqual(box.y + box.height - padding + 1e-10);
      }
    });
    expect(f.canvas._guidanceBoxes).toEqual(shared.guidance); expect(f.canvas._canvasHudBoxes).toEqual(shared.hud);
    expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
  });

  it('limits paired-organ reservations to green-gland captions in the crayfish specimen', () => {
    for (const [org, spec] of [[{ id: 'heart_c', name: 'Heart' }, { bodyShape: 'crayfish' }],
      [{ id: 'green_gland', name: 'Green Glands' }, { bodyShape: 'fish' }]]) {
      const f = captionFixture(500, 600, org, spec); f.draw(); expect(f.geometryCalls).not.toHaveBeenCalled();
      expect(f.observations.placements[0].reservations.some(box => box.priority === 10)).toBe(false);
    }
  });
});

