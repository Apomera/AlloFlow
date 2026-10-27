import { afterEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounts = [];
afterEach(() => { for (const { root, host } of mounts.splice(0)) { act(() => root.unmount()); host.remove(); } vi.restoreAllMocks(); });
const initialLayout = () => [
  { id: 'habitat-1', type: 'cave', x: -2, y: 0, z: 0, rotation: 0, scale: 1 },
  { id: 'habitat-2', type: 'rock_arch', x: 2, y: 0, z: 0, rotation: 15, scale: 1 }
];
async function mount(patch = {}) {
  resetStemLab();
  const tool = loadTool(process.env.AQUARIUM_SOURCE || 'stem_lab/stem_tool_aquarium.js', 'aquarium'), store = newStore();
  const host = document.createElement('div'); document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host); mounts.push({ root, host });
  const announceToSR = vi.fn(); let latest, update;
  function Host() {
    const [data, setData] = React.useState({ _aquarium: {
      mode: 'tank', selectedTank: 'freshwater', aquariumWorkspacePanel: 'decide', tutorialDismissed: true,
      soundEnabled: false, simRunning: false, simTick: 10, simDay: 0, simHour: 12, fishIdentityVersion: 3,
      tankFish: ['guppy', 'nerite'], fishInstanceIds: ['fish-1', 'fish-2'], nextFishInstanceId: 3,
      fishNames: { 'fish-1': 'Azure', 'fish-2': 'Pearl' }, hungerLevels: { 'fish-1': 25, 'fish-2': 25 },
      fishSickness: {}, fishStress: {}, fishCareLog: {}, quarantinedFish: {},
      tankPlants: ['anubias'], plantHealth: { anubias: 90 }, plantBiomass: { anubias: 2 },
      habitatLayout: initialLayout(), habitatUndoLayout: [], habitatStudioOpen: true, habitatViewMode: 'plan',
      selectedHabitatItemId: 'habitat-1', nextHabitatItemId: 3, habitatMissionPanelOpen: false,
      waterChem: { temp: 76, pH: 7, ammonia: 0, nitrite: 0, nitrate: 20, salinity: 0, dissolvedO2: 7, co2: 3 },
      lightsOn: true, equipment: { filter: 0, heater: 0, light: 0, airPump: 0 },
      equipmentCondition: { filter: 100, heater: 100, light: 100, airPump: 100 }, equipmentFaults: {},
      coins: 50, observationNotes: 'Preserve my observation.', ...patch
    } });
    latest = data._aquarium;
    update = values => setData(old => ({ ...old, _aquarium: { ...old._aquarium, ...values } }));
    return React.createElement('div', null, tool.render(makeCtx({ toolData: data, setToolData: setData, announceToSR }, store)), React.createElement('button', { 'data-other-control': 'true' }, 'Another task'));
  }
  await act(async () => root.render(React.createElement(Host))); announceToSR.mockClear();
  return { host, state: () => latest, rawUpdate: values => update(values), announceToSR,
    remove: () => host.querySelector('[data-aquarium-habitat-remove]'), inspector: () => host.querySelector('[data-aquarium-habitat-inspector]'),
    structure: id => host.querySelector('[data-aquarium-habitat-structure="' + id + '"]'),
    transform: id => host.querySelector('[data-aquarium-habitat-transform="' + id + '"]'),
    move: id => host.querySelector('[data-aquarium-habitat-move="' + id + '"]'),
    position: () => host.querySelector('[data-aquarium-habitat-position]'), other: () => host.querySelector('[data-other-control]') };
}
async function activate(button) { await act(async () => { button.focus(); button.click(); }); }

describe('Aquarium Habitat editor accessibility', () => {
  it('removes only the selected structure and hands focus to its next neighbor while preserving undo and saved work', async () => {
    const t = await mount(), button = t.remove();
    expect(button.getAttribute('aria-label')).toBe('Remove Shelter cave');
    await activate(button);
    expect(t.state().habitatLayout).toEqual([initialLayout()[1]]); expect(t.state().habitatUndoLayout).toEqual(initialLayout());
    expect(t.state().selectedHabitatItemId).toBeNull(); expect(document.activeElement).toBe(t.structure('habitat-2'));
    expect(t.state().coins).toBe(50); expect(t.state().observationNotes).toBe('Preserve my observation.');
    expect(t.announceToSR).toHaveBeenCalledOnce(); expect(t.announceToSR).toHaveBeenCalledWith('Shelter cave removed from the habitat.');
    const undo = [...t.host.querySelectorAll('button')].find(n => n.textContent.includes('Undo'));
    await activate(undo); expect(t.state().habitatLayout).toEqual(initialLayout()); expect(document.activeElement).toBe(undo);
  });

  it('falls back to a previous neighbor, then the named inspector when the last structure is removed', async () => {
    const t = await mount({ selectedHabitatItemId: 'habitat-2' }); await activate(t.remove());
    expect(document.activeElement).toBe(t.structure('habitat-1'));
    await activate(t.structure('habitat-1')); await activate(t.remove());
    expect(t.state().habitatLayout).toEqual([]); expect(document.activeElement).toBe(t.inspector());
    expect(t.inspector().getAttribute('aria-label')).toBe('Selected habitat object inspector');
    expect(t.inspector().textContent).toContain('Select a structure');
  });

  it('guards repeated queued removal without overwriting undo or duplicating announcements', async () => {
    const t = await mount(), button = t.remove();
    await act(async () => { button.focus(); button.click(); button.click(); });
    expect(t.state().habitatLayout).toEqual([initialLayout()[1]]); expect(t.state().habitatUndoLayout).toEqual(initialLayout());
    expect(t.announceToSR).toHaveBeenCalledOnce(); expect(document.activeElement).toBe(t.structure('habitat-2'));
  });

  it('keeps keyboard handoff within the originating Aquarium instance', async () => {
    const first = await mount(), second = await mount(); await activate(second.remove());
    expect(document.activeElement).toBe(second.structure('habitat-2')); expect(first.state().habitatLayout).toEqual(initialLayout());
    await activate(second.structure('habitat-2')); await activate(second.remove());
    expect(document.activeElement).toBe(second.inspector()); expect(first.structure('habitat-2')).toBeTruthy();
  });

  it('does not reclaim focus when the user moved elsewhere', async () => {
    const t = await mount(); await act(async () => { const b = t.remove(); b.focus(); b.click(); t.other().focus(); });
    expect(document.activeElement).toBe(t.other()); expect(t.state().habitatLayout).toHaveLength(1);
  });

  it.each([{ aquariumWorkspacePanel: 'observe' }, { selectedTank: 'planted' }, { mode: 'learn' }, { habitatStudioOpen: false }, { selectedHabitatItemId: 'habitat-2' }])('respects a context or selection change during removal: %j', async patch => {
    const t = await mount(); await act(async () => { const b = t.remove(); b.focus(); b.click(); t.rawUpdate(patch); });
    expect(document.activeElement).not.toBe(t.structure('habitat-2')); expect(document.activeElement).not.toBe(t.inspector());
    for (const [key, value] of Object.entries(patch)) expect(t.state()[key]).toBe(value);
  });

  it('does not focus the inspector merely because a saved layout is opened', async () => {
    const outside = document.createElement('button'); document.body.appendChild(outside); outside.focus();
    try { const t = await mount({ selectedHabitatItemId: null }); expect(document.activeElement).toBe(outside); expect(t.inspector()).toBeTruthy(); }
    finally { outside.remove(); }
  });

  it('exposes structure selection state and identifies rotation and sizing directions with associated values', async () => {
    const t = await mount(); expect(t.structure('habitat-1').getAttribute('aria-pressed')).toBe('true');
    expect(t.structure('habitat-2').getAttribute('aria-pressed')).toBe('false');
    await activate(t.structure('habitat-2')); expect(t.structure('habitat-2').getAttribute('aria-pressed')).toBe('true');
    expect(t.structure('habitat-1').getAttribute('aria-pressed')).toBe('false');
    for (const [id, name] of [['rotate-left', 'Rotate left: Rock arch'], ['rotate-right', 'Rotate right: Rock arch'], ['smaller', 'Size: decrease: Rock arch'], ['larger', 'Size: increase: Rock arch']]) {
      const button = t.transform(id); expect(button.getAttribute('aria-label')).toBe(name);
      expect(button.getAttribute('aria-describedby')).toBe(t.position().id);
    }
    await activate(t.transform('rotate-left')); expect(t.state().habitatLayout[1].rotation).toBe(0); expect(t.position().textContent).toContain('rotation 0');
    await activate(t.transform('rotate-right')); expect(t.state().habitatLayout[1].rotation).toBe(15);
    await activate(t.transform('smaller')); expect(t.state().habitatLayout[1].scale).toBeCloseTo(.9); expect(t.position().textContent).toContain('scale 0.90');
    await activate(t.transform('larger')); expect(t.state().habitatLayout[1].scale).toBeCloseTo(1);
    await activate(t.move('left')); expect(t.state().habitatLayout[1].x).toBe(1.5);
    expect(document.activeElement).toBe(t.move('left')); expect(t.move('left').getAttribute('aria-describedby')).toBe(t.position().id);
    expect(t.state().habitatLayout[0]).toEqual(initialLayout()[0]);
  });

  it('keeps selected object descriptions unique across Aquarium instances', async () => {
    const first = await mount(), second = await mount(); expect(first.position().id).not.toBe(second.position().id);
    expect(second.transform('larger').getAttribute('aria-describedby')).toBe(second.position().id);
    await activate(second.transform('larger')); expect(second.state().habitatLayout[0].scale).toBeCloseTo(1.1);
    expect(first.state().habitatLayout[0].scale).toBe(1);
  });

  it('includes visible Focus path and Clear focus wording while toggling the intended ecological path', async () => {
    const t = await mount({ habitatOverlay: 'interactions' }); const paths = [...t.host.querySelectorAll('[data-aquarium-habitat-path]')];
    expect(paths.length).toBeGreaterThan(0); const button = paths[0], id = button.getAttribute('data-aquarium-habitat-path');
    expect(button.getAttribute('aria-label')).toMatch(/^Focus path: /); expect(button.getAttribute('aria-pressed')).toBe('false');
    await activate(button); expect(t.state().habitatSelectedInteractionId).toBe(id); expect(t.state().habitatOverlay).toBe('interactions');
    expect(button.getAttribute('aria-label')).toMatch(/^Clear focus: /); expect(button.getAttribute('aria-pressed')).toBe('true');
    await activate(button); expect(t.state().habitatSelectedInteractionId).toBeNull(); expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(t.state().habitatLayout).toEqual(initialLayout());
  });
});
