import fs from 'node:fs';
import {describe,it,expect} from 'vitest';

const source=fs.readFileSync('stem_lab/stem_tool_titration.js','utf8');
const helpers=source.slice(source.indexOf('function titrationBenchNotebook('),source.indexOf('function TitrationInvestigationCollection('));
const api=new Function(helpers+';return {key:titrationInvestigationKey,progress:titrationInvestigationProgress,collection:titrationInvestigationCollection};')();
const row=(id,volume,value,patch={})=>({id,volume,value,preset:'sa_sb',setup:'HCl (0.1 M) + NaOH (0.1 M)',axis:'pH',indicator:'Phenolphthalein',observation:'Saved simulated reading',note:'',...patch});
const zero=row(1,0,1),before=row(2,25,7),after=row(3,25.1,10.3);
const study=(rows,patch={})=>({version:1,active:true,prediction:21,evidence:rows.map(api.key),compared:'',explanation:'',completed:false,...patch});
const tracker=(rows,state=study(rows))=>api.collection(api.progress(state,rows));

describe('saved observation collection tracker',()=>{
  it('shows missing sides using only evidence captured by the investigation',()=>{
    expect(api.collection(null)).toBeNull();
    expect(tracker([zero,before,after],study([]))).toMatchObject({status:'empty',before:null,after:null,gap:null});
    expect(tracker([zero,before])).toMatchObject({status:'need-after',before,after:null,gap:null});
    expect(tracker([after])).toMatchObject({status:'need-before',before:null,after,gap:null});
  });
  it('selects the latest-volume colorless observation when no pink observation is saved',()=>{
    expect(tracker([before,zero,row(4,24,2)])).toMatchObject({status:'need-after',before});
    expect(tracker([row(4,26,11),after])).toMatchObject({status:'need-before',after});
  });
  it('shows the narrowest valid crossing even when it is too wide to complete the collection step',()=>{
    const low=row(4,24,2),high=row(5,26,11),rows=[high,zero,low];
    const progress=api.progress(study(rows),rows);expect(progress.step).toBe(2);expect(progress.pair).toBeNull();
    expect(api.collection(progress)).toMatchObject({before:low,after:high,gap:2,status:'wide'});
  });
  it('uses the same threshold, direction, and tolerance as the guided completion rules',()=>{
    for(const [low,high,expected] of [[before,after,'ready'],[row(4,24.9,2.7),after,'ready'],[row(4,24.8,2.4),after,'wide'],[before,row(4,25.1,8.19),'need-after'],[before,row(4,25.1,8.2),'ready']]){
      const rows=[zero,low,high],progress=api.progress(study(rows),rows),collection=api.collection(progress);
      expect(collection.status).toBe(expected);expect(progress.step).toBe(expected==='ready'?3:2);
      if(progress.pair){expect(collection.before).toEqual(progress.pair.a);expect(collection.after).toEqual(progress.pair.b);expect(collection.gap).toBe(progress.pair.gap);}
    }
  });
  it('does not form a pair across different setups or indicators, or decreasing volumes',()=>{
    for(const rows of [[before,{...after,setup:'Different setup'}],[before,{...after,indicator:'Methyl Orange'}],[row(4,26,7),after],[before,{...after,volume:25}]])expect(tracker(rows)).toMatchObject({status:'mismatch',gap:null});
  });
  it('excludes unrelated presets, signal axes, and missing or replaced evidence',()=>{
    const rows=[zero,before,after],s=study(rows);
    expect(tracker([zero,before,{...after,preset:'redox_kmno4'}],s).status).toBe('need-after');
    expect(tracker([zero,before,{...after,axis:'E'}],s).status).toBe('need-after');
    expect(tracker([zero,before,{...after,volume:40}],s).status).toBe('need-after');
    expect(tracker([zero,before],s).after).toBeNull();
  });
  it('keeps a reviewed pair consistent with the report when closer observations are later added',()=>{
    const low=row(4,24.9,2.7),initial=[zero,low,after],s=study(initial),pair=api.progress(s,initial).pair;
    const all=[...initial,before],reviewed=study(all,{compared:pair.key,explanation:'Reviewed observations',completed:true});
    const progress=api.progress(reviewed,all);expect(progress.step).toBe(5);
    expect(api.collection(progress)).toMatchObject({before:low,after,gap:0.2,status:'ready'});
  });
  it('does not mutate the notebook or study and retains observation notes for direct review',()=>{
    const noted={...before,note:'Colorless at this volume.'},rows=[after,zero,noted],s=study(rows),serialized=JSON.stringify({rows,s});
    const progress=api.progress(s,rows),collection=api.collection(progress);
    expect(collection.before.note).toBe(noted.note);expect(JSON.stringify({rows,s})).toBe(serialized);
    expect(progress.records.map(r=>r.id)).toEqual([3,1,2]);
  });
});
