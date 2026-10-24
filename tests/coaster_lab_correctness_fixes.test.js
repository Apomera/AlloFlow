// Coaster Lab — correctness fixes from the 2026-10-18 review, tested by RUNNING
// the tool's own functions (slices of the shipped file), not by pinning strings.
//
//  - Ride & Solve: a coaster without a loop or launch had 3 checkpoints, so the
//    "4 correct answers" mission and quest could never be earned on the starter
//    or any generated coaster. Brake questions used numbers the model lacks.
//  - Inspection check 4 could be skipped, and its row showed "0.00 g" as the
//    student's calculation while grading only the build.
//  - Teardown never removed document listeners; a load-time help patch whose
//    anchor had lost its "→" silently never applied.
import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { sliceBetween } from './helpers/anchored_slice.js';

const TOOL_PATHS = [
  'stem_lab/stem_tool_coasterlab.js',
  'desktop/web-app/public/stem_lab/stem_tool_coasterlab.js',
];
const read = (p) => readFileSync(resolve(process.cwd(), p), 'utf8');
const constant = (src, name, file) => sliceBetween(src, `const ${name} = `, ';', { file, label: name, includeEnd: true });

// ---------------------------------------------------------------- Ride & Solve
function loadStops(file) {
  const src = read(file);
  const body = [
    constant(src, 'G0', file),
    constant(src, 'BRAKE_DECEL', file),
    sliceBetween(src, 'const fmt = ', '\n', { file, label: 'fmt' }),
    sliceBetween(src, 'function buildRideStops(){', '\nfunction startRide(){', { file, label: 'buildRideStops' }),
  ].join('\n');
  return new Function('analysis', 'level', 'track', 'design', 'trackAt', 'brakeLen', 'STOP_AT',
    body + '\nreturn { stops: buildRideStops(), G0, BRAKE_DECEL };');
}
const TRACK = { L: 420 };
const BRAKE_RUN = 50, STATION_Y = 3.2;
const A = { s: 60, h: 29.4, v: 3.5 }, B = { s: 130, h: 4.6, r: 28 };
const C = { s: 200, h: 26.3, r: 6.5 }, D = { s: 300, h: 8.4, r: 19.4 };
const LAUNCH = { s: 20, a: 7.5, len: 40, h: 2 };
const DESIGNS = {
  'chain, no loop (the starter and every generated coaster)': { a: { A, B, D }, mode: 'chain' },
  'chain with a loop (Classic Looper)': { a: { A, B, C, D }, mode: 'chain' },
  'launched, no loop': { a: { L: LAUNCH, A, B, D }, mode: 'launch' },
};
function stopsFor(file, key, level = 'engineer') {
  const d = DESIGNS[key];
  return loadStops(file)(d.a, level, TRACK, { propulsion: { mode: d.mode } },
    () => ({ y: STATION_Y }), () => BRAKE_RUN, 4);
}

describe('coaster lab — every coaster gets at least four Ride & Solve checkpoints', () => {
  it.each(TOOL_PATHS)('%s: the four-answer mission and quest are reachable on every design', (p) => {
    const src = read(p);
    // the thresholds these checkpoints have to feed
    expect(src.includes("check: x => x.correct >= 4 },")).toBe(true);
    expect(src.includes('return (s.rideBestCorrect || 0) >= 4;')).toBe(true);
    for (const key of Object.keys(DESIGNS)) {
      for (const level of ['engineer', 'explore']) {
        const { stops } = stopsFor(p, key, level);
        expect(stops.length, `${key} / ${level}`).toBeGreaterThanOrEqual(4);
        for (const st of stops) {
          const pool = st.make({ v: 10, h: 12, s: st.s });
          expect(pool.length, `${st.tag} pool`).toBeGreaterThan(0);
          for (const q of pool) {
            expect(q.key).toBeTruthy();
            if (q.choices) expect(q.choices.map((c) => c[0])).toContain(q.correct);
            else expect(Number.isFinite(q.answer), `${q.key} answer`).toBe(true);
          }
        }
      }
    }
  });

  it.each(TOOL_PATHS)('%s: only the short rides gain the lift-hill stop, and it sits on the lift', (p) => {
    const tags = (key) => stopsFor(p, key).stops.map((s) => s.tag);
    const chain = stopsFor(p, 'chain, no loop (the starter and every generated coaster)').stops;
    const lift = chain.find((s) => s.tag === 'Checkpoint · lift hill');
    expect(lift).toBeTruthy();
    expect(lift.s).toBeLessThan(A.s);
    expect(tags('chain with a loop (Classic Looper)')).not.toContain('Checkpoint · lift hill');
    expect(tags('launched, no loop')).not.toContain('Checkpoint · lift hill');
    expect(tags('chain with a loop (Classic Looper)')).toHaveLength(4);
  });

  it.each(TOOL_PATHS)('%s: lift questions are answerable from the model', (p) => {
    const lift = stopsFor(p, 'chain, no loop (the starter and every generated coaster)').stops
      .find((s) => s.tag === 'Checkpoint · lift hill');
    const live = { v: 3.5, h: 15, s: 30 };
    const pool = Object.fromEntries(lift.make(live).map((q) => [q.key, q]));
    expect(pool['lift-time'].answer).toBeCloseTo((A.s - live.s) / live.v, 6);
    expect(pool['lift-gain'].answer).toBeCloseTo(9.81 * (A.h - live.h), 6);
    const x = stopsFor(p, 'chain, no loop (the starter and every generated coaster)', 'explore').stops
      .find((s) => s.tag === 'Checkpoint · lift hill').make(live);
    expect(x.find((q) => q.key === 'lift-x-speed').correct).toBe('same'); // the chain holds speed
  });

  it.each(TOOL_PATHS)('%s: brake questions use the brake strength and entry speed the sim uses', (p) => {
    const { stops, G0, BRAKE_DECEL } = stopsFor(p, 'chain with a loop (Classic Looper)');
    const turn = stops.find((s) => s.tag === 'Checkpoint · the turn');
    const live = { v: 12, h: 8.4, s: D.s + 1.5 };
    const pool = turn.make(live);
    const vIn = Math.sqrt(live.v ** 2 + 2 * G0 * (live.h - STATION_Y));
    const byKey = Object.fromEntries(pool.map((q) => [q.key, q]));
    expect(byKey['brk-d'].answer).toBeCloseTo((vIn ** 2 - 9) / (2 * BRAKE_DECEL), 6);
    expect(byKey['brk-t'].answer).toBeCloseTo((vIn - 3) / BRAKE_DECEL, 6);
    for (const q of pool) {
      expect(q.text).not.toMatch(/45 m|6 m\/s²/);
      expect(q.text).toContain(fmtOne(vIn));
    }
    // and the sim brakes with the same constant
    expect(read(p).includes('sim.v = Math.max(3.0, sim.v - BRAKE_DECEL * h);')).toBe(true);
  });
});
const fmtOne = (x) => x.toFixed(1);

// --------------------------------------------------------------- math questions
describe('coaster lab — Ride & Solve arithmetic never contradicts the physics', () => {
  function loadGen(p) {
    const src = read(p);
    return new Function(sliceBetween(src, '/* @clab-mathgen-start', '/* @clab-mathgen-end', { file: p, label: 'mathgen' }) +
      '\nreturn { genElementMath };')().genElementMath;
  }
  const FACTS = { crestH: 24, valleyH: 6, liveH: 20, liveV: 9, loopH: 15, turnH: 9, cars: 3, trackLen: 400, tag: 'Checkpoint · crest' };

  it.each(TOOL_PATHS)('%s: every later hill stays below the first crest', (p) => {
    const gen = loadGen(p);
    for (const band of ['k2', 'g35', 'g68', 'g912']) {
      for (let i = 0; i < 300; i++) {
        const q = gen('addition', band, FACTS);
        if (q.key === 'add-climb' || q.key === 'add-turn') expect(q.answer, `${band} ${q.key}`).toBeLessThan(FACTS.crestH);
      }
    }
  });

  it.each(TOOL_PATHS)('%s: the speed gained on a drop is the model\'s, and absent without it', (p) => {
    const gen = loadGen(p);
    let saw = false;
    for (let i = 0; i < 300; i++) {
      expect(gen('addition', 'g68', FACTS).key).not.toBe('add-speed'); // no valleyV fact -> no invented boost
      const q = gen('addition', 'g68', { ...FACTS, valleyV: 21 });
      if (q.key === 'add-speed') { saw = true; expect(q.answer).toBe(21); }
    }
    expect(saw).toBe(true);
  });

  it.each(TOOL_PATHS)('%s: the radius question no longer calls a loop twice its apex radius wide', (p) => {
    const gen = loadGen(p);
    for (let i = 0; i < 300; i++) {
      const q = gen('multiplication', 'g68', { ...FACTS, feat: 'loop', hereR: 6, tag: 'Checkpoint · inversion' });
      if (/radius/.test(q.text)) expect(q.text).toMatch(/all the way round into a circle/);
    }
  });
});

// -------------------------------------------------------- inspection (check 4)
function loadGrader(file) {
  const src = read(file);
  const body = [
    constant(src, 'G0', file), constant(src, 'TOL', file),
    sliceBetween(src, 'const fmt = ', '\n', { file, label: 'fmt' }),
    'const calls = [];',
    'function geometryPreflightSamples(){ return []; }',
    "function banner(m){ calls.push(['banner', m]); }",
    'function jingle(){}',
    "function spawnFireworks(){ calls.push(['fireworks']); }",
    "function missionEvent(k){ calls.push(['mission', k]); }",
    "function bridgeReport(e){ calls.push(['bridge', e.event]); }",
    sliceBetween(src, 'function gradeCertRun(tele){', '\n/* ---------------- simulation', { file, label: 'gradeCertRun' }),
  ].join('\n');
  return new Function('analysis', 'preds', 'design', 'track', 'certResultEl', 'localStorage',
    body + '\nreturn { gradeCertRun, calls };');
}
function inspect(file, { p4 = 'right', sideG = 0.02, p1x = null, p3x = null, cap = null } = {}) {
  const G0 = 9.81;
  const vB = 22.34, gB = 2.82, vC = 8.52, bankD = 65.8;
  const analysis = { A: { h: 29.4, v: 3.5 }, B: { h: 4.6 }, C: { r: 6.5 }, D: {}, L: null, ans: { bankD } };
  const preds = {
    p1: { x: p1x == null ? 22.3 : p1x, ok: true },
    p2b: { x: 8.5, ok: true },
    p3: { x: p3x == null ? 2.81 : p3x, ok: true },
  };
  if (p4 === 'right') preds.p4 = { x: 66, ok: true };
  if (p4 === 'wrong') preds.p4 = { x: 40, ok: false };
  const design = { certTurnIdx: 20, points: Object.assign([], { 20: { bank: 50 } }) };
  const el = document.createElement('div');
  const store = {};
  const ls = { setItem: (k, v) => { store[k] = v; }, getItem: (k) => store[k] ?? null };
  const api = loadGrader(file)(analysis, preds, design, { pos: [], s: [], L: 400 }, el, ls);
  api.gradeCertRun({ status: 'complete', violations: [],
    markers: cap || { B: { v: vB, gV: gB }, C: { v: vC }, D: { gLat: sideG } } });
  void G0;
  return { html: el.innerHTML, text: el.textContent, calls: api.calls, store };
}

describe('coaster lab — inspection grades check 4 as two things and says which is off', () => {
  it.each(TOOL_PATHS)('%s: right angle, turn built to it -> certified (local date stored)', (p) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-18T03:30:00Z')); // 11:30 pm Oct 17 in New York
    try {
      const r = inspect(p);
      expect(r.text).toContain('★ SIMULATION CERTIFIED');
      expect(r.calls).toContainEqual(['fireworks']);
      const d = new Date();
      const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      expect(r.store.coaster_lab_certified).toBe(local);
      if (d.getTimezoneOffset() >= 240) expect(r.store.coaster_lab_certified).toBe('2026-10-17');
    } finally { vi.useRealTimers(); }
  });

  it.each(TOOL_PATHS)('%s: skipping check 4 no longer certifies', (p) => {
    const r = inspect(p, { p4: 'missing' });
    expect(r.text).toContain('NOT SIMULATION CERTIFIED');
    expect(r.text).toContain('Some calculations were never checked');
    expect(r.calls).not.toContainEqual(['fireworks']);
  });

  it.each(TOOL_PATHS)('%s: right angle but node not banked -> says the node is still banked 50°', (p) => {
    const r = inspect(p, { sideG: 0.69 });
    expect(r.text).toContain('NOT SIMULATION CERTIFIED');
    expect(r.text).toContain('Your bank angle is right, but node 20 is still banked 50°');
    expect(r.text).toContain('bank angle at D66 °'); // the student's angle is shown, not "0.00 g"
    expect(r.text).not.toMatch(/side g at D[^✓✗]*0\.00 g/);
  });

  it.each(TOOL_PATHS)('%s: turn rides level but the angle is wrong -> says the calculation is off', (p) => {
    const r = inspect(p, { p4: 'wrong' });
    expect(r.text).toContain('NOT SIMULATION CERTIFIED');
    expect(r.text).toContain('your calculated angle is off');
  });

  it.each(TOOL_PATHS)('%s: the seat-g row carries an accepted v_B forward on a steep valley', (p) => {
    const vB = 33.9, gB = 10.77, vS = 35.6; // student v_B 5% high: inside TOL.v
    const nStudent = 1 + (gB - 1) * (vS / vB) ** 2;
    expect(Math.abs(nStudent - gB)).toBeGreaterThan(0.35);
    const r = inspect(p, { p1x: vS, p3x: nStudent, cap: { B: { v: vB, gV: gB }, C: { v: 8.52 }, D: { gLat: 0.02 } } });
    expect(r.text).toMatch(/seat g at B[^✓✗]*✓/);
  });
});

// ------------------------------------------------------------------- teardown
describe('coaster lab — teardown removes listeners on long-lived objects', () => {
  it.each(TOOL_PATHS)('%s: a document listener registered through __clabListen is gone after destroy', (p) => {
    const block = sliceBetween(read(p), '/* @clab-cleanup-start', '/* @clab-cleanup-end', { file: p, label: 'cleanup' });
    const api = new Function('clearInterval', 'clearTimeout',
      block + '\nreturn { listen: __clabListen, destroy: __clabDestroy, resources: __clabResources };')(() => {}, () => {});
    let fired = 0;
    const onEvt = () => { fired++; };
    api.listen(document, 'clab-test-event', onEvt);
    document.dispatchEvent(new Event('clab-test-event'));
    api.destroy();
    document.dispatchEvent(new Event('clab-test-event'));
    expect(fired).toBe(1);
    expect(api.resources.listeners).toBe(null);
    // and the tool routes its fullscreen + visibility listeners through it
    const src = read(p);
    for (const ev of ['fullscreenchange', 'webkitfullscreenchange', 'visibilitychange']) {
      expect(src.includes(`__clabListen(document, '${ev}'`), ev).toBe(true);
    }
    expect(/document\.addEventListener\(/.test(src)).toBe(false);
  });
});

// ------------------------------------------------------- load-time HTML patches
describe('coaster lab — every load-time markup patch actually applies', () => {
  it.each(TOOL_PATHS)('%s: no CLAB_HTML / CLAB_CSS .replace() anchor misses', (p) => {
    const block = sliceBetween(read(p), '  var CLAB_CSS = ', '\n  function bootCoasterLab(', { file: p, label: 'markup + patches' });
    const misses = [];
    const original = String.prototype.replace;
    // eslint-disable-next-line no-extend-native
    String.prototype.replace = function (pattern, replacement) {
      if (typeof pattern === 'string' && this.length > 20000 && !this.includes(pattern)) misses.push(pattern.slice(0, 90));
      return original.call(this, pattern, replacement);
    };
    let out;
    try { out = new Function(block + '\nreturn { html: CLAB_HTML };')(); }
    finally { String.prototype.replace = original; }
    expect(misses).toEqual([]);
    expect(out.html.includes('camera: orbit → onboard → chase → scenic, and pick')).toBe(true);
    expect(out.html.includes('car?s')).toBe(false);
  });
});

// ------------------------------------------- characters lost to an encoding trip
describe('coaster lab — no "?" where a glyph was lost', () => {
  // "?" inside user-facing string text, between words, or as a lost apostrophe.
  // JavaScript ternaries live outside string literals, so they do not match.
  function lostGlyphs(src) {
    const hits = [];
    const scan = (text) => {
      const re = /(\w|\)|%) \? (\w|\$|\(|<)|[a-z]\?(s|t|ll|re|ve)\b/g;
      let m;
      while ((m = re.exec(text))) hits.push(text.slice(Math.max(0, m.index - 30), m.index + 30));
    };
    let i = 0;
    while (i < src.length) {
      const c = src[i];
      if (c === '/' && src[i + 1] === '/') { const n = src.indexOf('\n', i); i = n < 0 ? src.length : n; continue; }
      if (c === '/' && src[i + 1] === '*') { i = src.indexOf('*/', i + 2) + 2; continue; }
      if (c === "'" || c === '"') {
        let j = i + 1;
        while (j < src.length && src[j] !== c && src[j] !== '\n') { if (src[j] === '\\') j++; j++; }
        scan(src.slice(i + 1, j)); i = j + 1; continue;
      }
      if (c === '`') {
        let j = i + 1, depth = 0, start = j;
        while (j < src.length) {
          if (src[j] === '\\') { j += 2; continue; }
          if (depth === 0 && src[j] === '`') break;
          // keep a "$" on the segment so "m ? ${…}" still reads as "? <expression>"
          if (src[j] === '$' && src[j + 1] === '{') { if (depth === 0) scan(src.slice(start, j) + '$'); depth++; j += 2; continue; }
          if (depth > 0 && src[j] === '{') depth++;
          if (depth > 0 && src[j] === '}') { depth--; if (depth === 0) start = j + 1; j++; continue; }
          j++;
        }
        if (depth === 0) scan(src.slice(start, j));
        i = j + 1; continue;
      }
      i++;
    }
    return hits;
  }

  it.each(TOOL_PATHS)('%s: replay readout, help text and labels keep their separators', (p) => {
    expect(lostGlyphs(read(p))).toEqual([]);
  });

  it('the scanner catches the damage it was written for', () => {
    expect(lostGlyphs("x = `${a} m ? ${b} km/h`; y = 'each car?s wheel';")).toHaveLength(2);
    expect(lostGlyphs('const z = ok ? a : b;')).toEqual([]);
  });
});
