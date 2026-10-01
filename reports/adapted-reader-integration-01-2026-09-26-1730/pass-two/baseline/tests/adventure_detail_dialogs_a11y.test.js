import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('view_adventure_source.jsx', 'utf8');

describe('Adventure ledger and inventory-detail dialog accessibility', () => {
  it('uses the shared contained-focus lifecycle for both dialogs', () => {
    expect(source).toContain("if (event.key === 'Escape') { event.preventDefault(); closeHandlerRef.current(); return; }");
    expect(source).toContain("if (event.key !== 'Tab') return;");
    expect(source).toContain("if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();");
    expect(source).toContain('useAdventureDialogFocus(showLedger, ledgerDialogRef, handleSetShowLedgerToFalse);');
    expect(source).toContain('useAdventureDialogFocus(!!selectedInventoryItem, inventoryDialogRef, handleSetSelectedInventoryItemToNull);');
  });

  it('provides named, described, reflow-safe modal surfaces', () => {
    expect(source).toContain('aria-labelledby="adventure-ledger-title" aria-describedby="adventure-ledger-subtitle"');
    expect(source).toContain('aria-labelledby="adventure-inventory-item-title" aria-describedby="adventure-inventory-item-description"');
    expect(source.match(/max-h-\[calc\(100vh-1rem\)\] overflow-y-auto/g)).toHaveLength(2);
    expect(source.match(/p-2 sm:p-4 animate-in fade-in duration-200 motion-reduce:animate-none/g)).toHaveLength(2);
    expect(source).toContain('id="adventure-ledger-subtitle"');
    expect(source).toContain('id="adventure-inventory-item-description"');
  });

  it('makes Close and primary actions robust and accurately named', () => {
    expect(source.match(/min-w-11 min-h-11 text-slate-700/g)).toHaveLength(2);
    expect(source).toContain("aria-label={t('adventure.storybook')}");
    expect(source).not.toContain("aria-label={t('common.refresh')}\n                                        onClick={() => {");
    expect(source).not.toContain("aria-label={t('common.locked')}");
    expect(source).not.toContain("aria-label={t('common.use_item')}");
    expect(source).toContain('min-h-11 flex-1 bg-indigo-600');
    expect(source).toContain('focus-visible:ring-2 focus-visible:ring-indigo-700');
  });

  it('supports keyboard ledger scrolling and suppresses duplicate decoration', () => {
    expect(source).toContain('role="region" aria-label={t(\'adventure.ledger_title\')} tabIndex={0}');
    expect(source).toContain('src={selectedInventoryItem.image} alt=""');
    expect(source).toContain('<BookOpen size={24} aria-hidden="true" />');
    expect(source).toContain('<Lock size={16} aria-hidden="true"/>');
    expect(source).toContain('<Sparkles size={16} aria-hidden="true"/>');
    expect(source).toContain('motion-reduce:transform-none');
  });

  it('keeps generated Adventure modules synchronized', () => {
    const rootModule = fs.readFileSync('view_adventure_module.js', 'utf8');
    expect(fs.readFileSync('desktop/web-app/public/view_adventure_module.js', 'utf8')).toBe(rootModule);
    expect(rootModule).toContain('"aria-describedby": "adventure-ledger-subtitle"');
    expect(rootModule).toContain('"aria-describedby": "adventure-inventory-item-description"');
    expect(rootModule).toContain('tabIndex: 0');
  });
});