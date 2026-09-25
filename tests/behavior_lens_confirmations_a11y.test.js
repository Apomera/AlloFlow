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

  it('routes destructive workflows and observation exit choices through the service', () => {
    // Every confirmation, by title. A new one must be added here on purpose; the old
    // bare count (9) went stale when two legitimate ones were added.
    const titles = ['Reset escalation cycle', 'Replace escalation cycle', 'AI draft', 'Reset consent form', 'Delete ABC entry', 'Remove frequency counter', 'Reset frequency data', 'Delete behavior goal', 'Remove crisis contact', 'Delete self-check entry', 'Reset skill progress', 'Keep observation draft', 'Discard observation draft', 'Replace strategy draft', 'Discard session correction',
      // Added 2026-09-23 (pass 4): AI drafts that replace typed work, deletes of saved records,
      // clearing entered data, changing a design, and sharing student data off the device.
      'Replace GAS descriptors', 'Replace contract terms', 'Delete saved contract', 'Replace pocket BIP', 'Delete team note', 'Delete family entry',
      'Delete replacement plan', 'Delete modification', 'Delete note', 'Clear AlloBot chat', 'Clear competing pathways', 'Delete replacement behavior',
      'Clear manual graph data', 'Change design', 'Replace task steps', 'Clear latency trials', 'Share student data',
      // Pass 5: switching away from an unsaved definition, AI Suggest over typed fields, a new preference assessment.
      'Discard unsaved definition', 'Replace with AI suggestion', 'Start a new preference assessment',
      // Pass 5, workspace: clearing quick switch, using the cloud copy, replacing saved work with a file.
      'Clear quick switch', 'Use cloud copy', 'Replace saved workspace', 'Replace graph data', 'Import consent template', 'Discard entry changes',
      // Pass 9: adding a report export's or share file's records to saved work.
      'Add records from file'];
    for (const title of titles) expect(source).toContain(`title: '${title}'`);
    expect(source.match(/await askBehaviorLensConfirmation\(/g)).toHaveLength(titles.length);
  });

  it('contains no native alert, confirm, or prompt calls', () => {
    expect(source).not.toMatch(/(?<![\w.])(?:window\.)?(?:alert|confirm|prompt)\s*\(/);
  });

  it('keeps the deploy mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/behavior_lens_module.js'));
  });
});
