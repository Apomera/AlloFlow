import {describe,it,expect,beforeAll} from 'vitest';
import {readFileSync} from 'node:fs';
import {resetStemLab,loadTool} from './helpers/stem_widgets_smoke_harness.js';
const source=readFileSync('stem_lab/stem_tool_geometryworld.js','utf8');
const a=source.indexOf('  function describeBearing(deg) {'),b=source.indexOf('  function gwChatKey(',a);
if(a<0||b<a)throw Error('Missing actual wayfinding helper boundaries');
const speech=new Function(source.slice(a,b)+'\nreturn {summarizeActivityWaypoint,summarizeNearbyNpcs};')();
let pure;
beforeAll(()=>{resetStemLab();loadTool('stem_lab/stem_tool_geometryworld.js','geometryWorld');new Function(readFileSync('stem_lab/stem_tool_geometryworld_builder.js','utf8'))();pure=window.StemLab.geometryWorldBuilderPure;});
const lesson={title:'Discovery',structures:[],activities:[{id:'one',title:'Build a room',npcName:'Ada'},{id:'two',title:'Compare shapes',npcName:'Ben'}]};
const npcs=[{data:{name:'Ada'}},{data:{name:'Ben'}}];
describe('Explicit activity tracking',()=>{
  it('never tracks merely because an activity is being viewed',()=>{const guide=pure.activityGuideModel(lesson);expect(pure.activityWaypointFor(guide,{selectedId:guide.activities[1].id},npcs)).toBeNull();expect(pure.activityWaypointFor(null,{},npcs)).toBeNull();});
  it('keeps the pinned activity while the learner browses another page',()=>{const guide=pure.activityGuideModel(lesson),journal={trackedId:guide.activities[0].id,selectedId:guide.activities[1].id};expect(pure.activityWaypointFor(guide,journal,npcs)).toEqual({id:guide.activities[0].id,lessonKey:guide.key,npcName:'Ada',title:'Build a room',index:0,count:2});});
  it('validates a pin against the active lesson and its actual guides',()=>{const guide=pure.activityGuideModel(lesson);expect(pure.activityWaypointFor(guide,{trackedId:'nonexistent'},npcs)).toBeNull();expect(pure.activityWaypointFor(guide,{trackedId:guide.activities[0].id},[{data:{name:'Ben'}}])).toBeNull();expect(pure.activityWaypointFor(guide,{trackedId:guide.activities[0].id},null)).toBeNull();});
  it('clears independently of journal notes and review marks',()=>{const guide=pure.activityGuideModel(lesson),journal={trackedId:null,notes:{[guide.activities[0].id]:'Keep me'},reviewed:{[guide.activities[0].id]:true}},snapshot=JSON.stringify(journal);expect(pure.activityWaypointFor(guide,journal,npcs)).toBeNull();expect(JSON.stringify(journal)).toBe(snapshot);});
  it('restores a pin after an ordinary lesson JSON save without changing its identity',()=>{const first=pure.activityGuideModel(lesson),second=pure.activityGuideModel(JSON.parse(JSON.stringify(lesson)));expect(pure.activityWaypointFor(second,{trackedId:first.activities[1].id},npcs).npcName).toBe('Ben');});
});
describe('Tracked activity directions are spoken on demand',()=>{
  const waypoint={title:'Build a room',npcName:'Ada'};
  it.each([[0,'straight ahead'],[90,'to your right'],[-90,'to your left'],[180,'behind you']])('preserves the movement convention for bearing %s',(bearing,phrase)=>{expect(speech.summarizeActivityWaypoint([{name:'Ada',distance:8.2,bearingDeg:bearing}],waypoint)).toBe('Tracked activity: Build a room. Ada is 8 steps '+phrase+'.');});
  it('announces the selected far guide rather than a nearer untracked guide',()=>{const text=speech.summarizeActivityWaypoint([{name:'Ben',distance:2,bearingDeg:0},{name:'Ada',distance:20,bearingDeg:-45}],waypoint);expect(text).toContain('Ada is 20 steps ahead and to your left');expect(text).not.toContain('Ben');});
  it('keeps nearby distances meaningful and falls back when the pin cannot resolve',()=>{expect(speech.summarizeActivityWaypoint([{name:'Ada',distance:.1,bearingDeg:0}],waypoint)).toContain('1 step straight ahead');expect(speech.summarizeActivityWaypoint([],waypoint)).toBe('');expect(speech.summarizeActivityWaypoint([{name:'Ada',distance:Infinity,bearingDeg:0}],waypoint)).toBe('');expect(speech.summarizeActivityWaypoint([],null)).toBe('');});
  it('describes ungraded exploration without falsely declaring questions complete',()=>{const text=speech.summarizeNearbyNpcs([{name:'Ada',distance:2,bearingDeg:0,hasQuestion:false}],4);expect(text).toContain('exploration without scored questions');expect(text).not.toContain('Every question here is answered');});
});
