import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('view_export_preview_source.jsx', 'utf8');
const built = fs.readFileSync('view_export_preview_module.js', 'utf8');
const deployed = fs.readFileSync('desktop/web-app/public/view_export_preview_module.js', 'utf8');

describe('Document Builder WCAG 2.2 interaction safeguards', () => {
  it('uses the shared accessible confirmation flow for edit-destructive rerenders', () => {
    expect(source).toContain('async function updateExportPreview(deps)');
    expect(source).toContain('window.AlloFlowUX && window.AlloFlowUX.confirm');
    expect(source).toContain("confirmText: t('export_preview.rerender_confirm_action')");
    expect(source).toContain("cancelText: t('export_preview.rerender_cancel_action')");
    expect(source).toContain("tone: 'danger'");
    expect(source).not.toContain('window.confirm(');
  });

  it('requires the hardened dialog module and coalesces rapid refresh requests', () => {
    expect(source).toContain('window.AlloModules.ConfirmDialog.ConfirmDialog');
    expect(source).toContain("typeof _dialogModule !== 'function'");
    expect(source).toContain('iframe.__alloPreviewConfirmation');
    expect(source).toContain('iframe.__alloPreviewRefreshRequest !== _refreshRequest');
  });

  it('keeps focus visible and restores focus after clipboard fallback use', () => {
    expect(source.match(/focus-visible:outline-4 focus-visible:outline-indigo-700/g)?.length).toBeGreaterThanOrEqual(2);
    expect(source).toContain("ta.setAttribute('aria-label', 'Temporary clipboard helper')");
    expect(source).toContain('ta.readOnly = true');
    expect(source).toContain('ta.tabIndex = -1');
    expect(source).toContain('if (trigger && trigger.isConnected) trigger.focus()');
  });

  it('honors reduced motion and excludes the internal crop canvas', () => {
    expect(source.match(/motion-reduce:animate-none/g)?.length).toBeGreaterThanOrEqual(3);
    expect(source).toContain("c.setAttribute('aria-hidden', 'true'); // internal crop buffer");
  });

  it('ships the same implementation in both runtime artifacts', () => {
    expect(built).toBe(deployed);
    expect(built).toContain('__alloPreviewConfirmation');
    expect(built).not.toContain('window.confirm(');
  });
});