import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Round 29 (2026-09-03): axe does not flag two controls that share an accessible name, yet in
// Tour and Cards a "Next" button that advanced the mode sat beside a "Next" button that only
// shuffled the fun-fact banner. Both are named for what they do now.

const ANATOMY_PATHS = [
  'stem_lab/stem_tool_anatomy.js',
  'desktop/web-app/public/stem_lab/stem_tool_anatomy.js',
];

const OLDER = { gradeLevel: '9' };

const MODES = [
  ['explore', { _activeTab: 'explore', selectedStructure: 'femur' }],
  ['quiz', { _activeTab: 'quiz', quizMode: true }],
  ['tour', { _activeTab: 'tour' }],
  ['connections', { _activeTab: 'connections' }],
  ['spotter', { _activeTab: 'spotter' }],
  ['pathways', { _activeTab: 'pathways' }],
  ['flashcards', { _activeTab: 'flashcards' }],
  ['homeoHunt', { _activeTab: 'homeoHunt', system: 'organs' }],
  ['imaging', { _activeTab: 'imaging', system: 'organs' }],
];

function parse(html) {
  const root = document.createElement('div');
  root.innerHTML = html;
  return root;
}

function render(filePath, state) {
  loadTool(filePath, 'anatomy');
  return parse(renderTool('anatomy', {
    anatomy: { system: 'skeletal', view: 'anterior', complexity: 3, _startHereDismissed: true, ...state },
  }, OLDER));
}

function accessibleName(el) {
  // The roots here are detached from document. Resolve references inside their
  // own tree, and remove the embedded control when reading a wrapping label.
  const root = el.getRootNode();
  const labelText = (label) => {
    const copy = label.cloneNode(true);
    copy.querySelectorAll('button,input,select,textarea,[aria-hidden="true"]').forEach(node => node.remove());
    return copy.textContent || '';
  };
  const referenced = (el.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean)
    .map(id => [...root.querySelectorAll('[id]')].find(node => node.id === id))
    .filter(Boolean).map(labelText).join(' ');
  const labels = [...(el.labels || [])].map(labelText).join(' ');
  const contents = /^(BUTTON|A)$/.test(el.tagName) ? labelText(el) : '';
  const raw = referenced || el.getAttribute('aria-label') || labels
    || contents || el.getAttribute('title') || el.getAttribute('placeholder') || '';
  return raw.replace(/\s+/g, ' ').trim();
}

function duplicateNames(root) {
  const byName = new Map();
  for (const el of root.querySelectorAll('button,a[href],input,select,textarea')) {
    if (el.hasAttribute('disabled')) continue;
    if (el.getAttribute('aria-hidden') === 'true' || el.closest('[aria-hidden="true"]')) continue;
    const name = accessibleName(el);
    if (!name) continue;
    byName.set(name, (byName.get(name) || 0) + 1);
  }
  return [...byName.entries()].filter(([, count]) => count > 1);
}

beforeEach(() => { resetStemLab(); });

describe('Anatomy control names', () => {
  it.each(ANATOMY_PATHS)('uses the distinct visible labels for both Tour selectors in %s', (filePath) => {
    const root = render(filePath, { _activeTab: 'tour' });
    expect(accessibleName(root.querySelector('#anatomy-study-system'))).toBe('Body system');
    expect(accessibleName(root.querySelector('#anatomy-tour-system-select'))).toBe('Choose a tour');
  });

  it.each(ANATOMY_PATHS)('gives every control on a screen its own name in %s', (filePath) => {
    for (const [mode, state] of MODES) {
      const dupes = duplicateNames(render(filePath, state));
      expect(dupes, `${mode}: ${JSON.stringify(dupes)}`).toEqual([]);
    }
  }, 120_000);

  it.each(ANATOMY_PATHS)('names each Next button for what it advances in %s', (filePath) => {
    const names = (state) => [...render(filePath, state).querySelectorAll('button')]
      .map(accessibleName).filter(Boolean);

    expect(names({ _activeTab: 'tour' })).toContain('Next tour step');
    expect(names({ _activeTab: 'flashcards' })).toContain('Next flashcard');
    // The fun-fact banner rides along with several modes and must not claim the plain name.
    expect(names({ _activeTab: 'tour' })).toContain('Next idea');
    for (const mode of ['tour', 'flashcards', 'explore']) {
      expect(names({ _activeTab: mode }), mode).not.toContain('Next');
    }
  }, 60_000);
});
