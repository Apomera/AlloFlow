import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Exam Prep accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalExamPrep(props) {');
  const end = source.indexOf('  function PersonalTaskBreaker(props) {', start);
  const examPrep = source.slice(start, end);

  it('associates every visible form label with its control', () => {
    for (const id of ['learning-lab-exam-name', 'learning-lab-exam-date', 'learning-lab-exam-units', 'learning-lab-exam-minutes']) {
      expect(examPrep).toContain(`htmlFor: '${id}'`);
      expect(examPrep).toContain(`id: '${id}'`);
    }
  });

  it('marks required fields and reports validation inline', () => {
    expect(examPrep).toContain("id: 'learning-lab-exam-name', type: 'text', value: form.name, required: true");
    expect(examPrep).toContain("id: 'learning-lab-exam-date', type: 'date', value: form.date, required: true");
    expect(examPrep).toContain("id: 'learning-lab-exam-error', role: 'alert'");
    expect(examPrep).toContain("'aria-describedby': formError ? 'learning-lab-exam-error' : undefined");
    expect(examPrep).not.toContain("alert('Need name + date.')");
  });

  it('moves focus to the first missing required field', () => {
    expect(examPrep).toContain("document.getElementById(!form.name.trim() ? 'learning-lab-exam-name' : 'learning-lab-exam-date')");
    expect(examPrep).toContain('Exam name and date are required.');
  });

  it('confirms plan deletion and provides a generous delete target', () => {
    expect(examPrep).toContain("'aria-label': 'Delete exam plan: ' + exam.name");
    expect(examPrep).toContain("title: 'Delete this exam plan?', confirmText: 'Delete plan'");
    expect(examPrep).toContain("style: { minHeight: 44, padding: '8px 10px'");
  });

  it('exposes daily completion controls as pressed-state toggles', () => {
    expect(examPrep).toContain("key: 'pl-' + i, type: 'button', 'aria-pressed': done");
    expect(examPrep).toContain('style: { minHeight: 44, padding: 8');
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('prismflow-deploy/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
