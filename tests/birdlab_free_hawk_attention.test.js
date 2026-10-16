import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { loadAvianFeatherArt } from './helpers/avian_feather_art_fixture.js';
const THREE=createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const scope={};new Function('window',readFileSync('stem_lab/birdlab_3d_engine.js','utf8'))(scope);
const perch=new THREE.Vector3(0,3.2,0);
function create(perches=[perch]) {return scope.BirdLab3D.createFreeHawk(perches,-.18);}
function observer(x,z,crouching=false) {return {position:new THREE.Vector3(x,crouching?1.03:1.65,z),speed:0,crouching};}
function run(hawk,seconds,viewer,dt=1/60) {for(let i=0;i<Math.round(seconds/dt);i++)hawk.update(dt,viewer);}
function renderedHawk() {
  const context={};
  for(const method of ['save','restore','translate','rotate','beginPath','closePath','clip','fillRect','moveTo','lineTo','bezierCurveTo','quadraticCurveTo','stroke','fill'])context[method]=()=>{};
  context.createLinearGradient=()=>({addColorStop(){}});
  const makeCanvas=()=>({width:16,height:16,getContext:()=>context});
  const local={AvianFeatherArt:{...loadAvianFeatherArt(),createFlightFeatherCanvas:makeCanvas,
    createVaneDetailCanvases:()=>({normal:makeCanvas(),roughness:makeCanvas()})}};
  new Function('window','document',readFileSync('stem_lab/birdlab_3d_bird.js','utf8'))(local,{createElement:makeCanvas});
  return local.BirdLab3DBird.create(THREE);
}

describe('Free hawk observer attention',()=>{
  it('builds vigilance smoothly without a 3.2 metre cliff and retains a quiet recovery',()=>{
    const near=create(),far=create(),viewer=observer(0,-1);
    expect(near.state.alertness).toBe(0);near.update(.05,viewer);
    expect(near.state.alertness).toBeGreaterThan(0);expect(near.state.alertness).toBeLessThan(.15);
    run(near,1,observer(0,-3.19));run(far,1.05,observer(0,-3.21));
    expect(Math.abs(near.state.alertness-far.state.alertness)).toBeLessThan(.025);
    run(near,1,viewer);const alert=near.state.alertness;
    near.update(.05,null);expect(near.state.alertness).toBeLessThan(alert);expect(near.state.alertness).toBeGreaterThan(alert*.98);
    run(near,18,null);expect(near.state.alertness).toBeLessThan(.02);
    expect(near.state.label).toContain('scanning');
  });

  it('turns toward the actual observer bearing and looks down from the perch with bounded head motion',()=>{
    const hawk=create(),right=observer(1.2,-2.3),left=observer(-1.2,-2.3);
    run(hawk,3,right);
    expect(hawk.state.pose.headYaw).toBeLessThan(-.30);expect(hawk.state.pose.gazePitch).toBeGreaterThan(.25);
    let previous=hawk.state.pose.headYaw;
    for(let frame=0;frame<180;frame++) {
      hawk.update(1/60,left);
      expect(Math.abs(hawk.state.pose.headYaw-previous)).toBeLessThanOrEqual(2/60+1e-10);
      previous=hawk.state.pose.headYaw;
    }
    expect(hawk.state.pose.headYaw).toBeGreaterThan(.30);
    const raised=observer(-1.2,-2.3);raised.position.y=5;
    run(hawk,2,raised);expect(hawk.state.pose.gazePitch).toBeLessThan(-.12);
  });

  it('is more vigilant about a direct approach than passing motion or a crouched approach',()=>{
    const direct=create(),passing=create(),quiet=create();
    for(let frame=0;frame<120;frame++) {
      const t=frame/60,range=4.5-.8*t,a=observer(0,-range),q=observer(0,-range,true);
      const p=observer(Math.sin(t*.23)*2.9,-Math.cos(t*.23)*2.9);
      direct.update(1/60,a);quiet.update(1/60,q);passing.update(1/60,p);
    }
    expect(direct.state.alertness).toBeGreaterThan(passing.state.alertness+.02);
    expect(direct.state.alertness).toBeGreaterThan(quiet.state.alertness+.12);
  });

  it('aims the actual folded head down toward the observer despite the perched neck carriage',()=>{
    const hawk=create(),bird=renderedHawk(),viewer=observer(1.2,-2.3);
    try {
      run(hawk,3,viewer);const state=hawk.state;
      bird.root.position.fromArray(state.position);
      bird.root.quaternion.setFromEuler(new THREE.Euler(state.pitch,state.yaw,state.bank,'YXZ'));
      bird.update({...state.pose,flapPhase:state.wingPhase,elapsedTime:state.time},0);bird.root.updateMatrixWorld(true);
      const orientation=new THREE.Quaternion();bird.joints.head.getWorldQuaternion(orientation).normalize();
      const forward=new THREE.Vector3(0,0,-1).applyQuaternion(orientation);
      // Vigilance still blends a little scanning into this respectful view;
      // a folded-neck offset must not lift the sightline back to the horizon.
      expect(forward.x).toBeGreaterThan(.25);expect(forward.y).toBeLessThan(-.20);expect(forward.z).toBeLessThan(-.75);
      expect(state.pose.gazePitch).toBeLessThanOrEqual(.5);
    }finally{bird.dispose();}
  });

  it('selects an outward lookout and keeps the whole escape arc away from the observer',()=>{
    const safe=new THREE.Vector3(-5,3,-2),unsafe=new THREE.Vector3(4,3,0);
    const hawk=create([perch,unsafe,safe]),viewer=observer(1,0);
    let airborne=false,landed=false,previousRange=1;
    for(let frame=0;frame<15*120;frame++) {
      const state=hawk.update(1/120,viewer),range=Math.hypot(state.position[0]-viewer.position.x,state.position[2]-viewer.position.z);
      if(['takeoff','gliding','landing'].includes(state.phase)) {
        airborne=true;expect(range).toBeGreaterThanOrEqual(previousRange-1e-8);previousRange=range;
      }
      if(airborne&&state.phase==='settling') {
        landed=true;expect(state.position).toEqual([safe.x,safe.y+.18,safe.z]);
        expect(state.recovering).toBe(true);break;
      }
    }
    expect(airborne&&landed).toBe(true);
    // A disturbance at the new lookout receives a recovery hold.
    const arrived=hawk.state.position.slice(),nearArrival=observer(safe.x+.1,safe.z);
    run(hawk,3,nearArrival);expect(hawk.state.position).toEqual(arrived);expect(hawk.state.recovering).toBe(true);
  });

  it('stays on its perch when every available escape route approaches the observer',()=>{
    const hawk=create([perch,new THREE.Vector3(4,3,0)]),viewer=observer(1,0),start=hawk.state.position.slice();
    for(let frame=0;frame<30*30;frame++) {
      hawk.update(1/30,viewer);expect(hawk.state.position).toEqual(start);expect(hawk.state.phase).toBe('perched');
    }
    expect(hawk.state.alertness).toBeGreaterThan(.8);
  });

  it('freezes all flight attention and attitude at zero dt and deterministically resets',()=>{
    const hawk=create([perch,new THREE.Vector3(6,3,-4),new THREE.Vector3(-5,2.8,-3)]),viewer=observer(0,1);
    const initial=JSON.stringify(hawk.state);
    // Preserve the existing immediate initial observation cue without motion.
    const still=hawk.state.position.slice();expect(hawk.update(0,viewer).label).toContain('Alert');expect(hawk.state.position).toEqual(still);
    run(hawk,6,viewer);expect(['takeoff','gliding','landing']).toContain(hawk.state.phase);
    const frozen=JSON.stringify(hawk.state);
    for(let i=0;i<40;i++)hawk.update(0,i%2?observer(20,-20):null);
    expect(JSON.stringify(hawk.state)).toBe(frozen);
    hawk.reset();expect(JSON.stringify(hawk.state)).toBe(initial);
    run(hawk,6,viewer);expect(JSON.stringify(hawk.state)).toBe(frozen);
  });
});
