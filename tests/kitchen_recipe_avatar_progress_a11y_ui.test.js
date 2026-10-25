// @vitest-environment jsdom
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';

const require = createRequire(import.meta.url);
const M = require('../stem_lab/kitchen_studio/recipe_lab_avatar_model.js');
const R = require('../stem_lab/kitchen_studio/recipe_lab_engine.js');
const S = require('../stem_lab/kitchen_studio/recipe_lab_sauce_check.js');
const V = require('../stem_lab/kitchen_studio/recipe_lab_avatar_motion.js');
const source = readFileSync('stem_lab/kitchen_studio/recipe_lab_avatar.js', 'utf8');
const $ = id => document.getElementById(id);
let ui;

const session = () => ui.getSession();
const holdingFacts = () => M.holding(M.restoreRecord(session().record));
const recorded = () => ({state: session().state, record: session().record});
const steps = () => [...$('avatarSteps').children];
const badge = li => li.querySelector('.avatar-step-status');
const stepStates = () => steps().map(li => badge(li)?.textContent);
function choose(id, value) {
  $(id).value = String(value);
  $(id).dispatchEvent(new Event('change', {bubbles: true}));
}
function start(activity = 'avatar-sauce-rescue', mode = 'independent') {
  choose('avatarActivity', activity);
  choose('avatarMode', mode);
  $('avatarStart').click();
}
function ready() {
  for (let n = 0; session().pending?.phase !== 'ready' && n < 20; n++) {
    $('avatarPlace').click();
    $('avatarAdvance').click();
  }
  expect(session().pending?.phase).toBe('ready');
}
function action(kind) {
  const button = $('avatar' + kind[0].toUpperCase() + kind.slice(1));
  expect(button.disabled, `${kind} must be available`).toBe(false);
  button.click();
  expect(session().pending?.kind).toBe(kind);
  ready();
  $('avatarCommit').click();
}
function describedBy(node) {
  const ids = (node.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  expect(ids.length, `${node.id} needs an associated description`).toBeGreaterThan(0);
  return ids.map(id => {
    const target = $(id);
    expect(target, `Description ${id} exists`).not.toBeNull();
    return target;
  });
}
function finitePlainSource() {
  start();
  choose('avatarSource', 'plain');
  choose('avatarDose', 100);
  expect(session().state.pot.plainWater).toBe(250);
  for (let n = 0; n < 2; n++) action('pour');
  expect(session().state.pot.plainWater).toBe(50);
}
function heldCoating() {
  start('hold-and-recheck-sauce');
  action('inspect');
  choose('avatarDose', 20);
  action('pour');
  action('fold');
  action('inspect');
  choose('avatarPanWait', 60);
  action('waitPan');
  action('waitPan');
  action('inspect');
  expect(holdingFacts().targetMet).toBe(true);
}

beforeEach(() => {
  document.body.innerHTML = '<div id="host"></div>';
  localStorage.clear();
  window.KitchenRecipes = R;
  window.KitchenSauceCheck = S;
  window.KitchenAvatarStation = M;
  window.KitchenAvatarMotion = V;
  Object.defineProperty(window, 'matchMedia', {configurable: true, value: () => ({matches: true, addEventListener() {}, removeEventListener() {}})});
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  window.eval(source);
  ui = window.KitchenAvatarUI.mount({container: $('host'), model: M});
});
afterEach(() => {
  ui?.dispose();
  vi.restoreAllMocks();
  localStorage.clear();
  document.body.replaceChildren();
});

describe('Chef station progress is readable without border styles or color', () => {
  it('exposes the current, completed, and incomplete milestones after a recorded check', () => {
    start('avatar-sauce-rescue', 'practice');
    expect(stepStates()).toEqual(['Current', 'Not complete', 'Not complete', 'Not complete', 'Not complete']);
    action('inspect');
    expect(stepStates()).toEqual(['Complete', 'Current', 'Not complete', 'Not complete', 'Not complete']);
    expect(steps()[0].textContent).toContain('Inspect');
    expect(steps()[0].querySelectorAll('.avatar-step-status')).toHaveLength(1);
    expect(badge(steps()[0]).closest('[hidden],[aria-hidden="true"]')).toBeNull();
    expect(steps()[1].getAttribute('aria-current')).toBe('step');
    expect(session().record.intents).toHaveLength(1);
  });

  it('identifies the independent sauce sequence as reference steps instead of claiming untracked progress', () => {
    start('avatar-sauce-rescue', 'independent');
    expect(stepStates()).toEqual(Array(5).fill('Reference step'));
    action('inspect');
    expect(stepStates()).toEqual(Array(5).fill('Reference step'));
    expect(session().record.intents).toHaveLength(1);
    expect($('avatarWorkflowHelp').textContent).toMatch(/reference steps.*independent/i);
    expect($('avatarWorkflowHelp').textContent).toMatch(/recorded actions.*fresh evidence/i);
  });

  it('labels reached movement checkpoints as previews and cancellation preserves recorded milestones', () => {
    start('avatar-sauce-rescue', 'practice');
    const before = recorded(), workflow = stepStates();
    $('avatarInspect').click();
    let phases = [...$('avatarPhaseList').children];
    expect(phases.map(li => badge(li)?.textContent)).toEqual(['Current', ...phases.slice(1).map(() => 'Ahead')]);
    expect($('avatarPendingPanel').textContent).toMatch(/checkpoint/i);
    expect($('avatarPendingPanel').textContent).toMatch(/preview/i);
    $('avatarPlace').click();
    $('avatarAdvance').click();
    phases = [...$('avatarPhaseList').children];
    expect(badge(phases[0]).textContent).toBe('Reached');
    expect(badge(phases[1]).textContent).toBe('Current');
    expect(phases.map(li => badge(li)?.textContent)).not.toContain('Complete');
    expect(recorded()).toEqual(before);
    expect(stepStates()).toEqual(workflow);
    $('avatarCancel').click();
    expect(session().pending).toBeNull();
    expect($('avatarPendingPanel').hidden).toBe(true);
    expect(recorded()).toEqual(before);
    expect(stepStates()).toEqual(workflow);
  });

  it('restores milestone text from the committed saved attempt without duplicating badges', () => {
    start('avatar-sauce-rescue', 'practice');
    action('inspect');
    const before = recorded(), labels = steps().map(li => li.textContent);
    const savedId = $('avatarHistory').querySelector('button').dataset.avatarHistoryId;
    start('tomato-texture');
    const saved = [...$('avatarHistory').querySelectorAll('button')].find(node => node.dataset.avatarHistoryId === savedId);
    saved.focus();
    saved.click();
    expect(recorded()).toEqual(before);
    expect(steps().map(li => li.textContent)).toEqual(labels);
    for (const li of steps()) expect(li.querySelectorAll('.avatar-step-status')).toHaveLength(1);
    expect(document.activeElement).toBe(saved);
  });

  it('exposes milestone status text for every activity without recording an action', () => {
    const activities = [...$('avatarActivity').options].map(option => option.value);
    expect(activities.length).toBeGreaterThanOrEqual(21);
    for (const activity of activities) {
      start(activity, 'practice');
      expect(session().record.intents).toHaveLength(0);
      expect(steps().length, activity).toBeGreaterThan(0);
      for (const li of steps()) {
        const current = li.getAttribute('aria-current') === 'step', complete = li.dataset.complete === 'true';
        expect(badge(li), `${activity}: ${li.textContent}`).not.toBeNull();
        expect(badge(li).textContent, activity).toBe(current ? complete ? 'Current · complete' : 'Current' : complete ? 'Complete' : 'Not complete');
        expect(badge(li).getAttribute('aria-hidden')).not.toBe('true');
      }
    }
  });

  it('keeps both completion and current state when recorded cooking remains the active milestone', () => {
    start('moisture-and-browning');
    for (const piece of [0, 1]) {
      choose('avatarMushroomPiece', piece);
      action('turnMushroom');
      action('turnMushroom');
    }
    choose('avatarPanWait', 30);
    action('waitPan');
    expect(steps()[1].dataset.complete).toBe('true');
    expect(steps()[1].getAttribute('aria-current')).toBe('step');
    expect(badge(steps()[1]).textContent).toBe('Current · complete');
    expect(steps()[1].textContent).toContain('30 s');
  });

  it('withdraws completed coating milestones after an actual adjustment, keeping older checks intact', () => {
    heldCoating();
    expect(stepStates()).toEqual(['Complete', 'Complete', 'Complete', 'Complete']);
    const baseline = holdingFacts().baseline;
    choose('avatarDose', 10);
    action('pour');
    expect(holdingFacts().targetMet).toBe(false);
    expect(holdingFacts().baseline).toEqual(baseline);
    expect(stepStates()).toEqual(['Current', 'Not complete', 'Not complete', 'Not complete']);
    expect($('avatarSteps').parentElement.textContent).toMatch(/recorded/i);
    expect($('avatarWorkflowHelp').textContent).toMatch(/later action.*completed condition incomplete again/i);
  });
});

describe('Finite liquid plans have associated, quiet correction feedback', () => {
  it('associates receipt information with both controls and marks a dose that exceeds the remaining water', () => {
    finitePlainSource();
    const receipt = $('avatarSourceReceipt');
    expect(describedBy($('avatarSource'))).toContain(receipt);
    expect(describedBy($('avatarDose'))).toContain(receipt);
    expect($('avatarDose').getAttribute('aria-invalid')).toBe('true');
    expect(receipt.textContent).toMatch(/50 mL.*smaller/i);
    expect($('avatarPour').disabled).toBe(true);
    expect(['polite', 'assertive']).not.toContain(receipt.getAttribute('aria-live'));
    expect(['polite', 'assertive']).not.toContain($('avatarWaterPlan').getAttribute('aria-live'));
  });

  it('clears an invalid dose after a smaller choice without consuming or saving water', () => {
    finitePlainSource();
    const before = recorded(), storage = localStorage.getItem('alloflow-kitchen-avatar-v1');
    choose('avatarDose', 10);
    expect($('avatarDose').getAttribute('aria-invalid')).not.toBe('true');
    expect($('avatarPour').disabled).toBe(false);
    expect($('avatarSourceReceipt').textContent).toContain('10 mL');
    expect($('avatarStatus').textContent).toContain($('avatarSourceReceipt').textContent);
    expect(recorded()).toEqual(before);
    expect(localStorage.getItem('alloflow-kitchen-avatar-v1')).toBe(storage);
  });

  it('recalculates invalid state and explains the selected source without changing the kitchen', () => {
    finitePlainSource();
    const before = recorded();
    choose('avatarSource', 'reduced');
    expect($('avatarDose').getAttribute('aria-invalid')).not.toBe('true');
    expect($('avatarPour').disabled).toBe(false);
    expect($('avatarStatus').textContent).toContain($('avatarSourceReceipt').textContent);
    choose('avatarSource', 'plain');
    expect($('avatarDose').getAttribute('aria-invalid')).toBe('true');
    expect($('avatarStatus').textContent).toMatch(/50 mL.*smaller/i);
    expect(recorded()).toEqual(before);
  });

  it('does not repeat unchanged receipt announcements or announce every movement position', () => {
    start();
    choose('avatarDose', 20);
    const status = $('avatarStatus'), original = status.textContent;
    const observer = new MutationObserver(() => {});
    observer.observe(status, {childList: true, subtree: true, characterData: true});
    choose('avatarDose', 20);
    expect(observer.takeRecords()).toHaveLength(0);
    expect(status.textContent).toBe(original);
    $('avatarPour').click();
    observer.takeRecords();
    const prepared = status.textContent;
    for (const value of [10, 25, 50, 75, 100]) {
      $('avatarMovement').value = String(value);
      $('avatarMovement').dispatchEvent(new Event('input', {bubbles: true}));
    }
    expect(observer.takeRecords()).toHaveLength(0);
    expect(status.textContent).toBe(prepared);
    expect(session().record.intents).toHaveLength(0);
    observer.disconnect();
  });

  it('applies the same correction to a finite saved-water jug', () => {
    start('hold-and-recheck-sauce');
    expect(holdingFacts().savedWaterMl).toBe(150);
    choose('avatarDose', 100);
    action('pour');
    expect(holdingFacts().savedWaterMl).toBe(50);
    expect($('avatarDose').getAttribute('aria-invalid')).toBe('true');
    expect($('avatarSourceReceipt').textContent).toMatch(/50 mL.*smaller/i);
    choose('avatarDose', 50);
    expect($('avatarDose').getAttribute('aria-invalid')).not.toBe('true');
    expect($('avatarPour').disabled).toBe(false);
    expect($('avatarStatus').textContent).toContain($('avatarSourceReceipt').textContent);
  });

  it('discloses the reflection length limit through its associated help without making typing live', () => {
    const reflection = $('avatarReflection');
    const help = describedBy(reflection).map(node => node.textContent).join(' ');
    expect(reflection.maxLength).toBe(2000);
    expect(help).toMatch(/2,?000/);
    expect(help).toMatch(/character/i);
    expect(['polite', 'assertive']).not.toContain(reflection.getAttribute('aria-live'));
    const before = $('avatarStatus').textContent;
    reflection.value = 'My explanation';
    reflection.dispatchEvent(new Event('input', {bubbles: true}));
    expect($('avatarStatus').textContent).toBe(before);
    expect(session().record.intents).toHaveLength(0);
  });
});
