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

class ArcContext extends Context {
  constructor(matrix){super(matrix);this.currentArcs=[];}
  beginPath(){super.beginPath();this.currentArcs=[];}
  arc(x,y,radius,start,end){
    this.currentArcs.push([x,y,radius,start,end]);
    for(let i=0;i<=200;i++){const theta=start+(end-start)*i/200,px=x+radius*Math.cos(theta),py=y+radius*Math.sin(theta);if(i===0){const p=this.point(px,py),last=this.path.at(-1);if(!last)this.moveTo(px,py);else if(last[0]!=='moveTo'||last[1]!==p[0]||last[2]!==p[1])this.lineTo(px,py);}else this.lineTo(px,py);}
  }
  paint(operation){super.paint(operation);this.events.at(-1).arcs=structuredClone(this.currentArcs);}
  clip(rule='nonzero'){super.clip(rule);this.events.at(-1).arcs=structuredClone(this.currentArcs);}
}
const geometry=production('sheepSemilunarGeometry'),trace=production('traceSheepSemilunarRegion');
const rawDraw=production('drawSheepSemilunarValves',{sheepSemilunarGeometry:geometry,traceSheepSemilunarRegion:trace});
const paints=ctx=>ctx.events.filter(e=>['fill','stroke','fillRect'].includes(e.operation));
function tracePath(region,W,H,matrix){const ctx=new ArcContext(matrix);trace(ctx,region,W,H);return ctx.path;}
function closePath(actual,expected){expect(actual).toHaveLength(expected.length);actual.forEach((op,i)=>{expect(op[0]).toBe(expected[i][0]);expect(op).toHaveLength(expected[i].length);for(let j=1;j<op.length;j++)expect(op[j]).toBeCloseTo(expected[i][j],10);});}
function originalArcs(W,H,matrix){
  const ctx=new ArcContext(matrix),cx=W*.5,cy=H*.45;
  // The native pre-extraction teaching fallback: exact offsets, radii and0..pi arcs.
  for(const[x,y,color]of[[cx-W*.022,cy-H*.095,'#fde68a'],[cx+W*.052,cy-H*.085,'#bfdbfe']])for(const cusp of[-1,0,1]){ctx.beginPath();ctx.arc(x+cusp*W*.009,y,W*.011,0,Math.PI);ctx.strokeStyle=color;ctx.lineWidth=.75;ctx.stroke();}
  return paints(ctx);
}
function actualHeart(W,H){const ctx=new ArcContext(),start=source.indexOf('var traceSheepHeartBody = function traceSheepHeartBody('),end=source.indexOf('\n                ctx.save();',start);if(start<0||end<=start)throw Error('Missing actual sheep heart body');new Function('ctx','W','H','cx','cy',source.slice(start,end)+';traceSheepHeartBody(ctx);')(ctx,W,H,W*.5,H*.45);return ctx.path;}
function fixture(overrides={},matrix){const ctx=new ArcContext(matrix);ctx.globalAlpha=.91;const options={width:500,height:600,detailed:true,accessible:false,highContrast:false,lightDirection:'left',moisture:78,lightIntensity:68,condition:'standard',...overrides};return{ctx,options,draw:()=>rawDraw(ctx,options)};}
function nativeBlock(){const start=source.indexOf('drawSheepSemilunarValves(ctx,'),end=source.indexOf('});',start)+3;if(start<0||end<=start)throw Error('Missing native semilunar call');return source.slice(start,end);}
function runNative(W,H,{detail=true,accessible=false,highContrast=false}={}){const ctx=new ArcContext(),before=ctx.state(),draw=vi.fn(),bindings={ctx,W,H,sceneDetail:detail,heartCutawayAccessible:accessible,highContrastEnabled:highContrast,lightDirection:'raking',liveTissueState:{moisture:78},d:{lightIntensity:68},specimenCondition:'preserved',drawSheepSemilunarValves:draw};new Function(...Object.keys(bindings),nativeBlock())(...Object.values(bindings));return{ctx,before,draw};}
function paintedTarget(id,W,H,staleScale,mode='realistic',view='internal',canvas=true){const bindings={spec:{bodyShape:'heart'},sheepSemilunarGeometry:geometry,queryDissectionNode:()=>canvas?{_logicalW:W,_logicalH:H,_sheepSemilunarHeartScale:staleScale}:null,d:{visualRealism:mode,anatomicalView:view},visualRealism:mode,specimenVariationValue:()=>{throw Error('Semilunar target must not jitter');},viewSpecificOrganPoint:()=>{throw Error('Semilunar target must not receive view offsets');}};return production('variedOrganPoint',{...bindings,paintedSmallStructurePoint:production('paintedSmallStructurePoint',bindings)})({id,name:id,x:.5,y:.35});}

describe('registered semilunar cusp teaching projection',()=>{
  it.each(dimensions)('retains exact native cusp offsets, physical radii and half-circle paths at %s by %s',(W,H)=>{
    const g=geometry(W,H),old=originalArcs(W,H);expect(g.valves).toHaveLength(2);expect(g.radius).toBe(W*.011);expect(g.scaleCenter).toEqual({x:.5,y:.45});
    g.valves.forEach((valve,i)=>{expect(valve.id).toBe(i?'pulm_v':'aortic_v');expect(valve.cusps).toHaveLength(3);expect(valve.cusps.map(c=>c.offset)).toEqual([-1,0,1]);
      valve.cusps.forEach((cusp,j)=>{const ctx=new ArcContext();trace(ctx,cusp.arc,W,H);expect(ctx.currentArcs).toHaveLength(1);ctx.currentArcs[0].forEach((n,k)=>expect(n).toBeCloseTo(old[i*3+j].arcs[0][k],11));closePath(ctx.path,old[i*3+j].path);expect(cusp.radius).toBe(W*.011);expect(cusp.pocket.control.y-cusp.center.y).toBeCloseTo(W*.011*.16/H,13);});
    });
  });

  it.each(dimensions)('keeps the pockets and widest retained arc strokes inside the actual heart and reserved bounds at %s by %s',(W,H)=>{
    const g=geometry(W,H),heart=samplePath(actualHeart(W,H))[0];expect(actualHeart(W,H).filter(op=>op[0]==='bezierCurveTo')).toHaveLength(5);
    for(const valve of g.valves)for(const cusp of valve.cusps){
      const pocket=samplePath(tracePath(cusp.pocket,W,H))[0];for(const p of pocket){expect(contains(p,heart)).toBe(true);expect(p.y/H).toBeGreaterThanOrEqual(cusp.bounds.minY-1e-12);expect(p.y/H).toBeLessThanOrEqual(cusp.bounds.maxY+1e-12);expect(Math.hypot(p.x-cusp.center.x*W,p.y-cusp.center.y*H)).toBeLessThanOrEqual(cusp.radius+1e-10);}
      for(let i=0;i<=40;i++){const t=i/40*Math.PI,p={x:cusp.center.x*W+(cusp.radius+.575)*Math.cos(t),y:cusp.center.y*H+(cusp.radius+.575)*Math.sin(t)};expect(contains(p,heart)).toBe(true);expect(p.x/W).toBeGreaterThanOrEqual(valve.bounds.minX-1e-12);expect(p.x/W).toBeLessThanOrEqual(valve.bounds.maxX+1e-12);expect(p.y/H).toBeGreaterThanOrEqual(valve.bounds.minY-1e-12);expect(p.y/H).toBeLessThanOrEqual(valve.bounds.maxY+1e-12);}
      for(const p of samplePath(tracePath(cusp.freeEdge,W,H))[0])expect(contains(p,pocket)||distance(p,[pocket])<1e-8).toBe(true);
      expect(valve.bounds.minY).toBeCloseTo(valve.center.y-.575/H,13);expect(valve.bounds.maxY).toBeCloseTo(valve.center.y+(cusp.radius+.575)/H,13);expect(valve.bounds.minX).toBeGreaterThanOrEqual(g.bounds.minX);expect(valve.bounds.maxX).toBeLessThanOrEqual(g.bounds.maxX);
    }
  });

  it.each(dimensions)('keeps both static cutaway targets inside native central strokes and new surfaces regardless of stale heartbeat cache at %s by %s',(W,H)=>{
    const g=geometry(W,H);for(const valve of g.valves){const cusp=valve.cusps[1],p={x:valve.target.x*W,y:valve.target.y*H},pocket=samplePath(tracePath(cusp.pocket,W,H))[0],inset=Math.min(.25,.08*cusp.radius),radial=Math.abs(Math.hypot(p.x-cusp.center.x*W,p.y-cusp.center.y*H)-cusp.radius);
      expect(radial).toBeCloseTo(inset,11);expect(radial).toBeLessThan(.75/2);expect(contains(p,pocket)).toBe(true);
      for(const neighbor of valve.cusps.filter(c=>c.offset!==0)){expect(Math.abs(Math.hypot(p.x-neighbor.center.x*W,p.y-neighbor.center.y*H)-neighbor.radius)).toBeGreaterThan(.75/2);expect(contains(p,samplePath(tracePath(neighbor.pocket,W,H))[0])).toBe(false);}
      for(const staleScale of [.982,1,1.018])for(const mode of['guided','realistic','accessible'])for(const view of['dorsal','ventral','lateral','internal']){const actual=paintedTarget(valve.id,W,H,staleScale,mode,view),painted={x:actual.x*W,y:actual.y*H};expect(actual.x).toBeCloseTo(valve.target.x,13);expect(actual.y).toBeCloseTo(valve.target.y,13);expect(Math.abs(Math.hypot(painted.x-cusp.center.x*W,painted.y-cusp.center.y*H)-cusp.radius)).toBeLessThan(.75/2);expect(contains(painted,pocket)).toBe(true);}
    }
  });

  it('uses the default canvas when absent and keeps the cutaway outside the original external heartbeat transform',()=>{
    const g=geometry();expect(geometry()).toEqual(geometry(500,600));for(const id of['aortic_v','pulm_v']){const expected=g.targets[id],assertPoint=actual=>{expect(actual.x).toBeCloseTo(expected.x,13);expect(actual.y).toBeCloseTo(expected.y,13);};assertPoint(paintedTarget(id,0,0,undefined,'realistic','internal',false));for(const bad of[undefined,NaN,Infinity,0,-1])assertPoint(paintedTarget(id,500,600,bad));}
    const transform='ctx.translate(cx, cy); ctx.scale(heartScale, heartScale); ctx.translate(-cx, -cy);',heartbeat=source.indexOf(transform),save=source.lastIndexOf('ctx.save();',heartbeat),conduction=source.indexOf('// Conduction system animation',heartbeat),restore=source.lastIndexOf('ctx.restore();',conduction),cutaway=source.indexOf('// Internal cutaway: chamber geometry, wall thickness, valves, chordae, and trabeculae.',conduction),helper=source.indexOf('drawSheepSemilunarValves(ctx,',cutaway);
    expect(save).toBeGreaterThan(0);expect(heartbeat).toBeGreaterThan(save);expect(restore).toBeGreaterThan(heartbeat);expect(cutaway).toBeGreaterThan(restore);expect(helper).toBeGreaterThan(cutaway);expect(source.slice(restore,conduction).trim()).toBe('ctx.restore();');expect(source.slice(restore,helper)).not.toMatch(/ctx\.scale\([^)]*\bheartScale\b/);expect(source).not.toContain('_sheepSemilunarHeartScale');
    const matrix=[-1.8,.12,.21,1.4,811,-93];for(const heartScale of [.982,1.018]){const ctx=new ArcContext(matrix);new Function('ctx','cx','cy','heartScale',source.slice(save,heartbeat+transform.length))(ctx,250,270,heartScale);expect(ctx.matrix).not.toEqual(matrix);new Function('ctx',source.slice(restore,conduction))(ctx);expect(ctx.matrix).toEqual(matrix);expect(ctx.stack).toEqual([]);}
  });

  it.each([[0,600],[-1,600],[500,0],[NaN,600],[500,Infinity],['bad',600]])('rejects invalid dimensions %s by %s',(width,height)=>{expect(geometry(width,height)).toBeNull();const f=fixture({width,height}),before=f.ctx.state();expect(f.draw()).toBe(false);expect(f.ctx.state()).toEqual(before);expect(f.ctx.events).toEqual([]);});
});

describe('bounded thin semilunar pocket materials',()=>{
  it.each(dimensions)('paints six continuous pockets, clips six free-edge highlights and retains all six native attachment arcs at %s by %s',(W,H)=>{
    const f=fixture({width:W,height:H}),before=f.ctx.state(),g=geometry(W,H);expect(f.draw()).toBe(true);const records=paints(f.ctx),fills=records.filter(e=>e.operation==='fill'),arcs=records.filter(e=>e.operation==='stroke'&&e.width===.75),glints=records.filter(e=>e.operation==='stroke'&&e.width===.25),clips=f.ctx.events.filter(e=>e.operation==='clip');
    expect(fills).toHaveLength(6);expect(arcs).toHaveLength(6);expect(glints).toHaveLength(6);expect(clips).toHaveLength(2);expect(records.filter(e=>e.operation==='fillRect')).toHaveLength(0);
    g.valves.forEach((valve,i)=>{const clip=clips[i];expect(clip.rule).toBe('nonzero');expect(clip.arcs).toHaveLength(3);expect(clip.path.filter(op=>op[0]==='moveTo')).toHaveLength(3);expect(clip.path.filter(op=>op[0]==='closePath')).toHaveLength(3);
      valve.cusps.forEach((cusp,j)=>{expect(fills[i*3+j].path).toEqual(tracePath(cusp.pocket,W,H));expect(fills[i*3+j].path.filter(op=>op[0]==='quadraticCurveTo')).toHaveLength(1);expect(fills[i*3+j].fill.kind).toBe('linear');expect(fills[i*3+j].fill.stops.map(s=>s[0])).toEqual([0,.34,.76,1]);expect(fills[i*3+j].clips).toEqual(['specimen']);
        expect(glints[i*3+j].path).toEqual(tracePath(cusp.freeEdge,W,H));expect(glints[i*3+j].path.some(op=>op[0]==='closePath')).toBe(false);expect(glints[i*3+j].clips).toEqual(['specimen',clip.path]);expect(glints[i*3+j].stroke.stops).toHaveLength(3);expect(arcs[i*3+j].path).toEqual(tracePath(cusp.arc,W,H));expect(arcs[i*3+j].clips).toEqual(['specimen']);
      });
    });expect(f.ctx.state()).toEqual(before);expect(f.ctx.stack).toEqual([]);
  });

  it.each([.72,1])('preserves inherited opacity %s and the full caller specimen affine',alpha=>{
    const matrix=[-1.8,.12,.21,1.4,811,-93],f=fixture({},matrix);f.ctx.globalAlpha=alpha;const before=f.ctx.state();f.draw();for(const record of paints(f.ctx)){expect(record.alpha).toBe(alpha);expect(record.matrix).toEqual(matrix);expect(record.composite).toBe('source-over');expect(record.dash).toEqual([]);expect(record.cap).toBe('round');expect(record.join).toBe('round');expect(record.shadow).toEqual([0,0,0]);expect(record.clips[0]).toBe('specimen');}expect(f.ctx.state()).toEqual(before);expect(f.ctx.stack).toEqual([]);
  });

  it.each([{detailed:false},{accessible:true},{highContrast:true}])('retains six exact native arc-only teaching cues for %j',overrides=>{
    const f=fixture(overrides),before=f.ctx.state();f.draw();const records=paints(f.ctx),old=originalArcs(500,600);expect(records).toHaveLength(6);expect(records.every(e=>e.operation==='stroke')).toBe(true);expect(f.ctx.events.filter(e=>e.operation==='clip'||e.operation==='gradient')).toHaveLength(0);records.forEach((e,i)=>{closePath(e.path,old[i].path);expect(e.stroke).toBe(old[i].stroke);expect(e.width).toBe(overrides.accessible?1.15:.75);});expect(f.ctx.state()).toEqual(before);
  });

  it.each([['left',[-1,-.14]],['right',[1,-.14]],['raking',[-.72,.70]],['unknown',[-.12,-1]]])('uses the same physical %s lamp on all six tissue pockets',(lightDirection,light)=>{
    const f=fixture({lightDirection});f.draw();const fills=paints(f.ctx).filter(e=>e.operation==='fill'),g=geometry(),len=Math.hypot(...light);g.valves.forEach((valve,i)=>valve.cusps.forEach((cusp,j)=>{const[x1,y1,x2,y2]=fills[i*3+j].fill.args;expect((x1+x2)/2).toBeCloseTo(cusp.center.x*500,10);expect((y1+y2)/2).toBeCloseTo(cusp.center.y*600+cusp.radius*.45,10);expect((x1-x2)/(2*cusp.radius)).toBeCloseTo(light[0]/len,10);expect((y1-y2)/(2*cusp.radius*.55)).toBeCloseTo(light[1]/len,10);}));
  });

  it('varies restrained free-edge sheen with material controls while preserving every anatomical path',()=>{
    const wet=fixture({moisture:100,lightIntensity:100,condition:'standard'}),dry=fixture({moisture:0,lightIntensity:20,condition:'dehydrated'});wet.draw();dry.draw();expect(paints(wet.ctx).map(e=>e.path)).toEqual(paints(dry.ctx).map(e=>e.path));const alpha=s=>Number(s.match(/,([.\d]+)\)$/)[1]),wetRim=paints(wet.ctx).find(e=>e.width===.25).stroke,dryRim=paints(dry.ctx).find(e=>e.width===.25).stroke;expect(alpha(wetRim.stops[0][1])).toBeGreaterThan(alpha(dryRim.stops[0][1]));expect(paints(wet.ctx).filter(e=>e.operation==='fill').map(e=>e.fill.stops)).toEqual(paints(dry.ctx).filter(e=>e.operation==='fill').map(e=>e.fill.stops));
  });

  it.each(['normalize','base-fill','last-fill','compound-clip','second-clip','gradient','free-edge','attachment'])('balances canvas state when %s throws',location=>{
    const f=fixture(),before=f.ctx.state(),fault=Error('injected '+location);let calls=0;const method=location==='normalize'?'setLineDash':location.endsWith('fill')?'fill':location.includes('clip')?'clip':location==='gradient'?'createLinearGradient':'stroke',at=location==='last-fill'?6:location==='second-clip'?2:location==='attachment'?4:1,original=f.ctx[method].bind(f.ctx);
    f.ctx[method]=(...args)=>{if(++calls===at){f.ctx.translate(23,-17);f.ctx.globalAlpha=.1;f.ctx.globalCompositeOperation='destination-out';throw fault;}return original(...args);};expect(f.draw).toThrow(fault);expect(f.ctx.state()).toEqual(before);expect(f.ctx.stack).toEqual([]);
  });
});

describe('native semilunar integration and adjoining valve anatomy',()=>{
  it.each(dimensions)('passes native gates and material controls without altering the caller before existing flow code at %s by %s',(W,H)=>{
    for(const settings of[{},{detail:false},{accessible:true},{highContrast:true}]){const f=runNative(W,H,settings);expect(f.draw).toHaveBeenCalledTimes(1);expect(f.draw.mock.calls[0][0]).toBe(f.ctx);expect(f.draw.mock.calls[0][1]).toMatchObject({width:W,height:H,detailed:settings.detail!==false&&!settings.accessible&&!settings.highContrast,accessible:!!settings.accessible,highContrast:!!settings.highContrast,lightDirection:'raking',moisture:78,lightIntensity:68,condition:'preserved'});expect(f.ctx.state()).toEqual(f.before);expect(f.ctx.events).toEqual([]);}
    expect(source.indexOf('drawSheepSemilunarValves(ctx,')).toBeLessThan(source.indexOf('// Flow paths bend through the valves and pause when reduced motion is requested.'));
  });

  it('retains the native five shaped AV leaflets and their collagen finishes',()=>{
    const ctx=new ArcContext(),finish=vi.fn(),W=500,H=600,bindings={ctx,H,valveLift:0,heartCutawayAccessible:false,highContrastEnabled:false,heartRealistic:true,finishCurrentTissuePath:finish},draw=production('drawHeartValveLeaflet',bindings);
    const start=source.indexOf('drawHeartValveLeaflet(mitralX -'),end=source.indexOf('// Papillary muscles rise from the wall and anchor multiple branching chordae.',start);expect(start).toBeGreaterThan(0);expect(end).toBeGreaterThan(start);
    const args={drawHeartValveLeaflet:draw,W,mitralX:W*(.5-.073),mitralY:H*(.45-.018),tricuspidX:W*(.5+.074),tricuspidY:H*(.45-.012)};new Function(...Object.keys(args),source.slice(start,end))(...Object.values(args));const fills=paints(ctx).filter(e=>e.operation==='fill');expect(fills).toHaveLength(5);expect(finish).toHaveBeenCalledTimes(5);for(const fill of fills){expect(fill.path.filter(op=>op[0]==='bezierCurveTo')).toHaveLength(2);expect(fill.path.filter(op=>op[0]==='quadraticCurveTo')).toHaveLength(1);}expect(finish.mock.calls.every(call=>call[4]==='collagen')).toBe(true);
  });

  it('keeps desktop and canonical production copies synchronized',()=>{expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_dissection.js','utf8')).toBe(source);});
});

describe('final compact heart callouts and their native hit rectangles',()=>{
  const overlap=(a,b)=>a.x<b.x+b.width-1e-8&&a.x+a.width>b.x+1e-8&&a.y<b.y+b.height-1e-8&&a.y+a.height>b.y+1e-8;
  const marker=production('dissectionHotspotMarkerGeometry'),place=production('placeDissectionCallout');
  // Frozen browser-observed 390px phone pose, internal view, seed3, zoom2.
  // The former passive conduction hit box contained the painted pulmonary target.
  const phoneMatrix=[3.092523062399266,0,0,2.8342111511463486,-435.84700529059717,-184.82190182895408];
  const mirrored=[-phoneMatrix[0],0,0,phoneMatrix[3],phoneMatrix[4]+phoneMatrix[0]*500,phoneMatrix[5]];
  const sheared=[-phoneMatrix[0],.21,.34,phoneMatrix[3],phoneMatrix[4]+phoneMatrix[0]*500-.34*270,phoneMatrix[5]-.21*250];

  function layoutFixture(matrix=phoneMatrix,quizMode=false){
    const W=500,H=600,canvas={_dpr:1.43525},ctx=new ArcContext(matrix),g=geometry(W,H),canvasUiScale=1.8087966323123819,zoom=2;
    const options={quizMode,coarsePointer:false,labelUiScale:.9043983161561909,specimenTextScaleX:phoneMatrix[0]/(canvas._dpr*zoom),specimenTextScaleY:phoneMatrix[3]/(canvas._dpr*zoom),canvasUiScale,zoom,accessible:false,depthAtlasEnabled:false};
    const item={id:'conduction',index:10,x:.5425338243214689*W,y:.3455964706408733*H,width:.03022086432146882*W,height:.036639124457641135*H,pointX:.52*W,pointY:.42*H,showCallout:true,fullLabel:false,selected:false,hovered:false,guidedCallout:false,visibility:'visible',depth:'structure',side:'right',labelLines:[]};
    const layout=[item],screen=production('canvasScreenBox',{ctx,canvas}),markers=it=>marker(it,options),solve=vi.fn(place);
    const start=source.indexOf('// Keep cards, compact badges, and their hit rectangles off both leaflet groups.'),end=source.indexOf('function adaptiveHotspotMarkerGeometry(layout)',start);
    if(start<0||end<=start)throw Error('Missing actual final heart callout placement and hit-box registration block');
    const bindings={ctx,canvas,W,H,spec:{bodyShape:'heart'},d:{quizMode},semilunarLabelGeometry:g,canvasScreenBox:screen,canvasUiScale,labelScreenBottom:586,adaptiveHotspotLayout:layout,hudCompassBox:null,adaptiveHotspotMarkerGeometry:markers,zoom,placeDissectionCallout:solve};
    const run=()=>new Function(...Object.keys(bindings),source.slice(start,end))(...Object.values(bindings));
    const register=()=>{canvas._hotspotLabelBoxes=layout.map(it=>({id:it.id,x:it.x/W,y:it.y/H,width:it.width/W,height:it.height/H}));};
    const organs=[{id:'conduction',x:.52,y:.42},{id:'aortic_v',...g.targets.aortic_v},{id:'pulm_v',...g.targets.pulm_v}];
    const hit=production('closestVisibleOrganAt',{organs,currentProcedure:{},structureExposureState:()=> 'visible',variedOrganPoint:org=>org});
    const badgeBox=()=>{const b=markers(item).badge;if(!b)return null;const stroke=.4/zoom;return screen(b.cx-b.rx-stroke,b.cy-b.ry-stroke,(b.rx+stroke)*2,(b.ry+stroke)*2);};
    const tissue=g.valves.map(valve=>{const b=valve.bounds,box=screen(b.minX*W,b.minY*H,(b.maxX-b.minX)*W,(b.maxY-b.minY)*H),pad=3*canvasUiScale;return{x:box.x-pad,y:box.y-pad,width:box.width+2*pad,height:box.height+2*pad};});
    register();return{W,H,ctx,canvas,g,item,layout,screen,markers,solve,run,hit,badgeBox,tissue,canvasUiScale,zoom};
  }

  it.each([['observed phone',phoneMatrix],['mirrored phone',mirrored],['mirrored and sheared affine',sheared]])('repairs the passive conduction badge and hit box without shrinking or stealing the pulmonary target: %s',(_,matrix)=>{
    const f=layoutFixture(matrix),before=structuredClone(f.item),target=f.g.targets.pulm_v;
    expect(f.item.fullLabel).toBe(false);expect(f.item.selected||f.item.hovered||f.item.guidedCallout).toBe(false);
    expect(f.hit(target.x,target.y,.06,f.canvas).id).toBe('conduction');
    const beforeCard=f.screen(f.item.x,f.item.y,f.item.width,f.item.height),beforeBadge=f.badgeBox();expect(f.tissue.some(box=>overlap(beforeCard,box)||overlap(beforeBadge,box))).toBe(true);
    const canvasState=f.ctx.state();f.run();expect(f.solve).toHaveBeenCalledTimes(1);expect(f.ctx.state()).toEqual(canvasState);
    expect(Math.hypot(f.item.x-before.x,f.item.y-before.y)).toBeGreaterThan(0);expect(f.item.width).toBe(before.width);expect(f.item.height).toBe(before.height);expect(f.item.pointX).toBe(before.pointX);expect(f.item.pointY).toBe(before.pointY);expect(f.item.labelLines).toEqual(before.labelLines);
    const afterCard=f.screen(f.item.x,f.item.y,f.item.width,f.item.height),afterBadge=f.badgeBox();for(const box of f.tissue){expect(overlap(afterCard,box)).toBe(false);expect(overlap(afterBadge,box)).toBe(false);}
    const [envelope,viewport,obstacles]=f.solve.mock.calls[0];expect(obstacles).toHaveLength(3); // Both valves plus its fixed anatomy point; its moving badge is excluded.
    const point=f.markers(f.item).point,pointBox=f.screen(point.cx-point.rx,point.cy-point.ry,point.rx*2,point.ry*2),pad=2*f.canvasUiScale;
    expect(obstacles[2]).toEqual({x:pointBox.x-pad,y:pointBox.y-pad,width:pointBox.width+pad*2,height:pointBox.height+pad*2});
    expect(envelope.x).toBeCloseTo(Math.min(beforeCard.x,beforeBadge.x),10);expect(envelope.y).toBeCloseTo(Math.min(beforeCard.y,beforeBadge.y),10);
    expect(envelope.width).toBeCloseTo(Math.max(beforeCard.x+beforeCard.width,beforeBadge.x+beforeBadge.width)-envelope.x,10);expect(envelope.height).toBeCloseTo(Math.max(beforeCard.y+beforeCard.height,beforeBadge.y+beforeBadge.height)-envelope.y,10);
    const placement=f.solve.mock.results[0].value;expect(placement).not.toBeNull();expect(placement.x).toBeGreaterThanOrEqual(viewport.x);expect(placement.y).toBeGreaterThanOrEqual(viewport.y);expect(placement.x+placement.width).toBeLessThanOrEqual(viewport.x+viewport.width+1e-9);expect(placement.y+placement.height).toBeLessThanOrEqual(viewport.y+viewport.height+1e-9);
    expect(afterCard.x-beforeCard.x).toBeCloseTo(placement.x-envelope.x,10);expect(afterCard.y-beforeCard.y).toBeCloseTo(placement.y-envelope.y,10);expect(afterBadge.x-beforeBadge.x).toBeCloseTo(placement.x-envelope.x,10);expect(afterBadge.y-beforeBadge.y).toBeCloseTo(placement.y-envelope.y,10);
    expect(f.canvas._hotspotLabelBoxes[0]).toEqual({id:'conduction',x:f.item.x/f.W,y:f.item.y/f.H,width:f.item.width/f.W,height:f.item.height/f.H});expect(f.hit(target.x,target.y,.06,f.canvas).id).toBe('pulm_v');
  });

  it('leaves quiz callout layout and hit registration unchanged because neither cards nor badges are painted',()=>{
    const f=layoutFixture(phoneMatrix,true),before=structuredClone(f.layout),boxes=structuredClone(f.canvas._hotspotLabelBoxes),state=f.ctx.state();f.run();expect(f.layout).toEqual(before);expect(f.canvas._hotspotLabelBoxes).toEqual(boxes);expect(f.solve).not.toHaveBeenCalled();expect(f.ctx.state()).toEqual(state);
  });
});

