import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/birdlab_3d_bird.js', 'utf8');
const start = source.indexOf('    function strokeCycle(');
const end = source.indexOf('    function dispose()', start);
if (start < 0 || end < 0) throw new Error('Missing bird pose writer');
const envelope = 'var recoveryArticulation = 1 - (1 - amplitude) * (1 - amplitude) * (1 - brake);';
if (!source.includes(envelope)) throw new Error('Missing recovery envelope');

// Retain real Euler/quaternion joints and run the production pose writer.
// Geometry attachments and feather lengths have separate full-rig checks.
function fixture(disableSettling = false) {
  return new Function('THREE', `
    var disposed=false,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
    var smooth=(a,b,v)=>{var t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};
    var joint=()=>new THREE.Object3D(),updateCarpalBridge=()=>{};
    var alulaJoint=()=>{var p=joint();p.userData={restPosition:new THREE.Vector3(),quillRoot:new THREE.Vector3(),closedQuillRoot:new THREE.Vector3()};return p;};
    var foldedPigment={value:0},upperBody=joint(),head=joint(),torso=joint(),tail=joint(),eyes=[joint(),joint()];
    var blinkClosure={value:0},eyelids=[{visible:false},{visible:false}],feet=[];
    var wings=[-1,1].map(side=>({side,shoulder:joint(),wrist:joint(),alula:alulaJoint(),
      meshes:[{morphTargetInfluences:[0,0]}],primaries:Array.from({length:8},()=>{
        var p=joint();p.userData={vane:{morphTargetInfluences:[0,0]},quillAxis:new THREE.Vector3(side,.05,.5).normalize(),
          quillRotation:new THREE.Quaternion(),restPosition:new THREE.Vector3(),quillRoot:new THREE.Vector3(),closedQuillRoot:new THREE.Vector3()};return p;
      })}));
    var tailFeathers=Array.from({length:12},(_,i)=>({across:(i-5.5)/5.5,mesh:Object.assign(joint(),{morphTargetInfluences:[0]})}));
    ${source.slice(start, end).replace(envelope, disableSettling ? 'var recoveryArticulation = 1;' : envelope)}
    var frame=j=>[...j.position.toArray(),...j.quaternion.toArray()];
    return {update,wings,snapshot:()=>wings.flatMap(w=>[...frame(w.shoulder),...frame(w.wrist),...frame(w.alula),
      ...w.primaries.flatMap(p=>[...frame(p),...p.userData.vane.morphTargetInfluences])])};
  `)(THREE);
}

const engine = {};
new Function('window', readFileSync('stem_lab/birdlab_3d_engine.js', 'utf8'))(engine);
const coursePose = time => ({ ...engine.BirdLab3D.sampleFlight(time).pose,
  flapPhase: engine.BirdLab3D.sampleWingPhase(time), elapsedTime: time });
const pose = (phase, extra = {}) => ({ flapPhase: phase, flapAmplitude: .4, fold: 0, elapsedTime: 9.5, ...extra });

describe('BirdLab recovery settling', () => {
  it('keeps weak-beat elevation while reducing hand curl, with bounded mirrored changes', () => {
    const model=fixture(),control=fixture(true);
    let reducedFold=0,reducedPitch=0;
    for (let tick=0;tick<=160;tick++) {
      const frame=pose(tick*Math.PI/80);
      model.update(frame,0);control.update(frame,0);
      const left=model.wings[0],right=model.wings[1],plain=control.wings[1];
      expect(right.shoulder.rotation.toArray()).toEqual(plain.shoulder.rotation.toArray());
      expect(right.wrist.rotation.z).toBe(plain.wrist.rotation.z);
      // The supporting hand remains more open during recovery.
      const foldReduction=right.wrist.rotation.y-plain.wrist.rotation.y;
      const pitchReduction=plain.wrist.rotation.x-right.wrist.rotation.x;
      expect(foldReduction).toBeGreaterThanOrEqual(-1e-12);
      expect(pitchReduction).toBeGreaterThanOrEqual(-1e-12);
      expect(foldReduction).toBeLessThan(.051);
      expect(pitchReduction).toBeLessThan(.035);
      reducedFold=Math.max(reducedFold,foldReduction);reducedPitch=Math.max(reducedPitch,pitchReduction);
      expect(left.wrist.rotation.y).toBe(-right.wrist.rotation.y);
      expect(left.wrist.rotation.x).toBe(right.wrist.rotation.x);
      for(let finger=0;finger<8;finger++) {
        const l=left.primaries[finger].quaternion,r=right.primaries[finger].quaternion;
        expect(l.x).toBeCloseTo(r.x,12);expect(l.y).toBeCloseTo(-r.y,12);
        expect(l.z).toBeCloseTo(-r.z,12);expect(l.w).toBeCloseTo(r.w,12);
      }
    }
    expect(reducedFold).toBeGreaterThan(.048);
    expect(reducedPitch).toBeGreaterThan(.033);
  });

  it('preserves full-power strokes, glide, fully folded wings and the complete landing flare exactly', () => {
    const model=fixture(),control=fixture(true);
    for(const extra of [{flapAmplitude:1},{flapAmplitude:0,wingSupport:.6,wingSweep:.8},
      {fold:1},{brake:1,flapAmplitude:.54,fold:.15}])for(let tick=0;tick<=48;tick++) {
      const frame=pose(tick*Math.PI/24,extra);model.update(frame,0);control.update(frame,0);
      // JSON normalizes signed zero; both signs encode the same rotation.
      expect(JSON.stringify(model.snapshot())).toBe(JSON.stringify(control.snapshot()));
    }
  });

  it('eases through the real course transitions and flattens the final recovery beats', () => {
    const model=fixture(),control=fixture(true),h=.0001;
    for(const time of [8.5,9.6,10,23,23.5,24.8,25.6,34.5,35.6,37.5,38.5]) {
      const frames=[-2,-1,0,1,2].map(offset=>{model.update(coursePose(time+offset*h),0);return model.snapshot();});
      for(let axis=0;axis<frames[0].length;axis++) {
        const [a,b,c,d,e]=frames.map(frame=>frame[axis]);
        expect(Math.abs((3*c-4*b+a)/(2*h)-(-3*c+4*d-e)/(2*h))).toBeLessThan(.002);
      }
    }
    for(const [from,to] of [[8.5,10],[24.8,25.6]]) {
      let maximumDifference=0;
      for(let tick=0;tick<=100;tick++) {
        const frame=coursePose(from+(to-from)*tick/100);
        model.update(frame,0);control.update(frame,0);
        maximumDifference=Math.max(maximumDifference,model.wings[1].wrist.rotation.y-control.wings[1].wrist.rotation.y);
      }
      expect(maximumDifference).toBeGreaterThan(.025);
      expect(maximumDifference).toBeLessThan(.051);
    }
  });

  it('reproduces paused and sought poses after different playback rates without replacing joint objects', () => {
    const model=fixture(),target=coursePose(9.5),retained=model.wings.flatMap(w=>[w.shoulder,w.wrist,...w.primaries]);
    model.update(target,0);const reference=model.snapshot();
    for(const rate of [30,60,144]) {
      for(let tick=0;tick<rate;tick++)model.update(coursePose(8.5+tick/rate*1.5),1/rate);
      model.update(target,1/rate);expect(model.snapshot()).toEqual(reference);
    }
    model.update(target,0);expect(model.snapshot()).toEqual(reference);
    model.wings.flatMap(w=>[w.shoulder,w.wrist,...w.primaries]).forEach((joint,index)=>expect(joint).toBe(retained[index]));
  });
});
