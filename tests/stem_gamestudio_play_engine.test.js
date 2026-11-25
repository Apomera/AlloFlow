// Game Design Studio, sports-labs pass 2026-11-23: one game engine (GS_E) runs Play,
// "Can it be won? Test it", the engine-checked challenges, the Danger Map and the
// Difficulty Tuner. These tests run that engine (sliced from the real file) and mount
// the real tool for the bugs that were fixed in the render code.
// GS_FILE=<path> points the render tests at another copy (used for fail-first checks).
import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const toolPath = process.env.GS_FILE || 'stem_lab/stem_tool_gamestudio.js';
const src = fs.readFileSync('stem_lab/stem_tool_gamestudio.js', 'utf8');
function slice(a, b) {
  const s = src.indexOf(a); const e = src.indexOf(b, s);
  expect(s, a).toBeGreaterThan(-1); expect(e, b).toBeGreaterThan(s);
  return src.slice(s, e);
}
// eslint-disable-next-line no-new-func
const eng = new Function(slice('var GS_E = (function() {', 'var CHALLENGES = [') + '\nreturn { GS_E, gsSolveCached, gsCanWin };')();
// eslint-disable-next-line no-new-func
const STARTERS = new Function(slice('function makeStarter', 'function floodFill') + '\nreturn STARTERS;')();
// eslint-disable-next-line no-new-func
const LESSONS = new Function(slice('var LESSONS = [', 'function countTile') + '\nreturn LESSONS;')();
const E = eng.GS_E;
const starter = (name) => STARTERS.find((s) => s.name === name);
const S = (o) => E.settings(o || {});

function play(tiles, keys, o, W = 16, H = 12) {
  const s = S(o);
  let w = E.init(tiles, W, H, o);
  for (const k of keys) w = E.step(w, k, s);
  return w;
}
function border(extra) {
  const t = {};
  for (let x = 0; x < 16; x++) { t[x + ',0'] = 'wall'; t[x + ',11'] = 'wall'; }
  for (let y = 0; y < 12; y++) { t['0,' + y] = 'wall'; t['15,' + y] = 'wall'; }
  return Object.assign(t, extra || {});
}

describe('engine rules', () => {
  it('playing never changes the design map, and walked-on grass stays grass', () => {
    const cc = starter('Coin Collector');
    const before = JSON.stringify(cc.tiles);
    const w = play(cc.tiles, ['ArrowRight', 'ArrowRight', 'ArrowDown']);
    expect(JSON.stringify(cc.tiles)).toBe(before);
    expect(E.tileAt(w, 2, 1)).toBe('grass');
    // The player's start square takes the floor around it instead of a black hole.
    expect(E.tileAt(w, 1, 1)).toBe('grass');
  });

  it('collecting a coin scores 10 and leaves floor behind', () => {
    const w = play({ '1,1': 'player', '2,1': 'coin', '3,1': 'grass', '2,2': 'grass' }, ['ArrowRight']);
    expect(w.score).toBe(10);
    expect(w.coins).toBe(1);
    expect(E.tileAt(w, 2, 1)).toBe('grass');
  });

  it('lava stays lava: each step into it costs a life', () => {
    const t = { '1,1': 'player', '2,1': 'lava', '3,1': 'lava', '4,1': 'flag' };
    const w = play(t, ['ArrowRight', 'ArrowRight']);
    expect(w.lives).toBe(1);
    expect(E.tileAt(w, 2, 1)).toBe('lava');
    const w3 = E.step(w, 'ArrowLeft', S());
    expect(w3.dead).toBe(true);
  });

  it('water and NPCs block the player', () => {
    const w = play({ '1,1': 'player', '2,1': 'water', '1,2': 'npc' }, ['ArrowRight', 'ArrowDown']);
    expect([w.px, w.py]).toEqual([1, 1]);
  });

  it('a door needs a key and uses it up', () => {
    const t = { '1,1': 'player', '2,1': 'door', '1,2': 'key' };
    let w = play(t, ['ArrowRight']);
    expect(w.px).toBe(1);
    w = play(t, ['ArrowDown', 'ArrowUp', 'ArrowRight']);
    expect(w.px).toBe(2);
    expect(w.keys).toBe(0);
  });

  it('ice slides until the ice ends (the slide-stop line is kept)', () => {
    expect(src).toMatch(/if\s*\(\s*sDest !== 'ice'\s*\)\s*break;/);
    const t = { '0,0': 'player', '1,0': 'ice', '2,0': 'ice', '3,0': 'ice', '4,0': 'grass', '5,0': 'grass' };
    const w = play(t, ['ArrowRight'], {}, 8, 6);
    expect([w.px, w.moves]).toEqual([4, 1]);
  });

  it('side view has gravity: walking off a ledge falls, Up jumps 3 only from the ground', () => {
    const t = { '1,5': 'player' };
    for (let x = 0; x < 8; x++) t[x + ',6'] = 'platform';
    const o = { gravity: true };
    let w = play(t, ['ArrowUp'], o, 8, 8);
    expect(w.py).toBe(2);
    w = E.step(w, 'ArrowUp', S(o));
    expect(w.py).toBe(3);
    w = play(t, ['ArrowUp', 'ArrowRight', 'ArrowRight', 'ArrowRight'], o, 8, 8);
    expect(w.py).toBe(5);
    // Top-down: the same key just walks up one square.
    expect(play(t, ['ArrowUp'], {}, 8, 8).py).toBe(4);
  });

  it('enemies chase inside the chase range and a touch costs one life', () => {
    const t = { '1,1': 'player', '4,1': 'enemy' };
    const w = play(t, ['ArrowRight'], { chase: 3 }, 8, 6);
    expect(w.en[0][0]).toBe(3);
    const far = play(t, ['ArrowRight'], { chase: 0 }, 8, 6);
    expect(far.en[0][0]).toBe(5);
    const hit = play({ '1,1': 'player', '2,1': 'enemy' }, ['ArrowRight'], {}, 8, 6);
    expect(hit.lives).toBe(2);
    expect(hit.en.length).toBe(0);
  });
});

describe('Events rules really run', () => {
  it('Player collides with coin -> Lose Life fires in play and is counted', () => {
    const o = { events: { player: [{ trigger: 'onCollide', param: 'coin', action: 'loseLife', actionParam: '' }] } };
    const w = play({ '1,1': 'player', '2,1': 'coin' }, ['ArrowRight'], o, 8, 6);
    expect(w.lives).toBe(2);
    expect(w.fired).toContain('player:0');
  });

  it('Collides With water -> Stop is reported as running; an Every rule runs (counted in moves); AI talk says why it does not', () => {
    const rules = E.compileRules({ player: [
      { trigger: 'onCollide', param: 'lava', action: 'stop' },
      { trigger: 'onTimer', param: '1s', action: 'move', actionParam: 'up' },
      { trigger: 'onTalk', action: 'aiTalk' }
    ] });
    // Round 2 (2026-11-23): "Every" counts moves now, so this rule runs; it used to be reported as never running.
    expect(rules.list.map((r) => r.runs)).toEqual([true, true, false]);
    expect(rules.timers[0]).toMatchObject({ n: 1, action: 'move', param: 'up' });
    expect(rules.list[2].why).toBe('ai');
    const w = play({ '1,1': 'player', '2,1': 'lava' }, ['ArrowRight'], { events: { player: [{ trigger: 'onCollide', param: 'lava', action: 'stop' }] } }, 8, 6);
    expect([w.px, w.lives]).toEqual([1, 3]);
  });

  it('Game Starts -> Gravity on turns a top-down level into a side view', () => {
    const o = { events: { player: [{ trigger: 'onStart', action: 'gravity', actionParam: 'on' }] } };
    expect(E.init({ '1,1': 'player' }, 8, 6, o).grav).toBe(true);
  });
});

describe('level check (solve) uses the same rules', () => {
  it('every starter can be won with every coin reachable', () => {
    for (const s of STARTERS) {
      // The app passes puzzle: true for Puzzle levels (round 2: crates and targets).
      const r = E.solve(s.tiles, 16, 12, { gravity: s.type === 'platformer', puzzle: s.type === 'puzzle' });
      expect(r.winnable, s.name).toBe(true);
      expect(r.coinsReach, s.name).toBe(r.coinsTotal);
    }
  });

  it('Ice Cavern is a real puzzle now (it used to be won in 2 slides with no coin reachable)', () => {
    const r = E.solve(starter('Ice Cavern').tiles, 16, 12, {});
    expect(r.moves).toBeGreaterThanOrEqual(8);
    expect(r.coinsTotal).toBe(3);
  });

  it('the best route replays in Play to a win with the reported moves and lives', () => {
    for (const s of STARTERS) {
      const o = { gravity: s.type === 'platformer', puzzle: s.type === 'puzzle' };
      const r = E.solve(s.tiles, 16, 12, o);
      const w = play(s.tiles, r.inputs, o);
      expect(w.won, s.name).toBe(true);
      expect(w.moves, s.name).toBe(r.moves);
      expect(w.hurts, s.name).toBe(r.livesLost);
    }
  });

  it('a walled-off flag is reported as not winnable, a missing player as no player', () => {
    const t = border({ '1,1': 'player', '10,5': 'flag', '9,5': 'wall', '11,5': 'wall', '10,4': 'wall', '10,6': 'wall' });
    expect(E.solve(t, 16, 12, {}).winnable).toBe(false);
    expect(E.solve({ '3,3': 'flag' }, 16, 12, {}).hasPlayer).toBe(false);
  });

  it('safest route first: it walks around lava when it can', () => {
    const t = { '0,0': 'player', '1,0': 'lava', '2,0': 'flag' };
    const r = E.solve(t, 4, 3, {});
    expect(r.livesLost).toBe(0);
    expect(r.moves).toBe(4);
  });
});

describe('challenges are checked by playing, not by counting tiles', () => {
  const CH = new Function(slice('function countTile', 'var STARTERS') + '\nreturn CHALLENGES;')();
  const by = Object.fromEntries(CH.map((c) => [c.id, c]));
  const pass = (c, t, o) => c.requirements.every((r) => !!r.check(t, 16, 12, o || {}));

  it('First Steps fails when the player is boxed in, even with every tile placed', () => {
    const ok = { '1,1': 'player', '2,2': 'coin', '3,3': 'coin', '4,4': 'coin', '5,5': 'flag' };
    expect(pass(by.first_steps, ok)).toBe(true);
    const boxed = Object.assign({}, ok, { '2,1': 'wall', '0,1': 'wall', '1,0': 'wall', '1,2': 'wall' });
    expect(pass(by.first_steps, boxed)).toBe(false);
  });

  it('Key Master needs doors that really block the way', () => {
    const t = border({ '1,1': 'player', '14,10': 'flag', '3,3': 'key', '8,8': 'key', '2,9': 'npc' });
    for (let y = 1; y < 11; y++) { t['5,' + y] = 'wall'; t['10,' + y] = 'wall'; }
    t['5,5'] = 'door'; t['10,5'] = 'door';
    expect(pass(by.key_master, t)).toBe(true);
    const open = Object.assign({}, t, { '5,8': 'path', '10,8': 'path' });
    expect(pass(by.key_master, open)).toBe(false);
  });

  it('Danger Zone needs a route that loses no life', () => {
    const t = { '0,0': 'player', '1,0': 'lava', '0,1': 'lava', '1,1': 'spikes', '3,3': 'flag', '2,0': 'coin',
      '4,4': 'grass', '5,4': 'grass', '6,4': 'grass', '7,4': 'grass', '8,4': 'grass' };
    expect(pass(by.danger_zone, t)).toBe(false);
  });
});

describe('lesson quizzes', () => {
  it('the right answer is not always in the same place, and every wrong option explains itself', () => {
    const positions = new Set(LESSONS.map((l) => l.quiz.correct));
    expect(positions.size).toBeGreaterThanOrEqual(3);
    for (const l of LESSONS) {
      expect(l.quiz.why.length, l.id).toBe(4);
      l.quiz.why.forEach((w, i) => { if (i !== l.quiz.correct) expect(w.length, l.id + ' ' + i).toBeGreaterThan(20); });
    }
  });

  it('the right answer is never the single longest option', () => {
    for (const l of LESSONS) {
      const lens = l.quiz.options.map((o) => o.length);
      const max = Math.max(...lens);
      const longest = lens.filter((n) => n === max).length === 1 && lens[l.quiz.correct] === max;
      expect(longest, l.id).toBe(false);
    }
  });
});

describe('the Difficulty Tuner reports only what it measured', () => {
  it('no invented deaths or completion time is shown', () => {
    expect(src).not.toContain("' deaths typical · completion time '");
    expect(src).toContain('Measure your level (the game engine plays it)');
  });
});

// ---- mounted tool ----
let host; let root; let latest;
const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
async function mount(cfg, initial, ctxExtra) {
  function Harness() {
    const [data, setData] = React.useState({ gameStudio: initial });
    latest = data.gameStudio;
    const ctx = makeCtx(Object.assign({ toolData: data, setToolData: setData, labToolData: data, setLabToolData: setData }, ctxExtra || {}));
    return cfg.render(ctx);
  }
  await act(async () => { root.render(React.createElement(Harness)); await Promise.resolve(); });
}
const btn = (re) => [...host.querySelectorAll('button')].find((b) => re.test(b.textContent.trim()) || re.test(b.getAttribute('aria-label') || ''));
async function click(el) { await act(async () => { el.click(); await Promise.resolve(); }); }
async function key(el, k) { await act(async () => { el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true })); await Promise.resolve(); }); }

describe('mounted tool', () => {
  let cfg;
  beforeEach(() => {
    resetStemLab();
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    host = document.createElement('div'); document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    cfg = loadTool(toolPath, 'gameStudio');
  });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); });

  it('option A (index 0) can be checked', async () => {
    await mount(cfg, { tab: 'learn', activeLesson: 'gameloop', learnAnswer: 0 });
    expect(btn(/^Check Answer$/)).toBeTruthy();
  });

  it('a damaged rule list in a save does not crash the Events tab', async () => {
    await mount(cfg, { tab: 'events', activeSprite: 'player', eventSprite: 'player', events: { player: 'oops', enemy: [null] } });
    expect(host.textContent).toContain('Event Rules');
  });

  it('play, then leave the Play tab: the map is unchanged', async () => {
    const cc = STARTERS.find((s) => s.name === 'Coin Collector');
    await mount(cfg, { tab: 'play', tiles: Object.assign({}, cc.tiles) });
    await click(btn(/Start Game/));
    const vp = host.querySelector('[role="application"]');
    for (const k of ['ArrowRight', 'ArrowRight', 'ArrowDown', 'ArrowDown', 'ArrowRight']) await key(vp, k);
    await click(host.querySelector('#gs-tab-map'));
    expect(JSON.stringify(latest.tiles)).toBe(JSON.stringify(cc.tiles));
  });

  it('winning the same level again gives no more XP', async () => {
    const xp = vi.fn();
    await mount(cfg, { tab: 'play', tiles: { '1,1': 'player', '2,1': 'flag' } }, { awardXP: xp });
    for (let i = 0; i < 3; i++) {
      await click(btn(/Start Game|Play Again/));
      await key(host.querySelector('[role="application"]'), 'ArrowRight');
    }
    expect(xp.mock.calls.filter((c) => c[1] === 10).length).toBe(1);
  });

  it('a wrong quiz answer does not light up the right one', async () => {
    await mount(cfg, { tab: 'learn', activeLesson: 'collision', learnAnswer: 0, learnShowResult: true });
    const right = [...host.querySelectorAll('button')].find((b) => b.textContent.includes('same grid cell'));
    expect(right.className).not.toMatch(/green/);
    expect(btn(/Try again/)).toBeTruthy();
  });
});

describe('render', () => {
  it('renders every tab without throwing', () => {
    resetStemLab();
    loadTool(toolPath, 'gameStudio');
    for (const tab of ['map', 'sprite', 'events', 'play', 'learn', 'challenges', 'projects', 'diffHunt']) {
      const html = renderTool('gameStudio', { gameStudio: { tab, tiles: starter('Puzzle Dungeon').tiles } });
      expect(html.length, tab).toBeGreaterThan(1000);
    }
  });
});
