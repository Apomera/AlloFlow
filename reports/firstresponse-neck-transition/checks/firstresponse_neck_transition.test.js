import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import meshChecks from './helpers/firstresponse_neck_mesh_checks.cjs';

const source=readFileSync('stem_lab/stem_tool_firstresponse.js','utf8'),THREE={};
new Function('exports','module',readFileSync('vendor/three-r128/three.min.js','utf8'))(THREE,{exports:THREE});
const checks=meshChecks.createNeckMeshChecks(THREE,(value,message)=>expect(value,message).toBe(true),(a,b,message)=>expect(a,message).toEqual(b));
const cases=['adult','child','infant'].flatMap(age=>[0,5,8].map(phase=>({age,phase,contrast:false})))
  .concat(['adult','child','infant'].map(age=>({age,phase:8,contrast:true})));
const active=new Set();let previous,config;
beforeAll(()=>{
  previous=window.StemLab;
  window.StemLab={isRegistered:()=>false,registerTool(){},makeBayViewer(value){config=value;return{attach(){},sync(){},reset(){},nudge(){},zoom(){},status:()=> 'failed'};}};
  new Function(source)();
});
afterEach(()=>{for(const model of active){checks.disposeOnce(model);active.delete(model);}});
afterAll(()=>{window.StemLab=previous;});

describe('First Response neck attachment to actual posed surfaces',()=>{
  it.each(cases)('buries the $age neck caps in pose$phase contrast=$contrast and keeps a closed smoothly shaded neck',settings=>{
    const model=checks.model(config,settings);active.add(model);
    const metrics=checks.caps(model,settings);
    for(const cap of metrics){
      expect(cap.capVertices).toBe(49);expect(cap.perimeterVertices).toBe(25);expect(cap.triangleCentroids).toBe(24);
      expect(cap.outside,cap.end+' cap/perimeter/centroid samples must stay inside actual '+cap.target+' triangles').toBe(0);
      expect(cap.minimumRayIntervalMargin,cap.end+' cap stays buried with positive triangle-ray entry/exit clearance').toBeGreaterThan(1e-7);
    }
    checks.shell(model);
    expect(model.neck.material.transparent).toBe(false);expect(model.neck.material.opacity).toBe(1);
    expect(model.neck.material.depthTest).toBe(true);expect(model.neck.material.depthWrite).toBe(true);
    expect(model.neck.material.type).toBe(settings.contrast?'MeshBasicMaterial':'MeshPhongMaterial');
    expect(model.content.picks.includes(model.neck)).toBe(false);
    const saved={geometry:model.neck.geometry,material:model.neck.material,
      positions:model.neck.geometry.attributes.position.array,normals:model.neck.geometry.attributes.normal.array,
      indices:model.neck.geometry.index.array,allocations:[model.allocatedGeometries.length,model.allocatedMaterials.length]};
    model.sample();model.sample();
    expect(model.neck.geometry).toBe(saved.geometry);expect(model.neck.material).toBe(saved.material);
    expect(model.neck.geometry.attributes.position.array).toBe(saved.positions);expect(model.neck.geometry.attributes.normal.array).toBe(saved.normals);
    expect(model.neck.geometry.index.array).toBe(saved.indices);
    expect([model.allocatedGeometries.length,model.allocatedMaterials.length]).toEqual(saved.allocations);
  });
});
