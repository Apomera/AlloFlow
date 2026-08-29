import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('teacher_source.jsx', 'utf8');

describe('teacher roster WCAG 2.5.8 target sizes', () => {
  it('uses 36 pixel existing-group color targets', () => {
    expect(source).toContain('w-9 h-9 rounded-full border-2 transition-all');
    expect(source).not.toContain('w-5 h-5 rounded-full border-2 transition-all');
  });

  it('uses 36 pixel new-group color targets', () => {
    expect(source).toContain('w-9 h-9 rounded-full border-2 ${newGroupColor');
  });

  it('uses explicit, larger delete-student targets', () => {
    expect(source).toContain("aria-label={'Delete ' + name + ' from roster'}");
    expect(source).toContain('min-h-9 rounded-lg border border-red-200');
  });
});
