import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Typing Practice decision and print-message accessibility', () => {
  const source = read('stem_lab/stem_tool_typingpractice.js');

  it('provides a labelled modal alert dialog with background isolation', () => {
    expect(source).toContain('function askTypingPracticeConfirmation(message, options)');
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

  it('suppresses background typing shortcuts and supplies WCAG 2.2 targets', () => {
    expect(source).toContain('event.stopImmediatePropagation();');
    expect(source).toContain('min-width:44px;min-height:44px');
  });

  it('routes all seven decision steps through the accessible service', () => {
    expect(source.match(/askTypingPracticeConfirmation\(/g)).toHaveLength(8);
    for (const title of [
      'Remove custom drill',
      'Remove saved passage',
      'Discard this session?',
      'Apply imported profile?',
      'Restore full backup?',
      'Clear all typing practice data?',
      'Are you absolutely sure?',
    ]) expect(source).toContain(`title: '${title}'`);
  });

  it('announces print failures non-modally with a visible fallback', () => {
    expect(source.match(/reportTypingPracticeIssue\(/g)).toHaveLength(3);
    expect(source).toContain("notice.setAttribute('role', 'alert')");
    expect(source).toContain("document.getElementById('allo-live-typingpractice')");
    expect(source).toContain("printIEPReport(report, state.studentName || '', addToast)");
  });

  it('contains no executable native alert, confirm, or prompt calls', () => {
    expect(source).not.toMatch(/(?:window\.)?(?:alert|confirm|prompt)\(/);
  });

  it('keeps the deploy mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_typingpractice.js'));
  });
});
