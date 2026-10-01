import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
const source=fs.readFileSync('stem_lab/stem_tool_raptorhunt.js','utf8').replace(/\r\n/g,'\n');
function extract(name,optional=false){const start=source.indexOf('        function '+name+'(');if(start<0&&optional)return '';const end=source.indexOf('\n        }\n',start)+10;if(start<0||end<10)throw Error(name);return source.slice(start,end);}
const inspect=new Function('input',`const HIGH_STOOP_MIN_MPH=180;const mission={id:'highStoop',timeLimit:180};const {mph,diving=false,target='search',ready=true,outcome='active'}=input;const raptor={speed:mph/2.237,diving,x:0,z:0,y:1000,landed:false,crashed:false};const missionOutcome=outcome,missionOutcomeText='Complete',missionElapsed=10,missionUsesHuntCycle=false,missionRouteItems=[1,2,3,4],lastTargetState=target,strikeReady=ready;function terrainHeightAt(){return 0;}function controlKeyLabel(action){return {dive:'Shift',strike:'F'}[action]||'';}${['highStoopQualifyingDive','highStoopSpeedText'].map(n=>extract(n,true)).join('\n')}${['missionTimeRemainingText','missionProgressText','missionProgressRatio','missionProgressLabel','missionRoutePhase','missionFocusText'].map(n=>extract(n)).join('\n')}return {text:missionProgressText(),ratio:missionProgressRatio(),label:missionProgressLabel(),phase:missionRoutePhase(),focus:missionFocusText()};`);
describe('High Stoop readiness is separate from winning',()=>{
  it('does not round a sub-threshold speed into a qualifying speed',()=>{expect(inspect({mph:179.99,diving:true}).text).toContain('179 / 180 mph');});
  it('shows the countdown while a catch is still required',()=>{expect(inspect({mph:190,diving:true}).text).toContain('2:50 left');});
  it('treats the speed bar as speed even outside a dive',()=>{expect(inspect({mph:90}).ratio).toBeCloseTo(.5);});
  it('does not advance a fast glide to the strike phase',()=>{expect(inspect({mph:200}).phase).toBe(1);});
  it('keeps a fast dive in alignment until prey is ready',()=>{expect(inspect({mph:200,diving:true,target:'close'}).phase).toBe(2);});
  it('requires speed and target readiness before prompting the final strike',()=>{const s=inspect({mph:180,diving:true,target:'ready'});expect(s.phase).toBe(3);expect(s.focus).toContain('F');expect(s.focus).toContain('Strike now');});
  it('explains the speed requirement while still accelerating',()=>{expect(inspect({mph:179.99,diving:true,target:'ready'}).focus).toContain('180 mph');});
  it('does not offer another strike during recovery',()=>{const s=inspect({mph:200,diving:true,target:'ready',ready:false});expect(s.phase).toBe(2);expect(s.focus).toContain('recover');});
  it('reserves the completion state for an actual successful outcome',()=>{const s=inspect({mph:200,diving:true,outcome:'success'});expect(s.ratio).toBe(1);expect(s.phase).toBe(4);expect(s.label).toBe('Mission complete');});
});
