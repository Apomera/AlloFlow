// Angle Explorer deep rebuild (2026-11-03): the angle engine, run directly.
// window.StemLab.anglesCore holds the pure math behind protractor reading and
// drawing, benchmark estimation, missing-angle puzzles and radians. Every
// check here RUNS the functions; answers are re-derived independently.
// ANGLES_DEEP_SRC points at another copy (the pre-rebuild file has no engine,
// so every test here fails on it).
import { beforeAll, describe, expect, it } from 'vitest';
import { loadTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE = process.env.ANGLES_DEEP_SRC || 'stem_lab/stem_tool_angles.js';
let A;

beforeAll(() => {
  resetStemLab();
  loadTool(SOURCE, 'protractor');
  A = window.StemLab.anglesCore;
});

// Small deterministic generator so failures reproduce.
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
const norm = (a) => ((a % 360) + 360) % 360;

describe('engine is exported', () => {
  it('exposes the angle engine', () => {
    expect(A, 'window.StemLab.anglesCore').toBeTruthy();
    expect(typeof A.diagnoseReading).toBe('function');
  });
});

describe('radians in pi form', () => {
  it('reduces degrees to a fraction of pi', () => {
    const cases = { 0: '0', 1: 'π/180', 30: 'π/6', 45: 'π/4', 60: 'π/3', 90: 'π/2', 120: '2π/3', 135: '3π/4', 150: '5π/6', 180: 'π', 210: '7π/6', 270: '3π/2', 300: '5π/3', 360: '2π', 720: '4π' };
    for (const [deg, want] of Object.entries(cases)) expect(A.piForm(Number(deg)), deg + '°').toBe(want);
    expect(A.piForm(-90)).toBe('−π/2');
  });
  it('every pi form parses back to the same angle', () => {
    for (let deg = 1; deg <= 360; deg++) {
      const back = A.parseRadians(A.piForm(deg)) * 180 / Math.PI;
      expect(Math.abs(back - deg) < 1e-9, deg + ' -> ' + A.piForm(deg) + ' -> ' + back).toBe(true);
    }
  });
  it('reads typed radian forms', () => {
    const P = Math.PI;
    const cases = [['5π/6', 5 * P / 6], ['5pi/6', 5 * P / 6], ['5 pi / 6', 5 * P / 6], ['pi', P], ['2pi', 2 * P], ['(3/4)pi', 3 * P / 4], ['3/4 pi', 3 * P / 4], ['-pi/2', -P / 2], ['2.618', 2.618], ['π/2 rad', P / 2]];
    for (const [s, v] of cases) expect(Math.abs(A.parseRadians(s) - v) < 1e-9, s).toBe(true);
    for (const bad of ['', 'abc', 'pi/0', '5/0 pi', 'p p']) expect(Number.isNaN(A.parseRadians(bad)), bad).toBe(true);
  });
});

describe('protractor scales', () => {
  it('inner and outer readings always add to 180 and vanish below the baseline', () => {
    for (let rot = 0; rot < 360; rot += 7) {
      for (let dir = 0; dir < 360; dir += 3) {
        const rel = norm(dir - rot);
        const r = A.scaleReading(rot, dir);
        if (rel > 181 && rel < 359) { expect(r, rot + '/' + dir).toBe(null); continue; }
        if (r) expect(Math.abs(r.inner + r.outer - 180) < 1e-9).toBe(true);
      }
    }
  });
  it('a ray read from a centred protractor gives the same reading as its direction', () => {
    const R = 123;
    for (let rot = 0; rot < 360; rot += 11) {
      for (let dir = rot; dir <= rot + 180; dir += 9) {
        const place = { x: 210, y: 175, rot };
        const a = A.rayReading(210, 175, dir, place, R), b = A.scaleReading(rot, dir);
        expect(Math.abs(a.inner - b.inner) < 1e-6, rot + '/' + dir).toBe(true);
      }
    }
  });
  it('a ray from an off-centre vertex is read where it crosses the scale', () => {
    // Vertex 30 units right of the centre, ray straight up: it meets the circle
    // of radius 50 at (30, -40) from the centre, i.e. at atan2(40, 30) = 53.13 deg.
    const r = A.rayReading(130, 100, 90, { x: 100, y: 100, rot: 0 }, 50);
    expect(Math.abs(r.inner - Math.atan2(40, 30) * 180 / Math.PI) < 1e-6).toBe(true);
  });
  it('placing the centre on the vertex with 0 on the base ray reads the true measure, both openings', () => {
    const g = rng(1);
    for (let i = 0; i < 400; i++) {
      const task = A.makeMeasureTask(g, ['g4', 'g57', 'g8'][i % 3]);
      expect(task.m >= 1 && task.m <= 179).toBe(true);
      const rot = task.open === 1 ? task.base : norm(task.base + 180);
      const r = A.scaleReading(rot, A.otherDir(task));
      const base = A.scaleReading(rot, task.base);
      const scale = task.open === 1 ? 'inner' : 'outer';
      expect(Math.abs(base[scale]) < 1e-9, 'base ray on 0').toBe(true);
      expect(Math.abs(r[scale] - task.m) < 1e-9, JSON.stringify(task)).toBe(true);
      expect(A.diagnoseReading(task, String(task.m), { x: task.vx, y: task.vy, rot }).code).toBe('ok');
    }
  });
});

describe('reading misconceptions are named', () => {
  const task = { base: 40, open: 1, m: 62, vx: 210, vy: 175, tol: 1 };
  const onV = { x: 210, y: 175, rot: 40 };
  it('names the wrong scale, the reflex angle and a misplaced centre', () => {
    expect(A.diagnoseReading(task, '62', onV).code).toBe('ok');
    expect(A.diagnoseReading(task, '63', onV).code).toBe('ok');
    expect(A.diagnoseReading(task, '118', onV).code).toBe('wrong_scale');
    expect(A.diagnoseReading(task, '298', onV).code).toBe('reflex');
    expect(A.diagnoseReading(task, '70', { x: 250, y: 200, rot: 40 }).code).toBe('vertex_off');
    expect(A.diagnoseReading(task, '62°', onV).code).toBe('ok');
    expect(A.diagnoseReading(task, 'sixty', onV).code).toBe('nan');
  });
  it('names counting from the wrong zero when the base ray is not on 0', () => {
    // Centred, but the baseline sits along 0 deg: the base ray reads 40 inner,
    // the other ray (102 deg) reads 102 inner / 78 outer.
    const place = { x: 210, y: 175, rot: 0 };
    expect(A.diagnoseReading(task, '102', place).code).toBe('wrong_zero');
    expect(A.diagnoseReading(task, '78', place).code).toBe('wrong_zero');
    expect(A.diagnoseReading(task, '62', place).code, 'subtracting the readings is right').toBe('ok');
  });
  it('a right angle read on either scale is right, never "wrong scale"', () => {
    const t90 = { base: 0, open: -1, m: 90, vx: 0, vy: 0, tol: 1 };
    expect(A.diagnoseReading(t90, '90', { x: 0, y: 0, rot: 180 }).code).toBe('ok');
  });
});

describe('drawing and comparing', () => {
  it('grades a drawn ray by the angle it makes, on either side of the base ray', () => {
    const g = rng(7);
    for (let i = 0; i < 300; i++) {
      const task = A.makeDrawTask(g, 'g57');
      expect(A.diagnoseDrawing(task, task.base + task.m).code).toBe('ok');
      expect(A.diagnoseDrawing(task, task.base - task.m).code).toBe('ok');
      expect(A.diagnoseDrawing(task, task.drawStart).code === 'ok', 'the start ray is not already the answer').toBe(false);
      if (Math.abs(task.m - 90) > 1) expect(A.diagnoseDrawing(task, task.base + 180 - task.m).code).toBe('wrong_scale');
    }
  });
  it('compare tasks have a true answer and name the ray-length misconception', () => {
    const g = rng(3);
    let trapsSeen = 0;
    for (let i = 0; i < 300; i++) {
      const c = A.makeCompareTask(g);
      const want = c.a.m === c.b.m ? 'same' : (c.a.m > c.b.m ? 'A' : 'B');
      expect(c.answer).toBe(want);
      expect(A.diagnoseCompare(c, want).code).toBe('ok');
      const longer = c.a.len > c.b.len ? 'A' : 'B';
      if (longer !== want) { trapsSeen++; expect(A.diagnoseCompare(c, longer).code).toBe('ray_length'); }
    }
    expect(trapsSeen > 100, 'most pairs put the long rays on the smaller opening').toBe(true);
  });
});

describe('benchmark estimation', () => {
  it('targets avoid the 15-degree grid and the benchmarks; grade 4 stays below 180', () => {
    const g = rng(5);
    for (let i = 0; i < 500; i++) {
      const lvl = ['g4', 'g57', 'g8'][i % 3];
      const e = A.makeEstimate(g, lvl);
      expect(e.target % 15 === 0, String(e.target)).toBe(false);
      for (const b of A.BENCH) expect(Math.abs(e.target - b) >= 5, e.target + ' near ' + b).toBe(true);
      if (lvl === 'g4') expect(e.target < 180).toBe(true);
      expect(A.benchIndex(e.target) >= 0).toBe(true);
    }
  });
  it('places each angle in its benchmark bracket', () => {
    expect(A.benchIndex(30)).toBe(0);
    expect(A.benchIndex(60)).toBe(1);
    expect(A.benchIndex(100)).toBe(2);
    expect(A.benchIndex(170)).toBe(3);
    expect(A.benchIndex(200)).toBe(4);
    expect(A.benchIndex(300)).toBe(5);
    expect(A.benchIndex(90)).toBe(-1);
  });
});

describe('parallel lines cut by a transversal', () => {
  // Independent model: at each crossing the four rays point along 0, alpha, 180
  // and 180 + alpha; corner p lies between consecutive rays.
  const corner = (alpha, p) => {
    const rays = [0, alpha, 180, 180 + alpha, 360];
    return rays[p + 1] - rays[p];
  };
  it('every named pair obeys its rule for every transversal angle', () => {
    let named = 0;
    for (let alpha = 20; alpha <= 160; alpha++) {
      for (let i1 = 0; i1 < 2; i1++) for (let p1 = 0; p1 < 4; p1++) for (let i2 = 0; i2 < 2; i2++) for (let p2 = 0; p2 < 4; p2++) {
        expect(A.transValue(alpha, p1)).toBe(corner(alpha, p1));
        const rel = A.transRelation(i1, p1, i2, p2);
        if (!rel || rel === 'same') continue;
        named++;
        const a = corner(alpha, p1), b = corner(alpha, p2);
        if (A.EQUAL_RELS[rel]) expect(a, rel + ' ' + [alpha, i1, p1, i2, p2]).toBe(b);
        else expect(a + b, rel + ' ' + [alpha, i1, p1, i2, p2]).toBe(180);
      }
    }
    expect(named).toBeGreaterThan(1000);
  });
  it('classifies the textbook pairs', () => {
    expect(A.transRelation(0, 0, 1, 0)).toBe('corresponding');
    expect(A.transRelation(0, 2, 1, 0)).toBe('alt_interior');
    expect(A.transRelation(0, 3, 1, 0)).toBe('co_interior');
    expect(A.transRelation(0, 0, 1, 2)).toBe('alt_exterior');
    expect(A.transRelation(0, 0, 0, 2)).toBe('vertical');
    expect(A.transRelation(0, 0, 0, 1)).toBe('linear');
    expect(A.transRelation(0, 0, 1, 1)).toBe(null);
  });
});

describe('missing-angle puzzles', () => {
  const kinds = ['comp', 'supp', 'vert', 'point', 'tri', 'trans', 'rad'];
  it('every generated answer is right by an independent computation', () => {
    const g = rng(11);
    for (const kind of kinds) {
      for (let i = 0; i < 300; i++) {
        const p = A.makePuzzle(kind, g, i % 2 ? 'g8' : 'g57');
        if (kind === 'comp') expect(p.a + p.answer).toBe(90);
        if (kind === 'supp') expect(p.a + p.answer).toBe(180);
        if (kind === 'vert') {
          const sizes = [p.a, 180 - p.a, p.a, 180 - p.a];
          expect(p.answer).toBe(sizes[p.askPos]);
          expect(p.ask === 'vertical' ? p.askPos === 2 : p.askPos % 2 === 1).toBe(true);
        }
        if (kind === 'point') { expect(p.parts.reduce((s, v) => s + v, 0) + p.answer).toBe(360); expect(p.answer > 0).toBe(true); }
        if (kind === 'tri') { expect(p.angles.reduce((s, v) => s + v, 0)).toBe(180); expect(p.angles.every((v) => v > 0)).toBe(true); expect(p.answer).toBe(p.angles[p.which]); }
        if (kind === 'trans') {
          expect(p.rel).toBe(A.transRelation(p.given.i, p.given.p, p.ask.i, p.ask.p));
          expect(p.rel && p.rel !== 'same').toBeTruthy();
          const rays = [0, p.alpha, 180, 180 + p.alpha, 360];
          expect(p.a).toBe(rays[p.given.p + 1] - rays[p.given.p]);
          expect(p.answer).toBe(rays[p.ask.p + 1] - rays[p.ask.p]);
        }
        if (kind === 'rad') {
          if (p.dir === 'toRad') expect(Math.abs(A.parseRadians(p.answer) - p.deg * Math.PI / 180) < 1e-9).toBe(true);
          else expect(p.answer).toBe(p.deg);
        }
        expect(A.diagnosePuzzle(p, String(p.answer)).code, p.id).toBe('ok');
      }
    }
  });
  it('grade 4 puzzles use multiples of 5 and only measuring-level kinds', () => {
    expect(A.PUZZLE_KINDS.g4).toEqual(['comp', 'supp', 'point']);
    expect(A.PUZZLE_KINDS.g57.includes('trans')).toBe(false);
    expect(A.PUZZLE_KINDS.g8.includes('trans') && A.PUZZLE_KINDS.g8.includes('rad')).toBe(true);
    const g = rng(4);
    for (let i = 0; i < 200; i++) {
      const p = A.makePuzzle(['comp', 'supp', 'point'][i % 3], g, 'g4');
      const nums = p.parts || [p.a];
      expect(nums.every((v) => v % 5 === 0), p.id).toBe(true);
    }
  });
  it('names each relationship misconception', () => {
    expect(A.diagnosePuzzle({ kind: 'comp', a: 35, answer: 55 }, '145').code).toBe('used_180');
    expect(A.diagnosePuzzle({ kind: 'comp', a: 35, answer: 55 }, '35').code).toBe('copied_given');
    expect(A.diagnosePuzzle({ kind: 'supp', a: 50, answer: 130 }, '40').code).toBe('used_90');
    expect(A.diagnosePuzzle({ kind: 'vert', a: 70, ask: 'vertical', answer: 70 }, '110').code).toBe('vert_is_supp');
    expect(A.diagnosePuzzle({ kind: 'vert', a: 70, ask: 'linear', answer: 110 }, '70').code).toBe('linear_is_equal');
    expect(A.diagnosePuzzle({ kind: 'point', parts: [100, 120], answer: 140 }, '220').code).toBe('gave_sum');
    expect(A.diagnosePuzzle({ kind: 'point', parts: [100, 120], answer: 140 }, '40').code).toBe('point_used_180');
    expect(A.diagnosePuzzle({ kind: 'tri', angles: [50, 60, 70], which: 2, answer: 70 }, '250').code).toBe('tri_used_360');
    expect(A.diagnosePuzzle({ kind: 'trans', rel: 'corresponding', a: 65, answer: 65 }, '115').code).toBe('trans_equal_as_supp');
    expect(A.diagnosePuzzle({ kind: 'trans', rel: 'co_interior', a: 65, answer: 115 }, '65').code).toBe('trans_supp_as_equal');
    expect(A.diagnosePuzzle({ kind: 'comp', a: 35, answer: 55 }, '57').code).toBe('arith');
    expect(A.diagnosePuzzle({ kind: 'rad', deg: 150, dir: 'toRad' }, '5pi/12').code).toBe('rad_used_360');
    expect(A.diagnosePuzzle({ kind: 'rad', deg: 150, dir: 'toRad' }, '150').code).toBe('rad_typed_degrees');
    expect(A.diagnosePuzzle({ kind: 'rad', deg: 150, dir: 'toRad' }, '10π/12').code, 'an unreduced fraction is still right').toBe('ok');
    expect(A.diagnosePuzzle({ kind: 'rad', deg: 150, dir: 'toDeg' }, '300').code).toBe('rad_pi_is_360');
  });
});

describe('levels, credit and clock positions', () => {
  it('maps the host grade band to a level', () => {
    expect(A.levelFromBand('k2')).toBe('g4');
    expect(A.levelFromBand('g35')).toBe('g4');
    expect(A.levelFromBand('g68')).toBe('g57');
    expect(A.levelFromBand('g912')).toBe('g8');
    expect(A.levelFromBand(undefined)).toBe('g57');
  });
  it('credits a key once and caps the stored map', () => {
    let m = {};
    const first = A.creditKey(m, 'x', 5);
    expect(first.isNew).toBe(true);
    expect(A.creditKey(first.map, 'x', 5).isNew).toBe(false);
    m = first.map;
    for (let i = 0; i < 20; i++) m = A.creditKey(m, 'k' + i, 5).map;
    expect(Object.keys(m).length).toBeLessThanOrEqual(5);
  });
  it('reads directions as clock positions', () => {
    expect(A.clockHour(0)).toBe(3);
    expect(A.clockHour(90)).toBe(12);
    expect(A.clockHour(180)).toBe(9);
    expect(A.clockHour(270)).toBe(6);
    expect(A.clockHour(30)).toBe(2);
    expect(A.clockHour(-30)).toBe(4);
  });
});
