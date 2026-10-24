import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

// Compare the existing field-guide evidence without changing a learner's
// discoveries, bookmarks, collection filters, or an unfinished practice round.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const act = React.act;
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
const mounted = [];
let X, TX, profiles;

beforeEach(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  window.THREE = { stub: true };
  window.Reef3DSpecies = { version: '1.0.0', create: vi.fn(() => ({})) };
  window.Reef3DExplore = { version: '1.0.0', mount: vi.fn() };
  loadTool(TOOL, 'coralReef');
  X = window.__RR_TEST_EXPORTS__.coralReef;
  TX = X.speciesText((key, fallback) => fallback);
  profiles = X.marineProfiles((key, fallback) => fallback);
});

afterEach(async () => {
  while (mounted.length) {
    const item = mounted.pop();
    await act(async () => item.root.unmount());
    item.host.remove();
  }
  delete window.Reef3DExplore;
  delete window.Reef3DSpecies;
  delete window.THREE;
  vi.restoreAllMocks();
});

async function mountTool(seed = {}, extra = {}) {
  let data = { coralReef: { section: 'guide', ...seed } };
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const cfg = window.StemLab._registry.coralReef;
  function Shell() {
    const [toolData, setToolData] = React.useState(data);
    data = toolData;
    return cfg.render({ React, toolData, setToolData, t: (key, fallback) => fallback || key, ...extra });
  }
  const result = { host, root, get data() { return data; } };
  mounted.push(result);
  await act(async () => root.render(React.createElement(Shell)));
  return result;
}
async function click(element) {
  expect(element, 'control is present').toBeTruthy();
  await act(async () => { element.click(); await Promise.resolve(); });
}
async function settleFocus() {
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 35)); });
}
async function search(element, value) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function select(element, value) {
  expect(element, 'native species selector is present').toBeTruthy();
  element.focus();
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(element, value);
    element.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
const comparison = (host) => host.querySelector('[data-marine-comparison]');
const profile = (host, id) => host.querySelector('[data-marine-profile="' + id + '"]');
const buttonText = (host, text) => [...host.querySelectorAll('button')].find((button) => button.textContent.trim() === text);
const comparisonSelect = (host, side) => host.querySelector('[data-compare-select="' + side + '"]');

describe('marine species comparison', () => {
  it('normalizes malformed and duplicate pairs to two existing distinct entries, preferring a look-alike', () => {
    const validIds = X.SPECIES_META.map((entry) => entry.id);
    expect(X.marineComparisonPair('green_turtle', 'hawksbill_turtle')).toEqual(['green_turtle', 'hawksbill_turtle']);
    expect(X.marineComparisonPair('green_turtle', 'blue_tang')).toEqual(['green_turtle', 'blue_tang']);
    for (const bad of [undefined, null, '', 'not-a-species', 42, {}, []]) {
      const pair = X.marineComparisonPair(bad, bad);
      expect(pair).toHaveLength(2);
      expect(pair.every((id) => validIds.includes(id))).toBe(true);
      expect(pair[0]).not.toBe(pair[1]);
      expect(X.marineComparisonPair('green_turtle', bad)).toEqual(['green_turtle', 'hawksbill_turtle']);
    }
    for (const meta of X.SPECIES_META) {
      const pair = X.marineComparisonPair(meta.id, meta.id);
      expect(pair[0]).toBe(meta.id);
      expect(pair[1]).not.toBe(meta.id);
      expect(validIds).toContain(pair[1]);
      const related = (meta.lookalikes || []).filter((id) => id !== meta.id && validIds.includes(id));
      if (related.length) expect(pair[1]).toBe(related[0]);
      else if (X.SPECIES_META.some((entry) => entry.id !== meta.id && entry.group === meta.group)) {
        expect(X.SPECIES_META.find((entry) => entry.id === pair[1]).group).toBe(meta.group);
      }
    }
  });

  it('opens an accessible paired evidence view from a profile without starting a renderer', async () => {
    const t = await mountTool({ guideSpeciesId: 'green_turtle' });
    await click(t.host.querySelector('[data-start-comparison]'));
    await settleFocus();
    const view = comparison(t.host);
    expect(view).toBeTruthy();
    expect(document.activeElement).toBe(view.querySelector('h3'));
    expect(comparisonSelect(view, 0).value).toBe('green_turtle');
    expect(comparisonSelect(view, 1).value).toBe('hawksbill_turtle');
    for (const id of ['green_turtle', 'hawksbill_turtle']) {
      const meta = X.SPECIES_META.find((entry) => entry.id === id);
      expect(view.textContent).toContain(meta.scientific);
      const card = view.querySelector('[data-comparison-organism="' + id + '"]');
      const marks = card.querySelector('[data-comparison-marks="' + id + '"]');
      expect([...marks.querySelectorAll('li')].map(item => item.textContent)).toEqual(TX[id].marks);
      expect(card.querySelector('img').getAttribute('src')).toContain('/' + id + '.webp');
      const heading = view.querySelector('#' + marks.getAttribute('aria-labelledby'));
      expect(heading.tagName).toBe('H5'); expect(heading.textContent).toBe('How to recognize it');
      for (const field of ['habitat', 'diet', 'behavior', 'observe']) expect(view.textContent).toContain(profiles[id][field]);
      expect(view.querySelector('[data-comparison-study="' + id + '"]')).toBeTruthy();
    }
    expect(view.querySelector('[data-comparison-row="marks"]')).toBeNull();
    expect(view.querySelectorAll('[data-comparison-marks]')).toHaveLength(2);
    expect([...view.querySelectorAll('[data-comparison-row]')].map(row => row.dataset.comparisonRow)).toEqual(['habitat', 'diet', 'behavior', 'observe']);
    for (const control of view.querySelectorAll('select')) {
      expect(control.labels.length > 0 || !!control.getAttribute('aria-label') || !!control.getAttribute('aria-labelledby'), 'each selector has an accessible name').toBe(true);
    }
    expect(view.querySelectorAll('img').length).toBeGreaterThanOrEqual(2);
    expect(view.querySelector('canvas')).toBeNull();
    expect(window.Reef3DExplore.mount).not.toHaveBeenCalled();
    expect(window.Reef3DSpecies.create).not.toHaveBeenCalled();
    expect(t.data.coralReef.speciesLog).toBeUndefined();
  });

  it('changes a comparison species in place while keeping the selector focused and learning state untouched', async () => {
    const log = { green_turtle: { site: 'healthy', firstSeen: 123 } };
    const bookmarks = { green_turtle: true };
    const t = await mountTool({ guideSpeciesId: 'green_turtle', speciesLog: log, speciesBookmarks: bookmarks, guideFilter: 'found' });
    await click(t.host.querySelector('[data-compare-with="hawksbill_turtle"]'));
    await settleFocus();
    const right = comparisonSelect(t.host, 1);
    const excluded = [...right.options].find((option) => option.value === 'green_turtle');
    expect(!excluded || excluded.disabled, 'the opposite species cannot be selected twice').toBe(true);
    await select(right, 'blue_tang');
    await settleFocus();
    expect(document.activeElement).toBe(right);
    expect(comparisonSelect(t.host, 0).value).toBe('green_turtle');
    expect(comparisonSelect(t.host, 1).value).toBe('blue_tang');
    expect(comparison(t.host).textContent).toContain(profiles.blue_tang.observe);
    expect(comparison(t.host).querySelector('[data-comparison-study="blue_tang"]')).toBeTruthy();
    const changedCard = comparison(t.host).querySelector('[data-comparison-organism="blue_tang"]');
    expect([...changedCard.querySelectorAll('[data-comparison-marks] li')].map(item => item.textContent)).toEqual(TX.blue_tang.marks);
    expect(changedCard.querySelector('img').getAttribute('src')).toContain('/blue_tang.webp');
    expect(comparison(t.host).querySelector('[data-comparison-marks="hawksbill_turtle"]')).toBeNull();
    expect([...comparison(t.host).querySelectorAll('[data-comparison-marks]')].map(section => section.getAttribute('aria-labelledby'))).toEqual(expect.arrayContaining([expect.any(String), expect.any(String)]));
    expect(new Set([...comparison(t.host).querySelectorAll('[data-comparison-marks]')].map(section => section.getAttribute('aria-labelledby'))).size).toBe(2);
    const leftDuplicate = [...comparisonSelect(t.host, 0).options].find((option) => option.value === 'blue_tang');
    expect(!leftDuplicate || leftDuplicate.disabled).toBe(true);
    expect(t.data.coralReef.guideSpeciesId).toBe('green_turtle');
    expect(t.data.coralReef.speciesLog).toEqual(log);
    expect(t.data.coralReef.speciesBookmarks).toEqual(bookmarks);
    expect(t.data.coralReef.guideFilter).toBe('found');
    expect(t.data.coralReef.speciesPractice).toBeUndefined();
  });

  it('closes to the original dossier and restores the specific comparison trigger', async () => {
    const t = await mountTool({ guideSpeciesId: 'green_turtle' }, { reduceMotion: true });
    await click(t.host.querySelector('[data-compare-with="hawksbill_turtle"]'));
    await select(comparisonSelect(t.host, 0), 'blue_tang');
    await click(t.host.querySelector('[data-close-comparison]'));
    await settleFocus();
    expect(comparison(t.host)).toBeNull();
    expect(profile(t.host, 'green_turtle')).toBeTruthy();
    expect(t.data.coralReef.guideSpeciesId).toBe('green_turtle');
    expect(document.activeElement).toBe(t.host.querySelector('[data-compare-with="hawksbill_turtle"]'));
  });

  it('studies either compared species and preserves the collection search and filter on return', async () => {
    const log = { green_turtle: { site: 'healthy' } };
    const t = await mountTool({ guideFilter: 'found', speciesLog: log });
    await search(t.host.querySelector('input[type="search"]'), 'green turtle');
    await click(t.host.querySelector('[data-open-profile="green_turtle"]'));
    await click(t.host.querySelector('[data-compare-with="hawksbill_turtle"]'));
    await click(t.host.querySelector('[data-comparison-study="hawksbill_turtle"]'));
    await settleFocus();
    const detail = profile(t.host, 'hawksbill_turtle');
    expect(comparison(t.host)).toBeNull();
    expect(detail).toBeTruthy();
    expect(document.activeElement).toBe(detail.querySelector('h3'));
    expect(t.data.coralReef.guideSpeciesId).toBe('hawksbill_turtle');
    await click(t.host.querySelector('[data-close-profile="true"]'));
    await settleFocus();
    expect(t.host.querySelector('input[type="search"]').value).toBe('green turtle');
    expect(t.data.coralReef.guideFilter).toBe('found');
    expect(document.activeElement).toBe(t.host.querySelector('[data-open-profile="green_turtle"]'));
    expect(t.data.coralReef.speciesLog).toEqual(log);
  });

  it('keeps the answered practice question mounted and locked through profile and comparison detours', async () => {
    const log = { green_turtle: { site: 'healthy', firstSeen: 123 } };
    const t = await mountTool({ speciesLog: log });
    await click(t.host.querySelector('[data-start-practice="true"]'));
    await click(t.host.querySelector('[data-practice-start="true"]'));
    const activity = t.host.querySelector('[data-marine-practice="active"]');
    const index = activity.getAttribute('data-practice-question');
    const choices = [...activity.querySelectorAll('[data-practice-choice]')];
    const ids = choices.map((choice) => choice.getAttribute('data-practice-choice'));
    await click(choices[0]);
    const feedback = activity.querySelector('[data-practice-feedback="true"]').textContent;
    await click(buttonText(activity, 'Study profile'));
    const originalProfile = t.host.querySelector('[data-marine-profile]').getAttribute('data-marine-profile');
    await click(t.host.querySelector('[data-start-comparison]'));
    await settleFocus();
    expect(t.host.querySelector('[data-marine-practice="active"]')).toBe(activity);
    expect(activity.closest('[hidden]')).toBeTruthy();
    expect(comparison(t.host).contains(document.activeElement)).toBe(true);
    await click(t.host.querySelector('[data-close-comparison]'));
    await settleFocus();
    expect(profile(t.host, originalProfile)).toBeTruthy();
    expect(document.activeElement).toBe(t.host.querySelector('[data-start-comparison]'));
    await click(t.host.querySelector('[data-close-profile="true"]'));
    await settleFocus();
    expect(t.host.querySelector('[data-marine-practice="active"]')).toBe(activity);
    expect(activity.closest('[hidden]')).toBeNull();
    expect(activity.getAttribute('data-practice-question')).toBe(index);
    expect(activity.querySelector('[data-practice-feedback="true"]').textContent).toBe(feedback);
    expect(document.activeElement).toBe(activity.querySelector('h3'));
    const returned = [...activity.querySelectorAll('[data-practice-choice]')];
    expect(returned.map((choice) => choice.getAttribute('data-practice-choice'))).toEqual(ids);
    expect(returned.every((choice) => choice.getAttribute('aria-disabled') === 'true')).toBe(true);
    await click(returned[1]);
    expect(activity.querySelector('[data-practice-feedback="true"]').textContent).toBe(feedback);
    expect(t.data.coralReef.speciesLog).toEqual(log);
    expect(t.data.coralReef.speciesPractice).toBeUndefined();
    expect(window.Reef3DExplore.mount).not.toHaveBeenCalled();
    await click(activity.querySelector('[data-practice-next="true"]'));
    expect(activity.getAttribute('data-practice-question')).toBe('1');
  });
});
