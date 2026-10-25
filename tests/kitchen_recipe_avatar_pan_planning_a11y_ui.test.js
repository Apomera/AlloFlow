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
const activity = 'cool-and-fold-sauce', storageKey = 'alloflow-kitchen-avatar-v1';
const ids = {movePan: 'avatarMovePanPlan', waitPan: 'avatarWaitPanPlan', setPanHeat: 'avatarSetPanHeatPlan'};
let ui;
const session = () => ui.getSession();
const facts = () => ({state: session().state, record: session().record, receipts: session().receipts});
const guidance = kind => $(ids[kind]).textContent;
const status = () => $('avatarStatus').textContent;

function mount() { ui = window.KitchenAvatarUI.mount({container: $('panPlanningHost'), model: M}); }
function choose(id, value) { $(id).value = String(value); $(id).dispatchEvent(new Event('change', {bubbles: true})); }
function start(id = activity, mode = 'independent') { choose('avatarActivity', id); choose('avatarMode', mode); $('avatarStart').click(); }
function modelAction(s, kind, options = {}) {
  const before = s;
  s = M.begin(s, kind, options);
  expect(s, `${kind} prepares`).not.toBe(before);
  while (s.pending.phase !== 'ready') s = M.advance(s, s.pending.token);
  const prepared = s;
  s = M.commit(s, s.pending.token);
  expect(s, `${kind} commits`).not.toBe(prepared);
  return s;
}
function seed(s) {
  ui.dispose();
  const item = {id: 'pan-planning-fixture', record: M.createRecord(s)};
  localStorage.setItem(storageKey, JSON.stringify({version: 1, current: item, items: [item]}));
  mount();
}
function ready() {
  for (let n = 0; session().pending?.phase !== 'ready' && n < 20; n++) { $('avatarPlace').click(); $('avatarAdvance').click(); }
  expect(session().pending?.phase).toBe('ready');
}
function action(kind) {
  const button = $('avatar' + kind[0].toUpperCase() + kind.slice(1));
  expect(button.disabled, `${kind} is available`).toBe(false);
  button.click(); ready(); $('avatarCommit').click();
}
function descriptions(id) {
  const refs = ($(id).getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  refs.forEach(ref => expect($(ref), `Description ${ref} exists`).not.toBeNull());
  return refs;
}
function availability(kind, available) {
  const button = $('avatar' + kind[0].toUpperCase() + kind.slice(1)), card = $(ids[kind]);
  expect(button.disabled).toBe(!available);
  expect(card.dataset.available).toBe(String(available));
  expect(card.textContent).toContain(available ? 'Available.' : 'Unavailable.');
  expect(descriptions(button.id)).toContain(card.id);
  return card.textContent;
}
function lateAttempt() {
  let s = M.create({activity, mode: 'independent'});
  s = modelAction(s, 'movePan', {placement: 'trivet'});
  s = modelAction(s, 'setPanHeat', {setting: 0});
  for (let n = 0; n < 59; n++) s = modelAction(s, 'waitPan', {seconds: 60});
  s = modelAction(s, 'waitPan', {seconds: 30});
  return modelAction(s, 'waitPan', {seconds: 15});
}

beforeEach(() => {
  document.body.innerHTML = '<div id="panPlanningHost"></div>';
  localStorage.clear();
  window.KitchenRecipes = R; window.KitchenSauceCheck = S; window.KitchenAvatarStation = M; window.KitchenAvatarMotion = V;
  Object.defineProperty(window, 'matchMedia', {configurable: true, value: () => ({matches: true, addEventListener() {}, removeEventListener() {}})});
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  window.eval(source); mount(); start();
});
afterEach(() => { ui?.dispose(); vi.restoreAllMocks(); localStorage.clear(); document.body.replaceChildren(); });

describe('Pan planning explains placement, heat and time before a deliberate release', () => {
  it('associates each select and prepare button with its own quiet availability card', () => {
    for (const [control, kind] of [['avatarPanPlacement', 'movePan'], ['avatarPanWait', 'waitPan'], ['avatarPanHeat', 'setPanHeat']]) {
      expect(descriptions(control)).toContain(ids[kind]);
      expect(descriptions('avatar' + kind[0].toUpperCase() + kind.slice(1))).toContain(ids[kind]);
      expect($(ids[kind]).closest('[aria-live]')).toBeNull();
      expect($(ids[kind]).getAttribute('role')).not.toBe('status');
      expect($(ids[kind]).closest('fieldset').id).toBe('avatarBrowningPlan');
    }
  });

  it('explains an unchanged placement without a field error and recovers when trivet is chosen', () => {
    const before = facts();
    choose('avatarPanPlacement', 'burner');
    expect(availability('movePan', false)).toMatch(/already.*burner/i);
    expect(status()).toBe(guidance('movePan'));
    expect($('avatarPanPlacement').getAttribute('aria-invalid')).not.toBe('true');
    choose('avatarPanPlacement', 'trivet');
    expect(availability('movePan', true)).toMatch(/trivet/i);
    expect(status()).toBe(guidance('movePan'));
    expect(facts()).toEqual(before);
  });

  it('explains an unchanged burner setting as a valid no-op and permits a different setting', () => {
    const before = facts();
    choose('avatarPanHeat', 2);
    expect(availability('setPanHeat', false)).toMatch(/already/i);
    expect(guidance('setPanHeat')).toMatch(/2|medium/i);
    expect(status()).toBe(guidance('setPanHeat'));
    expect($('avatarPanHeat').getAttribute('aria-invalid')).not.toBe('true');
    choose('avatarPanHeat', 0);
    expect(availability('setPanHeat', true)).toMatch(/off|0/i);
    expect(facts()).toEqual(before);
  });

  it('distinguishes a trivet move from turning off the burner or immediately cooling the pan', () => {
    const before = facts();
    action('movePan');
    const committedState = session().state;
    expect(R.panPosition(committedState)).toMatchObject({site: 'trivet', heat: 0});
    expect(committedState.pan).toMatchObject({heat: 2, temp: 115});
    expect(session().state.time).toBe(before.state.time);
    expect(session().record.intents).toHaveLength(before.record.intents.length + 1);
    expect(availability('movePan', false)).toMatch(/already.*trivet/i);
    choose('avatarPanHeat', 2);
    expect(availability('setPanHeat', false)).toMatch(/already/i);
    choose('avatarPanPlacement', 'burner');
    expect(availability('movePan', true)).toMatch(/burner/i);
    expect($('avatarMushroomChoice').textContent).toMatch(/trivet/i);
  });

  it('retains the prepared destination when a disabled chooser is altered programmatically', () => {
    $('avatarMovePan').click();
    const before = facts(), priorStatus = status();
    expect(session().pending).toMatchObject({kind: 'movePan', placement: 'trivet', fromPlacement: 'burner'});
    choose('avatarPanPlacement', 'burner');
    expect($('avatarPanPlacement').value).toBe('trivet');
    expect(session().pending.placement).toBe('trivet');
    expect(guidance('movePan')).toMatch(/trivet/i);
    expect(guidance('movePan')).toMatch(/finish|cancel/i);
    expect(status()).toBe(priorStatus);
    $('avatarCancel').click();
    expect(facts()).toEqual(before);
  });

  it('keeps a prepared burner adjustment frozen and releases its original setting once', () => {
    choose('avatarPanHeat', 0); $('avatarSetPanHeat').click();
    const before = facts(), priorStatus = status();
    choose('avatarPanHeat', 3);
    expect($('avatarPanHeat').value).toBe('0');
    expect(session().pending).toMatchObject({kind: 'setPanHeat', setting: 0, initialSetting: 2});
    expect(guidance('setPanHeat')).toMatch(/off|0/i);
    expect(guidance('setPanHeat')).toMatch(/finish|cancel/i);
    expect(status()).toBe(priorStatus);
    ready(); $('avatarCommit').click();
    expect(session().state.pan.heat).toBe(0);
    expect(session().state.time).toBe(before.state.time);
    expect(session().record.intents).toHaveLength(before.record.intents.length + 1);
    expect(session().record.intents.at(-1)).toMatchObject({kind: 'setPanHeat', setting: 0});
  });

  it('keeps a prepared interval frozen and cancellation leaves kitchen time unchanged', () => {
    choose('avatarPanWait', 30); $('avatarWaitPan').click();
    const before = facts(), priorStatus = status();
    choose('avatarPanWait', 60);
    expect($('avatarPanWait').value).toBe('30');
    expect(session().pending).toMatchObject({kind: 'waitPan', seconds: 30});
    expect(guidance('waitPan')).toMatch(/30/);
    expect(guidance('waitPan')).toMatch(/finish|cancel/i);
    expect(status()).toBe(priorStatus);
    $('avatarCancel').click();
    expect(facts()).toEqual(before);
  });

  it('keeps movement scrubbing quiet without changing the current prepared explanation', () => {
    $('avatarMovePan').click();
    const before = facts(), priorStatus = status(), priorGuidance = guidance('movePan');
    for (const value of [15, 45, 80]) { $('avatarMovement').value = String(value); $('avatarMovement').dispatchEvent(new Event('input', {bubbles: true})); }
    expect(status()).toBe(priorStatus);
    expect(guidance('movePan')).toBe(priorGuidance);
    expect(facts()).toEqual(before);
  });

  it('advances the selected kitchen interval only on final Release and records it once', () => {
    choose('avatarPanWait', 30);
    const before = facts();
    $('avatarWaitPan').click(); ready();
    expect(facts()).toEqual(before);
    $('avatarCommit').click(); $('avatarCommit').click();
    expect(session().state.time).toBe(before.state.time + 30);
    expect(session().record.intents).toHaveLength(before.record.intents.length + 1);
    expect(session().record.intents.at(-1)).toMatchObject({kind: 'waitPan', seconds: 30});
  });

  it('shares the unchanged-placement correction with the hand chooser and failed semantic activation', () => {
    choose('avatarPanPlacement', 'burner');
    const before = facts();
    choose('avatarActiveTool', 'movePan');
    expect(descriptions('avatarActiveTool')).toContain(ids.movePan);
    expect(status()).toBe(guidance('movePan'));
    $('avatarHandle').dispatchEvent(new MouseEvent('click', {detail: 0, bubbles: true}));
    expect(status()).toBe(guidance('movePan'));
    expect(status()).toMatch(/already.*burner/i);
    expect(session().pending).toBeNull();
    expect(facts()).toEqual(before);
  });

  it('updates the hand chooser description to the selected placement, heat, or wait plan', () => {
    const before = facts();
    for (const kind of ['movePan', 'setPanHeat', 'waitPan']) {
      choose('avatarActiveTool', kind);
      expect(descriptions('avatarActiveTool')).toContain(ids[kind]);
      expect(status()).toBe(guidance(kind));
    }
    expect(facts()).toEqual(before);
  });

  it('explains the remaining time budget and permits the shorter interval that fits', () => {
    seed(lateAttempt());
    expect(session().state.time).toBe(3585);
    const before = facts();
    choose('avatarPanWait', 30);
    expect(availability('waitPan', false)).toMatch(/15/);
    expect(guidance('waitPan')).toMatch(/remain|limit|fit/i);
    expect(status()).toBe(guidance('waitPan'));
    expect($('avatarPanWait').getAttribute('aria-invalid')).not.toBe('true');
    choose('avatarPanWait', 15);
    expect(availability('waitPan', true)).toMatch(/15/);
    expect(facts()).toEqual(before);
  });

  it('explains the full kitchen-time limit instead of an ordinary unchanged selection', () => {
    seed(modelAction(lateAttempt(), 'waitPan', {seconds: 15}));
    expect(session().state.time).toBe(3600);
    for (const kind of ['movePan', 'setPanHeat', 'waitPan']) expect(availability(kind, false)).toMatch(/time.*limit|kitchen.time.*limit/i);
    choose('avatarPanPlacement', 'burner');
    expect(status()).toMatch(/fresh/i);
    expect(session().pending).toBeNull();
  });

  it('explains an exhausted action allowance on each pan plan', () => {
    let s = M.create({activity, mode: 'independent'});
    for (let n = 0; n < M.limit; n++) s = modelAction(s, 'inspect');
    seed(s);
    expect(session().limitReached).toBe(true);
    for (const kind of ['movePan', 'setPanHeat', 'waitPan']) expect(availability(kind, false)).toMatch(/action limit/i);
    choose('avatarPanWait', 15);
    expect(status()).toMatch(/fresh/i);
  });

  it('keeps Practice suggestions advisory for otherwise usable pan choices', () => {
    start(activity, 'practice');
    expect(session().guide.kind).toBe('inspect');
    for (const kind of ['movePan', 'setPanHeat', 'waitPan']) availability(kind, true);
    choose('avatarPanPlacement', 'burner');
    expect(availability('movePan', false)).toMatch(/already/i);
    choose('avatarPanPlacement', 'trivet');
    availability('movePan', true);
  });

  it('describes Watch mode through demonstration controls and keeps learner planning quiet', () => {
    start(activity, 'watch');
    expect($('avatarLearnerControls').hidden).toBe(true);
    for (const kind of ['movePan', 'setPanHeat', 'waitPan']) expect(availability(kind, false)).toMatch(/Watch.*demonstration/i);
    const before = facts(), priorStatus = status();
    choose('avatarPanWait', 15);
    expect(status()).toBe(priorStatus);
    expect(facts()).toEqual(before);
  });

  it('uses the same heat and interval explanations in the other pan activities', () => {
    for (const id of ['mushroom-turning', 'preheat-and-load-mushrooms', 'finish-pasta-in-sauce', 'hold-and-recheck-sauce', 'soften-and-press-tomatoes', 'moisture-and-browning', 'reduce-and-check-sauce']) {
      start(id);
      const before = facts();
      choose('avatarPanHeat', session().state.pan.heat);
      expect(availability('setPanHeat', false)).toMatch(/already/i);
      expect(status()).toBe(guidance('setPanHeat'));
      choose('avatarPanWait', 15);
      expect(availability('waitPan', true)).toMatch(/15/);
      expect(status()).toBe(guidance('waitPan'));
      expect(facts()).toEqual(before);
    }
  });

  it('removes a stale pan-plan description from the hand chooser after switching tools', () => {
    choose('avatarActiveTool', 'movePan');
    expect(descriptions('avatarActiveTool')).toContain(ids.movePan);
    start('avatar-sauce-rescue');
    expect($('avatarBrowningPlan').hidden).toBe(true);
    expect(descriptions('avatarActiveTool')).toContain('avatarInspectPlan');
    for (const id of Object.values(ids)) expect(descriptions('avatarActiveTool')).not.toContain(id);
  });
});
