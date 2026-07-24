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
    expect(examPrep).toContain("id: 'learning-lab-exam-name', required: true, maxLength: 240");
    expect(examPrep).toContain("id: 'learning-lab-exam-date', type: 'date', value: form.date, required: true");
    expect(examPrep).toContain("id: 'learning-lab-exam-name-error', role: 'alert'");
    expect(examPrep).toContain("id: 'learning-lab-exam-date-error', role: 'alert'");
    expect(examPrep).toContain("'aria-describedby': 'learning-lab-exam-date-help' +");
    expect(examPrep).not.toContain("alert('Need name + date.')");
  });

  it('moves focus to the first missing required field', () => {
    expect(examPrep).toContain("var invalidId = nextErrors.name ? 'learning-lab-exam-name'");
    expect(examPrep).toContain('setFocusTarget(invalidId)');
    expect(examPrep).toContain("name: name ? '' : 'Enter a name for the exam.'");
    expect(examPrep).toContain("date: !form.date ? 'Choose an exam date.'");
  });

  it('confirms plan deletion and provides a generous delete target', () => {
    expect(examPrep).toContain("'aria-label': 'Delete exam prep plan: ' + examName");
    expect(examPrep).toContain("title: 'Delete this exam prep plan?', confirmText: 'Delete plan'");
    expect(examPrep).toContain("minHeight: 44, padding: '8px 10px'");
  });

  it('exposes daily completion controls as pressed-state toggles', () => {
    expect(examPrep).toContain("type: 'button', 'aria-pressed': done ? 'true' : 'false'");
    expect(examPrep).toContain("width: '100%', minHeight: 64, padding: 8");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
