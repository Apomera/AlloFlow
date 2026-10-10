import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';

const THREE=createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source=readFileSync('stem_lab/stem_tool_raptorhunt.js','utf8');
const ids=['pigeon','mourningDove','songbird','shorebird','duck','waterfowl','grouse','ptarmigan','smallOwl'];
function body(name){
  const start=source.indexOf('function '+name+'(');if(start<0)throw Error('Missing helper '+name);
  let end=source.indexOf('{',start),depth=1;
  while(depth){end++;if(end>=source.length)throw Error('Unclosed helper '+name);if(source[end]==='{')depth++;if(source[end]==='}')depth--;}
  return source.slice(start,end+1);
}
const api=Function('THREE',['preyBirdPalette','createPreyBirdBodyGeometry','createPreyWingGeometry','createPreyTailGeometry','advancePreyVisualPose','preyKindFor','buildPreyVisual'].map(body).join('\n')+
  ';return {palette:preyBirdPalette,build:buildPreyVisual,wing:createPreyWingGeometry,tail:createPreyTailGeometry,advance:advancePreyVisualPose};')(THREE);
const transformStart=source.indexOf('else pm2.animation.wings.forEach(function(wing, wingIndex) {');
const transformEnd=source.indexOf("if(pm2.animation.gait&&pm2.surfaceMode==='terrain')",transformStart);
if(transformStart<0||transformEnd<0)throw Error('Missing production prey surface transforms');
const transform=Function('pm2','preyPose','motionPhase','_rmFX',source.slice(transformStart+5,transformEnd));
const make=(id,size=1)=>api.build({id,color:0x9ca3af,speedMps:2},size);
function meshes(model){const result=[];model.root.traverse(object=>{if(object.isMesh)result.push(object);});return result;}
function resources(model){const result=new Set();meshes(model).forEach(mesh=>{result.add(mesh.geometry);result.add(mesh.material);});return result;}
function dispose(model){resources(model).forEach(resource=>resource.dispose());}
function point(attribute,index){return new THREE.Vector3().fromBufferAttribute(attribute,index);}
function bounds(mesh){mesh.updateMatrixWorld(true);return new THREE.Box3().setFromObject(mesh);}
function sizeOf(mesh){return bounds(mesh).getSize(new THREE.Vector3());}
function headOf(model){return meshes(model).find(mesh=>mesh.name==='prey-plumage-head');}
function assertFinite(attribute){expect(Array.from(attribute.array).every(Number.isFinite)).toBe(true);}
function assertFaces(geometry,size){
  const p=geometry.attributes.position,indices=geometry.index?Array.from(geometry.index.array):Array.from({length:p.count},(_,i)=>i);
  let area=Infinity;
  for(let i=0;i<indices.length;i+=3){
    expect(indices.slice(i,i+3).every(index=>index>=0&&index<p.count)).toBe(true);
    const a=point(p,indices[i]),b=point(p,indices[i+1]),c=point(p,indices[i+2]);
    area=Math.min(area,b.sub(a).cross(c.sub(a)).length());
  }
  expect(area).toBeGreaterThan(size*size*1e-7);
}
function coloredPart(mesh,color){
  const p=mesh.geometry.attributes.position,c=mesh.geometry.attributes.color,box=new THREE.Box3();
  for(let i=0;i<p.count;i++)if([.8,1].some(tone=>Math.max(Math.abs(c.getX(i)-color.r*tone),Math.abs(c.getY(i)-color.g*tone),Math.abs(c.getZ(i)-color.b*tone))<1e-6))box.expandByPoint(point(p,i));
  expect(box.isEmpty()).toBe(false);return box.getSize(new THREE.Vector3()).multiply(mesh.scale);
}
const carryFixture=Function('THREE','prey','observe',`
  var scene=new THREE.Scene(),talonGroup=new THREE.Group(),waterWakeGroup=new THREE.Group(),waterWakeEntries=[];
  scene.add(prey.mesh);var carriedPrey=null,studyBoundsDirty=false,motionNow=750,_rmFX=false,strikeFootExtension=0;
  var raptorFeet=[{morphTargetInfluences:[0]},{morphTargetInfluences:[0]}];
  var carriedPreyBounds=new THREE.Box3(),carriedPreySize=new THREE.Vector3(),carriedPreyCenter=new THREE.Vector3();
  var originalMeasure=carriedPreyBounds.setFromObject;
  carriedPreyBounds.setFromObject=function(object){observe(prey.animation);return originalMeasure.call(this,object);};
  ${body('advanceBirdPreyHead')}
  ${body('applyBirdPreyHeadPose')}
  ${body('clearCarriedPrey')}
  ${body('beginCarriedPrey')}
  return {begin:function(){beginCarriedPrey(prey);},clear:clearCarriedPrey,group:talonGroup,state:function(){return carriedPrey;},size:carriedPreySize};
`);

describe('Bird prey species silhouettes',()=>{
  it('keeps every tapered wing mirrored and every expanded tail face finite and nondegenerate',()=>{
    for(const id of ids)for(const size of [.75,3.15]){
      const palette=api.palette(id),left=api.wing(size,-1,palette),right=api.wing(size,1,palette),tail=api.tail(size,palette);
      expect(left.attributes.position.count).toBe(45);expect(tail.attributes.position.count).toBe(19);
      for(const geometry of [left,right,tail]){
        for(const key of ['position','normal','color']){assertFinite(geometry.attributes[key]);expect(geometry.attributes[key].count).toBe(geometry.attributes.position.count);}
        for(let i=0;i<geometry.attributes.normal.count;i++)expect(point(geometry.attributes.normal,i).length()).toBeCloseTo(1,5);
        assertFaces(geometry,size);
      }
      for(let i=0;i<left.attributes.position.count;i++){
        const a=left.attributes.position,b=right.attributes.position;
        expect(a.getX(i)).toBe(-b.getX(i));expect(a.getY(i)).toBe(b.getY(i));expect(a.getZ(i)).toBe(b.getZ(i));
        expect(left.attributes.normal.getY(i)).toBeGreaterThan(.7);expect(right.attributes.normal.getY(i)).toBeGreaterThan(.7);
      }
      [left,right,tail].forEach(geometry=>geometry.dispose());
    }
  });

  it('gives all nine birds distinct geometry while preserving size scaling and the original belly contact height',()=>{
    const signatures=new Set();
    for(const id of ids){
      const small=make(id,.75),large=make(id,3.15),a=meshes(small),b=meshes(large);
      expect(a).toHaveLength(5);expect(b).toHaveLength(5);expect(small.body.scale.toArray()).toEqual([.78,.72,1.35]);
      expect(bounds(small.root).min.y).toBeCloseTo(-.75*.42*.72,6);expect(bounds(large.root).min.y).toBeCloseTo(-3.15*.42*.72,6);
      for(let meshIndex=0;meshIndex<a.length;meshIndex++){
        const p=a[meshIndex].geometry.attributes.position,q=b[meshIndex].geometry.attributes.position;expect(p.count).toBe(q.count);
        for(let vertex=0;vertex<p.count;vertex++)for(const key of ['getX','getY','getZ'])expect(p[key](vertex)/.75).toBeCloseTo(q[key](vertex)/3.15,6);
        for(const axis of ['x','y','z']){expect(a[meshIndex].position[axis]/.75).toBeCloseTo(b[meshIndex].position[axis]/3.15,10);expect(a[meshIndex].scale[axis]).toBe(b[meshIndex].scale[axis]);}
      }
      signatures.add(a.map(mesh=>Array.from(mesh.geometry.attributes.position.array).map(value=>(value/.75).toFixed(4)).join(',')).join('|'));
      dispose(small);dispose(large);
    }
    expect(signatures.size).toBe(ids.length);
  });

  it('keeps the head, wing shoulders and tail attached with bounded folded silhouettes at both model sizes',()=>{
    for(const id of ids)for(const size of [.75,3.15]){
      const model=make(id,size);model.root.updateMatrixWorld(true);
      const bodyBox=bounds(model.body),headBox=bounds(headOf(model)),tailBox=bounds(model.tail),rootSize=sizeOf(model.root);
      expect(headBox.min.z).toBeLessThan(bodyBox.max.z);expect(headBox.max.z).toBeGreaterThan(bodyBox.max.z);
      expect(headBox.min.y).toBeLessThan(bodyBox.max.y);expect(headBox.max.y).toBeGreaterThan(0);
      expect(tailBox.max.z).toBeGreaterThan(bodyBox.min.z);expect(tailBox.max.z).toBeLessThan(0);
      expect(tailBox.min.z).toBeLessThan(bodyBox.min.z);
      for(const wing of model.wings){expect(bodyBox.containsPoint(wing.position)).toBe(true);expect(wing.scale.x).toBe(.3);}
      expect(rootSize.x/size).toBeLessThan(1.75);expect(rootSize.y/size).toBeLessThan(1.25);expect(rootSize.z/size).toBeLessThan(2.6);
      dispose(model);
    }
  });

  it('preserves recognizable dove tails, narrow shorebird bills, broad grouse fans and large owl heads',()=>{
    const models=Object.fromEntries(ids.map(id=>[id,make(id)]));
    const tail=id=>sizeOf(models[id].tail),head=id=>sizeOf(headOf(models[id])),bill=id=>coloredPart(headOf(models[id]),api.palette(id).bill);
    expect(tail('mourningDove').z).toBeGreaterThan(tail('pigeon').z*1.25);
    expect(bill('shorebird').z).toBeGreaterThan(bill('songbird').z*1.75);expect(bill('shorebird').x/bill('shorebird').z).toBeLessThan(bill('songbird').x/bill('songbird').z*.6);
    expect(tail('grouse').x).toBeGreaterThan(tail('ptarmigan').x*1.2);
    expect(head('smallOwl').y).toBeGreaterThan(head('songbird').y*1.3);expect(head('smallOwl').x).toBeGreaterThan(head('shorebird').x*1.3);
    expect(sizeOf(models.duck.body).x).toBeGreaterThan(sizeOf(models.shorebird.body).x*1.15);
    expect(bill('duck').x/bill('duck').z).toBeGreaterThan(bill('shorebird').x/bill('shorebird').z*3);
    Object.values(models).forEach(dispose);
  });

  it('bakes visible shaft and terminal feather bands into the existing finite linear color surfaces',()=>{
    for(const id of ids){
      const model=make(id),tailColors=model.tail.geometry.attributes.color;
      for(const mesh of meshes(model)){
        const geometry=mesh.geometry;for(const key of ['position','normal','color'])assertFinite(geometry.attributes[key]);
        expect(geometry.attributes.color.count).toBe(geometry.attributes.position.count);
        expect(Array.from(geometry.attributes.color.array).every(value=>value>=0&&value<=1)).toBe(true);
        expect(mesh.material.vertexColors).toBe(true);expect(mesh.material.map).toBeNull();
      }
      expect(new Set(Array.from(tailColors.array).map(value=>value.toFixed(4))).size).toBeGreaterThan(3);
      if(['pigeon','grouse','smallOwl'].includes(id)){
        let shaftBrightness=0,terminalBrightness=0;
        for(let i=0;i<9;i++)for(const [index,isTerminal] of [[1+i,false],[10+i,true]]){
          const brightness=tailColors.getX(index)*.2126+tailColors.getY(index)*.7152+tailColors.getZ(index)*.0722;
          if(isTerminal)terminalBrightness+=brightness;else shaftBrightness+=brightness;
        }
        expect(terminalBrightness).toBeLessThan(shaftBrightness*.9);
      }
      dispose(model);
    }
  });

  it('reuses five meshes and four materials without buffer uploads through production flight, landing and reduced motion',()=>{
    for(const id of ids){
      const model=make(id),before=resources(model),records=meshes(model).map(mesh=>({mesh,geometry:mesh.geometry,material:mesh.material,attributes:Object.entries(mesh.geometry.attributes).map(([key,attribute])=>({key,attribute,array:attribute.array,version:attribute.version}))}));
      expect(before.size).toBe(9);expect(new Set(records.map(record=>record.material)).size).toBe(4);
      const pose={heading:null,bank:0,spread:0,wingAngle:.08};let maximumSpread=0,minimumAngle=Infinity,maximumAngle=-Infinity;
      for(let frame=0;frame<240;frame++){
        const reduced=frame>=180&&frame<210,height=frame<120?2:0;
        api.advance(pose,1,1,height,frame*1000/60,.7,frame<60,1/60,reduced);transform({animation:model},pose,pose.phase,reduced);
        maximumSpread=Math.max(maximumSpread,pose.spread);minimumAngle=Math.min(minimumAngle,model.wings[1].rotation.z);maximumAngle=Math.max(maximumAngle,model.wings[1].rotation.z);
        if(reduced){expect(model.wings[1].rotation.z).toBe(.08);expect(model.tail.rotation.z).toBe(0);}
      }
      expect(maximumSpread).toBeGreaterThan(.99);expect(maximumAngle-minimumAngle).toBeGreaterThan(.5);expect(pose.spread).toBeLessThan(1e-8);
      expect(resources(model)).toEqual(before);
      for(const record of records){expect(record.mesh.geometry).toBe(record.geometry);expect(record.mesh.material).toBe(record.material);
        for(const saved of record.attributes){expect(record.geometry.attributes[saved.key]).toBe(saved.attribute);expect(saved.attribute.array).toBe(saved.array);expect(saved.attribute.version).toBe(saved.version);}}
      dispose(model);
    }
  });

  it('folds flying wings and rests the tail before native carry bounds are measured and disposes retained resources once',()=>{
    for(const id of ids)for(const size of [.75,3.15]){
      const model=make(id,size),neutralSize=sizeOf(model.root),before=resources(model),disposals=new Map();
      before.forEach(resource=>{disposals.set(resource,0);resource.addEventListener('dispose',()=>disposals.set(resource,disposals.get(resource)+1));});
      const pose={heading:null,bank:0,spread:0,wingAngle:.08};for(let frame=0;frame<120;frame++){api.advance(pose,1,1,2,frame*1000/60,.7,true,1/60,false);transform({animation:model},pose,pose.phase,false);}
      model.tail.rotation.set(.21,-.3,.11);
      const mesh=new THREE.Group();mesh.add(model.root);mesh.position.set(4,2,8);mesh.rotation.set(.3,.8,.2);model.root.rotation.set(.2,.4,-.1);
      const prey={mesh,visual:model.root,animation:model,data:{id,speedMps:2},groundClearance:0,bobPhase:.7};let measures=0;
      const fixture=carryFixture(THREE,prey,animation=>{measures++;expect(animation).toBe(model);
        model.wings.forEach((wing,index)=>{const side=index===0?-1:1;expect(wing.rotation.x).toBe(0);expect(wing.rotation.y).toBe(side*1.15);expect(wing.rotation.z).toBe(side*.08);expect(wing.scale.x).toBe(.3);});
        expect(model.tail.rotation.toArray().slice(0,3)).toEqual([0,0,0]);
      });
      fixture.begin();expect(measures).toBe(1);expect(mesh.parent).toBe(fixture.group);expect(fixture.state().prey).toBe(prey);expect(fixture.state().materials).toHaveLength(4);
      expect(fixture.size.distanceTo(neutralSize)).toBeLessThan(1e-5);expect(resources(model)).toEqual(before);
      fixture.clear();fixture.clear();expect(mesh.parent).toBeNull();expect(Array.from(disposals.values())).toEqual(Array(9).fill(1));
    }
  });

  it('freezes the flight oscillator for reduced motion and gently restores wing movement without an elapsed-time jump',()=>{
    const results=[];
    for(const hz of [30,60,120]){
      const pose={heading:0,bank:.2,spread:1,wingAngle:.08};
      for(let frame=0;frame<hz;frame++)api.advance(pose,0,1,2,frame*1000/hz,.7,true,1/hz,false);
      const frozen={phase:pose.phase,rate:pose.rate,wingAmplitude:pose.wingAmplitude};
      api.advance(pose,0,1,2,60000,.7,false,30,true);
      expect({phase:pose.phase,rate:pose.rate,wingAmplitude:pose.wingAmplitude}).toEqual(frozen);
      expect(pose.motionBlend).toBe(0);expect(pose.wingAngle).toBe(.08);expect(pose.bank).toBe(0);
      api.advance(pose,0,1,2,90000,.7,true,0,false);
      expect({phase:pose.phase,rate:pose.rate,wingAmplitude:pose.wingAmplitude}).toEqual(frozen);
      expect(pose.motionBlend).toBe(0);expect(pose.wingAngle).toBe(.08);
      api.advance(pose,0,1,2,90000+1000/hz,.7,true,1/hz,false);
      expect(pose.motionBlend).toBeGreaterThan(0);expect(pose.motionBlend).toBeLessThan(.24);
      expect(Math.abs(pose.wingAngle-.08)).toBeLessThan(.18);expect(pose.phase-frozen.phase).toBeGreaterThan(0);expect(pose.phase-frozen.phase).toBeLessThan(.61);
      for(let frame=1;frame<hz;frame++)api.advance(pose,0,1,2,90000+(frame+1)*1000/hz,.7,true,1/hz,false);
      expect(pose.motionBlend).toBeGreaterThan(.999);results.push(pose);
    }
    for(const key of ['phase','rate','wingAmplitude','motionBlend','wingAngle'])expect(results[0][key]).toBeCloseTo(results[2][key],9);
  });
});
