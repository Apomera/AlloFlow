import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
for(const file of ['stem_lab/stem_tool_watercycle.js','desktop/web-app/public/stem_lab/stem_tool_watercycle.js']) {
 const source=readFileSync(file,'utf8'), host={};
 const start=source.indexOf('  var WC_PILOT_UNIT_M ='),end=source.indexOf('\n  };',source.indexOf('  window.WaterCyclePilotKernel = {'));
 new Function('window',source.slice(start,end+5))(host);
 const K=host.WaterCyclePilotKernel, env=K.environment('tropicalOcean');
 const seed=()=>K.initialState('tropicalOcean');
 const live=(state,input={})=>({...K.step(state,{dt:0.05,...input}),reason:'form',surface:input.surface||'water',tempC:20,rh:100});
 describe(`journey challenges: ${file}`,()=>{
  it('retains bounded completed evidence in notebook saves and interrupts restored active attempts',()=>{
   const N=host.WaterCyclePilotNotebook;
   const state={...seed(),form:'vapor',altitudeM:env.lclM+40};
   const next=live(state,{nucleusHit:true});
   const completed=K.advanceMission(K.startMission('condensation',state),state,next);
   completed.reflection='R'.repeat(1500);completed.extraPrivateData='discard';
   const record=N.capture({pilot:{scenario:'tropicalOcean',snapshot:next,mission:completed,missionResults:{condensation:completed,unknown:completed}}},123,'test');
   expect(record.evidence.mission.reflection).toHaveLength(1200);
   expect(record.evidence.mission.extraPrivateData).toBeUndefined();
   expect(Object.keys(record.evidence.missionResults)).toEqual(['condensation']);
   const restored=N.restore({},record);
   expect(restored.pilot.mission.status).toBe('complete');
   expect(restored.pilot.missionResults.condensation.events).toEqual(record.evidence.mission.events);
   expect(restored.pilot.paused).toBe(true);
   const activeRecord=N.capture({pilot:{scenario:'tropicalOcean',snapshot:state,mission:K.startMission('runoff',state)}},124,'test');
   expect(N.restore({},activeRecord).pilot.mission.status).toBe('interrupted');
   const invalidRecord=N.capture({pilot:{scenario:'tropicalOcean',snapshot:state,mission:{...completed,id:'runoff',status:'complete'}}},125,'test');
   expect(invalidRecord.evidence.mission.status).toBe('interrupted');
   expect(invalidRecord.evidence.mission.events).toEqual([]);
  });
  it('starts without retroactive credit or changing the parcel',()=>{
   const state={...seed(),form:'groundwater',stagesSeen:{infiltration:true},elapsed:50};
   const before=JSON.stringify(state), mission=K.startMission('infiltration',state);
   expect(mission.events).toEqual([]); expect(mission.status).toBe('active');
   expect(mission.startedAt).toBe(50);expect(JSON.stringify(state)).toBe(before);
   expect(K.startMission('unknown',state)).toBeNull();
  });
  it('requires a new live condensation event and freezes its evidence',()=>{
   const state={...seed(),form:'vapor',altitudeM:env.lclM+40};
   const mission=K.startMission('condensation',state), next=live(state,{nucleusHit:true});
   expect(K.advanceMission(mission,state,{...next,reason:'tick'})).toBe(mission);
   const observed=K.advanceMission(mission,state,next);
   expect(observed.status).toBe('complete');expect(observed.events[0].from).toBe('vapor');
   expect(observed.events[0].energyDirection).toBe('released');
   next.altitudeM=9000;expect(observed.events[0].altitudeM).toBeLessThan(9000);
   expect(mission.events).toEqual([]);
   expect(K.advanceMission(observed,state,next)).toBe(observed);
  });
  it.each([['runoff','hard','runoff','liquid'],['infiltration','permeable','soil','groundwater'],['plant','plant','plant','transpiring']])('observes %s in the correct physical sequence',(id,surface,landed,after)=>{
   let previous={...seed(),form:'rain',altitudeM:0.1,vy:-4,mass:1};
   let mission=K.startMission(id,previous);
   const irrelevant=live({...seed(),form:landed,pathwayProgress:0.999},{surface,thrust:1,pathwayDrive:1});
   expect(K.advanceMission(mission,{...previous,form:landed},irrelevant)).toBe(mission);
   let next=live(previous,{surface});expect(next.form).toBe(landed);
   mission=K.advanceMission(mission,previous,next);expect(mission.events).toHaveLength(1);
   previous={...next,pathwayProgress:0.999};next=live(previous,{surface,thrust:1,pathwayDrive:1});
   expect(next.form).toBe(after);mission=K.advanceMission(mission,previous,next);
   if(id==='plant') {
    expect(mission.status).toBe('active');previous={...next,energy:0.999};next=live(previous,{surface});
    expect(next.form).toBe('vapor');mission=K.advanceMission(mission,previous,next);
   }
   expect(mission.status).toBe('complete');expect(mission.events.length).toBe(K.missions[id].steps.length);
  });
  it('interrupts attempts at reset, restore, climate change, or a rewound clock',()=>{
   const previous={...seed(),elapsed:20}, mission=K.startMission('runoff',previous);
   for(const next of [{...previous,reason:'reset'},{...previous,reason:'restore'},{...previous,reason:'scenario'},
     {...previous,reason:'tick',scenario:'desertBasin'},{...previous,reason:'tick',elapsed:1}]) {
    const interrupted=K.advanceMission(mission,previous,next);
    expect(interrupted.status).toBe('interrupted');expect(interrupted.events).toEqual([]);
   }
  });
 });
}
