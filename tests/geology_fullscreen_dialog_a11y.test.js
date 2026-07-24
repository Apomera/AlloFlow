import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const sourcePath = path.join(root, 'stem_lab', 'stem_tool_geologyexplorer.js');
const deployPath = path.join(root, 'desktop/web-app', 'public', 'stem_lab', 'stem_tool_geologyexplorer.js');
const source = fs.readFileSync(sourcePath, 'utf8');

describe('Geology Explorer fullscreen dialog accessibility', () => {
  it('exposes fullscreen only as a named modal dialog', () => {
    expect(source).toContain(
      "isFs ? { role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'geology-fullscreen-title'",
    );
    expect(source).toContain("id: 'geology-fullscreen-title'");
    expect(source).toContain("'data-geology-fullscreen': 'true'");
  });

  it('isolates the nested background and restores its previous state', () => {
    expect(source).toContain("dialog.closest('[data-geology-tool=\"true\"]')");
    expect(source).toContain("element.setAttribute('inert', '')");
    expect(source).toContain("element.setAttribute('aria-hidden', 'true')");
    expect(source).toContain("else entry.element.removeAttribute('inert')");
    expect(source).toContain("else entry.element.removeAttribute('aria-hidden')");
  });

  it('contains keyboard focus, supports Escape, and restores the invoker', () => {
    expect(source).toContain("document.addEventListener('keydown', onKey)");
    expect(source).toContain("document.addEventListener('focusin', onFocusIn)");
    expect(source).toContain("if (event.key === 'Escape')");
    expect(source).toContain("if (event.key !== 'Tab') return");
    expect(source).toContain('fsPrevFocusRef.current = document.activeElement');
    expect(source).toContain('fsToggleRef.current');
  });

  it('provides a large exit target and preserves deploy parity', () => {
    expect(source).toContain("'data-geology-fullscreen-toggle': 'true'");
    expect(source).toContain('min-h-11 min-w-11');
    expect(fs.readFileSync(deployPath, 'utf8')).toBe(source);
  });
});
