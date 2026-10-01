import {afterEach,beforeAll,describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),THREE=require('../vendor/three-r128/three.min.js');
const source=readFileSync('stem_lab/stem_tool_geometryworld.js','utf8'),ground={xMin:-12,xMax:12,zMin:-12,zMax:12,y:0,type:'grass'};
let init;const engines=[];
beforeAll(()=>{const a=source.indexOf('        (function initLandscape() {'),b=source.indexOf('        // Soft rim light',a);if(a<0||b<a)throw Error('Missing landscape owner');init=new Function('engine','THREE','geometryWorldSrgbColor',source.slice(a,b));});
afterEach(()=>engines.splice(0).forEach(e=>e.disposeLandscape()));
function fixture(lesson={sandbox:true},tier='saver'){
 const e={scene:new THREE.Scene(),blocks:{'0,1,0':{userData:{_measurementLayer:'student'}}},_currentLesson:lesson,_renderProfile:{tier}};
 init(e,THREE,(T,hex)=>new T.Color(hex).convertSRGBToLinear());engines.push(e);e.refreshLandscape(ground);return e;
}
const courtyard=e=>e._landscape.children.filter(m=>m.userData.gwBuilderCourtyard);
describe('Free Build garden workshop scenery',()=>{
 it('gives the sandbox three bounded merged foreground meshes',()=>{
  const e=fixture(),meshes=courtyard(e);expect(meshes).toHaveLength(3);expect(e._landscape.userData.builderCourtyard.drawCalls).toBe(3);
  for(const m of meshes){expect(Array.from(m.geometry.attributes.position.array).every(Number.isFinite)).toBe(true);expect(m.geometry.attributes.position.count).toBe(m.geometry.attributes.color.count);expect(m.geometry.attributes.position.count).toBeLessThan(15000);}
 });
 it('keeps every garden vertex outside the full editable floor footprint',()=>{
  for(const m of courtyard(fixture())){const p=m.geometry.attributes.position;for(let i=0;i<p.count;i++)expect(p.getX(i)<ground.xMin||p.getX(i)>ground.xMax+1||p.getZ(i)<ground.zMin||p.getZ(i)>ground.zMax+1).toBe(true);}
 });
 it('does not decorate authored lessons unless they are sandboxes',()=>{expect(courtyard(fixture({landscapeTheme:'meadow'}))).toHaveLength(0);});
 it('works with the existing coastal scenery too',()=>{const e=fixture({sandbox:true,landscapeTheme:'coastal'});expect(e._landscape.name).toBe('gw-coastal-landscape');expect(courtyard(e)).toHaveLength(3);});
 it('never becomes a raycast target or modifies student blocks',()=>{
  const e=fixture(),blocks=e.blocks,block=blocks['0,1,0'];e.scene.updateMatrixWorld(true);
  const ray=new THREE.Raycaster(new THREE.Vector3(.5,20,-16),new THREE.Vector3(0,-1,0));expect(ray.intersectObjects(courtyard(e))).toEqual([]);
  e._currentLesson={sandbox:true,builderGarden:false};e.refreshLandscape(ground);expect(courtyard(e)).toHaveLength(0);expect(e.blocks).toBe(blocks);expect(e.blocks['0,1,0']).toBe(block);
 });
 it('caches unchanged scenery and disposes old geometry/material exactly once on toggling',()=>{
  const e=fixture(),old=e._landscape;let disposed=0;old.children.forEach(m=>{m.geometry.addEventListener('dispose',()=>disposed++);m.material.addEventListener('dispose',()=>disposed++);});
  e.refreshLandscape(ground);expect(e._landscape).toBe(old);expect(disposed).toBe(0);
  e._currentLesson.builderGarden=false;e.refreshLandscape(ground);expect(disposed).toBe(old.children.length*2);expect(e.scene.children).toHaveLength(1);
 });
 it('adds plant and canopy detail while keeping the draw-call budget fixed',()=>{
  const e=fixture(),n=courtyard(e).reduce((s,m)=>s+m.geometry.attributes.position.count,0);e._renderProfile.tier='detail';e.refreshLandscape(ground);
  expect(courtyard(e)).toHaveLength(3);expect(courtyard(e).reduce((s,m)=>s+m.geometry.attributes.position.count,0)).toBeGreaterThan(n);
 });
});
