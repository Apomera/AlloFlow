import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');

// Exercise the production pose writer with retained joint objects. Rendering
// and feather geometry are checked separately in the native WebGL pass.
const source = readFileSync('stem_lab/birdlab_3d_bird.js', 'utf8');
const start = source.indexOf('    function strokeCycle(');
const end = source.indexOf('    function dispose()', start);
if (start < 0 || end < 0) throw new Error('Missing bird pose writer');
const makePoseWriter = new Function('THREE', 'disablePoweredSweep', 'disableHandRecovery', `
  var disposed=false;
  var updateCarpalBridge=()=>{};
  var clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  var smooth=(a,b,v)=>{var t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};
  var joint=()=>({rotation:{x:0,y:0,z:0},position:{x:0,y:0,z:0},scale:{x:1,y:1,z:1}});
  var primaryJoint=side=>{var p=joint(),frame=new THREE.Object3D();p.rotation=frame.rotation;p.quaternion=frame.quaternion;p.position=frame.position;
    p.userData={vane:{morphTargetInfluences:[0,0]},quillAxis:new THREE.Vector3(side,.05,.5).normalize(),quillRotation:new THREE.Quaternion(),
      restPosition:new THREE.Vector3(),quillRoot:new THREE.Vector3(),closedQuillRoot:new THREE.Vector3()};return p;};
  var alulaJoint=()=>{var p=joint(),frame=new THREE.Object3D();p.rotation=frame.rotation;p.quaternion=frame.quaternion;p.position=frame.position;
    p.userData={restPosition:new THREE.Vector3(),quillRoot:new THREE.Vector3(),closedQuillRoot:new THREE.Vector3()};return p;};
  var foldedPigment={value:0},upperBody=joint(),head=joint(),torso=joint(),tail=joint(),eyes=[joint(),joint()];
  head.quaternion=new THREE.Quaternion();
  var blinkClosure={value:0},eyelids=[{visible:false},{visible:false}];
  var wings=[-1,1].map(side=>({side,shoulder:joint(),wrist:joint(),alula:alulaJoint(),
    meshes:[{morphTargetInfluences:[0,0]}],
    primaries:Array.from({length:8},()=>primaryJoint(side))}));
  var tailFeathers=Array.from({length:12},(_,i)=>({across:(i-5.5)/5.5,mesh:Object.assign(joint(),{morphTargetInfluences:[0]})}));
  var feet=[];
  ${source.slice(start, end).replace('var poweredSweep = amplitude * open * (1 - brake);',
    'var poweredSweep = disablePoweredSweep ? 0 : amplitude * open * (1 - brake);')
    .replace('var handRecovery = recovery + (recoveryAt(phase - 0.24) - recovery) * (1 - brake);',
      'var handRecovery = disableHandRecovery ? recovery : recovery + (recoveryAt(phase - 0.24) - recovery) * (1 - brake);')}
  return {update,wings,head,upperBody,tail,tailFeathers,eyes,eyelids,blinkClosure,
    snapshot:()=>JSON.stringify({wings,head,upperBody,torso,tail,tailFeathers,eyes,eyelids,blinkClosure})};
`);
const make = (disablePoweredSweep = false, disableHandRecovery = false) => makePoseWriter(THREE, disablePoweredSweep, disableHandRecovery);
const TAU = Math.PI * 2;
const phaseAt = cycle => (cycle - .21) * TAU;
const pose = (phase, extra = {}) => ({ flapPhase: phase, flapAmplitude: 1, fold: 0, elapsedTime: 4, ...extra });

function assertSmooth(sample, at, tolerance = .002) {
  const h = .0001;
  const [a,b,c,d,e] = [-2,-1,0,1,2].map(n => sample(at+n*h));
  expect(Math.abs((3*c-4*b+a)/(2*h)-(-3*c+4*d-e)/(2*h))).toBeLessThan(tolerance);
  expect(Math.abs((c-2*b+a)/(h*h)-(e-2*d+c)/(h*h))).toBeLessThan(tolerance);
}

describe('BirdLab loaded stroke and recovery', () => {
  it('blinks over fixed eyes and repeats its lid position when paused or scrubbed', () => {
    const model=make(),eyes=JSON.stringify(model.eyes);
    for(const time of [7.90,7.95,8,8.08,8.2]) {
      model.update(pose(0,{elapsedTime:time}),0);
      expect(JSON.stringify(model.eyes)).toBe(eyes);
      expect(model.eyelids.every(lid=>lid.visible===(model.blinkClosure.value>.0001))).toBe(true);
    }
    model.update(pose(0,{elapsedTime:7.95}),0);const partial=model.blinkClosure.value;
    expect(partial).toBeGreaterThan(0);expect(partial).toBeLessThan(1);
    model.update(pose(0,{elapsedTime:8}),0);expect(model.blinkClosure.value).toBe(1);
    model.update(pose(0,{elapsedTime:7.95}),0);expect(model.blinkClosure.value).toBe(partial);
    model.update(pose(0,{elapsedTime:7.95}),0);expect(model.blinkClosure.value).toBe(partial);
    model.update(pose(0,{elapsedTime:8.2}),0);expect(model.blinkClosure.value).toBe(0);
  });
  it('retains stroke depth and asymmetric timing without stops inside either half-stroke', () => {
    const model=make(), shoulder=cycle=>{
      model.update(pose(phaseAt(cycle)),0);return model.wings[1].shoulder.rotation.z;
    };
    expect(shoulder(0)).toBeCloseTo(.895,10);
    expect(shoulder(.42)).toBeCloseTo(-.745,10);
    expect(shoulder(1)).toBeCloseTo(shoulder(0),10);
    for(const [from,to,direction] of [[0,.42,-1],[.42,1,1]]) {
      let previous=shoulder(from);
      for(let i=1;i<=100;i++) {
        const next=shoulder(from+(to-from)*i/100);
        expect((next-previous)*direction).toBeGreaterThan(0);previous=next;
      }
    }
  });

  it('keeps shoulder and wrist velocity and acceleration continuous through reversals', () => {
    const model=make();
    for(const wing of model.wings)for(const [joint,delay] of [['shoulder',0],['wrist',.38]]) {
      for(const cycle of [0,.42,1])assertSmooth(phase=>{
        model.update(pose(phase),0);return wing[joint].rotation.z;
      },phaseAt(cycle)+delay);
    }
    for(const wing of model.wings)for(const joint of ['shoulder','wrist'])for(const axis of ['x','y'])for(const cycle of [0,.42,.71,1]) {
      assertSmooth(phase=>{model.update(pose(phase),0);return wing[joint].rotation[axis];},phaseAt(cycle));
    }
  });

  it('carries the loaded wing forward in a shallow mirrored arc with a trailing hand', () => {
    const model=make(),control=make(true),peaks={shoulder:{value:0,cycle:0},wrist:{value:0,cycle:0}};
    for(let tick=0;tick<=1000;tick++) {
      const cycle=tick/1000;
      model.update(pose(phaseAt(cycle)),0);control.update(pose(phaseAt(cycle)),0);
      for(const joint of ['shoulder','wrist']) {
        const difference=model.wings[1][joint].rotation.y-control.wings[1][joint].rotation.y;
        expect(model.wings[0][joint].rotation.y).toBeCloseTo(-model.wings[1][joint].rotation.y,12);
        expect(Math.abs(difference)).toBeLessThanOrEqual(joint==='shoulder'?.040:.025);
        if(difference>peaks[joint].value)peaks[joint]={value:difference,cycle};
      }
    }
    expect(peaks.shoulder.value).toBeGreaterThan(.0399);
    expect(peaks.wrist.value).toBeGreaterThan(.0249);
    expect(peaks.shoulder.cycle).toBeGreaterThan(.10);
    expect(peaks.wrist.cycle).toBeLessThan(.42);
    expect(peaks.wrist.cycle-peaks.shoulder.cycle).toBeGreaterThan(.015);
    expect(peaks.wrist.cycle-peaks.shoulder.cycle).toBeLessThan(.030);
  });

  it('keeps glide, closed wings and the full landing flare identical to their existing carriage', () => {
    const model=make(),control=make(true);
    for(const extra of [
      {flapAmplitude:0,wingSupport:.6,wingSweep:.7,rollControl:.4,airLift:.3,airRoll:-.5},
      {fold:1,feet:1,tailFan:.15},
      {brake:1,flapAmplitude:.54,fold:.13,feet:1,tailFan:.9},
    ])for(let tick=0;tick<=32;tick++) {
      const frame=pose(tick*Math.PI/16,extra);
      model.update(frame,0);control.update(frame,0);
      expect(model.snapshot()).toBe(control.snapshot());
    }
  });

  it('eases the forward stroke out as the wings fold and the landing brake opens', () => {
    const model=make(),control=make(true),sample=extra=>{
      const frame=pose(phaseAt(.2),extra);model.update(frame,0);control.update(frame,0);
      return model.wings[1].shoulder.rotation.y-control.wings[1].shoulder.rotation.y;
    };
    const loaded=sample({});
    expect(loaded).toBeGreaterThan(.035);
    expect(sample({flapAmplitude:.5})).toBeCloseTo(loaded*.5,12);
    expect(sample({fold:.5})).toBeCloseTo(loaded*.5,12);
    expect(sample({brake:.5})).toBeCloseTo(loaded*.5,12);
    expect(sample({fold:1})).toBe(0);
    expect(sample({brake:1})).toBe(0);
  });

  it('lets the hand finish recovery after the shoulder while preserving its angular range', () => {
    const model=make(),control=make(false,true),peaks=[{value:-Infinity,cycle:0},{value:-Infinity,cycle:0}];
    for(let tick=0;tick<=1000;tick++) {
      const cycle=tick/1000,frame=pose(phaseAt(cycle));
      for(const [index,rig] of [model,control].entries()) {
        rig.update(frame,0);
        const wrist=rig.wings[1].wrist.rotation;
        expect(wrist.x).toBeGreaterThanOrEqual(-.035);
        expect(wrist.x).toBeLessThanOrEqual(.20);
        if(wrist.x>peaks[index].value)peaks[index]={value:wrist.x,cycle};
      }
      expect(model.wings[1].shoulder.rotation).toEqual(control.wings[1].shoulder.rotation);
      expect(model.wings[0].wrist.rotation.x).toBe(model.wings[1].wrist.rotation.x);
      expect(model.wings[0].wrist.rotation.y).toBe(-model.wings[1].wrist.rotation.y);
    }
    expect(peaks[0].value).toBeCloseTo(peaks[1].value,5);
    expect(peaks[0].cycle-peaks[1].cycle).toBeGreaterThan(.035);
    expect(peaks[0].cycle-peaks[1].cycle).toBeLessThan(.040);
  });

  it('keeps delayed recovery smooth and restores the exact landing, glide and folded timing', () => {
    const model=make(),control=make(false,true);
    for(const cycle of [0,.42,1])for(const axis of ['x','y']) {
      assertSmooth(phase=>{model.update(pose(phase),0);return model.wings[1].wrist.rotation[axis];},phaseAt(cycle)+.24);
    }
    // Give both fixtures the same scratch-quaternion history before checking
    // the complete retained object snapshot, including non-rendered caches.
    for(const rig of [model,control])rig.update(pose(phaseAt(.74)),0);
    for(const extra of [{brake:1,flapAmplitude:.54,fold:.1},{flapAmplitude:0,wingSweep:.6,airRoll:.4},{fold:1}]) {
      for(let tick=0;tick<=64;tick++) {
        const frame=pose(tick*TAU/64,extra);model.update(frame,0);control.update(frame,0);
        expect(model.snapshot()).toBe(control.snapshot());
      }
    }
    const difference=brake=>{
      const frame=pose(phaseAt(.60),{brake});model.update(frame,0);control.update(frame,0);
      return model.wings[1].wrist.rotation.x-control.wings[1].wrist.rotation.x;
    };
    expect(Math.abs(difference(0))).toBeGreaterThan(.02);
    expect(difference(.5)).toBeCloseTo(difference(0)*.5,12);
  });

  it('loads every primary gradually and releases it through the recovery', () => {
    const model=make();
    for(const wing of model.wings)wing.primaries.forEach((primary,index)=>{
      const flex=phase=>{model.update(pose(phase),0);return primary.userData.vane.morphTargetInfluences[1];};
      const delay=.16+index*.025;
      for(const cycle of [0,.42,1])assertSmooth(flex,phaseAt(cycle)+delay);
      let minimum=0,maximum=0;
      for(let i=0;i<200;i++) {const value=flex(phaseAt(i/200)+delay);minimum=Math.min(minimum,value);maximum=Math.max(maximum,value);}
      expect(maximum).toBeGreaterThan(.71);expect(maximum).toBeLessThanOrEqual(.72);
      expect(minimum).toBeLessThan(-.11);expect(minimum).toBeGreaterThan(-.12);
    });
  });

  it('keeps folds still and repeats exactly after seeking or uneven playback steps', () => {
    const model=make(), target=pose(2.15,{elapsedTime:7.3,bank:.25,airLift:.6,airRoll:-.4,wingSweep:.7,wingSupport:.6,rollControl:-.4,flapAmplitude:.25});
    model.update(target,0);const reference=model.snapshot();
    for(const rate of [30,60,144]) {
      for(let tick=0;tick<rate;tick++)model.update(pose(tick/rate*TAU,{elapsedTime:tick/rate}),1/rate);
      model.update(target,1/rate);expect(model.snapshot()).toBe(reference);
    }
    model.update(target,0);expect(model.snapshot()).toBe(reference);
    for(const phase of [0,1,2,4,6]) {
      model.update(pose(phase,{flapAmplitude:0,fold:1,wingSweep:1,wingSupport:1,rollControl:1}),0);
      for(const wing of model.wings) {
        expect(Object.values(wing.shoulder.rotation).every(v=>v===0)).toBe(true);
        expect(Object.values(wing.wrist.rotation).every(v=>v===0)).toBe(true);
        expect(wing.primaries.every(p=>['x','y','z'].every(axis=>p.rotation[axis]===0)&&p.userData.vane.morphTargetInfluences[1]===0)).toBe(true);
      }
    }
  });

  it('changes wing carriage with speed and support while keeping mirrored wings balanced', () => {
    const model=make(),left=model.wings[0],right=model.wings[1];
    const glide=extra=>model.update(pose(0,{flapAmplitude:0,...extra}),0);
    glide({wingSweep:0});const broadSweep=right.wrist.rotation.y;
    glide({wingSweep:1});expect(right.wrist.rotation.y).toBeLessThan(broadSweep);
    expect(left.wrist.rotation.y).toBe(-right.wrist.rotation.y);
    expect(Math.abs(right.wrist.rotation.y-broadSweep)).toBeLessThan(.2);
    glide({wingSupport:1});
    expect(right.primaries[0].rotation.y).toBeGreaterThan(0);
    expect(right.primaries[7].rotation.y).toBeLessThan(0);
    for(let i=0;i<8;i++) {
      expect(left.primaries[i].rotation.y).toBe(-right.primaries[i].rotation.y);
      expect(left.primaries[i].rotation.z).toBe(-right.primaries[i].rotation.z);
      expect(left.primaries[i].rotation.x).toBe(right.primaries[i].rotation.x);
    }
    glide({brake:1});const flare=model.snapshot();
    glide({brake:1,wingSweep:1,wingSupport:1,rollControl:1});
    expect(model.snapshot()).toBe(flare);
  });

  it('reverses differential incidence when rolling out and relaxes it in a held bank', () => {
    const model=make(),left=model.wings[0],right=model.wings[1];
    const sample=roll=>{
      model.update(pose(0,{flapAmplitude:0,wingSweep:.4,wingSupport:.3,rollControl:roll}),0);
      return [right.shoulder.rotation.x-left.shoulder.rotation.x,
        right.wrist.rotation.x-left.wrist.rotation.x,
        right.primaries[0].rotation.x-left.primaries[0].rotation.x];
    };
    const entering=sample(.8),leaving=sample(-.8),held=sample(0);
    entering.forEach((value,i)=>{
      expect(value).toBeGreaterThan(0);expect(value).toBeLessThan(.1);
      expect(leaving[i]).toBeCloseTo(-value,12);expect(held[i]).toBe(0);
    });
  });
});
