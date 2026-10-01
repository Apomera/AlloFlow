import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
const THREE = createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const source = readFileSync(resolve('stem_lab/stem_tool_dinolab.js'), 'utf8');
window.StemLab = { registerTool() {} };
new Function(source.replace("window.StemLab.registerTool('dinoLab'", "globalThis.__cranialEnvelope={ DINOS, cranialSurfaceProfileFor, dinoTheropodCranialRadii, dinoCranialGeometry };window.StemLab.registerTool('dinoLab'"))();
const art=globalThis.__cranialEnvelope;
describe('Dino Lab clade muzzle silhouettes', () => {
  const byId=id=>art.DINOS.find(dino=>dino.id===id);
  const radii=id=>art.dinoTheropodCranialRadii(1,1,0.1,art.cranialSurfaceProfileFor(byId(id)));
  it('distinguishes deep tyrannosaur, slender paravian and long spinosaur muzzles', () => {
    const tyrant=radii('tyrannosaurus'), bird=radii('archaeopteryx'), river=radii('spinosaurus');
    expect(tyrant[3][1]).toBeGreaterThan(river[3][1]);
    expect(river[3][1]).toBeGreaterThan(bird[3][1]);
    expect(tyrant[4][0]).toBeGreaterThan(river[4][0]);
    expect(river[4][0]).toBeGreaterThan(bird[4][0]);
    for(const shape of [tyrant,bird,river]) {expect(shape[0]).toEqual([0.1,0.1]);expect(shape[2]).toEqual([0.86,1]);}
  });
  it('keeps the cervical junction and orbit unchanged when muzzle factors change', () => {
    const a=art.dinoTheropodCranialRadii(1,0.8,0.12,{});
    const b=art.dinoTheropodCranialRadii(1,0.8,0.12,{muzzleHeightScale:0.5,muzzleDepthScale:0.5,muzzleBaseScale:0.7,muzzleTipScale:0.6});
    expect(b.slice(0,3)).toEqual(a.slice(0,3));expect(b[5]).toEqual(a[5]);
    expect(b[3][1]).toBeLessThan(a[3][1]);expect(b[4][0]).toBeLessThan(a[4][0]);
  });
  it('renders finite head normals across catalog profiles and scales', () => {
    for(const dino of art.DINOS.filter(dino=>dino.group==='theropod')) for(const scale of [0.02,1,20]) {
      const points=[[-1,0,0],[-0.45,0.1,0],[0,0.15,0],[0.6,0.1,0],[1,0.05,0],[1.3,0.05,0]].map(point=>new THREE.Vector3(...point).multiplyScalar(scale));
      const radii=art.dinoTheropodCranialRadii(scale*0.5,scale*0.3,scale*0.1,art.cranialSurfaceProfileFor(dino));
      const shape={center:points[2],length:scale,height:scale*0.5,depth:scale*0.3,cheek:1};
      const geometry=art.dinoCranialGeometry(THREE,points,radii,shape);
      for(const attr of ['position','normal']) expect(Array.from(geometry.attributes[attr].array).every(Number.isFinite),dino.id+' '+attr).toBe(true);
      geometry.dispose();
    }
  });
});
