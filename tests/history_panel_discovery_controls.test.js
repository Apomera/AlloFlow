import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const source = readFileSync(resolve(root, 'view_history_panel_source.jsx'), 'utf8');
const built = readFileSync(resolve(root, 'view_history_panel_module.js'), 'utf8');
const deployed = readFileSync(resolve(root, 'prismflow-deploy/public/view_history_panel_module.js'), 'utf8');

describe('HistoryPanel resource discovery controls', () => {
  it('searches titles, metadata, and resource types within the selected unit', () => {
    expect(source).toContain("const [resourceSearch, setResourceSearch] = React.useState('');");
    expect(source).toContain("const [resourceTypeFilter, setResourceTypeFilter] = React.useState('all');");
    expect(source).toContain('unitFilteredHistory.filter(item => {');
    expect(source).toContain('[itemTitle, itemMeta, item.type, getResourceTypeLabel(item.type)]');
    expect(source).toContain('aria-label="Search resources by title or type"');
    expect(source).toContain('aria-label="Filter resources by type"');
    expect(source).toContain('<option value="all">All types</option>');
  });

  it('shows visible and total counts with a recoverable empty state', () => {
    expect(source).toContain("filteredHistory.length + ' of ' + unitFilteredHistory.length");
    expect(source).toContain('No resources match your search and type filters.');
    expect(source).toContain('onClick={clearResourceFilters}');
    expect(source).toContain('Showing {filteredHistory.length} of {unitFilteredHistory.length}.');
  });

  it('consolidates secondary commands into an accessible labelled menu', () => {
    expect(source).toContain('aria-label="More resource pack actions"');
    expect(source).toContain('aria-expanded={isMoreActionsOpen}');
    expect(source).toContain('aria-controls="history-more-actions-menu"');
    expect(source).toContain('id="history-more-actions-menu"');
    expect(source).toContain('role="menu"');
    expect(source.match(/role="menuitem"/g)?.length).toBeGreaterThanOrEqual(3);
    expect(source).toContain("if (e.key === 'Escape')");
  });

  it('prevents ambiguous reordering while discovery filters are active', () => {
    expect(source).toContain('const canReorderResources = !isSyncMode && !isResourceFilterActive;');
    expect(source).toContain('draggable={editingId === null && canReorderResources}');
    expect(source).toContain('if (!e.altKey || !canReorderResources) return;');
    expect(source).toContain('disabled={!canReorderResources || idx === 0}');
    expect(source).toContain('disabled={!canReorderResources || idx === filteredHistory.length - 1}');
    expect(source).toContain('Clear filters to reorder resources.');
  });

  it('keeps generated and deployed runtimes synchronized', () => {
    expect(built).toBe(deployed);
  });
});
