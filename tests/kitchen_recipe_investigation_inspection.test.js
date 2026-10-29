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
let ui, bench, scenes, frames, frameId;
const choose = (id, value) => { $(id).value = String(value); $(id).dispatchEvent(new Event('change', { bubbles: true })); };
const run = () => { choose('benchPrediction', 'unsure'); $('benchPlan').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); };
const stage = value => choose('benchStage', value);
const scrub = value => { $('benchTrailTime').value = String(value); $('benchTrailTime').dispatchEvent(new Event('input', { bubbles: true })); };
const last = scene => scene.api.update.mock.calls.at(-1)[0];
const snapshot = () => ({ run: JSON.stringify(bench.run.mock.results.at(-1).value), storage: localStorage.getItem(key) });
const unchanged = before => { expect(snapshot()).toEqual(before); expect(bench.run).toHaveBeenCalledTimes(1); };

beforeEach(() => {
  document.body.innerHTML = '<div id="testHost"></div>'; localStorage.clear(); window.history.replaceState({}, '', '/');
  window.KitchenSauceCheck = S; scenes = []; frames = new Map(); frameId = 0;
  bench = { ...B, run: vi.fn(config => B.run(config)), createRecord: vi.fn(value => B.createRecord(value)), restoreRecord: vi.fn(value => B.restoreRecord(value)) };
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(fn => { frames.set(++frameId, fn); return frameId; });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => frames.delete(id));
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }) });
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  window.KitchenSauceBenchScene = { mount: vi.fn((host, callbacks) => {
    const scene = { host, callbacks }; host.dataset.sceneActive = 'true';
    scene.api = { update: vi.fn(), cancel: vi.fn(), dispose: vi.fn() }; scenes.push(scene); return scene.api;
  }) };
  window.eval(source); ui = window.KitchenSauceInvestigationUI.mount({ container: $('testHost'), bench });
});
afterEach(() => { ui?.dispose(); vi.restoreAllMocks(); document.body.replaceChildren(); localStorage.clear(); delete window.KitchenSauceCheck; delete window.KitchenSauceBenchScene; });

describe('Matched inspection views reveal the existing observations', () => {
  it('switches both renderers together and preserves the selected time and evidence', () => {
    run(); scrub(1.25); const before = snapshot();
    for (const [button, mode] of [['benchViewSpoon', 'spoon'], ['benchViewOil', 'oil'], ['benchViewTrail', 'trail']]) {
      $(button).click(); expect(scenes.map(scene => last(scene).inspection)).toEqual([mode, mode]);
      expect(scenes.map(scene => last(scene).elapsed)).toEqual([1.25, 1.25]);
      expect($(button).getAttribute('aria-pressed')).toBe('true');
      expect(['benchViewTrail', 'benchViewSpoon', 'benchViewOil'].filter(id => $(id).getAttribute('aria-pressed') === 'true')).toEqual([button]);
    }
    unchanged(before);
  });

  it('a spoon tap requests the same shared view as the native button', () => {
    run(); const before = snapshot(); scenes[1].callbacks.onInspect('spoon');
    expect(scenes.map(scene => last(scene).inspection)).toEqual(['spoon', 'spoon']);
    expect($('benchViewSpoon').getAttribute('aria-pressed')).toBe('true'); unchanged(before);
  });

  it('cancels a pending stroke and pauses replay when the learner changes inspection', () => {
    run(); scrub(0.75); const before = snapshot(); scenes[0].callbacks.onPreview(0.4); $('benchViewOil').click();
    expect(scenes.every(scene => scene.api.cancel.mock.calls.length > 0)).toBe(true);
    expect(scenes.map(scene => last(scene).drawing)).toEqual([false, false]);
    expect(scenes.map(scene => last(scene).elapsed)).toEqual([0.75, 0.75]);
    $('benchTrailPlay').click(); expect(frames.size).toBe(1); $('benchViewSpoon').click();
    expect(frames.size).toBe(0); expect($('benchTrailPlay').getAttribute('aria-pressed')).toBe('false'); unchanged(before);
  });

  it('returns to the pan view for each trail inspection control', () => {
    run(); const before = snapshot();
    for (const action of [() => $('benchTrailReset').click(), () => $('benchTrailStep').click(), () => scrub(1), () => $('benchTrailPlay').click()]) {
      $('benchViewSpoon').click(); action();
      expect(scenes.map(scene => last(scene).inspection)).toEqual(['trail', 'trail']);
      expect($('benchViewTrail').getAttribute('aria-pressed')).toBe('true');
    }
    unchanged(before);
  });

  it('uses unresolved mixing cues on the spoon and oil cues independently of body', () => {
    run(); stage('poured'); $('benchViewSpoon').click();
    const readings = bench.run.mock.results[0].value.arms.map(arm => arm.stages.find(item => item.id === 'poured').reading);
    for (let i = 0; i < readings.length; i++) {
      const text = $('benchArm-' + ['plain', 'reduced'][i]).querySelector('.bench-inspection-cue').textContent;
      expect(text).toContain(S.cues(readings[i]).coating);
    }
    stage('fold-2'); $('benchViewOil').click();
    expect($('benchArm-plain').querySelector('.bench-inspection-cue').textContent).toContain(S.cues(bench.run.mock.results[0].value.arms[0].stages.at(-1).reading).separation);
    expect($('benchArm-plain').querySelector('.bench-inspection-cue').textContent.toLowerCase()).not.toContain('no oil remains');
  });

  it('keeps long measurements expandable without losing a learner’s open choice between stages', () => {
    run(); const details = $('benchArm-plain').querySelector('.bench-observation-details');
    expect(details.open).toBe(false); details.open = true; details.dispatchEvent(new Event('toggle'));
    stage('poured'); expect($('benchArm-plain').querySelector('.bench-observation-details').open).toBe(true);
    expect($('benchArm-reduced').querySelector('.bench-observation-details').open).toBe(false);
  });

  it('reveals the measurement details for printing and restores each screen preference afterward', () => {
    run(); const before = snapshot();
    $('benchArm-plain').querySelector('.bench-observation-details').open = true;
    window.dispatchEvent(new Event('beforeprint'));
    expect([...document.querySelectorAll('.bench-observation-details')].map(n => n.open)).toEqual([true, true]);
    window.dispatchEvent(new Event('afterprint'));
    expect([...document.querySelectorAll('.bench-observation-details')].map(n => n.open)).toEqual([true, false]);
    unchanged(before);
  });
});

describe('Pinned comparisons remain evidence views rather than cooking actions', () => {
  it('distinguishes two stage IDs at time zero and compares their actual recorded quantities', () => {
    run(); const before = snapshot(); stage('baseline'); $('benchPinStage').click();
    expect($('benchUseReference').disabled).toBe(true); stage('poured');
    expect($('benchReference').hidden).toBe(false); expect($('benchUseReference').disabled).toBe(false);
    const text = $('benchReference').textContent;
    expect(text).toContain('Before the addition'); expect(text).toContain('After the measured addition');
    expect(text).toContain('45'); expect(text).toContain('105'); expect(text).toContain('5.4'); unchanged(before);
  });

  it('permits a reference later than the selected stage without treating backward navigation as cooking', () => {
    choose('benchWait', 120); run(); const before = snapshot(); $('benchPinStage').click(); stage('fold-2');
    const text = $('benchReference').textContent;
    expect(text).toContain('After the matched pause'); expect(text).toContain('After fold 2');
    expect(text.toLowerCase()).toMatch(/earlier|before/); expect($('benchUseReference').disabled).toBe(false); unchanged(before);
  });

  it('replaces or clears the reference without altering the notebook', () => {
    run(); const before = snapshot(); stage('baseline'); $('benchPinStage').click(); stage('poured'); $('benchPinStage').click();
    expect($('benchPinnedStage').textContent).toContain('After the measured addition');
    expect($('benchUseReference').disabled).toBe(true); $('benchClearReference').click();
    expect($('benchReference').hidden).toBe(true); unchanged(before);
  });

  it('clears references for a new run and when restoring a different saved plan', () => {
    run(); stage('baseline'); $('benchPinStage').click(); choose('benchDose', 80); run();
    expect($('benchReference').hidden).toBe(true); stage('baseline'); $('benchPinStage').click();
    const history = $('benchHistory').querySelectorAll('button'); history[history.length - 1].click();
    expect($('benchReference').hidden).toBe(true); expect($('benchDose').value).toBe('60');
  });

  it('appends explicit evidence to the learner’s draft without saving or replacing their words', () => {
    run(); const before = snapshot(); stage('baseline'); $('benchPinStage').click(); stage('fold-2');
    const original = 'My idea: the oil and thickness can change independently.'; $('benchReflection').value = original;
    $('benchUseReference').click(); const draft = $('benchReflection').value;
    expect(draft.startsWith(original)).toBe(true); expect(draft.length).toBeGreaterThan(original.length);
    expect(draft).toContain('Before the addition'); expect(draft).toContain('After fold 2');
    expect(draft).toContain('Plain'); expect(draft).toContain('Reduced');
    expect($('benchStatus').textContent.toLowerCase()).toMatch(/draft|save/); unchanged(before);
    $('benchSaveReflection').click(); expect(JSON.parse(localStorage.getItem(key)).items[0].record.reflection).toBe(draft);
  });

  it('refuses an overlong evidence append without truncating an existing explanation', () => {
    run(); const before = snapshot(); stage('baseline'); $('benchPinStage').click(); stage('poured');
    const text = 'x'.repeat(2000); $('benchReflection').value = text; $('benchUseReference').click();
    expect($('benchReflection').value).toBe(text); expect($('benchStatus').textContent).toMatch(/2,?000|too long|room|shorten/i); unchanged(before);
  });

  it('keeps inspection text and reference comparisons available without WebGL', () => {
    window.KitchenSauceBenchScene.mount.mockReturnValue(null); run(); const before = snapshot();
    $('benchViewOil').click(); expect($('benchArm-plain').querySelector('.bench-inspection-cue').textContent).toMatch(/oil/i);
    stage('baseline'); $('benchPinStage').click(); stage('fold-2'); expect($('benchReference').hidden).toBe(false); unchanged(before);
  });
});
