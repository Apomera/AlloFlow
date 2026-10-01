/**
 * Raptor Hunt catch feel: the talon throw, a nose that stays where the player puts it,
 * raptor focus (time slowed on a final approach) and the pull-out with a catch. The tests
 * run the shipped functions lifted from the source rather than restating them.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// Overridable so a mutation can run against a COPY; other sessions edit this file.
const source = readFileSync(process.env.RAPTOR_SOURCE || 'stem_lab/stem_tool_raptorhunt.js', 'utf8');
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
const H = Function(['raptorFocusWanted', 'raptorEaseTimeScale', 'raptorSettlePitch', 'raptorSpeedAfterCatch'].map(body).join('\n') +
  '\nreturn { raptorFocusWanted, raptorEaseTimeScale, raptorSettlePitch, raptorSpeedAfterCatch };')();

// The strike path with the real targeting functions, on flat ground, the bird flying -z.
function throwFixture() {
  const bird = { x: 0, y: 12, z: 0, yaw: 0, pitch: 0, speed: 20, diving: false, crashed: false, landed: false };
  const prey = [];
  const log = { caught: [], missed: [], queued: [] };
  const api = Function('raptor', 'preyMeshes', 'log', `
    var activePerch = null, attendedPrey = null, mission = { id: 'open' }, lockConeDot = 0.1, flightForward = {}, lastTargetCorrection = null;
    var simPaused = false, strikeReady = true, strikeRecoveryUntil = 0, motionNow = 0, RAPTOR_TALON_THROW_MS = ${THROW_MS};
    var talonThrow = { active: false, until: 0, preferred: null, closest: null };
    function flightForwardVector() { return { x: Math.sin(raptor.yaw) * Math.cos(raptor.pitch), y: Math.sin(raptor.pitch), z: -Math.cos(raptor.yaw) * Math.cos(raptor.pitch) }; }
    function terrainHeightAt() { return 0; }
    function markTutorialSignal() {}
    function publishControlState() {}
    function queueFlightAction(callback, delay) { log.queued.push(delay); }
    function catchPrey(index, now) {
      var p = preyMeshes[index].mesh.position;
      log.caught.push({ prey: preyMeshes[index], now: now, distance: Math.hypot(p.x - raptor.x, p.y - raptor.y, p.z - raptor.z) });
      preyMeshes.splice(index, 1);
    }
    function missStrike(targetInfo, now) { log.missed.push({ targetInfo: targetInfo, now: now }); }
    ${['targetSteeringCorrection', 'evaluatePreyTarget', 'terrainSightClear', 'chooseAttendedTarget', 'acquireTarget',
      'strike', 'preyClosingSpeed', 'talonThrowReach', 'resolveTalonThrow', 'endTalonThrow'].map(body).join('\n')}
    return {
      strike: strike,
      // One frame: bird and prey move, then the throw resolves, as in the flight loop.
      fly: function(ms) {
        raptor.z -= raptor.speed * ms / 1000;
        preyMeshes.forEach(function(p) { p.mesh.position.x += p.vx * ms / 1000; p.mesh.position.z += p.vz * ms / 1000; });
        motionNow += ms;
        resolveTalonThrow();
      },
      state: function() { return { active: talonThrow.active, ready: strikeReady, now: motionNow }; }
    };`)(bird, prey, log);
  const add = (ahead, { x = 0, y = 12, vx = 0, vz = 0 } = {}) => {
    const p = { mesh: { position: { x, y, z: -ahead } }, vx, vz };
    prey.push(p);
    return p;
  };
  const flyThrough = () => { for (let i = 0; i < 60 && api.state().active; i++) api.fly(1000 / 60); };
  return { bird, log, add, flyThrough, ...api };
}

describe('the talon throw', () => {
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
    expect(f.log.caught[0].distance).toBeLessThanOrEqual(5);
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
