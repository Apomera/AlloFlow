import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

let P;
beforeEach(() => { resetStemLab(); loadTool('stem_lab/stem_tool_moonmission.js', 'moonMission'); P = window.MoonMissionPure; });
const state = extra => ({ alt: 12, vVel: -1, hVel: 4, fuel: 100, thrust: .6, tilt: 0, x: 0, elapsed: 0, ...extra });
function run(pool, until = 1, extra = {}) { for (let i = 0; i <= Math.round(until * 60); i++) P.stepDescentDust(pool, state({ elapsed: i / 60, x: i / 15, ...extra })); }
function context() {
  const lines = [], c = { alpha: 1, save() { this.saved = this.alpha; }, restore() { this.alpha = this.saved; }, beginPath() {},
    moveTo(x, y) { this.start = [x, y]; }, lineTo(x, y) { lines.push({ start: this.start, end: [x, y], alpha: this.alpha }); }, stroke() {} };
  Object.defineProperty(c, 'globalAlpha', { get() { return this.alpha; }, set(v) { this.alpha = v; } }); return { c, lines };
}

describe('shared lunar descent ballistic dust', () => {
  it('uses a finite pool with safe capacities and no initial grains', () => {
    for (const [n, expected] of [[undefined, 220], [NaN, 220], [-1, 12], [25.8, 25], [2000, 256]]) {
      const pool = P.newDescentDust(n); expect(pool.capacity).toBe(expected); expect(pool.grains).toHaveLength(expected);
      expect(P.sampleDescentDust(pool, 0)).toEqual([]);
    }
  });
  it('has deterministic radial seeds independent of Math.random and graphics', () => {
    const first = P.newDescentDust(90), original = Math.random;
    try { Math.random = () => .111; expect(P.newDescentDust(90).seeds).toEqual(first.seeds); } finally { Math.random = original; }
    expect(first.seeds.every(s => s.speed >= 15 && s.speed <= 40 && s.elevation >= Math.PI / 180 && s.elevation <= 2.5 * Math.PI / 180)).toBe(true);
    expect(Object.isFrozen(first.seeds)).toBe(true);
  });
  it('invalid measurement cannot mutate an existing emitter', () => {
    const pool = P.newDescentDust(90); run(pool, .3); const before = JSON.stringify(pool);
    for (const raw of [null, {}, state({ elapsed: -1 }), state({ x: NaN }), state({ z: Infinity }), state({ alt: -1 }), state({ fuel: -1 })])
      expect(P.stepDescentDust(pool, raw)).toBe(false);
    expect(JSON.stringify(pool)).toBe(before); expect(P.stepDescentDust(null, state())).toBe(false);
  });
  it('reads measured flight states without changing their position, fuel, engine or contact', () => {
    const pool = P.newDescentDust(), s = state(), before = JSON.stringify(s);
    P.stepDescentDust(pool, s); P.sampleDescentDust(pool, 1); expect(JSON.stringify(s)).toBe(before);
  });
  it('only an actual airborne burn near the surface can emit', () => {
    for (const extra of [{ alt: 30 }, { alt: 300 }, { thrust: 0 }, { thrust: .1 }, { fuel: 0 }, { alt: 0, contact: true }]) {
      const pool = P.newDescentDust(); run(pool, 1, extra); expect(P.sampleDescentDust(pool, 1)).toEqual([]);
    }
    const pool = P.newDescentDust(); run(pool); expect(P.sampleDescentDust(pool, 1).length).toBeGreaterThan(20);
  });
  it('uses actual output rather than requested throttle to start emissions', () => {
    const pool = P.newDescentDust(); run(pool, .5, { thrust: 0, throttle: 1 }); expect(P.sampleDescentDust(pool, .5)).toEqual([]);
  });
  it('tilt moves the plume surface origin against the measured thrust direction', () => {
    const left = P.newDescentDust(), right = P.newDescentDust();
    P.stepDescentDust(left, state({ tilt: -.3 })); P.stepDescentDust(right, state({ tilt: .3 }));
    expect(left.grains[0].launchX - right.grains[0].launchX).toBeCloseTo(2 * (12 + .7) * Math.tan(.3), 12);
    expect(left.grains[0].vx).toBe(right.grains[0].vx); expect(left.grains[0].vz).toBe(right.grains[0].vz);
  });
  it('symmetric tilt keeps the same shallow ejection angles and launch energy', () => {
    const a = P.newDescentDust(), b = P.newDescentDust(); run(a, .5, { tilt: -.35 }); run(b, .5, { tilt: .35 });
    for (let i = 0; i < a.grains.length; i++) if (a.grains[i]) {
      expect(a.grains[i].vy).toBe(b.grains[i].vy); expect(a.grains[i].life).toBe(b.grains[i].life);
    }
  });
  it('launch points stay in world metres when the lander later drifts', () => {
    const pool = P.newDescentDust(); P.stepDescentDust(pool, state({ x: 80 }));
    const launch = { ...pool.grains[0] }; P.stepDescentDust(pool, state({ elapsed: .2, x: 140, thrust: 0 }));
    expect(pool.grains[0]).toEqual(launch);
    const grain = P.sampleDescentDust(pool, .2).find(p => p.id === launch.id);
    expect(grain.x).toBeCloseTo(launch.launchX + launch.vx * .2, 12);
  });
  it('cutting the engine stops new births and retains airborne grains', () => {
    const pool = P.newDescentDust(); run(pool, .5); const ids = P.sampleDescentDust(pool, .5).map(p => p.id), serial = pool.serial;
    P.stepDescentDust(pool, state({ elapsed: .6, thrust: 0 })); const after = P.sampleDescentDust(pool, .6);
    expect(pool.serial).toBe(serial); expect(after.length).toBeGreaterThan(0); expect(after.every(p => ids.includes(p.id))).toBe(true);
    expect(P.sampleDescentDust(pool, 3.1)).toEqual([]);
  });
  it('fuel exhaustion and contact stop births while settling continues', () => {
    for (const extra of [{ fuel: 0 }, { alt: 0, contact: true }]) {
      const pool = P.newDescentDust(); run(pool, .5); const serial = pool.serial;
      P.stepDescentDust(pool, state({ elapsed: .6, ...extra })); expect(pool.serial).toBe(serial);
      expect(P.sampleDescentDust(pool, .6).length).toBeGreaterThan(0); expect(P.sampleDescentDust(pool, 3.1)).toEqual([]);
    }
  });
  it('every grain follows the exact lunar gravity parabola with constant sideways velocity', () => {
    const pool = P.newDescentDust(); run(pool, .4);
    for (const p of P.sampleDescentDust(pool, .4)) {
      const launch = pool.grains.find(q => q?.id === p.id), t = p.age;
      expect(p.x).toBeCloseTo(launch.launchX + launch.vx * t, 12); expect(p.z).toBeCloseTo(launch.launchZ + launch.vz * t, 12);
      expect(p.height).toBeCloseTo(.02 + launch.vy * t - 1.624 * t * t / 2, 12);
      expect(p.verticalSpeed).toBeCloseTo(launch.vy - 1.624 * t, 12);
    }
  });
  it('free particles conserve specific mechanical energy without drag', () => {
    const pool = P.newDescentDust(); run(pool, .4);
    for (const p of P.sampleDescentDust(pool, .4)) {
      const launch = pool.grains.find(q => q?.id === p.id);
      const energy = (launch.vx ** 2 + launch.vz ** 2 + p.verticalSpeed ** 2) / 2 + 1.624 * p.height;
      const initial = (launch.vx ** 2 + launch.vz ** 2 + launch.vy ** 2) / 2 + 1.624 * .02;
      expect(energy).toBeCloseTo(initial, 10);
    }
  });
  it('retire time is physical surface return and always fits the pool cycle', () => {
    const pool = P.newDescentDust(); run(pool, 3);
    for (const p of pool.grains.filter(Boolean)) {
      expect(.02 + p.vy * p.life - 1.624 * p.life * p.life / 2).toBeCloseTo(0, 12);
      expect(p.life).toBeLessThan(P.descentDust.cycle); expect(p.life).toBeGreaterThan(0);
    }
  });
  it('does not draw before birth or at or after surface return', () => {
    const pool = P.newDescentDust(); P.stepDescentDust(pool, state()); const p = pool.grains[0];
    expect(P.sampleDescentDust(pool, p.life)).toEqual([]); expect(P.sampleDescentDust(pool, NaN)).toEqual([]);
    expect(P.sampleDescentDust(pool, -1)).toEqual([]);
  });
  it('short trails stop at the launch point rather than extending before birth', () => {
    const pool = P.newDescentDust(); P.stepDescentDust(pool, state()); const p = P.sampleDescentDust(pool, .001)[0];
    expect(p.tailX).toBe(p.launchX); expect(p.tailZ).toBe(p.launchZ); expect(p.tailHeight).toBe(.02);
    expect(p.height).toBeGreaterThan(.02);
  });
  it('each particle fades independently as its own flight ends', () => {
    const pool = P.newDescentDust(); P.stepDescentDust(pool, state()); const grain = pool.grains[0];
    const first = P.sampleDescentDust(pool, 0)[0], late = P.sampleDescentDust(pool, grain.life * .9)[0];
    expect(first.opacity).toBeGreaterThan(late.opacity); expect(late.opacity).toBeGreaterThan(0);
  });
  it('repeated time and paused control edits create no extra grains or state changes', () => {
    const pool = P.newDescentDust(); run(pool, .5); const before = JSON.stringify(pool), picture = P.sampleDescentDust(pool, .5);
    for (let i = 0; i < 120; i++) expect(P.stepDescentDust(pool, state({ elapsed: .5, throttle: 1 }))).toBe(false);
    expect(JSON.stringify(pool)).toBe(before); expect(P.sampleDescentDust(pool, .5)).toEqual(picture);
  });
  it('rewinding resets past dust instead of retaining a later launch', () => {
    const pool = P.newDescentDust(); run(pool, 1);
    P.stepDescentDust(pool, state({ elapsed: .2, thrust: 0 })); expect(P.sampleDescentDust(pool, .2)).toEqual([]);
    expect(pool.serial).toBe(0); expect(pool.lastTime).toBe(.2);
  });
  it('a missing interval cannot fill the screen with retroactive births', () => {
    const pool = P.newDescentDust(); P.stepDescentDust(pool, state()); P.stepDescentDust(pool, state({ elapsed: 10 }));
    const visible = P.sampleDescentDust(pool, 10); expect(visible).toHaveLength(1); expect(visible[0].born).toBe(10);
  });
  it('sampling at any renderer cadence leaves the same fixed-step emitter and flight', () => {
    const runs = [];
    for (const cadence of [1, 2, 7]) {
      const pool = P.newDescentDust(), s = state({ alt: 24 }), initial = JSON.stringify(s);
      for (let i = 0; i < 90; i++) {
        P.descentStep(s, { throttle: .6 }, 1 / 60); P.stepDescentDust(pool, s);
        if (i % cadence === 0) P.sampleDescentDust(pool, s.elapsed);
      }
      runs.push({ flight: s, emitter: pool, picture: P.sampleDescentDust(pool, s.elapsed) }); expect(JSON.stringify(s)).not.toBe(initial);
    }
    expect(runs[1]).toEqual(runs[0]); expect(runs[2]).toEqual(runs[0]);
  });
  it('adding dust cannot change the original flight integration or grading', () => {
    const s = state({ alt: 24, vVel: -4 }), baseline = { ...s }, pool = P.newDescentDust();
    for (let i = 0; i < 1200 && !s.contact; i++) {
      P.descentStep(s, {}, 1 / 60); P.stepDescentDust(pool, s); P.sampleDescentDust(pool, s.elapsed);
      P.descentStep(baseline, {}, 1 / 60);
    }
    expect(s).toEqual(baseline); expect(s.contact).toBe(true);
  });
  it('a long active run remains bounded and never replaces a still-flying grain', () => {
    const pool = P.newDescentDust(90); let expired = 0;
    for (let i = 0; i < 60 * 30; i++) {
      const time = i / 60, prior = pool.grains[pool.cursor]; P.stepDescentDust(pool, state({ elapsed: time }));
      if (prior && !pool.grains.includes(prior)) { expect(time - prior.born).toBeGreaterThan(prior.life); expired++; }
      expect(P.sampleDescentDust(pool, time).length).toBeLessThanOrEqual(90); expect(pool.grains).toHaveLength(90);
    }
    expect(expired).toBeGreaterThan(100);
  });
  it('samples are detached and frozen and sampling does not change the emitter', () => {
    const pool = P.newDescentDust(); run(pool, .4); const before = JSON.stringify(pool), samples = P.sampleDescentDust(pool, .4);
    expect(Object.isFrozen(samples)).toBe(true); expect(samples.every(Object.isFrozen)).toBe(true); expect(JSON.stringify(pool)).toBe(before);
  });
  it('the side view projects absolute positions rather than attaching dust to the craft', () => {
    const pool = P.newDescentDust(); run(pool, .4); const samples = P.sampleDescentDust(pool, .4), a = context(), b = context();
    P.drawDescentDust2D(a.c, samples, 0, 0, 200, 250); P.drawDescentDust2D(b.c, samples, 18, 0, 200, 250);
    expect(a.lines).toHaveLength(samples.length);
    for (let i = 0; i < a.lines.length; i++) {
      expect(b.lines[i].end[0] - a.lines[i].end[0]).toBeCloseTo(-27, 10);
      expect(b.lines[i].end[1]).toBe(a.lines[i].end[1]); expect(a.lines[i].alpha).toBeCloseTo(Math.sqrt(samples[i].opacity) * .85, 12);
    }
    expect(a.c.alpha).toBe(1); expect(b.c.alpha).toBe(1);
  });
  it('empty side views leave context opacity and geometry alone', () => {
    const { c, lines } = context(); P.drawDescentDust2D(c, [], 0, 0, 200, 250); expect(lines).toEqual([]); expect(c.alpha).toBe(1);
  });
});
