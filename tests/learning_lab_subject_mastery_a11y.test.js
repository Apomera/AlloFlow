import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Subject Mastery accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalSubjectMastery(props) {');
  const end = source.indexOf('  function PersonalSleepLog(props) {', start);
  const mastery = source.slice(start, end);

  it('labels the subject form and supports Enter submission', () => {
    expect(mastery).toContain("onSubmit: function(event) { event.preventDefault(); addSubject(); }");
    expect(mastery).toContain("htmlFor: 'learning-lab-subject-name'");
    expect(mastery).toContain("id: 'learning-lab-subject-name', type: 'text'");
    expect(mastery).toContain("hh('button', { type: 'submit'");
  });

  it('reports blank subjects inline and returns focus to the field', () => {
    expect(mastery).toContain("setSubjectError('Subject name is required.')");
    expect(mastery).toContain("document.getElementById('learning-lab-subject-name')");
    expect(mastery).toContain("id: 'learning-lab-subject-error', role: 'alert'");
    expect(mastery).toContain("'aria-invalid': subjectError ? 'true' : undefined");
  });

  it('labels the topic form and reports blank topics inline', () => {
    expect(mastery).toContain("onSubmit: function(event) { event.preventDefault(); addTopic(); }");
    expect(mastery).toContain("htmlFor: 'learning-lab-topic-name'");
    expect(mastery).toContain("id: 'learning-lab-topic-name', type: 'text'");
    expect(mastery).toContain("setTopicError('Topic name is required.')");
    expect(mastery).toContain("id: 'learning-lab-topic-error', role: 'alert'");
  });

  it('provides a text alternative for the mastery distribution', () => {
    expect(mastery).toContain("var distributionText = counts.map");
    expect(mastery).toContain("role: 'img', 'aria-label': 'Mastery distribution. ' + distributionText");
    expect(mastery).toContain("id: 'learning-lab-mastery-distribution-heading'");
  });

  it('uses semantic lists for subjects and topics', () => {
    expect(mastery).toContain("hh('ul', { 'aria-label': sub.name + ' topics'");
    expect(mastery).toContain("hh('ul', { 'aria-label': 'Tracked subjects'");
    expect(mastery).toContain("return hh('li', { key: 't-' + topic.id");
    expect(mastery).toContain("return hh('li', { key: 's-' + subject.id");
  });

  it('exposes mastery choices as a named group with selected state', () => {
    expect(mastery).toContain("role: 'group', 'aria-label': 'Set mastery for ' + topic.name");
    expect(mastery).toContain("'aria-pressed': active ? 'true' : 'false'");
    expect(mastery).toContain("minHeight: 44, padding: '6px 4px'");
    expect(mastery).toContain("Current mastery: ' + currentLevel.label");
  });

  it('provides named 44-pixel topic deletion', () => {
    expect(mastery).toContain("'aria-label': 'Delete topic: ' + topic.name");
    expect(mastery).toContain("minWidth: 44, minHeight: 44");
    expect(mastery).toContain("title: 'Delete this topic?', confirmText: 'Delete topic'");
  });

  it('keeps subject opening and deletion as separate controls', () => {
    expect(mastery).toContain("'aria-label': 'Open ' + subject.name");
    expect(mastery).toContain("'aria-label': 'Delete subject: ' + subject.name");
    expect(mastery).toContain("position: 'absolute', top: 8, right: 8, minWidth: 44, minHeight: 44");
    expect(mastery).not.toContain("hh('span', { onClick: function(e) { e.stopPropagation(); removeSubject");
  });

  it('uses app confirmation rather than a native subject dialog', () => {
    expect(mastery).toContain("title: 'Delete this subject?', confirmText: 'Delete subject'");
    expect(mastery).not.toContain("confirm('Delete this subject and all its topics?')");
  });

  it('announces additions, mastery changes, and deletion', () => {
    expect(mastery).toContain("llAnnounce('Subject added: ' + sub.name + '.')");
    expect(mastery).toContain("llAnnounce('Topic added: ' + topic.name + '.')");
    expect(mastery).toContain("' mastery set to '");
    expect(mastery).toContain("llAnnounce('Subject deleted.')");
    expect(mastery).toContain("llAnnounce('Topic deleted.')");
  });

  it('preserves unrelated section data when updating subjects', () => {
    expect(mastery).toContain("setData(Object.assign({}, data, { subjects:");
    expect(mastery).not.toContain("setData({ subjects:");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('prismflow-deploy/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
