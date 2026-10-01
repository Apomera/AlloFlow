import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
const source=readFileSync('stem_lab/stem_tool_galaxy.js','utf8');
const kernel=source.split('// BEGIN BLACK HOLE EXPERIMENT MODEL')[1].split('// END BLACK HOLE EXPERIMENT MODEL')[0];
const {snapshot,entries}=new Function(kernel+';return {snapshot:blackHoleReleaseSnapshot,entries:blackHoleNotebookEntries};')();
const release={blackHoleDropObject:'probe',blackHoleMassMode:'stellar',blackHoleReleaseRadius:5,blackHoleSideways:0,blackHoleRadialVelocity:0,blackHoleLaunchAngle:41};
const record=(i,settings=release)=>({id:'entry_'+i,number:i,note:'Note '+i,settings:{...settings}});

describe('Black hole saved releases',()=>{
  it('takes an independent scalar snapshot without carrying transient rendering data',()=>{
    const original={...release,samples:[1,2],line:{geometry:'ignored'}};
    const result=snapshot(original);expect(result).toEqual(release);
    original.blackHoleReleaseRadius=8;expect(result.blackHoleReleaseRadius).toBe(5);
    expect(result).not.toHaveProperty('samples');expect(result).not.toHaveProperty('line');
  });
  it.each([null,[],{},'saved', {...release,blackHoleDropObject:'alien'}, {...release,blackHoleMassMode:'unknown'}, {...release,blackHoleReleaseRadius:NaN}, {...release,blackHoleReleaseRadius:3.99}, {...release,blackHoleReleaseRadius:8.01}, {...release,blackHoleSideways:Infinity}, {...release,blackHoleSideways:1.61}, {...release,blackHoleRadialVelocity:'0'}, {...release,blackHoleRadialVelocity:-.66}, {...release,blackHoleLaunchAngle:181}])('ignores invalid saved settings %j',value=>expect(snapshot(value)).toBeNull());
  it.each([
    {blackHoleReleaseRadius:4,blackHoleSideways:-1.6,blackHoleRadialVelocity:-.65,blackHoleLaunchAngle:-180},
    {blackHoleReleaseRadius:8,blackHoleSideways:1.6,blackHoleRadialVelocity:.65,blackHoleLaunchAngle:180},
  ])('accepts exact supported boundaries %j',boundary=>expect(snapshot({...release,...boundary})).toEqual({...release,...boundary}));
  it('bounds notebook data and preserves independent notes and releases',()=>{
    const input=Array.from({length:10},(_,i)=>record(i+1));const saved=entries(input);
    expect(saved).toHaveLength(8);expect(saved[0].note).toBe('Note 1');
    input[0].settings.blackHoleReleaseRadius=8;expect(saved[0].settings.blackHoleReleaseRadius).toBe(5);
  });
  it('ignores invalid records and duplicate ids, while safely retaining plain note text',()=>{
    const r=record(1);r.note='<script>alert(1)</script>';
    const saved=entries([null,{...r,id:'../../bad'},{...r,number:0},{...r,number:Infinity},{...r,settings:{...release,blackHoleLaunchAngle:500}},r,r,record(2)]);
    expect(saved.map(e=>e.id)).toEqual(['entry_1','entry_2']);expect(saved[0].note).toBe(r.note);
    expect(entries([ {...record(3),note:'x'.repeat(900)} ])[0].note).toHaveLength(600);
  });
  it.each([null,{},'items'])('handles a malformed notebook %j',value=>expect(entries(value)).toEqual([]));
});

describe('Black hole notebook rendering',()=>{
  beforeEach(()=>{resetStemLab();window._galaxyHasLoadedOnce=true;loadTool('stem_lab/stem_tool_galaxy.js','galaxy');});
  const render=data=>{const root=document.createElement('div');root.innerHTML=renderTool('galaxy',{galaxy:{simMode:'blackHole',...data}});return root;};
  it('groups Place, Aim, and Release as an accessible workflow',()=>{
    const root=render({});const flow=root.querySelector('[data-bh-launch-workflow]');
    expect([...flow.querySelectorAll('button')].map(e=>e.textContent)).toEqual(['1Place object','2Aim throw','3Release here']);
    expect(flow.getAttribute('role')).toBe('group');
    expect(root.querySelectorAll('[data-bh-release]')).toHaveLength(1);
    expect(root.querySelector('[data-bh-launch-handle]').hidden).toBe(true);
  });
  it('renders saved predictions and notes, with a reference independent of the current launch',()=>{
    const saved=[record(1),record(2,{...release,blackHoleSideways:1}),record(3,{...release,blackHoleSideways:1.5})];
    const root=render({blackHoleNotebook:saved,blackHoleComparison:saved[1].settings,blackHoleReleaseRadius:8});
    expect(root.querySelectorAll('[data-bh-notebook-entry]')).toHaveLength(3);
    expect([...root.querySelectorAll('[data-bh-notebook-outcome]')].map(e=>e.textContent)).toEqual(['Center reaches the horizon','Circular center orbit','Center escapes']);
    expect(root.querySelector('[data-bh-notebook-compare="entry_2"]').getAttribute('aria-pressed')).toBe('true');
    expect(root.querySelector('[data-bh-notebook-compare="entry_1"]').getAttribute('aria-pressed')).toBe('false');
    expect(root.querySelector('[data-bh-notebook-note="entry_1"]').value).toBe('Note 1');
    expect(root.querySelector('[data-bh-notebook-export]').disabled).toBe(false);
  });
  it('shows capacity without silently replacing saved releases',()=>{
    const root=render({blackHoleNotebook:Array.from({length:8},(_,i)=>record(i+1))});
    expect(root.querySelector('[data-bh-notebook-full]').textContent).toContain('existing notes stay intact');
    expect(root.querySelector('[data-bh-notebook-save]').disabled).toBe(true);
    expect(root.querySelectorAll('[data-bh-notebook-entry]')).toHaveLength(8);
  });
  it('escapes untrusted notes and ignores malformed saved references',()=>{
    const entry={...record(1),note:'<img src=x onerror=alert(1)>'};
    const root=render({blackHoleNotebook:[entry,null,record(2,{...release,blackHoleMassMode:'unknown'})],blackHoleComparison:{...release,blackHoleSideways:Infinity}});
    expect(root.querySelector('[data-bh-notebook] img')).toBeNull();
    expect(root.querySelector('[data-bh-notebook-note]').value).toBe(entry.note);
    expect(root.querySelectorAll('[data-bh-notebook-compare][aria-pressed="true"]')).toHaveLength(0);
    expect(root.textContent).not.toMatch(/Infinity|NaN/);
  });
  it('leaves the saved notebook out of the optical control surface',()=>{
    expect(render({blackHoleOptical:true,blackHoleNotebook:[record(1)]}).querySelector('[data-bh-notebook]').hidden).toBe(true);
  });
});
