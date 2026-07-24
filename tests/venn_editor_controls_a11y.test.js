import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('view_renderers_source.jsx', 'utf8');

describe('Venn editor control semantics', () => {
  it('does not expose editable text fields as modal dialogs or nest them in a simulated button', () => {
    expect(source).not.toContain('role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}');
    expect(source).not.toContain('<div role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ")');
    expect(source).toContain('className="flex flex-col gap-1 min-w-[120px]"');
  });

  it('uses native, item-specific Add and Remove controls for all three regions', () => {
    expect(source.match(/type="button" onClick=\{\(\) => handleAddVennItem/g)?.length).toBe(3);
    expect(source.match(/type="button" onClick=\{\(\) => handleRemoveVennItem/g)?.length).toBe(3);
    expect(source).toContain("aria-label={`${t('common.add')}: ${setA.title}`}");
    expect(source).toContain("aria-label={`${t('common.add')}: ${shared.title || 'Shared'}`}");
    expect(source).toContain("aria-label={`${t('common.add')}: ${setB.title}`}");
    expect(source).toContain("aria-label={`${t('common.remove')}: ${typeof item === 'object' ? item.text : item}`}");
  });

  it('provides 44px targets and strong focus indicators for all six actions', () => {
    expect(source.match(/min-h-11 min-w-11/g)?.length).toBeGreaterThanOrEqual(6);
    expect(source.match(/focus-visible:ring-2/g)?.length).toBeGreaterThanOrEqual(6);
  });

  it('keeps generated renderer modules synchronized', () => {
    expect(readFileSync('desktop/web-app/public/view_renderers_module.js', 'utf8'))
      .toBe(readFileSync('view_renderers_module.js', 'utf8'));
  });
});
