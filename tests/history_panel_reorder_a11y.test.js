import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const source = readFileSync(resolve(root, 'view_history_panel_source.jsx'), 'utf8');
const built = readFileSync(resolve(root, 'view_history_panel_module.js'), 'utf8');
const deployed = readFileSync(resolve(root, 'prismflow-deploy/public/view_history_panel_module.js'), 'utf8');

describe('HistoryPanel pointer-independent resource controls', () => {
  it('exposes the saved resources as a named list with keyboard-reorderable items', () => {
    expect(source).toContain('role="list" aria-label={t(\'sidebar.resource_pack_history\')');
    expect(source).toContain('role="listitem"');
    expect(source).toContain('aria-keyshortcuts="Alt+ArrowUp Alt+ArrowDown"');
    expect(source).toContain("if (e.target !== e.currentTarget || !e.altKey || isSyncMode) return;");
    expect(source).toContain("moveItem(e, idx, 'up')");
    expect(source).toContain("moveItem(e, idx, 'down')");
    expect(source).toContain('draggable={editingId === null && !isSyncMode}');
  });

  it('uses a native, focus-visible Open action instead of a mouse-only card action', () => {
    expect(source).toContain("{(t('common.open') || 'Open')}:");
    expect(source).toContain('handleRestoreView(item);');
    expect(source).toContain('min-h-11 w-full');
    expect(source).toContain('focus-visible:ring-2');
    expect(source).toContain('aria-disabled={isSyncMode}');
    expect(source).not.toContain('onClick={() => {\n                                if (isSyncMode)');
  });

  it('keeps reorder actions accurately named, large enough, and validly nested', () => {
    expect(source).toContain("t('actions.move_up') || 'Move up'");
    expect(source).toContain("t('actions.move_down') || 'Move down'");
    expect(source).toContain('disabled={idx === getFilteredHistory().length - 1}');
    expect(source.match(/min-h-11 min-w-11/g)?.length).toBeGreaterThanOrEqual(2);
    expect(source).not.toContain('<div role="button" tabIndex={0}');
  });

  it('keeps the root and deployed generated modules identical', () => {
    expect(built).toBe(deployed);
  });
});
