import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {afterEach,describe,it,expect} from 'vitest';

const require=createRequire(import.meta.url),THREE=require(resolve('vendor/three-r128/three.min.js'));
const source=fs.readFileSync('stem_lab/stem_tool_renewables.js','utf8'),sceneStart=source.indexOf('function RenewablesEnergyScene(props)');
function helper(name){const start=source.indexOf(`function ${name}(`,sceneStart);if(start<0)throw Error(`Missing ${name}`);let end=source.indexOf('{',start),depth=1;while(depth&&++end<source.length){if(source[end]==='{')depth++;if(source[end]==='}')depth--;}return source.slice(start,end+1);}
const helpers=['material','mesh','box','cylinder','strut','flange','ball','pipe','ring','glow','response','cue','shape','driveMotion','particles','deformTube','rotor','generatorDetail','rotorResourceStreams','rotorPowerConnections'].map(helper).join('\n');
const branchStart=source.indexOf("var marine=id==='tidal';",sceneStart),branch=source.slice(branchStart,source.indexOf("}else if(id==='hydro'){",branchStart)),roots=[];
function fixture(id='tidal'){const f=vm.runInNewContext(`(function(){
  var id=${JSON.stringify(id)},responses={},responseSettling=false,dimensionSettling=false,streamCount=0,markerUpdaters=[],updaters=[],generatorFocus=null;
  ${helpers}
  var scene=new THREE.Scene(),context=new THREE.Group(),A=new THREE.Group(),B=new THREE.Group(),C=new THREE.Group(),referencePower=1000;scene.add(context,A,B,C);
  var load=box(C,4.6,.6,2.6,1.3,1.2,1,'#d7e8de');load.name='energy-output-load';function label(){}
  ${branch}
  function update(settings,power,dt,animate,status,cutaway){var s=Object.assign({radius:id==='tidal'?5:40,speed:id==='tidal'?2:8,rating:3000},settings),p={run:{settings:s,power:power==null?1000:power,status:status||'Generating'},dt:dt||0,animate:animate!==false,inspection:{trace:false,cutaway:!!cutaway}};updaters.forEach(function(fn){fn(p);});scene.updateMatrixWorld(true);rotorWiring.update();markerUpdaters.forEach(function(fn){fn(p);});scene.updateMatrixWorld(true);}
  function layout(exploded,isolated){[A,B,C].forEach(function(g,i){g.position.set(exploded?(i-1)*3.4:0,exploded&&i===1?.8:0,0);g.visible=isolated==null||isolated===i;});scene.updateMatrixWorld(true);rotorWiring.update();scene.updateMatrixWorld(true);}
  update({},1000,0,false);return {scene,A,B,C,hub,nacelle,blade,tower,load,wiring:rotorWiring,focus:generatorFocus,update,layout};
})()`,{THREE});roots.push(f.scene);return f;}
afterEach(()=>{for(const root of roots.splice(0))root.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});});
const marks=r=>r.group.children.filter(o=>/-marker-/.test(o.name));
const world=(r,t)=>r.group.localToWorld(r.curve.getPoint(t));
function contacts(f){for(const r of f.wiring.routes)for(const[t,port]of[[0,r.from],[1,r.to]])expect(world(r,t).distanceTo(port.getWorldPosition(new THREE.Vector3()))).toBeLessThan(1e-12);}
function clearance(body,p){const local=body.worldToLocal(p.clone()),g=body.geometry;g.computeBoundingBox();const nearest=local.clone().clamp(g.boundingBox.min,g.boundingBox.max);return body.localToWorld(nearest).distanceTo(p);}
function visible(o){for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;}

describe('Wind and tidal attached electrical output',()=>{
  it.each(['wind','tidal'])('%s joins real nacelle, cabinet and load surfaces without widening generator focus',id=>{
    const f=fixture(id),p=f.wiring.ports;contacts(f);
    for(const[key,body]of[['output',f.hub],['switchgear-input',f.wiring.switchgear],['switchgear-output',f.wiring.switchgear],['load',f.load]])expect(clearance(body,p[key].getWorldPosition(new THREE.Vector3()))).toBeLessThan(1e-7);
    expect(p.output.position.toArray()).toEqual([.52,-.30,-.47]);expect(f.wiring.switchgear.parent).toBe(f.C);expect(f.wiring.routes.every(r=>r.group.parent===f.C)).toBe(true);expect(f.focus).toBe(f.nacelle);expect(f.focus.getObjectByName('energy-rotor-switchgear')).toBeUndefined();
  });
  it.each([['wind',10],['wind',80],['tidal',2],['tidal',12]])('%s radius %i keeps cable spans clear of equipment and the spinning rotor', (id,radius)=>{
    const f=fixture(id);f.update({radius},1000,0,false);const bodies=[];for(const root of[f.B,f.C])root.traverse(o=>{if(!o.geometry||o.name.endsWith('-port'))return;for(let p=o;p&&p!==root;p=p.parent)if(p.name.endsWith('-cable'))return;bodies.push(o);});
    let minimum=Infinity;
    for(const exploded of[false,true]){f.layout(exploded);contacts(f);for(let phase=0;phase<8;phase++){f.blade.rotation.z=phase*Math.PI/4;f.scene.updateMatrixWorld(true);for(const r of f.wiring.routes){const ends=[r.from,r.to].map(p=>p.getWorldPosition(new THREE.Vector3()));for(let i=0;i<=100;i++){const point=world(r,i/100);if(ends.some(e=>e.distanceTo(point)<.17))continue;for(const body of bodies)minimum=Math.min(minimum,clearance(body,point));expect(point.y).toBeGreaterThan(.045);}}}}
    expect(minimum).toBeGreaterThan(.045);
  });
  it('keeps the upper cable attached through every intermediate tidal hub height while its floor route stays fixed',()=>{
    const f=fixture();f.update({radius:2},1000,0,false);const route=f.wiring.routes[0],lower=route.curve.points.slice(3).map(p=>p.clone()),minimum=f.nacelle.position.y;
    f.update({radius:12},1000,.02,true);expect(f.nacelle.position.y).toBeGreaterThan(minimum);expect(f.nacelle.position.y).toBeLessThan(3.7343);contacts(f);
    for(let i=0;i<100;i++){f.update({radius:12},1000,.04,true);contacts(f);lower.forEach((p,n)=>expect(route.curve.points[n+3].distanceTo(p)).toBeLessThan(1e-12));}
    expect(f.nacelle.position.y).toBeCloseTo(3.7343,10);const version=route.body.geometry.attributes.position.version;f.update({radius:12},1000,.1,true);expect(route.body.geometry.attributes.position.version).toBe(version);
  });
  it('retains tube buffers, marker phase and endpoint contact on the first paused exploded frame',()=>{
    const f=fixture();f.update({},1000,.1,true);const before=f.wiring.routes.map(r=>({geometry:r.body.geometry,position:r.body.geometry.attributes.position,normal:r.body.geometry.attributes.normal,phase:marks(r)[0].userData.progress}));
    for(const exploded of[true,false,true]){f.layout(exploded);f.update({radius:12},1000,0,false);contacts(f);f.wiring.routes.forEach((r,i)=>{expect(r.body.geometry).toBe(before[i].geometry);expect(r.body.geometry.attributes.position).toBe(before[i].position);expect(r.body.geometry.attributes.normal).toBe(before[i].normal);expect(marks(r)[0].userData.progress).toBe(before[i].phase);for(const[n,m]of marks(r).entries())expect(m.position.distanceTo(r.curve.getPointAt((m.userData.progress+n/6)%1))).toBeLessThan(1e-12);});}
  });
  it('keeps delivery forward with unchanged power throughout a signed tidal reversal',()=>{
    const f=fixture();f.update({speed:2},700,0,false);const initialRate=f.blade.userData.motionRate;f.update({speed:-2},700,.02,true);expect(f.blade.userData.motionRate).toBeGreaterThan(0);expect(f.blade.userData.motionRate).toBeLessThan(initialRate);
    for(let i=0;i<50;i++){f.update({speed:-2},700,.04,true);for(const r of f.wiring.routes){const m=marks(r)[0];expect(m.userData.power).toBe(700);expect(m.userData.worldFlowRate).toBe(.7);expect(m.userData.flowRate*5*r.curve.getLength()).toBeCloseTo(.7,12);expect(m.userData.targetFlowStrength).toBeCloseTo(700/1700,12);}}expect(f.blade.userData.motionRate).toBeLessThan(0);
  });
  it('smoothly changes both output densities while reporting exact selected power',()=>{
    const f=fixture();f.update({},50,0,false);const before=marks(f.wiring.routes[0])[0].userData.flowStrength;f.update({},2500,.02,true);
    const a=marks(f.wiring.routes[0])[0],b=marks(f.wiring.routes[1])[0];expect(a.userData.power).toBe(2500);expect(b.userData.power).toBe(2500);expect(a.userData.flowStrength).toBeGreaterThan(before);expect(a.userData.flowStrength).toBeLessThan(2500/3500);expect(a.userData.flowStrength).toBe(b.userData.flowStrength);expect(f.wiring.indicator.userData.outputPower).toBe(2500);
  });
  it.each([['wind','Below cut-in'],['wind','Protective shutdown'],['tidal','Slack water']])('stops electricity immediately while the %s drive coasts during %s', (id,status)=>{
    const f=fixture(id);f.update({},1000,.1,true);const phases=f.wiring.routes.map(r=>marks(r)[0].userData.progress),angle=f.blade.rotation.z,rate=f.blade.userData.motionRate;f.update({speed:status==='Protective shutdown'?25:0},0,.02,true,status);
    f.wiring.routes.forEach((r,i)=>{expect(r.body.visible).toBe(true);expect(marks(r).every(m=>!m.visible&&m.userData.flowRate===0)).toBe(true);expect(marks(r)[0].userData.progress).toBe(phases[i]);});expect(angle-f.blade.rotation.z).toBeCloseTo(rate*.42*(1-Math.exp(-.02/.42)),13);expect(f.blade.userData.motionRate).toBeCloseTo(rate*Math.exp(-.02/.42),13);expect(f.blade.userData.coasting).toBe(true);expect(f.wiring.indicator.material.emissiveIntensity).toBe(0);
  });
  it('retains the complete electrical route only when the generator stage is present',()=>{
    const f=fixture();for(const stage of[0,1,2]){f.layout(true,stage);for(const r of f.wiring.routes)expect(visible(r.body)).toBe(stage===2);expect(visible(f.wiring.switchgear)).toBe(stage===2);}f.layout(true);contacts(f);
  });
  it('holds electrical phase through cutaway changes while preserving the same attached terminals',()=>{
    const f=fixture();f.update({},1000,.1,true);const phases=f.wiring.routes.map(r=>marks(r)[0].userData.progress);f.update({},1000,0,false,'Generating',true);expect(f.hub.material.opacity).toBe(.14);contacts(f);f.wiring.routes.forEach((r,i)=>expect(marks(r)[0].userData.progress).toBe(phases[i]));
  });
});
