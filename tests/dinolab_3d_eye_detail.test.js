import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {internals} from './helpers/dino_lab_harness.js';
const T=createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const {dinoEyeGeometry,dinoIrisShading}=internals();

describe('Local iris coordinates',()=>{
 for(const radius of [.001,.03,.4,2])it('keeps detail centered and bounded at radius '+radius,()=>{
  const g=dinoEyeGeometry(T,radius),p=g.attributes.position,iris=g.attributes.dinoIris,n=g.attributes.normal;
  expect(iris.count).toBe(p.count);expect(p.count).toBe(825);
  for(let i=0;i<p.count;i++){
   expect(iris.getX(i)).toBeCloseTo(p.getX(i)/radius,6);expect(iris.getY(i)).toBeCloseTo(p.getY(i)/radius,6);
   expect(Math.hypot(iris.getX(i),iris.getY(i))).toBeLessThanOrEqual(1.000001);
   expect(new T.Vector3().fromBufferAttribute(n,i).length()).toBeCloseTo(1,5);
  }
  const before=Array.from(iris.array),eye=new T.Mesh(g,new T.MeshBasicMaterial());
  eye.scale.set(1,.10,.46);eye.rotation.y=.8;eye.updateMatrixWorld(true);
  expect(Array.from(iris.array)).toEqual(before);g.dispose();eye.material.dispose();
 });
 it('uses the same normalized detail across differently sized eyes',()=>{
  const a=dinoEyeGeometry(T,.02),b=dinoEyeGeometry(T,1.7);
  for(let i=0;i<a.attributes.dinoIris.array.length;i++)expect(a.attributes.dinoIris.array[i]).toBeCloseTo(b.attributes.dinoIris.array[i],6);
  a.dispose();b.dispose();
 });
});

describe('Iris shader integration',()=>{
 for(const type of ['standard','phong'])it('composes filtered iris detail with the '+type+' lighting shader',()=>{
  const material=type==='standard'?new T.MeshStandardMaterial():new T.MeshPhongMaterial();let baseCalled=false;
  material.onBeforeCompile=shader=>{baseCalled=true;shader.uniforms.existingProbe={value:1};};const originalKey=material.customProgramCacheKey();dinoIrisShading(material);
  const shader={uniforms:{},vertexShader:T.ShaderLib[type].vertexShader,fragmentShader:T.ShaderLib[type].fragmentShader};material.onBeforeCompile(shader);
  expect(baseCalled).toBe(true);expect(shader.uniforms.existingProbe.value).toBe(1);expect(shader.vertexShader).toContain('vDinoIris = dinoIris;');
  expect(shader.fragmentShader).toContain('dFdx(vDinoIris)');expect(shader.fragmentShader).toContain('dFdy(vDinoIris)');expect(shader.fragmentShader).toContain('irisFootprint * 59.0');
  expect(shader.fragmentShader).toContain('irisRim');expect(material.customProgramCacheKey()).not.toBe(originalKey);expect(material.extensions.derivatives).toBe(true);expect(material.map).toBeNull();material.dispose();
 });
});
