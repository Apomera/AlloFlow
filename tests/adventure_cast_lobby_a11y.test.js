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
describe('adventure shop accessibility', () => {
  it('uses a named trapped dialog without a fake inner button', () => {
    expect(source).toContain('useFocusTrap(shopRef, true, onClose)');
    expect(source).not.toContain('<div role="button" tabIndex={0} className="bg-slate-900 border-4 border-indigo-500');
    expect(source).toContain('role="dialog"');
    expect(source).toContain('aria-modal="true"');
    expect(source).toContain('aria-label={t(\'adventure.shop\')}');
  });

  it('provides visible focus, larger targets, sufficient text contrast, and decorative icon hiding', () => {
    expect(source).toContain('min-w-11 min-h-11 bg-indigo-800');
    expect(source).toContain('min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-300');
    expect(source.match(/text-\[11px\] text-slate-200 font-bold uppercase tracking-wider/g)).toHaveLength(2);
    expect(source).toContain('text-xs text-slate-300 italic text-right ml-auto');
    expect(source).toContain('<ShoppingBag size={24} aria-hidden="true" />');
  });

  it('keeps authoritative and deploy copies synchronized', () => {
    const rootModule = fs.readFileSync('adventure_module.js', 'utf8');
    expect(fs.readFileSync('prismflow-deploy/src/adventure_source.jsx', 'utf8')).toBe(source);
    expect(fs.readFileSync('prismflow-deploy/public/adventure_module.js', 'utf8')).toBe(rootModule);
    expect(rootModule).toContain('useFocusTrap(shopRef, true, onClose)');
    expect(rootModule).not.toContain('role: "button", tabIndex: 0, className: "bg-slate-900 border-4 border-indigo-500');
  });
});
describe('adventure dice overlay accessibility', () => {
  it('uses a named modal and announces only the actual roll result', () => {
    expect(source).toContain('ref={diceRef}');
    expect(source).toContain('aria-labelledby="adventure-dice-result"');
    expect(source).toContain('role="status" aria-live="assertive"');
    expect(source).toContain("t('adventure.dice_roll_result', { result })");
    expect(source).toContain('className="dice-container" aria-hidden="true"');
    expect(source).not.toContain('<div role="button" tabIndex={0} className="dice-container"');
  });

  it('contains focus, supports Escape and skip, and shortens motion for reduced-motion users', () => {
    expect(source).toContain('useFocusTrap(diceRef, true, onComplete)');
    expect(source).toContain('data-alloflow-close-on-escape="true"');
    expect(source).toContain('min-w-11 min-h-11');
    expect(source).toContain("window.matchMedia('(prefers-reduced-motion: reduce)').matches");
    expect(source).toContain('reduceMotion ? 1000 : 3500');
  });

  it('ships the result label and synchronized source/module copies', () => {
    const strings = fs.readFileSync('ui_strings.js', 'utf8');
    const rootModule = fs.readFileSync('adventure_module.js', 'utf8');
    expect(strings).toContain('"dice_roll_result": "Dice roll result: {result}"');
    expect(fs.readFileSync('prismflow-deploy/public/ui_strings.js', 'utf8')).toBe(strings);
    expect(fs.readFileSync('prismflow-deploy/src/adventure_source.jsx', 'utf8')).toBe(source);
    expect(fs.readFileSync('prismflow-deploy/public/adventure_module.js', 'utf8')).toBe(rootModule);
    expect(rootModule).toContain('useFocusTrap(diceRef, true, onComplete)');
  });
});
