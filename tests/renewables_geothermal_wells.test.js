import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {afterEach,describe,it,expect} from 'vitest';
const require=createRequire(import.meta.url),THREE=require(resolve('vendor/three-r128/three.min.js'));
const source=fs.readFileSync('stem_lab/stem_tool_renewables.js','utf8'),sceneStart=source.indexOf('function RenewablesEnergyScene(props)');
function helper(name){const start=source.indexOf(`function ${name}(`,sceneStart);if(start<0)throw Error(`Missing ${name}`);let end=source.indexOf('{',start),depth=1;while(depth&&++end<source.length){if(source[end]==='{')depth++;if(source[end]==='}')depth--;}return source.slice(start,end+1);}
const helpers=['material','mesh','box','cylinder','strut','valve','ball','pipe','ring','glow','response','cue','particles','deformTube','waveAnnulus','geothermalWells','geothermalCircuit'].map(helper).join('\n'),roots=[];
function fixture(){const f=vm.runInNewContext(`(function(){
  var responses={},responseSettling=false,streamCount=0,markerUpdaters=[],updaters=[];${helpers}
  var scene=new THREE.Scene(),A=new THREE.Group(),B=new THREE.Group(),C=new THREE.Group();scene.add(A,B,C);
  var geology=[box(A,-2.5,.7,0,5,1.4,4.5,'#aa6249'),box(A,-2.5,1.6,0,5,.35,4.5,'#75634c'),box(A,-2.5,2,0,5,.35,4.5,'#568371')];
  var exchanger=cylinder(B,.5,1.6,0,.7,2,'#d4a465'),wells=geothermalWells(A,B,exchanger),turbine=new THREE.Group();turbine.position.set(2.4,1.5,.35);C.add(turbine);var casing=cylinder(turbine,0,0,0,.68,.7,'#86a6ad');casing.rotation.x=Math.PI/2;
  var base=box(C,2.4,.7,0,1,1.3,1.4,'#688c99'),condenser=cylinder(C,3.9,.9,-2,.65,1.7,'#afc7c6'),load=box(C,4.6,.6,2.6,1.3,1.2,1,'#d7e8de'),secondary=geothermalCircuit(B,C,exchanger,turbine,condenser);
  function layout(exploded,isolated){[A,B,C].forEach(function(g,i){g.position.set(exploded?(i-1)*3.4:0,exploded&&i===1?.8:0,0);g.visible=isolated==null||isolated===i;});scene.updateMatrixWorld(true);wells.update();secondary.update();scene.updateMatrixWorld(true);}
  function update(settings,dt,animate){var s=Object.assign({flow:40,hot:180,returnTemp:70,utilization:40},settings),heat=s.flow*4.18*Math.max(0,s.hot-s.returnTemp),power=heat*(1-298.15/(s.hot+273.15))*s.utilization/100,p={run:{settings:s,available:heat,power:power,status:'Generating'},dt:dt||0,animate:animate!==false,inspection:{trace:false}};updaters.forEach(function(fn){fn(p);});scene.updateMatrixWorld(true);wells.update();secondary.update();markerUpdaters.forEach(function(fn){fn(p);});scene.updateMatrixWorld(true);return p.run;}
  layout(false);update({},0,false);return {scene,A,B,C,geology,exchanger,casing,base,condenser,load,wells,secondary,layout,update};
})()`,{THREE});roots.push(f.scene);return f;}
afterEach(()=>{for(const root of roots.splice(0))root.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});});
const marks=r=>r.group.children.filter(o=>/-marker-/.test(o.name));
const world=(r,t)=>r.group.localToWorld(r.curve.getPoint(t));
function contacts(f){for(const r of f.wells.routes)for(const[t,port]of[[0,r.from],[1,r.to]])expect(world(r,t).distanceTo(port.getWorldPosition(new THREE.Vector3()))).toBeLessThan(1e-12);}
function clearance(body,point){const p=body.worldToLocal(point.clone()),g=body.geometry;if(g.type==='CylinderGeometry')return Math.hypot(Math.max(0,Math.hypot(p.x,p.z)-g.parameters.radiusTop),Math.max(0,Math.abs(p.y)-g.parameters.height/2));g.computeBoundingBox();return g.boundingBox.distanceToPoint(p);}

describe('Connected geothermal primary wells',()=>{
  it('joins four routes in production-up/exchanger/reinjection-down order on real exchanger surfaces',()=>{
    const f=fixture(),p=f.wells.ports,[up,hot,cool,down]=f.wells.routes;contacts(f);
    expect(up.from).toBe(p['production-bottom']);expect(up.to).toBe(hot.from);expect(hot.to).toBe(p['primary-in']);expect(cool.from).toBe(p['primary-out']);expect(cool.to).toBe(down.from);expect(down.to).toBe(p['reinjection-bottom']);
    for(const key of['primary-in','primary-out'])expect(clearance(f.exchanger,p[key].getWorldPosition(new THREE.Vector3()))).toBeLessThan(1e-12);
    expect(up.curve.getTangentAt(.5).y).toBeGreaterThan(.99);expect(down.curve.getTangentAt(.5).y).toBeLessThan(-.99);
  });
  it.each([false,true])('keeps primary spans outside geology/equipment and separate from each other and the secondary loop, exploded=%s',exploded=>{
    const f=fixture();f.layout(exploded);contacts(f);const primary=f.wells.routes.map(r=>Array.from({length:181},(_,i)=>world(r,i/180))),secondary=f.secondary.routes.map(r=>Array.from({length:181},(_,i)=>world(r,i/180)));
    for(const [index,r]of f.wells.routes.entries()){const ends=[r.from,r.to].map(p=>p.getWorldPosition(new THREE.Vector3()));let minimum=Infinity;for(const p of primary[index]){if(ends.some(e=>e.distanceTo(p)<.20))continue;for(const body of[...f.geology,f.exchanger,f.casing,f.base,f.condenser,f.load])minimum=Math.min(minimum,clearance(body,p));}expect(minimum,`${r.group.name} equipment clearance`).toBeGreaterThan(.12);}
    for(let i=0;i<primary.length;i++)for(let j=i+1;j<primary.length;j++){let minimum=Infinity;const a=f.wells.routes[i],b=f.wells.routes[j],shared=[a.from,a.to].find(p=>p===b.from||p===b.to),joint=shared?.getWorldPosition(new THREE.Vector3());for(const p of primary[i])for(const q of primary[j]){if(joint&&(p.distanceTo(joint)<.35||q.distanceTo(joint)<.35))continue;minimum=Math.min(minimum,p.distanceTo(q));}expect(minimum,`Primary routes ${i}/${j}`).toBeGreaterThan(.24);}
    for(const a of primary)for(const b of secondary){let minimum=Infinity;for(const p of a)for(const q of b)minimum=Math.min(minimum,p.distanceTo(q));expect(minimum,'Primary vs secondary separation').toBeGreaterThan(.19);}
  });
  it('retains local well risers while hiding only disconnected exchanger links in resource isolation',()=>{
    const f=fixture();for(const stage of[0,1,2]){f.layout(true,stage);for(const r of f.wells.routes)expect(r.group.visible).toBe(stage===0&&!r.cross);}f.layout(true);expect(f.wells.routes.every(r=>r.group.visible)).toBe(true);contacts(f);
  });
  it('keeps the exchanger links clear of both forward valve handwheels and temperature gauges',()=>{
    const f=fixture(),hardware=[];for(const key of['production','reinjection'])for(const suffix of['well-valve','temperature-gauge'])f.scene.getObjectByName('energy-geothermal-'+key+'-'+suffix).traverse(o=>{if(o.geometry)hardware.push(o);});
    for(const exploded of[false,true]){f.layout(exploded);let minimum=Infinity;for(const r of f.wells.routes.filter(r=>r.cross))for(let i=0;i<=240;i++){const p=world(r,i/240);for(const body of hardware)minimum=Math.min(minimum,clearance(body,p));}expect(minimum).toBeGreaterThan(.12);}
  });
  it('preserves geometry, buffers and every stream phase on the first paused exploded frame',()=>{
    const f=fixture();f.update({},.1,true);const saved=f.wells.routes.map(r=>({geometry:r.body.geometry,position:r.body.geometry.attributes.position,normal:r.body.geometry.attributes.normal,phase:marks(r)[0].userData.progress}));
    for(const exploded of[true,false,true]){f.layout(exploded);f.update({},0,false);contacts(f);f.wells.routes.forEach((r,i)=>{expect(r.body.geometry).toBe(saved[i].geometry);expect(r.body.geometry.attributes.position).toBe(saved[i].position);expect(r.body.geometry.attributes.normal).toBe(saved[i].normal);expect(marks(r)[0].userData.progress).toBe(saved[i].phase);for(const[n,m]of marks(r).entries())expect(m.position.distanceTo(r.curve.getPointAt((m.userData.progress+n/6)%1))).toBeLessThan(1e-12);});}
    const versions=f.wells.routes.map(r=>r.body.geometry.attributes.position.version);f.wells.update();f.wells.routes.forEach((r,i)=>expect(r.body.geometry.attributes.position.version).toBe(versions[i]));
  });
});

describe('Primary flow and prescribed temperature response',()=>{
  it.each([5,40,100])('gives all four equal-diameter pipes the same illustrated world speed at flow %i',flow=>{
    const f=fixture();for(const exploded of[false,true]){f.layout(exploded);f.update({flow},0,false);for(const r of f.wells.routes){expect(marks(r)[0].userData.flowRate*5*r.curve.getLength()).toBeCloseTo(.012*flow,12);expect(marks(r)[0].userData.worldFlowRate).toBeCloseTo(.012*flow,12);expect(r.group.userData.massFlow).toBe(flow);}}
  });
  it('eases flow in world distance consistently across pipes of different lengths',()=>{
    const f=fixture();f.update({flow:5},0,false);f.update({flow:100},.02,true);const speeds=f.wells.routes.map(r=>marks(r)[0].userData.flowRate*5*r.curve.getLength());speeds.forEach(speed=>{expect(speed).toBeGreaterThan(.06);expect(speed).toBeLessThan(1.2);expect(speed).toBeCloseTo(speeds[0],12);});
  });
  it('advances actual distance at the selected rate without a surge on animated layout changes',()=>{
    const f=fixture();for(const exploded of[false,true,false,true]){f.layout(exploded);const phase=f.wells.routes.map(r=>marks(r)[0].userData.progress);f.update({flow:40},.05,true);f.wells.routes.forEach((r,i)=>{const m=marks(r)[0],travel=((m.userData.progress-phase[i]+1)%1)*r.curve.getLength();expect(travel).toBeCloseTo(.012*40*.05,12);expect(m.userData.worldFlowRate).toBe(.48);});}
  });
  it('keeps equal integrated travel across different pipe lengths while flow is changing',()=>{
    const f=fixture();f.update({flow:5},0,false);for(const exploded of[true,false,true]){f.layout(exploded);const phase=f.wells.routes.map(r=>marks(r)[0].userData.progress);f.update({flow:100},.05,true);const travel=f.wells.routes.map((r,i)=>((marks(r)[0].userData.progress-phase[i]+1)%1)*r.curve.getLength());travel.forEach(t=>expect(t).toBeCloseTo(travel[0],12));expect(travel[0]).toBeGreaterThan(.06*.05);expect(travel[0]).toBeLessThan(1.2*.05);}
  });
  it.each([[100,100],[75,100]])('continues primary circulation at hot %i / return %i while useful heat and secondary flow stop', (hot,returnTemp)=>{
    const f=fixture(),run=f.update({hot,returnTemp},.1,true);expect(run.available).toBe(0);expect(run.power).toBe(0);for(const r of f.wells.routes)expect(marks(r)[0].userData.flowRate).toBeGreaterThan(0);for(const r of f.secondary.routes)expect(marks(r).every(m=>!m.visible)).toBe(true);
  });
  it('uses the same color and needle scale for both streams, including a warmer selected return',()=>{
    const f=fixture();f.update({hot:100,returnTemp:100},0,false);const [hot,returned]=[f.wells.routes[0],f.wells.routes[3]],gauges=f.wells.gauges;expect(hot.body.material.color.equals(returned.body.material.color)).toBe(true);expect(gauges[0].needle.rotation.z).toBe(gauges[1].needle.rotation.z);
    f.update({hot:75,returnTemp:100},0,false);expect(hot.body.material.color.r).toBeLessThan(returned.body.material.color.r);expect(gauges[0].needle.rotation.z).toBeGreaterThan(gauges[1].needle.rotation.z);expect(hot.group.userData.temperature).toBe(75);expect(returned.group.userData.temperature).toBe(100);
  });
  it('eases each temperature independently without changing circulation, and freezes temperature appearance across flow/utilization edits',()=>{
    const f=fixture(),a=f.wells.routes[0],b=f.wells.routes[3],rate=marks(a)[0].userData.flowRate,color=b.body.material.color.clone();f.update({hot:300},.03,true);expect(a.group.userData.temperature).toBe(300);expect(a.group.userData.displayTemperature).toBeGreaterThan(180);expect(a.group.userData.displayTemperature).toBeLessThan(300);expect(b.body.material.color.equals(color)).toBe(true);expect(marks(a)[0].userData.flowRate).toBe(rate);
    f.update({hot:300},0,false);const angles=f.wells.gauges.map(g=>g.needle.rotation.z),colors=f.wells.routes.map(r=>r.body.material.color.clone());f.update({hot:300,flow:5,utilization:55},.05,true);f.wells.gauges.forEach((g,i)=>expect(g.needle.rotation.z).toBe(angles[i]));f.wells.routes.forEach((r,i)=>expect(r.body.material.color.equals(colors[i])).toBe(true));
  });
  it('stops flow immediately at zero while retaining pipes and prescribed-temperature gauges',()=>{
    const f=fixture();f.update({},.1,true);const phases=f.wells.routes.map(r=>marks(r)[0].userData.progress),angles=f.wells.gauges.map(g=>g.needle.rotation.z);f.update({flow:0},.02,true);f.wells.routes.forEach((r,i)=>{expect(r.group.visible).toBe(true);expect(r.body.material.transparent).toBe(true);expect(r.body.material.opacity).toBeGreaterThan(0);expect(r.body.material.opacity).toBeLessThan(.7);expect(r.body.material.depthWrite).toBe(false);expect(marks(r).every(m=>!m.visible&&m.userData.flowRate===0)).toBe(true);expect(marks(r)[0].userData.progress).toBe(phases[i]);});f.wells.gauges.forEach((g,i)=>expect(g.needle.rotation.z).toBe(angles[i]));
  });
  it('keeps gauges rigid on their stems and all needles inside their faces over the full selected scale',()=>{
    const f=fixture();for(const temperature of[40,75,100,180,300]){f.update({hot:temperature,returnTemp:temperature},0,false);for(const g of f.wells.gauges){expect(g.group.userData.scaleMinimum).toBe(40);expect(g.group.userData.scaleMaximum).toBe(300);expect(g.needle.rotation.z).toBeCloseTo((135-270*(temperature-40)/260)*Math.PI/180,12);g.needle.traverse(o=>{if(!o.geometry)return;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){const point=g.group.worldToLocal(new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld));expect(Math.hypot(point.x,point.y)).toBeLessThan(.15);expect(point.z).toBeGreaterThan(.04);}});}}
  });
});
