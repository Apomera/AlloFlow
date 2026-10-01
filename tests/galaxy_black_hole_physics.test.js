import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');

// Run the actual pure model from the standalone plugin, without a second copy
// of its equations or a WebGL stub pretending to verify their behavior.
const source = readFileSync('stem_lab/stem_tool_galaxy.js', 'utf8');
const kernel = source.split('// BEGIN BLACK HOLE EXPERIMENT MODEL')[1].split('// END BLACK HOLE EXPERIMENT MODEL')[0];
const { trajectory, sample, tides, fragments, launchThrow, events, prediction, adjustThrow, cameraFit, distanceProfile, fragmentState, integrate, captureTime, references, clearSight, localMotion, fragmentMotion, turningPoints, fragmentMoments, adjacentMoment } = new Function(kernel + ';return {trajectory:blackHoleTrajectory,sample:blackHoleSample,tides:blackHoleTides,fragments:blackHoleFragments,launchThrow:blackHoleThrow,events:blackHoleEvents,prediction:blackHolePrediction,adjustThrow:blackHoleAdjustThrow,cameraFit:blackHoleCameraFit,distanceProfile:blackHoleDistanceProfile,fragmentState:blackHoleFragmentState,integrate:blackHoleIntegrate,captureTime:blackHoleFragmentCaptureTime,references:blackHoleLocalReferences,clearSight:blackHoleClearSight,localMotion:blackHoleLocalMotion,fragmentMotion:blackHoleFragmentMotion,turningPoints:blackHoleTurningPoints,fragmentMoments:blackHoleFragmentMoments,adjacentMoment:blackHoleAdjacentMoment};')();

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
      const radii=debris.paths.filter(p=>p.trajectory&&!(p.trajectory.outcome==='captured'&&point.time>=debris.time+p.trajectory.duration)).map(p=>sample(p.trajectory,elapsed).radius);
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

  it('keeps orbital debris moving for the full center revolution', () => {
    const run=trajectory({radius:5,sideways:1}),debris=fragments(run,'stellar','star',[{x:0,y:0,z:0}]);
    const plan=debris.paths[0],end=sample(plan.trajectory,plan.trajectory.duration);
    expect(debris.duration).toBe(run.duration);
    expect(plan.trajectory.duration+debris.time).toBeCloseTo(run.duration,9);
    expect(plan.trajectory.duration).toBeGreaterThan(12);
    expect(end.angle+plan.angle).toBeCloseTo(Math.PI*2,3);
    expect(sample(plan.trajectory,20).angle).toBeGreaterThan(sample(plan.trajectory,19).angle);
    expect(end.radius).toBeCloseTo(5,8);
  });

  it('continues outside parcels past their old escape cutoff without freezing', () => {
    const run=trajectory({radius:4,sideways:1}),debris=fragments(run,'stellar','star',[{x:0,y:0,z:-.14}]);
    const plan=debris.paths[0],path=plan.trajectory;
    expect(path.energySquared).toBeGreaterThan(1);
    expect(path.duration+debris.time).toBeCloseTo(debris.duration,9);
    expect(sample(path,path.duration).radius).toBeGreaterThan(path.releaseRadius*1.8);
    expect(sample(path,path.duration).radius).toBeGreaterThan(sample(path,path.duration-1).radius);
    expect(fragmentState(debris,0,debris.duration).phase).toBe('outside');
    expect(fragmentState(debris,0,debris.duration).energy).toBe('unbound');
  });

  it('covers long bound observations with compact samples and conserved energy', () => {
    const run=trajectory({radius:5,sideways:1,radialVelocity:-.1}),debris=fragments(run,'stellar','star',[{x:0,y:0,z:0}]),path=debris.paths[0].trajectory;
    expect(run.duration).toBeCloseTo(120,8);
    expect(path.duration+debris.time).toBeCloseTo(run.duration,8);
    expect(path.samples.length).toBeLessThan(5000);
    for(const p of path.samples){
      const energy=p.radialVelocity**2+(1-1/p.radius)*(1+path.angularMomentum**2/p.radius**2);
      expect(Math.abs(energy-path.energySquared)).toBeLessThan(1e-7);
    }
    expect(sample(path,110)).not.toEqual(sample(path,100));
  });

  it('keeps sparse fragment interpolation close to dense integration through capture', () => {
    const dense=integrate(5,-.1,1.1,30,{stopAtOutcome:false}),sparse=integrate(5,-.1,1.1,30,{stopAtOutcome:false,sampleEvery:8});
    expect(sparse.outcome).toBe('captured');
    expect(sparse.duration).toBe(dense.duration);
    expect(sparse.samples.at(-1)).toEqual(dense.samples.at(-1));
    for(let i=0;i<200;i++){
      const t=dense.duration*i/199,a=sample(dense,t),b=sample(sparse,t);
      expect(Math.abs(a.radius-b.radius)).toBeLessThan(2e-5);
      expect(Math.abs(a.angle-b.angle)).toBeLessThan(2e-5);
    }
  });

  it('reports waiting and exact capture without showing a captured fragment outside', () => {
    const run=trajectory({radius:5}),debris=fragments(run,'stellar','probe',[{x:0,y:0,z:0},{x:0,y:0,z:.4}]);
    const capture=debris.time+debris.paths[0].trajectory.duration;
    expect(fragmentState(debris,0,0)).toEqual({phase:'waiting'});
    expect(fragmentState(debris,0,capture-1e-6).phase).toBe('outside');
    expect(fragmentState(debris,0,capture).phase).toBe('captured');
    expect(fragmentState(debris,0,capture).radius).toBe(1);
    expect(fragmentState(debris,1,debris.time)).toEqual({phase:'captured',radius:1});
    expect(fragmentState(debris,-1,1)).toBeNull();expect(fragmentState(debris,2,1)).toBeNull();
    expect(fragmentState(null,0,1)).toBeNull();
  });

  it('reports radial direction and bound energy without promising survival', () => {
    const run=trajectory({radius:5}),debris=fragments(run,'stellar','probe',[{x:0,y:0,z:0}]);
    const middle=debris.time+debris.paths[0].trajectory.duration/2;
    expect(fragmentState(debris,0,middle)).toMatchObject({phase:'outside',motion:'inward',energy:'bound'});
    expect(debris.paths[0].trajectory.outcome).toBe('captured');
    const end=fragmentState(debris,0,debris.duration);
    expect(fragmentState(debris,0,middle).phase).toBe('outside');
    expect(end.phase).toBe('captured');
  });

  it('bookmarks individual capture at its exact absolute playback time', () => {
    const run=trajectory({radius:5}),debris=fragments(run,'stellar','probe',[{x:0,y:0,z:0},{x:0,y:0,z:.4}]);
    expect(captureTime(debris,0)).toBe(debris.time+debris.paths[0].trajectory.duration);
    expect(fragmentState(debris,0,captureTime(debris,0)).phase).toBe('captured');
    expect(captureTime(debris,1)).toBe(debris.time);
    expect(captureTime(debris,-1)).toBeNull();expect(captureTime(debris,2)).toBeNull();expect(captureTime(null,0)).toBeNull();
    const orbit=trajectory({radius:5,sideways:1}),outside=fragments(orbit,'stellar','star',[{x:0,y:0,z:0}]);
    expect(captureTime(outside,0)).toBeNull();
  });

  it('scales local radius and tides with mass while retaining the same static-clock factor', () => {
    const small=references(5,'stellar'),large=references(5,'supermassive');
    expect(small.distanceKm).toBeCloseTo(147.667,6);
    expect(large.distanceKm/small.distanceKm).toBe(400000);
    expect(small.gradient/large.gradient).toBeCloseTo(400000**2,0);
    expect(small.clockFactor).toBeCloseTo(Math.sqrt(.8),10);
    expect(large.clockFactor).toBe(small.clockFactor);
    expect(references(2,'stellar').gradient/references(4,'stellar').gradient).toBeCloseTo(8,10);
    for(const radius of [1,0,-3,NaN,Infinity])expect(references(radius,'stellar')).toBeNull();
  });

  it('blocks sight through the horizon while allowing foreground and grazing parcels', () => {
    expect(clearSight([0,0,5],[0,0,-2],.43)).toBe(false);
    expect(clearSight([0,0,5],[0,0,2],.43)).toBe(true);
    expect(clearSight([0,0,5],[1,0,-2],.43)).toBe(true);
    expect(clearSight([-5,.43,0],[5,.43,0],.43)).toBe(true);
    expect(clearSight([-5,.42,0],[5,.42,0],.43)).toBe(false);
    expect(clearSight([0,0,5],[0,0,0],.43)).toBe(false);
    expect(clearSight([0,0,5],[0,0,5],.43)).toBe(true);
    expect(clearSight([0,0,5],[NaN,0,2],.43)).toBe(false);
  });
  it('measures circular and retrograde speed in the local stationary frame', () => {
    for(const radius of [4,5,8])for(const sign of [-1,1]){
      const run=trajectory({radius,sideways:sign}),m=localMotion(run,run.duration*.4);
      expect(m.speed).toBeCloseTo(1/Math.sqrt(2*(radius-1)),10);
      expect(m.radial).toBeCloseTo(0,10);expect(m.transverse).toBeCloseTo(sign*m.speed,10);
      expect(m.clockRate).toBeCloseTo(Math.sqrt(1-3/(2*radius)),10);
    }
  });

  it('distinguishes a clock at rest from moving infall and approaches c outside the horizon', () => {
    const released=trajectory({radius:5}),rest=localMotion(released,0);
    expect(rest.speed).toBeCloseTo(0,10);expect(rest.clockRate).toBeCloseTo(Math.sqrt(.8),10);
    const run=integrate(8,-Math.sqrt(1/8),0,20);
    expect(run.energySquared).toBeCloseTo(1,12);
    for(const p of run.samples.slice(0,-1).filter((_,i)=>i%60===0)){
      const m=localMotion(run,p.time);
      expect(m.speed).toBeCloseTo(Math.sqrt(1/p.radius),8);
      expect(m.radial).toBeCloseTo(-m.speed,7);expect(m.transverse).toBe(0);
      expect(m.clockRate).toBeCloseTo(1-1/p.radius,10);expect(m.speed).toBeLessThan(1);
    }
    expect(localMotion(run,run.duration-.0001).speed).toBeGreaterThan(.999);
    expect(localMotion(run,run.duration)).toBeNull();
  });

  it('links the fragment arrow to its drawn tangent and reproduces motion after rewind', () => {
    const run=trajectory({radius:4,sideways:1}),debris=fragments(run,'stellar','star',[{x:.03,y:.04,z:-.03}]),plan=debris.paths[0],time=debris.time+.7;
    const position=(time,rotation)=>{const p=sample(plan.trajectory,time-debris.time),a=rotation+plan.angle+p.angle;return [.43*p.radius*Math.cos(a),plan.vertical*p.radius/plan.initialRadius,.43*p.radius*Math.sin(a)];};
    for(const rotation of [0,1.2]){
      const m=fragmentMotion(debris,0,time,rotation),a=position(time-.0001,rotation),b=position(time+.0001,rotation),delta=b.map((v,i)=>v-a[i]),length=Math.hypot(...delta);
      expect(Math.hypot(...m.direction)).toBeCloseTo(1,10);
      expect(m.direction.reduce((sum,v,i)=>sum+v*delta[i]/length,0)).toBeGreaterThan(.99999);
      expect(m.clockRate).toBeCloseTo(Math.sqrt(1-1/fragmentState(debris,0,time).radius)*Math.sqrt(1-m.speed*m.speed),10);
      fragmentMotion(debris,0,debris.duration,rotation);expect(fragmentMotion(debris,0,time,rotation)).toEqual(m);
    }
    expect(fragmentMotion(debris,0,0,0)).toBeNull();expect(fragmentMotion(debris,-1,time,0)).toBeNull();
  });

  it('omits stationary-frame motion references at capture or for invalid energy', () => {
    expect(localMotion(null,0)).toBeNull();expect(localMotion({samples:[],energySquared:NaN},0)).toBeNull();
    expect(localMotion({samples:[],energySquared:0},0)).toBeNull();
    const run=trajectory({radius:5}),debris=fragments(run,'stellar','probe',[{x:0,y:0,z:0},{x:0,y:0,z:.4}]);
    expect(fragmentMotion(debris,0,captureTime(debris,0),0)).toBeNull();
    expect(fragmentMotion(debris,1,debris.time,0)).toBeNull();
  });

  it('finds radial turns without treating release, zero touches, or circular noise as turns', () => {
    const run={duration:6,samples:[{time:0,radius:5,radialVelocity:0},{time:1,radius:4,radialVelocity:-1},{time:2,radius:3,radialVelocity:0},{time:3,radius:4,radialVelocity:1},{time:4,radius:5,radialVelocity:0},{time:5,radius:4,radialVelocity:-1},{time:6,radius:3,radialVelocity:-1}]};
    expect(turningPoints(run,10,20)).toEqual([{key:'closest',time:12,radius:3},{key:'farthest',time:14,radius:5}]);
    expect(turningPoints(run,10,13)).toEqual([{key:'closest',time:12,radius:3}]);
    const touch={duration:2,samples:[{time:0,radius:4,radialVelocity:-1},{time:1,radius:3,radialVelocity:0},{time:2,radius:2,radialVelocity:-1}]};
    expect(turningPoints(touch,0,2)).toEqual([]);
    expect(turningPoints(trajectory({radius:5,sideways:1}),0,120)).toEqual([]);
  });

  it('interpolates a real fragment turn at the same time used by its scene sample', () => {
    const run=integrate(5,-.12,5/Math.sqrt(7),120,{stopAtOutcome:false,sampleEvery:8}),debris={time:2,paths:[{trajectory:run}]};
    const moments=fragmentMoments(debris,0,2+run.duration),turns=moments.filter(e=>e.key==='closest'||e.key==='farthest');
    expect(turns.length).toBeGreaterThan(1);expect(moments[0].key).toBe('breakup');expect(moments.at(-1).key).toBe('end');
    for(const event of turns){const p=sample(run,event.time-2);expect(p.radius).toBe(event.radius);expect(Math.abs(p.radialVelocity)).toBeLessThan(1e-7);const before=sample(run,event.time-2-.001),after=sample(run,event.time-2+.001);expect(before.radialVelocity<0).toBe(event.key==='closest');expect(after.radialVelocity>0).toBe(event.key==='closest');}
    expect(moments.every((e,i)=>e.time>=2&&e.time<=2+run.duration&&(!i||e.time>moments[i-1].time))).toBe(true);
  });

  it('ends captured fragment moments at the exact crossing and clips to the observation', () => {
    const run=trajectory({radius:5}),debris=fragments(run,'stellar','probe',[{x:0,y:0,z:0},{x:0,y:0,z:.4}]);
    const moments=fragmentMoments(debris,0,debris.duration);expect(moments.at(-1)).toEqual({key:'capture',time:captureTime(debris,0),radius:1});
    expect(fragmentMoments(debris,1,debris.duration)).toEqual([{key:'capture',time:debris.time,radius:1}]);
    expect(fragmentMoments(debris,0,debris.time-.01)).toEqual([]);expect(fragmentMoments(null,0,10)).toEqual([]);expect(fragmentMoments(debris,-1,10)).toEqual([]);
    const cutoff=(debris.time+captureTime(debris,0))/2;expect(fragmentMoments(debris,0,cutoff).at(-1).key).toBe('end');
  });

  it('navigates strictly before or after a moment and stops at the boundaries', () => {
    const events=[{time:1},{time:2},{time:3}];
    expect(adjacentMoment(events,0,1)).toBe(0);expect(adjacentMoment(events,0,-1)).toBe(-1);
    expect(adjacentMoment(events,2,1)).toBe(2);expect(adjacentMoment(events,2,-1)).toBe(0);
    expect(adjacentMoment(events,2+1e-10,-1)).toBe(0);expect(adjacentMoment(events,2-1e-10,1)).toBe(2);
    expect(adjacentMoment(events,4,1)).toBe(-1);expect(adjacentMoment(events,4,-1)).toBe(2);
    expect(adjacentMoment([],2,1)).toBe(-1);expect(adjacentMoment(events,NaN,1)).toBe(-1);
  });

});
