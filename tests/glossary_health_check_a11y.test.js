import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('view_glossary_source.jsx', 'utf8');

describe('Glossary Health Check controls', () => {
  it('separates the disclosure from the re-analyze and dismiss actions', () => {
    expect(source).not.toContain('onClick={handleToggleShowHealthCheckPanel} className="w-full flex items-center justify-between');
    expect(source).not.toContain('role="button" tabIndex={0}><div className="flex items-center gap-2"');
    expect(source).toContain('type="button"\n    onClick={handleToggleShowHealthCheckPanel}');
    expect(source).toContain('type="button"\n      aria-label={t(\'common.re_run_analysis\')}');
    expect(source).toContain('type="button"\n      aria-label={t(\'common.dismiss_analysis\')}');
  });

  it('exposes disclosure state and a programmatically associated details region', () => {
    expect(source).toContain('aria-expanded={showHealthCheckPanel}');
    expect(source).toContain('aria-controls="glossary-health-check-details"');
    expect(source).toContain('id="glossary-health-check-title"');
    expect(source).toContain('id="glossary-health-check-details" role="region" aria-labelledby="glossary-health-check-title"');
    expect(source).toContain('role="status" aria-live="polite" aria-labelledby="glossary-health-check-title"');
  });

  it('provides reflow-safe large targets, visible focus, and reduced-motion handling', () => {
    expect(source).toContain('w-full flex flex-wrap items-center gap-2');
    expect(source.match(/min-h-11/g)?.length).toBeGreaterThanOrEqual(3);
    expect(source.match(/focus-visible:ring-amber-700/g)?.length).toBeGreaterThanOrEqual(3);
    expect(source).toContain('motion-reduce:transition-none');
    expect(source).toContain('animate-spin motion-reduce:animate-none');
  });

  it('keeps root and deployed generated modules synchronized', () => {
    expect(readFileSync('desktop/web-app/public/view_glossary_module.js', 'utf8'))
      .toBe(readFileSync('view_glossary_module.js', 'utf8'));
  });
});
