import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Open Letter accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalOpenLetter(props) {');
  const end = source.indexOf('  function PersonalHighlights(props) {', start);
  const letters = source.slice(start, end);

  it('states that letters are neither sent nor monitored', () => {
    expect(letters).toContain('does not address, deliver, or monitor letters');
    expect(letters).toContain('without sending it from this tool');
  });

  it('avoids guaranteed therapeutic or health-benefit claims', () => {
    expect(letters).toContain('Writing may or may not feel useful');
    expect(letters).toContain('not a substitute for health or crisis support');
    expect(letters).not.toContain('measurable health + mood benefits');
  });

  it('accurately discloses local browser exposure', () => {
    expect(letters).toContain('Saved letters remain in this browser and are not encrypted as a private journal.');
    expect(letters).toContain('Anyone with access to this browser profile may be able to read them.');
    expect(letters).not.toContain('Save (private)');
  });

  it('uses a named form with native submit behavior', () => {
    expect(letters).toContain("onSubmit: function(event) { event.preventDefault(); save(); }");
    expect(letters).toContain("'aria-labelledby': 'learning-lab-open-letter-form-heading'");
    expect(letters).toContain("type: 'submit'");
  });

  it('associates visible labels with recipient, context, and body fields', () => {
    expect(letters).toContain("htmlFor: 'learning-lab-open-letter-to'");
    expect(letters).toContain("htmlFor: 'learning-lab-open-letter-context'");
    expect(letters).toContain("htmlFor: 'learning-lab-open-letter-body'");
  });

  it('uses native requirements and bounded field lengths', () => {
    expect(letters).toContain("maxLength: 500");
    expect(letters).toContain("maxLength: 1000");
    expect(letters).toContain("rows: 12, required: true, maxLength: 20000");
  });

  it('reports and focuses an empty letter inline without alert', () => {
    expect(letters).toContain("setBodyError('Enter letter text before saving.')");
    expect(letters).toContain("id: 'learning-lab-open-letter-body-error', role: 'alert'");
    expect(letters).toContain("focusById('learning-lab-open-letter-body')");
    expect(letters).not.toContain("alert('Need letter text.')");
  });

  it('preserves unrelated data and trims saved values', () => {
    expect(letters).toContain("to: form.to.trim(), context: form.context.trim(), body: body");
    expect(letters).toContain("setData(Object.assign({}, data, { letters: [letter].concat(data.letters || []) }))");
  });

  it('announces saving and restores form focus', () => {
    expect(letters).toContain("llAnnounce('Unsent letter saved in this browser.')");
    expect(letters).toContain("focusById('learning-lab-open-letter-to')");
  });

  it('uses a named semantic letter list with labeled articles', () => {
    expect(letters).toContain("'aria-labelledby': 'learning-lab-open-letter-history-heading'");
    expect(letters).toContain("hh('ul', { 'aria-label': 'Most recent saved unsent letters'");
    expect(letters).toContain("hh('article', { 'aria-labelledby': headingId");
    expect(letters).toContain("hh('h3', { id: headingId");
  });

  it('uses time semantics and explicit recipient text', () => {
    expect(letters).toContain("hh('time', { dateTime: letter.date || undefined }, relDate(letter.date))");
    expect(letters).toContain("'Letter to: ' + recipient");
    expect(letters).toContain("'No recipient specified'");
  });

  it('collapses sensitive letter content behind a keyboard-operable disclosure', () => {
    expect(letters).toContain("hh('details'");
    expect(letters).toContain("}, 'Review full letter')");
    expect(letters).toContain("alignItems: 'center', minHeight: 44");
  });

  it('preserves letter whitespace and wraps long text', () => {
    expect(letters).toContain("whiteSpace: 'pre-wrap', overflowWrap: 'anywhere'");
  });

  it('confirms removal while preserving unrelated data', () => {
    expect(letters).toContain("title: 'Remove this letter?', confirmText: 'Remove letter'");
    expect(letters).toContain('This cannot be undone.');
    expect(letters).toContain("setData(Object.assign({}, data, { letters: (data.letters || []).filter");
  });

  it('names removal controls, announces removal, and restores focus', () => {
    expect(letters).toContain("'aria-label': 'Remove unsent letter to ' + recipient");
    expect(letters).toContain("llAnnounce('Saved unsent letter removed.')");
    expect(letters).toContain("focusById('learning-lab-open-letter-history-heading')");
  });

  it('uses 44-pixel fields and controls', () => {
    expect(letters).toContain("width: '100%', minHeight: 44");
    expect(letters).toContain("minWidth: 44, minHeight: 44");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
