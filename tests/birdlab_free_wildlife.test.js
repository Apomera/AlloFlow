import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, it, expect } from 'vitest';
const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
function create(options = {}) {
  const scope = {};
  for (const file of ['avian_woodland_birds.js', 'birdlab_3d_wildlife.js'])
    new Function('window', readFileSync('stem_lab/' + file, 'utf8'))(scope);
  return scope.BirdLab3DWildlife.create(THREE, new THREE.Scene(), { quality: 'low', ...options });
}
function run(wildlife, seconds, fps = 30, observer) {
  for (let i = 0; i < Math.round(seconds * fps); i++) wildlife.update(i / fps, 1 / fps, observer);
}
function distance(a, b) { return Math.hypot(a[0] - b[0], a[2] - b[2]); }
describe('Autonomous woodland residents', () => {
  it.each([
    ['grouse',1.105,2.773,.74],
    ['robin',1.155,-2.451,.60],
    ['chickadee',-.461,1.001,.60]
  ])('plans %s activity around a quiet crouched observer instead of flying through them', (id,x,z,clearance) => {
    const wildlife=create({seed:57}),observer={position:new THREE.Vector3(x,1.03,z),speed:0,crouching:true};
    try {
      wildlife.setMode('free');let flightFrames=0,previous=wildlife.snapshot().find(bird=>bird.id===id).position;
      // These viewpoints lie on formerly selected routine flights. Remaining
      // activity is essential: freezing every nearby bird is not avoidance.
      for(let frame=0;frame<30*60;frame++) {
        wildlife.update(frame/60,1/60,observer);const bird=wildlife.snapshot().find(bird=>bird.id===id);
        expect(Math.hypot(bird.position[0]-x,bird.position[2]-z)).toBeGreaterThan(clearance);
        expect(distance(bird.position,previous)).toBeLessThan(.15);previous=bird.position;
        if(bird.altitude>.15)flightFrames++;
      }
      expect(flightFrames).toBeGreaterThan(15);
    } finally {wildlife.dispose();}
  });
  it('chooses independent actions and destinations rather than repeating the guided 44-second course', () => {
    const wildlife = create({ seed: 57 }), behaviors = new Map(), destinations = new Map();
    try {
      wildlife.setMode('free'); const first = wildlife.snapshot(); let previous = first;
      for (let frame = 0; frame < 44 * 30; frame++) {
        wildlife.update(frame / 30, 1 / 30);
        const current = wildlife.snapshot();
        current.forEach((bird, index) => {
          if (!behaviors.has(bird.id)) { behaviors.set(bird.id, new Set()); destinations.set(bird.id, new Set()); }
          behaviors.get(bird.id).add(bird.behavior);
          destinations.get(bird.id).add(bird.position.map(value => value.toFixed(1)).join(','));
          expect(bird.position.every(Number.isFinite)).toBe(true);
          expect(Math.hypot(bird.position[0], bird.position[2])).toBeLessThan(7);
          expect(bird.altitude).toBeGreaterThanOrEqual(0);
          expect(distance(bird.position, previous[index].position)).toBeLessThan(.42);
          const turn=bird.heading-previous[index].heading;
          expect(Math.abs(Math.atan2(Math.sin(turn),Math.cos(turn)))).toBeLessThan(.20);
        });
        previous = current;
      }
      for (const bird of previous) {
        expect(behaviors.get(bird.id).size, bird.id).toBeGreaterThan(2);
        expect(destinations.get(bird.id).size, bird.id).toBeGreaterThan(5);
      }
      expect(previous.some((bird, index) => distance(bird.position, first[index].position) > .5)).toBe(true);
      expect(new Set(previous.map(bird => bird.behavior)).size).toBeGreaterThan(1);
    } finally { wildlife.dispose(); }
  });
  it('is reproducible for the same seed and cadence while different seeds yield different choices', () => {
    const a = create({ seed: 22 }), b = create({ seed: 22 }), c = create({ seed: 23 });
    try {
      [a,b,c].forEach(wildlife => wildlife.setMode('free'));
      run(a, 12, 30); run(b, 12, 60); run(c, 12, 30);
      const expected = a.snapshot();
      b.snapshot().forEach((bird, index) => {
        expect(distance(bird.position, expected[index].position)).toBeLessThan(1e-7);
        expect(bird.behavior).toBe(expected[index].behavior);
      });
      expect(c.snapshot().some((bird, index) => distance(bird.position, expected[index].position) > .1)).toBe(true);
    } finally { [a,b,c].forEach(wildlife => wildlife.dispose()); }
  });
  it('responds to an approaching observer by choosing an escape destination away from that observer', () => {
    const quiet = create(), near = create(), observer = { position: new THREE.Vector3(-.75, 1.65, -1.7), speed: .5 };
    try {
      [quiet, near].forEach(wildlife => wildlife.setMode('free'));
      const before = near.snapshot().find(bird => bird.id === 'mourningDove').position;
      run(quiet, 2.8); run(near, 2.8, 30, observer);
      const after = near.snapshot().find(bird => bird.id === 'mourningDove').position;
      const distant = quiet.snapshot().find(bird => bird.id === 'mourningDove').position;
      const viewer = observer.position.toArray();
      expect(distance(after, viewer)).toBeGreaterThan(distance(before, viewer) + 1.5);
      expect(distance(after, distant)).toBeGreaterThan(1.5);
    } finally { quiet.dispose(); near.dispose(); }
  });
  it('rejects routes crossing blocked ground instead of passing through obstacles', () => {
    const origins = [[1.65,-.75],[-1.45,1.3],[-.7,-1.6],[2,1.55],[-1.8,1.2]];
    const wildlife = create({ isBlocked: (x,z) => origins.every(([ox,oz]) => Math.hypot(x-ox,z-oz) > .07) });
    try {
      wildlife.setMode('free'); const before = wildlife.snapshot(); run(wildlife, 15);
      wildlife.snapshot().forEach((bird,index) => expect(distance(bird.position,before[index].position)).toBeLessThan(.071));
    } finally { wildlife.dispose(); }
  });
  it('finishes an active peck before reacting to the observer instead of snapping the head upright', () => {
    const wildlife = create();
    try {
      wildlife.setMode('free'); run(wildlife, 1.05, 60);
      const grouse = wildlife.root.getObjectByName('woodland-grouse'), head = grouse.getObjectByName('woodland-head');
      const before = head.position.clone(), observer = { position: new THREE.Vector3(2.05,1.65,1.55), speed: 0 };
      wildlife.update(1.051,.001,observer);
      expect(head.position.distanceTo(before)).toBeLessThan(.002);
      expect(wildlife.snapshot().find(bird => bird.id==='grouse').behavior).toBe('Foraging');
      run(wildlife, 2.5, 60, observer);
      expect(distance(wildlife.snapshot().find(bird => bird.id==='grouse').position, observer.position.toArray())).toBeGreaterThan(1.5);
    } finally { wildlife.dispose(); }
  });
  it('does not route an escape toward the observer when the outward routes are blocked', () => {
    const wildlife=create({isBlocked:(x,z)=>x<-.71||Math.abs(z+1.6)>.08});
    const observer={position:new THREE.Vector3(-.6,1.65,-1.6),speed:0};
    try {
      wildlife.setMode('free');
      for(let frame=0;frame<180;frame++) {
        wildlife.update(frame/30,1/30,observer);
        const dove=wildlife.snapshot().find(bird=>bird.id==='mourningDove');
        expect(dove.position[0]).toBeLessThanOrEqual(-.699999);
      }
    } finally {wildlife.dispose();}
  });
  it('builds vigilance gradually, watches a quiet nearby observer, and settles when they leave', () => {
    const wildlife=create(),observer={position:new THREE.Vector3(-.7,1.65,-.7),speed:0};
    const dove=()=>wildlife.snapshot().find(bird=>bird.id==='mourningDove');
    try {
      wildlife.setMode('free');const start=dove().position;
      run(wildlife,.1,60,observer);const first=dove().alertness;
      expect(first).toBeGreaterThan(0);expect(first).toBeLessThan(.2);
      run(wildlife,8,60,observer);
      const watching=dove();expect(watching.alertness).toBeGreaterThan(.3);expect(watching.alertness).toBeLessThan(.72);
      expect(watching.behavior).toBe('Watching the observer');expect(watching.recovering).toBe(false);
      expect(distance(watching.position,start)).toBeLessThan(.001);
      wildlife.update(9,1/60);
      expect(dove().alertness).toBeGreaterThan(watching.alertness*.98);
      expect(dove().alertness).toBeLessThan(watching.alertness);
      run(wildlife,12,60);expect(dove().alertness).toBeLessThan(.02);
    } finally {wildlife.dispose();}
  });
  it('distinguishes direct approach from passing movement and reduces vigilance when crouching', () => {
    const approaching=create({isBlocked:()=>true}),passing=create({isBlocked:()=>true}),crouching=create({isBlocked:()=>true});
    const all=[approaching,passing,crouching],at=wildlife=>wildlife.snapshot().find(bird=>bird.id==='mourningDove');
    try {
      all.forEach(wildlife=>wildlife.setMode('free'));
      for(let frame=0;frame<60;frame++) {
        const distance=2.5-frame/60*.9,angle=frame/60*.45;
        approaching.update(frame/60,1/60,{position:new THREE.Vector3(-.7,1.65,-1.6+distance),speed:.9});
        crouching.update(frame/60,1/60,{position:new THREE.Vector3(-.7,.95,-1.6+distance),speed:.9,crouching:true});
        // Equal reported speed and similar final range, but this observer
        // circles at a fixed radius instead of moving toward the resident.
        passing.update(frame/60,1/60,{position:new THREE.Vector3(-.7+Math.sin(angle)*1.615,1.65,-1.6+Math.cos(angle)*1.615),speed:.9});
      }
      expect(at(approaching).alertness).toBeGreaterThan(at(passing).alertness+.08);
      expect(at(approaching).alertness).toBeGreaterThan(at(crouching).alertness+.10);
      expect(at(crouching).alertness).toBeGreaterThan(0);
    } finally {all.forEach(wildlife=>wildlife.dispose());}
  });
  it('allows a recovery hold after escape instead of repeatedly flushing on every nearby frame', () => {
    const wildlife=create(),observer={position:new THREE.Vector3(-.7,1.65,-1.5),speed:0};
    try {
      wildlife.setMode('free');let landed=false,watchfulFrames=0,highest=0,previous;
      for(let frame=0;frame<7*60;frame++) {
        wildlife.update(frame/60,1/60,observer);
        const dove=wildlife.snapshot().find(bird=>bird.id==='mourningDove');
        highest=Math.max(highest,dove.altitude);
        if(highest>.2&&dove.altitude===0)landed=true;
        if(landed) {
          expect(dove.recovering).toBe(true);expect(dove.altitude).toBe(0);
          if(previous)expect(distance(dove.position,previous)).toBeLessThan(.001);
          watchfulFrames++;previous=dove.position;
        }
      }
      expect(highest).toBeGreaterThan(.5);expect(watchfulFrames).toBeGreaterThan(60);
    } finally {wildlife.dispose();}
  });
  it('turns the head toward the observer with bounded transitions and freezes that attention while paused', () => {
    const wildlife=create({isBlocked:()=>true}),observer={position:new THREE.Vector3(.2,1.65,-1.6),speed:0};
    try {
      wildlife.setMode('free');run(wildlife,1.5,60,observer);
      const head=wildlife.root.getObjectByName('woodland-mourningDove').getObjectByName('woodland-head');
      const before=head.rotation.y;expect(before).toBeGreaterThan(.2);
      observer.position.x=-1.6;
      const held=wildlife.snapshot();wildlife.update(20,0,observer);
      expect(head.rotation.y).toBe(before);expect(wildlife.snapshot()).toEqual(held);
      let previous=before;
      for(let frame=0;frame<90;frame++) {
        wildlife.update(frame/60,1/60,observer);
        expect(Math.abs(head.rotation.y-previous)).toBeLessThan(.1);previous=head.rotation.y;
      }
      expect(head.rotation.y).toBeLessThan(-.2);
    } finally {wildlife.dispose();}
  });
  it('holds on zero elapsed time, retains geometry buffers, and restores exact guided seeks', () => {
    const wildlife = create(), buffers = [];
    wildlife.root.traverse(object => { if (object.isMesh) buffers.push([object.geometry, object.geometry.attributes.position.array]); });
    try {
      wildlife.update(15.9); const guided = wildlife.snapshot();
      wildlife.setMode('free'); run(wildlife, 9);
      const held = wildlife.snapshot(); wildlife.update(0,0); wildlife.update(400,0,{position:new THREE.Vector3(0,0,0),speed:2,crouching:true});
      expect(wildlife.snapshot()).toEqual(held);
      wildlife.setMode('guided'); wildlife.update(15.9); expect(wildlife.snapshot()).toEqual(guided);
      for (const [geometry,buffer] of buffers) expect(geometry.attributes.position.array).toBe(buffer);
    } finally { wildlife.dispose(); }
  });
});
