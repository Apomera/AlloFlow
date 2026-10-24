// @vitest-environment jsdom
import {beforeEach,afterEach,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url),R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js'),S=require('../stem_lab/kitchen_studio/recipe_lab_sauce_check.js'),Changes=require('../stem_lab/kitchen_studio/recipe_lab_sauce_changes.js');
const $=id=>document.getElementById(id),round=n=>Number(n.toFixed(1));
let state,ui;
function render(){ui.render(state,false,true);}
function pair(id='cooled',mode='practice',thermalModel=3){let s=R.startRescue(id,id==='starchy'?0:1,mode);if(thermalModel!==3)s=R.restore({...s,thermalModel});s=R.act(s,'taste');s=R.act(s,id==='starchy'?'pourPlain':'pour',50);return R.act(R.act(s,'stirSweep','button'),'taste');}
function checkRecords(){return state.log.filter(e=>e.accepted&&e.inspection&&e.inspection.kind==='sauce').map(e=>e.inspection);}
function receiptRows(){return [...document.querySelectorAll('.sauce-liquid-receipt dl>div')].map(row=>row.textContent);}
beforeEach(()=>{
 document.body.innerHTML='<div id="host"></div>';window.KitchenRecipes=R;window.KitchenSauceCheck=S;window.KitchenSauceChanges=Changes;
 vi.spyOn(window,'requestAnimationFrame').mockImplementation(()=>1);vi.spyOn(window,'cancelAnimationFrame').mockImplementation(()=>{});Object.defineProperty(window,'matchMedia',{configurable:true,value:vi.fn(()=>({matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()}))});Object.defineProperty(document,'hidden',{configurable:true,value:false});
 window.eval(readFileSync('stem_lab/kitchen_studio/recipe_lab_sauce_replay.js','utf8'));ui=window.KitchenSauceReplay.mount({container:$('host')});state=pair();
});
afterEach(()=>{ui.dispose();vi.restoreAllMocks();document.body.replaceChildren();delete window.KitchenSauceChanges;});

describe('Recorded heat capacity and immediate liquid-transfer receipts',()=>{
 it('displays selected-check capacity and mass multiplier with illustrative units',()=>{
  const before=JSON.stringify(state),[a,b]=checkRecords().map(r=>r.chemistry);render();expect(a.thermalModel).toBe(3);const rows=$('sauceChangesThermalContext').querySelectorAll('tbody tr');expect(rows[0].textContent).toContain(String(round(a.effectiveHeatCapacityMl)));expect(rows[0].textContent).toContain(String(round(b.effectiveHeatCapacityMl)));expect(rows[1].textContent).toContain('×');expect($('sauceChangesThermalHelp').textContent).toContain('not the liquid volume');expect($('sauceChangesThermalHelp').textContent).toContain('burner setting and pan width');expect(JSON.stringify(state)).toBe(before);
 });
 it.each(['cooled','starchy'])('shows the immediate %s pour temperatures before the later fold changes them',id=>{
  state=pair(id);const event=Changes.betweenChecks(state).liquidTransfers.events[0],later=checkRecords()[1].chemistry;render();expect(document.querySelectorAll('.sauce-liquid-receipt')).toHaveLength(1);expect(receiptRows()[0]).toContain('50 mL');expect(receiptRows()[1]).toContain(round(event.sourceTemperature)+' °C');expect(receiptRows()[2]).toContain(round(event.beforeTemperature)+' °C → '+round(event.afterTemperature)+' °C');expect(receiptRows()[3]).toContain(round(event.heatCapacityBeforeMl)+' → '+round(event.heatCapacityAfterMl)+' water-equivalent mL');expect(event.afterTemperature).not.toBeCloseTo(later.temperature,1);expect($('sauceLiquidTransferHelp').textContent).toContain('before later folding');expect(document.querySelector('.sauce-liquid-receipt').dataset.complete).toBe('true');
  if(id==='cooled')expect(event.afterTemperature).toBeGreaterThan(event.beforeTemperature);else expect(event.afterTemperature).toBeLessThan(event.beforeTemperature);
 });
 it('keeps thermal context and receipts pinned to selected records after live heat and later additions',()=>{
  render();const checks=Changes.checks(state);$('sauceReplayLater').value=String(checks[1].index);$('sauceReplayLater').dispatchEvent(new Event('change',{bubbles:true}));const context=$('sauceChangesThermalContext').outerHTML,receipts=$('sauceLiquidTransferReceipts').outerHTML;state=R.act(R.act(R.act(R.act(state,'panHeat',3),'advance',30),'pour',30),'taste');state.pot.reserveTemp=22;const before=JSON.stringify(state);render();expect($('sauceChangesThermalContext').outerHTML).toBe(context);expect($('sauceLiquidTransferReceipts').outerHTML).toBe(receipts);expect(JSON.stringify(state)).toBe(before);
 });
 it('shows unknown capacity fields without substituting the current pan model',()=>{
  delete checkRecords()[0].chemistry.effectiveHeatCapacityMl;delete checkRecords()[1].chemistry.thermalRateFactor;render();expect($('sauceChangesThermalContext').textContent.match(/Not recorded/g)).toHaveLength(2);expect($('sauceChangesThermalContext').textContent).not.toMatch(/NaN|undefined/);
 });
 it('shows incomplete pour evidence without substituting the later check temperature',()=>{
  const event=state.log.find(e=>e.action==='pour');delete event.transfer.thermal.afterTemperature;delete event.transfer.thermal.heatCapacityAfterMl;render();expect(document.querySelector('.sauce-liquid-receipt').dataset.complete).toBe('false');expect(receiptRows()[2]).toContain('→ Not recorded');expect(receiptRows()[3]).toContain('→ Not recorded');expect($('sauceLiquidTransferReceipts').textContent).toContain('not inferred from a later check');
 });
 it('distinguishes an interval with no liquid additions from missing receipts',()=>{
  state=R.act(R.startRescue('cooled',1),'taste');state=R.act(R.act(state,'advance',30),'taste');render();expect($('sauceChangesThermalContext')).not.toBeNull();expect(document.querySelectorAll('.sauce-liquid-receipt')).toHaveLength(0);expect($('sauceLiquidTransferReceipts').textContent).toContain('No liquid additions were recorded');expect($('sauceLiquidTransferReceipts').textContent).not.toContain('incomplete');
 });
 it('withholds modeled thermal evidence until a demonstrate cook is submitted',()=>{
  state=pair('cooled','demonstrate');render();expect($('sauceChangesThermalContext')).toBeNull();expect($('sauceLiquidTransferReceipts')).toBeNull();state=R.submit({...R.act(state,'plate'),answers:[1,null]});render();expect($('sauceChangesThermalContext')).not.toBeNull();expect($('sauceLiquidTransferReceipts')).not.toBeNull();
 });
 it('does not add thermal context or receipt layouts to old model-two cooks',()=>{
  state=pair('cooled','practice',2);render();expect(checkRecords()[0].chemistry).not.toHaveProperty('thermalModel');expect($('sauceChangesThermalContext')).toBeNull();expect($('sauceLiquidTransferReceipts')).toBeNull();expect($('sauceChangesContext')).not.toBeNull();
 });
 it('requires both recorded markers even if similarly named values are present',()=>{
  delete checkRecords()[0].chemistry.thermalModel;render();expect($('sauceChangesThermalContext')).toBeNull();expect($('sauceLiquidTransferReceipts')).toBeNull();
 });
});
