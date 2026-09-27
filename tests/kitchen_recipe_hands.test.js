import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url),H=require('../stem_lab/kitchen_studio/recipe_lab_hands.js'),R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js'),cook=require('../dev-tools/kitchen_recipe_fixture.cjs');
describe('Hands-on recipe decisions',()=>{
  it('requires a complete downward cut within a piece, not a tap or horizontal scrub',()=>{
    const start=H.knifeStart(80,20,[40]);expect(H.knifeValue(start)).toBeNull();
    expect(H.knifeValue(H.knifeMove(start,80,80))).toBeNull();
    expect(H.knifeValue(H.knifeMove(start,80,115))).toBe('0:5');
    expect(H.knifeValue(H.knifeMove(start,150,115))).toBeNull();
    expect(H.knifeStart(80,70,[40])).toBeNull();
    expect(H.knifeStart(30,20,[40])).toBeNull();expect(H.knifeStart(430,20,[40])).toBeNull();
    expect(H.knifeStart(130,20,[10,30])).toBeNull();
    expect(H.knifeValue(H.knifeMove(H.knifeStart(180,20,[10,30]),181,110))).toBe('1:5');
  });
  it('does not repair a failed stroke by returning to the original line',()=>{
    let s=H.knifeStart(80,20,[40]);s=H.knifeMove(s,120,80);s=H.knifeMove(s,80,120);expect(H.knifeValue(s)).toBeNull();
    let up=H.knifeStart(80,30,[40]);up=H.knifeMove(up,80,12);up=H.knifeMove(up,80,120);expect(H.knifeValue(up)).toBeNull();
  });
  it('rejects invalid geometry and conserves the sample when a gesture is committed',()=>{
    expect(H.knifeStart(NaN,20,[40])).toBeNull();expect(H.knifeValue(H.knifeMove(H.knifeStart(80,20,[40]),Infinity,120))).toBeNull();
    let s=R.start();for(const a of ['wash','rinse'])s=R.act(s,a);
    s=R.act(s,'slice',H.knifeValue(H.knifeMove(H.knifeStart(80,20,s.prep.cuts),80,110)),'knife-stroke');
    expect(s.prep.cuts).toEqual([5,35]);expect(s.log.at(-1).interaction).toBe('knife-stroke');
    expect(R.act(R.start(),'slice','0:5','knife-stroke').prep.cuts).toEqual([40]);
  });
  it('pours only after sufficient tilt and accumulates conservative ten-milliliter doses',()=>{
    expect(H.pourStep(9,0,100,200)).toEqual({amount:0,remainder:0});
    expect(H.pourStep(0,80,100,200)).toEqual({amount:0,remainder:7});
    expect(H.pourStep(7,80,100,200)).toEqual({amount:10,remainder:4});
    expect(H.pourStep(9,80,100,0).amount).toBe(0);
    expect(H.pourStep(0,80,999999,200).amount).toBe(0);
    expect(H.pourStep(0,NaN,100,200).amount).toBe(0);
  });
  it('makes tilt control flow rate and never takes more water than available',()=>{
    function pour(tilt){let rem=0,water=200,amount=0;for(let i=0;i<20;i++){const d=H.pourStep(rem,tilt,50,water);rem=d.remainder;water-=d.amount;amount+=d.amount;}return amount;}
    expect(pour(80)).toBeGreaterThan(pour(25));
    let s=R.startRescue('dry',0),remainder=0;for(let i=0;i<100;i++){const d=H.pourStep(remainder,80,100,s.pot.reserve);remainder=d.remainder;if(d.amount)s=R.act(s,'pour',d.amount,'tilt');}
    expect(s.pot.reserve).toBe(0);expect(s.pan.waterAdded).toBe(200);expect(s.pan.moisture).toBe(208);expect(R.criteria(s)[0].met).toBe(false);
  });
  it('maps spatial transfers without bypassing preparation or temperature rules',()=>{
    expect(H.transferAction('oil','pot')).toBeNull();expect(H.transferAction('spoon','pot')).toBe('sample');expect(H.transferAction('pan','plate')).toBe('plate');
    const s=R.act(R.start(),H.transferAction('produce','pan'),undefined,'drag');expect(s.log.at(-1).accepted).toBe(false);expect(s.pan.produce).toBe(false);
    const water=R.act(R.start(),H.transferAction('water','pot'),undefined,'drag');expect(water.pot.water).toBe(1200);
    expect(R.act(water,H.transferAction('pasta','pot'),undefined,'drag').pot.pasta).toBe(false);
  });
  it('requires mixing water added after combining and invalidates checks after either mixing control',()=>{
    let s=R.startRescue('dry',0);s=R.act(s,'pour',50,'tilt');s=R.act(s,'taste');expect(R.criteria(s)[0].met).toBe(false);
    s=R.act(s,'stirSweep','gesture');expect(s.pan.tasted).toBe(false);expect(R.criteria(s)[0].met).toBe(true);
    let normal={...cook().state,plated:false};normal=R.act(normal,'pour',10,'tilt');expect(R.criteria(normal)[3].met).toBe(false);
    normal=R.act(normal,'stirPan');expect(R.criteria(normal)[3].met).toBe(true);expect(normal.pan.tasted).toBe(false);
  });
  it('preserves interaction provenance through save, replay, and export without changing assessment',()=>{
    let s=R.start();for(const [a,v] of cook().steps)s=R.act(s,a,v,'drag');s=R.submit({...s,answers:[0,0]});
    expect(R.restore(JSON.parse(JSON.stringify(s)))).toEqual(s);expect(R.replay(s,s.log.length).state.log).toEqual(s.log);
    expect(R.evidence(s).actions[0].interaction).toBe('drag');expect(R.evidence(s).status).toBe('Recipe completed with coaching');
    expect(R.act(s,'pour',10,'tilt')).toBe(s);expect(R.act(R.start(),'wash',null,'untrusted').log[0]).not.toHaveProperty('interaction');
  });
  it('ships the direct tools and assets in the desktop mirror',()=>{
    for(const f of ['recipe_lab_hands.js','recipe_lab_hands_ui.js','recipe_lab_hands.css'])expect(readFileSync('desktop/web-app/public/stem_lab/kitchen_studio/'+f,'utf8')).toBe(readFileSync('stem_lab/kitchen_studio/'+f,'utf8'));
  });
});
