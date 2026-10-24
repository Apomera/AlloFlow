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

describe('earthworm neural depth', () => {
  it.each([
    { id: 'cerebral_g', name: 'Cerebral Ganglia' },
    { id: 'ventral_cord', name: 'Ventral Nerve Cord' },
    { id: 'segmental_g', name: 'Segmental Ganglia' }
  ])('classifies $id as internal tissue', organ => {
    const depth = production('structureOpticalDepth', {
      viewOrganVisibility: () => 'visible', activeLayer: 'nervous', currentLayerIdx: 2
    });
    expect(depth(organ)).toBe('deep');
  });

  it('preserves actual surface segments and occluded tissue depth', () => {
    const depth = production('structureOpticalDepth', {
      viewOrganVisibility: organ => organ.occluded ? 'occluded' : 'visible',
      activeLayer: 'external', currentLayerIdx: 0
    });
    expect(depth({ id: 'segments', name: 'Body Segments' })).toBe('surface');
    expect(depth({ id: 'segments', name: 'Body Segments', occluded: true })).toBe('deep');
    expect(depth(null)).toBe('surface');
  });
});

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

const centerline = production('earthwormCenterlinePoint');
const frame = production('earthwormAnatomyFrame', { earthwormCenterlinePoint: centerline });
const geometry = production('earthwormNeuralGeometry', { earthwormAnatomyFrame: frame });
const traceRegion = production('traceEarthwormNeuralRegion'), traceRoute = production('traceEarthwormNeuralRoute');
const rawDraw = production('drawEarthwormNeuralComplex', { earthwormNeuralGeometry: geometry,
  traceEarthwormNeuralRegion: traceRegion, traceEarthwormNeuralRoute: traceRoute });
const paints = ctx => ctx.events.filter(e => e.operation === 'fill' || e.operation === 'stroke');
function pathFor(region, W, H, matrix) { const ctx = new Context(matrix); traceRegion(ctx, region, W, H); return ctx.path; }
function routeFor(route, W, H, matrix) { const ctx = new Context(matrix); traceRoute(ctx, route, W, H); return ctx.path; }
function nativeCord(W, H) {
  const ctx = new Context(); production('traceEarthwormLine', { ctx, earthwormFrame: t => frame(t, W, H) })(.28, .06, .97);
  return ctx.path;
}
function actualBody(W, H) {
  const ctx = new Context(), start = source.indexOf('var traceEarthwormBody = function traceEarthwormBody()'),
    end = source.indexOf('function traceEarthwormLine', start);
  if (start < 0 || end <= start) throw Error('Missing actual native earthworm body');
  new Function('ctx', 'earthwormFrame', source.slice(start, end) + ';traceEarthwormBody();')(ctx, t => frame(t, W, H));
  return ctx.path;
}
function fixture(overrides = {}, matrix) {
  const ctx = new Context(matrix); ctx.globalAlpha = .72;
  const contaminate = () => {
    ctx.translate(31, -29); ctx.scale(-.3, .6); ctx.globalAlpha = .07; ctx.globalCompositeOperation = 'destination-out';
    ctx.shadowBlur = 17; ctx.setLineDash([19, 9]); ctx.lineCap = 'square';
    ctx.beginPath(); ctx.moveTo(-777, -999); ctx.lineTo(-778, -1000);
  };
  const contact = vi.fn((...args) => { ctx.events.push({ operation: 'contact', args, path: structuredClone(ctx.path), clips: [...ctx.clips] }); contaminate(); });
  const finish = vi.fn((...args) => { ctx.events.push({ operation: 'finish', args, path: structuredClone(ctx.path), clips: [...ctx.clips] }); contaminate(); });
  const options = { width: 500, height: 600, detailed: true, accessible: false, highContrast: false,
    lightDirection: 'left', moisture: 76, lightIntensity: 68, condition: 'standard', contact, finish, ...overrides };
  return { ctx, options, contact, finish, draw: () => rawDraw(ctx, options) };
}
function painted(id, W = 500, H = 600) {
  return production('paintedSmallStructurePoint', { spec: { bodyShape: 'worm' }, earthwormNeuralGeometry: geometry,
    queryDissectionNode: () => ({ _logicalW: W, _logicalH: H }) })({ id });
}
function nativeBlock() {
  const start = source.indexOf("if (activeLayer === 'nervous') {", source.indexOf('var traceEarthwormBody')),
    end = source.indexOf('\n\n\n              } else if', start);
  if (start < 0 || end <= start) throw Error('Missing earthworm nervous wrapper');
  return source.slice(start, end);
}

describe('registered earthworm neural anatomy', () => {
  it.each(dimensions)('joins paired cerebral tissue, connectives and twelve compact nodes inside the actual body at %s by %s', (W, H) => {
    const g = geometry(W, H), body = samplePath(actualBody(W, H)), allParts = [...g.brain.map(p => p.region), ...g.ganglia.map(p => p.region)];
    expect(g.brain).toHaveLength(2); expect(g.connectives).toHaveLength(2); expect(g.ganglia).toHaveLength(12);
    expect(g.ganglia.map(p => p.segment)).toEqual([4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34, 37]);
    expect(g.joinT).toBe(.10); expect(g.ganglia[0].region.center).toEqual(g.join);
    for (const region of allParts) {
      expect(region.curves).toHaveLength(4); expect(region.curves.at(-1)[2]).toEqual(region.start);
      const path = pathFor(region, W, H), ps = samplePath(path)[0];
      expect(path.at(-1)).toEqual(['closePath']);
      expect(contains({ x: region.center.x * W, y: region.center.y * H }, ps)).toBe(true);
      for (const p of ps) {
        expect(contains(p, body[0])).toBe(true); expect(distance(p, body) - .45 / 2).toBeGreaterThan(3);
        expect(p.x / W).toBeGreaterThanOrEqual(g.bounds.minX - 1e-12); expect(p.x / W).toBeLessThanOrEqual(g.bounds.maxX + 1e-12);
        expect(p.y / H).toBeGreaterThanOrEqual(g.bounds.minY - 1e-12); expect(p.y / H).toBeLessThanOrEqual(g.bounds.maxY + 1e-12);
        expect(p.x / W).toBeGreaterThanOrEqual(region.bounds.minX - 1e-12); expect(p.x / W).toBeLessThanOrEqual(region.bounds.maxX + 1e-12);
        expect(p.y / H).toBeGreaterThanOrEqual(region.bounds.minY - 1e-12); expect(p.y / H).toBeLessThanOrEqual(region.bounds.maxY + 1e-12);
      }
    }
    for (let i = 0; i < 2; i++) {
      const route = g.connectives[i], start = { x: route.start.x * W, y: route.start.y * H };
      expect(route.curves).toHaveLength(2); expect(route.curves.at(-1)[2]).toEqual(g.join);
      expect(contains(start, samplePath(pathFor(g.brain[i].region, W, H))[0])).toBe(true);
      for (const p of samplePath(routeFor(route, W, H))[0]) {
        expect(contains(p, body[0])).toBe(true); expect(distance(p, body) - 1.95 / 2).toBeGreaterThan(2);
        expect(p.x / W).toBeGreaterThanOrEqual(g.anteriorBounds.minX - 1e-12); expect(p.x / W).toBeLessThanOrEqual(g.anteriorBounds.maxX + 1e-12);
        expect(p.y / H).toBeGreaterThanOrEqual(g.anteriorBounds.minY - 1e-12); expect(p.y / H).toBeLessThanOrEqual(g.anteriorBounds.maxY + 1e-12);
      }
    }
    expect(g.commissure).toEqual(g.brain.map(p => p.region.center));
    expect(g.cord[0]).toEqual(g.join); expect(g.ganglia[0].region.center).toEqual(g.cord[0]);
    for (const p of samplePath(routeFor(g.cord, W, H))[0]) {
      expect(contains(p, body[0])).toBe(true); expect(distance(p, body) - 1.95 / 2).toBeGreaterThan(2);
      expect(p.x / W).toBeGreaterThanOrEqual(g.bounds.minX - 1e-12); expect(p.x / W).toBeLessThanOrEqual(g.bounds.maxX + 1e-12);
      expect(p.y / H).toBeGreaterThanOrEqual(g.bounds.minY - 1e-12); expect(p.y / H).toBeLessThanOrEqual(g.bounds.maxY + 1e-12);
    }
  });

  it.each(dimensions)('retains every original caudal cord vertex and puts all three targets on actual native paint at %s by %s', (W, H) => {
    const g = geometry(W, H), original = nativeCord(W, H).map(op => ({ x: op[1] / W, y: op[2] / H })),
      route = samplePath(routeFor(g.cord, W, H));
    expect(g.originalCord).toHaveLength(45);
    g.originalCord.forEach((sample, i) => { expect(sample.point.x).toBeCloseTo(original[i].x, 13); expect(sample.point.y).toBeCloseTo(original[i].y, 13); });
    expect(g.cord.slice(1)).toEqual(g.originalCord.filter(s => s.t > g.joinT).map(s => s.point));
    expect(distance({ x: g.join.x * W, y: g.join.y * H }, samplePath(nativeCord(W, H)))).toBeLessThan(1e-9);
    for (const node of g.ganglia) {
      expect(distance({ x: node.region.center.x * W, y: node.region.center.y * H }, route)).toBeLessThan(1e-9);
      expect(node.region.across).toBe(1.65); expect(node.region.along).toBe(2.05);
    }
    for (const id of ['cerebral_g', 'ventral_cord', 'segmental_g']) expect(painted(id, W, H)).toEqual(g.targets[id]);
    const brainPoint = { x: g.targets.cerebral_g.x * W, y: g.targets.cerebral_g.y * H },
      nodePoint = { x: g.targets.segmental_g.x * W, y: g.targets.segmental_g.y * H };
    expect(contains(brainPoint, samplePath(pathFor(g.brain[0].region, W, H))[0])).toBe(true);
    expect(distance(brainPoint, samplePath(pathFor(g.brain[0].region, W, H)))).toBeGreaterThan(1.6);
    expect(contains(nodePoint, samplePath(pathFor(g.ganglia[5].region, W, H))[0])).toBe(true);
    expect(distance(nodePoint, samplePath(pathFor(g.ganglia[5].region, W, H)))).toBeGreaterThan(1.2);
    const cordPoint = { x: g.targets.ventral_cord.x * W, y: g.targets.ventral_cord.y * H };
    expect(distance(cordPoint, route)).toBeLessThan(1e-9);
    expect(Math.min(...g.ganglia.map(n => Math.hypot(n.region.center.x * W - cordPoint.x, n.region.center.y * H - cordPoint.y)))).toBeGreaterThan(6);
  });

  it('keeps aspect-sensitive points tied to their current canvas rather than default dimensions', () => {
    expect(geometry(1000, 600).targets.cerebral_g.x).not.toBe(geometry(320, 900).targets.cerebral_g.x);
    expect(painted('cerebral_g', 1000, 600)).not.toEqual(painted('cerebral_g', 320, 900));
    expect(geometry()).toEqual(geometry(500, 600));
  });

  it.each([[0,600],[-1,600],[500,0],[NaN,600],[500,Infinity],['bad',600]])('rejects invalid geometry %s by %s', (W,H) => {
    expect(geometry(W,H)).toBeNull(); const f = fixture({width:W,height:H}); expect(f.draw()).toBe(false); expect(f.ctx.events).toEqual([]); expect(f.ctx.stack).toEqual([]);
  });
});

describe('bounded earthworm neural tissue painting', () => {
  it.each([[1,0,0,1,0,0],[-2.2,.13,.19,2.1,740,-121],[.2,1.4,-1.7,.3,801,14]])('preserves inherited opacity, affine pose and parent clip for %s', (...matrix) => {
    const f = fixture({},matrix), initial = f.ctx.state(); expect(f.draw()).toBe(true);
    expect(f.ctx.state()).toEqual(initial); expect(f.ctx.stack).toHaveLength(0);
    for (const e of paints(f.ctx)) {
      expect(e.alpha).toBe(.72); expect(e.matrix).toEqual(matrix); expect(e.composite).toBe('source-over');
      expect(e.dash).toEqual([]); expect(e.cap).toBe('round'); expect(e.join).toBe('round'); expect(e.shadow).toEqual([0,0,0]); expect(e.clips[0]).toBe('specimen');
    }
    const g = geometry(500,600), route = paints(f.ctx).filter(e=>e.path.filter(op=>op[0]==='moveTo').length===4);
    expect(route).toHaveLength(3); expect(route.map(e=>e.width)).toEqual([1.95,1.35,.30]);
    const expected = new Context(matrix); expected.beginPath();
    g.connectives.forEach(r=>traceRoute(expected,r,500,600,true)); traceRoute(expected,g.cord,500,600,true); traceRoute(expected,g.commissure,500,600,true);
    expect(route.every(e=>JSON.stringify(e.path)===JSON.stringify(expected.path))).toBe(true);
  });

  it('isolates both callbacks and bounds one finish to the union of the two cerebral capsules', () => {
    const f=fixture(), initial=f.ctx.state(); f.draw(); expect(f.ctx.state()).toEqual(initial);
    expect(f.contact).toHaveBeenCalledTimes(1); expect(f.finish).toHaveBeenCalledTimes(1);
    const finish=f.ctx.events.find(e=>e.operation==='finish'), contact=f.ctx.events.find(e=>e.operation==='contact'), g=geometry(500,600);
    expect(contact.path.filter(op=>op[0]==='bezierCurveTo')).toHaveLength(8); expect(contact.path.filter(op=>op[0]==='closePath')).toHaveLength(2);
    expect(finish.path).toEqual(contact.path); expect(finish.clips).toHaveLength(2); expect(finish.clips[1]).toEqual(finish.path);
    expect(f.finish.mock.calls[0]).toEqual([g.brainCenter.x*500,g.brainCenter.y*600,g.brainExtent.x*500,g.brainExtent.y*600,'capsule','earthworm-cerebral-ganglia']);
    const fills=paints(f.ctx).filter(e=>e.operation==='fill'); expect(fills).toHaveLength(14);
    expect(fills.every(e=>e.path.filter(op=>op[0]==='bezierCurveTo').length===4)).toBe(true);
    expect(fills.every(e=>e.clips.length===1)).toBe(true);
    const grain=paints(f.ctx).filter(e=>e.width===.18); expect(grain).toHaveLength(36);
    for (const e of grain) {
      expect(e.clips).toHaveLength(2); expect(e.clips[1].filter(op=>op[0]==='bezierCurveTo')).toHaveLength(4);
      expect(e.path.filter(op=>op[0]==='lineTo')).toHaveLength(1);
      for (const p of samplePath(e.path)[0]) expect(contains(p,samplePath(e.clips[1])[0])).toBe(true);
      const a=e.path[0],b=e.path[1]; expect(Math.hypot(b[1]-a[1],b[2]-a[2])).toBeCloseTo(.28,10);
    }
  });

  it.each([{detailed:false},{accessible:true},{highContrast:true}])('keeps semantic gold and omits all material texture for %j', overrides=>{
    const f=fixture(overrides), initial=f.ctx.state(); f.draw(); expect(f.ctx.state()).toEqual(initial);
    expect(f.contact).not.toHaveBeenCalled(); expect(f.finish).not.toHaveBeenCalled();
    expect(f.ctx.events.filter(e=>e.operation==='gradient'||e.operation==='clip')).toHaveLength(0);
    const fill=paints(f.ctx).filter(e=>e.operation==='fill'); expect(fill).toHaveLength(14);
    expect(fill.slice(0,2).map(e=>e.fill)).toEqual(['#fde047','#fde047']); expect(fill.slice(2).every(e=>e.fill==='#f59e0b')).toBe(true);
    const route=paints(f.ctx).find(e=>e.path.filter(op=>op[0]==='moveTo').length===4);
    expect(route.stroke).toBe('#fbbf24'); expect(route.width).toBe(overrides.accessible?2:1.35);
  });

  it.each(['overhead','left','right','raking'])('uses the selected %s lamp for radial volume', lightDirection=>{
    const f=fixture({lightDirection}); f.draw(); const gradient=f.ctx.events.find(e=>e.operation==='gradient').gradient;
    const g=geometry(500,600), p=g.brain[0].region.center, dx=gradient.args[0]-p.x*500,dy=gradient.args[1]-p.y*600;
    const lamp={overhead:[-.12,-1],left:[-1,-.14],right:[1,-.14],raking:[-.72,.70]}[lightDirection];
    expect(Math.sign(dx)).toBe(Math.sign(lamp[0])); expect(Math.sign(dy)).toBe(Math.sign(lamp[1]));
    expect(gradient.kind).toBe('radial'); expect(gradient.stops).toHaveLength(4);
  });

  it('responds to moisture, lamp intensity and specimen condition without changing the physical route',()=>{
    const wet=fixture({moisture:100,lightIntensity:100,condition:'standard'}),dry=fixture({moisture:0,lightIntensity:20,condition:'dehydrated'});wet.draw();dry.draw();
    const wetPaint=paints(wet.ctx),dryPaint=paints(dry.ctx);expect(wetPaint.map(e=>e.path)).toEqual(dryPaint.map(e=>e.path));
    const alpha = s=>Number(s.match(/,([.\d]+)\)$/)[1]);
    expect(alpha(wetPaint.find(e=>e.width===.30).stroke)).toBeGreaterThan(alpha(dryPaint.find(e=>e.width===.30).stroke));
    expect(wetPaint.filter(e=>e.operation==='fill').map(e=>e.fill.stops)).toEqual(dryPaint.filter(e=>e.operation==='fill').map(e=>e.fill.stops));
  });

  it.each(['contact','finish','createRadialGradient','fill','stroke','clip','bezierCurveTo'])('balances save/restore when %s throws',method=>{
    const f=fixture(), initial=f.ctx.state(), fail=()=>{throw Error('injected '+method);};
    if(method==='contact'||method==='finish')f.options[method]=fail;else f.ctx[method]=fail;
    expect(f.draw).toThrow('injected '+method);expect(f.ctx.state()).toEqual(initial);expect(f.ctx.stack).toHaveLength(0);
  });

  it.each([{sceneDetail:true,wormAccessible:false,highContrastEnabled:false},{sceneDetail:false,wormAccessible:false,highContrastEnabled:false},
    {sceneDetail:true,wormAccessible:true,highContrastEnabled:false},{sceneDetail:true,wormAccessible:false,highContrastEnabled:true}])('uses native body clipping and runtime detail gates for %j',modes=>{
    const ctx=new Context(),initial=ctx.state(),helper=vi.fn(),trace=()=>{ctx.beginPath();ctx.rect(1,2,33,44);};
    const bindings={ctx,W:500,H:600,activeLayer:'nervous',...modes,traceEarthwormBody:trace,drawEarthwormNeuralComplex:helper,
      lightDirection:'left',paintCurrentOrganContact:()=>{},finishCurrentTissuePath:()=>{},
      liveTissueState:{moisture:76},d:{lightIntensity:68},specimenCondition:'standard'};
    new Function(...Object.keys(bindings),nativeBlock())(...Object.values(bindings));
    expect(helper).toHaveBeenCalledTimes(1);expect(ctx.state()).toEqual(initial);expect(ctx.stack).toHaveLength(0);
    expect(ctx.events.find(e=>e.operation==='clip').path).toEqual([['moveTo',1,2],['lineTo',34,2],['lineTo',34,46],['lineTo',1,46],['closePath']]);
    const opts=helper.mock.calls[0][1];expect(opts.detailed).toBe(modes.sceneDetail&&!modes.wormAccessible&&!modes.highContrastEnabled);
    expect(opts.width).toBe(500);expect(opts.height).toBe(600);expect(typeof opts.contact).toBe('function');expect(typeof opts.finish).toBe('function');
    expect(opts.moisture).toBe(76);expect(opts.lightIntensity).toBe(68);expect(opts.condition).toBe('standard');
  });
});

