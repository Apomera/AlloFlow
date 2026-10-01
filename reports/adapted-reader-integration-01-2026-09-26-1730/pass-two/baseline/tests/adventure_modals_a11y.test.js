import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('view_adventure_source.jsx', 'utf8');

describe('Adventure modal accessibility', () => {
  it('uses named dialogs with presentation-only backdrops', () => {
    expect(source.match(/role="presentation" className="fixed inset-0 z-\[200\]/g)).toHaveLength(2);
    expect(source).not.toContain('<div role="button" tabIndex={0}');
    expect(source).toContain('aria-labelledby="adventure-ledger-title"');
    expect(source).toContain('id="adventure-ledger-title"');
    expect(source).toContain('aria-labelledby="adventure-inventory-item-title"');
    expect(source).toContain('id="adventure-inventory-item-title"');
  });

  it('manages initial focus, Tab containment, Escape, and focus return', () => {
    expect(source).toContain('(getFocusable()[0] || dialog).focus()');
    expect(source).toContain("if (event.key === 'Escape')");
    expect(source).toContain("if (event.key !== 'Tab') return");
    expect(source).toContain("if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus()");
    expect(source).toContain('useAdventureDialogFocus(showLedger');
    expect(source).toContain('useAdventureDialogFocus(!!selectedInventoryItem');
  });

  it('does not reset focus when parent close-handler identities change', () => {
    expect(source).toContain('var closeHandlerRef = React.useRef(onClose)');
    expect(source).toContain('closeHandlerRef.current = onClose');
    expect(source).toContain('}, [isOpen, dialogRef]);');
  });

  it('synchronizes the deployable module', () => {
    expect(fs.readFileSync('desktop/web-app/public/view_adventure_module.js', 'utf8')).toBe(fs.readFileSync('view_adventure_module.js', 'utf8'));
  });
});
