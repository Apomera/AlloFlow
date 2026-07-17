import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Cheat-Sheet Builder accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalCheatSheets(props) {');
  const end = source.indexOf('  function PersonalAskTracker(props) {', start);
  const sheets = source.slice(start, end);

  it('uses a named creation form with a submit control', () => {
    expect(sheets).toContain("onSubmit: function(event) { event.preventDefault(); createSheet(); }");
    expect(sheets).toContain("'aria-labelledby': 'learning-lab-cheat-new-heading'");
    expect(sheets).toContain("hh('button', { type: 'submit'");
  });

  it('provides a visible label for the required topic field', () => {
    expect(sheets).toContain("htmlFor: 'learning-lab-cheat-new-title'");
    expect(sheets).toContain("id: 'learning-lab-cheat-new-title', type: 'text'");
    expect(sheets).toContain('required: true, maxLength: 240');
  });

  it('reports and focuses a missing topic inline', () => {
    expect(sheets).toContain("setTitleError('Enter a topic for the cheat sheet.')");
    expect(sheets).toContain("focusById('learning-lab-cheat-new-title')");
    expect(sheets).toContain("id: 'learning-lab-cheat-title-error', role: 'alert'");
    expect(sheets).toContain("'aria-invalid': titleError ? 'true' : undefined");
  });

  it('preserves unrelated section data for all sheet updates', () => {
    expect(sheets).toContain("setData(Object.assign({}, data, { sheets: [sheet].concat(data.sheets || []) }))");
    expect(sheets).toContain("setData(Object.assign({}, data, {");
    expect(sheets).toContain("setData(Object.assign({}, data, { sheets: (data.sheets || []).filter");
  });

  it('confirms sheet, section, and nonempty bullet deletion in app dialogs', () => {
    expect(sheets).toContain("title: 'Delete this cheat sheet?', confirmText: 'Delete cheat sheet'");
    expect(sheets).toContain("title: 'Delete this section?', confirmText: 'Delete section'");
    expect(sheets).toContain("title: 'Delete this bullet?', confirmText: 'Delete bullet'");
    expect(sheets).not.toContain('confirm(');
  });

  it('labels editable section titles', () => {
    expect(sheets).toContain("htmlFor: 'learning-lab-cheat-section-title-' + section.id");
    expect(sheets).toContain("id: 'learning-lab-cheat-section-title-' + section.id");
    expect(sheets).toContain("'Section ' + (sectionIndex + 1) + ' title'");
  });

  it('labels every editable bullet with section context', () => {
    expect(sheets).toContain("var bulletId = 'learning-lab-cheat-bullet-' + section.id + '-' + bulletIndex");
    expect(sheets).toContain("htmlFor: bulletId");
    expect(sheets).toContain("'Bullet ' + (bulletIndex + 1) + ' in '");
  });

  it('uses semantic lists for sheets, sections, and bullets', () => {
    expect(sheets).toContain("hh('ul', { 'aria-label': 'Saved cheat sheets'");
    expect(sheets).toContain("hh('ol', { 'aria-label': 'Cheat sheet sections'");
    expect(sheets).toContain("hh('ul', { 'aria-label': 'Bullets in '");
    expect(sheets).toContain("hh('article', { 'aria-labelledby': 'learning-lab-cheat-sheet-' + sheet.id }");
  });

  it('exposes editor actions as a named toolbar', () => {
    expect(sheets).toContain("role: 'toolbar', 'aria-label': 'Cheat sheet actions'");
    expect(sheets).toContain("'aria-label': 'Print cheat sheet: ' + activeSheet.title");
  });

  it('moves focus into the editor and restores it on return', () => {
    expect(sheets).toContain("focusById('learning-lab-cheat-editor-heading')");
    expect(sheets).toContain("id: 'learning-lab-cheat-editor-heading', tabIndex: -1");
    expect(sheets).toContain("focusById('learning-lab-cheat-open-' + previousId)");
  });

  it('focuses newly added sections and bullets', () => {
    expect(sheets).toContain("focusById('learning-lab-cheat-section-title-' + section.id)");
    expect(sheets).toContain("focusById('learning-lab-cheat-bullet-' + section.id + '-' + nextIndex)");
  });

  it('restores focus after section and bullet deletion', () => {
    expect(sheets).toContain("focusById('learning-lab-cheat-add-section')");
    expect(sheets).toContain("focusById('learning-lab-cheat-add-bullet-' + section.id)");
  });

  it('announces creation and structural changes', () => {
    expect(sheets).toContain("llAnnounce('Cheat sheet created: '");
    expect(sheets).toContain("llAnnounce('Section added.')");
    expect(sheets).toContain("llAnnounce('Bullet added to '");
    expect(sheets).toContain("llAnnounce('Cheat sheet deleted.')");
  });

  it('provides named 44-pixel destructive and open controls', () => {
    expect(sheets).toContain("'aria-label': 'Delete cheat sheet: ' + sheet.title");
    expect(sheets).toContain("'aria-label': 'Delete section: '");
    expect(sheets).toContain("'aria-label': 'Delete bullet '");
    expect(sheets).toContain('minWidth: 44, minHeight: 44');
    expect(sheets).toContain("width: '100%', minHeight: 44");
  });

  it('exposes guidance as a named aside', () => {
    expect(sheets).toContain("hh('aside', { 'aria-label': 'Why building cheat sheets works'");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('prismflow-deploy/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
