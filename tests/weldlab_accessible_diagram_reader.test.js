import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { node, freshTool, mountState, unmountState, click, change, Simulate } from './helpers/weldlab_interaction_mount.js';
import { React } from './helpers/stem_widgets_smoke_harness.js';

let outside, restoreMotion;
beforeEach(freshTool);
afterEach(async () => { await unmountState(); outside?.remove(); outside = null; restoreMotion?.(); restoreMotion = null; vi.restoreAllMocks(); });
const query = selector => node().querySelector(selector);
const retained = { car2_reflect: 'Keep my reflection.', qp_ans: { 0: 1 }, weldBadges: { ppeSafety: true } };
const GOOD = [
  { x: 4, y: 6, m: 'J', w: false },
  { x: 12, y: 6, m: 'L', w: true },
  { x: 12, y: 1, m: 'J', w: false },
  { x: 1, y: 1, m: 'J', w: false },
];
const robotState = program => ({ ...retained, view: 'robotic', rob_sect: 'pendant', tech2_rob_prog: program });
const select = () => query('[data-robot-inspect-select]');
const previous = () => query('[data-robot-inspect-prev]');
const next = () => query('[data-robot-inspect-next]');
function preserveOutsideFocus() { outside = document.createElement('button'); document.body.append(outside); outside.focus(); }
function expectSaved(app, saved, writes) {
  expect(JSON.stringify(app.latest())).toBe(saved);
  expect(app.writes).toHaveLength(writes);
  expect(app.latest()).toMatchObject(retained);
}

describe('Bevel computed-reading equivalence', () => {
  it.each([false, true])('keeps a native, related, persistent polite result list across angle and lens changes in contrast=%s', async contrast => {
    preserveOutsideFocus();
    const app = await mountState({ ...retained, view: 'mathBlueprint', mb_mode: 'browse', mb_sect: 'geometry' }, contrast);
    expect(document.activeElement).toBe(outside);
    const result = query('#math9-bevel-readings'), probe = query('[data-bevel-angle]');
    expect(result.tagName).toBe('DL'); expect(result.hasAttribute('role')).toBe(false);
    expect(result.getAttribute('aria-live')).toBe('polite'); expect(result.getAttribute('aria-atomic')).toBe('true');
    expect(probe.getAttribute('aria-describedby')).toBe(result.id);
    expect(result.querySelectorAll('dt')).toHaveLength(4); expect(result.querySelectorAll('dd')).toHaveLength(4);
    expect(node().querySelectorAll('#' + result.id)).toHaveLength(1);
    const saved = JSON.stringify(app.latest()), writes = app.writes.length, mutations = [];
    const observer = new MutationObserver(records => mutations.push(...records));
    observer.observe(result, { childList: true, subtree: true, characterData: true });
    try {
      probe.focus(); await change(probe, '0');
      expect(query('#math9-bevel-readings')).toBe(result); expect(document.activeElement).toBe(probe);
      expect(query('[data-bevel-reading="face"]').dataset.value).toBe('0.5');
      expect(query('[data-bevel-reading="run"]').dataset.value).toBe('0');
      const horizontal = query('[data-bevel-lens="horizontal"]'); horizontal.focus(); await click(horizontal);
      expect(document.activeElement).toBe(horizontal); expect(query('#math9-bevel-readings')).toBe(result);
      expect(query('[data-bevel-reading="angle"]').textContent).toBe('90° from horizontal');
      probe.focus(); await change(probe, '60');
      expect(document.activeElement).toBe(probe); expect(query('#math9-bevel-readings')).toBe(result);
      expect(Number(query('[data-bevel-reading="face"]').dataset.value)).toBeCloseTo(1, 12);
      expect(Number(query('[data-bevel-reading="run"]').dataset.value)).toBeCloseTo(Math.sqrt(3) / 2, 12);
      expect(query('[data-bevel-reading="angle"]').textContent).toBe('30° from horizontal');
      const reset = query('[data-bevel-reset]'); reset.focus(); await click(reset);
      expect(document.activeElement).toBe(reset); expect(query('#math9-bevel-readings')).toBe(result);
      expect(query('[data-math-bevel]').dataset.lens).toBe('vertical');
      expect(query('[data-bevel-reading="angle"]').textContent).toBe('30° from vertical');
      expect(Number(query('[data-bevel-reading="face"]').dataset.value)).toBeCloseTo(1 / Math.sqrt(3), 12);
      mutations.push(...observer.takeRecords());
      expect(mutations.some(record => record.type === 'characterData' || record.addedNodes.length || record.removedNodes.length)).toBe(true);
    } finally { observer.disconnect(); }
    expectSaved(app, saved, writes);
  });
});

describe('Robot move-inspector endpoint focus', () => {
  it.each([false, true])('retains repeated Next navigation until the last move disables it in contrast=%s', async contrast => {
    preserveOutsideFocus();
    const app = await mountState(robotState(GOOD), contrast);
    expect(document.activeElement).toBe(outside);
    const saved = JSON.stringify(app.latest()), writes = app.writes.length;
    next().focus(); await click(next());
    expect(select().value).toBe('1'); expect(document.activeElement).toBe(next()); expect(next().disabled).toBe(false);
    await click(next());
    expect(select().value).toBe('2'); expect(document.activeElement).toBe(next()); expect(next().disabled).toBe(false);
    await click(next());
    expect(select().value).toBe('3'); expect(next().disabled).toBe(true); expect(document.activeElement).toBe(select());
    expect(query('[data-robot-inspector]').dataset.move).toBe('4');
    expect(query('[data-robot-inspect-progress]').value).toBe('50');
    expectSaved(app, saved, writes);
  });

  it.each([false, true])('retains repeated Previous navigation until the first move disables it in contrast=%s', async contrast => {
    const app = await mountState(robotState(GOOD), contrast);
    const saved = JSON.stringify(app.latest()), writes = app.writes.length;
    await change(select(), '3');
    previous().focus(); await click(previous());
    expect(select().value).toBe('2'); expect(document.activeElement).toBe(previous()); expect(previous().disabled).toBe(false);
    await click(previous());
    expect(select().value).toBe('1'); expect(document.activeElement).toBe(previous()); expect(previous().disabled).toBe(false);
    await click(previous());
    expect(select().value).toBe('0'); expect(previous().disabled).toBe(true); expect(document.activeElement).toBe(select());
    expect(query('[data-robot-inspector]').dataset.move).toBe('1');
    expectSaved(app, saved, writes);
  });

  it.each([false, true])('keeps direct native select, progress and table-row focus without an endpoint request in contrast=%s', async contrast => {
    const app = await mountState(robotState(GOOD), contrast);
    const saved = JSON.stringify(app.latest()), writes = app.writes.length;
    select().focus(); await change(select(), '3'); expect(document.activeElement).toBe(select());
    const progress = query('[data-robot-inspect-progress]'); progress.focus(); await change(progress, '100');
    expect(document.activeElement).toBe(progress); expect(progress.getAttribute('aria-valuetext')).toContain('100 percent');
    const row = query('[data-robot-inspect-row="1"]'); row.focus(); await click(row);
    expect(document.activeElement).toBe(row); expect(select().value).toBe('0');
    expectSaved(app, saved, writes);
  });

  it.each([false, true])('does not invent a focus request for an initial one-move program in contrast=%s', async contrast => {
    preserveOutsideFocus();
    const app = await mountState(robotState(GOOD.slice(0, 1)), contrast);
    expect(previous().disabled).toBe(true); expect(next().disabled).toBe(true);
    expect(select().value).toBe('0'); expect(document.activeElement).toBe(outside);
    expect(app.latest()).toMatchObject(retained); expect(app.latest().tech2_rob_prog).toEqual(GOOD.slice(0, 1));
    expect(app.writes).toHaveLength(0);
  });
});

function controlledRunMotion(reduced) {
  const original = window.matchMedia;
  window.matchMedia = vi.fn(() => ({ matches: reduced, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
  restoreMotion = () => { window.matchMedia = original; };
  const queued = new Map(); let sequence = 0;
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { const id = ++sequence; queued.set(id, callback); return id; });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => queued.delete(id));
  freshTool();
  return async time => {
    const callbacks = [...queued.values()]; queued.clear();
    await React.act(() => { callbacks.forEach(callback => callback(time)); });
  };
}
const runAction = () => [...node().querySelectorAll('button')].find(button => button.textContent.trim() === '▶ Run program');
const workcell = () => query('[role="application"][aria-describedby="tech2-rob-help"]');
const verdict = () => [...node().querySelectorAll('div[tabindex="-1"]')].find(element => /Weld complete: seam fully covered, no faults\.|The program needs work\./.test(element.textContent));

describe('Robot Run focus transitions', () => {
  it.each([false, true])('hands a focused ordinary-motion Run action to its static running message once, then retains verdict recovery in contrast=%s', async contrast => {
    const frame = controlledRunMotion(false);
    const app = await mountState(robotState(GOOD), contrast);
    const live = () => document.getElementById('allo-live-weldlab')?.textContent || '';
    const priorMessage = live();
    runAction().focus(); await click(runAction());
    const running = query('[data-robot-running-status]');
    expect(runAction().disabled).toBe(true); expect(running).toBeTruthy();
    expect(running.tabIndex).toBe(-1); expect(document.activeElement).toBe(running);
    expect(running.hasAttribute('aria-live')).toBe(false); expect(running.hasAttribute('role')).toBe(false);
    expect(running.textContent).toBe('Program running. Inspection is paused until it finishes.');
    expect(live()).toBe(priorMessage);
    await frame(0);
    workcell().focus(); await frame(1000);
    expect(query('[data-robot-running-status]')).toBe(running); expect(document.activeElement).toBe(workcell());
    expect(live()).toBe(priorMessage);
    await frame(6000);
    expect(query('[data-robot-running-status]')).toBeNull(); expect(runAction().disabled).toBe(false);
    expect(verdict()).toBeTruthy(); expect(document.activeElement).toBe(verdict());
    expect(app.latest().tech2_rob_prog).toEqual(GOOD); expect(app.latest()).toMatchObject(retained);
  });

  it.each([false, true])('keeps the existing direct-to-verdict reduced-motion path in contrast=%s', async contrast => {
    controlledRunMotion(true);
    const app = await mountState(robotState(GOOD), contrast);
    runAction().focus(); await click(runAction());
    expect(query('[data-robot-running-status]')).toBeNull(); expect(runAction().disabled).toBe(false);
    expect(verdict()).toBeTruthy(); expect(document.activeElement).toBe(verdict());
    expect(app.latest().tech2_rob_prog).toEqual(GOOD); expect(app.latest()).toMatchObject(retained);
  });

  it.each([false, true])('leaves the grid R shortcut focused until the existing completion verdict in contrast=%s', async contrast => {
    const frame = controlledRunMotion(false);
    const app = await mountState(robotState(GOOD), contrast);
    const grid = workcell(); grid.focus();
    await React.act(() => Simulate.keyDown(grid, { key: 'r' }));
    expect(query('[data-robot-running-status]')).toBeTruthy(); expect(runAction().disabled).toBe(true);
    expect(document.activeElement).toBe(grid);
    await frame(0); await frame(1000); expect(document.activeElement).toBe(grid);
    await frame(6000);
    expect(query('[data-robot-running-status]')).toBeNull(); expect(document.activeElement).toBe(verdict());
    expect(app.latest().tech2_rob_prog).toEqual(GOOD); expect(app.latest()).toMatchObject(retained);
  });
});
