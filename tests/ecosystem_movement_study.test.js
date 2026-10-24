import {beforeEach,describe,it,expect} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';
let api;
beforeEach(()=>{resetStemLab();loadTool('stem_lab/stem_tool_ecosystem.js','ecosystem');api=window.StemLab.ecosystemFoodWeb;});
const config={enabled:{caterpillars:true,bluetits:true},event:'none'};

describe('movement detective evidence',()=>{
  it.each(['bluetits','owls'])('indexes three original %s poses with exact articulation values and stable answers',id=>{
    const pair=api.compare(config),frames=api.behaviorTimeline(config,pair.baseline),original=JSON.stringify(frames),study=api.motionStudy(frames,id,0);
    expect(study).not.toBeNull();expect(study.species).toBe(id);expect(study.samples).toHaveLength(3);
    const steps=study.samples.map(p=>p.step);expect(steps[0]).toBeLessThan(steps[1]);expect(steps[1]).toBeLessThan(steps[2]);
    for(const sample of study.samples){const pose=frames[sample.step][id][0],art=api.birdArticulation(id,pose,sample.step/10,false);expect(pose.active).toBe(true);expect(sample.value).toBe(id==='bluetits'?art.bodyLift:Math.abs(art.wrist)*180/Math.PI);}
    const values=study.samples.map(p=>p.value),max=Math.max(...values);expect(study.target).toEqual(values.map((v,i)=>v===max?i:-1).filter(i=>i>=0));expect(study.target).toContain(1);
    if(id==='bluetits'){expect(api.birdArticulation(id,frames[steps[0]][id][0],steps[0]/10,false).contact).toBe(true);expect(api.birdArticulation(id,frames[steps[1]][id][0],steps[1]/10,false).contact).toBe(false);expect(api.birdArticulation(id,frames[steps[2]][id][0],steps[2]/10,false).contact).toBe(true);}
    expect(api.motionStudy(frames,id,0)).toEqual(study);expect(JSON.stringify(frames)).toBe(original);
    study.samples[0].value=999;expect(api.motionStudy(frames,id,0).samples[0].value).not.toBe(999);
  });
  it('does not invent studies for absent birds, unsupported identities or corrupt frames',()=>{
    const pair=api.compare({enabled:{owls:false,bluetits:false}}),frames=api.behaviorTimeline({enabled:{owls:false,bluetits:false}},pair.baseline);
    for(const id of ['owls','bluetits','unknown'])expect(api.motionStudy(frames,id,0)).toBeNull();
    for(const input of [null,{},[],[null,null,null]])expect(api.motionStudy(input,'bluetits',0)).toBeNull();
    for(const index of [-1,16,0.5,null])expect(api.motionStudy(frames,'owls',index)).toBeNull();
  });
});
