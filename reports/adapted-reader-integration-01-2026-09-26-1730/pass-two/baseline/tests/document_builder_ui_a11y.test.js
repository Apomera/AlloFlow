import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'view_export_preview_source.jsx'), 'utf8');
const moduleBuild = readFileSync(resolve(process.cwd(), 'view_export_preview_module.js'), 'utf8');
const deployBuild = readFileSync(resolve(process.cwd(), 'desktop/web-app/public/view_export_preview_module.js'), 'utf8');

describe('Document Builder UI accessibility refinements', () => {
  it('names the modal from its visible heading and restores focus to its opener', () => {
    expect(source).toContain('aria-labelledby="document-builder-title"');
    expect(source).toContain('id="document-builder-title"');
    expect(source).toContain('openerRef.current = document.activeElement');
    expect(source).toMatch(/opener\.isConnected[\s\S]*opener\.focus\(\)/);
  });

  it('exposes format and style selection as keyboard-operable radio groups', () => {
    expect(source).toContain('aria-label="Export format" onKeyDown={handleRadioGroupKeyDown}');
    expect(source).toContain('aria-label="Document style" onKeyDown={handleRadioGroupKeyDown}');
    expect(source).toContain('aria-checked={exportPreviewMode === m}');
    expect(source).toContain('aria-checked={exportTheme === key}');
    expect(source).toMatch(/ArrowLeft[\s\S]*ArrowRight[\s\S]*Home[\s\S]*End/);
  });

  it('implements roving tabindex for each Word Art radio group', () => {
    expect(source.match(/onKeyDown=\{handleRadioGroupKeyDown\}/g)?.length).toBeGreaterThanOrEqual(5);
    expect(source).toContain('tabIndex={i === 0 ? 0 : -1}');
    expect(source).toContain("tabIndex={s === 'L' ? 0 : -1}");
    expect(source).toContain("tabIndex={a === 'center' ? 0 : -1}");
    expect(source).toContain('b.tabIndex = -1');
    expect(source).toContain('e.currentTarget.tabIndex = 0');
  });

  it('announces word-count progress programmatically', () => {
    expect(source).toContain('aria-valuemin={0}');
    expect(source).toContain('aria-valuemax={100}');
    expect(source).toContain('aria-valuenow={wordGoalProgress.percent}');
    expect(source).toContain('aria-valuetext={wordGoalProgress.goal > 0');
  });

  it('uses a focus-contained in-app dialog for the image alt-text decision', () => {
    expect(source).toContain('aria-labelledby="image-description-title"');
    expect(source).toContain('inert={pendingImageFile ? true : undefined}');
    expect(source).toContain("setImageAltError('Describe the image, or mark it as decorative.')");
    expect(source).toContain('checked={imageDecorative}');
    expect(source).toContain('img.alt = alt');
    expect(source).not.toContain("window.prompt('Describe the image");
    expect(source).not.toContain("img.alt = 'User-inserted image'");
  });

  it('uses input-neutral editing guidance and WCAG 2.2-sized compact toolbar controls', () => {
    expect(source).toContain('Focus the preview and edit text directly');
    expect(source).toContain('title="Editable document preview"');
    expect(source).not.toContain('w-7 h-7');
    expect(source).toContain('w-8 h-8');
    expect(source).toContain('button:not([disabled])');
  });

  it('uses an honest automated-score label, WCAG 2.2 wording, and the no-certification caveat', () => {
    expect(source).toContain('Accessibility Automated Score');
    expect(source).toContain('zoom/reflow, and forced-colors');
    expect(source).toContain('a guide, not a certification');
  });

  it('ships the same refinements in both compiled runtime artifacts', () => {
    for (const artifact of [moduleBuild, deployBuild]) {
      expect(artifact).toContain('document-builder-title');
      expect(artifact).toContain('Accessibility Automated Score');
      expect(artifact).toContain('image-description-title');
      expect(artifact).toContain('Editable document preview');
      expect(artifact).toContain('wordGoalProgress.percent');
    }
    expect(moduleBuild).toBe(deployBuild);
  });
});