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
    expect(source).toContain('role="dialog" aria-modal="true" aria-label=');
  });
  it('contains focus, closes with Escape, and restores the trigger', () => {
    expect(source).toContain("if (event.key === 'Escape')");
    expect(source).toContain("if (event.key !== 'Tab') return");
    expect(source).toContain("if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus()");
  });
  it('synchronizes its public module', () => {
    expect(fs.readFileSync(`prismflow-deploy/public/${modulePath}`, 'utf8')).toBe(fs.readFileSync(modulePath, 'utf8'));
  });
});
