import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('quickstart_source.jsx', 'utf8');
const moduleText = fs.readFileSync('quickstart_module.js', 'utf8');

describe('Quick Start wizard accessibility', () => {
  it('contains focus, handles Escape, and restores the invoking control', () => {
    expect(source).toContain('const useQuickStartDialogFocus');
    expect(source).toContain('useQuickStartDialogFocus(wizardRef, isOpen, handleClose)');
    expect(source).not.toContain('useFocusTrap(wizardRef, isOpen, handleClose)');
    expect(source).toContain("element.getAttribute('aria-hidden') !== 'true'");
    expect(source).toContain("!element.closest('[inert]')");
    expect(source).toContain('element.getClientRects().length > 0');
    expect(source).toContain('document.activeElement === dialog');
    expect(source).toContain('previouslyFocused?.isConnected');
    expect(source).toContain('tabIndex={-1}');
    expect(source).toContain('onClick={handleClose}');
  });

  it('announces steps and exposes programmatic progress', () => {
    expect(source).toContain('aria-describedby="quickstart-step-status"');
    expect(source).toContain('role="status" aria-live="polite" aria-atomic="true"');
    expect(source).toContain('role="progressbar"');
    expect(source).toContain('aria-valuemin={1} aria-valuemax={4} aria-valuenow={step}');
    expect(source).toContain('aria-valuetext={`Step ${step} of 4`}');
  });

  it('uses accurate Back and Finish names and 24px small-action targets', () => {
    expect(source).not.toContain("aria-label={t('common.check')}");
    expect(source).toContain("aria-label={t('common.finish')}");
    expect(source.match(/min-w-6 min-h-6 inline-flex items-center justify-center/g)).toHaveLength(3);
    expect(source).toContain('inline-flex min-h-6 items-center px-1');
  });

  it('uses native buttons and exposes retained selection state', () => {
    expect(source).toContain('role="group" aria-labelledby="quickstart-grade-label"');
    expect(source).toContain('aria-pressed={localData.grade === g.value}');
    expect(source).toContain('role="group" aria-labelledby="quickstart-standards-selection-label"');
    expect(source).toContain('data-help-key="wizard_standard_select"');
    expect(source).toContain('aria-pressed={isSelected}');
    expect(source).toContain('role="group" aria-labelledby="quickstart-standard-mode-label"');
    expect(source).toContain("aria-pressed={standardMode === 'ai'}");
    expect(source).toContain("aria-pressed={standardMode === 'manual'}");
  });

  it('uses accurate action and item-specific accessible names', () => {
    expect(source).toContain("aria-label={t('wizard.fetch_action')}");
    expect(source).toContain("aria-label={opt.title || t('wizard.untitled_resource')}");
    expect(source).toContain("aria-label={t('wizard.back_to_results')}");
    expect(source).toContain("aria-label={wt('wizard.back_to_books', 'Choose another resource')}");
    expect(source).toContain("aria-label={`${t('common.remove')} ${lang}`}");
    expect(source).toContain("aria-label={`${t('common.remove')} ${interest}`}");
    expect(source).toContain('htmlFor="quickstart-output-format"');
  });

  it('retains native focus and honors reduced-motion preferences', () => {
    expect(source).not.toMatch(/(?:focus(?:-visible)?:)?outline-none/);
    expect(source).not.toMatch(/<button\b(?![^>]*\btype=)/gs);
    const lines = source.split(/\r?\n/);
    expect(lines.filter((line) => line.includes('animate-') && !line.includes('motion-reduce:animate-none'))).toEqual([]);
    expect(lines.filter((line) => /transition-(?:all|colors|shadow|transform)/.test(line) && !line.includes('motion-reduce:transition-none'))).toEqual([]);
    expect(source.match(/motion-reduce:hover:scale-100/g)).toHaveLength(9);
    expect(source.match(/motion-reduce:active:scale-100/g)).toHaveLength(11);
  });
  it('preserves runtime dependencies and lazy URL resolution', () => {
    expect(moduleText).toContain('var useFocusTrap = _hooks.useFocusTrap');
    expect(moduleText).toContain('useQuickStartDialogFocus');
    expect(moduleText).toContain('window.AlloModules && window.AlloModules.UtilsPure');
    expect(moduleText).toContain('window.AlloModules.QuickStartWizard = QuickStartWizard');
  });

  it('synchronizes the deployable module', () => {
    expect(fs.readFileSync('desktop/web-app/public/quickstart_module.js', 'utf8')).toBe(moduleText);
  });
});
