import {beforeEach,describe,it,expect} from 'vitest';
import {loadTool,resetStemLab} from './helpers/stem_widgets_smoke_harness.js';

let model;
beforeEach(()=>{
  resetStemLab();loadTool('stem_lab/stem_tool_renewables.js','renewablesLab');
  model=window.StemLab.renewablesMicrogridModel;
});
const dark={source:'solarPv',sourceSettings:{irradiance:0},demand:10,batteryUnits:0};
const kinds=event=>event.reasons.map(reason=>reason.kind);

describe('Microgrid operating moments',()=>{
  it('groups coincident outage and demand transitions at their first affected minute',()=>{
    const run=model.simulate({...dark,grid:'outage',outageStart:60,outageMinutes:60});
    const moments=model.moments(run);
    expect(moments.version).toBe(1);expect(moments.duration).toBe(240);
    expect(moments.events.map(event=>event.minute)).toEqual([0,60,120,240]);
    expect(kinds(moments.events[1])).toEqual(['grid','shortfall']);
    expect(moments.events[1].reasons.map(reason=>reason.label)).toEqual(['Grid backup becomes unavailable','Unserved demand begins']);
    expect(moments.events[2].reasons.map(reason=>reason.label)).toEqual(['Grid backup returns','Demand shortfall ends']);
  });

  it('records battery dispatch changes as the outage strategy releases and restores its floor',()=>{
    const run=model.simulate({...dark,grid:'outage',outageStart:60,outageMinutes:60,batteryUnits:1,policy:'backup',reserve:90,battery:{capacity:100,power:50,initial:100,roundtrip:100}});
    const events=model.moments(run).events;
    expect(events.map(event=>event.minute)).toEqual([0,60,120,240]);
    expect(events[1].status).toBe('Serving deficit');expect(events[1].stored).toBe(100);
    expect(events[2].status).toBe('Saving for outage');expect(events[2].stored).toBeCloseTo(90,8);
    expect(kinds(events[1])).toEqual(['battery','grid']);expect(kinds(events[2])).toEqual(['battery','grid']);
    expect(events.some(event=>kinds(event).includes('shortfall'))).toBe(false);
  });

  it('finds partial-minute depletion before the battery becomes empty',()=>{
    const run=model.simulate({...dark,demand:200,batteryUnits:1,battery:{capacity:10,power:200,initial:100,roundtrip:81}});
    const events=model.moments(run).events;
    expect(events.map(event=>event.minute)).toEqual([0,2,3,240]);
    expect(kinds(events[1])).toEqual(['shortfall']);expect(events[1].status).toBe('Serving deficit');
    expect(events[1].stored).toBeGreaterThan(0);
    expect(events[2].status).toBe('Reserve reached');expect(events[2].stored).toBe(0);
  });

  it('finds unused surplus during partial filling before the battery reports full',()=>{
    const run=model.simulate({source:'solarPv',sourceSettings:{irradiance:1000,area:20,efficiency:20,incidence:0},demand:0,battery:{capacity:10,initial:99,power:200,roundtrip:100}});
    const events=model.moments(run).events;
    expect(events.map(event=>event.minute)).toEqual([0,1,2,240]);
    expect(kinds(events[1])).toEqual(['surplus']);expect(events[1].status).toBe('Charging surplus');
    expect(events[2].status).toBe('Battery full');expect(events[2].stored).toBe(10);
  });

  it('does not turn continuous resource variation into extra operating events',()=>{
    const run=model.simulate({source:'solarPv',profileId:'clouds',demand:100,batteryUnits:0});
    expect(new Set(run.rows.slice(0,-1).map(row=>row.generation)).size).toBeGreaterThan(10);
    expect(model.moments(run).events.map(event=>event.minute)).toEqual([0,120]);
  });

  it('preserves quiet sequences and creates no shortfall for zero demand',()=>{
    const run=model.simulate({...dark,demand:0,grid:'connected'});
    const events=model.moments(run).events;
    expect(events.map(event=>event.minute)).toEqual([0,240]);
    expect(events.flatMap(event=>kinds(event))).toEqual(['start','battery','end']);
  });

  it('does not interpret final zero powers or endpoint grid restoration as recovery',()=>{
    const run=model.simulate({...dark,grid:'outage',outageStart:60,outageMinutes:180});
    const events=model.moments(run).events;
    expect(run.rows.at(-2).unserved).toBe(10);expect(run.rows.at(-1).gridAvailable).toBe(true);
    expect(events.map(event=>event.minute)).toEqual([0,60,240]);
    expect(events.at(-1)).toEqual({minute:240,reasons:[{kind:'end',label:'Sequence complete'}],status:'Sequence complete',stored:run.endStored,endpoint:true});
    expect(events.slice(0,-1).every(event=>event.endpoint===false)).toBe(true);
  });

  it('keeps analysis pure and rejects incomplete simulation results',()=>{
    const run=model.simulate({...dark,batteryUnits:1,battery:{initial:50}}),before=JSON.stringify(run);
    expect(model.moments(run)).toEqual(model.moments(run));expect(JSON.stringify(run)).toBe(before);
    for(const invalid of [null,{}, {duration:240,rows:[]},{duration:0,rows:[run.rows[0]]}])expect(model.moments(invalid)).toBeNull();
  });
});
