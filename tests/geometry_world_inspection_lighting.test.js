import {beforeAll,describe,it,expect,vi} from 'vitest';
import {readFileSync} from 'node:fs';
const source=readFileSync('stem_lab/stem_tool_geometryworld.js','utf8');let THREE,anchor;
beforeAll(()=>{const exports={};new Function('exports','module',readFileSync('vendor/three-r128/three.min.js','utf8'))(exports,{exports});THREE=exports;const start=source.indexOf('  function geometryWorldShadowAnchor('),end=source.indexOf('  // Interpolate two bearings',start);anchor=new Function(source.slice(start,end)+'return geometryWorldShadowAnchor;')();});
function engine(){const e={camera:new THREE.PerspectiveCamera(),_currentLesson:{ground:{y:0}},_viewPreset:'side'};e.camera.position.set(90,24,80);e._viewPresetLighting={lesson:e._currentLesson,position:e.camera.position.clone(),quaternion:e.camera.quaternion.clone(),target:new THREE.Vector3(10,8,12)};return e;}
describe('inspection lighting follows the subject and releases it on navigation',()=>{
 it('centers the shadow volume on a framed build far from its camera',()=>{expect(anchor(engine())).toEqual({x:10,y:8,z:12});});
 it.each(['walk','look','free','lesson'])('returns to the player after %s navigation',mode=>{const e=engine();if(mode==='walk')e.camera.position.x+=2;if(mode==='look')e.camera.rotation.y=.3;if(mode==='free')e._viewPreset='free';if(mode==='lesson')e._currentLesson={ground:{y:4}};expect(anchor(e)).toEqual({x:e.camera.position.x,y:mode==='lesson'?4:0,z:80});});
 it('uses the live selected-creation fit and yields during manual controls or return',()=>{const e=engine();e._creationFocus={lesson:e._currentLesson,frame:{target:new THREE.Vector3(-20,40,5)},manual:false,returning:false};expect(anchor(e)).toEqual({x:-20,y:40,z:5});e._creationFocus.manual=true;expect(anchor(e)).toEqual({x:90,y:0,z:80});e._creationFocus.manual=false;e._creationFocus.returning=true;expect(anchor(e)).toEqual({x:90,y:0,z:80});});
 it('does not use a nonfinite focus or an old lesson target',()=>{const e=engine();e._viewPresetLighting.target.y=NaN;expect(anchor(e)).toEqual({x:90,y:0,z:80});e._creationFocus={lesson:{},frame:{target:new THREE.Vector3(3,4,5)}};expect(anchor(e)).toEqual({x:90,y:0,z:80});});
});
describe('preview material environment lifecycle',()=>{
 it('moves reflective preview clones to the replacement environment before old resources are released',()=>{
  const old=new THREE.Texture(),next=new THREE.Texture(),reflective=new THREE.MeshStandardMaterial({envMap:old}),matte=new THREE.MeshStandardMaterial();reflective.userData.gwReflective=true;
  const surfaces=new THREE.Group();surfaces.add(new THREE.Mesh(new THREE.BoxGeometry(),reflective),new THREE.Mesh(new THREE.BoxGeometry(),matte));
  const e={_envRT:{texture:next},_matCache:{},blocks:{},_buildBatchPreview:{surfaces}};const start=source.indexOf('        engine.applyEnvironmentMap = function() {'),end=source.indexOf('\n        };',start)+11;
  new Function('engine',source.slice(start,end))(e);e.applyEnvironmentMap();expect(reflective.envMap).toBe(next);expect(matte.envMap).toBeNull();e._envRT=null;e.applyEnvironmentMap();expect(reflective.envMap).toBeNull();surfaces.children.forEach(m=>{m.geometry.dispose();m.material.dispose();});old.dispose();next.dispose();
 });
});

describe('standard undo and redo shortcuts',()=>{
 const snippets=['KeyZ','KeyY'].map(code=>source.match(new RegExp("case '"+code+"':[\\s\\S]*?break;"))[0]).join('\n');
 const handle=new Function('ev','engine','addToast','switch(ev.code){'+snippets+'}');
 it.each([['KeyZ',false,'undo'],['KeyZ',true,'redo'],['KeyY',false,'redo']])('%s with Shift = %s performs %s',(code,shiftKey,expected)=>{for(const modifier of ['ctrlKey','metaKey']){const e={undo:vi.fn(),redo:vi.fn()},event={code,shiftKey,[modifier]:true,preventDefault:vi.fn()};handle(event,e,vi.fn());expect(e[expected]).toHaveBeenCalledTimes(1);expect(e[expected==='undo'?'redo':'undo']).not.toHaveBeenCalled();expect(event.preventDefault).toHaveBeenCalledTimes(1);}});
 it('does not undo or redo from an unmodified letter',()=>{const e={undo:vi.fn(),redo:vi.fn()};handle({code:'KeyZ'},e,vi.fn());handle({code:'KeyY'},e,vi.fn());expect(e.undo).not.toHaveBeenCalled();expect(e.redo).not.toHaveBeenCalled();});
});
