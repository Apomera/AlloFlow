import {describe,it,expect} from 'vitest';import {readFileSync} from 'node:fs';
const s=readFileSync('stem_lab/stem_tool_solarsystem.js','utf8');const guide=new Function(s.slice(s.indexOf('  function marsMissionProgress('),s.indexOf('  var _stableViewTypes'))+';return marsFollowUpFlightGuide;')();
const prediction='My frozen launch prediction.',mission={startedAt:100,completedAt:200,followUp:{prediction:'An edited draft.',launched:{offset:60,prediction,timestamp:300}}};
const flight={offset:60,compare:true,progress:1,playing:false};
const shot={route:'earth-mars',missionStartedAt:100,offset:60,days:258.9,referenceGap:0,testGap:1.524,timestamp:400,followUp:{launchedAt:300,offset:60,prediction}};
const run=(f=flight,d={},entries=[],m=mission,route='earth-mars')=>guide(m,entries,route,f,d,500);
describe('follow-up flight guidance',()=>{
 it('requires a completed valid launch on its own route',()=>{expect(run(flight,{},[],{...mission,completedAt:null})).toBeNull();expect(run(flight,{},[],mission,'earth-venus')).toBeNull();expect(guide(mission,[],'earth-mars',flight,{},250)).toBeNull();});
 it('restores changed controls without changing the launched prediction',()=>{expect(run({...flight,offset:-30})).toMatchObject({stage:'setup',offset:60,prediction});expect(run({...flight,compare:false})).toMatchObject({stage:'setup'});});
 it('requires a paused arrival before capture',()=>{expect(run({...flight,progress:.5})).toMatchObject({stage:'inspect',step:0});expect(run({...flight,playing:true})).toMatchObject({stage:'inspect'});expect(run()).toMatchObject({stage:'capture',step:1});});
 it('continues from fixed evidence even when live controls change',()=>{expect(run({...flight,offset:-30,compare:false},{snapshot:shot})).toMatchObject({stage:'explain',step:2});expect(run(flight,{snapshot:{...shot,followUp:{...shot.followUp,launchedAt:250}}})).toMatchObject({stage:'capture'});expect(run(flight,{snapshot:{...shot,testGap:NaN}})).toMatchObject({stage:'capture'});});
 it('only reviews saved evidence from the current launch',()=>{const entry={source:'experiment',transferComparisonId:'saved',observation:'A comparison',transferComparison:shot};expect(run(flight,{},[entry])).toMatchObject({stage:'saved',step:3});expect(run(flight,{},[{...entry,transferComparison:{...shot,followUp:{...shot.followUp,launchedAt:250}}}])).toMatchObject({stage:'capture'});});
 it('does not mutate drafts, controls, or evidence',()=>{const d={snapshot:shot},before=JSON.stringify({mission,flight,d});run(flight,d);expect(JSON.stringify({mission,flight,d})).toBe(before);});
});
