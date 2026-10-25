import { afterEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounts = [];
afterEach(() => { for (const { root, host } of mounts.splice(0)) { act(() => root.unmount()); host.remove(); } vi.restoreAllMocks(); });
async function mount(patch = {}) {
  resetStemLab();
  const tool = loadTool(process.env.AQUARIUM_SOURCE || 'stem_lab/stem_tool_aquarium.js', 'aquarium'), store = newStore();
  const host = document.createElement('div'); document.body.appendChild(host); const root = ReactDOMClient.createRoot(host); mounts.push({ root, host });
  const addToast = vi.fn(), awardXP = vi.fn(); let latest, update;
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
      coins: 50, observationNotes: 'Keep my observation.', ...patch
    } });
    latest = data._aquarium; update = values => setData(old => ({ ...old, _aquarium: { ...old._aquarium, ...values } }));
    return React.createElement('div', null, tool.render(makeCtx({ toolData: data, setToolData: setData, addToast, awardXP }, store)), React.createElement('button', { 'data-other-control': 'true' }, 'Another task'));
  }
  await act(async () => root.render(React.createElement(Host))); addToast.mockClear(); awardXP.mockClear();
  return { host, state: () => latest, update: values => act(async () => update(values)), rawUpdate: values => update(values), addToast, awardXP,
    food: kind => host.querySelector('[data-aquarium-feed-food="' + kind + '"]'),
    report: () => host.querySelector('[data-aquarium-feeding-report]'), close: () => host.querySelector('[data-aquarium-feeding-report-close]'),
    feedback: () => host.querySelector('[data-aquarium-feeding-feedback]'), care: () => host.querySelector('[data-aquarium-care-actions]'),
    feed: id => host.querySelector('[data-aquarium-care-feed="' + id + '"]'), treat: id => host.querySelector('[data-aquarium-care-treat="' + id + '"]'),
    hospital: id => host.querySelector('[data-aquarium-care-hospital="' + id + '"]'), other: () => host.querySelector('[data-other-control]') };
}
async function activate(button) { await act(async () => { button.focus(); button.click(); }); }
const savedReport = { fishCount: 1, avgHungerDrop: 20, ammoniaAdded: .03, tip: 'Compare pre- and post-feeding values.' };

describe('Aquarium care report and completed actions', () => {
  it('reports bulk feeding once outside controls while preserving model outcomes and saved work', async () => {
    const t = await mount(); await activate(t.food('flake'));
    const report = t.report(), title = t.host.querySelector('[id="' + report.getAttribute('aria-labelledby') + '"]');
    expect(report.tagName).toBe('SECTION'); expect(title.textContent).toBe('Feeding Report');
    expect(t.feedback().getAttribute('role')).toBe('status'); expect(t.feedback().textContent).toContain('Feeding report updated.');
    expect(t.feedback().textContent).toContain('NH3:'); expect(t.feedback().querySelector('button')).toBeNull();
    expect(t.report().querySelector('[role="status"]')).toBeNull(); expect(t.addToast).not.toHaveBeenCalled();
    expect(t.state().hungerLevels).toEqual({ 'fish-1': 0, 'fish-2': 25 });
    expect(t.state().waterChem.ammonia).toBeGreaterThan(0); expect(t.state().feedingLog.fishCount).toBe(2);
    expect(t.state().coins).toBe(50); expect(t.state().observationNotes).toBe('Keep my observation.'); expect(t.awardXP).not.toHaveBeenCalled();
    const previous = t.feedback().firstChild; await activate(t.food('flake'));
    expect(t.feedback().firstChild).not.toBe(previous); expect(t.state().aquariumFeedingEvent.sequence).toBe(2);
  });

  it.each(['flake', 'live'])('returns report Close to the %s opener', async kind => {
    const t = await mount(); const opener = t.food(kind); await activate(opener); await activate(t.close());
    expect(t.report()).toBeNull(); expect(document.activeElement).toBe(opener); expect(t.state().feedingLog).toBeNull();
  });

  it('closes a saved report to its own care section and keeps report IDs unique across instances', async () => {
    const first = await mount({ feedingLog: savedReport }), second = await mount({ feedingLog: savedReport });
    expect(first.report().getAttribute('aria-labelledby')).not.toBe(second.report().getAttribute('aria-labelledby'));
    await activate(second.close()); expect(document.activeElement).toBe(second.care()); expect(first.report()).toBeTruthy(); expect(second.report()).toBeNull();
  });

  it('honors focus ownership and workspace changes when a report is dismissed', async () => {
    const t = await mount(); await activate(t.food('flake'));
    await act(async () => { t.close().focus(); t.close().click(); t.other().focus(); });
    expect(document.activeElement).toBe(t.other());
    await activate(t.food('live'));
    await act(async () => { t.close().focus(); t.close().click(); t.rawUpdate({ aquariumWorkspacePanel: 'observe' }); });
    expect(document.activeElement).not.toBe(t.food('live')); expect(t.state().aquariumWorkspacePanel).toBe('observe');
  });

  it('keeps completed individual feeding focused and rejects repeat activation without duplicate feedback', async () => {
    const t = await mount(); const button = t.feed('fish-1'); await activate(button);
    expect(document.activeElement).toBe(button); expect(button.disabled).toBe(false); expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(button.textContent).toBe('Full'); expect(button.getAttribute('aria-label')).toContain('Azure is full');
    expect(t.state().hungerLevels['fish-1']).toBe(0); expect(t.state().waterChem.ammonia).toBeCloseTo(.02);
    const record = JSON.stringify(t.state().aquariumFeedingEvent), chemistry = t.state().waterChem.ammonia;
    await activate(button); expect(JSON.stringify(t.state().aquariumFeedingEvent)).toBe(record); expect(t.state().waterChem.ammonia).toBe(chemistry);
    expect(t.state().fishCareLog['fish-1']).toHaveLength(1); expect(t.addToast).toHaveBeenCalledTimes(1); expect(t.feedback().textContent).toBe('');
  });

  it('guards queued duplicate individual feeds while allowing a later deliberate feeding', async () => {
    const t = await mount({ hungerLevels: { 'fish-1': 50, 'fish-2': 60 } }), button = t.feed('fish-1');
    await act(async () => { button.focus(); button.click(); button.click(); });
    expect(t.state().hungerLevels['fish-1']).toBe(20); expect(t.state().fishCareLog['fish-1']).toHaveLength(1);
    await activate(button); expect(t.state().hungerLevels['fish-1']).toBe(0); expect(t.state().fishCareLog['fish-1']).toHaveLength(2);
  });

  it('keeps a cured Treat action focused and prevents it from treating unrelated fish', async () => {
    const t = await mount({ fishSickness: { 'fish-1': { disease: 'ich', severity: 1 }, 'fish-2': { disease: 'velvet', severity: 2 } } });
    const button = t.treat('fish-1'); await act(async () => { button.focus(); button.click(); button.click(); });
    expect(document.activeElement).toBe(button); expect(button.disabled).toBe(false); expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(button.textContent).toBe('Treated'); expect(button.getAttribute('aria-label')).toBe('Treated: Azure');
    expect(t.state().fishSickness['fish-1']).toBeUndefined(); expect(t.state().fishSickness['fish-2'].disease).toBe('velvet');
    expect(t.state().waterChem.ammonia).toBeCloseTo(.1); expect(t.state().bioColonyLag.maturity).toBeCloseTo(.92);
    await activate(button); expect(t.state().fishSickness['fish-2'].disease).toBe('velvet'); expect(t.state().waterChem.ammonia).toBeCloseTo(.1);
    expect(t.state().fishCareLog['fish-1']).toHaveLength(1); expect(t.addToast).toHaveBeenCalledTimes(1); expect(t.feedback().textContent).toBe(''); expect(t.state().coins).toBe(50);
  });

  it('names hospital actions through their visible state and exposes isolation state', async () => {
    const t = await mount(); const button = t.hospital('fish-1');
    expect(button.textContent).toBe('Isolate'); expect(button.getAttribute('aria-label')).toContain('Isolate Azure'); expect(button.getAttribute('aria-pressed')).toBe('false');
    await activate(button); expect(button.textContent).toBe('Release'); expect(button.getAttribute('aria-label')).toContain('Release Azure'); expect(button.getAttribute('aria-pressed')).toBe('true');
    await t.update({ fishSickness: { 'fish-1': { disease: 'ich', severity: 1 } } });
    expect(button.textContent).toBe('Hospital'); expect(button.getAttribute('aria-label')).toContain('Hospital: Azure');
    await activate(button); expect(t.state().quarantinedFish['fish-1']).toBeTruthy();
  });

  it('keeps a capacity-blocked hospital return focused and explains its unavailable state', async () => {
    const ids = Array.from({ length: 12 }, (_, i) => 'fish-' + (i + 1));
    const t = await mount({ tankFish: ids.map(() => 'guppy'), fishInstanceIds: ids, nextFishInstanceId: 13 });
    const button = t.hospital('fish-1'); await activate(button);
    expect(document.activeElement).toBe(button); expect(button.disabled).toBe(false); expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(button.textContent).toBe('Resize to release'); expect(button.getAttribute('aria-label')).toContain('Resize to release Azure'); expect(button.getAttribute('aria-label')).toContain('capacity');
    const isolation = JSON.stringify(t.state().quarantinedFish); await activate(button);
    expect(JSON.stringify(t.state().quarantinedFish)).toBe(isolation); expect(t.state().fishCareLog['fish-1']).toHaveLength(1);
  });

  it('derives lights names from their visible state and preserves written work', async () => {
    const t = await mount(), lights = t.host.querySelector('[data-aquarium-care-lights]');
    expect(lights.getAttribute('aria-label')).toBeNull(); expect(lights.textContent).toContain('Lights On'); expect(lights.getAttribute('aria-pressed')).toBe('true');
    await activate(lights); expect(lights.textContent).toContain('Lights Off'); expect(lights.getAttribute('aria-pressed')).toBe('false');
    expect(t.state().lightsOn).toBe(false); expect(t.state().observationNotes).toBe('Keep my observation.'); expect(t.state().coins).toBe(50);
  });

  it('clears completed-care presentation when a new tank reuses an organism identity', async () => {
    const t = await mount({ fishSickness: { 'fish-1': { disease: 'ich', severity: 1 } } });
    await activate(t.treat('fish-1')); await activate(t.food('flake'));
    expect(t.treat('fish-1').textContent).toBe('Treated'); expect(t.feedback().textContent).not.toBe('');
    await t.update({ selectedTank: 'planted', feedingLog: null, fishSickness: {}, waterChem: { ...t.state().waterChem, ammonia: 0 } });
    expect(t.treat('fish-1')).toBeNull(); expect(t.feedback().textContent).toBe('');
    expect(t.state().coins).toBe(50); expect(t.state().observationNotes).toBe('Keep my observation.');
  });
});
