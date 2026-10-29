import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createRequire} from 'node:module';
import {internals} from './helpers/dino_lab_harness.js';

const THREE=createRequire(import.meta.url)(resolve('vendor/three-r128/three.min.js'));
const {dinoSkinCoordinates,dinoSurfaceAnchor}=internals();
const source=readFileSync(resolve('stem_lab/stem_tool_dinolab.js'),'utf8');
function section(start,end){const a=source.indexOf(start),b=source.indexOf(end,a);if(a<0||b<0)throw Error('Missing native scale mapping block');return source.slice(a,b);}
const factory=new Function('THREE','model','scaleReliefMat',
  'var props={showBody:true},idleMotion={feathers:[]};function vec(x,y,z){return new THREE.Vector3(x,y,z);}\n'+
  section('            function addEllipsoid(', '            function addRespiratoryVolume(')+
  section('            function bindSurfaceDetail(', '            function addFacialStrip(')+
  '\nreturn addSeatedScale;');
const mapPart=new Function('THREE','part','dinoSkinCoordinates',section(
  '              if (part.material && part.material.userData.dinoSkinMapping) {',
  '              // Inter-bone shadows clarify fossil anatomy;'));

function fixture(size=1){
  const model=new THREE.Group(),surface=new THREE.Mesh(new THREE.SphereGeometry(size,32,24),new THREE.MeshBasicMaterial());
  surface.position.set(size*.7,size*1.2,-size*.2);surface.rotation.set(.2,-.35,.12);surface.scale.set(1.4,.8,1.1);surface.userData.dinoRegion='body';model.add(surface);model.updateMatrixWorld(true);
  const center=surface.getWorldPosition(new THREE.Vector3()),ray=new THREE.Vector3(.12,.35,1).normalize();
  const anchor=dinoSurfaceAnchor(THREE,surface,center.clone().addScaledVector(ray,size*4),ray.clone().negate(),size*8);
  const material=new THREE.MeshStandardMaterial();material.userData.dinoSkinMapping=true;material.userData.dinoIllustratedPigment=true;
  factory(THREE,model,material)(surface,anchor,size*.04,false);model.updateMatrixWorld(true);
  const scale=surface.children.find(part=>part.userData.dinoFeature==='surface-scale');
  return {model,surface,scale,material,anchor,dispose(){surface.geometry.dispose();surface.material.dispose();scale.geometry.dispose();material.dispose();}};
}
function values(geometry,name){return Array.from(geometry.attributes[name].array);}

describe('Feature-scale pigment follows its supporting skin',()=>{
  it('maps real seated scales to the host normal at different specimen sizes without flattening lighting normals',()=>{
    for(const size of [.03,1,12]){
      const f=fixture(size);
      try{
        const geometry=f.scale.geometry,beforeNormal=values(geometry,'normal'),beforePosition=values(geometry,'position');
        mapPart(THREE,f.scale,dinoSkinCoordinates);
        const mapped=geometry.attributes.dinoSkinNormal;
        for(let i=0;i<mapped.count;i++)expect(new THREE.Vector3().fromBufferAttribute(mapped,i).distanceTo(f.anchor.normal)).toBeLessThan(1e-6);
        expect(values(geometry,'normal')).toEqual(beforeNormal);expect(values(geometry,'position')).toEqual(beforePosition);
        expect(new Set(beforeNormal.map(value=>value.toFixed(4))).size).toBeGreaterThan(10);
        const world=new THREE.Vector3().fromBufferAttribute(geometry.attributes.position,15).applyMatrix4(f.scale.matrixWorld);
        expect(new THREE.Vector3().fromBufferAttribute(geometry.attributes.dinoSkinPosition,15).distanceTo(world)).toBeLessThan(size*1e-5);
      }finally{f.dispose();}
    }
  });
  it('transforms the local root normal with the host before baking and keeps pigment seated through later motion',()=>{
    const f=fixture();
    try{
      const oldHostNormalMatrix=new THREE.Matrix3().getNormalMatrix(f.surface.matrixWorld);
      const localHost=f.anchor.normal.clone().applyMatrix3(oldHostNormalMatrix.clone().invert()).normalize();
      f.surface.rotation.y+=.7;f.surface.scale.y*=1.08;f.model.rotation.z=.12;f.model.updateMatrixWorld(true);
      const expected=localHost.applyMatrix3(new THREE.Matrix3().getNormalMatrix(f.surface.matrixWorld)).normalize();
      mapPart(THREE,f.scale,dinoSkinCoordinates);
      expect(new THREE.Vector3().fromBufferAttribute(f.scale.geometry.attributes.dinoSkinNormal,25).distanceTo(expected)).toBeLessThan(1e-6);
      const pigmentNormal=values(f.scale.geometry,'dinoSkinNormal'),pigmentPosition=values(f.scale.geometry,'dinoSkinPosition');
      const rootBefore=f.scale.getWorldPosition(new THREE.Vector3());
      f.model.rotation.y+=.8;f.surface.scale.z*=1.02;f.model.updateMatrixWorld(true);
      expect(f.scale.getWorldPosition(new THREE.Vector3()).distanceTo(rootBefore)).toBeGreaterThan(.1);
      expect(values(f.scale.geometry,'dinoSkinNormal')).toEqual(pigmentNormal);
      expect(values(f.scale.geometry,'dinoSkinPosition')).toEqual(pigmentPosition);
    }finally{f.dispose();}
  });
  it('preserves prior pigment directions for materials outside the illustrated palette',()=>{
    const f=fixture();
    try{
      const expected=f.scale.geometry.clone();dinoSkinCoordinates(THREE,expected,f.scale.matrixWorld,false);
      f.material.userData.dinoIllustratedPigment=false;mapPart(THREE,f.scale,dinoSkinCoordinates);
      for(const name of ['dinoSkinNormal','dinoSkinPosition','dinoSkinRegion'])expect(values(f.scale.geometry,name)).toEqual(values(expected,name));
      expected.dispose();
    }finally{f.dispose();}
  });
  it('leaves no-override and invalid-override outputs identical, including the existing tail coordinate channel',()=>{
    const base=new THREE.SphereGeometry(1,12,8),matrix=new THREE.Matrix4().compose(new THREE.Vector3(2,3,-1),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),.4),new THREE.Vector3(1.4,.7,1.1));
    dinoSkinCoordinates(THREE,base,matrix,true);
    for(const input of [undefined,null,[],[0,0,0],[1,NaN,0],[1,Infinity,0],['1',0,0]]){
      const geometry=new THREE.SphereGeometry(1,12,8);dinoSkinCoordinates(THREE,geometry,matrix,true,input);
      for(const name of ['dinoSkinNormal','dinoSkinPosition','dinoSkinRegion'])expect(values(geometry,name)).toEqual(values(base,name));
      geometry.dispose();
    }
    base.dispose();
  });
});
