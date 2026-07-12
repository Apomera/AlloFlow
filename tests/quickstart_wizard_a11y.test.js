import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('quickstart_source.jsx', 'utf8');
const moduleText = fs.readFileSync('quickstart_module.js', 'utf8');

describe('Quick Start wizard accessibility', () => {
  it('connects Escape dismissal to the existing focus trap', () => {
    expect(source).toContain('const handleClose = useCallback');
    expect(source).toContain('useFocusTrap(wizardRef, isOpen, handleClose)');
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

  it('preserves runtime dependencies and lazy URL resolution', () => {
    expect(moduleText).toContain('var useFocusTrap = _hooks.useFocusTrap');
    expect(moduleText).toContain('window.AlloModules && window.AlloModules.UtilsPure');
    expect(moduleText).toContain('window.AlloModules.QuickStartWizard = QuickStartWizard');
  });

  it('synchronizes the deployable module', () => {
    expect(fs.readFileSync('prismflow-deploy/public/quickstart_module.js', 'utf8')).toBe(moduleText);
  });
});
