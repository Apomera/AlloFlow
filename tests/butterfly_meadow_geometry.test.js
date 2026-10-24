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
      // Custom surface coordinates must cover every vertex, including the
      // separate close-up flower meshes that are promoted at runtime.
      for(const [name,attribute] of Object.entries(geometry.attributes)){
        expect(attribute.count,`${geometry.name||geometry.type} ${name} vertex coverage`).toBe(geometry.attributes.position.count);
        expect(Array.from(attribute.array).every(Number.isFinite),`${geometry.name||geometry.type} ${name} finite surface coordinates`).toBe(true);
      }
    }
  });

  it('keeps distant hill surfaces below tree roots, woodland grass and projected canopy shadows',()=>{
    world.scene.updateMatrixWorld(true);
    const hills=[],samples=[],shadows=[],material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
    let groundBounds;
    const matrix=new THREE.Matrix4(),point=new THREE.Vector3(),counts={trees:0,grass:0};
    function eachMatrix(object,visit){
      for(let i=0;i<(object.isInstancedMesh?object.count:1);i++){
        if(object.isInstancedMesh){object.getMatrixAt(i,matrix);matrix.premultiply(object.matrixWorld);}
        else matrix.copy(object.matrixWorld);
        visit(matrix);
      }
    }
    world.scene.traverse(object=>{
      if(!object.isMesh)return;
      if(object.geometry.name==='meadow-ground-surface')groundBounds=new THREE.Box3().setFromObject(object);
      if(object.geometry.name==='rolling-meadow-hill')eachMatrix(object,transform=>{
        const hill=new THREE.Mesh(object.geometry,material);hill.matrixAutoUpdate=false;hill.matrixWorld.copy(transform);
        hill.userData.bounds=new THREE.Box3().setFromBufferAttribute(object.geometry.attributes.position).applyMatrix4(transform);
        hills.push(hill);
      });
      if(object.geometry.name==='woodland-curved-trunk')eachMatrix(object,transform=>{
        samples.push({kind:'tree foot',point:new THREE.Vector3(0,-.5,0).applyMatrix4(transform)});counts.trees++;
      });
      if(object.name==='shared-meadow-grass')eachMatrix(object,transform=>{
        point.setFromMatrixPosition(transform);
        if(Math.hypot(point.x,point.z)>150){samples.push({kind:'woodland grass',point:point.clone()});counts.grass++;}
      });
      if(object.material?.name==='meadow-soft-shadows')eachMatrix(object,transform=>{
        const e=transform.elements;
        if(Math.hypot(e[0],e[1],e[2])>12)shadows.push({matrix:transform.clone(),uniforms:object.material.uniforms});
      });
    });
    expect(hills).toHaveLength(11);expect(counts.trees).toBe(57);expect(counts.grass).toBeGreaterThan(1000);expect(shadows).toHaveLength(57);
    expect(groundBounds,'ground covers the buried lower portions of the hills').toBeDefined();
    for(const hill of hills){
      const box=hill.userData.bounds;
      expect(box.min.x).toBeGreaterThanOrEqual(groundBounds.min.x);expect(box.max.x).toBeLessThanOrEqual(groundBounds.max.x);
      expect(box.min.z).toBeGreaterThanOrEqual(groundBounds.min.z);expect(box.max.z).toBeLessThanOrEqual(groundBounds.max.z);
    }
    const ray=new THREE.Raycaster(new THREE.Vector3(),new THREE.Vector3(0,-1,0),0,1000),buried=[];
    try{
      // Freeze shared wind so the actual shadow matrices and sun uniform give
      // stable crown centers under both real lighting presets.
      world.animate(0,true);
      for(const mode of ['daylight','golden']){
        world.setLight(mode);
        for(const shadow of shadows){
          const e=shadow.matrix.elements,height=Math.hypot(e[8],e[9],e[10]),cast=shadow.uniforms.bfShadowCast.value;
          samples.push({kind:mode+' canopy shadow',point:new THREE.Vector3(e[12]+cast.x*height*.78,.031,e[14]+cast.y*height*.78)});
        }
      }
      for(const sample of samples){
        const p=sample.point;ray.ray.origin.set(p.x,100,p.z);
        for(const hill of hills){
          const box=hill.userData.bounds;
          if(p.x<box.min.x||p.x>box.max.x||p.z<box.min.z||p.z>box.max.z)continue;
          const hit=ray.intersectObject(hill,false)[0];
          if(hit&&hit.point.y>p.y+.00001)buried.push({kind:sample.kind,x:p.x,z:p.z,hillHeight:hit.point.y,rootHeight:p.y});
        }
      }
      expect(buried,'distant hills must not bury rooted vegetation or canopy shadows').toEqual([]);
    }finally{world.setLight('daylight');world.animate(0,false);material.dispose();}
  });

  it('pins the feeding cap in ordinary and promoted flowers while allowing surrounding florets to vary',()=>{
    const geometries=new Map();
    world.scene.traverse(object=>{
      if(object.geometry)geometries.set(object.geometry.name,object.geometry);
    });
    for(const milkweed of [true,false]){
      const name=milkweed?'milkweed-flower-umbel':'bergamot-tubular-flower-head';
      let ordinaryContactFrames;
      for(const suffix of ['','-close-detail']){
        const geometry=geometries.get(name+suffix);
        expect(geometry,`${name+suffix} exists even before promotion`).toBeDefined();
        const anchors=geometry.getAttribute('bfBloomAnchor'),axes=geometry.getAttribute('bfBloomAxis');
        expect(anchors).toBeDefined();expect(axes).toBeDefined();
        const florets=new Map();
        for(let vertex=0;vertex<anchors.count;vertex++){
          const pivot=[anchors.getX(vertex),anchors.getY(vertex),anchors.getZ(vertex)];
          const direction=[axes.getX(vertex),axes.getY(vertex),axes.getZ(vertex)];
          // Milkweed florets radiate from one shared pedicel origin. Bergamot
          // tubes have separate basal positions; the central tube is closest
          // to the stem. Identify these spatially, independently of their IDs.
          if(milkweed){
            expect(axes.getW(vertex)).toBe(1);
          }else if(Math.hypot(pivot[0],pivot[2])<.001){
            expect(anchors.getW(vertex),'neutral bracts remain fixed').toBe(0);
            continue;
          }
          const frame=(milkweed?direction:pivot).join(',');
          if(!florets.has(frame))florets.set(frame,{frame,rank:milkweed?-direction[1]:Math.hypot(pivot[0],pivot[2]),vertices:[]});
          florets.get(frame).vertices.push(vertex);
        }
        const ordered=[...florets.values()].sort((a,b)=>a.rank-b.rank);
        const cap=ordered.slice(0,milkweed?3:1),surroundings=ordered.slice(cap.length);
        expect(cap).toHaveLength(milkweed?3:1);
        expect(surroundings.length).toBeGreaterThan(3);
        for(const floret of cap){
          expect(floret.vertices.length).toBeGreaterThan(3);
          for(const vertex of floret.vertices){
            expect(anchors.getW(vertex),`${name+suffix} contact cap vertex ${vertex} bypasses deformation`).toBe(0);
          }
        }
        expect(surroundings.every(floret=>floret.vertices.every(vertex=>anchors.getW(vertex)>.5)),`${name+suffix} neighboring florets retain variation`).toBe(true);
        const contactFrames=cap.map(floret=>floret.frame);
        if(!suffix)ordinaryContactFrames=contactFrames;
        else expect(contactFrames,'promotion preserves the same protected contact cap').toEqual(ordinaryContactFrames);
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

  it('supplies foliage colors so instanced hedgerows do not render black',()=>{
    const hedgerow=world.scene.getObjectByName('meadow-hedgerow');
    let checked=0;
    hedgerow.traverseVisible(object=>{
      if(!object.isMesh||!object.material.vertexColors)return;
      const colors=object.geometry.getAttribute('color');
      expect(colors).toBeDefined();
      expect(colors.count).toBe(object.geometry.getAttribute('position').count);
      expect(Array.from(colors.array).every(value=>Number.isFinite(value)&&value>0)).toBe(true);
      checked++;
    });
    expect(checked).toBeGreaterThan(0);
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

  it('shares one wind clock across instanced foliage and holds inspection surfaces still',()=>{
    const materials=new Set();
    world.scene.traverse(object=>{if(object.material?.userData.meadowWind)materials.add(object.material);});
    expect(new Set([...materials].map(material=>material.userData.meadowWind))).toEqual(new Set(['plant','canopy','wood']));
    const shaders=[...materials].map(material=>{
      const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};
      material.onBeforeCompile(shader);
      expect(shader.vertexShader).toContain('bfMeadowGust');
      expect(shader.vertexShader).not.toContain('#include <project_vertex>');
      return shader;
    });
    world.animate(4.5,false);
    for(const shader of shaders){
      expect(shader.uniforms.bfBreeze).toBe(shaders[0].uniforms.bfBreeze);
      expect(shader.uniforms.bfBreeze.value).toBe(4.5);
      expect(shader.uniforms.bfWindStrength.value).toBe(1);
      expect(shader.uniforms.bfPlantWind.value).toBe(1);
    }
    world.animate(4.5,false,true);
    expect(shaders[0].uniforms.bfBreeze.value).toBe(4.5);
    expect(shaders[0].uniforms.bfPlantWind.value).toBe(0);
    world.animate(23,true);
    for(const shader of shaders){expect(shader.uniforms.bfBreeze.value).toBe(0);expect(shader.uniforms.bfWindStrength.value).toBe(0);}
    world.animate(4.5,false);
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
