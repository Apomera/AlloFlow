import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

// Search modes and group filters help learners find unfamiliar organisms.
// They must compose with collections and preserve a learner's place in the guide.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const act = React.act;
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
const mounted = [];
let X, TX, profiles;

beforeEach(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
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
  vi.restoreAllMocks();
});

async function mountTool(seed = {}) {
  let data = { coralReef: { section: 'guide', ...seed } };
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = ReactDOMClient.createRoot(host);
  const cfg = window.StemLab._registry.coralReef, announcements = [];
  function Shell() {
    const [toolData, setToolData] = React.useState(data);
    data = toolData;
    return cfg.render({ React, toolData, setToolData, t: (key, fallback) => fallback || key, announceToSR: (message) => announcements.push(message) });
  }
  const result = { host, root, announcements, get data() { return data; } };
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
async function type(element, value) {
  expect(element, 'search input is present').toBeTruthy();
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
async function select(element, value) {
  expect(element, 'native selector is present').toBeTruthy();
  expect(element.tagName).toBe('SELECT');
  element.focus();
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set.call(element, value);
    element.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
const searchBox = (host) => host.querySelector('input[type="search"]');
const mode = (host) => host.querySelector('[data-guide-search-mode]');
const group = (host) => host.querySelector('[data-guide-group-filter]');
const count = (host) => host.querySelector('[data-guide-result-count]');
const cards = (host) => [...host.querySelectorAll('.cr-species-card[data-species]')].map((card) => card.getAttribute('data-species'));
const buttonText = (host, text) => [...host.querySelectorAll('button')].find((button) => button.textContent.trim() === text);

describe('marine field guide discovery', () => {
  it('keeps name lookup as the default and explains a profile-only ecology match in description mode', async () => {
    const t = await mountTool();
    expect(mode(t.host).value).toBe('names');
    expect(group(t.host).value).toBe('all');
    expect(count(t.host)).toBeTruthy();
    expect(cards(t.host)).toHaveLength(X.SPECIES_META.length);
    const label = t.host.querySelector('label[for="' + searchBox(t.host).id + '"]');
    expect(label.textContent).toBe('Find a species by name');
    await type(searchBox(t.host), 'currents bring drifting');
    expect(cards(t.host)).toEqual([]);
    expect(t.host.textContent).toContain('No species match that name.');
    await select(mode(t.host), 'description');
    expect(t.host.querySelector('label[for="' + searchBox(t.host).id + '"]').textContent).toBe('Search field marks and ecology');
    expect(cards(t.host)).toEqual(['blue_tang']);
    const evidence = t.host.querySelector('[data-guide-match="blue_tang"]');
    expect(evidence).toBeTruthy();
    expect(evidence.textContent).toContain('Where it lives');
    expect(evidence.textContent).toContain(profiles.blue_tang.habitat);
    expect(t.data.coralReef.guideSearchMode).toBe('description');
    expect(searchBox(t.host).value).toBe('currents bring drifting');
    expect(t.data.coralReef.speciesLog).toBeUndefined();
    expect(window.Reef3DExplore.mount).not.toHaveBeenCalled();
  });

  it('intersects the saved collection, organism group and query without adding discoveries', async () => {
    const bookmarks = { blue_tang: true, green_turtle: true, reef_star: true, made_up: true };
    const log = { clownfish: { site: 'healthy', firstSeen: 123 } };
    const t = await mountTool({ guideFilter: 'saved', guideGroupFilter: 'reptile', speciesBookmarks: bookmarks, speciesLog: log });
    expect(cards(t.host)).toEqual(['green_turtle']);
    await type(searchBox(t.host), 'chelonia');
    expect(cards(t.host)).toEqual(['green_turtle']);
    await type(searchBox(t.host), 'hawksbill');
    expect(cards(t.host)).toEqual([]);
    expect(t.host.querySelector('[data-guide-group-empty]')).toBeNull();
    expect(t.host.textContent).not.toContain('Keep your favorites close.');
    await type(searchBox(t.host), '');
    await select(group(t.host), 'fish');
    expect(cards(t.host)).toEqual(['blue_tang']);
    await type(searchBox(t.host), 'blue tang');
    expect(cards(t.host)).toEqual(['blue_tang']);
    expect(t.data.coralReef.guideFilter).toBe('saved');
    expect(t.data.coralReef.guideGroupFilter).toBe('fish');
    expect(t.data.coralReef.speciesBookmarks).toEqual(bookmarks);
    expect(t.data.coralReef.speciesLog).toEqual(log);
  });

  it('distinguishes an empty group from an empty collection and resets restrictions while preserving the search mode', async () => {
    const t = await mountTool({ guideFilter: 'saved', guideGroupFilter: 'fish', guideSearchMode: 'description', speciesBookmarks: { green_turtle: true } });
    expect(cards(t.host)).toEqual([]);
    expect(t.host.querySelector('[data-guide-group-empty]')).toBeTruthy();
    expect(t.host.textContent).not.toContain('Keep your favorites close.');
    await type(searchBox(t.host), 'nothing matches this');
    await click(t.host.querySelector('[data-guide-reset]'));
    await settleFocus();
    expect(t.data.coralReef.guideFilter).toBe('all');
    expect(t.data.coralReef.guideGroupFilter).toBe('all');
    expect(t.data.coralReef.guideSearchMode).toBe('description');
    expect(mode(t.host).value).toBe('description');
    expect(group(t.host).value).toBe('all');
    expect(searchBox(t.host).value).toBe('');
    expect(cards(t.host)).toHaveLength(X.SPECIES_META.length);
    expect(count(t.host)).toBeTruthy();
    expect(document.activeElement).toBe(searchBox(t.host));
    const empty = await mountTool({ guideFilter: 'saved', guideGroupFilter: 'fish', speciesBookmarks: {} });
    expect(empty.host.textContent).toContain('Keep your favorites close.');
    expect(empty.host.querySelector('[data-guide-group-empty]')).toBeNull();
  });

  it('preserves search mode, group, collection and query through profiles and comparison with return focus', async () => {
    const log = { green_turtle: { site: 'healthy' } };
    const t = await mountTool({ guideFilter: 'found', guideGroupFilter: 'reptile', guideSearchMode: 'description', speciesLog: log });
    await type(searchBox(t.host), 'blunt beak');
    expect(cards(t.host)).toEqual(['green_turtle']);
    await click(t.host.querySelector('[data-open-profile="green_turtle"]'));
    await click(t.host.querySelector('[data-compare-with="hawksbill_turtle"]'));
    expect(t.host.querySelector('[data-marine-comparison]')).toBeTruthy();
    await click(t.host.querySelector('[data-comparison-study="hawksbill_turtle"]'));
    expect(t.host.querySelector('[data-marine-profile="hawksbill_turtle"]')).toBeTruthy();
    await click(t.host.querySelector('[data-close-profile]'));
    await settleFocus();
    expect(mode(t.host).value).toBe('description');
    expect(group(t.host).value).toBe('reptile');
    expect(searchBox(t.host).value).toBe('blunt beak');
    expect(t.data.coralReef.guideFilter).toBe('found');
    expect(cards(t.host)).toEqual(['green_turtle']);
    expect(document.activeElement).toBe(t.host.querySelector('[data-open-profile="green_turtle"]'));
    expect(t.data.coralReef.speciesLog).toEqual(log);
  });

  it('reveals a related card hidden by the collection, group and query before moving focus', async () => {
    // Current sourced look-alikes happen to share groups. A synthetic target
    // exercises the navigation contract if a future entry crosses a group.
    X.SPECIES_META.find((entry) => entry.id === 'green_turtle').lookalikes.push('blue_tang');
    const t = await mountTool({ guideFilter: 'found', guideGroupFilter: 'reptile', speciesLog: { green_turtle: {} } });
    await type(searchBox(t.host), 'green turtle');
    expect(cards(t.host)).toEqual(['green_turtle']);
    await click(t.host.querySelector('[data-species="green_turtle"] [data-lookalike="blue_tang"]'));
    await settleFocus();
    expect(t.data.coralReef.guideFilter).toBe('all');
    expect(t.data.coralReef.guideGroupFilter).toBe('all');
    expect(group(t.host).value).toBe('all');
    expect(searchBox(t.host).value).toBe('');
    expect(document.activeElement.closest('[data-species]').getAttribute('data-species')).toBe('blue_tang');
    expect(t.data.coralReef.speciesLog).toEqual({ green_turtle: {} });
  });

  it('lets an empty saved practice collection browse all organisms without stale group or query restrictions', async () => {
    const t = await mountTool({ guideFilter: 'missing', guideGroupFilter: 'coral', guideSearchMode: 'description' });
    await type(searchBox(t.host), 'branching');
    await click(t.host.querySelector('[data-start-practice]'));
    await select(t.host.querySelector('[data-practice-collection-select]'), 'saved');
    expect(t.host.querySelector('[data-practice-start]')).toBeNull();
    await click(buttonText(t.host, 'Browse species to save'));
    await settleFocus();
    expect(t.host.querySelector('[data-marine-practice]')).toBeNull();
    expect(cards(t.host)).toHaveLength(X.SPECIES_META.length);
    expect(group(t.host).value).toBe('all');
    expect(searchBox(t.host).value).toBe('');
    expect(mode(t.host).value).toBe('description');
    expect(t.data.coralReef.guideFilter).toBe('all');
    expect(t.data.coralReef.guideGroupFilter).toBe('all');
    expect(document.activeElement).toBe(searchBox(t.host));
    expect(t.data.coralReef.speciesLog).toBeUndefined();
    expect(t.data.coralReef.speciesPractice).toBeUndefined();
  });

  it('uses safe defaults for malformed preferences and keeps native controls focused while announcing group results', async () => {
    for (const malformed of ['not-a-value', {}, [], 4]) {
      const invalid = await mountTool({ guideGroupFilter: malformed, guideSearchMode: malformed });
      expect(group(invalid.host).value).toBe('all');
      expect(mode(invalid.host).value).toBe('names');
      expect(cards(invalid.host)).toHaveLength(X.SPECIES_META.length);
    }
    const t = await mountTool();
    for (const control of [group(t.host), mode(t.host)]) {
      expect(control.labels.length > 0 || !!control.getAttribute('aria-label') || !!control.getAttribute('aria-labelledby')).toBe(true);
    }
    await select(mode(t.host), 'description');
    await settleFocus();
    expect(document.activeElement).toBe(mode(t.host));
    await select(group(t.host), 'coral');
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 750)); });
    expect(document.activeElement).toBe(group(t.host));
    expect(cards(t.host)).toHaveLength(X.SPECIES_META.filter((entry) => entry.group === 'coral').length);
    expect(t.announcements).toContain(count(t.host).textContent);
    const reopened = await mountTool(t.data.coralReef);
    expect(group(reopened.host).value).toBe('coral');
    expect(mode(reopened.host).value).toBe('description');
  });

  it('keeps every field mark and the matching ecology excerpt in compact results while hiding the longer facts', async () => {
    const t = await mountTool({ guideCompact: true, guideSearchMode: 'description' });
    await type(searchBox(t.host), 'currents bring drifting');
    expect(cards(t.host)).toEqual(['blue_tang']);
    const card = t.host.querySelector('[data-species="blue_tang"]');
    expect(card.querySelector('img')).toBeTruthy();
    for (const mark of TX.blue_tang.marks) expect(card.textContent).toContain(mark);
    expect(card.querySelector('[data-guide-match="blue_tang"]').textContent).toContain(profiles.blue_tang.habitat);
    expect(card.textContent).not.toContain(TX.blue_tang.role);
    expect(card.textContent).not.toContain(TX.blue_tang.fact);
    expect(card.querySelector('[data-open-profile="blue_tang"]')).toBeTruthy();
    expect(window.Reef3DExplore.mount).not.toHaveBeenCalled();
  });

  it('shares direct card bookmarks with the full profile and the saved collection without awarding a discovery', async () => {
    const log = { green_turtle: { site: 'healthy', firstSeen: 123 } };
    const t = await mountTool({ speciesLog: log });
    let save = t.host.querySelector('[data-save-guide="blue_tang"]');
    expect(save.getAttribute('aria-pressed')).toBe('false');
    await click(save);
    expect(t.data.coralReef.speciesBookmarks.blue_tang).toBe(true);
    expect(save.getAttribute('aria-pressed')).toBe('true');
    await click(t.host.querySelector('[data-open-profile="blue_tang"]'));
    const profileSave = t.host.querySelector('[data-save-profile="blue_tang"]');
    expect(profileSave.getAttribute('aria-pressed')).toBe('true');
    await click(profileSave);
    await click(t.host.querySelector('[data-close-profile]'));
    save = t.host.querySelector('[data-save-guide="blue_tang"]');
    expect(save.getAttribute('aria-pressed')).toBe('false');
    await click(save);
    await click(buttonText(t.host, 'Saved species'));
    expect(cards(t.host)).toEqual(['blue_tang']);
    expect(t.host.querySelector('[data-save-guide="blue_tang"]').getAttribute('aria-pressed')).toBe('true');
    expect(t.data.coralReef.speciesLog).toEqual(log);
    const reopened = await mountTool(t.data.coralReef);
    expect(cards(reopened.host)).toEqual(['blue_tang']);
    expect(reopened.host.querySelector('[data-save-guide="blue_tang"]').getAttribute('aria-pressed')).toBe('true');
    expect(reopened.data.coralReef.speciesLog).toEqual(log);
    expect(window.Reef3DExplore.mount).not.toHaveBeenCalled();
  });

  it('restores search focus when a direct removal hides its card and handles the last saved species separately', async () => {
    const t = await mountTool({ guideFilter: 'saved', speciesBookmarks: { blue_tang: true, green_turtle: true } });
    await type(searchBox(t.host), 'blue tang');
    expect(cards(t.host)).toEqual(['blue_tang']);
    await click(t.host.querySelector('[data-save-guide="blue_tang"]'));
    await settleFocus();
    expect(document.activeElement).toBe(searchBox(t.host));
    expect(searchBox(t.host).value).toBe('blue tang');
    expect(cards(t.host)).toEqual([]);
    expect(t.data.coralReef.guideFilter).toBe('saved');
    expect(t.data.coralReef.speciesBookmarks.blue_tang).not.toBe(true);
    expect(t.data.coralReef.speciesBookmarks.green_turtle).toBe(true);
    expect(t.host.textContent).not.toContain('Keep your favorites close.');
    await type(searchBox(t.host), '');
    expect(cards(t.host)).toEqual(['green_turtle']);
    await click(t.host.querySelector('[data-save-guide="green_turtle"]'));
    await settleFocus();
    expect(document.activeElement).toBe(searchBox(t.host));
    expect(cards(t.host)).toEqual([]);
    expect(t.host.textContent).toContain('Keep your favorites close.');
    expect(t.host.querySelector('[data-guide-group-empty]')).toBeNull();
    expect(count(t.host)).toBeTruthy();
    expect(t.data.coralReef.guideFilter).toBe('saved');
    expect(t.data.coralReef.speciesBookmarks.green_turtle).not.toBe(true);
    expect(t.data.coralReef.speciesLog).toBeUndefined();
  });
});
