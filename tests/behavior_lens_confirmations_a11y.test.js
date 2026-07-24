import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Behavior Lens destructive confirmations accessibility', () => {
  const source = read('behavior_lens_module.js');

  it('provides a labelled modal alert dialog with background isolation', () => {
    expect(source).toContain('function askBehaviorLensConfirmation(message, options)');
    expect(source).toContain("dialog.setAttribute('role', 'alertdialog')");
    expect(source).toContain("dialog.setAttribute('aria-modal', 'true')");
    expect(source).toContain("entry.el.setAttribute('inert', '')");
  });

  it('contains focus, cancels on Escape, and restores the opener', () => {
    expect(source).toContain("document.addEventListener('keydown', onKeyDown, true)");
    expect(source).toContain("if (event.key === 'Escape')");
    expect(source).toContain('opener && opener.isConnected');
    expect(source).toContain('cancel.focus();');
  });

  it('routes all seven destructive workflows through the service', () => {
    const titles = ['Delete ABC entry', 'Remove frequency counter', 'Reset frequency data', 'Delete behavior goal', 'Remove crisis contact', 'Delete self-check entry', 'Reset skill progress'];
    for (const title of titles) expect(source).toContain(`title: '${title}'`);
    expect(source.match(/await askBehaviorLensConfirmation\(/g)).toHaveLength(7);
  });

  it('contains no native alert, confirm, or prompt calls', () => {
    expect(source).not.toMatch(/(?<![\w.])(?:window\.)?(?:alert|confirm|prompt)\s*\(/);
  });

  it('keeps the deploy mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/behavior_lens_module.js'));
  });
});
