import fs from 'node:fs';
import vm from 'node:vm';
import {describe,it,expect} from 'vitest';

// Exercise the scene's signed drive directly, independently of GPU frame timing.
const source=fs.readFileSync('stem_lab/stem_tool_renewables.js','utf8');
const start=source.indexOf('var responses={}',source.indexOf('function RenewablesEnergyScene(props)'));
const end=source.indexOf('function particles(',start);
if(start<0||end<0||!source.slice(start,end).includes('function driveMotion('))throw new Error('Renewables signed drive helper was not found');
function createDrive(){
  return vm.runInNewContext(`(function(){${source.slice(start,end)}return driveMotion;})()`);
}
const playing=dt=>({dt,animate:true,syncResponse:false});
const shaft=()=>({rotation:{z:1.234},userData:{}});

function reversal(parts){
  const drive=createDrive(),object=shaft();drive(object,'drive',.8,playing(0));
  for(const dt of parts)drive(object,'drive',-.8,playing(dt));
  return {angle:object.rotation.z,rate:object.userData.motionRate};
}

describe('Renewables signed mechanical drive',()=>{
  it.each([.8,-.8])('starts at the selected signed operating rate %s without inventing startup',target=>{
    const drive=createDrive(),object=shaft(),initial=object.rotation.z;
    drive(object,'drive',target,playing(0));
    expect(object.rotation.z).toBe(initial);
    expect(object.userData.motionRate).toBe(target);
    expect(object.userData.motionTarget).toBe(target);
    drive(object,'drive',target,playing(.1));
    expect(initial-object.rotation.z).toBeCloseTo(target*.1,14);
  });

  it.each([10,15,30,60,120])('preserves reversal angle and rate at %i FPS',fps=>{
    const whole=reversal([1.8]),frames=reversal(Array.from({length:fps*1.8},()=>1/fps));
    expect(frames.angle).toBeCloseTo(whole.angle,12);
    expect(frames.rate).toBeCloseTo(whole.rate,12);
  });

  it('preserves reversal travel with irregular frame lengths',()=>{
    const parts=[.001,.099,.02,.08,.037,.063,.1,.1,.11,.09,.05,.07,.08];
    const whole=reversal([parts.reduce((total,dt)=>total+dt,0)]),frames=reversal(parts);
    expect(frames.angle).toBeCloseTo(whole.angle,13);
    expect(frames.rate).toBeCloseTo(whole.rate,13);
  });

  it.each([1,-1])('decelerates through a reversal from direction %s without a phase jump',direction=>{
    const drive=createDrive(),object=shaft();drive(object,'drive',direction*.8,playing(0));
    const initial=object.rotation.z;
    drive(object,'drive',-direction*.8,playing(0));
    expect(object.rotation.z).toBe(initial);
    expect(object.userData.motionRate).toBe(direction*.8);
    expect(object.userData.motionTarget).toBe(-direction*.8);
    drive(object,'drive',-direction*.8,playing(.04));
    expect(direction*object.userData.motionRate).toBeGreaterThan(0);
    expect(direction*object.userData.motionRate).toBeLessThan(.8);
    expect(direction*(initial-object.rotation.z)).toBeGreaterThan(0);
    let previous=direction*object.userData.motionRate;
    for(let index=0;index<80;index++){
      drive(object,'drive',-direction*.8,playing(.02));
      const next=direction*object.userData.motionRate;
      expect(next).toBeLessThan(previous);expect(next).toBeGreaterThan(-.8);previous=next;
    }
    expect(previous).toBeLessThan(-.75);
  });

  it('retargets an unfinished reversal from its current signed rate and pose',()=>{
    const drive=createDrive(),object=shaft();drive(object,'drive',.8,playing(0));
    drive(object,'drive',-.8,playing(.4));
    const first={angle:object.rotation.z,rate:object.userData.motionRate};
    expect(first.rate).toBeLessThan(0);
    drive(object,'drive',1.2,playing(0));
    expect(object.rotation.z).toBe(first.angle);expect(object.userData.motionRate).toBe(first.rate);
    drive(object,'drive',1.2,playing(.02));
    expect(object.userData.motionRate).toBeGreaterThan(first.rate);
    expect(object.userData.motionRate).toBeLessThan(1.2);
    for(let index=0;index<150;index++)drive(object,'drive',1.2,playing(.02));
    expect(object.userData.motionRate).toBeCloseTo(1.2,2);
  });

  it('stops immediately at exact zero, including midway through a reversal',()=>{
    const drive=createDrive(),object=shaft();drive(object,'drive',.8,playing(0));
    drive(object,'drive',-.8,playing(.1));const before=object.rotation.z;
    drive(object,'drive',0,playing(.12));
    expect(object.rotation.z).toBe(before);expect(object.userData.motionRate).toBe(0);expect(object.userData.motionTarget).toBe(0);
    drive(object,'drive',-.8,playing(.01));
    expect(object.userData.motionRate).toBeLessThan(0);expect(object.userData.motionRate).toBeGreaterThan(-.1);
    expect(object.rotation.z).toBeGreaterThan(before);
  });

  it.each(['paused','reduced'])('%s controls snap the signed rate while holding the phase',()=>{
    const drive=createDrive(),object=shaft();drive(object,'drive',.8,playing(.1));const before=object.rotation.z;
    drive(object,'drive',-.6,{dt:0,animate:false,syncResponse:false});
    expect(object.rotation.z).toBe(before);expect(object.userData.motionRate).toBe(-.6);
    drive(object,'drive',-.6,playing(.1));
    expect(object.rotation.z-before).toBeCloseTo(.06,14);
  });

  it('advances an explicit paused step by exactly 0.1 visual seconds at the selected rate',()=>{
    const drive=createDrive(),object=shaft();drive(object,'drive',.8,playing(.1));const before=object.rotation.z;
    drive(object,'drive',-.6,{dt:.1,animate:false,syncResponse:false});
    expect(object.userData.motionRate).toBe(-.6);expect(object.rotation.z-before).toBeCloseTo(.06,14);
    const stopped=object.rotation.z;drive(object,'drive',0,{dt:.1,animate:false,syncResponse:false});
    expect(object.rotation.z).toBe(stopped);
  });

  it('synchronizes the drive on a selected timeline reading',()=>{
    const drive=createDrive(),object=shaft();drive(object,'drive',.8,playing(.1));const before=object.rotation.z;
    drive(object,'drive',-.6,{dt:.1,animate:true,syncResponse:true});
    expect(object.userData.motionRate).toBe(-.6);expect(object.rotation.z-before).toBeCloseTo(.06,14);
  });

  it('keeps independently named mechanical drives separate',()=>{
    const drive=createDrive(),a=shaft(),b=shaft();drive(a,'a',.8,playing(0));drive(b,'b',-.3,playing(0));
    drive(a,'a',-.8,playing(.1));drive(b,'b',-.3,playing(.1));
    expect(a.userData.motionRate).toBeGreaterThan(0);expect(b.userData.motionRate).toBe(-.3);
    expect(1.234-b.rotation.z).toBeCloseTo(-.03,14);
  });
});
