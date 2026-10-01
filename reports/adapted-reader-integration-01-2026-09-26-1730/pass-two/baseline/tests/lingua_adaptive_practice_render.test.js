import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
let React, ReactDOMClient, act, axe, Lingua, root, host;
const AXE_OPTIONS = { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, rules: { 'color-contrast': { enabled: false }, region: { enabled: false }, 'page-has-heading-one': { enabled: false }, 'landmark-one-main': { enabled: false }, 'scrollable-region-focusable': { enabled: false } } };
const now = Date.now();
const lesson = {
  title: 'French mixed practice', goal: 'Practice several modes.', scenario: 'At school.',
  vocabulary: [
    { id: 'word-bonjour', term: 'bonjour', meaning: 'hello', forms: [{ id: 'form-bonjours', label: 'plural', form: 'bonjours', includeInPractice: true }, { id: 'form-bonjour-polite', label: 'polite form', form: 'bonjour, madame', includeInPractice: true }] },
    { id: 'word-merci', term: 'merci', meaning: 'thanks' },
  ],
  phrases: [{ target: 'Bonjour tout le monde.', translation: 'Hello everyone.' }],
  conversation: [],
};
const setEntry = { id: 'set-french-mixed', language: 'French', name: 'French mixed practice', lesson, level: 'Beginner', createdAt: now - 1000, updatedAt: now - 1000 };

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  axe = require(resolve(modulesDir, 'axe-core'));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('lingua_practice_module.js');
  Lingua = window.AlloModules.LinguaPractice;
});

afterEach(() => {
  if (root) { act(() => root.unmount()); root = null; }
  if (host) { host.remove(); host = null; }
  localStorage.clear();
});

function click(node) {
  return act(async () => { node.dispatchEvent(new MouseEvent('click', { bubbles: true })); await Promise.resolve(); });
}

describe('Lingua recommended mixed practice UI', () => {
  it('previews an accessible local queue and advances only when the learner chooses Next item', async () => {
    localStorage.setItem('allo_lingua_profile_v1', JSON.stringify({ known: 'English', target: 'French', level: 'Beginner', topic: 'Mixed practice' }));
    localStorage.setItem('allo_lingua_sets_v1', JSON.stringify([setEntry]));
    localStorage.setItem('allo_lingua_progress_v1', JSON.stringify({}));
    host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
    await act(async () => { root.render(React.createElement(Lingua, { isOpen: true, onClose: () => {} })); });
    const progressButton = Array.from(host.querySelectorAll('button')).find((node) => node.textContent.includes('Progress'));
    await click(progressButton);
    const builder = host.querySelector('[data-adaptive-practice="builder"]');
    expect(builder).toBeTruthy();
    expect(builder.textContent).toContain('not a score or a claim about ability');
    expect(builder.querySelectorAll('ol li')).toHaveLength(5);
    const before = localStorage.getItem('allo_lingua_progress_v1');
    await click(builder.querySelector('[data-adaptive-action="start"]'));
    const banner = host.querySelector('[data-adaptive-session="active"]');
    expect(banner).toBeTruthy();
    expect(banner.textContent).toContain('Recommended practice 1 of 5');
    expect(banner.textContent).toContain('does not mark it complete');
    expect(host.querySelector('[data-vocabulary-item-id]')).toBeTruthy();
    expect(localStorage.getItem('allo_lingua_progress_v1')).toBe(before);
    await click(banner.querySelector('[data-adaptive-action="next"]'));
    expect(host.querySelector('[data-adaptive-session="active"]').textContent).toContain('Recommended practice 2 of 5');
    expect(host.textContent).toContain('Grammar and word forms');
    expect(localStorage.getItem('allo_lingua_progress_v1')).toBe(before);
    expect((await axe.run(host, AXE_OPTIONS)).violations).toEqual([]);
    await click(host.querySelector('[data-adaptive-action="end"]'));
    expect(host.querySelector('[data-adaptive-session="active"]')).toBeNull();
    expect(host.textContent).toContain('Recommended mixed practice');
  }, 90000);

  it('routes a due nonfirst form by stable ID even when the same set is already active', async () => {
    const normalizedSet = Lingua._normalizePracticeSets([setEntry])[0];
    const form = Lingua._formPracticeItems(normalizedSet.lesson, [], 'French', now)[1];
    localStorage.setItem('allo_lingua_profile_v1', JSON.stringify({ known: 'English', target: 'French', level: 'Beginner', topic: 'Mixed practice' }));
    localStorage.setItem('allo_lingua_sets_v1', JSON.stringify([setEntry]));
    localStorage.setItem('allo_lingua_progress_v1', JSON.stringify({ formReviews: [{ id: form.reviewId, kind: 'form', language: 'French', wordId: form.wordId, formId: form.formId, base: form.base, meaning: form.meaning, label: form.label, form: form.form, practiceSetId: setEntry.id, nextReviewAt: now - 1000, lastRating: 'again' }] }));
    host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
    await act(async () => { root.render(React.createElement(Lingua, { isOpen: true, onClose: () => {} })); });
    await click(Array.from(host.querySelectorAll('button')).find((node) => node.textContent.includes('Progress')));
    await click(host.querySelector('[data-adaptive-action="start"]'));
    expect(host.textContent).toContain('Write the form labeled polite form');
    expect(host.querySelector('[data-adaptive-session="active"]').textContent).toContain('Recommended practice 1 of 5');
  }, 90000);
});