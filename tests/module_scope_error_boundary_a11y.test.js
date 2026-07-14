import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('module_scope_extras_source.jsx', 'utf8');

describe('shared ErrorBoundary accessibility', () => {
  it('announces a component failure as an atomic urgent message', () => {
    expect(source).toContain('role="alert" aria-live="assertive" aria-atomic="true"');
  });

  it('keeps retry operable and visibly focused without submitting a parent form', () => {
    expect(source).toContain('<button\n                type="button"');
    expect(source).toContain('focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2');
  });

  it('hides decorative icons and honors reduced motion', () => {
    expect(source).toContain('<AlertCircle size={48} aria-hidden="true" />');
    expect(source).toContain('<RefreshCw size={16} aria-hidden="true" />');
    expect(source).toContain('motion-reduce:animate-none');
  });
});
