import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {createRequire} from 'node:module';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

const require=createRequire(import.meta.url),THREE=require('../vendor/three-r128/three.min.js');
let world,shaders,samples;
const vec2=(x,y)=>({x,y}),vec3=(x,y,z)=>({x,y,z});
const dot=(a,b)=>a.x*b.x+a.y*b.y+(a.z===undefined?0:a.z*b.z);
const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
const smoothstep=(lo,hi,x)=>{const t=clamp((x-lo)/(hi-lo),0,1);return t*t*(3-2*t);};

// Execute the small scalar-only GLSL helpers emitted by the actual material
// callbacks. This intentionally supports no general shader language: a helper
// with branches, nested blocks, or vector operators fails rather than silently
// substituting a second implementation of the production derivative.
function emittedHelper(shader,name){
  const match=shader.vertexShader.match(new RegExp('\\b(?:float|vec[23]) '+name+'\\(([^)]*)\\)\\{([^{}]*)\\}'));
  expect(match,'emitted '+name).not.toBeNull();
  const params=match[1].split(',').map(param=>param.trim().replace(/^(?:float|vec[23]) /,''));
  const body=match[2].replace(/\bfloat /g,'let ');
  expect(body).not.toMatch(/\b(?:if|for|while|vec[234] [a-zA-Z_])\b|[#{}]/);
  const compiled=new Function(...params,'bfBreeze','bfWindStrength','vec2','vec3','dot','sin','cos','max','clamp','smoothstep',body);
  return (...args)=>compiled(...args,shader.uniforms.bfBreeze.value,shader.uniforms.bfWindStrength.value,vec2,vec3,dot,Math.sin,Math.cos,Math.max,clamp,smoothstep);
}

beforeAll(()=>{
  resetStemLab();window.__RR_TEST_EXPORTS__={};loadTool('stem_lab/stem_tool_butterfly.js','butterfly');
  world=window.__RR_TEST_EXPORTS__.butterfly.buildWorld(THREE,window.StemMeadow);world.scene.updateMatrixWorld(true);
  shaders=new Map();samples=new Map(['plant','canopy','wood'].map(kind=>[kind,[]]));
  const geometrySamples=new Map(),matrix=new THREE.Matrix4(),point=new THREE.Vector3(),normal=new THREE.Vector3(),normalMatrix=new THREE.Matrix3();
  world.scene.traverse(object=>{
    const material=object.material,kind=material?.userData.meadowWind;if(!kind)return;
    if(!shaders.has(kind)){
      const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};
      material.onBeforeCompile(shader);shaders.set(kind,shader);
    }
    const geometry=object.geometry,p=geometry.attributes.position,n=geometry.attributes.normal;
    if(!geometrySamples.has(geometry)){
      let high=0;for(let i=1;i<p.count;i++)if(p.getY(i)>p.getY(high))high=i;
      geometrySamples.set(geometry,[0,Math.floor((p.count-1)/2),p.count-1,high]);
    }
    for(let instance=0;instance<(object.isInstancedMesh?object.count:1);instance++){
      if(object.isInstancedMesh){object.getMatrixAt(instance,matrix);matrix.premultiply(object.matrixWorld);}else matrix.copy(object.matrixWorld);
      if(Math.abs(matrix.determinant())<1e-12)continue;
      normalMatrix.getNormalMatrix(matrix);
      for(const index of geometrySamples.get(geometry)){
        point.fromBufferAttribute(p,index).applyMatrix4(matrix);normal.fromBufferAttribute(n,index).applyMatrix3(normalMatrix).normalize();
        if(normal.lengthSq()>.9)samples.get(kind).push({point:point.clone(),normal:normal.clone()});
      }
    }
  });
  for(const [kind,points] of samples){
    expect(points.length,kind+' actual world vertices').toBeGreaterThan(100);
    // Span instance placements and geometry extrema while bounding the
    // number of finite-difference evaluations.
    const stride=Math.max(1,Math.floor(points.length/512));samples.set(kind,points.filter((_,index)=>index%stride===0));
  }
});

afterAll(()=>{
  if(!world)return;const resources=new Set();
  world.scene.traverse(object=>{if(object.geometry)resources.add(object.geometry);if(object.material)(Array.isArray(object.material)?object.material:[object.material]).forEach(material=>resources.add(material));});
  resources.forEach(resource=>resource.dispose());
});

describe('Butterfly wind surface lighting',()=>{
  it('differentiates the actual travelling gust rather than a separate wind field',()=>{
    const shader=shaders.get('plant'),gust=emittedHelper(shader,'bfMeadowGust'),gradient=emittedHelper(shader,'bfMeadowGustGradient'),epsilon=.0001;
    let error=0;
    for(const clock of [0,.25,4.5,19,83])for(const strength of [0,.5,1]){
      world.animate(clock,false);shader.uniforms.bfWindStrength.value=strength;
      for(const {point:p} of samples.get('plant')){
        const actual=gradient(vec2(p.x,p.z));
        const dx=(gust(vec2(p.x+epsilon,p.z))-gust(vec2(p.x-epsilon,p.z)))/(2*epsilon);
        const dz=(gust(vec2(p.x,p.z+epsilon))-gust(vec2(p.x,p.z-epsilon)))/(2*epsilon);
        error=Math.max(error,Math.abs(actual.x-dx),Math.abs(actual.y-dz));
      }
    }
    expect(error).toBeLessThan(1e-8);world.animate(0,false);
  });

  it('keeps transported normals perpendicular to the independently warped surface tangents',()=>{
    const epsilon=.00001,axis=[new THREE.Vector3(1,0,0),new THREE.Vector3(0,1,0),new THREE.Vector3(0,0,1)];
    let error=0,minDeterminant=Infinity;
    for(const [kind,shader] of shaders){
      const gust=emittedHelper(shader,'bfMeadowGust'),gustGradient=emittedHelper(shader,'bfMeadowGustGradient'),transport=emittedHelper(shader,'bfMeadowWindNormal'),flutterGradient=emittedHelper(shader,'bfMeadowFlutterGradient');
      const source=shader.vertexShader;
      const load=Number(source.match(/float bfWindLoad=([.\d]+)/)?.[1]);expect(load).toBeGreaterThan(0);
      const bendExpression=source.match(/float bfBend=([^;]+);/)?.[1];expect(bendExpression).toBeTruthy();
      const bend=new Function('bfHeight','bfGust','bfPlantWind','return '+bendExpression);
      // The forward map uses the existing emitted position expression as the
      // oracle. It never uses either analytic gradient under test.
      const flutterExpression=source.match(/bfWorld\.xz\+=vec2\(\.025,\.018\)\*([^;]+);/)?.[1];
      expect(!!flutterExpression).toBe(kind==='canopy');
      const flutter=flutterExpression?new Function('bfBreeze','bfWindStrength','bfHeight','bfWorld','sin','smoothstep','return '+flutterExpression):null;
      function warp(p){
        const height=Math.max(0,p.y),b=bend(height,gust(vec2(p.x,p.z)),shader.uniforms.bfPlantWind.value),q=p.clone().add(new THREE.Vector3(b,0,b*.46));
        if(flutter){const f=flutter(shader.uniforms.bfBreeze.value,shader.uniforms.bfWindStrength.value,height,q,Math.sin,smoothstep);q.add(new THREE.Vector3(.025*f,0,.018*f));}return q;
      }
      function derivative(p,tangent){return warp(p.clone().addScaledVector(tangent,epsilon)).sub(warp(p.clone().addScaledVector(tangent,-epsilon))).multiplyScalar(.5/epsilon);}
      for(const clock of [0,.25,4.5,19,83]){
        world.animate(clock,false);
        for(const {point:p,normal:n} of samples.get(kind)){
          const h=Math.max(0,p.y),g=gust(vec2(p.x,p.z)),slope=gustGradient(vec2(p.x,p.z)),k=load*(kind==='plant'?shader.uniforms.bfPlantWind.value:1);
          let transported=transport(n,vec3(k*h*h*slope.x,k*2*h*g,k*h*h*slope.y),vec3(1,0,.46));
          if(kind==='canopy'){
            const b=bend(h,g,1),q=p.clone().add(new THREE.Vector3(b,0,b*.46));transported=transport(transported,flutterGradient(q,h),vec3(.025,0,.018));
          }
          const corrected=new THREE.Vector3(transported.x,transported.y,transported.z).normalize();
          const tangent=new THREE.Vector3().crossVectors(n,Math.abs(n.y)<.9?axis[1]:axis[0]).normalize(),bitangent=new THREE.Vector3().crossVectors(n,tangent).normalize();
          error=Math.max(error,Math.abs(corrected.dot(derivative(p,tangent).normalize())),Math.abs(corrected.dot(derivative(p,bitangent).normalize())));
          const columns=axis.map(direction=>derivative(p,direction));minDeterminant=Math.min(minDeterminant,columns[0].dot(new THREE.Vector3().crossVectors(columns[1],columns[2])));
        }
      }
    }
    expect(error,'world normal stays perpendicular to both deformed tangents').toBeLessThan(1e-7);
    expect(minDeterminant,'wind remains orientation preserving across actual scene samples').toBeGreaterThan(.5);world.animate(0,false);
  });

  it('composes after local leaf flex and preserves exact still and inspection normals',()=>{
    const leafMaterials=new Set();world.scene.traverse(object=>{if(object.geometry?.name==='habitat-leaf-blade')leafMaterials.add(object.material);});
    expect(leafMaterials.size).toBeGreaterThan(0);
    for(const material of leafMaterials){
      const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};material.onBeforeCompile(shader);
      const localFlex=shader.vertexShader.indexOf('objectNormal=normalize(vec3(objectNormal.x-bfBladeFlex.y');
      expect(localFlex).toBeGreaterThanOrEqual(0);
      expect(localFlex).toBeLessThan(shader.vertexShader.indexOf('vec3 bfWindBase=bfWorld.xyz;'));
      expect(shader.vertexShader).toContain('if(bfWindStrength>0.&&bfPlantWind>0.)');
      expect(shader.vertexShader).toContain('(vec4(transformedNormal,0.)*viewMatrix).xyz');
      expect(shader.vertexShader).toContain('transformedNormal=mat3(viewMatrix)*bfWindNormal;vNormal=normalize(transformedNormal);');
    }
    for(const shader of shaders.values()){
      const transport=emittedHelper(shader,'bfMeadowWindNormal'),n=vec3(.3,.8,-.4);
      expect(transport(n,vec3(0,0,0),vec3(1,0,.46))).toEqual(n);
      const initialNormal=shader.vertexShader.search(/\bvNormal\s*=\s*normalize\(\s*transformedNormal\s*\)\s*;/);
      expect(initialNormal).toBeGreaterThanOrEqual(0);
      expect(shader.vertexShader.lastIndexOf('vNormal=normalize(transformedNormal);')).toBeGreaterThan(initialNormal);
    }
    world.animate(23,true);for(const shader of shaders.values())expect(shader.uniforms.bfWindStrength.value).toBe(0);
    world.animate(4.5,false,true);expect(shaders.get('plant').uniforms.bfPlantWind.value).toBe(0);world.animate(0,false);
  });

  it('keeps grass normals perpendicular to bending blades with each tuft root held fixed',()=>{
    const grass=world.scene.getObjectByName('shared-meadow-grass');expect(grass?.count).toBeGreaterThan(1000);
    const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};grass.material.onBeforeCompile(shader);
    const gust=emittedHelper(shader,'bfMeadowGust'),transport=emittedHelper(shader,'bfGrassWindNormal'),source=shader.vertexShader;
    const rustleExpression=source.match(/float bfRustle=([^;]+);/)[1];
    const rustle=new Function('bfBreeze','bfGrassSeed','bfWindStrength','sin','return '+rustleExpression);
    const forward=source.match(/bfWorld\.xz\+=vec2\(([^,]+),([^)]+)\)\*bfBladeHeight\*bfBladeHeight;/);
    const correction=source.match(/bfGrassWindNormal\(bfGrassNormal,vec2\(([^,]+),([^)]+)\),bfBladeHeight\)/);
    expect(forward).not.toBeNull();expect(correction).not.toBeNull();
    const bend=match=>new Function('bfWave','bfRustle','vec2','return vec2('+match[1]+','+match[2]+')');
    const positionBend=bend(forward),normalBend=bend(correction),matrix=new THREE.Matrix4(),normalMatrix=new THREE.Matrix3();
    const positions=grass.geometry.attributes.position,normals=grass.geometry.attributes.normal,cards=grass.geometry.attributes.bfGrassCard;
    const epsilon=.00001,stride=Math.max(1,Math.floor(grass.count/128));let error=0,checked=0;
    for(const clock of [0,.25,4.5,19,83])for(const strength of [0,.5,1]){
      world.animate(clock,false);shader.uniforms.bfWindStrength.value=strength;
      for(let instance=0;instance<grass.count;instance+=stride){
        grass.getMatrixAt(instance,matrix);const localRoot=new THREE.Vector3().setFromMatrixPosition(matrix);
        matrix.premultiply(grass.matrixWorld);normalMatrix.getNormalMatrix(matrix);
        const root=localRoot.clone().applyMatrix4(grass.matrixWorld),wave=gust(vec2(root.x,root.z));
        for(let index=0;index<positions.count;index++){
          const point=new THREE.Vector3().fromBufferAttribute(positions,index).applyMatrix4(matrix),height=Math.max(0,point.y-root.y);
          // The clamped root is C1. Check its exact identity separately below;
          // here avoid central differences straddling the height clamp.
          if(height<epsilon*2)continue;
          const n=new THREE.Vector3().fromBufferAttribute(normals,index).applyMatrix3(normalMatrix).normalize();
          const seed=localRoot.x*.37+localRoot.z*.61+cards.getX(index)*4.13;
          const r=rustle(clock,seed,strength,Math.sin),positionLoad=positionBend(wave,r,vec2),normalLoad=normalBend(wave,r,vec2);
          const moved=transport(n,normalLoad,height),corrected=new THREE.Vector3(moved.x,moved.y,moved.z).normalize();
          // Perturb the surface point, never the tuft root or its wind sample.
          const warp=p=>{const h=Math.max(0,p.y-root.y);return p.clone().add(new THREE.Vector3(positionLoad.x*h*h,0,positionLoad.y*h*h));};
          const tangent=new THREE.Vector3().crossVectors(n,new THREE.Vector3(0,1,0)).normalize(),bitangent=new THREE.Vector3().crossVectors(n,tangent).normalize();
          for(const direction of [tangent,bitangent]){
            const deformed=warp(point.clone().addScaledVector(direction,epsilon)).sub(warp(point.clone().addScaledVector(direction,-epsilon))).normalize();
            error=Math.max(error,Math.abs(corrected.dot(deformed)));
          }
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(10000);expect(error).toBeLessThan(1e-7);world.animate(0,false);
  });

  it('preserves grass root and still normals, with shared reduced-motion controls',()=>{
    const grass=world.scene.getObjectByName('shared-meadow-grass');
    const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};grass.material.onBeforeCompile(shader);
    const transport=emittedHelper(shader,'bfGrassWindNormal'),n=vec3(.3,.8,-.4);
    expect(transport(n,vec2(0,0),2.4)).toEqual(n);
    expect(transport(n,vec2(.17,-.09),0)).toEqual(n);
    expect(transport(vec3(0,1,0),vec2(.17,-.09),2.4)).toEqual(vec3(0,1,0));
    expect(shader.uniforms.bfBreeze).toBe(shaders.get('plant').uniforms.bfBreeze);
    expect(shader.uniforms.bfWindStrength).toBe(shaders.get('plant').uniforms.bfWindStrength);
    const source=shader.vertexShader,initial=source.search(/\bvNormal\s*=\s*normalize\(\s*transformedNormal\s*\)\s*;/);
    expect(initial).toBeGreaterThanOrEqual(0);expect(source.lastIndexOf('vNormal=normalize(transformedNormal);')).toBeGreaterThan(initial);
    expect(source).toContain('if(bfWindStrength>0.)');
    world.animate(23,true);expect(shader.uniforms.bfWindStrength.value).toBe(0);world.animate(0,false);
  });
});
