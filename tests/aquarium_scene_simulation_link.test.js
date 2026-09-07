import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  React, ReactDOMServer, loadTool, makeCtx, newStore, resetStemLab
} from './helpers/stem_widgets_smoke_harness.js';

function findElement(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const child of node) { const found = findElement(child, predicate); if (found) return found; }
    return null;
  }
  if (predicate(node)) return node;
  return findElement(node.props?.children, predicate);
}

// Execute the real one-hour button handler and its functional state updater.
// SSR supplies the hooks context, while returning null avoids mounting WebGL
// or testing unrelated presentation. No chemistry equations are reimplemented.
function renderTank(patch = {}) {
  resetStemLab();
  const tool = loadTool('stem_lab/stem_tool_aquarium.js', 'aquarium');
  const store = newStore();
  store.toolData = { _aquarium: {
    mode: 'tank', selectedTank: 'freshwater', soundEnabled: false,
    simRunning: false, simTick: 10, simDay: 0, simHour: 12,
    tutorialDismissed: true, fishIdentityVersion: 3,
    tankFish: [], fishInstanceIds: [], nextFishInstanceId: 1,
    tankPlants: ['anubias'], plantHealth: { anubias: 80 }, plantBiomass: { anubias: 2 },
    waterChem: { temp: 76, pH: 7, ammonia: 0, nitrite: 0, nitrate: 20, salinity: 0, dissolvedO2: 7, co2: 3 },
    lightsOn: true, equipment: { filter: 0, heater: 0, light: 0, airPump: 0 },
    equipmentCondition: { filter: 100, heater: 100, light: 100, airPump: 100 },
    equipmentFaults: {}, ...patch
  } };
  let element;
  function CaptureTool() {
    element = tool.render(makeCtx({}, store));
    return null;
  }
  ReactDOMServer.renderToStaticMarkup(React.createElement(CaptureTool));
  return { element, store };
}

function observeHour(patch = {}) {
  const { element, store } = renderTank(patch);
  const button = findElement(element, item => item.type === 'button' && item.props?.['aria-label'] === 'Pause and observe one aquarium hour');
  expect(button, 'the actual one-hour observation control must be reachable').toBeTruthy();
  button.props.onClick();
  const state = store.toolData._aquarium;
  expect(state.simTick).toBe(11);
  expect(state.simHour).toBe(13);
  expect(state.lastEcosystemExchange).toBeTruthy();
  return state;
}

const photosyntheticColony = {
  selectedTank: 'reef', tankFish: ['stonycoral'], fishInstanceIds: ['fish-8'], nextFishInstanceId: 9,
  tankPlants: [], plantHealth: {}, plantBiomass: {},
  waterChem: { temp: 78, pH: 8.2, ammonia: 0, nitrite: 0, nitrate: 20, salinity: 35, dissolvedO2: 7, co2: 3 }
};

afterEach(() => vi.restoreAllMocks());

describe('Aquarium light output and simulation scene contract', () => {
  it.each([
    ['failed light', { equipmentFaults: { light: { tick: 9, reason: 'Test outage' } } }],
    ['zero-condition light', { equipmentCondition: { filter: 100, heater: 100, light: 0, airPump: 100 } }]
  ])('%s stops low-light plant daytime production and agrees with lights-off oxygen', (_name, disabledLight) => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const off = observeHour({ lightsOn: false });
    const disabled = observeHour(disabledLight);
    const exchange = disabled.lastEcosystemExchange;
    expect(exchange.plants.oxygenProduced).toBe(0);
    expect(exchange.plants.co2Consumed).toBe(0);
    expect(exchange.plants.nitrateConsumed).toBe(0);
    expect(exchange.plants.nightOxygenConsumed).toBeGreaterThan(0);
    expect(exchange.plants.nightOxygenConsumed).toBe(off.lastEcosystemExchange.plants.nightOxygenConsumed);
    expect(disabled.waterChem.dissolvedO2).toBe(off.waterChem.dissolvedO2);
    expect(disabled.waterChem.co2).toBe(off.waterChem.co2);
    expect(disabled.plantBiomass.anubias).toBe(2);
  });

  it.each([
    ['failed light', { equipmentFaults: { light: { tick: 9, reason: 'Test outage' } } }],
    ['zero-condition light', { equipmentCondition: { filter: 100, heater: 100, light: 0, airPump: 100 } }]
  ])('%s stops photosynthetic stock daytime production and agrees with lights-off oxygen', (_name, disabledLight) => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const off = observeHour({ ...photosyntheticColony, lightsOn: false });
    const disabled = observeHour({ ...photosyntheticColony, ...disabledLight });
    const exchange = disabled.lastEcosystemExchange;
    expect(exchange.photosyntheticStock.oxygenProduced).toBe(0);
    expect(exchange.photosyntheticStock.co2Consumed).toBe(0);
    expect(exchange.photosyntheticStock.oxygenConsumed).toBeGreaterThan(0);
    expect(exchange.photosyntheticStock).toEqual(off.lastEcosystemExchange.photosyntheticStock);
    expect(disabled.waterChem.dissolvedO2).toBe(off.waterChem.dissolvedO2);
    expect(disabled.waterChem.co2).toBe(off.waterChem.co2);
  });

  it('keeps working level-zero room light active in the model for plants and photosynthetic stock', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    const plant = observeHour();
    const colony = observeHour(photosyntheticColony);
    expect(plant.equipment.light).toBe(0);
    expect(plant.lastEcosystemExchange.plants.oxygenProduced).toBeGreaterThan(0);
    expect(plant.lastEcosystemExchange.plants.nightOxygenConsumed).toBe(0);
    expect(plant.plantBiomass.anubias).toBeGreaterThan(2);
    expect(colony.equipment.light).toBe(0);
    expect(colony.lastEcosystemExchange.photosyntheticStock.oxygenProduced).toBeGreaterThan(0);
    expect(colony.lastEcosystemExchange.photosyntheticStock.oxygenConsumed).toBe(0);
  });

  it('keeps illness and vitality attached to the selected individual in the actual live inspector', () => {
    const { element, store } = renderTank({
      tankFish: ['guppy', 'guppy'], fishInstanceIds: ['fish-8', 'fish-9'], nextFishInstanceId: 10,
      fishNames: { 'fish-8': 'Pearl', 'fish-9': 'Amber' },
      fishBirthTicks: { 'fish-8': 4, 'fish-9': 1 },
      fishSickness: { 'fish-8': { disease: 'ich', severity: 2, tick: 8 } },
      fishVitality: { 'fish-8': { score: 45, limitingLabel: 'Health', tick: 9 } },
      hungerLevels: { 'fish-8': 68, 'fish-9': 12 },
      fishStress: { 'fish-8': 32, 'fish-9': 5 },
      ecosystemFocusType: 'fish', ecosystemFocusId: 'fish-8'
    });
    const live = findElement(element, item => typeof item.type === 'function' && item.props?.id === 'aquarium-live-tank');
    expect(live).toBeTruthy();
    const sick = live.props.sceneOptions.fish.find(item => item.instanceId === 'fish-8');
    const healthy = live.props.sceneOptions.fish.find(item => item.instanceId === 'fish-9');
    expect(sick).toMatchObject({ selected: true, health: 45, healthKnown: true, vitalityTick: 9, timeInTankHours: 6, hunger: 68, stress: 32 });
    expect(sick.illness).toEqual({ disease: 'ich', severity: 2, sinceTick: 8 });
    expect(healthy.illness).toBeNull();
    expect(healthy.healthKnown).toBe(false);
    const inspect = document.createElement('div');
    inspect.innerHTML = ReactDOMServer.renderToStaticMarkup(live);
    const detail = inspect.querySelector('.aquarium-resident-detail');
    expect(detail.getAttribute('role')).toBe('status');
    const rows = Object.fromEntries([...detail.querySelectorAll('dt')].map(term => [term.textContent, term.nextElementSibling.textContent]));
    expect(rows['Illness record']).toBe('ich · severity 2');
    expect(rows['Last modeled vitality']).toBe('45/100 · model hour 9');
    expect(rows['Time in tank']).toBe('6 model hours');
    expect(inspect.querySelector('#aquarium-resident-inspect').value).toBe('fish:fish-8');

    live.props.onSelectFish('fish-9');
    const next = renderTank(store.toolData._aquarium);
    const nextLive = findElement(next.element, item => typeof item.type === 'function' && item.props?.id === 'aquarium-live-tank');
    inspect.innerHTML = ReactDOMServer.renderToStaticMarkup(nextLive);
    const nextDetail = inspect.querySelector('.aquarium-resident-detail');
    expect(inspect.querySelector('#aquarium-resident-inspect').value).toBe('fish:fish-9');
    expect(nextDetail.textContent).toContain('Amber');
    expect(nextDetail.textContent).toContain('No recorded illness');
    expect(nextDetail.textContent).toContain('Not yet measured');
    expect(nextDetail.textContent).not.toContain('severity 2');
    expect(store.toolData._aquarium.simTick).toBe(10);
  });
  it('shows actual stocked plants and a neutral zero-biomass marker without inventing fallback life', () => {
    function liveFor(patch) {
      const result = renderTank(patch);
      return findElement(result.element, item => typeof item.type === 'function' && item.props?.id === 'aquarium-live-tank');
    }
    for (const selectedTank of ['freshwater', 'reef']) {
      const live = liveFor({ selectedTank, tankFish: [], fishInstanceIds: [], tankPlants: [], plantBiomass: {} });
      expect(live.props.sceneOptions.fish).toHaveLength(0);
      expect(live.props.sceneOptions.plants).toHaveLength(0);
      expect(findElement(live.props.children, item => /^plant-\d+$|^coral-\d+$/.test(String(item.key)))).toBeNull();
      const empty = document.createElement('div');
      empty.innerHTML = ReactDOMServer.renderToStaticMarkup(React.cloneElement(live, { mode: 'illustrated' }));
      expect(empty.querySelector('#aquarium-illustrated-tank')).toBeTruthy();
      expect(empty.querySelectorAll('#aquarium-illustrated-tank [aria-label^="Select planted"]')).toHaveLength(0);
    }
    const zero = liveFor({ plantBiomass: { anubias: 0 } });
    expect(zero.props.sceneOptions.plants[0]).toMatchObject({ id: 'anubias', biomass: 0, biomassRatio: 0 });
    const view = document.createElement('div');
    view.innerHTML = ReactDOMServer.renderToStaticMarkup(React.cloneElement(zero, { mode: 'illustrated' }));
    const marker = view.querySelector('#aquarium-illustrated-tank [aria-label^="Select planted"]');
    expect(marker.textContent).toBe('○');
    expect(marker.getAttribute('aria-label')).toContain('biomass 0.0');
    expect(view.querySelector('option[value="plant:anubias"]')).toBeTruthy();
  });

});
