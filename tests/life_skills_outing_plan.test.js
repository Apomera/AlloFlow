import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
const E=createRequire(import.meta.url)('../life_skills_outing/engine.js');
const play=(run,ids)=>ids.reduce((r,id)=>E.dispatch(r,id),run);
const plan=(run,ids)=>E.validatePlan(run,{version:1,steps:ids.map((actionId,i)=>({id:'step-'+i,actionId,addedAt:run.commands.length}))});
const sequence=['fill_water','pack_water','wear_ready','pack_document','pack_raincoat','choose_bus','depart'];

describe('Life Skills optional plan board',()=>{
  it('checks dependencies without performing actions or advancing the clock',()=>{
    const run=E.createRun(),before=JSON.stringify(run),board=plan(run,['pack_water','fill_water']);
    const review=E.planView(run,board);
    expect(review.issues).toBe(1);
    expect(review.steps[0].problem).toContain('Fill the bottle before packing');
    expect(review.next).toMatchObject({actionId:'pack_water',available:false});
    expect(review.estimate).toBeNull();
    expect(JSON.stringify(run)).toBe(before);
    expect(E.materialize(run)).toMatchObject({minutes:0,bottleFilled:false,bottlePacked:false});
    expect(E.planView(run,plan(run,['fill_water','pack_water'])).issues).toBe(0);
  });
  it('estimates a complete sequence from known facts without revealing a future event',()=>{
    const views=['rain','warm','bus-delay'].map(variation=>{
      const run=E.createRun({variation});return E.planView(run,plan(run,sequence));
    });
    expect(views[0]).toEqual(views[1]);expect(views[0]).toEqual(views[2]);
    expect(views[0]).toMatchObject({forecastMayChange:true,issues:0,estimate:{preparationClock:'09:06',arrivalClock:'09:30',minutesBeforeStart:5}});
  });
  it('rechecks actual progress and a changed bus service, then supports revising the plan',()=>{
    const start=E.createRun({variation:'bus-delay'}),board=plan(start,sequence);
    const run=play(start,sequence.slice(0,3)),review=E.planView(run,board);
    expect(review.steps.filter(step=>step.doneAt!==null)).toHaveLength(3);
    expect(review.forecastMayChange).toBe(false);
    expect(review.estimate).toBeNull();
    expect(review.steps[6].problem).toContain('route that arrives by 09:35');
    const revised=E.validatePlan(run,{...board,steps:board.steps.map(step=>step.actionId==='choose_bus'?{...step,actionId:'choose_walk'}:step)});
    expect(E.planView(run,revised).estimate.arrivalClock).toBe('09:24');
    const finished=play(run,['pack_document','pack_raincoat','choose_walk','depart']);
    expect(E.planView(finished,revised).steps.every(step=>step.doneAt!==null)).toBe(true);
    expect(E.view(finished).clock).toBe('09:24');
  });
  it('detects a weather mismatch once the update is known',()=>{
    const start=E.createRun({variation:'warm'}),board=plan(start,sequence);
    const run=play(start,sequence.slice(0,3)),review=E.planView(run,board);
    expect(review.steps[6].problem).toContain('item for the updated forecast');
    expect(review.estimate).toBeNull();
  });
  it('matches each planned action to a distinct later journal event',()=>{
    let run=E.createRun();const first=plan(run,['inspect_forecast','inspect_forecast']);
    run=E.dispatch(run,'inspect_forecast');
    expect(E.planView(run,first).steps.map(step=>step.doneAt)).toEqual([1,null]);
    run=play(run,['fill_water','pack_water','wear_ready','inspect_forecast']);
    expect(E.planView(run,first).steps.map(step=>step.doneAt)).toEqual([1,5]);
    const addedLater=plan(run,['inspect_forecast']);
    expect(E.planView(run,addedLater).steps[0].doneAt).toBeNull();
  });
  it('requires all essentials and flags steps placed after departure',()=>{
    const run=E.createRun();
    expect(E.planView(run,plan(run,['depart'])).steps[0].problem).toContain('ready clothes');
    const review=E.planView(run,plan(run,[...sequence,'inspect_forecast']));
    expect(review.steps.at(-1).problem).toContain('after leaving');
    expect(review.estimate).toBeNull();
  });
  it('rejects invalid plan records and keeps the legacy route catalog',()=>{
    const run=E.createRun(),valid=plan(run,['fill_water']);
    for(const changed of [
      {...valid,version:9},
      {...valid,checkedAt:1},
      {...valid,steps:Array.from({length:13},(_,i)=>({id:'p-'+i,actionId:'fill_water',addedAt:0}))},
      {...valid,steps:[valid.steps[0],valid.steps[0]]},
      {...valid,steps:[{...valid.steps[0],actionId:'hint'}]},
      {...valid,steps:[{...valid.steps[0],addedAt:1}]}
    ]) expect(()=>E.validatePlan(run,changed)).toThrow();
    const legacy={...run,manifestVersion:1};
    expect(E.planOptions(legacy).map(action=>action.id)).not.toContain('choose_ride');
    expect(()=>plan(legacy,['choose_ride'])).toThrow(/planned step/);
  });
  it('round-trips plans in backups while retaining older files without a plan',()=>{
    const run=E.createRun(),board=plan(run,sequence),backup=E.createBackup(run,'Remember the bag.',null,board);
    expect(E.readBackup(JSON.stringify(backup)).plan).toEqual(board);
    expect(E.readBackup(JSON.stringify(E.createBackup(run,'')))).not.toHaveProperty('plan');
    const invalid={...backup,plan:{...board,checkedAt:30}};
    expect(()=>E.readBackup(JSON.stringify(invalid))).toThrow(/plan check/);
    expect(()=>E.readBackup(JSON.stringify({...backup,plan:false}))).toThrow(/plan/);
  });
});
