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
const historyButtons = () => [...$('avatarHistory').querySelectorAll('button')];
function choose(id, value) {
  $(id).value = String(value);
  $(id).dispatchEvent(new Event('change', {bubbles: true}));
}
function movement(value) {
  $('avatarMovement').value = String(value);
  $('avatarMovement').dispatchEvent(new Event('input', {bubbles: true}));
}
function start(activity = 'avatar-sauce-rescue') {
  choose('avatarActivity', activity);
  choose('avatarMode', 'independent');
  $('avatarStart').click();
}
function tick(time) {
  const frame = frames.entries().next().value;
  expect(frame, 'A scheduled movement frame must exist').toBeTruthy();
  frames.delete(frame[0]);
  frame[1](time);
}
function playInspection() {
  $('avatarInspect').click();
  movement(0); // A native control takes over the optional cosmetic pickup.
  $('avatarPlayMovement').click();
  expect($('testHost').dataset.learnerPlaying).toBe('true');
}
function finishPlayback() {
  for (let n = 0; session().pending?.phase !== 'ready' && n < 20; n++) tick(n * 10000);
  expect(session().pending?.phase).toBe('ready');
  expect(frames.size).toBe(0);
}
function completeInspection() {
  $('avatarInspect').click();
  for (let n = 0; session().pending?.phase !== 'ready' && n < 20; n++) {
    $('avatarPlace').click();
    $('avatarAdvance').click();
  }
  expect(session().pending?.phase).toBe('ready');
  $('avatarCommit').click();
}
function references(node, attribute) {
  const ids = (node.getAttribute(attribute) || '').trim().split(/\s+/).filter(Boolean);
  expect(ids.length, `${node.id} needs ${attribute}`).toBeGreaterThan(0);
  return ids.map(id => {
    const target = $(id);
    expect(target, `${attribute} target ${id} must exist`).not.toBeNull();
    return target;
  });
}
function nameText(node) {
  return references(node, 'aria-labelledby').map(target => target.textContent.trim()).join(' ');
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
  ui = window.KitchenAvatarUI.mount({container: $('testHost'), model: M});
});
afterEach(() => {
  ui?.dispose();
  vi.restoreAllMocks();
  localStorage.clear();
  document.body.replaceChildren();
});

describe('Chef station keyboard focus survives observation and playback', () => {
  it('retains a saved-attempt button through reordering and lets the same focused controls restore again', () => {
    start();
    completeInspection();
    const first = historyButtons()[0], firstId = first.dataset.avatarHistoryId, firstKitchen = kitchen();
    start('tomato-texture');
    completeInspection();
    const second = historyButtons()[0], secondId = second.dataset.avatarHistoryId, secondKitchen = kitchen();
    expect(historyButtons().map(button => button.dataset.avatarHistoryId)).toEqual([secondId, firstId]);

    first.focus();
    first.click();
    expect(document.activeElement).toBe(first);
    expect(first.isConnected).toBe(true);
    expect(first.getAttribute('aria-current')).toBe('true');
    expect(historyButtons()).toEqual([first, second]);
    expect(kitchen()).toEqual(firstKitchen);

    // Persisting/re-rendering and another restoration must preserve usable nodes.
    $('avatarSave').click();
    expect(document.activeElement).toBe(first);
    const tab = new KeyboardEvent('keydown', {key: 'Tab', bubbles: true, cancelable: true});
    first.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(false);
    second.focus();
    second.click();
    expect(document.activeElement).toBe(second);
    expect(historyButtons()).toEqual([second, first]);
    expect(second.getAttribute('aria-current')).toBe('true');
    expect(first.hasAttribute('aria-current')).toBe(false);
    expect(kitchen()).toEqual(secondKitchen);
  });

  it.each(['avatarPauseMovement', 'avatarPlace', 'avatarMovement'])('moves focus from %s to the separate release when playback hides that control', id => {
    start();
    const before = kitchen();
    playInspection();
    $(id).focus();
    expect(document.activeElement).toBe($(id));
    finishPlayback();
    expect($(id).closest('[hidden]')).not.toBeNull();
    expect(document.activeElement).toBe($('avatarCommit'));
    expect($('avatarCommit').closest('[hidden]')).toBeNull();
    expect($('avatarCommit').disabled).toBe(false);
    expect(kitchen()).toEqual(before);
  });

  it.each(['avatarPlayMovement', 'outsideControl'])('keeps existing visible focus on %s when playback becomes ready', id => {
    start();
    const before = kitchen();
    playInspection();
    $(id).focus();
    finishPlayback();
    expect(document.activeElement).toBe($(id));
    expect($(id).closest('[hidden]')).toBeNull();
    expect(kitchen()).toEqual(before);
    if (id === 'avatarPlayMovement') {
      $(id).dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', repeat: true, bubbles: true}));
      $(id).click();
      expect(document.activeElement).toBe($(id));
      expect(kitchen()).toEqual(before);
    }
  });

  it('pauses at the current checkpoint, rejects stale frames, and permits native control takeover and resume', () => {
    start();
    const before = kitchen();
    playInspection();
    tick(0);
    tick(120);
    const pausedPhase = session().pending.phase, pausedProgress = $('avatarMovement').value;
    const stale = [...frames.values()][0];
    expect(Number(pausedProgress)).toBeGreaterThan(0);
    expect($('avatarPauseMovement').getAttribute('aria-disabled')).toBe('false');
    $('avatarPauseMovement').focus();
    $('avatarPauseMovement').click();
    expect(document.activeElement).toBe($('avatarPauseMovement'));
    expect($('testHost').dataset.learnerPlaying).toBe('false');
    expect($('avatarPauseMovement').getAttribute('aria-disabled')).toBe('true');
    expect($('avatarPlayMovement').getAttribute('aria-disabled')).toBe('false');
    expect($('avatarStatus').textContent).toContain('paused');
    expect(frames.size).toBe(0);
    stale(60000);
    expect(session().pending.phase).toBe(pausedPhase);
    expect($('avatarMovement').value).toBe(pausedProgress);
    movement(35);
    expect($('avatarMovement').value).toBe('35');
    expect($('avatarMovement').getAttribute('aria-valuetext')).toContain('35 percent');
    $('avatarPlayMovement').focus();
    $('avatarPlayMovement').click();
    finishPlayback();
    expect(kitchen()).toEqual(before);
  });

  it('prepares reduced-motion checkpoints without animation or silently moving Play focus onto release', () => {
    start();
    media.matches = true;
    motionChange();
    const before = kitchen();
    $('avatarInspect').click();
    $('avatarPlayMovement').focus();
    $('avatarPlayMovement').click();
    expect(session().pending.phase).toBe('ready');
    expect(frames.size).toBe(0);
    expect(document.activeElement).toBe($('avatarPlayMovement'));
    expect($('avatarCommit').hidden).toBe(false);
    expect(kitchen()).toEqual(before);
  });
});

describe('Chef station names and announcements separate instructions from changing values', () => {
  it('keeps per-frame outputs nonlive and range label references stable while exposing the current percentage and phase', async () => {
    start();
    $('avatarInspect').click();
    movement(0);
    const range = $('avatarMovement'), nameReference = range.getAttribute('aria-labelledby'), firstName = nameText(range);
    for (const input of $('testHost').querySelectorAll('input[type=range]')) {
      expect(nameText(input).length).toBeGreaterThan(0);
      for (const label of references(input, 'aria-labelledby')) {
        expect(label.matches('output')).toBe(false);
        expect(label.querySelector('output')).toBeNull();
      }
    }
    for (const output of $('testHost').querySelectorAll('output')) expect(output.getAttribute('aria-live')).toBe('off');
    expect($('avatarStatus').getAttribute('role')).toBe('status');
    expect($('avatarStatus').getAttribute('aria-live')).toBe('polite');
    const before = kitchen();
    $('avatarPlayMovement').click();
    await Promise.resolve();
    const changes = [];
    const observer = new MutationObserver(mutations => changes.push(...mutations));
    observer.observe($('avatarStatus'), {subtree: true, childList: true, characterData: true});
    const percentages = [];
    try {
      for (const time of [0, 40, 80, 120, 160]) {
        tick(time);
        await Promise.resolve();
        percentages.push($('avatarMovementValue').textContent);
        expect(range.getAttribute('aria-labelledby')).toBe(nameReference);
        expect(nameText(range)).toBe(firstName);
        expect(range.getAttribute('aria-valuetext')).toBe(`${Math.round(Number(range.value))} percent toward ${firstName}`);
      }
      expect(new Set(percentages).size).toBeGreaterThan(1);
      expect(changes).toHaveLength(0);
    } finally { observer.disconnect(); }
    $('avatarPauseMovement').click();
    $('avatarPlace').click();
    $('avatarAdvance').click();
    expect(range.getAttribute('aria-labelledby')).toBe(nameReference);
    expect(nameText(range)).not.toBe(firstName);
    expect(range.getAttribute('aria-valuetext')).toContain(nameText(range));
    expect(references(range, 'aria-describedby')).toContain($('avatarPendingTitle'));
    expect(kitchen()).toEqual(before);
  });

  it('gives the interactive scene a concise group name and a separate description without hiding its hand controls', () => {
    const scene = $('avatarScene');
    expect(scene.getAttribute('role')).toBe('group');
    const names = references(scene, 'aria-labelledby'), descriptions = references(scene, 'aria-describedby');
    expect(names).toEqual([scene.querySelector('title')]);
    expect(descriptions).toEqual([scene.querySelector('desc')]);
    expect(names[0].textContent.trim()).not.toBe('');
    expect(descriptions[0].textContent.trim()).not.toBe('');
    expect(names).not.toContain(descriptions[0]);
    const handle = $('avatarHandle');
    expect(handle.getAttribute('role')).toBe('button');
    expect(handle.getAttribute('tabindex')).toBe('0');
    expect(handle.closest('[aria-hidden=true]')).toBeNull();
    handle.focus();
    const tab = new KeyboardEvent('keydown', {key: 'Tab', bubbles: true, cancelable: true});
    handle.dispatchEvent(tab);
    expect(tab.defaultPrevented).toBe(false);
    expect(session().pending).toBeNull();
  });

  it('names recorded-trail replay in seconds without changing the kitchen or making its output live', () => {
    start();
    completeInspection();
    const before = kitchen(), range = $('avatarTrailTime'), label = nameText(range), reference = range.getAttribute('aria-labelledby');
    const status = $('avatarStatus').textContent;
    range.value = '1.25';
    range.dispatchEvent(new Event('input', {bubbles: true}));
    expect(range.getAttribute('aria-valuetext')).toContain('1.25 seconds');
    expect(range.getAttribute('aria-valuetext')).toContain('recorded trail');
    expect(range.getAttribute('aria-valuetext')).toContain('kitchen time unchanged');
    expect($('avatarTrailValue').textContent).toBe('1.25 s');
    expect($('avatarTrailValue').getAttribute('aria-live')).toBe('off');
    expect(range.getAttribute('aria-labelledby')).toBe(reference);
    expect(nameText(range)).toBe(label);
    expect($('avatarStatus').textContent).toBe(status);
    expect(kitchen()).toEqual(before);
  });
});

describe('Chef station section navigation is observational', () => {
  it('offers four distinct native links to existing, visible, focusable section destinations', () => {
    const nav = $('testHost').querySelector('nav[aria-label="Chef station sections"]');
    expect(nav).not.toBeNull();
    const links = [...nav.querySelectorAll('a[href^="#"]')];
    expect(links).toHaveLength(4);
    expect(new Set(links.map(link => link.hash)).size).toBe(4);
    const before = kitchen();
    for (const link of links) {
      const target = $(link.hash.slice(1));
      expect(link.textContent.trim()).not.toBe('');
      expect(target).not.toBeNull();
      expect(target.closest('[hidden], [aria-hidden="true"]')).toBeNull();
      expect(target.matches('select, button, input, [tabindex="-1"], [tabindex="0"]')).toBe(true);
      link.focus();
      link.click();
      expect(kitchen()).toEqual(before);
      expect(session().pending).toBeNull();
    }
    expect(links.map(link => link.hash)).toEqual(['#avatarActivity', '#avatarControlsTitle', '#avatarEvidenceTitle', '#avatarSavedAttemptsTitle']);
  });
});
