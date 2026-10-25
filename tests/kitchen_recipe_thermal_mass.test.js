import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js');
const oldR=require('./fixtures/regression/kitchen-sauce-thermal-mass-2026-10-18/baseline-runtime/recipe_lab_engine.js');
const fixtures=require('./helpers/reference_fixture.cjs')('kitchen-sauce-thermal-mass-2026-10-18/thermal2-release-fixtures.json.gz');
const cook=require('../dev-tools/kitchen_recipe_fixture.cjs');
const clone=s=>JSON.parse(JSON.stringify(s));
const act=(s,steps,engine=R)=>steps.reduce((q,[a,v])=>engine.act(q,a,v),s);
const C=s=>R.panThermal(s).effectiveHeatCapacityMl;
const start=()=>R.startRescue('cooled',0,'demonstrate');
const heat=(s,h,seconds)=>act(s,[['panHeat',h],['advance',seconds]]);
const water=s=>s.pan.moisture+s.pan.absorbedWaterMl+s.pan.evaporatedWaterMl+R.tomatoHandling(s).juiceRemaining;
function scaleBatch(s,factor){const q=clone(s);q.servings*=factor;q.prep.pasta*=factor;q.pan.moisture*=factor;q.pan.chemistry.oilMl*=factor;q.pan.chemistry.starchG*=factor;q.pan.pieces.forEach(p=>p.juice*=factor);return q;}
function pressAll(s){for(let i=0;i<14;i++)s=act(s,[['crushTomato',i],['crushTomato',i]]);return s;}

describe('Conserved pan heat capacity and batch-sensitive thermal model 3',()=>{
 it('starts new cooks on model3 with detached, explicitly illustrative capacity evidence',()=>{
  for(const s of [R.start('mushroom',2),R.start('tomato',4),...R.rescues.map(r=>R.startRescue(r.id,0))]){
   expect(s.thermalModel).toBe(3);expect(R.evidence(s).thermalModel).toBe(3);expect(R.evidence(s).panThermal).toEqual(R.panThermal(s));
   const capacity=C(s),copy=R.panThermal(s);copy.effectiveHeatCapacityMl=0;expect(C(s)).toBe(capacity);
  }
  expect(R.panThermal(start())).toMatchObject({model:3,active:true,effectiveHeatCapacityMl:474.75,referenceHeatCapacityMl:534.75,produceCapacityMl:180,oilCapacityMl:6.75,pastaCapacityMl:88,panCapacityMl:80});
 });
 it('keeps one two-serving reference independent of actual batch size and combination',()=>{
  const s=start(),large=scaleBatch(s,2),withoutPasta=clone(s);withoutPasta.pan.combined=false;
  expect(R.panThermal(large).referenceHeatCapacityMl).toBe(R.panThermal(s).referenceHeatCapacityMl);
  expect(R.panThermal(withoutPasta).referenceHeatCapacityMl).toBe(R.panThermal(s).referenceHeatCapacityMl);
  expect(C(s)-C(withoutPasta)).toBe(160*.55);expect(C(large)-80).toBeCloseTo((C(s)-80)*2,10);
  expect(R.panThermal(large).rateFactor).toBeLessThan(R.panThermal(s).rateFactor);
 });
 it('warms and cools larger amounts more slowly at the same initial temperature and setting',()=>{
  const s=start(),large=scaleBatch(s,2);
  expect(heat(s,2,30).pan.temp).toBeGreaterThan(heat(large,2,30).pan.temp);
  expect(R.act(s,'advance',30).pan.temp).toBeLessThan(R.act(large,'advance',30).pan.temp);
  const wetter=clone(s);wetter.pan.moisture+=100;
  expect(heat(s,2,30).pan.temp).toBeGreaterThan(heat(wetter,2,30).pan.temp);
  expect(R.act(s,'advance',30).pan.temp).toBeLessThan(R.act(wetter,'advance',30).pan.temp);
 });
 it('changes the old identical-water warming result without changing old model2',()=>{
  const dry=start(),wet=clone(dry);wet.pan.moisture+=100;
  const oldDry=heat({...dry,thermalModel:2},2,30),oldWet=heat({...wet,thermalModel:2},2,30);
  expect(oldDry.pan.temp).toBe(65.4593775766987);expect(oldWet.pan.temp).toBe(oldDry.pan.temp);
  expect(heat(dry,2,30).pan.temp).toBeGreaterThan(heat(wet,2,30).pan.temp);
 });
 it('presses release existing warm juice without changing temperature, elapsed time, or heat capacity',()=>{
  const s=start(),pressed=pressAll(s);
  expect(pressed.pan.temp).toBe(s.pan.temp);expect(pressed.time).toBe(s.time);expect(C(pressed)).toBeCloseTo(C(s),10);
  expect(R.panThermal(pressed).retainedJuiceMl).toBe(0);expect(pressed.pan.moisture-s.pan.moisture).toBeCloseTo(60,10);expect(water(pressed)).toBeCloseTo(water(s),10);
  expect(R.act(pressed,'crushTomato',0)).toBe(pressed);
 });
 it('preserves capacity when free water is absorbed, without inventing water or losing starch and oil',()=>{
  const s=start();s.pan.temp=60;const n=R.act(s,'advance',30);
  expect(n.pan.absorbedWaterMl).toBeGreaterThan(0);expect(n.pan.evaporatedWaterMl).toBe(0);expect(C(n)).toBeCloseTo(C(s),10);
  expect(n.pan.moisture+n.pan.absorbedWaterMl).toBeCloseTo(s.pan.moisture,10);expect(n.pan.chemistry.starchG).toBe(s.pan.chemistry.starchG);expect(n.pan.chemistry.oilMl).toBe(s.pan.chemistry.oilMl);
 });
 it('removes heat capacity only for the water that actually evaporates',()=>{
  const s=R.startRescue('holding',0),n=R.act(s,'advance',30),lost=n.pan.evaporatedWaterMl-s.pan.evaporatedWaterMl;
  expect(lost).toBeGreaterThan(0);expect(C(s)-C(n)).toBeCloseTo(lost,10);expect(n.pan.absorbedWaterMl).toBeGreaterThan(0);
  expect(water(n)).toBeCloseTo(water(s),10);expect(n.pan.chemistry.starchG).toBe(s.pan.chemistry.starchG);expect(n.pan.chemistry.oilMl).toBe(s.pan.chemistry.oilMl);
 });
 it.each([['cooled','pour',30],['holding','water',undefined],['starchy','pourPlain',50],['starchy','pour',50]])('weights actual source temperature for %s %s', (id,action,amount)=>{
  const s=R.startRescue(id,0),n=R.act(s,action,amount),moved=n.pan.moisture-s.pan.moisture,source=action==='pourPlain'?s.pot.plainTemp:s.pot.reserveTemp;
  expect(n.pan.temp).toBeCloseTo((s.pan.temp*C(s)+source*moved)/(C(s)+moved),12);expect(C(n)-C(s)).toBeCloseTo(moved,10);
  expect(n.pan.temp).toBeGreaterThanOrEqual(Math.min(s.pan.temp,source));expect(n.pan.temp).toBeLessThanOrEqual(Math.max(s.pan.temp,source));
  expect(n.time).toBe(s.time);expect(n.log.at(-1).transfer).toMatchObject({to:'sauce',amount:moved,sourceTemperature:source,thermal:{sourceTemperature:source,beforeTemperature:s.pan.temp,afterTemperature:n.pan.temp,waterMl:moved,heatCapacityBeforeMl:C(s),heatCapacityAfterMl:C(n)}});
  expect(n.log.at(-1).transfer.starchG).toBe(n.pan.chemistry.starchG-s.pan.chemistry.starchG);
 });
 it('uses the source liquid after it cools in its own jug instead of a fixed hot-water assumption',()=>{
  const s=start(),held=R.act(s,'advance',60),a=R.act(s,'pour',30),b=R.act(held,'pour',30);
  expect(b.log.at(-1).transfer.sourceTemperature).toBeLessThan(a.log.at(-1).transfer.sourceTemperature);
  expect(b.log.at(-1).transfer.sourceTemperature).toBe(held.pot.reserveTemp);
  expect(b.pan.temp).toBeCloseTo((held.pan.temp*C(held)+held.pot.reserveTemp*30)/(C(held)+30),12);
 });
 it('keeps thermal mixing independent of how one liquid amount is split into instantaneous pours',()=>{
  const s=start(),once=R.act(s,'pour',50),twice=act(s,[['pour',20],['pour',30]]);
  expect(twice.pan.temp).toBeCloseTo(once.pan.temp,12);expect(C(twice)).toBeCloseTo(C(once),10);expect(twice.pot.reserve).toBe(once.pot.reserve);
 });
 it('gives the same pour temperature before or after pressing the existing tomato juice',()=>{
  const s=start(),pressThenPour=R.act(pressAll(s),'pour',50),pourThenPress=pressAll(R.act(s,'pour',50));
  expect(pressThenPour.pan.temp).toBeCloseTo(pourThenPress.pan.temp,12);expect(C(pressThenPour)).toBeCloseTo(C(pourThenPress),10);
 });
 it('adds pasta capacity without changing the fixed reference and applies it during the completed combine',()=>{
  const s=start();s.pan.combined=false;s.pan.heat=2;const before=C(s),n=R.act(s,'combine');
  expect(n.log.at(-1).accepted).toBe(true);expect(n.time).toBe(6);expect(C(n)).toBeCloseTo(before+s.prep.pasta*.55-n.pan.evaporatedWaterMl,10);
  expect(R.panThermal(n).referenceHeatCapacityMl).toBe(R.panThermal(s).referenceHeatCapacityMl);
  expect(n.pan.temp).toBeLessThan(R.act(s,'advance',6).pan.temp);
 });
 it('leaves empty and oil-only thermal rates unchanged while retaining mass for dry food',()=>{
  const empty=R.act(R.start(),'panHeat',3),oil=R.act(empty,'oil');
  for(const s of [empty,oil]){expect(R.panThermal(s).active).toBe(false);expect(R.panThermal(s).rateFactor).toBe(1);expect(R.act(s,'advance',30).pan).toEqual(R.act({...s,thermalModel:2},'advance',30).pan);}
  const dry=R.startRescue('dry',0);expect(R.panThermal(dry).active).toBe(true);expect(R.panThermal(dry).rateFactor).not.toBe(1);
  expect(heat(dry,3,6).pan.temp).not.toBe(heat({...dry,thermalModel:2},3,6).pan.temp);
 });
 it('keeps high/medium/low ordering and applies the same elapsed physics to accessible mixing methods',()=>{
  const low=heat(start(),1,30),medium=heat(start(),2,30),high=heat(start(),3,30);expect(low.pan.temp).toBeLessThan(medium.pan.temp);expect(medium.pan.temp).toBeLessThan(high.pan.temp);
  const s=R.act(start(),'panHeat',2),button=R.act(s,'stirSweep','button'),gesture=R.act(s,'stirSweep','gesture'),waited=R.act(s,'advance',6);
  expect(button.pan).toEqual(gesture.pan);expect(button.pan.temp).toBe(waited.pan.temp);expect(button.pan.moisture).toBe(waited.pan.moisture);expect(button.time).toBe(6);
 });
 it('keeps trivet cooling equivalent to switched-off cooling with the same contents',()=>{
  const s=heat(start(),3,30),off=act(s,[['panHeat',0],['advance',30]]),trivet=act(s,[['panPlace','trivet'],['advance',30]]);
  for(const key of ['temp','moisture','absorbedWaterMl','evaporatedWaterMl'])expect(trivet.pan[key]).toBe(off.pan[key]);expect(trivet.pan.chemistry).toEqual(off.pan.chemistry);expect(C(trivet)).toBe(C(off));
 });
 it('keeps equivalent clock partitions deterministic and conserves water during changing capacity',()=>{
  const s=R.act(start(),'panHeat',3),whole=R.act(s,'advance',60),parts=act(s,Array(4).fill(['advance',15]));
  expect(parts.pan).toEqual(whole.pan);expect(parts.pot).toEqual(whole.pot);expect(water(whole)).toBeCloseTo(water(s),10);
 });
 it('records detached capacity and mass-rate factors with each selected sauce check',()=>{
  const s=R.act(start(),'taste'),first=R.inspections(s)[0],next=act(s,[['pour',30],['stirPan'],['taste']]);
  expect(first.chemistry).toMatchObject({thermalModel:3,effectiveHeatCapacityMl:C(s),thermalRateFactor:R.panThermal(s).rateFactor});
  expect(R.inspections(next)[0]).toEqual(first);expect(R.inspections(next).at(-1).chemistry.effectiveHeatCapacityMl).toBe(C(next));
  const copy=R.inspections(next);copy[0].chemistry.effectiveHeatCapacityMl=999;expect(R.inspections(next)[0]).toEqual(first);
 });
 it('reconstructs model3 transfer and inspection evidence and ignores forged cached values',()=>{
  const s=R.submit({...act(start(),[['taste'],['pour',30],['stirPan'],['taste'],['plate']]),answers:[1,null]}),raw=clone(s);raw.pan.temp=999;raw.log[1].transfer.thermal.afterTemperature=999;raw.log[0].inspection.chemistry.effectiveHeatCapacityMl=999;
  expect(R.restore(raw)).toEqual(s);expect(R.replay(s,s.log.length).state.pan).toEqual(s.pan);
 });
 it('preserves thermal2, thermal1 and absent-version states, evidence and records exactly',()=>{
  for(const version of [2,1,undefined]){
   let prior=oldR.startRescue('holding',0),current=R.restore({...R.startRescue('holding',0),mixingModel:1});if(version===undefined){delete prior.thermalModel;delete current.thermalModel;}else{prior.thermalModel=version;current.thermalModel=version;}
   const steps=[['taste'],['advance',30],['pour',50],['stirPan'],['taste'],['plate']];prior=act(prior,steps,oldR);current=act(current,steps);
   expect(current).toEqual(prior);expect(R.evidence(current)).toEqual(oldR.evidence(prior));expect(R.restore(current)).toEqual(current);expect(R.panThermal(current)).toBeNull();expect(R.sauceChemistry(current)).not.toHaveProperty('effectiveHeatCapacityMl');
  }
 });
 it('validates new thermal3 source composition without tightening historical protocols',()=>{
  for(const version of [null,0,4,'3',true])expect(R.restore({...start(),thermalModel:version})).toBeNull();
  const unsupported=R.start();delete unsupported.sauceModel;delete unsupported.sauceObservationModel;delete unsupported.mixingModel;
  expect(R.restore(unsupported)).toBeNull();for(const version of [1,2])expect(R.restore({...unsupported,thermalModel:version})).not.toBeNull();
  for(const id of ['cooled','fragile'])for(const version of [1,2,3])expect(R.restore({...R.startRescue(id,0),thermalModel:version}).thermalModel).toBe(version);
 });
 for(const id of ['dry','watery','separated','holding','starchy','fragile','cooled'])it('keeps the '+id+' rescue achievable with recorded checks and real elapsed actions',()=>{
  const fixture=fixtures.find(f=>f.label===id+'-completed'),source=fixture.state;
  let s=R.startRescue(id,source.rescue.prediction,source.mode);for(const e of source.log){
   s=R.act(s,e.action,e.value,e.interaction);
   if(e.action==='taste'){
    for(let fold=0;fold<8&&R.needsMixing(s);fold++)s=act(s,[['stirPan'],['taste']]);
    if(id==='starchy'&&R.mixing(s).count>0&&R.inspections(s).at(-1).bodyType==='thick'){
     s=R.act(s,'pourPlain',10);for(let fold=0;fold<8&&R.needsMixing(s);fold++)s=act(s,[['stirPan'],['taste']]);
    }
   }
  }
  s=R.submit({...s,answers:source.answers});expect(R.criteria(s).every(g=>g.met)).toBe(true);expect(R.evidence(s).status).toBe('Rescue demonstrated independently');expect(R.restore(s)).toEqual(s);
 });
 for(const id of ['mushroom','tomato'])for(const servings of [2,4])it('keeps the observed '+id+' recipe for '+servings+' servings achievable',()=>{
  const s=cook(id,servings).state;expect(R.criteria(s).every(g=>g.met)).toBe(true);expect(R.evidence(s).corrections).toBe(0);expect(R.restore(s)).toEqual(s);
 });
});
