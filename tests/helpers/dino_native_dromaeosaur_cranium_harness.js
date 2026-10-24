import {readFileSync} from 'node:fs';
import {nativeReviewedTheropodCranium,nativeTheropodFacialDetails,THREE,vec,nativeMeshContains} from './dino_native_theropod_cranium_harness.js';
export {THREE,vec,nativeMeshContains,nativeTheropodFacialDetails};
export const source=readFileSync(process.env.DINO_DROMAEOSAUR_CRANIUM_SOURCE||'stem_lab/stem_tool_dinolab.js','utf8');
// Reuse the complete production head/jaw and true craniocervical assembly.
// Its dynamic source exports bind every real species helper; no target bone
// builder, tissue envelope or facial raycast is replaced with a stand-in.
export const native=nativeReviewedTheropodCranium(source);
export function cranialBuffers(meshes){return JSON.stringify(meshes.map(mesh=>({p:Array.from(mesh.geometry.attributes.position.array),n:Array.from(mesh.geometry.attributes.normal.array),
  ix:mesh.geometry.index&&Array.from(mesh.geometry.index.array),x:mesh.position.toArray(),q:mesh.quaternion.toArray(),s:mesh.scale.toArray()})));}
