// STEM screens and quests that read a field their tool never writes (2026-09-24).
//
// A teacher can add a tool's questHooks to a station. Four checked a field the
// tool never writes, so the quest stayed at 0 however much a student explored:
//   DNA "Explore 3 DNA lab modes"           read tabsViewed; the tool writes visitedTabs
//   Climate "Explore 3 ... sections"        read tabsViewed; the tool writes tabsVisited
//                                           (its label also said "all" of six sections)
//   Epidemic "Explore 3 ... model views"    read tabsViewed; nothing recorded views
//   Titration "Try 2 titration setups"      read presetsUsed; nothing recorded setups
// Solar System saves each sample as a journal entry of kind 'Sample', but its
// dashboard and the teacher's progress CSV counted collectedSamples: always 0.
// Each test drives the REAL tool (clicks or renders), then reads the state the
// tool actually wrote.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { loadTool, resetStemLab, newStore, makeCtx, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

const req = createRequire(import.meta.url);
const { act } = req(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/test-utils'));
vi.setConfig({ testTimeout: 120000 });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let mounted = null;
afterEach(() => { if (mounted) { mounted.unmount(); mounted = null; } vi.useRealTimers(); });

function mountStem(file, toolId, key, seed, extra) {
  resetStemLab();
  loadTool(file, toolId);
  const cfg = window.StemLab._registry[toolId];
  const store = newStore({ [key]: Object.assign({}, seed) });
  store.labToolData = { [key]: Object.assign({}, seed) };
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = ReactDOMClient.createRoot(container);
  // The host's signatures (stem_lab_module.js): update(toolId, key, val), updateMulti(toolId, obj).
  const hostUpdateMulti = (id, obj) => { store.toolData = Object.assign({}, store.toolData, { [id]: Object.assign({}, store.toolData[id], obj) }); };
  const hostUpdate = (id, k, v) => hostUpdateMulti(id, { [k]: v });
  const Host = () => cfg.render(makeCtx(Object.assign({ toolData: store.toolData, labToolData: store.labToolData, update: hostUpdate, updateMulti: hostUpdateMulti }, extra), store));
  const render = () => act(() => { root.render(React.createElement(Host)); });
  render();
  // Whichever store the tool wrote to, merged over the seed.
  const state = () => Object.assign({}, seed, (store.toolData || {})[key], (store.labToolData || {})[key]);
  const hook = (id) => cfg.questHooks.find((h) => h.id === id);
  const click = (el) => { act(() => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true })); }); render(); };
  mounted = { unmount: () => { act(() => root.unmount()); container.remove(); } };
  return { container, render, state, hook, click, store };
}

describe('STEM quest hooks read what their tool writes', () => {
  it('DNA: three tab switches complete "Explore 3 DNA lab modes"', () => {
    const m = mountStem('stem_lab/stem_tool_dna.js', 'dnaLab', 'dnaLab', { tab: 'build' });
    const h = m.hook('explore_3_tabs');
    expect(h.check(m.state())).toBe(false);
    m.click(m.container.querySelector('#dna-tab-replicate'));
    m.click(m.container.querySelector('#dna-tab-transcribe'));
    expect(Object.keys(m.state().visitedTabs)).toEqual(expect.arrayContaining(['build', 'replicate', 'transcribe']));
    expect(h.check(m.state())).toBe(true);
    expect(h.progress(m.state())).toBe('3/3 modes');
  });

  it('Climate Explorer: three sections complete its quest, and the label says three', () => {
    const said = [];
    const m = mountStem('stem_lab/stem_tool_climateExplorer.js', 'climateExplorer', 'climateExplorer', {}, { announceToSR: (msg) => said.push(msg) });
    const h = m.hook('view_all_tabs');
    expect(h.label).toBe('Explore 3 Climate Explorer sections');
    ['carbon', 'renewables', 'keeling'].forEach((id) => m.click(m.container.querySelector('#ce-tab-' + id)));
    expect(Object.keys(m.state().tabsVisited || {}).length).toBeGreaterThanOrEqual(3);
    expect(h.check(m.state())).toBe(true);
    // A screen reader heard "undefined section." here: the handler read t.label with t the translator.
    expect(said).toEqual(expect.arrayContaining(['Renewables section.', 'Keeling Curve section.']));
    expect(said.join(' ')).not.toContain('undefined');
  });

  it('Epidemic: each model view opened is recorded once, however it was opened', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const m = mountStem('stem_lab/stem_tool_epidemic.js', 'epidemicSim', 'epidemicSim', { tab: 'sir' });
    const h = m.hook('view_3_tabs');
    ['seir', 'vaccination'].forEach((tab) => {
      act(() => { vi.runOnlyPendingTimers(); });
      m.store.toolData.epidemicSim = Object.assign({}, m.store.toolData.epidemicSim, { tab });
      m.render();
    });
    act(() => { vi.runOnlyPendingTimers(); });
    m.render();
    act(() => { vi.runOnlyPendingTimers(); });
    expect(m.state().tabsViewed).toEqual({ sir: true, seir: true, vaccination: true });
    expect(h.check(m.state())).toBe(true);
    expect(h.progress(m.state())).toBe('3/3 views');
  });

  it('DNA: applying a mutation completes "Create a DNA mutation" (it read mutationApplied; the tool logs mutationLog)', () => {
    const m = mountStem('stem_lab/stem_tool_dna.js', 'dnaLab', 'dnaLab', { tab: 'mutate' });
    const h = m.hook('mutate');
    expect(h.check(m.state())).toBe(false);
    const sub = Array.from(m.container.querySelectorAll('button')).find((b) => /Substitution/.test(b.textContent));
    expect(sub, 'substitution button').toBeTruthy();
    m.click(sub);
    expect((m.state().mutationLog || []).length).toBe(1);
    expect(h.check(m.state())).toBe(true);
    expect(h.progress(m.state())).toBe('Mutated!');
  });

  it('Climate Explorer: moving a mix slider completes "Design a renewable energy mix" (it read renewablesDesigned)', () => {
    const m = mountStem('stem_lab/stem_tool_climateExplorer.js', 'climateExplorer', 'climateExplorer', { tab: 'renewables' });
    const h = m.hook('explore_renewables');
    expect(h.check(m.state())).toBe(false);
    const solar = m.container.querySelector('input[aria-label="Solar slider"]');
    expect(solar, 'Solar slider').toBeTruthy();
    const setValue = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    act(() => { setValue.call(solar, '40'); solar.dispatchEvent(new window.Event('input', { bubbles: true })); });
    m.render();
    expect(m.state().rsSolar).toBe(40);
    expect(h.check(m.state())).toBe(true);
  });

  it('Titration: switching setups completes "Try 2 titration setups"', () => {
    const m = mountStem('stem_lab/stem_tool_titration.js', 'titrationLab', 'titrationLab', { safetyChecked: true }); // past the PPE check, at the bench
    const h = m.hook('try_2_setups');
    expect(h.check(m.state())).toBe(false);
    const buttons = Array.from(m.container.querySelectorAll('button[aria-label^="Select titration preset: "]'));
    expect(buttons.length, m.container.textContent.slice(0, 600)).toBeGreaterThanOrEqual(2);
    m.click(buttons.find((b) => b.getAttribute('aria-pressed') !== 'true'));
    expect(Object.keys(m.state().presetsUsed || {})).toHaveLength(2);
    expect(h.check(m.state())).toBe(true);
  });
});

// Eight STEM badge helpers copied the render-time badge map, so a second award in the
// same handler replaced the first (the student saw both toasts and kept one badge).
describe('badges earned together are all kept', () => {
  it('DNA: a fast replication keeps "Copy Machine" and "Speed Demon"', () => {
    const m = mountStem('stem_lab/stem_tool_dna.js', 'dnaLab', 'dnaLab', { tab: 'replicate', replPlaying: true, replStep: 9999, speed: 4 });
    expect(Object.keys(m.state().badges || {}).sort()).toEqual(expect.arrayContaining(['copyMachine', 'speedDemon']));
  });

  const HELPERS = ['anatomy', 'autorepair', 'fireecology', 'firstresponse', 'learning_lab', 'printingpress', 'renewables'];
  it.each(HELPERS)('%s keeps its render copy current after each award', (tool) => {
    const lines = readFileSync(resolve(process.cwd(), `stem_lab/stem_tool_${tool}.js`), 'utf8').split('\n');
    const i = lines.findIndex((l) => /var (\w+) = Object\.assign\(\{\}, *badges(?:, *\{ *\})?\);/.test(l));
    const v = lines[i].match(/var (\w+) =/)[1];
    const save = lines.findIndex((l, j) => j > i && j < i + 12 && new RegExp(`upd\\('_?badges',\\s*${v}\\s*\\);`).test(l));
    expect(save).toBeGreaterThan(i);
    expect(lines[save + 1].trim().startsWith(`badges = ${v};`)).toBe(true);
  });
});

describe('Solar System counts the samples it saved', () => {
  const sample = (planet, name) => ({ planet, source: 'drone', kind: 'Sample', title: name, observation: name, timestamp: 1 });
  const journal = [sample('Mars', 'Basalt'), sample('Mars', 'Hematite'), sample('Venus', 'Sulfuric haze'),
    { planet: 'Mars', source: 'drone', kind: 'Photo', title: 'Olympus Mons', observation: 'x', timestamp: 2 }];

  it('the overview card counts them', () => {
    const names = { 'stem.solar_sys.mars': 'Mars', 'stem.solar_sys.venus': 'Venus' };
    const m = mountStem('stem_lab/stem_tool_solarsystem.js', 'solarSystem', 'solarSystem', { journalEntries: journal }, { t: (k, fb) => names[k] || fb || k });
    const card = Array.from(m.container.querySelectorAll('div')).find((el) => el.children.length === 3 && el.firstElementChild.textContent === 'Samples + notes');
    expect(card, 'Samples + notes card').toBeTruthy();
    expect(card.children[1].textContent).toBe('3 / 4');
  });

  it('the teacher progress CSV reports them, in total and per planet', () => {
    let csv = '';
    const RealBlob = globalThis.Blob;
    const savedUrl = { create: URL.createObjectURL, revoke: URL.revokeObjectURL };
    globalThis.Blob = function (parts, opts) { csv = parts.join(''); return new RealBlob(parts, opts); };
    URL.createObjectURL = () => 'blob:csv'; URL.revokeObjectURL = () => {};
    try {
      // The export sits in the planet panel, which needs a selected planet.
      // Planet names are translation keys with no English fallback, so name the two used here.
      const names = { 'stem.solar_sys.mars': 'Mars', 'stem.solar_sys.venus': 'Venus' };
      const m = mountStem('stem_lab/stem_tool_solarsystem.js', 'solarSystem', 'solarSystem', { journalEntries: journal, selectedPlanet: 'Mars' },
        { t: (k, fb) => names[k] || fb || k });
      const exportButton = Array.from(m.container.querySelectorAll('button')).find((b) => /Export Progress \(CSV\)/.test(b.textContent));
      expect(exportButton, 'export button in the Mars panel').toBeTruthy();
      m.click(exportButton);
      expect(csv).toContain('"Samples Collected","3",""');
      expect(csv).toMatch(/"Mars","(Not visited|Visited)","Samples: 2, Journal: 3"/);
      expect(csv).toMatch(/"Venus","(Not visited|Visited)","Samples: 1, Journal: 1"/);
    } finally {
      globalThis.Blob = RealBlob; URL.createObjectURL = savedUrl.create; URL.revokeObjectURL = savedUrl.revoke;
    }
  });
});
