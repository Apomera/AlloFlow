import { afterEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mounted = [];

afterEach(() => {
  for (const { root, host } of mounted.splice(0)) { act(() => root.unmount()); host.remove(); }
  vi.restoreAllMocks();
});

async function mount(patch = {}, translatedClose) {
  resetStemLab();
  const tool = loadTool(process.env.AQUARIUM_SOURCE || 'stem_lab/stem_tool_aquarium.js', 'aquarium');
  const store = newStore(), host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  mounted.push({ root, host });
  let latest, update;
  function Harness() {
    const [data, setData] = React.useState({ _aquarium: {
      mode: 'marine', selectedTank: 'freshwater', soundEnabled: false, simRunning: false,
      tutorialDismissed: true, fishIdentityVersion: 3, tankFish: [], fishInstanceIds: [],
      nextFishInstanceId: 1, tankPlants: [], equipment: {}, habitatLayout: [],
      waterChem: { temp: 76, pH: 7, ammonia: 0, nitrite: 0, nitrate: 10, salinity: 0, dissolvedO2: 7, co2: 3 },
      observationNotes: 'Keep my observation.', coins: 42, ...patch
    } });
    latest = data._aquarium;
    update = values => setData(old => ({ ...old, _aquarium: { ...old._aquarium, ...values } }));
    return tool.render(makeCtx({ toolData: data, setToolData: setData,
      t: (key, fallback) => key === 'stem.aquarium.close' && translatedClose ? translatedClose : fallback || key
    }, store));
  }
  await act(async () => root.render(React.createElement(Harness)));
  return { host, state: () => latest, update: async values => act(async () => update(values)),
    zones: () => [...host.querySelectorAll('[data-aquarium-zone-toggle]')],
    species: () => [...host.querySelectorAll('[data-aquarium-marine-species]')],
    card: () => host.querySelector('[data-aquarium-species-card]'),
    close: () => host.querySelector('[data-aquarium-species-close]') };
}

async function click(control) { await act(async () => { control.focus(); control.click(); }); }
const panel = toggle => document.getElementById(toggle.getAttribute('aria-controls'));

describe('Aquarium Marine Science disclosure and species focus', () => {
  it('exposes named native zone buttons controlling persistent sibling panels, without nested interactive controls', async () => {
    const t = await mount(), zones = t.zones();
    expect(zones).toHaveLength(5);
    for (const toggle of zones) {
      expect(toggle.tagName).toBe('BUTTON'); expect(toggle.type).toBe('button');
      expect(toggle.textContent.trim().length).toBeGreaterThan(10);
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
      const controlled = panel(toggle);
      expect(controlled).toBeTruthy(); expect(controlled.hidden).toBe(true);
      expect(controlled.parentElement).toBe(toggle.parentElement);
      expect(controlled.previousElementSibling).toBe(toggle);
      expect(toggle.parentElement.getAttribute('aria-labelledby')).toBe(toggle.id);
      expect(toggle.querySelector('button, [role="button"]')).toBeNull();
      expect(controlled.querySelector('button')).toBeNull();
    }
    expect(t.host.querySelector('[data-aquarium-ocean-zones] [role="button"]')).toBeNull();
  });

  it('opens and closes each zone, retaining its panel identity and recording each explored zone once', async () => {
    const t = await mount();
    for (const toggle of t.zones()) {
      const original = panel(toggle), id = toggle.dataset.aquariumZoneToggle;
      await click(toggle);
      expect(toggle.getAttribute('aria-expanded')).toBe('true'); expect(original.hidden).toBe(false);
      expect(t.state().selectedZone).toBe(id);
      await click(toggle);
      expect(panel(toggle)).toBe(original); expect(original.hidden).toBe(true);
      expect(t.state().selectedZone).toBeNull(); expect(t.species()).toHaveLength(0);
      await click(toggle);
      expect(t.state().zonesExplored.filter(zone => zone === id)).toHaveLength(1);
    }
    expect(t.state().zonesExplored).toHaveLength(5);
    expect(t.state().coins).toBe(42); expect(t.state().observationNotes).toBe('Keep my observation.');
  });

  it('switches zones without leaving collapsed species in the tab order or changing unrelated records', async () => {
    const t = await mount({ speciesClicked: ['previous-observation'] }), [first, second] = t.zones();
    await click(first); const original = panel(first);
    expect(t.species().length).toBeGreaterThan(0);
    await click(second);
    expect(panel(first)).toBe(original); expect(original.hidden).toBe(true);
    expect(original.querySelector('button')).toBeNull(); expect(panel(second).hidden).toBe(false);
    expect(document.activeElement).toBe(second);
    expect(t.state().speciesClicked).toEqual(['previous-observation']);
  });

  it('opens a species and anatomy without collapsing its zone or duplicating progress', async () => {
    const t = await mount(), toggle = t.zones()[0];
    await click(toggle); const opener = t.species()[0], id = opener.dataset.aquariumMarineSpecies;
    await click(opener);
    expect(t.state().selectedSpecies).toBe(id); expect(t.state().viewingAnatomy).toBe(id);
    expect(t.state().selectedZone).toBe(toggle.dataset.aquariumZoneToggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(t.card().getAttribute('aria-labelledby')).toBe(t.card().querySelector('h4').id);
    expect(t.close().getAttribute('aria-label')).toBe('Close: ' + t.card().querySelector('h4').textContent);
    await click(opener);
    expect(t.state().speciesClicked).toEqual([id]);
  });

  it('closes the species card with a localized visible name and returns focus to its species opener', async () => {
    const t = await mount({}, 'Fermer');
    await click(t.zones()[0]); const opener = t.species()[0], id = opener.dataset.aquariumMarineSpecies;
    await click(opener);
    expect(t.close().textContent).toBe('Fermer'); expect(t.close().getAttribute('aria-label')).toMatch(/^Fermer: /);
    await click(t.close());
    expect(t.card()).toBeNull(); expect(t.state().selectedSpecies).toBeNull();
    expect(document.activeElement).toBe(opener);
    expect(t.state().viewingAnatomy).toBe(id); expect(t.state().speciesClicked).toEqual([id]);
  });

  it('returns focus to the original zone when its species opener is no longer rendered', async () => {
    const t = await mount(), [first, second] = t.zones();
    await click(first); await click(t.species()[0]); await click(second);
    expect(panel(first).querySelector('button')).toBeNull();
    await click(t.close());
    expect(document.activeElement).toBe(first);
    expect(t.state().selectedZone).toBe(second.dataset.aquariumZoneToggle);
    expect(panel(second).hidden).toBe(false);
  });

  it('does not steal focus when the learner moves elsewhere before the close update finishes', async () => {
    const t = await mount(), [first, second] = t.zones();
    await click(first); await click(t.species()[0]);
    await act(async () => { const close = t.close(); close.focus(); close.click(); second.focus(); });
    expect(t.card()).toBeNull(); expect(document.activeElement).toBe(second);
  });

  it('keeps IDs unique across instances and stable across mode changes', async () => {
    const a = await mount(), firstIds = a.zones().map(toggle => toggle.id), b = await mount();
    const all = [...a.zones(), ...b.zones()];
    expect(new Set(all.map(toggle => toggle.id)).size).toBe(10);
    for (const toggle of all) expect(toggle.closest('[data-aquarium-ocean-zones]').contains(panel(toggle))).toBe(true);
    await a.update({ mode: 'quiz' }); expect(a.zones()).toHaveLength(0);
    await a.update({ mode: 'marine' }); expect(a.zones().map(toggle => toggle.id)).toEqual(firstIds);
    expect(b.zones()).toHaveLength(5);
  });
});
