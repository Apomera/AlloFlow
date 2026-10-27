import { afterEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounts = [];
afterEach(() => {
  for (const { root, host } of mounts.splice(0)) { act(() => root.unmount()); host.remove(); }
  vi.restoreAllMocks();
});

async function mount(patch = {}) {
  resetStemLab();
  const tool = loadTool(process.env.AQUARIUM_SOURCE || 'stem_lab/stem_tool_aquarium.js', 'aquarium'), store = newStore();
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host); mounts.push({ root, host });
  let latest, update;
  function Host() {
    const [data, setData] = React.useState({ _aquarium: {
      mode: 'tank', selectedTank: 'freshwater', aquariumWorkspacePanel: 'observe',
      tutorialDismissed: true, tutorialPanelOpen: false, soundEnabled: false, simRunning: false,
      simTick: 10, simDay: 0, simHour: 12, fishIdentityVersion: 3,
      tankFish: ['guppy'], fishInstanceIds: ['fish-1'], nextFishInstanceId: 2,
      tankPlants: ['anubias'], plantHealth: { anubias: 90 }, plantBiomass: { anubias: 2 }, selectedPlantId: 'anubias',
      habitatLayout: [], habitatStudioOpen: false, habitatViewMode: 'plan',
      waterChem: { temp: 76, pH: 7, ammonia: 0, nitrite: 0, nitrate: 20, salinity: 0, dissolvedO2: 7, co2: 3 },
      lightsOn: true, equipment: { filter: 0, heater: 0, light: 0, airPump: 0 },
      equipmentCondition: { filter: 100, heater: 100, light: 100, airPump: 100 }, equipmentFaults: {},
      coins: 50, observationNotes: 'Preserve my observation.', ...patch
    } });
    latest = data._aquarium;
    update = values => setData(old => ({ ...old, _aquarium: { ...old._aquarium, ...values } }));
    return React.createElement('div', null,
      tool.render(makeCtx({ toolData: data, setToolData: setData, addToast: vi.fn(), announceToSR: vi.fn() }, store)),
      React.createElement('button', { 'data-outside-workspace': 'true' }, 'Another task'));
  }
  await act(async () => root.render(React.createElement(Host)));
  return {
    host, state: () => latest, rawUpdate: values => update(values),
    nav: name => host.querySelector('[data-aquarium-workspace-nav="' + name + '"]'),
    panel: name => host.querySelector('[data-aquarium-workspace-panel="' + name + '"]'),
    section: key => host.querySelector('[data-aquarium-workspace-section="' + key + '"]'),
    button: text => [...host.querySelectorAll('button')].find(button => button.textContent === text),
    other: () => host.querySelector('[data-outside-workspace]')
  };
}
async function activate(button) { await act(async () => { button.focus(); button.click(); }); }
function model(t) {
  const state = t.state();
  return JSON.stringify(Object.fromEntries(['selectedTank', 'simRunning', 'simTick', 'simDay', 'simHour', 'tankFish', 'fishInstanceIds', 'tankPlants', 'plantHealth', 'plantBiomass', 'habitatLayout', 'waterChem', 'equipment', 'coins', 'observationNotes'].map(key => [key, state[key]])));
}

describe('Aquarium workspace ownership and keyboard navigation', () => {
  it('connects each navigation control to its own panel across two mounted tools', async () => {
    const first = await mount(), second = await mount();
    const ids = [];
    for (const t of [first, second]) for (const name of ['observe', 'decide', 'investigate']) {
      const button = t.nav(name), panel = t.panel(name);
      expect(button.getAttribute('aria-controls')).toBe(panel.id);
      expect(document.getElementById(button.getAttribute('aria-controls'))).toBe(panel);
      expect(button.getAttribute('aria-pressed')).toBe(String(name === 'observe'));
      expect(panel.hidden).toBe(name !== 'observe'); ids.push(panel.id);
    }
    expect(new Set(ids).size).toBe(6);
  });

  it('gives repeated section anchors and labelled headings distinct instance IDs', async () => {
    const first = await mount(), second = await mount();
    const keys = ['aquarium-tank-clock', 'aquarium-water-evidence', 'aquarium-care-actions', 'aquarium-stock-selection', 'aquarium-life-support', 'aquarium-selected-plant-profile', 'aquarium-habitat-studio', 'aquarium-systems-investigation'];
    for (const key of keys) {
      expect(first.section(key)).toBeTruthy(); expect(second.section(key)).toBeTruthy();
      expect(first.section(key).id).not.toBe(second.section(key).id);
      expect(document.getElementById(second.section(key).id)).toBe(second.section(key));
    }
    for (const t of [first, second]) for (const selector of ['[data-aquarium-next-step]', '[data-aquarium-care-actions]', '[data-aquarium-workspace-section="aquarium-selected-plant-profile"]']) {
      const section = t.host.querySelector(selector), label = document.getElementById(section.getAttribute('aria-labelledby'));
      expect(label).toBeTruthy(); expect(section.contains(label)).toBe(true);
    }
    expect(first.host.querySelector('[data-aquarium-live-tank]').id).not.toBe(second.host.querySelector('[data-aquarium-live-tank]').id);
  });

  it('switches panels with focus retained on the activated navigation button', async () => {
    const t = await mount(), before = model(t);
    for (const name of ['decide', 'investigate', 'observe']) {
      await activate(t.nav(name));
      expect(document.activeElement).toBe(t.nav(name)); expect(t.panel(name).hidden).toBe(false);
      expect(t.nav(name).getAttribute('aria-pressed')).toBe('true');
      expect(['observe', 'decide', 'investigate'].filter(key => !t.panel(key).hidden)).toEqual([name]);
      expect(model(t)).toBe(before);
    }
  });

  it('opens and focuses Stock organisms in the second instance without changing its model', async () => {
    const first = await mount(), second = await mount(), before = model(second);
    await activate(second.button('Stock organisms'));
    expect(document.activeElement).toBe(second.section('aquarium-stock-selection'));
    expect(second.state().aquariumWorkspacePanel).toBe('decide'); expect(second.panel('decide').hidden).toBe(false);
    expect(first.state().aquariumWorkspacePanel).toBe('observe'); expect(first.panel('observe').hidden).toBe(false);
    expect(model(second)).toBe(before);
  });

  it('can jump repeatedly to the current panel without waiting for animation frames', async () => {
    const t = await mount();
    await activate(t.button('Water evidence'));
    expect(document.activeElement).toBe(t.section('aquarium-water-evidence'));
    await activate(t.button('Water evidence'));
    expect(document.activeElement).toBe(t.section('aquarium-water-evidence')); expect(t.state().simTick).toBe(10);
  });

  it('opens the intended investigation disclosure and focuses its native summary', async () => {
    const first = await mount(), second = await mount(), before = model(second);
    const firstDetails = first.section('aquarium-systems-investigation'), secondDetails = second.section('aquarium-systems-investigation');
    firstDetails.open = false; secondDetails.open = false;
    await activate(second.button('Systems investigation'));
    expect(second.state().aquariumWorkspacePanel).toBe('investigate'); expect(secondDetails.open).toBe(true);
    expect(document.activeElement).toBe(secondDetails.querySelector('summary')); expect(firstDetails.open).toBe(false);
    expect(model(second)).toBe(before);
  });

  it('keeps focus with the user when another control is chosen before the jump is rendered', async () => {
    const t = await mount();
    await act(async () => { t.button('Stock organisms').focus(); t.button('Stock organisms').click(); t.other().focus(); });
    expect(t.state().aquariumWorkspacePanel).toBe('decide'); expect(document.activeElement).toBe(t.other());
  });

  it('does not take focus from another aquarium while a section jump is pending', async () => {
    const first = await mount(), second = await mount();
    await act(async () => { second.button('Stock organisms').focus(); second.button('Stock organisms').click(); first.nav('observe').focus(); });
    expect(document.activeElement).toBe(first.nav('observe'));
    expect(second.state().aquariumWorkspacePanel).toBe('decide'); expect(first.state().aquariumWorkspacePanel).toBe('observe');
  });

  it.each([{ aquariumWorkspacePanel: 'investigate' }, { selectedTank: 'planted' }, { mode: 'learn' }])('discards a pending jump after the workspace context changes: %j', async patch => {
    const t = await mount(), target = t.section('aquarium-stock-selection');
    await act(async () => { t.button('Stock organisms').focus(); t.button('Stock organisms').click(); t.rawUpdate(patch); });
    expect(document.activeElement).not.toBe(target);
    for (const [key, value] of Object.entries(patch)) expect(t.state()[key]).toBe(value);
    await act(async () => t.rawUpdate({ mode: 'tank', selectedTank: 'freshwater', aquariumWorkspacePanel: 'decide' }));
    expect(document.activeElement).not.toBe(t.section('aquarium-stock-selection'));
  });

  it('does not move focus when loading a saved panel or updating ordinary observations', async () => {
    const first = await mount(); first.other().focus();
    const second = await mount({ aquariumWorkspacePanel: 'decide' });
    expect(document.activeElement).toBe(first.other());
    await act(async () => second.rawUpdate({ observationNotes: 'A new observation.', simTick: 11 }));
    expect(document.activeElement).toBe(first.other()); expect(second.state().observationNotes).toBe('A new observation.');
  });
});
