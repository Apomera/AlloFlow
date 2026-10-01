import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('PDF crop adjustment accessibility', () => {
  const source = read('doc_pipeline_source.jsx');

  it('announces crop failures without native alerts', () => {
    expect(source).toContain('window.__pdfCropNotify = function(message)');
    expect(source).toContain("notice.setAttribute('role', 'alert')");
    expect(source).not.toMatch(/\b(?:window\.)?alert\s*\(/);
  });

  it('exposes a labelled modal and isolates background content', () => {
    expect(source).toContain("dialog.setAttribute('role', 'dialog')");
    expect(source).toContain("dialog.setAttribute('aria-modal', 'true')");
    expect(source).toContain("dialog.setAttribute('aria-labelledby', 'alloflow-pdf-crop-title')");
    expect(source).toContain("entry.el.setAttribute('inert', '')");
    expect(source).toContain('opener && opener.isConnected');
  });

  it('provides keyboard-editable coordinate controls equivalent to dragging', () => {
    expect(source).toContain("input.type = 'number'");
    expect(source).toContain("legend.textContent = 'Crop coordinates in full-page pixels'");
    expect(source).toContain("input.style.cssText = 'box-sizing:border-box;width:100%;min-height:44px");
    expect(source).toContain('pageImg.onpointerdown = function(e)');
    expect(source).toContain("showError('Enter a crop at least 10 by 10 pixels that stays within the full page.')");
  });

  it('traps focus, closes on Escape, and restores the opener', () => {
    expect(source).toContain("if (e.key === 'Escape')");
    expect(source).toContain("if (!dialog.contains(document.activeElement))");
    expect(source).toContain("document.addEventListener('keydown', onKeyDown, true)");
    expect(source).toContain("document.removeEventListener('keydown', onKeyDown, true)");
    expect(source).toContain('xInput.focus(); xInput.select();');
  });

  it('keeps generated root and public modules identical', () => {
    const built = read('doc_pipeline_module.js');
    const publicBuilt = read('desktop/web-app/public/doc_pipeline_module.js');
    expect(built).toBe(publicBuilt);
    expect(built).toContain('window.__pdfCropNotify = function(message)');
  });
});

