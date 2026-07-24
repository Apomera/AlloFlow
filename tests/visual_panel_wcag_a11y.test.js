import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const source = fs.readFileSync('visual_panel_source.jsx', 'utf8');
const moduleSource = fs.readFileSync('visual_panel_module.js', 'utf8');
const publicModule = fs.readFileSync('desktop/web-app/public/visual_panel_module.js', 'utf8');

describe('Visual Panel WCAG controls', () => {
  it('preserves native focus indicators on every editable field', () => {
    expect(source).not.toMatch(/outline\s*:\s*['"]none['"]/);
    expect(source).toContain('aria-label={`Edit caption for panel ${panelIdx + 1}`}');
    expect(source).toContain('aria-label={`Describe changes for Panel ${panelIdx + 1}`}');
  });

  it('uses explicit non-submit types for every native button', () => {
    expect(source.match(/<button\b/g)).toHaveLength(43);
    expect(source.match(/\btype="button"/g)).toHaveLength(43);
  });

  it('defensively names the export-only scratch canvas', () => {
    expect(source).toContain("const canvas = document.createElement('canvas');");
    expect(source).toContain("canvas.setAttribute('role', 'img');");
    expect(source).toContain("canvas.setAttribute('aria-label', 'Exported visual panel with annotations');");
  });
});

describe('Visual Panel reduced motion and generated copies', () => {
  it('stops the loading spinner for reduced-motion users', () => {
    expect(source).toContain('className="animate-spin motion-reduce:animate-none"');
    expect(source).not.toMatch(/animate-spin(?!\s+motion-reduce:animate-none)/);
  });

  it('keeps the generated root and public modules synchronized', () => {
    expect(moduleSource).toContain('Exported visual panel with annotations');
    expect(moduleSource).toContain('motion-reduce:animate-none');
    expect(publicModule).toBe(moduleSource);
  });
});
