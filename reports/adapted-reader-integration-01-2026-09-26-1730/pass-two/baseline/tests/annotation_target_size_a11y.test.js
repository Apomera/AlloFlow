import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('annotation_suite_source.jsx', 'utf8');

describe('annotation suite WCAG 2.5.8 target sizes', () => {
  it('uses 24 pixel annotation delete targets', () => {
    expect(source.match(/width: 24, height: 24/g)?.length).toBeGreaterThanOrEqual(3);
    expect(source).not.toContain('width: 18, height: 18');
  });

  it('uses 24 pixel color and line-width targets', () => {
    expect(source.match(/w-6 h-6/g)?.length).toBeGreaterThanOrEqual(8);
    expect(source).not.toContain('w-5 h-5');
    expect(source).toContain('style={{ width: 24, height: 24 }}');
  });

  it('uses 24 pixel clear controls and template selector', () => {
    expect(source.match(/w-6 h-6 inline-flex items-center justify-center/g)?.length).toBe(4);
    expect(source).toContain('style={{ minHeight: 24 }}');
  });
});
