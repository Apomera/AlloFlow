import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {describe,it,expect} from 'vitest';

const require=createRequire(import.meta.url),THREE=require(resolve('vendor/three-r128/three.min.js'));
const source=fs.readFileSync('stem_lab/stem_tool_renewables.js','utf8'),sceneStart=source.indexOf('function RenewablesEnergyScene(props)');
function helper(name){
  const start=source.indexOf(`function ${name}(`,sceneStart);if(start<0)throw Error(`Missing ${name}`);
  let end=source.indexOf('{',start),depth=1;while(depth&&++end<source.length){if(source[end]==='{')depth++;if(source[end]==='}')depth--;}
  return source.slice(start,end+1);
}
const helpers=['material','mesh','box','cylinder','ball','pipe','glow','response','cue','motion','particles','deformTube','ring','biomassAuger','biomassConnections'].map(helper).join('\n');
function fixture(){return vm.runInNewContext(`(function(){
  var responses={},responseSettling=false,streamCount=0,markerUpdaters=[],updaters=[];
  ${helpers}
  var scene=new THREE.Scene(),A=new THREE.Group(),B=new THREE.Group(),C=new THREE.Group();scene.add(A,B,C);
  var hopper=box(A,-3.7,.75,0,2.1,1.4,2.2,'#96815b'),boiler=box(B,-.7,1.45,0,2,2.8,2.1,'#879fa4'),turbine=new THREE.Group();turbine.position.set(2.5,1.1,.15);C.add(turbine);
  var casing=cylinder(turbine,0,0,0,.7,.7,'#80a3ab');casing.rotation.x=Math.PI/2;var base=box(C,2.5,.6,-.2,1.5,1.1,1.4,'#557f8d');
  var paths=biomassConnections(A,B,C,hopper,boiler,turbine);
  function layout(exploded,isolated){[A,B,C].forEach(function(g,i){g.position.set(exploded?(i-1)*3.4:0,exploded&&i===1?.8:0,0);g.visible=isolated==null||isolated===i;});scene.updateMatrixWorld(true);paths.update();scene.updateMatrixWorld(true);}
  function update(settings,dt,animate,status){var s=Object.assign({feed:500,heating:12,boiler:80,cycle:25},settings),fuel=s.feed*s.heating/3.6,heat=fuel*s.boiler/100,power=heat*s.cycle/100,p={run:{settings:s,available:fuel,stages:[{value:fuel},{value:heat},{value:power}],power:power,status:status||'Generating'},dt:dt||0,animate:animate!==false,inspection:{trace:false}};updaters.forEach(function(fn){fn(p);});markerUpdaters.forEach(function(fn){fn(p);});scene.updateMatrixWorld(true);return p.run;}
  layout(false);update({},0,false);return {scene,A,B,C,hopper,boiler,turbine,casing,base,paths,layout,update};
})()`,{THREE});}
const marks=r=>r.group.children.filter(o=>/-marker-/.test(o.name));
const world=(r,t)=>r.group.localToWorld(r.curve.getPoint(t));
function contacts(f){
  const auger=f.paths.auger,half=auger.group.userData.span/2;
  for(const[z,port]of[[-half,auger.from],[half,auger.to]])expect(auger.group.localToWorld(new THREE.Vector3(0,0,z)).distanceTo(port.getWorldPosition(new THREE.Vector3()))).toBeLessThan(1e-12);
  const r=f.paths.steam;for(const[t,port]of[[0,r.from],[1,r.to]])expect(world(r,t).distanceTo(port.getWorldPosition(new THREE.Vector3()))).toBeLessThan(1e-12);
}
function distanceToBody(body,p){const local=body.worldToLocal(p.clone()),g=body.geometry;if(g.type==='CylinderGeometry')return Math.hypot(Math.max(0,Math.hypot(local.x,local.z)-g.parameters.radiusTop),Math.max(0,Math.abs(local.y)-g.parameters.height/2));g.computeBoundingBox();return g.boundingBox.distanceToPoint(local);}

describe('Biomass equipment connections',()=>{
  it('joins real hopper, boiler and turbine surfaces',()=>{
    const f=fixture(),ports=f.paths.ports;contacts(f);
    for(const[key,body]of[['hopper',f.hopper],['boiler-feed',f.boiler],['boiler-steam',f.boiler],['turbine-in',f.casing]])expect(distanceToBody(body,ports[key].getWorldPosition(new THREE.Vector3()))).toBeLessThan(1e-7);
    expect(ports.hopper.position.x).toBe(1.05);expect(ports['boiler-feed'].position.x).toBe(-1);expect(ports['boiler-steam'].position.x).toBe(1);expect(ports['turbine-in'].position.y).toBe(.7);
  });
  it.each([false,true])('keeps the feed and steam spans clear of equipment in exploded=%s',exploded=>{
    const f=fixture();f.layout(exploded);contacts(f);const steam=f.paths.steam,ends=[steam.from,steam.to].map(p=>p.getWorldPosition(new THREE.Vector3()));let clear=Infinity;
    for(let i=0;i<=240;i++){const p=world(steam,i/240);if(ends.some(e=>e.distanceTo(p)<.21))continue;for(const body of[f.hopper,f.boiler,f.casing,f.base])clear=Math.min(clear,distanceToBody(body,p));}
    expect(clear).toBeGreaterThan(.10);
    const frame=f.paths.auger.group,len=frame.userData.span;
    for(let t=.25;t<.75;t+=.05){const p=frame.localToWorld(new THREE.Vector3(0,0,(t-.5)*len));expect(distanceToBody(f.hopper,p)).toBeGreaterThan(.205);expect(distanceToBody(f.boiler,p)).toBeGreaterThan(.205);}
  });
  it('builds a broad helical flight joined to the shaft and keeps its sweep inside the housing',()=>{
    const f=fixture(),a=f.paths.auger,p=a.flight.geometry.attributes.position;expect(p.count).toBe(194);expect(a.flight.geometry.index.count).toBe(576);
    for(let i=0;i<p.count;i++){const radius=Math.hypot(p.getX(i),p.getY(i));expect(radius).toBeCloseTo(i%2?.16:.045,7);expect(Math.abs(p.getZ(i))).toBeLessThanOrEqual(.5);}
    for(const angle of[0,.3,1.7,3,5.1]){a.rotor.rotation.z=angle;f.scene.updateMatrixWorld(true);for(let i=0;i<p.count;i++){const q=a.group.worldToLocal(new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(a.flight.matrixWorld));expect(Math.hypot(q.x,q.y)).toBeLessThan(.17);}}
    expect(a.cover.material.transparent).toBe(true);expect(a.cover.material.depthWrite).toBe(false);expect(a.group.children.some(o=>/-marker-/.test(o.name))).toBe(false);
  });
  it('preserves phase and every mechanical/tube buffer through first-frame paused layout changes',()=>{
    const f=fixture();f.update({},.1,true);const a=f.paths.auger,s=f.paths.steam,angle=a.rotor.rotation.z,phase=marks(s)[0].userData.progress,flight=a.flight.geometry,fp=flight.attributes.position,sg=s.body.geometry,sp=sg.attributes.position;
    for(const exploded of[true,false,true,false]){f.layout(exploded);f.update({},0,false);contacts(f);expect(a.rotor.rotation.z).toBe(angle);expect(marks(s)[0].userData.progress).toBe(phase);expect(a.flight.geometry).toBe(flight);expect(a.flight.geometry.attributes.position).toBe(fp);expect(s.body.geometry).toBe(sg);expect(s.body.geometry.attributes.position).toBe(sp);for(const[n,m]of marks(s).entries())expect(m.position.distanceTo(s.curve.getPointAt((m.userData.progress+n/6)%1))).toBeLessThan(1e-12);}
    const version=sp.version;f.paths.update();expect(sp.version).toBe(version);
  });
  it('hides the cross-stage mechanism and steam path when an endpoint is isolated away',()=>{
    const f=fixture();for(const selected of[0,1,2]){f.layout(true,selected);expect(f.paths.auger.group.visible).toBe(false);expect(f.paths.steam.group.visible).toBe(false);}f.layout(true);expect(f.paths.auger.group.visible).toBe(true);expect(f.paths.steam.group.visible).toBe(true);contacts(f);
  });
});

describe('Biomass feed and heat response',()=>{
  it.each(['heating','boiler','cycle'])('keeps auger speed independent of %s while the exact heat follows its own controls',key=>{
    const f=fixture(),before=f.paths.auger.rotor.userData.motionRate,initialHeat=f.paths.steam.group.userData.thermalPower,steam=f.paths.steam,phase=marks(steam)[0].userData.progress;
    const settings={[key]:key==='heating'?5:key==='boiler'?50:10};const run=f.update(settings,0,false);
    expect(f.paths.auger.rotor.userData.motionRate).toBe(before);expect(f.paths.auger.group.userData.massFlow).toBe(500);expect(f.paths.steam.group.userData.thermalPower).toBe(run.stages[1].value);
    if(key==='cycle')expect(run.stages[1].value).toBe(initialHeat);else expect(run.stages[1].value).toBeLessThan(initialHeat);
    const speed=.75*Math.sqrt(run.stages[1].value/(4000/3));expect(marks(steam)[0].userData.worldFlowRate).toBeCloseTo(speed,12);expect(marks(steam)[0].userData.progress).toBe(phase);
    f.update(settings,.1,false);expect((marks(steam)[0].userData.progress-phase)*steam.curve.getLength()).toBeCloseTo(speed*.1,12);
  });
  it('eases positive feed changes with continuous phase and exact selected mass flow',()=>{
    const f=fixture(),rotor=f.paths.auger.rotor;f.update({feed:50},0,false);const angle=rotor.rotation.z,rate=rotor.userData.motionRate;f.update({feed:2000},.02,true);
    expect(rotor.userData.motionRate).toBeGreaterThan(rate);expect(rotor.userData.motionRate).toBeLessThan(5.6);expect(rotor.userData.motionTarget).toBe(5.6);expect(f.paths.auger.group.userData.massFlow).toBe(2000);expect(rotor.rotation.z).toBeLessThan(angle);expect(angle-rotor.rotation.z).toBeLessThan(5.6*.02);
  });
  it('integrates the same feed transition equally at different frame rates',()=>{
    const a=fixture(),b=fixture();a.update({feed:50},0,false);b.update({feed:50},0,false);for(let i=0;i<10;i++)a.update({feed:1500},.02,true);for(let i=0;i<4;i++)b.update({feed:1500},.05,true);
    expect(a.paths.auger.rotor.rotation.z).toBeCloseTo(b.paths.auger.rotor.rotation.z,12);expect(a.paths.auger.rotor.userData.motionRate).toBeCloseTo(b.paths.auger.rotor.userData.motionRate,12);
  });
  it('stops feed, steam and glow immediately at zero feed and resumes with the same phases',()=>{
    const f=fixture();f.update({},.1,true);const angle=f.paths.auger.rotor.rotation.z,phase=marks(f.paths.steam)[0].userData.progress;f.update({feed:0},.1,true);
    expect(f.paths.auger.rotor.rotation.z).toBe(angle);expect(f.paths.auger.rotor.userData.motionRate).toBe(0);expect(f.paths.auger.group.getObjectByName('energy-biomass-feed-direction').visible).toBe(false);expect(f.paths.steam.body.material.emissiveIntensity).toBe(0);expect(marks(f.paths.steam).every(m=>!m.visible&&m.userData.flowRate===0)).toBe(true);
    f.update({},0,false);expect(f.paths.auger.rotor.rotation.z).toBe(angle);expect(marks(f.paths.steam)[0].userData.progress).toBe(phase);
  });
  it('holds a paused screw under control changes and advances only when explicitly stepped',()=>{
    const f=fixture();f.update({},.1,true);const r=f.paths.auger.rotor,angle=r.rotation.z;f.update({feed:1000},0,false);expect(r.rotation.z).toBe(angle);expect(r.userData.motionRate).toBe(2.8);f.update({feed:1000},.1,false);expect(angle-r.rotation.z).toBeCloseTo(.28,12);
  });
  it('stops the mechanical delivery cue on completed scenarios',()=>{
    const f=fixture();f.update({},.1,true);const r=f.paths.auger.rotor,angle=r.rotation.z;f.update({},.1,true,'Scenario complete');expect(r.rotation.z).toBe(angle);expect(r.userData.motionRate).toBe(0);
  });
});
