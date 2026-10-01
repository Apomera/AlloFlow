import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab confirmation accessibility — goals, focus, and brain dump', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');

  it('provides a labelled modal alert dialog with background isolation', () => {
    expect(source).toContain('function askLearningLabConfirmation(message, options)');
    expect(source).toContain("dialog.setAttribute('role', 'alertdialog')");
    expect(source).toContain("dialog.setAttribute('aria-modal', 'true')");
    expect(source).toContain("dialog.setAttribute('aria-labelledby', idBase + '-title')");
    expect(source).toContain("dialog.setAttribute('aria-describedby', idBase + '-description')");
    expect(source).toContain("entry.el.setAttribute('inert', '')");
  });

  it('contains focus, cancels on Escape, restores the opener, and blocks background shortcuts', () => {
    expect(source).toContain("window.addEventListener('keydown', onKeyDown, true)");
    expect(source).toContain("window.removeEventListener('keydown', onKeyDown, true)");
    expect(source).toContain("if (event.key === 'Escape')");
    expect(source).toContain('event.stopImmediatePropagation();');
    expect(source).toContain('opener && opener.isConnected');
    expect(source).toContain('cancel.focus();');
  });

  it('supplies WCAG 2.2 target sizing', () => {
    expect(source).toContain('min-width:44px;min-height:44px');
  });

  it('routes goal, focus-history, and brain-dump deletion through the service', () => {
    expect(source.match(/askLearningLabConfirmation\(/g)?.length).toBeGreaterThanOrEqual(4);
    for (const title of ['Delete this goal?', "Clear today's focus history?", 'Clear the entire brain dump?']) {
      expect(source).toContain(`title: '${title.replace("'", "\\'")}'`);
    }
    expect(source).not.toContain("confirm('Delete this goal permanently?')");
    expect(source).not.toContain("confirm('Clear today\\'s focus session history?')");
    expect(source).not.toContain("confirm('Clear ALL brain dump items? (You can\\'t undo this.)')");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
