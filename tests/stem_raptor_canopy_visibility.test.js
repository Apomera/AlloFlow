import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const THREE=createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source=readFileSync('stem_lab/stem_tool_raptorhunt.js','utf8');
function body(name){const start=source.indexOf('function '+name+'(');if(start<0)throw Error(name);let end=source.indexOf('{',start),depth=1;while(depth){end++;if(source[end]==='{')depth++;if(source[end]==='}')depth--;}return source.slice(start,end+1);}
const state=()=>({subject:{value:new THREE.Vector3(0,2,-12)},enabled:{value:1}});
const patch=Function(body('softenCameraFoliage')+';return softenCameraFoliage;')();
const shader=depth=>({uniforms:{},vertexShader:THREE.ShaderLib[depth?'depth':'standard'].vertexShader,fragmentShader:THREE.ShaderLib[depth?'depth':'standard'].fragmentShader});
function pipeline(biome='rainforest'){
  const shared=state();
  const apply=Function('THREE','cameraFoliage','species',`
    const vegetationShaderCounts={surface:0,shadow:0};
    const vegetationWind={value:new THREE.Vector3(.1,0,.2)},waterAppearance={time:{value:2}};
    const skyAtmosphere={sun:{value:new THREE.Vector3(0,1,0)},day:{value:1},cloud:{value:.2}};
    const foliageTransmission={value:.3};
    const landscapeAtmosphere={strength:{value:1},zenith:{value:new THREE.Color(.2,.4,.6)}};
    ${body('applyLandscapeAtmosphere')}
    ${body('softenCameraFoliage')}
    ${body('applyVegetationWind')}
    return {apply:applyVegetationWind,counts:vegetationShaderCounts};
  `)(THREE,shared,{biome});
  return {...apply,shared};
}
const surface=()=>new THREE.MeshStandardMaterial({alphaTest:.32,side:THREE.DoubleSide,roughness:.95});

describe('Camera canopy clarity shader',()=>{
  it('composes real canopy wind, transmission and aerial haze with a shared world varying',()=>{
    for(const biome of ['rainforest','forest-night','tundra'])for(const kind of ['bough','shrub']){
      const api=pipeline(biome),material=surface();api.apply(material,kind);
      const program=shader(false);material.onBeforeCompile(program,{});
      expect(program.uniforms.rhFoliageSubject).toBe(api.shared.subject);
      expect(program.uniforms.rhFoliageClearance).toBe(api.shared.enabled);
      for(const key of ['rhVegetationTime','rhVegetationWind','rhCanopySun','rhCanopyTransmission','rhAerialStrength'])expect(program.uniforms[key]).toBeDefined();
      expect(program.vertexShader).toContain('transformed+=plantWind');
      expect(program.vertexShader).toContain('aerialPosition=instanceMatrix*aerialPosition');
      expect(program.vertexShader.match(/varying vec3 vRhAerialWorld;/g)).toHaveLength(1);
      expect(program.vertexShader).not.toContain('vRhFoliageWorld');
      expect(program.fragmentShader).toContain('float canopyBacklight=');
      expect(program.fragmentShader).toContain('float aerialRange=');
      expect(program.fragmentShader).toContain('dot(vRhAerialWorld-cameraPosition,rhViewSegment)');
      expect(program.fragmentShader).toContain('#include <alphatest_fragment>');
      expect(material.customProgramCacheKey()).toContain('raptor-vegetation-wind-v2-'+kind+'-'+biome+'-aerial-v1-plant-camera-corridor-v1-aerial');
      expect(material.userData.cameraFoliageCompiled).toBe(true);expect(material.userData.aerialCompiled).toBe(true);expect(material.userData.transmissionCompiled).toBe(true);
      expect(api.counts).toEqual({surface:1,shadow:0});material.dispose();
    }
  });
  it('retains full wind-patched shadow silhouettes and normal grass/reed shaders',()=>{
    const api=pipeline();
    for(const kind of ['bough','shrub','reed','grass'])for(const depth of [false,true]){
      const material=depth?new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,alphaTest:.32,side:THREE.DoubleSide}):surface();
      api.apply(material,kind);const program=shader(depth);material.onBeforeCompile(program,{});
      expect(program.vertexShader).toContain('transformed+=plantWind');
      if(depth||kind==='reed'||kind==='grass'){
        expect(program.fragmentShader).not.toContain('rhFoliageClearance');expect(program.uniforms.rhFoliageSubject).toBeUndefined();
        expect(material.userData.cameraFoliage).toBeUndefined();
      }
      if(depth){expect(program.fragmentShader).toContain('#include <alphatest_fragment>');expect(material.customProgramCacheKey()).not.toContain('camera-corridor');}
      material.dispose();
    }
    expect(api.counts).toEqual({surface:4,shadow:4});
  });
  it('supports standalone instanced and ordinary surfaces without changing opaque render settings',()=>{
    const material=surface(),shared=state(),renderer={},originalKey='original-leaf-v1';let priorCalls=0;
    material.onBeforeCompile=function(program,r){expect(this).toBe(material);expect(r).toBe(renderer);priorCalls++;program.uniforms.original={value:7};};
    material.customProgramCacheKey=function(){expect(this).toBe(material);return originalKey;};
    const version=material.version,settings=[material.transparent,material.depthWrite,material.alphaTest,material.side,material.opacity];
    patch(material,shared);const program=shader(false);material.onBeforeCompile(program,renderer);
    expect(priorCalls).toBe(1);expect(program.uniforms.original.value).toBe(7);
    expect(program.vertexShader).toContain('#ifdef USE_INSTANCING\nrhFoliagePoint=instanceMatrix*rhFoliagePoint;\n#endif');
    expect(program.vertexShader.indexOf('rhFoliagePoint=vec4(transformed,1.0)')).toBeGreaterThan(program.vertexShader.indexOf('#include <project_vertex>'));
    expect(program.fragmentShader).toContain('dot(vRhFoliageWorld-cameraPosition,rhViewSegment)');
    expect(material.customProgramCacheKey()).toBe(originalKey+'-camera-corridor-v1-local');
    expect(material.version).toBe(version);expect([material.transparent,material.depthWrite,material.alphaTest,material.side,material.opacity]).toEqual(settings);material.dispose();
  });
  it('leaves a depth material entirely untouched even when the helper is called directly',()=>{
    const material=new THREE.MeshDepthMaterial(),compile=material.onBeforeCompile,key=material.customProgramCacheKey,version=material.version;
    patch(material,state());expect(material.onBeforeCompile).toBe(compile);expect(material.customProgramCacheKey).toBe(key);expect(material.version).toBe(version);expect(material.userData).toEqual({});material.dispose();
  });
  it('updates live shared uniforms without replacing programs, materials or GPU buffers',()=>{
    const api=pipeline(),materials=['bough','shrub'].map(kind=>{const m=surface();api.apply(m,kind);return m;});
    const programs=materials.map(m=>{const s=shader(false);m.onBeforeCompile(s,{});return s;}),keys=materials.map(m=>m.customProgramCacheKey()),versions=materials.map(m=>m.version);
    for(let frame=0;frame<120;frame++){
      api.shared.subject.value.set(frame*.25,12,frame*-.1);api.shared.enabled.value=frame%2;
      for(const s of programs){expect(s.uniforms.rhFoliageSubject.value).toBe(api.shared.subject.value);expect(s.uniforms.rhFoliageClearance.value).toBe(frame%2);}
    }
    expect(materials.map(m=>m.customProgramCacheKey())).toEqual(keys);expect(materials.map(m=>m.version)).toEqual(versions);expect(api.counts.surface).toBe(2);materials.forEach(m=>m.dispose());
  });
});

describe('Camera canopy draw lifecycle',()=>{
  it('refreshes subject and gating in production draws, including paused views and composer fallback',()=>{
    const shared=state(),group=new THREE.Group(),draws=[];let composeCalls=0;
    const api=Function('cameraFoliage','raptorGroup','draws',`
      let studyActive=false,flightPathActive=false,studyPresentation='habitat',camMode='chase';
      const scene={},camera={},renderer={render(s,c){draws.push([s===scene,c===camera,cameraFoliage.enabled.value,cameraFoliage.subject.value.toArray()]);}};
      let composer=null;
      function paintMotionLens() {}
      ${body('renderFlightScene')}
      return {render:renderFlightScene,study(v){studyActive=v;},flightPath(v){flightPathActive=v;},mode(v){camMode=v;},composer(v){composer=v;}};
    `)(shared,group,draws);
    const subject=shared.subject.value;group.position.set(3,14,-8);api.render();expect(draws.at(-1)).toEqual([true,true,1,[3,14,-8]]);
    api.mode('fp');group.position.set(4,15,-9);api.render();expect(draws.at(-1)[2]).toBe(0);expect(draws.at(-1)[3]).toEqual([4,15,-9]);
    api.mode('chase');api.study(true);api.render();expect(draws.at(-1)[2]).toBe(0);
    api.study(false);api.flightPath(true);api.render();expect(draws.at(-1)[2]).toBe(0);
    api.flightPath(false);api.composer({render(){composeCalls++;throw Error('Postprocessing unavailable');}});api.render();expect(composeCalls).toBe(1);expect(draws.at(-1)[2]).toBe(1);
    api.render();expect(composeCalls).toBe(1);expect(draws).toHaveLength(6);expect(shared.subject.value).toBe(subject);
  });
});
