import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const source = readFileSync(resolve(root, 'view_history_panel_source.jsx'), 'utf8');
const built = readFileSync(resolve(root, 'view_history_panel_module.js'), 'utf8');
const deployed = readFileSync(resolve(root, 'desktop/web-app/public/view_history_panel_module.js'), 'utf8');

describe('HistoryPanel pointer-independent resource controls', () => {
  it('exposes a named list with dedicated pointer and keyboard reorder controls', () => {
    expect(source).toContain("role={filteredHistory.length > 0 ? 'list' : undefined}");
    expect(source).toContain("aria-label={filteredHistory.length > 0 ? (t('sidebar.resource_pack_history') || 'Saved resources') : undefined}");
    expect(source).not.toContain('role="list" aria-label={t(\'sidebar.resource_pack_history\')');
    expect(source).toContain('role="listitem"');
    expect(source).toContain('const unitFilteredHistory = ');
    expect(source).toContain('overflow-y-auto overflow-x-hidden');
    expect(source).toContain('aria-keyshortcuts={canReorderResources');
    expect(source).toContain('!canReorderResources) return;');
    expect(source).toContain("moveItem(e, itemInstanceId, 'up', getHistoryRowInstanceId(filteredHistory[idx - 1]))");
    expect(source).toContain("moveItem(e, itemInstanceId, 'down', getHistoryRowInstanceId(filteredHistory[idx + 1]))");
    expect(source).toContain('draggable={editingId === null && canReorderResources}');
    expect(source).toContain('key={itemInstanceId}');
    expect(source).toContain('handleDragStart(e, itemInstanceId)');
    expect(source).toContain('handleDragEnter(e, itemInstanceId)');
    expect(source).not.toContain('tabIndex={editingId === null ? 0 : -1}');
  });

  it('does not expose the empty-state message as a list without list items', () => {
    expect(source).toContain('{filteredHistory.length === 0 && (');
    expect(source).toContain("role={filteredHistory.length > 0 ? 'list' : undefined}");
    expect(built).toContain('role: filteredHistory.length > 0 ? "list" : void 0');
  });

  it('uses one compact native Open row with an explicit current-resource state', () => {
    expect(source).toContain("const openLabel = t('common.open') || 'Open';");
    expect(source).toContain("const currentLabel = t('launch_pad.current_language') || 'Current';");
    expect(source).toContain("aria-current={isCurrent ? 'page' : undefined}");
    expect(source).toContain('min-h-11 min-w-0 flex-grow rounded-lg');
    expect(source).toContain('{isCurrent ? currentLabel : openLabel}');
    expect(source).toContain('handleRestoreView(item);');
    expect(source).not.toContain("{(t('common.open') || 'Open')}:");
    expect(source).not.toContain('mt-2 min-h-11 w-full');
  });

  it('renders only displayable metadata instead of object coercion noise', () => {
    expect(source).toContain("const rawItemMeta = getSafeArtifactField(item, 'meta');");
    expect(source).toContain("const itemMeta = typeof rawItemMeta === 'string' ? rawItemMeta.trim().slice(0, 500) : '';");
    expect(source).toContain('{itemMeta && <span>');
    expect(built).not.toContain('String(item.meta || "")');
  });

  it('keeps reorder actions accurately named, large enough, and validly nested', () => {
    expect(source).toContain("t('actions.move_up') || 'Move up'");
    expect(source).toContain("t('actions.move_down') || 'Move down'");
    expect(source).toContain('disabled={!canReorderResources || idx === filteredHistory.length - 1}');
    expect(source.match(/min-h-11 min-w-11/g)?.length).toBeGreaterThanOrEqual(3);
    expect(source).not.toContain('<div role="button" tabIndex={0}');
  });

  it('keeps the root and deployed generated modules identical', () => {
    expect(built).toBe(deployed);
  });
});
