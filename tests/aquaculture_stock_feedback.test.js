import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const storageKey = 'aquacultureLab.state.v1';
const expectedVersion = '2026.10-stock-feedback';
const referenceWater = { temperature: 14, salinity: 30, oxygen: 10, pH: 8, ammonia: .04, exchange: 82 };
const scenario = (patch = {}) => ({ environmentId: 'longline', organisms: { oyster: 2 }, water: { ...referenceWater }, disturbanceId: 'none', ...patch });
const speciesAt = (run, month, id) => run.timeline[month].species.find(item => item.id === id);
const findButton = (host, label) => [...host.querySelectorAll('button')].find(item => item.textContent.trim() === label);

function deepFreeze(value) {
  Object.freeze(value);
  Object.values(value).forEach(item => { if (item && typeof item === 'object' && !Object.isFrozen(item)) deepFreeze(item); });
  return value;
}

function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') { cell += '"'; index += 1; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) { row.push(cell); cell = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += char;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

describe('Aquaculture species growth, stock feedback, and evidence compatibility', () => {
  let host, root, helpers;

  beforeEach(() => {
    localStorage.clear(); window.history.replaceState({}, '', '/'); resetStemLab();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.matchMedia = vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() }));
    host = document.createElement('div'); document.body.appendChild(host);
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    root = null; host.remove(); localStorage.clear(); vi.restoreAllMocks();
  });

  async function mount(workspace = scenario()) {
    localStorage.setItem(storageKey, JSON.stringify({ lastTopic: 'ecosystem', ecosystemWorkspace: workspace }));
    const config = loadTool('stem_lab/stem_tool_aquaculture.js', 'aquacultureLab');
    root = ReactDOMClient.createRoot(host);
    await act(async () => { root.render(React.createElement(() => config.render(makeCtx({ React })))); });
    helpers = window.AquacultureLearningHelpers;
    const seed = JSON.parse(localStorage.getItem(storageKey));
    seed.ecosystemWorkspace = helpers.sanitizeEcosystemWorkspace(seed.ecosystemWorkspace);
    localStorage.setItem(storageKey, JSON.stringify(seed));
  }

  async function click(element) {
    expect(element).toBeTruthy(); expect(element.disabled).not.toBe(true);
    await act(async () => { element.click(); });
  }

  const storedWorkspace = () => JSON.parse(localStorage.getItem(storageKey)).ecosystemWorkspace;

  it('preserves fractional stock feedback independently of integer learner stocking controls', async () => {
    await mount();
    const input = deepFreeze(scenario({ environmentId: 'ras', organisms: { salmon: 1 }, water: { ...referenceWater, exchange: 50 } }));
    const original = JSON.stringify(input);
    const half = helpers.calculateEcosystem(input, { salmon: .5 });
    const full = helpers.calculateEcosystem(input, { salmon: 1 });
    const oneAndHalf = helpers.calculateEcosystem(input, { salmon: 1.5 });
    const tinyGrowth = helpers.calculateEcosystem(input, { salmon: 1.001 });
    const depleted = helpers.calculateEcosystem(input, { salmon: 0 });
    expect(half.carryingPressure).toBeLessThan(full.carryingPressure);
    expect(oneAndHalf.carryingPressure).toBeGreaterThan(full.carryingPressure);
    expect(half.preciseOxygen).toBeGreaterThan(full.preciseOxygen);
    expect(oneAndHalf.preciseOxygen).toBeLessThan(full.preciseOxygen);
    // A change below the displayed precision must still affect the calculation.
    expect(tinyGrowth.preciseOxygen).toBeLessThan(full.preciseOxygen);
    expect(depleted.carryingPressure).toBe(0);
    expect(JSON.stringify(input)).toBe(original);
    expect(input.organisms.salmon).toBe(1);
  });

  it('removes zero-scaled processing, connections, diversity bonuses, and incompatibility warnings', async () => {
    await mount();
    const salmon = scenario({ environmentId: 'ras', organisms: { salmon: 1 }, water: { ...referenceWater, temperature: 15, ammonia: .35, exchange: 35 } });
    const salmonOnly = helpers.calculateEcosystem(salmon);
    const withFilter = { ...salmon, organisms: { salmon: 1, nitrifiers: 2 } };
    const activeFilter = helpers.calculateEcosystem(withFilter);
    const depletedFilter = helpers.calculateEcosystem(withFilter, { nitrifiers: 0 });
    // Verify this fixture could provide processing before testing its complete depletion.
    expect(activeFilter.preciseAmmonia).toBeLessThan(salmonOnly.preciseAmmonia);
    expect(activeFilter.connections.some(item => /biofilter/i.test(item))).toBe(true);
    expect(depletedFilter).toEqual(salmonOnly);
    expect(depletedFilter.selected.map(item => item.id)).toEqual(['salmon']);

    const trout = scenario({ environmentId: 'raceway', organisms: { trout: 1 }, water: { ...referenceWater, temperature: 12, salinity: 1, pH: 7.5, oxygen: 11, exchange: 85 } });
    const troutOnly = helpers.calculateEcosystem(trout);
    const absentKelp = helpers.calculateEcosystem({ ...trout, organisms: { trout: 1, kelp: 1 } }, { kelp: 0 });
    expect(troutOnly.status).toBe('Stable');
    expect(absentKelp).toEqual(troutOnly);
    expect(absentKelp.warnings).toEqual([]);
    expect(absentKelp.status).not.toBe('Critical');
    expect(absentKelp.selected.map(item => item.id)).toEqual(['trout']);
  });

  it('keeps incompatible kelp and biofilters physically stocked without crediting their processing', async () => {
    await mount();
    const trout = scenario({ environmentId: 'raceway', organisms: { trout: 1 }, water: { ...referenceWater, temperature: 12, salinity: 1, pH: 7.5, oxygen: 11, ammonia: .5, exchange: 85 } });
    const troutOnly = helpers.calculateEcosystem(trout);
    const misplacedKelp = helpers.calculateEcosystem({ ...trout, organisms: { trout: 1, kelp: 1 } });
    expect(misplacedKelp.preciseCarryingPressure).toBeGreaterThan(troutOnly.preciseCarryingPressure);
    expect(misplacedKelp.preciseAmmonia).toBe(troutOnly.preciseAmmonia);
    expect(misplacedKelp.habitat).toBe(troutOnly.habitat);
    expect(misplacedKelp.clarity).toBe(troutOnly.clarity);
    expect(misplacedKelp.connections.some(item => /seaweed|producer|IMTA/i.test(item))).toBe(false);
    expect(misplacedKelp.selected.some(item => item.id === 'kelp')).toBe(true);
    expect(misplacedKelp.warnings.some(item => /kelp.*not compatible/i.test(item.text))).toBe(true);

    const salmon = scenario({ environmentId: 'netpen', organisms: { salmon: 1 }, water: { ...referenceWater, temperature: 11, salinity: 32, ammonia: .5, exchange: 85 } });
    const salmonOnly = helpers.calculateEcosystem(salmon);
    const misplacedFilter = helpers.calculateEcosystem({ ...salmon, organisms: { salmon: 1, nitrifiers: 2 } });
    expect(misplacedFilter.preciseCarryingPressure).toBeGreaterThan(salmonOnly.preciseCarryingPressure);
    expect(misplacedFilter.preciseAmmonia).toBe(salmonOnly.preciseAmmonia);
    expect(misplacedFilter.connections.some(item => /biofilter/i.test(item))).toBe(false);
    expect(misplacedFilter.selected.some(item => item.id === 'nitrifiers')).toBe(true);
    expect(misplacedFilter.warnings.some(item => /biofilter.*not compatible/i.test(item.text))).toBe(true);
  });

  it('produces deterministic annual traces without mutating starting stock or writing', async () => {
    await mount();
    const input = deepFreeze(scenario({ organisms: { oyster: 2, kelp: 2, phytoplankton: 1 }, observation: 'Keep the original explanation.', prediction: 'Growth changes next month pressure.' }));
    const original = JSON.stringify(input);
    const first = helpers.simulateEcosystemYear(input);
    const second = helpers.simulateEcosystemYear(input);
    expect(helpers.ecosystemModelVersion).toBe(expectedVersion);
    expect(first.modelVersion).toBe(expectedVersion);
    expect(first).toEqual(second);
    expect(first.timeline).toHaveLength(12);
    expect(first.summary.species.map(item => item.id).sort()).toEqual(['oyster', 'kelp', 'phytoplankton'].sort());
    expect(JSON.stringify(input)).toBe(original);
  });

  it('carries growth into the next month and computes water from opening biomass', async () => {
    await mount();
    const input = scenario();
    const run = helpers.simulateEcosystemYear(input);
    expect(run.timeline[0].biomass).toBeGreaterThan(run.timeline[0].openingBiomass);
    expect(run.timeline[1].carryingPressure).toBeGreaterThan(run.timeline[0].carryingPressure);
    run.timeline.forEach((month, index) => {
      const scales = Object.fromEntries(month.species.map(item => [item.id, item.openingBiomass / item.initialBiomass]));
      const model = helpers.calculateEcosystem(helpers.ecosystemMonthScenario(input, index), scales);
      expect(month.carryingPressure).toBe(model.carryingPressure);
      expect(month.oxygen).toBe(model.oxygen);
      expect(month.ammonia).toBe(model.ammonia);
      expect(month.warnings).toEqual(model.warnings);
      if (index) {
        // The community display rounds to one decimal; the species trace retains three.
        expect(Math.abs(month.openingBiomass - run.timeline[index - 1].biomass)).toBeLessThanOrEqual(.051);
        expect(speciesAt(run, index, 'oyster').openingBiomass).toBeCloseTo(speciesAt(run, index - 1, 'oyster').biomass, 3);
      }
    });
  });

  it('uses each species tolerance instead of applying a kelp growth warning to unstressed oysters', async () => {
    await mount();
    const water = { ...referenceWater, temperature: 18 };
    const mixed = helpers.simulateEcosystemYear(scenario({ water, organisms: { oyster: 1, kelp: 1 } }));
    const oysterOnly = helpers.simulateEcosystemYear(scenario({ water, organisms: { oyster: 1 } }));
    const kelpJuly = speciesAt(mixed, 6, 'kelp'), oysterJuly = speciesAt(mixed, 6, 'oyster');
    expect(kelpJuly.signals.some(item => item.factor === 'temperature')).toBe(true);
    expect(oysterJuly.signals.some(item => item.factor === 'temperature')).toBe(false);
    expect(kelpJuly.stress).toBeGreaterThan(oysterJuly.stress);
    expect(kelpJuly.growthFactor).toBeLessThan(oysterJuly.growthFactor);
    mixed.timeline.forEach((_, index) => {
      expect(speciesAt(mixed, index, 'oyster').survival).toBe(speciesAt(oysterOnly, index, 'oyster').survival);
      expect(speciesAt(mixed, index, 'oyster').growthFactor).toBe(speciesAt(oysterOnly, index, 'oyster').growthFactor);
    });
  });

  it('applies oxygen retention to sensitive scallops without giving the same loss to viable mussels', async () => {
    await mount();
    const water = { ...referenceWater, temperature: 13, oxygen: 5.5 };
    const mixed = helpers.simulateEcosystemYear(scenario({ water, organisms: { scallop: 1, mussel: 1 } }));
    const musselOnly = helpers.simulateEcosystemYear(scenario({ water, organisms: { mussel: 1 } }));
    const scallop = speciesAt(mixed, 0, 'scallop'), mussel = speciesAt(mixed, 0, 'mussel');
    expect(scallop.signals.some(item => item.factor === 'oxygen')).toBe(true);
    expect(mussel.signals.some(item => item.factor === 'oxygen')).toBe(false);
    expect(scallop.survival).toBeLessThan(mussel.survival);
    expect(mussel.survival).toBe(speciesAt(musselOnly, 0, 'mussel').survival);
  });

  it('slows cold-water growth without imposing an acute heat-style survival penalty', async () => {
    await mount();
    const trout = temperature => scenario({ environmentId: 'raceway', organisms: { trout: 1 }, water: { ...referenceWater, temperature, salinity: 1, pH: 7.5, oxygen: 11, exchange: 85 } });
    const cold = helpers.simulateEcosystemYear(trout(3));
    const comfortable = helpers.simulateEcosystemYear(trout(12));
    const coldJanuary = speciesAt(cold, 0, 'trout'), comfortableJanuary = speciesAt(comfortable, 0, 'trout');
    expect(coldJanuary.signals.some(item => item.factor === 'temperature')).toBe(true);
    expect(coldJanuary.growthFactor).toBeLessThan(comfortableJanuary.growthFactor);
    expect(coldJanuary.survival).toBe(comfortableJanuary.survival);
  });

  it('includes survival loss in crop biomass and reconciles species traces with totals', async () => {
    await mount();
    const run = helpers.simulateEcosystemYear(scenario({ organisms: { oyster: 1, kelp: 1 }, water: { ...referenceWater, temperature: 19, oxygen: 2 }, disturbanceId: 'heatwave' }));
    const previousSurvival = new Map();
    let zeroGrowthLossCount = 0;
    run.timeline.forEach(month => {
      expect(month.openingBiomass).toBeCloseTo(month.species.reduce((sum, item) => sum + item.openingBiomass, 0), 1);
      expect(Math.abs(month.biomass - month.species.reduce((sum, item) => sum + item.biomass, 0))).toBeLessThanOrEqual(.051);
      month.species.forEach(item => {
        const prior = previousSurvival.get(item.id) ?? 100;
        if (!item.fixedSupport) {
          const retainedFraction = prior ? item.survival / prior : 0;
          // The exposed growth factor describes suitability, not the growth-rate coefficient.
          // When suitability reaches zero only survival retention changes crop biomass.
          if (item.growthFactor === 0) {
            expect(item.biomass).toBeCloseTo(item.openingBiomass * retainedFraction, 1);
            if (item.survival < prior) zeroGrowthLossCount += 1;
          }
          expect(item.biomass + .005).toBeGreaterThanOrEqual(item.openingBiomass * retainedFraction);
          expect(item.survival).toBeLessThanOrEqual(prior);
          expect(item.survival).toBeGreaterThanOrEqual(0);
          previousSurvival.set(item.id, item.survival);
        }
        for (const key of ['initialBiomass', 'openingBiomass', 'biomass', 'stress', 'growthFactor', 'progress']) expect(Number.isFinite(item[key]), key).toBe(true);
        expect(item.biomass).toBeGreaterThanOrEqual(0);
      });
    });
    expect(zeroGrowthLossCount).toBeGreaterThan(0);
    const july = speciesAt(run, 6, 'oyster');
    expect(july.survival).toBeLessThan(speciesAt(run, 5, 'oyster').survival);
    expect(july.biomass).toBeLessThan(july.openingBiomass);
    expect(Math.abs(run.summary.endingBiomass - run.summary.species.reduce((sum, item) => sum + item.endingBiomass, 0))).toBeLessThanOrEqual(.051);
    run.summary.species.forEach(item => {
      expect(item.endingBiomass).toBeCloseTo(speciesAt(run, 11, item.id).biomass, 1);
      expect(item.survival).toBe(speciesAt(run, 11, item.id).survival);
    });
  });

  it('retains stock effects after the scheduled disturbance month has ended', async () => {
    await mount();
    const input = scenario({ organisms: { oyster: 1, kelp: 1 }, water: { ...referenceWater, temperature: 18 } });
    const baseline = helpers.simulateEcosystemYear(input);
    const event = helpers.simulateEcosystemYear({ ...input, disturbanceId: 'heatwave' });
    expect(event.timeline.slice(0, 6)).toEqual(baseline.timeline.slice(0, 6));
    expect(event.timeline[6].event).toBe('Marine heatwave');
    expect(helpers.ecosystemMonthScenario({ ...input, disturbanceId: 'heatwave' }, 7).disturbanceId).toBe('none');
    expect(event.timeline[7].openingBiomass).toBeLessThan(baseline.timeline[7].openingBiomass);
    expect(speciesAt(event, 7, 'kelp').openingBiomass).toBeLessThan(speciesAt(baseline, 7, 'kelp').openingBiomass);
  });

  it.each([
    ['longline', 'phytoplankton', { temperature: 14, salinity: 30 }],
    ['bottom', 'eelgrass', { temperature: 14, salinity: 27 }],
    ['raceway', 'nitrifiers', { temperature: 12, salinity: 1 }]
  ])('keeps %s %s support excluded from crop totals without inventing crop survival', async (environmentId, id, waterPatch) => {
    await mount();
    const run = helpers.simulateEcosystemYear(scenario({ environmentId, organisms: { [id]: 2 }, water: { ...referenceWater, ...waterPatch } }));
    const initial = speciesAt(run, 0, id).initialBiomass;
    expect(initial).toBe(0);
    const startingPressure = run.timeline[0].carryingPressure;
    expect(startingPressure).toBeGreaterThan(0);
    run.timeline.forEach((month, index) => {
      const item = speciesAt(run, index, id);
      expect(item.fixedSupport).toBe(true);
      expect(item.openingBiomass).toBe(initial);
      expect(item.biomass).toBe(initial);
      expect(item.survival).toBeNull();
      expect(item.ready).toBe(false);
      expect(month.harvestUnits).toBe(0);
      expect(month.carryingPressure).toBe(startingPressure);
    });
    expect(run.summary.species[0]).toMatchObject({ id, fixedSupport: true, initialBiomass: initial, endingBiomass: initial, survival: null, ready: false });
  });

  it('keeps an empty community finite and produces no phantom species', async () => {
    await mount();
    const run = helpers.simulateEcosystemYear(scenario({ organisms: {} }));
    expect(run.summary.species).toEqual([]);
    expect(run.summary).toMatchObject({ endingBiomass: 0, survival: 0, operatingEffort: 0, harvestUnits: 0 });
    run.timeline.forEach(month => {
      expect(month).toMatchObject({ openingBiomass: 0, biomass: 0, carryingPressure: 0, species: [], survival: 0, effort: 0, harvestUnits: 0 });
      expect(Number.isFinite(month.oxygen)).toBe(true); expect(Number.isFinite(month.ammonia)).toBe(true);
    });
  });

  it('shows support-only survival as inapplicable and exports blanks instead of zero-percent crop survival', async () => {
    const supportInput = scenario({ organisms: { phytoplankton: 1 } });
    await mount(supportInput);
    const support = helpers.simulateEcosystemYear(supportInput);
    const crop = helpers.simulateEcosystemYear(scenario());
    expect(support.summary.hasCrop).toBe(false);
    expect(support.timeline.every(month => month.hasCrop === false)).toBe(true);
    const survivalLabels = [...host.querySelectorAll('dt')].filter(item => item.textContent.trim() === 'Crop survival index');
    expect(survivalLabels.length).toBeGreaterThan(0);
    survivalLabels.forEach(label => {
      const reading = label.parentElement.querySelector('dd');
      expect(reading).toBeTruthy();
      expect(reading.textContent).toMatch(/not applicable/i);
      expect(reading.textContent).not.toMatch(/\d+\s*%/);
    });

    for (const csv of [helpers.ecosystemTimelineCsv(null, support), helpers.ecosystemSpeciesCsv(null, support)]) {
      const rows = parseCsv(csv);
      const survivalColumn = rows[0].findIndex(item => /survival/i.test(item));
      expect(survivalColumn).toBeGreaterThanOrEqual(0);
      expect(rows).toHaveLength(13);
      expect(rows.slice(1).every(row => row[survivalColumn] === '')).toBe(true);
    }
    expect(helpers.compareEcosystemRuns(support, crop).survival).toBeNull();
    expect(helpers.compareEcosystemRuns(crop, support).survival).toBeNull();
    expect(helpers.compareEcosystemRuns(support, support).survival).toBeNull();
    expect(helpers.compareEcosystemRuns(crop, crop).survival).toBe(0);
  });

  it('preserves legacy summaries and does not certify a rerun under the current model as saved evidence', async () => {
    const a = scenario(), b = scenario({ water: { ...referenceWater, oxygen: 9 } });
    const aSummary = { endingBiomass: 99, survival: 73, minOxygen: 8, peakAmmonia: .1, averageResilience: 61, riskMonths: 2, harvestUnits: 0, operatingEffort: 29 };
    const bSummary = { ...aSummary, endingBiomass: 88, survival: 68, minOxygen: 7, riskMonths: 4 };
    const legacy = { id: 'legacy-comparison', savedAt: 123, kind: 'comparison', environmentId: 'longline', organisms: { oyster: 2 }, status: 'Stable', carryingPressure: 20, oxygen: 9, ammonia: 0, resilience: 61, baselineScenario: a, currentScenario: b, baselineSummary: aSummary, currentSummary: bSummary, prediction: 'My original prediction.', observation: 'My original interpretation must remain attached to the original results.' };
    await mount({ ...b, baselineScenario: a, experiments: [legacy], observation: '', prediction: legacy.prediction });
    expect(storedWorkspace().experiments[0]).toMatchObject({ modelVersion: 'legacy', baselineSummary: aSummary, currentSummary: bSummary });
    expect(host.querySelector('#aq-investigation-heading').textContent).not.toBe('Evidence saved');
    const saved = JSON.parse(JSON.stringify(storedWorkspace().experiments[0]));
    await click(host.querySelector('[aria-label^="Replay experiment 1:"]'));
    expect(host.querySelector('#aq-investigation-heading').textContent).not.toBe('Evidence saved');
    expect(storedWorkspace().experiments).toEqual([saved]);
    const portfolio = helpers.buildLearningPortfolio({ ecosystemWorkspace: storedWorkspace() }, [], []);
    const merged = helpers.mergeLearningPortfolio({}, JSON.parse(JSON.stringify(portfolio)), []);
    expect(merged.ecosystemWorkspace.experiments).toEqual([saved]);
    expect(helpers.portfolioToHtml(portfolio)).toMatch(/unversioned|legacy/i);
    await click(findButton(host, 'Return to my draft'));
    expect(storedWorkspace().experiments).toEqual([saved]);
  });

  it.each(['snapshot', 'comparison'])('tags new %s evidence and preserves its version through backup import', async kind => {
    const a = scenario({ environmentId: 'raceway', organisms: { trout: 1, nitrifiers: 1 }, water: { ...referenceWater, temperature: 12, salinity: 1, oxygen: 11 } });
    const b = { ...a, water: { ...a.water, oxygen: 10 } };
    await mount({ ...b, baselineScenario: kind === 'comparison' ? a : null, observation: 'Compare the opening stocks and water signals rather than treating this index as a field forecast.' });
    await click(findButton(host, kind === 'comparison' ? 'Save A/B comparison' : 'Save snapshot evidence'));
    const record = storedWorkspace().experiments[0];
    expect(record.modelVersion).toBe(expectedVersion);
    if (kind === 'comparison') {
      expect(record.baselineSummary.species).toEqual(helpers.simulateEcosystemYear(a).summary.species);
      expect(record.currentSummary.species).toEqual(helpers.simulateEcosystemYear(b).summary.species);
      expect(record.currentSummary.species.find(item => item.id === 'nitrifiers').survival).toBeNull();
    }
    const portfolio = helpers.buildLearningPortfolio({ ecosystemWorkspace: storedWorkspace() }, [], []);
    const merged = helpers.mergeLearningPortfolio({}, JSON.parse(JSON.stringify(portfolio)), []);
    expect(merged.ecosystemWorkspace.experiments).toEqual([record]);
    expect(helpers.portfolioToHtml(portfolio)).toContain(expectedVersion);
  });

  it('exports per-species traces with units, version context, quoted names, and no invented support survival', async () => {
    await mount();
    const input = scenario({ organisms: { oyster: 1, phytoplankton: 1 } });
    const a = helpers.simulateEcosystemYear(input), b = helpers.simulateEcosystemYear({ ...input, disturbanceId: 'heatwave' });
    const specialName = 'Oyster, "classroom"\nreference';
    b.timeline[6].species.find(item => item.id === 'oyster').name = specialName;
    const rows = parseCsv(helpers.ecosystemSpeciesCsv(a, b));
    expect(rows).toHaveLength(49);
    const header = rows[0];
    const column = pattern => { const index = header.findIndex(item => pattern.test(item)); expect(index, String(pattern)).toBeGreaterThanOrEqual(0); return index; };
    const scenarioColumn = column(/^scenario$/i), monthColumn = column(/^month$/i), speciesColumn = column(/species( name)?$/i);
    const versionColumn = column(/model.*version|version.*model/i), biomassColumn = column(/^closing.*biomass.*index/i), survivalColumn = column(/survival/i);
    expect(header.some(item => /opening.*biomass.*index/i.test(item))).toBe(true);
    expect(rows.every(row => row.length === header.length)).toBe(true);
    const data = rows.slice(1);
    for (const label of ['A', 'B']) expect(data.filter(row => row[scenarioColumn] === label)).toHaveLength(24);
    expect(data.every(row => row[versionColumn] === expectedVersion)).toBe(true);
    const july = data.find(row => row[scenarioColumn] === 'B' && row[monthColumn] === 'Jul' && row[speciesColumn] === specialName);
    expect(july).toBeTruthy();
    expect(Number(july[biomassColumn])).toBe(speciesAt(b, 6, 'oyster').biomass);
    const support = data.filter(row => /phytoplankton/i.test(row[speciesColumn]));
    expect(support).toHaveLength(24);
    expect(support.every(row => row[survivalColumn] === '')).toBe(true);
    expect(parseCsv(helpers.ecosystemSpeciesCsv(null, b))).toHaveLength(25);
  });
});
