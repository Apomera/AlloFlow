import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const THREE = require('../vendor/three-r128/three.min.js');
const source = fs.readFileSync('stem_lab/stem_tool_machinelab.js', 'utf8');
function scene(kind, params = {}, reduced = false) {
  const builders = {};
  const stub = { registerTool() {}, makeOrbitViewer(options) {
    builders[options.attr] = options.build;
    return { attach() {}, push() {}, status() { return 'ready'; }, onStatusChange() {} };
  }};
  vm.runInNewContext(source, { window: { StemLab: stub, matchMedia: () => ({matches:reduced}) }, console, setTimeout, clearTimeout });
  const state = { model: new THREE.Group(), scene: new THREE.Scene(), data: {demoId:1} };
  builders['data-machinelab-shop-gl'](THREE, state, {kind,params,dark:true});
  state.tick(100); state.tick(1200);
  state.model.updateMatrixWorld(true);
  return state;
}
describe('Machine Lab: connected demonstration geometry', () => {
  for (const height of [0.2, 1, 3.9, 4]) it(`keeps the load on the ramp at height ${height}`, () => {
    const s = scene('ramp',{length:4,height}); const d=s.mlDemo;
    const delta = d.motion.position.clone().sub(new THREE.Vector3(d.baseX,d.baseY,0));
    expect(delta.x * -Math.sin(d.angle) + delta.y * Math.cos(d.angle)).toBeCloseTo(0,8);
    expect(delta.length()).toBeCloseTo(1.45,8);
    const n = new THREE.Vector3(-Math.sin(d.angle),Math.cos(d.angle),0);
    const offset = d.motion.position.clone().sub(new THREE.Vector3(0,0.42 + 5.4 * height / 4 / 2,0));
    expect(offset.dot(n)).toBeCloseTo(0.545,8);
  });
  for (const segments of [1,2,6]) it(`keeps ${segments} supporting ropes attached at both ends`, () => {
    const s=scene('pulley',{segments}), d=s.mlDemo;
    expect(d.supportingRopes).toHaveLength(segments);
    d.supportingRopes.forEach(rope => {
      const half=rope.geometry.parameters.height * rope.scale.y / 2;
      expect(rope.position.y+half).toBeCloseTo(d.pulleyTop,8);
      expect(rope.position.y-half).toBeCloseTo(d.pulleyBottom+d.motion.position.y,8);
    });
  });
  it('keeps the winding rope attached to the lifted load', () => {
    const d=scene('windlass').mlDemo, rope=d.hangingRope;
    const half=rope.geometry.parameters.height * rope.scale.y / 2;
    expect(rope.position.y+half).toBeCloseTo(d.axleY,8);
    expect(rope.position.y-half).toBeCloseTo(d.load.position.y+0.36,8);
  });
  it('keeps the screw press above the platform through the full demonstration', () => {
    const s=scene('screw');
    for (const t of [100,650,1200,1750,2300]) {
      s.tick(t);s.model.updateMatrixWorld(true);
      const load = new THREE.Box3().setFromObject(s.mlDemo.pressLoad);
      expect(load.min.y).toBeGreaterThan(0.14);
      expect(s.mlDemo.motion.position.y).toBeGreaterThanOrEqual(-s.mlDemo.screwTravel);
    }
  });
  it('holds geometry and decorative lights still with reduced motion', () => {
    const s=scene('lever',{},true);
    const pose=()=>[s.mlDemo.motion.rotation.z,...s.mlDemo.lamps.map(x=>x.material.emissiveIntensity),...s.mlDemo.beacons.map(x=>x.scale.x)];
    const before=pose();s.tick(1600);expect(pose()).toEqual(before);
  });
});

function rangeScene(reveal = true, reduced = false, path = [{t:0,x:0,y:2,z:0},{t:1,x:10,y:8,z:1},{t:4,x:40,y:0,z:4}], overrides = {}) {
  const builders={};
  vm.runInNewContext(source,{window:{StemLab:{registerTool(){},makeOrbitViewer(o){builders[o.attr]=o.build;return {attach(){},push(){},status(){return 'ready';},onStatusChange(){}};}}},console,setTimeout,clearTimeout});
  const s={model:new THREE.Group(),scene:new THREE.Scene(),data:{shotId:1,animating:true,flightTime:4,reduced}};
  builders['data-machinelab-range-gl'](THREE,s,{path,range:40,apex:8,reveal,dark:true,...overrides});s.tick(0);s.tick(2000);return s;
}
describe('Machine Lab: readable flight and force directions',()=>{
  it('plays unevenly spaced samples by elapsed time, including a clock starting at zero',()=>{
    const s=rangeScene();expect(s.scene.fog).toBeNull();expect(s.rangeStone.position.x).toBeCloseTo(20,8);expect(s.rangeStone.position.y).toBeCloseTo(16/3,8);expect(s.rangeStone.position.z).toBeCloseTo(2,8);
    expect(s.rangeStone.scale.x).toBe(1);
  });
  it('places the ground ring and height line directly under the live stone',()=>{
    const s=rangeScene(),g=s.rangeInstruments;expect(g.groundRing.visible).toBe(true);
    expect(g.groundRing.position.x).toBeCloseTo(s.rangeStone.position.x,8);expect(g.groundRing.position.z).toBeCloseTo(s.rangeStone.position.z,8);
    const p=g.heightGuide.geometry.attributes.position;expect(p.getY(1)).toBeCloseTo(s.rangeStone.position.y,5);expect(p.getY(0)).toBeCloseTo(0.045,5);
  });
  it('draws a receding trail at equal time intervals and removes it when flight ends',()=>{
    const s=rangeScene(),trail=s.rangeInstruments.trail;const visible=trail.filter(p=>p.visible);expect(visible).toHaveLength(7);
    for(let i=1;i<visible.length;i++) expect(visible[i].position.x-visible[i-1].position.x).toBeCloseTo(1.8,8);
    expect(visible.at(-1).position.x).toBeLessThan(s.rangeStone.position.x);
    s.data.animating=false;s.tick(5000);expect(trail.some(p=>p.visible)).toBe(false);expect(s.rangeInstruments.heightGuide.visible).toBe(false);
  });
  it('reveals no trail or height instruments before the prediction is fired',()=>{
    const s=rangeScene(false);expect(s.rangeInstruments.groundRing).toBeNull();expect(s.rangeInstruments.heightGuide).toBeNull();expect(s.rangeInstruments.trail.some(p=>p.visible)).toBe(false);
  });
  it('holds a complete strobe photograph still with reduced motion',()=>{
    const s=rangeScene(true,true);const points=s.rangeInstruments.trail.map(p=>p.position.clone());s.tick(3000);
    s.rangeInstruments.trail.forEach((p,i)=>{expect(p.visible).toBe(true);expect(p.position.equals(points[i])).toBe(true)});
  });
  it('retains playback for old paths without timestamps',()=>{
    const s=rangeScene(true,false,[{x:0,y:2},{x:10,y:8},{x:40,y:0}]);expect(s.rangeStone.position.x).toBe(10);
  });
  it('points ramp effort up the slope and keeps the arrow beside the moving crate',()=>{
    const s=scene('ramp',{length:4,height:3}),d=s.mlDemo;
    const dir=new THREE.Vector3(0,-1,0).applyQuaternion(d.effortArrow.quaternion);
    expect(dir.x).toBeCloseTo(Math.cos(d.angle),8);expect(dir.y).toBeCloseTo(Math.sin(d.angle),8);
    const offset=d.motion.position.clone().sub(d.effortArrow.position);s.tick(1750);
    expect(d.motion.position.x-d.effortArrow.position.x).toBeCloseTo(offset.x,8);expect(d.motion.position.y-d.effortArrow.position.y).toBeCloseTo(offset.y,8);
  });
  it('points wedge load arrows outward on both sides',()=>{
    const d=scene('wedge').mlDemo;expect(d.splitArrows).toHaveLength(2);
    d.splitArrows.forEach(a=>{const direction=new THREE.Vector3(0,-1,0).applyQuaternion(a.quaternion);expect(direction.x).toBeCloseTo(a.userData.mlSide,8);});
  });
});

describe('Machine Lab: deterministic environmental detail',()=>{
  function helpers(){
    const window={StemLab:{registerTool(){},makeOrbitViewer(){return {attach(){},push(){},status(){return 'ready';},onStatusChange(){}};}}};
    const instrumented=source.replace('  function canopyGeometry(', '  window.__canopy=canopyGeometry; window.__tent=dressFieldTent; function canopyGeometry(');
    vm.runInNewContext(instrumented,{window,console,setTimeout,clearTimeout});return window;
  }
  for(const broad of [true,false]) it('builds reproducible, bounded '+(broad?'broadleaf':'conifer')+' silhouettes',()=>{
    const h=helpers(),a=h.__canopy(THREE,broad),b=h.__canopy(THREE,broad);
    expect(Array.from(a.attributes.position.array)).toEqual(Array.from(b.attributes.position.array));
    expect(Array.from(a.attributes.normal.array).every(Number.isFinite)).toBe(true);
    expect(a.index.count/3).toBeLessThan(250);
    a.computeBoundingBox();expect(a.boundingBox.min.y).toBeGreaterThanOrEqual(-1.71);expect(a.boundingBox.max.y).toBeLessThanOrEqual(1.71);
    expect(a.boundingSphere.radius).toBeLessThan(2.3);
    expect(a.attributes.color.count).toBe(a.attributes.position.count);
  });
  it('keeps tent seams, door and ropes attached when the tent is moved',()=>{
    const h=helpers(),tent=new THREE.Mesh(new THREE.ConeGeometry(2.4,2.8,8),new THREE.MeshLambertMaterial());
    h.__tent(THREE,tent,2.4,2.8,null);
    expect(tent.children).toHaveLength(5);tent.position.set(11,1.4,-79);tent.updateMatrixWorld(true);
    const before=tent.children.map(c=>c.getWorldPosition(new THREE.Vector3()));tent.position.x+=8;tent.updateMatrixWorld(true);
    tent.children.forEach((c,i)=>expect(c.getWorldPosition(new THREE.Vector3()).x-before[i].x).toBeCloseTo(8,8));
  });
});

function engine(kind, geom={}, transformed=false) {
  const builders={};
  vm.runInNewContext(source,{window:{StemLab:{registerTool(){},makeOrbitViewer(o){builders[o.attr]=o.build;return {attach(){},push(){},status(){return 'ready';},onStatusChange(){}};}}},console,setTimeout,clearTimeout});
  const s={model:new THREE.Group(),scene:new THREE.Scene(),data:{}};
  if(transformed){s.model.position.set(17,3,-80);s.model.rotation.y=Math.PI/2;}
  builders['data-machinelab-treb-gl'](THREE,s,{kind,embedded:true,geom:{armLength:1.1,drawLength:1,slingLength:1,...geom}});
  return s;
}
function segmentEnds(mesh){mesh.updateMatrix();return [-0.5,0.5].map(x=>new THREE.Vector3(x,0,0).applyMatrix4(mesh.matrix));}
describe('Machine Lab: connected torsion engines',()=>{
  for(const transformed of [false,true]) it('keeps both ballista strings attached throughout the draw'+(transformed?' in the field':''),()=>{
    const s=engine('ballista',{},transformed);
    for(const winding of [0,0.25,0.5,0.75,1]){
      s.mlPose(winding);
      s.ml.arms.forEach((arm,i)=>{
        arm.updateMatrix();const tip=new THREE.Vector3(s.ml.armLen,0,0).applyMatrix4(arm.matrix);
        expect(tip.y).toBeCloseTo(s.ml.pivotY,8);
        const ends=segmentEnds(s.bowString.children[i]);expect(ends[0].distanceTo(tip)).toBeLessThan(1e-7);expect(ends[1].distanceTo(s.ml.nock)).toBeLessThan(1e-7);
      });
    }
  });
  for(const slingLength of [0,1,2.5]) it('keeps the onager stone clear of the deck with sling '+slingLength,()=>{
    const s=engine('onager',{slingLength});expect(s.ml.sling).toBe(slingLength);
    for(const winding of [0,0.25,0.5,0.75,1]){
      s.mlPose(winding);const arm=s.ml.arms[0];arm.updateMatrix();const tip=new THREE.Vector3(s.ml.armLen,0,0).applyMatrix4(arm.matrix);
      expect(tip.distanceTo(s.ml.nock)).toBeCloseTo(slingLength,7);expect(s.ml.nock.y).toBeGreaterThanOrEqual(0.599999);
      if(s.onagerCord){const ends=segmentEnds(s.onagerCord);expect(ends[0].distanceTo(tip)).toBeLessThan(1e-7);expect(ends[1].distanceTo(s.ml.nock)).toBeLessThan(1e-7);}
    }
  });
  for(const kind of ['ballista','onager']) it(kind+' launches continuously from its attachment point with a clock starting at zero',()=>{
    const s=engine(kind);s.data={shotId:1,muzzleV:20,releaseAngle:45};s.tick(0);
    const release=kind==='ballista'?280:550;s.tick(release);const atRelease=s.ml.stone.position.clone();s.tick(release+1);
    expect(s.ml.stone.position.distanceTo(atRelease)).toBeLessThan(0.021);expect(s.ml.stone.position.x).toBeGreaterThan(atRelease.x);
    s.data.reduced=true;s.tick(1500);const pose=s.ml.arms.map(a=>a.rotation.clone());s.tick(9000);
    s.ml.arms.forEach((a,i)=>expect(a.rotation.equals(pose[i])).toBe(true));expect(s.ml.stone.visible).toBe(false);
  });
});

describe('Machine Lab: trebuchet sling and release',()=>{
  for(const beamLong of [1,4.5,8]) it('keeps the loading stone above the surface with a '+beamLong+' m arm',()=>{
    const s=engine('trebuchet',{beamLong,beamShort:0.3,cwDrop:0.3,slingLength:3});
    for(const winding of [0,0.25,0.5,0.75,1]){s.mlPose(winding);expect(s.ml.stone.position.y-s.ml.stoneR).toBeGreaterThanOrEqual(0.039999);}
    s.data={shotId:1};for(const t of [0,50,200,500,750]){s.tick(t);expect(s.ml.stone.position.y-s.ml.stoneR).toBeGreaterThanOrEqual(0.039999);}
  });
  for(const transformed of [false,true]) it('keeps both rope legs and the stone attached to the pouch'+(transformed?' in the field':''),()=>{
    const s=engine('trebuchet',{},transformed);s.data={shotId:1};
    for(const t of [0,100,375,750]){
      s.tick(t);s.model.updateMatrixWorld(true);
      expect(s.ml.stone.getWorldPosition(new THREE.Vector3()).distanceTo(s.ml.pouch.getWorldPosition(new THREE.Vector3()))).toBeLessThan(1e-7);
      s.ml.cords.forEach((rope,i)=>{
        rope.updateMatrix();const side=i?1:-1;
        const ends=[-0.5,0.5].map(y=>new THREE.Vector3(0,y,0).applyMatrix4(rope.matrix));
        const start=new THREE.Vector3(0,0,side*0.07),end=s.ml.pouch.position.clone().add(new THREE.Vector3(0,0,side*s.ml.stoneR*0.7));
        expect(ends[0].distanceTo(start)).toBeLessThan(1e-7);expect(ends[1].distanceTo(end)).toBeLessThan(1e-7);
      });
    }
  });
  for(const angle of [15,45,75]) it('releases at '+angle+' degrees without a position jump or inherited arm rotation',()=>{
    const s=engine('trebuchet');s.data={shotId:1,releaseAngle:angle,muzzleV:20};s.tick(0);s.tick(750);
    const start=s.ml.stone.position.clone();s.tick(751);const delta=s.ml.stone.position.clone().sub(start);
    expect(delta.x).toBeCloseTo(0.02*Math.cos(angle*Math.PI/180),7);expect(delta.y).toBeCloseTo(0.02*Math.sin(angle*Math.PI/180)-4.9e-6,7);expect(delta.z).toBe(0);
  });
  it('supports zero sling length and holds reduced-motion geometry still',()=>{
    const s=engine('trebuchet',{slingLength:0});expect(s.ml.sling3).toBe(0);expect(s.ml.pouch.visible).toBe(false);expect(s.ml.cords.every(c=>!c.visible)).toBe(true);
    s.data={shotId:1,reduced:true};s.tick(0);const p=s.ml.stone.position.clone(),r=s.ml.arm.rotation.z;s.tick(5000);
    expect(s.ml.stone.visible).toBe(false);expect(s.ml.stone.position.equals(p)).toBe(true);expect(s.ml.arm.rotation.z).toBe(r);
  });
});

function targetWall(blocks,contrast=false,field=false){
  const builders={},batches=[];
  const host={registerTool(){},makeOrbitViewer(o){builders[o.attr]=o.build;return {attach(){},push(){},status(){return 'ready';},onStatusChange(){}};},
    makeVoxelBatch(three,o){const b={capacity:o.capacity,records:[],addTo(){},set(i,...v){this.records[i]=v;},commit(n){this.records.length=n;}};batches.push(b);return b;}};
  vm.runInNewContext(source,{window:{StemLab:host},console,setTimeout,clearTimeout});
  const s={model:new THREE.Group(),scene:new THREE.Scene(),data:{blocks}};
  builders[field ? 'data-machinelab-scene-gl' : 'data-machinelab-wall-gl'](THREE,s,{blocks,contrast,kind:'trebuchet',framing:'castle',geom:{}});s.tick(1000);return s;
}
describe('Machine Lab: readable wall damage',()=>{
  it('shows more than 24 cracked blocks and removes marks when damage resets',()=>{
    const blocks=Array.from({length:40},(_,i)=>({col:i%10,row:Math.floor(i/10),mat:'stone',state:'cracked'})),s=targetWall(blocks);
    expect(s.cracks.filter(c=>c.visible)).toHaveLength(40);
    s.data.blocks=blocks.map(b=>({...b,state:'intact'}));s.tick(1200);expect(s.cracks.some(c=>c.visible)).toBe(false);
  });
  it('puts finite crack geometry outside both wall faces',()=>{
    const s=targetWall([{col:0,row:0,state:'cracked',mat:'stone'}]);s.model.updateMatrixWorld(true);const c=s.cracks[0],p=c.geometry.attributes.position;
    expect(Array.from(p.array).every(Number.isFinite)).toBe(true);
    const depths=new Set();for(let i=0;i<p.count;i++){const v=new THREE.Vector3().fromBufferAttribute(p,i).applyMatrix4(c.matrixWorld);depths.add(v.z.toFixed(3));expect(Math.hypot(v.x,v.y-0.5)).toBeLessThan(0.45);}
    expect([...depths].sort()).toEqual(['-0.481','0.481']);
  });
  it('keeps fracture marks visible in high contrast',()=>{
    const s=targetWall([{col:0,row:0,state:'cracked',mat:'stone'}],true);expect(s.cracks[0].visible).toBe(true);expect(s.cracks[0].material.color.getHex()).toBe(0);expect(s.siegeRubble).toBeUndefined();
  });
  it('uses live settled transforms and clears the rotated rubble on reset',()=>{
    const s=targetWall([{col:0,row:0,state:'breached',mat:'stone'}]);expect(s.siegeRubble.mesh.count).toBe(0);
    s.data.rubbleRest={'0_0':[1.4,0.4,2.1,0.4,0.7,-0.3,0.6]};s.tick(1100);expect(s.siegeRubble.mesh.count).toBe(1);expect(s.wall.batch.records).toHaveLength(0);
    const matrix=new THREE.Matrix4(),position=new THREE.Vector3(),q=new THREE.Quaternion(),scale=new THREE.Vector3();s.siegeRubble.mesh.getMatrixAt(0,matrix);matrix.decompose(position,q,scale);
    expect(position.distanceTo(new THREE.Vector3(1.4,0.4,2.1))).toBeLessThan(1e-6);expect(q.angleTo(new THREE.Quaternion().setFromEuler(new THREE.Euler(0.4,0.7,-0.3)))).toBeLessThan(0.001);
    expect(Math.max(scale.x,scale.y,scale.z)).toBeLessThanOrEqual(0.600001);expect(s.siegeRubble.mesh.instanceColor.count).toBeGreaterThan(0);
    s.data.blocks=[{col:0,row:0,state:'intact',mat:'stone'}];s.tick(1200);expect(s.siegeRubble.mesh.count).toBe(0);expect(s.wall.batch.records).toHaveLength(1);
  });
  it('reveals new fractures only after the shot lands',()=>{
    const before=[{col:0,row:0,state:'intact',mat:'stone'}],after=[{...before[0],state:'cracked'}],s=targetWall(before);
    s.data={blocks:after,prevBlocks:before,flight:{id:1,seconds:1,path:[{x:0,y:2,z:0},{x:80,y:0.5,z:0}]}};
    s.tick(1000);expect(s.cracks.some(c=>c.visible)).toBe(false);s.tick(2100);expect(s.cracks[0].visible).toBe(true);
  });
});

it('spawns wall-impact chips outside the struck face, moving toward the viewer',()=>{
  const before=[{col:0,row:0,state:'intact',mat:'stone'}],s=targetWall(before,false,true);
  s.data={blocks:before,prevBlocks:before,outcomeKind:'hit',flight:{id:1,seconds:1,path:[{x:0,y:2,z:0},{x:80.8,y:0.5,z:0}]}};
  s.tick(1000);expect(s.burst.some(b=>b.visible)).toBe(false);s.tick(2100);
  expect(s.burst.every(b=>b.visible && b.position.z < -0.62 && b.userData.v.z < 0)).toBe(true);
  expect(new Set(s.burst.map(b=>b.geometry)).size).toBe(1);
  s.tick(4000);expect(s.burst.some(b=>b.visible)).toBe(false);
});

describe('Machine Lab: calibrated range instruments',()=>{
  for(const extent of [8,37,100,250,1000]) it('uses uniform round-number ticks within a '+extent+' m lane',()=>{
    const s=rangeScene(true,false,[{t:0,x:0,y:2,z:0},{t:4,x:extent,y:0,z:0}],{range:extent});
    const ruler=s.rangeScale;expect(ruler.major[0]).toBe(0);expect(ruler.major.length).toBeLessThanOrEqual(8);
    ruler.major.forEach((x,i)=>{expect(x).toBeLessThanOrEqual(extent);if(i)expect(x-ruler.major[i-1]).toBeCloseTo(ruler.step,8);});
    const p=ruler.grid.geometry.attributes.position;
    for(let i=0;i<p.count;i++){expect(p.getX(i)).toBeGreaterThanOrEqual(0);expect(p.getX(i)).toBeLessThanOrEqual(extent);expect(Math.abs(p.getZ(i))).toBeLessThanOrEqual(ruler.depth/2+1e-5);}
  });
  it('reveals the landing target and drift bracket only after arrival',()=>{
    const s=rangeScene(),g=s.rangeInstruments;expect(g.landing.visible).toBe(false);expect(g.driftGuide.visible).toBe(false);
    s.tick(4000);expect(g.landing.visible).toBe(true);expect(g.groundRing.visible).toBe(false);expect(g.driftGuide.visible).toBe(true);
    expect(g.landing.position.x).toBe(40);expect(g.landing.position.z).toBe(4);
    const p=g.driftGuide.geometry.attributes.position;expect(p.getZ(0)).toBe(0);expect(p.getZ(1)).toBe(4);expect(p.getX(0)).toBe(40);expect(p.getX(1)).toBe(40);
    s.data.shotId=0;s.tick(4500);expect(g.landing.visible).toBe(false);expect(g.driftGuide.visible).toBe(false);
  });
  it('keeps the neutral lane identical before predictions are revealed',()=>{
    const a=rangeScene(false,false,undefined,{drift:0,range:8,apex:2}),b=rangeScene(false,false,undefined,{drift:90,range:500,apex:180});
    expect(a.rangeScale.depth).toBe(b.rangeScale.depth);expect(a.rangeScale.major).toEqual(b.rangeScale.major);
    expect(b.rangeInstruments.landing).toBeNull();expect(b.rangeInstruments.driftGuide).toBeNull();
  });
  it('shows a stable landing target with reduced motion',()=>{
    const s=rangeScene(true,true),g=s.rangeInstruments;expect(g.landing.visible).toBe(true);const p=g.landing.position.clone();s.tick(12000);expect(g.landing.position.equals(p)).toBe(true);
  });
  it('keeps a zero-distance landing at the launch axis without a false drift bracket',()=>{
    const s=rangeScene(true,true,[{t:0,x:0,y:2,z:0},{t:4,x:0,y:0,z:0}],{range:0});expect(s.rangeInstruments.landing.position.x).toBe(0);expect(s.rangeInstruments.driftGuide).toBeNull();
  });
});


describe('Machine Lab: workshop lifting and pressing assemblies',()=>{
  for(const reduced of [false,true])it('keeps the press shoe on the load and the load on its base (reduced '+reduced+')',()=>{
    const s=scene('screw',{},reduced),d=s.mlDemo;
    for(const t of [100,650,1200,1750,2300]){
      s.tick(t);const loadHeight=d.pressLoad.geometry.parameters.height*d.pressLoad.scale.y;
      expect(d.pressLoad.position.y-loadHeight/2).toBeCloseTo(d.pressBaseY,8);
      expect(d.pressLoad.position.y+loadHeight/2).toBeCloseTo(0.91+d.pressShoe.position.y,8);
      expect(d.pressShoe.rotation.y).toBe(0);
    }
    s.data.demoId=0;s.tick(2400);expect(d.pressLoad.scale.y).toBe(1);expect(d.pressShoe.position.y).toBeCloseTo(0,8);
  });
  for(const handleR of [0.05,0.45,1])it('keeps the windlass wheel and load above the work bed at handle radius '+handleR,()=>{
    const s=scene('windlass',{handleR}),d=s.mlDemo;
    for(const t of [100,650,1200,1750,2300]){
      s.tick(t);s.model.updateMatrixWorld(true);
      let lowest=Infinity;const v=new THREE.Vector3();d.motion.traverse(mesh=>{const p=mesh.geometry?.attributes?.position;if(p)for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);lowest=Math.min(lowest,v.y);}});
      expect(lowest).toBeGreaterThan(0.28);
      expect(new THREE.Box3().setFromObject(d.load).min.y).toBeGreaterThan(0.28);
      const half=d.hangingRope.geometry.parameters.height*d.hangingRope.scale.y/2;
      expect(d.hangingRope.position.y+half).toBeCloseTo(d.axleY,8);
      expect(d.hangingRope.position.y-half).toBeCloseTo(d.load.position.y+0.36,8);
    }
  });
  it('joins the continuous winding to the hanging rope at its tangent',()=>{
    const d=scene('windlass').mlDemo,p=d.winding.geometry.parameters.path.getPoint(1);
    expect(p.x).toBeCloseTo(d.hangingRope.position.x,8);expect(p.y).toBeCloseTo(d.axleY,8);expect(p.z).toBeCloseTo(0,8);
    expect(Array.from(d.winding.geometry.attributes.position.array).every(Number.isFinite)).toBe(true);
  });
  it('advances workshop motion when the first frame timestamp is zero',()=>{
    const s=scene('windlass');s.mlDemoId=null;s.tick(0);s.tick(1100);expect(s.mlDemo.load.position.y).toBeCloseTo(s.mlDemo.loadY+0.72,8);
  });
});

describe('Machine Lab: supported lever and ramp assemblies',()=>{
  for(const reduced of [false,true])for(const [effortArm,loadArm] of [[2,1],[4,0.2],[0.2,4]])it(`keeps lever contacts, force directions and bed clearance at ${effortArm}:${loadArm}, reduced ${reduced}`,()=>{
    const s=scene('lever',{effortArm,loadArm},reduced),d=s.mlDemo;
    s.data.demoId=0;s.tick(0);s.model.updateMatrixWorld(true);
    const startEffort=d.motion.localToWorld(d.effortContact.clone());
    const startLoad=d.motion.localToWorld(d.loadContact.clone());
    s.data.demoId=2;s.tick(0);s.tick(1100);s.model.updateMatrixWorld(true);
    expect(d.motion.localToWorld(d.effortContact.clone()).y).toBeLessThan(startEffort.y);
    expect(d.motion.localToWorld(d.loadContact.clone()).y).toBeGreaterThan(startLoad.y);
    for(const t of [0,550,1100,1650,2200]){
      s.tick(t);s.model.updateMatrixWorld(true);
      const effort=d.motion.localToWorld(d.effortContact.clone()),load=d.motion.localToWorld(d.loadContact.clone());
      expect(d.effortArrow.position.x).toBeCloseTo(effort.x,8);
      expect(d.effortArrow.position.y-1.02).toBeCloseTo(effort.y,8);
      expect(d.loadArrow.position.x).toBeCloseTo(load.x,8);
      expect(d.loadArrow.position.y+0.83).toBeCloseTo(load.y,8);
      expect(d.effortArrow.rotation.z).toBe(0);expect(d.loadArrow.rotation.z).toBe(0);
      const bottom=d.leverLoad.localToWorld(new THREE.Vector3(0,-0.35,0));
      expect(bottom.distanceTo(load)).toBeLessThan(1e-7);
      let lowest=Infinity;const v=new THREE.Vector3();
      d.motion.traverse(mesh=>{const p=mesh.geometry?.attributes?.position;if(p)for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);lowest=Math.min(lowest,v.y);}});
      expect(lowest).toBeGreaterThan(0.28);
      const bounds=new THREE.Box3().setFromPoints(s.fitPts);
      expect(effort.x).toBeGreaterThan(bounds.min.x);expect(load.x).toBeLessThan(bounds.max.x);
    }
    s.data.demoId=0;s.tick(2300);expect(d.motion.rotation.z).toBe(d.baseRotation);
    expect(d.leverLoad.position.y).toBe(0.48);
  });
  for(const [length,height] of [[4,0.2],[4,1],[4,3.9],[4,4],[8,0.2]])it(`seats ramp supports on the base and underside at ${height}/${length}`,()=>{
    const d=scene('ramp',{length,height}).mlDemo;
    expect(d.rampSupports.length).toBeGreaterThanOrEqual(2);
    d.rampDeck.updateMatrixWorld(true);
    expect(new THREE.Box3().setFromObject(d.rampDeck).min.y).toBeGreaterThan(0.28);
    d.rampSupports.forEach(post=>{
      const half=post.geometry.parameters.height/2;
      expect(post.position.y-half).toBeCloseTo(0.34,8);
      const x=post.position.x,y=post.position.y+half-(0.42+5.4*height/length/2);
      expect(-x*Math.sin(d.angle)+y*Math.cos(d.angle)).toBeCloseTo(-0.12,8);
      expect(half).toBeGreaterThan(0);expect(Number.isFinite(half)).toBe(true);
    });
  });
});

describe('Machine Lab: wedge contact and splitting geometry',()=>{
  for(const reduced of [false,true])for(const [length,thickness] of [[0.3,0.06],[0.6,0.01],[0.05,0.2],[0.2,0.2]])it(`keeps the ${length}/${thickness} wedge attached and clear of the timber, reduced ${reduced}`,()=>{
    const s=scene('wedge',{length,thickness},reduced),d=s.mlDemo;
    expect(d.wedgeLength/(2*d.wedgeHalf)).toBeCloseTo(length/thickness,8);
    for(const t of [100,650,1200,1750,2300]){
      s.tick(t);s.model.updateMatrixWorld(true);
      d.woodHalves.forEach(half=>expect(new THREE.Box3().setFromObject(half).min.y).toBeCloseTo(0.4,6));
      expect(d.splitLeft.rotation.z).toBe(0);expect(d.splitRight.rotation.z).toBe(0);
      expect(d.splitLeft.position.x).toBeCloseTo(-d.splitRight.position.x,8);
      expect(new THREE.Box3().setFromObject(d.motion).min.y).toBeGreaterThan(0.4);
      // Slice actual blade triangles at the timber's upper edge. Neither face may
      // overlap the solid wood, including the bevel at the broadest setting.
      const positions=d.motion.geometry.attributes.position,level=d.woodTop-d.motion.position.y;
      let bladeEdge=0;
      for(let i=0;i<positions.count;i+=3)for(let e=0;e<3;e++){
        const a=i+e,b=i+(e+1)%3,ya=positions.getY(a),yb=positions.getY(b);
        if(Math.abs(ya-yb)<1e-8 || level<Math.min(ya,yb) || level>Math.max(ya,yb))continue;
        const f=(level-ya)/(yb-ya);bladeEdge=Math.max(bladeEdge,Math.abs(positions.getX(a)+f*(positions.getX(b)-positions.getX(a))));
      }
      expect(bladeEdge).toBeGreaterThan(0);
      expect(bladeEdge).toBeLessThanOrEqual(d.splitRight.position.x+1e-6);
      const capBottom=d.strikingCap.getWorldPosition(new THREE.Vector3()).y-0.06;
      expect(capBottom).toBeCloseTo(d.motion.position.y+d.wedgeLength/2,8);
      expect(d.effortArrow.position.y-capBottom).toBeCloseTo(0.93,8);
      d.splitArrows.forEach(a=>expect(a.position.x-a.userData.mlSide*d.splitRight.position.x).toBeCloseTo(a.userData.mlSide*0.7,8));
    }
    s.data.demoId=0;s.tick(2400);expect(d.motion.position.y).toBe(d.baseY);expect(d.splitRight.position.x).toBeCloseTo(d.wedgeStartGap,8);
  });
  it('matches the opening-distance ratio to the selected wedge advantage',()=>{
    for(const [length,thickness] of [[0.3,0.06],[0.6,0.01],[0.05,0.2]]){
      const s=scene('wedge',{length,thickness}),d=s.mlDemo;s.data.demoId=0;s.tick(0);
      const before=d.splitRight.position.x-d.splitLeft.position.x;s.data.demoId=2;s.tick(0);s.tick(1100);
      const opening=d.splitRight.position.x-d.splitLeft.position.x-before,travel=d.baseY-d.motion.position.y;
      expect(travel/opening).toBeCloseTo(length/thickness,8);
    }
  });
});

describe('Machine Lab: continuous pulley reeving',()=>{
  for(const reduced of [false,true])for(const segments of [1,2,3,4,5,6])it(`conserves rope and follows each of ${segments} supporting strands, reduced ${reduced}`,()=>{
    const s=scene('pulley',{segments},reduced),d=s.mlDemo;
    const straightLength=()=>d.supportingRopes.reduce((sum,r)=>sum+r.geometry.parameters.height*r.scale.y,0)+d.freeRope.geometry.parameters.height*d.freeRope.scale.y;
    s.data.demoId=0;s.tick(0);const originalLength=straightLength();
    expect(d.pulleyWheels.filter(w=>w.moving)).toHaveLength(Math.floor(segments/2));
    expect(d.pulleyWheels.filter(w=>!w.moving)).toHaveLength(Math.ceil(segments/2));
    s.data.demoId=2;s.tick(0);
    const ropeEnd=(rope,upper)=>new THREE.Vector3(0,(upper?1:-1)*rope.geometry.parameters.height/2,0).applyMatrix4(rope.matrixWorld);
    for(const t of [0,550,1100,1650,2200]){
      s.tick(t);s.model.updateMatrixWorld(true);
      expect(straightLength()).toBeCloseTo(originalLength,8);
      expect(d.gripY-d.pullGrip.position.y).toBeCloseTo(segments*d.motion.position.y,8);
      d.ropeArcs.forEach((arc,i)=>{
        const path=arc.geometry.parameters.path,moving=d.pulleyWheels[i].moving;
        const left=arc.localToWorld(path.getPoint(0).clone()),right=arc.localToWorld(path.getPoint(1).clone());
        expect(left.distanceTo(ropeEnd(d.supportingRopes[i],!moving))).toBeLessThan(1e-6);
        expect(right.distanceTo(ropeEnd(i+1<segments?d.supportingRopes[i+1]:d.freeRope,!moving))).toBeLessThan(1e-6);
      });
      expect(d.ropeAnchor.getWorldPosition(new THREE.Vector3()).distanceTo(ropeEnd(d.supportingRopes[0],segments%2===0))).toBeLessThan(1e-6);
      expect(d.pullGrip.getWorldPosition(new THREE.Vector3()).distanceTo(ropeEnd(d.freeRope,false))).toBeLessThan(1e-6);
      expect(new THREE.Box3().setFromObject(d.pulleyLoad).min.y).toBeGreaterThan(0.28);
      expect(new THREE.Box3().setFromObject(d.pullGrip).min.y).toBeGreaterThan(0.28);
      expect(d.loadArrow.position.y-d.loadArrow.userData.mlBaseY).toBeCloseTo(d.motion.position.y,8);
      expect(d.effortArrow.userData.mlBaseY-d.effortArrow.position.y).toBeCloseTo(d.gripY-d.pullGrip.position.y,8);
      // Tangential rim travel must match on both sides of every wheel. The
      // final side must equal the actual displacement of the hand grip.
      let ropeTravel=segments%2?d.motion.position.y:0;
      d.pulleyWheels.forEach(w=>{
        const centerTravel=w.moving?d.motion.position.y:0,rotationTravel=w.mesh.rotation.z*0.28;
        expect(centerTravel-rotationTravel).toBeCloseTo(ropeTravel,8);
        ropeTravel=centerTravel+rotationTravel;
      });
      expect(ropeTravel).toBeCloseTo(d.pullGrip.position.y-d.gripY,8);
    }
    s.data.demoId=0;s.tick(2300);expect(d.motion.position.y).toBe(0);expect(d.pullGrip.position.y).toBe(d.gripY);
    expect(d.pulleyWheels.every(w=>w.mesh.rotation.z===0)).toBe(true);
  });
});

describe('Machine Lab: distance tracks share a true linear scale',()=>{
  for(const reduced of [false,true])for(const ma of [0.05,0.25,1,2,6,40,200,Math.PI*1000])it(`preserves the ${ma} ratio in geometry and motion, reduced ${reduced}`,()=>{
    const s=scene('lever',{ma},reduced),d=s.mlDemo;
    expect(d.effortStartX).toBe(d.loadStartX);
    expect(d.effortTrack.geometry.parameters.width/d.loadTrack.geometry.parameters.width).toBeCloseTo(ma,8);
    expect(Math.max(d.effortTrack.geometry.parameters.width,d.loadTrack.geometry.parameters.width)).toBeCloseTo(6.1,8);
    for(const t of [100,650,1200,1750,2300]){
      s.tick(t);s.model.updateMatrixWorld(true);
      const a=d.effortDot.position.x-d.effortStartX,b=d.loadDot.position.x-d.loadStartX;
      if(b>1e-10)expect(a/b).toBeCloseTo(ma,5);
      expect(d.effortDot.position.x).toBeGreaterThanOrEqual(d.effortStartX);
      expect(d.loadDot.position.x).toBeGreaterThanOrEqual(d.loadStartX);
      for(const track of [d.effortTrack,d.loadTrack]){
        expect(track.visible).toBe(true);const box=new THREE.Box3().setFromObject(track);
        expect(box.min.x).toBeGreaterThan(-3.3);expect(box.max.x).toBeLessThan(3.3);
        expect(box.min.y).toBeGreaterThan(0.38);
      }
    }
    s.data.demoId=0;s.tick(2400);expect(d.effortDot.position.x).toBe(d.effortStartX);expect(d.loadDot.position.x).toBe(d.loadStartX);
  });
  for(const ma of [undefined,null,0,-1,NaN])it(`does not invent a comparison for invalid advantage ${ma}`,()=>{
    const d=scene('lever',{ma}).mlDemo;
    expect(d.distanceValid).toBe(false);expect(d.effortTrack.visible).toBe(false);expect(d.loadTrack.visible).toBe(false);
    expect(d.effortDot.visible).toBe(false);expect(d.loadDot.visible).toBe(false);
    expect([...d.effortTrail,...d.loadTrail].some(x=>x.visible)).toBe(false);
  });
});


describe('Machine Lab: held working-stroke inspection',()=>{
  for(const kind of ['lever','pulley','windlass','ramp','wedge','screw'])for(const reduced of [false,true])it('holds linear '+kind+' poses with reduced motion '+reduced,()=>{
    const s=scene(kind,{ma:2,segments:6},reduced),d=s.mlDemo;
    s.data.demoId=0;
    function measured(){
      if(kind==='lever')return (d.motion.rotation.z-d.baseRotation)/d.leverTravel;
      if(kind==='pulley')return d.motion.position.y/d.pulleyLift;
      if(kind==='windlass')return (d.load.position.y-d.loadY)/0.72;
      if(kind==='ramp')return d.motion.position.clone().sub(new THREE.Vector3(d.baseX,d.baseY,0)).length()/1.45;
      if(kind==='wedge')return (d.baseY-d.motion.position.y)/d.wedgeTravel;
      return -d.pressShoe.position.y/d.screwTravel;
    }
    function snapshot(){return [measured(),d.effortDot.position.x,d.loadDot.position.x,...d.lamps.map(x=>x.material.emissiveIntensity),...d.beacons.map(x=>x.scale.x)];}
    for(const progress of [0,0.25,0.5,1,0.37,0]){
      s.data.motionProgress=progress;s.tick(3000);
      expect(measured()).toBeCloseTo(progress,8);
      expect((d.effortDot.position.x-d.effortStartX)/(d.effortEndX-d.effortStartX)).toBeCloseTo(progress,8);
      expect((d.loadDot.position.x-d.loadStartX)/(d.loadEndX-d.loadStartX)).toBeCloseTo(progress,8);
      expect(d.effortTrail.some(x=>x.visible)).toBe(progress>0.04);
      const before=snapshot();s.tick(300000);expect(snapshot()).toEqual(before);
    }
  });
  for(const [value,expected] of [[-2,0],[3,1],[NaN,0],[Infinity,0],[null,0],[undefined,0],['0.5',0]])it('handles invalid or out-of-range inspection '+String(value),()=>{
    const s=scene('screw');s.data={demoId:0,motionProgress:value};s.tick(3000);
    expect(s.mlDemo.pressShoe.position.y).toBeCloseTo(-s.mlDemo.screwTravel*expected,8);
  });
  it('lets a new demonstration take over a held pose',()=>{
    const s=scene('screw');s.data={demoId:0,motionProgress:1};s.tick(3000);
    s.data.demoId=2;s.tick(4000);expect(s.mlDemo.pressShoe.position.y).toBeCloseTo(0,8);
    s.tick(5100);expect(s.mlDemo.pressShoe.position.y).toBeCloseTo(-s.mlDemo.screwTravel,8);
  });
});


describe('Machine Lab: rotational force guides',()=>{
  for(const kind of ['windlass','screw'])for(const handleR of [0.05,0.5,1])for(const reduced of [false,true])it('tracks the '+kind+' grip tangent at radius '+handleR+' with reduced motion '+reduced,()=>{
    const s=scene(kind,{handleR,ma:4},reduced),d=s.mlDemo;
    s.data.demoId=0;
    const guideGeometry=d.turnGuide.children[0].geometry;
    for(const progress of [0,0.125,0.25,0.5,0.75,1,0.37]){
      s.data.motionProgress=progress;s.tick(4000);s.model.updateMatrixWorld(true);
      const direction=new THREE.Vector3(0,-1,0).applyQuaternion(d.effortArrow.quaternion);
      const gripObject=kind==='screw'?d.screwGrip:d.wheelGrip;
      const grip=gripObject.getWorldPosition(new THREE.Vector3());
      const axis=kind==='screw'?new THREE.Vector3(0,1,0):new THREE.Vector3(0,0,1);
      const radial=kind==='screw'?new THREE.Vector3(grip.x,0,grip.z):new THREE.Vector3(grip.x,grip.y-d.axleY,0);
      const expected=axis.clone().cross(radial).normalize();
      expect(direction.dot(expected)).toBeCloseTo(1,8);
      expect(direction.dot(radial.clone().normalize())).toBeCloseTo(0,8);
      const tip=d.effortArrow.position.clone().addScaledVector(direction,kind==='screw'?0.79:0.84);
      if(kind==='screw'){
        expect(tip.x).toBeCloseTo(grip.x,8);expect(tip.z).toBeCloseTo(grip.z,8);
        expect(tip.y-grip.y).toBeCloseTo(0.25,8);
        expect(d.turnGuide.position.y).toBeCloseTo(3.94-d.screwTravel*progress,8);
        expect(d.loadArrow.position.y-d.loadArrow.userData.mlBaseY).toBeCloseTo(-d.screwTravel*progress,8);
        expect(new THREE.Vector3(0,-1,0).applyQuaternion(d.loadArrow.quaternion).y).toBe(-1);
      }else{
        expect(tip.x).toBeCloseTo(grip.x,8);expect(tip.y).toBeCloseTo(grip.y,8);
        expect(tip.z-grip.z).toBeCloseTo(0.4,8);
        expect(d.loadArrow.position.y-d.loadArrow.userData.mlBaseY).toBeCloseTo(0.72*progress,8);
        expect(d.turnGuide.position.y).toBe(d.axleY);
      }
      expect(d.loadArrow.scale.toArray()).toEqual([1,1,1]);
      expect(d.turnGuide.children[0].geometry).toBe(guideGeometry);
    }
  });
  for(const kind of ['windlass','screw'])it('points the curved '+kind+' guide in the same direction as rotation',()=>{
    const d=scene(kind).mlDemo,g=d.turnGuide,head=g.children[1];
    const direction=new THREE.Vector3(0,1,0).applyQuaternion(head.quaternion);
    const axis=kind==='screw'?new THREE.Vector3(0,1,0):new THREE.Vector3(0,0,1);
    expect(direction.dot(axis.clone().cross(head.position).normalize())).toBeGreaterThan(0.99);
    expect(direction.dot(axis)).toBeCloseTo(0,8);
    expect(g.children[0].geometry.parameters.path.getPoints(20).every(p=>Math.abs(p.length()-g.userData.mlRadius)<0.003)).toBe(true);
  });
});


describe('Machine Lab: ramp travel rail and rising load cue',()=>{
  for(const height of [0.2,1,3,3.9,4])for(const reduced of [false,true])it('tracks the crate at slope '+height+'/4 with reduced motion '+reduced,()=>{
    const s=scene('ramp',{length:4,height,ma:4/height},reduced),d=s.mlDemo;
    s.data.demoId=0;
    const normal=new THREE.Vector3(-Math.sin(d.angle),Math.cos(d.angle),0);
    const slope=new THREE.Vector3(Math.cos(d.angle),Math.sin(d.angle),0);
    const geometry=d.rampTravelFill.geometry;
    for(const progress of [0,0.01,0.25,0.5,0.75,1,0.37,0]){
      s.data.motionProgress=progress;s.tick(3000);s.model.updateMatrixWorld(true);
      const marker=d.rampTravelCursor.getWorldPosition(new THREE.Vector3());
      const expected=d.motion.position.clone().addScaledVector(normal,-0.295);expected.z=1.26;
      expect(marker.distanceTo(expected)).toBeLessThan(1e-8);
      expect(d.loadArrow.position.x-d.motion.position.x).toBeCloseTo(0.82,8);
      expect(d.loadArrow.position.y-d.motion.position.y).toBeCloseTo(-0.35,8);
      expect(d.loadArrow.scale.toArray()).toEqual([1,1,1]);
      expect(d.loadArrow.rotation.z).toBe(0);
      expect(d.rampTravelFill.geometry).toBe(geometry);
      expect(d.rampTravelFill.visible).toBe(progress>0);
      expect(d.rampTravelFill.position.x-0.725*d.rampTravelFill.scale.x).toBeCloseTo(0,8);
      expect(d.rampTravelFill.position.x+0.725*d.rampTravelFill.scale.x).toBeCloseTo(1.45*progress,8);
      const point=d.rampTravel.localToWorld(new THREE.Vector3(1.45*progress,0,0));
      expect(point.distanceTo(marker)).toBeLessThan(1e-8);
      const origin=d.rampTravel.getWorldPosition(new THREE.Vector3());
      expect(marker.clone().sub(origin).dot(slope)).toBeCloseTo(1.45*progress,8);
      const before=[...marker.toArray(),...d.loadArrow.position.toArray()];s.tick(300000);s.model.updateMatrixWorld(true);
      expect([...d.rampTravelCursor.getWorldPosition(new THREE.Vector3()).toArray(),...d.loadArrow.position.toArray()]).toEqual(before);
    }
  });
  it('also follows the normal playback cycle and clears on reset',()=>{
    const s=scene('ramp',{length:4,height:1,ma:4}),d=s.mlDemo;
    for(const time of [100,650,1200,1750,2300]){
      s.tick(time);const travel=(d.motion.position.x-d.baseX)/Math.cos(d.angle);
      expect(d.rampTravelCursor.position.x).toBeCloseTo(travel,8);
    }
    s.data.demoId=0;s.tick(2400);expect(d.rampTravelFill.visible).toBe(false);expect(d.rampTravelCursor.position.x).toBe(0);
  });
});


describe('Machine Lab: focus mechanism scene isolation',()=>{
  for(const kind of ['lever','pulley','windlass','ramp','wedge','screw'])for(const reduced of [false,true])it('isolates '+kind+' without changing the held pose, reduced '+reduced,()=>{
    const s=scene(kind,{ma:4},reduced),d=s.mlDemo;s.data={demoId:0,motionProgress:0.37};s.tick(3000);
    const objects=[];s.model.traverse(x=>objects.push(x));const ids=objects.map(x=>x.uuid);
    const pose=()=>[...d.motion.position.toArray(),...d.motion.quaternion.toArray(),...d.effortArrow.position.toArray(),d.effortDot.position.x,d.loadDot.position.x];
    const before=pose(),target=s.target.clone(),fit=s.fitPts.map(x=>x.clone());
    expect(d.room.visible).toBe(true);expect(d.room.children.length).toBeGreaterThan(20);
    const withinRoom=x=>{for(let p=x;p;p=p.parent)if(p===d.room)return true;return false;};
    [...d.lamps,...d.beacons].forEach(x=>expect(withinRoom(x)).toBe(true));
    [d.motion,d.effortArrow,d.effortTrack,d.loadTrack,d.effortDot,d.loadDot].forEach(x=>expect(withinRoom(x)).toBe(false));
    s.data.focusMechanism=true;s.tick(4000);expect(d.room.visible).toBe(false);expect(pose()).toEqual(before);
    expect(s.target.equals(target)).toBe(true);s.fitPts.forEach((x,i)=>expect(x.equals(fit[i])).toBe(true));
    s.data.focusMechanism=false;s.tick(5000);expect(d.room.visible).toBe(true);expect(pose()).toEqual(before);
    const after=[];s.model.traverse(x=>after.push(x.uuid));expect(after).toEqual(ids);
  });
  it('keeps the automatic demonstration moving when the room is hidden',()=>{
    const s=scene('pulley',{ma:2}),d=s.mlDemo;s.data.focusMechanism=true;s.tick(650);const half=d.motion.position.y;s.tick(1200);
    expect(d.room.visible).toBe(false);expect(d.motion.position.y).toBeGreaterThan(half);
  });
});


describe('Machine Lab: distance markers carry distinct shapes',()=>{
  for(const kind of ['lever','pulley','windlass','ramp','wedge','screw'])for(const reduced of [false,true])it('preserves shape and track clearance for '+kind+', reduced '+reduced,()=>{
    const s=scene(kind,{ma:2},reduced),d=s.mlDemo;s.data.demoId=0;
    expect(d.effortDot.geometry.type).toBe('OctahedronGeometry');expect(d.loadDot.geometry.type).toBe('TorusGeometry');
    expect(d.loadDot.geometry.parameters.radius).toBeGreaterThan(d.loadDot.geometry.parameters.tube*3);
    for(const progress of [0,0.25,0.5,1]){
      s.data.motionProgress=progress;s.tick(3000);s.model.updateMatrixWorld(true);
      for(const marker of [d.effortDot,d.loadDot]){
        const bounds=new THREE.Box3().setFromObject(marker);
        expect(bounds.min.y).toBeGreaterThan(0.422);
        expect(bounds.min.x).toBeGreaterThan(-3.3);expect(bounds.max.x).toBeLessThan(3.3);
      }
      expect(d.effortDot.position.x-d.effortStartX).toBeCloseTo((d.effortEndX-d.effortStartX)*progress,8);
      expect(d.loadDot.position.x-d.loadStartX).toBeCloseTo((d.loadEndX-d.loadStartX)*progress,8);
    }
  });
  it('keeps the open ring facing the camera without moving it or changing its geometry',()=>{
    const s=scene('pulley',{ma:6}),d=s.mlDemo;s.data={demoId:0,motionProgress:0.5};
    s.camera=new THREE.PerspectiveCamera(45,1,0.1,100);
    const geometry=d.loadDot.geometry;
    for(const [yaw,pitch] of [[0,0],[Math.PI,0.3],[1.3,1.2],[-1.5,-0.7]]){
      s.camera.quaternion.setFromEuler(new THREE.Euler(pitch,yaw,0));s.tick(3000);
      d.loadDot.onBeforeRender(null,s.scene,s.camera);
      expect(Math.abs(d.loadDot.quaternion.dot(s.camera.quaternion))).toBeCloseTo(1,8);
      expect(d.loadDot.geometry).toBe(geometry);expect(d.loadDot.position.x).toBeCloseTo(d.loadStartX+(d.loadEndX-d.loadStartX)/2,8);
      s.model.updateMatrixWorld(true);
      // Rotating an axis-aligned box exaggerates a ring's extent. Check the
      // transformed surface vertices so the assertion measures actual clearance.
      const vertices=d.loadDot.geometry.attributes.position,point=new THREE.Vector3();let lowest=Infinity;
      for(let i=0;i<vertices.count;i++){point.fromBufferAttribute(vertices,i).applyMatrix4(d.loadDot.matrixWorld);lowest=Math.min(lowest,point.y);}
      expect(lowest).toBeGreaterThan(0.422);
    }
  });
});


describe('Machine Lab: lever arm guides preserve selected leverage',()=>{
  for(const [effortArm,loadArm] of [[2,1],[2,2],[4,0.2],[0.2,4],[0.2,0.2]])for(const reduced of [false,true])it('shows exact contact-arm ratio '+effortArm+':'+loadArm+', reduced '+reduced,()=>{
    const s=scene('lever',{effortArm,loadArm,ma:effortArm/loadArm},reduced),d=s.mlDemo;
    expect(-d.effortContact.x/d.loadContact.x).toBeCloseTo(effortArm/loadArm,10);
    const beam=d.leverBeam,half=beam.geometry.parameters.width/2;
    expect(d.effortContact.x-(beam.position.x-half)).toBeCloseTo(0.42,8);
    expect(beam.position.x+half-d.loadContact.x).toBeCloseTo(0.42,8);
    expect(d.armGuides).toHaveLength(2);
    for(const g of d.armGuides){
      expect(g.group.parent).toBe(d.motion);
      expect(g.effort.geometry.parameters.width/g.load.geometry.parameters.width).toBeCloseTo(effortArm/loadArm,10);
      expect(g.effort.position.x+g.effort.geometry.parameters.width/2).toBeCloseTo(0,8);
      expect(g.load.position.x-g.load.geometry.parameters.width/2).toBeCloseTo(0,8);
      expect(g.effort.position.x-g.effort.geometry.parameters.width/2).toBeCloseTo(d.effortContact.x,8);
      expect(g.load.position.x+g.load.geometry.parameters.width/2).toBeCloseTo(d.loadContact.x,8);
      expect(Math.abs(g.group.position.z)).toBeGreaterThan(0.73);
    }
    s.data.demoId=0;
    for(const progress of [0,0.25,0.5,1]){
      s.data.motionProgress=progress;s.tick(3000);s.model.updateMatrixWorld(true);
      let lowest=Infinity;const v=new THREE.Vector3();
      d.motion.traverse(mesh=>{const p=mesh.geometry?.attributes?.position;if(p)for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(mesh.matrixWorld);lowest=Math.min(lowest,v.y);}});
      expect(lowest).toBeGreaterThan(0.28);
      const pivot=d.motion.localToWorld(new THREE.Vector3());
      const effort=d.motion.localToWorld(new THREE.Vector3(d.effortContact.x,0,0));
      const load=d.motion.localToWorld(new THREE.Vector3(d.loadContact.x,0,0));
      expect(effort.distanceTo(pivot)/load.distanceTo(pivot)).toBeCloseTo(effortArm/loadArm,8);
    }
  });
});


describe('Machine Lab: equal-tension pulley support cues',()=>{
  for(const segments of [1,2,3,4,5,6])for(const reduced of [false,true])it('identifies exactly '+segments+' supporting strands, reduced '+reduced,()=>{
    const s=scene('pulley',{segments,ma:segments},reduced),d=s.mlDemo;
    expect(d.supportCues).toHaveLength(segments);
    const geometries=d.supportCues.map(c=>c.children.map(m=>m.geometry));
    s.data.demoId=0;
    for(const progress of [0,0.25,0.5,1,0.37,0]){
      s.data.motionProgress=progress;s.tick(3000);s.model.updateMatrixWorld(true);
      d.supportCues.forEach((cue,index)=>{
        const rope=d.supportingRopes[index],bounds=new THREE.Box3().setFromObject(cue);
        expect(cue.position.x).toBe(rope.position.x);expect(cue.position.y).toBe(rope.position.y);
        expect(cue.position.x).toBeLessThan(d.freeRope.position.x-0.3);
        expect(cue.scale.toArray()).toEqual([1,1,1]);expect(cue.rotation.toArray().slice(0,3)).toEqual([0,0,0]);
        expect(bounds.min.y).toBeGreaterThan(d.pulleyBottom+d.motion.position.y+0.05);
        expect(bounds.max.y).toBeLessThan(d.pulleyTop-0.05);
        expect(bounds.min.z).toBeGreaterThan(0.24);
        expect(bounds.max.x-bounds.min.x).toBeLessThan(0.2);
        expect(bounds.max.y-bounds.min.y).toBeCloseTo(0.4,6);
        cue.children.forEach((mesh,i)=>expect(mesh.geometry).toBe(geometries[index][i]));
        const head=cue.children[1],direction=new THREE.Vector3(0,1,0).applyQuaternion(head.quaternion).applyQuaternion(cue.quaternion);
        expect(direction.toArray()).toEqual([0,1,0]);
      });
    }
    s.data.focusMechanism=true;s.tick(4000);expect(d.room.visible).toBe(false);
    d.supportCues.forEach(cue=>expect(cue.parent).toBe(s.model));
  });
});


describe('Machine Lab: traveled-distance fills',()=>{
  for(const kind of ['lever','pulley','windlass','ramp','wedge','screw'])for(const reduced of [false,true])it('fills exact traveled distances for '+kind+', reduced '+reduced,()=>{
    for(const ma of [0.05,1,6,Math.PI*1000]){
      const s=scene(kind,{ma},reduced),d=s.mlDemo;s.data.demoId=0;
      const geometry=[d.effortFill.geometry,d.loadFill.geometry];
      for(const progress of [0,0.01,0.25,0.5,1,0.37,0]){
        s.data.motionProgress=progress;s.tick(3000);s.model.updateMatrixWorld(true);
        for(const [fill,track,dot,start,end,index] of [[d.effortFill,d.effortTrack,d.effortDot,d.effortStartX,d.effortEndX,0],[d.loadFill,d.loadTrack,d.loadDot,d.loadStartX,d.loadEndX,1]]){
          expect(fill.visible).toBe(progress>0);expect(fill.geometry).toBe(geometry[index]);
          const half=fill.geometry.parameters.width*fill.scale.x/2;
          expect(fill.position.x-half).toBeCloseTo(start,10);
          expect(fill.position.x+half).toBeCloseTo(dot.position.x,10);
          expect(half*2).toBeCloseTo((end-start)*progress,10);
          expect(fill.geometry.parameters.depth).toBeGreaterThan(track.geometry.parameters.depth*3);
          expect(fill.parent).toBe(s.model);
          const top=fill.position.y+fill.geometry.parameters.height/2;
          expect(top).toBeGreaterThan(track.position.y+track.geometry.parameters.height/2);
          expect(top).toBeLessThan(new THREE.Box3().setFromObject(dot).min.y);
        }
        if(progress>0)expect((d.effortFill.geometry.parameters.width*d.effortFill.scale.x)/(d.loadFill.geometry.parameters.width*d.loadFill.scale.x)).toBeCloseTo(ma,8);
      }
    }
  });
  for(const ma of [undefined,null,0,-1,NaN])it('hides fills for invalid advantage '+ma,()=>{
    const s=scene('lever',{ma}),d=s.mlDemo;s.data={demoId:0,motionProgress:0.5};s.tick(3000);
    expect(d.effortFill.visible).toBe(false);expect(d.loadFill.visible).toBe(false);
  });
  it('follows playback and clears the traveled bars on reset',()=>{
    const s=scene('pulley',{ma:6,segments:6}),d=s.mlDemo;
    for(const t of [100,650,1200,1750,2300]){
      s.tick(t);
      for(const [fill,dot] of [[d.effortFill,d.effortDot],[d.loadFill,d.loadDot]]){
        expect(fill.position.x+fill.geometry.parameters.width*fill.scale.x/2).toBeCloseTo(dot.position.x,10);
      }
    }
    s.data.demoId=0;s.tick(2500);expect(d.effortFill.visible).toBe(false);expect(d.loadFill.visible).toBe(false);
  });
});


describe('Machine Lab: screw lead and visible compression',()=>{
  for(const pitch of [0.001,0.002,0.005,0.007,0.01,0.02])for(const reduced of [false,true])it('keeps the thread engaged at pitch '+pitch+', reduced '+reduced,()=>{
    const s=scene('screw',{pitch,ma:20},reduced),d=s.mlDemo;
    s.data={demoId:0,motionProgress:0};s.tick(3000);s.model.updateMatrixWorld(true);
    const path=d.screwThread.geometry.parameters.path,points=path.points;
    const lead=points[32].y-points[0].y;
    expect(d.screwTravel).toBeCloseTo(lead,10);
    const reference=d.screwThread.localToWorld(path.getPoint(0.8));
    expect(reference.y).toBeGreaterThan(2.52);expect(reference.y).toBeLessThan(2.84);
    const radius=d.screwThread.geometry.parameters.radius,core=d.screwShaft.geometry.parameters.radiusTop;
    expect(radius*2).toBeLessThan(lead);
    expect(points[0].x-radius).toBeLessThan(core);expect(points[0].x+radius).toBeGreaterThan(core);
    const geometry=d.screwThread.geometry;expect(d.pressBands).toHaveLength(6);
    for(const progress of [0,0.125,0.25,0.5,0.75,1,0]){
      s.data.motionProgress=progress;s.tick(4000);s.model.updateMatrixWorld(true);
      // Follow a point one revolution farther along the helix as the shaft
      // turns. Its world position must stay fixed in the stationary nut.
      const engaged=d.screwThread.localToWorld(path.getPoint(0.8+progress*32/(points.length-1)));
      expect(engaged.distanceTo(reference)).toBeLessThan(0.00001);
      expect(d.screwThread.geometry).toBe(geometry);
      const height=d.pressLoad.geometry.parameters.height*d.pressLoad.scale.y;
      expect(height).toBeGreaterThan(0.14);
      expect(d.pressLoad.position.y-height/2).toBeCloseTo(d.pressBaseY,8);
      expect(d.pressLoad.position.y+height/2).toBeCloseTo(0.91+d.pressShoe.position.y,8);
      expect(d.pressShoe.position.y).toBeCloseTo(-lead*progress,8);
      expect(d.pressShoe.rotation.toArray().slice(0,3)).toEqual([0,0,0]);
      expect(d.pressLoad.rotation.toArray().slice(0,3)).toEqual([0,0,0]);
      const shaftTop=d.screwShaft.localToWorld(new THREE.Vector3(0,d.screwShaft.geometry.parameters.height/2,0));
      expect(shaftTop.y).toBeCloseTo(d.screwGrip.getWorldPosition(new THREE.Vector3()).y,8);
      for(const band of d.pressBands){
        expect(band.parent).toBe(d.pressLoad);
        const position=band.getWorldPosition(new THREE.Vector3());
        expect(Math.abs(position.z)).toBeGreaterThan(0.775);
        expect(position.y).toBeGreaterThan(d.pressBaseY);
        expect(position.y).toBeLessThan(d.pressBaseY+height);
      }
      const top=d.pressBands[2].getWorldPosition(new THREE.Vector3()),bottom=d.pressBands[0].getWorldPosition(new THREE.Vector3());
      expect(top.y-bottom.y).toBeCloseTo(height/2,8);
    }
  });
});


describe('Machine Lab: visible wheel-and-drum coupling',()=>{
  for(const [handleR,drumR] of [[0.05,0.02],[0.45,0.1],[1,0.5],[0.05,0.5],[1,0.02],[0.45,0.25]])for(const reduced of [false,true])it('keeps marks coupled at radii '+handleR+'/'+drumR+', reduced '+reduced,()=>{
    const s=scene('windlass',{handleR,drumR,ma:handleR/drumR},reduced),d=s.mlDemo;s.data.demoId=0;
    expect(d.drumStripes).toHaveLength(2);expect(d.drumMarks).toHaveLength(4);
    const geometry=d.drumRotor.children.map(x=>x.geometry),winding=d.winding.geometry;
    for(const progress of [0,0.125,0.25,0.5,0.75,1,0.37,0]){
      s.data.motionProgress=progress;s.tick(3000);s.model.updateMatrixWorld(true);
      expect(d.drumRotor.rotation.z).toBe(d.motion.rotation.z);expect(d.drum.rotation.y).toBe(d.motion.rotation.z);
      const grip=d.wheelMark.getWorldPosition(new THREE.Vector3());grip.y-=d.axleY;grip.z=0;grip.normalize();
      for(const marker of d.drumMarks){
        const p=marker.getWorldPosition(new THREE.Vector3());p.y-=d.axleY;p.z=0;
        expect(p.normalize().dot(grip)).toBeCloseTo(1,8);expect(marker.parent).toBe(d.drumRotor);
      }
      for(const stripe of d.drumStripes){
        const p=stripe.getWorldPosition(new THREE.Vector3());p.y-=d.axleY;p.z=0;
        expect(Math.abs(p.normalize().dot(grip))).toBeCloseTo(1,8);
        const bounds=new THREE.Box3().setFromObject(stripe);
        expect(bounds.min.z).toBeGreaterThan(0.1);expect(bounds.max.z).toBeLessThan(0.95);
        expect(bounds.min.y).toBeGreaterThan(0.28);
        expect(Math.hypot(stripe.position.x,stripe.position.y)-stripe.geometry.parameters.width/2).toBeLessThan(d.drum.geometry.parameters.radiusTop);
      }
      d.drumRotor.children.forEach((x,i)=>expect(x.geometry).toBe(geometry[i]));expect(d.winding.geometry).toBe(winding);
      const ropeHalf=d.hangingRope.geometry.parameters.height*d.hangingRope.scale.y/2;
      expect(d.hangingRope.position.y+ropeHalf).toBeCloseTo(d.axleY,8);
      expect(d.hangingRope.position.y-ropeHalf).toBeCloseTo(d.load.position.y+0.36,8);
    }
    s.data.focusMechanism=true;s.tick(4000);expect(d.room.visible).toBe(false);expect(d.drumRotor.parent).toBe(s.model);
  });
  it('turns the marked rotor during playback and restores its starting position',()=>{
    const s=scene('windlass',{ma:4}),d=s.mlDemo;
    for(const t of [100,650,1200,1750,2300]){s.tick(t);expect(d.drumRotor.rotation.z).toBe(d.motion.rotation.z);}
    s.data.demoId=0;s.tick(2500);expect(d.drumRotor.rotation.z).toBe(0);
  });
});
