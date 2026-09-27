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
    const [data, setData] = React.useState({ consentAccepted: true, view: 'scenarios', ...seed });
    state = data;
    patch = update => setData(prev => ({ ...prev, ...update }));
    return window.StemLab._registry.firstResponse.render({ React, toolData: { firstResponse: data },
      update: (_, key, value) => patch({ [key]: value }), updateMulti: (_, update) => patch(update),
      t: (_, fallback) => fallback, addToast: () => {}, gradeBand: 'g68' });
  }
  act(() => root.render(React.createElement(Harness)));
}
function button(pattern) {
  return [...host.querySelectorAll('button')].find(b => pattern.test(b.getAttribute('aria-label') || b.textContent));
}
function click(pattern) {
  const el = button(pattern);
  expect(el, `Button not found: ${pattern}`).toBeTruthy();
  act(() => el.click());
}
function choose(pattern) {
  const el = [...host.querySelectorAll('.fr-sim-choice')].find(b => pattern.test(b.textContent));
  expect(el, `Choice not found: ${pattern}`).toBeTruthy();
  act(() => el.click());
}
function next() { click(/Next observation|See your debrief/); }
function finishChanging() {
  const answers = [/Call 911 on speaker/, /Tell the dispatcher, roll/, /Pause compressions/, /Immediately resume CPR|Make sure everyone is clear/];
  while (state.scenarioStep < 4) { choose(answers[state.scenarioStep]); next(); }
}

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  localStorage.clear();
  delete window.__alloflowFirstResponse;
  window.StemLab = { _registry: {}, isRegistered: () => false, registerTool(id, config) { this._registry[id] = config; } };
  new Function(source)();
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); delete globalThis.IS_REACT_ACT_ENVIRONMENT; });

describe('First Response scenario decision rehearsal', () => {
  it('preserves a wrong first decision and requires correction before continuing', () => {
    mount(); click(/Start scenario: When breathing changes/);
    choose(/Leave them alone/);
    expect(button(/Next observation/)).toBeUndefined();
    expect(host.textContent).toContain('Choose a safer action');
    choose(/Call 911 on speaker/);
    expect(state.scenarioLog[0]).toMatchObject({ firstChoice: 2, finalChoice: 0, tries: 2 });
    expect(state.scenarioScore).toEqual({ help: 0, neutral: 0, hurt: 1 });
    next(); finishChanging();
    expect(host.textContent).toContain('Your first choice: Leave them alone');
    expect(host.textContent).toContain('Revised to: Call 911 on speaker');
    expect(state.badges?.scenario_clean_changing).toBeUndefined();
  });
  it('does not award independent completion after a coaching cue', () => {
    mount(); click(/Start scenario: When breathing changes/); click(/Show a coaching cue/);
    finishChanging();
    expect(state.scenarioLog[0].hintUsed).toBe(true);
    expect(host.textContent).toContain('A coaching cue supported this decision');
    expect(state.badges?.scenario_clean_changing).toBeUndefined();
  });
  it('awards only an independent run and alternates the AED outcome on retry', () => {
    mount(); click(/Start scenario: When breathing changes/);
    finishChanging();
    expect(state.badges.scenario_clean_changing).toBeTruthy();
    expect(state.scenarioAedOutcome).toBe('noShock');
    click(/Practice the other AED outcome/);
    expect(state.scenarioAedOutcome).toBe('shock');
    expect(state.scenarioLog).toEqual([]);
    choose(/Call 911 on speaker/); next(); choose(/Tell the dispatcher, roll/); next(); choose(/Pause compressions/); next();
    expect(host.textContent).toContain('The AED says “Shock advised.”');
    choose(/Make sure everyone is clear/); next();
    expect(host.textContent).toContain('deliver the advised shock');
  });
  it('varies answer positions without changing stored choice identities', () => {
    mount(); click(/Start scenario: When breathing changes/);
    const positions = [];
    for (const answer of [/Call 911 on speaker/, /Tell the dispatcher, roll/, /Pause compressions/, /Immediately resume CPR/]) {
      const buttons = [...host.querySelectorAll('.fr-sim-choice')];
      positions.push(buttons.findIndex(b => answer.test(b.textContent)));
      choose(answer); next();
    }
    expect(new Set(positions).size).toBe(3);
    expect(state.scenarioLog.map(r => r.firstChoice)).toEqual([0, 0, 0, 0]);
  });
  it('counts repeated clicks once and locks completed decisions', () => {
    mount(); click(/Start scenario: When breathing changes/); choose(/Leave them alone/); choose(/Leave them alone/);
    expect(state.scenarioLog[0].tries).toBe(1);
    choose(/Call 911 on speaker/); choose(/Begin chest compressions/);
    expect(state.scenarioLog[0]).toMatchObject({ finalChoice: 0, tries: 2 });
  });
  it('keeps new observations focused and resumes the current decision', () => {
    mount(); click(/Start scenario: When breathing changes/); choose(/Call 911 on speaker/); next();
    expect(document.activeElement).toBe(host.querySelector('[data-fr-sim-heading]'));
    act(() => patch({ view: 'menu' })); act(() => patch({ view: 'scenarios' }));
    expect(state.scenarioStep).toBe(1);
    expect(host.textContent).toContain('occasional irregular gasps');
  });
  it('offers a fresh run for legacy saved attempts instead of granting a badge', () => {
    mount({ scenarioPick: 'cafeteria', scenarioStep: 4, scenarioScore: { help: 4 } });
    expect(host.textContent).toContain('Start a fresh run');
    expect(state.badges?.scenario_clean_cafeteria).toBeUndefined();
    click(/Start a fresh run/); expect(state.scenarioStep).toBe(0); expect(state.scenarioVersion).toBe(2);
  });
  it('does not treat a partial decision log as completion', () => {
    mount({ scenarioPick: 'changing', scenarioStep: 4, scenarioVersion: 2, scenarioLog: [{ firstChoice: 0, finalChoice: 0 }] });
    expect(host.textContent).toContain('Start a fresh run');
    expect(host.textContent).not.toContain('Every step now ends');
  });
  it('keeps the mental-health opt-out available and clears previous case progress', () => {
    mount(); click(/Start scenario: When breathing changes/); choose(/Call 911 on speaker/); next(); click(/Leave scenario/);
    click(/Start scenario: Mental health/);
    expect(host.querySelector('.fr-sim-choices')).toBeNull();
    expect(host.querySelector('[role=dialog]')).toBeNull(); // Inline section, no false modal claim.
    click(/Choose another scenario/);
    expect(state.scenarioLog).toEqual([]); expect(state.scenarioPick).toBeNull();
  });
  it('includes swallowing and emergency-call conditions and separates 988 from 741741', () => {
    mount({ scenarioPick: 'busstop', scenarioStep: 1, scenarioVersion: 2 });
    expect(host.textContent).toContain('can swallow safely');
    act(() => patch({ scenarioPick: 'hallway', scenarioStep: 1 }));
    expect(host.textContent).toContain('call 911 and get an adult');
    act(() => patch({ scenarioPick: 'mh', scenarioStep: 3, mhAcknowledged: true }));
    expect(host.textContent).toContain('text 988, the Suicide & Crisis Lifeline');
    expect(host.textContent).not.toContain('HOME to 741741');
  });
  it('ships identical tool copies and registers every new fallback string', () => {
    expect(readFileSync('desktop/web-app/public/stem_lab/stem_tool_firstresponse.js', 'utf8')).toBe(source);
    for (const path of ['ui_strings.js', 'desktop/web-app/public/ui_strings.js']) {
      const registry = JSON.parse(readFileSync(path, 'utf8')).stem.firstresponse;
      for (const match of source.matchAll(/__alloT\('stem\.firstresponse\.(sim_[^']+)',\s*('(?:[^'\\]|\\.)*')\)/g)) {
        expect(registry[match[1]], match[1]).toBe(Function('return ' + match[2])());
      }
    }
  });
});
