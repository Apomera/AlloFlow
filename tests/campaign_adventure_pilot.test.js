import {beforeAll,describe,it,expect,vi} from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {createAdapters} from '../dev-tools/campaign-adventure-pilot/adapters.mjs';
import {makeRun,materialize,dispatch,validateRun,saveRun,readRun,listRuns,saveKey,PREFIX,addNote,forkRun,narrate} from '../dev-tools/campaign-adventure-pilot/core.mjs';
const require=createRequire(import.meta.url);
const {build,verifyPreservation,capturePreservation,extractWatershed,root}=require('../dev-tools/campaign-adventure-pilot/build.cjs');
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
    const historical=fs.readFileSync('dev-tools/campaign-adventure-pilot/preservation.json','utf8');
    const current=capturePreservation();
    expect(build(true)).toBe(23);
    expect(verifyPreservation(current)).toBeGreaterThanOrEqual(25);
    expect(fs.readFileSync('dev-tools/campaign-adventure-pilot/preservation.json','utf8')).toBe(historical);
  }, 60000);
  it('retains the strict historical audit and rejects current protected-file drift',()=>{
    const historical=JSON.parse(fs.readFileSync('dev-tools/campaign-adventure-pilot/preservation.json','utf8'));
    expect(historical.capturedAt).toBe('2026-09-07T02:52:10.179Z');
    const unchanged=verifyPreservation(capturePreservation());
    const current=capturePreservation();
    const file=Object.keys(current.files)[0];
    current.files[file]='0'.repeat(64);
    expect(()=>verifyPreservation(current)).toThrow('current preservation snapshot');
    expect(unchanged).toBeGreaterThanOrEqual(Object.keys(historical.files).length);
    const read=fs.readFileSync;
    const spy=vi.spyOn(fs,'readFileSync').mockImplementation((file,...args)=>{
      if(String(file)===path.join(root,'dev-tools/campaign-adventure-pilot/preservation.json'))
        return JSON.stringify({files:current.files});
      return read(file,...args);
    });
    try { expect(()=>verifyPreservation()).toThrow('pilot baseline'); }
    finally { spy.mockRestore(); }
  });
  it.each([false,true])('guards protected files during pilot build/check (%s) without production writes',check=>{
    let guardPhase=false;
    const protectedFile=path.join(root,'stem_lab/stem_tool_watercycle.js');
    const read=fs.readFileSync;
    const readSpy=vi.spyOn(fs,'readFileSync').mockImplementation((file,...args)=>{
      const value=read(file,...args);
      if(guardPhase&&String(file)===protectedFile)
        return Buffer.concat([Buffer.from(value),Buffer.from('\n// simulated out-of-scope drift\n')]);
      if(check&&String(file)===path.join(root,'dev-tools/campaign-adventure-pilot/watershed-source.mjs')) guardPhase=true;
      return value;
    });
    const writeSpy=vi.spyOn(fs,'writeFileSync').mockImplementation(()=>{guardPhase=true;});
    try {
      expect(()=>build(check)).toThrow('current preservation snapshot');
      if(check) expect(writeSpy).not.toHaveBeenCalled();
      else {
        expect(writeSpy).toHaveBeenCalledTimes(2);
        for(const [file]of writeSpy.mock.calls)
          expect(path.dirname(file)).toBe(path.join(root,'dev-tools/campaign-adventure-pilot'));
      }
    } finally { writeSpy.mockRestore();readSpy.mockRestore(); }
  },60000);
  it.each(['added','removed'])('rejects a protected file being %s during the current snapshot',change=>{
    const current=capturePreservation();
    const rootFile=Object.keys(current.files).find(file=>!file.includes('/'));
    expect(rootFile).toBeTruthy();
    const read=fs.readdirSync;
    const spy=vi.spyOn(fs,'readdirSync').mockImplementation((directory,...args)=>{
      const entries=read(directory,...args);
      if(String(directory)!==root) return entries;
      return change==='added'?[...entries,'adventure_simulated_drift.js']:entries.filter(file=>file!==rootFile);
    });
    try { expect(()=>verifyPreservation(current)).toThrow('current preservation snapshot'); }
    finally { spy.mockRestore(); }
  });
  it('contains the exact selected watershed declarations, with source provenance',()=>{
    const generated=fs.readFileSync('dev-tools/campaign-adventure-pilot/watershed-source.mjs','utf8');
    const output=extractWatershed();
    expect(generated).toBe(output.module);
    const provenance=JSON.parse(fs.readFileSync('dev-tools/campaign-adventure-pilot/provenance.json','utf8'));
    expect(provenance.sourceSha256).toBe(output.sourceSha256);
    expect(provenance.declarations).toEqual(output.provenance);
    expect(output.provenance.map(d=>d.name)).toEqual(expect.arrayContaining(['applyStewardTech','endStewardYear','advanceFromStewardReview','STEWARD_FEEDBACK_RULES']));
  });
  it('keeps LF and CRLF model extraction identical while preserving raw source hashes',()=>{
    const file=path.join(root,'stem_lab/stem_tool_watercycle.js');
    const bytes=fs.readFileSync(file);
    const source=bytes.toString('utf8').replace(/\r\n/g,'\n');
    const snapshot=capturePreservation();
    expect(snapshot.files['stem_lab/stem_tool_watercycle.js']).toBe(createHash('sha256').update(bytes).digest('hex'));
    const read=fs.readFileSync;
    let variant=source;
    const spy=vi.spyOn(fs,'readFileSync').mockImplementation((target,...args)=>{
      if(String(target)===file&&args[0]==='utf8') return variant;
      return read(target,...args);
    });
    try {
      const lf=extractWatershed();
      variant=source.replace(/\n/g,'\r\n');
      expect(extractWatershed()).toEqual(lf);
      expect(lf.sourceSha256).toBe(createHash('sha256').update(source).digest('hex'));
    } finally { spy.mockRestore(); }
    expect(fs.readFileSync(file).equals(bytes)).toBe(true);
    expect(capturePreservation()).toEqual(snapshot);
  });
  it('matches the current exact-source watershed runtime throughout all difficulties',()=>{
    const source=extractWatershed().module;
    const context={};vm.createContext(context);
    vm.runInContext(source.replace(/^export const sourceSha256 = /m,'const sourceSha256 = ').replace(/^export function createWatershedRuntime/m,'function createWatershedRuntime')+'\nthis.runtime=createWatershedRuntime();',context);
    const reference=context.runtime;
    for(const difficulty of Object.keys(reference.difficulties)){
      let run=makeRun(water,{seed:'SOURCE-PARITY',runId:'parity-'+difficulty,config:{difficulty}});
      let expected=reference.start({seed:run.seed,difficulty});
      expect(plain(materialize(water,run))).toEqual(plain(expected));
      for(let year=1;year<=10;year++){
        const action=water.actions(materialize(water,run)).find(a=>a.id.startsWith('tech:')&&!a.disabled);
        if(action){
          const [,tech,target]=action.id.split(':');
          expected=reference.apply(expected,tech,target==='all'?null:target);
          run=dispatch(water,run,action.id);
          expect(plain(materialize(water,run))).toEqual(plain(expected));
        }
        expected=reference.endYear(expected);run=dispatch(water,run,'end-year');
        expect(plain(materialize(water,run))).toEqual(plain(expected));
        expected=reference.continue(expected);run=dispatch(water,run,'continue');
        expect(plain(materialize(water,run))).toEqual(plain(expected));
      }
    }
  },60000);
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
