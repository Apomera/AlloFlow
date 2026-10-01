import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import { parse } from 'acorn';
import { React, ReactDOMServer, loadTool, makeCtx, newStore, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const source = fs.readFileSync('stem_lab/stem_tool_aquarium.js', 'utf8');
let helperSource, catalogSource;
function walk(node) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'FunctionDeclaration' && node.id?.name === 'getAquariumPlantVisualProfile') helperSource = source.slice(node.start, node.end);
  if (node.type === 'VariableDeclarator' && node.id?.name === 'PLANT_SPECIES') catalogSource = source.slice(node.init.start, node.init.end);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === 'object') walk(value);
  }
}
walk(parse(source, { ecmaVersion: 'latest' }));
if (!helperSource || !catalogSource) throw new Error('Actual Aquarium plant helper and catalog must be present');
const profile = vm.runInNewContext(helperSource + '\ngetAquariumPlantVisualProfile');
const catalog = vm.runInNewContext('(' + catalogSource + ')', { __alloT: (_key, fallback) => fallback });
const entries = Object.entries(catalog).flatMap(([tankId, plants]) => plants.map(plant => ({ ...plant, tankId })));
const plants = [...new Map(entries.map(plant => [plant.id, plant])).values()];

function findElement(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const child of node) { const result = findElement(child, predicate); if (result) return result; }
    return null;
  }
  return predicate(node) ? node : findElement(node.props?.children, predicate);
}
function renderPlant(plant, patch = {}) {
  resetStemLab();
  const tool = loadTool('stem_lab/stem_tool_aquarium.js', 'aquarium'), store = newStore();
  store.toolData = { _aquarium: {
    mode: 'tank', selectedTank: plant.tankId, soundEnabled: false,
    simRunning: false, simTick: 10, simDay: 0, simHour: 12, tutorialDismissed: true,
    fishIdentityVersion: 3, tankFish: [], fishInstanceIds: [], nextFishInstanceId: 1,
    tankPlants: [plant.id], plantBiomass: { [plant.id]: 1 }, plantHealth: { [plant.id]: 80 },
    selectedPlantId: plant.id, ecosystemFocusType: 'plant', ecosystemFocusId: plant.id,
    waterChem: { temp: 76, pH: 7, ammonia: 0, nitrite: 0, nitrate: 20, salinity: 0, dissolvedO2: 7, co2: 3 },
    lightsOn: true, equipment: { filter: 0, heater: 0, light: 0, airPump: 0 },
    equipmentCondition: { filter: 100, heater: 100, light: 100, airPump: 100 }, equipmentFaults: {}, ...patch
  }};
  let element;
  function Capture() { element = tool.render(makeCtx({}, store)); return null; }
  ReactDOMServer.renderToStaticMarkup(React.createElement(Capture));
  const live = findElement(element, item => typeof item.type === 'function' && item.props?.id === 'aquarium-live-tank');
  expect(live).toBeTruthy();
  return { live, store, state: () => store.toolData._aquarium };
}
function inspector(view) {
  const host = document.createElement('div');
  host.innerHTML = ReactDOMServer.renderToStaticMarkup(view.live);
  return { host, detail: host.querySelector('.aquarium-resident-detail') };
}

describe('Aquarium plant growth forms and actual inspector', () => {
  it('covers every active catalog plant with inspectable representative anatomy and honest size limits', () => {
    expect(plants).toHaveLength(14);
    expect(entries).toHaveLength(19);
    for (const plant of plants) {
      const visual = profile(plant.id);
      expect(visual, plant.id).toBeTruthy();
      expect(visual.id).toBe(plant.id);
      expect(visual.label.length).toBeGreaterThan(4);
      expect(visual.identification.length).toBeGreaterThan(30);
      expect(visual.variation).toMatch(/representative/i);
      expect(visual.scaleNote).toMatch(/biomass.*not measured/i);
      expect(visual.scaleNote).toMatch(/zero biomass.*no live foliage/i);
      expect(visual.modelNote).toMatch(/model|simulator/i);
    }
  });
  it('preserves the anatomy distinctions that generic fern, carpet and stem meshes erased', () => {
    expect(profile('java_fern').growthForm).not.toBe(profile('water_wisteria').growthForm);
    expect(profile('java_fern').identification).toMatch(/simple fronds.*horizontal rhizome/i);
    expect(profile('anubias').growthForm).not.toBe(profile('amazon_sword').growthForm);
    expect(profile('anubias').identification).toMatch(/petioles.*rhizome/i);
    expect(profile('hornwort').identification).toMatch(/whorls.*forked.*no true roots/i);
    expect(profile('monte_carlo').growthForm).not.toBe(profile('dwarf_hairgrass').growthForm);
    expect(profile('dwarf_hairgrass').variation).toMatch(/sedge/i);
    expect(profile('red_root_floater').identification).toMatch(/two rows.*floating stems/i);
    expect(profile('chaeto').growthForm).not.toBe(profile('java_moss').growthForm);
    expect(profile('chaeto').identification).toMatch(/without true leaves, stems or roots/i);
    expect(profile('caulerpa').variation).toMatch(/other species.*blades.*beadlike/i);
  });
  it('rejects unknown and inherited IDs and returns independent metadata', () => {
    for (const id of [undefined, null, '', {}, 'missing', '__proto__', 'constructor', 'toString']) expect(profile(id)).toBeNull();
    const changed = profile('java_fern');
    changed.identification = 'A fish with fins'; changed.growthForm = 'fish';
    expect(profile('java_fern').growthForm).toBe('rhizome_fern');
    expect(profile('java_fern').identification).not.toBe(changed.identification);
  });
  it('discloses shared gas estimates for aerial leaves and avoids color-based nutrient diagnosis', () => {
    for (const id of ['duckweed', 'red_root_floater', 'mangrove']) {
      expect(profile(id).modelNote).toMatch(/surface.*air/i);
      expect(profile(id).modelNote).toMatch(/shared simplified plant gas-flow estimates/i);
      expect(profile(id).modelNote).toMatch(/not species-specific measurements/i);
    }
    expect(profile('mangrove').identification).toMatch(/leaves above the water/i);
    expect(profile('rotala').variation).toMatch(/color alone cannot diagnose/i);
    expect(profile('red_root_floater').variation).toMatch(/not a nutrient test/i);
  });
  it('passes real catalog profiles and actual plant state into the scene and selected inspector', () => {
    for (const plant of plants) {
      const view = renderPlant(plant), item = view.live.props.sceneOptions.plants[0];
      expect(item.id).toBe(plant.id);
      expect(item.visualProfile).toEqual(profile(plant.id));
      expect(item.selected).toBe(true); expect(item.biomass).toBe(1); expect(item.health).toBe(80);
      expect(item.maxBiomass).toBe(plant.maxSize);
      const {host, detail} = inspector(view);
      expect(detail).toBeTruthy(); expect(detail.getAttribute('role')).toBe('status');
      expect(detail.textContent).toContain(item.visualProfile.identification);
      expect(detail.textContent).toContain(item.visualProfile.variation);
      expect(host.querySelector('#aquarium-resident-inspect').value).toBe('plant:' + plant.id);
      expect(view.state().simTick).toBe(10);
    }
  }, 20000); // Fourteen real full-tool renders; allow source compilation on a busy worker.
  it('keeps zero biomass inspectable with its model limitation and preserves assigned placement', () => {
    const plant = plants.find(item => item.id === 'mangrove');
    const view = renderPlant(plant, { plantBiomass: { mangrove: 0 }, plantHealth: { mangrove: 37 }, habitatPlantZones: { mangrove: 'background' } });
    const item = view.live.props.sceneOptions.plants[0], before = JSON.parse(JSON.stringify(view.state()));
    expect(item.zone).toBe('background');
    expect(item.visualProfile.growthForm).toBe('emergent_tree');
    expect(item.biomassRatio).toBe(0); expect(item.photosynthesisActive).toBe(false);
    const { detail } = inspector(view);
    expect(detail.textContent).toMatch(/no foliage at this snapshot/i);
    expect(detail.textContent).toContain(item.visualProfile.modelNote);
    expect(detail.textContent).toMatch(/37\/100/);
    expect(view.state()).toEqual(before);
  });
});
