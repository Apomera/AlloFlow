import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {internals} from './helpers/dino_lab_harness.js';
const require=createRequire(import.meta.url),THREE=require(resolve('vendor/three-r128/three.min.js'));
const {dinoSkinMapping,dinoCoatShading,dinoSkinCoordinates,integumentProfileFor,skeletalAnatomyProfileFor,reconstructionHypothesesFor,byId}=internals();
const palette={skin:'#78614a',dark:'#3d3329',accent:'#a1845f'};
function mappedMaterial(style,type='standard'){
  const map=style===null?null:new THREE.Texture();if(map&&style!==undefined)map.userData={dinoMicrotexture:style};
  return type==='phong'?new THREE.MeshPhongMaterial({map}):new THREE.MeshStandardMaterial({map});
}
function compile(material,type='standard'){
  const shader={uniforms:{},vertexShader:THREE.ShaderLib[type].vertexShader,fragmentShader:THREE.ShaderLib[type].fragmentShader};
  material.onBeforeCompile(shader);return shader;
}
function release(material){if(material.map)material.map.dispose();material.dispose();}
function nativeProfile(species,hypothesis='evidence'){
  const dn=byId(species),skeleton=skeletalAnatomyProfileFor(dn),covering=reconstructionHypothesesFor(dn,skeleton).options.find(item=>item.id===hypothesis);
  return {covering,profile:integumentProfileFor(dn,palette,covering.paletteMode),style:covering.featureScales?'fine-scales':'fine-grain'};
}
describe('Dino Lab illustrated scale pigment',()=>{
  for(const [species,hypothesis,eligible] of [
    ['tyrannosaurus','evidence',true],['triceratops','evidence',true],['tyrannosaurus','classic',true],
    ['tyrannosaurus','conservative',false],['borealopelta','evidence',false],['borealopelta','classic',false],
    ['microraptor','evidence',false],['microraptor','conservative',false],['anchiornis','evidence',false]
  ])it('respects the native '+species+' '+hypothesis+' surface and pigment evidence',()=>{
    const {profile,style}=nativeProfile(species,hypothesis),material=mappedMaterial(style);
    dinoSkinMapping(THREE,material,2,.2,profile);const shader=compile(material);
    expect(material.userData.dinoIllustratedPigment).toBe(eligible);
    expect(shader.fragmentShader.includes('float dinoPigmentCloud(')).toBe(eligible);
    expect(shader.fragmentShader.includes('dinoPigmentVariation = dinoPigmentCloud(vDinoSkinPosition)')).toBe(eligible);
    expect(material.customProgramCacheKey()).toBe(eligible?'dinolab-specimen-skin-zones-v1':'dinolab-specimen-skin-v2');release(material);
  });
  for(const style of ['fine-grain',undefined,null])it('keeps unscaled, untagged or missing maps outside the illustrated skin variant: '+String(style),()=>{
    const material=mappedMaterial(style),profile=integumentProfileFor(byId('tyrannosaurus'),palette,'natural');
    dinoSkinMapping(THREE,material,1,.2,profile);
    expect(material.userData.dinoIllustratedPigment).toBe(false);expect(compile(material).fragmentShader.includes('dinoPigmentCloud')).toBe(false);release(material);
  });
  it('separates shader programs by eligibility while retaining material-local scales and colors',()=>{
    const profile=integumentProfileFor(byId('tyrannosaurus'),palette,'natural');
    const materials=[mappedMaterial('fine-scales'),mappedMaterial('fine-scales'),mappedMaterial('fine-grain')],shaders=[];
    materials.forEach((material,index)=>{dinoSkinMapping(THREE,material,index===0?.5:2,.2,profile);shaders.push(compile(material));});
    expect(materials[0].customProgramCacheKey()).toBe(materials[1].customProgramCacheKey());
    expect(materials[0].customProgramCacheKey()).not.toBe(materials[2].customProgramCacheKey());
    expect(shaders[0].vertexShader).toBe(shaders[1].vertexShader);expect(shaders[0].fragmentShader).toBe(shaders[1].fragmentShader);
    expect(shaders[0].uniforms.dinoSkinScale.value).toBe(2);expect(shaders[1].uniforms.dinoSkinScale.value).toBe(.5);
    expect(shaders[0].uniforms.dinoDorsalTint.value).not.toBe(shaders[1].uniforms.dinoDorsalTint.value);materials.forEach(release);
  });
  for(const type of ['standard','phong'])it('adds the illustrated field after map/color decoding in the r128 '+type+' shader',()=>{
    const material=mappedMaterial('fine-scales',type),profile=integumentProfileFor(byId('triceratops'),palette,'natural');
    dinoSkinMapping(THREE,material,1,.2,profile);const shader=compile(material,type),fragment=shader.fragmentShader;
    expect(fragment.indexOf('float dinoPigmentCloud(')).toBeLessThan(fragment.indexOf('void main()'));
    expect(fragment.indexOf('mapTexelToLinear(dinoSampleSkin(')).toBeLessThan(fragment.indexOf('#include <color_fragment>'));
    expect(fragment.indexOf('#include <color_fragment>')).toBeLessThan(fragment.indexOf('dinoPigmentVariation = dinoPigmentCloud(vDinoSkinPosition)'));
    expect(fragment.split('float dinoPigmentCloud(').length).toBe(2);expect(fragment.split('dinoPigmentVariation = dinoPigmentCloud(vDinoSkinPosition)').length).toBe(2);
    expect(shader.vertexShader).toContain('vDinoSkinPosition = dinoSkinPosition;');release(material);
  });
  it('keeps mixed scale/filament coats outside the illustrated field and compatible with ordinary coat programs',()=>{
    const mosaic=nativeProfile('tyrannosaurus','avian'),feather=nativeProfile('microraptor','evidence');
    expect(mosaic.covering.featureScales).toBe(true);expect(mosaic.covering.filamentCoverage).toBeGreaterThan(0);
    expect(mosaic.profile.directEvidence).toBe(false);
    const shaders=[],materials=[];
    for(const configuration of [mosaic,feather]){
      const body=mappedMaterial(configuration.style),coat=body.clone();coat.vertexColors=true;coat.userData.dinoContourCoat=true;
      dinoSkinMapping(THREE,coat,1,.07,configuration.profile);dinoCoatShading(coat);
      expect(coat.userData.dinoIllustratedPigment).toBe(false);expect(coat.customProgramCacheKey()).toBe('dinolab-contour-feathers-v2');
      const shader=compile(coat);expect(shader.fragmentShader.includes('dinoPigmentCloud')).toBe(false);expect(shader.fragmentShader).toContain('float coatBarbs');
      shaders.push(shader);materials.push(body,coat);
    }
    expect(shaders[0].vertexShader).toBe(shaders[1].vertexShader);expect(shaders[0].fragmentShader).toBe(shaders[1].fragmentShader);materials.forEach(release);
  });
  it('retains baked pigment sample coordinates under subsequent mesh motion',()=>{
    const geometry=new THREE.BoxGeometry(1,2,1),mesh=new THREE.Mesh(geometry);
    mesh.position.set(3,2,-1);mesh.rotation.y=.4;mesh.updateMatrixWorld(true);dinoSkinCoordinates(THREE,geometry,mesh.matrixWorld);
    const stored=Array.from(geometry.attributes.dinoSkinPosition.array),worldBefore=mesh.localToWorld(new THREE.Vector3(1,0,0)).toArray();
    mesh.rotation.y+=.7;mesh.position.x+=2;mesh.updateMatrixWorld(true);
    expect(Array.from(geometry.attributes.dinoSkinPosition.array)).toEqual(stored);expect(mesh.localToWorld(new THREE.Vector3(1,0,0)).toArray()).not.toEqual(worldBefore);
    geometry.dispose();mesh.material.dispose();
  });
  it('keeps illustrated palette ratios finite, bounded and independent without changing atlas or material tint',()=>{
    const ratios=['dinoIllustratedBackTint','dinoIllustratedFlankTint','dinoIllustratedUndersideTint'];
    for(const colors of [palette,{skin:'#000000',dark:'#ffffff',accent:'#ff0000'},{skin:'#ffffff',dark:'#000000',accent:'#0000ff'}]){
      const profile=Object.freeze(integumentProfileFor(byId('tyrannosaurus'),colors,'natural'));
      const material=mappedMaterial('fine-scales');material.color.set('#82918b');material.opacity=.62;material.transparent=true;
      const original={map:material.map,color:material.color.toArray(),opacity:material.opacity,transparent:material.transparent};
      dinoSkinMapping(THREE,material,2,.2,profile);const first=compile(material),second=compile(material);
      for(const name of ratios){
        const values=first.uniforms[name].value.toArray();
        for(const value of values){expect(Number.isFinite(value)).toBe(true);expect(value).toBeGreaterThanOrEqual(.15);expect(value).toBeLessThanOrEqual(3);}
        expect(second.uniforms[name].value.toArray()).toEqual(values);expect(second.uniforms[name].value).not.toBe(first.uniforms[name].value);
        first.uniforms[name].value.set(99,99,99);expect(second.uniforms[name].value.toArray()).toEqual(values);
      }
      expect(first.uniforms.dinoShadeStrength.value).toBe(0);
      expect({map:material.map,color:material.color.toArray(),opacity:material.opacity,transparent:material.transparent}).toEqual(original);
      if(colors===palette){for(const value of second.uniforms.dinoIllustratedBackTint.value.toArray())expect(value).toBeLessThan(1);for(const value of second.uniforms.dinoIllustratedUndersideTint.value.toArray())expect(value).toBeGreaterThan(1);}
      release(material);
    }
  });
  it('retains the ordinary shader and original shade controls for direct-evidence and neutral palettes',()=>{
    let unchangedFragment=null;
    for(const [species,hypothesis] of [['microraptor','evidence'],['anchiornis','evidence'],['sinosauropteryx','evidence'],['psittacosaurus','evidence'],['borealopelta','evidence'],['borealopelta','classic'],['tyrannosaurus','conservative']]){
      const {profile,style}=nativeProfile(species,hypothesis),material=mappedMaterial(style);
      dinoSkinMapping(THREE,material,1,.2,profile);const shader=compile(material);
      expect(Object.keys(shader.uniforms).filter(name=>name.startsWith('dinoIllustrated'))).toEqual([]);
      expect(material.userData.dinoIllustratedPigment).toBe(false);
      expect(shader.uniforms.dinoShadeStrength.value).toBe(['subtle','none'].includes(profile.pattern)?.2:0);
      if(unchangedFragment===null)unchangedFragment=shader.fragmentShader;else expect(shader.fragmentShader).toBe(unchangedFragment);
      release(material);
    }
  });
});
