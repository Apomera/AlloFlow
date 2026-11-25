// Play Lab: what a student does, in order. Predict (pick a receiver), run, read the result.
//
// Before 2026-11-23 the screen showed the answer before the student did anything: a green
// ring on the "most open" receiver, a "Best read: WR1 - 7.3 yd" tile and a "Great match" badge.
// The play then threw to that receiver by itself, so there was nothing to decide. The same
// default call could be run again and again for 8 XP each time, a student with reduced motion
// got "Pass complete" every time and no credit at all, and the field sat below five bands of
// controls. This file mounts the real tool and clicks through it.
//
// PLAYLAB_FILE=<path> points the suite at another copy (the pre-fix copy turns it red).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const FILE = process.env.PLAYLAB_FILE || 'stem_lab/stem_tool_playlab.js';
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const act = React.act;
let mounted = [];
let clock = 0;
let frames = [];

const fakeCtx2d = () => new Proxy({}, {
  get: (o, k) => (k in o ? o[k] : (k === 'measureText' ? () => ({ width: 20 }) : (k === 'createLinearGradient' || k === 'createRadialGradient') ? () => ({ addColorStop() {} }) : () => {})),
  set: (o, k, v) => { o[k] = v; return true; }
});

function setup({ reduced }) {
  vi.spyOn(window.HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => fakeCtx2d());
  window.matchMedia = () => ({ matches: !!reduced, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  clock = 1000; frames = [];
  vi.spyOn(performance, 'now').mockImplementation(() => clock);
  window.requestAnimationFrame = globalThis.requestAnimationFrame = (cb) => { frames.push(cb); return frames.length; };
  window.cancelAnimationFrame = globalThis.cancelAnimationFrame = () => {};
  try { window.localStorage.removeItem('playlab.state.v1'); } catch (e) { /* no storage */ }
  delete window.__alloflowPlayLab;
  resetStemLab();
  loadTool(FILE, 'playlab');
}

// Advance the fake clock by `seconds` and run the queued animation frames.
function tick(seconds) {
  clock += seconds * 1000;
  const run = frames; frames = [];
  act(() => { run.forEach((cb) => cb(clock)); });
}

function mount(initial) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const out = { state: null };
  const xp = vi.fn();
  function Harness() {
    const [data, setData] = React.useState(initial || {});
    out.state = data;
    const setter = (fn) => setData((prev) => (typeof fn === 'function' ? fn(prev) : fn));
    return window.StemLab._registry.playlab.render(makeCtx({ toolData: data, setToolData: setter, awardXP: xp }));
  }
  const root = ReactDOMClient.createRoot(host);
  act(() => { root.render(React.createElement(Harness)); });
  mounted.push({ root, host });
  return { host, out, xp, pl: () => out.state.playlab };
}

const click = (el) => act(() => { el.click(); });
const runButton = (host) => host.querySelector('.playlab-run-button');
const target = (host, id) => host.querySelector('[data-playlab-target="' + id + '"]');
const live = () => (document.getElementById('allo-live-playlab') || {}).textContent || '';
const before = (a, b) => !!(a.compareDocumentPosition(b) & 4); // a comes before b in the page

beforeEach(() => { mounted = []; });
afterEach(() => {
  while (mounted.length) { const m = mounted.pop(); act(() => m.root.unmount()); m.host.remove(); }
  vi.restoreAllMocks();
});

describe('Play Lab first screen', () => {
  it('puts the field and its action above the setup lists', () => {
    setup({ reduced: true });
    const { host } = mount({});
    const canvas = host.querySelector('canvas[data-playlab-canvas]');
    const setupPanel = host.querySelector('[data-playlab-setup]');
    const goal = host.querySelector('[data-playlab-goal]');
    expect(canvas && setupPanel && goal).toBeTruthy();
    expect(before(goal, canvas), 'goal line, then the field').toBe(true);
    expect(before(canvas, runButton(host)), 'field, then the action').toBe(true);
    expect(before(runButton(host), setupPanel), 'action, then the play and defense lists').toBe(true);
    // The action row lives inside the field stage, so it is there in fullscreen too.
    expect(host.querySelector('[data-allo-fs-stage]').contains(runButton(host))).toBe(true);
    // Secondary controls sit behind ONE disclosure.
    const more = host.querySelectorAll('details[data-playlab-more]');
    expect(more.length).toBe(1);
    expect(more[0].querySelector('[data-playlab-key-move]')).toBeTruthy();
    expect(more[0].querySelector('#pl-ytg')).toBeTruthy();
    expect(more[0].querySelector('[data-playlab-words]')).toBeTruthy();
  });

  it('does not show who is open before the student commits', () => {
    setup({ reduced: true });
    const { host } = mount({});
    const text = host.textContent;
    expect(text).not.toMatch(/Most open/i);
    expect(text).not.toMatch(/Best read/i);
    expect(text).not.toMatch(/Great match|Tough match|Workable/);
    expect(text).not.toMatch(/yd from nearest defender/);
    expect(host.querySelector('[data-playlab-film]')).toBeNull();
    expect(host.querySelector('canvas[data-playlab-canvas]').getAttribute('aria-label')).not.toMatch(/open receiver/i);
    // Picking a target does not reveal it either.
    click(target(host, 'SLOT'));
    expect(host.querySelector('[data-playlab-film]')).toBeNull();
    expect(host.textContent).not.toMatch(/Best read/i);
  });

  it('offers one target button per receiver, at least 44 px tall by its own style', () => {
    setup({ reduced: true });
    const { host } = mount({});
    const ids = [...host.querySelectorAll('[data-playlab-target]')].map((b) => b.getAttribute('data-playlab-target'));
    expect(ids.sort()).toEqual(['RB', 'SLOT', 'TE', 'WR1', 'WR2']);
    const css = [...document.querySelectorAll('style')].map((s) => s.textContent).join('\n');
    expect(css).toMatch(/\.playlab-target-chip\{[^}]*min-height:48px/);
    expect(css).toMatch(/\.playlab-run-button\{[^}]*min-height:44px/);
    expect(css).toMatch(/\.playlab-toggle-rack label\{[^}]*min-height:44px/);
  });
});

describe('Play Lab predict, then run', () => {
  it('asks for a receiver first: running with no target scores nothing', () => {
    setup({ reduced: true });
    const { host, xp, pl } = mount({});
    click(runButton(host));
    expect(host.querySelector('.playlab-need-target[role="alert"]')).toBeTruthy();
    expect(pl().runOutcome || null).toBeNull();
    expect(xp).not.toHaveBeenCalled();
  });

  it('gives the model verdict, opens the film room, and pays XP once', () => {
    setup({ reduced: true });
    const { host, xp, pl } = mount({});
    const model = window.StemLab.PlayLabModel;
    const sim = model.simulate({ playId: 'slant', coverageId: 'cover1', targetId: 'SLOT' });
    click(target(host, 'SLOT'));
    click(runButton(host));
    const o = pl().runOutcome;
    expect(o.type).toBe(sim.outcome.type);
    expect(o.yards).toBe(sim.outcome.yards);
    expect(o.gapYd).toBeCloseTo(sim.outcome.gapYd, 9);
    const verdict = host.querySelector('[data-playlab-verdict]');
    expect(verdict.textContent).toContain('Complete to SL for ' + sim.outcome.yards + ' yards');
    expect(verdict.textContent).toContain(sim.read.gapYd.toFixed(1) + ' yards');
    expect(live()).toContain('Complete to SL for ' + sim.outcome.yards + ' yards');
    // Film room: one row per receiver, numbers straight from the model.
    const rows = [...host.querySelectorAll('[data-playlab-film] tbody tr')];
    expect(rows.length).toBe(sim.reads.length);
    sim.reads.forEach((r, i) => {
      expect(rows[i].textContent).toContain(r.routeYd.toFixed(1) + ' yd');
      expect(rows[i].textContent).toContain(r.open ? 'Open' : 'Covered');
    });
    expect(xp.mock.calls).toEqual([['playlab', sim.outcome.isBest ? 12 : 8, sim.outcome.isBest ? 'Best read' : 'Completion']]);
    expect(pl().drillStats.completions).toBe(1);
    expect(pl().drillStats.hotStreak).toBe(1);
    expect(pl().playCatalog['football:slant'].successCount).toBe(1);

    // The same call again: it replays, and earns nothing.
    click(runButton(host));
    expect(xp.mock.calls.length).toBe(1);
    expect(pl().drillStats.completions).toBe(1);
    expect(pl().drillStats.hotStreak).toBe(1);
    expect(pl().playCatalog['football:slant'].successCount).toBe(1);
    expect(pl().runOutcome.counted).toBe(false);
    expect(host.querySelector('[data-playlab-verdict]').textContent).toMatch(/does not count again/);
    for (let i = 0; i < 5; i += 1) click(runButton(host));
    expect(xp.mock.calls.length).toBe(1);
  });

  it('pays more for the best read, and a new target is a new call', () => {
    setup({ reduced: true });
    const { host, xp, pl } = mount({});
    const best = window.StemLab.PlayLabModel.simulate({ playId: 'slant', coverageId: 'cover1' }).best;
    click(target(host, 'TE'));
    click(runButton(host));
    click(target(host, best.id));
    click(runButton(host));
    expect(xp.mock.calls).toEqual([['playlab', 8, 'Completion'], ['playlab', 12, 'Best read']]);
    expect(pl().drillStats.bestReads).toBe(1);
    expect(host.querySelector('[data-playlab-verdict]').textContent).toContain('That was the best read');
  });

  it('a covered throw and a sack are failures, explained with the model numbers', () => {
    setup({ reduced: true });
    const model = window.StemLab.PlayLabModel;
    const a = mount({ playlab: { sport: 'football', playId: 'fourverts', coverageId: 'cover3', targetId: 'TE', customPositions: {} } });
    const simA = model.simulate({ playId: 'fourverts', coverageId: 'cover3', targetId: 'TE' });
    expect(simA.outcome.type).toBe('brokenup');
    click(runButton(a.host));
    expect(a.host.querySelector('[data-playlab-verdict="brokenup"]').textContent).toContain('Covered');
    expect(a.host.querySelector('[data-playlab-verdict]').textContent).toContain(simA.read.gapYd.toFixed(1) + ' yards');
    expect(a.xp).not.toHaveBeenCalled();
    expect(a.pl().drillStats.hotStreak).toBe(0);

    const b = mount({ playlab: { sport: 'football', playId: 'hailmary', coverageId: 'cover0', targetId: 'WR1', customPositions: {} } });
    click(runButton(b.host));
    const sack = b.host.querySelector('[data-playlab-verdict="sack"]');
    expect(sack.textContent).toContain('Sack');
    expect(sack.textContent).toContain('2.0 s');
    expect(b.xp).not.toHaveBeenCalled();
  });

  it('changing the play clears the target and closes the film room', () => {
    setup({ reduced: true });
    const { host, pl } = mount({});
    click(target(host, 'SLOT'));
    click(runButton(host));
    expect(host.querySelector('[data-playlab-film]')).toBeTruthy();
    const mesh = [...host.querySelectorAll('[data-playlab-setup] button')].find((b) => /Mesh \(Air Raid\)/.test(b.textContent));
    click(mesh);
    expect(pl().playId).toBe('mesh');
    expect(pl().targetId).toBeNull();
    expect(host.querySelector('[data-playlab-film]')).toBeNull();
    expect(host.querySelector('[data-playlab-verdict]')).toBeNull();
    expect(host.textContent).not.toMatch(/Best read/i);
  });

  it('with motion on, the verdict waits for the play to finish', () => {
    setup({ reduced: false });
    const { host, xp, pl } = mount({});
    const sim = window.StemLab.PlayLabModel.simulate({ playId: 'slant', coverageId: 'cover1', targetId: 'SLOT' });
    click(target(host, 'SLOT'));
    click(runButton(host));
    expect(pl().runActive).toBe(true);
    tick(0.02);
    tick(sim.outcome.endT * 0.5);
    expect(pl().runActive).toBe(true);
    expect(host.querySelector('[data-playlab-verdict]'), 'no verdict mid-play').toBeNull();
    expect(host.querySelector('[data-playlab-film]'), 'no film room mid-play').toBeNull();
    expect(xp).not.toHaveBeenCalled();
    tick(sim.outcome.endT * 0.5 + 0.2);
    expect(host.querySelector('[data-playlab-verdict]'), 'still held just after the catch').toBeNull();
    tick(1.0);
    expect(pl().runActive).toBe(false);
    expect(host.querySelector('[data-playlab-verdict]').textContent).toContain('Complete to SL');
    expect(xp).toHaveBeenCalledTimes(1);
  });
});

describe('Play Lab missions and field tools', () => {
  it('missions are on for a student from the start, and a play moves them on', () => {
    setup({ reduced: true });
    const { host, pl } = mount({});
    expect(host.querySelector('[data-playlab-goal]').textContent).toMatch(/Mission 1 of 10/);
    click(target(host, 'SLOT'));
    click(runButton(host));
    expect(pl().drillTaskIdx).toBe(1);
    expect(host.querySelector('[data-playlab-goal]').textContent).toMatch(/Mission 2 of 10/);
    // Free play and back: progress is kept, so XP cannot be earned twice this way.
    click(host.querySelector('[data-playlab-free-play]'));
    expect(pl().missionsChoice).toBe('off');
    expect(host.querySelector('[data-playlab-goal]').textContent).not.toMatch(/Mission 2/);
    click(host.querySelector('[data-playlab-missions-on]'));
    expect(pl().missionsChoice).toBe('on');
    expect(host.querySelector('[data-playlab-goal]').textContent).toMatch(/Mission 2 of 10/);
    expect(pl().drillStats.completions).toBe(1);
  });

  it('a teacher starts in free play, with a clear way into the missions', () => {
    setup({ reduced: true });
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = ReactDOMClient.createRoot(host);
    function Teacher() {
      const [data, setData] = React.useState({});
      const setter = (fn) => setData((prev) => (typeof fn === 'function' ? fn(prev) : fn));
      return window.StemLab._registry.playlab.render(makeCtx({ toolData: data, setToolData: setter, isTeacherMode: true }));
    }
    act(() => { root.render(React.createElement(Teacher)); });
    mounted.push({ root, host });
    expect(host.querySelector('[data-playlab-goal]').textContent).not.toMatch(/Mission 1/);
    expect(host.querySelector('[data-playlab-missions-on]').textContent).toMatch(/Missions/);
    click(host.querySelector('[data-playlab-missions-on]'));
    expect(host.querySelector('[data-playlab-goal]').textContent).toMatch(/Mission 1 of 10/);
  });

  it('"yards to goal" is the ball spot: changing it moves the line of scrimmage', () => {
    setup({ reduced: true });
    const { host, pl } = mount({});
    const input = host.querySelector('#pl-ytg');
    expect(input.value).toBe('75');
    act(() => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, '20');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(pl().losX).toBe(90);
    expect(host.querySelector('#pl-ytg').value).toBe('20');
  });

  it('the Scout map shows a grade only for a matchup the student has run', () => {
    setup({ reduced: true });
    const { host } = mount({});
    click(host.querySelector('#playlab-workspace-tab-scout'));
    const cells = () => [...host.querySelectorAll('button[role="cell"]')];
    expect(cells().length).toBe(16 * 8);
    expect(cells().every((c) => c.textContent === '?')).toBe(true);
    click(target(host, 'SLOT'));
    click(runButton(host));
    const known = cells().filter((c) => c.textContent !== '?');
    expect(known.length).toBe(1);
    expect(known[0].getAttribute('aria-label')).toMatch(/^Slant \(West Coast\) vs Cover 1 \(Man\): /);
  });
});

describe('Play Lab soccer', () => {
  const soccer = () => ({ playlab: { sport: 'soccer', formationId: '433', conceptId: 'tikitaka', shapeId: 'midblock', savedPlays: [], customPositions: {}, badgesEarned: {}, drillStats: {} } });

  const pass = (host, id) => host.querySelector('[data-playlab-pass="' + id + '"]');

  it('asks for a pass first: running with none scores nothing, and nothing tells the answer', () => {
    setup({ reduced: true });
    const { host, xp, pl } = mount(soccer());
    const ids = [...host.querySelectorAll('[data-playlab-pass]')].map((b) => b.getAttribute('data-playlab-pass')).sort();
    expect(ids).toEqual(['behind', 'inside', 'late']);
    click(runButton(host));
    expect(host.querySelector('.playlab-need-target[role="alert"]')).toBeTruthy();
    expect(pl().runOutcome || null).toBeNull();
    expect(xp).not.toHaveBeenCalled();
    expect(host.querySelector('[data-playlab-film]')).toBeNull();
    expect(host.textContent).not.toMatch(/Best pass|Great match|Tough match|Workable/);
  });

  it('gives the model result for the chosen pass, opens the film room, and pays XP once', () => {
    setup({ reduced: true });
    const { host, xp, pl } = mount(soccer());
    const S = window.StemLab.PlayLabModel.soccer();
    const m = S.move('433', 'tikitaka', 'midblock', 'behind');
    click(pass(host, 'behind'));
    click(runButton(host));
    const o = pl().runOutcome;
    expect(o.type).toBe(m.outcome.type);
    expect(o.xG).toBeCloseTo(m.outcome.xG, 12);
    expect(o.finalReceiverId).toBe(m.read.runnerId);
    const v = host.querySelector('[data-playlab-verdict="soccer"]').textContent;
    expect(v).toContain(m.read.runnerId + ' shoots');
    expect(v).toContain(m.outcome.xG.toFixed(2));
    expect(v).toContain(m.read.runM.toFixed(1) + ' m');
    const rows = [...host.querySelectorAll('[data-playlab-film] tbody tr')];
    expect(rows.length).toBe(m.reads.length);
    m.reads.forEach((r, i) => expect(rows[i].textContent).toContain(r.type === 'shot' ? r.xG.toFixed(2) : r.type === 'cut' ? 'Cut out' : 'Offside'));
    const good = m.outcome.xG >= S.constants.GOOD_XG;
    expect(xp.mock.calls).toEqual(good ? [['playlab', m.outcome.isBest ? 12 : 8, m.outcome.isBest ? 'Best pass' : 'Real chance made']] : []);
    expect(pl().drillStats.conceptsRun.tikitaka).toBe(true);
    // The same pass again replays and earns nothing.
    click(runButton(host));
    click(runButton(host));
    expect(xp.mock.calls.length).toBe(good ? 1 : 0);
    expect(pl().runOutcome.counted).toBe(false);
  });

  it('an offside pass is explained with the line and the step of the trap', () => {
    setup({ reduced: true });
    const { host, xp, pl } = mount({ playlab: Object.assign(soccer().playlab, { shapeId: 'offsidetrap' }) });
    const m = window.StemLab.PlayLabModel.soccer().move('433', 'tikitaka', 'offsidetrap', 'behind');
    expect(m.outcome.type).toBe('offside');
    click(pass(host, 'behind'));
    click(runButton(host));
    expect(pl().runOutcome.type).toBe('offside');
    const v = host.querySelector('[data-playlab-verdict="soccer"]').textContent;
    expect(v).toMatch(/Offside/);
    expect(v).toContain(m.read.offside.by.toFixed(1) + ' m');
    expect(v).toMatch(/stepped up 3 m/);
    expect(xp).not.toHaveBeenCalled();
  });

  it('changing the move clears the pass and the result', () => {
    setup({ reduced: true });
    const { host, pl } = mount(soccer());
    click(pass(host, 'behind'));
    click(runButton(host));
    expect(host.querySelector('[data-playlab-verdict="soccer"]')).toBeTruthy();
    const counter = [...host.querySelectorAll('[data-playlab-setup] button')].find((b) => /Counter-Attack/.test(b.textContent));
    click(counter);
    expect(pl().conceptId).toBe('counter');
    expect(pl().soccerOptId).toBeNull();
    expect(host.querySelector('[data-playlab-verdict="soccer"]')).toBeNull();
    expect(host.querySelector('[data-playlab-film]')).toBeNull();
  });

  it('the soccer Scout map shows a model grade only for a move the student has run', () => {
    setup({ reduced: true });
    const { host } = mount(soccer());
    click(pass(host, 'behind'));
    click(runButton(host));
    click(host.querySelector('#playlab-workspace-tab-scout'));
    const cells = [...host.querySelectorAll('button[role="cell"]')];
    expect(cells.length).toBe(13 * 4);
    const known = cells.filter((c) => c.textContent !== '?');
    expect(known.length).toBe(1);
    const g = window.StemLab.PlayLabModel.soccer().grade('433', 'tikitaka', 'midblock').grade;
    expect(known[0].getAttribute('aria-label')).toMatch(g === 'great' ? /Great match/ : g === 'okay' ? /Workable/ : /Tough match/);
  });

  it('never tells a soccer student to drag (soccer has no dragging)', () => {
    setup({ reduced: true });
    const { host } = mount(soccer());
    expect(host.textContent).not.toMatch(/drag/i);
    expect(host.querySelector('[data-playlab-key-move]')).toBeNull();
    expect(host.querySelector('[data-playlab-targets]')).toBeNull();
  });
});

describe('Play Lab run plays and scenarios', () => {
  it('a handoff pays as a run, and is not counted as a "best read"', () => {
    setup({ reduced: true });
    const { host, xp, pl } = mount({ playlab: { sport: 'football', playId: 'counter', coverageId: 'cover0', customPositions: {} } });
    expect(host.querySelector('[data-playlab-targets]'), 'no target row on a run play').toBeNull();
    click(runButton(host));
    const want = window.StemLab.PlayLabModel.simulate({ playId: 'counter', coverageId: 'cover0' }).outcome;
    expect(pl().runOutcome.type).toBe('run');
    expect(pl().runOutcome.yards).toBe(want.yards);
    expect(xp.mock.calls).toEqual([['playlab', 8, 'Run gain']]);
    expect(pl().drillStats.bestReads || 0).toBe(0);
    expect(host.querySelector('[data-playlab-verdict="run"]').textContent).toContain('RB runs for ' + want.yards + ' yards');
  });

  it('the goal-line scenario is 5 yards out as its story says, and a score is a touchdown', () => {
    setup({ reduced: true });
    const { host, pl } = mount({});
    click(host.querySelector('#playlab-workspace-tab-scout'));
    click([...host.querySelectorAll('button')].find((b) => /Wildcat Goal-Line/.test(b.textContent)));
    expect(pl().losX).toBe(105);
    expect(host.querySelector('#pl-ytg').value).toBe('5');
    click([...host.querySelectorAll('[role="dialog"] button')].find((b) => /Go to the field/.test(b.textContent)));
    click(runButton(host));
    expect(pl().runOutcome.touchdown).toBe(true);
    expect(host.querySelector('[data-playlab-verdict]').textContent).toContain('Touchdown!');
    // Picking another play leaves the scenario: the ball goes back to the usual spot.
    click([...host.querySelectorAll('[data-playlab-setup] button')].find((b) => /Smash \(Hi-Lo Corner\)/.test(b.textContent)));
    expect(pl().losX).toBe(35);
    expect(pl().activeScenarioId).toBeNull();
  });
});
