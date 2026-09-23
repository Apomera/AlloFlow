import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
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
// The same file the harness loads, for the few rules only checkable as source.
const source = fs.readFileSync('stem_lab/stem_tool_aquarium.js', 'utf8');
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

describe('Aquarium breeding at stocking capacity', () => {
  // A 20 US gal tank carries a load of 10; guppies weigh 1 each. Gestation is
  // already complete (started 21 hours before the observed hour), the water is
  // clean and there are no predators, so every fry survives the survival roll.
  const guppies = count => ({
    tankFish: Array(count).fill('guppy'),
    fishInstanceIds: Array.from({ length: count }, (_, i) => 'fish-' + (i + 1)),
    nextFishInstanceId: count + 1,
    hungerLevels: Object.fromEntries(Array.from({ length: count }, (_, i) => ['fish-' + (i + 1), 20])),
    fishStress: {},
    aquariumTankConfig: { tankId: 'freshwater', volumeGallons: 20, shape: 'standard' },
    breedingState: { guppy: { stage: 'gestating', startTick: -10, fryCount: 5 } }
  });
  const messages = state => state.eventLog.map(entry => entry.msg);

  it('reports fry with no room as a capacity outcome, never as a death', () => {
    const state = observeHour(guppies(10));
    // Previously these fell through to "did not survive - too many predators
    // or poor conditions" in a clean, predator-free tank.
    expect(messages(state).some(msg => /did not survive/.test(msg))).toBe(false);
    expect(messages(state).some(msg => /^5 Guppy fry survived but had no room: the tank is at its stocking capacity/.test(msg))).toBe(true);
    // And it names what a breeder does next.
    expect(messages(state).some(msg => /larger tank \(Tank & plant size\) or rehomes fry/.test(msg))).toBe(true);
    // The stocking cap itself still holds.
    expect(state.tankFish).toHaveLength(10);
  });

  it('adds the fry that fit and reports only the rest as having no room', () => {
    const state = observeHour(guppies(8));
    expect(state.tankFish).toHaveLength(10);
    expect(messages(state).some(msg => /^3 Guppy fry survived but had no room/.test(msg))).toBe(true);
    expect(messages(state).some(msg => /did not survive/.test(msg))).toBe(false);
  });

  // The breeding panel's readiness chips, read from the real rendered tool.
  const chips = element => {
    const found = [];
    findElement(element, item => { if (item.type === 'span' && /^\S (Pop|Calm|Stress|Fed|Hungry|Room|Tank full|Water)$/.test(String(item.props?.children))) found.push(String(item.props.children).slice(2)); return false; });
    return found;
  };
  const fullNote = element => findElement(element, item => item.type === 'div' && item.props?.role === 'note' && /stocking capacity, so no new broods start/.test(String(item.props?.children)));

  it('shows a full tank as the reason breeding has stopped', () => {
    // The sim refuses to start a brood without room for one more fish, but the
    // panel only listed Pop / Calm / Fed - three green ticks on a tank that
    // could never breed again.
    const full = renderTank({ ...guppies(10), breedingState: {} }).element;
    expect(chips(full)).toContain('Tank full');
    expect(chips(full)).not.toContain('Room');
    expect(fullNote(full)).toBeTruthy();

    const roomy = renderTank({ ...guppies(4), breedingState: {} }).element;
    expect(chips(roomy)).toContain('Room');
    expect(fullNote(roomy)).toBe(null);
  });

  it('counts the load the way the simulation does, leaving quarantined fish out', () => {
    // Ten guppies fill a 20 US gal tank - but two in the hospital tank do not
    // count toward the display load in the tick, so there IS room to breed.
    const quarantined = { 'fish-9': { sinceTick: 1, reason: 'Observation' }, 'fish-10': { sinceTick: 1, reason: 'Observation' } };
    const element = renderTank({ ...guppies(10), breedingState: {}, quarantinedFish: quarantined }).element;
    expect(chips(element)).toContain('Room');
    expect(fullNote(element)).toBe(null);
    // The rule it mirrors: the tick excludes quarantined fish from its load.
    expect(source).toContain('if (_quarantinedFish[finalFishInstanceIds[index]]) return s;');
  });

  it('shows dirty water as a breeding blocker, as the simulation enforces', () => {
    const dirty = renderTank({ ...guppies(4), breedingState: {}, waterChem: { temp: 76, pH: 7, ammonia: 0.8, nitrite: 0, nitrate: 20, salinity: 0, dissolvedO2: 7, co2: 3 } }).element;
    const clean = renderTank({ ...guppies(4), breedingState: {} }).element;
    expect(chips(dirty).filter(c => c === 'Water')).toHaveLength(1);
    // The same label either way; what differs is the tick or cross before it.
    const glyph = element => { let g = null; findElement(element, item => { if (item.type === 'span' && / Water$/.test(String(item.props?.children))) { g = String(item.props.children)[0]; return true; } return false; }); return g; };
    expect(glyph(clean)).toBe(String.fromCharCode(0x2714));
    expect(glyph(dirty)).toBe(String.fromCharCode(0x2718));
  });

  it('says nothing about capacity when every fry fits', () => {
    const state = observeHour(guppies(4));
    expect(state.tankFish).toHaveLength(9);
    expect(messages(state).some(msg => /had no room/.test(msg))).toBe(false);
  });
});

describe('Aquarium water change dechlorination', () => {
  // Drives the real controls in the rendered tool: the checkbox, the manual
  // water button and the recommended one. No chemistry is reimplemented here.
  const byLabel = (element, label) => findElement(element, item => item.type === 'button' && item.props?.['aria-label'] === label);
  const recommended = element => findElement(element, item => item.type === 'button' && /^Perform recommended \d+ percent water change$/.test(item.props?.['aria-label'] || ''));
  const checkbox = element => findElement(element, item => item.type === 'input' && item.props?.id === 'aquarium-water-change-treated');
  const press = (patch, find) => {
    const { element, store } = renderTank(patch);
    const button = find(element);
    expect(button, 'water change control').toBeTruthy();
    button.props.onClick();
    return store.toolData._aquarium;
  };

  it('treats replacement water by default, leaving the colony untouched', () => {
    const { element } = renderTank({ waterChangePercent: 50 });
    // Existing saves have no setting at all; that must read as treated.
    expect(checkbox(element).props.checked).toBe(true);
    const after = press({ waterChangePercent: 50 }, el => byLabel(el, 'Perform 50 percent water change'));
    expect(after.bioColonyLag ?? null).toBe(null);
    expect(after.maintenanceLog.at(-1).treated).toBe(true);
    expect(after.eventLog.at(-1).msg).not.toMatch(/chlorine/i);
  });

  it('kills part of the colony when untreated water goes in, scaled by how much was replaced', () => {
    const big = press({ waterChangePercent: 50, waterChangeTreated: false }, el => byLabel(el, 'Perform 50 percent water change'));
    const small = press({ waterChangePercent: 10, waterChangeTreated: false }, el => byLabel(el, 'Perform 10 percent water change'));
    expect(big.bioColonyLag.maturity).toBeCloseTo(0.4, 6);
    expect(small.bioColonyLag.maturity).toBeCloseTo(0.88, 6);
    // A bigger untreated change does more harm than a small one.
    expect(big.bioColonyLag.maturity).toBeLessThan(small.bioColonyLag.maturity);
    expect(big.maintenanceLog.at(-1).treated).toBe(false);
    expect(big.eventLog.at(-1).msg).toMatch(/Untreated tap water: chlorine killed part of the filter colony/);
    // The dilution itself still happens; only the biology is set back.
    expect(big.waterChem.nitrate).toBeCloseTo(10, 6);

    // The service history must show WHICH change went wrong, in words rather
    // than colour alone, so a learner can find the mistake afterwards.
    const history = renderTank({ ...big, maintenanceHistoryExpanded: true }).element;
    const rows = [];
    findElement(history, item => { if (item.type === 'span' && /% change/.test(String(item.props?.children))) rows.push(String(item.props.children)); return false; });
    expect(rows).toContain('50% change (untreated)');
    // An entry saved before this field existed is not labelled either way.
    const legacy = renderTank({ maintenanceLog: [{ tick: 1, day: 0, hour: 9, percent: 25, reason: 'Manual 25% service.' }], maintenanceHistoryExpanded: true }).element;
    const legacyRows = [];
    findElement(legacy, item => { if (item.type === 'span' && /% change/.test(String(item.props?.children))) legacyRows.push(String(item.props.children)); return false; });
    expect(legacyRows).toEqual(['25% change']);
  });

  it('never lets the recommended action skip the dechlorinator', () => {
    // The recommendation is best practice, whatever the manual toggle says.
    const after = press({ waterChangeTreated: false, lastWaterChangeTick: 0, simTick: 400 }, recommended);
    expect(after.bioColonyLag ?? null).toBe(null);
    expect(after.maintenanceLog.at(-1).treated).toBe(true);
  });

  it('warns the learner beside the control when dechlorination is switched off', () => {
    const { element, store } = renderTank({});
    checkbox(element).props.onChange({ target: { checked: false } });
    expect(store.toolData._aquarium.waterChangeTreated).toBe(false);
    const off = renderTank({ waterChangeTreated: false }).element;
    expect(checkbox(off).props.checked).toBe(false);
    const note = findElement(off, item => item.type === 'span' && item.props?.role === 'note' && /chlorine that kills filter bacteria/.test(String(item.props?.children)));
    expect(note).toBeTruthy();
    // And no warning while it is on.
    const on = renderTank({}).element;
    expect(findElement(on, item => item.type === 'span' && item.props?.role === 'note' && /chlorine/.test(String(item.props?.children)))).toBe(null);
  });
});

describe('Aquarium filter colony after a tank change', () => {
  it('records how far the colony is behind when the tank grows, and not when it shrinks or holds', () => {
    // A colony is sized to the bioload it has been processing. Moving it into a
    // bigger tank leaves it briefly under-provisioned.
    const grown = resize({}, 40);
    expect(grown.bioColonyLag).toMatchObject({ fromGallons: 20, toGallons: 40 });
    expect(grown.bioColonyLag.maturity).toBeCloseTo(0.5, 6);

    // A bigger jump leaves it further behind.
    const bigger = resize({}, 80);
    expect(bigger.bioColonyLag.maturity).toBeLessThan(grown.bioColonyLag.maturity);

    // Shrinking does not strand the colony - it is already big enough.
    const shrunk = resize({ aquariumTankConfig: { tankId: 'freshwater', volumeGallons: 40, shape: 'standard' } }, 20);
    expect(shrunk.bioColonyLag).toBe(null);
  });

  it('tells the learner what is happening, in the language the curriculum uses', () => {
    const grown = resize({}, 55);
    expect(grown.aquariumSizingNotice).toMatch(/filter colony/i);
    expect(grown.aquariumSizingNotice).toMatch(/catches up|catch up/i);
    // It must say what the simulation actually does, and for how long: run through
    // the real hourly handler, ammonia keeps falling (more slowly) rather than
    // rising, and the colony recovers within about a day of sim time.
    expect(grown.aquariumSizingNotice).toMatch(/fall more slowly/i);
    expect(grown.aquariumSizingNotice).toMatch(/about a day/i);
    // A same-size or shrinking change says nothing about a colony.
    const shrunk = resize({ aquariumTankConfig: { tankId: 'freshwater', volumeGallons: 40, shape: 'standard' } }, 20);
    expect(shrunk.aquariumSizingNotice).not.toMatch(/filter colony/i);
  });

  it('never derates the colony far enough to reach the ammonia harm threshold', () => {
    // The upgrade must teach, not punish: the floor keeps the transient well
    // under the 2 ppm where fish health starts to suffer.
    const worst = resize({}, 200);
    expect(worst.bioColonyLag.maturity).toBeGreaterThanOrEqual(0.15);
  });
});

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
