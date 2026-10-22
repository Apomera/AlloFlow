import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { loadTool, resetStemLab, React, ReactDOMClient } from './helpers/stem_widgets_smoke_harness.js';

// Looking closely is a self-guided study activity, not an identification or a
// second renderer. Existing field evidence and an unfinished practice stay intact.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const act = React.act;
const TOOL = process.env.CORALREEF_SOURCE || 'stem_lab/stem_tool_coralreef.js';
const THREE = createRequire(import.meta.url)('../vendor/three-r128/three.min.js');
const mounted = [];
let X, TX, profiles, renderer;

beforeEach(() => {
  resetStemLab();
  window.__RR_TEST_EXPORTS__ = {};
  renderer = vi.fn(function () { throw new Error('WebGL is unavailable'); });
  window.THREE = { stub: true, WebGLRenderer: renderer };
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
  vi.useRealTimers();
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
async function click(element) {
  expect(element, 'control is present').toBeTruthy();
  await act(async () => { element.click(); await Promise.resolve(); });
}
async function settleFocus() {
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 35)); });
}
const study = (host) => host.querySelector('[data-species-study]');
const markText = (host) => study(host).querySelector('[data-study-mark-text]').textContent;
const zoom = (host, action) => study(host).querySelector('[data-study-zoom="' + action + '"]');
const pan = (host, direction) => study(host).querySelector('[data-study-pan="' + direction + '"]');
const scale = (host) => Number(study(host).getAttribute('data-study-scale'));
const offset = (host, axis) => Number(study(host).getAttribute('data-study-pan-' + axis));
const disabled = (control) => !control || control.disabled || control.getAttribute('aria-disabled') === 'true';
const snapshot = (value) => JSON.parse(JSON.stringify(value));
const buttonText = (host, text) => [...host.querySelectorAll('button')].find((button) => button.textContent.trim() === text);

describe('marine species Look closer workspace', () => {
  it('cycles the sourced field marks and separates the reef observation prompt while leaving the complete dossier intact', async () => {
    for (const id of ['clownfish', 'green_turtle', 'reef_star']) {
      const t = await mountTool({ guideSpeciesId: id, speciesBookmarks: { blue_tang: true } });
      const original = snapshot(t.data.coralReef);
      await click(t.host.querySelector('[data-open-study]'));
      expect(study(t.host).getAttribute('data-species-study')).toBe(id);
      expect(markText(t.host)).toBe(TX[id].marks[0]);
      expect(study(t.host).querySelector('[data-study-mark-text]').closest('[role="status"]').textContent).toContain('Field mark 1 of ' + TX[id].marks.length);
      expect(study(t.host).textContent).toContain('On the reef');
      expect(study(t.host).textContent).toContain(profiles[id].observe);
      for (let index = 1; index < TX[id].marks.length; index++) {
        await click(study(t.host).querySelector('[data-study-mark="next"]'));
        expect(markText(t.host)).toBe(TX[id].marks[index]);
        expect(study(t.host).querySelector('[data-study-mark-text]').closest('[role="status"]').textContent).toContain('Field mark ' + (index + 1) + ' of ' + TX[id].marks.length);
      }
      await click(study(t.host).querySelector('[data-study-mark="next"]'));
      expect(markText(t.host)).toBe(TX[id].marks[0]);
      await click(study(t.host).querySelector('[data-study-mark="previous"]'));
      expect(markText(t.host)).toBe(TX[id].marks.at(-1));
      const completeMarks = t.host.querySelector('.crdx-marks');
      for (const mark of TX[id].marks) expect(completeMarks.textContent).toContain(mark);
      expect(t.data.coralReef).toEqual(original);
      expect(renderer).not.toHaveBeenCalled();
      expect(window.Reef3DExplore.mount).not.toHaveBeenCalled();
      expect(study(t.host).querySelector('canvas')).toBeNull();
    }
  });

  it('bounds zoom and panning and recenters the portrait on reset or minimum zoom', async () => {
    const t = await mountTool({ guideSpeciesId: 'blue_tang' });
    await click(t.host.querySelector('[data-open-study]'));
    expect(scale(t.host)).toBe(1);
    expect(disabled(zoom(t.host, 'out'))).toBe(true);
    expect(disabled(pan(t.host, 'left'))).toBe(true);
    await click(zoom(t.host, 'in'));
    expect(scale(t.host)).toBe(1.25);
    await click(pan(t.host, 'right'));
    expect(offset(t.host, 'x')).toBe(7.5);
    await click(pan(t.host, 'down'));
    expect(offset(t.host, 'y')).toBe(7.5);
    for (let index = 0; index < 7; index++) await click(zoom(t.host, 'in'));
    expect(scale(t.host)).toBe(2);
    expect(disabled(zoom(t.host, 'in'))).toBe(true);
    expect(study(t.host).querySelector('[data-study-zoom-value]').textContent).toMatch(/200|2(?:\.0)?\s*[x×]/);
    for (let index = 0; index < 6; index++) {
      await click(pan(t.host, 'right'));
      await click(pan(t.host, 'down'));
    }
    expect(offset(t.host, 'x')).toBe(30);
    expect(offset(t.host, 'y')).toBe(30);
    await click(zoom(t.host, 'out'));
    expect(scale(t.host)).toBe(1.75);
    expect(Math.abs(offset(t.host, 'x'))).toBeLessThanOrEqual(22.5);
    expect(Math.abs(offset(t.host, 'y'))).toBeLessThanOrEqual(22.5);
    const reset = zoom(t.host, 'reset');
    reset.focus();
    await click(reset);
    expect(scale(t.host)).toBe(1);
    expect(offset(t.host, 'x')).toBe(0);
    expect(offset(t.host, 'y')).toBe(0);
    expect(reset.disabled).toBe(false);
    expect(document.activeElement).toBe(reset);
    await click(zoom(t.host, 'in'));
    await click(pan(t.host, 'left'));
    expect(offset(t.host, 'x')).toBe(-7.5);
    await click(zoom(t.host, 'out'));
    expect(scale(t.host)).toBe(1);
    expect(offset(t.host, 'x')).toBe(0);
    expect(offset(t.host, 'y')).toBe(0);
  });

  it('focuses the opened workspace and returns to its exact opener, with fresh state when reopened', async () => {
    const t = await mountTool({ guideSpeciesId: 'clownfish' }, { reduceMotion: true });
    const opener = t.host.querySelector('[data-open-study]');
    await click(opener);
    await settleFocus();
    expect(study(t.host).contains(document.activeElement)).toBe(true);
    expect(document.activeElement.matches('h3,h4,h5,h6')).toBe(true);
    await click(zoom(t.host, 'in'));
    await click(study(t.host).querySelector('[data-study-mark="next"]'));
    await click(t.host.querySelector('[data-close-study]'));
    await settleFocus();
    expect(study(t.host)).toBeNull();
    expect(document.activeElement).toBe(opener);
    await click(opener);
    expect(scale(t.host)).toBe(1);
    expect(offset(t.host, 'x')).toBe(0);
    expect(offset(t.host, 'y')).toBe(0);
    expect(markText(t.host)).toBe(TX.clownfish.marks[0]);
  });

  it('closes and resets the workspace when the dossier changes to another species', async () => {
    const t = await mountTool({ guideSpeciesId: 'green_turtle' });
    await click(t.host.querySelector('[data-open-study]'));
    await click(zoom(t.host, 'in'));
    await click(pan(t.host, 'left'));
    await click(study(t.host).querySelector('[data-study-mark="next"]'));
    const nextProfile = [...t.host.querySelectorAll('button')].find((button) => (button.getAttribute('aria-label') || '').startsWith('Next entry:'));
    await click(nextProfile);
    expect(t.host.querySelector('[data-marine-profile="hawksbill_turtle"]')).toBeTruthy();
    expect(study(t.host)).toBeNull();
    await click(t.host.querySelector('[data-open-study]'));
    expect(study(t.host).getAttribute('data-species-study')).toBe('hawksbill_turtle');
    expect(scale(t.host)).toBe(1);
    expect(offset(t.host, 'x')).toBe(0);
    expect(markText(t.host)).toBe(TX.hawksbill_turtle.marks[0]);
    expect(study(t.host).querySelector('img').getAttribute('src')).toContain('/assets/coralreef/species/hawksbill_turtle.webp');
    expect(t.data.coralReef.speciesLog).toBeUndefined();
  });

  it('unmounts the workspace for comparison and returns to a closed, reset study in the original profile', async () => {
    const t = await mountTool({ guideSpeciesId: 'green_turtle', guideGroupFilter: 'reptile', guideSearchMode: 'description' });
    await click(t.host.querySelector('[data-open-study]'));
    await click(zoom(t.host, 'in'));
    await click(t.host.querySelector('[data-start-comparison]'));
    expect(t.host.querySelector('[data-marine-comparison]')).toBeTruthy();
    expect(study(t.host)).toBeNull();
    await click(t.host.querySelector('[data-close-comparison]'));
    await settleFocus();
    expect(t.host.querySelector('[data-marine-profile="green_turtle"]')).toBeTruthy();
    expect(study(t.host)).toBeNull();
    expect(document.activeElement).toBe(t.host.querySelector('[data-start-comparison]'));
    await click(t.host.querySelector('[data-open-study]'));
    expect(scale(t.host)).toBe(1);
    expect(markText(t.host)).toBe(TX.green_turtle.marks[0]);
    expect(t.data.coralReef.guideGroupFilter).toBe('reptile');
    expect(t.data.coralReef.guideSearchMode).toBe('description');
    expect(renderer).not.toHaveBeenCalled();
  });

  it('keeps field prompts usable when the image fails and never attempts a GPU fallback', async () => {
    const t = await mountTool({ guideSpeciesId: 'clownfish' });
    const original = snapshot(t.data.coralReef);
    await click(t.host.querySelector('[data-open-study]'));
    const image = study(t.host).querySelector('img');
    expect(image.getAttribute('src')).toContain('/assets/coralreef/species/clownfish.webp');
    expect(image.getAttribute('alt').length).toBeGreaterThan(5);
    await act(async () => image.dispatchEvent(new Event('error')));
    expect(study(t.host).querySelector('img')).toBeNull();
    expect(study(t.host).querySelector('[role="status"]').textContent).toMatch(/portrait.*unavailable/i);
    expect(disabled(zoom(t.host, 'in'))).toBe(true);
    expect(markText(t.host)).toBe(TX.clownfish.marks[0]);
    await click(study(t.host).querySelector('[data-study-mark="next"]'));
    expect(markText(t.host)).toBe(TX.clownfish.marks[1]);
    expect(study(t.host).textContent).toContain(profiles.clownfish.observe);
    expect(renderer).not.toHaveBeenCalled();
    expect(window.Reef3DSpecies.create).not.toHaveBeenCalled();
    expect(t.data.coralReef).toEqual(original);
  });

  it('uses the shipped portrait even when the profile already has a lower-resolution generated thumbnail', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,iVBORw0KGgo=');
    const generated = vi.fn();
    const cachedRenderer = vi.fn(function () {
      this.setPixelRatio = () => {};
      this.setSize = () => {};
      this.render = () => generated();
      this.dispose = () => {};
      this.forceContextLoss = () => {};
    });
    window.THREE = { ...THREE, WebGLRenderer: cachedRenderer };
    window.Reef3DSpecies = {
      version: '1.0.0', info: () => ({ group: 'fish' }),
      create: vi.fn((T) => ({ root: new T.Group(), radius: 0.3, dispose() {} }))
    };
    const t = await mountTool({ guideSpeciesId: 'clownfish' });
    const profileImage = t.host.querySelector('.crdx-art img');
    await act(async () => { profileImage.dispatchEvent(new Event('error')); });
    await act(async () => vi.runAllTimersAsync());
    expect(generated).toHaveBeenCalledTimes(1);
    expect(t.host.querySelector('.crdx-art img').getAttribute('src')).toMatch(/^data:image\/png/);
    await click(t.host.querySelector('[data-open-study]'));
    expect(study(t.host).querySelector('img').getAttribute('src')).toContain('/assets/coralreef/species/clownfish.webp');
    expect(cachedRenderer).toHaveBeenCalledTimes(1);
    expect(generated).toHaveBeenCalledTimes(1);
  });

  it('returns to the same answered practice question and locked choices after a closer-look detour', async () => {
    const log = { green_turtle: { site: 'healthy', firstSeen: 123 } };
    const progress = { rounds: 2, answered: 4, correct: 3, last: { total: 2, correct: 1, skipped: 0, hinted: 0, missedIds: ['green_turtle'], finishedAt: 100 } };
    const t = await mountTool({ speciesLog: log, speciesPractice: progress, speciesBookmarks: { blue_tang: true } });
    await click(t.host.querySelector('[data-start-practice]'));
    await click(t.host.querySelector('[data-practice-start]'));
    const activity = t.host.querySelector('[data-marine-practice="active"]');
    const index = activity.getAttribute('data-practice-question');
    const choices = [...activity.querySelectorAll('[data-practice-choice]')];
    const ids = choices.map((choice) => choice.getAttribute('data-practice-choice'));
    await click(choices[0]);
    const feedback = activity.querySelector('[data-practice-feedback]').textContent;
    await click(buttonText(activity, 'Study profile'));
    const original = snapshot(t.data.coralReef);
    await click(t.host.querySelector('[data-open-study]'));
    await click(zoom(t.host, 'in'));
    await click(study(t.host).querySelector('[data-study-mark="next"]'));
    expect(t.host.querySelector('[data-marine-practice="active"]')).toBe(activity);
    expect(activity.closest('[hidden]')).toBeTruthy();
    expect(t.data.coralReef).toEqual(original);
    await click(t.host.querySelector('[data-close-study]'));
    await click(t.host.querySelector('[data-close-profile]'));
    await settleFocus();
    expect(t.host.querySelector('[data-marine-practice="active"]')).toBe(activity);
    expect(activity.closest('[hidden]')).toBeNull();
    expect(activity.getAttribute('data-practice-question')).toBe(index);
    expect(activity.querySelector('[data-practice-feedback]').textContent).toBe(feedback);
    expect(document.activeElement).toBe(activity.querySelector('h3'));
    const resumed = [...activity.querySelectorAll('[data-practice-choice]')];
    expect(resumed.map((choice) => choice.getAttribute('data-practice-choice'))).toEqual(ids);
    expect(resumed.every((choice) => choice.getAttribute('aria-disabled') === 'true')).toBe(true);
    await click(resumed[1]);
    expect(activity.querySelector('[data-practice-feedback]').textContent).toBe(feedback);
    expect(t.data.coralReef.speciesLog).toEqual(log);
    expect(t.data.coralReef.speciesPractice).toEqual(progress);
    expect(t.data.coralReef.speciesBookmarks).toEqual({ blue_tang: true });
    expect(renderer).not.toHaveBeenCalled();
    expect(window.Reef3DExplore.mount).not.toHaveBeenCalled();
  });
});
