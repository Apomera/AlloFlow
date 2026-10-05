import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const storageKey = 'aquacultureLab.state.v1';
const referenceWater = { temperature: 13, salinity: 30, oxygen: 8.8, pH: 8, ammonia: .04, exchange: 82 };
const community = { oyster: 2, mussel: 2, kelp: 2, phytoplankton: 1 };
const scenario = (patch = {}) => ({ environmentId: 'longline', organisms: { ...community }, water: { ...referenceWater }, disturbanceId: 'none', ...patch });
const findButton = (host, label) => [...host.querySelectorAll('button')].find(el => ((el.getAttribute('aria-label') || el.textContent).trim() === label || (el.getAttribute('aria-label') || '').startsWith(label + ', ')));

async function click(element) {
  expect(element).toBeTruthy();
  await act(async () => { element.click(); });
}

async function select(element, value) {
  expect(element.tagName).toBe('SELECT');
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(element, value);
    element.dispatchEvent(new Event('change', { bubbles: true }));
  });
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

describe('Aquaculture seasonal explorer and one-input redesign', () => {
  let host, root, helpers;

  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState({}, '', '/');
    resetStemLab();
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.matchMedia = vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() }));
    host = document.createElement('div'); document.body.appendChild(host);
  });

  afterEach(() => {
    if (root) act(() => root.unmount());
    root = null; host.remove(); window.localStorage.clear(); vi.restoreAllMocks();
  });

  async function mount(workspace = scenario()) {
    window.localStorage.setItem(storageKey, JSON.stringify({ lastTopic: 'ecosystem', ecosystemWorkspace: workspace }));
    const config = loadTool('stem_lab/stem_tool_aquaculture.js', 'aquacultureLab');
    root = ReactDOMClient.createRoot(host);
    await act(async () => { root.render(React.createElement(() => config.render(makeCtx({ React })))); });
    helpers = window.AquacultureLearningHelpers;
    // Seed canonical persisted fixtures, so legacy missing defaults do not masquerade as evidence changes.
    const seed = JSON.parse(window.localStorage.getItem(storageKey));
    seed.ecosystemWorkspace = helpers.sanitizeEcosystemWorkspace(seed.ecosystemWorkspace);
    window.localStorage.setItem(storageKey, JSON.stringify(seed));
    return helpers;
  }

  const storedWorkspace = () => JSON.parse(window.localStorage.getItem(storageKey)).ecosystemWorkspace;


  it('uses unrounded thresholds consistently in species signals', async () => {
    await mount();
    const settings = scenario({environmentId:'raceway',organisms:{trout:1},water:{...referenceWater,temperature:17.5,salinity:1}});
    const september = helpers.ecosystemMonthScenario(settings,8);
    const model = helpers.calculateEcosystem(september);
    expect(model.temperature).toBe(18);
    expect(model.warnings.some(item=>item.text.includes('temperature'))).toBe(true);
    const trout = helpers.describeSpeciesSignals(september,model).find(item=>item.id==='trout');
    expect(trout.status).toBe('Investigate');
    expect(trout.signals.find(item=>item.factor==='temperature').value).toBeCloseTo(18.04);
    const almost = scenario({organisms:{mussel:1},water:{...referenceWater,oxygen:5.255}});
    const oxygenModel=helpers.calculateEcosystem(almost);
    expect(oxygenModel.oxygen).toBe(5.5);
    expect(oxygenModel.warnings.some(item=>item.text.includes('dissolved oxygen'))).toBe(true);
    expect(helpers.describeSpeciesSignals(almost,oxygenModel)[0].signals.some(item=>item.factor==='oxygen')).toBe(true);
  });

  it('labels the actual capped redesign and exposes both baseline and current events', async () => {
    await mount(scenario({disturbanceId:'heatwave',baselineScenario:scenario({disturbanceId:'storm'})}));
    const capped=helpers.ecosystemRedesigns(scenario({water:{...referenceWater,exchange:95,oxygen:13.5}}));
    expect(capped.find(item=>item.id==='exchange').title).toContain('5 points');
    expect(capped.find(item=>item.id==='oxygen').title).toContain('0.5 mg/L');
    await click(findButton(host,'Inspect Oct'));
    expect(host.querySelector('#aq-season-inspection').textContent).toContain('A: Coastal storm');
    expect(host.querySelector('#aq-season-inspection').textContent).toContain('B: No scheduled disturbance');
    const october=findButton(host,'Inspect Oct');
    expect(october.getAttribute('aria-label')).toContain('Stable');
    expect(october.getAttribute('aria-controls')).toBe('aq-season-inspection');
  });

  it('uses the exact month settings and applies a heatwave in July alone', async () => {
    await mount();
    const input = scenario({ disturbanceId: 'heatwave', observation: 'Do not alter this draft.' });
    const before = JSON.stringify(input);
    const june = helpers.ecosystemMonthScenario(input, 5);
    const july = helpers.ecosystemMonthScenario(input, 6);
    expect(june.water.temperature).toBe(17);
    expect(june.disturbanceId).toBe('none');
    expect(july.water.temperature).toBe(19);
    expect(july.disturbanceId).toBe('heatwave');
    expect(july.water.oxygen).toBe(referenceWater.oxygen);
    const run = helpers.simulateEcosystemYear(input);
    expect(run.timeline.filter(item => item.event === 'Marine heatwave').map(item => item.month)).toEqual(['Jul']);
    for (let month = 0; month < 12; month += 1) {
      const monthModel = helpers.calculateEcosystem(helpers.ecosystemMonthScenario(input, month));
      expect(run.timeline[month].temperature).toBe(monthModel.temperature);
      // Chemistry follows evolving opening biomass; disturbance input timing stays exact.
      if (month === 0) expect(run.timeline[month]).toMatchObject({ oxygen: monthModel.oxygen, ammonia: monthModel.ammonia, resilience: monthModel.resilience, status: monthModel.status });
    }
    expect(run.timeline[6].temperature).toBe(24);
    expect(JSON.stringify(input)).toBe(before);
  });

  it('reduces seasonal temperature variation in a contained system', async () => {
    await mount();
    const input = scenario({ environmentId: 'ras', organisms: { salmon: 1, nitrifiers: 2 } });
    const july = helpers.ecosystemMonthScenario(input, 6);
    expect(july.water.temperature).toBeCloseTo(14.08, 5);
    expect(july.disturbanceId).toBe('none');
    expect(july.organisms).toEqual(input.organisms);
  });

  it('reports species measurements and reference bands instead of an unexplained score', async () => {
    await mount();
    const input = scenario({ organisms: { mussel: 1 }, water: { ...referenceWater, temperature: 24, salinity: 10, oxygen: 2 } });
    const model = helpers.calculateEcosystem(input);
    const species = helpers.describeSpeciesSignals(input, model);
    expect(species).toHaveLength(1);
    expect(species[0]).toMatchObject({ id: 'mussel', name: 'Blue mussel', status: 'Investigate' });
    const signals = species[0].signals;
    const thermal = signals.find(item => /temperature/i.test(item.label));
    const salinity = signals.find(item => /salinity/i.test(item.label));
    const oxygen = signals.find(item => /oxygen/i.test(item.label));
    expect(thermal.value).toBe(24);
    expect(salinity.value).toBe(10);
    expect(oxygen.value).toBeCloseTo(model.preciseOxygen, 3);
    for (const signal of [thermal, salinity, oxygen]) {
      expect(signal.factor).toBeTruthy(); expect(signal.reference).toBeTruthy(); expect(signal.unit).toBeTruthy();
    }
    const normal = helpers.describeSpeciesSignals(scenario({ organisms: { mussel: 1 } }));
    expect(normal[0].status).toBe('Within reference bands');
    const mismatch = helpers.describeSpeciesSignals(scenario({ environmentId: 'raceway', organisms: { mussel: 1 } }));
    expect(mismatch[0].status).toBe('Investigate');
    expect(mismatch[0].signals.some(item => /placement|environment|system/i.test(item.label))).toBe(true);
  });

  it('keeps empty-community annual biomass, survival, effort, and harvest at zero', async () => {
    await mount();
    const run = helpers.simulateEcosystemYear(scenario({ organisms: {} }));
    expect(run.timeline).toHaveLength(12);
    for (const month of run.timeline) {
      expect(month).toMatchObject({ status: 'Empty', biomass: 0, survival: 0, effort: 0, harvestUnits: 0 });
    }
    expect(run.summary).toMatchObject({ endingBiomass: 0, survival: 0, operatingEffort: 0, harvestUnits: 0 });
  });

  it('offers reproducible redesigns that each change only one input and leave the draft untouched', async () => {
    await mount();
    const input = scenario({ organisms: { salmon: 3, nitrifiers: 2 }, environmentId: 'ras', observation: 'My own interpretation.', prediction: 'A prediction to preserve.', experiments: [{ id: 'existing-record' }] });
    const original = JSON.stringify(input);
    const designs = helpers.ecosystemRedesigns(input);
    expect(designs.length).toBeGreaterThan(0);
    expect(new Set(designs.map(item => item.id)).size).toBe(designs.length);
    for (const design of designs) {
      expect(design.title).toBeTruthy(); expect(design.detail).toBeTruthy(); expect(design.tradeoff).toBeTruthy();
      expect(helpers.ecosystemChanges(input, design.scenario)).toHaveLength(1);
      expect(design.changes).toEqual(helpers.ecosystemChanges(input, design.scenario));
      expect(design.scenario).not.toHaveProperty('experiments');
      expect(design.scenario).not.toHaveProperty('observation');
      expect(design.scenario).not.toHaveProperty('baselineScenario');
    }
    expect(JSON.stringify(input)).toBe(original);
    expect(helpers.ecosystemRedesigns(input)).toEqual(designs);
  });

  it('exports complete numeric timelines with scenario labels, units, and escaped event text', async () => {
    await mount();
    const a = helpers.simulateEcosystemYear(scenario());
    const b = helpers.simulateEcosystemYear(scenario({ disturbanceId: 'heatwave' }));
    const specialEvent = 'Storm, surge "classroom"\ncheck';
    b.timeline[9] = { ...b.timeline[9], event: specialEvent };
    const csv = helpers.ecosystemTimelineCsv(a, b);
    const rows = parseCsv(csv);
    expect(rows).toHaveLength(25);
    expect(rows[0]).toEqual(['Scenario', 'Month', 'Status', 'Event', 'Temperature (C)', 'Oxygen (mg/L)', 'Ammonia (mg/L)', 'Resilience index', 'Survival index (%)', 'Closing crop biomass index', 'Effort index', 'Newly ready units', 'Model version', 'Opening crop biomass index', 'Opening stocking pressure (/100)']);
    expect(rows.every(row => row.length === rows[0].length)).toBe(true);
    const data = rows.slice(1);
    const scenarioLabels = [...new Set(data.map(row => row[0]))];
    expect(scenarioLabels).toHaveLength(2);
    for (const label of scenarioLabels) expect(data.filter(row => row[0] === label)).toHaveLength(12);
    const julyB = data.find(row => row[1] === 'Jul' && row[3] === 'Marine heatwave');
    expect(julyB).toBeTruthy();
    expect(Number(julyB[4])).toBe(b.timeline[6].temperature);
    expect(Number(julyB[5])).toBe(b.timeline[6].oxygen);
    expect(Number(julyB[6])).toBe(b.timeline[6].ammonia);
    expect(Number(julyB[7])).toBe(b.timeline[6].resilience);
    expect(Number(julyB[8])).toBe(b.timeline[6].survival);
    expect(data.find(row => row[3] === specialEvent)).toBeTruthy();
    expect(parseCsv(helpers.ecosystemTimelineCsv(null, b))).toHaveLength(13);
  });

  it('uses native metric and month controls and inspects the selected month without modifying evidence', async () => {
    await mount(scenario({ disturbanceId: 'heatwave', observation: 'This unsaved explanation stays in place.' }));
    const explorer = host.querySelector('.aq-seasonal-explorer');
    expect(explorer).toBeTruthy();
    const metric = explorer.querySelector('#aq-season-metric');
    expect(metric.tagName).toBe('SELECT');
    expect(metric.labels.length || metric.getAttribute('aria-label') || metric.getAttribute('aria-labelledby')).toBeTruthy();
    expect(metric.value).toBe('oxygen');
    expect([...metric.options].map(option => option.value).sort()).toEqual(['oxygen', 'ammonia', 'resilience', 'temperature', 'biomass', 'survival', 'effort', 'carryingPressure'].sort());
    metric.focus(); expect(document.activeElement).toBe(metric);
    await select(metric, 'temperature');
    expect(metric.value).toBe('temperature');
    const july = findButton(explorer, 'Inspect Jul');
    expect(july.tagName).toBe('BUTTON'); expect(july.type).toBe('button');
    july.focus(); expect(document.activeElement).toBe(july);
    await click(july);
    expect(july.getAttribute('aria-pressed')).toBe('true');
    expect(explorer.querySelectorAll('button[aria-pressed="true"]')).toHaveLength(1);
    expect(explorer.querySelector('#aq-season-month-heading').textContent).toMatch(/^Jul · /);
    const inspection = explorer.querySelector('#aq-season-inspection');
    expect(inspection.textContent).toContain('Marine heatwave');
    expect(inspection.textContent).toContain('24');
    expect(inspection.textContent).toContain('Blue mussel');
    expect(inspection.textContent).toContain('Sugar kelp');
    await click(findButton(explorer, 'Inspect Jun'));
    expect(explorer.querySelector('#aq-season-month-heading').textContent).toMatch(/^Jun · /);
    expect(explorer.querySelector('#aq-season-inspection').textContent).not.toContain('Marine heatwave');
    expect(storedWorkspace().observation).toBe('This unsaved explanation stays in place.');
    expect(storedWorkspace().experiments).toEqual([]);
  });

  it.each([false, true])('applies a redesign with baseline present=%s while preserving all writing and saved evidence', async hasBaseline => {
    const starting = scenario();
    const baseline = hasBaseline ? scenario({ water: { ...referenceWater, oxygen: 7.4 } }) : null;
    const record = { id: 'kept-evidence', savedAt: 123, environmentId: 'longline', organisms: community, status: 'Stable', observation: 'Previous saved field explanation.' };
    await mount({ ...starting, baselineScenario: baseline, prediction: 'Changing only exchange should affect oxygen.', observation: 'My current reflection must survive the redesign.', evidence: { claim: 'A tentative claim', evidence: 'A previous measurement', reasoning: 'A possible mechanism', nextTest: 'Test one input' }, experiments: [record] });
    const before = storedWorkspace();
    const expectedCandidates = helpers.ecosystemRedesigns(before);
    const preview = host.querySelector('.aq-redesign-preview');
    expect(preview).toBeTruthy();
    const choice = preview.querySelector('#aq-redesign-choice');
    expect(choice.tagName).toBe('SELECT');
    const candidate = expectedCandidates.find(item => item.id === choice.value) || expectedCandidates[0];
    expect(candidate).toBeTruthy();
    await select(choice, candidate.id);
    expect(storedWorkspace()).toEqual(before);
    await click(findButton(preview, 'Apply preview as scenario B'));
    const after = storedWorkspace();
    expect(helpers.ecosystemChanges(before, after)).toHaveLength(1);
    expect(helpers.ecosystemChanges(candidate.scenario, after)).toEqual([]);
    expect(helpers.ecosystemChanges(hasBaseline ? before.baselineScenario : before, after.baselineScenario)).toEqual([]);
    expect(after.prediction).toBe(before.prediction);
    expect(after.observation).toBe(before.observation);
    expect(after.evidence).toEqual(before.evidence);
    expect(after.experiments).toEqual(before.experiments);
    expect(host.querySelector('#aq-eco-observation').value).toBe(before.observation);
  });
});
