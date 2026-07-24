import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('view_session_modal_source.jsx', 'utf8');

describe('Live session modal accessibility', () => {
  it('provides a named modal dialog and non-interactive backdrop', () => {
    expect(source).toContain('role="presentation" onClick={handleSetShowSessionModalToFalse}');
    expect(source).toContain('ref={dialogRef} tabIndex={-1}');
    expect(source).toContain('role="dialog" aria-modal="true" aria-labelledby="alloflow-session-modal-title" aria-describedby="alloflow-session-modal-description"');
    expect(source).toContain('id="alloflow-session-modal-title"');
    expect(source).toContain('id="alloflow-session-modal-description"');
  });

  it('manages initial focus, containment, Escape, and focus return', () => {
    expect(source).toContain('(first || dialog).focus()');
    expect(source).toContain('window.__alloFocusTrapStack');
    expect(source).toContain('if (!isTopTrap()) return');
    expect(source).toContain("document.addEventListener('keydown', onKeyDown)");
    expect(source).toContain("element.closest('[hidden], [inert], [aria-hidden=\"true\"]')");
    expect(source).toContain("if (event.key === 'Escape')");
    expect(source).toContain("if (event.key !== 'Tab') return");
    expect(source).toContain('previousFocus.isConnected');
  });

  it('offers verified teacher test and print actions for a ready live QR', () => {
    expect(source).toContain('const testStudentJoin = React.useCallback');
    expect(source).toContain('const printLiveQr = React.useCallback');
    expect(source).toContain('Test as student');
    expect(source).toContain('Print QR');
    expect(source).toContain('Ready to scan.');
    expect(source).toContain('Fallback class code');    expect(source).toContain('Open projection mode');
    expect(source).toContain('connectedStudentCount');
    expect(source).toContain('Live session readiness');
    expect(source).toContain('Selectable student join link');
  });

  it('exposes accurate QR readiness and connection updates', () => {
    expect(source).toContain("const qrStatusText = liveQrSvg ? 'QR validated' : liveQrError ? 'QR unavailable' : 'QR loading';");
    expect(source).toContain('<ul className="mb-3 grid');
    expect(source).toContain('aria-label="Live session readiness"');
    expect(source).toContain('role="status" aria-live="polite" aria-atomic="true">{qrStatusText}');
    expect(source).toContain('connectedStudentCount > 0');
    expect(source).toContain('role="img" aria-label="AlloFlow student join QR"');
  });

  it('preserves visible names and exposes pacing as a switch', () => {
    expect(source).toContain("aria-label={`${activeSessionCode}. ${t('session.click_to_copy')}`}");
    expect(source).not.toContain("aria-label={t('common.groups')}");
    expect(source).toContain("aria-label={`${t('common.copy')} ${lanJoinUrl}`}");
    expect(source).toContain("aria-label={`${t('common.copy')} ${appId}`}");
    expect(source).toContain('role="switch"');
    expect(source.match(/<button\b/g)).toHaveLength(12);
    expect(source.match(/type="button"/g)).toHaveLength(12);
    expect(source.match(/min-h-11/g)?.length).toBeGreaterThanOrEqual(5);
    expect(source).toContain('min-w-11 min-h-11');
    expect(source).toContain("aria-checked={sessionData.mode === 'sync'}");
  });

  it('preserves fallback focus, contrast, and reduced motion', () => {
    expect(source).not.toContain('duration-200 focus:outline-none ${isProjectionMode');
    expect(source).toContain('animate-pulse motion-reduce:animate-none');
    expect(source).toContain('slide-in-from-bottom-2 motion-reduce:animate-none');
    expect(source).toContain('duration-300 motion-reduce:transition-none');
    expect(source).toContain('text-red-700');
  });

  it('synchronizes the deployable module', () => {
    expect(fs.readFileSync('desktop/web-app/public/view_session_modal_module.js', 'utf8')).toBe(fs.readFileSync('view_session_modal_module.js', 'utf8'));
  });
});
