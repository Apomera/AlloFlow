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

const geometry=production('crayfishGastricMillGeometry'),trace=production('traceCrayfishGastricMillRegion');
const draw=production('drawCrayfishGastricMill',{crayfishGastricMillGeometry:geometry,traceCrayfishGastricMillRegion:trace});
const paints=ctx=>ctx.events.filter(e=>['fill','stroke','fillRect'].includes(e.operation));
function tracePath(region,W,H,open=false,matrix){const ctx=new Context(matrix);trace(ctx,region,W,H,open);return ctx.path;}
function closePath(actual,expected){expect(actual).toHaveLength(expected.length);actual.forEach((op,i)=>{expect(op[0]).toBe(expected[i][0]);expect(op).toHaveLength(expected[i].length);for(let j=1;j<op.length;j++)expect(op[j]).toBeCloseTo(expected[i][j],10);});}
function nativeCavity(W,H,matrix){const ctx=new Context(matrix);ctx.beginPath();ctx.ellipse(W*.5-W*.12,H*.45,W*.025,H*.030,0,0,Math.PI*2);return ctx.path;}
function nativeTooth(index,W,H,matrix){
  // Frozen native grinding plates before the material-only extraction.
  const ctx=new Context(matrix),x=W*.5-W*.12,y=H*.45;ctx.beginPath();
  if(index<2){const side=index===0?-1:1;ctx.moveTo(x+side*W*.022,y-H*.006);
    ctx.bezierCurveTo(x+side*W*.019,y-H*.012,x+side*W*.010,y-H*.009,x+side*W*.007,y-H*.003);
    ctx.bezierCurveTo(x+side*W*.004,y+H*.002,x+side*W*.006,y+H*.010,x+side*W*.011,y+H*.014);
    ctx.bezierCurveTo(x+side*W*.014,y+H*.017,x+side*W*.020,y+H*.015,x+side*W*.021,y+H*.010);
    ctx.quadraticCurveTo(x+side*W*.024,y+H*.002,x+side*W*.022,y-H*.006);
  }else{ctx.moveTo(x-W*.009,y-H*.023);ctx.quadraticCurveTo(x,y-H*.026,x+W*.009,y-H*.023);
    ctx.bezierCurveTo(x+W*.011,y-H*.018,x+W*.008,y-H*.010,x+W*.006,y-H*.006);
    ctx.quadraticCurveTo(x,y-H*.002,x-W*.006,y-H*.006);
    ctx.bezierCurveTo(x-W*.008,y-H*.010,x-W*.011,y-H*.018,x-W*.009,y-H*.023);
  }ctx.closePath();return ctx.path;
}
function nativeRidge(side,index,W,H,matrix){const ctx=new Context(matrix),x=W*.5-W*.12,y=H*.45+H*(-.003+index*.006);ctx.beginPath();ctx.moveTo(x+side*W*.008,y);ctx.quadraticCurveTo(x+side*W*.015,y+H*.002,x+side*W*.022,y-H*.001);return ctx.path;}
function actualWindow(W,H){const ctx=new Context();production('traceCrayfishVisceralWindow',{ctx,W,H,cx:W*.5,cy:H*.45})(ctx);return ctx.path;}
function contaminate(ctx){ctx.translate(23,-17);ctx.scale(.3,-.5);ctx.globalAlpha=.1;ctx.globalCompositeOperation='destination-out';ctx.setLineDash([17,11]);ctx.shadowBlur=19;ctx.beginPath();ctx.moveTo(-9000,-9000);ctx.lineTo(-9001,-9001);}
function fixture(overrides={},matrix){
  const ctx=new Context(matrix),finish=vi.fn((...args)=>{ctx.events.push({operation:'finish-cavity',args,path:structuredClone(ctx.path),clips:structuredClone(ctx.clips)});ctx.clip();contaminate(ctx);});
  const options={width:500,height:600,detailed:true,accessible:false,highContrast:false,lightDirection:'left',moisture:76,lightIntensity:68,condition:'standard',finishCavity:finish,...overrides};
  return{ctx,finish,options,draw:()=>draw(ctx,options)};
}
function actualTarget(mode,view){const bindings={spec:{bodyShape:'crayfish'},d:{visualRealism:mode,anatomicalView:view},visualRealism:mode,
  specimenVariationValue:()=>{throw Error('Gastric mill target must not jitter');},viewSpecificOrganPoint:()=>{throw Error('Gastric mill target must not receive view offsets');}};
  return production('variedOrganPoint',{...bindings,paintedSmallStructurePoint:production('paintedSmallStructurePoint',bindings)})({id:'gastric_mill',name:'Gastric Mill',x:.38,y:.45});
}
function nativeCall(){const start=source.indexOf('drawCrayfishGastricMill(ctx,'),end=source.indexOf('});',start)+3;if(start<0||end<=start)throw Error('Missing native gastric mill renderer call');return source.slice(start,end);}

describe('registered crayfish gastric mill surfaces',()=>{
  it.each(dimensions)('preserves the exact native cavity, all three plates and six open ridges at %s by %s',(W,H)=>{
    const g=geometry(W,H);expect(g.width).toBe(W);expect(g.height).toBe(H);expect(g.center.x).toBeCloseTo(.38,13);expect(g.center.y).toBe(.45);expect(g.radiusX).toBe(W*.025);expect(g.radiusY).toBe(H*.030);
    expect(g.teeth.map(t=>t.id)).toEqual(['lateral-left','lateral-right','median']);expect(g.teeth.map(t=>t.ridges.length)).toEqual([3,3,0]);
    for(const matrix of[undefined,[-2.1,.13,.21,1.7,810,-93]])g.teeth.forEach((tooth,index)=>{closePath(tracePath(tooth.region,W,H,false,matrix),nativeTooth(index,W,H,matrix));tooth.ridges.forEach((ridge,j)=>{closePath(tracePath(ridge,W,H,true,matrix),nativeRidge(tooth.side,j,W,H,matrix));expect(tracePath(ridge,W,H,true).some(op=>op[0]==='closePath')).toBe(false);});});
    expect(g.teeth.slice(0,2).every(t=>t.region.segments.map(s=>s.kind).join('')==='CCCQ')).toBe(true);expect(g.teeth[2].region.segments.map(s=>s.kind).join('')).toBe('QCQC');
  });

  it.each(dimensions)('keeps each original plate and the stable inspection gap within the real cavity and visceral opening at %s by %s',(W,H)=>{
    const g=geometry(W,H),window=samplePath(actualWindow(W,H))[0],p={x:g.target.x*W,y:g.target.y*H};expect(actualWindow(W,H).filter(op=>op[0]==='bezierCurveTo')).toHaveLength(5);
    expect(g.target).toEqual(g.center);expect(contains(p,window)).toBe(true);expect(contains(p,samplePath(nativeCavity(W,H))[0])).toBe(true);
    for(let i=0;i<48;i++){const t=i/48*Math.PI*2,q={x:p.x+(g.radiusX+.35)*Math.cos(t),y:p.y+(g.radiusY+.35)*Math.sin(t)};expect(contains(q,window)).toBe(true);expect(q.x/W).toBeGreaterThanOrEqual(g.bounds.minX-1e-12);expect(q.x/W).toBeLessThanOrEqual(g.bounds.maxX+1e-12);expect(q.y/H).toBeGreaterThanOrEqual(g.bounds.minY-1e-12);expect(q.y/H).toBeLessThanOrEqual(g.bounds.maxY+1e-12);
      for(const zoom of[1,4]){const pose=new Context([-2.1*zoom,.13*zoom,.21*zoom,1.7*zoom,810,-93]),corners=[[g.bounds.minX,g.bounds.minY],[g.bounds.maxX,g.bounds.minY],[g.bounds.minX,g.bounds.maxY],[g.bounds.maxX,g.bounds.maxY]].map(([x,y])=>pose.point(x*W,y*H)),actual=pose.point(q.x,q.y);expect(actual[0]).toBeGreaterThanOrEqual(Math.min(...corners.map(c=>c[0]))-1e-9);expect(actual[0]).toBeLessThanOrEqual(Math.max(...corners.map(c=>c[0]))+1e-9);expect(actual[1]).toBeGreaterThanOrEqual(Math.min(...corners.map(c=>c[1]))-1e-9);expect(actual[1]).toBeLessThanOrEqual(Math.max(...corners.map(c=>c[1]))+1e-9);}
    }
    for(const tooth of g.teeth){const path=samplePath(tracePath(tooth.region,W,H))[0];expect(contains(p,path)).toBe(false);expect(distance(p,[path])).toBeGreaterThan(.25);
      for(const q of path){expect(((q.x-p.x)/g.radiusX)**2+((q.y-p.y)/g.radiusY)**2).toBeLessThanOrEqual(1+1e-12);expect(contains(q,window)).toBe(true);expect(q.x/W).toBeGreaterThanOrEqual(tooth.region.bounds.minX-1e-12);expect(q.x/W).toBeLessThanOrEqual(tooth.region.bounds.maxX+1e-12);expect(q.y/H).toBeGreaterThanOrEqual(tooth.region.bounds.minY-1e-12);expect(q.y/H).toBeLessThanOrEqual(tooth.region.bounds.maxY+1e-12);}
    }
    for(const mode of['guided','realistic','accessible'])for(const view of['dorsal','ventral','lateral','internal']){const target=actualTarget(mode,view);expect(target.x).toBeCloseTo(g.target.x,13);expect(target.y).toBeCloseTo(g.target.y,13);}
  });

  it('provides default geometry and rejects invalid painter dimensions before touching canvas state',()=>{
    expect(geometry()).toEqual(geometry(500,600));expect(geometry('500','600')).toEqual(geometry(500,600));
    for(const [width,height]of[[0,600],[-1,600],[500,0],[NaN,600],[500,Infinity],['bad',600]]){expect(geometry(width,height)).toBeNull();const f=fixture({width,height}),before=f.ctx.state();expect(f.draw()).toBe(false);expect(f.ctx.events).toEqual([]);expect(f.ctx.state()).toEqual(before);}
    const ctx=new Context(),before=ctx.state();expect(draw(ctx)).toBe(false);expect(draw(null,{width:500,height:600})).toBe(false);expect(ctx.state()).toEqual(before);expect(ctx.events).toEqual([]);
  });

  it('opens only ridge paths and ignores absent trace regions without modifying the existing path',()=>{
    const ctx=new Context();ctx.beginPath();ctx.moveTo(7,9);const before=structuredClone(ctx.path);expect(trace(ctx,null,500,600)).toBe(false);expect(trace(null,geometry().teeth[0].region,500,600)).toBe(false);expect(ctx.path).toEqual(before);
    trace(ctx,geometry().teeth[0].region,500,600);expect(ctx.path.filter(op=>op[0]==='closePath')).toHaveLength(1);trace(ctx,geometry().teeth[0].ridges[0],500,600,true);expect(ctx.path.some(op=>op[0]==='closePath')).toBe(false);
  });
});

describe('bounded gastric grinding surface material',()=>{
  it.each(dimensions)('uses three whole-tooth clips for fixed bevel/ridge work and the original cavity callback at %s by %s',(W,H)=>{
    const f=fixture({width:W,height:H}),before=f.ctx.state(),g=geometry(W,H);expect(f.draw()).toBe(true);const records=paints(f.ctx),fills=records.filter(e=>e.operation==='fill'),strokes=records.filter(e=>e.operation==='stroke'),clips=f.ctx.events.filter(e=>e.operation==='clip'),cavity=nativeCavity(W,H);
    expect(fills).toHaveLength(4);expect(strokes).toHaveLength(19);expect(f.ctx.events.filter(e=>e.operation==='gradient')).toHaveLength(6);expect(records.some(e=>e.operation==='fillRect')).toBe(false);expect(clips).toHaveLength(5); // One cavity, one callback-owned, three tooth clips.
    closePath(fills[0].path,cavity);expect(fills[0].fill).toBe('#655346');expect(fills[0].clips).toEqual(['specimen']);expect(strokes[0].width).toBe(.7);expect(strokes[0].stroke).toBe('#a48b67');
    expect(f.finish).toHaveBeenCalledExactlyOnceWith(g.center.x*W,g.center.y*H,g.radiusX,g.radiusY);const finish=f.ctx.events.find(e=>e.operation==='finish-cavity');expect(finish.path).toEqual(cavity);expect(finish.clips).toEqual(['specimen',cavity]);
    const bevels=strokes.filter(e=>e.width===1.35),ridges=strokes.filter(e=>e.width===.35),glints=strokes.filter(e=>e.width===.22);expect(bevels).toHaveLength(3);expect(ridges).toHaveLength(6);expect(glints).toHaveLength(6);
    g.teeth.forEach((tooth,index)=>{const whole=tracePath(tooth.region,W,H);expect(fills[index+1].path).toEqual(whole);expect(fills[index+1].clips).toEqual(['specimen',cavity]);expect(fills[index+1].fill.stops.map(s=>s[0])).toEqual([0,.32,.74,1]);expect(bevels[index].path).toEqual(whole);expect(bevels[index].clips).toEqual(['specimen',cavity,whole]);expect(bevels[index].stroke.stops.map(s=>s[0])).toEqual([0,.40,.66,1]);
      tooth.ridges.forEach((ridge,j)=>{const k=index*3+j;expect(ridges[k].path).toEqual(tracePath(ridge,W,H,true));expect(ridges[k].stroke).toBe('rgba(117,88,58,0.58)');expect(ridges[k].clips).toEqual(['specimen',cavity,whole]);expect(glints[k].clips).toEqual(['specimen',cavity,whole]);expect(glints[k].path.some(op=>op[0]==='closePath')).toBe(false);});
    });expect(f.ctx.state()).toEqual(before);expect(f.ctx.stack).toEqual([]);
  });

  it.each([{detailed:false},{accessible:true},{highContrast:true}])('retains the exact native four flat fills and outlines for %j',overrides=>{
    const f=fixture(overrides),before=f.ctx.state();f.draw();const records=paints(f.ctx),fills=records.filter(e=>e.operation==='fill'),strokes=records.filter(e=>e.operation==='stroke');expect(records).toHaveLength(8);expect(f.ctx.events.filter(e=>e.operation==='gradient')).toHaveLength(0);expect(f.ctx.events.filter(e=>e.operation==='clip')).toHaveLength(2);expect(f.finish).toHaveBeenCalledTimes(1);
    fills.forEach((fill,index)=>{closePath(fill.path,index?nativeTooth(index-1,500,600):nativeCavity(500,600));expect(fill.fill).toBe(index?['#d6c29a','#d6c29a','#e6d6b5'][index-1]:overrides.accessible?'#78350f':'#655346');expect(strokes[index].path).toEqual(fill.path);expect(strokes[index].width).toBe(index?.5:.7);expect(strokes[index].stroke).toBe(index?'#80694b':'#a48b67');});expect(f.ctx.state()).toEqual(before);
  });

  it.each([.90,.94])('inherits caller opacity %s and the complete mirrored/sheared affine without callback contamination',alpha=>{
    const matrix=[-1.8,.12,.21,1.4,811,-93],f=fixture({},matrix);f.ctx.globalAlpha=alpha;const before=f.ctx.state();f.draw();const light=[-1,-.14],len=Math.hypot(...light),ox=light[0]/len*.24,oy=light[1]/len*.24,offset=[...matrix.slice(0,4),matrix[4]+matrix[0]*ox+matrix[2]*oy,matrix[5]+matrix[1]*ox+matrix[3]*oy];
    for(const record of paints(f.ctx)){expect(record.alpha).toBe(alpha);expect(record.composite).toBe(before.globalCompositeOperation);expect(record.matrix).toEqual(record.width===.22?offset:matrix);expect(record.clips[0]).toBe('specimen');if([1.35,.35,.22].includes(record.width)){expect(record.dash).toEqual([]);expect(record.cap).toBe('round');expect(record.join).toBe('round');expect(record.shadow).toEqual([0,0,0]);}}
    geometry().teeth.slice(0,2).forEach((tooth,index)=>tooth.ridges.forEach((ridge,j)=>expect(paints(f.ctx).filter(e=>e.width===.22)[index*3+j].path).toEqual(tracePath(ridge,500,600,true,offset))));expect(f.ctx.state()).toEqual(before);expect(f.ctx.stack).toEqual([]);
  });

  it.each([['left',[-1,-.14]],['right',[1,-.14]],['raking',[-.72,.70]],['unknown',[-.12,-1]]])('uses the physical %s lamp for each tooth body and its contained bevel',(lightDirection,lamp)=>{
    const f=fixture({lightDirection});f.draw();const gradients=f.ctx.events.filter(e=>e.operation==='gradient'),g=geometry(),len=Math.hypot(...lamp);g.teeth.forEach((tooth,index)=>{for(const gradient of gradients.slice(index*2,index*2+2)){const[x1,y1,x2,y2]=gradient.gradient.args;expect((x1+x2)/2).toBeCloseTo(tooth.center.x*500,10);expect((y1+y2)/2).toBeCloseTo(tooth.center.y*600,10);expect((x1-x2)/(2*tooth.radiusX)).toBeCloseTo(lamp[0]/len,10);expect((y1-y2)/(2*tooth.radiusY)).toBeCloseTo(lamp[1]/len,10);}});
  });

  it('responds to moisture, irradiance and specimen condition without changing geometry, base palette or ridge count',()=>{
    const baseline=fixture({moisture:100,lightIntensity:100,condition:'standard'});baseline.draw();const basePaint=paints(baseline.ctx),alpha=s=>Number(s.match(/,([.\d]+)\)$/)[1]),bright=alpha(basePaint.find(e=>e.width===.22).stroke),fillValues=records=>records.filter(e=>e.operation==='fill').map(e=>typeof e.fill==='string'?e.fill:{kind:e.fill.kind,args:e.fill.args,stops:e.fill.stops});
    for(const options of[{moisture:0,lightIntensity:100},{moisture:100,lightIntensity:20},{moisture:100,lightIntensity:100,condition:'dehydrated'},{moisture:100,lightIntensity:100,condition:'preserved'},{moisture:100,lightIntensity:100,condition:'cloudy'}]){const f=fixture(options);f.draw();const records=paints(f.ctx);expect(records.map(e=>e.path)).toEqual(basePaint.map(e=>e.path));expect(fillValues(records)).toEqual(fillValues(basePaint));expect(alpha(records.find(e=>e.width===.22).stroke)).toBeLessThan(bright);}
  });

  it('supports an absent optional cavity finish while preserving all native surfaces',()=>{
    const f=fixture({finishCavity:null}),before=f.ctx.state();expect(f.draw()).toBe(true);expect(f.finish).not.toHaveBeenCalled();expect(paints(f.ctx)).toHaveLength(23);expect(f.ctx.events.filter(e=>e.operation==='clip')).toHaveLength(4);expect(f.ctx.state()).toEqual(before);expect(f.ctx.stack).toEqual([]);
  });

  it.each(['cavity-fill','cavity-outline','cavity-clip','finish-cavity','first-tooth-fill','bevel','ridge-glint','tooth-clip'])('balances all nested state when %s fails',location=>{
    const f=fixture(),before=f.ctx.state(),fault=Error('injected '+location);let count=0;
    if(location==='finish-cavity')f.options.finishCavity=()=>{contaminate(f.ctx);throw fault;};
    else{const method=location.includes('fill')?'fill':location.includes('clip')?'clip':'stroke',at=location==='first-tooth-fill'?2:location==='bevel'?3:location==='ridge-glint'?5:location==='tooth-clip'?3:1,original=f.ctx[method].bind(f.ctx);f.ctx[method]=(...args)=>{if(++count===at){contaminate(f.ctx);throw fault;}return original(...args);};}
    expect(f.draw).toThrow(fault);expect(f.ctx.state()).toEqual(before);expect(f.ctx.stack).toEqual([]);
  });
});

describe('native gastric mill integration',()=>{
  it('passes runtime material inputs at the unchanged stomach and antennal drawing boundary',()=>{
    const W=500,H=600,ctx=new Context(),before=ctx.state(),finish=()=>{};
    for(const detailed of[true,false])for(const accessible of[true,false])for(const highContrast of[true,false]){const spy=vi.fn(),bindings={ctx,W,H,crayStomachDetail:detailed&&!accessible&&!highContrast,crayAccessible:accessible,highContrastEnabled:highContrast,lightDirection:'raking',liveTissueState:{moisture:71},d:{lightIntensity:63},specimenCondition:'preserved',finishCurrentCavityPath:finish,drawCrayfishGastricMill:spy};new Function(...Object.keys(bindings),nativeCall())(...Object.values(bindings));expect(spy).toHaveBeenCalledExactlyOnceWith(ctx,{width:W,height:H,detailed:detailed&&!accessible&&!highContrast,accessible,highContrast,lightDirection:'raking',moisture:71,lightIntensity:63,condition:'preserved',finishCavity:finish});expect(ctx.state()).toEqual(before);}
    const call=source.indexOf('drawCrayfishGastricMill(ctx,'),stomach=source.lastIndexOf("finishCurrentTissuePath(crayStomachX, crayStomachY, crayStomachRX, crayStomachRY, 'serosa', 'cray-stomach');",call),antennal=source.indexOf('// The paired antennal complexes sit within',call);expect(stomach).toBeGreaterThan(0);expect(call).toBeGreaterThan(stomach);expect(antennal).toBeGreaterThan(call);expect(source.slice(call,antennal)).not.toContain('drawCrayfishAntennalGlands');
  });

  it('keeps the canonical and desktop production copies identical',()=>{expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_dissection.js','utf8')).toBe(source);});
});

describe('gastric mill compact callout clearance',()=>{
  const marker=production('dissectionHotspotMarkerGeometry'),place=production('placeDissectionCallout');
  const overlap=(a,b)=>a.x<b.x+b.width-1e-8&&a.x+a.width>b.x+1e-8&&a.y<b.y+b.height-1e-8&&a.y+a.height>b.y+1e-8;
  // Construct a passive badge3 over the actual right grinding plate. Native
  // browser QA supplies the observed scene; this fixture isolates its geometry.
  const normal=[6.24,0,0,5.76,-685.6,-955.2],mirrored=[-6.24,0,0,5.76,1685.6,-955.2],sheared=[-6.24,.25,.4,5.76,1577.6,-1002.7];
  function layoutFixture(matrix=normal,quizMode=false,activeLayer='organs'){
    const W=500,H=600,canvas={_dpr:2},ctx=new Context(matrix),g=geometry(W,H),zoom=3,canvasUiScale=1.6,options={quizMode,coarsePointer:false,labelUiScale:canvasUiScale/zoom,specimenTextScaleX:1.04,specimenTextScaleY:.96,canvasUiScale,zoom,accessible:false,depthAtlasEnabled:false};
    const center=g.teeth[1].center,width=20*options.labelUiScale/options.specimenTextScaleX,height=20*options.labelUiScale/options.specimenTextScaleY;
    const item={id:'gastric_mill',index:2,x:center.x*W-width/2,y:center.y*H-height/2,width,height,pointX:g.target.x*W,pointY:g.target.y*H,showCallout:true,fullLabel:false,selected:false,hovered:false,guidedCallout:false,visibility:'visible',depth:'structure',side:'right',labelLines:[]};
    const layout=[item],screen=production('canvasScreenBox',{ctx,canvas}),markers=entry=>marker(entry,options),solve=vi.fn(place),start=source.indexOf('// Keep cards, compact badges, and their hit rectangles off both leaflet groups.'),end=source.indexOf('function adaptiveHotspotMarkerGeometry(layout)',start);
    if(start<0||end<=start)throw Error('Missing actual gastric mill final callout repair and hit-box registration');
    const bindings={ctx,canvas,W,H,spec:{bodyShape:'crayfish'},d:{quizMode},activeLayer,semilunarLabelGeometry:null,crayfishGastricMillGeometry:geometry,canvasScreenBox:screen,canvasUiScale,labelScreenBottom:586,adaptiveHotspotLayout:layout,hudCompassBox:null,adaptiveHotspotMarkerGeometry:markers,zoom,placeDissectionCallout:solve};
    canvas._hotspotLabelBoxes=layout.map(it=>({id:it.id,x:it.x/W,y:it.y/H,width:it.width/W,height:it.height/H}));
    const run=()=>new Function(...Object.keys(bindings),source.slice(start,end))(...Object.values(bindings));
    const hit=production('closestVisibleOrganAt',{organs:[{id:'gastric_mill',...g.target},{id:'hepato',x:.485,y:.484}],currentProcedure:{},structureExposureState:()=> 'visible',variedOrganPoint:org=>org});
    const badgeBox=()=>{const b=markers(item).badge;if(!b)return null;const stroke=.4/zoom;return screen(b.cx-b.rx-stroke,b.cy-b.ry-stroke,(b.rx+stroke)*2,(b.ry+stroke)*2);};
    const b=g.bounds,box=screen(b.minX*W,b.minY*H,(b.maxX-b.minX)*W,(b.maxY-b.minY)*H),pad=3*canvasUiScale,tissue={x:box.x-pad,y:box.y-pad,width:box.width+pad*2,height:box.height+pad*2};
    return{W,H,ctx,canvas,g,item,layout,screen,markers,solve,run,hit,badgeBox,tissue,canvasUiScale};
  }

  it.each([['internal',normal],['mirrored',mirrored],['mirrored and sheared',sheared]])('moves the complete passive badge/hit envelope clear of the grinding plates while keeping the target and reading size: %s',(_,matrix)=>{
    const f=layoutFixture(matrix),before=structuredClone(f.item),state=f.ctx.state(),beforeCard=f.screen(f.item.x,f.item.y,f.item.width,f.item.height),beforeBadge=f.badgeBox(),plate=f.g.teeth[1],center={x:plate.center.x*f.W,y:plate.center.y*f.H};
    expect(contains(center,samplePath(tracePath(plate.region,f.W,f.H))[0])).toBe(true);expect(f.item.index).toBe(2);expect(f.item.selected||f.item.hovered||f.item.guidedCallout||f.item.fullLabel).toBe(false);expect(overlap(beforeCard,f.tissue)).toBe(true);expect(overlap(beforeBadge,f.tissue)).toBe(true);
    f.run();expect(f.solve).toHaveBeenCalledTimes(1);expect(f.ctx.state()).toEqual(state);expect(Math.hypot(f.item.x-before.x,f.item.y-before.y)).toBeGreaterThan(0);expect(f.item.width).toBe(before.width);expect(f.item.height).toBe(before.height);expect(f.item.pointX).toBe(before.pointX);expect(f.item.pointY).toBe(before.pointY);expect(f.item.labelLines).toEqual(before.labelLines);
    const afterCard=f.screen(f.item.x,f.item.y,f.item.width,f.item.height),afterBadge=f.badgeBox();expect(overlap(afterCard,f.tissue)).toBe(false);expect(overlap(afterBadge,f.tissue)).toBe(false);
    const [envelope,viewport,obstacles]=f.solve.mock.calls[0],placement=f.solve.mock.results[0].value;expect(placement).not.toBeNull();expect(obstacles).toHaveLength(2);expect(obstacles[0]).toEqual(f.tissue); // The fixed anatomy point remains reserved; the moving badge is not an obstacle to itself.
    const point=f.markers(f.item).point,pointBox=f.screen(point.cx-point.rx,point.cy-point.ry,point.rx*2,point.ry*2),pad=2*f.canvasUiScale;expect(obstacles[1]).toEqual({x:pointBox.x-pad,y:pointBox.y-pad,width:pointBox.width+pad*2,height:pointBox.height+pad*2});
    expect(envelope.x).toBeCloseTo(Math.min(beforeCard.x,beforeBadge.x),10);expect(envelope.y).toBeCloseTo(Math.min(beforeCard.y,beforeBadge.y),10);expect(envelope.width).toBeCloseTo(Math.max(beforeCard.x+beforeCard.width,beforeBadge.x+beforeBadge.width)-envelope.x,10);expect(envelope.height).toBeCloseTo(Math.max(beforeCard.y+beforeCard.height,beforeBadge.y+beforeBadge.height)-envelope.y,10);
    expect(afterCard.x-beforeCard.x).toBeCloseTo(placement.x-envelope.x,10);expect(afterCard.y-beforeCard.y).toBeCloseTo(placement.y-envelope.y,10);expect(afterBadge.x-beforeBadge.x).toBeCloseTo(placement.x-envelope.x,10);expect(afterBadge.y-beforeBadge.y).toBeCloseTo(placement.y-envelope.y,10);
    expect(placement.x).toBeGreaterThanOrEqual(viewport.x);expect(placement.y).toBeGreaterThanOrEqual(viewport.y);expect(placement.x+placement.width).toBeLessThanOrEqual(viewport.x+viewport.width+1e-9);expect(placement.y+placement.height).toBeLessThanOrEqual(viewport.y+viewport.height+1e-9);
    expect(f.canvas._hotspotLabelBoxes).toEqual([{id:'gastric_mill',x:f.item.x/f.W,y:f.item.y/f.H,width:f.item.width/f.W,height:f.item.height/f.H}]);expect(f.hit(f.g.target.x,f.g.target.y,.06,f.canvas).id).toBe('gastric_mill');expect(actualTarget('realistic','internal')).toEqual({x:.38,y:.45});
  });

  it('keeps quiz and non-organ layers untouched when the protected mill is not being annotated',()=>{
    for(const[quizMode,layer]of[[true,'organs'],[false,'nervous']]){const f=layoutFixture(normal,quizMode,layer),before=structuredClone(f.layout),boxes=structuredClone(f.canvas._hotspotLabelBoxes),state=f.ctx.state();f.run();expect(f.layout).toEqual(before);expect(f.canvas._hotspotLabelBoxes).toEqual(boxes);expect(f.solve).not.toHaveBeenCalled();expect(f.ctx.state()).toEqual(state);}
  });
});

describe('gastric mill depth-caption clearance',()=>{
  const overlap=(a,b)=>a.x<b.x+b.width-1e-8&&a.x+a.width>b.x+1e-8&&a.y<b.y+b.height-1e-8&&a.y+a.height>b.y+1e-8;
  // Durable numeric capture from native matrix-callout-collision.json: the
  // 320x900 internal, seed1, zoom3 scene. No generated fixture is needed to run.
  const W=320,H=900,density=2.03125,normal=[6.249662563204765,0,0,6.269783992320299,-440.9459853172302,-1625.2000168897212];
  const capturedCaption={x:151.01101015273497/density,y:1079.2573293691057/density,width:84.17138671875,height:17};
  const capturedCard={x:125.87099746557804,y:479.92077556916934,width:43.489508376157644,height:7.775387709988924};
  const mirrored=[-normal[0],0,0,normal[3],650-normal[4],normal[5]];
  const sheared=[-normal[0],.04*normal[0],.10*normal[3],normal[3],650-normal[4]+.10*(normal[5]-450*density),normal[5]+.04*(normal[4]-160*density)];
  const start=source.indexOf('// Keep nearby depth captions off the complete opened gastric mill.'),end=source.indexOf('// The digestive-gland caption leaves both intact masses unobscured.',start);
  if(start<0||end<=start)throw Error('Missing native gastric caption reservation');
  const reservationBody=source.slice(start,end);
  function captionFixture(matrix=normal,{quizMode=false,activeLayer='organs',bodyShape='crayfish'}={}){
    const ctx=new Context(matrix),canvas={_dpr:density,_guidanceBoxes:[],_canvasHudBoxes:[]},screen=production('canvasScreenBox',{ctx,canvas}),plannedMarkerBoxes=[],geometryCalls=vi.fn(geometry);
    const bindings={ctx,canvas,W,H,d:{quizMode},spec:{bodyShape},activeLayer,canvasUiScale:1,crayfishGastricMillGeometry:geometryCalls,canvasScreenBox:screen,plannedMarkerBoxes};
    const run=()=>new Function(...Object.keys(bindings),reservationBody)(...Object.values(bindings));
    const solver=production('placeCanvasHudPanel',{canvas,W,H});
    // Reflect/shear the captured caption's center through the specimen matrix;
    // the production caption remains upright and keeps its reading dimensions.
    const cx=(density*(capturedCaption.x+capturedCaption.width/2)-normal[4])/normal[0],cy=(density*(capturedCaption.y+capturedCaption.height/2)-normal[5])/normal[3],p=ctx.point(cx,cy);
    const caption={x:p[0]/density-capturedCaption.width/2,y:p[1]/density-capturedCaption.height/2,width:capturedCaption.width,height:capturedCaption.height};
    const card=screen(capturedCard.x,capturedCard.y,capturedCard.width,capturedCard.height);card.priority=8;
    return{ctx,canvas,screen,plannedMarkerBoxes,geometryCalls,run,solver,caption,card};
  }

  it.each([['captured tall internal',normal],['mirrored',mirrored],['mirrored and sheared',sheared]])('moves the observed rim-obstructing caption at unchanged reading size: %s',(_,matrix)=>{
    const f=captionFixture(matrix),before=f.ctx.state(),shared=structuredClone(f.canvas);f.run();expect(f.geometryCalls).toHaveBeenCalledExactlyOnceWith(W,H);expect(f.plannedMarkerBoxes).toHaveLength(1);
    const b=geometry(W,H).bounds,projected=f.screen(b.minX*W,b.minY*H,(b.maxX-b.minX)*W,(b.maxY-b.minY)*H),protectedBox=f.plannedMarkerBoxes[0];
    expect(protectedBox).toEqual({x:projected.x-3,y:projected.y-3,width:projected.width+6,height:projected.height+6,priority:10,keepClear:true});expect(overlap(f.caption,protectedBox)).toBe(true);
    if(matrix===normal){expect(f.caption.x).toBeCloseTo(capturedCaption.x,10);expect(f.caption.y).toBeCloseTo(capturedCaption.y,10);
      // The browser sampled this actual .7px cavity-rim/old-caption overlap.
      const hit={x:304.7656818628311/density,y:1079.2573293691057/density};expect(hit.x).toBeGreaterThan(f.caption.x);expect(hit.x).toBeLessThan(f.caption.x+f.caption.width);expect(hit.y).toBeCloseTo(f.caption.y,10);expect(hit.x).toBeGreaterThan(projected.x);expect(hit.x).toBeLessThan(projected.x+projected.width);
    }
    const additional=[{x:0,y:0,width:W,height:74,priority:9},{x:0,y:816,width:W,height:H-816,priority:9},f.card,...f.plannedMarkerBoxes],placed=f.solver(f.caption.x,f.caption.y,f.caption.width,f.caption.height,additional);
    const after={...f.caption,x:placed.x,y:placed.y};expect(placed.clearanceOverlap).toBe(0);expect(overlap(after,protectedBox)).toBe(false);expect(overlap(after,f.card)).toBe(false);expect(Math.hypot(after.x-f.caption.x,after.y-f.caption.y)).toBeGreaterThan(0);expect(after.width).toBe(capturedCaption.width);expect(after.height).toBe(capturedCaption.height);expect(after.x).toBeGreaterThanOrEqual(14);expect(after.x+after.width).toBeLessThanOrEqual(W-14);expect(after.y).toBeGreaterThanOrEqual(82);expect(after.y+after.height).toBeLessThanOrEqual(816);
    expect(f.ctx.state()).toEqual(before);expect(f.ctx.stack).toEqual([]);expect(f.canvas).toEqual(shared);
  });

  it('leaves quiz, non-organ layers and other specimens without a mill reservation',()=>{
    for(const options of[{quizMode:true},{activeLayer:'nervous'},{bodyShape:'fish'}]){const f=captionFixture(normal,options),before=f.ctx.state();f.run();expect(f.geometryCalls).not.toHaveBeenCalled();expect(f.plannedMarkerBoxes).toEqual([]);expect(f.ctx.state()).toEqual(before);}
  });

  it('consumes the complete mill reservation for nearby captions before local footprint transforms',()=>{
    for(const org of[{id:'gastric_mill',name:'Gastric Mill'},{id:'stomach_c',name:'Stomach'}]){
      const f=captionFixture(),before=f.ctx.state(),placements=[],captions=[],ui=1,organs=[];
      f.ctx.measureText=()=>({width:capturedCaption.width-12});f.ctx.roundRect=(...args)=>f.ctx.rect(...args.slice(0,4));f.ctx.fillText=text=>captions.push(text);
      const profile=production('structureInspectionFootprint',{W,H,spec:{bodyShape:'crayfish'},specimen:'crayfish',organs,structureOpticalDepth:()=> 'deep'}),solver=production('placeCanvasHudPanel',{canvas:f.canvas,W,H});
      const bindings={ctx:f.ctx,canvas:f.canvas,W,H,spec:{bodyShape:'crayfish'},specimen:'crayfish',d:{visualRealism:'realistic',quizMode:false},visualRealism:'realistic',activeLayer:'organs',highContrastEnabled:false,focusEntryProgress:1,specimenScale:{x:normal[0]/(density*3),y:normal[3]/(density*3)},zoom:3,canvasUiScale:ui,labelUiScale:1/3,specimenTextScaleX:1,specimenTextScaleY:1,labelScreenBottom:816,hudCompassLayout:{compact:false},hudCompassBox:null,organs,adaptiveHotspotById:{},structureInspectionFootprint:profile,crayfishGastricMillGeometry:f.geometryCalls,canvasScreenBox:f.screen,fitTextToWidth:text=>text,rememberCanvasGuidanceBox:()=>{},placeCanvasHudPanel:(x,y,width,height,boxes)=>{const result=solver(x,y,width,height,boxes);placements.push({x,y,width,height,boxes,result});return result;}};
      production('drawStructureInspectionFootprint',bindings)(org,.38*W,.45*H,true,true,'visible',null);
      expect(f.geometryCalls).toHaveBeenCalledExactlyOnceWith(W,H);expect(captions).toEqual(['DEEP \u00b7 '+profile(org).morphologyLabel]);expect(placements).toHaveLength(1);
      const p=placements[0],protectedBox=p.boxes.find(box=>box.priority===10),b=geometry(W,H).bounds,reference=f.screen(b.minX*W,b.minY*H,(b.maxX-b.minX)*W,(b.maxY-b.minY)*H);
      expect(protectedBox).toEqual({x:reference.x-3,y:reference.y-3,width:reference.width+6,height:reference.height+6,priority:10,keepClear:true});expect(overlap({x:p.result.x,y:p.result.y,width:p.width,height:p.height},protectedBox)).toBe(false);expect(p.width).toBeCloseTo(capturedCaption.width,8);expect(p.height).toBeCloseTo(17,8);expect(f.ctx.state()).toEqual(before);expect(f.ctx.stack).toEqual([]);
    }
  });
});

