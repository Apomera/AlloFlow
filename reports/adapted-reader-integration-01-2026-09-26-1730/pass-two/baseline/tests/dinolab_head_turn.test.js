// Dino Lab - the reconstruction breathed, blinked and swayed its tail, but
// its neck only ever CHANGED SCALE. It never turned.
//
// An animal that never looks anywhere reads as a model with a chest pump.
// The idle head-turn is two slow sines on the shared motion clock, so it
// inherits the pause and reduced-motion contract the rest of the loop already
// honours rather than carrying its own guard.
//
// These tests run the tool's OWN expressions, extracted from source. A
// retyped copy passes even when the shipped code is broken - that happened on
// the records challenge in this same tool, and is why nothing here is retyped.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const SRC = readFileSync('stem_lab/stem_tool_dinolab.js', 'utf8');

function lookFn() {
  const open = SRC.indexOf('var lookY = Math.sin');
  expect(open, 'the head-turn was not found').toBeGreaterThan(-1);
  const close = SRC.indexOf('idleMotion.neck.rotation.y', open);
  // eslint-disable-next-line no-new-func
  return new Function('idleTime', 'idleMotion',
    SRC.slice(open, close) + '\nreturn { lookY: lookY, lookX: lookX };');
}

function motionStep() {
  const open = SRC.indexOf('function dinoMotionStep');
  expect(open, 'dinoMotionStep was not found').toBeGreaterThan(-1);
  const close = SRC.indexOf('\n  }', open) + 4;
  // eslint-disable-next-line no-new-func
  return new Function(SRC.slice(open, close) + '\nreturn dinoMotionStep;')();
}

function sweep(phase) {
  const f = lookFn();
  let minY = Infinity, maxY = -Infinity, minX = Infinity, maxX = -Infinity;
  for (let t = 0; t < 240; t += 0.05) {
    const r = f(t, { phase });
    minY = Math.min(minY, r.lookY); maxY = Math.max(maxY, r.lookY);
    minX = Math.min(minX, r.lookX); maxX = Math.max(maxX, r.lookX);
  }
  return { minY, maxY, minX, maxX };
}

describe('the head actually turns', () => {
  it('sweeps on both axes', () => {
    const s = sweep(3.29);
    expect(s.maxY - s.minY, 'yaw never changes - the head is frozen').toBeGreaterThan(0.02);
    expect(s.maxX - s.minX, 'pitch never changes').toBeGreaterThan(0.01);
  });

  it('stays within a natural range', () => {
    // A neck that swings far looks broken, not alive. Keep it well under a
    // quarter radian on both axes.
    const s = sweep(3.29);
    for (const v of [s.minY, s.maxY, s.minX, s.maxX]) {
      expect(Math.abs(v), 'the neck swings unnaturally far').toBeLessThan(0.25);
    }
  });

  it('does not trace a repeating figure-eight', () => {
    // Equal frequencies on both axes would lock the head into an obvious
    // mechanical loop. The two sines must drift apart.
    const f = lookFn();
    let everOpposed = false;
    for (let t = 0; t < 240; t += 0.37) {
      const r = f(t, { phase: 3.29 });
      if (Math.sign(r.lookY) !== Math.sign(r.lookX)) { everOpposed = true; break; }
    }
    expect(everOpposed, 'yaw and pitch stay locked in step').toBe(true);
  });

  it('gives different animals different timing', () => {
    // phase comes from the species id, so two dinosaurs on screen should not
    // move in unison.
    const f = lookFn();
    const a = f(5, { phase: 1.88 }).lookY;
    const b = f(5, { phase: 4.23 }).lookY;
    expect(Math.abs(a - b), 'every species looks around in lockstep').toBeGreaterThan(0.001);
  });
});

describe('it obeys the motion contract already in the loop', () => {
  it('freezes when motion is off', () => {
    // Reduced motion and the pause button both drive running=false. The
    // head-turn reads idleTime, so a frozen clock must mean a still head.
    const step = motionStep();
    const clock = { last: null, elapsed: 0 };
    for (let i = 0; i < 60; i++) step(clock, 1000 + i * 16, false);
    expect(clock.elapsed, 'the clock advances while motion is off').toBe(0);

    const f = lookFn();
    expect(f(clock.elapsed, { phase: 3.29 })).toEqual(f(clock.elapsed, { phase: 3.29 }));
  });

  it('advances when motion is on', () => {
    const step = motionStep();
    const clock = { last: null, elapsed: 0 };
    for (let i = 0; i < 60; i++) step(clock, 1000 + i * 16, true);
    expect(clock.elapsed).toBeGreaterThan(0.5);
  });

  it('reads the shared clock rather than wall time', () => {
    const open = SRC.indexOf('var lookY = Math.sin');
    const block = SRC.slice(open, SRC.indexOf('idleMotion.neck.rotation.x', open));
    expect(block).toContain('idleTime');
    expect(block, 'the head-turn bypasses the pausable clock')
      .not.toMatch(/performance\.now|Date\.now/);
  });
});

describe('it is wired to the model', () => {
  it('remembers the neck rest rotation', () => {
    expect(SRC).toContain('neckBaseRotation: null,');
    expect(SRC).toContain('idleMotion.neckBaseRotation = neckMeshes[0].rotation.clone();');
  });

  it('offsets from the rest pose instead of overwriting it', () => {
    // Assigning the raw wave would discard however the neck was posed.
    expect(SRC).toContain('idleMotion.neck.rotation.y = idleMotion.neckBaseRotation.y + lookY;');
    expect(SRC).toContain('idleMotion.neck.rotation.x = idleMotion.neckBaseRotation.x + lookX;');
  });

  it('keeps the outline on the neck', () => {
    // The contour is a separate mesh. If it does not follow the rotation the
    // silhouette detaches from the body.
    const open = SRC.indexOf('if (idleMotion.neckBaseRotation)');
    const block = SRC.slice(open, SRC.indexOf('breathingMeshes.forEach', open));
    expect(block).toContain('idleMotion.neckContour.rotation.copy(idleMotion.neck.rotation)');
  });

  it('guards on the stored rotation being present', () => {
    expect(SRC).toContain('if (idleMotion.neckBaseRotation) {');
  });
});
