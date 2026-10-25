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
let ui;
const session = () => ui.getSession();
const kitchen = () => ({state: session().state, record: session().record});

function start(mode = 'practice') {
  $('avatarMode').value = mode;
  $('avatarMode').dispatchEvent(new Event('change', {bubbles: true}));
  $('avatarStart').click();
  $('avatarInspect').click();
}
function keydown(key, repeat = false) {
  const target = document.activeElement;
  const event = new KeyboardEvent('keydown', {key, repeat, bubbles: true, cancelable: true});
  target.dispatchEvent(event);
  // JSDOM has no native keyboard click default. Model it only if allowed;
  // the browser audit exercises the actual repeated Enter behavior.
  if (key === 'Enter' && !event.defaultPrevented) target.click();
  return event;
}
function keyup(key) {
  document.activeElement.dispatchEvent(new KeyboardEvent('keyup', {key, bubbles: true}));
}
function lastCheckpoint() {
  for (let n = 0; session().pending.stepIndex < session().pending.steps.length - 2 && n < 20; n++) {
    $('avatarPlace').click();
    $('avatarAdvance').click();
  }
  expect(session().pending.stepIndex).toBe(session().pending.steps.length - 2);
  $('avatarPlace').click();
  $('avatarAdvance').focus();
}
function ready() {
  $('avatarPlayMovement').click();
  expect(session().pending.phase).toBe('ready');
  $('avatarCommit').focus();
}

beforeEach(() => {
  document.body.innerHTML = '<div id="testHost"></div>';
  localStorage.clear();
  window.KitchenRecipes = R;
  window.KitchenSauceCheck = S;
  window.KitchenAvatarStation = M;
  window.KitchenAvatarMotion = V;
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  Object.defineProperty(window, 'matchMedia', {configurable: true, value: () => ({matches: true, addEventListener() {}, removeEventListener() {}})});
  Object.defineProperty(document, 'hidden', {configurable: true, value: false});
  window.eval(source);
  ui = window.KitchenAvatarUI.mount({container: $('testHost'), model: M});
});
afterEach(() => {
  ui?.dispose();
  vi.restoreAllMocks();
  localStorage.clear();
  document.body.replaceChildren();
});

describe('Manual movement completion requires a separate release activation', () => {
  it.each(['practice', 'independent'])('blocks held Enter crossing from Complete to Release in %s mode', mode => {
    start(mode);
    lastCheckpoint();
    const before = kitchen();
    expect(keydown('Enter').defaultPrevented).toBe(false);
    expect(document.activeElement).toBe($('avatarCommit'));
    expect(session().pending.phase).toBe('ready');
    for (let n = 0; n < 12; n++) expect(keydown('Enter', true).defaultPrevented).toBe(true);
    expect(kitchen()).toEqual(before);
    expect(document.activeElement).toBe($('avatarCommit'));
    keyup('Enter');
    expect(keydown('Enter').defaultPrevented).toBe(false);
    keyup('Enter');
    expect(session().pending).toBeNull();
    expect(session().record.intents).toHaveLength(1);
    expect(session().record.intents[0].kind).toBe('inspect');
    expect(session().state.time).toBe(before.state.time);
    expect(document.activeElement.closest('[hidden]')).toBeNull();
  });

  it.each(['Enter', ' '])('rejects repeated %j at a movement checkpoint without advancing it', key => {
    start();
    $('avatarPlace').click();
    $('avatarAdvance').focus();
    const before = session();
    expect(keydown(key, true).defaultPrevented).toBe(true);
    expect(session()).toEqual(before);
    expect(document.activeElement).toBe($('avatarAdvance'));
  });

  it.each(['Enter', ' '])('rejects repeated %j on a prepared release without changing the kitchen', key => {
    start();
    ready();
    const before = session();
    for (let n = 0; n < 8; n++) expect(keydown(key, true).defaultPrevented).toBe(true);
    expect(session()).toEqual(before);
    expect(document.activeElement).toBe($('avatarCommit'));
  });

  it('allows a fresh Space activation to release after the held key has ended', () => {
    start();
    ready();
    expect(keydown(' ', true).defaultPrevented).toBe(true);
    keyup(' ');
    expect(keydown(' ').defaultPrevented).toBe(false);
    expect(session().record.intents).toHaveLength(0);
    const release = document.activeElement;
    keyup(' ');
    release.click(); // Native Space activates the button once on keyup.
    expect(session().record.intents).toHaveLength(1);
    expect(session().pending).toBeNull();
  });

  it.each([1, 0])('preserves click activation with detail %i after a suppressed repeat', detail => {
    start();
    ready();
    expect(keydown('Enter', true).defaultPrevented).toBe(true);
    keyup('Enter');
    $('avatarCommit').dispatchEvent(new MouseEvent('click', {bubbles: true, detail}));
    expect(session().record.intents).toHaveLength(1);
    expect(session().record.intents[0].kind).toBe('inspect');
    expect(session().pending).toBeNull();
  });

  it('leaves repeated navigation keys available while Release has focus', () => {
    start();
    ready();
    const before = session();
    for (const key of ['Tab', 'ArrowRight', 'Shift']) expect(keydown(key, true).defaultPrevented).toBe(false);
    expect(session()).toEqual(before);
  });
});
