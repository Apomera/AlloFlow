import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {afterEach,describe,it,expect} from 'vitest';

const require=createRequire(import.meta.url),THREE=require(path.resolve('vendor/three-r128/three.min.js'));
const source=fs.readFileSync('stem_lab/stem_tool_renewables.js','utf8'),sceneStart=source.indexOf('function RenewablesEnergyScene(props)');
function section(first,last,from=sceneStart){
  const start=source.indexOf(first,from),end=source.indexOf(last,start);
  if(start<0||end<0)throw new Error('Missing storage response helper: '+first);
  return source.slice(start,end);
}
const code=[section('function material(','function strut('),section('function glow(','function particles('),section('function storageTransferIndicator(','function storageConnections(')].join('\n');
const modelCode=section('function rnNumber(','function rnSettings(',0)+section('var RN_ENERGY_SPECS=','function rnEnergyPathway(',0);
const runStorage=vm.runInNewContext(`(function(){${modelCode};return function(settings,minute){return rnEnergyRun('storage',settings,minute);};})()`);
const roots=[];
function fixture({x=-1.5,count=1}={}){
  const parent=new THREE.Group(),updaters=[];roots.push(parent);
  const create=vm.runInNewContext(`(function(){${code};return storageTransferIndicator;})()`,{THREE,updaters});
  const groups=Array.from({length:count},(_,index)=>create(parent,x+index*1.05,index)),group=groups[0];
  const marks=group.children.filter(object=>object.name.includes('-marker-'));
  function update(run,{dt=0,animate=true,syncResponse=false}={}){
    updaters.forEach(update=>update({run,dt,animate,syncResponse}));parent.updateMatrixWorld(true);return group.userData;
  }
  return {parent,group,groups,marks,update};
}
function bounds(object){return new THREE.Box3().setFromObject(object);}
function freeze(object){Object.values(object).forEach(value=>{if(value&&typeof value==='object')freeze(value);});return Object.freeze(object);}
afterEach(()=>{for(const root of roots.splice(0))root.traverse(object=>{if(object.geometry)object.geometry.dispose();if(object.material)object.material.dispose();});});

describe('Renewables storage transfer response',()=>{
  it.each([[30,'charging',-1,Math.PI],[60,'discharging',1,0]])('shows actual accepted or delivered power at minute %s', (minute,mode,direction,rotation)=>{
    const {group,marks,update}=fixture(),run=runStorage({},minute);
    update(run,{dt:.2});
    expect(group.userData.mode).toBe(mode);expect(group.userData.transferPower).toBe(50);
    expect(group.userData.phase).toBeCloseTo(direction<0?.88:.12,14);
    expect(group.userData.strength).toBe(.5);
    for(const mark of marks){expect(mark.visible).toBe(true);expect(mark.rotation.z).toBe(rotation);}
    const expected=new THREE.Color(mode==='charging'?'#76e7bd':'#f1cf75').convertSRGBToLinear();
    expect(marks[0].material.color.equals(expected)).toBe(true);
  });

  it('reverses the transfer direction without restarting the marker phase',()=>{
    const {group,marks,update}=fixture();update(runStorage({},30),{dt:.2});
    const phase=group.userData.phase,positions=marks.map(mark=>mark.position.clone());
    update(runStorage({},60));
    expect(group.userData.phase).toBe(phase);expect(group.userData.mode).toBe('discharging');
    marks.forEach((mark,index)=>{expect(mark.position.equals(positions[index])).toBe(true);expect(mark.rotation.z).toBe(0);});
    update(runStorage({},60),{dt:.1});expect(group.userData.phase).toBeCloseTo(phase+.06,14);
  });

  it.each([
    ['full',{initial:100},0],['depleted',{capacity:10,power:200},100],
    ['zero requested power',{power:0},30],['completed cycle',{},120]
  ])('stops immediately when the real model is %s',(_label,settings,minute)=>{
    const {group,marks,update}=fixture();update(runStorage({},30),{dt:.2});const phase=group.userData.phase;
    const run=runStorage(settings,minute);expect(run.available+run.power).toBe(0);
    update(run,{dt:.1});
    expect(group.userData.phase).toBe(phase);expect(group.userData.strength).toBe(0);
    expect(group.userData.transferPower).toBe(0);expect(group.userData.mode).toBe('idle');
    marks.forEach(mark=>expect(mark.visible).toBe(false));
  });

  it.each(['Sequence complete','Cycle complete','Scenario complete'])('suppresses stale power after %s',status=>{
    const {group,marks,update}=fixture();update(runStorage({},30),{dt:.2});const phase=group.userData.phase;
    update({...runStorage({},30),status},{dt:1});
    expect(group.userData.phase).toBe(phase);expect(group.userData.transferPower).toBe(0);expect(group.userData.strength).toBe(0);
    marks.forEach(mark=>expect(mark.visible).toBe(false));
  });

  it('holds phase while paused and advances precisely one explicit manual step',()=>{
    const {group,marks,update}=fixture();update(runStorage({power:20},60),{dt:.2});
    const phase=group.userData.phase,positions=marks.map(mark=>mark.position.clone());
    update(runStorage({power:150},60),{animate:false});
    expect(group.userData.phase).toBe(phase);expect(group.userData.strength).toBe(.75);
    marks.forEach((mark,index)=>expect(mark.position.equals(positions[index])).toBe(true));
    update(runStorage({power:150},60),{animate:false,dt:.1});expect(group.userData.phase).toBeCloseTo(phase+.06,14);
    const stepped=group.userData.phase;update(runStorage({power:0},60),{animate:false,dt:.1});expect(group.userData.phase).toBe(stepped);
  });

  it('eases positive power strength while keeping the actual transfer reading exact',()=>{
    const {group,update}=fixture(),low=runStorage({power:20},60),high=runStorage({power:150},60);
    update(low);const initial=group.userData.strength;expect(initial).toBeCloseTo(20/70,14);
    update(high);expect(group.userData.strength).toBe(initial);expect(group.userData.transferPower).toBe(150);
    let previous=initial;
    for(let frame=0;frame<20;frame++){update(high,{dt:.02});expect(group.userData.strength).toBeGreaterThan(previous);expect(group.userData.strength).toBeLessThan(.75);previous=group.userData.strength;}
    expect(group.userData.strength).toBeCloseTo(.75+(initial-.75)*Math.exp(-.4/.26),13);
    update(low,{dt:.02});expect(group.userData.strength).toBeLessThan(previous);expect(group.userData.strength).toBeGreaterThan(initial);
    update(runStorage({power:0},60),{dt:.02});expect(group.userData.strength).toBe(0);
  });

  it.each([10,15,30,60,120])('preserves elapsed-time response at %s frames per second',fps=>{
    const single=fixture(),partitioned=fixture(),low=runStorage({power:20},60),high=runStorage({power:150},60);
    single.update(low);partitioned.update(low);single.update(high,{dt:.8});
    for(let frame=0;frame<fps*.8;frame++)partitioned.update(high,{dt:1/fps});
    expect(partitioned.group.userData.phase).toBeCloseTo(single.group.userData.phase,12);
    expect(partitioned.group.userData.strength).toBeCloseTo(single.group.userData.strength,12);
    partitioned.marks.forEach((mark,index)=>expect(mark.position.distanceTo(single.marks[index].position)).toBeLessThan(1e-11));
  });

  it('fades markers to transparent at the wrapped stroke ends',()=>{
    const {marks,update}=fixture(),run=runStorage({},60);update(run);
    expect(marks[0].material.opacity).toBe(0);expect(marks[1].material.opacity).toBeCloseTo(.675,14);
    update(run,{dt:.06/.6});expect(marks[0].material.opacity).toBeCloseTo(.675*.5,13);
    update(run,{dt:(.999-.06)/.6});const before=marks[0].position.y;
    expect(marks[0].material.opacity).toBeLessThan(.006);
    update(run,{dt:.002/.6});
    expect(before-marks[0].position.y).toBeGreaterThan(1.7);expect(marks[0].material.opacity).toBeLessThan(.006);
    expect(marks[1].material.opacity).toBeCloseTo(.675,13);
  });

  it('seats the backing flush on the rack and keeps chevrons clear of its front throughout travel',()=>{
    const x=-1.5,{group,marks,update}=fixture({x}),plate=group.children.find(object=>object.geometry.type==='BoxGeometry');
    update(runStorage({},60));const backing=bounds(plate);
    expect(backing.min.z).toBeCloseTo(.65,7);expect(backing.max.z).toBeCloseTo(.71,7);expect(backing.max.x).toBeCloseTo(x+.43,7);
    for(const minute of [30,60])for(let frame=0;frame<90;frame++){
      update(runStorage({},minute),{dt:1/30});
      for(const mark of marks){const b=bounds(mark);expect(b.min.z-backing.max.z).toBeGreaterThan(.0074);expect(b.min.y).toBeGreaterThan(backing.min.y);expect(b.max.y).toBeLessThan(backing.max.y);expect(b.min.x).toBeGreaterThan(backing.min.x);expect(b.max.x).toBeLessThan(backing.max.x);}
    }
  });

  it('keeps all three rack indicators synchronized without sharing geometry',()=>{
    const {groups,update}=fixture({count:3});update(runStorage({},30),{dt:.3});
    for(let index=0;index<3;index++){
      expect(groups[index].name).toBe('energy-storage-transfer-'+index);
      expect(groups[index].userData.phase).toBe(groups[0].userData.phase);expect(groups[index].userData.strength).toBe(groups[0].userData.strength);
      const mark=groups[index].getObjectByName('energy-storage-transfer-'+index+'-marker-0');
      expect(mark.position.x).toBeCloseTo(-1.5+index*1.05+.38,14);
      if(index>0)expect(mark.geometry).not.toBe(groups[0].getObjectByName('energy-storage-transfer-0-marker-0').geometry);
    }
  });

  it('never changes the exact selected-minute energy balance or reallocates geometry during animation',()=>{
    const {parent,update}=fixture(),run=freeze(runStorage({capacity:180,power:75,initial:35,roundtrip:82},78.25));
    const exact=JSON.stringify(run),saved=[];
    parent.traverse(object=>{if(object.geometry)saved.push({object,geometry:object.geometry,position:object.geometry.attributes.position,normal:object.geometry.attributes.normal,index:object.geometry.index,material:object.material});});
    for(let frame=0;frame<180;frame++)update(run,{dt:1/60});
    expect(JSON.stringify(run)).toBe(exact);expect(run.extra.minute).toBe(78.25);
    for(const entry of saved){expect(entry.object.geometry).toBe(entry.geometry);expect(entry.geometry.attributes.position).toBe(entry.position);expect(entry.geometry.attributes.normal).toBe(entry.normal);expect(entry.geometry.index).toBe(entry.index);expect(entry.object.material).toBe(entry.material);}
  });
});
