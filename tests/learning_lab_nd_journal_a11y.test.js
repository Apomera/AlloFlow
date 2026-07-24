import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Neurodivergence Journal accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalNDJournal(props) {');
  const end = source.indexOf('  function PersonalLifeMap(props) {', start);
  const journal = source.slice(start, end);

  it('supports user-chosen identity language without claiming one consensus', () => {
    expect(journal).toContain('Use identity-first, person-first, community-specific, questioning, or other language');
    expect(journal).toContain('according to your own preference');
    expect(journal).not.toContain('community consensus');
  });

  it('uses a named explicit form for identity saving', () => {
    expect(journal).toContain("onSubmit: function(event) { event.preventDefault(); saveIdentity(); }");
    expect(journal).toContain("'aria-labelledby': 'learning-lab-nd-identity-heading'");
    expect(journal).toContain("}, 'Save identity language')");
  });

  it('associates a visible label and help with the bounded identity field', () => {
    expect(journal).toContain("htmlFor: 'learning-lab-nd-identity'");
    expect(journal).toContain("maxLength: 1000");
    expect(journal).toContain("'aria-describedby': 'learning-lab-nd-identity-help'");
  });

  it('preserves unrelated data and announces identity saving', () => {
    expect(journal).toContain("setData(Object.assign({}, data, { identity: identity }))");
    expect(journal).toContain("llAnnounce(identity ? 'Identity language saved in this browser.' : 'Saved identity language cleared.')");
  });

  it('uses a named native-submit journal form', () => {
    expect(journal).toContain("onSubmit: function(event) { event.preventDefault(); saveEntry(); }");
    expect(journal).toContain("'aria-labelledby': 'learning-lab-nd-entry-heading'");
    expect(journal).toContain("}, 'Save journal entry')");
  });

  it('uses a visibly labeled native optional topic selector', () => {
    expect(journal).toContain("htmlFor: 'learning-lab-nd-topic'");
    expect(journal).toContain("id: 'learning-lab-nd-topic'");
    expect(journal).toContain("hh('option', { value: '' }, 'No topic selected')");
    expect(journal).not.toContain("form.topic === t.id");
  });

  it('associates a visible required label and help with the journal body', () => {
    expect(journal).toContain("htmlFor: 'learning-lab-nd-entry-text'");
    expect(journal).toContain("rows: 6, required: true, maxLength: 10000");
    expect(journal).toContain("'aria-describedby': 'learning-lab-nd-entry-help'");
  });

  it('reports and focuses an empty journal entry inline without alert', () => {
    expect(journal).toContain("setTextError('Enter journal text before saving.')");
    expect(journal).toContain("id: 'learning-lab-nd-entry-error', role: 'alert'");
    expect(journal).toContain("focusById('learning-lab-nd-entry-text')");
    expect(journal).not.toContain("alert('Need some text.')");
  });

  it('preserves unrelated data and announces entry saving', () => {
    expect(journal).toContain("setData(Object.assign({}, data, { entries: [entry].concat(data.entries || []) }))");
    expect(journal).toContain("llAnnounce('Journal entry saved in this browser.')");
  });

  it('discloses local sensitive-data storage and lack of monitoring', () => {
    expect(journal).toContain('Entries save in this browser and are not monitored.');
    expect(journal).toContain('Avoid private details on a shared device.');
    expect(journal).toContain('contact local emergency or crisis services now');
  });

  it('uses a named semantic history list with labeled articles', () => {
    expect(journal).toContain("'aria-labelledby': 'learning-lab-nd-history-heading'");
    expect(journal).toContain("hh('ul', { 'aria-label': 'Most recent neurodivergence journal entries'");
    expect(journal).toContain("hh('article', { 'aria-labelledby': headingId");
    expect(journal).toContain("hh('h3', { id: headingId");
  });

  it('marks topic icons decorative and retains topic text', () => {
    expect(journal).toContain("hh('span', { 'aria-hidden': 'true' }, topic.icon + ' ')");
    expect(journal).toContain('topic.label');
  });

  it('uses machine-readable time semantics and readable timestamps', () => {
    expect(journal).toContain('function entryDateTime(entry)');
    expect(journal).toContain("hh('time', { dateTime: entryDateTime(entry) }, entryDateLabel(entry))");
  });

  it('preserves journal whitespace and wraps long content', () => {
    expect(journal).toContain("whiteSpace: 'pre-wrap', overflowWrap: 'anywhere'");
  });

  it('confirms removal while preserving unrelated data', () => {
    expect(journal).toContain("title: 'Remove this journal entry?', confirmText: 'Remove entry'");
    expect(journal).toContain('This cannot be undone.');
    expect(journal).toContain("setData(Object.assign({}, data, { entries: (data.entries || []).filter");
  });

  it('names removal controls, announces removal, and restores focus', () => {
    expect(journal).toContain("'aria-label': 'Remove journal entry: ' + topic.label");
    expect(journal).toContain("llAnnounce('Journal entry removed.')");
    expect(journal).toContain("focusById('learning-lab-nd-history-heading')");
  });

  it('uses 44-pixel fields and controls', () => {
    expect(journal).toContain("width: '100%', minHeight: 44");
    expect(journal).toContain("minWidth: 44, minHeight: 44");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
