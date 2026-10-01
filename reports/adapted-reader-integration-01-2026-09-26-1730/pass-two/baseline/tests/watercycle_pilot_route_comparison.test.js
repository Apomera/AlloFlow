import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
for (const file of ['stem_lab/stem_tool_watercycle.js','desktop/web-app/public/stem_lab/stem_tool_watercycle.js']) {
 const source=readFileSync(file,'utf8'), host={};
 const start=source.indexOf('  var WC_PILOT_UNIT_M ='),end=source.indexOf('\n  };',source.indexOf('  window.WaterCyclePilotKernel = {'));
 new Function('window',source.slice(start,end+5))(host);
 const K=host.WaterCyclePilotKernel,N=host.WaterCyclePilotNotebook;
 // Completed observation fixtures use the same model transition and mission recorder as live play.
 const result=(id)=>{
  const surface=id==='runoff'?'hard':'permeable';
  let before={...K.initialState('tropicalOcean'),form:'rain',altitudeM:0.1,vy:-4,mass:1};
  let mission=K.startMission(id,before);
  const step=(state,input={})=>({...K.step(state,{dt:0.05,surface,...input}),reason:'form',surface,tempC:20,rh:100});
  let next=step(before);mission=K.advanceMission(mission,before,next);
  before={...next,pathwayProgress:0.999};next=step(before,{thrust:1,pathwayDrive:1});
  return K.advanceMission(mission,before,next);
 };
 describe(`pinned pathway comparisons: ${file}`,()=>{
  it('requires two distinct complete valid pathways',()=>{
   const left=result('runoff'),right=result('infiltration');
   expect(N.pinRouteComparison(left,right).left.status).toBe('complete');
   for(const invalid of [null,{...right,id:'unknown'},{...right,events:[]},{...right,events:[right.events[1],right.events[0]]},left])
    expect(N.pinRouteComparison(left,invalid)).toBeNull();
   expect(N.normalizeRouteComparison({version:2,left,right})).toBeNull();
  });
  it('detaches event evidence from mutable latest results',()=>{
   const left=result('runoff'),right=result('infiltration'),pair=N.pinRouteComparison(left,right);
   left.events[0].tempC=85;right.events.length=0;left.reflection='later writing';
   expect(pair.left.events[0].tempC).toBe(20);expect(pair.right.events).toHaveLength(2);
   expect(pair.left.reflection).toBe('');
  });
  it('bounds notes, strips extra fields, and recomputes physical energy direction',()=>{
   const left=result('runoff');left.events[0].energyDirection='absorbed';left.extra='discard';
   const pair=N.pinRouteComparison(left,result('infiltration'),{claim:'a'.repeat(900),evidence:'b'.repeat(900),limitation:'c'.repeat(900),extra:'discard'});
   for(const key of ['claim','evidence','limitation']) expect(pair[key]).toHaveLength(800);
   expect(pair.extra).toBeUndefined();expect(pair.left.extra).toBeUndefined();
   expect(pair.left.events[0].energyDirection).toBe(K.energyTransfer('rain','runoff'));
  });
  it('only explicit repinning replaces evidence, preserving learner writing',()=>{
   const left=result('runoff'),right=result('infiltration'),pair=N.pinRouteComparison(left,right,{claim:'different destinations',evidence:'two transitions',limitation:'compressed model time'});
   left.events[0].tempC=37;
   const repinned=N.pinRouteComparison(left,right,pair);
   expect(repinned.left.events[0].tempC).toBe(37);expect(pair.left.events[0].tempC).toBe(20);
   expect(repinned.claim).toBe(pair.claim);expect(repinned.evidence).toBe(pair.evidence);expect(repinned.limitation).toBe(pair.limitation);
  });
  it('round trips pinned evidence even when latest challenge results have changed',()=>{
   const left=result('runoff'),right=result('infiltration'),pair=N.pinRouteComparison(left,right,{claim:'Surface routes differ.'});
   left.events[0].tempC=37;
   const data={pilot:{scenario:'tropicalOcean',snapshot:K.initialState('tropicalOcean'),routeComparison:pair,missionResults:{runoff:left,infiltration:right}}};
   const record=N.capture(data,123,'comparison');
   const restored=N.restore({},JSON.parse(JSON.stringify(record)));
   expect(restored.pilot.routeComparison).toEqual(pair);
   expect(restored.pilot.missionResults.runoff.events[0].tempC).toBe(37);
   expect(restored.pilot.routeComparison.left.events[0].tempC).toBe(20);
   record.evidence.routeComparison.left.events[0].tempC=66;
   expect(restored.pilot.routeComparison.left.events[0].tempC).toBe(20);
  });
  it('supports older notebook records without discarding an existing comparison',()=>{
   const pair=N.pinRouteComparison(result('runoff'),result('infiltration'));
   const old=N.capture({pilot:{scenario:'tropicalOcean',snapshot:K.initialState('tropicalOcean')}},123,'legacy');
   delete old.evidence.routeComparison;
   expect(N.restore({pilot:{routeComparison:pair}},old).pilot.routeComparison).toEqual(pair);
   expect(N.restore({},old).pilot.routeComparison).toBeNull();
  });
 });
}
