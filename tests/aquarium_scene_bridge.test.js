import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import { parse } from 'acorn';
const source = fs.readFileSync('stem_lab/stem_tool_aquarium.js', 'utf8');
const names = ['aquariumViewNumber', 'sanitizeAquariumAppearance', 'buildAquariumSceneDynamics'];
const declarations = {};
function walk(node) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'FunctionDeclaration' && names.includes(node.id?.name)) declarations[node.id.name] = source.slice(node.start, node.end);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === 'object') walk(value);
  }
}
walk(parse(source, { ecmaVersion: 2022 }));
const helpers = vm.runInNewContext(names.map(name => declarations[name]).join('\n') + '\n({sanitizeAquariumAppearance,buildAquariumSceneDynamics})');
const copy = value => JSON.parse(JSON.stringify(value));
const makeCatalog = () => ({
  filter: { levels: [{ name: 'Sponge Filter' }, { name: 'HOB Filter' }] },
  heater: { levels: [{ name: 'No Heater' }, { name: 'Preset Heater' }] },
  light: { levels: [{ name: 'Room Light' }, { name: 'LED' }] },
  airPump: { levels: [{ name: 'None', o2Boost: 0 }, { name: 'Small Air Pump', o2Boost: .3 }] }
});
const fixture = () => ({
  simTick: 30, simHour: 12, simDay: 1, lightsOn: true, equipmentCatalog: makeCatalog(),
  equipment: { filter: 0, heater: 0, light: 0, airPump: 0 }, equipmentCondition: {}, equipmentFaults: {},
  waterChem: { dissolvedO2: 7.8, ammonia: .35, nitrite: .15, nitrate: 12, pH: 7, temp: 76 },
  fish: [{ id: 'neon', instanceId: 'a', name: 'First tetra' }, { id: 'neon', instanceId: 'b', name: 'Second tetra' }, { id: 'nerite', instanceId: 'c', name: 'Nerite' }, { id: 'stonycoral', instanceId: 'd', name: 'Coral' }],
  plants: [{ id: 'fern', name: 'Fern', biomass: 2, maxBiomass: 4, health: 80 }]
});

describe('Aquarium simulation to visual-state bridge', () => {
  it('sanitizes saved appearance without accepting chemistry overrides or mutating input', () => {
    const input = { substrate: 'invalid', backdrop: 'black', quality: 'high', lightIntensity: 9, animalScale: 0, showEquipment: false, clarity: 0, dissolvedO2: 0 };
    const before = copy(input);
    expect(copy(helpers.sanitizeAquariumAppearance(input))).toEqual({ substrate: 'sand', backdrop: 'black', quality: 'high', lightIntensity: 1.4, animalScale: .8, showEquipment: false });
    expect(input).toEqual(before);
    expect(helpers.sanitizeAquariumAppearance({ lightIntensity: NaN, animalScale: Infinity }).lightIntensity).toBe(1);
    expect(copy(helpers.sanitizeAquariumAppearance(null))).toEqual({ substrate: 'sand', backdrop: 'depth', quality: 'balanced', lightIntensity: 1, animalScale: 1, showEquipment: true });
  });
  it('distinguishes the real level-zero sponge filter and ambient light from absent equipment', () => {
    const scene = helpers.buildAquariumSceneDynamics(fixture());
    expect(scene.equipment.filter).toMatchObject({ installed: true, on: true, type: 'sponge', label: 'Sponge Filter' });
    expect(scene.equipment.heater.installed).toBe(false);
    expect(scene.equipment.aerator.installed).toBe(false);
    expect(scene.equipment.light.installed).toBe(false);
    expect(scene.model.daylight).toBe(true);
    expect(scene.aeration).toBe(0);
  });
  it('uses actual condition and fault state for equipment output and keeps chemistry measurements separate', () => {
    const input = fixture(); input.equipment.airPump = 1; input.equipment.heater = 1;
    input.equipmentCondition = { airPump: 40, heater: 0 };
    const active = helpers.buildAquariumSceneDynamics(input);
    expect(active.equipment.aerator).toMatchObject({ installed: true, on: true, output: .4 });
    expect(active.aeration).toBeCloseTo(.12);
    expect(active.equipment.heater.on).toBe(false);
    input.equipmentFaults.airPump = { name: 'Airline blocked' };
    const failed = helpers.buildAquariumSceneDynamics(input);
    expect(failed.equipment.aerator).toMatchObject({ installed: true, on: false, output: 0, fault: 'Airline blocked' });
    expect(failed.aeration).toBe(0);
    expect(copy(failed.model.chemistry)).toEqual({ ...input.waterChem, co2: null, salinity: null });
  });
  it('separates viewing light from biological daylight and honors failed lights', () => {
    const input = fixture(); input.viewingLight = 'night';
    let scene = helpers.buildAquariumSceneDynamics(input);
    expect(scene.lighting).toBe('night'); expect(scene.model.daylight).toBe(true);
    input.equipmentCondition.light = 0; input.viewingLight = 'blue';
    scene = helpers.buildAquariumSceneDynamics(input);
    expect(scene.model).toMatchObject({ daylight: false, lightPhase: 'fault' }); expect(scene.lighting).toBe('night');
    input.equipmentCondition.light = 100; input.simHour = 0;
    scene = helpers.buildAquariumSceneDynamics(input);
    expect(scene.model).toMatchObject({ daylight: false, lightPhase: 'night', hour: 0 });
    input.simHour = 12; input.lightsOn = false;
    expect(helpers.buildAquariumSceneDynamics(input).model.lightPhase).toBe('off');
  });
  it('preserves zero hunger, stress and vitality and keeps group movement and locomotion explicit', () => {
    const input = fixture(); input.hungerLevels = { a: 0 }; input.fishStress = { a: 0 }; input.fishVitality = { a: { score: 0, limitingLabel: 'Oxygen' } }; input.fishBirthTicks = { a: 25 };
    const scene = helpers.buildAquariumSceneDynamics(input);
    expect(scene.fish[0]).toMatchObject({ hunger: 0, stress: 0, health: 0, healthKnown: true, timeInTankHours: 5, schooling: true, schoolGroup: 'neon', locomotion: 'swim' });
    expect(scene.fish[1]).toMatchObject({ health: null, healthKnown: false });
    expect(scene.fish[2]).toMatchObject({ schooling: false, locomotion: 'crawl' });
    expect(scene.fish[3].locomotion).toBe('sessile');
    expect(scene.fish.map(item => item.instanceId)).toEqual(['a', 'b', 'c', 'd']);
  });
  it('uses exact nonfish profiles and readable attached or substrate behavior, with a legacy kelp fallback', () => {
    const input = fixture();
    input.fish = [
      { id: 'kelp', instanceId: 'profile-kelp', bodyPlan: 'tetra', visualProfile: { locomotion: 'sessile' }, behaviorMode: 'open-water', behaviorLabel: 'Cruising' },
      { id: 'copepods', instanceId: 'profile-copepods', bodyPlan: 'shrimp', visualProfile: { locomotion: 'swim' }, behaviorMode: 'open-water', behaviorLabel: 'Swimming in the water column' },
      { id: 'nerite', instanceId: 'profile-nerite', visualProfile: { locomotion: 'crawl' }, behaviorMode: 'bottom-foraging', behaviorLabel: 'Cruising' },
      { id: 'kelp', instanceId: 'legacy-kelp', bodyPlan: 'fish', behaviorMode: 'open-water', behaviorLabel: 'Cruising' }
    ];
    const before = copy(input), scene = helpers.buildAquariumSceneDynamics(input);
    expect(scene.fish.map(resident => resident.locomotion)).toEqual(['sessile', 'swim', 'crawl', 'sessile']);
    for (const index of [0, 3]) expect(scene.fish[index]).toMatchObject({ behaviorMode: 'attached', behaviorLabel: 'Attached at its modeled habitat position', schooling: false });
    expect(scene.fish[1]).toMatchObject({ behaviorMode: 'open-water', behaviorLabel: 'Swimming in the water column', schooling: false });
    expect(scene.fish[2]).toMatchObject({ behaviorMode: 'bottom-foraging', behaviorLabel: 'Moving along the substrate near its habitat position', schooling: false });
    expect(input).toEqual(before);
  });
  it('uses the actual biomass index ratio, including zero, without a display-only full-size fallback', () => {
    const input = fixture(); input.plants = [{ id: 'zero', biomass: 0, maxBiomass: 4, health: 80 }, { id: 'half', biomass: 2, maxBiomass: 4, health: 80 }, { id: 'full', biomass: 4, maxBiomass: 4, health: 0 }];
    const scene = helpers.buildAquariumSceneDynamics(input);
    expect(scene.plants.map(plant => plant.biomassRatio)).toEqual([0, .5, 1]);
    expect(scene.plants.map(plant => plant.photosynthesisActive)).toEqual([false, true, false]);
    expect(scene.plants[2].health).toBe(0);
  });
  it('does not invent feeding from hunger and filters a structured event to current unique recipients', () => {
    const input = fixture(); input.hungerLevels = { a: 0 };
    expect(helpers.buildAquariumSceneDynamics(input).feeding).toBeNull();
    input.feedingEvent = { eventId: 'feed-1', tick: 29, foodType: 'live', acceptedIds: ['a', 'a', 'gone', 'b'], scope: 'display' };
    const scene = helpers.buildAquariumSceneDynamics(input);
    expect(scene.feeding).toMatchObject({ eventId: 'feed-1', ageHours: 1, foodType: 'live', acceptedIds: ['a', 'b'] });
    input.feedingEvent.tick = 31;
    expect(helpers.buildAquariumSceneDynamics(input).feeding).toBeNull();
  });
  it('keeps hospital feeding in the record without putting its particles into the display tank', () => {
    const input = fixture(); input.feedingEvent = { eventId: 'feed-hospital', tick: 30, foodType: 'individual', targetId: 'hospital-id', acceptedIds: ['hospital-id'], scope: 'hospital' };
    const scene = helpers.buildAquariumSceneDynamics(input);
    expect(scene.feeding).toBeNull();
    expect(scene.model.feeding).toMatchObject({ eventId: 'feed-hospital', scope: 'hospital', targetId: 'hospital-id', acceptedIds: [] });
  });
  it('keeps every model value unchanged when appearance alone changes', () => {
    const input = fixture(), before = copy(input), normal = helpers.buildAquariumSceneDynamics(input);
    const styled = helpers.buildAquariumSceneDynamics({ ...input, appearance: { substrate: 'dark', backdrop: 'planted', quality: 'low', lightIntensity: .6, animalScale: 1.3, showEquipment: false } });
    for (const key of ['equipment', 'aeration', 'algaeLevel', 'fish', 'plants', 'feeding', 'model', 'lighting']) expect(copy(styled[key])).toEqual(copy(normal[key]));
    expect(input).toEqual(before);
  });
});
