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
const storageKey = 'alloflow-kitchen-avatar-v1';
const $ = id => document.getElementById(id);
let ui;

const session = () => ui.getSession();
function draft(value) {
  $('avatarReflection').value = value;
  $('avatarReflection').dispatchEvent(new Event('input', {bubbles: true}));
}
function inspect() {
  $('avatarInspect').click();
  for (let n = 0; session().pending?.phase !== 'ready' && n < 20; n++) {
    $('avatarPlace').click();
    $('avatarAdvance').click();
  }
  expect(session().pending?.phase).toBe('ready');
  $('avatarCommit').click();
  expect(session().record.intents).toHaveLength(1);
}
function descriptions() {
  const ids = ($('avatarReflection').getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  return ids.map(id => {
    const node = $(id);
    expect(node, `Description ${id} must exist`).not.toBeNull();
    return node;
  });
}
function expectLengthCorrection() {
  const field = $('avatarReflection');
  expect(field.getAttribute('aria-invalid')).toBe('true');
  expect(document.activeElement).toBe(field);
  const visible = descriptions().filter(node => !node.hidden && !node.closest('[hidden]'));
  expect(visible.some(node => node.id !== 'avatarReflectionHelp' && /2,?000/.test(node.textContent) && /character/i.test(node.textContent))).toBe(true);
  expect($('avatarStatus').textContent).toMatch(/2,?000/);
  expect($('avatarStatus').textContent).not.toMatch(/Record selected|Explanation saved/i);
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

describe('Portable chef records contain the explanation actually selected for copying', () => {
  it('refreshes a previously opened record with the latest explanation before selecting it', () => {
    draft('First explanation');
    $('avatarViewJSON').click();
    expect(JSON.parse($('avatarJSON').value).reflection).toBe('First explanation');
    draft('Revised explanation');
    const before = session(), stored = localStorage.getItem(storageKey);
    const select = vi.spyOn($('avatarJSON'), 'select');
    $('avatarSelectJSON').click();
    expect(JSON.parse($('avatarJSON').value).reflection).toBe('Revised explanation');
    expect(select).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe($('avatarJSON'));
    expect($('avatarJSON').selectionStart).toBe(0);
    expect($('avatarJSON').selectionEnd).toBe($('avatarJSON').value.length);
    expect($('avatarStatus').textContent).toMatch(/selected.*copy/i);
    expect(session()).toEqual(before);
    expect(localStorage.getItem(storageKey)).toBe(stored);
  });

  it('includes a later committed action and the latest unsaved draft without inventing another action', () => {
    draft('Before cooking');
    $('avatarViewJSON').click();
    inspect();
    draft('This check changed my explanation');
    const before = session(), stored = localStorage.getItem(storageKey);
    $('avatarSelectJSON').click();
    const exported = JSON.parse($('avatarJSON').value);
    expect(exported.reflection).toBe('This check changed my explanation');
    expect(exported.intents).toEqual(before.record.intents);
    expect(exported.intents).toHaveLength(1);
    expect(M.restoreRecord(exported)).not.toBeNull();
    expect(session()).toEqual(before);
    expect(localStorage.getItem(storageKey)).toBe(stored);
  });

  it('blocks selection of an oversized draft, preserving the last valid record and focusing the correction', () => {
    draft('Last valid explanation');
    inspect();
    $('avatarViewJSON').click();
    const validJSON = $('avatarJSON').value, before = session(), stored = localStorage.getItem(storageKey);
    const select = vi.spyOn($('avatarJSON'), 'select');
    draft('x'.repeat(2001));
    $('avatarSelectJSON').focus();
    $('avatarSelectJSON').click();
    expectLengthCorrection();
    expect(select).not.toHaveBeenCalled();
    expect($('avatarJSON').value).toBe(validJSON);
    expect($('avatarReflection').value).toHaveLength(2001);
    expect(session()).toEqual(before);
    expect(localStorage.getItem(storageKey)).toBe(stored);
  });

  it('validates View portable record too and does not replace a valid export with invalid text', () => {
    draft('Retain this valid record');
    $('avatarViewJSON').click();
    const validJSON = $('avatarJSON').value, before = session();
    draft('x'.repeat(2001));
    $('avatarViewJSON').focus();
    $('avatarViewJSON').click();
    expectLengthCorrection();
    expect($('avatarJSON').value).toBe(validJSON);
    expect(session()).toEqual(before);
  });

  it('clears the length error after correction and exports the corrected draft without a stale failure', () => {
    draft('x'.repeat(2001));
    $('avatarViewJSON').click();
    expectLengthCorrection();
    draft('Corrected explanation');
    expect($('avatarReflection').getAttribute('aria-invalid')).not.toBe('true');
    expect(document.activeElement).toBe($('avatarReflection'));
    $('avatarViewJSON').click();
    expect(JSON.parse($('avatarJSON').value).reflection).toBe('Corrected explanation');
    expect($('avatarJSONPanel').hidden).toBe(false);
    expect($('avatarStatus').textContent).not.toMatch(/within 2,?000|too long|exceeds/i);
    $('avatarSelectJSON').click();
    expect(document.activeElement).toBe($('avatarJSON'));
    expect($('avatarStatus').textContent).toMatch(/selected/i);
  });
});

describe('Explanation saving distinguishes validation from device storage failure', () => {
  it('reports failed storage without blaming the valid explanation or displaying the earlier save success', () => {
    draft('Saved explanation');
    inspect();
    $('avatarSave').click();
    expect($('avatarStatus').textContent).toMatch(/saved/i);
    const stored = localStorage.getItem(storageKey), before = session();
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {throw new DOMException('Storage blocked', 'SecurityError');});
    draft('Important final revision');
    $('avatarSave').click();
    expect(write).toHaveBeenCalledOnce();
    expect($('avatarStatus').textContent).toMatch(/could not|not saved|unavailable|blocked/i);
    expect($('avatarStatus').textContent).toMatch(/device|storage/i);
    expect($('avatarStatus').textContent).not.toMatch(/2,?000|character|Explanation saved/i);
    expect($('avatarReflection').getAttribute('aria-invalid')).not.toBe('true');
    expect($('avatarReflection').value).toBe('Important final revision');
    expect(session()).toEqual(before);
    expect(localStorage.getItem(storageKey)).toBe(stored);
    $('avatarViewJSON').click();
    $('avatarSelectJSON').click();
    expect(JSON.parse($('avatarJSON').value).reflection).toBe('Important final revision');
  });

  it('rejects an oversized saved explanation before writing and retains the earlier saved attempt', () => {
    draft('Previously saved');
    inspect();
    const stored = localStorage.getItem(storageKey), before = session();
    const write = vi.spyOn(Storage.prototype, 'setItem');
    draft('x'.repeat(2001));
    $('avatarSave').focus();
    $('avatarSave').click();
    expectLengthCorrection();
    expect(write).not.toHaveBeenCalled();
    expect(localStorage.getItem(storageKey)).toBe(stored);
    expect(session()).toEqual(before);
  });

  it('accepts the full advertised limit and saves again after correcting a length error', () => {
    inspect();
    draft('x'.repeat(2001));
    $('avatarSave').click();
    expectLengthCorrection();
    const text = 'y'.repeat(2000);
    draft(text);
    $('avatarSave').click();
    expect($('avatarReflection').getAttribute('aria-invalid')).not.toBe('true');
    expect(JSON.parse(localStorage.getItem(storageKey)).current.record.reflection).toBe(text);
    expect($('avatarStatus').textContent).toMatch(/Explanation saved/i);
    expect(session().record.intents).toHaveLength(1);
  });
});
