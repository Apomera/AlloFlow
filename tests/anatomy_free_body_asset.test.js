import fs from 'node:fs';
import crypto from 'node:crypto';
import {beforeEach,describe,it,expect} from 'vitest';
import {loadTool,renderTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
const source='stem_lab/assets/anatomy/body-surface';
const mirror='desktop/web-app/public/'+source;
describe('Free detailed body asset',()=>{
 it('ships a reproducible CC0 mesh with identical runtime copies',()=>{
  const manifest=JSON.parse(fs.readFileSync(source+'/asset-manifest.json','utf8'));const model=fs.readFileSync(source+'/makehuman-body-surface.glb');
  expect(manifest.license.spdx).toBe('CC0-1.0');expect(manifest.bytes).toBeLessThan(500000);
  expect(crypto.createHash('sha256').update(model).digest('hex')).toBe(manifest.sha256.model);
  expect(crypto.createHash('sha256').update(fs.readFileSync(source+'/makehuman-base.obj')).digest('hex')).toBe(manifest.sha256.source);
  expect(fs.readFileSync(mirror+'/makehuman-body-surface.glb').equals(model)).toBe(true);
 });
 it('contains a complete self-contained glTF mesh with valid indices and unit normals',()=>{
  const model=fs.readFileSync(source+'/makehuman-body-surface.glb');expect(model.readUInt32LE(0)).toBe(0x46546c67);expect(model.readUInt32LE(4)).toBe(2);expect(model.readUInt32LE(8)).toBe(model.length);
  const jsonLength=model.readUInt32LE(12);const gltf=JSON.parse(model.subarray(20,20+jsonLength).toString());const binStart=28+jsonLength;
  expect(gltf.buffers[0].uri).toBeUndefined();expect(gltf.images).toBeUndefined();expect(gltf.nodes).toHaveLength(1);expect(gltf.accessors[0].count).toBe(13380);
  const idxView=gltf.bufferViews[2];for(let offset=0;offset<idxView.byteLength;offset+=2)expect(model.readUInt16LE(binStart+idxView.byteOffset+offset)).toBeLessThan(gltf.accessors[0].count);
  const normalView=gltf.bufferViews[1];for(let offset=0;offset<normalView.byteLength;offset+=12){const n=[0,4,8].map(k=>model.readFloatLE(binStart+normalView.byteOffset+offset+k));expect(Math.hypot(...n)).toBeCloseTo(1,4);}
 });
});
beforeEach(resetStemLab);
describe('Surface model choice',()=>{
 for(const file of ['stem_lab/stem_tool_anatomy.js','desktop/web-app/public/stem_lab/stem_tool_anatomy.js']){
  it('defaults to the included detailed body and explains its scope in '+file,()=>{loadTool(file,'anatomy');const html=renderTool('anatomy',{anatomy:{_bodyView3d:true,_body3dStyle:'realistic'}});expect(html).toContain('Detailed human body');expect(html).toContain('No payment or account required');expect(html).toContain('does not include internal organs');expect(html).toContain('value="detailed" selected');});
  it('retains an explicit lightweight fallback in '+file,()=>{loadTool(file,'anatomy');const html=renderTool('anatomy',{anatomy:{_bodyView3d:true,_body3dStyle:'realistic',_bodySurfaceSource:'simple'}});expect(html).toContain('teaching mannequin');expect(html).toContain('value="simple" selected');});
 }
});
