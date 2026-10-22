import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, resetStemLab, renderTool, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

// The marine guide is available without the 3D renderer. Learning and practice
// must never award a discovery that the learner has not made on a dive.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const act = React.act;
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
const mounted = [];
let X, TX, engines;

beforeEach(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  window.THREE = { stub: true };
  window.Reef3DSpecies = { version: '1.0.0', create: () => ({}) };
  engines = [];
  window.Reef3DExplore = {
    version: '1.0.0',
    mount: vi.fn((canvas, options) => {
      const organism = { uid: 'marine-1', speciesId: 'clownfish', distanceM: 2, inView: true };
      let state = { ready: true, paused: false, view: 'third', diver: { depthM: 8, headingDeg: 90 }, focused: null, nearby: [organism] };
      const controller = {
        dispose: vi.fn(), setInput: vi.fn(), resize: vi.fn(), swimTo: vi.fn(),
        getState: () => state,
        emit(patch) { state = { ...state, ...patch }; options.onState(state); },
        focus: vi.fn(() => controller.emit({ focused: organism })),
        focusNext: vi.fn(() => controller.emit({ focused: organism })),
        focusPrevious: vi.fn(), clearFocus: vi.fn(),
        setView: vi.fn((view) => controller.emit({ view })),
        setPaused: vi.fn((paused) => controller.emit({ paused }))
      };
      engines.push(controller);
      options.onState(state);
      return controller;
    })
  };
  loadTool(TOOL, 'coralReef');
  X = window.__RR_TEST_EXPORTS__.coralReef;
  TX = X.speciesText((key, fallback) => fallback);
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
  const cfg = window.StemLab._registry.coralReef, announcements = [];
  function Shell() {
    const [toolData, setToolData] = React.useState(data);
    data = toolData;
    return cfg.render({ React, toolData, setToolData, t: (key, fallback) => fallback || key, announceToSR: (message) => announcements.push(message), ...extra });
  }
  const result = { host, root, announcements, get data() { return data; } };
  mounted.push(result);
  await act(async () => root.render(React.createElement(Shell)));
  return result;
}
async function settleFocus() { await act(async () => { await new Promise((resolve) => setTimeout(resolve, 35)); }); }
async function click(element) {
  expect(element, 'control is present').toBeTruthy();
  await act(async () => { element.click(); await Promise.resolve(); });
}
async function search(element, value) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
}
const buttonText = (host, text) => [...host.querySelectorAll('button')].find((b) => b.textContent.trim() === text);
const profile = (host, id) => host.querySelector('[data-marine-profile="' + id + '"]');

describe('marine species learning', () => {
  it('provides a complete ecology profile for every species and restoration structure', () => {
    const profiles = X.marineProfiles((key, fallback) => fallback);
    expect(Object.keys(profiles).sort()).toEqual(X.SPECIES_META.map((m) => m.id).sort());
    for (const meta of X.SPECIES_META) {
      const detail = profiles[meta.id];
      for (const field of ['habitat', 'diet', 'behavior', 'observe']) {
        expect(typeof detail[field], meta.id + ' ' + field).toBe('string');
        expect(detail[field].length, meta.id + ' ' + field).toBeGreaterThan(15);
      }
      expect(Array.isArray(detail.sources), meta.id + ' has sources').toBe(true);
      expect(detail.sources.length, meta.id + ' has evidence').toBeGreaterThan(0);
    }
  });

  it('opens a species profile without WebGL, then returns focus to the filtered collection', async () => {
    const t = await mountTool({ guideFilter: 'found', speciesLog: { blue_tang: { site: 'healthy' } } });
    const input = t.host.querySelector('input[type="search"]');
    await search(input, 'blue tang');
    await click(t.host.querySelector('[data-open-profile="blue_tang"]'));
    await settleFocus();
    const detail = profile(t.host, 'blue_tang');
    expect(detail).toBeTruthy();
    expect(detail.textContent).toContain('Paracanthurus hepatus');
    expect(document.activeElement).toBe(detail.querySelector('h3'));
    expect(window.Reef3DExplore.mount).not.toHaveBeenCalled();
    expect(t.host.querySelector('canvas')).toBeNull();
    await click(t.host.querySelector('[data-close-profile="true"]'));
    await settleFocus();
    expect(profile(t.host, 'blue_tang')).toBeNull();
    expect(t.data.coralReef.guideFilter).toBe('found');
    expect(t.host.querySelector('input[type="search"]').value).toBe('blue tang');
    expect(document.activeElement).toBe(t.host.querySelector('[data-open-profile="blue_tang"]'));
  });

  it('saves a profile for later without marking a discovery and restores it on reopening', async () => {
    const t = await mountTool({ guideSpeciesId: 'green_turtle' });
    const save = t.host.querySelector('[data-save-profile="green_turtle"]');
    expect(save.getAttribute('aria-pressed')).toBe('false');
    await click(save);
    expect(t.data.coralReef.speciesBookmarks.green_turtle).toBe(true);
    expect(t.data.coralReef.speciesLog).toBeUndefined();
    const reopened = await mountTool(t.data.coralReef);
    expect(profile(reopened.host, 'green_turtle')).toBeTruthy();
    expect(reopened.host.querySelector('[data-save-profile="green_turtle"]').getAttribute('aria-pressed')).toBe('true');
    await click(reopened.host.querySelector('[data-save-profile="green_turtle"]'));
    expect(reopened.data.coralReef.speciesBookmarks.green_turtle).not.toBe(true);
  });

  it('reaches a look-alike profile even when the collection filter excludes it', async () => {
    const t = await mountTool({ guideSpeciesId: 'green_turtle', guideFilter: 'found', speciesLog: { green_turtle: { site: 'healthy' } } });
    await click(t.host.querySelector('[data-profile-related="hawksbill_turtle"]'));
    expect(profile(t.host, 'hawksbill_turtle')).toBeTruthy();
    expect(Object.keys(t.data.coralReef.speciesLog)).toEqual(['green_turtle']);
  });

  it('ignores an invalid saved profile and renders profiles across host themes', () => {
    const invalid = renderTool('coralReef', { coralReef: { section: 'guide', guideSpeciesId: 'not-a-real-species' } });
    expect(invalid).not.toContain('data-marine-profile="not-a-real-species"');
    for (const theme of ['light', 'dark', 'contrast']) {
      const html = renderTool('coralReef', { coralReef: { section: 'guide', guideSpeciesId: 'giant_clam' } }, { theme, reduceMotion: true });
      expect(html, theme).toContain('data-marine-profile="giant_clam"');
      expect(html, theme).not.toContain('undefined');
      expect(html, theme).not.toContain('NaN');
    }
  });

  it('opens found species from the dive collection while missing species stay unnamed', async () => {
    const t = await mountTool({ section: 'explore', speciesLog: { green_turtle: { site: 'healthy' } } });
    const log = t.host.querySelector('[data-species-log="true"]');
    expect(log.querySelector('[data-open-profile="green_turtle"]')).toBeTruthy();
    expect(log.querySelector('[data-open-profile="hawksbill_turtle"]')).toBeNull();
    await click(log.querySelector('[data-open-profile="green_turtle"]'));
    expect(t.data.coralReef.section).toBe('guide');
    expect(profile(t.host, 'green_turtle')).toBeTruthy();
  });

  it('lets a diver learn about a focused organism without awarding identification credit', async () => {
    const t = await mountTool({ section: 'explore' });
    await click(buttonText(t.host, 'Start the dive'));
    expect(engines).toHaveLength(1);
    await act(async () => engines[0].focus('marine-1'));
    await click(t.host.querySelector('[data-learn-organism="true"]'));
    expect(t.data.coralReef.speciesLog).toBeUndefined();
    expect(document.activeElement).toBe(t.host.querySelector('[data-open-profile="clownfish"]'));
    await click(buttonText(t.host, 'Show identification choices'));
    expect(document.activeElement).toBe(t.host.querySelector('.crf-choice'));
    expect(t.data.coralReef.speciesLog).toBeUndefined();
    await click(t.host.querySelector('[data-learn-organism="true"]'));
    expect(document.activeElement).toBe(t.host.querySelector('[data-open-profile="clownfish"]'));
    await click(t.host.querySelector('[data-open-profile="clownfish"]'));
    expect(profile(t.host, 'clownfish')).toBeTruthy();
    expect(t.data.coralReef.speciesLog).toBeUndefined();
    expect(engines[0].dispose).toHaveBeenCalledTimes(1);
  });

  it('keeps a practice answer fixed and saves a completed round separately from dive discoveries', async () => {
    const originalLog = { green_turtle: { firstSeen: 123, site: 'healthy' } };
    const t = await mountTool({ speciesLog: originalLog });
    await click(t.host.querySelector('[data-start-practice="true"]'));
    if (!t.host.querySelector('[data-practice-choice]')) await click(t.host.querySelector('[data-practice-start="true"]'));
    for (let question = 0; question < 5; question++) {
      const choices = [...t.host.querySelectorAll('[data-practice-choice]')];
      expect(choices).toHaveLength(3);
      await click(choices[0]);
      const feedback = t.host.querySelector('[data-practice-feedback="true"]');
      expect(feedback).toBeTruthy();
      const firstFeedback = feedback.textContent;
      await click(choices[1]);
      expect(t.host.querySelector('[data-practice-feedback="true"]').textContent).toBe(firstFeedback);
      await click(t.host.querySelector('[data-practice-next="true"], [data-practice-finish="true"]'));
    }
    expect(t.host.querySelector('[data-marine-practice="complete"]')).toBeTruthy();
    expect(t.data.coralReef.speciesPractice.rounds).toBe(1);
    expect(t.data.coralReef.speciesPractice.last.total).toBe(5);
    expect(t.data.coralReef.speciesPractice.answered).toBe(5);
    expect(t.data.coralReef.speciesLog).toEqual(originalLog);
    expect(window.Reef3DExplore.mount).not.toHaveBeenCalled();
  });

  it('returns from a study profile to the same practice question, feedback and locked answer', async () => {
    const originalLog = { green_turtle: { firstSeen: 123, site: 'healthy' } };
    const t = await mountTool({ speciesLog: originalLog });
    await click(t.host.querySelector('[data-start-practice="true"]'));
    await click(t.host.querySelector('[data-practice-start="true"]'));
    let activity = t.host.querySelector('[data-marine-practice="active"]');
    const question = activity.getAttribute('data-practice-question');
    const choices = [...activity.querySelectorAll('[data-practice-choice]')];
    const choiceIds = choices.map((button) => button.getAttribute('data-practice-choice'));
    await click(choices[0]);
    const feedback = activity.querySelector('[data-practice-feedback="true"]').textContent;
    const title = activity.querySelector('h3').textContent;
    await click(buttonText(activity, 'Study profile'));
    expect(t.host.querySelector('[data-marine-profile]')).toBeTruthy();
    expect(activity.closest('[hidden]')).toBeTruthy();
    await click(t.host.querySelector('[data-close-profile="true"]'));
    await settleFocus();
    activity = t.host.querySelector('[data-marine-practice="active"]');
    expect(activity.closest('[hidden]')).toBeNull();
    expect(activity.getAttribute('data-practice-question')).toBe(question);
    expect(activity.querySelector('h3').textContent).toBe(title);
    expect(document.activeElement).toBe(activity.querySelector('h3'));
    expect(activity.querySelector('[data-practice-feedback="true"]').textContent).toBe(feedback);
    const resumedChoices = [...activity.querySelectorAll('[data-practice-choice]')];
    expect(resumedChoices.map((button) => button.getAttribute('data-practice-choice'))).toEqual(choiceIds);
    expect(resumedChoices.every((button) => button.getAttribute('aria-disabled') === 'true')).toBe(true);
    await click(resumedChoices[1]);
    expect(activity.querySelector('[data-practice-feedback="true"]').textContent).toBe(feedback);
    expect(t.data.coralReef.speciesPractice).toBeUndefined();
    expect(t.data.coralReef.speciesLog).toEqual(originalLog);
    await click(activity.querySelector('[data-practice-next="true"]'));
    expect(t.host.querySelector('[data-practice-question]').getAttribute('data-practice-question')).toBe('1');
  });

  it('filters saved species by bookmarks, independently of discoveries, and updates after unsaving', async () => {
    const originalLog = { green_turtle: { site: 'healthy' } };
    const t = await mountTool({ speciesBookmarks: { blue_tang: true, green_turtle: false, not_a_species: true }, speciesLog: originalLog });
    await click(buttonText(t.host, 'Saved species'));
    const cards = () => [...t.host.querySelectorAll('.cr-species-card[data-species]')].map((card) => card.getAttribute('data-species'));
    expect(cards()).toEqual(['blue_tang']);
    expect(t.data.coralReef.guideFilter).toBe('saved');
    expect(t.data.coralReef.speciesLog).toEqual(originalLog);
    await click(t.host.querySelector('[data-open-profile="blue_tang"]'));
    await click(t.host.querySelector('[data-save-profile="blue_tang"]'));
    await click(t.host.querySelector('[data-close-profile="true"]'));
    expect(cards()).toEqual([]);
    expect(t.data.coralReef.guideFilter).toBe('saved');
    expect(t.host.textContent).toContain('Keep your favorites close.');
    expect(t.data.coralReef.speciesLog).toEqual(originalLog);
  });
});
