import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Parent or Guardian Message Builder accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalParentMessage(props) {');
  const end = source.indexOf('  function PersonalRecoveryKit(props) {', start);
  const messages = source.slice(start, end);

  it('starts with inclusive empty identity fields rather than assuming a recipient', () => {
    expect(messages).toContain("var emptyForm = { to: '', myName: '', body: '' }");
    expect(messages).not.toContain("{ to: 'Mom', body: '' }");
  });

  it('opens each template with an editable generated body and focus announcement', () => {
    expect(messages).toContain("body: generate(template, emptyForm)");
    expect(messages).toContain("setActiveType(template.id)");
    expect(messages).toContain("llAnnounce(template.label + ' template opened. Review and replace every bracketed placeholder.')");
    expect(messages).toContain("focusById('learning-lab-message-editor-heading')");
  });

  it('does not regenerate a deliberately cleared message body during render', () => {
    expect(messages).toContain("id: 'learning-lab-message-body', value: form.body");
    expect(messages).not.toContain('form.body || generate');
  });

  it('updates generated identity placeholders without overwriting edited prose', () => {
    expect(messages).toContain("if (form.body === generate(template, form)) next.body = generate(template, next)");
    expect(messages).toContain(".split('[Recipient]').join(values.to.trim() || '[Recipient]')");
    expect(messages).toContain(".split('[Your name]').join(values.myName.trim() || '[Your name]')");
  });

  it('uses a named editor form with native submit behavior', () => {
    expect(messages).toContain("onSubmit: function(event) { event.preventDefault(); save(activeTemplate); }");
    expect(messages).toContain("'aria-labelledby': 'learning-lab-message-editor-heading'");
    expect(messages).toContain("type: 'submit'");
  });

  it('associates visible labels with recipient, name, and required body fields', () => {
    expect(messages).toContain("htmlFor: 'learning-lab-message-recipient'");
    expect(messages).toContain("htmlFor: 'learning-lab-message-name'");
    expect(messages).toContain("htmlFor: 'learning-lab-message-body'");
    expect(messages).toContain("'Message body (required)'");
  });

  it('uses bounded native field constraints and autocomplete', () => {
    expect(messages).toContain("type: 'text', value: form.to, maxLength: 200");
    expect(messages).toContain("type: 'text', autoComplete: 'name', value: form.myName, maxLength: 200");
    expect(messages).toContain("rows: 16, required: true, maxLength: 10000");
  });

  it('reports and focuses an empty message body inline before saving', () => {
    expect(messages).toContain("setBodyError('Enter or keep message text before saving the draft.')");
    expect(messages).toContain("focusById('learning-lab-message-body')");
    expect(messages).toContain("id: 'learning-lab-message-body-error', role: 'alert'");
    expect(messages).toContain("'aria-invalid': bodyError ? 'true' : undefined");
  });

  it('preserves unrelated data when saving a draft', () => {
    expect(messages).toContain("setData(Object.assign({}, data, { drafts: [draft].concat(rawDrafts) }))");
    expect(messages).toContain("templateLabel: template.label");
    expect(messages).toContain("llAnnounce(template.label + ' draft saved in this browser.')");
  });

  it('confirms before discarding changes on return to templates', () => {
    expect(messages).toContain("title: 'Discard this message draft?', confirmText: 'Discard changes'");
    expect(messages).toContain('Return to the template list and discard the changes in this message?');
  });

  it('handles clipboard unavailability and failure with visible status and manual selection', () => {
    expect(messages).toContain("typeof navigator === 'undefined' || !navigator.clipboard");
    expect(messages).toContain('Clipboard access is unavailable. The message is selected');
    expect(messages).toContain("focusById('learning-lab-message-body', true)");
    expect(messages).toContain("Promise.resolve(navigator.clipboard.writeText(body)).then");
    expect(messages).toContain('.catch(function()');
  });

  it('uses nonblocking live copy feedback instead of alert', () => {
    expect(messages).toContain("role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true'");
    expect(messages).toContain("llAnnounce('Message copied to the clipboard.')");
    expect(messages).not.toContain("alert('Copied.');");
  });

  it('renders a usable fallback when an active template is unavailable', () => {
    expect(messages).toContain("if (!activeTemplate) {");
    expect(messages).toContain("'Message template unavailable'");
    expect(messages).not.toContain('setActiveType(null); return null;');
  });

  it('uses a semantic list of named template buttons with decorative icons hidden', () => {
    expect(messages).toContain("hh('ul', { 'aria-label': 'Parent or guardian message templates'");
    expect(messages).toContain("return hh('li', { key: 'pm-' + template.id }");
    expect(messages).toContain("type: 'button', onClick: function() { selectTemplate(template); }");
    expect(messages).toContain("hh('span', { 'aria-hidden': 'true'");
  });

  it('makes every template button a responsive 44-pixel target', () => {
    expect(messages).toContain("gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))'");
    expect(messages).toContain("width: '100%', minHeight: 44, height: '100%'");
  });

  it('renders saved drafts as a named semantic list of labeled articles', () => {
    expect(messages).toContain("'aria-labelledby': 'learning-lab-message-saved-heading'");
    expect(messages).toContain("hh('ul', { 'aria-label': 'Most recent saved message drafts'");
    expect(messages).toContain("hh('article', { 'aria-labelledby': headingId");
    expect(messages).toContain("hh('h3', { id: headingId");
  });

  it('uses time semantics and expandable preformatted draft review', () => {
    expect(messages).toContain("hh('time', { dateTime: textValue(draft.date).trim() || undefined }, relDate(textValue(draft.date).trim()))");
    expect(messages).toContain("hh('details'");
    expect(messages).toContain("minHeight: 44");
    expect(messages).toContain("whiteSpace: 'pre-wrap', overflowWrap: 'anywhere'");
  });

  it('confirms removal and restores saved-list focus', () => {
    expect(messages).toContain("title: 'Remove this saved draft?', confirmText: 'Remove draft'");
    expect(messages).toContain("setData(Object.assign({}, data, { drafts: rawDrafts.filter");
    expect(messages).toContain("llAnnounce('Saved message draft removed.')");
    expect(messages).toContain("focusById('learning-lab-message-saved-heading')");
  });

  it('gives each saved-draft removal control a contextual name and 44-pixel target', () => {
    expect(messages).toContain("'aria-label': 'Remove saved ' + label + ' draft'");
    expect(messages).toContain("minWidth: 44, minHeight: 44");
  });

  it('discloses browser storage and clipboard privacy', () => {
    expect(messages).toContain('Saved drafts stay in this browser.');
    expect(messages).toContain('Clipboard content may be available to other apps on this device');
    expect(messages).toContain("'aria-describedby': 'learning-lab-message-privacy-note'");
  });

  it('states that messages are not addressed, sent, or monitored', () => {
    expect(messages).toContain("'Text preparation only'");
    expect(messages).toContain('does not address, send, or monitor messages');
    expect(messages).toContain('contact local emergency or crisis services now');
  });

  it('avoids making a crisis-status assertion for the user', () => {
    expect(messages).not.toContain("I'm not in crisis");
    expect(messages).not.toContain('I am not in crisis');
    expect(messages).toContain('Change or remove any sentence that does not match your experience');
  });

  it('handles malformed legacy draft data without crashing', () => {
    expect(messages).toContain('var rawDrafts = Array.isArray(data.drafts) ? data.drafts : [];');
    expect(messages).toContain('var drafts = rawDrafts.filter(isRecord);');
    expect(source).toContain("stat: (Array.isArray((data.mytkParent || {}).drafts) ? (data.mytkParent || {}).drafts.length : 0) + ' drafts'");
  });

  it('synchronizes focus with rendered state, keeping the select-text behavior', () => {
    expect(messages).toContain('function focusById(id, selectText) { setPendingFocus({ id: id, select: !!selectText }); }');
    expect(messages).not.toContain('setTimeout');
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
