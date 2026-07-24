import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Communication Preferences accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalCommStyle(props) {');
  const end = source.indexOf('  function PersonalToolkitExport(props) {', start);
  const section = source.slice(start, end);

  it('frames preferences as contextual rather than personality types', () => {
    expect(section).toContain('Preferences are contextual, not personality types');
    expect(section).toContain('You may prefer both options, neither option, or different options at different times.');
  });

  it('states assessment and conflict-explanation boundaries', () => {
    expect(section).toContain('is not an assessment, diagnosis, conflict explanation, or instruction for other people');
    expect(section).toContain('No option is better, more effective, or more neurotypical than another.');
  });

  it('removes stereotypical claims about neurodivergent communication', () => {
    expect(section).not.toContain('Especially valuable for autistic + ADHD students');
    expect(section).not.toContain('neurotypical defaults');
    expect(section).not.toContain("Most conflicts aren't about content");
  });

  it('discloses local storage and lack of automatic sharing', () => {
    expect(section).toContain('It does not share anything automatically.');
    expect(section).toContain('Preferences save in this browser; avoid sensitive details on a shared device.');
  });

  it('uses descriptive nonbinary dimension names', () => {
    expect(section).toContain("label: 'Message wording'");
    expect(section).toContain("label: 'Information format'");
    expect(section).toContain("label: 'Information emphasis'");
    expect(section).toContain("label: 'Response timing'");
  });

  it('replaces inaccessible precision sliders with native radio groups', () => {
    expect(section).toContain("hh('fieldset'");
    expect(section).toContain("hh('legend'");
    expect(section).toContain("type: 'radio', name: 'learning-lab-communication-' + dimension.id");
    expect(section).not.toContain("type: 'range'");
  });

  it('offers five clearly worded choices including contextual variation', () => {
    expect(section).toContain("{ value: 1, prefix: 'Prefer ' }");
    expect(section).toContain("{ value: 5, label: 'Depends on the context, or no single preference' }");
    expect(section).toContain("{ value: 9, prefix: 'Prefer ' }");
  });

  it('does not invent a default preference for an untouched dimension', () => {
    expect(section).toContain("var current = hasOwn(dimension.id) ? normalizedValue(prof[dimension.id]) : null");
    expect(section).not.toContain("var val = prof[d.id] || 5");
  });

  it('maps existing 1–10 profile data into the accessible choices', () => {
    expect(section).toContain('function normalizedValue(value)');
    expect(section).toContain('if (number <= 2) return 1');
    expect(section).toContain('if (number <= 8) return 7');
  });

  it('associates every radio with visible group help', () => {
    expect(section).toContain("'aria-describedby': helpId");
    expect(section).toContain("htmlFor: id");
  });

  it('provides visible selected state text', () => {
    expect(section).toContain("selected ? hh('span'");
    expect(section).toContain("}, 'Selected')");
  });

  it('uses responsive 44-pixel radio targets', () => {
    expect(section).toContain("gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))'");
    expect(section).toContain("minHeight: 44, padding: 9");
  });

  it('announces saved dimension preferences with context', () => {
    expect(section).toContain("dimension.label + ' preference saved: '");
  });

  it('preserves unrelated component data on every profile save', () => {
    expect(section).toContain("setData(Object.assign({}, data, { profile: next }))");
    expect(section).not.toContain("setData({ profile:");
  });

  it('uses native checkboxes for optional requests', () => {
    expect(section).toContain("type: 'checkbox', checked: checked");
    expect(section).toContain("htmlFor: id");
    expect(section).not.toContain("return hh('button', { key: 'ak-'");
  });

  it('provides visible selected and not-selected request states', () => {
    expect(section).toContain("checked ? 'Selected' : 'Not selected'");
  });

  it('uses autonomy-supportive request wording', () => {
    expect(section).toContain('It helps me when the main point and request are stated explicitly.');
    expect(section).toContain('Select, adapt, or ignore these suggestions.');
    expect(section).not.toContain("Don't ask me to read between the lines.");
  });

  it('warns that requests may not fit every setting', () => {
    expect(section).toContain('A request may not be possible, safe, or appropriate in every relationship or setting.');
  });

  it('announces native request selection changes', () => {
    expect(section).toContain("checked ? ' Selected.' : ' Not selected.'");
  });

  it('offers a visibly labeled bounded custom wording field', () => {
    expect(section).toContain("htmlFor: 'learning-lab-communication-custom'");
    expect(section).toContain("rows: 4, maxLength: 4000");
    expect(section).toContain('This saves automatically in this browser.');
  });

  it('always exposes a named semantic summary section', () => {
    expect(section).toContain("'aria-labelledby': 'learning-lab-communication-summary-heading'");
    expect(section).toContain("id: 'learning-lab-communication-summary-heading'");
    expect(section).toContain('No preferences or requests saved yet.');
  });

  it('states that the summary is reviewable and not automatically shared', () => {
    expect(section).toContain('Review and adapt this text before sharing.');
    expect(section).toContain('The tool does not send, print, or share it automatically.');
  });

  it('builds a plain-text summary with explicit no-selection states', () => {
    expect(section).toContain("return 'No preference saved.'");
    expect(section).toContain("lines.push('No suggested requests selected.')");
    expect(section).toContain("lines.push('', 'My own wording:'");
  });

  it('provides the summary in a labeled selectable textarea', () => {
    expect(section).toContain("htmlFor: 'learning-lab-communication-summary'");
    expect(section).toContain("id: 'learning-lab-communication-summary', value: summaryText(), readOnly: true");
  });

  it('supports asynchronous copying and manual fallback', () => {
    expect(section).toContain("typeof navigator === 'undefined' || !navigator.clipboard");
    expect(section).toContain('Promise.resolve(navigator.clipboard.writeText(text))');
    expect(section).toContain("focusById(id, true)");
  });

  it('reports copy outcomes inline without blocking alerts', () => {
    expect(section).toContain("role: 'status', 'aria-live': 'polite'");
    expect(section).toContain('Summary copied. Review and adapt it before sharing.');
    expect(section).not.toContain('alert(');
  });

  it('confirms before clearing all saved preferences', () => {
    expect(section).toContain("title: 'Clear communication preferences?', confirmText: 'Clear preferences'");
    expect(section).toContain("if (!accepted) return;");
  });

  it('disables clearing when nothing has been saved', () => {
    expect(section).toContain('disabled: !hasProfile()');
    expect(section).toContain("cursor: hasProfile() ? 'pointer' : 'not-allowed'");
  });

  it('announces clearing and restores preferences-heading focus', () => {
    expect(section).toContain("saveProfile({}, 'Communication preferences cleared.')");
    expect(section).toContain("focusById('learning-lab-communication-preferences-heading')");
  });

  it('wraps long user-authored and summary text', () => {
    expect(section).toContain("whiteSpace: 'pre-wrap', overflowWrap: 'anywhere'");
    expect(section).toContain("resize: 'vertical'");
  });

  it('uses 44-pixel buttons and fields', () => {
    expect(section).toContain('minWidth: 44, minHeight: 44');
    expect(section).toContain("width: '100%', minHeight: 44");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
