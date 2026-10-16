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
const helpers=['material','mesh','box','cylinder','ball','pipe','glow','response','cue','particles','deformTube','geothermalCircuit'].map(helper).join('\n');
function fixture(){return vm.runInNewContext(`(function(){
  var responses={},responseSettling=false,streamCount=0,markerUpdaters=[],updaters=[];
  ${helpers}
  var scene=new THREE.Scene(),B=new THREE.Group(),C=new THREE.Group();scene.add(B,C);
  var exchanger=cylinder(B,.5,1.6,0,.7,2,'#d4a465'),turbine=new THREE.Group();turbine.position.set(2.4,1.5,.35);C.add(turbine);
  var casing=cylinder(turbine,0,0,0,.68,.7,'#86a6ad');casing.rotation.x=Math.PI/2;
  var base=box(C,2.4,.7,0,1,1.3,1.4,'#688c99'),condenser=cylinder(C,3.9,.9,-2,.65,1.7,'#afc7c6'),load=box(C,4.6,.6,2.6,1.3,1.2,1,'#d7e8de');
  var circuit=geothermalCircuit(B,C,exchanger,turbine,condenser);
  function layout(exploded,isolated){B.position.set(0,exploded?.8:0,0);C.position.set(exploded?3.4:0,0,0);B.visible=isolated==null||isolated==='converter';C.visible=isolated==null||isolated==='generator';scene.updateMatrixWorld(true);circuit.update();scene.updateMatrixWorld(true);}
  function update(heat,power,dt,animate){var p={run:{available:heat,power:power,status:'Generating'},dt:dt||0,animate:animate!==false,inspection:{trace:false}};updaters.forEach(function(fn){fn(p);});markerUpdaters.forEach(function(fn){fn(p);});}
  layout(false);return {scene,B,C,exchanger,turbine,casing,base,condenser,load,circuit,layout,update};
})()`,{THREE});}
const marks=r=>r.group.children.filter(o=>/-marker-/.test(o.name));
const world=(r,t)=>r.group.localToWorld(r.curve.getPoint(t));
function contacts(f){for(const r of f.circuit.routes)for(const[t,port]of[[0,r.from],[1,r.to]])expect(world(r,t).distanceTo(port.getWorldPosition(new THREE.Vector3()))).toBeLessThan(1e-12);}
function distanceToBody(object,point){
  const local=object.worldToLocal(point.clone()),g=object.geometry;
  if(g.type==='CylinderGeometry'){const radial=Math.max(0,Math.hypot(local.x,local.z)-g.parameters.radiusTop),vertical=Math.max(0,Math.abs(local.y)-g.parameters.height/2);return Math.hypot(radial,vertical);}
  g.computeBoundingBox();return g.boundingBox.distanceToPoint(local);
}

describe('Geothermal closed working-fluid circuit',()=>{
  it('connects exchanger, turbine and condenser in a complete external loop using actual surfaces',()=>{
    const f=fixture(),p=f.circuit.ports,[heated,exhaust,returned]=f.circuit.routes;
    expect(heated.from).toBe(p['exchanger-out']);expect(heated.to).toBe(p['turbine-in']);expect(exhaust.from).toBe(p['turbine-out']);expect(exhaust.to).toBe(p['condenser-in']);expect(returned.from).toBe(p['condenser-out']);expect(returned.to).toBe(p['exchanger-in']);
    for(const[key,body]of[['exchanger-out',f.exchanger],['exchanger-in',f.exchanger],['turbine-in',f.casing],['turbine-out',f.casing],['condenser-in',f.condenser],['condenser-out',f.condenser]]){
      expect(distanceToBody(body,p[key].getWorldPosition(new THREE.Vector3()))).toBeLessThan(1e-12);
      const local=body.worldToLocal(p[key].getWorldPosition(new THREE.Vector3()));expect(Math.hypot(local.x,local.z)).toBeCloseTo(body.geometry.parameters.radiusTop,12);
    }contacts(f);
  });
  it.each([false,true])('keeps pipe spans outside equipment and separate in exploded=%s',exploded=>{
    const f=fixture();f.layout(exploded);const bodies=[f.exchanger,f.casing,f.base,f.condenser,f.load],samples=[];
    for(const r of f.circuit.routes){const ends=[r.from,r.to].map(p=>p.getWorldPosition(new THREE.Vector3())),points=[];let clearance=Infinity;
      for(let i=0;i<=240;i++){const p=world(r,i/240);points.push(p);if(ends.some(e=>e.distanceTo(p)<.18))continue;for(const body of bodies)clearance=Math.min(clearance,distanceToBody(body,p));}
      expect(clearance).toBeGreaterThan(.07);samples.push(points);
    }
    for(let i=0;i<samples.length;i++)for(let j=i+1;j<samples.length;j++){let separation=Infinity;for(const a of samples[i])for(const b of samples[j])separation=Math.min(separation,a.distanceTo(b));expect(separation).toBeGreaterThan(.14);}
  });
  it('preserves actual port attachment and tube buffers on the first paused layout frame',()=>{
    const f=fixture();f.update(18392,2515,.1,true);const saved=f.circuit.routes.map(r=>({geometry:r.body.geometry,position:r.body.geometry.attributes.position,normal:r.body.geometry.attributes.normal,phase:marks(r)[0].userData.progress}));
    for(const exploded of[true,false,true,false]){f.layout(exploded);f.update(18392,2515,0,false);contacts(f);f.circuit.routes.forEach((r,i)=>{expect(r.body.geometry).toBe(saved[i].geometry);expect(r.body.geometry.attributes.position).toBe(saved[i].position);expect(r.body.geometry.attributes.normal).toBe(saved[i].normal);expect(marks(r)[0].userData.progress).toBe(saved[i].phase);for(const[n,m]of marks(r).entries())expect(m.position.distanceTo(r.curve.getPointAt((m.userData.progress+n/6)%1))).toBeLessThan(1e-12);});}
    const versions=f.circuit.routes.map(r=>r.body.geometry.attributes.position.version);f.circuit.update();f.circuit.routes.forEach((r,i)=>expect(r.body.geometry.attributes.position.version).toBe(versions[i]));
  });
  it('keeps the exhaust visible with isolated generator equipment but hides cross-stage paths',()=>{
    const f=fixture();for(const selected of['resource','converter','generator']){f.layout(true,selected);const[a,b,c]=f.circuit.routes;expect(a.group.visible).toBe(false);expect(c.group.visible).toBe(false);expect(b.group.visible).toBe(selected==='generator');expect(b.group.parent).toBe(f.C);}f.layout(true);expect(f.circuit.routes.every(r=>r.group.visible)).toBe(true);contacts(f);
  });
  it('follows moved apparatus port transforms without replacing geometry',()=>{
    const f=fixture();f.exchanger.position.y+=.15;f.turbine.position.x+=.1;f.condenser.position.z-=.1;f.scene.updateMatrixWorld(true);f.circuit.update();contacts(f);
  });
});

describe('Geothermal heat and cooling response',()=>{
  it('keeps loop circulation unchanged when utilization changes but responds to rejected heat in cooling glow',()=>{
    const low=fixture(),high=fixture();low.update(18392,1000,0,false);high.update(18392,5000,0,false);
    low.circuit.routes.forEach((r,i)=>{const b=high.circuit.routes[i];expect(marks(r)[0].userData.flowRate).toBe(marks(b)[0].userData.flowRate);expect(r.group.userData.drivingHeat).toBe(18392);if(i===0)expect(r.body.material.emissiveIntensity).toBe(b.body.material.emissiveIntensity);else expect(r.body.material.emissiveIntensity).toBeGreaterThan(b.body.material.emissiveIntensity);});
    expect(low.circuit.group.userData.rejectedHeat).toBe(17392);expect(high.circuit.group.userData.rejectedHeat).toBe(13392);
  });
  it('smoothly changes positive circulation and brightness with exact heat metadata',()=>{
    const f=fixture();f.update(18392/16,2515/16,0,false);const r=f.circuit.routes[0],m=marks(r)[0],before=m.userData.flowRate,glow=r.body.material.emissiveIntensity;
    f.update(18392,2515,.02,true);expect(m.userData.flowRate).toBeGreaterThan(before);expect(m.userData.worldFlowRate).toBeLessThan(.75);expect(m.userData.targetWorldFlowRate).toBe(.75);expect(m.userData.targetFlowRate*5*r.curve.getLength()).toBeCloseTo(.75,12);expect(r.body.material.emissiveIntensity).toBeGreaterThan(glow);expect(r.body.material.emissiveIntensity).toBeLessThan(.5);expect(f.circuit.group.userData.thermalPower).toBe(18392);
    expect(f.circuit.routes.every(route=>marks(route)[0].userData.worldFlowRate===m.userData.worldFlowRate)).toBe(true);
  });
  it('stops secondary flow and heat glow immediately at zero while retaining physical plumbing',()=>{
    const f=fixture();f.update(18392,2515,.1,true);const phases=f.circuit.routes.map(r=>marks(r)[0].userData.progress);f.update(0,0,.1,true);
    f.circuit.routes.forEach((r,i)=>{expect(r.group.visible).toBe(true);expect(r.body.material.emissiveIntensity).toBe(0);expect(marks(r).every(m=>!m.visible&&m.userData.flowRate===0)).toBe(true);expect(marks(r)[0].userData.progress).toBe(phases[i]);});
    f.update(18392,2515,0,false);f.circuit.routes.forEach((r,i)=>expect(marks(r)[0].userData.progress).toBe(phases[i]));
  });
  it('preserves phase under paused heat changes and only advances on explicit elapsed time',()=>{
    const f=fixture();f.update(18392,2515,.1,true);const r=f.circuit.routes[0],m=marks(r)[0],phase=m.userData.progress;f.update(18392*4,2515*4,0,false);expect(m.userData.progress).toBe(phase);expect(m.userData.worldFlowRate).toBe(1.5);f.update(18392*4,2515*4,.1,false);expect((m.userData.progress-phase)*r.curve.getLength()).toBeCloseTo(.15,12);
  });
});
