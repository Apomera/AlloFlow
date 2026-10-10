import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { React, loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE_PATH = 'stem_lab/stem_tool_watercycle.js';
const BASE = {
  wcMode: 'explorer', wcSection: 'conditions', wcFocusMode: false,
  wcClimateLabOpen: true, wcLandLabOpen: true, journeyView: '2d', activeStage: 'infiltration',
  climSolar: 1, climTemp: 20, climWind: 1,
  landRainIntensity: 55, landSaturation: 45, landCover: 'grass',
  landPermeability: 'medium', landSlope: 'moderate',
};
const INPUTS = ['landRainIntensity', 'landSaturation', 'landCover', 'landPermeability', 'landSlope'];
const fixtures = [];

beforeAll(() => {
  resetStemLab();
  loadTool(SOURCE_PATH, 'waterCycle');
}, 60000);

afterEach(() => {
  fixtures.splice(0).forEach(node => node.remove());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

function rendered(state = {}, overrides = {}) {
  const data = freeze({ ...BASE, ...state });
  const container = document.createElement('div');
  container.innerHTML = renderTool('waterCycle', { waterCycle: data }, overrides);
  const land = container.querySelector('[data-watercycle-land]');
  const cutaway = land?.querySelector('[data-land-cutaway="true"]');
  expect(land, 'registered native Land-Surface Scenario Lab').not.toBeNull();
  expect(cutaway, 'native land cutaway').not.toBeNull();
  return { data, container, land, cutaway };
}

function cue(result, name) {
  const node = result.cutaway.querySelector('[data-cutaway-cue="' + name + '"]');
  expect(node, name + ' cue').not.toBeNull();
  return node;
}

// Pin the pre-cutaway independent teaching equations, including their nonzero
// no-rain readings. A scene change must not silently create a water budget.
function originalIndices(data) {
  const rain = data.landRainIntensity / 100;
  const wet = data.landSaturation / 100;
  const permeability = { high: 0.15, medium: 0.5, low: 0.85 }[data.landPermeability];
  const slope = { gentle: 0.15, moderate: 0.45, steep: 0.8 }[data.landSlope];
  const cover = { forest: 0.15, grass: 0.35, urban: 0.9 }[data.landCover];
  return {
    runoff: Math.round(100 * (0.30 * rain + 0.25 * wet + 0.18 * cover + 0.15 * slope + 0.12 * permeability)),
    infiltration: Math.round(100 * (0.32 * (1 - wet) + 0.28 * (1 - permeability) + 0.20 * (1 - cover) + 0.12 * (1 - slope) + 0.08 * (1 - rain))),
  };
}

function expectReadings(result) {
  const expected = originalIndices(result.data);
  expect(window.WaterCycleInvestigationKernel.land(result.data)).toEqual(expected);
  for (const pathway of ['runoff', 'infiltration']) {
    const card = result.land.querySelector('[data-land-reading="' + pathway + '"]');
    expect(card, pathway + ' native result card').not.toBeNull();
    const score = card.querySelector('[data-land-score]');
    expect(Number(score.textContent.match(/(\d+)\s*\/\s*100/)[1])).toBe(expected[pathway]);
  }
  return expected;
}

// Capture the actual registered renderer's element props while still rendering
// them with React. Calling these native callbacks exercises the production
// navigation path without a substitute scene component or source extraction.
function interactive(state = {}) {
  let toolData;
  const callbacks = new Map();
  const writes = [];
  const awardXP = vi.fn(), celebrate = vi.fn();
  const observedReact = {
    ...React,
    createElement(type, props, ...children) {
      if (type === 'button' && props?.['data-cutaway-input']) callbacks.set(props['data-cutaway-input'], props);
      if (type === 'button' && props?.['data-cutaway-return']) callbacks.set('return', props);
      return React.createElement(type, props, ...children);
    },
  };
  const result = rendered(state, {
    React: observedReact, awardXP, celebrate,
    setToolData(updater) {
      const before = toolData || { waterCycle: { ...BASE, ...state } };
      toolData = typeof updater === 'function' ? updater(before) : updater;
      writes.push(toolData);
    },
  });
  toolData = { waterCycle: result.data };
  writes.length = 0;
  return {
    ...result, callbacks, writes, awardXP, celebrate,
    get state() { return toolData.waterCycle; },
    click(key) {
      const props = callbacks.get(key);
      expect(props, key + ' native callback').toBeDefined();
      expect(props.type).toBe('button');
      expect(typeof props.onClick).toBe('function');
      props.onClick();
    },
  };
}

describe('Water Cycle native land cutaway', () => {
  it('puts the cutaway and both live readings before the controls in the Land lab workbench', () => {
    const result = rendered();
    const workbench = result.land.querySelector('.wc-land-workbench');
    expect(Array.from(workbench.children).map(node => node.className)).toEqual(['wc-land-evidence', 'wc-land-controls-stack']);
    expect(workbench.firstElementChild.contains(result.cutaway)).toBe(true);
    expect(workbench.firstElementChild.querySelectorAll('[data-land-reading]')).toHaveLength(2);
    expect(workbench.lastElementChild.querySelector('#wc-land-rain')).not.toBeNull();
    expectReadings(result);
  });

  it('makes stronger native rainfall produce more rain marks without changing soil or slope', () => {
    const light = rendered({ landRainIntensity: 10 });
    const heavy = rendered({ landRainIntensity: 95 });
    const lightRain = cue(light, 'rain'), heavyRain = cue(heavy, 'rain');
    expect(Number(heavyRain.dataset.rainMarks)).toBeGreaterThan(Number(lightRain.dataset.rainMarks));
    expect(lightRain.children.length).toBe(Number(lightRain.dataset.rainMarks));
    expect(heavyRain.children.length).toBe(Number(heavyRain.dataset.rainMarks));
    expect(cue(light, 'surface').getAttribute('d')).toBe(cue(heavy, 'surface').getAttribute('d'));
    expect(cue(light, 'moisture').getAttribute('opacity')).toBe(cue(heavy, 'moisture').getAttribute('opacity'));
    expect(heavy.cutaway.dataset.cutawayRain).toBe('95');
  });

  it('shows native initial soil saturation through moisture and pore water while retaining pore size', () => {
    const dry = rendered({ landSaturation: 0 });
    const wet = rendered({ landSaturation: 90 });
    expect(Number(cue(dry, 'moisture').getAttribute('opacity'))).toBe(0);
    expect(Number(cue(wet, 'moisture').getAttribute('opacity'))).toBeCloseTo(0.18);
    expect(cue(wet, 'moisture').dataset.soilWetness).toBe('90');
    const geometry = result => Array.from(result.cutaway.querySelectorAll('[data-cutaway-pore]')).map(pore =>
      Array.from(pore.querySelectorAll('circle')).map(circle => ['cx', 'cy', 'r'].map(name => circle.getAttribute(name))));
    expect(geometry(dry)).toEqual(geometry(wet));
    for (const circle of wet.cutaway.querySelectorAll('.wc-lc-pore-water')) expect(Number(circle.getAttribute('opacity'))).toBe(0.9);
    for (const circle of dry.cutaway.querySelectorAll('.wc-lc-pore-water')) expect(Number(circle.getAttribute('opacity'))).toBe(0);
    expect(wet.cutaway.dataset.cutawaySaturation).toBe('90');
  });

  it('changes visible land cover for forest, grass, and urban inputs', () => {
    const scenes = ['forest', 'grass', 'urban'].map(landCover => {
      const result = rendered({ landCover });
      const cover = Array.from(result.cutaway.querySelectorAll('[data-cutaway-cover-cue]'));
      expect(cover.length).toBeGreaterThan(0);
      expect(new Set(cover.map(node => node.dataset.cutawayCoverCue))).toEqual(new Set([landCover]));
      expect(result.cutaway.dataset.cutawayCover).toBe(landCover);
      expect(result.cutaway.querySelectorAll('.wc-lc-roots').length > 0).toBe(landCover !== 'urban');
      expect(!!result.cutaway.querySelector('.wc-lc-gap')).toBe(landCover === 'urban');
      return cover.map(node => node.outerHTML).join('');
    });
    expect(new Set(scenes).size).toBe(3);
  });

  it('changes permeability passage marks while keeping all seven grains and six pores fixed', () => {
    const scenes = ['low', 'medium', 'high'].map(landPermeability => rendered({ landPermeability }));
    expect(scenes.map(result => cue(result, 'permeability').getAttribute('stroke-dasharray'))).toEqual(['3 9', '7 5', null]);
    const geometry = result => {
      const grains = result.cutaway.querySelectorAll('[data-cutaway-grain]');
      const pores = result.cutaway.querySelectorAll('[data-cutaway-pore]');
      expect(grains).toHaveLength(7);
      expect(pores).toHaveLength(6);
      return Array.from([...grains, ...pores]).map(node => node.outerHTML);
    };
    expect(geometry(scenes[0])).toEqual(geometry(scenes[1]));
    expect(geometry(scenes[1])).toEqual(geometry(scenes[2]));
    expect(scenes.map(result => cue(result, 'permeability').getAttribute('d'))).toEqual(Array(3).fill(cue(scenes[0], 'permeability').getAttribute('d')));
    expect(scenes.map(result => result.cutaway.dataset.cutawayPermeability)).toEqual(['low', 'medium', 'high']);
  });

  it('tilts the surface and downhill runoff direction when the native slope changes', () => {
    const scenes = ['gentle', 'moderate', 'steep'].map(landSlope => rendered({ landSlope }));
    expect(new Set(scenes.map(result => cue(result, 'surface').getAttribute('d'))).size).toBe(3);
    expect(new Set(scenes.map(result => cue(result, 'runoff').getAttribute('d'))).size).toBe(3);
    const directions = scenes.map(result => {
      const points = cue(result, 'runoff').getAttribute('d').match(/^M([\d.]+) ([\d.]+)L([\d.]+) ([\d.]+)/);
      expect(points).not.toBeNull();
      expect(Number(points[3])).toBeGreaterThan(Number(points[1]));
      return (Number(points[4]) - Number(points[2])) / (Number(points[3]) - Number(points[1]));
    });
    expect(directions.every(direction => direction > 0)).toBe(true);
    expect(directions[1]).toBeGreaterThan(directions[0]);
    expect(directions[2]).toBeGreaterThan(directions[1]);
    expect(scenes.map(result => result.cutaway.dataset.cutawaySlope)).toEqual(['gentle', 'moderate', 'steep']);
  });

  it('removes new-rain marks and pathway arrows at zero rain while preserving wet soil and original indices', () => {
    const result = rendered({ landRainIntensity: 0, landSaturation: 85, landCover: 'urban', landPermeability: 'low', landSlope: 'steep' });
    const rain = cue(result, 'rain');
    expect(rain.dataset.rainMarks).toBe('0');
    expect(rain.children).toHaveLength(0);
    expect(result.cutaway.querySelector('[data-cutaway-cue="runoff"]')).toBeNull();
    expect(result.cutaway.querySelector('[data-cutaway-cue="infiltration"]')).toBeNull();
    expect(Number(cue(result, 'moisture').getAttribute('opacity'))).toBeCloseTo(0.17);
    expect(result.cutaway.querySelector('[data-cutaway-weather="no-rain"]').textContent).toMatch(/existing soil wetness remains/i);
    const indices = expectReadings(result);
    expect(indices.runoff).toBeGreaterThan(0);
    expect(indices.infiltration).toBeGreaterThan(0);
    expect(indices.runoff + indices.infiltration).not.toBe(100);
  });

  it('keeps the original formula and rendered values across contrasting settings and numeric endpoints', () => {
    for (const state of [
      {},
      { landRainIntensity: 100, landSaturation: 100, landCover: 'urban', landPermeability: 'low', landSlope: 'steep' },
      { landRainIntensity: 0, landSaturation: 0, landCover: 'forest', landPermeability: 'high', landSlope: 'gentle' },
      { landRainIntensity: 25, landSaturation: 20, landCover: 'forest', landPermeability: 'high', landSlope: 'gentle' },
    ]) expectReadings(rendered(state));
  });

  it('retains equal-size illustrative arrows as the independent readings change', () => {
    const low = rendered({ landSaturation: 10, landCover: 'forest', landPermeability: 'high' });
    const high = rendered({ landSaturation: 90, landCover: 'urban', landPermeability: 'low' });
    expect(expectReadings(low)).not.toEqual(expectReadings(high));
    for (const pathway of ['runoff', 'infiltration']) expect(cue(low, pathway).getAttribute('d')).toBe(cue(high, pathway).getAttribute('d'));
    const scope = low.cutaway.querySelector('#wcLandCutawayScope').textContent;
    expect(scope).toMatch(/arrows identify directions/i);
    expect(scope).toMatch(/independent indices do not measure water amounts or groundwater recharge/i);
    expect(low.land.textContent).toContain('Infiltration does not automatically become groundwater recharge.');
  });

  it('makes all five native feature buttons open controls using only navigation fields and preserve learner records', () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn());
    const protectedState = freeze({
      wcScenarioBaseline: { ...BASE, landRainIntensity: 25 }, wcScenarioPreset: 'custom', wcPrediction: 'runoff',
      wcExperimentLog: [{ label: 'My observation', notes: { evidence: 'Keep this evidence.', nextTest: 'Change cover only.' } }],
      wcExperimentUndo: [{ index: 0, entry: { label: 'Removed observation' } }],
      wcProcessCompare: { first: 'evaporation', second: 'transpiration', notes: { 'evaporation|transpiration': 'Keep my explanation.' } },
      wcCheckReflections: { kept: { observation: 'Keep my Check writing.' } },
      researchPoints: 17, completedChallenges: ['adjust_climate'], wcQuizScore: 3, wcMythsDone: 2,
      journeyActive: true, journeyPaused: true, journeyState: 'aquifer_flow', journeyReplayProgress: 0.4,
    });
    for (const key of INPUTS) {
      const result = interactive({ ...protectedState, wcLandLabOpen: false });
      expect(Array.from(result.cutaway.querySelectorAll('button[data-cutaway-input]')).map(node => node.dataset.cutawayInput)).toEqual(INPUTS);
      const before = JSON.stringify(result.data);
      result.click(key);
      expect(result.writes).toHaveLength(1);
      expect(result.state).toEqual({ ...result.data, wcSection: 'conditions', wcFocusMode: false, wcLandLabOpen: true });
      expect(JSON.stringify(result.data)).toBe(before);
      expect(result.state.wcScenarioBaseline).toBe(result.data.wcScenarioBaseline);
      expect(result.state.wcExperimentLog).toBe(result.data.wcExperimentLog);
      expect(result.awardXP).not.toHaveBeenCalled();
      expect(result.celebrate).not.toHaveBeenCalled();
    }
  });

  it('returns focus from the native controls to the cutaway heading without changing data', () => {
    const frames = [];
    vi.stubGlobal('requestAnimationFrame', callback => { frames.push(callback); return frames.length; });
    const result = interactive();
    document.body.append(result.container);
    fixtures.push(result.container);
    const heading = result.cutaway.querySelector('#wcLandCutawayTitle');
    expect(heading.getAttribute('tabindex')).toBe('-1');
    const button = result.land.querySelector('[data-cutaway-return="true"]');
    expect(button.textContent).toMatch(/see updated cutaway/i);
    result.click('return');
    frames.splice(0).forEach(callback => callback());
    expect(document.activeElement).toBe(heading);
    expect(result.writes).toHaveLength(0);
    expect(result.state).toBe(result.data);
  });

  it('keeps SVG artwork decorative and labels the figure and five native buttons with unique IDs', () => {
    const result = rendered({ landRainIntensity: 70, landSaturation: 80, landCover: 'forest' });
    const svg = result.cutaway.querySelector('svg');
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('focusable')).toBe('false');
    expect(svg.hasAttribute('tabindex')).toBe(false);
    expect(svg.querySelectorAll('text, foreignObject, button')).toHaveLength(0);
    const ids = Array.from(result.container.querySelectorAll('[id]')).map(node => node.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const attribute of ['aria-labelledby', 'aria-describedby']) {
      const id = result.cutaway.getAttribute(attribute);
      expect(ids.filter(value => value === id)).toHaveLength(1);
      expect(result.container.querySelector('#' + id).textContent.trim()).not.toBe('');
    }
    const buttons = Array.from(result.cutaway.querySelectorAll('button[data-cutaway-input]'));
    expect(buttons).toHaveLength(5);
    expect(buttons.map(button => button.getAttribute('aria-label'))).toEqual([
      'Adjust rainfall intensity, currently 70/100', 'Adjust soil saturation, currently 80/100',
      'Adjust land cover, currently Forest', 'Adjust soil permeability, currently Medium', 'Adjust slope, currently Moderate',
    ]);
  });

  it('renders changed scenes beside a frozen baseline without mutating baseline, notes, or scores', () => {
    const state = freeze({
      ...BASE, landRainIntensity: 90, landSaturation: 80, landCover: 'forest',
      wcScenarioBaseline: { ...BASE }, wcPrediction: 'infiltration',
      wcExperimentLog: [{ label: 'Saved comparison', notes: { evidence: 'Keep my evidence.', nextTest: 'Change only rainfall.' } }],
      wcExperimentUndo: [], wcQuizScore: 2, researchPoints: 9,
    });
    const before = JSON.stringify(state);
    const result = rendered(state);
    expectReadings(result);
    expect(result.container.querySelector('[data-watercycle-comparison]')).not.toBeNull();
    expect(result.container.querySelector('[data-wc-notebook]')).not.toBeNull();
    expect(result.cutaway.dataset.cutawayRain).toBe('90');
    expect(result.cutaway.dataset.cutawaySaturation).toBe('80');
    expect(result.cutaway.dataset.cutawayCover).toBe('forest');
    expect(JSON.stringify(state)).toBe(before);
  });
});
