import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Throughline confirmation accessibility', () => {
  const source = read('mind_map_module.js');

  it('provides a labelled modal alert dialog with background isolation', () => {
    expect(source).toContain('function askThroughlineConfirmation(message, options)');
    expect(source).toContain("dialog.setAttribute('role', 'alertdialog')");
    expect(source).toContain("dialog.setAttribute('aria-modal', 'true')");
    expect(source).toContain("entry.el.setAttribute('inert', '')");
  });

  it('uses window-capture focus containment to precede the existing generation trap', () => {
    expect(source).toContain("window.addEventListener('keydown', onKeyDown, true)");
    expect(source).toContain("window.removeEventListener('keydown', onKeyDown, true)");
    expect(source).toContain("if (event.key === 'Escape')");
    expect(source).toContain('opener && opener.isConnected');
  });

  it('routes all seven confirmation sites through the accessible service', () => {
    expect(source.match(/askThroughlineConfirmation\(/g)).toHaveLength(8);
    for (const title of ['Replace current canvas', 'Open lesson in live session', 'Replace current unit', 'Clear entire unit', 'Stop unit generation']) {
      expect(source).toContain(`title: '${title}'`);
    }
  });

  it('contains no native alert, confirm, or prompt calls', () => {
    expect(source).not.toMatch(/(?<![\w.])(?:window\.)?(?:alert|confirm|prompt)\s*\(/);
  });

  it('keeps the deploy mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/mind_map_module.js'));
  });
});
