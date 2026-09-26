import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

function read(name) {
  return readFileSync(resolve(root, name), 'utf8');
}

describe('hub personalization and workflow controls', () => {
  it('searches rendered tool purpose text and remembers collapsed sections', () => {
    const educator = read('view_educator_hub_modal_source.jsx');
    const learning = read('view_learning_hub_modal_source.jsx');
    expect(educator).toContain("const text = (shell.textContent || '').toLowerCase();");
    expect(learning).toContain("const text = (shell.textContent || '').toLowerCase();");
    expect((educator.match(/data-hub-section-toggle=/g) || []).length).toBe(5);
    expect((learning.match(/data-hub-section-toggle=/g) || []).length).toBe(4);
    expect(educator).toContain('alloflow_hub_educator_collapsed');
    expect(learning).toContain('alloflow_hub_learning_collapsed');
  });

  it('combines role defaults with local usage counts for recommendations', () => {
    const educator = read('view_educator_hub_modal_source.jsx');
    const learning = read('view_learning_hub_modal_source.jsx');
    expect(educator).toContain('hubRoleRecommendations');
    expect(learning).toContain('hubRoleRecommendations');
    expect(educator).toContain('alloflow_hub_educator_usage');
    expect(learning).toContain('alloflow_hub_learning_usage');
    expect(educator).toContain('recommendedCards');
    expect(learning).toContain('recommendedCards');
  });

  it('adds canonical English strings for the new hub controls', () => {
    const strings = read('ui_strings.js');
    expect(strings).toContain('"recommended_hint": "Picked for your role and what you have used on this device"');
    expect(strings).toContain('"collapse_section": "Collapse section"');
    expect(strings).toContain('"section_start_title": "Start here"');
    expect(strings).toContain('"section_core_title": "Core learning"');
  });
  it('folds all but the first section on a first visit, and remembers any change', () => {
    const learning = read('view_learning_hub_modal_source.jsx');
    const educator = read('view_educator_hub_modal_source.jsx');
    expect(learning).toContain("if (saved === null) return ['practice', 'explore', 'create'];");
    // A specialist's first visit keeps 'teach' (BehaviorLens, Report Writer) open.
    expect(educator).toContain("if (saved === null) return String(userRole || '').toLowerCase().includes('clin') ? ['plan', 'access', 'extend'] : ['plan', 'teach', 'access', 'extend'];");
    // search and favorites still reach folded tools
    expect(learning).toContain('(!sectionCollapsed || query || hubFavoritesOnly)');
  });
});
