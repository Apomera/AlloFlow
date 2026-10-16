import {afterAll,beforeAll,describe,expect,it} from 'vitest';
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

afterAll(()=>{
  if(!world)return;
  const resources=new Set();
  world.scene.traverse(object=>{
    if(object.geometry)resources.add(object.geometry);
    if(object.material)(Array.isArray(object.material)?object.material:[object.material]).forEach(material=>resources.add(material));
  });
  resources.forEach(resource=>resource.dispose());
});

function showDesign(design){
  world.restoration.children.forEach(group=>{group.visible=group.name==='restoration-'+design;});
  world.scene.updateMatrixWorld(true);
}

describe('Butterfly meadow native geometry',()=>{
  it('builds finite positions and normals for the entire scene, including hidden planting alternatives',()=>{
    const geometries=new Set();
    world.scene.traverse(object=>{if(object.geometry)geometries.add(object.geometry);});
    expect(geometries.size).toBeGreaterThan(0);
    for(const geometry of geometries){
      expect(geometry.attributes.position.count).toBeGreaterThan(0);
      for(const attribute of ['position','normal']){
        const values=geometry.attributes[attribute]?.array;
        expect(values,`${geometry.name||geometry.type} ${attribute}`).toBeDefined();
        expect(Array.from(values).every(Number.isFinite),`${geometry.name||geometry.type} ${attribute}`).toBe(true);
      }
    }
  });

  it.each(['lawn','flowers','mixed'])('keeps the rendered %s meadow below its mobile geometry budget',design=>{
    showDesign(design);
    let triangles=0;
    world.scene.traverseVisible(object=>{
      if(object.geometry)triangles+=(object.geometry.index?object.geometry.index.count:object.geometry.attributes.position.count)/3*(object.isInstancedMesh?object.count:1);
    });
    expect(triangles).toBeGreaterThan(0);
    expect(triangles).toBeLessThan(400000);
    expect(world.scene.getObjectByName('shared-meadow-grass').isInstancedMesh).toBe(true);
  });

  it.each([
    ['milkweed','lawn'],['bergamot','lawn'],['restoration','flowers'],['restoration','mixed']
  ])('anchors the %s leaf lens to a visible leaf in the %s design',(habitat,design)=>{
    const state=BF.freshState();
    if(habitat==='restoration')BF.applyPlan(state,design,'both');
    const patch=BF.habitats(state).find(plant=>plant.id===habitat);
    Object.assign(state,{x:patch.x,z:patch.z});
    expect(BF.land(state).ok).toBe(true);
    const detail=BF.fieldDetail(state,'leaves'),target=new THREE.Vector3(detail.point.x,detail.point.y,detail.point.z);
    showDesign(design);
    const matrix=new THREE.Matrix4(),position=new THREE.Vector3();
    let distance=Infinity;
    world.scene.traverseVisible(object=>{
      if(!object.isInstancedMesh||object.geometry.name!=='habitat-leaf-blade')return;
      for(let index=0;index<object.count;index++){
        object.getMatrixAt(index,matrix);
        position.setFromMatrixPosition(matrix).applyMatrix4(object.matrixWorld);
        distance=Math.min(distance,position.distanceTo(target));
      }
    });
    expect(distance).toBeLessThan(.00001);
  });

  it('drives grass breeze only from the simulation clock and freezes it for reduced motion',()=>{
    const grass=world.scene.getObjectByName('shared-meadow-grass');
    const shader={uniforms:{},vertexShader:'#include <begin_vertex>'};
    grass.material.onBeforeCompile(shader);
    world.animate(7,false);
    expect(shader.uniforms.bfBreeze.value).toBe(7);
    world.animate(7,false);
    expect(shader.uniforms.bfBreeze.value).toBe(7);
    world.animate(19,true);
    expect(shader.uniforms.bfBreeze.value).toBe(0);
    world.animate(NaN,false);
    expect(shader.uniforms.bfBreeze.value).toBe(0);
  });

  it('retains paired articulated wings and the monarch six-leg anatomy',()=>{
    const player=world.player;
    expect(player.root.userData.anatomy).toMatchObject({forewings:2,hindwings:2,antennae:2,legs:6,reducedForelegs:true,coiledProboscis:true});
    expect(player.wings).toHaveLength(2);
    expect(player.hindWings).toHaveLength(2);
    for(const [index,side] of ['left','right'].entries()){
      expect(player.wings[index].getObjectByName('monarch-forewing-'+side)?.isMesh).toBe(true);
      expect(player.wings[index].getObjectByName('monarch-hindwing-'+side)?.isMesh).toBe(true);
      expect(player.hindWings[index].parent).toBe(player.wings[index]);
    }
    const body=player.root.getObjectByName('monarch-body');
    expect(body.isMesh).toBe(true);
    expect(body.geometry.boundingSphere.radius).toBeGreaterThan(0);
    expect(Number.isFinite(body.geometry.boundingSphere.radius)).toBe(true);
    player.root.traverse(part=>{
      expect([...part.position.toArray(),...part.rotation.toArray().slice(0,3),...part.scale.toArray()].every(Number.isFinite)).toBe(true);
    });
  });
});
