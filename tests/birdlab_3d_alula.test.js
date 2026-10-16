import { loadAvianFeatherArt } from './helpers/avian_feather_art_fixture.js';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/birdlab_3d_bird.js', 'utf8');
const sweepExpression = 'var alulaSweep = smooth(0.16, 0.82, alulaLift) * 0.38 * open * open;';
if (!source.includes(sweepExpression)) throw new Error('Missing staged alula deployment');

function fixture(disableSweep = false) {
  const context = {};
  for (const method of ['save', 'restore', 'translate', 'rotate', 'beginPath', 'closePath', 'clip',
    'fillRect', 'moveTo', 'lineTo', 'bezierCurveTo', 'quadraticCurveTo', 'stroke', 'fill']) context[method] = () => {};
  context.createLinearGradient = () => ({ addColorStop() {} });
  const makeCanvas = () => ({ width: 16, height: 16, getContext: () => context });
  const localWindow = { AvianFeatherArt: { ...loadAvianFeatherArt(),
    createFlightFeatherCanvas: makeCanvas,
    createVaneDetailCanvases: () => ({ normal: makeCanvas(), roughness: makeCanvas() }),
  } };
  new Function('window', 'document', disableSweep ? source.replace(sweepExpression, 'var alulaSweep = 0;') : source)
    (localWindow, { createElement: makeCanvas });
  return localWindow.BirdLab3DBird.create(THREE);
}
const engine = {};
new Function('window', readFileSync('stem_lab/birdlab_3d_engine.js', 'utf8'))(engine);
const coursePose = time => ({ ...engine.BirdLab3D.sampleFlight(time).pose,
  flapPhase: engine.BirdLab3D.sampleWingPhase(time), elapsedTime: time });
const pose = extra => ({ flapPhase: 1.4, flapAmplitude: .7, fold: 0, elapsedTime: 5, ...extra });
const thumb = wing => wing.alula.children[0];
const frame = bird => bird.joints.wings.flatMap(wing => [
  ...wing.alula.position.toArray(), ...wing.alula.quaternion.toArray(), ...thumb(wing).morphTargetInfluences,
]);
function point(wing, vertex) {
  const mesh=thumb(wing),g=mesh.geometry,position=new THREE.Vector3().fromBufferAttribute(g.attributes.position,vertex);
  return position.lerp(new THREE.Vector3().fromBufferAttribute(g.morphAttributes.position[0],vertex),mesh.morphTargetInfluences[0])
    .applyMatrix4(mesh.matrixWorld);
}

describe('BirdLab staged thumb-feather deployment', () => {
  it('lifts before sweeping forward and eases into and out of the bounded protraction', () => {
    const bird=fixture(),wing=bird.joints.wings[1];
    try {
      const sweep=alula=>{bird.update(pose({alula}),0);return wing.alula.rotation.y;};
      expect(sweep(.12)).toBe(0);
      expect(wing.alula.rotation.z).toBeGreaterThan(0);
      expect(sweep(.5)).toBeGreaterThan(.15);
      expect(sweep(1)).toBeCloseTo(.38,12);
      for(const endpoint of [.16,.82]) {
        const h=.00001,a=sweep(endpoint-h),b=sweep(endpoint),c=sweep(endpoint+h);
        expect(Math.abs((b-a)/h-(c-b)/h)).toBeLessThan(.0001);
      }
      for(let step=0;step<=100;step++) {
        const angle=sweep(step/100);
        expect(angle).toBeGreaterThanOrEqual(0);expect(angle).toBeLessThanOrEqual(.38);
        expect(bird.joints.wings[0].alula.rotation.y).toBeCloseTo(-angle,12);
        expect(bird.joints.wings[0].alula.rotation.z).toBeCloseTo(-wing.alula.rotation.z,12);
      }
    } finally {bird.dispose();}
  });

  it('keeps thumb attachments fixed and feathers rigid throughout takeoff and landing', () => {
    const bird=fixture(),control=fixture(true);
    try {
      let maximumTipMovement=0;
      for(let tick=0;tick<=220;tick++) {
        const t=tick*.2;
        for(const model of [bird,control]) {model.update(coursePose(t),0);model.root.updateMatrixWorld(true);}
        for(let side=0;side<2;side++) {
          const wing=bird.joints.wings[side],plain=control.joints.wings[side];
          expect(point(wing,2).distanceTo(point(plain,2))).toBeLessThan(1e-8);
          maximumTipMovement=Math.max(maximumTipMovement,point(wing,37).distanceTo(point(plain,37)));
          for(let feather=0;feather<3;feather++) {
            const root=feather*40+2,tip=feather*40+37;
            expect(point(wing,root).distanceTo(point(wing,tip))).toBeCloseTo(point(plain,root).distanceTo(point(plain,tip)),10);
          }
          expect(wing.wrist.quaternion.toArray()).toEqual(plain.wrist.quaternion.toArray());
          expect(wing.primaries.map(p=>p.quaternion.toArray())).toEqual(plain.primaries.map(p=>p.quaternion.toArray()));
        }
      }
      expect(maximumTipMovement).toBeGreaterThan(.017);
      expect(maximumTipMovement).toBeLessThan(.023);
      // In the wrist's frame the deployed tip moves forward, away from the
      // leading edge, rather than clipping back into the supporting wing.
      for(const model of [bird,control]) {model.update(pose({alula:.85}),0);model.root.updateMatrixWorld(true);}
      const wing=bird.joints.wings[1],plain=control.joints.wings[1];
      expect(wing.wrist.worldToLocal(point(wing,37)).z).toBeLessThan(plain.wrist.worldToLocal(point(plain,37)).z-.015);
    } finally {bird.dispose();control.dispose();}
  });

  it('preserves the steady cruise and full folded shape exactly', () => {
    const bird=fixture(),control=fixture(true);
    try {
      for(const input of [coursePose(0),coursePose(12),coursePose(27),coursePose(41),pose({fold:1,alula:1,brake:1})]) {
        for(const model of [bird,control]) {model.update(input,0);model.root.updateMatrixWorld(true);}
        expect(frame(bird)).toEqual(frame(control));
        for(let side=0;side<2;side++)for(const vertex of [2,37,77,117]) {
          expect(point(bird.joints.wings[side],vertex).toArray()).toEqual(point(control.joints.wings[side],vertex).toArray());
        }
      }
    } finally {bird.dispose();control.dispose();}
  });

  it('repeats exactly after arbitrary seeks without rebuilding geometry or drifting its root', () => {
    const bird=fixture();
    try {
      const geometries=bird.joints.wings.map(wing=>thumb(wing).geometry);
      const buffers=geometries.map(g=>g.attributes.position.array);
      const target=coursePose(38.6);
      bird.update(target,0);const reference=frame(bird);
      for(const time of [5,36.5,0,12,37.4,43,4.2,39]) {
        bird.update(coursePose(time),.1);bird.update(target,.016);
        expect(frame(bird)).toEqual(reference);
      }
      bird.update(target,0);expect(frame(bird)).toEqual(reference);
      bird.joints.wings.forEach((wing,index)=>{
        expect(thumb(wing).geometry).toBe(geometries[index]);
        expect(thumb(wing).geometry.attributes.position.array).toBe(buffers[index]);
      });
    } finally {bird.dispose();}
  });
});
