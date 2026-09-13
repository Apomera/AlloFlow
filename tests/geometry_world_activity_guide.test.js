import {describe,it,expect,beforeAll} from 'vitest';
import {readFileSync} from 'node:fs';
import {resetStemLab,loadTool} from './helpers/stem_widgets_smoke_harness.js';
import vm from 'node:vm';
let pure,THREE;
beforeAll(()=>{
  const sandbox={console};vm.runInNewContext(readFileSync('vendor/three-r128/three.min.js','utf8'),sandbox);THREE=sandbox.THREE;
  resetStemLab();loadTool('stem_lab/stem_tool_geometryworld.js','geometryWorld');
  new Function(readFileSync('stem_lab/stem_tool_geometryworld_builder.js','utf8'))();
  pure=window.StemLab.geometryWorldBuilderPure;
});
const lesson={title:'Harbor',structures:[],ground:{xMin:-8,xMax:8,zMin:-8,zMax:8,y:0},activities:[{id:'garden',title:'Garden',challenge:'Build equal areas',npcName:'Gardener',position:[1,2.6,1],successCriteria:['Measure each plot','Explain the result']}]};
describe('Expedition activity guide',()=>{
  it('leaves legacy lessons without a new activity guide',()=>{
    expect(pure.activityGuideModel({title:'Old',objectives:['Measure']})).toBeNull();
  });
  it('keeps progress identity through a JSON save and distinguishes changed lesson content',()=>{
    const first=pure.activityGuideModel(lesson),saved=pure.activityGuideModel(JSON.parse(JSON.stringify(lesson)));
    expect(first.key).toBe(saved.key);
    expect(pure.activityGuideModel({...lesson,structures:[{x1:1,x2:2}]}).key).not.toBe(first.key);
    expect(first.activities[0].successCriteria).toBe('Measure each plot Explain the result');
  });
  it('bounds imported activity content and rejects invalid travel coordinates',()=>{
    const guide=pure.activityGuideModel({...lesson,activities:Array.from({length:40},()=>({id:'duplicate',title:'Station',hint:'x'.repeat(3000),position:[Infinity,2,3]}))});
    expect(guide.activities).toHaveLength(12);
    expect(new Set(guide.activities.map(a=>a.id)).size).toBe(12);
    expect(guide.activities[0].position).toBeNull();
    expect(guide.activities[0].hint).toHaveLength(2000);
  });
  function engine(){return {_currentLesson:lesson,npcs:[{data:{name:'Gardener',position:[4,1,4]}}],blocks:{'1,1,1':{userData:{blockType:'wood'}}},_undoStack:[{action:'place'}],_redoStack:[],camera:new THREE.PerspectiveCamera(),euler:new THREE.Euler(0,0,0,'YXZ'),velocity:new THREE.Vector3(1,1,1),releaseInput(){},_entryAnim:{},_viewPresetAnim:{}};}
  it('travels to a clear body column without modifying blocks or history and synchronizes camera look',()=>{
    const e=engine(),before=JSON.stringify([e.blocks,e._undoStack,e._redoStack]);
    expect(pure.travelToActivity(e,pure.activityGuideModel(lesson).activities[0])).toBe(true);
    expect(e.camera.position.y).toBeGreaterThan(2.6);
    expect(e._entryAnim).toBeNull();expect(e.velocity.length()).toBe(0);
    expect(JSON.stringify([e.blocks,e._undoStack,e._redoStack])).toBe(before);
    const q=new THREE.Quaternion().setFromEuler(e.euler);
    expect(q.angleTo(e.camera.quaternion)).toBeLessThan(1e-6);
  });
  it('rejects unsafe waypoints without moving the learner',()=>{
    const e=engine(),before=e.camera.position.clone();
    expect(pure.travelToActivity(e,{position:[500,3,0]})).toBe(false);
    expect(e.camera.position.equals(before)).toBe(true);
  });
  it('can find a named guide for activities without authored travel coordinates',()=>{
    const e=engine();
    expect(pure.travelToActivity(e,{npcName:'Gardener'})).toBe(true);
    expect(e.camera.position.x).toBe(2);
  });
});
