import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import neckChecks from './helpers/firstresponse_neck_mesh_checks.cjs';
import collarChecks from './helpers/firstresponse_collar_mesh_checks.cjs';

const source=readFileSync('stem_lab/stem_tool_firstresponse.js','utf8'),THREE={};
new Function('exports','module',readFileSync('vendor/three-r128/three.min.js','utf8'))(THREE,{exports:THREE});
const check=(value,message)=>expect(value,message).toBe(true),equal=(a,b,message)=>expect(a,message).toEqual(b);
const neck=neckChecks.createNeckMeshChecks(THREE,check,equal),collar=collarChecks.createCollarMeshChecks(THREE,check,equal);
const cases=['adult','child','infant'].flatMap(age=>[0,5,8].map(phase=>({age,phase,contrast:false})))
  .concat(['adult','child','infant'].map(age=>({age,phase:8,contrast:true})));
const active=new Set();let previous,config;
beforeAll(()=>{previous=window.StemLab;window.StemLab={isRegistered:()=>false,registerTool(){},makeBayViewer(value){config=value;return{attach(){},sync(){},reset(){},nudge(){},zoom(){},status:()=> 'failed'};}};new Function(source)();});
afterEach(()=>{for(const model of active){neck.disposeOnce(model);active.delete(model);}});
afterAll(()=>{window.StemLab=previous;});

describe('First Response current collar surface',()=>{
  it.each(cases)('keeps a smooth closed $age collar and attached sleeves in pose$phase contrast=$contrast',settings=>{
    const model=neck.model(config,settings);active.add(model);const torso=model.scene.getObjectByName('fr-manikin-torso');
    collar.density(torso);collar.topology(torso);collar.sleeves(model);collar.coveredSide(model,settings);collar.stable(model);
    expect(torso.material.transparent).toBe(false);expect(torso.material.depthTest).toBe(true);expect(torso.material.depthWrite).toBe(true);
    expect(model.content.picks.includes(torso)).toBe(false);
  });
  it('rejects a missing torso triangle and verifies its in-memory restoration',()=>{
    const model=neck.model(config,{age:'adult',phase:5,contrast:false});active.add(model);const torso=model.scene.getObjectByName('fr-manikin-torso'),original=torso.geometry.index,bytes=Array.from(original.array);
    try{torso.geometry.setIndex(bytes.slice(3));expect(()=>collar.topology(torso)).toThrow();}finally{torso.geometry.setIndex(original);}
    expect(torso.geometry.index).toBe(original);expect(Array.from(torso.geometry.index.array)).toEqual(bytes);collar.topology(torso);
  });
});
