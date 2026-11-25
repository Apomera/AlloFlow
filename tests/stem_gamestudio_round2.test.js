// Game Design Studio, sports-labs pass round 2 (2026-11-23): drawn sprites as piece looks,
// touch drag-painting with a Paint / Scroll toggle, Puzzle's own rule (crates + targets),
// "Every N moves" rules, five top tabs instead of eight, and a header that says what to do.
// GS_FILE=<path> runs everything against another copy (fail-first check on the pre-round-2 file).
import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const toolPath = process.env.GS_FILE || 'stem_lab/stem_tool_gamestudio.js';
const src = fs.readFileSync(toolPath, 'utf8');
function slice(a, b) {
  const s = src.indexOf(a); const e = src.indexOf(b, s);
  expect(s, a).toBeGreaterThan(-1); expect(e, b).toBeGreaterThan(s);
  return src.slice(s, e);
}
// eslint-disable-next-line no-new-func
const E = new Function(slice('var GS_E = (function() {', '// Small cache so the challenge list') + '\nreturn GS_E;')();
// eslint-disable-next-line no-new-func
const STARTERS = new Function(slice('function makeStarter', 'function floodFill') + '\nreturn STARTERS;')();
const S = (o) => E.settings(o || {});
function play(tiles, keys, o, W = 16, H = 12) {
  const s = S(o);
  let w = E.init(tiles, W, H, o);
  for (const k of keys) w = E.step(w, k, s);
  return w;
}
const PZ = { puzzle: true };

describe('Puzzle has its own rule: crates and targets (engine)', () => {
  it('walking into a crate pushes it one square; a wall or another crate behind it stops it', () => {
    const t = { '1,1': 'player', '2,1': 'crate', '3,1': 'path', '4,1': 'path' };
    const w = play(t, ['ArrowRight'], PZ, 8, 6);
    expect([w.px, w.py]).toEqual([2, 1]);
    expect(E.tileAt(w, 3, 1)).toBe('crate');
    // The square it left takes the floor around it, like any other piece.
    expect(E.tileAt(w, 2, 1)).toBe('path');
    const stuck = play({ '1,1': 'player', '2,1': 'crate', '3,1': 'wall' }, ['ArrowRight'], PZ, 8, 6);
    expect(stuck.px).toBe(1);
    expect(stuck.msg.k).toBe('crateStuck');
    const two = play({ '1,1': 'player', '2,1': 'crate', '3,1': 'crate' }, ['ArrowRight'], PZ, 8, 6);
    expect(two.px).toBe(1);
  });

  it('there is no pulling: walking away leaves the crate where it is', () => {
    const w = play({ '2,1': 'player', '3,1': 'crate' }, ['ArrowLeft'], PZ, 8, 6);
    expect(E.tileAt(w, 3, 1)).toBe('crate');
  });

  it('the flag stays locked until every target has a crate on it', () => {
    const t = { '1,1': 'player', '2,1': 'crate', '4,1': 'target', '1,2': 'flag' };
    const early = play(t, ['ArrowDown'], PZ, 8, 6);
    expect(early.won).toBe(false);
    expect(early.msg.k).toBe('flagLocked');
    const done = play(t, ['ArrowRight', 'ArrowRight', 'ArrowLeft', 'ArrowLeft', 'ArrowDown'], PZ, 8, 6);
    expect(E.covered(done)).toBe(1);
    expect(done.won).toBe(true);
    // Pushing the crate off its target locks the flag again; the target square comes back.
    const off = play(t, ['ArrowRight', 'ArrowRight', 'ArrowRight'], PZ, 8, 6);
    expect(E.covered(off)).toBe(0);
    expect(E.tileAt(off, 4, 1)).toBe('target');
  });

  it('in Top-down and Platformer a crate is a wall and targets are floor (the rule belongs to Puzzle)', () => {
    const t = { '1,1': 'player', '2,1': 'crate', '1,2': 'flag', '5,5': 'target' };
    expect(play(t, ['ArrowRight'], {}, 8, 6).px).toBe(1);
    expect(play(t, ['ArrowDown'], {}, 8, 6).won).toBe(true);
  });

  it('the level check knows a puzzle with more targets than crates can never be won', () => {
    const r = E.solve({ '1,1': 'player', '3,3': 'crate', '5,1': 'target', '5,3': 'target', '6,6': 'flag' }, 8, 8, PZ);
    expect(r.winnable).toBe(false);
    expect([r.targets, r.crates]).toEqual([2, 1]);
  });

  it('the Crate Push starter is a Puzzle level the engine proves solvable, and its route replays to a win', () => {
    const cp = STARTERS.find((s) => s.name === 'Crate Push');
    expect(cp && cp.type).toBe('puzzle');
    const r = E.solve(cp.tiles, 16, 12, PZ);
    expect(r.winnable).toBe(true);
    expect(r.targets).toBe(2);
    expect(r.moves).toBeGreaterThan(30);
    const w = play(cp.tiles, r.inputs, PZ);
    expect(w.won).toBe(true);
    expect(w.moves).toBe(r.moves);
    expect(E.covered(w)).toBe(2);
    // Without the crates on the targets the same walk to the flag does not win.
    expect(r.coinsReach).toBe(r.coinsTotal);
  });
});

describe('"Every N moves" rules run in Play (engine)', () => {
  it('a player Every rule fires on every Nth move', () => {
    const o = { events: { player: [{ trigger: 'onTimer', param: '2', action: 'move', actionParam: 'right' }] } };
    const w1 = play({ '1,1': 'player' }, ['ArrowDown'], o, 8, 8);
    expect([w1.px, w1.py]).toEqual([1, 2]);
    const w2 = play({ '1,1': 'player' }, ['ArrowDown', 'ArrowDown'], o, 8, 8);
    expect([w2.px, w2.py]).toEqual([2, 3]);
    expect(w2.fired).toContain('player:0');
  });

  it('old "2s" saves read as 2 moves; nothing picked does not run', () => {
    const r = E.compileRules({ player: [
      { trigger: 'onTimer', param: '2s', action: 'loseLife' },
      { trigger: 'onTimer', param: '', action: 'loseLife' },
      { trigger: 'onTimer', param: '1', action: 'winGame' }
    ], npc: [{ trigger: 'onTimer', param: '1', action: 'collect' }] });
    expect(r.list.map((x) => x.runs)).toEqual([true, false, false, false]);
    expect(r.list.map((x) => x.why)).toEqual(['', 'pick', 'timerAct', 'timerWho']);
    expect(r.timers[0].n).toBe(2);
  });

  it('enemies with "Every 2 moves" step only on even moves (slower enemies)', () => {
    const o = { events: { enemy: [{ trigger: 'onTimer', param: '2', action: 'move', actionParam: 'right' }] } };
    const t = { '0,0': 'player', '2,4': 'enemy' };
    expect(play(t, ['ArrowRight'], o, 10, 6).en[0][0]).toBe(2);
    expect(play(t, ['ArrowRight', 'ArrowLeft'], o, 10, 6).en[0][0]).toBe(3);
  });

  it('the level check plays the Every rule too, and its route replays in Play', () => {
    const o = { events: { player: [{ trigger: 'onTimer', param: '2', action: 'move', actionParam: 'right' }] } };
    const t = { '1,1': 'player', '5,1': 'flag' };
    const r = E.solve(t, 8, 4, o);
    expect(r.winnable).toBe(true);
    expect(r.moves).toBe(3);
    const w = play(t, r.inputs, o, 8, 4);
    expect(w.won).toBe(true);
  });
});

describe('looks change only the picture (engine)', () => {
  it('the level check gives identical results with or without looks', () => {
    for (const s of STARTERS) {
      const o = { gravity: s.type === 'platformer', puzzle: s.type === 'puzzle' };
      const a = E.solve(s.tiles, 16, 12, o);
      const b = E.solve(s.tiles, 16, 12, Object.assign({ looks: { player: { '1,1': '#ff0000' } } }, o));
      expect(JSON.stringify(b), s.name).toBe(JSON.stringify(a));
    }
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
const grid = () => host.querySelector('[aria-label^="Level map"]');
// jsdom has no layout: map each cell to a 10 px square so elementFromPoint can find it.
function stubLayout(W) {
  document.elementFromPoint = (x, y) => grid().children[Math.floor(y / 10) * W + Math.floor(x / 10)] || null;
}
async function pointer(type, el, x, y, pointerType) {
  await act(async () => {
    const ev = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0, buttons: type === 'pointerup' ? 0 : 1 });
    Object.defineProperty(ev, 'pointerId', { value: 7 });
    Object.defineProperty(ev, 'pointerType', { value: pointerType });
    el.dispatchEvent(ev);
    await Promise.resolve();
  });
}
async function drag(pointerType, cells, W) {
  const g = grid();
  const at = (i) => [(i % W) * 10 + 5, Math.floor(i / W) * 10 + 5];
  await pointer('pointerdown', g, ...at(cells[0]), pointerType);
  for (const i of cells.slice(1)) await pointer('pointermove', g, ...at(i), pointerType);
  await pointer('pointerup', g, ...at(cells[cells.length - 1]), pointerType);
}

describe('mounted tool (round 2)', () => {
  let cfg;
  let coarse = false;
  beforeEach(() => {
    resetStemLab();
    coarse = false;
    window.matchMedia = (q) => ({ matches: /pointer:\s*coarse/.test(q) ? coarse : false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
    vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
    host = document.createElement('div'); document.body.appendChild(host);
    root = ReactDOMClient.createRoot(host);
    cfg = loadTool(toolPath, 'gameStudio');
  });
  afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); delete document.elementFromPoint; });

  it('a drawing can become the Player look: the map shows it, the cell is still named Player, and the level check is not reset', async () => {
    const tiles = { '0,0': 'player', '3,0': 'flag' };
    await mount(cfg, { tab: 'sprite', gridW: 8, gridH: 6, tiles, spritePixels: { '7,7': '#123456', '8,7': '#123456' } });
    await click(btn(/^Use my drawing as the Player look$/));
    expect(latest.looks.player['7,7']).toBe('#123456');
    await click(host.querySelector('#gs-tab-map'));
    await click(btn(/Can it be won\? Test it/));
    const sig = latest.levelCheck.sig;
    const cell = grid().children[0];
    expect(cell.getAttribute('aria-label')).toMatch(/Player$/);
    expect(cell.querySelector('svg[data-gs-look="player"]')).toBeTruthy();
    expect(host.textContent).toContain('Yes, it can be won');
    // Back to the default look: the check result stays valid, the emoji returns.
    await click(host.querySelector('#gs-tab-sprite'));
    await click(btn(/^Back to the default Player look$/));
    expect(latest.looks.player).toBeUndefined();
    await click(host.querySelector('#gs-tab-map'));
    expect(latest.levelCheck.sig).toBe(sig);
    expect(host.textContent).not.toContain('You changed the level');
    expect(grid().children[0].querySelector('svg[data-gs-look]')).toBeNull();
  });

  it('the look shows in Play too', async () => {
    await mount(cfg, { tab: 'play', gridW: 8, gridH: 6, tiles: { '0,0': 'player', '3,0': 'flag' }, looks: { player: { '1,1': '#00ff00' } } });
    await click(btn(/Start Game/));
    expect(host.querySelector('[role="application"] svg[data-gs-look="player"]')).toBeTruthy();
  });

  it('a damaged or hostile look in a save is dropped, not drawn', async () => {
    await mount(cfg, { tab: 'map', gridW: 8, gridH: 6, tiles: { '0,0': 'player' }, looks: { player: { '1,1': 'red"/><script>', 'x': '#fff' }, enemy: 'oops' } });
    expect(grid().children[0].querySelector('svg[data-gs-look]')).toBeNull();
  });

  it('touch: in Paint mode one finger drag paints every square it crosses, and Undo takes back the whole drag', async () => {
    coarse = true;
    await mount(cfg, { tab: 'map', gridW: 8, gridH: 6, tiles: { '7,5': 'flag' }, selectedTile: 'wall', brushTool: 'brush' });
    stubLayout(8);
    expect(btn(/Paint$/)).toBeTruthy();
    await click(btn(/Paint$/));
    expect(latest.touchPaint).toBe(true);
    expect(grid().style.touchAction).toBe('none');
    await drag('touch', [0, 1, 2, 10], 8);
    expect(['0,0', '1,0', '2,0', '2,1'].map((k) => latest.tiles[k])).toEqual(['wall', 'wall', 'wall', 'wall']);
    await click(btn(/^Undo map change$/));
    expect(latest.tiles).toEqual({ '7,5': 'flag' });
  });

  it('touch: in Scroll mode a finger drag does not paint (the page can scroll); a tap still paints', async () => {
    coarse = true;
    await mount(cfg, { tab: 'map', gridW: 8, gridH: 6, tiles: {}, selectedTile: 'wall', brushTool: 'brush' });
    stubLayout(8);
    expect(grid().style.touchAction).toBe('');
    await drag('touch', [0, 1, 2], 8);
    expect(latest.tiles).toEqual({});
    await click(grid().children[3]);
    expect(latest.tiles['3,0']).toBe('wall');
  });

  it('the Paint / Scroll toggle shows only on touch screens', async () => {
    await mount(cfg, { tab: 'map' });
    expect(btn(/Paint$/)).toBeFalsy();
  });

  it('mouse: a drag paints its first square too, and is one Undo step', async () => {
    await mount(cfg, { tab: 'map', gridW: 8, gridH: 6, tiles: {}, selectedTile: 'lava', brushTool: 'brush' });
    stubLayout(8);
    await drag('mouse', [8, 9, 10], 8);
    expect(['0,1', '1,1', '2,1'].map((k) => latest.tiles[k])).toEqual(['lava', 'lava', 'lava']);
    await click(btn(/^Undo map change$/));
    expect(latest.tiles).toEqual({});
  });

  it('Puzzle type says its rule, and Play shows how many targets are covered', async () => {
    const cp = STARTERS.find((s) => s.name === 'Crate Push');
    await mount(cfg, { tab: 'map', gameType: 'puzzle', tiles: Object.assign({}, cp.tiles) });
    expect(host.textContent).toContain('The flag stays locked until a crate sits on every target');
    await click(host.querySelector('#gs-tab-play'));
    await click(btn(/Start Game/));
    expect(host.textContent).toContain('Targets 0/2');
  });

  it('Events: Every counts moves, NPCs are not offered a rule that cannot run, and an enemy Game Starts rule is not called gravity', async () => {
    await mount(cfg, { tab: 'events', eventSprite: 'player', events: { player: [{ trigger: 'onTimer', param: '1s', action: 'loseLife', actionParam: '' }] } });
    const timerSel = host.querySelector('select[aria-label="How many moves"]');
    expect(timerSel.value).toBe('1');
    expect([...timerSel.options].map((o) => o.textContent)).toContain('2 moves');
    expect(host.textContent).toContain('Runs in Play: after every move, the player loses 1 life.');
    await mount(cfg, { tab: 'events', eventSprite: 'npc', events: { npc: [{ trigger: 'onCollide', param: '', action: 'collect', actionParam: '' }] } });
    const when = host.querySelector('select[aria-label="When"]');
    expect([...when.options].map((o) => o.value)).toEqual(['onCollide', 'onTalk']);
    await mount(cfg, { tab: 'events', eventSprite: 'enemy', events: { enemy: [{ trigger: 'onStart', param: '', action: 'move', actionParam: 'toward-player' }] } });
    expect(host.textContent).not.toContain('gravity is toward-player');
    expect(host.textContent).toContain('every turn, each enemy will');
  });

  it('five top tabs; Lessons, Challenges and the Difficulty Tuner live under Learn & Goals; Projects opens from the header', async () => {
    await mount(cfg, { tab: 'map' });
    const tabs = [...host.querySelectorAll('[role="tablist"]')[0].querySelectorAll('[role="tab"]')];
    expect(tabs.map((t) => t.id)).toEqual(['gs-tab-map', 'gs-tab-play', 'gs-tab-sprite', 'gs-tab-events', 'gs-tab-learnHub']);
    await key(host.querySelector('#gs-tab-map'), 'End');
    expect(latest.tab).toBe('learn');
    for (const id of ['learn', 'challenges', 'diffHunt']) expect(host.querySelector('#gs-tab-' + id), id).toBeTruthy();
    await key(host.querySelector('#gs-tab-learn'), 'ArrowRight');
    expect(latest.tab).toBe('challenges');
    await click(host.querySelector('#gs-tab-map'));
    await click(host.querySelector('#gs-tab-learnHub'));
    expect(latest.tab).toBe('challenges');
    await click(host.querySelector('#gs-tab-projects'));
    expect(latest.tab).toBe('projects');
    expect(host.textContent).toContain('Project Name');
    expect(host.querySelector('#gs-tab-map').getAttribute('tabindex')).toBe('0');
  });

  it('the header says what to do, not "Earn XP"', async () => {
    await mount(cfg, { tab: 'map' });
    const head = host.querySelector('.gs-hero').textContent;
    expect(head).toContain('Build a level, play it, change one thing.');
    expect(head).not.toContain('Earn XP');
  });
});
