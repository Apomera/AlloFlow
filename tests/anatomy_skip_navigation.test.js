import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Round 24 (2026-09-03): measured in a browser, reaching the first structure by keyboard took
// 67 Tab presses out of 89 tabbable controls, with no bypass. A skip link now jumps straight
// to the mode panel, which cuts it to about six.

const ANATOMY_PATHS = [
  'stem_lab/stem_tool_anatomy.js',
  'desktop/web-app/public/stem_lab/stem_tool_anatomy.js',
];

const OLDER = { gradeLevel: '9' };
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

function parse(html) {
  const root = document.createElement('div');
  root.innerHTML = html;
  return root;
}

function render(filePath, state) {
  loadTool(filePath, 'anatomy');
  return parse(renderTool('anatomy', {
    anatomy: { system: 'skeletal', view: 'anterior', complexity: 3, _activeTab: 'explore', ...state },
  }, OLDER));
}

beforeEach(() => { resetStemLab(); });

describe('Anatomy skip navigation', () => {
  it.each(ANATOMY_PATHS)('offers the bypass as the very first control in %s', (filePath) => {
    const root = render(filePath, {});
    const shell = root.querySelector('.anatomy-tool-shell');
    const focusable = [...shell.querySelectorAll(FOCUSABLE)];
    expect(focusable.length).toBeGreaterThan(50);
    expect(focusable[0].getAttribute('data-anatomy-skip')).toBe('workspace');
    expect(focusable[0].textContent).toBe('Skip to the study panel');
  }, 60_000);

  it.each(ANATOMY_PATHS)('keeps the bypass out of sight until it is focused in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    // Off-screen rather than display:none, so it stays in the tab order.
    expect(source).toContain('.anatomy-skip-link{position:absolute;left:-9999px');
    expect(source).toContain('.anatomy-skip-link:focus{position:static;');
    expect(source).not.toContain('.anatomy-skip-link{display:none');
  });

  it.each(ANATOMY_PATHS)('gives the skip target a focusable landing point in every mode in %s', (filePath) => {
    for (const tab of ['explore', 'quiz', 'tour', 'connections', 'spotter', 'pathways', 'flashcards', 'homeoHunt']) {
      const root = render(filePath, { _activeTab: tab, quizMode: tab === 'quiz' });
      const panel = root.querySelector('#anatomy-mode-panel');
      expect(panel, tab).not.toBeNull();
      // tabIndex -1 is required: without it focus() is a no-op and the bypass does nothing.
      expect(panel.getAttribute('tabindex'), tab).toBe('-1');
    }
  }, 60_000);
});
