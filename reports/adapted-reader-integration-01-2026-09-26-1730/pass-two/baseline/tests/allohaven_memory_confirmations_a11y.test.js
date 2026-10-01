import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('AlloHaven memory confirmations accessibility', () => {
  const source = read('allohaven_module.js');

  it('provides a labelled alert dialog with modal isolation', () => {
    expect(source).toContain('function askAlloHavenConfirmation(message, options)');
    expect(source).toContain("dialog.setAttribute('role', 'alertdialog')");
    expect(source).toContain("dialog.setAttribute('aria-modal', 'true')");
    expect(source).toContain("dialog.setAttribute('aria-labelledby', idBase + '-title')");
    expect(source).toContain("entry.el.setAttribute('inert', '')");
  });

  it('contains focus, makes Escape cancel, and restores the opener', () => {
    expect(source).toContain("document.addEventListener('keydown', onKeyDown, true)");
    expect(source).toContain("document.removeEventListener('keydown', onKeyDown, true)");
    expect(source).toContain("if (event.key === 'Escape')");
    expect(source).toContain('opener && opener.isConnected');
    expect(source).toContain('cancel.focus();');
  });

  it('uses the accessible service for three destructive memory actions', () => {
    expect(source).toContain('async function clearAllCards()');
    expect(source).toContain('async function importReplace()');
    expect(source).toContain("onClick: async function() {\n                  if (!await askAlloHavenConfirmation('Delete this voice note?'");
    expect(source).not.toContain("window.confirm('Remove all '");
    expect(source).not.toContain("window.confirm('Replace all existing cards");
    expect(source).not.toContain("window.confirm('Delete this voice note?')");
  });

  it('keeps the deploy mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/allohaven_module.js'));
  });
});

