import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const modules = ['desktop/web-app/node_modules', 'node_modules'].map(p => resolve(p)).find(p => existsSync(resolve(p, 'react')));
const React = require(resolve(modules, 'react'));
const { createRoot } = require(resolve(modules, 'react-dom/client'));
const { act } = require(resolve(modules, 'react-dom/test-utils'));
const source = readFileSync('stem_lab/stem_tool_firstresponse.js', 'utf8');
const answers = { 1: 'callEMS', 2: 'cpr', 3: 'pressure', 4: 'heimlich', 5: 'aed', 6: 'recovery', 7: 'callEMS', 8: 'callEMS', 9: 'recovery', 10: 'callEMS' };
let host, root, state, patch;
function mount(seed = {}) {
  function Harness() {
    const [data, setData] = React.useState({ consentAccepted: true, view: 'firstAction', ...seed });
    state = data; patch = value => setData(prev => ({ ...prev, ...value }));
    return window.StemLab._registry.firstResponse.render({ React, toolData: { firstResponse: data },
      update: (_, key, value) => patch({ [key]: value }), updateMulti: (_, value) => patch(value),
      t: (_, fallback) => fallback, addToast: () => {}, gradeBand: 'g68' });
  }
  act(() => root.render(React.createElement(Harness)));
}
function session(queue = [1]) { return { version: 1, queue, mode: 'all', position: 0, log: [], cue: null, action: null, hintUsed: false, feedback: null, run: 1 }; }
function button(text) { return [...host.querySelectorAll('.fr-reason button')].find(b => b.textContent === text); }
function click(text) { const b = button(text); expect(b, text).toBeTruthy(); act(() => b.click()); }
function choose(kind, value) { const el = host.querySelector(`input[name="fr-reason-${kind}"][value="${value}"]`); expect(el).toBeTruthy(); act(() => el.click()); }
function check(cue = 0, action) {
  const p = state.faPractice, id = p.queue[p.position];
  choose('cue', cue); choose('action', action || answers[id]); click('Check my reasoning');
}
function next() { click(state.faPractice.position === state.faPractice.queue.length - 1 ? 'Review my decisions' : 'Next scene'); }
function finish() { while (state.faPractice.position < state.faPractice.queue.length) { check(); next(); } }
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear(); delete window.__alloflowFirstResponse;
  window.StemLab = { _registry: {}, isRegistered: () => false, registerTool(id, config) { this._registry[id] = config; } };
  new Function(source)();
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); delete globalThis.IS_REACT_ACT_ENVIRONMENT; });

describe('First Action clue-and-action practice', () => {
  it('asks for both choices and varies the scene and option orders', () => {
    mount(); click('Start 10-scene practice');
    expect(state.faPractice.queue).toHaveLength(10); expect(new Set(state.faPractice.queue).size).toBe(10);
    expect(button('Check my reasoning').disabled).toBe(true);
    choose('cue', 0); expect(button('Check my reasoning').disabled).toBe(true);
    const before = [...host.querySelectorAll('input[name="fr-reason-action"]')].map(el => el.value);
    check(); next();
    const after = [...host.querySelectorAll('input[name="fr-reason-action"]')].map(el => el.value);
    // Rotation also changes with the run even when the same scene is revisited.
    const p = state.faPractice;
    act(() => patch({ faPractice: { ...p, run: p.run + 1 } }));
    expect([...host.querySelectorAll('input[name="fr-reason-action"]')].map(el => el.value)).not.toEqual(after);
    expect(before).toHaveLength(6);
  });
  it('requires a sound clue even when the action is right and preserves the first check', () => {
    mount({ faPractice: session() }); check(2);
    expect(host.querySelector('[role="status"]').textContent).toContain('Your action fits this scene');
    expect(button('Next scene')).toBeUndefined(); expect(state.faMastery).toBeUndefined();
    check();
    expect(state.faPractice.log[0]).toMatchObject({ firstCue: 2, firstAction: 'callEMS', finalCue: 0, finalAction: 'callEMS', attempts: 2, complete: true });
    expect(state.faMastery[1]).toMatchObject({ practiceCount: 1, reasonedCount: 0, lastResult: 'supported' });
    next(); expect(host.querySelector('.fr-reason-first').textContent).toContain('known heart condition');
    expect(host.querySelector('.fr-reason-stats').textContent).toContain('0 / 1');
  });
  it('checks the action separately and does not count corrected answers as independent', () => {
    mount({ faPractice: session([5]) }); check(0, 'recovery');
    expect(host.textContent).toContain('Your clue identifies the key condition');
    check(); next();
    expect(state.faMastery[5].reasonedCount).toBe(0);
    expect(host.textContent).toContain('Everyone must be clear during analysis');
    expect(host.querySelector('.fr-reason-first').textContent).toContain('Recovery position');
  });
  it('counts hint use as support even if the first pair is right', () => {
    mount({ faPractice: session([2]) }); click('Use a reasoning hint'); check(); next();
    expect(state.faPractice.log[0]).toMatchObject({ attempts: 1, hintUsed: true });
    expect(state.faMastery[2].reasonedCount).toBe(0);
    expect(button('Revisit supported decisions')).toBeTruthy();
    click('Revisit supported decisions'); check(); next();
    expect(state.faMastery[2]).toMatchObject({ reasonedCount: 1, practiceCount: 2 });
  });
  it('completes every case and counts only once when a checked scene is locked', () => {
    mount({ faPractice: session(Object.keys(answers).map(Number)) });
    check();
    expect([...host.querySelectorAll('.fr-reason input')].every(input => input.disabled)).toBe(true);
    expect(button('Check my reasoning')).toBeUndefined();
    choose('action', 'recovery');
    expect(state.faMastery[1].practiceCount).toBe(1);
    next(); finish();
    expect(host.querySelectorAll('.fr-reason-review > li')).toHaveLength(10);
    expect(host.querySelector('.fr-reason-stats').textContent).toContain('10 / 10');
    expect(button('Revisit supported decisions')).toBeUndefined();
    for (const id of Object.keys(answers)) expect(state.faMastery[id]).toMatchObject({ reasonedCount: 1, practiceCount: 1, action: answers[id] });
    expect(JSON.parse(localStorage.getItem('firstResponse.state.v1')).faMastery[10].reasonedCount).toBe(1);
  });
  it('targets just supported decisions, resets session metrics, and retains completed records', () => {
    mount({ faPractice: session([1, 2, 3]) }); check(); next();
    check(1); check(); next();
    click('Use a reasoning hint'); check(); next();
    expect(host.querySelector('.fr-reason-stats').textContent).toContain('1 / 3');
    click('Revisit supported decisions');
    expect(state.faPractice.queue.slice().sort()).toEqual([2, 3]); expect(state.faPractice.log).toEqual([]);
    finish(); expect(host.querySelector('.fr-reason-stats').textContent).toContain('2 / 2');
    expect(state.faMastery[1].practiceCount).toBe(1);
    expect(state.faMastery[2]).toMatchObject({ reasonedCount: 1, practiceCount: 2 });
    click('Start a new mixed set'); expect(state.faPractice.queue).toHaveLength(10); expect(state.faPractice.position).toBe(0);
  });
  it('preserves old action-only results without treating them as new reasoning evidence', () => {
    const legacy = { firstCorrectAt: '2026-01-01', correctCount: 3, action: 'callEMS' };
    mount({ view: 'mastery', faMastery: { 1: legacy, 999: { reasonedCount: 8 } } });
    expect(host.querySelector('.fr-reason-stats').textContent).toContain('0 / 10');
    expect(host.textContent).toContain('Earlier action-only practice');
    const b = host.querySelector('button[aria-label="Practice scene: Collapse in the office"]'); act(() => b.click());
    finish(); expect(state.faMastery[1]).toMatchObject({ ...legacy, reasonedCount: 1, practiceCount: 1 });
    click('Open practice record'); expect(host.querySelector('.fr-reason-stats').textContent).toContain('1 / 10');
    click('Practice remaining scenes'); expect(state.faPractice.queue).not.toContain(1); expect(state.faPractice.queue).toHaveLength(9);
  });
  it('resumes the same draft across views and keeps hook order stable', () => {
    mount({ faPractice: session([9, 10]) }); choose('cue', 0);
    click('Open practice record'); click('Return to current practice');
    expect(state.faPractice.cue).toBe(0); expect(host.querySelector('input[value="0"]').checked).toBe(true);
    check(); next();
    act(() => patch({ view: 'call', callView: 'overview' })); act(() => patch({ view: 'firstAction' }));
    expect(host.querySelector('[data-fr-reason-heading]').textContent).toBe('Severe breathing difficulty');
  });
  it.each([
    { ...session(), queue: [1, 1] },
    { ...session(), queue: [99] },
    { ...session(), position: 1, log: [] },
    { ...session(), position: 1, log: [{ firstCue: 0, firstAction: 'callEMS', attempts: 1, hintUsed: false, complete: true, finalCue: 1, finalAction: 'callEMS' }] },
    { ...session(), cue: 200 },
    { ...session(), version: 99 }
  ])('offers a clean restart for malformed or incompatible sessions (%#)', bad => {
    mount({ faPractice: bad, faMastery: { 1: { reasonedCount: 1, practiceCount: 1 } } });
    expect(host.textContent).toContain('cannot be resumed'); click('Start 10-scene practice');
    expect(state.faMastery[1].reasonedCount).toBe(1); check(); expect(state.faPractice.log[0].complete).toBe(true);
  });
  it('keeps deployment copies and every new literal string aligned', () => {
    expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_firstresponse.js', 'utf8')).toBe(source);
    const delta = JSON.parse(readFileSync('reports/firstresponse-reasoning-practice/ui-strings.delta.json', 'utf8'));
    const keys = [...source.matchAll(/__alloT\('stem\.firstresponse\.(reason_[^']+)'/g)].map(m => m[1]);
    for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
      const catalog = JSON.parse(readFileSync(file, 'utf8')).stem.firstresponse;
      for (const key of keys) expect(catalog[key], key).toBe(delta[key]);
    }
    expect(source).not.toContain('faT(');
  });
});
