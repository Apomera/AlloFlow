import { beforeAll, it, expect } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let R;
beforeAll(()=>{resetStemLab();window.__RR_TEST_EXPORTS__={};loadTool('stem_lab/stem_tool_roadready.js','roadReady');R=window.__RR_TEST_EXPORTS__.roadReady;});
const car=()=>({x:300,y:80,heading:-Math.PI/2,speed:0,steering:0});
const cones=()=>Array.from({length:10},(_,i)=>[{x:275,y:100+i*36},{x:325,y:100+i*36}]).flat();

it('detects rear and corner contacts that the old center circle missed',()=>{
  const c={...car(),x:288,y:78};
  expect(Math.hypot(c.x-275,c.y-100)).toBeGreaterThan(16);
  expect(R.backingCarHitsCone(c,{x:275,y:100})).toBe(true);
  expect(R.backingCarHitsCone({...c,heading:Math.PI/4},{x:310,y:94})).toBe(true);
});
it('keeps the centered starting pose clear of every cone',()=>{
  expect(cones().some(cone=>R.backingCarHitsCone(car(),cone))).toBe(false);
  expect(R.backingCarHitsCone(car(),{x:400,y:100})).toBe(false);
});
it('turns smoothly with direction-dependent yaw and cannot rotate at a stop',()=>{
  const f=car(),r=car(),stopped=car();
  for(let i=0;i<60;i++){
    R.backingDrillMotion(f,1,0,0.5,0);R.backingDrillMotion(r,0,1,0.5,0);R.backingDrillMotion(stopped,0,0,1,0);
  }
  expect(f.heading).toBeGreaterThan(-Math.PI/2);expect(r.heading).toBeLessThan(-Math.PI/2);
  expect(stopped).toMatchObject({x:300,y:80,heading:-Math.PI/2,speed:0});
  expect(f.steering).toBeCloseTo(0.175,2);
});
it('follows a clean straight backing path to a stopped finish without false cone contacts',()=>{
  const c=car();let done=false;
  for(let i=0;i<9000&&!done;i++){
    const brake=c.y>=430;
    R.backingDrillMotion(c,0,1,0,brake);
    expect(cones().some(cone=>R.backingCarHitsCone(c,cone))).toBe(false);
    done=R.backingDrillFinishCheck(c,430,275,325).ready;
  }
  expect(done).toBe(true);expect(c.speed).toBe(0);
  expect(R.backingDrillCoachState(c,true).progress).toBe(100);
});
it('gives side, alignment, approach, pause, and stop cues without claiming a measured distance',()=>{
  expect(R.backingDrillCoachState({...car(),x:291},false).cue).toContain('left');
  expect(R.backingDrillCoachState({...car(),x:309},false).cue).toContain('right');
  expect(R.backingDrillCoachState({...car(),heading:-Math.PI/2+0.12},false).cue).toContain('correction');
  expect(R.backingDrillCoachState({...car(),y:415},false).cue).toContain('Target approaching');
  expect(R.backingDrillCoachState({...car(),y:431,speed:-2},false).cue).toContain('complete stop');
  expect(R.backingDrillCoachState({...car(),practicePaused:true},false).cue).toContain('Resume');
  expect(R.backingDrillCoachState({...car(),y:-20},false).progress).toBe(0);
});
