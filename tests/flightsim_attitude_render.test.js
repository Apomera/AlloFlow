import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * Guards a bug that hid in plain sight for a long time: the 3D aircraft never
 * tilted.
 *
 * `Physics.step()` returns a fresh object, and none of its three branches
 * (drone / helicopter / fixed-wing) includes `pitch` or `bank`; `flightRef` does
 * not initialise them either. The renderer read `state.pitch || 0`, so EVERY
 * aircraft flew permanently wings-level and zero-pitch — a 737 turning flat, a
 * Cessna that never flares, and a quadcopter accelerating forward without the
 * forward tilt this tool teaches is the only way a quadcopter can translate.
 *
 * Nothing threw and nothing changed shape, so no existing gate could see it.
 */
const PATHS = [
  'stem_lab/stem_tool_flightsim.js',
  'desktop/web-app/public/stem_lab/stem_tool_flightsim.js',
];
const eachSource = (fn) => PATHS.forEach((p) => fn(readFileSync(p, 'utf8'), p));

describe('flightsim 3D attitude', () => {
  it('does not read attitude from state alone', () => {
    eachSource((source, path) => {
      // The exact shape that was broken. If someone reverts to it, every
      // aircraft silently goes flat again.
      expect(source, `${path}: attitude reads state.pitch with no fallback`)
        .not.toMatch(/var pitchRad = \(state\.pitch \|\| 0\)/);
      expect(source, `${path}: attitude reads state.bank with no fallback`)
        .not.toMatch(/var bankRad = \(state\.bank \|\| 0\)/);
      expect(source).toContain('var pitchRad = (state.pitch != null ? state.pitch : (ctrl.pitch || 0))');
      expect(source).toContain('var bankRad = (state.bank != null ? state.bank : (ctrl.bank || 0))');
    });
  });

  it('keeps the fallback honest: physics still does not return an attitude', () => {
    eachSource((source, path) => {
      // If a physics branch ever starts returning pitch/bank, the `state != null`
      // arm takes over and this guard should be revisited rather than silently
      // shadowed. Failing here is a prompt to re-check, not necessarily a bug.
      const physics = source.slice(0, source.indexOf('// ── FIXED-WING PHYSICS'));
      expect(physics.includes('pitch: pitch'), `${path}: physics now returns pitch — re-check the renderer fallback`)
        .toBe(false);
    });
  });

  it('keeps a parked aircraft level on its gear', () => {
    eachSource((source, path) => {
      // Exposed by the fix above: with attitude restored, aileron input on the
      // runway rolled the airframe 45 degrees (screenshotted: a Cessna at 0 kt with
      // the "Ready for Takeoff" card still up, whole world tilted). Pitch is
      // deliberately still live on the ground — rotating nose-up with the mains
      // down is the takeoff lesson.
      expect(source, `${path}: a parked aircraft can roll again`)
        .toContain('if (state.onGround) bankRad = 0;');
      expect(source, `${path}: pitch must stay live on the ground for rotation`)
        .not.toMatch(/if \(state\.onGround\) pitchRad = 0;/);
    });
  });

  it('rolls the chase camera partly with bank, before lookAt', () => {
    eachSource((source, path) => {
      // Measured live: roll fraction 0.353 of aircraft bank, mirrored left/right,
      // and exactly 0 while parked or wings-level.
      expect(source, `${path}: the chase camera no longer rolls with bank`)
        .toContain('camera.up.set(0, 1, 0).applyAxisAngle(chaseFwd.normalize(), bankRad * 0.35)');
      // A zero-length axis puts NaN into camera.up and blanks the view.
      expect(source, `${path}: the degenerate-axis guard is gone`)
        .toContain('if (chaseFwd.lengthSq() > 1e-4) {');
      // up is an INPUT to the look matrix. Setting it afterwards (as the original
      // did) leaves the first chase frame after a view switch using the stale
      // cockpit up.
      const block = source.slice(source.indexOf('if (d.thirdPerson) {'));
      const upAt = block.indexOf('camera.up.set(0, 1, 0).applyAxisAngle');
      const lookAt = block.indexOf('camera.lookAt');
      expect(upAt, `${path}: chase camera up assignment not found`).toBeGreaterThan(-1);
      expect(upAt, `${path}: camera.up is set AFTER lookAt, so it has no effect`).toBeLessThan(lookAt);
    });
  });

  it('stabilises the drone gimbal against the airframe', () => {
    eachSource((source, path) => {
      // Verified live: airframe pitch -25 / roll -25 while the gimbal held 0/0.
      expect(source, `${path}: the gimbal no longer counter-rotates`)
        .toContain('acMesh.userData.gimbal.rotation.x = Math.max(-gLimit, Math.min(gLimit, pitchRad));');
      expect(source).toContain('acMesh.userData.gimbal.rotation.z = Math.max(-gLimit, Math.min(gLimit, -bankRad));');
    });
  });
});
