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
let host, root, state, patch;
function mount(seed = {}) {
  function Harness() {
    const [data, setData] = React.useState({ consentAccepted: true, view: 'call', callView: 'practice', ...seed });
    state = data; patch = value => setData(prev => ({ ...prev, ...value }));
    return window.StemLab._registry.firstResponse.render({ React, toolData: { firstResponse: data },
      update: (_, key, value) => patch({ [key]: value }), updateMulti: (_, value) => patch(value),
      t: (_, fallback) => fallback, addToast: () => {}, gradeBand: 'g68' });
  }
  act(() => root.render(React.createElement(Harness)));
}
function button(pattern) { return [...host.querySelectorAll('.fr-dispatch button')].find(b => pattern.test(b.textContent)); }
function click(pattern) { const b = button(pattern); expect(b, String(pattern)).toBeTruthy(); act(() => b.click()); }
function select(pattern) {
  const label = [...host.querySelectorAll('.fr-dispatch-options label')].find(b => pattern.test(b.textContent));
  expect(label, 'Option: ' + pattern).toBeTruthy(); act(() => label.querySelector('input').click());
}
function check() { click(/Check practice response/); }
function next() { click(/Continue rehearsal|Review conversation/); }
function finish() {
  while (state.dispatchPractice.turn < 5) {
    const turn = state.dispatchPractice.turn;
    const text = state.dispatchPractice.mode === 'text';
    const trail = state.dispatchPractice.caseId === 'trail';
    const needed = [
      [trail ? /^River Loop Trail/ : /^48 Lantern Way/, trail ? /^Trail marker 4/ : /^Community center, gym/],
      [trail ? /^A cyclist fell/ : /^An adult collapsed/, trail ? /^A helper is applying/ : /^A helper is beside/],
      [/^This practice phone number/],
      [trail ? /^Blood is now soaking/ : /^Their breathing has changed/],
      [text ? /^Keep watching for replies/ : /^Stay on the line/]
    ];
    if (text && turn === 0) needed[0].push(trail ? /^A cyclist fell/ : /^An adult collapsed/);
    for (const pattern of needed[turn]) {
      const label = [...host.querySelectorAll('.fr-dispatch-options label')].find(b => pattern.test(b.textContent));
      if (!label.querySelector('input').checked) select(pattern);
    }
    check(); next();
  }
}
beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear(); delete window.__alloflowFirstResponse;
  window.StemLab = { _registry: {}, isRegistered: () => false, registerTool(id, config) { this._registry[id] = config; } };
  new Function(source)();
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); delete globalThis.IS_REACT_ACT_ENVIRONMENT; });

describe('First Response communication rehearsal', () => {
  it('connects a completed response scenario to the communication rehearsal', () => {
    mount({ view: 'scenarios', scenarioPick: 'changing', scenarioStep: 4, scenarioVersion: 2,
      scenarioLog: Array.from({ length: 4 }, () => ({ firstChoice: 0, finalChoice: 0, tries: 1, hintUsed: false })) });
    const route = [...host.querySelectorAll('button')].find(b => b.textContent === 'Practice communicating with 911');
    expect(route).toBeTruthy(); act(() => route.click());
    expect(state).toMatchObject({ view: 'call', callView: 'practice', dispatchPractice: null });
    expect(host.textContent).toContain('Build the emergency conversation');
  });
  it('requires useful location detail and preserves an incomplete first message', () => {
    mount(); click(/Community center/); select(/^48 Lantern Way/); check();
    expect(button(/Continue rehearsal/)).toBeUndefined();
    expect(host.textContent).toContain('Add both the location');
    select(/^Community center, gym/); check();
    expect(state.dispatchPractice.log[0]).toMatchObject({ first: ['place'], final: ['place', 'access'], attempts: 2, complete: true });
    next(); finish();
    expect(host.textContent).toContain('First response: 48 Lantern Way');
    expect(host.querySelector('.fr-dispatch-result strong').textContent).toBe('4 / 5');
  });
  it('requires the emergency in a first text, while voice practice answers the location question', () => {
    mount({ dispatchMode: 'text' }); click(/Community center/);
    select(/^48 Lantern Way/); select(/^Community center, gym/); check();
    expect(state.dispatchPractice.log[0].complete).toBe(false);
    expect(host.textContent).toContain('emergency in the first practice text');
    select(/^An adult collapsed/); check();
    expect(state.dispatchPractice.log[0].complete).toBe(true);
  });
  it('rejects guesses even when all required observations are present', () => {
    mount(); click(/Community center/); select(/^48 Lantern Way/); select(/^Community center, gym/); check(); next();
    select(/^An adult collapsed/); select(/^A helper is beside/); select(/^I know the diagnosis/); check();
    expect(state.dispatchPractice.log[1].complete).toBe(false);
    expect(host.textContent).toContain('Remove guesses');
    select(/^I know the diagnosis/); check();
    expect(state.dispatchPractice.log[1].complete).toBe(true);
  });
  it('uses changed observations and does not mistake emergency number for callback number', () => {
    mount(); click(/Community center/);
    select(/^48 Lantern Way/); select(/^Community center, gym/); check(); next();
    select(/^An adult collapsed/); select(/^A helper is beside/); check(); next();
    select(/^Call me back at 911/); check();
    expect(button(/Continue rehearsal/)).toBeUndefined();
    select(/^Call me back at 911/); select(/^This practice phone number/); check(); next();
    expect(host.querySelector('.fr-dispatch-change').textContent).toContain('occasional irregular gasps');
    select(/^Nothing has changed/); check(); expect(button(/Continue rehearsal/)).toBeUndefined();
  });
  it('counts example-supported responses separately and locks checked messages', () => {
    mount(); click(/Community center/); click(/Show an example/);
    finish();
    expect(state.dispatchPractice.log[0].hintUsed).toBe(true);
    expect(host.querySelector('.fr-dispatch-result strong').textContent).toBe('4 / 5');
    expect(host.textContent).toContain('Practiced with an example.');
    expect(state.badges.dispatch_voice).toBeTruthy();
    click(/Try the other location/);
    select(/^River Loop Trail/); select(/^Trail marker 4/); check();
    expect([...host.querySelectorAll('.fr-dispatch-options input')].every(el => el.disabled)).toBe(true);
  });
  it('completes both scenes in both communication modes with bounded transcripts', () => {
    mount(); click(/Community center/); finish();
    click(/Practice the other communication mode/);
    expect(state.dispatchPractice.mode).toBe('text'); expect(state.dispatchPractice.log).toEqual([]); finish();
    expect(state.badges.dispatch_text).toBeTruthy();
    click(/Try the other location/); finish();
    click(/Practice the other communication mode/); finish();
    expect(state.dispatchPractice.log).toHaveLength(5);
    expect(host.querySelectorAll('.fr-dispatch-transcript li')).toHaveLength(5);
    expect(host.textContent).toContain('Elm Street parking lot');
    expect(host.querySelector('.fr-dispatch-result strong').textContent).toBe('5 / 5');
  });
  it('resumes after switching tabs and clears the transcript when leaving', () => {
    mount(); click(/Community center/); select(/^48 Lantern Way/);
    act(() => patch({ callView: 'overview' })); act(() => patch({ callView: 'practice' }));
    expect(state.dispatchPractice.selected).toEqual(['place']);
    expect(document.activeElement).toBe(host.querySelector('[data-fr-dispatch-heading]'));
    click(/Leave rehearsal/); expect(state.dispatchPractice).toBeNull();
    click(/River trail/); expect(state.dispatchPractice.log).toEqual([]); expect(state.dispatchPractice.selected).toEqual([]);
  });
  it('does not show completion or award a badge from incomplete or malformed saved practice', () => {
    mount({ dispatchPractice: { version: 1, caseId: 'center', mode: 'voice', turn: 5, log: [] } });
    expect(host.textContent).toContain('Start a fresh conversation');
    expect(state.badges?.dispatch_voice).toBeUndefined();
    act(() => patch({ dispatchPractice: { version: 1, caseId: 'center', mode: 'voice', turn: 3, log: [null] } }));
    expect(host.textContent).toContain('Build the emergency conversation');
    expect(host.textContent).not.toContain('failed to render');
  });
  it('keeps practice free of dial, SMS, or recording controls and ships matching localized copies', () => {
    mount(); click(/Community center/);
    expect(host.querySelectorAll('.fr-dispatch a[href^="tel:"], .fr-dispatch a[href^="sms:"], .fr-dispatch input[type="text"]')).toHaveLength(0);
    expect(host.textContent).toContain('No call or text is sent');
    expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_firstresponse.js', 'utf8')).toBe(source);
    for (const file of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
      const strings = JSON.parse(readFileSync(file, 'utf8')).stem.firstresponse;
      for (const m of source.matchAll(/__alloT\('stem\.firstresponse\.(dispatch_[^']+)',\s*('(?:[^'\\]|\\.)*')\)/g)) expect(strings[m[1]], m[1]).toBe(Function('return ' + m[2])());
    }
  });
});
