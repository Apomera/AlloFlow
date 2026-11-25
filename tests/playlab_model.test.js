// Play Lab: the play model, the verdicts and the numbers the tool prints.
//
// Before 2026-11-23 four accessibility files pinned markup and nothing tested the model, while:
//  - "open" meant the distance from a route's END to a defender's STARTING spot. Defenders never
//    moved and time did not exist, so 114 of 128 play x coverage pairs were a certain catch,
//    0 were a certain stop, and the other 14 were a coin flip (Math.random).
//  - the matchup badge came from hand-written lists and disagreed with the result in 24 pairs
//    ("Tough match", then a guaranteed completion; Hail Mary into four deep was always caught).
//  - two-leg routes were summed leg on leg, so a "comeback at 12" ended 22 yards deep; the Mesh
//    and Drive crossers ran 9 and 5 yards out of bounds and were then reported "most open".
//  - expected points did not match its own calibration table, and yards gained were measured
//    from a fixed x = 35 whatever the line of scrimmage was.
//  - soccer: concepts named positions the formation did not have, so the default setup ended
//    with nobody and showed xG 0.00; no setup could reach any reward threshold.
// Every check here runs the tool's own functions (window.StemLab.PlayLabModel).
//
// PLAYLAB_FILE=<path> points the suite at another copy of the tool (used once to confirm the
// suite goes red on the pre-fix file, which exports no model at all).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const FILE = process.env.PLAYLAB_FILE || 'stem_lab/stem_tool_playlab.js';
const source = readFileSync(FILE, 'utf8');

function loadModel() {
  const win = { addEventListener() {}, removeEventListener() {}, matchMedia: () => ({ matches: false }) };
  const doc = {
    getElementById: () => null,
    createElement: () => ({ setAttribute() {}, appendChild() {}, style: {} }),
    head: { appendChild() {} }, body: { appendChild() {} }, addEventListener() {},
    documentElement: { classList: { contains: () => false } },
  };
  win.document = doc; win.window = win;
  const ctx = vm.createContext({ window: win, document: doc, console: { log() {}, warn() {}, error() {} }, setTimeout, clearTimeout, navigator: {}, localStorage: { getItem: () => null, setItem() {} } });
  vm.runInContext(source, ctx, { filename: 'stem_tool_playlab.js' });
  return win.StemLab && win.StemLab.PlayLabModel;
}

const M = loadModel();
const K = M ? M.constants : {};
const PLAYS = M ? M.plays : [];
const COVS = M ? M.coverages : [];
const sim = (playId, coverageId, extra) => M.simulate(Object.assign({ playId, coverageId }, extra || {}));
const readOf = (s, id) => s.reads.find((r) => r.id === id);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const pairs = () => PLAYS.flatMap((p) => COVS.map((c) => [p.id, c.id]));

describe('Play Lab exports ONE model', () => {
  it('exposes the functions the screen uses', () => {
    expect(M, 'window.StemLab.PlayLabModel').toBeTruthy();
    for (const fn of ['simulate', 'frameAt', 'gradeMatchup', 'camera', 'fieldMap', 'expectedPoints', 'computeEPA']) {
      expect(typeof M[fn], fn).toBe('function');
    }
    expect(PLAYS.length).toBe(16);
    expect(COVS.length).toBe(8);
  });

  it('has no second, separate "who is open" function left in the file', () => {
    expect(source).not.toContain('function openReceiverAnalysis');
    expect(source).not.toContain('function pickThrowTarget');
  });

  it('is deterministic: no dice in the result', () => {
    const real = Math.random;
    let calls = 0;
    Math.random = () => { calls += 1; return 0.5; };
    try {
      for (const [p, c] of pairs()) {
        const a = sim(p, c, { targetId: 'SLOT' }), b = sim(p, c, { targetId: 'SLOT' });
        expect(JSON.stringify(a.outcome)).toBe(JSON.stringify(b.outcome));
      }
    } finally { Math.random = real; }
    expect(calls).toBe(0);
  });
});

describe('routes are drawn where the play says', () => {
  it('keeps every route point on the field, for every play', () => {
    for (const p of PLAYS) {
      for (const pl of M.buildOffense(p, 35, {})) {
        for (const pt of pl.route || []) {
          expect(pt.y, p.id + ' ' + pl.id + ' y').toBeGreaterThanOrEqual(0);
          expect(pt.y, p.id + ' ' + pl.id + ' y').toBeLessThanOrEqual(53.33);
          expect(pt.x, p.id + ' ' + pl.id + ' x').toBeGreaterThan(0);
          expect(pt.x, p.id + ' ' + pl.id + ' x').toBeLessThan(120);
        }
      }
    }
  });

  it('treats each waypoint as an offset from the snap spot, not from the last waypoint', () => {
    const off = (playId, id) => {
      const pl = M.buildOffense(PLAYS.find((p) => p.id === playId), 35, {}).find((q) => q.id === id);
      const end = pl.route[pl.route.length - 1];
      return { deep: end.x - pl.x, wide: end.y - pl.y };
    };
    expect(off('bootleg', 'WR1').deep, 'a comeback at 12 comes BACK to 10').toBeCloseTo(10, 5);
    expect(off('mesh', 'WR1').deep, 'a dig at 14 stays at 14').toBeCloseTo(14, 5);
    expect(off('fourverts', 'SLOT').deep, 'the slot bends to a post at 22, not 34').toBeCloseTo(22, 5);
  });

  it('makes the Mesh crossers cross, and the Smash corner break to the near sideline', () => {
    const o = M.buildOffense(PLAYS.find((p) => p.id === 'mesh'), 35, {});
    const slot = o.find((q) => q.id === 'SLOT'), te = o.find((q) => q.id === 'TE');
    const end = (q) => q.route[q.route.length - 1];
    expect(Math.sign(slot.y - te.y)).toBe(-Math.sign(end(slot).y - end(te).y));
    const s = M.buildOffense(PLAYS.find((p) => p.id === 'smash'), 35, {}).find((q) => q.id === 'SLOT');
    expect(end(s).y, 'the slot starts near the left sideline and breaks toward it').toBeGreaterThan(s.y);
  });

  it('lines the Trips Bunch up as a bunch: three receivers within 6 yards of each other', () => {
    const o = M.buildOffense(PLAYS.find((p) => p.id === 'trips'), 35, {});
    const ys = ['WR1', 'SLOT', 'TE'].map((id) => o.find((q) => q.id === id).y);
    expect(Math.max(...ys) - Math.min(...ys)).toBeLessThanOrEqual(6);
  });

  it('lets a moved player win over the play alignment, and carries the route with him', () => {
    const o = M.buildOffense(PLAYS.find((p) => p.id === 'trips'), 35, { WR1: { x: 35, y: 30 } });
    const w = o.find((q) => q.id === 'WR1');
    expect(w.y).toBe(30);
    expect(w.route[0]).toEqual({ x: 35, y: 30 });
  });
});

describe('the two races: distance = speed x time', () => {
  it('times every route and every throw from its length and the stated speeds', () => {
    for (const [p, c] of pairs()) {
      const s = sim(p, c);
      if (s.isRun) continue;
      for (const r of s.reads) {
        expect(r.routeT, p + '/' + c + ' ' + r.id + ' route time').toBeCloseTo(r.routeYd / K.SPEED[r.role], 9);
        expect(r.flight, 'flight').toBeCloseTo(r.throwYd / K.BALL_SPEED, 9);
        expect(r.release, 'the ball cannot leave before the snap-to-throw time').toBeGreaterThanOrEqual(K.SNAP_TO_THROW - 1e-9);
        expect(r.catchT).toBeCloseTo(r.release + r.flight, 9);
        expect(r.catchT, 'the ball never arrives before the receiver').toBeGreaterThanOrEqual(r.routeT - 1e-9);
        expect(r.sacked).toBe(r.release > s.pocket + 1e-9);
        expect(r.open).toBe(!r.sacked && r.gapYd >= K.OPEN_YD);
      }
    }
  });

  it('gives the verdict the read says, for every play, defense and target', () => {
    for (const [p, c] of pairs()) {
      const base = sim(p, c);
      for (const r of base.reads) {
        const o = sim(p, c, { targetId: r.id }).outcome;
        expect(o, p + '/' + c + ' ' + r.id).toBeTruthy();
        if (r.run) {
          expect(o.type).toBe('run');
          expect(o.yards).toBe(r.yards);
        } else if (r.sacked) {
          expect(o.type).toBe('sack');
          expect(o.yards).toBe(-K.SACK_LOSS);
          expect(o.endT).toBe(base.pocket);
        } else if (r.open) {
          expect(o.type).toBe('complete');
          expect(o.yards).toBe(r.yards);
          expect(o.yards).toBe(Math.round(r.spot.x - base.losX));
        } else {
          expect(o.type).toBe('brokenup');
          expect(o.yards).toBe(0);
        }
        expect(o.firstDown).toBe((o.type === 'complete' || o.type === 'run') && o.yards >= K.FIRST_DOWN);
      }
    }
  });

  it('draws what it decided: at the catch the nearest defender stands exactly the gap away', () => {
    for (const [p, c] of pairs()) {
      const base = sim(p, c);
      if (base.isRun) continue;
      for (const r of base.reads) {
        if (r.sacked) continue;
        const s = sim(p, c, { targetId: r.id });
        const f = M.frameAt(s, r.catchT);
        const rcv = f.offense.find((q) => q.id === r.id);
        expect(dist(rcv, r.spot), 'receiver at the catch spot').toBeLessThan(1e-6);
        const gaps = f.defenders.filter((d) => d.mode !== 'rush').map((d) => dist(d, r.spot));
        expect(Math.min(...gaps), p + '/' + c + ' ' + r.id).toBeCloseTo(r.gapYd, 6);
        expect(f.ball.held).toBe(false);
        expect(dist(f.ball, r.spot)).toBeLessThan(1e-6);
      }
    }
  });

  it('shows nothing of the throw before the release, and stops the clock at the result', () => {
    const s = sim('fourverts', 'cover2', { targetId: 'TE' });
    expect(M.frameAt(s, s.read.release - 0.05).ball).toBe(null);
    expect(M.frameAt(s, 99).t).toBeCloseTo(s.read.catchT, 9);
    const sack = sim('hailmary', 'cover0', { targetId: 'WR1' });
    expect(M.frameAt(sack, 99).t).toBeCloseTo(sack.pocket, 9);
    expect(M.frameAt(sack, 99).ball, 'a sacked quarterback never throws').toBe(null);
  });

  it('a zone defender waits one reaction, then closes at his running speed', () => {
    const s = sim('fourverts', 'cover2', { targetId: 'TE' });
    const n = s.read.nearest;
    expect(n.mode).toBe('zone');
    const closed = K.DEF_SPEED * Math.max(0, s.read.flight - K.REACT);
    expect(n.closed).toBeCloseTo(Math.min(n.startGap, closed), 6);
    expect(s.read.gapYd).toBeCloseTo(Math.max(0, n.startGap - closed), 6);
  });

  it('a man defender is a step late: the cut on a slant leaves him behind', () => {
    // Cover 0 presses (1.5 yd off), so the gap is not a head start: it is the 0.3 s lag.
    const s = sim('slant', 'cover0', { targetId: 'SLOT' });
    expect(s.read.nearest.mode).toBe('man');
    expect(s.read.nearest.assign).toBe('SLOT');
    expect(s.read.open).toBe(true);
    // With no reaction delay the defender stays on him and the same throw is covered.
    const keep = K.REACT;
    try {
      K.REACT = 0;
      const noLag = sim('slant', 'cover0', { targetId: 'SLOT' }).read;
      expect(noLag.gapYd).toBeLessThan(s.read.gapYd);
      expect(noLag.open).toBe(false);
    } finally { K.REACT = keep; }
  });

  it('a man defender closes on a receiver who stands waiting for a late ball', () => {
    // W1 runs 12 yards and stops; the ball needs about 1.4 s to get out there.
    const s = sim('slant', 'cover1', { targetId: 'WR1' });
    expect(s.read.catchT).toBeGreaterThan(s.read.routeT + K.REACT);
    const atStop = dist(M.frameAt(s, s.read.routeT + K.REACT).defenders.find((d) => d.id === 'CB1'), s.read.spot);
    expect(s.read.gapYd).toBeLessThan(atStop);
  });

  it('the pocket race: six rushers leave 2 seconds, four leave 3.5', () => {
    expect(M.pocketTime('cover0')).toBe(2);
    for (const c of COVS) if (c.id !== 'cover0') expect(M.pocketTime(c.id), c.id).toBe(3.5);
    const rushers = (cid) => sim('slant', cid).defenders.filter((d) => d.role === 'DL' || d.mode === 'rush').length;
    expect(rushers('cover0')).toBe(6);
    expect(rushers('cover2')).toBe(4);
    const s = sim('hailmary', 'cover0', { targetId: 'WR1' });
    expect(s.read.release).toBeGreaterThan(s.pocket);
    expect(s.outcome.type).toBe('sack');
    expect(s.outcome.success).toBe(false);
  });

  it('deep zone defenders stay on top: a Hail Mary into four deep is not a free catch', () => {
    const s = sim('hailmary', 'cover4');
    for (const id of ['WR1', 'WR2', 'SLOT', 'TE']) expect(readOf(s, id).open, id).toBe(false);
  });

  it('four verticals splits two deep safeties up the seam, and three deep close it', () => {
    expect(readOf(sim('fourverts', 'cover2'), 'TE').open).toBe(true);
    expect(readOf(sim('fourverts', 'cover3'), 'TE').open).toBe(false);
    expect(readOf(sim('fourverts', 'tampa2'), 'TE').open).toBe(false);
  });
});

describe('run plays: blockers, then a race to the path', () => {
  const runs = ['wildcat', 'counter', 'sweep'];
  it('hands the ball to the back and never asks for a target', () => {
    for (const p of runs) {
      const s = sim(p, 'cover1');
      expect(s.isRun).toBe(true);
      expect(s.reads.length).toBe(1);
      expect(s.outcome.type).toBe('run');
      expect(s.outcome.receiverId).toBe('RB');
    }
  });

  it('stops the runner where a free defender gets to the path first', () => {
    for (const p of runs) for (const c of COVS) {
      const s = sim(p, c.id);
      const r = s.reads[0];
      expect(r.yards).toBe(Math.round(r.spot.x - s.losX));
      if (!r.tackled) continue;
      const tDef = K.HANDOFF + K.REACT + dist(r.tacklerStart, r.spot) / K.DEF_SPEED;
      expect(tDef, p + '/' + c.id + ' tackler is there in time').toBeLessThanOrEqual(r.catchT + 1e-9);
      expect(r.blocked[r.tackler], 'a blocked defender cannot make the tackle').toBeUndefined();
      const f = M.frameAt(s, r.catchT);
      expect(dist(f.offense.find((q) => q.id === 'RB'), r.spot)).toBeLessThan(1e-6);
    }
  });

  it('gives different gains against different defenses (the run plays are not dead)', () => {
    for (const p of runs) {
      const gains = new Set(COVS.map((c) => sim(p, c.id).outcome.yards));
      expect(gains.size, p).toBeGreaterThanOrEqual(3);
      expect(Math.max(...gains), p + ' can gain a first down against something').toBeGreaterThanOrEqual(10);
    }
  });
});

describe('the matchup grade is the model, not a hand-written list', () => {
  it('grades from the best open read', () => {
    for (const [p, c] of pairs()) {
      const s = sim(p, c), g = M.gradeMatchup(p, c);
      const best = s.best;
      const want = !best ? 'tough' : best.yards >= K.FIRST_DOWN ? 'great' : best.yards >= 3 ? 'okay' : 'tough';
      expect(g.grade, p + '/' + c).toBe(want);
      if (best) { expect(g.bestId).toBe(best.id); expect(g.bestYards).toBe(best.yards); }
    }
  });

  it('is a real spread: every defense is beaten by some play and stops some other', () => {
    const tally = { great: 0, okay: 0, tough: 0 };
    for (const [p, c] of pairs()) tally[M.gradeMatchup(p, c).grade] += 1;
    expect(tally.great).toBeGreaterThanOrEqual(30);
    expect(tally.okay).toBeGreaterThanOrEqual(25);
    expect(tally.tough).toBeGreaterThanOrEqual(12);
    for (const c of COVS) {
      const grades = PLAYS.map((p) => M.gradeMatchup(p.id, c.id).grade);
      expect(grades.includes('great'), c.id + ' can be beaten').toBe(true);
      expect(grades.some((g) => g !== 'great'), c.id + ' stops something').toBe(true);
    }
  });

  it('makes the target matter: on most pass plays some receivers are open and some are not', () => {
    let mixed = 0, total = 0;
    for (const [p, c] of pairs()) {
      const s = sim(p, c);
      if (s.isRun) continue;
      total += 1;
      const open = s.reads.filter((r) => r.open).length;
      if (open > 0 && open < s.reads.length) mixed += 1;
    }
    expect(mixed / total).toBeGreaterThan(0.6);
  });
});

describe('the first screen and every mission work on the model\'s own numbers', () => {
  it('default setup (Slant against Cover 1): the slant itself is open', () => {
    const s = sim('slant', 'cover1', { targetId: 'SLOT' });
    expect(s.outcome.type).toBe('complete');
    expect(s.outcome.yards).toBe(9);
    expect(source).toContain("coverageId: 'cover1',");
  });

  it('every mission can be finished with the stock plays', () => {
    const beaten = COVS.filter((c) => PLAYS.some((p) => { const s = sim(p.id, c.id); return s.best && s.best.yards > 0; }));
    expect(beaten.length, 'defenses that can be beaten').toBe(8);
    expect(sim('smash', 'cover2').best.yards, 'Smash gets a first down on Cover 2').toBeGreaterThanOrEqual(10);
    expect(sim('smash', 'cover2').best.id, 'and it is the corner route that does it').toBe('SLOT');
    for (const p of ['slant', 'bubble', 'stick']) expect(sim(p, 'cover0').best, p + ' beats the blitz').toBeTruthy();
    expect(sim('trips', 'cover6').best).toBeTruthy();
    expect(sim('mesh', 'robber').best).toBeTruthy();
    const moved = sim('slant', 'cover1', { customPositions: { WR1: { x: 35, y: 8 }, WR2: { x: 35, y: 45 } } });
    expect(moved.best, 'a moved formation can still complete').toBeTruthy();
  });

  it('no mission is finished by doing nothing', () => {
    const empty = { coveragesBeaten: 0, completionsByPlay: {} };
    for (const t of M.drills().tasks) expect(!!t.test(empty), t.id).toBe(false);
    expect(M.drills().tasks.map((t) => t.id).slice(0, 3)).toEqual(['first-completion', 'first-down', 'best-read']);
  });

  it('a setup has one fingerprint, and moving a player changes it', () => {
    const a = M.setupSig('slant', 'cover1', 35, {});
    expect(M.setupSig('slant', 'cover1', 35, {})).toBe(a);
    expect(M.setupSig('slant', 'cover1', 35, { WR1: { x: 35, y: 9 } })).not.toBe(a);
    expect(M.setupSig('slant', 'cover2', 35, {})).not.toBe(a);
    expect(M.setupSig('slant', 'cover1', 36, {})).not.toBe(a);
  });
});

describe('the plain-word summaries say what the model does', () => {
  const zoneDefs = (cid) => sim('slant', cid).defenders.filter((d) => d.role !== 'DL' && d.mode !== 'rush' && !d.assign);
  const deep = (cid) => zoneDefs(cid).filter((d) => /^(Deep|MLB deep|Free safety)/.test(d.zoneName || '')).length;
  it('counts the defenders the sentences count', () => {
    expect([deep('cover2'), zoneDefs('cover2').length - deep('cover2')]).toEqual([2, 5]);
    expect([deep('cover3'), zoneDefs('cover3').length - deep('cover3')]).toEqual([3, 4]);
    expect([deep('cover4'), zoneDefs('cover4').length - deep('cover4')]).toEqual([4, 3]);
    expect(deep('tampa2')).toBe(3);
    expect(sim('slant', 'cover1').defenders.filter((d) => d.assign).length).toBe(5);
    expect(sim('slant', 'cover0').defenders.filter((d) => d.assign).length).toBe(5);
    expect(deep('cover1')).toBe(1);
    expect(M.simple.coverages.cover0).toContain('within ' + M.pocketTime('cover0') + ' seconds');
    expect(M.simple.coverages.cover0).toContain('six defenders rush');
  });

  it('has one sentence for every play and every defense', () => {
    for (const p of PLAYS) expect(M.simple.plays[p.id], p.id).toBeTruthy();
    for (const c of COVS) expect(M.simple.coverages[c.id], c.id).toBeTruthy();
  });

  it('never stacks two defenders on one spot (the padded hooks used to share one)', () => {
    for (const c of COVS) {
      const ds = sim('slant', c.id).defenders;
      for (let i = 0; i < ds.length; i += 1) for (let j = i + 1; j < ds.length; j += 1) {
        expect(dist(ds[i], ds[j]), c.id + ' ' + ds[i].id + '/' + ds[j].id).toBeGreaterThan(0.5);
      }
      expect(new Set(ds.map((d) => d.id)).size, c.id + ' ids unique').toBe(ds.length);
    }
  });
});

describe('expected points', () => {
  it('returns what its calibration table says', () => {
    const rows = [[75, 1, 1.3], [50, 1, 2.4], [25, 1, 4.7], [5, 1, 5.8], [1, 1, 5.9], [90, 3, 0.2]];
    for (const [ytg, down, want] of rows) expect(M.expectedPoints(ytg, down), ytg + '/' + down).toBeCloseTo(want, 1);
  });

  it('rises toward the goal line and falls on later downs', () => {
    for (let y = 98; y >= 1; y -= 1) expect(M.expectedPoints(y, 1)).toBeGreaterThan(M.expectedPoints(y + 1, 1));
    expect(M.expectedPoints(50, 2)).toBeLessThan(M.expectedPoints(50, 1));
    expect(M.expectedPoints(50, 2, 1), '2nd and 1 beats 2nd and 10').toBeGreaterThan(M.expectedPoints(50, 2, 10));
  });

  it('takes yards from the play result, wherever the ball was snapped', () => {
    const gain9 = M.computeEPA(75, 1, { yards: 9 });
    expect(gain9.yardsGained).toBe(9);
    expect(gain9.dEPA, 'a 9-yard gain on first down is good').toBeGreaterThan(0);
    expect(M.computeEPA(75, 1, { yards: 0 }).dEPA).toBeLessThan(0);
    expect(M.computeEPA(75, 1, { yards: -7 }).dEPA).toBeLessThan(M.computeEPA(75, 1, { yards: 0 }).dEPA);
    expect(M.computeEPA(75, 1, { yards: 14 }).dEPA).toBeGreaterThan(gain9.dEPA);
    expect(M.computeEPA(8, 1, { yards: 14 }).touchdown).toBe(true);
    // The same 14-yard catch from the 8 and from the 75 is 14 yards both times.
    expect(M.computeEPA(20, 1, { yards: 14 }).yardsGained).toBe(14);
  });
});

// Lead review, 2026-11-23: the Wildcat Goal-Line scenario (5 yards out) printed "RB runs for
// 7 yards. Touchdown!" and "a free defender reached the runner's path first, 7 yards past the
// line", and a man defender was drawn above the back of the end zone.
describe('the goal line ends the play', () => {
  const FIELD_LENGTH = 120, FIELD_WIDTH = 53.3, GOAL_X = 110;

  it('a run from the 5 scores after 5 yards, and is not "tackled" deeper in the end zone', () => {
    const s = sim('wildcat', 'cover1', { losX: 105 });
    expect(s.outcome.type).toBe('run');
    expect(s.outcome.touchdown).toBe(true);
    expect(s.outcome.yards).toBe(5);
    expect(s.read.scored).toBe(true);
    expect(s.read.tackled).toBe(false);
    expect(s.read.spot.x).toBeGreaterThanOrEqual(GOAL_X);
    expect(s.read.spot.x).toBeLessThan(GOAL_X + 0.5);
  });

  it('the same run from midfield is unchanged: no score, the model tackle stands', () => {
    const s = sim('wildcat', 'cover1');
    expect(s.read.scored).toBe(false);
    expect(s.outcome.touchdown).toBe(false);
  });

  it('no run or catch gains more yards than there are to the goal line', () => {
    for (const losX of [95, 100, 105, 108]) {
      for (const p of PLAYS) for (const c of COVS) {
        const s = sim(p.id, c.id, { losX });
        for (const r of s.reads) expect(r.yards, p.id + '/' + c.id + '/' + r.id + ' from ' + losX).toBeLessThanOrEqual(GOAL_X - losX);
      }
    }
  });

  it('every defender stays on the field for the whole play, at every ball spot', () => {
    for (const losX of [35, 95, 105, 108]) {
      for (const p of PLAYS) for (const c of COVS) {
        const s0 = sim(p.id, c.id, { losX });
        const target = s0.isRun ? undefined : (s0.reads[0] && s0.reads[0].id);
        const s = sim(p.id, c.id, { losX, targetId: target });
        for (let t = 0; t <= 6; t += 0.5) {
          for (const d of M.frameAt(s, t).defenders) {
            const tag = p.id + '/' + c.id + '/' + d.id + ' t=' + t + ' los=' + losX;
            expect(d.x, tag).toBeGreaterThanOrEqual(0);
            expect(d.x, tag).toBeLessThanOrEqual(FIELD_LENGTH);
            expect(d.y, tag).toBeGreaterThanOrEqual(0);
            expect(d.y, tag).toBeLessThanOrEqual(FIELD_WIDTH);
          }
        }
      }
    }
  });
});

describe('the picture: camera and yards-to-pixels map', () => {
  it('maps a field point to a pixel and back', () => {
    const s = sim('slant', 'cover1');
    for (const [W, H] of [[720, 400], [362, 272], [1200, 700]]) {
      const map = M.fieldMap(W, H, M.camera(s));
      for (const pt of [{ x: 35, y: 4 }, { x: 44, y: 38.33 }, { x: 30, y: 26.67 }]) {
        const back = map.toField(map.px(pt.y), map.py(pt.x));
        expect(back.x).toBeCloseTo(pt.x, 6);
        expect(back.y).toBeCloseTo(pt.y, 6);
      }
    }
  });

  it('puts the offense at the bottom, downfield up, the left sideline on the left', () => {
    const map = M.fieldMap(720, 400, M.camera(sim('slant', 'cover1')));
    expect(map.py(45)).toBeLessThan(map.py(35));
    expect(map.px(53.33)).toBeLessThan(map.px(0));
  });

  it('keeps every player, defender and route inside the canvas, desktop and phone', () => {
    for (const [W, H] of [[720, 400], [362, 272]]) {
      for (const [p, c] of pairs()) {
        const s = sim(p, c);
        const map = M.fieldMap(W, H, M.camera(s));
        const pts = [];
        s.offense.forEach((q) => { pts.push(q); (q.route || []).forEach((r) => pts.push(r)); });
        s.defenders.forEach((q) => pts.push(q));
        for (const pt of pts) {
          expect(map.px(pt.y), p + '/' + c).toBeGreaterThanOrEqual(0);
          expect(map.px(pt.y)).toBeLessThanOrEqual(W);
          expect(map.py(pt.x)).toBeGreaterThanOrEqual(28);
          expect(map.py(pt.x)).toBeLessThanOrEqual(H);
        }
      }
    }
  });

  it('is big enough to read: at least 6 px per yard on a 362 px phone canvas, 9 on desktop', () => {
    const s = sim('slant', 'cover1');
    expect(M.fieldMap(362, 272, M.camera(s)).s).toBeGreaterThanOrEqual(6);
    expect(M.fieldMap(720, 400, M.camera(s)).s).toBeGreaterThanOrEqual(9);
  });
});

// Soccer moved to its own suite in round 2 (tests/playlab_soccer_model.test.js): the round-1
// one-shot rule pinned here (shooter = the receiver nearest goal, xG cut by a quarter per
// defender within 8 m, default setup 0.112) was replaced by the move model (runs, pass timing,
// offside at the pass, cut-outs, the run at goal). Only the xG curve itself is unchanged.
describe('soccer: the xG curve', () => {
  const S = M ? M.soccer() : null;
  it('an open-play shot from the penalty spot is about 0.3, as the model note says', () => {
    expect(S.computeXG(105 - 11, 34)).toBeCloseTo(0.32, 2);
    expect(source).not.toContain('≈ 0.76 xG');
  });
});
