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
const committed = () => ({state: session().state, record: session().record, receipts: session().receipts});
const spacing = () => M.spacing(M.restoreRecord(session().record));
const choice = () => $('avatarSpacingChoice');
const status = () => $('avatarStatus').textContent;

function change(id, value) {
  $(id).value = String(value);
  $(id).dispatchEvent(new Event('change', {bubbles: true}));
}
function input(id, value) {
  $(id).value = String(value);
  $(id).dispatchEvent(new Event('input', {bubbles: true}));
}
function finishRange(id) {
  $(id).dispatchEvent(new Event('change', {bubbles: true}));
}
function start(mode = 'independent') {
  change('avatarActivity', 'space-mushrooms');
  change('avatarMode', mode);
  $('avatarStart').click();
}
function position(x, z) {
  input('avatarSpacingX', x);
  input('avatarSpacingZ', z);
}
function outside() {
  position(60, 60);
  expect(choice().dataset.planState).toBe('outside');
}
function prepared() {
  position(-50, 0);
  expect($('avatarMoveMushroom').disabled).toBe(false);
  $('avatarMoveMushroom').click();
  expect(session().pending?.kind).toBe('moveMushroom');
}
function ready() {
  for (let n = 0; session().pending?.phase !== 'ready' && n < 20; n++) {
    $('avatarPlace').click();
    $('avatarAdvance').click();
  }
  expect(session().pending?.phase).toBe('ready');
}
function descriptionIds(id) {
  const ids = ($(id).getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  for (const ref of ids) expect($(ref), `Description ${ref} must exist`).not.toBeNull();
  return ids;
}
function invalidPair(expected) {
  for (const id of ['avatarSpacingX', 'avatarSpacingZ']) {
    expect($(id).getAttribute('aria-invalid')).toBe(String(expected));
  }
}

beforeEach(() => {
  document.body.innerHTML = '<div id="spacingTestHost"></div>';
  localStorage.clear();
  window.KitchenRecipes = R;
  window.KitchenSauceCheck = S;
  window.KitchenAvatarStation = M;
  window.KitchenAvatarMotion = V;
  Object.defineProperty(window, 'matchMedia', {configurable: true, value: () => ({matches: true, addEventListener() {}, removeEventListener() {}})});
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  window.eval(source);
  ui = window.KitchenAvatarUI.mount({container: $('spacingTestHost'), model: M});
  start();
});
afterEach(() => {
  ui?.dispose();
  vi.restoreAllMocks();
  localStorage.clear();
  document.body.replaceChildren();
});

describe('Mushroom placement guidance stays associated, actionable and quiet during rehearsal', () => {
  it('associates the piece, destination, both axes and prepare action with the current constraint', () => {
    for (const id of ['avatarSpacingPiece', 'avatarSpacingTarget', 'avatarSpacingX', 'avatarSpacingZ', 'avatarMoveMushroom']) {
      expect(descriptionIds(id)).toContain('avatarSpacingChoice');
    }
    for (const id of ['avatarSpacingX', 'avatarSpacingZ']) {
      expect(descriptionIds(id)).toContain('avatarSpacingPositionHelp');
      expect(descriptionIds(id)).toContain(id+'Value');
    }
    for (const id of ['avatarSpacingXValue', 'avatarSpacingZValue']) expect($(id).getAttribute('aria-hidden')).toBe('true');
    expect($('avatarSpacingX').getAttribute('aria-valuetext')).toContain('pan-position marks');
    expect($('avatarSpacingZ').getAttribute('aria-valuetext')).toContain('pan-position marks');
    expect(choice().closest('[aria-live]')).toBeNull();
    expect(choice().getAttribute('role')).not.toBe('status');
  });

  it('identifies an outside-pan coordinate pair without inventing an error in the mushroom or preset chooser', () => {
    const before = committed();
    outside();
    invalidPair(true);
    expect($('avatarMoveMushroom').disabled).toBe(true);
    expect(choice().textContent).toMatch(/beyond|outside/i);
    expect(choice().textContent).toMatch(/center|centre|suggested/i);
    expect($('avatarSpacingTarget').value).toBe('custom');
    expect($('avatarSpacingPiece').getAttribute('aria-invalid')).not.toBe('true');
    expect($('avatarSpacingTarget').getAttribute('aria-invalid')).not.toBe('true');
    expect(committed()).toEqual(before);
  });

  it('updates continuous range input quietly before announcing the newly blocked plan on change', () => {
    $('avatarStatus').textContent = 'Earlier observation';
    outside();
    expect(status()).toBe('Earlier observation');
    finishRange('avatarSpacingZ');
    expect(status()).toBe(choice().textContent);
    expect(status()).toMatch(/beyond|outside/i);
  });

  it('does not repeat the same blocked-state announcement for every subsequent range change', () => {
    outside();
    finishRange('avatarSpacingZ');
    $('avatarStatus').textContent = 'Keep this status while the same constraint applies';
    input('avatarSpacingX', 59);
    finishRange('avatarSpacingX');
    expect(choice().dataset.planState).toBe('outside');
    expect(status()).toBe('Keep this status while the same constraint applies');
  });

  it('announces recovery when the chosen pair becomes valid and clears both field errors', () => {
    outside();
    finishRange('avatarSpacingZ');
    const before = committed();
    input('avatarSpacingZ', 0);
    finishRange('avatarSpacingZ');
    invalidPair(false);
    expect(choice().dataset.planState).toBe('ready');
    expect($('avatarMoveMushroom').disabled).toBe(false);
    expect(status()).toBe(choice().textContent);
    expect(status()).not.toMatch(/beyond|outside/i);
    expect(committed()).toEqual(before);
  });

  it('treats the selected current location as unavailable without marking valid coordinates invalid', () => {
    const here = spacing().pieces[0];
    position(here.xUnits, here.zUnits);
    finishRange('avatarSpacingZ');
    invalidPair(false);
    expect(choice().dataset.planState).toBe('unchanged');
    expect($('avatarMoveMushroom').disabled).toBe(true);
    expect(choice().textContent).toContain('current place');
    expect(status()).toBe(choice().textContent);
    expect(session().record.intents).toHaveLength(0);
  });

  it('announces a selected preset with its real directional marks and preserves the kitchen', () => {
    outside();
    finishRange('avatarSpacingZ');
    const before = committed(), at = spacing().destinations[3];
    change('avatarSpacingTarget', 3);
    invalidPair(false);
    expect(Number($('avatarSpacingX').value)).toBe(at.x);
    expect(Number($('avatarSpacingZ').value)).toBe(at.z);
    expect($('avatarSpacingX').getAttribute('aria-valuetext')).toContain('left');
    expect($('avatarSpacingZ').getAttribute('aria-valuetext')).toContain('front');
    expect(status()).toBe(choice().textContent);
    expect(committed()).toEqual(before);
  });

  it('keeps a preset alias synchronized when a custom position exactly matches a suggested spot', () => {
    const at = spacing().destinations[6];
    position(at.x, at.z);
    expect($('avatarSpacingTarget').value).toBe('6');
    input('avatarSpacingX', at.x + 1);
    expect($('avatarSpacingTarget').value).toBe('custom');
    expect(session().pending).toBeNull();
    expect(session().record.intents).toHaveLength(0);
  });

  it('announces an intentional mushroom selection with its applicable correction', () => {
    outside();
    const before = committed();
    change('avatarSpacingPiece', 1);
    expect(status()).toBe(choice().textContent);
    expect(status()).toContain('Mushroom 2');
    expect(status()).toMatch(/beyond|outside/i);
    expect(committed()).toEqual(before);
  });

  it('keeps scene keyboard selection focused and does not replace a constraint with generic prepare advice', () => {
    outside();
    const before = committed();
    $('avatarSelect-spacing-0').dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowRight', bubbles: true}));
    expect($('avatarSpacingPiece').value).toBe('1');
    expect(document.activeElement).toBe($('avatarSelect-spacing-1'));
    expect(status()).toBe(choice().textContent);
    expect(status()).toMatch(/beyond|outside/i);
    expect(status()).not.toContain('Prepare an action when you are ready');
    expect(committed()).toEqual(before);
  });

  it('provides the same constraint on the hand-action chooser and a failed semantic activation', () => {
    outside();
    const before = committed();
    change('avatarActiveTool', 'moveMushroom');
    expect(descriptionIds('avatarActiveTool')).toContain('avatarSpacingChoice');
    expect(status()).toBe(choice().textContent);
    $('avatarHandle').dispatchEvent(new MouseEvent('click', {detail: 0, bubbles: true}));
    expect(status()).toBe(choice().textContent);
    expect(session().pending).toBeNull();
    expect(committed()).toEqual(before);
  });

  it('keeps the prepared destination and validity tied to the retained intent despite programmatic chooser changes', () => {
    prepared();
    const before = committed(), pending = session().pending, priorStatus = status();
    expect(choice().dataset.planState).toBe('prepared');
    for (const id of ['avatarSpacingPiece', 'avatarSpacingTarget', 'avatarSpacingX', 'avatarSpacingZ']) expect($(id).disabled).toBe(true);
    input('avatarSpacingX', 60);
    input('avatarSpacingZ', 60);
    change('avatarSpacingPiece', 5);
    change('avatarGrams', 10); // A normal quantity rerender must still describe the retained spacing intent.
    expect(session().pending.piece).toBe(pending.piece);
    expect(session().pending.targetX).toBe(-50);
    expect(session().pending.targetZ).toBe(0);
    expect(choice().dataset.planState).toBe('prepared');
    invalidPair(false);
    expect(choice().textContent).toMatch(/50 left/);
    expect(choice().textContent).not.toMatch(/beyond|outside/i);
    expect(status()).toBe(priorStatus);
    expect(committed()).toEqual(before);
  });

  it('does not publish planning announcements when movement progress is scrubbed', () => {
    prepared();
    const before = committed(), guidance = choice().textContent;
    $('avatarStatus').textContent = 'Movement status stays in place';
    for (const value of [20, 60, 100]) input('avatarMovement', value);
    expect(status()).toBe('Movement status stays in place');
    expect(choice().textContent).toBe(guidance);
    expect(committed()).toEqual(before);
  });

  it('cancels the prepared plan without recording a placement and returns usable controls', () => {
    prepared();
    const before = committed();
    $('avatarCancel').click();
    expect(session().pending).toBeNull();
    expect(committed()).toEqual(before);
    expect(choice().dataset.planState).toBe('ready');
    for (const id of ['avatarSpacingPiece', 'avatarSpacingTarget', 'avatarSpacingX', 'avatarSpacingZ']) expect($(id).disabled).toBe(false);
    invalidPair(false);
  });

  it('records exactly the prepared place on release and describes its now-unchanged destination', () => {
    prepared();
    const time = session().state.time;
    ready();
    expect(session().record.intents).toHaveLength(0);
    $('avatarCommit').click();
    expect(session().record.intents).toHaveLength(1);
    expect(session().record.intents[0]).toMatchObject({kind: 'moveMushroom', piece: 0, x: -50, z: 0});
    expect(spacing().pieces[0]).toMatchObject({xUnits: -50, zUnits: 0});
    expect(session().state.time).toBe(time);
    expect(choice().dataset.planState).toBe('unchanged');
    invalidPair(false);
    expect($('avatarMoveMushroom').disabled).toBe(true);
    expect(document.activeElement).toBe($('avatarActiveTool'));
  });

  it('resets stale outside-plan errors to the guided Watch destination without advertising learner availability', () => {
    outside();
    start('watch');
    expect($('avatarLearnerControls').hidden).toBe(true);
    expect(choice().dataset.planState).toBe('watch');
    invalidPair(false);
    expect(choice().textContent).toMatch(/Watch|demonstrat/i);
    expect($('avatarMoveMushroom').disabled).toBe(true);
    expect(session().record.intents).toHaveLength(0);
  });
});
