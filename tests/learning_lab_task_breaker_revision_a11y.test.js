import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
const root = process.cwd();
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');

describe('Learning Lab Task Breaker revised accessibility', () => {
  const source = read('stem_lab/stem_tool_learning_lab.js');
  const start = source.indexOf('  function PersonalTaskBreaker(props) {');
  const end = source.indexOf('  function PersonalHabitTracker(props)', start);
  const task = source.slice(start, end);

  it('uses stable list, form, steps, and saved-task headings', () => {
    for (const id of ['learning-lab-task-heading', 'learning-lab-task-form-heading', 'learning-lab-task-steps-heading', 'learning-lab-task-list-heading']) expect(task).toContain(`'${id}'`);
  });

  it('uses qualified optional framing without universal disability claims', () => {
    expect(task).toContain('An optional planning tool for turning a larger task into concrete steps.');
    expect(task).toContain('Choose step sizes that are useful for you.');
    expect(task).not.toContain("that's working memory overwhelm");
    expect(task).not.toContain('initiation becomes possible');
  });

  it('uses effect-based focus for view and dynamic-step transitions', () => {
    expect(task).toContain('document.getElementById(focusTarget)');
    expect(task).toContain("setFocusTarget('learning-lab-task-form-heading')");
    expect(task).toContain("setFocusTarget('learning-lab-task-step-' + step.id)");
    expect(task).toContain("setFocusTarget('learning-lab-task-heading')");
  });

  it('uses a named native authoring form and submit button', () => {
    expect(task).toContain("hh('form', { 'aria-labelledby': 'learning-lab-task-form-heading', onSubmit: saveTask }");
    expect(task).toContain("type: 'submit', 'data-ll-focusable': true");
  });

  it('labels and bounds the task title and optional due date', () => {
    expect(task).toContain("htmlFor: 'learning-lab-task-title'");
    expect(task).toContain("id: 'learning-lab-task-title', required: true, maxLength: 240");
    expect(task).toContain("htmlFor: 'learning-lab-task-due-date'");
    expect(task).toContain("id: 'learning-lab-task-due-date', type: 'date'");
  });

  it('provides title and step validation alerts with first-invalid focus', () => {
    expect(task).toContain("id: 'learning-lab-task-title-error', role: 'alert'");
    expect(task).toContain("id: 'learning-lab-task-steps-error', role: 'alert'");
    expect(task).toContain("setFocusTarget(nextErrors.title ? 'learning-lab-task-title' : 'learning-lab-task-step-' + steps[invalidStepIndex].id)");
    expect(task).toContain("llAnnounce('The task has invalid or missing information.')");
  });

  it('requires every step description and a bounded numeric estimate', () => {
    expect(task).toContain("required: true, maxLength: 1000");
    expect(task).toContain("type: 'number', min: 1, max: 240, step: 1, required: true");
    expect(task).toContain('Every step needs a description and an estimate from 1 to 240 minutes.');
  });

  it('renders authoring steps as a named ordered list', () => {
    expect(task).toContain("hh('ol', { 'aria-labelledby': 'learning-lab-task-steps-heading'");
    expect(task).toContain("return hh('li', { key: 'st-' + step.id");
  });

  it('reports step count and total estimate through a polite status', () => {
    expect(task).toContain("id: 'learning-lab-task-steps-summary', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true'");
    expect(task).toContain("' · Estimated total: ' + formatMinutes(totalEstimate)");
  });

  it('prevents removal of the only step and explains what happened', () => {
    expect(task).toContain('if (current.length <= 1)');
    expect(task).toContain('A task needs at least one step. Edit the remaining step instead.');
  });

  it('restores focus after adding or removing a dynamic step', () => {
    expect(task).toContain("llAnnounce('New step added.')");
    expect(task).toContain("setFocusTarget('learning-lab-task-step-' + remaining[nextIndex].id)");
    expect(task).toContain("llAnnounce('Step removed.')");
  });

  it('preserves sibling data on save, toggle, and delete', () => {
    expect(task).toContain("setData(Object.assign({}, data, { tasks: tasks }))");
    expect(task).toContain("setData(Object.assign({}, data, { tasks: remaining }))");
    expect(task).not.toContain('setData({ tasks:');
  });

  it('preserves task metadata while editing', () => {
    expect(task).toContain('Object.assign({}, existing || {}');
    expect(task).toContain('existing && existing.createdAt ? existing.createdAt : todayISO()');
  });

  it('announces save, update, cancel, toggle, and deletion outcomes', () => {
    expect(task).toContain("llAnnounce(wasEditing ? 'Task updated.' : 'Task saved.')");
    expect(task).toContain("llAnnounce('Task editing canceled.')");
    expect(task).toContain("(nextDone ? 'Completed: ' : 'Marked incomplete: ')");
    expect(task).toContain("llAnnounce('Task deleted.')");
  });

  it('renders saved tasks and their steps as semantic lists', () => {
    expect(task).toContain("hh('ul', { 'aria-labelledby': 'learning-lab-task-list-heading'");
    expect(task).toContain("return hh('li', { key: 't-' + task.id");
    expect(task).toContain("hh('ol', { 'aria-label': 'Steps for ' + taskName");
    expect(task).toContain("return hh('li', { key: 'ts-' + step.id");
  });

  it('uses machine-readable due dates and spelled-out units', () => {
    expect(task).toContain("hh('time', { dateTime: task.dueDate }, task.dueDate)");
    expect(task).toContain("minutes + (minutes === 1 ? ' minute' : ' minutes')");
    expect(task).not.toContain("s.estMin + 'm'");
  });

  it('uses explicit progress and pressed completion state without dimming text', () => {
    expect(task).toContain("role: 'progressbar'");
    expect(task).toContain("'aria-valuenow': percent");
    expect(task).toContain("'aria-pressed': step.done ? 'true' : 'false'");
    expect(task).not.toContain('opacity: step.done');
    expect(task).not.toContain('opacity: s.done');
  });

  it('uses item-specific full-size edit, delete, and completion controls', () => {
    expect(task).toContain("'aria-label': 'Edit task: ' + taskName");
    expect(task).toContain("'aria-label': 'Delete task: ' + taskName");
    expect(task.match(/minHeight: 44/g)?.length).toBeGreaterThanOrEqual(8);
  });

  it('confirms deletion and restores meaningful focus', () => {
    expect(task).toContain("title: 'Delete this task?', confirmText: 'Delete task'");
    expect(task).toContain("setFocusTarget(remaining.length ? 'learning-lab-task-list-heading' : 'learning-lab-task-new-button')");
  });

  it('keeps the deployed mirror identical', () => {
    expect(source).toBe(read('desktop/web-app/public/stem_lab/stem_tool_learning_lab.js'));
  });
});
