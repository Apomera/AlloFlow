import { loadAvianFeatherArt } from './helpers/avian_feather_art_fixture.js';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/birdlab_3d_bird.js', 'utf8');

function fixture(disableTwist = false, disableFlare = false) {
  const context = {};
  for (const method of ['save', 'restore', 'translate', 'rotate', 'beginPath', 'closePath', 'clip',
    'fillRect', 'moveTo', 'lineTo', 'bezierCurveTo', 'quadraticCurveTo', 'stroke', 'fill']) context[method] = () => {};
  context.createLinearGradient = () => ({ addColorStop() {} });
  const makeCanvas = () => ({ width: 16, height: 16, getContext: () => context });
  const localWindow = { AvianFeatherArt: { ...loadAvianFeatherArt(),
    createFlightFeatherCanvas: makeCanvas,
    createVaneDetailCanvases: () => ({ normal: makeCanvas(), roughness: makeCanvas() }),
  } };
  const rigSource=disableFlare ? source.replace('var flareFan = brake * open * open * (1 - recovery * amplitude * 0.35);', 'var flareFan = 0;') : source;
  new Function('window', 'document', rigSource)(localWindow, { createElement: makeCanvas });
  const bird=localWindow.BirdLab3DBird.create(THREE);
  // The control runs the same production carriage, geometry and flex while
  // suppressing only the added quill rotation at its quaternion boundary.
  if(disableTwist)for(const wing of bird.joints.wings)for(const primary of wing.primaries) {
    primary.userData.quillRotation.setFromAxisAngle=function(){return this.identity();};
  }
  return bird;
}

const pose=(phase,extra={})=>({flapPhase:phase,flapAmplitude:1,fold:0,elapsedTime:4.3,...extra});
const snapshot=bird=>bird.joints.wings.flatMap(wing=>wing.primaries.map(primary=>[...primary.quaternion.toArray(),...primary.position.toArray()]));
const engineWindow={};
new Function('window',readFileSync('stem_lab/birdlab_3d_engine.js','utf8'))(engineWindow);
const coursePose=time=>({...engineWindow.BirdLab3D.sampleFlight(time).pose,
  flapPhase:engineWindow.BirdLab3D.sampleWingPhase(time),elapsedTime:time});

function vanePoint(primary,vertex,out=new THREE.Vector3()) {
  const mesh=primary.userData.vane,g=mesh.geometry,base=new THREE.Vector3().fromBufferAttribute(g.attributes.position,vertex);
  out.copy(base);
  g.morphAttributes.position.forEach((target,index)=>{
    out.addScaledVector(new THREE.Vector3().fromBufferAttribute(target,vertex).sub(base),mesh.morphTargetInfluences[index]);
  });
  return out.applyMatrix4(mesh.matrixWorld);
}

describe('BirdLab landing wingtip fan', () => {
  it('opens the distal slots while holding the actual quill attachments fixed', () => {
    const bird=fixture(),control=fixture(false,true);
    try {
      let minimumClearance=Infinity;
      for(let tick=0;tick<=230;tick++) {
        const time=34.8+tick*.02;
        for(const model of [bird,control]) {model.update(coursePose(time),0);model.root.updateMatrixWorld(true);}
        for(let side=0;side<2;side++) {
          const wing=bird.joints.wings[side],plain=control.joints.wings[side];
          for(let index=0;index<8;index++) {
            // The center of the first vane row is the physical shaft root.
            const root=vanePoint(wing.primaries[index],2),original=vanePoint(plain.primaries[index],2);
            expect(root.distanceTo(original)).toBeLessThan(1e-8);
            if(index===7||time>38.3)continue;
            let previousMaximum=-Infinity,nextMinimum=Infinity;
            // Every vertex of the distal 12% stays on its own side of a
            // separating plane. This also separates its triangle interiors.
            for(let vertex=25;vertex<40;vertex++) {
              previousMaximum=Math.max(previousMaximum,wing.wrist.worldToLocal(vanePoint(wing.primaries[index],vertex)).z);
              nextMinimum=Math.min(nextMinimum,wing.wrist.worldToLocal(vanePoint(wing.primaries[index+1],vertex)).z);
            }
            minimumClearance=Math.min(minimumClearance,nextMinimum-previousMaximum);
          }
        }
      }
      expect(minimumClearance).toBeGreaterThan(.010);
      for(const model of [bird,control]) {model.update(coursePose(37.2),0);model.root.updateMatrixWorld(true);}
      const tips=model=>model.joints.wings[1].primaries.slice(0,2).map(primary=>vanePoint(primary,37));
      const opened=tips(bird),original=tips(control);
      expect(opened[0].distanceTo(opened[1])-original[0].distanceTo(original[1])).toBeGreaterThan(.005);
    } finally {bird.dispose();control.dispose();}
  });

  it('mirrors the flare and preserves the existing glide and fully folded poses exactly', () => {
    const bird=fixture(),control=fixture(false,true);
    try {
      for(const time of [0,4.3,12,27,41]) {
        bird.update(coursePose(time),0);control.update(coursePose(time),0);
        expect(snapshot(bird)).toEqual(snapshot(control));
      }
      for(let tick=0;tick<=32;tick++) {
        bird.update(pose(tick*Math.PI/16,{brake:1,flapAmplitude:.54}),0);
        bird.root.updateMatrixWorld(true);
        for(let index=0;index<8;index++) {
          const l=bird.joints.wings[0].primaries[index],r=bird.joints.wings[1].primaries[index];
          const left=vanePoint(l,37),right=vanePoint(r,37);right.x=-right.x;
          expect(left.distanceTo(right)).toBeLessThan(1e-8);
        }
      }
      const tucked=pose(2.7,{brake:1,fold:1});
      bird.update(tucked,0);control.update(tucked,0);
      expect(snapshot(bird)).toEqual(snapshot(control));
    } finally {bird.dispose();control.dispose();}
  });

  it('eases through flare and settling and reproduces sought poses without frame history', () => {
    const bird=fixture(),h=.0001;
    try {
      for(const time of [34.8,35.6,37,37.5,38,38.08,38.5,39.2,39.4]) {
        const frames=[-2,-1,0,1,2].map(offset=>{bird.update(coursePose(time+offset*h),0);return snapshot(bird);});
        for(let finger=0;finger<16;finger++)for(let axis=0;axis<7;axis++) {
          const [a,b,c,d,e]=frames.map(frame=>frame[finger][axis]);
          expect(Math.abs((3*c-4*b+a)/(2*h)-(-3*c+4*d-e)/(2*h))).toBeLessThan(.001);
        }
      }
      bird.update(coursePose(37.2),0);const reference=snapshot(bird),stats=bird.getStats();
      const retained=bird.joints.wings.flatMap(wing=>wing.primaries.map(primary=>primary.userData.vane.geometry));
      for(const rate of [30,60,144]) {
        for(let tick=0;tick<rate;tick++)bird.update(coursePose(34.8+tick/rate*4.6),1/rate);
        bird.update(coursePose(37.2),1/rate);expect(snapshot(bird)).toEqual(reference);
      }
      bird.update(coursePose(37.2),0);expect(snapshot(bird)).toEqual(reference);
      bird.joints.wings.flatMap(wing=>wing.primaries.map(primary=>primary.userData.vane.geometry))
        .forEach((geometry,index)=>expect(geometry).toBe(retained[index]));
      expect(bird.getStats()).toMatchObject({feathers:stats.feathers,geometries:stats.geometries,materials:stats.materials,textures:stats.textures});
    } finally {bird.dispose();}
  });
});

describe('BirdLab loaded primary shape', () => {
  it('bends the shaft without stretching its segments or sliding the vane edges', () => {
    const bird=fixture(),a=new THREE.Vector3(),b=new THREE.Vector3();
    try {
      for(const wing of bird.joints.wings)for(const primary of wing.primaries) {
        const g=primary.userData.vane.geometry,base=g.attributes.position,loaded=g.morphAttributes.position[1];
        expect(Array.from(loaded.array.slice(0,15))).toEqual(Array.from(base.array.slice(0,15)));
        let baseLength=0;
        for(let station=1;station<base.count/5;station++) {
          const center=station*5+2,previous=center-5;
          const original=a.fromBufferAttribute(base,center).distanceTo(b.fromBufferAttribute(base,previous));
          const bent=a.fromBufferAttribute(loaded,center).distanceTo(b.fromBufferAttribute(loaded,previous));
          expect(Math.abs(bent-original)).toBeLessThan(2e-8);baseLength+=original;
          for(let cross=0;cross<5;cross++) {
            const vertex=station*5+cross;
            const width=a.fromBufferAttribute(base,vertex).distanceTo(b.fromBufferAttribute(base,center));
            expect(a.fromBufferAttribute(loaded,vertex).distanceTo(b.fromBufferAttribute(loaded,center))).toBeCloseTo(width,7);
          }
        }
        expect(loaded.getY(base.count-3)-base.getY(base.count-3)).toBeCloseTo(.02,7);
        // GPU morph interpolation approximates the loaded curve. Even its
        // negative recovery weight must not produce a rubber-like extension.
        for(const weight of [-.12,.36,.72]) {
          let length=0,previous;
          for(let center=2;center<base.count;center+=5) {
            a.fromBufferAttribute(base,center).lerp(b.fromBufferAttribute(loaded,center),weight);
            if(previous)length+=a.distanceTo(previous);previous=a.clone();
          }
          expect(Math.abs(length/baseLength-1)).toBeLessThan(.007);
        }
      }
    } finally { bird.dispose(); }
  });

  it('retains mirrored, regular surfaces and smooth finite lighting normals', () => {
    const bird=fixture(),a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3();
    try {
      for(let finger=0;finger<8;finger++) {
        const left=bird.joints.wings[0].primaries[finger].userData.vane.geometry;
        const right=bird.joints.wings[1].primaries[finger].userData.vane.geometry;
        const lp=left.morphAttributes.position[1],rp=right.morphAttributes.position[1];
        for(let vertex=0;vertex<lp.count;vertex++) {
          const mirrored=Math.floor(vertex/5)*5+4-vertex%5;
          a.fromBufferAttribute(lp,vertex);b.fromBufferAttribute(rp,mirrored);b.x=-b.x;
          expect(a.distanceTo(b)).toBeLessThan(1e-7);
        }
        for(const g of [left,right]) {
          const p=g.morphAttributes.position[1],n=g.morphAttributes.normal[1];
          for(let vertex=0;vertex<p.count;vertex++) {
            expect(a.fromBufferAttribute(p,vertex).toArray().every(Number.isFinite)).toBe(true);
            expect(a.fromBufferAttribute(n,vertex).length()).toBeCloseTo(1,5);
          }
          for(let index=0;index<g.index.count;index+=3) {
            a.fromBufferAttribute(p,g.index.getX(index));b.fromBufferAttribute(p,g.index.getX(index+1)).sub(a);
            c.fromBufferAttribute(p,g.index.getX(index+2)).sub(a);
            expect(b.cross(c).lengthSq()).toBeGreaterThan(1e-20);
          }
        }
      }
    } finally { bird.dispose(); }
  });
});

describe('BirdLab quill-axis recovery feathering', () => {
  it('turns the vane while keeping each real quill and its world attachment fixed', () => {
    const bird=fixture(),control=fixture(true);
    const qa=new THREE.Quaternion(),qb=new THREE.Quaternion(),a=new THREE.Vector3(),b=new THREE.Vector3();
    try {
      for(let index=0;index<8;index++) {
        const phase=Math.PI+.18+index*.026;
        bird.update(pose(phase),0);control.update(pose(phase),0);
        bird.root.updateMatrixWorld(true);control.root.updateMatrixWorld(true);
        for(let side=0;side<2;side++) {
          const primary=bird.joints.wings[side].primaries[index],plain=control.joints.wings[side].primaries[index];
          primary.getWorldPosition(a);plain.getWorldPosition(b);expect(a.distanceTo(b)).toBeLessThan(1e-12);
          primary.getWorldQuaternion(qa);plain.getWorldQuaternion(qb);
          const axis=primary.userData.quillAxis;
          expect(axis.length()).toBeCloseTo(1,12);
          // Two points on the shaft establish that the entire quill line is
          // unchanged, rather than merely its pivot remaining in place.
          for(const length of [.05,.15]) {
            a.copy(axis).multiplyScalar(length).applyMatrix4(primary.matrixWorld);
            b.copy(axis).multiplyScalar(length).applyMatrix4(plain.matrixWorld);
            expect(a.distanceTo(b)).toBeLessThan(1e-10);
          }
          const normals=primary.userData.vane.geometry.attributes.normal;
          a.fromBufferAttribute(normals,Math.floor(normals.count/2)).applyQuaternion(qa);
          b.fromBufferAttribute(normals,Math.floor(normals.count/2)).applyQuaternion(qb);
          expect(a.angleTo(b)).toBeGreaterThan(.10);
          expect(a.angleTo(b)).toBeLessThan(.18);
        }
      }
    } finally { bird.dispose();control.dispose(); }
  });

  it('mirrors recovery feathering and leaves gliding and folded carriage unchanged', () => {
    const bird=fixture(),control=fixture(true),leftQ=new THREE.Quaternion(),rightQ=new THREE.Quaternion();
    const left=new THREE.Vector3(),right=new THREE.Vector3();
    try {
      for(let tick=0;tick<=40;tick++) {
        const phase=tick*Math.PI/20;
        bird.update(pose(phase),0);bird.root.updateMatrixWorld(true);
        for(let index=0;index<8;index++) {
          const l=bird.joints.wings[0].primaries[index],r=bird.joints.wings[1].primaries[index];
          l.getWorldQuaternion(leftQ);r.getWorldQuaternion(rightQ);
          // Project world-up into each authored quill's normal plane. These
          // mirrored vane directions must remain mirrored after feathering.
          left.set(0,1,0).addScaledVector(l.userData.quillAxis,-l.userData.quillAxis.y).normalize().applyQuaternion(leftQ);
          right.set(0,1,0).addScaledVector(r.userData.quillAxis,-r.userData.quillAxis.y).normalize().applyQuaternion(rightQ);
          right.x=-right.x;expect(left.distanceTo(right)).toBeLessThan(1e-10);
        }
      }
      for(const extra of [{flapAmplitude:0},{fold:1}])for(const phase of [0,1.5,3.6,5.8]) {
        bird.update(pose(phase,extra),0);control.update(pose(phase,extra),0);
        expect(snapshot(bird)).toEqual(snapshot(control));
      }
    } finally { bird.dispose();control.dispose(); }
  });

  it('turns smoothly through release boundaries and reproduces sought poses at different frame rates', () => {
    const bird=fixture(),h=.0001;
    try {
      const retained=bird.joints.wings.flatMap(wing=>wing.primaries.map(primary=>[primary.userData.quillAxis,primary.userData.quillRotation,primary.userData.vane.geometry]));
      const stats=bird.getStats();
      for(let index=0;index<8;index++)for(const cycle of [.42,1]) {
        const phase=(cycle-.21)*Math.PI*2+.18+index*.026;
        const values=[-2,-1,0,1,2].map(offset=>{
          bird.update(pose(phase+offset*h),0);return bird.joints.wings[1].primaries[index].quaternion.toArray();
        });
        for(let axis=0;axis<4;axis++) {
          const [a,b,c,d,e]=values.map(value=>value[axis]);
          expect(Math.abs((3*c-4*b+a)/(2*h)-(-3*c+4*d-e)/(2*h))).toBeLessThan(.00001);
        }
      }
      const target=pose(3.7,{flapAmplitude:.65,fold:.18,bank:.2});
      bird.update(target,0);const reference=snapshot(bird);
      for(const rate of [30,60,144]) {
        for(let tick=0;tick<rate;tick++)bird.update(pose(tick/rate*Math.PI*2),1/rate);
        bird.update(target,1/rate);expect(snapshot(bird)).toEqual(reference);
      }
      bird.update(target,0);expect(snapshot(bird)).toEqual(reference);
      const after=bird.joints.wings.flatMap(wing=>wing.primaries.map(primary=>[primary.userData.quillAxis,primary.userData.quillRotation,primary.userData.vane.geometry]));
      after.forEach((values,index)=>values.forEach((value,key)=>expect(value).toBe(retained[index][key])));
      expect(bird.getStats()).toMatchObject({feathers:stats.feathers,geometries:stats.geometries,materials:stats.materials,textures:stats.textures});
    } finally { bird.dispose(); }
  });
});
