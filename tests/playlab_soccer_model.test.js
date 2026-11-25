// Play Lab soccer: the move model behind the pitch, the verdict, the film room, the Scout map
// and the missions (window.StemLab.PlayLabModel.soccer()).
//
// Before 2026-11-23 (round 2) soccer was one shot rule: 10 of 13 moves ended with the same
// striker, nobody ran, there was no offside, passes took no time and could not be cut out,
// the Scout grades were hand-written lists, and the offside-trap shape stood its midfield and
// forwards BEHIND its own back line. Every check here runs the tool's own functions.
//
// PLAYLAB_FILE=<path> points the suite at another copy (the round-1 copy has no move model,
// so nearly every test here goes red on it).
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
const S = M && M.soccer ? M.soccer() : {};
const K = S.constants || {};
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const combos = () => (S.formations || []).flatMap((f) => S.concepts.flatMap((c) => S.shapes.map((sh) => [f.id, c.id, sh.id])));
const secondLast = (defs) => defs.map((d) => d.x).sort((a, b) => b - a)[1];
const atPassDefs = (m) => m.defenders.map((d) => (m.trap && d.role === 'DEF' ? { ...d, x: d.x - K.TRAP_STEP } : d));

describe('soccer exports ONE move model', () => {
  it('exposes the functions the pitch uses', () => {
    for (const fn of ['move', 'frameAt', 'grade', 'camera', 'pitchMap', 'computeXG']) expect(typeof S[fn], fn).toBe('function');
    expect(S.formations.length).toBe(5);
    expect(S.concepts.length).toBe(13);
    expect(S.shapes.length).toBe(4);
    expect(source).not.toContain('function plSoccerShot');
  });

  it('is deterministic: no dice', () => {
    const real = Math.random;
    let calls = 0;
    Math.random = () => { calls += 1; return 0.5; };
    try {
      for (const [f, c, sh] of combos()) {
        const a = S.move(f, c, sh, null), b = S.move(f, c, sh, null);
        expect(a.reads.map((r) => r.type + r.xG)).toEqual(b.reads.map((r) => r.type + r.xG));
      }
    } finally { Math.random = real; }
    expect(calls).toBe(0);
  });

  it('every formation can play every move: stand-ins fill missing positions, and there is a choice', () => {
    for (const [f, c, sh] of combos()) {
      const m = S.move(f, c, sh, null);
      const ids = m.attackers.map((p) => p.id);
      expect(ids, f + '/' + c).toContain(m.passer.id);
      for (const [a, b] of m.build) { expect(ids).toContain(a); expect(ids).toContain(b); expect(a).not.toBe(b); }
      if (c === 'penalty') expect(m.reads.length).toBe(1);
      else expect(m.reads.length, f + '/' + c).toBeGreaterThanOrEqual(2);
      for (const r of m.reads) {
        expect(['shot', 'cut', 'offside']).toContain(r.type);
        expect(ids).toContain(r.runnerId);
      }
    }
  });

  it('moves no longer all end with the same striker', () => {
    const runners = new Set();
    for (const c of S.concepts) for (const r of S.move('433', c.id, 'midblock', null).reads) runners.add(r.runnerId);
    expect(runners.size).toBeGreaterThanOrEqual(7);
    const bests = new Set(S.concepts.map((c) => (S.move('433', c.id, 'midblock', null).best || {}).runnerId).filter(Boolean));
    expect(bests.size).toBeGreaterThanOrEqual(4);
  });
});

describe('the three races, in meters and seconds', () => {
  it('a pass takes time: flight = distance / ball speed, and the runner runs at a stated speed', () => {
    for (const [f, c, sh] of combos()) {
      const m = S.move(f, c, sh, null);
      for (const r of m.reads) {
        if (r.direct) continue;
        expect(r.runM).toBeCloseTo(dist(r.start, r.to), 9);
        expect(r.runT).toBeCloseTo(r.runM / K.RUN, 9);
        expect(r.passM).toBeCloseTo(dist(m.passer, r.to), 9);
        expect(r.flight).toBeCloseTo(r.passM / (r.air ? K.AIR : K.BALL), 9);
        expect(r.catchT).toBeCloseTo(r.release + Math.max(r.flight, r.runT - r.release), 9);
        expect(r.release).toBeGreaterThanOrEqual(0);
        if (r.crossT != null) expect(r.release).toBeLessThanOrEqual(r.crossT + 1e-9);
      }
    }
  });

  it('offside is judged when the pass is played, against the second-last defender', () => {
    let offsides = 0, onside = 0;
    for (const [f, c, sh] of combos()) {
      const m = S.move(f, c, sh, null);
      for (const r of m.reads) {
        if (r.direct) continue;
        const line = secondLast(atPassDefs(m));
        expect(r.lineAtPass).toBeCloseTo(line, 9);
        const beyond = r.atPass.x - Math.max(line, m.passer.x);
        const isOff = m.offsideOn && r.atPass.x > K.HALFWAY && beyond > 0.05;
        expect(r.type === 'offside', f + '/' + c + '/' + sh + '/' + r.id).toBe(isOff);
        if (isOff) offsides += 1; else onside += 1;
      }
    }
    expect(offsides).toBeGreaterThan(0);
    expect(onside).toBeGreaterThan(offsides);
  });

  it('there is no offside from a corner, a long throw-in or a penalty', () => {
    for (const c of ['corner-in', 'corner-out', 'corner-short', 'throwin-long', 'penalty']) {
      expect(S.move('433', c, 'midblock', null).offsideOn, c).toBe(false);
    }
    expect(S.move('433', 'freekick-cross', 'midblock', null).offsideOn).toBe(true);
  });

  it('the offside trap steps up as the pass is played: it catches a striker on the line, not a late runner', () => {
    const trap = S.move('433', 'tikitaka', 'offsidetrap', null);
    const mid = S.move('433', 'tikitaka', 'midblock', null);
    const by = (m, id) => m.reads.find((r) => r.id === id);
    expect(by(trap, 'behind').type).toBe('offside');
    expect(by(trap, 'behind').lineAtPass).toBeCloseTo(trap.line - K.TRAP_STEP, 9);
    expect(by(mid, 'behind').type).not.toBe('offside');
    expect(by(trap, 'late').type).toBe('shot');
    expect(by(trap, 'late').xG).toBeGreaterThanOrEqual(K.FAIR_XG);
  });

  it('a pass is cut out only when a defender really gets there first', () => {
    let cuts = 0;
    for (const [f, c, sh] of combos()) {
      const m = S.move(f, c, sh, null);
      for (const r of m.reads) {
        if (r.type !== 'cut') continue;
        cuts += 1;
        const d = m.defenders.find((x) => x.id === r.cut.id);
        const react = K.REACT + (m.trap && d.role === 'DEF' ? K.TRAP_TURN : 0);
        expect(r.cut.tDef).toBeCloseTo(react + r.cut.distM / K.DEF, 9);
        if (r.cut.lane) {
          expect(r.air).toBe(false);                       // a ball in the air flies over the lane
          expect(r.cut.tDef).toBeLessThanOrEqual(r.cut.tBall + 1e-9);
          expect(r.cut.tBall).toBeCloseTo(r.cut.s / K.BALL, 9);
        } else {
          expect(r.cut.tDef).toBeLessThan(r.cut.runnerT);  // he beat the runner to the spot
        }
      }
    }
    expect(cuts).toBeGreaterThan(10);
  });

  it('the chance = xG from where he shoots, halved per defender within 3 m, halved for a header', () => {
    let shots = 0;
    for (const [f, c, sh] of combos()) {
      const m = S.move(f, c, sh, null);
      for (const r of m.reads) {
        if (r.type !== 'shot') continue;
        shots += 1;
        if (r.penalty) { expect(r.xG).toBe(K.PENALTY_XG); continue; }
        expect(r.baseXG).toBeCloseTo(S.computeXG(r.shotAt.x, r.shotAt.y), 12);
        const factor = (r.header ? K.HEADER : 1) * (r.wall ? K.WALL : 1) * Math.pow(K.PRESS_FACTOR, r.pressers.length);
        expect(r.xGRaw).toBeCloseTo(r.baseXG * factor, 12);
        // the chance is kept to the 2 decimals the screen shows, so words and number agree
        expect(r.xG).toBe(Math.round(r.baseXG * factor * 100) / 100);
        expect(r.goalDist).toBeCloseTo(dist(r.shotAt, { x: 105, y: 34 }), 9);
        // he never runs closer than SHOOT_M before shooting
        if (r.carryM > 0.01) expect(r.goalDist).toBeGreaterThanOrEqual(K.SHOOT_M - 1e-6);
        if (r.header || r.direct) expect(r.carryM).toBe(0);
      }
    }
    expect(shots).toBeGreaterThan(100);
  });

  it('the defensive shape changes the result in open play, and not at a corner', () => {
    const best = (c) => S.shapes.map((sh) => { const b = S.move('433', c, sh.id, null).best; return b ? b.id + ':' + b.xG.toFixed(3) : 'none'; });
    expect(new Set(best('tikitaka')).size).toBeGreaterThanOrEqual(3);
    expect(new Set(best('counter')).size).toBeGreaterThanOrEqual(3);
    expect(new Set(best('corner-in')).size).toBe(1);
    expect(S.move('433', 'corner-in', 'lowblock', null).shapeMatters).toBe(false);
  });
});

describe('the picture is the model', () => {
  it('runners start where the model starts them and get the ball where it says', () => {
    for (const [f, c, sh] of [['433', 'tikitaka', 'midblock'], ['442', 'counter', 'highpress'], ['4231', 'corner-in', 'lowblock'], ['433', 'tikitaka', 'offsidetrap']]) {
      const m0 = S.move(f, c, sh, null);
      for (const r0 of m0.reads) {
        const m = S.move(f, c, sh, r0.id);
        const r = m.read;
        const f0 = S.frameAt(m, 0);
        if (!r.direct) expect(dist(f0.attackers.find((p) => p.id === r.runnerId), r.start)).toBeLessThan(1e-6);
        if (r.type === 'shot' && !r.direct) {
          const atCatch = S.frameAt(m, r.catchT);
          expect(dist(atCatch.attackers.find((p) => p.id === r.runnerId), r.to)).toBeLessThan(1e-6);
          const atShot = S.frameAt(m, r.shotT);
          expect(dist(atShot.attackers.find((p) => p.id === r.runnerId), r.shotAt)).toBeLessThan(0.35);
          if (r.nearest) {
            // the gap drawn on the pitch at the end is the gap in the verdict
            const end = S.frameAt(m, m.outcome.endT);
            const d = end.defenders.find((x) => x.id === r.nearest.id);
            expect(Math.abs(dist(d, r.shotAt) - r.nearest.gap)).toBeLessThan(0.01);
          }
        }
        if (r.type === 'cut') {
          const end = S.frameAt(m, m.outcome.endT);
          expect(dist(end.ball, r.cut.at)).toBeLessThan(1e-6);
        }
        expect(m.outcome.endT).toBeGreaterThan(0);
      }
    }
  });

  it('nothing is drawn off the pitch: every spot is on it, and the camera includes the goal', () => {
    for (const [f, c, sh] of combos()) {
      const m = S.move(f, c, sh, null);
      const pts = [...m.attackers, ...m.defenders, ...m.reads.flatMap((r) => [r.start, r.to, r.shotAt || r.to])];
      for (const p of pts) {
        expect(p.x).toBeGreaterThanOrEqual(0); expect(p.x).toBeLessThanOrEqual(105);
        expect(p.y).toBeGreaterThanOrEqual(0); expect(p.y).toBeLessThanOrEqual(68);
      }
      const cam = S.camera(m);
      expect(cam.x1).toBeGreaterThanOrEqual(105);
      for (const r of m.reads) expect(Math.min(r.start.x, r.to.x)).toBeGreaterThanOrEqual(cam.x0);
    }
  });

  it('is big enough to read: about 4 px per meter or more on a 362 px phone square, 5 on desktop', () => {
    for (const c of ['tikitaka', 'corner-in', 'freekick-direct', 'gegenpress']) {
      const m = S.move('433', c, 'midblock', null);
      expect(S.pitchMap(362, 362, S.camera(m)).s, c).toBeGreaterThanOrEqual(4);
      expect(S.pitchMap(710, 394, S.camera(m)).s, c).toBeGreaterThanOrEqual(5);
    }
  });
});

describe('the shapes stand like real back lines', () => {
  it('the offside trap is ONE flat line, with its midfield and forwards in front of it', () => {
    const t = S.defense('shape', 'offsidetrap');
    const back = t.filter((d) => d.role === 'DEF');
    expect(new Set(back.map((d) => d.x)).size).toBe(1);
    for (const d of t.filter((x) => x.role === 'MID' || x.role === 'FWD')) expect(d.x).toBeLessThan(back[0].x);
  });

  it('in every shape the center-backs are the deepest outfield players (or level)', () => {
    for (const sh of S.shapes) {
      const ds = S.defense('shape', sh.id);
      const cbs = ds.filter((d) => /CB$/.test(d.id));
      const deepest = Math.max(...ds.filter((d) => d.role !== 'GK').map((d) => d.x));
      for (const cb of cbs) expect(cb.x, sh.id).toBe(deepest);
    }
  });

  it('the low block is narrower than the other shapes', () => {
    const width = (id) => { const b = S.defense('shape', id).filter((d) => d.role === 'DEF').map((d) => d.y); return Math.max(...b) - Math.min(...b); };
    for (const id of ['highpress', 'midblock', 'offsidetrap']) expect(width('lowblock')).toBeLessThan(width(id));
  });
});

describe('Scout grades and missions come from the model', () => {
  it('the grade is the best pass: great at xG 0.10, workable at 0.05, else tough', () => {
    const seen = { great: 0, okay: 0, tough: 0 };
    for (const [f, c, sh] of combos()) {
      const g = S.grade(f, c, sh);
      const b = S.move(f, c, sh, null).best;
      const x = b ? b.xG : 0;
      expect(g.grade).toBe(x >= K.GOOD_XG ? 'great' : x >= K.FAIR_XG ? 'okay' : 'tough');
      seen[g.grade] += 1;
    }
    expect(seen.great).toBeGreaterThan(0); expect(seen.okay).toBeGreaterThan(0); expect(seen.tough).toBeGreaterThan(0);
    expect(source).not.toMatch(/beats\.indexOf\(shape\.id\)/);
  });

  it('every mission can be finished with some setup, and none by doing nothing', () => {
    const all = [];
    for (const [f, c, sh] of combos()) {
      const m = S.move(f, c, sh, null);
      for (const r of m.reads) all.push({ f, c, sh, r, isBest: !!(m.best && m.best.id === r.id), setType: m.setType, shapeMatters: m.shapeMatters });
    }
    const fair = (x) => x.r.type === 'shot' && x.r.xG >= K.FAIR_XG;
    const stats = {
      highXgShot: all.some((x) => x.r.type === 'shot' && x.r.xG >= K.GOOD_XG),
      bestPasses: all.filter((x) => fair(x) && x.isBest).length,
      lowBlockChance: all.some((x) => fair(x) && x.sh === 'lowblock'),
      trapBeaten: all.some((x) => fair(x) && x.sh === 'offsidetrap' && x.shapeMatters),
      setPieceChance: all.some((x) => fair(x) && x.setType),
      setPieceTypesRun: Object.fromEntries(all.filter((x) => x.setType).map((x) => [x.setType, true])),
      shapesChance: Object.fromEntries(all.filter(fair).map((x) => [x.sh, true])),
      conceptsRun: Object.fromEntries(all.map((x) => [x.c, true])),
    };
    for (const t of S.drills.tasks) {
      expect(!!t.test(stats), t.id + ' can be finished').toBe(true);
      expect(!!t.test({}), t.id + ' is not finished by doing nothing').toBe(false);
    }
    // and not every pass works
    expect(all.some((x) => x.r.type === 'offside')).toBe(true);
    expect(all.some((x) => x.r.type === 'cut')).toBe(true);
    expect(all.some((x) => x.r.type === 'shot' && x.r.xG < K.FAIR_XG)).toBe(true);
    expect(S.drills.tasks.map((t) => t.goal).join(' ')).not.toMatch(/drag|move at least/i);
  });

  it('every move, shape and pass has plain words', () => {
    const W = M.soccerWords;
    for (const c of S.concepts) expect(W.words.concepts[c.id], c.id).toBeTruthy();
    for (const sh of S.shapes) expect(W.shape(sh.id), sh.id).toMatch(/\d+ m/);
    for (const c of S.concepts) for (const o of S.moves[c.id].options) expect(W.option(c.id, o.id), c.id + ':' + o.id).not.toBe(o.id);
    // the shape sentence gives the model's own distance
    expect(W.shape('midblock')).toContain(String(Math.round(105 - secondLast(S.defense('shape', 'midblock')))) + ' m');
  });

  it('an open-play shot from the penalty spot is about 0.3 (the xG curve is unchanged)', () => {
    expect(S.computeXG(105 - 11, 34)).toBeCloseTo(0.32, 2);
  });
});
