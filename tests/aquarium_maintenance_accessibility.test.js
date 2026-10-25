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
  const addToast = vi.fn(), awardXP = vi.fn(); let latest;
  function Host() {
    const [data, setData] = React.useState({ _aquarium: {
      mode: 'tank', selectedTank: 'freshwater', aquariumWorkspacePanel: 'decide', tutorialDismissed: true,
      soundEnabled: false, soundVolume: 30, simRunning: false, simTick: 10, simDay: 0, simHour: 12,
      fishIdentityVersion: 3, tankFish: [], fishInstanceIds: [], nextFishInstanceId: 1,
      tankPlants: [], plantHealth: {}, plantBiomass: {}, habitatLayout: [],
      waterChem: { temp: 76, pH: 7, ammonia: 0, nitrite: 0, nitrate: 20, salinity: 0, dissolvedO2: 7, co2: 3 },
      lightsOn: true, equipment: { filter: 0, heater: 0, light: 0, airPump: 0 },
      equipmentCondition: { filter: 100, heater: 100, light: 100, airPump: 100 }, equipmentFaults: {},
      coins: 500, observationNotes: 'Keep my observation.', ...patch
    } });
    latest = data._aquarium;
    return tool.render(makeCtx({ toolData: data, setToolData: setData, addToast, awardXP }, store));
  }
  await act(async () => root.render(React.createElement(Host))); addToast.mockClear(); awardXP.mockClear();
  return { host, state: () => latest, addToast, awardXP,
    one: name => host.querySelector('[data-aquarium-' + name + ']'),
    action: type => host.querySelector('[data-aquarium-equipment-action="' + type + '"]'),
    upgrade: type => host.querySelector('[data-aquarium-equipment-upgrade="' + type + '"]') };
}
async function activate(button, repeated = false) { await act(async () => { button.focus(); button.click(); if (repeated) button.click(); }); }

describe('Aquarium maintenance and audio accessibility', () => {
  it('includes visible sound state in names and exposes volume units', async () => {
    const t = await mount(), toggle = t.one('sound-toggle'), volume = t.one('sound-volume');
    expect(toggle.textContent).toContain('Muted'); expect(toggle.getAttribute('aria-label')).toContain('Muted');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(volume.getAttribute('aria-valuetext')).toBe('30 percent');
    expect(volume.getAttribute('aria-label')).toBe('Aquarium sound volume');
    expect(volume.closest('label').textContent).toBe('Volume30%');
    expect(volume.closest('label').querySelector('[aria-hidden="true"]').textContent).toBe('30%');
    await activate(toggle); expect(toggle.textContent).toContain('Sound');
    expect(toggle.getAttribute('aria-label')).toContain('Sound'); expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(t.state().soundEnabled).toBe(true); expect(t.state().soundVolume).toBe(30);
    expect(t.state().coins).toBe(500); expect(t.state().observationNotes).toBe('Keep my observation.');
  });

  it('associates water preview and untreated warning with their controls', async () => {
    const t = await mount({ waterChangeTreated: false, waterChangePercent: 50 });
    const percent = t.one('water-change-percent'), treatment = t.one('water-change-treated');
    const preview = t.host.querySelector('[id="' + percent.getAttribute('aria-describedby') + '"]');
    const warning = t.host.querySelector('[id="' + treatment.getAttribute('aria-describedby') + '"]');
    expect(preview.textContent).toContain('NO3 10.0 ppm'); expect(warning.textContent).toContain('chlorine');
    expect(treatment.closest('label').textContent).toBe('Dechlorinate new water');
    await activate(t.one('water-change-action'));
    expect(t.state().waterChem.nitrate).toBeCloseTo(10); expect(t.state().maintenanceLog).toHaveLength(1);
    expect(t.state().maintenanceLog[0].treated).toBe(false); expect(t.addToast).toHaveBeenCalledTimes(1);
  });

  it('keeps the service action focused after completion and prevents queued/repeated extra service', async () => {
    const t = await mount({ equipmentCondition: { filter: 55, heater: 100, light: 100, airPump: 100 } });
    const button = t.action('filter'); expect(button.textContent).toContain('Clean filter');
    expect(button.getAttribute('aria-label')).toContain('Clean filter'); await activate(button, true);
    expect(t.action('filter')).toBe(button); expect(document.activeElement).toBe(button);
    expect(button.disabled).toBe(false); expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(button.getAttribute('data-aquarium-equipment-complete')).toBe('true');
    expect(button.textContent).toContain('Clean filter: not needed'); expect(button.getAttribute('aria-label')).toContain('Clean filter: not needed');
    expect(t.state().equipmentCondition.filter).toBe(100); expect(t.state().bioColonyLag.maturity).toBeCloseTo(.82);
    expect(t.addToast).toHaveBeenCalledTimes(1); await activate(button);
    expect(t.state().bioColonyLag.maturity).toBeCloseTo(.82); expect(t.addToast).toHaveBeenCalledTimes(1);
    expect(t.state().coins).toBe(500); expect(t.state().observationNotes).toBe('Keep my observation.');
  });

  it('retains repair focus through the service stage without duplicate charges or toasts', async () => {
    const t = await mount({ equipmentFaults: { filter: { tick: 0, reason: 'blocked' } }, equipmentCondition: { filter: 0, heater: 100, light: 100, airPump: 100 } });
    const button = t.action('filter'); expect(button.getAttribute('aria-label')).toContain('Repair (5)');
    await activate(button, true); expect(t.action('filter')).toBe(button); expect(document.activeElement).toBe(button);
    expect(t.state().coins).toBe(495); expect(t.state().equipmentFaults.filter).toBeUndefined();
    expect(t.state().equipmentCondition.filter).toBe(75); expect(button.textContent).toContain('Clean filter');
    expect(button.getAttribute('aria-disabled')).toBe('false'); expect(t.addToast).toHaveBeenCalledTimes(1);
    await activate(button); expect(t.state().equipmentCondition.filter).toBe(100);
    expect(t.state().coins).toBe(495); expect(document.activeElement).toBe(button);
  });

  it('explains an unaffordable repair while keeping its target available to keyboard focus', async () => {
    const t = await mount({ coins: 0, equipmentFaults: { heater: { tick: 0, reason: 'broken' } } }), button = t.action('heater');
    expect(button.disabled).toBe(false); expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(button.getAttribute('aria-label')).toContain('costs 5 coins'); await activate(button);
    expect(document.activeElement).toBe(button); expect(t.state().equipmentFaults.heater.reason).toBe('broken');
    expect(t.state().coins).toBe(0); expect(t.addToast).toHaveBeenCalledTimes(1);
  });

  it('keeps the final upgrade focused and makes further activation a no-op', async () => {
    const t = await mount({ equipment: { filter: 2, heater: 0, light: 0, airPump: 0 } }), button = t.upgrade('filter');
    expect(button.getAttribute('aria-label')).toContain('Upgrade: Sump System (150)');
    await activate(button, true); expect(document.activeElement).toBe(button); expect(t.upgrade('filter')).toBe(button);
    expect(button.getAttribute('aria-disabled')).toBe('true'); expect(button.disabled).toBe(false);
    expect(button.textContent).toContain('Maximum'); expect(button.getAttribute('aria-label')).toContain('Maximum');
    expect(t.state().equipment.filter).toBe(3); expect(t.state().coins).toBe(350); expect(t.addToast).toHaveBeenCalledTimes(1);
    await activate(button); expect(t.state().coins).toBe(350); expect(t.addToast).toHaveBeenCalledTimes(1);
  });

  it('retains a valid labelled history target when collapsed and uses an empty-state group', async () => {
    const t = await mount(), toggle = t.one('maintenance-history-toggle'), history = t.one('maintenance-history');
    expect(history.id).toBe(toggle.getAttribute('aria-controls')); expect(history.hidden).toBe(true);
    expect(toggle.getAttribute('aria-expanded')).toBe('false'); expect(history.getAttribute('role')).toBe('group');
    expect(history.textContent).toContain('No water changes recorded yet.'); await activate(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true'); expect(history.hidden).toBe(false);
    expect(document.activeElement).toBe(toggle); await activate(toggle); expect(history.hidden).toBe(true);
  });

  it('keeps native labels, descriptions, and history controls scoped to each mounted tool', async () => {
    const first = await mount({ waterChangeTreated: false }), second = await mount({ waterChangeTreated: false });
    for (const name of ['water-change-percent', 'water-change-treated']) {
      const a = first.one(name), b = second.one(name);
      expect(a.id).not.toBe(b.id);
      expect(first.host.querySelector('label[for="' + a.id + '"]')).toBeTruthy();
      expect(second.host.querySelector('label[for="' + b.id + '"]')).toBeTruthy();
      expect(a.getAttribute('aria-describedby')).not.toBe(b.getAttribute('aria-describedby'));
      expect(first.host.querySelector('[id="' + a.getAttribute('aria-describedby') + '"]')).toBeTruthy();
      expect(second.host.querySelector('[id="' + b.getAttribute('aria-describedby') + '"]')).toBeTruthy();
    }
    const a = first.one('maintenance-history'), b = second.one('maintenance-history');
    expect(a.id).not.toBe(b.id); expect(a.id).toBe(first.one('maintenance-history-toggle').getAttribute('aria-controls'));
    expect(b.id).toBe(second.one('maintenance-history-toggle').getAttribute('aria-controls'));
    await activate(second.one('maintenance-history-toggle')); expect(a.hidden).toBe(true); expect(b.hidden).toBe(false);
  });

  it('describes healthy saved equipment as not needing service without implying an action was performed', async () => {
    const t = await mount({ equipmentCondition: { filter: 96, heater: 100, light: 100, airPump: 100 } }), button = t.action('filter');
    expect(button.textContent).toContain('Clean filter: not needed');
    expect(button.getAttribute('aria-label')).toContain('output is at 96 percent; service is not needed.');
    await activate(button); expect(t.state().equipmentCondition.filter).toBe(96); expect(t.addToast).not.toHaveBeenCalled();
  });

  it('provides readable recorded history, schedule units, and a recommended action whose visible wording matches its name', async () => {
    const t = await mount({ simTick: 200, lastWaterChangeTick: 0, maintenanceLog: [{ tick: 0, day: 0, hour: 0, percent: 25, treated: true, reason: 'Routine maintenance', before: { ammonia: .2, nitrate: 40 }, after: { ammonia: .15, nitrate: 30 } }] });
    const history = t.one('maintenance-history'), button = t.one('water-change-recommended');
    expect(history.getAttribute('role')).toBe('list'); expect(history.querySelectorAll('[role="listitem"]')).toHaveLength(1);
    expect(history.textContent).toContain('NH3 0.20→0.15'); expect(history.textContent).toContain('Routine maintenance');
    expect(button.getAttribute('aria-label')).toBe('Do recommended 25% water change');
    const schedule = [...t.host.querySelectorAll('[role="progressbar"]')].find(el => el.getAttribute('aria-label') === 'Weekly water change schedule');
    expect(schedule.getAttribute('aria-valuetext')).toBe('Weekly service overdue by 32 aquarium hours');
    await activate(button); expect(t.state().waterChem.nitrate).toBeCloseTo(15); expect(t.state().maintenanceLog).toHaveLength(2);
    expect(document.activeElement).toBe(button); expect(t.state().observationNotes).toBe('Keep my observation.');
  });
});
