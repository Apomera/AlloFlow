/**
 * Raptor Hunt catch feel: the talon throw, a nose that stays where the player puts it,
 * raptor focus (time slowed on a final approach) and the pull-out with a catch. The tests
 * run the shipped functions lifted from the source rather than restating them.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// Overridable so a mutation can run against a COPY; other sessions edit this file.
const source = readFileSync(process.env.RAPTOR_SOURCE || 'stem_lab/stem_tool_raptorhunt.js', 'utf8').replace(/\r\n/g, '\n');
function body(name) {
  const start = source.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('missing function ' + name);
  let end = source.indexOf('{', start), depth = 1;
  while (depth) { end++; if (source[end] === '{') depth++; if (source[end] === '}') depth--; }
  return source.slice(start, end + 1);
}
const constant = (name) => Number(source.match(new RegExp('var ' + name + ' = ([0-9.]+);'))[1]);
const THROW_MS = constant('RAPTOR_TALON_THROW_MS');
const FOCUS_SCALE = constant('RAPTOR_FOCUS_SCALE');
const H = Function(['raptorFocusWanted', 'raptorEaseTimeScale', 'raptorSettlePitch', 'raptorSpeedAfterCatch', 'raptorSweptStrikeContact',
  'raptorTerrainCrossing', 'raptorCatchFlightStep'].map(body).join('\n') +
  '\nreturn { raptorFocusWanted, raptorEaseTimeScale, raptorSettlePitch, raptorSpeedAfterCatch, raptorSweptStrikeContact, raptorTerrainCrossing, raptorCatchFlightStep };')();

// Exercise the shipped ground branch after the resolver, including its real crash reset.
const floorStart = source.indexOf('          if (wasLanded || wasCrashed) {', source.indexOf('// Hard floor and mission-aware ceiling.'));
const floorEnd = source.indexOf('          if (raptor.y > missionCeiling)', floorStart);
if (floorStart < 0 || floorEnd < 0) throw new Error('missing flight floor branch');
const floorBranch = source.slice(floorStart, floorEnd);
const driftStart = source.indexOf('var catchVerticalDrift=');
if (driftStart < 0) throw new Error('missing catch drift calculation');
const catchDrift = source.slice(driftStart, source.indexOf(';', driftStart) + 1);

// The strike path with the real targeting functions, on flat ground, the bird flying -z.
function throwFixture(options = {}) {
  const bird = { x: 0, y: 12, z: 0, yaw: 0, pitch: 0, speed: 20, maxG: 5, stamina: 100, staminaMax: 100, diving: false, crashed: false, landed: false };
  const prey = [];
  const log = { caught: [], missed: [], queued: [], feedback: [] };
  const api = Function('raptor', 'preyMeshes', 'log', 'options', `
    var activePerch = null, attendedPrey = null, mission = { id: 'open' }, lockConeDot = 0.1, flightForward = {}, lastTargetCorrection = null;
    var simPaused = false, strikeReady = true, strikeRecoveryUntil = 0, motionNow = 0, RAPTOR_TALON_THROW_MS = ${THROW_MS};
    var talonThrow = { active: false, until: 0, preferred: null, closest: null };
    var runCatches = 0, missionCatches = 0, missionGroundContact = false, runStart = 0;
    var terrainCellSize = 10, terrainHalfSize = 50, practicePerch = null, perchLaunchUntil = Infinity;
    var energyEventLog = [], crashRecoveryDuration = 3, restScanPitch = 0;
    var weather={windSpeed:options.windSpeed||0,windDir:options.windDir||0,gustPhase:options.gustPhase||0};
    var flightVerticalDrift=options.verticalDrift||0;
    function rhAnnounce() {}
    function takeoffControlHint() { return 'Space'; }
    function flightForwardVector() { return { x: Math.sin(raptor.yaw) * Math.cos(raptor.pitch), y: Math.sin(raptor.pitch), z: -Math.cos(raptor.yaw) * Math.cos(raptor.pitch) }; }
    function terrainHeightAt() { return log.ridgeHeight || 0; }
    function markTutorialSignal() {}
    function publishControlState() {}
    function updateTargetFeedback(now, recordProgress) { log.feedback.push({now:now,recordProgress:recordProgress}); }
    function queueFlightAction(callback, delay) { log.queued.push(delay); }
    function catchPrey(index, now, contactPoint) {
      var p = preyMeshes[index].mesh.position;
      log.caught.push({ prey: preyMeshes[index], now: now, contactPoint: contactPoint,
        bird: {x:raptor.x,y:raptor.y,z:raptor.z,pitch:raptor.pitch}, speed:raptor.speed,
        distance: Math.hypot(p.x - raptor.x, p.y - raptor.y, p.z - raptor.z) });
      preyMeshes.splice(index, 1);
      runCatches++; missionCatches++;
      if (options.flight) raptor.speed = raptorSpeedAfterCatch(raptor.speed, options.birdKg || 0.95, options.preyKg || 0.35);
      if (options.pauseOnCatch) simPaused = true;
    }
    function missStrike(targetInfo, now) { log.missed.push({ targetInfo: targetInfo, now: now }); }
    ${['targetSteeringCorrection', 'evaluatePreyTarget', 'terrainSightClear', 'chooseAttendedTarget', 'acquireTarget',
      'strike', 'strikeFlightVelocity', 'raptorRelativeClosingSpeed', 'preyClosingSpeed', 'talonThrowReach', 'talonThrowWindow', 'sampleTalonThrow', 'raptorSweptStrikeContact', 'resolveTalonThrow', 'endTalonThrow',
      'raptorTerrainCrossing', 'raptorCatchFlightStep', 'raptorSpeedAfterCatch', 'practicePerchCrossing'].map(body).join('\n')}
    return {
      strike: strike,
      closing: function(index=0) {return preyClosingSpeed(evaluatePreyTarget(preyMeshes[index],index));},
      window: function(index=0) {return talonThrowWindow(evaluatePreyTarget(preyMeshes[index],index));},
      // One frame: bird and prey move, then the throw resolves, as in the flight loop.
      fly: function(ms) {
        var velocity=strikeFlightVelocity();
        raptor.x+=velocity.x*ms/1000;raptor.y+=velocity.y*ms/1000;raptor.z+=velocity.z*ms/1000;
        preyMeshes.forEach(function(p) { p.mesh.position.x += p.vx * ms / 1000; p.mesh.position.y += p.vy * ms / 1000; p.mesh.position.z += p.vz * ms / 1000; });
        motionNow += ms;
        resolveTalonThrow();
      },
      frame: function(ms, drift = {}) {
        if (simPaused) return null;
        var dt = Math.min(0.05, ms/1000), frameStartX=raptor.x, frameStartY=raptor.y, frameStartZ=raptor.z;
        var wasLanded=raptor.landed, wasCrashed=raptor.crashed, frameOrigin={x:raptor.x,y:raptor.y,z:raptor.z};
        var diveKey=raptor.diving, pullUpKey=false, glideSinkRate=drift.sink || 0;
        var verticalFlightSpeed=Math.sin(raptor.pitch)*raptor.speed;
        raptor.x+=(Math.sin(raptor.yaw)*Math.cos(raptor.pitch)*raptor.speed+(drift.windX || 0))*dt;
        raptor.z+=(-Math.cos(raptor.yaw)*Math.cos(raptor.pitch)*raptor.speed+(drift.windZ || 0))*dt;
        raptor.y+=(verticalFlightSpeed+(drift.vertical || 0))*dt;
        preyMeshes.forEach(function(p) {p.mesh.position.x+=p.vx*dt;p.mesh.position.z+=p.vz*dt;});
        motionNow+=dt*1000;
        var surface=raptorTerrainCrossing(frameOrigin,raptor,terrainHeightAt,1.5,terrainCellSize,terrainHalfSize);
        ${catchDrift}
        var frameCatch=resolveTalonThrow(false,{surface:surface,windX:drift.windX || 0,windZ:drift.windZ || 0,verticalDrift:catchVerticalDrift});
        if (simPaused) return {hit:frameCatch,surface:surface};
        if (frameCatch) raptor.diving=false;
        ${floorBranch}
        return {hit:frameCatch,surface:surface,ground:groundContact};
      },
      advanceClock: function(ms) {motionNow+=ms;return resolveTalonThrow(false,{surface:null,windX:0,windZ:0,verticalDrift:0});},
      pause: function() {simPaused=true;},
      state: function() { return { active: talonThrow.active, ready: strikeReady, now: motionNow,
        paused:simPaused,runCatches:runCatches,missionCatches:missionCatches,groundContact:missionGroundContact }; }
    };`)(bird, prey, log, options);
  const add = (ahead, { x = 0, y = 12, vx = 0, vy = 0, vz = 0 } = {}) => {
    const p = { mesh: { position: { x, y, z: -ahead } }, vx, vy, vz };
    prey.push(p);
    return p;
  };
  const flyThrough = () => { for (let i = 0; i < 60 && api.state().active; i++) api.fly(1000 / 60); };
  return { bird, log, add, flyThrough, ...api };
}

describe('the talon throw', () => {
  it('uses tailwind to accept and catch a reachable early strike', () => {
    const f=throwFixture({windSpeed:10});
    const prey=f.add(16);
    expect(f.closing()).toBeCloseTo(30,9);expect(f.window()).toBe(true);
    f.strike();expect(f.state().active).toBe(true);
    f.flyThrough();expect(f.log.caught.map(c=>c.prey)).toEqual([prey]);expect(f.log.missed).toHaveLength(0);
  });
  it('accounts for headwind and a bird holding station instead of promising airspeed alone', () => {
    const headwind=throwFixture({windSpeed:10,windDir:Math.PI});headwind.add(12);
    expect(headwind.closing()).toBeCloseTo(10,9);expect(headwind.window()).toBe(false);
    headwind.strike();expect(headwind.log.missed).toHaveLength(1);
    const station=throwFixture({windSpeed:20,windDir:Math.PI});station.add(6);
    expect(station.closing()).toBeCloseTo(0,9);expect(station.window()).toBe(false);
  });
  it('projects crosswind and vertical prey motion along the actual separation', () => {
    const f=throwFixture({windSpeed:10,windDir:Math.PI/2,verticalDrift:-2});
    f.add(12,{x:5,y:15,vx:1,vy:3,vz:-4});
    expect(f.closing()).toBeCloseTo((9*5-5*3+16*12)/Math.hypot(5,3,12),9);
  });
  it('keeps the cue closed on a lateral miss while allowing the player to steer an early throw', () => {
    const f=throwFixture();f.add(10,{x:5.5});
    expect(f.closing()).toBeGreaterThan(0);expect(f.window()).toBe(false);
    f.strike();expect(f.state().active).toBe(true);expect(f.log.missed).toHaveLength(0);
  });
  it('opens the window when prey crosses into the flight line and closes when crosswind carries the bird away', () => {
    const crossing=throwFixture();crossing.add(10,{x:5.5,vx:-10});
    expect(crossing.window()).toBe(true);
    const drift=throwFixture({windSpeed:20,windDir:Math.PI/2});drift.add(12);
    expect(drift.window()).toBe(false);
  });
  it('does not predict a window through the flight floor and still accepts immediate legal contact', () => {
    const f=throwFixture({verticalDrift:-30});f.add(13);
    expect(f.window()).toBe(false);
    const immediate=throwFixture({windSpeed:30,windDir:Math.PI});immediate.add(4);
    expect(immediate.window()).toBe(true);
  });
  it('refreshes action guidance on the accepted press before another flight frame', () => {
    for (const distance of [4, 12, 99]) {
      const f = throwFixture();
      f.add(distance);
      f.strike();
      expect(f.log.feedback).toEqual([{now:0,recordProgress:false}]);
      f.strike();
      expect(f.log.feedback).toHaveLength(1);
    }
  });
  it('catches prey that comes into reach during the throw after the press', () => {
    const f = throwFixture(), p = f.add(12);
    f.strike();
    // 12 m is outside the 5 m reach, which the old strike reported as TOO FAR on the spot.
    expect(f.log.caught).toHaveLength(0);
    expect(f.log.missed).toHaveLength(0);
    expect(f.state().active).toBe(true);
    f.flyThrough();
    expect(f.log.missed).toHaveLength(0);
    expect(f.log.caught).toHaveLength(1);
    expect(f.log.caught[0].prey).toBe(p);
    expect(f.log.caught[0].distance).toBeLessThanOrEqual(5 + 1e-9);
    expect(f.log.caught[0].now).toBeLessThanOrEqual(THROW_MS);
    expect(f.log.queued).toEqual([400]);
  });

  it('catches at once when prey is already in reach', () => {
    const f = throwFixture();
    f.add(4);
    f.strike();
    expect(f.log.caught).toHaveLength(1);
    expect(f.log.caught[0].now).toBe(0);
  });

  it('misses at once when prey is beyond what one throw can close', () => {
    // 20 m/s for 0.45 s closes 9 m, so a throw reaches 14 m.
    const f = throwFixture();
    f.add(16);
    f.strike();
    expect(f.log.missed).toHaveLength(1);
    expect(f.log.missed[0].now).toBe(0);
    expect(f.log.missed[0].targetInfo.distance).toBeCloseTo(16, 9);
    expect(f.state()).toMatchObject({ active: false, ready: false });
  });

  it('misses at once when the prey is off to the side, with the Face prey coaching', () => {
    // 3 m away but 54 degrees off the flight line: flying on only opens the angle.
    const f = throwFixture(), a = 0.95;
    f.add(3 * Math.cos(a), { x: 3 * Math.sin(a) });
    f.strike();
    expect(f.log.caught).toHaveLength(0);
    expect(f.log.missed).toHaveLength(1);
    expect(f.log.missed[0].now).toBe(0);
    expect(f.log.missed[0].targetInfo.correction).toBe('turnRight');
  });

  it('counts the closing speed, not the airspeed, so a fleeing animal shortens the throw', () => {
    // The same 12 m, but running away at 10 m/s: the gap closes by 4.5 m in a throw.
    const f = throwFixture();
    f.add(12, { vz: -10 });
    f.strike();
    expect(f.log.missed).toHaveLength(1);
    expect(f.log.missed[0].now).toBe(0);
    const still = throwFixture();
    still.add(12);
    still.strike();
    expect(still.log.missed).toHaveLength(0);
  });

  it('reports a throw that ran out from the closest approach', () => {
    // Passing 5.5 m to the side: inside the throw's reach at the press, never inside 5 m.
    const f = throwFixture();
    f.add(11, { x: 5.5 });
    f.strike();
    expect(f.state().active).toBe(true);
    f.flyThrough();
    expect(f.log.caught).toHaveLength(0);
    expect(f.log.missed).toHaveLength(1);
    expect(f.log.missed[0].now).toBeGreaterThanOrEqual(THROW_MS);
    expect(f.log.missed[0].targetInfo.distance).toBeGreaterThan(5);
    expect(f.log.missed[0].targetInfo.distance).toBeLessThan(6.5);
  });

  it('takes the clicked animal before a nearer one', () => {
    const f = throwFixture();
    f.add(3);
    const clicked = f.add(4.5, { x: 0.5 });
    f.strike(clicked);
    expect(f.log.caught.map((c) => c.prey)).toEqual([clicked]);
  });

  it('takes only prey the HUD calls READY: the throw adds time, not a wider angle', () => {
    // READY is inside reach and within about 45 degrees of the flight line (dot >= 0.7).
    const at = (degrees) => {
      const f = throwFixture(), a = degrees * Math.PI / 180;
      f.add(4 * Math.cos(a), { x: 4 * Math.sin(a) });
      f.strike();
      f.flyThrough();
      return f.log.caught.length;
    };
    expect(at(40)).toBe(1);
    expect(at(50)).toBe(0);
  });

  it('ignores more presses while the talons are out, so mashing cannot stretch a throw', () => {
    // Passes 5.5 m to the side, still ahead and in throw reach at the second press.
    const f = throwFixture();
    f.add(10, { x: 5.5 });
    f.strike();
    for (let i = 0; i < 6; i++) f.fly(1000 / 60);
    f.strike();
    f.flyThrough();
    expect(f.log.caught.length + f.log.missed.length).toBe(1);
    expect(f.log.missed[0].now).toBeLessThan(THROW_MS + 20);
  });

  it.each([15, 30, 60, 144])('catches a brief legal stoop pass between frames at %i FPS', (fps) => {
    const f = throwFixture();
    f.bird.speed = 100;
    f.bird.diving = true;
    const p = f.add(12.34, { x: 4.95 });
    f.strike();
    for (let i = 0; i < fps && f.state().active; i++) f.fly(1000 / fps);
    expect(f.log.missed).toHaveLength(0);
    expect(f.log.caught.map(c => c.prey)).toEqual([p]);
    expect(f.log.caught[0].contactPoint).toMatchObject({ x: 4.95, y: 12, z: -12.34 });
  });

  it('keeps a near graze outside the same forward cone even when its path enters reach', () => {
    const f = throwFixture();
    f.bird.speed = 100;
    f.bird.diving = true;
    f.add(12, { x: 5.1 });
    f.strike();
    for (let i = 0; i < 10 && f.state().active; i++) f.fly(50);
    expect(f.log.caught).toHaveLength(0);
    expect(f.log.missed).toHaveLength(1);
  });

  it('uses both animals motion and reports the interpolated prey contact point', () => {
    const f = throwFixture();
    f.bird.speed = 100;
    const p = f.add(12, { x: 1, vx: 3, vz: -15 });
    f.strike();
    f.fly(100);
    expect(f.log.caught.map(c => c.prey)).toEqual([p]);
    const impact = f.log.caught[0].contactPoint;
    expect(impact.x).toBeGreaterThan(1);
    expect(impact.x).toBeLessThan(1.3);
    expect(impact.z).toBeLessThan(-12);
    expect(impact.z).toBeGreaterThan(-13.5);
  });

  it('clips a late frame to the throw deadline instead of catching after expiry', () => {
    const f = throwFixture();
    f.bird.speed = 100;
    f.add(45);
    f.strike();
    f.bird.speed = 0;
    f.fly(440);
    f.bird.speed = 1000;
    f.fly(50);
    expect(f.log.caught).toHaveLength(0);
    expect(f.log.missed).toHaveLength(1);
  });

  it('keeps a legal contact before expiry when the rendered frame ends later', () => {
    const f = throwFixture();
    f.bird.speed = 100;
    f.add(45);
    f.strike();
    f.bird.speed = 0;
    f.fly(400);
    f.bird.speed = 1000;
    f.fly(100);
    expect(f.log.caught).toHaveLength(1);
    expect(f.log.missed).toHaveLength(0);
  });

  it('rejects an immediate catch through terrain even for a clicked animal', () => {
    const f = throwFixture(), p = f.add(4);
    f.log.ridgeHeight = 13;
    f.strike(p);
    f.flyThrough();
    expect(f.log.caught).toHaveLength(0);
    expect(f.log.missed).toHaveLength(1);
  });

  it('never sweeps flight before the strike press', () => {
    const f = throwFixture();
    f.bird.speed = 100;
    f.add(8);
    f.fly(100);
    f.strike();
    expect(f.log.caught).toHaveLength(0);
    expect(f.log.missed).toHaveLength(1);
  });
});

describe('the swept READY geometry', () => {
  const forward = { x: 0, y: 0, z: -1 };
  it('finds entry into the exact reach sphere and honors explicit time clipping', () => {
    const from = { x: 0, y: 0, z: -12 }, to = { x: 0, y: 0, z: 8 };
    expect(H.raptorSweptStrikeContact(from, to, forward, forward, 5, 0, 1)).toMatchObject({ time: 0.35, distance: 5, dot: 1 });
    expect(H.raptorSweptStrikeContact(from, to, forward, forward, 5, 0, 0.3)).toBeNull();
  });

  it('interpolates a turning flight line instead of applying the final heading retroactively', () => {
    const relative = { x: 4, y: 0, z: -3 }, turned = { x: 0.8, y: 0, z: -0.6 };
    const contact = H.raptorSweptStrikeContact(relative, relative, forward, turned, 5, 0, 1);
    expect(contact.time).toBeGreaterThan(0.1);
    expect(contact.time).toBeLessThan(0.9);
    expect(contact.dot).toBeCloseTo(0.7, 8);
    expect(H.raptorSweptStrikeContact(relative, relative, forward, turned, 5, 0, 0.01)).toBeNull();
  });

  it('accepts an exact tangent within the cone and rejects a tangent outside it', () => {
    expect(H.raptorSweptStrikeContact({ x: -2, y: 0, z: -5 }, { x: 2, y: 0, z: -5 }, forward, forward, 5, 0, 1)).toMatchObject({ time: 0.5, distance: 5 });
    expect(H.raptorSweptStrikeContact({ x: 5, y: 0, z: -2 }, { x: 5, y: 0, z: 2 }, forward, forward, 5, 0, 1)).toBeNull();
  });
});

describe('time-ordered strike and surface contact', () => {
  const dive = (options = {}) => {
    const f = throwFixture({ flight: true, ...options });
    Object.assign(f.bird, { y: 4, pitch: -1, speed: 100, diving: true });
    return f;
  };

  it.each([20, 30, 60, 144])('credits a legal catch before the floor at %i FPS', (fps) => {
    const f = dive(), p = f.add(7, { x: 2, y: 0.3 });
    f.strike();
    let result;
    for (let i = 0; i < 10 && f.state().active; i++) result = f.frame(1000 / fps);
    expect(f.log.caught.map(c => c.prey)).toEqual([p]);
    expect(f.log.missed).toHaveLength(0);
    expect(result.hit.contactTime).toBeCloseTo(14.312444678, 7);
    expect(f.log.caught[0].bird.y).toBeGreaterThan(1.5);
    expect(f.log.caught[0].distance).toBeCloseTo(7, 8);
    expect(f.state().missionCatches).toBe(1);
    // Real loop integration must resolve this un-clamped path before its floor branch.
    expect(source.indexOf('var frameCatch=resolveTalonThrow(false')).toBeLessThan(floorStart);
  });

  it.each(['after', 'at'])('rejects a catch %s the first floor contact, including a legal endpoint', (ordering) => {
    const f = throwFixture({ flight: true });
    Object.assign(f.bird, { y: 3.5, pitch: -0.5, speed: 100, diving: true });
    const floorTime = (f.bird.y - 1.5) / (-Math.sin(f.bird.pitch) * f.bird.speed);
    const contactTime = floorTime + (ordering === 'after' ? 0.004 : 0);
    const atY = f.bird.y + Math.sin(f.bird.pitch) * f.bird.speed * contactTime;
    const ahead = Math.cos(f.bird.pitch) * f.bird.speed * contactTime + Math.sqrt(49 - (atY - 0.3) ** 2);
    f.add(ahead, { y: 0.3 });
    f.strike();
    const result = f.frame(50);
    expect(result.surface.time * 50).toBeCloseTo(floorTime * 1000, 8);
    expect(f.log.caught).toHaveLength(0);
    expect(f.log.missed).toHaveLength(1);
    expect(f.state().missionCatches).toBe(0);
    expect(f.bird.crashed).toBe(true);
  });

  it('credits once without shielding an unavoidable impact later in the same frame', () => {
    const f = dive();
    f.add(7, { x: 2, y: 0.3 });
    f.strike();
    const result = f.frame(50);
    expect(f.log.caught).toHaveLength(1);
    expect(f.log.missed).toHaveLength(0);
    expect(result.ground).not.toBeNull();
    expect(f.bird).toMatchObject({ crashed: true, speed: 0, y: 1.5 });
    // The shipped crash branch resets the current run; the successful mission catch persists.
    expect(f.state()).toMatchObject({ runCatches: 0, missionCatches: 1, groundContact: true });
    f.frame(20);
    expect(f.log.caught).toHaveLength(1);
  });

  it.each([400, 440])('still clips airborne frame contact to throw expiry after a %i ms wait', (wait) => {
    const f = throwFixture({ flight: true });
    f.bird.speed = 100;
    f.add(45);
    f.strike();
    f.bird.speed = 0;
    f.advanceClock(wait);
    f.bird.speed = 1000;
    const result = f.frame(50);
    if (wait === 400) {
      expect(result.hit.contactTime).toBeCloseTo(440, 8);
      expect(f.log.caught).toHaveLength(1);
      expect(f.log.missed).toHaveLength(0);
    } else {
      expect(result.hit).toBeUndefined();
      expect(f.log.caught).toHaveLength(0);
      expect(f.log.missed).toHaveLength(1);
    }
  });

  it('freezes at the contact pose when that catch pauses the mission', () => {
    const f = dive({ pauseOnCatch: true });
    f.add(7, { x: 2, y: 0.3 });
    f.strike();
    const result = f.frame(50);
    expect(f.state()).toMatchObject({ paused: true, missionCatches: 1, groundContact: false, now: 50 });
    expect(f.bird).toMatchObject({ x: result.hit.contactBird.x, y: result.hit.contactBird.y, z: result.hit.contactBird.z, crashed: false });
    const frozen = { ...f.bird };
    f.frame(60000);
    expect(f.bird).toEqual(frozen);
    expect(f.log.caught).toHaveLength(1);
  });

  it('does not resolve an in-flight strike while already paused', () => {
    const f = throwFixture({ flight: true });
    f.add(12);
    f.strike();
    f.pause();
    f.advanceClock(500);
    expect(f.log.caught).toHaveLength(0);
    expect(f.log.missed).toHaveLength(0);
    expect(f.state()).toMatchObject({ active: true, paused: true });
  });
});

describe('continuous terrain floor crossing', () => {
  it.each(['grid', 'diagonal'])('finds a shallow %s ridge even when both endpoints are safe', (edge) => {
    const from = edge === 'grid' ? { x: -3.45, y: 2, z: 2 } : { x: 2, y: 2, z: -5.45 };
    const to = edge === 'grid' ? { x: 1.55, y: 2, z: 2 } : { x: 2, y: 2, z: -0.45 };
    // Both sides are planes; the narrow 1 cm penetration lies across a rendered triangle edge.
    const height = (x, z) => 0.51 - 0.2 * Math.abs(edge === 'grid' ? x : x + z);
    expect(from.y - height(from.x, from.z)).toBeGreaterThan(1.5);
    expect(to.y - height(to.x, to.z)).toBeGreaterThan(1.5);
    const contact = H.raptorTerrainCrossing(from, to, height, 1.5, 10, 50);
    expect(contact.time).toBeCloseTo(0.68, 10);
    expect(contact.y - height(contact.x, contact.z)).toBeCloseTo(1.5, 10);
  });

  it('returns the first of multiple terrain crossings and handles reverse travel', () => {
    const height = x => Math.max(0.6 - 0.3 * Math.abs(x), 0.6 - 0.3 * Math.abs(x - 10));
    const from = { x: -5, y: 2, z: 0 }, to = { x: 15, y: 2, z: 0 };
    expect(H.raptorTerrainCrossing(from, to, height, 1.5, 5, 50).x).toBeCloseTo(-1 / 3, 10);
    expect(H.raptorTerrainCrossing(to, from, height, 1.5, 5, 50).x).toBeCloseTo(10 + 1 / 3, 10);
  });

  it('keeps an airborne skim clear and rejects movement starting below the floor', () => {
    expect(H.raptorTerrainCrossing({ x: 0, y: 1.51, z: 0 }, { x: 4, y: 1.51, z: 0 }, () => 0, 1.5, 10, 50)).toBeNull();
    expect(H.raptorTerrainCrossing({ x: 0, y: 1.49, z: 0 }, { x: 4, y: 4, z: 0 }, () => 0, 1.5, 10, 50)).toMatchObject({ time: 0 });
  });
});

// Independent small-step integration checks displacement, rather than repeating the analytic formula.
function numericPullout(position, yaw, pitch, speed, maxG, dt) {
  const result = { ...position, pitch }, rate = Math.min(1.5, maxG * 9.81 / Math.max(8, speed));
  const step = dt / 2000;
  for (let i = 0; i < 2000; i++) {
    const midpoint = Math.min(0.15, result.pitch + rate * step / 2);
    result.x += Math.sin(yaw) * Math.cos(midpoint) * speed * step;
    result.z -= Math.cos(yaw) * Math.cos(midpoint) * speed * step;
    result.y += Math.sin(midpoint) * speed * step;
    result.pitch = Math.min(0.15, result.pitch + rate * step);
  }
  return result;
}

describe('motion remaining after a catch', () => {
  it('honors the G limit while matching an independent pullout trajectory', () => {
    const from = { x: 1, y: 12, z: -2 }, yaw = 0.4, pitch = -0.8, speed = 60, maxG = 1.5, dt = 0.05;
    const result = H.raptorCatchFlightStep(from, yaw, pitch, speed, maxG, dt, 0, 0, 0);
    const expected = numericPullout(from, yaw, pitch, speed, maxG, dt);
    for (const key of ['x', 'y', 'z', 'pitch']) expect(result[key]).toBeCloseTo(expected[key], 8);
    expect(result.pitch - pitch).toBeCloseTo(maxG * 9.81 / speed * dt, 10);
    expect(H.raptorCatchFlightStep(from, 0, 0.14, 8, 30, 0.1, 0, 0, 0).pitch).toBe(0.15);
  });

  it('applies wind, altitude trim and lift once across both sides of contact', () => {
    const f = throwFixture({ flight: true });
    Object.assign(f.bird, { speed: 100, diving: true });
    f.add(9);
    f.strike();
    // 8 m/s trim + 1 m/s lift; the 1 m/s glide sink begins only after the catch stops the dive.
    const result = f.frame(50, { windX: 3, windZ: 4, vertical: 9, sink: 1 });
    expect(result.hit).toBeDefined();
    const before = result.hit.contactTime / 1000, remaining = 0.05 - before;
    const speed = 100 * 0.95 / (0.95 + 0.35);
    const air = numericPullout({ x: 0, y: 0, z: 0 }, 0, 0, speed, 5, remaining);
    expect(f.bird.x).toBeCloseTo(3 * 0.05, 9);
    expect(f.bird.z).toBeCloseTo(-100 * before + air.z + 4 * 0.05, 8);
    expect(f.bird.y).toBeCloseTo(12 + 9 * before + 8 * remaining + air.y, 8);
    expect(f.bird.pitch).toBeCloseTo(air.pitch, 8);
  });

  it('does not move or consume drift when there is no remaining time', () => {
    const from = { x: 1, y: 2, z: 3 };
    expect(H.raptorCatchFlightStep(from, 0, -0.4, 60, 5, 0, 8, -8, 9)).toEqual({ ...from, pitch: -0.4 });
  });
});

describe('the nose after a pitch key is released', () => {
  const settle = (pitch, seconds, { speed = 20, clearance = 100, fps = 60 } = {}) => {
    for (let i = 0; i < Math.round(seconds * fps); i++) pitch = H.raptorSettlePitch(pitch, speed, clearance, 1 / fps);
    return pitch;
  };

  it('holds a descent instead of swinging back to level', () => {
    // -43 degrees is one second of the nose-down key. The old 2.5/s return put the nose
    // back to -4 degrees within that second, so a descent stopped whenever a key came up.
    expect(settle(-0.75, 1)).toBeCloseTo(-0.75 * Math.exp(-0.35), 9);
    expect(settle(-0.75, 1)).toBeLessThan(-0.5);
  });

  it('eases a climb back sooner, so the bird does not drift upward', () => {
    expect(settle(0.5, 1)).toBeCloseTo(0.5 * Math.exp(-1.2), 9);
    expect(settle(0.5, 2)).toBeLessThan(0.05);
  });

  it('flares a descent until the ground is at least 1.6 s away', () => {
    // 20 m/s at -30 degrees sinks 10 m/s, so 12 m of clearance is 1.2 s away. The flare
    // raises the nose until the sink is 12 / 1.6 = 7.5 m/s, then the slow hold resumes.
    const flared = settle(-0.52, 0.5, { clearance: 12 });
    expect(-Math.sin(flared) * 20).toBeLessThanOrEqual(7.5);
    expect(flared).toBeGreaterThan(-0.52 * Math.exp(-0.35 * 0.5));
    // With the ground well away the same descent only eases.
    expect(settle(-0.52, 0.5, { clearance: 40 })).toBeCloseTo(-0.52 * Math.exp(-0.35 * 0.5), 9);
  });

  it('turns a steep dive let go 15 m up into a soft landing', () => {
    // The tool's landing rule: under 6 m/s of descent is soft, over 18 m/s a crash.
    let y = 15, pitch = -0.75, descent = 0;
    const speed = 20, glideSink = 1, dt = 1 / 60;
    for (let i = 0; i < 60 * 30 && y > 0; i++) {
      pitch = H.raptorSettlePitch(pitch, speed, y, dt);
      descent = -Math.sin(pitch) * speed + glideSink;
      y -= descent * dt;
    }
    expect(y).toBeLessThanOrEqual(0);
    expect(descent).toBeLessThan(6);
  });

  it('settles the same at any frame rate while conditions hold', () => {
    expect(settle(-0.6, 1, { fps: 30 })).toBeCloseTo(settle(-0.6, 1, { fps: 144 }), 9);
  });
});

describe('raptor focus', () => {
  it('starts only on a close approach that is closing on prey ahead', () => {
    const target = (distance, dot = 0.95) => ({ distance, dot, reach: 5 });
    expect(H.raptorFocusWanted(target(20), 20)).toBe(true);    // 15 m gap, 0.75 s away
    expect(H.raptorFocusWanted(target(30), 20)).toBe(false);   // 25 m gap, 1.25 s away
    expect(H.raptorFocusWanted(target(45), 200)).toBe(false);  // beyond 40 m
    expect(H.raptorFocusWanted(target(20, 0.5), 20)).toBe(false);  // not heading for it
    expect(H.raptorFocusWanted(target(20), 1)).toBe(false);    // not closing
    expect(H.raptorFocusWanted(null, 20)).toBe(false);
  });

  it('eases the flight clock the same way at any frame rate', () => {
    const ease = (fps, seconds) => {
      let scale = 1;
      for (let i = 0; i < Math.round(seconds * fps); i++) scale = H.raptorEaseTimeScale(scale, FOCUS_SCALE, 1 / fps);
      return scale;
    };
    expect(ease(30, 0.6)).toBeCloseTo(ease(120, 0.6), 9);
    expect(ease(60, 0.6)).toBeLessThan(FOCUS_SCALE + (1 - FOCUS_SCALE) * 0.05);
    expect(FOCUS_SCALE).toBe(0.4);
  });

  it('slows the flight clock while steering keeps close to real time', () => {
    expect(source).toContain('dt *= focusTimeScale;');
    expect(source).toContain('var steerDt = realDt * Math.sqrt(Math.min(1, focusTimeScale));');
    expect(source).toContain('smoothFlightAxis(turnAxis,turnInput,turnInput===0?26:18,steerDt);');
    expect(source).toContain('smoothFlightAxis(pitchAxis,pitchInput,pitchInput===0?26:18,steerDt);');
    expect(source).toContain('var pointerBlend=dampingAlpha(22,realDt)');
    expect(source).toContain('updateRaptorFocus(targetInfo, realDt);');
  });

  it('is on by default, can be switched off in Settings, and cites the vision research', () => {
    expect(source).toContain('var focusSlowmoEnabled = rh.focusSlowmo !== false;');
    expect(source).toContain("'data-raptor-focus-slowmo': focusSlowmoEnabled ? 'true' : 'false'");
    expect(source).toContain("sendHuntCommand('focusSlowmo', { enabled: focusSlowmoEnabled });");
    expect(source).toContain("var focusSlowmoEnabled = !(canvasEl.dataset && canvasEl.dataset.raptorFocusSlowmo === 'false');");
    expect(source).toContain('peregrine falcons see flicker at 129 Hz or more (Potier et al. 2020)');
  });
});

describe('invert pitch', () => {
  const start = source.indexOf('var RAPTOR_CONTROL_SCHEMES = {');
  const SCHEMES = Function(source.slice(start, source.indexOf('\n  };\n', start) + 5) + '\nreturn RAPTOR_CONTROL_SCHEMES;')();
  const INV = Function(['raptorSwappedPitchAction', 'raptorInvertPitchScheme'].map(body).join('\n') +
    '\nreturn { raptorSwappedPitchAction, raptorInvertPitchScheme };')();
  const swap = { pitchUp: 'pitchDown', pitchDown: 'pitchUp' };

  it('swaps only the nose keys in every preset and leaves the preset itself alone', () => {
    expect(Object.keys(SCHEMES)).toEqual(['classic', 'arrows', 'lefthand', 'simple']);
    for (const scheme of Object.values(SCHEMES)) {
      const before = JSON.stringify(scheme.keys);
      const inverted = INV.raptorInvertPitchScheme(scheme, true);
      expect(Object.keys(inverted.keys)).toEqual(Object.keys(scheme.keys));
      for (const [key, action] of Object.entries(scheme.keys)) expect(inverted.keys[key]).toBe(swap[action] || action);
      expect(JSON.stringify(scheme.keys)).toBe(before);
      expect(INV.raptorInvertPitchScheme(INV.raptorInvertPitchScheme(scheme, true), true).keys).toEqual(scheme.keys);
      expect(INV.raptorInvertPitchScheme(scheme, false)).toBe(scheme);
    }
    // Flight-sim style: push forward (W, up arrow, I) to dive.
    const classic = INV.raptorInvertPitchScheme(SCHEMES.classic, true).keys;
    expect([classic.w, classic.arrowup, classic.s, classic.arrowdown]).toEqual(['pitchDown', 'pitchDown', 'pitchUp', 'pitchUp']);
    expect(INV.raptorInvertPitchScheme(SCHEMES.lefthand, true).keys.i).toBe('pitchDown');
  });

  it('reverses vertical drag and reaches the flight through the controls command', () => {
    expect(source).toContain('pendingPointerPitch+(invertPitch?dy:-dy)*touchPitchSensitivity');
    expect(source).toContain("sendHuntCommand('controls', { scheme: controlScheme, keys: customControlKeys, invertPitch: invertPitch });");
    expect(source).toContain('setControlScheme(value.scheme, value.keys, value.invertPitch);');
    expect(source).toContain("var invertPitch = !!(canvasEl.dataset && canvasEl.dataset.raptorInvertPitch === 'true');");
    // Rebinding shows the swapped keys but stores the plain map.
    expect(source).toContain('var storedAction = invertPitch ? raptorSwappedPitchAction(rebindAction) : rebindAction;');
    expect(source).toContain('next[raw] = storedAction;');
  });
});

describe('the catch', () => {
  it('conserves momentum when the bird binds to its prey', () => {
    // A 0.95 kg peregrine at 60 m/s takes a 0.35 kg pigeon: 57 kg m/s over 1.3 kg.
    const v = H.raptorSpeedAfterCatch(60, 0.95, 0.35);
    expect((0.95 + 0.35) * v).toBeCloseTo(0.95 * 60, 9);
    expect(v).toBeCloseTo(43.846, 3);
  });

  it('pulls out with the catch even with the dive key still held', () => {
    expect(source).toContain('raptor.speed = raptorSpeedAfterCatch(raptor.speed, species.massKg, preyBodyMassKg);');
    expect(source).toContain('catchPullOutUntil = now + 900;');
    expect(source).toContain("var diveKey = !!keys['shift'] && !wasLanded && !wasCrashed && motionNow >= catchPullOutUntil;");
    // After every High Stoop check, which read the dive speed at the moment of the catch.
    const catchBody = body('catchPrey');
    expect(catchBody.split('raptorSpeedAfterCatch').length - 1).toBe(1);
    expect(catchBody.lastIndexOf('highStoopQualifyingDive()')).toBeLessThan(catchBody.indexOf('raptorSpeedAfterCatch'));
  });
});
