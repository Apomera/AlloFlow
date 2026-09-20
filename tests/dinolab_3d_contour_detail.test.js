import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {internals} from './helpers/dino_lab_harness.js';
const require=createRequire(import.meta.url),T=require(resolve('vendor/three-r128/three.min.js'));
const {dinoCoatGeometry,dinoCoatShading,dinoSkinMapping,dinoSkinCoordinates,integumentProfileFor,byId}=internals();
describe('Curved contour feather detail',()=>{
 it('has slender cambered vanes with smoothly varying lighting normals',()=>{
  const skin=new T.PlaneGeometry(2,2),g=dinoCoatGeometry(T,skin,{count:1,length:.3,seed:42,pennaceous:true});
  const p=g.attributes.position,n=g.attributes.normal,v=g.attributes.dinoCoatVane;
  const along=new T.Vector3(1,-.12,0).normalize(),across=new T.Vector3().crossVectors(along,new T.Vector3(0,0,1));
  const lengths=[],widths=[];let variation=0,camber=0;
  for(let i=0;i<p.count;i++){const point=new T.Vector3().fromBufferAttribute(p,i);lengths.push(point.dot(along));widths.push(point.dot(across));variation=Math.max(variation,Math.abs(n.getX(i))+Math.abs(n.getY(i)));if(v.getX(i)===0&&v.getY(i)>.3&&v.getY(i)<.7)camber=Math.max(camber,p.getZ(i)-p.getZ(i-1));}
  expect((Math.max(...widths)-Math.min(...widths))/(Math.max(...lengths)-Math.min(...lengths))).toBeLessThan(.38);
  expect(variation).toBeGreaterThan(.1);expect(camber).toBeGreaterThan(.003);expect([...v.array].every(Number.isFinite)).toBe(true);
  g.dispose();skin.dispose();
 });
 for(const pennaceous of [false,true])it('keeps pigment samples at the roots independently of vane detail, pennaceous '+pennaceous,()=>{
  const skin=new T.SphereGeometry(1,24,16),g=dinoCoatGeometry(T,skin,{count:40,length:.12,seed:6,pennaceous});
  const before=Array.from(g.attributes.uv.array);dinoSkinCoordinates(T,g,new T.Matrix4(),true);
  const root=g.attributes.dinoCoatRoot,vane=g.attributes.dinoCoatVane,region=g.attributes.dinoSkinRegion;
  expect(Array.from(g.attributes.dinoSkinPosition.array)).toEqual(Array.from(root.array));expect(Array.from(g.attributes.uv.array)).toEqual(before);
  for(let i=0;i<vane.count;i++){expect(vane.getZ(i)).toBe(pennaceous?1:0);expect(region.getX(i)).toBe(g.attributes.uv.getX(i));expect(region.getY(i)).toBe(1);}
  g.dispose();skin.dispose();
 });
 it('composes feather detail with regional pigment shading without extra textures',()=>{
  const profile=integumentProfileFor(byId('sinosauropteryx'),{skin:'#78614a',dark:'#3d3329',accent:'#a1845f'},'evidence');
  const material=new T.MeshStandardMaterial();dinoSkinMapping(T,material,1,.2,profile);const skinKey=material.customProgramCacheKey();dinoCoatShading(material);
  const shader={uniforms:{},vertexShader:T.ShaderLib.standard.vertexShader,fragmentShader:T.ShaderLib.standard.fragmentShader};material.onBeforeCompile(shader);
  expect(shader.vertexShader).toContain('vDinoSkinRegion = dinoSkinRegion;');expect(shader.vertexShader).toContain('vDinoCoatVane = dinoCoatVane;');
  expect(shader.uniforms.dinoTailBandTint.value.w).toBe(.9);expect(shader.fragmentShader).toContain('fwidth(coatPhase)');expect(shader.fragmentShader).toContain('vDinoCoatVane.z *');
  expect(material.customProgramCacheKey()).not.toBe(skinKey);expect(material.extensions.derivatives).toBe(true);expect(material.map).toBeNull();material.dispose();
 });
});
