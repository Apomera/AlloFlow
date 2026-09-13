import {afterEach,describe,expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url),THREE=require('../vendor/three-r128/three.min.js');
const source=readFileSync('stem_lab/stem_tool_geometryworld.js','utf8').replace(/\r\n/g,'\n');
const start=source.indexOf('        engine.aimAtBuildArea = function() {'),end=source.indexOf('\n        };',start)+11;
if(start<0||end<start)throw Error('Production aimAtBuildArea handler not found');
const install=new Function('engine','window',source.slice(start,end));
const owned=[];
afterEach(()=>{for(const item of owned.splice(0))item.dispose();});

function fixture(position,yaw,groundY=0){
  const camera=new THREE.PerspectiveCamera(70,16/9,.1,100);
  camera.position.fromArray(position);camera.rotation.set(0,yaw,0,'YXZ');camera.updateMatrixWorld(true);
  // Compute the expected safe cell before invoking the helper. The real raycast
  // below deliberately never refreshes the camera matrix or world direction.
  const forward=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);forward.y=0;forward.normalize();
  const cell={x:Math.floor(position[0]+forward.x*3),y:groundY,z:Math.floor(position[2]+forward.z*3)};
  const geometry=new THREE.BoxGeometry(1,1,1),material=new THREE.MeshBasicMaterial({color:0x739260});owned.push(geometry,material);
  const blocks={};
  for(let x=cell.x-1;x<=cell.x+1;x++)for(let z=cell.z-1;z<=cell.z+1;z++){
    const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x+.5,groundY+.5,z+.5);mesh.userData={gridPos:{x,y:groundY,z},_lessonBlock:true};mesh.updateMatrixWorld(true);blocks[[x,groundY,z].join(',')]=mesh;
  }
  const raycaster=new THREE.Raycaster();raycaster.far=8;
  const history=[{action:'place',x:1,y:groundY+1,z:1}],events=[];
  const engine={camera,blocks,euler:new THREE.Euler(0,0,0,'YXZ'),_currentLesson:{sandbox:true,ground:{y:groundY}},_undoStack:history,_redoStack:[],velocity:new THREE.Vector3(1,0,-1),_builderSelection:{blocks:[{x:1,y:groundY+1,z:1}]},blocksPlaced:3,
    blockUnderCrosshair(){raycaster.setFromCamera(new THREE.Vector2(0,0),camera);return raycaster.intersectObjects(Object.values(blocks))[0]||null;},
    placementForHit(hit){events.push({kind:'raycast',hit});return hit?{allowed:hit.face.normal.y===1,code:hit.face.normal.y===1?'ready':'wrong_face',cell:hit.object.userData.gridPos}: {allowed:false,code:'no_target'};},
    publishPlacementPreview(preview){events.push({kind:'published',preview});return preview;}
  };
  install(engine,{THREE});return {engine,cell,events,raycaster};
}
function invariant(e){return JSON.stringify({position:e.camera.position.toArray(),blocks:Object.entries(e.blocks).map(([key,m])=>[key,m.position.toArray(),m.quaternion.toArray(),m.userData]),undo:e._undoStack,redo:e._redoStack,velocity:e.velocity.toArray(),selection:e._builderSelection,placed:e.blocksPlaced});}

describe('Aim at build area updates the real camera before its immediate preview raycast',()=>{
  it.each([
    ['integer north',[0,2.6,0],0,0],
    ['negative grid north',[-4,2.6,-5],0,0],
    ['integer east',[0,2.6,4],-Math.PI/2,0],
    ['negative grid west',[-4,2.6,-5],Math.PI/2,0],
    ['integer south',[2,2.6,1],Math.PI,0],
    ['raised ground',[-4,5.6,-5],0,3]
  ])('hits a ground top face from %s without changing the world',(_name,position,yaw,groundY)=>{
    const f=fixture(position,yaw,groundY),e=f.engine,before=invariant(e);
    expect(e.aimAtBuildArea()).toBe(true);
    expect(f.events.map(event=>event.kind)).toEqual(['raycast','published']);
    const hit=f.events[0].hit;
    expect(hit).toBeTruthy();expect(hit.face.normal.toArray()).toEqual([0,1,0]);
    expect(hit.object.userData.gridPos).toEqual(f.cell);
    expect(hit.point.x).toBeCloseTo(f.cell.x+.5,6);expect(hit.point.y).toBeCloseTo(groundY+1,6);expect(hit.point.z).toBeCloseTo(f.cell.z+.5,6);
    expect(f.events[1].preview).toMatchObject({allowed:true,code:'ready'});
    expect(invariant(e)).toBe(before);
    const lookQuaternion=new THREE.Quaternion().setFromEuler(e.euler);
    expect(Math.abs(lookQuaternion.dot(e.camera.quaternion))).toBeCloseTo(1,7);
  });
});
