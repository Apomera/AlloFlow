import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const html = fs.readFileSync('desktop/command-center/index.html', 'utf8');
const css = fs.readFileSync('desktop/command-center/styles.css', 'utf8');
const js = fs.readFileSync('desktop/command-center/command-center.js', 'utf8');

describe('desktop command center accessibility', () => {
  it('provides a working bypass link and main focus target', () => {
    expect(html).toContain('href="#desktop-main"');
    expect(html).toContain('id="desktop-main" tabindex="-1"');
  });
  it('gives tabs stable relationships to their panels', () => {
    for (const id of ['app', 'ai', 'schoolbox', 'settings']) {
      expect(html).toContain(`id="tab-${id}"`);
      expect(html).toContain(`aria-controls="pane-${id}"`);
      expect(html).toContain(`id="pane-${id}" role="tabpanel"`);
    }
  });
  it('supports roving keyboard navigation between tabs', () => {
    expect(html).toContain('role="tablist"');
    expect(js).toContain("event.key === 'ArrowRight'");
    expect(js).toContain("event.key === 'Home'");
    expect(js).toContain("tab.setAttribute('aria-selected', String(selected))");
  });
  it('binds tab collections without crashing initialization', () => {
    expect(js).toContain("const tabs = $$('.tab')");
    expect(js).toContain("$$('.pane').forEach");
    expect(js).not.toContain("\n    $('.tab').forEach");
    expect(js).not.toContain("const tabs = $('.tab')");
  });
  it('keeps hidden action buttons out of the accessibility tree', () => {
    expect(css).toMatch(/\[hidden\]\s*\{[^}]*display:\s*none !important/s);
    expect(html).not.toContain('data-act hidden></button>');
    expect(js).toContain("btn.setAttribute('aria-label', actLabel)");
  });
  it('has a global visible keyboard focus indicator', () => {
    expect(css).toContain(':focus-visible');
    expect(css).toContain('outline: 3px solid #1d4ed8');
  });
});
