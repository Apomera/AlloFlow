import fs from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

// Echo Navigator, 2026-11-23 follow-up: soft surfaces where they belong.
// Before: soft was the right answer in about 15% of material-quiz poses in the Simple Room, 4% in the
// School and 0% in the other seven places, so "hard" was almost always right.
// Now (only rows of Hall's Table 15.1 via hyperphysics revmod.html: velour draperies 0.3/0.7/0.6 and
// "wooden pews, occupied" 0.4/0.7/0.7 for people): longer curtains in the Simple Room, curtains and seated
// classes in the School, an audience in the Park, a crowd in the Urban place and checkout queues in the
// Grocery. Cave, Corridor, Forest and Challenge have nothing soft that belongs there.
// Also: the player started inside a wall in the School, Grocery and Park (and some Forest seeds) and could
// not move; the Park route's Fountain waypoint sat inside the fountain.
// Run with ECHO_TOOL_FILE=C:/tmp/sports_labs_1123/echotrainer/start_r5.js to see these fail on the earlier copy.

const FILE = process.env.ECHO_TOOL_FILE || 'stem_lab/stem_tool_echotrainer.js';
const SRC = fs.readFileSync(FILE, 'utf8').replace(/\r\n/g, '\n');
const box = { console }; box.window = box;
vm.runInNewContext(SRC, box);
const M = box.__alloEchoNavModel;
const W = M.world;
const ENVS = ['simple_room', 'cave', 'corridor', 'forest', 'urban', 'school', 'grocery', 'park', 'challenge'];
const TABLE = { concrete: true, rock: true, metal: true, glass: true, wood: true, curtain: true, flesh: true, car: true, goal: true };

// The quiz asks about the first static surface straight ahead within 400 px (startMaterialQuiz).
function quizMix(env) {
  const room = W.generateEnvironment(env, 42);
  let hard = 0, soft = 0;
  for (let x = 40; x <= 760; x += 20) for (let y = 40; y <= 760; y += 20) for (let k = 0; k < 8; k++) {
    if (!W.canMoveTo(x, y, room)) continue;
    const hit = M.castRay(room, null, x, y, k * Math.PI / 4, true);
    if (hit.px < 400 && hit.mat) { if (M.soundGroup(hit.mat) === 'soft') soft++; else hard++; }
  }
  return { hard, soft, share: soft / (hard + soft) };
}
function walkable(room, from) {
  const start = [Math.round(from.x / 10) * 10, Math.round(from.y / 10) * 10];
  const seen = new Set([start.join(',')]); const q = [start];
  for (let h = 0; h < q.length; h++) {
    const [x, y] = q[h];
    for (const [dx, dy] of [[10, 0], [-10, 0], [0, 10], [0, -10]]) {
      const nx = x + dx, ny = y + dy, k = nx + ',' + ny;
      if (!seen.has(k) && W.canMoveTo(nx, ny, room)) { seen.add(k); q.push([nx, ny]); }
    }
  }
  return seen;
}
const within = (seen, x, y, r) => [...seen].some((k) => { const [a, b] = k.split(',').map(Number); return Math.hypot(a - x, b - y) < r; });

describe('soft surfaces come only from the sourced absorption table', () => {
  it('people use the occupied-pews row: 70% soaked up at 1 kHz, so 30% comes back (soft)', () => {
    expect(M.matRef('flesh')).toBe(0.3);
    expect(M.soundGroup('flesh')).toBe('soft');
    expect(M.matRef('curtain')).toBe(0.3);
    for (const env of ENVS) {
      const room = W.generateEnvironment(env, 42);
      for (const s of room.walls.concat(room.objects)) { expect(TABLE[s.mat], env + ' ' + s.mat).toBe(true); expect(s.ref).toBe(M.matRef(s.mat)); }
    }
  });
  it('soft is now a real answer in the five places where soft things belong', () => {
    const mix = {};
    for (const env of ['simple_room', 'school', 'urban', 'park', 'grocery']) mix[env] = quizMix(env);
    expect(mix.simple_room.share).toBeGreaterThan(0.25); expect(mix.simple_room.share).toBeLessThan(0.40);
    for (const env of ['school', 'urban', 'park']) expect(mix[env].share, env).toBeGreaterThan(0.15);
    expect(mix.grocery.share).toBeGreaterThan(0.04);
    const all = Object.values(mix).reduce((a, m) => [a[0] + m.soft, a[1] + m.soft + m.hard], [0, 0]);
    expect(all[0] / all[1]).toBeGreaterThan(0.17);
  });
  it('a crowd is named as people in the quiz feedback and the distance prompt', () => {
    expect(SRC).toContain("flesh: t('stem.echotrainer.matname_people', 'a group of people')");
    expect(SRC).toContain("d.distChallenge.targetMat === 'flesh' ? t('stem.echotrainer.material_crowd', 'crowd')");
  });
});

describe('every place can be played from its start', () => {
  it('the player can step and walk to the goal in all nine places', () => {
    for (const env of ENVS) {
      const room = W.generateEnvironment(env, 42);
      const sp = W.spawnPoint(room);
      expect(W.canMoveTo(sp.x, sp.y, room), env).toBe(true);
      const goal = room.objects.find((o) => o.isGoal);
      expect(within(walkable(room, sp), goal.x, goal.y, goal.r + 12), env).toBe(true);
    }
  });
  it('keeps the usual start where it already worked, and moves it away from the goal room where it did not', () => {
    for (const env of ['simple_room', 'cave', 'corridor', 'urban', 'challenge']) expect(W.spawnPoint(W.generateEnvironment(env, 42))).toEqual({ x: 400, y: 700 });
    for (const env of ['school', 'grocery', 'park']) {
      const room = W.generateEnvironment(env, 42); const sp = W.spawnPoint(room); const goal = room.objects.find((o) => o.isGoal);
      expect(W.canMoveTo(400, 700, room), env).toBe(false);
      expect(Math.hypot(sp.x - goal.x, sp.y - goal.y), env).toBeGreaterThanOrEqual(200);
    }
    expect(SRC).toContain('var spawnAt = spawnPoint(mapRef.current);');
  });
  it('the Park route Fountain waypoint can be reached', () => {
    const room = W.generateEnvironment('park', 42);
    const m = SRC.match(/\{ x: (\d+), y: (\d+), label: 'Fountain' \}/);
    const [x, y] = [Number(m[1]), Number(m[2])];
    const seen = walkable(room, W.spawnPoint(room));
    expect(within(seen, x, y, 25)).toBe(true);
  });
});
