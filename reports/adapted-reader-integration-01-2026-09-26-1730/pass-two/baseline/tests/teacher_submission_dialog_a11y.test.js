import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const paths = ['teacher_source.jsx', 'teacher_module.js', 'desktop/web-app/public/teacher_module.js'];
const files = paths.map(path => [path, fs.readFileSync(path, 'utf8')]);

describe('teacher offline-submission dialog accessibility', () => {
  it.each(files)('%s uses a named and described alert dialog', (_path, source) => {
    expect(source).toMatch(/(?:role="alertdialog"|role:\s*"alertdialog")/);
    expect(source).toContain('offline-submission-dialog-title');
    expect(source).toContain('offline-submission-dialog-description');
  });

  it.each(files)('%s provides safe focus and keyboard containment', (_path, source) => {
    expect(source).toContain('data-safe-default');
    expect(source).toMatch(/event\.key === ["']Escape["']/);
    expect(source).toMatch(/event\.key !== ["']Tab["']/);
    expect(source).toContain('submissionDialogTriggerRef.current?.focus()');
  });

  it('removes the native key replacement confirmation and completion alert', () => {
    const source = files[0][1];
    expect(source).not.toMatch(/confirm\s*\(\s*[\r\n]*\s*['"]This class already has offline submissions/);
    expect(source).not.toMatch(/alert\s*\(\s*[\r\n]*\s*['"].*Offline submissions are set up/);
  });
});