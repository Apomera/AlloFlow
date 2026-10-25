// @vitest-environment jsdom
import {beforeEach, afterEach, describe, it, expect, vi} from 'vitest';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';

const require = createRequire(import.meta.url);
const M = require('../stem_lab/kitchen_studio/recipe_lab_avatar_model.js');
const R = require('../stem_lab/kitchen_studio/recipe_lab_engine.js');
const S = require('../stem_lab/kitchen_studio/recipe_lab_sauce_check.js');
const V = require('../stem_lab/kitchen_studio/recipe_lab_avatar_motion.js');
const source = readFileSync('stem_lab/kitchen_studio/recipe_lab_avatar.js', 'utf8');
const $ = id => document.getElementById(id);
let ui, frames, nextFrame, captured;

const session = () => ui.getSession();
const kitchen = () => ({state: session().state, record: session().record});
const position = () => ({pending: session().pending, progress: $('avatarMovement').value});
function choose(id, value) {
  $(id).value = value;
  $(id).dispatchEvent(new Event('change', {bubbles: true}));
}
function start(activity = 'avatar-sauce-rescue', mode = 'independent') {
  choose('avatarActivity', activity);
  choose('avatarMode', mode);
  $('avatarStart').click();
}
function movement(value) {
  $('avatarMovement').value = String(value);
  $('avatarMovement').dispatchEvent(new Event('input', {bubbles: true}));
}
function keydown(node, key, extra = {}) {
  const event = new KeyboardEvent('keydown', {key, bubbles: true, cancelable: true, ...extra});
  node.dispatchEvent(event);
  return event;
}
function semanticClick(extra = {}) {
  $('avatarHandle').dispatchEvent(new MouseEvent('click', {bubbles: true, cancelable: true, detail: 0, ...extra}));
}
function point(id) {
  return {x: Number($(id).getAttribute('cx')), y: Number($(id).getAttribute('cy'))};
}
function pointer(type, node, xy, id = 7) {
  const event = new MouseEvent(type, {button: 0, buttons: type === 'pointerup' ? 0 : 1, bubbles: true, cancelable: true, clientX: xy.x, clientY: xy.y});
  Object.defineProperties(event, {pointerId: {value: id}, isPrimary: {value: true}});
  node.dispatchEvent(event);
  return event;
}
function beginDrag() {
  $('avatarInspect').click();
  movement(0);
  pointer('pointerdown', $('avatarHandle'), point('avatarHandle'));
  expect(captured.has(7)).toBe(true);
  return {origin: point('avatarHandle'), target: point('avatarTarget')};
}
function latePointerEvents(origin, target) {
  pointer('pointermove', $('avatarScene'), origin);
  pointer('pointerup', $('avatarScene'), target);
  pointer('pointercancel', $('avatarHandle'), target);
  pointer('lostpointercapture', $('avatarHandle'), target);
}
function readyInspection() {
  $('avatarInspect').click();
  for (let n = 0; session().pending.phase !== 'ready' && n < 12; n++) {
    $('avatarPlace').click();
    $('avatarAdvance').click();
  }
  expect(session().pending.phase).toBe('ready');
}

beforeEach(() => {
  document.body.innerHTML = '<div id="testHost"></div>';
  localStorage.clear();
  window.KitchenRecipes = R;
  window.KitchenSauceCheck = S;
  window.KitchenAvatarStation = M;
  window.KitchenAvatarMotion = V;
  frames = new Map();
  nextFrame = 0;
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(fn => {
    frames.set(++nextFrame, fn);
    return nextFrame;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => frames.delete(id));
  Object.defineProperty(window, 'matchMedia', {configurable: true, value: () => ({matches: false, addEventListener() {}, removeEventListener() {}})});
  Object.defineProperty(document, 'hidden', {configurable: true, value: false});
  window.eval(source);
  ui = window.KitchenAvatarUI.mount({container: $('testHost'), model: M});
  $('avatarScene').getBoundingClientRect = () => ({left: 0, top: 0, width: 900, height: 490});
  captured = new Set();
  $('avatarHandle').setPointerCapture = vi.fn(id => captured.add(id));
  $('avatarHandle').hasPointerCapture = id => captured.has(id);
  $('avatarHandle').releasePointerCapture = vi.fn(id => {
    captured.delete(id);
    // Capture loss may arrive while control is being handed over. It must not
    // cancel the pending cooking action after clearDrag has relinquished it.
    pointer('lostpointercapture', $('avatarHandle'), point('avatarHandle'), id);
  });
});
afterEach(() => {
  ui?.dispose();
  vi.restoreAllMocks();
  localStorage.clear();
  document.body.replaceChildren();
});

describe('Chef SVG controls leave modified navigation to the browser and assistive technology', () => {
  const modifiers = ['altKey', 'ctrlKey', 'metaKey'];
  const controls = ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Enter', ' '];

  it('preserves active hand playback and default behavior for modified control keys', () => {
    start();
    $('avatarInspect').click();
    movement(0);
    $('avatarPlayMovement').click();
    $('avatarHandle').focus();
    const before = kitchen(), pending = position(), scheduled = [...frames.entries()];
    for (const modifier of modifiers) for (const key of controls) {
      expect(keydown($('avatarHandle'), key, {[modifier]: true}).defaultPrevented).toBe(false);
      expect(position()).toEqual(pending);
      expect([...frames.entries()]).toEqual(scheduled);
      expect($('testHost').dataset.learnerPlaying).toBe('true');
      expect(document.activeElement).toBe($('avatarHandle'));
    }
    expect(kitchen()).toEqual(before);
  });

  it('does not record a ready action with modified Enter or Space', () => {
    start();
    readyInspection();
    $('avatarHandle').focus();
    const before = kitchen(), pending = position();
    for (const modifier of modifiers) for (const key of ['Enter', ' ']) {
      expect(keydown($('avatarHandle'), key, {[modifier]: true}).defaultPrevented).toBe(false);
      expect(position()).toEqual(pending);
      expect(kitchen()).toEqual(before);
    }
    expect(keydown($('avatarHandle'), 'Enter').defaultPrevented).toBe(true);
    expect(session().record.intents).toHaveLength(1);
  });

  it('does not change the selected food or roving focus with modified scene keys', () => {
    start('tomato-texture');
    const selected = $('avatarSelect-piece-0');
    selected.focus();
    const before = kitchen(), status = $('avatarStatus').textContent;
    for (const modifier of modifiers) for (const key of controls) {
      expect(keydown(selected, key, {[modifier]: true}).defaultPrevented).toBe(false);
      expect($('avatarPiece').value).toBe('0');
      expect(selected.getAttribute('aria-pressed')).toBe('true');
      expect(document.activeElement).toBe(selected);
      expect($('avatarStatus').textContent).toBe(status);
    }
    expect(keydown(selected, 'ArrowRight').defaultPrevented).toBe(true);
    expect($('avatarPiece').value).toBe('1');
    expect(document.activeElement).toBe($('avatarSelect-piece-1'));
    expect(kitchen()).toEqual(before);
  });
});

describe('Manual movement controls relinquish a previous pointer drag', () => {
  it.each(['slider', 'place', 'hand-arrow', 'semantic-click'])('%s takeover releases capture without canceling the action or accepting late pointer events', control => {
    start();
    const {origin, target} = beginDrag(), before = kitchen(), token = session().pending.token;
    if (control === 'slider') movement(65);
    else if (control === 'place') $('avatarPlace').click();
    else if (control === 'hand-arrow') keydown($('avatarHandle'), 'ArrowRight');
    else semanticClick(); // Below the checkpoint, activation takes over but cannot advance.
    expect($('avatarHandle').releasePointerCapture).toHaveBeenCalledWith(7);
    expect(captured.size).toBe(0);
    expect(session().pending.token).toBe(token);
    expect(session().pending.phase).toBe('pickup');
    const handedOver = position();
    expect(handedOver.progress).toBe({slider: '65', place: '100', 'hand-arrow': '10', 'semantic-click': '0'}[control]);
    latePointerEvents(origin, target);
    expect(position()).toEqual(handedOver);
    expect(kitchen()).toEqual(before);
  });

  it('completes a captured checkpoint once and ignores its later pointerup and compatibility click', () => {
    start();
    const {origin, target} = beginDrag(), before = kitchen();
    pointer('pointermove', $('avatarScene'), target);
    // SVG target coordinates are rounded; the movement contract accepts the
    // target checkpoint within its existing 95% reach threshold.
    expect(Number($('avatarMovement').value)).toBeGreaterThanOrEqual(95);
    expect($('avatarAdvance').disabled).toBe(false);
    $('avatarAdvance').click();
    expect(captured.size).toBe(0);
    expect(session().pending.phase).toBe('dip');
    const advanced = position();
    latePointerEvents(origin, target);
    $('avatarHandle').dispatchEvent(new MouseEvent('click', {bubbles: true, detail: 1}));
    expect(position()).toEqual(advanced);
    expect(kitchen()).toEqual(before);
  });

  it('keeps an existing drag intact when a modified key is reserved for another command', () => {
    start();
    const {target} = beginDrag(), before = kitchen(), pending = position();
    expect(keydown($('avatarHandle'), 'ArrowRight', {altKey: true}).defaultPrevented).toBe(false);
    expect(captured.has(7)).toBe(true);
    expect($('avatarHandle').releasePointerCapture).not.toHaveBeenCalled();
    expect(position()).toEqual(pending);
    pointer('pointerup', $('avatarScene'), target);
    expect(captured.size).toBe(0);
    expect(session().pending.phase).toBe('dip');
    expect(kitchen()).toEqual(before);
  });
});

describe('The chef hand supports semantic button activation without duplicating pointer gestures', () => {
  it('starts, respects checkpoint readiness, advances and records exactly like deliberate Enter', () => {
    start();
    const before = kitchen();
    semanticClick();
    expect(session().pending.phase).toBe('pickup');
    const pending = session().pending;
    semanticClick();
    expect(session().pending).toEqual(pending);
    movement(50);
    semanticClick();
    expect(session().pending).toEqual(pending);
    for (let n = 0; session().pending.phase !== 'ready' && n < 12; n++) {
      movement(100);
      semanticClick();
    }
    expect(session().pending.phase).toBe('ready');
    expect(kitchen()).toEqual(before);
    // Mouse/touch compatibility clicks must never release a prepared action.
    $('avatarHandle').dispatchEvent(new MouseEvent('click', {bubbles: true, detail: 1}));
    expect(kitchen()).toEqual(before);
    expect(session().pending.phase).toBe('ready');
    semanticClick();
    expect(session().pending).toBeNull();
    expect(session().record.intents).toHaveLength(1);
    expect(session().record.intents[0]).toMatchObject({kind: 'inspect', actor: 'learner'});
  });

  it('allows a pointer gesture to advance only one checkpoint despite its following click', () => {
    start();
    const before = kitchen();
    pointer('pointerdown', $('avatarHandle'), point('avatarHandle'));
    expect(session().pending.phase).toBe('pickup');
    pointer('pointerup', $('avatarScene'), point('avatarTarget'));
    expect(session().pending.phase).toBe('dip');
    const afterPointer = position();
    $('avatarHandle').dispatchEvent(new MouseEvent('click', {bubbles: true, detail: 1}));
    expect(position()).toEqual(afterPointer);
    expect(kitchen()).toEqual(before);
  });

  it('keeps the disabled Watch hand observational for semantic and pointer clicks', () => {
    start('avatar-sauce-rescue', 'watch');
    const before = kitchen();
    expect($('avatarHandle').getAttribute('aria-disabled')).toBe('true');
    semanticClick();
    $('avatarHandle').dispatchEvent(new MouseEvent('click', {bubbles: true, detail: 1}));
    expect(session().pending).toBeNull();
    expect(kitchen()).toEqual(before);
  });
});
