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
const activity = 'portion-and-plate', storageKey = 'alloflow-kitchen-avatar-v1';
let ui;
const fixtures = new Map();
const session = () => ui.getSession();
const portions = () => R.serving(session().state);
const facts = () => ({state: session().state, record: session().record, receipts: session().receipts});
const card = kind => $('avatar' + kind[0].toUpperCase() + kind.slice(1) + 'Plan');
const button = kind => $('avatar' + kind[0].toUpperCase() + kind.slice(1));
const status = () => $('avatarStatus').textContent;
function mount() { ui = window.KitchenAvatarUI.mount({container: $('platingPlanningHost'), model: M}); }
function choose(id, value) { $(id).value = String(value); $(id).dispatchEvent(new Event('change', {bubbles: true})); }
function start(mode = 'independent', id = activity) { choose('avatarActivity', id); choose('avatarMode', mode); $('avatarStart').click(); }
function act(s, kind, options = {}) {
  const prior = s;
  s = M.begin(s, kind, options);
  expect(s, `${kind} fixture prepares`).not.toBe(prior);
  while (s.pending.phase !== 'ready') s = M.advance(s, s.pending.token);
  const prepared = s;
  s = M.commit(s, s.pending.token);
  expect(s, `${kind} fixture commits`).not.toBe(prepared);
  return s;
}
function distributed(mode, counts) {
  const key = mode + ':' + counts.join(',');
  if (!fixtures.has(key)) {
    let s = M.create({activity, mode});
    counts.forEach((count, plate) => { for (let n = 0; n < count; n++) s = act(s, 'serve', {plate}); });
    fixtures.set(key, s);
  }
  return fixtures.get(key);
}
function seed(s) {
  ui.dispose();
  const item = {id: 'plating-planning-fixture', record: M.createRecord(s)};
  localStorage.setItem(storageKey, JSON.stringify({version: 1, current: item, items: [item]}));
  mount();
}
function ready() {
  for (let n = 0; session().pending?.phase !== 'ready' && n < 20; n++) { $('avatarPlace').click(); $('avatarAdvance').click(); }
  expect(session().pending?.phase).toBe('ready');
}
function action(kind) { expect(button(kind).disabled, `${kind} available`).toBe(false); button(kind).click(); ready(); $('avatarCommit').click(); }
function references(id) {
  const ids = ($(id).getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  ids.forEach(ref => expect($(ref), `Description ${ref} exists`).not.toBeNull());
  return ids;
}
function availability(kind, available) {
  expect(button(kind).disabled).toBe(!available);
  expect(references(button(kind).id)).toContain(card(kind).id);
  expect(card(kind).dataset.available).toBe(String(available));
  expect(card(kind).textContent).toContain(available ? 'Available.' : 'Unavailable.');
  return card(kind).textContent;
}

beforeEach(() => {
  document.body.innerHTML = '<div id="platingPlanningHost"></div>';
  localStorage.clear();
  window.KitchenRecipes = R; window.KitchenSauceCheck = S; window.KitchenAvatarStation = M; window.KitchenAvatarMotion = V;
  Object.defineProperty(window, 'matchMedia', {configurable: true, value: () => ({matches: true, addEventListener() {}, removeEventListener() {}})});
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  window.eval(source); mount(); start();
});
afterEach(() => { ui?.dispose(); vi.restoreAllMocks(); localStorage.clear(); document.body.replaceChildren(); });

describe('Plating planning exposes actual finite portions before a separate release', () => {
  it('associates the chooser and each preparation button with quiet visible action guidance', () => {
    expect(references('avatarPlate')).toEqual(expect.arrayContaining(['avatarPlateReceipt', 'avatarServePlan', 'avatarReturnPlan']));
    for (const kind of ['serve', 'return', 'finish']) {
      expect(references(button(kind).id)).toContain(card(kind).id);
      expect(card(kind).closest('fieldset').id).toBe('avatarPlatePlan');
      expect(card(kind).closest('[aria-live]')).toBeNull();
      expect(card(kind).getAttribute('role')).not.toBe('status');
    }
  });

  it('explains an initially empty plate and unfinished pan without marking the plate choice invalid', () => {
    expect(availability('serve', true)).toMatch(/1|one/i);
    expect(availability('return', false)).toMatch(/empty|nothing|0.*spoon/i);
    expect(availability('finish', false)).toMatch(/8|eight/i);
    expect($('avatarPlate').getAttribute('aria-invalid')).not.toBe('true');
    expect(portions()).toMatchObject({plates: [0, 0], remaining: 8});
  });

  it('announces the chosen inventory and both transfer outcomes while retaining selector focus', () => {
    $('avatarPlate').focus();
    const before = facts();
    choose('avatarPlate', 1);
    expect(status()).toContain($('avatarPlateReceipt').textContent);
    expect(status()).toContain(card('serve').textContent);
    expect(status()).toContain(card('return').textContent);
    expect(status()).toMatch(/Plate 2/i);
    expect(document.activeElement).toBe($('avatarPlate'));
    expect(facts()).toEqual(before);
  });

  it('keeps scene keyboard focus and gives the same empty-plate explanation instead of generic prepare advice', () => {
    const before = facts();
    $('avatarSelect-plate-0').dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true}));
    expect($('avatarPlate').value).toBe('1');
    expect(document.activeElement).toBe($('avatarSelect-plate-1'));
    expect(status()).toContain(card('return').textContent);
    expect(status()).toMatch(/empty|nothing|0.*spoon/i);
    expect(status()).not.toContain('Prepare an action when you are ready');
    expect(facts()).toEqual(before);
  });

  it('shares the blocked return reason with the hand chooser and failed semantic hand activation', () => {
    const before = facts();
    choose('avatarActiveTool', 'return');
    expect(references('avatarActiveTool')).toContain('avatarReturnPlan');
    expect(status()).toBe(card('return').textContent);
    $('avatarHandle').dispatchEvent(new MouseEvent('click', {bubbles: true, detail: 0}));
    expect(status()).toBe(card('return').textContent);
    expect(session().pending).toBeNull();
    expect(facts()).toEqual(before);
  });

  it('treats four spoonfuls as a target and keeps a fifth serving available', () => {
    seed(distributed('independent', [4, 0]));
    choose('avatarPlate', 0);
    const before = facts();
    expect(availability('serve', true)).toMatch(/spoonful|serve|plate/i);
    expect($('avatarPlate').getAttribute('aria-invalid')).not.toBe('true');
    action('serve');
    expect(portions()).toMatchObject({plates: [5, 0], remaining: 3});
    expect(session().state.time).toBe(before.state.time);
    expect(session().record.intents).toHaveLength(before.record.intents.length + 1);
  });

  it('explains an empty pan while allowing food to be returned from the selected nonempty plate', () => {
    seed(distributed('independent', [8, 0]));
    choose('avatarPlate', 0);
    expect(availability('serve', false)).toMatch(/pan|remaining|left/i);
    expect(availability('return', true)).toMatch(/spoonful|return|pan/i);
    const before = facts();
    action('return');
    expect(portions()).toMatchObject({plates: [7, 0], remaining: 1});
    expect(availability('serve', true)).toMatch(/spoonful|serve|plate/i);
    expect(session().record.intents).toHaveLength(before.record.intents.length + 1);
  });

  it('recovers a blocked return when a nonempty plate is chosen without transferring food', () => {
    seed(distributed('independent', [1, 0]));
    choose('avatarPlate', 1);
    expect(availability('return', false)).toMatch(/empty|nothing|0.*spoon/i);
    const before = facts();
    choose('avatarPlate', 0);
    expect(availability('return', true)).toMatch(/pan|return/i);
    expect(status()).toContain(card('return').textContent);
    expect(facts()).toEqual(before);
  });

  it('explains the actual unequal Practice finish and how to rebalance it', () => {
    seed(distributed('practice', [5, 3]));
    const before = facts();
    expect(availability('finish', false)).toMatch(/5.*3|3.*5/i);
    expect(card('finish').textContent).toMatch(/return/i);
    expect(card('finish').textContent).toMatch(/serve|other plate|four|4/i);
    choose('avatarActiveTool', 'finish');
    expect(references('avatarActiveTool')).toContain('avatarFinishPlan');
    expect(status()).toBe(card('finish').textContent);
    expect(facts()).toEqual(before);
  });

  it('unlocks Practice finishing only after actual return and serving make four spoonfuls each', () => {
    seed(distributed('practice', [5, 3]));
    choose('avatarPlate', 0); action('return');
    expect(availability('finish', false)).toMatch(/1|one/i);
    choose('avatarPlate', 1); action('serve');
    expect(portions()).toMatchObject({plates: [4, 4], remaining: 0, balanced: true});
    expect(availability('finish', true)).toMatch(/4|four|equal/i);
  });

  it('permits an unequal Independent finish and describes the actual counts rather than inventing balance', () => {
    seed(distributed('independent', [5, 3]));
    expect(availability('finish', true)).toMatch(/5.*3|3.*5/i);
    expect(card('finish').textContent).toMatch(/unequal|actual|independent/i);
    expect(portions().balanced).toBe(false);
    expect(session().state.plated).toBe(false);
  });

  it('finishes unequal Independent plates once, preserves their inventory and focuses the visible review', () => {
    seed(distributed('independent', [5, 3]));
    const before = facts();
    button('finish').click(); ready(); $('avatarCommit').focus(); $('avatarCommit').click();
    expect(session().state.plated).toBe(true);
    expect(portions()).toMatchObject({plates: [5, 3], remaining: 0, balanced: false});
    expect(session().record.intents).toHaveLength(before.record.intents.length + 1);
    expect(document.activeElement).toBe($('avatarActivityEvidence'));
    expect($('avatarActivitySummary').textContent).toMatch(/unequal/i);
    for (const kind of ['serve', 'return', 'finish']) expect(availability(kind, false)).toMatch(/finish|recorded|fresh/i);
    const finished = facts(); choose('avatarPlate', 1);
    expect(status()).toMatch(/finish|recorded|fresh/i);
    expect(facts()).toEqual(finished);
  });

  it('retains the original plate during a prepared serving and keeps programmatic chooser changes quiet', () => {
    choose('avatarPlate', 1); button('serve').click();
    const before = facts(), priorStatus = status();
    choose('avatarPlate', 0);
    expect($('avatarPlate').value).toBe('1');
    expect(session().pending).toMatchObject({kind: 'serve', plate: 1});
    expect(card('serve').textContent).toMatch(/prepared.*plate 2|plate 2.*prepared/i);
    expect(card('serve').textContent).toMatch(/finish|cancel/i);
    expect(status()).toBe(priorStatus);
    expect(facts()).toEqual(before);
  });

  it('retains the original plate during a prepared return and cancellation preserves the inventory', () => {
    seed(distributed('independent', [1, 1]));
    choose('avatarPlate', 0); button('return').click();
    const before = facts(), priorStatus = status();
    choose('avatarPlate', 1);
    expect($('avatarPlate').value).toBe('0');
    expect(session().pending).toMatchObject({kind: 'return', plate: 0});
    expect(card('return').textContent).toMatch(/prepared.*plate 1|plate 1.*prepared/i);
    expect(status()).toBe(priorStatus);
    $('avatarCancel').click();
    expect(facts()).toEqual(before);
    expect(portions().plates).toEqual([1, 1]);
  });

  it('keeps movement scrubbing quiet and does not count a canceled spoonful', () => {
    button('serve').click();
    const before = facts(), priorStatus = status(), explanation = card('serve').textContent;
    $('avatarMovement').value = '70'; $('avatarMovement').dispatchEvent(new Event('input', {bubbles: true}));
    expect(status()).toBe(priorStatus);
    expect(card('serve').textContent).toBe(explanation);
    expect(facts()).toEqual(before);
    $('avatarCancel').click();
    expect(facts()).toEqual(before);
    expect(portions()).toMatchObject({plates: [0, 0], remaining: 8});
  });

  it('records exactly one retained spoonful only on Release and leaves kitchen time unchanged', () => {
    choose('avatarPlate', 1); button('serve').click();
    const before = facts();
    $('avatarPlayMovement').click();
    expect(session().pending.phase).toBe('ready');
    expect(facts()).toEqual(before);
    $('avatarCommit').click(); $('avatarCommit').click();
    expect(portions()).toMatchObject({plates: [0, 1], remaining: 7});
    expect(session().record.intents).toHaveLength(before.record.intents.length + 1);
    expect(session().record.intents.at(-1)).toMatchObject({kind: 'serve', plate: 1});
    expect(session().state.time).toBe(before.state.time);
  });

  it('keeps a Finish preview about both actual plates and cancels without finalizing either', () => {
    seed(distributed('independent', [5, 3]));
    button('finish').click();
    const before = facts(), priorStatus = status();
    choose('avatarPlate', 1);
    expect(session().pending.kind).toBe('finish');
    expect(card('finish').textContent).toMatch(/5.*3|3.*5/i);
    expect(card('finish').textContent).toMatch(/prepared|finish|cancel/i);
    expect(status()).toBe(priorStatus);
    ready(); $('avatarCancel').click();
    expect(facts()).toEqual(before);
    expect(session().state.plated).toBe(false);
  });

  it('uses demonstration guidance in Watch mode and keeps its hidden chooser changes quiet', () => {
    start('watch');
    expect($('avatarLearnerControls').hidden).toBe(true);
    for (const kind of ['serve', 'return', 'finish']) expect(availability(kind, false)).toMatch(/Watch.*demonstration/i);
    const before = facts(), priorStatus = status(); choose('avatarPlate', 1);
    expect(status()).toBe(priorStatus);
    expect(facts()).toEqual(before);
  });

  it('clears stale plating descriptions when switching to another activity', () => {
    choose('avatarActiveTool', 'return');
    expect(references('avatarActiveTool')).toContain('avatarReturnPlan');
    start('independent', 'avatar-sauce-rescue');
    expect($('avatarPlatePlan').hidden).toBe(true);
    expect(references('avatarActiveTool')).toContain('avatarInspectPlan');
    for (const kind of ['serve', 'return', 'finish']) expect(references('avatarActiveTool')).not.toContain(card(kind).id);
  });

  it('explains the action allowance instead of ordinary inventory constraints after the limit', () => {
    let s = M.create({activity, mode: 'independent'});
    for (let n = 0; n < M.limit; n++) s = act(s, n % 2 ? 'return' : 'serve', {plate: 0});
    seed(s);
    expect(session().limitReached).toBe(true);
    for (const kind of ['serve', 'return', 'finish']) expect(availability(kind, false)).toMatch(/action limit/i);
    choose('avatarPlate', 1);
    expect(status()).toMatch(/fresh/i);
  });
});
