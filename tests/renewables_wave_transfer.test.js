import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {afterEach,describe,it,expect} from 'vitest';

const require=createRequire(import.meta.url),THREE=require(resolve('vendor/three-r128/three.min.js'));
const source=fs.readFileSync('stem_lab/stem_tool_renewables.js','utf8'),sceneStart=source.indexOf('function RenewablesEnergyScene(props)');
function helper(name){
  const start=source.indexOf(`function ${name}(`,sceneStart);if(start<0)throw Error(`Missing ${name}`);
  let end=source.indexOf('{',start),depth=1;while(depth&&++end<source.length){if(source[end]==='{')depth++;if(source[end]==='}')depth--;}
  return source.slice(start,end+1);
}
const helpers=['material','mesh','box','cylinder','strut','ball','pipe','ring','glow','response','cue','particles','deformTube','waveAnnulus','waveMechanism','wavePowerConnections'].map(helper).join('\n'),roots=[];
function fixture(){const f=vm.runInNewContext(`(function(){
  var responses={},responseSettling=false,streamCount=0,markerUpdaters=[],updaters=[];
  ${helpers}
  var scene=new THREE.Scene(),A=new THREE.Group(),B=new THREE.Group(),C=new THREE.Group();scene.add(A,B,C);
  var guide=waveMechanism(B),cabinet=box(C,2,1.1,0,1.8,2,1.4,'#accad1'),load=box(C,4.6,.6,2.6,1.3,1.2,1,'#d7e8de'),equipment=new THREE.Group();
  C.children.slice().forEach(function(object){equipment.add(object);});C.add(equipment);equipment.position.y=2.1;
  var wiring=wavePowerConnections(B,C,guide,cabinet,load,equipment,37.68),deck=box(C,3.15,2.02,1.2,5,.16,4.5,'#91a6a5');
  function layout(exploded,isolated){[A,B,C].forEach(function(g,i){g.position.set(exploded?(i-1)*3.4:0,exploded&&i===1?.8:0,0);g.visible=isolated==null||isolated===i;});scene.updateMatrixWorld(true);wiring.update();scene.updateMatrixWorld(true);}
  function update(power,heave,dt,animate,status){guide.place(heave);var p={run:{power:power,status:status||'Generating'},dt:dt||0,animate:animate!==false,inspection:{trace:false}};scene.updateMatrixWorld(true);wiring.update();markerUpdaters.forEach(function(fn){fn(p);});scene.updateMatrixWorld(true);}
  layout(false);update(37.68,1.25,0,false);return {scene,A,B,C,guide,cabinet,load,equipment,deck,wiring,layout,update};
})()`,{THREE});roots.push(f.scene);return f;}
afterEach(()=>{for(const root of roots.splice(0))root.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});});
const marks=r=>r.group.children.filter(o=>/-marker-/.test(o.name));
const world=(r,t)=>r.group.localToWorld(r.curve.getPoint(t));
function contacts(f){for(const r of f.wiring.routes)for(const[t,port]of[[0,r.from],[1,r.to]])expect(world(r,t).distanceTo(port.getWorldPosition(new THREE.Vector3()))).toBeLessThan(1e-12);}
function clearance(body,p){const local=body.worldToLocal(p.clone()),g=body.geometry;if(g.type==='CylinderGeometry')return Math.hypot(Math.max(0,Math.hypot(local.x,local.z)-g.parameters.radiusTop),Math.max(0,Math.abs(local.y)-g.parameters.height/2));g.computeBoundingBox();return g.boundingBox.distanceToPoint(local);}

describe('Wave PTO electrical connections and sliding index',()=>{
  it('joins the fixed cap and real cabinet/load surfaces at the raised platform height',()=>{
    const f=fixture(),p=f.wiring.ports;contacts(f);
    for(const[key,body]of[['pto',f.guide.cap],['cabinet-input',f.cabinet],['cabinet-output',f.cabinet],['load',f.load]])expect(clearance(body,p[key].getWorldPosition(new THREE.Vector3()))).toBeLessThan(1e-7);
    expect(p.pto.getWorldPosition(new THREE.Vector3()).toArray()).toEqual([-.8,2.95,0]);
    expect(p['cabinet-input'].getWorldPosition(new THREE.Vector3()).y).toBe(3.2);
    expect(p['cabinet-output'].getWorldPosition(new THREE.Vector3()).y).toBeCloseTo(2.55,12);
    expect(p.load.getWorldPosition(new THREE.Vector3()).y).toBeCloseTo(2.55,12);
  });
  it.each([false,true])('clears the platform and moving equipment through the full stroke, exploded=%s',exploded=>{
    const f=fixture();f.layout(exploded);const bodies=[f.cabinet,f.load,f.deck];f.B.traverse(o=>{if(!o.geometry||o.name.includes('-port'))return;for(let p=o;p&&p!==f.B;p=p.parent)if(p.name.includes('-cable'))return;bodies.push(o);});
    let minimum=Infinity;
    for(let stroke=0;stroke<=24;stroke++){
      f.update(37.68,.47+1.56*stroke/24,0,false);contacts(f);
      for(const r of f.wiring.routes){const ends=[r.from,r.to].map(p=>p.getWorldPosition(new THREE.Vector3()));for(let i=0;i<=160;i++){const p=world(r,i/160);if(ends.some(e=>e.distanceTo(p)<.16))continue;for(const body of bodies)minimum=Math.min(minimum,clearance(body,p));}}
    }
    expect(minimum).toBeGreaterThan(.045);
  });
  it('preserves tube buffers and marker phase while reconnecting the first paused exploded frame',()=>{
    const f=fixture();f.update(37.68,1.5,.1,true);const before=f.wiring.routes.map(r=>({geometry:r.body.geometry,position:r.body.geometry.attributes.position,normal:r.body.geometry.attributes.normal,phase:marks(r)[0].userData.progress}));
    for(const exploded of[true,false,true]){f.layout(exploded);f.update(37.68,1.5,0,false);contacts(f);f.wiring.routes.forEach((r,i)=>{expect(r.body.geometry).toBe(before[i].geometry);expect(r.body.geometry.attributes.position).toBe(before[i].position);expect(r.body.geometry.attributes.normal).toBe(before[i].normal);expect(marks(r)[0].userData.progress).toBe(before[i].phase);for(const[n,m]of marks(r).entries())expect(m.position.distanceTo(r.curve.getPointAt((m.userData.progress+n/6)%1))).toBeLessThan(1e-12);});}
  });
  it('does not deform fixed cables as the buoy moves',()=>{
    const f=fixture(),versions=f.wiring.routes.map(r=>r.body.geometry.attributes.position.version),coordinates=f.wiring.routes.map(r=>Array.from(r.body.geometry.attributes.position.array));
    for(let i=0;i<60;i++)f.update(37.68,1.25+.78*Math.sin(i/10),.016,true);
    f.wiring.routes.forEach((r,i)=>{expect(r.body.geometry.attributes.position.version).toBe(versions[i]);expect(Array.from(r.body.geometry.attributes.position.array)).toEqual(coordinates[i]);});
  });
  it('shows the same exact forward mean electrical output on both paths throughout both strokes',()=>{
    const f=fixture();for(const heave of[.47,1.25,2.03,1.25,.47]){f.update(73.421,heave,.1,true);for(const r of f.wiring.routes){const m=marks(r)[0];expect(m.userData.power).toBe(73.421);expect(m.userData.referencePower).toBe(37.68);expect(m.userData.flowRate).toBeGreaterThan(0);}}
    expect(marks(f.wiring.routes[0])[0].userData.flowStrength).toBe(marks(f.wiring.routes[1])[0].userData.flowStrength);
    const previous=marks(f.wiring.routes[0])[0].userData.flowStrength;f.update(2,1.25,.02,true);expect(marks(f.wiring.routes[0])[0].userData.power).toBe(2);expect(marks(f.wiring.routes[0])[0].userData.flowStrength).toBeLessThan(previous);
  });
  it.each([[0,'Generating'],[37.68,'Scenario complete']])('stops markers immediately at power %s and status %s while retaining the cable', (power,status)=>{
    const f=fixture();f.update(37.68,1.5,.1,true);const phase=f.wiring.routes.map(r=>marks(r)[0].userData.progress);f.update(power,1.25,.02,true,status);
    f.wiring.routes.forEach((r,i)=>{expect(r.group.visible).toBe(true);expect(r.body.visible).toBe(true);expect(marks(r).every(m=>!m.visible&&m.userData.flowRate===0)).toBe(true);expect(marks(r)[0].userData.progress).toBe(phase[i]);});
  });
  it('hides absent endpoint paths while retaining the local cabinet/load path in generator isolation',()=>{
    const f=fixture();for(const stage of[0,1,2]){f.layout(true,stage);expect(f.wiring.routes[0].group.visible).toBe(false);expect(f.wiring.routes[1].group.visible).toBe(stage===2);}f.layout(true);expect(f.wiring.routes.every(r=>r.group.visible)).toBe(true);contacts(f);
  });
  it('moves the contrasting collar index rigidly with the carriage while the guide strip remains fixed',()=>{
    const f=fixture(),mark=f.scene.getObjectByName('energy-wave-carriage-index'),base=f.scene.getObjectByName('energy-wave-carriage-index-base'),strip=f.scene.getObjectByName('energy-wave-stroke-strip'),fixed=strip.matrixWorld.clone(),geometry=mark.geometry;
    for(const y of[.47,1.25,2.03]){f.update(37.68,y,0,false);const p=mark.getWorldPosition(new THREE.Vector3());expect(p.y-y).toBeCloseTo(.595,12);expect(p.z).toBe(.264);expect(mark.parent).toBe(f.guide.carriage);expect(strip.matrixWorld.equals(fixed)).toBe(true);expect(mark.geometry).toBe(geometry);
      const markBounds=new THREE.Box3().setFromObject(mark),baseBounds=new THREE.Box3().setFromObject(base);expect(markBounds.intersectsBox(baseBounds)).toBe(true);expect(baseBounds.min.z).toBeGreaterThan(.17);for(const spoke of f.guide.carriage.children.filter(o=>o.name.includes('-spoke-')))expect(baseBounds.intersectsBox(new THREE.Box3().setFromObject(spoke))).toBe(false);
    }
  });
});
