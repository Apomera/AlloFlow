import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url),T=require('../vendor/three-r128/three.min.js');
const source=readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE||'stem_lab/stem_tool_cephalopodlab.js','utf8');
function slice(first,last){const a=source.indexOf(first),b=source.indexOf(last,a);assert.ok(a>=0&&b>a,first);return source.slice(a,b);}
const shared=slice('// Three weathered slabs provide two real, open-ended reef passages.','// A fixed, visual-only wake pool.');
const rules=new Function(shared+';return {geometry:createCLHuntRefugeGeometry,site:findCLHuntRefugeSite,footprint:createCLHuntRockCollisionFootprint,crevice:findCLHuntCrevice,resolve:resolveCLHuntRockCollision};')();
const footprint=slice('function createCLReefFootprint(','function findCLReefSite(');
const integration=slice('        // Choose actual free space after the fixed opening actors have settled.','        corals.slice(0,10).forEach(');
const build=new Function('THREE','rocks','clams','shelters','crabs','dens','landmarks','terrainHeight','scene','grounded','rockCollisionFootprints','isDeepSpecies','speciesId','renderer','shadeCLHuntRockSurface','reefSurface',shared+footprint+'var reefRefuge=null;'+integration+';return reefRefuge;');
function reef(options={}){
  const rocks=options.rocks||[],scene=new T.Scene(),grounded=rocks.slice(),footprints=rocks.map(r=>rules.footprint(T,r));
  const terrain=options.terrain||(()=>0),r=build(T,rocks,options.clams||[],options.shelters||[],options.crabs||[],options.dens||[],options.landmarks||[],terrain,scene,grounded,footprints,id=>['dumboOcto','vampireSquid','nautilus'].includes(id),options.species||'commonOcto',{capabilities:{isWebGL2:true},extensions:{has:()=>true}},()=>{},()=>{});
  grounded.forEach(o=>o.position.y=terrain(o.position.x,o.position.z)+(o.userData.groundOffset||0));scene.updateMatrixWorld(true);return{r,rocks,scene,grounded,footprints,terrain};
}
function gapAt(world,index,species='commonOcto'){
  const gap=world.r.gaps[index],scale=species==='giantPacific'?1.4:species==='blueRinged'?.72:1,rest=.55*(species==='giantPacific'?scale:1),bed=world.terrain(gap.x,gap.z);
  return rules.crevice(gap,bed+rest,world.rocks,world.footprints,scale,species,bed,rest);
}
const movement=slice('            var proposedCrevice=','            // Deepest point of the run.');
const move=new Function('octopus','gameState','rocks','rockCollisionFootprints','bodyScale','speciesId','terrainHeight','floorRestY','movementOrigin','vertInput','capabilities',shared+movement);
function traverse(world,index,species,dt=1/60,direction=1,start){
  const gap=world.r.gaps[index],scale=species==='giantPacific'?1.4:species==='blueRinged'?.72:1,rest=.55*(species==='giantPacific'?scale:1);
  const p=start||new T.Vector3(gap.x,world.terrain(gap.x,gap.z-2.4)+rest,gap.z-2.4),octopus={position:p};let squeezed=false,state;
  for(let i=0;i<Math.ceil(2/dt);i++){
    const origin=p.clone();p.z+=direction*2.6*dt;state={verticalY:p.y};move(octopus,state,world.rocks,world.footprints,scale,species,world.terrain,rest,origin,0,{swimming:['cuttlefish','bobtailSquid'].includes(species)});p.y=state.verticalY;squeezed ||= !!state.crevice;
  }
  return{p,squeezed,state};
}
function release(world){const seen=new Set();world.rocks.forEach(r=>{r.geometry.dispose();if(!seen.has(r.material)){seen.add(r.material);r.material.dispose();}});}
describe('Cephalopod Hunter discoverable physical reef passages',()=>{
  it('adds exactly three retained weathered solids sharing one material and two honest gap centers',()=>{
    const world=reef(),r=world.r;assert.ok(r);assert.equal(r.rocks.length,3);assert.equal(world.rocks.length,3);assert.equal(new Set(r.rocks.map(o=>o.material)).size,1);
    assert.deepEqual(r.gaps.map(g=>g.width),[.30,.42]);assert.ok(r.rocks.every(o=>o.userData.clRefuge&&o.userData.groundOffset===0&&o.userData.reefFootprint));
    for(const rock of r.rocks){const g=rock.geometry;assert.equal(g.attributes.position.count,50);assert.ok(g.index.count>200);assert.ok([...g.attributes.position.array,...g.attributes.normal.array,...g.attributes.color.array].every(Number.isFinite));assert.ok(g.boundingBox.min.y>=0);assert.ok(g.boundingSphere.radius<2.1);}
    const small=gapAt(world,0),wide=gapAt(world,1);assert.ok(small&&wide);assert.ok(Math.abs(small.width-.30)<1e-6);assert.ok(Math.abs(wide.width-.42)<1e-6);release(world);
  });
  it('allows common and blue-ringed octopuses to squeeze the small passage, and giant Pacific octopuses only the wider passage',()=>{
    const world=reef();for(const id of ['commonOcto','blueRinged','mimicOcto','caribReef','coconutOcto'])assert.ok(gapAt(world,0,id),id);
    assert.equal(gapAt(world,0,'giantPacific'),null);assert.ok(gapAt(world,1,'giantPacific'));
    for(const id of ['cuttlefish','bobtailSquid','humboldtSquid','vampireSquid','nautilus','dumboOcto'])assert.equal(gapAt(world,0,id),null,id);release(world);
  });
  it('proves native slow entry and retreat through actual beveled mouths at 60Hz, 30Hz and capped timesteps',()=>{
    const world=reef();for(const dt of [1/60,1/30,.05])for(const[id,index]of [['commonOcto',0],['blueRinged',0],['giantPacific',1]]){
      const startZ=world.r.gaps[index].z-2.4,result=traverse(world,index,id,dt);assert.ok(result.squeezed,id+' entry '+dt);assert.ok(result.p.z>world.r.gaps[index].z+2.0,id+' passage '+dt);
      const back=traverse(world,index,id,dt,-1,result.p);assert.ok(back.squeezed,id+' retreat '+dt);assert.ok(Math.abs(back.p.z-startZ)<1e-6,id+' return '+dt);
    }release(world);
  });
  it('blocks a giant from the smaller opening and rigid cuttlefish from both while retaining a blue-ringed octopus ordinary clearance in the wider lane',()=>{
    const world=reef();for(const[id,index]of [['giantPacific',0],['cuttlefish',0],['cuttlefish',1]]){
      const result=traverse(world,index,id,.05);assert.equal(result.squeezed,false);assert.ok(result.p.z<world.r.gaps[index].z-1.45,id+' blocked '+index);
    }
    const blue=traverse(world,1,'blueRinged',.05);assert.equal(blue.squeezed,false);assert.ok(blue.p.z>world.r.z+2);release(world);
  });
  it('occludes predators from the side while keeping open mouths visible and forbidding a strike through a solid wall',()=>{
    const world=reef(),gap=world.r.gaps[0],player={position:new T.Vector3(gap.x,.55,gap.z)},coverRay=new T.Raycaster(),gameState={inkCloudsActive:[]};
    const spatial=slice('        function rockBlocks(','        function rememberPrey(')+slice('        function preyReadiness(','        function forageReady(');
    const behavior=new Function('THREE','rocks','octopus','coverRay','gameState','dens','shelters','DEN_RADIUS','SHELTER_DEN_RADIUS','FISH_CATCH_RANGE','distance3',spatial+';return {seen:predatorCanSee,ready:preyReadiness,sheltered:isShelteredNow};')(T,world.rocks,player,coverRay,gameState,[],[],2,1.5,3,(a,b)=>a.distanceTo(b));
    const predator={position:new T.Vector3(gap.x-4,.55,gap.z),userData:{kind:'grouper'}};assert.equal(behavior.seen(predator,10),false);assert.equal(behavior.sheltered(),false);
    predator.position.set(gap.x,.55,gap.z-3);assert.equal(behavior.seen(predator,10),true);
    const prey={position:new T.Vector3(gap.x+2,.55,gap.z),userData:{alive:true,cfg:{}}};assert.equal(behavior.ready(prey).reason,'cover');prey.position.set(gap.x,.55,gap.z+2);assert.equal(behavior.ready(prey).ready,true);release(world);
  });
  it('selects finite free approach lanes, advances around real blockers and skips a completely occupied starting reef',()=>{
    const empty=rules.site([],()=>0);assert.deepEqual(empty,{x:-8,z:-12});
    const occupied={minX:empty.x-3,maxX:empty.x+3,minZ:empty.z-4.2,maxZ:empty.z+4.2};const next=rules.site([occupied],()=>0);assert.ok(next);assert.notDeepEqual(next,empty);
    assert.equal(rules.site([{minX:-40,maxX:0,minZ:-40,maxZ:40}],()=>0),null);assert.equal(rules.site([],()=>NaN),null);assert.equal(rules.site([],(x,z)=>x*z),null);
    const tall=new T.Mesh(new T.BoxGeometry(6,3,9),new T.MeshBasicMaterial());tall.position.set(-8,1,-12);tall.updateMatrixWorld(true);const world=reef({landmarks:[{mesh:tall}]});assert.ok(world.r);assert.notDeepEqual({x:world.r.x,z:world.r.z},empty);release(world);tall.geometry.dispose();tall.material.dispose();
  });
  it('uses local terrain anchoring and rejects no-source-RNG fallback paths with a stable repeatable factory',()=>{
    const terrain=(x,z)=>Math.sin(x*.18)*Math.cos(z*.16)*.1,a=reef({terrain}),b=reef({terrain});assert.deepEqual(a.r.gaps,b.r.gaps);
    a.r.rocks.forEach((rock,i)=>{assert.ok(Math.abs(rock.position.y-terrain(rock.position.x,rock.position.z))<1e-12);assert.deepEqual(rock.geometry.attributes.position.array,b.r.rocks[i].geometry.attributes.position.array);});
    assert.equal(/Math\.random\s*\(/.test(shared+integration),false);for(const id of ['vampireSquid','dumboOcto','nautilus','humboldtSquid']){const world=reef({species:id});assert.equal(world.r,null);assert.equal(world.rocks.length,0);release(world);}release(a);release(b);
  });
  it('retains the paired stones and every cached buffer when distant rocks stream around the player',()=>{
    const old=new T.Mesh(new T.BoxGeometry(1,1,1),new T.MeshBasicMaterial());old.position.set(1000,.5,1000);const world=reef({rocks:[old]}),refs=world.r.rocks.map(r=>({r,p:r.position.clone(),g:r.geometry,a:r.geometry.attributes.position.array,m:r.material}));let calls=0;
    const stream=slice('              // Rocks\n','              // Corals\n'),apply=new Function('rocks','octopus','RECYCLE_DIST','recyclePos','var reefRocksMoved=false;'+stream+'return reefRocksMoved;');
    assert.equal(apply(world.rocks,{position:new T.Vector3(200,0,200)},120,()=>{calls++;return{x:205,z:205};}),true);assert.equal(calls,1);
    refs.forEach(ref=>{assert.ok(ref.r.position.equals(ref.p));assert.equal(ref.r.geometry,ref.g);assert.equal(ref.r.geometry.attributes.position.array,ref.a);assert.equal(ref.r.material,ref.m);});assert.ok(gapAt(world,0));release(world);
  });
});
