import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const engineWindow = {};
new Function('window', readFileSync('stem_lab/birdlab_3d_engine.js', 'utf8'))(engineWindow);
const { sampleFlight, sampleWingPhase, sampleFollowFrame, courseDuration } = engineWindow.BirdLab3D;
const vectorDistance = (a, b) => Math.hypot(...a.map((value, axis) => value - b[axis]));
const epsilon = 0.00001;
const courseSeams = [3, 3.22, 4.6, 7.5, 12, 17, 22, 27, 31, 34, 36, 38, 44];

describe('BirdLab 3D continuous flight course', () => {
  it('exports its trajectory without initializing graphics or requesting assets', () => {
    expect(courseDuration).toBe(44);
    expect(Object.keys(engineWindow)).toEqual(['BirdLab3D']);
  });

  it('keeps every sampled position, velocity, attitude and pose finite and bounded', () => {
    for (let tick = 0; tick <= 4400; tick++) {
      const sample = sampleFlight(tick / 100);
      const numbers = [...sample.position, ...sample.velocity, ...sample.wind, sample.yaw, sample.pitch, sample.bank,
        sample.airspeed, sample.wingbeat, ...Object.values(sample.pose)];
      // Thousands of matcher allocations can overwhelm a shared rendering
      // machine. Keep the same dense sampling with diagnostics on failure.
      const check = (valid, detail) => { if (!valid) throw new Error(`${detail} at ${tick / 100}s`); };
      check(numbers.every(Number.isFinite), 'nonfinite output');
      check(sample.position[1] >= -0.000001, 'below perch datum');
      check(Math.hypot(...sample.position) < 40, 'outside course bounds');
      check(Math.abs(sample.airspeed - Math.hypot(...sample.velocity)) < 0.0000000005, 'inconsistent airspeed');
      check(sample.airspeed < 15, 'excessive airspeed');
      check(Math.abs(sample.bank) <= 0.72, 'excessive bank');
      check(Math.abs(sample.pose.headYaw) <= .5, 'excessive head turn');
      check(sample.pose.gazePitch >= 0 && sample.pose.gazePitch <= .22, 'excessive downward gaze');
      check(Math.abs(sample.pose.airLift) <= 1 && Math.abs(sample.pose.airRoll) <= 1, 'excessive airflow response');
      check(sample.wind[0] >= .108 && sample.wind[0] <= .178 && sample.wind[2] >= .03525 && sample.wind[2] <= .07525, 'breeze outside gentle bounds');
      for (const key of ['flapAmplitude', 'fold', 'tailFan', 'feet', 'breath', 'crouch', 'touchdown', 'brake', 'grip']) {
        check(sample.pose[key] >= 0 && sample.pose[key] <= 1, `${key} outside 0–1`);
      }
    }
  });

  it.each(courseSeams)('crosses the %ss seam without a position or velocity jump', (time) => {
    const before = sampleFlight(time - epsilon);
    const after = sampleFlight(time + epsilon);
    expect(vectorDistance(before.position, after.position)).toBeLessThan(0.0003);
    expect(vectorDistance(before.velocity, after.velocity)).toBeLessThan(0.0003);
  });

  it('reports velocity consistent with the position derivative along the entire course', () => {
    for (let time = 3.1; time < 37.9; time += 0.17) {
      const before = sampleFlight(time - epsilon).position;
      const after = sampleFlight(time + epsilon).position;
      const measured = after.map((value, axis) => (value - before[axis]) / (2 * epsilon));
      expect(vectorDistance(measured, sampleFlight(time).velocity), `velocity at ${time}s`).toBeLessThan(0.0001);
    }
  });

  it('keeps acceleration and banking continuous at every join in the course', () => {
    const step=0.0001;
    for (const time of courseSeams) {
      const before=sampleFlight(time-step),at=sampleFlight(time),after=sampleFlight(time+step);
      const earlier=sampleFlight(time-2*step),later=sampleFlight(time+2*step);
      // Second-order one-sided derivatives distinguish a real acceleration
      // discontinuity from the rapidly changing acceleration of a leg push.
      const arriving=at.velocity.map((value,axis)=>(3*value-4*before.velocity[axis]+earlier.velocity[axis])/(2*step));
      const departing=at.velocity.map((value,axis)=>(-3*value+4*after.velocity[axis]-later.velocity[axis])/(2*step));
      expect(vectorDistance(arriving,departing), `acceleration at ${time}s`).toBeLessThan(.01);
      expect(Math.abs(after.bank-before.bank), `bank at ${time}s`).toBeLessThan(.001);
    }
  });

  it('rounds the outer turn without a near-stationary pivot or sudden speed burst', () => {
    for(let time=20;time<35;time+=.02) {
      const sample=sampleFlight(time),next=sampleFlight(time+.001);
      const turn=Math.abs(Math.atan2(Math.sin(next.yaw-sample.yaw),Math.cos(next.yaw-sample.yaw)))/.001;
      expect(sample.airspeed,`speed at ${time}s`).toBeGreaterThan(1.9);
      expect(sample.airspeed,`speed at ${time}s`).toBeLessThan(6);
      expect(turn,`yaw rate at ${time}s`).toBeLessThan(1.5);
    }
  });

  it('banks its lift vector toward the inside of each turn', () => {
    let checked=0;
    for(let time=6;time<34;time+=.17) {
      const sample=sampleFlight(time),before=sampleFlight(time-epsilon),after=sampleFlight(time+epsilon);
      const [vx,,vz]=sample.velocity, speedSquared=vx*vx+vz*vz;
      const ax=(after.velocity[0]-before.velocity[0])/(2*epsilon);
      const az=(after.velocity[2]-before.velocity[2])/(2*epsilon);
      const tangential=(ax*vx+az*vz)/speedSquared;
      const inward=[ax-vx*tangential,az-vz*tangential];
      if(Math.hypot(...inward)<.05)continue;
      // Transform local +Y by the rendered YXZ attitude, then project it
      // onto the measured horizontal centripetal acceleration.
      const sy=Math.sin(sample.yaw),cy=Math.cos(sample.yaw);
      const sb=Math.sin(sample.bank),cb=Math.cos(sample.bank),sp=Math.sin(sample.pitch);
      const lift=[-cy*sb+sy*sp*cb,sy*sb+cy*sp*cb];
      expect(lift[0]*inward[0]+lift[1]*inward[1],`lift at ${time}s`).toBeGreaterThan(0);
      checked++;
    }
    expect(checked).toBeGreaterThan(100);
  });

  it('moves through the full observation sequence and reaches the same perch at rest', () => {
    const sequence = [0, 2.7, 4, 7, 15, 25, 33, 37, 39, 42].map(time => sampleFlight(time).phase);
    expect(sequence).toEqual(['perched', 'preparing', 'takeoff', 'climbing', 'gliding', 'banking', 'approaching', 'landing', 'settling', 'perched']);
    for (const time of [0, 2.8, 3, 38, 42, 44]) {
      const sample = sampleFlight(time);
      expect(sample.position).toEqual([0, 0, 0]);
      expect(sample.velocity).toEqual([0, 0, 0]);
      expect(sample.airspeed).toBe(0);
      expect(sample.label.length).toBeGreaterThan(10);
    }
  });

  it('unfolds before departure, powers the climb, and extends the feet and tail before touchdown', () => {
    const perch = sampleFlight(1), leaving = sampleFlight(3.6), climb = sampleFlight(6);
    const glide = sampleFlight(15), landing = sampleFlight(37.2), rested = sampleFlight(41);
    expect(perch.pose).toMatchObject({ fold: 1, feet: 1, flapAmplitude: 0 });
    expect(sampleFlight(2.9).pose.fold).toBeLessThan(perch.pose.fold);
    expect(leaving.pose.fold).toBe(0);
    expect(leaving.pose.flapAmplitude).toBeGreaterThan(0.9);
    expect(climb.position[1]).toBeGreaterThan(leaving.position[1]);
    expect(climb.pose.feet).toBe(0);
    expect(glide.pose).toMatchObject({ fold: 0, feet: 0, flapAmplitude: 0 });
    expect(glide.wingbeat).toBe(0);
    expect(landing.pose.fold).toBe(0);
    expect(landing.pose.feet).toBe(1);
    expect(landing.pose.tailFan).toBeGreaterThan(glide.pose.tailFan + 0.5);
    expect(landing.airspeed).toBeLessThan(sampleFlight(36).airspeed);
    expect(rested.pose).toMatchObject({ fold: 1, feet: 1, flapAmplitude: 0 });
  });

  it('crouches on the perch, pushes away decisively, and absorbs touchdown after contact', () => {
    expect(sampleFlight(2.9).pose.crouch).toBe(1);
    expect(sampleFlight(2.9).position).toEqual([0,0,0]);
    expect(sampleFlight(3.1).airspeed).toBeGreaterThan(.45);
    expect(sampleFlight(2.92).pose.flapAmplitude).toBeCloseTo(0,12);
    expect(sampleFlight(3.12).pose.flapAmplitude).toBe(1);
    expect(sampleFlight(3.1).pose.flapAmplitude).toBe(1);
    expect(sampleFlight(3.22).position[1]).toBeCloseTo(.12,7);
    expect(sampleFlight(3.22).position[2]).toBeCloseTo(-.24,7);
    expect(sampleFlight(3.22).pose.crouch).toBe(0);
    for (let t=3.23;t<4.6;t+=.02) expect(sampleFlight(t+.01).airspeed).toBeGreaterThan(sampleFlight(t).airspeed);
    expect(sampleFlight(37.9).pose.touchdown).toBe(0);
    expect(sampleFlight(38.13).pose.touchdown).toBe(1);
    expect(sampleFlight(38.13).position).toEqual([0,0,0]);
    expect(sampleFlight(38.7).pose.touchdown).toBe(0);
    expect(sampleFlight(37.5).pose.brake).toBe(1);
    expect(sampleFlight(39.3).pose.brake).toBe(0);
    expect(sampleFlight(2.9).pose.grip).toBe(1);
    expect(sampleFlight(3.2).pose.grip).toBe(0);
    expect(sampleFlight(37.8).pose.grip).toBe(0);
    expect(sampleFlight(38.3).pose.grip).toBe(1);
  });

  it('aligns with the perch smoothly as it brakes, without a heading reset after landing', () => {
    expect(Math.abs(sampleFlight(37.99).yaw)).toBeLessThan(.0001);
    for (const t of [38,38.2,39.5,40,43.9]) expect(sampleFlight(t).yaw).toBe(0);
  });

  it('uses shallower strokes as the climb levels out, without interrupting cadence', () => {
    expect(sampleFlight(5.5).pose.flapAmplitude).toBe(1);
    let previous=1;
    for(let time=5.5;time<10;time+=.01) {
      const sample=sampleFlight(time);
      if(sample.pose.flapAmplitude>previous+1e-10)throw new Error(`Stroke deepened during glide entry at ${time}s`);
      previous=sample.pose.flapAmplitude;
      if(time<8.5)expect(sample.wingbeat).toBe(2.75);
    }
    expect(sampleFlight(8.4).pose.flapAmplitude).toBeLessThan(.9);
    expect(sampleFlight(8.4).pose.flapAmplitude).toBeGreaterThan(.8);
    expect(sampleFlight(10).pose.flapAmplitude).toBe(0);
    // A change in effort must not introduce a sharp elbow in the envelope.
    const step=.0001;
    for(const boundary of [5.5,8.3,8.5,9.6,10]) {
      const at=sampleFlight(boundary).pose.flapAmplitude;
      const before=sampleFlight(boundary-step).pose.flapAmplitude;
      const after=sampleFlight(boundary+step).pose.flapAmplitude;
      expect(Math.abs((at-before)/step-(after-at)/step)).toBeLessThan(.001);
    }
  });

  it('lets the leg push lead the first loaded downstroke on every circuit', () => {
    for(let circuit=0;circuit<5;circuit++) {
      expect(sampleWingPhase(3.12+circuit*courseDuration)).toBeCloseTo(Math.PI*2*.79,9);
      expect(sampleWingPhase(3.1+circuit*courseDuration)).toBeCloseTo(sampleWingPhase(3.1),9);
    }
  });

  it('keeps wing opening, foot extension and flap envelopes smooth across action boundaries', () => {
    const boundaries = [2.4, 2.92, 3, 3.10, 3.2, 3.5, 5, 8.5, 10, 23, 23.5, 24.8, 25.6, 34.5, 34.8, 35.6, 36.7, 37.5, 38, 38.5, 39.4];
    // The fastest allowed transition is the 180 ms launch-power ramp.
    const maxDelta = 2 * epsilon * (1.5 / .18) + 1e-9;
    for (const time of boundaries) {
      const before = sampleFlight(time - epsilon).pose, after = sampleFlight(time + epsilon).pose;
      for (const key of ['fold', 'feet', 'flapAmplitude']) {
        expect(Math.abs(after[key] - before[key]), `${key} at ${time}s`).toBeLessThan(maxDelta);
      }
    }
  });

  it('loops all pose values including head scanning and breathing without a reset pop', () => {
    const before = sampleFlight(courseDuration - epsilon), after = sampleFlight(epsilon);
    for (const key of Object.keys(before.pose)) {
      expect(Math.abs(after.pose[key] - before.pose[key]), `${key} at loop`).toBeLessThan(0.00005);
    }
    for (const time of [0, 2.7, 7.2, 16.5, 29.8, 37.1, 43.9]) {
      const original = sampleFlight(time), repeated = sampleFlight(time + 5 * courseDuration);
      expect(repeated.phase).toBe(original.phase);
      expect(vectorDistance(repeated.position, original.position)).toBeLessThan(0.000001);
      for (const key of Object.keys(original.pose)) expect(repeated.pose[key]).toBeCloseTo(original.pose[key], 10);
    }
  });

  it('normalizes invalid or negative time to a safe point on the repeating course', () => {
    for (const time of [NaN, Infinity, -Infinity, undefined, null, 'broken']) expect(sampleFlight(time)).toEqual(sampleFlight(0));
    expect(sampleFlight(-0.25)).toEqual(sampleFlight(courseDuration - 0.25));
  });

  it('shares a smoothly looping breeze and keeps gust response away from the perch', () => {
    for(const time of [0,2.9,3.28,6.9,7,33,36.8,38.13,43.9]) {
      expect(sampleFlight(time).pose.airLift).toBeCloseTo(0,12);
      expect(sampleFlight(time).pose.airRoll).toBeCloseTo(0,12);
    }
    const lift=[],roll=[];
    for(let time=10;time<30;time+=.1){lift.push(sampleFlight(time).pose.airLift);roll.push(sampleFlight(time).pose.airRoll);}
    expect(Math.max(...lift)-Math.min(...lift)).toBeGreaterThan(1);
    expect(Math.max(...roll)-Math.min(...roll)).toBeGreaterThan(.5);
    for(const time of [0,7,9,14,27,31,33,43.99]) {
      const sample=sampleFlight(time),repeated=sampleFlight(time+courseDuration);
      expect(vectorDistance(sample.wind,repeated.wind)).toBeLessThan(1e-10);
      expect(repeated.pose.airLift).toBeCloseTo(sample.pose.airLift,10);
      expect(repeated.pose.airRoll).toBeCloseTo(sample.pose.airRoll,10);
    }
    const left=sampleFlight(courseDuration-epsilon).wind,right=sampleFlight(epsilon).wind,at=sampleFlight(0).wind;
    expect(vectorDistance(left,right)).toBeLessThan(.00001);
    const arriving=at.map((value,axis)=>(value-left[axis])/epsilon);
    const departing=right.map((value,axis)=>(value-at[axis])/epsilon);
    expect(vectorDistance(arriving,departing)).toBeLessThan(.00001);
    for(const time of [7,9,31,33]){
      const before=sampleFlight(time-epsilon).pose,after=sampleFlight(time+epsilon).pose;
      expect(Math.abs(after.airLift-before.airLift)).toBeLessThan(.0001);
      expect(Math.abs(after.airRoll-before.airRoll)).toBeLessThan(.0001);
    }
  });

  it('holds the head steady between short scanning turns and blends into airborne gaze', () => {
    expect(sampleFlight(0.1).pose.headYaw).toBe(sampleFlight(0.4).pose.headYaw);
    expect(sampleFlight(0.9).pose.headYaw).toBe(sampleFlight(1.2).pose.headYaw);
    expect(Math.abs(sampleFlight(0.9).pose.headYaw-sampleFlight(0.4).pose.headYaw)).toBeGreaterThan(0.2);
    for (let time=2.4;time<3.3;time+=.002) {
      expect(Math.abs(sampleFlight(time+.002).pose.headYaw-sampleFlight(time).pose.headYaw)).toBeLessThan(.006);
    }
    expect(sampleFlight(14).pose.gazePitch).toBeGreaterThan(0);
    expect(sampleFlight(36.8).pose.alula).toBeGreaterThan(.8);
    expect(sampleFlight(14).pose.alula).toBe(0);
  });

  it('holds downward sightlines between brief airborne glances', () => {
    expect(sampleFlight(9).pose.gazePitch).toBe(sampleFlight(9.8).pose.gazePitch);
    expect(sampleFlight(14).pose.gazePitch).toBe(sampleFlight(15).pose.gazePitch);
    expect(sampleFlight(14).pose.gazePitch).toBeGreaterThan(sampleFlight(12).pose.gazePitch+.08);
    expect(sampleFlight(24).pose.gazePitch).toBeCloseTo(sampleFlight(7).pose.gazePitch,10);
    for(const boundary of [8.2,8.55,10.2,10.48,12.9,13.18,15.4,15.7,18.3,18.58,22.5,22.85,32,34]) {
      const before=sampleFlight(boundary-epsilon).pose,after=sampleFlight(boundary+epsilon).pose;
      expect(Math.abs(after.headYaw-before.headYaw)).toBeLessThan(.0001);
      expect(Math.abs(after.gazePitch-before.gazePitch)).toBeLessThan(.0001);
    }
  });

  it('uses a deterministic wingbeat phase for timeline seeking and uneven frame rates', () => {
    const reference=sampleWingPhase(4.2);
    for(const step of [.01,.02,.05]) {
      let elapsed=0;for(let i=0;i<Math.round(4.2/step);i++)elapsed+=step;
      expect(sampleWingPhase(elapsed)).toBeCloseTo(reference,8);
    }
    const angularDistance=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
    for (const time of [2.7,3.5,8.5,10,23,25.6,34.5,38.5,44,88]) {
      expect(angularDistance(sampleWingPhase(time-epsilon),sampleWingPhase(time+epsilon))).toBeLessThan(.001);
    }
    expect(sampleWingPhase(Infinity)).toBe(0);
    expect(sampleWingPhase(-1)).toBe(0);
  });
});

describe('BirdLab following camera framing', () => {
  it('follows heading-relative offsets while retaining world-up height through climbs and banks', () => {
    const straight=sampleFollowFrame({yaw:0,airspeed:4,pitch:0,bank:0});
    const climbing=sampleFollowFrame({yaw:0,airspeed:4,pitch:.5,bank:.6});
    expect(climbing).toEqual(straight);
    for(const yaw of [-Math.PI,-1.2,.7,Math.PI]) {
      const turned=sampleFollowFrame({yaw,airspeed:4});
      for(const key of ['positionOffset','targetOffset']) {
        const [x,y,z]=straight[key];
        expect(vectorDistance(turned[key],[Math.cos(yaw)*x+Math.sin(yaw)*z,y,-Math.sin(yaw)*x+Math.cos(yaw)*z])).toBeLessThan(1e-12);
      }
      // +X is the bird's right side; -Z is its direction of travel.
      const [x,,z]=turned.positionOffset;
      expect(x*Math.cos(yaw)-z*Math.sin(yaw)).toBeGreaterThan(.9);
      expect(x*Math.sin(yaw)+z*Math.cos(yaw)).toBeGreaterThan(2.5);
      expect(turned.positionOffset[1]).toBeGreaterThan(.75);
    }
  });

  it('opens the framing gently with speed, stays inside the camera corridor, and reuses caller storage', () => {
    const still=sampleFollowFrame({yaw:0,airspeed:0});
    const fast=sampleFollowFrame({yaw:0,airspeed:6});
    expect(fast.positionOffset[2]).toBeGreaterThan(still.positionOffset[2]);
    expect(-fast.targetOffset[2]).toBeGreaterThan(-still.targetOffset[2]);
    const out={positionOffset:[0,0,0],targetOffset:[0,0,0]};
    const position=out.positionOffset,target=out.targetOffset;
    for(let time=0;time<=44;time+=.05) {
      const flight=sampleFlight(time),original=JSON.stringify(flight);
      expect(sampleFollowFrame(flight,out)).toBe(out);
      if(Math.hypot(...out.positionOffset)>3.25)throw new Error(`Camera outside corridor at ${time}s`);
      if(Math.hypot(...out.targetOffset)>.31)throw new Error(`Excessive lookahead at ${time}s`);
      if(JSON.stringify(flight)!==original)throw new Error('Camera framing changed the flight sample');
    }
    expect(out.positionOffset).toBe(position);
    expect(out.targetOffset).toBe(target);
    expect(sampleFollowFrame({yaw:NaN,airspeed:Infinity})).toEqual(still);
    expect(sampleFollowFrame({yaw:0,airspeed:100})).toEqual(fast);
  });

  it('keeps the hawk visible in a portrait Follow frame throughout the flight', () => {
    // Project independent anatomical extent points into the camera basis.
    // This catches excessive lookahead, a too-close camera, or a bad side sign.
    const dot=(a,b)=>a.reduce((sum,v,i)=>sum+v*b[i],0);
    const normalize=v=>{const n=Math.hypot(...v);return v.map(x=>x/n);};
    const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
    const points=[[-.66,.03,0],[.66,.03,0],[-.4,.5,0],[.4,.5,0],[-.4,-.5,0],[.4,-.5,0],[0,.13,-.30],[0,0,.39],[0,-.2,0]];
    const vertical=Math.tan(20*Math.PI/180),horizontal=vertical*(356/430);
    for(let time=0;time<44;time+=.1) {
      const sample=sampleFlight(time),frame=sampleFollowFrame(sample),eye=frame.positionOffset;
      const direction=normalize(frame.targetOffset.map((v,i)=>v-eye[i]));
      const right=normalize(cross(direction,[0,1,0])),up=cross(right,direction);
      const cy=Math.cos(sample.yaw),sy=Math.sin(sample.yaw),cp=Math.cos(sample.pitch),sp=Math.sin(sample.pitch),cb=Math.cos(sample.bank),sb=Math.sin(sample.bank);
      for(const [x,y,z] of points) {
        // YXZ attitude applies local roll, then pitch, then world yaw.
        const rx=cb*x-sb*y,ry=sb*x+cb*y,py=cp*ry-sp*z,pz=sp*ry+cp*z;
        const relative=[cy*rx+sy*pz-eye[0],py-.055-eye[1],-sy*rx+cy*pz-eye[2]];
        const depth=dot(relative,direction);
        if(depth<=.03||Math.abs(dot(relative,right))/depth>=horizontal||Math.abs(dot(relative,up))/depth>=vertical) {
          throw new Error(`Hawk outside portrait Follow frame at ${time.toFixed(1)}s`);
        }
      }
    }
  });

  it('crosses route joins, yaw wrapping and the loop without a framing jump', () => {
    for(const time of courseSeams) {
      const before=sampleFollowFrame(sampleFlight(time-epsilon)),after=sampleFollowFrame(sampleFlight(time+epsilon));
      expect(vectorDistance(before.positionOffset,after.positionOffset),`position framing at ${time}s`).toBeLessThan(.001);
      expect(vectorDistance(before.targetOffset,after.targetOffset),`aim framing at ${time}s`).toBeLessThan(.001);
    }
    const before=sampleFollowFrame({yaw:Math.PI-epsilon,airspeed:4});
    const after=sampleFollowFrame({yaw:-Math.PI+epsilon,airspeed:4});
    expect(vectorDistance(before.positionOffset,after.positionOffset)).toBeLessThan(.001);
    expect(sampleFollowFrame(sampleFlight(14))).toEqual(sampleFollowFrame(sampleFlight(58)));
  });
});
