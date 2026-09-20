import fs from 'node:fs';
import {describe,it,expect} from 'vitest';

const source=fs.readFileSync('stem_lab/stem_tool_titration.js','utf8');
const helpers=source.slice(source.indexOf('function titrationBenchNotebook('),source.indexOf('// Export the reviewed saved evidence'));
const api=new Function(helpers+';return {remove:titrationBenchRemoval,undo:titrationBenchUndo,key:titrationInvestigationKey,progress:titrationInvestigationProgress,append:titrationBenchAppend};')();
const row=(id,volume,value,patch={})=>({id,volume,value,preset:'sa_sb',setup:'HCl (0.1 M) + NaOH (0.1 M)',axis:'pH',indicator:'Phenolphthalein',observation:'Simulated reading',note:'Saved note '+id,...patch});
const rows=[row(1,0,1),row(2,25,7),row(3,25.1,10.3),row(4,30,12)];
function study(patch={}){
  const s={version:1,active:true,prediction:21,evidence:rows.slice(0,3).map(api.key),compared:'',explanation:'The saved interval brackets the indicator color change.',completed:true,...patch};
  s.compared=api.progress(s,rows).pair.key;return s;
}
const restore=patch=>api.undo(patch.benchNotebookUndo,patch.benchNotebook,patch.endpointInvestigation);

describe('titration notebook removal and recovery',()=>{
  it('removes one unrelated reading and preserves the completed investigation',()=>{
    const s=study(),patch=api.remove(rows,s,4);
    expect(patch.benchNotebook).toEqual(rows.slice(0,3));expect(patch.endpointInvestigation).toEqual(s);
    expect(api.progress(patch.endpointInvestigation,patch.benchNotebook).step).toBe(5);
    expect(restore(patch)).toEqual({benchNotebook:rows,endpointInvestigation:s,benchNotebookUndo:null});
  });
  it('removing evidence invalidates progress and undo restores the exact reviewed evidence and notes',()=>{
    const s=study(),patch=api.remove(rows,s,3);
    expect(patch.endpointInvestigation.evidence).not.toContain(api.key(rows[2]));
    expect(api.progress(patch.endpointInvestigation,patch.benchNotebook).step).toBe(2);
    const restored=restore(patch);expect(restored.benchNotebook).toEqual(rows);expect(restored.endpointInvestigation).toEqual(s);
    expect(api.progress(restored.endpointInvestigation,restored.benchNotebook).step).toBe(5);
  });
  it('clears and restores the notebook with original order, identifiers, and attribution',()=>{
    const patch=api.remove(rows,study(),null);expect(patch.benchNotebook).toEqual([]);expect(patch.endpointInvestigation.evidence).toEqual([]);
    const restored=restore(patch);expect(restored.benchNotebook).toEqual(rows);expect(restored.endpointInvestigation.evidence).toEqual(rows.slice(0,3).map(api.key));
    expect(restored.endpointInvestigation.evidence).not.toContain(api.key(rows[3]));
  });
  it('works in paused investigations and without an investigation',()=>{
    const paused=api.remove(rows,study({active:false}),1);expect(paused.endpointInvestigation.evidence).not.toContain(api.key(rows[0]));
    expect(restore(paused).endpointInvestigation.active).toBe(false);
    const free=api.remove(rows,null,null);expect(restore(free)).toEqual({benchNotebook:rows,endpointInvestigation:null,benchNotebookUndo:null});
  });
  it('does not overwrite later readings, note edits, or reused identifiers',()=>{
    const patch=api.remove(rows,study(),3),undo=patch.benchNotebookUndo;
    for(const changed of [[],patch.benchNotebook.slice(1),patch.benchNotebook.map(r=>({...r,note:'new note'})),api.append(patch.benchNotebook,row(3,40,12))])expect(api.undo(undo,changed,patch.endpointInvestigation)).toBeNull();
  });
  it('does not restore an older investigation over new answers or changed activity state',()=>{
    const patch=api.remove(rows,study(),1);
    for(const changed of [{prediction:25},{explanation:'New conclusion'},{active:false},{compared:''},{completed:false},{evidence:[]}])expect(api.undo(patch.benchNotebookUndo,patch.benchNotebook,{...patch.endpointInvestigation,...changed})).toBeNull();
    expect(api.undo(patch.benchNotebookUndo,patch.benchNotebook,null)).toBeNull();
  });
  it('rejects malformed removals and undo snapshots describing edits instead of removal',()=>{
    for(const id of [undefined,'1',NaN,0,-1,1.5,20])expect(api.remove(rows,study(),id)).toBeNull();
    expect(api.remove([],study(),null)).toBeNull();
    const patch=api.remove(rows,study(),1),raw=patch.benchNotebookUndo;
    const bad=[null,{}, {...raw,version:2},{...raw,before:[]},{...raw,after:rows},{...raw,after:[...raw.after].reverse()},{...raw,after:raw.after.map(r=>({...r,value:9}))},{...raw,studyAfter:{...raw.studyAfter,explanation:'Changed'}},{...raw,before:[...raw.before,raw.before[0]]}];
    for(const candidate of bad)expect(api.undo(candidate,patch.benchNotebook,patch.endpointInvestigation)).toBeNull();
  });
  it('survives serialization and keeps the single-step recovery bounded to 40 readings',()=>{
    const full=Array.from({length:40},(_,i)=>row(i+1,i,7)),patch=JSON.parse(JSON.stringify(api.remove(full,null,null)));
    expect(restore(patch).benchNotebook).toEqual(full);
    expect(api.undo({...patch.benchNotebookUndo,before:[...full,row(41,41,7)]},[],null)).toBeNull();
  });
  it('takes copies without mutating input data or sharing restored rows',()=>{
    const s=study(),before=JSON.stringify({rows,s}),patch=api.remove(rows,s,1),restored=restore(patch);
    restored.benchNotebook[0].note='Changed output';restored.endpointInvestigation.evidence.length=0;
    expect(JSON.stringify({rows,s})).toBe(before);expect(restore(patch).benchNotebook).toEqual(rows);
    expect(restore(patch).endpointInvestigation).toEqual(s);
  });
});
