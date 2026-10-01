// Geometry World: Scale Up (a guided lesson) and Skyline City (a second place to explore).
//
// Scale Up teaches that doubling every edge makes 8 copies. The world has to show it:
// the doubled and tripled prisms are built from copies of prism A in alternating
// materials, so every piece must BE a copy of A and touching copies must differ, or
// a student who counts the pieces gets a different answer from the one keyed.
// Skyline City's guides and activity cards quote numbers (volumes, surface areas, a
// bounding box); each one is measured from the world here, the way Measure (M) and the
// Net tool (N) would. Answer keys: geometry_world_lesson_answer_keys.test.js.

import {afterAll, beforeAll, describe, expect, it, vi} from 'vitest';
import {readFileSync} from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_geometryworld.js', 'utf8');
const originalLab = window.StemLab;
let lessons, api;
beforeAll(() => {
  window.StemLab = {registerTool: vi.fn()};
  new Function(source)();
  api = window.StemLab.geometryWorldWorksheets;
  lessons = api.presets();
}, 120000);
afterAll(() => { window.StemLab = originalLab; });

// ── World model (loadLesson + fillBlocks: inclusive fills, first fill owns a cell,
// a flat fill at ground.y is ground; Measure floods one layer, any material) ──
const key = (x, y, z) => x + ',' + y + ',' + z;
const DIRS = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
function world(lesson) {
  const cells = new Map(), g = lesson.ground;
  for (let x = g.xMin; x <= g.xMax; x++) for (let z = g.zMin; z <= g.zMax; z++) cells.set(key(x, g.y, z), {x, y: g.y, z, layer: 'ground'});
  (lesson.structures || []).forEach((s, i) => {
    const layer = s.y1 === g.y && s.y2 === g.y ? 'ground' : 'lesson';
    for (let x = s.x1; x <= s.x2; x++) for (let y = s.y1; y <= s.y2; y++) for (let z = s.z1; z <= s.z2; z++) {
      const k = key(x, y, z);
      if (layer === 'ground' || !cells.has(k)) cells.set(k, {x, y, z, type: s.block, layer, fill: i});
    }
  });
  return cells;
}
function flood(lesson, seed) {
  const cells = world(lesson), start = cells.get(key(...seed));
  if (!start || start.layer !== 'lesson') throw Error('No lesson block at ' + seed);
  const seen = new Set([key(...seed)]), todo = [start], out = [];
  while (todo.length) {
    const c = todo.pop(); out.push(c);
    for (const d of DIRS) {
      const k = key(c.x + d[0], c.y + d[1], c.z + d[2]), n = cells.get(k);
      if (n && !seen.has(k) && n.layer === 'lesson') { seen.add(k); todo.push(n); }
    }
  }
  const lo = a => Math.min(...out.map(c => c[a])), hi = a => Math.max(...out.map(c => c[a]));
  const m = {cells: out, count: out.length, L: hi('x') - lo('x') + 1, W: hi('z') - lo('z') + 1, H: hi('y') - lo('y') + 1, min: {x: lo('x'), y: lo('y'), z: lo('z')}};
  m.dims = [m.L, m.W, m.H];
  m.bbox = m.L * m.W * m.H;
  m.layer = y => out.filter(c => c.y === m.min.y + y).length;
  m.surface = exposed(out);
  m.fills = [...new Set(out.map(c => c.fill))].map(i => lesson.structures[i]);
  return m;
}
function exposed(cs) {
  const set = new Set(cs.map(c => key(c.x, c.y, c.z)));
  let n = 0; for (const c of cs) for (const d of DIRS) if (!set.has(key(c.x + d[0], c.y + d[1], c.z + d[2]))) n++;
  return n;
}
const dimsOf = s => [s.x2 - s.x1 + 1, s.z2 - s.z1 + 1, s.y2 - s.y1 + 1];
const touch = (a, b) => {
  // Two boxes share a face: overlapping on two axes and adjacent on the third.
  const ov = (a1, a2, b1, b2) => a1 <= b2 && b1 <= a2, adj = (a1, a2, b1, b2) => a2 + 1 === b1 || b2 + 1 === a1;
  const x = [a.x1, a.x2, b.x1, b.x2], y = [a.y1, a.y2, b.y1, b.y2], z = [a.z1, a.z2, b.z1, b.z2];
  return (adj(...x) && ov(...y) && ov(...z)) || (ov(...x) && adj(...y) && ov(...z)) || (ov(...x) && ov(...y) && adj(...z));
};
// Every fill in `m` is one piece of dims `piece`, and pieces that touch differ in material.
function builtFromCopies(m, piece) {
  const wrong = m.fills.filter(f => dimsOf(f).join('x') !== piece.join('x'));
  const clashes = [];
  m.fills.forEach((a, i) => m.fills.slice(i + 1).forEach(b => { if (touch(a, b) && a.block === b.block) clashes.push(dimsOf(a) + '@' + [a.x1, a.y1, a.z1] + ' ~ ' + [b.x1, b.y1, b.z1]); }));
  return {wrong: wrong.length, clashes};
}
// A walker needs room: no lesson block within `r` horizontally at body height.
function crowded(lesson, pos, r) {
  const cells = world(lesson);
  for (const c of cells.values()) {
    if (c.layer !== 'lesson' || c.y < 1 || c.y > 2) continue;
    if (Math.abs(c.x + 0.5 - pos[0]) < r + 0.5 && Math.abs(c.z + 0.5 - pos[2]) < r + 0.5) return key(c.x, c.y, c.z);
  }
  return null;
}
// engine.useNetTool lays a cross of six flat quads [x, z, width, depth] from
// baseX = minX + L + 3, baseZ = minZ (the same faces as the practice-round test).
function netQuads(minX, minZ, L, W, H) {
  const bx = minX + L + 3, bz = minZ;
  return [[bx - W, bz, W, H], [bx, bz, L, H], [bx + L, bz, W, H], [bx + L + W, bz, L, H], [bx, bz - W, L, W], [bx, bz + H, L, W]];
}
// Faces that leave the ground or lie over a lesson model or the build pad.
function netProblems(lesson, quads, label) {
  const g = lesson.ground, cells = world(lesson), pad = (lesson.structures || []).find(s => s.id === 'build-pad'), out = [];
  for (const [qx, qz, qw, qd] of quads) {
    if (qx < g.xMin || qx + qw - 1 > g.xMax || qz < g.zMin || qz + qd - 1 > g.zMax) out.push(label + ' face at ' + qx + ',' + qz + ' leaves the ground');
    for (const c of cells.values()) if (c.layer === 'lesson' && c.x >= qx && c.x < qx + qw && c.z >= qz && c.z < qz + qd) { out.push(label + ' face covers ' + key(c.x, c.y, c.z)); break; }
    if (pad && pad.x1 < qx + qw && qx <= pad.x2 && pad.z1 < qz + qd && qz <= pad.z2) out.push(label + ' face covers the build pad');
  }
  return out;
}
function steps(lesson) {
  const out = [];
  for (const npc of lesson.npcs) {
    const flat = q => q ? [q, ...(q.followUp || []).flatMap(flat)] : [];
    flat(npc.question).forEach((q, i) => out.push({npc: npc.name, i, q}));
  }
  return out;
}
const stepOf = (lesson, name, i) => steps(lesson).find(s => s.npc === name && s.i === i).q;
const npc = (lesson, name) => lesson.npcs.find(n => n.name === name);
function layoutProblems(lesson) {
  const g = lesson.ground, problems = [], solid = (lesson.structures || []).filter(s => !(s.y1 === g.y && s.y2 === g.y));
  (lesson.structures || []).forEach((s, i) => {
    if (s.x1 < g.xMin || s.x2 > g.xMax || s.z1 < g.zMin || s.z2 > g.zMax) problems.push('fill ' + i + ' leaves the ground');
  });
  solid.forEach((a, i) => solid.slice(i + 1).forEach(b => {
    if (a.x1 <= b.x2 && b.x1 <= a.x2 && a.y1 <= b.y2 && b.y1 <= a.y2 && a.z1 <= b.z2 && b.z1 <= a.z2) problems.push('fills overlap at ' + [a.x1, a.y1, a.z1] + ' and ' + [b.x1, b.y1, b.z1]);
  }));
  const spots = [['spawn', lesson.spawnPoint]].concat(lesson.npcs.map(n => [n.name, n.position]));
  spots.forEach(([name, p]) => {
    const hit = crowded(lesson, p, 0.8);
    if (hit) problems.push(name + ' stands against a block at ' + hit);
    if (p[0] < g.xMin || p[0] > g.xMax || p[2] < g.zMin || p[2] > g.zMax) problems.push(name + ' is off the ground');
  });
  // E talks to the character you face nearby; two characters close together share a spot.
  lesson.npcs.forEach((a, i) => lesson.npcs.slice(i + 1).forEach(b => {
    if (Math.hypot(a.position[0] - b.position[0], a.position[2] - b.position[2]) < 4) problems.push(a.name + ' and ' + b.name + ' stand too close');
  }));
  return problems;
}

describe('Scale Up: the world shows the scale factor', () => {
  it('builds prism B and prism C from copies of prism A, doubled and tripled on every edge', () => {
    const L = lessons.scaleUp, A = flood(L, [2,1,2]), B = flood(L, [2,1,8]), C = flood(L, [2,1,16]);
    expect(A.dims).toEqual([2, 1, 1]);
    expect(B.dims).toEqual(A.dims.map(d => 2 * d));
    expect(C.dims).toEqual(A.dims.map(d => 3 * d));
    expect([B.count, C.count]).toEqual([8 * A.count, 27 * A.count]);
    expect([B.fills.length, C.fills.length]).toEqual([8, 27]);
    for (const m of [B, C]) expect(builtFromCopies(m, A.dims)).toEqual({wrong: 0, clashes: []});
    // Solid prisms, so the Net tool unfolds them.
    for (const m of [A, B, C]) expect(m.count).toBe(m.bbox);
  });

  it('shows the 1, 8, 27 pattern in three cubes built from unit cubes', () => {
    const L = lessons.scaleUp;
    [[16,1,2], [18,1,2], [21,1,2]].forEach((seed, i) => {
      const n = i + 1, m = flood(L, seed);
      expect(m.dims).toEqual([n, n, n]);
      expect(m.count).toBe(n ** 3);
      expect(builtFromCopies(m, [1, 1, 1])).toEqual({wrong: 0, clashes: []});
    });
  });

  it('says only what the world shows, and does not give away the answers it asks for', () => {
    const L = lessons.scaleUp, A = flood(L, [2,1,2]), B = flood(L, [2,1,8]), C = flood(L, [2,1,16]);
    expect(npc(L, 'Scale Guide').dialogue).toContain(A.L + ' long, ' + A.W + ' wide, ' + A.H + ' tall');
    expect(npc(L, 'Triple Tester').dialogue).toContain(C.L + ' long, ' + C.W + ' wide, ' + C.H + ' tall');
    expect(npc(L, 'Pattern Pro').dialogue).toContain('edges of 1, 2 and 3');
    expect(stepOf(L, 'Scale Scout', 0).text).toContain('Prism A is ' + A.L + ' blocks long');
    expect(stepOf(L, 'Scale Scout', 2).text).toContain('Prism A holds ' + A.count + ' cubic units');
    expect(stepOf(L, 'Surface Sage', 0).text).toContain('(' + A.L + ' by ' + A.W + ' by ' + A.H + ')');
    expect(stepOf(L, 'Surface Sage', 2).text).toContain('A needs ' + A.surface + ' square units of paint and B needs ' + B.surface);
    expect(stepOf(L, 'Triple Tester', 1).text).toContain('Each copy of A holds ' + A.count + ' cubic units');
    // Anyone can talk to anyone first: no line gives away another character's answer.
    // The Objectives panel is open from the start, so its lines and unbuilt hints count too.
    const coach = window.StemLab.geometryWorldAnswerCoaching, build = L.objectiveEvidence[5];
    const hints = [[], [{x: 0, y: 1, z: 0}, {x: 1, y: 1, z: 0}, {x: 2, y: 1, z: 0}]].map(cells => coach.objectiveStatus(build, {builds: coach.studentBuilds(cells)}).evidence);
    const early = L.npcs.map(n => n.dialogue).concat(L.npcs.filter(n => n.question).map(n => n.question.text), L.objectives, hints).join(' | ');
    expect(early).not.toMatch(/\b4 long\b|\b8 copies\b|\b16 cubic\b|\b27 copies\b|\b54 cubic\b|\b40 square\b|\b90 square\b|\b4 by 2 by 2\b|\b2 by 2 by 4\b/);
    expect(hints).toEqual(['Build prism A doubled from unit cubes', 'Your build is 3 by 1 by 1. Check each edge of prism A doubled.']);
    // The coaching quotes the same numbers.
    expect(api.presets().scaleUp.npcs.find(n => n.name === 'Surface Sage').after).toContain(A.surface + ' became ' + B.surface);
    expect(npc(L, 'Triple Tester').after).toContain(A.surface + ' became ' + C.surface);
    expect(npc(L, 'Triple Tester').after).toContain(A.count + ' became ' + C.count);
  });

  it('spreads the keyed answers across smallest, middle and largest', () => {
    // A lesson about scaling up must not be passable by always picking the biggest number.
    const ranks = [0, 0, 0];
    for (const {q} of steps(lessons.scaleUp)) {
      const values = q.choices.map(c => Number((String(c).match(/^(\d+)/) || [])[1]));
      if (values.some(Number.isNaN)) continue;
      const sorted = values.slice().sort((a, b) => a - b);
      ranks[sorted.indexOf(values[q.correct])]++;
    }
    const total = ranks.reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThanOrEqual(10);
    ranks.forEach((n, i) => {
      expect(n, 'rank ' + i + ' of ' + ranks.join('/')).toBeGreaterThan(0);
      expect(n / total, 'rank ' + i + ' of ' + ranks.join('/')).toBeLessThanOrEqual(0.4);
    });
  });

  it('leaves room to walk, and each net unfolds onto open ground', () => {
    const L = lessons.scaleUp;
    expect(layoutProblems(L)).toEqual([]);
    for (const seed of [[2,1,2], [2,1,8], [2,1,16]]) {
      const m = flood(L, seed);
      expect(netProblems(L, netQuads(m.min.x, m.min.z, m.L, m.W, m.H), 'net of ' + seed)).toEqual([]);
    }
  });

  it('asks for prism A doubled, built on a clear sand pad with room for its net', () => {
    const L = lessons.scaleUp, A = flood(L, [2,1,2]), pad = L.structures.find(s => s.id === 'build-pad'), rule = L.objectiveEvidence[5];
    expect([pad.y1, pad.y2, pad.measurementLayer, pad.block]).toEqual([0, 0, 'ground', 'sand']);
    expect(rule.build.dims.slice().sort()).toEqual(A.dims.map(d => 2 * d).sort());
    expect(L.objectives[5]).toContain(rule.build.label);
    expect(rule.build.label).toBe('prism A doubled');
    expect(npc(L, 'Scale Guide').dialogue).toContain('build prism A doubled on the sand pad');
    const onPad = [...world(L).values()].filter(c => c.layer === 'lesson' && c.x >= pad.x1 && c.x <= pad.x2 && c.z >= pad.z1 && c.z <= pad.z2);
    expect(onPad).toEqual([]);
    // Any way up, at either corner of the pad, it fits and its net lands on open ground.
    const [a, b, c] = rule.build.dims, problems = [];
    for (const [l, w, h] of [[a, b, c], [a, c, b], [b, a, c], [b, c, a], [c, a, b], [c, b, a]]) {
      if (l > pad.x2 - pad.x1 + 1 || w > pad.z2 - pad.z1 + 1) problems.push(l + 'x' + w + ' does not fit');
      for (const [x0, z0] of [[pad.x1, pad.z1], [pad.x2 - l + 1, pad.z2 - w + 1]]) {
        netProblems(L, netQuads(x0, z0, l, w, h), l + 'x' + w + 'x' + h + ' at ' + x0 + ',' + z0).filter(p => !/build pad/.test(p)).forEach(p => problems.push(p));
      }
    }
    expect(problems).toEqual([]);
  });

  it('the build rule ticks for a solid 4 by 2 by 2 of unit cubes, any way up, and says what is wrong otherwise', () => {
    const coach = window.StemLab.geometryWorldAnswerCoaching;
    const box = (l, w, h, x0 = 0, shape) => { const out = []; for (let x = 0; x < l; x++) for (let z = 0; z < w; z++) for (let y = 0; y < h; y++) out.push({x: x0 + x, y: 1 + y, z, shape}); return out; };
    const rule = {build: {dims: [4, 2, 2]}};
    const status = (cells) => coach.objectiveStatus(rule, {builds: coach.studentBuilds(cells)});
    expect(status(box(4, 2, 2))).toEqual({done: true, evidence: 'You built a 4 by 2 by 2 prism'});
    expect(coach.objectiveStatus({build: {dims: [4, 2, 2], label: 'prism A doubled'}}, {builds: coach.studentBuilds(box(2, 4, 2))})).toEqual({done: true, evidence: 'You built prism A doubled: 4 by 2 by 2'});
    expect(status(box(2, 2, 4)).done).toBe(true);
    expect(status(box(2, 4, 2)).done).toBe(true);
    expect(status([])).toEqual({done: false, evidence: 'Build a solid 4 by 2 by 2 prism from unit cubes'});
    expect(status(box(3, 2, 2))).toEqual({done: false, evidence: 'Your build is 3 by 2 by 2. Aim for 4 by 2 by 2.'});
    expect(status(box(4, 2, 2).filter((c, i) => i !== 5))).toEqual({done: false, evidence: 'Your build (4 by 2 by 2) has gaps. Fill it in.'});
    expect(status(box(4, 2, 2).map((c, i) => (i === 0 ? {...c, shape: 'halfA'} : c)))).toEqual({done: false, evidence: 'Use whole unit cubes, not part blocks'});
    // A cube that touches it makes one 17-block build; a cube apart is a separate build.
    expect(status(box(4, 2, 2).concat(box(1, 1, 1, 4))).done).toBe(false);
    expect(status(box(4, 2, 2).concat(box(1, 1, 1, 6))).done).toBe(true);
    expect(coach.studentBuilds(box(4, 2, 2).concat(box(1, 1, 1, 6))).map(g => [g.count, g.L, g.W, g.H, g.solid])).toEqual([[16, 4, 2, 2, true], [1, 1, 1, 1, true]]);
    expect(coach.studentBuilds([{x: 0, y: 1, z: 0}, {x: 0, y: 1, z: 0}, {x: NaN, y: 1, z: 0}, null])).toEqual([{L: 1, W: 1, H: 1, count: 1, solid: true, cubes: true}]);
  });

  it('is the last lesson in the chain, and its Net objective names prism B', () => {
    const order = source.match(/var LESSON_ORDER =\[([^\]]*)\]/)[1].split(',').map(s => s.trim().replace(/'/g, ''));
    expect(order[order.length - 1]).toBe('scaleUp');
    const rule = lessons.scaleUp.objectiveEvidence[1];
    expect(rule.net).toBe(1);
    expect(rule.netDims.slice().sort()).toEqual(flood(lessons.scaleUp, [2,1,8]).dims.slice().sort());
    expect(lessons.scaleUp.objectives[1]).toMatch(/prism B/);
  });
});

describe('Skyline City: a second place to explore', () => {
  it('is an explore world with no questions, like the Garden', () => {
    const S = lessons.skylineCity;
    for (const k of ['skylineCity', 'geometryGarden']) expect([lessons[k].explore, typeof lessons[k].exploreName, typeof lessons[k].exploreBlurb], k).toEqual([true, 'string', 'string']);
    expect(Object.keys(lessons).filter(k => lessons[k].explore).sort()).toEqual(['geometryGarden', 'skylineCity']);
    expect(S.npcs.every(n => n.question === null)).toBe(true);
    const names = new Set(S.npcs.map(n => n.name));
    expect(S.activities.filter(a => !names.has(a.npcName)).map(a => a.id)).toEqual([]);
    expect(new Set(S.activities.map(a => a.id)).size).toBe(S.activities.length);
    expect(new Set(S.structures.map(s => s.id)).size).toBe(S.structures.length);
    const goal = S.activities.find(a => a.id === 'city-packing').buildGoal;
    expect(goal).toEqual({metric: 'occupiedVolume', comparator: 'eq', target: 24, unitCubesOnly: true});
  });

  it('quotes only numbers the world gives', () => {
    const S = lessons.skylineCity, card = id => S.activities.find(a => a.id === id), text = a => [a.challenge, a.hint, ...a.successCriteria, a.reflection].join(' ');
    // Three buildings of equal volume, different surface.
    const towers = [[2,1,10], [6,1,10], [10,1,9]].map(s => flood(S, s));
    expect(towers.map(t => t.count)).toEqual([24, 24, 24]);
    expect(towers.map(t => t.dims)).toEqual([[2, 2, 6], [2, 3, 4], [4, 6, 1]]);
    expect(text(card('city-towers'))).toContain('2 by 2 by 6, the brick tower 2 by 3 by 4 and the plaza 4 by 6 by 1');
    expect(text(card('city-towers'))).toContain(towers.map(t => t.surface).join(', ').replace(/, (\d+)$/, ' and $1'));
    expect(npc(S, 'Tower Guide').dialogue).toContain('each hold 24 cubic units');
    // The least surface belongs to the most cube-like building.
    expect(Math.min(...towers.map(t => t.surface))).toBe(towers[1].surface);
    // Floors stack into volume.
    const sky = flood(S, [18,1,10]);
    expect([sky.layer(0), sky.H, sky.count]).toEqual([9, 10, 90]);
    expect(text(card('city-skyscraper'))).toMatch(/9 cubes in one floor.*10 floors.*90 cubic units/);
    // A bridge that is mostly air.
    const bridge = flood(S, [25,1,10]);
    expect([bridge.count, bridge.bbox, bridge.dims.join(' ')]).toEqual([28, 64, '8 2 4']);
    expect(text(card('city-bridge'))).toContain('28 cubic units: 6 + 6 + 16');
    expect(text(card('city-bridge'))).toContain('64 cubic units');
    expect(bridge.count * 2).toBeLessThan(bridge.bbox);
    // A stepped building.
    const stepped = flood(S, [3,1,0]);
    expect([stepped.layer(0), stepped.layer(1), stepped.layer(2), stepped.count, stepped.bbox]).toEqual([25, 9, 1, 35, 75]);
    expect(text(card('city-stepped'))).toMatch(/25, 9 and 1 cubes.*35 cubic units.*5 by 5 by 3 box.*75/);
    // A house and its double: 8 houses inside.
    const house = flood(S, [13,1,2]), double = flood(S, [17,1,0]);
    expect([house.dims, house.count, double.dims, double.count]).toEqual([[2, 2, 2], 8, [4, 4, 4], 64]);
    expect(builtFromCopies(double, house.dims)).toEqual({wrong: 0, clashes: []});
    expect(double.fills.length).toBe(8);
    expect(text(card('city-scale'))).toMatch(/house holds 8 cubic units and its double holds 64.*8 houses/);
    expect(npc(S, 'Scale Model Guide').dialogue).toContain('2 by 2 by 2');
  });

  it('leaves the packing yard clear for building and every guide room to stand', () => {
    const S = lessons.skylineCity, yard = S.structures.find(s => s.id === 'packing-yard');
    expect(layoutProblems(S)).toEqual([]);
    const cells = world(S);
    const above = [...cells.values()].filter(c => c.layer === 'lesson' && c.x >= yard.x1 && c.x <= yard.x2 && c.z >= yard.z1 && c.z <= yard.z2);
    expect(above).toEqual([]);
    // Every suggested box fits on the yard: 2 by 3 by 4, 2 by 2 by 6 and 1 by 4 by 6.
    const [L, W] = [yard.x2 - yard.x1 + 1, yard.z2 - yard.z1 + 1];
    for (const box of [[2, 3, 4], [2, 2, 6], [1, 4, 6]]) {
      const fits = [[0, 1], [1, 0], [0, 2], [2, 0], [1, 2], [2, 1]].some(([a, b]) => box[a] <= L && box[b] <= W);
      expect(fits, box.join(' by ')).toBe(true);
    }
    // Activity travel targets land on open ground.
    for (const a of S.activities) expect(crowded(S, a.position, 0.8), a.id).toBeNull();
  });
});
