import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let P;
beforeAll(() => {
  resetStemLab();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  loadTool(process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js', 'moonMission');
  P = window.MoonMissionPure;
});
afterAll(() => vi.restoreAllMocks());

function recorder() {
  const calls = [], worldMoves = [], transforms = [], states = [];
  let matrix = [1, 0, 0, 1, 0, 0], nextGradient = 0;
  const target = { globalAlpha: 1 };
  const multiply = n => {
    const [a, b, c, d, e, f] = matrix;
    matrix = [a*n[0]+c*n[1], b*n[0]+d*n[1], a*n[2]+c*n[3], b*n[2]+d*n[3], a*n[4]+c*n[5]+e, b*n[4]+d*n[5]+f];
  };
  const methods = {
    save() { transforms.push(matrix.slice()); states.push({ ...target }); calls.push(['save']); },
    restore() { matrix = transforms.pop(); Object.assign(target, states.pop()); calls.push(['restore']); },
    translate(x,y) { multiply([1,0,0,1,x,y]); calls.push(['translate',x,y]); },
    scale(x,y) { multiply([x,0,0,y,0,0]); calls.push(['scale',x,y]); },
    rotate(a) { multiply([Math.cos(a),Math.sin(a),-Math.sin(a),Math.cos(a),0,0]); calls.push(['rotate',a]); },
    moveTo(x,y) { worldMoves.push([matrix[0]*x+matrix[2]*y+matrix[4],matrix[1]*x+matrix[3]*y+matrix[5]]); calls.push(['moveTo',x,y]); },
    createLinearGradient(...args) { const id=++nextGradient; calls.push(['gradient',...args]); return { id, addColorStop: (...stop) => calls.push(['stop',...stop]) }; },
    measureText: text => ({ width: String(text).length*5 }),
  };
  const ctx = new Proxy(target, {
    get: (t,k) => methods[k] || t[k] || ((...args) => calls.push([k,...args])),
    set: (t,k,v) => { t[k]=v; calls.push(['set',k,v && v.id ? 'gradient:'+v.id : v]); return true; },
  });
  return { ctx, calls, worldMoves, transforms, states };
}
const drawCraft = (options={}, angle=0.731, scale=0.62) => {
  const c=recorder(); c.result=P.drawDepartureCSM(c.ctx,215,132,scale,angle,options); return c;
};
const geomCalls = calls => calls.filter(row => !['set','gradient','stop'].includes(row[0]));
const sun = fraction => ({ directionX: 3, directionY: 4, fraction });
const finiteCalls = calls => {
  for (const row of calls) for (const value of row) if (typeof value==='number') expect(Number.isFinite(value),row[0]).toBe(true);
};
const channels = color => {
  expect(color).toMatch(/^rgb\(\d+,\d+,\d+\)$/);
  return color.slice(4,-1).split(',').map(Number);
};
const plumePrefix = calls => {
  const end=calls.findIndex(r=>r[0]==='set'&&r[1]==='globalAlpha'&&r[2]===1);
  expect(end).toBeGreaterThan(0); return calls.slice(0,end+1);
};

describe('standalone departure spacecraft', () => {
  it('keeps the measured center at the midpoint of port and nozzle at every attitude', () => {
    for (const angle of [-9,-Math.PI,-Math.PI/2,-0.2,0,0.731,Math.PI/2,8]) for (const scale of [0.01,0.42,0.62,2]) {
      const g=P.departureCraftGeometry(215,132,scale,angle);
      expect((g.portX+g.nozzleX)/2).toBeCloseTo(215,12);
      expect((g.portY+g.nozzleY)/2).toBeCloseTo(132,12);
      expect(Math.hypot(g.nozzleX-g.portX,g.nozzleY-g.portY)).toBeCloseTo(77*scale,12);
      const axis=[(g.nozzleX-g.portX)/(77*scale),(g.nozzleY-g.portY)/(77*scale)];
      expect(axis[0]).toBeCloseTo(g.exhaustX,11); expect(axis[1]).toBeCloseTo(g.exhaustY,11);
      expect(axis[0]*g.thrustX+axis[1]*g.thrustY).toBeCloseTo(-1,11);
      expect(Math.hypot(g.thrustX,g.thrustY)).toBeCloseTo(1,14);
    }
    const first=P.departureCraftGeometry(215,132,1,0); first.portX=999;
    expect(P.departureCraftGeometry(215,132,1,0).portX).toBe(176.5);
  });

  it('rejects malformed, degenerate and overflowing drawing geometry before touching the canvas', () => {
    for (const invalid of [undefined,null,false,'1',{},[],NaN,Infinity,-Infinity]) for (let i=0;i<4;i++) {
      const args=[215,132,1,0];args[i]=invalid;
      expect(P.departureCraftGeometry(...args)).toBeNull();
      const c=recorder();expect(P.drawDepartureCSM(c.ctx,...args)).toBeNull();expect(c.calls).toEqual([]);
    }
    for (const scale of [0,-1,Number.MAX_VALUE]) expect(P.departureCraftGeometry(0,0,scale,0)).toBeNull();
    expect(P.departureCraftGeometry(Number.MAX_VALUE,0,Number.MAX_VALUE/40,0)).toBeNull();
    expect(P.drawDepartureCSM(null,0,0,1,0)).toBeNull();
  });

  it('draws a capsule, service-module panels and SPS bell without an attached lunar module', () => {
    const c=drawCraft();
    expect(c.calls).toContainEqual(['moveTo',6,-3.5]);
    expect(c.calls).toContainEqual(['fillRect',28.3,-11,33,22]);
    expect(c.calls.filter(r=>r[0]==='strokeRect')).toHaveLength(4);
    expect(c.calls).toContainEqual(['bezierCurveTo',68,-5,73,-10,77,-11]);
    expect(c.calls).toContainEqual(['moveTo',77,-11]);
    // Every hull primitive begins on the CSM side of the docking port.
    for (const row of c.calls.filter(r=>['moveTo','lineTo','fillRect','strokeRect'].includes(r[0]))) expect(row[1]).toBeGreaterThanOrEqual(0);
    expect(c.calls.filter(r=>r[0]==='rotate')).toEqual([['rotate',0.731]]);
    expect(c.transforms).toEqual([]);expect(c.states).toEqual([]);finiteCalls(c.calls);
  });

  it('attaches the expanding vacuum plume to the transformed nozzle rather than the measured center', () => {
    for (const angle of [-2.3,0,0.731,Math.PI/2]) {
      const c=drawCraft({ engineOn:true,thrust:91000,time:17 },angle,0.62),g=c.result;
      const first=c.worldMoves[0];
      // Plume starts ten local drawing units to one side of the bell center.
      const side=[-Math.sin(angle),Math.cos(angle)];
      expect(first[0]+side[0]*10*0.62).toBeCloseTo(g.nozzleX,11);
      expect(first[1]+side[1]*10*0.62).toBeCloseTo(g.nozzleY,11);
      expect(c.calls).toContainEqual(['gradient',77,0,140,0]);
      expect(c.calls).toContainEqual(['bezierCurveTo',94,-11,116,-22,139,-30]);
      expect(c.calls).toContainEqual(['quadraticCurveTo',149,0,139,30]);
      expect(c.calls.findIndex(r=>r[0]==='quadraticCurveTo')).toBeLessThan(c.calls.findIndex(r=>r[0]==='fillRect'));
      expect(c.transforms).toEqual([]);finiteCalls(c.calls);
    }
  });

  it('requires both an explicit engine command and positive thrust, including cutoff and fuel exhaustion', () => {
    const cases=[{}, {engineOn:false,thrust:91000},{engineOn:1,thrust:91000},{engineOn:true,thrust:0},{engineOn:true,thrust:-1},{engineOn:true,thrust:NaN},{engineOn:true,thrust:91000}];
    for (const opts of cases) {
      const c=drawCraft(opts),firing=opts.engineOn===true&&opts.thrust>0;
      expect(c.result.engineVisible).toBe(firing);expect(c.result.plumeVisible).toBe(firing);
      expect(c.calls.some(r=>r[0]==='gradient'&&r[1]===77&&r[3]===140)).toBe(firing);
    }
    for (const fuel of [undefined,{amount:0,source:'preset'},{amount:1,source:'preset'}]) {
      const p=P.departureProfile({},fuel);
      for (const t of [0,90,p.cutoffTime,p.summary.duration]) {
        const sample=P.departureSample(p,t),c=drawCraft(sample);
        expect(c.result.plumeVisible).toBe(sample.engineOn&&sample.thrust>0);
        if(t>=p.cutoffTime)expect(c.result.plumeVisible).toBe(false);
      }
    }
  });

  it('keeps hull geometry opaque while material brightness rises from eclipse to sunlight', () => {
    const draws=[0,0.25,1].map(fraction=>drawCraft({sunlight:sun(fraction)}));
    const paints=c=>c.calls.filter(r=>(r[0]==='stop')||(r[0]==='set'&&['fillStyle','strokeStyle'].includes(r[1])&&!String(r[2]).startsWith('gradient:'))).map(r=>channels(r[2]));
    const samples=draws.map(paints);
    // Cover both opaque curved hull gradients, plus distinct window and bell
    // paints in eclipse. The standalone CSM has fewer paints than a CSM/LM stack.
    expect(draws[0].calls.filter(r=>r[0]==='gradient')).toEqual([
      ['gradient',0,-12,0,12], ['gradient',0,-11,0,11],
    ]);
    expect(samples[0]).toContainEqual([5,9,13]); // Window: #162637 at the 24% exposure floor.
    expect(samples[0]).toContainEqual([10,12,14]); // Bell: #29313b at the same floor.
    for(let i=0;i<samples[0].length;i++)for(let j=0;j<3;j++) {
      expect(samples[1][i][j]).toBeGreaterThanOrEqual(samples[0][i][j]);
      expect(samples[2][i][j]).toBeGreaterThanOrEqual(samples[1][i][j]);
    }
    expect(samples[2]).not.toEqual(samples[0]);
    for (const c of draws) {
      expect(geomCalls(c.calls)).toEqual(geomCalls(draws[0].calls));
      expect(c.calls.filter(r=>r[0]==='set'&&['globalAlpha','globalCompositeOperation'].includes(r[1]))).toEqual([]);
    }
  });

  it('preserves plume shape, brightness and time modulation through every eclipse fraction', () => {
    for(const time of [0,17.25,81]) {
      const base=drawCraft({engineOn:true,thrust:91000,time});
      for(const fraction of [0,0.1,0.6,1]) {
        const c=drawCraft({engineOn:true,thrust:91000,time,sunlight:sun(fraction)});
        expect(plumePrefix(c.calls)).toEqual(plumePrefix(base.calls));
        expect(c.calls.filter(r=>r[0]==='set'&&r[1]==='globalAlpha')).toEqual(base.calls.filter(r=>r[0]==='set'&&r[1]==='globalAlpha'));
      }
    }
  });

  it('reprojects body sunlight to the physical Sun and handles unavailable light without state mutation', () => {
    for(const angle of [-2.3,0,0.731,2]) {
      const options=Object.freeze({sunlight:Object.freeze(sun(0.3)),engineOn:false,time:0}),before=JSON.stringify(options);
      const c=drawCraft(options,angle),light=c.result.sunlight;
      expect(light.x*Math.cos(angle)-light.y*Math.sin(angle)).toBeCloseTo(0.6,13);
      expect(light.x*Math.sin(angle)+light.y*Math.cos(angle)).toBeCloseTo(-0.8,13);
      expect(light.fraction).toBe(0.3);expect(JSON.stringify(options)).toBe(before);
    }
    const base=drawCraft();
    for(const sunlight of [undefined,null,{},false,{directionX:0,directionY:0,fraction:1}]) {
      const c=drawCraft({sunlight});expect(c.result.sunlight).toBeNull();expect(c.calls).toEqual(base.calls);
    }
  });
});

describe('departure scene physical overlay', () => {
  it('aligns SPS thrust with measured velocity across profiles, views and viewport sizes', () => {
    for(const plan of [{},{burnSeconds:40},{burnSeconds:300,offsetSeconds:-600}]) {
      const p=P.departureProfile(plan),saved=JSON.stringify(p);
      for(const time of [0,90,150,p.cutoffTime,p.summary.duration])for(const view of ['burn','escape'])for(const width of [260,650]) {
        const sample=P.departureSample(p,time),before=JSON.stringify(sample),c=recorder(),g=P.drawDeparture(c.ctx,width,360,sample,p,view),a=g.spacecraft;
        const speed=Math.hypot(sample.vx,sample.vy),v=[sample.vx/speed,-sample.vy/speed];
        expect(a.thrustX*v[0]+a.thrustY*v[1]).toBeCloseTo(1,13);
        expect(a.exhaustX*v[0]+a.exhaustY*v[1]).toBeCloseTo(-1,13);
        expect((g.craft.x-g.cx)/g.scale).toBeCloseTo(sample.x,5);expect((g.cy-g.craft.y)/g.scale).toBeCloseTo(sample.y,5);
        expect(a.centerX).toBe(g.craft.x);expect(a.centerY).toBe(g.craft.y);expect(g.scaleX).toBe(g.scaleY);
        expect(g.moonRadius/g.scale).toBeCloseTo(P.loi.radius,7);
        const end=sample.earth.hit||sample.earth.target;
        expect((g.radioEnd.x-g.cx)/g.scale).toBeCloseTo(end.x,5);expect((g.cy-g.radioEnd.y)/g.scale).toBeCloseTo(end.y,5);
        expect(g.radioBlocked).toBe(!sample.earth.visible);expect(g.plumeVisible).toBe(sample.engineOn&&sample.thrust>0);
        expect(g.sunAngle).toBe(45);expect(g.sunlight).toEqual(P.lunarSunlight(sample,45));
        expect(c.calls).toContainEqual(['arc',g.craft.x,g.craft.y,2.8,0,Math.PI*2]);
        expect(c.transforms).toEqual([]);expect(JSON.stringify(sample)).toBe(before);finiteCalls(c.calls);
      }
      expect(JSON.stringify(p)).toBe(saved);
    }
  });

  it('leaves a frozen coast scene identical at different presentation times', () => {
    const p=P.departureProfile(),s=P.departureSample(p,0),a=recorder(),b=recorder();
    P.drawDeparture(a.ctx,650,360,s,p,'burn');
    P.drawDeparture(b.ctx,650,360,{...s,time:40},p,'burn');
    // Stop at the Moon rim: this compares stars and spherical shading only,
    // before the intentionally time-dependent trajectory is rendered.
    const end=c=>c.calls.findIndex(r=>r[0]==='arc'&&r[1]===325&&r[2]===192.5);
    expect(end(a)).toBeGreaterThan(50);expect(a.calls.slice(0,end(a))).toEqual(b.calls.slice(0,end(b)));
  });
});
