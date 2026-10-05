import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
const source=readFileSync('stem_lab/stem_tool_raptorhunt.js','utf8');
function body(name) {
  const start=source.indexOf('function '+name+'('),open=source.indexOf('{',start);
  let i=open,depth=1;while(depth){i++;if(source[i]==='{')depth++;if(source[i]==='}')depth--;}
  return source.slice(start,i+1);
}
const prepare=Function(body('raptorTalonPreparation')+';return raptorTalonPreparation;')();
const stage=Function(body('raptorStrikeStage')+';return raptorStrikeStage;')();
const rangeFill=Function(body('raptorStrikeRangeFill')+';return raptorStrikeRangeFill;')();
const pulseOpacity=Function(body('raptorContactPulseOpacity')+';return raptorContactPulseOpacity;')();
const carryOpacity=Function(body('raptorCarryOpacity')+';return raptorCarryOpacity;')();
const coach=Function(body('freeHuntStage')+';return freeHuntStage;')();
const motionArrow=Function(body('writeRaptorPreyMotionArrow')+';return writeRaptorPreyMotionArrow;')();
describe('coherent strike presentation',()=>{
  it('keeps current-line misses out of the cue without overriding an active throw or recovery',()=>{
    const target={dot:1,distance:8,reach:5};
    expect(stage(target,14,true,false,true,false)).toBe('approach');
    expect(stage(target,14,true,false,true,true)).toBe('window');
    expect(stage(target,14,false,true,true,false)).toBe('throw');
    expect(stage(target,14,false,false,true,false)).toBe('recovering');
  });
  it('opens the early window while retaining the actual reach boundary',()=>{
    const target={dot:1,distance:5.1,reach:5};
    expect(stage(target,9.5,true,false,true)).toBe('window');
    expect(rangeFill(target.distance,target.reach)).toBe(.95);
    expect(rangeFill(5,5)).toBe(1);
    expect(rangeFill(20,5)).toBe(.25);
  });
  it('keeps the window closed for distant or misaligned prey',()=>{
    expect(stage({dot:.69,distance:5},9.5,true,false,true)).toBe('approach');
    expect(stage({dot:1,distance:10},9.5,true,false,true)).toBe('approach');
    expect(stage(null,0,true,false,true)).toBe('approach');
    expect(rangeFill(NaN,5)).toBe(0);
    expect(rangeFill(5,0)).toBe(0);
  });
  it('prioritizes an active throw and recovery, and suppresses both on the ground',()=>{
    const target={dot:1,distance:5};
    expect(stage(target,9.5,false,true,true)).toBe('throw');
    expect(stage(target,9.5,false,false,true)).toBe('recovering');
    expect(stage(target,9.5,true,true,false)).toBe('approach');
  });
  it('coaches an early window and active throw even while geometric state is close',()=>{
    expect(coach('close',false,false,'window')).toMatchObject({phase:2,title:'Strike window open',tip:'Strike now or tap the prey.'});
    expect(coach('close',false,false,'throw')).toMatchObject({phase:2,title:'Talons out',tip:'Keep prey ahead through contact.'});
    expect(coach('close',false,false,'recovering').phase).toBe(3);
    expect(coach('close',false,false,'approach').title).toBe('Close the distance');
  });
  it('keeps catch, miss and ground recovery ahead of approach coaching',()=>{
    expect(coach('hit',false,false,'recovering').title).toBe('Catch secured');
    expect(coach('miss',false,false,'recovering').title).toBe('Reset your approach');
    expect(coach('close',true,false,'window').title).toBe('Launch to pursue');
    expect(coach('close',false,true,'window').title).toBe('Recover on the ground');
  });
  it('prioritizes a fresh window or retry over the preceding result',()=>{
    expect(coach('miss',false,false,'throw').title).toBe('Talons out');
    expect(coach('hit',false,false,'window').title).toBe('Strike window open');
    expect(coach('hit',false,false,'recovering').title).toBe('Catch secured');
  });
});
describe('prey motion arrow',()=>{
  it('shows direction and a half-second movement cue while preserving the original tether',()=>{
    const points=new Float32Array(24);points.fill(99,0,6);
    expect(motionArrow(points,{x:2,y:3,z:4},{x:4,y:0,z:0},.45)).toBe(8);
    expect(Array.from(points.slice(0,6))).toEqual([99,99,99,99,99,99]);
    expect(Array.from(points.slice(6,9))).toEqual([2,3.25,4]);
    expect(points[9]).toBeCloseTo(3.8,6);expect(points[10]).toBe(3.25);expect(points[11]).toBe(4);
    expect(points[15]).toBeLessThan(points[9]);expect(points[21]).toBeLessThan(points[9]);
    expect(points[17]-4).toBeCloseTo(4-points[23],6);
  });
  it('bounds fast prey cues and handles straight climbs without invalid geometry',()=>{
    const points=new Float32Array(24);
    motionArrow(points,{x:0,y:0,z:0},{x:100,y:0,z:0},.45);
    expect(points[9]).toBe(4);
    motionArrow(points,{x:0,y:0,z:0},{x:0,y:4,z:0},.45);
    expect(points[10]).toBeCloseTo(2.05,6);expect(Array.from(points).every(Number.isFinite)).toBe(true);
    expect(points[15]).toBeGreaterThan(0);expect(points[21]).toBeLessThan(0);
  });
  it('hides the arrow for still or barely moving prey',()=>{
    expect(motionArrow(new Float32Array(24),{x:0,y:0,z:0},{x:.2,y:0,z:.2},.45)).toBe(2);
    expect(motionArrow(new Float32Array(24),{x:0,y:0,z:0},{x:10,y:0,z:0},0)).toBe(2);
  });
});
describe('restrained contact pulses',()=>{
  it('fades monotonically to zero, with a longer water ripple',()=>{
    for(const water of [false,true]) {
      const end = water ? 0.9 : 0.5;
      const values=Array.from({length:21},(_,i)=>pulseOpacity(i*end/20,water,false));
      expect(values[0]).toBeLessThanOrEqual(.38);
      for(let i=1;i<values.length;i++)expect(values[i]).toBeLessThanOrEqual(values[i-1]+1e-12);
      expect(values.at(-1)).toBe(0);
      expect(pulseOpacity(end+1,water,false)).toBe(0);
    }
    expect(pulseOpacity(.6,false,false)).toBe(0);
    expect(pulseOpacity(.6,true,false)).toBeGreaterThan(0);
  });
  it('retains a low-contrast reduced-motion contact and independent per-catch ages',()=>{
    expect(pulseOpacity(0,false,true)).toBe(.18);
    expect(pulseOpacity(0,true,true)).toBe(.18);
    expect(pulseOpacity(.5,false,false)).toBe(0);
    expect(pulseOpacity(.1,false,false)).toBeGreaterThan(0);
    expect(pulseOpacity(-1,false,false)).toBe(.30);
  });
});
describe('physical strike preparation',()=>{
  it('prepares smoothly toward reach without fully throwing the feet',()=>{
    const target={dot:1,reach:5};
    const amounts=[20,14,10,8,5].map(distance=>prepare({...target,distance},20));
    expect(amounts[0]).toBe(0);
    for(let i=1;i<amounts.length;i++)expect(amounts[i]).toBeGreaterThanOrEqual(amounts[i-1]);
    expect(amounts.at(-1)).toBe(0.45);
  });
  it('does not prepare for misaligned, missing or receding prey',()=>{
    expect(prepare(null,20)).toBe(0);
    expect(prepare({dot:.69,distance:3,reach:5},20)).toBe(0);
    expect(prepare({dot:1,distance:6,reach:5},0)).toBe(0);
    expect(prepare({dot:1,distance:6,reach:5},-10)).toBe(0);
  });
});
describe('caught prey transition',()=>{
  it('keeps the caught animal fully visible through the recovery hold',()=>{
    for(const age of [0,400,899,900]) expect(carryOpacity(age,false)).toBe(1);
  });
  it('eases opacity through the last 200 ms and clears at the original expiry',()=>{
    expect(carryOpacity(950,false)).toBeCloseTo(.84375,10);
    expect(carryOpacity(1000,false)).toBeCloseTo(.5,10);
    expect(carryOpacity(1050,false)).toBeCloseTo(.15625,10);
    expect(carryOpacity(1100,false)).toBe(0);
    expect(carryOpacity(1400,false)).toBe(0);
    const values=Array.from({length:41},(_,i)=>carryOpacity(900+i*5,false));
    for(let i=1;i<values.length;i++) {
      expect(values[i]).toBeGreaterThanOrEqual(0);
      expect(values[i]).toBeLessThanOrEqual(values[i-1]);
    }
  });
  it('retains the static reduced-motion catch until the same expiry',()=>{
    for(const age of [0,900,950,1000,1099]) expect(carryOpacity(age,true)).toBe(1);
    expect(carryOpacity(1100,true)).toBe(0);
    expect(carryOpacity(1400,true)).toBe(0);
  });
});
describe('strike event accounting',()=>{
  it('records each fast catch and miss while suppressing repeated guidance',()=>{
    const recorder=[];
    const api=Function('flightRecorder',`var missionElapsed=0;${body('recordFlightEvent')};return function(kind,label,t){missionElapsed=t;recordFlightEvent(kind,label,'');};`)(recorder);
    api('catch','Catch secured',0);api('catch','Catch secured',.45);
    api('miss','Strike missed',.9);api('miss','Strike missed',1.35);
    api('target','Target ready',1.4);api('target','Target ready',1.6);
    expect(recorder.map(e=>e.kind)).toEqual(['catch','catch','miss','miss','target']);
  });
});
