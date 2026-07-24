import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Self-Assessment accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalSelfAssessment(props) {');
  const end = source.indexOf('  function PersonalLearningContract(props) {', start);
  const assessment = source.slice(start, end);

  it('uses a named form with an always-available native submit action', () => {
    expect(assessment).toContain("onSubmit: function(event) { event.preventDefault(); save(); }");
    expect(assessment).toContain("'aria-labelledby': 'learning-lab-assessment-form-heading'");
    expect(assessment).toContain("type: 'submit'");
    expect(assessment).toContain("'Save reflection snapshot'");
  });

  it('uses fieldsets and legends for each question', () => {
    expect(assessment).toContain("return hh('fieldset', { key: 'q-' + question.id");
    expect(assessment).toContain("hh('legend', { style: legendStyle }");
    expect(assessment).toContain("(questionIndex + 1) + '. ' + question.text");
  });

  it('uses native required radio groups with unique names and labels', () => {
    expect(assessment).toContain("type: 'radio', name: 'learning-lab-assessment-' + question.id");
    expect(assessment).toContain('required: true, checked: selected');
    expect(assessment).toContain('htmlFor: optionId');
  });

  it('provides a visible named progress element', () => {
    expect(assessment).toContain("var progressText = answeredCount + ' of ' + QUESTIONS.length + ' questions answered.'");
    expect(assessment).toContain("htmlFor: 'learning-lab-assessment-progress'");
    expect(assessment).toContain("hh('progress', { id: 'learning-lab-assessment-progress', value: answeredCount, max: QUESTIONS.length");
  });

  it('reports incomplete submission in an alert and focuses the first missing group', () => {
    expect(assessment).toContain("llAnnounce('Snapshot not saved. Answer all 12 questions. ' + missing.length + ' remaining.')");
    expect(assessment).toContain("focusById('learning-lab-assessment-question-' + missing[0])");
    expect(assessment).toContain("missingIds.length > 0 ? hh('div', { role: 'alert'");
  });

  it('marks missing fieldsets invalid and gives each an inline error', () => {
    expect(assessment).toContain("'aria-invalid': missing ? 'true' : undefined");
    expect(assessment).toContain("'aria-describedby': missing ? questionId + '-error' : undefined");
    expect(assessment).toContain("'Choose one response for this question.'");
  });

  it('clears a question error when that question is answered', () => {
    expect(assessment).toContain("setMissingIds(missingIds.filter(function(id) { return id !== questionId; }))");
  });

  it('frames the activity as variable reflection rather than a learning-style test', () => {
    expect(assessment).toContain('A reflection, not a test or diagnosis');
    expect(assessment).toContain('Preferences and needs can change by task, setting, and day.');
    expect(assessment).toContain('does not assign a learning style, score, or label.');
  });

  it('uses current-pattern wording rather than fixed learner traits', () => {
    expect(assessment).toContain('A way I often like to explore new information is…');
    expect(assessment).toContain('A barrier that affects my learning lately is…');
    expect(assessment).toContain('A strength I notice in myself as a learner is…');
    expect(assessment).not.toContain('I learn best when I can...');
  });

  it('discloses local storage and shared-device privacy considerations', () => {
    expect(assessment).toContain('Snapshots save in this browser only; saving does not send them to or notify anyone.');
    expect(assessment).toContain('if other people use this device.');
    expect(assessment).toContain("'aria-describedby': 'learning-lab-assessment-privacy-note'");
  });

  it('copies answer state and preserves unrelated section data when saving', () => {
    expect(assessment).toContain('answers: Object.assign({}, answers)');
    expect(assessment).toContain("setData(Object.assign({}, data, { assessments: [entry].concat(rawAssessments) }))");
  });

  it('announces a save and moves focus to history', () => {
    expect(assessment).toContain("llAnnounce('Learning reflection snapshot saved.')");
    expect(assessment).toContain("focusById('learning-lab-assessment-history-heading')");
  });

  it('uses a named semantic history list with labeled articles', () => {
    expect(assessment).toContain("'aria-labelledby': 'learning-lab-assessment-history-heading'");
    expect(assessment).toContain("hh('ul', { 'aria-label': 'Most recent learning reflection snapshots'");
    expect(assessment).toContain("return hh('li', { key: 'sa-' + entry.id }");
    expect(assessment).toContain("hh('article', { 'aria-labelledby': headingId");
  });

  it('uses time semantics for saved snapshot headings', () => {
    expect(assessment).toContain("hh('time', { dateTime: textValue(entry.date).trim() || undefined }, relDate(textValue(entry.date).trim()))");
  });

  it('exposes every saved response in a definition list', () => {
    expect(assessment).toContain("'Review all responses'");
    expect(assessment).toContain("hh('dl', { 'aria-label': 'Learning reflection responses'");
    expect(assessment).toContain("textValue((entry.answers && typeof entry.answers === 'object' ? entry.answers : {})[question.id]).trim() || 'No response recorded'");
    expect(assessment).not.toContain("'Top: '");
  });

  it('explains the 20-snapshot history limit', () => {
    expect(assessment).toContain('var recentAssessments = assessments.slice(0, 20);');
    expect(assessment).toContain("'Showing the 20 most recent snapshots out of ' + assessments.length + '.'");
  });

  it('confirms deletion through the accessible app dialog', () => {
    expect(assessment).toContain("title: 'Remove this reflection snapshot?', confirmText: 'Remove snapshot'");
    expect(assessment).toContain('This cannot be undone.');
    expect(assessment).not.toContain('confirm(');
  });

  it('names deletion, preserves data, announces removal, and restores focus', () => {
    expect(assessment).toContain("'aria-label': 'Remove learning reflection from ' + (textValue(entry.date).trim() || 'unknown date')");
    expect(assessment).toContain("setData(Object.assign({}, data, { assessments: rawAssessments.filter");
    expect(assessment).toContain("llAnnounce('Learning reflection snapshot removed.')");
    expect(assessment).toContain("focusById('learning-lab-assessment-history-heading')");
  });

  it('provides responsive groups and 44-pixel targets', () => {
    expect(assessment).toContain("gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))'");
    expect(assessment).toContain("minWidth: 44, minHeight: 44");
    expect(assessment).toContain("minHeight: 44");
  });

  it('handles malformed legacy snapshot data without crashing', () => {
    expect(assessment).toContain('var rawAssessments = Array.isArray(data.assessments) ? data.assessments : [];');
    expect(assessment).toContain('var assessments = rawAssessments.filter(isRecord);');
    expect(source).toContain("stat: (Array.isArray((data.mytkAssess || {}).assessments) ? (data.mytkAssess || {}).assessments.length : 0) + ' snapshots'");
  });

  it('synchronizes focus with rendered state instead of a focus timer', () => {
    expect(assessment).toContain('if (!pendingFocusId) return;');
    expect(assessment).toContain('function focusById(id) { setPendingFocusId(id); }');
    expect(assessment).not.toContain('setTimeout');
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
