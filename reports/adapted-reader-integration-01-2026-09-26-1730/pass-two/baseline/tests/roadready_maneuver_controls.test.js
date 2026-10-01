import { beforeAll, afterEach, it, expect } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
let R, original;
beforeAll(() => { resetStemLab(); original=window.StemInput; window.__RR_TEST_EXPORTS__={}; loadTool('stem_lab/stem_tool_roadready.js','roadReady'); R=window.__RR_TEST_EXPORTS__.roadReady; });
afterEach(() => { window.StemInput=original; });

it('uses proportional acceleration and braking while retaining full keyboard response', () => {
  let full=0, half=0;
  for(let i=0;i<120;i++) { full=R.drivingDrillSpeed(full,1,0,0,30); half=R.drivingDrillSpeed(half,0.5,0,0,30); }
  expect(half).toBeCloseTo(full/2,5);
  expect(R.drivingDrillSpeed(full,1,0,1,30)).toBeLessThan(R.drivingDrillSpeed(full,1,0,0.5,30));
  expect(R.drivingDrillSpeed(0,true,false,false,30)).toBe(R.drivingDrillSpeed(0,1,0,0,30));
});

it('suspends motion and discards queued actions while control settings are open', () => {
  window.StemInput={isSuspended:()=>true,read:()=>({throttle:1})};
  const car={speed:4},keys={_parkingGear:'R',_pausePractice:true,_securePark:true};
  expect(R.practiceDrillInput(car,keys)._practiceInactive).toBe(true);
  expect(car).toMatchObject({speed:0,settingsPaused:true,requireParkingNeutral:true});
  expect(keys).toMatchObject({_parkingGear:null,_pausePractice:false,_securePark:false});
});

it('holds a new attempt still until controller inputs release and then exposes analog values', () => {
  let actions={throttle:0.5,steer:0.4};
  window.StemInput={isSuspended:()=>false,read:()=>actions};
  const car={speed:0,requireParkingNeutral:true},keys={};
  expect(R.practiceDrillInput(car,keys)._practiceInactive).toBe(true);
  actions={}; R.practiceDrillInput(car,keys);
  actions={reverse:1}; R.practiceDrillInput(car,keys);
  expect(car.driveGear).toBe('R');
  actions={throttle:0.5,steer:0.4,brake:0.2};
  expect(R.practiceDrillInput(car,keys)).toMatchObject({_gpThrottle:0.5,_gpSteer:0.4,_gpBrake:0.2});
});

it('keeps the pause latch when settings close', () => {
  let suspended=true;
  window.StemInput={isSuspended:()=>suspended,read:()=>({})};
  const car={speed:0,practicePaused:true},keys={};
  R.practiceDrillInput(car,keys); suspended=false;
  expect(R.practiceDrillInput(car,keys)._practiceInactive).toBe(true);
  expect(car.practicePaused).toBe(true);
  keys._pausePractice=true; R.practiceDrillInput(car,keys);
  expect(car.practicePaused).toBe(false);
});
