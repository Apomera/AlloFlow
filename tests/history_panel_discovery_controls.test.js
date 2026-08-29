import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const source = readFileSync(resolve(root, 'view_history_panel_source.jsx'), 'utf8');
const built = readFileSync(resolve(root, 'view_history_panel_module.js'), 'utf8');
const deployed = readFileSync(resolve(root, 'desktop/web-app/public/view_history_panel_module.js'), 'utf8');
const uiStrings = readFileSync(resolve(root, 'ui_strings.js'), 'utf8');
const desktopUiStrings = readFileSync(resolve(root, 'desktop/web-app/public/ui_strings.js'), 'utf8');

describe('HistoryPanel resource discovery controls', () => {
  it('searches localized titles, metadata, and resource types within the selected unit', () => {
    expect(source).toContain("const [resourceSearch, setResourceSearch] = React.useState('');");
    expect(source).toContain("const [resourceTypeFilter, setResourceTypeFilter] = React.useState('all');");
    expect(source).toContain("let localizedTitle = '';");
    expect(source).toContain('try { localizedTitle = getDefaultTitle(type); } catch (_) {}');
    expect(source).toContain('unitFilteredHistory.filter(item => {');
    expect(source).toContain('[itemTitle, itemMeta, itemType, getResourceTypeLabel(itemType)]');
    expect(source).toContain("placeholder={t('history.search_resources_placeholder')}");
    expect(source).toContain("aria-label={t('history.search_resources_aria')}");
    expect(source).toContain("aria-label={t('history.filter_by_type_aria')}");
    expect(source).toContain("<option value=\"all\">{t('history.all_types')}</option>");
  });

  it('resets discovery state whenever the selected unit changes', () => {
    expect(source).toContain('React.useEffect(() => {');
    expect(source).toContain('clearResourceFilters();');
    expect(source).toContain('setIsMoreActionsOpen(false);');
    expect(source).toContain('}, [activeUnitId]);');
  });

  it('shows localized visible counts, statuses, and recoverable empty states', () => {
    expect(source).toContain("t('history.resource_count_filtered'");
    expect(source).toContain("t('history.resource_count'");
    expect(source).toContain("t('history.filtered_status'");
    expect(source).toContain("t('history.no_filter_matches')");
    expect(source).toContain("t('history.clear_filters')");
    expect(source).toContain('onClick={clearResourceFilters}');
  });

  it('provides complete keyboard and focus behavior for the localized action menu', () => {
    expect(source).toContain('const moreActionsButtonRef = React.useRef(null);');
    expect(source).toContain('const moreActionsMenuRef = React.useRef(null);');
    expect(source).toContain("aria-label={t('history.more_actions_aria')}");
    expect(source).toContain('aria-haspopup="menu"');
    expect(source).toContain('aria-expanded={isMoreActionsOpen}');
    expect(source).toContain('ref={moreActionsMenuRef}');
    expect(source).toContain('onKeyDown={handleMoreActionsMenuKeyDown}');
    expect(source).toContain("if (e.key === 'ArrowDown')");
    expect(source).toContain("else if (e.key === 'ArrowUp')");
    expect(source).toContain("else if (e.key === 'Home')");
    expect(source).toContain("else if (e.key === 'End')");
    expect(source).toContain("else if (e.key === 'Escape')");
    expect(source).toContain('closeMoreActions(true);');
    expect(source.match(/role="menuitem"/g)?.length).toBeGreaterThanOrEqual(3);
  });

  it('prevents ambiguous reordering while discovery filters are active', () => {
    expect(source).toContain('const canReorderResources = !isSyncMode && !isResourceFilterActive;');
    expect(source).toContain('draggable={editingId === null && canReorderResources}');
    expect(source).toContain('if (!e.altKey || !canReorderResources) return;');
    expect(source).toContain('disabled={!canReorderResources || idx === 0}');
    expect(source).toContain('disabled={!canReorderResources || idx === filteredHistory.length - 1}');
    expect(source).toContain("t('history.clear_filters_to_reorder')");
  });

  it('defines every new canonical translation key in both active dictionaries', () => {
    const keys = [
      'resource_count', 'resource_count_filtered', 'find_resources_aria',
      'search_resources_placeholder', 'search_resources_aria',
      'clear_resource_search_aria', 'filter_by_type_aria', 'all_types',
      'clear_filters', 'filtered_status', 'no_filter_matches',
      'clear_filters_to_reorder', 'more_actions', 'more_actions_aria',
      'close_more_actions_aria', 'share_resource_pack'
    ];
    for (const key of keys) {
      expect(uiStrings).toContain('"' + key + '":');
      expect(desktopUiStrings).toContain('"' + key + '":');
    }
  });

  it('keeps generated and deployed runtimes synchronized', () => {
    expect(built).toBe(deployed);
  });
});
