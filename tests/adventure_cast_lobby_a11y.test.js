import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('adventure_source.jsx', 'utf8');

describe('adventure cast lobby accessibility', () => {
  it('uses semantic controls for all inline-edit fields', () => {
    expect(source).not.toMatch(/<(h3|p) onClick=\{\(\) => startFieldEdit/);
    expect(source.match(/<button type="button" onClick=\{\(\) => startFieldEdit/g)?.length).toBe(3);
    expect(source).toContain('<h3><button type="button" onClick={() => startFieldEdit(i, \'name\')');
  });

  it('provides a visible-on-focus, named 24 pixel remove control', () => {
    expect(source).toContain('w-6 h-6 rounded-full bg-red-100');
    expect(source).toContain('group-focus-within/card:opacity-100 focus:opacity-100');
    expect(source).toContain("aria-label={(t('adventure.remove_character') || 'Remove character')");
  });

  it('synchronizes the semantic controls to both deployed module copies', () => {
    const rootModule = fs.readFileSync('adventure_module.js', 'utf8');
    const publicModule = fs.readFileSync('prismflow-deploy/public/adventure_module.js', 'utf8');
    expect(rootModule).toContain('Edit character appearance');
    expect(publicModule).toBe(rootModule);
  });
});
