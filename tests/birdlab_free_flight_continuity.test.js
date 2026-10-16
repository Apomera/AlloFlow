import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const modelSource = readFileSync('stem_lab/avian_woodland_birds.js', 'utf8');
const wildlifeSource = readFileSync('stem_lab/birdlab_3d_wildlife.js', 'utf8');
const origins = { robin: [1.65,-.75], chickadee: [-1.45,1.3], mourningDove: [-.7,-1.6], grouse: [2,1.55], blueJay: [-1.8,1.2] };
function fixture(options = {}) {
  const scope = {}, scene = new THREE.Scene(), poses = new Map();
  new Function('window', modelSource)(scope);
  const factory = scope.AvianWoodlandBirds.create;
  scope.AvianWoodlandBirds.create = (...args) => {
    const model = factory(...args), update = model.update;
    model.update = pose => { poses.set(args[1], { ...pose }); update(pose); };
    return model;
  };
  new Function('window', wildlifeSource)(scope);
  return { scene, poses, wildlife: scope.BirdLab3DWildlife.create(THREE, scene, {quality:'low',seed:57,...options}) };
}
const turn = angle => Math.atan2(Math.sin(angle), Math.cos(angle));
function footState(bird, groundHeight) {
  const values = [], point = new THREE.Vector3(); let clearance = Infinity;
  for (const name of ['woodland-left-foot','woodland-right-foot']) {
    const foot = bird.getObjectByName(name);
    foot.traverse(object => {
      if (!object.isMesh) return;
      const positions = object.geometry.attributes.position;
      for (let i=0;i<positions.count;i++) {
        point.fromBufferAttribute(positions,i).applyMatrix4(object.matrixWorld);
        values.push(point.x,point.y,point.z);
        clearance=Math.min(clearance,point.y-groundHeight(point.x,point.z));
      }
    });
  }
  return { values, clearance };
}

describe('Free woodland flight continuity', () => {
  it.each(['mourningDove','grouse','blueJay'])('keeps %s wings supporting at contact and feet planted during the independent fold', id => {
    const groundHeight=(x,z)=>.018*x-.012*z;
    const { wildlife, scene, poses }=fixture({groundHeight}),[x,z]=origins[id];
    const observer={position:new THREE.Vector3(x+.03,1.65,z),speed:0};
    try {
      wildlife.setMode('free');const bird=scene.getObjectByName('woodland-'+id);
      let flew=false,landed=false,contactFeet=null,contactPhase=0,landedFrames=0,previous=null;
      let largestHeadingStep=0,largestWingStep=0,largestPositionStep=0;
      const wing=bird.getObjectByName('woodland-right-wing');
      for(let frame=0;frame<300;frame++) {
        wildlife.update(frame/60,1/60,observer);scene.updateMatrixWorld(true);
        const current=wildlife.snapshot().find(b=>b.id===id),pose=poses.get(id);
        const rotation=wing.quaternion.clone();
        if(previous) {
          largestHeadingStep=Math.max(largestHeadingStep,Math.abs(turn(current.heading-previous.heading)));
          largestWingStep=Math.max(largestWingStep,rotation.angleTo(previous.rotation));
          largestPositionStep=Math.max(largestPositionStep,new THREE.Vector3(...current.position).distanceTo(previous.position));
        }
        if(current.altitude>.15)flew=true;
        if(flew&&current.altitude===0&&!landed) {
          landed=true;expect(pose.flight).toBeGreaterThan(.99);expect(pose.landing).toBe(1);
          contactFeet=footState(bird,groundHeight).values;contactPhase=pose.phase;
        }
        if(landed&&landedFrames++<24) {
          const feet=footState(bird,groundHeight);
          expect(Math.abs(feet.clearance)).toBeLessThan(.0015);
          expect(Math.max(...feet.values.map((value,index)=>Math.abs(value-contactFeet[index])))).toBeLessThan(1e-7);
          expect(pose.phase).toBeGreaterThanOrEqual(contactPhase);
          if(landedFrames>23)expect(pose.flight).toBe(0);
        }
        previous={heading:current.heading,rotation,position:new THREE.Vector3(...current.position)};
      }
      expect(flew&&landed).toBe(true);expect(landedFrames).toBeGreaterThan(24);
      expect(largestHeadingStep).toBeLessThan(.10);
      // Grouse use an 8.5 Hz base stroke and a stronger launch burst.
      expect(largestWingStep).toBeLessThan(id==='grouse'?.88:.72);
      expect(largestPositionStep).toBeLessThan(.15);
    } finally {wildlife.dispose();}
  });

  it('aligns all five species with the actual curved route and keeps escape distance increasing', () => {
    for(const id of Object.keys(origins)) {
      const {wildlife}=fixture(),[x,z]=origins[id],observer={position:new THREE.Vector3(x+.03,1.65,z),speed:0};
      try {
        wildlife.setMode('free');let previous=wildlife.snapshot().find(b=>b.id===id),airborneFrames=0;
        for(let frame=0;frame<4*120;frame++) {
          wildlife.update(frame/120,1/120,observer);
          const current=wildlife.snapshot().find(b=>b.id===id),dx=current.position[0]-previous.position[0],dz=current.position[2]-previous.position[2];
          if(current.altitude>.04&&previous.altitude>.04&&Math.hypot(dx,dz)>.0001) {
            const bearing=Math.atan2(dx,dz)+(id==='robin'||id==='chickadee'?Math.PI:0);
            expect(Math.abs(turn(current.heading-bearing)),id+' tangent').toBeLessThan(.025);
            expect(Math.hypot(current.position[0]-observer.position.x,current.position[2]-observer.position.z)).toBeGreaterThanOrEqual(
              Math.hypot(previous.position[0]-observer.position.x,previous.position[2]-observer.position.z)-1e-8);
            airborneFrames++;
          }
          previous=current;
        }
        expect(airborneFrames,id).toBeGreaterThan(40);
      } finally {wildlife.dispose();}
    }
  });

  it('keeps wing phase consistent across 30 and 60 Hz updates and freezes it while paused', () => {
    const a=fixture(),b=fixture(),observer={position:new THREE.Vector3(-.67,1.65,-1.6),speed:0};
    try {
      a.wildlife.setMode('free');b.wildlife.setMode('free');
      for(let frame=0;frame<60;frame++) {
        a.wildlife.update(frame/30,1/30,observer);
        b.wildlife.update(frame/30,1/60,observer);b.wildlife.update(frame/30+1/60,1/60,observer);
        // Escape urgency is time based but the initial threshold is observed
        // on update boundaries. Compare within one half-frame of wing phase;
        // after takeoff the exact integrated rate does not accumulate drift.
        expect(Math.abs(a.poses.get('mourningDove').phase-b.poses.get('mourningDove').phase)).toBeLessThan(.10);
      }
      const held=a.poses.get('mourningDove').phase;
      a.wildlife.update(900,0,observer);expect(a.poses.get('mourningDove').phase).toBe(held);
    } finally {a.wildlife.dispose();b.wildlife.dispose();}
  });

  it('checks the flown route against woodland obstacles instead of checking only the destination', () => {
    const isBlocked=(x,z,radius=0)=>Math.hypot(x+3.15,z-1.2)<.27+radius;
    const {wildlife}=fixture({isBlocked}),observer={position:new THREE.Vector3(-1.77,1.65,1.2),speed:0};
    try {
      wildlife.setMode('free');let airborneFrames=0;
      for(let frame=0;frame<5*120;frame++) {
        wildlife.update(frame/120,1/120,observer);
        const jay=wildlife.snapshot().find(b=>b.id==='blueJay');
        expect(isBlocked(jay.position[0],jay.position[2],.30)).toBe(false);
        expect(Math.hypot(jay.position[0],jay.position[2])).toBeLessThanOrEqual(6.8);
        if(jay.altitude>.05)airborneFrames++;
      }
      expect(airborneFrames).toBeGreaterThan(40);
    } finally {wildlife.dispose();}
  });
});
