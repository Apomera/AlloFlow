import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Machine verification for Game Design Studio: lesson quiz keys, challenge
// validators run against constructed solving/failing maps, starter-level
// integrity, and tile-system consistency.

const sourcePath = 'stem_lab/stem_tool_gamestudio.js';
const publicPath = 'desktop/web-app/public/stem_lab/stem_tool_gamestudio.js';
const src = fs.readFileSync(sourcePath, 'utf8');

function extractScope(startMarker, endMarker, returns) {
  const start = src.indexOf(startMarker);
  const end = src.indexOf(endMarker, start);
  expect(start, startMarker).toBeGreaterThan(-1);
  expect(end, endMarker + ' bounds ' + startMarker).toBeGreaterThan(start);
  // eslint-disable-next-line no-new-func
  return new Function(src.slice(start, end) + '\nreturn { ' + returns.join(', ') + ' };')();
}

const tilesScope = extractScope('var TILE_PALETTE = [', 'var SPRITE_PRESETS', [
  'TILE_PALETTE', 'TILE_MAP', 'WALKABLE'
]);
const lessonsScope = extractScope('var LESSONS = [', 'function countTile', ['LESSONS']);
const challengeScope = extractScope('function countTile', 'var STARTERS', [
  'countTile', 'hasTile', 'hasWallBorder', 'CHALLENGES', 'makeStarter'
]);
const starterScope = extractScope('function makeStarter', 'function floodFill', ['STARTERS']);

beforeEach(() => {
  resetStemLab();
  loadTool(sourcePath, 'gameStudio');
});

describe('tile system', () => {
  it('palette ids are unique and WALKABLE references only real tiles', () => {
    const ids = tilesScope.TILE_PALETTE.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const k of Object.keys(tilesScope.WALKABLE)) {
      expect(ids, 'WALKABLE.' + k).toContain(k);
    }
  });

  it('blockers and hazards are not marked walkable', () => {
    for (const blocked of ['wall', 'platform', 'water', 'lava', 'spikes', 'enemy', 'npc']) {
      expect(tilesScope.WALKABLE[blocked], blocked).toBeUndefined();
    }
  });
});

describe('game design lessons', () => {
  it('all six lessons have complete quizzes with in-range keys', () => {
    expect(lessonsScope.LESSONS.length).toBe(6);
    for (const l of lessonsScope.LESSONS) {
      expect(l.quiz.options.length, l.id).toBe(4);
      expect(l.quiz.correct, l.id).toBeGreaterThanOrEqual(0);
      expect(l.quiz.correct, l.id).toBeLessThan(4);
      expect(l.quiz.explanation.length, l.id).toBeGreaterThan(20);
      expect(l.concept.length, l.id).toBeGreaterThan(100);
    }
  });

  it('quiz keys point at the pedagogically correct options', () => {
    const byId = {};
    for (const l of lessonsScope.LESSONS) byId[l.id] = l;
    expect(byId.gameloop.quiz.options[byId.gameloop.quiz.correct]).toBe('Input → Update → Render');
    expect(byId.collision.quiz.options[byId.collision.quiz.correct]).toBe('Check if they occupy the same grid cell');
    expect(byId.enemyai.quiz.options[byId.enemyai.quiz.correct]).toBe('Patrol (walks back and forth)');
  });

  it('cites the real Vlambeer talk, not an invented game (regression pin)', () => {
    expect(src).toContain('The Art of Screenshake');
    expect(src).not.toContain("Vlambeer's Action");
  });
});

describe('design challenge validators', () => {
  const byId = {};
  for (const c of challengeScope.CHALLENGES) byId[c.id] = c;
  const W = 16, H = 12;

  // A 16x12 map with a full wall border plus whatever extras the caller adds.
  function borderedMap(extras) {
    const t = {};
    for (let x = 0; x < W; x++) { t[x + ',0'] = 'wall'; t[x + ',' + (H - 1)] = 'wall'; }
    for (let y = 0; y < H; y++) { t['0,' + y] = 'wall'; t[(W - 1) + ',' + y] = 'wall'; }
    return Object.assign(t, extras || {});
  }

  function passes(challenge, tiles) {
    return challenge.requirements.every((r) => !!r.check(tiles, W, H));
  }

  it('every challenge fails on an empty map', () => {
    for (const c of challengeScope.CHALLENGES) {
      expect(passes(c, {}), c.id).toBe(false);
    }
  });

  it('first_steps passes with player, 3 coins, and a flag', () => {
    expect(passes(byId.first_steps, { '1,1': 'player', '2,2': 'coin', '3,3': 'coin', '4,4': 'coin', '5,5': 'flag' })).toBe(true);
  });

  it('maze_builder demands the border plus 10 internal walls', () => {
    const inner = {};
    for (let x = 2; x < 12; x++) inner[x + ',5'] = 'wall';
    const solved = borderedMap(Object.assign(inner, { '1,1': 'player', '14,10': 'flag' }));
    expect(passes(byId.maze_builder, solved)).toBe(true);
    // Only 9 internal walls: requirement 2 must fail.
    const nine = borderedMap({ '1,1': 'player', '14,10': 'flag' });
    for (let x = 2; x < 11; x++) nine[x + ',5'] = 'wall';
    expect(passes(byId.maze_builder, nine)).toBe(false);
  });

  it('danger_zone requires a coin adjacent to a hazard', () => {
    const base = {
      '1,1': 'player', '8,8': 'flag', '2,2': 'lava', '3,3': 'lava', '4,4': 'spikes',
      '5,5': 'grass', '5,6': 'grass', '5,7': 'grass', '6,5': 'grass', '6,6': 'grass'
    };
    expect(passes(byId.danger_zone, Object.assign({ '2,3': 'coin' }, base))).toBe(true);
    expect(passes(byId.danger_zone, Object.assign({ '9,9': 'coin' }, base))).toBe(false);
  });

  it('key_master and enemy_gauntlet count their pieces', () => {
    expect(passes(byId.key_master, {
      '1,1': 'player', '9,9': 'flag', '2,2': 'door', '3,3': 'door',
      '4,4': 'key', '5,5': 'key', '6,6': 'npc'
    })).toBe(true);
    const gauntlet = { '1,1': 'player', '9,9': 'flag', '2,2': 'heart', '3,3': 'heart' };
    for (let i = 0; i < 5; i++) gauntlet[(4 + i) + ',4'] = 'enemy';
    for (let i = 0; i < 8; i++) gauntlet[(2 + i) + ',7'] = 'wall';
    expect(passes(byId.enemy_gauntlet, gauntlet)).toBe(true);
  });

  it('master_designer needs 8 tile types and 30 placed tiles', () => {
    const t = { '0,0': 'player', '1,0': 'flag', '2,0': 'key', '3,0': 'door', '4,0': 'npc' };
    for (let i = 0; i < 3; i++) t[i + ',1'] = 'enemy';
    for (let i = 0; i < 3; i++) t[i + ',2'] = 'coin';
    for (let i = 0; i < 10; i++) t[i + ',3'] = 'wall';
    for (let i = 0; i < 9; i++) t[i + ',4'] = 'grass';
    expect(Object.keys(t).length).toBeGreaterThanOrEqual(30);
    expect(passes(byId.master_designer, t)).toBe(true);
  });
});

describe('starter projects', () => {
  it('every starter has exactly one player, a flag, and only real tiles', () => {
    expect(starterScope.STARTERS.length).toBeGreaterThanOrEqual(4);
    for (const s of starterScope.STARTERS) {
      const values = Object.values(s.tiles);
      expect(values.filter((v) => v === 'player').length, s.name).toBe(1);
      expect(values.filter((v) => v === 'flag').length, s.name).toBeGreaterThanOrEqual(1);
      for (const v of values) expect(tilesScope.TILE_MAP[v], s.name + ' tile ' + v).toBeTruthy();
    }
  });

  it('Sky Jumper keeps all 7 coins (enemies once overwrote two of them)', () => {
    const sky = starterScope.STARTERS.find((s) => s.name === 'Sky Jumper');
    expect(challengeScope.countTile(sky.tiles, 'coin')).toBe(7);
    expect(challengeScope.countTile(sky.tiles, 'enemy')).toBe(2);
  });

  it('Coin Collector fields its full 10 coins', () => {
    const cc = starterScope.STARTERS.find((s) => s.name === 'Coin Collector');
    expect(challengeScope.countTile(cc.tiles, 'coin')).toBe(10);
  });
});

describe('render and deployment', () => {
  it('renders the studio shell', () => {
    const html = renderTool('gameStudio', { gameStudio: {} });
    expect(html.length).toBeGreaterThan(1000);
  });

  it('public mirror is byte-identical to the root copy', () => {
    expect(fs.readFileSync(publicPath, 'utf8')).toBe(src);
  });
});
