// Geometry World guided lessons: every answer key must match the world the student
// actually measures.
//
// THE BUG (2026-09-23 audit): keys were written from the authored intent, not from the
// fills. The volumeExplorer pool's inside is 3 by 2 by 2, but the key said a 3 by 3
// floor (9) and 18 blocks, and marked the true floor area (6) WRONG. The fluency maze
// keyed 24 and "5 x 2 x 3 = 30" for fills of 18 and 18 (both shrunk to fit a 3-wide
// corridor), with 18 offered as a wrong answer. fractionVolume keyed "halfway between
// 2 and 4" as 2.5 and marked 3 wrong.
//
// The world here is rebuilt with the loader's own rules (engine.loadLesson/fillBlocks):
// fills are INCLUSIVE, the first fill owns a cell, the ground fill comes first, a flat
// fill at ground.y is the ground layer, and Measure (M) floods face-connected cells of
// ONE layer regardless of material. Keys are read from the ROTATED production presets
// (window.StemLab.geometryWorldWorksheets.presets()), which are what the app grades.
//
// PAIRS below is the pairing table: each question step (lesson/NPC#step, steps
// flattened main-then-followUp) maps to a derivation from the world, or, for a
// hypothetical the NPC states in words, from the numbers the text gives. CONCEPTUAL lists
// steps with no numeric answer. Every step of every lesson must be in exactly one list,
// so a new or renamed question fails here until someone pairs it.

import {afterAll, beforeAll, describe, expect, it, vi} from 'vitest';
import {readFileSync} from 'node:fs';

const source = readFileSync('stem_lab/stem_tool_geometryworld.js', 'utf8');
const originalLab = window.StemLab;
let lessons;
beforeAll(() => {
  window.StemLab = {registerTool: vi.fn()};
  new Function(source)();
  lessons = window.StemLab.geometryWorldWorksheets.presets();
}, 120000); // Parsing the 1.1 MB tool passes 10 s on a loaded machine.
afterAll(() => { window.StemLab = originalLab; });

// ── World model (mirrors loadLesson + fillBlocks + measureStructure) ──
const key = (x, y, z) => x + ',' + y + ',' + z;
const DIRS = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
const worldCache = new Map();
function world(lesson) {
  if (worldCache.has(lesson)) return worldCache.get(lesson);
  const cells = new Map(), g = lesson.ground;
  if (g) for (let x = g.xMin; x <= g.xMax; x++) for (let z = g.zMin; z <= g.zMax; z++) cells.set(key(x, g.y, z), {x, y: g.y, z, type: g.type || 'grass', layer: 'ground'});
  for (const s of lesson.structures || []) {
    if (s.type !== 'fill') continue;
    const layer = g && s.y1 === g.y && s.y1 === s.y2 ? 'ground' : 'lesson';
    for (let x = Math.min(s.x1, s.x2); x <= Math.max(s.x1, s.x2); x++)
      for (let y = Math.min(s.y1, s.y2); y <= Math.max(s.y1, s.y2); y++)
        for (let z = Math.min(s.z1, s.z2); z <= Math.max(s.z1, s.z2); z++) {
          const k = key(x, y, z);
          if (!cells.has(k)) cells.set(k, {x, y, z, type: s.block, layer});
        }
  }
  worldCache.set(lesson, cells);
  return cells;
}
// What Measure reports when aimed at `seed`; sameMaterial restricts the flood to one
// block type (used where M would merge a structure with the walls it touches).
function flood(lesson, seed, sameMaterial) {
  const cells = world(lesson), start = cells.get(key(...seed));
  if (!start || start.layer !== 'lesson') throw Error('No lesson block at ' + seed + ' in ' + lesson.title);
  const seen = new Set([key(...seed)]), todo = [start], out = [];
  while (todo.length) {
    const c = todo.pop(); out.push(c);
    for (const d of DIRS) {
      const k = key(c.x + d[0], c.y + d[1], c.z + d[2]), n = cells.get(k);
      if (n && !seen.has(k) && n.layer === start.layer && (!sameMaterial || n.type === start.type)) { seen.add(k); todo.push(n); }
    }
  }
  return model(out);
}
function model(cs) {
  const lo = a => Math.min(...cs.map(c => c[a])), hi = a => Math.max(...cs.map(c => c[a]));
  const mats = {}; cs.forEach(c => { mats[c.type] = (mats[c.type] || 0) + 1; });
  const m = {cells: cs, count: cs.length, L: hi('x') - lo('x') + 1, W: hi('z') - lo('z') + 1, H: hi('y') - lo('y') + 1, mats,
    min: {x: lo('x'), y: lo('y'), z: lo('z')}, max: {x: hi('x'), y: hi('y'), z: hi('z')}};
  m.bbox = m.L * m.W * m.H;
  m.longest = Math.max(m.L, m.W, m.H);
  m.layer = y => cs.filter(c => c.y === y).length;
  return m;
}
// Empty cells enclosed by a model's bounding box (a pool, room or reservoir inside).
function hollow(lesson, m) {
  const cells = world(lesson), out = [];
  for (let x = m.min.x; x <= m.max.x; x++) for (let y = m.min.y; y <= m.max.y; y++) for (let z = m.min.z; z <= m.max.z; z++)
    if (!cells.has(key(x, y, z))) out.push({x, y, z});
  return out.length ? model(out) : {count: 0};
}
function exposedFaces(cs) {
  const set = new Set(cs.map(c => key(c.x, c.y, c.z)));
  let n = 0; for (const c of cs) for (const d of DIRS) if (!set.has(key(c.x + d[0], c.y + d[1], c.z + d[2]))) n++;
  return n;
}
function box(L, W, H) { const out = []; for (let x = 0; x < L; x++) for (let y = 0; y < H; y++) for (let z = 0; z < W; z++) out.push({x, y, z}); return out; }

// ── Choice parsing ──
const FRAC = {'½': 0.5, '¼': 0.25, '¾': 0.75};
function num(text) {
  const m = String(text).match(/(\d+(?:\.\d+)?)([½¼¾])?|([½¼¾])/);
  if (!m) return null;
  if (m[3]) return FRAC[m[3]];
  return Number(m[1]) + (m[2] ? FRAC[m[2]] : 0);
}
const unitOf = text => /cubic/i.test(text) ? 'cubic' : /square/i.test(text) ? 'square' : null;
const pick = words => text => { const t = String(text).toLowerCase(); const w = words.find(x => t.includes(x)); return w === undefined ? null : w; };
const withBy = words => text => { const w = pick(words)(text); return w && w + (num(text) === null ? '' : ':' + num(text)); };

// ── The pairing table ──
// [lesson, 'NPC name#step', derive(lesson, stepQuestion) -> value, unit?, parse?]
// unit is the unit the true value is in: a distractor with the same number but a
// DIFFERENT unit (6 square units for a 6 cubic unit volume) is a legitimate units
// misconception; the same number in the same unit (or no unit) is a second right answer.
const PAIRS = [
  // volumeExplorer: blue prism (10,1,2), pool walls (2,1,12), L-block (16,1,10)
  ['volumeExplorer', 'Quiz Master#0', l => flood(l, [10,1,2]).L],
  ['volumeExplorer', 'Quiz Master#1', l => flood(l, [10,1,2]).W],
  ['volumeExplorer', 'Quiz Master#2', l => flood(l, [10,1,2]).H],
  ['volumeExplorer', 'Quiz Master#3', l => flood(l, [10,1,2]).count, 'cubic'],
  ['volumeExplorer', 'Builder Bot#0', l => { const h = hollow(l, flood(l, [2,1,12])); return h.layer(h.min.y); }, 'square'],
  ['volumeExplorer', 'Builder Bot#1', l => hollow(l, flood(l, [2,1,12])).count],
  ['volumeExplorer', 'L-Block Sage#0', l => flood(l, [16,1,10]).mats.gold, 'cubic'],
  ['volumeExplorer', 'L-Block Sage#1', l => flood(l, [16,1,10]).mats.diamond, 'cubic'],
  ['volumeExplorer', 'L-Block Sage#2', l => flood(l, [16,1,10]).count, 'cubic'],
  // areaSurface: blue (2,1,2), gold (12,1,2), striped (2,1,10)
  ['areaSurface', 'Flat Prism Quiz#0', l => { const m = flood(l, [2,1,2]); return m.L * m.W; }, 'square'],
  ['areaSurface', 'Flat Prism Quiz#1', l => flood(l, [2,1,2]).H],
  ['areaSurface', 'Flat Prism Quiz#2', l => flood(l, [2,1,2]).count, 'cubic'],
  ['areaSurface', 'Tall Prism Quiz#0', l => flood(l, [12,1,2]).count, 'cubic'],
  ['areaSurface', 'Tall Prism Quiz#1', l => { const b = flood(l, [2,1,2]).count, g = flood(l, [12,1,2]).count; return b === g ? 'same' : g > b ? 'gold is bigger' : 'blue is bigger'; }, null, pick(['same', 'gold is bigger', 'blue is bigger'])],
  ['areaSurface', 'Layer Counter#0', l => { const m = flood(l, [2,1,10]); return m.L * m.W; }, 'square'],
  ['areaSurface', 'Layer Counter#1', l => flood(l, [2,1,10]).H],
  ['areaSurface', 'Layer Counter#2', l => flood(l, [2,1,10]).count, 'cubic'],
  // buildChallenge: example room (14,1,14); Volume Coach is a stated 8 by 6 by 4 room
  ['buildChallenge', 'Room Inspector#0', l => hollow(l, flood(l, [14,1,14])).L],
  ['buildChallenge', 'Room Inspector#1', l => hollow(l, flood(l, [14,1,14])).count, 'cubic'],
  ['buildChallenge', 'Volume Coach#0', () => 8 - 2],
  ['buildChallenge', 'Volume Coach#1', () => 6 - 2],
  ['buildChallenge', 'Volume Coach#2', () => (8 - 2) * (6 - 2) * 4, 'cubic'],
  // realWorld: container (2,1,2) holds its 2x2x2 boxes; crate (12,1,2) holds sand
  ['realWorld', 'Packing Expert#0', l => { const m = flood(l, [2,1,2]); return m.bbox - m.mats.wood; }, 'cubic'],
  ['realWorld', 'Packing Expert#1', l => { const m = flood(l, [2,1,2]); return (m.mats.gold + m.mats.diamond) / 8; }],
  ['realWorld', 'Packing Expert#2', l => { const m = flood(l, [2,1,2]); return m.bbox - m.mats.wood - m.mats.gold - m.mats.diamond; }, 'cubic'],
  ['realWorld', 'Inventory Checker#0', l => { const m = flood(l, [12,1,2]); return m.bbox - m.mats.wood; }, 'cubic'],
  ['realWorld', 'Inventory Checker#1', l => { const m = flood(l, [12,1,2]); return m.bbox - m.mats.wood - m.mats.sand; }, 'cubic'],
  // compositeVolume: T (2,1,2), pyramid (14,1,2)
  ['compositeVolume', 'T-Shape Quiz#0', l => flood(l, [2,1,2]).mats.diamond, 'cubic'],
  ['compositeVolume', 'T-Shape Quiz#1', l => flood(l, [2,1,2]).mats.gold, 'cubic'],
  ['compositeVolume', 'T-Shape Quiz#2', l => flood(l, [2,1,2]).count, 'cubic'],
  ['compositeVolume', 'Pyramid Guide#0', l => flood(l, [14,1,2]).layer(1), 'cubic'],
  ['compositeVolume', 'Pyramid Guide#1', l => flood(l, [14,1,2]).layer(2), 'cubic'],
  ['compositeVolume', 'Pyramid Guide#2', l => flood(l, [14,1,2]).layer(3), 'cubic'],
  ['compositeVolume', 'Pyramid Guide#3', l => flood(l, [14,1,2]).count, 'cubic'],
  // fractionVolume: blue (2,1,2), gold (10,1,2), glass container (2,1,10), towers (14,1,10) and (18,1,10).
  // "Halfway": between the two heights the question names, else between the blue and gold heights.
  ['fractionVolume', 'Between Quiz#0', (l, q) => { const m = q.text.match(/halfway between (\d+(?:\.\d+)?) and (\d+(?:\.\d+)?)/i); return m ? (Number(m[1]) + Number(m[2])) / 2 : (flood(l, [2,1,2]).H + flood(l, [10,1,2]).H) / 2; }],
  ['fractionVolume', 'Between Quiz#1', l => { const m = flood(l, [2,1,2]); return m.L * m.W * 2.5; }, 'cubic'],
  ['fractionVolume', 'Container Challenge#0', l => flood(l, [2,1,10]).mats.sand, 'cubic'],
  ['fractionVolume', 'Container Challenge#1', l => { const m = flood(l, [2,1,10]); return m.bbox - m.mats.glass - m.mats.sand; }, 'cubic'],
  ['fractionVolume', 'Height Detective#0', l => flood(l, [14,1,10]).count, 'cubic'],
  ['fractionVolume', 'Height Detective#1', l => flood(l, [18,1,10]).count, 'cubic'],
  ['fractionVolume', 'Height Detective#2', l => Math.round(flood(l, [18,1,10]).count / flood(l, [14,1,10]).count * 100) / 100],
  // volumeEstimation: small (6,1,2), medium (12,1,2), large (20,1,2), tower (4,1,10), slab (10,1,10)
  ['volumeEstimation', 'Small Quiz#0', l => flood(l, [6,1,2]).L],
  ['volumeEstimation', 'Small Quiz#1', l => { const m = flood(l, [6,1,2]); return m.W + ',' + m.H; }, null, t => { const m = String(t).match(/(\d+) wide, (\d+) tall/); return m && m[1] + ',' + m[2]; }],
  ['volumeEstimation', 'Small Quiz#2', l => flood(l, [6,1,2]).count, 'cubic'],
  ['volumeEstimation', 'Medium Quiz#0', l => flood(l, [12,1,2]).longest],
  ['volumeEstimation', 'Medium Quiz#1', l => flood(l, [12,1,2]).count, 'cubic'],
  ['volumeEstimation', 'Large Quiz#0', l => flood(l, [20,1,2]).longest],
  ['volumeEstimation', 'Large Quiz#1', l => flood(l, [20,1,2]).count, 'cubic'],
  ['volumeEstimation', 'Shape Illusion#0', l => flood(l, [4,1,10]).count, 'cubic'],
  ['volumeEstimation', 'Shape Illusion#1', l => flood(l, [10,1,10]).count, 'cubic'],
  ['volumeEstimation', 'Shape Illusion#2', l => { const t = flood(l, [4,1,10]).count, s = flood(l, [10,1,10]).count; return t === s ? 'same' : s > t ? 'slab' : 'tower'; }, null, pick(['slab', 'tower', 'same'])],
  // fractionBuilder: the 2x2x2 cube (12,1,2); the rest is stated half/quarter arithmetic
  ['fractionBuilder', 'Half Quiz#0', () => 0.5, 'cubic'],
  ['fractionBuilder', 'Half Quiz#1', () => 2 * 0.5, 'cubic'],
  ['fractionBuilder', 'Half Quiz#2', () => 6 * 0.5, 'cubic'],
  ['fractionBuilder', 'Whole Quiz#0', l => flood(l, [12,1,2]).count - 4],
  ['fractionBuilder', 'Whole Quiz#1', l => (flood(l, [12,1,2]).count - 4) + 4 * 0.5, 'cubic'],
  ['fractionBuilder', 'Challenge Master#0', () => 0.5 / 0.25],
  ['fractionBuilder', 'Challenge Master#1', () => 1 / 0.25],
  ['fractionBuilder', 'Pizza Professor#0', () => 3, 'cubic'],
  ['fractionBuilder', 'Pizza Professor#1', () => 3 + 2 * 0.25],
  // base10Blocks: unit (2,1,2), rod (8,1,2), flat (2,1,8), 234 = flats (16,1,8) + rods (16,1,19) + units (16,1,23)
  ['base10Blocks', 'Ones Expert#0', l => flood(l, [2,1,2]).count],
  ['base10Blocks', 'Ones Expert#1', () => 7],
  ['base10Blocks', 'Tens Teacher#0', l => flood(l, [8,1,2]).count],
  ['base10Blocks', 'Tens Teacher#1', l => 5 * flood(l, [8,1,2]).count],
  ['base10Blocks', 'Tens Teacher#2', l => 5 * flood(l, [8,1,2]).count],
  ['base10Blocks', 'Hundreds Hero#0', l => flood(l, [2,1,8]).count],
  ['base10Blocks', 'Hundreds Hero#1', l => { const m = flood(l, [2,1,8]); return m.L * m.W; }],
  ['base10Blocks', 'Number Builder#0', l => flood(l, [16,1,8]).count + flood(l, [16,1,19]).count + flood(l, [16,1,23]).count],
  ['base10Blocks', 'Number Builder#1', l => flood(l, [16,1,19]).count],
  ['base10Blocks', 'Number Builder#2', l => flood(l, [16,1,8]).count + flood(l, [16,1,19]).count + flood(l, [16,1,23]).count],
  ['base10Blocks', 'Build Challenge#0', () => 50, null, t => { const m = String(t).match(/\((\d+)\)/); return m && Number(m[1]); }],
  ['base10Blocks', 'Build Challenge#1', () => 100 + 50 + 6],
  // fluencyMaze: each junction fill touches the brick walls, so M would report the whole
  // maze; the student counts the fill itself (diamond (1,1,5), gold (1,1,11), diamond (1,1,17)).
  ['fluencyMaze', 'Junction 1#0', l => flood(l, [1,1,5], true).count],
  ['fluencyMaze', 'Junction 1#1', l => flood(l, [1,1,5], true).count],
  ['fluencyMaze', 'Junction 2#0', l => flood(l, [1,1,11], true).count, 'cubic'],
  ['fluencyMaze', 'Junction 3#0', l => flood(l, [1,1,17], true).count],
  ['fluencyMaze', 'Junction 3#1', l => flood(l, [1,1,17], true).count],
  // geometryHarbor: cargo (-15,1,14), gold garden (-15,1,-9), cyan garden (-15,1,2),
  // reservoir walls (7,1,-8), cyan capacity model (7,1,3), gold (10,1,7), arch (29,1,-17)
  ['geometryHarbor', '1. Sora - Arrival Quay#0', l => flood(l, [-15,1,14]).count],
  ['geometryHarbor', '1. Sora - Arrival Quay#1', l => flood(l, [-15,1,14]).count, 'cubic'],
  ['geometryHarbor', '1. Sora - Arrival Quay#2', l => flood(l, [-15,1,14]).count, 'cubic'],
  ['geometryHarbor', '2. Ada - Garden Area#0', l => { const m = flood(l, [-15,1,-9]); return m.L * m.W; }, 'square'],
  ['geometryHarbor', '2. Ada - Garden Area#1', l => { const m = flood(l, [-15,1,-9]); return m.L * m.W; }],
  ['geometryHarbor', '3. Rowan - Garden Design#0', l => { const m = flood(l, [-15,1,2]); return m.L * m.W; }, 'square'],
  ['geometryHarbor', '3. Rowan - Garden Design#1', l => { const m = flood(l, [-15,1,2]); return 2 * (m.L + m.W); }],
  ['geometryHarbor', '3. Rowan - Garden Design#2', l => { const g = flood(l, [-15,1,-9]), c = flood(l, [-15,1,2]), pg = 2 * (g.L + g.W), pc = 2 * (c.L + c.W); return pg === pc ? 'same' : (pg < pc ? 'gold' : 'cyan') + ':' + Math.abs(pg - pc); }, null, withBy(['gold', 'cyan', 'same'])],
  ['geometryHarbor', '3. Rowan - Garden Design#3', () => 2 * (12 + 2)],
  ['geometryHarbor', '4. Nia - Reservoir Works#0', l => { const h = hollow(l, flood(l, [7,1,-8])); return h.layer(h.min.y); }],
  ['geometryHarbor', '4. Nia - Reservoir Works#1', l => hollow(l, flood(l, [7,1,-8])).count, 'cubic'],
  ['geometryHarbor', '4. Nia - Reservoir Works#2', l => { const h = hollow(l, flood(l, [7,1,-8])); return h.layer(h.max.y); }],
  ['geometryHarbor', '5. Ivo - Equal Capacity#0', l => flood(l, [7,1,3]).count, 'cubic'],
  ['geometryHarbor', '5. Ivo - Equal Capacity#1', l => flood(l, [10,1,7]).count, 'cubic'],
  ['geometryHarbor', '5. Ivo - Equal Capacity#2', l => { const c = flood(l, [7,1,3]), g = flood(l, [10,1,7]); return c.L * c.W === g.L * g.W && c.H === g.H ? c.L * c.W + ',' + c.H : 'differ'; }, null, t => { const m = String(t).match(/base area of (\d+) and (\d+) layers/); return m && m[1] + ',' + m[2]; }],
  ['geometryHarbor', '6. Mira - Makers Pavilion#0', () => 3 * 4 * 2],
  ['geometryHarbor', '6. Mira - Makers Pavilion#1', () => 3 * 4 * 2, null, t => { const m = String(t).match(/^(\d+) by (\d+) by (\d+)$/); return m && (m[1] <= 6 && m[2] <= 6 ? m[1] * m[2] * m[3] : null); }],
  ['geometryHarbor', '7. Tess - Arcade Patterns#0', l => 3 * flood(l, [29,1,-17]).count],
  ['geometryHarbor', '7. Tess - Arcade Patterns#1', l => 3 * flood(l, [29,1,-17]).L + 2],
  ['geometryHarbor', '8. Eli - Community Studio#0', () => 6 * 4 + 6 * 2, 'cubic'],
  ['geometryHarbor', '8. Eli - Community Studio#1', () => exposedFaces(box(6, 3, 2)), 'square'],
  ['geometryHarbor', '8. Eli - Community Studio#2', () => { const stepped = box(6, 4, 1).concat(box(6, 2, 1).map(c => ({...c, y: 1}))), s = exposedFaces(stepped), p = exposedFaces(box(6, 3, 2)); return s === p ? 'equal' : (p < s ? 'prism' : 'stepped model') + ':' + Math.abs(s - p); }, null, withBy(['prism', 'stepped model', 'equal'])],
];
// Steps with no numeric or world-derived answer (reasoning, self-checks with the
// verdict printed in the choice, or a question about fluency itself).
const CONCEPTUAL = [
  'realWorld/Packing Expert#3', 'realWorld/Design Challenge#0', 'realWorld/Design Challenge#1',
  'compositeVolume/U-Shape Sage#0', 'compositeVolume/U-Shape Sage#1', 'compositeVolume/Design Challenge#0',
  'fractionVolume/Between Quiz#2', 'fluencyMaze/Finish!#0',
  'geometryHarbor/2. Ada - Garden Area#2', 'geometryHarbor/6. Mira - Makers Pavilion#2',
];

function steps(lessonKey) {
  const out = [];
  for (const npc of lessons[lessonKey].npcs || []) {
    const flat = q => q ? [q, ...(q.followUp || []).flatMap(flat)] : [];
    flat(npc.question).forEach((q, i) => out.push([lessonKey + '/' + npc.name + '#' + i, q]));
  }
  return out;
}
function allSteps() { return Object.keys(lessons).flatMap(steps); }
const same = (a, b) => typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) < 1e-9 : a === b;

describe('Geometry World answer keys match the measured world', () => {
  it('classifies every question step of every lesson exactly once', () => {
    const ids = allSteps().map(([id]) => id);
    expect(new Set(ids).size, 'duplicate lesson/NPC#step ids').toBe(ids.length);
    const paired = PAIRS.map(p => p[0] + '/' + p[1]);
    const classified = paired.concat(CONCEPTUAL);
    expect(new Set(classified).size, 'an id is listed twice').toBe(classified.length);
    expect(ids.filter(id => !classified.includes(id)), 'unclassified steps: pair them or mark them conceptual').toEqual([]);
    expect(classified.filter(id => !ids.includes(id)), 'stale entries that match no step').toEqual([]);
    expect(PAIRS.length).toBeGreaterThanOrEqual(90);
  });

  it.each(PAIRS.map(p => [p[0] + '/' + p[1], ...p]))('%s: keyed choice equals the world value and no distractor does', (id, lessonKey, stepId, derive, unit, parse) => {
    const q = steps(lessonKey).find(([sid]) => sid === id)[1];
    const read = parse || num;
    const truth = derive(lessons[lessonKey], q);
    expect(truth === null || truth === undefined || Number.isNaN(truth), id + ' derivation failed').toBe(false);
    const keyed = q.choices[q.correct];
    expect(same(read(keyed), truth), id + ' keyed "' + keyed + '" but the world gives ' + truth).toBe(true);
    if (unit) expect([unit, null], id + ' keyed unit').toContain(unitOf(keyed));
    q.choices.forEach((choice, i) => {
      if (i === q.correct) return;
      const v = read(choice), u = unitOf(choice);
      const secondRightAnswer = same(v, truth) && (!unit || !u || u === unit);
      expect(secondRightAnswer, id + ' distractor "' + choice + '" is also the true value ' + truth).toBe(false);
    });
  });

  it('pins the three audited worlds to their real fills', () => {
    const v = lessons.volumeExplorer, pool = hollow(v, flood(v, [2,1,12]));
    expect([pool.L, pool.W, pool.H, pool.count]).toEqual([3, 2, 2, 12]);
    const maze = lessons.fluencyMaze;
    expect([12, 18, 18]).toEqual([[1,1,5], [1,1,11], [1,1,17]].map(s => flood(maze, s, true).count));
    const f = lessons.fractionVolume;
    expect([flood(f, [2,1,2]).H, flood(f, [10,1,2]).H]).toEqual([2, 4]);
  });

  it('does not tell students that Measure isolates a maze structure that touches the walls', () => {
    const maze = lessons.fluencyMaze;
    for (const seed of [[1,1,5], [1,1,11], [1,1,17]]) expect(flood(maze, seed).count).toBeGreaterThan(flood(maze, seed, true).count);
    for (const npc of maze.npcs) {
      if (!/\bmeasure\b|\bM key\b/i.test(npc.dialogue)) continue;
      expect(npc.dialogue, npc.name).toMatch(/whole maze/);
    }
  });

  it('keeps each NPC dialogue consistent with the dimensions it states', () => {
    // Dialogue lines that quote a structure's dimensions.
    const v = lessons.volumeExplorer, pool = hollow(v, flood(v, [2,1,12]));
    expect(v.npcs.find(n => n.name === 'Builder Bot').dialogue).toContain(pool.L + ' long, ' + pool.W + ' wide, ' + pool.H + ' tall');
    const b = lessons.buildChallenge, room = flood(b, [14,1,14]);
    for (const name of ['Architect', 'Room Inspector']) expect(b.npcs.find(n => n.name === name).dialogue, name).toContain(room.L + '×' + room.W + '×' + room.H);
    const m = lessons.fluencyMaze, j1 = flood(m, [1,1,5], true), j3 = flood(m, [1,1,17], true);
    expect(m.npcs.find(n => n.name === 'Junction 1').dialogue).toContain(j1.L + ' long, ' + j1.W + ' wide, ' + j1.H + ' tall');
    expect(m.npcs.find(n => n.name === 'Junction 3').dialogue).toContain(j3.H + ' tall');
  });
});
