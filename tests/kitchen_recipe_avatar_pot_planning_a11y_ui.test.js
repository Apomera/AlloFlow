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
const storageKey = 'alloflow-kitchen-avatar-v1';
let ui, nearEndFixture, drainedFixture;
const session = () => ui.getSession();
const facts = () => ({state: session().state, record: session().record, receipts: session().receipts});
const plan = kind => $('avatar' + kind[0].toUpperCase() + kind.slice(1) + 'Plan');
const button = kind => $('avatar' + kind[0].toUpperCase() + kind.slice(1));
function mount() { ui = window.KitchenAvatarUI.mount({container: $('potPlanningHost'), model: M}); }
function choose(id, value) {
  $(id).value = String(value);
  $(id).dispatchEvent(new Event('change', {bubbles: true}));
}
function start(activity = 'cover-and-check-pasta', mode = 'independent') {
  choose('avatarActivity', activity);
  choose('avatarMode', mode);
  $('avatarStart').click();
}
function act(s, kind, options = {}) {
  const prior = s;
  s = M.begin(s, kind, options);
  expect(s, kind + ' fixture should prepare').not.toBe(prior);
  while (s.pending.phase !== 'ready') s = M.advance(s, s.pending.token);
  const prepared = s;
  s = M.commit(s, s.pending.token);
  expect(s, kind + ' fixture should commit').not.toBe(prepared);
  return s;
}
function nearEnd() {
  if (!nearEndFixture) {
    let s = M.create({activity: 'cover-and-check-pasta', mode: 'independent'});
    for (let n = 0; n < 51; n++) s = act(s, 'waitPot', {seconds: 60});
    s = act(s, 'waitPot', {seconds: 30});
    nearEndFixture = act(s, 'waitPot', {seconds: 15});
    expect(nearEndFixture.state.time).toBe(3585);
  }
  return nearEndFixture;
}
function drained() {
  if (!drainedFixture) {
    let s = M.create({activity: 'cook-save-and-drain-pasta', mode: 'independent'});
    s = act(s, 'samplePasta');
    for (let n = 0; !s.state.pot.drained && n < 10; n++) s = act(s, 'drainPasta', {amountMl: 250});
    expect(s.state.pot.drained).toBe(true);
    drainedFixture = s;
  }
  return drainedFixture;
}
function seed(s) {
  ui.dispose();
  const item = {id: 'pot-planning-fixture', record: M.createRecord(s)};
  localStorage.setItem(storageKey, JSON.stringify({version: 1, current: item, items: [item]}));
  mount();
}
function ready() {
  for (let n = 0; session().pending?.phase !== 'ready' && n < 20; n++) {
    $('avatarPlace').click();
    $('avatarAdvance').click();
  }
  expect(session().pending?.phase).toBe('ready');
}
function action(kind) {
  expect(button(kind).disabled, kind + ' should be available').toBe(false);
  button(kind).click();
  ready();
  $('avatarCommit').click();
}
function references(id) {
  const ids = ($(id).getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  ids.forEach(ref => expect($(ref), 'Description ' + ref + ' must exist').not.toBeNull());
  return ids;
}
function availability(kind, available) {
  expect(button(kind).disabled).toBe(!available);
  expect(references(button(kind).id)).toContain(plan(kind).id);
  if (session().mode !== 'watch') expect(plan(kind).closest('[hidden]')).toBeNull();
  return plan(kind).textContent;
}
beforeEach(() => {
  document.body.innerHTML = '<div id="potPlanningHost"></div>';
  localStorage.clear();
  window.KitchenRecipes = R;
  window.KitchenSauceCheck = S;
  window.KitchenAvatarStation = M;
  window.KitchenAvatarMotion = V;
  Object.defineProperty(window, 'matchMedia', {configurable: true, value: () => ({matches: true, addEventListener() {}, removeEventListener() {}})});
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  window.eval(source);
  mount();
});
afterEach(() => {
  ui?.dispose();
  vi.restoreAllMocks();
  localStorage.clear();
  document.body.replaceChildren();
});

describe('Pot planning exposes current prerequisites and preserves deliberate actions', () => {
  it.each(['reserve-and-drain', 'cover-and-check-pasta', 'separate-and-check-pasta', 'cook-save-and-drain-pasta'])('associates sampling and the hand chooser with visible guidance in %s', activity => {
    start(activity);
    const before = facts();
    expect(availability('samplePasta', true)).toMatch(/sample|texture|observation/i);
    choose('avatarActiveTool', 'samplePasta');
    expect(references('avatarActiveTool')).toContain('avatarSamplePastaPlan');
    expect($('avatarStatus').textContent).toBe(plan('samplePasta').textContent);
    expect(plan('samplePasta').closest('[aria-live]')).toBeNull();
    expect(facts()).toEqual(before);
  });

  it.each([
    ['cover-and-check-pasta', 'avatarPotWait', 'avatarPotHeat'],
    ['separate-and-check-pasta', 'avatarStrandWait', 'avatarStrandHeat'],
  ])('associates both settings with their own action plans in %s', (activity, waitId, heatId) => {
    start(activity);
    expect(references(waitId)).toContain('avatarWaitPotPlan');
    expect(references(heatId)).toContain('avatarSetPotHeatPlan');
    if (activity === 'cover-and-check-pasta') {
      expect(references('avatarLidPosition')).toEqual(expect.arrayContaining(['avatarMoveLidPlan', 'avatarSamplePastaPlan']));
      expect(plan('moveLid').closest('[hidden]')).toBeNull();
    }
  });

  it('explains covered sampling and recovers only after a released lift, including the hand action', () => {
    start();
    choose('avatarLidPosition', 'covered');
    action('moveLid');
    const covered = facts();
    expect(availability('samplePasta', false)).toMatch(/lift|rest|uncover/i);
    choose('avatarActiveTool', 'samplePasta');
    expect($('avatarStatus').textContent).toBe(plan('samplePasta').textContent);
    $('avatarHandle').dispatchEvent(new MouseEvent('click', {bubbles: true, detail: 0}));
    expect($('avatarStatus').textContent).toBe(plan('samplePasta').textContent);
    expect(facts()).toEqual(covered);
    choose('avatarLidPosition', 'rest');
    button('moveLid').click();
    expect(session().state.pot.lid).toBe('covered');
    expect(button('samplePasta').disabled).toBe(true);
    ready();
    $('avatarCommit').click();
    expect(session().state.pot.lid).toBe('rest');
    expect(availability('samplePasta', true)).toMatch(/sample|texture|observation/i);
    expect(session().state.time).toBe(covered.state.time);
    expect(session().state.pot.sample).toBe(covered.state.pot.sample);
  });

  it('treats an unchanged lid position as a valid no-op and announces recovery', () => {
    start();
    const before = facts();
    choose('avatarLidPosition', 'rest');
    expect(availability('moveLid', false)).toMatch(/already|same|unchanged/i);
    expect($('avatarLidPosition').getAttribute('aria-invalid')).not.toBe('true');
    expect($('avatarStatus').textContent).toContain(plan('moveLid').textContent);
    choose('avatarLidPosition', 'covered');
    expect(button('moveLid').disabled).toBe(false);
    expect($('avatarStatus').textContent).toContain(plan('moveLid').textContent);
    expect(facts()).toEqual(before);
  });

  it.each([
    ['cover-and-check-pasta', 'avatarPotHeat', 3],
    ['separate-and-check-pasta', 'avatarStrandHeat', 2],
    ['cook-save-and-drain-pasta', 'avatarPotHeat', 3],
  ])('explains a valid unchanged burner setting in %s', (activity, control, initial) => {
    start(activity);
    const before = facts();
    choose(control, initial);
    expect(availability('setPotHeat', false)).toMatch(/already|same|unchanged/i);
    expect($(control).getAttribute('aria-invalid')).not.toBe('true');
    expect($('avatarStatus').textContent).toContain(plan('setPotHeat').textContent);
    choose(control, 0);
    expect(button('setPotHeat').disabled).toBe(false);
    expect($('avatarStatus').textContent).toContain(plan('setPotHeat').textContent);
    expect(facts()).toEqual(before);
  });

  it('retains a prepared lid destination despite DOM changes and cancellation leaves the pot unchanged', () => {
    start();
    choose('avatarLidPosition', 'covered');
    button('moveLid').click();
    const before = facts(), status = $('avatarStatus').textContent;
    choose('avatarLidPosition', 'rest');
    expect(session().pending.placement).toBe('covered');
    expect($('avatarLidPosition').value).toBe('covered');
    expect(plan('moveLid').textContent).toMatch(/cover/i);
    expect(plan('moveLid').textContent).toMatch(/finish|cancel|prepared/i);
    expect($('avatarStatus').textContent).toBe(status);
    expect(facts()).toEqual(before);
    $('avatarCancel').click();
    expect(facts()).toEqual(before);
    expect(session().state.pot.lid).toBe('rest');
    expect(button('samplePasta').disabled).toBe(false);
  });

  it.each([
    ['waitPot', 'avatarPotWait', 30, 15, 'seconds'],
    ['setPotHeat', 'avatarPotHeat', 0, 2, 'setting'],
  ])('keeps prepared %s guidance tied to its frozen setting during quiet rerenders', (kind, control, selected, replacement, pendingField) => {
    start();
    choose(control, selected);
    button(kind).click();
    const before = facts(), status = $('avatarStatus').textContent;
    choose(control, replacement);
    expect(session().pending[pendingField]).toBe(selected);
    expect($(control).value).toBe(String(selected));
    expect(plan(kind).textContent).toMatch(/finish|cancel|prepared/i);
    expect($('avatarStatus').textContent).toBe(status);
    $('avatarMovement').value = '70';
    $('avatarMovement').dispatchEvent(new Event('input', {bubbles: true}));
    expect($('avatarStatus').textContent).toBe(status);
    expect(facts()).toEqual(before);
    $('avatarCancel').click();
    expect(facts()).toEqual(before);
  });

  it('explains a too-long wait while allowing the remaining fifteen seconds', () => {
    seed(nearEnd());
    const before = facts();
    choose('avatarPotWait', 30);
    expect(availability('waitPot', false)).toMatch(/15|3,?600|limit|remaining/i);
    expect($('avatarStatus').textContent).toContain(plan('waitPot').textContent);
    expect($('avatarPotWait').getAttribute('aria-invalid')).not.toBe('true');
    choose('avatarPotWait', 15);
    expect(button('waitPot').disabled).toBe(false);
    expect(facts()).toEqual(before);
    action('waitPot');
    expect(session().state.time).toBe(3600);
    expect(availability('samplePasta', false)).toMatch(/limit|fresh/i);
  });

  it('keeps Practice guidance advisory instead of inventing a mandatory first sample for lid or heat changes', () => {
    start('cover-and-check-pasta', 'practice');
    expect(session().state.pot.sample).toBeNull();
    choose('avatarLidPosition', 'covered');
    expect(button('moveLid').disabled).toBe(false);
    choose('avatarPotHeat', 0);
    expect(button('setPotHeat').disabled).toBe(false);
    choose('avatarPotWait', 15);
    expect(button('waitPot').disabled).toBe(false);
    expect(session().record.intents).toHaveLength(0);
  });

  it('describes Watch mode through the demonstration controls and removes the hand association on unrelated activities', () => {
    start('cover-and-check-pasta', 'watch');
    expect(availability('samplePasta', false)).toMatch(/watch|demonstrat/i);
    expect(availability('moveLid', false)).toMatch(/watch|demonstrat/i);
    expect($('avatarLearnerControls').hidden).toBe(true);
    start('cover-and-check-pasta');
    choose('avatarActiveTool', 'samplePasta');
    expect(references('avatarActiveTool')).toContain('avatarSamplePastaPlan');
    start('avatar-sauce-rescue');
    expect(references('avatarActiveTool')).toContain('avatarInspectPlan');
    for (const kind of ['samplePasta', 'moveLid', 'waitPot', 'setPotHeat']) expect(references('avatarActiveTool')).not.toContain(plan(kind).id);
    expect(plan('samplePasta').closest('[hidden]')).not.toBeNull();
  });

  it('distinguishes recorded drainage from sampling access and permits switching the emptied pot burner off', () => {
    seed(drained());
    const before = facts();
    expect(availability('samplePasta', false)).toMatch(/drain|colander|pot/i);
    choose('avatarPotHeat', 2);
    expect(availability('setPotHeat', false)).toMatch(/off|drain|empty/i);
    choose('avatarPotHeat', 0);
    expect(button('setPotHeat').disabled).toBe(false);
    expect($('avatarPotHeat').getAttribute('aria-invalid')).not.toBe('true');
    expect(facts()).toEqual(before);
    action('setPotHeat');
    expect(session().state.pot.heat).toBe(0);
    expect(button('samplePasta').disabled).toBe(true);
    expect(session().record.intents).toHaveLength(before.record.intents.length + 1);
  });

  it('keeps sample rehearsal quiet and records exactly one observation only on release', () => {
    start();
    button('samplePasta').click();
    const before = facts(), status = $('avatarStatus').textContent;
    choose('avatarPotWait', 15);
    $('avatarMovement').value = '50';
    $('avatarMovement').dispatchEvent(new Event('input', {bubbles: true}));
    expect($('avatarStatus').textContent).toBe(status);
    expect(facts()).toEqual(before);
    ready();
    $('avatarCommit').click();
    expect(session().record.intents).toHaveLength(before.record.intents.length + 1);
    expect(session().record.intents.at(-1).kind).toBe('samplePasta');
    expect(session().state.time).toBe(before.state.time);
    expect(session().state.pot.sample).not.toBeNull();
    expect(button('samplePasta').disabled).toBe(false);
  });

  it('keeps an evaporated pot distinct from drainage: sampling remains possible but covering does not', () => {
    seed(nearEnd());
    expect(session().state.pot.water).toBe(0);
    expect(session().state.pot.drained).toBe(false);
    expect(button('samplePasta').disabled).toBe(false);
    choose('avatarLidPosition', 'covered');
    expect(availability('moveLid', false)).toMatch(/water|empty|evaporat/i);
    expect($('avatarLidPosition').getAttribute('aria-invalid')).not.toBe('true');
    choose('avatarActiveTool', 'samplePasta');
    expect($('avatarStatus').textContent).toBe(plan('samplePasta').textContent);
    expect(button('samplePasta').disabled).toBe(false);
  });
});
