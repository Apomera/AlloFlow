import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Subject learning-status accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalSubjectMastery(props) {');
  const end = source.indexOf('  function PersonalSleepLog(props) {', start);
  const mastery = source.slice(start, end);

  it('frames statuses as optional, contextual self-reflections', () => {
    expect(mastery).toContain('personal reflections, not grades, test scores, diagnoses');
    expect(mastery).toContain('Status can change by task, context, or support.');
    expect(mastery).toContain("label: 'Practicing'");
    expect(mastery).toContain("label: 'Ready to use'");
    expect(mastery).not.toContain("label: 'Shaky'");
    expect(mastery).not.toContain("label: 'Mastered'");
  });

  it('does not convert ordinal status categories into a numeric average', () => {
    expect(mastery).toContain('the app does not combine these categories into an average score');
    expect(mastery).not.toContain('avg.toFixed');
    expect(mastery).not.toContain('subjectAvg');
    expect(mastery).not.toContain('Average mastery');
  });

  it('explains storage and sharing boundaries for learning data', () => {
    expect(mastery).toContain('not automatically shared with a teacher or school');
    expect(mastery).toContain('Avoid identifying details on shared devices');
    expect(mastery).toContain('school or district privacy procedures');
  });

  it('uses native required forms with bounded fields and conditional alerts', () => {
    expect(mastery).toContain("onSubmit: addSubject");
    expect(mastery).toContain("onSubmit: addTopic");
    expect(mastery).toContain("id: 'learning-lab-subject-name', type: 'text', value: subForm.name, required: true, maxLength: 120");
    expect(mastery).toContain("id: 'learning-lab-topic-name', type: 'text', value: topicForm.name, required: true, maxLength: 160");
    expect(mastery).toContain("subjectError ? hh('div', { id: 'learning-lab-subject-error', role: 'alert'");
    expect(mastery).toContain("topicError ? hh('div', { id: 'learning-lab-topic-error', role: 'alert'");
  });

  it('uses a native select for each named single-choice status', () => {
    expect(mastery).toContain("hh('label', { htmlFor: 'learning-lab-topic-status-' + topic.id");
    expect(mastery).toContain("hh('select', { id: 'learning-lab-topic-status-' + topic.id");
    expect(mastery).not.toContain("'aria-pressed': active");
  });

  it('renders counts and records as semantic lists, articles, and times', () => {
    expect(mastery).toContain("'aria-label': 'Learning-status counts for ' + subject.name");
    expect(mastery).toContain("'aria-label': subject.name + ' topics'");
    expect(mastery).toContain("hh('article', { 'aria-labelledby': 'learning-lab-topic-heading-' + topic.id");
    expect(mastery).toContain("hh('time', { dateTime: safeDateTime(topic.updatedAt) }");
    expect(mastery).not.toContain("role: 'img'");
  });

  it('uses post-render focus recovery for errors, navigation, and deletion', () => {
    expect(mastery).toContain('var pendingFocusRef = R.useRef(null);');
    expect(mastery).toContain('R.useLayoutEffect(function()');
    expect(mastery).toContain("requestFocus('learning-lab-subject-name')");
    expect(mastery).toContain("requestFocus('learning-lab-topic-name')");
    expect(mastery).toContain("requestFocus(remainingCount ? 'learning-lab-topics-heading' : 'learning-lab-topic-name')");
    expect(mastery).not.toContain("setTimeout(function() { var field = document.getElementById");
  });

  it('confirms destructive actions and preserves sibling data', () => {
    expect(mastery).toContain("title: 'Delete this subject?', confirmText: 'Delete subject'");
    expect(mastery).toContain("title: 'Delete this topic?', confirmText: 'Delete topic'");
    expect(mastery).toContain("setData(Object.assign({}, data, { subjects:");
    expect(mastery).not.toContain('setData({ subjects:');
  });

  it('updates the catalog description without scoring claims', () => {
    expect(source).toContain('Track optional topic learning-status reflections without an average score.');
    expect(source).not.toContain('Track mastery per topic per subject across 5 levels');
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
