import { afterEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounts = [];
afterEach(() => { for (const { root, host } of mounts.splice(0)) { act(() => root.unmount()); host.remove(); } vi.restoreAllMocks(); });
const initial = { spinifex: 55, stone: 60, floodplain: 50, riparian: 65, community: 60 };
const outcome = { tier: 'strong', color: '#86efac', label: 'Strong stewardship', desc: 'Most entities recovered.' };
async function mount(scenario = 'yarralin', state = null) {
  resetStemLab(); const tool = loadTool(process.env.STEWARDSHIP_SOURCE || 'stem_lab/stem_tool_stewardship.js', 'stewardshipHub'), store = newStore();
  const host = document.createElement('div'); document.body.appendChild(host); const root = ReactDOMClient.createRoot(host); mounts.push({ root, host });
  let latest; const announceToSR = vi.fn();
  function Host() {
    const [data, setData] = React.useState({
      stewardshipHub: { tutorialSeen: true, playingScenario: scenario, stewIQ: { hypothesis: 'Keep my explanation.' }, scenarioStates: state ? { [scenario]: state } : {} },
      ecosystem: { conserve: { phase: 'playing', year: 4, custom: 'keep' } }
    });
    latest = data;
    return React.createElement('div', null, tool.render(makeCtx({ toolData: data, setToolData: setData, announceToSR }, store)), React.createElement('button', { 'data-outside-tool': 'true' }, 'Another task'));
  }
  await act(async () => root.render(React.createElement(Host)));
  return { host, state: () => latest, announceToSR,
    action: key => host.querySelector('[data-stewardship-action="' + key + '"]'),
    data: mode => host.querySelector('[data-stewardship-scenario-data="' + mode + '"]'),
    row: (mode, id) => host.querySelector('[data-stewardship-scenario-data="' + mode + '"] [data-stewardship-entity-row="' + id + '"]'),
    map: () => host.querySelector('[data-stewardship-system-map]') };
}
async function activate(button) { expect(button).toBeTruthy(); await act(async () => { button.focus(); button.click(); }); }
const cells = row => [...row.querySelectorAll('td')].map(cell => cell.textContent);

describe('Stewardship scenario system data alternatives', () => {
  it('provides a native disclosure and a labelled table for every map value before a decision', async () => {
    const t = await mount(); await activate(t.action('scenario-begin'));
    const detail = t.data('current'), summary = detail.querySelector('summary'), region = detail.querySelector('[role="region"]'), table = detail.querySelector('table');
    expect(detail.open).toBe(false); expect(summary.textContent).toBe('System data: scores and latest changes');
    expect(document.getElementById(region.getAttribute('aria-labelledby'))).toBe(summary); expect(region.tabIndex).toBe(0);
    expect(document.getElementById(region.getAttribute('aria-describedby')).textContent).toContain('Scores range from 0 to 100');
    expect(table.querySelector('caption').textContent).toContain('Yarralin Mosaic Burns');
    expect([...table.querySelectorAll('thead th')].every(th => th.scope === 'col')).toBe(true);
    expect([...table.querySelectorAll('tbody th')].every(th => th.scope === 'row')).toBe(true);
    expect(table.querySelectorAll('tbody tr')).toHaveLength(5);
    expect(t.row('current', 'community').textContent).toContain('Ranger team capacity');
    expect(cells(t.row('current', 'spinifex'))).toEqual(['55 / 100', 'StressedHigher is healthier', 'No decision yet']);
    expect(document.getElementById(t.map().getAttribute('aria-describedby'))).toBe(summary);
  });

  it('retains the disclosure and focus while showing recorded rather than future choice changes', async () => {
    const t = await mount(); await activate(t.action('scenario-begin'));
    const summary = t.data('current').querySelector('summary'); await activate(summary);
    expect(document.activeElement).toBe(summary); expect(t.data('current').open).toBe(true);
    const before = JSON.stringify(t.state().ecosystem);
    await activate(t.action('option:a'));
    expect(cells(t.row('current', 'spinifex'))).toEqual(['73 / 100', 'HealthyHigher is healthier', '+18 points · Improving']);
    expect(cells(t.row('current', 'community'))).toEqual(['55 / 100', 'StressedHigher is healthier', '-5 points · Worsening']);
    expect(cells(t.row('current', 'riparian'))[2]).toBe('No change (0 points)');
    expect(t.data('current').querySelector('summary')).toBe(summary); expect(t.data('current').open).toBe(true);
    expect(document.activeElement).toBe(t.host.querySelector('[data-stewardship-heading="scenario"]'));
    expect(t.state().stewardshipHub.stewIQ.hypothesis).toBe('Keep my explanation.'); expect(JSON.stringify(t.state().ecosystem)).toBe(before);
  });

  it('records actual clamped changes and preserves all previous decision fields', async () => {
    const saved = Object.freeze({ phase: 'playing', step: 0, entities: Object.freeze({ ...initial, spinifex: 95, community: 2 }), decisionLog: Object.freeze([]) });
    const t = await mount('yarralin', saved); await activate(t.action('option:a'));
    expect(cells(t.row('current', 'spinifex'))).toEqual(['100 / 100', 'HealthyHigher is healthier', '+5 points · Improving']);
    expect(cells(t.row('current', 'community'))).toEqual(['0 / 100', 'CriticalHigher is healthier', '-2 points · Worsening']);
    const entry = t.state().stewardshipHub.scenarioStates.yarralin.decisionLog[0];
    expect(entry).toMatchObject({ step: 0, optionId: 'a', entityValuesBefore: { spinifex: 95, community: 2 }, entityValuesAfter: { spinifex: 100, community: 0 } });
    expect(entry.label).toContain('Helicopter mosaic'); expect(entry.narrative).toContain('Aerial ignition');
    expect(entry.entityValuesBefore).not.toBe(entry.entityValuesAfter); expect(saved.entities.spinifex).toBe(95); expect(saved.decisionLog).toHaveLength(0);
    const mapChanges = [...t.map().querySelectorAll('g')].map(node => node.textContent);
    expect(mapChanges.find(text => text.includes('Spinifex'))).toContain('+5');
    expect(mapChanges.find(text => text.includes('Ranger team'))).toContain('-2');
  });

  it('explains condition and direction for an inverted measure without relying on color', async () => {
    const t = await mount('yellowstone'); await activate(t.action('scenario-begin'));
    expect(cells(t.row('current', 'elk'))).toEqual(['88 / 100', 'CriticalLower is healthier', 'No decision yet']);
    await activate(t.action('option:b'));
    expect(cells(t.row('current', 'elk'))).toEqual(['80 / 100', 'CriticalLower is healthier', '-8 points · Improving']);
    expect(t.row('current', 'elk').querySelector('th').textContent).toContain('Elk herd pressure');
  });

  it('exposes the initial and every intermediate decision score in the debrief', async () => {
    const t = await mount(); await activate(t.action('scenario-begin'));
    for (let i = 0; i < 4; i++) await activate(t.action('option:b'));
    const detail = t.data('trajectory'); expect(detail).toBeTruthy(); expect(t.data('current')).toBeNull();
    const headers = [...detail.querySelectorAll('thead th')].map(th => th.textContent);
    expect(headers).toHaveLength(6); expect(headers[1]).toBe('Initial'); expect(headers[2]).toContain('Phase 1'); expect(headers[5]).toContain('Magala');
    expect(cells(t.row('trajectory', 'spinifex'))).toEqual(['55 / 100', '65 / 100', '70 / 100', '75 / 100', '83 / 100']);
    expect(cells(t.row('trajectory', 'community'))).toEqual(['60 / 100', '78 / 100', '81 / 100', '100 / 100', '100 / 100']);
    expect(t.state().stewardshipHub.scenarioStates.yarralin.decisionLog).toHaveLength(4);
  });

  it('replays legacy entries without rewriting them or inventing data for unreadable choices', async () => {
    const entries = Object.freeze([Object.freeze({ step: 0, optionId: 'a', label: 'Legacy choice', narrative: 'Recorded before data snapshots.', custom: 'keep' }), Object.freeze({ step: 1, optionId: 'removed-option', label: 'Older unknown choice' })]);
    const saved = Object.freeze({ phase: 'debrief', step: 4, entities: Object.freeze({ ...initial, spinifex: 79 }), decisionLog: entries, outcome });
    const t = await mount('yarralin', saved);
    expect(cells(t.row('trajectory', 'spinifex'))).toEqual(['55 / 100', '73 / 100', 'Unavailable']);
    expect(t.data('trajectory').textContent).toContain('older decision could not be read');
    expect(t.state().stewardshipHub.scenarioStates.yarralin.decisionLog).toBe(entries);
    expect(t.host.querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(0);
  });

  it('uses explicit before-and-after snapshots for imported progress and never fabricates an unknown delta', async () => {
    const entry = { step: 0, optionId: 'older-choice', label: 'Older choice', entityValuesBefore: { ...initial, spinifex: 95 }, entityValuesAfter: { ...initial, spinifex: 100 } };
    const t = await mount('yarralin', { phase: 'playing', step: 1, entities: { ...initial, spinifex: 100 }, decisionLog: [entry] });
    expect(cells(t.row('current', 'spinifex'))[2]).toBe('+5 points · Improving');
    const unknown = await mount('yarralin', { phase: 'playing', step: 1, entities: initial, decisionLog: [{ step: 0, optionId: 'older-choice', label: 'Unknown' }] });
    expect(cells(unknown.row('current', 'spinifex'))[2]).toBe('Change unavailable');
    expect(unknown.map().textContent).not.toContain('+');
  });

  it('uses the recorded initial score for the history table, sparkline, and net change', async () => {
    const entry = { step: 0, optionId: 'a', label: 'Helicopter mosaic', entityValuesBefore: { ...initial, spinifex: 95 }, entityValuesAfter: { ...initial, spinifex: 100 } };
    const t = await mount('yarralin', { phase: 'debrief', step: 4, entities: { ...initial, spinifex: 100 }, decisionLog: [entry], outcome });
    expect(cells(t.row('trajectory', 'spinifex'))).toEqual(['95 / 100', '100 / 100']);
    const sparkline = t.host.querySelector('svg[aria-hidden="true"]');
    expect(sparkline.parentElement.textContent).toContain('+5');
    expect(Number(sparkline.querySelector('line').getAttribute('y1'))).toBeCloseTo(3.9);
    expect(sparkline.querySelector('polyline').getAttribute('points')).toBe('0.0,3.9 100.0,3.0');
  });

  it('keeps disclosure IDs local to each instance and never focuses restored data', async () => {
    const guard = document.createElement('button'); document.body.appendChild(guard); guard.focus();
    try {
      const saved = { phase: 'playing', step: 0, entities: initial, decisionLog: [] };
      const a = await mount('yarralin', saved), b = await mount('yarralin', saved);
      expect(document.activeElement).toBe(guard);
      const ar = a.data('current').querySelector('[role="region"]'), br = b.data('current').querySelector('[role="region"]');
      expect(ar.getAttribute('aria-labelledby')).not.toBe(br.getAttribute('aria-labelledby'));
      for (const t of [a, b]) {
        const region = t.data('current').querySelector('[role="region"]');
        for (const attr of ['aria-labelledby', 'aria-describedby']) expect(t.host.contains(document.getElementById(region.getAttribute(attr)))).toBe(true);
      }
      await activate(b.data('current').querySelector('summary'));
      expect(b.data('current').open).toBe(true); expect(a.data('current').open).toBe(false);
      expect(document.activeElement).toBe(b.data('current').querySelector('summary'));
    } finally { guard.remove(); }
  });
});
