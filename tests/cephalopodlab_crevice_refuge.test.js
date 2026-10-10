import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url),THREE=require('../vendor/three-r128/three.min.js');
const source=readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE||'stem_lab/stem_tool_cephalopodlab.js','utf8');
function slice(first,last){const a=source.indexOf(first),b=source.indexOf(last,a);assert.ok(a>=0&&b>a,first);return source.slice(a,b);}
const geometry=slice('function createCLHuntRockCollisionFootprint(','// Small rock-rooted fragments');
const helpers=new Function(geometry+';return {footprint:createCLHuntRockCollisionFootprint,find:findCLHuntCrevice,resolve:resolveCLHuntRockCollision};')();
function reef(width=.30){
  const rocks=[-1,1].map(sign=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(2,2,3),new THREE.MeshBasicMaterial());mesh.position.set(sign*(1+width/2),1,0);mesh.updateMatrixWorld(true);return mesh;});
  const footprints=rocks.map(r=>helpers.footprint(THREE,r));return{rocks,footprints};
}
function find(scene,p={x:0,z:0},species='commonOcto',height=.55,scale=1){return helpers.find(p,height,scene.rocks,scene.footprints,scale,species,0,.55);}
const movement=slice('            var proposedCrevice=', '            // Deepest point of the run.');
function move(scene,p,species='commonOcto',origin=p.clone(),options={}){
  const state={verticalY:options.height??.55},player={position:p};
  new Function('octopus','gameState','rocks','rockCollisionFootprints','bodyScale','speciesId','terrainHeight','floorRestY','movementOrigin','vertInput','capabilities',geometry+movement)(player,state,scene.rocks,scene.footprints,1,species,options.terrain||(()=>0),.55,origin,options.vertInput||0,{swimming:!!options.swimming});
  return state;
}
describe('Cephalopod Hunter geometric crevice refuge',()=>{
  it('recognizes an actual opposing narrow passage and preserves ordinary clearance in open water',()=>{
    const scene=reef(),before=JSON.stringify(scene.footprints),gap=find(scene);
    assert.ok(gap);assert.ok(Math.abs(gap.width-.3)<1e-9);assert.ok(Math.abs(gap.margin-.121)<1e-12);assert.deepEqual([gap.first,gap.second],[0,1]);
    assert.equal(find(reef(.7)),null);assert.equal(find(scene,{x:0,z:5}),null);assert.equal(JSON.stringify(scene.footprints),before);
  });
  it('rejects a too-small opening, single rock, and two rocks on the same side',()=>{
    assert.equal(find(reef(.20)),null);
    const scene=reef();scene.rocks.pop();scene.footprints.pop();assert.equal(find(scene),null);
    const both=reef();both.rocks[1].position.x=-3.3;assert.equal(find(both),null);
    assert.equal(find(reef(),{x:0,z:1.8}),null);
  });
  it('limits squeeze to the six benthic octopus presets and actual floor/rock height',()=>{
    const scene=reef();
    for(const id of ['commonOcto','blueRinged','mimicOcto','giantPacific','caribReef','coconutOcto'])assert.ok(find(scene,undefined,id),id);
    for(const id of ['humboldtSquid','cuttlefish','nautilus','bobtailSquid','vampireSquid','dumboOcto','unknown'])assert.equal(find(scene,undefined,id),null,id);
    assert.equal(find(scene,undefined,'commonOcto',1.1),null);
    for(const rock of scene.rocks)rock.position.y=4;
    assert.equal(find(scene),null);
    assert.equal(find(reef(),{x:NaN,z:0}),null);
  });
  it('does not treat overlapping hulls or an embedded third rock as a refuge',()=>{
    assert.equal(find(reef(-.1)),null);
    const scene=reef(),plug=new THREE.Mesh(new THREE.BoxGeometry(.1,1,.5),new THREE.MeshBasicMaterial());plug.position.y=.55;
    scene.rocks.push(plug);scene.footprints.push(helpers.footprint(THREE,plug));assert.equal(find(scene),null);
  });
  it('allows slow native movement through a mouth at 60Hz, 30Hz, and the capped timestep while rigid species remain blocked',()=>{
    for(const dt of [1/60,1/30,.05]){
      const scene=reef();
      for(const species of ['commonOcto','caribReef']){
        const player=new THREE.Vector3(0,.55,-2.2);let squeezed=false;
        for(let i=0;i<Math.ceil(1.4/dt);i++){const origin=player.clone();player.z+=2.6*dt;const state=move(scene,player,species,origin);squeezed ||= !!state.crevice;}
        assert.ok(squeezed,species+' no entry at '+dt);assert.ok(player.z>1.2,species+' stalled at '+player.z+' for '+dt);
        let exited;for(let i=0;i<Math.ceil(1.4/dt);i++){const origin=player.clone();player.z-=2.6*dt;exited=move(scene,player,species,origin);}
        assert.ok(Math.abs(player.z+2.2)<1e-8,species+' failed to retreat at '+dt);assert.equal(exited.crevice,null);
      }
      const rigid=new THREE.Vector3(0,.55,-2.2);
      for(let i=0;i<Math.ceil(1.4/dt);i++){const origin=rigid.clone();rigid.z+=2.6*dt;move(scene,rigid,'cuttlefish',origin);}
      assert.ok(rigid.z< -1.4,'rigid species crossed at '+dt);
      const tooSmall=reef(.20),blocked=new THREE.Vector3(0,.55,-2.2);
      for(let i=0;i<Math.ceil(1.4/dt);i++){const origin=blocked.clone();blocked.z+=2.6*dt;move(tooSmall,blocked,'commonOcto',origin);}
      assert.ok(blocked.z< -1.4,'narrow gap crossed at '+dt);
    }
  });
  it('reuses local footprints after streamed translation and respects rotated surfaces',()=>{
    const scene=reef(),angle=.73,rotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),angle);
    for(let i=0;i<scene.rocks.length;i++){const r=scene.rocks[i];r.position.applyQuaternion(rotation);r.quaternion.copy(rotation);scene.footprints[i]=helpers.footprint(THREE,r);}
    assert.ok(find(scene));const cached=scene.footprints.slice();for(const r of scene.rocks){r.position.x+=80;r.position.z-=35;}
    const result=find(scene,{x:80,z:-35});assert.ok(result);assert.ok(Math.abs(result.width-.3)<1e-7);assert.equal(scene.footprints[0],cached[0]);
  });
  it('retains wide-passage movement and valid wall sliding, and regrounds a rejected move without cancelling ascent',()=>{
    const wide=reef(.7),traveller=new THREE.Vector3(0,.55,-2.2);
    for(let i=0;i<30;i++){const origin=traveller.clone();traveller.z+=.13;move(wide,traveller,'cuttlefish',origin);}assert.ok(traveller.z>1.5);
    const wall=reef();wall.rocks.pop();wall.footprints.pop();const slider=new THREE.Vector3(.02,.55,0);move(wall,slider,'commonOcto',new THREE.Vector3(.1,.55,-.1));assert.ok(slider.x>.069);assert.equal(slider.z,0);
    slider.set(.02,.55,0);const raised=move(wall,slider,'commonOcto',new THREE.Vector3(.1,.85,-.1),{terrain:x=>x>.05?.3:0});assert.ok(slider.x>.069);assert.ok(Math.abs(raised.verticalY-.85)<1e-12);
    const scene=reef(.20),origin=new THREE.Vector3(0,.75,-1.8),blocked=new THREE.Vector3(0,.55,-1.4);
    const state=move(scene,blocked,'commonOcto',origin,{terrain:(_x,z)=>z< -1.7?.2:0});assert.equal(blocked.z,origin.z);assert.equal(state.verticalY,.75);
    blocked.set(0,1,-1.4);const rising=move(scene,blocked,'commonOcto',origin,{height:1,vertInput:1,terrain:(_x,z)=>z< -1.7?.2:0});assert.equal(rising.verticalY,1);
  });
  it('rejects descending a rigid body into a gap when the previous horizontal pose is valid only above the rocks',()=>{
    const scene=reef(),previous=new THREE.Vector3(0,2.5,0),player=new THREE.Vector3(0,1.9,0);
    const state=move(scene,player,'cuttlefish',previous,{height:1.9,vertInput:-1,swimming:true});
    assert.equal(state.verticalY,2.5);assert.equal(player.x,0);assert.equal(player.z,0);assert.equal(state.crevice,null);
  });
  it('uses ordinary clearance when a wall slide raises the animal out of an opposing crevice',()=>{
    const scene=reef();scene.rocks[0].geometry=new THREE.BoxGeometry(2,.9,3);scene.rocks[0].position.y=.45;
    scene.footprints[0]=helpers.footprint(THREE,scene.rocks[0]);
    const origin=new THREE.Vector3(.06,.55,-1.8),player=new THREE.Vector3(.06,.55,0);
    assert.ok(find(scene,player));
    const state=move(scene,player,'commonOcto',origin,{terrain:x=>x<.04?1:0});
    assert.equal(state.crevice,null);assert.equal(player.x,origin.x);assert.equal(player.z,origin.z);
    assert.ok(state.verticalY>=.55);
    for(let i=0;i<scene.rocks.length;i++)assert.equal(helpers.resolve({x:player.x,z:player.z},state.verticalY,scene.rocks[i].position,scene.footprints[i],.22),false);
  });
  it('uses real rock rays for directional concealment and forbids a strike through the wall while the mouth stays exposed',()=>{
    const scene=reef(),octopus={position:new THREE.Vector3(0,.55,0)},coverRay=new THREE.Raycaster(),gameState={inkCloudsActive:[]};
    const spatial=slice('        function rockBlocks(', '        function rememberPrey(')+slice('        function preyReadiness(', '        function forageReady(');
    const rules=new Function('THREE','rocks','octopus','coverRay','gameState','dens','shelters','DEN_RADIUS','SHELTER_DEN_RADIUS','FISH_CATCH_RANGE','distance3',spatial+';return {seen:predatorCanSee,ready:preyReadiness};')(THREE,scene.rocks,octopus,coverRay,gameState,[],[],2,1.5,3,(a,b)=>a.distanceTo(b));
    const predator={position:new THREE.Vector3(-4,.55,0),userData:{kind:'moray'}};
    assert.ok(find(scene));assert.equal(rules.seen(predator,10),false);
    predator.position.set(0,.55,-3);assert.equal(rules.seen(predator,10),true);
    const prey={position:new THREE.Vector3(2.5,.55,0),userData:{alive:true,cfg:{}}};assert.equal(rules.ready(prey).reason,'cover');
    prey.position.set(0,.55,2);assert.equal(rules.ready(prey).ready,true);
  });
  it('narrows only the local mantle and restores the breath scale exactly after compression',()=>{
    const block=slice('    // Local mantle compression', '    // A small cross-section brace');
    const apply=new Function('mantle','state','swimming',block),mantle={scale:new THREE.Vector3(1.02,.98,1.01)};
    apply(mantle,{squeezeBlend:1},false);assert.ok(mantle.scale.x<.75);assert.ok(mantle.scale.z<.92);assert.ok(mantle.scale.y>1);
    mantle.scale.set(1.02,.98,1.01);apply(mantle,{squeezeBlend:0},false);assert.deepEqual(mantle.scale.toArray(),[1.02,.98,1.01]);
    apply(mantle,{squeezeBlend:1},true);assert.deepEqual(mantle.scale.toArray(),[1.02,.98,1.01]);
  });
});
