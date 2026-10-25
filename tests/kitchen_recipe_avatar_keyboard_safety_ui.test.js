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
let ui, frames, nextFrame, media, motionChange;

const session = () => ui.getSession();
const kitchen = () => ({state: session().state, record: session().record});
function choose(id, value) {
  $(id).value = value;
  $(id).dispatchEvent(new Event('change', {bubbles: true}));
}
function start(mode = 'independent') {
  choose('avatarMode', mode);
  $('avatarStart').click();
}
function setMotion(reduced) {
  media.matches = reduced;
  motionChange();
}
function keydown(id, key, extra = {}) {
  const event = new KeyboardEvent('keydown', {key, bubbles: true, cancelable: true, ...extra});
  $(id).dispatchEvent(event);
  return event;
}
function keyup(id, key) {
  $(id).dispatchEvent(new KeyboardEvent('keyup', {key, bubbles: true, cancelable: true}));
}
// JSDOM does not generate native button clicks from keyboard events. This
// models the default action only when it was allowed; real key-repeat behavior
// is additionally exercised in the browser audit.
function activateManual(key = 'Enter') {
  const event = keydown('avatarWatchManual', key);
  expect(event.defaultPrevented).toBe(false);
  if (key === ' ') keyup('avatarWatchManual', key);
  $('avatarWatchManual').click();
  if (key !== ' ') keyup('avatarWatchManual', key);
}
function movement(value) {
  $('avatarMovement').value = String(value);
  $('avatarMovement').dispatchEvent(new Event('input', {bubbles: true}));
}
function playInspection() {
  $('avatarInspect').click();
  movement(0);
  $('avatarPlayMovement').click();
  expect($('testHost').dataset.learnerPlaying).toBe('true');
}
function tick(time) {
  const frame = frames.entries().next().value;
  expect(frame, 'An animation frame must remain scheduled').toBeTruthy();
  frames.delete(frame[0]);
  frame[1](time);
}
function mount() {
  ui = window.KitchenAvatarUI.mount({container: $('testHost'), model: M});
}
function loadCompletedWatch() {
  let complete = M.create({mode: 'watch'});
  for (let n = 0; !complete.guide.complete && n < M.limit; n++) complete = M.demonstrateNext(complete);
  expect(complete.guide.complete).toBe(true);
  const saved = {id: 'completed-keyboard-review', record: M.createRecord(complete)};
  ui.dispose();
  localStorage.setItem(window.KitchenAvatarUI.storageKey, JSON.stringify({version: 1, current: saved, items: [saved]}));
  mount();
  expect(session().guide.complete).toBe(true);
}

beforeEach(() => {
  document.body.innerHTML = '<button id="outsideControl">Outside the chef station</button><div id="testHost"></div>';
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
  media = {matches: false, addEventListener: vi.fn((event, fn) => {motionChange = fn;}), removeEventListener: vi.fn()};
  Object.defineProperty(window, 'matchMedia', {configurable: true, value: () => media});
  Object.defineProperty(document, 'hidden', {configurable: true, value: false});
  window.eval(source);
  mount();
});
afterEach(() => {
  ui?.dispose();
  vi.restoreAllMocks();
  localStorage.clear();
  document.body.replaceChildren();
});

describe('Watch demonstration requires a distinct activation for each movement and record', () => {
  it.each(['Enter', ' '])('rejects held %j repeats while allowing separate presses and a deliberate record', key => {
    setMotion(true);
    start('watch');
    const before = kitchen();
    $('avatarWatchManual').focus();
    const first = keydown('avatarWatchManual', key);
    expect(first.defaultPrevented).toBe(false);
    // Enter activates on keydown; Space activates once on its eventual keyup.
    if (key === 'Enter') $('avatarWatchManual').click();
    const pendingBeforeRepeats = session().pending;
    for (let n = 0; n < 12; n++) {
      const repeat = keydown('avatarWatchManual', key, {repeat: true});
      expect(repeat.defaultPrevented).toBe(true);
      if (!repeat.defaultPrevented) $('avatarWatchManual').click();
    }
    expect(session().pending).toEqual(pendingBeforeRepeats);
    expect(kitchen()).toEqual(before);
    keyup('avatarWatchManual', key);
    if (key === ' ') $('avatarWatchManual').click();
    expect(session().pending.phase).toBe('pickup');
    for (let n = 0; session().pending.phase !== 'ready' && n < 12; n++) activateManual(key);
    expect(session().pending.phase).toBe('ready');
    expect($('avatarWatchManual').textContent).toBe('Record demonstrated action');
    expect(kitchen()).toEqual(before);
    const atReady = keydown('avatarWatchManual', key, {repeat: true});
    expect(atReady.defaultPrevented).toBe(true);
    expect(kitchen()).toEqual(before);
    keyup('avatarWatchManual', key);
    activateManual(key);
    expect(session().record.intents).toHaveLength(1);
    expect(session().record.intents[0]).toMatchObject({kind: 'inspect', actor: 'demonstrator'});
    expect(document.activeElement).toBe($('avatarWatchManual'));
  });

  it('leaves pointer and assistive-technology click activation available after a suppressed repeat', () => {
    setMotion(true);
    start('watch');
    keydown('avatarWatchManual', 'Enter', {repeat: true});
    keyup('avatarWatchManual', 'Enter');
    $('avatarWatchManual').dispatchEvent(new MouseEvent('click', {bubbles: true, detail: 1}));
    expect(session().pending.phase).toBe('pickup');
    $('avatarWatchManual').dispatchEvent(new MouseEvent('click', {bubbles: true, detail: 0}));
    expect(session().pending.phase).toBe('dip');
    expect(session().record.intents).toHaveLength(0);
  });
});

describe('Navigating past the chef hand does not take over its movement', () => {
  const navigation = [{key: 'Tab'}, {key: 'Tab', shiftKey: true}, {key: 'Shift'}, {key: 'Control'}, {key: 'a'}, {key: 'F1'}];

  it('preserves active playback, its scheduled frame and progress for unrelated keys', () => {
    start();
    playInspection();
    tick(0);
    tick(120);
    $('avatarHandle').focus();
    const before = kitchen(), pending = session().pending, progress = $('avatarMovement').value;
    const scheduled = [...frames.entries()];
    for (const {key, ...options} of navigation) {
      expect(keydown('avatarHandle', key, options).defaultPrevented).toBe(false);
      expect($('testHost').dataset.learnerPlaying).toBe('true');
      expect([...frames.entries()]).toEqual(scheduled);
      expect(session().pending).toEqual(pending);
      expect($('avatarMovement').value).toBe(progress);
    }
    tick(240);
    expect(Number($('avatarMovement').value)).toBeGreaterThan(Number(progress));
    expect(kitchen()).toEqual(before);
  });

  it('preserves the optional pickup reach for Tab, modifiers and unrelated shortcuts', () => {
    start();
    $('avatarInspect').click();
    expect($('testHost').dataset.reaching).toBe('true');
    $('avatarHandle').focus();
    const pending = session().pending, scheduled = [...frames.entries()], before = kitchen();
    for (const {key, ...options} of navigation) {
      expect(keydown('avatarHandle', key, options).defaultPrevented).toBe(false);
      expect($('testHost').dataset.reaching).toBe('true');
      expect([...frames.entries()]).toEqual(scheduled);
      expect(session().pending).toEqual(pending);
    }
    expect(kitchen()).toEqual(before);
  });

  it('lets movement keys take over playback, adjust checkpoints, and retain explicit release', () => {
    start();
    playInspection();
    $('avatarHandle').focus();
    const before = kitchen();
    expect(keydown('avatarHandle', 'ArrowRight').defaultPrevented).toBe(true);
    expect($('testHost').dataset.learnerPlaying).toBe('false');
    expect(frames.size).toBe(0);
    expect($('avatarMovement').value).toBe('10');
    for (const [key, value] of [['ArrowUp', '20'], ['ArrowLeft', '10'], ['ArrowDown', '0'], ['End', '100'], ['Home', '0']]) {
      expect(keydown('avatarHandle', key).defaultPrevented).toBe(true);
      expect($('avatarMovement').value).toBe(value);
    }
    keydown('avatarHandle', 'End');
    keydown('avatarHandle', 'Enter');
    expect(session().pending.phase).toBe('dip');
    expect(keydown('avatarHandle', 'Enter', {repeat: true}).defaultPrevented).toBe(true);
    expect(session().pending.phase).toBe('dip');
    expect(kitchen()).toEqual(before);
    expect(keydown('avatarHandle', 'Escape').defaultPrevented).toBe(true);
    expect(session().pending).toBeNull();
    expect(kitchen()).toEqual(before);
  });
});

describe('Motion preference changes keep focus on an available control', () => {
  it('moves idle Watch Play focus to manual movement when reduced motion hides Play, then retains it on return', () => {
    start('watch');
    const before = kitchen();
    $('avatarWatchNext').focus();
    setMotion(true);
    expect($('avatarWatchNext').hidden).toBe(true);
    expect(document.activeElement).toBe($('avatarWatchManual'));
    expect(document.activeElement.closest('[hidden]')).toBeNull();
    expect(document.activeElement.disabled).toBe(false);
    setMotion(false);
    expect($('avatarWatchNext').hidden).toBe(false);
    expect(document.activeElement).toBe($('avatarWatchManual'));
    expect(kitchen()).toEqual(before);
    expect(session().pending).toBeNull();
  });

  it.each([false, true])('cancels a pending Watch preview and repairs Stop focus when changing reduced motion from %s', reduced => {
    setMotion(reduced);
    start('watch');
    const before = kitchen();
    if (reduced) $('avatarWatchManual').click();
    else $('avatarWatchNext').click();
    expect(session().pending).not.toBeNull();
    $('avatarWatchStop').focus();
    const staleFrames = [...frames.values()];
    setMotion(!reduced);
    expect(session().pending).toBeNull();
    expect(document.activeElement).toBe($('avatarWatchManual'));
    expect(document.activeElement.closest('[hidden]')).toBeNull();
    expect(frames.size).toBe(0);
    for (const stale of staleFrames) stale(60000);
    expect(session().pending).toBeNull();
    expect(kitchen()).toEqual(before);
  });

  it('retains completed-attempt review focus through both preference transitions', () => {
    loadCompletedWatch();
    const before = kitchen();
    $('avatarEvidenceTitle').focus();
    for (const reduced of [true, false]) {
      setMotion(reduced);
      expect(document.activeElement).toBe($('avatarEvidenceTitle'));
      expect(document.activeElement.closest('[hidden]')).toBeNull();
      expect($('avatarWatchManual').disabled).toBe(true);
      expect(kitchen()).toEqual(before);
      expect(session().pending).toBeNull();
    }
  });

  it('never takes outside focus during idle or pending Watch preference transitions', () => {
    start('watch');
    const before = kitchen();
    for (const reduced of [true, false]) {
      $('outsideControl').focus();
      setMotion(reduced);
      expect(document.activeElement).toBe($('outsideControl'));
      $('avatarWatchManual').click();
      expect(session().pending).not.toBeNull();
      setMotion(!reduced);
      expect(document.activeElement).toBe($('outsideControl'));
      expect(session().pending).toBeNull();
      expect(kitchen()).toEqual(before);
    }
  });
});
