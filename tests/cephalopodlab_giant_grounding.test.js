import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url),THREE=require('../vendor/three-r128/three.min.js');
const source=readFileSync('stem_lab/stem_tool_cephalopodlab.js','utf8').replace(/\r\n/g,'\n');
function expressionBetween(label,before,after){
  const start=source.indexOf(before);
  if(start<0)throw Error(`${label}: missing opening source anchor ${JSON.stringify(before)}`);
  if(source.indexOf(before,start+before.length)>=0)throw Error(`${label}: duplicate opening source anchor ${JSON.stringify(before)}`);
  const end=source.indexOf(after,start+before.length);
  if(end<0)throw Error(`${label}: missing closing source anchor ${JSON.stringify(after)}`);
  const expression=source.slice(start+before.length,end).trim();
  if(!expression||expression.includes(';'))throw Error(`${label}: source anchors did not isolate one expression`);
  return expression;
}
const rigStart=source.indexOf('function createCLHuntAnimal('),rigEnd=source.indexOf('// Compact, individually owned prey rig.',rigStart);
const terrainStart=source.indexOf('function terrainHeight(x,z){'),terrainEnd=source.indexOf('function distance3(',terrainStart);
if(rigStart<0||rigEnd<=rigStart||terrainStart<0||terrainEnd<=terrainStart)throw Error('Cannot isolate production rig and terrain');
const build=new Function('T','species','Math',source.slice(rigStart,rigEnd)+';return createCLHuntAnimal(T,species);');
const terrainHeight=new Function(source.slice(terrainStart,terrainEnd)+';return terrainHeight;')();
const baseRest=Number(source.match(/var FLOOR_REST_Y = ([\d.]+);/)[1]);
const restMatch=source.match(/var floorRestY=([^;]+);/);
if(!restMatch)throw Error('Species-local floor rest height is missing');
const restFor=new Function('FLOOR_REST_Y','speciesId','bodyScale','return '+restMatch[1]+';');
const rootY=new Function('gameState','isJetting','now','return '+source.match(/octopus\.position\.y = ([^;]+);/)[1]+';');
const aboveFloor=new Function('gameState','octopus','terrainHeight','floorRestY','return '+expressionBetween('Propulsion floor distance','aboveFloor:',',recovering:')+';');
const substrateDistance=new Function('gameState','octopus','terrainHeight','floorRestY','return '+expressionBetween('Substrate floor distance','var distFromFloor = ',';\n            var substrateContact = ')+';');
const motionStart=source.indexOf('gameState.verticalY = (gameState.verticalY ||'),motionEnd=source.indexOf('rocks.forEach(',motionStart);
if(motionStart<0||motionEnd<=motionStart)throw Error('Cannot isolate production altitude clamp');
const move=new Function('gameState','octopus','terrainHeight','floorRestY','vertInput','vertSpeed','dt','capabilities',source.slice(motionStart,motionEnd)+';return gameState.verticalY;');
const noRandom=Object.assign(Object.create(Math),{random(){throw Error('Grounding consumed dive RNG');}}),allocated=[];
const ids=['commonOcto','blueRinged','mimicOcto','giantPacific','caribReef','coconutOcto','humboldtSquid','nautilus','cuttlefish','bobtailSquid','dumboOcto','vampireSquid'];
function rig(id){const animal=build(THREE,{id,bodyColor:0xbc6048},noRandom);allocated.push(animal);return animal;}
afterEach(()=>{for(const animal of allocated.splice(0)){const geometries=new Set(),materials=new Set();animal.root.traverse(o=>{if(o.isMesh){geometries.add(o.geometry);materials.add(o.material);}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}});

describe('Giant Pacific octopus floor clearance',()=>{
  it('scales only the giant player rest height and uses it at spawn and state initialization',()=>{
    expect(baseRest).toBe(.55);
    const spawn=source.match(/octopus\.position\.set\(0,([^,]+),0\); scene\.add\(octopus\);/)[1];
    const initial=source.match(/verticalY: ([^,]+),\s*\/\/ current octopus depth altitude/)[1];
    for(const id of ids){const animal=rig(id),rest=restFor(baseRest,id,animal.scale);
      expect(rest,id).toBeCloseTo(id==='giantPacific'?.77:.55,10);
      expect(new Function('floorRestY','return '+spawn+';')(rest)).toBe(rest);
      expect(new Function('floorRestY','return '+initial+';')(rest)).toBe(rest);
    }
  });

  it('clears actual reef terrain with all rendered body vertices and sucker instances across sampled idle and walking poses',()=>{
    const animal=rig('giantPacific'),rest=restFor(baseRest,'giantPacific',animal.scale);
    const vertex=new THREE.Vector3(),matrix=new THREE.Matrix4(),world=new THREE.Matrix4();
    const times=[0,.25,.5,.75,1,1.25,1.5,2,3,4,5,6,7,8],yaws=[0,.8,1.6,2.4];
    let baselineMin=Infinity,candidateMin=Infinity,poses=0,instanceSamples=0;
    for(const moving of [false,true])for(const time of times){
      animal.update(time,.05,{moving,jet:false,strike:0,camo:0,substrate:'sand',reducedMotion:false});
      for(const yaw of yaws){
        animal.root.rotation.y=yaw;animal.root.position.y=rootY({verticalY:rest,a11y:{reducedMotion:false}},false,time*1000);animal.root.updateMatrixWorld(true);poses++;
        let poseMin=Infinity;
        animal.root.traverseVisible(mesh=>{if(!mesh.isMesh)return;const p=mesh.geometry.attributes.position,count=mesh.isInstancedMesh?mesh.count:1;
          for(let instance=0;instance<count;instance++){
            if(mesh.isInstancedMesh){mesh.getMatrixAt(instance,matrix);world.multiplyMatrices(mesh.matrixWorld,matrix);instanceSamples++;}else world.copy(mesh.matrixWorld);
            for(let i=0;i<p.count;i++){vertex.fromBufferAttribute(p,i).applyMatrix4(world);poseMin=Math.min(poseMin,vertex.y-terrainHeight(vertex.x,vertex.z));}
          }
        });
        expect(Number.isFinite(poseMin)).toBe(true);
        expect(poseMin,`moving=${moving}, t=${time}, yaw=${yaw}`).toBeGreaterThan(0);
        candidateMin=Math.min(candidateMin,poseMin);baselineMin=Math.min(baselineMin,poseMin-(rest-baseRest));
      }
    }
    expect(poses).toBe(112);expect(instanceSamples).toBeGreaterThan(0);
    expect(baselineMin).toBeLessThan(-.19);expect(candidateMin).toBeGreaterThan(.01);
  },20000);

  it('shares the floor reference with propulsion and camouflage while preserving ascent, descent and depth clamps',()=>{
    const octopus={position:{x:0,z:0}},capabilities={swimming:false};
    for(const id of ids){const animal=rig(id),rest=restFor(baseRest,id,animal.scale);
      for(const floor of [-20,0,3]){const terrain=()=>floor,state={verticalY:floor+rest-.2};
        expect(move(state,octopus,terrain,rest,0,2.5,.05,capabilities)).toBeCloseTo(floor+rest,10);
        expect(aboveFloor(state,octopus,terrain,rest)).toBeCloseTo(0,10);
        expect(substrateDistance(state,octopus,terrain,rest)).toBeCloseTo(0,10);
        state.verticalY+=.8;expect(aboveFloor(state,octopus,terrain,rest)).toBeCloseTo(.8,10);expect(substrateDistance(state,octopus,terrain,rest)).toBeCloseTo(.8,10);
      }
      expect(move({verticalY:undefined},octopus,()=>0,rest,0,2.5,.1,capabilities)).toBe(rest);
      expect(move({verticalY:10},octopus,()=>0,rest,1,2.5,.1,capabilities)).toBe(10.25);
      expect(move({verticalY:10},octopus,()=>0,rest,-1,2.5,.1,capabilities)).toBe(9.75);
      expect(move({verticalY:18},octopus,()=>0,rest,1,2.5,.1,capabilities)).toBe(18);
      expect(move({verticalY:-45},octopus,()=>-55,rest,-1,2.5,.1,{swimming:true})).toBe(-45);
    }
  });
});
