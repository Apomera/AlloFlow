import { afterEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounts = [];
afterEach(() => { for (const { root, host } of mounts.splice(0)) { act(() => root.unmount()); host.remove(); } vi.restoreAllMocks(); });
const outcome = { tier: 'strong', color: '#86efac', label: 'Strong stewardship', desc: 'Recorded outcome.' };
async function mount(scenario = 'yarralin', state = null, overrides = {}) {
  resetStemLab(); const tool = loadTool(process.env.STEWARDSHIP_SOURCE || 'stem_lab/stem_tool_stewardship.js', 'stewardshipHub'), store = newStore();
  const host = document.createElement('div'); document.body.appendChild(host); const root = ReactDOMClient.createRoot(host); mounts.push({ root, host });
  let latest;
  function Host() {
    const [data, setData] = React.useState({ stewardshipHub: { tutorialSeen: true, playingScenario: scenario, stewIQ: { hypothesis: 'Keep my work.' }, scenarioStates: state ? { [scenario]: state } : {} }, ecosystem: { conserve: { phase: 'playing', year: 4, custom: 'preserve' } } });
    latest = data;
    return tool.render(makeCtx({ toolData: data, setToolData: setData, ...overrides }, store));
  }
  await act(async () => root.render(React.createElement(Host)));
  return { host, state: () => latest,
    action: key => host.querySelector('[data-stewardship-action="' + key + '"]'),
    row: id => host.querySelector('[data-stewardship-scenario-data=current] [data-stewardship-entity-row="' + id + '"]'),
    spoke: id => host.querySelector('[data-stewardship-map-change="' + id + '"]'),
    net: id => host.querySelector('[data-stewardship-net-change="' + id + '"]') };
}
async function activate(button) { expect(button).toBeTruthy(); await act(async () => { button.focus(); button.click(); }); }
const change = row => row.lastElementChild.textContent;

describe('Stewardship direction-aware change interpretation', () => {
  it('pairs ordinary score changes with explicit meaning and distinct spoke patterns', async () => {
    const t = await mount(); await activate(t.action('scenario-begin')); const other = JSON.stringify(t.state().ecosystem);
    await activate(t.action('option:a'));
    expect(change(t.row('spinifex'))).toBe('+18 points · Improving');
    expect(t.spoke('spinifex').getAttribute('data-change-direction')).toBe('improving'); expect(t.spoke('spinifex').getAttribute('stroke')).toBe('#86efac'); expect(t.spoke('spinifex').hasAttribute('stroke-dasharray')).toBe(false);
    expect(change(t.row('community'))).toBe('-5 points · Worsening'); expect(t.spoke('community').getAttribute('stroke-dasharray')).toBe('4 3');
    expect(t.host.querySelector('[data-stewardship-change-legend]').textContent).toContain('lower can be healthier');
    expect(document.activeElement).toBe(t.host.querySelector('[data-stewardship-heading=scenario]'));
    expect(JSON.stringify(t.state().ecosystem)).toBe(other); expect(t.state().stewardshipHub.stewIQ.hypothesis).toBe('Keep my work.');
  });

  it.each([
    ['a', '+5 points · Worsening', 'worsening', '#fca5a5', '4 3'],
    ['b', '-8 points · Improving', 'improving', '#86efac', null]
  ])('interprets Liberia case counts after option %s using lower-is-healthier semantics', async (option, text, meaning, color, dash) => {
    const t = await mount('liberia'); await activate(t.action('scenario-begin')); await activate(t.action('option:' + option));
    expect(change(t.row('cases'))).toBe(text); expect(t.row('cases').textContent).toContain('Lower is healthier');
    expect(t.spoke('cases').getAttribute('data-change-direction')).toBe(meaning); expect(t.spoke('cases').getAttribute('stroke')).toBe(color); expect(t.spoke('cases').getAttribute('stroke-dasharray')).toBe(dash);
    const map = t.host.querySelector('[data-stewardship-system-map]'), index = [...map.querySelectorAll('line')].indexOf(t.spoke('cases'));
    const delta = [...map.querySelectorAll('g')[index].querySelectorAll('text')].find(el => /^[+-]\d+$/.test(el.textContent));
    expect(delta.getAttribute('fill')).toBe(color); expect(delta.textContent).toBe(text.split(' ')[0]);
  });

  it('changes interpretation when Karuk fuel first falls and then rises', async () => {
    const t = await mount('karuk'); await activate(t.action('scenario-begin')); await activate(t.action('option:a'));
    expect(change(t.row('fuel'))).toBe('-8 points · Improving');
    await activate(t.action('option:b'));
    expect(change(t.row('fuel'))).toBe('+12 points · Worsening'); expect(t.spoke('fuel').getAttribute('stroke-dasharray')).toBe('4 3');
  });

  it('keeps a clamped zero change neutral rather than reporting a requested improvement', async () => {
    const t = await mount('liberia'); await activate(t.action('scenario-begin'));
    for (let i = 0; i < 3; i++) await activate(t.action('option:b'));
    expect(change(t.row('cases'))).toBe('No change (0 points)'); expect(t.spoke('cases').getAttribute('data-change-direction')).toBe('unchanged'); expect(t.spoke('cases').getAttribute('stroke')).toBe('#64748b'); expect(t.spoke('cases').hasAttribute('stroke-dasharray')).toBe(false);
    const entry = t.state().stewardshipHub.scenarioStates.liberia.decisionLog[2]; expect(entry.entityValuesBefore.cases).toBe(0); expect(entry.entityValuesAfter.cases).toBe(0);
  });

  it('distinguishes unavailable legacy changes from known zero changes without changing the saved log', async () => {
    const log = Object.freeze([Object.freeze({ step: 0, optionId: 'unavailable-choice', label: 'Older decision', custom: 'retain' })]);
    const saved = Object.freeze({ phase: 'playing', step: 1, entities: Object.freeze({ cases: 17 }), decisionLog: log });
    const t = await mount('liberia', saved);
    expect(change(t.row('cases'))).toBe('Change unavailable'); expect(t.spoke('cases').getAttribute('data-change-direction')).toBe('unavailable'); expect(t.spoke('cases').getAttribute('stroke')).toBe('#64748b'); expect(t.spoke('cases').hasAttribute('stroke-dasharray')).toBe(false);
    expect(t.state().stewardshipHub.scenarioStates.liberia.decisionLog).toBe(log);
  });

  it('interprets snapshot-backed older choices and exposes the matching net change in a debrief', async () => {
    const entry = Object.freeze({ step: 0, optionId: 'older-choice', label: 'Recorded decision', entityValuesBefore: Object.freeze({ cases: 25 }), entityValuesAfter: Object.freeze({ cases: 17 }) });
    const playing = await mount('liberia', { phase: 'playing', step: 1, entities: { cases: 17 }, decisionLog: [entry] });
    expect(change(playing.row('cases'))).toBe('-8 points · Improving');
    const debrief = await mount('liberia', { phase: 'debrief', step: 4, entities: { cases: 17 }, decisionLog: [entry], outcome });
    expect(debrief.net('cases').textContent).toBe('Since start: -8 points · Improving'); expect(debrief.net('cases').getAttribute('data-change-direction')).toBe('improving'); expect(debrief.net('cases').style.color).toBe('rgb(134, 239, 172)');
  });

  it('labels worsening and unchanged net scores explicitly', async () => {
    const t = await mount('liberia', { phase: 'debrief', step: 4, entities: { cases: 30 }, decisionLog: [{ step: 0, optionId: 'a', label: 'Decision' }], outcome });
    expect(t.net('cases').textContent).toBe('Since start: +5 points · Worsening'); expect(t.net('cases').style.color).toBe('rgb(252, 165, 165)');
    const unchanged = await mount('liberia', { phase: 'debrief', step: 4, entities: { cases: 25 }, decisionLog: [], outcome });
    expect(unchanged.net('cases').textContent).toBe('Since start: No change (0 points)'); expect(unchanged.net('cases').getAttribute('data-change-direction')).toBe('unchanged');
  });

  it('uses translated direction labels without changing numeric evidence', async () => {
    const t = await mount('liberia', null, { t: (key, fallback) => ({ 'stem.stewardship.change_improving': 'Amélioration', 'stem.stewardship.change_worsening': 'Dégradation' }[key] || fallback) });
    await activate(t.action('scenario-begin')); await activate(t.action('option:b'));
    expect(change(t.row('cases'))).toBe('-8 points · Amélioration'); expect(t.spoke('cases').getAttribute('data-change-direction')).toBe('improving');
  });
});
