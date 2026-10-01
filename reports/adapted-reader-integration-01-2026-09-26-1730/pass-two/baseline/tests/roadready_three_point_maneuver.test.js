import { beforeAll, it, expect } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let R;
beforeAll(()=>{resetStemLab();window.__RR_TEST_EXPORTS__={};loadTool('stem_lab/stem_tool_roadready.js','roadReady');R=window.__RR_TEST_EXPORTS__.roadReady;});
const start=()=>({x:350,y:300,heading:0,speed:0,steering:0});

it('starts completely in the right-hand lane with room on all sides',()=>{
  const c=start(),g=R.threePointClearances(c);
  expect(c.y-g.radiusY).toBeGreaterThan(240);
  for(const side of ['top','bottom','left','right'])expect(g[side]).toBeGreaterThan(0);
});

it('detects a rotated bumper reaching the curb before the center reaches it',()=>{
  const before={x:350,y:185,heading:Math.PI/4},c={...before,y:176,speed:4,steering:0};
  const result=R.threePointContact(c,before);
  expect(result).toMatchObject({kind:'curb',isNew:true});
  expect(c).toMatchObject({...before,speed:0});
  expect(R.threePointNextStage(c,0,20)).toBe(0);
});

it('stops without bounce, counts a held contact once, and allows recovery and a later contact',()=>{
  const before={x:350,y:179,heading:-Math.PI/2},c={...before,speed:0,steering:0};
  for(let i=0;i<4;i++){
    c.y=177;c.speed=1;
    expect(R.threePointContact(c,before).isNew).toBe(i===0);
    expect(c.speed).toBe(0);expect(c.y).toBe(179);
  }
  c.y=178.5;c.speed=0.5;expect(R.threePointContact(c,before).isNew).toBe(false);expect(c.y).toBe(179);expect(c.speed).toBe(0);
  c.y=183;R.threePointContact(c,before);expect(c.contactState).toBeNull();
  c.y=177;expect(R.threePointContact(c,before).isNew).toBe(true);
});

it('requires movement in each leg and finishes only straight and stopped in the upper lane',()=>{
  const c={x:320,y:210,heading:Math.PI,speed:0,steering:0};
  expect(R.threePointNextStage(c,2,0)).toBe(2);
  expect(R.threePointNextStage({...c,y:290},2,10)).toBe(2);
  expect(R.threePointNextStage({...c,speed:1},2,10)).toBe(2);
  expect(R.threePointNextStage({...c,steering:0.4},2,10)).toBe(2);
  expect(R.threePointNextStage(c,2,10)).toBe(3);
});

it('completes all three moves by following the live coach, without curb contact',()=>{
  const c=start();let stage=0,travel=0,ticks=0;
  const stages=[];
  for(;ticks<9000&&stage<3;ticks++){
    const cue=R.threePointCue(c,stage,false);
    const brake=cue.startsWith('Brake now')||cue.startsWith('Straighten');
    const steer=stage===1?1:stage===2&&brake?0:-1;
    const before={x:c.x,y:c.y,heading:c.heading};
    R.threePointMotion(c,stage===1?0:1,stage===1?1:0,steer,brake);
    expect(R.threePointContact(c,before).kind).toBeNull();
    travel+=Math.hypot(c.x-before.x,c.y-before.y);
    const next=R.threePointNextStage(c,stage,travel);
    if(next!==stage){stages.push(next);stage=next;travel=0;}
  }
  expect(stages).toEqual([1,2,3]);
  expect(ticks/60).toBeLessThan(90);
  expect(c.speed).toBe(0);
  expect(R.threePointClearances(c).upperLane).toBe(true);
});
