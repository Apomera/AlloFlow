import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
const E=createRequire(import.meta.url)('../life_skills_outing/engine.js');
const play=(run,ids)=>ids.reduce((r,id)=>E.dispatch(r,id),run);

describe('Life Skills travel time exploration',()=>{
  it('separates waiting and travel without changing a run or its evidence',()=>{
    const run=E.createRun(),before=JSON.stringify(run),timing=E.travelAt(run,12);
    expect(timing).toMatchObject({departure:'09:12',preparationTime:'09:00',preparationReady:false,practiceClock:'09:00',hypothetical:true});
    expect(timing.routes.find(r=>r.id==='bus')).toMatchObject({waitingMinutes:8,travelMinutes:10,arrival:'09:30',minutesBeforeStart:5,latestOnTimeDeparture:'09:20'});
    expect(timing.routes.find(r=>r.id==='walk')).toMatchObject({waitingMinutes:0,travelMinutes:18,arrival:'09:30',latestOnTimeDeparture:'09:17'});
    expect(JSON.stringify(run)).toBe(before);
    expect(E.materialize(run).observations).toEqual([]);
    expect(Object.isFrozen(timing.routes[0])).toBe(true);
  });
  it('distinguishes arriving exactly at the start from arriving late',()=>{
    const run=E.createRun(),walkAt=minute=>E.travelAt(run,minute).routes.find(r=>r.id==='walk');
    expect(walkAt(17)).toMatchObject({arrival:'09:35',onTime:true,minutesBeforeStart:0});
    expect(walkAt(18)).toMatchObject({arrival:'09:36',onTime:false,minutesBeforeStart:-1});
    expect(E.travelAt(run,20).routes.find(r=>r.id==='ride')).toMatchObject({arrival:'09:35',onTime:true});
  });
  it('keeps each scheduled bus separate and models the exact departure boundary',()=>{
    const run=E.createRun(),route=(minute,id)=>E.travelAt(run,minute).routes.find(r=>r.id===id);
    expect(route(20,'bus')).toMatchObject({waitingMinutes:0,arrival:'09:30',available:true});
    expect(route(21,'bus')).toMatchObject({waitingMinutes:null,arrival:null,available:false,onTime:false});
    expect(route(21,'late_bus')).toMatchObject({waitingMinutes:19,arrival:'09:50',available:true,onTime:false});
    expect(route(40,'late_bus').available).toBe(true);
    expect(route(41,'late_bus').available).toBe(false);
  });
  it('uses only known information and changes the bus model when the update actually arrives',()=>{
    const initial=['rain','warm','bus-delay'].map(variation=>E.travelAt(E.createRun({variation}),15));
    expect(initial[0]).toEqual(initial[1]);expect(initial[0]).toEqual(initial[2]);
    const run=play(E.createRun({variation:'bus-delay'}),['fill_water','pack_water','wear_ready']);
    const timing=E.travelAt(run,15);
    expect(timing.forecastMayChange).toBe(false);
    expect(timing.routes.find(r=>r.id==='bus')).toMatchObject({waitingMinutes:5,travelMinutes:25,arrival:'09:45',onTime:false,latestOnTimeDeparture:null});
  });
  it('rejects times before current preparation and malformed times',()=>{
    const run=play(E.createRun(),['prepare_clothes']);
    expect(E.travelAt(run).departure).toBe('09:08');
    for(const value of [7,-1,61,8.5,'10',null,NaN,Infinity])expect(()=>E.travelAt(run,value)).toThrow(/departure/);
    expect(E.travelAt(run,60).routes.find(r=>r.id==='walk').arrival).toBe('10:18');
  });
  it('preserves completed departure and arrival while exploring another time',()=>{
    const run=play(E.createRun(),['wear_ready','fill_water','pack_water','pack_document','pack_raincoat','choose_bus','depart']);
    const before=JSON.stringify(run),timing=E.travelAt(run,30);
    expect(timing).toMatchObject({completed:true,preparationTime:'09:06',preparationReady:true,practiceClock:'09:30',departure:'09:30'});
    expect(timing.routes.find(r=>r.id==='bus')).toMatchObject({selected:true,available:false});
    expect(JSON.stringify(run)).toBe(before);
  });
  it('retains original route limits for legacy saves',()=>{
    const run={...E.createRun(),manifestVersion:1};
    expect(E.travelAt(run,10).routes.map(r=>r.id)).toEqual(['walk','bus','late_bus']);
  });
});
