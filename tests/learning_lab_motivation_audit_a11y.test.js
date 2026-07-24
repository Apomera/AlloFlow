import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Motivation Reflection revised accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalMotivationAudit(props) {');
  const end = source.indexOf('  function PersonalLearningProfile(props) {', start);
  const audit = source.slice(start, end);

  it('uses stable headings and effect-based focus restoration', () => {
    for (const id of ['learning-lab-motivation-heading', 'learning-lab-motivation-form-heading', 'learning-lab-motivation-history-heading']) expect(audit).toContain("'" + id + "'");
    expect(audit).toContain('document.getElementById(focusTarget)');
    expect(audit).not.toContain('setTimeout(function()');
  });

  it('uses optional private-reflection framing without ability judgments', () => {
    expect(audit).toContain('An optional self-reflection using autonomy, competence, and relatedness concepts');
    expect(audit).toContain('Responses save in this browser.');
    expect(audit).toContain('not judgments about ability or character');
  });

  it('uses a native named form with a bounded required activity field', () => {
    expect(audit).toContain("hh('form', { 'aria-labelledby': 'learning-lab-motivation-form-heading'");
    expect(audit).toContain("id: 'learning-lab-motivation-activity', type: 'text', value: form.activity, required: true, maxLength: 240");
    expect(audit).toContain("type: 'submit', 'data-ll-focusable': true");
  });

  it('provides inline validation, announcement, and error focus', () => {
    expect(audit).toContain("setFormError('Enter an activity or context before saving.')");
    expect(audit).toContain("id: 'learning-lab-motivation-error', role: 'alert'");
    expect(audit).toContain("setFocusTarget('learning-lab-motivation-activity')");
    expect(audit).toContain("llAnnounce('An activity or context is required.')");
  });

  it('labels and describes subjective rating controls with explicit units', () => {
    expect(audit).toContain("htmlFor: 'learning-lab-motivation-' + dimension.id");
    expect(audit).toContain("id: 'learning-lab-motivation-' + dimension.id, type: 'range'");
    expect(audit).toContain("'aria-describedby': 'learning-lab-motivation-help-' + dimension.id + ' learning-lab-motivation-scale-help'");
    expect(audit).toContain("'aria-valuetext': form[dimension.id] + ' out of 10'");
    expect(audit).toContain("hh('span', { 'aria-hidden': 'true' }, dimension.icon + ' ')");
  });

  it('does not add dimensions into an unsupported motivation total', () => {
    expect(audit).toContain('The ratings are not added into a diagnostic or motivation score.');
    expect(audit).not.toContain('var total =');
    expect(audit).not.toContain("tot + '/30'");
    expect(audit).not.toContain("'total ' + tot + ' out of 30'");
  });

  it('bounds and describes optional notes', () => {
    expect(audit).toContain("id: 'learning-lab-motivation-notes', value: form.notes, rows: 3, maxLength: 2000");
    expect(audit).toContain("'aria-describedby': 'learning-lab-motivation-notes-help'");
  });

  it('handles tied lowest ratings and frames ideas as optional and generic', () => {
    expect(audit).toContain('var lowestDimensions = DIMENSIONS.filter');
    expect(audit).toContain('Optional ideas related to the lowest current ratings');
    expect(audit).toContain('These generic ideas are not personalized recommendations.');
    expect(audit).toContain('Skip anything that does not fit your situation, access needs, or safety.');
    expect(audit).not.toContain('To boost your weakest');
  });

  it('uses non-pressuring suggestion language', () => {
    expect(audit).toContain('Identify one part you can choose, if any.');
    expect(audit).toContain('if a supportive person is available');
    expect(audit).not.toContain('Pick ONE');
    expect(audit).not.toContain('Compare to your past self');
    expect(audit).not.toContain('Worth flagging to a supportive adult');
  });

  it('preserves sibling state on save and delete and announces both outcomes', () => {
    expect(audit).toContain("setData(Object.assign({}, data, { audits: [entry].concat(data.audits || []) }))");
    expect(audit).toContain("setData(Object.assign({}, data, { audits: remaining }))");
    expect(audit).toContain("llAnnounce('Motivation reflection saved.')");
    expect(audit).toContain("llAnnounce('Motivation reflection deleted.')");
    expect(audit).not.toContain('setData({ audits:');
  });

  it('uses semantic history with dates, explicit units, and safe wrapping', () => {
    expect(audit).toContain("'aria-labelledby': 'learning-lab-motivation-history-heading'");
    expect(audit).toContain("hh('time', { dateTime: entry.date }");
    expect(audit).toContain("entry[dimension.id] + ' out of 10'");
    expect(audit).toContain("whiteSpace: 'pre-wrap', overflowWrap: 'anywhere'");
  });

  it('confirms deletion and restores meaningful focus', () => {
    expect(audit).toContain("title: 'Delete this motivation reflection?', confirmText: 'Delete reflection'");
    expect(audit).toContain("remaining.length ? 'learning-lab-motivation-history-heading' : 'learning-lab-motivation-activity'");
  });

  it('qualifies theory claims and updates catalog copy', () => {
    expect(audit).toContain("'aria-labelledby': 'learning-lab-motivation-evidence-heading'");
    expect(audit).toContain('Effects and interpretations vary across people and contexts.');
    expect(audit).toContain('not a validated questionnaire, diagnosis, prediction of disengagement, or guarantee');
    expect(audit).not.toContain('largest accumulated evidence of any motivation framework');
    expect(source).toContain('Optional reflection using autonomy, competence, and relatedness concepts.');
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
