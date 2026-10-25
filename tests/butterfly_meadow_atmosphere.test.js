import {afterAll,afterEach,beforeAll,describe,expect,it} from 'vitest';
import {createRequire} from 'node:module';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

const require=createRequire(import.meta.url);
const THREE=require('../vendor/three-r128/three.min.js');
let BF,world;

beforeAll(()=>{
  resetStemLab();window.__RR_TEST_EXPORTS__={};
  loadTool('stem_lab/stem_tool_butterfly.js','butterfly');
  BF=window.__RR_TEST_EXPORTS__.butterfly;
  world=BF.buildWorld(THREE,window.StemMeadow);
});

function showDesign(design){
  world.restoration.children.forEach(group=>{group.visible=group.name==='restoration-'+design;});
}

afterEach(()=>{
  world.watchVisitor(null);world.player.root.visible=true;
  showDesign('lawn');world.setLight('daylight');world.animate(0,false,false);
});

afterAll(()=>{
  if(!world)return;
  world.watchVisitor(null);
  const resources=new Set();
  world.scene.traverse(object=>{
    if(object.geometry)resources.add(object.geometry);
    if(object.material)(Array.isArray(object.material)?object.material:[object.material]).forEach(material=>resources.add(material));
  });
  resources.forEach(resource=>resource.dispose());
});

function lighting(){
  const sun=world.scene.getObjectByName('meadow-sun');
  const fill=world.scene.getObjectByName('meadow-sky-fill');
  const sky=world.scene.getObjectByName('meadow-sky').material.uniforms;
  return {
    mode:world.scene.userData.meadowLight,
    sun:{color:sun.color.toArray(),position:sun.position.toArray(),intensity:sun.intensity},
    fill:{color:fill.color.toArray(),ground:fill.groundColor.toArray(),intensity:fill.intensity},
    fog:world.scene.fog.color.toArray(),background:world.scene.background.toArray(),
    sky:{zenith:sky.zenith.value.toArray(),horizon:sky.horizon.value.toArray(),cloud:sky.cloud.value.toArray(),sunDirection:sky.sunDirection.value.toArray()}
  };
}

function surfaces(visitor){
  const parts=[];
  visitor.root.traverse(mesh=>{if(mesh.isMesh)parts.push({mesh,geometry:mesh.geometry,material:mesh.material});});
  return parts;
}

function expectOriginal(parts){
  for(const part of parts){
    expect(part.mesh.geometry).toBe(part.geometry);
    expect(part.mesh.material).toBe(part.material);
  }
}

function triangles(root){
  let count=0;
  root.traverseVisible(object=>{
    if(object.isMesh)count+=(object.geometry.index?object.geometry.index.count:object.geometry.attributes.position.count)/3*(object.isInstancedMesh?object.count:1);
  });
  return count;
}

function flowerBatches(){
  const batches=new Map();
  world.scene.traverse(object=>{
    if(object.isInstancedMesh&&object.parent!==world.flowerDetail.root&&
      ['milkweed-flower-umbel','bergamot-tubular-flower-head'].includes(object.geometry.name)){
      batches.set(object,Array.from(object.instanceMatrix.array));
    }
  });
  return batches;
}

function expectFlowerReplacement(originals){
  const detail=world.flowerDetail,source=detail.source,sources=detail.sources;
  expect(source).not.toBeNull();
  expect(sources[0]).toBe(source);expect(sources.length).toBeGreaterThan(0);expect(sources.length).toBeLessThanOrEqual(3);
  expect(new Set(sources).size).toBe(sources.length);
  const heads=detail.root.children.filter(mesh=>mesh.visible);
  expect(heads).toHaveLength(1);
  const head=heads[0],sourceMatrix=new THREE.Matrix4(),headMatrix=new THREE.Matrix4();
  expect(head.isInstancedMesh).toBe(true);expect(head.count).toBe(sources.length);
  expect(triangles(head)/head.count).toBeGreaterThan(triangles(source.batch)/source.batch.count);
  expect(head.material).toBe(source.batch.material);
  expect(detail.root.parent).toBe(source.batch.parent);
  detail.root.updateMatrix();expect(detail.root.matrix.elements).toEqual(new THREE.Matrix4().elements);
  const color=new THREE.Color(),sourceColor=new THREE.Color();
  sources.forEach((slot,index)=>{
    expect(slot.batch).toBe(source.batch);expect(slot.species).toBe(source.species);
    head.getMatrixAt(index,headMatrix);slot.batch.getMatrixAt(slot.index,sourceMatrix);
    const original=originals.get(slot.batch).slice(slot.index*16,(slot.index+1)*16);
    expect(slot.matrix.elements).toEqual(original);
    expect(headMatrix.elements).toEqual(original);
    expect(sourceMatrix.determinant()).toBe(0);
    slot.batch.getColorAt(slot.index,sourceColor);head.getColorAt(index,color);
    expect(color.toArray()).toEqual(sourceColor.toArray());
  });
  let changed=0;
  for(const [batch,values] of originals){
    for(let i=0;i<batch.count;i++){
      const actual=Array.from(batch.instanceMatrix.array.slice(i*16,(i+1)*16));
      const expected=values.slice(i*16,(i+1)*16);
      if(actual.some((value,index)=>value!==expected[index])){
        changed++;expect(sources.some(slot=>slot.batch===batch&&slot.index===i)).toBe(true);
      }
    }
  }
  expect(changed).toBe(sources.length);
  return source;
}

function expectFlowersRestored(originals){
  expect(world.flowerDetail.source).toBeNull();
  expect(world.flowerDetail.sources).toEqual([]);
  expect(world.flowerDetail.root.children.filter(mesh=>mesh.visible)).toHaveLength(0);
  for(const [batch,values] of originals)expect(Array.from(batch.instanceMatrix.array)).toEqual(values);
}

function watchFromCamera(visitor,aspect=1.8){
  const view=BF.pollinatorCamera(visitor.root.position,aspect,BF.meadowSpecies(visitor.speciesId).scale);
  world.watchVisitor(visitor,view,aspect);return view;
}

describe('Meadow atmosphere and pollinator watching',()=>{
  it('warms the sun, sky and haze together, and restores daylight exactly',()=>{
    const day=lighting();
    world.setLight('golden');const golden=lighting();
    expect(golden.mode).toBe('golden');
    expect(golden.sun.position[1]).toBeLessThan(day.sun.position[1]);
    expect(golden.sun.color[0]/golden.sun.color[2]).toBeGreaterThan(day.sun.color[0]/day.sun.color[2]);
    expect(golden.sky.zenith).not.toEqual(day.sky.zenith);
    expect(golden.sky.horizon).not.toEqual(day.sky.horizon);
    expect(golden.fog).not.toEqual(day.fog);
    expect(golden.background).toEqual(golden.fog);
    const direction=new THREE.Vector3(...golden.sun.position).normalize();
    expect(direction.distanceTo(new THREE.Vector3(...golden.sky.sunDirection))).toBeLessThan(1e-10);
    world.setLight('golden');expect(lighting()).toEqual(golden);
    world.setLight('daylight');expect(lighting()).toEqual(day);
  });

  it('projects soft shadows away from the sun and keeps them synchronized with foliage and inspection',()=>{
    const shadowMaterials=new Set(),foliage=new Map();
    world.scene.traverse(object=>{
      const material=object.material;
      if(material?.name==='meadow-soft-shadows')shadowMaterials.add(material);
      if(material?.userData.meadowWind)foliage.set(material.userData.meadowWind,material);
    });
    expect(shadowMaterials.size).toBe(1);
    const uniforms=[...shadowMaterials][0].uniforms,sun=world.scene.getObjectByName('meadow-sun');
    const projection=()=>{
      expect(uniforms.bfShadowCast.value.x).toBeCloseTo(-sun.position.x/sun.position.y,12);
      expect(uniforms.bfShadowCast.value.y).toBeCloseTo(-sun.position.z/sun.position.y,12);
      return uniforms.bfShadowCast.value.toArray();
    };
    const day=projection();
    world.setLight('golden');const golden=projection();
    expect(Math.hypot(...golden)).toBeGreaterThan(Math.hypot(...day));
    world.setLight('daylight');expect(projection()).toEqual(day);

    for(const kind of ['plant','canopy']){
      expect(foliage.has(kind)).toBe(true);
      const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};
      foliage.get(kind).onBeforeCompile(shader);
      for(const key of ['bfBreeze','bfWindStrength','bfPlantWind'])expect(uniforms[key]).toBe(shader.uniforms[key]);
    }
    const motion=()=>[uniforms.bfBreeze.value,uniforms.bfWindStrength.value,uniforms.bfPlantWind.value];
    world.animate(7.25,false,false);expect(motion()).toEqual([7.25,1,1]);
    const paused=motion();
    world.animate(7.25,false,false);expect(motion()).toEqual(paused);
    world.animate(9,false,false);expect(uniforms.bfBreeze.value).toBeGreaterThan(paused[0]);
    world.animate(9,false,true);expect(motion()).toEqual([9,1,0]);
    world.animate(11,false,true);expect(motion()).toEqual([11,1,0]);
    world.animate(11,false,false);expect(motion()).toEqual([11,1,1]);
    world.animate(11,true,false);expect(motion()).toEqual([0,0,1]);
    world.animate(80,true,false);expect(motion()).toEqual([0,0,1]);
    world.animate(80,true,true);expect(motion()).toEqual([0,0,0]);
    world.animate(12,false,false);expect(motion()).toEqual([12,1,1]);
  });

  it('uses meadow time for seeds and distant birds, keeping paused and reduced-motion scenery still',()=>{
    const particles=world.atmosphere.root;
    const geometry=particles.geometry,material=particles.material,positions=geometry.attributes.position.array;
    const uniforms=material.uniforms;
    expect(particles.isPoints).toBe(true);
    expect(Array.from(positions).every(Number.isFinite)).toBe(true);
    const records=geometry.attributes.bfParticle,kinds=Array.from({length:records.count},(_,index)=>records.getW(index));
    expect(geometry.attributes.position.count).toBe(98);
    expect(kinds.filter(kind=>kind===0)).toHaveLength(76);
    expect(kinds.filter(kind=>kind===1)).toHaveLength(20);
    expect(kinds.filter(kind=>kind===2)).toHaveLength(2);
    for(let index=96;index<98;index++){
      const point=new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,index);
      expect(point.y,'birds remain above the flower patches').toBeGreaterThan(30);
      expect(Math.min(Math.abs(point.x),Math.abs(point.z)),'bird paths stay at the distant woodland').toBeGreaterThan(150);
      expect(records.getY(index),'distant birds retain a small apparent silhouette').toBeLessThan(3);
    }
    world.animate(7.25,false,false);
    expect(uniforms.bfAirClock.value).toBe(7.25);
    expect(particles.visible).toBe(true);
    const paused={clock:uniforms.bfAirClock.value,golden:uniforms.bfAirGolden.value};
    world.animate(7.25,false,false);
    expect({clock:uniforms.bfAirClock.value,golden:uniforms.bfAirGolden.value}).toEqual(paused);
    world.animate(10,false,false);expect(uniforms.bfAirClock.value).toBeGreaterThan(paused.clock);
    world.animate(10,true,false);const reduced=uniforms.bfAirClock.value;
    world.animate(80,true,false);expect(uniforms.bfAirClock.value).toBe(reduced);
    world.animate(NaN,false,false);expect(Number.isFinite(uniforms.bfAirClock.value)).toBe(true);
    world.animate(12,false,true);expect(particles.visible).toBe(false);
    world.setLight('golden');world.animate(12,false,false);
    expect(particles.visible).toBe(true);expect(uniforms.bfAirGolden.value).toBeGreaterThan(paused.golden);
    expect(particles.geometry).toBe(geometry);expect(particles.material).toBe(material);
    expect(geometry.attributes.position.array).toBe(positions);
  });

  it('promotes each watched species with its own anatomy and restores every surface without changing the teaching monarchs',()=>{
    const originals=world.visitors.map(surfaces),monarch=world.speciesTemplates.monarch;
    const teaching=[world.player.root,world.feeding.root.getObjectByName('feeding-monarch'),world.scene.getObjectByName('lifecycle-adult')].map(root=>({root,parts:surfaces({root}),scale:root.scale.toArray()}));
    let previous=null;
    for(const [index,visitor] of world.visitors.entries()){
      const template=world.speciesTemplates[visitor.speciesId],parts=originals[index],lowTriangles=triangles(visitor.root);
      const tube=visitor.proboscis,originalTube={geometry:tube.geometry,material:tube.material};
      tube.morphTargetInfluences[0]=.73;
      world.watchVisitor(visitor);
      if(previous!==null)expectOriginal(originals[previous]);
      expect(triangles(visitor.root)).toBeGreaterThan(lowTriangles);
      const expectedParts=parts.filter(part=>template.getObjectByName(part.mesh.name)?.isMesh);
      expect(expectedParts.length).toBeGreaterThanOrEqual(7);
      for(const part of expectedParts){
        const detailed=template.getObjectByName(part.mesh.name);
        expect(part.mesh.geometry).toBe(detailed.geometry);expect(part.mesh.material).toBe(detailed.material);
        if(visitor.speciesId!=='monarch'&&/wing/.test(part.mesh.name)){
          expect(part.mesh.geometry.userData.speciesId).toBe(visitor.speciesId);
          expect(part.mesh.geometry).not.toBe(monarch.getObjectByName(part.mesh.name)?.geometry);
        }
      }
      world.watchVisitor(visitor);
      for(const part of expectedParts)expect(part.mesh.geometry).toBe(template.getObjectByName(part.mesh.name).geometry);
      expect(tube.geometry).toBe(originalTube.geometry);expect(tube.material).toBe(originalTube.material);
      expect(tube.morphTargetInfluences[0]).toBe(.73);
      for(const model of teaching){
        expectOriginal(model.parts);expect(model.root.scale.toArray()).toEqual(model.scale);
        expect(model.root.userData.species).toBe('Danaus plexippus');
      }
      previous=index;
    }
    world.watchVisitor(null);originals.forEach(expectOriginal);
  });

  it('shares each visitor wing-flex uniform across detail changes while keeping the teaching surfaces independent',()=>{
    const teaching=[world.player.root,world.feeding.root.getObjectByName('feeding-monarch'),world.scene.getObjectByName('lifecycle-adult')];
    const originals=teaching.flatMap(root=>surfaces({root}));
    const teachingMaterials=new Map(originals.map(({material})=>[material,{compile:material.onBeforeCompile,key:material.customProgramCacheKey()}]));
    const patches=BF.habitats(BF.freshState()).filter(patch=>patch.nectar);
    function shaderFor(material){
      const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};
      material.onBeforeCompile(shader);return shader;
    }
    const wingParts=root=>surfaces({root}).filter(({mesh})=>/^(monarch|butterfly)-(forewing|hindwing)-(left|right)$/.test(mesh.name));
    expect(world.speciesTemplates.monarch).not.toBe(teaching[1]);
    world.animateVisitors(8.125,false,patches,false);
    for(const visitor of world.visitors){
      const low=wingParts(visitor.root),detail=wingParts(world.speciesTemplates[visitor.speciesId]),uniform=visitor.wingFlex;
      expect(low).toHaveLength(4);expect(detail).toHaveLength(4);
      const materials=new Set([...low,...detail].map(part=>part.material));
      expect(materials.size).toBeGreaterThan(1);
      for(const material of materials){
        expect(teachingMaterials.has(material)).toBe(false);
        expect(shaderFor(material).uniforms.bfVisitorWingFlex).toBe(uniform);
      }
      const paused=uniform.value.toArray();
      world.watchVisitor(visitor);
      for(const part of wingParts(visitor.root))expect(shaderFor(part.material).uniforms.bfVisitorWingFlex).toBe(uniform);
      expect(uniform.value.toArray()).toEqual(paused);
      world.watchVisitor(null);expectOriginal(low);
    }
    expectOriginal(originals);
    for(const [material,original] of teachingMaterials){
      expect(material.onBeforeCompile).toBe(original.compile);expect(material.customProgramCacheKey()).toBe(original.key);
      expect(material.userData.visitorWingFlex).toBeUndefined();
      expect(shaderFor(material).uniforms.bfVisitorWingFlex).toBeUndefined();
    }
  });

  it('freezes all visitor flex on repeated meadow time and resets it for reduced motion, hidden inspection, and missing habitat',()=>{
    const patches=BF.habitats(BF.freshState()).filter(patch=>patch.nectar),time=8.125;
    const snapshot=()=>world.visitors.map(visitor=>({
      flex:visitor.wingFlex.value.toArray(),position:visitor.root.position.toArray(),rotation:visitor.root.rotation.toArray(),
      wings:visitor.wings.map(wing=>wing.rotation.z),hindwings:visitor.hindWings.map(wing=>wing.rotation.z),tube:visitor.proboscis.morphTargetInfluences[0]
    }));
    const expectStill=()=>world.visitors.forEach(visitor=>expect(visitor.wingFlex.value.toArray()).toEqual([0,0,0,0]));
    world.animate(time,false,false);world.animateVisitors(time,false,patches,false);
    const paused=snapshot();
    expect(paused.some(state=>state.flex.some(value=>Math.abs(value)>.001))).toBe(true);
    for(const visitor of world.visitors){
      world.watchVisitor(visitor);
      for(let repaint=0;repaint<3;repaint++){
        world.animate(time,false,false);world.animateVisitors(time,false,patches,false);
        expect(snapshot()).toEqual(paused);
      }
    }
    world.animateVisitors(time+.03,false,patches,false);expect(snapshot()).not.toEqual(paused);
    world.animateVisitors(time,false,patches,false);expect(snapshot()).toEqual(paused);
    for(const clock of [time,90]){world.animateVisitors(clock,true,patches,false);expectStill();}
    world.animateVisitors(time,false,patches,true);expectStill();
    expect(world.visitors.every(visitor=>!visitor.root.visible)).toBe(true);
    world.animateVisitors(time,false,patches,false);expect(snapshot()).toEqual(paused);
    world.animateVisitors(time,false,[],false);expectStill();
    world.animateVisitors(time,false,patches,false);
  });

  it('identifies four visually distinct adult species with finite shapes and species-specific marking shaders',()=>{
    expect(world.visitors.map(visitor=>visitor.speciesId)).toEqual(['cabbage-white','painted-lady','tiger-swallowtail','monarch']);
    const outlines=new Set(),patterns=new Set(),sizes=[];
    for(const visitor of world.visitors){
      const species=BF.meadowSpecies(visitor.speciesId);
      expect(BF.meadowSpeciesList).toContain(species);
      expect(visitor.root.userData).toMatchObject({speciesId:species.id,commonName:species.name,scientificName:species.latin});
      expect(visitor.root.scale.x).toBeCloseTo(.12*species.scale,12);sizes.push(visitor.root.scale.x);
      const wings=surfaces(visitor).filter(part=>/wing/.test(part.mesh.name));
      expect(wings.length).toBeGreaterThanOrEqual(4);
      const bounds=[];
      for(const {geometry} of wings){
        for(const name of ['position','normal'])expect(Array.from(geometry.attributes[name].array).every(Number.isFinite)).toBe(true);
        geometry.computeBoundingBox();bounds.push(geometry.boundingBox.min.toArray(),geometry.boundingBox.max.toArray());
      }
      outlines.add(JSON.stringify(bounds));
      const material=wings[0].material,shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};
      material.onBeforeCompile(shader);
      patterns.add(JSON.stringify({key:material.customProgramCacheKey(),fragment:shader.fragmentShader,uniforms:shader.uniforms}));
    }
    expect(outlines.size).toBeGreaterThanOrEqual(3);expect(patterns.size).toBe(4);
    expect(Math.max(...sizes)).toBeGreaterThan(Math.min(...sizes)*1.5);
  });

  it('replaces exactly one watched flower, preserving its color, transform and shared wind on switch and exit',()=>{
    const originals=flowerBatches(),patches=BF.plants.filter(patch=>patch.nectar),[first,second]=world.visitors;
    world.animate(15,false,false);world.animateVisitors(15,false,patches,false);
    world.watchVisitor(first);const initial=expectFlowerReplacement(originals);
    const firstPose=BF.visitorVisitPose(BF.visitorPatch(patches,0),0,15,false,first.speciesId);
    expect(initial.species).toBe(firstPose.flowerSpecies);
    expect(initial.stem).toBe(firstPose.flowerStem);
    expect(initial.patch).toBe(first.root.userData.patch);
    first.root.updateMatrix();
    const before=first.root.matrix.toArray(),matrix=initial.matrix.toArray();
    world.watchVisitor(first);expect(world.flowerDetail.source).toBe(initial);
    expectFlowerReplacement(originals);expect(first.root.matrix.toArray()).toEqual(before);
    expect(initial.matrix.toArray()).toEqual(matrix);

    world.watchVisitor(second);const other=expectFlowerReplacement(originals);
    expect(other.species).toBe(BF.visitorVisitPose(BF.visitorPatch(patches,1),1,15,false,second.speciesId).flowerSpecies);
    expect(other.batch).not.toBe(initial.batch);
    world.watchVisitor(first);
    world.animate(42,false,false);world.animateVisitors(42,false,patches,false);
    world.watchVisitor(first);const next=expectFlowerReplacement(originals);
    expect(next.stem).not.toBe(initial.stem);
    expect(next.stem).toBe(BF.visitorVisitPose(BF.visitorPatch(patches,0),0,42,false,first.speciesId).flowerStem);
    const paused=Array.from(next.batch.instanceMatrix.array),detailMatrix=next.matrix.toArray();
    world.animate(42,false,false);world.animateVisitors(42,false,patches,false);world.watchVisitor(first);
    expect(world.flowerDetail.source).toBe(next);
    expect(Array.from(next.batch.instanceMatrix.array)).toEqual(paused);
    expect(next.matrix.toArray()).toEqual(detailMatrix);
    world.watchVisitor(null);expectFlowersRestored(originals);
  });

  it('promotes two nearby foreground flowers while retaining the watched blossom and restoring every retargeted slot',()=>{
    const originals=flowerBatches(),patches=BF.plants.filter(patch=>patch.nectar),visitor=world.visitors[3];
    world.animate(2,false,false);world.animateVisitors(2,false,patches,false);
    const view=watchFromCamera(visitor),primary=expectFlowerReplacement(originals);
    const selected=world.flowerDetail.sources.slice();expect(selected).toHaveLength(3);
    const camera=new THREE.PerspectiveCamera(view.fov,1.8,.1,600);
    camera.position.fromArray(view.position);camera.lookAt(new THREE.Vector3(...view.target));camera.updateMatrixWorld(true);
    for(const slot of selected.slice(1)){
      const point=new THREE.Vector3(0,.25,0).applyMatrix4(slot.matrix).applyMatrix4(slot.batch.matrixWorld);
      expect(point.distanceTo(camera.position)).toBeLessThan(14.2);
      point.project(camera);expect(point.z).toBeGreaterThan(-1);expect(point.z).toBeLessThan(1);
      // The selection permits a flower-radius margin around the visible cone.
      expect(Math.abs(point.x)).toBeLessThan(1.5);expect(Math.abs(point.y)).toBeLessThan(1.5);
    }
    const head=world.flowerDetail.root.children.find(mesh=>mesh.visible);
    const paused={matrices:Array.from(head.instanceMatrix.array),colors:Array.from(head.instanceColor.array)};
    watchFromCamera(visitor);expect(world.flowerDetail.sources).toEqual(selected);
    expect({matrices:Array.from(head.instanceMatrix.array),colors:Array.from(head.instanceColor.array)}).toEqual(paused);
    expectFlowerReplacement(originals);

    // Camera movement alone can release foreground slots; the primary contact
    // remains detailed even when the view has no eligible nearby plants.
    world.watchVisitor(visitor,{position:[1000,1000,1000],target:[0,0,0],fov:view.fov},1.8);
    expect(world.flowerDetail.sources).toEqual([primary]);expectFlowerReplacement(originals);
    watchFromCamera(visitor);expect(world.flowerDetail.sources).toHaveLength(3);expectFlowerReplacement(originals);
    world.watchVisitor(null);expectFlowersRestored(originals);
  });

  it('restores a promoted restoration flower when its plot is hidden or reduced motion removes the contact',()=>{
    const originals=flowerBatches(),restoration={id:'restoration',x:-42,z:38,host:true,nectar:true};
    const patches=[BF.plants[0],BF.plants[1],restoration],visitor=world.visitors[2];
    showDesign('mixed');world.animate(15,false,false);world.animateVisitors(15,false,patches,false);
    watchFromCamera(visitor);const source=expectFlowerReplacement(originals);
    expect(source.patch).toBe('restoration');expect(source.batch.parent.name).toBe('restoration-mixed');
    showDesign('lawn');watchFromCamera(visitor);expectFlowersRestored(originals);
    showDesign('mixed');watchFromCamera(visitor);expectFlowerReplacement(originals);
    world.animate(15,true,false);world.animateVisitors(15,true,patches,false);watchFromCamera(visitor);
    expectFlowersRestored(originals);
  });

  it.each(['lawn','flowers','mixed'])('keeps every watched visitor within the %s meadow rendering budget',design=>{
    showDesign(design);world.player.root.visible=false;
    const patches=BF.plants.filter(patch=>patch.nectar);
    if(design!=='lawn')patches.push({id:'restoration',x:-42,z:38,host:design==='mixed',nectar:true});
    let largestPool=0;
    for(const clock of [2,15,32]){
      world.animate(clock,false,false);world.animateVisitors(clock,false,patches,false);
      for(const visitor of world.visitors){
        watchFromCamera(visitor);expect(world.flowerDetail.source).not.toBeNull();
        largestPool=Math.max(largestPool,world.flowerDetail.sources.length);
        const rendered=triangles(world.scene);
        expect(rendered).toBeGreaterThan(0);expect(rendered).toBeLessThan(400000);
      }
    }
    expect(largestPool).toBe(3);
  });

  it.each([.48,1,1.8])('centers the watched butterfly with a finite camera at aspect %s',aspect=>{
    const point={x:-42,y:5.8,z:27},before=JSON.stringify(point);
    const pose=BF.pollinatorCamera(point,aspect);
    expect([...pose.position,...pose.target,pose.fov].every(Number.isFinite)).toBe(true);
    expect(pose.fov).toBeGreaterThan(0);expect(pose.fov).toBeLessThan(90);
    const camera=new THREE.PerspectiveCamera(pose.fov,aspect,.1,600);
    camera.position.fromArray(pose.position);camera.lookAt(new THREE.Vector3(...pose.target));camera.updateMatrixWorld(true);
    const center=new THREE.Vector3(...pose.target).project(camera),insect=new THREE.Vector3(point.x,point.y,point.z).project(camera);
    expect(Math.abs(center.x)).toBeLessThan(1e-8);expect(Math.abs(center.y)).toBeLessThan(1e-8);
    expect(Math.abs(insect.x)).toBeLessThan(.1);expect(Math.abs(insect.y)).toBeLessThan(.1);
    const wide=BF.pollinatorCamera(point,1.8),distance=new THREE.Vector3(...pose.position).distanceTo(new THREE.Vector3(...pose.target));
    if(aspect<1)expect(distance).toBeGreaterThan(new THREE.Vector3(...wide.position).distanceTo(new THREE.Vector3(...wide.target)));
    expect(JSON.stringify(point)).toBe(before);
  });

  it('keeps cruising headings smooth through the former nearly stationary turn',()=>{
    const patch={x:0,z:0},step=.01;
    for(let index=0;index<4;index++)for(let time=24;time<28;time+=step){
      const before=BF.visitorFlightPose(patch,index,time,false),after=BF.visitorFlightPose(patch,index,time+step,false);
      const turn=Math.atan2(Math.sin(after.yaw-before.yaw),Math.cos(after.yaw-before.yaw));
      expect(Math.abs(turn)).toBeLessThan(.02);
      expect(Math.hypot(after.x-before.x,after.z-before.z)/step).toBeGreaterThan(.1);
    }
  });
});
