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


const copy = value => JSON.parse(JSON.stringify(value));
const sample = { tankFish: ['guppy'], fishInstanceIds: ['fish-1'], nextFishInstanceId: 2, hungerLevels: { 'fish-1': 80 }, fishStress: { 'fish-1': 0 }, fishVitality: { 'fish-1': { score: 90, tick: 10 } }, plantSizeEdits: {}, equipment: { filter: 0, heater: 0, light: 0, airPump: 1 }, aquariumTankConfig: { tankId: 'freshwater', volumeGallons: 20, shape: 'standard' }, ecosystemPrediction: { oxygen: 'rise', nitrate: 'fall', vitality: 'stable' } };
function tank(patch = {}) {
  const view = renderTank({ ...sample, ...patch });
  view.live = findElement(view.element, item => typeof item.type === 'function' && item.props?.id === 'aquarium-live-tank');
  expect(view.live).toBeTruthy();
  view.state = () => view.store.toolData._aquarium;
  return view;
}
const observe = patch => observeHour({ ...sample, ...patch });
function resize(patch, volumeGallons, shape = 'standard') {
  const view = tank(patch);
  expect(view.live.props.onResizeTank({ volumeGallons, shape })).toBe(true);
  return view.state();
}
function act(patch, name) {
  const view = tank(patch);
  const button = findElement(view.element, item => item.type === 'button' && item.props?.onClick?.name === name);
  expect(button, name).toBeTruthy(); button.props.onClick(); return view.state();
}
const contributions = [['fish','ammoniaProduced'], ['fish','oxygenConsumed'], ['fish','co2Released'], ['plants','oxygenProduced'], ['plants','co2Consumed'], ['plants','nitrateConsumed'], ['equipment','oxygenAdded'], ['equipment','co2Removed']];
afterEach(() => vi.restoreAllMocks());

describe('Actual Aquarium sizing controls and simulation', () => {
  it('pauses capacity edits while retaining present readings, residents, health and clock', () => {
    const view = tank({ simRunning: true }), before = copy(view.state());
    expect(view.live.props.onResizeTank({ volumeGallons: 40, shape: 'standard' })).toBe(true);
    const after = view.state();
    for (const key of ['waterChem','tankFish','fishInstanceIds','fishVitality','plantHealth','plantBiomass','hungerLevels','simTick','simDay','simHour']) expect(after[key], key).toEqual(before[key]);
    expect(after.simRunning).toBe(false); expect(after.aquariumModelEditRevision).toBe(1);
    expect(after.aquariumSizingNotice).toMatch(/concentrations.*retained/i);
    expect(after.eventLog.at(-1).msg).toContain('40 US gal');
    const next = tank(after).live.props;
    expect(next.sceneOptions.model).toMatchObject({ volumeGallons: 40, capacity: 20 });
    expect(next.tankConfiguration.size).toBe(40);
  });
  it('doubling volume halves biological, plant, pump and real Feed concentration terms', () => {
    vi.spyOn(Math, 'random').mockReturnValue(.99);
    const small = observe({}), largerState = resize({}, 40), large = observe(largerState);
    for (const [group,key] of contributions) {
      expect(small.lastEcosystemExchange[group][key], group+'.'+key).toBeGreaterThan(0);
      expect(large.lastEcosystemExchange[group][key]).toBeCloseTo(small.lastEcosystemExchange[group][key]/2, 2);
    }
    for (const feedName of ['feedFish', 'feedLive']) {
    const feed20 = act({}, feedName), feed40 = act(largerState, feedName);
    expect(feed20.feedingLog.ammoniaAdded).toBeGreaterThan(0);
    expect(feed40.feedingLog.ammoniaAdded).toBeCloseTo(feed20.feedingLog.ammoniaAdded/2, 8);
    expect(feed40.waterChem.ammonia).toBeCloseTo(feed20.waterChem.ammonia/2, 8);
    expect(feed40.hungerLevels['fish-1']).toBe(feed20.hungerLevels['fish-1']);
    }
    expect(large.lastEcosystemExchange.model.volumeScale).toBe(.5);
  });
  it('equal-volume shapes change atmosphere exchange, preserving biological and pump terms', () => {
    vi.spyOn(Math, 'random').mockReturnValue(.99);
    const standard = observe({}), long = observe(resize({},20,'long')), tall = observe(resize({},20,'tall'));
    for (const variant of [long,tall]) for (const [group,key] of contributions) expect(variant.lastEcosystemExchange[group][key]).toBe(standard.lastEcosystemExchange[group][key]);
    expect(long.lastEcosystemExchange.atmosphere.oxygenExchange).toBeGreaterThan(standard.lastEcosystemExchange.atmosphere.oxygenExchange);
    expect(tall.lastEcosystemExchange.atmosphere.oxygenExchange).toBeLessThan(standard.lastEcosystemExchange.atmosphere.oxygenExchange);
    const dimensions = shape => tank(resize({},20,shape)).live.props.tankConfiguration.dimensions;
    const enclosed = d => d.width*d.height*d.depth;
    expect(enclosed(dimensions('long'))).toBeCloseTo(enclosed(dimensions('tall')),8);
  });
  it('uses 5 and 200 gallon endpoints without the former volume plateau', () => {
    vi.spyOn(Math,'random').mockReturnValue(.99);
    const empty = {tankFish:[],fishInstanceIds:[],hungerLevels:{},fishVitality:{}};
    const five = observe(resize(empty,5)), huge = observe(resize(empty,200));
    expect(five.lastEcosystemExchange.model.volumeScale).toBe(4);
    expect(huge.lastEcosystemExchange.model.volumeScale).toBe(.1);
    expect(five.lastEcosystemExchange.equipment.oxygenAdded/huge.lastEcosystemExchange.equipment.oxygenAdded).toBeCloseTo(40,6);
  });
  it('enforces the resident catalog minimum and keeps invalid or unchanged edits inert', () => {
    const view = tank({tankFish:['angel']}), before = copy(view.state());
    const minimum = view.live.props.sceneOptions.model.stockMinimumGallons;
    expect(minimum).toBeGreaterThan(5);
    for (const request of [{volumeGallons:minimum-.5,shape:'standard'},{volumeGallons:4,shape:'standard'},{volumeGallons:201,shape:'standard'},{volumeGallons:NaN,shape:'standard'},{volumeGallons:40,shape:'bad'}]) {
      expect(view.live.props.onResizeTank(request)).toBe(false); expect(view.state()).toEqual(before);
    }
    const plain = tank(), original = copy(plain.state());
    expect(plain.live.props.onResizeTank({volumeGallons:20,shape:'standard'})).toBe(false);
    for (const [id,size] of [['anubias',-1],['anubias',Infinity],['anubias',999],['missing-plant',1],['anubias',2]]) expect(plain.live.props.onResizePlant(id,size)).toBe(false);
    expect(plain.state()).toEqual(original);
  });
  it('plant size controls drive real hourly flows and regrowth is not a second manual edit', () => {
    vi.spyOn(Math,'random').mockReturnValue(.99);
    const initial = act({},'markEcosystemBaseline'), zero = tank(initial);
    const max = zero.live.props.sceneOptions.plants.find(p=>p.id==='anubias').maxBiomass;
    expect(max).toBeGreaterThan(2);
    expect(zero.live.props.onResizePlant('anubias',0)).toBe(true);
    const edit = copy(zero.state());
    expect(edit.simTick).toBe(10); expect(edit.simRunning).toBe(false); expect(edit.plantHealth.anubias).toBe(80);
    expect(edit.plantSizeEdits).toEqual({anubias:1}); expect(edit.ecosystemBaseline).toEqual(initial.ecosystemBaseline);
    expect(tank(edit).live.props.sceneOptions.plants[0].biomassRatio).toBe(0);
    const maximum = tank(initial); expect(maximum.live.props.onResizePlant('anubias',max)).toBe(true);
    const emptyHour = observe(edit), fullHour = observe(maximum.state());
    expect(emptyHour.lastEcosystemExchange.plants.oxygenProduced).toBe(0);
    expect(emptyHour.lastEcosystemExchange.plants.nitrateConsumed).toBe(0);
    expect(fullHour.lastEcosystemExchange.plants.oxygenProduced).toBeGreaterThan(0);
    expect(fullHour.lastEcosystemExchange.plants.nitrateConsumed).toBeGreaterThan(0);
    expect(emptyHour.plantBiomass.anubias).toBeGreaterThan(0);
    expect(emptyHour.plantSizeEdits).toEqual({anubias:1}); expect(emptyHour.aquariumModelEditRevision).toBe(1);
    expect(observe(initial).plantSizeEdits).toEqual({});
  });
  it('preserves size-aware baselines and visibly clears an incompatible legacy baseline', () => {
    const initial = act({},'markEcosystemBaseline');
    expect(initial.ecosystemBaseline.factors).toMatchObject({tankVolume:20,tankShape:'standard',plantSizeEdits:{}});
    expect(resize(initial,40).ecosystemBaseline).toEqual(initial.ecosystemBaseline);
    const legacy = resize({ecosystemBaseline:{tick:3,factors:{plants:['anubias']}}},40);
    expect(legacy.ecosystemBaseline).toBeNull(); expect(legacy.aquariumSizingNotice).toMatch(/older.*baseline.*cleared.*new baseline/i);
  });
  it('configured volume changes both the stock-card capacity preview and the actual add guard', () => {
    const stock = {tankFish:Array(10).fill('guppy'),fishInstanceIds:Array.from({length:10},(_,i)=>'fish-'+(i+1)),nextFishInstanceId:11};
    const full = tank(stock), before = copy(full.state());
    const card = view => findElement(view.element, item => item.type==='button' && String(item.props?.['aria-label']).startsWith('Add Guppy.'));
    expect(full.live.props.sceneOptions.model.capacity).toBe(10);
    expect(card(full).props.disabled).toBe(true);
    card(full).props.onClick(); // even direct invocation must enforce the capacity guard
    expect(full.state()).toEqual(before);
    const expanded = tank(resize(full.state(),40));
    expect(expanded.live.props.sceneOptions.model.capacity).toBe(20);
    expect(card(expanded).props.disabled).toBe(false);
    card(expanded).props.onClick();
    expect(expanded.state().tankFish).toHaveLength(11);
    expect(expanded.state().fishInstanceIds.at(-1)).toBe('fish-11');
    expect(expanded.state().aquariumTankConfig.volumeGallons).toBe(40);
    expect(expanded.state().simTick).toBe(10);
  });
  it('renders species diagnostics and representative scope for the actual selected resident', () => {
    const examples = [
      {id:'neon', label:'Neon tetra', anatomy:'Blue lateral stripe; red on the rear half.'},
      {id:'cory', label:'Corydoras catfish', anatomy:'Arched back, two rows of flank armor, mottling and short mouth barbels.', variation:'Representative Corydoras group.'}
    ];
    for (const example of examples) {
      const view = tank({tankFish:[example.id],ecosystemFocusType:'fish',ecosystemFocusId:'fish-1'});
      const host = document.createElement('div');
      host.innerHTML = ReactDOMServer.renderToStaticMarkup(view.live);
      const detail = host.querySelector('.aquarium-resident-detail');
      expect(detail).toBeTruthy();
      expect(detail.getAttribute('role')).toBe('status');
      expect(detail.textContent).toContain(example.label);
      expect(detail.textContent).toContain(example.anatomy);
      if (example.variation) expect(detail.textContent).toContain(example.variation);
      expect(host.querySelector('#aquarium-resident-inspect').value).toBe('fish:fish-1');
      expect(view.state().simTick).toBe(10);
    }
  });
  it('explains the catalog minimum before Add and retains the same minimum in the handler', () => {
    const empty = {tankFish:[],fishInstanceIds:[],hungerLevels:{},fishVitality:{}};
    const small = tank(resize(empty,5)), before = copy(small.state());
    const card = findElement(small.element, item=>item.type==='button' && String(item.props?.['aria-label']).startsWith('Add Angelfish.'));
    expect(card).toBeTruthy();
    expect(card.props.disabled).toBe(true);
    expect(card.props['aria-label']).toMatch(/20 US gal/i);
    card.props.onClick();
    expect(small.state()).toEqual(before);
  });
  it('keeps a hospital resident isolated after shrinking below its minimum and permits release after enlargement', () => {
    const initial = tank({tankFish:['angel'],fishNames:{'fish-1':'Atlas'},fishSickness:{},quarantinedFish:{}});
    const hospitalAction = view => findElement(view.element, item => item.type==='button' && typeof item.props?.['aria-pressed']==='boolean' && /Atlas/.test(String(item.props?.['aria-label'])) && /hospital|release/i.test(String(item.props?.['aria-label'])));
    const move = hospitalAction(initial);
    expect(move).toBeTruthy();
    move.props.onClick();
    expect(initial.state().quarantinedFish['fish-1']).toBeTruthy();
    expect(initial.state().fishInstanceIds).toEqual(['fish-1']);
    const small = tank(resize(initial.state(),5));
    expect(small.live.props.sceneOptions.fish).toHaveLength(0);
    expect(small.live.props.sceneOptions.model.stockMinimumGallons).toBe(5);
    const blocked = hospitalAction(small), before = copy(small.state());
    expect(blocked).toBeTruthy();
    expect(blocked.props.disabled).toBe(true);
    expect(blocked.props['aria-label']).toMatch(/20 US gal/i);
    blocked.props.onClick(); // protect state even if an old UI invokes the disabled action
    expect(small.state()).toEqual(before);
    const enlarged = tank(resize(small.state(),20));
    const release = hospitalAction(enlarged);
    expect(release).toBeTruthy();
    expect(release.props.disabled).not.toBe(true);
    release.props.onClick();
    expect(enlarged.state().quarantinedFish['fish-1']).toBeUndefined();
    expect(enlarged.state().tankFish).toEqual(['angel']);
    expect(enlarged.state().fishInstanceIds).toEqual(['fish-1']);
    expect(enlarged.state().fishNames['fish-1']).toBe('Atlas');
    expect(enlarged.state().simTick).toBe(10);
    expect(enlarged.state().simHour).toBe(12);
    expect(enlarged.state().simDay).toBe(0);
    const final = tank(enlarged.state());
    expect(final.live.props.sceneOptions.fish).toHaveLength(1);
    expect(final.live.props.sceneOptions.fish[0].instanceId).toBe('fish-1');
  });
  it('checks projected display bioload on hospital return while excluding other isolated residents', () => {
    const initial = tank({tankFish:Array(7).fill('guppy').concat(['angel','angel']),fishInstanceIds:Array.from({length:9},(_,i)=>'fish-'+(i+1)),nextFishInstanceId:10,fishNames:{'fish-8':'Atlas','fish-9':'Nova'},fishSickness:{},quarantinedFish:{'fish-9':{sinceTick:1,reason:'Observation'}},aquariumTankConfig:{tankId:'freshwater',volumeGallons:40,shape:'standard'}});
    const atlasAction = view => findElement(view.element, item=>item.type==='button' && typeof item.props?.['aria-pressed']==='boolean' && /Atlas/.test(String(item.props?.['aria-label'])) && /hospital|release/i.test(String(item.props?.['aria-label'])));
    atlasAction(initial).props.onClick();
    const smaller = tank(resize(initial.state(),20)), before = copy(smaller.state());
    expect(smaller.live.props.sceneOptions.fish).toHaveLength(7);
    const blocked = atlasAction(smaller);
    expect(blocked.props.disabled).toBe(true);
    expect(blocked.props['aria-label']).toMatch(/capacity|bioload|load/i);
    blocked.props.onClick();
    expect(smaller.state()).toEqual(before);
    // 22 gallons permits projected display load 7 + 4 = 11. Nova's isolated
    // load must not be added to this return calculation.
    const enough = tank(resize(smaller.state(),22));
    expect(atlasAction(enough).props.disabled).not.toBe(true);
    atlasAction(enough).props.onClick();
    expect(enough.state().quarantinedFish['fish-8']).toBeUndefined();
    expect(enough.state().quarantinedFish['fish-9']).toEqual(before.quarantinedFish['fish-9']);
    expect(enough.state().fishInstanceIds).toEqual(before.fishInstanceIds);
    expect(enough.state().simTick).toBe(10);
    expect(tank(enough.state()).live.props.sceneOptions.fish).toHaveLength(8);
  });
});
