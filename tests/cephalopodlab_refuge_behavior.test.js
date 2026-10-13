import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url),THREE=require(process.cwd()+'/vendor/three-r128/three.min.js');
const source=readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE||'stem_lab/stem_tool_cephalopodlab.js','utf8');
function slice(first,last){const a=source.indexOf(first),b=source.indexOf(last,a);assert.ok(a>=0&&b>a,first);return source.slice(a,b);}
const geometry=slice('function createCLHuntRockCollisionFootprint(','// Small rock-rooted fragments');
const api=new Function(geometry+';return {footprint:createCLHuntRockCollisionFootprint,find:findCLHuntCrevice,state:clHuntRefugeState,text:clHuntRefugeText};')();
const benthic=['commonOcto','blueRinged','mimicOcto','giantPacific','caribReef','coconutOcto'];
function reef(width=.30){
  const rocks=[-1,1].map(sign=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(2,2,3),new THREE.MeshBasicMaterial());mesh.position.set(sign*(1+width/2),1,0);mesh.updateMatrixWorld(true);return mesh;});
  return {rocks,footprints:rocks.map(rock=>api.footprint(THREE,rock))};
}
function gap(scene,position={x:0,z:0},species='commonOcto',scale=1){return api.find(position,.55,scene.rocks,scene.footprints,scale,species,0,.55);}
function step(previous,crevice,position={x:0,z:0},input={},dt=1/60,species='commonOcto',scale=1){return api.state(previous,crevice,position,species,scale,input,dt);}
function settle(crevice,position={x:0,z:0},seconds=1.5,dt=1/60,species='commonOcto',scale=1,input={}){let pose=null;for(let i=0;i<Math.round(seconds/dt);i++)pose=step(pose,crevice,position,input,dt,species,scale);return pose;}

describe('Cephalopod Hunter finite-passage refuge behavior',()=>{
  it('settles only inside a real opposing passage and exposes a tucked posture without changing the crevice',()=>{
    const scene=reef(),crevice=gap(scene),before=JSON.stringify(crevice),pose=settle(crevice);
    assert.equal(pose.phase,'tucked');assert.ok(pose.hideBlend>.99);assert.equal(pose.peekBlend,0);assert.ok(Math.abs(pose.mouthDepth-1.5)<1e-9);assert.equal(JSON.stringify(crevice),before);
  });
  it('keeps a stationary mouth peek exposed rather than treating the mouth allowance as deep shelter',()=>{
    const scene=reef(),position={x:0,z:-1.47},pose=settle(gap(scene,position),position,3);
    assert.equal(pose.phase,'peeking');assert.equal(pose.settledFor,0);assert.equal(pose.hideBlend,0);assert.ok(pose.peekBlend>.9);assert.ok(Math.abs(pose.mouthDepth-.03)<1e-9);
    const deeper={x:0,z:-1.2},lessExposed=settle(gap(scene,deeper),deeper,3);assert.equal(lessExposed.phase,'peeking');assert.ok(lessExposed.peekBlend>.2&&lessExposed.peekBlend<.4);assert.ok(lessExposed.peekBlend<pose.peekBlend);
  });
  it('lets forward movement enter and backward movement leave using the existing controls',()=>{
    const scene=reef(),crevice=gap(scene),tucked=settle(crevice),nearMouth={x:0,z:-1.42};
    const retreat=step(tucked,gap(scene,nearMouth),nearMouth,{fromX:0,fromZ:-1.35,forward:-1});assert.equal(retreat.phase,'exiting');assert.equal(retreat.settledFor,0);assert.ok(retreat.hideBlend<tucked.hideBlend);
    const approach=step(null,gap(scene,nearMouth),nearMouth,{fromX:0,fromZ:-1.50,forward:1});assert.equal(approach.phase,'entering');assert.equal(approach.settledFor,0);
    assert.equal(settle(gap(scene,nearMouth),nearMouth).phase,'peeking');
  });
  it('derives the mouth from shared finite overlap when one wall is shorter or shifted',()=>{
    const scene=reef();scene.rocks[1].position.z=.8;const position={x:0,z:-.75},crevice=gap(scene,position);assert.ok(crevice);
    const pose=settle(crevice,position,3);assert.equal(pose.phase,'peeking');assert.ok(Math.abs(pose.mouthDepth+.05)<1e-9);assert.equal(pose.hideBlend,0);
    assert.equal(settle(gap(scene,{x:0,z:-.3}),{x:0,z:-.3}).phase,'peeking');
  });
  it('preserves exposure depth after streamed translation and rotation of actual rock geometry',()=>{
    const scene=reef(),position=new THREE.Vector3(0,.55,-1.1),before=settle(gap(scene,position),position),rotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),.82);
    for(let i=0;i<scene.rocks.length;i++){const rock=scene.rocks[i];rock.position.applyQuaternion(rotation);rock.quaternion.copy(rotation);scene.footprints[i]=api.footprint(THREE,rock);rock.position.x+=87;rock.position.z-=32;}
    position.applyQuaternion(rotation);position.x+=87;position.z-=32;const after=settle(gap(scene,position),position);
    assert.equal(after.phase,before.phase);assert.ok(Math.abs(after.mouthDepth-before.mouthDepth)<1e-8);assert.ok(Math.abs(after.peekBlend-before.peekBlend)<1e-8);
  });
  it('keeps settling and tuck easing consistent across supported frame steps',()=>{
    const crevice=gap(reef()),poses=[1/60,1/30,.05].map(dt=>settle(crevice,undefined,1.5,dt));
    for(const pose of poses){assert.equal(pose.phase,'tucked');assert.ok(pose.hideBlend>.99);assert.ok(Math.abs(pose.settledFor-1.5)<1e-9);}
  });
  it('freezes the same posture object on paused, render-only and invalid-time calls',()=>{
    const crevice=gap(reef()),pose=settle(crevice),before=JSON.stringify(pose);
    for(const dt of [0,-1,NaN,Infinity])assert.equal(step(pose,null,{x:9,z:9},{forward:1,reducedMotion:true},dt),pose);
    assert.equal(JSON.stringify(pose),before);
  });
  it('interrupts tucking for turn, depth, forward and jet input without teleporting or granting safety',()=>{
    const crevice=gap(reef()),pose=settle(crevice);
    for(const input of [{turn:1},{vertical:-1},{forward:1},{jetting:true}]){const next=step(pose,crevice,undefined,input);assert.equal(next.settledFor,0);assert.equal(next.phase,'entering');assert.ok(next.hideBlend<pose.hideBlend);assert.equal(next.mouthDepth,pose.mouthDepth);}
  });
  it('uses actual resolved travel too, while blocked forward intent still prevents settling',()=>{
    const crevice=gap(reef()),pose=settle(crevice),next=step(pose,crevice,{x:0,z:.1},{fromX:0,fromZ:0});
    assert.equal(next.phase,'exiting');assert.equal(next.settledFor,0);
    const blocked=settle(crevice,undefined,3,1/60,'commonOcto',1,{fromX:0,fromZ:0,forward:1});assert.equal(blocked.settledFor,0);assert.equal(blocked.hideBlend,0);
  });
  it('eases a released exit and clears its posture, while reduced motion applies stationary target immediately',()=>{
    const crevice=gap(reef()),pose=settle(crevice),first=step(pose,null);assert.equal(first.phase,'exiting');assert.ok(first.hideBlend>0&&first.hideBlend<pose.hideBlend);
    let released=first;for(let i=0;i<60;i++)released=step(released,null);assert.equal(released.phase,'open');assert.ok(released.hideBlend<.001);
    const reduced=settle(crevice,undefined,1,1/60,'commonOcto',1,{reducedMotion:true});assert.equal(reduced.hideBlend,1);assert.equal(reduced.peekBlend,0);
    const interrupted=step(reduced,crevice,undefined,{turn:1,reducedMotion:true});assert.equal(interrupted.hideBlend,0);
  });
  it('rejects malformed, nonopposing and nonoverlapping wall data instead of inventing shelter',()=>{
    const base=gap(reef()),cases=[null,{...base,walls:[]},{...base,width:NaN},{...base,walls:[base.walls[0],{...base.walls[1],ax:Infinity}]},{...base,walls:[base.walls[0],{...base.walls[1],nx:base.walls[0].nx,nz:base.walls[0].nz}]},{...base,walls:[base.walls[0],{...base.walls[1],ax:base.walls[1].bx,az:base.walls[1].bz}]},{...base,walls:[base.walls[0],{...base.walls[1],az:base.walls[1].az+4,bz:base.walls[1].bz+4}]}];
    for(const crevice of cases){const pose=step(null,crevice);assert.equal(pose.phase,'open');assert.equal(pose.hideBlend,0);assert.equal(pose.peekBlend,0);}
  });
  it('retains the six benthic presets and requires the giant to find a suitably scaled opening',()=>{
    for(const species of benthic)assert.equal(settle(gap(reef()),undefined,1.5,1/60,species).phase,'tucked');
    for(const species of ['cuttlefish','bobtailSquid','humboldtSquid','vampireSquid','dumboOcto','nautilus','unknown'])assert.equal(settle(gap(reef()),undefined,2,1/60,species).phase,'open');
    assert.equal(gap(reef(),undefined,'giantPacific',1.5),null);assert.ok(gap(reef(.42),undefined,'giantPacific',1.5));
    assert.equal(settle(gap(reef(.42),undefined,'giantPacific',1.5),undefined,1.5,1/60,'giantPacific',1.5).phase,'tucked');
  });
  it('does not consume dive randomness or mutate state, wall data, position or input',()=>{
    const crevice=gap(reef()),previous=step(null,crevice),position={x:0,z:0},input={fromX:0,fromZ:0},before=JSON.stringify({crevice,previous,position,input}),random=Math.random;
    try{Math.random=()=>{throw Error('Unexpected dive RNG');};step(previous,crevice,position,input);}finally{Math.random=random;}
    assert.equal(JSON.stringify({crevice,previous,position,input}),before);
  });
  it('feeds the resolved live posture and both stable visual inputs without setting a den or camo bonus',()=>{
    const start=source.indexOf('            gameState.refugePosture=clHuntRefugeState('),end=source.indexOf('            arms.forEach(',start);assert.ok(start>=0&&end>start);const live=source.slice(start,end);
    const run=new Function('gameState','octopus','speciesId','bodyScale','movementOrigin','moveFwd','turn','vertInput','isJetting','dt',geometry+live);
    const state={a11y:{reducedMotion:false},crevice:gap(reef()),inDen:false,camoEff:.2},player={position:{x:0,z:0}},origin={x:0,z:0};
    for(let i=0;i<90;i++)run(state,player,'commonOcto',1,origin,0,0,0,false,1/60);
    assert.equal(state.refugePosture.phase,'tucked');assert.equal(state.refugeHideBlend,state.refugePosture.hideBlend);assert.equal(state.refugePeekBlend,state.refugePosture.peekBlend);assert.equal(state.inDen,false);assert.equal(state.camoEff,.2);
  });
  it('describes exposed mouths and directional cover in the actual status and observation text',()=>{
    for(const phase of ['entering','settling','tucked','peeking','exiting']){assert.ok(api.text({phase},false));assert.match(api.text({phase},true),/direction|exposed/);assert.doesNotMatch(api.text({phase},true),/immune|invincible|safe|regenerat/i);}
    assert.match(api.text({phase:'tucked'},true),/Forward \/ Back.*peek or withdraw.*mouths remain exposed/);assert.match(api.text({phase:'peeking'},true),/strike when in range/);assert.equal(api.text({phase:'open'},true),'');
  });
  it('makes the existing movement controls explain tucking only for eligible species in keyboard and touch guides',()=>{
    const helper=slice('      function clHuntSpeciesStrategy(','      function initHuntSim3D('),guide=new Function(helper+';return clHuntControlGuide;')();
    for(const species of benthic)for(const touch of [false,true]){const rows=guide({ink:true,diet:'prey'},{id:species},touch).flatMap(group=>group.rows),refuge=rows.find(row=>row.input==='Reef crevice');assert.ok(refuge,species);assert.match(refuge.action,/Release movement.*Forward \/ Back.*Turning, rising or jetting.*open mouths remain exposed/);}
    for(const species of ['cuttlefish','bobtailSquid','humboldtSquid','vampireSquid','dumboOcto','nautilus'])assert.equal(guide({ink:true,diet:'prey'},{id:species},true).flatMap(group=>group.rows).some(row=>row.input==='Reef crevice'),false);
  });
});
