import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('view_confirm_dialog_source.jsx', 'utf8');

describe('Shared confirmation dialog accessibility', () => {
  it('uses a named and described alert dialog', () => {
    expect(source).toContain('role="alertdialog"');
    expect(source).toContain('aria-labelledby="alloflow-confirm-title"');
    expect(source).toContain('aria-describedby="alloflow-confirm-message"');
    expect(source).toContain('aria-hidden="true"');
  });

  it('focuses the least destructive action and restores invoking focus', () => {
    expect(source).toContain('(cancelBtnRef.current || dialog).focus()');
    expect(source).toContain('ref={cancelBtnRef}');
    expect(source).not.toContain('confirmBtnRef');
    expect(source).toContain("if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus()");
  });

  it('contains Tab navigation and does not globally map Enter to confirmation', () => {
    expect(source).toContain("if (event.key === 'Escape')");
    expect(source).toContain("if (event.key !== 'Tab') return");
    expect(source).not.toContain("else if (e.key === 'Enter')");
    expect(source).not.toContain("window.addEventListener('keydown'");
  });

  it('synchronizes the deployable module', () => {
    expect(fs.readFileSync('prismflow-deploy/public/view_confirm_dialog_module.js', 'utf8')).toBe(fs.readFileSync('view_confirm_dialog_module.js', 'utf8'));
  });
});
