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

const geometry = production('crayfishHepatopancreaticGeometry'), trace = production('traceCrayfishHepatopancreaticRegion');
const rawDraw = production('drawCrayfishHepatopancreas', { crayfishHepatopancreaticGeometry: geometry, traceCrayfishHepatopancreaticRegion: trace });
function tracePath(region,W,H,matrix){const ctx=new Context(matrix);trace(ctx,region,W,H);return ctx.path;}
const paints=ctx=>ctx.events.filter(e=>['fill','stroke','fillRect'].includes(e.operation));
function closePath(actual,expected){expect(actual).toHaveLength(expected.length);actual.forEach((op,i)=>{expect(op[0]).toBe(expected[i][0]);expect(op).toHaveLength(expected[i].length);for(let j=1;j<op.length;j++)expect(op[j]).toBeCloseTo(expected[i][j],10);});}
function originalPath(side,W,H,simple=false,matrix){
  const ctx=new Context(matrix),x=W*.5-W*.015,y=H*.45+side*H*.034,rx=W*.057,ry=H*.036;
  if(simple)production('traceVisceralLobe',{ctx})(x,y,rx,ry,side*.12);
  else{
    // Frozen authored detailed gross envelope, before extraction into the shared helper.
    ctx.save();ctx.translate(x,y);ctx.rotate(side*.12);ctx.scale(rx,ry*side);ctx.beginPath();ctx.moveTo(-.94,-.08);
    ctx.bezierCurveTo(-.97,-.42,-.73,-.69,-.48,-.70);ctx.bezierCurveTo(-.30,-.94,.05,-.91,.23,-.75);
    ctx.bezierCurveTo(.50,-.83,.78,-.57,.75,-.33);ctx.bezierCurveTo(1,-.17,.96,.20,.76,.32);
    ctx.bezierCurveTo(.78,.57,.45,.83,.22,.73);ctx.bezierCurveTo(0,.98,-.35,.85,-.47,.64);
    ctx.bezierCurveTo(-.77,.68,-.97,.34,-.94,-.08);ctx.closePath();ctx.restore();
  }
  return ctx.path;
}
function actualWindow(W,H){const ctx=new Context();production('traceCrayfishVisceralWindow',{ctx,W,H,cx:W*.5,cy:H*.45})(ctx);return ctx.path;}
function contaminate(ctx){ctx.translate(23,-17);ctx.scale(.3,-.5);ctx.globalAlpha=.1;ctx.globalCompositeOperation='destination-out';ctx.setLineDash([17,11]);ctx.shadowBlur=19;ctx.lineCap='square';ctx.beginPath();ctx.moveTo(-9000,-9000);ctx.lineTo(-9001,-9001);}
function fixture(overrides={},matrix){
  const ctx=new Context(matrix);ctx.globalAlpha=.94;
  const contact=vi.fn((...args)=>{ctx.events.push({operation:'contact',args,path:structuredClone(ctx.path),clips:[...ctx.clips]});contaminate(ctx);});
  const finish=vi.fn((...args)=>{ctx.events.push({operation:'finish',args,path:structuredClone(ctx.path),clips:[...ctx.clips]});ctx.clip();contaminate(ctx);});
  const options={width:500,height:600,detailed:true,accessible:false,highContrast:false,lightDirection:'left',moisture:76,lightIntensity:68,condition:'standard',contact,finish,...overrides};
  return{ctx,options,contact,finish,draw:()=>rawDraw(ctx,options)};
}
function nativeBlock(){const start=source.indexOf('// Hepatopancreas lobes, dorsal heart, gonad, and feathery gills.'),end=source.indexOf('var crayHeartX =',start);if(start<0||end<=start)throw Error('Missing native hepatopancreas section');return source.slice(start,end);}
function runNative(W,H,{detail=true,accessible=false,highContrast=false,alpha=.94}={}){
  const ctx=new Context();ctx.globalAlpha=alpha;const before=ctx.state(),calls=[],window=actualWindow(W,H);
  const traceWindow=vi.fn(c=>{c.beginPath();for(const op of window){if(op[0]==='moveTo')c.moveTo(...op.slice(1));else if(op[0]==='bezierCurveTo')c.bezierCurveTo(...op.slice(1));else c.closePath();}});
  const draw=vi.fn((context,options)=>calls.push({context,options,state:context.state()}));
  const bindings={ctx,W,H,sceneDetail:detail,crayAccessible:accessible,highContrastEnabled:highContrast,lightDirection:'raking',
    liveTissueState:{moisture:76},d:{lightIntensity:68},specimenCondition:'preserved',paintCurrentOrganContact:()=>{},finishCurrentTissuePath:()=>{},
    traceCrayfishVisceralWindow:traceWindow,drawCrayfishHepatopancreas:draw};
  new Function(...Object.keys(bindings),nativeBlock())(...Object.values(bindings));return{ctx,before,calls,draw,traceWindow,window};
}
function variedTarget(W,H,mode,view){
  const bindings={spec:{bodyShape:'crayfish'},crayfishHepatopancreaticGeometry:geometry,queryDissectionNode:()=>({_logicalW:W,_logicalH:H}),
    d:{visualRealism:mode,anatomicalView:view},visualRealism:mode,specimenVariationValue:()=>{throw Error('Painted target must not jitter');},viewSpecificOrganPoint:()=>{throw Error('Painted target must not receive view offsets');}};
  return production('variedOrganPoint',{...bindings,paintedSmallStructurePoint:production('paintedSmallStructurePoint',bindings)})({id:'hepato',name:'Hepatopancreas',x:.48,y:.47});
}

describe('registered compact crayfish hepatopancreatic masses',()=>{
  it.each(dimensions)('preserves the exact native seven-cubic silhouettes and unmirrored four-cubic fallback at %s by %s',(W,H)=>{
    const g=geometry(W,H);expect(g.masses).toHaveLength(2);
    for(const m of g.masses){
      expect(m.center).toEqual({x:.5-.015,y:.45+m.side*.034});expect(m.rx).toBe(W*.057);expect(m.ry).toBe(H*.036);expect(m.angle).toBe(m.side*.12);
      expect(m.body.curves).toHaveLength(7);expect(m.simple.curves).toHaveLength(4);expect(m.body.curves.at(-1)[2]).toEqual(m.body.start);expect(m.simple.curves.at(-1)[2]).toEqual(m.simple.start);
      closePath(tracePath(m.body,W,H),originalPath(m.side,W,H));closePath(tracePath(m.simple,W,H),originalPath(m.side,W,H,true));
      const matrix=[-2.1,.13,.21,1.7,810,-93];closePath(tracePath(m.body,W,H,matrix),originalPath(m.side,W,H,false,matrix));closePath(tracePath(m.simple,W,H,matrix),originalPath(m.side,W,H,true,matrix));
      expect(tracePath(m.body,W,H).filter(op=>op[0]==='moveTo')).toHaveLength(1);expect(tracePath(m.body,W,H).filter(op=>op[0]==='closePath')).toHaveLength(1);
    }
  });

  it.each(dimensions)('keeps both profiles and all shallow surface cues inside the native visceral window at %s by %s',(W,H)=>{
    const g=geometry(W,H),window=samplePath(actualWindow(W,H));expect(actualWindow(W,H).filter(op=>op[0]==='bezierCurveTo')).toHaveLength(5);
    for(const m of g.masses){
      const body=samplePath(tracePath(m.body,W,H));
      for(const r of [m.body,m.simple])for(const p of [...samplePath(tracePath(r,W,H))[0],...[r.start,...r.curves.flat()].map(p=>({x:p.x*W,y:p.y*H}))]){
        expect(contains(p,window[0])).toBe(true);expect(p.x/W).toBeGreaterThanOrEqual(m.bounds.minX-1e-12);expect(p.x/W).toBeLessThanOrEqual(m.bounds.maxX+1e-12);
        expect(p.y/H).toBeGreaterThanOrEqual(m.bounds.minY-1e-12);expect(p.y/H).toBeLessThanOrEqual(m.bounds.maxY+1e-12);
        expect(p.x/W).toBeGreaterThanOrEqual(g.bounds.minX-1e-12);expect(p.x/W).toBeLessThanOrEqual(g.bounds.maxX+1e-12);
      }
      expect(m.creases).toHaveLength(2);expect(m.relief).toHaveLength(3);
      for(const c of m.creases){expect(c.closed).toBe(false);expect(c.curves).toHaveLength(1);expect(tracePath(c,W,H).some(op=>op[0]==='closePath')).toBe(false);
        for(const p of [...samplePath(tracePath(c,W,H))[0],...[c.start,...c.curves.flat()].map(p=>({x:p.x*W,y:p.y*H}))]){expect(contains(p,body[0])).toBe(true);expect(distance(p,body)-.25-.33/2).toBeGreaterThan(1.7);}
      }
      for(const p of m.relief)expect(contains({x:p.x*W,y:p.y*H},body[0])).toBe(true);
      const center={x:m.center.x*W,y:m.center.y*H};expect(contains(center,body[0])).toBe(true);expect(distance(center,body)-.7/2).toBeGreaterThan(15);
    }
  });

  it('keeps the inspection target on the lower mass before generic jitter and view offsets',()=>{
    for(const [W,H]of dimensions){const g=geometry(W,H),p={x:g.target.x*W,y:g.target.y*H};expect(g.target).toEqual({x:.485,y:.484});expect(g.target).toEqual(g.masses[1].center);
      for(const r of [g.masses[1].body,g.masses[1].simple]){const ps=samplePath(tracePath(r,W,H));expect(contains(p,ps[0])).toBe(true);expect(distance(p,ps)-.7/2).toBeGreaterThan(13);}
      for(const mode of ['guided','realistic','accessible'])for(const view of ['dorsal','ventral','lateral','internal'])expect(variedTarget(W,H,mode,view)).toEqual(g.target);
    }
    expect(geometry()).toEqual(geometry(500,600));
  });

  it.each([[0,600],[-1,600],[500,0],[NaN,600],[500,Infinity],['bad',600]])('rejects nonfinite or nonpositive dimensions %s by %s',(width,height)=>{
    expect(geometry(width,height)).toBeNull();const f=fixture({width,height}),before=f.ctx.state();expect(f.draw()).toBe(false);expect(f.ctx.state()).toEqual(before);expect(f.ctx.events).toEqual([]);
  });
});

describe('continuous hepatopancreatic material relief',()=>{
  it.each(dimensions)('clips broad diffuse relief and short creases to each intact mass, then applies one full-mass finish at %s by %s',(W,H)=>{
    const f=fixture({width:W,height:H}),before=f.ctx.state(),g=geometry(W,H);expect(f.draw()).toBe(true);expect(f.contact).toHaveBeenCalledTimes(2);expect(f.finish).toHaveBeenCalledTimes(2);
    expect(paints(f.ctx).filter(e=>e.operation==='fill')).toHaveLength(2);expect(paints(f.ctx).filter(e=>e.operation==='fillRect')).toHaveLength(6);expect(paints(f.ctx).filter(e=>e.operation==='stroke')).toHaveLength(10);
    g.masses.forEach((m,i)=>{
      const whole=tracePath(m.body,W,H),base=paints(f.ctx).filter(e=>e.operation==='fill')[i],contact=f.ctx.events.filter(e=>e.operation==='contact')[i],finish=f.ctx.events.filter(e=>e.operation==='finish')[i];
      expect(base.path).toEqual(whole);expect(base.clips).toEqual(['specimen']);expect(base.fill.kind).toBe('linear');expect(base.fill.stops.map(s=>s[0])).toEqual([0,.34,.76,1]);
      expect(contact.path).toEqual(whole);expect(contact.clips).toEqual(['specimen']);expect(finish.path).toEqual(whole);expect(finish.clips).toEqual(['specimen',whole]);
      expect(f.contact).toHaveBeenNthCalledWith(i+1,m.rx,m.ry);expect(f.finish).toHaveBeenNthCalledWith(i+1,m.center.x*W,m.center.y*H,m.rx,m.ry,'lobular','cray-digestive-'+m.side);
      for(const e of paints(f.ctx).filter(e=>e.operation==='fillRect').slice(i*3,i*3+3)){expect(e.clips).toEqual(['specimen',whole]);expect(e.fill.kind).toBe('radial');expect(e.fill.stops).toHaveLength(3);expect(e.fill.stops.at(-1)[1]).toBe('rgba(146,122,69,0)');}
      const creases=paints(f.ctx).filter(e=>e.width===.33).slice(i*2,i*2+2);creases.forEach((e,j)=>{expect(e.path).toEqual(tracePath(m.creases[j],W,H));expect(e.clips).toEqual(['specimen',whole]);});
    });
    expect(f.ctx.events.filter(e=>e.operation==='clip')).toHaveLength(4);expect(f.ctx.state()).toEqual(before);expect(f.ctx.stack).toEqual([]);
  });

  it.each([.90,.94])('preserves caller alpha %s and affine pose around material callbacks and lamp offsets',alpha=>{
    const matrix=[-1.8,.12,.21,1.4,811,-93],f=fixture({},matrix);f.ctx.globalAlpha=alpha;const before=f.ctx.state();f.draw();
    const [a,b,c,d,e,f0]=matrix,light=[-1,-.14],len=Math.hypot(...light),ox=light[0]/len*.25,oy=light[1]/len*.25,offset=[a,b,c,d,a*ox+c*oy+e,b*ox+d*oy+f0];
    for(const record of paints(f.ctx)){expect(record.alpha).toBe(alpha);expect(record.matrix).toEqual(record.width===.22?offset:matrix);expect(record.composite).toBe('source-over');expect(record.dash).toEqual([]);expect(record.cap).toBe('round');expect(record.join).toBe('round');expect(record.shadow).toEqual([0,0,0]);expect(record.clips[0]).toBe('specimen');}
    const highlights=paints(f.ctx).filter(e=>e.width===.22);geometry().masses.forEach((m,i)=>m.creases.forEach((r,j)=>expect(highlights[i*2+j].path).toEqual(tracePath(r,500,600,offset))));
    expect(f.ctx.state()).toEqual(before);expect(f.ctx.stack).toEqual([]);
  });

  it.each([{detailed:false},{accessible:true},{highContrast:true}])('retains the authored flat fallback and omits material cues under %j',overrides=>{
    const f=fixture(overrides),before=f.ctx.state();f.draw();expect(f.contact).not.toHaveBeenCalled();expect(f.finish).not.toHaveBeenCalled();expect(paints(f.ctx)).toHaveLength(4);
    expect(f.ctx.events.filter(e=>e.operation==='clip'||e.operation==='gradient')).toHaveLength(0);
    paints(f.ctx).filter(e=>e.operation==='fill').forEach((e,i)=>{expect(e.path).toEqual(tracePath(geometry().masses[i].simple,500,600));expect(e.fill).toBe(overrides.accessible?'#d97706':'#b38a4c');});
    expect(f.ctx.state()).toEqual(before);expect(f.ctx.stack).toEqual([]);
  });

  it.each([['left',[-1,-.14]],['right',[1,-.14]],['raking',[-.72,.70]],['unknown',[-.12,-1]]])('uses the physical %s lamp for both compact masses',(lightDirection,light)=>{
    const f=fixture({lightDirection});f.draw();const gradients=f.ctx.events.filter(e=>e.operation==='gradient'&&e.gradient.kind==='linear'),len=Math.hypot(...light);expect(gradients).toHaveLength(2);
    gradients.forEach((e,i)=>{const m=geometry().masses[i],[x1,y1,x2,y2]=e.gradient.args;expect((x1+x2)/2).toBeCloseTo(m.center.x*500,10);expect((y1+y2)/2).toBeCloseTo(m.center.y*600,10);expect((x1-x2)/(2*m.rx)).toBeCloseTo(light[0]/len,10);expect((y1-y2)/(2*m.ry)).toBeCloseTo(light[1]/len,10);});
  });

  it('varies restrained broad sheen with moisture, irradiance and condition while retaining every physical path',()=>{
    const wet=fixture({moisture:100,lightIntensity:100,condition:'standard'}),dry=fixture({moisture:0,lightIntensity:20,condition:'dehydrated'});wet.draw();dry.draw();
    expect(paints(wet.ctx).map(e=>e.path)).toEqual(paints(dry.ctx).map(e=>e.path));
    const alpha=s=>Number(s.match(/,([.\d]+)\)$/)[1]),wetRelief=paints(wet.ctx).filter(e=>e.operation==='fillRect'),dryRelief=paints(dry.ctx).filter(e=>e.operation==='fillRect');
    expect(alpha(wetRelief[0].fill.stops[0][1])).toBeGreaterThan(alpha(dryRelief[0].fill.stops[0][1]));expect(wetRelief[1].fill.stops).toEqual(dryRelief[1].fill.stops);
    expect(alpha(paints(wet.ctx).find(e=>e.width===.22).stroke)).toBeGreaterThan(alpha(paints(dry.ctx).find(e=>e.width===.22).stroke));
  });

  it('supports absent callbacks without changing the intact body and bounded relief',()=>{
    const f=fixture({contact:null,finish:null});expect(f.draw()).toBe(true);expect(paints(f.ctx).filter(e=>e.operation==='fill')).toHaveLength(2);expect(f.ctx.events.filter(e=>e.operation==='clip')).toHaveLength(2);
    const ctx=new Context(),before=ctx.state();expect(rawDraw(ctx,{})).toBe(false);expect(rawDraw(null,{width:500,height:600})).toBe(false);expect(ctx.state()).toEqual(before);expect(ctx.events).toEqual([]);
  });

  it.each(['contact','contact-second','gradient-linear','gradient-radial','base-fill','relief-fill','clip','finish-second'])('restores canvas state when %s throws',location=>{
    const f=fixture(),before=f.ctx.state(),fault=Error('injected '+location);let calls=0;
    if(location.startsWith('contact'))f.options.contact=()=>{if(++calls===(location==='contact-second'?2:1)){contaminate(f.ctx);throw fault;}};
    else if(location==='finish-second')f.options.finish=()=>{if(++calls===2){contaminate(f.ctx);throw fault;}};
    else{const method=location==='gradient-linear'?'createLinearGradient':location==='gradient-radial'?'createRadialGradient':location==='clip'?'clip':location==='relief-fill'?'fillRect':'fill',original=f.ctx[method].bind(f.ctx);f.ctx[method]=(...args)=>{if(++calls===1){contaminate(f.ctx);throw fault;}return original(...args);};}
    expect(f.draw).toThrow(fault);expect(f.ctx.state()).toEqual(before);expect(f.ctx.stack).toEqual([]);
  });
});

describe('native crayfish hepatopancreatic integration',()=>{
  it.each(dimensions)('inherits native window clipping, alpha and display gates before the unchanged heart section at %s by %s',(W,H)=>{
    for(const settings of [{},{detail:false},{accessible:true},{highContrast:true}])for(const alpha of [.90,.94]){
      const f=runNative(W,H,{...settings,alpha});expect(f.draw).toHaveBeenCalledTimes(1);expect(f.traceWindow).toHaveBeenCalledTimes(1);expect(f.traceWindow).toHaveBeenCalledWith(f.ctx);
      expect(f.calls[0].state.globalAlpha).toBe(alpha);expect(f.calls[0].state.clips).toEqual(['specimen',f.window]);
      expect(f.calls[0].options).toMatchObject({width:W,height:H,detailed:settings.detail!==false&&!settings.accessible&&!settings.highContrast,accessible:!!settings.accessible,highContrast:!!settings.highContrast,lightDirection:'raking',moisture:76,lightIntensity:68,condition:'preserved'});
      expect(typeof f.calls[0].options.contact).toBe('function');expect(typeof f.calls[0].options.finish).toBe('function');expect(f.ctx.state()).toEqual(f.before);expect(f.ctx.stack).toEqual([]);
    }
    expect(nativeBlock()).not.toContain('crayHeart');expect(nativeBlock()).toContain('var craySoftDetail');
  });

  it('retains the existing gross lobed inspection cue for the digestive gland mass',()=>{
    const footprint=production('structureInspectionFootprint',{structureOpticalDepth:()=> 'deep',W:500,H:600,organs:Array.from({length:11},()=>({})),spec:{bodyShape:'crayfish'},specimen:'crayfish'}),profile=footprint({id:'hepato',name:'Hepatopancreas'});
    expect(profile.morphology).toBe('lobed');expect(profile.morphologyLabel).toBe('LOBED');expect(profile.depth).toBe('deep');expect(profile.rotation).toBe(.18);
  });

  it('keeps desktop and canonical production copies synchronized',()=>{expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_dissection.js','utf8')).toBe(source);});
});

