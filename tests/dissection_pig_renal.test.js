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


function actualAnchors(W, H) {
  const anchor = /var pigStomachX = [^;\r\n]+;\s*var pigStomachY = [^;\r\n]+;/.exec(source);
  if (!anchor) throw Error('Missing actual pig visceral anchors');
  return new Function('W', 'H', 'cx', 'cy', anchor[0] + '; return { pigStomachX, pigStomachY };')(W, H, W * .5, H * .45);
}
function executeSection(startMarker, endMarker, W, H, extras = {}, fromMarker = false, includeEnd = false) {
  const marker = source.indexOf(startMarker), begin = fromMarker ? marker : source.indexOf('ctx.beginPath()', marker);
  const end = source.indexOf(endMarker, begin);
  if (marker < 0 || begin < marker || end < begin) throw Error('Missing production path: ' + startMarker);
  const ctx = new Context(), bindings = { ...actualAnchors(W, H), ...(typeof extras === 'function' ? extras(ctx) : extras) };
  const suffix = '; return { pigBladderX: typeof pigBladderX === "number" ? pigBladderX : null, pigBladderY: typeof pigBladderY === "number" ? pigBladderY : null };';
  const variables = new Function('ctx', 'W', 'H', 'cx', 'cy', ...Object.keys(bindings),
    source.slice(begin, end + (includeEnd ? endMarker.length : 0)) + suffix)(ctx, W, H, W * .5, H * .45, ...Object.values(bindings));
  return { ctx, variables };
}
function actualJejunum(W, H) {
  const marker = source.indexOf('// Jejunal loops sit ventrally while the porcine spiral colon forms a watch-spring coil.');
  const begin = source.indexOf('drawEntericBowel(', marker), ending = "'pig-small-intestine');", end = source.indexOf(ending, begin);
  if (marker < 0 || begin < marker || end < begin) throw Error('Missing actual pig jejunum');
  let result;
  new Function('drawEntericBowel', 'W', 'H', 'cx', 'cy', source.slice(begin, end + ending.length))((start, curves, width) => {
    const ctx = new Context(); ctx.beginPath(); ctx.moveTo(...start); for (const curve of curves) ctx.bezierCurveTo(...curve);
    result = { name: 'jejunum', start, curves, width, paths: samplePath(ctx.path) };
  }, W, H, W * .5, H * .45);
  return result;
}
function actualLaterPaths(W, H) {
  const pancreaticGeometry = production('pigPancreaticGeometry'), pancreaticTrace = production('tracePigPancreaticRegion');
  const pancreaticDraw = production('drawPigPancreaticSurface', { pigPancreaticGeometry: pancreaticGeometry, tracePigPancreaticRegion: pancreaticTrace });
  const pancreaticFills = [true, false].map(detailed => {
    const ctx = new Context(); pancreaticDraw(ctx, { width: W, height: H, detailed });
    const fill = ctx.events.find(e => e.operation === 'fill');
    if (!fill || fill.path.at(-1)[0] !== 'closePath') throw Error('Missing actual closed pancreatic fill');
    return { name: detailed ? 'pancreas-detailed' : 'pancreas-fallback', paths: samplePath(fill.path) };
  });
  const splenic = production('pigSplenicGeometry')(W, H), spleen = new Context();
  production('tracePigSplenicRegion')(spleen, splenic.region, W, H);
  const membrane = executeSection('// Jejunal loops sit ventrally while the porcine spiral colon forms a watch-spring coil.', 'ctx.fillStyle', W, H);
  const filled = [...pancreaticFills,
    { name: 'spleen', paths: samplePath(spleen.path) }, { name: 'mesentery', paths: samplePath(membrane.ctx.path) }];
  let bladderVariables;
  for (const sceneDetail of [true, false]) {
    const tracer = (ctx, ...args) => production('traceVisceralFluidSac', { ctx, sceneDetail,
      highContrastEnabled: false, d: { visualRealism: 'realistic' }, visualRealism: 'realistic' })(...args);
    const bladder = executeSection('var pigBladderX =', 'var pigBladderVolume', W, H,
      ctx => ({ traceVisceralFluidSac: (...args) => tracer(ctx, ...args) }), true);
    filled.push({ name: sceneDetail ? 'bladder-detailed' : 'bladder-fallback', paths: samplePath(bladder.ctx.path) });
    bladder.ctx.restore();
    bladderVariables = bladder.variables;
  }
  const lineEvents = (ctx, name) => ctx.events.filter(e => e.operation === 'stroke').map((e, i) => ({
    name: name + (i ? '-' + i : ''), paths: samplePath(e.path), width: e.width }));
  const strokes = [actualJejunum(W, H)];
  const colonStart = source.indexOf('var colonCx ='), tubeStart = source.indexOf('strokeAnatomicalTube(', colonStart), colonEnd = source.indexOf(');', tubeStart) + 2;
  if (colonStart < 0 || tubeStart < colonStart || colonEnd <= tubeStart) throw Error('Missing actual spiral colon');
  const colon = new Context();
  new Function('ctx', 'W', 'H', 'cx', 'cy', 'strokeAnatomicalTube', source.slice(colonStart, colonEnd))(
    colon, W, H, W * .5, H * .45, width => { colon.lineWidth = width; colon.stroke(); });
  strokes.push(...lineEvents(colon, 'spiral-colon'));
  const urachus = executeSection('ctx.beginPath();ctx.moveTo(pigBladderX-W*0.008', 'ctx.stroke();', W, H, bladderVariables, true, true);
  strokes.push(...lineEvents(urachus.ctx, 'urachus'));
  const vein = executeSection('// Umbilical vein courses to the liver;', 'ctx.stroke();', W, H, {}, false, true);
  strokes.push(...lineEvents(vein.ctx, 'umbilical-vein'));
  const arteries = executeSection('[-1,1].forEach(function (arterySide)', '});', W, H, bladderVariables, true, true);
  strokes.push(...lineEvents(arteries.ctx, 'umbilical-artery'));
  return { filled, strokes };
}


const geometry = production('pigRenalGeometry'), trace = production('tracePigRenalRegion');
function tracePath(region, W, H, matrix) { const ctx = new Context(matrix); trace(ctx, region, W, H); return ctx.path; }
const paints = ctx => ctx.events.filter(e => e.operation === 'fill' || e.operation === 'stroke');
function contaminate(ctx) {
  ctx.translate(23, -17); ctx.scale(.3, -.5); ctx.globalAlpha = .1; ctx.globalCompositeOperation = 'destination-out';
  ctx.setLineDash([17, 11]); ctx.shadowBlur = 19; ctx.lineCap = 'square'; ctx.beginPath(); ctx.moveTo(-9000, -9000); ctx.lineTo(-9001, -9001);
}
function fixture(overrides = {}, matrix) {
  const ctx = new Context(matrix); ctx.globalAlpha = .84;
  const contact = vi.fn((...args) => {
    ctx.events.push({ operation: 'contact', args, path: structuredClone(ctx.path), clips: [...ctx.clips] }); contaminate(ctx);
  });
  const finish = vi.fn((...args) => {
    ctx.events.push({ operation: 'finish', args, path: structuredClone(ctx.path), clips: [...ctx.clips] }); ctx.clip(); contaminate(ctx);
  });
  const options = { width: 500, height: 600, detailed: true, lightDirection: 'left', contact, finish, ...overrides };
  const draw = production('drawPigRenalComplex', { pigRenalGeometry: geometry, tracePigRenalRegion: trace });
  return { ctx, options, contact, finish, draw: () => draw(ctx, options), rawDraw: draw };
}
function actualTorso(W, H) {
  const ctx = new Context(), start = source.indexOf('var tracePigBody = function tracePigBody()'), end = source.indexOf('function drawPigLimb', start);
  if (start < 0 || end <= start) throw Error('Missing actual pig torso');
  new Function('ctx', 'W', 'H', 'cx', 'cy', source.slice(start, end) + ';tracePigBody();')(ctx, W, H, W * .5, H * .45);
  return ctx.path;
}
function actualOpening(W, H) {
  const ctx = new Context(); production('tracePigCoelom', { ctx, W, H, cx: W * .5, cy: H * .45 })(ctx); return ctx.path;
}
function nativeRenalBlock() {
  const start = source.indexOf('// Bean-shaped kidneys stay dorsal and posterior, one partly occluded by bowel.'),
    end = source.indexOf('// Monogastric stomach, spleen, and pancreas share a visible spatial relationship.', start);
  if (start < 0 || end <= start) throw Error('Missing native pig renal section'); return source.slice(start, end);
}
function runNative(W, H, { detail = true, accessible = false, highContrast = false } = {}) {
  const ctx = new Context(); ctx.globalAlpha = accessible ? .95 : .84;
  const before = ctx.state(), calls = [], opening = actualOpening(W, H);
  const draw = vi.fn((target, options) => calls.push({ alpha: target.globalAlpha, clips: [...target.clips], options }));
  const traceCoelom = vi.fn(target => { target.path = structuredClone(opening); });
  const bindings = { ctx, W, H, cx: W * .5, cy: H * .45, sceneDetail: detail, pigAccessible: accessible,
    highContrastEnabled: highContrast, lightDirection: 'raking', paintCurrentOrganContact: () => {}, finishCurrentTissuePath: () => {},
    drawPigRenalComplex: draw, tracePigCoelom: traceCoelom };
  new Function(...Object.keys(bindings), nativeRenalBlock())(...Object.values(bindings)); return { ctx, before, draw, traceCoelom, calls, opening };
}

describe('registered intact paired porcine renal surfaces', () => {
  it.each(dimensions)('retains the established physical six-curve bean surfaces at %s by %s', (W, H) => {
    const g = geometry(W, H), torso = samplePath(actualTorso(W, H))[0]; expect(g.kidneys.map(k => k.side)).toEqual([-1, 1]);
    const oldCourses = [[.60,-1.02,1,-.70,.82,-.36],[.68,-.19,.30,-.24,.27,0],[.29,.25,.70,.17,.84,.43],
      [.97,.78,.48,1.04,-.12,1],[-.80,.98,-1.04,.50,-1,0],[-1,-.65,-.70,-1.04,-.10,-1]];
    for (const k of g.kidneys) {
      const path = tracePath(k.body, W, H), points = samplePath(path)[0];
      expect(k.center.x).toBeCloseTo(.5 + .115 + k.side * .028, 12); expect(k.center.y).toBeCloseTo(.45 - (.06 - k.side * .008), 12);
      expect(k.rotation).toBe(.12); expect(k.hilumDirection).toBe(-k.side); expect(k.opacity).toBe(k.side < 0 ? .52 : .84);
      expect(k.body.curves).toHaveLength(6); expect(k.body.curves.at(-1)[2]).toEqual(k.body.start); expect(path.at(-1)).toEqual(['closePath']);
      const co = Math.cos(.12), si = Math.sin(.12), local = p => { const dx = p.x * W - k.center.x * W, dy = p.y * H - k.center.y * H;
        return [(dx * co + dy * si) / (W * .028 * k.hilumDirection), (-dx * si + dy * co) / (H * .045)]; };
      expect(local(k.body.start)[0]).toBeCloseTo(-.10, 10); expect(local(k.body.start)[1]).toBeCloseTo(-1, 10);
      k.body.curves.forEach((curve, i) => curve.forEach((p, j) => { const pair = local(p); expect(pair[0]).toBeCloseTo(oldCourses[i][j * 2], 10); expect(pair[1]).toBeCloseTo(oldCourses[i][j * 2 + 1], 10); }));
      for (const p of points) {
        expect(contains(p, torso)).toBe(true); expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
        expect(p.x / W).toBeGreaterThanOrEqual(k.bounds.minX - 1e-12); expect(p.x / W).toBeLessThanOrEqual(k.bounds.maxX + 1e-12);
        expect(p.y / H).toBeGreaterThanOrEqual(k.bounds.minY - 1e-12); expect(p.y / H).toBeLessThanOrEqual(k.bounds.maxY + 1e-12);
      }
      expect(k.bounds).toEqual(k.body.bounds); expect(k.extent).toEqual(k.body.extent);
    }
  });

  it.each(dimensions)('contains medial relief and a complete selectable capsule patch at %s by %s', (W, H) => {
    const g = geometry(W, H), opening = samplePath(actualOpening(W, H))[0], target = { x: g.target.x * W, y: g.target.y * H };
    expect(g.target).toEqual({ x: .653, y: .390 });
    for (const k of g.kidneys) {
      const body = samplePath(tracePath(k.body, W, H))[0], hilum = samplePath(tracePath(k.hilum, W, H), 80)[0];
      expect(k.hilum.curves).toHaveLength(4); expect(k.hilum.curves.at(-1)[2]).toEqual(k.hilum.start);
      for (const p of hilum) { expect(contains(p, body)).toBe(true); expect(distance(p, [body])).toBeGreaterThan(.7); }
      expect(contains(target, body)).toBe(k.side === 1);
      // Existing raw contours straddle the dorsal rim; native integration must clip them to the opening.
      expect(body.some(p => !contains(p, opening))).toBe(true); expect(body.some(p => contains(p, opening))).toBe(true);
    }
    const near = g.kidneys[1], body = samplePath(tracePath(near.body, W, H)), hilum = samplePath(tracePath(near.hilum, W, H));
    expect(distance(target, body) - .7 / 2).toBeGreaterThan(5.4); expect(distance(target, [opening])).toBeGreaterThan(3);
    for (const dx of [-.5, 0, .5]) for (const dy of [-.5, 0, .5]) {
      const p = { x: target.x + dx, y: target.y + dy }; expect(contains(p, body[0])).toBe(true); expect(contains(p, opening)).toBe(true);
      expect(contains(p, hilum[0])).toBe(false); expect(distance(p, hilum)).toBeGreaterThan(2);
    }
  });

  it.each(dimensions)('keeps the registered capsule patch clear of actual later viscera and fetal vessels at %s by %s', (W, H) => {
    const g = geometry(W, H), p = { x: g.target.x * W, y: g.target.y * H }, later = actualLaterPaths(W, H);
    const gastric = production('pigGastricGeometry')(W, H), stomach = new Context(), duodenum = new Context();
    production('tracePigGastricRegion')(stomach, gastric.stomach, W, H); production('tracePigGastricRegion')(duodenum, gastric.duodenum, W, H);
    later.filled.push({ name: 'stomach', paths: samplePath(stomach.path) }); later.strokes.push({ name: 'duodenum', paths: samplePath(duodenum.path), width: W * .0105 });
    expect(later.filled.map(e => e.name)).toEqual(['pancreas-detailed', 'pancreas-fallback', 'spleen', 'mesentery', 'bladder-detailed', 'bladder-fallback', 'stomach']);
    expect(later.strokes.map(e => e.name)).toEqual(['jejunum', 'spiral-colon', 'urachus', 'umbilical-vein', 'umbilical-artery', 'umbilical-artery-1', 'duodenum']);
    for (const fill of later.filled) { expect(fill.paths[0].length).toBeGreaterThan(100); expect(contains(p, fill.paths[0]), fill.name).toBe(false); expect(distance(p, fill.paths), fill.name).toBeGreaterThan(7); }
    for (const line of later.strokes) { expect(line.width).toBeGreaterThan(0); expect(distance(p, line.paths) - line.width / 2, line.name).toBeGreaterThan(7); }
  });

  it('returns fresh finite anatomy and rejects unusable sizes before drawing', () => {
    const first = geometry(), saved = structuredClone(first); expect(geometry(500, 600)).toEqual(saved);
    first.target.x = 5; first.kidneys[0].body.curves[0][0].x = 5; first.kidneys[1].hilum.start.y = -3; expect(geometry()).toEqual(saved);
    for (const [W, H] of [[0, 600], [.99, 600], [500, .5], [NaN, 600], [500, Infinity], ['bad', 600]]) expect(geometry(W, H)).toBeNull();
    for (const [W, H] of [[1, 10000], [10000, 1]]) expect(geometry(W, H).kidneys.every(k => [k.body, k.hilum].every(r =>
      [r.start, ...r.curves.flat()].every(p => Number.isFinite(p.x) && Number.isFinite(p.y))))).toBe(true);
    const ctx = new Context(); for (const r of [null, {}, { start: {} }]) expect(trace(ctx, r, 500, 600)).toBe(false);
    expect(trace(null, saved.kidneys[0].body, 500, 600)).toBe(false); expect(ctx.path).toEqual([]); expect(ctx.events).toEqual([]);
  });
});

describe('smooth continuous renal capsule rendering', () => {
  it.each(dimensions)('isolates both callbacks and finishes each exact capsule once at %s by %s', (width, height) => {
    const f = fixture({ width, height }), before = f.ctx.state(), g = geometry(width, height); expect(f.draw()).toBe(true);
    const records = paints(f.ctx); expect(records).toHaveLength(6); expect(f.contact).toHaveBeenCalledTimes(2); expect(f.finish).toHaveBeenCalledTimes(2);
    g.kidneys.forEach((k, i) => {
      const whole = tracePath(k.body, width, height), relief = tracePath(k.hilum, width, height), fill = records[i * 3], border = records[i * 3 + 1], hilum = records[i * 3 + 2];
      expect(fill.path).toEqual(whole); expect(border.path).toEqual(whole); expect(hilum.path).toEqual(relief);
      expect(fill.fill.kind).toBe('linear'); expect(fill.fill.stops.map(s => s[0])).toEqual([0, .34, .74, 1]);
      expect(fill.clips).toEqual(['specimen']); expect(hilum.clips).toEqual(['specimen', whole]);
      for (const record of [fill, border, hilum]) {
        expect(record.alpha).toBeCloseTo(.84 * k.opacity, 12); expect(record.composite).toBe('source-over'); expect(record.dash).toEqual([]);
        expect(record.cap).toBe('round'); expect(record.join).toBe('round'); expect(record.shadow).toEqual([0, 0, 0]);
      }
      const contact = f.ctx.events.filter(e => e.operation === 'contact')[i], finish = f.ctx.events.filter(e => e.operation === 'finish')[i];
      expect(contact.path).toEqual(whole); expect(contact.clips).toEqual(['specimen']); expect(finish.path).toEqual(whole); expect(finish.clips).toEqual(['specimen', whole]);
      expect(f.contact).toHaveBeenNthCalledWith(i + 1, k.extent.x * width, k.extent.y * height);
      expect(f.finish).toHaveBeenNthCalledWith(i + 1, k.body.center.x * width, k.body.center.y * height, k.extent.x * width, k.extent.y * height, 'capsule', 'pig-kidney-' + k.side);
    });
    expect(f.ctx.events.filter(e => e.operation === 'clip')).toHaveLength(4); expect(f.ctx.events.filter(e => e.operation === 'gradient')).toHaveLength(2);
    expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
  });

  it.each(dimensions)('retains the same semantic bean and hilum surfaces in flat mode at %s by %s', (width, height) => {
    const f = fixture({ width, height, detailed: false }), before = f.ctx.state(); expect(f.draw()).toBe(true);
    const records = paints(f.ctx); expect(records).toHaveLength(6); expect(f.contact).not.toHaveBeenCalled(); expect(f.finish).not.toHaveBeenCalled();
    expect(f.ctx.events.some(e => e.operation === 'gradient')).toBe(false);
    geometry(width, height).kidneys.forEach((k, i) => {
      expect(records[i * 3].path).toEqual(tracePath(k.body, width, height)); expect(records[i * 3 + 1].path).toEqual(tracePath(k.body, width, height));
      expect(records[i * 3 + 2].path).toEqual(tracePath(k.hilum, width, height)); expect(records[i * 3].fill).toBe('#78463a'); expect(records[i * 3 + 1].stroke).toBe('#4c2c26');
    });
    expect(f.ctx.events.filter(e => e.operation === 'clip')).toHaveLength(2); expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
  });

  it.each([['left', [-1, -.14]], ['right', [1, -.14]], ['raking', [-.72, .70]], ['unknown', [-.12, -1]]])('uses the same physical %s lamp on both capsules', (lightDirection, light) => {
    const f = fixture({ lightDirection }); f.draw(); const g = geometry(), gradients = f.ctx.events.filter(e => e.operation === 'gradient'), len = Math.hypot(...light);
    gradients.forEach((e, i) => { const k = g.kidneys[i], [x1,y1,x2,y2] = e.gradient.args;
      expect((x1 + x2) / 2).toBeCloseTo(k.body.center.x * 500, 10); expect((y1 + y2) / 2).toBeCloseTo(k.body.center.y * 600, 10);
      expect((x1 - x2) / (2 * k.extent.x * 500)).toBeCloseTo(light[0] / len, 10); expect((y1 - y2) / (2 * k.extent.y * 600)).toBeCloseTo(light[1] / len, 10);
    });
  });

  it.each([.76, .95])('preserves inherited affine state and tissue opacity %s', alpha => {
    const matrix = [-1.7, .14, .25, .8, 820, -35], f = fixture({}, matrix); f.ctx.globalAlpha = alpha; const before = f.ctx.state(); f.draw();
    const records = paints(f.ctx); geometry().kidneys.forEach((k, i) => {
      for (const record of records.slice(i * 3, i * 3 + 3)) { expect(record.alpha).toBeCloseTo(alpha * k.opacity, 12); expect(record.matrix).toEqual(matrix); }
      expect(records[i * 3].path).toEqual(tracePath(k.body, 500, 600, matrix)); expect(records[i * 3 + 2].path).toEqual(tracePath(k.hilum, 500, 600, matrix));
    }); expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
  });

  it.each(['normalize', 'contact', 'gradient', 'fill-base', 'fill-hilum', 'border', 'clip', 'finish', 'finish-second'])('restores canvas state when %s throws', location => {
    const f = fixture(), before = f.ctx.state(), fault = Error('injected ' + location); let calls = 0;
    if (location === 'contact') f.options.contact = () => { contaminate(f.ctx); throw fault; };
    else if (location.startsWith('finish')) f.options.finish = () => { if (++calls === (location === 'finish-second' ? 2 : 1)) { contaminate(f.ctx); throw fault; } };
    else {
      const operation = location === 'normalize' ? 'setLineDash' : location === 'gradient' ? 'createLinearGradient' : location.startsWith('fill') ? 'fill' : location === 'border' ? 'stroke' : 'clip';
      const original = f.ctx[operation].bind(f.ctx), failAt = location === 'fill-hilum' ? 2 : 1;
      f.ctx[operation] = (...args) => { if (++calls === failAt) { contaminate(f.ctx); throw fault; } return original(...args); };
    }
    expect(f.draw).toThrow(fault); expect(f.ctx.state()).toEqual(before); expect(f.ctx.stack).toEqual([]);
  });

  it('handles missing callbacks and invalid input without touching canvas state', () => {
    const f = fixture({ contact: null, finish: null }); expect(f.draw()).toBe(true); expect(paints(f.ctx)).toHaveLength(6); expect(f.ctx.events.filter(e => e.operation === 'clip')).toHaveLength(2);
    for (const options of [{}, { width: 0, height: 600 }, { width: 500, height: Infinity }]) {
      const ctx = new Context(), before = ctx.state(); expect(f.rawDraw(ctx, options)).toBe(false); expect(ctx.state()).toEqual(before); expect(ctx.events).toEqual([]);
    }
    expect(f.rawDraw(null, { width: 500, height: 600 })).toBe(false);
  });
});

describe('native pig renal integration and aligned selection', () => {
  it('uses a smooth RENAL inspection cue while retaining the existing lobed lung cue', () => {
    const footprint = production('structureInspectionFootprint', { structureOpticalDepth: () => 'deep', W: 500, H: 600,
      organs: Array.from({ length: 11 }, () => ({})), spec: { bodyShape: 'pig' }, specimen: 'pig' });
    const kidney = footprint({ id: 'kidneys_p', name: 'Kidneys' }), lung = footprint({ id: 'lungs_p', name: 'Lungs' });
    expect(kidney.morphology).toBe('compact'); expect(kidney.morphologyLabel).toBe('RENAL'); expect(kidney.depth).toBe('deep'); expect(kidney.rotation).toBe(0);
    expect(lung.morphology).toBe('lobed'); expect(lung.morphologyLabel).toBe('LOBED'); expect(lung.rotation).toBe(.18);
  });

  it.each(dimensions)('clips the paired kidneys to the real opening and preserves original depth opacity at %s by %s', (W, H) => {
    for (const [settings, detailed] of [[{}, true], [{ detail: false }, false], [{ accessible: true }, false], [{ highContrast: true }, false]]) {
      const f = runNative(W, H, settings); expect(f.draw).toHaveBeenCalledTimes(1); expect(f.traceCoelom).toHaveBeenCalledTimes(1); expect(f.traceCoelom).toHaveBeenCalledWith(f.ctx);
      expect(f.calls[0].alpha).toBe(1); expect(f.calls[0].clips).toEqual(['specimen', f.opening]);
      expect(f.calls[0].options).toMatchObject({ width: W, height: H, detailed, lightDirection: 'raking' });
      expect(typeof f.calls[0].options.contact).toBe('function'); expect(typeof f.calls[0].options.finish).toBe('function');
      expect(f.ctx.state()).toEqual(f.before); expect(f.ctx.stack).toEqual([]);
    }
  });

  it('uses the visible lateral capsule target before generic variation and anatomical view offsets', () => {
    for (const [W, H] of dimensions) for (const mode of ['guided', 'realistic', 'accessible']) for (const view of ['dorsal', 'ventral', 'lateral', 'internal']) {
      const bindings = { spec: { bodyShape: 'pig' }, pigRenalGeometry: geometry, d: { visualRealism: mode, anatomicalView: view }, visualRealism: mode,
        queryDissectionNode: () => ({ _logicalW: W, _logicalH: H }), specimenVariationValue: () => { throw Error('Capsule target must not jitter'); },
        viewSpecificOrganPoint: () => { throw Error('Capsule target must not receive generic offsets'); } };
      const varied = production('variedOrganPoint', { ...bindings, paintedSmallStructurePoint: production('paintedSmallStructurePoint', bindings) });
      expect(varied({ id: 'kidneys_p', x: .62, y: .39 })).toEqual(geometry(W, H).target);
    }
  });

  it('keeps production and desktop sources identical', () => { expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_dissection.js', 'utf8')).toBe(source); });
});
