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
    expect(source.match(/<button\b/g)).toHaveLength(48);
    expect(source.match(/\btype="button"/g)).toHaveLength(48);
  });

  it('uses persistent native removal controls for every editable label type', () => {
    expect(source).not.toContain('hoveredLabelKey');
    expect(source.match(/className="label-delete-btn"/g)).toHaveLength(3);
    expect(source).toContain('aria-label={`Remove label ${label.text || label} from panel ${panelIdx + 1}`}');
    expect(source).toContain('aria-label={`Remove label ${uLabel.text} from panel ${panelIdx + 1}`}');
    expect(source).toContain('aria-label={`Remove student label from panel ${panelIdx + 1}`}');
    expect(source).not.toMatch(/<span[^>]*onClick=\{\(e\) => \{ e\.stopPropagation\(\); (?:onUpdateLabel|handleDeleteUserLabel)/);
  });

  it('keeps label groups and removal controls keyboard-safe and visibly focused', () => {
    expect(source.match(/role="group"/g).length).toBeGreaterThanOrEqual(2);
    expect(source.match(/className="label-move-btn"/g)).toHaveLength(2);
    expect(source).toContain('aria-keyshortcuts="Enter ArrowUp ArrowDown ArrowLeft ArrowRight"');
    expect(source).not.toMatch(/role="group"[^>]*tabIndex/);
    expect(source).not.toContain('<div role="button" tabIndex={0}');
    expect(source).toContain('className="visual-panel-add-label-target"');
    expect(source).toContain('Keyboard activation places it in the center');
    expect(source.match(/control\.closest\?\.\('\.visual-label'\) \|\| control/g)).toHaveLength(2);
    expect(moduleSource).toContain('.visual-label button:focus-visible');
    expect(moduleSource).toContain('.label-delete-btn { min-width: 32px; min-height: 32px;');
    expect(moduleSource).toContain('@media (forced-colors: active)');
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
