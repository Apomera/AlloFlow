import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();

function read(name) {
  return readFileSync(resolve(root, name), 'utf8');
}

describe('hub filtered section behavior', () => {
  it('reveals matches from collapsed sections without changing saved collapse state', () => {
    for (const name of ['view_educator_hub_modal_source.jsx', 'view_learning_hub_modal_source.jsx']) {
      const source = read(name);
      expect(source).toContain('const sectionCollapsed = hubCollapsedSections.includes(shell.dataset.hubSection);');
      expect(source).toContain('(!sectionCollapsed || query || hubFavoritesOnly)');
      expect(source).toContain('const effectiveCollapsed = collapsed && !filtered;');
    }
  });
});
