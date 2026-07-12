import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('teacher_source.jsx', 'utf8');

describe('teacher roster WCAG 2.5.8 target sizes', () => {
  it('uses 24 pixel existing-group color targets', () => {
    expect(source).toContain('w-6 h-6 rounded-full border-2 transition-all');
    expect(source).not.toContain('w-5 h-5 rounded-full border-2 transition-all');
  });

  it('uses 24 pixel new-group color targets', () => {
    expect(source).toContain('w-6 h-6 rounded-full border-2 ${newGroupColor');
  });

  it('uses a 24 pixel remove-student target', () => {
    expect(source).toContain('w-6 h-6 inline-flex items-center justify-center hover:text-red-500');
  });
});
