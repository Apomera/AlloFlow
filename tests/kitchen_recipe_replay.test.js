import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js'),cook=require('../dev-tools/kitchen_recipe_fixture.cjs');
const recorded=(id='mushroom',servings=2)=>R.submit({...cook(id,servings).state,answers:[0,R.recipe(id).correct],hints:2,reflection:'My original reflection.'});
describe('Recipe decision replay',()=>{
  for(const id of ['mushroom','tomato'])for(const servings of [2,4])it(`reconstructs ${id} for ${servings} through the actual action sequence`,()=>{
    const source=recorded(id,servings);let expected=R.start(id,servings,'demonstrate');expect(R.replay(source,0).state).toEqual(expected);
    for(let index=1;index<=source.log.length;index++){const a=source.log[index-1];expected=R.act(expected,a.action,a.value);const frame=R.replay(source,index);expect(frame.state).toEqual(expected);expect(frame.index).toBe(index);expect(frame.total).toBe(source.log.length);}
    const last=R.replay(source,source.log.length);expect(last.state.pan).toEqual(source.pan);expect(last.state.pot).toEqual(source.pot);expect(last.state.plated).toBe(true);
  });
  it('keeps saved evidence and hints unchanged and isolates returned frames',()=>{
    const source=recorded(),before=JSON.stringify(source),evidence=JSON.stringify(R.evidence(source)),f=R.replay(source,12);f.state.pan.temp=9000;f.action.observation='changed';
    expect(JSON.stringify(source)).toBe(before);expect(JSON.stringify(R.evidence(source))).toBe(evidence);expect(R.replay(source,12).state.pan.temp).not.toBe(9000);
  });
  it('requires recorded completion and a valid action position',()=>{
    expect(R.replay(R.start(),0)).toBeNull();expect(R.replay(cook().state,0)).toBeNull();const s=recorded();for(const index of [-1,.5,Infinity,NaN,s.log.length+1])expect(R.replay(s,index)).toBeNull();
  });
  it('shows the heat load and ingredient transfer when pasta enters the pot',()=>{
    const s=recorded(),index=s.log.findIndex(a=>a.action==='pasta')+1,f=R.replay(s,index);expect(f.changes.some(c=>c.includes('water temperature'))).toBe(true);expect(f.changes).toContain('Weighed pasta entered the pot.');expect(f.changes.some(c=>c.includes('Texture sample'))).toBe(false);
    const sample=R.replay(s,s.log.findIndex(a=>a.action==='sample')+1);expect(sample.changes.some(c=>c.includes('Texture sample'))).toBe(true);
  });
  it('retains a rejected decision and its corrective observation',()=>{
    const original=recorded(),s=R.restore({...original,log:[{action:'cut',value:null},...original.log]});expect(s.submitted).toBe(true);const f=R.replay(s,1);expect(f.action.accepted).toBe(false);expect(f.action.observation).toContain('Wash hands');expect(f.state.prep.cut).toBe(false);expect(f.changes).toEqual([]);expect(R.evidence(s).corrections).toBe(1);
  });
});
