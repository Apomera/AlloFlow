import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Teacher Email Builder accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalTeacherEmail(props) {');
  const end = source.indexOf('  function PersonalBodyCheck(props) {', start);
  const email = source.slice(start, end);

  it('uses a named editor form with native submit behavior', () => {
    expect(email).toContain("onSubmit: function(event) { event.preventDefault(); save(activeTemplate); }");
    expect(email).toContain("'aria-labelledby': 'learning-lab-email-editor-heading'");
    expect(email).toContain("id: 'learning-lab-email-editor-heading', tabIndex: -1");
    expect(email).toContain("type: 'submit'");
  });

  it('associates visible labels with every editor field', () => {
    expect(email).toContain("htmlFor: 'learning-lab-email-teacher'");
    expect(email).toContain("id: 'learning-lab-email-teacher', type: 'text'");
    expect(email).toContain("htmlFor: 'learning-lab-email-name'");
    expect(email).toContain("id: 'learning-lab-email-name', type: 'text', autoComplete: 'name'");
    expect(email).toContain("htmlFor: 'learning-lab-email-class'");
    expect(email).toContain("id: 'learning-lab-email-class', type: 'text'");
    expect(email).toContain("htmlFor: 'learning-lab-email-body'");
  });

  it('visibly distinguishes optional identity fields and the required body', () => {
    expect(email).toContain("'Teacher name (optional)'");
    expect(email).toContain("'Your name (optional)'");
    expect(email).toContain("'Class (optional)'");
    expect(email).toContain("'Email body (required)'");
    expect(email).toContain("rows: 14, required: true, maxLength: 10000");
  });

  it('keeps an intentionally cleared body empty instead of regenerating the template', () => {
    expect(email).toContain("id: 'learning-lab-email-body', value: form.body");
    expect(email).not.toContain('form.body || generate');
  });

  it('reports and focuses an empty body inline for save and copy', () => {
    expect(email).toContain("setBodyError('Enter or keep email text before saving the draft.')");
    expect(email).toContain("setBodyError('Enter or keep email text before copying it.')");
    expect(email).toContain("focusById('learning-lab-email-body')");
    expect(email).toContain("id: 'learning-lab-email-body-error', role: 'alert'");
    expect(email).toContain("'aria-invalid': bodyError ? 'true' : undefined");
  });

  it('tells users to replace placeholders and review the message', () => {
    expect(email).toContain('Review and replace every bracketed placeholder.');
    expect(email).toContain('Replace every bracketed placeholder, check the tone and facts');
    expect(email).toContain('This tool prepares text only. It does not address, send, or submit an email.');
  });

  it('updates generated identity fields until the user edits the body', () => {
    expect(email).toContain('if (form.body === generate(template, form)) next.body = generate(template, next);');
    expect(email).toContain("updateIdentity('teacher', event.target.value, activeTemplate)");
    expect(email).toContain("updateIdentity('myName', event.target.value, activeTemplate)");
    expect(email).toContain("updateIdentity('class', event.target.value, activeTemplate)");
  });

  it('uses asynchronous clipboard feedback without blocking alerts', () => {
    expect(email).toContain('Promise.resolve(navigator.clipboard.writeText(body)).then(function()');
    expect(email).toContain("setCopyStatus('Email copied. Paste it into your email app");
    expect(email).toContain("role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true'");
    expect(email).not.toContain("alert('Copied");
  });

  it('provides keyboard instructions and selects the body when clipboard access fails', () => {
    expect(email).toContain('Clipboard access is unavailable. The email body is selected; use Control+C or Command+C');
    expect(email).toContain('The email could not be copied automatically. The body is selected; use Control+C or Command+C.');
    expect(email).toContain("focusById('learning-lab-email-body', true)");
    expect(email).toContain("if (pendingFocus.select && typeof target.select === 'function') target.select()");
  });

  it('confirms before discarding changed editor content', () => {
    expect(email).toContain("title: 'Discard this email draft?', confirmText: 'Discard changes'");
    expect(email).toContain('Return to the template list and discard the changes in this email?');
    expect(email).not.toContain('confirm(');
  });

  it('moves focus between the template chooser and editor headings', () => {
    expect(email).toContain("focusById('learning-lab-email-editor-heading')");
    expect(email).toContain("focusById('learning-lab-email-template-heading')");
  });

  it('trims saved body text and preserves unrelated section data', () => {
    expect(email).toContain('var body = form.body.trim();');
    expect(email).toContain('body: body');
    expect(email).toContain("setData(Object.assign({}, data, { saved: [entry].concat(rawSaved) }))");
  });

  it('announces saves and accurately describes local-only storage', () => {
    expect(email).toContain("llAnnounce(template.label + ' draft saved in this browser.')");
    expect(email).toContain('Saved drafts stay in this browser.');
    expect(email).toContain('Saved drafts stay in this browser and are not sent.');
  });

  it('warns about private clipboard and shared-device content', () => {
    expect(email).toContain('Clipboard content can be read by other apps on this device');
    expect(email).toContain('Remove drafts you no longer need, especially on a shared device.');
  });

  it('uses a named semantic list for template choices', () => {
    expect(email).toContain("'aria-labelledby': 'learning-lab-email-template-heading'");
    expect(email).toContain("hh('ul', { 'aria-label': 'Teacher email templates'");
    expect(email).toContain("return hh('li', { key: 'te-' + template.id }");
    expect(email).toContain("type: 'button', onClick: function() { selectTemplate(template); }");
  });

  it('marks template emoji decorative while retaining complete visible button text', () => {
    expect(email).toContain("hh('span', { 'aria-hidden': 'true'");
    expect(email).toContain("template.label");
    expect(email).toContain("template.prompt");
  });

  it('uses a named semantic list and labeled articles for saved drafts', () => {
    expect(email).toContain("'aria-labelledby': 'learning-lab-email-saved-heading'");
    expect(email).toContain("hh('ul', { 'aria-label': 'Most recent saved email drafts'");
    expect(email).toContain("return hh('li', { key: 'sd-' + draft.id }");
    expect(email).toContain("hh('article', { 'aria-labelledby': headingId");
  });

  it('shows complete saved draft text on request without forced truncation', () => {
    expect(email).toContain("hh('details'");
    expect(email).toContain("'Review full draft'");
    expect(email).toContain("textValue(draft.body).trim() || 'Empty draft'");
    expect(email).not.toContain("substring(0, 200) + '...'");
  });

  it('uses time semantics and explains the ten-draft display limit', () => {
    expect(email).toContain("hh('time', { dateTime: textValue(draft.date).trim() || undefined }, relDate(textValue(draft.date).trim()))");
    expect(email).toContain("'Showing the 10 most recent drafts out of ' + savedDrafts.length + '.'");
  });

  it('confirms deletion through the accessible app dialog', () => {
    expect(email).toContain("title: 'Remove this saved draft?', confirmText: 'Remove draft'");
    expect(email).toContain('This cannot be undone.');
  });

  it('names deletion controls, preserves data, announces removal, and restores focus', () => {
    expect(email).toContain("'aria-label': 'Remove saved ' + label + ' draft'");
    expect(email).toContain("setData(Object.assign({}, data, { saved: rawSaved.filter");
    expect(email).toContain("llAnnounce('Saved email draft removed.')");
    expect(email).toContain("focusById('learning-lab-email-saved-heading')");
  });

  it('uses responsive editor fields and 44-pixel controls', () => {
    expect(email).toContain("gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))'");
    expect(email).toContain("width: '100%', minHeight: 44");
    expect(email).toContain("minWidth: 44, minHeight: 44");
    expect(email).toContain("minHeight: 260");
  });

  it('handles malformed legacy draft data without crashing', () => {
    expect(email).toContain('var rawSaved = Array.isArray(data.saved) ? data.saved : [];');
    expect(email).toContain('var savedDrafts = rawSaved.filter(isRecord);');
    expect(source).toContain("stat: (Array.isArray((data.mytkEmail || {}).saved) ? (data.mytkEmail || {}).saved.length : 0) + ' drafts'");
  });

  it('synchronizes focus with rendered state, keeping the select-text behavior', () => {
    expect(email).toContain('function focusById(id, selectText) { setPendingFocus({ id: id, select: !!selectText }); }');
    expect(email).toContain('if (pendingFocus.select && typeof target.select === ' + String.fromCharCode(39) + 'function' + String.fromCharCode(39) + ') target.select();');
    expect(email).not.toContain('setTimeout');
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
