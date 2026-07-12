import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'view_misc_panels_source.jsx'), 'utf8');
const built = readFileSync(resolve(process.cwd(), 'view_misc_panels_module.js'), 'utf8');
const deployed = readFileSync(resolve(process.cwd(), 'prismflow-deploy/public/view_misc_panels_module.js'), 'utf8');

describe('PDF Diff Viewer accessibility', () => {
  it('keeps generated and deployed artifacts synchronized', () => {
    expect(deployed).toBe(built);
    expect(built).toContain('requestDiffConfirmation');
  });

  it('focus-manages the named diff dialog', () => {
    expect(source).toContain('ref={diffDialogRef}');
    expect(source).toContain('aria-labelledby="allo-diff-title"');
    expect(source).toContain('containDiffFocus(event, diffDialogRef.current, _closeDiff)');
    expect(source).toContain('ref={diffCloseRef}');
    expect(source).toContain('diffCloseRef.current?.focus()');
  });

  it('uses an accessible nested decision dialog instead of browser confirms', () => {
    expect(source).not.toMatch(/\b(?:window\.)?confirm\s*\(/);
    expect(source).toContain('role="alertdialog"');
    expect(source).toContain('aria-labelledby="allo-diff-confirm-title"');
    expect(source).toContain('aria-describedby="allo-diff-confirm-message"');
    expect(source).toContain('diffConfirmCancelRef.current?.focus()');
  });

  it('awaits both potentially destructive granularity decisions', () => {
    expect(source.match(/await requestDiffConfirmation\(/g)).toHaveLength(2);
    expect(source).toContain("cancelLabel: 'Keep current view'");
    expect(source).toContain("cancelLabel: 'Keep rejections'");
  });
});