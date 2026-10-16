import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const source = readFileSync('stem_lab/stem_tool_raptorhunt.js', 'utf8');
function helper(name) {
  const start = source.indexOf('function ' + name + '(');
  if (start < 0) throw Error('Missing ' + name);
  let end = source.indexOf('{', start), depth = 1;
  while (depth) { end++; if (source[end] === '{') depth++; if (source[end] === '}') depth--; }
  return source.slice(start, end + 1);
}
const sharedWindow = {};
Function('window', readFileSync('stem_lab/avian_woodland_birds.js', 'utf8'))(sharedWindow);
const api = Function('THREE', 'window', [
  'buildSharedWoodlandPrey', 'applySharedWoodlandPreyPose', 'releaseSharedWoodlandPrey',
  'advancePreyVisualPose', 'advanceBirdPreyHead', 'applyBirdPreyHeadPose'
].map(helper).join('\n') + '\nreturn {build:buildSharedWoodlandPrey,pose:applySharedWoodlandPreyPose,release:releaseSharedWoodlandPrey,advance:advancePreyVisualPose};')(THREE, sharedWindow);
const legacyBuild = Function('THREE', 'window', [
  'preyBirdPalette','createPreyBirdBodyGeometry','createPreyWingGeometry','createPreyTailGeometry','preyKindFor','buildPreyVisual'
].map(helper).join('\n') + ';return buildPreyVisual;')(THREE, {});
function make(id, size = 2) {
  const data = { id, sizeM: id === 'grouse' ? .30 : .16, speedMps: 8, color: 0x9ca3af };
  const animation = api.build(data, size), mesh = new THREE.Group(); mesh.add(animation.root);
  return { data, animation, mesh, visual: animation.root, visualSize: size, vx: 0, vz: 0, bobPhase: .7 };
}
function geometryState(root) {
  const states = [];
  root.traverse(object => { if (object.geometry) states.push({ geometry: object.geometry, material: object.material, count: object.geometry.attributes.position.count }); });
  return states;
}

describe('Raptor woodland dependency loading', () => {
  let previous;
  const scripts = () => [...document.querySelectorAll('script[data-raptor-woodland-birds]')];
  function loader() {
    const host = document.createElement('script');
    host.src = 'https://local.invalid/offline/stem_lab/stem_tool_raptorhunt.js?revision=4';
    host.dataset.woodlandFixture = 'true'; document.head.appendChild(host);
    const start = source.indexOf('  var RAPTOR_MODULE_BASE'), end = source.indexOf('  // ─── Three.js loader');
    return Function('window', 'document', 'URL', source.slice(start, end) + '\nreturn ensureRaptorWoodlandBirds;')(window, document, URL);
  }
  beforeEach(() => { vi.useFakeTimers(); previous = window.AvianWoodlandBirds; delete window.AvianWoodlandBirds; });
  afterEach(() => {
    document.querySelectorAll('script[data-raptor-woodland-birds],script[data-woodland-fixture]').forEach(script => script.remove());
    if (previous === undefined) delete window.AvianWoodlandBirds; else window.AvianWoodlandBirds = previous;
    vi.useRealTimers();
  });
  it('shares concurrent requests beside the offline tool and accepts the real module', async () => {
    const load = loader(), first = load(); expect(load()).toBe(first);
    expect(scripts()).toHaveLength(1);
    expect(scripts()[0].src).toBe('https://local.invalid/offline/stem_lab/avian_woodland_birds.js');
    window.AvianWoodlandBirds = sharedWindow.AvianWoodlandBirds;
    scripts()[0].dispatchEvent(new Event('load')); await first;
    expect(vi.getTimerCount()).toBe(0);
  });
  it('uses the actual module already loaded by Bird Lab', async () => {
    window.AvianWoodlandBirds = sharedWindow.AvianWoodlandBirds;
    await loader()(); expect(scripts()).toHaveLength(0);
  });
  it('keeps an existing valid dove/grouse factory usable when it predates blue jays', async () => {
    window.AvianWoodlandBirds = { version: '1.0.0', create: sharedWindow.AvianWoodlandBirds.create,
      supports: id => id === 'mourningDove' || id === 'grouse' };
    await loader()(); expect(scripts()).toHaveLength(0);
  });
  it('removes network failures and retries independently', async () => {
    const load = loader(), first = load(), failed = scripts()[0];
    const rejection = expect(first).rejects.toThrow('could not load');
    failed.dispatchEvent(new Event('error')); await rejection;
    expect(failed.isConnected).toBe(false);
    const retry = load(); expect(retry).not.toBe(first);
    window.AvianWoodlandBirds = sharedWindow.AvianWoodlandBirds;
    scripts()[0].dispatchEvent(new Event('load')); await retry;
    expect(vi.getTimerCount()).toBe(0);
  });
  it('rejects incomplete cached APIs and makes timeouts retryable', async () => {
    const load = loader(), first = load();
    const badAPI = expect(first).rejects.toThrow('unavailable');
    window.AvianWoodlandBirds = { version: '1.0.0', supports: () => true };
    scripts()[0].dispatchEvent(new Event('load')); await badAPI;
    const retry = load(), timeout = expect(retry).rejects.toThrow('too long');
    await vi.advanceTimersByTimeAsync(20000); await timeout;
    expect(scripts()).toHaveLength(0); expect(vi.getTimerCount()).toBe(0);
    const final = load(); window.AvianWoodlandBirds = sharedWindow.AvianWoodlandBirds;
    scripts()[0].dispatchEvent(new Event('load')); await final;
  });
});

describe('Shared woodland prey in Raptor Lab', () => {
  it('adds blue jays alongside doves in the Cooper’s hawk pool and retains bird escape behavior', () => {
    const start = source.indexOf('  var PREY ='), end = source.indexOf('\n  };', source.indexOf('  var SPECIES_PREY =')) + 5;
    const data = Function(source.slice(start, end) + ';return {types:PREY,pools:SPECIES_PREY};')();
    expect(data.pools.coopersHawk).toEqual(['pigeon', 'songbird', 'mourningDove', 'blueJay']);
    const jay = data.types.blueJay;
    expect(jay.label).toBe('Blue Jay'); expect(jay.terrain).toBe('forest');
    expect(jay.sizeM).toBe(data.types.mourningDove.sizeM);
    const behavior = Function(helper('preyKindFor') + helper('preyEscapeProfile') + helper('preyReactsToApproach') +
      ';return {kind:preyKindFor,escape:preyEscapeProfile,reacts:preyReactsToApproach};')();
    expect(behavior.kind(jay)).toBe('bird'); expect(behavior.escape(jay).mode).toBe('burst-flight');
    expect(behavior.reacts(jay, 'bird', 4, 8)).toBe(true);
    expect(behavior.reacts(jay, 'bird', 12, 8)).toBe(false);
  });

  it('uses blue jay anatomy at Raptor scale and keeps a bird fallback for older cached factories', () => {
    const construct = Function('THREE', 'window', [
      'preyBirdPalette', 'createPreyBirdBodyGeometry', 'createPreyWingGeometry', 'createPreyTailGeometry',
      'preyKindFor', 'buildSharedWoodlandPrey', 'buildPreyVisual'
    ].map(helper).join('\n') + ';return buildPreyVisual;');
    for (const size of [.75, 3.15]) {
      const data = { id: 'blueJay', speedMps: 8, color: 0x5281b5 }, build = construct(THREE, sharedWindow);
      const model = build(data, size), prey = { animation: model };
      try {
        expect(model.sharedBird.root.userData.speciesId).toBe('blueJay');
        expect(model.sharedBird.root.userData.quality).toBe('low');
        expect(model.sharedWalk.ankle.toArray()).toEqual([0, model.sharedBird.profile.ankleY, model.sharedBird.profile.ankleZ]);
        expect(model.sharedProfile.reach).toBe(model.sharedBird.profile.walkReach);
        expect(model.sharedProfile.cruise).toBe(5.4); expect(model.sharedProfile.burst).toBe(6.4);
        const bounds = new THREE.Box3().setFromObject(model.root);
        expect(bounds.min.y).toBeCloseTo(-size * .42 * .72, 7);
        expect(bounds.max.z - bounds.min.z).toBeCloseTo(size * 1.85, 7);
      } finally { api.release(prey); }
      const fallback = construct(THREE, { AvianWoodlandBirds: { supports: () => false } })(data, size);
      expect(fallback.kind).toBe('bird'); expect(fallback.wings).toHaveLength(2);
      expect(fallback.sharedBird).toBeUndefined();
      const resources = new Set(); geometryState(fallback.root).forEach(({geometry, material}) => { resources.add(geometry); resources.add(material); });
      resources.forEach(resource => resource.dispose());
    }
  });

  it('uses the same real factory for dove and grouse while retaining Raptor ground contact and size scaling', () => {
    for (const id of ['mourningDove', 'grouse']) for (const size of [.75, 3.15]) {
      const prey = make(id, size), model = prey.animation;
      expect(model.sharedBird).toBeTruthy();
      expect(model.wings).toEqual([]); expect(model.tail).toBeNull();
      expect(model.sharedBird.root.parent).toBe(model.root);
      const bounds = new THREE.Box3().setFromObject(model.root);
      const legacy = legacyBuild(prey.data, size), oldBounds = new THREE.Box3().setFromObject(legacy.root);
      expect(bounds.min.y).toBeCloseTo(oldBounds.min.y, 3);
      expect(bounds.max.z - bounds.min.z).toBeCloseTo(oldBounds.max.z - oldBounds.min.z, 3);
      const legacyResources = new Set(); geometryState(legacy.root).forEach(({geometry, material}) => { legacyResources.add(geometry); legacyResources.add(material); });
      legacyResources.forEach(resource => resource.dispose());
      expect(model.root.getObjectByName('prey-tapered-wing')).toBeUndefined();
      api.release(prey);
    }
  });

  it('animates walking, takeoff, alert flight and reduced motion without rebuilding resources', () => {
    for (const id of ['mourningDove', 'grouse', 'blueJay']) {
      const prey = make(id), before = geometryState(prey.visual), pose = prey.animation.pose;
      prey.vx = 1.2; prey.flightHeight = 0;
      const restingFoot = prey.animation.sharedBird.feet[0].position.clone();
      let maximumFootTravel = 0;
      for (let frame = 0; frame < 60; frame++) {
        api.advance(pose, prey.vx, 0, 0, frame * 16, .7, false, 1 / 60, false);
        // Contact-based walking follows actual scene displacement. A velocity
        // label alone must not make a stationary bird skate its planted feet.
        prey.mesh.position.x += prey.vx / 60;
        prey.visual.position.y = .08;
        api.pose(prey, 1 / 60, false);
        maximumFootTravel = Math.max(maximumFootTravel, prey.animation.sharedBird.feet[0].position.distanceTo(restingFoot));
      }
      expect(prey.animation.sharedPose.walking).toBeGreaterThan(0);
      expect(prey.animation.sharedPose.stride).toBeGreaterThan(0);
      expect(prey.animation.sharedPose.landing).toBe(0);
      expect(maximumFootTravel).toBeGreaterThan(.001);
      expect(prey.visual.position.y).toBe(0);
      prey.vx = 8;
      for (let frame = 0; frame < 150; frame++) {
        api.advance(pose, 8, 2, 6, frame * 16, .7, true, 1 / 60, false);
        api.pose(prey, 1 / 60, false);
      }
      expect(prey.animation.sharedPose.flight).toBeGreaterThan(.99);
      expect(prey.animation.sharedPose.walking).toBeLessThan(.01);
      expect(prey.animation.sharedPose.effort).toBeGreaterThan(.8);
      expect(geometryState(prey.visual)).toEqual(before);
      api.pose(prey, 0, true);
      const rest = { ...prey.animation.sharedPose };
      api.pose(prey, 1, true);
      expect(prey.animation.sharedPose).toEqual(rest);
      expect(rest.effort).toBe(0); expect(rest.walking).toBe(0); expect(rest.phase).toBe(0);
      prey.visual.traverse(object => { expect([...object.position.toArray(), ...object.rotation.toArray().slice(0, 3)] .every(Number.isFinite)).toBe(true); });
      api.release(prey);
    }
  });

  it('folds shared wings before carry bounds and disposes their resources exactly once', () => {
    for (const id of ['mourningDove', 'grouse', 'blueJay']) {
      const prey = make(id), model = prey.animation;
      model.pose.spread = 1; model.pose.phase = .8; model.pose.rate = 18;
      api.pose(prey, .1, false);
      const counts = new Map();
      geometryState(prey.visual).forEach(({ geometry, material }) => {
        [geometry, ...(Array.isArray(material) ? material : [material])].forEach(resource => {
          if (counts.has(resource)) return;
          counts.set(resource, 0); resource.addEventListener('dispose', () => counts.set(resource, counts.get(resource) + 1));
        });
      });
      const carry = Function('THREE', 'prey', 'releaseSharedWoodlandPrey', `
        var scene=new THREE.Scene(),talonGroup=new THREE.Group(),waterWakeGroup=new THREE.Group(),waterWakeEntries=[];
        scene.add(prey.mesh);var carriedPrey=null,studyBoundsDirty=false,motionNow=750,_rmFX=false,strikeFootExtension=0;
        var raptorFeet=[{morphTargetInfluences:[0,0]},{morphTargetInfluences:[0,0]}];
        var carriedPreyBounds=new THREE.Box3(),carriedPreySize=new THREE.Vector3(),carriedPreyCenter=new THREE.Vector3();
        ${helper('advanceBirdPreyHead')}
        ${helper('applyBirdPreyHeadPose')}
        ${helper('clearCarriedPrey')}
        ${helper('beginCarriedPrey')}
        return {begin:function(){beginCarriedPrey(prey);},clear:clearCarriedPrey,size:carriedPreySize,group:talonGroup};
      `)(THREE, prey, api.release);
      carry.begin();
      expect(model.sharedPose.flight).toBe(0); expect(model.sharedPose.effort).toBe(0);
      expect(prey.mesh.parent).toBe(carry.group);
      expect(Math.max(...carry.size.toArray())).toBeGreaterThan(0);
      expect(Math.max(...carry.size.toArray()) * prey.mesh.scale.x).toBeLessThanOrEqual(.680001);
      carry.clear(); api.release(prey);
      expect([...counts.values()].every(value => value === 1)).toBe(true);
      expect(model.sharedBird.root.parent).toBeNull();
    }
  });
  it('keeps species wingbeat phases continuous across threat changes and playback cadences', () => {
    const measured=[];
    for (const id of ['mourningDove','grouse','blueJay']) {
      const phases=[];
      for (const fps of [30,60,144]) {
        const prey=make(id);prey.animation.pose.spread=1;prey.animation.pose.rate=18;prey.vx=8;prey.vy=2;prey.alerted=true;
        for(let frame=0;frame<fps;frame++)api.pose(prey,1/fps,false);
        const before=prey.animation.sharedPose.phase;prey.alerted=false;prey.vy=-1;
        api.pose(prey,0,false);
        expect(prey.animation.sharedPose.phase).toBe(before);
        for(let frame=0;frame<fps;frame++)api.pose(prey,1/fps,false);
        phases.push(prey.animation.sharedPose.phase);
        expect(prey.animation.sharedPose.lookPitch*prey.visual.rotation.x).toBeLessThanOrEqual(0);
        api.release(prey);
      }
      expect(Math.max(...phases)-Math.min(...phases)).toBeLessThan(1e-9);measured.push(phases[0]);
    }
    expect(measured[1]).toBeGreaterThan(measured[0]);
    expect(measured[2]).toBeLessThan(measured[0]);
  });

  it('extends feet on descent before wing folding and keeps reduced-motion touchdown grounded', () => {
    const point = new THREE.Vector3();
    function toeHeight(prey) {
      prey.mesh.updateMatrixWorld(true); let minimum = Infinity;
      prey.visual.traverse(object => {
        if (object.name !== 'woodland-scaled-toes') return;
        const position = object.geometry.attributes.position;
        for (let vertex = 0; vertex < position.count; vertex++) {
          point.fromBufferAttribute(position, vertex).applyMatrix4(object.matrixWorld);
          minimum = Math.min(minimum, point.y);
        }
      });
      return minimum;
    }
    for (const id of ['mourningDove', 'grouse', 'blueJay']) {
      const prey = make(id), baseline = toeHeight(prey);
      try {
        prey.animation.pose.spread = .6; prey.animation.pose.bank = .15;
        prey.animation.sharedMotion.pitch = .12; prey.visual.position.y = .08;
        prey.vy = -1; prey.alerted = false;
        let previous = 0;
        for (const height of [.6, .3, .15, .05, 0]) {
          prey.flightHeight = height; api.pose(prey, 0, false);
          expect(prey.animation.sharedPose.landing).toBeGreaterThanOrEqual(previous);
          previous = prey.animation.sharedPose.landing;
        }
        expect(prey.animation.sharedPose.landing).toBe(1);
        expect(prey.animation.sharedPose.flight).toBe(.6);
        expect(toeHeight(prey)).toBeCloseTo(baseline, 9);
        api.pose(prey, 0, true); const still = { ...prey.animation.sharedPose }, contact = toeHeight(prey);
        api.pose(prey, 1, true);
        expect(prey.animation.sharedPose).toEqual(still); expect(toeHeight(prey)).toBe(contact);
        expect(contact).toBeCloseTo(baseline, 9);
        prey.flightHeight = .05; prey.alerted = true; prey.vy = 2;
        api.pose(prey, 0, false);
        expect(prey.animation.sharedPose.landing).toBe(0);
      } finally { api.release(prey); }
    }
  });

  it.each(['mourningDove', 'grouse', 'blueJay'])('keeps %s wings above ground through real touchdown at different wingbeat phases', id => {
    const point = new THREE.Vector3(), dt = 1 / 30;
    function lowestVertex(meshes) {
      let minimum = Infinity;
      for (const mesh of meshes) {
        const positions = mesh.geometry.attributes.position;
        for (let vertex = 0; vertex < positions.count; vertex++) {
          point.fromBufferAttribute(positions, vertex).applyMatrix4(mesh.matrixWorld);
          minimum = Math.min(minimum, point.y);
        }
      }
      return minimum;
    }
    for (const size of [.75, 3.15]) for (const initialPhase of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
      const prey = make(id, size), pose = prey.animation.pose, motion = prey.animation.sharedMotion;
      const bird = prey.animation.sharedBird;
      const wings = bird.wings.map(wing => wing.getObjectByName('woodland-layered-wing'));
      const feet = bird.feet.map(foot => foot.getObjectByName('woodland-scaled-toes'));
      try {
        prey.mesh.updateMatrixWorld(true);
        const contactFloor = lowestVertex(feet);
        prey.flightHeight = 6; prey.vx = 4; prey.vz = 0; prey.alerted = false;
        pose.spread = 1; pose.rate = 18; pose.phase = initialPhase;
        motion.phase = initialPhase; motion.rate = Math.PI * 2 * prey.animation.sharedProfile.burst; motion.effort = .9;
        let minimum = Infinity, worstPose, partialLanding = false;
        // Match the hunt loop's height decay, spread lag, vertical velocity,
        // world elevation and raw bob. Holding height at zero while feeding
        // an airborne spread would miss the actual staged-fold transition.
        for (let frame = 0; frame < 75; frame++) {
          const previousHeight = prey.flightHeight;
          prey.flightHeight += (0 - prey.flightHeight) * (1 - Math.exp(-4 * dt));
          prey.vy = (prey.flightHeight - previousHeight) / dt;
          prey.mesh.position.y = prey.flightHeight;
          api.advance(pose, prey.vx, prey.vz, prey.flightHeight, frame * dt, initialPhase, false, dt, false);
          prey.visual.position.y = Math.sin(pose.phase) * .08;
          api.pose(prey, dt, false);
          prey.mesh.updateMatrixWorld(true);
          const clearance = lowestVertex(wings) - contactFloor;
          if (clearance < minimum) {
            minimum = clearance;
            worstPose = { size, initialPhase, height: prey.flightHeight, flight: pose.spread,
              phase: prey.animation.sharedPose.phase % (Math.PI * 2), landing: prey.animation.sharedPose.landing };
          }
          partialLanding ||= pose.spread > .01 && pose.spread < .8 && prey.animation.sharedPose.landing > .05;
        }
        expect(partialLanding).toBe(true);
        expect(pose.spread).toBeLessThan(1e-5);
        expect(minimum, JSON.stringify(worstPose)).toBeGreaterThan(-1e-5);
      } finally { api.release(prey); }
    }
  });

  it('resumes quiet scanning after the wings and tail settle while retaining alert tracking', () => {
    for (const id of ['mourningDove', 'grouse', 'blueJay']) {
      const prey = make(id), look = prey.animation.birdLook;
      try {
        prey.flightHeight = 0; prey.animation.pose.spread = .45; prey.vy = -.3;
        look.yaw = .2; look.pitch = .06; look.activity = 0;
        prey.animation.sharedMotion.tail = .2;
        for (let frame = 0; frame < 30; frame++) api.pose(prey, 1 / 60, false);
        expect(prey.animation.sharedPose.lookYaw).toBe(0);
        expect(prey.animation.sharedPose.lookPitch).toBe(0);
        prey.animation.pose.spread = 0;
        api.pose(prey, 0, false);
        expect(Math.abs(prey.animation.sharedPose.lookYaw)).toBeLessThan(.001);
        let previous = prey.animation.sharedPose.lookYaw, largestStep = 0;
        for (let frame = 0; frame < 90; frame++) {
          api.pose(prey, 1 / 60, false);
          const yaw = prey.animation.sharedPose.lookYaw;
          expect(yaw).toBeGreaterThanOrEqual(previous - 1e-10);
          largestStep = Math.max(largestStep, yaw - previous); previous = yaw;
        }
        expect(previous).toBeGreaterThan(.19); expect(largestStep).toBeLessThan(.015);
        prey.animation.pose.spread = .45; prey.animation.sharedMotion.tail = .2; look.activity = 1;
        api.pose(prey, 0, false);
        expect(prey.animation.sharedPose.lookYaw).toBe(look.yaw);
        expect(prey.animation.sharedPose.lookPitch).toBe(look.pitch);
        api.pose(prey, 0, true); const still = { ...prey.animation.sharedPose };
        api.pose(prey, 1, true); expect(prey.animation.sharedPose).toEqual(still);
        expect(still.lookYaw).toBe(0); expect(still.lookPitch).toBe(0);
      } finally { api.release(prey); }
    }
  });
});
