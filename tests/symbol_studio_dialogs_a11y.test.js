import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Symbol Studio decision dialog accessibility', () => {
  const source = read('symbol_studio_module.js');

  it('provides labelled modal alert and text-entry dialogs with background isolation', () => {
    expect(source).toContain('function openSymbolStudioDecisionDialog(message, options)');
    expect(source).toContain("dialog.setAttribute('role', isTextEntry ? 'dialog' : 'alertdialog')");
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
    expect(source).toContain('(input || cancel).focus()');
  });

  it('supports keyboard-safe text entry and WCAG 2.2 target sizing', () => {
    expect(source).toContain("label.setAttribute('for', idBase + '-input')");
    expect(source).toContain("if (event.key === 'Enter' && input");
    expect(source).toContain("confirm.disabled = !input.value.trim()");
    expect(source).toContain('min-width:44px;min-height:44px');
  });

  it('routes every decision and template-name flow through the accessible service', () => {
    expect(source.match(/askSymbolStudioConfirmation\(/g)).toHaveLength(7);
    expect(source.match(/askSymbolStudioText\(/g)).toHaveLength(2);
    for (const title of [
      'Replace familiar symbol',
      'Clear symbol gallery',
      'Download confidential full backup',
      'Enable AI word prediction',
      'Replace current board',
      'Save story template',
    ]) expect(source).toContain(`title: '${title}'`);
    expect(source).toContain("title: 'Recompute \"' + g.text + '\" from clinician trials only?'");
  });

  it('contains no native alert, confirm, or prompt calls', () => {
    expect(source).not.toMatch(/(?<![\w.])(?:window\.)?(?:alert|confirm|prompt)\s*\(/);
  });

  it('keeps the deploy mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/symbol_studio_module.js'));
  });
});
