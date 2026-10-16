import { loadAvianFeatherArt } from './helpers/avian_feather_art_fixture.js';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const birdSource = readFileSync('stem_lab/birdlab_3d_bird.js', 'utf8');
const engine = {};
new Function('window', readFileSync('stem_lab/birdlab_3d_engine.js', 'utf8'))(engine);
// Stub painting only; exercise production geometry, normals, joints and poses.
function fixture(disableCruiseTrim = false) {
  const context = {};
  for (const method of ['save','restore','translate','rotate','beginPath','closePath','clip',
    'fillRect','moveTo','lineTo','bezierCurveTo','quadraticCurveTo','stroke','fill']) context[method] = () => {};
  context.createLinearGradient = () => ({ addColorStop() {} });
  const canvas = () => ({ width:16,height:16,getContext:()=>context });
  const local = { AvianFeatherArt: { ...loadAvianFeatherArt(), createFlightFeatherCanvas:canvas,
    createVaneDetailCanvases:()=>({normal:canvas(),roughness:canvas()}) } };
  const source = disableCruiseTrim ? birdSource
    .replace('fan = fan * (1 - sweep * 0.36) + (1 - fan) * support * 0.16;', 'fan = fan;')
    .replace('var tailTrim = support * 0.045 - sweep * 0.014;', 'var tailTrim = 0;') : birdSource;
  new Function('window','document',source)(local,{createElement:canvas});
  return local.BirdLab3DBird.create(THREE);
}
const coursePose = time => ({ ...engine.BirdLab3D.sampleFlight(time).pose,
  flapPhase:engine.BirdLab3D.sampleWingPhase(time), elapsedTime:time });

function tailPoint(mesh, vertex) {
  const g = mesh.geometry, base = new THREE.Vector3().fromBufferAttribute(g.attributes.position, vertex);
  return new THREE.Vector3().fromBufferAttribute(g.morphAttributes.position[0], vertex)
    .sub(base).multiplyScalar(mesh.morphTargetInfluences[0]).add(base).applyMatrix4(mesh.matrixWorld);
}
function tailSnapshot(bird) {
  return JSON.stringify([bird.joints.tail.rotation.toArray(), ...bird.joints.tail.children.map(mesh =>
    [mesh.position.toArray(), mesh.rotation.toArray(), mesh.morphTargetInfluences.slice()])]);
}

describe('BirdLab flexible tail feathers', () => {
  it('holds each quill fixed while curving the tip without stretching the shaft', () => {
    const bird=fixture(),a=new THREE.Vector3(),b=new THREE.Vector3();
    try {
      const feathers=bird.joints.tail.children;
      expect(feathers).toHaveLength(12);
      for(const feather of feathers) {
        const g=feather.geometry,base=g.attributes.position,curved=g.morphAttributes.position[0],uv=g.attributes.uv;
        let rootCount=0,baseLength=0,curvedLength=0,previousBase,previousCurved;
        for(let vertex=0;vertex<base.count;vertex++) {
          if(uv.getY(vertex)===1) {
            expect(Array.from(curved.array.slice(vertex*3,vertex*3+3))).toEqual(Array.from(base.array.slice(vertex*3,vertex*3+3)));
            rootCount++;
          }
          if(vertex%5!==2)continue;
          a.fromBufferAttribute(base,vertex);b.fromBufferAttribute(curved,vertex);
          if(previousBase) {baseLength+=a.distanceTo(previousBase);curvedLength+=b.distanceTo(previousCurved);}
          previousBase=a.clone();previousCurved=b.clone();
        }
        expect(rootCount).toBe(5);
        expect(Math.abs(curvedLength/baseLength-1)).toBeLessThan(.000001);
        expect(curved.getY(curved.count-3)-base.getY(base.count-3)).toBeGreaterThan(.013);
        const normal=g.morphAttributes.normal[0];
        for(let i=0;i<normal.count;i++)expect(a.fromBufferAttribute(normal,i).length()).toBeCloseTo(1,5);
        for(let index=0;index<g.index.count;index+=3) {
          a.fromBufferAttribute(curved,g.index.getX(index));
          b.fromBufferAttribute(curved,g.index.getX(index+1)).sub(a);
          const edge=new THREE.Vector3().fromBufferAttribute(curved,g.index.getX(index+2)).sub(a);
          expect(b.cross(edge).lengthSq()).toBeGreaterThan(1e-20);
        }
      }
    } finally { bird.dispose(); }
  });

  it('loads on braking, relaxes at rest and repeats exactly without rebuilding geometry', () => {
    const bird=fixture();
    try {
      const feathers=bird.joints.tail.children;
      const retained=feathers.map(mesh=>[mesh.geometry,mesh.geometry.attributes.position.array,
        mesh.geometry.morphAttributes.position[0].array]);
      const snapshot=()=>JSON.stringify(feathers.map(mesh=>[...mesh.quaternion.toArray(),...mesh.position.toArray(),...mesh.morphTargetInfluences]));
      const initialStats=bird.getStats();
      bird.update(coursePose(36.8),0);const reference=snapshot();
      expect(feathers.every(mesh=>mesh.morphTargetInfluences[0]>.65)).toBe(true);
      for(let time=0;time<=44;time+=.125) {
        bird.update(coursePose(time),.125);
        for(const [i,mesh] of feathers.entries()) {
          expect(mesh.geometry).toBe(retained[i][0]);
          expect(mesh.geometry.attributes.position.array).toBe(retained[i][1]);
          expect(mesh.geometry.morphAttributes.position[0].array).toBe(retained[i][2]);
          const flex=mesh.morphTargetInfluences[0];
          if(!Number.isFinite(flex)||flex<-.25||flex>1)throw new Error(`Tail flex outside bounds at ${time}s`);
        }
      }
      bird.update(coursePose(36.8),1/144);expect(snapshot()).toBe(reference);
      bird.update(coursePose(36.8),0);expect(snapshot()).toBe(reference);
      bird.update(coursePose(42),0);expect(feathers.every(mesh=>mesh.morphTargetInfluences[0]===0)).toBe(true);
      expect(bird.getStats()).toMatchObject({feathers:initialStats.feathers,geometries:initialStats.geometries,
        materials:initialStats.materials,textures:initialStats.textures});
    } finally { bird.dispose(); }
  });

  it('narrows the tail during a swept pass and lowers a broader supporting fan in loaded turns', () => {
    const bird = fixture(), feathers = bird.joints.tail.children;
    const measure = extra => {
      bird.update({ flapAmplitude:0, fold:0, tailFan:.2, elapsedTime:16, ...extra }, 0);
      bird.root.updateMatrixWorld(true);
      const tips = feathers.map(mesh => tailPoint(mesh, mesh.geometry.attributes.position.count-3));
      for(let i=0;i<6;i++) {
        expect(tips[i].x).toBeCloseTo(-tips[11-i].x,8);
        expect(tips[i].y).toBeCloseTo(tips[11-i].y,8);
        expect(tips[i].z).toBeCloseTo(tips[11-i].z,8);
      }
      return { width:tips[11].x-tips[0].x, height:tips[5].y };
    };
    try {
      const neutral=measure({}), swept=measure({wingSweep:1}), loaded=measure({wingSupport:1});
      expect(neutral.width-swept.width).toBeGreaterThan(.009);
      expect(loaded.width-neutral.width).toBeGreaterThan(.016);
      expect(neutral.height-loaded.height).toBeGreaterThan(.003);
      // Cruise adjustments are deliberately much smaller than the landing fan.
      const flare=measure({brake:1,tailFan:.9});
      expect(flare.width-loaded.width).toBeGreaterThan(.06);
    } finally { bird.dispose(); }
  });

  it('preserves authored neutral, powered, folded and full-braking poses exactly', () => {
    const bird=fixture(), control=fixture(true);
    try {
      for(const extra of [
        {flapAmplitude:0},
        {flapAmplitude:1,wingSupport:1,wingSweep:1},
        {fold:1,wingSupport:.8,wingSweep:.6},
        {brake:1,flapAmplitude:.54,fold:.13,tailFan:.9,wingSupport:1,wingSweep:1},
      ])for(let i=0;i<=16;i++) {
        const pose={fold:0,flapAmplitude:.6,flapPhase:i*Math.PI/8,tailFan:.2,elapsedTime:18,...extra};
        bird.update(pose,0);control.update(pose,0);
        expect(tailSnapshot(bird)).toBe(tailSnapshot(control));
      }
    } finally { bird.dispose();control.dispose(); }
  });

  it('keeps every quill planted and every vane buffer retained throughout the flight course', () => {
    const bird=fixture(), control=fixture(true), feathers=bird.joints.tail.children;
    const retained=feathers.map(mesh=>[mesh.geometry,mesh.geometry.attributes.position.array,
      mesh.geometry.morphAttributes.position[0].array,mesh.position.clone()]);
    let largestTipChange=0;
    try {
      for(let i=0;i<=880;i++) {
        const pose=coursePose(i*.05);
        bird.update(pose,0);control.update(pose,0);
        bird.root.updateMatrixWorld(true);control.root.updateMatrixWorld(true);
        for(const [index,mesh] of feathers.entries()) {
          expect(mesh.geometry).toBe(retained[index][0]);
          expect(mesh.geometry.attributes.position.array).toBe(retained[index][1]);
          expect(mesh.geometry.morphAttributes.position[0].array).toBe(retained[index][2]);
          expect(mesh.position.equals(retained[index][3])).toBe(true);
          const attachment=retained[index][3].clone().applyMatrix4(bird.joints.tail.matrixWorld);
          expect(tailPoint(mesh,2).distanceTo(attachment)).toBeLessThan(1e-9);
          const last=mesh.geometry.attributes.position.count-3;
          largestTipChange=Math.max(largestTipChange,tailPoint(mesh,last).distanceTo(tailPoint(control.joints.tail.children[index],last)));
        }
      }
      expect(largestTipChange).toBeGreaterThan(.005);
      expect(largestTipChange).toBeLessThan(.02);
    } finally { bird.dispose();control.dispose(); }
  });

  it('keeps fan and pitch velocity continuous through all cruise boundaries and repeats after seeking', () => {
    const bird=fixture();
    const measure = time => {
      bird.update(coursePose(time),0);
      return [bird.joints.tail.rotation.x,...bird.joints.tail.children.map(mesh=>mesh.rotation.y)];
    };
    try {
      const h=.0001;
      for(const time of [0,3,5,7,8.3,8.5,9,9.6,10,22,23,23.5,24.8,25.6,30,33,34.5,34.8,35,37,38,39.4,44]) {
        const [a,b,c,d,e]=[-2,-1,0,1,2].map(offset=>measure(time+offset*h));
        for(let axis=0;axis<c.length;axis++) {
          const arriving=(3*c[axis]-4*b[axis]+a[axis])/(2*h);
          const departing=(-3*c[axis]+4*d[axis]-e[axis])/(2*h);
          expect(Math.abs(arriving-departing),`tail component ${axis} at ${time}s`).toBeLessThan(.0002);
        }
      }
      for(const time of [12,16,22.7,27,32]) {
        measure(time);const target=tailSnapshot(bird);
        for(const rate of [30,60,144]) {
          bird.update(coursePose(36.8),1/rate);
          bird.update(coursePose(time),1/rate);
          expect(tailSnapshot(bird)).toBe(target);
        }
      }
    } finally { bird.dispose(); }
  });
});
