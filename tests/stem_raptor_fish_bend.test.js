import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';

const THREE=createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source=readFileSync('stem_lab/stem_tool_raptorhunt.js','utf8');
function body(name){
  const start=source.indexOf('function '+name+'(');if(start<0)throw Error('Missing helper '+name);
  let end=source.indexOf('{',start),depth=1;
  while(depth){end++;if(end>=source.length)throw Error('Unclosed helper '+name);if(source[end]==='{')depth++;if(source[end]==='}')depth--;}
  return source.slice(start,end+1);
}
const api=Function('THREE',['bendFishPreyGeometry','createFishBodyGeometry','createFishFinGeometry','advanceFishSwim','applyFishSwim','preyKindFor','buildPreyVisual'].map(body).join('\n')+';return {build:buildPreyVisual,body:createFishBodyGeometry,fin:createFishFinGeometry,advance:advanceFishSwim,pose:applyFishSwim};')(THREE);
const make=size=>api.build({id:'fish',color:0x60a5fa,speedMps:1.5},size);
function resources(model){const result=new Set();model.root.traverse(object=>{if(object.geometry)result.add(object.geometry);if(object.material)result.add(object.material);});return result;}
function dispose(model){resources(model).forEach(resource=>resource.dispose());}
function step(model,speed,dt,reduced=false){api.advance(model.swim,speed,1.5,dt,reduced,.7);api.pose(model);}
function point(attribute,index){return new THREE.Vector3().fromBufferAttribute(attribute,index);}
function assertFinite(attribute){expect(Array.from(attribute.array).every(Number.isFinite)).toBe(true);}
function evaluatedVertex(mesh,index){
  const geometry=mesh.geometry,p=point(geometry.attributes.position,index);
  (geometry.morphAttributes.position||[]).forEach((target,k)=>{const delta=point(target,index).sub(point(geometry.attributes.position,index));p.addScaledVector(delta,mesh.morphTargetInfluences[k]);});
  return p.applyMatrix4(mesh.matrixWorld);
}
function independentArc(size,q,distance){
  const radius=size*.589/q,angle=q*distance/(size*.589);
  return {x:radius*(1-Math.cos(angle)),z:-radius*Math.sin(angle),angle};
}
function independentWarp(p,size,q){
  if(p.z>=0)return p.clone();const arc=independentArc(size,q,-p.z);
  return new THREE.Vector3(arc.x+p.x*Math.cos(arc.angle),p.y,arc.z+p.x*Math.sin(arc.angle));
}
function tangentNormal(p,n,size,q){
  const axis=new THREE.Vector3(Math.abs(n.y)>.9?1:0,Math.abs(n.y)>.9?0:1,0);
  const u=n.clone().cross(axis).normalize(),v=n.clone().cross(u),epsilon=size*1e-4;
  const differential=tangent=>independentWarp(p.clone().addScaledVector(tangent,epsilon),size,q).sub(independentWarp(p.clone().addScaledVector(tangent,-epsilon),size,q));
  return differential(u).cross(differential(v)).normalize();
}
const carryFixture=Function('THREE','prey','api','observe',`
  var scene=new THREE.Scene(),talonGroup=new THREE.Group(),waterWakeGroup=new THREE.Group(),waterWakeEntries=[];
  scene.add(prey.mesh);var carriedPrey=null,studyBoundsDirty=false,motionNow=750,_rmFX=false,strikeFootExtension=0;
  var raptorFeet=[{morphTargetInfluences:[0]},{morphTargetInfluences:[0]}];
  var advanceFishSwim=api.advance,applyFishSwim=api.pose;
  var carriedPreyBounds=new THREE.Box3(),carriedPreySize=new THREE.Vector3(),carriedPreyCenter=new THREE.Vector3();
  var originalMeasure=carriedPreyBounds.setFromObject;
  carriedPreyBounds.setFromObject=function(object){observe(prey.animation);return originalMeasure.call(this,object);};
  ${body('clearCarriedPrey')}
  ${body('beginCarriedPrey')}
  return {begin:function(){beginCarriedPrey(prey);},clear:clearCarriedPrey,group:talonGroup,state:function(){return carriedPrey;},bounds:carriedPreyBounds,size:carriedPreySize};
`);

describe('Fish body bend and surface detail',()=>{
  it('keeps the detailed fish at three meshes and two materials with finite surfaces and normals',()=>{
    for(const size of [.75,2,3.15]){const model=make(size),meshes=[];
      model.root.traverse(mesh=>{if(mesh.isMesh)meshes.push(mesh);});expect(meshes).toHaveLength(3);
      expect(new Set(meshes.map(mesh=>mesh.material)).size).toBe(2);expect(model.swim.size).toBe(size);
      for(const mesh of meshes){const geometry=mesh.geometry;
        for(const key of ['position','normal','color']){assertFinite(geometry.attributes[key]);expect(geometry.attributes[key].count).toBe(geometry.attributes.position.count);}
        const n=geometry.attributes.normal;for(let i=0;i<n.count;i++)expect(point(n,i).length()).toBeCloseTo(1,5);
      }
      expect(model.body.material.morphTargets).toBe(true);expect(model.body.material.morphNormals).toBe(true);
      expect(model.fins).toHaveLength(1);expect(model.fins[0].material.morphTargets).toBe(true);expect(model.fins[0].material.morphNormals).toBe(true);
      expect(model.tail.geometry.morphAttributes.position||[]).toHaveLength(0);dispose(model);
    }
  });

  it('pins the front of each bend surface and builds opposite rear arcs without vertical drift or invalid normals',()=>{
    for(const size of [.75,3.15]){const model=make(size);
      for(const mesh of [model.body,...model.fins]){const geometry=mesh.geometry,p=geometry.attributes.position,n=geometry.attributes.normal;
        expect(geometry.morphTargetsRelative).toBe(false);expect(geometry.morphAttributes.position).toHaveLength(2);expect(geometry.morphAttributes.normal).toHaveLength(2);
        let moved=0,pinned=0;
        for(const attribute of [...geometry.morphAttributes.position,...geometry.morphAttributes.normal]){assertFinite(attribute);expect(attribute.count).toBe(p.count);}
        for(let i=0;i<p.count;i++){
          const base=point(p,i),baseNormal=point(n,i),minus=point(geometry.morphAttributes.position[0],i),plus=point(geometry.morphAttributes.position[1],i);
          expect(minus.y).toBe(base.y);expect(plus.y).toBe(base.y);
          for(let target=0;target<2;target++)expect(point(geometry.morphAttributes.normal[target],i).length()).toBeCloseTo(1,5);
          if(base.z>=0){pinned++;expect(minus.equals(base)).toBe(true);expect(plus.equals(base)).toBe(true);
            for(const normal of geometry.morphAttributes.normal)expect(point(normal,i).equals(baseNormal)).toBe(true);
          }else{
            const minusArc=independentArc(size,-.22,-base.z),plusArc=independentArc(size,.22,-base.z);
            expect(minus.x).toBeCloseTo(minusArc.x+base.x*Math.cos(minusArc.angle),6);
            expect(plus.x).toBeCloseTo(plusArc.x+base.x*Math.cos(plusArc.angle),6);
            expect(minus.z).toBeCloseTo(minusArc.z+base.x*Math.sin(minusArc.angle),6);
            expect(plus.z).toBeCloseTo(plusArc.z+base.x*Math.sin(plusArc.angle),6);
            if(i%31===0&&base.z<-size*.005)for(const [target,q] of [[0,-.22],[1,.22]]){
              const expected=tangentNormal(base,baseNormal,size,q),actual=point(geometry.morphAttributes.normal[target],i);
              expect(expected.dot(actual)).toBeGreaterThan(.99999);
            }
            if(minus.distanceTo(base)>size*.001)moved++;
          }
        }
        expect(pinned).toBeGreaterThan(0);expect(moved).toBeGreaterThan(0);
      }dispose(model);
    }
  });

  it('keeps every fin triangle nondegenerate and preserves the tail notch alongside colored fin rays',()=>{
    for(const tail of [false,true]){const geometry=api.fin(1,tail),p=geometry.attributes.position,c=geometry.attributes.color,indices=geometry.index?Array.from(geometry.index.array):Array.from({length:p.count},(_,i)=>i);
      let minimumArea=Infinity;for(let i=0;i<indices.length;i+=3){const a=point(p,indices[i]),b=point(p,indices[i+1]),d=point(p,indices[i+2]);minimumArea=Math.min(minimumArea,b.sub(a).cross(d.sub(a)).length());}
      expect(minimumArea).toBeGreaterThan(1e-7);expect(new Set(Array.from(c.array).map(value=>value.toFixed(4))).size).toBeGreaterThan(3);
      if(tail){let notch=false;for(let i=0;i<p.count;i++)if(Math.abs(p.getY(i))<1e-5&&Math.abs(p.getZ(i)+.23)<1e-5)notch=true;expect(notch).toBe(true);}
      geometry.dispose();
    }
  });

  it('keeps the tail hinge on the linearly blended body centerline at all stroke strengths and model sizes',()=>{
    for(const size of [.75,2,3.15]){const model=make(size);
      for(const yaw of [-.8,-.305,-.16,0,.16,.305,.8]){model.swim.tailYaw=yaw;api.pose(model);
        const bend=Math.max(-1,Math.min(1,yaw/.305)),weight=Math.abs(bend),q=bend>=0?-.22:.22,arc=independentArc(size,q,size*.49);
        expect(model.swim.bend).toBeCloseTo(bend,12);
        for(const mesh of [model.body,...model.fins])expect(mesh.morphTargetInfluences).toEqual([Math.max(0,bend),Math.max(0,-bend)]);
        expect(model.tail.position.x).toBeCloseTo(arc.x*weight,12);expect(model.tail.position.y).toBe(0);
        expect(model.tail.position.z).toBeCloseTo(-size*.49+(arc.z+size*.49)*weight,12);
        const tangent=Math.atan2(-weight*Math.sin(arc.angle),1+weight*(Math.cos(arc.angle)-1));
        expect(model.tail.rotation.y).toBeCloseTo(tangent+yaw*.65,12);
      }dispose(model);
    }
  });

  it('uses conservative geometry bounds that contain evaluated bend vertices throughout swimming',()=>{
    for(const size of [.75,3.15]){const model=make(size);
      for(const mesh of [model.body,...model.fins]){const geometry=mesh.geometry;geometry.computeBoundingBox();geometry.computeBoundingSphere();
        for(const attribute of [geometry.attributes.position,...geometry.morphAttributes.position])for(let i=0;i<attribute.count;i++){
          const p=point(attribute,i);expect(geometry.boundingBox.containsPoint(p)).toBe(true);expect(p.distanceTo(geometry.boundingSphere.center)).toBeLessThanOrEqual(geometry.boundingSphere.radius+1e-6);
        }
      }
      for(const yaw of [-.305,-.12,0,.12,.305]){model.swim.tailYaw=yaw;api.pose(model);model.root.rotation.set(.3,.8,-.1);model.root.updateMatrixWorld(true);
        const box=new THREE.Box3().setFromObject(model.root),epsilon=size*1e-5;box.expandByScalar(epsilon);
        model.root.traverse(mesh=>{if(mesh.isMesh)for(let i=0;i<mesh.geometry.attributes.position.count;i++)expect(box.containsPoint(evaluatedVertex(mesh,i))).toBe(true);});
      }dispose(model);
    }
  });
});

describe('Fish bend motion and carry compatibility',()=>{
  it('reuses every geometry, material, base buffer and morph buffer through speed changes and stops',()=>{
    const model=make(2),swim=model.swim,entries=[];
    model.root.traverse(mesh=>{if(!mesh.isMesh)return;const attributes=[...Object.values(mesh.geometry.attributes),...Object.values(mesh.geometry.morphAttributes).flat()];
      entries.push({mesh,geometry:mesh.geometry,material:mesh.material,influences:mesh.morphTargetInfluences,attributes:attributes.map(attribute=>({attribute,array:attribute.array,version:attribute.version}))});});
    let maximumBend=0;for(let i=0;i<600;i++){step(model,i<120?.2:i<360?1.4:0,1/60,i>=480&&i<540);maximumBend=Math.max(maximumBend,Math.abs(model.swim.bend));}
    expect(maximumBend).toBeGreaterThan(.8);expect(model.swim).toBe(swim);
    for(const entry of entries){expect(entry.mesh.geometry).toBe(entry.geometry);expect(entry.mesh.material).toBe(entry.material);expect(entry.mesh.morphTargetInfluences).toBe(entry.influences);
      for(const record of entry.attributes){expect(record.attribute.array).toBe(record.array);expect(record.attribute.version).toBe(record.version);}}
    dispose(model);
  });

  it('keeps strokes consistent across frame rates and immediately rests for reduced motion before a gentle resume',()=>{
    const models=[];for(const hz of [30,60,120]){const model=make(2);for(let i=0;i<hz*3;i++)step(model,i<hz?.2:i<hz*2?1.4:.6,1/hz);models.push(model);}
    for(const key of ['phase','rate','amplitude','tailYaw','bodyYaw','roll','bend'])expect(models[0].swim[key]).toBeCloseTo(models[2].swim[key],9);
    for(const model of models){const phase=model.swim.phase;step(model,1.4,30,true);expect(model.swim.phase).toBe(phase);
      for(const key of ['amplitude','tailYaw','bodyYaw','roll','bend'])expect(model.swim[key]).toBe(0);
      for(const mesh of [model.body,...model.fins])expect(mesh.morphTargetInfluences).toEqual([0,0]);
      expect(Math.abs(model.tail.position.x)).toBe(0);expect(model.tail.position.z).toBe(-.98);expect(model.tail.rotation.y).toBe(0);
      step(model,1.4,1/60);expect(model.swim.amplitude).toBeGreaterThan(0);expect(model.swim.amplitude).toBeLessThan(.03);expect(Math.abs(model.swim.bend)).toBeLessThan(.1);dispose(model);
    }
  });

  it('rests body and tail before production carry bounds are measured and disposes each retained resource once',()=>{
    for(const size of [.75,3.15]){const model=make(size),neutralSize=new THREE.Box3().setFromObject(model.root).getSize(new THREE.Vector3()),before=resources(model),disposals=new Map();
      before.forEach(resource=>{disposals.set(resource,0);resource.addEventListener('dispose',()=>disposals.set(resource,disposals.get(resource)+1));});
      for(let i=0;i<120;i++)step(model,1.4,1/60);expect(Math.abs(model.swim.bend)).toBeGreaterThan(.01);
      const phase=model.swim.phase,mesh=new THREE.Group();mesh.add(model.root);mesh.position.set(4,2,8);mesh.rotation.set(.3,.8,.2);model.root.rotation.set(.2,.4,-.1);
      const prey={mesh,visual:model.root,animation:model,data:{id:'fish',speedMps:1.5},groundClearance:0,bobPhase:.7};let measures=0;
      const fixture=carryFixture(THREE,prey,api,animation=>{measures++;expect(animation).toBe(model);expect(model.swim.phase).toBe(phase);
        for(const key of ['amplitude','tailYaw','bodyYaw','roll','bend'])expect(model.swim[key]).toBe(0);
        for(const mesh of [model.body,...model.fins])expect(mesh.morphTargetInfluences).toEqual([0,0]);
        expect(Math.abs(model.tail.position.x)).toBe(0);expect(model.tail.position.z).toBe(-size*.49);expect(model.tail.rotation.y).toBe(0);
      });fixture.begin();expect(measures).toBe(1);expect(mesh.parent).toBe(fixture.group);expect(fixture.state().prey).toBe(prey);
      expect(fixture.size.distanceTo(neutralSize)).toBeLessThan(1e-5);expect(resources(model)).toEqual(before);expect(fixture.state().materials).toHaveLength(2);
      fixture.clear();fixture.clear();expect(mesh.parent).toBeNull();expect(Array.from(disposals.values())).toEqual([1,1,1,1,1]);
    }
  });
});
