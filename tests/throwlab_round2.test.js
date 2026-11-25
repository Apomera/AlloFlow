// Throw Lab, round 2 (2026-11-23): the cricket bounce, the low-spin dart, Field Goal as a task,
// "fix this miss", the tier questions, and the small fixes that came with them.
//
// Like tests/throwlab_physics_model.test.js, every check runs the tool's own functions
// (window.StemLab.ThrowLabModel) or reads the tool's own text. Nothing here re-implements the
// physics. THROWLAB_FILE=<path> points the suite at another copy of the tool; it was run once
// against the file as it stood before round 2 to confirm these checks fail there.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const FILE = process.env.THROWLAB_FILE || 'stem_lab/stem_tool_throwlab.js';
const source = readFileSync(FILE, 'utf8');

function loadModel() {
  const win = { addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: false }) };
  const doc = {
    getElementById: () => null,
    createElement: () => ({ setAttribute() {}, appendChild() {}, style: {} }),
    head: { appendChild() {} }, body: { appendChild() {} }, addEventListener() {},
  };
  win.document = doc; win.window = win;
  const ctx = vm.createContext({ window: win, document: doc, console: { log() {}, warn() {}, error() {} }, setTimeout, clearTimeout, navigator: {} });
  vm.runInContext(source, ctx, { filename: 'stem_tool_throwlab.js' });
  return win.StemLab && win.StemLab.ThrowLabModel;
}

const M = loadModel();
const YD = 0.9144;
const MPH = 2.23694;
const setupFor = (mode, id, over) => Object.assign(
  { mode, throwerHand: 'right', gravityId: 'earth', windMph: 0, windDirDeg: 0 },
  M.presetPatch(mode, id), over || {});
const run = (mode, id, over) => M.evaluateThrow(setupFor(mode, id, over));
const teachOf = (mode, id) => M.findPreset(mode, id).teach;
const num = (text, re) => { const m = text.match(re); expect(m, String(re) + ' in: ' + text).toBeTruthy(); return Number(m[1]); };
const MODES = M ? Object.keys(M.MODES) : [];
const stumps = M ? M.MODES.bowling.targetZ : 20.12;

describe('cricket: the ball bounces off the pitch', () => {
  it('a good-length ball lands, comes back up, and reaches the stumps', () => {
    const r = run('bowling', 'fast');
    expect(r.read.bounce, 'no bounce recorded').toBeTruthy();
    const fromStumps = stumps - r.read.bounce.z;
    expect(fromStumps).toBeGreaterThan(3.5);
    expect(fromStumps).toBeLessThan(7);
    const i = r.samples.findIndex((s) => s.ground);
    expect(i).toBeGreaterThan(0);
    expect(r.samples[i].y).toBe(0);
    // after the bounce the ball is going up again, and the path ends at the stumps, not at the bounce
    expect(Math.max(...r.samples.slice(i + 1).map((s) => s.y))).toBeGreaterThan(0.3);
    expect(r.samples[r.samples.length - 1].z).toBeCloseTo(stumps, 6);
    expect(r.location).toBe('wicket');
    expect(r.flightTime).toBeGreaterThan(r.read.bounce.t);
  });

  it('the bounce follows restitution and friction: e up, and mu(1+e) of the downward speed off the pace', () => {
    const ball = M.BALLS.cricket, surf = M.CRICKET_SURFACE;
    const none = { x: 0, y: 0, z: 0 };
    const out = M.pitchBounce(ball, surf, { vx: 0, vy: -8, vz: 36 }, none);
    expect(out.vy).toBeCloseTo(ball.cor * 8, 9);
    expect(36 - out.vz).toBeCloseTo(surf.mu * (1 + ball.cor) * 8, 9);
    expect(out.vx).toBe(0);
    // a steeper delivery loses more pace
    const steep = M.pitchBounce(ball, surf, { vx: 0, vy: -11, vz: 36 }, none);
    expect(36 - steep.vz).toBeGreaterThan(36 - out.vz);
    const r = run('bowling', 'fast');
    expect(r.read.bounce.speedOut).toBeLessThan(r.read.bounce.speedIn);
  });

  it('side spin turns the ball off the pitch, the opposite way to its drift in the air', () => {
    const off = run('bowling', 'offspin'), leg = run('bowling', 'legspin');
    expect(off.read.spinShift.side).toBeGreaterThan(0.15);
    expect(off.read.turn).toBeLessThan(-0.15);
    expect(leg.read.spinShift.side).toBeLessThan(-0.15);
    expect(leg.read.turn).toBeGreaterThan(0.15);
    // no spin, no turn
    const dead = run('bowling', 'offspin', { spinRpm: 0, aimDegH: 0 });
    expect(Math.abs(dead.read.bounce.turnDeg)).toBeLessThan(1e-9);
    // a left-arm bowler is the mirror image
    const lefty = run('bowling', 'offspin', { throwerHand: 'left', aimDegH: 0.5 });
    expect(lefty.read.turn).toBeCloseTo(-off.read.turn, 6);
    expect(lefty.read.cross.x).toBeCloseTo(-off.read.cross.x, 6);
  });

  it('a full toss is legal below the waist and a no-ball above it', () => {
    const full = run('bowling', 'fast', { aimDegV: -3 });
    expect(full.read.bounce).toBe(null);
    expect(full.read.fullToss).toBe(true);
    expect(full.location).toBe('wicket');
    expect(full.whereText).toMatch(/full toss \(no bounce\)/);
    const beam = run('bowling', 'fast', { aimDegV: 4 });
    expect(beam.location).toBe('beamer');
    expect(M.isMakeOutcome('beamer')).toBe(false);
    expect(beam.read.batter.y).toBeGreaterThan(M.MODES.bowling.waistHeight);
  });

  it('a ball that lands twice never reaches the stumps, and the sentence says so', () => {
    const r = run('bowling', 'fast', { aimDegV: -16, speedMph: 40 });
    expect(r.location).toBe('short');
    expect(r.read.secondLand).toBeTruthy();
    expect(r.read.secondLand.z).toBeGreaterThan(r.read.bounce.z);
    expect(r.whereText).toMatch(/landed again .* short of them\. A ball that bounces twice is a no-ball\./);
    // the verdict waits for the second landing, not the first
    expect(r.flightTime).toBeCloseTo(r.read.secondLand.t, 6);
  });

  it('the Bouncer behaves like one: short, then chest high at the batter', () => {
    const mm = M.MODES.bowling;
    const r = run('bowling', 'bouncer');
    expect(stumps - r.read.bounce.z).toBeGreaterThan(9);            // about half way down a 20 m pitch
    expect(r.read.batter.y).toBeGreaterThanOrEqual(mm.chestBand[0]);
    expect(r.read.batter.y).toBeLessThanOrEqual(mm.chestBand[1]);
    expect(r.read.cross.y).toBeGreaterThan(mm.stumpsHeight);         // it goes over the stumps
    expect(r.location).toBe('bouncer');
    expect(M.isMakeOutcome('bouncer')).toBe(true);
    // the same preset pitched up is not a bouncer, and another delivery cannot score as one
    expect(run('bowling', 'bouncer', { aimDegV: -9 }).location).not.toBe('bouncer');
    expect(run('bowling', 'fast', { aimDegV: -15 }).location).not.toBe('bouncer');
    // the vertical aim slider has to reach a short ball
    expect(mm.verticalAimRange[0]).toBeLessThanOrEqual(-15);
  });

  it('every number on the delivery cards comes out of the model', () => {
    const fast = run('bowling', 'fast'), tf = teachOf('bowling', 'fast');
    expect(num(tf, /bounces ([\d.]+) m in front/)).toBeCloseTo(stumps - fast.read.bounce.z, 1);
    const paces = tf.match(/from (\d+) mph to (\d+) mph/);
    expect(Number(paces[1])).toBe(Math.round(fast.read.bounce.speedIn * MPH));
    expect(Number(paces[2])).toBe(Math.round(fast.read.bounce.speedOut * MPH));
    for (const id of ['offspin', 'legspin']) {
      const r = run('bowling', id), t = teachOf('bowling', id);
      expect(num(t, /drifts about (\d+) cm/), id).toBe(Math.round(Math.abs(r.read.spinShift.side) * 100));
      expect(num(t, /turns back about (\d+) cm/), id).toBe(Math.round(Math.abs(r.read.turn) * 100));
    }
    const offT = teachOf('bowling', 'offspin').match(/from (\d+) mph to (\d+) mph/), off = run('bowling', 'offspin');
    expect(Number(offT[1])).toBe(Math.round(off.read.bounce.speedIn * MPH));
    expect(Number(offT[2])).toBe(Math.round(off.read.bounce.speedOut * MPH));
    const sw = run('bowling', 'outswing'), ts = teachOf('bowling', 'outswing');
    expect(num(ts, /about (\d+) cm in this lab/)).toBe(Math.round(Math.abs(sw.read.spinShift.side) * 100));
    expect(num(ts, /cuts back about (\d+) cm/)).toBe(Math.round(Math.abs(sw.read.turn) * 100));
    expect(num(teachOf('bowling', 'inswing'), /about (\d+) cm in this lab/)).toBe(Math.round(Math.abs(run('bowling', 'inswing').read.spinShift.side) * 100));
    const bo = run('bowling', 'bouncer'), tb = teachOf('bowling', 'bouncer');
    expect(num(tb, /bounces ([\d.]+) m in front/)).toBeCloseTo(stumps - bo.read.bounce.z, 1);
    expect(num(tb, /climbs to ([\d.]+) m/)).toBeCloseTo(bo.read.batter.y, 2);
    const warne = M.SCENARIOS.find((s) => s.id === 'warne-googly').teach, leg = run('bowling', 'legspin');
    expect(num(warne, /drifts about (\d+) cm/)).toBe(Math.round(Math.abs(leg.read.spinShift.side) * 100));
    expect(num(warne, /bounces ([\d.]+) m in front/)).toBeCloseTo(stumps - leg.read.bounce.z, 1);
    expect(num(warne, /turns back about (\d+) cm/)).toBe(Math.round(Math.abs(leg.read.turn) * 100));
    // no card still says the lab leaves the bounce out
    for (const p of M.presetsFor('bowling')) expect(p.teach).not.toMatch(/not the turn off the pitch/);
  });

  it('the picture can show it: a bounce mark and a view from above', () => {
    expect(source).toContain('function stripY(x)');
    expect(source).toContain("var stripOn = d.mode === 'pitching' || d.mode === 'bowling';");
    expect(source).toContain('if (!visPts[gb].s.ground) continue;');
  });
});

describe('low spin: the seeded dart', () => {
  const LOW = [['pitching', 'knuckle'], ['freekick', 'knuckle'], ['volleyball', 'float']];
  const sideOf = (r) => (r.read.dart.side !== null ? r.read.dart.side : r.read.dart.landSide);

  it('the same setup gives exactly the same path every time', () => {
    for (const [mode, id] of LOW) {
      const a = run(mode, id, { flutterSeed: 3 }), b = run(mode, id, { flutterSeed: 3 });
      expect(JSON.stringify(a.samples), mode).toBe(JSON.stringify(b.samples));
    }
  });

  it('a new air pattern gives a different path, and says which pattern it was', () => {
    for (const [mode, id] of LOW) {
      const a = run(mode, id, { flutterSeed: 1 }), b = run(mode, id, { flutterSeed: 2 });
      expect(Math.abs(sideOf(a) - sideOf(b)), mode).toBeGreaterThan(0.02);
      expect(a.read.dart.seed).toBe(1);
      expect(b.read.dart.seed).toBe(2);
    }
  });

  it('the dart fades as spin rises and is zero at high spin', () => {
    const ball = M.BALLS.baseball;
    expect(M.knuckleWeight(ball, 0)).toBe(1);
    expect(M.knuckleWeight(ball, 25)).toBeLessThan(1);
    expect(M.knuckleWeight(ball, 150)).toBeLessThan(M.knuckleWeight(ball, 25));
    expect(M.knuckleWeight(ball, 299)).toBeGreaterThan(0);
    expect(M.knuckleWeight(ball, ball.knuckleCutRpm)).toBe(0);
    expect(M.knuckleWeight(M.BALLS.golf, 0)).toBe(0);        // only the three low-spin sports dart
    expect(M.knuckleWeight(M.BALLS.cricket, 0)).toBe(0);
    // a spinning pitch ignores the air pattern completely
    const s1 = run('pitching', 'slider', { flutterSeed: 1 }), s9 = run('pitching', 'slider', { flutterSeed: 9 });
    expect(JSON.stringify(s9.samples)).toBe(JSON.stringify(s1.samples));
    expect(s1.read.dart).toBe(null);
    for (const [mode, ids] of [['pitching', ['4seam', '2seam', 'curve', 'slider', 'changeup']], ['freekick', ['curling', 'power', 'chip']], ['volleyball', ['jump', 'topspin']]]) {
      for (const id of ids) expect(run(mode, id).read.dart, mode + '/' + id).toBe(null);
    }
  });

  it('the dart is small, and as big as the cards say', () => {
    const maxSide = (mode, id) => { let mx = 0; for (let s = 1; s <= 40; s++) mx = Math.max(mx, Math.abs(sideOf(run(mode, id, { flutterSeed: s })))); return mx; };
    const base = maxSide('pitching', 'knuckle') * 39.37;
    expect(Math.abs(base - num(teachOf('pitching', 'knuckle'), /up to about (\d+) inches/))).toBeLessThan(1);
    const soccer = maxSide('freekick', 'knuckle');
    expect(Math.abs(soccer - num(teachOf('freekick', 'knuckle'), /up to about ([\d.]+) m sideways/))).toBeLessThan(0.06);
    const volley = maxSide('volleyball', 'float');
    expect(Math.abs(volley - num(teachOf('volleyball', 'float'), /up to about ([\d.]+) m sideways/))).toBeLessThan(0.06);
    expect(soccer).toBeLessThan(0.6);
    expect(volley).toBeLessThan(0.6);
    expect(num(teachOf('pitching', 'knuckle'), /\(about (\d+) rpm\)/)).toBe(M.findPreset('pitching', 'knuckle').spinRpm);
  });

  it('the first air pattern still succeeds, and the others do not all agree with it', () => {
    for (const [mode, id] of LOW) expect(M.isMakeOutcome(run(mode, id).location), mode).toBe(true);
    const outcomes = new Set();
    for (let s = 1; s <= 40; s++) outcomes.add(run('freekick', 'knuckle', { flutterSeed: s }).location);
    expect(outcomes.size).toBeGreaterThan(1);
  });

  it('"what spin changed" is measured without the dart, and the dart is measured on its own', () => {
    const r = run('pitching', 'knuckle');
    expect(Math.abs(r.vBreakIn)).toBeLessThan(2);      // 25 rpm of spin does almost nothing
    expect(Math.abs(r.hBreakIn)).toBeLessThan(0.5);
    expect(Math.abs(r.read.dart.side)).toBeGreaterThan(0.05);
  });

  it('a new air pattern is not a new way to earn XP', () => {
    expect(M.setupKey(setupFor('pitching', 'knuckle', { flutterSeed: 1 }))).toBe(M.setupKey(setupFor('pitching', 'knuckle', { flutterSeed: 2 })));
  });

  it('the student is told it is hard to predict, and the seed is visible', () => {
    expect(teachOf('pitching', 'knuckle')).toMatch(/nobody can tell which way/);
    expect(source).toContain('In real life nobody can predict which way.');
    expect(source).toContain("'data-throwlab-air-pattern': String(seed)");
    expect(source).toContain("['flutterSeed', 'air pattern']");
    for (const [mode, id] of LOW) expect(teachOf(mode, id)).not.toMatch(/does not show/);
  });
});

describe('Field Goal is a task', () => {
  const bar = 3.05;
  it('every preset kick only just clears the bar', () => {
    for (const p of M.presetsFor('fieldgoal')) {
      const r = run('fieldgoal', p.id);
      expect(r.location, p.id).toBe('good');
      const over = r.read.cross.y - bar;
      expect(over, p.id).toBeGreaterThan(0.3);
      expect(over, p.id).toBeLessThan(2);
      // and a little less speed is no longer good
      const slower = [1, 2, 3, 4, 5].map((k) => run('fieldgoal', p.id, { speedMph: p.speedMph - k }).location);
      expect(slower.some((loc) => loc !== 'good'), p.id + ' ' + slower.join(',')).toBe(true);
    }
  });

  it('three presets have wind, and the wind is what makes them hard', () => {
    const mid = M.findPreset('fieldgoal', 'midrange');
    expect(M.presetPatch('fieldgoal', 'midrange').windMph).toBe(mid.windMph);
    expect(M.presetPatch('fieldgoal', 'chipshot').windMph).toBe(0);
    // crosswind: without the aim into the wind the kick is wide by what the card says
    const noAim = run('fieldgoal', 'midrange', { aimDegH: 0 });
    expect(noAim.location).not.toBe('good');
    expect(Math.abs(noAim.read.cross.x)).toBeGreaterThan(M.MODES.fieldgoal.goalHalfWidth);
    // the card quotes the same measure the result card prints: this kick against the same kick in calm air
    const pushed = run('fieldgoal', 'midrange').read.windShift;
    expect(Math.abs(Math.abs(pushed.side) - num(mid.teach, /pushes this kick about ([\d.]+) m sideways/))).toBeLessThan(0.06);
    expect(pushed.side).toBeGreaterThan(0);                      // 90 degrees blows to the kicker's left
    expect(run('fieldgoal', 'long').read.windShift.up).toBeLessThan(-3);     // a headwind brings it in lower
    const helped = run('fieldgoal', 'hailmary').read.windShift;
    expect(helped.side).toBe(null);                              // in calm air it never reaches the posts
    expect(helped.carry).toBeGreaterThan(4);
    expect(run('fieldgoal', 'chipshot').read.windShift).toBe(null);
    expect(num(mid.teach, /aimed ([\d.]+)° into the wind/)).toBe(Math.abs(mid.aimDegH));
    // headwind: the same kick in calm air has far more room
    const long = M.findPreset('fieldgoal', 'long');
    expect(Math.abs(run('fieldgoal', 'long').read.cross.y - bar - num(long.teach, /clears the bar by about ([\d.]+) m\. In calm/))).toBeLessThan(0.1);
    expect(Math.abs(run('fieldgoal', 'long', { windMph: 0 }).read.cross.y - bar - num(long.teach, /clear it by about ([\d.]+) m/))).toBeLessThan(0.1);
    // tailwind: without it the Hail Mary is short
    const hail = M.findPreset('fieldgoal', 'hailmary');
    const calm = run('fieldgoal', 'hailmary', { windMph: 0 });
    expect(calm.location).toBe('short');
    expect(Math.round((hail.distanceYd * YD - calm.read.land.z) / YD)).toBe(num(hail.teach, /lands (\d+) yd short/));
    expect(Math.abs(run('fieldgoal', 'hailmary').read.cross.y - bar - num(hail.teach, /clears the bar by about ([\d.]+) m/))).toBeLessThan(0.1);
    expect(Math.abs(run('fieldgoal', 'chipshot').read.cross.y - bar - num(M.findPreset('fieldgoal', 'chipshot').teach, /by about ([\d.]+) m/))).toBeLessThan(0.1);
  });

  it('no kick clears by a mile any more, and a new sport starts in calm air', () => {
    for (const p of M.presetsFor('fieldgoal')) expect(run('fieldgoal', p.id).read.cross.y - bar, p.id).toBeLessThan(2);
    expect(source).toContain('var next = Object.assign({}, prev.throwlab, { windMph: 0, windDirDeg: 0 }, defaults, {');
    expect(M.MODES.fieldgoal.defaultPreset).toBe('chipshot');
  });
});

describe('fix this miss: one per sport', () => {
  for (const mode of MODES) {
    it(mode + ': the loaded setup just misses and one change fixes it', () => {
      const miss = M.fixMissSetup(mode);
      expect(miss).toBeTruthy();
      const r = M.evaluateThrow(miss);
      expect(M.isMakeOutcome(r.location), mode + ' gave ' + r.location).toBe(false);
      expect(r.whereText.length).toBeGreaterThan(20);
      // it is the sport's first preset with only the speed moved
      const base = setupFor(mode, M.MODES[mode].defaultPreset);
      expect(M.setupChanges(Object.assign({ flutterSeed: 1 }, base), miss)).toEqual(['speed']);
      // "by a little": a make is within three steps of the speed slider
      const step = M.MODES[mode].speedStep || 1;
      const near = [1, 2, 3].some((k) => [-1, 1].some((dir) => M.isMakeOutcome(M.evaluateThrow(Object.assign({}, miss, { speedMph: miss.speedMph + dir * k * step })).location)));
      expect(near, mode).toBe(true);
    });
  }

  it('is judged by how many controls were changed', () => {
    const miss = M.fixMissSetup('freethrow');
    const fm = { mode: 'freethrow', setup: miss, tried: false, done: false };
    expect(M.judgeFixMiss(fm, miss, false).event).toBe('tried');
    const oneChange = Object.assign({}, miss, { speedMph: 16.5 });
    const fixed = M.judgeFixMiss(fm, oneChange, M.isMakeOutcome(M.evaluateThrow(oneChange).location));
    expect(fixed.event).toBe('fixed');
    expect(fixed.state.done).toBe(true);
    expect(fixed.state.fixedBy).toBe('speed');
    const twoChanges = Object.assign({}, miss, { speedMph: 16.5, spinRpm: 200 });
    expect(M.judgeFixMiss(fm, twoChanges, true).event).toBe('toomany');
    expect(M.judgeFixMiss(fm, twoChanges, true).state.done).toBe(false);
    expect(M.judgeFixMiss(fm, Object.assign({}, miss, { speedMph: 15 }), false).event).toBe('stillmiss');
    expect(source).toContain("'data-throwlab-load-miss': 'true'");
  });
});

describe('each skill tier has a question the model checks', () => {
  const call = { called: true, matched: true, bucket: 'target' };
  const step = (quest, prog, mode, id, over, c) => { const s = setupFor(mode, id, over); return M.advanceQuest(quest, prog, s, M.evaluateThrow(s), c || { called: false }); };

  it('no question is answered by one press of an untouched preset', () => {
    for (const mode of MODES) for (const tier of [1, 2, 3, 4]) for (const p of M.presetsFor(mode)) {
      const done = step(M.questFor(mode, tier), null, mode, p.id, null, call).done;
      expect(!!done, mode + ' tier ' + tier + ' ' + p.id).toBe(false);
    }
  });

  it('every sport and tier has a question in plain words', () => {
    for (const mode of MODES) for (const tier of [1, 2, 3, 4]) {
      const text = M.questText(M.questFor(mode, tier));
      expect(text.startsWith(M.TIER_NAMES[tier] + ' question: '), text).toBe(true);
    }
  });

  it('Rookie: the slowest speed that still scores has to be found and proved', () => {
    for (const mode of MODES) {
      const quest = M.questFor(mode, 1), def = M.MODES[mode].defaultPreset, sz = M.MODES[mode].speedStep || 1;
      const answer = M.slowestMake(setupFor(mode, def));
      expect(M.isMakeOutcome(run(mode, def, { speedMph: answer }).location), mode).toBe(true);
      expect(M.isMakeOutcome(run(mode, def, { speedMph: answer - sz }).location), mode).toBe(false);
      let prog = step(quest, null, mode, def);                                   // the preset scores
      expect(!!prog.done, mode).toBe(false);
      prog = step(quest, prog, mode, def, { speedMph: answer });                 // found it, not proved yet
      expect(!!prog.done, mode + ' done without the miss below').toBe(false);
      prog = step(quest, prog, mode, def, { speedMph: answer - sz });            // one step slower misses
      expect(prog.done, mode).toBe(true);
      expect(prog.answer).toBe(answer);
    }
  });

  it('Pro: two launch angles at one speed (or the sport\'s own two ways)', () => {
    // free throw: a low arc and a high arc at 17 mph
    const q = M.questFor('freethrow', 2);
    const makes = [];
    for (let a = 35; a <= 70; a += 1) if (M.isMakeOutcome(run('freethrow', 'freethrow', { speedMph: 17, aimDegV: a }).location)) makes.push(a);
    expect(makes[makes.length - 1] - makes[0]).toBeGreaterThanOrEqual(q.gap);
    let prog = step(q, null, 'freethrow', 'freethrow', { speedMph: 17, aimDegV: makes[0] });
    expect(!!prog.done).toBe(false);
    expect(!!step(q, prog, 'freethrow', 'freethrow', { speedMph: 17, aimDegV: makes[0] }).done).toBe(false);          // same angle twice
    expect(!!step(q, prog, 'freethrow', 'freethrow', { speedMph: 16.5 }).done).toBe(false);                            // a different speed
    expect(step(q, prog, 'freethrow', 'freethrow', { speedMph: 17, aimDegV: makes[makes.length - 1] }).done).toBe(true);
    // baseball: a slow strike needs a new aim
    const qp = M.questFor('pitching', 2), cap = M.findPreset('pitching', '4seam').speedMph - qp.below;
    expect(run('pitching', '4seam', { speedMph: cap }).location).not.toBe('strike');
    expect(!!step(qp, null, 'pitching', '4seam', { speedMph: cap }).done).toBe(false);
    expect(step(qp, null, 'pitching', '4seam', { speedMph: cap, aimDegV: -1 }).done).toBe(true);
    // cricket: with a bounce and with a full toss, at one speed
    const qb = M.questFor('bowling', 2);
    prog = step(qb, null, 'bowling', 'fast');
    expect(!!prog.done).toBe(false);
    expect(!!step(qb, prog, 'bowling', 'fast', { aimDegV: -3, speedMph: 88 }).done).toBe(false);
    expect(step(qb, prog, 'bowling', 'fast', { aimDegV: -3 }).done).toBe(true);
  });

  it('All-Star: each sport\'s question can be answered with the controls that tier unlocks', () => {
    const answers = {
      pitching: [['slider', { spinRpm: 3500, aimDegH: -2.4, aimDegV: -1 }]],
      freekick: [['curling', { spinRpm: 1200, aimDegH: -15, aimDegV: 20, speedMph: 55 }]],
      bowling: [['legspin', { spinRpm: 3000, speedMph: 46, aimDegV: -1, aimDegH: 0 }]],
      golf: [['driver', { spinRpm: 6000, speedMph: 148, aimDegV: 8 }]],
      volleyball: [['jump', { spinRpm: 2000, speedMph: 80, aimDegV: 10 }]],
      fieldgoal: [['long', { windMph: 20, windDirDeg: 0, speedMph: 80, aimDegV: 34 }]],
      freethrow: [['freethrow', null], ['freethrow', { speedMph: 17.25 }]],
    };
    for (const mode of MODES) {
      const quest = M.questFor(mode, 3);
      let prog = null;
      for (const [id, over] of answers[mode]) prog = step(quest, prog, mode, id, over);
      expect(prog.done, mode + ' ' + quest.type).toBe(true);
    }
    // the spin questions ask for more than any preset gives
    for (const mode of MODES) {
      const quest = M.questFor(mode, 3);
      if (quest.type !== 'spinMove') continue;
      for (const p of M.presetsFor(mode)) {
        const v = M.spinMeasure(quest, run(mode, p.id));
        if (typeof v === 'number') expect(v, mode + '/' + p.id).toBeLessThan(quest.min);
      }
    }
  });

  it('Hall of Fame: three correct calls in a row, on different setups, one of them a predicted miss', () => {
    const q = M.questFor('pitching', 4);
    let prog = step(q, null, 'pitching', '4seam', null, call);
    prog = step(q, prog, 'pitching', '4seam', null, call);                       // the same setup again does not count
    expect(prog.run.length).toBe(1);
    prog = step(q, prog, 'pitching', '4seam', { speedMph: 93 }, call);
    prog = step(q, prog, 'pitching', '4seam', { speedMph: 94 }, call);
    expect(prog.run.length).toBe(3);
    expect(!!prog.done).toBe(false);                                              // three easy strikes are not enough
    const wrong = step(q, prog, 'pitching', '4seam', { speedMph: 60 }, { called: true, matched: false, bucket: 'off' });
    expect(wrong.run.length).toBe(0);                                             // a wrong call starts over
    expect(step(q, prog, 'pitching', '4seam', { speedMph: 60 }, { called: true, matched: true, bucket: 'off' }).done).toBe(true);
    expect(!!step(q, prog, 'pitching', '4seam', { speedMph: 60 }, { called: false }).done).toBe(false);
  });

  it('free play is untouched and nothing is shown while the ball is in the air', () => {
    expect(source).toContain("status = tlInFlight ? __alloT('stem.throwlab.challenge_watching', 'Watching this throw...') : questStatus(quest, prog);");
    expect(source).toContain('}, revealMs + 700 + ci * 500, 700 + ci * 500);');
    // the answer to the Rookie question is only printed once it has been found
    expect(source).toContain("if (p.done) return 'Answered: ' + mph(p.answer) + ' is the slowest. One step slower misses.';");
  });
});

describe('small fixes that came with round 2', () => {
  it('skipping the replay is the reveal, and a press mid-flight never throws again', () => {
    expect(source).toContain('function flushRevealQueue()');
    expect(source).toContain('if (d.replayActive) { skipReplayToResult(); return; }');
    expect(source).toContain('if (Date.now() - (_tlSkipAt.current || 0) < 450) return;');
    expect(source).toContain('if (d.replayActive) skipReplayToResult(); else throwPitch();');
    expect(source).not.toContain("'Replay in progress...'");
  });

  it('canvas labels are drawn at 12 px on screen whatever the canvas width', () => {
    expect(source).toContain("function tlFont(px, weight) { return (weight ? weight + ' ' : '') + Math.round(Math.max(12, px) * lk) + 'px system-ui, sans-serif'; }");
    for (const old of ["gfx.font = '11px system-ui';", "gfx.font = '9px system-ui';", "gfx.font = '10px system-ui';", "gfx.font = 'bold 10px system-ui';"]) expect(source).not.toContain(old);
    expect(source).toContain('d.windMph, d.windDirDeg, d.gravityId, tlViewTick');
  });

  it('the golf label under the picture names the flag the model uses', () => {
    expect(source).toContain("gfx.fillText(Math.round(golfTargetZ / 0.9144) + ' yd target →',");
    expect(source).not.toContain("displayTrial.shotKind === 'iron' ? 150");
  });

  it('a free kick that lands before the line is described as landing, not as hitting the frame', () => {
    // Leftovers round: a kick that bounces and then crosses the line is judged at the line, so one mph under
    // the slowest make now meets the wall. A slow kick aimed wide of the wall stops before the line.
    // Final round: after landing, a low kick now rolls; this one stops on the grass before the line.
    // Follow-up round: a shallow hop now costs little speed, so that low 25 mph kick rolls in. A 25 mph chip
    // lands steeply, loses more at each bounce, and stops before the line.
    const r = run('freekick', 'chip', { speedMph: 25 });
    expect(r.location).toBe('short');
    expect(r.whereText).toMatch(/landed .* before the goal line, rolled, and stopped .* short of it/);
  });

  it('famous scenarios keep the preset aim, and saved scenarios keep the whole setup', () => {
    // A built-in scenario used to load with left/right aim reset to 0. Mariano's Cutter (the slider,
    // aimed a little to the side so the break brings it back) then just missed the zone.
    expect(run('pitching', 'slider').location).toBe('strike');
    expect(run('pitching', 'slider', { aimDegH: 0 }).location).not.toBe('strike');
    expect(source).toContain('aimDegH: (useSavedAim && s.aimDegH != null) ? s.aimDegH : (preset.aimDegH || 0),');
    expect(source).toContain('v: 2, speedMph: d.speedMph, spinRpm: d.spinRpm, spinAxisDeg: d.spinAxisDeg,');
    expect(source).toContain('if (s.custom && !s.v) {');
    expect(source).toContain("stem.throwlab.stale_scenario_updated");
  });

  it('the trading card draws the whole flight and the coach is given the measured sentence', () => {
    expect(source).not.toContain('(lr.samples || []).slice(0, 60)');
    expect(source).toContain('var cardStep = Math.max(1, Math.ceil(allSamples.length / 60));');
    expect(source).toContain('What the simulator measured (use these numbers and do not invent others): ');
  });

  it('a volleyball ace can be reached by aiming at the corner', () => {
    // The ace zone starts 3.15 m from the center line, 16.65 m away: about 10.7 degrees off line.
    // The aim slider used to stop at 5 degrees, so the ace drill, badge and record were out of reach.
    const mm = M.MODES.volleyball;
    const needDeg = Math.atan((mm.courtHalfWidth * 0.7) / (mm.targetZ - (mm.targetZ - mm.netZ) * 0.15)) * 180 / Math.PI;
    expect(mm.aimHRange[1]).toBeGreaterThan(needDeg);
    expect(mm.aimHRange[0]).toBeLessThan(-needDeg);
    expect(run('volleyball', 'topspin', { aimDegH: 10, speedMph: 56, aimDegV: 14 }).location).toBe('ace');
  });

  it('a repeat of the same throw is not new evidence for a drill or a streak badge', () => {
    expect(source).toContain('var repeatOfLast = throwKey === d.lastThrowKey;');
    expect(source).toContain('lastThrowKey: throwKey,');
    expect(source).toContain("test: function(s) { return (s.vStrikeStreak || 0) >= 3; },");
    expect(source).toContain("check: function(d, lr, stats) { return (stats.variedStreak || 0) >= 10; } },");
    for (const old of ['return s.streakStrikes >= 3;', 'return s.makeCount >= 5;', 'return s.totalGoals >= 3;', "(stats.hotStreak || 0) >= 25"]) expect(source).not.toContain(old);
  });

  it('phone and fullscreen: 3D labels make room for each other, the picture fills the fullscreen frame', () => {
    expect(source).toContain('function placeLabel(x, y, text, color, px, align) {');
    expect(source).toContain("if (top === null) { gfx.restore(); return; }");
    expect(source).not.toContain("gfx.font='700 11px system-ui, sans-serif';gfx.textAlign='center';gfx.fillText(label,p[0],p[1]-7)");
    expect(source).toContain('[data-throwlab-canvas]{width:min(100%,calc(62vh * 16 / 9))!important;max-width:none!important');
    expect(source).toContain(".theme-contrast [data-throwlab-root] button[data-throwlab-launch]{background:#00ff00!important;color:#000000!important");
  });

  it('drills and badges ask for what they say', () => {
    expect(source).toContain("if (d.shotType === 'halfcourt' && (loc === 'rim' || loc === 'backboard' || loc === 'made' || loc === 'swish')) {");
    // the curl badge is not earned by the untouched Curling Shot, and three preset badges need a call first
    expect(Math.abs(run('freekick', 'curling').read.spinShift.side)).toBeLessThan(3.5);
    expect(source).toContain("d.pitchType === 'slider' && !!d.predictionKey");
    expect(source).toContain("d.pitchType === 'knuckle' && !!d.predictionKey");
    expect(source).toContain("d.golfClub === 'wedge' && !!d.predictionKey");
    // scenario and drill numbers that the model no longer produced
    expect(Math.abs(run('freethrow', 'floater').read.apex - num(M.SCENARIOS.find((s) => s.id === 'parker-floater').questions[1], /peaks near ([\d.]+) m/))).toBeLessThan(0.1);
    const head = run('fieldgoal', 'hailmary', { windMph: 15, windDirDeg: 0 });
    const t = M.SCENARIOS.find((s) => s.id === 'headwind-hailmary').teach;
    expect(Math.abs(num(t, /(\d+) yards short of the posts/) - (60 - head.read.land.z / YD))).toBeLessThan(0.6);
    expect(Math.abs(num(t, /tailwind it carries (\d+) yards/) - run('fieldgoal', 'hailmary').read.land.z / YD)).toBeLessThan(0.6);
  });
});
