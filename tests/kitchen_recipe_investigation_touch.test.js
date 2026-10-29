// @vitest-environment jsdom
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const B = require('../stem_lab/kitchen_studio/recipe_lab_investigation_model.js');
const S = require('../stem_lab/kitchen_studio/recipe_lab_sauce_check.js');
const source = readFileSync('stem_lab/kitchen_studio/recipe_lab_investigation.js', 'utf8');
const key = 'alloflow-kitchen-sauce-science-v1';
const $ = id => document.getElementById(id);
let ui, bench, media, frames, frameId, scenes;

function mount() { ui = window.KitchenSauceInvestigationUI.mount({ container: $('testHost'), bench }); }
function choose(id, value) { $(id).value = String(value); $(id).dispatchEvent(new Event('change', { bubbles: true })); }
function run() { choose('benchPrediction', 'unsure'); $('benchPlan').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); }
function scrub(value) { $('benchTrailTime').value = String(value); $('benchTrailTime').dispatchEvent(new Event('input', { bubbles: true })); }
function pair() { return scenes.filter(scene => !scene.disposed); }
function last(scene) { return scene.api.update.mock.calls.at(-1)[0]; }
function snapshot() { return { investigation: JSON.stringify(bench.run.mock.results.at(-1).value), storage: localStorage.getItem(key) }; }
function expectUnchanged(before) { expect(snapshot()).toEqual(before); expect(bench.run).toHaveBeenCalledTimes(1); }

beforeEach(() => {
  document.body.innerHTML = '<div id="testHost"></div>';
  localStorage.clear(); window.history.replaceState({}, '', '/');
  window.KitchenSauceCheck = S;
  bench = { ...B, run: vi.fn(config => B.run(config)), createRecord: vi.fn(config => B.createRecord(config)), restoreRecord: vi.fn(record => B.restoreRecord(record)) };
  frames = new Map(); frameId = 0; scenes = [];
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(fn => { frames.set(++frameId, fn); return frameId; });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => frames.delete(id));
  media = { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() };
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: () => media });
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  window.KitchenSauceBenchScene = {
    mount: vi.fn((host, callbacks) => {
      const scene = { host, callbacks, disposed: false };
      scene.api = { update: vi.fn(), cancel: vi.fn(), dispose: vi.fn(() => { scene.disposed = true; }) };
      scenes.push(scene); return scene.api;
    })
  };
  window.eval(source); mount();
});

afterEach(() => {
  ui?.dispose(); vi.restoreAllMocks(); document.body.replaceChildren(); localStorage.clear();
  delete window.KitchenSauceCheck; delete window.KitchenSauceBenchScene;
  window.history.replaceState({}, '', '/');
});

describe('Paired sauce observations stay on one inspection clock', () => {
  it('steps through actual recorded stages and disables navigation at each boundary', () => {
    run(); const before = snapshot();
    expect($('benchStage').value).toBe('fold-2');
    expect($('benchStageNext').disabled).toBe(true);
    expect($('benchStagePrevious').disabled).toBe(false);
    $('benchStagePrevious').click(); expect($('benchStage').value).toBe('fold-1');
    $('benchStagePrevious').click(); expect($('benchStage').value).toBe('poured');
    $('benchStagePrevious').click(); expect($('benchStage').value).toBe('baseline');
    expect($('benchStagePrevious').disabled).toBe(true);
    expect($('benchStageNext').disabled).toBe(false);
    expect($('benchStagePosition').textContent).toMatch(/1\s*(?:of|\/)\s*4/);
    $('benchStageNext').click(); expect($('benchStage').value).toBe('poured');
    expect($('benchArm-plain').dataset.stageId).toBe('poured');
    expect($('benchArm-reduced').dataset.stageId).toBe('poured');
    expectUnchanged(before);
  });

  it('advances both trails in half-second steps without advancing the dishes', () => {
    run(); const before = snapshot();
    $('benchTrailStep').click(); expect($('benchTrailElapsed').textContent).toBe('0.50 s');
    expect(pair().map(scene => last(scene).elapsed)).toEqual([0.5, 0.5]);
    const duration = Number($('benchTrailTime').max);
    for (let i = 0; i < duration * 2 + 3; i++) $('benchTrailStep').click();
    expect(Number($('benchTrailTime').value)).toBe(duration);
    expect($('benchTrailStep').disabled).toBe(true);
    $('benchTrailReset').click();
    expect($('benchTrailElapsed').textContent).toBe('0.00 s');
    expect($('benchTrailStep').disabled).toBe(false);
    expect(frames.size).toBe(0);
    expectUnchanged(before);
  });

  it('previews the same drawn path in both pans and restores the prior observation on cancel', () => {
    run(); scrub(1.25); const before = snapshot(), source = pair()[0];
    source.callbacks.onPreview(0.35);
    expect(pair().map(scene => last(scene).drawing)).toEqual([true, true]);
    expect(pair().map(scene => last(scene).progress)).toEqual([0.35, 0.35]);
    source.callbacks.onCancel();
    expect(pair().map(scene => last(scene).drawing)).toEqual([false, false]);
    expect(pair().map(scene => last(scene).elapsed)).toEqual([1.25, 1.25]);
    expect($('benchTrailElapsed').textContent).toBe('1.25 s');
    expect(frames.size).toBe(0);
    expectUnchanged(before);
  });

  it('starts one shared replay on a completed stroke in either pan', () => {
    run(); scrub(1); const before = snapshot(), source = pair()[1];
    source.callbacks.onPreview(0.8); source.callbacks.onComplete();
    expect(pair().map(scene => last(scene).elapsed)).toEqual([0, 0]);
    expect(pair().map(scene => last(scene).drawing)).toEqual([false, false]);
    expect($('benchTrailPlay').getAttribute('aria-pressed')).toBe('true');
    expect(frames.size).toBe(1);
    const tick = time => { const [id, fn] = frames.entries().next().value; frames.delete(id); fn(time); };
    tick(0); tick(250);
    expect(pair().map(scene => last(scene).elapsed)).toEqual([0.25, 0.25]);
    $('benchTrailPlay').click(); expect(frames.size).toBe(0);
    expectUnchanged(before);
  });

  it('honors a new scrub time when it cancels an unfinished spoon preview', () => {
    run(); scrub(0.75); const before = snapshot();
    pair()[0].callbacks.onPreview(0.4); scrub(1.5);
    expect(pair().map(scene => last(scene).drawing)).toEqual([false, false]);
    expect(pair().map(scene => last(scene).elapsed)).toEqual([1.5, 1.5]);
    expect($('benchTrailElapsed').textContent).toBe('1.50 s');
    expectUnchanged(before);
  });

  it('keeps a completed stroke still in reduced motion while preserving manual inspection', () => {
    ui.dispose(); media.matches = true; mount(); run(); const before = snapshot();
    pair()[0].callbacks.onPreview(0.9); pair()[0].callbacks.onComplete();
    expect(frames.size).toBe(0);
    expect($('benchTrailPlay').disabled).toBe(true);
    expect(pair().map(scene => last(scene).elapsed)).toEqual([0, 0]);
    $('benchTrailStep').click(); expect(pair().map(scene => last(scene).elapsed)).toEqual([0.5, 0.5]);
    expectUnchanged(before);
  });

  it('cancels a drawing when the displayed stage changes and reuses both renderers', () => {
    run(); const old = pair(), before = snapshot();
    old[0].callbacks.onPreview(0.5); $('benchStagePrevious').click();
    expect(old.every(scene => scene.api.cancel.mock.calls.length > 0)).toBe(true);
    expect(old.every(scene => scene.api.dispose.mock.calls.length === 0)).toBe(true);
    expect(pair()).toHaveLength(2);
    expect(pair()).toEqual(old);
    expect(pair().map(scene => last(scene).drawing)).toEqual([false, false]);
    expect(pair().map(scene => last(scene).elapsed)).toEqual([0, 0]);
    expect(frames.size).toBe(0);
    expectUnchanged(before);
  });

  it('reuses renderers for a new run and releases them when the UI is removed', () => {
    run(); const old = pair(); choose('benchDose', 80); run();
    expect(old.every(scene => scene.api.cancel.mock.calls.length > 0)).toBe(true);
    expect(old.every(scene => scene.api.dispose.mock.calls.length === 0)).toBe(true);
    const current = pair(); expect(current).toHaveLength(2);
    expect(current).toEqual(old);
    ui.dispose(); ui = null;
    expect(current.every(scene => scene.api.dispose.mock.calls.length === 1)).toBe(true);
    expect(pair()).toHaveLength(0); expect(frames.size).toBe(0);
  });

  it('restores a pending preview when the document is hidden', () => {
    run(); scrub(0.75); const before = snapshot(); pair()[0].callbacks.onPreview(0.6);
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(pair().map(scene => last(scene).drawing)).toEqual([false, false]);
    expect(pair().map(scene => last(scene).elapsed)).toEqual([0.75, 0.75]);
    expect(frames.size).toBe(0); expectUnchanged(before);
  });

  it('keeps SVG observations and manual controls usable when 3D is unavailable', () => {
    window.KitchenSauceBenchScene.mount.mockReturnValue(null); run();
    expect(document.querySelectorAll('.bench-sauce-art')).toHaveLength(2);
    expect($('benchArm-plain').textContent).toContain('Trail');
    $('benchTrailStep').click(); expect($('benchTrailElapsed').textContent).toBe('0.50 s');
    $('benchStagePrevious').click(); expect($('benchStage').value).toBe('fold-1');
  });

  it('describes oil separately from body when a rest thickens a dispersed sauce', () => {
    choose('benchWait', 120); run();
    expect($('benchArm-plain').dataset.readingType).toBe('thick');
    expect($('benchCompareNote').textContent.toLowerCase()).toContain('oil');
    const result = bench.run.mock.results[0].value;
    expect(result.arms.every(arm => !S.cues(arm.stages.at(-1).reading).oilDroplets)).toBe(true);
    expect($('benchCompareNote').textContent.toLowerCase()).not.toContain('oil has dissolved');
  });
});

describe('Chemistry entry points prepare a plan without answering or running it', () => {
  it.each([['starch', 0], ['emulsion', 120]])('opens the %s investigation with an explicit prediction still required', (focus, wait) => {
    ui.dispose(); window.history.replaceState({}, '', '/?focus=' + focus); mount();
    expect($('benchDose').value).toBe('60'); expect($('benchFolds').value).toBe('2');
    expect($('benchWait').value).toBe(String(wait));
    expect($('benchPrediction').value).toBe('');
    expect($('benchResults').hidden).toBe(true); expect(bench.run).not.toHaveBeenCalled();
    expect(localStorage.getItem(key)).toBeNull();
    expect($('benchFocus').hidden).toBe(false);
    $('benchPlan').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(bench.run).not.toHaveBeenCalled();
  });

  it('ignores an unsupported chemistry entry without displaying it as markup or choosing a plan', () => {
    ui.dispose(); window.history.replaceState({}, '', '/?focus=%3Cscript%3E'); mount();
    expect($('benchWait').value).toBe('0'); expect($('benchPrediction').value).toBe('');
    expect($('benchResults').hidden).toBe(true); expect(bench.run).not.toHaveBeenCalled();
    expect(document.querySelectorAll('script')).toHaveLength(0);
  });
});
