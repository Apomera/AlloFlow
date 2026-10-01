import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
for(const file of ['stem_lab/stem_tool_watercycle.js','desktop/web-app/public/stem_lab/stem_tool_watercycle.js']) {
 const source=readFileSync(file,'utf8'),host={};
 const start=source.indexOf('  var WC_PILOT_UNIT_M ='),end=source.indexOf('\n  };',source.indexOf('  window.WaterCyclePilotKernel = {'));
 new Function('window',source.slice(start,end+5))(host);
 const K=host.WaterCyclePilotKernel,seed=()=>K.initialState('tropicalOcean');
 const state=(form,extra={})=>({...seed(),form,...extra});
 const hint=(id,form,extra={},goal='water')=>K.missionHint(K.startMission(id,seed()),state(form,extra),goal);
 describe(`contextual challenge hints: ${file}`,()=>{
  it('only advises active challenges in their current climate',()=>{
   const mission=K.startMission('runoff',seed());
   for(const status of ['complete','interrupted']) expect(K.missionHint({...mission,status},seed(),'hard')).toBeNull();
   expect(K.missionHint(null,seed(),'hard')).toBeNull();
   expect(K.missionHint(mission,state('unknown'),'hard')).toBeNull();
   expect(K.missionHint(mission,{...seed(),scenario:'desertBasin'},'hard')).toBeNull();
  });
  it('distinguishes energy, cloud-base, and nucleus requirements',()=>{
   expect(hint('condensation','liquid').code).toBe('evaporate');
   const base=K.environment('tropicalOcean').lclM;
   expect(hint('condensation','vapor',{altitudeM:base-1}).code).toBe('rise');
   expect(hint('condensation','vapor',{altitudeM:base}).code).toBe('nucleus');
   expect(hint('condensation','droplet').code).toBe('cycle');
  });
  it.each([['runoff','hard'],['infiltration','permeable'],['plant','plant']])('helps %s grow and align a landing goal',(id,surface)=>{
   for(const form of ['droplet','ice']) expect(hint(id,form).code).toBe('grow');
   for(const form of ['rain','snow']) {
    expect(hint(id,form).needsLandingGoal).toBe(true);
    expect(hint(id,form,{},surface)).toMatchObject({code:'land',surface,needsLandingGoal:false});
   }
  });
  it('follows actual recorded progress without retroactive credit',()=>{
   for(const [id,surface,landed] of [['runoff','hard','runoff'],['infiltration','permeable','soil'],['plant','plant','plant']]) {
    let before=state('rain',{altitudeM:.1,vy:-4,mass:1});
    let mission=K.startMission(id,before);
    expect(K.missionHint(mission,state(landed),surface).code).toBe('cycle');
    let next={...K.step(before,{dt:.05,surface}),reason:'form',surface,tempC:20,rh:100};
    mission=K.advanceMission(mission,before,next);
    expect(K.missionHint(mission,next,surface)).toMatchObject({code:'follow',step:1});
    if(id==='plant') {
     before={...next,pathwayProgress:.999};next={...K.step(before,{dt:.05,surface,thrust:1,pathwayDrive:1}),reason:'form',surface,tempC:20,rh:100};
     mission=K.advanceMission(mission,before,next);
     expect(K.missionHint(mission,next,surface)).toMatchObject({code:'release',step:2});
    }
   }
  });
  it('is read-only across paused states and preserves recorded evidence',()=>{
   const snapshot=state('rain',{paused:true}),mission=K.startMission('infiltration',snapshot);
   const before=JSON.stringify({snapshot,mission});
   for(const goal of ['water','permeable']) K.missionHint(mission,snapshot,goal);
   expect(JSON.stringify({snapshot,mission})).toBe(before);
   expect(mission.events).toEqual([]);
  });
 });
}
