// Geometry World practice rounds (2026-09-24).
//
// A practice round is a world generated from a round number (1 to 9999): a blue
// prism to count in layers, a gold prism to unfold with the Net tool, a crate with
// only its bottom layer built, and a gold and blue L-shape. Every choice is
// generated, so nothing was authored that a person could check by reading. These
// gates rebuild the world of EVERY round number with the loader's rules and measure
// each keyed answer from it (surface area by counting exposed unit faces, not by the
// formula the generator used), check that each wrong choice has its own note, that
// the answer is not always the middle choice, and that the net the N tool lays out
// fits on the grass without covering another station. Every check runs at both
// levels: core, and stretch (a box with no lid, a crate's missing depth, an L-shape
// whose parts differ in height).

import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { React, ReactDOMClient, makeCtx, resetStemLab, loadTool } from './helpers/stem_widgets_smoke_harness.js';

const FILE = 'stem_lab/stem_tool_geometryworld.js';
const SOURCE = readFileSync(FILE, 'utf8');
const ENGINE_KEY = '__geoWorldEngine';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let cfg, P, coach;
function makeThreeStub() {
  function vec() {
    const v = { x: 0, y: 0, z: 0, w: 0 };
    ['set', 'copy', 'add', 'sub', 'subVectors', 'normalize', 'multiplyScalar', 'applyQuaternion', 'setFromQuaternion', 'crossVectors', 'cross', 'lerp', 'addScaledVector', 'setY', 'round', 'floor', 'setScalar', 'applyEuler', 'fromArray', 'lookAt'].forEach((m) => { v[m] = () => v; });
    v.clone = () => vec(); v.distanceTo = () => 99; v.length = () => 1; v.lengthSq = () => 1; v.dot = () => 0; v.toArray = () => [0, 0, 0];
    return v;
  }
  return new Proxy({}, { get: (_t, prop) => (prop === 'SRGBColorSpace' ? 'srgb' : typeof prop === 'symbol' ? undefined : function () { return vec(); }) });
}
beforeAll(() => {
  resetStemLab(); window.THREE = makeThreeStub();
  cfg = loadTool(FILE, 'geometryWorld');
  P = window.StemLab.geometryWorldPractice;
  coach = window.StemLab.geometryWorldAnswerCoaching;
}, 120000);

const SEEDS = Array.from({ length: 9999 }, (_, i) => i + 1);
const LEVELS = ['core', 'stretch'];
const ROUNDS = LEVELS.flatMap((level) => SEEDS.map((seed) => [seed, level]));
const sequence = (q) => { const out = []; (function visit(x) { if (!x) return; out.push(x); (x.followUp || []).forEach(visit); })(q); return out; };
const num = (text) => Number(String(text).match(/^\d+/)[0]);

// ── World model: loadLesson + fillBlocks (inclusive fills, first fill owns a cell) ──
const key = (x, y, z) => x + ',' + y + ',' + z;
const DIRS = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
function world(lesson) {
  const cells = new Map();
  for (const s of lesson.structures) {
    expect(s.type).toBe('fill');
    for (let x = Math.min(s.x1, s.x2); x <= Math.max(s.x1, s.x2); x++)
      for (let y = Math.min(s.y1, s.y2); y <= Math.max(s.y1, s.y2); y++)
        for (let z = Math.min(s.z1, s.z2); z <= Math.max(s.z1, s.z2); z++)
          if (!cells.has(key(x, y, z))) cells.set(key(x, y, z), { x, y, z, type: s.block });
  }
  return cells;
}
// What Measure (M) reports: face-connected lesson blocks of any material.
function flood(cells, seed) {
  const start = cells.get(key(...seed));
  if (!start) return null;
  const seen = new Set([key(...seed)]), todo = [start], out = [];
  while (todo.length) {
    const c = todo.pop(); out.push(c);
    for (const d of DIRS) { const k = key(c.x + d[0], c.y + d[1], c.z + d[2]); if (cells.has(k) && !seen.has(k)) { seen.add(k); todo.push(cells.get(k)); } }
  }
  const lo = (a) => Math.min(...out.map((c) => c[a])), hi = (a) => Math.max(...out.map((c) => c[a]));
  const mats = {}; out.forEach((c) => { mats[c.type] = (mats[c.type] || 0) + 1; });
  const set = new Set(out.map((c) => key(c.x, c.y, c.z)));
  let faces = 0; out.forEach((c) => DIRS.forEach((d) => { if (!set.has(key(c.x + d[0], c.y + d[1], c.z + d[2]))) faces++; }));
  return { cells: out, count: out.length, mats, faces, L: hi('x') - lo('x') + 1, W: hi('z') - lo('z') + 1, H: hi('y') - lo('y') + 1, minX: lo('x'), minZ: lo('z'), minY: lo('y') };
}
// Each station, measured, and the value each question step should key.
function measured(lesson) {
  const cells = world(lesson), stretch = lesson.practice.level === 'stretch';
  const a = flood(cells, [2, 1, 2]), b = flood(cells, [12, 1, 2]), c = flood(cells, [2, 1, 12]), d = flood(cells, [12, 1, 12]);
  const crateVolume = Number((lesson.npcs[2].dialogue.match(/holds exactly (\d+) cubes/) || [])[1]);
  // Stretch: the Net Maker's box has no lid (the top face, L by W, comes off), and
  // the crate's built part is its front wall, so the answer is a number of walls.
  return { cells, a, b, c, d, crateVolume, stretch, truths: {
    'Counting Coach': [[a.L * a.W, 'cubes'], [a.H, 'layers'], [a.count, 'cubic units']],
    'Net Maker': stretch
      ? [[b.L * b.W, 'square units'], [b.faces, 'square units'], [b.faces - b.L * b.W, 'square units']]
      : [[b.L * b.W, 'square units'], [b.L * b.H, 'square units'], [b.faces, 'square units']],
    'Crate Builder': [[c.count, 'cubes'], [crateVolume / c.count, stretch ? 'walls' : 'layers']],
    'L-Shape Scout': [[d.mats.gold, 'cubic units'], [d.mats.diamond, 'cubic units'], [d.count, 'cubic units']]
  } };
}

describe('every practice round keys what the student measures', () => {
  it('rounds 1 to 9999 at both levels: each keyed choice is the measured value, in its unit, and no other choice is', () => {
    const failures = [];
    for (const [seed, level] of ROUNDS) {
      const lesson = P.lesson(seed, level), m = measured(lesson);
      expect(lesson.npcs.map((n) => n.name)).toEqual(P.stations);
      for (const npc of lesson.npcs) {
        const steps = sequence(npc.question), truths = m.truths[npc.name];
        if (steps.length !== truths.length) { failures.push(seed + ' ' + npc.name + ' has ' + steps.length + ' steps'); continue; }
        steps.forEach((q, i) => {
          const [truth, unit] = truths[i], id = level + ' ' + seed + ' ' + npc.name + '#' + i;
          const keyed = q.choices[q.correct];
          if (!(Number.isInteger(truth) && truth > 0)) failures.push(id + ' world value ' + truth);
          if (num(keyed) !== truth) failures.push(id + ' keyed ' + keyed + ' but the world gives ' + truth);
          q.choices.forEach((ch) => { if (!new RegExp('^\\d+ ' + unit.replace(/s$/, '') + 's?$').test(ch)) failures.push(id + ' unit of ' + ch); });
          if (new Set(q.choices.map(num)).size !== 3) failures.push(id + ' repeats a number: ' + q.choices);
        });
      }
    }
    expect(failures.slice(0, 12)).toEqual([]);
  }, 240000);

  it('the stations are what the dialogue says: a solid prism, a gold prism, a crate part, an L-shape', () => {
    const failures = [];
    for (const [seed, level] of ROUNDS) {
      const { cells, a, b, c, d, crateVolume, stretch } = measured(P.lesson(seed, level));
      const partHeight = (mat) => Math.max(...d.cells.filter((x) => x.type === mat).map((x) => x.y));
      const checks = {
        'blue prism is solid': a.count === a.L * a.W * a.H && Object.keys(a.mats).join() === 'diamond',
        'gold prism is solid gold': b.count === b.L * b.W * b.H && Object.keys(b.mats).join() === 'gold',
        'the net prism is never a cube': !(b.L === b.W && b.W === b.H),
        'crate part is wood at y 1': c.minY === 1 && Object.keys(c.mats).join() === 'wood',
        'crate part is a bottom layer (core) or a front wall (stretch)': stretch ? c.W === 1 && c.H >= 2 : c.H === 1,
        'crate volume is whole layers or walls, at least two': crateVolume % c.count === 0 && crateVolume / c.count >= 2,
        'L parts share a height (core) or differ (stretch)': (partHeight('gold') !== partHeight('diamond')) === stretch,
        'L has a gold and a blue part': d.mats.gold > 0 && d.mats.diamond > 0,
        'an L leaves part of its box empty': d.count < d.L * d.W * d.H,
        'the four stations do not touch': a.count + b.count + c.count + d.count === cells.size
      };
      Object.keys(checks).forEach((k) => { if (!checks[k]) failures.push(level + ' ' + seed + ' ' + k); });
    }
    expect(failures.slice(0, 12)).toEqual([]);
  }, 240000);

  it('characters stand on open grass, and the gold prism’s net lies on the grass without covering a station', () => {
    const failures = [];
    for (const [seed, level] of ROUNDS) {
      const lesson = P.lesson(seed, level), { cells, b } = measured(lesson), g = lesson.ground;
      const inside = (x, z) => x >= g.xMin && x <= g.xMax && z >= g.zMin && z <= g.zMax;
      lesson.npcs.concat([{ name: 'spawn', position: lesson.spawnPoint }]).forEach((n) => {
        const [x, , z] = n.position.map(Math.floor);
        if (!inside(x, z) || cells.has(key(x, 1, z)) || cells.has(key(x, 2, z))) failures.push(seed + ' ' + n.name + ' is not on open grass');
      });
      lesson.structures.forEach((s, i) => { if (!inside(s.x1, s.z1) || !inside(s.x2, s.z2)) failures.push(seed + ' structure ' + i + ' off the grass'); });
      // engine.useNetTool: baseX = minX + L + 3, baseZ = minZ; a cross of six quads.
      const bx = b.minX + b.L + 3, bz = b.minZ, L = b.L, W = b.W, H = b.H;
      const quads = [[bx - W, bz, W, H], [bx, bz, L, H], [bx + L, bz, W, H], [bx + L + W, bz, L, H], [bx, bz - W, L, W], [bx, bz + H, L, W]];
      for (const [qx, qz, qw, qd] of quads) {
        if (!inside(qx, qz) || !inside(qx + qw - 1, qz + qd - 1)) failures.push(seed + ' net off the grass');
        for (const c of cells.values()) if (c.x >= qx && c.x < qx + qw && c.z >= qz && c.z < qz + qd) failures.push(seed + ' net covers a block at ' + c.x + ',' + c.z);
      }
      if (JSON.stringify(lesson.objectiveEvidence[1]) !== JSON.stringify({ net: 1, netDims: [L, W, H] })) failures.push(level + ' ' + seed + ' net objective dims');
    }
    expect(failures.slice(0, 12)).toEqual([]);
  }, 240000);
});

describe('each wrong choice is a named mistake', () => {
  it('every wrong choice has its own note and each step a hint; the notes read cleanly and never state the answer', () => {
    const failures = [];
    for (const [seed, level] of ROUNDS) {
      for (const npc of P.lesson(seed, level).npcs) {
        if (!npc.after || /undefined|NaN/.test(npc.after)) failures.push(seed + ' ' + npc.name + ' after');
        sequence(npc.question).forEach((q, i) => {
          const id = level + ' ' + seed + ' ' + npc.name + '#' + i, right = q.choices[q.correct];
          const wrong = q.choices.filter((_, ci) => ci !== q.correct);
          if (JSON.stringify(Object.keys(q.why).sort()) !== JSON.stringify(wrong.slice().sort())) failures.push(id + ' notes ' + Object.keys(q.why));
          if (!q.hint) failures.push(id + ' hint');
          Object.values(q.why).concat([q.hint]).forEach((t) => {
            if (/undefined|NaN|[–—]/.test(t) || t.length > 180) failures.push(id + ' note text: ' + t);
            if (t.includes(right)) failures.push(id + ' note gives away ' + right + ': ' + t);
          });
        });
      }
    }
    expect(failures.slice(0, 12)).toEqual([]);
  }, 240000);

  it('every step can be typed, a typed answer is read as its choice, and a typed distractor gets its note', () => {
    for (const [seed, level] of ROUNDS.filter(([s]) => s % 7 === 0)) {
      for (const npc of P.lesson(seed, level).npcs) sequence(npc.question).forEach((q) => {
        expect(coach.stepTypeable(q)).toBe(true);
        expect(coach.typedAnswer(q, String(num(q.choices[q.correct]))).status).toBe('correct');
        q.choices.forEach((ch, ci) => {
          if (ci === q.correct) return;
          expect(coach.typedAnswer(q, String(num(ch)))).toMatchObject({ status: 'choice', choiceIndex: ci });
          expect(coach.wrongFeedback(q, ch, 1, 'fallback')).toBe(q.why[ch]);
        });
      });
    }
  }, 120000);

  it('the answer is not always the middle choice: each position keys 10% to 50% of rounds, per step and level', () => {
    const tally = {}, unsorted = [];
    for (const [seed, level] of ROUNDS) for (const npc of P.lesson(seed, level).npcs) sequence(npc.question).forEach((q, i) => {
      const id = level + ' ' + npc.name + '#' + i;
      tally[id] = tally[id] || [0, 0, 0];
      tally[id][q.correct]++;
      const n = q.choices.map(num);
      if (!(n[0] < n[1] && n[1] < n[2])) unsorted.push(seed + ' ' + id + ': ' + q.choices);
    });
    expect(unsorted.slice(0, 5), 'choices are listed smallest first').toEqual([]);
    expect(Object.keys(tally)).toHaveLength(22);
    for (const [id, counts] of Object.entries(tally)) counts.forEach((n, pos) => {
      expect(n / SEEDS.length, id + ' keyed at position ' + pos).toBeGreaterThanOrEqual(0.10);
      expect(n / SEEDS.length, id + ' keyed at position ' + pos).toBeLessThanOrEqual(0.50);
    });
  }, 240000);

  it('a round number always builds the same round, and rounds differ', () => {
    for (const [seed, level] of [[1, 'core'], [42, 'stretch'], [777, 'core'], [4821, 'stretch'], [9999, 'core']]) expect(P.lesson(seed, level)).toEqual(P.lesson(seed, level));
    expect(P.lesson(42)).toEqual(P.lesson(42, 'core'));
    for (const level of LEVELS) expect(new Set(SEEDS.map((s) => JSON.stringify(P.lesson(s, level).structures))).size, level).toBeGreaterThan(5000);
  }, 240000);

  it('a stretch round does not offer the no-lid answer one step before asking for it', () => {
    const early = [];
    for (const seed of SEEDS) {
      const [, closed, noLid] = sequence(P.lesson(seed, 'stretch').npcs[1].question);
      if (closed.choices.map(num).includes(num(noLid.choices[noLid.correct]))) early.push(seed + ': ' + closed.choices);
    }
    expect(early.slice(0, 5)).toEqual([]);
  }, 120000);

  it('shared round numbers keep their worlds: a class playing round 42 or 4821 sees these blocks', () => {
    // Changing the generator must not move a round a class has already shared.
    const blocks = (seed, level) => P.lesson(seed, level).structures.map((x) => [x.x1, x.y1, x.z1, x.x2, x.y2, x.z2, x.block]);
    expect(blocks(42, 'core')).toEqual([[2,1,2,6,2,3,'diamond'],[12,1,2,16,2,4,'gold'],[2,1,12,3,1,15,'wood'],[12,1,12,16,3,14,'gold'],[12,1,15,13,3,16,'diamond']]);
    expect(blocks(42, 'stretch')).toEqual([[2,1,2,6,3,4,'diamond'],[12,1,2,17,3,4,'gold'],[2,1,12,4,2,12,'wood'],[12,1,12,14,4,14,'gold'],[12,1,15,13,3,17,'diamond']]);
    expect(blocks(4821, 'core')).toEqual([[2,1,2,4,3,5,'diamond'],[12,1,2,15,4,3,'gold'],[2,1,12,3,1,15,'wood'],[12,1,12,16,3,14,'gold'],[12,1,15,15,3,16,'diamond']]);
    expect(blocks(4821, 'stretch')).toEqual([[2,1,2,8,3,6,'diamond'],[12,1,2,16,3,3,'gold'],[2,1,12,6,3,12,'wood'],[12,1,12,16,2,13,'gold'],[12,1,14,13,4,15,'diamond']]);
    expect(P.lesson(42, 'stretch').title).toBe('Stretch Round 42');
    expect(P.lesson(42).title).toBe('Practice Round 42');
  });
});

describe('round numbers, storage and first-try counts', () => {
  function memoryStorage() {
    const m = new Map();
    return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), has: (k) => m.has(k) };
  }
  it('reads a round a student types, and round-trips it through the lesson key', () => {
    expect(['42', '0042', ' 7 ', '9999', 42].map(P.seed)).toEqual([42, 42, 7, 9999, 42]);
    expect(['0', '10000', '12a', 'abc', '', null, '-3', '4.5'].map(P.seed)).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
    expect([P.key(4821), P.key(4821, 'stretch')]).toEqual(['practice_4821', 'practice_s4821']);
    expect(P.round('practice_s4821')).toEqual({ seed: 4821, level: 'stretch', key: 'practice_s4821' });
    expect(P.round('practice_42')).toEqual({ seed: 42, level: 'core', key: 'practice_42' });
    // One key per round: no leading zeros, nothing out of range, nothing else.
    expect(['practice_0', 'practice_042', 'practice_s0', 'practice_12345', 'practice_x42', 'volumeExplorer', 'ai_42', null].map(P.round)).toEqual([null, null, null, null, null, null, null, null]);
    expect(P.parseRound('42')).toEqual({ seed: 42, level: 'core' });
    expect(P.parseRound('42', 'stretch')).toEqual({ seed: 42, level: 'stretch' });
    expect(P.parseRound('S42')).toEqual({ seed: 42, level: 'stretch' });
    expect(P.parseRound(' s 7 ', 'core')).toEqual({ seed: 7, level: 'stretch' });
    expect(['', 'S', 'S0', 'x9', '10000', 'SS4'].map((t) => P.parseRound(t))).toEqual([null, null, null, null, null, null]);
    expect([P.label({ seed: 42, level: 'core' }), P.label({ seed: 42, level: 'stretch' })]).toEqual(['Round 42', 'Stretch round 42']);
    expect(P.lesson(0)).toBeNull();
  });
  it('starting a round drops the unfinished one it replaces; finishing counts a round once', () => {
    const store = memoryStorage();
    const noSkills = { 'Counting Coach': [], 'Net Maker': [], 'Crate Builder': [], 'L-Shape Scout': [] };
    store.setItem('gw_progress_practice_round_12', JSON.stringify({ score: 2 }));
    P.begin(store, 'practice_12');
    expect(P.record(store).current).toBe('practice_12');
    P.begin(store, 'practice_12');
    expect(store.has('gw_progress_practice_round_12'), 'restarting the same round keeps its answers').toBe(true);
    store.setItem('gw_progress_stretch_round_12', JSON.stringify({ score: 1 }));
    P.begin(store, 'practice_s12');
    expect(store.has('gw_progress_practice_round_12'), 'core round 12 is a different round from stretch round 12').toBe(false);
    P.begin(store, 'practice_30');
    expect(store.has('gw_progress_stretch_round_12')).toBe(false);
    expect(P.record(store)).toEqual({ rounds: 0, done: [], current: 'practice_30', skills: noSkills });
    P.finish(store, 'practice_30'); P.finish(store, 'practice_30'); P.finish(store, 'practice_s30');
    expect(P.record(store)).toMatchObject({ rounds: 2, done: ['practice_30', 'practice_s30'] });
    // A new round avoids the current round and the finished ones, at its own level.
    let draws = [30, 99].map((n) => (n - 0.5) / 9999);
    expect(P.newSeed(store, 'core', () => draws.shift())).toBe(99);
    draws = [30, 99].map((n) => (n - 0.5) / 9999);
    expect(P.newSeed(store, 'stretch', () => draws.shift())).toBe(99);
    store.setItem('gw_practice', JSON.stringify({ rounds: 1, done: ['practice_31'], current: 'practice_30' }));
    draws = [31, 30, 99].map((n) => (n - 0.5) / 9999);
    expect(P.newSeed(store, 'stretch', () => draws.shift()), 'core 31 finished does not block stretch 31').toBe(31);
    // Anything else in storage is dropped, not trusted.
    store.setItem('gw_practice', JSON.stringify({ rounds: -4, done: ['practice_0', 7, 'practice_s9'], current: 'volumeExplorer', skills: { 'Net Maker': [true, 'yes', false], Other: [true] } }));
    expect(P.record(store)).toEqual({ rounds: 0, done: ['practice_s9'], current: '', skills: Object.assign({}, noSkills, { 'Net Maker': [true, false] }) });
  });
  it('tracks each station as a skill: its last six results, and the one to focus on next', () => {
    const store = memoryStorage();
    expect(P.skills).toEqual({ 'Counting Coach': 'Volume in layers', 'Net Maker': 'Surface area from nets', 'Crate Builder': 'Missing dimensions', 'L-Shape Scout': 'Composite shapes' });
    [true, true, false, true, true, true, false].forEach((ok) => P.skill(store, 'Counting Coach', ok));
    P.skill(store, 'Net Maker', false); P.skill(store, 'Net Maker', true);
    P.skill(store, 'Nobody', false);
    const rec = P.record(store);
    expect(rec.skills['Counting Coach']).toEqual([true, false, true, true, true, false]);
    expect(rec.skills['Net Maker']).toEqual([false, true]);
    expect(Object.keys(rec.skills)).toEqual(P.stations);
    expect(P.focus(rec.skills)).toMatchObject({ station: 'Net Maker', skill: 'Surface area from nets', share: 0.5 });
    expect(P.focus({ 'Counting Coach': [true, true] })).toBeNull();
    expect(P.focus({})).toBeNull();
  });
  it('a station counts as right first time only with no wrong answer to it since the round loaded', () => {
    const log = [
      { type: 'answer_wrong', data: { npc: 'Net Maker', step: 0 } },
      { type: 'lesson_load', data: {} },
      { type: 'answer_wrong', data: { npc: 'Crate Builder', step: 1 } },
      { type: 'answer_correct', data: { npc: 'Net Maker', step: 0 } }
    ];
    expect(P.stations.map((n) => P.stationMissed(log, n))).toEqual([false, false, true, false]);
    expect(P.stationMissed(null, 'Net Maker')).toBe(false);
  });
  it('counts the steps answered with no wrong answer first, since the lesson loaded', () => {
    const lesson = P.lesson(42);
    const log = [
      { type: 'answer_wrong', data: { npc: 'Net Maker', step: 0 } },
      { type: 'lesson_load', data: {} },
      { type: 'answer_wrong', data: { npc: 'Net Maker', step: 1 } },
      { type: 'answer_wrong', data: { npc: 'Net Maker', step: 1 } },
      { type: 'answer_wrong', data: { npc: 'Crate Builder', step: 0 } },
      { type: 'answer_correct', data: { npc: 'Net Maker', step: 1 } }
    ];
    expect(P.firstTry(log, lesson)).toEqual({ total: 11, firstTry: 9 });
    expect(P.firstTry([], lesson)).toEqual({ total: 11, firstTry: 11 });
  });
  it('the net objective ticks only for a net of that prism, in any orientation', () => {
    const rule = { net: 1, netDims: [4, 2, 3] };
    expect(coach.objectiveStatus(rule, { nets: [] })).toMatchObject({ done: false, evidence: 'Face the prism and use the Net tool (N)' });
    expect(coach.objectiveStatus(rule, { nets: [{ L: 5, W: 2, H: 3 }] }).done).toBe(false);
    expect(coach.objectiveStatus(rule, { nets: [{ L: 3, W: 4, H: 2 }] })).toMatchObject({ done: true, evidence: 'Net unfolded' });
    expect(coach.objectiveStatus({ net: 1 }, { nets: [{ L: 5, W: 2, H: 3 }] }).done).toBe(true);
  });
});

describe('badges', () => {
  const start = SOURCE.indexOf('  function geometryPerfectLessonInLog(');
  const badges = new Function(SOURCE.slice(start, SOURCE.indexOf('  var SAMPLE_LESSONS = {')) + '\nreturn ACHIEVEMENTS;')();
  const check = (id, log) => badges.find((b) => b.id === id).check(log);
  const done = (key) => ({ type: 'lesson_complete', data: { practiceRound: key } });
  it('Practice Pro takes three different finished rounds; replaying one round does not count', () => {
    expect(check('practice_3', [done('practice_5'), done('practice_5'), done('practice_5')])).toBe(false);
    expect(check('practice_3', [done('practice_5'), done('practice_6'), { type: 'lesson_complete', data: {} }])).toBe(false);
    expect(check('practice_3', [done('practice_5'), done('practice_s5'), done('practice_7')])).toBe(true);
  });
  it('Explorer counts practice rounds as one lesson, so it cannot be earned by rerolling', () => {
    const load = (title, practiceRound) => ({ type: 'lesson_load', data: { title, practiceRound } });
    expect(check('five_lessons', [1, 2, 3, 4, 5].map((n) => load('Practice Round ' + n, 'practice_' + n)))).toBe(false);
    expect(check('five_lessons', ['A', 'B', 'C', 'D'].map((t) => load(t)).concat([load('Stretch Round 9', 'practice_s9')]))).toBe(true);
  });
});

describe('practice rounds, mounted', () => {
  function fakeEngine(npcs, log) {
    const canvas = document.createElement('canvas');
    const v = () => ({ x: 0, y: 0, z: 0, distanceTo: () => 99, set() {}, clone() { return v(); }, toArray: () => [0, 0, 0], copy() { return this; }, sub() { return this; }, normalize() { return this; }, lengthSq: () => 1, length: () => 1 });
    return { clearWorld() {}, scene: { remove() {}, add() {}, children: [], background: { setRGB() {} }, fog: { color: { setRGB() {} } } }, renderer: { dispose() {}, domElement: canvas },
      camera: { position: { x: 0, y: 0, z: 0, set: vi.fn(), toArray: () => [0, 0, 0] }, quaternion: { x: 0, y: 0, z: 0, w: 1, toArray: () => [0, 0, 0, 1] }, rotation: { x: 0, y: 0, z: 0 }, getWorldDirection: (o) => o || v(), updateProjectionMatrix() {}, lookAt: vi.fn(), up: v() },
      blocks: {}, npcs: npcs || [], _particles: [], _dimLines: [], _selectionGlows: [], _layerGhosts: [], moveState: {}, lookState: {}, euler: { x: 0, y: 0, z: 0, setFromQuaternion() {} },
      isLocked: false, isInputActive: () => false, blockUnderCrosshair: () => null, loadLesson: vi.fn(), placeBlock() {}, removeBlock() {}, releaseInput() {}, getBlocksArr: () => [],
      clock: { getElapsedTime: () => 0, getDelta: () => 0.016 }, logEvent: vi.fn(), sessionLog: log || [], geometryHomeLessons: [], startPracticeRound: vi.fn() };
  }
  const spr = () => ({ position: { x: 4, y: 1, z: 4 }, scale: { set() {}, x: 1, y: 1 }, material: { opacity: 1, color: { setHex() {} } }, visible: true, rotation: { x: 0, y: 0, z: 0 } });
  const live = (data) => ({ data, body: spr(), head: spr(), label: spr(), prompt: spr(), qMark: spr(), _arms: [], _eyeParts: [] });
  function mount(bucket) {
    const container = document.createElement('div'); document.body.appendChild(container);
    const toolData = { _threeLoaded: true, geometryWorld: Object.assign({}, bucket) };
    let bump = null;
    const ctx = makeCtx({ toolData, update: (b, k, val) => { toolData[b] = Object.assign({}, toolData[b], { [k]: val }); if (bump) bump(); }, updateMulti: (b, patch) => { toolData[b] = Object.assign({}, toolData[b], patch); if (bump) bump(); } });
    const Comp = () => { const st = React.useState(0); bump = () => st[1]((n) => n + 1); return cfg.render(ctx); };
    const root = ReactDOMClient.createRoot(container);
    React.act(() => { root.render(React.createElement(Comp)); });
    React.act(() => bump());
    return { container, bucket: () => toolData.geometryWorld, unmount: () => { React.act(() => root.unmount()); container.remove(); } };
  }
  const base = { worldActive: true, activeLesson: 'practice_42', _introShownOnce: true, tutorialDismissed: true, showLessonIntro: false, npcTypewriterNpc: 0, npcTypewriterPos: 999 };
  beforeEach(() => { window.THREE = makeThreeStub(); localStorage.clear(); });
  afterEach(() => { delete window[ENGINE_KEY]; document.body.innerHTML = ''; });

  it('the intro for a round shows that round, and Start loads it and records it as the current round', () => {
    window[ENGINE_KEY] = fakeEngine();
    const m = mount(Object.assign({}, base, { showLessonIntro: true }));
    expect(m.container.textContent).toContain('Practice Round 42');
    React.act(() => m.container.querySelector('.gw-intro-start').click());
    expect(window[ENGINE_KEY].loadLesson).toHaveBeenCalledTimes(1);
    expect(window[ENGINE_KEY].loadLesson.mock.calls[0][0]).toMatchObject({ title: 'Practice Round 42', practice: { seed: 42, level: 'core', key: 'practice_42' } });
    expect(P.record(localStorage).current).toBe('practice_42');
    m.unmount();
  });

  it('the settings lesson list offers the current round, a new one and a new stretch one', () => {
    window[ENGINE_KEY] = fakeEngine();
    const m = mount(Object.assign({}, base, { showGameSettings: true }));
    const select = [...m.container.querySelectorAll('select')].find((s) => [...s.options].some((o) => o.value === 'practice_new'));
    expect([...select.options].filter((o) => /practice|round/i.test(o.textContent)).map((o) => o.value)).toEqual(['practice_42', 'practice_new', 'practice_new_s']);
    expect(select.value).toBe('practice_42');
    Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(select, 'practice_new');
    React.act(() => select.dispatchEvent(new window.Event('change', { bubbles: true })));
    expect(m.bucket().activeLesson).toMatch(/^practice_\d{1,4}$/);
    expect(m.bucket().activeLesson).not.toBe('practice_new');
    expect(m.bucket().showLessonIntro).toBe(true);
    m.unmount();
    // Choosing closes the settings panel, so the stretch choice gets its own visit.
    window[ENGINE_KEY] = fakeEngine();
    const s2 = mount(Object.assign({}, base, { showGameSettings: true }));
    const select2 = [...s2.container.querySelectorAll('select')].find((x) => [...x.options].some((o) => o.value === 'practice_new_s'));
    Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(select2, 'practice_new_s');
    React.act(() => select2.dispatchEvent(new window.Event('change', { bubbles: true })));
    expect(s2.bucket().activeLesson).toMatch(/^practice_s[1-9]\d{0,3}$/);
    s2.unmount();
  });

  it('a finished round shows first-try steps and rounds finished, and New round starts another', () => {
    const lesson = P.lesson(42);
    const log = [{ type: 'lesson_load', data: {} }, { type: 'answer_wrong', data: { npc: 'Crate Builder', step: 1 } }];
    window[ENGINE_KEY] = fakeEngine(lesson.npcs.map(live), log);
    P.finish(localStorage, 'practice_42');
    const m = mount(Object.assign({}, base, { totalQ: 4, score: 4, answeredNpcs: { 0: true, 1: true, 2: true, 3: true } }));
    const stats = m.container.querySelector('.gw-completion-practice-stats');
    expect(stats.textContent).toBe('10 of 11 steps right first time. 1 practice round finished.');
    // The skills this round, and what to practise next (from the saved record).
    const chips = [...m.container.querySelectorAll('.gw-completion-skills li')];
    expect(chips.map((c) => c.getAttribute('data-first-try'))).toEqual(['true', 'true', 'false', 'true']);
    expect(chips[2].textContent).toContain('Missing dimensions: took another try');
    expect(m.container.querySelector('.gw-completion-skills ul').getAttribute('aria-label')).toBe('Skills this round');
    expect(m.container.querySelector('.gw-completion-focus')).toBeNull();
    const again = m.container.querySelector('.gw-completion-practice');
    expect(again.textContent).toContain('New round');
    React.act(() => again.click());
    // The tool's own engine.startPracticeRound: a different round, loaded and made current.
    const next = window[ENGINE_KEY].loadLesson.mock.calls.at(-1)[0];
    expect(next.practice).toMatchObject({ level: 'core' });
    expect(next.practice.seed).not.toBe(42);
    expect(m.bucket().activeLesson).toBe(next.practice.key);
    expect(P.record(localStorage).current).toBe(next.practice.key);
    m.unmount();
  });

  it('a finished stretch round says what to focus on, and New round stays at the stretch level', () => {
    const lesson = P.lesson(42, 'stretch');
    localStorage.setItem('gw_practice', JSON.stringify({ rounds: 3, done: [], current: 'practice_s42', skills: { 'Net Maker': [true, false], 'Crate Builder': [true, true] } }));
    window[ENGINE_KEY] = fakeEngine(lesson.npcs.map(live), [{ type: 'lesson_load', data: {} }]);
    const m = mount(Object.assign({}, base, { activeLesson: 'practice_s42', totalQ: 4, score: 4, answeredNpcs: { 0: true, 1: true, 2: true, 3: true } }));
    expect(m.container.textContent).toContain('Stretch Round 42');
    expect(m.container.querySelector('.gw-completion-focus').textContent).toBe('Focus next: Surface area from nets.');
    React.act(() => m.container.querySelector('.gw-completion-practice').click());
    const next = window[ENGINE_KEY].loadLesson.mock.calls.at(-1)[0];
    expect(next.practice.level).toBe('stretch');
    expect(m.bucket().activeLesson).toBe('practice_s' + next.practice.seed);
    m.unmount();
  });

  it('solving a station records its skill: right first time, or not after a wrong answer', () => {
    const lesson = P.lesson(42), coachNpc = lesson.npcs[0], last = sequence(coachNpc.question).at(-1);
    const run = (log) => {
      window[ENGINE_KEY] = fakeEngine(lesson.npcs.map(live), log);
      const m = mount(Object.assign({}, base, { totalQ: 4, score: 0, showNpcDialog: true, dialogNpcIdx: 0, npcFollowUpStep: { 0: 2 } }));
      const right = [...m.container.querySelectorAll('.gw-dialog--npc button')].find((b) => b.textContent === last.choices[last.correct]);
      React.act(() => right.click());
      m.unmount();
    };
    run([{ type: 'lesson_load', data: {} }]);
    run([{ type: 'lesson_load', data: {} }, { type: 'answer_wrong', data: { npc: 'Counting Coach', step: 1 } }]);
    expect(P.record(localStorage).skills['Counting Coach']).toEqual([true, false]);
    expect(P.record(localStorage).skills['Net Maker']).toEqual([]);
  });

  it('a finished built-in lesson offers a practice round only once every lesson is done', () => {
    window[ENGINE_KEY] = fakeEngine();
    const m = mount(Object.assign({}, base, { activeLesson: 'volumeExplorer', totalQ: 3, score: 3 }));
    expect(m.container.querySelector('.gw-completion-dialog')).not.toBeNull();
    expect(m.container.querySelector('.gw-completion-practice')).toBeNull();
    m.unmount();
    // Every lesson finished: practice is what is left, and it is not a "next lesson".
    const done = {};
    Object.values(window.StemLab.geometryWorldWorksheets.presets()).forEach((l) => { done['gw_progress_' + l.title.replace(/\W+/g, '_').toLowerCase()] = true; });
    localStorage.setItem('gw_completed_lessons', JSON.stringify(done));
    window[ENGINE_KEY] = fakeEngine();
    const all = mount(Object.assign({}, base, { activeLesson: 'volumeExplorer', totalQ: 3, score: 3 }));
    expect(all.container.querySelector('.gw-completion-practice').textContent).toContain('Practice round');
    expect(all.container.querySelector('.gw-completion-practice').classList.contains('gw-completion-next')).toBe(false);
    all.unmount();
  });

  it('Objectives: the net objective ticks from a net_unfold of the gold prism', () => {
    const lesson = P.lesson(42), [L, W, H] = lesson.objectiveEvidence[1].netDims;
    const log = [{ type: 'lesson_load', data: {} }, { type: 'net_unfold', data: { L: 9, W: 9, H: 9, surfaceArea: 486 } }];
    window[ENGINE_KEY] = fakeEngine(lesson.npcs.map(live), log);
    let m = mount(Object.assign({}, base, { objectivesOpen: true, totalQ: 4, score: 1, answeredNpcs: { 0: true } }));
    let items = [...m.container.querySelectorAll('.gw-objective-item')];
    expect(items.map((i) => i.getAttribute('data-complete'))).toEqual(['true', 'false', 'false', 'false', 'false']);
    expect(items[1].textContent).toContain('Face the prism and use the Net tool (N)');
    m.unmount(); // unmounting destroys the engine
    log.push({ type: 'net_unfold', data: { L: H, W: L, H: W, surfaceArea: 0 } });
    window[ENGINE_KEY] = fakeEngine(lesson.npcs.map(live), log);
    m = mount(Object.assign({}, base, { objectivesOpen: true, totalQ: 4, score: 1, answeredNpcs: { 0: true } }));
    items = [...m.container.querySelectorAll('.gw-objective-item')];
    expect(items[1].getAttribute('data-complete')).toBe('true');
    expect(items[1].textContent).toContain('Net unfolded');
    m.unmount();
  });
});
