import { loadAvianFeatherArt } from './helpers/avian_feather_art_fixture.js';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/birdlab_3d_bird.js', 'utf8');
const engineWindow = {};
new Function('window', readFileSync('stem_lab/birdlab_3d_engine.js', 'utf8'))(engineWindow);

// Exercise the actual head hierarchy and rotation order; only texture painting
// is stubbed. Euler-only stand-ins cannot expose compound-axis gaze errors.
function fixture() {
  const context = {};
  for (const method of ['save', 'restore', 'translate', 'rotate', 'beginPath', 'closePath', 'clip',
    'fillRect', 'moveTo', 'lineTo', 'bezierCurveTo', 'quadraticCurveTo', 'stroke', 'fill']) context[method] = () => {};
  context.createLinearGradient = () => ({ addColorStop() {} });
  const makeCanvas = () => ({ width: 16, height: 16, getContext: () => context });
  const localWindow = { AvianFeatherArt: { ...loadAvianFeatherArt(),
    createFlightFeatherCanvas: makeCanvas,
    createVaneDetailCanvases: () => ({ normal: makeCanvas(), roughness: makeCanvas() }),
  } };
  new Function('window', 'document', source)(localWindow, { createElement: makeCanvas });
  return localWindow.BirdLab3DBird.create(THREE);
}

const pose = extra => ({ fold: 0, flapAmplitude: 0, pitch: 0, bank: 0, headYaw: 0, gazePitch: .14, elapsedTime: 14, ...extra });
const angularDifference = (a, b) => Math.atan2(Math.sin(a-b), Math.cos(a-b));

describe('BirdLab stabilized head sightline', () => {
  it('keeps gaze elevation and partial roll independent of sideways looks in a compound attitude', () => {
    const bird=fixture(),world=new THREE.Quaternion(),forward=new THREE.Vector3(),right=new THREE.Vector3();
    try {
      for(const yaw of [-2.1,.8,2.9])for(const pitch of [-.4,.45])for(const bank of [-.65,.65]) {
        bird.root.quaternion.setFromEuler(new THREE.Euler(pitch,yaw,bank,'YXZ'));
        for(const headYaw of [-.55,0,.55]) {
          bird.update(pose({pitch,bank,headYaw}),0);bird.root.updateMatrixWorld(true);
          bird.joints.head.getWorldQuaternion(world);
          forward.set(0,0,-1).applyQuaternion(world);right.set(1,0,0).applyQuaternion(world);
          const elevation=Math.asin(forward.y),heading=Math.atan2(-forward.x,-forward.z);
          expect(elevation).toBeCloseTo(pitch*.32-.14,10);
          expect(angularDifference(heading,yaw+headYaw)).toBeCloseTo(0,10);
          const levelRight=new THREE.Vector3(Math.cos(heading),0,-Math.sin(heading));
          const levelUp=new THREE.Vector3().crossVectors(levelRight,forward).normalize();
          const roll=Math.atan2(right.dot(levelUp),right.dot(levelRight));
          expect(roll).toBeCloseTo(bank*.52,10);
          expect(bird.joints.head.position.toArray()).toEqual([0,.068,-.202]);
        }
      }
    } finally { bird.dispose(); }
  });

  it('preserves the authored perched neck and scan pose exactly, including a crouch', () => {
    const bird=fixture(),expected=new THREE.Quaternion();
    try {
      for(const crouch of [0,.8])for(const headYaw of [-.6,0,.6])for(const gazePitch of [-.1,.2]) {
        bird.update(pose({fold:1,feet:1,crouch,headYaw,gazePitch}),0);
        const neck=.53-crouch*.15;
        expected.setFromEuler(new THREE.Euler(-neck*.58-gazePitch,headYaw,0,'XYZ'));
        expect(1-Math.abs(bird.joints.head.quaternion.dot(expected))).toBeLessThan(1e-12);
        expect(bird.joints.head.position.y).toBe(.068+crouch*.006);
        expect(bird.joints.head.position.z).toBe(-.202-crouch*.005);
      }
    } finally { bird.dispose(); }
  });

  it('remains continuous through takeoff, glances, banking and the return to a folded posture', () => {
    const bird=fixture(),previous=new THREE.Quaternion(),current=new THREE.Quaternion();
    try {
      for(let tick=0;tick<=2200;tick++) {
        const time=tick*.02,sample=engineWindow.BirdLab3D.sampleFlight(time);
        bird.root.quaternion.setFromEuler(new THREE.Euler(sample.pitch,sample.yaw,sample.bank,'YXZ'));
        bird.update({...sample.pose,flapPhase:engineWindow.BirdLab3D.sampleWingPhase(time),elapsedTime:time},0);
        bird.root.updateMatrixWorld(true);bird.joints.head.getWorldQuaternion(current);
        if(!current.toArray().every(Number.isFinite)||Math.abs(bird.joints.head.quaternion.lengthSq()-1)>1e-12)throw new Error(`Invalid head attitude at ${time}s`);
        // Perched breathing uses a slight nonuniform parent scale. Normalize
        // its matrix-decomposed world quaternion before comparing directions.
        current.normalize();
        if(tick&&1-Math.abs(previous.dot(current))>.001)throw new Error(`Head orientation popped at ${time}s`);
        previous.copy(current);
      }
    } finally { bird.dispose(); }
  });

  it('reproduces a paused or sought head pose without quaternion history or changing resources', () => {
    const bird=fixture(),target=pose({pitch:.38,bank:-.5,headYaw:.44,fold:.25});
    try {
      bird.update(target,0);const reference=bird.joints.head.quaternion.toArray(),position=bird.joints.head.position.toArray(),stats=bird.getStats();
      for(const rate of [30,60,144]) {
        for(let tick=0;tick<rate;tick++)bird.update(pose({pitch:Math.sin(tick/rate)*.4,bank:.3,headYaw:-.5,fold:tick/rate}),1/rate);
        bird.update(target,1/rate);expect(bird.joints.head.quaternion.toArray()).toEqual(reference);
      }
      bird.update(target,0);expect(bird.joints.head.quaternion.toArray()).toEqual(reference);
      expect(bird.joints.head.position.toArray()).toEqual(position);
      expect(bird.getStats()).toEqual(stats);
    } finally { bird.dispose(); }
  });
});
