import fs from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadTool, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Round 23 (2026-09-03): a sweep of 10 systems x 2 views x 3 complexity levels found 12
// combinations with an empty structure list. Circulatory, Respiratory and Integumentary are
// empty in posterior view at EVERY level, and the escape offered was "Show advanced
// structures", which does nothing when complexity is already 3.

const ANATOMY_PATHS = [
  'stem_lab/stem_tool_anatomy.js',
  'desktop/web-app/public/stem_lab/stem_tool_anatomy.js',
];

const OLDER = { gradeLevel: '9' };
const ALL_SYSTEMS = ['skeletal', 'muscular', 'circulatory', 'nervous', 'organs',
  'respiratory', 'endocrine', 'lymphatic', 'integumentary', 'reproductive'];

function parse(html) {
  const root = document.createElement('div');
  root.innerHTML = html;
  return root;
}

function render(filePath, state) {
  loadTool(filePath, 'anatomy');
  return parse(renderTool('anatomy', {
    anatomy: { view: 'anterior', complexity: 3, _activeTab: 'explore', ...state },
  }, OLDER));
}

function rowCount(root) {
  return root.querySelectorAll('[data-anatomy-structure-list] .anatomy-structure-list > button').length;
}

beforeEach(() => { resetStemLab(); });

describe('Anatomy empty structure list', () => {
  it.each(ANATOMY_PATHS)('never offers a level change when the level is already at maximum in %s', (filePath) => {
    const source = fs.readFileSync(filePath, 'utf8');
    expect(source).toContain("'data-anatomy-empty-action': 'view'");
    expect(source).toContain('var otherViewMatchCount =');
  });

  it.each(ANATOMY_PATHS)('points at the other view when this one is empty in %s', (filePath) => {
    for (const system of ['circulatory', 'respiratory', 'integumentary']) {
      const root = render(filePath, { system, view: 'posterior' });
      expect(rowCount(root), system).toBe(0);
      const action = root.querySelector('[data-anatomy-empty-action]');
      expect(action, system).not.toBeNull();
      expect(action.getAttribute('data-anatomy-empty-action'), system).toBe('view');
      expect(action.textContent, system).toBe('Show the anterior view');

      // The other view really does have structures, so the offer is honest.
      expect(rowCount(render(filePath, { system, view: 'anterior' })), system).toBeGreaterThan(0);
    }
  }, 60_000);

  it.each(ANATOMY_PATHS)('offers an action that works for every empty combination in %s', (filePath) => {
    const empties = [];
    for (const complexity of [1, 2, 3]) {
      for (const system of ALL_SYSTEMS) {
        for (const view of ['anterior', 'posterior']) {
          const root = render(filePath, { system, view, complexity });
          if (rowCount(root) > 0) continue;
          const action = root.querySelector('[data-anatomy-empty-action]');
          const kind = action && action.getAttribute('data-anatomy-empty-action');
          empties.push(`c${complexity} ${system} ${view}:${kind}`);
          // A level change is only honest when the level is not already at maximum.
          if (kind === 'complexity') expect(complexity, `c${complexity} ${system} ${view}`).toBeLessThan(3);
          // A view change is only honest when the other view has something to show.
          if (kind === 'view') {
            const other = view === 'anterior' ? 'posterior' : 'anterior';
            expect(rowCount(render(filePath, { system, view: other, complexity })), `${system} ${other}`).toBeGreaterThan(0);
          }
          expect(kind, `c${complexity} ${system} ${view}`).not.toBeNull();
        }
      }
    }
    // The known set, so a future data change that adds or removes one is visible here.
    expect(empties).toHaveLength(12);
  }, 120_000);
});
