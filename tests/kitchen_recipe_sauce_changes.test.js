import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js'),C=require('../stem_lab/kitchen_studio/recipe_lab_sauce_changes.js'),M=require('../stem_lab/kitchen_studio/recipe_lab_compare.js');
const act=(s,steps)=>steps.reduce((state,[action,value])=>R.act(state,action,value),s);
// Original recorded intervals retain their original mixing protocol.
const start=(id='starchy')=>R.restore({...R.startRescue(id,0,'practice'),mixingModel:1});
const observe=(s,steps)=>act(s,[['taste'],...steps,['taste']]);
const finish=s=>R.submit({...act(s,[['taste'],['plate']]),answers:[0,null]});

describe('Recorded sauce change investigation',()=>{
 it('requires two accepted deliberate checks and never samples live chemistry',()=>{
  let s=start();expect(C.betweenChecks(s).status).toBe('needs-checks');
  s=R.act(s,'taste');expect(C.betweenChecks(s).status).toBe('needs-checks');
  s=R.act(s,'pourPlain',50);expect(C.betweenChecks(s)).toEqual({status:'needs-checks',stale:true});
 });
 it('distinguishes equal-volume water choices over matching six-second folds',()=>{
  const plain=C.betweenChecks(observe(start(),[['pourPlain',50],['stirSweep','button']]));
  const saved=C.betweenChecks(observe(start(),[['pour',50],['stirSweep','button']]));
  for(const report of [plain,saved]){expect(report.elapsedSeconds).toBe(6);expect(report.to.index).toBeGreaterThan(report.from.index);expect(report.water.beforeMl).toBe(45);expect(report.water.afterMl).toBeLessThan(95);expect(report.water.afterMl).toBeCloseTo(95-report.water.evaporatedMl-report.water.absorbedMl,10);expect(report.water.balanced).toBe(true);expect(report.actions.folds).toBe(1);}
  expect(plain.starch.changeG).toBe(0);expect(saved.starch.changeG).toBe(2);
  expect(plain.water.plainAddedMl).toBe(50);expect(saved.water.savedAddedMl).toBe(50);
  expect(plain.to.type).toBe('coating');expect(saved.to.type).toBe('thick');
 });
 it('separates evaporation from water retained in pasta and the cooling contribution',()=>{
  const report=C.betweenChecks(observe(start('holding'),[['advance',60],['advance',60]]));
  expect(report.water.evaporatedMl).toBeGreaterThan(0);expect(report.water.absorbedMl).toBeGreaterThan(0);
  expect(report.water.expectedMl).toBeCloseTo(report.water.afterMl,10);expect(report.water.balanced).toBe(true);
  expect(report.starch.changeG).toBe(0);expect(report.temperature.changeC).toBeLessThan(0);expect(report.cooling.change).toBeGreaterThan(0);
  expect(report.notes.join(' ')).toContain('remains in the dish');expect(report.notes.join(' ')).toContain('do not establish');
 });
 it('shows faster evaporation under high heat while keeping the endpoint water equation',()=>{
  const run=heat=>C.betweenChecks(observe(R.act(start('watery'),'panHeat',heat),[['advance',60]]));
  const low=run(1),high=run(3);expect(high.water.evaporatedMl).toBeGreaterThan(low.water.evaporatedMl);
  expect(low.water.balanced).toBe(true);expect(high.water.balanced).toBe(true);
  expect(high.temperature.afterC).toBeGreaterThan(low.temperature.afterC);expect(high.temperature.afterC).toBeLessThanOrEqual(108);
 });
 it('distinguishes mechanical dispersion from concurrent cooling and water losses',()=>{
  const s=act(start('separated'),[['panHeat',0],['advance',60]]),report=C.betweenChecks(observe(s,[['stirSweep','button']]));
  expect(report.dispersion.change).toBeGreaterThan(0);expect(report.water.afterMl).toBeLessThanOrEqual(report.water.beforeMl);expect(report.water.balanced).toBe(true);
  expect(report.starch.changeG).toBe(0);expect(report.temperature.changeC).toBeLessThanOrEqual(0);expect(report.actions.folds).toBe(1);expect(report.mixing.seconds).toBe(6);
 });
 it('accounts for released tomato juice separately from poured water',()=>{
  const report=C.betweenChecks(observe(start('watery'),[['crushTomato',0],['stirSweep','button']]));
  expect(report.water.juiceAddedMl).toBeGreaterThan(0);expect(report.water.savedAddedMl).toBe(0);expect(report.water.plainAddedMl).toBe(0);
  expect(report.water.afterMl-report.water.beforeMl+report.water.evaporatedMl+report.water.absorbedMl).toBeCloseTo(report.water.juiceAddedMl,10);expect(report.water.balanced).toBe(true);
  expect(report.starch.changeG).toBe(0);
 });
 it('keeps a completed pair unchanged when live water, temperature and clock move on',()=>{
  const s=observe(start(),[['pourPlain',50],['stirSweep','button']]),first=C.betweenChecks(s),before=JSON.stringify(s);
  const changed=R.act(R.act(s,'pourPlain',50),'advance',30),next=C.betweenChecks(changed);
  expect(next).toEqual({...first,stale:true});expect(JSON.stringify(s)).toBe(before);
  first.from.label='Changed';first.notes.push('Injected');expect(C.betweenChecks(s).from.label).not.toBe('Changed');
 });
 it('uses the most recent pair, ignores rejected pours and excludes earlier additions',()=>{
  const s=observe(start(),[['pourPlain',100],['pourPlain',100],['pourPlain',50],['stirSweep','button']]);
  const report=C.betweenChecks(act(s,[['pourPlain',10],['pour',50],['stirSweep','button'],['taste']]));
  expect(report.water.plainAddedMl).toBe(0);expect(report.water.savedAddedMl).toBe(50);expect(report.water.balanced).toBe(true);
 });
 it('does not turn absent legacy loss or temperature fields into zeros',()=>{
  const s=observe(start('dry'),[['pour',50],['stirSweep','button']]);
  const legacy=R.restore({...s,sauceModel:1});const report=C.betweenChecks(legacy);
  expect(report.water.beforeMl).toBe(8);expect(report.water.absorbedMl).toBeNull();expect(report.water.evaporatedMl).toBeNull();
  expect(report.temperature.beforeC).toBeNull();expect(report.water.complete).toBe(false);expect(report.water.expectedMl).toBeNull();
  expect(report.notes.join(' ')).toContain('unknown, not zero');
 });
 it('flags an incomplete or inconsistent balance without inventing another cause',()=>{
  const s=observe(start(),[['pourPlain',50],['stirSweep','button']]);
  s.log.at(-1).inspection.chemistry.waterMl+=10;
  const report=C.betweenChecks(s);expect(report.water.complete).toBe(true);expect(report.water.balanced).toBe(false);expect(report.water.residualMl).toBeCloseTo(10,10);
  expect(report.notes.join(' ')).toContain('do not reconcile');
 });
 it('retains unmixed and scorched observations without claiming a completed rescue',()=>{
  const report=C.betweenChecks(observe(start(),[['pourPlain',50]]));
  expect(report.to.type).toBe('unmixed');expect(report.notes.join(' ')).toContain('after folding');
  const hot=R.act(start('dry'),'panHeat',3),burnt=observe(hot,[['advance',60],['advance',60]]),burntReport=C.betweenChecks(burnt);
  expect(burntReport.to.type).toBe('scorched');expect(burntReport.notes.join(' ')).toContain('cannot be undone');
 });
 it('preserves collected changes across restore and completed replay without extra actions',()=>{
  const s=finish(observe(start(),[['pourPlain',50],['stirSweep','button']])),before=JSON.stringify(s);
  expect(C.betweenChecks(R.restore(s))).toEqual(C.betweenChecks(s));
  const replay=R.replay(s,s.log.length);expect(C.betweenChecks(replay.state)).toEqual(C.betweenChecks(s));expect(JSON.stringify(s)).toBe(before);
 });
});

describe('Thermal model comparison boundary',()=>{
 it('keeps legacy and current heat outcomes separate and labels exported comparisons',()=>{
  const modern=finish(observe(start('dry'),[['pour',50],['stirSweep','button']]));
  const raw=JSON.parse(JSON.stringify(modern));delete raw.thermalModel;const legacy=R.restore(raw);
  expect(M.incompatibility(legacy,modern)).toContain('different heat models');expect(M.compare(legacy,modern)).toBeNull();
  const another=R.restore(modern);expect(M.compare(modern,another).thermalModel).toBe(3);expect(M.compare(modern,another).a.thermalModel).toBe(3);
  const earlier=R.restore(legacy);expect(M.compare(legacy,earlier)).not.toHaveProperty('thermalModel');
 });
});
