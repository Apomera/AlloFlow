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

class RetinalContext extends Context {
  constructor(matrix) { super(matrix); this.ellipses = []; }
  ellipse(x,y,rx,ry,rotation,start,end) {
    this.ellipses.push([x,y,rx,ry,rotation,start,end]);
    for(let i=0;i<=256;i++) {
      const angle=start+(end-start)*i/256,u=Math.cos(angle)*rx,v=Math.sin(angle)*ry,
        px=x+u*Math.cos(rotation)-v*Math.sin(rotation),py=y+u*Math.sin(rotation)+v*Math.cos(rotation);
      if(i===0) {
        const p=this.point(px,py),last=this.path.at(-1);
        if(!last)this.moveTo(px,py);
        else if(last[0]!=='moveTo'||last[1]!==p[0]||last[2]!==p[1])this.lineTo(px,py);
      } else this.lineTo(px,py);
    }
  }
}
const geometry=production('sheepRetinalGeometry'),trace=production('traceSheepRetinalRegion');
const rawDraw=production('drawSheepRetinalMembrane',{sheepRetinalGeometry:geometry,traceSheepRetinalRegion:trace});
const paints=ctx=>ctx.events.filter(e=>['fill','stroke','fillRect'].includes(e.operation));
function tracePath(region,W,H,matrix,append=false){const ctx=new RetinalContext(matrix);trace(ctx,region,W,H,append);return ctx.path;}
function originalEllipse(W,H,scaleX,scaleY,matrix){
  const ctx=new RetinalContext(matrix),start=source.indexOf('var traceSheepEyeGlobe = function traceSheepEyeGlobe('),end=source.indexOf('function finishCurrentOpticalSurface',start);
  if(start<0||end<=start)throw Error('Missing native sheep globe tracer');
  const R=Math.min(W*.285,H*.36),bindings={ctx,eyeRx:R,eyeRy:R*.83,eyeCx:W*.5+W*.015,eyeCy:H*.45,scaleX,scaleY};
  new Function(...Object.keys(bindings),source.slice(start,end)+';traceSheepEyeGlobe(scaleX,scaleY);')(...Object.values(bindings));
  return ctx;
}
function closePath(actual,expected){expect(actual).toHaveLength(expected.length);actual.forEach((op,i)=>{expect(op[0]).toBe(expected[i][0]);expect(op).toHaveLength(expected[i].length);for(let j=1;j<op.length;j++)expect(op[j]).toBeCloseTo(expected[i][j],10);});}
function fixture(overrides={},matrix){const ctx=new RetinalContext(matrix);ctx.globalAlpha=.91;const options={width:500,height:600,detailed:true,accessible:false,highContrast:false,lightDirection:'left',moisture:82,lightIntensity:68,condition:'standard',...overrides};return{ctx,options,draw:()=>rawDraw(ctx,options)};}
function localPoint(p,g,W,H){const dx=(p.x-g.center.x)*W,dy=(p.y-g.center.y)*H,co=Math.cos(g.angle),si=Math.sin(g.angle);return{x:co*dx+si*dy,y:-si*dx+co*dy};}
function bandClearance(p,g,W,H){const q=localPoint(p,g,W,H),outer=Math.hypot(q.x/g.outer.rx,q.y/g.outer.ry),inner=Math.hypot(q.x/g.inner.rx,q.y/g.inner.ry);return{inside:outer<1&&inner>1,margin:Math.min(Math.min(g.outer.rx,g.outer.ry)*(1-outer),Math.min(g.inner.rx,g.inner.ry)*(inner-1))};}
function inBox(p,b){return p.x>=b.minX-1e-12&&p.x<=b.maxX+1e-12&&p.y>=b.minY-1e-12&&p.y<=b.maxY+1e-12;}
function nativeBandPoint(outer,inner,theta,blend,W,H){const [x,y,ox,oy,rotation]=outer,[,,ix,iy]=inner,rx=ix+(ox-ix)*blend,ry=iy+(oy-iy)*blend,u=rx*Math.cos(theta),v=ry*Math.sin(theta);return{x:(x+Math.cos(rotation)*u-Math.sin(rotation)*v)/W,y:(y+Math.sin(rotation)*u+Math.cos(rotation)*v)/H};}
function nativeBlock(){const start=source.indexOf('drawSheepRetinalMembrane(ctx,'),end=source.indexOf('});',start)+3;if(start<0||end<=start)throw Error('Missing native retinal call');return source.slice(start,end);}
function runNative(W,H,{detail=true,accessible=false,highContrast=false}={}){const ctx=new RetinalContext(),before=ctx.state(),draw=vi.fn();const bindings={ctx,W,H,sceneDetail:detail,eyeAccessible:accessible,highContrastEnabled:highContrast,lightDirection:'raking',liveTissueState:{moisture:82},d:{lightIntensity:68},specimenCondition:'preserved',drawSheepRetinalMembrane:draw};new Function(...Object.keys(bindings),nativeBlock())(...Object.values(bindings));return{ctx,before,draw};}
function variedTarget(W,H,mode,view){const bindings={spec:{bodyShape:'eye'},sheepRetinalGeometry:geometry,queryDissectionNode:()=>({_logicalW:W,_logicalH:H}),d:{visualRealism:mode,anatomicalView:view},visualRealism:mode,specimenVariationValue:()=>{throw Error('Registered retinal target must not jitter');},viewSpecificOrganPoint:()=>{throw Error('Registered retinal target must not receive view offsets');}};return production('variedOrganPoint',{...bindings,paintedSmallStructurePoint:production('paintedSmallStructurePoint',bindings)})({id:'retina',name:'Retina',x:.69,y:.35});}
function actualVessels(W,H){
  const ctx=new RetinalContext(),R=Math.min(W*.285,H*.36),eyeRx=R,eyeRy=R*.83,eyeCx=W*.5+W*.015,eyeCy=H*.45,
    start=source.indexOf('var retinalWidth ='),loop=source.indexOf('retinalTrees.forEach(function (tree)',start),end=source.indexOf('\n                    });',loop)+'\n                    });'.length;
  if(start<0||loop<=start||end<=loop)throw Error('Missing native connected retinal tree block');
  const bindings={ctx,eyeR:R,eyeRx,eyeRy,eyeCx,eyeCy,opticDiscX:eyeCx+eyeRx*.76,opticDiscY:eyeCy+eyeRy*.10};
  new Function(...Object.keys(bindings),source.slice(start,end))(...Object.values(bindings));return paints(ctx).filter(e=>e.operation==='fill');
}

describe('registered delicate retinal membrane geometry',()=>{
  it.each(dimensions)('preserves the exact native outer retina and inner vitreous ellipses at %s by %s',(W,H)=>{
    const g=geometry(W,H);expect(g.radius).toBe(Math.min(W*.285,H*.36));expect(g.eyeRy).toBe(g.radius*.83);expect(g.center).toEqual({x:.515,y:.45});expect(g.angle).toBe(-.015);
    closePath(tracePath(g.outer,W,H),originalEllipse(W,H,.89,.865).path);closePath(tracePath(g.inner,W,H),originalEllipse(W,H,.845,.81).path);
    const matrix=[-2.1,.13,.21,1.7,810,-93];closePath(tracePath(g.outer,W,H,matrix),originalEllipse(W,H,.89,.865,matrix).path);
    expect(geometry()).toEqual(geometry(500,600));
  });

  it.each(dimensions)('keeps the geometry-owned midpoint target in exposed membrane before all generic variation at %s by %s',(W,H)=>{
    const g=geometry(W,H),outer=samplePath(originalEllipse(W,H,.89,.865).path),inner=samplePath(originalEllipse(W,H,.845,.81).path),p={x:g.target.x*W,y:g.target.y*H};
    expect(g.targetAngle).toBe(.65);expect(contains(p,outer[0])).toBe(true);expect(contains(p,inner[0])).toBe(false);expect(distance(p,outer)).toBeGreaterThan(1.95);expect(distance(p,inner)).toBeGreaterThan(1.95);expect(inBox(g.target,g.targetArcBounds)).toBe(true);
    const expected=nativeBandPoint(originalEllipse(W,H,.89,.865).ellipses[0],originalEllipse(W,H,.845,.81).ellipses[0],.65,.5,W,H);
    expect(g.target.x).toBeCloseTo(expected.x,13);expect(g.target.y).toBeCloseTo(expected.y,13);
    for(const mode of ['guided','realistic','accessible'])for(const view of ['dorsal','ventral','lateral','internal'])expect(variedTarget(W,H,mode,view)).toEqual(g.target);
  });

  it.each(dimensions)('covers the native exposed annulus with sixteen finite sectors while leaving central vitreous free at %s by %s',(W,H)=>{
    const g=geometry(W,H),outer=originalEllipse(W,H,.89,.865).ellipses[0],inner=originalEllipse(W,H,.845,.81).ellipses[0];expect(g.bandSectors).toHaveLength(16);
    for(const b of g.bandSectors){expect(Object.values(b).every(Number.isFinite)).toBe(true);expect(b.minX).toBeLessThan(b.maxX);expect(b.minY).toBeLessThan(b.maxY);expect(b.minX).toBeGreaterThanOrEqual(g.bounds.minX-1e-12);expect(b.maxX).toBeLessThanOrEqual(g.bounds.maxX+1e-12);expect(b.minY).toBeGreaterThanOrEqual(g.bounds.minY-1e-12);expect(b.maxY).toBeLessThanOrEqual(g.bounds.maxY+1e-12);}
    let missing=0;for(const blend of [0,.25,.5,.75,1])for(let i=0;i<2048;i++){const p=nativeBandPoint(outer,inner,i/2048*Math.PI*2,blend,W,H);if(!g.bandSectors.some(b=>inBox(p,b)))missing++;}expect(missing).toBe(0);
    for(const [x,y]of[[0,0],[.3,0],[-.3,0],[0,.3],[0,-.3]]){const p={x:g.center.x+g.radius*x/W,y:g.center.y+g.eyeRy*y/H};expect(g.bandSectors.some(b=>inBox(p,b))).toBe(false);}
  });

  it.each(dimensions)('keeps every finite-width open glint continuously inside the exposed band at %s by %s',(W,H)=>{
    const g=geometry(W,H);expect(g.glints).toHaveLength(3);
    for(const r of g.glints){expect(r.closed).toBe(false);expect(r.curves).toHaveLength(1);expect(tracePath(r,W,H).some(op=>op[0]==='closePath')).toBe(false);
      const points=[r.start,...r.curves[0]],dist=(p,q)=>Math.hypot((p.x-q.x)*W,(p.y-q.y)*H),speed=3*Math.max(dist(points[0],points[1]),dist(points[1],points[2]),dist(points[2],points[3]));
      let minimum=Infinity;for(const p of samplePath(tracePath(r,W,H),200)[0]){const normalized={x:p.x/W,y:p.y/H},v=bandClearance(normalized,g,W,H);expect(v.inside).toBe(true);minimum=Math.min(minimum,v.margin);}
      expect(minimum-.28/2-speed/400).toBeGreaterThan(1.5);
    }
  });

  it.each([[0,600],[-1,600],[500,0],[NaN,600],[500,Infinity],['bad',600]])('rejects invalid dimensions %s by %s',(width,height)=>{expect(geometry(width,height)).toBeNull();const f=fixture({width,height}),before=f.ctx.state();expect(f.draw()).toBe(false);expect(f.ctx.state()).toEqual(before);expect(f.ctx.events).toEqual([]);});
});

describe('bounded translucent retinal material',()=>{
  it.each(dimensions)('preserves the full lining and restricts new pearl and three glints to two independent evenodd ellipse subpaths at %s by %s',(W,H)=>{
    const f=fixture({width:W,height:H}),before=f.ctx.state(),g=geometry(W,H);expect(f.draw()).toBe(true);const records=paints(f.ctx);expect(records.map(e=>e.operation)).toEqual(['fill','stroke','fillRect','stroke','stroke','stroke']);
    closePath(records[0].path,originalEllipse(W,H,.89,.865).path);expect(records[1].path).toEqual(records[0].path);expect(records[0].fill).toBe('rgba(244,230,183,0.72)');expect(records[1].stroke).toBe('rgba(253,230,138,0.65)');expect(records[1].width).toBe(.85);
    const clips=f.ctx.events.filter(e=>e.operation==='clip');expect(clips).toHaveLength(1);expect(clips[0].rule).toBe('evenodd');expect(clips[0].path.filter(op=>op[0]==='moveTo')).toHaveLength(2);expect(clips[0].path.filter(op=>op[0]==='closePath')).toHaveLength(2);
    const p={x:g.target.x*W,y:g.target.y*H},center={x:g.center.x*W,y:g.center.y*H};expect(evenOddContains(p,clips[0].path)).toBe(true);expect(evenOddContains(center,clips[0].path)).toBe(false);
    expect(records[0].clips).toEqual(['specimen']);for(const e of records.slice(2))expect(e.clips).toEqual(['specimen',clips[0].path]);
    expect(records[2].fill.kind).toBe('linear');expect(records[2].fill.stops).toHaveLength(4);records.slice(3).forEach((e,i)=>{expect(e.path).toEqual(tracePath(g.glints[i],W,H));expect(e.width).toBe(.28);});
    expect(f.ctx.state()).toEqual(before);expect(f.ctx.stack).toEqual([]);
  });

  it.each([.72,1])('preserves inherited alpha %s, pose, clipping and canvas state',alpha=>{
    const matrix=[-1.8,.12,.21,1.4,811,-93],f=fixture({},matrix);f.ctx.globalAlpha=alpha;const before=f.ctx.state();f.draw();for(const record of paints(f.ctx)){expect(record.alpha).toBe(alpha);expect(record.matrix).toEqual(matrix);expect(record.composite).toBe('source-over');expect(record.dash).toEqual([]);expect(record.cap).toBe('round');expect(record.join).toBe('round');expect(record.shadow).toEqual([0,0,0]);expect(record.clips[0]).toBe('specimen');}expect(f.ctx.state()).toEqual(before);expect(f.ctx.stack).toEqual([]);
  });

  it.each([{detailed:false},{accessible:true},{highContrast:true}])('retains the original teaching lining and omits all new detail for %j',overrides=>{
    const f=fixture(overrides),before=f.ctx.state();f.draw();const records=paints(f.ctx);expect(records.map(e=>e.operation)).toEqual(['fill','stroke']);expect(records[0].fill).toBe(overrides.accessible?'rgba(254,249,195,0.92)':'rgba(244,230,183,0.72)');expect(records[1].width).toBe(overrides.accessible?1.5:.85);expect(f.ctx.events.filter(e=>e.operation==='clip'||e.operation==='gradient')).toHaveLength(0);expect(f.ctx.state()).toEqual(before);
  });

  it.each([['left',[-1,-.14]],['right',[1,-.14]],['raking',[-.72,.70]],['unknown',[-.12,-1]]])('uses the physical %s lamp for extremely restrained pearly transmission',(lightDirection,light)=>{
    const f=fixture({lightDirection});f.draw();const gradient=f.ctx.events.find(e=>e.operation==='gradient').gradient,g=geometry(),[x1,y1,x2,y2]=gradient.args,len=Math.hypot(...light);expect((x1+x2)/2).toBeCloseTo(g.center.x*500,10);expect((y1+y2)/2).toBeCloseTo(g.center.y*600,10);expect((x1-x2)/(2*g.outer.rx)).toBeCloseTo(light[0]/len,10);expect((y1-y2)/(2*g.outer.ry)).toBeCloseTo(light[1]/len,10);
  });

  it('responds to moisture, irradiance and condition without changing the lining or adding anatomical paths',()=>{
    const wet=fixture({moisture:100,lightIntensity:100,condition:'standard'}),dry=fixture({moisture:0,lightIntensity:20,condition:'dehydrated'});wet.draw();dry.draw();expect(paints(wet.ctx).map(e=>e.path)).toEqual(paints(dry.ctx).map(e=>e.path));expect(paints(wet.ctx)[0].fill).toBe(paints(dry.ctx)[0].fill);
    const alpha=s=>Number(s.match(/,([.\d]+)\)$/)[1]);expect(alpha(paints(wet.ctx)[2].fill.stops[0][1])).toBeLessThanOrEqual(.055);expect(alpha(paints(wet.ctx)[2].fill.stops[0][1])).toBeGreaterThan(alpha(paints(dry.ctx)[2].fill.stops[0][1]));expect(alpha(paints(wet.ctx)[3].stroke)).toBeGreaterThan(alpha(paints(dry.ctx)[3].stroke));
  });

  it.each(['normalize','base-fill','base-border','compound-clip','gradient','membrane-fill','first-glint','third-glint'])('balances context state when %s throws',location=>{
    const f=fixture(),before=f.ctx.state(),fault=Error('injected '+location);let calls=0;
    const method=location==='normalize'?'setLineDash':location==='base-fill'?'fill':location==='compound-clip'?'clip':location==='gradient'?'createLinearGradient':location==='membrane-fill'?'fillRect':'stroke',original=f.ctx[method].bind(f.ctx),at=location==='first-glint'?2:location==='third-glint'?4:1;
    f.ctx[method]=(...args)=>{if(++calls===at){f.ctx.translate(23,-17);f.ctx.globalAlpha=.1;f.ctx.globalCompositeOperation='destination-out';throw fault;}return original(...args);};expect(f.draw).toThrow(fault);expect(f.ctx.state()).toEqual(before);expect(f.ctx.stack).toEqual([]);
  });
});

describe('native retinal integration and preserved connected vessels',()=>{
  it.each(dimensions)('passes native detail gates and material controls before the unchanged vitreous section at %s by %s',(W,H)=>{
    for(const settings of [{},{detail:false},{accessible:true},{highContrast:true}]){const f=runNative(W,H,settings);expect(f.draw).toHaveBeenCalledTimes(1);expect(f.draw.mock.calls[0][0]).toBe(f.ctx);expect(f.draw.mock.calls[0][1]).toMatchObject({width:W,height:H,detailed:settings.detail!==false&&!settings.accessible&&!settings.highContrast,accessible:!!settings.accessible,highContrast:!!settings.highContrast,lightDirection:'raking',moisture:82,lightIntensity:68,condition:'preserved'});expect(f.ctx.state()).toEqual(f.before);expect(f.ctx.events).toEqual([]);}
    expect(source.indexOf('drawSheepRetinalMembrane(ctx,')).toBeLessThan(source.indexOf('// Vitreous gel fills the posterior globe with soft depth and condition-aware clarity.'));
  });

  it.each(dimensions)('retains nine native connected ribbon fills and keeps the new target outside every ribbon at %s by %s',(W,H)=>{
    const ribbons=actualVessels(W,H),g=geometry(W,H),p={x:g.target.x*W,y:g.target.y*H};expect(ribbons).toHaveLength(9);for(const record of ribbons){expect(record.path.filter(op=>op[0]==='bezierCurveTo')).toHaveLength(2);expect(record.path.filter(op=>op[0]==='moveTo')).toHaveLength(1);expect(record.path.at(-1)).toEqual(['closePath']);expect(contains(p,samplePath(record.path)[0])).toBe(false);}
  });

  it('keeps desktop and canonical production copies synchronized',()=>{expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_dissection.js','utf8')).toBe(source);});
});

describe('final full-size retinal callout placement',()=>{
  const place=production('placeDissectionCallout');
  const overlap=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
  const fits=(a,v)=>a.x>=v.x&&a.y>=v.y&&a.x+a.width<=v.x+v.width&&a.y+a.height<=v.y+v.height;

  it('preserves an already clear position and never mutates input geometry',()=>{
    const card={x:30,y:35,width:20,height:10},viewport={x:0,y:0,width:100,height:100},obstacles=[{x:60,y:20,width:30,height:60}],before=JSON.stringify({card,viewport,obstacles});
    expect(place(card,viewport,obstacles)).toEqual(card);expect(JSON.stringify({card,viewport,obstacles})).toBe(before);
    expect(place({x:-10,y:110,width:20,height:10},viewport,[])).toEqual({x:0,y:90,width:20,height:10});
  });

  it('finds the nearest central slot requiring X and Y edges from different obstacles',()=>{
    const card={x:40,y:40,width:20,height:20},viewport={x:0,y:0,width:100,height:100},obstacles=[{x:0,y:0,width:60,height:55},{x:55,y:55,width:45,height:45}],result=place(card,viewport,obstacles);
    expect(result).toEqual({x:35,y:55,width:20,height:20});expect(obstacles.some(b=>overlap(result,b))).toBe(false);
  });

  it('keeps a full-size slot between exactly touching forbidden top intervals',()=>{
    expect(place({x:0,y:30,width:100,height:20},{x:0,y:0,width:100,height:100},[{x:0,y:0,width:100,height:40},{x:0,y:60,width:100,height:40}])).toEqual({x:0,y:40,width:100,height:20});
  });

  it('returns null for impossible full-size placement or invalid card and viewport geometry',()=>{
    const card={x:20,y:30,width:20,height:10},viewport={x:0,y:0,width:100,height:100};
    expect(place(card,viewport,[viewport])).toBeNull();expect(place({...card,width:101},viewport,[])).toBeNull();expect(place({...card,x:NaN},viewport,[])).toBeNull();expect(place(card,{...viewport,height:0},[])).toBeNull();
  });

  it('repairs the observed 1000 by 600 seed19 card collision and its mirrored counterpart without shrinking',()=>{
    // Captured from retinal-layout-failure.json: CSS650x390, internal view, zoom3.
    // Keep the numeric fixture portable; production tests do not depend on tmp artifacts.
    const W=1000,H=600,cssScale=1000/650,ui=1.6923076923076925,matrix={a:2.982688844203949,d:2.993499219417572,e:-1487.8934829235077,f:-774.1024857759476};
    const card={x:187.23198008723176*cssScale,y:177.29999567218937*cssScale,width:116.10558796338*cssScale,height:26.399999289334744*cssScale};
    const viewport={x:16*ui,y:82,width:W-32*ui,height:H-22-62*cssScale-82},padding=3*ui;
    const boxes=geometry(W,H).bandSectors.map(b=>({x:matrix.a*b.minX*W+matrix.e-padding,y:matrix.d*b.minY*H+matrix.f-padding,width:matrix.a*(b.maxX-b.minX)*W+padding*2,height:matrix.d*(b.maxY-b.minY)*H+padding*2}));
    const otherCards=[{x:.5439715640643366,y:.5564764525379378,width:.01021277796783173,height:.022613102896769575},{x:.6477668772649084,y:.6092403592970668,width:.01021277796783173,height:.022613102896769575}].map(b=>({x:matrix.a*b.x*W+matrix.e,y:matrix.d*b.y*H+matrix.f,width:matrix.a*b.width*W,height:matrix.d*b.height*H}));
    const obstacles=boxes.concat(otherCards);expect(boxes.some(b=>overlap(card,b))).toBe(true);
    const result=place(card,viewport,obstacles);expect(result).not.toBeNull();expect(result.width).toBe(card.width);expect(result.height).toBe(card.height);expect(fits(result,viewport)).toBe(true);expect(obstacles.some(b=>overlap(result,b))).toBe(false);expect(result.y).toBeCloseTo(card.y,9);
    const mirror=b=>({...b,x:W-b.x-b.width}),mirrored=place(mirror(card),viewport,obstacles.map(mirror));
    expect(mirrored).not.toBeNull();expect(mirrored.width).toBe(card.width);expect(mirrored.height).toBe(card.height);expect(fits(mirrored,viewport)).toBe(true);expect(obstacles.map(mirror).some(b=>overlap(mirrored,b))).toBe(false);expect(mirrored.x).toBeCloseTo(W-result.x-result.width,5);expect(mirrored.y).toBeCloseTo(result.y,5);
  });

  it('matches an independent exhaustive nearest-placement oracle on small integer scenes',()=>{
    const viewport={x:0,y:0,width:30,height:24},cases=[
      {card:{x:11,y:9,width:6,height:4},obstacles:[{x:0,y:0,width:17,height:13},{x:14,y:13,width:16,height:11}]},
      {card:{x:5,y:7,width:6,height:4},obstacles:[{x:3,y:3,width:13,height:10},{x:20,y:0,width:10,height:24}]},
      {card:{x:27,y:-5,width:6,height:4},obstacles:[{x:10,y:0,width:8,height:19},{x:0,y:18,width:10,height:6}]}
    ];
    for(const{card,obstacles}of cases){let minimum=Infinity;for(let x=0;x<=viewport.width-card.width;x++)for(let y=0;y<=viewport.height-card.height;y++){const p={...card,x,y};if(!obstacles.some(b=>overlap(p,b)))minimum=Math.min(minimum,(x-card.x)**2+(y-card.y)**2);}
      const result=place(card,viewport,obstacles);expect(result).not.toBeNull();expect(fits(result,viewport)).toBe(true);expect(obstacles.some(b=>overlap(result,b))).toBe(false);expect((result.x-card.x)**2+(result.y-card.y)**2).toBe(minimum);
    }
  });

  it('performs the eye-only repair after viewport clamping and before publishing card hit rectangles',()=>{
    const clamp=source.indexOf('clampDissectionCalloutCard(item, labelLeftBound'),repair=source.indexOf('// Repair active eye cards against the complete exposed membrane last.'),hit=source.indexOf('canvas._hotspotLabelBoxes = adaptiveHotspotLayout');
    expect(clamp).toBeGreaterThan(0);expect(repair).toBeGreaterThan(clamp);expect(hit).toBeGreaterThan(repair);
    const caller=source.slice(repair,hit);expect(caller).toContain("spec.bodyShape === 'eye'");expect(caller).toContain('item.fullLabel');expect(caller).toContain('item.selected || item.hovered || item.guidedCallout');expect(caller).toContain('retinalLabelGeometry.bandSectors');expect(caller).toContain('Math.min(labelSpecimenX(placement.x), labelSpecimenX(placement.x + card.width))');
  });
});

