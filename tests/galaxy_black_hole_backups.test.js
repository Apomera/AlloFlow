import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const source=readFileSync('stem_lab/stem_tool_galaxy.js','utf8');
const kernel=source.split('// BEGIN BLACK HOLE EXPERIMENT MODEL')[1].split('// END BLACK HOLE EXPERIMENT MODEL')[0];
const model=new Function(kernel+';return {parse:blackHoleParseNotebookBackup,entries:blackHoleNotebookEntries,candidates:blackHoleNotebookImportCandidates,merge:blackHoleMergeNotebookImport,undo:blackHoleUndoNotebookImport};')();
const release={blackHoleDropObject:'probe',blackHoleMassMode:'stellar',blackHoleReleaseRadius:5,blackHoleSideways:0,blackHoleRadialVelocity:0,blackHoleLaunchAngle:41};
const record=(i,changes={})=>({id:'entry_'+i,number:i,note:'Note '+i,settings:{...release},...changes});
const backup=(experiments=[record(1)],comparison=null)=>({schema:'galaxy-black-hole-experiments',version:1,experiments,comparison});
const parse=data=>model.parse(JSON.stringify(data));

describe('Experiment backup decoding',()=>{
  it('preserves legacy releases, named releases, and an independent kept reference',()=>{
    const data=backup([record(1),record(2,{title:'First orbit'})],{...release,blackHoleSideways:1});
    expect(parse(data).value).toEqual({experiments:data.experiments,comparison:data.comparison});
  });
  it('ignores stored predictions and unknown metadata, then copies canonical inputs',()=>{
    const item={...record(1),title:'<img src=x onerror=alert(1)>',prediction:{outcome:'escaped'},geometry:{positions:[1,2]},settings:{...release,samples:[99]}};
    const result=parse({...backup([item]),model:'<script>ignored model text</script>'}).value;
    expect(result.experiments[0]).toEqual({...record(1),title:item.title});
    expect(result).not.toHaveProperty('model');expect(result.experiments[0]).not.toHaveProperty('prediction');
  });
  it('retains separate saved records that have identical release settings and notes',()=>{
    const items=[record(1,{note:''}),record(2,{note:''}),record(3,{note:''})];expect(parse(backup(items)).value.experiments).toEqual(items);
  });
  it('supports a backup containing only a kept reference',()=>{
    expect(parse(backup([],release)).value).toEqual({experiments:[],comparison:release});
    expect(parse(backup([])).error).toBe('empty');
  });
  it.each([null,[],{}, {schema:'other',version:1,experiments:[]}])('rejects a different document format %j',data=>expect(parse(data).error).toBe('format'));
  it.each([0,2,'1',null])('rejects an unsupported version %j',version=>expect(parse({...backup(),version}).error).toBe('version'));
  it.each([
    [null], [record(1),record(1)], [record(1,{id:'../../bad'})], [record(1,{number:0})],
    [record(1,{note:42})], [record(1,{note:'x'.repeat(601)})], [record(1,{title:null})], [record(1,{title:'x'.repeat(81)})],
    [record(1,{settings:{...release,blackHoleReleaseRadius:9}})], [record(1,{settings:{...release,blackHoleRadialVelocity:'0'}})],
    Array.from({length:9},(_,i)=>record(i+1)),
  ])('rejects invalid entries as a whole without silently dropping work %j',items=>expect(parse(backup(items)).error).toBe('entries'));
  it('rejects an invalid reference and accepts the exact note and name limits',()=>{
    expect(parse(backup([record(1)],{...release,blackHoleSideways:100})).error).toBe('entries');
    const item=record(1,{title:'x'.repeat(80),note:'y'.repeat(600)});expect(parse(backup([item])).value.experiments[0]).toEqual(item);
  });
  it('opens a UTF-8 backup saved with a leading byte-order mark',()=>{
    expect(model.parse('﻿'+JSON.stringify(backup())).value).toEqual(parse(backup()).value);
  });
  it('bounds decoding and handles invalid JSON',()=>{
    expect(model.parse('x'.repeat(262145)).error).toBe('size');expect(model.parse('{broken').error).toBe('format');expect(model.parse(null).error).toBe('size');
  });
});

describe('Selecting and merging imported experiments',()=>{
  it('recognizes an unchanged saved ID but offers an edited local ID as a separate copy',()=>{
    const current=[record(1),record(2,{title:'Edited locally'})],incoming=[record(1,{title:''}),record(2)];
    const candidates=model.candidates(current,incoming);
    expect(candidates[0].alreadySaved).toBe(true);expect(candidates[1].alreadySaved).toBe(false);expect(candidates[1].newIdentity).toBe(true);
  });
  it('imports only selected records, preserving current records and assigning new numbers',()=>{
    const current=[record(7)],incoming=[record(1,{title:'Orbit'}),record(2)];
    const result=model.merge(current,incoming,['entry_2'],40,'import_batch');
    expect(result.entries[0]).toEqual(current[0]);expect(result.imported).toEqual([{...incoming[1],number:41}]);expect(result.serial).toBe(41);
    expect(current).toEqual([record(7)]);expect(incoming[1].number).toBe(2);
  });
  it('preserves both notes when an imported ID collides with an edited local record',()=>{
    const current=[record(1,{title:'Local',note:'My updated note'})],incoming=[record(1,{title:'Backup'})];
    const result=model.merge(current,incoming,['entry_1'],1,'import_batch');
    expect(result.entries[0]).toEqual(current[0]);expect(result.imported[0]).toEqual({...incoming[0],id:'import_batch_1',number:2});
  });
  it('resolves generated-ID collisions without losing separate incoming records',()=>{
    const current=[record(1,{id:'seed_1',note:'Local'})],incoming=[record(2,{id:'seed_1'}),record(3,{id:'seed_2'})];
    const result=model.merge(current,incoming,['seed_1','seed_2'],3,'seed');
    expect(result.imported.map(e=>e.id)).toEqual(['seed_2','seed_3']);expect(new Set(result.entries.map(e=>e.id)).size).toBe(3);
  });
  it('excludes already-saved records from capacity and never evicts an existing note',()=>{
    const current=Array.from({length:8},(_,i)=>record(i+1));
    expect(model.merge(current,[record(1)],['entry_1'],8,'batch').entries).toEqual(current);
    expect(model.merge(current,[record(9)],['entry_9'],8,'batch').error).toBe('capacity');
    expect(current[0].note).toBe('Note 1');
  });
  it('uses the largest existing number and rejects exhausted numbering',()=>{
    expect(model.merge([record(20)],[record(1)],['entry_1'],2,'batch').imported[0].number).toBe(21);
    expect(model.merge([],[record(1)],['entry_1'],1000000000,'batch').error).toBe('number');
  });
});

describe('Undoing an import',()=>{
  it('removes unchanged additions while retaining new edits and unrelated work',()=>{
    const imported=[record(2,{title:'Backup A'}),record(3,{title:'Backup B'})];
    const current=[record(1,{note:'Edited old note'}),{...imported[0],title:'New title'},imported[1],record(4)];
    const result=model.undo(current,imported);
    expect(result.entries).toEqual([current[0],current[1],current[3]]);expect(result.removed).toBe(1);expect(result.edited).toBe(1);
    expect(current).toHaveLength(4);
  });
  it('keeps an imported note edited after the operation and does not resurrect removed records',()=>{
    const imported=[record(1),record(2)],current=[{...record(2),note:'New observation'}];
    expect(model.undo(current,imported)).toEqual({entries:current,removed:0,edited:1});
  });
});

describe('Named experiment controls',()=>{
  beforeEach(()=>{resetStemLab();window._galaxyHasLoadedOnce=true;loadTool('stem_lab/stem_tool_galaxy.js','galaxy');});
  const render=entries=>{const root=document.createElement('div');root.innerHTML=renderTool('galaxy',{galaxy:{simMode:'blackHole',blackHoleNotebook:entries}});return root;};
  it('uses custom names for headings and actions, while keeping a stable numbered input label',()=>{
    const root=render([record(1,{title:'First orbit'})]);
    expect(root.querySelector('[data-bh-notebook-entry] h5').textContent).toBe('First orbit');
    const name=root.querySelector('[data-bh-notebook-title]');expect(name.value).toBe('First orbit');expect(name.maxLength).toBe(80);expect(name.getAttribute('aria-label')).toBe('Name for experiment 1');
    expect(root.querySelector('[data-bh-notebook-restore]').getAttribute('aria-label')).toBe('Restore First orbit');
  });
  it('escapes names and retains the numbered fallback for a blank title',()=>{
    const root=render([record(1,{title:'<img src=x onerror=alert(1)>'}),record(2,{title:'   '})]);
    expect(root.querySelector('[data-bh-notebook] img')).toBeNull();expect(root.querySelector('[data-bh-notebook-entry="entry_2"] h5').textContent).toBe('Experiment 2');
    expect(root.querySelector('[data-bh-notebook-import]')).not.toBeNull();expect(root.querySelector('[data-bh-notebook-file]').getAttribute('accept')).toBe('.json,application/json');
  });
  it('synchronizes every backup label in the English registry mirrors and catalog',()=>{
    const keys=[...new Set([...source.matchAll(/stem\.galaxy\.(bh_book_\w+)/g)].map(m=>m[1]))],catalog=JSON.parse(readFileSync('dev-tools/i18n/stem_galaxy_en.json','utf8'));
    for(const p of ['ui_strings.js','desktop/web-app/public/ui_strings.js']){const strings=JSON.parse(readFileSync(p,'utf8')).stem.galaxy;for(const k of keys){expect(strings[k],k).toBe(catalog[k]);expect(typeof strings[k],k).toBe('string');}}
  });
});
