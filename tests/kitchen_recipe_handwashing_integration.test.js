import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js'),fixture=require('../dev-tools/kitchen_recipe_fixture.cjs');

describe('Handwashing through the shared recipe model',()=>{
  it.each(['scene-wash','keyboard-wash'])('records %s as exactly one existing preparation action',method=>{
    for(const id of ['mushroom','tomato'])for(const servings of [2,4]){
      const before=R.start(id,servings),next=R.act(before,'wash',undefined,method),simple=R.act(before,'wash');
      expect(next.log).toHaveLength(1);expect(next.log[0]).toMatchObject({action:'wash',accepted:true,interaction:method});
      expect(next.prep).toEqual(simple.prep);expect(next.prep.hands).toBe(true);expect(next.time).toBe(before.time);
      expect(next.pot).toEqual(before.pot);expect(next.pan).toEqual(before.pan);expect(next.version).toBe(before.version);
      expect(Object.keys(next)).toEqual(Object.keys(before));expect(R.drying(next)).toEqual(R.drying(before));
      expect(before.prep.hands).toBe(false);expect(before.log).toEqual([]);
    }
  });
  it.each(['scene-wash','keyboard-wash'])('round-trips the %s method without new save fields',method=>{
    const s=R.act(R.start('tomato',4),'wash',undefined,method),raw=JSON.parse(JSON.stringify(s));
    expect(R.restore(raw)).toEqual(s);expect(raw.prep).not.toHaveProperty('washSeconds');
    expect(raw.prep).not.toHaveProperty('washCoverage');expect(raw).not.toHaveProperty('washing');
  });
  it('replays handwashing only at its historical action, with its original interaction method',()=>{
    let source=R.start('mushroom',2,'demonstrate');
    for(const [action,value] of fixture().steps)source=R.act(source,action,value,action==='wash'?'scene-wash':undefined);
    source=R.submit({...source,answers:[0,0]});expect(source.plated&&source.submitted).toBe(true);
    const index=source.log.findIndex(e=>e.action==='wash')+1,before=R.replay(source,index-1).state,after=R.replay(source,index).state;
    expect(before.prep.hands).toBe(false);expect(before.log.some(e=>e.interaction==='scene-wash')).toBe(false);
    expect(after.prep.hands).toBe(true);expect(after.log.at(-1)).toMatchObject({action:'wash',interaction:'scene-wash'});
    expect(after.time).toBe(before.time);expect(after.pot).toEqual(before.pot);expect(after.pan).toEqual(before.pan);
    expect(R.restore(source)).toEqual(source);
  });
  it('keeps original simplified wash observations compatible with existing saved cooks',()=>{
    const s=R.act(R.start(),'wash');expect(s.log[0]).not.toHaveProperty('interaction');
    expect(R.restore(JSON.parse(JSON.stringify(s)))).toEqual(s);
    expect(s.log[0].accepted).toBe(true);expect(s.prep.hands).toBe(true);
  });
  it('never washes or dries the produce when the learner washes their hands',()=>{
    const s=R.start('tomato',4),next=R.act(s,'wash',undefined,'keyboard-wash');
    expect(next.prep.rinsed).toBe(false);expect(next.prep.dry).toBe(false);expect(next.prep.cuts).toEqual(s.prep.cuts);
    expect(R.drying(next).remaining).toBe(R.drying(s).remaining);expect(next.prep.garlic).toBe(false);
  });
});
