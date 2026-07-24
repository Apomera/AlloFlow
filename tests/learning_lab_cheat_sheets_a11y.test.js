import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Personal Reference Sheet Builder accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalCheatSheets(props) {');
  const end = source.indexOf('  function PersonalAskTracker(props) {', start);
  const sheets = source.slice(start, end);

  it('uses neutral optional framing and accurate privacy language', () => {
    expect(sheets).toContain("'Personal Reference Sheet Builder'");
    expect(sheets).toContain('Reference sheets are optional and saved in this Personal Toolkit.');
    expect(sheets).toContain('does not itself notify a teacher, school, employer, clinician, or family member');
    expect(sheets).toContain('supplements, but does not replace, course materials or approved accommodations');
    expect(sheets).not.toContain('forces compression and retrieval');
    expect(sheets).not.toContain('can teach the content');
  });

  it('uses a named creation form with inline validation and focus', () => {
    expect(sheets).toContain("onSubmit: function(event) { event.preventDefault(); createSheet(); }");
    expect(sheets).toContain("'aria-labelledby': 'learning-lab-cheat-new-heading'");
    expect(sheets).toContain("id: 'learning-lab-cheat-new-title', type: 'text'");
    expect(sheets).toContain('required: true, maxLength: 240');
    expect(sheets).toContain("setTitleError('Enter a topic for the reference sheet.')");
    expect(sheets).toContain("focusById('learning-lab-cheat-new-title')");
    expect(sheets).toContain("id: 'learning-lab-cheat-title-error', role: 'alert'");
    expect(sheets).toContain("'aria-invalid': titleError ? 'true' : undefined");
  });

  it('defensively handles legacy data shapes without discarding unrelated records', () => {
    expect(sheets).toContain("var rawSheets = Array.isArray(data.sheets) ? data.sheets : []");
    expect(sheets).toContain("function isRecord(value)");
    expect(sheets).toContain("function sectionsOf(sheet)");
    expect(sheets).toContain("function bulletsOf(section)");
    expect(sheets).toContain("return index === activeIndex && isRecord(sheet) ? Object.assign({}, sheet, patch) : sheet");
    expect(sheets).toContain("saveSheets([sheet].concat(rawSheets))");
  });

  it('makes the sheet title, section titles, and bullets explicitly labeled and editable', () => {
    expect(sheets).toContain("htmlFor: 'learning-lab-cheat-sheet-title'");
    expect(sheets).toContain("id: 'learning-lab-cheat-sheet-title', type: 'text'");
    expect(sheets).toContain("htmlFor: sectionTitleId");
    expect(sheets).toContain("htmlFor: bulletId");
    expect(sheets).toContain('Changes to the title, section titles, and bullets save automatically');
  });

  it('uses semantic lists, sections, articles, and ordinary named button groups', () => {
    expect(sheets).toContain("hh('ul', { 'aria-label': 'Saved reference sheets'");
    expect(sheets).toContain("hh('ol', { 'aria-label': 'Reference sheet sections'");
    expect(sheets).toContain("hh('ul', { 'aria-label': 'Bullets in section '");
    expect(sheets).toContain("hh('section', { 'aria-labelledby': sectionHeadingId }");
    expect(sheets).toContain("hh('article', { 'aria-labelledby': sheetHeadingId }");
    expect(sheets).toContain("role: 'group', 'aria-label': 'Reference sheet actions'");
    expect(sheets).not.toContain("role: 'toolbar'");
  });

  it('confirms every destructive action, including blank bullet deletion', () => {
    expect(sheets).toContain("title: 'Delete this reference sheet?', confirmText: 'Delete reference sheet'");
    expect(sheets).toContain("title: 'Delete this section?', confirmText: 'Delete section'");
    expect(sheets).toContain("title: 'Delete this bullet?', confirmText: 'Delete bullet'");
    expect(sheets).toContain("var bulletText = textValue(bullets[bulletIndex]).trim()");
    expect(sheets).not.toContain("if (bullet && !(await askLearningLabConfirmation");
    expect(sheets).not.toContain('confirm(');
  });

  it('moves focus for editor entry, additions, return, and deletion recovery', () => {
    expect(sheets).toContain("focusById('learning-lab-cheat-editor-heading')");
    expect(sheets).toContain("id: 'learning-lab-cheat-editor-heading', tabIndex: -1");
    expect(sheets).toContain("focusById('learning-lab-cheat-open-' + previousIndex)");
    expect(sheets).toContain("focusById('learning-lab-cheat-section-title-' + activeIndex + '-' + sections.length)");
    expect(sheets).toContain("focusById('learning-lab-cheat-bullet-' + activeIndex + '-' + sectionIndex + '-' + bullets.length)");
    expect(sheets).toContain("focusById(focusIndex === null ? 'learning-lab-cheat-new-title' : 'learning-lab-cheat-open-' + focusIndex)");
  });

  it('provides a real recovery control when an active record disappears', () => {
    expect(sheets).toContain("'Reference sheet unavailable'");
    expect(sheets).toContain("'This reference sheet is no longer available.'");
    expect(sheets).toContain("'Return to reference sheet list'");
  });

  it('uses descriptive visible destructive controls with 44-pixel targets', () => {
    expect(sheets).toContain("'Delete section'");
    expect(sheets).toContain("'Delete bullet'");
    expect(sheets).toContain("'Delete'");
    expect(sheets).toContain('minHeight: 44');
    expect(sheets).not.toContain("}, '×')");
  });

  it('formats saved dates without exposing invalid-date text', () => {
    expect(sheets).toContain("return 'Date not recorded'");
    expect(sheets).toContain("parsed.toLocaleDateString(undefined");
    expect(sheets).not.toContain('relDate(sheet.createdAt)');
  });

  it('updates both catalog descriptions and keeps the deployed mirror identical', () => {
    expect(source).toContain("label: 'Personal Reference Sheet Builder'");
    expect(source).toContain("desc: 'Create and edit personal reference sheets'");
    expect(source).toContain("'Create and edit personal reference sheets for topics you choose.'");
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
