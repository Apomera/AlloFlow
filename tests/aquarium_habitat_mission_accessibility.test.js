import { afterEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounts = [];
afterEach(() => { mounts.splice(0).forEach(({ root, host }) => { act(() => root.unmount()); host.remove(); }); vi.restoreAllMocks(); });
async function mount(patch = {}) {
  resetStemLab();
  const tool = loadTool(process.env.AQUARIUM_SOURCE || 'stem_lab/stem_tool_aquarium.js', 'aquarium'), store = newStore();
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host); mounts.push({ root, host });
  const addToast = vi.fn(), announceToSR = vi.fn(); let latest, update;
  function Host() {
    const [data, setData] = React.useState({ _aquarium: {
      mode: 'tank', selectedTank: 'freshwater', aquariumWorkspacePanel: 'decide', tutorialDismissed: true,
      soundEnabled: false, simRunning: false, simTick: 10, simDay: 0, simHour: 12,
      fishIdentityVersion: 3, tankFish: ['guppy'], fishInstanceIds: ['fish-1'], nextFishInstanceId: 2,
      fishNames: { 'fish-1': 'Azure' }, hungerLevels: { 'fish-1': 25 }, fishStress: {}, fishSickness: {},
      tankPlants: [], plantHealth: {}, plantBiomass: {}, habitatLayout: [],
      habitatStudioOpen: true, habitatMissionPanelOpen: true, habitatViewMode: 'plan',
      waterChem: { temp: 76, pH: 7, ammonia: 0, nitrite: 0, nitrate: 20, salinity: 0, dissolvedO2: 7, co2: 3 },
      lightsOn: true, equipment: { filter: 0, heater: 0, light: 0, airPump: 0 },
      equipmentCondition: { filter: 100, heater: 100, light: 100, airPump: 100 }, equipmentFaults: {},
      coins: 50, observationNotes: 'Preserve my observation.', ...patch
    } });
    latest = data._aquarium; update = values => setData(old => ({ ...old, _aquarium: { ...old._aquarium, ...values } }));
    return React.createElement('div', null, tool.render(makeCtx({ toolData: data, setToolData: setData, addToast, announceToSR }, store)), React.createElement('button', { 'data-other-control': 'true' }, 'Another task'));
  }
  await act(async () => root.render(React.createElement(Host))); addToast.mockClear(); announceToSR.mockClear();
  const one = (hook, value) => host.querySelector('[data-aquarium-mission-' + hook + (value == null ? '' : '="' + value + '"') + ']');
  return { host, state: () => latest, addToast, announceToSR, one, action: name => one('action', name),
    heading: () => one('heading'), board: () => one('board-heading'), other: () => host.querySelector('[data-other-control]'),
    rawUpdate: values => update(values), update: values => act(async () => update(values)) };
}
async function activate(button, twice = false) { expect(button).toBeTruthy(); await act(async () => { button.focus(); button.click(); if (twice) button.click(); }); }
const baseline = { tick: 10, layoutSignature: '[]', shelter: 0, territory: 0, openSwim: 100, average: 60, minimum: 60, vitality: 100, stress: 0 };
const reflected = success => ({ habitatMissionId: 'refuge', habitatMissionStage: 'reflect', habitatMissionBaseline: baseline,
  habitatMissionPrediction: 'shelter', habitatMissionObservationStartTick: 10, habitatMissionObservationLayoutSignature: '[]',
  habitatMissionOutcome: { success, stars: success ? 3 : 1, predictionMatched: false, vitalityProtected: true, conditions: [{ id: 'controlled', met: true, label: 'Keep the locked habitat unchanged during observation' }] },
  habitatMissionRevision: 'revised', habitatMissionReflection: 'Shelter changed, so I revised my explanation using the readings.' });

describe('Aquarium Habitat mission keyboard flows', () => {
  it('keeps outer studio disclosure targets unique while unmounting hidden scene content and preserving saved reflection', async () => {
    const first = await mount({ ...reflected(false), habitatStudioOpen: false }), second = await mount({ ...reflected(false), habitatStudioOpen: false });
    const toggle = t => t.host.querySelector('[data-aquarium-habitat-toggle]'), body = t => t.host.querySelector('[data-aquarium-habitat-body]');
    expect(body(first).id).not.toBe(body(second).id);
    for (const t of [first, second]) { expect(toggle(t).getAttribute('aria-controls')).toBe(body(t).id); expect(body(t).hidden).toBe(true); expect(body(t).childElementCount).toBe(0); }
    await activate(toggle(second)); expect(body(second).hidden).toBe(false); expect(toggle(second).getAttribute('aria-expanded')).toBe('true');
    expect(second.one('reflection').value).toBe(reflected(false).habitatMissionReflection); expect(second.state().habitatMissionStage).toBe('reflect');
    await activate(toggle(second)); expect(body(second).hidden).toBe(true); expect(body(second).childElementCount).toBe(0); expect(document.activeElement).toBe(toggle(second));
    await activate(toggle(second)); expect(second.one('reflection').value).toBe(reflected(false).habitatMissionReflection);
    expect(second.state().habitatMissionRevision).toBe('revised'); expect(second.state().habitatMissionStage).toBe('reflect'); expect(body(first).hidden).toBe(true);
  });

  it('gives each Start or Replay button its mission identity and keeps the mission disclosure target', async () => {
    const t = await mount({ habitatMissionPanelOpen: false, habitatMissionCompleted: { refuge: { success: true, stars: 3, attempts: 1 } } });
    const toggle = t.one('toggle'), body = t.one('body');
    expect(body.hidden).toBe(true); expect(toggle.getAttribute('aria-controls')).toBe(body.id);
    expect(toggle.getAttribute('aria-label')).toBe('Show habitat missions'); await activate(toggle);
    expect(body.hidden).toBe(false); expect(toggle.getAttribute('aria-expanded')).toBe('true'); expect(document.activeElement).toBe(toggle);
    const starts = [...t.host.querySelectorAll('[data-aquarium-mission-start]')];
    expect(starts).toHaveLength(4); expect(new Set(starts.map(b => b.getAttribute('aria-label'))).size).toBe(4);
    for (const button of starts) expect(button.getAttribute('aria-label').startsWith(button.textContent + ': ')).toBe(true);
    expect(t.one('start', 'refuge').getAttribute('aria-label')).toBe('Replay mission: Refuge Rescue');
    expect(t.host.querySelector('[role="img"][aria-label="3 of 3 stars"]')).toBeTruthy();
    await activate(toggle); expect(body.hidden).toBe(true); expect(toggle.getAttribute('aria-label')).toBe('Show habitat missions');
  });

  it('moves focus through prediction, building, observation, and evidence while preserving the chosen plan view', async () => {
    const t = await mount(); await activate(t.one('start', 'refuge'), true);
    expect(document.activeElement).toBe(t.heading()); expect(t.heading().getAttribute('data-aquarium-mission-heading')).toBe('predict');
    expect(t.state().habitatMissionBaseline.tick).toBe(10); expect(t.announceToSR).toHaveBeenCalledTimes(1);
    await activate(t.one('prediction', 'shelter'), true);
    expect(document.activeElement).toBe(t.heading()); expect(t.heading().textContent).toBe('Build one controlled intervention');
    expect(t.state().habitatMissionPrediction).toBe('shelter'); expect(t.state().habitatViewMode).toBe('plan'); expect(t.action('lock').disabled).toBe(true);
    await t.update({ habitatLayout: [{ id: 'cave-1', type: 'cave', x: 0, y: 0, z: 0, scale: 1, rotation: 0 }] });
    await activate(t.action('lock'), true); expect(t.state().habitatMissionStage).toBe('observe'); expect(document.activeElement).toBe(t.heading());
    expect(t.heading().textContent).toBe('Observe organism response'); expect(t.one('body').textContent).toContain('Use plan overlays or the 3D view');
    expect(t.state().habitatMissionObservationStartTick).toBe(10); expect(t.state().habitatViewMode).toBe('plan'); expect(t.action('evaluate').disabled).toBe(true);
    await t.update({ simTick: 14 }); await activate(t.action('evaluate'), true);
    expect(t.state().habitatMissionStage).toBe('reflect'); expect(document.activeElement).toBe(t.heading());
    expect(t.state().habitatMissionOutcome.conditions.find(c => c.id === 'observation').met).toBe(true);
    expect(t.state().habitatMissionOutcome.conditions.find(c => c.id === 'controlled').met).toBe(true);
    expect(t.state().observationNotes).toBe('Preserve my observation.'); expect(t.state().coins).toBe(50);
  });

  it.each([true, false])('returns completed reflection to the board and saves one attempt (success=%s)', async success => {
    const t = await mount({ ...reflected(success), habitatMissionPoints: 100, habitatMissionCompleted: { refuge: { stars: 1, attempts: 2 } } });
    expect(t.host.querySelector('[role="img"][aria-label="' + (success ? 3 : 1) + ' of 3 investigation stars earned"]')).toBeTruthy();
    await activate(t.action('save'), true);
    expect(document.activeElement).toBe(t.board()); expect(t.state().habitatMissionId).toBeNull(); expect(t.state().habitatMissionStage).toBe('brief');
    expect(t.state().habitatMissionCompleted.refuge).toMatchObject({ success, attempts: 3, stars: success ? 3 : 1, revision: 'revised', reflection: reflected(success).habitatMissionReflection });
    expect(t.state().habitatMissionPoints).toBe(success ? 300 : 100); expect(t.addToast).toHaveBeenCalledTimes(1);
    expect(t.one('start', 'refuge').textContent).toBe('Replay mission');
  });

  it('retries a failed attempt at prediction without discarding stored attempts or points', async () => {
    const completed = { refuge: { stars: 1, attempts: 2 } }, t = await mount({ ...reflected(false), habitatMissionCompleted: completed, habitatMissionPoints: 100 });
    await activate(t.action('retry'), true);
    expect(document.activeElement).toBe(t.heading()); expect(t.state().habitatMissionStage).toBe('predict');
    expect(t.state().habitatMissionPrediction).toBeNull(); expect(t.state().habitatMissionReflection).toBe('');
    expect(t.state().habitatMissionCompleted).toEqual(completed); expect(t.state().habitatMissionPoints).toBe(100);
    expect(t.state().habitatMissionBaseline.tick).toBe(10);
  });

  it('explains reflection requirements and enables saving only after a revision and enough evidence are provided', async () => {
    const t = await mount({ ...reflected(false), habitatMissionRevision: '', habitatMissionReflection: 'Too short' });
    const field = t.one('reflection'), save = t.action('save'), helpId = field.getAttribute('aria-describedby');
    const help = t.host.querySelector('[id="' + helpId + '"]');
    expect(help).toBeTruthy(); expect(help.textContent).toContain('Choose a revision option');
    expect(help.textContent).toMatch(/at least\s*20 characters/); expect(help.textContent).toMatch(/up to\s*600/);
    expect(save.getAttribute('aria-describedby')).toBe(helpId); expect(field.minLength).toBe(20); expect(field.maxLength).toBe(600);
    expect(save.disabled).toBe(true); await act(async () => save.click());
    expect(t.state().habitatMissionStage).toBe('reflect'); expect(t.state().habitatMissionCompleted).toBeUndefined();
    await t.update({ habitatMissionReflection: 'Enough evidence text to explain this habitat outcome.' });
    expect(save.disabled).toBe(true); await activate(t.one('revision-choice', 'revised'));
    expect(save.disabled).toBe(false); expect(save.getAttribute('aria-disabled')).toBe('false');
    await activate(save); expect(t.state().habitatMissionCompleted.refuge.reflection).toBe('Enough evidence text to explain this habitat outcome.');
    expect(document.activeElement).toBe(t.board());
  });

  it('returns Mission board to its heading without awarding an unfinished attempt', async () => {
    const t = await mount(); await activate(t.one('start', 'corridor')); await activate(t.action('board'));
    expect(document.activeElement).toBe(t.board()); expect(t.state().habitatMissionId).toBeNull();
    expect(t.state().habitatMissionCompleted).toBeUndefined(); expect(t.addToast).not.toHaveBeenCalled();
  });

  it('does not autofocus a restored mission or a simulation-tick update', async () => {
    const t = await mount(reflected(false)); expect(document.activeElement).not.toBe(t.heading());
    t.other().focus(); await t.update({ simTick: 15 }); expect(document.activeElement).toBe(t.other());
  });

  it('does not steal focus after the user moves to another control', async () => {
    const t = await mount();
    await act(async () => { const start = t.one('start', 'refuge'); start.focus(); start.click(); t.other().focus(); });
    expect(t.state().habitatMissionStage).toBe('predict'); expect(document.activeElement).toBe(t.other());
  });

  it.each([{ aquariumWorkspacePanel: 'observe' }, { selectedTank: 'planted' }, { mode: 'learn' }, { habitatMissionPanelOpen: false }, { habitatStudioOpen: false }])('does not hand off focus into a changed or closed context %j', async patch => {
    const t = await mount();
    await act(async () => { const start = t.one('start', 'refuge'); start.focus(); start.click(); t.rawUpdate(patch); });
    expect(document.activeElement).not.toBe(t.heading()); expect(document.activeElement).not.toBe(t.board());
    for (const [key, value] of Object.entries(patch)) expect(t.state()[key]).toBe(value);
  });

  it('keeps mission labels, disclosures, revision radios, and transition focus within each mounted instance', async () => {
    const first = await mount(reflected(false)), second = await mount(reflected(false));
    const firstField = first.one('reflection'), secondField = second.one('reflection');
    expect(firstField.id).not.toBe(secondField.id); expect(firstField.labels).toHaveLength(1); expect(secondField.labels).toHaveLength(1);
    expect(first.one('body').id).not.toBe(second.one('body').id); expect(first.one('toggle').getAttribute('aria-controls')).toBe(first.one('body').id);
    expect(second.one('toggle').getAttribute('aria-controls')).toBe(second.one('body').id);
    const firstRadio = first.one('revision-choice', 'revised'), secondRadio = second.one('revision-choice', 'supported');
    expect(firstRadio.name).not.toBe(secondRadio.name); await activate(secondRadio);
    expect(firstRadio.checked).toBe(true); expect(secondRadio.checked).toBe(true); expect(first.state().habitatMissionRevision).toBe('revised'); expect(second.state().habitatMissionRevision).toBe('supported');
    await activate(second.action('retry')); expect(document.activeElement).toBe(second.heading()); expect(first.state().habitatMissionStage).toBe('reflect');
    await activate(second.action('board')); expect(document.activeElement).toBe(second.board());
  });
});
