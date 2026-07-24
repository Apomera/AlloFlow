import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Future-Self Letter accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalFutureSelf(props) {');
  const end = source.indexOf('  function PersonalDisclosure(props) {', start);
  const letters = source.slice(start, end);

  it('uses a named compose form with native submit behavior', () => {
    expect(letters).toContain("hh('form', { onSubmit: function(event) { event.preventDefault(); save(); }, 'aria-labelledby': 'learning-lab-future-form-heading' }");
    expect(letters).toContain("hh('button', { type: 'submit'");
    expect(letters).toContain("id: 'learning-lab-future-form-heading'");
  });

  it('associates visible labels with every compose field', () => {
    for (const id of ['to', 'from', 'body']) {
      expect(letters).toContain(`htmlFor: 'learning-lab-future-letter-${id}'`);
      expect(letters).toContain(`id: 'learning-lab-future-letter-${id}'`);
    }
    expect(letters).toContain("htmlFor: 'learning-lab-future-deliver-date'");
    expect(letters).toContain("id: 'learning-lab-future-deliver-date', type: 'date'");
  });

  it('identifies optional and required fields in visible labels', () => {
    expect(letters).toContain("'To (optional)'");
    expect(letters).toContain("'From (optional)'");
    expect(letters).toContain("'Letter body (required)'");
    expect(letters).toContain("'Open date (optional)'");
  });

  it('reports and focuses missing letter content inline', () => {
    expect(letters).toContain("setBodyError('Write a message to your future self before saving.')");
    expect(letters).toContain("focusById('learning-lab-future-letter-body')");
    expect(letters).toContain("id: 'learning-lab-future-letter-body-error', role: 'alert'");
    expect(letters).toContain("'aria-invalid': bodyError ? 'true' : undefined");
    expect(letters).not.toContain('alert(');
  });

  it('programmatically associates body instructions and errors', () => {
    expect(letters).toContain("id: 'learning-lab-future-letter-body-help'");
    expect(letters).toContain("'aria-describedby': bodyError ? 'learning-lab-future-letter-body-help learning-lab-future-letter-body-error'");
  });

  it('limits the opening date to today or later and explains today accurately', () => {
    expect(letters).toContain("type: 'date', min: today");
    expect(letters).toContain('Choosing today or leaving this blank makes it readable immediately.');
    expect(letters).toContain("form.deliverOn && form.deliverOn > today ? 'Save and seal letter' : 'Save unsealed letter'");
  });

  it('trims text values and preserves unrelated section data', () => {
    expect(letters).toContain('to: form.to.trim()');
    expect(letters).toContain('from: form.from.trim()');
    expect(letters).toContain('body: body');
    expect(letters).toContain("setData(Object.assign({}, data, { letters: [letter].concat(rawLetters) }))");
  });

  it('discloses local saving and sensitive reflection considerations', () => {
    expect(letters).toContain('Letters save in this browser and may contain private reflections');
    expect(letters).toContain('Use a device and account you trust.');
    expect(letters).toContain("'aria-describedby': 'learning-lab-future-deliver-help learning-lab-future-privacy-note'");
  });

  it('announces sealed and immediately readable save states accurately', () => {
    expect(letters).toContain("letter.deliverOn && letter.deliverOn > today ? 'Letter saved and sealed until '");
    expect(letters).toContain("'Letter saved and available to read.'");
  });

  it('uses the accessible app confirmation and only changes view after confirmed removal', () => {
    expect(letters).toContain("title: 'Remove this future-self letter?', confirmText: 'Remove letter'");
    expect(letters).toContain("if (!(await askLearningLabConfirmation");
    expect(letters).not.toContain('confirm(');
    expect(letters).not.toContain("remove(l.id); setView('list')");
  });

  it('announces removal and restores focus to the write action', () => {
    expect(letters).toContain("llAnnounce('Future-self letter removed.')");
    expect(letters).toContain("focusById('learning-lab-future-write-button')");
  });

  it('moves and restores focus across compose, list, and reading views', () => {
    expect(letters).toContain("focusById('learning-lab-future-letter-to')");
    expect(letters).toContain("focusById('learning-lab-future-reading-heading')");
    expect(letters).toContain("focusById('learning-lab-future-letter-' + previousId)");
  });

  it('announces compose, cancel, open, sealed, and back states', () => {
    expect(letters).toContain("llAnnounce('New future-self letter form opened.')");
    expect(letters).toContain("llAnnounce('Letter draft canceled.')");
    expect(letters).toContain("'Letter opened.'");
    expect(letters).toContain("'Letter is sealed until '");
    expect(letters).toContain("llAnnounce('Returned to future-self letters.')");
  });

  it('presents readable letters as labeled articles', () => {
    expect(letters).toContain("canRead ? hh('article', { 'aria-labelledby': 'learning-lab-future-reading-heading'");
    expect(letters).toContain("id: 'learning-lab-future-reading-heading', tabIndex: -1");
    expect(letters).toContain("hh('footer'");
  });

  it('presents sealed letters as named sections with machine-readable dates', () => {
    expect(letters).toContain("hh('section', { 'aria-labelledby': 'learning-lab-future-reading-heading'");
    expect(letters).toContain("hh('time', { dateTime: readingDeliverOn }");
    expect(letters).toContain("daysRemaining === 1 ? '' : 's'");
  });

  it('uses a named native-button group for reading actions', () => {
    expect(letters).toContain("role: 'group', 'aria-label': 'Letter reading actions'");
    expect(letters).toContain("onClick: backToList");
    expect(letters).toContain("onClick: function() { remove(readingLetter); }");
  });

  it('uses a semantic list of future-self letters', () => {
    expect(letters).toContain("hh('ul', { 'aria-label': 'Future-self letters'");
    expect(letters).toContain("return hh('li', { key: 'fl-' + letter.id }");
    expect(letters).toContain("writtenOn ? hh('time', { dateTime: writtenOn }, writtenOn) : 'on an unrecorded date'");
  });

  it('gives list items native button semantics and avoids click-only instructions', () => {
    expect(letters).toContain("id: 'learning-lab-future-letter-' + letter.id, type: 'button'");
    expect(letters).toContain("'Open letter'");
    expect(letters).not.toContain('click to read');
  });

  it('provides 44-pixel fields and controls', () => {
    expect(letters).toContain("width: '100%', minHeight: 44");
    expect(letters).toContain("minHeight: 44, padding: '9px 14px'");
    expect(letters).toContain("width: '100%', minHeight: 44, textAlign: 'left'");
  });

  it('handles malformed legacy letter data without crashing or NaN countdowns', () => {
    expect(letters).toContain('var rawLetters = Array.isArray(data.letters) ? data.letters : [];');
    expect(letters).toContain('var letters = rawLetters.filter(isRecord);');
    expect(letters).toContain("daysRemaining = Number.isFinite(sealedMs) ? Math.max(1, Math.ceil((sealedMs - new Date().getTime()) / 86400000)) : 0;");
    expect(letters).toContain("var writtenOn = textValue(letter.writtenOn).trim();");
    expect(source).toContain("stat: (Array.isArray((data.mytkFut || {}).letters) ? (data.mytkFut || {}).letters.length : 0) + ' letters'");
  });

  it('states that saving never sends or notifies anyone', () => {
    expect(letters).toContain('saving does not send them to or notify anyone');
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
