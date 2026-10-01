import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Cyber Defense confirmation accessibility', () => {
  const source = read('stem_lab/stem_tool_cyberdefense.js');

  it('provides a labelled modal alert dialog with background isolation', () => {
    expect(source).toContain('function askCyberDefenseConfirmation(message, options)');
    expect(source).toContain("dialog.setAttribute('role', 'alertdialog')");
    expect(source).toContain("dialog.setAttribute('aria-modal', 'true')");
    expect(source).toContain("dialog.setAttribute('aria-labelledby', idBase + '-title')");
    expect(source).toContain("dialog.setAttribute('aria-describedby', idBase + '-description')");
    expect(source).toContain("entry.el.setAttribute('inert', '')");
  });

  it('contains focus, cancels on Escape, and restores the opener', () => {
    expect(source).toContain("window.addEventListener('keydown', onKeyDown, true)");
    expect(source).toContain("window.removeEventListener('keydown', onKeyDown, true)");
    expect(source).toContain("if (event.key === 'Escape')");
    expect(source).toContain('opener && opener.isConnected');
    expect(source).toContain('cancel.focus();');
  });

  it('suppresses background game shortcuts and supplies WCAG 2.2 targets', () => {
    expect(source).toContain('event.stopImmediatePropagation();');
    expect(source).toContain('min-width:44px;min-height:44px');
  });

  it('routes all eight decision workflows through the accessible service', () => {
    expect(source.match(/askCyberDefenseConfirmation\(/g)).toHaveLength(9);
    for (const title of [
      'Observe live campaign',
      'Restore War Room data',
      'Clear campaign history',
      'Replay saved campaign',
      'Clear custom cards',
      'Reset access options',
      'Start Boss Mode?',
      'Quit this campaign?',
    ]) expect(source).toContain(`title: '${title}'`);
  });

  it('contains no executable native alert, confirm, or prompt calls', () => {
    expect(source).not.toMatch(/(?:window\.)?(?:alert|confirm|prompt)\(/);
  });

  it('keeps the deploy mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_cyberdefense.js'));
  });
});
