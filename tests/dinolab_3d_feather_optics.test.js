import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {internals} from './helpers/dino_lab_harness.js';

const require=createRequire(import.meta.url),T=require(resolve('vendor/three-r128/three.min.js'));
const {dinoCoatShading,dinoSkinMapping,integumentProfileFor,byId}=internals();
// Exercise the production helper without expanding the shared golden-master harness.
const source=readFileSync(resolve('stem_lab/stem_tool_dinolab.js'),'utf8');
const dinoFeatherOptics=new Function('return '+source.match(/  function dinoFeatherOptics\([\s\S]*?\r?\n  \}\r?\n/)[0])();
const palette={skin:'#78614a',dark:'#3d3329',accent:'#a1845f'};
const profile=(id,mode='evidence')=>integumentProfileFor(byId(id),palette,mode);
function compile(material,type='standard'){
  const shader={uniforms:{},vertexShader:T.ShaderLib[type].vertexShader,fragmentShader:T.ShaderLib[type].fragmentShader};
  material.onBeforeCompile(shader);return shader;
}

describe('Evidence-bounded feather surface optics',()=>{
  it('assigns open contour vanes to Anchiornis while retaining closed Microraptor vanes',()=>{
    for(const id of ['anchiornis','microraptor','archaeopteryx','sinosauropteryx','tyrannosaurus']){
      const p=profile(id),material=new T.MeshStandardMaterial();dinoSkinMapping(T,material,1,.07,p);dinoCoatShading(material,p);
      const shader=compile(material);
      expect(p.openVaneContour).toBe(id==='anchiornis');
      expect(material.userData.dinoOpenVaneContour).toBe(id==='anchiornis');
      expect(shader.uniforms.dinoContourOpenVane.value).toBe(id==='anchiornis'?1:0);
      expect(shader.fragmentShader).toContain('dinoContourOpenVane * vDinoCoatVane.z * coatResolved');
      expect(shader.fragmentShader).toContain('fwidth(coatPhase)');
      expect(material.transparent).toBe(false);expect(material.depthWrite).toBe(true);expect(material.alphaMap).toBeNull();
      material.dispose();
    }
    expect(profile('anchiornis').evidenceNote).toMatch(/open, shaggy vanes.*rendered fringe remain reconstructed/);
  });
  for(const type of ['standard','phong'])it('composes nonmetallic Microraptor sheen after lighting and before tone mapping in '+type,()=>{
    const material=type==='standard'?new T.MeshStandardMaterial():new T.MeshPhongMaterial();
    const p=profile('microraptor');dinoSkinMapping(T,material,1,.07,p);dinoCoatShading(material,p);
    const before=compile(material,type),map=material.map,key=material.customProgramCacheKey();
    dinoFeatherOptics(material,p);const after=compile(material,type),fragment=after.fragmentShader;
    expect(material.userData.dinoFeatherIridescence).toBe(true);expect(material.customProgramCacheKey()).not.toBe(key);
    expect(fragment).toContain('gl_FragColor = vec4( outgoingLight, diffuseColor.a );');
    expect(fragment.indexOf('gl_FragColor = vec4( outgoingLight, diffuseColor.a );')).toBeLessThan(fragment.indexOf('float featherFacing'));
    expect(fragment.indexOf('gl_FragColor.rgb += featherSheen')).toBeLessThan(fragment.indexOf('#include <tonemapping_fragment>'));
    expect(fragment).toContain('abs(dot(normal, normalize(vViewPosition)))');expect(fragment).toContain('reflectedLight.directDiffuse');
    expect(after.vertexShader).toBe(before.vertexShader);expect(material.map).toBe(map);
    expect((fragment.match(/texture2D\(/g)||[]).length).toBe((before.fragmentShader.match(/texture2D\(/g)||[]).length);
    expect(after.uniforms.dinoContourOpenVane.value).toBe(0);expect(after.uniforms.dinoSkinScale.value).toBe(1);
    if(type==='standard'){expect(material.roughness).toBe(.58);expect(material.metalness).toBe(0);}
    else expect(material.shininess).toBe(18);
    material.dispose();
  });
  for(const [id,mode] of [['microraptor','neutral'],['microraptor','classic'],['anchiornis','evidence'],['tyrannosaurus','evidence']]){
    it('retains ordinary optics for '+id+' in '+mode,()=>{
      const material=new T.MeshStandardMaterial({roughness:.94});
      const before=material.onBeforeCompile,key=material.customProgramCacheKey();dinoFeatherOptics(material,profile(id,mode));
      expect(material.userData.dinoFeatherIridescence).toBe(false);expect(material.roughness).toBe(.94);
      expect(material.onBeforeCompile).toBe(before);expect(material.customProgramCacheKey()).toBe(key);material.dispose();
    });
  }
  it('does not add sheen to an inferred iridescent palette or enable a sheen on bare skin',()=>{
    const material=new T.MeshStandardMaterial(),before=material.onBeforeCompile;
    dinoFeatherOptics(material,{pattern:'iridescent',directEvidence:false});expect(material.onBeforeCompile).toBe(before);
    const p=profile('microraptor');expect(p.evidenceNote).toMatch(/hue shifts.*illustrative rather than measured/);
    expect(source).toContain('dinoFeatherOptics(featherVaneMat, integument)');
    expect(source).toContain('dinoFeatherOptics(contourCoatMat, integument)');
    expect(source).not.toContain('dinoFeatherOptics(bodyMat');material.dispose();
  });
});
