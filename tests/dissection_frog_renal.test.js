import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_dissection.js', 'utf8');
const productionBodies = new Map();
function production(name, bindings = {}) {
  if (productionBodies.has(name)) return new Function(...Object.keys(bindings), '"use strict"; return (' + productionBodies.get(name) + ');')(...Object.values(bindings));
  const matches = [...source.matchAll(new RegExp('^([ \\t]*)(?:};[ \\t]*)?function ' + name + '\\(', 'gm'))];
  if (matches.length !== 1) throw Error('Expected one production function: ' + name);
  const match = matches[0], start = source.indexOf('function ' + name + '(', match.index);
  const ending = new RegExp('^' + match[1] + '}[ \\t]*\\r?$', 'gm'); ending.lastIndex = start;
  const end = ending.exec(source);
  if (!end) throw Error('Missing standalone function ending: ' + name);
  productionBodies.set(name, source.slice(start, end.index + end[0].trimEnd().length));
  return new Function(...Object.keys(bindings), '"use strict"; return (' + productionBodies.get(name) + ');')(...Object.values(bindings));
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

const geometry = production('frogRenalGeometry'), trace = production('traceFrogRenalRegion');
const rawDraw = production('drawFrogRenalComplex', { frogRenalGeometry: geometry, traceFrogRenalRegion: trace });
function tracePath(region, W, H, matrix) { const ctx = new Context(matrix); trace(ctx, region, W, H); return ctx.path; }
const paints = ctx => ctx.events.filter(e => e.operation === 'fill' || e.operation === 'stroke' || e.operation === 'fillRect');
function closePath(actual, expected) {
  expect(actual).toHaveLength(expected.length);
  actual.forEach((op, i) => { expect(op[0]).toBe(expected[i][0]); expect(op).toHaveLength(expected[i].length);
    for (let j = 1; j < op.length; j++) expect(op[j]).toBeCloseTo(expected[i][j], 10); });
}
// Frozen authored gross contours from the native renal drawing, before helper extraction.
function originalPath(side, W, H, simple = false, matrix) {
  const ctx = new Context(matrix), x = W * .5 + side * W * .052, y = H * .45 + H * .115, rx = W * .025, ry = H * .088;
  ctx.beginPath();
  if (simple) ctx.ellipse(x, y, rx, ry, side * .08, 0, Math.PI * 2);
  else {
    ctx.save(); ctx.translate(x, y); ctx.rotate(side * .08); ctx.scale(side, 1);
    ctx.moveTo(-rx * .08, -ry);
    ctx.bezierCurveTo(-rx * .62, -ry * 1.02, -rx * .78, -ry * .55, -rx * .75, -ry * .12);
    ctx.bezierCurveTo(-rx * .68, ry * .32, -rx * .79, ry * .75, -rx * .34, ry * .97);
    ctx.bezierCurveTo(rx * .15, ry * 1.06, rx * .72, ry * .73, rx * .87, ry * .25);
    ctx.bezierCurveTo(rx * 1.02, -ry * .24, rx * .81, -ry * .78, rx * .35, -ry * .96);
    ctx.bezierCurveTo(rx * .22, -ry, rx * .06, -ry, -rx * .08, -ry);
    ctx.closePath(); ctx.restore();
  }
  return ctx.path;
}
function contaminate(ctx) {
  ctx.translate(23, -17); ctx.scale(.3, -.5); ctx.globalAlpha = .1; ctx.globalCompositeOperation = 'destination-out';
  ctx.setLineDash([17, 11]); ctx.shadowBlur = 19; ctx.lineCap = 'square'; ctx.beginPath(); ctx.moveTo(-9000, -9000); ctx.lineTo(-9001, -9001);
}
function fixture(overrides = {}, matrix) {
  const ctx = new Context(matrix); ctx.globalAlpha = .96;
  const contact = vi.fn((...args) => { ctx.events.push({ operation: 'contact', args, path: structuredClone(ctx.path), clips: [...ctx.clips] }); contaminate(ctx); });
  const finish = vi.fn((...args) => { ctx.events.push({ operation: 'finish', args, path: structuredClone(ctx.path), clips: [...ctx.clips] }); ctx.clip(); contaminate(ctx); });
  const options = { width: 500, height: 600, detailed: true, accessible: false, highContrast: false, lightDirection: 'left', contact, finish, ...overrides };
  return { ctx, options, contact, finish, draw: () => rawDraw(ctx, options) };
}
function nativeBlock() {
  const start = source.indexOf('// Dorsal renal surfaces retain their exact footprint behind the gut.'),
    end = source.indexOf('// Paired thin-walled sacs retain their authored centers and radius budget.', start);
  if (start < 0 || end <= start) throw Error('Missing native frog renal section'); return source.slice(start, end);
}
function runNative(W, H, { detail = true, accessible = false, highContrast = false, alpha = .96 } = {}) {
  const ctx = new Context(); ctx.globalAlpha = alpha; const before = ctx.state(), calls = [];
  const draw = vi.fn((context, options) => calls.push({ context, options, state: context.state() }));
  const bindings = { ctx, W, H, sceneDetail: detail, frogAccessible: accessible, highContrastEnabled: highContrast,
    lightDirection: 'raking', paintCurrentOrganContact: () => {}, finishCurrentTissuePath: () => {}, drawFrogRenalComplex: draw };
  new Function(...Object.keys(bindings), nativeBlock())(...Object.values(bindings));
  return { ctx, before, draw, calls };
}
function variedTarget(W, H, mode = 'realistic', view = 'internal') {
  const bindings = { spec: { bodyShape: 'frog' }, frogRenalGeometry: geometry,
    queryDissectionNode: () => ({ _logicalW: W, _logicalH: H }),
    d: { visualRealism: mode, anatomicalView: view }, visualRealism: mode,
    specimenVariationValue: () => { throw Error('Registered renal target must not jitter'); },
    viewSpecificOrganPoint: () => { throw Error('Registered renal target must not receive view offsets'); } };
  const varied = production('variedOrganPoint', { ...bindings, paintedSmallStructurePoint: production('paintedSmallStructurePoint', bindings) });
  return varied({ id: 'kidneys', name: 'Kidneys', x: .50, y: .62 });
}

describe('registered intact frog renal surfaces', () => {
  it.each(dimensions)('preserves the exact authored five-cubic capsules and accessible ellipses at %s by %s', (W, H) => {
    const g = geometry(W, H); expect(g.kidneys).toHaveLength(2);
    for (const kidney of g.kidneys) {
      expect(kidney.center.x).toBe(.5 + kidney.side * .052); expect(kidney.center.y).toBe(.45 + .115);
      expect(kidney.rx).toBe(W * .025); expect(kidney.ry).toBe(H * .088); expect(kidney.angle).toBe(kidney.side * .08);
      expect(kidney.body.curves).toHaveLength(5); expect(kidney.body.curves.at(-1)[2]).toEqual(kidney.body.start);
      closePath(tracePath(kidney.body, W, H), originalPath(kidney.side, W, H));
      closePath(tracePath(kidney.simple, W, H), originalPath(kidney.side, W, H, true));
      const matrix = [-2.1, .13, .21, 1.7, 810, -93];
      closePath(tracePath(kidney.body, W, H, matrix), originalPath(kidney.side, W, H, false, matrix));
    }
  });

  it.each(dimensions)('contains both renal silhouettes and every adrenal patch in the original coelomic ellipse at %s by %s', (W, H) => {
    const g = geometry(W, H), cavity = p => ((p.x / W - .5) / .132) ** 2 + ((p.y / H - .465) / .215) ** 2;
    for (const k of g.kidneys) {
      const body = samplePath(tracePath(k.body, W, H))[0];
      for (const p of [...body, k.body.start, ...k.body.curves.flat()].map(p => p.x < 1 ? { x: p.x * W, y: p.y * H } : p)) expect(cavity(p)).toBeLessThan(.97);
      for (const p of samplePath(tracePath(k.simple, W, H))[0]) expect(cavity(p)).toBeLessThan(.92);
      expect(k.adrenal).toHaveLength(3);
      for (const patch of k.adrenal) {
        expect(patch.curves).toHaveLength(4); expect(patch.curves.at(-1)[2]).toEqual(patch.start);
        const points = [...samplePath(tracePath(patch, W, H))[0], ...[patch.start, ...patch.curves.flat()].map(p => ({ x: p.x * W, y: p.y * H }))];
        for (const p of points) { expect(contains(p, body)).toBe(true); expect(cavity(p)).toBeLessThan(.71); }
      }
      for (const region of [k.body, k.simple, ...k.adrenal]) for (const p of samplePath(tracePath(region, W, H))[0]) {
        expect(p.x / W).toBeGreaterThanOrEqual(k.bounds.minX - 1e-12); expect(p.x / W).toBeLessThanOrEqual(k.bounds.maxX + 1e-12);
        expect(p.y / H).toBeGreaterThanOrEqual(k.bounds.minY - 1e-12); expect(p.y / H).toBeLessThanOrEqual(k.bounds.maxY + 1e-12);
        expect(p.x / W).toBeGreaterThanOrEqual(g.bounds.minX - 1e-12); expect(p.x / W).toBeLessThanOrEqual(g.bounds.maxX + 1e-12);
      }
    }
  });

  it.each(dimensions)('places the kidney target in bare caudal renal tissue in both detail profiles at %s by %s', (W, H) => {
    const g = geometry(W, H), k = g.kidneys[1], p = { x: g.target.x * W, y: g.target.y * H }, angle = k.angle;
    expect(g.target).toEqual(k.target);
    const dx = p.x - k.center.x * W, dy = p.y - k.center.y * H;
    expect((Math.cos(angle) * dx + Math.sin(angle) * dy) / k.rx).toBeCloseTo(-.08, 12);
    expect((-Math.sin(angle) * dx + Math.cos(angle) * dy) / k.ry).toBeCloseTo(.82, 12);
    for (const region of [k.body, k.simple]) {
      const outline = samplePath(tracePath(region, W, H)); expect(contains(p, outline[0])).toBe(true); expect(distance(p, outline) - .65 / 2).toBeGreaterThan(3.3);
    }
    for (const patch of k.adrenal) { const ps = samplePath(tracePath(patch, W, H)); expect(contains(p, ps[0])).toBe(false); expect(distance(p, ps)).toBeGreaterThan(5); }
    for (const mode of ['guided', 'realistic', 'accessible']) for (const view of ['dorsal', 'ventral', 'lateral', 'internal']) expect(variedTarget(W, H, mode, view)).toEqual(g.target);
  });

  it('retains a bare caudal fifth beyond the irregular adhered adrenal patches', () => {
    const g = geometry();
    for (const k of g.kidneys) for (const patch of k.adrenal) for (const p of [patch.start, ...patch.curves.flat()]) {
      const dx = p.x * 500 - k.center.x * 500, dy = p.y * 600 - k.center.y * 600;
      const v = (-Math.sin(k.angle) * dx + Math.cos(k.angle) * dy) / k.ry;
      expect(v).toBeLessThanOrEqual(.600000000001); expect(v).toBeGreaterThanOrEqual(-.760000000001);
    }
    expect(g.kidneys[0].target.x).not.toBe(g.kidneys[1].target.x); expect(geometry(1000,600).target.x).not.toBe(geometry(320,900).target.x);
    expect(geometry()).toEqual(geometry(500,600));
  });

  it.each([[0,600],[-1,600],[500,0],[NaN,600],[500,Infinity],['bad',600]])('rejects nonfinite or nonpositive dimensions %s by %s', (width,height) => {
    expect(geometry(width,height)).toBeNull(); const f=fixture({width,height}),before=f.ctx.state();expect(f.draw()).toBe(false);expect(f.ctx.state()).toEqual(before);expect(f.ctx.events).toEqual([]);
  });
});

describe('bounded frog renal materials', () => {
  it.each(dimensions)('paints one clipped material finish per whole kidney and three shallow adrenal patches at %s by %s', (W,H) => {
    const f=fixture({width:W,height:H}),before=f.ctx.state(),g=geometry(W,H);expect(f.draw()).toBe(true);
    expect(f.contact).toHaveBeenCalledTimes(2);expect(f.finish).toHaveBeenCalledTimes(2);
    expect(paints(f.ctx).filter(e=>e.operation==='fill')).toHaveLength(8);expect(paints(f.ctx).filter(e=>e.operation==='stroke')).toHaveLength(2);
    expect(paints(f.ctx).filter(e=>e.operation==='fillRect')).toHaveLength(6);
    g.kidneys.forEach((k,i)=>{
      const whole=tracePath(k.body,W,H),contact=f.ctx.events.filter(e=>e.operation==='contact')[i],finish=f.ctx.events.filter(e=>e.operation==='finish')[i];
      expect(contact.path).toEqual(whole);expect(contact.clips).toEqual(['specimen']);expect(finish.path).toEqual(whole);expect(finish.clips).toEqual(['specimen',whole]);
      expect(f.contact).toHaveBeenNthCalledWith(i+1,k.rx,k.ry);expect(f.finish).toHaveBeenNthCalledWith(i+1,k.center.x*W,k.center.y*H,k.rx,k.ry,'capsule','frog-kidney-'+k.side);
      const base=paints(f.ctx).filter(e=>e.operation==='fill'&&e.path.filter(op=>op[0]==='bezierCurveTo').length===5)[i];
      expect(base.path).toEqual(whole);expect(base.clips).toEqual(['specimen']);expect(base.fill.kind).toBe('linear');expect(base.fill.stops.map(s=>s[0])).toEqual([0,.34,.76,1]);
      const patchFills=paints(f.ctx).filter(e=>e.operation==='fill'&&e.path.filter(op=>op[0]==='bezierCurveTo').length===4).slice(i*3,i*3+3);
      patchFills.forEach((record,j)=>{expect(record.path).toEqual(tracePath(k.adrenal[j],W,H));expect(record.clips).toEqual(['specimen',whole]);expect(record.fill.stops.map(s=>s[0])).toEqual([0,.38,.80,1]);});
    });
    for(const mottle of paints(f.ctx).filter(e=>e.operation==='fillRect')){expect(mottle.clips).toHaveLength(2);expect(mottle.clips[1].filter(op=>op[0]==='bezierCurveTo')).toHaveLength(5);expect(mottle.fill.kind).toBe('radial');expect(mottle.fill.stops).toHaveLength(3);}
    expect(f.ctx.events.filter(e=>e.operation==='clip')).toHaveLength(4);expect(f.ctx.state()).toEqual(before);expect(f.ctx.stack).toEqual([]);
  });

  it.each([.90,.96])('inherits layer opacity %s and the caller affine pose without leaking callback state',alpha=>{
    const matrix=[-1.8,.12,.21,1.4,811,-93],f=fixture({},matrix);f.ctx.globalAlpha=alpha;const before=f.ctx.state();f.draw();
    for(const record of paints(f.ctx)){expect(record.alpha).toBe(alpha);expect(record.matrix).toEqual(matrix);expect(record.composite).toBe('source-over');expect(record.dash).toEqual([]);expect(record.cap).toBe('round');expect(record.join).toBe('round');expect(record.shadow).toEqual([0,0,0]);expect(record.clips[0]).toBe('specimen');}
    const base=paints(f.ctx).filter(e=>e.operation==='fill'&&e.path.filter(op=>op[0]==='bezierCurveTo').length===5);
    geometry().kidneys.forEach((k,i)=>expect(base[i].path).toEqual(tracePath(k.body,500,600,matrix)));
    expect(f.ctx.state()).toEqual(before);expect(f.ctx.stack).toEqual([]);
  });

  it.each([{detailed:false},{accessible:true},{highContrast:true}])('suppresses material and adrenal cues under %j',overrides=>{
    const f=fixture(overrides),before=f.ctx.state();f.draw();expect(f.contact).not.toHaveBeenCalled();expect(f.finish).not.toHaveBeenCalled();
    expect(f.ctx.events.filter(e=>e.operation==='clip'||e.operation==='gradient')).toHaveLength(0);expect(paints(f.ctx)).toHaveLength(4);
    const simple=!!(overrides.accessible||overrides.highContrast),fills=paints(f.ctx).filter(e=>e.operation==='fill');
    geometry().kidneys.forEach((k,i)=>{expect(fills[i].fill).toBe('#5b3429');expect(fills[i].path).toEqual(tracePath(simple?k.simple:k.body,500,600));});
    expect(f.ctx.state()).toEqual(before);expect(f.ctx.stack).toEqual([]);
  });

  it.each([['left',[-1,-.14]],['right',[1,-.14]],['raking',[-.72,.70]],['unknown',[-.12,-1]]])('shares the physical %s lamp across both whole kidneys and the adrenal surfaces',(lightDirection,light)=>{
    const f=fixture({lightDirection});f.draw();const linear=f.ctx.events.filter(e=>e.operation==='gradient'&&e.gradient.kind==='linear'),len=Math.hypot(...light);
    expect(linear).toHaveLength(4);linear.forEach((e,i)=>{const k=geometry().kidneys[Math.floor(i/2)],[x1,y1,x2,y2]=e.gradient.args;
      expect((x1+x2)/2).toBeCloseTo(k.center.x*500,10);expect((y1+y2)/2).toBeCloseTo(k.center.y*600,10);
      expect((x1-x2)/(2*k.rx)).toBeCloseTo(light[0]/len,10);expect((y1-y2)/(2*k.ry)).toBeCloseTo(light[1]/len,10);
    });
  });

  it('supports absent optional material callbacks while retaining the same gross surfaces',()=>{
    const f=fixture({contact:null,finish:null});expect(f.draw()).toBe(true);expect(paints(f.ctx).filter(e=>e.operation==='fill')).toHaveLength(8);expect(f.ctx.events.filter(e=>e.operation==='clip')).toHaveLength(2);
    const ctx=new Context(),before=ctx.state();expect(rawDraw(ctx,{})).toBe(false);expect(rawDraw(null,{width:500,height:600})).toBe(false);expect(ctx.state()).toEqual(before);expect(ctx.events).toEqual([]);
  });

  it.each(['contact','contact-second','gradient-linear','gradient-radial','base-fill','patch-fill','clip','finish-second'])('balances context state when %s throws',location=>{
    const f=fixture(),before=f.ctx.state(),fault=Error('injected '+location);let calls=0;
    if(location.startsWith('contact'))f.options.contact=()=>{if(++calls===(location==='contact-second'?2:1)){contaminate(f.ctx);throw fault;}};
    else if(location==='finish-second')f.options.finish=()=>{if(++calls===2){contaminate(f.ctx);throw fault;}};
    else{const method=location==='gradient-linear'?'createLinearGradient':location==='gradient-radial'?'createRadialGradient':location==='clip'?'clip':'fill',original=f.ctx[method].bind(f.ctx),at=location==='patch-fill'?2:1;
      f.ctx[method]=(...args)=>{if(++calls===at){contaminate(f.ctx);throw fault;}return original(...args);};}
    expect(f.draw).toThrow(fault);expect(f.ctx.state()).toEqual(before);expect(f.ctx.stack).toEqual([]);
  });
});

describe('native frog renal integration',()=>{
  it('uses a smooth RENAL inspection cue while retaining the established lobed lung cue',()=>{
    const footprint=production('structureInspectionFootprint',{structureOpticalDepth:()=> 'deep',W:500,H:600,organs:Array.from({length:13},()=>({})),spec:{bodyShape:'frog'},specimen:'frog'});
    const kidney=footprint({id:'kidneys',name:'Kidneys'}),lung=footprint({id:'lungs',name:'Lungs'});
    expect(kidney.morphology).toBe('compact');expect(kidney.morphologyLabel).toBe('RENAL');expect(kidney.rotation).toBe(0);expect(kidney.depth).toBe('deep');
    expect(lung.morphology).toBe('lobed');expect(lung.morphologyLabel).toBe('LOBED');expect(lung.rotation).toBe(.18);
  });

  it.each(dimensions)('keeps native detail gates, depth alpha and later lung-paint boundary at %s by %s',(W,H)=>{
    for(const settings of [{},{detail:false},{accessible:true},{highContrast:true}])for(const alpha of [.90,.96]){
      const f=runNative(W,H,{...settings,alpha});expect(f.draw).toHaveBeenCalledTimes(1);expect(f.calls[0].state.globalAlpha).toBe(alpha);expect(f.calls[0].state.clips).toEqual(['specimen']);
      expect(f.calls[0].options).toMatchObject({width:W,height:H,detailed:settings.detail!==false&&!settings.accessible&&!settings.highContrast,accessible:!!settings.accessible,highContrast:!!settings.highContrast,lightDirection:'raking'});
      expect(typeof f.calls[0].options.contact).toBe('function');expect(typeof f.calls[0].options.finish).toBe('function');expect(f.ctx.state()).toEqual(f.before);expect(f.ctx.events).toEqual([]);
    }
    expect(nativeBlock()).not.toContain('frogLung');
    expect(source.indexOf('drawFrogRenalComplex(ctx,')).toBeLessThan(source.indexOf('// Paired thin-walled sacs retain their authored centers and radius budget.'));
  });

  it('keeps desktop and canonical production copies synchronized',()=>{expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_dissection.js','utf8')).toBe(source);});
});

