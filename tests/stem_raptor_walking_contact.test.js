import { describe, it, expect } from 'vitest';
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
function createApi(terrain = () => 0) {
  const result = Function('THREE', 'window', 'terrainHeightAt', [
    'buildSharedWoodlandPrey', 'applySharedWoodlandPreyPose', 'releaseSharedWoodlandPrey'
  ].map(helper).join('\n') + '\nreturn {build:buildSharedWoodlandPrey,pose:applySharedWoodlandPreyPose,release:releaseSharedWoodlandPrey};')(THREE, sharedWindow, terrain);
  result.terrain = terrain;
  return result;
}
const api = createApi();

function make(id, size = 2, modelApi = api) {
  const data = { id, sizeM: id === 'grouse' ? .30 : .16, speedMps: 8 };
  const animation = modelApi.build(data, size), mesh = new THREE.Group(); mesh.add(animation.root);
  const groundClearance = -new THREE.Box3().setFromObject(mesh).min.y;
  mesh.position.y = groundClearance;
  const toes = animation.sharedBird.feet.map(foot => {
    const geometry = foot.children[0].geometry, positions = geometry.attributes.position;
    const leg = id === 'grouse' ? .056 : id === 'blueJay' ? .037 : .034, indices = [];
    for (let i = 0; i < positions.count; i++) if (positions.getZ(i) > .009 && positions.getY(i) < -leg + .006) indices.push(i);
    expect(indices.length).toBeGreaterThan(12);
    return { mesh: foot.children[0], indices };
  });
  return { data, animation, mesh, visual: animation.root, visualSize: size, groundClearance, vx: 0, vz: 0, vy: 0, flightHeight: 0, bobPhase: .7, toes, modelApi };
}
function points(prey, foot) {
  prey.mesh.updateMatrixWorld(true);
  const part = prey.toes[foot], attribute = part.mesh.geometry.attributes.position;
  return part.indices.map(i => new THREE.Vector3().fromBufferAttribute(attribute, i).applyMatrix4(part.mesh.matrixWorld));
}
function step(prey, dt, speed, heading = 0) {
  prey.vx = Math.sin(heading) * speed; prey.vz = Math.cos(heading) * speed;
  prey.mesh.position.x += prey.vx * dt; prey.mesh.position.z += prey.vz * dt;
  prey.mesh.position.y = prey.groundClearance + prey.modelApi.terrain(prey.mesh.position.x, prey.mesh.position.z);
  prey.visual.rotation.y = heading; prey.visual.position.y = .08;
  prey.modelApi.pose(prey, dt, false);
}

describe('Raptor shared woodland walking contacts', () => {
  it.each(['mourningDove', 'grouse', 'blueJay'])('keeps actual %s support toes fixed in world space at several cadences and sizes', id => {
    for (const size of [.75, 3.15]) for (const fps of [30, 60, 144]) {
      const prey = make(id, size), dt = 1 / fps, old = [null, null], planted = [false, false];
      const roots = prey.animation.sharedBird.feet.map(foot => foot.children[0].geometry.attributes.position.array);
      let contacts = 0, swings = 0, maxDrift = 0, minimum = Infinity, maximumReach = 0;
      try {
        api.pose(prey, 0, false);
        for (let frame = 0; frame < fps * 3; frame++) {
          step(prey, dt, size * .32);
          const targets = prey.animation.sharedPose.footTargets;
          if (!targets || prey.animation.sharedPose.footTargetBlend < 1) { planted.fill(false); continue; }
          for (let f = 0; f < 2; f++) {
            const current = points(prey, f), support = targets[f].swing < 0;
            if (support && planted[f]) {
              for (let vertex = 0; vertex < current.length; vertex++) maxDrift = Math.max(maxDrift, current[vertex].distanceTo(old[f][vertex]));
              contacts++;
            }
            if (!support) swings++;
            for (const point of current) minimum = Math.min(minimum, point.y);
            maximumReach = Math.max(maximumReach, Math.hypot(targets[f].x - prey.animation.sharedWalk.feet[f].rest.x, targets[f].z - .006));
            old[f] = current; planted[f] = support;
          }
        }
        expect(contacts).toBeGreaterThan(fps);
        expect(swings).toBeGreaterThan(fps / 2);
        expect(maxDrift).toBeLessThan(1e-6);
        expect(minimum).toBeGreaterThan(-1e-6);
        expect(maximumReach).toBeLessThan(id === 'grouse' ? .070 : id === 'blueJay' ? .047 : .045);
        prey.animation.sharedBird.feet.forEach((foot, f) => expect(foot.children[0].geometry.attributes.position.array).toBe(roots[f]));
      } finally { api.release(prey); }
    }
  }, 20000);

  it.each(['mourningDove', 'grouse', 'blueJay'])('keeps actual %s soles fixed through a turn and a long settled stop', id => {
    const prey = make(id), dt = 1 / 60;
    let previous = null, previousSupport = [false, false], maximumJump = 0;
    try {
      api.pose(prey, 0, false);
      for (let frame = 0; frame < 780; frame++) {
        const heading = frame < 60 ? 0 : Math.min(Math.PI / 2, (frame - 60) * Math.PI / 180);
        step(prey, dt, frame < 180 ? .64 : 0, heading);
        const targets = prey.animation.sharedPose.footTargets;
        if (!targets || prey.animation.sharedPose.footTargetBlend < 1) { previous = null; previousSupport = [false, false]; continue; }
        const current = [points(prey, 0), points(prey, 1)];
        for (let f = 0; f < 2; f++) {
          if (previous) {
            const drift = Math.max(...current[f].map((point, i) => point.distanceTo(previous[f][i])));
            maximumJump = Math.max(maximumJump, drift);
            if (previousSupport[f] && targets[f].swing < 0) expect(drift).toBeLessThan(1e-6);
          }
        }
        previous = current; previousSupport = targets.map(target => target.swing < 0);
      }
      expect(maximumJump).toBeLessThan(.09);
      expect(prey.animation.sharedPose.footTargets.every(target => target.swing < 0)).toBe(true);
      const stopped = points(prey, 0);
      step(prey, dt, 0, Math.PI / 2);
      const later = points(prey, 0);
      expect(Math.max(...later.map((point, i) => point.distanceTo(stopped[i])))).toBeLessThan(1e-6);
      // The uppermost leg ring must remain in the body after walking decays.
      expect(prey.animation.sharedPose.walking).toBeLessThan(1e-12);
      let displacedLegs = 0;
      for (let f = 0; f < 2; f++) {
        const target = prey.animation.sharedPose.footTargets[f], rest = prey.animation.sharedWalk.feet[f].rest;
        if (Math.hypot(target.x - rest.x, target.z - rest.z) < .001) continue;
        displacedLegs++;
        const leg = prey.toes[f].mesh, geometry = leg.geometry.attributes.position, ringCenter = new THREE.Vector3();
        for (let v = 0; v < 6; v++) ringCenter.add(new THREE.Vector3().fromBufferAttribute(geometry, v));
        ringCenter.multiplyScalar(1 / 6).applyMatrix4(leg.matrixWorld);
        const hip = new THREE.Vector3(rest.x + prey.animation.sharedBird.body.position.x, prey.animation.sharedBird.body.position.y - .010, .002);
        prey.animation.sharedBird.root.localToWorld(hip);
        expect(ringCenter.distanceTo(hip)).toBeLessThan(1e-6);
      }
      expect(displacedLegs).toBeGreaterThan(0);
    } finally { api.release(prey); }
  });

  it('projects both initial ankle anchors to their own terrain samples on a shallow slope', () => {
    const terrain = (x, z) => .03 * x + .02 * z, slopeApi = createApi(terrain), prey = make('mourningDove', 2, slopeApi);
    try {
      slopeApi.pose(prey, 0, false); step(prey, 1 / 60, .64);
      const walk = prey.animation.sharedWalk;
      expect(walk.active).toBe(true);
      const scale = prey.animation.sharedBird.root.getWorldScale(new THREE.Vector3()).x;
      for (const foot of walk.feet) expect(foot.anchor.y - terrain(foot.anchor.x, foot.anchor.z)).toBeCloseTo(foot.clearance * scale, 8);
      for (let frame = 0; frame < 8; frame++) step(prey, 1 / 60, 0);
      expect(prey.animation.sharedPose.footTargetBlend).toBe(1);
      prey.mesh.updateMatrixWorld(true);
      for (let f = 0; f < 2; f++) {
        const ankle = walk.ankle.clone();
        prey.animation.sharedBird.feet[f].localToWorld(ankle);
        expect(ankle.y - terrain(ankle.x, ankle.z)).toBeCloseTo(walk.feet[f].clearance * scale, 8);
      }
      expect(walk.feet[0].anchor.y).not.toBeCloseTo(walk.feet[1].anchor.y, 6);
    } finally { slopeApi.release(prey); }
  });

  it('resets contacts for flight, reduced motion, relocation, carry and disposal', () => {
    const prey = make('mourningDove');
    function walk() { prey.flightHeight = 0; prey.animation.pose.spread = 0; for (let i = 0; i < 45; i++) step(prey, 1 / 60, .64); }
    try {
      walk(); expect(prey.animation.sharedWalk.active).toBe(true);
      prey.flightHeight = 1; prey.animation.pose.spread = 1; api.pose(prey, 1 / 60, false);
      expect(prey.animation.sharedPose.footTargets).toBeNull(); expect(prey.animation.sharedWalk.active).toBe(false);
      walk(); api.pose(prey, 0, true);
      expect(prey.animation.sharedPose.footTargets).toBeNull(); expect(prey.animation.sharedWalk.active).toBe(false);
      walk(); prey.mesh.position.x += 20; api.pose(prey, 1 / 60, false);
      expect(prey.animation.sharedPose.footTargets).toBeNull(); expect(prey.animation.sharedWalk.active).toBe(false);
      walk(); prey.mesh.name = 'raptor-carried-prey'; api.pose(prey, 1 / 60, false);
      expect(prey.animation.sharedPose.footTargets).toBeNull(); expect(prey.animation.sharedWalk.active).toBe(false);
      prey.mesh.name = ''; walk(); api.release(prey);
      expect(prey.animation.sharedPose.footTargets).toBeNull(); expect(prey.animation.sharedWalk.active).toBe(false);
      expect(prey.animation.sharedBird.root.parent).toBeNull();
    } finally { api.release(prey); }
  });

  it('releases unreachable contacts instead of stretching legs during repeated scene corrections', () => {
    const prey = make('mourningDove', .75);
    let released = 0;
    try {
      api.pose(prey, 0, false);
      for (let frame = 0; frame < 60; frame++) {
        step(prey, 1 / 60, 8);
        const targets = prey.animation.sharedPose.footTargets;
        if (!targets) released++;
        else targets.forEach((target, f) => {
          const rest = prey.animation.sharedWalk.feet[f].rest;
          expect(Math.hypot(target.x - rest.x, target.y - rest.y, target.z - rest.z)).toBeLessThanOrEqual(.044001);
        });
      }
      expect(released).toBeGreaterThan(1);
    } finally { api.release(prey); }
  });

  it.each(['mourningDove', 'grouse', 'blueJay'])('hands actual %s toe geometry across launch and interrupted touchdown without a threshold snap', id => {
    const prey = make(id), allPoints = () => [points(prey, 0), points(prey, 1)].flat();
    const difference = (a, b) => Math.max(...a.map((point, i) => point.distanceTo(b[i])));
    function pose(flight, altitude, dt = 0) {
      prey.animation.pose.spread = flight; prey.flightHeight = altitude; prey.alerted = true;
      prey.mesh.position.y = prey.groundClearance + altitude;
      api.pose(prey, dt, false);
      return allPoints();
    }
    try {
      api.pose(prey, 0, false);
      for (let frame = 0; frame < 240; frame++) {
        step(prey, 1 / 60, .64);
        if (frame > 90 && prey.animation.sharedPose.footTargets?.some(target => target.swing > .4 && target.swing < .6)) break;
      }
      expect(prey.animation.sharedPose.footTargets.some(target => target.swing > .4 && target.swing < .6)).toBe(true);
      let before = pose(.014999, .01), after = pose(.015001, .01);
      expect(difference(before, after)).toBeLessThan(1e-4);
      expect(prey.animation.sharedPose.footTargetBlend).toBe(1);
      expect(prey.animation.sharedPose.footTargets).not.toBeNull();
      // The release is half finished; reversing at the same threshold must
      // retain both the actual foot geometry and its existing blend weight.
      pose(.015001, .01, .06); const midBlend = prey.animation.sharedPose.footTargetBlend;
      before = allPoints(); after = pose(.014999, .01);
      expect(midBlend).toBeCloseTo(.5, 12);
      expect(prey.animation.sharedPose.footTargetBlend).toBe(midBlend);
      expect(difference(before, after)).toBeLessThan(1e-4);
      for (let frame = 0; frame < 18; frame++) pose(0, 0, 1 / 144);
      expect(prey.animation.sharedPose.footTargetBlend).toBe(1);
      // Height is an independent gate, including a launch with wings still
      // mostly folded. Crossing it must also preserve the visible digits.
      before = pose(.01, .024999); after = pose(.01, .025001);
      expect(difference(before, after)).toBeLessThan(1e-4);
      expect(prey.animation.sharedPose.footTargets).not.toBeNull();
      pose(1, 2);
      expect(prey.animation.sharedPose.footTargets).toBeNull();
      expect(prey.animation.sharedPose.footTargetBlend).toBe(0);
    } finally { api.release(prey); }
  });

  it('gives the same half-release toe pose at 30, 60 and 144fps and finishes with no stale contact influence', () => {
    const poses = [];
    for (const fps of [30, 60, 144]) {
      const prey = make('mourningDove');
      try {
        api.pose(prey, 0, false);
        for (let frame = 0; frame < 100; frame++) step(prey, 1 / 60, .64);
        prey.animation.pose.spread = .05; prey.flightHeight = .04; prey.alerted = true;
        prey.mesh.position.y = prey.groundClearance + .04;
        let elapsed = 0;
        while (elapsed < .06 - 1e-12) { const dt = Math.min(1 / fps, .06 - elapsed); api.pose(prey, dt, false); elapsed += dt; }
        expect(prey.animation.sharedPose.footTargetBlend).toBeCloseTo(.5, 12);
        poses.push([points(prey, 0), points(prey, 1)].flat());
        while (elapsed < .125 - 1e-12) { const dt = Math.min(1 / fps, .125 - elapsed); api.pose(prey, dt, false); elapsed += dt; }
        expect(prey.animation.sharedPose.footTargets).toBeNull();
        expect(prey.animation.sharedPose.footTargetBlend).toBe(0);
        expect(prey.animation.sharedWalk.releasing).toBe(false);
      } finally { api.release(prey); }
    }
    for (const pose of poses.slice(1)) expect(Math.max(...pose.map((point, i) => point.distanceTo(poses[0][i])))).toBeLessThan(1e-6);
  });

  it('keeps actual lower-leg segments within anatomical length during a fast translated launch', () => {
    for (const id of ['mourningDove', 'grouse', 'blueJay']) for (const size of [.75, 3.15]) for (const fps of [30, 60, 144]) {
      const prey = make(id, size), legLength = id === 'grouse' ? .056 : id === 'blueJay' ? .037 : .034;
      const lowerLength = Math.hypot(legLength + .006, .006);
      try {
        api.pose(prey, 0, false);
        for (let frame = 0; frame < 80; frame++) step(prey, 1 / 60, size * .32);
        for (let frame = 1; frame <= Math.ceil(fps * .16); frame++) {
          const dt = 1 / fps, time = frame * dt;
          prey.mesh.position.z += 9 * dt; prey.mesh.position.y = prey.groundClearance + time;
          prey.flightHeight = time; prey.alerted = true; prey.vz = 9; prey.vy = 1; prey.animation.pose.spread = time * 2;
          api.pose(prey, dt, false);
          for (const foot of prey.animation.sharedBird.feet) {
            const positions = foot.children[0].geometry.attributes.position;
            const knee = new THREE.Vector3(), ankle = new THREE.Vector3();
            for (let side = 0; side < 6; side++) {
              knee.add(new THREE.Vector3().fromBufferAttribute(positions, 2 * 6 + side));
              ankle.add(new THREE.Vector3().fromBufferAttribute(positions, 6 * 6 + side));
            }
            knee.multiplyScalar(1 / 6); ankle.multiplyScalar(1 / 6);
            expect(knee.distanceTo(ankle)).toBeLessThanOrEqual(lowerLength + 1e-6);
          }
        }
        expect(prey.animation.sharedPose.footTargets).toBeNull();
      } finally { api.release(prey); }
    }
  }, 20000);
});
