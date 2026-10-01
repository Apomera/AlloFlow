import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
for(const file of ['stem_lab/stem_tool_watercycle.js','desktop/web-app/public/stem_lab/stem_tool_watercycle.js']) {
 const source=readFileSync(file,'utf8'),host={};
 const start=source.indexOf('  var WC_PILOT_UNIT_M ='),end=source.indexOf('\n  };',source.indexOf('  window.WaterCyclePilotKernel = {'));
 new Function('window',source.slice(start,end+5))(host);
 const N=host.WaterCyclePilotNotebook,K=host.WaterCyclePilotKernel;
 const change=(id='old',sequence=1)=>({id,sequence,scenario:'mountainWinter',from:'vapor',to:'ice',elapsed:20,altitudeM:1500,tempC:-8,rh:100,nucleus:true,energy:0,surface:'water'});
 describe(`recorded transition review: ${file}`,()=>{
  it('selects original evidence from another climate without consulting live readings',()=>{
   const old=change(),pilot={snapshot:{...K.initialState('tropicalOcean'),tempC:30},notebookChanges:[old],lastChange:{...change('latest',2),scenario:'tropicalOcean',from:'liquid',to:'vapor'}};
   const before=JSON.stringify(pilot),selected=N.selectChange(pilot,'old');
   expect(selected).toMatchObject({scenario:'mountainWinter',from:'vapor',to:'ice',tempC:-8,rh:100});
   expect(JSON.stringify(pilot)).toBe(before);
   old.rh=40;expect(selected.rh).toBe(100);
  });
  it('cannot invent a change or select a malformed transition',()=>{
   expect(N.selectChange({},'missing')).toBeNull();expect(N.selectChange(null,'old')).toBeNull();
   expect(N.selectChange({notebookChanges:[{...change(),to:'vapor'}]},'old')).toBeNull();
   expect(N.selectChange({lastChange:{...change(),from:'unknown'}},'old')).toBeNull();
  });
  it('supports a latest receipt outside the bounded trail',()=>{
   const pilot={notebookChanges:[],lastChange:change('latest')};
   expect(N.selectChange(pilot,'latest').id).toBe('latest');
   const many=Array.from({length:30},(_,i)=>change('event-'+i,i+1));
   expect(N.selectChange({notebookChanges:many},'event-0')).toBeNull();
   expect(N.selectChange({notebookChanges:many},'event-29').sequence).toBe(30);
  });
  it('normalizes review values and excludes unrelated properties',()=>{
   const selected=N.selectChange({lastChange:{...change(),tempC:999,rh:999,extra:'discard'}},'old');
   expect(selected.tempC).toBe(100);expect(selected.rh).toBe(100);expect(selected.extra).toBeUndefined();
  });
  it('never saves an open review as evidence and closes review when restoring',()=>{
   const pilot={scenario:'tropicalOcean',snapshot:K.initialState('tropicalOcean'),lastChange:change(),notebookChanges:[change()],reviewChange:change(),reviewReturnId:'button',noticeChangeId:'old'};
   const record=N.capture({pilot},123,'review-test');
   expect(record.evidence.changes).toHaveLength(1);expect(record.evidence.reviewChange).toBeUndefined();
   const restored=N.restore({pilot},record);
   expect(restored.pilot.reviewChange).toBeNull();expect(restored.pilot.reviewReturnId).toBe('');expect(restored.pilot.noticeChangeId).toBe('');
   expect(restored.pilot.paused).toBe(true);expect(restored.pilot.notebookChanges).toHaveLength(1);
  });
 });
}
