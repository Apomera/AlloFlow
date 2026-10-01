import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(resolve(root, path), 'utf8');

const historySource = read('view_history_panel_source.jsx');
const historyBuilt = read('view_history_panel_module.js');
const historyPublic = read('desktop/web-app/public/view_history_panel_module.js');
const tabsSource = read('view_sidebar_tabs_nav_source.jsx');
const tabsBuilt = read('view_sidebar_tabs_nav_module.js');
const tabsPublic = read('desktop/web-app/public/view_sidebar_tabs_nav_module.js');

describe('calm History/Create navigation lane', () => {
  it('keeps the role-aware History title on a neutral surface with quiet status styling', () => {
    expect(historySource).toContain("isTeacherMode ? t('sidebar.resource_pack_history') : t('sidebar.my_resources')");
    expect(historySource).toContain('allo-premium-history bg-white text-slate-900');
    expect(historySource).toContain('text-xs font-medium text-slate-500');
    expect(historySource).not.toContain('allo-premium-history bg-slate-950');
  });

  it('renders title, localized type, and date before secondary resource metadata', () => {
    const titleIndex = historySource.indexOf('{itemTitle}', historySource.indexOf('className="text-sm font-bold'));
    const typeIndex = historySource.indexOf('{itemTypeLabel}', titleIndex);
    const dateIndex = historySource.indexOf('<time dateTime={itemDateTime}>', typeIndex);
    const unitIndex = historySource.indexOf('{itemUnit && (', dateIndex);
    expect(titleIndex).toBeGreaterThan(-1);
    expect(typeIndex).toBeGreaterThan(titleIndex);
    expect(dateIndex).toBeGreaterThan(typeIndex);
    expect(unitIndex).toBeGreaterThan(dateIndex);
    expect(historySource).toContain('border-l-indigo-600 bg-indigo-50/70');
  });

  it('keeps every secondary History capability in explicit, non-hover-only controls', () => {
    const requiredHelpKeys = [
      'history_device_storage',
      'history_load_project',
      'history_save_teacher',
      'history_save_student',
      'history_max_toggle',
      'history_share_pack',
      'history_settings',
      'history_clear_button',
      'history_rename_btn',
      'history_move_to_unit_btn',
      'resource_delete_button',
    ];
    for (const key of requiredHelpKeys) expect(historySource).toContain(`data-help-key="${key}"`);
    expect(historySource).toContain('aria-keyshortcuts={canReorderResources');
    expect(historySource).toContain('handleRestoreView(item);');
    expect(historySource).not.toContain('opacity-0 group-hover:opacity-100');
  });

  it('retains the Create/History tab contract with visible fallback labels and roving focus', () => {
    expect(tabsSource).toContain("translatedLabel('sidebar.create_tab', 'Create')");
    expect(tabsSource).toContain("translatedLabel('sidebar.history_tab', 'History')");
    expect(tabsSource).toContain('role="tablist"');
    expect(tabsSource).toContain('id="tab-create"');
    expect(tabsSource).toContain('id="tab-history"');
    expect(tabsSource).toContain('aria-controls="tour-input-panel"');
    expect(tabsSource).toContain('aria-controls="ui-roster-strip"');
    expect(tabsSource).toContain("tabIndex={activeSidebarTab === 'create' ? 0 : -1}");
    expect(tabsSource).toContain("tabIndex={activeSidebarTab === 'history' ? 0 : -1}");
    expect(tabsSource).toContain("event.key === 'ArrowRight' || event.key === 'End'");
    expect(tabsSource).toContain("event.key === 'ArrowLeft' || event.key === 'Home'");
    expect(tabsSource).not.toContain('pulse-history');
  });

  it('keeps each generated root/public runtime pair identical', () => {
    expect(historyBuilt).toBe(historyPublic);
    expect(tabsBuilt).toBe(tabsPublic);
  });
});
