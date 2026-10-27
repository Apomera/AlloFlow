import { afterEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounts = [];
afterEach(() => { for (const { root, host } of mounts.splice(0)) { act(() => root.unmount()); host.remove(); } vi.restoreAllMocks(); });
const outcome = { label: 'Completed', tier: 'strong', desc: 'Recorded environmental evidence.', color: '#86efac' };
const completed = {
  fireEcology: { mosaic: { phase: 'debrief', year: 8, maxYears: 8, finalOutcome: outcome, zones: [], yearLog: [] } },
  ecosystem: { conserve: { phase: 'debrief', year: 10, maxYears: 10, finalOutcome: outcome, species: [], yearLog: [] } }
};
async function mount(hubPatch = {}, dataPatch = {}) {
  resetStemLab(); const tool = loadTool(process.env.STEWARDSHIP_SOURCE || 'stem_lab/stem_tool_stewardship.js', 'stewardshipHub'), store = newStore();
  const host = document.createElement('div'); document.body.appendChild(host); const root = ReactDOMClient.createRoot(host); mounts.push({ root, host });
  const announceToSR = vi.fn(), addXP = vi.fn(); let latest, setLatest;
  function Host() {
    const [data, setData] = React.useState({ ...completed, ...dataPatch, stewardshipHub: { tutorialSeen: true, tutorialStep: null, scenarioStates: {}, inquiry: { hypothesis: 'Preserve my thinking.' }, ...hubPatch } });
    latest = data; setLatest = setData;
    return React.createElement('div', null, tool.render(makeCtx({ toolData: data, setToolData: setData, announceToSR, addXP }, store)), React.createElement('button', { 'data-other-task': 'true' }, 'Another task'));
  }
  await act(async () => root.render(React.createElement(Host)));
  const rawHub = patch => setLatest(prev => ({ ...prev, stewardshipHub: { ...prev.stewardshipHub, ...patch } }));
  return { host, root, announceToSR, addXP, state: () => latest, rawHub,
    update: patch => act(async () => rawHub(patch)),
    updateData: patch => act(async () => setLatest(prev => ({ ...prev, ...patch }))),
    action: key => host.querySelector('[data-stewardship-action="' + key + '"]'),
    heading: () => host.querySelector('[data-stewardship-heading]'),
    view: () => host.querySelector('[data-stewardship-view]'),
    other: () => host.querySelector('[data-other-task]') };
}
async function activate(button) { expect(button).toBeTruthy(); await act(async () => { button.focus(); button.click(); }); }

describe('Stewardship view navigation and keyboard focus', () => {
  it('opens the tour at its step heading and returns to its own opener without changing progress', async () => {
    const t = await mount(); const saved = JSON.stringify(t.state().fireEcology);
    await activate(t.action('tour'));
    expect(t.view().getAttribute('data-stewardship-view')).toBe('tutorial:0'); expect(document.activeElement).toBe(t.heading());
    expect(t.heading().tagName).toBe('H3'); expect(t.heading().tabIndex).toBe(-1);
    await activate(t.action('tutorial-next')); expect(t.state().stewardshipHub.tutorialStep).toBe(1); expect(document.activeElement).toBe(t.heading());
    await activate(t.action('tutorial-back')); expect(t.state().stewardshipHub.tutorialStep).toBe(0); expect(document.activeElement).toBe(t.heading());
    await activate(t.action('tutorial-skip')); expect(document.activeElement).toBe(t.action('tour'));
    expect(t.view().getAttribute('data-stewardship-view')).toBe('hub'); expect(JSON.stringify(t.state().fireEcology)).toBe(saved);
    expect(t.state().stewardshipHub.inquiry.hypothesis).toBe('Preserve my thinking.');
  });

  it('returns from the final tour step to the original tour control', async () => {
    const t = await mount(); await activate(t.action('tour'));
    for (let i = 0; i < 5; i++) await activate(t.action('tutorial-next'));
    expect(t.state().stewardshipHub.tutorialSeen).toBe(true); expect(t.state().stewardshipHub.tutorialStep).toBeNull();
    expect(document.activeElement).toBe(t.action('tour'));
  });

  it('does not autofocus a first visit or saved tutorial, report, or scenario', async () => {
    const guard = document.createElement('button'); document.body.appendChild(guard); guard.focus();
    try {
      const first = await mount({ tutorialSeen: false, tutorialStep: null }, { fireEcology: {}, ecosystem: {} });
      expect(first.view().getAttribute('data-stewardship-view')).toBe('tutorial:0'); expect(document.activeElement).toBe(guard);
      const tour = await mount({ tutorialStep: 2 }); expect(tour.view().getAttribute('data-stewardship-view')).toBe('tutorial:2'); expect(document.activeElement).toBe(guard);
      const report = await mount({ viewingReport: 'mosaic' }); expect(report.view().getAttribute('data-stewardship-view')).toBe('report:mosaic'); expect(document.activeElement).toBe(guard);
      const scenario = await mount({ playingScenario: 'yarralin' }); expect(scenario.view().getAttribute('data-stewardship-view')).toBe('scenario:yarralin:briefing:0'); expect(document.activeElement).toBe(guard);
    } finally { guard.remove(); }
  });

  it('uses the hub heading when a restored tutorial has no original opener', async () => {
    const t = await mount({ tutorialStep: 2 }); await activate(t.action('tutorial-skip'));
    expect(t.heading().getAttribute('data-stewardship-heading')).toBe('hub'); expect(document.activeElement).toBe(t.heading());
  });

  it('preserves the selected comparison card before moving to the pair heading and returning', async () => {
    const t = await mount(); const saved = JSON.stringify({ fire: t.state().fireEcology, eco: t.state().ecosystem });
    await activate(t.action('compare')); expect(document.activeElement).toBe(t.heading());
    const card = t.action('pick:mosaic'); await activate(card); expect(document.activeElement).toBe(card); expect(card.getAttribute('aria-pressed')).toBe('true');
    await activate(card); expect(document.activeElement).toBe(card); expect(card.getAttribute('aria-pressed')).toBe('false');
    await activate(card); await activate(t.action('pick:conserve'));
    expect(t.view().getAttribute('data-stewardship-view')).toBe('comparison:viewing:mosaic:conserve'); expect(document.activeElement).toBe(t.heading());
    await activate(t.action('pick-again')); expect(t.view().getAttribute('data-stewardship-view')).toBe('comparison:selecting'); expect(document.activeElement).toBe(t.heading());
    await activate(t.action('return')); expect(document.activeElement).toBe(t.action('compare'));
    expect(JSON.stringify({ fire: t.state().fireEcology, eco: t.state().ecosystem })).toBe(saved);
  });

  it('opens reports at their heading and returns to the matching report button', async () => {
    const t = await mount(); await activate(t.action('report:conserve'));
    expect(document.activeElement).toBe(t.heading()); expect(t.heading().textContent).toBe('Conservation Manager');
    await activate(t.action('return')); expect(document.activeElement).toBe(t.action('report:conserve'));
    expect(t.state().ecosystem.conserve.finalOutcome).toEqual(outcome);
  });

  it('uses a hub heading fallback when the original report action is no longer available', async () => {
    const t = await mount(); await activate(t.action('report:mosaic'));
    await t.updateData({ fireEcology: { mosaic: { phase: 'playing', year: 3 } } });
    await activate(t.action('return')); expect(t.action('report:mosaic')).toBeNull(); expect(document.activeElement).toBe(t.heading());
    expect(t.heading().getAttribute('data-stewardship-heading')).toBe('hub');
  });

  it('focuses scenario decisions and debrief, preserves choices on pause, and supports both replay routes', async () => {
    const t = await mount(); const otherCampaign = JSON.stringify(t.state().ecosystem);
    await activate(t.action('scenario:yarralin')); expect(document.activeElement).toBe(t.heading());
    await activate(t.action('scenario-begin')); expect(document.activeElement).toBe(t.heading()); expect(t.heading().tagName).toBe('H2');
    await activate(t.action('option:a')); expect(t.state().stewardshipHub.scenarioStates.yarralin.step).toBe(1); expect(document.activeElement).toBe(t.heading());
    const decision = JSON.stringify(t.state().stewardshipHub.scenarioStates.yarralin);
    await activate(t.action('return')); expect(document.activeElement).toBe(t.action('scenario:yarralin')); expect(JSON.stringify(t.state().stewardshipHub.scenarioStates.yarralin)).toBe(decision);
    await activate(t.action('scenario:yarralin')); expect(document.activeElement).toBe(t.heading());
    for (let i = 0; i < 3; i++) await activate(t.action('option:a'));
    expect(t.state().stewardshipHub.scenarioStates.yarralin.phase).toBe('debrief'); expect(document.activeElement).toBe(t.heading()); expect(t.addXP).toHaveBeenCalledTimes(1);
    await activate(t.action('scenario-replay')); expect(t.state().stewardshipHub.scenarioStates.yarralin.step).toBe(0); expect(document.activeElement).toBe(t.heading());
    for (let i = 0; i < 4; i++) await activate(t.action('option:b'));
    await activate(t.action('return')); await activate(t.action('replay:yarralin'));
    expect(t.state().stewardshipHub.scenarioStates.yarralin).toBeUndefined(); expect(t.view().getAttribute('data-stewardship-view')).toBe('scenario:yarralin:briefing:0'); expect(document.activeElement).toBe(t.heading());
    await activate(t.action('return')); expect(document.activeElement).toBe(t.heading()); // Replay action disappeared after resetting this scenario.
    expect(JSON.stringify(t.state().ecosystem)).toBe(otherCampaign);
  });

  it('scopes transitions and return controls to the activating instance', async () => {
    const a = await mount(), b = await mount(); await activate(b.action('scenario:yarralin'));
    expect(document.activeElement).toBe(b.heading()); expect(a.view().getAttribute('data-stewardship-view')).toBe('hub');
    await activate(b.action('return')); expect(document.activeElement).toBe(b.action('scenario:yarralin'));
    await activate(a.action('report:mosaic')); await activate(a.action('return')); expect(document.activeElement).toBe(a.action('report:mosaic'));
  });

  it('does not steal focus moved to another instance during a transition', async () => {
    const a = await mount(), b = await mount();
    await act(async () => { a.action('tour').focus(); a.action('tour').click(); b.action('tour').focus(); });
    expect(document.activeElement).toBe(b.action('tour')); expect(a.view().getAttribute('data-stewardship-view')).toBe('tutorial:0');
    await a.update({ tutorialStep: 1 }); expect(document.activeElement).toBe(b.action('tour'));
  });

  it('cancels a pending focus handoff after a different view takes over', async () => {
    const t = await mount();
    await act(async () => { t.action('tour').focus(); t.action('tour').click(); t.rawHub({ viewingReport: 'mosaic' }); t.other().focus(); });
    expect(t.view().getAttribute('data-stewardship-view')).toBe('report:mosaic'); expect(document.activeElement).toBe(t.other());
    await t.update({ viewingReport: null }); expect(document.activeElement).toBe(t.other());
  });

  it('does not focus a hidden instance or an action invoked while another control owns focus', async () => {
    const t = await mount(); t.other().focus();
    await act(async () => t.action('tour').click()); expect(document.activeElement).toBe(t.other());
    await t.update({ tutorialStep: null, tutorialSeen: true });
    await act(async () => { t.action('tour').focus(); t.action('tour').click(); t.host.hidden = true; });
    expect(document.activeElement).not.toBe(t.heading());
    t.host.hidden = false; t.other().focus(); await t.update({ tutorialStep: 1 }); expect(document.activeElement).toBe(t.other());
  });
});
