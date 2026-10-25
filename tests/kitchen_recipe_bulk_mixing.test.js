import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js'),S=require('../stem_lab/kitchen_studio/recipe_lab_sauce_chemistry.js');
const oldR=require('./fixtures/regression/kitchen-sauce-mixing-2026-10-18/baseline-runtime/recipe_lab_engine.js');
const oldFixtures=require('./helpers/reference_fixture.cjs')('kitchen-sauce-mixing-2026-10-18/thermal3-release-fixtures.json.gz');
const copy=s=>structuredClone(s),act=(s,list,engine=R)=>list.reduce((q,[a,v])=>engine.act(q,a,v),s),pending=s=>R.mixing(s).pending,total=p=>p.savedWaterMl+p.plainWaterMl+p.tomatoJuiceMl;
const start=()=>R.startRescue('cooled',0,'demonstrate');
const check=s=>R.inspections(s).filter(x=>x.kind==='sauce').at(-1);
function completeFolds(s){for(let i=0;i<8&&R.needsMixing(s);i++)s=act(s,[['stirPan'],['taste']]);return s;}
function compareNear(a,b,keys){for(const key of keys)expect(a[key],key).toBeCloseTo(b[key],10);}

describe('Conservative liquid-source redistribution',()=>{
 it('decays pending source tags without removing any free water and composes across equal efforts',()=>{
  const p={savedWaterMl:50,plainWaterMl:20,tomatoJuiceMl:10},before=JSON.stringify(p),one=S.redistributeLiquid(p,{waterBeforeMl:100,waterAfterMl:100,effort:1}),a=S.redistributeLiquid(p,{waterBeforeMl:100,waterAfterMl:100,effort:.4}),b=S.redistributeLiquid(a.pending,{waterBeforeMl:100,waterAfterMl:100,effort:.6});
  compareNear(one.pending,b.pending,Object.keys(p));for(const key of Object.keys(p)){expect(one.pending[key]).toBeCloseTo(p[key]*Math.exp(-3),12);expect(one.incorporated[key]).toBeCloseTo(a.incorporated[key]+b.incorporated[key],12);expect(one.pending[key]+one.incorporated[key]).toBeCloseTo(p[key],12);}expect(JSON.stringify(p)).toBe(before);
 });
 it('attributes water losses proportionally and never labels evaporation or uptake as incorporation',()=>{
  const p={savedWaterMl:40,plainWaterMl:20,tomatoJuiceMl:10},n=S.redistributeLiquid(p,{waterBeforeMl:100,waterAfterMl:25});
  expect(n.pending).toEqual({savedWaterMl:10,plainWaterMl:5,tomatoJuiceMl:2.5});expect(n.incorporated).toEqual(S.pending());
  expect(S.redistributeLiquid(p,{waterBeforeMl:100,waterAfterMl:0,effort:1})).toEqual({pending:S.pending(),incorporated:S.pending()});
 });
 it('rejects impossible source reservoirs and nonfinite work inputs',()=>{
  for(const args of [{waterBeforeMl:10,waterAfterMl:11},{waterBeforeMl:10,waterAfterMl:9,effort:-1},{waterBeforeMl:Infinity,waterAfterMl:9},{waterBeforeMl:10,waterAfterMl:NaN}])expect(()=>S.redistributeLiquid({savedWaterMl:5},args)).toThrow();
  expect(()=>S.redistributeLiquid({savedWaterMl:11},{waterBeforeMl:10,waterAfterMl:10})).toThrow();expect(()=>S.pending({plainWaterMl:-1})).toThrow();
 });
 it('makes new oil dilution invariant to dose subdivision while retaining the exact legacy law',()=>{
  const c=S.create({oilMl:15,starchG:.8,dispersion:.9}),newDose=(s,w,d)=>S.add(s,{starchG:d*.012},w,d,{mixingModel:2});
  const once=newDose(c,60,100),twice=newDose(newDose(c,60,50),110,50);let many=c;for(let i=0;i<10;i++)many=newDose(many,60+10*i,10);
  compareNear(once,twice,['oilMl','starchG','dispersion']);compareNear(once,many,['oilMl','starchG','dispersion']);expect(once.dispersion).toBeCloseTo(.9*Math.pow(60/160,.75),12);
  expect(S.add(c,{starchG:1.2},60,100).dispersion).toBe(.478125);expect(S.add(c,{starchG:1.2},60,100,{mixingModel:1}).dispersion).toBe(.478125);
  expect(newDose(c,0,100).dispersion).toBe(0);expect(newDose(c,60,0)).toEqual(c);
 });
});

describe('Progressive six-second mixing model2',()=>{
 it('starts new recipes and all rescues with zero source-tagged pending liquid',()=>{
  for(const s of [R.start('mushroom',2),R.start('tomato',4),...R.rescues.map(r=>R.startRescue(r.id,0))]){
   expect(s.mixingModel).toBe(2);expect(s.pan.pendingLiquid).toEqual(S.pending());expect(R.evidence(s).mixingModel).toBe(2);expect(R.mixing(s)).toMatchObject({mixingModel:2,pending:{...S.pending(),totalMl:0},pendingFraction:0,needsMixing:false});expect(R.mixingDuration(s,'stirPan')).toBe(6);
  }
 });
 it('tracks saved, plain and internally released juice as subsets of free water',()=>{
  const plain=act(R.startRescue('starchy',0),[['pour',30],['pourPlain',20]]),juice=act(start(),[['pour',30],['crushTomato',0]]);
  expect(pending(plain)).toEqual({savedWaterMl:30,plainWaterMl:20,tomatoJuiceMl:0,totalMl:50});expect(plain.pan.moisture).toBe(95);
  expect(pending(juice).savedWaterMl).toBe(30);expect(pending(juice).tomatoJuiceMl).toBeCloseTo(60/28,12);expect(pending(juice).totalMl).toBeCloseTo(juice.pan.moisture-60,12);
  expect(R.panThermal(plain).effectiveHeatCapacityMl-R.panThermal(R.startRescue('starchy',0)).effectiveHeatCapacityMl).toBeCloseTo(50,10);
 });
 it('requires another completed fold when a large splash still leaves visible pooling',()=>{
  const s=act(start(),[['taste'],['pour',100]]),a=act(s,[['stirPan'],['taste']]),b=act(a,[['stirPan'],['taste']]);
  expect(a.time).toBe(6);expect(R.mixing(a).liquidSinceMix).toBe(0);expect(R.needsMixing(a)).toBe(true);expect(check(a)).toMatchObject({mixingModel:2,type:'unmixed',bodyType:'unmixed',needsMixing:true});expect(R.criteria(a)[0].met).toBe(false);
  expect(b.time).toBe(12);expect(R.needsMixing(b)).toBe(false);expect(check(b).type).toBe('coating');expect(R.criteria(b)[0].met).toBe(true);expect(R.coolingCheck(b).met).toBe(true);
  expect(pending(b).totalMl).toBeGreaterThan(0);expect(pending(b).totalMl).toBeLessThan(pending(a).totalMl);expect(R.mixing(b).pendingFraction).toBeLessThan(.02);
 });
 it('does not turn the visual tolerance into an assertion that all liquid is perfectly mixed',()=>{
  const s=act(start(),[['pour',30],['stirPan'],['taste']]);expect(R.needsMixing(s)).toBe(false);expect(pending(s).totalMl).toBeGreaterThan(0);expect(check(s).pendingLiquidMl).toBe(pending(s).totalMl);expect(s.log.find(e=>e.action==='stirPan').observation).toContain('No distinct pool');
 });
 it('makes equal instantaneous doses identical regardless of the number of pouring actions',()=>{
  const once=R.act(start(),'pour',100),twice=act(start(),[['pour',50],['pour',50]]),many=act(start(),Array(10).fill(['pour',10]));
  for(const s of [twice,many]){compareNear(s.pan,once.pan,['temp','moisture']);compareNear(s.pan.chemistry,once.pan.chemistry,['oilMl','starchG','dispersion']);expect(s.time).toBe(once.time);expect(pending(s)).toEqual(pending(once));}
  const a=R.act(once,'stirPan'),b=R.act(many,'stirPan');compareNear(a.pan.chemistry,b.pan.chemistry,['oilMl','starchG','dispersion']);compareNear(pending(a),pending(b),['savedWaterMl','totalMl']);
 });
 it('gives a larger proportional batch less mixing progress from the same six-second operation',()=>{
  const small=R.act(start(),'pour',100);small.pan.temp=22;const large=copy(small);large.servings=4;large.prep.pasta*=2;large.pan.moisture*=2;large.pan.chemistry.oilMl*=2;large.pan.chemistry.starchG*=2;large.pan.pendingLiquid.savedWaterMl*=2;large.pan.pieces.forEach(p=>p.juice*=2);
  const a=R.act(small,'stirPan'),b=R.act(large,'stirPan');expect(a.time).toBe(b.time);expect(a.pan.temp).toBe(b.pan.temp);expect(R.mixing(large).referenceLoad).toBe(R.mixing(small).referenceLoad);expect(R.mixing(large).load).toBeCloseTo(2*R.mixing(small).load,10);expect(R.mixing(large).effortFactor).toBeCloseTo(R.mixing(small).effortFactor/2,12);
  expect(R.mixing(b).pendingFraction).toBeGreaterThan(R.mixing(a).pendingFraction);expect(b.pan.chemistry.dispersion).toBeLessThan(a.pan.chemistry.dispersion);expect(b.log.at(-1).mixing.effort).toBeCloseTo(a.log.at(-1).mixing.effort/2,12);
 });
 it('does not change relative food load when pressing redistributes existing tomato juice',()=>{
  let s=start();const load=R.mixing(s).load,capacity=R.panThermal(s).effectiveHeatCapacityMl;for(let i=0;i<14;i++)s=act(s,[['crushTomato',i],['crushTomato',i]]);
  expect(R.mixing(s).load).toBeCloseTo(load,10);expect(R.panThermal(s).effectiveHeatCapacityMl).toBeCloseTo(capacity,10);expect(s.pan.temp).toBe(35);expect(s.time).toBe(0);expect(pending(s).tomatoJuiceMl).toBeCloseTo(60,10);
 });
 it('tracks pending water uptake without treating it as mixing or an additional capacity reservoir',()=>{
  const s=R.act(start(),'pour',100);s.pan.temp=60;const fraction=R.mixing(s).pendingFraction,n=R.act(s,'advance',30);
  expect(n.pan.absorbedWaterMl).toBeGreaterThan(s.pan.absorbedWaterMl);expect(n.pan.evaporatedWaterMl).toBe(0);expect(pending(n).totalMl).toBeLessThan(pending(s).totalMl);expect(R.mixing(n).pendingFraction).toBeCloseTo(fraction,12);expect(R.mixing(n).count).toBe(0);expect(R.mixing(n).load).toBeCloseTo(R.mixing(s).load,10);expect(R.panThermal(n).effectiveHeatCapacityMl).toBeCloseTo(R.panThermal(s).effectiveHeatCapacityMl,10);
 });
 it('removes the phantom pool when added water has evaporated completely',()=>{
  const s=act(R.startRescue('dry',0),[['pour',50],['panHeat',3],['advance',60],['advance',60],['taste']]);
  expect(s.pan.moisture).toBe(0);expect(s.pan.damage).toBeLessThan(1);expect(R.mixing(s).liquidSinceMix).toBe(50);expect(pending(s).totalMl).toBe(0);expect(R.needsMixing(s)).toBe(false);expect(check(s)).toMatchObject({type:'dry',bodyType:'dry',closureSeconds:0,needsMixing:false});expect(check(s).observation).not.toContain('pools');
 });
 it('never credits evaporation or absorption in the per-operation incorporation receipt',()=>{
  const s=R.act(R.startRescue('starchy',0),'pourPlain',100),before=JSON.stringify(s),n=R.act(s,'stirPan'),receipt=n.log.at(-1).mixing;
  expect(receipt.model).toBe(2);expect(receipt.effort).toBeGreaterThan(0);expect(receipt.pendingBefore).toEqual(pending(s));expect(receipt.pendingAfter).toEqual(pending(n));expect(receipt.incorporated.totalMl).toBeGreaterThan(0);expect(receipt.incorporated.totalMl).toBeLessThan(receipt.pendingBefore.totalMl-receipt.pendingAfter.totalMl);expect(n.pan.absorbedWaterMl+n.pan.evaporatedWaterMl).toBeGreaterThan(0);expect(JSON.stringify(s)).toBe(before);
  expect(receipt.incorporated.plainWaterMl).toBe(receipt.incorporated.totalMl);expect(receipt.incorporated.savedWaterMl).toBe(0);expect(receipt.incorporated.tomatoJuiceMl).toBe(0);
 });
 it('adds a later pour to the actual remaining tags without erasing previous partial progress',()=>{
  const s=act(start(),[['pour',100],['stirPan']]),n=R.act(s,'pour',20);expect(pending(n).savedWaterMl).toBeCloseTo(pending(s).savedWaterMl+20,12);expect(R.mixing(n).waterSinceMix).toBe(20);expect(R.needsMixing(n)).toBe(true);
 });
 it('keeps accessible button, gesture and ordinary stir effects equivalent',()=>{
  const s=R.act(start(),'pour',100),a=R.act(s,'stirSweep','button'),b=R.act(s,'stirSweep','gesture','scene-stir'),c=R.act(s,'stirPan');
  expect(a.pan).toEqual(b.pan);expect(a.pan).toEqual(c.pan);expect(a.pot).toEqual(b.pot);expect(a.log.at(-1).mixing).toEqual(b.log.at(-1).mixing);expect(a.log.at(-1).mixing).toEqual(c.log.at(-1).mixing);expect(a.time).toBe(6);
 });
 it('rejects a mix without enough remaining simulation time and gives it no partial credit',()=>{
  const s=R.act(start(),'pour',100);s.time=3595;const n=R.act(s,'stirPan');expect(n.log.at(-1).accepted).toBe(false);expect(n.pan).toEqual(s.pan);expect(n.pot).toEqual(s.pot);expect(n.time).toBe(s.time);expect(n.log.at(-1)).not.toHaveProperty('mixing');expect(n.log.at(-1)).not.toHaveProperty('durationSeconds');
 });
 it('does not generate progress when checking, changing a dial, or rejecting a pour',()=>{
  const s=R.act(start(),'pour',100),before=copy(s.pan.pendingLiquid),n=act(s,[['taste'],['panHeat',3],['pour',100]]);expect(n.pan.pendingLiquid).toEqual(before);expect(n.time).toBe(0);expect(n.log.at(-1).accepted).toBe(false);
 });
 it('keeps irreversible damage separate while pending liquid shrinks during real folds',()=>{
  let s=act(start(),[['panHeat',3]]);for(let i=0;i<8;i++)s=R.act(s,'advance',30);s=act(s,[['panHeat',0],['pour',100],['stirPan'],['taste']]);const damage=s.pan.damage;
  expect(damage).toBeGreaterThan(1);expect(check(s)).toMatchObject({type:'scorched',scorched:true});s=completeFolds(s);expect(R.needsMixing(s)).toBe(false);expect(s.pan.damage).toBeGreaterThanOrEqual(damage);expect(check(s).type).toBe('scorched');expect(R.criteria(s)[0].met).toBe(false);
 });
 it('records independent remaining amounts at each check and reconstructs them from accepted actions',()=>{
  const a=act(start(),[['taste'],['pour',100],['stirPan'],['taste']]),first=copy(check(a)),b=act(a,[['stirPan'],['taste'],['plate']]),done=R.submit({...b,answers:[1,null]});
  expect(R.inspections(done).find(x=>x.time===6)).toEqual(first);expect(check(done).pendingLiquidMl).toBe(pending(done).totalMl);const raw=copy(done);raw.pan.pendingLiquid.savedWaterMl=999;raw.log.find(e=>e.mixing).mixing.pendingAfter.savedWaterMl=999;raw.log.find(e=>e.inspection?.time===6).inspection.pendingLiquidMl=999;
  expect(R.restore(raw)).toEqual(done);expect(R.replay(done,done.log.length).state.pan).toEqual(done.pan);const detached=R.inspections(done);detached[1].pendingLiquidMl=999;expect(R.inspections(done)[1]).toEqual(first);
 });
 it('can need a fresh dilution check after time spent completing a partial fold',()=>{
  const a=act(R.startRescue('starchy',0),[['taste'],['pourPlain',50],['stirPan'],['taste']]),b=act(a,[['stirPan'],['taste']]);
  expect(check(a).bodyType).toBe('unmixed');expect(check(b).bodyType).toBe('thick');expect(R.needsMixing(b)).toBe(false);expect(b.pan.chemistry.starchG).toBe(3);expect(b.pan.moisture).toBeLessThan(a.pan.moisture);
  const repaired=act(b,[['pourPlain',10],['stirPan'],['taste']]);expect(check(repaired).type).toBe('coating');expect(R.dilutionCheck(repaired).met).toBe(true);expect(R.needsMixing(repaired)).toBe(false);
 });
 it('preserves model1 and absent mixing exactly against the frozen runtime',()=>{
  for(const version of [1,undefined]){
   let a=R.startRescue('holding',0),b=oldR.startRescue('holding',0);if(version===undefined){delete a.mixingModel;delete b.mixingModel;}else{a.mixingModel=version;b.mixingModel=version;}delete a.pan.pendingLiquid;
   const steps=[['taste'],['pour',50],['stirPan'],['advance',30],['taste'],['plate']];a=act(a,steps);b=act(b,steps,oldR);expect(a).toEqual(b);expect(R.evidence(a)).toEqual(oldR.evidence(b));expect(R.restore(a)).toEqual(a);expect(R.mixing(a)).not.toHaveProperty('pending');
  }
 });
 it('preserves the old phantom-pool record rather than rewriting a historical observation',()=>{
  const s=act(R.restore({...R.startRescue('dry',0),mixingModel:1}),[['pour',50],['panHeat',3],['advance',60],['advance',60],['taste']]);expect(s.pan.moisture).toBe(0);expect(check(s).type).toBe('unmixed');expect(R.restore(s)).toEqual(s);expect(check(s)).not.toHaveProperty('mixingModel');
 });
 it('validates the new protocol and preserves explicit1 or absent mixing during restoration',()=>{
  for(const value of [null,0,3,'2',true])expect(R.restore({...start(),mixingModel:value})).toBeNull();for(const value of [1,2])expect(R.restore({...start(),mixingModel:value}).mixingModel).toBe(value);
  const raw=R.start();delete raw.sauceModel;delete raw.sauceObservationModel;delete raw.thermalModel;expect(R.restore(raw)).toBeNull();delete raw.mixingModel;expect(R.restore(raw)).not.toBeNull();
 });
 for(const id of ['dry','watery','separated','holding','starchy','fragile','cooled'])it('keeps '+id+' achievable by inspecting and completing any remaining fold',()=>{
  const source=oldFixtures.find(f=>f.label===id+'-completed').state;let s=R.startRescue(id,source.rescue.prediction,source.mode);
  for(const e of source.log){s=R.act(s,e.action,e.value,e.interaction);if(e.action==='taste'&&check(s)?.bodyType==='unmixed')s=completeFolds(s);if(e.action==='taste'&&id==='starchy'&&R.mixing(s).count>0&&check(s)?.bodyType==='thick')s=completeFolds(act(s,[['pourPlain',10],['stirPan'],['taste']]));}
  s=R.submit({...s,answers:source.answers});expect(R.criteria(s).every(g=>g.met)).toBe(true);expect(R.evidence(s).status).toBe('Rescue demonstrated independently');expect(R.restore(s)).toEqual(s);
 });
});

