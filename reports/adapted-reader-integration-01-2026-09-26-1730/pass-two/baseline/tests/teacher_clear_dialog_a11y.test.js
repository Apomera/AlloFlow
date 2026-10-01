import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const paths = ['teacher_source.jsx', 'teacher_module.js', 'desktop/web-app/public/teacher_module.js'];
const files = paths.map(path => [path, fs.readFileSync(path, 'utf8')]);

describe('teacher dashboard Clear all dialog accessibility', () => {
  it.each(files)('%s exposes a named and described alert dialog', (_path, source) => {
    expect(source).toContain('teacher-clear-confirm-title');
    expect(source).toContain('teacher-clear-confirm-description');
    expect(source).toMatch(/(?:role="alertdialog"|role:\s*"alertdialog")/);
  });

  it.each(files)('%s defaults to cancellation and manages keyboard focus', (_path, source) => {
    expect(source).toContain('data-safe-default');
    expect(source).toMatch(/event\.key === ["']Escape["']/);
    expect(source).toMatch(/event\.key !== ["']Tab["']/);
    expect(source).toContain('clearConfirmTriggerRef.current?.focus()');
  });

  it('does not expose the backdrop as a button or autofocus deletion', () => {
    const source = files[0][1];
    expect(source).not.toContain('<div role="button" tabIndex={0} className="fixed inset-0 z-[300]');
    expect(source).not.toMatch(/onClick=\{confirmClearAll\}[\s\S]{0,240}autoFocus/);
    expect(source).toContain('role="presentation" className="fixed inset-0 z-[300]');
  });

  it('supports both Enter and Space on the legacy card-style trigger', () => {
    expect(files[0][1]).toContain("(e.key === 'Enter' || e.key === ' ')");
  });
});