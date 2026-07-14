import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('view_global_level_up_source.jsx', 'utf8');

describe('Global level-up modal accessibility', () => {
  it('uses a named and described modal without simulated buttons', () => {
    expect(source).toContain('role="presentation"');
    expect(source).toContain('role="dialog"');
    expect(source).toContain('aria-modal="true"');
    expect(source).toContain('aria-labelledby="global-level-up-title"');
    expect(source).toContain('aria-describedby="global-level-up-description"');
    expect(source).not.toContain('role="button"');
  });

  it('contains focus, closes with Escape, and restores the launcher', () => {
    expect(source).toContain("if (event.key === 'Escape')");
    expect(source).toContain("if (event.key !== 'Tab') return;");
    expect(source).toContain("dialog.addEventListener('keydown', handleKeyDown)");
    expect(source).toContain("dialog.removeEventListener('keydown', handleKeyDown)");
    expect(source).toContain("if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();");
    expect(source).toContain('(continueButtonRef.current || dialog).focus();');
  });

  it('bounds and exposes milestone progress accurately', () => {
    expect(source).toContain('const xpMax = Math.max(1, Number(adventureState.xpToNextLevel) || 1);');
    expect(source).toContain('const xpValue = Math.max(0, Math.min(xpMax, Number(adventureState.xp) || 0));');
    expect(source).toContain('const xpPercent = Math.max(0, Math.min(100, Math.round((xpValue / xpMax) * 100)));');
    expect(source).toContain('role="progressbar"');
    expect(source).toContain('aria-valuemax={xpMax}');
    expect(source).toContain('aria-valuenow={xpValue}');
    expect(source).toContain('style={{ width: `${xpPercent}%` }}');
    expect(source).not.toContain('Math.max(5,');
  });

  it('provides a correctly named robust action and reduced-motion reflow', () => {
    expect(source).toContain("aria-label={t('feedback.continue_learning')}");
    expect(source).not.toContain("aria-label={t('common.close')}");
    expect(source).toContain('min-h-11 w-full');
    expect(source).toContain('max-h-[calc(100vh-1rem)]');
    expect(source).toContain('motion-reduce:hidden');
    expect(source).toContain('motion-reduce:animate-none');
    expect(source).toContain('motion-reduce:transition-none');
    expect(source).toContain('<div aria-hidden="true" className="motion-reduce:hidden"><ConfettiExplosion /></div>');
  });

  it('keeps generated global level-up modules synchronized', () => {
    const rootModule = fs.readFileSync('view_global_level_up_module.js', 'utf8');
    expect(fs.readFileSync('prismflow-deploy/public/view_global_level_up_module.js', 'utf8')).toBe(rootModule);
    expect(rootModule).toContain('role: "dialog"');
    expect(rootModule).toContain('role: "progressbar"');
    expect(rootModule).toContain('"aria-label": t("feedback.continue_learning")');
    expect(rootModule).not.toContain('role: "button"');
  });
});