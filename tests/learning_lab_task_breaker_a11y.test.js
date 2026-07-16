import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Task Breaker accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalTaskBreaker(props) {');
  const end = source.indexOf('  function PersonalHabitTracker(props) {', start);
  const taskBreaker = source.slice(start, end);

  it('associates the task fields and reports missing titles inline', () => {
    expect(taskBreaker).toContain("htmlFor: 'learning-lab-task-title'");
    expect(taskBreaker).toContain("id: 'learning-lab-task-title', type: 'text', value: form.title, required: true");
    expect(taskBreaker).toContain("htmlFor: 'learning-lab-task-due-date'");
    expect(taskBreaker).toContain("id: 'learning-lab-task-error', role: 'alert'");
    expect(taskBreaker).toContain("document.getElementById('learning-lab-task-title')");
    expect(taskBreaker).not.toContain("alert('Need a title.')");
  });

  it('gives every step description and estimate an associated label', () => {
    expect(taskBreaker).toContain("htmlFor: 'learning-lab-task-step-' + s.id");
    expect(taskBreaker).toContain("id: 'learning-lab-task-step-' + s.id");
    expect(taskBreaker).toContain("htmlFor: 'learning-lab-task-estimate-' + s.id");
    expect(taskBreaker).toContain("id: 'learning-lab-task-estimate-' + s.id");
  });

  it('names icon-only controls and supplies 44-pixel targets', () => {
    expect(taskBreaker).toContain("'aria-label': 'Remove step ' + (i + 1)");
    expect(taskBreaker).toContain("'aria-label': 'Edit task: ' + t.title");
    expect(taskBreaker).toContain("'aria-label': 'Delete task: ' + t.title");
    expect(taskBreaker.match(/minWidth: 44, minHeight: 44/g)?.length).toBeGreaterThanOrEqual(4);
  });

  it('uses the app confirmation service for destructive task deletion', () => {
    expect(taskBreaker).toContain("title: 'Delete this task?', confirmText: 'Delete task'");
    expect(taskBreaker).not.toContain("confirm('Delete this task?')");
  });

  it('exposes completion progress and step toggle state', () => {
    expect(taskBreaker).toContain("role: 'progressbar'");
    expect(taskBreaker).toContain("'aria-valuenow': pct");
    expect(taskBreaker).toContain("type: 'button', 'aria-pressed': s.done");
    expect(taskBreaker).toContain("'aria-label': (s.done ? 'Mark incomplete: ' : 'Mark complete: ')");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('prismflow-deploy/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
