import {beforeAll,describe,it,expect,vi} from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {createAdapters} from '../dev-tools/campaign-adventure-pilot/adapters.mjs';
import {makeRun,materialize,dispatch,validateRun,saveRun,readRun,listRuns,saveKey,PREFIX,addNote,forkRun,narrate} from '../dev-tools/campaign-adventure-pilot/core.mjs';
const require=createRequire(import.meta.url);
const {build,verifyPreservation,extractWatershed}=require('../dev-tools/campaign-adventure-pilot/build.cjs');
const plain=x=>JSON.parse(JSON.stringify(x));
let tree,water,grove,adapters;
beforeAll(()=>{
  const context={window:{StemLab:{isRegistered:()=>false,registerTool(){}}},console:{log(){},warn(){}}};
  vm.createContext(context);vm.runInContext(fs.readFileSync('stem_lab/stem_tool_treelab.js','utf8'),context);
  tree=context.window.__alloTreeLabEngine;
  adapters=createAdapters(tree);[water,grove]=adapters;
});
const runFor=a=>makeRun(a,{seed:'FIELD-01',runId:a.id+'-test'});
function memoryStorage(){
  const map=new Map([['allo_adventure_save','original adventure'],['labToolData','original STEM data'],['alloflow-adventure-audio-v1','original audio preferences']]);
  return {map,get length(){return map.size;},key:i=>[...map.keys()][i],getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
}
describe('isolated campaign adventure pilot',()=>{
  it('leaves all protected Adventure and STEM source/build files unchanged',()=>{
    expect(verifyPreservation()).toBeGreaterThanOrEqual(25);
    expect(build(true)).toBe(23);
  }, 60000);
  it('contains the exact selected watershed declarations, with source provenance',()=>{
    const generated=fs.readFileSync('dev-tools/campaign-adventure-pilot/watershed-source.mjs','utf8');
    const output=extractWatershed();
    expect(generated).toBe(output.module);
    expect(output.provenance.map(d=>d.name)).toEqual(expect.arrayContaining(['applyStewardTech','endStewardYear','advanceFromStewardReview','STEWARD_FEEDBACK_RULES']));
  });
  it('matches Tree Life Lab for an entire eight-year campaign, every annual receipt and tree',()=>{
    const choices=['offspring','roots','reserve','offspring','offspring','reserve','roots','offspring'];
    let run=runFor(grove),reference=tree.groveStart({version:1,seed:run.seed,mode:'deck',choices:[]});
    choices.forEach(id=>{
      reference=tree.groveAdvance(reference,{priority:id,route:'mixed'});
      run=dispatch(grove,run,id);
      expect(plain(materialize(grove,run))).toEqual(plain(reference));
    });
    expect(grove.view(materialize(grove,run)).ended).toBe(true);
    expect(()=>dispatch(grove,run,'roots')).toThrow();
  });
  it('preserves watershed cost, targeted effects, annual review and completion rules',()=>{
    let run=runFor(water);
    const initial=materialize(water,run);
    run=dispatch(water,run,'tech:bufferPlant:forestBuffer');
    let state=materialize(water,run);
    expect(state.hoursLeft).toBe(13);
    for(const before of initial.components){
      const after=state.components.find(c=>c.id===before.id);
      if(before.id==='forestBuffer'){expect(after.quality).toBe(before.quality+8);expect(after.connectivity).toBe(before.connectivity+4);}
      else expect(after).toEqual(before);
    }
    expect(()=>dispatch(water,run,'tech:damRemoval:riverMainstem')).toThrow();
    expect(()=>dispatch(water,run,'tech:bufferPlant:suburbanEdges')).toThrow();
    for(let year=1;year<=10;year++){
      run=dispatch(water,run,'end-year');state=materialize(water,run);
      expect(state.phase).toBe('review');expect(state.yearLog).toHaveLength(year);
      expect(()=>dispatch(water,run,'end-year')).toThrow();
      run=dispatch(water,run,'continue');
    }
    state=materialize(water,run);expect(state.phase).toBe('debrief');expect(state.finalOutcome.tier).toBeTruthy();
    expect(water.actions(state)).toEqual([]);
    expect(initial.yearLog).toHaveLength(0);
  });
  it('keeps actions and annual cascades faithful to the source thresholds',()=>{
    let run=runFor(water);
    run=dispatch(water,run,'tech:bufferPlant:forestBuffer');
    run=dispatch(water,run,'tech:bufferPlant:forestBuffer');
    run=dispatch(water,run,'tech:bufferPlant:forestBuffer');
    const prior=materialize(water,run);
    run=dispatch(water,run,'end-year');
    const after=materialize(water,run);
    expect(after.yearLog[0].pre).toEqual(prior.components);
    expect(after.yearLog[0].post).toEqual(after.components);
    const buffer=after.components.find(c=>c.id==='forestBuffer');
    if(buffer.quality>70)expect(after.cascadesFiredThisYear.map(c=>c.id)).toContain('bufferFeedsHeadwaters');
  });
  it('rejects duplicate stale decisions and never mutates the previous run',()=>{
    const before=runFor(grove),serialized=JSON.stringify(before);
    const next=dispatch(grove,before,'offspring',0);
    expect(()=>dispatch(grove,next,'offspring',0)).toThrow(/already/);
    expect(JSON.stringify(before)).toBe(serialized);
  });
  it('saves and restores both campaigns independently without touching legacy storage',()=>{
    const storage=memoryStorage(),sentinels=[...storage.map.entries()];
    const waterRun=dispatch(water,runFor(water),'tech:stormwater:suburbanEdges');
    const groveRun=addNote(dispatch(grove,runFor(grove),'offspring'),'Three new arrivals are not yet established.');
    for(const [adapter,run]of [[water,waterRun],[grove,groveRun]]){
      expect(saveRun(storage,run).ok).toBe(true);
      const restored=readRun(storage,saveKey(run),adapters);
      expect(restored).toEqual(run);expect(materialize(adapter,restored)).toEqual(materialize(adapter,run));
    }
    expect(listRuns(storage,adapters)).toHaveLength(2);
    for(const [k,v]of sentinels)expect(storage.getItem(k)).toBe(v);
  });
  it('retains corrupt saves and rejects incompatible or cross-campaign imports',()=>{
    const storage=memoryStorage(),key=PREFIX+'grove:broken';storage.setItem(key,'{"version":99}');
    expect(listRuns(storage,adapters).find(r=>r.key===key).error).toBeTruthy();
    expect(storage.getItem(key)).toBe('{"version":99}');
    const run=runFor(grove);
    for(const bad of [{...run,version:2},{...run,config:{mode:'unknown'}},{...run,commands:['invented-action']},{...run,commands:Array(501).fill('roots')},{...run,notes:[{text:'x',revision:-1}]}])
      expect(()=>validateRun(grove,bad)).toThrow();
    expect(()=>validateRun(water,run)).toThrow();
    expect(()=>readRun(storage,'allo_adventure_save',adapters)).toThrow();
  });
  it('keeps unsaved work available when browser storage fails',()=>{
    const storage={setItem(){throw new Error('Quota exceeded');}};
    const run=dispatch(grove,runFor(grove),'offspring');
    expect(saveRun(storage,run)).toMatchObject({ok:false});
    expect(run.commands).toEqual(['offspring']);
    expect(grove.view(materialize(grove,run)).progress).toBe(1);
  });
  it('branches in the same world without replacing the earlier saved run',()=>{
    const storage=memoryStorage();
    let run=runFor(grove);
    run=dispatch(grove,run,'offspring');run=dispatch(grove,run,'roots');
    saveRun(storage,run);
    let branch=forkRun(run,1,'grove-branch');branch=dispatch(grove,branch,'reserve');saveRun(storage,branch);
    expect(storage.getItem(saveKey(run))).toBe(JSON.stringify(run));
    expect(listRuns(storage,adapters)).toHaveLength(2);
    const a=materialize(grove,run),b=materialize(grove,branch);
    expect(a.receipts.map(r=>plain(r.event))).toEqual(b.receipts.map(r=>plain(r.event)));
    expect(a.trees).not.toEqual(b.trees);
  });
  it('falls back on provider failure, invalid output, timeout and cancellation without advancing the model',async()=>{
    const run=runFor(grove),scene=grove.view(materialize(grove,run)),before=JSON.stringify(run);
    const failure=await narrate(scene,()=>Promise.reject(new Error('offline')));
    const invalid=await narrate(scene,()=>({systemStateUpdate:{quality:100}}));
    const timeout=await narrate(scene,()=>new Promise(()=>{}),{timeoutMs:10});
    const controller=new AbortController();controller.abort();
    const cancelled=await narrate(scene,()=>Promise.resolve('Too late'),{signal:controller.signal,timeoutMs:10});
    for(const result of [failure,invalid,timeout,cancelled])expect(result).toEqual({text:scene.body,status:'fallback'});
    expect(JSON.stringify(run)).toBe(before);
    expect(grove.view(materialize(grove,run))).toEqual(scene);
  });
  it('gives an optional narrator only detached evidence, with no state-changing API',async()=>{
    const scene=grove.view(materialize(grove,runFor(grove))),original=JSON.stringify(scene);
    const provider=vi.fn(request=>{request.evidence.push({fake:true});request.body='changed';return 'A short reflection.';});
    expect(await narrate(scene,provider)).toEqual({text:'A short reflection.',status:'optional'});
    expect(Object.keys(provider.mock.calls[0][0]).sort()).toEqual(['body','evidence','title']);
    expect(JSON.stringify(scene)).toBe(original);
  });
  it('refuses conflicting, older, or corrupt writes without replacing stored work',()=>{
    const storage=memoryStorage(),initial=runFor(grove);
    const first=dispatch(grove,initial,'offspring');saveRun(storage,first);
    const saved=storage.getItem(saveKey(first));
    expect(saveRun(storage,initial).ok).toBe(false);
    expect(saveRun(storage,dispatch(grove,initial,'roots')).ok).toBe(false);
    expect(storage.getItem(saveKey(first))).toBe(saved);
    const noted=addNote(first,'Saved in another tab.');saveRun(storage,noted);
    expect(saveRun(storage,dispatch(grove,first,'reserve')).ok).toBe(false);
    expect(storage.getItem(saveKey(first))).toBe(JSON.stringify(noted));
    storage.setItem(saveKey(first),'broken data');
    expect(saveRun(storage,first).ok).toBe(false);
    expect(storage.getItem(saveKey(first))).toBe('broken data');
  });

});
