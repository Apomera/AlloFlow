import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),R=require('../stem_lab/kitchen_studio/recipe_lab_engine.js'),C=require('../stem_lab/kitchen_studio/recipe_lab_sauce_changes.js');
const act=(s,steps)=>steps.reduce((state,[action,value])=>R.act(state,action,value),s);
const observe=(steps,id='starchy')=>act(R.startRescue(id,0,'practice'),[['taste'],...steps,['taste']]);
const copy=s=>structuredClone(s);

describe('Recorded liquid heat-transfer evidence',()=>{
 it.each([['water',undefined,50],['pour',30,30],['pourPlain',30,30]])('retains the immediate %s transfer before later folding and warming', (action,value,dose)=>{
  const s=observe([[action,value],['stirSweep','button'],['panHeat',1],['advance',15]]),result=C.betweenChecks(s),index=s.log.findIndex(e=>e.action===action),entry=s.log[index];
  expect(result.liquidTransfers.complete).toBe(true);expect(result.liquidTransfers.events).toHaveLength(1);
  expect(result.liquidTransfers.events[0]).toEqual({index,time:entry.time,from:entry.transfer.from,amountMl:dose,starchG:entry.transfer.starchG,
   sourceTemperature:entry.transfer.thermal.sourceTemperature,beforeTemperature:entry.transfer.thermal.beforeTemperature,afterTemperature:entry.transfer.thermal.afterTemperature,
   heatCapacityBeforeMl:entry.transfer.thermal.heatCapacityBeforeMl,heatCapacityAfterMl:entry.transfer.thermal.heatCapacityAfterMl,complete:true});
  expect(result.liquidTransfers.events[0].afterTemperature).not.toBe(result.temperature.afterC);
 });
 it('uses selected log boundaries, excluding rejected additions, internal juice and later pours',()=>{
  const s=act(R.startRescue('cooled',0,'practice'),[['pour',10],['taste'],['pour',1000],['crushTomato',0],['pour',30],['taste'],['pour',20],['taste']]);
  const checks=C.checks(s),result=C.betweenChecks(s,{fromIndex:checks[0].index,toIndex:checks[1].index});
  expect(result.liquidTransfers.events.map(e=>[e.index,e.amountMl])).toEqual([[s.log.findIndex(e=>e.action==='pour'&&e.value===30),30]]);
  expect(result.water.juiceAddedMl).toBeGreaterThan(0);expect(result.newerChecks).toBe(true);
 });
 it('leaves missing receipt values unknown even when current pan data are available',()=>{
  const s=observe([['pour',30]]);delete s.log.find(e=>e.action==='pour').transfer;s.pan.temp=99;s.pot.reserveTemp=95;
  const result=C.betweenChecks(s),event=result.liquidTransfers.events[0];
  expect(event).toMatchObject({amountMl:30,from:null,starchG:null,sourceTemperature:null,beforeTemperature:null,afterTemperature:null,heatCapacityBeforeMl:null,heatCapacityAfterMl:null,complete:false});
  expect(result.liquidTransfers.complete).toBe(false);expect(result.notes.join(' ')).toContain('liquid-addition temperature records are missing or inconsistent');
 });
 it.each([
  ['temperature string',e=>e.transfer.thermal.sourceTemperature='22','sourceTemperature'],
  ['nonfinite temperature',e=>e.transfer.thermal.afterTemperature=Infinity,'afterTemperature'],
  ['below absolute zero',e=>{e.transfer.sourceTemperature=-300;e.transfer.thermal.sourceTemperature=-300;},'sourceTemperature'],
  ['negative starch',e=>e.transfer.starchG=-1,'starchG'],
  ['zero capacity',e=>e.transfer.thermal.heatCapacityBeforeMl=0,'heatCapacityBeforeMl'],
  ['negative capacity',e=>e.transfer.thermal.heatCapacityAfterMl=-1,'heatCapacityAfterMl'],
  ['negative action dose',e=>e.value=-1,'amountMl'],
  ['unknown time',e=>delete e.time,'time']
 ])('marks %s as unknown',(_name,mutate,key)=>{
  const s=observe([['pour',30]]);mutate(s.log.find(e=>e.action==='pour'));const result=C.betweenChecks(s);
  expect(result.liquidTransfers.events[0][key]).toBeNull();expect(result.liquidTransfers.complete).toBe(false);
 });
 it.each([
  ['receipt dose',e=>e.transfer.amount=40],['thermal dose',e=>e.transfer.thermal.waterMl=40],
  ['source temperature',e=>e.transfer.sourceTemperature=10],['destination',e=>e.transfer.to='pot'],
  ['impossible immediate temperature',e=>e.transfer.thermal.afterTemperature=999],
  ['nonconserved capacity',e=>e.transfer.thermal.heatCapacityAfterMl=1]
 ])('flags inconsistent %s without claiming a complete receipt',(_name,mutate)=>{
  const s=observe([['pour',30]]);mutate(s.log.find(e=>e.action==='pour'));expect(C.betweenChecks(s).liquidTransfers.complete).toBe(false);
 });
 it('does not invent an external transfer for internal juice or warming alone',()=>{
  const result=C.betweenChecks(observe([['crushTomato',0],['panHeat',1],['advance',15]],'cooled'));
  expect(result.liquidTransfers).toEqual({events:[],complete:true});expect(result.notes.join(' ')).not.toContain('liquid-addition temperature records');
 });
 it('preserves the complete old output shape for thermal2, thermal1 and absent versions',()=>{
  const modern=observe([['pour',30]]),base=C.betweenChecks(modern);delete base.liquidTransfers;
  for(const model of [2,1,undefined]){const old=copy(modern);if(model===undefined)delete old.thermalModel;else old.thermalModel=model;expect(C.betweenChecks(old)).toEqual(base);}
 });
 it('keeps pinned receipts read-only and independent from later live state and returned objects',()=>{
  const s=observe([['pour',30],['stirSweep','button']]),before=JSON.stringify(s),checks=C.checks(s),selection={fromIndex:checks[0].index,toIndex:checks[1].index};
  const result=C.betweenChecks(s,selection),later=act(s,[['pour',20],['panHeat',3],['advance',15],['taste']]);
  expect(C.betweenChecks(later,selection).liquidTransfers).toEqual(result.liquidTransfers);expect(JSON.stringify(s)).toBe(before);
  result.liquidTransfers.events[0].afterTemperature=0;expect(C.betweenChecks(s,selection).liquidTransfers.events[0].afterTemperature).not.toBe(0);
 });
 it('restores and replays the recorded receipts exactly',()=>{
  const s=R.submit({...act(observe([['pourPlain',50],['stirSweep','button']]),[['plate']]),answers:[0,null]}),expected=C.betweenChecks(s);
  expect(C.betweenChecks(R.restore(s))).toEqual(expected);expect(C.betweenChecks(R.replay(s,s.log.length).state)).toEqual(expected);
 });
});
