import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const SOURCE_PATH = 'stem_lab/stem_tool_watercycle.js';
const MIRROR_PATH = 'desktop/web-app/public/stem_lab/stem_tool_watercycle.js';
const source = readFileSync(SOURCE_PATH, 'utf8');
const evaporationStatement = source.match(/var evaporationIndex = [^\r\n]+;/)?.[0];
if (!evaporationStatement) throw new Error('Missing production evaporation derivation.');
const evaporationFor = new Function('currentSolar', 'currentTemp', evaporationStatement + '\nreturn evaporationIndex;');
const BASE = {
  wcMode: 'explorer', wcSection: 'conditions', wcClimateLabOpen: true, wcLandLabOpen: true,
  journeyView: '2d', activeStage: 'evaporation',
  climSolar: 1, climTemp: 15, climWind: 1,
  landRainIntensity: 55, landSaturation: 45, landPermeability: 'medium', landSlope: 'moderate', landCover: 'grass',
};
const SLIDERS = ['wc-climate-solar', 'wc-climate-temperature', 'wc-climate-wind', 'wc-land-rain', 'wc-land-saturation'];
const LAND_CASES = [
  ['wet urban surface', { landRainIntensity: 90, landSaturation: 85, landPermeability: 'low', landSlope: 'steep', landCover: 'urban' }],
  ['less-saturated forest soil', { landRainIntensity: 25, landSaturation: 20, landPermeability: 'high', landSlope: 'gentle', landCover: 'forest' }],
];

beforeAll(() => {
  resetStemLab();
  loadTool(SOURCE_PATH, 'waterCycle');
}, 60000);

function rendered(state = {}, overrides = {}) {
  const data = Object.freeze({ ...BASE, ...state });
  const container = document.createElement('div');
  container.innerHTML = renderTool('waterCycle', { waterCycle: data }, overrides);
  const climate = container.querySelector('[data-watercycle-climate]');
  const land = container.querySelector('[data-watercycle-land]');
  expect(climate, 'actual Conditions climate lab').not.toBeNull();
  expect(land, 'actual Conditions land lab').not.toBeNull();
  return { data, container, climate, land };
}

function linkedHelp(container, control) {
  const ids = (control.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  expect(ids.length, control.id || control.dataset.wcInput).toBeGreaterThan(0);
  const nodes = ids.map(id => {
    const matches = Array.from(container.querySelectorAll('[id]')).filter(node => node.id === id);
    expect(matches, 'help ID ' + id).toHaveLength(1);
    expect(matches[0].textContent.trim(), 'help text ' + id).not.toBe('');
    return matches[0];
  });
  return nodes.map(node => node.textContent).join(' ');
}

function readableText(node) {
  if (node.nodeType === 3) return node.textContent;
  if (node.nodeType !== 1 || node.hidden || node.getAttribute('aria-hidden') === 'true') return '';
  return Array.from(node.childNodes).map(readableText).join(' ');
}

function normalized(text) { return text.replace(/\u00d7/g, 'x').replace(/\s+/g, ' ').trim(); }
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

function expectLandScores(result) {
  const actual = window.WaterCycleInvestigationKernel.land(result.data);
  const cards = Array.from(result.land.querySelectorAll('.wc-land-result'));
  expect(cards).toHaveLength(2);
  expect(cards[0].textContent).toContain('Runoff tendency');
  expect(cards[1].textContent).toContain('Infiltration opportunity');
  expect(cards.map(card => card.dataset.landReading)).toEqual(['runoff', 'infiltration']);
  const scores = cards.map(card => Number(card.querySelector('[data-land-score]').textContent.match(/(\d+)\s*\/\s*100/)?.[1]));
  expect(scores).toEqual([actual.runoff, actual.infiltration]);
  expect(result.land.querySelector('.wc-land-results').getAttribute('role')).toBe('status');
  expect(result.land.querySelector('.wc-land-results').getAttribute('aria-live')).toBe('polite');
  expect(result.land.querySelector('.wc-land-results').getAttribute('aria-atomic')).toBe('true');
  return cards;
}

describe('Water Cycle Conditions: actual rendered lab semantics', () => {
  it('uses model reference units independently of the saved comparison baseline', () => {
    const state = { climSolar: 1.2, climTemp: 21, climWind: 1.6 };
    const saved = { ...BASE, climSolar: 0.7, climTemp: 12, climWind: 0.6 };
    const result = rendered({ ...state, wcScenarioBaseline: saved });
    const plain = rendered(state);
    const wind = result.climate.querySelector('#wc-climate-wind');
    const solar = result.climate.querySelector('#wc-climate-solar');
    expect(wind.getAttribute('aria-valuetext')).toBe('1.6 times reference wind');
    expect(wind.getAttribute('aria-valuetext')).toBe(plain.climate.querySelector('#wc-climate-wind').getAttribute('aria-valuetext'));
    expect(solar.getAttribute('aria-valuetext')).toBe('120% solar intensity');
    expect(normalized(linkedHelp(result.container, wind))).toMatch(/1x.*reference|reference.*1x/i);
    expect(normalized(linkedHelp(result.container, solar))).toMatch(/100%.*reference|reference.*100%/i);
    const windCard = wind.closest('.wc-climate-control');
    expect(normalized(windCard.querySelector('.wc-climate-delta').textContent)).toMatch(/baseline.*0\.6x.*1\.6x/i);
    expect(windCard.textContent).not.toMatch(/\bGale\b/);
  });

  it('links all five sliders to unique help while retaining native control scales and labels', () => {
    const { container } = rendered();
    const scales = [['0', '2', '0.05'], ['-20', '45', '1'], ['0', '3', '0.1'], ['0', '100', '5'], ['0', '100', '5']];
    SLIDERS.forEach((id, index) => {
      const control = container.querySelector('#' + id);
      expect(control.type, id).toBe('range');
      expect([control.min, control.max, control.step], id).toEqual(scales[index]);
      expect(container.querySelector('label[for="' + id + '"]'), id).not.toBeNull();
      linkedHelp(container, control);
    });
    for (const [id, value] of [['wc-land-rain', BASE.landRainIntensity], ['wc-land-saturation', BASE.landSaturation]]) {
      const control = container.querySelector('#' + id);
      const output = control.closest('.wc-land-control').querySelector('output');
      expect(output, id).not.toBeNull();
      expect(output.textContent).toBe(value + '/100');
      expect(output.getAttribute('for')).toBe(id);
      expect(control.getAttribute('aria-valuetext')).toContain(value + ' out of 100');
    }
    expect(linkedHelp(container, container.querySelector('#wc-land-saturation'))).toMatch(/before|starting|initial/i);
  });

  it('defines each categorical fieldset and preserves one clearly selected option', () => {
    const result = rendered({ landPermeability: 'high', landSlope: 'steep', landCover: 'forest' });
    for (const [key, label, selected] of [
      ['landPermeability', 'Soil permeability', 'High'], ['landSlope', 'Slope', 'Steep'], ['landCover', 'Land cover', 'Forest'],
    ]) {
      const group = result.land.querySelector('fieldset[data-wc-input="' + key + '"]');
      expect(group.querySelector('legend').textContent).toBe(label);
      linkedHelp(result.container, group);
      expect(group.querySelectorAll('button')).toHaveLength(3);
      const active = Array.from(group.querySelectorAll('button[aria-pressed="true"]'));
      expect(active).toHaveLength(1);
      expect(active[0].textContent).toContain('✓ ' + selected);
      expect(active[0].getAttribute('aria-label')).toBe(label + ': ' + selected + ' (selected)');
    }
  });

  it.each(LAND_CASES)('shows exact independent production indices for %s', (_name, state) => {
    const result = rendered(state);
    expectLandScores(result);
    expect(result.land.textContent).toContain('not measured percentages or a forecast');
    expect(result.land.textContent).toContain('Infiltration does not automatically become groundwater recharge.');
  });

  it('keeps distinct pathway diagrams decorative and fixed across changing land conditions', () => {
    const diagrams = LAND_CASES.map(([_name, state]) => {
      const result = rendered(state);
      const cards = expectLandScores(result);
      expect(result.land.querySelector('.wc-land-result-scope').textContent).toMatch(/Separate.*indices; arrows.*not water amounts/i);
      return cards.map(card => {
        const svg = card.querySelector('svg');
        expect(svg).not.toBeNull();
        expect(svg.getAttribute('aria-hidden')).toBe('true');
        expect(svg.getAttribute('focusable')).toBe('false');
        expect(svg.hasAttribute('tabindex')).toBe(false);
        return svg.outerHTML;
      });
    });
    expect(diagrams[0]).toEqual(diagrams[1]);
    expect(diagrams[0][0]).not.toBe(diagrams[0][1]);
  });

  it('exposes the exact production evaporation index in the live result and hides only its track', () => {
    const result = rendered({ climSolar: 0.8, climTemp: 21 });
    const response = result.climate.querySelector('.wc-climate-response');
    expect(response.getAttribute('role')).toBe('status');
    expect(response.getAttribute('aria-live')).toBe('polite');
    expect(response.getAttribute('aria-atomic')).toBe('true');
    const reading = evaporationFor(result.data.climSolar, result.data.climTemp).toFixed(2) + 'x';
    expect(normalized(readableText(response))).toContain(reading);
    const exact = response.querySelector('[data-evaporation-index]');
    expect(exact.getAttribute('data-evaporation-index')).toBe(evaporationFor(result.data.climSolar, result.data.climTemp).toFixed(2));
    expect(normalized(readableText(exact))).toBe(reading);
    expect(readableText(response)).toMatch(/evaporation (?:teaching )?index/i);
    expect(response.querySelector('.wc-evap-meter').getAttribute('aria-hidden')).not.toBe('true');
    expect(response.querySelector('.wc-evap-meter-track').getAttribute('aria-hidden')).toBe('true');
  });

  it('names reset scope and explains that selecting a preset sets weather and land together', () => {
    const initial = rendered();
    expect(initial.climate.querySelector('.wc-reset-control').textContent).toMatch(/reset climate/i);
    expect(initial.land.querySelector('.wc-land-reset').textContent).toMatch(/reset land/i);
    const preset = Array.from(initial.climate.querySelector('#wcScenarioPreset').options).find(option => option.value !== 'custom');
    expect(preset).not.toBeUndefined();
    const selected = rendered({ wcScenarioPreset: preset.value });
    const note = selected.climate.querySelector('.wc-preset-scope');
    expect(note).not.toBeNull();
    expect(note.textContent).toMatch(/presets.*weather.*land.*together/i);
    expect(initial.climate.querySelector('.wc-preset-scope')).toBeNull();
  });

  it('renders complete and changed Conditions without mutating frozen learner records', () => {
    const state = freeze({
      ...BASE, climSolar: 1.2, landCover: 'forest', wcScenarioBaseline: { ...BASE }, wcPrediction: 'runoff',
      wcExperimentLog: [{ label: 'My comparison', notes: { evidence: 'Keep my evidence.', nextTest: 'Change sunlight only.' } }],
      wcExperimentUndo: [{ index: 0, entry: { label: 'Removed evidence' } }],
      wcProcessCompare: { first: 'evaporation', second: 'transpiration', notes: { 'evaporation|transpiration': 'Keep my explanation.' } },
      journeyActive: true, journeyPaused: true, journeyState: 'aquifer_flow', journeyReplayProgress: 0.4,
    });
    const before = JSON.stringify(state);
    const result = rendered(state);
    expectLandScores(result);
    expect(result.container.querySelector('[data-wc-fair-test]')).not.toBeNull();
    expect(result.container.querySelector('[data-wc-notebook]')).not.toBeNull();
    expect(JSON.stringify(state)).toBe(before);
  });

  it('ships identical source and public Conditions implementations', () => {
    expect(readFileSync(MIRROR_PATH, 'utf8')).toBe(source);
  });
});