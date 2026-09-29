import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');

// Run the actual pure model from the standalone plugin, without a second copy
// of its equations or a WebGL stub pretending to verify their behavior.
const source = readFileSync('stem_lab/stem_tool_galaxy.js', 'utf8');
const kernel = source.split('// BEGIN BLACK HOLE EXPERIMENT MODEL')[1].split('// END BLACK HOLE EXPERIMENT MODEL')[0];
const { trajectory, sample, tides, fragments, launchThrow, events, prediction, adjustThrow, cameraFit, distanceProfile } = new Function(kernel + ';return {trajectory:blackHoleTrajectory,sample:blackHoleSample,tides:blackHoleTides,fragments:blackHoleFragments,launchThrow:blackHoleThrow,events:blackHoleEvents,prediction:blackHolePrediction,adjustThrow:blackHoleAdjustThrow,cameraFit:blackHoleCameraFit,distanceProfile:blackHoleDistanceProfile};')();

describe('black hole experiment dynamics', () => {
  it.each([4,5,8])('radial release at %s Rs reaches the horizon in the analytical proper time', radius => {
    const run = trajectory({radius,sideways:0});
    const ratio = 1/radius;
    const expected = Math.sqrt(radius**3)*(Math.acos(Math.sqrt(ratio))+Math.sqrt(ratio*(1-ratio)))/2.5;
    expect(run.outcome).toBe('captured');
    expect(run.duration).toBeCloseTo(expected, 4);
    expect(run.samples.at(-1).radius).toBe(1);
    expect(run.samples.every((p,i,a) => p.radius>=1 && p.angle===0 && (!i || p.radius<=a[i-1].radius))).toBe(true);
  });

  it.each([4,5,8])('circular motion at %s Rs stays outside and completes an orbit', radius => {
    const run = trajectory({radius,sideways:1});
    expect(run.outcome).toBe('orbit');
    expect(Math.max(...run.samples.map(p => Math.abs(p.radius-radius)))).toBeLessThan(1e-8);
    expect(run.samples.at(-1).angle).toBeGreaterThanOrEqual(Math.PI*2);
  });

  it.each([4,5,8])('sufficient sideways motion at %s Rs escapes', radius => {
    const run = trajectory({radius,sideways:1.5});
    expect(run.outcome).toBe('escaped');
    expect(run.energySquared).toBeGreaterThan(1);
    expect(run.samples.at(-1).radialVelocity).toBeGreaterThan(0);
    expect(run.samples.at(-1).radius).toBeGreaterThanOrEqual(radius*1.8);
  });

  it('conserves geodesic energy through an angular infall', () => {
    const run = trajectory({radius:5,sideways:.65});
    expect(run.outcome).toBe('captured');
    for (const p of run.samples.slice(0,-1)) {
      const energy = p.radialVelocity**2+(1-1/p.radius)*(1+run.angularMomentum**2/p.radius**2);
      expect(Math.abs(energy-run.energySquared)).toBeLessThan(1e-7);
    }
  });

  it('replay and backwards scrubbing reproduce the same position', () => {
    const run = trajectory({radius:5,sideways:.65});
    const middle = sample(run,run.duration/2);
    sample(run,run.duration);
    expect(sample(run,run.duration/2)).toEqual(middle);
    expect(trajectory({radius:5,sideways:.65})).toEqual(run);
    expect(sample(run,-10).radius).toBe(5);
    expect(sample(run,Infinity).time).toBe(0);
    expect(sample(run,10000).radius).toBe(1);
  });

  it('tidal gradients follow inverse radius cubed and inverse mass squared at fixed r/Rs', () => {
    const small = tides(5,'stellar','probe');
    const large = tides(5,'supermassive','probe');
    expect(small.gradient/tides(10,'stellar','probe').gradient).toBeCloseTo(8,8);
    expect(small.gradient/large.gradient).toBeCloseTo((4000000/10)**2,0);
    expect(tides(1,'stellar','probe').disrupted).toBe(true);
    expect(tides(1,'supermassive','probe').disrupted).toBe(false);
    expect(tides(5,'supermassive','star').disrupted).toBe(true);
  });

  it('sanitizes saved nonfinite and out-of-range release values', () => {
    for(const options of [{radius:NaN,sideways:Infinity},{radius:-10,sideways:-5},{radius:999,sideways:999}]) {
      const run=trajectory(options);
      expect(run.releaseRadius).toBeGreaterThanOrEqual(4);
      expect(run.releaseRadius).toBeLessThanOrEqual(8);
      expect(run.samples.every(p=>Object.values(p).every(Number.isFinite))).toBe(true);
    }
  });

  it('supports inward and outward throws without changing the gravity law', () => {
    const rest=trajectory({radius:5}),inward=trajectory({radius:5,radialVelocity:-.4}),outward=trajectory({radius:5,radialVelocity:.65});
    expect(inward.outcome).toBe('captured');
    expect(inward.duration).toBeLessThan(rest.duration);
    expect(outward.outcome).toBe('escaped');
    expect(outward.samples[1].radius).toBeGreaterThan(5);
    for (const p of inward.samples.slice(0,-1)) expect(p.radialVelocity**2+1-1/p.radius).toBeCloseTo(inward.energySquared,6);
  });

  it('clockwise and anticlockwise orbits have identical radii and opposite angles', () => {
    const left=trajectory({radius:5,sideways:-1}),right=trajectory({radius:5,sideways:1});
    expect(left.outcome).toBe('orbit');
    expect(left.duration).toBe(right.duration);
    expect(sample(left,10).radius).toBe(sample(right,10).radius);
    expect(sample(left,10).angle).toBe(-sample(right,10).angle);
  });

  it('maps drag direction into radial and tangential velocity independently of launch angle', () => {
    expect(launchThrow(5,0,0,2.4/Math.sqrt(7)).sideways).toBeCloseTo(1,10);
    expect(launchThrow(5,0,-.96,0).radialVelocity).toBeCloseTo(-.4,10);
    const angle=.9,forward=.3,tangent=.2;
    const result=launchThrow(5,angle,2.4*(forward*Math.cos(angle)-tangent*Math.sin(angle)),2.4*(forward*Math.sin(angle)+tangent*Math.cos(angle)));
    expect(result.radialVelocity).toBeCloseTo(forward,10);
    expect(result.sideways).toBeCloseTo(tangent*Math.sqrt(7),10);
    expect(launchThrow(5,0,NaN,0)).toEqual({radialVelocity:0,sideways:0});
    expect(launchThrow(5,0,1000,1000)).toEqual({radialVelocity:.65,sideways:1.6});
  });

  it('separates fragment paths while preserving deterministic replay and horizon clipping', () => {
    const run=trajectory({radius:5,sideways:.3});
    const offsets=[{x:.18,y:0,z:0},{x:-.18,y:0,z:0},{x:0,y:0,z:-.15},{x:0,y:0,z:.4}];
    const debris=fragments(run,'stellar','probe',offsets);
    expect(debris.time).toBeGreaterThan(0);
    expect(debris.paths).toHaveLength(4);
    expect(debris.paths[3].captured).toBe(true);
    const outside=debris.paths.filter(p=>!p.captured);
    const positions=outside.map(p=>sample(p.trajectory,.2).radius);
    expect(new Set(positions).size).toBe(3);
    for(const p of outside){
      expect(p.trajectory.samples.every(s=>s.radius>=1&&Object.values(s).every(Number.isFinite))).toBe(true);
      expect(sample(p.trajectory,.2)).toEqual(sample(p.trajectory,.2));
    }
    expect(fragments(run,'stellar','probe',offsets)).toEqual(debris);
    expect(fragments(run,'supermassive','probe',offsets)).toBeNull();
  });

  it('places breakup and horizon bookmarks at the modeled times and within playback', () => {
    const run=trajectory({radius:5}),debris=fragments(run,'stellar','probe',[{x:0,y:0,z:0}]);
    const end=run.duration+3,list=events(run,debris,end);
    expect(list).toEqual([{key:'release',time:0},{key:'breakup',time:debris.time},{key:'capture',time:run.duration},{key:'end',time:end}]);
    const shorter=events(run,debris,debris.time-.1);
    expect(shorter.map(event=>event.key)).toEqual(['release','end']);
  });

  it('finds the first inward-to-outward turning point for a flyby', () => {
    const run=trajectory({radius:5,sideways:1.2,radialVelocity:-.3});
    expect(run.outcome).toBe('escaped');
    const closest=events(run,null,run.duration).find(event=>event.key==='closest');
    expect(closest.time).toBeGreaterThan(0);
    expect(Math.abs(sample(run,closest.time).radialVelocity)).toBeLessThan(1e-8);
    expect(sample(run,closest.time-.1).radius).toBeGreaterThan(sample(run,closest.time).radius);
    expect(sample(run,closest.time+.1).radius).toBeGreaterThan(sample(run,closest.time).radius);
    expect(events(run,null,closest.time-.1).some(event=>event.key==='closest')).toBe(false);
  });

  it('does not invent closest-approach events for circular or outward-only paths', () => {
    for(const sideways of [1,1.5]){
      const run=trajectory({radius:5,sideways});
      expect(events(run,null,run.duration).map(event=>event.key)).toEqual(['release','end']);
    }
  });

  it('reports path bounds and outcomes from the integrated trajectory', () => {
    for(const sideways of [0,1,1.5]){
      const run=trajectory({radius:5,sideways}),summary=prediction(run);
      expect(summary.outcome).toBe(run.outcome);
      expect(summary.minimumRadius).toBe(Math.min(...run.samples.map(s=>s.radius)));
      expect(summary.maximumRadius).toBe(Math.max(...run.samples.map(s=>s.radius)));
      expect(sample(run,summary.closestTime).radius).toBeCloseTo(summary.minimumRadius,10);
    }
    expect(prediction(trajectory({radius:5})).minimumRadius).toBe(1);
    expect(prediction(trajectory({radius:5,sideways:1})).minimumRadius).toBeCloseTo(5,8);
  });

  it('keeps finite-interval predictions distinct from a completed circular orbit', () => {
    const run=trajectory({radius:5,sideways:1,radialVelocity:-.1});
    expect(prediction(run).outcome).toBe('bound');
    expect(prediction(run).minimumRadius).toBeGreaterThan(1);
    expect(prediction(run).minimumRadius).toBeLessThan(5);
  });

  it('preserves an existing throw on pointer-down and a return to the drag origin', () => {
    const initial={sideways:1.15,radialVelocity:-.2};
    for(const angle of [0,.8,-2.1]){
      expect(adjustThrow(5,angle,initial,0,0).sideways).toBeCloseTo(initial.sideways,10);
      expect(adjustThrow(5,angle,initial,0,0).radialVelocity).toBeCloseTo(initial.radialVelocity,10);
      const atLimit=adjustThrow(5,angle,initial,100,100);
      expect(Math.abs(atLimit.sideways)).toBeLessThanOrEqual(1.6);
      expect(Math.abs(atLimit.radialVelocity)).toBeLessThanOrEqual(.65);
      expect(adjustThrow(5,angle,initial,0,0).sideways).toBeCloseTo(initial.sideways,10);
    }
  });

  it('adds drag displacement in the radial and sideways directions before clamping', () => {
    const initial={sideways:1,radialVelocity:.3};
    const result=adjustThrow(5,0,initial,-.24,2.4*.2/Math.sqrt(7));
    expect(result.radialVelocity).toBeCloseTo(.2,10);
    expect(result.sideways).toBeCloseTo(1.2,10);
    expect(adjustThrow(5,0,initial,-100,100)).toEqual({radialVelocity:-.65,sideways:1.6});
  });

  it.each([1.8,1,.55])('frames an elongated object from different angles at aspect %s', aspect => {
    const min=[-2,-.1,-.3],max=[1.8,.2,.4],fit=cameraFit(min,max,aspect);
    for(const [yaw,pitch] of [[0,0],[.72,.38],[-2.5,1.5]]){
      const camera=new THREE.PerspectiveCamera(48,aspect,.01,100),target=new THREE.Vector3(...fit.target);
      camera.position.set(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)).multiplyScalar(fit.distance).add(target);
      camera.lookAt(target);camera.updateMatrixWorld(true);
      for(const x of [min[0],max[0]])for(const y of [min[1],max[1]])for(const z of [min[2],max[2]]){
        const point=new THREE.Vector3(x,y,z).project(camera);
        expect(Math.abs(point.x)).toBeLessThan(.85);expect(Math.abs(point.y)).toBeLessThan(.85);
        expect(point.z).toBeGreaterThan(-1);expect(point.z).toBeLessThan(1);
      }
    }
  });

  it('moves the tracking target without changing framing when the same object translates', () => {
    const first=cameraFit([-1,-.2,-.3],[1,.2,.3],1),second=cameraFit([9,2.8,-4.3],[11,3.2,-3.7],1);
    expect(second.target).toEqual([10,3,-4]);
    expect(second.distance).toBeCloseTo(first.distance,10);
    expect(cameraFit([1,2,3],[1,2,3],1).distance).toBeGreaterThan(0);
  });

  it('ends the distance chart center at exact capture while the observation continues', () => {
    const run=trajectory({radius:5}),profile=distanceProfile(run,null,run.duration+3);
    expect(profile.points.find(p=>p.time===run.duration).center).toBe(1);
    expect(profile.points.filter(p=>p.time>run.duration).every(p=>p.center===null)).toBe(true);
    expect(profile.points[0].center).toBe(5);
    expect(profile.points.at(-1).time).toBe(run.duration+3);
    expect(profile.points.every(p=>p.near===null&&p.far===null)).toBe(true);
  });

  it('distinguishes constant orbital distance from outward escape in the distance chart', () => {
    const orbit=trajectory({radius:5,sideways:1}),escape=trajectory({radius:5,sideways:1.5});
    expect(distanceProfile(orbit,null,orbit.duration).points.every(p=>Math.abs(p.center-5)<1e-8)).toBe(true);
    const profile=distanceProfile(escape,null,escape.duration);
    expect(profile.points.at(-1).center).toBeGreaterThan(8.9);
    expect(profile.maximum).toBeGreaterThan(Math.max(...profile.points.map(p=>p.center)));
  });

  it('plots surviving debris bounds from their independent trajectories at every chart sample', () => {
    const run=trajectory({radius:5}),debris=fragments(run,'stellar','probe',[{x:0,y:0,z:.15},{x:0,y:0,z:-.15},{x:0,y:0,z:2}]);
    const duration=Math.min(run.duration+3,debris.time+12),profile=distanceProfile(run,debris,duration);
    expect(profile.points.some(p=>p.time===debris.time)).toBe(true);
    expect(profile.points.filter(p=>p.time<debris.time).every(p=>p.near===null)).toBe(true);
    for(const point of profile.points.filter(p=>p.time>=debris.time)){
      const elapsed=point.time-debris.time;
      const radii=debris.paths.filter(p=>p.trajectory&&!(p.trajectory.outcome==='captured'&&elapsed>=p.trajectory.duration)).map(p=>sample(p.trajectory,elapsed).radius);
      expect(point.near).toBe(radii.length?Math.min(...radii):null);
      expect(point.far).toBe(radii.length?Math.max(...radii):null);
    }
    expect(profile.points.some(p=>p.center===null&&p.near>1)).toBe(true);
    expect(distanceProfile(run,debris,duration)).toEqual(profile);
  });

  it('keeps the distance chart within a shortened observation interval', () => {
    const run=trajectory({radius:5}),duration=run.duration/2,profile=distanceProfile(run,null,duration);
    expect(profile.points.every(p=>p.time<=duration&&p.center>1)).toBe(true);
    expect(profile.points.at(-1).center).toBe(sample(run,duration).radius);
  });
});
