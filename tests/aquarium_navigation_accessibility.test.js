import { afterEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounts = [];
afterEach(() => { for (const { root, host } of mounts.splice(0)) { act(() => root.unmount()); host.remove(); } vi.restoreAllMocks(); });

async function mount(patch = {}) {
  resetStemLab();
  const tool = loadTool(process.env.AQUARIUM_SOURCE || 'stem_lab/stem_tool_aquarium.js', 'aquarium'), store = newStore();
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host); mounts.push({ root, host });
  const addToast = vi.fn(); let latest, update;
  function Host() {
    const [data, setData] = React.useState({ _aquarium: {
      mode: 'tank', selectedTank: 'freshwater', aquariumWorkspacePanel: 'decide', tutorialDismissed: true,
      soundEnabled: false, simRunning: false, simTick: 10, simDay: 0, simHour: 12, fishIdentityVersion: 3,
      tankFish: ['guppy', 'guppy'], fishInstanceIds: ['fish-1', 'fish-2'], nextFishInstanceId: 3,
      fishNames: { 'fish-1': 'Azure', 'fish-2': 'Pearl' }, hungerLevels: { 'fish-1': 25, 'fish-2': 60 },
      fishSickness: {}, fishStress: {}, fishCareLog: {}, quarantinedFish: {},
      tankPlants: [], plantHealth: {}, plantBiomass: {}, habitatLayout: [],
      waterChem: { temp: 76, pH: 7, ammonia: 0, nitrite: 0, nitrate: 20, salinity: 0, dissolvedO2: 7, co2: 3 },
      lightsOn: true, equipment: { filter: 0, heater: 0, light: 0, airPump: 0 },
      equipmentCondition: { filter: 100, heater: 100, light: 100, airPump: 100 }, equipmentFaults: {},
      coins: 50, observationNotes: 'Preserve my observation.', ...patch
    } });
    latest = data._aquarium;
    update = values => setData(old => ({ ...old, _aquarium: { ...old._aquarium, ...values } }));
    return React.createElement('div', null, tool.render(makeCtx({ toolData: data, setToolData: setData, addToast }, store)), React.createElement('button', { 'data-other-control': 'true' }, 'Another task'));
  }
  await act(async () => root.render(React.createElement(Host)));
  addToast.mockClear();
  return { host, state: () => latest, rawUpdate: values => update(values), addToast,
    button: name => [...host.querySelectorAll('button')].find(button => button.getAttribute('aria-label') === name),
    remove: id => host.querySelector('[data-aquarium-stock-remove="' + id + '"]'), stock: () => host.querySelector('[data-aquarium-stock-selection]'),
    bulk: () => host.querySelector('[data-aquarium-isolate-all]'), other: () => host.querySelector('[data-other-control]') };
}
async function activate(button) { await act(async () => { button.focus(); button.click(); }); }

describe('Aquarium visible action names', () => {
  it('keeps the visible species in renamed removal actions and distinguishes individual residents', async () => {
    const t = await mount();
    const azure = t.button('Remove Guppy: Azure from tank'), pearl = t.button('Remove Guppy: Pearl from tank');
    expect(azure.textContent).toContain('Guppy'); expect(pearl.textContent).toContain('Guppy');
    expect(azure.getAttribute('aria-label')).toContain('Guppy'); expect(pearl.getAttribute('aria-label')).toContain('Pearl');
    await activate(azure);
    expect(t.state().tankFish).toEqual(['guppy']); expect(t.state().fishInstanceIds).toEqual(['fish-2']);
    expect(t.state().fishNames).toEqual({ 'fish-2': 'Pearl' }); expect(t.state().coins).toBe(50);
    expect(t.state().observationNotes).toBe('Preserve my observation.');
    expect(document.activeElement).toBe(t.remove('fish-2'));
  });

  it('uses the visible bulk isolation wording and retains the hospital action outcome', async () => {
    const t = await mount({ fishSickness: { 'fish-1': { disease: 'ich', severity: 1 }, 'fish-2': { disease: 'velvet', severity: 2 } } });
    const button = t.button('Isolate all sick (2): move sick fish to the hospital tank');
    expect(button.textContent).toContain('Isolate all sick (2)');
    expect(button.getAttribute('aria-label')).toContain('Isolate all sick (2)');
    await act(async () => { button.focus(); button.click(); button.click(); });
    expect(Object.keys(t.state().quarantinedFish).sort()).toEqual(['fish-1', 'fish-2']);
    expect(t.state().quarantinedFish['fish-1'].reason).toBe('ich'); expect(t.state().quarantinedFish['fish-2'].reason).toBe('velvet');
    expect(t.state().fishSickness['fish-1'].severity).toBe(1); expect(t.state().fishSickness['fish-2'].severity).toBe(2);
    expect(t.state().coins).toBe(50); expect(t.state().waterChem.ammonia).toBe(0);
    expect(document.activeElement).toBe(button); expect(t.bulk()).toBe(button); expect(button.disabled).toBe(false);
    expect(button.getAttribute('aria-disabled')).toBe('true'); expect(button.textContent).toBe('Sick fish isolated');
    expect(button.getAttribute('aria-label')).toContain(button.textContent);
    expect(t.addToast).toHaveBeenCalledTimes(1);
    const saved = JSON.stringify(t.state().quarantinedFish); await activate(button);
    expect(JSON.stringify(t.state().quarantinedFish)).toBe(saved); expect(t.addToast).toHaveBeenCalledTimes(1);
    expect(t.state().fishCareLog['fish-1']).toHaveLength(1); expect(t.state().fishCareLog['fish-2']).toHaveLength(1);
  });

  it('hands stock removal to a previous neighbor and then its named stock region', async () => {
    const t = await mount(); await activate(t.remove('fish-2'));
    expect(document.activeElement).toBe(t.remove('fish-1'));
    await activate(t.remove('fish-1'));
    expect(document.activeElement).toBe(t.stock()); expect(t.stock().getAttribute('role')).toBe('region');
    expect(t.stock().getAttribute('aria-label')).toBe('Add living stock'); expect(t.state().tankFish).toEqual([]);
  });

  it('keeps removal focus within its own Aquarium instance', async () => {
    const first = await mount(), second = await mount();
    await activate(second.remove('fish-1'));
    expect(document.activeElement).toBe(second.remove('fish-2')); expect(first.state().fishInstanceIds).toEqual(['fish-1', 'fish-2']);
    await activate(second.remove('fish-2')); expect(document.activeElement).toBe(second.stock());
  });

  it('does not reclaim focus after a user moves to another control', async () => {
    const t = await mount();
    await act(async () => { const button = t.remove('fish-1'); button.focus(); button.click(); t.other().focus(); });
    expect(document.activeElement).toBe(t.other()); expect(t.state().fishInstanceIds).toEqual(['fish-2']);
  });

  it.each([{ aquariumWorkspacePanel: 'observe' }, { selectedTank: 'planted' }, { mode: 'learn' }])('does not hand off stock focus after a context change %j', async patch => {
    const t = await mount();
    await act(async () => { const button = t.remove('fish-1'); button.focus(); button.click(); t.rawUpdate(patch); });
    expect(document.activeElement).not.toBe(t.stock()); expect(document.activeElement).not.toBe(t.remove('fish-2'));
    for (const [key, value] of Object.entries(patch)) expect(t.state()[key]).toBe(value);
  });

  it('guards a queued repeated removal without removing the next resident', async () => {
    const t = await mount(), button = t.remove('fish-1');
    await act(async () => { button.focus(); button.click(); button.click(); });
    expect(t.state().fishInstanceIds).toEqual(['fish-2']); expect(t.state().fishNames).toEqual({ 'fish-2': 'Pearl' });
    expect(document.activeElement).toBe(t.remove('fish-2'));
  });

  it('keeps an unavailable bulk action while healthy hospital residents remain', async () => {
    const t = await mount({ quarantinedFish: { 'fish-1': { sinceTick: 5, reason: 'observation' } } });
    const button = t.bulk(); expect(button.textContent).toBe('No sick fish to isolate');
    expect(button.getAttribute('aria-disabled')).toBe('true'); expect(button.disabled).toBe(false);
    const saved = JSON.stringify(t.state().quarantinedFish); await activate(button);
    expect(document.activeElement).toBe(button); expect(JSON.stringify(t.state().quarantinedFish)).toBe(saved);
    expect(t.addToast).not.toHaveBeenCalled();
  });
});
