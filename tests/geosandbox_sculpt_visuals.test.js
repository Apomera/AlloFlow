import {beforeAll,describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
const require=createRequire(import.meta.url),THREE=require('../vendor/three-r128/three.min.js');let P;
beforeAll(()=>{resetStemLab();loadTool('stem_lab/stem_tool_geosandbox.js','geoSandbox');P=window.StemLab.geoPure;});
describe('Sculpt selection presentation',()=>{
 it('removes dense curved-surface edges while preserving the original geometry and a silhouette',()=>{
  const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,32,24),new THREE.MeshStandardMaterial({color:'#c98566'}));const vertices=Array.from(mesh.geometry.attributes.position.array),dense=new THREE.EdgesGeometry(mesh.geometry);
  P.addSculptSelectionOutline(THREE,mesh,false);const edge=mesh.children.find(o=>o.isLineSegments),halo=mesh.children.find(o=>o.isMesh);
  expect(edge.geometry.attributes.position.count).toBeLessThan(dense.attributes.position.count/3);expect(halo.scale.x).toBeGreaterThan(1);expect(halo.material.side).toBe(THREE.BackSide);expect(halo.geometry).not.toBe(mesh.geometry);expect(Array.from(mesh.geometry.attributes.position.array)).toEqual(vertices);expect(mesh.material.color.getHexString()).toBe('c98566');
  const ray=new THREE.Raycaster(new THREE.Vector3(0,0,5),new THREE.Vector3(0,0,-1));mesh.updateMatrixWorld(true);expect(ray.intersectObjects(mesh.children,true)).toHaveLength(0);
 });
 it('keeps cylinder rims without vertical tessellation lines',()=>{
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(.5,.5,2,32),new THREE.MeshStandardMaterial());P.addSculptSelectionOutline(THREE,mesh,false);
  const p=mesh.children.find(o=>o.isLineSegments).geometry.attributes.position;expect(p.count).toBeGreaterThan(0);for(let i=0;i<p.count;i+=2)expect(p.getY(i)).toBeCloseTo(p.getY(i+1),6);
 });
 it.each([{wireframe:true},{transparent:true,opacity:.35}])('keeps intentional wire and transparent materials unfilled: %j',options=>{
  const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),new THREE.MeshStandardMaterial(options));P.addSculptSelectionOutline(THREE,mesh,true);expect(mesh.children.some(o=>o.isMesh)).toBe(false);expect(mesh.children[0].material.color.getHexString()).toBe('285d7a');
 });
 it('keeps smaller visible caps outside rotated bounds with generous working hit areas',()=>{
  const group=new THREE.Group(),mesh=new THREE.Mesh(new THREE.BoxGeometry(2,1,.5),new THREE.MeshStandardMaterial());mesh.position.set(.4,.8,-.3);mesh.rotation.set(.3,.5,.7);mesh.userData.prim3dPartIndex=0;group.add(mesh);group.scale.setScalar(2.6);group.rotation.y=.4;
  const recipe={parts:[{shape:'box',size:[2,1,.5],position:[.4,.8,-.3],rotation:[.3,.5,.7]}]},root=P.addSculptEditHandles(THREE,group,recipe,0);mesh.updateMatrix();mesh.geometry.computeBoundingBox();const bounds=mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrix),handles=root.children.filter(o=>o.userData.isGeoSculptHandle),stems=root.children.filter(o=>o.userData.isGeoSculptHandleStem);
  expect(handles).toHaveLength(6);expect(stems).toHaveLength(6);group.updateMatrixWorld(true);
  for(const handle of handles){const axis=handle.userData.geoSculptHandleAxis,dir=handle.userData.geoSculptHandleDir;expect(dir*(handle.position[axis]-(dir>0?bounds.max[axis]:bounds.min[axis]))).toBeCloseTo(.24,10);expect(handle.material.opacity).toBe(0);expect(handle.material.depthWrite).toBe(false);handle.geometry.computeBoundingSphere();handle.children[0].geometry.computeBoundingSphere();expect(handle.children[0].geometry.boundingSphere.radius).toBeLessThan(handle.geometry.boundingSphere.radius*.7);}
  for(const stem of stems)expect(bounds.containsPoint(stem.position)).toBe(false);
  const handle=handles.find(o=>o.userData.geoSculptHandleDir===1),center=handle.getWorldPosition(new THREE.Vector3());const ray=new THREE.Raycaster(center.clone().add(new THREE.Vector3(0,.26,5)),new THREE.Vector3(0,0,-1));expect(ray.intersectObject(handle,false).length).toBeGreaterThan(0);
 });
});
