import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const require=createRequire(import.meta.url),THREE=require(resolve('vendor/three-r128/three.min.js'));
const {restoreOriginalSeagrassSource}=require('./helpers/cephalopod_seagrass_reference.cjs');
const {restorePass37ReefSource,restorePass37RockSource,restorePass37CoralSource}=require('./helpers/cephalopod_reef_form_reference.cjs');
const {restorePass38CoralSource}=require('./helpers/cephalopod_coral_organic_reference.cjs');
const {restorePass44Source}=require('./helpers/cephalopod_pass44_reference.cjs');
const {restorePass46Source}=require('./helpers/cephalopod_pass46_reference.cjs');
const {restorePass47Source:restorePass47Only}=require('./helpers/cephalopod_pass47_reference.cjs');
const {restorePass48Source:restorePass48Only}=require('./helpers/cephalopod_pass48_reference.cjs');
// These historical hashes predate the current oral tissue surface and motion.
const restorePass47Source=source=>restorePass47Only(restorePass48Source(source));
const source=readFileSync(process.env.CEPHALOPOD_MODEL_SOURCE||'stem_lab/stem_tool_cephalopodlab.js','utf8').replace(/\r\n/g,'\n');
// Historical byte oracles exclude only the guarded surface/configuration edits; live fixtures use source.
const beforePlantSurface=require('./helpers/cephalopod_pass57_reference.cjs').restorePass57Source(source);
const original=JSON.parse(readFileSync(process.env.CEPHALOPOD_HABITAT_FIXTURE||'tests/fixtures/cephalopod_habitat_original.json','utf8'));
const sha=value=>createHash('sha256').update(value).digest('hex');
assert.equal(original.version,1);assert.equal(original.baselineSourceSha256,'22314e02f0487b3ac626f26450392da440b2ea04ed0e1118b1326d4898d51c7e');
assert.equal(sha(JSON.stringify(original.randomLines)),original.randomLinesSha256,'Frozen RNG oracle corrupted');
assert.equal(sha(original.grassRecyclingSource),original.grassRecyclingSha256,'Frozen original recycling oracle corrupted');
assert.deepEqual(original.contract,{grass:80,kelp:25,ownedSpawnDraws:525,originalGeometryAndFlex:true,originalRngCallSites:true,originalGrassRecycling:true});
function region(start,end,value=source){const a=value.indexOf(start),b=value.indexOf(end,a);assert.ok(a>=0&&b>a,'Missing actual production region: '+start);return value.slice(a,b);}
const plantHelpers=region('      function shadeCLHuntPlantFlex(','      function createCLHuntMarineSnowGeometry(');
// Literal approval guards restore only the reviewed pass28 flow formulas.
const approvedPlantFlowChanges=[
  {
    "name": "shadeCLHuntPlantFlex water pulse and ripple",
    "before": "      function shadeCLHuntPlantFlex(shader) {\n        shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\\n'+[\n          'uniform vec4 clPlantMotion;',\n          'vec2 clPlantWave(float t,float phase,float travel,float amplitude){float angle=phase-travel*t;float s=sin(angle);float c=cos(angle);return vec2(amplitude*t*t*s,amplitude*(2.0*t*s-travel*t*t*c));}',\n        ].join('\\n'));\n        shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\\n'+[\n          'float clPlantT=clamp(position.y/max(clPlantMotion.z,0.001),0.0,1.0);',\n          'float clPlantInstancePhase=0.0;',\n          '#ifdef USE_INSTANCING',\n          'clPlantInstancePhase=dot(instanceMatrix[3].xz,vec2(7.1,11.3));',\n          '#endif',\n          'vec2 clPlantX=clPlantWave(clPlantT,clPlantMotion.x+clPlantInstancePhase,1.6,0.12);',\n          'vec2 clPlantZ=clPlantWave(clPlantT,clPlantMotion.y+clPlantInstancePhase*0.73,2.1,0.035);',\n          'vec3 clPlantOffset=vec3(clPlantX.x,0.0,clPlantZ.x)*clPlantMotion.z*clPlantMotion.w;',\n          'vec2 clPlantSlope=vec2(clPlantX.y,clPlantZ.y)*clPlantMotion.w;',\n          'objectNormal.y-=dot(clPlantSlope,objectNormal.xz);',\n        ].join('\\n'));\n        shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\\ntransformed+=clPlantOffset;');\n      }",
    "after": "      function shadeCLHuntPlantFlex(shader) {\n        shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\\n'+[\n          'uniform vec4 clPlantMotion;',\n          'vec2 clPlantWave(float t,float phase,float travel,float amplitude){float angle=phase-travel*t;float ripple=phase*2.0+0.8-(travel+4.0)*t;float s=0.84*sin(angle)+0.16*sin(ripple);float c=0.84*travel*cos(angle)+0.16*(travel+4.0)*cos(ripple);return vec2(amplitude*t*t*s,amplitude*(2.0*t*s-t*t*c));}',\n          'float clPlantPulse(float phase,float sitePhase){return 0.72+0.28*(0.5+0.5*sin(phase-sitePhase));}',\n        ].join('\\n'));\n        shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\\n'+[\n          'float clPlantT=clamp(position.y/max(clPlantMotion.z,0.001),0.0,1.0);',\n          'float clPlantInstancePhase=0.0;',\n          'vec3 clPlantSite=modelMatrix[3].xyz;',\n          '#ifdef USE_INSTANCING',\n          'clPlantInstancePhase=dot(instanceMatrix[3].xz,vec2(7.1,11.3));',\n          'clPlantSite=(modelMatrix*vec4(instanceMatrix[3].xyz,1.0)).xyz;',\n          '#endif',\n          'float clPlantSitePhase=dot(clPlantSite.xz,vec2(0.075,0.055));',\n          'float clPlantPulseWeight=clPlantPulse(clPlantMotion.x,clPlantSitePhase);',\n          'vec2 clPlantX=clPlantWave(clPlantT,clPlantMotion.y+clPlantInstancePhase,1.6,0.12);',\n          'vec2 clPlantZ=clPlantWave(clPlantT,clPlantMotion.y+1.7+clPlantInstancePhase*0.73,2.1,0.035);',\n          'vec3 clPlantOffset=vec3(clPlantX.x,0.0,clPlantZ.x)*clPlantMotion.z*clPlantMotion.w*clPlantPulseWeight;',\n          'vec2 clPlantSlope=vec2(clPlantX.y,clPlantZ.y)*clPlantMotion.w*clPlantPulseWeight;',\n          'objectNormal.y-=dot(clPlantSlope,objectNormal.xz);',\n        ].join('\\n'));\n        shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\\ntransformed+=clPlantOffset;');\n      }"
  },
  {
    "name": "plant program cache key",
    "before": "return 'cl-plant-flex-v15';",
    "after": "return 'cl-plant-flex-v28-water-pulse';"
  },
  {
    "name": "plant slow shared pulse clock",
    "before": "        var turn=Math.PI*2,clock=now*rate;\n        motion.value.x=(clock+phase)%turn;motion.value.y=(clock*0.79+phase*1.17)%turn;motion.value.w=1;",
    "after": "        var turn=Math.PI*2,clock=now*rate;\n        motion.value.x=(now*0.00035)%turn;motion.value.y=(clock+phase)%turn;motion.value.w=1;"
  }
];
function reverseApprovedPlantFlow(value){
  for(const change of approvedPlantFlowChanges){assert.equal(value.split(change.after).length,2,'Approved plant flow guard missing or changed: '+change.name);value=value.replace(change.after,change.before);}
  return value;
}
// Literal reversal admits only the observed solid-rock caster policy; frozen geometry/RNG bytes remain protected.
const approvedRockShadowPolicy={"before":"          var rockMesh = new THREE.Mesh(rockGeo, new THREE.MeshStandardMaterial({ color: rockTint.clone().convertSRGBToLinear(), roughness: 0.92, flatShading: false }));","after":"          var rockMesh = new THREE.Mesh(rockGeo, new THREE.MeshStandardMaterial({ color: rockTint.clone().convertSRGBToLinear(), roughness: 0.92, flatShading: false, shadowSide: THREE.DoubleSide }));"};
function reverseApprovedRockShadowPolicy(value){assert.equal(value.split(approvedRockShadowPolicy.after).length,2,'Approved rock shadow face guard missing or changed');return value.replace(approvedRockShadowPolicy.after,approvedRockShadowPolicy.before);}
const reefHelpers=region('function createCLReefFootprint(','function createCLHuntAnimal(');
const composition=region('        // Five rock-rooted groves','        function updateGround(){');
const terrain=region('        function terrainHeight(','        function distance3(');
const grassSpawn=region('        var grass = [];','        // Terrain-conforming caustics:');
const kelpSpawn=region('        var kelpStrands = [];','        // ─── Hydrothermal vent');
function stream(initial=2741){let state=initial>>>0;const draws=[],math=Object.create(Math);math.random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;const value=state/4294967296;draws.push(value);return value;};return{math,draws};}
const denyRandom=Object.create(Math);denyRandom.random=()=>{throw new Error('Composition consumed gameplay RNG');};
const actualFootprint=new Function('Math',reefHelpers+';return createCLReefFootprint;')(denyRandom);
function release(scene){scene.traverse(object=>{object.geometry?.dispose();if(Array.isArray(object.material))object.material.forEach(material=>material.dispose());else object.material?.dispose();});}
function owned(scene){return scene.children.filter(object=>object.name==='cl-kelp'||object.name==='cl-seagrass').map(mesh=>({mesh,geometry:mesh.geometry,material:mesh.material,position:mesh.position.toArray(),rotation:mesh.rotation.toArray(),buffers:Object.fromEntries(Object.entries(mesh.geometry.attributes).map(([name,attribute])=>[name,{attribute,array:attribute.array,bytes:Buffer.from(attribute.array.buffer,attribute.array.byteOffset,attribute.array.byteLength).toString('hex')}])),instances:mesh.instanceMatrix?.array,instanceBytes:mesh.instanceMatrix?Buffer.from(mesh.instanceMatrix.array.buffer).toString('hex'):null}));}

// Execute the real reef and plant construction blocks. This CPU fixture begins
// at the low-power sand RNG prefix; the full natural scene is covered by browser QA.
// Kelp's intervening animal/UI construction is deliberately outside this CPU fixture.
function construct(seed=2741){
  const rng=stream(seed);for(let draw=0;draw<8400;draw++)rng.math.random();
  const rocks=region('        var rocks = [];','        // ─── Curved branching coral colonies');
  const corals=region('        // ─── Curved branching coral colonies','        // ─── Sea grass');
  const settle=region('        function settleReefCorals(','        // Five rock-rooted groves');
  const grounding=region('        var grounded=rocks.concat(','        function settleReefCorals(');
  const updateGround=region('        function updateGround(){','        // A repeatable opening');
  const opening=region('        // A repeatable opening','        if(isDeepSpecies(speciesId))');
  const denPositions=region('        var DEN_POSITIONS = [','        var dens = [];');
  const result=new Function('THREE','Math',plantHelpers+reefHelpers+terrain+`
    var scene=new THREE.Scene(),renderer={capabilities:{isWebGL2:false},extensions:{has:function(){return false;}}};
    function reefSurface(){}
    `+rocks+corals+grassSpawn+kelpSpawn+denPositions+`
    var dens=DEN_POSITIONS.map(function(pos){var group=new THREE.Group();group.position.set(pos.x,0,pos.z);return{group:group,x:pos.x,z:pos.z};});
    var shelters=[],crabs=[],clams=[new THREE.Object3D()];
    `+grounding+settle+composition+updateGround+`
    var initial=grass.concat(kelpStrands).map(function(plant){return{mesh:plant.mesh,position:plant.mesh.position.toArray(),rotation:plant.mesh.rotation.toArray(),phase:plant.phase,height:plant.mesh.geometry.userData.clPlantHeight};});
    `+opening+`
    updateGround();
    return{scene:scene,rocks:rocks,corals:corals,grass:grass,kelp:kelpStrands,dens:dens,shelters:shelters,initial:initial,groves:clHabitatGroves,settle:settleCLHuntHabitatPlants,clear:clHabitatSiteClear,terrain:terrainHeight,ground:updateGround};
    `)(THREE,rng.math);
  return{...result,draws:rng.draws};
}
function verifySite(fixture,mesh,near=null,min=0,max=78){
  const data=mesh.userData.clHabitat,{x,z}=mesh.position,r=data.radius;
  assert.ok(data.valid&&mesh.visible,'Expected an active accepted habitat site');
  assert.ok(Number.isFinite(r)&&r>0);
  assert.ok(Math.hypot(x-(near?.x||0),z-(near?.z||0))>=min-1e-10);
  assert.ok(Math.hypot(x-(near?.x||0),z-(near?.z||0))<=max+1e-10);
  assert.ok(x+r<=24);
  for(const bounds of [{minX:-4.5,maxX:4.5,minZ:-5,maxZ:4.5},{minX:0,maxX:7,minZ:-5,maxZ:10}])assert.ok(!(x+r>bounds.minX&&x-r<bounds.maxX&&z+r>bounds.minZ&&z-r<bounds.maxZ),'Plant occupies reserved sand');
  for(const den of fixture.dens){const dx=x-den.x,dz=z-den.z,yaw=den.group.rotation.y,forward=dx*Math.sin(yaw)+dz*Math.cos(yaw),side=dx*Math.cos(yaw)-dz*Math.sin(yaw);assert.ok(dx*dx+dz*dz>=(3+r)**2);assert.ok(!(Math.abs(side)<1.85+r&&forward>-1.1-r&&forward<7+r),'Plant obscures den approach');}
  for(const obstacle of fixture.rocks.concat(fixture.corals)){
    if(obstacle.userData.reefPlacementValid===false)continue;
    // Recompute from actual vertices; do not merely trust the helper's valid flag or cached footprint.
    const f=actualFootprint(THREE,obstacle),margin=r+.12;
    assert.ok(!(x+margin>obstacle.position.x+f.minX&&x-margin<obstacle.position.x+f.maxX&&z+margin>obstacle.position.z+f.minZ&&z-margin<obstacle.position.z+f.maxZ),'Plant intersects actual reef footprint');
  }
  assert.ok(Math.abs(mesh.position.y-fixture.terrain(x,z)-mesh.userData.groundOffset)<1e-10,'Plant root lost terrain grounding');
}
function sameResources(rows){for(const row of rows){assert.equal(row.mesh.geometry,row.geometry);assert.equal(row.mesh.material,row.material);assert.deepEqual(row.mesh.rotation.toArray(),row.rotation);assert.equal(row.mesh.instanceMatrix?.array,row.instances);if(row.instances)assert.equal(Buffer.from(row.instances.buffer).toString('hex'),row.instanceBytes);for(const [name,before] of Object.entries(row.buffers)){const actual=row.geometry.attributes[name];assert.equal(actual,before.attribute);assert.equal(actual.array,before.array);assert.equal(Buffer.from(actual.array.buffer,actual.array.byteOffset,actual.array.byteLength).toString('hex'),before.bytes);}}}

describe('Cephalopod Hunter deterministic habitat composition',()=>{
  it('preserves baseline random call sites, plant geometry and spawn bytes after reversing only approved water flow and rock shadow faces',()=>{
    const randomLines=value=>value.split('\n').filter(line=>line.includes('Math.random'));
    assert.deepEqual(randomLines(restorePass46Source(restorePass47Source(source))),original.randomLines);
    const protectedRegions=[['plantFactoryAndFlex','      function shadeCLHuntPlantFlex(','      function createCLHuntMarineSnowGeometry('],['grassSpawn','        var grass = [];','        // Terrain-conforming caustics:'],['kelpSpawn','        var kelpStrands = [];','        // ─── Hydrothermal vent'],['rockSpawn','        var rocks = [];','        // ─── Curved branching coral colonies'],['coralFactoryAndSpawn','        // ─── Curved branching coral colonies','        // ─── Sea grass']];
    assert.deepEqual(original.protectedRegions.map(entry=>entry.name),protectedRegions.map(entry=>entry[0]));
    for(const [name,start,end] of protectedRegions){const live=region(start,end,beforePlantSurface),restored=name==='plantFactoryAndFlex'?reverseApprovedPlantFlow(restoreOriginalSeagrassSource(live)):name==='rockSpawn'?reverseApprovedRockShadowPolicy(restorePass37RockSource(restorePass44Source(live))):name==='coralFactoryAndSpawn'?restorePass37CoralSource(restorePass38CoralSource(live)):live;assert.equal(sha(restored),original.protectedRegions.find(entry=>entry.name===name).sha256,'Baseline owned region drifted: '+name);}
  });

  it('casts solid reef rocks from both faces while keeping opaque receivers and other habitat material policies',()=>{
    for(const seed of [2741,73,12345]){const fixture=construct(seed);try{
      assert.ok(fixture.rocks.length>0);assert.equal(new Set(fixture.rocks.map(rock=>rock.geometry)).size,fixture.rocks.length);assert.equal(new Set(fixture.rocks.map(rock=>rock.material)).size,fixture.rocks.length);
      for(const rock of fixture.rocks){assert.equal(rock.material.shadowSide,THREE.DoubleSide,'Solid reef rock must cast both surface faces');assert.equal(rock.material.side,THREE.FrontSide,'Rock surface receiver remains FrontSide');assert.equal(rock.material.type,'MeshStandardMaterial');assert.equal(rock.material.transparent,false);assert.equal(rock.material.opacity,1);assert.equal(rock.castShadow,true);assert.equal(rock.receiveShadow,true);}
      for(const mesh of fixture.corals.concat(fixture.grass.map(plant=>plant.mesh),fixture.kelp.map(plant=>plant.mesh)))assert.equal(mesh.material.shadowSide,null,'Other habitat caster policy remains stock');
    }finally{release(fixture.scene);}}
  },90000);

  it('retains actual plant spawn order and all 525 owned random draws, resource counts, heights, yaw and phase',()=>{
    const rng=stream(),plain=new Function('THREE','Math',plantHelpers+';var renderer={capabilities:{isWebGL2:true}};var scene=new THREE.Scene();'+grassSpawn+kelpSpawn+';return{scene:scene,grass:grass,kelp:kelpStrands};')(THREE,rng.math);
    const expected=stream();for(let i=0;i<525;i++)expected.math.random();
    try{
      assert.deepEqual(rng.draws,expected.draws);assert.equal(plain.grass.length,80);assert.equal(plain.kelp.length,25);
      assert.deepEqual(plain.scene.children.map(mesh=>mesh.name),Array(80).fill('cl-seagrass').concat(Array(25).fill('cl-kelp')));
      assert.equal(new Set(plain.scene.children.map(mesh=>mesh.geometry)).size,105);assert.equal(new Set(plain.scene.children.map(mesh=>mesh.material)).size,105);
      let at=0;for(const [kind,plants] of [['grass',plain.grass],['kelp',plain.kelp]])for(const plant of plants){const span=kind==='grass'?120:100,height=kind==='grass'?.6+rng.draws[at+2]*1.3:5+rng.draws[at+2]*4;assert.deepEqual(plant.mesh.position.toArray(),[(rng.draws[at]-.5)*span,kind==='grass'?.05:0,(rng.draws[at+1]-.5)*span]);assert.equal(plant.mesh.geometry.userData.clPlantHeight,height);assert.equal(plant.mesh.rotation.y,rng.draws[at+3]*Math.PI);assert.equal(plant.phase,rng.draws[at+4]*Math.PI*2);at+=5;}
    }finally{release(plain.scene);}
  });

  it('composes the actual settled reef into five rock-rooted groves with clear sand and den paths',()=>{
    for(const seed of [2741,73,12345]){
      const fixture=construct(seed);
      try{
        assert.equal(fixture.grass.length,80);assert.equal(fixture.kelp.length,25);
        assert.equal(new Set(fixture.groves.map(grove=>grove.rockIndex)).size,5);assert.ok(fixture.groves.every(grove=>grove.rockIndex>=0));
        let changed=0;for(const [kind,plants,count] of [['grass',fixture.grass,16],['kelp',fixture.kelp,5]]){
          const totals=Array(5).fill(0);
          for(const plant of plants){const mesh=plant.mesh,data=mesh.userData.clHabitat;assert.equal(data.kind,kind);assert.equal(data.grove,Math.floor(data.index/count));totals[data.grove]++;verifySite(fixture,mesh);const original=fixture.initial.find(row=>row.mesh===mesh);assert.equal(data.seedX,original.position[0]);assert.equal(data.seedZ,original.position[2]);assert.equal(mesh.geometry.userData.clPlantHeight,original.height);assert.deepEqual(mesh.rotation.toArray(),original.rotation);assert.equal(plant.phase,original.phase);if(Math.hypot(mesh.position.x-data.seedX,mesh.position.z-data.seedZ)>.1)changed++;const anchor=fixture.rocks[data.anchorIndex],footprint=actualFootprint(THREE,anchor),rockRadius=Math.hypot(Math.max(Math.abs(footprint.minX),Math.abs(footprint.maxX)),Math.max(Math.abs(footprint.minZ),Math.abs(footprint.maxZ)));assert.ok(Math.hypot(mesh.position.x-anchor.position.x,mesh.position.z-anchor.position.z)<=rockRadius+data.radius+7,'Placement escaped its local rock grove');}
          assert.deepEqual(totals,Array(5).fill(count));
        }
        assert.ok(changed>=95,'Composition did not materially regroup the accepted plants');
        for(let grove=0;grove<5;grove++){const heights=fixture.kelp.slice(grove*5,grove*5+5).map(plant=>plant.baseHeight);assert.ok(Math.max(...heights)-Math.min(...heights)>.1,'Grove lost seeded height variation');}
      }finally{release(fixture.scene);}
    }
  },90000);

  it('keeps stable habitat resources and positions without random draws or repeated buffer uploads',()=>{
    const fixture=construct(),rows=owned(fixture.scene),positions=rows.map(row=>row.mesh.position.toArray()),draws=fixture.draws.length;
    try{for(let tick=0;tick<8;tick++)fixture.settle(null,false);assert.equal(fixture.draws.length,draws);sameResources(rows);assert.deepEqual(rows.map(row=>row.mesh.position.toArray()),positions);}
    finally{release(fixture.scene);}
  });

  it('preserves actual baseline grass recycle eligibility and draw order through several player locations',()=>{
    const fixture=construct(),rows=owned(fixture.scene),candidateRng=stream(5567),baselineRng=stream(5567),baseline=fixture.initial.slice(0,80).map(row=>({mesh:{position:{x:row.position[0],z:row.position[2]},rotation:{y:row.rotation[1]}}}));
    const recycleSource=region('              // Grass\n','              // Crabs (alive');
    const recycle=new Function('grass','octopus','Math','recyclePos','RECYCLE_DIST',recycleSource);
    const recycleBaseline=new Function('grass','octopus','Math','recyclePos','RECYCLE_DIST',original.grassRecyclingSource);
    try{
      for(const near of [{x:-80,z:110},{x:-140,z:160},{x:-50,z:70},{x:0,z:0}]){
        const recyclePos=()=>{const angle=candidateRng.math.random()*Math.PI*2,radius=55+candidateRng.math.random()*40;return{x:near.x+Math.sin(angle)*radius,z:near.z+Math.cos(angle)*radius};};
        recycle(fixture.grass,{position:near},candidateRng.math,recyclePos,120);
        const recycleBaselinePos=()=>{const angle=baselineRng.math.random()*Math.PI*2,radius=55+baselineRng.math.random()*40;return{x:near.x+Math.sin(angle)*radius,z:near.z+Math.cos(angle)*radius};};
        recycleBaseline(baseline,{position:near},baselineRng.math,recycleBaselinePos,120);
        assert.deepEqual(candidateRng.draws,baselineRng.draws,'Visual composition shifted original streaming RNG');
        for(let i=0;i<80;i++){const mesh=fixture.grass[i].mesh;assert.equal(mesh.userData.clHabitat.seedX,baseline[i].mesh.position.x);assert.equal(mesh.userData.clHabitat.seedZ,baseline[i].mesh.position.z);assert.equal(mesh.rotation.y,baseline[i].mesh.rotation.y);}
        const recycled=fixture.grass.filter(plant=>plant.mesh.userData.clHabitat.dirty).map(plant=>plant.mesh);
        fixture.settle(near,false);for(const mesh of recycled)if(mesh.visible)verifySite(fixture,mesh,near,55,95);
      }
      // Existing recycling deliberately refreshes yaw; resource/buffer identity still remains exact.
      for(const row of rows)row.rotation=row.mesh.rotation.toArray();sameResources(rows);
    }finally{release(fixture.scene);}
  },90000);

  it('keeps composition outside per-frame animation and leaves grounding, cleanup and resource lifecycle intact',()=>{
    assert.ok(!composition.includes('Math.random'));assert.ok(!/new THREE\.|\.clone\(|\.dispose\(|setAttribute\(|needsUpdate/.test(composition));
    assert.ok(source.includes('        settleReefCorals(null,[]);\n        settleCLHuntHabitatPlants(null,true);'));
    assert.ok(source.includes('              settleCLHuntHabitatPlants(octopus.position,reefRocksMoved);'));
    const tick=source.indexOf('if (!gameState._recycleNextAt || now > gameState._recycleNextAt)'),call=source.indexOf('settleCLHuntHabitatPlants(octopus.position,reefRocksMoved);');assert.ok(tick>=0&&call>tick);assert.equal(source.match(/settleCLHuntHabitatPlants\(/g).length,3);
    for(const text of ['updateCLHuntPlantFlex(k.flex,now,k.phase,0.0008,gameState.a11y.reducedMotion);','updateCLHuntPlantFlex(g.flex,now,g.phase,0.001,gameState.a11y.reducedMotion);','grounded.forEach(function(o){if(o)o.position.y=terrainHeight(o.position.x,o.position.z)+o.userData.groundOffset;});','if(disposed)return;','scene.traverse(function(obj) {','if (obj.geometry) obj.geometry.dispose();'])assert.ok(source.includes(text),'Protected static lifecycle changed: '+text);
  });
});

// Historical references predate the ink surface. Keep live fixtures on current visuals.
function restorePass48Source(source){return restorePass48Only(require('./helpers/cephalopod_pass49_reference.cjs').restorePass49Source(require('./helpers/cephalopod_pass50_reference.cjs').restorePass50Source(require('./helpers/cephalopod_pass51_reference.cjs').restorePass51Source(require('./helpers/cephalopod_pass52_reference.cjs').restorePass52Source(require('./helpers/cephalopod_pass53_reference.cjs').restorePass53Source(require('./helpers/cephalopod_pass54_reference.cjs').restorePass54Source(source)))))));}
