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
const activity = 'soften-and-press-tomatoes';
const storageKey = 'alloflow-kitchen-avatar-v1';
let ui, cookedFixture;
const session = () => ui.getSession();
const facts = () => ({state: session().state, record: session().record, receipts: session().receipts});
const guidance = () => $('avatarPieceReceipt').textContent;
const status = () => $('avatarStatus').textContent;
const pieces = () => R.tomatoHandling(session().state).pieces;

function mount() {
  ui = window.KitchenAvatarUI.mount({container: $('tomatoPlanningHost'), model: M});
}
function choose(id, value) {
  $(id).value = String(value);
  $(id).dispatchEvent(new Event('change', {bubbles: true}));
}
function start(id = activity, mode = 'independent') {
  choose('avatarActivity', id);
  choose('avatarMode', mode);
  $('avatarStart').click();
}
function modelAction(s, kind, options = {}) {
  const before = s;
  s = M.begin(s, kind, options);
  expect(s, `${kind} should prepare`).not.toBe(before);
  while (s.pending.phase !== 'ready') s = M.advance(s, s.pending.token);
  const prepared = s;
  s = M.commit(s, s.pending.token);
  expect(s, `${kind} should commit`).not.toBe(prepared);
  return s;
}
function cooked() {
  if (!cookedFixture) {
    let s = M.create({activity, mode: 'independent'});
    s = modelAction(s, 'setPanHeat', {setting: 2});
    for (let n = 0; n < 5; n++) s = modelAction(s, 'waitPan', {seconds: 60});
    cookedFixture = modelAction(s, 'waitPan', {seconds: 30});
  }
  return cookedFixture;
}
function crushed() {
  return modelAction(modelAction(cooked(), 'press', {piece: 0}), 'press', {piece: 0});
}
function seed(s) {
  ui.dispose();
  const item = {id: 'tomato-planning-fixture', record: M.createRecord(s)};
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
function press() {
  expect($('avatarPress').disabled).toBe(false);
  $('avatarPress').click();
  ready();
  $('avatarCommit').click();
}
function descriptionIds(id) {
  const ids = ($(id).getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  for (const ref of ids) expect($(ref), `Description ${ref} must exist`).not.toBeNull();
  return ids;
}

beforeEach(() => {
  document.body.innerHTML = '<div id="tomatoPlanningHost"></div>';
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
  start();
});
afterEach(() => {
  ui?.dispose();
  vi.restoreAllMocks();
  localStorage.clear();
  document.body.replaceChildren();
});

describe('Tomato pressing explains the selected piece without changing the kitchen during planning', () => {
  it.each([activity, 'tomato-texture'])('associates the piece chooser and prepare button with current guidance in %s', id => {
    start(id);
    for (const control of ['avatarPiece', 'avatarPress']) expect(descriptionIds(control)).toContain('avatarPieceReceipt');
    expect($('avatarPieceReceipt').closest('[aria-live]')).toBeNull();
    expect($('avatarPieceReceipt').getAttribute('role')).not.toBe('status');
  });

  it('announces why a valid firm-piece selection cannot be pressed, without marking the field invalid', () => {
    const before = facts();
    choose('avatarPiece', 1);
    expect($('avatarPress').disabled).toBe(true);
    expect(guidance()).toMatch(/Piece 2/i);
    expect(guidance()).toMatch(/firm/i);
    expect(guidance()).toMatch(/heat.*wait/i);
    expect(status()).toBe(guidance());
    expect($('avatarPiece').getAttribute('aria-invalid')).not.toBe('true');
    expect(facts()).toEqual(before);
  });

  it('keeps scene keyboard focus on the selected tomato and announces its actual prerequisite', () => {
    const before = facts();
    $('avatarSelect-piece-0').dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true}));
    expect($('avatarPiece').value).toBe('1');
    expect(document.activeElement).toBe($('avatarSelect-piece-1'));
    expect(status()).toBe(guidance());
    expect(status()).toMatch(/firm.*heat.*wait/i);
    expect(status()).not.toContain('Prepare an action when you are ready');
    expect(facts()).toEqual(before);
  });

  it('gives the same firm-piece reason on the hand chooser and a failed semantic activation', () => {
    const before = facts();
    choose('avatarActiveTool', 'press');
    expect(descriptionIds('avatarActiveTool')).toContain('avatarPieceReceipt');
    expect(status()).toBe(guidance());
    $('avatarHandle').dispatchEvent(new MouseEvent('click', {detail: 0, bubbles: true}));
    expect(status()).toBe(guidance());
    expect(status()).toMatch(/heat.*wait/i);
    expect(session().pending).toBeNull();
    expect(facts()).toEqual(before);
  });

  it('describes a softened piece as usable only after recorded cooking has made it yield', () => {
    seed(cooked());
    const before = facts();
    choose('avatarPiece', 4);
    expect(pieces()[4]).toMatchObject({stage: 0, ready: true});
    expect($('avatarPress').disabled).toBe(false);
    expect(guidance()).toMatch(/Piece 5/i);
    expect(guidance()).toMatch(/softened/i);
    expect(status()).toBe(guidance());
    expect($('avatarPiece').getAttribute('aria-invalid')).not.toBe('true');
    expect(facts()).toEqual(before);
  });

  it('updates the selected piece to split after one release while keeping another press available', () => {
    seed(cooked());
    choose('avatarPiece', 2);
    const before = facts();
    press();
    expect(pieces()[2]).toMatchObject({stage: 1, ready: true, texture: 'split'});
    expect(guidance()).toMatch(/Piece 3.*split/i);
    expect($('avatarPress').disabled).toBe(false);
    expect(session().record.intents).toHaveLength(before.record.intents.length + 1);
    expect(session().record.intents.at(-1)).toMatchObject({kind: 'press', piece: 2});
    expect(session().state.time).toBe(before.state.time);
  });

  it('explains an already crushed piece and restores a useful plan when another piece is selected', () => {
    seed(crushed());
    choose('avatarPiece', 0);
    const before = facts();
    expect(pieces()[0]).toMatchObject({stage: 2, ready: false});
    expect($('avatarPress').disabled).toBe(true);
    expect(guidance()).toMatch(/crushed/i);
    expect(guidance()).toMatch(/another/i);
    expect(status()).toBe(guidance());
    expect($('avatarPiece').getAttribute('aria-invalid')).not.toBe('true');
    choose('avatarPiece', 1);
    expect($('avatarPress').disabled).toBe(false);
    expect(guidance()).toMatch(/Piece 2/i);
    expect(status()).toBe(guidance());
    expect(status()).not.toMatch(/already crushed|fully crushed/i);
    expect(facts()).toEqual(before);
  });

  it('does not replace a crushed-piece correction after scene activation with generic prepare advice', () => {
    seed(crushed());
    choose('avatarPiece', 1);
    const before = facts();
    $('avatarSelect-piece-0').dispatchEvent(new MouseEvent('click', {bubbles: true}));
    expect(document.activeElement).toBe($('avatarSelect-piece-0'));
    expect($('avatarPress').disabled).toBe(true);
    expect(status()).toBe(guidance());
    expect(status()).toMatch(/crushed/i);
    expect(status()).not.toContain('Prepare an action when you are ready');
    expect(facts()).toEqual(before);
  });

  it('keeps the prepared press tied to its original piece despite a programmatic chooser change', () => {
    seed(cooked());
    choose('avatarPiece', 3);
    $('avatarPress').click();
    const before = facts(), priorStatus = status();
    expect(session().pending).toMatchObject({kind: 'press', piece: 3});
    expect($('avatarPiece').disabled).toBe(true);
    choose('avatarPiece', 7);
    choose('avatarPanWait', 15); // Force an ordinary quantity rerender while the intent is retained.
    expect(session().pending.piece).toBe(3);
    expect(guidance()).toMatch(/prepared/i);
    expect(guidance()).toMatch(/piece 4/i);
    expect(guidance()).toMatch(/finish|cancel/i);
    expect(guidance()).not.toMatch(/piece 8/i);
    expect(status()).toBe(priorStatus);
    expect(facts()).toEqual(before);
  });

  it('keeps the retained-piece guidance and live status quiet during movement scrubbing', () => {
    seed(cooked());
    choose('avatarPiece', 5);
    $('avatarPress').click();
    const before = facts(), description = guidance();
    $('avatarStatus').textContent = 'Keep the movement status';
    for (const value of [25, 65, 100]) {
      $('avatarMovement').value = String(value);
      $('avatarMovement').dispatchEvent(new Event('input', {bubbles: true}));
    }
    expect(guidance()).toBe(description);
    expect(status()).toBe('Keep the movement status');
    expect(facts()).toEqual(before);
  });

  it('cancels a prepared press without crushing or releasing juice and restores selection controls', () => {
    seed(cooked());
    choose('avatarPiece', 4);
    const before = facts();
    $('avatarPress').click();
    $('avatarCancel').click();
    expect(session().pending).toBeNull();
    expect($('avatarPiece').disabled).toBe(false);
    expect($('avatarPress').disabled).toBe(false);
    expect(guidance()).not.toMatch(/prepared press/i);
    expect(facts()).toEqual(before);
  });

  it('records exactly the retained piece once at final release without advancing the kitchen clock', () => {
    seed(cooked());
    choose('avatarPiece', 3);
    const before = facts();
    $('avatarPress').click();
    choose('avatarPiece', 7);
    ready();
    expect(facts()).toEqual(before);
    $('avatarCommit').click();
    expect(session().record.intents).toHaveLength(before.record.intents.length + 1);
    expect(session().record.intents.at(-1)).toMatchObject({kind: 'press', piece: 3});
    expect(pieces()[3].stage).toBe(1);
    expect(pieces()[7].stage).toBe(0);
    expect(session().state.time).toBe(before.state.time);
    expect(session().pending).toBeNull();
  });

  it('provides the crushed-piece correction in the supplied softened-tomato activity too', () => {
    let s = M.create({activity: 'tomato-texture', mode: 'independent'});
    s = modelAction(modelAction(s, 'press', {piece: 0}), 'press', {piece: 0});
    seed(s);
    choose('avatarPiece', 0);
    expect($('avatarPress').disabled).toBe(true);
    expect(status()).toBe(guidance());
    expect(status()).toMatch(/crushed/i);
    expect(status()).toMatch(/another/i);
    expect($('avatarPiece').getAttribute('aria-invalid')).not.toBe('true');
  });

  it('describes Watch controls without advertising a learner press and resets to the fresh firm pieces', () => {
    seed(crushed());
    start(activity, 'watch');
    expect($('avatarLearnerControls').hidden).toBe(true);
    expect($('avatarPress').disabled).toBe(true);
    expect(guidance()).toMatch(/Watch|demonstrat/i);
    expect(session().record.intents).toHaveLength(0);
    start(activity, 'practice');
    choose('avatarPiece', 0);
    expect($('avatarLearnerControls').hidden).toBe(false);
    expect(guidance()).toMatch(/firm.*heat.*wait/i);
    expect(status()).toBe(guidance());
    expect($('avatarPiece').getAttribute('aria-invalid')).not.toBe('true');
    expect(session().record.intents).toHaveLength(0);
  });

  it('removes the tomato hand description when a different activity uses that chooser', () => {
    choose('avatarActiveTool', 'press');
    expect(descriptionIds('avatarActiveTool')).toContain('avatarPieceReceipt');
    start('avatar-sauce-rescue');
    expect($('avatarTomatoPlan').hidden).toBe(true);
    expect(descriptionIds('avatarActiveTool')).toContain('avatarInspectPlan');
    expect(descriptionIds('avatarActiveTool')).not.toContain('avatarPieceReceipt');
  });
});
