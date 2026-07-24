import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const surfaces = [
  ['Learning Hub', 'view_learning_hub_modal_source.jsx', 'view_learning_hub_modal_module.js'],
  ['Educator Hub', 'view_educator_hub_modal_source.jsx', 'view_educator_hub_modal_module.js'],
];

describe.each(surfaces)('%s modal accessibility', (_name, sourcePath, modulePath) => {
  const source = fs.readFileSync(sourcePath, 'utf8');
  it('uses a non-focusable backdrop and focusable named dialog', () => {
    expect(source).not.toContain('role="button" tabIndex={0}');
    expect(source).toContain('ref={dialogRef} tabIndex={-1}');
    expect(source).toContain('role="dialog" aria-modal="true"');
    expect(source).toMatch(/aria-(?:label|labelledby)=/);
  });
  it('contains focus, closes with Escape, and restores the trigger', () => {
    expect(source).toContain("if (event.key === 'Escape')");
    expect(source).toContain("if (event.key !== 'Tab') return");
    expect(source).toContain('window.__alloFocusTrapStack');
    expect(source).toContain('if (!isTopTrap()) return');
    expect(source).toContain("document.addEventListener('keydown', onKeyDown)");
    expect(source).toContain('previousFocus.isConnected');
  });
  it('synchronizes its public module', () => {
    expect(fs.readFileSync(`desktop/web-app/public/${modulePath}`, 'utf8')).toBe(fs.readFileSync(modulePath, 'utf8'));
  });
});


describe('Learning Hub launcher grid accessibility', () => {
  const source = fs.readFileSync('view_learning_hub_modal_source.jsx', 'utf8');
  it('uses visible naming, explicit controls, decorative icons, and reduced motion', () => {
    expect(source).toContain('aria-labelledby="learning-hub-title" aria-describedby="learning-hub-subtitle"');
    expect(source.match(/<button\b/g)).toHaveLength(15);
    expect(source.match(/type="button"/g)).toHaveLength(15);
    expect(source).toContain('min-w-11 min-h-11');
    expect(source.match(/motion-reduce:transform-none/g)).toHaveLength(14);
    expect(source).not.toMatch(/<span className="text-4xl"(?![^>]*aria-hidden)/);
  });
});


describe('Educator Hub launcher grid accessibility', () => {
  const source = fs.readFileSync('view_educator_hub_modal_source.jsx', 'utf8');
  it('uses visible naming, explicit controls, reduced motion, and a separate status summary', () => {
    expect(source).toContain('aria-labelledby="educator-hub-title" aria-describedby="educator-hub-subtitle"');
    expect(source.match(/<button\b/g)).toHaveLength(19);
    expect(source.match(/type="button"/g)).toHaveLength(19);
    expect(source.match(/motion-reduce:transform-none/g)).toHaveLength(14);
    expect(source).toContain('role="region" aria-labelledby="educator-platform-results-title"');
    expect(source).toContain('role="status" aria-live="polite" aria-atomic="true">Platform check complete.');
    expect(source).not.toContain('rounded-lg p-2 text-[11px]" role="status"');
    expect(source).toContain('min-w-11 min-h-11');
    expect(source).toMatch(/<span aria-hidden="true">[^<]+<\/span> \{t\('pdf_audit\.view_last_audit'\)/);
  });
});
