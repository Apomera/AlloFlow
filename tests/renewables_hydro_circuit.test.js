import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {afterEach,describe,it,expect} from 'vitest';

const require=createRequire(import.meta.url),THREE=require(resolve('vendor/three-r128/three.min.js'));
const source=fs.readFileSync('stem_lab/stem_tool_renewables.js','utf8'),sceneStart=source.indexOf('function RenewablesEnergyScene(props)');
function helper(name){const start=source.indexOf(`function ${name}(`,sceneStart);if(start<0)throw Error(`Missing ${name}`);let end=source.indexOf('{',start),depth=1;while(depth&&++end<source.length){if(source[end]==='{')depth++;if(source[end]==='}')depth--;}return source.slice(start,end+1);}
const code=['material','mesh','box','cylinder','strut','ball','pipe','ring','glow','response','shape','particles','deformTube','waveAnnulus','hydroWaterCircuit'].map(helper).join('\n'),roots=[];
function fixture(){const f=vm.runInNewContext(`(function(){
  var responses={},responseSettling=false,dimensionSettling=false,streamCount=0,markerUpdaters=[],updaters=[];${code}
  var scene=new THREE.Scene(),A=new THREE.Group(),B=new THREE.Group(),C=new THREE.Group();scene.add(A,B,C);
  var reservoir=box(A,-3,2,0,3,3.8,4,'#407461'),water=box(A,-3,4,0,2.9,.15,3.9,'#3c9dcb',.8),dam=box(B,-1.15,1.8,0,.5,3.5,4.3,'#8b9e9e');
  var deck=new THREE.Group();B.add(deck);var deckBody=box(deck,-1.15,.03,0,.78,.14,4.5,'#a8b6aa');
  var casing=cylinder(B,1,.8,0,.8,1.15,'#769ea7');casing.rotation.x=Math.PI/2;
  var circuit=hydroWaterCircuit(A,B,water,casing);
  var current={head:30,flow:5,efficiency:90};
  function update(settings,dt,animate,status){current=Object.assign({},current,settings);var p={run:{settings:current,available:9.81*current.head*current.flow,power:9.81*current.head*current.flow*current.efficiency/100,status:status||'Generating'},dt:dt||0,animate:animate!==false,inspection:{trace:false}};
    var displayed=shape('hydro-head',current.head,p),scale=.70+displayed/180;reservoir.scale.y=scale;reservoir.position.y=scale*1.9;water.position.y=scale*3.8+.1;dam.scale.y=scale;dam.position.y=scale*1.75;deck.position.y=scale*3.5;
    updaters.forEach(fn=>fn(p));scene.updateMatrixWorld(true);circuit.update();markerUpdaters.forEach(fn=>fn(p));scene.updateMatrixWorld(true);return p;
  }
  function layout(exploded,isolated){[A,B,C].forEach(function(g,i){g.position.set(exploded?(i-1)*3.4:0,exploded&&i===1?.8:0,0);g.visible=isolated==null||isolated===i;});scene.updateMatrixWorld(true);circuit.update();scene.updateMatrixWorld(true);}
  update({},0,false);layout(false);return {scene,A,B,C,reservoir,water,dam,deck,deckBody,casing,circuit,update,layout};
})()`,{THREE});roots.push(f.scene);return f;}
afterEach(()=>{for(const root of roots.splice(0))root.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});});
const markers=r=>r.group.children.filter(o=>/-marker-/.test(o.name));
const point=(r,t)=>r.group.localToWorld(r.curve.getPoint(t));
const position=o=>o.getWorldPosition(new THREE.Vector3());
const difference=(after,before)=>(after-before+1)%1;
function contacts(f){for(const r of f.circuit.routes)for(const[t,port]of[[0,r.from],[1,r.to]])expect(point(r,t).distanceTo(position(port))).toBeLessThan(1e-11);}
function clearance(body,world){const p=body.worldToLocal(world.clone()),g=body.geometry;if(g.type==='CylinderGeometry')return Math.hypot(Math.max(0,Math.hypot(p.x,p.z)-g.parameters.radiusTop),Math.max(0,Math.abs(p.y)-g.parameters.height/2));g.computeBoundingBox();return g.boundingBox.distanceToPoint(p);}

describe('Connected hydro water circuit',()=>{
  it('meets the reservoir face and actual casing inlet and discharge surfaces',()=>{
    const f=fixture(),[inlet,neck,outlet]=f.circuit.routes;contacts(f);
    expect(clearance(f.reservoir,position(inlet.from))).toBeLessThan(.02);
    expect(inlet.to).toBe(neck.from);expect(clearance(f.casing,position(neck.to))).toBeLessThan(1e-11);
    expect(clearance(f.casing,position(outlet.from))).toBeLessThan(1e-11);
    expect(position(neck.to).y).toBeCloseTo(1.6,12);expect(position(outlet.from).x).toBeCloseTo(1.8,12);
    expect(neck.curve.getTangentAt(1).y).toBeLessThan(-.99);expect(outlet.curve.getTangentAt(0).x).toBeGreaterThan(.99);
  });
  it.each([5,30,150])('keeps the intake submerged and all external spans clear of the dam and casing at head %i',head=>{
    const f=fixture();f.update({head},0,false);
    for(const exploded of[false,true]){f.layout(exploded);contacts(f);const inlet=f.circuit.routes[0],local=f.A.worldToLocal(position(inlet.from));expect(local.y).toBeLessThan(f.water.position.y-.075);expect(local.y).toBeGreaterThan(.2);
      for(const r of f.circuit.routes){const from=position(r.from),to=position(r.to);let minimum=Infinity;for(let i=0;i<=300;i++){const p=point(r,i/300);for(const body of[f.dam,f.deckBody])minimum=Math.min(minimum,clearance(body,p));if(p.distanceTo(from)>.28&&p.distanceTo(to)>.28){expect(clearance(f.reservoir,p)).toBeGreaterThan(.19);expect(clearance(f.casing,p)).toBeGreaterThan(.19);}}expect(minimum,r.group.name+' dam clearance').toBeGreaterThan(.19);}
    }
  });
  it('keeps endpoints attached across independent stage translations and rotations',()=>{
    const f=fixture();f.A.position.set(-3.4,0,-.3);f.A.rotation.y=.16;f.B.position.set(.4,.8,.15);f.B.rotation.y=-.12;f.scene.updateMatrixWorld(true);f.circuit.update();f.scene.updateMatrixWorld(true);contacts(f);
  });
  it('joins the cross-stage penstock to the local elbow without an abrupt change of direction',()=>{
    const f=fixture(),[inlet,neck]=f.circuit.routes;
    for(const head of[5,30,150])for(const exploded of[false,true]){f.update({head},0,false);f.layout(exploded);contacts(f);expect(inlet.curve.getTangentAt(1).dot(neck.curve.getTangentAt(0))).toBeGreaterThan(.9999);}
  });
  it('keeps the local elbow flow markers separate rather than overlapping into a glowing rod',()=>{
    const f=fixture(),neck=f.circuit.routes[1],dots=markers(neck),diameter=2*dots[0].geometry.parameters.radius;
    for(let phase=0;phase<48;phase++){const positions=dots.map((_,i)=>neck.curve.getPointAt((phase/48+i/dots.length)%1));for(let i=0;i<positions.length;i++)for(let j=i+1;j<positions.length;j++)expect(positions[i].distanceTo(positions[j])).toBeGreaterThan(diameter);}
  });
  it('keeps the discharge and trough with the converter while hiding the cross-stage inlet in isolation',()=>{
    const f=fixture(),[inlet,neck,outlet]=f.circuit.routes;expect(f.circuit.channel.parent).toBe(f.B);
    for(const stage of[0,1,2]){f.layout(true,stage);expect(inlet.group.visible).toBe(false);expect(neck.group.visible).toBe(stage===1);expect(outlet.group.visible).toBe(stage===1);}
    f.layout(true);expect(inlet.group.visible).toBe(true);expect(neck.group.visible).toBe(true);expect(outlet.group.visible).toBe(true);contacts(f);
  });
  it('retains all tube buffers and stream phases through paused head and layout adjustments',()=>{
    const f=fixture();f.update({},.1,true);const saved=f.circuit.routes.map(r=>({geometry:r.body.geometry,position:r.body.geometry.attributes.position,normal:r.body.geometry.attributes.normal,index:r.body.geometry.index,phase:markers(r)[0].userData.progress}));
    for(const head of[150,5,70])for(const exploded of[true,false]){f.layout(exploded);f.update({head},0,false);contacts(f);f.circuit.routes.forEach((r,i)=>{expect(r.body.geometry).toBe(saved[i].geometry);expect(r.body.geometry.attributes.position).toBe(saved[i].position);expect(r.body.geometry.attributes.normal).toBe(saved[i].normal);expect(r.body.geometry.index).toBe(saved[i].index);expect(markers(r)[0].userData.progress).toBe(saved[i].phase);});}
    const versions=f.circuit.routes.map(r=>r.body.geometry.attributes.position.version);f.circuit.update();f.circuit.routes.forEach((r,i)=>expect(r.body.geometry.attributes.position.version).toBe(versions[i]));
  });
  it('exposes both equal-diameter streams through translucent inspection walls',()=>{
    const f=fixture();for(const r of f.circuit.routes){expect(r.body.geometry.parameters.radius).toBe(.19);expect(r.body.material.transparent).toBe(true);expect(r.body.material.opacity).toBeGreaterThan(0);expect(r.body.material.opacity).toBeLessThan(.7);expect(r.body.material.depthWrite).toBe(false);expect(markers(r)).toHaveLength(6);}
  });
});

describe('Hydro circulation and gate response',()=>{
  it.each([1,5,50])('advances both pipes at the same selected-flow distance rate at flow %i',flow=>{
    const f=fixture();f.update({flow},0,false);for(const exploded of[false,true]){f.layout(exploded);const before=f.circuit.routes.map(r=>markers(r)[0].userData.progress);f.update({},.05,true);f.circuit.routes.forEach((r,i)=>{const m=markers(r)[0];expect(m.userData.worldFlowRate).toBeCloseTo(.10*flow,12);expect(difference(m.userData.progress,before[i])*r.curve.getLength()).toBeCloseTo(.10*flow*.05,11);});}
  });
  it('preserves equal integrated travel while head and flow ease and layouts switch',()=>{
    const f=fixture();f.update({flow:1},0,false);for(const exploded of[true,false,true,false]){f.layout(exploded);const before=f.circuit.routes.map(r=>markers(r)[0].userData.progress);f.update({head:150,flow:50},.05,true);const travel=f.circuit.routes.map((r,i)=>difference(markers(r)[0].userData.progress,before[i])*r.curve.getLength());expect(travel[0]).toBeGreaterThan(.1*.05);expect(travel[0]).toBeLessThan(5*.05);travel.forEach(t=>expect(t).toBeCloseTo(travel[0],11));contacts(f);}
  });
  it('keeps circulation independent of head and efficiency while the gate responds only to flow',()=>{
    const f=fixture();f.update({flow:25},0,false);const angles=[f.circuit.gate.rotation.x,f.circuit.gateLever.rotation.x];for(const settings of[{head:150},{efficiency:50},{head:5,efficiency:95}]){f.update(settings,.05,true);for(const r of f.circuit.routes)expect(markers(r)[0].userData.worldFlowRate).toBeCloseTo(2.5,12);expect(f.circuit.gate.rotation.x).toBe(angles[0]);expect(f.circuit.gateLever.rotation.x).toBe(angles[1]);}
  });
  it('opens the gate smoothly with flow and closes it immediately when flow stops',()=>{
    const f=fixture();f.update({flow:0},0,false);expect(f.circuit.gate.rotation.x).toBe(0);f.update({flow:50},.05,true);expect(f.circuit.gate.rotation.x).toBeGreaterThan(0);expect(f.circuit.gate.rotation.x).toBeLessThan(Math.PI/2);expect(f.circuit.gateLever.rotation.x).toBe(f.circuit.gate.rotation.x);f.update({flow:50},0,false);expect(f.circuit.gate.rotation.x).toBeCloseTo(Math.PI/2,12);
    const phases=f.circuit.routes.map(r=>markers(r)[0].userData.progress);f.update({flow:0},.05,true);expect(f.circuit.gate.rotation.x).toBe(0);expect(f.circuit.gateLever.rotation.x).toBe(0);f.circuit.routes.forEach((r,i)=>{expect(markers(r).every(m=>!m.visible&&m.userData.worldFlowRate===0)).toBe(true);expect(markers(r)[0].userData.progress).toBe(phases[i]);});
  });
  it('keeps the valve disc centered inside its vertical pipe throughout the full stroke',()=>{
    const f=fixture(),neck=f.circuit.routes[1],radius=neck.body.geometry.parameters.radius;
    for(const flow of[0,1,10,25,50]){f.update({flow},0,false);const center=f.B.worldToLocal(position(f.circuit.gate));expect(center.x).toBeCloseTo(1,12);expect(center.y).toBeCloseTo(1.81,12);expect(center.z).toBeCloseTo(0,12);const vertices=f.circuit.gate.geometry.attributes.position;
      for(let i=0;i<vertices.count;i++){const p=f.B.worldToLocal(new THREE.Vector3().fromBufferAttribute(vertices,i).applyMatrix4(f.circuit.gate.matrixWorld));expect(Math.hypot(p.x-center.x,p.z-center.z)).toBeLessThan(radius);expect(p.y).toBeGreaterThan(1.6);expect(p.y).toBeLessThan(2.2);}
    }
  });
  it('holds markers while paused and advances the exact requested illustration step',()=>{
    const f=fixture();f.update({flow:10},.1,true);const phases=f.circuit.routes.map(r=>markers(r)[0].userData.progress);f.update({flow:20},0,false);f.circuit.routes.forEach((r,i)=>expect(markers(r)[0].userData.progress).toBe(phases[i]));f.update({},.1,false);f.circuit.routes.forEach((r,i)=>expect(difference(markers(r)[0].userData.progress,phases[i])*r.curve.getLength()).toBeCloseTo(.2,11));
  });
  it('stops both streams at the completed-sequence boundary without erasing their phases',()=>{
    const f=fixture();f.update({},.1,true);const phases=f.circuit.routes.map(r=>markers(r)[0].userData.progress);f.update({},.1,true,'Sequence complete');f.circuit.routes.forEach((r,i)=>{expect(markers(r).every(m=>!m.visible)).toBe(true);expect(markers(r)[0].userData.progress).toBe(phases[i]);});
  });
});
