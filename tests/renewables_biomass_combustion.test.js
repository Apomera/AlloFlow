import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {afterEach,describe,it,expect} from 'vitest';

const require=createRequire(import.meta.url),THREE=require(resolve('vendor/three-r128/three.min.js'));
const source=fs.readFileSync('stem_lab/stem_tool_renewables.js','utf8'),sceneStart=source.indexOf('function RenewablesEnergyScene(props)'),roots=[];
function helper(name){const start=source.indexOf(`function ${name}(`,sceneStart);if(start<0)throw Error(`Missing ${name}`);let end=source.indexOf('{',start),depth=1;while(depth&&++end<source.length){if(source[end]==='{')depth++;if(source[end]==='}')depth--;}return source.slice(start,end+1);}
function section(first,last){const start=source.indexOf(first),end=source.indexOf(last,start);if(start<0||end<0)throw Error('Missing model section '+first);return source.slice(start,end);}
const modelCode=section('function rnNumber(','function rnSettings(')+section('var RN_ENERGY_SPECS=','function rnEnergyPathway(');
const runBio=vm.runInNewContext(`(function(){${modelCode};return function(settings){return rnEnergyRun('biomass',settings,0);};})()`);
const helpers=['material','mesh','box','cylinder','strut','ball','pipe','ring','glow','response','shape','motion','cue','particles','deformTube','valve','cabinet','waveAnnulus','runner','runnerReference','generatorDetail','steamDrivetrain','steamElectricalConnections','biomassAuger','biomassConnections','biomassCombustion','electricity'].map(helper).join('\n');
const opening="}else if(id==='biomass'){",branchStart=source.indexOf(opening,sceneStart),branchEnd=source.indexOf('}else{',branchStart),branch=source.slice(branchStart+opening.length,branchEnd);

// Exercise the full production boiler, fuel delivery, steam and generator branch
// with the exact energy model; only WebGL rendering and canvas labels are omitted.
function fixture(){
  const f=vm.runInNewContext(`(function(){
    var responses={},responseSettling=false,dimensionSettling=false,streamCount=0,markerUpdaters=[],updaters=[],generatorFocus=null,referencePower=1000/3;
    ${helpers}
    var scene=new THREE.Scene(),A=new THREE.Group(),B=new THREE.Group(),C=new THREE.Group();scene.add(A,B,C);function label(){}
    ${branch}
    [A,B,C].forEach(function(group,index){group.traverse(function(o){if(o.isMesh)o.userData.component=['resource','converter','generator'][index];});});
    function update(run,dt,animate,syncResponse,trace,selected){var p={run:run,dt:dt||0,animate:animate!==false,syncResponse:!!syncResponse,selected:selected||'converter',inspection:{trace:!!trace,cutaway:false}};updaters.forEach(function(fn){fn(p);});scene.updateMatrixWorld(true);biomassPaths.update();markerUpdaters.forEach(function(fn){fn(p);});scene.updateMatrixWorld(true);}
    function layout(exploded,isolated){[A,B,C].forEach(function(g,i){g.position.set(exploded?(i-1)*3.4:0,exploded&&i===1?.8:0,0);g.visible=isolated==null||isolated===i;});scene.updateMatrixWorld(true);biomassPaths.update();scene.updateMatrixWorld(true);}
    return {scene,A,B,C,update,layout,driver:steamRotor,drive:biomassDrive,paths:biomassPaths,boiler:boilerBody,coils:boilerCoils,combustion,responses};
  })()`,{THREE});
  f.fire=f.scene.getObjectByName('energy-biomass-fire');roots.push(f.scene);return f;
}
function visible(object){for(let p=object;p;p=p.parent)if(!p.visible)return false;return true;}
function world(object){return object.getWorldPosition(new THREE.Vector3());}
function bounds(object){return new THREE.Box3().setFromObject(object);}
function parts(f){const result=[];f.fire.traverse(o=>{if(o.isMesh)result.push(o);});return result;}
function snapshots(f){return parts(f).map(o=>({name:o.name,position:Array.from(o.geometry.attributes.position.array),matrix:Array.from(o.matrixWorld.elements)}));}
function immutable(value){Object.values(value).forEach(v=>{if(v&&typeof v==='object')immutable(v);});return Object.freeze(value);}
function target(run){return Math.min(2.2,Math.sqrt(run.available/(5000/3)));}
function completed(run,status){return {...run,status,power:0,available:0,stages:run.stages.map(stage=>({...stage,value:0}))};}

afterEach(()=>{for(const root of roots.splice(0))root.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});});

describe('Biomass combustion response in the complete steam plant',()=>{
  it('mounts five separate tapered flame pairs and seven embers on a fixed fuel bed',()=>{
    const f=fixture();f.update(runBio({}),0,false);const {flames,embers,bed}=f.combustion;
    expect(f.fire).toBe(f.combustion.group);expect(f.fire.parent).toBe(f.B);expect(world(f.fire).distanceTo(new THREE.Vector3(-.7,.43,1.2))).toBeLessThan(1e-12);
    expect(flames).toHaveLength(5);expect(embers).toHaveLength(7);expect(new Set(flames.map(x=>x.group.position.x)).size).toBe(5);expect(bed.parent).toBe(f.B);
    for(const {group,outer,core}of flames){expect(group.parent).toBe(f.fire);expect(outer.parent).toBe(group);expect(core.parent).toBe(group);expect(outer.geometry.type).toBe('BufferGeometry');expect(core.geometry.type).toBe('BufferGeometry');expect(outer.geometry.attributes.position.count).toBeGreaterThan(80);}
    expect(f.fire.scale.toArray()).toEqual([1,1,1]);
  });

  it('anchors every flame base to the ember bed through fuel changes and flutter',()=>{
    const f=fixture(),bed=bounds(f.combustion.bed);
    for(const settings of[{feed:50,heating:5},{feed:500,heating:12},{feed:2000,heating:20}])for(let i=0;i<8;i++){
      f.update(runBio(settings),.17,false);
      for(const {outer,core}of f.combustion.flames)for(const part of[outer,core]){const p=part.geometry.attributes.position,base=[];for(let k=0;k<p.count;k++)if(Math.abs(p.getY(k))<1e-10)base.push(new THREE.Vector3().fromBufferAttribute(p,k).applyMatrix4(part.matrixWorld));
        expect(base.length).toBeGreaterThan(8);for(const point of base){expect(point.y).toBeCloseTo(.43,7);expect(point.y).toBeLessThan(bed.max.y);expect(point.y).toBeGreaterThan(bed.min.y);expect(point.x).toBeGreaterThan(bed.min.x);expect(point.x).toBeLessThan(bed.max.x);expect(point.z).toBeGreaterThan(bed.min.z);expect(point.z).toBeLessThan(bed.max.z);}}
    }
  });

  it('keeps all flame vertices within the dark boiler aperture and behind the front grate at all fuel extremes',()=>{
    const f=fixture();
    for(const settings of[{feed:50,heating:5},{feed:2000,heating:5},{feed:50,heating:20},{feed:2000,heating:20}])for(let i=0;i<24;i++){
      f.update(runBio(settings),Math.PI/(12*2.3),false);
      for(const {outer,core}of f.combustion.flames)for(const part of[outer,core]){const box=bounds(part);expect(box.min.x).toBeGreaterThan(-1.425);expect(box.max.x).toBeLessThan(.025);expect(box.min.y).toBeGreaterThan(.205);expect(box.max.y).toBeLessThan(1.355);expect(box.min.z).toBeGreaterThan(1.0775);expect(box.max.z).toBeLessThan(1.4675);expect(part.userData.displayHeight).toBeLessThanOrEqual(.7992+1e-9);expect(Math.abs(part.userData.tipBend)).toBeLessThanOrEqual(.057+1e-9);}
    }
  });

  it('bends individual tapered tips independently while lower roots stay fixed',()=>{
    const f=fixture(),run=runBio({});f.update(run,0,false);const before=f.combustion.flames.map(e=>e.outer.userData.tipBend),root=f.combustion.flames.map(e=>e.outer.geometry.attributes.position.array.slice(0,33));f.update(run,.08,true);
    const changes=f.combustion.flames.map((e,i)=>e.outer.userData.tipBend-before[i]);expect(changes.every(v=>Math.abs(v)>1e-5)).toBe(true);expect(new Set(changes.map(v=>v.toFixed(6))).size).toBe(5);
    f.combustion.flames.forEach((e,i)=>expect(Array.from(e.outer.geometry.attributes.position.array.slice(0,33))).toEqual(Array.from(root[i])));
    expect(f.fire.scale.toArray()).toEqual([1,1,1]);
  });

  it('keeps bright cores shorter and narrower than their surrounding flames',()=>{
    const f=fixture();f.update(runBio({feed:2000,heating:20}),0,false);
    for(const {outer,core}of f.combustion.flames){expect(core.userData.displayHeight/outer.userData.displayHeight).toBeCloseTo(.65,12);const a=outer.geometry.attributes.position,b=core.geometry.attributes.position;expect(Math.abs(b.getX(0)/a.getX(0))).toBeCloseTo(.52,6);expect(core.material.color.getHex()).not.toBe(outer.material.color.getHex());expect(core.material.opacity).toBeGreaterThan(outer.material.opacity);}
  });

  it('uses shadow-free transparent fire surfaces without writing depth',()=>{
    const f=fixture();f.update(runBio({}),0,false);
    for(const part of parts(f)){expect(part.castShadow).toBe(false);expect(part.receiveShadow).toBe(false);if(part.name.includes('flame-')){expect(part.material.transparent).toBe(true);expect(part.material.depthWrite).toBe(false);expect(part.material.side).toBe(THREE.DoubleSide);}}
    expect(f.combustion.bed.castShadow).toBe(true);expect(f.combustion.bed.material.transparent).toBe(false);
  });

  it('winds every nondegenerate flame triangle outward throughout the bend cycle',()=>{
    const f=fixture();
    for(let phase=0;phase<8;phase++){f.update(runBio({feed:2000,heating:20}),.31,false);for(const {outer,core}of f.combustion.flames)for(const part of[outer,core]){const p=part.geometry.attributes.position,index=part.geometry.index.array,height=part.userData.displayHeight,tip=new THREE.Vector3().fromBufferAttribute(p,p.count-1),baseZ=part===core?.037:0;
      for(let k=0;k<index.length;k+=3){const a=new THREE.Vector3().fromBufferAttribute(p,index[k]),b=new THREE.Vector3().fromBufferAttribute(p,index[k+1]),c=new THREE.Vector3().fromBufferAttribute(p,index[k+2]),normal=b.clone().sub(a).cross(c.clone().sub(a));if(normal.lengthSq()<1e-18)continue;
        const center=a.clone().add(b).add(c).divideScalar(3),t=center.y/height,radial=new THREE.Vector3(center.x-tip.x*t*t,0,center.z-baseZ-(tip.z-baseZ)*t*t);expect(normal.dot(radial)).toBeGreaterThan(0);}
    }}
  });

  it('keeps seam lighting continuous and every normal finite and unit length including collapsed tips',()=>{
    const f=fixture();
    for(const settings of[{feed:0},{feed:50,heating:5},{feed:2000,heating:20}])for(let phase=0;phase<4;phase++){f.update(runBio(settings),.27,false);for(const {outer,core}of f.combustion.flames)for(const part of[outer,core]){const n=part.geometry.attributes.normal;
      for(let i=0;i<n.count;i++){const length=Math.hypot(n.getX(i),n.getY(i),n.getZ(i));expect(Number.isFinite(length)).toBe(true);expect(length).toBeCloseTo(1,6);}
      for(let row=0;row<9;row++){const a=new THREE.Vector3().fromBufferAttribute(n,row*11),b=new THREE.Vector3().fromBufferAttribute(n,row*11+10);expect(a.distanceTo(b)).toBeLessThan(1e-7);}
      for(let i=88;i<99;i++)expect(n.getY(i)).toBeGreaterThan(.5);
    }}
  });

  it.each([['feed rate',{feed:1500}],['heating value',{heating:20}]])('responds to %s using exact chemical input power',(_,settings)=>{
    const f=fixture(),base=runBio({}),changed=runBio(settings);f.update(base,0,false);const before=f.fire.userData.displayEnvelope,height=f.combustion.flames[2].outer.userData.displayHeight;
    f.update(changed,0,false);expect(changed.available).toBeGreaterThan(base.available);expect(f.fire.userData.chemicalPower).toBe(changed.available);expect(f.fire.userData.targetEnvelope).toBeCloseTo(target(changed),12);expect(f.fire.userData.displayEnvelope).toBeGreaterThan(before);expect(f.combustion.flames[2].outer.userData.displayHeight).toBeGreaterThan(height);
  });

  it.each([['boiler efficiency',{boiler:95}],['cycle efficiency',{cycle:40}]])('holds the fire steady when only %s changes downstream output',(_,settings)=>{
    const f=fixture(),base=runBio({}),changed=runBio(settings);f.update(base,0,false);const fire=snapshots(f),envelope=f.fire.userData.displayEnvelope,auger=f.paths.auger.rotor.userData.motionRate,steam=f.paths.steam.group.userData.thermalPower,rate=f.driver.userData.motionRate;
    f.update(changed,0,false);expect(changed.available).toBe(base.available);expect(snapshots(f)).toEqual(fire);expect(f.fire.userData.displayEnvelope).toBe(envelope);expect(f.paths.auger.rotor.userData.motionRate).toBe(auger);expect(f.driver.userData.motionRate).toBeGreaterThan(rate);
    if(settings.boiler)expect(f.paths.steam.group.userData.thermalPower).toBeGreaterThan(steam);else expect(f.paths.steam.group.userData.thermalPower).toBe(steam);
  });

  it('draws identical fire for equal chemical power while preserving different fuel delivery rates',()=>{
    const a=fixture(),b=fixture(),ra=runBio({feed:500,heating:12}),rb=runBio({feed:1000,heating:6});a.update(ra,.2,false);b.update(rb,.2,false);
    expect(ra.available).toBe(rb.available);expect(snapshots(a)).toEqual(snapshots(b));expect(b.paths.auger.rotor.userData.motionRate).toBeCloseTo(2*a.paths.auger.rotor.userData.motionRate,12);
  });

  it('caps the visual envelope at high fuel input while preserving exact uncapped power metadata',()=>{
    const f=fixture(),run=runBio({feed:2000,heating:20});f.update(run,0,false);expect(target(run)).toBe(2.2);expect(f.fire.userData.displayEnvelope).toBe(2.2);expect(f.fire.userData.chemicalPower).toBe(run.available);
    for(const part of parts(f))expect(part.userData.chemicalPower).toBe(run.available);
  });

  it('updates exact readings immediately while height and brightness settle smoothly',()=>{
    const f=fixture(),low=runBio({feed:50,heating:5}),high=runBio({feed:2000,heating:20});f.update(low,0,false);const start=f.fire.userData.displayEnvelope,phase=f.fire.userData.phase,poses=snapshots(f),brightness=f.combustion.flames[2].outer.material.emissiveIntensity;
    f.update(high,0,true);expect(f.fire.userData.chemicalPower).toBe(high.available);expect(f.fire.userData.targetEnvelope).toBe(2.2);expect(f.fire.userData.displayEnvelope).toBe(start);expect(snapshots(f)).toEqual(poses);expect(f.fire.userData.phase).toBe(phase);
    f.update(high,.1,true);expect(f.fire.userData.displayEnvelope).toBeCloseTo(2.2+(start-2.2)*Math.exp(-.1/.26),12);expect(f.combustion.flames[2].outer.material.emissiveIntensity).toBeGreaterThan(brightness);expect(f.fire.userData.displayEnvelope).toBeLessThan(2.2);
  });

  it('preserves the complete fire pose and ember glow while paused',()=>{
    const f=fixture(),run=runBio({});f.update(run,.37,true);const pose=snapshots(f),glows=parts(f).map(o=>o.material.emissiveIntensity),phase=f.fire.userData.phase;
    for(let i=0;i<5;i++)f.update(run,0,true);expect(snapshots(f)).toEqual(pose);expect(parts(f).map(o=>o.material.emissiveIntensity)).toEqual(glows);expect(f.fire.userData.phase).toBe(phase);
  });

  it('advances exactly one requested illustration step and then holds',()=>{
    const f=fixture(),run=runBio({});f.update(run,.15,true);const phase=f.fire.userData.phase;f.update(run,.08,false);expect(f.fire.userData.phase-phase).toBeCloseTo(.08*2.3,12);const pose=snapshots(f);f.update(run,0,false);expect(snapshots(f)).toEqual(pose);
  });

  it('snaps reduced-motion and synchronization envelopes without changing the retained phase',()=>{
    const f=fixture(),low=runBio({feed:50}),high=runBio({feed:2000,heating:20});f.update(low,.4,true);const phase=f.fire.userData.phase;
    f.update(high,0,false);expect(f.fire.userData.displayEnvelope).toBe(target(high));expect(f.fire.userData.phase).toBe(phase);
    f.update(low,0,true,true);expect(f.fire.userData.displayEnvelope).toBe(target(low));expect(f.fire.userData.phase).toBe(phase);
  });

  it('hides fire immediately at zero feed while the cold bed stays in place',()=>{
    const f=fixture();f.update(runBio({}),.31,true);const phase=f.fire.userData.phase,bed=f.combustion.bed.matrixWorld.clone();f.update(runBio({feed:0}),.2,true);
    expect(visible(f.fire)).toBe(false);expect(visible(f.combustion.bed)).toBe(true);expect(f.combustion.bed.matrixWorld.equals(bed)).toBe(true);expect(f.fire.userData.phase).toBe(phase);expect(f.fire.userData.chemicalPower).toBe(0);expect(f.fire.userData.displayEnvelope).toBe(0);expect(parts(f).every(p=>p.material.emissiveIntensity===0)).toBe(true);
  });

  it('restarts the smooth envelope from rest without resetting combustion phase',()=>{
    const f=fixture(),run=runBio({});f.update(run,.4,true);const phase=f.fire.userData.phase;f.update(runBio({feed:0}),.2,true);f.update(run,0,true);expect(f.fire.userData.displayEnvelope).toBe(0);expect(f.fire.userData.phase).toBe(phase);expect(visible(f.fire)).toBe(true);
    f.update(run,.1,true);expect(f.fire.userData.displayEnvelope).toBeCloseTo(target(run)*(1-Math.exp(-.1/.26)),12);expect(f.fire.userData.phase).toBeCloseTo(phase+.23,12);
  });

  it.each(['Sequence complete','Cycle complete','Scenario complete'])('turns off fire at %s even if a retained run still reports fuel power',status=>{
    const f=fixture(),run=runBio({});f.update(run,.3,true);const phase=f.fire.userData.phase;
    f.update({...run,status},.2,true);expect(visible(f.fire)).toBe(false);expect(f.fire.userData.chemicalPower).toBe(0);expect(f.fire.userData.displayEnvelope).toBe(0);expect(f.fire.userData.phase).toBe(phase);expect(visible(f.combustion.bed)).toBe(true);
    f.update(completed(run,status),.2,true);expect(f.fire.userData.phase).toBe(phase);expect(f.driver.userData.motionRate).toBe(0);
  });

  it('gives the same envelope, phase, flame surfaces and ember glow for equal elapsed time',()=>{
    const a=fixture(),b=fixture(),low=runBio({feed:50}),high=runBio({feed:2000,heating:20});a.update(low,0,false);b.update(low,0,false);a.update(high,.24,true);for(let i=0;i<6;i++)b.update(high,.04,true);
    expect(a.fire.userData.phase).toBeCloseTo(b.fire.userData.phase,12);expect(a.fire.userData.displayEnvelope).toBeCloseTo(b.fire.userData.displayEnvelope,12);
    const aa=parts(a),bb=parts(b);aa.forEach((part,i)=>{expect(Array.from(part.geometry.attributes.position.array)).toEqual(Array.from(bb[i].geometry.attributes.position.array));expect(part.material.emissiveIntensity).toBeCloseTo(bb[i].material.emissiveIntensity,12);});
  });

  it('matches normal and half-speed previews after the same effective illustration time',()=>{
    const a=fixture(),b=fixture(),run=runBio({});a.update(run,0,false);b.update(run,0,false);for(let i=0;i<10;i++)a.update(run,.04,true);for(let i=0;i<20;i++)b.update(run,.02,true);expect(a.fire.userData.phase).toBeCloseTo(b.fire.userData.phase,12);expect(snapshots(a)).toEqual(snapshots(b));
  });

  it('wraps the periodic phase without a discontinuity in flame shape',()=>{
    const f=fixture(),run=runBio({});f.update(run,0,false);f.update(run,(2*Math.PI-1e-5)/2.3,true);const before=parts(f).map(p=>Array.from(p.geometry.attributes.position.array));f.update(run,2e-5/2.3,true);
    expect(f.fire.userData.phase).toBeCloseTo(1e-5,10);parts(f).forEach((p,i)=>{const after=p.geometry.attributes.position.array;expect(Math.max(...after.map((v,n)=>Math.abs(v-before[i][n])))).toBeLessThan(1e-5);});
  });

  it('keeps brightness emphasis separate from fire geometry and combustion timing',()=>{
    const f=fixture(),run=runBio({});f.update(run,.24,true);const pose=snapshots(f),phase=f.fire.userData.phase,normal=f.combustion.flames[2].outer.material.emissiveIntensity;
    f.update(run,0,true,false,true,'resource');expect(snapshots(f)).toEqual(pose);expect(f.fire.userData.traceState).toBe('context');const context=f.combustion.flames[2].outer.material.emissiveIntensity;expect(context).toBeLessThan(normal);expect(parts(f).every(o=>o.userData.traceState==='context')).toBe(true);
    f.update(run,0,true,false,true,'converter');expect(snapshots(f)).toEqual(pose);expect(f.fire.userData.traceState).toBe('selected');expect(f.combustion.flames[2].outer.material.emissiveIntensity).toBeGreaterThan(normal);expect(f.fire.userData.phase).toBe(phase);
  });

  it('moves the fixed bed and attached fire together in exploded and isolated layouts',()=>{
    const f=fixture(),run=runBio({});f.update(run,.2,true);const local=f.fire.position.clone(),bed=f.combustion.bed.position.clone(),phase=f.fire.userData.phase,geometry=parts(f).map(o=>Array.from(o.geometry.attributes.position.array));f.layout(true,1);f.update(run,0,true);
    expect(f.fire.position.equals(local)).toBe(true);expect(f.combustion.bed.position.equals(bed)).toBe(true);expect(world(f.fire).y).toBeCloseTo(1.23,12);expect(visible(f.fire)).toBe(true);expect(parts(f).map(o=>Array.from(o.geometry.attributes.position.array))).toEqual(geometry);expect(f.fire.userData.phase).toBe(phase);
    f.layout(true,2);expect(visible(f.fire)).toBe(false);expect(visible(f.combustion.bed)).toBe(false);f.layout(false,null);expect(visible(f.fire)).toBe(true);expect(world(f.fire).y).toBeCloseTo(.43,12);
  });

  it('reuses all geometries, position buffers, normal buffers and indices through controls and layout changes',()=>{
    const f=fixture();f.update(runBio({}),0,false);const saved=parts(f).map(o=>({object:o,geometry:o.geometry,position:o.geometry.attributes.position,array:o.geometry.attributes.position.array,normal:o.geometry.attributes.normal,normalArray:o.geometry.attributes.normal.array,index:o.geometry.index,indexArray:o.geometry.index.array}));
    for(let i=0;i<12;i++){f.layout(i%2===0,null);f.update(runBio({feed:i%3?2000:50,heating:i%2?5:20,boiler:i%2?50:95,cycle:i%2?10:40}),.05,true);}
    for(const v of saved){expect(v.object.geometry).toBe(v.geometry);expect(v.geometry.attributes.position).toBe(v.position);expect(v.position.array).toBe(v.array);expect(v.geometry.attributes.normal).toBe(v.normal);expect(v.normal.array).toBe(v.normalArray);expect(v.geometry.index).toBe(v.index);expect(v.index.array).toBe(v.indexArray);expect(Array.from(v.position.array).every(Number.isFinite)).toBe(true);expect(Array.from(v.normal.array).every(Number.isFinite)).toBe(true);}
  });

  it('does not change the immutable energy model while animating and tracing combustion',()=>{
    const f=fixture(),run=immutable(runBio({feed:1250,heating:17,boiler:85,cycle:30})),before=JSON.stringify(run);f.update(run,0,false);for(let i=0;i<5;i++)f.update(run,.08,true,false,true,i%2?'converter':'generator');expect(JSON.stringify(run)).toBe(before);expect(run.available).toBeCloseTo(1250*17/3.6,10);expect(f.fire.userData.chemicalPower).toBe(run.available);expect(f.paths.steam.group.userData.thermalPower).toBe(run.stages[1].value);expect(f.driver.userData.outputPower).toBe(run.power);
  });
});
