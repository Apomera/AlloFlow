import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab flashcard accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');

  it('provides a labelled, modal form dialog with background isolation', () => {
    expect(source).toContain('function askLearningLabForm(options)');
    expect(source).toContain("dialog.setAttribute('role', 'dialog')");
    expect(source).toContain("dialog.setAttribute('aria-modal', 'true')");
    expect(source).toContain("dialog.setAttribute('aria-labelledby', idBase + '-title')");
    expect(source).toContain("dialog.setAttribute('aria-describedby', idBase + '-description')");
    expect(source).toContain("entry.el.setAttribute('inert', '')");
  });

  it('keeps focus in the form, cancels on Escape, and restores the opener', () => {
    expect(source).toContain('var focusable = controls.concat([cancel, submit]);');
    expect(source).toContain("if (event.key === 'Escape')");
    expect(source).toContain("window.addEventListener('keydown', onKeyDown, true)");
    expect(source).toContain("window.removeEventListener('keydown', onKeyDown, true)");
    expect(source).toContain('opener && opener.isConnected');
    expect(source).toContain('(controls[0] || cancel).focus();');
  });

  it('uses the form dialog for deck naming and reports duplicate names in place', () => {
    expect(source).toContain('var values = await askLearningLabForm({');
    expect(source).toContain("fields: [{ name: 'name', label: 'Deck name', required: true, maxLength: 80 }]");
    expect(source).toContain('A deck with that name already exists.');
    expect(source).not.toContain("prompt('Deck name?')");
  });

  it('associates required card fields with inline errors and focuses the first invalid field', () => {
    expect(source).toContain("htmlFor: 'learning-lab-flashcard-front'");
    expect(source).toContain("htmlFor: 'learning-lab-flashcard-back'");
    expect(source).toContain("id: 'learning-lab-flashcard-front-error', role: 'alert'");
    expect(source).toContain("id: 'learning-lab-flashcard-back-error', role: 'alert'");
    expect(source).toContain("'aria-describedby': 'learning-lab-flashcard-front-help' +");
    expect(source).toContain("'aria-describedby': 'learning-lab-flashcard-back-help' +");
    expect(source).toContain("setFocusTarget(errors.front ? 'learning-lab-flashcard-front' : 'learning-lab-flashcard-back')");
    expect(source).not.toContain("alert('Both front and back are required.')");
  });

  it('uses accessible confirmations and 44-pixel real buttons for destructive actions', () => {
    expect(source).toContain("title: 'Delete this flashcard deck?', confirmText: 'Delete deck'");
    expect(source).toContain("title: 'Delete this flashcard?'");
    expect(source).toContain("'aria-label': 'Delete flashcard: ' + itemName");
    expect(source).toContain("'aria-label': 'Delete flashcard deck: ' + deckName");
    expect(source).toContain('minWidth: 44, minHeight: 44');
    expect(source).not.toContain("confirm('Delete this card?')");
    expect(source).not.toContain("alert('Cannot delete Default deck.')");
    expect(source).not.toContain("role: 'button', tabIndex: 0, 'aria-label': 'Delete deck '");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
