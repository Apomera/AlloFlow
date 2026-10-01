import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('adventure_source.jsx', 'utf8');

describe('adventure persistent HUD accessibility', () => {
  it('exposes an accurate, bounded, named climax progressbar', () => {
    expect(source).toContain('const normalizedScore = Math.max(0, Math.min(100, Number(masteryScore) || 0))');
    expect(source).toContain('role="progressbar"');
    expect(source).toContain('aria-label={label}');
    expect(source).toContain('aria-valuemin={0}');
    expect(source).toContain('aria-valuemax={100}');
    expect(source).toContain('aria-valuenow={Math.round(normalizedScore)}');
    expect(source).toContain("style={{ width: normalizedScore + '%' }}");
    expect(source).not.toContain('Math.max(5, Math.min(100, masteryScore))');
  });

  it('uses native, named inventory controls with separated 44 pixel targets', () => {
    expect(source).toContain('<ul className="flex flex-wrap gap-2">');
    expect(source).toContain('<li key={item.id || idx}');
    expect(source).toContain('type="button"');
    expect(source).toContain('className="w-11 h-11');
    expect(source).toContain('aria-label={item.name}');
    expect(source).toContain("aria-describedby={item.effectType && item.description ? 'inventory-item-description-' + idx : undefined}");
    expect(source).toContain('aria-busy={item.isLoading || undefined}');
    expect(source).not.toContain('data-help-key="inventory_item" onClick');
    expect(source).not.toContain('flex -space-x-2');
  });

  it('makes inventory details focus-visible, hoverable, and Escape dismissible', () => {
    expect(source).toContain('group-hover:flex group-focus-within:flex');
    expect(source).toContain('role="tooltip"');
    expect(source).toContain("if (event.key === 'Escape')");
    expect(source).toContain('event.stopPropagation()');
    expect(source).toContain('setDismissedTooltip(idx)');
    expect(source).toContain('onMouseEnter={() => setDismissedTooltip(null)}');
    expect(source).toContain('onFocus={() => setDismissedTooltip(null)}');
  });

  it('provides visible focus, sufficient component contrast, and reduced-motion alternatives', () => {
    expect(source).toContain('focus-visible:ring-2 focus-visible:ring-yellow-300');
    expect(source).toContain('border-2 border-indigo-300');
    expect(source).toContain('motion-reduce:animate-none');
    expect(source).toContain('motion-reduce:transition-none');
    expect(source).toContain('<Backpack size={18} className="text-yellow-300 shrink-0" aria-hidden="true" />');
    expect(source).toContain('alt=""');
  });

  it('rerenders accessible item data and keeps source/module mirrors synchronized', () => {
    expect(source).toContain('if (prev.name !== next.name) return false');
    expect(source).toContain('if (prev.description !== next.description) return false');
    const rootModule = fs.readFileSync('adventure_module.js', 'utf8');
    expect(fs.readFileSync('desktop/web-app/src/adventure_source.jsx', 'utf8')).toBe(source);
    expect(fs.readFileSync('desktop/web-app/public/adventure_module.js', 'utf8')).toBe(rootModule);
    expect(rootModule).toContain('role: "progressbar"');
    expect(rootModule).toContain('setDismissedTooltip(idx)');
  });
});