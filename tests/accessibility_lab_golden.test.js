// Logic-characterization tests for accessibility_lab_module.js — the screen-reader
// simulation engine (the "preview as a screen-reader user" feature teachers rely on
// to sanity-check accessibility).
//
// WHY: these functions turn a DOM element into the phrase a screen reader would speak
// (role + name + state). If they drift, the lab silently teaches the wrong thing. The
// module had no test coverage and is in no render-smoke gate. The functions are pure
// (element in → string out), so we pin them with jsdom elements. Exposed via a
// read-only seam (AccessibilityLabInternals).

import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let A;
beforeAll(() => {
  const React = require(resolve(process.cwd(), 'prismflow-deploy/node_modules/react'));
  globalThis.React = window.React = React;
  // The module early-returns unless window.ReactDOM.createPortal exists.
  window.ReactDOM = require(resolve(process.cwd(), 'prismflow-deploy/node_modules/react-dom'));
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  loadAlloModule('accessibility_lab_module.js');
  A = window.AlloModules.AccessibilityLabInternals;
  if (!A || !A.composeAnnouncement) throw new Error('AccessibilityLabInternals seam not present');
});

const el = (tag, attrs = {}, text) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (text != null) e.textContent = text;
  return e;
};

describe('getScreenReaderRole', () => {
  it('native element roles', () => {
    expect(A.getScreenReaderRole(el('button'))).toBe('button');
    expect(A.getScreenReaderRole(el('a', { href: '#' }))).toBe('link');
    expect(A.getScreenReaderRole(el('a'))).toBeNull();           // no href → not a link
    expect(A.getScreenReaderRole(el('select'))).toBe('combo box');
    expect(A.getScreenReaderRole(el('h2'))).toBe('heading level 2');
    expect(A.getScreenReaderRole(el('nav'))).toBe('navigation');
  });
  it('input type → role', () => {
    expect(A.getScreenReaderRole(el('input', { type: 'checkbox' }))).toBe('checkbox');
    expect(A.getScreenReaderRole(el('input', { type: 'text' }))).toBe('edit');
    expect(A.getScreenReaderRole(el('input', { type: 'range' }))).toBe('slider');
  });
  it('img alt="" is decorative (null); alt text → graphic', () => {
    expect(A.getScreenReaderRole(el('img', { alt: '' }))).toBeNull();
    expect(A.getScreenReaderRole(el('img', { alt: 'Logo' }))).toBe('graphic');
  });
  it('explicit role wins, with friendly aliases', () => {
    expect(A.getScreenReaderRole(el('div', { role: 'tab' }))).toBe('tab');
    expect(A.getScreenReaderRole(el('div', { role: 'progressbar' }))).toBe('progress bar');
  });
  it('section is a region only when labelled', () => {
    expect(A.getScreenReaderRole(el('section'))).toBeNull();
    expect(A.getScreenReaderRole(el('section', { 'aria-label': 'Intro' }))).toBe('region');
  });
});

describe('getScreenReaderName', () => {
  it('aria-label wins', () => {
    expect(A.getScreenReaderName(el('button', { 'aria-label': 'Save' }, 'X'))).toBe('Save');
  });
  it('falls back to text content', () => {
    expect(A.getScreenReaderName(el('button', {}, 'Click me'))).toBe('Click me');
  });
  it('img → alt', () => {
    expect(A.getScreenReaderName(el('img', { alt: 'A cat' }))).toBe('A cat');
  });
  it('input placeholder is flagged as a placeholder', () => {
    expect(A.getScreenReaderName(el('input', { type: 'text', placeholder: 'Email' }))).toBe('Email (placeholder)');
  });
  it('resolves aria-labelledby from the document', () => {
    const lbl = el('span', { id: 'lbl-1' }, 'My Label');
    document.body.appendChild(lbl);
    const target = el('div', { role: 'button', 'aria-labelledby': 'lbl-1' });
    expect(A.getScreenReaderName(target)).toBe('My Label');
    lbl.remove();
  });
});

describe('getScreenReaderState', () => {
  it('checkbox checked / unchecked / indeterminate', () => {
    const c = el('input', { type: 'checkbox' }); c.checked = true;
    expect(A.getScreenReaderState(c)).toContain('checked');
    const u = el('input', { type: 'checkbox' });
    expect(A.getScreenReaderState(u)).toContain('not checked');
    const i = el('input', { type: 'checkbox' }); i.indeterminate = true;
    expect(A.getScreenReaderState(i)).toContain('partially checked');
  });
  it('aria-expanded / aria-pressed', () => {
    expect(A.getScreenReaderState(el('button', { 'aria-expanded': 'true' }))).toContain('expanded');
    expect(A.getScreenReaderState(el('button', { 'aria-expanded': 'false' }))).toContain('collapsed');
    expect(A.getScreenReaderState(el('button', { 'aria-pressed': 'true' }))).toContain('pressed');
  });
  it('disabled / required', () => {
    const d = el('button'); d.disabled = true;
    expect(A.getScreenReaderState(d)).toContain('disabled');
    expect(A.getScreenReaderState(el('input', { type: 'text', 'aria-required': 'true' }))).toContain('required');
  });
  it('aria-hidden → null (skipped entirely)', () => {
    expect(A.getScreenReaderState(el('div', { 'aria-hidden': 'true', role: 'button' }))).toBeNull();
  });
});

describe('composeAnnouncement — name, role, state', () => {
  it('labelled button', () => {
    expect(A.composeAnnouncement(el('button', { 'aria-label': 'Save' }))).toBe('Save, button');
  });
  it('checked checkbox with a label', () => {
    const c = el('input', { type: 'checkbox', 'aria-label': 'Agree' }); c.checked = true;
    expect(A.composeAnnouncement(c)).toBe('Agree, checkbox, checked');
  });
  it('expandable menu button (collapsed)', () => {
    expect(A.composeAnnouncement(el('button', { 'aria-label': 'Menu', 'aria-expanded': 'false' }))).toBe('Menu, button, collapsed');
  });
  it('roleless element → null (nothing announced)', () => {
    expect(A.composeAnnouncement(el('span', {}, 'just text'))).toBeNull();
    expect(A.composeAnnouncement(el('div', { 'aria-hidden': 'true', role: 'button' }))).toBeNull();
  });
});
