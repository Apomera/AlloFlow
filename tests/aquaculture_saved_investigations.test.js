import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { React, ReactDOMClient, loadTool, makeCtx, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const { act } = React;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const storageKey = 'aquacultureLab.state.v1';
const water = { temperature: 14, salinity: 30, oxygen: 10, pH: 8, ammonia: .04, exchange: 82 };
const scenario = (patch = {}) => ({ environmentId: 'longline', organisms: { oyster: 2 }, water: { ...water }, disturbanceId: 'none', ...patch });
const savedAt = Date.parse('2026-10-02T12:00:00.000Z');
const reflection = { claim: 'A tentative claim.', evidence: 'Measurements from this original run.', reasoning: 'A proposed mechanism.', nextTest: 'Change only one input next time.' };
const summary = (patch = {}) => ({ endingBiomass: 13, survival: 72, minOxygen: 4.2, peakAmmonia: .37, averageResilience: 48, riskMonths: 6, harvestUnits: 1, operatingEffort: 39, hasCrop: true, species: [], ...patch });
const species = (id, name, patch = {}) => ({ id, name, initialBiomass: 2, endingBiomass: 11, survival: 41, warningMonths: 7, progress: 72, ready: false, fixedSupport: false, ...patch });
const comparison = (patch = {}) => ({
  id: 'archived-comparison', title: 'My original shellfish comparison', savedAt, kind: 'comparison', modelVersion: '2026.09-archive-test',
  environmentId: 'longline', organisms: { oyster: 2, mussel: 1, phytoplankton: 1 }, status: 'Watch', carryingPressure: 42, oxygen: 7.4, ammonia: .27, resilience: 63,
  baselineScenario: scenario({ organisms: { oyster: 2, kelp: 1, phytoplankton: 1 }, water: { ...water, oxygen: 9 } }),
  currentScenario: scenario({ organisms: { oyster: 2, mussel: 1, phytoplankton: 1 } }),
  baselineSummary: summary({ species: [
    species('oyster', 'Eastern oyster'),
    species('kelp', 'Sugar kelp', { initialBiomass: .25, endingBiomass: 2, survival: 97, progress: 100, ready: true }),
    species('phytoplankton', 'Phytoplankton community', { initialBiomass: 0, endingBiomass: 0, survival: null, progress: null, ready: false, fixedSupport: true })
  ] }),
  currentSummary: summary({ endingBiomass: 17, survival: 81, minOxygen: 5.1, peakAmmonia: .21, species: [
    species('oyster', 'Eastern oyster', { endingBiomass: 9, survival: 38, progress: 85 }),
    species('mussel', 'Blue mussel', { initialBiomass: .9, endingBiomass: 8, survival: 61, progress: 44 }),
    species('phytoplankton', 'Phytoplankton community', { initialBiomass: 0, endingBiomass: 0, survival: null, progress: null, ready: false, fixedSupport: true })
  ] }),
  prediction: 'My original prediction belongs to the saved inputs.', observation: 'My original interpretation belongs to these archived measurements.', evidence: { ...reflection },
  ...patch
});
const snapshot = (patch = {}) => ({ ...comparison(), id: 'archived-snapshot', title: 'My original site snapshot', kind: 'snapshot', baselineScenario: null, baselineSummary: null, currentSummary: null, snapshotFields: ['carryingPressure', 'oxygen', 'ammonia', 'resilience'], ...patch });

function deepFreeze(value) {
  Object.freeze(value);
  Object.values(value).forEach(item => { if (item && typeof item === 'object' && !Object.isFrozen(item)) deepFreeze(item); });
  return value;
}

const findButton = (host, label) => [...host.querySelectorAll('button')].find(item => item.textContent.trim() === label);
const parsedHtml = html => new DOMParser().parseFromString(html, 'text/html');
const textOf = html => parsedHtml(html).body.textContent.replace(/\s+/g, ' ').trim();

describe('Aquaculture original investigation archive and branching', () => {
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

  async function mount(workspace = scenario(), topic = 'ecosystem') {
    localStorage.setItem(storageKey, JSON.stringify({ lastTopic: topic, ecosystemWorkspace: workspace }));
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

  async function changeInput(element, value) {
    expect(element).toBeTruthy();
    const prototype = element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    await act(async () => {
      Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, value);
      element.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }

  const storedWorkspace = () => JSON.parse(localStorage.getItem(storageKey)).ecosystemWorkspace;
  const rowFor = (rows, id) => rows.find(item => item.id === id);

  it('aligns original A/B species, distinguishes stock changes, and never replaces archived results with a rerun', async () => {
    await mount();
    const record = deepFreeze(comparison());
    const original = JSON.stringify(record);
    const rows = helpers.ecosystemArchivedSpeciesRows(record);
    expect(rows.map(item => item.id).sort()).toEqual(['oyster', 'kelp', 'mussel', 'phytoplankton'].sort());
    const oyster = rowFor(rows, 'oyster');
    expect(oyster.a).toMatchObject({ state: 'recorded', data: { endingBiomass: 11, survival: 41, progress: 72 } });
    expect(oyster.b).toMatchObject({ state: 'recorded', data: { endingBiomass: 9, survival: 38, progress: 85 } });
    expect(oyster.delta).toMatchObject({ biomass: -2, survival: -3, progress: 13 });
    expect(rowFor(rows, 'kelp').a.state).toBe('recorded');
    expect(rowFor(rows, 'kelp').b).toEqual({ state: 'not-stocked', data: null });
    expect(rowFor(rows, 'mussel').a).toEqual({ state: 'not-stocked', data: null });
    expect(rowFor(rows, 'mussel').b.state).toBe('recorded');
    expect(rowFor(rows, 'kelp').delta?.survival ?? null).toBeNull();
    expect(rowFor(rows, 'mussel').delta?.survival ?? null).toBeNull();
    const support = rowFor(rows, 'phytoplankton');
    expect(support.a.data.fixedSupport).toBe(true);
    expect(support.b.data.survival).toBeNull();
    for (const field of ['biomass', 'survival', 'progress']) expect(support.delta?.[field] ?? null).toBeNull();
    expect(helpers.ecosystemArchivedSpeciesRows(record)).toEqual(rows);
    expect(JSON.stringify(record)).toBe(original);
  });

  it('keeps unrecorded legacy values distinct from absence and recorded zero or false', async () => {
    await mount();
    const record = comparison({ modelVersion: 'legacy', baselineSummary: summary({ species: [] }), currentSummary: summary({ species: [
      { id: 'oyster', name: 'Eastern oyster', initialBiomass: 2 },
      species('mussel', 'Blue mussel', { initialBiomass: .9, endingBiomass: 0, survival: 0, progress: 0, ready: false })
    ] }) });
    const rows = helpers.ecosystemArchivedSpeciesRows(record);
    expect(rowFor(rows, 'oyster').a).toEqual({ state: 'not-recorded', data: null });
    expect(rowFor(rows, 'kelp').a).toEqual({ state: 'not-recorded', data: null });
    expect(rowFor(rows, 'kelp').b.state).toBe('not-stocked');
    const oyster = rowFor(rows, 'oyster');
    expect(oyster.b.data).toMatchObject({ endingBiomass: null, survival: null, progress: null, ready: null });
    for (const field of ['biomass', 'survival', 'progress']) expect(oyster.delta?.[field] ?? null).toBeNull();
    expect(rowFor(rows, 'mussel').b.data).toMatchObject({ endingBiomass: 0, survival: 0, progress: 0, ready: false });
  });

  it('preserves partial scenario provenance and recorded outcomes without inventing saved inputs or absent stock', async () => {
    await mount();
    const raw = comparison({
      baselineScenario: {}, currentScenario: { environmentId: 'longline', organisms: { mussel: 1 }, water: { oxygen: 6 }, disturbanceId: 'none' },
      baselineSummary: summary({ species: [species('oyster', 'Eastern oyster')] }),
      currentSummary: summary({ minOxygen: 5.1, species: [species('mussel', 'Blue mussel', { endingBiomass: 8 })] })
    });
    const first = helpers.sanitizeEcosystemWorkspace({ ...scenario(), experiments: [raw] });
    const record = first.experiments[0];
    expect(record.baselineScenarioRecorded).toBe(false);
    expect(record.currentScenarioRecorded).toBe(false);
    const second = helpers.sanitizeEcosystemWorkspace(first);
    expect(second.experiments).toEqual(first.experiments);
    const rows = helpers.ecosystemArchivedSpeciesRows(second.experiments[0]);
    expect(rowFor(rows, 'oyster').a).toMatchObject({ state: 'recorded', data: { endingBiomass: 11 } });
    expect(rowFor(rows, 'oyster').b).toEqual({ state: 'not-recorded', data: null });
    expect(rowFor(rows, 'mussel').a).toEqual({ state: 'not-recorded', data: null });
    expect(rowFor(rows, 'mussel').b).toMatchObject({ state: 'recorded', data: { endingBiomass: 8 } });
    for (const row of rows) expect(row.delta).toBeNull();
    const html = helpers.ecosystemExperimentHtml(second.experiments[0]), document = parsedHtml(html), text = textOf(html);
    expect(text).toContain('Full settings were not recorded.');
    expect(text).toContain('Full A/B settings were not recorded.');
    expect(document.querySelectorAll('.aq-archive-settings')).toHaveLength(0);
    expect(text).not.toContain('No organisms');
    expect(text).not.toContain('Not stocked in these saved settings.');
    expect(text).toContain('4.2 mg/L');
    expect(text).toContain('5.1 mg/L');
    expect(text).toContain('11 index points');
    expect(text).toContain('8 index points');
  });

  it('requires every own saved input for scenario provenance and preserves an explicit unrecorded marker', async () => {
    await mount();
    const complete = scenario();
    const incomplete = ['environmentId', 'organisms', 'disturbanceId'].map(key => {
      const value = { ...complete }; delete value[key]; return value;
    });
    for (const field of Object.keys(water)) {
      const value = { ...complete, water: { ...water } }; delete value.water[field]; incomplete.push(value);
    }
    incomplete.push({ ...complete, water: { ...water, oxygen: NaN } });
    incomplete.push({ ...complete, water: { ...water, ammonia: Infinity } });
    incomplete.push(Object.assign(Object.create({ environmentId: complete.environmentId }), { organisms: { ...complete.organisms }, water: { ...water }, disturbanceId: complete.disturbanceId }));
    const inheritedWater = { ...water }; delete inheritedWater.oxygen;
    incomplete.push({ ...complete, water: Object.assign(Object.create({ oxygen: water.oxygen }), inheritedWater) });
    for (const partial of incomplete) {
      const clean = helpers.sanitizeEcosystemWorkspace({ ...scenario(), experiments: [comparison({ baselineScenario: partial, currentScenario: partial })] }).experiments[0];
      expect(clean.baselineScenarioRecorded).toBe(false);
      expect(clean.currentScenarioRecorded).toBe(false);
    }
    const completeRecord = helpers.sanitizeEcosystemWorkspace({ ...scenario(), experiments: [comparison()] }).experiments[0];
    expect(completeRecord.baselineScenarioRecorded).toBe(true);
    expect(completeRecord.currentScenarioRecorded).toBe(true);
    const marked = helpers.sanitizeEcosystemWorkspace({ ...scenario(), experiments: [{ ...completeRecord, baselineScenarioRecorded: false, currentScenarioRecorded: false }] });
    expect(marked.experiments[0].baselineScenarioRecorded).toBe(false);
    expect(marked.experiments[0].currentScenarioRecorded).toBe(false);
    expect(helpers.sanitizeEcosystemWorkspace(marked).experiments).toEqual(marked.experiments);
    expect(parsedHtml(helpers.ecosystemExperimentHtml(marked.experiments[0])).querySelectorAll('.aq-archive-settings')).toHaveLength(0);
  });

  it('does not offer replay or a new baseline from a partially recorded B design', async () => {
    await mount({ ...scenario(), observation: 'This current draft must survive inspecting an incomplete archived design.', evidence: { ...reflection }, experiments: [comparison({ currentScenario: {} })] });
    const before = JSON.parse(JSON.stringify(storedWorkspace()));
    expect(before.experiments[0].baselineScenarioRecorded).toBe(true);
    expect(before.experiments[0].currentScenarioRecorded).toBe(false);
    const record = host.querySelector('.aq-experiment-record');
    expect([...record.querySelectorAll('button')].filter(button => /^(?:Replay experiment|Use saved B as A|Use saved design as A)$/.test(button.textContent.trim()))).toHaveLength(0);
    expect(record.textContent).toMatch(/full settings were not stored.{0,50}replay is unavailable/i);
    const bSettings = [...record.querySelectorAll('h5')].find(heading => heading.textContent === 'Saved B settings').parentElement;
    expect(bSettings.querySelector('dl')).toBeNull();
    expect(bSettings.textContent).toContain('Full settings were not recorded.');
    expect(storedWorkspace()).toEqual(before);
    expect(findButton(host, 'Return to my draft')).toBeUndefined();
  });

  it('replays a complete saved B without inventing a baseline from partial A settings', async () => {
    const draft = { ...scenario(), baselineScenario: scenario({ water: { ...water, oxygen: 8 } }), prediction: 'This existing draft prediction remains recoverable.', observation: 'This existing draft explanation must be restored after inspecting the archive.', evidence: { ...reflection }, experiments: [comparison({ baselineScenario: {} })] };
    await mount(draft);
    const before = JSON.parse(JSON.stringify(storedWorkspace()));
    expect(before.experiments[0].baselineScenarioRecorded).toBe(false);
    expect(before.experiments[0].currentScenarioRecorded).toBe(true);
    await click(findButton(host, 'Replay experiment'));
    const replayed = storedWorkspace();
    expect(helpers.ecosystemChanges(before.experiments[0].currentScenario, replayed)).toEqual([]);
    expect(replayed.baselineScenario).toBeNull();
    expect(replayed.prediction).toBe(before.experiments[0].prediction);
    expect(replayed.experiments).toEqual(before.experiments);
    for (const field of ['baselineScenario', 'prediction', 'observation', 'evidence', 'environmentId', 'organisms', 'water']) expect(replayed.parkedDraft[field], field).toEqual(before[field]);
    await click(findButton(host, 'Return to my draft'));
    expect(storedWorkspace()).toEqual(before);
  });

  it('shows the saved investigation name and unknown original status in the Home notebook without CER', async () => {
    const record = snapshot({ title: 'My named visit with no original status', evidence: {} });
    delete record.status;
    await mount({ ...scenario(), experiments: [record] }, 'home');
    const notebook = host.querySelector('.aq-notebook-card');
    expect(notebook).toBeTruthy();
    expect(notebook.querySelector('article h3').textContent).toBe(record.title);
    expect(notebook.textContent).toContain('Status not recorded');
    expect(notebook.textContent).not.toMatch(/\bWatch\b/);
    expect(storedWorkspace().experiments[0].statusRecorded).toBe(false);
  });

  it('tracks which original snapshot readings exist through repeated sanitization', async () => {
    await mount();
    const raw = { id: 'partial-legacy-snapshot', kind: 'snapshot', savedAt, environmentId: 'longline', organisms: { oyster: 1 }, status: 'Watch', oxygen: 7.4, carryingPressure: null, ammonia: 'unavailable', resilience: Infinity, observation: 'Only oxygen was recorded in this older visit.' };
    const first = helpers.sanitizeEcosystemWorkspace({ ...scenario(), experiments: [raw] });
    expect(first.experiments[0].snapshotFields).toEqual(['oxygen']);
    expect(first.experiments[0].status).toBe('Watch');
    expect(first.experiments[0].statusRecorded).toBe(true);
    const second = helpers.sanitizeEcosystemWorkspace(first);
    expect(second.experiments).toEqual(first.experiments);
    const exported = textOf(helpers.ecosystemExperimentHtml(second.experiments[0]));
    expect(exported).toContain('7.4 mg/L');
    expect(exported).toContain('Watch');
    expect(exported).not.toContain('0 mg/L');
    expect(exported).not.toMatch(/0\s*\/\s*100/);
    const zero = helpers.sanitizeEcosystemWorkspace({ ...scenario(), experiments: [{ ...raw, oxygen: 0 }] }).experiments[0];
    expect(zero.snapshotFields).toEqual(['oxygen']);
    expect(textOf(helpers.ecosystemExperimentHtml(zero))).toContain('0 mg/L');
    const missingStatusRaw = { ...raw };
    delete missingStatusRaw.status;
    const missingStatus = helpers.sanitizeEcosystemWorkspace({ ...scenario(), experiments: [missingStatusRaw] }).experiments[0];
    expect(missingStatus.statusRecorded).toBe(false);
    expect(helpers.sanitizeEcosystemWorkspace({ ...scenario(), experiments: [missingStatus] }).experiments[0].statusRecorded).toBe(false);
    expect(textOf(helpers.ecosystemExperimentHtml(missingStatus))).toMatch(/status.{0,30}not recorded|not recorded.{0,30}status/i);
    const inheritedReading = Object.assign(Object.create({ oxygen: 7.4 }), { id: 'inherited-reading', kind: 'snapshot', status: 'Watch' });
    expect(helpers.sanitizeEcosystemWorkspace({ ...scenario(), experiments: [inheritedReading] }).experiments[0].snapshotFields).toEqual([]);
  });

  it('exports escaped standalone original A/B evidence with physical units and a valid saved date', async () => {
    await mount();
    const record = deepFreeze(comparison({ title: '<img src="x" onerror="alert(1)"> Original trial', observation: '<script>alert("draft")</script> belongs to the original record.', evidence: { ...reflection, claim: '<b>My original claim</b>' } }));
    const original = JSON.stringify(record);
    const html = helpers.ecosystemExperimentHtml(record), document = parsedHtml(html), text = textOf(html);
    expect(document.querySelector('title').textContent).toContain(record.title);
    expect(document.querySelector('script, img[src="x"]')).toBeNull();
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&lt;b&gt;My original claim&lt;/b&gt;');
    expect(text).toContain(record.modelVersion);
    expect(text).toMatch(/10\/2\/2026|2026-10-02|Oct(?:ober)?\D+2/);
    expect(text).toMatch(/(?:Scenario|Saved|Original) A/);
    expect(text).toMatch(/(?:Scenario|Saved|Original) B/);
    for (const name of ['Eastern oyster', 'Sugar kelp', 'Blue mussel', 'Phytoplankton']) expect(text).toContain(name);
    expect(text).toContain('4.2 mg/L');
    expect(text).toContain('5.1 mg/L');
    expect(text).toContain(record.prediction);
    expect(text).toContain(record.evidence.reasoning);
    expect(JSON.stringify(record)).toBe(original);
    expect(() => helpers.ecosystemExperimentHtml({ ...record, savedAt: Number.MAX_VALUE })).not.toThrow();
    expect(textOf(helpers.ecosystemExperimentHtml({ ...record, savedAt: Number.MAX_VALUE }))).not.toMatch(/Invalid Date|NaN/);
  });

  it.each(['comparison', 'snapshot'])('exports a %s report with a complete heading hierarchy and wrapping for long names', async kind => {
    await mount();
    const title = 'X'.repeat(80);
    const record = kind === 'comparison' ? comparison({ title }) : snapshot({ title });
    const document = parsedHtml(helpers.ecosystemExperimentHtml(record));
    const report = document.querySelector('.aq-archive-report');
    expect(report.querySelectorAll('h1')).toHaveLength(1);
    expect(report.querySelector('header > h1').textContent).toBe(title);
    const sections = [...report.children].filter(element => element.tagName === 'SECTION');
    expect(sections.length).toBeGreaterThan(0);
    for (const section of sections) expect(section.firstElementChild.tagName).toBe('H2');
    if (kind === 'comparison') {
      const speciesSections = [...report.querySelectorAll('.aq-archive-species')];
      expect(speciesSections.length).toBeGreaterThan(0);
      for (const section of speciesSections) {
        expect(section.firstElementChild.tagName).toBe('H3');
        for (const side of section.querySelectorAll('.aq-archive-sides > section')) expect(side.firstElementChild.tagName).toBe('H4');
      }
    }
    let previousLevel = 0;
    for (const heading of report.querySelectorAll('h1,h2,h3,h4,h5,h6')) {
      const level = Number(heading.tagName.slice(1));
      expect(level, heading.textContent).toBeLessThanOrEqual(previousLevel + 1);
      previousLevel = level;
    }
    const wrapRules = [...document.querySelector('style').textContent.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .filter(([, , declarations]) => /overflow-wrap\s*:\s*anywhere/.test(declarations));
    for (const heading of ['h1', 'h2', 'h3', 'h4']) {
      expect(wrapRules.some(([, selectors]) => selectors.split(',').map(item => item.trim()).some(selector => selector === 'body' || selector === heading)), heading).toBe(true);
    }
  });

  it('describes a snapshot as a direct preview without suggesting that comparison inputs were lost', async () => {
    await mount();
    const html = helpers.ecosystemExperimentHtml(snapshot()), document = parsedHtml(html), text = textOf(html);
    expect(text).toMatch(/direct model preview/i);
    expect(text).toMatch(/not an? A\/B comparison/i);
    const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(heading => heading.textContent);
    expect(headings).toContain('Saved snapshot outputs');
    expect(headings).toContain('Saved snapshot settings');
    expect(headings).not.toContain('Changed inputs');
    expect(headings).not.toContain('Saved A settings');
    expect(headings).not.toContain('Saved B settings');
    expect(text).not.toMatch(/Full A\/B settings were not (?:stored|recorded)|comparison inputs.{0,40}(?:missing|not recorded)/i);
    expect(text).toContain('7.4 mg/L');
    expect(textOf(helpers.ecosystemExperimentHtml(comparison()))).toContain('Changed inputs');
  });

  it('renames one archived investigation accessibly without trimming each keystroke or rewriting its evidence', async () => {
    await mount({ ...scenario(), experiments: [comparison()] });
    const before = JSON.parse(JSON.stringify(storedWorkspace().experiments[0]));
    const input = [...host.querySelectorAll('.aq-experiment-record input')].find(item => [...(item.labels || [])].some(label => /investigation name/i.test(label.textContent)));
    expect(input).toBeTruthy();
    expect(input.maxLength).toBe(80);
    const title = '  My oyster evidence trial  ';
    await changeInput(input, title);
    const updated = storedWorkspace().experiments[0];
    expect(updated.title).toBe(title);
    expect(input.value).toBe(title);
    expect({ ...updated, title: before.title }).toEqual(before);
    const portfolio = helpers.buildLearningPortfolio({ ecosystemWorkspace: storedWorkspace() }, [], []);
    const merged = helpers.mergeLearningPortfolio({}, JSON.parse(JSON.stringify(portfolio)), []);
    expect(merged.ecosystemWorkspace.experiments).toEqual([updated]);
    const capped = helpers.sanitizeEcosystemWorkspace({ ...scenario(), experiments: [{ ...updated, title: 'X'.repeat(95) }] });
    expect(capped.experiments[0].title).toHaveLength(80);
  });

  it('gives each investigation name input a distinct accessible name from its label and record heading', async () => {
    const records = [comparison(), snapshot()];
    await mount({ ...scenario(), experiments: records });
    const names = [], associatedIds = [];
    for (const record of records) {
      const article = [...host.querySelectorAll('.aq-experiment-record')].find(element => element.dataset.experimentId === record.id);
      const input = article.querySelector('.aq-record-name-label input'), heading = article.querySelector('h4');
      const ids = (input.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean);
      expect(ids).toHaveLength(2);
      const references = ids.map(id => [...host.querySelectorAll('[id]')].filter(element => element.id === id));
      for (const matches of references) {
        expect(matches).toHaveLength(1);
        expect(article.contains(matches[0])).toBe(true);
      }
      expect(references[0][0].textContent).toBe('Investigation name');
      expect(references[1][0]).toBe(heading);
      expect(heading.textContent).toBe(record.title);
      names.push(references.map(matches => matches[0].textContent.trim()).join(' '));
      associatedIds.push(input.id, ...ids);
    }
    expect(new Set(associatedIds).size).toBe(associatedIds.length);
    expect(new Set(names).size).toBe(records.length);
    for (let index = 0; index < records.length; index++) expect(names[index]).toBe('Investigation name ' + records[index].title);
  });

  it.each(['comparison', 'snapshot'])('branches a new A from original %s inputs, parks the entire draft, and restores it without changing the record', async kind => {
    const record = kind === 'comparison' ? comparison() : snapshot();
    const draft = scenario({ environmentId: 'raceway', organisms: { trout: 2, nitrifiers: 1 }, water: { ...water, temperature: 12, salinity: 1, oxygen: 11, pH: 7.5 }, disturbanceId: 'pump', baselineScenario: scenario({ environmentId: 'raceway', organisms: { trout: 1 }, water: { ...water, temperature: 11, salinity: 1 } }), observation: 'Keep this unfinished explanation while I start a different investigation.', prediction: 'My unfinished prediction belongs to the current draft.', evidence: { ...reflection }, experiments: [record] });
    await mount(draft);
    const before = JSON.parse(JSON.stringify(storedWorkspace()));
    await click(findButton(host, kind === 'comparison' ? 'Use saved B as A' : 'Use saved design as A'));
    const branched = storedWorkspace();
    expect(branched.baselineScenario).toEqual(before.experiments[0].currentScenario);
    expect(helpers.ecosystemChanges(branched.baselineScenario, branched)).toEqual([]);
    expect(branched.prediction).toBe('');
    expect(branched.observation).toBe('');
    expect(branched.investigationId).toBe('');
    expect(branched.evidence).toEqual({ claim: '', evidence: '', reasoning: '', nextTest: '' });
    expect(branched.experiments).toEqual(before.experiments);
    expect(host.querySelector('#aq-investigation-heading').textContent).toBe('Change one input');
    for (const key of ['environmentId', 'organisms', 'water', 'disturbanceId', 'baselineScenario', 'prediction', 'observation', 'evidence', 'investigationId']) expect(branched.parkedDraft[key], key).toEqual(before[key]);
    await click(findButton(host, 'Return to my draft'));
    const restored = storedWorkspace();
    for (const key of ['environmentId', 'organisms', 'water', 'disturbanceId', 'baselineScenario', 'prediction', 'observation', 'evidence', 'investigationId']) expect(restored[key], key).toEqual(before[key]);
    expect(restored.parkedDraft).toBeNull();
    expect(restored.experiments).toEqual(before.experiments);
  });

  it('guards an earlier parked draft instead of replacing it with another archive branch', async () => {
    const parked = { ...scenario({ organisms: { kelp: 1 } }), observation: 'This earlier parked design and writing must remain recoverable.', prediction: 'My earlier prediction.', evidence: { ...reflection } };
    await mount({ ...scenario(), parkedDraft: parked, experiments: [comparison()] });
    const before = JSON.parse(JSON.stringify(storedWorkspace()));
    const branch = findButton(host, 'Use saved B as A');
    expect(branch).toBeTruthy();
    expect(branch.disabled).toBe(true);
    await act(async () => { branch.click(); });
    expect(storedWorkspace()).toEqual(before);
    await click(findButton(host, 'Return to my draft'));
    expect(storedWorkspace().observation).toBe(parked.observation);
    expect(storedWorkspace().experiments).toEqual(before.experiments);
  });

  it('disables replay while a branch is parked and preserves both new branch writing and the recoverable draft', async () => {
    const draft = { ...scenario(), prediction: 'Keep the earlier draft prediction.', observation: 'Keep the earlier draft explanation while another saved design is open.', evidence: { ...reflection }, experiments: [comparison(), snapshot()] };
    await mount(draft);
    const original = JSON.parse(JSON.stringify(storedWorkspace()));
    await click(findButton(host, 'Use saved B as A'));
    const observation = 'This newly written explanation belongs to the current branch and must not be replaced by replay.';
    const claim = 'This is the latest branch claim, still awaiting evidence.';
    await changeInput(host.querySelector('#aq-eco-observation'), observation);
    await changeInput(host.querySelector('#aq-eco-evidence-claim'), claim);
    const branch = JSON.parse(JSON.stringify(storedWorkspace()));
    expect(branch.observation).toBe(observation);
    expect(branch.evidence.claim).toBe(claim);
    expect(branch.parkedDraft.observation).toBe(original.observation);
    expect(branch.parkedDraft.evidence).toEqual(original.evidence);
    const replayButtons = [...host.querySelectorAll('button')].filter(button => button.textContent.trim() === 'Replay experiment');
    expect(replayButtons).toHaveLength(2);
    for (const replay of replayButtons) {
      expect(replay.disabled).toBe(true);
      const note = [...host.querySelectorAll('[id]')].find(element => element.id === replay.getAttribute('aria-describedby'));
      expect(note?.textContent).toMatch(/return to your draft before replaying/i);
      await act(async () => { replay.click(); });
      expect(storedWorkspace()).toEqual(branch);
    }
    await click(findButton(host, 'Return to my draft'));
    const restored = storedWorkspace();
    for (const field of ['prediction', 'observation', 'evidence', 'environmentId', 'organisms', 'water']) expect(restored[field], field).toEqual(original[field]);
    expect(restored.experiments).toEqual(original.experiments);
    expect(restored.parkedDraft).toBeNull();
  });

  it('returns to explanation when a new structured claim is drafted after saving a comparison', async () => {
    const a = scenario({ water: { ...water, oxygen: 9 } });
    await mount({ ...scenario(), baselineScenario: a, prediction: 'Higher reference oxygen should change the oxygen signal.', observation: 'This explanation belongs to the first saved comparison and its original readings.' });
    await click(findButton(host, 'Save A/B comparison'));
    expect(host.querySelector('#aq-investigation-heading').textContent).toBe('Evidence saved');
    const records = JSON.parse(JSON.stringify(storedWorkspace().experiments));
    expect(storedWorkspace().observation).toBe('');
    const newClaim = 'This new claim is a draft and is not in the original evidence record.';
    await changeInput(host.querySelector('#aq-eco-evidence-claim'), newClaim);
    expect(host.querySelector('#aq-investigation-heading').textContent).toBe('Compare & explain');
    expect(storedWorkspace().evidence.claim).toBe(newClaim);
    expect(storedWorkspace().experiments).toEqual(records);
  });

  it.each(['prediction', 'investigationId'])('does not mark a changed %s as archived merely because model inputs match', async field => {
    const record = comparison({ modelVersion: '2026.10-stock-feedback', investigationId: 'oxygen-buffer' });
    const workspace = { ...record.currentScenario, baselineScenario: record.baselineScenario, prediction: record.prediction, investigationId: record.investigationId, experiments: [record], observation: '', evidence: { claim: '', evidence: '', reasoning: '', nextTest: '' } };
    workspace[field] = field === 'prediction' ? 'This is a different prediction requiring its own explanation.' : 'flow-response';
    await mount(workspace);
    expect(helpers.ecosystemChanges(storedWorkspace(), storedWorkspace().experiments[0].currentScenario)).toEqual([]);
    expect(host.querySelector('#aq-investigation-heading').textContent).toBe('Compare & explain');
    expect(storedWorkspace().experiments[0].prediction).toBe(record.prediction);
    expect(storedWorkspace().experiments[0].investigationId).toBe(record.investigationId);
  });

  it('stores all current snapshot readings with their presence metadata and original model status', async () => {
    await mount({ ...scenario(), observation: 'This snapshot records the direct preview readings and their exact units.' });
    const originalModel = helpers.calculateEcosystem(storedWorkspace());
    await click(findButton(host, 'Save snapshot evidence'));
    const record = storedWorkspace().experiments[0];
    expect(record.kind).toBe('snapshot');
    expect([...record.snapshotFields].sort()).toEqual(['carryingPressure', 'oxygen', 'ammonia', 'resilience'].sort());
    expect(record.status).toBe(originalModel.status);
    expect(record.statusRecorded).toBe(true);
    for (const field of record.snapshotFields) expect(record[field], field).toBe(originalModel[field]);
    const exported = textOf(helpers.ecosystemExperimentHtml(record));
    expect(exported).toContain(record.status);
    expect(exported).toContain(record.oxygen + ' mg/L');
    expect(exported).toContain(record.ammonia + ' mg/L');
  });
});
