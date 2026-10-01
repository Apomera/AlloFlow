// Dino Lab - the reconstruction breathed, blinked and swayed its tail, but
// its neck only ever CHANGED SCALE. It never turned.
//
// An animal that never looks anywhere reads as a model with a chest pump.
// The idle head-turn is two slow sines on the shared motion clock, so pausing
// freezes the current pose. The connected-look gate preserves the rest pose
// in evidence, study and reduced-motion views.
//
// These tests run the tool's OWN expressions, extracted from source. A
// retyped copy passes even when the shipped code is broken - that happened on
// the records challenge in this same tool, and is why nothing here is retyped.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const SRC = readFileSync('stem_lab/stem_tool_dinolab.js', 'utf8');

function lookFn() {
  const open = SRC.indexOf('var connectedLook =');
  expect(open, 'the connected head-turn gate was not found').toBeGreaterThan(-1);
  const close = SRC.indexOf('idleMotion.neck.rotation.y', open);
  // Extract the production gate as well as both waves. The default fixture is
  // the moving life view; evidence and reduced-motion contexts stay neutral.
  // eslint-disable-next-line no-new-func
  const run = new Function('idleTime', 'idleMotion', 'props', 'cameraStudy',
    'cameraTargetIsEvidence', 'reducedMotionRef',
    SRC.slice(open, close) + '\nreturn { lookY: lookY, lookX: lookX };');
  return (idleTime, idleMotion, context = {}) => run(idleTime, idleMotion,
    { showSkeleton: context.showSkeleton ?? false }, context.cameraStudy ?? 'full',
    context.cameraTargetIsEvidence ?? false, { current: context.reducedMotion ?? false });
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
    const step = motionStep();
    const clock = { last: null, elapsed: 0 };
    for (let i = 0; i < 60; i++) step(clock, 1000 + i * 16, true);
    expect(clock.elapsed).toBeGreaterThan(0.5);
    const f = lookFn(), pausedAt = clock.elapsed;
    const poseBeforePause = f(pausedAt, { phase: 3.29 });
    for (let i = 0; i < 60; i++) {
      step(clock, 3000 + i * 16, false);
      expect(clock.elapsed, 'the clock advances while paused').toBe(pausedAt);
      expect(f(clock.elapsed, { phase: 3.29 })).toEqual(poseBeforePause);
    }
  });

  it.each([
    { label: 'skeleton view', context: { showSkeleton: true } },
    { label: 'head study', context: { cameraStudy: 'head' } },
    { label: 'neck study', context: { cameraStudy: 'neck' } },
    { label: 'evidence target', context: { cameraTargetIsEvidence: true } },
    { label: 'reduced motion', context: { reducedMotion: true } },
  ])('keeps the rest pose in the $label', ({ context }) => {
    const f = lookFn();
    for (const t of [0, 5, 30, 90, 240]) {
      expect(f(t, { phase: 3.29 }, context)).toEqual({ lookY: 0, lookX: 0 });
    }
  });
  it('advances when motion is on', () => {
    const step = motionStep();
    const clock = { last: null, elapsed: 0 };
    for (let i = 0; i < 60; i++) step(clock, 1000 + i * 16, true);
    expect(clock.elapsed).toBeGreaterThan(0.5);
  });

  it('reads the shared clock rather than wall time', () => {
    const open = SRC.indexOf('var connectedLook =');
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
